/* Écran Sport (racine) : les jours de la semaine, les séances en cours, et
   l'écran de démarrage (bilan d'entrée, phrase, échauffement). */

function lireSeancesEnCours() {
  const carte = lire(CLES.seances, {});
  return carte && typeof carte === 'object' ? carte : {};
}

function ecrireSeancesEnCours(carte) {
  ecrire(CLES.seances, carte);
}

let seance = null;   // la séance ouverte à l'écran

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

function rendreSport() {
  const corps = $('sport-corps');
  const enCours = lireSeancesEnCours();
  const maintenant = new Date();
  $('sport-sous').textContent = 'Semaine ' + semaineIso(maintenant) + ' · ' +
    maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  let html = '';
  const ouvertes = Object.values(enCours).filter((s) => s && !s.fin);
  if (ouvertes.length) {
    html += '<p class="titre-section">Séances en cours</p><div class="carte">' + ouvertes.map((s) => {
      const jour = jourDe(s.jour);
      return '<div class="rangee"><div class="tx"><b>' + echapper(libelleJour(jour) + ' ' + (jour ? jour.nom : s.jour)) + '</b>' +
        '<span>Commencée ' + ilYA(s.debut) + '</span></div>' +
        '<button class="bouton petit" data-reprendre="' + s.jour + '">Reprendre</button>' +
        '<button class="icone" data-abandonner="' + s.jour + '" aria-label="Abandonner" data-icone="fermer"></button></div>';
    }).join('') + '</div>';
  }

  html += '<p class="titre-section">Cette semaine</p><div class="liste-cartes">';
  const prochain = prochainJour();
  programme.jours.forEach((jour) => {
    const code = codeCanonique(jour.code);
    const commencee = enCours[code] && !enCours[code].fin;
    const retard = retardDuJour(code);
    const frequence = frequenceDuJour(code);
    let detail;
    if (jour.type === 'cardio') detail = 'Course et HIIT';
    else if (jour.type === 'gainage') detail = 'Bonus';
    else detail = (jour.exercices || []).length + ' exercices · ' + musclesDuJour(jour);
    let ligne2 = '';
    if (commencee) ligne2 = '<span class="encours">En cours, commencée ' + ilYA(enCours[code].debut) + '</span>';
    else if (!retard) ligne2 = '<span>Pas encore faite</span>';
    else if (retard.enRetard) ligne2 = '<span class="retard">Dernière fois ' + ilYA(retard.derniere.fin) + ' · en retard</span>';
    else ligne2 = '<span>Dernière fois ' + ilYA(retard.derniere.fin) + (jour.type === 'muscu' && frequence.faites < frequence.sur - 2 && frequence.faites > 0 ? ' · ' + frequence.faites + ' des ' + frequence.sur + ' dernières semaines' : '') + '</span>';
    const estProchain = !ouvertes.length && prochain === jour.code;
    html += '<button class="carte-jour ' + jour.type + (commencee ? ' encours' : '') + (estProchain ? ' prochaine' : '') + '" data-jour="' + jour.code + '">' +
      '<span class="code">' + echapper(libelleJour(jour)) + '</span>' +
      '<span class="tx"><b>' + echapper(jour.nom) + (estProchain ? '<span class="puce accent">Prochaine</span>' : '') + '</b><span>' + echapper(detail) + '</span>' + ligne2 + '</span>' +
      '<span class="chev">' + svgIcone('chevron') + '</span></button>';
  });
  html += '</div>';
  html += '<p style="margin-top:16px;text-align:center"><button class="bouton discret" data-historique>Séances enregistrées</button></p>';
  corps.innerHTML = html;
  poserIcones(corps);

  corps.querySelectorAll('[data-jour]').forEach((b) => b.addEventListener('click', () => commencer(b.dataset.jour)));
  corps.querySelectorAll('[data-reprendre]').forEach((b) => b.addEventListener('click', () => commencer(b.dataset.reprendre)));
  corps.querySelectorAll('[data-abandonner]').forEach((b) => b.addEventListener('click', () => {
    confirmer('Abandonner cette séance ?', 'Les séries saisies seront perdues.', 'Abandonner', () => {
      oublierSeance(b.dataset.abandonner);
      rendreSport();
    }, true);
  }));
  const h = corps.querySelector('[data-historique]');
  if (h) h.addEventListener('click', () => afficher('historique'));
}
rendus.sport = rendreSport;

