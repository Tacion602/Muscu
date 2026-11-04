/* Séance de cardio : cinq types (voir TYPES_COURSE), chacun un exercice
   distinct avec ses passages. Port de la v1 sans changement de règles. */

let typeCardio = 0;

function cyclesCardio(cle) {
  if (!seance.cardio) seance.cardio = {};
  const brut = seance.cardio[cle];
  if (Array.isArray(brut)) return brut;
  seance.cardio[cle] = [brut && typeof brut === 'object' ? brut : {}];
  return seance.cardio[cle];
}

function premierPassage(cycles) {
  return (cycles || []).find((c) => c && (c.duree_min != null || c.distance_km != null)) || null;
}

function derniereSortie(cle, saufId) {
  for (const s of seancesTerminees()) {
    if (s.type !== 'cardio' || s.id === saufId) continue;
    const cycle = premierPassage((s.cardio || {})[cle]);
    if (cycle && cycle.duree_min) return cycle;
  }
  return null;
}

function typeRempli(cle) {
  return (seance.cardio[cle] || []).some((c) => c && Object.keys(c).some((k) => c[k] != null && c[k] !== '' && k !== 'activite'));
}

function rendreCardio() {
  const jour = jourDe(seance.jour);
  $('seance-titre').innerHTML = echapper(libelleJour(jour) + ' ' + seance.nom) + '<span class="sous">Course et HIIT</span>';
  $('seance-progression').style.width = '0';
  $('seance-chrono').textContent = '';
  const type = TYPES_COURSE[typeCardio];
  const corps = $('seance-corps');
  let html = '<div class="segments" id="cardio-types">' + TYPES_COURSE.map((t, i) =>
    '<button class="segment' + (i === typeCardio ? ' choisi' : '') + (typeRempli(t.cle) ? ' rempli' : '') + '" data-i="' + i + '">' + echapper(t.nom) + '</button>').join('') + '</div>';
  html += '<div class="carte" style="margin-top:10px"><h3 style="font-size:18px">' + echapper(type.complet) + '</h3>' +
    '<ul class="echauffement" style="margin-top:8px">' + type.echauffement.map((e) => '<li>' + echapper(e) + '</li>').join('') + '</ul></div>';
  html += '<div id="cardio-cycles"></div>';
  html += '<div class="nav-exo"><button class="bouton" id="cardio-ajouter">+ Passage</button><button class="bouton primaire" id="cardio-terminer">Terminer</button></div>';
  corps.innerHTML = html;
  corps.querySelectorAll('#cardio-types button').forEach((b) => b.addEventListener('click', () => { typeCardio = Number(b.dataset.i); rendreCardio(); }));
  $('cardio-ajouter').addEventListener('click', () => { cyclesCardio(type.cle).push({}); enregistrerSeance(); rendreCyclesCardio(); });
  $('cardio-terminer').addEventListener('click', terminer);
  rendreCyclesCardio();
}

