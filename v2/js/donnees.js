/* Données de l'application v2 : stockage local, reprise de la v1, programme,
   historique et outils communs. Aucun rendu ici.

   Clés `muscu2.*` : la v2 vit à côté de la v1 (clés `muscu.*`) sur le même
   domaine. Au premier lancement, elle copie une fois l'historique de la v1
   (séances, consignes, sommeil, mensurations, remarques) puis ne le relit
   plus jamais : les deux applications ne partagent rien ensuite (décision
   de l'utilisateur le 4 novembre 2026). */

const CLES = {
  historique: 'muscu2.historique',
  seances: 'muscu2.seances',
  reglages: 'muscu2.reglages',
  consignes: 'muscu2.consignes',
  reglagesMachine: 'muscu2.reglagesMachine',
  douleurs: 'muscu2.douleurs',
  sommeil: 'muscu2.sommeil',
  mensurations: 'muscu2.mensurations',
  remarques: 'muscu2.remarques',
  dureeGainage: 'muscu2.dureeGainage',
  migration: 'muscu2.migration',
  dernierJour: 'muscu2.dernierJour',
};

const CLES_V1 = {
  historique: 'muscu.historique',
  seances: 'muscu.seances',
  seance: 'muscu.seance',
  reglages: 'muscu.reglages',
  consignes: 'muscu.consignes',
  sommeil: 'muscu.sommeil',
  mensurations: 'muscu.mensurations',
  remarques: 'muscu.remarques',
  dureeGainage: 'muscu.dureeGainage',
};

const $ = (id) => document.getElementById(id);

function lire(cle, defaut) {
  try {
    const brut = localStorage.getItem(cle);
    return brut === null ? defaut : JSON.parse(brut);
  } catch (e) {
    return defaut;
  }
}

function lireTableau(cle) {
  const v = lire(cle, []);
  return Array.isArray(v) ? v : [];
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch (e) {
    console.warn('Enregistrement impossible', e);
  }
  if (cle === CLES.historique) cacheHistorique = null;
}

/* L'historique est relu à chaque frappe par les comparaisons : mémoïsé en
   mémoire, invalidé à chaque écriture (voir ecrire). */
let cacheHistorique = null;
function historique() {
  if (!cacheHistorique) cacheHistorique = lireTableau(CLES.historique);
  return cacheHistorique;
}

function seancesTerminees() {
  return historique().filter((s) => s.fin).sort((a, b) => new Date(b.fin) - new Date(a.fin));
}

function enregistrerDansHistorique(s) {
  const toutes = historique().filter((x) => x.id !== s.id);
  toutes.push(s);
  ecrire(CLES.historique, toutes);
}

/* ---------- Reprise de la v1 ---------- */

/* Une séance de cardio s'appelait « footing » en v1, avec sa carte de
   passages sous `footing`. La v2 dit « cardio » partout. */
function normaliserSeanceV1(s) {
  const n = Object.assign({}, s);
  if (n.type === 'footing') {
    n.type = 'cardio';
    n.cardio = n.footing || {};
    delete n.footing;
    // Anciens formats (voir footingParType de la v1) : une sortie à plat
    // avec un champ `type`, ou un passage par type sans tableau.
    if (n.cardio.duree_min !== undefined || n.cardio.distance_km !== undefined) {
      const seul = n.cardio;
      n.cardio = {};
      n.cardio[seul.type || 'ef'] = [seul];
    } else {
      Object.keys(n.cardio).forEach((t) => {
        if (!Array.isArray(n.cardio[t])) n.cardio[t] = [n.cardio[t]];
      });
    }
  }
  if (n.titre && !n.nom) n.nom = nomDuJourV1(n.titre);
  n.lignes = n.lignes || null;
  return n;
}

function nomDuJourV1(titre) {
  const nom = (titre || '').replace(/^J\d\s*(&\s*J\d)?\s*/i, '').split(/\s+-\s+/)[0].trim();
  return /^footing$/i.test(nom) ? 'Cardio' : nom.charAt(0) + nom.slice(1).toLowerCase();
}

/* Séances des 27 et 28 août 2026 : supprimées entières par la version
   muscu2-2026-11-05-9, puis rendues le 6 novembre 2026 (« je ne souhaite
   pas effacer toute la séance mais uniquement l'exercice trop éloigné de
   ses voisins »). `restaurerSeancesDEssai()` les reprend une seule fois de
   l'historique v1, resté intact, si elles manquent ; l'exercice aberrant
   se retire ensuite depuis la fiche du point (`retirerExerciceDeSeance()`). */