/* Prochain jour : dans l'ordre de la semaine, le premier jour de
   musculation ou de cardio pas encore fait depuis sa dernière place dans le
   cycle, c'est-à-dire celui qui suit le dernier jour fait ; sans historique,
   le premier. Un seul jour porte la mise en avant. */
function prochainJour() {
  const cycle = programme.jours.filter((j) => j.type !== 'gainage');
  if (!cycle.length) return null;
  const derniere = seancesTerminees().find((s) => s.type !== 'gainage');
  if (!derniere) return cycle[0].code;
  const i = cycle.findIndex((j) => j.code === derniere.jour || codeCanonique(j.code) === codeCanonique(derniere.jour));
  return cycle[(i + 1) % cycle.length].code;
}

function musclesDuJour(jour) {
  const vus = [];
  (jour.exercices || []).forEach((e) => {
    const m = (e.muscle || '').split(/ et |,/)[0].trim().toLowerCase();
    if (m && !vus.includes(m)) vus.push(m);
  });
  return vus.slice(0, 3).join(', ');
}

/* ---------- Démarrage ---------- */

function nouvelleSeance(jour) {
  const s = {
    id: 'S' + Date.now(),
    jour: codeCanonique(jour.code),
    nom: jour.nom,
    type: jour.type,
    debut: new Date().toISOString(),
    fin: null,
    envoye: false,
    deload: false,
    douleurs: [],
    remarque: '',
    exercices: (jour.exercices || []).map((exo) => ({
      numero: exo.numero,
      nom: exo.nom,
      muscle: exo.muscle,
      repos_s: exo.repos_s,
      remplace: null,
      series: Array.from({ length: exo.series || 3 }, (_, i) => ({
        charge: null, reps: null, rir: null, faite: false, heure: null, restPause: false,
        cible: exo.rir && exo.rir.length ? exo.rir[Math.min(i, exo.rir.length - 1)] : null,
      })),
    })),
  };
  if (jour.type === 'cardio') s.cardio = {};
  if (jour.type === 'gainage') {
    s.choix = {};
    s.mouvements = {};
    s.poidsMouvements = {};
    CATEGORIES_GAINAGE.forEach((c) => { s.choix[c.cle] = mouvementParDefaut(c); });
  }
  return s;
}

function commencer(code) {
  const jour = jourDe(code);
  if (!jour) return;
  const enCours = lireSeancesEnCours()[codeCanonique(code)];
  if (enCours && !enCours.fin) {
    seance = enCours;
    ouvrirSeance();
    return;
  }
  seance = nouvelleSeance(jour);
  afficher('demarrage', { parametres: jour });
}

