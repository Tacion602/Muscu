/* Séance de musculation : fiche d'exercice, séries, RIR, objectif,
   minuterie de repos, fin de séance. Les comportements éprouvés en salle de
   la v1 sont conservés (voir CLAUDE.md) : les répétitions valident la
   série à la confirmation du champ, le clavier est amorcé avant tout
   rendu, la dernière série passe à l'exercice suivant, la minuterie
   appartient à la série finie. */

let indexExo = 0;
let minuterie = null;
let tictac = null;
let alternanceSchema = null;
let chronoTictac = null;
let confirmationEnCours = false;

function rendreSeance(mode) {
  if (!seance) { return; }
  $('repos-flottant').hidden = true;   // sans attendre le tic de battre()
  if (seance.type === 'cardio') { rendreCardio(); return; }
  if (seance.type === 'gainage') { rendreGainage(); return; }
  // `mode` n'est passé qu'à l'ouverture (voir ouvrirSeance) : on repart à
  // l'exercice où la saisie s'était arrêtée. Un retour depuis l'écran de
  // fin garde l'exercice regardé.
  if (mode) indexExo = positionDeReprise();
  demarrerChronoSeance();
  rendreExercice();
}
rendus.seance = rendreSeance;

function positionDeReprise() {
  const i = seance.exercices.findIndex((e) => e.series.some((s) => !s.faite));
  return i < 0 ? 0 : i;
}

function ficheExercice() {
  const exo = seance.exercices[indexExo];
  return ficheDuProgramme(exo.nom) || { nom: exo.nom, series: exo.series.length, reps_min: null, reps_max: null, rir: [], repos_s: exo.repos_s, muscle: exo.muscle, consigne: '' };
}

/* ---------- Chrono de séance ---------- */

function demarrerChronoSeance() {
  if (!seance.chrono) seance.chrono = { debut: Date.now(), fin: null };
  if (chronoTictac) clearInterval(chronoTictac);
  majChrono();
  chronoTictac = setInterval(majChrono, 1000);
}

function majChrono() {
  if (!seance || !seance.chrono) return;
  const fin = seance.chrono.fin || Date.now();
  $('seance-chrono').textContent = texteDuree((fin - seance.chrono.debut) / 1000);
}

function dureeSeanceMin() {
  if (seance.chrono) return Math.round(((seance.chrono.fin || Date.now()) - seance.chrono.debut) / 60000);
  return Math.round((Date.now() - new Date(seance.debut).getTime()) / 60000);
}

/* ---------- Fiche d'exercice ---------- */

