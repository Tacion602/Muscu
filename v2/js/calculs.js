/* Calculs d'entraînement de la v2 : indicateur de progression, charge
   suggérée, alertes. Fonctions pures, testables sans écran. Les règles
   sont celles validées avec l'utilisateur le 4 novembre 2026 (voir
   CLAUDE.md, « Version 2 »). */

/* 1RM estimé par la formule d'Epley. Fiable sous 10 à 12 répétitions, de
   moins en moins au-delà : c'est pourquoi la comparaison bascule sur une
   règle de fourchette pour les exercices prescrits en séries longues. */
function e1rm(charge, reps) {
  if (charge == null || reps == null || !reps) return null;
  return Math.round(charge * (1 + reps / 30) * 10) / 10;
}

/* Pas de charge selon le matériel : 2,5 kg à la barre, aux haltères et aux
   poulies ; 5 kg sur les grosses machines guidées. Lu dans le nom.
   Les tractions passent avant : faites au poids de corps puis lestées
   (charge saisie = poids réellement soulevé), elles montent par 2,5 kg
   de lest, même si leur nom contient encore « machine » (5 novembre 2026). */
function pasDeCharge(nomExo) {
  const f = formeDuNom(nomExo);
  if (/traction/.test(f)) return 2.5;
  if (/presse|hack|squat|machine|tirage|rowing|extension jambes|leg curl|hanche|mollets/.test(f)) return 5;
  if (/halter|curl|elevation|poulie|face pull|ecarte|dips|banc|overhead|corde/.test(f)) return 2.5;
  return 2.5;
}

/* Un exercice en séries longues (haut de fourchette au-delà de 12) se
   compare par la règle de fourchette, pas par le 1RM estimé. */
function enSeriesLongues(fiche) {
  return !!fiche && fiche.reps_max != null && fiche.reps_max > 12;
}

/* Indicateur de progression d'une série : e1RM pour les fourchettes
   courtes, charge pour les fourchettes longues (les répétitions y sont
   jugées par la règle de fourchette, voir comparerSeries). */
function indicateur(serie, fiche) {
  if (!serie || serie.charge == null || serie.reps == null) return null;
  return enSeriesLongues(fiche) ? serie.charge : e1rm(serie.charge, serie.reps);
}

/* Compare deux séries de même rang. Renvoie { sens: 'hausse'|'baisse'|'stable',
   texte, indicatif } ; `indicatif` quand le RIR diffère de plus d'un cran. */
function comparerSeries(maintenant, avant, fiche) {
  if (!maintenant || !avant || maintenant.charge == null || avant.charge == null ||
      maintenant.reps == null || avant.reps == null) return null;
  const indicatif = maintenant.rir != null && avant.rir != null && Math.abs(maintenant.rir - avant.rir) >= 2;
  if (enSeriesLongues(fiche)) {
    // Règle de fourchette : charge montée et répétitions restées dans la
    // fourchette prescrite = progrès ; charge égale, plus de répétitions =
    // progrès ; sinon recul si charge ou répétitions baissent.
    const dansFourchette = fiche.reps_min == null || maintenant.reps >= fiche.reps_min;
    if (maintenant.charge > avant.charge && dansFourchette) return { sens: 'hausse', texte: '+' + formatNombre(maintenant.charge - avant.charge) + ' kg', indicatif };
    if (maintenant.charge === avant.charge && maintenant.reps > avant.reps) return { sens: 'hausse', texte: '+' + (maintenant.reps - avant.reps) + ' rep', indicatif };
    if (maintenant.charge < avant.charge || (maintenant.charge === avant.charge && maintenant.reps < avant.reps)) {
      return { sens: 'baisse', texte: maintenant.charge < avant.charge ? formatNombre(maintenant.charge - avant.charge) + ' kg' : (maintenant.reps - avant.reps) + ' rep', indicatif };
    }
    return { sens: 'stable', texte: 'comme la dernière fois', indicatif };
  }
  const a = e1rm(maintenant.charge, maintenant.reps);
  const b = e1rm(avant.charge, avant.reps);
  const ecart = Math.round((a - b) * 10) / 10;
  if (Math.abs(ecart) < 0.5) return { sens: 'stable', texte: 'e1RM stable', indicatif };
  return { sens: ecart > 0 ? 'hausse' : 'baisse', texte: (ecart > 0 ? '+' : '') + formatNombre(ecart) + ' kg e1RM', indicatif };
}