function rendreDemarrage(jour) {
  if (!jour) return;
  $('demarrage-titre').textContent = libelleJour(jour) + ' ' + jour.nom;
  const corps = $('demarrage-corps');
  let html = '<div class="carte"><p class="phrase">' + echapper(phraseOuverture(seance.id)) + '</p></div>';

  // Avertissements du jour : espacement, exercices en recul, douleurs.
  const avert = [];
  const espacement = avertissementEspacement(jour.code);
  if (espacement) avert.push('<div class="alerte attention">' + svgIcone('alerte') + '<div>' + echapper(espacement.texte) + '</div></div>');
  (jour.exercices || []).forEach((e) => {
    const r = reculDouble(e.nom, e);
    if (r) avert.push('<div class="alerte baisse">' + svgIcone('alerte') + '<div><b>' + echapper(e.nom) + '</b> : première série en recul les ' + dateJM(r.dates[0]) + ' et ' + dateJM(r.dates[1]) + '. Vérifie le repos, la technique, le sommeil ; sinon allège la séance qui précède.</div></div>');
    const d = douleursDe(e.nom)[0];
    if (d && joursDepuis(d.date) <= 21) avert.push('<div class="alerte info">' + svgIcone('alerte') + '<div><b>' + echapper(e.nom) + '</b> : douleur notée ' + ilYA(d.date) + ' (' + echapper(d.texte) + ').</div></div>');
  });
  if (avert.length) html += '<div class="liste-cartes" style="margin-top:10px">' + avert.join('') + '</div>';

  // Bilan d'entrée : sommeil de la nuit (déjà saisi), fatigue sur 5.
  if (jour.type === 'muscu') {
    const nuit = (lireTableau(CLES.sommeil) || []).find((n) => n.cle === cleDate(new Date(Date.now() - 86400000)));
    const insomnies = nuit ? (nuit.insomnies || []).length : null;
    html += '<p class="titre-section">Avant de commencer</p><div class="carte">' +
      (insomnies != null ? '<p class="petit texte-2" style="margin-bottom:8px">Nuit dernière : ' + (insomnies ? insomnies + ' créneau' + (insomnies > 1 ? 'x' : '') + ' d\'insomnie' : 'sans insomnie notée') + '.</p>' : '') +
      '<div class="champ"><span>Forme du jour, de 1 (épuisé) à 5 (en pleine forme)</span><div class="echelle" id="demarrage-forme">' +
      [1, 2, 3, 4, 5].map((n) => '<button type="button" data-forme="' + n + '"' + (seance.forme === n ? ' class="choisi"' : '') + '>' + n + '</button>').join('') +
      '</div></div>' +
      '<div class="bascule" style="margin-top:6px"><span>Séance de deload (allégée, hors comparaisons)</span><input type="checkbox" id="demarrage-deload"' + (seance.deload ? ' checked' : '') + '></div>' +
      '<p class="petit texte-2" id="demarrage-conseil"></p></div>';
  }

  const liste = jour.type === 'muscu' ? (ECHAUFFEMENT_PAR_JOUR[jour.code] || []) : [];
  if (liste.length) {
    html += '<p class="titre-section">Échauffement</p><div class="carte"><ul class="echauffement">' +
      liste.map((l) => '<li>' + echapper(l) + '</li>').join('') + montéeEnCharge(jour) + '</ul></div>';
  }
  html += '<div class="pied-fixe"><button class="bouton primaire large" id="demarrage-commencer">Commencer</button></div>';
  corps.innerHTML = html;
  poserIcones(corps);

  const conseil = $('demarrage-conseil');
  const majConseil = () => {
    if (!conseil) return;
    const nuit = insomniesDeLaNuit();
    const mauvais = (seance.forme != null && seance.forme <= 2 ? 1 : 0) + (nuit != null && nuit >= 3 ? 1 : 0);
    conseil.textContent = mauvais >= 2 && !seance.deload
      ? 'Forme basse et mauvaise nuit : une séance de deload (charges à 70 %, séries à RIR 3) vaut mieux qu\'une séance ratée.'
      : (seance.forme != null && seance.forme <= 2 ? 'Forme basse : garde les charges de la dernière fois sans chercher à monter.' : '');
  };
  corps.querySelectorAll('[data-forme]').forEach((b) => b.addEventListener('click', () => {
    seance.forme = Number(b.dataset.forme);
    corps.querySelectorAll('[data-forme]').forEach((x) => x.classList.toggle('choisi', x === b));
    majConseil();
  }));
  const deload = $('demarrage-deload');
  if (deload) deload.addEventListener('change', () => { seance.deload = deload.checked; majConseil(); });
  majConseil();
  $('demarrage-commencer').addEventListener('click', () => {
    enregistrerSeance();
    ouvrirSeance({ remplacer: true });
  });
}
rendus.demarrage = rendreDemarrage;

function insomniesDeLaNuit() {
  const nuit = (lireTableau(CLES.sommeil) || []).find((n) => n.cle === cleDate(new Date(Date.now() - 86400000)));
  return nuit ? (nuit.insomnies || []).length : null;
}

/* Montée en charge chiffrée sur le premier exercice, depuis la dernière
   fois : 50 % puis 75 % de la charge de travail. */
function montéeEnCharge(jour) {
  const premier = (jour.exercices || [])[0];
  if (!premier) return '';
  const derniere = derniereFois(premier.nom);
  if (!derniere) return '';
  const charge = derniere.series[0].charge;
  const arrondi = (x) => Math.round(x / 2.5) * 2.5;
  return '<li>' + echapper(premier.nom) + ' : 8 répétitions à ' + formatNombre(arrondi(charge * 0.5)) + ' kg, puis 4 à ' + formatNombre(arrondi(charge * 0.75)) + ' kg</li>';
}

function ouvrirSeance(options) {
  if (seance.type === 'cardio') afficher('seance', Object.assign({ parametres: 'cardio' }, options || {}));
  else if (seance.type === 'gainage') afficher('seance', Object.assign({ parametres: 'gainage' }, options || {}));
  else afficher('seance', Object.assign({ parametres: 'muscu' }, options || {}));
}