function rendreExercice() {
  const exo = seance.exercices[indexExo];
  const fiche = ficheExercice();
  const jour = jourDe(seance.jour);
  $('seance-titre').innerHTML = echapper(libelleJour(jour) + ' ' + seance.nom) +
    '<span class="sous">Exercice ' + (indexExo + 1) + ' sur ' + seance.exercices.length + '</span>';
  rendreJauge();

  const derniere = derniereFois(exo.nom, seance.id);
  const objectif = seance.deload ? null : objectifExercice(fiche, derniere);
  const corps = $('seance-corps');
  const info = IMAGES_EXERCICES[exo.nom] || IMAGES_EXERCICES[Object.keys(IMAGES_EXERCICES).find((k) => memeExercice(k, exo.nom))];
  const douleur = douleursDe(exo.nom)[0];

  let html = '<div class="minuterie" id="minuterie-bandeau" hidden><div><div class="l">Repos</div><div class="l" id="minuterie-bandeau-l"></div></div><div class="t num" id="minuterie-bandeau-t"></div></div>';
  html += '<div class="carte">' +
    '<div class="exo-entete"><div><h3>' + echapper(exo.nom) + '</h3><div class="exo-muscle">' + echapper(exo.muscle || '') +
    (fiche.series ? ' · ' + fiche.series + ' × ' + fiche.reps_min + '-' + fiche.reps_max : '') +
    (fiche.rir && fiche.rir.length ? ' · RIR ' + fiche.rir.join('/') : '') + ' · repos ' + texteDuree(exo.repos_s || 90) + '</div></div>' +
    '<button class="icone" id="exo-menu" aria-label="Autres actions" data-icone="liste"></button></div>';
  if (exo.remplace) html += '<p class="petit texte-2" style="margin-top:6px">Remplace ' + echapper(exo.remplace) + ' pour cette séance.</p>';
  if (seance.deload) html += '<p class="puce attention" style="margin-top:8px">Deload : charges à 70 %, hors comparaisons</p>';
  else if (objectif) {
    html += '<div class="objectif' + (objectif.monte ? ' monte' : '') + '"><div><div class="petit texte-2">Objectif 1re série</div><div class="val num">' + formatNombre(objectif.charge) + '<small>kg × ' + objectif.reps + '</small></div></div><div class="why">' + echapper(objectif.raison) + '</div></div>';
  } else if (!derniere) {
    html += '<p class="petit texte-2" style="margin-top:8px">Première fois : choisis une charge qui laisse ' + (fiche.rir && fiche.rir.length ? fiche.rir[0] : 2) + ' répétitions en réserve.</p>';
  }
  if (info) {
    html += '<div class="exo-image"><img id="exo-image" alt="' + echapper(exo.nom) + '">' +
      (info.generique ? '<span class="puce generique">Illustration approchée</span>' : '') +
      (info.schema ? '<span class="credit">Everkinetic, CC BY-SA 4.0</span>' : '') + '</div>';
  }
  html += '<div class="exo-details">';
  const consigne = consigneAffichee(seance.jour, exo.nom, fiche.consigne);
  html += '<button class="ligne-detail" id="exo-consigne"><span class="cle">Consigne</span><span class="val">' + (consigne ? echapper(consigne) : '<span class="texte-3">Ajouter une consigne</span>') + '</span></button>';
  const regl = reglagesMachine(exo.nom);
  html += '<button class="ligne-detail" id="exo-reglages"><span class="cle">Machine</span><span class="val">' + (regl ? '<b>' + echapper(regl) + '</b>' : '<span class="texte-3">Siège, dossier, position</span>') + '</span></button>';
  if (derniere && !objectif) html += '<div class="ligne-detail"><span class="cle">Dernière fois</span><span class="val num">' + ilYA(derniere.quand) + ' : ' + derniere.series.map((s) => formatNombre(s.charge) + '×' + s.reps + (s.rir != null ? ' @' + s.rir : '')).join(' · ') + '</span></div>';
  html += '</div></div>';

  html += '<div class="carte" style="margin-top:10px"><div class="entete-series"><span></span><span>kg</span><span>reps</span><span>RIR</span></div><div id="series"></div>' +
    '<div class="comparaison" id="comparaison"></div>' +
    '<div class="actions-serie"><button class="bouton petit" id="ajouter-serie">+ Série</button><button class="bouton petit" id="retirer-serie">− Série</button><button class="bouton petit" id="rp-serie" aria-pressed="false" aria-label="Rest-pause sur la série en cours">RP</button><button class="bouton petit" id="douleur-exo">Douleur</button><button class="bouton petit" id="chrono-exo" aria-label="Lancer un repos sans valider de série">Chrono</button></div></div>';
  if (douleur && joursDepuis(douleur.date) <= 60) html += '<div class="alerte baisse" style="margin-top:10px">' + svgIcone('alerte') + '<div>' + echapper(douleur.texte) + ' : douleur notée ' + ilYA(douleur.date) + ' sur cet exercice.</div></div>';
  html += '<div class="nav-exo">' +
    '<button class="bouton" id="exo-precedent"' + (indexExo === 0 ? ' disabled' : '') + '>Précédent</button>' +
    (indexExo < seance.exercices.length - 1 ? '<button class="bouton" id="exo-suivant">Suivant</button>' : '<button class="bouton primaire" id="exo-terminer">Terminer</button>') +
    '</div>';
  corps.innerHTML = html;
  poserIcones(corps);

  rendreImageExercice(exo.nom, info);
  rendreSeries();
  rendreBandeauMinuterie();

  $('exo-menu').addEventListener('click', menuExercice);
  $('exo-consigne').addEventListener('click', () => saisir('Consigne technique', consigne, 'Enregistrer', (t) => { enregistrerConsigne(seance.jour, exo.nom, t); rendreExercice(); }, true));
  $('exo-reglages').addEventListener('click', () => saisir('Réglages de la machine', regl, 'Enregistrer', (t) => { enregistrerReglagesMachine(exo.nom, t); rendreExercice(); }));
  $('ajouter-serie').addEventListener('click', () => {
    exo.series.push({ charge: null, reps: null, rir: null, faite: false, heure: null, restPause: false, cible: fiche.rir && fiche.rir.length ? fiche.rir[fiche.rir.length - 1] : null });
    enregistrerSeance();
    rendreSeries();
  });
  // Retire la dernière série non faite (ou la dernière tout court s'il
  // n'en reste pas), sans confirmation : rien n'est encore synchronisé.
  $('retirer-serie').addEventListener('click', () => {
    if (exo.series.length <= 1) return;
    let i = exo.series.length - 1;
    while (i > 0 && exo.series[i].faite) i--;
    exo.series.splice(i, 1);
    enregistrerSeance(); rendreSeries(); rendreJauge();
  });
  // Rest-pause : marque la série en cours (ou la dernière faite si tout est fait).
  $('rp-serie').addEventListener('click', () => {
    const i = exo.series.findIndex((x) => !x.faite);
    const serie = exo.series[i >= 0 ? i : exo.series.length - 1];
    serie.restPause = !serie.restPause;
    enregistrerSeance(); rendreSeries();
  });
  // Repos lancé à la main, sans valider de série : entre les deux côtés
  // d'un unilatéral, après une série d'échauffement (remarque du
  // 5 novembre 2026). Durée du repos de l'exercice, réglable par ±15 s.
  $('chrono-exo').addEventListener('click', () => lancerMinuterie(exo.repos_s || 90, null));
  $('douleur-exo').addEventListener('click', () => saisir('Douleur sur ' + exo.nom, '', 'Noter', (t) => {
    if (!douleurValable(t)) { toast('Décris la douleur en quelques mots (où, à quel moment).', 3500); return; }
    ajouterDouleur(exo.nom, t, seance.id, seance.jour);
    seance.douleurs = seance.douleurs || [];
    seance.douleurs.push({ exercice: exo.nom, texte: t });
    enregistrerSeance();
    rendreExercice();
    toast('Douleur notée, rappelée la prochaine fois.');
  }, true));
  const prec = $('exo-precedent');
  const suiv = $('exo-suivant');
  const term = $('exo-terminer');
  [prec, suiv].forEach((b) => b && b.addEventListener('pointerdown', () => { b.dataset.depuis = indexExo; }));
  if (prec) prec.addEventListener('click', () => { amorcerClavier(); indexExo = Math.max(0, Number(prec.dataset.depuis != null ? prec.dataset.depuis : indexExo) - 1); rendreExercice(); focaliserProchaineSerie(); });
  if (suiv) suiv.addEventListener('click', () => { amorcerClavier(); indexExo = Math.min(seance.exercices.length - 1, Number(suiv.dataset.depuis != null ? suiv.dataset.depuis : indexExo) + 1); rendreExercice(); focaliserProchaineSerie(); });
  if (term) term.addEventListener('click', terminer);
}

