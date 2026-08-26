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
 * Trois onglets plutot qu'un seul, parce qu'un graphique se construit sur une
 * granularite donnee : melanger series, exercices et seances dans le meme
 * tableau obligerait a filtrer avant chaque courbe.
 *
 *   Series    : le detail, une ligne par serie. Source des analyses fines.
 *   Exercices : une ligne par exercice et par seance. Source des courbes de
 *               progression par mouvement, la vue la plus utile au quotidien.
 *   Seances   : une ligne par seance. Source des volumes hebdomadaires.
 *
 * Chaque onglet porte Date et Semaine : un tableau croise dynamique ou un
 * graphique se regroupe alors sans formule intermediaire.
 */
const ONGLET_SERIES = 'Séries (app)';
const ONGLET_EXERCICES = 'Exercices (app)';
const ONGLET_SEANCES = 'Séances (app)';

const ENTETES = {};
ENTETES[ONGLET_SERIES] = [
  'Date', 'Semaine', 'Jour', 'Exercice', 'Muscle',
  'Serie', 'Echauffement', 'Charge', 'Reps', 'RIR', 'Tonnage',
];
ENTETES[ONGLET_EXERCICES] = [
  'Date', 'Semaine', 'Jour', 'Exercice', 'Muscle',
  'Series', 'Reps totales', 'Charge max', 'Tonnage', 'RIR moyen',
];
ENTETES[ONGLET_SEANCES] = [
  'Date', 'Semaine', 'Jour', 'Type', 'Duree (min)',
  'Series', 'Tonnage', 'Distance (km)', 'Allure (min/km)',
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

/**
 * Repartit une seance sur les trois onglets, du detail au resume.
 *
 * Rien n'est ecrit dans la grille du programme : celle-ci est dessinee pour
 * la saisie manuelle (groupes de colonnes par seance), pas pour un flux
 * automatique, et la modifier depuis le script romprait sa mise en page au
 * premier ecart de format.
 *
 * L'echauffement compte dans l'onglet Series, pour garder la trace de ce qui
 * a ete fait, mais jamais dans les tonnages agreges : une montee en charge
 * gonflerait le volume sans correspondre a du travail effectif.
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
    ajouterLignes(ongletPret(classeur, ONGLET_SEANCES), [[
      date, semaine, jour, 'footing', duree, '', '', distance, allure,
    ]]);
    return;
  }

  const lignesSeries = [];
  const lignesExercices = [];
  let tonnageSeance = 0;
  let seriesSeance = 0;

  (seance.exercices || []).forEach(function (exo) {
    let rang = 0;
    let tonnageExo = 0;
    let repsExo = 0;
    let chargeMax = 0;
    let seriesExo = 0;
    const rirs = [];

    (exo.series || []).forEach(function (s) {
      if (!s.faite) return;
      const charge = s.charge != null ? s.charge : '';
      const reps = s.reps != null ? s.reps : '';
      const tonnage = (s.charge || 0) * (s.reps || 0);
      if (!s.echauffement) rang++;

      lignesSeries.push([
        date, semaine, jour, exo.nom || '', exo.muscle || '',
        s.echauffement ? 'ech' : rang,
        s.echauffement ? 'oui' : 'non',
        charge, reps,
        s.rir != null ? s.rir : '',
        s.echauffement ? '' : tonnage,
      ]);

      if (s.echauffement) return;
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

  if (!lignesSeries.length) return;

  ajouterLignes(ongletPret(classeur, ONGLET_SERIES), lignesSeries);
  ajouterLignes(ongletPret(classeur, ONGLET_EXERCICES), lignesExercices);
  ajouterLignes(ongletPret(classeur, ONGLET_SEANCES), [[
    date, semaine, jour, 'muscu', dureeMin, seriesSeance, tonnageSeance, '', '',
  ]]);
}
