/* Suivi de séance. Tout se joue hors ligne : le téléphone est la mémoire de
   référence pendant l'entraînement, le classeur n'est prévenu qu'à la fin.
   Aucune saisie ne dépend du réseau, qui est mauvais dans la plupart des salles. */

'use strict';

const CLES = {
  seance: 'muscu.seance',      // ancien format, une seule séance ; ne sert plus qu'à la reprise
  seances: 'muscu.seances',    // séances en cours, une par jour, indexées par code
  historique: 'muscu.historique',
  reglages: 'muscu.reglages',
  consignes: 'muscu.consignes',
};

const REGLAGES_PAR_DEFAUT = {
  pont: '',
  secret: '',
  son: true,
  vibration: true,
  veille: true,
  clavierPendantRecup: true,
};

/* Échauffement de début de séance, optimisé aux zones travaillées ce jour-là,
   affiché une seule fois avant le premier exercice. Environ 5 min chacun,
   construit sur le même principe : mobilité de l'articulation la plus
   sollicitée, activation des muscles stabilisateurs, puis montée en charge
   progressive sur le geste du premier exercice. Étendu à tous les jours le
   26 août 2026 (voir CLAUDE.md). */
const ECHAUFFEMENT_PAR_JOUR = {
  J1: [
    "Cercles de bras avant et arrière, puis rotations d'épaules, 1 min",
    'Rotations externes à la poulie ou avec élastique, charge très légère, 2 séries de 15, 2 min',
    'Pompes lentes, genoux au sol si besoin, 2 séries de 10, 2 min',
  ],
  J3: [
    'Cercles de bras et décollements de scapulas suspendu à la barre, 1 min',
    'Face pull ou tirage élastique horizontal, charge très légère, 2 séries de 15, 2 min',
    'Tirage vertical à vide puis à 50 % de la charge de travail, 2 séries de 10, 2 min',
  ],
  J4: [
    'Vélo ou rameur à allure facile, 2 min',
    'Fentes marchées et rotations de hanches sans charge, 10 par jambe, 1 min 30',
    'Presse ou squat à vide puis à 50 % de la charge de travail, 2 séries de 10, 1 min 30',
  ],
  J5: [
    "Cercles de bras et rotations d'épaules dans les deux sens, 1 min",
    'Face pull et rotations externes légères, 2 séries de 15, 2 min',
    'Traction assistée à charge maximale d\'assistance, 2 séries de 8, 2 min',
  ],
};

/* Durée et distance sont communes aux quatre types de course : ce sont elles
   qui donnent l'allure, seul repère comparable d'une sortie à l'autre. */
const CHAMPS_FOOTING = [
  { cle: 'duree_min', libelle: 'Durée (min)' },
  { cle: 'distance_km', libelle: 'Distance (km)' },
];

/* Gainage des jours de footing, demandé par l'utilisateur le 6 septembre
   2026. Il ne vient pas du classeur, contrairement aux exercices de
   musculation : les blocs J2 et J6 y sont dessinés en colonnes TEMPS et
   DISTANCE, où des lignes numérotées entreraient en collision avec ce que le
   pont écrit déjà. Il vit donc ici, comme TYPES_COURSE et les échauffements,
   et se saisit **en secondes de tenue**, une planche n'ayant ni charge ni
   répétitions. Le modèle est le gainage de J4 : 4 séries de 30 à 45 s. */
const GAINAGE_FOOTING = [
  {
    cle: 'planche_frontale',
    nom: 'Planche frontale',
    series: 4,
    tenue_min: 30,
    tenue_max: 45,
    consigne: "Appuis sur les avant-bras et les pointes de pieds. Bassin en rétrovérsion, "
      + "fessiers et abdominaux serrés, corps aligné des talons à la nuque. Pas de creux "
      + "dans le bas du dos : couper la série dès qu'il apparaît.",
  },
  {
    cle: 'planche_laterale',
    nom: 'Planche latérale',
    series: 4,
    tenue_min: 30,
    tenue_max: 45,
    consigne: "Un côté puis l'autre, sans repos supplémentaire entre les deux. Coude "
      + "à l'aplomb de l'épaule, hanches hautes, corps dans un seul plan. Le temps noté "
      + "est celui d'un côté.",
  },
];

/* Quatre séances de course distinctes, décidées le 26 août 2026. Chacune a
   son échauffement, parce que l'exigence n'est pas la même : une endurance
   fondamentale se lance presque à froid, un fractionné demande un corps déjà
   chaud sous peine de blessure. Les champs propres à chaque type restent
   volontairement peu nombreux, et chacun alimente une colonne du classeur
   plutôt qu'un champ texte libre, pour rester exploitable en graphique. */
const TYPES_COURSE = [
  {
    cle: 'ef',
    nom: 'Endurance',
    complet: 'Endurance fondamentale',
    champs: [],
    echauffement: [
      'Marche rapide, 2 min',
      'Montées de genoux et talons-fesses en marchant, 1 min',
      'Premier kilomètre en allure très facile, le corps monte en température seul',
    ],
  },
  {
    cle: 'fractionne',
    nom: 'Fractionné',
    complet: 'Fractionné',
    champs: [
      { cle: 'repetitions', libelle: 'Répétitions' },
      { cle: 'recup_s', libelle: 'Récup (s)' },
    ],
    echauffement: [
      '15 min en endurance fondamentale, sans forcer',
      'Montées de genoux, talons-fesses et pas chassés, 5 min',
      '3 accélérations progressives de 20 secondes, récupération complète entre chaque',
    ],
  },
  {
    cle: 'incline',
    nom: 'Incliné',
    complet: 'Incliné, option lesté ou farmer walk',
    champs: [
      { cle: 'pente_pct', libelle: 'Pente (%)' },
      { cle: 'charge_kg', libelle: 'Charge (kg)' },
    ],
    echauffement: [
      '10 min à plat en endurance fondamentale',
      'Montées de mollets et fentes marchées, 2 min',
      "Première montée à pente réduite et sans charge, 3 min",
    ],
  },
  {
    cle: 'seuil',
    nom: 'Seuil',
    complet: 'Séance au seuil',
    champs: [
      { cle: 'duree_seuil_min', libelle: 'Durée au seuil (min)' },
    ],
    echauffement: [
      '15 min en endurance fondamentale',
      'Gammes athlétiques, montées de genoux et pas chassés, 4 min',
      '2 accélérations de 30 secondes à allure seuil, récupération complète',
    ],
  },
];

let programme = null;
let seance = null;       // séance en cours, ou null
let reglages = lire(CLES.reglages, REGLAGES_PAR_DEFAUT);
let indexExo = 0;
let minuterie = null;    // { fin: ms, duree: s, libelle: string }
let tictac = null;
let tictacSeance = null;  // rafraîchit le chronomètre de la séance de musculation
let verrouVeille = null;
let audio = null;

/* ---------------------------------------------------------------- stockage */

function lire(cle, defaut) {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? Object.assign({}, defaut, JSON.parse(brut)) : defaut;
  } catch (e) {
    return defaut;
  }
}

function lireTableau(cle) {
  try {
    const brut = localStorage.getItem(cle);
    const valeur = brut ? JSON.parse(brut) : [];
    return Array.isArray(valeur) ? valeur : [];
  } catch (e) {
    return [];
  }
}

function cleConsigne(codeJour, nomExo) {
  return codeJour + '|' + nomExo;
}

/* Une consigne modifiée depuis le téléphone écrase celle du classeur pour cet
   exercice, mais uniquement en local : la cellule d'origine mélange plusieurs
   informations (prescription, RIR, muscle, repos) et n'est pas sûre à
   réécrire automatiquement. Voir CLAUDE.md, section "Le classeur". */
function consigneAffichee(codeJour, nomExo, consigneImportee) {
  const overrides = lire(CLES.consignes, {});
  const valeur = overrides[cleConsigne(codeJour, nomExo)];
  return valeur !== undefined ? valeur : (consigneImportee || '');
}

function enregistrerConsigne(codeJour, nomExo, texte) {
  const overrides = lire(CLES.consignes, {});
  overrides[cleConsigne(codeJour, nomExo)] = texte;
  ecrire(CLES.consignes, overrides);
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch (e) {
    console.warn('Enregistrement impossible', e);
  }
}

/* Plusieurs séances peuvent être en cours en même temps, une par jour :
   entrer dans J3 ne doit rien effacer de ce qui a été saisi dans J1
   (décision de l'utilisateur le 27 août 2026). Elles vivent dans une carte
   indexée par code de jour, là où une seule séance tenait auparavant sous
   `muscu.seance`. */
function lireSeancesEnCours() {
  try {
    const brut = localStorage.getItem(CLES.seances);
    if (brut) {
      const valeur = JSON.parse(brut);
      if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) return valeur;
    }
  } catch (e) {
    // Format illisible : on retombe sur l'ancienne clé plutôt que de perdre
    // une séance en cours.
  }

  const ancienne = lire(CLES.seance, null);
  if (ancienne && ancienne.jour && !ancienne.fin) {
    const carte = {};
    carte[ancienne.jour] = ancienne;
    return carte;
  }
  return {};
}