/* Objectif de la séance pour un exercice (double progression), série par
   série (règle du 6 novembre 2026, l'utilisateur : « les premières séries
   sont toujours des vraies séries », et la montée se juge sur les deux
   dernières, pas sur toutes) :
   - si les deux dernières séries de travail ont atteint reps_max, avec un
     RIR réel inférieur ou égal à la cible (ou non saisi) : chaque série
     reprend sa charge de la dernière fois + un pas, viser reps_min ;
   - sinon : chaque série reprend sa charge de la dernière fois, viser une
     répétition de plus sur la première (plafonné à reps_max).
   `charges[i]` est la charge proposée pour la série i (une série en plus
   reprend la dernière charge connue) ; `charge` celle de la première.
   Sans historique : rien à suggérer, on renvoie null. */
function objectifExercice(fiche, derniere) {
  if (!fiche || !derniere || !derniere.series.length) return null;
  const series = derniere.series;
  const pas = pasDeCharge(fiche.nom);
  const n = Math.max(series.length, fiche.series || 0);
  const debutJuge = Math.max(0, series.length - 2);
  const jugees = series.slice(debutJuge);
  const auMax = fiche.reps_max != null && jugees.every((s) => s.reps != null && s.reps >= fiche.reps_max);
  const rirOk = jugees.every((s, k) => {
    const i = debutJuge + k;
    const cible = fiche.rir && fiche.rir.length ? fiche.rir[Math.min(i, fiche.rir.length - 1)] : null;
    return s.rir == null || cible == null || s.rir <= cible;
  });
  const monte = auMax && rirOk;
  const charges = [];
  for (let i = 0; i < n; i++) {
    const base = series[Math.min(i, series.length - 1)].charge;
    charges.push(base == null ? null : Math.round((base + (monte ? pas : 0)) * 100) / 100);
  }
  const deux = jugees.length > 1 ? 'deux dernières séries' : 'dernière série';
  if (monte) {
    return {
      charge: charges[0], charges,
      reps: fiche.reps_min != null ? fiche.reps_min : series[0].reps,
      raison: 'Dernière fois, ' + deux + ' à ' + fiche.reps_max + ' : +' + formatNombre(pas) + ' kg sur chaque série.',
      monte: true,
    };
  }
  const premiere = series[0];
  const repsCible = fiche.reps_max != null ? Math.min(fiche.reps_max, premiere.reps + 1) : premiere.reps + 1;
  return {
    charge: charges[0], charges,
    reps: repsCible,
    raison: 'Mêmes charges, viser ' + repsCible + ' sur la première série' +
      (fiche.reps_max != null ? ' (' + deux + ' à ' + fiche.reps_max + ' pour monter).' : '.'),
    monte: false,
  };
}

/* Garde-fou de saisie : une charge hors de 0,6 à 1,4 fois la dernière est
   probablement une erreur de frappe ou une autre machine. La référence est
   la série la plus lourde de la dernière fois, comme pour la charge
   suggérée (objectifExercice) : comparée à la première série, une séance
   en pyramide (45 puis 55, 55) faisait suggérer 60 kg et signaler 65 kg
   « contre 45 kg » (remarque du 6 novembre 2026, extension jambes). */
function chargeDeReference(derniere) {
  if (!derniere || !derniere.series.length) return null;
  const charges = derniere.series.map((s) => s.charge).filter((c) => c != null);
  return charges.length ? Math.max(...charges) : null;
}