function rendreJauge() {
  let poids = 0, fait = 0;
  seance.exercices.forEach((e) => e.series.forEach((s) => {
    const p = Math.max(30, e.repos_s || 60);
    poids += p; if (s.faite) fait += p;
  }));
  $('seance-progression').style.width = (poids ? Math.round((fait / poids) * 100) : 0) + '%';
}

function rendreImageExercice(nom, info) {
  if (alternanceSchema) { clearInterval(alternanceSchema); alternanceSchema = null; }
  if (!info) return;
  const image = $('exo-image');
  if (!image) return;
  if (!info.schema) { image.src = info.fichier.startsWith('../') ? info.fichier : '../images-exercices/' + info.fichier; return; }
  const poses = ['relaxation', 'tension'].map((p) => '../images-exercices/schemas/' + info.schema + '-' + p + '.svg');
  let i = 0;
  image.src = poses[0];
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  alternanceSchema = setInterval(() => {
    if (!image.isConnected) { clearInterval(alternanceSchema); alternanceSchema = null; return; }
    i = 1 - i; image.src = poses[i];
  }, 1000);
}

/* ---------- Menu de l'exercice : remplacer, déplacer ---------- */

function menuExercice() {
  const exo = seance.exercices[indexExo];
  feuille('<h3>' + echapper(exo.nom) + '</h3><div class="liste-choix">' +
    '<button data-action="remplacer">Remplacer par un autre exercice<span>Machine occupée, douleur</span></button>' +
    '<button data-action="retablir"' + (exo.remplace ? '' : ' hidden') + '>Revenir à ' + echapper(exo.remplace || '') + '</button>' +
    '<button data-action="sauter">Passer cet exercice aujourd\'hui<span>Reste dans la séance, sans série</span></button>' +
    '</div>', (f, fermer) => {
    f.querySelector('[data-action="remplacer"]').addEventListener('click', () => { fermer(); choisirRemplacant(); });
    f.querySelector('[data-action="retablir"]').addEventListener('click', () => {
      fermer();
      exo.nom = exo.remplace; exo.remplace = null;
      exo.series.forEach((s) => { if (!s.faite) { s.charge = null; s.reps = null; } });
      enregistrerSeance(); rendreExercice();
    });
    f.querySelector('[data-action="sauter"]').addEventListener('click', () => {
      fermer();
      if (indexExo < seance.exercices.length - 1) { indexExo++; rendreExercice(); } else terminer();
    });
  });
}

/* Remplacement en séance : les substituts du programme d'abord, puis les
   autres exercices du même muscle, puis tout le catalogue. L'identité par
   nom est préservée : un nom choisi ici retrouve son propre historique. */
