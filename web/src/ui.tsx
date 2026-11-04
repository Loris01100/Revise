import { For, Show, createEffect, createResource, createRoot, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { api, type Card, type CardType, type Color } from "./api";

// --- Navigation : quelques chemins, sans routeur ---

export const [path, setPath] = createSignal(location.pathname);
addEventListener("popstate", () => setPath(location.pathname));
export function go(to: string) {
  if (to !== location.pathname) history.pushState(null, "", to);
  setPath(to);
  scrollTo(0, 0);
  // Le lien cliqué a disparu avec l'ancien écran : le focus repart du contenu, pas du haut du document
  queueMicrotask(() => {
    const main = document.querySelector<HTMLElement>("main:not([hidden])");
    if (!main || (document.activeElement !== document.body && document.activeElement?.checkVisibility())) return;
    main.tabIndex = -1;
    main.focus({ preventScroll: true });
  });
}
export function Link(p: { href: string; class?: string; children: JSX.Element; "aria-current"?: "page" }) {
  return (
    <a
      href={p.href}
      class={p.class}
      aria-current={p["aria-current"]}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        go(p.href);
      }}
    >
      {p.children}
    </a>
  );
}

// --- Réglages, gardés sur l'appareil ---

export type Settings = {
  minutes: number;
  autoReveal: boolean;
  delay: number;
  theme: "auto" | "light" | "dark";
  importCount: number;
  importTypes: CardType[];
};
const SKEY = "revise.settings";
const [settings, setSettingsSignal] = createSignal<Settings>({
  minutes: 15,
  autoReveal: false,
  delay: 60,
  theme: "auto",
  importCount: 20,
  importTypes: ["qa", "cloze", "mcq", "explain"],
  ...JSON.parse(localStorage.getItem(SKEY) ?? "{}"),
});
export { settings };
export function setSettings(patch: Partial<Settings>) {
  const next = { ...settings(), ...patch };
  localStorage.setItem(SKEY, JSON.stringify(next));
  setSettingsSignal(next);
}
createRoot(() =>
  createEffect(() => {
    const t = settings().theme;
    if (t === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }),
);

// --- Session en cours ---

export type Mode = { mode: "quick5" } | { mode: "timed"; planned_min: number } | { mode: "subject"; subject_id: string };
/** `replay` : entraînement sur des cartes déjà notées, aucune note envoyée (FSRS reste juste). */
export type Run = { id: string; cards: Card[]; mode: Mode; replay?: boolean };
export const [run, setRun] = createSignal<Run | null>(null);

/** Ouvre une session ; `false` quand il n'y a rien à réviser. */
export async function start(mode: Mode): Promise<boolean> {
  const r = await api<{ id: string | null; cards: Card[] }>("POST", "/sessions", mode);
  if (!r.id) return false;
  setRun({ id: r.id, cards: r.cards, mode });
  return true;
}

// --- Formats ---

export const one = (n: number) => new Intl.PluralRules("fr").select(n) === "one";
export const cardsLabel = (n: number) => `${n} ${one(n) ? "carte" : "cartes"}`;

export function duration(ms: number) {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "en moins d'une minute";
  if (min < 60) return `en ${min} min`;
  return `en ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

export function nextCards(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(new Date())) / 86_400_000);
  if (diff <= 0) return "Prochaines cartes dans la journée.";
  if (diff === 1) return "Prochaines cartes demain.";
  return `Prochaines cartes le ${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.`;
}

export const TYPES: Record<string, string> = {
  qa: "Question / réponse",
  cloze: "Texte à trous",
  mcq: "QCM",
  explain: "Réponse longue",
};

export const COLORS: [Color, string][] = [
  ["yellow", "Jaune"],
  ["pink", "Rose"],
  ["green", "Vert"],
  ["blue", "Bleu"],
  ["orange", "Orange"],
];
export const hl = (c: Color | null | undefined) => `--hl: var(--hl-${c ?? "yellow"})`;

const DRAWING = /!\[dessin\]\([0-9a-f-]{36}\)/g;
/** Texte sans les marques `==…==`, dessins remplacés par « (dessin) ». */
export const plain = (s: string) => s.replace(/==(.+?)==/g, "$1").replace(DRAWING, "(dessin)");

/** Texte dont les passages `==…==` reçoivent le trait de surligneur. */
export function Marked(p: { text: string; draw?: boolean }) {
  return (
    <For each={p.text.split(/==(.+?)==/)}>
      {(s, i) => (i() % 2 ? <mark classList={{ draw: p.draw }}>{s}</mark> : s)}
    </For>
  );
}

/** Texte de carte : ```lang … ``` en bloc de code, ```mermaid … ``` en schéma, `…` en code, ![dessin](id) en dessin ;
 *  le reste passe par Marked.
 *  Tout est en <code>/<span> pour rester valide dans le <h1> de la question et le <p> de la réponse. */
export function Rich(p: { text: string; draw?: boolean }) {
  return (
    <>
      {p.text.split(/(```[^\n]*\n[\s\S]*?```|`[^`\n]+`|!\[dessin\]\([0-9a-f-]{36}\))/).map((s, i) => {
        if (i % 2 === 0) return <Marked text={s} draw={p.draw} />;
        if (s.startsWith("![")) return <Drawing id={s.slice(10, -1)} />;
        const m = s.match(/^```([^\n]*)\n([\s\S]*?)\n?```$/);
        if (!m) return <code>{s.slice(1, -1)}</code>;
        const lang = m[1].trim();
        return lang === "mermaid" ? <Diagram src={m[2]} /> : <Code lang={lang} src={m[2]} />;
      })}
    </>
  );
}