function chargeAberrante(charge, derniere) {
  if (charge == null || !derniere || !derniere.series.length) return false;
  const ref = chargeDeReference(derniere);
  if (!ref) return false;
  return charge < ref * 0.6 || charge > ref * 1.4;
}

/* Recul de la première série deux séances de suite : la règle écrite pour
   le tirage vertical (voir CLAUDE.md, priorités musculaires), appliquée à
   tous les exercices. */
function reculDouble(nomExo, fiche) {
  const occ = occurrences(nomExo);
  if (occ.length < 3) return null;
  const [a, b, c] = occ.slice(-3);
  const cb = comparerSeries(b.series[0], a.series[0], fiche);
  const cc = comparerSeries(c.series[0], b.series[0], fiche);
  if (cb && cc && cb.sens === 'baisse' && cc.sens === 'baisse') {
    return { dates: [b.quand, c.quand], derniere: c.series[0], avant: a.series[0] };
  }
  return null;
}

/* Jour en retard : plus de 9 jours depuis la dernière séance de ce jour,
   pour un programme hebdomadaire. Fréquence sur 7 semaines : nombre de
   semaines ISO distinctes où le jour a été fait. */
const RETARD_JOURS = 9;
const FENETRE_FREQUENCE_SEMAINES = 7;

function retardDuJour(code) {
  const derniere = derniereSeanceDuJour(code);
  if (!derniere) return null;
  const j = joursDepuis(derniere.fin);
  return { jours: j, enRetard: j > RETARD_JOURS, derniere };
}

function frequenceDuJour(code) {
  const limite = Date.now() - FENETRE_FREQUENCE_SEMAINES * 7 * 86400000;
  const semaines = new Set();
  seancesTerminees().forEach((s) => {
    if (codeCanonique(s.jour) !== codeCanonique(code)) return;
    if (new Date(s.fin).getTime() < limite) return;
    const d = new Date(s.fin);
    semaines.add(d.getFullYear() + '-' + semaineIso(d));
  });
  return { faites: semaines.size, sur: FENETRE_FREQUENCE_SEMAINES };
}

/* Espacement minimal entre deux jours qui chargent le même muscle
   prioritaire (Haut max puis Push : 3 jours au moins, décision du
   26 septembre 2026). Les couples sont lus dans le programme : deux jours
   de musculation qui partagent un muscle de priorité 1. */
const ESPACEMENT_MIN_JOURS = 3;
const PRIORITES_MUSCLES = ['pectoraux', 'grand dorsal', 'deltoide lateral', 'deltoïde latéral', 'deltoide anterieur', 'biceps', 'triceps', 'quadriceps', 'grand fessier', 'mollets'];

function avertissementEspacement(code) {
  const jour = jourDe(code);
  if (!jour || jour.type !== 'muscu') return null;
  const muscles = new Set((jour.exercices || []).map((e) => formeDuNom(e.muscle)));
  const prioritaire = PRIORITES_MUSCLES[0];
  if (!muscles.has(prioritaire)) return null;
  for (const autre of programme.jours) {
    if (autre.code === code || autre.type !== 'muscu') continue;
    if (!(autre.exercices || []).some((e) => formeDuNom(e.muscle) === prioritaire)) continue;
    const derniere = derniereSeanceDuJour(autre.code);
    if (!derniere) continue;
    const ecart = joursDepuis(derniere.fin);
    if (ecart < ESPACEMENT_MIN_JOURS) {
      return { autre, jours: ecart, texte: autre.nom + ' il y a ' + ecart + ' j : garder ' + ESPACEMENT_MIN_JOURS + ' jours entre les deux séances de pectoraux.' };
    }
  }
  return null;
}

/* Volume hebdomadaire par muscle : prescrit (programme) et réalisé
   (séries faites sur les quatre dernières semaines, divisées par quatre). */
