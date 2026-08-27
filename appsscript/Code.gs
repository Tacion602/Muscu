/**
 * Pont entre l'application et le classeur du programme.
 *
 * A coller dans Extensions > Apps Script depuis le classeur lui-meme (le
 * script est alors lie au classeur et n'a besoin d'aucun identifiant). Puis
 * Deployer > Nouveau deploiement > type "Application Web", executer en tant
 * que "Moi", acces "Tous ceux qui possedent le lien". L'adresse du
 * deploiement va dans les reglages de l'application, cote telephone.
 *
 * SECRET protege l'ecriture : sans lui, n'importe qui connaissant l'adresse
 * pourrait remplir le classeur. Changez-le ici puis reportez la meme valeur
 * dans les reglages de l'application.
 */

const SECRET = 'a-changer';

/**
 * Deux familles de pages, pour deux usages distincts :
 *
 *   Exercices (app), Seances (app) : une ligne par observation, sans mise en
 *     forme. Source pretes-a-graphiquer : selectionner deux colonnes,
 *     inserer un graphique Sheets, rien d'autre a faire.
 *
 *   J1, J3, J4, J5, Course : une page par jour d'entrainement, dans le
 *     format de la grille manuelle d'origine choisi par l'utilisateur le
 *     27 aout 2026 apres qu'un premier essai (tout en lignes plates) s'est
 *     revele illisible a l'usage. Un bloc par exercice, un groupe de quatre
 *     colonnes (Charge, Reps, RIR, Total) par seance : la lecture directe
 *     de la progression, sans detour par un tableau croise dynamique.
 *
 * Les deux coexistent : celles-la pour l'oeil, celles-ci pour les graphiques.
 */
const ONGLET_EXERCICES = 'Exercices (app)';
const ONGLET_SEANCES = 'Séances (app)';

const ENTETES = {};
ENTETES[ONGLET_EXERCICES] = [
  'Date', 'Semaine', 'Jour', 'Exercice', 'Muscle',
  'Series', 'Reps totales', 'Charge max', 'Tonnage', 'RIR moyen',
];
ENTETES[ONGLET_SEANCES] = [
  'Date', 'Semaine', 'Jour', 'Type', 'Duree (min)',
  'Series', 'Tonnage', 'Distance (km)', 'Allure (min/km)',
  // Propres aux quatre types de course. Des colonnes nommees plutot qu'un
  // champ texte libre : creuses par nature, mais tracables en graphique.
  'Repetitions', 'Recup (s)', 'Pente (%)', 'Charge portee (kg)', 'Duree seuil (min)',
];

function doPost(requete) {
  let corps;
  try {
    corps = JSON.parse(requete.postData.contents);
  } catch (e) {
    return reponse({ ok: false, erreur: 'corps illisible' });
  }

  if (corps.secret !== SECRET) {
    return reponse({ ok: false, erreur: 'mot de passe incorrect' });
  }

  if (corps.action === 'ping') {
    return reponse({ ok: true, classeur: SpreadsheetApp.getActiveSpreadsheet().getName() });
  }

  if (corps.action === 'seance') {
    try {
      ecrireSeance(corps.seance);
      return reponse({ ok: true });
    } catch (e) {
      return reponse({ ok: false, erreur: String(e) });
    }
  }

  return reponse({ ok: false, erreur: 'action inconnue' });
}

function doGet() {
  return reponse({ ok: true, message: 'Pont actif. Utilisez POST.' });
}

