import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { compose, schedule, validate_cards } from "./core";
import type { App } from "./index";

// Doit rester égal à NEW_PER_DAY dans core/src/session.rs
const NEW_PER_DAY = 10;
const TYPES = ["qa", "cloze", "mcq", "explain"];
const STATUSES = ["draft", "active", "suspended"];
const MODES = ["quick5", "timed", "subject"];

const api = new Hono<App>();

const now = () => new Date().toISOString();
// chrono omet les millisecondes nulles : on remet tout au format toISOString pour comparer les dates en texte
const iso = (d: string | null) => (d === null ? null : new Date(d).toISOString());
const str = (v: unknown, max = 10_000): v is string => typeof v === "string" && v.trim() !== "" && v.length <= max;
const body = (c: Context): Promise<Record<string, any>> => c.req.json().catch(() => ({}));
const bad = (c: Context, field: string) => c.json({ error: "invalid", field }, 400);
const notFound = (c: Context) => c.json({ error: "not_found" }, 404);
const withChoices = (r: Record<string, unknown>) => ({ ...r, choices: r.choices ? JSON.parse(r.choices as string) : null });

// Champs d'une carte modifiables depuis l'API, avec leur validation
const CARD_FIELDS: Record<string, (v: any) => boolean> = {
  subject_id: (v) => str(v, 100),
  type: (v) => TYPES.includes(v),
  question: (v) => str(v),
  answer: (v) => str(v),
  choices: (v) => v === null || (Array.isArray(v) && v.length >= 2 && v.every((x) => str(x, 1000))),
  explanation: (v) => v === null || (typeof v === "string" && v.length <= 10_000),
  status: (v) => STATUSES.includes(v),
};

/** Champs valides présents dans `b`, ou le nom du premier champ invalide. */
function cardFields(b: Record<string, any>): Record<string, unknown> | string {
  const out: Record<string, unknown> = {};
  for (const [k, ok] of Object.entries(CARD_FIELDS)) {
    if (!(k in b)) continue;
    if (!ok(b[k])) return k;
    out[k] = k === "choices" && b[k] ? JSON.stringify(b[k]) : b[k];
  }
  return out;
}

// Cartes partagées, état FSRS propre à chaque personne : il naît à la première lecture, pour toute carte active
// ponytail: parcourt toutes les cartes actives à chaque lecture ; créer les états à l'activation si la base grossit
const ensureStates = (db: D1Database, user: string, t: string) =>
  db
    .prepare(
      `INSERT OR IGNORE INTO card_state (user_id, card_id, due, stability, difficulty, state)
       SELECT ?, id, ?, 0, 0, 'new' FROM cards WHERE status = 'active'`,
    )
    .bind(user, t);

// Droits de la personne connectée : l'interface cache ce qu'elle ne peut pas faire
api.get("/me", (c) => c.json({ admin: c.var.admin }));

api.get("/subjects", async (c) => {
  const t = now();
  const [, { results }] = await c.env.DB.batch([
    ensureStates(c.env.DB, c.var.user, t),
    c.env.DB.prepare(
      `SELECT s.id, s.name, s.color, s.created_at, COUNT(c.id) AS cards,
              COUNT(CASE WHEN cs.due <= ?1 THEN 1 END) AS due, MIN(cs.due) AS next_due
       FROM subjects s
       LEFT JOIN cards c ON c.subject_id = s.id AND c.status = 'active'
       LEFT JOIN card_state cs ON cs.card_id = c.id AND cs.user_id = ?2
       GROUP BY s.id ORDER BY s.name`,
    ).bind(t, c.var.user),
  ]);
  return c.json(results);
});

api.post("/subjects", async (c) => {
  const b = await body(c);
  if (!str(b.name, 200)) return bad(c, "name");
  if (b.color != null && !str(b.color, 32)) return bad(c, "color");
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO subjects (id, name, color, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, b.name.trim(), b.color ?? null, now())
    .run();
  return c.json({ id }, 201);
});

