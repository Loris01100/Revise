import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { compose, schedule, validate_cards } from "./core";
import type { Env } from "./index";

// Doit rester égal à NEW_PER_DAY dans core/src/session.rs
const NEW_PER_DAY = 10;
const TYPES = ["qa", "cloze", "mcq", "explain"];
const STATUSES = ["draft", "active", "suspended"];
const MODES = ["quick5", "timed", "subject"];

const api = new Hono<{ Bindings: Env }>();

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

const initialState = (db: D1Database, cardId: string, t: string) =>
  db
    .prepare("INSERT OR IGNORE INTO card_state (card_id, due, stability, difficulty, state) VALUES (?, ?, 0, 0, 'new')")
    .bind(cardId, t);

api.get("/subjects", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT s.id, s.name, s.color, s.created_at, COUNT(c.id) AS cards,
            COUNT(CASE WHEN cs.due <= ?1 THEN 1 END) AS due, MIN(cs.due) AS next_due
     FROM subjects s
     LEFT JOIN cards c ON c.subject_id = s.id AND c.status = 'active'
     LEFT JOIN card_state cs ON cs.card_id = c.id
     GROUP BY s.id ORDER BY s.name`,
  )
    .bind(now())
    .all();
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

// Page d'une matière : toutes ses cartes, la recherche se fait côté client
api.get("/subjects/:id/cards", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.type, c.question, c.answer, c.choices, c.explanation, c.source_page, c.status, c.created_at, cs.due
     FROM cards c LEFT JOIN card_state cs ON cs.card_id = c.id
     WHERE c.subject_id = ? ORDER BY c.created_at, c.rowid`,
  )
    .bind(c.req.param("id"))
    .all();
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
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO cards (${cols}) VALUES (${cols.map(() => "?")})`).bind(...Object.values(row)),
    initialState(c.env.DB, id, t),
  ]);
  return c.json({ id }, 201);
});

// Modifier, accepter un brouillon (status = active) ou suspendre
api.patch("/cards/:id", async (c) => {
  const f = cardFields(await body(c));
  if (typeof f === "string") return bad(c, f);
  const cols = Object.keys(f);
  if (!cols.length) return bad(c, "body");
  const id = c.req.param("id");
  const update = c.env.DB.prepare(`UPDATE cards SET ${cols.map((k) => `${k} = ?`)} WHERE id = ?`).bind(...Object.values(f), id);
  const [res] = await c.env.DB.batch(f.status === "active" ? [update, initialState(c.env.DB, id, now())] : [update]);
  return res.meta.changes ? c.body(null, 204) : notFound(c);
});

api.delete("/cards/:id", async (c) => {
  const res = await c.env.DB.prepare("DELETE FROM cards WHERE id = ?").bind(c.req.param("id")).run();
  return res.meta.changes ? c.body(null, 204) : notFound(c);
});

// Import du JSON collé depuis Claude : les cartes valides arrivent en brouillon, à relire avant révision
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
              j.value ->> 'explanation', j.value ->> 'source_page', 'draft', ?2
       FROM json_each(?3) j ORDER BY j.key`,
    )
      .bind(b.subject_id, now(), JSON.stringify(cards))
      .run();
  return c.json({ cards, rejected: report.rejected }, 201);
});

