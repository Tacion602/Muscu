/* Tables de données de l'application v2.

   Reprises de la v1 (js/app.js) le 4 novembre 2026, sans réécriture : ces
   tables portent des décisions prises avec l'utilisateur (mouvements de
   gainage, types de cardio, zones musculaires, mannequin, renommages
   d'exercices, schémas). Voir CLAUDE.md pour l'historique de chacune. */

const MOUVEMENTS_GAINAGE = {
  dead_bug: {
    nom: 'Dead bug', mode: 'reps', prescription: '6-8 par côté', repos: 45,
    // Sans poids, comme la planche et le bird dog (remarque du 5 novembre 2026).
    sansPoids: true,
    interference: 4, couleur: '#D9EF8B', couleurTexte: '#5d7310',
    consigne: '3 s de descente bras et jambe opposés, 1 s en bas, 3 s de retour. '
      + 'Bas du dos plaqué au sol en permanence.',
  },
  planche: {
    nom: 'Planche', mode: 'chrono', prescription: '45 s', repos: 45,
    sansPoids: true,
    interference: 3, couleur: '#91CF60', couleurTexte: '#497724',
    consigne: 'Bassin en rétroversion légère, fessiers contractés.',
  },
  pallof_press: {
    nom: 'Pallof press', mode: 'reps', prescription: '8-10 par côté', repos: 45,
    // Poids suggéré tant qu'aucun n'a été noté (remarque du 18 septembre 2026,
    // « prérempli à 10 kg »), voir celluleSerie.
    poidsDefaut: 10,
    interference: 1, couleur: '#1A9850', couleurTexte: '#157c41',
    consigne: 'Poulie à hauteur de poitrine, à 1 m, perpendiculaire. 2 s pour tendre, '
      + '2 s de maintien, 2 s de retour. Départ 10 à 15 kg. Le buste ne pivote pas.',
  },
  bird_dog: {
    nom: 'Bird dog', mode: 'chrono', prescription: "un côté puis l'autre, changement au bip", repos: 45,
    // Un côté par moitié de tenue, bip au milieu (remarque du 5 novembre
    // 2026 : l'alternance coûtait du temps et une remise en place à chaque
    // changement), voir battreGainage.
    changerCote: true,
    sansPoids: true,
    interference: 5, couleur: '#FEE08B', couleurTexte: '#896501',
    consigne: "Même côté jusqu'au bip, puis l'autre côté jusqu'à la fin. 2 s d'extension "
      + 'bras et jambe opposés, 2 s de maintien, 2 s de retour. Hanches horizontales ; '
      + 'arrêter le côté dès que la hanche bascule.',
  },
  marche_ours: {
    nom: "Marche de l'ours", mode: 'chrono', prescription: '45 s', repos: 45,
    // Pas de champ poids (remarque du 1er octobre 2026), voir celluleSerie.
    sansPoids: true,
    interference: 8, couleur: '#D73027', couleurTexte: '#cc2e25',
    consigne: 'Genoux à quelques centimètres du sol, dos plat, bassin qui ne bascule '
      + 'pas latéralement.',
  },
  planche_laterale: {
    nom: 'Planche latérale', mode: 'chrono', prescription: '45 s par côté', repos: 45,
    interference: 2, couleur: '#52B151', couleurTexte: '#377a37',
    consigne: "Ligne cheville-hanche-épaule, hanche empilée sur l'épaule et haute. "
      + "Le temps noté est celui d'un côté.",
  },
  farmer_walk: {
    nom: 'Farmer walk une main', mode: 'charge', prescription: '20-30 m par côté', repos: 60,
    // Retiré de la séance de gainage le 1er octobre 2026 (remarque de
    // l'utilisateur, « le laisser en cardio ») : le cardio le couvre déjà par
    // l'Incliné, option farmer walk, d'où son absence de CATEGORIES_GAINAGE.
    // Gardé ici pour relire l'historique déjà enregistré.
    cardioSeul: true,
    interference: 9, couleur: '#A50026',
    consigne: "Départ 18 à 20 kg. Épaules horizontales, arrêt dès l'inclinaison, quelle "
      + 'que soit la distance restante.',
    info: 'Il ne fatigue pas la sangle comme les autres : il charge la chaîne portante '
      + "complète sous contrainte axiale. Son rang n'est pas directement comparable "
      + 'aux huit autres.',
  },
  crunch_inverse: {
    nom: 'Crunch inversé', mode: 'reps', prescription: '10-12', repos: 45,
    interference: 6, couleur: '#FDAE61', couleurTexte: '#a95502',
    consigne: '2 s de montée, 3 s de descente contrôlée. Le bassin décolle, pas '
      + 'seulement les jambes. Aucun élan.',
  },
  releve_genoux: {
    nom: 'Relevé de genoux suspendu', mode: 'reps', prescription: '8-12', repos: 60,
    interference: 7, couleur: '#F46D43', couleurTexte: '#c8380c',
    consigne: 'Rétroversion du bassin en fin de mouvement. Aucun balancement. Sangles '
      + "si le grip lâche avant l'abdomen.",
  },
};