const JOURS_RESTAURES = ['27/08/2026', '28/08/2026'];
const CLE_RESTAURATION = 'muscu2.essaisRestaures';
function restaurerSeancesDEssai() {
  if (lire(CLE_RESTAURATION, null)) return 0;
  const presentes = new Set(lireTableau(CLES.historique).map((s) => s.id));
  const ajout = lireTableau(CLES_V1.historique).filter((s) => {
    const d = s && (s.fin || s.debut);
    return d && !presentes.has(s.id) && JOURS_RESTAURES.includes(cleDate(new Date(d)));
  }).map(normaliserSeanceV1);
  if (ajout.length) ecrire(CLES.historique, lireTableau(CLES.historique).concat(ajout));
  ecrire(CLE_RESTAURATION, { quand: new Date().toISOString(), seances: ajout.length });
  return ajout.length;
}

/* Historique de sommeil effacé une fois, à la demande de l'utilisateur
   le 6 novembre 2026 (« il n'y a plus de problème d'insomnie ») : les
   nuits saisies sur le téléphone, pas le classeur (l'onglet Sommeil n'y
   existait pas encore). Les nuits saisies ensuite repartent de zéro. */
const CLE_SOMMEIL_EFFACE = 'muscu2.sommeilEfface';
function effacerSommeilUneFois() {
  if (lire(CLE_SOMMEIL_EFFACE, null)) return 0;
  const avant = lireTableau(CLES.sommeil).length;
  ecrire(CLES.sommeil, []);
  ecrire(CLE_SOMMEIL_EFFACE, { quand: new Date().toISOString(), nuits: avant });
  return avant;
}

/* Extension jambes du J4 du 6 novembre 2026 : la série 1 était partie sans
   répétitions (65 kg, RIR 2) et la série 75 × 12 manquait. Séries données
   par l'utilisateur le même jour : 65 × 13 @2, 70 × 12 @1, 75 × 12 @0. Une
   seule fois, sur cette séance seule ; le classeur a été corrigé à la main. */
const CLE_EXTENSION_CORRIGEE = 'muscu2.extensionCorrigee';
function corrigerExtensionJambes() {
  if (lire(CLE_EXTENSION_CORRIGEE, null)) return false;
  const toutes = lireTableau(CLES.historique);
  const s = toutes.find((x) => x.id === SEANCE_REAR_KICK);
  const exo = s ? (s.exercices || []).find((e) => memeExercice(e.nom, 'Extension jambes unilatéral')) : null;
  if (!exo) { if (s) ecrire(CLE_EXTENSION_CORRIGEE, { quand: new Date().toISOString(), corrige: false }); return false; }
  const justes = [[65, 13, 2], [70, 12, 1], [75, 12, 0]];
  const modele = exo.series[0] || {};
  exo.series = justes.map(([charge, reps, rir], i) => Object.assign({}, modele, exo.series[i] || {},
    { charge, reps, rir, faite: true, echauffement: false, restPause: false }));
  ecrire(CLES.historique, toutes);
  ecrire(CLE_EXTENSION_CORRIGEE, { quand: new Date().toISOString(), corrige: true });
  return true;
}

/* Rear kick : remplace l'extension de hanche machine en J4 le 6 novembre
   2026 (pile de la machine au maximum). Fait le jour même et saisi sous
   l'ancien nom ; l'utilisateur veut repartir de zéro avec ces données. Une
   seule fois, sur cette séance seule : l'historique plus ancien de
   l'extension de hanche garde son nom. */
const SEANCE_REAR_KICK = 'S1793958424096';
const CLE_REAR_KICK = 'muscu2.rearKickRenomme';
function renommerRearKick() {
  if (lire(CLE_REAR_KICK, null)) return false;
  const toutes = lireTableau(CLES.historique);
  const s = toutes.find((x) => x.id === SEANCE_REAR_KICK);
  let fait = false;
  (s ? s.exercices || [] : []).forEach((e) => {
    if (memeExercice(e.nom, 'Extension de hanche machine')) { e.remplace = e.nom; e.nom = 'Rear kick machine'; fait = true; }
  });
  if (fait) ecrire(CLES.historique, toutes);
  if (s) ecrire(CLE_REAR_KICK, { quand: new Date().toISOString(), renomme: fait });
  return fait;
}