api.patch("/subjects/:id", async (c) => {
  const b = await body(c);
  if (!str(b.name, 200)) return bad(c, "name");
  if (b.color != null && !str(b.color, 32)) return bad(c, "color");
  const res = await c.env.DB.prepare("UPDATE subjects SET name = ?, color = ? WHERE id = ?")
    .bind(b.name.trim(), b.color ?? null, c.req.param("id"))
    .run();
  return res.meta.changes ? c.body(null, 204) : notFound(c);
});

// Admin seulement : les cartes partent avec (ON DELETE CASCADE), et l'historique de chacun avec elles
api.delete("/subjects/:id", async (c) => {
  if (!c.var.admin) return c.json({ error: "forbidden" }, 403);
  const res = await c.env.DB.prepare("DELETE FROM subjects WHERE id = ?").bind(c.req.param("id")).run();
  return res.meta.changes ? c.body(null, 204) : notFound(c);
});

// Page d'une matière : toutes ses cartes, la recherche se fait côté client
api.get("/subjects/:id/cards", async (c) => {
  const [, { results }] = await c.env.DB.batch<Record<string, unknown>>([
    ensureStates(c.env.DB, c.var.user, now()),
    c.env.DB.prepare(
      `SELECT c.id, c.type, c.question, c.answer, c.choices, c.explanation, c.source_page, c.status, c.created_at, cs.due
       FROM cards c LEFT JOIN card_state cs ON cs.card_id = c.id AND cs.user_id = ?
       WHERE c.subject_id = ? ORDER BY c.created_at, c.rowid`,
    ).bind(c.var.user, c.req.param("id")),
  ]);
  return c.json(results.map(withChoices));
});

// Création manuelle : la carte est active tout de suite
api.post("/cards", async (c) => {
  const f = cardFields(await body(c));
  if (typeof f === "string") return bad(c, f);
  for (const k of ["subject_id", "type", "question", "answer"]) if (!(k in f)) return bad(c, k);
  if (f.type === "mcq" && !f.choices) return bad(c, "choices");
  const id = crypto.randomUUID();
  const t = now();
  const row = { ...f, id, status: "active", created_at: t };
  const cols = Object.keys(row);
  await c.env.DB.prepare(`INSERT INTO cards (${cols}) VALUES (${cols.map(() => "?")})`).bind(...Object.values(row)).run();
  return c.json({ id }, 201);
});

// Modifier, accepter un brouillon (status = active) ou suspendre
api.patch("/cards/:id", async (c) => {
  const f = cardFields(await body(c));
  if (typeof f === "string") return bad(c, f);
  // Repasser une carte en brouillon la rendrait supprimable par tous
  if (f.status === "draft" && !c.var.admin) return bad(c, "status");
  const cols = Object.keys(f);
  if (!cols.length) return bad(c, "body");
  const id = c.req.param("id");
  const res = await c.env.DB.prepare(`UPDATE cards SET ${cols.map((k) => `${k} = ?`)} WHERE id = ?`).bind(...Object.values(f), id).run();
  return res.meta.changes ? c.body(null, 204) : notFound(c);
});

// Admin : toute carte. Les autres : seulement les brouillons, écarter un import fait partie de la création
api.delete("/cards/:id", async (c) => {
  const res = await c.env.DB.prepare("DELETE FROM cards WHERE id = ? AND (? OR status = 'draft')")
    .bind(c.req.param("id"), +c.var.admin)
    .run();
  return res.meta.changes ? c.body(null, 204) : notFound(c);
});

