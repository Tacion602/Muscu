# Suivi de musculation

Application web installable pour suivre les séances en salle sur Android :
écran plein d'un exercice à la fois, saisie charge/répétitions/RIR, rappel de
la dernière fois pour juger la surcharge progressive, minuterie de
récupération. Les séances sont écrites dans le classeur Google Sheets qui sert
de programme.

Porteur du projet : le même qu'sur l'agenda culturel géolocalisé, projet
voisin sans rapport de contenu. Phase de démarrage.

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

## Architecture

- `index.html`, `css/style.css`, `js/app.js` : l'application elle-même, un
  fichier JavaScript unique, pas de build.
- `data/programme.json` : sortie de l'import du classeur, lue par
  l'application au démarrage. Régénérée par `outils/importer_classeur.py`,
  jamais éditée à la main.
- `outils/importer_classeur.py` : lit l'onglet du programme en cours (export
  CSV public du classeur), reconnaît la grille et les quatre informations
  logées en colonne B de chaque exercice (prescription de séries, RIR cible,
  consigne technique, muscle et temps de repos), écrit `data/programme.json`.
- `appsscript/Code.gs` : le pont vers le classeur, à coller dans
  Extensions > Apps Script **depuis le classeur lui-même** puis à déployer en
  application web. Écrit une ligne par série validée dans un onglet dédié
  `Séances (app)`, jamais dans la grille manuelle du programme dont la mise en
  page ne supporte pas un flux automatique.
- `sw.js`, `manifest.webmanifest`, `icones/` : rendent l'application
  installable et utilisable hors ligne.

## Le classeur

<https://docs.google.com/spreadsheets/d/1JyJSln_sqYnZzsnThiw7sbDcZjtma6n0Hmr-n8fYKiE>

Un seul onglet fait autorité, celui du programme en cours (gid
`1138168114`) : six jours, J1 Push, J2 footing, J3 Pull, J4 Bas du corps, J5
Haut prioritaire, J6/J7 repos ou footing. Deux anciens onglets ont existé
pendant la conception (un programme antérieur en superset, un onglet vide) et
ont été supprimés par l'utilisateur le 26 août 2026 : **ne jamais s'y fier
s'ils réapparaissent**, seul l'onglet du programme courant compte.

Chaque jour de musculation loge sept groupes de cinq colonnes
(`Exo, Charge, Reps, RIR, Total`), un par séance à venir, le septième portant
la mention `DELOAD`. La colonne B, sous le nom de l'exercice, porte dans un
ordre non garanti la prescription de séries, le RIR cible, une consigne
technique, et le muscle travaillé avec son temps de repos : l'import les
reconnaît par leur forme (une notation `4x 6-8`, un temps `2'30`, le mot
`RIR`), pas par leur position.

## Pièges déjà rencontrés côté import

- **RIR et temps de repos peuvent partager la même ligne** : `FACE PULL` porte
  `3 X 15-20 RIR 1'00`. La prescription de séries l'emporte toujours ; le
  temps qui l'accompagne ne sert que si aucune autre ligne du bloc n'en donne.
- **Le classeur mélange les libellés de repos** : `REPOS` et sa coquille
  `REOIS` cohabitent, parfois accolés au muscle sans espace (`1'15BICEPS`).
- **Les footings (J2, J6) n'ont ni exercice numéroté ni charge** : l'import
  les marque `type: "footing"` plutôt que de produire une liste vide qui
  laisserait croire à un jour sans contenu.
- **Le deload ne doit jamais nourrir la comparaison de progression.**
  `derniereFois()` dans `js/app.js` écarte les séances marquées `deload` en
  cherchant la dernière séance normale, sans quoi une charge allégée
  semblerait une régression.

## Comportements côté application, à ne pas défaire sans y repenser

- **L'échauffement ne compte jamais dans le tonnage ni dans la comparaison.**
  Une série se bascule en échauffement par un **appui long (500 ms) sur son
  bouton de validation** (un tap bref valide normalement) ; l'import du
  classeur reconnaît déjà les notes `ECH 1`, `ECH 2` de la même façon. Décidé
  le 26 août 2026 : la colonne numéro et la colonne « dernière fois » ont été
  retirées de la ligne de série (jugées redondantes avec les placeholders des
  champs de saisie, qui affichent déjà les valeurs précédentes), ce qui a
  supprimé le seul geste qui permettait ce basculement.
- **Valider une série sans chiffres saisis reprend ceux de la dernière fois**
  plutôt que d'enregistrer un vide : l'utilisateur peut confirmer d'un geste
  qu'il a reproduit sa performance précédente sans retaper les nombres.
- **La minuterie se lance après chaque série validée**, échauffement compris
  dès qu'un temps de repos est connu pour l'exercice, jamais sinon.