function rendreCyclesCardio() {
  const type = TYPES_COURSE[typeCardio];
  const cycles = cyclesCardio(type.cle);
  const bloc = $('cardio-cycles');
  bloc.innerHTML = '';
  cycles.forEach((cycle, index) => {
    const carte = document.createElement('div');
    carte.className = 'carte cycle';
    const precedente = index === 0 ? derniereSortie(type.cle, seance.id) : null;
    let html = '<div class="entete-cycle"><span>' + (cycles.length > 1 ? 'Passage ' + (index + 1) : 'Sortie') + '</span>' +
      (cycles.length > 1 ? '<button data-suppr aria-label="Supprimer ce passage">×</button>' : '') + '</div>';
    if (type.choix) {
      if (!cycle[type.choix.cle]) cycle[type.choix.cle] = (precedente && precedente[type.choix.cle]) || type.choix.options[0];
      html += '<div class="segments" style="margin-bottom:10px">' + type.choix.options.map((o) => '<button class="segment' + (cycle[type.choix.cle] === o ? ' choisi' : '') + '" data-choix="' + echapper(o) + '">' + echapper(o) + '</button>').join('') + '</div>';
    }
    const champs = CHAMPS_FOOTING.filter((d) => !(type.sansDistance && d.cle === 'distance_km')).concat(type.champs);
    html += '<div class="grille-champs">' + champs.map((d) => '<label class="champ"><span>' + echapper(d.libelle) + '</span><input type="text" inputmode="decimal" data-cle="' + d.cle + '" value="' + (cycle[d.cle] != null ? cycle[d.cle] : '') + '" placeholder="' + (precedente && precedente[d.cle] != null ? precedente[d.cle] : '') + '"></label>').join('') + '</div>';
    html += '<p class="allure" data-allure></p><p class="comparaison" data-compare></p>';
    carte.innerHTML = html;
    const majAllure = () => {
      const a = carte.querySelector('[data-allure]'); const c = carte.querySelector('[data-compare]');
      if (!cycle.duree_min || !cycle.distance_km) { a.textContent = ''; c.textContent = ''; return; }
      const allure = cycle.duree_min / cycle.distance_km;
      a.textContent = 'Allure ' + Math.floor(allure) + ':' + String(Math.round((allure % 1) * 60)).padStart(2, '0') + ' / km';
      c.className = 'comparaison';
      if (!precedente || !precedente.distance_km) { c.textContent = ''; return; }
      const ecart = allure - precedente.duree_min / precedente.distance_km;
      const sec = Math.round(Math.abs(ecart) * 60);
      if (sec < 3) { c.textContent = 'Même allure que la dernière fois.'; return; }
      c.textContent = sec + ' s/km ' + (ecart < 0 ? 'plus rapide' : 'plus lent') + ' que la dernière sortie.';
      c.classList.add(ecart < 0 ? 'hausse' : 'baisse');
    };
    carte.querySelectorAll('input').forEach((i) => {
      i.addEventListener('focus', () => i.select());
      i.addEventListener('input', () => { cycle[i.dataset.cle] = nombreOuNull(i.value); enregistrerSeance(); majAllure(); majSegmentsCardio(); });
    });
    carte.querySelectorAll('[data-choix]').forEach((b) => b.addEventListener('click', () => {
      cycle[type.choix.cle] = b.dataset.choix; enregistrerSeance();
      carte.querySelectorAll('[data-choix]').forEach((x) => x.classList.toggle('choisi', x === b));
    }));
    const s = carte.querySelector('[data-suppr]');
    if (s) s.addEventListener('click', () => { cycles.splice(index, 1); enregistrerSeance(); rendreCyclesCardio(); });
    majAllure();
    bloc.appendChild(carte);
  });
}

function majSegmentsCardio() {
  document.querySelectorAll('#cardio-types button').forEach((b) => b.classList.toggle('rempli', typeRempli(TYPES_COURSE[Number(b.dataset.i)].cle)));
}

function resumeCardio(s) {
  s = s || seance;
  const parType = TYPES_COURSE.map((type) => ({ type, cycles: ((s.cardio || {})[type.cle] || []).filter((c) => c && (c.duree_min != null || c.distance_km != null)) })).filter((e) => e.cycles.length);
  if (!parType.length) return '<div class="carte"><p class="vide">Aucune sortie renseignée.</p></div>';
  return '<div class="carte">' + parType.map(({ type, cycles }) => cycles.map((d, i) => {
    const duree = d.duree_min || 0; const distance = d.distance_km || 0;
    let allure = '';
    if (duree && distance) { const a = duree / distance; allure = Math.floor(a) + ':' + String(Math.round((a % 1) * 60)).padStart(2, '0'); }
    const nom = (type.choix && d[type.choix.cle] ? d[type.choix.cle] : type.complet) + (cycles.length > 1 ? ', passage ' + (i + 1) : '');
    const chiffres = type.sansDistance
      ? [[duree, 'min'], [d.calories != null ? d.calories : '', 'kcal'], [d.fc_moy != null ? d.fc_moy : '', 'bpm moy'], [d.fc_max != null ? d.fc_max : '', 'bpm max']]
      : [[duree, 'min'], [distance, 'km'], [allure, 'min/km']];
    return '<div class="resume-exo"><b>' + echapper(nom) + '</b><div class="chiffres" style="margin-top:6px">' + chiffres.map(([v, u]) => '<div class="chiffre"><b>' + v + '</b><span>' + u + '</span></div>').join('') + '</div></div>';
  }).join('')).join('') + '</div>';
}