function ecrireSeancesEnCours(carte) {
  ecrire(CLES.seances, carte);
  localStorage.removeItem(CLES.seance);
}

function enregistrerSeance() {
  if (!seance || !seance.jour) return;
  const carte = lireSeancesEnCours();
  carte[seance.jour] = seance;
  ecrireSeancesEnCours(carte);
}

function oublierSeance(code) {
  const carte = lireSeancesEnCours();
  delete carte[code];
  ecrireSeancesEnCours(carte);
}

/* ------------------------------------------------------------------ écrans */

const $ = (id) => document.getElementById(id);

function afficher(nom) {
  document.querySelectorAll('.ecran').forEach((e) => e.classList.remove('actif'));
  $('ecran-' + nom).classList.add('actif');
  window.scrollTo(0, 0);
  const corps = $('ecran-' + nom).querySelector('.corps');
  if (corps) corps.scrollTop = 0;
}

/* ------------------------------------------------------------- utilitaires */

function jourDe(code) {
  return programme.jours.find((j) => j.code === code) || null;
}

function nombreOuNull(valeur) {
  if (valeur === '' || valeur === null || valeur === undefined) return null;
  const n = Number(String(valeur).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function texteDuree(secondes) {
  const s = Math.max(0, Math.round(secondes));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function dateCourte(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ilYA(iso) {
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  if (jours < 7) return 'il y a ' + jours + ' jours';
  const semaines = Math.round(jours / 7);
  return 'il y a ' + semaines + (semaines === 1 ? ' semaine' : ' semaines');
}

/* Le tonnage ignore l'échauffement : c'est le travail réel qu'on veut comparer. */
function tonnageDesSeries(series) {
  return series.reduce((somme, s) => {
    if (s.echauffement || !s.faite) return somme;
    return somme + (s.charge || 0) * (s.reps || 0);
  }, 0);
}

/* ------------------------------------------- ce qui a été fait la dernière fois */

/* Cherche d'abord dans les séances enregistrées sur le téléphone, puis dans
   l'historique repris du classeur. Le deload est écarté : comparer une séance
   normale à une semaine de décharge fausserait la lecture de la progression. */
function derniereFois(codeJour, nomExo) {
  const passees = lireTableau(CLES.historique)
    .filter((s) => s.jour === codeJour && s.fin)
    .sort((a, b) => new Date(b.fin) - new Date(a.fin));

  for (const s of passees) {
    if (seance && s.id === seance.id) continue;
    const exo = (s.exercices || []).find((e) => e.nom === nomExo);
    if (exo && exo.series.some((x) => x.faite)) {
      return {
        quand: s.fin,
        series: exo.series.filter((x) => x.faite && !x.echauffement),
        tonnage: tonnageDesSeries(exo.series),
      };
    }
  }

  const jour = jourDe(codeJour);
  const fiche = jour && jour.exercices.find((e) => e.nom === nomExo);
  if (!fiche || !fiche.historique.length) return null;
  const ancien = fiche.historique.filter((h) => !h.deload).pop();
  if (!ancien) return null;
  return {
    quand: null,
    dateTexte: ancien.date,
    series: ancien.series.filter((s) => !s.echauffement),
    tonnage: ancien.total,
  };
}

/* ---------------------------------------------------------------- accueil */

function rendreAccueil() {
  const liste = $('liste-jours');
  liste.innerHTML = '';
  const enCours = lireSeancesEnCours();

  programme.jours.forEach((jour) => {
    const item = document.createElement('li');
    const bouton = document.createElement('button');
    bouton.className = 'carte-jour';

    const titre = jour.titre.replace(/^J\d\s*/, '').replace(/^-\s*/, '');
    const [nom, ...reste] = titre.split(/\s+-\s+/);
    const derniere = derniereSeanceDuJour(jour.code);
    const commencee = enCours[jour.code] && !enCours[jour.code].fin;
    if (commencee) bouton.classList.add('en-cours');

    const detail = jour.type === 'footing'
      ? 'Durée et distance'
      : jour.exercices.length + ' exercices' +
        (reste.length ? ' &middot; ' + echapper(reste.join(' ')) : '');

    bouton.innerHTML =
      '<div class="carte-code">' + jour.code +
      (commencee ? '<span class="pastille-en-cours">en cours</span>' : '') +
      '</div>' +
      '<div class="carte-nom">' + echapper(nom || 'Footing') + '</div>' +
      '<div class="carte-detail">' + detail +
      (derniere ? '<br>Dernière : ' + ilYA(derniere.fin) : '') +
      '</div>';
    bouton.addEventListener('click', () => commencer(jour.code));

    item.appendChild(bouton);
    liste.appendChild(item);
  });

  rendreReprises(enCours);
  rendreEtatSync();
}

/* Une ligne par séance en cours, avec son propre bouton d'abandon : avec
   plusieurs jours ouverts en même temps, un bouton unique ne saurait pas
   lequel il abandonne. */
function rendreReprises(enCours) {
  const bloc = $('reprise');
  const liste = $('reprise-liste');
  const codes = Object.keys(enCours).filter((c) => enCours[c] && !enCours[c].fin);

  bloc.hidden = !codes.length;
  liste.innerHTML = '';
  if (!codes.length) return;

  codes.forEach((code) => {
    const ligne = document.createElement('div');
    ligne.className = 'reprise-ligne';

    const texte = document.createElement('span');
    texte.className = 'reprise-texte';
    texte.textContent = code + ' · commencée ' + ilYA(enCours[code].debut);

    const abandonner = document.createElement('button');
    abandonner.className = 'discret';
    abandonner.type = 'button';
    abandonner.textContent = 'Abandonner';
    abandonner.addEventListener('click', () => {
      if (!confirm('Abandonner la séance ' + code + ' ? Les séries saisies seront perdues.')) return;
      if (seance && seance.jour === code) seance = null;
      oublierSeance(code);
      rendreAccueil();
    });

    ligne.append(texte, abandonner);
    liste.appendChild(ligne);
  });
}

function derniereSeanceDuJour(code) {
  return lireTableau(CLES.historique)
    .filter((s) => s.jour === code && s.fin)
    .sort((a, b) => new Date(b.fin) - new Date(a.fin))[0] || null;
}

/* Dernière sortie d'un type de course donné, **tous jours de course
   confondus** : J2 et J6 sont le même entraînement, comparer une endurance
   du mardi à une endurance du samedi a du sens, les opposer par jour n'en
   aurait aucun (décision de l'utilisateur le 27 août 2026). */
function derniereSortie(cle) {
  const passees = lireTableau(CLES.historique)
    .filter((s) => s.type === 'footing' && s.fin)
    .sort((a, b) => new Date(b.fin) - new Date(a.fin));

  for (const s of passees) {
    if (seance && s.id === seance.id) continue;
    const cycle = premierPassage(footingParType(s)[cle]);
    if (cycle && cycle.duree_min && cycle.distance_km) return cycle;
  }
  return null;
}

function echapper(texte) {
  const d = document.createElement('div');
  d.textContent = texte == null ? '' : String(texte);
  return d.innerHTML;
}

function rendreEtatSync() {
  const attente = lireTableau(CLES.historique).filter((s) => s.fin && !s.envoye);
  const cible = $('etat-sync');
  if (!attente.length) {
    cible.textContent = reglages.pont ? 'Classeur à jour.' : 'Pont vers le classeur non configuré.';
    return;
  }
  cible.textContent = attente.length + ' séance' + (attente.length > 1 ? 's' : '') +
    ' en attente d\'envoi vers le classeur.';
}

/* -------------------------------------------------------- démarrer / reprendre */

/* Ouvre un jour : reprend la séance déjà commencée dessus s'il y en a une,
   en crée une sinon. Ne remplace jamais une séance en cours par une neuve,
   c'est tout l'intérêt de la carte par jour. */
function commencer(code) {
  const jour = jourDe(code);
  if (!jour) return;

  const carte = lireSeancesEnCours();
  const reprise = carte[code] && !carte[code].fin;
  seance = reprise ? carte[code] : nouvelleSeance(jour);

  indexExo = reprise ? positionDeReprise() : 0;
  enregistrerSeance();
  demanderVeille();
  afficher('seance');

  if (jour.type === 'footing') {
    rendreFooting();
  } else {
    // Ouvrir un jour de musculation démarre le chronomètre de séance : sans
    // ce geste dédié, il fallait y penser soi-même en plein échauffement.
    demarrerChronoSeance();
    rendreExercice();
  }
}

function nouvelleSeance(jour) {
  const neuve = {
    id: 'S' + Date.now(),
    jour: jour.code,
    titre: jour.titre,
    type: jour.type,
    debut: new Date().toISOString(),
    fin: null,
    envoye: false,
    exercices: jour.exercices.map((exo) => ({
      numero: exo.numero,
      nom: exo.nom,
      muscle: exo.muscle,
      repos_s: exo.repos_s,
      series: nouvellesSeries(exo),
    })),
  };
  // Les quatre types de course sont des exercices distincts, chacun avec ses
  // propres chiffres : la carte reste vide et se remplit au fur et à mesure.
  if (jour.type === 'footing') {
    neuve.footing = {};
    // Une entrée par exercice de gainage, chacune un tableau de secondes de
    // tenue, une case par série. Créées vides plutôt qu'à la demande : leur
    // nombre est connu d'avance, contrairement aux types de course.
    neuve.gainage = {};
    GAINAGE_FOOTING.forEach((exo) => {
      neuve.gainage[exo.cle] = new Array(exo.series).fill(null);
    });
  }
  return neuve;
}

/* Reprend là où la saisie s'est arrêtée : premier exercice dont une série
   reste à faire, le dernier si tout est déjà rempli. */
function positionDeReprise() {
  if (estFooting()) return 0;
  const index = seance.exercices.findIndex((e) => e.series.some((s) => !s.faite));
  return index < 0 ? seance.exercices.length - 1 : index;
}

function nouvellesSeries(exo) {
  const combien = exo.series || 3;
  const series = [];
  for (let i = 0; i < combien; i++) {
    series.push({
      charge: null,
      reps: null,
      rir: exo.rir && exo.rir[i] !== undefined ? exo.rir[i] : null,
      faite: false,
      echauffement: false,
    });
  }
  return series;
}


/* ---------------------------------------------------------------- exercice */

function ficheExercice() {
  const jour = jourDe(seance.jour);
  const courant = seance.exercices[indexExo];
  return jour.exercices.find((e) => e.nom === courant.nom) || {};
}

/* --------------------------------------------------------------- footing */

function estFooting() {
  return seance && seance.type === 'footing';
}

/* Les séances de footing commencées avant le 6 septembre 2026 n'ont pas de
   carte de gainage : on la complète à la lecture plutôt que de casser une
   reprise en cours. */
function tenuesGainage(exo) {
  if (!seance.gainage) seance.gainage = {};
  const actuelles = seance.gainage[exo.cle];
  if (!Array.isArray(actuelles) || actuelles.length !== exo.series) {
    const neuves = new Array(exo.series).fill(null);
    if (Array.isArray(actuelles)) {
      actuelles.slice(0, exo.series).forEach((v, i) => { neuves[i] = v; });
    }
    seance.gainage[exo.cle] = neuves;
  }
  return seance.gainage[exo.cle];
}

/* Les quatre types de course sont des exercices distincts, pas quatre modes
   d'un même exercice : chacun garde ses propres chiffres, et les quatre
   peuvent être faits le même jour (décision de l'utilisateur le 27 août
   2026). `seance.footing` est donc une carte indexée par type.

   Depuis le 8 septembre 2026, chaque type peut compter **plusieurs
   passages** dans la même séance (demande de l'utilisateur : refaire
   l'Incliné à une autre charge sans écraser le premier passage) :
   `seance.footing[cle]` est donc un tableau de cycles, chacun avec ses
   propres chiffres, plutôt qu'un objet plat limité à un seul passage. */
function cyclesCourse(cle) {
  const brut = seance.footing[cle];
  if (Array.isArray(brut)) return brut;
  // Séance reprise, commencée avant le 8 septembre 2026 : un seul passage à
  // plat, qu'on range dans un tableau à une case plutôt que de le perdre.
  const cycles = [brut && typeof brut === 'object' ? brut : {}];
  seance.footing[cle] = cycles;
  return cycles;
}

/* Les séances antérieures au 27 août 2026 rangeaient une seule sortie à
   plat dans `footing` ; celles d'entre le 27 août et le 8 septembre 2026,
   un seul passage par type. Les deux sont relues comme un tableau d'un
   cycle, pour que `derniereSortie()` et le résumé de fin de séance n'aient
   qu'un seul format à traiter. */
function footingParType(s) {
  const f = s.footing || {};
  if (f.duree_min !== undefined || f.distance_km !== undefined) {
    const carte = {};
    carte[f.type || 'ef'] = [f];
    return carte;
  }
  const carte = {};
  Object.keys(f).forEach((type) => {
    const brut = f[type];
    carte[type] = Array.isArray(brut) ? brut : [brut];
  });
  return carte;
}

/* Le premier passage d'un type sert de référence pour la comparaison à la
   dernière fois (voir majAllureCycle) : les passages suivants n'ont pas
   d'équivalent fixe d'une séance à l'autre, leur nombre pouvant varier. */
function premierPassage(donnees) {
  if (!donnees) return null;
  return Array.isArray(donnees) ? (donnees[0] || null) : donnees;
}

function champCycle(cycle, definition, actualiser) {
  const etiquette = document.createElement('label');
  const titre = document.createElement('span');
  titre.textContent = definition.libelle;

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  const valeur = cycle[definition.cle];
  input.value = valeur === null || valeur === undefined ? '' : String(valeur);
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => {
    cycle[definition.cle] = nombreOuNull(input.value);
    enregistrerSeance();
    actualiser();
  });

  etiquette.append(titre, input);
  return etiquette;
}

function rendreFooting() {
  const jour = jourDe(seance.jour);
  $('bloc-muscu').hidden = true;
  $('bloc-footing').hidden = false;
  $('bouton-precedent').hidden = true;
  $('bouton-suivant').hidden = true;

  $('seance-jour').textContent = jour.titre.split(/\s+-\s+/)[0];
  $('seance-progression').textContent = '';

  const type = TYPES_COURSE[indexExo];
  $('footing-nom').textContent = type.complet;

  const boutons = $('footing-types');
  boutons.innerHTML = '';
  TYPES_COURSE.forEach((candidat, position) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'type-course' + (position === indexExo ? ' choisi' : '') +
      (typeRempli(candidat.cle) ? ' rempli' : '');
    bouton.textContent = candidat.nom;
    bouton.addEventListener('click', () => {
      // Changer de type change d'exercice, il n'efface plus rien : les
      // quatre gardent leurs chiffres en parallèle.
      indexExo = position;
      rendreFooting();
    });
    boutons.appendChild(bouton);
  });

  $('echauffement-footing-liste').innerHTML =
    type.echauffement.map((item) => '<li>' + echapper(item) + '</li>').join('');

  rendreCyclesCourse();
  rendreGainage();
}

/* Un type est « rempli » dès qu'un de ses passages porte une durée ou une
   distance, quel que soit son rang. */
function typeRempli(cle) {
  const brut = seance.footing[cle];
  if (!brut) return false;
  const cycles = Array.isArray(brut) ? brut : [brut];
  return cycles.some((c) => c.duree_min != null || c.distance_km != null);
}

/* Un ou plusieurs passages du type choisi, chacun avec ses propres champs
   (communs via CHAMPS_FOOTING, propres au type via type.champs) et sa
   propre allure. Seul le premier passage se compare à la dernière sortie
   (voir majAllureCycle) : les passages suivants n'ont pas d'équivalent fixe
   d'une séance à l'autre. */
function rendreCyclesCourse() {
  const type = TYPES_COURSE[indexExo];
  const cycles = cyclesCourse(type.cle);
  const bloc = $('footing-cycles');
  bloc.innerHTML = '';

  cycles.forEach((cycle, index) => {
    const carte = document.createElement('div');
    carte.className = 'cycle-course';

    if (cycles.length > 1) {
      const entete = document.createElement('div');
      entete.className = 'cycle-course-entete';
      const titre = document.createElement('span');
      titre.textContent = 'Passage ' + (index + 1);
      const supprimer = document.createElement('button');
      supprimer.type = 'button';
      supprimer.className = 'cycle-course-suppr';
      supprimer.setAttribute('aria-label', 'Supprimer ce passage');
      supprimer.textContent = '×';
      supprimer.addEventListener('click', () => {
        cycles.splice(index, 1);
        enregistrerSeance();
        rendreCyclesCourse();
      });
      entete.append(titre, supprimer);
      carte.appendChild(entete);
    }

    const allure = document.createElement('p');
    allure.className = 'footing-allure';
    const compare = document.createElement('p');
    compare.className = 'compare';
    const cleComparaison = index === 0 ? type.cle : null;
    const actualiser = () => {
      majPastillesTypes();
      majAllureCycle(cycle, allure, compare, cleComparaison);
    };

    const champs = document.createElement('div');
    champs.className = 'footing-champs';
    CHAMPS_FOOTING.forEach((definition) => champs.appendChild(champCycle(cycle, definition, actualiser)));
    carte.appendChild(champs);

    if (type.champs.length) {
      const champsType = document.createElement('div');
      champsType.className = 'footing-champs';
      type.champs.forEach((definition) => champsType.appendChild(champCycle(cycle, definition, actualiser)));
      carte.appendChild(champsType);
    }

    carte.append(allure, compare);
    majAllureCycle(cycle, allure, compare, cleComparaison);

    bloc.appendChild(carte);
  });

  majPastillesTypes();
}

/* Le gainage ne dépend pas du type de course choisi : il est commun à la
   journée, et se redessine avec le reste sans se vider. */
function rendreGainage() {
  const bloc = $('footing-gainage-liste');
  bloc.innerHTML = '';

  GAINAGE_FOOTING.forEach((exo) => {
    const tenues = tenuesGainage(exo);

    const carte = document.createElement('div');
    carte.className = 'gainage-exo';

    const titre = document.createElement('p');
    titre.className = 'gainage-nom';
    titre.textContent = exo.nom;
    const prescription = document.createElement('span');
    prescription.className = 'etiquette';
    prescription.textContent = exo.series + ' × ' + exo.tenue_min + '-' + exo.tenue_max + ' s';
    titre.appendChild(prescription);
    carte.appendChild(titre);

    const ligne = document.createElement('div');
    ligne.className = 'gainage-series';
    tenues.forEach((valeur, index) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.enterKeyHint = 'next';
      input.className = 'gainage-tenue';
      input.value = valeur === null || valeur === undefined ? '' : String(valeur);
      input.placeholder = String(exo.tenue_min);
      input.setAttribute('aria-label', exo.nom + ', série ' + (index + 1) + ', secondes');
      input.addEventListener('focus', () => input.select());
      input.addEventListener('input', () => {
        tenuesGainage(exo)[index] = nombreOuNull(input.value);
        enregistrerSeance();
      });
      ligne.appendChild(input);
    });
    carte.appendChild(ligne);

    const consigne = document.createElement('p');
    consigne.className = 'gainage-consigne';
    consigne.textContent = exo.consigne;
    carte.appendChild(consigne);

    bloc.appendChild(carte);
  });
}

/* La pastille des types remplis se recalcule à chaque frappe, pas seulement
   au rendu : sans cela, celui qu'on est en train de saisir ne s'allumait
   qu'après en avoir changé, ce qui donnait un tableau de bord en retard. */
function majPastillesTypes() {
  const boutons = $('footing-types').querySelectorAll('.type-course');
  TYPES_COURSE.forEach((candidat, position) => {
    if (boutons[position]) boutons[position].classList.toggle('rempli', typeRempli(candidat.cle));
  });
}

/* L'allure au kilomètre est le repère habituel du coureur, plus parlant que
   la vitesse en km/h : calculée dès que durée et distance sont saisies,
   pour **un passage donné**. Depuis le 8 septembre 2026, un type peut
   compter plusieurs passages (voir rendreCyclesCourse) : seul celui passé
   en `cle` se compare à la dernière sortie, les autres n'affichent que leur
   propre allure. */
function majAllureCycle(cycle, cibleAllure, cibleCompare, cle) {
  const duree = cycle.duree_min;
  const distance = cycle.distance_km;

  if (!duree || !distance) {
    cibleAllure.textContent = '';
    cibleCompare.textContent = '';
    cibleCompare.className = 'compare';
    return;
  }

  const allure = duree / distance;
  const minutes = Math.floor(allure);
  const secondes = Math.round((allure - minutes) * 60);
  cibleAllure.textContent = 'Allure ' + minutes + ':' + String(secondes).padStart(2, '0') + ' / km';

  cibleCompare.className = 'compare';
  if (!cle) {
    cibleCompare.textContent = '';
    return;
  }
  const precedente = derniereSortie(cle);
  if (!precedente) {
    cibleCompare.textContent = '';
    return;
  }
  const allureAvant = precedente.duree_min / precedente.distance_km;
  const ecart = allure - allureAvant;
  const ecartSecondes = Math.round(Math.abs(ecart) * 60);
  if (ecartSecondes < 3) {
    cibleCompare.textContent = 'Même allure que la dernière fois.';
    return;
  }
  // Une allure plus basse est plus rapide : le sens de la couleur s'inverse.
  cibleCompare.textContent = ecartSecondes + ' s/km ' + (ecart < 0 ? 'plus rapide' : 'plus lent') + " qu'à la dernière sortie.";
  cibleCompare.classList.add(ecart < 0 ? 'hausse' : 'baisse');
}

/* ------------------------------------------- chronomètre de la séance entière */

/* Compté depuis l'horodatage de départ plutôt que par incréments : le
   téléphone verrouillé ou l'application en arrière-plan, ce qui arrive à
   chaque série, ne fait donc rien perdre. La durée obtenue part dans le
   classeur et sert de repère de densité d'entraînement. */
function chronoSeance() {
  if (!seance.chrono) seance.chrono = { demarre: null, cumul: 0, arrete: false };
  return seance.chrono;
}

function dureeSeanceMs() {
  const chrono = chronoSeance();
  return (chrono.cumul || 0) + (chrono.demarre ? Date.now() - chrono.demarre : 0);
}

function majChronoSeance() {
  const chrono = chronoSeance();
  const demarrer = $('chrono-seance-demarrer');
  const ecoule = dureeSeanceMs();

  demarrer.classList.toggle('tourne', !!chrono.demarre);
  $('chrono-seance-temps').textContent = ecoule ? texteDuree(ecoule / 1000) : '';
  demarrer.querySelector('.chrono-seance-icone').innerHTML = chrono.demarre ? '&#10073;&#10073;' : '&#9654;';
}

/* Démarre le chronomètre s'il ne tourne pas déjà, sans jamais le mettre en
   pause : contrairement à basculerChronoSeance(), ce n'est pas un bouton
   actionné volontairement, donc pas un bascule. Appelé à l'ouverture d'un
   jour de musculation, neuf ou repris. */
function demarrerChronoSeance() {
  const chrono = chronoSeance();
  if (chrono.demarre) return;
  chrono.demarre = Date.now();
  chrono.arrete = false;
  if (!tictacSeance) tictacSeance = setInterval(majChronoSeance, 1000);
  enregistrerSeance();
  majChronoSeance();
}

function basculerChronoSeance() {
  const chrono = chronoSeance();
  if (chrono.demarre) {
    chrono.cumul = (chrono.cumul || 0) + (Date.now() - chrono.demarre);
    chrono.demarre = null;
    if (tictacSeance) { clearInterval(tictacSeance); tictacSeance = null; }
  } else {
    chrono.demarre = Date.now();
    chrono.arrete = false;
    if (!tictacSeance) tictacSeance = setInterval(majChronoSeance, 1000);
  }
  enregistrerSeance();
  majChronoSeance();
}

function arreterChronoSeance() {
  const chrono = chronoSeance();
  if (chrono.demarre) {
    chrono.cumul = (chrono.cumul || 0) + (Date.now() - chrono.demarre);
    chrono.demarre = null;
  }
  chrono.arrete = true;
  if (tictacSeance) { clearInterval(tictacSeance); tictacSeance = null; }
  enregistrerSeance();
  majChronoSeance();
}

function rendreExercice() {
  const jour = jourDe(seance.jour);
  const courant = seance.exercices[indexExo];
  const fiche = ficheExercice();

  $('bloc-muscu').hidden = false;
  $('bloc-footing').hidden = true;
  $('bouton-precedent').hidden = false;
  $('bouton-suivant').hidden = false;

  $('seance-jour').textContent = jour.titre.split(/\s+-\s+/)[0];
  $('seance-progression').textContent = (indexExo + 1) + '/' + seance.exercices.length;
  $('jauge-remplie').style.width = (100 * proportionFaite()) + '%';

  majChronoSeance();
  if (chronoSeance().demarre && !tictacSeance) {
    tictacSeance = setInterval(majChronoSeance, 1000);
  }

  $('exo-nom').textContent = courant.nom;
  $('exo-muscle').textContent = fiche.muscle || '';
  $('exo-prescription').textContent = fiche.series
    ? fiche.series + ' × ' + (fiche.reps_min === fiche.reps_max
        ? fiche.reps_min
        : fiche.reps_min + '-' + fiche.reps_max)
    : '';
  $('exo-rir').textContent = fiche.rir && fiche.rir.length ? 'RIR ' + fiche.rir.join(' / ') : '';

  const blocEchauffement = $('echauffement-jour');
  const listeEchauffement = indexExo === 0 ? ECHAUFFEMENT_PAR_JOUR[seance.jour] : null;
  blocEchauffement.hidden = !listeEchauffement;
  if (listeEchauffement) {
    $('echauffement-liste').innerHTML = listeEchauffement.map((item) => '<li>' + echapper(item) + '</li>').join('');
  }

  quitterEditionConsigne();
  const texte = consigneAffichee(seance.jour, courant.nom, fiche.consigne);
  $('exo-consigne').textContent = texte || 'Aucune consigne pour cet exercice.';
  $('exo-consigne').classList.toggle('vide-consigne', !texte);

  rendreSeries();

  $('bouton-precedent').disabled = indexExo === 0;
  $('bouton-suivant').disabled = indexExo === seance.exercices.length - 1;
}

function quitterEditionConsigne() {
  $('exo-consigne').hidden = false;
  $('exo-consigne-champ').hidden = true;
  $('bouton-consigne-modifier').hidden = false;
  $('bouton-consigne-enregistrer').hidden = true;
  $('bouton-consigne-annuler').hidden = true;
}

function modifierConsigne() {
  const champ = $('exo-consigne-champ');
  champ.value = $('exo-consigne').classList.contains('vide-consigne') ? '' : $('exo-consigne').textContent;
  champ.hidden = false;
  $('exo-consigne').hidden = true;
  $('bouton-consigne-modifier').hidden = true;
  $('bouton-consigne-enregistrer').hidden = false;
  $('bouton-consigne-annuler').hidden = false;
  champ.focus();
}

function enregistrerEditionConsigne() {
  const texte = $('exo-consigne-champ').value.trim();
  const courant = seance.exercices[indexExo];
  enregistrerConsigne(seance.jour, courant.nom, texte);
  $('exo-consigne').textContent = texte || 'Aucune consigne pour cet exercice.';
  $('exo-consigne').classList.toggle('vide-consigne', !texte);
  quitterEditionConsigne();
}

/* Colore les champs d'une série validée selon son écart de tonnage avec la
   même série la semaine passée : en dessous de -5 %, au-dessus de +6 %, sinon
   neutre. Éprouvé sur J1 puis étendu à tous les jours le 26 août 2026. */
function appliquerCouleurTonnage(ligne, serie, reference) {
  ligne.classList.remove('tonnage-hausse', 'tonnage-baisse');
  if (!serie.faite || serie.echauffement || !reference) return;

  const tonnageAvant = (reference.charge || 0) * (reference.reps || 0);
  if (!tonnageAvant) return;
  const tonnageMaintenant = (serie.charge || 0) * (serie.reps || 0);
  const ecart = ((tonnageMaintenant - tonnageAvant) / tonnageAvant) * 100;

  if (ecart <= -5) ligne.classList.add('tonnage-baisse');
  else if (ecart >= 6) ligne.classList.add('tonnage-hausse');
}

function proportionFaite() {
  let total = 0;
  let faites = 0;
  seance.exercices.forEach((e) => {
    e.series.forEach((s) => {
      total++;
      if (s.faite) faites++;
    });
  });
  return total ? faites / total : 0;
}

function rendreSeries() {
  const courant = seance.exercices[indexExo];
  const avant = derniereFois(seance.jour, courant.nom);
  const liste = $('series');
  liste.innerHTML = '';

  let rangTravail = 0;
  // Ordre de navigation au clavier (touche Entrée du pavé numérique) : les
  // trois champs de chaque ligne, ligne après ligne. Plus de bouton dans
  // cette liste depuis le 27 août 2026 : les répétitions confirmées valident
  // déjà et avancent toutes seules (voir plus bas), Entrée n'y sert donc qu'à
  // sauter au champ suivant sans attendre la frappe.
  const enchainement = [];

  courant.series.forEach((serie, index) => {
    const ligne = document.createElement('li');
    ligne.className = 'ligne-serie';
    if (serie.faite) ligne.classList.add('faite');
    if (serie.echauffement) ligne.classList.add('echauffement');
    if (index === prochaineSerie(courant)) ligne.classList.add('courante');

    const rang = serie.echauffement ? null : rangTravail++;
    const reference = (avant && rang !== null) ? avant.series[rang] : null;
    appliquerCouleurTonnage(ligne, serie, reference);

    const champCharge = champ(serie.charge, reference ? reference.charge : null, 'kg', (v) => {
      serie.charge = v;
      enregistrerSeance();
      majTonnage();
      appliquerCouleurTonnage(ligne, serie, reference);
    });

    // Ce sont les **répétitions** qui valident la série, et à leur
    // confirmation, pas à la frappe (décision de l'utilisateur le 6 septembre
    // 2026) : taper le 1 de 10 ne doit pas valider une série au passage. La
    // frappe se contente d'enregistrer le chiffre ; la validation attend
    // Entrée ou la sortie du champ. Les effacer annule la validation, sur le
    // même principe symétrique.
    const champReps = champ(serie.reps, reference ? reference.reps : null, 'reps', (v) => {
      const etaitFaite = serie.faite;
      serie.reps = v;
      if (v == null && etaitFaite) {
        serie.faite = false;
        enregistrerSeance();
        rendreSeries();
        rendreJauge();
        return;
      }
      enregistrerSeance();
      majTonnage();
      appliquerCouleurTonnage(ligne, serie, reference);
    });
    champReps.dataset.role = 'reps';

    const validerReps = () => {
      if (serie.faite || serie.reps == null) return;
      validerSerie(courant, serie, index);
    };
    champReps.addEventListener('change', validerReps);
    champReps.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Enter') return;
      evenement.preventDefault();
      validerReps();
    });

    // Le RIR ne vaut plus validation depuis le 6 septembre 2026 : il n'est
    // qu'indicatif, on l'enregistre sans qu'il décide de rien.
    const champRir = champ(serie.rir, reference ? reference.rir : null, 'RIR', (v) => {
      serie.rir = v;
      enregistrerSeance();
    });

    // Suppression d'une série en trop (demande de l'utilisateur le
    // 7 septembre 2026) : sans confirmation, la série étant facile à
    // rajouter et rien n'étant encore synchronisé pendant la séance.
    const supprimer = document.createElement('button');
    supprimer.type = 'button';
    supprimer.className = 'ligne-serie-suppr';
    supprimer.setAttribute('aria-label', 'Supprimer cette série');
    supprimer.textContent = '×';
    supprimer.addEventListener('click', () => {
      courant.series.splice(index, 1);
      enregistrerSeance();
      rendreSeries();
      rendreJauge();
    });

    ligne.append(champCharge, champReps, champRir, supprimer);
    liste.appendChild(ligne);
    enchainement.push(champCharge, champReps, champRir);
  });

  enchainement.forEach((element, position) => {
    // Le champ des répétitions est exclu : Entrée y vaut validation, gérée
    // plus haut, et c'est la validation elle-même qui déplace ensuite le focus.
    if (element.dataset.role === 'reps') return;
    element.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Enter') return;
      evenement.preventDefault();
      const suivant = enchainement[position + 1];
      if (!suivant) return;
      suivant.focus();
      suivant.select();
    });
  });

  majTonnage(avant);
}