/** Bloc de code coloré par Shiki (moteur et thèmes de VS Code), chargé au premier bloc ; texte brut si le langage est inconnu. */
function Code(p: { lang: string; src: string }) {
  const [html, setHtml] = createSignal<string>();
  onMount(async () => {
    const { codeToHtml, bundledLanguages } = await import("shiki");
    if (!(p.lang in bundledLanguages)) return;
    // light-dark() suit color-scheme, donc le thème de l'app sans CSS en plus
    const opts = { lang: p.lang, themes: { light: "github-light", dark: "github-dark" }, defaultColor: "light-dark()" } as const;
    // Échappé par Shiki ; structure inline (<span>, <br>) pour rester valide dans <h1> et <p>
    setHtml(await codeToHtml(p.src, { ...opts, structure: "inline" }));
  });
  return (
    <Show when={html()} fallback={<code class="block">{p.src}</code>}>
      <code class="block" innerHTML={html()} />
    </Show>
  );
}

let diagrams = 0;
/** Schéma Mermaid, chargé à la première carte qui en contient ; source affichée si la syntaxe est fausse. */
function Diagram(p: { src: string }) {
  const [svg, setSvg] = createSignal<string | null>();
  onMount(async () => {
    const { default: m } = await import("mermaid");
    const t = document.documentElement.dataset.theme;
    const dark = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    m.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "neutral" });
    if (!(await m.parse(p.src, { suppressErrors: true }))) return setSvg(null);
    setSvg((await m.render(`diagram-${++diagrams}`, p.src)).svg);
  });
  return (
    <Show when={svg() !== null} fallback={<code class="block" data-invalid>{p.src}</code>}>
      {/* SVG nettoyé par Mermaid (securityLevel strict) */}
      <span class="diagram" innerHTML={svg() ?? ""} />
    </Show>
  );
}

/** Forme d'un dessin : `p` est une suite x, y sur une grille 600 × 400 (deux points, sauf le crayon). */
export type Shape = { t: "pen" | "line" | "arrow" | "rect" | "ellipse"; p: number[] };

/** Dessin reconstruit à partir des seules coordonnées, jamais d'un SVG stocké. */
export function Sketch(p: { shapes: Shape[]; children?: JSX.Element }) {
  return (
    <svg class="sketch" viewBox="0 0 600 400" role="img" aria-label="Dessin">
      <For each={p.shapes}>
        {(s) => {
          const [x1, y1, x2, y2] = s.p;
          if (s.t === "pen") return <polyline points={s.p.join(" ")} />;
          if (s.t === "rect") return <rect x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} />;
          if (s.t === "ellipse")
            return <ellipse cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={Math.abs(x2 - x1) / 2} ry={Math.abs(y2 - y1) / 2} />;
          if (s.t === "line") return <line x1={x1} y1={y1} x2={x2} y2={y2} />;
          const a = Math.atan2(y2 - y1, x2 - x1);
          const head = (d: number) => `${x2 - 16 * Math.cos(a + d)},${y2 - 16 * Math.sin(a + d)}`;
          return <polyline points={`${x1},${y1} ${x2},${y2} ${head(0.45)} ${x2},${y2} ${head(-0.45)}`} />;
        }}
      </For>
      {p.children}
    </svg>
  );
}

