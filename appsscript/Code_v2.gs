/**
 * Pont de la version 2 entre l'application (v2/) et le NOUVEAU classeur.
 *
 * Decide le 4 novembre 2026 : classeur neuf, onglets plats, une ligne par
 * observation. Plus de grille de jour a blocs de six lignes : la lecture
 * humaine passe par les filtres, tableaux croises et graphiques de Sheets,
 * sur des colonnes nommees. L'ancien pont (Code.gs) reste au service de
 * l'ancienne application, sur l'ancien classeur.
 *
 * A coller dans Extensions > Apps Script depuis le nouveau classeur, puis
 * Deployer > Nouveau deploiement > Application Web, executer en tant que
 * "Moi", acces "Tous ceux qui possedent le lien". L'adresse du deploiement
 * et SECRET vont dans les reglages de l'application v2.
 *
 * Actions acceptees (corps JSON en text/plain, voir envoyer() cote app) :
 *   ping          verifie l'adresse et le secret
 *   seance        une seance terminee (muscu, cardio ou gainage)
 *   historique    un lot de seances (reprise de l'historique de la v1)
 *   consignes     l'ensemble courant des consignes techniques (mise a jour)
 *   reglages      l'ensemble courant des reglages de machine (mise a jour)
 *   douleurs      l'ensemble courant des douleurs par exercice (mise a jour)
 *   sommeil       l'ensemble courant des nuits (mise a jour)
 *   mensuration   une mesure datee, photo deposee sur Drive
 *   remarque      une remarque libre pour le developpeur
 *   programme     le programme courant, pour sauvegarde (remplace l'onglet)
 *
 * Chaque reponse a `seance` renvoie les numeros de lignes ecrites dans
 * Series et Seances : l'application les garde pour ouvrir le classeur
 * directement a la bonne ligne depuis une courbe de progression.
 */

const SECRET = 'a-changer';
const VERSION_PONT = 'v2-2026-11-04';

const ONGLETS = {
  seances: 'Séances',
  series: 'Séries',
  course: 'Course',
  gainage: 'Gainage',
  douleurs: 'Douleurs',
  remarques: 'Remarques',
  consignes: 'Consignes',
  reglages: 'Réglages machine',
  sommeil: 'Sommeil',
  mensurations: 'Mensurations',
  programme: 'Programme (sauvegarde)',
};

const ENTETES = {};
ENTETES[ONGLETS.seances] = ['Id', 'Date', 'Semaine', 'Jour', 'Nom', 'Type', 'Durée (min)',
  'Séries', 'Tonnage (kg)', 'Deload', 'Remarque', 'Douleurs'];
ENTETES[ONGLETS.series] = ['Id séance', 'Date', 'Semaine', 'Jour', 'Exercice', 'Muscle',
  'Série', 'Charge (kg)', 'Reps', 'RIR', 'e1RM (kg)', 'Rest-pause', 'Deload', 'Remplace'];
ENTETES[ONGLETS.course] = ['Id séance', 'Date', 'Semaine', 'Type', 'Passage', 'Durée (min)',
  'Distance (km)', 'Allure (min/km)', 'Calories', 'Vitesse moyenne (km/h)', 'Répétitions',
  'Récup (s)', 'Pente (%)', 'Charge portée (kg)', 'Durée seuil (min)', 'Activité',
  'FC moyenne (bpm)', 'FC max (bpm)'];
ENTETES[ONGLETS.gainage] = ['Id séance', 'Date', 'Semaine', 'Jour', 'Catégorie', 'Mouvement',
  'Série', 'Valeur', 'Unité', 'Poids (kg)'];
