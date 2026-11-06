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
    bascule('notification', 'Notification en fin de repos (vibre aussi écran verrouillé)') +
    bascule('veille', 'Garder l\'écran allumé en séance') + bascule('clavierPendantRecup', 'Clavier ouvert pendant le repos') +
    (navigateurSansVibration() ? '<div class="champ"><p class="petit texte-2" id="r-sans-vibration">Firefox ignore la vibration demandée par une page, notification comprise : ces cases ne font pas vibrer. Pour vibrer, installer l\'application depuis Chrome (exporter puis restaurer les données), ou activer la vibration des notifications de Firefox dans les paramètres Android. Le signal sonore fonctionne.</p></div>' : '') + '</div>' +
    '<p class="titre-section">Données</p><div class="reglages-groupe">' +
    '<div class="champ"><p class="petit texte-2">' + (m ? 'Historique repris de l\'ancienne application le ' + dateCourte(m.quand) + ' (' + m.seances + ' séances).' : 'Aucune reprise effectuée.') + ' ' + historique().length + ' séances sur ce téléphone.</p></div>' +
    '<div class="champ"><button class="bouton" id="r-export">Exporter les données (fichier JSON)</button></div>' +
    '<div class="champ"><button class="bouton" id="r-importer">Restaurer depuis un fichier JSON</button><p class="petit texte-2">Reprend un export fait depuis cette application. Les séances déjà présentes sont conservées, les doublons ignorés.</p></div>' +
    '<div class="champ"><button class="bouton" id="r-reimporter"' + (lireTableau(CLES_V1.historique).length ? '' : ' disabled') + '>Reprendre à nouveau l\'historique v1</button></div>' +
    '<div class="champ"><button class="bouton" id="r-renvoyer">Renvoyer tout l\'historique au classeur</button><p class="petit texte-2">Pour remplir le nouveau classeur avec les séances déjà faites. Le pont ignore ce qu\'il a déjà écrit.</p></div>' +
    '</div>' +
    '<p class="petit texte-3" style="margin-top:16px;text-align:center">Muscu v2 · version <span id="reglages-version">' + echapper(versionApp || 'non installée') + '</span> · ' + echapper(programme.nom || 'programme') + ' importé le ' + (programme.importe_le ? dateCourte(programme.importe_le) : '?') + '</p>';
  ['pont', 'secret'].forEach((c) => $('r-' + c).addEventListener('change', (e) => { reglages[c] = e.target.value.trim(); sauverReglages(); }));
  corps.querySelectorAll('[data-bascule]').forEach((i) => i.addEventListener('change', async () => {
    // La notification demande d'abord la permission du navigateur.
    if (i.dataset.bascule === 'notification' && i.checked) {
      if (!('Notification' in window)) { i.checked = false; toast('Notifications non prises en charge par ce navigateur.', 3500); }
      else if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') {
        i.checked = false; toast('Autorisation refusée : pas de notification de fin de repos.', 3500);
      }
    }
    reglages[i.dataset.bascule] = i.checked; sauverReglages();
  }));
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
  // Restauration d'un export (ajouté le 4 novembre 2026, après un
  // effacement des données du site pour débloquer une mise à jour) : les
  // listes à identifiant fusionnent sans doublon, le reste n'est repris
  // que s'il est vide ici, pour ne jamais écraser une saisie plus récente.
  $('r-importer').addEventListener('click', () => $('reglages-fichier').click());
  $('reglages-fichier').onchange = () => {
    const f = $('reglages-fichier').files[0]; if (!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      let d; try { d = JSON.parse(lecteur.result); } catch (e) { toast('Fichier illisible.'); return; }
      let seances = 0;
      Object.values(CLES).forEach((c) => {
        if (!(c in d) || d[c] == null || c === CLES.migration) return;
        const actuel = lire(c, null);
        if (Array.isArray(d[c]) && Array.isArray(actuel) && d[c].length && d[c][0] && (d[c][0].id || d[c][0].cle)) {
          const k = d[c][0].id ? 'id' : 'cle';
          const connus = new Set(actuel.map((x) => x[k]));
          const ajout = d[c].filter((x) => !connus.has(x[k]));
          if (c === CLES.historique) seances = ajout.length;
          ecrire(c, actuel.concat(ajout));
        } else if (actuel == null || (Array.isArray(actuel) && !actuel.length)) {
          ecrire(c, d[c]);
        } else if (!Array.isArray(actuel) && typeof actuel === 'object' && !Array.isArray(d[c]) && typeof d[c] === 'object') {
          // Objets (réglages, consignes, réglages machine, douleurs) : champ par
          // champ, la valeur du téléphone gardée quand elle existe déjà.
          const fusion = Object.assign({}, d[c]);
          Object.keys(actuel).forEach((k) => { if (actuel[k] !== undefined && actuel[k] !== null && actuel[k] !== '') fusion[k] = actuel[k]; });
          ecrire(c, fusion);
        }
      });
      if (!lire(CLES.migration, null)) ecrire(CLES.migration, { quand: new Date().toISOString(), seances: 0, source: 'restauration' });
      reglages = Object.assign({}, REGLAGES_PAR_DEFAUT, lire(CLES.reglages, {}) || {});
      $('reglages-fichier').value = '';
      toast('Restauré : ' + seances + ' séance' + (seances > 1 ? 's' : '') + ' ajoutée' + (seances > 1 ? 's' : '') + '.', 4000);
      setTimeout(() => location.reload(), 1500);
    };
    lecteur.readAsText(f);
  };
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

/* Firefox ignore navigator.vibrate et la vibration des notifications
   (désactivées sur Android depuis la version 79, ignorées partout depuis
   la 129, bug Mozilla 1900037), tout en exposant l'API : seule la chaîne
   du navigateur le dit. Constat du 6 novembre 2026 sur le Pixel. */
function navigateurSansVibration() {
  return /Firefox\//.test(navigator.userAgent);
}

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
