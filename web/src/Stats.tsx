import { For, Match, Show, Switch, createResource } from "solid-js";
import { Offline, api, cached } from "./api";
import { Icon, Link, cardsLabel, one } from "./ui";

// Indicateurs et refus : docs/design/metrics-stats.md
type Stats = {
  total: number;
  mastered: number;
  upcoming: { day: string; n: number }[];
  weeks: { week: string; ms: number; n: number }[];
  days: number;
  kept: { n: number; ok: number };
};

const local = (d: string) => new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (k: number) => {
  const d = new Date();
  d.setDate(d.getDate() + k);
  return iso(d);
};
const time = (ms: number) => {
  const min = Math.max(1, Math.round(ms / 60_000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
};

function Bars(p: { rows: { label: string; value: string; n: number }[] }) {
  const max = () => Math.max(1, ...p.rows.map((r) => r.n));
  return (
    <ul class="bars">
      <For each={p.rows}>
        {(r) => (
          <li>
            <span>{r.label}</span>
            <span class="track" aria-hidden="true">
              <span style={{ width: `${(r.n / max()) * 100}%` }} />
            </span>
            <span class="value">{r.value}</span>
          </li>
        )}
      </For>
    </ul>
  );
}

export default function StatsPage() {
  const [stats, { refetch }] = createResource(() => api<Stats>("GET", `/stats?tz=${-new Date().getTimezoneOffset()}`));

  // Les 7 jours sont tous montrés : un jour sans carte prévue n'est pas un manque
  const upcoming = () => {
    const by = new Map(stats()!.upcoming.map((u) => [u.day, u.n]));
    return Array.from({ length: 7 }, (_, k) => {
      const day = plusDays(k + 1);
      const n = by.get(day) ?? 0;
      const label = k === 0 ? "Demain" : local(day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
      return { label: label[0].toUpperCase() + label.slice(1), value: n ? cardsLabel(n) : "Rien", n };
    });
  };
  // Seules les semaines où l'on a révisé apparaissent : pas de case vide
  const weeks = () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return stats()!
      .weeks.map((w) => ({
        label: w.week === iso(monday) ? "Cette semaine" : `Semaine du ${local(w.week).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`,
        value: time(w.ms),
        n: w.ms,
      }))
      .reverse();
  };
  const kept = () => stats()!.kept;

  return (
    <div class="page">
      <header class="top">
        <div class="top-start">
          <Link href="/" class="icon-btn">
            <Icon name="back" />
            <span class="sr-only">Retour à l'accueil</span>
          </Link>
          <h1 class="title">Statistiques</h1>
        </div>
      </header>

      <main class="col stats">
        <Switch>
          <Match when={stats.error}>
            <p class="notice error" role="alert">
              {stats.error instanceof Offline ? "Pas de connexion. " : "Les statistiques n'ont pas pu être chargées. "}
              <button class="link" onClick={refetch}>
                Réessayer
              </button>
            </p>
          </Match>
          <Match when={stats.loading}>
            <p class="muted" role="status">
              Chargement…
            </p>
          </Match>
          <Match when={stats()!.total === 0 && !stats()!.weeks.length}>
            <p class="lead-title">Rien à montrer pour l'instant.</p>
            <p class="muted">Tes statistiques apparaissent après ta première session.</p>
          </Match>
          <Match when={stats()}>
            {(s) => (
              <>
                <Show when={cached()}>
                  <p class="notice stale" role="status">
                    Pas de connexion : chiffres de ta dernière visite en ligne.
                  </p>
                </Show>
                <section aria-labelledby="st-known">
                  <h2 id="st-known">Acquis</h2>
                  <p class="figure">
                    <strong>{s().mastered}</strong> {one(s().mastered) ? "carte maîtrisée" : "cartes maîtrisées"} sur {s().total}
                  </p>
                  <p class="muted small">Une carte est maîtrisée quand tu devrais encore la savoir dans trois semaines.</p>
                  <p class="kept">
                    <Show when={kept().n >= 20} fallback="Pas encore assez de réponses pour mesurer ce que tu retiens.">
                      Sur 30 jours, tu as retrouvé {Math.round((kept().ok / kept().n) * 100)} % des cartes déjà vues ({kept().n} réponses).
                    </Show>
                  </p>
                </section>

                <section aria-labelledby="st-time">
                  <h2 id="st-time">Temps de révision</h2>
                  <Show when={s().weeks.length} fallback={<p class="muted">Pas encore de révision notée.</p>}>
                    <Show when={s().days > 0}>
                      <p class="kept">
                        {s().days === 1 ? "1 jour de révision" : `${s().days} jours de révision`} ces 7 derniers jours.
                      </p>
                    </Show>
                    <Bars rows={weeks()} />
                  </Show>
                </section>

                <section aria-labelledby="st-next">
                  <h2 id="st-next">À venir</h2>
                  <Bars rows={upcoming()} />
                </section>
              </>
            )}
          </Match>
        </Switch>
      </main>
    </div>
  );
}
