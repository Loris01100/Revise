import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./style.css";
import { Match, Show, Switch, createEffect, on } from "solid-js";
import { render } from "solid-js/web";
import { expired, stalled } from "./api";
import Home from "./Home";
import Import from "./Import";
import Review from "./Review";
import Session from "./Session";
import Settings from "./Settings";
import Subjects from "./Subjects";
import { announce, message, path, run } from "./ui";

function App() {
  // Une seule annonce à l'entrée et à la sortie de l'attente
  createEffect(on(stalled, (s, was) => (s ? announce("Enregistrement en attente.") : was && announce("Tout est enregistré.")), { defer: true }));
  const subject = () => path().match(/^\/matieres\/([^/]+)/)?.[1];
  const sub = () => path().match(/^\/matieres\/[^/]+\/(import|relecture)$/)?.[1];
  createEffect(() => {
    const p = path();
    const name = run() ? "Session" : sub() === "import" ? "Import" : sub() ? "Relecture" : p.startsWith("/matieres") ? "Matières" : p === "/reglages" ? "Réglages" : "";
    document.title = name ? `${name} · Revise` : "Revise";
  });

  return (
    <>
      <Show when={expired()}>
        <div class="alert" role="alert">
          Ta connexion a expiré. Tes notes sont gardées sur cet appareil.
          <button class="btn small" onClick={() => location.assign("/")}>
            Se reconnecter
          </button>
        </div>
      </Show>
      <Show
        when={run()}
        keyed
        fallback={
          <Switch fallback={<Home />}>
            <Match when={sub() === "import"}>
              <Import id={subject()!} />
            </Match>
            <Match when={sub() === "relecture"}>
              <Review id={subject()!} />
            </Match>
            <Match when={path().startsWith("/matieres")}>
              <Subjects id={subject()} />
            </Match>
            <Match when={path() === "/reglages"}>
              <Settings />
            </Match>
          </Switch>
        }
      >
        {(r) => <Session run={r} />}
      </Show>
      <div class="sr-only" aria-live="polite">
        {message()}
      </div>
    </>
  );
}

render(() => <App />, document.getElementById("root")!);
