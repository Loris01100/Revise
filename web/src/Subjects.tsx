import { For, Index, Show, createEffect, createResource, createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { Expired, Failed, api, type Card, type CardType, type Color, type Subject } from "./api";
import { DrawDialog } from "./Draw";
import { COLORS, Confirm, DRAWING, Dialog, Icon, Link, Preview, TYPES, announce, arrows, go, hl, loadDrawing, one, plain, start, type Shape } from "./ui";

const STATUS: Record<string, string> = { active: "Active", suspended: "Suspendue", draft: "Brouillon" };
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export default function Subjects(p: { id?: string }) {
  const [subjects, { refetch: reloadSubjects }] = createResource(() => api<Subject[]>("GET", "/subjects"));
  const list = () => subjects.latest ?? [];
  // Sans matière choisie, l'ordinateur montre la première ; le téléphone, la liste seule
  const sel = () => list().find((s) => s.id === p.id) ?? (p.id ? undefined : list()[0]);
  const [cards, { refetch: reloadCards }] = createResource(
    () => sel()?.id,
    (id) => api<Card[]>("GET", `/subjects/${id}/cards`),
  );
  const reload = () => Promise.all([reloadCards(), reloadSubjects()]);
  // Seul l'admin supprime ; caché tant que les droits ne sont pas connus
  const [me] = createResource(() => api<{ admin: boolean }>("GET", "/me"));
  const drafts = () => (cards.latest ?? []).filter((c) => c.status === "draft").length;
  // Rangées réconciliées par id : un rechargement garde les mêmes nœuds, donc le focus
  const [rows, setRows] = createStore<Card[]>([]);
  createEffect(() => setRows(reconcile(cards.latest ?? [], { key: "id" })));

  const [q, setQ] = createSignal("");
  const [type, setType] = createSignal("");
  const [state, setState] = createSignal("");
  const clear = () => (setQ(""), setType(""), setState(""));
  // ponytail: tout le tableau est rendu d'un coup ; paginer par 50 si 500 cartes rament
  const shown = () => {
    const t = norm(q().trim());
    return rows.filter(
      (c) =>
        (!t || norm(plain(`${c.question} ${c.answer}`)).includes(t)) &&
        (!type() || c.type === type()) &&
        (!state() || (c.status ?? "active") === state()),
    );
  };

  const [creating, setCreating] = createSignal(new URLSearchParams(location.search).has("nouvelle"));
  const [editing, setEditing] = createSignal<Card | "new" | null>(null);
  const [renaming, setRenaming] = createSignal<Subject | null>(null);
  const [dropping, setDropping] = createSignal<Subject | null>(null);
  const [deleting, setDeleting] = createSignal<Card | null>(null);
  // Sélection multiple pour supprimer d'un coup ; seules les cartes visibles comptent, un filtre ne cache rien de ce qui part
  const [picked, setPicked] = createSignal(new Set<string>());
  const [bulk, setBulk] = createSignal(false);
  createEffect(() => (sel()?.id, setPicked(new Set<string>())));
  const chosen = () => shown().filter((c) => picked().has(c.id));
  const pick = (ids: string[], on: boolean) => {
    const n = new Set(picked());
    for (const id of ids) on ? n.add(id) : n.delete(id);
    setPicked(n);
  };
  // Le toast reste jusqu'à la prochaine action
  const [toast, setToast] = createSignal<{ text: string; undo?: () => void } | null>(null);
  const act = async (f: () => Promise<unknown>, done?: { text: string; undo?: () => void }) => {
    setToast(null);
    try {
      await f();
      if (done) setToast(done);
    } catch {
      setToast({ text: "Pas enregistré. Réessaie." });
    }
    await reload();
  };
  const status = (c: Card, s: "active" | "suspended") => api("PATCH", `/cards/${c.id}`, { status: s });
  const suspend = (c: Card) =>
    act(() => status(c, "suspended"), { text: "Carte suspendue.", undo: () => act(() => status(c, "active")) });

  const [failed, setFailed] = createSignal(false);
  // Fichier au format de l'import : il se recolle tel quel dans une matière. Brouillons exclus.
  // Chaque carte porte les formes de ses dessins (`drawings`, ignoré par le validateur) pour qu'ils suivent sur une autre installation
  async function exportCards(s: Subject) {
    const out = await Promise.all(
      (cards.latest ?? [])
        .filter((c) => c.status !== "draft")
        .map(async ({ type, question, answer, choices, explanation, source_page }) => {
          const ids = [...new Set([...`${question} ${answer} ${explanation ?? ""}`.matchAll(DRAWING)].map((m) => m[1]))];
          // Dessin introuvable : la carte part quand même, elle l'affichera comme indisponible, comme ici
          const found = await Promise.all(ids.map((id) => loadDrawing(id).then((sh) => [id, sh] as const, () => null)));
          const drawings = Object.fromEntries(found.filter((d) => d !== null));
          return { type, question, answer, choices, explanation, source_page: source_page ?? null, ...(ids.length && { drawings }) };
        }),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
    a.download = `${s.name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "cartes"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    announce(one(out.length) ? "1 carte exportée." : `${out.length} cartes exportées.`);
  }
  // Recoller un export (sauvegarde, matière passée par quelqu'un) : déjà relu, les cartes sont actives d'emblée
  let file!: HTMLInputElement;
  async function importFile(s: Subject, f: File | undefined) {
    file.value = "";
    if (!f) return;
    setToast(null);
    try {
      const r = await api<{ cards: unknown[]; rejected: { reason: string }[] }>("POST", "/imports", { subject_id: s.id, text: await f.text(), active: true });
      const n = r.cards.length;
      const dup = r.rejected.filter((x) => x.reason === "question déjà présente dans la matière").length;
      const off = r.rejected.length - dup;
      setToast({
        text: [
          one(n) ? "1 carte ajoutée." : `${n} cartes ajoutées.`,
          dup && (one(dup) ? "1 était déjà dans la matière." : `${dup} étaient déjà dans la matière.`),
          off && (one(off) ? "1 carte illisible écartée." : `${off} cartes illisibles écartées.`),
        ]
          .filter(Boolean)
          .join(" "),
      });
    } catch (e) {
      if (e instanceof Expired) return;
      setToast({
        text:
          e instanceof Failed && e.status === 413
            ? "Ce fichier est trop lourd pour un seul import."
            : e instanceof Failed && e.status === 400
              ? "Ce fichier n'est pas un export de cartes."
              : "L'import n'a pas abouti. Réessaie.",
      });
    }
    await reload();
  }
  async function revise(s: Subject) {
    setFailed(false);
    try {
      if (!(await start({ mode: "subject", subject_id: s.id }))) void reload();
    } catch {
      setFailed(true);
    }
  }

  return (
    <div class="page subjects-page">
      <a class="skip" href="#cards">
        Aller aux cartes
      </a>
      <header class="top">
        <div class="top-start">
          <Link href={p.id ? "/matieres" : "/"} class="icon-btn">
            <Icon name="back" />
            <span class="sr-only">{p.id ? "Retour aux matières" : "Retour à l'accueil"}</span>
          </Link>
          <span class="title">Matières</span>
        </div>
        <button class="btn small" onClick={() => setCreating(true)}>
          <Icon name="plus" />
          Nouvelle matière
        </button>
      </header>

      <div class="split" classList={{ picked: !!p.id }}>
        <nav class="side" aria-label="Matières" onKeyDown={(e) => arrows(e, "y")}>
          <ul class="rows">
            <For each={list()}>
              {(s) => (
                <li>
                  <a
                    href={`/matieres/${s.id}`}
                    class="row"
                    data-roving
                    tabIndex={s === sel() || (!sel() && s === list()[0]) ? 0 : -1}
                    aria-current={s === sel() ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      go(`/matieres/${s.id}`);
                    }}
                  >
                    <span class="name" title={s.name} style={hl(s.color)}>
                      <mark>{s.name}</mark>
                    </span>
                    <Show when={s.due > 0}>
                      <span class="badge">
                        Cartes du jour
                      </span>
                    </Show>
                  </a>
                </li>
              )}
            </For>
          </ul>
        </nav>

        <main class="detail" id="cards" tabIndex={-1}>
          <Show
            when={sel()}
            fallback={
              <Show when={subjects.state === "ready"}>
                <div class="empty">
                  <h1 class="lead-title">Commence par une matière.</h1>
                  <button class="btn primary" onClick={() => setCreating(true)}>
                    Nouvelle matière
                  </button>
                </div>
              </Show>
            }
          >
            {(s) => (
              <>
                <div class="detail-head" style={hl(s().color)}>
                  <h1 title={s().name}>
                    <mark>{s().name}</mark>
                  </h1>
                  <div class="inline">
                    {/* Actions rares : discrètes, en tête ici, donc en dernier sur téléphone (ordre inversé) */}
                    <button class="btn quiet" onClick={() => (setToast(null), setRenaming(s()))}>
                      Modifier la matière
                    </button>
                    <Show when={s().cards > 0}>
                      <button class="btn quiet" onClick={() => exportCards(s())}>
                        Exporter
                      </button>
                    </Show>
                    <button class="btn quiet" onClick={() => file.click()}>
                      Importer un fichier
                    </button>
                    <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => importFile(s(), e.currentTarget.files?.[0])} />
                    <button class="btn" onClick={() => setEditing("new")}>
                      <Icon name="plus" />
                      Ajouter une carte
                    </button>
                    <Show when={s().cards > 0 || drafts() > 0}>
                      <Link href={`/matieres/${s().id}/import`} class="btn">
                        Importer des cartes
                      </Link>
                    </Show>
                    <Show when={s().cards > 0}>
                      <button class="btn primary" onClick={() => revise(s())}>
                        Réviser cette matière
                      </button>
                    </Show>
                  </div>
                </div>
                <Show when={failed()}>
                  <p class="notice error" role="alert">
                    La session n'a pas pu démarrer.
                  </p>
                </Show>
                <Show when={drafts()}>
                  {(n) => (
                    <p class="notice drafts">
                      {one(n()) ? "1 carte importée attend ta relecture." : `${n()} cartes importées attendent ta relecture.`}{" "}
                      <Link href={`/matieres/${s().id}/relecture`} class="btn small">
                        Relire
                      </Link>
                    </p>
                  )}
                </Show>

                <Show
                  when={(cards.latest?.length ?? 0) > 0}
                  fallback={
                    <Show when={!cards.loading}>
                      <div class="empty">
                        <p>Pas encore de carte dans cette matière.</p>
                        <div class="inline">
                          <Link href={`/matieres/${s().id}/import`} class="btn primary">
                            Importer des cartes
                          </Link>
                          <button class="btn" onClick={() => setEditing("new")}>
                            Ajouter une carte
                          </button>
                        </div>
                      </div>
                    </Show>
                  }
                >
                  <div class="filters">
                    <label class="search">
                      <Icon name="search" />
                      <span class="sr-only">Chercher une carte</span>
                      <input
                        type="search"
                        class="field"
                        placeholder="Chercher une carte"
                        value={q()}
                        onInput={(e) => setQ(e.currentTarget.value)}
                      />
                    </label>
                    <select class="field" aria-label="Type" value={type()} onChange={(e) => setType(e.currentTarget.value)}>
                      <option value="">Tous les types</option>
                      <For each={Object.entries(TYPES)}>{([k, v]) => <option value={k}>{v}</option>}</For>
                    </select>
                    <select class="field" aria-label="État" value={state()} onChange={(e) => setState(e.currentTarget.value)}>
                      <option value="">Tous les états</option>
                      <For each={Object.entries(STATUS)}>{([k, v]) => <option value={k}>{v}</option>}</For>
                    </select>
                  </div>
                  <Show
                    when={shown().length}
                    fallback={
                      <p class="empty">
                        {type() || state() ? "Aucune carte ne correspond à ces filtres." : `Aucune carte ne contient « ${q().trim()} ».`}{" "}
                        <button class="link" onClick={clear}>
                          {type() || state() ? "Effacer les filtres" : "Effacer la recherche"}
                        </button>
                      </p>
                    }
                  >
                    <Show when={chosen().length}>
                      {(n) => (
                        <div class="bulk" role="status">
                          <span>{one(n()) ? "1 carte sélectionnée" : `${n()} cartes sélectionnées`}</span>
                          <button class="btn small" onClick={() => (setToast(null), setBulk(true))}>
                            Supprimer la sélection
                          </button>
                          <button class="link" onClick={() => setPicked(new Set<string>())}>
                            Tout désélectionner
                          </button>
                        </div>
                      )}
                    </Show>
                    <table class="cards">
                      <thead>
                        <tr>
                          <Show when={me()?.admin}>
                            <th scope="col" class="pick">
                              <input
                                type="checkbox"
                                aria-label="Tout sélectionner"
                                checked={chosen().length === shown().length}
                                ref={(el) => createEffect(() => (el.indeterminate = chosen().length > 0 && chosen().length < shown().length))}
                                onChange={(e) => pick(shown().map((c) => c.id), e.currentTarget.checked)}
                              />
                            </th>
                          </Show>
                          <th scope="col">Question</th>
                          <th scope="col">Type</th>
                          <th scope="col">État</th>
                          <th scope="col">
                            <span class="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={shown()}>
                          {(c) => (
                            <tr classList={{ off: c.status !== "active" }}>
                              <Show when={me()?.admin}>
                                <td class="pick">
                                  <input
                                    type="checkbox"
                                    aria-label={`Sélectionner « ${short(plain(c.question))} »`}
                                    checked={picked().has(c.id)}
                                    onChange={(e) => pick([c.id], e.currentTarget.checked)}
                                  />
                                </td>
                              </Show>
                              <td class="question">{plain(c.question)}</td>
                              <td>{TYPES[c.type]}</td>
                              {/* L'état ne se dit que quand il sort de l'ordinaire */}
                              <td>{c.status && c.status !== "active" ? STATUS[c.status] : ""}</td>
                              <td class="acts">
                                <div>
                                  <button class="link" onClick={() => (setToast(null), setEditing(c))}>
                                    Modifier
                                  </button>
                                  {/* Un seul bouton dont le libellé change : le focus reste dessus */}
                                  <button
                                    class="link"
                                    onClick={() => (c.status === "active" ? suspend(c) : act(() => status(c, "active")))}
                                  >
                                    {c.status === "active" ? "Suspendre" : c.status === "draft" ? "Accepter" : "Réactiver"}
                                  </button>
                                  <Show when={me()?.admin}>
                                    <button class="link" onClick={() => (setToast(null), setDeleting(c))}>
                                      Supprimer
                                    </button>
                                  </Show>
                                </div>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </Show>
                </Show>

                <Show when={editing()}>
                  {(e) => (
                    <CardForm
                      subject={s()}
                      card={e() === "new" ? undefined : (e() as Card)}
                      onSaved={() => void reload()}
                      onClose={() => setEditing(null)}
                    />
                  )}
                </Show>
              </>
            )}
          </Show>
        </main>
      </div>

      <Show when={creating()}>
        <SubjectForm
          used={list().map((s) => s.color)}
          onClose={() => {
            setCreating(false);
            if (location.search) history.replaceState(null, "", location.pathname);
          }}
          onSaved={async (id) => {
            setCreating(false);
            await reloadSubjects();
            go(`/matieres/${id}`);
          }}
        />
      </Show>

      <Show when={renaming()}>
        {(s) => (
          <SubjectForm
            subject={s()}
            used={list().map((x) => x.color)}
            onClose={() => setRenaming(null)}
            onSaved={async () => {
              setRenaming(null);
              await reloadSubjects();
              setToast({ text: "Matière enregistrée." });
            }}
            onDelete={me()?.admin ? () => (setRenaming(null), setDropping(s())) : undefined}
          />
        )}
      </Show>

      <Show when={dropping()}>
        {(s) => (
          <Confirm
            title={`Supprimer « ${short(s().name)} » ?`}
            text={(() => {
              const n = cards.latest?.length ?? 0;
              return n ? `${one(n) ? "Sa carte" : `Ses ${n} cartes`} et leur historique de révision seront perdus.` : undefined;
            })()}
            yes="Supprimer la matière"
            no="Garder"
            onNo={() => setDropping(null)}
            onYes={async () => {
              setDropping(null);
              setToast(null);
              try {
                await api("DELETE", `/subjects/${s().id}`);
                setToast({ text: "Matière supprimée." });
                go("/matieres");
              } catch {
                setToast({ text: "La matière n'a pas été supprimée. Réessaie." });
              }
              await reloadSubjects();
              document.querySelector<HTMLElement>(".side .row[tabindex='0']")?.focus();
            }}
          />
        )}
      </Show>

      <Show when={deleting()}>
        {(c) => (
          <Confirm
            title={`Supprimer « ${short(plain(c().question))} » ?`}
            text="Son historique de révision sera perdu."
            yes="Supprimer"
            no="Garder"
            onNo={() => setDeleting(null)}
            onYes={async () => {
              const k = shown().indexOf(c());
              setDeleting(null);
              await act(() => api("DELETE", `/cards/${c().id}`));
              // Sa rangée a disparu : le focus passe à la carte qui prend sa place, sinon à « Ajouter une carte »
              const trs = document.querySelectorAll(".cards tbody tr");
              (trs[Math.min(k, trs.length - 1)]?.querySelector("button") ?? document.querySelector<HTMLElement>(".detail .btn"))?.focus();
            }}
          />
        )}
      </Show>

      <Show when={bulk()}>
        <Confirm
          title={one(chosen().length) ? "Supprimer 1 carte ?" : `Supprimer ${chosen().length} cartes ?`}
          text="Leur historique de révision sera perdu."
          yes="Supprimer"
          no="Garder"
          onNo={() => setBulk(false)}
          onYes={async () => {
            const ids = chosen().map((c) => c.id);
            setBulk(false);
            // ponytail: une requête par carte, en parallèle ; route groupée si on supprime des centaines de cartes
            await act(() => Promise.all(ids.map((id) => api("DELETE", `/cards/${id}`))), {
              text: one(ids.length) ? "1 carte supprimée." : `${ids.length} cartes supprimées.`,
            });
            setPicked(new Set<string>());
            (document.querySelector<HTMLElement>(".cards tbody button") ?? document.querySelector<HTMLElement>(".detail .btn"))?.focus();
          }}
        />
      </Show>

      <Show when={toast()}>
        {(t) => (
          <div class="toast" role="status">
            {t().text}
            <Show when={t().undo}>
              <button class="link" onClick={() => t().undo!()}>
                Annuler
              </button>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}

const short = (s: string) => (s.length > 40 ? `${s.slice(0, 40).trimEnd()}…` : s);

// Sans `subject` : création. Avec : modification, et suppression si `onDelete` est fourni (admin)
function SubjectForm(p: { subject?: Subject; used: (Color | null)[]; onClose: () => void; onSaved: (id: string) => void; onDelete?: () => void }) {
  const s = p.subject;
  const [name, setName] = createSignal(s?.name ?? "");
  const [color, setColor] = createSignal<Color>(s?.color ?? COLORS.find(([c]) => !p.used.includes(c))?.[0] ?? "yellow");
  const [error, setError] = createSignal("");
  let input!: HTMLInputElement;
  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!name().trim()) {
      setError("Donne un nom à la matière.");
      return input.focus();
    }
    try {
      const b = { name: name().trim(), color: color() };
      p.onSaved(s ? (await api("PATCH", `/subjects/${s.id}`, b), s.id) : (await api<{ id: string }>("POST", "/subjects", b)).id);
    } catch {
      setError(s ? "La matière n'a pas été enregistrée. Réessaie." : "La matière n'a pas été créée. Réessaie.");
    }
  }
  return (
    <Dialog label={s ? "Modifier la matière" : "Nouvelle matière"} onClose={p.onClose}>
      <form onSubmit={submit} novalidate>
        <h2>{s ? "Modifier la matière" : "Nouvelle matière"}</h2>
        <label for="sname" class="label">
          Nom
        </label>
        <input
          ref={input}
          id="sname"
          class="field"
          autofocus
          maxlength={40}
          value={name()}
          onInput={(e) => (setName(e.currentTarget.value), setError(""))}
          aria-invalid={!!error()}
          aria-describedby="sname-err"
        />
        <p id="sname-err" class="error-text">
          {error()}
        </p>
        <fieldset class="colors">
          <legend class="label">Couleur</legend>
          <For each={COLORS}>
            {([c, label]) => (
              <label class="color-opt" style={hl(c)}>
                <input type="radio" name="color" checked={color() === c} onChange={() => setColor(c)} />
                <mark>{label}</mark>
              </label>
            )}
          </For>
        </fieldset>
        <div class="actions">
          <Show when={p.onDelete}>
            <button type="button" class="link drop-subject" onClick={() => p.onDelete!()}>
              Supprimer la matière
            </button>
          </Show>
          <button type="button" class="btn" onClick={p.onClose}>
            Annuler
          </button>
          <button class="btn primary">{s ? "Enregistrer" : "Créer la matière"}</button>
        </div>
      </form>
    </Dialog>
  );
}

/** `accept` : relecture d'un brouillon, l'enregistrement l'accepte aussi. */
export function CardForm(p: { subject: Subject; card?: Card; accept?: boolean; onSaved: (saved: Partial<Card>) => void; onClose: () => void }) {
  const c = p.card;
  const initChoices = [...(c?.choices ?? []), "", "", "", ""].slice(0, 4);
  const [type, setType] = createSignal<CardType>(c?.type ?? "qa");
  const [question, setQuestion] = createSignal(c?.question ?? "");
  const [answer, setAnswer] = createSignal(c?.type === "mcq" ? "" : (c?.answer ?? ""));
  const [explanation, setExplanation] = createSignal(c?.explanation ?? "");
  const [choices, setChoices] = createSignal(initChoices);
  const [correct, setCorrect] = createSignal(c?.type === "mcq" ? initChoices.indexOf(c.answer) : -1);
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [failed, setFailed] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [leaving, setLeaving] = createSignal(false);
  const snapshot = () => JSON.stringify([type(), question(), answer(), explanation(), choices(), correct()]);
  const initial = snapshot();
  const close = () => (snapshot() !== initial ? setLeaving(true) : p.onClose());
  let form!: HTMLFormElement;

  // Dessin en cours pour un champ : sa référence s'insère au curseur, ou remplace celle du dessin modifié
  type Target = { field: string; set: (v: string) => void; id?: string; shapes?: Shape[] };
  const [drawFor, setDrawFor] = createSignal<Target | null>(null);
  function insertDrawing(id: string) {
    const { field, set, id: old } = drawFor()!;
    const el = document.getElementById(field) as HTMLTextAreaElement;
    const ref = `![dessin](${id})`;
    set(old ? el.value.replace(`![dessin](${old})`, ref) : el.value.slice(0, el.selectionEnd) + ref + el.value.slice(el.selectionEnd));
    setDrawFor(null);
  }
  async function editDrawing(d: Target) {
    try {
      setDrawFor({ ...d, shapes: await loadDrawing(d.id!) });
    } catch {
      announce("Le dessin n'a pas pu être ouvert.");
    }
  }
  const DrawButton = (q: { field: string; value: string; set: (v: string) => void }) => {
    const ids = () => [...q.value.matchAll(DRAWING)].map((m) => m[1]);
    return (
      <div class="draw-add">
        {/* Index : le bouton reste en place quand le dessin modifié change d'id, et garde le focus */}
        <Index each={ids()}>
          {(id, k) => (
            <button type="button" class="link" onClick={() => editDrawing({ ...q, id: id() })}>
              {ids().length > 1 ? `Modifier le dessin ${k + 1}` : "Modifier le dessin"}
            </button>
          )}
        </Index>
        <button type="button" class="link" onClick={() => setDrawFor(q)}>
          Ajouter un dessin
        </button>
      </div>
    );
  };

  function validate() {
    const e: Record<string, string> = {};
    if (!question().trim()) e.question = "Écris la question.";
    else if (type() === "cloze" && question().match(/_{3,}/g)?.length !== 1)
      e.question = "Marque un seul mot à retrouver, avec ___.";
    if (type() === "mcq") {
      if (choices().filter((x) => x.trim()).length < 2) e.choices = "Ajoute au moins 2 choix.";
      else if (!choices()[correct()]?.trim()) e.choices = "Indique la bonne réponse.";
    } else if (!answer().trim()) e.answer = "Écris la réponse attendue.";
    setErrors(e);
    return Object.keys(e)[0];
  }

  async function submit(again: boolean) {
    const bad = validate();
    if (bad) return form.querySelector<HTMLElement>(`[data-field="${bad}"]`)?.focus();
    const mcq = type() === "mcq";
    const body = {
      type: type(),
      question: question().trim(),
      answer: mcq ? choices()[correct()].trim() : answer().trim(),
      choices: mcq ? choices().map((x) => x.trim()).filter(Boolean) : null,
      explanation: explanation().trim() || null,
      ...(p.accept && { status: "active" as const }),
    };
    setBusy(true);
    setFailed(false);
    try {
      if (c) await api("PATCH", `/cards/${c.id}`, body);
      else await api("POST", "/cards", { ...body, subject_id: p.subject.id });
      p.onSaved(body);
      if (!again) return p.onClose();
      setQuestion("");
      setAnswer("");
      setExplanation("");
      setChoices(["", "", "", ""]);
      setCorrect(-1);
      announce("Carte ajoutée.");
      form.querySelector<HTMLElement>('[data-field="question"]')?.focus();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => ({
    "aria-invalid": !!errors()[k],
    "aria-describedby": `${k}-err`,
  });

  return (
    <Dialog label={c ? "Modifier la carte" : `Nouvelle carte · ${p.subject.name}`} onClose={close} class="card-form">
      <form
        ref={form}
        novalidate
        onInput={() => Object.keys(errors()).length && setErrors({})}
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
      >
        <h2>{c ? "Modifier la carte" : `Nouvelle carte · ${p.subject.name}`}</h2>
        <Show when={failed()}>
          <p class="notice error" role="alert">
            {c ? "La carte n'a pas été enregistrée." : "La carte n'a pas été ajoutée."} Ce que tu as écrit est conservé.{" "}
            <button type="button" class="link" onClick={() => submit(false)}>
              Réessayer
            </button>
          </p>
        </Show>

        <div class="chips" role="group" aria-label="Type de carte">
          <For each={Object.entries(TYPES)}>
            {([k, label]) => (
              <button
                type="button"
                class="chip"
                aria-pressed={type() === k}
                onClick={() => (setType(k as CardType), setErrors({}))}
              >
                {label}
              </button>
            )}
          </For>
        </div>

        <label for="f-question" class="label">
          Question
        </label>
        <textarea
          id="f-question"
          data-field="question"
          class="field"
          rows={2}
          autofocus
          value={question()}
          onInput={(e) => setQuestion(e.currentTarget.value)}
          {...err("question")}
          aria-describedby="question-err question-hint"
        />
        <Preview text={question()} />
        <DrawButton field="f-question" value={question()} set={setQuestion} />
        <Show when={type() === "cloze"}>
          <p id="question-hint" class="hint">
            Marque le mot à retrouver avec ___.
          </p>
        </Show>
        <p id="question-err" class="error-text">
          {errors().question}
        </p>

        <Show
          when={type() === "mcq"}
          fallback={
            <>
              <label for="f-answer" class="label">
                Réponse
              </label>
              <textarea
                id="f-answer"
                data-field="answer"
                class="field"
                rows={type() === "explain" ? 5 : 2}
                placeholder="La réponse attendue"
                value={answer()}
                onInput={(e) => setAnswer(e.currentTarget.value)}
                {...err("answer")}
                aria-describedby="answer-err answer-hint"
              />
              <Preview text={answer()} />
              <DrawButton field="f-answer" value={answer()} set={setAnswer} />
              <p id="answer-hint" class="hint">
                Entoure le terme clé de == pour le surligner à la correction : ==élasticité==.
              </p>
              <p id="answer-err" class="error-text">
                {errors().answer}
              </p>
            </>
          }
        >
          <fieldset class="mcq" {...err("choices")}>
            <legend class="label">Choix · Bonne réponse</legend>
            <Index each={choices()}>
              {(v, k) => (
                <div class="choice-row">
                  <input
                    type="radio"
                    name="correct"
                    checked={correct() === k}
                    onChange={() => setCorrect(k)}
                    aria-label={`Choix ${k + 1} : bonne réponse`}
                  />
                  <input
                    class="field"
                    data-field={k === 0 ? "choices" : undefined}
                    aria-label={`Choix ${k + 1}`}
                    value={v()}
                    onInput={(e) => setChoices(choices().map((x, j) => (j === k ? e.currentTarget.value : x)))}
                  />
                </div>
              )}
            </Index>
            <p id="choices-err" class="error-text">
              {errors().choices}
            </p>
          </fieldset>
        </Show>

        <label for="f-explanation" class="label">
          Explication (facultatif)
        </label>
        <textarea
          id="f-explanation"
          class="field"
          rows={2}
          placeholder="Ce qui aide à retenir"
          value={explanation()}
          onInput={(e) => setExplanation(e.currentTarget.value)}
        />
        <Preview text={explanation()} />
        <DrawButton field="f-explanation" value={explanation()} set={setExplanation} />

        <div class="actions">
          <button type="button" class="btn quiet" onClick={close}>
            Annuler
          </button>
          <Show when={!c}>
            <button type="button" class="btn" disabled={busy()} onClick={() => submit(true)}>
              Ajouter et en créer une autre
            </button>
          </Show>
          <button class="btn primary" disabled={busy()}>
            {p.accept ? "Enregistrer et accepter" : c ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>

      <Show when={drawFor()}>
        <DrawDialog shapes={drawFor()!.shapes} onDone={insertDrawing} onClose={() => setDrawFor(null)} />
      </Show>
      <Show when={leaving()}>
        <Confirm
          title={c ? "Abandonner les modifications ?" : "Abandonner cette carte ?"}
          yes="Abandonner"
          no="Continuer"
          onYes={p.onClose}
          onNo={() => setLeaving(false)}
        />
      </Show>
    </Dialog>
  );
}
