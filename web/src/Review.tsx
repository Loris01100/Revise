import { For, Match, Show, Switch, createEffect, createResource, createSignal, on, onCleanup, onMount } from "solid-js";
import { api, type Card, type Subject } from "./api";
import { CardForm } from "./Subjects";
import { Cloze, Icon, Link, Rich, TYPES, announce, cardsLabel, go, hl, one, plain, start } from "./ui";

const part = (n: number, word: string) => `${n} ${word}${one(n) ? "" : "s"}`;

export default function Review(p: { id: string }) {
  const back = `/matieres/${p.id}`;
  const [subjects] = createResource(() => api<Subject[]>("GET", "/subjects"));
  const subject = () => (subjects.error ? undefined : subjects()?.find((s) => s.id === p.id));
  // La liste est figée à l'ouverture : l'ordre du lot, celui du cours
  const [queue, { refetch }] = createResource(async () => {
    const all = await api<Card[]>("GET", `/subjects/${p.id}/cards`);
    return all.filter((c) => c.status === "draft");
  });
  createEffect(() => queue.state === "ready" && queue().length === 0 && go(back));

  const [i, setI] = createSignal(0);
  const [accepted, setAccepted] = createSignal(0);
  const [deleted, setDeleted] = createSignal(0);
  const [editing, setEditing] = createSignal(false);
  const cards = () => (queue.state === "ready" ? queue() : []);
  const card = () => cards()[i()];
  const done = () => queue.state === "ready" && cards().length > 0 && i() >= cards().length;

  // Acceptation et suppression différées jusqu'à l'action suivante : « Annuler » n'a rien à défaire côté serveur.
  // Un échec ou un onglet fermé laisse la carte en brouillon, elle reviendra à la prochaine relecture.
  const [pending, setPending] = createSignal<{ card: Card; act: "accept" | "delete" } | null>(null);
  const [lost, setLost] = createSignal(false);
  const commit = async () => {
    const t = pending();
    setPending(null);
    if (t?.act === "delete") void api("DELETE", `/cards/${t.card.id}`, undefined, true).catch(() => {});
    if (t?.act === "accept")
      await api("PATCH", `/cards/${t.card.id}`, { status: "active" }, true).catch(() => {
        setAccepted(accepted() - 1);
        setLost(true);
      });
  };
  onCleanup(commit);
  addEventListener("pagehide", commit);
  onCleanup(() => removeEventListener("pagehide", commit));

  const next = () => setI(i() + 1);
  const relues = () => `${cardsLabel(cards().length)} ${one(cards().length) ? "relue" : "relues"}`;
  const summary = () =>
    accepted()
      ? `${relues()} : ${part(accepted(), "acceptée")}${deleted() ? `, ${part(deleted(), "supprimée")}` : ""}.`
      : `${relues()}, aucune acceptée.`;
  function act(a: "accept" | "delete") {
    void commit();
    setLost(false);
    setPending({ card: card(), act: a });
    a === "accept" ? setAccepted(accepted() + 1) : setDeleted(deleted() + 1);
    next();
  }
  const edit = () => (void commit(), setLost(false), setEditing(true));
  function undo() {
    const a = pending()?.act;
    setPending(null);
    a === "accept" ? setAccepted(accepted() - 1) : setDeleted(deleted() - 1);
    setI(i() - 1);
  }

  // Le focus revient sur « Accepter » à chaque carte : une carte juste coûte une touche
  let acceptBtn: HTMLButtonElement | undefined;
  let endBtn: HTMLButtonElement | undefined;
  let shownAt = 0;
  createEffect(
    on([i, () => queue.state], () => {
      if (queue.state !== "ready") return;
      shownAt = performance.now();
      queueMicrotask(() => (done() ? endBtn : acceptBtn)?.focus({ preventScroll: true }));
      // Le focus saute au bouton de fin : le bilan doit être lu, pas seulement affiché
      announce(card() ? `Carte ${i() + 1} sur ${cards().length}.` : done() ? summary() : "");
      scrollTo(0, 0);
    }),
  );

  onMount(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "Escape") go(back);
      // Entrée tenue ou frappée sur l'élan de la carte précédente : la nouvelle carte n'a pas encore été lue
      if (e.key === "Enter" && (e.repeat || performance.now() - shownAt < 400)) e.preventDefault();
      // M et S : les deux autres gestes de la carte, sans passer par Tab
      const t = e.target as HTMLElement;
      // Même garde qu'Entrée : un double S supprimerait deux cartes, dont une sans Annuler
      if (!card() || e.repeat || performance.now() - shownAt < 400 || e.ctrlKey || e.metaKey || e.altKey || t.matches("input, textarea, select")) return;
      const k = e.key.toLowerCase();
      if (k === "m") edit();
      else if (k === "s") act("delete");
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", key);
    onCleanup(() => removeEventListener("keydown", key));
  });

  const [startFailed, setStartFailed] = createSignal(false);
  async function revise() {
    setStartFailed(false);
    try {
      await commit();
      if (!(await start({ mode: "subject", subject_id: p.id }))) go(back);
    } catch {
      setStartFailed(true);
    }
  }

  // Confirmation au-dessus des boutons, hauteur réservée : rien ne bouge sous le pouce
  const Status = () => (
    <p class="review-status" role="status">
      <Show when={pending()}>
        {pending()?.act === "accept" ? "Carte acceptée." : "Carte supprimée."}
        <button class="link" onClick={undo}>
          Annuler
        </button>
      </Show>
    </p>
  );
  return (
    <div class="page review" style={hl(subject()?.color)}>
      <header class="bar">
        <div class="bar-start">
          <Link href={back} class="btn quiet small back">
            <Icon name="back" />
            <span class="subject">
              <mark>{subject()?.name ?? "Matière"}</mark>
            </span>
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
        <Match when={queue.error}>
          <main class="col end">
            <h1 class="lead-title">Les cartes n'ont pas pu être chargées.</h1>
            <p class="muted">Vérifie ta connexion, puis réessaie.</p>
            <div class="stack">
              <button class="btn primary lg block" onClick={() => refetch()}>
                Réessayer
              </button>
              <button class="btn block" onClick={() => go(back)}>
                Retour à la matière
              </button>
            </div>
          </main>
        </Match>
        <Match when={done()}>
          <main class="col end">
            <h1 class="lead-title">{summary()}</h1>
            <Status />
            <div class="stack">
              <Show
                when={accepted()}
                fallback={
                  <button ref={endBtn} class="btn primary lg block" onClick={() => commit().then(() => go(`${back}/import`))}>
                    Importer un autre lot
                  </button>
                }
              >
                <button ref={endBtn} class="btn primary lg block" onClick={revise}>
                  Réviser cette matière
                </button>
              </Show>
              <button class="btn block" onClick={() => commit().then(() => go(back))}>
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
                <Show when={c().type === "cloze"} fallback={<Rich text={c().question} />}>
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
                      <Rich text={c().answer} />
                    </p>
                  </section>
                </Match>
              </Switch>
              <Show when={c().explanation}>
                <p class="explanation"><Rich text={c().explanation!} /></p>
              </Show>

              <div class="grades-dock">
                <Status />
                <Show when={lost()}>
                  <p class="notice error" role="alert">
                    La carte précédente n'a pas été acceptée. Elle reviendra à la prochaine relecture.
                  </p>
                </Show>
                <div class="review-acts">
                  <button ref={acceptBtn} class="btn primary lg" onClick={() => act("accept")} aria-keyshortcuts="Enter">
                    Accepter
                    <span class="key" aria-hidden="true">
                      Entrée
                    </span>
                  </button>
                  <button class="btn lg" onClick={edit} aria-keyshortcuts="M">
                    Modifier
                    <span class="key" aria-hidden="true">
                      M
                    </span>
                  </button>
                  <button class="btn lg" onClick={() => act("delete")} aria-keyshortcuts="S">
                    Supprimer
                    <span class="key" aria-hidden="true">
                      S
                    </span>
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
    </div>
  );
}
