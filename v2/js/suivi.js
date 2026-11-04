/* Suivi : tuiles d'entrée, surcharge progressive par exercice et par
   muscle (courbes à axes lisibles, fiche au point touché, lien classeur),
   calendrier, état musculaire, bilan mensuel, évolution cardio, remarque,
   séances enregistrées. */

function rendreSuivi() {
  const corps = $('suivi-corps');
  const tuiles = [
    ['surcharge', 'courbe', 'Surcharge progressive', 'Courbes par exercice et par muscle'],
    ['bilan', 'bilan', 'Bilan mensuel', 'Jours faits, volume, reculs'],
    ['calendrier', 'calendrier', 'Calendrier', 'Séances et nuits du mois'],
    ['etat', 'corps', 'État musculaire', 'Récupération par zone'],
    ['sommeil', 'lune', 'Sommeil', 'Nuit, insomnies, repères'],
    ['mensurations', 'regle', 'Mensurations', 'Mesures, poids, photos'],
    ['cardio-evolution', 'course', 'Évolution cardio', 'Vitesse par type de sortie'],
    ['historique', 'liste', 'Séances enregistrées', 'Détail et envoi au classeur'],
    ['remarque', 'message', 'Remarque', 'Un mot au développeur'],
  ];
  // Alertes du moment sous les menus (demande du 4 novembre 2026) : reculs ×2 et jours en retard.
  const alertes = [];
  programme.jours.forEach((j) => (j.exercices || []).forEach((e) => {
    const r = reculDouble(e.nom, e);
    if (r) alertes.push('<div class="alerte baisse">' + svgIcone('alerte') + '<div><b>' + echapper(e.nom) + '</b> : première série en recul deux séances de suite.</div></div>');
  }));
  programme.jours.forEach((j) => {
    if (j.type === 'gainage') return;
    const r = retardDuJour(j.code);
    if (r && r.enRetard) alertes.push('<div class="alerte attention">' + svgIcone('alerte') + '<div><b>' + echapper(j.nom) + '</b> : dernière séance ' + ilYA(r.derniere.fin) + '.</div></div>');
  });
  corps.innerHTML = '<div class="grille-suivi">' + tuiles.map(([ecran, icone, titre, sous]) =>
      '<button class="tuile" data-ecran="' + ecran + '"><span class="ic">' + svgIcone(icone) + '</span><b>' + titre + '</b><span>' + sous + '</span></button>').join('') + '</div>' +
    (alertes.length ? '<p class="titre-section">À surveiller</p><div class="liste-cartes">' + alertes.join('') + '</div>' : '');
  corps.querySelectorAll('[data-ecran]').forEach((b) => b.addEventListener('click', () => afficher(b.dataset.ecran)));
}
rendus.suivi = rendreSuivi;

/* Classe de couleur d'un écart : vert et rouge pour hausse et recul
   seulement, neutre sous le seuil (0,5 point). */
function classeEcart(ecart) {
  if (ecart == null || Math.abs(ecart) < 0.5) return '';
  return ecart > 0 ? 'hausse' : 'baisse';
}

/* ---------- Surcharge progressive ---------- */

let fenetreSurcharge = 182;
let zoneChoisie = null;

function exercicesActifs() {
  const limite = Date.now() - 21 * 86400000;
  const noms = new Map();
  programme.jours.forEach((j) => (j.exercices || []).forEach((e) => noms.set(formeDuNom(e.nom), e.nom)));
  historique().forEach((s) => { if (s.fin && new Date(s.fin).getTime() >= limite) (s.exercices || []).forEach((e) => { if (seriesDeTravail(e).length && !noms.has(formeDuNom(e.nom))) noms.set(formeDuNom(e.nom), e.nom); }); });
  return [...noms.values()];
}

/* Points de progression d'un exercice : indicateur de la première série de
   travail par séance, dans la fenêtre. */
function pointsExercice(nom, jours) {
  const fiche = ficheDuProgramme(nom);
  const limite = Date.now() - jours * 86400000;
  return occurrences(nom).filter((o) => new Date(o.quand).getTime() >= limite)
    .map((o) => ({ x: o.quand, y: indicateur(o.series[0], fiche), occ: o }))
    .filter((p) => p.y != null);
}

function ecartExercice(nom, jours) {
  const pts = pointsExercice(nom, jours);
  if (pts.length < 2) return null;
  const a = pts[0].y, b = pts[pts.length - 1].y;
  return a ? Math.round(((b - a) / a) * 1000) / 10 : null;
}