// Import du JSON collé depuis Claude : les cartes valides arrivent en brouillon, à relire avant révision.
// `active: true` : fichier d'export recollé tel quel, déjà relu, les cartes sont actives tout de suite (comme POST /cards)
api.post("/imports", bodyLimit({ maxSize: 1024 * 1024, onError: (c) => c.json({ error: "too_large" }, 413) }), async (c) => {
  const b = await body(c);
  if (!str(b.subject_id, 100)) return bad(c, "subject_id");
  if (typeof b.text !== "string") return bad(c, "text");
  const subject = await c.env.DB.prepare("SELECT 1 FROM subjects WHERE id = ?").bind(b.subject_id).first();
  if (!subject) return notFound(c);

  const { results } = await c.env.DB.prepare("SELECT question FROM cards WHERE subject_id = ?").bind(b.subject_id).all<{ question: string }>();
  let report: { cards: Record<string, unknown>[]; rejected: { index: number; question: string | null; reason: string }[] };
  try {
    report = JSON.parse(validate_cards(b.text, JSON.stringify(results.map((r) => r.question))));
  } catch (e) {
    return c.json({ error: "invalid", field: "text", reason: (e as Error).message }, 400);
  }

  const cards = report.cards.map((card) => ({ id: crypto.randomUUID(), ...card }));
  // Une seule requête quel que soit le nombre de cartes ; l'ordre du lot se retrouve dans rowid
  if (cards.length)
    await c.env.DB.prepare(
      `INSERT INTO cards (id, subject_id, type, question, answer, choices, explanation, source_page, status, created_at)
       SELECT j.value ->> 'id', ?1, j.value ->> 'type', j.value ->> 'question', j.value ->> 'answer', json_extract(j.value, '$.choices'),
              j.value ->> 'explanation', j.value ->> 'source_page', ?4, ?2
       FROM json_each(?3) j ORDER BY j.key`,
    )
      .bind(b.subject_id, now(), JSON.stringify(cards), b.active === true ? "active" : "draft")
      .run();
  return c.json({ cards, rejected: report.rejected }, 201);
});

// Session sans note depuis IDLE_MS : close à l'heure de sa dernière note (ou de son ouverture), sans message
// ponytail: close à l'ouverture de la session suivante, pas de cron ; en ajouter un si un écran lit ended_at entre-temps
const IDLE_MS = 30 * 60_000;
const closeIdle = (db: D1Database, user: string, t: string) => {
  const last = "COALESCE((SELECT MAX(reviewed_at) FROM reviews WHERE session_id = sessions.id), started_at)";
  return db
    .prepare(`UPDATE sessions SET ended_at = ${last} WHERE user_id = ? AND ended_at IS NULL AND ${last} < ?`)
    .bind(user, new Date(Date.parse(t) - IDLE_MS).toISOString());
};

// File d'une session : cartes dues (ou toutes, pour s'entraîner) composées par le cœur Rust
async function queue(c: Context<App>, mode: string, subject: string | null, t: string) {
  // ponytail: jour UTC, le quota repart à 1 h ou 2 h à Paris ; passer au minuit local si ça gêne
  const day = t.slice(0, 10);
  const user = c.var.user;
  const [, , cands, seen] = await c.env.DB.batch<Record<string, any>>([
    closeIdle(c.env.DB, user, t),
    ensureStates(c.env.DB, user, t),
    c.env.DB.prepare(
      `SELECT c.id, c.subject_id, c.type, c.question, c.answer, c.choices, c.explanation,
              cs.due, cs.stability, cs.difficulty, cs.reps, cs.lapses, cs.state, cs.last_review
       FROM cards c JOIN card_state cs ON cs.card_id = c.id AND cs.user_id = ?2
       WHERE c.status = 'active' AND (?1 IS NULL OR c.subject_id = ?1)`,
    ).bind(subject, user),
    // Cartes nouvelles introduites aujourd'hui = première note aujourd'hui
    c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM (SELECT card_id FROM reviews WHERE user_id = ? GROUP BY card_id HAVING MIN(reviewed_at) >= ?)",
    ).bind(user, day),
  ]);
  const quota = Math.max(0, NEW_PER_DAY - seen.results[0].n);
  const ids: string[] = JSON.parse(compose(JSON.stringify(cands.results), mode === "quick5", quota, t));
  const byId = new Map(cands.results.map((r) => [r.id, r]));
  return ids.map((i) => {
    const { id, subject_id, type, question, answer, choices, explanation, due } = byId.get(i)!;
    return { ...withChoices({ id, subject_id, type, question, answer, choices, explanation }), due: iso(due)! };
  });
}

