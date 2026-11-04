/* Réglages et synchronisation avec le pont v2. */

function rendreReglages() {
  const corps = $('reglages-corps');
  const m = lire(CLES.migration, null);
  corps.innerHTML =
    '<p class="titre-section">Classeur</p><div class="reglages-groupe">' +
    '<label class="champ"><span>Adresse du pont (déploiement Apps Script v2)</span><input type="url" id="r-pont" value="' + echapper(reglages.pont || '') + '" placeholder="https://script.google.com/macros/s/.../exec"></label>' +
    '<label class="champ"><span>Mot de passe du pont</span><input type="password" id="r-secret" value="' + echapper(reglages.secret || '') + '"></label>' +
    '<div class="champ"><button class="bouton" id="r-tester">Tester la connexion</button><p class="etat-pont" id="r-etat">' + (reglages.classeurId ? 'Classeur relié : ' + echapper(reglages.classeurNom || reglages.classeurId) : 'Pas encore relié.') + '</p></div>' +
    '<div class="champ"><button class="bouton" id="r-programme">Sauvegarder le programme dans le classeur</button></div>' +
    '</div>' +
    '<p class="titre-section">Séance</p><div class="reglages-groupe">' +
    bascule('son', 'Signal sonore en fin de repos') + bascule('vibration', 'Vibration à la validation et en fin de repos') +
    bascule('veille', 'Garder l\'écran allumé en séance') + bascule('clavierPendantRecup', 'Clavier ouvert pendant le repos') + '</div>' +
    '<p class="titre-section">Données</p><div class="reglages-groupe">' +
    '<div class="champ"><p class="petit texte-2">' + (m ? 'Historique repris de l\'ancienne application le ' + dateCourte(m.quand) + ' (' + m.seances + ' séances).' : 'Aucune reprise effectuée.') + ' ' + historique().length + ' séances sur ce téléphone.</p></div>' +
    '<div class="champ"><button class="bouton" id="r-export">Exporter les données (fichier JSON)</button></div>' +
    '<div class="champ"><button class="bouton" id="r-reimporter"' + (lireTableau(CLES_V1.historique).length ? '' : ' disabled') + '>Reprendre à nouveau l\'historique v1</button></div>' +
    '<div class="champ"><button class="bouton" id="r-renvoyer">Renvoyer tout l\'historique au classeur</button><p class="petit texte-2">Pour remplir le nouveau classeur avec les séances déjà faites. Le pont ignore ce qu\'il a déjà écrit.</p></div>' +
    '</div>' +
    '<p class="petit texte-3" style="margin-top:16px;text-align:center">Muscu v2 · version ' + echapper(versionApp || 'non installée') + ' · ' + echapper(programme.nom || 'programme') + ' importé le ' + (programme.importe_le ? dateCourte(programme.importe_le) : '?') + '</p>';
  ['pont', 'secret'].forEach((c) => $('r-' + c).addEventListener('change', (e) => { reglages[c] = e.target.value.trim(); sauverReglages(); }));
  corps.querySelectorAll('[data-bascule]').forEach((i) => i.addEventListener('change', () => { reglages[i.dataset.bascule] = i.checked; sauverReglages(); }));
  $('r-tester').addEventListener('click', async () => {
    const etat = $('r-etat');
    etat.textContent = 'Connexion…';
    try {
      const r = await envoyer({ action: 'ping' });
      reglages.classeurId = r.id || ''; reglages.classeurNom = r.classeur || ''; reglages.gids = r.gids || {};
      sauverReglages();
      etat.textContent = 'Classeur relié : ' + r.classeur + ' (pont ' + (r.version || '?') + ').';
    } catch (e) { etat.textContent = 'Échec : ' + e.message; }
  });
  $('r-programme').addEventListener('click', async () => {
    try { await envoyer({ action: 'programme', programme }); toast('Programme sauvegardé dans le classeur.'); } catch (e) { toast('Échec : ' + e.message, 4000); }
  });
  $('r-export').addEventListener('click', () => {
    const donnees = {}; Object.values(CLES).forEach((c) => { donnees[c] = lire(c, null); });
    const blob = new Blob([JSON.stringify(donnees)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'muscu2-' + cleDate(new Date()).replace(/\//g, '-') + '.json'; a.click();
  });
  $('r-reimporter').addEventListener('click', () => confirmer('Reprendre l\'historique v1 ?', 'Les séances v1 absentes de la v2 seront ajoutées ; rien n\'est effacé.', 'Reprendre', () => {
    const connues = new Set(historique().map((s) => s.id));
    const ajout = lireTableau(CLES_V1.historique).filter((s) => !connues.has(s.id)).map(normaliserSeanceV1);
    ecrire(CLES.historique, historique().concat(ajout));
    toast(ajout.length + ' séance' + (ajout.length > 1 ? 's' : '') + ' ajoutée' + (ajout.length > 1 ? 's' : '') + '.');
    rendreReglages();
  }));
  $('r-renvoyer').addEventListener('click', () => confirmer('Renvoyer tout l\'historique ?', historique().length + ' séances partiront vers le pont v2, par lots.', 'Renvoyer', async () => {
    const toutes = historique().filter((s) => s.fin);
    toutes.forEach((s) => { s.envoye = false; });
    ecrire(CLES.historique, toutes);
    try { const n = await synchroniser(); toast(n + ' séances envoyées.'); } catch (e) { toast('Échec : ' + e.message, 4000); }
  }));
}
rendus.reglages = rendreReglages;

function bascule(cle, libelle) {
  return '<label class="bascule"><span>' + libelle + '</span><input type="checkbox" data-bascule="' + cle + '"' + (reglages[cle] ? ' checked' : '') + '></label>';
}

function brancherReglages() { /* rien à brancher avant le rendu */ }

/* ---------- Pont ---------- */

async function envoyer(charge) {
  if (!reglages.pont) throw new Error('adresse du pont absente');
  const reponse = await fetch(reglages.pont, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ secret: reglages.secret }, charge)),
    redirect: 'follow',
  });
  if (!reponse.ok) throw new Error('le pont a répondu ' + reponse.status);
  const r = await reponse.json();
  if (!r.ok) throw new Error(r.erreur || 'réponse inattendue du pont');
  return r;
}

