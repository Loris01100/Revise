import { For, Index, Show, createResource, createSignal } from "solid-js";
import { api, type Card, type CardType, type Color, type Subject } from "./api";
import { COLORS, Confirm, Dialog, Icon, Link, TYPES, announce, arrows, go, hl, plain, start } from "./ui";

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

  const [q, setQ] = createSignal("");
  // ponytail: tout le tableau est rendu d'un coup ; paginer par 50 si 500 cartes rament
  const shown = () => {
    const t = norm(q().trim());
    return (cards.latest ?? []).filter((c) => !t || norm(plain(`${c.question} ${c.answer}`)).includes(t));
  };

  const [creating, setCreating] = createSignal(new URLSearchParams(location.search).has("nouvelle"));
  const [editing, setEditing] = createSignal<Card | "new" | null>(null);
  const [deleting, setDeleting] = createSignal<Card | null>(null);
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
    void reload();
  };
  const status = (c: Card, s: "active" | "suspended") => api("PATCH", `/cards/${c.id}`, { status: s });
  const suspend = (c: Card) =>
    act(() => status(c, "suspended"), { text: "Carte suspendue.", undo: () => act(() => status(c, "active")) });

  const [failed, setFailed] = createSignal(false);
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
                    <button class="btn" onClick={() => setEditing("new")}>
                      <Icon name="plus" />
                      Ajouter une carte
                    </button>
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

                <Show
                  when={(cards.latest?.length ?? 0) > 0}
                  fallback={
                    <Show when={!cards.loading}>
                      <div class="empty">
                        <p>Pas encore de carte dans cette matière.</p>
                        <button class="btn primary" onClick={() => setEditing("new")}>
                          Ajouter une carte
                        </button>
                      </div>
                    </Show>
                  }
                >
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
                  <Show
                    when={shown().length}
                    fallback={
                      <p class="empty">
                        Aucune carte ne contient « {q().trim()} ».{" "}
                        <button class="link" onClick={() => setQ("")}>
                          Effacer la recherche
                        </button>
                      </p>
                    }
                  >
                    <table class="cards">
                      <thead>
                        <tr>
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
                              <td class="question">{plain(c.question)}</td>
                              <td>{TYPES[c.type]}</td>
                              <td>{STATUS[c.status ?? "active"]}</td>
                              <td class="acts">
                                <div>
                                <button class="link" onClick={() => (setToast(null), setEditing(c))}>
                                  Modifier
                                </button>
                                <Show
                                  when={c.status === "active"}
                                  fallback={
                                    <button class="link" onClick={() => act(() => status(c, "active"))}>
                                      Réactiver
                                    </button>
                                  }
                                >
                                  <button class="link" onClick={() => suspend(c)}>
                                    Suspendre
                                  </button>
                                </Show>
                                <button class="link" onClick={() => (setToast(null), setDeleting(c))}>
                                  Supprimer
                                </button>
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
          onCreated={async (id) => {
            setCreating(false);
            await reloadSubjects();
            go(`/matieres/${id}`);
          }}
        />
      </Show>

      <Show when={deleting()}>
        {(c) => (
          <Confirm
            title={`Supprimer « ${short(plain(c().question))} » ?`}
            text="Son historique de révision sera perdu."
            yes="Supprimer"
            no="Garder"
            onNo={() => setDeleting(null)}
            onYes={() => {
              setDeleting(null);
              void act(() => api("DELETE", `/cards/${c().id}`));
            }}
          />
        )}
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

function SubjectForm(p: { used: (Color | null)[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = createSignal("");
  const [color, setColor] = createSignal<Color>(COLORS.find(([c]) => !p.used.includes(c))?.[0] ?? "yellow");
  const [error, setError] = createSignal("");
  let input!: HTMLInputElement;
  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!name().trim()) {
      setError("Donne un nom à la matière.");
      return input.focus();
    }
    try {
      const { id } = await api<{ id: string }>("POST", "/subjects", { name: name().trim(), color: color() });
      p.onCreated(id);
    } catch {
      setError("La matière n'a pas été créée. Réessaie.");
    }
  }
  return (
    <Dialog label="Nouvelle matière" onClose={p.onClose}>
      <form onSubmit={submit} novalidate>
        <h2>Nouvelle matière</h2>
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
          <button type="button" class="btn" onClick={p.onClose}>
            Annuler
          </button>
          <button class="btn primary">Créer la matière</button>
        </div>
      </form>
    </Dialog>
  );
}

function CardForm(p: { subject: Subject; card?: Card; onSaved: () => void; onClose: () => void }) {
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
    };
    setBusy(true);
    setFailed(false);
    try {
      if (c) await api("PATCH", `/cards/${c.id}`, body);
      else await api("POST", "/cards", { ...body, subject_id: p.subject.id });
      p.onSaved();
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
            {c ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>

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