function prochaineSerie(exercice) {
  const index = exercice.series.findIndex((s) => !s.faite);
  return index < 0 ? -1 : index;
}

function champ(valeur, suggestion, etiquette, aChange) {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.enterKeyHint = 'next';
  input.value = valeur === null || valeur === undefined ? '' : String(valeur);
  input.placeholder = suggestion === null || suggestion === undefined ? '' : String(suggestion);
  input.setAttribute('aria-label', etiquette);
  input.addEventListener('input', () => aChange(nombreOuNull(input.value)));
  input.addEventListener('focus', () => input.select());
  return input;
}

/* Compare deux cumuls comparables, jamais un cumul en cours au total fini de
   la dernière fois : sans quoi la première série de la séance afficherait
   presque toujours un grand écart négatif, y compris quand elle est
   meilleure que son équivalent précédent, puisqu'elle serait comparée à
   quatre séries contre une seule. La comparaison porte donc sur autant de
   séries de travail que ce qui a déjà été validé aujourd'hui. Le repère
   intermédiaire ("à ce stade") a été retiré le 26 août 2026 : jugé sans
   intérêt une fois la coloration par série en place (voir rendreSeries). Le
   total de la semaine passée, lui, reste affiché en permanence dès le début
   de l'exercice, pour servir de repère avant même la première série. */