let synchroEnCours = null;
async function synchroniser() {
  if (!reglages.pont) return 0;
  if (synchroEnCours) return synchroEnCours;
  synchroEnCours = (async () => {
    let envoyees = 0;
    const toutes = historique();
    const attente = toutes.filter((s) => s.fin && !s.envoye).sort((a, b) => new Date(a.fin) - new Date(b.fin));
    // Par lots de 20 : la reprise d'un historique entier ne tient pas dans
    // une seule requête Apps Script.
    for (let i = 0; i < attente.length; i += 20) {
      const lot = attente.slice(i, i + 20);
      const r = await envoyer({ action: 'historique', seances: lot });
      lot.forEach((s) => { s.envoye = true; s.envoye_le = new Date().toISOString(); s.lignes = (r.lignes || {})[s.id] || s.lignes || null; envoyees++; });
      ecrire(CLES.historique, toutes);
    }
    if (reglages.consignesAEnvoyer) {
      const c = lire(CLES.consignes, {}) || {};
      await envoyer({ action: 'consignes', consignes: Object.keys(c).map((k) => ({ jour: k.split('|')[0], exercice: k.split('|').slice(1).join('|'), texte: c[k] })) });
      reglages.consignesAEnvoyer = false; sauverReglages();
    }
    if (reglages.reglagesMachineAEnvoyer) {
      const r = lire(CLES.reglagesMachine, {}) || {};
      await envoyer({ action: 'reglages', reglages: Object.keys(r).map((k) => ({ exercice: k, texte: r[k] })) });
      reglages.reglagesMachineAEnvoyer = false; sauverReglages();
    }
    const douleurs = lireTableau(CLES.douleurs);
    if (douleurs.some((d) => !d.envoyee)) {
      await envoyer({ action: 'douleurs', douleurs: douleurs.map((d) => ({ exercice: d.exercice, date: dateCourte(d.date), jour: d.jour, texte: d.texte, seance: d.seance })) });
      douleurs.forEach((d) => { d.envoyee = true; }); ecrire(CLES.douleurs, douleurs);
    }
    if (reglages.sommeilAEnvoyer) {
      await envoyer({ action: 'sommeil', nuits: lireTableau(CLES.sommeil) });
      reglages.sommeilAEnvoyer = false; sauverReglages();
    }
    const mens = lireTableau(CLES.mensurations);
    for (const m of mens.filter((x) => !x.envoyee)) {
      await envoyer({ action: 'mensuration', mensuration: m });
      m.envoyee = true; ecrire(CLES.mensurations, mens);
    }
    const remarques = lireTableau(CLES.remarques);
    for (const r of remarques.filter((x) => !x.envoyee)) {
      await envoyer({ action: 'remarque', texte: r.texte, jour: '(Suivi)' });
      r.envoyee = true; ecrire(CLES.remarques, remarques);
    }
    return envoyees;
  })();
  try { return await synchroEnCours; } finally { synchroEnCours = null; }
}