function choisirRemplacant() {
  const exo = seance.exercices[indexExo];
  const fiche = ficheExercice();
  const muscle = formeDuNom(exo.muscle);
  const candidats = [];
  (fiche.substituts || []).forEach((n) => candidats.push({ nom: n, raison: 'substitut prévu' }));
  programme.jours.forEach((j) => (j.exercices || []).forEach((e) => {
    if (memeExercice(e.nom, exo.nom) || candidats.some((c) => memeExercice(c.nom, e.nom))) return;
    if (formeDuNom(e.muscle) === muscle) candidats.push({ nom: e.nom, raison: e.muscle });
  }));
  nomsConnus().forEach((n) => {
    if (!memeExercice(n, exo.nom) && !candidats.some((c) => memeExercice(c.nom, n))) candidats.push({ nom: n, raison: 'déjà fait' });
  });
  feuille('<h3>Remplacer ' + echapper(exo.nom) + '</h3><div class="liste-choix">' +
    candidats.map((c, i) => '<button data-i="' + i + '">' + echapper(c.nom) + '<span>' + echapper(c.raison) + '</span></button>').join('') +
    '<button data-i="-1">Autre exercice<span>Saisir un nom</span></button></div>', (f, fermer) => {
    const appliquer = (nom) => {
      const connu = nomsConnus().find((n) => memeExercice(n, nom)) || nom;
      exo.remplace = exo.remplace || exo.nom;
      exo.nom = connu;
      const f2 = ficheDuProgramme(connu);
      if (f2) { exo.muscle = f2.muscle; exo.repos_s = f2.repos_s; }
      exo.series.forEach((s) => { if (!s.faite) { s.charge = null; s.reps = null; s.rir = null; } });
      enregistrerSeance(); rendreExercice();
    };
    f.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
      fermer();
      const i = Number(b.dataset.i);
      if (i >= 0) appliquer(candidats[i].nom);
      else saisir('Nom de l\'exercice', '', 'Remplacer', (t) => { if (t) appliquer(t); });
    }));
  });
}

/* ---------- Séries ---------- */

function rendreSeries() {
  const exo = seance.exercices[indexExo];
  const fiche = ficheExercice();
  const derniere = derniereFois(exo.nom, seance.id);
  const objectif = seance.deload ? null : objectifExercice(fiche, derniere);
  const liste = $('series');
  liste.innerHTML = '';
  const prochaine = exo.series.findIndex((s) => !s.faite);
  const enchainement = [];

  exo.series.forEach((serie, index) => {
    const ligne = document.createElement('div');
    ligne.className = 'serie' + (serie.faite ? ' faite' : '') + (index === prochaine ? ' courante' : '');
    const reference = derniere ? derniere.series[index] : null;
    const cibleRir = serie.cible != null ? serie.cible : (fiche.rir && fiche.rir.length ? fiche.rir[Math.min(index, fiche.rir.length - 1)] : null);
    // Filigrane série par série : la charge de cette série la dernière fois
    // (+ un pas si la montée est gagnée) ; les répétitions visées sur la
    // première, reps_min partout après une montée, la dernière fois sinon.
    const sugCharge = objectif ? objectif.charges[index] : (reference ? reference.charge : null);
    const sugReps = objectif && (index === 0 || objectif.monte) ? objectif.reps : (reference ? reference.reps : (fiche.reps_min || null));
    if (seance.deload && reference) { /* 70 % de la dernière fois */ }

    const n = document.createElement('div'); n.className = 'n num'; n.textContent = index + 1;
    const champCharge = champSerie(serie.charge, seance.deload && reference ? Math.round(reference.charge * 0.7 / 2.5) * 2.5 : sugCharge, 'Charge en kg', 'charge');
    const champReps = champSerie(serie.reps, sugReps, 'Répétitions', 'reps');
    const rir = document.createElement('div'); rir.className = 'rir';
    if (serie.restPause) ligne.classList.add('rp-actif');
    [0, 1, 2, 3].forEach((v) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = v;
      b.className = (serie.rir === v ? 'choisi' : '') + (cibleRir === v ? ' cible' : '');
      b.setAttribute('aria-label', 'RIR ' + v);
      b.addEventListener('click', () => {
        serie.rir = serie.rir === v ? null : v;
        enregistrerSeance();
        rir.querySelectorAll('button').forEach((x) => x.classList.toggle('choisi', Number(x.textContent) === serie.rir));
      });
      rir.appendChild(b);
    });

    const colorer = () => {
      ligne.classList.remove('hausse', 'baisse', 'stable', 'aberrante');
      if (chargeAberrante(serie.charge, derniere)) ligne.classList.add('aberrante');
      if (!serie.faite) return;
      const c = comparerSeries(serie, reference, fiche);
      if (c) ligne.classList.add(c.sens);
    };
    champCharge.addEventListener('input', () => { serie.charge = nombreOuNull(champCharge.value); enregistrerSeance(); colorer(); });
    champReps.addEventListener('input', () => {
      const etaitFaite = serie.faite;
      serie.reps = nombreOuNull(champReps.value);
      if (serie.reps == null && etaitFaite) { serie.faite = false; enregistrerSeance(); rendreSeries(); rendreJauge(); return; }
      enregistrerSeance(); colorer();
    });
    const valider = () => {
      if (serie.faite || serie.reps == null || confirmationEnCours) return;
      if (serie.charge == null) serie.charge = champCharge.placeholder ? nombreOuNull(champCharge.placeholder) : null;
      if (serie.rir == null && cibleRir != null) serie.rir = cibleRir;
      if (chargeAberrante(serie.charge, derniere)) {
        // Le `change` du champ repart quand le dialogue prend le focus :
        // le drapeau empêche un second dialogue par-dessus le premier.
        confirmationEnCours = true;
        confirmer('Charge inhabituelle', formatNombre(serie.charge) + ' kg contre ' + formatNombre(chargeDeReference(derniere)) + ' kg la dernière fois (série la plus lourde). Confirmer ?', 'Confirmer',
          () => {
            confirmationEnCours = false;
            if (serie.reps == null) { toast('Répétitions manquantes : série non validée.', 3000); rendreSeries(); return; }
            validerSerie(exo, serie, index, reference, fiche);
          }, false,
          () => { confirmationEnCours = false; });
        return;
      }
      validerSerie(exo, serie, index, reference, fiche);
    };
    champReps.addEventListener('change', valider);
    champReps.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); valider(); } });
    champCharge.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); champReps.focus(); champReps.select(); } });

    ligne.append(n, champCharge, champReps, rir);
    colorer();
    liste.appendChild(ligne);
    enchainement.push(champCharge, champReps);
  });
  const rpBouton = $('rp-serie');
  if (rpBouton) {
    const i = exo.series.findIndex((x) => !x.faite);
    const courante = exo.series[i >= 0 ? i : exo.series.length - 1];
    rpBouton.classList.toggle('actif', !!(courante && courante.restPause));
    rpBouton.setAttribute('aria-pressed', courante && courante.restPause ? 'true' : 'false');
  }
}

