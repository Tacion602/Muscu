/* Séance de gainage (bonus) : quatre catégories, un mouvement au choix,
   trois modes de saisie, minuteur de tenue et de repos. Port de la v1. */

let minuteurGainage = null;
let tictacGainage = null;
/* La v1 rangeait la durée en objet `{ secondes }` ; la migration l'a
   recopiée telle quelle. On accepte les deux formes et on borne (15 à 120). */
function lireDureeTenue() {
  const brut = lire(CLES.dureeGainage, 45);
  const n = Number(brut && typeof brut === 'object' ? brut.secondes : brut);
  return Number.isFinite(n) ? Math.max(15, Math.min(120, n)) : 45;
}
let dureeTenueGainage = lireDureeTenue();

function valeurRenseignee(v) {
  if (v == null) return false;
  if (typeof v === 'object') return v.poids != null || v.distance != null || v.vitesse != null;
  return true;
}

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

function poidsMouvement(cle, series) {
  if (!seance.poidsMouvements) seance.poidsMouvements = {};
  const actuels = seance.poidsMouvements[cle];
  if (!Array.isArray(actuels) || actuels.length < series) {
    const neufs = new Array(series).fill(null);
    (actuels || []).forEach((v, i) => { if (i < series) neufs[i] = v; });
    seance.poidsMouvements[cle] = neufs;
  }
  return seance.poidsMouvements[cle];
}

function seriesDuMouvement(cle) {
  const c = CATEGORIES_GAINAGE.find((x) => x.mouvements.includes(cle));
  return c ? c.series : 3;
}

function derniereFoisMouvement(cle) {
  for (const s of seancesTerminees()) {
    if (seance && s.id === seance.id) continue;
    const v = (s.mouvements || {})[cle];
    if (Array.isArray(v) && v.some(valeurRenseignee)) return v;
  }
  return null;
}

function derniersPoidsMouvement(cle) {
  for (const s of seancesTerminees()) {
    if (seance && s.id === seance.id) continue;
    const p = (s.poidsMouvements || {})[cle];
    if (Array.isArray(p) && p.some((x) => x != null)) return p;
  }
  return null;
}

function mouvementParDefaut(categorie) {
  for (const s of seancesTerminees()) {
    if (s.type !== 'gainage' || !s.choix) continue;
    if (categorie.mouvements.includes(s.choix[categorie.cle])) return s.choix[categorie.cle];
  }
  return categorie.mouvements[0];
}

function texteValeur(m, v) {
  if (v && typeof v === 'object') return [v.poids != null ? v.poids + ' kg' : null, v.distance != null ? v.distance + ' m' : null, v.vitesse != null ? v.vitesse + ' km/h' : null].filter(Boolean).join(', ');
  return v + (m.mode === 'chrono' ? ' s' : ' reps');
}

function rendreGainage() {
  $('seance-titre').innerHTML = 'Gainage<span class="sous">Bonus</span>';
  $('seance-progression').style.width = '0';
  $('seance-chrono').textContent = '';
  const corps = $('seance-corps');
  if (!seance.choix) seance.choix = {};
  let html = '<div class="gainage-chrono" id="gainage-chrono" hidden><div><div class="l petit" id="gainage-chrono-l"></div></div><div class="t num" id="gainage-chrono-t"></div></div>';
  html += '<div class="carte"><div class="reglage-duree"><span style="flex:1">Durée de tenue</span><button id="gainage-moins" aria-label="Réduire">−</button><b class="num" id="gainage-duree">' + dureeTenueGainage + ' s</b><button id="gainage-plus" aria-label="Augmenter">+</button></div></div>';
  html += '<div id="gainage-categories" class="liste-cartes" style="margin-top:10px"></div>';
  html += '<div class="nav-exo"><button class="bouton primaire large" id="gainage-terminer">Terminer</button></div>';
  corps.innerHTML = html;
  $('gainage-moins').addEventListener('click', () => reglerDureeTenue(-5));
  $('gainage-plus').addEventListener('click', () => reglerDureeTenue(5));
  $('gainage-terminer').addEventListener('click', terminer);
  rendreCategoriesGainage();
}