function majTonnage(avantConnu) {
  const courant = seance.exercices[indexExo];
  const avant = avantConnu !== undefined ? avantConnu : derniereFois(seance.jour, courant.nom);
  const actuel = tonnageDesSeries(courant.series);

  $('tonnage-actuel').textContent = actuel;

  const cible = $('tonnage-compare');
  cible.className = 'compare';
  if (!avant || !avant.series.length) {
    cible.textContent = '';
    return;
  }

  const faites = courant.series.filter((s) => !s.echauffement && s.faite).length;
  if (faites < avant.series.length) {
    cible.textContent = 'semaine dernière ' + avant.tonnage;
    return;
  }

  const ecart = actuel - avant.tonnage;
  const signe = ecart > 0 ? '+' : '';
  cible.textContent = 'semaine dernière ' + avant.tonnage + ' (' + signe + ecart + ')';
  if (ecart > 0) cible.classList.add('hausse');
  else if (ecart < 0) cible.classList.add('baisse');
}

/* Valide une série dès que ses répétitions sont confirmées (voir
   rendreSeries) : plus de bouton depuis le 27 août 2026, et la validation est
   passée du RIR aux répétitions le 6 septembre 2026, le RIR n'étant
   qu'indicatif. Décisions de l'utilisateur. */
function validerSerie(exercice, serie, index) {
  // Amorcer le clavier avant tout changement de DOM (voir amorcerClavier) :
  // le geste (Entrée ou la sortie du champ) est encore "chaud" à cet instant
  // précis, il ne l'est déjà plus une fois rendreSeries()/rendreExercice()
  // passé, qui remplacent le champ focalisé par un nouveau. Manquant ici
  // jusqu'au 7 septembre 2026 : le focus arrivait bien sur la série
  // suivante, mais sans rouvrir le clavier.
  amorcerClavier();

  // Une série validée sans chiffres n'apprend rien : on reprend ceux de la
  // dernière fois, affichés en filigrane, plutôt que d'enregistrer un vide.
  if (serie.charge == null || serie.reps == null) {
    const avant = derniereFois(seance.jour, exercice.nom);
    const rang = exercice.series.slice(0, index).filter((s) => !s.echauffement).length;
    const reference = avant && !serie.echauffement ? avant.series[rang] : null;
    if (reference) {
      if (serie.charge == null) serie.charge = reference.charge;
      if (serie.reps == null) serie.reps = reference.reps;
    }
  }

  serie.faite = true;
  serie.heure = new Date().toISOString();
  enregistrerSeance();

  // La fiche du repos se lit avant tout changement d'exercice : c'est le
  // temps de récupération de l'exercice qu'on vient de finir qui compte.
  const fiche = ficheExercice();
  const repos = fiche.repos_s;

  // Dernière série d'un exercice : on passe au suivant sans attendre la fin
  // de la récupération (décision de l'utilisateur le 27 août 2026). La
  // minuterie continue de tourner par-dessus la fiche suivante, on peut donc
  // lire le prochain exercice pendant qu'on récupère du précédent.
  const toutFait = exercice.series.every((s) => s.faite);
  if (toutFait && indexExo < seance.exercices.length - 1) {
    indexExo++;
    rendreExercice();
  } else {
    rendreSeries();
    rendreJauge();
  }
  focaliserProchaineSerie();

  if (!serie.echauffement || repos) {
    lancerMinuterie(repos || 90);
  }
}