- **La minuterie se ferme d'elle-même à zéro**, sans afficher de temps
  écoulé en trop-plein (décision de l'utilisateur le 26 août 2026). Fermeture
  naturelle et bouton "Passer" partagent `minuterieTerminee()` : si la série
  qui vient de récupérer était la dernière de l'exercice, l'exercice suivant
  s'affiche automatiquement, plutôt que de laisser l'utilisateur sur une
  fiche entièrement complétée sans rien à y faire. **Le focus se pose sur le
  champ charge de la prochaine série non validée** (`focaliserProchaineSerie`)
  à chaque fermeture, pour reprendre la saisie sans toucher l'écran. Un appui
  sur "Passer" ouvre le clavier virtuel ; une fermeture automatique à zéro
  pose le focus mais certains navigateurs mobiles n'ouvrent pas le clavier
  sans geste direct de l'utilisateur, limite de la plateforme et non un défaut
  de l'application.
- **La touche Entrée du clavier numérique avance au champ suivant** (charge →
  reps → RIR → bouton de validation, puis la ligne suivante), construit dans
  `rendreSeries()` via un tableau `enchainement` reconstitué à chaque rendu :
  ne pas oublier de le repeupler si la structure de la ligne change.
- **Une série validée se colore selon son tonnage face à la même série la
  semaine passée** (`appliquerCouleurTonnage` dans `js/app.js`) : rouge
  désaturé à -5 % ou moins, vert désaturé à +6 % ou plus, neutre entre les
  deux. Éprouvé sur J1 puis étendu à tous les jours le 26 août 2026. **Le
  vert reprend `--accent-clair`** (le vert-bleu du bouton de récupération
  et du chronomètre de séance en marche), désaturé et transparent plutôt
  qu'un vert franc : décision de l'utilisateur le 26 août 2026 pour que
  les trois se lisent comme une même famille de couleur.
- **Un échauffement de 5 minutes s'affiche une seule fois**, au-dessus de la
  consigne technique du premier exercice de la séance (`ECHAUFFEMENT_PAR_JOUR`
  dans `js/app.js`). Rédigé à la main pour les zones travaillées ce jour-là,
  pas généré à partir du champ `muscle` : chaque jour suit la même trame,
  mobilité de l'articulation la plus sollicitée, activation des
  stabilisateurs, puis montée en charge sur le geste du premier exercice.
- **La touche Entrée sur le RIR valide directement la série** (appelle
  `.click()` sur le bouton plutôt que de se contenter du focus) : un clavier
  virtuel ne renvoie pas de second appui sur Entrée une fois le focus déplacé
  vers un bouton, la récupération ne démarrait donc jamais sans cette
  invocation explicite.
- **Les jours de course (J2, J6) ont leur propre écran**, activé le 26 août
  2026 : durée et distance, allure au kilomètre calculée, comparaison à la
  dernière sortie. **Il n'y a volontairement pas de chronomètre** : présent
  au départ, retiré le jour même à la demande de l'utilisateur, qui saisit
  ses chiffres après coup plutôt que de laisser l'application tourner.
- **Quatre types de séance de course** (`TYPES_COURSE` dans `js/app.js`),
  décidés le 26 août 2026 : endurance fondamentale, fractionné, incliné avec
  option lesté ou farmer walk, et séance au seuil. Trois points structurants :
  - **chaque type a son échauffement**, parce que l'exigence diffère : une
    endurance fondamentale se lance presque à froid, un fractionné demande un
    corps déjà chaud sous peine de blessure ;
  - **changer de type efface les champs propres à l'ancien** : une pente
    héritée d'une séance inclinée n'a aucun sens sur un fractionné ;
  - **le type précis part dans le classeur**, jamais un `footing` uniforme :
    comparer l'allure d'une endurance et celle d'un fractionné n'aurait pas
    de sens, et les colonnes dédiées (répétitions, récup, pente, charge
    portée, durée au seuil) restent traçables en graphique là où un champ
    texte libre ne le serait pas.
- **Le classeur reçoit deux familles de pages** (`ecrireSeance` dans
  `appsscript/Code.gs`), refondues une première fois le 26 août 2026 en trois
  onglets plats, jugés illisibles à l'usage par l'utilisateur le lendemain
  malgré leur intérêt pour les graphiques ; puis refaites le 27 août 2026 en
  ajoutant les pages de lecture humaine ci-dessous, **sans supprimer les
  premières** :
  - `Exercices (app)`, `Séances (app)` : une ligne par observation, sans mise
    en forme. Ce sont elles qu'on utilise pour un graphique Sheets classique
    (sélectionner deux colonnes, Insérer > Graphique).
  - **`J1`, `J3`, `J4`, `J5`, `Course`** : une page par jour d'entraînement,
    dans le format de la grille manuelle d'origine de l'utilisateur — celui
    qu'il a lui-même reconstitué à la main dans l'ancien onglet `Séries (app)`
    pour me montrer ce qu'il voulait. Un bloc par exercice (nom en colonne A,
    fusionné sur `RANGEES_PAR_EXERCICE` = 6 lignes), un groupe de quatre
    colonnes (Charge, Reps, RIR, Total) par date de séance, le total posé sur
    la première ligne du bloc. La page `Course` reprend le même principe,
    mais avec un bloc par **type** de sortie plutôt que par exercice, chaque
    type ayant ses propres colonnes (répétitions, pente...).

  Points structurants à ne pas défaire :
  - **chaque page plate porte une colonne `Semaine`** au format ISO
    (`2026-S35`) : un programme est hebdomadaire, et sans elle chaque
    graphique devrait recalculer le regroupement par formule ;
  - **l'échauffement ne figure nulle part dans les pages agrégées** (ni les
    plates, ni les grilles par jour) : une montée en charge gonflerait le
    volume sans correspondre à du travail effectif ;
  - **un bloc de la page `Course` s'étend par insertion de ligne**
    (`insertRowBefore`), jamais en écrivant sur la ligne trouvée : la première
    version écrivait directement sur la ligne vide de séparation entre deux
    blocs, qui finissait par disparaître si des types de course différents
    s'entremêlaient dans le temps. Défaut trouvé à la relecture, avant tout
    test, le 27 août 2026 ;
  - **un exercice qui dépasserait un jour les 6 lignes réservées** écrit dans
    les lignes du bloc suivant : limite connue, à corriger à la main si ça
    arrive, pas encore un vrai bug rencontré.

  Les colonnes `Debut seance` et `Fin seance` de l'ancien onglet unique ont
  été retirées, redondantes avec `Date` et `Duree (min)`.