function reglerDureeTenue(delta) {
  dureeTenueGainage = Math.max(15, Math.min(120, dureeTenueGainage + delta));
  ecrire(CLES.dureeGainage, dureeTenueGainage);
  $('gainage-duree').textContent = dureeTenueGainage + ' s';
  rendreCategoriesGainage();
}

function rendreCategoriesGainage() {
  const bloc = $('gainage-categories');
  bloc.innerHTML = '';
  CATEGORIES_GAINAGE.forEach((categorie) => {
    if (!categorie.mouvements.includes(seance.choix[categorie.cle])) seance.choix[categorie.cle] = mouvementParDefaut(categorie);
    bloc.appendChild(carteMouvement(categorie));
  });
}

/* Couleur d'interférence avec la course, rendue plus visible (remarque du
   5 novembre 2026, « accentuer la visibilité des codes couleurs ») : le nom
   du mouvement et ses boutons de choix portent la teinte en fond ou en
   contour, plus seulement en couleur de texte. Le texte posé sur la teinte
   est noir ou blanc, celui qui contraste le plus. */
function texteSurTeinte(hex) {
  const canal = (i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const l = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? '#fff' : '#1b1b1b';
}

function styleInterference(m) {
  return '--teinte:' + m.couleur + ';--texte-teinte:' + texteSurTeinte(m.couleur);
}

function carteMouvement(categorie) {
  const cle = seance.choix[categorie.cle];
  const m = MOUVEMENTS_GAINAGE[cle];
  const series = categorie.series;
  const valeurs = valeursMouvement(cle, series);
  const avant = derniereFoisMouvement(cle);
  const poidsAvant = derniersPoidsMouvement(cle) || [];
  const carte = document.createElement('div');
  carte.className = 'carte gainage-exo';
  let html = '<div class="exo-entete"><h3 style="font-size:17px">' + echapper(categorie.nom) + '</h3><span class="puce">' + series + ' séries</span></div>';
  html += '<div class="segments choix">' + categorie.mouvements.map((c) => '<button class="segment segment-interference' + (c === cle ? ' choisi' : '') + '" data-m="' + c + '" style="' + styleInterference(MOUVEMENTS_GAINAGE[c]) + '">' + echapper(MOUVEMENTS_GAINAGE[c].nom) + '</button>').join('') + '</div>';
  html += '<p class="petit texte-2"><span class="nom-mouvement" style="' + styleInterference(m) + '">' + echapper(m.nom) + '</span> · interférence course ' + m.interference + '/9 · ' + echapper(m.prescription) + ' · repos ' + m.repos + ' s</p>';
  html += '<div class="gainage-series"></div>';
  if (avant) html += '<p class="petit texte-2" style="margin-top:8px">Dernière fois : ' + avant.map((v, i) => valeurRenseignee(v) ? texteValeur(m, v) + (poidsAvant[i] != null ? ' à ' + poidsAvant[i] + ' kg' : '') : null).filter(Boolean).join(' · ') + '</p>';
  html += '<p class="petit texte-2" style="margin-top:6px">' + echapper(m.consigne) + '</p>';
  carte.innerHTML = html;
  carte.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { seance.choix[categorie.cle] = b.dataset.m; enregistrerSeance(); rendreCategoriesGainage(); }));
  const grille = carte.querySelector('.gainage-series');
  valeurs.forEach((valeur, index) => grille.appendChild(celluleSerie(m, cle, series, index, valeur, avant ? avant[index] : null)));
  return carte;
}

/* Une valeur d'historique peut être un objet (mode charge d'un mouvement
   ancien, farmer walk de la v1) là où le mouvement affiché attend un
   nombre : on n'affiche jamais un objet tel quel. */
function nombreAffichable(v) {
  if (v == null) return '';
  if (typeof v === 'object') return v.poids != null ? String(v.poids) : '';
  return String(v);
}