function rendreSurcharge() {
  const corps = $('surcharge-corps');
  const zones = ZONES_MUSCULAIRES.filter((z) => z.muscles);
  const ecartsZone = {};
  zones.forEach((z) => {
    const ecarts = exercicesActifs().filter((n) => { const f = ficheDuProgramme(n); return f && z.muscles.includes(formeDuNom(f.muscle)); })
      .map((n) => ecartExercice(n, fenetreSurcharge)).filter((e) => e != null);
    ecartsZone[z.cle] = ecarts.length ? Math.round((ecarts.reduce((t, e) => t + e, 0) / ecarts.length) * 10) / 10 : null;
  });
  if (!zoneChoisie) {
    const candidates = zones.filter((z) => ecartsZone[z.cle] != null).sort((a, b) => Math.abs(ecartsZone[b.cle]) - Math.abs(ecartsZone[a.cle]));
    zoneChoisie = candidates.length ? candidates[0].cle : zones[0].cle;
  }
  const classeZone = (cle) => { const e = ecartsZone[cle]; if (e == null) return 'surcharge-neutre'; return e >= 0 ? 'surcharge-hausse' : 'surcharge-baisse'; };
  const attrs = (cle) => 'class="' + classeZone(cle) + (cle === zoneChoisie ? ' selection' : '') + '" data-zone="' + cle + '" fill-opacity="' + (ecartsZone[cle] == null ? 1 : Math.max(.25, Math.min(1, Math.abs(ecartsZone[cle]) / 20))) + '"';
  const titreZone = (cle) => { const z = zones.find((x) => x.cle === cle); return z ? z.nom : cle; };

  let html = '<div class="segments" style="margin-bottom:10px"><button class="segment' + (fenetreSurcharge === 30 ? ' choisi' : '') + '" data-f="30">1 mois</button><button class="segment' + (fenetreSurcharge === 182 ? ' choisi' : '') + '" data-f="182">6 mois</button><button class="segment' + (fenetreSurcharge === 365 ? ' choisi' : '') + '" data-f="365">1 an</button></div>';
  html += '<div class="carte"><div class="mannequin-paire"><div class="mannequin-vue">Avant' + rendreMannequinPolygones(MANNEQUIN_AVANT, 'de face', attrs, titreZone) + '</div><div class="mannequin-vue">Arrière' + rendreMannequinPolygones(MANNEQUIN_ARRIERE, 'de dos', attrs, titreZone) + '</div></div>' +
    '<div class="liste-zones">' + zones.map((z) => '<button class="pastille-zone ' + (z.cle === zoneChoisie ? 'muscu-pret' : '') + '" data-zone="' + z.cle + '" style="background:' + (ecartsZone[z.cle] == null ? 'var(--fond-2)' : (ecartsZone[z.cle] >= 0 ? 'var(--hausse-fond)' : 'var(--baisse-fond)')) + (z.cle === zoneChoisie ? ';box-shadow:0 0 0 2px var(--accent)' : '') + '"><b>' + echapper(z.nom) + '</b><span>' + (ecartsZone[z.cle] == null ? 'pas assez de données' : (ecartsZone[z.cle] > 0 ? '+' : '') + formatNombre(ecartsZone[z.cle]) + ' %') + '</span></button>').join('') + '</div></div>';

  const zone = zones.find((z) => z.cle === zoneChoisie);
  const exos = exercicesActifs().filter((n) => { const f = ficheDuProgramme(n); return f && zone && zone.muscles.includes(formeDuNom(f.muscle)); })
    .sort((a, b) => pointsExercice(b, fenetreSurcharge).length - pointsExercice(a, fenetreSurcharge).length);
  html += '<p class="titre-section">' + echapper(zone ? zone.nom : '') + '</p>';
  if (!exos.length) html += '<div class="carte"><p class="vide">Aucun exercice actif pour cette zone.</p></div>';
  exos.forEach((nom) => {
    const pts = pointsExercice(nom, fenetreSurcharge);
    const fiche = ficheDuProgramme(nom);
    const ecart = ecartExercice(nom, fenetreSurcharge);
    html += '<button class="carte" data-exo="' + echapper(nom) + '" style="width:100%;text-align:left;margin-bottom:10px"><div class="exo-entete"><h3 style="font-size:16px">' + echapper(nom) + '</h3>' +
      (ecart != null ? '<span class="puce ' + classeEcart(ecart) + '">' + (ecart > 0 ? '+' : '') + formatNombre(ecart) + ' %</span>' : '<span class="puce">' + pts.length + ' séance' + (pts.length > 1 ? 's' : '') + '</span>') + '</div>' +
      '<p class="petit texte-2">' + (enSeriesLongues(fiche) ? 'Charge de la première série (séries longues)' : '1RM estimé de la première série') + '</p>' +
      (pts.length >= 2 ? courbeSvg(pts, enSeriesLongues(fiche) ? 'kg' : 'kg', -1) : '<p class="petit texte-3" style="margin-top:6px">Deux séances au moins pour tracer une courbe.</p>') + '</button>';
  });
  corps.innerHTML = html;
  corps.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { fenetreSurcharge = Number(b.dataset.f); rendreSurcharge(); }));
  corps.querySelectorAll('[data-zone]').forEach((el) => el.addEventListener('click', () => { zoneChoisie = el.dataset.zone; rendreSurcharge(); }));
  corps.querySelectorAll('[data-exo]').forEach((b) => b.addEventListener('click', () => afficher('exercice', { parametres: b.dataset.exo })));
}
rendus.surcharge = rendreSurcharge;

