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
  sommeil: 'muscu.sommeil',
  mensurations: 'muscu.mensurations',
};

const REGLAGES_PAR_DEFAUT = {
  pont: '',
  secret: '',
  son: true,
  vibration: true,
  veille: true,
  clavierPendantRecup: true,
  notification: false,
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

/* Gainage des jours de footing, du 6 au 11 septembre 2026 : planches, pallof
   press, rotation externe. Remplacé le 11 septembre 2026 par la séance de
   gainage à part (voir CATEGORIES_GAINAGE), la rotation externe étant
   abandonnée par l'utilisateur. Conservé pour relire les séances de footing
   de cette période, qui portent encore ces valeurs dans `seance.gainage`. */
const GAINAGE_FOOTING_ANCIEN = [
  { cle: 'planche_frontale', nom: 'Planche frontale' },
  { cle: 'planche_laterale', nom: 'Planche latérale' },
  { cle: 'pallof_press', nom: 'Pallof press' },
  { cle: 'rotation_externe', nom: 'Rotation externe poulie', unite: 'reps' },
];

/* Le libellé d'unité d'un exercice de l'ancien gainage, secondes par défaut. */
function uniteGainage(exo) {
  return exo.unite === 'reps' ? 'reps' : 's';
}

/* Séance de gainage optionnelle, spécifiée le 11 septembre 2026 dans le
   récapitulatif de programme de l'utilisateur : quatre catégories, un
   mouvement au choix dans chacune, trois séries. Elle vit dans le code et non
   dans le classeur, dont la grille ne sait représenter ni les mouvements au
   choix ni les modes de saisie (voir CLAUDE.md, bloc « GAINAGE » ignoré).

   `mode` décide de la saisie : `chrono` (secondes de tenue, minuteur de 45 s
   interruptible), `reps`, ou `charge` (poids, distance, vitesse saisie, le
   farmer walk seulement). `interference` est le rang de fatigue imposé aux
   muscles de la course, 1 le plus faible, et `couleur` la teinte du nom de
   l'exercice (voir `carteMouvement`, décision de l'utilisateur le
   13 septembre 2026 : plus de pastille, la couleur se porte sur le texte).
   Le dead bug est en répétitions : le récapitulatif le disait chrono dans un
   tableau et « 6-8 par côté » dans l'autre, tranché ainsi le 11 septembre
   2026, le tempo 3-1-3 faisant de la qualité de chaque répétition la mesure
   utile.

   `couleurTexte`, quand présent, remplace `couleur` pour l'affichage :
   `couleur` reste la teinte de référence de l'échelle divergente (celle du
   dégradé `.gainage-degrade`), `couleurTexte` sa version assombrie pour
   rester lisible en texte. Recalculé le 16 septembre 2026 pour le passage au
   fond clair (remplace le calcul du 13 septembre, fait pour un fond sombre) :
   mesuré sur les trois fonds clairs de l'application (`--fond`, `--fond-carte`,
   `--fond-champ`), les neuf teintes d'origine tombent presque toutes sous le
   seuil WCAG AA (4,5:1) en texte de cette taille — de 1,1:1 à 4,4:1 --, `A50026`
   (farmer walk) étant la seule à passer telle quelle (7:1). Les huit autres
   sont assombries jusqu'à repasser ce seuil sur le fond le plus défavorable,
   en gardant la même teinte. */
const MOUVEMENTS_GAINAGE = {
  dead_bug: {
    nom: 'Dead bug', mode: 'reps', prescription: '6-8 par côté', repos: 45,
    interference: 4, couleur: '#D9EF8B', couleurTexte: '#5d7310',
    consigne: '3 s de descente bras et jambe opposés, 1 s en bas, 3 s de retour. '
      + 'Bas du dos plaqué au sol en permanence.',
  },
  planche: {
    nom: 'Planche', mode: 'chrono', prescription: '45 s', repos: 45,
    interference: 3, couleur: '#91CF60', couleurTexte: '#497724',
    consigne: 'Bassin en rétroversion légère, fessiers contractés.',
  },
  pallof_press: {
    nom: 'Pallof press', mode: 'reps', prescription: '8-10 par côté', repos: 45,
    interference: 1, couleur: '#1A9850', couleurTexte: '#157c41',
    consigne: 'Poulie à hauteur de poitrine, à 1 m, perpendiculaire. 2 s pour tendre, '
      + '2 s de maintien, 2 s de retour. Départ 10 à 15 kg. Le buste ne pivote pas.',
  },
  bird_dog: {
    nom: 'Bird dog', mode: 'chrono', prescription: '45 s', repos: 45,
    interference: 5, couleur: '#FEE08B', couleurTexte: '#896501',
    consigne: "2 s d'extension bras et jambe opposés, 2 s de maintien, 2 s de retour. "
      + 'Hanches horizontales.',
  },
  marche_ours: {
    nom: "Marche de l'ours", mode: 'chrono', prescription: '45 s', repos: 45,
    interference: 8, couleur: '#D73027', couleurTexte: '#cc2e25',
    consigne: 'Genoux à quelques centimètres du sol, dos plat, bassin qui ne bascule '
      + 'pas latéralement.',
  },
  planche_laterale: {
    nom: 'Planche latérale', mode: 'chrono', prescription: '45 s par côté', repos: 45,
    interference: 2, couleur: '#52B151', couleurTexte: '#377a37',
    consigne: "Ligne cheville-hanche-épaule, hanche empilée sur l'épaule et haute. "
      + "Le temps noté est celui d'un côté.",
  },
  farmer_walk: {
    nom: 'Farmer walk une main', mode: 'charge', prescription: '20-30 m par côté', repos: 60,
    interference: 9, couleur: '#A50026',
    consigne: "Départ 18 à 20 kg. Épaules horizontales, arrêt dès l'inclinaison, quelle "
      + 'que soit la distance restante.',
    info: 'Il ne fatigue pas la sangle comme les autres : il charge la chaîne portante '
      + "complète sous contrainte axiale. Son rang n'est pas directement comparable "
      + 'aux huit autres.',
  },
  crunch_inverse: {
    nom: 'Crunch inversé', mode: 'reps', prescription: '10-12', repos: 45,
    interference: 6, couleur: '#FDAE61', couleurTexte: '#a95502',
    consigne: '2 s de montée, 3 s de descente contrôlée. Le bassin décolle, pas '
      + 'seulement les jambes. Aucun élan.',
  },
  releve_genoux: {
    nom: 'Relevé de genoux suspendu', mode: 'reps', prescription: '8-12', repos: 60,
    interference: 7, couleur: '#F46D43', couleurTexte: '#c8380c',
    consigne: 'Rétroversion du bassin en fin de mouvement. Aucun balancement. Sangles '
      + "si le grip lâche avant l'abdomen.",
  },
};

const CATEGORIES_GAINAGE = [
  { cle: 'anti_extension', nom: 'Anti-extension', series: 3,
    mouvements: ['dead_bug', 'planche'] },
  { cle: 'anti_rotation', nom: 'Anti-rotation', series: 3,
    mouvements: ['pallof_press', 'bird_dog', 'marche_ours'] },
  { cle: 'anti_lateroflexion', nom: 'Anti-latéroflexion', series: 3,
    mouvements: ['planche_laterale', 'farmer_walk'] },
  { cle: 'flexion_chargee', nom: 'Flexion chargée', series: 3,
    mouvements: ['crunch_inverse', 'releve_genoux'] },
];

const DUREE_TENUE_S = 45;

/* Ajoutée aux jours du programme au démarrage : elle ne vient pas du
   classeur (voir MOUVEMENTS_GAINAGE). */
const JOUR_GAINAGE = { code: 'G', titre: 'Gainage', type: 'gainage', exercices: [] };

/* Une icône par jour sur les cartes de l'accueil, demande de l'utilisateur
   le 13 septembre 2026. Les jours de musculation n'ayant pas de type
   distinct entre eux (tous "muscu"), l'icône se choisit par code plutôt que
   par type ; footing et gainage, eux, sont identifiés par leur type. */
const ICONES_JOUR = { J1: '💪', J3: '🧗', J4: '🦵', J5: '🔥' };
function iconeJour(jour) {
  if (jour.type === 'footing') return '🏃';
  if (jour.type === 'gainage') return '🧘';
  return ICONES_JOUR[jour.code] || '🏋️';
}

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
let nuitAffichee = null;  // clé (DD/MM/AAAA) de la nuit affichée sur l'écran Sommeil
let mensurationAffichee = null;  // clé (DD/MM/AAAA) du jour affiché sur l'écran Mensurations
let glisseSlider = false;  // curseur de comparaison avant/après en cours de glissement
let glissementRepere = null;    // repère de journée en cours de glissement vers la frise (voir demarrerGlissementRepere)
let indexTypeEvolution = 0;  // type de course affiché sur l'écran Évolution course

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

/* Migration unique, jouée sans condition à chaque lancement (voir
   demarrer()) : les séances déjà enregistrées sous J6 avant le 13 septembre
   2026 rejoignent l'historique de J2 (demande de l'utilisateur), et une
   éventuelle séance J6 encore en cours à ce moment-là devient la séance J2,
   sauf si une séance J2 est elle-même déjà en cours en parallèle — cas
   rarissime laissé de côté plutôt que d'en écraser une des deux. Sans
   effet si rejouée : plus aucune séance ni séance en cours ne porte le
   code J6 une fois faite. */
function fusionnerJ6DansJ2() {
  const historique = lireTableau(CLES.historique);
  let touche = false;
  historique.forEach((s) => { if (s.jour === 'J6') { s.jour = 'J2'; touche = true; } });
  if (touche) ecrire(CLES.historique, historique);

  const carte = lireSeancesEnCours();
  if (carte.J6 && (!carte.J2 || carte.J2.fin)) {
    carte.J6.jour = 'J2';
    carte.J2 = carte.J6;
    delete carte.J6;
    ecrireSeancesEnCours(carte);
  }
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

/* J6 est un alias strict de J2 depuis le 13 septembre 2026 (demande de
   l'utilisateur, en inversant la décision du 27 août 2026 qui les gardait
   indépendants) : les deux bulles restent sur l'accueil comme repère de
   jour (mardi/samedi), mais partagent désormais la même séance en cours et
   le même historique. Tout ce qui touche à l'identité de la séance (clé de
   stockage, `seance.jour`) passe par ce code canonique ; seul l'affichage
   de la bulle garde le code d'origine. */
function codeCanonique(code) {
  return code === 'J6' ? 'J2' : code;
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

/* Convertit une date "JJ/MM/AAAA" du classeur (voir MOTIF_DATE dans
   importer_classeur.py) en forme triable "AAAA-MM-JJ". Chaîne vide si la
   date est absente ou mal formée : elle trie alors avant tout le reste. */
function dateClasseurTriable(date) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date || '');
  return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
}

/* Cherche d'abord dans les séances enregistrées sur le téléphone, puis dans
   l'historique repris du classeur. Le deload est écarté : comparer une séance
   normale à une semaine de décharge fausserait la lecture de la progression.

   L'identité d'un exercice est son nom, pas le jour où il est fait
   (décision de l'utilisateur le 13 septembre 2026) : « Élévation latérale
   haltères » apparaît en J3 et en J5, c'est le même mouvement, et il doit
   suivre une seule progression plutôt que deux qui s'ignorent. La recherche
   ignore donc le jour, aussi bien côté téléphone que côté classeur. Elle
   reste exacte au caractère près : un nom ressaisi autrement (accent, casse,
   espace) démarre silencieusement un second historique plutôt que de
   rejoindre le premier (voir `outils/verifier_import.py`, qui signale les
   quasi-doublons de nom entre exercices). */
/* Anciens noms repris par un exercice renommé dans le classeur, pour que
   l'historique du téléphone le suive : l'identité d'un exercice étant son
   nom, un renommage seul démarrerait un historique vide. Comparaison sans
   accents ni casse, le nouveau nom pouvant être ressaisi avec ou sans. */
const ANCIENS_NOMS = {
  // 13 septembre 2026, demande de l'utilisateur : le développé machine
  // devient bilatéral, et garde les valeurs de la version unilatérale.
  'developpe machine': ['developpe machine unilateral'],
};

/* Illustrations par exercice, ajoutées le 17 septembre 2026 (chantier
   « image par exercice » débloqué : une base libre existe, pas besoin d'un
   outil de génération d'image). Photos de `free-exercise-db` (licence
   Unlicense, domaine public), téléchargées en local dans
   `images-exercices/` plutôt qu'hotlinkées : l'application doit rester
   utilisable hors ligne. Clé = nom exact de l'exercice dans le programme
   courant, même fragilité que `ANCIENS_NOMS` ci-dessus : un exercice
   renommé au prochain import perd son image tant que cette table n'est pas
   mise à jour à la main, aucune vérification automatique ne le signale.
   `generique: true` marque les six exercices sans variante fidèle dans la
   base (poulie unilatérale, machine précise, prise neutre) : la photo
   montre le même mouvement sur un autre appareil, étiquetée pour ne pas
   laisser croire que c'est le bon (voir `.exo-image-badge` dans
   css/style.css). */
const IMAGES_EXERCICES = {
  'Abduction de hanche machine': { fichier: 'abduction-de-hanche-machine.jpg' },
  'Curl incline halteres': { fichier: 'curl-incline-halteres.jpg' },
  'Curl marteau': { fichier: 'curl-marteau.jpg' },
  'Curl pupitre': { fichier: 'curl-pupitre.jpg' },
  'Developpe incline machine': { fichier: 'developpe-incline-machine.jpg' },
  'Developpe machine': { fichier: 'developpe-machine.jpg' },
  'Dips buste penche': { fichier: 'dips-buste-penche.jpg' },
  'Ecarte poulie horizontale hauteur poitrine': { fichier: 'ecarte-poulie-horizontale-hauteur-poitrine.jpg' },
  'Elevation laterale halteres': { fichier: 'elevation-laterale-halteres.jpg' },
  'Elevation laterale poulie unilaterale': { fichier: 'elevation-laterale-poulie-unilaterale.jpg', generique: true },
  'Extension de hanche machine': { fichier: 'extension-de-hanche-machine.jpg', generique: true },
  'Extension jambes unilatéral': { fichier: 'extension-jambes-unilateral.jpg' },
  'Extension triceps overhead corde': { fichier: 'extension-triceps-overhead-corde.jpg' },
  'Extension triceps poulie barre': { fichier: 'extension-triceps-poulie-barre.jpg' },
  'Extension triceps unilaterale poulie': { fichier: 'extension-triceps-unilaterale-poulie.jpg', generique: true },
  'FACE PULL': { fichier: 'face-pull.jpg' },
  'LEG CURL ALLONGE UNILATERAL': { fichier: 'leg-curl-allonge-unilateral.jpg' },
  'Lat pull-in unilateral poulie a genoux': { fichier: 'lat-pull-in-unilateral-poulie-a-genoux.jpg', generique: true },
  'Mollets debout unilatéral': { fichier: 'mollets-debout-unilateral.jpg' },
  'Oiseau inverse machine': { fichier: 'oiseau-inverse-machine.jpg', generique: true },
  'PRESSE A CUISSE / HACK SQUAT': { fichier: 'presse-a-cuisse-hack-squat.jpg' },
  'Rowing unilateral machine ou haltere': { fichier: 'rowing-unilateral-machine-ou-haltere.jpg' },
  'SOULEVE DE TERRE ROUMAIN': { fichier: 'souleve-de-terre-roumain.jpg' },
  'Tirage vertical prise large': { fichier: 'tirage-vertical-prise-large.jpg' },
  'Traction prise neutre machine assistee': { fichier: 'traction-prise-neutre-machine-assistee.jpg', generique: true },
};

function rendreImageExercice(nom) {
  const info = IMAGES_EXERCICES[nom];
  const bloc = $('exo-image-bloc');
  if (!info) { bloc.hidden = true; return; }
  bloc.hidden = false;
  $('exo-image').src = 'images-exercices/' + info.fichier;
  $('exo-image').alt = nom;
  $('exo-image-generique').hidden = !info.generique;
}

function formeDuNom(nom) {
  return String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

function memeExercice(nomEnregistre, nomExo) {
  if (nomEnregistre === nomExo) return true;
  return (ANCIENS_NOMS[formeDuNom(nomExo)] || []).includes(formeDuNom(nomEnregistre));
}

function derniereFois(nomExo) {
  const passees = lireTableau(CLES.historique)
    .filter((s) => s.fin)
    .sort((a, b) => new Date(b.fin) - new Date(a.fin));

  for (const s of passees) {
    if (seance && s.id === seance.id) continue;
    const exo = (s.exercices || []).find((e) => memeExercice(e.nom, nomExo));
    if (exo && exo.series.some((x) => x.faite)) {
      return {
        quand: s.fin,
        series: exo.series.filter((x) => x.faite && !x.echauffement),
        tonnage: tonnageDesSeries(exo.series),
      };
    }
  }

  // Historique importé du classeur, avant l'application : le même nom peut
  // porter ses colonnes dans plusieurs jours si aucun n'a encore de séance
  // téléphone. Un candidat par jour où il apparaît (le dernier de son bloc,
  // deload écarté), puis le plus récent par date connue ; à défaut, celui du
  // premier jour rencontré, comme avant cette fusion par nom.
  const candidats = [];
  (programme.jours || []).forEach((j) => {
    (j.exercices || []).filter((e) => e.nom === nomExo).forEach((fiche) => {
      const dernier = (fiche.historique || []).filter((h) => !h.deload).pop();
      if (dernier) candidats.push(dernier);
    });
  });
  if (!candidats.length) return null;
  const ancien = candidats.reduce((meilleur, c) => (
    !meilleur || dateClasseurTriable(c.date) > dateClasseurTriable(meilleur.date) ? c : meilleur
  ), null);
  return {
    quand: null,
    dateTexte: ancien.date,
    series: ancien.series.filter((s) => !s.echauffement),
    tonnage: ancien.total,
  };
}

/* ---------------------------------------------------------------- accueil */

/* Le titre du classeur peut nommer plusieurs jours d'un coup depuis que
   l'utilisateur a renommé le bloc de course « J2 & J6 FOOTING » le
   10 septembre 2026 : J2 et J6 sont le même entraînement, et la grille ne
   les distingue pas. Le code du jour affiché vient donc toujours de la
   séance ou de la fiche (`seance.jour`, `jour.code`), jamais du titre, dont
   on ne garde que le nom. Sans cela l'écran de fin annonçait « & J6
   FOOTING » un jour de J2. */
function sansCodeDeJour(titre) {
  return (titre || '')
    .replace(/^(?:J\d\s*(?:[&+]|et\b)?\s*)+/i, '')
    .replace(/^-\s*/, '');
}

function nomDuJour(titre) {
  return sansCodeDeJour(titre).split(/\s+-\s+/)[0].trim();
}

function rendreAccueil() {
  const liste = $('liste-jours');
  liste.innerHTML = '';
  const enCours = lireSeancesEnCours();

  programme.jours.forEach((jour) => {
    const item = document.createElement('li');
    const bouton = document.createElement('button');
    bouton.className = 'carte-jour';

    const nom = nomDuJour(jour.titre);
    // J6 lit sous le code canonique J2 (voir codeCanonique) : les deux
    // bulles reflètent donc la même séance en cours et la même dernière
    // fois, seul jour.code affiché plus bas reste celui de la bulle.
    const codeSeance = codeCanonique(jour.code);
    const derniere = derniereSeanceDuJour(codeSeance);
    const commencee = enCours[codeSeance] && !enCours[codeSeance].fin;
    if (commencee) bouton.classList.add('en-cours');

    // Bulles compactées le 13 septembre 2026 pour tenir sur un seul écran.
    // Le détail d'un jour de musculation montre la dernière séance plutôt
    // que le nombre d'exercices (déjà visible sur la fiche d'exercice),
    // demande de l'utilisateur le même jour ; footing et gainage gardent
    // leur propre repère et affichent la date à la suite. Voir .carte-jour
    // dans css/style.css.
    const detail = jour.type === 'footing'
      ? 'Durée et distance'
      : jour.type === 'gainage'
        ? 'Bonus'
        : (derniere ? 'Dernière : ' + ilYA(derniere.fin) : 'Pas encore faite');

    // L'icône part en attribut plutôt qu'en texte (.carte-jour::before) : le
    // témoin structurel des tests lit .carte-code par ses deux premiers
    // caractères (J1, J2...), qu'un emoji devant le texte aurait décalés.
    bouton.dataset.icone = iconeJour(jour);
    bouton.innerHTML =
      '<div class="carte-code">' +
      (jour.type === 'gainage' ? 'Bonus' : jour.code) +
      (commencee ? '<span class="pastille-en-cours">en cours</span>' : '') +
      '</div>' +
      '<div class="carte-nom">' + echapper(nom || 'Footing') + '</div>' +
      '<div class="carte-detail">' + detail +
      (jour.type !== 'muscu' && derniere ? ' &middot; ' + ilYA(derniere.fin) : '') +
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
  code = codeCanonique(code);
  const jour = jourDe(code);
  if (!jour) return;

  arreterMinuteurGainage();
  const carte = lireSeancesEnCours();
  const reprise = carte[code] && !carte[code].fin;
  seance = reprise ? carte[code] : nouvelleSeance(jour);

  indexExo = reprise ? positionDeReprise() : 0;
  enregistrerSeance();
  demanderVeille();

  if (jour.type === 'footing') {
    afficher('seance');
    rendreFooting();
  } else if (jour.type === 'gainage') {
    afficher('seance');
    rendreSeanceGainage();
  } else {
    // Ouvrir un jour de musculation démarre le chronomètre de séance : sans
    // ce geste dédié, il fallait y penser soi-même en plein échauffement.
    demarrerChronoSeance();
    // Une séance neuve passe par l'écran d'échauffement (demande de
    // l'utilisateur le 16 septembre 2026) ; une séance reprise retourne
    // directement où la saisie s'était arrêtée, sans repasser par cet écran.
    if (reprise) {
      afficher('seance');
      rendreExercice();
    } else {
      rendreDemarrage(jour);
      afficher('demarrage');
    }
  }
}

function rendreDemarrage(jour) {
  $('demarrage-jour').textContent = jour.code + ' ' + nomDuJour(jour.titre);
  $('demarrage-nom').textContent = nomDuJour(jour.titre);
  const liste = ECHAUFFEMENT_PAR_JOUR[jour.code] || [];
  $('demarrage-echauffement').hidden = !liste.length;
  $('demarrage-echauffement-liste').innerHTML =
    liste.map((item) => '<li>' + echapper(item) + '</li>').join('');
}

/* Vague de couleur qui part du point d'appui et envahit l'écran (demande de
   l'utilisateur le 16 septembre 2026), avant de révéler la fiche du premier
   exercice déjà rendue dessous. Calée sur un délai fixe (durée de la
   transition CSS, voir .vague-demarrage) plutôt que sur `transitionend` :
   ce dernier se redéclenche quand la classe est retirée (la vague reflue
   aussi en transition), et un `{ once: true }` posé avant le premier
   déclenchement peut alors manquer la fin de la croissance et laisser
   l'écran couvert. Un délai fixe n'a pas cette ambiguïté. */
function lancerAnimationDemarrage(x, y, suite) {
  const vague = $('vague-demarrage');
  vague.style.setProperty('--x', x + 'px');
  vague.style.setProperty('--y', y + 'px');
  // Force le navigateur à peindre le disque à l'échelle 0, positionné au
  // point d'appui, avant de déclencher sa mise à l'échelle : sans ce
  // rafraîchissement forcé, les deux changements (position, puis transform)
  // posés dans le même tick peuvent se retrouver combinés dans la même
  // image, et la croissance démarre alors d'un état incohérent.
  void vague.offsetWidth;
  vague.classList.add('actif');
  setTimeout(() => {
    suite();
    vague.classList.remove('actif');
  }, 600);
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
  // `mouvements` ne sert plus qu'à relire d'anciennes séances antérieures au
  // 13 septembre 2026, qui y portaient encore le farmer walk séparé du
  // footing (retiré, l'onglet Incliné en tient lieu désormais).
  if (jour.type === 'footing') {
    neuve.footing = {};
    neuve.mouvements = {};
  }
  if (jour.type === 'gainage') {
    neuve.choix = {};
    CATEGORIES_GAINAGE.forEach((c) => { neuve.choix[c.cle] = mouvementParDefaut(c); });
    neuve.mouvements = {};
  }
  return neuve;
}

/* Reprend là où la saisie s'est arrêtée : premier exercice dont une série
   reste à faire, le dernier si tout est déjà rempli. */
function positionDeReprise() {
  if (estFooting() || estGainage()) return 0;
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

/* Classement des exercices actuels du programme pour l'estimation grossière
   du temps de séance (demande de l'utilisateur le 16 septembre 2026) :
   convention d'usage courante (poly-articulaire vs isolation), le classeur
   ne portant pas cette information. À revoir si un classement surprend, et
   à mettre à jour si le programme change. */
const EXERCICES_POLYARTICULAIRES = new Set([
  'Developpe incline machine', 'Dips buste penche',
  'Tirage vertical prise large', 'Rowing unilateral machine ou haltere',
  'PRESSE A CUISSE / HACK SQUAT', 'SOULEVE DE TERRE ROUMAIN',
  'Traction prise neutre machine assistee', 'Developpe machine',
  'Lat pull-in unilateral poulie a genoux',
]);

/* Temps de travail estimé d'une série, hors repos : 75 s pour un exercice
   poly-articulaire, 60 ou 80 s pour un exercice d'isolation selon que sa
   fourchette de répétitions atteint 15 ou non (chiffres donnés par
   l'utilisateur le 16 septembre 2026 : 10 reps poly 75 s, 10 reps isolation
   60 s, 15-20 reps isolation 80 s). Grossier par construction. */
function dureeEstimeeSerie(exo) {
  if (EXERCICES_POLYARTICULAIRES.has(exo.nom)) return 75;
  return (exo.reps_max || 0) >= 15 ? 80 : 60;
}

/* Durée totale estimée de la séance de musculation du jour, exercices et
   séries du programme (pas de la séance en cours, qui peut en avoir moins
   si des séries ont été retirées) : repos compris, temps de travail estimé
   par dureeEstimeeSerie(). */
function dureeTotaleEstimeeS() {
  const jour = jourDe(seance.jour);
  return jour.exercices.reduce((somme, exo) => {
    const parSerie = dureeEstimeeSerie(exo) + (exo.repos_s || 0);
    return somme + parSerie * (exo.series || 0);
  }, 0);
}

/* --------------------------------------------------------------- footing */

function estFooting() {
  return seance && seance.type === 'footing';
}

function estGainage() {
  return seance && seance.type === 'gainage';
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

function champCycle(cycle, definition, actualiser, precedente) {
  const etiquette = document.createElement('label');
  const titre = document.createElement('span');
  titre.textContent = definition.libelle;

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  const valeur = cycle[definition.cle];
  input.value = valeur === null || valeur === undefined ? '' : String(valeur);
  // Valeur de la dernière sortie du même type, en grisé, pour s'y repérer
  // sans l'imposer (demande de l'utilisateur le 13 septembre 2026) : comme
  // pour les séries de musculation, une valeur affichée en placeholder n'est
  // jamais enregistrée tant qu'elle n'est pas retapée.
  const suggestion = precedente && precedente[definition.cle] != null ? precedente[definition.cle] : null;
  input.placeholder = suggestion == null ? '' : String(suggestion);
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
  $('bloc-gainage').hidden = true;
  $('bouton-precedent').hidden = true;
  $('bouton-suivant').hidden = true;

  $('seance-jour').textContent = jour.code + ' ' + nomDuJour(jour.titre);
  $('seance-progression').textContent = '';
  $('ligne-progression').hidden = true;

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
    const precedente = cleComparaison ? derniereSortie(cleComparaison) : null;
    const actualiser = () => {
      majPastillesTypes();
      majAllureCycle(cycle, allure, compare, cleComparaison);
    };

    const champs = document.createElement('div');
    champs.className = 'footing-champs';
    CHAMPS_FOOTING.forEach((definition) => champs.appendChild(champCycle(cycle, definition, actualiser, precedente)));
    carte.appendChild(champs);

    if (type.champs.length) {
      const champsType = document.createElement('div');
      champsType.className = 'footing-champs';
      type.champs.forEach((definition) => champsType.appendChild(champCycle(cycle, definition, actualiser, precedente)));
      carte.appendChild(champsType);
    }

    carte.append(allure, compare);
    majAllureCycle(cycle, allure, compare, cleComparaison);

    bloc.appendChild(carte);
  });

  majPastillesTypes();
}

/* ------------------------------------------------------ séance de gainage */

function rendreSeanceGainage() {
  $('bloc-muscu').hidden = true;
  $('bloc-footing').hidden = true;
  $('bloc-gainage').hidden = false;
  $('bouton-precedent').hidden = true;
  $('bouton-suivant').hidden = true;
  $('seance-jour').textContent = 'Gainage';
  $('seance-progression').textContent = '';
  $('ligne-progression').hidden = true;
  rendreCategoriesGainage();
}

function rendreCategoriesGainage() {
  const bloc = $('gainage-categories');
  bloc.innerHTML = '';
  if (!seance.choix) seance.choix = {};
  CATEGORIES_GAINAGE.forEach((categorie) => {
    if (!categorie.mouvements.includes(seance.choix[categorie.cle])) {
      seance.choix[categorie.cle] = mouvementParDefaut(categorie);
    }
    bloc.appendChild(carteMouvement(categorie.nom, categorie.series,
      seance.choix[categorie.cle], categorie));
  });
}

/* Réaffiche la séance en cours selon son type : l'écran de fin y revient par
   « ← ». Il appelait jusqu'au 11 septembre 2026 l'affichage de musculation
   quel que soit le jour, et plantait donc sur un footing. */
function rendreSeanceCourante() {
  if (estFooting()) rendreFooting();
  else if (estGainage()) rendreSeanceGainage();
  else rendreExercice();
}

/* Les valeurs d'un mouvement dans la séance en cours, une case par série,
   créées à la demande : un mouvement jamais choisi n'encombre pas la séance. */
function valeursMouvement(cle, series) {
  if (!seance.mouvements) seance.mouvements = {};
  const actuelles = seance.mouvements[cle];
  if (!Array.isArray(actuelles) || actuelles.length < series) {
    const neuves = new Array(series).fill(null);
    (actuelles || []).forEach((v, i) => { if (i < series) neuves[i] = v; });
    seance.mouvements[cle] = neuves;
  }
  return seance.mouvements[cle];
}

function seriesDuMouvement(cle) {
  const categorie = CATEGORIES_GAINAGE.find((c) => c.mouvements.includes(cle));
  return categorie ? categorie.series : 3;
}

function valeurRenseignee(v) {
  if (v == null) return false;
  if (typeof v === 'object') return v.poids != null || v.distance != null || v.vitesse != null;
  return true;
}

/* Dernières valeurs d'un mouvement, toutes séances confondues : séance de
   gainage comme jour de footing pour le farmer walk. Chaque mouvement garde
   ainsi sa propre série temporelle, même en alternant d'une séance à
   l'autre, comme le demande le récapitulatif. */
function derniereFoisMouvement(cle) {
  const passees = lireTableau(CLES.historique)
    .filter((s) => s.fin && (!seance || s.id !== seance.id))
    .sort((a, b) => new Date(b.fin) - new Date(a.fin));
  for (const s of passees) {
    const valeurs = (s.mouvements || {})[cle];
    if (Array.isArray(valeurs) && valeurs.some(valeurRenseignee)) return valeurs;
  }
  return null;
}

/* Par défaut, le mouvement choisi à la dernière séance de gainage pour cette
   catégorie : pas d'alternance automatique, la progression se suit sur un
   mouvement donné. */
function mouvementParDefaut(categorie) {
  const passees = lireTableau(CLES.historique)
    .filter((s) => s.type === 'gainage' && s.fin && s.choix)
    .sort((a, b) => new Date(b.fin) - new Date(a.fin));
  for (const s of passees) {
    if (categorie.mouvements.includes(s.choix[categorie.cle])) return s.choix[categorie.cle];
  }
  return categorie.mouvements[0];
}

function texteValeur(mouvement, v) {
  if (!valeurRenseignee(v)) return '';
  if (mouvement.mode === 'charge') {
    const bouts = [];
    if (v.poids != null) bouts.push(v.poids + ' kg');
    if (v.distance != null) bouts.push(v.distance + ' m');
    if (v.vitesse != null) bouts.push(v.vitesse + ' km/h');
    return bouts.join(', ');
  }
  return v + (mouvement.mode === 'chrono' ? ' s' : ' rép.');
}

/* Les mouvements renseignés d'une séance, une ligne chacun : résumé de fin et
   fiche de l'historique, séance de gainage comme farmer walk des footings. */
function lignesMouvementsHtml(s, cles, prefixe) {
  return cles.map((cle) => {
    const valeurs = ((s.mouvements || {})[cle] || []).filter(valeurRenseignee);
    if (!valeurs.length) return '';
    const m = MOUVEMENTS_GAINAGE[cle];
    return ligneDetail((prefixe ? prefixe + ' · ' : '') + m.nom,
      valeurs.map((v) => texteValeur(m, v)).join('  ·  '));
  }).join('');
}

/* À plat pour le classeur, une ligne par série renseignée. Calculé ici pour
   que le pont n'ait pas à connaître les mouvements. */
function lignesGainage(s) {
  const lignes = [];
  CATEGORIES_GAINAGE.forEach((categorie) => {
    categorie.mouvements.forEach((cle) => {
      const m = MOUVEMENTS_GAINAGE[cle];
      ((s.mouvements || {})[cle] || []).forEach((v, index) => {
        if (!valeurRenseignee(v)) return;
        const objet = typeof v === 'object';
        lignes.push({
          categorie: categorie.nom,
          mouvement: m.nom,
          serie: index + 1,
          valeur: objet ? null : v,
          unite: m.mode === 'chrono' ? 's' : (m.mode === 'reps' ? 'reps' : ''),
          poids: objet ? v.poids : null,
          distance: objet ? v.distance : null,
          vitesse: objet ? v.vitesse : null,
        });
      });
    });
  });
  return lignes;
}

/* Le nom du mouvement porte lui-même la couleur d'interférence, plus de
   pastille à côté (décision de l'utilisateur le 13 septembre 2026). La
   variable CSS `--couleur-mouvement` plutôt qu'un `style.color` direct :
   `.type-course.choisi` la remplace par du blanc (voir style.css), la
   teinte propre au mouvement ayant trop peu de contraste sur le fond
   turquoise du bouton sélectionné, mesuré pour les neuf couleurs. */
function nomMouvementColore(mouvement) {
  const nom = document.createElement('span');
  nom.className = 'gainage-nom-mouvement';
  nom.textContent = mouvement.nom;
  nom.style.setProperty('--couleur-mouvement', mouvement.couleurTexte || mouvement.couleur);
  nom.title = 'Interférence avec la course : rang ' + mouvement.interference + ' sur 9';
  return nom;
}

function carteMouvement(titre, series, cle, categorie) {
  const mouvement = MOUVEMENTS_GAINAGE[cle];
  const valeurs = valeursMouvement(cle, series);

  const carte = document.createElement('div');
  carte.className = 'gainage-exo';
  carte.dataset.mouvement = cle;

  const entete = document.createElement('p');
  entete.className = 'gainage-nom';
  entete.textContent = titre;
  const etiquette = document.createElement('span');
  etiquette.className = 'etiquette';
  etiquette.textContent = series + ' séries';
  entete.appendChild(etiquette);
  carte.appendChild(entete);

  if (categorie) {
    const choix = document.createElement('div');
    choix.className = 'gainage-choix';
    categorie.mouvements.forEach((candidat) => {
      const m = MOUVEMENTS_GAINAGE[candidat];
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'type-course' + (candidat === cle ? ' choisi' : '');
      bouton.dataset.mouvement = candidat;
      bouton.appendChild(nomMouvementColore(m));
      bouton.addEventListener('click', () => {
        seance.choix[categorie.cle] = candidat;
        enregistrerSeance();
        rendreCategoriesGainage();
      });
      choix.appendChild(bouton);
    });
    carte.appendChild(choix);
  }

  const prescription = document.createElement('p');
  prescription.className = 'gainage-prescription';
  prescription.append(nomMouvementColore(mouvement), document.createTextNode(
    ' · ' + mouvement.prescription + ' · repos ' + mouvement.repos + ' s'));
  carte.appendChild(prescription);

  const avant = derniereFoisMouvement(cle);
  const ligne = document.createElement('div');
  ligne.className = 'gainage-series' + (mouvement.mode === 'charge' ? ' gainage-series-charge' : '');
  valeurs.forEach((valeur, index) => {
    ligne.appendChild(celluleSerie(mouvement, cle, series, index, valeur, avant ? avant[index] : null));
  });
  carte.appendChild(ligne);

  if (avant) {
    const derniere = document.createElement('p');
    derniere.className = 'gainage-derniere';
    derniere.textContent = 'Dernière fois : ' + avant.filter(valeurRenseignee)
      .map((v) => texteValeur(mouvement, v)).join('  ·  ');
    carte.appendChild(derniere);
  }

  const consigne = document.createElement('p');
  consigne.className = 'gainage-consigne';
  consigne.textContent = mouvement.consigne;
  carte.appendChild(consigne);

  if (mouvement.info) {
    const info = document.createElement('p');
    info.className = 'gainage-info';
    info.textContent = mouvement.info;
    carte.appendChild(info);
  }
  return carte;
}

function champGainage(valeur, suggestion, libelle, aChange) {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.className = 'gainage-tenue';
  input.value = valeur == null ? '' : String(valeur);
  input.placeholder = suggestion == null ? '' : String(suggestion);
  input.setAttribute('aria-label', libelle);
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => aChange(nombreOuNull(input.value)));
  return input;
}

function celluleSerie(mouvement, cle, series, index, valeur, precedente) {
  const cellule = document.createElement('div');
  cellule.className = 'gainage-serie';
  const libelle = mouvement.nom + ', série ' + (index + 1);

  if (mouvement.mode === 'charge') {
    const v = valeur || {};
    const p = precedente || {};
    [['poids', 'kg'], ['distance', 'm'], ['vitesse', 'km/h']].forEach(([champ, unite]) => {
      const input = champGainage(v[champ], p[champ], libelle + ', ' + champ + ' en ' + unite, (n) => {
        const toutes = valeursMouvement(cle, series);
        toutes[index] = Object.assign({}, toutes[index] || {}, { [champ]: n });
        enregistrerSeance();
      });
      input.dataset.champ = champ;
      // Le repos part quand la série est décrite, poids et distance au moins.
      input.addEventListener('change', () => {
        const serie = valeursMouvement(cle, series)[index] || {};
        if (serie.poids != null && serie.distance != null) serieSaisie(cle, index);
      });
      const etiquette = document.createElement('label');
      etiquette.className = 'gainage-champ';
      const texte = document.createElement('span');
      texte.textContent = unite;
      etiquette.append(input, texte);
      cellule.appendChild(etiquette);
    });
    return cellule;
  }

  const input = champGainage(valeur, precedente,
    libelle + (mouvement.mode === 'chrono' ? ', secondes' : ', répétitions'), (n) => {
      valeursMouvement(cle, series)[index] = n;
      enregistrerSeance();
    });
  cellule.appendChild(input);

  if (mouvement.mode === 'chrono') {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'gainage-demarrer';
    bouton.setAttribute('aria-label', 'Démarrer la tenue, ' + libelle);
    bouton.textContent = '▶ ' + DUREE_TENUE_S;
    bouton.addEventListener('click', () => demarrerTenue(cle, index));
    cellule.appendChild(bouton);
  }

  // Le repos part à la confirmation, **quel que soit le mode**. Une tenue
  // tapée à la main ne le lançait pas jusqu'au 12 septembre 2026, là où des
  // répétitions le faisaient : or on tape une tenue chaque fois qu'on a
  // chronométré au mur, ou qu'on corrige après coup. Le cas du bouton ▶ reste
  // juste : le `blur` du champ précède le `click`, un repos démarre donc une
  // fraction de seconde avant que la tenue ne le remplace.
  input.addEventListener('change', () => {
    if (valeursMouvement(cle, series)[index] != null) serieSaisie(cle, index);
  });
  return cellule;
}

/* Un seul minuteur, partagé par la séance de gainage et le farmer walk des
   footings, qui compte tour à tour la tenue en cours et le repos qui suit.
   « Démarrage à 45 secondes pour tous les mouvements en mode chrono,
   indépendamment de l'historique, interruptible à tout moment » : le
   récapitulatif, mot pour mot. */
let minuteurGainage = null;   // { type: 'tenue' | 'repos', debut, fin, cle, index }
let tictacGainage = null;

function arreterMinuteurGainage() {
  minuteurGainage = null;
  if (tictacGainage) { clearInterval(tictacGainage); tictacGainage = null; }
  const bandeau = document.getElementById('gainage-chrono');
  if (bandeau) bandeau.hidden = true;
}

function lancerMinuteurGainage(type, secondes, cle, index) {
  if (tictacGainage) clearInterval(tictacGainage);
  minuteurGainage = { type, debut: Date.now(), fin: Date.now() + secondes * 1000, cle, index };
  $('gainage-chrono').hidden = false;
  battreGainage();
  tictacGainage = setInterval(battreGainage, 250);
}

function battreGainage() {
  if (!minuteurGainage) return;
  const restant = (minuteurGainage.fin - Date.now()) / 1000;
  if (restant <= 0) {
    signaler();
    if (minuteurGainage.type === 'tenue') finirTenue(true);
    else arreterMinuteurGainage();
    return;
  }
  const m = MOUVEMENTS_GAINAGE[minuteurGainage.cle];
  $('gainage-chrono-libelle').textContent = minuteurGainage.type === 'tenue'
    ? 'Tenue · ' + m.nom + ', série ' + (minuteurGainage.index + 1)
    : 'Repos';
  $('gainage-chrono-chiffres').textContent = texteDuree(restant);
}

function demarrerTenue(cle, index) {
  if (minuteurGainage && minuteurGainage.type === 'tenue') finirTenue(false);
  lancerMinuteurGainage('tenue', DUREE_TENUE_S, cle, index);
}

/* Fin d'une tenue, au bout des 45 s ou sur appui : on note le temps réellement
   tenu, puis le repos démarre. Le critère d'arrêt est la dégradation de la
   position, pas le minuteur : 20 secondes correctes valent mieux que 45 avec
   le dos creusé. */
function finirTenue(complete) {
  const tenue = minuteurGainage;
  if (!tenue || tenue.type !== 'tenue') return;
  const tenu = complete
    ? DUREE_TENUE_S
    : Math.min(DUREE_TENUE_S, Math.max(1, Math.round((Date.now() - tenue.debut) / 1000)));
  valeursMouvement(tenue.cle, seriesDuMouvement(tenue.cle))[tenue.index] = tenu;
  enregistrerSeance();
  arreterMinuteurGainage();
  if (estGainage()) rendreCategoriesGainage();
  lancerMinuteurGainage('repos', MOUVEMENTS_GAINAGE[tenue.cle].repos, tenue.cle, tenue.index);
}

/* Répétitions ou charge confirmées : le repos démarre, sans jamais couper une
   tenue en cours ailleurs dans la séance. */
function serieSaisie(cle, index) {
  if (minuteurGainage && minuteurGainage.type === 'tenue') return;
  lancerMinuteurGainage('repos', MOUVEMENTS_GAINAGE[cle].repos, cle, index);
}

function appuiBandeauGainage() {
  if (!minuteurGainage) return;
  if (minuteurGainage.type === 'tenue') finirTenue(false);
  else arreterMinuteurGainage();
}

function terminerGainage(resume) {
  resume.innerHTML = '<h3>Gainage</h3>';
  const html = CATEGORIES_GAINAGE
    .map((c) => lignesMouvementsHtml(seance, c.mouvements, c.nom)).join('');
  resume.innerHTML += html || '<p class="vide">Aucune série renseignée.</p>';
  preparerEcranFin();
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
  // Le battement survit à la séance : quitter (←) ou enregistrer remet
  // `seance` à null sans arrêter l'intervalle, qui levait alors une erreur à
  // chaque seconde. Il se relance seul à la réouverture (rendreExercice).
  if (!seance) {
    if (tictacSeance) { clearInterval(tictacSeance); tictacSeance = null; }
    return;
  }
  const chrono = chronoSeance();
  const demarrer = $('chrono-seance-demarrer');
  const ecoule = dureeSeanceMs();

  demarrer.classList.toggle('tourne', !!chrono.demarre);
  $('chrono-seance-temps').textContent = ecoule ? texteDuree(ecoule / 1000) : '';
  demarrer.querySelector('.chrono-seance-icone').innerHTML = chrono.demarre ? '&#10073;&#10073;' : '&#9654;';

  majLigneProgression(ecoule);
}

/* Estimation grossière du temps restant, à côté de la jauge : temps total
   estimé (dureeTotaleEstimeeS, fixe pour la séance) moins le temps
   réellement écoulé (le même chrono que #chrono-seance-demarrer), pas une
   somme des séries déjà faites — ça la fait défiler seule à chaque
   battement de majChronoSeance(), sans recalcul dédié. */
function majLigneProgression(ecouleMs) {
  const ligne = $('ligne-progression');
  if (!seance || seance.type !== 'muscu') { ligne.hidden = true; return; }
  ligne.hidden = false;
  const restant = dureeTotaleEstimeeS() - (ecouleMs || 0) / 1000;
  $('jauge-restant').textContent = restant > 0
    ? '~' + texteDuree(restant) + ' restant'
    : 'Estimation dépassée';
  $('jauge-chrono').textContent = (ecouleMs || 0) ? texteDuree(ecouleMs / 1000) : '0:00';
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
  $('bloc-gainage').hidden = true;
  $('bouton-precedent').hidden = false;
  $('bouton-suivant').hidden = false;

  $('seance-jour').textContent = jour.code + ' ' + nomDuJour(jour.titre);
  $('seance-progression').textContent = (indexExo + 1) + '/' + seance.exercices.length;
  $('jauge-remplie').style.width = (100 * proportionFaite()) + '%';

  majChronoSeance();
  if (chronoSeance().demarre && !tictacSeance) {
    tictacSeance = setInterval(majChronoSeance, 1000);
  }

  $('exo-nom').textContent = courant.nom;
  rendreImageExercice(courant.nom);
  $('exo-muscle').textContent = fiche.muscle || '';
  $('exo-prescription').textContent = fiche.series
    ? fiche.series + ' × ' + (fiche.reps_min === fiche.reps_max
        ? fiche.reps_min
        : fiche.reps_min + '-' + fiche.reps_max)
    : '';
  $('exo-rir').textContent = fiche.rir && fiche.rir.length ? 'RIR ' + fiche.rir.join(' / ') : '';

  quitterEditionConsigne();
  const texte = consigneAffichee(seance.jour, courant.nom, fiche.consigne);
  $('exo-consigne').textContent = texte || 'Aucune consigne pour cet exercice.';
  $('exo-consigne').classList.toggle('vide-consigne', !texte);

  rendreSeries();

  $('bouton-precedent').disabled = indexExo === 0;
  $('bouton-suivant').disabled = indexExo === seance.exercices.length - 1;
}

/* La consigne s'enregistre à la frappe depuis le 10 septembre 2026, comme le
   reste de la séance. Elle n'était auparavant écrite que sur appui du bouton
   « Enregistrer », et `rendreExercice()` refermait l'éditeur en jetant son
   contenu : changer d'exercice en cours de saisie perdait le texte **sans
   rien dire**. Le passage automatique à l'exercice suivant après la
   dernière série (27 août 2026) rendait ce cas courant, et l'utilisateur y a
   perdu toutes ses notes de J4. */
let consigneAvantEdition = null;

function quitterEditionConsigne() {
  consigneAvantEdition = null;
  $('exo-consigne').hidden = false;
  $('exo-consigne-champ').hidden = true;
  $('bouton-consigne-modifier').hidden = false;
  $('bouton-consigne-enregistrer').hidden = true;
  $('bouton-consigne-annuler').hidden = true;
}

function modifierConsigne() {
  const champ = $('exo-consigne-champ');
  champ.value = $('exo-consigne').classList.contains('vide-consigne') ? '' : $('exo-consigne').textContent;
  // Retenu pour le bouton Annuler, seul à pouvoir défaire ce que la frappe a
  // déjà enregistré.
  consigneAvantEdition = champ.value;
  champ.hidden = false;
  $('exo-consigne').hidden = true;
  $('bouton-consigne-modifier').hidden = true;
  $('bouton-consigne-enregistrer').hidden = false;
  $('bouton-consigne-annuler').hidden = false;
  champ.focus();
}

function ecrireConsigneCourante(texte) {
  const courant = seance.exercices[indexExo];
  enregistrerConsigne(seance.jour, courant.nom, texte);
  $('exo-consigne').textContent = texte || 'Aucune consigne pour cet exercice.';
  $('exo-consigne').classList.toggle('vide-consigne', !texte);
}

function saisirConsigne() {
  if (!seance || estFooting()) return;
  ecrireConsigneCourante($('exo-consigne-champ').value.trim());
}

function enregistrerEditionConsigne() {
  ecrireConsigneCourante($('exo-consigne-champ').value.trim());
  quitterEditionConsigne();
}

function annulerEditionConsigne() {
  if (consigneAvantEdition !== null) ecrireConsigneCourante(consigneAvantEdition.trim());
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

/* Bandeau temporaire (2 s) donnant en chiffres l'écart de tonnage avec la
   même série la semaine passée (demande de l'utilisateur le 16 septembre
   2026) : la couleur des champs (appliquerCouleurTonnage) reste en place
   après, mais rien n'y disait jusque-là l'écart réel. Mêmes seuils
   d'affichage (±5 %) que la couleur, pour rester cohérent avec elle. Un
   élément fixe plutôt que posé sur la ligne : la dernière série d'un
   exercice change d'écran avant que les 2 s ne soient passées. */
let toastTonnage = null;
function afficherComparaisonTonnage(serie, reference) {
  if (serie.echauffement || !reference) return;
  const tonnageAvant = (reference.charge || 0) * (reference.reps || 0);
  if (!tonnageAvant) return;
  const tonnageMaintenant = (serie.charge || 0) * (serie.reps || 0);
  const ecart = Math.round(((tonnageMaintenant - tonnageAvant) / tonnageAvant) * 100);

  const bandeau = $('comparaison-tonnage');
  bandeau.textContent = (ecart > 0 ? '+' : '') + ecart + ' % vs la semaine dernière';
  bandeau.classList.remove('hausse', 'baisse');
  if (ecart <= -5) bandeau.classList.add('baisse');
  else if (ecart >= 6) bandeau.classList.add('hausse');

  bandeau.hidden = false;
  // Repart de zéro à chaque appel, même si le bandeau est déjà visible
  // (deux séries validées coup sur coup) : reflow forcé pour relancer la
  // transition d'apparition plutôt que de rester sur l'état "visible".
  bandeau.classList.remove('visible');
  void bandeau.offsetWidth;
  bandeau.classList.add('visible');

  if (toastTonnage) clearTimeout(toastTonnage);
  toastTonnage = setTimeout(() => { bandeau.classList.remove('visible'); }, 2000);
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
  const avant = derniereFois(courant.nom);
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
  const avant = avantConnu !== undefined ? avantConnu : derniereFois(courant.nom);
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
  const avant = derniereFois(exercice.nom);
  const rang = exercice.series.slice(0, index).filter((s) => !s.echauffement).length;
  const reference = avant && !serie.echauffement ? avant.series[rang] : null;

  // Une série validée sans chiffres n'apprend rien : on reprend ceux de la
  // dernière fois, affichés en filigrane, plutôt que d'enregistrer un vide.
  if (reference && (serie.charge == null || serie.reps == null)) {
    if (serie.charge == null) serie.charge = reference.charge;
    if (serie.reps == null) serie.reps = reference.reps;
  }

  serie.faite = true;
  serie.heure = new Date().toISOString();
  enregistrerSeance();
  afficherComparaisonTonnage(serie, reference);

  // Amorcer le clavier avant tout changement de DOM (voir amorcerClavier) :
  // le geste (Entrée ou la sortie du champ) est encore "chaud" à cet instant
  // précis, il ne l'est déjà plus une fois rendreSeries()/rendreExercice()
  // passé, qui remplacent le champ focalisé par un nouveau.
  //
  // **Jamais avant `serie.faite = true`.** Déplacer le focus fait perdre le
  // sien au champ des répétitions ; si sa valeur a été réellement tapée, le
  // navigateur y déclenche aussitôt `change`, qui rappelle cette fonction.
  // Placé en tête jusqu'au 10 septembre 2026, l'amorçage provoquait ainsi une
  // seconde validation imbriquée, et la dernière série faisait sauter deux
  // exercices. La série déjà marquée faite, le rappel s'arrête à sa garde.
  amorcerClavier();

  // La fiche du repos se lit avant tout changement d'exercice : c'est le
  // temps de récupération de l'exercice qu'on vient de finir qui compte.
  const fiche = ficheExercice();
  const repos = fiche.repos_s;

  // Dernière série d'un exercice : on passe au suivant sans attendre la fin
  // de la récupération (décision de l'utilisateur le 27 août 2026). La
  // minuterie continue de tourner par-dessus la fiche suivante, on peut donc
  // lire le prochain exercice pendant qu'on récupère du précédent.
  const toutFait = exercice.series.every((s) => s.faite);
  // Bilan du dernier repos de l'exercice (demande de l'utilisateur le
  // 16 septembre 2026) : tonnage total déjà connu (exercice.series au
  // complet), nom du suivant lu une fois indexExo avancé plus bas.
  const bilan = toutFait
    ? { tonnageActuel: tonnageDesSeries(exercice.series), tonnageAvant: avant ? avant.tonnage : null, nomSuivant: null }
    : null;
  if (toutFait && indexExo < seance.exercices.length - 1) {
    indexExo++;
    rendreExercice();
    bilan.nomSuivant = seance.exercices[indexExo].nom;
    // Remarques du prochain exercice (demande de l'utilisateur le
    // 17 septembre 2026, « pour pouvoir préparer la machine, position
    // etc ») : ficheExercice() lit déjà indexExo, qui vient d'avancer.
    bilan.consigneSuivante = consigneAffichee(seance.jour, bilan.nomSuivant, ficheExercice().consigne);
  } else {
    rendreSeries();
    rendreJauge();
  }
  focaliserProchaineSerie();

  if (!serie.echauffement || repos) {
    lancerMinuterie(repos || 90, bilan);
    // La minuterie doit se voir après chaque validation (demande de
    // l'utilisateur le 13 septembre 2026) : la saisie fait défiler la page
    // vers les séries, qui l'emportent sinon au-dessus du cadre.
    $('minuterie').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function rendreJauge() {
  $('jauge-remplie').style.width = (100 * proportionFaite()) + '%';
}

/* --------------------------------------------------------------- minuterie */

function lancerMinuterie(secondes, bilan) {
  const instance = {
    fin: Date.now() + secondes * 1000,
    duree: secondes,
    bilan: bilan || null,
  };
  minuterie = instance;
  $('minuterie').classList.remove('inactif');
  rendreBilanMinuterie(bilan || null);
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
  // elle-même, ce que l'utilisateur a demandé.
  //
  // Le plein écran repris le 16 septembre 2026 ferme malgré tout le clavier
  // à chaque repos, sans regarder `clavierPendantRecup` : c'est un clavier
  // resté ouvert qui poussait la couche plein écran d'origine hors du cadre
  // visible (panne du 27 août 2026, voir .minuterie-plein-ecran dans
  // css/style.css) ; le réglage n'a donc plus d'effet visible tant que le
  // repos reste plein écran. focaliserProchaineSerie(), appelée par
  // minuterieTerminee() à la fermeture, rouvre le clavier sur le bon champ :
  // rien à faire ici pour le retour.
  //
  // Affichage différé d'un tick (setTimeout 0) : lancerMinuterie() peut
  // être appelée en plein milieu d'un clic déjà commencé sur ← / →, la
  // validation implicite d'une série par sortie de champ (voir
  // departNavigation() plus bas) tombant entre son pointerdown et son
  // mouseup. Couvrir l'écran tout de suite y volerait le mouseup/click du
  // bouton, qui ne se terminerait jamais — la même panne que le plein écran
  // cherche à éviter côté clavier, déplacée sur un nouveau geste. Un tick
  // de retard laisse le clic en cours atteindre sa cible en premier.
  setTimeout(() => {
    if (minuterie !== instance) return;
    $('minuterie-plein-ecran').hidden = false;
    const actif = document.activeElement;
    if (actif && actif !== document.body) actif.blur();
  }, 0);
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

  // Le chiffre a cédé la place à une jauge le 16 septembre 2026 (voir
  // .jauge-pilule dans css/style.css) : seul le pourcentage écoulé reste
  // affiché visuellement, le temps exact restant ne survit qu'en aria-label
  // pour un lecteur d'écran.
  const progres = Math.min(1, Math.max(0, 1 - restant / minuterie.duree));
  const pourcent = (progres * 100) + '%';
  $('minuterie-jauge-remplissage').style.width = pourcent;
  $('minuterie-plein-ecran-jauge-remplissage').style.width = pourcent;
  const libelle = 'Récupération, ' + texteDuree(restant) + ' restant';
  $('minuterie').setAttribute('aria-label', libelle);
  $('minuterie-plein-ecran').setAttribute('aria-label', libelle);

  // Chiffre repris le 17 septembre 2026, mais seulement sur le dernier
  // repos d'un exercice (demande de l'utilisateur) : le temps exact compte
  // ici pour savoir combien de temps reste pour régler la machine
  // suivante, ce qui ne vaut pas pour un repos ordinaire (voir .jauge-pilule
  // plus haut, qui reste seule ailleurs).
  if (minuterie.bilan) $('minuterie-bilan-chiffres').textContent = texteDuree(restant);

  // Le plein écran laisse la main avant la fin, dans les 20 % de temps
  // restant (demande de l'utilisateur le 16 septembre 2026) : bloquer tout
  // le repos empêchait de préparer la série suivante avant qu'il ne se
  // termine, ce que le bandeau compact permettait déjà (la minuterie
  // continue de tourner par-dessus la fiche suivante, décision du 27 août
  // 2026). Le clavier ne se rouvre pas de lui-même à cet instant : aucun
  // navigateur mobile ne l'ouvre sans geste de l'utilisateur, même
  // limitation que sur la fermeture naturelle à zéro (minuterieTerminee).
  if (restant <= minuterie.duree * 0.2) {
    $('minuterie-plein-ecran').hidden = true;
  }
}

function arreterMinuterie() {
  arreterMinuteurGainage();
  minuterie = null;
  if (tictac) clearInterval(tictac);
  tictac = null;
  $('minuterie').classList.add('inactif');
  $('minuterie-jauge-remplissage').style.width = '0%';
  $('minuterie-plein-ecran').hidden = true;
  $('minuterie-plein-ecran-jauge-remplissage').style.width = '0%';
  rendreBilanMinuterie(null);
}

/* Bilan du dernier repos d'un exercice (demande de l'utilisateur le
   16 septembre 2026) : tonnage total de l'exercice qui vient de se
   terminer face à la semaine dernière, puis nom du prochain exercice.
   `bilan` vaut null sur un repos ordinaire (rien à comparer avant la fin
   de tous les exercices). Voir validerSerie(). */
function rendreBilanMinuterie(bilan) {
  const bloc = $('minuterie-plein-ecran-bilan');
  const ligneChiffres = $('minuterie-bilan-chiffres');
  const ligneTonnage = $('minuterie-bilan-tonnage');
  const ligneSuivant = $('minuterie-bilan-suivant');
  const ligneConsigne = $('minuterie-bilan-consigne');

  ligneChiffres.hidden = true;
  ligneTonnage.hidden = true;
  ligneSuivant.hidden = true;
  ligneConsigne.hidden = true;

  if (!bilan) { bloc.hidden = true; return; }

  // Chiffre exact (demande de l'utilisateur le 17 septembre 2026) : réservé
  // à ce bilan, voir battre() plus haut qui le tient à jour tant qu'il est
  // affiché. Toujours affiché dès qu'un bilan existe : c'est justement le
  // temps dont on dispose pour régler la machine suivante.
  ligneChiffres.textContent = texteDuree(minuterie ? (minuterie.fin - Date.now()) / 1000 : 0);
  ligneChiffres.hidden = false;

  if (bilan.tonnageAvant) {
    const ecart = Math.round(((bilan.tonnageActuel - bilan.tonnageAvant) / bilan.tonnageAvant) * 100);
    ligneTonnage.textContent = 'Tonnage exercice ' + (ecart > 0 ? '+' : '') + ecart + ' % vs la semaine dernière';
    ligneTonnage.hidden = false;
  }
  if (bilan.nomSuivant) {
    ligneSuivant.textContent = 'Ensuite : ' + bilan.nomSuivant;
    ligneSuivant.hidden = false;
  }
  // Remarques (consigne technique) du prochain exercice, pour préparer la
  // machine ou la position pendant ce dernier repos (même demande).
  if (bilan.consigneSuivante) {
    ligneConsigne.textContent = bilan.consigneSuivante;
    ligneConsigne.hidden = false;
  }
  bloc.hidden = false;
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
  if (reglages.notification) notifierRecuperationTerminee();
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

/* Alerte hors application (demande de l'utilisateur le 13 septembre 2026, le
   bip ne s'entend pas quand le téléphone est ailleurs que sur l'appli) : une
   notification système, qui a son propre son et sa propre vibration côté OS,
   contrairement au bip Web Audio qui ne joue que si la page est au premier
   plan. `new Notification()` échoue sur Chrome Android (« Illegal
   constructor ») ; seul `ServiceWorkerRegistration.showNotification` marche
   depuis une page mobile, d'où le passage par le service worker déjà
   enregistré pour le mode hors ligne. `tag` + `renotify` remplacent la
   notification précédente au lieu de les empiler à chaque récupération. */
function notifierRecuperationTerminee() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.ready.then((registration) => {
    registration.showNotification('Récupération terminée', {
      body: 'Série suivante.',
      tag: 'muscu-repos',
      renotify: true,
      vibrate: [180, 90, 180],
      silent: false,
    });
  }).catch(() => {});
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
  if (estGainage()) {
    terminerGainage(resume);
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

  // Comparaison sur l'indicateur retenu (voir premiereSerieDeTravail) et non
  // plus sur le tonnage : première série de travail de l'exercice 1.
  const precedente = derniereSeanceDuJour(seance.jour);
  let comparaison = '';
  const premier = seance.exercices[0];
  const maintenant = premiereSerieDeTravail(premier);
  const avantSerie = precedente && premier
    ? premiereSerieDeTravail((precedente.exercices || []).find((e) => memeExercice(e.nom, premier.nom)))
    : null;
  if (maintenant && avantSerie) {
    const ecart = Math.round((indicateur(maintenant) - indicateur(avantSerie)) * 10) / 10;
    // La mesure ne vaut qu'à RIR constant : on le dit plutôt que de comparer
    // deux séries qui n'ont pas été menées au même effort.
    const rirDifferent = maintenant.rir != null && avantSerie.rir != null &&
      maintenant.rir !== avantSerie.rir;
    comparaison = '<p class="carte-detail">Indicateur de séance, 1re série de ' +
      echapper(premier.nom) + ' : ' + maintenant.charge + ' × ' + maintenant.reps +
      ', contre ' + avantSerie.charge + ' × ' + avantSerie.reps + ' la dernière fois (' +
      (ecart >= 0 ? '+' : '') + ecart + ').' +
      (rirDifferent ? ' RIR différent (' + maintenant.rir + ' contre ' + avantSerie.rir +
        '), comparaison indicative.' : '') + '</p>';
  }

  resume.innerHTML =
    '<h3>' + echapper(seance.jour + ' ' + nomDuJour(seance.titre)) + '</h3>' +
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

  resume.innerHTML = '<h3>' + echapper(seance.jour + ' ' + nomDuJour(seance.titre)) + '</h3>';

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
  GAINAGE_FOOTING_ANCIEN.forEach((exo) => {
    const tenues = (seance.gainage || {})[exo.cle] || [];
    const faites = tenues.filter((v) => v != null);
    if (!faites.length) return;
    const total = faites.reduce((somme, v) => somme + v, 0);
    resume.innerHTML +=
      '<div class="resume-exo">' +
        '<div class="resume-exo-nom">' + echapper(exo.nom) + '</div>' +
        '<div class="resume-exo-series">' +
          faites.map((v) => v + ' ' + uniteGainage(exo)).join('  ·  ') +
          '  (total ' + total + ' ' + uniteGainage(exo) + ')' +
        '</div>' +
      '</div>';
  });
  resume.innerHTML += lignesMouvementsHtml(seance, ['farmer_walk']);

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

  // Exercices restes sans aucune serie validee : signales, jamais bloquants
  // (demande de l'utilisateur le 10 septembre 2026). Les jours de course
  // n'ont pas d'exercices numerotes, le resume y dit deja "Aucune sortie
  // renseignee" quand rien n'a ete saisi.
  const alerte = $('fin-alerte');
  const oublies = estFooting()
    ? []
    : (seance.exercices || []).filter((e) => !(e.series || []).some((x) => x.faite));
  alerte.hidden = !oublies.length;
  alerte.textContent = oublies.length === 1
    ? 'Un exercice n’a aucune série validée : ' + oublies[0].nom + '.'
    : oublies.length + ' exercices n’ont aucune série validée : ' +
      oublies.map((e) => e.nom).join(', ') + '.';

  const blessure = seance.blessure || {};
  $('fin-blessure-serie').value = blessure.serie || '';
  $('fin-blessure-texte').value = blessure.texte || '';
  $('fin-blessure-exercices').innerHTML = nomsDesExercices()
    .map((nom) => '<option value="' + echapper(nom) + '"></option>').join('');

  afficher('fin');
}

/* Suggestions du champ « série concernée » : ce que la séance du jour
   propose réellement, exercices de musculation ou types de course et
   gainage. Des suggestions, pas une liste fermée : une douleur peut ne
   tenir à aucune série (voir le champ dans index.html). */
function nomsDesExercices() {
  if (estGainage()) {
    return CATEGORIES_GAINAGE.map((c) =>
      MOUVEMENTS_GAINAGE[(seance.choix || {})[c.cle] || c.mouvements[0]].nom);
  }
  if (!estFooting()) return (seance.exercices || []).map((e) => e.nom);
  const carte = seance.footing || {};
  return TYPES_COURSE.filter((t) => carte[t.cle]).map((t) => t.complet);
}

/* Une fois la séance envoyée, on atterrit sur sa fiche dans « Séances
   enregistrées » plutôt que sur l'accueil (demande de l'utilisateur le
   10 septembre 2026) : c'est exactement la page qu'on rouvrira plus tard pour
   relire cette séance, et sa pastille dit si elle a atteint le classeur.
   Seule l'erreur d'envoi reste sur l'écran de fin : son message nomme la
   cause, que la pastille « en attente » ne dirait pas. */
function afficherSeanceEnregistree(id) {
  rendreHistorique(id);
  afficher('historique');
}

function enregistrerEtSynchroniser() {
  const idEnregistre = seance.id;
  seance.fin = new Date().toISOString();
  seance.lignesGainage = lignesGainage(seance);
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
    setTimeout(() => afficherSeanceEnregistree(idEnregistre), 2200);
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
    setTimeout(() => afficherSeanceEnregistree(idEnregistre), 1600);
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

/* Les consignes techniques ne vivaient, jusqu'au 13 septembre 2026, que dans
   le stockage local du téléphone (`CLES.consignes`) : jamais envoyées au
   pont, elles seraient perdues sans recours si l'appareil était remplacé ou
   son stockage effacé, contrairement à l'historique des séances, qui survit
   dans le classeur une fois synchronisé. L'ensemble courant part à chaque
   synchronisation, pas seulement la consigne qui vient de changer : plus
   simple qu'un suivi de ce qui a changé, pour un volume qui ne pèse rien.
   Une sauvegarde manquée ne bloque jamais l'envoi des séances, le vrai enjeu
   de `synchroniser()` : voir `feuilleConsignes`/`ecrireConsignes` côté
   `appsscript/Code.gs`, page de secours jamais relue par l'application. */
async function synchroniserConsignes() {
  const consignes = lire(CLES.consignes, {});
  if (!Object.keys(consignes).length) return;
  try {
    await envoyer({ action: 'consignes', consignes });
  } catch (e) {
    console.warn('Sauvegarde des consignes différée', e);
  }
}

/* Une mensuration à la fois, jamais l'ensemble comme les consignes : une
   photo compressée pèse plusieurs dizaines de Ko, renvoyer tout le passé à
   chaque synchronisation gaspillerait des données pour rien. Chaque échec
   est isolé (try/catch par mensuration) : une photo qui échoue ne doit pas
   empêcher les valeurs d'une autre date de partir. */
async function synchroniserMensurations() {
  const toutes = lireMensurations();
  const attente = toutes.filter((m) => !m.envoyee);
  for (const m of attente) {
    try {
      await envoyer({ action: 'mensuration', mensuration: m });
      m.envoyee = true;
    } catch (e) {
      console.warn('Synchronisation de mensuration différée', e);
    }
  }
  ecrire(CLES.mensurations, toutes);
}

/* Le sommeil n'avait jusqu'au 16 septembre 2026 aucune sauvegarde classeur,
   contrairement aux consignes et aux mensurations : repéré en relisant le
   pont, pas demandé par l'utilisateur. Même principe que les consignes,
   pour la même raison (une nuit se corrige après coup — insomnie ajoutée
   le lendemain, raison oubliée — l'envoi une fois pour toutes des
   mensurations ne conviendrait pas) : l'ensemble courant repart à chaque
   synchronisation, `ecrireSommeil` (appsscript/Code.gs) met à jour la ligne
   de chaque nuit plutôt que d'en ajouter une. Les libellés des raisons
   d'insomnie sont traduits ici (RAISONS_INSOMNIE) : le classeur ne connaît
   que les clés brutes sans cette table.
   Nécessite le redéploiement du pont pour atteindre réellement le classeur,
   comme les trois autres évolutions du 16 septembre 2026. */
async function synchroniserSommeil() {
  const nuits = lireSommeil();
  if (!nuits.length) return;
  const version = nuits.map((n) => Object.assign({}, n, {
    raisons: (n.raisons || []).map((cle) => (RAISONS_INSOMNIE.find((r) => r.cle === cle) || {}).nom || cle),
  }));
  try {
    await envoyer({ action: 'sommeil', nuits: version });
  } catch (e) {
    console.warn('Sauvegarde du sommeil différée', e);
  }
}

async function synchroniser() {
  if (!reglages.pont) return 0;
  await synchroniserConsignes();
  await synchroniserMensurations();
  await synchroniserSommeil();

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
  $('reglage-notification').checked = reglages.notification
    && typeof Notification !== 'undefined' && Notification.permission === 'granted';
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
    notification: $('reglage-notification').checked,
  };
  ecrire(CLES.reglages, reglages);
}

/* Vue d'ensemble mensuelle du menu Suivi (demande de l'utilisateur le
   16 septembre 2026), premier contenu de ce sous-menu : les cases du mois
   en cours, avec l'icône du type de la première séance enregistrée ce
   jour-là (muscu, footing ou gainage). Ne distingue pas J1 de J3 : ce
   niveau de détail vit dans l'historique, ici c'est un coup d'œil. */
function rendreCalendrier() {
  const parJour = {};
  lireTableau(CLES.historique).filter((s) => s.fin).forEach((s) => {
    const cle = dateCourte(s.fin);
    if (!parJour[cle]) parJour[cle] = s;
  });

  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth();
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  // Lundi en premier plutôt que dimanche (getDay() renvoie 0 pour dimanche).
  const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7;

  let html = '';
  for (let i = 0; i < decalage; i++) html += '<span class="calendrier-case vide"></span>';
  for (let jour = 1; jour <= nbJours; jour++) {
    const cle = String(jour).padStart(2, '0') + '/' + String(mois + 1).padStart(2, '0') + '/' + annee;
    const seance = parJour[cle];
    const aujourdhui = jour === maintenant.getDate();
    html += '<span class="calendrier-case' + (aujourdhui ? ' aujourdhui' : '') + '">' +
      '<span class="calendrier-num">' + jour + '</span>' +
      (seance ? '<span class="calendrier-icone">' + iconeJour({ type: seance.type, code: seance.jour }) + '</span>' : '') +
      '</span>';
  }
  $('calendrier').innerHTML =
    '<div class="calendrier-entetes">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D']
      .map((j) => '<span>' + j + '</span>').join('') + '</div>' +
    '<div class="calendrier-grille">' + html + '</div>';
}

/* Évolution course, dernier contenu du menu Suivi ajouté le 16 septembre
   2026 : les distances et durées existent déjà dans muscu.historique,
   saisies séance après séance sur l'écran de footing, ce n'est qu'un
   nouvel affichage. Un type à la fois (mêmes boutons .type-course que
   l'écran de footing) : les quatre courent à des allures différentes, les
   mélanger sur une même courbe n'aurait pas de sens. Seul le premier
   passage de chaque sortie compte, comme pour la comparaison à la dernière
   fois (majAllureCycle) : les passages suivants n'ont pas d'équivalent
   fixe d'une séance à l'autre. J2 et J6 partagent déjà leurs données
   (footingParType lit tous les jours de course confondus), rien à filtrer
   ici par jour. */
function rendreEvolutionCourse() {
  const boutons = $('course-evolution-types');
  boutons.innerHTML = '';
  TYPES_COURSE.forEach((type, position) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'type-course' + (position === indexTypeEvolution ? ' choisi' : '');
    bouton.textContent = type.nom;
    bouton.addEventListener('click', () => {
      indexTypeEvolution = position;
      rendreEvolutionCourse();
    });
    boutons.appendChild(bouton);
  });

  const type = TYPES_COURSE[indexTypeEvolution];
  const sorties = lireTableau(CLES.historique)
    .filter((s) => s.type === 'footing' && s.fin)
    .sort((a, b) => new Date(a.fin) - new Date(b.fin))
    .map((s) => ({ fin: s.fin, cycle: premierPassage(footingParType(s)[type.cle]) }))
    .filter((x) => x.cycle && x.cycle.duree_min && x.cycle.distance_km);

  const corps = $('course-evolution-corps');
  if (sorties.length < 2) {
    corps.innerHTML = '<p class="vide">Pas encore assez de sorties enregistrées en ' +
      echapper(type.nom) + ' pour tracer une évolution (deux minimum).</p>';
    return;
  }

  // Vitesse plutôt qu'allure pour la courbe : « plus haut = plus rapide »
  // suit la même lecture que les autres courbes de l'application (plus
  // haut = mieux), alors qu'une allure en minutes par km ferait descendre
  // la ligne en progressant. Le texte, lui, reste en allure km/km,
  // repère habituel du coureur, comme sur l'écran de footing.
  const vitesses = sorties.map((s) => (s.cycle.distance_km / s.cycle.duree_min) * 60);
  const distances = sorties.map((s) => s.cycle.distance_km);

  const derniere = sorties[sorties.length - 1].cycle;
  const precedente = sorties[sorties.length - 2].cycle;
  const allure = derniere.duree_min / derniere.distance_km;
  const minutes = Math.floor(allure);
  const secondes = Math.round((allure - minutes) * 60);
  const allureAvant = precedente.duree_min / precedente.distance_km;
  const ecartSecondes = Math.round(Math.abs(allure - allureAvant) * 60);
  const sensAllure = ecartSecondes < 3 ? '' : (allure < allureAvant ? ' hausse' : ' baisse');

  const totalKm = Math.round(distances.reduce((a, b) => a + b, 0) * 10) / 10;

  corps.innerHTML =
    courbe(vitesses, 'vitesse en km/h, ' + type.nom.toLowerCase()) +
    '<div class="courbe-legende">' +
      'Dernière sortie : allure ' + minutes + ':' + String(secondes).padStart(2, '0') + ' / km' +
      (sensAllure ? '<span class="compare' + sensAllure + '">' +
        ecartSecondes + ' s/km ' + (sensAllure === ' hausse' ? 'plus rapide' : 'plus lent') +
        ' que la précédente</span>' : '') +
    '</div>' +
    courbe(distances, 'distance en km, ' + type.nom.toLowerCase()) +
    '<div class="courbe-legende">' +
      sorties.length + ' sorties enregistrées, ' + totalKm + ' km au total' +
    '</div>';
}

/* État musculaire, gadget du menu Suivi demandé le 16 septembre 2026 :
   indicatif, pas une mesure. Chaque zone récupère à une vitesse forfaitaire
   (48 h les petits groupes, 72 h les gros, l'utilisateur ayant lui-même
   noté que les petits groupes récupèrent plus vite) depuis la dernière
   série validée qui l'a travaillée, tous exercices confondus. Les muscles
   visibles de face vivent sur le mannequin ; les autres (dos, arrière
   d'épaule, fessiers, ischio-jambiers, mollets) en liste dessous, faute
   d'une vue de dos. Le champ `muscle` du classeur porte parfois le même
   muscle sous deux graphies (ex. "Deltoide lateral" et "Deltoïde latéral"
   coexistent dans le programme actuel) : la comparaison passe par
   formeDuNom() plutôt que par égalité stricte, pour ne pas en perdre une. */
const ZONES_MUSCULAIRES = [
  { cle: 'pectoraux', nom: 'Pectoraux', muscles: ['pectoraux'], recuperation_h: 72, vue: 'avant' },
  { cle: 'epaules', nom: 'Épaules', muscles: ['deltoide lateral'], recuperation_h: 48, vue: 'avant' },
  { cle: 'biceps', nom: 'Biceps', muscles: ['biceps'], recuperation_h: 48, vue: 'avant' },
  { cle: 'quadriceps', nom: 'Quadriceps', muscles: ['quadriceps'], recuperation_h: 72, vue: 'avant' },
  { cle: 'dos', nom: 'Dos', muscles: ['grand dorsal'], recuperation_h: 72, vue: 'liste' },
  { cle: 'epaules-arriere', nom: 'Épaules arrière', muscles: ['deltoide posterieur'], recuperation_h: 48, vue: 'liste' },
  { cle: 'triceps', nom: 'Triceps', muscles: ['triceps'], recuperation_h: 48, vue: 'liste' },
  { cle: 'fessiers', nom: 'Fessiers', muscles: ['grand fessier', 'abducteurs et moyen fessier'], recuperation_h: 72, vue: 'liste' },
  { cle: 'ischios', nom: 'Ischio-jambiers', muscles: ['ischio-jambiers et fessiers'], recuperation_h: 72, vue: 'liste' },
  { cle: 'mollets', nom: 'Mollets', muscles: ['mollets'], recuperation_h: 48, vue: 'liste' },
];

/* Mannequin réaliste (17 septembre 2026, chantier débloqué : une base
   libre existait, pas besoin d'un outil de génération d'image), remplace
   les cercles et rectangles dessinés à la main des deux mannequins
   ci-dessous et de celui de Mensurations (plus bas dans ce fichier).
   Polygones repris de `react-body-highlighter`
   (github.com/giavinh79/react-body-highlighter, licence MIT), repère
   1000 x 2000. `zone` vaut une clé de ZONES_MUSCULAIRES quand le polygone
   est suivi par l'application, `null` sinon (tête, cou, avant-bras, abdos,
   obliques, adducteurs/abducteurs, genoux, soléaires) : ces derniers
   restent en silhouette neutre par `rendreMannequinPolygones()` plutôt que
   de laisser un trou dans le corps. Triceps et mollets ont un polygone sur
   les deux vues (visibles de face comme de dos dans la source), plus
   fidèle qu'un seul côté choisi arbitrairement. `dos` regroupe trapèze,
   haut et bas du dos (trois paires de la source) sous une seule couleur :
   même simplification qu'avant, un seul muscle suivi par zone. */
const MANNEQUIN_AVANT = [
  { zone: 'pectoraux', points: ['518 416 510 551 580 580 678 555 706 473 620 416', '298 465 314 555 408 580 482 551 478 420 376 420'] },
  { zone: null, points: ['686 633 673 571 588 596 600 641 604 833 657 788 665 698', '339 784 331 718 310 633 322 571 408 592 392 633 392 837'] },
  { zone: null, points: ['563 592 580 641 584 780 584 927 563 984 551 1041 514 1078 510 845 506 673 510 571', '437 588 486 571 490 673 486 845 482 1073 445 1037 408 914 408 784 412 645'] },
  { zone: 'biceps', points: ['167 682 180 714 229 661 290 539 278 494 204 559', '714 494 702 547 763 661 816 718 829 690 788 555'] },
  { zone: 'triceps', points: ['694 555 694 616 759 727 776 702 755 673', '224 694 298 555 298 608 229 731'] },
  { zone: null, points: ['555 237 506 335 506 392 616 400 706 449 694 367 633 351 584 306', '290 449 302 371 363 351 412 302 445 245 490 339 486 392 380 396'] },
  { zone: 'epaules', points: ['784 531 796 478 792 412 759 380 710 363 722 429 714 473', '282 473 212 531 200 478 204 408 245 371 286 371 269 433'] },
  { zone: null, points: ['424 29 400 118 420 196 461 233 498 253 547 224 576 192 592 102 571 24 498 0'] },
  { zone: null, points: ['527 1102 543 1249 600 1102 620 1000 649 943 600 927 567 1045', '478 1106 449 1253 420 1159 404 1131 396 1073 380 1024 347 939 396 922 416 992 437 1053'] },
  { zone: 'quadriceps', points: ['347 988 371 1082 371 1278 343 1371 310 1327 294 1200 282 1114 294 1008 322 947', '633 1057 645 1000 669 947 702 1012 710 1118 682 1331 653 1376 624 1286 620 1114', '388 1294 384 1122 412 1184 445 1294 429 1351 400 1461 363 1465 355 1400', '596 1457 555 1290 608 1139 612 1302 641 1396 629 1465', '327 1384 265 1457 257 1367 257 1273 269 1143 294 1335', '718 1131 739 1241 739 1404 727 1457 665 1384 702 1335'] },
  { zone: null, points: ['339 1400 347 1433 355 1473 363 1510 351 1567 298 1567 273 1527 273 1473 302 1441', '657 1400 722 1478 722 1522 698 1571 649 1567 629 1510'] },
  { zone: 'mollets', points: ['714 1604 735 1535 767 1612 796 1678 784 1878 796 1955 747 1955', '249 1947 278 1649 282 1604 261 1543 249 1576 224 1616 208 1678 220 1882 208 1955', '727 1951 698 1592 653 1584 641 1624 641 1653 657 1771', '355 1584 359 1624 359 1669 351 1722 351 1767 322 1820 306 1873 269 1947 273 1878 282 1804 286 1755 290 1698 298 1641 302 1588'] },
  { zone: null, points: ['61 886 102 751 147 702 163 743 192 735 45 976 0 1000', '845 698 833 735 800 731 951 984 1000 1004 935 894 898 763', '776 722 776 776 804 841 853 898 922 1012 947 996', '69 1012 135 906 188 841 216 771 212 718 49 988'] },
];

const MANNEQUIN_ARRIERE = [
  { zone: null, points: ['506 0 460 9 409 55 404 128 451 200 557 200 591 136 596 47 557 13'] },
  { zone: 'dos', points: ['447 217 477 217 472 383 477 647 383 532 353 409 311 366 391 332 438 272', '523 217 557 217 566 272 609 328 689 366 647 404 617 532 523 647 532 383'] },
  { zone: 'epaules-arriere', points: ['294 370 230 391 174 443 183 536 243 494 272 464', '711 370 783 396 826 447 817 536 749 489 723 451'] },
  { zone: 'dos', points: ['311 387 281 489 285 553 340 753 472 711 472 664 366 540 336 413', '689 387 719 494 715 562 660 753 528 711 528 664 634 545 664 417'] },
  { zone: 'triceps', points: ['268 498 179 557 145 723 166 817 217 638 268 557', '736 502 821 557 860 732 834 821 779 630 732 557', '268 583 268 685 230 753 191 774 226 655', '728 583 770 647 804 774 766 753 728 689'] },
  { zone: 'dos', points: ['477 728 345 770 353 834 494 1021 468 830', '523 728 655 770 647 834 506 1021 532 838'] },
  { zone: null, points: ['864 757 911 834 932 940 1000 1064 962 1043 881 894 843 838', '136 757 89 838 68 936 0 1064 38 1043 123 885 157 830', '813 796 774 779 791 847 911 1038 932 1089 945 1047', '187 796 221 779 209 843 94 1030 68 1085 51 1047'] },
  { zone: 'fessiers', points: ['447 996 302 1085 298 1187 315 1260 472 1213 494 1149', '553 991 511 1145 523 1209 681 1260 698 1191 694 1085'] },
  { zone: null, points: ['481 1230 447 1230 413 1255 451 1443 485 1357 489 1294', '519 1226 557 1234 591 1260 549 1443 519 1362 511 1294'] },
  { zone: 'ischios', points: ['289 1221 311 1294 366 1260 353 1353 345 1502 294 1583 289 1468 277 1413 272 1315', '715 1217 694 1289 638 1260 655 1366 664 1502 711 1583 715 1477 728 1421 736 1319', '387 1255 443 1460 404 1668 362 1528 370 1353', '617 1255 634 1362 643 1532 600 1668 562 1464'] },
  { zone: null, points: ['345 1532 311 1591 336 1664 374 1626', '664 1536 630 1630 668 1664 694 1591'] },
  { zone: 'mollets', points: ['294 1604 285 1672 247 1796 238 1928 255 1970 285 1932 298 1800 319 1711 319 1668', '374 1651 353 1677 332 1719 311 1804 302 1919 340 2000 387 1906 391 1689', '630 1651 613 1685 617 1906 664 1996 706 1919 689 1796 668 1702', '706 1604 723 1685 757 1791 766 1928 745 1966 723 1936 706 1796 681 1681'] },
  { zone: null, points: ['285 1957 302 1957 336 2017 306 2200 285 2136 268 1983'] },
  { zone: null, points: ['698 1957 719 1957 736 1983 719 2132 702 2196 672 2021'] },
];

/* Rendu commun aux trois mannequins de l'application (État musculaire,
   Tonnage par muscle, Mensurations) : un polygone par entrée de
   MANNEQUIN_AVANT/MANNEQUIN_ARRIERE, `zoneAttrs(cle)` fournissant les
   attributs (classe, style, data-zone…) des zones suivies. Sans
   `zoneAttrs` (Mensurations, qui ne suit aucun état), tout le corps
   — zones suivies comprises — reste en silhouette neutre : ce mannequin-là
   ne sert que de fond aux repères de mesure. */
function rendreMannequinPolygones(donnees, libelleVue, zoneAttrs, titreZone, contenuSupplementaire) {
  const polys = donnees.map((entree) => {
    if (!entree.zone || !zoneAttrs) {
      return entree.points.map((p) => '<polygon class="silhouette" points="' + p + '"></polygon>').join('');
    }
    const titre = titreZone ? '<title>' + echapper(titreZone(entree.zone)) + '</title>' : '';
    return entree.points.map((p) => (
      '<polygon ' + zoneAttrs(entree.zone) + ' points="' + p + '">' + titre + '</polygon>'
    )).join('');
  }).join('');
  return '<svg viewBox="0 0 1000 2000" class="mannequin-svg" role="img" aria-label="Mannequin, ' +
    libelleVue + '">' + polys + (contenuSupplementaire || '') + '</svg>';
}

function derniereFoisZone(zone) {
  let dernier = null;
  lireTableau(CLES.historique).forEach((s) => {
    (s.exercices || []).forEach((exo) => {
      if (!zone.muscles.includes(formeDuNom(exo.muscle))) return;
      (exo.series || []).forEach((serie) => {
        if (!serie.faite || !serie.heure || serie.echauffement) return;
        if (!dernier || serie.heure > dernier) dernier = serie.heure;
      });
    });
  });
  return dernier;
}

function etatZone(zone) {
  const dernier = derniereFoisZone(zone);
  if (!dernier) return { fraction: 1, texte: 'Jamais travaillée' };
  const heures = (Date.now() - new Date(dernier).getTime()) / 3600000;
  return { fraction: Math.max(0, Math.min(1, heures / zone.recuperation_h)), texte: 'Dernière fois : ' + ilYA(dernier) };
}

function couleurEtat(fraction) {
  if (fraction < 0.34) return 'zone-fatigue';
  if (fraction < 0.85) return 'zone-recup';
  return 'zone-prete';
}

function rendreEtatMusculaire() {
  const etats = {};
  ZONES_MUSCULAIRES.forEach((zone) => { etats[zone.cle] = etatZone(zone); });
  const classe = (cle) => couleurEtat(etats[cle].fraction);
  const titreZone = (cle) => {
    const zone = ZONES_MUSCULAIRES.find((z) => z.cle === cle);
    return zone.nom + ' — ' + etats[cle].texte;
  };

  // Mannequin réaliste (17 septembre 2026, voir MANNEQUIN_AVANT/ARRIERE et
  // rendreMannequinPolygones() plus haut) : silhouette neutre pour les
  // parties non suivies, couleur d'état (fatigue/récup/prête) pour les dix
  // zones. La liste en dessous du mannequin reste la source la plus
  // lisible pour les zones vues de dos (le nom d'une zone ne doit pas
  // dépendre d'un survol ou d'un appui long sur mobile), inchangé depuis
  // le 16 septembre 2026.
  const zoneAttrs = (cle) => 'class="' + classe(cle) + '" data-zone="' + cle + '"';
  const avant = rendreMannequinPolygones(MANNEQUIN_AVANT, 'de face', zoneAttrs, titreZone);
  const arriere = rendreMannequinPolygones(MANNEQUIN_ARRIERE, 'de dos', zoneAttrs, titreZone);

  $('mannequin').innerHTML =
    '<div class="mannequin-paire">' +
      '<div class="mannequin-vue"><p class="mannequin-vue-titre">Avant</p>' + avant + '</div>' +
      '<div class="mannequin-vue"><p class="mannequin-vue-titre">Arrière</p>' + arriere + '</div>' +
    '</div>';

  $('mannequin-liste').innerHTML = ZONES_MUSCULAIRES.filter((z) => z.vue === 'liste').map((zone) => (
    '<div class="etat-pastille ' + classe(zone.cle) + '">' +
      '<span class="etat-pastille-nom">' + echapper(zone.nom) + '</span>' +
      '<span class="etat-pastille-detail">' + echapper(etats[zone.cle].texte) + '</span>' +
    '</div>'
  )).join('');
}

/* Tonnage par muscle, sixième et dernier contenu du menu Suivi ajouté le
   16 septembre 2026, mannequin cliquable réclamé par l'utilisateur à partir
   des captures d'applications tierces envoyées comme référence. Différent
   du tonnage écarté comme indicateur de progression sur un exercice (voir
   plus haut, "L'indicateur de progression est la première série de
   travail") : là, le problème était de comparer deux séances entre elles,
   le tonnage montant mécaniquement quand la charge baisse et que les
   répétitions montent. Ici, pas de comparaison série à série : une simple
   somme par zone sur une fenêtre glissante, pour repérer un déséquilibre de
   volume entre groupes musculaires — usage reconnu en musculation (suivi du
   volume hebdomadaire), qui ne prête pas à la même confusion. Réutilise
   ZONES_MUSCULAIRES (voir État musculaire ci-dessus) plutôt qu'une table
   muscle → exercices séparée : même simplification déjà en place, un seul
   muscle par exercice, pas de muscles secondaires. */
const TONNAGE_PERIODE_JOURS = 7;
let zoneTonnageChoisie = null;

function tonnageZone(zone, depuis) {
  let total = 0;
  lireTableau(CLES.historique).forEach((s) => {
    if (!s.fin || new Date(s.fin) < depuis) return;
    (s.exercices || []).forEach((exo) => {
      if (!zone.muscles.includes(formeDuNom(exo.muscle))) return;
      total += tonnageDesSeries(exo.series || []);
    });
  });
  return total;
}

function exercicesZoneTonnage(zone, depuis) {
  const parNom = {};
  lireTableau(CLES.historique).forEach((s) => {
    if (!s.fin || new Date(s.fin) < depuis) return;
    (s.exercices || []).forEach((exo) => {
      if (!zone.muscles.includes(formeDuNom(exo.muscle))) return;
      const t = tonnageDesSeries(exo.series || []);
      if (!t) return;
      parNom[exo.nom] = (parNom[exo.nom] || 0) + t;
    });
  });
  return Object.entries(parNom).sort((a, b) => b[1] - a[1]);
}

function actionnerZoneTonnage(cle) {
  zoneTonnageChoisie = cle;
  rendreTonnageMuscles();
}

function rendreTonnageMuscles() {
  const depuis = new Date(Date.now() - TONNAGE_PERIODE_JOURS * 86400000);
  const tonnages = {};
  ZONES_MUSCULAIRES.forEach((zone) => { tonnages[zone.cle] = tonnageZone(zone, depuis); });
  const max = Math.max(1, ...Object.values(tonnages));

  const titreZone = (cle) => {
    const zone = ZONES_MUSCULAIRES.find((z) => z.cle === cle);
    return zone.nom + ' — ' + tonnages[cle] + ' kg';
  };
  // Opacité plutôt que trois couleurs discrètes (État musculaire) : le
  // tonnage est une quantité continue, pas un état à trois paliers. 0,12
  // minimum pour qu'une zone jamais travaillée reste repérable sur le fond
  // clair, sans jamais se confondre avec la silhouette neutre.
  const styleZone = (cle) => 'fill: var(--accent-clair); fill-opacity: ' +
    (0.12 + 0.88 * (tonnages[cle] / max)).toFixed(2) + ';' +
    (cle === zoneTonnageChoisie ? ' stroke: var(--accent); stroke-width: 2;' : '');
  // Mannequin réaliste (17 septembre 2026, voir MANNEQUIN_AVANT/ARRIERE et
  // rendreMannequinPolygones() plus haut) : les dix zones sont désormais
  // toutes cliquables sur l'une des deux vues (certaines sur les deux,
  // triceps et mollets), silhouette neutre pour le reste.
  const zoneAttrs = (cle) => 'class="zone-cliquable" data-zone="' + cle + '" style="' + styleZone(cle) + '"';
  const avant = rendreMannequinPolygones(MANNEQUIN_AVANT, 'de face, tonnage par zone', zoneAttrs, titreZone);
  const arriere = rendreMannequinPolygones(MANNEQUIN_ARRIERE, 'de dos, tonnage par zone', zoneAttrs, titreZone);

  $('tonnage-mannequin').innerHTML =
    '<div class="mannequin-paire">' +
      '<div class="mannequin-vue"><p class="mannequin-vue-titre">Avant</p>' + avant + '</div>' +
      '<div class="mannequin-vue"><p class="mannequin-vue-titre">Arrière</p>' + arriere + '</div>' +
    '</div>';

  $('tonnage-liste').innerHTML = ZONES_MUSCULAIRES.filter((z) => z.vue === 'liste').map((zone) => (
    '<button type="button" class="tonnage-zone' + (zone.cle === zoneTonnageChoisie ? ' choisi' : '') +
      '" data-zone="' + zone.cle + '">' +
      '<span class="tonnage-zone-nom">' + echapper(zone.nom) + '</span>' +
      '<span class="tonnage-zone-barre"><span class="tonnage-zone-remplie" style="width: ' +
        Math.round((tonnages[zone.cle] / max) * 100) + '%"></span></span>' +
      '<span class="tonnage-zone-valeur">' + tonnages[zone.cle] + ' kg</span>' +
    '</button>'
  )).join('');

  // La zone la plus chargée s'ouvre par défaut plutôt qu'un écran vide au
  // premier affichage ; un choix déjà fait survit au réaffichage de l'écran
  // (rendreTonnageMuscles est rappelée après chaque clic de zone).
  const cles = ZONES_MUSCULAIRES.map((z) => z.cle);
  if (!cles.includes(zoneTonnageChoisie)) {
    zoneTonnageChoisie = cles.reduce((a, b) => (tonnages[b] > tonnages[a] ? b : a));
  }
  const zoneDetail = ZONES_MUSCULAIRES.find((z) => z.cle === zoneTonnageChoisie);
  const exercices = exercicesZoneTonnage(zoneDetail, depuis);
  // Une simple liste chiffrée jugée peu parlante par l'utilisateur le
  // 16 septembre 2026 : chaque exercice dédié à la zone (2-3 en général,
  // exercicesZoneTonnage ne gardant que ceux travaillés sur la fenêtre)
  // affiche désormais sa courbe de progression au fil des semaines, pas
  // seulement son tonnage des 7 derniers jours. progressionPremiereSerie()
  // attend une séance de référence pour borner les points affichés (la
  // fiche d'historique s'en sert pour rejouer "l'état ce jour-là") ; ici on
  // veut tout l'historique jusqu'à maintenant, d'où cette séance fictive
  // qui ne porte qu'un `fin` égal à l'instant présent.
  const jusquaMaintenant = { fin: new Date().toISOString() };
  $('tonnage-detail').innerHTML = '<h3>' + echapper(zoneDetail.nom) + ' — ' + tonnages[zoneDetail.cle] + ' kg sur 7 jours</h3>' +
    (exercices.length
      ? exercices.map(([nom, t]) => {
          const courbeHtml = progressionPremiereSerie(jusquaMaintenant, nom, false);
          return '<div class="tonnage-detail-exo">' +
            '<div class="tonnage-detail-ligne"><span>' + echapper(nom) + '</span><span>' + t + ' kg</span></div>' +
            (courbeHtml || '<p class="vide">Pas encore assez de séances pour une courbe.</p>') +
          '</div>';
        }).join('')
      : '<p class="vide">Rien sur les ' + TONNAGE_PERIODE_JOURS + ' derniers jours.</p>');
}

/* ------------------------------------------------------------- sommeil */

/* Troisième contenu du menu Suivi, demandé le 16 septembre 2026 : une
   frise centrée sur la nuit plutôt qu'un formulaire, pour rester un geste
   rapide au réveil. La fenêtre va de 22h à 11h le lendemain (13 h, 26
   créneaux de 30 min) ; le cœur, 23h30 à 8h, est bleu (sommeil) par
   défaut, sans qu'il y ait rien à saisir pour une nuit ordinaire. Toucher
   un créneau bleu le bascule en rouge (insomnie) ; en dehors du cœur,
   aucun créneau n'existe tant qu'on n'y touche pas — l'apparition marque
   un coucher tardif ou un réveil précoce, hors du cadre habituel. Un seul
   état à retenir par créneau (dans ou hors insomnie) suffit aux deux cas. */
const SOMMEIL_DEBUT_MIN = 22 * 60;
// 48 créneaux (24h) depuis le 16 septembre 2026, demande de l'utilisateur :
// la frise ne couvrait jusque-là que 22h-11h (26 créneaux), sans place pour
// un sport ou un repère de l'après-midi (indexCreneauPourHeure renvoyait
// -1). 24 créneaux par ligne (voir .sommeil-frise dans css/style.css) pour
// que la session de sommeil 00h-8h, qui tombe entièrement dans la première
// ligne (22h-9h30), ne soit jamais coupée par un retour à la ligne.
const SOMMEIL_NB_CRENEAUX = 48;
const SOMMEIL_COEUR_DEBUT = 3;   // 23:30
const SOMMEIL_COEUR_FIN = 19;    // 07:30, dernier créneau du cœur (se termine à 8h)

function creneauxSommeil() {
  const creneaux = [];
  for (let i = 0; i < SOMMEIL_NB_CRENEAUX; i++) {
    const minutes = (SOMMEIL_DEBUT_MIN + i * 30) % (24 * 60);
    creneaux.push(String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0'));
  }
  return creneaux;
}

/* Position d'une heure dans la frise (demande de l'utilisateur le
   16 septembre 2026, pour le sport puis tout repère de journée) : la frise
   couvrant les 24h depuis le même jour, -1 ne peut plus arriver qu'en
   théorie (heure absente). */
function indexCreneauPourHeure(heure) {
  if (!heure) return -1;
  const [h, m] = heure.split(':').map(Number);
  let minutes = h * 60 + m - SOMMEIL_DEBUT_MIN;
  if (minutes < 0) minutes += 24 * 60;
  if (minutes >= SOMMEIL_NB_CRENEAUX * 30) return -1;
  return Math.floor(minutes / 30);
}

/* Cherchées en plus des cinq citées par l'utilisateur (bruit, chaleur,
   moustique, énervement, pensées) : douleur et lumière, deux causes
   d'insomnie courantes qui ne sont ni l'une ni l'autre déjà couvertes. */
const RAISONS_INSOMNIE = [
  { cle: 'bruit', nom: 'Bruit', icone: '🔊' },
  { cle: 'chaleur', nom: 'Chaleur', icone: '🥵' },
  { cle: 'froid', nom: 'Froid', icone: '🥶' },
  { cle: 'moustique', nom: 'Moustique', icone: '🦟' },
  { cle: 'enervement', nom: 'Énervement', icone: '😤' },
  { cle: 'pensees', nom: 'Pensées', icone: '💭' },
  { cle: 'douleur', nom: 'Douleur', icone: '🤕' },
  { cle: 'lumiere', nom: 'Lumière', icone: '💡' },
];

/* Le sport du jour n'est pas ressaisi : dérivé de l'historique existant
   (une séance dont la fin tombe le jour de la nuit affichée) plutôt que
   d'un geste en plus. Alcool, écran tardif et repas tardif se valident
   d'un geste ; café et pipi nocturne, qui peuvent survenir plusieurs fois,
   comptent (appuyer incrémente, la croix remet à zéro). Écran tardif et
   repas tardif sont les deux ajoutés à la demande de l'utilisateur d'en
   chercher d'autres. */
const JOURNEE_SOMMEIL = [
  { cle: 'alcool', nom: 'Alcool', icone: '🍺', type: 'bascule' },
  { cle: 'cafe', nom: 'Café', icone: '☕', type: 'compteur' },
  { cle: 'pipi', nom: 'Pipi nocturne', icone: '🚽', type: 'compteur' },
  { cle: 'ecranTard', nom: 'Écran tardif', icone: '📱', type: 'bascule' },
  { cle: 'repasTardif', nom: 'Repas tardif', icone: '🍽️', type: 'bascule' },
];

const SPORT_JOURNEE = [
  { cle: 'muscu', nom: 'Muscu', icone: '🏋️' },
  { cle: 'footing', nom: 'Footing', icone: '🏃' },
];

function formatDateCourte(date) {
  return String(date.getDate()).padStart(2, '0') + '/' +
    String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
}

/* La nuit qui s'ouvre par défaut est celle d'hier à aujourd'hui : au
   réveil, c'est celle qui vient de se terminer. */
function cleNuitCourante() {
  return formatDateCourte(new Date(Date.now() - 86400000));
}

function decalerCle(cle, delta) {
  const [jour, mois, annee] = cle.split('/').map(Number);
  return formatDateCourte(new Date(annee, mois - 1, jour + delta));
}

function decalerNuitAffichee(delta) {
  nuitAffichee = decalerCle(nuitAffichee, delta);
}

/* Comparaison de deux clés DD/MM/AAAA : la comparaison de chaînes ferait
   passer "01/10/2026" avant "25/09/2026", les jours et mois n'étant pas
   alignés à gauche par année. */
function cleAnterieure(a, b) {
  const [ja, ma, aa] = a.split('/').map(Number);
  const [jb, mb, ab] = b.split('/').map(Number);
  return new Date(aa, ma - 1, ja).getTime() < new Date(ab, mb - 1, jb).getTime();
}

function lireSommeil() {
  return lireTableau(CLES.sommeil);
}

function nuitPour(cle) {
  return lireSommeil().find((n) => n.cle === cle) ||
    { cle, insomnies: [], raisons: [], alcool: false, cafe: 0, pipi: 0, ecranTard: false, repasTardif: false,
      sports: {}, reperesFrise: [] };
}

function enregistrerNuit(nuit) {
  const toutes = lireSommeil().filter((n) => n.cle !== nuit.cle);
  toutes.push(nuit);
  ecrire(CLES.sommeil, toutes);
}

function basculerCreneauSommeil(nuit, index) {
  const creneau = creneauxSommeil()[index];
  const position = nuit.insomnies.indexOf(creneau);
  if (position >= 0) nuit.insomnies.splice(position, 1);
  else nuit.insomnies.push(creneau);
  enregistrerNuit(nuit);
  rendreSommeil();
}

function basculerRaisonSommeil(nuit, cle) {
  const position = nuit.raisons.indexOf(cle);
  if (position >= 0) nuit.raisons.splice(position, 1);
  else nuit.raisons.push(cle);
  enregistrerNuit(nuit);
  rendreSommeil();
}

function actionnerJourneeSommeil(nuit, item) {
  if (item.type === 'bascule') nuit[item.cle] = !nuit[item.cle];
  else nuit[item.cle] = (nuit[item.cle] || 0) + 1;
  enregistrerNuit(nuit);
  rendreSommeil();
}

/* Repères de journée placés directement sur la frise par appui-glissé
   (demande de l'utilisateur le 17 septembre 2026), en plus des puces
   « La journée » qui restent le geste rapide sans heure précise : les deux
   cohabitent, l'un n'annule pas l'autre. Plusieurs occurrences du même type
   peuvent être placées (café à 1h puis à 3h) ; `reperesFrise` est une liste
   à part plutôt qu'une carte par type, pour ça. Trois appuis distincts sur
   la frise (remarque de l'utilisateur) : un appui simple bascule
   l'insomnie (basculerCreneauSommeil, inchangé), l'appui-glissé depuis une
   puce crée un repère, l'appui long sur un créneau qui en porte un le
   supprime (voir departGlissementRepere/appuiLongCreneau plus bas). */
function placerRepereFrise(nuit, type, index) {
  nuit.reperesFrise = nuit.reperesFrise || [];
  nuit.reperesFrise.push({ type, index });
  enregistrerNuit(nuit);
  rendreSommeil();
}

function supprimerRepereFrise(nuit, index) {
  nuit.reperesFrise = (nuit.reperesFrise || []).filter((r) => r.index !== index);
  enregistrerNuit(nuit);
  rendreSommeil();
}

/* Glissement d'une puce « La journée » vers la frise, pour y poser un
   repère à une heure précise (voir placerRepereFrise). Un simple appui
   sans déplacement (`seuilFranchi` jamais vrai) ne fait rien ici : le
   `click` natif qui suit se charge alors normalement du comportement
   existant de la puce (bascule ou compteur). document.elementFromPoint
   plutôt qu'un calcul de grille : la frise passe de 13 à 20 colonnes selon
   la largeur d'écran (voir .sommeil-creneau dans css/style.css), la
   trouver par élément sous le doigt évite de dupliquer cette mise en page
   en JavaScript. */
function demarrerGlissementRepere(nuit, type, x, y) {
  const item = JOURNEE_SOMMEIL.find((i) => i.cle === type);
  if (!item) return;
  const fantome = document.createElement('div');
  fantome.className = 'repere-fantome';
  fantome.textContent = item.icone;
  fantome.style.left = x + 'px';
  fantome.style.top = y + 'px';
  document.body.appendChild(fantome);
  glissementRepere = { nuit, type, fantome, depart: { x, y }, seuilFranchi: false, indexSurvole: -1 };
}

function deplacerGlissementRepere(x, y) {
  const g = glissementRepere;
  if (!g) return;
  g.fantome.style.left = x + 'px';
  g.fantome.style.top = y + 'px';
  const dx = x - g.depart.x;
  const dy = y - g.depart.y;
  if (!g.seuilFranchi && (dx * dx + dy * dy) > 36) {
    g.seuilFranchi = true;
    g.fantome.classList.add('actif');
  }
  const cible = document.elementFromPoint(x, y);
  const creneau = cible && cible.closest ? cible.closest('.sommeil-creneau') : null;
  const index = creneau ? Number(creneau.dataset.index) : -1;
  if (index !== g.indexSurvole) {
    document.querySelectorAll('.sommeil-creneau.cible-glissement').forEach((el) => el.classList.remove('cible-glissement'));
    if (creneau) creneau.classList.add('cible-glissement');
    g.indexSurvole = index;
  }
}

/* Aucun `click` natif ne suit un vrai glissement (mousedown/pointerdown sur
   un élément puis pointerup sur un autre, après un déplacement) : c'est le
   comportement standard des navigateurs (identique en tactile, où un
   déplacement au-delà du seuil de scroll supprime aussi le clic de
   synthèse), vérifié ici avant d'écrire cette fonction — un bouton
   `venDeDeposerRepere` avait d'abord été posé pour s'en prémunir "au cas
   où", mais restait vrai indéfiniment (le clic censé le consommer
   n'arrivant jamais) et avalait alors le clic tout à fait normal de
   l'interaction suivante sur un créneau. Le dépôt peut donc être immédiat,
   sans détour par un tick. */
function deposerGlissementRepere(x, y) {
  const g = glissementRepere;
  if (!g) return;
  g.fantome.remove();
  document.querySelectorAll('.sommeil-creneau.cible-glissement').forEach((el) => el.classList.remove('cible-glissement'));
  glissementRepere = null;
  if (!g.seuilFranchi || g.indexSurvole < 0) return;
  placerRepereFrise(g.nuit, g.type, g.indexSurvole);
}

/* Sport du jour saisi à la main plutôt que déduit seul de l'historique
   (demande de l'utilisateur le 16 septembre 2026, l'ancien badge n'était
   pas sélectionnable). Muscu et course dissociés le même jour, quelques
   heures plus tard (nouvelle demande) : un seul `sportType` empêchait de
   noter les deux le même jour, ce qui arrive (J2/J6 avec gainage, ou une
   sortie en plus d'une séance). `nuit.sports` est une carte par type
   (`{ muscu: '23:00', footing: '' }`), chaque clé absente valant "pas
   choisi" — pas de reprise de l'ancien `sportType`/`sportHeure` : la
   fonctionnalité vient d'être ajoutée dans cette même session, aucune
   nuit réelle ne porte encore l'ancien format. */
function basculerSportJournee(nuit, type) {
  nuit.sports = nuit.sports || {};
  if (nuit.sports[type] != null) delete nuit.sports[type];
  else nuit.sports[type] = '';
  enregistrerNuit(nuit);
  rendreSommeil();
}

function majHeureSport(nuit, type, heure) {
  nuit.sports = nuit.sports || {};
  nuit.sports[type] = heure || '';
  enregistrerNuit(nuit);
  rendreSommeil();
}

function remettreAZeroJournee(nuit, cle) {
  nuit[cle] = 0;
  enregistrerNuit(nuit);
  rendreSommeil();
}

function rendreSommeil() {
  const nuit = nuitPour(nuitAffichee);
  const creneaux = creneauxSommeil();
  // Un sport peut tomber sur le même créneau qu'un autre repère si deux
  // heures coïncident : la frise n'affiche qu'une icône par créneau,
  // premier trouvé, cas limite jamais signalé.
  const sportsChoisis = SPORT_JOURNEE
    .filter((sp) => nuit.sports && nuit.sports[sp.cle] != null)
    .map((sp) => ({ sp, heure: nuit.sports[sp.cle], index: indexCreneauPourHeure(nuit.sports[sp.cle]) }));
  // Repères posés par appui-glissé (voir placerRepereFrise) : même règle
  // qu'un sport en collision, une seule icône par créneau, le sport
  // l'emportant s'ils tombent au même endroit.
  const reperesParIndex = {};
  (nuit.reperesFrise || []).forEach((r) => { reperesParIndex[r.index] = r; });

  $('sommeil-nuit-titre').textContent = 'Nuit du ' + nuitAffichee + ' au ' + decalerCle(nuitAffichee, 1);
  $('bouton-sommeil-suivant').disabled = !cleAnterieure(nuitAffichee, cleNuitCourante());

  $('sommeil-frise').innerHTML = creneaux.map((creneau, index) => {
    const enInsomnie = nuit.insomnies.includes(creneau);
    const dansLeCoeur = index >= SOMMEIL_COEUR_DEBUT && index <= SOMMEIL_COEUR_FIN;
    // "libre", pas "vide" : la classe générique .vide (messages d'état vide
    // en <p>, padding 40px) matchait aussi ces boutons et leur imposait
    // 80px de haut, seule vraie cause de la frise débordante signalée par
    // l'utilisateur le 16 septembre 2026 — pas un problème de grille ou de
    // flexbox, malgré tout ce que ça y ressemblait à l'essai.
    // Heure incrustee 1 case sur 2 (demande utilisateur), les index pairs
    // tombant toujours sur l'heure pile (creneaux de 30 min depuis 22:00).
    // Icône du sport (même demande) quand son heure tombe sur ce créneau,
    // par-dessus le numéro d'heure s'ils coïncident.
    const sportIci = sportsChoisis.find((s) => s.index === index);
    const repereIci = !sportIci ? reperesParIndex[index] : null;
    const repereItem = repereIci ? JOURNEE_SOMMEIL.find((i) => i.cle === repereIci.type) : null;
    const icone = sportIci
      ? '<span class="sommeil-creneau-sport" title="' + echapper(sportIci.sp.nom + ' ' + sportIci.heure) + '">' + sportIci.sp.icone + '</span>'
      : (repereItem ? '<span class="sommeil-creneau-sport" title="' + echapper(repereItem.nom + ', ' + creneau + ' — appui long pour retirer') + '">' + repereItem.icone + '</span>' : '');
    const heure = (index % 2 === 0 && !icone) ? '<span class="sommeil-creneau-heure">' + creneau.split(':')[0] + '</span>' : '';
    const donneeRepere = repereItem ? ' data-repere="1"' : '';
    // Cases du cœur agrandies (demande de l'utilisateur le 17 septembre
    // 2026) : une classe à part de l'état sommeil/insomnie/libre, un
    // créneau d'insomnie dans le cœur devant rester agrandi lui aussi.
    const classeCoeur = dansLeCoeur ? ' coeur' : '';
    if (!enInsomnie && !dansLeCoeur) return '<button type="button" class="sommeil-creneau libre" data-index="' + index + '"' + donneeRepere + ' aria-label="Ajouter ' + creneau + '">' + heure + icone + '</button>';
    return '<button type="button" class="sommeil-creneau ' + (enInsomnie ? 'insomnie' : 'sommeil') + classeCoeur + '" data-index="' + index + '"' + donneeRepere + ' aria-label="' + creneau + '">' + heure + icone + '</button>';
  }).join('');
  // Appui simple = bascule l'insomnie (inchangé). Appui long (550 ms) sur un
  // créneau qui porte un repère = le supprime. La suppression elle-même
  // n'a lieu que dans le `click` qui suit le relâchement, jamais dans le
  // minuteur pendant que le doigt est encore posé : rendreSommeil()
  // remplace tous les boutons de la frise, et un remplacement en plein
  // geste ferait retomber le click final sur un bouton neuf, à la
  // fermeture différente (voir lancerMinuterie() plus haut pour le même
  // principe, un affichage différé d'un tick pour ne pas voler un clic en
  // cours). Une variable locale par bouton (pas partagée entre eux) suffit
  // : chaque fermeture ne survit qu'à son propre geste.
  $('sommeil-frise').querySelectorAll('.sommeil-creneau').forEach((bouton) => {
    let minuteurAppuiLong = null;
    let appuiLongDeclenche = false;
    bouton.addEventListener('pointerdown', () => {
      appuiLongDeclenche = false;
      if (bouton.dataset.repere !== '1') return;
      minuteurAppuiLong = setTimeout(() => {
        minuteurAppuiLong = null;
        appuiLongDeclenche = true;
      }, 550);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
      bouton.addEventListener(type, () => {
        if (minuteurAppuiLong) { clearTimeout(minuteurAppuiLong); minuteurAppuiLong = null; }
      });
    });
    bouton.addEventListener('click', () => {
      if (appuiLongDeclenche) { supprimerRepereFrise(nuit, Number(bouton.dataset.index)); return; }
      basculerCreneauSommeil(nuit, Number(bouton.dataset.index));
    });
  });

  $('sommeil-raisons').innerHTML = RAISONS_INSOMNIE.map((raison) => (
    '<button type="button" class="raison-chip' + (nuit.raisons.includes(raison.cle) ? ' choisi' : '') + '" data-cle="' + raison.cle + '">' +
      raison.icone + ' ' + echapper(raison.nom) +
    '</button>'
  )).join('');
  $('sommeil-raisons').querySelectorAll('.raison-chip').forEach((bouton) => {
    bouton.addEventListener('click', () => basculerRaisonSommeil(nuit, bouton.dataset.cle));
  });

  // Sport du jour saisi à la main (16 septembre 2026, l'ancien badge auto
  // n'était pas sélectionnable) : muscu et footing indépendants (même jour,
  // demande ultérieure), chacun avec sa propre heure une fois choisi, pour
  // se repérer sur la frise (voir indexCreneauPourHeure).
  $('sommeil-journee').innerHTML =
    SPORT_JOURNEE.map((sp) => {
      const choisi = nuit.sports && nuit.sports[sp.cle] != null;
      const bouton = '<button type="button" class="journee-item' + (choisi ? ' choisi' : '') + '" data-sport="' + sp.cle + '">' +
        sp.icone + ' ' + echapper(sp.nom) + '</button>';
      const champHeure = choisi
        ? '<input type="time" class="sommeil-sport-heure" data-heure-pour="' + sp.cle + '" value="' + (nuit.sports[sp.cle] || '') + '">'
        : '';
      return bouton + champHeure;
    }).join('') +
    JOURNEE_SOMMEIL.map((item) => {
      if (item.type === 'bascule') {
        return '<button type="button" class="journee-item' + (nuit[item.cle] ? ' choisi' : '') + '" data-cle="' + item.cle + '">' +
          item.icone + ' ' + echapper(item.nom) + '</button>';
      }
      const valeur = nuit[item.cle] || 0;
      return '<button type="button" class="journee-item' + (valeur ? ' choisi' : '') + '" data-cle="' + item.cle + '">' +
        item.icone + ' ' + echapper(item.nom) + (valeur ? ' · ' + valeur : '') +
        (valeur ? '<span class="journee-remise" data-remise="' + item.cle + '">&times;</span>' : '') +
      '</button>';
    }).join('');
  $('sommeil-journee').querySelectorAll('.journee-item[data-sport]').forEach((bouton) => {
    bouton.addEventListener('click', () => basculerSportJournee(nuit, bouton.dataset.sport));
  });
  // Un champ heure par sport choisi (id absent d'index.html, comme les
  // autres éléments créés dynamiquement, voir mensurations-photo-suppr).
  $('sommeil-journee').querySelectorAll('.sommeil-sport-heure').forEach((champ) => {
    champ.addEventListener('change', (evenement) => majHeureSport(nuit, champ.dataset.heurePour, evenement.target.value));
  });
  $('sommeil-journee').querySelectorAll('.journee-item[data-cle]').forEach((bouton) => {
    bouton.addEventListener('click', (evenement) => {
      const remise = evenement.target.closest('[data-remise]');
      if (remise) { remettreAZeroJournee(nuit, remise.dataset.remise); return; }
      actionnerJourneeSommeil(nuit, JOURNEE_SOMMEIL.find((i) => i.cle === bouton.dataset.cle));
    });
    // Appui-glissé vers la frise (demande de l'utilisateur le
    // 17 septembre 2026) : y pose un repère à l'heure visée, en plus du
    // geste ci-dessus qui reste le raccourci sans heure précise. Départ
    // ignoré depuis la croix de remise, qui a son propre geste.
    bouton.addEventListener('pointerdown', (evenement) => {
      if (evenement.target.closest('[data-remise]')) return;
      demarrerGlissementRepere(nuit, bouton.dataset.cle, evenement.clientX, evenement.clientY);
    });
  });

  rendreMoisSommeil();
}

/* Vue du mois, même grille que le calendrier de séances : une case par
   jour, colorée selon le nombre de créneaux d'insomnie de la nuit qui
   commence ce jour-là (repère de tendance, pas un chiffre affiché). */
function rendreMoisSommeil() {
  const toutes = lireSommeil();
  const parNuit = {};
  toutes.forEach((n) => { parNuit[n.cle] = n; });

  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth();
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7;

  let html = '';
  for (let i = 0; i < decalage; i++) html += '<span class="calendrier-case vide"></span>';
  for (let jour = 1; jour <= nbJours; jour++) {
    const cle = String(jour).padStart(2, '0') + '/' + String(mois + 1).padStart(2, '0') + '/' + annee;
    const nuit = parNuit[cle];
    const aujourdhui = jour === maintenant.getDate();
    let classeNuit = '';
    if (nuit && nuit.insomnies.length) {
      classeNuit = nuit.insomnies.length >= 4 ? ' zone-fatigue' : ' zone-recup';
    } else if (nuit) {
      classeNuit = ' zone-prete';
    }
    html += '<span class="calendrier-case' + (aujourdhui ? ' aujourdhui' : '') + classeNuit + '">' +
      '<span class="calendrier-num">' + jour + '</span></span>';
  }
  $('sommeil-mois').innerHTML =
    '<div class="calendrier-entetes">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D']
      .map((j) => '<span>' + j + '</span>').join('') + '</div>' +
    '<div class="calendrier-grille">' + html + '</div>';
}

/* ------------------------------------------------------- mensurations */

/* Quatrième contenu du menu Suivi, demandé le 16 septembre 2026 à partir de
   captures d'applications tierces envoyées comme référence (silhouette à
   repères de mesure, comparaison photo avant/après par curseur) : jamais
   recopiées telles quelles, seulement l'inspiration d'interaction. Repris
   une seconde fois le même jour, sur des captures renvoyées en clair après
   une perte à la compaction du contexte : repères en lignes pointillées par
   paire plutôt qu'en cercles numérotés (mensurations-mesure-* dans
   index.html), et écarts chiffrés sous le curseur de comparaison (voir
   majPhotosComparees). `categorie` associe chaque mesure à l'une des trois
   couleurs posées sur le mannequin (torse/bras/jambe) ; le poids n'a pas de
   repère sur le corps, à part dans la liste. */
const MENSURATION_CHAMPS = [
  { cle: 'poitrine', nom: 'Poitrine', unite: 'cm', categorie: 'torse' },
  { cle: 'bras', nom: 'Bras', unite: 'cm', categorie: 'bras' },
  { cle: 'taille', nom: 'Taille', unite: 'cm', categorie: 'torse' },
  { cle: 'hanches', nom: 'Hanches', unite: 'cm', categorie: 'jambe' },
  { cle: 'cuisse', nom: 'Cuisse', unite: 'cm', categorie: 'jambe' },
  { cle: 'mollet', nom: 'Mollet', unite: 'cm', categorie: 'jambe' },
];

function cleMensurationCourante() {
  return formatDateCourte(new Date());
}

function decalerMensurationAffichee(delta) {
  mensurationAffichee = decalerCle(mensurationAffichee, delta);
}

function lireMensurations() {
  return lireTableau(CLES.mensurations);
}

function mensurationPour(cle) {
  const trouvee = lireMensurations().find((m) => m.cle === cle);
  if (trouvee) return trouvee;
  const vide = { cle, poids: null, photo: null, envoyee: false };
  MENSURATION_CHAMPS.forEach((c) => { vide[c.cle] = null; });
  return vide;
}

/* Toute modification redemande un envoi (voir synchroniserMensurations) :
   plus simple que de suivre precisement ce qui a change, pour un volume qui
   ne pese rien hors la photo elle-meme, deja compressee cote client. */
function enregistrerMensuration(m) {
  m.envoyee = false;
  const toutes = lireMensurations().filter((x) => x.cle !== m.cle);
  toutes.push(m);
  ecrire(CLES.mensurations, toutes);
}

function majChampMensuration(m, cle, valeur) {
  m[cle] = nombreOuNull(valeur);
  enregistrerMensuration(m);
}

/* Compresse la photo côté téléphone avant de la garder (localStorage n'est
   pas fait pour des images en pleine résolution) : redimensionnée à
   900 px de large au plus, JPEG à qualité 0.75. Une photo de portrait
   classique tient alors en 100 à 250 Ko plutôt que plusieurs Mo. */
function compresserImage(fichier, suite) {
  const lecteur = new FileReader();
  lecteur.onload = () => {
    const image = new Image();
    image.onload = () => {
      const largeurMax = 900;
      const echelle = Math.min(1, largeurMax / image.width);
      const canevas = document.createElement('canvas');
      canevas.width = Math.round(image.width * echelle);
      canevas.height = Math.round(image.height * echelle);
      canevas.getContext('2d').drawImage(image, 0, 0, canevas.width, canevas.height);
      suite(canevas.toDataURL('image/jpeg', 0.75));
    };
    image.src = lecteur.result;
  };
  lecteur.readAsDataURL(fichier);
}

/* Repères de mesure superposés au mannequin de face (17 septembre 2026,
   coordonnées recalculées pour le repère 1000x2000 du mannequin réaliste :
   voir MANNEQUIN_AVANT plus haut). Chaque paire de points reprend le bord
   du polygone concerné à sa hauteur représentative (largeur du pectoral
   pour la poitrine, des obliques pour la taille, etc.), lu directement
   dans les coordonnées de la source plutôt qu'estimé à l'œil. Rayon des
   points et épaisseur des lignes à la même échelle (~7x) que l'ancien
   repère 140x240 (voir .mensurations-ligne dans css/style.css). */
function reperesMensurations() {
  // Un groupe par mesure, pas par ligne : bras/cuisse/mollet portent chacun
  // deux paires (gauche+droite) dans le même <g>, comme l'ancien repère
  // 140x240 (une seule mesure, prise des deux côtés du corps).
  const groupe = (categorie, paires) => (
    '<g class="mensurations-mesure-' + categorie + '">' +
      paires.map(([x1, y1, x2, y2]) => (
        '<line class="mensurations-ligne" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"></line>' +
        '<circle class="mensurations-point" cx="' + x1 + '" cy="' + y1 + '" r="30"></circle>' +
        '<circle class="mensurations-point" cx="' + x2 + '" cy="' + y2 + '" r="30"></circle>'
      )).join('') +
    '</g>'
  );
  return (
    groupe('torse', [[298, 500, 706, 500]]) +                           // poitrine
    groupe('torse', [[310, 700, 686, 700]]) +                           // taille
    groupe('bras', [[167, 604, 290, 604], [702, 606, 829, 606]]) +      // bras
    groupe('jambe', [[347, 1088, 649, 1088]]) +                         // hanches
    groupe('jambe', [[257, 1200, 445, 1200], [555, 1200, 739, 1200]]) + // cuisse
    groupe('jambe', [[208, 1751, 359, 1751], [641, 1756, 796, 1756]])   // mollet
  );
}

function rendreMensurations() {
  const m = mensurationPour(mensurationAffichee);

  $('mensurations-mannequin-avant').innerHTML =
    rendreMannequinPolygones(MANNEQUIN_AVANT, 'de face', null, null, reperesMensurations());
  $('mensurations-mannequin-arriere').innerHTML = rendreMannequinPolygones(MANNEQUIN_ARRIERE, 'de dos');

  $('mensurations-date-titre').textContent = mensurationAffichee === cleMensurationCourante()
    ? "Aujourd'hui, " + mensurationAffichee : mensurationAffichee;
  $('bouton-mensurations-suivant').disabled = !cleAnterieure(mensurationAffichee, cleMensurationCourante());

  $('mensurations-champs').innerHTML =
    '<div class="mensurations-champ mensurations-poids">' +
      '<span class="mensurations-champ-symbole">&#9878;</span>' +
      '<span class="mensurations-champ-nom">Poids</span>' +
      '<input type="text" inputmode="decimal" data-cle="poids" value="' + (m.poids != null ? m.poids : '') + '">' +
      '<span class="mensurations-champ-unite">kg</span>' +
    '</div>' +
    MENSURATION_CHAMPS.map((c) => (
      '<div class="mensurations-champ">' +
        '<span class="mensurations-champ-puce mensurations-champ-puce-' + c.categorie + '"></span>' +
        '<span class="mensurations-champ-nom">' + echapper(c.nom) + '</span>' +
        '<input type="text" inputmode="decimal" data-cle="' + c.cle + '" value="' + (m[c.cle] != null ? m[c.cle] : '') + '">' +
        '<span class="mensurations-champ-unite">' + c.unite + '</span>' +
      '</div>'
    )).join('');
  $('mensurations-champs').querySelectorAll('input').forEach((champ) => {
    champ.addEventListener('change', () => majChampMensuration(m, champ.dataset.cle, champ.value));
  });

  const photo = $('mensurations-photo');
  photo.innerHTML = m.photo
    ? '<img src="' + m.photo + '" alt="Photo du ' + mensurationAffichee + '">' +
      '<button type="button" class="mensurations-photo-suppr" aria-label="Supprimer la photo">&times;</button>'
    : '<span class="mensurations-photo-vide">Toucher pour ajouter une photo</span>';
  if (!m.photo) {
    photo.addEventListener('click', () => $('mensurations-photo-fichier').click(), { once: true });
  } else {
    photo.querySelector('.mensurations-photo-suppr').addEventListener('click', (evenement) => {
      evenement.stopPropagation();
      m.photo = null;
      enregistrerMensuration(m);
      rendreMensurations();
    });
  }

  rendreComparerMensurations();
}

function rendreComparerMensurations() {
  const avecPhoto = lireMensurations().filter((m) => m.photo)
    .sort((a, b) => (cleAnterieure(a.cle, b.cle) ? -1 : 1));

  const vide = avecPhoto.length < 2;
  $('mensurations-comparer-vide').hidden = !vide;
  $('mensurations-slider').hidden = vide;
  $('mensurations-avant').closest('.mensurations-comparer-choix').hidden = vide;
  if (vide) return;

  const options = avecPhoto.map((m) => '<option value="' + m.cle + '">' + m.cle + '</option>').join('');
  $('mensurations-avant').innerHTML = options;
  $('mensurations-apres').innerHTML = options;
  $('mensurations-avant').value = avecPhoto[0].cle;
  $('mensurations-apres').value = avecPhoto[avecPhoto.length - 1].cle;
  majPhotosComparees();
}

/* Écarts chiffrés sous le curseur (16 septembre 2026, référence renvoyée
   après une perte à la compaction) : poids et taille, les deux mesures
   montrées dans la capture d'origine. Seulement celles où les deux dates
   ont une valeur, plutôt qu'un "→" à côté d'un champ resté vide. */
function majPhotosComparees() {
  const avant = mensurationPour($('mensurations-avant').value);
  const apres = mensurationPour($('mensurations-apres').value);
  $('mensurations-slider-avant').src = avant.photo || '';
  $('mensurations-slider-apres').src = apres.photo || '';

  const ecart = (valeurAvant, valeurApres, unite) => (valeurAvant != null && valeurApres != null)
    ? valeurAvant + ' → ' + valeurApres + ' ' + unite
    : null;
  const stats = [
    ['Poids corporel', ecart(avant.poids, apres.poids, 'kg')],
    ['Taille', ecart(avant.taille, apres.taille, 'cm')],
  ].filter(([, texte]) => texte);

  $('mensurations-slider-stats').hidden = stats.length === 0;
  $('mensurations-slider-stats').innerHTML = stats.map(([nom, texte]) => (
    '<div class="mensurations-slider-stat"><span>' + echapper(nom) + '</span><b>' + echapper(texte) + '</b></div>'
  )).join('');
}

/* Curseur de comparaison : un clip-path sur le calque "après", dont on
   déplace le bord gauche avec le doigt. Écouteurs posés une seule fois
   (brancher()), la poignée n'étant jamais recréée par rendreMensurations(). */
function deplacerSliderMensurations(x) {
  const cadre = $('mensurations-slider').getBoundingClientRect();
  const pourcent = Math.max(0, Math.min(100, ((x - cadre.left) / cadre.width) * 100));
  $('mensurations-slider-apres-bloc').style.clipPath = 'inset(0 0 0 ' + pourcent + '%)';
  $('mensurations-slider-poignee').style.left = pourcent + '%';
}

function rendreHistorique(idOuvert) {
  const cible = $('liste-historique');
  const seances = lireTableau(CLES.historique)
    .filter((s) => s.fin)
    .sort((a, b) => new Date(b.fin) - new Date(a.fin));

  if (!seances.length) {
    cible.innerHTML = '<p class="vide">Aucune séance enregistrée pour le moment.</p>';
    return;
  }

  // Chaque séance se déplie sur son détail complet (demande de l'utilisateur
  // le 9 septembre 2026 : relire une séance passée sans ouvrir le classeur).
  // Un <details> plutôt qu'une bascule maison : l'ouverture et la fermeture
  // ne demandent alors aucun état à tenir côté script.
  cible.innerHTML = seances.map((s) =>
    '<details class="entree-historique"' + (s.id === idOuvert ? ' open' : '') + '>' +
      '<summary>' +
        '<div class="titre"><span>' + echapper(s.jour) + ' &middot; ' + dateCourte(s.fin) + '</span>' +
        '<span class="badge ' + (s.envoye ? 'envoye">classeur' : 'attente">en attente') + '</span></div>' +
        '<div class="details">' + resumeCourtSeance(s) + '</div>' +
      '</summary>' +
      detailSeance(s) +
      '<button class="discret supprimer-seance" type="button" data-id="' +
        echapper(s.id) + '">Supprimer cette séance</button>' +
    '</details>').join('');

  cible.querySelectorAll('.supprimer-seance').forEach((bouton) => {
    bouton.addEventListener('click', () => supprimerSeance(bouton.dataset.id));
  });
}

/* La ligne repliée : ce qui tient sur un seul niveau de lecture. */
function resumeCourtSeance(s) {
  if (s.type === 'gainage') {
    const noms = [];
    CATEGORIES_GAINAGE.forEach((c) => c.mouvements.forEach((cle) => {
      if (((s.mouvements || {})[cle] || []).some(valeurRenseignee)) {
        noms.push(echapper(MOUVEMENTS_GAINAGE[cle].nom));
      }
    }));
    return noms.length ? noms.join(' &middot; ') : 'Séance sans chiffres';
  }
  if (s.type === 'footing') {
    const carte = footingParType(s);
    const morceaux = [];
    TYPES_COURSE.forEach((t) => {
      (carte[t.cle] || []).forEach((d) => {
        if (!d.duree_min && !d.distance_km) return;
        const bouts = [];
        if (d.duree_min) bouts.push(d.duree_min + ' min');
        if (d.distance_km) bouts.push(d.distance_km + ' km');
        morceaux.push(t.nom + ' ' + bouts.join(', '));
      });
    });
    return morceaux.length ? morceaux.join(' &middot; ') : 'Sortie sans chiffres';
  }
  const tonnage = (s.exercices || []).reduce((somme, e) => somme + tonnageDesSeries(e.series), 0);
  const series = (s.exercices || []).reduce(
    (somme, e) => somme + (e.series || []).filter((x) => x.faite && !x.echauffement).length, 0);
  return series + (series > 1 ? ' séries, ' : ' série, ') + tonnage + ' kg';
}

/* Le détail déplié : la même matière que le résumé de fin de séance, plus la
   remarque et la blessure éventuelles, qui ne se relisent nulle part ailleurs
   depuis le téléphone. */
function detailSeance(s) {
  let html = '<div class="detail-historique">';

  if (s.type === 'gainage') {
    html += CATEGORIES_GAINAGE
      .map((c) => lignesMouvementsHtml(s, c.mouvements, c.nom)).join('');
  } else if (s.type === 'footing') {
    const carte = footingParType(s);
    TYPES_COURSE.forEach((t) => {
      const cycles = (carte[t.cle] || []).filter((d) => d.duree_min != null || d.distance_km != null);
      cycles.forEach((d, index) => {
        const bouts = [];
        if (d.duree_min) bouts.push(d.duree_min + ' min');
        if (d.distance_km) bouts.push(d.distance_km + ' km');
        if (d.duree_min && d.distance_km) {
          const allure = d.duree_min / d.distance_km;
          bouts.push(Math.floor(allure) + ':' +
            String(Math.round((allure - Math.floor(allure)) * 60)).padStart(2, '0') + ' / km');
        }
        if (d.repetitions) bouts.push(d.repetitions + ' rép.');
        if (d.recup_s) bouts.push('récup ' + d.recup_s + ' s');
        if (d.pente_pct) bouts.push('pente ' + d.pente_pct + ' %');
        if (d.charge_kg) bouts.push(d.charge_kg + ' kg portés');
        if (d.duree_seuil_min) bouts.push(d.duree_seuil_min + ' min au seuil');
        html += ligneDetail(cycles.length > 1 ? t.complet + ', passage ' + (index + 1) : t.complet,
          bouts.join('  ·  '));
      });
    });
    GAINAGE_FOOTING_ANCIEN.forEach((exo) => {
      const tenues = ((s.gainage || {})[exo.cle] || []).filter((v) => v != null);
      if (!tenues.length) return;
      html += ligneDetail(exo.nom, tenues.map((v) => v + ' ' + uniteGainage(exo)).join('  ·  '));
    });
    html += lignesMouvementsHtml(s, ['farmer_walk']);
  } else {
    (s.exercices || []).forEach((e, index) => {
      const faites = (e.series || []).filter((x) => x.faite);
      if (!faites.length) return;
      html += ligneDetail(e.nom, faites.map((x) =>
        (x.echauffement ? 'éch ' : '') +
        (x.charge != null ? x.charge : '?') + '×' + (x.reps != null ? x.reps : '?') +
        (x.rir != null ? ' @' + x.rir : '')).join('  ·  '),
        progressionPremiereSerie(s, e.nom, index === 0));
    });
  }

  if (s.duree_min) html += ligneDetail('Durée', s.duree_min + ' min');

  // La remarque n'est volontairement pas reprise ici (demande de
  // l'utilisateur le 10 septembre 2026) : elle s'adresse au développeur et
  // n'a plus d'intérêt une fois partie au classeur, là où une douleur se
  // relit d'une séance à l'autre. Elle reste écrite dans l'onglet Remarques.
  const blessure = s.blessure || {};
  if (blessure.texte && blessure.texte.trim()) {
    html += ligneDetail('Blessure',
      (blessure.serie ? blessure.serie + ' : ' : '') + blessure.texte.trim());
  }

  return html + '</div>';
}

function ligneDetail(nom, valeur, suite) {
  return '<div class="resume-exo">' +
    '<div class="resume-exo-nom">' + echapper(nom) + '</div>' +
    '<div class="resume-exo-series">' + echapper(valeur) + '</div>' +
    (suite || '') +
    '</div>';
}

/* Indicateur de progression retenu le 11 septembre 2026, dans le
   récapitulatif de programme de l'utilisateur : charge × répétitions de la
   première série de travail, à RIR constant. Le tonnage, tracé jusque-là,
   est écarté comme indicateur : il monte mécaniquement quand la charge
   baisse et que les répétitions montent, et ferait passer un recul pour un
   progrès. */
function premiereSerieDeTravail(exercice) {
  return ((exercice && exercice.series) || [])
    .find((x) => x.faite && !x.echauffement && x.charge != null && x.reps != null) || null;
}

function indicateur(serie) {
  return serie ? Math.round(serie.charge * serie.reps * 10) / 10 : 0;
}

/* Courbe de cet exercice au fil des séances, la plus ancienne à gauche,
   demandée par l'utilisateur le 10 septembre 2026 sur cette page-ci, et
   tracée depuis le 11 septembre 2026 sur l'indicateur ci-dessus.

   Quatre partis pris :
   - **seules les séances du téléphone comptent**, pas l'historique repris du
     classeur : celui-ci est une reprise ponctuelle et non un journal, et ses
     valeurs ont déjà été désalignées de leurs exercices par une manipulation
     de la grille (voir CLAUDE.md, section « Le classeur ») ;
   - **on s'arrête à la séance affichée** : rouvrir une séance ancienne doit
     montrer la progression telle qu'elle était ce jour-là ;
   - **l'exercice 1 porte l'indicateur de séance** du récapitulatif ; les
     autres suivent la même mesure, à titre de repère ;
   - **le nom identifie l'exercice, pas le jour** (voir `derniereFois`) : la
     courbe d'un exercice qui revient sur plusieurs jours suit toutes ses
     séances, pas seulement celles du jour affiché. */
function progressionPremiereSerie(seanceAffichee, nomExo, estIndicateurDeSeance) {
  const fin = new Date(seanceAffichee.fin).getTime();
  const series = lireTableau(CLES.historique)
    .filter((s) => s.fin && new Date(s.fin).getTime() <= fin)
    .sort((a, b) => new Date(a.fin) - new Date(b.fin))
    .map((s) => premiereSerieDeTravail((s.exercices || []).find((e) => memeExercice(e.nom, nomExo))))
    .filter(Boolean);

  if (series.length < 2) return '';

  const points = series.map(indicateur);
  const derniere = series[series.length - 1];
  const ecart = Math.round((points[points.length - 1] - points[points.length - 2]) * 10) / 10;
  const sens = ecart > 0 ? ' hausse' : (ecart < 0 ? ' baisse' : '');
  return courbe(points, 'première série, charge × répétitions') +
    '<div class="courbe-legende">' +
      (estIndicateurDeSeance ? 'Indicateur de séance · ' : '') +
      '1re série ' + derniere.charge + ' × ' + derniere.reps + ' = ' + points[points.length - 1] +
      '<span class="compare' + sens + '">' +
        (ecart > 0 ? '+' : '') + ecart + ' depuis la précédente' +
      '</span>' +
    '</div>';
}

/* Dessinée en SVG à la main plutôt qu'avec une bibliothèque : quelques points
   et une ligne n'en justifient pas une, et l'application doit rester
   utilisable hors ligne sans rien télécharger. Le viewBox garde ses
   proportions, la feuille de style ne règle que la largeur. */
function courbe(points, libelle) {
  const largeur = 300;
  const hauteur = 56;
  const marge = 6;
  const bas = Math.min(...points);
  const haut = Math.max(...points);
  const amplitude = haut - bas || 1;
  const x = (i) => marge + (i * (largeur - 2 * marge)) / (points.length - 1);
  const y = (v) => hauteur - marge - ((v - bas) / amplitude) * (hauteur - 2 * marge);
  const coords = points.map((v, i) => [x(i), y(v)]);

  const chemin = cheminLisse(coords);
  const cercles = points
    .map((v, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) +
      '" r="' + (i === points.length - 1 ? 4 : 2.5) + '"/>')
    .join('');

  return '<svg class="courbe" viewBox="0 0 ' + largeur + ' ' + hauteur + '" ' +
    'role="img" aria-label="Progression, ' + libelle + ', sur ' + points.length + ' séances">' +
    '<path d="' + chemin + '"/>' + cercles + '</svg>';
}

/* Courbe lissée (Catmull-Rom vers Bézier, tension 1/6) plutôt qu'une simple
   polyligne reliant les points au trait droit (demande de l'utilisateur le
   16 septembre 2026, « courbes plus fluides ») : partagée par toutes les
   courbes de l'application (progression d'exercice, vitesse et distance de
   course), courbe() étant leur seul point de passage. Les cercles restent
   posés exactement sur chaque valeur réelle, seul le tracé entre deux
   points est lissé, jamais la donnée elle-même. */
function cheminLisse(points) {
  if (points.length < 3) {
    return points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  }
  let d = 'M' + points[0][0].toFixed(1) + ' ' + points[0][1].toFixed(1);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ' C' + cp1x.toFixed(1) + ' ' + cp1y.toFixed(1) + ' ' +
      cp2x.toFixed(1) + ' ' + cp2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
  }
  return d;
}

/* Suppression d'une séance enregistrée, demandée par l'utilisateur le
   9 septembre 2026. Confirmation obligatoire, contrairement à la croix des
   séries en trop d'une séance en cours : ici la donnée est définitive côté
   téléphone, et rien ne la reprendra au classeur, qui n'est jamais modifié
   depuis l'application. Le message le dit selon le cas. */
function supprimerSeance(id) {
  const historique = lireTableau(CLES.historique);
  const cible = historique.find((s) => s.id === id);
  if (!cible) return;

  const suite = cible.envoye
    ? "Elle restera dans le classeur, que l'application ne modifie jamais."
    : "Elle n'a pas encore été envoyée au classeur : elle sera perdue.";
  if (!confirm('Supprimer la séance ' + cible.jour + ' du ' + dateCourte(cible.fin) +
      ' ?\n\n' + suite)) return;

  ecrire(CLES.historique, historique.filter((s) => s.id !== id));
  rendreHistorique();
  rendreEtatSync();
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

  // Même geste que « quitter » depuis la fiche d'exercice : la séance déjà
  // créée (et son chrono déjà démarré) reste ouverte, à reprendre plus tard.
  $('bouton-demarrage-retour').addEventListener('click', () => {
    relacherVeille();
    seance = null;
    rendreAccueil();
    afficher('accueil');
  });
  $('bouton-demarrage-commencer').addEventListener('click', (evenement) => {
    lancerAnimationDemarrage(evenement.clientX, evenement.clientY, () => {
      afficher('seance');
      rendreExercice();
    });
  });

  $('bouton-terminer').addEventListener('click', terminer);
  // Le bouton vert d'origine est masqué (voir index.html) : c'est cette
  // ligne, qui affiche déjà le même chiffre, qui reprend le geste
  // pause/reprise.
  $('ligne-progression').addEventListener('click', basculerChronoSeance);
  $('bouton-consigne-modifier').addEventListener('click', modifierConsigne);
  $('bouton-consigne-annuler').addEventListener('click', annulerEditionConsigne);
  $('exo-consigne-champ').addEventListener('input', saisirConsigne);
  $('bouton-consigne-enregistrer').addEventListener('click', enregistrerEditionConsigne);
  // Amorcer le clavier avant même de changer d'exercice : le geste (l'appui
  // sur ← / →) est encore "chaud" à cet instant précis, il ne l'est déjà
  // plus une fois rendreExercice() passé. Voir amorcerClavier() plus haut.
  //
  // Changer d'exercice n'arrête plus la récupération en cours (27 août
  // 2026) : elle appartient à la série qu'on vient de finir, pas à la fiche
  // qu'on regarde, et c'est justement le principe du passage automatique à
  // l'exercice suivant.
  //
  // **Le pas se compte depuis l'exercice regardé au moment où le doigt se
  // pose**, pas depuis `indexExo` au moment du clic. Défaut signalé par
  // l'utilisateur le 10 septembre 2026 et reproduit : un champ de saisie
  // perd le focus *avant* que le clic n'arrive, ce qui déclenche son
  // `change` ; si c'était la dernière série non confirmée, sa validation
  // faisait déjà passer à l'exercice suivant, puis le clic en ajoutait un
  // second. Un seul appui sur → sautait donc deux exercices, et un appui
  // sur ← ne faisait rien de visible, les deux mouvements s'annulant.
  // `pointerdown` précède le `blur`, il donne donc le bon point de départ.
  let indexAuToucher = null;
  const departNavigation = () => (indexAuToucher != null ? indexAuToucher : indexExo);
  ['bouton-precedent', 'bouton-suivant'].forEach((identifiant) => {
    // Le clavier physique active un bouton sans `pointerdown` : on retombe
    // alors sur `indexExo`, ce qui reste juste, aucun blur ne s'étant produit.
    $(identifiant).addEventListener('pointerdown', () => { indexAuToucher = indexExo; });
  });

  const allerVersExercice = (cible) => {
    indexAuToucher = null;
    if (cible < 0 || cible > seance.exercices.length - 1) return;
    amorcerClavier();
    indexExo = cible;
    rendreExercice();
    focaliserProchaineSerie();
  };

  $('bouton-precedent').addEventListener('click', () => allerVersExercice(departNavigation() - 1));
  $('bouton-suivant').addEventListener('click', () => allerVersExercice(departNavigation() + 1));

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
  //
  // Un appui pendant qu'elle est inactive (en transparence) lance un repos
  // manuel, demande de l'utilisateur le 12 septembre 2026 : rien ne démarre
  // seul entre les deux côtés d'un unilatéral, ce geste permet de s'assurer
  // d'en prendre assez sans attendre la validation d'une série.
  $('minuterie').addEventListener('click', () => {
    if (minuterie) {
      minuterieTerminee(true);
    } else if (seance && !estFooting() && !estGainage()) {
      lancerMinuterie(ficheExercice().repos_s || 90);
    }
  });
  // Toute la surface ferme le repos, comme le bandeau compact ; jamais
  // visible en dehors d'un repos actif (voir lancerMinuterie/arreterMinuterie),
  // donc pas de branche « lancer un repos manuel » à reprendre ici.
  $('minuterie-plein-ecran').addEventListener('click', () => minuterieTerminee(true));
  $('gainage-chrono').addEventListener('click', appuiBandeauGainage);

  $('bouton-enregistrer').addEventListener('click', enregistrerEtSynchroniser);
  $('bouton-fin-retour').addEventListener('click', () => { afficher('seance'); rendreSeanceCourante(); });
  $('fin-remarque').addEventListener('input', (evenement) => {
    if (!seance) return;
    seance.remarque = evenement.target.value;
    enregistrerSeance();
  });

  ['fin-blessure-serie', 'fin-blessure-texte'].forEach((identifiant) => {
    $(identifiant).addEventListener('input', () => {
      if (!seance) return;
      seance.blessure = {
        serie: $('fin-blessure-serie').value,
        texte: $('fin-blessure-texte').value,
      };
      enregistrerSeance();
    });
  });

  // Réglages vit sur le menu principal (Sport/Suivi), accessible d'un geste
  // quel que soit le sous-menu ensuite ouvert (demande de l'utilisateur le
  // 16 septembre 2026).
  $('bouton-reglages').addEventListener('click', () => { rendreReglages(); afficher('reglages'); });
  $('bouton-reglages-retour').addEventListener('click', () => {
    sauverReglages();
    rendreAccueil();
    afficher('menu');
    // Quitter les réglages après y avoir renseigné le pont doit suffire à
    // vider ce qui attendait, sans obliger à passer par "Tester le pont".
    if (reglages.pont) synchroniser().then(rendreEtatSync).catch(() => {});
  });
  $('bouton-menu-sport').addEventListener('click', () => { rendreAccueil(); afficher('accueil'); });
  $('bouton-menu-suivi').addEventListener('click', () => afficher('suivi'));
  $('bouton-sport-retour').addEventListener('click', () => afficher('menu'));
  $('bouton-suivi-retour').addEventListener('click', () => afficher('menu'));

  $('bouton-suivi-calendrier').addEventListener('click', () => { rendreCalendrier(); afficher('calendrier'); });
  $('bouton-calendrier-retour').addEventListener('click', () => afficher('suivi'));
  $('bouton-suivi-etat').addEventListener('click', () => { rendreEtatMusculaire(); afficher('etat-musculaire'); });
  $('bouton-etat-retour').addEventListener('click', () => afficher('suivi'));
  $('bouton-suivi-sommeil').addEventListener('click', () => {
    nuitAffichee = cleNuitCourante();
    rendreSommeil();
    afficher('sommeil');
  });
  $('bouton-sommeil-retour').addEventListener('click', () => afficher('suivi'));
  $('bouton-sommeil-precedent').addEventListener('click', () => { decalerNuitAffichee(-1); rendreSommeil(); });
  $('bouton-sommeil-suivant').addEventListener('click', () => { decalerNuitAffichee(1); rendreSommeil(); });

  $('bouton-suivi-mensurations').addEventListener('click', () => {
    mensurationAffichee = cleMensurationCourante();
    rendreMensurations();
    afficher('mensurations');
  });
  $('bouton-mensurations-retour').addEventListener('click', () => afficher('suivi'));
  $('bouton-mensurations-precedent').addEventListener('click', () => { decalerMensurationAffichee(-1); rendreMensurations(); });
  $('bouton-mensurations-suivant').addEventListener('click', () => { decalerMensurationAffichee(1); rendreMensurations(); });

  $('mensurations-photo-fichier').addEventListener('change', () => {
    const fichier = $('mensurations-photo-fichier').files[0];
    $('mensurations-photo-fichier').value = '';
    if (!fichier) return;
    compresserImage(fichier, (dataUrl) => {
      const m = mensurationPour(mensurationAffichee);
      m.photo = dataUrl;
      enregistrerMensuration(m);
      rendreMensurations();
    });
  });
  $('mensurations-avant').addEventListener('change', majPhotosComparees);
  $('mensurations-apres').addEventListener('change', majPhotosComparees);

  $('bouton-suivi-course').addEventListener('click', () => { rendreEvolutionCourse(); afficher('course-evolution'); });
  $('bouton-course-evolution-retour').addEventListener('click', () => afficher('suivi'));

  $('bouton-suivi-tonnage').addEventListener('click', () => { rendreTonnageMuscles(); afficher('tonnage-muscles'); });
  $('bouton-tonnage-muscles-retour').addEventListener('click', () => afficher('suivi'));
  ['tonnage-mannequin', 'tonnage-liste'].forEach((id) => {
    $(id).addEventListener('click', (evenement) => {
      const cible = evenement.target.closest('[data-zone]');
      if (cible) actionnerZoneTonnage(cible.dataset.zone);
    });
  });

  // Poignée de comparaison : souris et tactile au même endroit, plutôt que
  // deux jeux d'écouteurs. Le déplacement suit le pointeur tant qu'il reste
  // pressé, même hors du cadre de la poignée elle-même.
  $('mensurations-slider-poignee').addEventListener('pointerdown', (evenement) => {
    glisseSlider = true;
    deplacerSliderMensurations(evenement.clientX);
  });
  window.addEventListener('pointermove', (evenement) => {
    if (glisseSlider) deplacerSliderMensurations(evenement.clientX);
  });
  window.addEventListener('pointerup', () => { glisseSlider = false; });

  // Glissement d'un repère de journée vers la frise du sommeil, même
  // principe que la poignée ci-dessus (écouteurs posés une fois ici,
  // l'état glissementRepere décide s'il y a quelque chose à faire) : voir
  // demarrerGlissementRepere() dans rendreSommeil().
  window.addEventListener('pointermove', (evenement) => {
    if (glissementRepere) deplacerGlissementRepere(evenement.clientX, evenement.clientY);
  });
  window.addEventListener('pointerup', (evenement) => {
    if (glissementRepere) deposerGlissementRepere(evenement.clientX, evenement.clientY);
  });
  ['reglage-pont', 'reglage-secret', 'reglage-son', 'reglage-vibration', 'reglage-veille',
   'reglage-clavier-recup']
    .forEach((id) => $(id).addEventListener('change', sauverReglages));
  // À part : cocher doit d'abord obtenir la permission du navigateur, un
  // geste que sauverReglages() seule ne déclenche pas.
  $('reglage-notification').addEventListener('change', async (evenement) => {
    if (evenement.target.checked) {
      if (!('Notification' in window)) {
        evenement.target.checked = false;
        $('reglages-message').className = 'message erreur';
        $('reglages-message').textContent = 'Notifications non prises en charge par ce navigateur.';
      } else if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          evenement.target.checked = false;
          $('reglages-message').className = 'message erreur';
          $('reglages-message').textContent = 'Autorisation refusée : impossible de notifier hors de l\'application.';
        }
      }
    }
    sauverReglages();
  });

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
    programme.jours.push(JOUR_GAINAGE);
  } catch (e) {
    document.body.innerHTML =
      '<p class="vide">Programme introuvable. Lancez <code>python outils/importer_classeur.py</code>.</p>';
    return;
  }

  fusionnerJ6DansJ2();
  brancher();
  rendreAccueil();
  afficher('menu');

  if (navigator.onLine) synchroniser().catch(() => {});
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

demarrer();