ENTETES[ONGLETS.douleurs] = ['Exercice', 'Date', 'Jour', 'Description', 'Id séance'];
ENTETES[ONGLETS.remarques] = ['Date', 'Jour', 'Remarque'];
ENTETES[ONGLETS.consignes] = ['Jour', 'Exercice', 'Consigne', 'Mis à jour'];
ENTETES[ONGLETS.reglages] = ['Exercice', 'Réglages', 'Mis à jour'];
ENTETES[ONGLETS.sommeil] = ['Nuit', 'Insomnies (nb)', 'Insomnies (heures)',
  'Sommeil hors coeur (heures)', 'Coeur désactivé (heures)', 'Raisons', 'Alcool', 'Café',
  'Pipi nocturne', 'Écran tardif', 'Repas tardif', 'Heure muscu', 'Heure cardio'];
ENTETES[ONGLETS.mensurations] = ['Date', 'Poids (kg)', 'Poitrine (cm)', 'Bras (cm)',
  'Taille (cm)', 'Hanches (cm)', 'Cuisse (cm)', 'Mollet (cm)', 'Photo'];
ENTETES[ONGLETS.programme] = ['Jour', 'Rang', 'Nom', 'Type', 'Numero', 'Exercice', 'Series',
  'Reps min', 'Reps max', 'RIR', 'Repos', 'Muscle', 'Consigne', 'Reglages', 'Substituts'];

function doGet() {
  return reponse({ ok: true, version: VERSION_PONT, message: 'Pont v2 actif. Utilisez POST.' });
}

function doPost(requete) {
  let corps;
  try {
    corps = JSON.parse(requete.postData.contents);
  } catch (e) {
    return reponse({ ok: false, erreur: 'corps illisible' });
  }
  if (corps.secret !== SECRET) return reponse({ ok: false, erreur: 'mot de passe incorrect' });

  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  try {
    switch (corps.action) {
      case 'ping':
        return reponse({ ok: true, classeur: classeur.getName(), version: VERSION_PONT,
          id: classeur.getId(), gids: gidsDesOnglets(classeur) });
      case 'seance':
        return reponse({ ok: true, lignes: ecrireSeance(classeur, corps.seance) });
      case 'historique': {
        const resultats = {};
        (corps.seances || []).forEach(function (s) { resultats[s.id] = ecrireSeance(classeur, s); });
        return reponse({ ok: true, lignes: resultats });
      }
      case 'consignes':
        mettreAJour(classeur, ONGLETS.consignes, (corps.consignes || []).map(function (c) {
          return [c.jour, c.exercice, c.texte, new Date()];
        }), 2);
        return reponse({ ok: true });
      case 'reglages':
        mettreAJour(classeur, ONGLETS.reglages, (corps.reglages || []).map(function (r) {
          return [r.exercice, r.texte, new Date()];
        }), 1);
        return reponse({ ok: true });
      case 'douleurs':
        mettreAJour(classeur, ONGLETS.douleurs, (corps.douleurs || []).map(function (d) {
          return [d.exercice, d.date, d.jour || '', d.texte, d.seance || ''];
        }), 2, true);
        return reponse({ ok: true });
      case 'sommeil':
        ecrireSommeil(classeur, corps.nuits);
        return reponse({ ok: true });
      case 'mensuration':
        ecrireMensuration(classeur, corps.mensuration);
        return reponse({ ok: true });
      case 'remarque':
        ongletPret(classeur, ONGLETS.remarques).appendRow([new Date(), corps.jour || '(Suivi)', corps.texte || '']);
        return reponse({ ok: true });
      case 'programme':
        ecrireProgramme(classeur, corps.programme);
        return reponse({ ok: true });
      default:
        return reponse({ ok: false, erreur: 'action inconnue : ' + corps.action });
    }
  } catch (e) {
    return reponse({ ok: false, erreur: String(e) + ' [' + VERSION_PONT + ' ' + lieuErreur(e) + ']' });
  }
}

function reponse(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}

function lieuErreur(e) {
  const pile = String((e && e.stack) || '');
  return pile.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 3).join(' < ');
}

/** Les gid des onglets, renvoyes au ping : l'application en a besoin pour
 *  construire un lien direct vers une ligne (#gid=...&range=A12). */
function gidsDesOnglets(classeur) {
  const gids = {};
  Object.keys(ONGLETS).forEach(function (cle) {
    const onglet = classeur.getSheetByName(ONGLETS[cle]);
    if (onglet) gids[cle] = onglet.getSheetId();
  });
  return gids;
}