const CATEGORIES_GAINAGE = [
  { cle: 'anti_extension', nom: 'Anti-extension', series: 3,
    mouvements: ['dead_bug', 'planche'] },
  { cle: 'anti_rotation', nom: 'Anti-rotation', series: 3,
    mouvements: ['pallof_press', 'bird_dog', 'marche_ours'] },
  { cle: 'anti_lateroflexion', nom: 'Anti-latéroflexion', series: 3,
    mouvements: ['planche_laterale'] },
  { cle: 'flexion_chargee', nom: 'Flexion chargée', series: 3,
    mouvements: ['crunch_inverse', 'releve_genoux'] },
];


const TYPES_COURSE = [
  {
    cle: 'ef',
    nom: 'Endurance',
    complet: 'Endurance fondamentale',
    champs: [
      { cle: 'vitesse_moy_kmh', libelle: 'Vitesse moyenne (km/h)' },
    ],
    echauffement: [
      'Marche rapide, 2 min',
      'Montées de genoux et talons-fesses en marchant, 1 min',
      'Premier kilomètre en allure très facile, le corps monte en température seul',
    ],
  },
  {
    cle: 'fractionne',
    nom: 'Fractionné',
    complet: 'Fractionné',
    champs: [
      { cle: 'repetitions', libelle: 'Répétitions' },
      { cle: 'recup_s', libelle: 'Récup (s)' },
    ],
    echauffement: [
      '15 min en endurance fondamentale, sans forcer',
      'Montées de genoux, talons-fesses et pas chassés, 5 min',
      '3 accélérations progressives de 20 secondes, récupération complète entre chaque',
    ],
  },
  {
    cle: 'incline',
    nom: 'Incliné',
    complet: 'Incliné, option lesté ou farmer walk',
    champs: [
      { cle: 'pente_pct', libelle: 'Pente (%)' },
      { cle: 'charge_kg', libelle: 'Charge (kg)' },
      { cle: 'vitesse_moy_kmh', libelle: 'Vitesse moyenne (km/h)' },
    ],
    echauffement: [
      '10 min à plat en endurance fondamentale',
      'Montées de mollets et fentes marchées, 2 min',
      "Première montée à pente réduite et sans charge, 3 min",
    ],
  },
  {
    cle: 'seuil',
    nom: 'Seuil',
    complet: 'Séance au seuil',
    champs: [
      { cle: 'duree_seuil_min', libelle: 'Durée au seuil (min)' },
    ],
    echauffement: [
      '15 min en endurance fondamentale',
      'Gammes athlétiques, montées de genoux et pas chassés, 4 min',
      '2 accélérations de 30 secondes à allure seuil, récupération complète',
    ],
  },
  /* HIIT en cours collectif, ajouté le 26 septembre 2026 (demande de
     l'utilisateur : « même hiérarchie que fractionné, incliné »). Pas de
     distance (`sansDistance`), donc pas d'allure : durée totale et calories
     (communes), fréquences cardiaques moyenne et maximale, et le cours
     choisi (`choix`, un seul parmi les options). L'échauffement est celui
     du cours lui-même, d'où une liste courte. */
  {
    cle: 'hiit',
    nom: 'HIIT',
    complet: 'HIIT, Body Attack ou Body Combat',
    sansDistance: true,
    choix: { cle: 'activite', options: ['Body Attack', 'Body Combat'] },
    champs: [
      { cle: 'fc_moy', libelle: 'FC moyenne (bpm)' },
      { cle: 'fc_max', libelle: 'FC max (bpm)' },
    ],
    echauffement: [
      "L'échauffement du cours suffit, arriver quelques minutes en avance",
      'Mobilité épaules et hanches, 2 min, avant les séquences de frappes ou de sauts',
    ],
  },
];


