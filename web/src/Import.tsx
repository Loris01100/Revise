import { For, Show, createResource, createSignal, onCleanup, onMount } from "solid-js";
import { Expired, Failed, api, type CardType, type Subject } from "./api";
import { PRODUCE, buildPrompt, type Produce } from "./prompt";
import { Icon, Link, TYPES, announce, cardsLabel, go, message, one, plain, setMessage, setSettings, settings, short } from "./ui";

type Report = { cards: unknown[]; rejected: { index: number; question: string | null; reason: string }[] };
const DUPLICATE = "question déjà présente dans la matière";

/** Raison renvoyée par le cœur Rust → phrase qui dit quoi faire. */
function problem(e: unknown, text: string) {
  if (!(e instanceof Failed)) return "network";
  if (e.status === 413) return "Ce texte est trop long pour un seul import. Découpe le cours et importe-le en plusieurs fois.";
  const r: string = e.body?.reason ?? "";
  if (e.status !== 400 || !r) return "network";
  // Une réponse coupée avant tout « ] » ressemble à un texte sans tableau
  const cut = /EOF/.test(r) || (r.startsWith("aucun tableau") && /\[\s*\{/.test(text));
  if (cut) return "La réponse semble coupée. Demande à Claude de la renvoyer en entier, puis colle-la ici.";
  if (r.startsWith("aucun tableau")) return "Ce texte ne contient pas de cartes. Copie la réponse entière de Claude, le bloc JSON compris.";
  if (r.startsWith("le tableau ne contient")) return "La réponse ne contient aucune carte.";
  return "Claude a renvoyé un format illisible. Demande-lui de renvoyer uniquement le bloc JSON.";
}

// Le bandeau ne garde pas une annonce périmée, sauf si une autre l'a remplacée
const quiet = (text: string) => message() === text && setMessage("");
const headline = (r: Report) =>
  r.cards.length
    ? `${cardsLabel(r.cards.length)} à relire.`
    : r.rejected.some((x) => x.reason !== DUPLICATE)
      ? "Aucune carte n'a pu être importée."
      : "Aucune nouvelle carte : toutes étaient déjà dans la matière.";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Import(p: { id: string }) {
  const [subjects] = createResource(() => api<Subject[]>("GET", "/subjects"));
  // Liste indisponible : l'import marche sans le nom de la matière
  const subject = () => (subjects.error ? undefined : subjects()?.find((s) => s.id === p.id));
  const back = `/matieres/${p.id}`;

  // --- 1. Le prompt ---
  const count = () => settings().importCount;
  const types = () => settings().importTypes;
  const produce = () => settings().importProduce;
  const prompt = () => buildPrompt(count(), types(), produce());
  const [copied, setCopied] = createSignal(false);
  // Le prompt est parti chez Claude : au retour sur l'onglet, la suite est l'étape 3.
  // Gardé pour l'onglet : le téléphone recharge souvent la page pendant le passage chez Claude
  const SENT = `revise.sent.${p.id}`;
  const [sent, setSent] = createSignal(!!sessionStorage.getItem(SENT));
  const [copyFailed, setCopyFailed] = createSignal(false);
  const [typeError, setTypeError] = createSignal(false);
  const [shown, setShown] = createSignal(false);
  const [tuning, setTuning] = createSignal(false);
  const tune = () => {
    setTypeError(false);
    setTuning(!tuning());
    if (tuning()) queueMicrotask(() => document.getElementById("count")?.focus());
  };
  let details!: HTMLDetailsElement;
  let promptText!: HTMLTextAreaElement;
  // L'ordre des types suit celui de l'éditeur, pas celui des clics
  const toggle = (t: CardType, on: boolean) => {
    if (!on && types().length === 1) return setTypeError(true);
    setTypeError(false);
    setSettings({ importTypes: (Object.keys(TYPES) as CardType[]).filter((k) => (k === t ? on : types().includes(k))) });
  };
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt());
      setCopyFailed(false);
      setCopied(true);
      setSent(true);
      sessionStorage.setItem(SENT, "1");
      announce("Prompt copié.");
      setTimeout(() => (setCopied(false), quiet("Prompt copié.")), 3000);
    } catch {
      setCopyFailed(true);
      details.open = true;
      promptText.select();
    }
  }

  // --- 3. La réponse ---
  const [text, setText] = createSignal("");
  const [error, setError] = createSignal("");
  const [failed, setFailed] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [report, setReport] = createSignal<Report | null>(null);
  let paste!: HTMLTextAreaElement;
  let primary: HTMLElement | undefined;
  let step3!: HTMLLIElement;
  // Au doigt, le focus ouvrirait le clavier par-dessus ce qu'il faut lire : seulement à la souris
  const fine = () => matchMedia("(pointer: fine)").matches;
  const back3 = () => {
    if (document.hidden || !sent() || report() || text()) return;
    step3.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    if (fine()) paste.focus({ preventScroll: true });
  };
  document.addEventListener("visibilitychange", back3);
  onCleanup(() => document.removeEventListener("visibilitychange", back3));

  // Sous un champ de 12 lignes, le message tombe hors de l'écran du téléphone
  const fail = (m: string) => {
    setError(m);
    if (fine()) paste.focus();
    document.getElementById("paste-err")?.scrollIntoView({ block: "center" });
  };
  async function submit() {
    if (busy()) return;
    setFailed(false);
    setError("");
    if (!text().trim()) return fail("Colle la réponse de Claude.");
    setBusy(true);
    try {
      const r = await api<Report>("POST", "/imports", { subject_id: p.id, text: text() });
      setReport(r);
      sessionStorage.removeItem(SENT);
      announce(headline(r));
      queueMicrotask(() => primary?.focus());
    } catch (e) {
      if (e instanceof Expired) return;
      const m = problem(e, text());
      if (m === "network") setFailed(true);
      else fail(m);
    } finally {
      setBusy(false);
    }
  }
  const again = (keep: boolean) => {
    if (!keep) setText("");
    setError("");
    setReport(null);
    queueMicrotask(() => paste.focus());
  };

  // Les raisons nomment le champ fautif : elles se recopient telles quelles à Claude
  const [reasonsCopied, setReasonsCopied] = createSignal(false);
  const [reasonsFailed, setReasonsFailed] = createSignal(false);
  async function copyReasons(list: Report["rejected"]) {
    const lines = list.map((x) => `- Carte ${x.index + 1}${x.question ? ` (« ${short(plain(x.question))} »)` : ""} : ${x.reason}`);
    try {
      await navigator.clipboard.writeText(
        `Ces cartes ont été écartées à l'import :\n${lines.join("\n")}\n\nCorrige-les et renvoie uniquement le bloc JSON des cartes corrigées.`,
      );
      setReasonsFailed(false);
      setReasonsCopied(true);
      announce("Raisons copiées.");
      setTimeout(() => (setReasonsCopied(false), quiet("Raisons copiées.")), 3000);
    } catch {
      setReasonsFailed(true);
    }
  }

  // Échap ramène à la matière, sauf dans un champ ou avec une réponse collée qui serait perdue
  onMount(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      if ((e.target as HTMLElement).matches("input, textarea") || (text() && !report())) return;
      go(back);
    };
    addEventListener("keydown", key);
    onCleanup(() => removeEventListener("keydown", key));
  });

  return (
    <div class="page import">
      <header class="top">
        <div class="top-start">
          <Link href={back} class="icon-btn" aria-keyshortcuts="Escape">
            <Icon name="back" />
            <span class="sr-only">Retour à la matière</span>
          </Link>
          <h1 class="title">
            Importer des cartes
            <Show when={subject()}>{(s) => <span class="wide"> · {s().name}</span>}</Show>
          </h1>
        </div>
      </header>

      <main class="col wide">
        <Show
          when={report()}
          fallback={
            <ol class="steps">
              <li classList={{ done: sent() }}>
                <h2>
                  Le prompt
                  <Show when={sent()}>
                    <span class="muted"> · copié</span>
                  </Show>
                </h2>
                <button class="btn" classList={{ primary: !sent() && !text() }} onClick={copy} aria-describedby="copy-err">
                  {copied() ? "Prompt copié" : sent() ? "Copier à nouveau" : "Copier le prompt"}
                </button>
                <p id="copy-err" class="hint">
                  {copyFailed() ? "Copie le texte sélectionné." : ""}
                </p>
                {/* Les réglages par défaut conviennent presque toujours : repliés en une ligne qui les dit */}
                <p class="prompt-sum muted">
                  {cardsLabel(count())} · {types().length} {one(types().length) ? "type" : "types"} ·{" "}
                  <button class="link" aria-expanded={tuning()} aria-controls="prompt-opts" onClick={tune}>
                    {tuning() ? "Fermer" : "Changer"}
                  </button>
                </p>
                <Show when={tuning()}>
                  <div id="prompt-opts" class="prompt-opts">
                    <div>
                      <label for="count" class="label">
                        Nombre de cartes
                      </label>
                      <input
                        id="count"
                        class="field count"
                        type="number"
                        min={5}
                        max={60}
                        value={count()}
                        onChange={(e) => {
                          const n = Math.round(+e.currentTarget.value) || 20;
                          setSettings({ importCount: Math.min(60, Math.max(5, n)) });
                          e.currentTarget.value = String(count());
                        }}
                      />
                    </div>
                    <fieldset aria-describedby="types-err">
                      <legend class="label">Types</legend>
                      <div class="types">
                        <For each={Object.entries(TYPES)}>
                          {([k, label]) => (
                            <label class="check">
                              <input
                                type="checkbox"
                                name="types"
                                value={k}
                                checked={types().includes(k as CardType)}
                                onChange={(e) => {
                                  toggle(k as CardType, e.currentTarget.checked);
                                  e.currentTarget.checked = types().includes(k as CardType);
                                }}
                              />
                              {label}
                            </label>
                          )}
                        </For>
                      </div>
                      <p id="types-err" class="error-text">
                        {typeError() ? "Garde au moins un type." : ""}
                      </p>
                    </fieldset>
                    <fieldset aria-describedby="produce-hint">
                      <legend class="label">Exercices</legend>
                      <div class="types">
                        <For each={Object.entries(PRODUCE)}>
                          {([k, label]) => (
                            <label class="check">
                              <input
                                type="checkbox"
                                name="produce"
                                value={k}
                                checked={produce().includes(k as Produce)}
                                onChange={(e) => {
                                  const on = e.currentTarget.checked;
                                  setSettings({ importProduce: (Object.keys(PRODUCE) as Produce[]).filter((x) => (x === k ? on : produce().includes(x))) });
                                }}
                              />
                              {label}
                            </label>
                          )}
                        </For>
                      </div>
                      <p id="produce-hint" class="hint">
                        Seulement si le cours en contient.
                      </p>
                    </fieldset>
                  </div>
                </Show>
                <details ref={details} class="prompt" onToggle={(e) => setShown(e.currentTarget.open)}>
                  <summary>{shown() ? "Masquer le prompt" : "Voir le prompt"}</summary>
                  <textarea ref={promptText} id="prompt-text" class="field" readonly rows={12} value={prompt()} aria-label="Prompt" />
                </details>
              </li>
              <li>
                <h2>Chez Claude</h2>
                <p class="muted">Colle le prompt dans Claude avec ton cours en pièce jointe, puis copie sa réponse.</p>
              </li>
              <li ref={step3}>
                <h2>
                  <label for="paste">La réponse</label>
                </h2>
                <Show when={failed()}>
                  <p class="notice error" role="alert">
                    L'import n'a pas abouti. Le texte collé est conservé.{" "}
                    <button class="link" onClick={submit}>
                      Réessayer
                    </button>
                  </p>
                </Show>
                <textarea
                  ref={paste}
                  id="paste"
                  class="field paste"
                  rows={10}
                  placeholder="Colle ici la réponse entière"
                  spellcheck={false}
                  value={text()}
                  onInput={(e) => (setText(e.currentTarget.value), setError(""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  aria-invalid={!!error()}
                  aria-describedby="paste-err"
                />
                <p id="paste-err" class="error-text" role="alert">
                  {error()}
                </p>
                <button
                  class="btn"
                  classList={{ primary: sent() || !!text() }}
                  onClick={submit}
                  disabled={busy()}
                  aria-keyshortcuts="Control+Enter"
                >
                  {busy() ? "Import…" : "Importer les cartes"}
                  <span class="key" aria-hidden="true">
                    Ctrl+Entrée
                  </span>
                </button>
              </li>
            </ol>
          }
        >
          {(r) => {
            const n = r().cards.length;
            const dup = r().rejected.filter((x) => x.reason === DUPLICATE).length;
            const others = r().rejected.filter((x) => x.reason !== DUPLICATE);
            return (
              <section class="report" aria-labelledby="report-title">
                <Show
                  when={n > 0}
                  fallback={
                    <>
                      <h2 id="report-title" class="lead-title">
                        {headline(r())}
                      </h2>
                      <Show
                        when={others.length}
                        fallback={
                          <button ref={(el) => (primary = el)} class="btn primary lg" onClick={() => go(back)}>
                            Retour à la matière
                          </button>
                        }
                      >
                        <button ref={(el) => (primary = el)} class="btn primary lg" onClick={() => again(true)}>
                          Coller une autre réponse
                        </button>
                      </Show>
                    </>
                  }
                >
                  <h2 id="report-title" class="lead-title">
                    {headline(r())}
                  </h2>
                  <p class="muted">{one(n) ? "Elle entrera en révision une fois acceptée." : "Elles entreront en révision une fois acceptées."}</p>
                  <button ref={(el) => (primary = el)} class="btn primary lg block" onClick={() => go(`/matieres/${p.id}/relecture`)}>
                    {one(n) ? "Relire la carte" : "Relire les cartes"}
                  </button>
                </Show>

                {/* Un doublon n'est pas une erreur : il se dit à part, hors de la liste des cartes écartées */}
                <Show when={others.length || (dup && n > 0)}>
                  <div class="rejected">
                    <Show when={dup && n > 0}>
                      <p class="muted">{one(dup) ? "1 carte était déjà dans la matière." : `${dup} cartes étaient déjà dans la matière.`}</p>
                    </Show>
                    <Show when={others.length}>
                      <details open={n === 0}>
                        <summary>
                          {others.length} {one(others.length) ? "carte écartée" : "cartes écartées"}
                        </summary>
                        <ul>
                          <For each={others}>
                            {(x) => (
                              <li>
                                <strong>{x.question ? short(plain(x.question)) : `Carte ${x.index + 1}`}</strong>
                                <span class="muted"> — {cap(x.reason)}</span>
                              </li>
                            )}
                          </For>
                        </ul>
                        <button class="btn small" onClick={() => copyReasons(others)} aria-describedby="reasons-err">
                          {reasonsCopied() ? "Raisons copiées" : "Copier ces raisons pour Claude"}
                        </button>
                        <p id="reasons-err" class="hint">
                          {reasonsFailed() ? "La copie n'a pas marché. Sélectionne les lignes ci-dessus." : ""}
                        </p>
                      </details>
                    </Show>
                  </div>
                </Show>

                <Show when={n > 0}>
                  <button class="btn" onClick={() => again(false)}>
                    Importer un autre lot
                  </button>
                </Show>
              </section>
            );
          }}
        </Show>
      </main>
    </div>
  );
}