/** Recupere un onglet, le cree avec son en-tete et le fige si besoin. Les
 *  colonnes ajoutees en fin d'en-tete apres coup sont completees. */
function ongletPret(classeur, nom) {
  const entete = ENTETES[nom];
  let onglet = classeur.getSheetByName(nom);
  if (!onglet) {
    onglet = classeur.insertSheet(nom);
    if (onglet.getMaxColumns() < entete.length) onglet.insertColumnsAfter(onglet.getMaxColumns(), entete.length - onglet.getMaxColumns());
    onglet.getRange(1, 1, 1, entete.length).setValues([entete]).setFontWeight('bold');
    onglet.setFrozenRows(1);
  } else if (onglet.getRange(1, entete.length).getValue() === '') {
    if (onglet.getMaxColumns() < entete.length) onglet.insertColumnsAfter(onglet.getMaxColumns(), entete.length - onglet.getMaxColumns());
    onglet.getRange(1, 1, 1, entete.length).setValues([entete]).setFontWeight('bold');
  }
  return onglet;
}

/** Ajoute des lignes d'un bloc et renvoie [premiere, derniere] ligne ecrite. */
function ajouterLignes(onglet, lignes) {
  if (!lignes.length) return null;
  const debut = onglet.getLastRow() + 1;
  if (onglet.getMaxRows() < debut + lignes.length) onglet.insertRowsAfter(onglet.getMaxRows(), debut + lignes.length - onglet.getMaxRows());
  onglet.getRange(debut, 1, lignes.length, lignes[0].length).setValues(lignes);
  return [debut, debut + lignes.length - 1];
}

/**
 * Mise a jour sur place : une ligne par cle (les `nbCles` premieres
 * colonnes), ajoutee si absente, remplacee sinon. `ajoutSeulement` garde
 * les lignes existantes et n'ajoute que les cles nouvelles (douleurs : une
 * entree datee n'a pas a etre reecrite).
 */
function mettreAJour(classeur, nom, lignes, nbCles, ajoutSeulement) {
  if (!lignes.length) return;
  const onglet = ongletPret(classeur, nom);
  const derniere = onglet.getLastRow();
  const index = {};
  if (derniere > 1) {
    onglet.getRange(2, 1, derniere - 1, nbCles).getValues().forEach(function (v, i) {
      index[v.slice(0, nbCles).join('\u0001')] = 2 + i;
    });
  }
  const neuves = [];
  lignes.forEach(function (l) {
    const cle = l.slice(0, nbCles).map(String).join('\u0001');
    const ligne = index[cle];
    if (ligne && !ajoutSeulement) onglet.getRange(ligne, 1, 1, l.length).setValues([l]);
    else if (!ligne) neuves.push(l);
  });
  ajouterLignes(onglet, neuves);
}

/* ---------------- Idempotence : une seance n'est ecrite qu'une fois ---------------- */

function dejaEcrite(id) {
  const brut = PropertiesService.getScriptProperties().getProperty('seances_v2');
  const carte = brut ? JSON.parse(brut) : {};
  return carte[id] || null;
}

function marquerEcrite(id, lignes) {
  const memoire = PropertiesService.getScriptProperties();
  const brut = memoire.getProperty('seances_v2');
  const carte = brut ? JSON.parse(brut) : {};
  carte[id] = lignes;
  // Plafond des proprietes de script : on ne garde que les 400 dernieres.
  const cles = Object.keys(carte);
  if (cles.length > 400) cles.slice(0, cles.length - 400).forEach(function (c) { delete carte[c]; });
  memoire.setProperty('seances_v2', JSON.stringify(carte));
}

/* ---------------- Outils ---------------- */

function semaineIso(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numero = Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-S' + ('0' + numero).slice(-2);
}

/** Aucune API de fuseau horaire : elles ont fait echouer le pont v1 en
 *  production (voir CLAUDE.md). Les accesseurs natifs de Date suffisent. */