// File gardée sur l'appareil pour réviser sans réseau (session minutée, tronquée) ; aucune session ouverte
const OFFLINE_CARDS = 60;
api.get("/queue", async (c) => {
  const t = now();
  const cards = (await queue(c, "timed", null, t)).slice(0, OFFLINE_CARDS);
  return c.json({ at: t, cards });
});

// Ouvre une session et renvoie sa file ; rien à réviser = pas de session créée.
// Avec `id` et `started_at` : session déjà faite hors ligne sur la file gardée, seulement enregistrée (idempotent)
api.post("/sessions", async (c) => {
  const b = await body(c);
  if (!MODES.includes(b.mode)) return bad(c, "mode");
  if (b.mode === "subject" && !str(b.subject_id, 100)) return bad(c, "subject_id");
  const planned = b.mode === "timed" ? b.planned_min : null;
  if (planned !== null && !(Number.isInteger(planned) && planned >= 10 && planned <= 25)) return bad(c, "planned_min");
  const user = c.var.user;

  if (b.id != null) {
    if (!str(b.id, 100)) return bad(c, "id");
    if (Number.isNaN(Date.parse(b.started_at))) return bad(c, "started_at");
    const at = new Date(Math.min(Date.parse(b.started_at), Date.now())).toISOString();
    await c.env.DB.prepare("INSERT INTO sessions (id, user_id, mode, planned_min, started_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING")
      .bind(b.id, user, b.mode, planned, at)
      .run();
    return c.json({ id: b.id, cards: [] }, 201);
  }

  const t = now();
  const cards = (await queue(c, b.mode, b.mode === "subject" ? b.subject_id : null, t)).map(({ due, ...card }) => card);
  if (!cards.length) return c.json({ id: null, cards: [] });
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO sessions (id, user_id, mode, planned_min, started_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, user, b.mode, planned, t)
    .run();
  return c.json({ id, cards });
});

// Idempotent sur `id` (choisi par le client) : la file hors ligne peut renvoyer une note déjà reçue
api.post("/sessions/:id/reviews", async (c) => {
  const b = await body(c);
  const sid = c.req.param("id");
  if (!str(b.id, 100)) return bad(c, "id");
  if (!str(b.card_id, 100)) return bad(c, "card_id");
  if (!(Number.isInteger(b.grade) && b.grade >= 1 && b.grade <= 4)) return bad(c, "grade");
  if (b.duration_ms != null && !(Number.isInteger(b.duration_ms) && b.duration_ms >= 0)) return bad(c, "duration_ms");
  if (b.reviewed_at != null && Number.isNaN(Date.parse(b.reviewed_at))) return bad(c, "reviewed_at");
  // Une note envoyée en retard est planifiée à l'heure où elle a été donnée, jamais dans le futur
  const at = new Date(Math.min(Date.parse(b.reviewed_at ?? now()), Date.now())).toISOString();

  const user = c.var.user;
  const state = await c.env.DB.prepare(
    "SELECT cs.*, EXISTS (SELECT 1 FROM sessions WHERE id = ?1 AND user_id = ?2) AS ok FROM card_state cs WHERE user_id = ?2 AND card_id = ?3",
  )
    .bind(sid, user, b.card_id)
    .first<Record<string, any>>();
  if (!state?.ok) return notFound(c);
  const next = JSON.parse(schedule(JSON.stringify(state), b.grade, at));

  const fresh = "NOT EXISTS (SELECT 1 FROM reviews WHERE id = ?)";
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE card_state SET due = ?, stability = ?, difficulty = ?, reps = ?, lapses = ?, state = ?, last_review = ?
       WHERE user_id = ? AND card_id = ? AND ${fresh}`,
    ).bind(iso(next.due), next.stability, next.difficulty, next.reps, next.lapses, next.state, iso(next.last_review), user, b.card_id, b.id),
    c.env.DB.prepare(`UPDATE sessions SET cards_done = cards_done + 1 WHERE id = ? AND ${fresh}`).bind(sid, b.id),
    c.env.DB.prepare(
      `INSERT INTO reviews (id, user_id, card_id, session_id, grade, duration_ms, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
    ).bind(b.id, user, b.card_id, sid, b.grade, b.duration_ms ?? null, at),
  ]);
  return c.body(null, 204);
});

