/* Démarrage de la v2. */

let versionApp = '';

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
    // Une nouvelle version installée prend la main tout de suite : la page
    // se recharge une fois (hors séance en cours de saisie, où l'on attend
    // le prochain lancement), au lieu d'exiger deux fermetures complètes.
    let dejaControle = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!dejaControle) { dejaControle = true; return; }
      if (seance || ['seance', 'fin', 'demarrage'].includes(ecranActif())) { toast('Mise à jour prête : elle s\'appliquera au prochain lancement.', 4000); return; }
      location.reload();
    });
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.version) { versionApp = e.data.version; const v = $('reglages-version'); if (v) v.textContent = versionApp; }
    });
    navigator.serviceWorker.ready.then((r) => { if (r.active) r.active.postMessage('version'); });
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