- **Un chronomètre mesure la séance entière** : bouton vert à droite du titre
  de l'exercice pour le lancer ou le mettre en pause, bouton rouge d'arrêt
  qui n'apparaît que sur la fiche du dernier exercice, là où l'on est censé
  conclure. Comme celui du footing, il compte depuis son horodatage de départ
  et survit donc au verrouillage du téléphone. **La durée qu'il mesure fait
  foi** dans le classeur si le chronomètre a servi : elle reflète le temps
  réellement passé à s'entraîner, là où l'écart début/fin compterait aussi
  les interruptions.
- **Le verrou d'écran (`wakeLock`) se redemande à chaque retour au premier
  plan** : le système le relâche dès que l'onglet passe en arrière-plan, ce
  qui arrive constamment en salle (verrouillage du téléphone, changement
  d'application pour la calculatrice de plaques).
- **Le pont Apps Script reçoit son corps en `text/plain`**, pas en
  `application/json` : Apps Script ne répond pas à la requête préalable CORS
  qu'un en-tête JSON déclenche, et l'appel échouerait silencieusement en
  production tout en fonctionnant dans les outils de développement.
- **Une séance sans série validée se synchronise quand même, sans rien écrire**
  dans le classeur : `ecrireSeance` (`appsscript/Code.gs`) ignore silencieusement
  les séries dont `faite` est faux, et renvoie `ok:true` même quand elle n'a
  rien à écrire. L'application affiche alors « Classeur mis à jour », ce qui
  peut induire en erreur si l'utilisateur a saisi des chiffres sans appuyer sur
  le rond de validation à droite de la ligne : la saisie seule ne suffit pas.
- **Les consignes techniques modifiées depuis l'application restent sur le
  téléphone**, décision de l'utilisateur le 26 août 2026 : la cellule d'origine
  dans le classeur mélange plusieurs informations (prescription, RIR, muscle,
  repos), et y écrire automatiquement risquerait de la casser. Stockées dans
  `localStorage` sous `muscu.consignes`, une clé par `jour|nom d'exercice`
  (`cleConsigne` dans `js/app.js`), elles ne repartent jamais vers le classeur.

## Vérifications

Pas encore de suite automatisée. À faire avant d'ajouter des fonctionnalités
qui touchent l'import ou le calcul de tonnage : un test sur un extrait figé du
classeur (le piège `FACE PULL` en particulier), sur le modèle de
`tests/test_classify.py` de l'agenda culturel.

## Chantiers ouverts

1. **Déployer `appsscript/Code.gs`** et coller l'adresse obtenue, ainsi que le
   secret choisi, dans les réglages de l'application. Rien ne part vers le
   classeur tant que ce n'est pas fait ; l'application reste utilisable en
   local sans cette étape.
2. **Graphiques de progression** par exercice, une fois plusieurs semaines de
   séances accumulées dans le classeur.
3. **Mensurations et poids de corps**, non retenus au démarrage.
4. **Programmes multiples** : le programme est aujourd'hui unique et fixe. Le
   basculer vers un autre bloc d'entraînement demandera de relancer l'import
   sur un autre onglet, geste manuel pour l'instant.
