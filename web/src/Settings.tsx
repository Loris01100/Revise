import { For, Show } from "solid-js";
import { Icon, Link, setSettings, settings, type Settings as S } from "./ui";

const MINUTES = [10, 15, 20, 25];
const DELAYS = Array.from({ length: 12 }, (_, k) => 15 * (k + 1));
const THEMES: [S["theme"], string][] = [
  ["auto", "Comme l'appareil"],
  ["light", "Clair"],
  ["dark", "Sombre"],
];

export default function Settings() {
  return (
    <div class="page">
      <header class="top">
        <div class="top-start">
          <Link href="/" class="icon-btn">
            <Icon name="back" />
            <span class="sr-only">Retour à l'accueil</span>
          </Link>
          <h1 class="title">Réglages</h1>
        </div>
      </header>

      <main class="col settings">
        <section aria-labelledby="s-session">
          <h2 id="s-session">Session</h2>
          <div class="setting">
            <div>
              <label for="minutes">Durée de la session minutée</label>
              <p id="minutes-h" class="muted small">
                De 10 à 25 min
              </p>
            </div>
            <select
              id="minutes"
              class="field"
              aria-describedby="minutes-h"
              onChange={(e) => setSettings({ minutes: +e.currentTarget.value })}
            >
              <For each={MINUTES}>
                {(m) => (
                  <option value={m} selected={settings().minutes === m}>
                    {m} min
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="setting">
            <div>
              <span id="auto">Révéler la correction automatiquement</span>
              <p id="auto-h" class="muted small">
                Quand rien n'est tapé pendant le délai choisi
              </p>
            </div>
            <button
              class="switch"
              role="switch"
              aria-checked={settings().autoReveal}
              aria-labelledby="auto"
              aria-describedby="auto-h"
              onClick={() => setSettings({ autoReveal: !settings().autoReveal })}
            />
          </div>
          <Show when={settings().autoReveal}>
            <div class="setting indent">
              <div>
                <label for="delay">Délai avant révélation</label>
                <p id="delay-h" class="muted small">
                  De 15 à 180 s
                </p>
              </div>
              <select
                id="delay"
                class="field"
                aria-describedby="delay-h"
                onChange={(e) => setSettings({ delay: +e.currentTarget.value })}
              >
                <For each={DELAYS}>
                  {(d) => (
                    <option value={d} selected={settings().delay === d}>
                      {d} s
                    </option>
                  )}
                </For>
              </select>
            </div>
          </Show>
        </section>

        <section aria-labelledby="s-display">
          <h2 id="s-display">Affichage</h2>
          <div class="setting">
            <span id="theme">Thème</span>
            <div class="chips" role="group" aria-labelledby="theme">
              <For each={THEMES}>
                {([t, label]) => (
                  <button class="chip" aria-pressed={settings().theme === t} onClick={() => setSettings({ theme: t })}>
                    {label}
                  </button>
                )}
              </For>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