function volumeParMuscle() {
  const prescrit = {};
  programme.jours.forEach((j) => (j.exercices || []).forEach((e) => {
    const m = formeDuNom(e.muscle) || 'autre';
    prescrit[m] = (prescrit[m] || 0) + (e.series || 0);
  }));
  const realise = {};
  const limite = Date.now() - 28 * 86400000;
  historique().forEach((s) => {
    if (!s.fin || new Date(s.fin).getTime() < limite) return;
    (s.exercices || []).forEach((e) => {
      const m = formeDuNom(e.muscle) || 'autre';
      realise[m] = (realise[m] || 0) + seriesDeTravail(e).length;
    });
  });
  const muscles = new Set([...Object.keys(prescrit), ...Object.keys(realise)]);
  return [...muscles].map((m) => ({
    muscle: m, prescrit: prescrit[m] || 0, realise: Math.round(((realise[m] || 0) / 4) * 10) / 10,
    priorite: PRIORITES_MUSCLES.indexOf(m),
  })).sort((a, b) => (a.priorite === -1 ? 99 : a.priorite) - (b.priorite === -1 ? 99 : b.priorite));
}

/* Tonnage d'un exercice (somme charge × reps des séries de travail). */
function tonnageDesSeries(series) {
  return (series || []).filter((s) => s.faite && !s.echauffement)
    .reduce((t, s) => t + (s.charge || 0) * (s.reps || 0), 0);
}

/* Phrases d'ouverture de séance : ton de coach, sobre. Celle du jour change
   à chaque séance (index sur l'identifiant), jamais deux fois de suite la
   même. */
const PHRASES_OUVERTURE = [
  'Une série propre vaut mieux que deux bâclées.',
  "L'objectif du jour est écrit : tiens-t'en à la première série.",
  'Le repos fait partie de la séance. Respecte-le.',
  "Même charge que la dernière fois, c'est déjà une séance utile.",
  'Amplitude complète avant tout chiffre.',
  'Note le RIR réel, pas celui que tu voulais.',
  'La progression se juge sur des semaines, pas sur une série.',
  'Échauffe-toi comme si tu allais charger lourd. Tu vas charger lourd.',
  'Un recul noté honnêtement vaut plus qu\'un chiffre arrangé.',
  'Technique d\'abord, charge ensuite, ego nulle part.',
  // Ajouts du 5 novembre 2026, dont quelques-unes avec humour (demande de
  // l'utilisateur). Toutes écrites pour l'application, aucune attribuée.
  "L'ego veut 5 kg de plus. Le RIR veut la vérité.",
  "Si tu peux chanter pendant la série, ce n'était pas RIR 1.",
  'Respire, gaine, pousse. Dans cet ordre.',
  'Téléphone posé entre les séries. Sauf pour cette appli, évidemment.',
  'Le dernier rep moche ne compte pas. Le dernier rep propre, si.',
  'Range tes disques à la fin. Ta réputation en salle en dépend.',
  // Ajouts du 6 novembre 2026, même demande.
  'La première série donne le ton. Donne-lui un bon ton.',
  "Aujourd'hui, l'objectif est simple : battre le toi de la dernière fois, d'une répétition.",
  'Pose le téléphone, prends la barre. Dans cet ordre aussi.',
  "Si la charge te fait peur, c'est qu'elle est bien choisie. Si elle te fait rire, ajoute un disque.",
  "Le chrono de repos n'est pas une suggestion. C'est un contrat.",
  "Un échauffement raté, c'est une première série gâchée. Prends tes cinq minutes.",
  'Concentre-toi sur le muscle, pas sur le voisin de banc.',
  "Pas de héros sur la première série : c'est la dernière qui raconte l'histoire.",
  "Gaine comme si quelqu'un allait te pousser. Personne ne va te pousser. Gaine quand même.",
  "Le bruit de la barre qui retombe n'ajoute aucun kilo au carnet.",
];

