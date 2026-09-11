/* Sert l'application quand la salle n'a pas de réseau. Le principe, **réseau
   d'abord pour tout**, cache en secours : chaque réponse obtenue remplace sa
   copie en cache, et le cache ne ressort qu'en cas d'échec du réseau. C'est
   ce qui garantit qu'une mise en ligne est prise dès le premier lancement
   couvert, au prix d'un démarrage plus lent sur un réseau faible (la requête
   doit expirer avant que le cache ne prenne le relais).

   Le commentaire disait l'inverse jusqu'au 12 septembre 2026 (« le squelette
   vient toujours du cache ») : c'était le projet initial, pas le code.

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

  // GitHub Pages sert ces fichiers avec Cache-Control: max-age=600 : sans
  // "no-store", fetch() peut renvoyer une reponse deja en cache navigateur
  // sans jamais recontacter le serveur, et ce "reseau d'abord" resservirait
  // alors une vieille version pendant dix minutes malgre une mise en ligne.
  evenement.respondWith(
    fetch(requete, { cache: 'no-store' }).then((reponse) => {
      const copie = reponse.clone();
      caches.open(VERSION).then((cache) => cache.put(requete, copie));
      return reponse;
    }).catch(() => caches.match(requete).then((r) => r || caches.match('./index.html')))
  );
});