/* Détail d'un exercice : courbe complète, un appui sur un point ouvre la
   fiche de la séance, avec le lien vers la ligne du classeur quand le pont
   l'a renvoyée. */
let exerciceAffiche = null;
let pointChoisi = null;

function rendreExerciceDetail(nom) {
  if (nom) { exerciceAffiche = nom; pointChoisi = null; }
  nom = exerciceAffiche;
  const fiche = ficheDuProgramme(nom) || { nom };
  $('exercice-titre').textContent = nom;
  const pts = pointsExercice(nom, 3650);
  if (pointChoisi == null && pts.length) pointChoisi = pts.length - 1;
  const corps = $('exercice-corps');
  let html = '<div class="carte"><p class="petit texte-2">' + (enSeriesLongues(fiche) ? 'Charge de la première série de travail. Séries longues : la progression se juge sur la charge dans la fourchette ' + fiche.reps_min + '-' + fiche.reps_max + '.' : '1RM estimé (Epley) de la première série de travail, à RIR constant.') + '</p>' +
    (pts.length >= 2 ? courbeSvg(pts, 'kg', pointChoisi) : '<p class="vide">Deux séances au moins pour tracer une courbe.</p>') + '</div>';
  const p = pts[pointChoisi];
  if (p) {
    const s = p.occ.seance;
    const jour = jourDe(s.jour);
    const lien = lienClasseur(s);
    html += '<div class="fiche-point"><div class="petit texte-2">' + dateCourte(p.x) + ' · ' + echapper(libelleJour(jour) + ' ' + (s.nom || '')) + (s.deload ? ' · deload' : '') + '</div>' +
      '<b class="num">' + formatNombre(p.occ.series[0].charge) + ' × ' + p.occ.series[0].reps + (enSeriesLongues(fiche) ? '' : ' · e1RM ' + formatNombre(p.y) + ' kg') + '</b>' +
      (pointChoisi > 0 ? ' <span class="puce ' + classeEcart(p.y - pts[pointChoisi - 1].y) + '">' + (Math.abs(p.y - pts[pointChoisi - 1].y) < 0.5 ? 'stable' : (p.y - pts[pointChoisi - 1].y > 0 ? '+' : '') + formatNombre(p.y - pts[pointChoisi - 1].y) + ' kg') + '</span>' : '') +
      '<div class="series">' + p.occ.series.map((x) => formatNombre(x.charge) + '×' + x.reps + (x.rir != null ? ' @' + x.rir : '') + (x.restPause ? ' RP' : '')).join(' · ') + '</div>' +
      (p.occ.seance.remarque ? '<div class="petit texte-2" style="margin-top:4px">Remarque : ' + echapper(p.occ.seance.remarque) + '</div>' : '') +
      ((p.occ.seance.douleurs || []).filter((d) => memeExercice(d.exercice, nom)).map((d) => '<div class="petit" style="color:var(--baisse);margin-top:4px">Douleur : ' + echapper(d.texte) + '</div>').join('')) +
      (lien ? '<a href="' + lien + '" target="_blank" rel="noopener">Ouvrir dans le classeur</a>' : '<div class="petit texte-3" style="margin-top:6px">' + (s.envoye ? 'Ligne du classeur inconnue (séance envoyée par l\'ancien pont).' : 'Pas encore envoyée au classeur.') + '</div>') + '</div>';
  }
  if (pts.length) html += '<p class="titre-section">Toutes les séances</p><div class="carte">' + [...pts].reverse().map((q, i) => '<div class="resume-exo"><b class="num">' + dateCourte(q.x) + ' · ' + formatNombre(q.occ.series[0].charge) + ' × ' + q.occ.series[0].reps + '</b><span>' + q.occ.series.map((x) => formatNombre(x.charge) + '×' + x.reps + (x.rir != null ? ' @' + x.rir : '')).join(' · ') + '</span></div>').join('') + '</div>';
  corps.innerHTML = html;
  corps.querySelectorAll('.zone[data-index]').forEach((z) => z.addEventListener('click', () => { pointChoisi = Number(z.dataset.index); rendreExerciceDetail(); }));
}
rendus.exercice = rendreExerciceDetail;