// Clôture (idempotente) et bilan : cartes revues, horaires, pensées parquées non traitées.
// `ended_at` : heure de fin donnée par l'appareil quand la clôture part en retard (file hors ligne)
api.post("/sessions/:id/end", async (c) => {
  const b = await body(c);
  if (b.ended_at != null && Number.isNaN(Date.parse(b.ended_at))) return bad(c, "ended_at");
  const end = new Date(Math.min(Date.parse(b.ended_at ?? now()), Date.now())).toISOString();
  const id = c.req.param("id");
  const user = c.var.user;
  const [, s, parked] = await c.env.DB.batch<Record<string, any>>([
    c.env.DB.prepare("UPDATE sessions SET ended_at = COALESCE(ended_at, ?) WHERE id = ? AND user_id = ?").bind(end, id, user),
    c.env.DB.prepare("SELECT started_at, ended_at, cards_done FROM sessions WHERE id = ? AND user_id = ?").bind(id, user),
    c.env.DB.prepare("SELECT id, text, session_id, created_at FROM parked_thoughts WHERE done = 0 AND user_id = ? ORDER BY created_at").bind(user),
  ]);
  if (!s.results.length) return notFound(c);
  return c.json({ ...s.results[0], parked: parked.results });
});

// Pensées non traitées, hors bilan (page Statistiques)
api.get("/parked", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, text, session_id, created_at FROM parked_thoughts WHERE done = 0 AND user_id = ? ORDER BY created_at")
    .bind(c.var.user)
    .all();
  return c.json(results);
});

api.post("/parked", async (c) => {
  const b = await body(c);
  if (!str(b.text, 2000)) return bad(c, "text");
  if (b.session_id != null && !str(b.session_id, 100)) return bad(c, "session_id");
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO parked_thoughts (id, user_id, session_id, text, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, c.var.user, b.session_id ?? null, b.text.trim(), now())
    .run();
  return c.json({ id }, 201);
});

// « Fait » au bilan ; « Garder » ne touche à rien
api.patch("/parked/:id", async (c) => {
  const b = await body(c);
  if (typeof b.done !== "boolean") return bad(c, "done");
  const res = await c.env.DB.prepare("UPDATE parked_thoughts SET done = ? WHERE id = ? AND user_id = ?")
    .bind(+b.done, c.req.param("id"), c.var.user)
    .run();
  return res.meta.changes ? c.body(null, 204) : notFound(c);
});

