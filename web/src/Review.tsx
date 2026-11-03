import { For, Match, Show, Switch, createEffect, createResource, createSignal, on, onCleanup, onMount } from "solid-js";
import { api, type Card, type Subject } from "./api";
import { CardForm } from "./Subjects";
import { Cloze, Icon, Link, Marked, TYPES, announce, cardsLabel, go, hl, one, plain, start } from "./ui";

const part = (n: number, word: string) => `${n} ${word}${one(n) ? "" : "s"}`;

export default function Review(p: { id: string }) {
  const back = `/matieres/${p.id}`;
  const [subjects] = createResource(() => api<Subject[]>("GET", "/subjects"));
  const subject = () => subjects()?.find((s) => s.id === p.id);
  // La liste est figée à l'ouverture : l'ordre du lot, celui du cours
  const [queue] = createResource(async () => {
    const all = await api<Card[]>("GET", `/subjects/${p.id}/cards`);
    return all.filter((c) => c.status === "draft");
  });
  createEffect(() => queue()?.length === 0 && go(back));

  const [i, setI] = createSignal(0);
  const [accepted, setAccepted] = createSignal(0);
  const [deleted, setDeleted] = createSignal(0);
  const [failed, setFailed] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [editing, setEditing] = createSignal(false);
  const cards = () => queue() ?? [];
  const card = () => cards()[i()];
  const done = () => queue.state === "ready" && cards().length > 0 && i() >= cards().length;

  // Suppression différée jusqu'à l'action suivante : « Annuler » n'a rien à recréer.
  // Un échec ou un onglet fermé laisse la carte en brouillon, elle reviendra à la prochaine relecture.
  const [trash, setTrash] = createSignal<Card | null>(null);
  const commit = () => {
    const t = trash();
    setTrash(null);
    if (t) void api("DELETE", `/cards/${t.id}`).catch(() => {});
  };
  onCleanup(commit);
  addEventListener("pagehide", commit);
  onCleanup(() => removeEventListener("pagehide", commit));

  const next = () => setI(i() + 1);
  async function accept() {
    if (busy()) return;
    commit();
    setBusy(true);
    setFailed(false);
    try {
      await api("PATCH", `/cards/${card().id}`, { status: "active" });
      setAccepted(accepted() + 1);
      next();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  function remove() {
    commit();
    setFailed(false);
    setTrash(card());
    setDeleted(deleted() + 1);
    next();
  }
  function undo() {
    setTrash(null);
    setDeleted(deleted() - 1);
    setI(i() - 1);
  }

  // Le focus revient sur « Accepter » à chaque carte : une carte juste coûte une touche
  let acceptBtn: HTMLButtonElement | undefined;
  let endBtn: HTMLButtonElement | undefined;
  createEffect(
    on([i, () => queue.state], () => {
      if (queue.state !== "ready") return;
      queueMicrotask(() => (done() ? endBtn : acceptBtn)?.focus({ preventScroll: true }));
      if (card()) announce(`Carte ${i() + 1} sur ${cards().length}.`);
      scrollTo(0, 0);
    }),
  );

  onMount(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) go(back);
    };
    addEventListener("keydown", key);
    onCleanup(() => removeEventListener("keydown", key));
  });

  const [startFailed, setStartFailed] = createSignal(false);
  async function revise() {
    setStartFailed(false);
    try {
      if (!(await start({ mode: "subject", subject_id: p.id }))) go(back);
    } catch {
      setStartFailed(true);
    }
  }

  return (
    <div class="page review" style={hl(subject()?.color)}>
      <header class="bar">
        <div class="bar-start">
          <Link href={back} class="btn quiet small back">
            <Icon name="back" />
            <span class="subject">{subject()?.name ?? "Matière"}</span>
            <span class="sr-only">, retour à la matière</span>
          </Link>
        </div>
        <Show when={card()}>
          <span class="pos" aria-hidden="true">
            {i() + 1} / {cards().length}
          </span>
        </Show>
      </header>

      <Switch>
        <Match when={done()}>
          <main class="col end">
            <h1 class="lead-title">
              {accepted()
                ? `${cardsLabel(cards().length)} ${one(cards().length) ? "relue" : "relues"} : ${part(accepted(), "acceptée")}${deleted() ? `, ${part(deleted(), "supprimée")}` : ""}.`
                : `${cardsLabel(cards().length)} ${one(cards().length) ? "relue" : "relues"}, aucune acceptée.`}
            </h1>
            <div class="stack">
              <Show
                when={accepted()}
                fallback={
                  <button ref={endBtn} class="btn primary lg block" onClick={() => go(`${back}/import`)}>
                    Importer un autre lot
                  </button>
                }
              >
                <button ref={endBtn} class="btn primary lg block" onClick={revise}>
                  Réviser cette matière
                </button>
              </Show>
              <button class="btn block" onClick={() => go(back)}>
                Retour à la matière
              </button>
            </div>
            <Show when={startFailed()}>
              <p class="notice error" role="alert">
                La session n'a pas pu démarrer.
              </p>
            </Show>
          </main>
        </Match>
        <Match when={card()}>
          {(c) => (
            <main class="sheet card">
              <p class="muted small">
                {TYPES[c().type]}
                {c().source_page ? ` · p. ${c().source_page}` : ""}
              </p>
              <h1 class="q revealed">
                <Show when={c().type === "cloze"} fallback={plain(c().question)}>
                  <Cloze text={c().question} fill={plain(c().answer)} />
                </Show>
              </h1>
              <Switch>
                <Match when={c().type === "mcq"}>
                  <ul class="choices done">
                    <For each={c().choices}>
                      {(x) => (
                        <li>
                          {x === c().answer ? <mark class="draw">{x}</mark> : x}
                          <Show when={x === c().answer}>
                            <span class="tag">Bonne réponse</span>
                          </Show>
                        </li>
                      )}
                    </For>
                  </ul>
                </Match>
                <Match when={c().type !== "cloze"}>
                  <section class="part" aria-labelledby="corr">
                    <h2 id="corr" class="label">
                      Réponse
                    </h2>
                    <p class="answer">
                      <Marked text={c().answer} />
                    </p>
                  </section>
                </Match>
              </Switch>
              <Show when={c().explanation}>
                <p class="explanation">{c().explanation}</p>
              </Show>

              <div class="grades-dock">
                <Show when={failed()}>
                  <p class="notice error" role="alert">
                    La carte n'a pas été acceptée. Réessaie.
                  </p>
                </Show>
                <div class="review-acts">
                  <button ref={acceptBtn} class="btn primary lg" onClick={accept} disabled={busy()}>
                    Accepter<span class="key">Entrée</span>
                  </button>
                  <button class="btn lg" onClick={() => (commit(), setFailed(false), setEditing(true))}>
                    Modifier
                  </button>
                  <button class="btn lg" onClick={remove}>
                    Supprimer
                  </button>
                </div>
              </div>

              <Show when={editing() && subject()}>
                {(s) => {
                  let saved = false;
                  return (
                    <CardForm
                      subject={s()}
                      card={c()}
                      accept
                      onSaved={() => ((saved = true), setAccepted(accepted() + 1))}
                      onClose={() => {
                        setEditing(false);
                        if (saved) next();
                        else queueMicrotask(() => acceptBtn?.focus());
                      }}
                    />
                  );
                }}
              </Show>
            </main>
          )}
        </Match>
      </Switch>

      <Show when={trash()}>
        <div class="toast" role="status">
          Carte supprimée.
          <button class="link" onClick={undo}>
            Annuler
          </button>
        </div>
      </Show>
    </div>
  );
}