/* Phrases de motivation de l'accueil et faits d'entraînement de l'écran de
   démarrage (demande du 4 novembre 2026 : « phrases motivantes et
   intéressantes »). Les faits sont restreints à ce qui est établi par des
   méta-analyses ou des essais contrôlés sur des pratiquants récréatifs ou
   intermédiaires ; aucun chiffre inventé. */
const PHRASES_MOTIVATION = [
  'Tu ne rates pas une séance. Tu la reportes, et le report a un coût.',
  'Le corps ne compte pas les excuses, il compte les séries.',
  'Chaque séance faite est un vote pour la personne que tu deviens.',
  'La charge ne monte pas toute seule : elle monte parce que tu reviens.',
  'Fais la séance moyenne. Les séances moyennes empilées font les progrès.',
  'Personne ne se souvient de la série facile. Fais la difficile proprement.',
  'La motivation est passagère ; la discipline est un rendez-vous tenu.',
  "Tu n'as pas besoin d'être prêt. Tu as besoin d'être là.",
  'Le programme est écrit. Il ne reste plus que toi.',
  'Le muscle se construit entre les séances. La séance, elle, se gagne maintenant.',
  'Une répétition de plus que la dernière fois, c\'est déjà le plan.',
  'Pas de hâte : la surcharge progressive se compte en mois.',
  'Ce que tu notes honnêtement aujourd\'hui, tu le dépasseras demain.',
  'Le repos est un outil, pas une récompense.',
  "L'échauffement est la première série. Ne la saute pas.",
  'La régularité bat l\'intensité ponctuelle, toutes les semaines.',
  // Ajouts du 5 novembre 2026, plusieurs avec humour.
  'Charger la barre prend dix secondes. Trouver une excuse, à peine moins. Charge la barre.',
  'Ta playlist est prête, tes excuses aussi. Choisis la playlist.',
  'Les haltères ne jugent pas. Le miroir, un peu.',
  'Aujourd\'hui on soulève. Demain on négocie avec les escaliers.',
  'Le RIR 0, c\'est comme le piment : un peu relève le plat, partout il le gâche.',
  'Les progrès, c\'est un livret d\'épargne : intérêts lents, mais composés.',
  'La machine à ischios t\'attend. Elle ne l\'avouera jamais, mais elle t\'attend.',
  'Personne n\'a jamais regretté une séance faite. Le canapé, lui, collectionne les regrets.',
  'Un bon carnet d\'entraînement ne ment pas. Il se tait quand tu sautes une séance, c\'est pire.',
  'Les courbatures passent. Le développé couché que tu as rajouté reste.',
  // Ajouts du 6 novembre 2026 (« plus de citations, de motivation et
  // d'humour »). Les citations attribuées sont limitées à des sources
  // vérifiables ; les autres phrases sont écrites pour l'application.
  "« Le fer ne ment jamais. » Henry Rollins, Iron and the Soul. Ton carnet non plus.",
  "« Ce qui ne me tue pas me rend plus fort. » Nietzsche. Il n'avait pas fait ta séance jambes.",
  "« Seuls les disciplinés sont libres. » Eliud Kipchoge, qui court le marathon en moins de deux heures.",
  "« Tout le monde veut être bodybuilder, mais personne ne veut soulever de lourd. » Ronnie Coleman, version polie.",
  "« Light weight, baby ! » Ronnie Coleman, à propos de charges qui ne l'étaient pas.",
  "« Nous sommes ce que nous faisons de manière répétée. » Will Durant, résumant Aristote, à qui on la prête souvent.",
  "Arnold disait que les trois ou quatre dernières répétitions font le muscle. Ton RIR 2 dit que tu n'en es pas loin.",
  'La salle est ouverte, la barre est libre, et ton futur toi prend des notes.',
  "Le meilleur programme est celui que tu suis. Le deuxième meilleur, c'est celui-ci.",
  'Personne ne devient fort en lisant son programme. Même bien imprimé.',
  'Tes muscles ne savent pas quel jour on est. Ils savent seulement si tu es venu.',
  "Les jambes, c'est comme les impôts : on y échappe rarement, et ça se paie en marches d'escalier.",
  'Tu as déjà survécu à cent pour cent de tes séances jambes. Statistique imbattable.',
  "Le canapé t'a fait une offre. Décline poliment.",
  "Il y a deux sortes de séances : celles qu'on fait, et celles qu'on regrette de ne pas avoir faites.",
  "Une bonne séance ne se voit pas dans le miroir ce soir. Elle se voit dans le carnet dans trois mois.",
  'Même les machines ont des jours sans. Toi, tu as un programme.',
  "La sueur, c'est le gras qui pleure. Scientifiquement faux, moralement juste.",
  "Ne compte pas les jours, fais que les séries comptent.",
  "Tu n'es pas fatigué, tu es en pleine adaptation. C'est plus flatteur et c'est vrai.",
];