function champGainage(valeur, suggestion, libelle, aChange) {
  const input = document.createElement('input');
  input.type = 'text'; input.inputMode = 'decimal';
  input.value = nombreAffichable(valeur);
  input.placeholder = nombreAffichable(suggestion);
  input.setAttribute('aria-label', libelle);
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => aChange(nombreOuNull(input.value)));
  return input;
}

function celluleSerie(m, cle, series, index, valeur, precedente) {
  const cellule = document.createElement('div');
  cellule.className = 'gainage-serie';
  const libelle = m.nom + ', série ' + (index + 1);
  if (m.mode === 'charge') {
    const v = valeur || {}; const p = precedente || {};
    [['poids', 'kg'], ['distance', 'm'], ['vitesse', 'km/h']].forEach(([champ, unite]) => {
      const input = champGainage(v[champ], p[champ], libelle + ', ' + champ, (n) => {
        const toutes = valeursMouvement(cle, series);
        toutes[index] = Object.assign({}, toutes[index] || {}, { [champ]: n });
        enregistrerSeance();
      });
      input.addEventListener('change', () => { const s = valeursMouvement(cle, series)[index] || {}; if (s.poids != null && s.distance != null) serieSaisie(cle, index); });
      const l = document.createElement('label'); l.append(input, document.createTextNode(unite));
      cellule.appendChild(l);
    });
    return cellule;
  }
  if (valeur && typeof valeur === 'object') { valeur = null; valeursMouvement(cle, series)[index] = null; }
  if (precedente && typeof precedente === 'object') precedente = null;
  const input = champGainage(valeur, precedente, libelle + (m.mode === 'chrono' ? ', secondes' : ', répétitions'), (n) => { valeursMouvement(cle, series)[index] = n; enregistrerSeance(); });
  cellule.appendChild(input);
  const poidsAvant = derniersPoidsMouvement(cle);
  const suggestionPoids = poidsAvant && poidsAvant[index] != null ? poidsAvant[index] : (m.poidsDefaut != null ? m.poidsDefaut : null);
  const poids = champGainage(poidsMouvement(cle, series)[index], suggestionPoids, libelle + ', poids en kg', (n) => { poidsMouvement(cle, series)[index] = n; enregistrerSeance(); });
  if (m.mode === 'chrono') {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'demarrer'; b.textContent = '▶ ' + dureeTenueGainage + ' s';
    b.addEventListener('click', () => demarrerTenue(cle, index));
    cellule.appendChild(b);
  }
  if (!m.sansPoids) { const l = document.createElement('label'); l.append(poids, document.createTextNode('kg')); cellule.appendChild(l); }
  input.addEventListener('change', () => {
    if (valeursMouvement(cle, series)[index] == null) return;
    const tous = poidsMouvement(cle, series);
    if (tous[index] == null && suggestionPoids != null && !m.sansPoids) { tous[index] = suggestionPoids; poids.value = String(suggestionPoids); enregistrerSeance(); }
    serieSaisie(cle, index);
  });
  return cellule;
}

function serieSaisie(cle, index) {
  if (minuteurGainage && minuteurGainage.type === 'tenue') return;
  lancerMinuteurGainage('repos', MOUVEMENTS_GAINAGE[cle].repos, cle, index);
}

function demarrerTenue(cle, index) {
  if (minuteurGainage && minuteurGainage.type === 'tenue') finirTenue(false);
  lancerMinuteurGainage('tenue', dureeTenueGainage, cle, index);
}

function finirTenue(complete) {
  const t = minuteurGainage;
  if (!t || t.type !== 'tenue') return;
  const tenu = complete ? dureeTenueGainage : Math.min(dureeTenueGainage, Math.max(1, Math.round((Date.now() - t.debut) / 1000)));
  valeursMouvement(t.cle, seriesDuMouvement(t.cle))[t.index] = tenu;
  enregistrerSeance();
  arreterMinuteurGainage();
  if (seance && seance.type === 'gainage' && ecranActif() === 'seance') rendreCategoriesGainage();
  lancerMinuteurGainage('repos', MOUVEMENTS_GAINAGE[t.cle].repos, t.cle, t.index);
}