// Un dessin ne change jamais : chargé une fois par page
const drawings = new Map<string, Promise<Shape[]>>();
function Drawing(p: { id: string }) {
  const [shapes] = createResource(
    () => p.id,
    (id) => {
      if (!drawings.has(id)) drawings.set(id, api<{ shapes: Shape[] }>("GET", `/drawings/${id}`).then((r) => r.shapes));
      return drawings.get(id)!.catch((e) => (drawings.delete(id), Promise.reject(e)));
    },
  );
  return (
    <span class="drawing">
      <Show when={!shapes.error} fallback={<span class="muted">Dessin indisponible</span>}>
        <Show when={shapes()}>{(s) => <Sketch shapes={s()} />}</Show>
      </Show>
    </span>
  );
}

/** Aperçu rendu d'un champ de carte qui contient du code ou un schéma, mis à jour après la frappe. */
export function Preview(p: { text: string }) {
  const [text, setText] = createSignal(p.text);
  createEffect(() => {
    const t = setTimeout(setText, 400, p.text);
    onCleanup(() => clearTimeout(t));
  });
  return (
    <Show when={/`|!\[dessin\]\(/.test(text())}>
      <div class="preview" aria-label="Aperçu" role="group">
        <Rich text={text()} />
      </div>
    </Show>
  );
}

/** Question de texte à trous : `___` devient un blanc à remplir. */
export function Cloze(p: { text: string; fill?: string }) {
  return (
    <For each={plain(p.text).split(/_{3,}/)}>
      {(s, i) => (
        <>
          {i() > 0 && (
            <span class="blank">
              {p.fill ? <mark class="draw">{p.fill}</mark> : <span class="sr-only">blanc</span>}
            </span>
          )}
          {s}
        </>
      )}
    </For>
  );
}

// --- Icônes (tracé 2 px, 24 × 24) ---

const ICONS = {
  back: "M19 12H5M12 19l-7-7 7-7",
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
  cloudOff:
    "M2 2l20 20M5.8 5.8A7 7 0 0 0 9 19h8.5c.9 0 1.7-.2 2.4-.6M21.5 15.9A4.5 4.5 0 0 0 17.5 10h-1.8A7 7 0 0 0 10 5.1",
};
export function Icon(p: { name: keyof typeof ICONS }) {
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[p.name]} />
    </svg>
  );
}

/** `ref` : donne le focus à l'élément dès son rendu, sauf si le focus est déjà ailleurs. */
export const focusFree = (el: HTMLElement) =>
  queueMicrotask(() => (document.activeElement === document.body || !document.activeElement) && el.focus());

// --- Annonces au lecteur d'écran ---

/** Tronque à 70 caractères, pour nommer une carte par sa question. */
export const short = (s: string) => (s.length > 70 ? `${s.slice(0, 70).trimEnd()}…` : s);

export const [message, setMessage] = createSignal("");
export function announce(text: string) {
  setMessage("");
  queueMicrotask(() => setMessage(text));
}

// --- Fenêtre modale native : focus piégé, Échap ferme, focus rendu à l'ouverture ---

export function Dialog(p: { label: string; onClose: () => void; class?: string; children: JSX.Element }) {
  let el!: HTMLDialogElement;
  const opener = document.activeElement as HTMLElement | null;
  onMount(() => el.showModal());
  onCleanup(() => {
    el.close();
    queueMicrotask(() => opener?.isConnected && opener.focus());
  });
  return (
    <dialog
      ref={el}
      class={p.class}
      aria-label={p.label}
      onCancel={(e) => {
        e.preventDefault();
        p.onClose();
      }}
    >
      {p.children}
    </dialog>
  );
}

export function Confirm(p: { title: string; text?: string; yes: string; no: string; onYes: () => void; onNo: () => void }) {
  return (
    <Dialog label={p.title} onClose={p.onNo} class="confirm">
      <h2>{p.title}</h2>
      {p.text && <p class="muted">{p.text}</p>}
      <div class="actions">
        <button class="btn" onClick={p.onNo} autofocus>
          {p.no}
        </button>
        <button class="btn primary" onClick={p.onYes}>
          {p.yes}
        </button>
      </div>
    </Dialog>
  );
}

/** Flèches haut/bas ou gauche/droite entre les éléments d'un groupe à un seul arrêt de tabulation. */
export function arrows(e: KeyboardEvent, axis: "x" | "y") {
  const k = axis === "x" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
  const d = k.indexOf(e.key);
  if (d < 0) return;
  const items = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("[data-roving]")];
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next = items[(i + (d ? 1 : -1) + items.length) % items.length];
  e.preventDefault();
  items.forEach((x) => (x.tabIndex = x === next ? 0 : -1));
  next?.focus();
}
