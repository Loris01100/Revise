import { For, Match, Show, Switch, createResource, createSignal, onCleanup } from "solid-js";
import { Expired, Offline, api, cached, kept, type Subject } from "./api";
import { Link, focusFree, go, hl, nextCards, prepare, settings, start, type Mode } from "./ui";

export default function Home() {
  const [offline, setOffline] = createSignal(false);
  const [subjects, { refetch }] = createResource(async () => {
    try {
      const r = await api<Subject[]>("GET", "/subjects");
      setOffline(false);
      // En ligne : la file gardée pour réviser sans réseau est remise à jour
      if (!cached()) prepare().catch(() => {});
      return r;
    } catch (e) {
      setOffline(e instanceof Offline);
      throw e;
    }
  });
  // Sans réseau, ou matières lues dans le cache de l'appareil
  const away = () => offline() || cached();
  const keptDue = () => kept().filter((c) => c.due <= new Date().toISOString()).length;
  // Hors connexion : nouvel essai toutes les 10 s, le bouton se réactive seul
  const retry = setInterval(() => away() && refetch(), 10_000);
  const online = () => refetch();
  addEventListener("online", online);
  onCleanup(() => {
    clearInterval(retry);
    removeEventListener("online", online);
  });

  const list = () => (subjects.error ? [] : (subjects.latest ?? []));
  const loaded = () => subjects.latest !== undefined;
  const total = () => list().reduce((n, s) => n + s.cards, 0);
  const due = () => list().reduce((n, s) => n + s.due, 0);
  const next = () => list().map((s) => s.next_due).filter((d): d is string => !!d).sort()[0] ?? null;
  const n = () => (away() ? Math.min(5, keptDue()) : loaded() ? Math.min(5, due()) : 5);

  const [launching, setLaunching] = createSignal<Mode["mode"] | null>(null);
  const [failed, setFailed] = createSignal(false);
  async function launch(mode: Mode) {
    setLaunching(mode.mode);
    setFailed(false);
    try {
      if (!(await start(mode))) void refetch();
    } catch (e) {
      if (e instanceof Offline) setOffline(true);
      else if (!(e instanceof Expired)) setFailed(true);
    }
    setLaunching(null);
  }
  const timed = () => launch({ mode: "timed", planned_min: settings().minutes });

  return (
    <div class="page">
      <header class="top">
        <span class="wordmark">Revise</span>
        <nav aria-label="Principal" class="nav">
          <Link href="/matieres">Matières</Link>
          <Link href="/statistiques">
            <span class="wide-only">Statistiques</span>
            <span class="narrow-only">Stats</span>
          </Link>
          <Link href="/reglages">Réglages</Link>
        </nav>
      </header>

      <main class="col home">
        <Switch>
          <Match when={loaded() && list().length === 0}>
            <h1 class="lead-title">Commence par une matière.</h1>
            <p class="muted">Crée-la, ajoute quelques cartes, et ta première session sera prête.</p>
            <button ref={focusFree} class="btn primary lg block" onClick={() => go("/matieres?nouvelle")}>
              Créer ma première matière
            </button>
          </Match>
          <Match when={loaded() && total() === 0}>
            <h1 class="lead-title">Pas encore de carte.</h1>
            <p class="muted">Ajoute quelques questions à une matière, et ta première session sera prête.</p>
            <button ref={focusFree} class="btn primary lg block" onClick={() => go(`/matieres/${list()[0].id}`)}>
              Ajouter des cartes
            </button>
          </Match>
          <Match when={loaded() && due() === 0}>
            <h1 class="lead-title">Tout est à jour.</h1>
            <p class="muted">{nextCards(next())}</p>
            <button ref={focusFree} class="btn primary lg block" onClick={() => go("/matieres")}>
              Ajouter des cartes
            </button>
            <div class="secondary">
              <button class="btn" onClick={timed} disabled={!!launching() || (away() && !kept().length)}>
                {launching() === "timed" ? "Préparation…" : `Session de ${settings().minutes} min`}
              </button>
            </div>
          </Match>
          <Match when={true}>
            <h1 class="sr-only">Accueil</h1>
            <button
              ref={focusFree}
              class="btn primary lg block"
              onClick={() => launch({ mode: "quick5" })}
              disabled={!!launching() || (away() && !keptDue())}
              aria-describedby="start-key"
            >
              <Show when={launching() === "quick5"} fallback={n() === 1 ? "Réviser 1 carte" : `Réviser ${n()} cartes`}>
                <span class="spinner" aria-hidden="true" />
                Préparation…
              </Show>
            </button>
            <p id="start-key" class="key under">Entrée</p>
            <div class="secondary">
              <button class="btn" onClick={timed} disabled={!!launching() || (away() && !kept().length)}>
                {launching() === "timed" ? "Préparation…" : `Session de ${settings().minutes} min`}
              </button>
              <Link href="/reglages" class="link">
                Changer la durée
              </Link>
            </div>
          </Match>
        </Switch>

        <Show when={away()}>
          <p class="notice" role="status">
            {kept().length
              ? "Pas de connexion. Tu révises les cartes gardées sur cet appareil, tes notes partiront dès qu'elle revient."
              : "Pas de connexion. Tes cartes reviennent dès qu'elle revient."}
          </p>
        </Show>
        <Show when={failed()}>
          <p class="notice error" role="alert">
            La session n'a pas pu démarrer.{" "}
            <button class="link" onClick={() => launch({ mode: "quick5" })}>
              Réessayer
            </button>
          </p>
        </Show>

        <Show when={list().length > 0}>
          <section class="subjects" aria-labelledby="subjects-title">
            <h2 id="subjects-title" class="label">
              Matières
            </h2>
            <ul class="rows">
              <For each={list()}>
                {(s) => (
                  <li>
                    <Link href={`/matieres/${s.id}`} class="row">
                    <span class="name" title={s.name} style={hl(s.color)}>
                        <mark>{s.name}</mark>
                      </span>
                      <Show when={s.due > 0}>
                        <span class="badge">
                          Cartes du jour
                        </span>
                      </Show>
                    </Link>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>
      </main>
    </div>
  );
}
