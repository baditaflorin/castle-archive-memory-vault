// Cross-Origin-Isolation service worker shim.
// GitHub Pages cannot set COOP/COEP headers, so we synthesise them here so that
// SharedArrayBuffer (needed by ONNX runtime threads & DuckDB-WASM) is available.
// Based on https://github.com/gzuidhof/coi-serviceworker (MIT).

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (ev) => {
  if (ev.data && ev.data.type === 'deregister') {
    self.registration
      .unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((c) => c.navigate(c.url)));
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response.status === 0) return response;
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      })
      .catch((e) => {
        if (e && e.message) {
          console.warn('[coi-sw] fetch failed:', e.message);
        }
        throw e;
      })
  );
});
