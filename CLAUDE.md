# Suivi de musculation

Application web installable pour suivre les séances en salle sur Android :
écran plein d'un exercice à la fois, saisie charge/répétitions/RIR, rappel de
la dernière fois pour juger la surcharge progressive, minuterie de
récupération. Les séances sont écrites dans le classeur Google Sheets qui sert
de programme.

Porteur du projet : le même que sur l'agenda culturel géolocalisé, projet
voisin sans rapport de contenu. Phase de démarrage.

**Grosse session de travail le 16 septembre 2026** : refonte visuelle
complète (mode clair, voir plus bas), menu Sport/Suivi, et cinq nouveaux
contenus du menu Suivi (État musculaire, Sommeil, Mensurations, Évolution
course, Tonnage par muscle, en plus du Calendrier déjà prévu). Documenté au
fil du texte ci-dessous plutôt que dans une section à part : les décisions
de ce jour-là suivent les mêmes règles que celles d'avant, pas un régime
spécial.

**Ce dépôt vit dans `C:\Users\Utilisateur\Musculation`** depuis le
13 septembre 2026, sorti de `C:\Users\Utilisateur\.claude\MUSCU` (voir
l'ancien chantier « Sortir ce dépôt de `.claude` », résolu ci-dessous). Une
copie de travail, faite avant ce déplacement et non encore supprimée à cette
date, peut encore trainer à l'ancien emplacement : elle n'est plus la
référence, `origin` désigne le même dépôt GitHub (`Tacion602/Muscu`) dans les
deux cas, donc pousser depuis l'une ferait diverger l'autre en silence si les
deux étaient utilisées à la fois.

## Décision de départ

**Web installable, pas d'application native.** Kotlin ou React Native
imposeraient un projet Google Cloud et un parcours OAuth rien que pour parler
au classeur, et une chaîne de compilation avant le premier essai en salle. Une
PWA s'installe sur l'écran d'accueil Android depuis Chrome (icône comprise) et
tient dans le même savoir-faire que l'agenda culturel : HTML/CSS/JS sans
framework. Si l'usage confirme le besoin, `Capacitor` permettrait d'emballer
ce même code en APK sans le réécrire.

**Hors ligne d'abord.** Le réseau est mauvais dans la plupart des salles : une
séance s'enregistre entièrement dans `localStorage` du téléphone, saisie après
saisie, et ne parle au classeur qu'à la fin, via un bouton explicite. Un envoi
qui échoue laisse la séance en attente ; elle repart au prochain lancement en
ligne ou au prochain essai manuel. Rien ne dépend du réseau pendant l'effort.

**« Pas de build » reste vrai pour l'application livrée**, malgré l'arrivée
d'`impeccable.style` le 16 septembre 2026 (outillage Claude Code pour la
refonte visuelle, voir plus bas) : c'est un outil de conception, jamais une
dépendance d'exécution. `index.html`/`css/style.css`/`js/app.js` restent trois
fichiers servis tels quels, sans étape de compilation. `.impeccable/` (config,
ignores) et `PRODUCT.md` (contexte produit pour cet outil) sont versionnés
mais ne participent à rien côté téléphone.

## Version 2 (4 novembre 2026)

**Refonte complète dans `v2/`, l'ancienne application restant intacte à la
racine.** Décidée avec l'utilisateur le 4 novembre 2026 après un rapport
d'optimisation en trois familles (qualité d'entraînement, fluidité,
cohérence visuelle) : il voulait garder l'ancienne version, repartir sur une
version indépendante, et un classeur neuf « mieux structuré, plus clair ».
Tout ce qui suit dans cette section date de ce jour-là, sauf mention.
Le reste de ce fichier décrit la v1 et reste vrai pour elle.

**Pas de partage entre les deux versions.** La v2 copie une fois
l'historique de la v1 à son premier lancement (`migrerDepuisV1()` dans
`v2/js/donnees.js` : séances, consignes, sommeil, mensurations, remarques,
durée de tenue, réglages de son et de veille, jamais l'adresse du pont) et
vit ensuite sur ses propres clés `muscu2.*`. Les séances de cardio v1
(`type: "footing"`, carte `footing`) sont normalisées en `type: "cardio"`,
carte `cardio` (`normaliserSeanceV1()`). Un bouton de Réglages permet de
reprendre à nouveau les séances v1 absentes de la v2, sans rien effacer.

### Direction artistique

Trois cartes présentées (la pile de poids, le plan d'architecte, le standard
du marché), tirage `impeccable` dégradé (service de challengers hors de
portée du bac à sable, seed 617246f5). **Choix de l'utilisateur : le
standard du marché joué sans détour**, barre de finition Hevy et Strong sur
Android (Material 3). Fond gris très clair, cartes blanches à rayon 12 px,
un seul bleu d'action, vert et rouge sémantiques réservés à hausse, recul,
alerte, Roboto, icônes trait d'un seul jeu (plus d'emoji en interface, sauf
les puces de sommeil héritées), barre d'onglets basse Sport, Suivi,
Réglages, glissement de 220 ms entre écrans (`afficher()`/`retour()` dans
`v2/js/ui.js`). Un seul thème clair. Contrat de direction dans
`.impeccable/surfaces/v2-index-html.md`, décision consignée dans
`PRODUCT.md`. Ce choix abandonne, pour la v2 seulement : les fonds vivants
et le choix de palette, le néon de la séance, le dégradé nuit de Sommeil,
les couleurs CodePen du bouton de synchro, le serpent et son délai, l'écran
Menu à trois cartes.

### Classeur neuf et pont v2

**Un classeur neuf, à créer par l'utilisateur**, onglets plats, une ligne
par observation : `Séances`, `Séries` (une ligne par série, avec e1RM),
`Course`, `Gainage`, `Douleurs`, `Remarques`, `Consignes`, `Réglages
machine`, `Sommeil`, `Mensurations`, `Programme (sauvegarde)`. Plus de grille
de jour à blocs de six lignes. Pont : `appsscript/Code_v2.gs`, à coller dans
le nouveau classeur et à déployer (geste de l'utilisateur, jamais fait
d'ici). Actions : `ping` (renvoie l'identifiant du classeur et les gid des
onglets), `seance`, `historique` (lot de séances, pour la reprise),
`consignes`, `reglages`, `douleurs`, `sommeil`, `mensuration`, `remarque`,
`programme`. **La réponse à `seance` renvoie les numéros de lignes écrites**
(`lignes.series`, `lignes.seance`) : l'application les garde sur la séance
(`seance.lignes`) et construit un lien `#gid=…&range=…` vers la ligne du
classeur depuis la fiche d'un point de courbe (`lienClasseur()` dans
`v2/js/suivi.js`). Idempotence par identifiant de séance
(`PropertiesService`, 400 dernières). L'application envoie les séances par
lots de 20 via `historique` (`synchroniser()` dans `v2/js/reglages.js`).