function rendreJauge() {
  $('jauge-remplie').style.width = (100 * proportionFaite()) + '%';
}

/* --------------------------------------------------------------- minuterie */

function lancerMinuterie(secondes) {
  minuterie = {
    fin: Date.now() + secondes * 1000,
    duree: secondes,
  };
  $('minuterie').hidden = false;
  battre();
  if (tictac) clearInterval(tictac);
  tictac = setInterval(battre, 250);

  // Jusqu'au 7 septembre 2026, le clavier restait ouvert pendant tout le
  // repos mais **sur l'amorce**, jamais sur le vrai champ : la charge de la
  // série suivante restait donc infaisable tant que le décompte ne touchait
  // pas zéro. `validerSerie()` focalise désormais directement le champ
  // charge de la série suivante avant d'appeler cette fonction
  // (`focaliserProchaineSerie()`) : le clavier est déjà ouvert et connecté
  // au bon champ, prêt à remplir la charge pendant la récupération
  // elle-même, ce que l'utilisateur a demandé. Le réglage
  // `clavierPendantRecup` ne sert donc plus qu'à fermer volontairement ce
  // clavier quand il n'est pas voulu pendant le repos.
  if (!reglages.clavierPendantRecup) {
    const actif = document.activeElement;
    if (actif && actif !== document.body) actif.blur();
  }
}

