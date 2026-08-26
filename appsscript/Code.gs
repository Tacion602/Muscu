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
const ONGLET_SEANCES = 'Séances (app)';

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

/**
 * Ecrit une ligne par serie validee dans un onglet dedie a l'application,
 * plutot que dans la grille du programme : celle-ci est dessinee pour la
 * saisie manuelle (groupes de colonnes par seance), pas pour un flux
 * automatique, et la modifier depuis le script romprait sa mise en page au
 * premier ecart de format. L'onglet est cree au premier envoi si absent.
 */
function ecrireSeance(seance) {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  let onglet = classeur.getSheetByName(ONGLET_SEANCES);
  if (!onglet) {
    onglet = classeur.insertSheet(ONGLET_SEANCES);
    onglet.appendRow([
      'Date', 'Jour', 'Exercice', 'Serie', 'Echauffement',
      'Charge', 'Reps', 'RIR', 'Debut seance', 'Fin seance',
    ]);
    onglet.setFrozenRows(1);
  }

  const lignes = [];
  (seance.exercices || []).forEach((exo) => {
    let rang = 0;
    (exo.series || []).forEach((s) => {
      if (!s.faite) return;
      if (!s.echauffement) rang++;
      lignes.push([
        seance.fin ? new Date(seance.fin) : new Date(),
        seance.jour || '',
        exo.nom || '',
        s.echauffement ? 'ech' : rang,
        s.echauffement ? 'oui' : 'non',
        s.charge != null ? s.charge : '',
        s.reps != null ? s.reps : '',
        s.rir != null ? s.rir : '',
        seance.debut ? new Date(seance.debut) : '',
        seance.fin ? new Date(seance.fin) : '',
      ]);
    });
  });

  if (lignes.length) {
    onglet.getRange(onglet.getLastRow() + 1, 1, lignes.length, lignes[0].length).setValues(lignes);
  }
}