// Statistiques de la personne connectée (docs/design/metrics-stats.md). `tz` : décalage local en minutes (Paris = 60 ou 120)
const MASTERED_DAYS = 21;
const NOTE_CAP_MS = 5 * 60_000;
api.get("/stats", async (c) => {
  const tz = Number(c.req.query("tz") ?? 0);
  if (!(Number.isInteger(tz) && Math.abs(tz) <= 14 * 60)) return bad(c, "tz");
  const mod = `${tz >= 0 ? "+" : ""}${tz} minutes`;
  const t = now();
  const ago = (d: number) => new Date(Date.parse(t) - d * 86_400_000).toISOString();
  const user = c.var.user;
  const db = c.env.DB;
  const active = "FROM card_state cs JOIN cards c ON c.id = cs.card_id AND c.status = 'active' WHERE cs.user_id = ?1";
  const [, cards, upcoming, weeks, days, kept] = await db.batch<Record<string, any>>([
    ensureStates(db, user, t),
    db.prepare(`SELECT COUNT(*) AS total, COUNT(CASE WHEN cs.state = 'review' AND cs.stability >= ?2 THEN 1 END) AS mastered ${active}`).bind(user, MASTERED_DAYS),
    // De demain à J+7 : ce qui est déjà dû n'apparaît pas, sinon l'arriéré se lirait comme un retard
    db.prepare(
      `SELECT date(cs.due, ?2) AS day, COUNT(*) AS n ${active}
       AND date(cs.due, ?2) > date(?3, ?2) AND date(cs.due, ?2) <= date(?3, ?2, '+7 days') GROUP BY day ORDER BY day`,
    ).bind(user, mod, t),
    // Semaine = son lundi ; chaque note plafonnée pour qu'une carte oubliée à l'écran ne compte pas des heures
    db.prepare(
      `SELECT date(reviewed_at, ?2, 'weekday 0', '-6 days') AS week, SUM(MIN(COALESCE(duration_ms, 0), ?4)) AS ms, COUNT(*) AS n
       FROM reviews WHERE user_id = ?1 AND reviewed_at >= ?5
       GROUP BY week HAVING week >= date(?3, ?2, 'weekday 0', '-55 days') ORDER BY week`,
    ).bind(user, mod, t, NOTE_CAP_MS, ago(63)),
    db.prepare(`SELECT COUNT(DISTINCT date(reviewed_at, ?2)) AS n FROM reviews WHERE user_id = ?1 AND date(reviewed_at, ?2) > date(?3, ?2, '-7 days')`).bind(
      user,
      mod,
      t,
    ),
    // Retrouvées : notes sur une carte déjà vue au moins un jour plus tôt
    db.prepare(
      `SELECT COUNT(*) AS n, COUNT(CASE WHEN grade >= 2 THEN 1 END) AS ok FROM reviews r
       WHERE r.user_id = ?1 AND r.reviewed_at >= ?2 AND EXISTS (
         SELECT 1 FROM reviews p WHERE p.user_id = r.user_id AND p.card_id = r.card_id
         AND p.reviewed_at < strftime('%Y-%m-%dT%H:%M:%fZ', r.reviewed_at, '-1 day'))`,
    ).bind(user, ago(30)),
  ]);
  return c.json({
    ...cards.results[0],
    upcoming: upcoming.results,
    weeks: weeks.results,
    days: days.results[0].n,
    kept: kept.results[0],
  });
});

// Dessins : uniquement des coordonnées entières (et le texte des étiquettes), le SVG est reconstruit côté client
const SHAPES = ["pen", "line", "arrow", "rect", "ellipse", "text"];
const coords = (p: any, min: number, max: number) =>
  Array.isArray(p) &&
  p.length >= min &&
  p.length <= max &&
  p.length % 2 === 0 &&
  p.every((x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 600);
const shapesOk = (v: any) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 500 &&
  v.every((s) =>
    s?.t === "text" ? coords(s.p, 2, 2) && str(s.s, 100) : SHAPES.includes(s?.t) && coords(s.p, 4, s.t === "pen" ? 4000 : 4),
  );

// Dessin que plus aucune carte ne cite (remplacé, carte supprimée) : effacé un jour après sa création,
// le temps que la carte qui vient de l'insérer soit enregistrée
// ponytail: parcourt toutes les cartes à chaque nouveau dessin ; une table de liens si la base grossit
const ORPHAN_MS = 24 * 3600_000;

api.post("/drawings", bodyLimit({ maxSize: 512 * 1024, onError: (c) => c.json({ error: "too_large" }, 413) }), async (c) => {
  const b = await body(c);
  if (!shapesOk(b.shapes)) return bad(c, "shapes");
  const id = crypto.randomUUID();
  const t = now();
  const shapes = JSON.stringify(b.shapes.map(({ t, p, s }: Record<string, any>) => (t === "text" ? { t, p, s: s.trim() } : { t, p })));
  await c.env.DB.batch([
    c.env.DB.prepare(
      `DELETE FROM drawings WHERE created_at < ? AND NOT EXISTS (
         SELECT 1 FROM cards WHERE instr(question || answer || COALESCE(explanation, ''), drawings.id) > 0)`,
    ).bind(new Date(Date.parse(t) - ORPHAN_MS).toISOString()),
    c.env.DB.prepare("INSERT INTO drawings (id, shapes, created_at) VALUES (?, ?, ?)").bind(id, shapes, t),
  ]);
  return c.json({ id }, 201);
});

api.get("/drawings/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT shapes FROM drawings WHERE id = ?").bind(c.req.param("id")).first<{ shapes: string }>();
  return row ? c.json({ shapes: JSON.parse(row.shapes) }) : notFound(c);
});

export default api;