function dateCourte(date) {
  return ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + date.getFullYear();
}

function vide(v) { return v === null || v === undefined ? '' : v; }

/** 1RM estime (formule d'Epley), arrondi au dixieme. Indicateur de
 *  progression de la v2, voir CLAUDE.md. */
function e1rm(charge, reps) {
  if (!charge || !reps) return '';
  return Math.round(charge * (1 + reps / 30) * 10) / 10;
}

/* ---------------- Seance ---------------- */

function ecrireSeance(classeur, seance) {
  if (!seance || !seance.id) throw new Error('seance sans identifiant');
  const deja = dejaEcrite(seance.id);
  if (deja) return deja;

  const date = new Date(seance.fin || seance.debut || Date.now());
  const semaine = semaineIso(date);
  const jourTexte = dateCourte(date);
  const lignes = {};

  let nbSeries = 0;
  let tonnage = 0;

  if (seance.type === 'muscu') {
    const rangs = [];
    (seance.exercices || []).forEach(function (exo) {
      let numero = 0;
      (exo.series || []).forEach(function (s) {
        if (!s.faite || s.echauffement) return;
        numero++;
        nbSeries++;
        tonnage += (s.charge || 0) * (s.reps || 0);
        rangs.push([seance.id, jourTexte, semaine, seance.jour, exo.nom, vide(exo.muscle), numero,
          vide(s.charge), vide(s.reps), vide(s.rir), e1rm(s.charge, s.reps), !!s.restPause,
          !!seance.deload, vide(exo.remplace)]);
      });
    });
    lignes.series = ajouterLignes(ongletPret(classeur, ONGLETS.series), rangs);
  }

  if (seance.type === 'cardio') {
    const rangs = [];
    const cardio = seance.cardio || {};
    Object.keys(cardio).forEach(function (type) {
      (cardio[type] || []).forEach(function (c, i) {
        if (!c || !Object.keys(c).some(function (k) { return c[k] !== null && c[k] !== ''; })) return;
        const allure = c.distance_km && c.duree_min ? Math.round((c.duree_min / c.distance_km) * 100) / 100 : '';
        rangs.push([seance.id, jourTexte, semaine, type, i + 1, vide(c.duree_min), vide(c.distance_km), allure,
          vide(c.calories), vide(c.vitesse_moy_kmh), vide(c.repetitions), vide(c.recup_s), vide(c.pente_pct),
          vide(c.charge_kg), vide(c.duree_seuil_min), vide(c.activite), vide(c.fc_moy), vide(c.fc_max)]);
      });
    });
    nbSeries = rangs.length;
    lignes.course = ajouterLignes(ongletPret(classeur, ONGLETS.course), rangs);
  }

  if (seance.type === 'gainage' && seance.lignesGainage) {
    const rangs = seance.lignesGainage.map(function (l) {
      return [seance.id, jourTexte, semaine, seance.jour, vide(l.categorie), vide(l.mouvement),
        vide(l.serie), vide(l.valeur), vide(l.unite), vide(l.poids)];
    });
    nbSeries = rangs.length;
    lignes.gainage = ajouterLignes(ongletPret(classeur, ONGLETS.gainage), rangs);
  }

  const douleurs = (seance.douleurs || []).map(function (d) { return d.exercice + ' : ' + d.texte; }).join(' | ');
  const ligneSeance = ajouterLignes(ongletPret(classeur, ONGLETS.seances), [[
    seance.id, jourTexte, semaine, seance.jour, vide(seance.nom), seance.type, vide(seance.duree_min),
    nbSeries, tonnage, !!seance.deload, vide(seance.remarque), douleurs,
  ]]);
  lignes.seance = ligneSeance ? ligneSeance[0] : null;

  if (seance.remarque) {
    ongletPret(classeur, ONGLETS.remarques).appendRow([date, seance.jour, seance.remarque]);
  }
  (seance.douleurs || []).forEach(function (d) {
    mettreAJour(classeur, ONGLETS.douleurs, [[d.exercice, jourTexte, seance.jour, d.texte, seance.id]], 2, true);
  });

  marquerEcrite(seance.id, lignes);
  return lignes;
}