**Source du programme : l'onglet `Programme` du nouveau classeur**, lu par
colonnes nommées (`outils/importer_programme_v2.py`, colonnes Jour, Rang,
Nom, Type, Numero, Exercice, Series, Reps min, Reps max, RIR, Repos, Muscle,
Consigne, Reglages, Substituts). Plus de reconnaissance de forme : les
pièges d'import de la v1 disparaissent. `CLASSEUR_ID` (`1JOiH7LYXLtosQnnyMYLMjrBFK_CDkeKN98sKSwJM7DI`, classeur « Muscu v2 » créé par
l'utilisateur le 4 novembre 2026, pont déployé le même jour) et
`GID_PROGRAMME` (`1897993877` depuis le 9 novembre 2026 : l'ancien `291704442` n'existait plus, gviz renvoyait alors le premier onglet, le Programme, ce qui masquait l'erreur) y sont renseignés ; `--depuis-v1` convertit
`data/programme.json` et `--csv` écrit `classeur/Programme.csv` à coller
dans le nouvel onglet (fait ce jour-là : 6 jours, 27 exercices). Sortie :
`v2/data/programme.json`, jamais édité à la main. L'import vérifie
lui-même prescriptions complètes, fourchettes cohérentes, nombre de cibles
RIR, et noms proches mais différents (l'équivalent de `noms_ambigus`).
`Rang` porte l'ordre de la semaine (Haut max, Cardio, Pull, Jambes, Push,
Cardio), `code` reste l'identité des séances (J1 = Push dans le classeur)
et `libelleJour()` affiche « J » suivi du rang : plus de table d'échange de
codes.

### Qualité d'entraînement

- **Indicateur de progression : 1RM estimé (Epley, `e1rm()` dans
  `v2/js/calculs.js`) de la première série de travail**, à la place de
  charge × répétitions. Motif donné par l'utilisateur : après une hausse de
  charge, le tonnage baisse alors que l'engagement monte (40 × 8 puis
  42,5 × 6 : 320 contre 255, mais e1RM stable). Epley perd sa fiabilité
  au-delà de 10 à 12 répétitions : **les exercices prescrits en séries
  longues (`reps_max` > 12) se jugent par la règle de fourchette**
  (`comparerSeries()` : charge montée et répétitions restées dans la
  fourchette = progrès ; charge égale et plus de répétitions = progrès ;
  l'inverse = recul). La comparaison se dit indicative quand le RIR diffère
  de deux crans ou plus. Couleur des séries, bilan de fin, courbes et
  surcharge par muscle utilisent tous `indicateur()`.
- **Charge suggérée, double progression** (`objectifExercice()`).
  **Depuis le 6 novembre 2026** (l'utilisateur : « les premières séries
  sont toujours des vraies séries », montée jugée « aux deux dernières
  séries, pas 3 ou 4 ») : la montée se décide sur les deux dernières
  séries seulement, et la charge se propose série par série
  (`objectif.charges`, chaque série reprend sa charge de la dernière fois,
  + un pas sur chacune si la montée est gagnée) ; la fiche affiche
  « Objectif 1re série ». **Révisée le 8 novembre 2026** après analyse
  demandée par l'utilisateur : (1) référence prise sur le même jour quand
  l'exercice vit sur plusieurs jours (`referenceProgression()`), pour ne
  pas mêler fatigue d'enchaînement et progrès ; (2) pas proportionnel
  (`pasEffectif()`) : au-delà de 7,5 % de la charge, 5 kg descend à
  2,5 kg, le plus petit cran disponible selon l'utilisateur, et si 2,5 kg
  dépasse encore 7,5 %, toutes les séries doivent atteindre le haut de la
  fourchette (cas réel : leg curl 25 → 30 kg, 13 puis 8 répétitions) ;
  (3) un RIR posé d'office à la cible (`rirAuto`, aucun bouton touché) ne
  compte plus dans le test de montée (`rirSaisi()`) ; (4) le 1RM estimé
  ajoute le RIR saisi aux répétitions (`e1rmEffort()`), courbes et
  comparaisons comprises. Ce qui suit décrit la règle d'avant : si la
  dernière fois toutes les séries de travail ont atteint `reps_max` avec un
  RIR réel inférieur ou égal à la cible (ou non saisi), charge + un pas
  (`pasDeCharge()` : 5 kg sur les grosses machines, 2,5 kg ailleurs, lu
  dans le nom) et viser `reps_min` ; sinon même charge, une répétition de
  plus sur la première série. Affichée en tête de fiche, et en filigrane
  de la première série (les suivantes montrent la dernière fois). Rien sans
  historique, rien en deload.
  - **Tractions : la charge saisie est le poids réellement soulevé**
    (précision de l'utilisateur le 5 novembre 2026) : poids de corps moins
    l'assistance jusque-là, poids de corps (77 kg) désormais, lest ajouté
    ensuite. Aucune inversion à faire pour « machine assistee » dans le nom,
    l'e1RM et la double progression sont justes tels quels. **Pas de 2,5 kg**
    (choix de l'utilisateur le même jour), testé avant la règle des
    machines, le nom contenant encore « machine ».
- **Chrono manuel sur chaque fiche** (`#chrono-exo`, remarque du
  5 novembre 2026 : « chrono accessible pour les unilatérales ou
  échauffement, depuis tous les exo ») : lance le repos de l'exercice sans
  valider de série, même minuterie que celle d'une série (plein écran,
  ±15 s, Passer). Les boutons de `.actions-serie` ne coupent plus leur
  texte (`white-space: nowrap`) et passent à la ligne entiers : sur 375 px,
  Chrono occupe seul la seconde ligne.
- **Jauge de séance en néon électrique, comme la v1** (demande de
  l'utilisateur le 5 novembre 2026) : courant cyan, violet, magenta qui
  défile, halo qui grésille, étincelle en bout (`.ligne-progression
  .jauge-pilule` dans `v2/css/style.css`, coupé sous
  `prefers-reduced-motion`). Exception voulue au bleu unique de la
  direction v2.
- **Page d'envoi animée, comme la v1** (même demande, même jour) :
  « Enregistrer et envoyer » ouvre `#envoi-plein`, page blanche avec le
  seul bouton du CodePen de la v1 (`.bouton-sync`, mêmes phases `.envoi`,
  `.complet`, `.envoye`, mêmes couleurs, autre exception aux jetons v2).
  Cadence de la v1 dans `DUREES_ENVOI` (`v2/js/seance.js` : 2,2 s minimum,
  0,9 s de rebond, 2 s sur l'état), puis toast et fiche de la séance comme
  avant. Texte final « Envoyé », « En attente » (pont injoignable, bordure
  grise `.attente`) ou « Enregistré » (pas de pont). La fixture de
  `tests/test_v2.py` réduit `DUREES_ENVOI` à zéro, sauf dans
  `test_l_envoi_passe_par_une_page_dediee_animee`.
- **Intro néon avant l'Accueil** (demande du 5 novembre 2026 : « une intro
  avant d'arriver sur le programme, un élément central pour entrer, des
  codes de sportif » ; place et univers choisis par l'utilisateur : avant
  l'Accueil gardé tel quel, néon électrique). `#intro`, couche plein écran
  visible dès le chargement à chaque lancement, rendue par `rendreIntro()`
  (`v2/js/sport.js`) : date et semaine, « Muscu », cadran de chronomètre
  (anneau cyan, violet, magenta qui tourne, graduations) avec « GO » et la
  séance en cours ou la prochaine, phrase du jour en bas. Un appui sur le
  cadran la fond vers l'Accueil. Masquée si le programme ne charge pas.
  Les tests la passent par `passer_intro()` dans `ouvrir_sport()`.
  **Refaite le 6 novembre 2026 en éditorial sombre** (le néon jugé « un
  peu kitsch » ; direction A choisie par l'utilisateur parmi trois) : noir
  mat, date et semaine en petit, la séance du jour en très grande
  typographie étroite (`sans-serif-condensed` sur Android), son code en
  bleu, le détail dessous, deux chiffres en pied (séances de la semaine,
  jours depuis la dernière). Le nom ne se coupe jamais dans un mot
  (`ajusterTitreIntro()` réduit la taille). Sortie (`sortirIntro()`) : le
  nom glisse et rétrécit jusqu'au nom de la carte de l'Accueil, qui reste
  caché pendant le vol et prend le relais, pendant que le fond noir
  remonte comme un rideau (520 ms) ; rien sous `prefers-reduced-motion`.
  Le cadran, le « GO » et la phrase du jour de l'intro disparaissent (la
  phrase reste sur l'Accueil). **Passée en clair le 7 novembre 2026** (le
  noir « trop différent du reste ») : fond blanc de carte, texte et bleu
  des jetons de la v2 ; le rideau qui remonte garde une ombre pour rester
  visible sur l'Accueil clair. Une petite phrase de motivation revient
  sous le titre (`#intro-phrase`, `PHRASES_MOTIVATION` avec une graine
  décalée pour ne pas répéter celle de l'Accueil).
- **Repos persistant, plein écran jusqu'au bout, chrono +30 %**
  (remarque de fin de séance du 5 novembre 2026, « fais tout ») :
  - le repos est gardé sur le téléphone (`muscu2.repos`, `sauverRepos()`/
    `restaurerRepos()`), repris au lancement s'il n'est pas fini ; quitter
    la fiche ne l'arrête plus (`avantRetour()` ne fait que masquer le plein
    écran). Hors de la séance, une pastille `#repos-flottant` au-dessus des
    onglets le montre ; un appui rouvre la séance. Finir ou abandonner la
    séance l'arrête ;
  - `battre()` ne masque plus le plein écran à 10 s de la fin : il reste
    jusqu'à zéro, sauf appui ;
  - anneau 220 → 286 px, chiffres 64 → 83 px, bandeau 30 → 39 px ;
  - **vibration** : `navigator.vibrate` n'agit que page au premier plan et
    manque sur certains navigateurs. Réglage « Notification en fin de
    repos » repris de la v1 (`notifierFinDeRepos()`, permission demandée
    au cochage, `notificationclick` dans `v2/sw.js`) : le système vibre et
    sonne même écran verrouillé. **Cause trouvée le 6 novembre 2026 : le
    téléphone est sous Firefox**, qui ignore `navigator.vibrate` et la
    vibration des notifications (sans vibration sur Android depuis la 79,
    ignorées partout depuis la 129, bug Mozilla 1900037) tout en exposant
    l'API. Rien à corriger dans le code : Réglages le dit sous Firefox
    (`navigateurSansVibration()`, lu dans la chaîne du navigateur) et
    oriente vers Chrome ou la vibration des notifications de Firefox dans
    les paramètres Android.
- **Confirmation d'abandon posée sur la croix** (demande du 5 novembre
  2026 : « au niveau de la croix, qu'elle superpose la séance à annuler »,
  elle montait du bas) : `feuille()` et `confirmer()` (`v2/js/ui.js`)
  acceptent une `ancre` ; la feuille se pose alors en haut, sur cet
  élément (`.voile.ancree`). Utilisé par les deux abandons : la ligne de
  la séance en cours sur Sport, la croix `#seance-abandonner` de la fiche.
  Les autres confirmations restent en bas.
- **Points aberrants des courbes : retrait d'un exercice, pas d'une
  séance** (6 novembre 2026). La veille, à partir de captures de fiches de
  courbe (40 × 40 au J5 le 28 août, « Ligne du classeur inconnue »), la
  version `muscu2-2026-11-05-9` supprimait au démarrage toutes les séances
  des 27 et 28 août. L'utilisateur l'a refusé le lendemain : « je ne
  souhaite pas effacer toute la séance mais uniquement l'exercice trop
  éloigné de ses voisins ». Désormais :
  - `restaurerSeancesDEssai()` (`v2/js/donnees.js`) reprend une seule fois
    (`muscu2.essaisRestaures`) les séances de ces deux jours absentes de la
    v2, depuis l'historique v1 resté intact ;
  - la fiche d'un point de courbe porte « Retirer ce point »
    (`#point-retirer`, `retirerExerciceDeSeance()`) : confirmation, puis cet
    exercice seul quitte cette séance, le reste est gardé, le classeur n'est
    pas touché. C'est l'utilisateur qui choisit les points, à l'œil, sur
    la courbe : aucun seuil automatique.
- **Bird dog d'un côté puis de l'autre, bip à mi-tenue** (remarque du
  5 novembre 2026 : alterner coûtait le temps du changement et une remise
  en place à chaque fois). `changerCote` sur le mouvement dans
  `v2/js/tables.js` : `battreGainage()` émet une seule fois, à la moitié
  de la tenue, `signalerChangementDeCote()` (bip plus court et plus grave
  que la fin, vibration brève, pas de notification) et le bandeau passe
  de « 1er côté » à « 2e côté ». La durée reste celle du réglage commun
  de tenue.
  **Pas de champ poids** sur la planche, le bird dog et le dead bug (même
  remarque : « pas de poids/kg nécessaire »), comme sur la marche de l'ours
  depuis le 1er octobre : `sansPoids` dans `v2/js/tables.js`.
  **Couleurs d'interférence avec la course plus visibles** (même
  remarque) : la teinte du mouvement passe en fond du nom et en contour de
  son bouton de choix, en fond quand il est choisi (`styleInterference()`
  dans `v2/js/gainage.js`, texte noir ou blanc selon le contraste,
  `texteSurTeinte()`), et la ligne dit « interférence course N/9 ».
- **Élévations latérales arrêtées, développé épaules à la place**
  (6 novembre 2026, douleur sur le dessus de l'épaule pendant l'élévation
  latérale, signalée dans Douleurs le 5). Les trois occurrences (J1, J3,
  J5) deviennent « Developpe epaules halteres », 3 × 8-12, RIR 2 / 2 / 2,
  repos 90 s, muscle `Deltoide anterieur` (ajouté à la zone Épaules et à
  `PRIORITES_MUSCLES`). Choix de l'utilisateur contre l'avis donné : le
  développé passe par la même position bras au-dessus de l'horizontale
  que l'élévation et peut entretenir la douleur ; le deltoïde latéral
  perd son seul travail direct (9 séries par semaine). **Règle d'arrêt
  dans la consigne** : douleur sur le dessus de l'épaule, l'exercice
  s'arrête ; deux séances avec douleur, il sort du programme. Pas de
  schéma Everkinetic de développé épaules dans `images-exercices/` : la
  fiche n'a pas d'illustration.
- **Retours du 6 novembre 2026, fin de journée** :
  - **Série sans répétitions** : extension jambes du J4, série 1 arrivée
    au classeur à 65 kg sans répétitions, juste après une confirmation de
    charge inhabituelle. Le dialogue validait la série capturée à son
    ouverture sans revérifier ; désormais le « Confirmer » revérifie les
    répétitions, `validerSerie()` refuse une série sans répétitions, et
    l'écran de fin liste les séries faites sans chiffres
    (`#fin-incompletes`). Scénario exact sur le téléphone non reproduit.
    Séries réelles données par l'utilisateur : 65 × 13 @2, 70 × 12 @1,
    75 × 12 @0. Corrigées à la main dans le classeur (Séries lignes 26 à
    28, e1RM compris, tonnage de la séance à 31 130 kg) et une fois sur le
    téléphone (`corrigerExtensionJambes()`, `muscu2.extensionCorrigee`).
  - **Douleur** : texte d'au moins trois lettres (`douleurValable()`),
    après deux « # » envoyés le 5.
  - **Sommeil** : historique effacé une fois sur le téléphone, à la
    demande de l'utilisateur (`effacerSommeilUneFois()`,
    `muscu2.sommeilEfface`). L'onglet `Sommeil` n'existait pas encore dans
    le classeur : le pont le crée à la première nuit envoyée
    (`ongletPret()`), et une lecture gviz d'un onglet absent renvoie le
    premier onglet du classeur, d'où le contenu du Programme à la relève.
  - **Suivant sous le pouce** : `.nav-exo` collée en bas de l'écran,
    Suivant et Terminer à deux tiers de largeur, 52 px.
  - **Accueil centré** (« justifiée au centre ») : `#accueil-corps` en
    colonne centrée horizontalement et verticalement (`safe center`), carte
    de la séance comprise.
  - **Schéma du développé épaules** : développé militaire assis à la barre
    (Everkinetic 0004, `seated-military-press`), « Illustration
    approchée », précaché.
- **Classeur restauré le 9 novembre 2026** : l'import du CSV du 8 au soir
  avait été fait avec « Remplacer la feuille de calcul » au lieu de
  « Remplacer la feuille actuelle » ; tous les onglets sauf Programme
  avaient disparu (la relève du 9 l'a révélé : chaque onglet demandé à gviz
  renvoyait le Programme). Version du 8 novembre 14 h 56 restaurée par
  l'historique des versions, puis l'onglet Programme réaligné cellule par
  cellule (une ligne insérée pour l'écarté du J1, 93 cellules, zéro écart
  à la relecture). **Après tout import fait par l'utilisateur, relire
  aussi les autres onglets**, pas seulement le Programme, et préférer
  l'option « Remplacer la feuille actuelle » dans les consignes données.
  Le même jour : « Renvoyer tout l'historique » n'écrivait plus rien, la
  mémoire d'idempotence du pont (`seances_v2`) croyant écrites des séances
  absentes du classeur. `dejaEcrite()` (`appsscript/Code_v2.gs`,
  `VERSION_PONT` `v2-2026-11-09`) vérifie désormais que l'identifiant
  figure encore dans l'onglet `Séances`, et retrouve le classeur seule
  (une première version dépendait d'une ligne d'appel non recopiée et
  restait inactive). Recollé et redéployé par l'utilisateur le même jour :
  49 séances dans le classeur (26 août au 8 novembre), aucun doublon,
  602 séries ; trois séances d'essai du 26 août sans type n'ont écrit
  aucune série (le pont n'écrit les séries que des séances `muscu`). Sauvegarde datée :
  `python outils/sauvegarder_classeur.py` vise maintenant le classeur v2
  (`--v1` pour l'ancien) et refuse d'écrire si un onglet attendu manque.
- **Onglet Programme du classeur aligné sur `classeur/Programme.csv` le
  6 novembre 2026**, à la demande de l'utilisateur, depuis le navigateur
  intégré (compte Google de l'utilisateur) : lignes 3, 9, 11 à 13, 19 et
  25, relues ensuite par gviz, zéro écart. Piège de saisie : dans la
  grille de Sheets, le texte tapé n'est pris qu'une fois l'éditeur de
  cellule ouvert (cellule choisie par la zone de nom, Entrée, Ctrl+A,
  texte, Tab) ; tapé directement sur la cellule sélectionnée, il est
  perdu, et les noms de touches de ponctuation ne passent pas.
- **Rear kick à la place de l'extension de hanche machine, J4, le
  6 novembre 2026** (pile de la machine au maximum). Fait ce jour-là et
  saisi sous l'ancien nom ; l'utilisateur veut repartir de zéro avec ces
  données : `renommerRearKick()` (`v2/js/donnees.js`, une seule fois,
  `muscu2.rearKickRenomme`) renomme l'exercice dans la seule séance
  `S1793958424096`, `exo.remplace` garde l'ancien nom ; l'historique plus
  ancien de l'extension de hanche reste sous son nom, sans fusion. Les
  trois lignes de cette séance dans l'onglet `Séries` du classeur ont été
  renommées le même jour.
- **Courbes colorées par jour de programme, le 8 novembre 2026** (« une
  couleur par programme, des nuances légères entre les 2 ou 3 séances »,
  pour voir si un écart tient à l'enchaînement dans la séance) : quand un
  exercice vit sur plusieurs jours, chaque point prend la nuance de son
  jour (`NUANCES_JOURS`, un même bleu en trois nuances, dans l'ordre de la
  semaine, `teintesParJour()` dans `v2/js/suivi.js`), une légende donne
  le jour et la place de l'exercice dans ce jour (« J1 Haut max · 1er
  exercice »), et la fiche du point la place réelle dans cette séance.
  Un exercice d'un seul jour garde l'affichage d'avant.
- **Consignes et réglage machine, le 8 novembre 2026** : « Machine »
  devient « Réglage machine » sur la fiche et le plein écran de repos ;
  les deux lignes portent un crayon (icône `crayon`) pour dire qu'elles se
  modifient d'un appui, et l'enregistrement se confirme en vert. Une
  consigne technique pour chaque exercice dans `classeur/Programme.csv` :
  écrites pour le développé machine (son « POS 1 » passe en colonne
  Reglages), et réécrites pour la traction, le développé épaules machine,
  l'extension triceps barre, les mollets, l'extension jambes et le curl
  pupitre. Une consigne modifiée sur le téléphone reste prioritaire sur
  celle du programme (`consigneAffichee()`).
- **Chrono « fluide et cinétique », le 8 novembre 2026** (« légère
  animation, plus dynamique et moderne » ; direction A choisie parmi
  trois) : l'anneau du plein écran se vide en continu (`animerAnneau()`,
  une image par rafraîchissement, `poserAnneau()`), une pointe lumineuse
  marque sa tête (`#minuterie-pointe`) ; les chiffres du plein écran et du
  bandeau défilent comme un compteur à rouleau (`chiffresRoulants()`, un
  emplacement `.case` par caractère, l'ancien chiffre retiré même si
  l'animation est ralentie, sans quoi ils s'empilaient) ; rebond sur les 5
  dernières secondes ; à zéro, l'anneau plein passe au vert 700 ms
  (`.minuterie-plein.fini`, sans bloquer les appuis). Rien sous
  `prefers-reduced-motion`.
- **Un seul bleu pour le repos et les RIR, le 8 novembre 2026** (« bleu
  bandeau pause identique RIR, légèrement moins saturé ») : `--repos`
  passe du bleu nuit `#1e3a8a` à `#2d61d2` (teinte de l'accent, saturation
  65 %), et le bouton RIR choisi comme la cible RIR le prennent aussi.
  Bandeau et plein écran de repos, pastille flottante et chrono de gainage
  suivent, par le même jeton.
- **Douleurs en double dans le classeur, corrigé le 8 novembre 2026** :
  une douleur notée en séance partait avec la séance (le pont l'écrit dans
  `Douleurs`) puis une seconde fois par l'action `douleurs` de
  `synchroniser()`, qui renvoyait en plus toutes les douleurs dès qu'une
  seule était nouvelle. Le pont déduplique sur exercice et date, mais la
  date relue dans la feuille est convertie en date par Sheets et ne se
  compare plus au texte envoyé : « # » du 5 novembre trois fois, le
  développé machine du 8 deux fois. Désormais l'action `douleurs` ne porte
  que les douleurs nouvelles sans séance. Les trois lignes en double ont
  été supprimées du classeur le même jour (une ligne par douleur reste). Après une douleur notée,
  toast vert « Note enregistrée. » (`toast(…, 'succes')`, `.toast.succes`).
- **Écarté poulie basse vers le haut en fin de J1, le 8 novembre 2026**
  (l'utilisateur : « finir par un tirage poulie vers le haut, pour une
  isolation pec haut » ; le mot juste est écarté, pas tirage). Même
  exercice et même prescription qu'en J3 (3 × 12-15), 6e et dernier du
  J1. **Exception assumée à la règle d'ordre** (priorité des muscles puis
  espacement) : un exercice d'isolation des pectoraux peut finir la
  séance, il ne dépend presque pas des triceps et des épaules fatigués
  avant lui ; c'est une déduction du principe, pas un résultat d'étude.
  Pectoraux portés à 23 séries par semaine (11 + 3 au J1, 3 au J3, 6 au
  J5). La séance du 8 novembre était la plus courte (69 min) parce
  qu'elle comptait le moins de séries (17, contre 20 au J3 et 24 au J4).
- **Développé épaules à la machine, le 8 novembre 2026** : simple
  changement de nom (« Developpe epaules machine » sur J1, J3 et J5),
  l'historique de « Developpe epaules halteres » suit par `ANCIENS_NOMS`.
  Le pas de charge passe à 5 kg (le nom contient « machine »).
- **J1, J3 et J5 réordonnés le 8 novembre 2026** par la règle « priorité
  des muscles visés, puis espacement des zones » (voir « Nouveau
  programme ») : J1 développé incliné, dips, développé machine, développé
  épaules, extension triceps ; J3 écarté poulie basse, traction, développé
  épaules, rowing, oiseau inversé, curl incliné ; J5 développé machine,
  traction, développé couché haltères, développé épaules, tirage vertical,
  face pull, curl pupitre, extension triceps. Ordres plus anciens, pour
  mémoire :
- **J3 réordonné une seconde fois, le 6 novembre 2026** (l'utilisateur :
  curl incliné « à la fin, trop proche des tractions, je n'ai pas assez de
  puissance ») : traction, développé épaules, rowing, écarté poulie basse,
  oiseau inversé, curl incliné. Mettre le curl seul à la fin collait
  développé épaules et oiseau ; cet ordre, choisi par l'utilisateur (ordre
  A), sépare traction et rowing, les deux épaules, et éloigne le curl des
  tirages, au prix de l'écarté reculé en 4e place. Ordre d'avant, pour
  mémoire :
- **J3 réordonné** (même remarque, « oiseau inversé à la fin ») : traction,
  écarté poulie basse, rowing, élévation latérale, curl incliné, oiseau
  inversé. Mettre l'oiseau à la fin collait traction et rowing (même zone,
  règle de l'utilisateur) : l'écarté les sépare, l'élévation latérale
  sépare le curl du rowing (remarque du 19 octobre, biceps fatigués) et
  l'oiseau de l'élévation. `classeur/Programme.csv` et
  `v2/data/programme.json` à jour ; **les lignes J3 sont à recoller dans
  l'onglet Programme du classeur**, sans quoi le prochain import depuis le
  classeur reviendrait à l'ancien ordre.
- **RIR par quatre boutons 0 à 3**, cible du programme présélectionnée
  (contour) et retenue si rien n'est touché : fini les 1,3 saisis au
  clavier, inexploitables.
- **Garde-fou de saisie** (`chargeAberrante()`) : une charge hors de 0,6 à
  1,4 fois la dernière surligne le champ et demande confirmation à la
  validation (cas réel : 25 puis 55 kg à l'extension jambes). Le `change`
  du champ repart quand le dialogue prend le focus : un drapeau
  (`confirmationEnCours`) empêche un second dialogue par-dessus le premier,
  trouvé par `tests/test_v2.py`. **Référence : la série la plus lourde de
  la dernière fois** (`chargeDeReference()`, depuis le 6 novembre 2026),
  comme la charge suggérée ; c'était la première série, et une séance en
  pyramide (45 puis 55, 55) faisait suggérer 60 kg puis signaler 65 kg
  « contre 45 kg ».
- **Deload depuis l'application** : bascule sur l'écran de démarrage
  (`seance.deload`), filigrane à 70 % de la dernière fois, séance écartée
  de `occurrences()` donc de toutes les comparaisons, marquée dans le
  classeur et l'historique.
- **Alerte recul ×2** (`reculDouble()`) : première série en baisse deux
  séances de suite, signalée sur l'écran de démarrage, dans Suivi et dans
  le bilan mensuel, avec la conduite écrite ici le 26 septembre (alléger
  la séance qui précède). **Jour en retard** : plus de 9 jours depuis la
  dernière séance du jour (`retardDuJour()`), en rouge sur la carte, et
  fréquence « n des 7 dernières semaines » quand elle est basse.
  **Espacement** : avertissement si l'autre jour de pectoraux date de moins
  de 3 jours (`avertissementEspacement()`), lu dans le programme par le
  champ muscle, pas câblé sur des codes.
- **Écran de démarrage** : phrase d'ouverture tirée de `PHRASES_OUVERTURE`
  (ton de coach, différente d'une séance à l'autre par hachage de
  l'identifiant), forme du jour sur 5 et deload, conseil de deload si forme
  basse et mauvaise nuit (lue dans le sommeil saisi), échauffement du jour
  complété par une montée en charge chiffrée sur le premier exercice (50 %
  puis 75 % de la dernière charge).
- **Réglages de machine** par exercice (`muscu2.reglagesMachine`,
  indexés par nom, repli sur la colonne Reglages du programme), affichés
  sur la fiche et rappelés sur le plein écran de repos avant l'exercice
  suivant. **Douleur rattachée à l'exercice** (`muscu2.douleurs`) : saisie
  depuis la fiche, rappelée sur la fiche et à l'échauffement pendant trois
  semaines, envoyée à l'onglet `Douleurs`. **Remplacement d'exercice en
  séance** (menu de la fiche) : substituts du programme, puis même muscle,
  puis tout le catalogue des noms connus ; le nom choisi retrouve son
  propre historique (identité par nom conservée), `exo.remplace` garde
  l'original, retour possible.
- **Bilan mensuel** (pas hebdomadaire, choix de l'utilisateur) : séances
  des quatre dernières semaines, jours faits sur quatre attendus, séries
  par semaine et par muscle prescrites contre réalisées dans l'ordre de ses
  priorités (`volumeParMuscle()`), progression par exercice, reculs,
  douleurs. Constat au passage, à partir du programme : 19 séries de dos
  contre 14 de pectoraux par semaine, inversion par rapport à la priorité
  1 ; c'est une décision de programme, pas de code.
- **Courbes lisibles** (`courbeSvg()` dans `v2/js/ui.js`) : ordonnées
  graduées en kilos, abscisses datées, un appui sur un point ouvre la
  fiche de la séance (séries, remarque, douleur, lien vers la ligne du
  classeur quand elle est connue).

### Ce qui est conservé de la v1

Les règles de saisie éprouvées en salle : les répétitions valident à la
confirmation du champ, le clavier est amorcé avant tout rendu
(`#amorce-clavier`), la dernière série passe à l'exercice suivant, la
minuterie appartient à la série finie et continue par-dessus la fiche
suivante, le plein écran de repos se masque d'un appui (plus à 10 s de la
fin depuis le 5 novembre 2026, voir plus bas),
quitter une séance la laisse en cours, plusieurs séances en cours à la fois
(une par jour), la validation sans chiffres reprend le filigrane, le retour
Android remonte d'un écran (une entrée d'historique « garde », `popstate`).
Les cinq types de cardio, la séance de gainage et ses règles, le sommeil,
les mensurations et les mannequins sont portés tels quels
(`v2/js/tables.js` reprend les tables de la v1 sans réécriture). Le signal
sonore, la vibration et le verrou d'écran restent.

### Fluidité

`v2/sw.js` sert **le cache d'abord** pour tout ce qui est listé, avec
revalidation en arrière-plan ; une mise en ligne est prise au lancement
suivant, et `VERSION` (`muscu2-AAAA-MM-JJ-n`) **doit changer à chaque
livraison**, c'est elle qui purge l'ancien cache. Les 44 schémas Everkinetic
et la photo du face pull sont précachés. L'historique est mémoïsé en
mémoire (`historique()`), invalidé à chaque écriture.

### Vérifications de la v2

`pytest tests/test_v2.py` (20 tests, mêmes règles que `tests/test_app.py` :
saisies réelles, témoin structurel des sept cartes, échec sur toute
exception). `outils/verifier_code.py` analyse aussi la syntaxe des fichiers
de `v2/` et de `appsscript/Code_v2.gs`, et cherche les noms cités ici dans
les sources v2. Le détecteur `impeccable` ne remonte plus rien sur
`v2/index.html` ; deux exceptions motivées dans `.impeccable/config.json`
(Roboto voulu par la direction choisie, marge de `.barre` lue sans la
feuille de style).

### Revue de finition (impeccable, 4 novembre 2026)

Relecteur de finition lancé sur six captures (390 et 1440 px) : verdict
« fix », huit retouches matérielles appliquées en un lot puis scorées
résolues, verdict « ship » sur ce périmètre. Ce qui a changé : carte du
prochain jour mise en avant (`prochainJour()` dans `v2/js/sport.js`, anneau
bleu et puce « Prochaine », le jour qui suit le dernier fait) ; RIR sur sa
propre sous-ligne avec des cibles de 44 px et RP/suppression à 40 × 48 px
(l'ancienne grille donnait 24 px aux boutons RIR) ; écart nul neutre (plus
de « +0 kg » en vert, `classeEcart()`) ; dernière étiquette de date ancrée
à droite, point choisi plus gros, courbe plafonnée à 420 px sur grand
écran ; image d'exercice sur fond blanc ; ligne « Machine » (plus
« Réglages », même mot que l'onglet) et icône de l'onglet Réglages en deux
curseurs. **Deux pièges de navigation trouvés à cette occasion** : l'écran
sortant restait à -30 % (puis, une fois la classe retirée, regagnait 100 %
en restant visible 220 ms : il faut forcer une mise en page entre
`transition: none` et le retrait de la classe) ; et `#app` en
`overflow: hidden` devenait défilable par programme, un `focus()` le
décalait de 16 px : `overflow: clip`. Restent, non matériels et hors de ce
passage : couche d'état M3 à l'appui, élévation de la barre au défilement,
suppression de série par geste, bouton « Suivant » loin du pouce en bas
d'une longue fiche. `DESIGN.md` et `.impeccable/design.json` sont écrits
par le documenteur à partir du code livré (17 jetons de couleur, règles
nommées). Écarts notés et non corrigés : des couleurs littérales hors
jetons (cardio, gainage, mesures, sommeil, pastels de l'état musculaire),
les emoji des puces de Sommeil (sport et raisons) qui échappent au jeu
d'icônes, les exceptions v1 du détecteur qui restent cantonnées aux
fichiers v1.

### Garde-fou gainage (4 novembre 2026, soir)

Remarque de l'utilisateur : « bug dans gainage object object ». Non
reproduit dans le bac à sable (historique v1 injecté avec farmer walk en
objets, séance de gainage saisie et terminée : rien). Pose d'un garde-fou
dans `v2/js/gainage.js` (`nombreAffichable()`) : une valeur d'historique de
type objet n'est jamais écrite telle quelle dans un champ ou un filigrane,
et une valeur objet rencontrée sur un mouvement en répétitions ou en tenue
est remise à `null`. **Cause exacte non confirmée** : l'endroit précis
(carte, « Dernière fois », écran de fin, liste, toast d'envoi) est demandé à
l'utilisateur. `VERSION` du service worker passée à `muscu2-2026-11-04-2`.
**Cause trouvée sur capture Pixel, même jour** : la v1 range la durée de
tenue en objet `{ secondes }` (`muscu.dureeGainage`), recopié tel quel par
la migration ; la v2 le lisait comme un nombre, d'où « ▶ [object Object] s »
sur chaque bouton de tenue et un minuteur à `NaN:NaN`. `lireDureeTenue()`
accepte les deux formes et borne à 15-120 s ; le garde-fou ci-dessus reste.
**Triangles d'alerte géants sur Suivi, même capture** (« trop gros pas
clair ») : `svgIcone('alerte')` dans `.alerte` n'avait aucune règle de
taille ni de trait, le SVG prenait toute la largeur en noir plein. Règle
`.alerte svg` (20 px, trait, pas de remplissage). `VERSION` passée à
`muscu2-2026-11-04-3`.

### Retours Pixel du 4 novembre 2026 (après-midi)

Cinq demandes de l'utilisateur, après ses premières captures de la v2 :

- **Jauge de séance en pilule** (« comme précédemment ») : la fine ligne de
  4 px sous la barre cède la place à la pilule de la v1 (`.jauge-pilule`
  dans `.ligne-progression`, remplissage bleu, chrono de séance à sa
  droite). Même valeur qu'avant (`rendreJauge()`, séries pondérées par le
  repos).
- **Abandon depuis la fiche** (« en position haute, proche de la croix ») :
  croix à droite du titre de `#ecran-seance` (`#seance-abandonner`,
  `abandonnerSeanceCourante()`), confirmation puis retour à Sport. La croix
  du bloc « Séances en cours » de Sport reste.
- **Écran d'accueil** (« une page d'accueil principale et une page d'entrée
  dans le programme avec des phrases motivantes et intéressantes ») :
  quatrième onglet `Accueil`, racine de démarrage (`rendreAccueil()` dans
  `v2/js/sport.js`) : salutation selon l'heure, phrase de motivation du
  jour (`PHRASES_MOTIVATION`, hachage de la date ; 46 phrases depuis le
  6 novembre 2026, dont des citations attribuées seulement quand la source
  est vérifiable : Rollins, Nietzsche, Kipchoge, Coleman, Durant résumant
  Aristote, présenté comme tel), séances de la semaine,
  total, jours depuis la dernière, carte de la prochaine séance ou de la
  séance en cours, bouton « Entrer dans le programme » vers Sport. L'écran
  de démarrage d'une séance ajoute un « Le saviez-vous »
  (`FAITS_ENTRAINEMENT`, hachage de l'identifiant de séance) sous la phrase
  d'ouverture : faits restreints à ce qui est établi par méta-analyses ou
  essais contrôlés, sans chiffre inventé. Les tests passent par l'onglet
  Sport (`ouvrir_sport()`), le témoin des sept cartes est scopé à
  `#ecran-sport` : l'accueil réutilise `.carte-jour`.
- **Objectif moins gros** : `.objectif .val` de 40 à 26 px.
- **Triangles noirs de Suivi** : corrigés le matin même (`.alerte svg`, voir
  « Garde-fou gainage » ci-dessus), le téléphone n'avait pas encore reçu la
  version. `VERSION` passée à `muscu2-2026-11-04-4`.
- **Icônes dans le calendrier** (demande suivante, même jour) : les puces
  texte « J1 » / « G » cèdent la place aux icônes de trait du jeu commun
  (`ICONE_TYPE` dans `v2/js/suivi.js` : haltères, coureur, planche pour
  le gainage, icône `gainage` ajoutée à `ICONES`), deux par case au plus,
  réduites quand elles sont deux ; une nuit renseignée porte une lune en
  coin en plus du trait bleu, quand la case est cochée.
- **Alertes de Suivi sous les menus** (« les warnings de suivi en dessous
  des menus ») : la grille des tuiles vient en premier, les alertes recul
  ×2 et jour en retard suivent sous un titre « À surveiller ». `VERSION`
  passée à `muscu2-2026-11-04-5`.
- **Détail de séance depuis le calendrier** (« le détail de la séance sur
  le dessin ») : un jour qui porte une séance devient un bouton ; l'appui
  ouvre une feuille avec chaque séance du jour (`detailSeance()`, le même
  résumé que la liste des séances) et un bouton vers la fiche complète.
  `VERSION` passée à `muscu2-2026-11-04-6`.

### Nouveau programme (4 novembre 2026, soir)

Décidé avec l'utilisateur après analyse structurelle du programme (sans
l'historique du classeur, Google inaccessible depuis le bac à sable ;
l'export JSON de la v2 fourni ensuite a servi aux charges de départ).
Règles données par l'utilisateur, à respecter dans tout programme futur :
**pectoraux priorité 1** (20 séries, trois expositions) ; **tractions au
moins deux fois par semaine** ; **aucune série au-delà de 15** (seules
exceptions, mollets et abducteurs 10-15 et 12-15, machines sans crans
fins) ; **jamais deux exercices de la même zone à la suite** dans une
séance (les dips comptent comme zone à part, à sa demande) ; **dans une
séance, l'ordre suit d'abord la priorité des muscles visés, puis
l'espacement des zones** (règle précisée le 8 novembre 2026, après un
développé épaules placé en 2e position du J1, avant les dips et le
développé machine : un exercice composé d'un muscle moins prioritaire ne
passe jamais avant les exercices des pectoraux, qu'il pré-fatiguerait par
le deltoïde antérieur et les triceps) ; **élévation
latérale uniquement aux haltères, jamais à la poulie**. Dos ramené de 19 à
13 séries (lat pull-in et curl marteau retirés), ischios remontés en 2e de
Jambes, bras à 6 séries directes en 8-10. Un exercice neuf, « Developpe
couche halteres » (J5, choisi contre l'incliné machine : amplitude en
étirement, stabilisation, charge comparable), avec « Developpe incline
machine » écarté comme substitut : c'est un ancien nom de l'incliné banc (`ANCIENS_NOMS`), le remplacement retombait sur le même exercice, trouvé par le test de remplacement ; substituts sans banc à la place (développé machine, dips) ; la colonne Substituts est
remplie sur la plupart des exercices (menu « Remplacer » de la fiche).
`classeur/Programme.csv` réécrit et importé par
`outils/importer_programme_v2.py classeur/Programme.csv` (6 jours, 26
exercices) : **l'utilisateur doit recoller ce CSV dans l'onglet Programme
du classeur**, qui reste la source pour les imports suivants. Deux
illustrations approchées faute de schéma Everkinetic téléchargeable d'ici.
`VERSION` passée à `muscu2-2026-11-04-7`.

### Mise à jour qui n'arrivait pas sur le téléphone (4 novembre 2026, soir)

Aucune des livraisons du jour n'a été vue sur le Pixel malgré plusieurs
fermetures. Deux causes possibles, toutes deux traitées sans pouvoir
vérifier d'ici (GitHub Pages inaccessible depuis le bac à sable) :
`cache.addAll` passait par le cache HTTP du navigateur, donc un nouveau
cache `VERSION` pouvait se remplir d'anciens fichiers (`Request` en
`cache: 'reload'` désormais) ; et le nouveau service worker, une fois
actif, laissait la page ouverte sur l'ancien code (`controllerchange`
recharge la page, sauf sur la fiche de séance où un toast reporte au
lancement suivant). La version installée est visible en pied de Réglages
(`versionApp`, demandée au service worker par message) : c'est elle qui
dit si le téléphone a reçu une livraison. `VERSION` passée à
`muscu2-2026-11-04-8`.
**Restauration depuis un export** (même soir, après l'effacement des
données du site sur Firefox, qui vide aussi `localStorage`) : bouton
« Restaurer depuis un fichier JSON » dans Réglages (`#r-importer`,
`#reglages-fichier`), lit un export de l'application ; les listes à
identifiant (séances, mensurations, remarques, nuits par `cle`)
fusionnent sans doublon, les autres clés ne sont reprises que si elles
sont vides sur le téléphone. Jamais d'écrasement d'une saisie plus
récente. `VERSION` passée à `muscu2-2026-11-04-9`.
**Icônes explicites, même soir** (« une haltère pour les jours muscu et
un bonhomme pour les endurances, je veux plus explicite ») : une icône par
jour de musculation (par le nom du jour depuis la revue du soir, voir plus bas : push, pull,
jambes, hautmax) et une par type de cardio (`ICONE_CARDIO`, premier type
renseigné de la séance), étiquette courte sous l'icône quand le jour n'a
qu'une séance (`iconeSeance()`). `VERSION` passée à `muscu2-2026-11-04-10`.