function champSerie(valeur, suggestion, libelle, role) {
  const input = document.createElement('input');
  input.type = 'text'; input.inputMode = 'decimal'; input.enterKeyHint = role === 'reps' ? 'done' : 'next';
  input.className = 'f ' + role; input.dataset.role = role;
  input.value = valeur == null ? '' : String(valeur).replace('.', ',');
  input.placeholder = suggestion == null ? '' : String(suggestion).replace('.', ',');
  input.setAttribute('aria-label', libelle);
  input.addEventListener('focus', () => input.select());
  return input;
}

/* Une douleur se décrit en quelques mots : au moins 3 lettres. Le
   5 novembre 2026, deux « # » sont partis dans l'onglet Douleurs. */
function douleurValable(texte) {
  return ((texte || '').match(/\p{L}/gu) || []).length >= 3;
}

function validerSerie(exo, serie, index, reference, fiche) {
  // Jamais de série faite sans répétitions (6 novembre 2026 : extension
  // jambes, série 1 arrivée au classeur à 65 kg sans répétitions, après
  // une confirmation de charge inhabituelle).
  if (serie.reps == null) return;
  serie.faite = true;
  serie.heure = new Date().toISOString();
  enregistrerSeance();
  if (reglages.vibration && navigator.vibrate) navigator.vibrate(30);
  amorcerClavier();
  const repos = exo.repos_s || 90;
  const c = comparerSeries(serie, reference, fiche);
  const comp = $('comparaison');
  if (comp && c) { comp.textContent = c.texte + (c.indicatif ? ' (RIR différent, indicatif)' : ''); comp.className = 'comparaison ' + c.sens; }

  const toutFait = exo.series.every((s) => s.faite);
  let bilan = null;
  if (toutFait) {
    const derniere = derniereFois(exo.nom, seance.id);
    bilan = { tonnage: tonnageDesSeries(exo.series), tonnageAvant: derniere ? tonnageDesSeries(derniere.series) : null, suivant: null };
    if (indexExo < seance.exercices.length - 1) {
      indexExo++;
      rendreExercice();
      const suivant = seance.exercices[indexExo];
      bilan.suivant = suivant.nom;
      bilan.reglages = reglagesMachine(suivant.nom);
      bilan.consigne = consigneAffichee(seance.jour, suivant.nom, (ficheDuProgramme(suivant.nom) || {}).consigne);
    } else { rendreSeries(); rendreJauge(); }
  } else { rendreSeries(); rendreJauge(); }
  focaliserProchaineSerie();
  lancerMinuterie(repos, bilan);
}

function amorcerClavier() {
  const a = $('amorce-clavier');
  if (a && reglages.clavierPendantRecup) a.focus({ preventScroll: true });
}

