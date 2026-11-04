// Service worker : l'app et ses modules gardés à l'installation, l'API en réseau d'abord avec repli sur la dernière réponse.
// FILES et VERSION sont écrits au build (vite.config.ts).
const FILES = __FILES__;
const CACHE = "revise-" + __VERSION__;
const API = "revise-api";

self.addEventListener("install", (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  ),
);

// La version précédente reste un temps : une page ouverte avant le déploiement y retrouve ses modules
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const old = keys.filter((k) => k !== CACHE && k !== API);
        return Promise.all(old.slice(0, -1).map((k) => caches.delete(k)));
      })
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (e) => {
  const r = e.request;
  const url = new URL(r.url);
  if (r.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return e.respondWith(api(r));
  // Hors ligne : la page de cette version, pas celle de la précédente encore gardée
  if (r.mode === "navigate") return e.respondWith(fetch(r).catch(() => caches.match("/", { cacheName: CACHE })));
  e.respondWith(
    caches.match(r).then(
      (hit) =>
        hit ??
        fetch(r).then((res) => {
          // Grammaires Shiki : gardées au premier usage
          if (res.ok && url.pathname.startsWith("/assets/")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(r, copy));
          }
          return res;
        }),
    ),
  );
});

// Redirection d'Access (connexion expirée) ou erreur : jamais gardée, transmise telle quelle à la page.
// Réseau trop lent (4 s) et réponse déjà gardée : la réponse gardée, marquée, plutôt qu'une page qui attend
async function api(r) {
  const hit = await caches.match(r, { cacheName: API });
  const net = fetch(r).then((res) => {
    if (res.ok && res.type === "basic") {
      const copy = res.clone();
      caches.open(API).then((c) => c.put(r, copy));
    }
    return res;
  });
  if (!hit) return net;
  net.catch(() => {});
  const late = new Promise((ok) => setTimeout(ok, 4000));
  const res = await Promise.race([net, late]).catch(() => undefined);
  if (res) return res;
  const headers = new Headers(hit.headers);
  headers.set("x-revise-offline", "1");
  return new Response(hit.body, { status: hit.status, headers });
}