/* Retire un exercice d'une séance enregistrée (point aberrant d'une
   courbe), sans toucher au reste de la séance ni au classeur. */
function retirerExerciceDeSeance(idSeance, nomExo) {
  const toutes = historique();
  const s = toutes.find((x) => x.id === idSeance);
  if (!s) return false;
  const avant = (s.exercices || []).length;
  s.exercices = (s.exercices || []).filter((e) => !memeExercice(e.nom, nomExo));
  if (s.exercices.length === avant) return false;
  ecrire(CLES.historique, toutes);
  return true;
}

function migrerDepuisV1() {
  if (lire(CLES.migration, null)) return false;
  const v1 = lireTableau(CLES_V1.historique);
  if (!v1.length && !localStorage.getItem(CLES_V1.reglages)) {
    ecrire(CLES.migration, { quand: new Date().toISOString(), seances: 0, source: 'aucune v1' });
    return false;
  }
  ecrire(CLES.historique, v1.map(normaliserSeanceV1));
  const consignes = lire(CLES_V1.consignes, {});
  ecrire(CLES.consignes, consignes && typeof consignes === 'object' ? consignes : {});
  ecrire(CLES.sommeil, lireTableau(CLES_V1.sommeil));
  ecrire(CLES.mensurations, lireTableau(CLES_V1.mensurations));
  ecrire(CLES.remarques, lireTableau(CLES_V1.remarques));
  const duree = lire(CLES_V1.dureeGainage, null);
  if (duree) ecrire(CLES.dureeGainage, duree);
  // Les réglages de son, vibration et veille suivent ; pas l'adresse du
  // pont, qui change avec le classeur.
  const anciens = lire(CLES_V1.reglages, {}) || {};
  const neufs = Object.assign({}, REGLAGES_PAR_DEFAUT);
  ['son', 'vibration', 'veille', 'clavierPendantRecup', 'notification'].forEach((c) => {
    if (anciens[c] !== undefined) neufs[c] = anciens[c];
  });
  ecrire(CLES.reglages, neufs);
  ecrire(CLES.migration, { quand: new Date().toISOString(), seances: v1.length, source: 'v1' });
  return true;
}

/* ---------- Réglages ---------- */

let reglages = Object.assign({}, REGLAGES_PAR_DEFAUT, lire(CLES.reglages, {}) || {});

function sauverReglages() {
  ecrire(CLES.reglages, reglages);
}

/* ---------- Programme ---------- */

let programme = { version: 2, jours: [] };

const JOUR_GAINAGE = { code: 'G', rang: 99, nom: 'Gainage', type: 'gainage', exercices: [] };

async function chargerProgramme() {
  const reponse = await fetch('data/programme.json', { cache: 'no-cache' });
  programme = await reponse.json();
  if (!programme.jours.some((j) => j.code === 'G')) programme.jours.push(JOUR_GAINAGE);
  programme.jours.sort((a, b) => a.rang - b.rang);
}

function jourDe(code) {
  return programme.jours.find((j) => j.code === code) || null;
}

/* Deux jours de cardio (J2 et J6) sont le même entraînement : leurs séances
   se lisent ensemble. */
function codeCanonique(code) {
  const jour = jourDe(code);
  if (jour && jour.type === 'cardio') {
    const premier = programme.jours.find((j) => j.type === 'cardio');
    return premier ? premier.code : code;
  }
  return code;
}

/* Jour affiché : « J » suivi de son rang dans la semaine, le code du
   classeur restant l'identité des séances (voir CLAUDE.md). */
function libelleJour(jour) {
  if (!jour) return '';
  if (jour.type === 'gainage') return 'Bonus';
  return 'J' + jour.rang;
}

/* ---------- Identité d'un exercice ---------- */