function reponse(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Recupere un onglet, le cree avec son entete et le fige si besoin. */
function ongletPret(classeur, nom) {
  let onglet = classeur.getSheetByName(nom);
  if (!onglet) {
    onglet = classeur.insertSheet(nom);
    onglet.appendRow(ENTETES[nom]);
    onglet.setFrozenRows(1);
    onglet.getRange(1, 1, 1, ENTETES[nom].length).setFontWeight('bold');
  }
  return onglet;
}

function ajouterLignes(onglet, lignes) {
  if (!lignes.length) return;
  onglet.getRange(onglet.getLastRow() + 1, 1, lignes.length, lignes[0].length).setValues(lignes);
}

/**
 * Numero de semaine ISO. Regrouper par semaine plutot que par date est la
 * maille naturelle d'un programme hebdomadaire : sans cette colonne, chaque
 * graphique devrait la recalculer par formule.
 */
function semaineIso(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Le jeudi de la semaine courante determine l'annee ISO.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numero = Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-S' + ('0' + numero).slice(-2);
}

function moyenne(valeurs) {
  if (!valeurs.length) return '';
  const somme = valeurs.reduce(function (t, v) { return t + v; }, 0);
  return Math.round((somme / valeurs.length) * 10) / 10;
}

function formatDateCourte(date) {
  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  return Utilities.formatDate(date, tz, 'dd/MM/yyyy');
}

/* ---------------------------------------------------------------------
 * Grille de musculation, une page par jour (J1, J3, J4, J5).
 * ------------------------------------------------------------------- */

const COULEUR_TITRE_JOUR = '#8e7cc3';
const COULEUR_BLOC_EXERCICE = '#c9daf8';
const COULEUR_ENTETE_DATE = '#efefef';
const LARGEUR_GROUPE_DATE = 4;       // Charge, Reps, RIR, Total
const PREMIERE_COLONNE_DATE = 3;     // A = exercice, B = espace, C = premiere date
const RANGEES_PAR_EXERCICE = 6;      // marge au dela des series prescrites

function feuilleJour(classeur, jour, titre) {
  let feuille = classeur.getSheetByName(jour);
  if (feuille) return feuille;
  feuille = classeur.insertSheet(jour);
  feuille.getRange(1, 1, 1, PREMIERE_COLONNE_DATE - 1 + LARGEUR_GROUPE_DATE)
    .merge()
    .setValue(titre)
    .setBackground(COULEUR_TITRE_JOUR)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(13);
  feuille.setColumnWidth(1, 190);
  feuille.setColumnWidth(2, 16);
  feuille.setFrozenRows(3);
  feuille.setFrozenColumns(1);
  return feuille;
}

/* Cherche le groupe de colonnes d'une date donnee en ligne 2 ; le cree a la
 * suite des groupes existants si absent. Deux seances le meme jour
 * partagent le meme groupe plutot que d'en ouvrir un second. */
function colonneGroupeDate(feuille, texteDate) {
  const derniereColonne = Math.max(feuille.getLastColumn(), PREMIERE_COLONNE_DATE - 1);
  for (let col = PREMIERE_COLONNE_DATE; col <= derniereColonne; col += LARGEUR_GROUPE_DATE) {
    const valeur = feuille.getRange(2, col).getValue();
    if (valeur === texteDate) return col;
    if (valeur === '') {
      ecrireEnteteGroupeDate(feuille, col, texteDate);
      return col;
    }
  }
  const col = derniereColonne + 1;
  ecrireEnteteGroupeDate(feuille, col, texteDate);
  return col;
}

function ecrireEnteteGroupeDate(feuille, col, texteDate) {
  feuille.getRange(2, col, 1, LARGEUR_GROUPE_DATE)
    .merge()
    .setValue(texteDate)
    .setBackground(COULEUR_ENTETE_DATE)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  feuille.getRange(3, col, 1, LARGEUR_GROUPE_DATE)
    .setValues([['Charge', 'Reps', 'RIR', 'Total']])
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  feuille.setColumnWidths(col, LARGEUR_GROUPE_DATE, 55);
}

/* Cherche le bloc d'un exercice en colonne A ; le cree a la suite des blocs
 * existants si absent, avec RANGEES_PAR_EXERCICE lignes reservees. Un
 * exercice qui deborderait un jour de ce nombre de series ecrit dans les
 * lignes du bloc suivant : limite connue, a corriger a la main si ca arrive. */
function ligneBlocExercice(feuille, nomExercice) {
  const derniereLigne = Math.max(feuille.getLastRow(), 3);
  for (let ligne = 4; ligne <= derniereLigne; ligne += RANGEES_PAR_EXERCICE) {
    const valeur = feuille.getRange(ligne, 1).getValue();
    if (valeur === nomExercice) return ligne;
    if (valeur === '') {
      ecrireEnteteBlocExercice(feuille, ligne, nomExercice);
      return ligne;
    }
  }
  const ligne = derniereLigne + 1;
  ecrireEnteteBlocExercice(feuille, ligne, nomExercice);
  return ligne;
}

function ecrireEnteteBlocExercice(feuille, ligne, nomExercice) {
  feuille.getRange(ligne, 1, RANGEES_PAR_EXERCICE, 1)
    .merge()
    .setValue(nomExercice)
    .setBackground(COULEUR_BLOC_EXERCICE)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setWrap(true);
}

/* Ecrit une seance de musculation dans la grille de son jour : un bloc par
 * exercice deja pratique, un groupe de colonnes par date de seance. Le total
 * (tonnage hors echauffement) se pose sur la premiere ligne du bloc, comme
 * dans la grille d'origine. */
function ecrireSeanceGrille(classeur, seance, date) {
  const feuille = feuilleJour(classeur, seance.jour, seance.titre.split(/\s+-\s+/)[0]);
  const col = colonneGroupeDate(feuille, formatDateCourte(date));

  (seance.exercices || []).forEach(function (exo) {
    const seriesFaites = (exo.series || []).filter(function (s) { return s.faite && !s.echauffement; });
    if (!seriesFaites.length) return;

    const ligne = ligneBlocExercice(feuille, exo.nom || '');
    const tonnage = seriesFaites.reduce(function (t, s) { return t + (s.charge || 0) * (s.reps || 0); }, 0);
    const donnees = seriesFaites.map(function (s) {
      return [s.charge != null ? s.charge : '', s.reps != null ? s.reps : '', s.rir != null ? s.rir : ''];
    });
    feuille.getRange(ligne, col, donnees.length, 3).setValues(donnees);
    feuille.getRange(ligne, col + 3).setValue(tonnage);
  });
}

/* ---------------------------------------------------------------------
 * Grille de course, une page unique avec un bloc par type de sortie.
 * ------------------------------------------------------------------- */

const COULEUR_TITRE_COURSE = '#76a5af';
const COULEUR_ENTETE_TYPE_COURSE = '#d9ead3';

const NOMS_TYPE_COURSE = {
  ef: 'Endurance fondamentale',
  fractionne: 'Fractionné',
  incline: 'Incliné',
  seuil: 'Séance au seuil',
};
const ENTETES_TYPE_COURSE = {
  ef: ['Date', 'Duree (min)', 'Distance (km)', 'Allure (min/km)'],
  fractionne: ['Date', 'Duree (min)', 'Distance (km)', 'Allure (min/km)', 'Repetitions', 'Recup (s)'],
  incline: ['Date', 'Duree (min)', 'Distance (km)', 'Allure (min/km)', 'Pente (%)', 'Charge portee (kg)'],
  seuil: ['Date', 'Duree (min)', 'Distance (km)', 'Allure (min/km)', 'Duree au seuil (min)'],
};

function feuilleCourse(classeur) {
  let feuille = classeur.getSheetByName('Course');
  if (feuille) return feuille;
  feuille = classeur.insertSheet('Course');
  feuille.getRange(1, 1, 1, 6)
    .merge()
    .setValue('Course')
    .setBackground(COULEUR_TITRE_COURSE)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(13);
  return feuille;
}

/* Cherche le bloc d'un type de course par son titre en colonne A ; le cree a
 * la suite des blocs existants si absent. Chaque type a ses propres colonnes
 * (repetitions, pente...), donc son propre bloc plutot qu'un tableau commun
 * troue de cases sans objet pour les trois autres types. */
function blocTypeCourse(feuille, type) {
  const titre = NOMS_TYPE_COURSE[type] || NOMS_TYPE_COURSE.ef;
  const entetes = ENTETES_TYPE_COURSE[type] || ENTETES_TYPE_COURSE.ef;
  const titresConnus = Object.keys(NOMS_TYPE_COURSE).map(function (k) { return NOMS_TYPE_COURSE[k]; });
  const derniereLigne = Math.max(feuille.getLastRow(), 1);

  for (let ligne = 2; ligne <= derniereLigne; ligne++) {
    if (feuille.getRange(ligne, 1).getValue() !== titre) continue;
    let curseur = ligne + 2;
    while (curseur <= derniereLigne) {
      const valeur = feuille.getRange(curseur, 1).getValue();
      if (valeur === '' || titresConnus.indexOf(valeur) !== -1) break;
      curseur++;
    }
    // Insere une ligne plutot que d'ecrire sur celle trouvee, qui est soit
    // vide (fin de feuille), soit deja le titre du bloc suivant : ecrire
    // dessus grignoterait la separation entre deux blocs au fil de seances
    // de types differents entrelacees dans le temps.
    feuille.insertRowBefore(curseur);
    return { ligne: curseur, colonnes: entetes.length };
  }

  const ligneTitre = derniereLigne > 1 ? derniereLigne + 2 : 1;
  feuille.getRange(ligneTitre, 1).setValue(titre).setFontWeight('bold').setFontSize(12);
  feuille.getRange(ligneTitre + 1, 1, 1, entetes.length)
    .setValues([entetes])
    .setBackground(COULEUR_ENTETE_TYPE_COURSE)
    .setFontWeight('bold');
  return { ligne: ligneTitre + 2, colonnes: entetes.length };
}

function ecrireCourseGrille(classeur, seance, date) {
  const f = seance.footing || {};
  if (!f.duree_min && !f.distance_km) return;

  const type = f.type || 'ef';
  const feuille = feuilleCourse(classeur);
  const bloc = blocTypeCourse(feuille, type);
  const allure = (f.duree_min && f.distance_km)
    ? Math.round((f.duree_min / f.distance_km) * 100) / 100
    : '';
  const vide = function (v) { return v != null ? v : ''; };
  const base = [formatDateCourte(date), vide(f.duree_min), vide(f.distance_km), allure];
  const extra = {
    fractionne: [vide(f.repetitions), vide(f.recup_s)],
    incline: [vide(f.pente_pct), vide(f.charge_kg)],
    seuil: [vide(f.duree_seuil_min)],
  }[type] || [];

  feuille.getRange(bloc.ligne, 1, 1, bloc.colonnes).setValues([base.concat(extra)]);
}

/**
 * Ecrit une seance a la fois dans les pages pretes-a-graphiquer (Exercices,
 * Seances) et dans la page de lecture humaine de son jour (grille par
 * exercice, ou bloc de course par type).
 *
 * Rien n'est ecrit dans la grille du programme d'origine : celle-ci reste la
 * source de la prescription, pas une cible d'ecriture automatique.
 *
 * L'echauffement n'entre dans aucun tonnage agrege, ni dans la page du jour :
 * une montee en charge gonflerait le volume sans correspondre a du travail
 * effectif.
 */
function ecrireSeance(seance) {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const date = seance.fin ? new Date(seance.fin) : new Date();
  const semaine = semaineIso(date);
  const jour = seance.jour || '';
  const dureeMin = seance.duree_min != null ? seance.duree_min : '';

  if (seance.type === 'footing') {
    const f = seance.footing || {};
    if (!f.duree_min && !f.distance_km) return;
    const duree = f.duree_min != null ? f.duree_min : '';
    const distance = f.distance_km != null ? f.distance_km : '';
    const allure = (f.duree_min && f.distance_km)
      ? Math.round((f.duree_min / f.distance_km) * 100) / 100
      : '';
    const vide = function (v) { return v != null ? v : ''; };
    // Le type precis (ef, fractionne, incline, seuil) plutot qu'un "footing"
    // uniforme : sans lui, comparer deux sorties reviendrait a melanger une
    // endurance et un fractionne, dont les allures n'ont rien de comparable.
    ajouterLignes(ongletPret(classeur, ONGLET_SEANCES), [[
      date, semaine, jour, f.type || 'ef', duree, '', '', distance, allure,
      vide(f.repetitions), vide(f.recup_s), vide(f.pente_pct),
      vide(f.charge_kg), vide(f.duree_seuil_min),
    ]]);
    ecrireCourseGrille(classeur, seance, date);
    return;
  }

  const lignesExercices = [];
  let tonnageSeance = 0;
  let seriesSeance = 0;

  (seance.exercices || []).forEach(function (exo) {
    let tonnageExo = 0;
    let repsExo = 0;
    let chargeMax = 0;
    let seriesExo = 0;
    const rirs = [];

    (exo.series || []).forEach(function (s) {
      if (!s.faite || s.echauffement) return;
      const tonnage = (s.charge || 0) * (s.reps || 0);
      seriesExo++;
      tonnageExo += tonnage;
      repsExo += s.reps || 0;
      if ((s.charge || 0) > chargeMax) chargeMax = s.charge || 0;
      if (s.rir != null) rirs.push(s.rir);
    });

    if (!seriesExo) return;
    lignesExercices.push([
      date, semaine, jour, exo.nom || '', exo.muscle || '',
      seriesExo, repsExo, chargeMax, tonnageExo, moyenne(rirs),
    ]);
    tonnageSeance += tonnageExo;
    seriesSeance += seriesExo;
  });

  if (!lignesExercices.length) return;

  ajouterLignes(ongletPret(classeur, ONGLET_EXERCICES), lignesExercices);
  ajouterLignes(ongletPret(classeur, ONGLET_SEANCES), [[
    date, semaine, jour, 'muscu', dureeMin, seriesSeance, tonnageSeance, '', '',
    '', '', '', '', '',
  ]]);
  ecrireSeanceGrille(classeur, seance, date);
}
