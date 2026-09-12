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

   `couleurTexte`, quand présent, remplace `couleur` pour l'affichage : mesuré
   sur les fonds réels de l'écran (`--fond`, `--fond-champ`), `farmer_walk`
   (2,4:1) et `marche_ours` (3,9:1) tombent sous le seuil de lisibilité WCAG
   AA (4,5:1) en texte de cette taille, là où les sept autres teintes passent
   largement (5:1 et plus). Éclaircies vers le blanc jusqu'à repasser ce
   seuil sur le fond le plus défavorable, en gardant la même teinte. */
const MOUVEMENTS_GAINAGE = {
  dead_bug: {
    nom: 'Dead bug', mode: 'reps', prescription: '6-8 par côté', repos: 45,
    interference: 4, couleur: '#D9EF8B',
    consigne: '3 s de descente bras et jambe opposés, 1 s en bas, 3 s de retour. '
      + 'Bas du dos plaqué au sol en permanence.',
  },
  planche: {
    nom: 'Planche', mode: 'chrono', prescription: '45 s', repos: 45,
    interference: 3, couleur: '#91CF60',
    consigne: 'Bassin en rétroversion légère, fessiers contractés.',
  },
  pallof_press: {
    nom: 'Pallof press', mode: 'reps', prescription: '8-10 par côté', repos: 45,
    interference: 1, couleur: '#1A9850',
    consigne: 'Poulie à hauteur de poitrine, à 1 m, perpendiculaire. 2 s pour tendre, '
      + '2 s de maintien, 2 s de retour. Départ 10 à 15 kg. Le buste ne pivote pas.',
  },
  bird_dog: {
    nom: 'Bird dog', mode: 'chrono', prescription: '45 s', repos: 45,
    interference: 5, couleur: '#FEE08B',
    consigne: "2 s d'extension bras et jambe opposés, 2 s de maintien, 2 s de retour. "
      + 'Hanches horizontales.',
  },
  marche_ours: {
    nom: "Marche de l'ours", mode: 'chrono', prescription: '45 s', repos: 45,
    interference: 8, couleur: '#D73027', couleurTexte: '#E1665F',
    consigne: 'Genoux à quelques centimètres du sol, dos plat, bassin qui ne bascule '
      + 'pas latéralement.',
  },
  planche_laterale: {
    nom: 'Planche latérale', mode: 'chrono', prescription: '45 s par côté', repos: 45,
    interference: 2, couleur: '#52B151',
    consigne: "Ligne cheville-hanche-épaule, hanche empilée sur l'épaule et haute. "
      + "Le temps noté est celui d'un côté.",
  },
  farmer_walk: {
    nom: 'Farmer walk une main', mode: 'charge', prescription: '20-30 m par côté', repos: 60,
    interference: 9, couleur: '#A50026', couleurTexte: '#CD7085',
    consigne: "Départ 18 à 20 kg. Épaules horizontales, arrêt dès l'inclinaison, quelle "
      + 'que soit la distance restante.',
    info: 'Il ne fatigue pas la sangle comme les autres : il charge la chaîne portante '
      + "complète sous contrainte axiale. Son rang n'est pas directement comparable "
      + 'aux huit autres.',
  },
  crunch_inverse: {
    nom: 'Crunch inversé', mode: 'reps', prescription: '10-12', repos: 45,
    interference: 6, couleur: '#FDAE61',
    consigne: '2 s de montée, 3 s de descente contrôlée. Le bassin décolle, pas '
      + 'seulement les jambes. Aucun élan.',
  },
  releve_genoux: {
    nom: 'Relevé de genoux suspendu', mode: 'reps', prescription: '8-12', repos: 60,
    interference: 7, couleur: '#F46D43',
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
function derniereFois(nomExo) {
  const passees = lireTableau(CLES.historique)
    .filter((s) => s.fin)
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

    const [nom, ...reste] = sansCodeDeJour(jour.titre).split(/\s+-\s+/);
    const derniere = derniereSeanceDuJour(jour.code);
    const commencee = enCours[jour.code] && !enCours[jour.code].fin;
    if (commencee) bouton.classList.add('en-cours');

    const detail = jour.type === 'footing'
      ? 'Durée et distance'
      : jour.type === 'gainage'
        ? 'Optionnelle, 4 catégories'
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

  arreterMinuteurGainage();
  const carte = lireSeancesEnCours();
  const reprise = carte[code] && !carte[code].fin;
  seance = reprise ? carte[code] : nouvelleSeance(jour);

  indexExo = reprise ? positionDeReprise() : 0;
  enregistrerSeance();
  demanderVeille();
  afficher('seance');

  if (jour.type === 'footing') {
    rendreFooting();
  } else if (jour.type === 'gainage') {
    rendreSeanceGainage();
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
  // Le farmer walk, seul exercice annexe des footings depuis le 11 septembre
  // 2026, vit dans `mouvements` comme ceux de la séance de gainage.
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
  $('bloc-gainage').hidden = true;
  $('bouton-precedent').hidden = true;
  $('bouton-suivant').hidden = true;

  $('seance-jour').textContent = jour.code + ' ' + nomDuJour(jour.titre);
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
  rendreFarmerWalkFooting();
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

/* Farmer walk des jours de footing, à historique commun avec la séance de
   gainage (décision de l'utilisateur le 11 septembre 2026) : les deux écrivent
   dans `seance.mouvements.farmer_walk`, et derniereFoisMouvement() lit l'un et
   l'autre. */
function rendreFarmerWalkFooting() {
  const bloc = $('footing-farmer');
  bloc.innerHTML = '';
  bloc.appendChild(carteMouvement('Farmer walk', 3, 'farmer_walk', null));
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
  // Une série validée sans chiffres n'apprend rien : on reprend ceux de la
  // dernière fois, affichés en filigrane, plutôt que d'enregistrer un vide.
  if (serie.charge == null || serie.reps == null) {
    const avant = derniereFois(exercice.nom);
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
  arreterMinuteurGainage();
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
    ? premiereSerieDeTravail((precedente.exercices || []).find((e) => e.nom === premier.nom))
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
  const noms = TYPES_COURSE.filter((t) => carte[t.cle]).map((t) => t.complet);
  return noms.concat(MOUVEMENTS_GAINAGE.farmer_walk.nom);
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
    .map((s) => premiereSerieDeTravail((s.exercices || []).find((e) => e.nom === nomExo)))
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

  const chemin = points
    .map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1))
    .join(' ');
  const cercles = points
    .map((v, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) +
      '" r="' + (i === points.length - 1 ? 4 : 2.5) + '"/>')
    .join('');

  return '<svg class="courbe" viewBox="0 0 ' + largeur + ' ' + hauteur + '" ' +
    'role="img" aria-label="Progression, ' + libelle + ', sur ' + points.length + ' séances">' +
    '<path d="' + chemin + '"/>' + cercles + '</svg>';
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

  $('bouton-terminer').addEventListener('click', terminer);
  $('chrono-seance-demarrer').addEventListener('click', basculerChronoSeance);
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
  $('minuterie').addEventListener('click', () => minuterieTerminee(true));
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
    programme.jours.push(JOUR_GAINAGE);
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