/* Lien direct vers la ligne du classeur : id du classeur et gid des
   onglets viennent du ping du pont, le numéro de ligne de la réponse à
   l'envoi de la séance. */
function lienClasseur(s) {
  if (!reglages.classeurId || !s.lignes || !reglages.gids) return null;
  const gids = reglages.gids;
  if (s.lignes.series && gids.series) return 'https://docs.google.com/spreadsheets/d/' + reglages.classeurId + '/edit#gid=' + gids.series + '&range=A' + s.lignes.series[0] + ':N' + s.lignes.series[1];
  if (s.lignes.seance && gids.seances) return 'https://docs.google.com/spreadsheets/d/' + reglages.classeurId + '/edit#gid=' + gids.seances + '&range=A' + s.lignes.seance;
  return null;
}

/* ---------- Calendrier ---------- */

/* Icônes du calendrier par type de séance (demande du 4 novembre 2026 :
   « des icônes dans le calendrier »), même jeu de trait que le reste. */
const ICONE_TYPE = { muscu: 'halteres', cardio: 'course', gainage: 'gainage' };
/* Icône d'un jour de musculation lue dans son nom puis ses muscles, jamais
   dans son code (règle de CLAUDE.md : rien de câblé sur les codes). */
function iconeJourMuscu(jour) {
  const nom = formeDuNom(jour && jour.nom || '');
  if (/push|pouss/.test(nom)) return 'push';
  if (/pull|tirag|dos/.test(nom)) return 'pull';
  if (/jambe|bas du corps|leg/.test(nom)) return 'jambes';
  if (/haut/.test(nom)) return 'hautmax';
  const m = formeDuNom(((jour && jour.exercices || [])[0] || {}).muscle || '');
  if (/quadri|ischio|fessier|mollet/.test(m)) return 'jambes';
  if (/pector/.test(m)) return 'push';
  if (/dorsal|trap/.test(m)) return 'pull';
  return 'halteres';
}
const ICONE_CARDIO = { ef: 'course', fractionne: 'fractionne', incline: 'incline', seuil: 'seuil', hiit: 'hiit' };
const LIBELLE_CARDIO = { ef: 'Endur.', fractionne: 'Fractionné', incline: 'Incliné', seuil: 'Seuil', hiit: 'HIIT' };

/* Icône et étiquette courte d'une séance pour le calendrier. */
function iconeSeance(s) {
  if (s.type === 'gainage') return { icone: 'gainage', libelle: 'Gainage' };
  if (s.type === 'cardio') {
    const types = Object.keys(s.cardio || {}).filter((k) => (s.cardio[k] || []).some((c) => c && Object.values(c).some((v) => v != null && v !== '')));
    const t = types[0];
    return { icone: ICONE_CARDIO[t] || 'course', libelle: t ? LIBELLE_CARDIO[t] + (types.length > 1 ? ' +' + (types.length - 1) : '') : 'Cardio' };
  }
  const jour = jourDe(s.jour);
  const nom = jour ? jour.nom : s.jour;
  return { icone: iconeJourMuscu(jour), libelle: nom.length > 7 ? nom.split(/\s+/)[0] : nom };
}

let decalageMois = 0;
let afficherNuits = false;

