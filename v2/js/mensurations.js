/* Mensurations : six mesures et le poids, repères sur le mannequin, photo
   compressée, comparaison avant/après par curseur. Port de la v1. */

let mensurationAffichee = null;

function mensurationPour(cle) {
  const t = lireTableau(CLES.mensurations).find((m) => m.cle === cle);
  if (t) return t;
  const vide = { cle, poids: null, photo: null, envoyee: false };
  MENSURATION_CHAMPS.forEach((c) => { vide[c.cle] = null; });
  return vide;
}

function enregistrerMensuration(m) {
  m.envoyee = false;
  const toutes = lireTableau(CLES.mensurations).filter((x) => x.cle !== m.cle);
  toutes.push(m);
  ecrire(CLES.mensurations, toutes);
}

function reperesMensurations() {
  const groupe = (cat, paires) => '<g class="mesure-' + cat + '">' + paires.map(([x1, y1, x2, y2]) =>
    '<line class="mesure-ligne" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"></line><circle class="mesure-point" cx="' + x1 + '" cy="' + y1 + '" r="30"></circle><circle class="mesure-point" cx="' + x2 + '" cy="' + y2 + '" r="30"></circle>').join('') + '</g>';
  return groupe('torse', [[298, 500, 706, 500]]) + groupe('torse', [[310, 700, 686, 700]]) + groupe('bras', [[167, 604, 290, 604], [702, 606, 829, 606]]) +
    groupe('jambe', [[347, 1088, 649, 1088]]) + groupe('jambe', [[257, 1200, 445, 1200], [555, 1200, 739, 1200]]) + groupe('jambe', [[208, 1751, 359, 1751], [641, 1756, 796, 1756]]);
}

function compresserImage(fichier, suite) {
  const lecteur = new FileReader();
  lecteur.onload = () => {
    const image = new Image();
    image.onload = () => {
      const echelle = Math.min(1, 900 / image.width);
      const c = document.createElement('canvas');
      c.width = Math.round(image.width * echelle); c.height = Math.round(image.height * echelle);
      c.getContext('2d').drawImage(image, 0, 0, c.width, c.height);
      suite(c.toDataURL('image/jpeg', 0.75));
    };
    image.src = lecteur.result;
  };
  lecteur.readAsDataURL(fichier);
}