function battre() {
  if (!minuterie) return;
  const restant = (minuterie.fin - Date.now()) / 1000;

  // Le temps écoulé ne s'affiche plus en "trop-plein" : la minuterie se
  // ferme d'elle-même dès zéro, décision de l'utilisateur le 26 août 2026.
  if (restant <= 0) {
    signaler();
    minuterieTerminee();
    return;
  }

  $('minuterie-chiffres').textContent = texteDuree(restant);
}

function arreterMinuterie() {
  minuterie = null;
  if (tictac) clearInterval(tictac);
  tictac = null;
  $('minuterie').hidden = true;
}

/* Ferme la minuterie, à zéro comme sur un appui. Le passage à l'exercice
   suivant ne se fait plus ici depuis le 27 août 2026 : il a lieu dès la
   validation de la dernière série (voir validerSerie), la minuterie
   continuant de tourner par-dessus la fiche suivante. */
function minuterieTerminee(gesteUtilisateur) {
  // L'amorce est focalisée en tout premier, tant que le geste est encore
  // "chaud" : c'est ce qui décide le navigateur à ouvrir le clavier.
  if (gesteUtilisateur) amorcerClavier();

  arreterMinuterie();
  if (!seance || estFooting()) return;

  const courant = seance.exercices[indexExo];
  const fini = courant.series.every((s) => s.faite);
  if (fini && indexExo === seance.exercices.length - 1 && chronoSeance().demarre) {
    // Le bouton d'arrêt manuel a été retiré : la récupération de la dernière
    // série du dernier exercice est l'un des trois seuls moments qui arrêtent
    // le chronomètre de séance (les deux autres : deuxième appui sur le
    // bouton de démarrage, et enregistrement de la séance dans terminer()).
    arreterChronoSeance();
  }
  focaliserProchaineSerie();
}

/* Ouvre le clavier virtuel en focalisant un champ qui existe depuis le
   chargement de la page.

   Firefox Android, comme les autres navigateurs mobiles, n'ouvre le clavier
   que si focus() découle directement d'un geste de l'utilisateur. Deux choses
   le font échouer ici : le champ visé peut venir d'être recréé par
   rendreExercice(), et le bouton qui portait le geste est masqué au même
   instant. Passer par un champ permanent contourne les deux, et le transfert
   de focus vers le vrai champ, d'un champ texte à un autre, garde le clavier
   ouvert. */
function amorcerClavier() {
  const amorce = $('amorce-clavier');
  if (amorce) amorce.focus({ preventScroll: true });
}

/* Place le curseur sur le champ charge de la prochaine série non validée, où
   qu'elle se trouve après la fermeture de la minuterie (même exercice ou
   suivant), pour reprendre la saisie sans toucher l'écran. */
function focaliserProchaineSerie() {
  const courant = seance.exercices[indexExo];
  const index = prochaineSerie(courant);
  if (index < 0) return;
  const ligne = document.querySelectorAll('.ligne-serie')[index];
  const champCharge = ligne && ligne.querySelector('input');
  if (!champCharge) return;
  champCharge.focus({ preventScroll: true });
  champCharge.select();
}

function signaler() {
  if (reglages.vibration && navigator.vibrate) navigator.vibrate([180, 90, 180]);
  if (!reglages.son) return;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    // Volume porté de 0.3 à 0.9 le 7 septembre 2026, demande de l'utilisateur :
    // le signal doit s'entendre depuis l'autre bout de la salle. 0.9 plutôt
    // que 1 pour garder une marge avant écrêtage du haut-parleur du téléphone.
    [0, 0.22, 0.44].forEach((decalage) => {
      const oscillateur = audio.createOscillator();
      const volume = audio.createGain();
      oscillateur.frequency.value = 880;
      oscillateur.connect(volume);
      volume.connect(audio.destination);
      const debut = audio.currentTime + decalage;
      volume.gain.setValueAtTime(0.0001, debut);
      volume.gain.exponentialRampToValueAtTime(0.9, debut + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, debut + 0.18);
      oscillateur.start(debut);
      oscillateur.stop(debut + 0.2);
    });
  } catch (e) {
    console.warn('Signal sonore indisponible', e);
  }
}

/* ------------------------------------------------------------------ veille */

/* Un téléphone qui s'éteint entre deux séries oblige à le déverrouiller les
   mains pleines. Le verrou est relâché par le système à chaque masquage de
   l'onglet : on le redemande au retour. */
function demanderVeille() {
  if (!reglages.veille || !('wakeLock' in navigator)) return;
  navigator.wakeLock.request('screen').then((verrou) => {
    verrouVeille = verrou;
  }).catch(() => {});
}

function relacherVeille() {
  if (verrouVeille) {
    verrouVeille.release().catch(() => {});
    verrouVeille = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (seance && !seance.fin) demanderVeille();
    if (minuterie) battre();
  }
});

/* ------------------------------------------------------------ fin de séance */