function rendreCalendrier(param) {
  if (param === undefined && ecranActif() !== 'calendrier') decalageMois = 0;
  const corps = $('calendrier-corps');
  const parJour = {};
  seancesTerminees().forEach((s) => { const c = cleDate(new Date(s.fin)); (parJour[c] = parJour[c] || []).push(s); });
  const nuits = {};
  lireTableau(CLES.sommeil).forEach((n) => { nuits[n.cle] = true; });
  const maintenant = new Date();
  const premier = new Date(maintenant.getFullYear(), maintenant.getMonth() + decalageMois, 1);
  const annee = premier.getFullYear(), mois = premier.getMonth();
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const decalage = (premier.getDay() + 6) % 7;
  let cases = '';
  for (let i = 0; i < decalage; i++) cases += '<span class="calendrier-case vide"></span>';
  for (let j = 1; j <= nbJours; j++) {
    const cle = String(j).padStart(2, '0') + '/' + String(mois + 1).padStart(2, '0') + '/' + annee;
    const liste = parJour[cle] || [];
    const type = liste.length ? liste[0].type : '';
    cases += '<' + (liste.length ? 'button type="button" data-jour-cal="' + cle + '"' : 'span') + ' class="calendrier-case ' + type + (decalageMois === 0 && j === maintenant.getDate() ? ' aujourdhui' : '') + (afficherNuits && nuits[cle] ? ' a-sommeil' : '') + '">' +
      '<span class="num">' + j + '</span>' + (liste.length ? '<span class="ico' + (liste.length > 1 ? ' deux' : '') + '">' + liste.slice(0, 2).map((s) => { const ic = iconeSeance(s); return '<span class="' + s.type + '" title="' + echapper(ic.libelle) + '">' + svgIcone(ic.icone) + (liste.length === 1 ? '<small>' + echapper(ic.libelle) + '</small>' : '') + '</span>'; }).join('') + '</span>' : '') +
      (afficherNuits && nuits[cle] ? '<span class="nuit">' + svgIcone('lune') + '</span>' : '') +
      (liste.length > 2 ? '<span class="multi">×' + liste.length + '</span>' : '') + (liste.length ? '</button>' : '</span>');
  }
  corps.innerHTML = '<div class="carte"><div class="mois-nav"><button class="icone" id="cal-prec" aria-label="Mois précédent">' + svgIcone('retour') + '</button><b>' + premier.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '</b><button class="icone" id="cal-suiv" aria-label="Mois suivant"' + (decalageMois === 0 ? ' disabled style="opacity:.3"' : '') + '>' + svgIcone('chevron') + '</button></div>' +
    '<div class="calendrier-entetes">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => '<span>' + d + '</span>').join('') + '</div><div class="calendrier-grille">' + cases + '</div>' +
    '<label class="bascule" style="margin-top:10px"><span>Afficher les nuits renseignées</span><input type="checkbox" id="cal-nuits"' + (afficherNuits ? ' checked' : '') + '></label></div>';
  $('cal-prec').addEventListener('click', () => { decalageMois--; rendreCalendrier(null); });
  $('cal-suiv').addEventListener('click', () => { if (decalageMois < 0) { decalageMois++; rendreCalendrier(null); } });
  $('cal-nuits').addEventListener('change', (e) => { afficherNuits = e.target.checked; rendreCalendrier(null); });
  // Un appui sur un jour ouvre le détail de ses séances (demande du
  // 4 novembre 2026 : « le détail de la séance sur le dessin »).
  corps.querySelectorAll('[data-jour-cal]').forEach((b) => b.addEventListener('click', () => {
    const liste = parJour[b.dataset.jourCal] || [];
    feuille('<h3>' + echapper(b.dataset.jourCal) + '</h3>' + liste.map((s) => {
      const jour = jourDe(s.jour);
      return '<div class="carte" style="margin-top:10px"><div class="resume-exo" style="border-top:0"><b>' + echapper((libelleJour(jour) || '') + ' ' + (s.nom || s.jour)) + (s.deload ? ' <span class="puce attention">deload</span>' : '') + '</b><span class="petit texte-2">' + (s.duree_min ? s.duree_min + ' min' : '') + '</span></div>' + detailSeance(s) +
        '<div class="actions-serie"><button class="bouton petit" data-ouvrir="' + s.id + '">Ouvrir dans les séances</button></div></div>';
    }).join(''), (f, fermer) => {
      f.querySelectorAll('[data-ouvrir]').forEach((o) => o.addEventListener('click', () => { fermer(); afficher('historique', { parametres: { ouvrir: o.dataset.ouvrir } }); }));
    });
  }));
}
rendus.calendrier = rendreCalendrier;

/* ---------- État musculaire ---------- */

function rendreMannequinPolygones(donnees, libelleVue, zoneAttrs, titreZone, extra) {
  const polys = donnees.map((entree) => {
    if (!entree.zone || !zoneAttrs) return entree.points.map((p) => '<polygon class="silhouette" points="' + p + '"></polygon>').join('');
    const titre = titreZone ? '<title>' + echapper(titreZone(entree.zone)) + '</title>' : '';
    return entree.points.map((p) => '<polygon ' + zoneAttrs(entree.zone) + ' points="' + p + '">' + titre + '</polygon>').join('');
  }).join('');
  return '<svg viewBox="0 0 1000 2000" class="mannequin-svg" role="img" aria-label="Mannequin ' + libelleVue + '">' + polys + (extra || '') + '</svg>';
}

function derniereFoisZone(zone) {
  let dernier = null;
  historique().forEach((s) => {
    if (!s.fin) return;
    if (zone.mouvements) {
      if (zone.mouvements.some((cle) => ((s.mouvements || {})[cle] || []).some(valeurRenseignee)) && (!dernier || s.fin > dernier)) dernier = s.fin;
      return;
    }
    (s.exercices || []).forEach((exo) => {
      if (!zone.muscles.includes(formeDuNom(exo.muscle))) return;
      (exo.series || []).forEach((serie) => { if (serie.faite && serie.heure && !serie.echauffement && (!dernier || serie.heure > dernier)) dernier = serie.heure; });
    });
  });
  return dernier;
}