function formeDuNom(nom) {
  return String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function memeExercice(a, b) {
  const fa = formeDuNom(a);
  const fb = formeDuNom(b);
  if (fa === fb) return true;
  const anciensB = ANCIENS_NOMS[fb] || [];
  const anciensA = ANCIENS_NOMS[fa] || [];
  return anciensB.includes(fa) || anciensA.includes(fb);
}

function nomsConnus() {
  const noms = new Map();
  programme.jours.forEach((j) => (j.exercices || []).forEach((e) => noms.set(formeDuNom(e.nom), e.nom)));
  historique().forEach((s) => (s.exercices || []).forEach((e) => {
    if (!noms.has(formeDuNom(e.nom))) noms.set(formeDuNom(e.nom), e.nom);
  }));
  return [...noms.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}

/* Fiche du programme pour un nom d'exercice, quel que soit le jour. */
function ficheDuProgramme(nom) {
  for (const j of programme.jours) {
    const e = (j.exercices || []).find((x) => memeExercice(x.nom, nom));
    if (e) return e;
  }
  return null;
}

/* ---------- Historique d'un exercice ---------- */

function seriesDeTravail(exo) {
  return ((exo && exo.series) || []).filter((s) => s.faite && !s.echauffement && s.charge != null && s.reps != null);
}

/* Toutes les occurrences passées d'un exercice, de la plus ancienne à la
   plus récente, deload écartés, séance en cours exclue. */
function occurrences(nomExo, saufId) {
  const liste = [];
  historique().forEach((s) => {
    if (!s.fin || s.deload || s.id === saufId) return;
    const exo = (s.exercices || []).find((e) => memeExercice(e.nom, nomExo));
    if (!exo) return;
    const series = seriesDeTravail(exo);
    if (series.length) liste.push({ seance: s, exo, series, quand: s.fin });
  });
  return liste.sort((a, b) => new Date(a.quand) - new Date(b.quand));
}

function derniereFois(nomExo, saufId) {
  const toutes = occurrences(nomExo, saufId);
  return toutes.length ? toutes[toutes.length - 1] : null;
}

function derniereSeanceDuJour(code) {
  return seancesTerminees().find((s) => codeCanonique(s.jour) === codeCanonique(code)) || null;
}

/* ---------- Consignes, réglages de machine, douleurs ---------- */

function cleConsigne(jour, nom) {
  return jour + '|' + nom;
}

function consigneAffichee(jour, nom, defaut) {
  const toutes = lire(CLES.consignes, {}) || {};
  if (toutes[cleConsigne(jour, nom)] != null) return toutes[cleConsigne(jour, nom)];
  const forme = formeDuNom(nom);
  for (const cle of Object.keys(toutes)) {
    const [j, n] = cle.split('|');
    if (j === jour && memeExercice(n, forme)) return toutes[cle];
  }
  return defaut || '';
}

function enregistrerConsigne(jour, nom, texte) {
  const toutes = lire(CLES.consignes, {}) || {};
  toutes[cleConsigne(jour, nom)] = texte;
  ecrire(CLES.consignes, toutes);
  reglages.consignesAEnvoyer = true;
  sauverReglages();
}

function reglagesMachine(nom) {
  const tous = lire(CLES.reglagesMachine, {}) || {};
  const cle = Object.keys(tous).find((k) => memeExercice(k, nom));
  if (cle) return tous[cle];
  const fiche = ficheDuProgramme(nom);
  return (fiche && fiche.reglages) || '';
}

function enregistrerReglagesMachine(nom, texte) {
  const tous = lire(CLES.reglagesMachine, {}) || {};
  tous[nom] = texte;
  ecrire(CLES.reglagesMachine, tous);
  reglages.reglagesMachineAEnvoyer = true;
  sauverReglages();
}

/* Douleurs rattachées à un exercice (4 novembre 2026) : une liste datée,
   relue sur la fiche de l'exercice la fois suivante. */
function douleursDe(nom) {
  return lireTableau(CLES.douleurs).filter((d) => memeExercice(d.exercice, nom))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function ajouterDouleur(nom, texte, seanceId, jour) {
  const toutes = lireTableau(CLES.douleurs);
  toutes.push({ exercice: nom, texte, date: new Date().toISOString(), seance: seanceId || null, jour: jour || null, envoyee: false });
  ecrire(CLES.douleurs, toutes);
}

/* ---------- Outils ---------- */

function nombreOuNull(texte) {
  const propre = String(texte == null ? '' : texte).trim().replace(',', '.');
  if (!propre) return null;
  const n = Number(propre);
  return Number.isFinite(n) ? n : null;
}

function echapper(texte) {
  return String(texte == null ? '' : texte)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dateCourte(iso) {
  const d = new Date(iso);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

function dateJM(iso) {
  const d = new Date(iso);
  return d.getDate() + '/' + (d.getMonth() + 1);
}

function joursDepuis(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function ilYA(iso) {
  const j = joursDepuis(iso);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  return 'il y a ' + j + ' j';
}

function texteDuree(secondes) {
  const s = Math.max(0, Math.round(secondes));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function formatNombre(n) {
  if (n == null) return '';
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

function semaineIso(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
}

function cleDate(date) {
  return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
}
