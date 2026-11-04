/* Interface commune de la v2 : navigation entre écrans, barre d'onglets,
   icônes, feuilles basses, toasts. */

/* Icônes : un seul jeu, trait 1,8 px (voir css), dessinées ici plutôt que
   des emoji (direction du 4 novembre 2026). */
const ICONES = {
  halteres: '<path d="M4 9v6M20 9v6M7 7v10M17 7v10M7 12h10"/>',
  courbe: '<path d="M4 18L10 11l4 4 6-8"/>',
  reglages: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
  retour: '<path d="M15 5l-7 7 7 7"/>',
  gainage: '<circle cx="5" cy="9" r="1.8"/><path d="M7 11l9 2 5 1M7 11l-2 5M16 13l1 4"/>',
  maison: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  fermer: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  moins: '<path d="M5 12h14"/>',
  calendrier: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  corps: '<circle cx="12" cy="5" r="2.5"/><path d="M8 10h8l-1 6h-6zM10 16v5M14 16v5"/>',
  lune: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  regle: '<path d="M3 17L17 3l4 4L7 21zM8 16l2-2M11 13l2-2M14 10l2-2"/>',
  course: '<circle cx="15" cy="4" r="1.8"/><path d="M6 20l3-7 3 2 1 5M9 13l2-4 4 1 2 3M12 9l-3 1-2 3"/>',
  bilan: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 15v-4M12 15V8M16 15v-2"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/>',
  liste: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  check: '<path d="M5 12l4 4L19 7"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.3 1.5A3.5 3.5 0 0 1 17 18z"/>',
  alerte: '<path d="M12 4l9 16H3zM12 10v4M12 17v.5"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>',
  echange: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  partage: '<path d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6"/>',
};

function svgIcone(nom) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[nom] || '') + '</svg>';
}

function poserIcones(racine) {
  (racine || document).querySelectorAll('[data-icone]').forEach((el) => {
    if (!el.querySelector('svg')) el.innerHTML = svgIcone(el.dataset.icone);
  });
}

/* ---------- Navigation ---------- */

const RACINES = ['accueil', 'sport', 'suivi', 'reglages'];
let pile = ['accueil'];
let ongletCourant = 'accueil';
const rendus = {};   // nom d'écran -> fonction de rendu, enregistrée par chaque module

function ecranActif() {
  return pile[pile.length - 1];
}

function afficher(nom, options) {
  options = options || {};
  const courant = ecranActif();
  if (nom === courant && !options.forcer) { if (rendus[nom]) rendus[nom](options.parametres); return; }
  const depuis = $('ecran-' + courant);
  const vers = $('ecran-' + nom);
  if (!vers) return;
  if (rendus[nom]) rendus[nom](options.parametres);
  if (RACINES.includes(nom)) {
    pile = [nom];
    ongletCourant = nom;
    document.querySelectorAll('.ecran').forEach((e) => e.classList.remove('actif', 'sortant'));
    vers.classList.add('actif');
    $('onglets').hidden = false;
    document.querySelectorAll('.onglet').forEach((o) => o.classList.toggle('actif', o.dataset.onglet === nom));
    retirerGardeHistorique();
  } else {
    if (options.remplacer) pile.pop();
    if (pile.includes(nom)) pile = pile.slice(0, pile.indexOf(nom) + 1); else pile.push(nom);
    document.querySelectorAll('.ecran').forEach((e) => e.classList.remove('actif', 'sortant'));
    depuis.classList.add('sortant');
    vers.classList.add('actif');
    $('onglets').hidden = true;
    // Retour à l'état de repos sans animation (lecture forcée de la mise en
    // page entre les deux, sinon le navigateur ne voit jamais l'état sans
    // transition) : sans cela, l'écran sortant glisserait de -30 % à +100 %
    // en restant visible 220 ms de plus.
    setTimeout(() => { depuis.style.transition = 'none'; depuis.classList.remove('sortant'); void depuis.offsetWidth; depuis.style.transition = ''; }, 240);
    if (!(history.state && history.state.muscu2)) history.pushState({ muscu2: true }, '');
  }
  vers.querySelector('.corps').scrollTop = 0;
}