function couleurEtat(f) { return f < 0.25 ? 'muscu-fatigue' : f < 0.55 ? 'muscu-charge' : f < 0.85 ? 'muscu-recuperation' : 'muscu-pret'; }

function rendreEtat() {
  const etats = {};
  ZONES_MUSCULAIRES.forEach((z) => {
    const d = derniereFoisZone(z);
    etats[z.cle] = !d ? { fraction: 1, texte: 'jamais travaillée' } : { fraction: Math.max(0, Math.min(1, ((Date.now() - new Date(d).getTime()) / 3600000) / z.recuperation_h)), texte: ilYA(d) };
  });
  const attrs = (cle) => 'class="' + couleurEtat(etats[cle].fraction) + '" data-zone="' + cle + '"';
  const titre = (cle) => ZONES_MUSCULAIRES.find((z) => z.cle === cle).nom + ' : ' + etats[cle].texte;
  $('etat-corps').innerHTML = '<div class="carte"><p class="petit texte-2" style="margin-bottom:8px">Indicatif : chaque zone récupère à une vitesse forfaitaire (48 h petits groupes, 72 h gros) depuis sa dernière série.</p>' +
    '<div class="mannequin-paire"><div class="mannequin-vue">Avant' + rendreMannequinPolygones(MANNEQUIN_AVANT, 'de face', attrs, titre) + '</div><div class="mannequin-vue">Arrière' + rendreMannequinPolygones(MANNEQUIN_ARRIERE, 'de dos', attrs, titre) + '</div></div>' +
    '<div class="liste-zones">' + ZONES_MUSCULAIRES.map((z) => '<div class="pastille-zone ' + couleurEtat(etats[z.cle].fraction) + '"><b>' + echapper(z.nom) + '</b><span>' + echapper(etats[z.cle].texte) + '</span></div>').join('') + '</div></div>';
}
rendus.etat = rendreEtat;

/* ---------- Bilan mensuel ---------- */

function rendreBilan() {
  const corps = $('bilan-corps');
  const debut = Date.now() - 28 * 86400000;
  const recentes = seancesTerminees().filter((s) => new Date(s.fin).getTime() >= debut);
  const parJour = {};
  recentes.forEach((s) => { const c = codeCanonique(s.jour); parJour[c] = (parJour[c] || 0) + 1; });
  let html = '<div class="carte"><h3 style="font-size:16px;margin-bottom:8px">Quatre dernières semaines</h3><div class="chiffres"><div class="chiffre"><b>' + recentes.length + '</b><span>séances</span></div><div class="chiffre"><b>' + recentes.filter((s) => s.type === 'muscu').length + '</b><span>musculation</span></div><div class="chiffre"><b>' + recentes.filter((s) => s.type === 'cardio').length + '</b><span>cardio</span></div></div></div>';

  const vus = new Set();
  html += '<p class="titre-section">Jours du programme</p><div class="carte">' + programme.jours.filter((j) => { if (j.type === 'gainage') return false; const c = codeCanonique(j.code); if (vus.has(c)) return false; vus.add(c); return true; }).map((j) => {
    const n = parJour[codeCanonique(j.code)] || 0;
    const attendu = 4;
    return '<div class="barre-volume"><span>' + echapper(j.nom) + '</span><div class="jauge"><i style="width:' + Math.min(100, (n / attendu) * 100) + '%;background:' + (n >= attendu - 1 ? 'var(--hausse)' : 'var(--baisse)') + '"></i></div><span class="val">' + n + ' / ' + attendu + '</span></div>';
  }).join('') + '</div>';

  const volume = volumeParMuscle();
  const maxV = Math.max(1, ...volume.map((v) => Math.max(v.prescrit, v.realise)));
  html += '<p class="titre-section">Séries par semaine et par muscle</p><div class="carte"><p class="petit texte-2" style="margin-bottom:6px">Barre bleue : prescrit par le programme. Trait vert : réalisé en moyenne sur quatre semaines. Ordre : tes priorités.</p>' +
    volume.map((v) => '<div class="barre-volume"><span style="text-transform:capitalize">' + echapper(v.muscle) + '</span><div class="jauge"><i style="width:' + (v.prescrit / maxV) * 100 + '%"></i><i class="realise" style="width:' + (v.realise / maxV) * 100 + '%"></i></div><span class="val">' + formatNombre(v.realise) + ' / ' + v.prescrit + '</span></div>').join('') + '</div>';

  const reculs = [];
  programme.jours.forEach((j) => (j.exercices || []).forEach((e) => { if (reculDouble(e.nom, e)) reculs.push(e.nom); }));
  const progres = exercicesActifs().map((n) => ({ nom: n, ecart: ecartExercice(n, 28) })).filter((x) => x.ecart != null).sort((a, b) => b.ecart - a.ecart);
  html += '<p class="titre-section">Progression sur le mois</p><div class="carte">' +
    (progres.length ? progres.map((p) => '<div class="rangee" style="min-height:40px"><div class="tx"><b>' + echapper(p.nom) + '</b></div><span class="puce ' + classeEcart(p.ecart) + '">' + (p.ecart > 0 ? '+' : '') + formatNombre(p.ecart) + ' %</span></div>').join('') : '<p class="vide">Pas encore deux séances d\'un même exercice ce mois.</p>') + '</div>';
  if (reculs.length) html += '<div class="alerte baisse" style="margin-top:10px">' + svgIcone('alerte') + '<div><b>En recul deux séances de suite :</b> ' + reculs.map(echapper).join(', ') + '. Alléger la séance qui précède plutôt que changer l\'ordre.</div></div>';
  const douleurs = lireTableau(CLES.douleurs).filter((d) => new Date(d.date).getTime() >= debut);
  if (douleurs.length) html += '<p class="titre-section">Douleurs notées</p><div class="carte">' + douleurs.map((d) => '<div class="resume-exo"><b>' + echapper(d.exercice) + '</b><span>' + dateCourte(d.date) + ' : ' + echapper(d.texte) + '</span></div>').join('') + '</div>';
  corps.innerHTML = html;
  poserIcones(corps);
}
rendus.bilan = rendreBilan;