const CHAMPS_FOOTING = [
  { cle: 'duree_min', libelle: 'Durée (min)' },
  { cle: 'distance_km', libelle: 'Distance (km)' },
  { cle: 'calories', libelle: 'Calories' },
];


const ZONES_MUSCULAIRES = [
  { cle: 'pectoraux', nom: 'Pectoraux', muscles: ['pectoraux'], recuperation_h: 72 },
  { cle: 'epaules', nom: 'Épaules', muscles: ['deltoide lateral'], recuperation_h: 48 },
  { cle: 'biceps', nom: 'Biceps', muscles: ['biceps'], recuperation_h: 48 },
  { cle: 'quadriceps', nom: 'Quadriceps', muscles: ['quadriceps'], recuperation_h: 72 },
  { cle: 'dos', nom: 'Dos', muscles: ['grand dorsal'], recuperation_h: 72 },
  { cle: 'epaules-arriere', nom: 'Épaules arrière', muscles: ['deltoide posterieur'], recuperation_h: 48 },
  { cle: 'triceps', nom: 'Triceps', muscles: ['triceps'], recuperation_h: 48 },
  { cle: 'fessiers', nom: 'Fessiers', muscles: ['grand fessier', 'abducteurs et moyen fessier'], recuperation_h: 72 },
  { cle: 'ischios', nom: 'Ischio-jambiers', muscles: ['ischio-jambiers et fessiers'], recuperation_h: 72 },
  { cle: 'mollets', nom: 'Mollets', muscles: ['mollets'], recuperation_h: 48 },
  /* Trois zones ajoutées le 17 septembre 2026 (« il manque de nombreux
     muscles ») : le programme de musculation ne charge ni les abdominaux, ni
     les obliques, ni les avant-bras au sens de `muscle` (colonne B du
     classeur), si bien que ces polygones du mannequin réaliste restaient en
     silhouette neutre en permanence, quelle que soit l'activité. La séance de
     gainage (voir CATEGORIES_GAINAGE) travaille pourtant ces zones-là ; `
     mouvements` (au lieu de `muscles`) fait lire `derniereFoisZone` dans
     `seance.mouvements` plutôt que dans `exercices[].muscle`. Regroupement
     par mécanique plutôt que par mouvement précis : anti-extension et flexion
     chargée sollicitent le grand droit (abdominaux), anti-rotation et
     anti-latéroflexion les obliques. Le farmer walk est la seule prise sur
     l'avant-bras (grip) dans tout le programme, footings compris (voir
     derniereFoisMouvement, qui lit déjà footing et gainage confondus pour ce
     mouvement) — son propre repos (60 s) sert de vitesse de récupération. */
  { cle: 'abdominaux', nom: 'Abdominaux', mouvements: ['dead_bug', 'planche', 'crunch_inverse', 'releve_genoux'], recuperation_h: 48 },
  { cle: 'obliques', nom: 'Obliques', mouvements: ['pallof_press', 'bird_dog', 'marche_ours', 'planche_laterale'], recuperation_h: 48 },
  { cle: 'avant-bras', nom: 'Avant-bras', mouvements: ['farmer_walk'], recuperation_h: 48 },
];


