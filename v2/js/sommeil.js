/* Sommeil : frise de 48 créneaux de 30 min depuis 23 h, cœur 23h30-8h bleu
   par défaut, trois états en boucle, repères de journée et sports posés
   par armement puis appui. Port de la v1 (règles inchangées). */

const SOMMEIL_DEBUT_MIN = 23 * 60;
const SOMMEIL_NB_CRENEAUX = 48;
const SOMMEIL_COEUR_DEBUT = 1;
const SOMMEIL_COEUR_FIN = 17;

let nuitAffichee = null;
let armementFrise = null;

function creneauxSommeil() {
  const liste = [];
  for (let i = 0; i < SOMMEIL_NB_CRENEAUX; i++) {
    const m = (SOMMEIL_DEBUT_MIN + i * 30) % 1440;
    liste.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
  }
  return liste;
}

function indexCreneauPourHeure(heure) {
  if (!heure) return -1;
  const [h, m] = heure.split(':').map(Number);
  let minutes = h * 60 + m - SOMMEIL_DEBUT_MIN;
  if (minutes < 0) minutes += 1440;
  if (minutes >= SOMMEIL_NB_CRENEAUX * 30) return -1;
  return Math.floor(minutes / 30);
}

function cleNuitCourante() { return cleDate(new Date(Date.now() - 86400000)); }

function decalerCle(cle, delta) {
  const [j, m, a] = cle.split('/').map(Number);
  return cleDate(new Date(a, m - 1, j + delta));
}

function cleAnterieure(a, b) {
  const [ja, ma, aa] = a.split('/').map(Number); const [jb, mb, ab] = b.split('/').map(Number);
  return new Date(aa, ma - 1, ja) < new Date(ab, mb - 1, jb);
}

function nuitPour(cle) {
  return lireTableau(CLES.sommeil).find((n) => n.cle === cle) ||
    { cle, insomnies: [], sommeilHorsCoeur: [], horsServiceCoeur: [], raisons: [], alcool: false, cafe: 0, pipi: 0, ecranTard: false, repasTardif: false, sports: {}, reperesFrise: [] };
}

function enregistrerNuit(nuit) {
  const toutes = lireTableau(CLES.sommeil).filter((n) => n.cle !== nuit.cle);
  toutes.push(nuit);
  ecrire(CLES.sommeil, toutes);
  reglages.sommeilAEnvoyer = true; sauverReglages();
}

function etatCreneau(nuit, creneau, dansLeCoeur) {
  if (nuit.insomnies.includes(creneau)) return 'insomnie';
  const enSommeil = dansLeCoeur ? !(nuit.horsServiceCoeur || []).includes(creneau) : (nuit.sommeilHorsCoeur || []).includes(creneau);
  return enSommeil ? 'sommeil' : 'libre';
}

function basculerCreneau(nuit, index) {
  const creneau = creneauxSommeil()[index];
  const coeur = index >= SOMMEIL_COEUR_DEBUT && index <= SOMMEIL_COEUR_FIN;
  nuit.sommeilHorsCoeur = nuit.sommeilHorsCoeur || []; nuit.horsServiceCoeur = nuit.horsServiceCoeur || [];
  const retirer = (l) => { const i = l.indexOf(creneau); if (i >= 0) l.splice(i, 1); };
  const etat = etatCreneau(nuit, creneau, coeur);
  if (etat === 'sommeil') { if (coeur) retirer(nuit.horsServiceCoeur); else retirer(nuit.sommeilHorsCoeur); nuit.insomnies.push(creneau); }
  else if (etat === 'insomnie') { retirer(nuit.insomnies); if (coeur) nuit.horsServiceCoeur.push(creneau); }
  else if (coeur) retirer(nuit.horsServiceCoeur);
  else nuit.sommeilHorsCoeur.push(creneau);
  enregistrerNuit(nuit); rendreSommeil();
}