/* ---------- Évolution cardio ---------- */

let typeEvolution = 'ef';
function rendreCardioEvolution() {
  const corps = $('cardio-evolution-corps');
  const types = TYPES_COURSE.filter((t) => !t.sansDistance);
  const pts = [];
  [...seancesTerminees()].reverse().forEach((s) => {
    if (s.type !== 'cardio') return;
    const c = premierPassage((s.cardio || {})[typeEvolution]);
    if (c && c.duree_min && c.distance_km) pts.push({ x: s.fin, y: Math.round((c.distance_km / (c.duree_min / 60)) * 10) / 10, c });
  });
  corps.innerHTML = '<div class="segments" style="margin-bottom:10px">' + types.map((t) => '<button class="segment' + (t.cle === typeEvolution ? ' choisi' : '') + '" data-t="' + t.cle + '">' + echapper(t.nom) + '</button>').join('') + '</div>' +
    '<div class="carte"><p class="petit texte-2">Vitesse du premier passage, en km/h : plus haut, plus rapide.</p>' + (pts.length >= 2 ? courbeSvg(pts, 'km/h', pts.length - 1) : '<p class="vide">Deux sorties au moins pour tracer une courbe.</p>') + '</div>' +
    '<div class="carte" style="margin-top:10px">' + [...pts].reverse().map((p) => { const a = p.c.duree_min / p.c.distance_km; return '<div class="resume-exo"><b class="num">' + dateCourte(p.x) + ' · ' + p.c.distance_km + ' km en ' + p.c.duree_min + ' min</b><span>' + Math.floor(a) + ':' + String(Math.round((a % 1) * 60)).padStart(2, '0') + ' / km · ' + p.y + ' km/h</span></div>'; }).join('') + '</div>';
  corps.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { typeEvolution = b.dataset.t; rendreCardioEvolution(); }));
}
rendus['cardio-evolution'] = rendreCardioEvolution;

/* ---------- Remarque ---------- */

function rendreRemarque() {
  const corps = $('remarque-corps');
  const attente = lireTableau(CLES.remarques).filter((r) => !r.envoyee);
  corps.innerHTML = '<div class="carte"><p class="petit texte-2" style="margin-bottom:8px">Pour le développeur : douleur, gêne, idée. Part au classeur à la prochaine synchronisation.</p><textarea id="remarque-texte" rows="5" style="width:100%"></textarea>' +
    '<div class="actions-serie"><button class="bouton primaire large" id="remarque-envoyer">Envoyer</button></div>' +
    (attente.length ? '<p class="petit texte-2" style="margin-top:8px">' + attente.length + ' remarque' + (attente.length > 1 ? 's' : '') + ' en attente d\'envoi.</p>' : '') + '</div>';
  $('remarque-envoyer').addEventListener('click', async () => {
    const t = $('remarque-texte').value.trim();
    if (!t) return;
    const toutes = lireTableau(CLES.remarques);
    toutes.push({ id: 'R' + Date.now(), texte: t, date: new Date().toISOString(), envoyee: false });
    ecrire(CLES.remarques, toutes);
    $('remarque-texte').value = '';
    try { await synchroniser(); } catch (e) { /* reste en attente */ }
    toast(lireTableau(CLES.remarques).some((r) => !r.envoyee) ? 'Remarque gardée, envoi en attente.' : 'Remarque envoyée.');
    rendreRemarque();
  });
}
rendus.remarque = rendreRemarque;