function terminer() {
  arreterMinuterie();
  const resume = $('fin-resume');

  if (estFooting()) {
    terminerFooting(resume);
    return;
  }

  // Le chrono encore en marche est arrêté ici : c'est bien la fin de séance.
  if (chronoSeance().demarre) arreterChronoSeance();

  const exercicesFaits = seance.exercices.filter((e) => e.series.some((s) => s.faite));
  const tonnage = seance.exercices.reduce((somme, e) => somme + tonnageDesSeries(e.series), 0);
  const seriesFaites = seance.exercices.reduce(
    (somme, e) => somme + e.series.filter((s) => s.faite && !s.echauffement).length, 0);
  // Le chronomètre fait foi s'il a servi : il mesure le temps réellement passé
  // à s'entraîner, là où l'écart début/fin compte aussi les interruptions.
  const mesure = dureeSeanceMs();
  const duree = mesure
    ? Math.round(mesure / 60000)
    : Math.round((Date.now() - new Date(seance.debut).getTime()) / 60000);
  seance.duree_min = duree;

  const precedente = derniereSeanceDuJour(seance.jour);
  let comparaison = '';
  if (precedente) {
    const avant = (precedente.exercices || []).reduce(
      (somme, e) => somme + tonnageDesSeries(e.series), 0);
    if (avant) {
      const ecart = tonnage - avant;
      comparaison = '<p class="carte-detail">Dernière séance ' + avant + ' kg, soit ' +
        (ecart >= 0 ? '+' : '') + ecart + '.</p>';
    }
  }

  resume.innerHTML =
    '<h3>' + echapper(seance.titre.split(/\s+-\s+/)[0]) + '</h3>' +
    '<div class="chiffres">' +
      '<div class="chiffre"><b>' + duree + '</b><span>minutes</span></div>' +
      '<div class="chiffre"><b>' + seriesFaites + '</b><span>séries</span></div>' +
      '<div class="chiffre"><b>' + tonnage + '</b><span>kg soulevés</span></div>' +
    '</div>' + comparaison +
    exercicesFaits.map((e) =>
      '<div class="resume-exo">' +
        '<div class="resume-exo-nom">' + echapper(e.nom) + '</div>' +
        '<div class="resume-exo-series">' +
          e.series.filter((s) => s.faite)
            .map((s) => (s.echauffement ? 'éch ' : '') +
              (s.charge != null ? s.charge : '?') + '×' + (s.reps != null ? s.reps : '?') +
              (s.rir != null ? ' @' + s.rir : ''))
            .join('  ·  ') +
        '</div>' +
      '</div>').join('');

  if (!exercicesFaits.length) {
    resume.innerHTML += '<p class="vide">Aucune série validée.</p>';
  }

  preparerEcranFin();
}

/* Une sortie par type renseigné : les quatre peuvent avoir été faites le
   même jour, le résumé les liste toutes plutôt qu'une seule. */
function terminerFooting(resume) {
  const carte = footingParType(seance);
  // Un type peut compter plusieurs passages depuis le 8 septembre 2026 : ne
  // retenir que ceux réellement chiffrés, un type touché sans rien saisir
  // n'y laissant qu'un passage vide (voir cyclesCourse).
  const parType = TYPES_COURSE.map((type) => ({
    type,
    cycles: (carte[type.cle] || []).filter((c) => c.duree_min != null || c.distance_km != null),
  })).filter((entree) => entree.cycles.length);

  resume.innerHTML = '<h3>' + echapper(seance.titre.replace(/^J\d\s*/, '')) + '</h3>';

  if (!parType.length) {
    resume.innerHTML += '<p class="vide">Aucune sortie renseignée.</p>';
  }

  parType.forEach(({ type, cycles }) => {
    cycles.forEach((d, index) => {
      const duree = d.duree_min || 0;
      const distance = d.distance_km || 0;
      let allureTexte = '&mdash;';
      if (duree && distance) {
        const allure = duree / distance;
        allureTexte = Math.floor(allure) + ':' +
          String(Math.round((allure - Math.floor(allure)) * 60)).padStart(2, '0');
      }
      const nom = cycles.length > 1 ? type.complet + ', passage ' + (index + 1) : type.complet;
      resume.innerHTML +=
        '<div class="resume-exo-nom">' + echapper(nom) + '</div>' +
        '<div class="chiffres">' +
          '<div class="chiffre"><b>' + duree + '</b><span>minutes</span></div>' +
          '<div class="chiffre"><b>' + distance + '</b><span>km</span></div>' +
          '<div class="chiffre"><b>' + allureTexte + '</b><span>min / km</span></div>' +
        '</div>';
    });
  });

  // Le gainage est indépendant des sorties : il peut avoir été fait sans
  // course, et doit donc s'afficher même quand la liste ci-dessus est vide.
  GAINAGE_FOOTING.forEach((exo) => {
    const tenues = (seance.gainage || {})[exo.cle] || [];
    const faites = tenues.filter((v) => v != null);
    if (!faites.length) return;
    const total = faites.reduce((somme, v) => somme + v, 0);
    resume.innerHTML +=
      '<div class="resume-exo">' +
        '<div class="resume-exo-nom">' + echapper(exo.nom) + '</div>' +
        '<div class="resume-exo-series">' +
          faites.map((v) => v + ' s').join('  ·  ') +
          '  (total ' + total + ' s)' +
        '</div>' +
      '</div>';
  });

  preparerEcranFin();
}

/* Commun aux deux types de séance : remise à zéro du message d'envoi,
   réactivation du bouton, et remarque de fin de séance (voir plus bas)
   reprise depuis seance.remarque pour survivre à un aller-retour sur
   l'écran de fin sans repartir d'un champ vide. */
function preparerEcranFin() {
  $('fin-message').textContent = '';
  $('fin-message').className = 'message';
  $('bouton-enregistrer').disabled = false;
  $('fin-remarque').value = seance.remarque || '';
  afficher('fin');
}

function enregistrerEtSynchroniser() {
  seance.fin = new Date().toISOString();
  const historique = lireTableau(CLES.historique).filter((s) => s.id !== seance.id);
  historique.push(seance);
  ecrire(CLES.historique, historique);

  oublierSeance(seance.jour);
  relacherVeille();

  const message = $('fin-message');
  $('bouton-enregistrer').disabled = true;

  if (!reglages.pont) {
    message.className = 'message';
    message.textContent = 'Séance enregistrée sur le téléphone. Le pont vers le classeur ' +
      "n'est pas configuré : rendez-vous dans les réglages.";
    seance = null;
    rendreAccueil();
    setTimeout(() => afficher('accueil'), 2200);
    return;
  }

  message.className = 'message';
  message.textContent = 'Envoi vers le classeur...';
  synchroniser().then((compte) => {
    message.className = 'message ok';
    message.textContent = compte
      ? 'Classeur mis à jour.'
      : 'Séance gardée sur le téléphone, envoi à réessayer.';
    seance = null;
    rendreAccueil();
    setTimeout(() => afficher('accueil'), 1600);
  }).catch((erreur) => {
    message.className = 'message erreur';
    message.textContent = "Envoi impossible : " + erreur.message +
      ' La séance reste enregistrée sur le téléphone et repartira plus tard.';
    seance = null;
    rendreAccueil();
  });
}

/* ------------------------------------------------- pont vers le classeur */

/* Le pont est un script Apps Script publié depuis le classeur lui-même : pas
   de projet Google Cloud, pas de parcours OAuth dans l'application, et rien à
   renouveler. Le corps part en text/plain pour éviter la requête préalable
   CORS, qu'Apps Script ne sait pas honorer. */
async function envoyer(charge) {
  const reponse = await fetch(reglages.pont, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ secret: reglages.secret }, charge)),
    redirect: 'follow',
  });
  if (!reponse.ok) throw new Error('le pont a répondu ' + reponse.status + '.');
  const resultat = await reponse.json();
  if (!resultat.ok) throw new Error(resultat.erreur || 'réponse inattendue du pont.');
  return resultat;
}

async function synchroniser() {
  if (!reglages.pont) return 0;
  const historique = lireTableau(CLES.historique);
  const attente = historique.filter((s) => s.fin && !s.envoye);
  let envoyees = 0;

  for (const s of attente) {
    await envoyer({ action: 'seance', seance: s });
    s.envoye = true;
    s.envoye_le = new Date().toISOString();
    envoyees++;
  }

  ecrire(CLES.historique, historique);
  rendreEtatSync();
  return envoyees;
}

/* --------------------------------------------------------------- réglages */

function rendreReglages() {
  $('reglage-pont').value = reglages.pont;
  $('reglage-secret').value = reglages.secret;
  $('reglage-son').checked = reglages.son;
  $('reglage-vibration').checked = reglages.vibration;
  $('reglage-veille').checked = reglages.veille;
  $('reglage-clavier-recup').checked = reglages.clavierPendantRecup;
  $('reglages-message').textContent = '';
  $('reglages-message').className = 'message';
  $('note-programme').textContent = programme
    ? 'Programme importé le ' + dateCourte(programme.importe_le) + '.'
    : '';
}

function sauverReglages() {
  reglages = {
    pont: $('reglage-pont').value.trim(),
    secret: $('reglage-secret').value.trim(),
    son: $('reglage-son').checked,
    vibration: $('reglage-vibration').checked,
    veille: $('reglage-veille').checked,
    clavierPendantRecup: $('reglage-clavier-recup').checked,
  };
  ecrire(CLES.reglages, reglages);
}