/* Garde d'historique : une seule entrée poussée en quittant une racine,
   retirée (history.back, dont le popstate est ignoré) en y revenant. */
let ignorerPopstate = false;
function retirerGardeHistorique() {
  if (history.state && history.state.muscu2) { ignorerPopstate = true; history.back(); }
}

function retour() {
  if (pile.length <= 1) return;
  const courant = pile.pop();
  const precedent = ecranActif();
  const depuis = $('ecran-' + courant);
  const vers = $('ecran-' + precedent);
  if (rendus[precedent]) rendus[precedent]();
  document.querySelectorAll('.ecran').forEach((e) => e.classList.remove('actif', 'sortant'));
  depuis.classList.add('sortant');
  depuis.style.transform = 'translateX(100%)';
  vers.classList.add('actif');
  setTimeout(() => { depuis.style.transition = 'none'; depuis.style.transform = ''; depuis.classList.remove('sortant'); void depuis.offsetWidth; depuis.style.transition = ''; }, 240);
  if (RACINES.includes(precedent)) { $('onglets').hidden = false; retirerGardeHistorique(); }
}

/* Retour Android : une entrée d'historique « garde » hors des écrans
   racine ; popstate la consomme en remontant d'un écran, ou ferme le repos
   plein écran s'il est ouvert. Depuis une racine, le retour quitte. */
function brancherNavigation() {
  document.querySelectorAll('[data-retour]').forEach((b) => {
    b.innerHTML = svgIcone('retour');
    b.addEventListener('click', () => {
      if (typeof avantRetour === 'function' && avantRetour() === false) return;
      retour();
    });
  });
  document.querySelectorAll('.onglet').forEach((o) => {
    o.addEventListener('click', () => afficher(o.dataset.onglet));
  });
  window.addEventListener('popstate', () => {
    if (ignorerPopstate) { ignorerPopstate = false; return; }
    if (!$('minuterie-plein').hidden) { $('minuterie-plein').hidden = true; history.pushState({ muscu2: true }, ''); return; }
    if (pile.length > 1) {
      if (typeof avantRetour === 'function' && avantRetour() === false) { history.pushState({ muscu2: true }, ''); return; }
      // retour() retire la garde lui-même en arrivant sur une racine ; le
      // popstate qui vient de se produire l'a déjà consommée.
      const versRacine = RACINES.includes(pile[pile.length - 2]);
      retour();
      if (!versRacine) history.pushState({ muscu2: true }, '');
    }
  });
  poserIcones();
}

/* ---------- Feuille basse, toast ---------- */

function feuille(html, brancher, surFermeture) {
  const voile = document.createElement('div');
  voile.className = 'voile';
  voile.innerHTML = '<div class="feuille">' + html + '</div>';
  $('app').appendChild(voile);
  requestAnimationFrame(() => voile.classList.add('visible'));
  let fermee = false;
  const fermer = () => {
    if (fermee) return;
    fermee = true;
    voile.classList.remove('visible');
    setTimeout(() => voile.remove(), 220);
    if (surFermeture) surFermeture();
  };
  voile.addEventListener('click', (e) => { if (e.target === voile) fermer(); });
  poserIcones(voile);
  if (brancher) brancher(voile.querySelector('.feuille'), fermer);
  return fermer;
}

function confirmer(titre, texte, libelle, suite, danger, surAnnulation) {
  let confirme = false;
  const voile = feuille(
    '<h3>' + echapper(titre) + '</h3><p class="texte-2">' + echapper(texte) + '</p>' +
    '<div class="actions"><button class="bouton" data-annuler>Annuler</button>' +
    '<button class="bouton ' + (danger ? 'danger' : 'primaire') + '" data-ok>' + echapper(libelle) + '</button></div>',
    (f, fermer) => {
      f.querySelector('[data-annuler]').addEventListener('click', fermer);
      f.querySelector('[data-ok]').addEventListener('click', () => { confirme = true; fermer(); suite(); });
    }, () => { if (!confirme && surAnnulation) surAnnulation(); });
  return voile;
}