const FAITS_ENTRAINEMENT = [
  'Le volume hebdomadaire par muscle (nombre de séries dures) est le principal levier de l\'hypertrophie dans les méta-analyses : plus de séries, plus de gains, avec des rendements décroissants.',
  'S\'arrêter à 1 à 3 répétitions de l\'échec donne des gains d\'hypertrophie comparables à l\'échec systématique, pour une fatigue moindre. C\'est ce que code le RIR.',
  'Des charges de 30 % à 85 % du 1RM produisent une hypertrophie similaire si les séries sont menées près de l\'échec. Les charges lourdes restent meilleures pour la force.',
  'Deux séances par muscle et par semaine font au moins aussi bien qu\'une seule à volume égal : la fréquence sert surtout à répartir le volume.',
  'Des repos de 2 à 3 minutes sur les exercices lourds permettent plus de répétitions aux séries suivantes qu\'un repos d\'une minute, et un peu plus d\'hypertrophie.',
  'Le 1RM estimé par la formule d\'Epley perd en fiabilité au-delà de 10 à 12 répétitions : d\'où la règle de fourchette sur les séries longues.',
  'La force progresse d\'abord par adaptation nerveuse : les premières semaines d\'un mouvement nouveau montent vite sans que le muscle ait beaucoup grossi.',
  'L\'amplitude complète, en particulier la position étirée, donne autant ou plus d\'hypertrophie que l\'amplitude partielle raccourcie.',
  'Dormir moins de 6 heures réduit la récupération et la performance en force dès le lendemain ; le sommeil est un paramètre d\'entraînement.',
  'Une semaine de deload planifiée ne fait pas perdre de muscle : la masse musculaire se maintient plusieurs semaines sans entraînement, la force encore plus longtemps.',
  'Les courbatures ne mesurent pas la qualité d\'une séance : elles signalent surtout un geste nouveau ou une phase excentrique inhabituelle.',
  'La protéine autour de 1,6 g par kilo de poids de corps et par jour couvre l\'essentiel du bénéfice pour l\'hypertrophie chez le pratiquant entraîné.',
  'Le tempo contrôlé n\'ajoute pas d\'hypertrophie en soi au-delà d\'une excentrique maîtrisée ; des répétitions de 2 à 8 secondes font aussi bien.',
  'L\'ordre des exercices compte : ce que tu fais en premier progresse le plus. Place en tête la priorité du cycle.',
];

/* Un élément d'une liste choisi par hachage d'une graine (identifiant de
   séance, date), stable d'un rendu à l'autre ; `sel` décorrèle deux listes
   tirées sur la même graine. */
function choixHache(liste, graine, sel) {
  let h = sel || 0;
  for (const c of String(graine)) h = (h * 31 + c.charCodeAt(0)) % 100003;
  return liste[h % liste.length];
}
function phraseOuverture(graine) { return choixHache(PHRASES_OUVERTURE, graine, 0); }
function phraseMotivation(graine) { return choixHache(PHRASES_MOTIVATION, graine, 0); }
function faitEntrainement(graine) { return choixHache(FAITS_ENTRAINEMENT, graine, 7); }