/* ---------------- Sommeil, mensurations, programme ---------------- */

function ecrireSommeil(classeur, nuits) {
  const lignes = (nuits || []).filter(function (n) { return n && n.cle; }).map(function (n) {
    const sports = n.sports || {};
    return [n.cle, (n.insomnies || []).length, (n.insomnies || []).join(', '),
      (n.sommeilHorsCoeur || []).join(', '), (n.horsServiceCoeur || []).join(', '),
      (n.raisons || []).join(', '), !!n.alcool, n.cafe || 0, n.pipi || 0, !!n.ecranTard,
      !!n.repasTardif, sports.muscu || '', sports.cardio || sports.footing || ''];
  });
  mettreAJour(classeur, ONGLETS.sommeil, lignes, 1);
}

function ecrireMensuration(classeur, m) {
  if (!m || !m.cle) return;
  const onglet = ongletPret(classeur, ONGLETS.mensurations);
  const derniere = onglet.getLastRow();
  let ligne = null;
  if (derniere > 1) {
    onglet.getRange(2, 1, derniere - 1, 1).getValues().forEach(function (v, i) {
      if (String(v[0]) === m.cle) ligne = 2 + i;
    });
  }
  let lienPhoto = '';
  if (m.photo) {
    try { lienPhoto = enregistrerPhoto(m.cle, m.photo); } catch (e) { lienPhoto = 'Erreur photo : ' + String(e); }
  }
  const valeurs = [m.cle, vide(m.poids), vide(m.poitrine), vide(m.bras), vide(m.taille),
    vide(m.hanches), vide(m.cuisse), vide(m.mollet), lienPhoto];
  if (ligne) {
    if (!m.photo) valeurs.pop();
    onglet.getRange(ligne, 1, 1, valeurs.length).setValues([valeurs]);
  } else {
    onglet.appendRow(valeurs);
  }
}

function enregistrerPhoto(cle, dataUrl) {
  const virgule = dataUrl.indexOf(',');
  const type = (dataUrl.match(/^data:([^;]+);/) || [])[1] || 'image/jpeg';
  const octets = Utilities.base64Decode(dataUrl.slice(virgule + 1));
  const blob = Utilities.newBlob(octets, type, 'mensuration-' + cle.replace(/\//g, '-') + '.jpg');
  const dossiers = DriveApp.getFoldersByName('Muscu v2 - Mensurations');
  const dossier = dossiers.hasNext() ? dossiers.next() : DriveApp.createFolder('Muscu v2 - Mensurations');
  return dossier.createFile(blob).getUrl();
}

/** Sauvegarde du programme courant : l'onglet est reecrit en entier. Ce
 *  n'est pas la source du programme (c'est l'onglet Programme, lu par
 *  outils/importer_programme_v2.py), seulement une copie de ce que le
 *  telephone utilise. */
function ecrireProgramme(classeur, programme) {
  if (!programme || !programme.jours) return;
  const onglet = ongletPret(classeur, ONGLETS.programme);
  const lignes = [];
  programme.jours.forEach(function (j) {
    if (!j.exercices || !j.exercices.length) {
      lignes.push([j.code, j.rang, j.nom, j.type, '', '', '', '', '', '', '', '', '', '', '']);
      return;
    }
    j.exercices.forEach(function (e) {
      lignes.push([j.code, j.rang, j.nom, j.type, e.numero, e.nom, e.series, e.reps_min, e.reps_max,
        (e.rir || []).join(' / '), e.repos_s, vide(e.muscle), vide(e.consigne), vide(e.reglages),
        (e.substituts || []).join('; ')]);
    });
  });
  if (onglet.getLastRow() > 1) onglet.getRange(2, 1, onglet.getLastRow() - 1, onglet.getMaxColumns()).clearContent();
  ajouterLignes(onglet, lignes);
}
