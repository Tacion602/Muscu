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
`GID_PROGRAMME` (`291704442`) y sont renseignés ; `--depuis-v1` convertit
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
- **Charge suggérée, double progression** (`objectifExercice()`) : si la
  dernière fois toutes les séries de travail ont atteint `reps_max` avec un
  RIR réel inférieur ou égal à la cible (ou non saisi), charge + un pas
  (`pasDeCharge()` : 5 kg sur les grosses machines, 2,5 kg ailleurs, lu
  dans le nom) et viser `reps_min` ; sinon même charge, une répétition de
  plus sur la première série. Affichée en tête de fiche, et en filigrane
  de la première série (les suivantes montrent la dernière fois). Rien sans
  historique, rien en deload.
- **RIR par quatre boutons 0 à 3**, cible du programme présélectionnée
  (contour) et retenue si rien n'est touché : fini les 1,3 saisis au
  clavier, inexploitables.
- **Garde-fou de saisie** (`chargeAberrante()`) : une charge hors de 0,6 à
  1,4 fois la dernière surligne le champ et demande confirmation à la
  validation (cas réel : 25 puis 55 kg à l'extension jambes). Le `change`
  du champ repart quand le dialogue prend le focus : un drapeau
  (`confirmationEnCours`) empêche un second dialogue par-dessus le premier,
  trouvé par `tests/test_v2.py`.
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
suivante, le plein écran de repos se masque à 10 s de la fin ou d'un appui,
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
  jour (`PHRASES_MOTIVATION`, hachage de la date), séances de la semaine,
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