const MANNEQUIN_AVANT = [
  { zone: 'pectoraux', points: ['518 416 510 551 580 580 678 555 706 473 620 416', '298 465 314 555 408 580 482 551 478 420 376 420'] },
  { zone: 'obliques', points: ['686 633 673 571 588 596 600 641 604 833 657 788 665 698', '339 784 331 718 310 633 322 571 408 592 392 633 392 837'] },
  { zone: 'abdominaux', points: ['563 592 580 641 584 780 584 927 563 984 551 1041 514 1078 510 845 506 673 510 571', '437 588 486 571 490 673 486 845 482 1073 445 1037 408 914 408 784 412 645'] },
  { zone: 'biceps', points: ['167 682 180 714 229 661 290 539 278 494 204 559', '714 494 702 547 763 661 816 718 829 690 788 555'] },
  { zone: 'triceps', points: ['694 555 694 616 759 727 776 702 755 673', '224 694 298 555 298 608 229 731'] },
  { zone: null, points: ['555 237 506 335 506 392 616 400 706 449 694 367 633 351 584 306', '290 449 302 371 363 351 412 302 445 245 490 339 486 392 380 396'] },
  { zone: 'epaules', points: ['784 531 796 478 792 412 759 380 710 363 722 429 714 473', '282 473 212 531 200 478 204 408 245 371 286 371 269 433'] },
  { zone: null, points: ['424 29 400 118 420 196 461 233 498 253 547 224 576 192 592 102 571 24 498 0'] },
  { zone: 'fessiers', points: ['527 1102 543 1249 600 1102 620 1000 649 943 600 927 567 1045', '478 1106 449 1253 420 1159 404 1131 396 1073 380 1024 347 939 396 922 416 992 437 1053'] },
  { zone: 'quadriceps', points: ['347 988 371 1082 371 1278 343 1371 310 1327 294 1200 282 1114 294 1008 322 947', '633 1057 645 1000 669 947 702 1012 710 1118 682 1331 653 1376 624 1286 620 1114', '388 1294 384 1122 412 1184 445 1294 429 1351 400 1461 363 1465 355 1400', '596 1457 555 1290 608 1139 612 1302 641 1396 629 1465', '327 1384 265 1457 257 1367 257 1273 269 1143 294 1335', '718 1131 739 1241 739 1404 727 1457 665 1384 702 1335'] },
  { zone: null, points: ['339 1400 347 1433 355 1473 363 1510 351 1567 298 1567 273 1527 273 1473 302 1441', '657 1400 722 1478 722 1522 698 1571 649 1567 629 1510'] },
  { zone: 'mollets', points: ['714 1604 735 1535 767 1612 796 1678 784 1878 796 1955 747 1955', '249 1947 278 1649 282 1604 261 1543 249 1576 224 1616 208 1678 220 1882 208 1955', '727 1951 698 1592 653 1584 641 1624 641 1653 657 1771', '355 1584 359 1624 359 1669 351 1722 351 1767 322 1820 306 1873 269 1947 273 1878 282 1804 286 1755 290 1698 298 1641 302 1588'] },
  { zone: 'avant-bras', points: ['61 886 102 751 147 702 163 743 192 735 45 976 0 1000', '845 698 833 735 800 731 951 984 1000 1004 935 894 898 763', '776 722 776 776 804 841 853 898 922 1012 947 996', '69 1012 135 906 188 841 216 771 212 718 49 988'] },
];


const MANNEQUIN_ARRIERE = [
  { zone: null, points: ['506 0 460 9 409 55 404 128 451 200 557 200 591 136 596 47 557 13'] },
  { zone: 'dos', points: ['447 217 477 217 472 383 477 647 383 532 353 409 311 366 391 332 438 272', '523 217 557 217 566 272 609 328 689 366 647 404 617 532 523 647 532 383'] },
  { zone: 'epaules-arriere', points: ['294 370 230 391 174 443 183 536 243 494 272 464', '711 370 783 396 826 447 817 536 749 489 723 451'] },
  { zone: 'dos', points: ['311 387 281 489 285 553 340 753 472 711 472 664 366 540 336 413', '689 387 719 494 715 562 660 753 528 711 528 664 634 545 664 417'] },
  { zone: 'triceps', points: ['268 498 179 557 145 723 166 817 217 638 268 557', '736 502 821 557 860 732 834 821 779 630 732 557', '268 583 268 685 230 753 191 774 226 655', '728 583 770 647 804 774 766 753 728 689'] },
  { zone: 'dos', points: ['477 728 345 770 353 834 494 1021 468 830', '523 728 655 770 647 834 506 1021 532 838'] },
  { zone: 'avant-bras', points: ['864 757 911 834 932 940 1000 1064 962 1043 881 894 843 838', '136 757 89 838 68 936 0 1064 38 1043 123 885 157 830', '813 796 774 779 791 847 911 1038 932 1089 945 1047', '187 796 221 779 209 843 94 1030 68 1085 51 1047'] },
  { zone: 'fessiers', points: ['447 996 302 1085 298 1187 315 1260 472 1213 494 1149', '553 991 511 1145 523 1209 681 1260 698 1191 694 1085'] },
  { zone: null, points: ['481 1230 447 1230 413 1255 451 1443 485 1357 489 1294', '519 1226 557 1234 591 1260 549 1443 519 1362 511 1294'] },
  { zone: 'ischios', points: ['289 1221 311 1294 366 1260 353 1353 345 1502 294 1583 289 1468 277 1413 272 1315', '715 1217 694 1289 638 1260 655 1366 664 1502 711 1583 715 1477 728 1421 736 1319', '387 1255 443 1460 404 1668 362 1528 370 1353', '617 1255 634 1362 643 1532 600 1668 562 1464'] },
  { zone: null, points: ['345 1532 311 1591 336 1664 374 1626', '664 1536 630 1630 668 1664 694 1591'] },
  { zone: 'mollets', points: ['294 1604 285 1672 247 1796 238 1928 255 1970 285 1932 298 1800 319 1711 319 1668', '374 1651 353 1677 332 1719 311 1804 302 1919 340 2000 387 1906 391 1689', '630 1651 613 1685 617 1906 664 1996 706 1919 689 1796 668 1702', '706 1604 723 1685 757 1791 766 1928 745 1966 723 1936 706 1796 681 1681'] },
  { zone: 'mollets', points: ['285 1957 302 1957 336 2017 306 2200 285 2136 268 1983'] },
  { zone: 'mollets', points: ['698 1957 719 1957 736 1983 719 2132 702 2196 672 2021'] },
];