function focaliserProchaineSerie() {
  const courante = document.querySelector('#series .serie.courante input.charge');
  if (courante && reglages.clavierPendantRecup) { courante.focus({ preventScroll: true }); courante.select(); }
  else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

/* ---------- Minuterie de repos ---------- */

function brancherMinuterie() {
  $('seance-abandonner').addEventListener('click', abandonnerSeanceCourante);
  $('minuterie-fermer').addEventListener('click', () => { $('minuterie-plein').hidden = true; });
  $('minuterie-plein').addEventListener('click', (e) => { if (e.target === $('minuterie-plein')) $('minuterie-plein').hidden = true; });
  $('minuterie-moins').addEventListener('click', () => { if (minuterie) { minuterie.fin -= 15000; sauverRepos(); battre(); } });
  $('minuterie-plus').addEventListener('click', () => { if (minuterie) { minuterie.fin += 15000; sauverRepos(); battre(); } });
  $('repos-flottant').addEventListener('click', () => {
    const jour = minuterie && minuterie.jour;
    if (jour && lireSeancesEnCours()[codeCanonique(jour)]) { afficher('sport'); commencer(jour); }
    else minuterieTerminee(true);
  });
  $('minuterie-stop').addEventListener('click', () => minuterieTerminee(true));
  $('minuterie-anneau').style.strokeDasharray = String(2 * Math.PI * 52);
}

/* Repos persistant (remarque du 5 novembre 2026, « chrono persistant ») :
   le repos survit à la sortie de la fiche et à la fermeture de
   l'application. Il est gardé sur le téléphone, repris au lancement s'il
   n'est pas fini, et une pastille (#repos-flottant) le montre sur les
   autres écrans ; un appui ramène à la séance. */
const CLE_REPOS = 'muscu2.repos';

function sauverRepos() {
  ecrire(CLE_REPOS, minuterie ? { debut: minuterie.debut, fin: minuterie.fin, duree: minuterie.duree, bilan: minuterie.bilan, jour: minuterie.jour } : null);
}

function restaurerRepos() {
  const r = lire(CLE_REPOS, null);
  if (!r || !r.fin || r.fin <= Date.now()) { ecrire(CLE_REPOS, null); return; }
  minuterie = r;
  rendreBandeauMinuterie();
  battre();
  tictac = setInterval(battre, 250);
}

function lancerMinuterie(secondes, bilan) {
  arreterMinuterie();
  minuterie = { debut: Date.now(), fin: Date.now() + secondes * 1000, duree: secondes, bilan, jour: seance ? seance.jour : null };
  sauverRepos();
  rendreBandeauMinuterie();
  const plein = $('minuterie-plein');
  $('minuterie-suivant').innerHTML = bilan && bilan.suivant
    ? '<b>Ensuite : ' + echapper(bilan.suivant) + '</b>' + (bilan.reglages ? 'Réglages : ' + echapper(bilan.reglages) : '') + (bilan.consigne ? '<div class="petit">' + echapper(bilan.consigne) + '</div>' : '')
    : '<b>Repos</b>';
  $('minuterie-bilan').innerHTML = bilan && bilan.tonnageAvant != null
    ? '<div><b class="num">' + bilan.tonnage + '</b>kg aujourd\'hui</div><div><b class="num">' + bilan.tonnageAvant + '</b>kg la dernière fois</div>'
    : '';
  // Différé d'un tick : un clic en cours (flèche d'exercice) doit atteindre
  // sa cible avant que la couche ne couvre l'écran (voir CLAUDE.md v1).
  const instance = minuterie;
  setTimeout(() => { if (minuterie === instance && secondes > 15) { plein.hidden = false; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } }, 0);
  battre();
  tictac = setInterval(battre, 250);
}

function rendreBandeauMinuterie() {
  const bandeau = $('minuterie-bandeau');
  if (!bandeau) return;
  bandeau.hidden = !minuterie;
  if (!minuterie) return;
  $('minuterie-bandeau-l').textContent = minuterie.bilan && minuterie.bilan.suivant ? 'puis ' + minuterie.bilan.suivant : '';
  bandeau.onclick = () => minuterieTerminee(true);
}

function battre() {
  if (!minuterie) return;
  const restant = (minuterie.fin - Date.now()) / 1000;
  if (restant <= 0) { minuterieTerminee(false); return; }
  const texte = texteDuree(restant);
  const bt = $('minuterie-bandeau-t'); if (bt) bt.textContent = texte;
  $('minuterie-plein-t').textContent = texte;
  const fraction = Math.max(0, Math.min(1, restant / minuterie.duree));
  $('minuterie-anneau').style.strokeDashoffset = String(2 * Math.PI * 52 * (1 - fraction));
  // Le plein écran reste jusqu'à la fin du repos (remarque du 5 novembre
  // 2026) : il ne se masque plus à 10 s, seulement par un appui.
  const flottant = $('repos-flottant');
  flottant.hidden = ecranActif() === 'seance';
  $('repos-flottant-t').textContent = texte;
}

function arreterMinuterie() {
  if (tictac) clearInterval(tictac);
  tictac = null; minuterie = null;
  sauverRepos();
  $('minuterie-plein').hidden = true;
  $('repos-flottant').hidden = true;
  rendreBandeauMinuterie();
}

function minuterieTerminee(manuel) {
  const etait = minuterie;
  arreterMinuterie();
  if (!etait) { return; }
  if (!manuel) signaler();
  if (ecranActif() === 'seance' && seance && seance.type === 'muscu') {
    amorcerClavier();
    focaliserProchaineSerie();
  }
}

/* Notification système de fin de repos, reprise de la v1 (remarque du
   5 novembre 2026, « vibration ne fonctionne pas ») : navigator.vibrate
   n'agit que page au premier plan et n'existe pas sur tous les navigateurs ;
   la notification passe par le système, qui vibre et sonne même écran
   verrouillé. Seul ServiceWorkerRegistration.showNotification marche
   depuis une page Android. Activée dans Réglages (permission demandée). */
function notifierFinDeRepos() {
  if (!reglages.notification || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.ready.then((r) => r.showNotification('Repos terminé', {
    body: 'Série suivante.', tag: 'muscu-repos', renotify: true, vibrate: [180, 90, 180], silent: false,
  })).catch(() => {});
}

let contexteAudio = null;
function signaler() {
  if (reglages.vibration && navigator.vibrate) navigator.vibrate([180, 90, 180]);
  notifierFinDeRepos();
  if (!reglages.son) return;
  try {
    contexteAudio = contexteAudio || new (window.AudioContext || window.webkitAudioContext)();
    const o = contexteAudio.createOscillator(); const g = contexteAudio.createGain();
    o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.9;
    o.connect(g); g.connect(contexteAudio.destination);
    o.start(); o.stop(contexteAudio.currentTime + 0.35);
  } catch (e) { /* pas de son */ }
}

/* ---------- Fin de séance ---------- */

function terminer() {
  arreterMinuterie();
  if (seance.chrono && !seance.chrono.fin) seance.chrono.fin = Date.now();
  seance.duree_min = dureeSeanceMin();
  enregistrerSeance();
  afficher('fin');
}

function rendreFin() {
  if (!seance) return;
  const corps = $('fin-corps');
  const jour = jourDe(seance.jour);
  $('fin-titre').textContent = libelleJour(jour) + ' ' + seance.nom;
  let html = '';
  if (seance.type === 'muscu') {
    const faits = seance.exercices.filter((e) => e.series.some((s) => s.faite));
    const oublies = seance.exercices.filter((e) => !e.series.some((s) => s.faite));
    const tonnage = seance.exercices.reduce((t, e) => t + tonnageDesSeries(e.series), 0);
    const nb = seance.exercices.reduce((t, e) => t + e.series.filter((s) => s.faite).length, 0);
    html += '<div class="carte"><div class="chiffres"><div class="chiffre"><b>' + (seance.duree_min || 0) + '</b><span>minutes</span></div><div class="chiffre"><b>' + nb + '</b><span>séries</span></div><div class="chiffre"><b>' + tonnage + '</b><span>kg soulevés</span></div></div>';
    const premier = seance.exercices[0];
    const derniere = premier ? derniereFois(premier.nom, seance.id) : null;
    const s1 = premier ? seriesDeTravail(premier)[0] : null;
    if (s1 && derniere) {
      const c = comparerSeries(s1, derniere.series[0], ficheDuProgramme(premier.nom));
      if (c) html += '<p class="petit" style="margin-top:10px">Première série de ' + echapper(premier.nom) + ' : <span class="puce ' + c.sens + '">' + echapper(c.texte) + '</span>' + (c.indicatif ? ' <span class="texte-2">RIR différent, indicatif</span>' : '') + '</p>';
    }
    html += '</div>';
    const incompletes = [];
    seance.exercices.forEach((e) => e.series.forEach((x, i) => { if (x.faite && (x.reps == null || x.charge == null)) incompletes.push(e.nom + ' série ' + (i + 1)); }));
    if (incompletes.length) html += '<div class="alerte baisse" style="margin-top:10px" id="fin-incompletes">' + svgIcone('alerte') + '<div>Chiffres manquants : ' + incompletes.map(echapper).join(', ') + '. Reviens sur l\'exercice pour les saisir avant l\'envoi.</div></div>';
    if (oublies.length) html += '<div class="alerte attention" style="margin-top:10px">' + svgIcone('alerte') + '<div>Sans série : ' + oublies.map((e) => echapper(e.nom)).join(', ') + '. L\'envoi reste possible.</div></div>';
    html += '<div class="carte" style="margin-top:10px">' + faits.map((e) => '<div class="resume-exo"><b>' + echapper(e.nom) + '</b><span>' +
      e.series.filter((s) => s.faite).map((s) => (s.charge == null ? '?' : formatNombre(s.charge)) + '×' + (s.reps == null ? '?' : s.reps) + (s.rir != null ? ' @' + s.rir : '') + (s.restPause ? ' RP' : '')).join(' · ') + '</span></div>').join('') + '</div>';
  } else if (seance.type === 'cardio') {
    html += resumeCardio();
  } else {
    html += resumeGainage();
  }
  html += '<p class="titre-section">Remarque pour le développeur</p><div class="carte"><textarea id="fin-remarque" rows="3" style="width:100%" placeholder="Douleur, gêne, idée d\'amélioration">' + echapper(seance.remarque || '') + '</textarea></div>';
  html += '<div class="pied-fixe"><button class="bouton primaire large" id="fin-enregistrer">Enregistrer et envoyer</button><div class="etat-envoi" id="fin-etat"></div></div>';
  corps.innerHTML = html;
  poserIcones(corps);
  $('fin-remarque').addEventListener('input', (e) => { seance.remarque = e.target.value; enregistrerSeance(); });
  $('fin-enregistrer').addEventListener('click', enregistrerEtSynchroniser);
}
rendus.fin = rendreFin;

/* Cadence de la page d'envoi, celle de la v1 (DUREE_MIN_ENVOI_MS, 0,9 s de
   rebond, 2 s sur « Envoyé »). Objet modifiable : les tests la réduisent. */
const DUREES_ENVOI = { minimum: 2200, rebond: 900, tenue: 2000 };

async function enregistrerEtSynchroniser() {
  const bouton = $('fin-enregistrer');
  const etat = $('fin-etat');
  bouton.disabled = true;
  arreterMinuterie();
  seance.fin = new Date().toISOString();
  if (seance.type === 'gainage') seance.lignesGainage = lignesGainage(seance);
  enregistrerDansHistorique(seance);
  oublierSeance(seance.jour);
  ecrire(CLES.dernierJour, seance.jour);
  const finie = seance;
  seance = null;
  if (chronoTictac) clearInterval(chronoTictac);
  etat.textContent = '';
  // Page d'envoi dédiée, animation de la v1 (voir .bouton-sync dans
  // v2/css/style.css) : rond pendant l'envoi, durée minimale garantie même
  // si le réseau répond vite, rebond, puis « Envoyé » tenu avant la fiche.
  const plein = $('envoi-plein');
  const anim = $('envoi-bouton');
  const texte = $('envoi-texte');
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  anim.className = 'bouton-sync';
  texte.textContent = 'Synchronisation';
  plein.hidden = false;
  void anim.offsetWidth;   // la pilule doit être dessinée avant de se resserrer
  anim.classList.add('envoi');
  const debut = Date.now();
  try { await synchroniser(); } catch (e) { /* la séance reste en attente */ }
  await attendre(Math.max(0, DUREES_ENVOI.minimum - (Date.now() - debut)));
  const apres = historique().find((s) => s.id === finie.id);
  const envoyee = !!(apres && apres.envoye);
  anim.classList.add('complet');
  await attendre(DUREES_ENVOI.rebond);
  anim.classList.remove('envoi', 'complet');
  anim.classList.add('envoye');
  if (!envoyee) anim.classList.add('attente');
  texte.textContent = envoyee ? 'Envoyé' : (reglages.pont ? 'En attente' : 'Enregistré');
  await attendre(DUREES_ENVOI.tenue);
  plein.hidden = true;
  if (envoyee) toast('Séance enregistrée et envoyée au classeur.');
  else toast(reglages.pont ? 'Séance enregistrée, envoi en attente (réseau ou pont).' : 'Séance enregistrée sur le téléphone.', 3500);
  pile = ['sport'];
  afficher('sport');
  afficher('historique', { parametres: { ouvrir: finie.id } });
}

/* Quitter la séance par le retour ne l'efface pas : elle reste en cours. */
/* Abandon depuis la barre de la fiche (croix à droite du titre, demande du
   4 novembre 2026 : « en position haute »), avec confirmation ; même geste
   que la croix du bloc « Séances en cours » de Sport. */
function abandonnerSeanceCourante() {
  if (!seance) return;
  confirmer('Abandonner cette séance ?', 'Les séries saisies seront perdues.', 'Abandonner', () => {
    arreterMinuterie();
    if (alternanceSchema) { clearInterval(alternanceSchema); alternanceSchema = null; }
    if (chronoTictac) clearInterval(chronoTictac);
    oublierSeance(seance.jour);
    seance = null;
    afficher('sport');   // racine : afficher() réinitialise la pile lui-même
  }, true, null, $('seance-abandonner'));
}

function avantRetour() {
  if (ecranActif() === 'seance') {
    // Le repos continue hors de la fiche (pastille #repos-flottant).
    $('minuterie-plein').hidden = true;
    if (alternanceSchema) { clearInterval(alternanceSchema); alternanceSchema = null; }
    enregistrerSeance();
  }
  return true;
}