### Revue de code du soir (4 novembre 2026)

Revue indépendante des commits du jour, sept constats, tous traités :
l'abandon depuis la fiche ne changeait pas d'écran (`pile` préfixée avant
`afficher('sport')`, qui prenait sa branche « même écran » ; test ajouté,
`test_l_abandon_depuis_la_fiche_ramene_a_sport`) ; le rechargement
automatique de mise à jour est bloqué dès qu'une séance est ouverte (fin,
démarrage compris) ; la version du pied de Réglages se met à jour à la
réception du message du service worker ; la restauration fusionne les
objets champ par champ (le pont revient même si un réglage a été touché
avant) et recharge `reglages` en mémoire ; un seul hachage
(`choixHache()`) pour les trois listes de phrases ; l'accueil ignore une
séance en cours dont le jour a disparu du programme ; l'icône d'un jour
de musculation se lit dans son nom puis ses muscles (`iconeJourMuscu()`),
plus dans son code. `VERSION` passée à `muscu2-2026-11-04-11`.
**Relecture de finition du soir, accueil et calendrier** (deux captures,
verdict « fix », six retouches appliquées) : kicker « Aujourd'hui »
retiré (capitales réservées aux titres de section) ; carte de phrase en
`accent-fond` plutôt qu'en bleu plein (un seul bleu saturé, celui de
l'action) ; les trois chiffres en tuiles `fond-2` dans une seule carte,
libellés raccourcis pour des hauteurs égales ; « Entrer dans le
programme » en bouton secondaire, la carte de la prochaine séance restant
l'action principale ; étiquettes du calendrier à 10 px et icônes à 18 px
trait 1,8 (lisibles à bout de bras) ; icônes Pull (barre et figure
suspendue) et Haut max (barre au-dessus d'une figure) redessinées, le
bouclier et l'entonnoir ne se lisaient pas. `DESIGN.md` et le contrat de
direction notent le quatrième onglet. `VERSION` passée à
`muscu2-2026-11-04-12`.

### Chantiers ouverts de la v2

1. ~~Créer le nouveau classeur~~ **Fait par l'utilisateur le 4 novembre 2026** (classeur, onglet Programme, pont déployé, connexion testée). Pour mémoire : coller
   `classeur/Programme.csv` dans un onglet `Programme`, coller
   `appsscript/Code_v2.gs`, changer `SECRET`, déployer, renseigner
   `CLASSEUR_ID` et `GID_PROGRAMME` dans `outils/importer_programme_v2.py`,
   puis l'adresse et le mot de passe dans Réglages de la v2 et « Tester la
   connexion » (qui mémorise les gid pour le lien profond). Puis « Renvoyer
   tout l'historique au classeur ».
2. **Publier la v2** : le dossier `v2/` se sert tel quel à côté de la v1
   (même domaine GitHub Pages, adresse `/v2/`).
3. **Composeur de programmes** (le « sélecteur d'exercice » de
   l'utilisateur) : à faire après validation de la v2, selon les crédits.
   Architecture retenue dans le rapport : programme sur le téléphone,
   composé depuis un catalogue de noms canoniques, classeur en sauvegarde,
   import conservé comme autre façon d'ajouter un programme.
4. Vérifier sur le Pixel 9 ce que le bac à sable ne mesure pas : clavier
   virtuel et plein écran de repos, vibration, verrou d'écran, installation.

## Version 1 : documentation déplacée

Tout ce qui décrit la v1 (architecture, classeur « semaine 1 », pièges
d'import, comportements de l'application, menu Sport/Suivi, chantiers
ouverts v1) vit depuis le 4 novembre 2026 dans `docs/CLAUDE_V1.md`,
**à lire avant de toucher à `index.html`, `js/app.js`, `css/style.css`,
`outils/importer_classeur.py` ou `appsscript/Code.gs`**. Déplacé pour
alléger ce fichier, chargé à chaque tour de conversation (168 Ko, soit
l'essentiel du coût de contexte d'une session) ; rien n'y a été résumé ni
retiré. Les règles de la v1 valent toujours pour elle.

## Vérifications

Quatre outils, nés le 10 septembre 2026 d'une série d'incidents que les
vérifications à la main n'avaient pas vus.

- **`pytest tests/`** : l'application dans un vrai Chromium piloté par
  Playwright (`tests/test_app.py`), servie par un serveur local sur le vrai
  `data/programme.json`, avec de vrais clics et de vraies saisies. Un test par
  défaut réellement rencontré ou par décision arrêtée avec l'utilisateur.
  **Témoin structurel** : chaque test commence par vérifier que l'accueil
  affiche les sept cartes attendues, `J1` à `J6` plus `G`, et échoue sur
  toute exception JavaScript non rattrapée. Les tests ne supposent aucun nom d'exercice, ceux-ci venant du
  classeur. Préalable, une fois : `python -m playwright install chromium`.
  - **Les saisies doivent être réelles** (`fill`, `press`, `click`), jamais des
    événements fabriqués. Dès son premier passage, le test de la dernière
    série a trouvé que valider avec Entrée sautait **deux** exercices, ce que
    des dizaines d'essais à la main par `dispatchEvent` n'avaient pas montré.
    Une valeur réellement tapée rend le champ « sale », et le navigateur
    déclenche alors un vrai `change` quand le focus part ; une valeur posée
    par script ne le fait jamais.
- **`outils/verifier_import.py`**, lancé automatiquement à la fin de chaque
  import : compare le programme importé au dernier publié, lu dans git, et
  sort en erreur sur toute **ALERTE** : jour disparu, historique passé d'un
  exercice à un autre, historique perdu ou modifié, exercice disparu avec son
  historique. Né des trois incidents du 9 septembre 2026 (J1, J3, J6). Un
  témoin, un échange d'historique fabriqué, doit être détecté avant toute
  comparaison, sans quoi l'outil se déclare inexécutable. En simple info, un
  signal faible : une dernière séance au nombre de séries différent de la
  prescription, celui qui avait trahi l'échange de J1.
  - **`noms_ambigus`**, ajouté le 13 septembre 2026 avec le regroupement de
    l'historique par nom d'exercice (voir plus haut) : deux noms qui ne
    diffèrent que par la casse, un accent ou un espace sortent en ALERTE, un
    nom rigoureusement partagé entre deux jours ne l'est jamais. Son propre
    témoin, distinct de celui de `comparer()`, doit détecter une paire
    fabriquée avant que le contrôle ne se prononce.
- **`outils/verifier_code.py`**, né le 12 septembre 2026 d'une relecture
  complète qui a trouvé, sans qu'aucun outil ne les signale : un passage de ce
  fichier décrivant des fonctions supprimées la veille, un commentaire de
  `sw.js` annonçant l'inverse de ce que fait le fichier, et des titres de
  colonnes décalés de 26 pixels. Quatre contrôles, chacun avec son témoin :
  identifiants du DOM demandés par `js/app.js` et absents d'`index.html` ;
  noms de code cités par ce fichier et introuvables dans les sources, sauf
  dérogation explicite (`NOMS_HISTORIQUES`, pour ceux que le texte présente
  comme anciens) ; invariants de la séance de gainage (rangs d'interférence
  distincts et complets, couleur, catégorie unique) ; syntaxe des trois
  fichiers JavaScript, analysés par Chromium sans être exécutés, seul contrôle
  que `appsscript/Code.gs` reçoive jamais, faute de tourner ailleurs que chez
  Google. Les trois premiers sont rejoués par `pytest tests/`, le quatrième
  demande le navigateur et ne part qu'à la main.
- **`outils/sauvegarder_classeur.py`** : copie datée du classeur entier, tous
  onglets, en xlsx dans `sauvegardes/`, **exclu de git** : le dépôt est public,
  et le classeur contient Remarques et Blessures. L'historique des versions de
  Google porte sur le classeur entier ; restaurer un onglet ramène tous les
  autres en arrière, cas réel du 9 septembre 2026. La copie n'est écrite que
  si elle se relit comme un classeur contenant l'onglet du programme.

**Environnement observé** : le service worker de cette PWA (`sw.js`) refuse
de s'enregistrer dans le navigateur d'aperçu intégré à Claude Code (erreur
générique côté `navigator.serviceWorker.register`), alors que le fichier se
sert correctement et qu'un `fetch()` direct du même script réussit. Vérifié
sur un serveur sain (`ThreadingHTTPServer`, HTTP/1.1) : très probablement une
restriction du bac à sable de prévisualisation, pas un défaut de
l'application. À revérifier sur un vrai Chrome Android avant de conclure à
un bug si le sujet revient.

## Posture sur les questions d'entraînement

Demandé mot pour mot par l'utilisateur le 10 septembre 2026 : **« Sois mon
coach, pour le sport. »** Ce cadre vaut pour les questions d'entraînement
(programmation, progression, technique, charge) ; **il ne vaut pas pour le
travail sur cette application**, où les échanges gardent leur forme
habituelle.

- Pas de flatteries ; direct, objectif, succinct.
- Il ne cherche pas de validation mais une expertise.
- **Ne jamais inventer de donnée.** L'interroger si le contexte ou les
  éléments fournis sont insuffisants, **avant** de répondre plutôt qu'en
  déduisant à sa place.
- Approche scientifique, rationnelle et structurée. Corriger factuellement
  une erreur de raisonnement, dire si un objectif est trop élevé.
- Justifier en citant les concepts ou principes sous-jacents.
- Appuyer les recommandations **d'abord sur des données ciblant des
  pratiquants récréatifs ou intermédiaires**, puis sur des athlètes
  professionnels.
- **Si la réponse n'est pas certaine, l'admettre simplement.**
- Distinguer nettement ce qui est établi (méta-analyses, essais contrôlés)
  de ce qui n'est qu'inféré d'un principe. Un résultat d'EMG n'est pas une
  preuve d'hypertrophie. Quand une comparaison directe n'a pas été étudiée,
  le dire plutôt que d'extrapoler avec assurance.

Il est en reconversion professionnelle, méthodique, et travaille avec un
programme écrit : une réponse complaisante ne lui sert à rien.

**Priorités musculaires, données par l'utilisateur le 26 septembre 2026**,
de la plus haute à la plus basse : pectoraux ; dos et épaules ; bras ;
quadriceps ; puis, nettement en dessous, grand fessier et mollets. C'est
elle qui a fixé l'ordre de semaine (Haut max, Cardio, Pull, Jambes, Push,
Cardio) : les pecs gardent 4 puis 3 jours d'écart entre Haut max et Push,
le 48 h retombant sur le dos (Haut max → Pull). À surveiller : la première
série du tirage vertical ; si elle baisse deux semaines de suite, alléger
le dos de Haut max plutôt que changer l'ordre. Le HIIT (sauts, fentes)
compte comme travail de jambes : de préférence le second jour de cardio,
après les jambes plutôt qu'avant.