const JOURNEE_SOMMEIL = [
  { cle: 'alcool', nom: 'Alcool', icone: '🍺', type: 'bascule' },
  { cle: 'cafe', nom: 'Café', icone: '☕', type: 'compteur' },
  { cle: 'pipi', nom: 'Pipi nocturne', icone: '🚽', type: 'compteur' },
  { cle: 'ecranTard', nom: 'Écran tardif', icone: '📱', type: 'bascule' },
  { cle: 'repasTardif', nom: 'Repas tardif', icone: '🍽️', type: 'bascule' },
];


const SPORT_JOURNEE = [
  { cle: 'muscu', nom: 'Muscu', icone: '🏋️' },
  { cle: 'footing', nom: 'Cardio', icone: '🏃' },
];


const MENSURATION_CHAMPS = [
  { cle: 'poitrine', nom: 'Poitrine', unite: 'cm', categorie: 'torse' },
  { cle: 'bras', nom: 'Bras', unite: 'cm', categorie: 'bras' },
  { cle: 'taille', nom: 'Taille', unite: 'cm', categorie: 'torse' },
  { cle: 'hanches', nom: 'Hanches', unite: 'cm', categorie: 'jambe' },
  { cle: 'cuisse', nom: 'Cuisse', unite: 'cm', categorie: 'jambe' },
  { cle: 'mollet', nom: 'Mollet', unite: 'cm', categorie: 'jambe' },
];


const ANCIENS_NOMS = {
  // 13 septembre 2026, demande de l'utilisateur : le développé machine
  // devient bilatéral, et garde les valeurs de la version unilatérale.
  'developpe machine': ['developpe machine unilateral'],
  // 23 septembre 2026, demande de l'utilisateur : il a toujours fait un
  // développé banc (barre ou haltères) à cette place, jamais la machine que
  // portait le classeur — correction du programme, pas un changement de
  // mouvement, l'historique doit donc suivre.
  'developpe incline banc': ['developpe incline machine'],
  // 26 septembre 2026, demande de l'utilisateur : le leg curl passe en
  // bilatéral et garde son historique unilatéral, en connaissance de cause
  // (première comparaison faussée : charge d'une jambe contre deux).
  // « Leg curl allongé » (même forme sans accent ni casse) figure aussi :
  // c'est sous ce nom, saisi autrement, que vivent une séance et la
  // consigne de J4 (page Consignes du classeur).
  'leg curl allonge': ['leg curl allonge unilateral', 'leg curl allonge'],
  // 29 septembre 2026, remarque de l'utilisateur : l'extension triceps de
  // Haut max a toujours été faite à deux bras à la barre. Elle prend le nom
  // de celle de Push, même mouvement : une seule progression pour les deux
  // jours, qui récupère aussi l'historique « unilatéral ».
  'extension triceps poulie barre': ['extension triceps unilaterale poulie'],
};


