// Service worker: caches the app shell so the PWA opens offline-capable.
// The API (/api/*) and WebSockets are never cached or intercepted.
const CACHE = "sudoku-shell-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
				),
			),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	const url = new URL(request.url);
	if (
		request.method !== "GET" ||
		url.origin !== self.location.origin ||
		url.pathname.startsWith("/api/")
	) {
		return;
	}

	// Pages: network first (always fresh), falling back to the cached shell.
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(CACHE).then((cache) => cache.put("/", copy));
					return response;
				})
				.catch(() => caches.match("/")),
		);
		return;
	}

	// Hashed build assets never change: cache first.
	if (url.pathname.startsWith("/assets/")) {
		event.respondWith(
			caches.match(request).then(
				(hit) =>
					hit ??
					fetch(request).then((response) => {
						if (response.ok) {
							const copy = response.clone();
							caches.open(CACHE).then((cache) => cache.put(request, copy));
						}
						return response;
					}),
			),
		);
	}
});