function rendreMensurations(param) {
  if (!mensurationAffichee || (param === undefined && ecranActif() !== 'mensurations')) mensurationAffichee = cleDate(new Date());
  const m = mensurationPour(mensurationAffichee);
  const corps = $('mensurations-corps');
  const aujourdhui = cleDate(new Date());
  let html = '<div class="mois-nav"><button class="icone" id="mes-prec" aria-label="Jour précédent">' + svgIcone('retour') + '</button><b>' + (mensurationAffichee === aujourdhui ? 'Aujourd\'hui' : mensurationAffichee) + '</b><button class="icone" id="mes-suiv" aria-label="Jour suivant"' + (!cleAnterieure(mensurationAffichee, aujourdhui) ? ' disabled style="opacity:.3"' : '') + '>' + svgIcone('chevron') + '</button></div>';
  html += '<div class="carte"><div class="mannequin-paire"><div class="mannequin-vue">' + rendreMannequinPolygones(MANNEQUIN_AVANT, 'de face', null, null, reperesMensurations()) + '</div><div class="mannequin-vue">' + rendreMannequinPolygones(MANNEQUIN_ARRIERE, 'de dos') + '</div></div>' +
    '<div class="mesures" style="margin-top:10px"><div class="mesure" style="grid-column:1/-1"><span class="puce-m" style="background:var(--texte-2)"></span><span>Poids</span><input type="text" inputmode="decimal" data-cle="poids" value="' + (m.poids != null ? m.poids : '') + '"><small>kg</small></div>' +
    MENSURATION_CHAMPS.map((c) => '<div class="mesure"><span class="puce-m ' + c.categorie + '"></span><span>' + echapper(c.nom) + '</span><input type="text" inputmode="decimal" data-cle="' + c.cle + '" value="' + (m[c.cle] != null ? m[c.cle] : '') + '"><small>' + c.unite + '</small></div>').join('') + '</div>' +
    '<div class="photo-zone" id="mes-photo">' + (m.photo ? '<img src="' + m.photo + '" alt="Photo du ' + mensurationAffichee + '"><button class="suppr" id="mes-photo-suppr" aria-label="Supprimer la photo">×</button>' : '<span class="texte-2 petit">Toucher pour ajouter une photo</span>') + '</div></div>';
  const avecPhoto = lireTableau(CLES.mensurations).filter((x) => x.photo).sort((a, b) => (cleAnterieure(a.cle, b.cle) ? -1 : 1));
  html += '<p class="titre-section">Comparer</p><div class="carte" id="mes-comparer">' + (avecPhoto.length < 2 ? '<p class="vide">Deux photos datées au moins pour comparer.</p>' :
    '<div class="grille-champs"><label class="champ"><span>Avant</span><select id="mes-avant">' + avecPhoto.map((x) => '<option value="' + x.cle + '">' + x.cle + '</option>').join('') + '</select></label><label class="champ"><span>Après</span><select id="mes-apres">' + avecPhoto.map((x) => '<option value="' + x.cle + '"' + (x === avecPhoto[avecPhoto.length - 1] ? ' selected' : '') + '>' + x.cle + '</option>').join('') + '</select></label></div>' +
    '<div class="comparateur"><img class="avant" id="mes-img-avant" alt="Avant"><img class="apres" id="mes-img-apres" alt="Après"><div class="barre-c" id="mes-barre"></div><div class="stats" id="mes-stats"></div><input type="range" id="mes-curseur" min="0" max="100" value="50" aria-label="Curseur de comparaison"></div>') + '</div>';
  corps.innerHTML = html;
  $('mes-prec').addEventListener('click', () => { mensurationAffichee = decalerCle(mensurationAffichee, -1); rendreMensurations(null); });
  $('mes-suiv').addEventListener('click', () => { if (cleAnterieure(mensurationAffichee, aujourdhui)) { mensurationAffichee = decalerCle(mensurationAffichee, 1); rendreMensurations(null); } });
  corps.querySelectorAll('.mesure input').forEach((i) => i.addEventListener('change', () => { m[i.dataset.cle] = nombreOuNull(i.value); enregistrerMensuration(m); }));
  const photo = $('mes-photo');
  if (!m.photo) photo.addEventListener('click', () => $('mensurations-photo-fichier').click());
  else $('mes-photo-suppr').addEventListener('click', (e) => { e.stopPropagation(); m.photo = null; enregistrerMensuration(m); rendreMensurations(null); });
  const fichier = $('mensurations-photo-fichier');
  fichier.onchange = () => { const f = fichier.files[0]; if (!f) return; compresserImage(f, (data) => { m.photo = data; enregistrerMensuration(m); fichier.value = ''; rendreMensurations(null); }); };
  if (avecPhoto.length >= 2) {
    const maj = () => {
      const av = mensurationPour($('mes-avant').value); const ap = mensurationPour($('mes-apres').value);
      $('mes-img-avant').src = av.photo || ''; $('mes-img-apres').src = ap.photo || '';
      const stats = [['Poids', av.poids, ap.poids, 'kg'], ['Taille', av.taille, ap.taille, 'cm']].filter(([, a, b]) => a != null && b != null);
      $('mes-stats').innerHTML = stats.map(([n, a, b, u]) => '<span>' + n + ' <b>' + a + ' → ' + b + ' ' + u + '</b></span>').join('');
    };
    $('mes-avant').addEventListener('change', maj); $('mes-apres').addEventListener('change', maj);
    $('mes-curseur').addEventListener('input', (e) => { const v = e.target.value; $('mes-img-apres').style.clipPath = 'inset(0 0 0 ' + v + '%)'; $('mes-barre').style.left = v + '%'; });
    maj();
  }
}
rendus.mensurations = rendreMensurations;