function saisir(titre, valeur, libelle, suite, multiligne) {
  feuille(
    '<h3>' + echapper(titre) + '</h3>' +
    (multiligne ? '<textarea rows="4" style="width:100%" data-champ>' + echapper(valeur || '') + '</textarea>'
      : '<input type="text" style="width:100%" data-champ value="' + echapper(valeur || '') + '">') +
    '<div class="actions"><button class="bouton" data-annuler>Annuler</button>' +
    '<button class="bouton primaire" data-ok>' + echapper(libelle || 'Enregistrer') + '</button></div>',
    (f, fermer) => {
      const champ = f.querySelector('[data-champ]');
      setTimeout(() => champ.focus(), 250);
      f.querySelector('[data-annuler]').addEventListener('click', fermer);
      f.querySelector('[data-ok]').addEventListener('click', () => { fermer(); suite(champ.value.trim()); });
    });
}

let toastDelai = null;
function toast(texte, duree) {
  const t = $('toast');
  t.textContent = texte;
  t.classList.add('visible');
  if (toastDelai) clearTimeout(toastDelai);
  toastDelai = setTimeout(() => t.classList.remove('visible'), duree || 2200);
}

/* ---------- Courbe SVG à axes lisibles ---------- */

/* points : [{ x: date ISO, y: nombre, deload?, etiquette }], unite texte.
   Renvoie du SVG ; les points portent data-index pour un appui. */
function courbeSvg(points, unite, choisi) {
  if (points.length < 2) return '';
  const L = 340, H = 210, g = 46, d = 12, h = 20, b = 34;
  const xs = points.map((p) => new Date(p.x).getTime());
  const ys = points.map((p) => p.y);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  let ymin = Math.min(...ys), ymax = Math.max(...ys);
  const marge = Math.max(1, (ymax - ymin) * 0.15);
  ymin = Math.floor((ymin - marge) / 5) * 5;
  ymax = Math.ceil((ymax + marge) / 5) * 5;
  if (ymax === ymin) ymax = ymin + 5;
  const sx = (x) => g + ((x - xmin) / Math.max(1, xmax - xmin)) * (L - g - d);
  const sy = (y) => h + (1 - (y - ymin) / (ymax - ymin)) * (H - h - b);
  const pas = (ymax - ymin) / 4;
  let svg = '<svg class="courbe" viewBox="0 0 ' + L + ' ' + H + '" role="img" aria-label="Progression">';
  for (let i = 0; i <= 4; i++) {
    const y = ymin + i * pas;
    svg += '<line class="' + (i === 0 ? 'axe' : 'grille') + '" x1="' + g + '" y1="' + sy(y) + '" x2="' + (L - d) + '" y2="' + sy(y) + '"/>';
    svg += '<text x="' + (g - 6) + '" y="' + (sy(y) + 4) + '" text-anchor="end">' + formatNombre(y) + (i === 4 ? ' ' + unite : '') + '</text>';
  }
  svg += '<line class="axe" x1="' + g + '" y1="' + h + '" x2="' + g + '" y2="' + (H - b) + '"/>';
  // Dates : au plus 6 étiquettes, réparties.
  const pasEtiq = Math.max(1, Math.ceil(points.length / 6));
  points.forEach((p, i) => {
    if (i % pasEtiq !== 0 && i !== points.length - 1) return;
    const ancre = i === 0 ? 'start' : (i === points.length - 1 ? 'end' : 'middle');
    svg += '<text x="' + sx(xs[i]) + '" y="' + (H - b + 16) + '" text-anchor="' + ancre + '">' + dateJM(p.x) + '</text>';
  });
  svg += '<polyline class="trace" points="' + points.map((p, i) => sx(xs[i]) + ',' + sy(p.y)).join(' ') + '"/>';
  points.forEach((p, i) => {
    const classes = ['point'];
    if (i === points.length - 1) classes.push('dernier');
    if (i === choisi) classes.push('choisi');
    if (p.deload) classes.push('deload');
    svg += '<circle class="' + classes.join(' ') + '" cx="' + sx(xs[i]) + '" cy="' + sy(p.y) + '" r="' + (i === choisi ? 6.5 : 4.5) + '"/>';
    svg += '<rect class="zone" data-index="' + i + '" x="' + (sx(xs[i]) - 14) + '" y="' + h + '" width="28" height="' + (H - h - b) + '"/>';
  });
  return svg + '</svg>';
}