function rendreSommeil(param) {
  if (!nuitAffichee || (param === undefined && ecranActif() !== 'sommeil')) nuitAffichee = cleNuitCourante();
  const nuit = nuitPour(nuitAffichee);
  const creneaux = creneauxSommeil();
  $('sommeil-titre').innerHTML = 'Sommeil<span class="sous">Nuit du ' + nuitAffichee + ' au ' + decalerCle(nuitAffichee, 1) + '</span>';
  const sports = SPORT_JOURNEE.filter((sp) => nuit.sports && nuit.sports[sp.cle] != null).map((sp) => ({ sp, heure: nuit.sports[sp.cle], index: indexCreneauPourHeure(nuit.sports[sp.cle]) }));
  const reperes = {}; (nuit.reperesFrise || []).forEach((r) => { reperes[r.index] = r; });
  const corps = $('sommeil-corps');
  let html = '<div class="mois-nav"><button class="icone" id="nuit-prec" aria-label="Nuit précédente">' + svgIcone('retour') + '</button><b>' + (nuitAffichee === cleNuitCourante() ? 'Nuit dernière' : nuitAffichee) + '</b><button class="icone" id="nuit-suiv" aria-label="Nuit suivante"' + (!cleAnterieure(nuitAffichee, cleNuitCourante()) ? ' disabled style="opacity:.3"' : '') + '>' + svgIcone('chevron') + '</button></div>';
  html += '<div class="carte"><p class="petit texte-2" style="margin-bottom:8px">Un appui : bleu (sommeil), rouge (insomnie), gris. Une puce armée se dépose au second appui.</p><div class="sommeil-frise' + (armementFrise ? ' armee' : '') + '">' + creneaux.map((c, i) => {
    const coeur = i >= SOMMEIL_COEUR_DEBUT && i <= SOMMEIL_COEUR_FIN;
    const etat = etatCreneau(nuit, c, coeur);
    const sport = sports.find((s) => s.index === i);
    const rep = !sport ? reperes[i] : null;
    const item = rep ? JOURNEE_SOMMEIL.find((x) => x.cle === rep.type) : null;
    const icone = sport ? '<span class="rep">' + sport.sp.icone + '</span>' : (item ? '<span class="rep">' + item.icone + '</span>' : '');
    const heure = i % 2 === 0 && !icone ? '<span class="heure">' + c.split(':')[0] + '</span>' : '';
    return '<button type="button" class="sommeil-creneau ' + etat + (coeur ? ' coeur' : '') + '" data-index="' + i + '"' + (sport ? ' data-sport="' + sport.sp.cle + '"' : '') + (item ? ' data-type="' + rep.type + '"' : '') + ' aria-label="' + c + '">' + heure + icone + '</button>';
  }).join('') + '</div></div>';
  html += '<p class="titre-section">Raisons d\'insomnie</p><div class="chips">' + RAISONS_INSOMNIE.map((r) => '<button class="chip' + (nuit.raisons.includes(r.cle) ? ' choisi' : '') + '" data-raison="' + r.cle + '">' + r.icone + ' ' + echapper(r.nom) + '</button>').join('') + '</div>';
  html += '<p class="titre-section">La journée</p><div class="chips">' +
    SPORT_JOURNEE.map((sp) => { const choisi = nuit.sports && nuit.sports[sp.cle] != null; return '<button class="chip' + (choisi ? ' choisi' : '') + (armementFrise === sp.cle ? ' arme' : '') + '" data-sport-chip="' + sp.cle + '">' + sp.icone + ' ' + echapper(sp.nom) + '</button>' + (choisi ? '<input type="time" class="heure-sport" data-heure="' + sp.cle + '" value="' + (nuit.sports[sp.cle] || '') + '">' : ''); }).join('') +
    JOURNEE_SOMMEIL.map((it) => { const v = it.type === 'bascule' ? nuit[it.cle] : (nuit[it.cle] || 0); return '<button class="chip' + (v ? ' choisi' : '') + (armementFrise === it.cle ? ' arme' : '') + '" data-item="' + it.cle + '">' + it.icone + ' ' + echapper(it.nom) + (it.type === 'compteur' && v ? ' · ' + v + '<span class="x" data-remise="' + it.cle + '">×</span>' : '') + '</button>'; }).join('') + '</div>';
  html += '<p class="titre-section">Le mois</p><div class="carte" id="sommeil-mois"></div>';
  corps.innerHTML = html;

  $('nuit-prec').addEventListener('click', () => { nuitAffichee = decalerCle(nuitAffichee, -1); rendreSommeil(null); });
  $('nuit-suiv').addEventListener('click', () => { if (cleAnterieure(nuitAffichee, cleNuitCourante())) { nuitAffichee = decalerCle(nuitAffichee, 1); rendreSommeil(null); } });
  corps.querySelectorAll('.sommeil-creneau').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.index);
    if (armementFrise) {
      const type = armementFrise; armementFrise = null;
      if (SPORT_JOURNEE.some((sp) => sp.cle === type)) { nuit.sports = nuit.sports || {}; nuit.sports[type] = creneaux[i]; }
      else { nuit.reperesFrise = nuit.reperesFrise || []; nuit.reperesFrise.push({ type, index: i }); }
      enregistrerNuit(nuit); rendreSommeil(null); return;
    }
    if (b.dataset.sport) { delete nuit.sports[b.dataset.sport]; enregistrerNuit(nuit); rendreSommeil(null); return; }
    if (b.dataset.type) { nuit.reperesFrise = (nuit.reperesFrise || []).filter((r) => r.index !== i); enregistrerNuit(nuit); rendreSommeil(null); return; }
    basculerCreneau(nuit, i);
  }));
  corps.querySelectorAll('[data-raison]').forEach((b) => b.addEventListener('click', () => { const i = nuit.raisons.indexOf(b.dataset.raison); if (i >= 0) nuit.raisons.splice(i, 1); else nuit.raisons.push(b.dataset.raison); enregistrerNuit(nuit); rendreSommeil(null); }));
  corps.querySelectorAll('[data-sport-chip]').forEach((b) => b.addEventListener('click', () => {
    const cle = b.dataset.sportChip;
    nuit.sports = nuit.sports || {};
    if (nuit.sports[cle] != null) { delete nuit.sports[cle]; armementFrise = null; }
    else { nuit.sports[cle] = ''; armementFrise = cle; }
    enregistrerNuit(nuit); rendreSommeil(null);
  }));
  corps.querySelectorAll('[data-heure]').forEach((c) => c.addEventListener('change', () => { nuit.sports[c.dataset.heure] = c.value; enregistrerNuit(nuit); rendreSommeil(null); }));
  corps.querySelectorAll('[data-item]').forEach((b) => b.addEventListener('click', (e) => {
    const remise = e.target.closest('[data-remise]');
    const it = JOURNEE_SOMMEIL.find((x) => x.cle === b.dataset.item);
    if (remise) { nuit[it.cle] = 0; armementFrise = null; }
    else {
      armementFrise = armementFrise === it.cle ? null : it.cle;
      if (it.type === 'bascule') nuit[it.cle] = !nuit[it.cle]; else nuit[it.cle] = (nuit[it.cle] || 0) + 1;
    }
    enregistrerNuit(nuit); rendreSommeil(null);
  }));
  rendreMoisSommeil();
}
rendus.sommeil = rendreSommeil;

function rendreMoisSommeil() {
  const parNuit = {}; lireTableau(CLES.sommeil).forEach((n) => { parNuit[n.cle] = n; });
  const maintenant = new Date(); const annee = maintenant.getFullYear(); const mois = maintenant.getMonth();
  const nb = new Date(annee, mois + 1, 0).getDate(); const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7;
  let html = '';
  for (let i = 0; i < decalage; i++) html += '<span class="calendrier-case vide"></span>';
  for (let j = 1; j <= nb; j++) {
    const cle = String(j).padStart(2, '0') + '/' + String(mois + 1).padStart(2, '0') + '/' + annee;
    const n = parNuit[cle];
    const classe = n ? (n.insomnies.length >= 4 ? ' zone-fatigue' : n.insomnies.length ? ' zone-recup' : ' zone-prete') : '';
    html += '<span class="calendrier-case' + (j === maintenant.getDate() ? ' aujourdhui' : '') + classe + '"><span class="num">' + j + '</span></span>';
  }
  $('sommeil-mois').innerHTML = '<div class="calendrier-entetes">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => '<span>' + d + '</span>').join('') + '</div><div class="calendrier-grille">' + html + '</div>';
}