// Ouvre une session et renvoie sa file ; rien à réviser = pas de session créée
api.post("/sessions", async (c) => {
  const b = await body(c);
  if (!MODES.includes(b.mode)) return bad(c, "mode");
  if (b.mode === "subject" && !str(b.subject_id, 100)) return bad(c, "subject_id");
  const planned = b.mode === "timed" ? b.planned_min : null;
  if (planned !== null && !(Number.isInteger(planned) && planned >= 10 && planned <= 25)) return bad(c, "planned_min");

  const t = now();
  // ponytail: jour UTC, le quota repart à 1 h ou 2 h à Paris ; passer au minuit local si ça gêne
  const day = t.slice(0, 10);
  const [cands, seen] = await c.env.DB.batch<Record<string, any>>([
    c.env.DB.prepare(
      `SELECT c.id, c.subject_id, c.type, c.question, c.answer, c.choices, c.explanation,
              cs.due, cs.stability, cs.difficulty, cs.reps, cs.lapses, cs.state, cs.last_review
       FROM cards c JOIN card_state cs ON cs.card_id = c.id
       WHERE c.status = 'active' AND (?1 IS NULL OR c.subject_id = ?1)`,
    ).bind(b.mode === "subject" ? b.subject_id : null),
    // Cartes nouvelles introduites aujourd'hui = première note aujourd'hui
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM (SELECT card_id FROM reviews GROUP BY card_id HAVING MIN(reviewed_at) >= ?)").bind(day),
  ]);
  const quota = Math.max(0, NEW_PER_DAY - seen.results[0].n);
  const ids: string[] = JSON.parse(compose(JSON.stringify(cands.results), b.mode === "quick5", quota, t));
  if (!ids.length) return c.json({ id: null, cards: [] });

  const byId = new Map(cands.results.map((r) => [r.id, r]));
  const cards = ids.map((i) => {
    const { id, subject_id, type, question, answer, choices, explanation } = byId.get(i)!;
    return withChoices({ id, subject_id, type, question, answer, choices, explanation });
  });
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO sessions (id, mode, planned_min, started_at) VALUES (?, ?, ?, ?)")
    .bind(id, b.mode, planned, t)
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

  const state = await c.env.DB.prepare(
    "SELECT cs.*, EXISTS (SELECT 1 FROM sessions WHERE id = ?) AS ok FROM card_state cs WHERE card_id = ?",
  )
    .bind(sid, b.card_id)
    .first<Record<string, any>>();
  if (!state?.ok) return notFound(c);
  const next = JSON.parse(schedule(JSON.stringify(state), b.grade, at));

  const fresh = "NOT EXISTS (SELECT 1 FROM reviews WHERE id = ?)";
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE card_state SET due = ?, stability = ?, difficulty = ?, reps = ?, lapses = ?, state = ?, last_review = ?
       WHERE card_id = ? AND ${fresh}`,
    ).bind(iso(next.due), next.stability, next.difficulty, next.reps, next.lapses, next.state, iso(next.last_review), b.card_id, b.id),
    c.env.DB.prepare(`UPDATE sessions SET cards_done = cards_done + 1 WHERE id = ? AND ${fresh}`).bind(sid, b.id),
    c.env.DB.prepare(
      "INSERT INTO reviews (id, card_id, session_id, grade, duration_ms, reviewed_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
    ).bind(b.id, b.card_id, sid, b.grade, b.duration_ms ?? null, at),
  ]);
  return c.body(null, 204);
});

// Clôture (idempotente) et bilan : cartes revues, horaires, pensées parquées non traitées
api.post("/sessions/:id/end", async (c) => {
  const id = c.req.param("id");
  const [, s, parked] = await c.env.DB.batch<Record<string, any>>([
    c.env.DB.prepare("UPDATE sessions SET ended_at = COALESCE(ended_at, ?) WHERE id = ?").bind(now(), id),
    c.env.DB.prepare("SELECT started_at, ended_at, cards_done FROM sessions WHERE id = ?").bind(id),
    c.env.DB.prepare("SELECT id, text, session_id, created_at FROM parked_thoughts WHERE done = 0 ORDER BY created_at"),
  ]);
  if (!s.results.length) return notFound(c);
  return c.json({ ...s.results[0], parked: parked.results });
});

api.post("/parked", async (c) => {
  const b = await body(c);
  if (!str(b.text, 2000)) return bad(c, "text");
  if (b.session_id != null && !str(b.session_id, 100)) return bad(c, "session_id");
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO parked_thoughts (id, session_id, text, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, b.session_id ?? null, b.text.trim(), now())
    .run();
  return c.json({ id }, 201);
});

// « Fait » au bilan ; « Garder » ne touche à rien
api.patch("/parked/:id", async (c) => {
  const b = await body(c);
  if (typeof b.done !== "boolean") return bad(c, "done");
  const res = await c.env.DB.prepare("UPDATE parked_thoughts SET done = ? WHERE id = ?").bind(+b.done, c.req.param("id")).run();
  return res.meta.changes ? c.body(null, 204) : notFound(c);
});

// Dessins : uniquement des coordonnées entières, le SVG est reconstruit côté client
const SHAPES = ["pen", "line", "arrow", "rect", "ellipse"];
const shapesOk = (v: any) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 500 &&
  v.every(
    (s) =>
      SHAPES.includes(s?.t) &&
      Array.isArray(s.p) &&
      s.p.length >= 4 &&
      s.p.length % 2 === 0 &&
      s.p.length <= (s.t === "pen" ? 4000 : 4) &&
      s.p.every((x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 600),
  );

api.post("/drawings", bodyLimit({ maxSize: 512 * 1024, onError: (c) => c.json({ error: "too_large" }, 413) }), async (c) => {
  const b = await body(c);
  if (!shapesOk(b.shapes)) return bad(c, "shapes");
  const id = crypto.randomUUID();
  const shapes = JSON.stringify(b.shapes.map(({ t, p }: { t: string; p: number[] }) => ({ t, p })));
  await c.env.DB.prepare("INSERT INTO drawings (id, shapes, created_at) VALUES (?, ?, ?)").bind(id, shapes, now()).run();
  return c.json({ id }, 201);
});

api.get("/drawings/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT shapes FROM drawings WHERE id = ?").bind(c.req.param("id")).first<{ shapes: string }>();
  return row ? c.json({ shapes: JSON.parse(row.shapes) }) : notFound(c);
});

export default api;
