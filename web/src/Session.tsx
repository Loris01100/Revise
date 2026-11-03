import { For, Match, Show, Switch, createEffect, createResource, createSignal, on, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { api, enqueue, release, stalled, waitingReviews, type Parked, type Subject } from "./api";
import { Cloze, Dialog, Icon, Marked, announce, arrows, duration, focusFree, go, hl, one, plain, setRun, settings, start, type Run } from "./ui";

const GRADES = [
  [1, "À revoir", "La carte revient aujourd'hui."],
  [2, "Difficile", "La carte revient bientôt."],
  [3, "Bien", "La carte revient dans quelques jours."],
  [4, "Facile", "La carte revient plus tard."],
] as const;
const PAUSE_MS = 5 * 60_000;

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type Review = { id: string; at: string; grade: number; ms: number };

export default function Session(p: { run: Run }) {
  const { id: sid, cards } = p.run;
  const timed = p.run.mode.mode === "timed" ? p.run.mode.planned_min : 0;
  const [subjects] = createResource(() => api<Subject[]>("GET", "/subjects").catch(() => []));
  const subject = (id: string) => subjects.latest?.find((s) => s.id === id);

  const [i, setI] = createSignal(0);
  const [st, setSt] = createStore(
    cards.map(() => ({ draft: "", typed: false, pick: -1, revealed: false, shown: 0, review: null as Review | null })),
  );
  const [view, setView] = createSignal<"card" | "pause" | "end">("card");
  const [parking, setParking] = createSignal(false);
  const [help, setHelp] = createSignal("");
  const card = () => cards[i()];
  const cur = () => st[i()];
  let locked = false;

  // Temps de session, pauses déduites
  const t0 = Date.now();
  let pausedMs = 0;
  let pauseAt = 0;
  const [now, setNow] = createSignal(Date.now());
  const tick = setInterval(() => setNow(Date.now()), 1000);
  onCleanup(() => clearInterval(tick));
  const elapsed = () => now() - t0 - pausedMs - (view() === "pause" ? now() - pauseAt : 0);
  const timeUp = () => timed > 0 && Date.now() - t0 - pausedMs >= timed * 60_000;
  let autoPaused = false;

  function focusCard() {
    const sel = cur().revealed ? ".grades [tabindex='0']" : card().type === "mcq" ? ".choices [tabindex='0']" : "#answer";
    document.querySelector<HTMLElement>(sel)?.focus();
  }

  createEffect(
    on(i, (k) => {
      locked = false;
      if (!st[k].shown) setSt(k, "shown", Date.now());
      const s = subject(cards[k].subject_id);
      announce(`Carte ${k + 1} sur ${cards.length}.${s ? ` ${s.name}.` : ""}`);
      queueMicrotask(focusCard);
    }),
  );

  function reveal() {
    if (cur().revealed) return;
    setSt(i(), "revealed", true);
    announce(`Correction : ${plain(card().answer)}`);
    queueMicrotask(focusCard);
  }
  function pick(k: number) {
    if (cur().revealed) return;
    setSt(i(), "pick", k);
    reveal();
  }

  // Révélation automatique : le délai ne court que si rien n'est tapé et que l'onglet est visible
  createEffect(
    on([i, () => settings().autoReveal], ([k, enabled]) => {
      if (!enabled) return;
      let waited = 0;
      const t = setInterval(() => {
        if (st[k].typed || st[k].revealed || view() !== "card" || parking() || document.hidden) return;
        if (++waited >= settings().delay) reveal();
      }, 1000);
      onCleanup(() => clearInterval(t));
    }),
  );

  function grade(g: number) {
    if (locked || !cur().revealed || view() !== "card" || parking()) return;
    locked = true;
    const k = i();
    const prev = st[k].review;
    const r: Review = prev
      ? { ...prev, grade: g }
      : { id: crypto.randomUUID(), at: new Date().toISOString(), grade: g, ms: Date.now() - st[k].shown };
    // Une nouvelle note rend la précédente définitive ; corriger remplace la note gardée
    if (!prev) void release();
    enqueue({
      id: r.id,
      method: "POST",
      path: `/sessions/${sid}/reviews`,
      hold: true,
      body: { id: r.id, card_id: cards[k].id, grade: g, duration_ms: r.ms, reviewed_at: r.at },
    });
    setSt(k, "review", r);
    setGradedAt(Date.now());
    if (k + 1 >= cards.length) return void end();
    setI(k + 1);
    if (timeUp() && !autoPaused) {
      autoPaused = true;
      openPause();
    }
  }
  // « Corriger » ne reste que 10 s après une note : assez pour une erreur de touche, pas pour ruminer
  const [gradedAt, setGradedAt] = createSignal(0);
  const canCorrect = () =>
    view() === "card" && i() > 0 && !cur().review && !!st[i() - 1].review && now() - gradedAt() < 10_000;

  // Pause : la carte reste montée (cachée) pour garder la saisie et rendre le focus
  let back: HTMLElement | null = null;
  function openPause() {
    if (view() !== "card") return;
    back = document.activeElement as HTMLElement;
    pauseAt = Date.now();
    setView("pause");
    announce("Pause, 5 minutes.");
  }
  function resume() {
    pausedMs += Date.now() - pauseAt;
    setView("card");
    queueMicrotask(() => (back?.isConnected ? back.focus() : focusCard()));
  }
  const pauseLeft = () => Math.max(0, PAUSE_MS - (now() - pauseAt));
  createEffect(on(() => view() === "pause" && pauseLeft() === 0, (over) => over && announce("Pause terminée.")));

  function keep(text: string) {
    if (!text.trim()) return;
    enqueue({ method: "POST", path: "/parked", body: { text: text.trim(), session_id: sid } });
    announce("Pensée gardée.");
  }

  function onKey(e: KeyboardEvent) {
    if (document.querySelector("dialog[open]") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape" && view() === "card") {
      e.preventDefault();
      return openPause();
    }
    const t = e.target as HTMLElement;
    if (view() !== "card" || t.matches("input, textarea, select")) return;
    if (t !== document.body && !t.closest(".card")) return;
    const n = Number(e.key);
    if (cur().revealed && n >= 1 && n <= 4) grade(n);
    else if (cur().revealed && e.key.toLowerCase() === "p") setParking(true);
    else if (!cur().revealed && card().type === "mcq" && n >= 1 && n <= (card().choices?.length ?? 0)) pick(n - 1);
    else return;
    e.preventDefault();
  }
  document.addEventListener("keydown", onKey);
  onCleanup(() => document.removeEventListener("keydown", onKey));

  // Fin : bilan local tout de suite, pensées non traitées dès que le serveur répond
  const [result, setResult] = createSignal({ done: 0, ms: 0 });
  const [parked, setParked] = createSignal<Parked[]>([]);
  async function end() {
    if (view() === "pause") pausedMs += Date.now() - pauseAt;
    setResult({ done: st.filter((x) => x.review).length, ms: Date.now() - t0 - pausedMs });
    setView("end");
    await release();
    try {
      setParked((await api<{ parked: Parked[] }>("POST", `/sessions/${sid}/end`)).parked);
    } catch {
      enqueue({ method: "POST", path: `/sessions/${sid}/end`, body: {} });
    }
  }
  function settle(t: Parked, done: boolean) {
    if (done) enqueue({ method: "PATCH", path: `/parked/${t.id}`, body: { done: true } });
    setParked(parked().filter((x) => x !== t));
  }
  const [more, setMore] = createSignal<"idle" | "busy" | "failed">("idle");
  async function again() {
    setMore("busy");
    try {
      if (!(await start({ mode: "quick5" }))) finish();
    } catch {
      setMore("failed");
    }
  }
  function finish() {
    setRun(null);
    go("/");
  }

  const subjectOf = () => subject(card().subject_id);
  const ParkButton = (q: { shortcut?: boolean }) => (
    <button type="button" class="btn small quiet park" onClick={() => setParking(true)}>
      Noter une pensée
      <Show when={q.shortcut}>
        <span class="key"> · P</span>
      </Show>
    </button>
  );
  // Bilan : les pensées de cette session d'abord, les plus anciennes repliées
  const mine = () => parked().filter((t) => t.session_id === sid);
  const earlier = () => parked().filter((t) => t.session_id !== sid);
  const Thoughts = (q: { list: Parked[] }) => (
    <ul class="rows">
      <For each={q.list}>
        {(t) => (
          <li class="row">
            <span class="name">{t.text}</span>
            <button class="btn small" onClick={() => settle(t, true)}>
              Fait
            </button>
            <button class="btn small quiet" onClick={() => settle(t, false)}>
              Plus tard
            </button>
          </li>
        )}
      </For>
    </ul>
  );

  return (
    <div class="page session">
      <Show when={view() !== "end"}>
        <header class="bar">
          <div class="bar-start">
            <Show when={canCorrect()}>
              <button class="btn small" onClick={() => setI(i() - 1)}>
                Corriger la note précédente
              </button>
            </Show>
            <span class="pos" aria-label={`Carte ${i() + 1} sur ${cards.length}`}>
              {i() + 1} / {cards.length}
            </span>
            <Show when={view() === "card" && subjectOf()}>
              {(s) => (
                <span class="subject" style={hl(s().color)}>
                  <mark>{s().name}</mark>
                </span>
              )}
            </Show>
            <Show when={stalled()}>
              <span class="pending">
                <Icon name="cloudOff" />
                Enregistrement en attente
              </span>
            </Show>
          </div>
          <Show when={view() === "card"}>
            <button class="btn small" onClick={openPause}>
              Pause<span class="key"> · Échap</span>
            </button>
          </Show>
        </header>
        <Show when={timed}>
          <div
            class="timebar"
            role="progressbar"
            aria-label="Temps de session"
            aria-valuemin={0}
            aria-valuemax={timed}
            aria-valuenow={Math.min(timed, Math.floor(elapsed() / 60_000))}
            aria-valuetext={`${Math.min(timed, Math.floor(elapsed() / 60_000))} min sur ${timed}`}
          >
            <span style={{ width: `${Math.min(100, (elapsed() / (timed * 600)) | 0)}%` }} />
          </div>
        </Show>
      </Show>

      <Switch>
        <Match when={view() !== "end"}>
          <main class="sheet card" hidden={view() !== "card"} style={hl(subjectOf()?.color)}>
            <Show when={timed && i() === 0 && !cur().revealed}>
              <p class="muted small">{timed} min, puis une pause.</p>
            </Show>
            <h1 id="q" class="q" classList={{ revealed: cur().revealed }}>
              <Show when={card().type === "cloze"} fallback={plain(card().question)}>
                <Cloze text={card().question} fill={cur().revealed ? plain(card().answer) : undefined} />
              </Show>
            </h1>

            <Show
              when={cur().revealed}
              fallback={
                <Show
                  when={card().type === "mcq"}
                  fallback={
                    <form
                      class="answer-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        reveal();
                      }}
                    >
                      <label for="answer" class="label">
                        Ta réponse
                      </label>
                      <textarea
                        id="answer"
                        class="field"
                        rows={card().type === "explain" ? 6 : 3}
                        aria-describedby="q"
                        value={cur().draft}
                        onInput={(e) => setSt(i(), { draft: e.currentTarget.value, typed: true })}
                        onKeyDown={(e) => {
                          // Réponse longue : Entrée va à la ligne, Ctrl+Entrée révèle
                          const long = card().type === "explain";
                          if (e.key === "Enter" && !e.shiftKey && !e.isComposing && long === (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            reveal();
                          }
                        }}
                      />
                      <p class="hint key">
                        {card().type === "explain"
                          ? "Ctrl+Entrée pour voir la réponse"
                          : "Entrée pour voir la réponse · Maj+Entrée pour aller à la ligne"}
                      </p>
                      <button class="btn reveal">Afficher la réponse</button>
                      <ParkButton />
                    </form>
                  }
                >
                  <div class="choices" role="group" aria-labelledby="q" onKeyDown={(e) => arrows(e, "y")}>
                    <For each={card().choices}>
                      {(c, k) => (
                        <button class="btn choice" data-roving tabIndex={k() ? -1 : 0} onClick={() => pick(k())}>
                          <span class="key">{k() + 1} · </span>
                          {c}
                        </button>
                      )}
                    </For>
                  </div>
                  <ParkButton />
                </Show>
              }
            >
              <Show
                when={card().type === "mcq"}
                fallback={
                  <section class="part" aria-labelledby="mine">
                    <h2 id="mine" class="label">
                      Ta réponse
                    </h2>
                    <p class="mine">{cur().draft.trim() || "Pas de réponse écrite."}</p>
                  </section>
                }
              >
                <ul class="choices done">
                  <For each={card().choices}>
                    {(c, k) => (
                      <li classList={{ picked: cur().pick === k() }}>
                        {c === card().answer ? <mark class="draw">{c}</mark> : c}
                        <Show when={cur().pick === k() || c === card().answer}>
                          <span class="tag">
                            {cur().pick !== k() ? "Bonne réponse" : c === card().answer ? "Ton choix · bonne réponse" : "Ton choix"}
                          </span>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
              <Show when={card().type === "qa" || card().type === "explain"}>
                <section class="part" aria-labelledby="corr">
                  <h2 id="corr" class="label">
                    Réponse
                  </h2>
                  <p class="answer">
                    <Marked text={card().answer} draw />
                  </p>
                </section>
              </Show>
              <Show when={card().explanation}>
                <p class="explanation">{card().explanation}</p>
              </Show>

              <div class="grades-dock">
                <div
                  class="grades"
                  role="group"
                  aria-label="Note ta réponse"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") e.preventDefault(); // Entrée et Espace ne notent jamais
                    arrows(e, "x");
                  }}
                >
                  <For each={GRADES}>
                    {([n, label, text]) => (
                      <button
                        class="btn grade"
                        data-roving
                        tabIndex={n === 1 ? 0 : -1}
                        aria-describedby={`g${n}`}
                        onClick={() => grade(n)}
                        onFocus={() => setHelp(text)}
                        onMouseEnter={() => setHelp(text)}
                      >
                        <span class="key">{n} · </span>
                        {label}
                        <span id={`g${n}`} class="sr-only">
                          {text}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
                <div class="dock-foot">
                  <p class="muted small" aria-hidden="true">
                    {help()}
                  </p>
                  <ParkButton shortcut />
                </div>
              </div>
            </Show>
          </main>

          <Show when={view() === "pause"}>
            <main class="col pause">
              <h1>Pause</h1>
              <p class="timer" aria-hidden="true">
                {pauseLeft() ? clock(pauseLeft()) : "Pause terminée."}
              </p>
              <p class="muted">Lève-toi, bois un verre d'eau.</p>
              <div class="stack">
                <button ref={(el) => queueMicrotask(() => el.focus())} class="btn primary lg block" onClick={resume}>
                  Reprendre<span class="key"> · Entrée</span>
                </button>
                <button class="btn block" onClick={end}>
                  Arrêter là
                </button>
              </div>
              <form
                class="park-inline"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = e.currentTarget.elements.namedItem("thought") as HTMLInputElement;
                  keep(f.value);
                  f.value = "";
                }}
              >
                <label for="thought-pause" class="label">
                  Une pensée à garder pour plus tard
                </label>
                <div class="inline">
                  <input id="thought-pause" name="thought" class="field" placeholder="Note-la ici…" maxlength={2000} />
                  <button class="btn">Garder</button>
                </div>
              </form>
            </main>
          </Show>
        </Match>

        <Match when={view() === "end"}>
          <main class="col end">
            <h1 class="lead-title">
              {result().done
                ? `${result().done} ${one(result().done) ? "carte revue" : "cartes revues"} ${duration(result().ms)}.`
                : "Session arrêtée avant la première carte."}
            </h1>
            <Show when={waitingReviews()}>
              <p class="pending">
                <Icon name="cloudOff" />
                {one(waitingReviews())
                  ? "1 note partira dès que la connexion revient."
                  : `${waitingReviews()} notes partiront dès que la connexion revient.`}
              </p>
            </Show>
            <Show when={parked().length}>
              <section class="thoughts" aria-labelledby="thoughts-title">
                <h2 id="thoughts-title">Tes pensées notées</h2>
                <Show when={mine().length}>
                  <Thoughts list={mine()} />
                </Show>
                <Show when={earlier().length}>
                  <details class="earlier" open={!mine().length}>
                    <summary>
                      {one(earlier().length) ? "1 pensée gardée plus tôt" : `${earlier().length} pensées gardées plus tôt`}
                    </summary>
                    <Thoughts list={earlier()} />
                  </details>
                </Show>
              </section>
            </Show>
            <div class="stack">
              <button ref={focusFree} class="btn primary lg block" onClick={finish}>
                Terminer
              </button>
              <button class="btn block" onClick={again} disabled={more() === "busy"}>
                {more() === "busy" ? "Préparation…" : "5 cartes de plus"}
              </button>
              <Show when={more() === "failed"}>
                <p class="notice error" role="alert">
                  La session n'a pas pu démarrer.
                </p>
              </Show>
            </div>
          </main>
        </Match>
      </Switch>

      <Show when={parking()}>
        <Dialog label="Noter une pensée" onClose={() => setParking(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              keep((e.currentTarget.elements.namedItem("thought") as HTMLInputElement).value);
              setParking(false);
            }}
          >
            <label for="thought" class="label">
              Une pensée à garder pour plus tard
            </label>
            <input id="thought" name="thought" class="field" autofocus maxlength={2000} aria-describedby="thought-hint" />
            <p id="thought-hint" class="hint">
              Elle t'attendra à la fin de la session.
            </p>
            <div class="actions">
              <button type="button" class="btn" onClick={() => setParking(false)}>
                Annuler<span class="key"> · Échap</span>
              </button>
              <button class="btn primary">
                Garder<span class="key"> · Entrée</span>
              </button>
            </div>
          </form>
        </Dialog>
      </Show>
    </div>
  );
}
