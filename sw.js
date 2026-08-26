/* Sert l'application quand la salle n'a pas de réseau. Le principe : le
   squelette (HTML/CSS/JS) vient toujours du cache, data/programme.json est
   pris en réseau si possible pour rester à jour et retombe sur le cache sinon.
   L'écriture de séance elle-même ne passe jamais par ici : localStorage suffit
   et évite tout risque de conflit avec le cache. */

const VERSION = 'muscu-v1';
const FICHIERS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.webmanifest',
  './data/programme.json',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(FICHIERS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((n) => n !== VERSION).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET') return;         // POST vers le pont : jamais intercepté
  if (!requete.url.startsWith(self.location.origin)) return;

  evenement.respondWith(
    fetch(requete).then((reponse) => {
      const copie = reponse.clone();
      caches.open(VERSION).then((cache) => cache.put(requete, copie));
      return reponse;
    }).catch(() => caches.match(requete).then((r) => r || caches.match('./index.html')))
  );
});