/* ---------- Séances enregistrées ---------- */

function rendreHistorique(param) {
  const corps = $('historique-corps');
  const toutes = seancesTerminees();
  const attente = toutes.filter((s) => !s.envoye).length;
  let html = '<div class="etat-envoi" style="justify-content:flex-start;margin:0 0 10px">' + svgIcone('cloud') + (attente ? attente + ' séance' + (attente > 1 ? 's' : '') + ' en attente d\'envoi' : (toutes.length ? 'Classeur à jour' : 'Aucune séance')) +
    (attente && reglages.pont ? ' <button class="bouton petit" id="hist-sync" style="margin-left:auto">Envoyer</button>' : '') + '</div>';
  html += '<div class="historique-liste">' + toutes.slice(0, 60).map((s) => {
    const jour = jourDe(s.jour);
    const ouvert = param && param.ouvrir === s.id;
    return '<details class="seance-h"' + (ouvert ? ' open' : '') + ' data-id="' + s.id + '"><summary><div class="ic" style="width:40px;height:40px;border-radius:10px;background:var(--accent-fond);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">' + echapper(libelleJour(jour) || '?') + '</div><div class="tx" style="flex:1"><b style="font-weight:500">' + echapper(s.nom || s.jour) + (s.deload ? ' <span class="puce attention">deload</span>' : '') + '</b><span class="petit texte-2">' + dateCourte(s.fin) + (s.duree_min ? ' · ' + s.duree_min + ' min' : '') + '</span></div><span class="puce ' + (s.envoye ? 'hausse' : 'attention') + '">' + (s.envoye ? 'envoyée' : 'en attente') + '</span></summary>' +
      '<div class="detail">' + detailSeance(s) + '<div class="actions-serie"><button class="bouton petit danger" data-suppr="' + s.id + '">Supprimer</button></div></div></details>';
  }).join('') + '</div>';
  corps.innerHTML = html;
  poserIcones(corps);
  const sync = $('hist-sync');
  if (sync) sync.addEventListener('click', async () => { sync.disabled = true; try { await synchroniser(); } catch (e) { toast('Envoi impossible : ' + e.message, 4000); } rendreHistorique(); });
  corps.querySelectorAll('[data-suppr]').forEach((b) => b.addEventListener('click', () => {
    const s = toutes.find((x) => x.id === b.dataset.suppr);
    confirmer('Supprimer cette séance ?', s.envoye ? 'Elle reste dans le classeur, qui n\'est jamais réécrit.' : 'Elle n\'a pas été envoyée au classeur et sera perdue.', 'Supprimer', () => {
      ecrire(CLES.historique, historique().filter((x) => x.id !== s.id));
      rendreHistorique();
    }, true);
  }));
  if (param && param.ouvrir) { const d = corps.querySelector('[data-id="' + param.ouvrir + '"]'); if (d) d.scrollIntoView({ block: 'start' }); }
}
rendus.historique = rendreHistorique;

function detailSeance(s) {
  if (s.type === 'cardio') return resumeCardio(s);
  if (s.type === 'gainage') return resumeGainage(s);
  const faits = (s.exercices || []).filter((e) => e.series.some((x) => x.faite));
  return faits.map((e) => '<div class="resume-exo"><b>' + echapper(e.nom) + (e.remplace ? ' <span class="texte-2 petit">(à la place de ' + echapper(e.remplace) + ')</span>' : '') + '</b><span>' +
    e.series.filter((x) => x.faite).map((x) => formatNombre(x.charge) + '×' + x.reps + (x.rir != null ? ' @' + x.rir : '') + (x.restPause ? ' RP' : '')).join(' · ') + '</span></div>').join('') +
    ((s.douleurs || []).length ? '<p class="petit" style="color:var(--baisse);margin-top:6px">Douleur : ' + s.douleurs.map((d) => echapper(d.exercice + ' (' + d.texte + ')')).join(', ') + '</p>' : '') +
    (lienClasseur(s) ? '<a class="petit" style="color:var(--accent);display:inline-block;margin-top:6px" href="' + lienClasseur(s) + '" target="_blank" rel="noopener">Ouvrir dans le classeur</a>' : '');
}