function lancerMinuteurGainage(type, secondes, cle, index) {
  if (tictacGainage) clearInterval(tictacGainage);
  minuteurGainage = { type, debut: Date.now(), fin: Date.now() + secondes * 1000, cle, index };
  const c = $('gainage-chrono'); if (c) { c.hidden = false; c.onclick = () => { if (minuteurGainage && minuteurGainage.type === 'tenue') finirTenue(false); else arreterMinuteurGainage(); }; }
  battreGainage();
  tictacGainage = setInterval(battreGainage, 250);
}

function battreGainage() {
  if (!minuteurGainage) return;
  const restant = (minuteurGainage.fin - Date.now()) / 1000;
  if (restant <= 0) { signaler(); if (minuteurGainage.type === 'tenue') finirTenue(true); else arreterMinuteurGainage(); return; }
  const m = MOUVEMENTS_GAINAGE[minuteurGainage.cle];
  const milieu = (minuteurGainage.fin - minuteurGainage.debut) / 2000;
  const secondCote = m.changerCote && minuteurGainage.type === 'tenue' && restant <= milieu;
  if (secondCote && !minuteurGainage.coteChange) { minuteurGainage.coteChange = true; signalerChangementDeCote(); }
  const l = $('gainage-chrono-l'); const t = $('gainage-chrono-t');
  if (l) l.textContent = minuteurGainage.type === 'tenue' ? 'Tenue · ' + m.nom + ', série ' + (minuteurGainage.index + 1) + (m.changerCote ? (secondCote ? ', 2e côté' : ', 1er côté') : '') : 'Repos';
  if (t) t.textContent = texteDuree(restant);
}

/* Bip de mi-tenue : plus court que la fin, sans notification, pour ne pas
   être pris pour la fin de la tenue. */
function signalerChangementDeCote() {
  if (reglages.vibration && navigator.vibrate) navigator.vibrate(120);
  if (!reglages.son) return;
  try {
    contexteAudio = contexteAudio || new (window.AudioContext || window.webkitAudioContext)();
    const o = contexteAudio.createOscillator(); const g = contexteAudio.createGain();
    o.type = 'sine'; o.frequency.value = 660; g.gain.value = 0.9;
    o.connect(g); g.connect(contexteAudio.destination);
    o.start(); o.stop(contexteAudio.currentTime + 0.15);
  } catch (e) { /* pas de son */ }
}

function arreterMinuteurGainage() {
  if (tictacGainage) clearInterval(tictacGainage);
  tictacGainage = null; minuteurGainage = null;
  const c = $('gainage-chrono'); if (c) c.hidden = true;
}

function lignesGainage(s) {
  const lignes = [];
  CATEGORIES_GAINAGE.forEach((categorie) => categorie.mouvements.forEach((cle) => {
    const m = MOUVEMENTS_GAINAGE[cle];
    ((s.mouvements || {})[cle] || []).forEach((v, index) => {
      if (!valeurRenseignee(v)) return;
      const objet = typeof v === 'object';
      lignes.push({ categorie: categorie.nom, mouvement: m.nom, serie: index + 1, valeur: objet ? null : v,
        unite: m.mode === 'chrono' ? 's' : (m.mode === 'reps' ? 'reps' : ''),
        poids: objet ? v.poids : (((s.poidsMouvements || {})[cle] || [])[index] ?? null) });
    });
  }));
  return lignes;
}

function resumeGainage(s) {
  s = s || seance;
  const lignes = lignesGainage(s);
  if (!lignes.length) return '<div class="carte"><p class="vide">Aucune série renseignée.</p></div>';
  const parMouvement = {};
  lignes.forEach((l) => { (parMouvement[l.mouvement] = parMouvement[l.mouvement] || []).push(l); });
  return '<div class="carte">' + Object.keys(parMouvement).map((nom) => '<div class="resume-exo"><b>' + echapper(nom) + '</b><span>' +
    parMouvement[nom].map((l) => (l.valeur != null ? l.valeur + ' ' + l.unite : '') + (l.poids != null ? ' à ' + l.poids + ' kg' : '')).join(' · ') + '</span></div>').join('') + '</div>';
}
