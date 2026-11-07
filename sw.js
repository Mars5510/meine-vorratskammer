
const CACHE = "vorratskammer-v3";

const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const currentFiles = [
    "./",
    "./index.html",
    "./app.js",
    "./config.js"
  ];

  const isCurrentFile = currentFiles.some((file) =>
    url.pathname.endsWith(file.replace("./", "/"))
  );

  if (isCurrentFile) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request)
      )
    );
  }
});

// Push-Nachrichten empfangen
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Meine Vorratskammer";
  const options = {
    body: data.body || "Du hast eine neue Erinnerung.",
    icon: "./icon.svg",
    badge: "./icon.svg",
    data: {
      url: "./"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Beim Antippen der Nachricht die App öffnen
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      return clients.openWindow("./");
    })
  );
});