function rendreHistorique() {
  const cible = $('liste-historique');
  const seances = lireTableau(CLES.historique)
    .filter((s) => s.fin)
    .sort((a, b) => new Date(b.fin) - new Date(a.fin));

  if (!seances.length) {
    cible.innerHTML = '<p class="vide">Aucune séance enregistrée pour le moment.</p>';
    return;
  }

  cible.innerHTML = seances.map((s) => {
    let details;
    if (s.type === 'footing') {
      const carte = footingParType(s);
      const morceaux = TYPES_COURSE
        .filter((t) => carte[t.cle] && (carte[t.cle].duree_min || carte[t.cle].distance_km))
        .map((t) => {
          const d = carte[t.cle];
          const bouts = [];
          if (d.duree_min) bouts.push(d.duree_min + ' min');
          if (d.distance_km) bouts.push(d.distance_km + ' km');
          return t.nom + ' ' + bouts.join(', ');
        });
      details = morceaux.length ? morceaux.join(' &middot; ') : 'Sortie sans chiffres';
    } else {
      const tonnage = (s.exercices || []).reduce((somme, e) => somme + tonnageDesSeries(e.series), 0);
      const series = (s.exercices || []).reduce(
        (somme, e) => somme + e.series.filter((x) => x.faite && !x.echauffement).length, 0);
      details = series + ' séries, ' + tonnage + ' kg';
    }
    return '<div class="entree-historique">' +
      '<div class="titre"><span>' + echapper(s.jour) + ' &middot; ' + dateCourte(s.fin) + '</span>' +
      '<span class="badge ' + (s.envoye ? 'envoye">classeur' : 'attente">en attente') + '</span></div>' +
      '<div class="details">' + details + '</div>' +
      '</div>';
  }).join('');
}

/* --------------------------------------------------------------- démarrage */

function brancher() {
  // Quitter une séance ne l'efface pas : elle reste ouverte et se reprend en
  // retouchant sa carte. L'abandon explicite se fait depuis l'accueil.
  $('bouton-quitter').addEventListener('click', () => {
    arreterMinuterie();
    relacherVeille();
    seance = null;
    rendreAccueil();
    afficher('accueil');
  });

  $('bouton-terminer').addEventListener('click', terminer);
  $('chrono-seance-demarrer').addEventListener('click', basculerChronoSeance);
  $('bouton-consigne-modifier').addEventListener('click', modifierConsigne);
  $('bouton-consigne-annuler').addEventListener('click', quitterEditionConsigne);
  $('bouton-consigne-enregistrer').addEventListener('click', enregistrerEditionConsigne);
  // Amorcer le clavier avant même de changer d'exercice : le geste (l'appui
  // sur ← / →) est encore "chaud" à cet instant précis, il ne l'est déjà
  // plus une fois rendreExercice() passé. Voir amorcerClavier() plus haut.
  //
  // Changer d'exercice n'arrête plus la récupération en cours (27 août
  // 2026) : elle appartient à la série qu'on vient de finir, pas à la fiche
  // qu'on regarde, et c'est justement le principe du passage automatique à
  // l'exercice suivant.
  $('bouton-precedent').addEventListener('click', () => {
    if (indexExo > 0) {
      amorcerClavier();
      indexExo--;
      rendreExercice();
      focaliserProchaineSerie();
    }
  });
  $('bouton-suivant').addEventListener('click', () => {
    if (indexExo < seance.exercices.length - 1) {
      amorcerClavier();
      indexExo++;
      rendreExercice();
      focaliserProchaineSerie();
    }
  });

  $('bouton-serie').addEventListener('click', () => {
    const courant = seance.exercices[indexExo];
    const modele = courant.series[courant.series.length - 1] || {};
    courant.series.push({
      charge: modele.charge != null ? modele.charge : null,
      reps: null,
      rir: null,
      faite: false,
      echauffement: false,
    });
    enregistrerSeance();
    rendreSeries();
  });

  $('bouton-cycle-ajouter').addEventListener('click', () => {
    cyclesCourse(TYPES_COURSE[indexExo].cle).push({});
    enregistrerSeance();
    rendreCyclesCourse();
  });

  // Toute la surface de la minuterie ferme et rouvre le clavier : après une
  // fermeture automatique à zéro, aucun geste n'a eu lieu et le clavier
  // reste fermé (aucun navigateur mobile ne l'ouvre sans interaction). Un
  // appui n'importe où redonne donc le chemin le plus court vers la saisie.
  // Boutons ±15 retirés le 27 août 2026, plus rien à exclure du geste.
  $('minuterie').addEventListener('click', () => minuterieTerminee(true));

  $('bouton-enregistrer').addEventListener('click', enregistrerEtSynchroniser);
  $('bouton-fin-retour').addEventListener('click', () => { afficher('seance'); rendreExercice(); });
  $('fin-remarque').addEventListener('input', (evenement) => {
    if (!seance) return;
    seance.remarque = evenement.target.value;
    enregistrerSeance();
  });

  $('bouton-reglages').addEventListener('click', () => { rendreReglages(); afficher('reglages'); });
  $('bouton-reglages-retour').addEventListener('click', () => {
    sauverReglages();
    rendreAccueil();
    afficher('accueil');
    // Quitter les réglages après y avoir renseigné le pont doit suffire à
    // vider ce qui attendait, sans obliger à passer par "Tester le pont".
    if (reglages.pont) synchroniser().then(rendreEtatSync).catch(() => {});
  });
  ['reglage-pont', 'reglage-secret', 'reglage-son', 'reglage-vibration', 'reglage-veille',
   'reglage-clavier-recup']
    .forEach((id) => $(id).addEventListener('change', sauverReglages));

  $('bouton-tester-pont').addEventListener('click', async () => {
    sauverReglages();
    const message = $('reglages-message');
    if (!reglages.pont) {
      message.className = 'message erreur';
      message.textContent = "Renseignez d'abord l'adresse du pont.";
      return;
    }
    message.className = 'message';
    message.textContent = 'Test en cours...';
    try {
      const resultat = await envoyer({ action: 'ping' });
      // Un pont qui répond est le signal naturel pour vider ce qui attendait
      // depuis avant sa configuration : sans quoi une séance déjà enregistrée
      // resterait bloquée jusqu'au prochain lancement de l'application.
      const envoyees = await synchroniser();
      message.className = 'message ok';
      message.textContent = 'Pont joignable. Classeur : ' + (resultat.classeur || 'sans nom') + '.' +
        (envoyees ? ' ' + envoyees + ' séance' + (envoyees > 1 ? 's' : '') + ' en attente envoyée' + (envoyees > 1 ? 's' : '') + '.' : '');
    } catch (erreur) {
      message.className = 'message erreur';
      message.textContent = 'Échec : ' + erreur.message;
    }
  });

  $('bouton-exporter').addEventListener('click', () => {
    const contenu = JSON.stringify(lireTableau(CLES.historique), null, 1);
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
    lien.download = 'seances.json';
    lien.click();
    setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
  });

  // Nettoyage manuel demandé par l'utilisateur le 27 août 2026, après avoir
  // accumulé des séances de test : purge locale uniquement, le classeur (qui
  // a ses propres pages, voir CLAUDE.md) n'est pas concerné.
  $('bouton-nettoyer-historique').addEventListener('click', () => {
    const aujourdhui = dateCourte(new Date().toISOString());
    const toutes = lireTableau(CLES.historique);
    const gardees = toutes.filter((s) => s.fin && dateCourte(s.fin) === aujourdhui);
    const retirees = toutes.length - gardees.length;
    if (!retirees) {
      alert("Rien à retirer : il n'y a pas de séance antérieure à aujourd'hui.");
      return;
    }
    if (!confirm(retirees + ' séance' + (retirees > 1 ? 's' : '') + " antérieure" +
        (retirees > 1 ? 's' : '') + " à aujourd'hui seront supprimées du téléphone. Continuer ?")) return;
    ecrire(CLES.historique, gardees);
    rendreAccueil();
  });

  $('bouton-historique').addEventListener('click', () => { rendreHistorique(); afficher('historique'); });
  $('bouton-historique-retour').addEventListener('click', () => afficher('accueil'));

  window.addEventListener('online', () => {
    synchroniser().catch(() => {});
  });
}

async function demarrer() {
  try {
    const reponse = await fetch('data/programme.json', { cache: 'no-cache' });
    programme = await reponse.json();
  } catch (e) {
    document.body.innerHTML =
      '<p class="vide">Programme introuvable. Lancez <code>python outils/importer_classeur.py</code>.</p>';
    return;
  }

  brancher();
  rendreAccueil();
  afficher('accueil');

  if (navigator.onLine) synchroniser().catch(() => {});
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

demarrer();
