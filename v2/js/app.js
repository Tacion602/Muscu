/* Démarrage de la v2. */

async function demarrer() {
  const migree = migrerDepuisV1();
  reglages = Object.assign({}, REGLAGES_PAR_DEFAUT, lire(CLES.reglages, {}) || {});
  try {
    await chargerProgramme();
  } catch (e) {
    $('accueil-corps').innerHTML = '<p class="vide">Le programme n\'a pas pu être chargé.</p>';
    return;
  }
  brancherNavigation();
  brancherMinuterie();
  brancherReglages();
  rendreAccueil();
  if (migree) {
    const m = lire(CLES.migration, {});
    toast('Historique repris de l\'ancienne application : ' + m.seances + ' séances.', 4000);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') demanderVeille();
  });
  if (navigator.onLine) synchroniser().catch(() => {});
  window.addEventListener('online', () => synchroniser().catch(() => {}));
}

let verrou = null;
async function demanderVeille() {
  if (!reglages.veille || !('wakeLock' in navigator)) return;
  if (ecranActif() !== 'seance') return;
  try { verrou = await navigator.wakeLock.request('screen'); } catch (e) { verrou = null; }
}

document.addEventListener('DOMContentLoaded', demarrer);
