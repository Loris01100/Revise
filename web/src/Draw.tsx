import { For, Show, createSignal } from "solid-js";
import { api } from "./api";
import { Confirm, Dialog, Sketch, type Shape } from "./ui";

const TOOLS: [Shape["t"], string][] = [
  ["pen", "Crayon"],
  ["line", "Trait"],
  ["arrow", "Flèche"],
  ["rect", "Rectangle"],
  ["ellipse", "Ellipse"],
  ["text", "Texte"],
];

/** Éditeur de dessin : enregistre les formes et rend l'id du dessin à insérer dans la carte.
 *  `shapes` : dessin existant à modifier ; il est enregistré comme un nouveau dessin. */
export function DrawDialog(p: { shapes?: Shape[]; onDone: (id: string) => void; onClose: () => void }) {
  const [tool, setTool] = createSignal<Shape["t"]>("pen");
  const [shapes, setShapes] = createSignal<Shape[]>(p.shapes ?? []);
  const [label, setLabel] = createSignal("");
  let labelField!: HTMLInputElement;
  const [draft, setDraft] = createSignal<Shape | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  const [leaving, setLeaving] = createSignal(false);
  const initial = shapes();
  const changed = () => shapes() !== initial;
  const close = () => (changed() ? setLeaving(true) : p.onClose());
  const undo = () => setShapes(shapes().slice(0, -1));

  // Coordonnées entières sur la grille 600 × 400, quelle que soit la taille affichée
  function point(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const at = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)));
    return [at(((e.clientX - r.left) * 600) / r.width, 600), at(((e.clientY - r.top) * 400) / r.height, 400)];
  }
  function move(e: PointerEvent) {
    const d = draft();
    if (!d) return;
    const [x, y] = point(e);
    if (d.t !== "pen") return setDraft({ ...d, p: [d.p[0], d.p[1], x, y] });
    const [lx, ly] = d.p.slice(-2);
    if (Math.hypot(x - lx, y - ly) >= 3 && d.p.length < 4000) setDraft({ ...d, p: [...d.p, x, y] });
  }
  function end() {
    const d = draft();
    setDraft(null);
    if (d && (d.t === "pen" || d.p[0] !== d.p[2] || d.p[1] !== d.p[3])) setShapes([...shapes(), d]);
  }

  async function save() {
    setBusy(true);
    setFailed(false);
    try {
      p.onDone((await api<{ id: string }>("POST", "/drawings", { shapes: shapes() })).id);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog label="Dessin" onClose={close} class="draw">
      <div
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "z") (e.preventDefault(), undo());
        }}
      >
        <h2>Dessin</h2>
        <Show when={failed()}>
          <p class="notice error" role="alert">
            Le dessin n'a pas été enregistré. Il est conservé ici.{" "}
            <button type="button" class="link" onClick={save}>
              Réessayer
            </button>
          </p>
        </Show>
        <div class="draw-tools">
          <div class="chips" role="group" aria-label="Outil">
            <For each={TOOLS}>
              {([t, label]) => (
                <button type="button" class="chip" aria-pressed={tool() === t} onClick={() => setTool(t)}>
                  {label}
                </button>
              )}
            </For>
          </div>
          <Show when={tool() === "text"}>
            <input
              ref={labelField}
              class="field draw-label"
              aria-label="Texte à placer"
              placeholder="Texte, puis clic sur le dessin"
              maxLength={100}
              value={label()}
              onInput={(e) => setLabel(e.currentTarget.value)}
            />
          </Show>
          <div class="chips">
            <button type="button" class="chip" disabled={!shapes().length} onClick={undo} aria-keyshortcuts="Control+Z">
              Annuler le dernier ajout
            </button>
            <button type="button" class="chip" disabled={!shapes().length} onClick={() => setShapes([])}>
              Tout effacer
            </button>
          </div>
        </div>
        <div
          class="canvas"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            const [x, y] = point(e);
            // Texte : posé d'un clic à l'endroit visé, écrit d'abord dans le champ de l'outil
            if (tool() === "text") {
              if (!label().trim()) return labelField.focus();
              setShapes([...shapes(), { t: "text", p: [x, y], s: label().trim() }]);
              return setLabel("");
            }
            setDraft({ t: tool(), p: [x, y, x, y] });
          }}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <Sketch shapes={draft() ? [...shapes(), draft()!] : shapes()} />
        </div>
        <div class="actions">
          <button type="button" class="btn quiet" onClick={close}>
            Annuler
          </button>
          <button type="button" class="btn primary" disabled={busy() || !shapes().length || !changed()} onClick={save}>
            {p.shapes ? "Enregistrer le dessin" : "Insérer le dessin"}
          </button>
        </div>
      </div>

      <Show when={leaving()}>
        <Confirm title="Abandonner ce dessin ?" yes="Abandonner" no="Continuer" onYes={p.onClose} onNo={() => setLeaving(false)} />
      </Show>
    </Dialog>
  );
}