const IMAGES_EXERCICES = {
  'Abduction de hanche machine': { schema: 'thigh-abductor' },
  'Curl incline halteres': { schema: 'alternating-incline-curl-with-dumbbell' },
  'Curl marteau': { schema: 'biceps-hammer-curl-with-dumbbell' },
  'Curl pupitre': { schema: 'preacher-curl-with-machine' },
  'Developpe incline banc': { schema: 'incline-bench-press' },
  'Developpe machine': { schema: 'machine-bench-press' },
  'Developpe couche halteres': { schema: 'incline-bench-press', generique: true },
  'Ecarte poulie basse vers le haut': { schema: 'crossover-bands', generique: true },
  'Dips buste penche': { schema: 'chest-dips' },
  'Ecarte poulie horizontale hauteur poitrine': { schema: 'crossover-bands', generique: true },
  'Elevation laterale halteres': { schema: 'lateral-dumbbell-raises' },
  'Elevation laterale poulie unilaterale': { schema: 'lateral-dumbbell-raises', generique: true },
  'Extension de hanche machine': { schema: 'one-legged-cable-kickback', generique: true },
  'Extension jambes unilatéral': { schema: 'leg-extensions' },
  'Extension triceps overhead corde': { schema: 'standing-triceps-extension-with-towel', generique: true },
  'Extension triceps poulie barre': { schema: 'triceps-pushdown-with-cable' },
  'Extension triceps unilaterale poulie': { schema: 'triceps-pushdown-with-cable' },
  'FACE PULL': { fichier: 'face-pull.jpg' },
  'LEG CURL ALLONGE': { schema: 'lying-leg-curl-machine' },
  'Lat pull-in unilateral poulie a genoux': { schema: 'straight-arm-push-down', generique: true },
  'Mollets debout unilatéral': { schema: 'standing-calf-raises-using-machine' },
  'Oiseau inverse machine': { schema: 'bent-over-rear-deltoid-raise-with-head-on-bench', generique: true },
  'PRESSE A CUISSE / HACK SQUAT': { schema: 'leg-press' },
  'Rowing unilateral machine ou haltere': { schema: 'seated-cable-rows', generique: true },
  'SOULEVE DE TERRE ROUMAIN': { schema: 'romanian-dead-lift' },
  'Tirage vertical prise large': { schema: 'underhand-pull-downs', generique: true },
  'Traction prise neutre machine assistee': { schema: 'narrow-parallel-grip-chin-ups', generique: true },
};


const ECHAUFFEMENT_PAR_JOUR = {
  J1: [
    "Cercles de bras avant et arrière, puis rotations d'épaules, 1 min",
    'Rotations externes à la poulie ou avec élastique, charge très légère, 2 séries de 15, 2 min',
    'Pompes lentes, genoux au sol si besoin, 2 séries de 10, 2 min',
  ],
  J3: [
    'Cercles de bras et décollements de scapulas suspendu à la barre, 1 min',
    'Face pull ou tirage élastique horizontal, charge très légère, 2 séries de 15, 2 min',
    'Tirage vertical à vide puis à 50 % de la charge de travail, 2 séries de 10, 2 min',
  ],
  J4: [
    'Vélo ou rameur à allure facile, 2 min',
    'Fentes marchées et rotations de hanches sans charge, 10 par jambe, 1 min 30',
    'Presse ou squat à vide puis à 50 % de la charge de travail, 2 séries de 10, 1 min 30',
  ],
  J5: [
    "Cercles de bras et rotations d'épaules dans les deux sens, 1 min",
    'Face pull et rotations externes légères, 2 séries de 15, 2 min',
    'Traction assistée à charge maximale d\'assistance, 2 séries de 8, 2 min',
  ],
};


const RAISONS_INSOMNIE = [
  { cle: 'bruit', nom: 'Bruit', icone: '🔊' },
  { cle: 'chaleur', nom: 'Chaleur', icone: '🥵' },
  { cle: 'froid', nom: 'Froid', icone: '🥶' },
  { cle: 'moustique', nom: 'Moustique', icone: '🦟' },
  { cle: 'enervement', nom: 'Énervement', icone: '😤' },
  { cle: 'pensees', nom: 'Pensées', icone: '💭' },
  { cle: 'douleur', nom: 'Douleur', icone: '🤕' },
  { cle: 'lumiere', nom: 'Lumière', icone: '💡' },
];


const REGLAGES_PAR_DEFAUT = {
  pont: '',
  secret: '',
  son: true,
  vibration: true,
  veille: true,
  clavierPendantRecup: true,
  notification: false,
  // Identifiant du nouveau classeur et gid de ses onglets, renvoyés par le
  // ping du pont v2 : servent au lien « ouvrir dans le classeur ».
  classeurId: '',
  gids: {},
};
