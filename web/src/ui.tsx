import { For, createEffect, createRoot, createSignal, onCleanup, onMount, type JSX } from "solid-js";
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
export type Run = { id: string; cards: Card[]; mode: Mode };
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

/** Texte sans les marques `==…==`. */
export const plain = (s: string) => s.replace(/==(.+?)==/g, "$1");

/** Texte dont les passages `==…==` reçoivent le trait de surligneur. */
export function Marked(p: { text: string; draw?: boolean }) {
  return (
    <For each={p.text.split(/==(.+?)==/)}>
      {(s, i) => (i() % 2 ? <mark classList={{ draw: p.draw }}>{s}</mark> : s)}
    </For>
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
