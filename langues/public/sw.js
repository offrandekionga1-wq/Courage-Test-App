// Cache hors-ligne : l'appli et son contenu restent utilisables sans réseau.
const CACHE = 'polyglotte-v3';

// À l'installation : la page d'accueil et les fichiers qu'elle référence (scripts, styles) sont mis en cache,
// pour que l'appli démarre hors ligne même si le service worker n'a pas encore contrôlé le premier chargement.
self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        const res = await fetch('./', { cache: 'reload' });
        const html = await res.clone().text();
        await cache.put('./', res);
        const urls = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
        await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
        // Fragments chargés à la demande : on précharge les petits (traductions de l'interface,
        // guides de conversation) et on laisse les dictionnaires, qui pèsent plusieurs mégaoctets,
        // se mettre en cache au fur et à mesure de leur première consultation.
        for (const u of urls.filter((x) => x.endsWith('.js'))) {
          const js = await (await cache.match(u))?.text();
          const base = new URL(u, self.location.href);
          const chunks = [...new Set([...(js ?? '').matchAll(/["'`](\.\/[\w.-]+\.js)["'`]/g)]
            .map((m) => new URL(m[1], base).href))];
          await Promise.all(chunks.map(async (c) => {
            try {
              const res = await fetch(c);
              const size = Number(res.headers.get('content-length') ?? 0);
              if (res.ok && size < 400000) await cache.put(c, res);
            } catch { /* hors ligne ou fragment absent : ce n'est pas bloquant */ }
          }));
        }
      } catch { /* hors ligne à l'installation : on réessaiera à la prochaine mise à jour */ }
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreVary: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./', { ignoreVary: true }) : Response.error()))),
  );
});
