/* Suivi de séance. Tout se joue hors ligne : le téléphone est la mémoire de
   référence pendant l'entraînement, le classeur n'est prévenu qu'à la fin.
   Aucune saisie ne dépend du réseau, qui est mauvais dans la plupart des salles. */

'use strict';

const CLES = {
  seance: 'muscu.seance',
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

/* Repères de saisie des jours de footing. Le classeur ne retient que le temps
   et la distance : on s'en tient là plutôt que d'inventer des champs (allure,
   fréquence cardiaque) qu'il n'attend pas et que le pont ne saurait ranger. */
const CHAMPS_FOOTING = [
  { cle: 'duree_min', libelle: 'Durée (min)', unite: 'min' },
  { cle: 'distance_km', libelle: 'Distance (km)', unite: 'km' },
];

let programme = null;
let seance = null;       // séance en cours, ou null
let reglages = lire(CLES.reglages, REGLAGES_PAR_DEFAUT);
let indexExo = 0;
let minuterie = null;    // { fin: ms, duree: s, libelle: string }
let tictac = null;
let tictacChrono = null;  // rafraîchit le chronomètre des jours de footing
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

function enregistrerSeance() {
  if (seance) ecrire(CLES.seance, seance);
  else localStorage.removeItem(CLES.seance);
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

  programme.jours.forEach((jour) => {
    const item = document.createElement('li');
    const bouton = document.createElement('button');
    bouton.className = 'carte-jour';

    const titre = jour.titre.replace(/^J\d\s*/, '').replace(/^-\s*/, '');
    const [nom, ...reste] = titre.split(/\s+-\s+/);

    if (jour.type === 'footing') {
      const derniere = derniereSeanceDuJour(jour.code);
      bouton.innerHTML =
        '<div class="carte-code">' + jour.code + '</div>' +
        '<div class="carte-nom">' + echapper(nom || 'Footing') + '</div>' +
        '<div class="carte-detail">Durée et distance' +
        (derniere ? '<br>Dernière : ' + ilYA(derniere.fin) : '') +
        '</div>';
      bouton.addEventListener('click', () => commencer(jour.code));
    } else {
      const derniere = derniereSeanceDuJour(jour.code);
      bouton.innerHTML =
        '<div class="carte-code">' + jour.code + '</div>' +
        '<div class="carte-nom">' + echapper(nom) + '</div>' +
        '<div class="carte-detail">' +
        jour.exercices.length + ' exercices' +
        (reste.length ? ' &middot; ' + echapper(reste.join(' ')) : '') +
        (derniere ? '<br>Dernière : ' + ilYA(derniere.fin) : '') +
        '</div>';
      bouton.addEventListener('click', () => commencer(jour.code));
    }

    item.appendChild(bouton);
    liste.appendChild(item);
  });

  const enCours = lire(CLES.seance, null);
  if (enCours && enCours.jour && !enCours.fin) {
    $('reprise').hidden = false;
    $('reprise-jour').textContent = enCours.jour;
    $('reprise-quand').textContent = ilYA(enCours.debut);
  } else {
    $('reprise').hidden = true;
  }

  rendreEtatSync();
}

function derniereSeanceDuJour(code) {
  return lireTableau(CLES.historique)
    .filter((s) => s.jour === code && s.fin)
    .sort((a, b) => new Date(b.fin) - new Date(a.fin))[0] || null;
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

function commencer(code) {
  const jour = jourDe(code);
  if (!jour) return;

  seance = {
    id: 'S' + Date.now(),
    jour: code,
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
  if (jour.type === 'footing') seance.footing = { duree_min: null, distance_km: null };
  indexExo = 0;
  enregistrerSeance();
  demanderVeille();
  afficher('seance');
  if (jour.type === 'footing') rendreFooting();
  else rendreExercice();
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

function reprendre() {
  seance = lire(CLES.seance, null);
  if (!seance) return;
  demanderVeille();
  afficher('seance');

  if (estFooting()) {
    // Un chrono laissé en marche continue de courir : il compte depuis son
    // horodatage de départ, l'application fermée entre-temps n'y change rien.
    if (seance.footing.chrono && seance.footing.chrono.demarre && !tictacChrono) {
      tictacChrono = setInterval(majChrono, 500);
    }
    rendreFooting();
    return;
  }

  indexExo = seance.exercices.findIndex((e) => e.series.some((s) => !s.faite));
  if (indexExo < 0) indexExo = seance.exercices.length - 1;
  rendreExercice();
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

function rendreFooting() {
  const jour = jourDe(seance.jour);
  $('bloc-muscu').hidden = true;
  $('bloc-footing').hidden = false;
  $('bouton-precedent').hidden = true;
  $('bouton-suivant').hidden = true;

  $('seance-jour').textContent = jour.titre.split(/\s+-\s+/)[0];
  $('seance-progression').textContent = '';
  $('footing-nom').textContent = jour.titre.replace(/^J\d\s*/, '');

  const champs = $('footing-champs');
  champs.innerHTML = '';
  CHAMPS_FOOTING.forEach((definition) => {
    const etiquette = document.createElement('label');
    const titre = document.createElement('span');
    titre.textContent = definition.libelle;

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    const valeur = seance.footing[definition.cle];
    input.value = valeur === null || valeur === undefined ? '' : String(valeur);
    input.addEventListener('focus', () => input.select());
    input.addEventListener('input', () => {
      seance.footing[definition.cle] = nombreOuNull(input.value);
      enregistrerSeance();
      majAllure();
    });

    etiquette.append(titre, input);
    champs.appendChild(etiquette);
  });

  majChrono();
  majAllure();
}

/* L'allure au kilomètre est le repère habituel du coureur, plus parlant que
   la vitesse en km/h : on la calcule dès que durée et distance sont saisies. */
function majAllure() {
  const { duree_min: duree, distance_km: distance } = seance.footing;
  const cible = $('footing-allure');

  if (!duree || !distance) {
    cible.textContent = '';
    $('footing-compare').textContent = '';
    return;
  }

  const allure = duree / distance;
  const minutes = Math.floor(allure);
  const secondes = Math.round((allure - minutes) * 60);
  cible.textContent = 'Allure ' + minutes + ':' + String(secondes).padStart(2, '0') + ' / km';

  const precedente = derniereSeanceDuJour(seance.jour);
  const compare = $('footing-compare');
  compare.className = 'compare';
  if (!precedente || !precedente.footing || !precedente.footing.duree_min || !precedente.footing.distance_km) {
    compare.textContent = '';
    return;
  }
  const allureAvant = precedente.footing.duree_min / precedente.footing.distance_km;
  const ecart = allure - allureAvant;
  const ecartSecondes = Math.round(Math.abs(ecart) * 60);
  if (ecartSecondes < 3) {
    compare.textContent = 'Même allure que la dernière fois.';
    return;
  }
  // Une allure plus basse est plus rapide : le sens de la couleur s'inverse.
  compare.textContent = ecartSecondes + ' s/km ' + (ecart < 0 ? 'plus rapide' : 'plus lent') + " qu'à la dernière sortie.";
  compare.classList.add(ecart < 0 ? 'hausse' : 'baisse');
}

function majChrono() {
  const affichage = $('chrono-affichage');
  const chrono = seance.footing.chrono;
  const enCours = chrono && chrono.demarre;
  const ecoule = chrono
    ? (chrono.cumul || 0) + (enCours ? Date.now() - chrono.demarre : 0)
    : 0;

  affichage.textContent = texteDuree(ecoule / 1000);
  affichage.classList.toggle('en-cours', !!enCours);
  $('chrono-demarrer').textContent = enCours ? 'Arrêter' : (ecoule ? 'Reprendre' : 'Démarrer');
}

function basculerChrono() {
  if (!seance.footing.chrono) seance.footing.chrono = { cumul: 0, demarre: null };
  const chrono = seance.footing.chrono;

  if (chrono.demarre) {
    chrono.cumul = (chrono.cumul || 0) + (Date.now() - chrono.demarre);
    chrono.demarre = null;
    // Le chrono renseigne la durée, mais n'écrase jamais une saisie manuelle
    // par une poignée de secondes : sans ce garde-fou, un démarrage
    // accidentel suivi d'un arrêt effacerait une durée déjà notée à la main.
    const minutes = Math.round((chrono.cumul / 60000) * 10) / 10;
    if (minutes >= 1 || !seance.footing.duree_min) seance.footing.duree_min = minutes;
    rendreFooting();
  } else {
    chrono.demarre = Date.now();
    if (!tictacChrono) tictacChrono = setInterval(majChrono, 500);
    majChrono();
  }
  enregistrerSeance();
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
  const arreter = $('chrono-seance-arreter');
  const ecoule = dureeSeanceMs();

  demarrer.classList.toggle('tourne', !!chrono.demarre);
  $('chrono-seance-temps').textContent = ecoule ? texteDuree(ecoule / 1000) : '';
  demarrer.querySelector('.chrono-seance-icone').innerHTML = chrono.demarre ? '&#10073;&#10073;' : '&#9654;';

  // Le bouton rouge n'apparaît que sur le dernier exercice, là où l'on est
  // censé conclure : ailleurs, l'arrêt serait presque toujours une erreur.
  const dernier = indexExo === seance.exercices.length - 1;
  arreter.hidden = !(dernier && (chrono.demarre || chrono.cumul));
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
  // Ordre réel de navigation au clavier (touche Entrée du pavé numérique) :
  // les trois champs de chaque ligne puis son bouton de validation, ligne
  // après ligne. Un bouton, une fois focus, répond nativement à Entrée.
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

    const champReps = champ(serie.reps, reference ? reference.reps : null, 'reps', (v) => {
      serie.reps = v;
      enregistrerSeance();
      majTonnage();
      appliquerCouleurTonnage(ligne, serie, reference);
    });

    const champRir = champ(serie.rir, reference ? reference.rir : null, 'RIR', (v) => {
      serie.rir = v;
      enregistrerSeance();
    });

    // Un appui bref valide la série ; un appui long la bascule en
    // échauffement, ce qui l'exclut du tonnage et de la comparaison. Sans
    // colonne dédiée pour le numéro, c'est le seul geste qui reste pour ça.
    const valider = document.createElement('button');
    valider.className = 'valider';
    valider.type = 'button';
    valider.innerHTML = serie.echauffement ? 'ÉCH' : (serie.faite ? '&#10003;' : '&#9675;');
    valider.setAttribute('aria-label', serie.faite ? 'Annuler la série' : 'Valider la série (appui long : échauffement)');

    let minuterieAppuiLong = null;
    let appuiLongDeclenche = false;
    const annulerAppuiLong = () => clearTimeout(minuterieAppuiLong);
    valider.addEventListener('pointerdown', () => {
      appuiLongDeclenche = false;
      minuterieAppuiLong = setTimeout(() => {
        appuiLongDeclenche = true;
        serie.echauffement = !serie.echauffement;
        enregistrerSeance();
        rendreSeries();
      }, 500);
    });
    valider.addEventListener('pointerup', annulerAppuiLong);
    valider.addEventListener('pointerleave', annulerAppuiLong);
    valider.addEventListener('click', () => {
      if (appuiLongDeclenche) return;
      basculerSerie(courant, serie, index);
    });

    ligne.append(champCharge, champReps, champRir, valider);
    liste.appendChild(ligne);
    enchainement.push(champCharge, champReps, champRir, valider);
  });

  enchainement.forEach((element, position) => {
    if (element.tagName !== 'INPUT') return;
    element.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Enter') return;
      evenement.preventDefault();
      const suivant = enchainement[position + 1];
      if (!suivant) return;
      if (suivant.tagName === 'INPUT') {
        suivant.focus();
        suivant.select();
      } else {
        // Après le RIR, le "suivant" est le bouton de validation : le
        // clavier virtuel ne réappuie pas tout seul sur Entrée une fois le
        // focus déplacé, donc valider directement plutôt que de se
        // contenter du focus, sans quoi la récupération ne démarre jamais.
        suivant.click();
      }
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

function basculerSerie(exercice, serie, index) {
  if (serie.faite) {
    serie.faite = false;
    enregistrerSeance();
    rendreSeries();
    rendreJauge();
    return;
  }

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
  rendreSeries();
  rendreJauge();

  const fiche = ficheExercice();
  if (!serie.echauffement || fiche.repos_s) {
    lancerMinuterie(fiche.repos_s || 90, exercice, index);
  }
}

function rendreJauge() {
  $('jauge-remplie').style.width = (100 * proportionFaite()) + '%';
}

/* --------------------------------------------------------------- minuterie */

function lancerMinuterie(secondes, exercice, indexSerie) {
  const restantes = exercice.series.length - (indexSerie + 1);
  minuterie = {
    fin: Date.now() + secondes * 1000,
    duree: secondes,
    libelle: restantes > 0
      ? 'Ensuite : série ' + (indexSerie + 2) + ' sur ' + exercice.series.length
      : 'Dernière série de ' + exercice.nom,
    sonne: false,
  };
  $('minuterie').hidden = false;
  battre();
  if (tictac) clearInterval(tictac);
  tictac = setInterval(battre, 250);
}

function battre() {
  if (!minuterie) return;
  const restant = (minuterie.fin - Date.now()) / 1000;
  const chiffres = $('minuterie-chiffres');

  if (restant <= 0) {
    chiffres.textContent = '+' + texteDuree(-restant);
    chiffres.classList.add('ecoule');
    $('minuterie-suite').textContent = minuterie.libelle + ' &middot; prêt';
    if (!minuterie.sonne) {
      minuterie.sonne = true;
      signaler();
    }
  } else {
    chiffres.textContent = texteDuree(restant);
    chiffres.classList.remove('ecoule');
    $('minuterie-suite').textContent = minuterie.libelle;
  }
}

function arreterMinuterie() {
  minuterie = null;
  if (tictac) clearInterval(tictac);
  tictac = null;
  $('minuterie').hidden = true;
  $('minuterie-chiffres').classList.remove('ecoule');
}

function signaler() {
  if (reglages.vibration && navigator.vibrate) navigator.vibrate([180, 90, 180]);
  if (!reglages.son) return;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    [0, 0.22, 0.44].forEach((decalage) => {
      const oscillateur = audio.createOscillator();
      const volume = audio.createGain();
      oscillateur.frequency.value = 880;
      oscillateur.connect(volume);
      volume.connect(audio.destination);
      const debut = audio.currentTime + decalage;
      volume.gain.setValueAtTime(0.0001, debut);
      volume.gain.exponentialRampToValueAtTime(0.3, debut + 0.02);
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

  $('fin-message').textContent = '';
  $('fin-message').className = 'message';
  $('bouton-enregistrer').disabled = false;
  afficher('fin');
}

function terminerFooting(resume) {
  // Un chrono encore en marche est arrêté ici, sinon la durée resterait celle
  // du dernier arrêt volontaire et perdrait toute la fin de la sortie.
  const chrono = seance.footing.chrono;
  if (chrono && chrono.demarre) basculerChrono();
  if (tictacChrono) { clearInterval(tictacChrono); tictacChrono = null; }

  const { duree_min: duree, distance_km: distance } = seance.footing;
  let allureTexte = '&mdash;';
  if (duree && distance) {
    const allure = duree / distance;
    allureTexte = Math.floor(allure) + ':' + String(Math.round((allure - Math.floor(allure)) * 60)).padStart(2, '0');
  }

  resume.innerHTML =
    '<h3>' + echapper(seance.titre.split(/\s+-\s+/)[0]) + '</h3>' +
    '<div class="chiffres">' +
      '<div class="chiffre"><b>' + (duree || 0) + '</b><span>minutes</span></div>' +
      '<div class="chiffre"><b>' + (distance || 0) + '</b><span>km</span></div>' +
      '<div class="chiffre"><b>' + allureTexte + '</b><span>min / km</span></div>' +
    '</div>';

  if (!duree && !distance) {
    resume.innerHTML += '<p class="vide">Ni durée ni distance saisies.</p>';
  }

  $('fin-message').textContent = '';
  $('fin-message').className = 'message';
  $('bouton-enregistrer').disabled = false;
  afficher('fin');
}

function enregistrerEtSynchroniser() {
  seance.fin = new Date().toISOString();
  const historique = lireTableau(CLES.historique).filter((s) => s.id !== seance.id);
  historique.push(seance);
  ecrire(CLES.historique, historique);

  localStorage.removeItem(CLES.seance);
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
    if (s.type === 'footing' && s.footing) {
      const morceaux = [];
      if (s.footing.duree_min) morceaux.push(s.footing.duree_min + ' min');
      if (s.footing.distance_km) morceaux.push(s.footing.distance_km + ' km');
      details = morceaux.length ? morceaux.join(', ') : 'Sortie sans chiffres';
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
  $('bouton-reprendre').addEventListener('click', reprendre);
  $('bouton-abandonner').addEventListener('click', () => {
    if (!confirm('Abandonner la séance en cours ? Les séries saisies seront perdues.')) return;
    localStorage.removeItem(CLES.seance);
    seance = null;
    rendreAccueil();
  });

  $('bouton-quitter').addEventListener('click', () => {
    arreterMinuterie();
    relacherVeille();
    rendreAccueil();
    afficher('accueil');
  });

  $('bouton-terminer').addEventListener('click', terminer);
  $('chrono-seance-demarrer').addEventListener('click', basculerChronoSeance);
  $('chrono-seance-arreter').addEventListener('click', arreterChronoSeance);
  $('chrono-demarrer').addEventListener('click', basculerChrono);
  $('chrono-remettre').addEventListener('click', () => {
    if (!confirm('Remettre le chronomètre à zéro ?')) return;
    seance.footing.chrono = { cumul: 0, demarre: null };
    seance.footing.duree_min = null;
    if (tictacChrono) { clearInterval(tictacChrono); tictacChrono = null; }
    enregistrerSeance();
    rendreFooting();
  });
  $('bouton-consigne-modifier').addEventListener('click', modifierConsigne);
  $('bouton-consigne-annuler').addEventListener('click', quitterEditionConsigne);
  $('bouton-consigne-enregistrer').addEventListener('click', enregistrerEditionConsigne);
  $('bouton-precedent').addEventListener('click', () => {
    if (indexExo > 0) { indexExo--; arreterMinuterie(); rendreExercice(); }
  });
  $('bouton-suivant').addEventListener('click', () => {
    if (indexExo < seance.exercices.length - 1) { indexExo++; arreterMinuterie(); rendreExercice(); }
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

  $('minuterie-passer').addEventListener('click', arreterMinuterie);
  $('minuterie-plus').addEventListener('click', () => {
    if (minuterie) { minuterie.fin += 15000; minuterie.sonne = false; battre(); }
  });
  $('minuterie-moins').addEventListener('click', () => {
    if (minuterie) { minuterie.fin -= 15000; battre(); }
  });

  $('bouton-enregistrer').addEventListener('click', enregistrerEtSynchroniser);
  $('bouton-fin-retour').addEventListener('click', () => { afficher('seance'); rendreExercice(); });

  $('bouton-reglages').addEventListener('click', () => { rendreReglages(); afficher('reglages'); });
  $('bouton-reglages-retour').addEventListener('click', () => {
    sauverReglages();
    rendreAccueil();
    afficher('accueil');
    // Quitter les réglages après y avoir renseigné le pont doit suffire à
    // vider ce qui attendait, sans obliger à passer par "Tester le pont".
    if (reglages.pont) synchroniser().then(rendreEtatSync).catch(() => {});
  });
  ['reglage-pont', 'reglage-secret', 'reglage-son', 'reglage-vibration', 'reglage-veille']
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
