/* Service worker de la v2 : cache d'abord pour tout ce qui est listé,
   revalidation en arrière-plan. Le lancement en salle ne dépend donc plus
   du réseau (la v1 attendait l'échec de chaque requête avant de servir le
   cache). Une mise en ligne est prise au lancement suivant : VERSION doit
   changer à chaque livraison, c'est elle qui purge l'ancien cache. */

const VERSION = 'muscu2-2026-11-06-14';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest', './css/style.css', './data/programme.json',
  './js/tables.js', './js/donnees.js', './js/calculs.js', './js/ui.js', './js/sport.js',
  './js/seance.js', './js/cardio.js', './js/gainage.js', './js/suivi.js', './js/sommeil.js',
  './js/mensurations.js', './js/reglages.js', './js/app.js',
  '../icones/icone.svg', '../icones/icone-192.png', '../icones/icone-512.png',
];
// Schémas d'exercices : précachés aussi (924 Ko une fois), sans quoi un
// exercice jamais ouvert en ligne n'aurait pas d'image hors ligne.
const SCHEMAS = ['thigh-abductor', 'alternating-incline-curl-with-dumbbell', 'biceps-hammer-curl-with-dumbbell',
  'preacher-curl-with-machine', 'incline-bench-press', 'machine-bench-press', 'chest-dips', 'crossover-bands',
  'lateral-dumbbell-raises', 'one-legged-cable-kickback', 'leg-extensions', 'standing-triceps-extension-with-towel',
  'triceps-pushdown-with-cable', 'lying-leg-curl-machine', 'straight-arm-push-down', 'standing-calf-raises-using-machine',
  'bent-over-rear-deltoid-raise-with-head-on-bench', 'leg-press', 'seated-cable-rows', 'romanian-dead-lift',
  'underhand-pull-downs', 'narrow-parallel-grip-chin-ups', 'seated-military-press'];
SCHEMAS.forEach((s) => { FICHIERS.push('../images-exercices/schemas/' + s + '-relaxation.svg', '../images-exercices/schemas/' + s + '-tension.svg'); });
FICHIERS.push('../images-exercices/face-pull.jpg');

self.addEventListener('install', (e) => {
  // `cache: 'reload'` : le précache part du serveur, jamais du cache HTTP du
  // navigateur, sinon une nouvelle VERSION pouvait se remplir d'anciens
  // fichiers (mises à jour du 4 novembre 2026 jamais vues sur le Pixel).
  e.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FICHIERS.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((noms) => Promise.all(noms.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => {
  if (e.data === 'version' && e.source) e.source.postMessage({ version: VERSION });
});

// Un appui sur la notification de fin de repos ramène l'application.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((liste) => {
    const fenetre = liste.find((c) => c.url.includes('/v2/'));
    return fenetre ? fenetre.focus() : self.clients.openWindow('./');
  }));
});

self.addEventListener('fetch', (e) => {
  const requete = e.request;
  if (requete.method !== 'GET' || !requete.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const enCache = await cache.match(requete, { ignoreSearch: true });
    const reseau = fetch(requete, { cache: 'no-store' }).then((reponse) => {
      if (reponse && reponse.ok) cache.put(requete, reponse.clone());
      return reponse;
    }).catch(() => null);
    if (enCache) { reseau.catch(() => {}); return enCache; }
    const r = await reseau;
    return r || cache.match('./index.html');
  }));
});
