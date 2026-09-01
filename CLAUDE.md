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

- **Il n'y a plus de bouton de validation sur une série depuis le 27 août
  2026.** Décision de l'utilisateur : **renseigner le RIR valide la série**
  (`rendreSeries()` dans `js/app.js`), et l'effacer l'annule, sur un principe
  symétrique. Un changement de RIR sur une série déjà validée (correction
  d'une faute de frappe) ne redéclenche ni la validation ni la minuterie :
  seul le passage vide → rempli (ou l'inverse) agit. `validerParRir()`
  reprend l'essentiel de l'ancien `basculerSerie()` : elle reprend les
  chiffres de la dernière fois si charge ou reps manquent, lance la
  minuterie, et pose le focus sur la prochaine série non validée
  (`focaliserProchaineSerie()`) pour enchaîner sans toucher l'écran.
- **L'échauffement ne compte jamais dans le tonnage ni dans la comparaison.**
  Une série se bascule en échauffement par un **appui long (500 ms) sur son
  champ charge** (une frappe normale n'y touche pas) ; l'import du classeur
  reconnaît déjà les notes `ECH 1`, `ECH 2` de la même façon. Relocalisé le
  27 août 2026 depuis le bouton de validation, supprimé : c'est le seul champ
  qui restait pour ce geste. Sans texte ni colonne pour le signaler, les
  trois champs de la ligne passent en bordure tiretée (`.ligne-serie.echauffement
  input`).
- **Valider une série sans chiffres saisis reprend ceux de la dernière fois**
  plutôt que d'enregistrer un vide : l'utilisateur peut confirmer d'un geste
  qu'il a reproduit sa performance précédente sans retaper les nombres.
- **La minuterie se lance après chaque série validée**, échauffement compris
  dès qu'un temps de repos est connu pour l'exercice, jamais sinon.
- **La minuterie n'est plus une couche plein écran depuis le 27 août 2026**,
  mais un bandeau compact (60px, `.minuterie` dans `css/style.css`). Elle a
  changé de place le jour même : d'abord posée sous le chrono de séance, tout
  en haut de la page, elle y restait invisible sur mobile une fois le clavier
  ouvert et la page défilée pour atteindre le champ en cours de saisie —
  `hidden` ne devenait jamais vrai, mais le bandeau sortait du cadre visible.
  **Elle vit maintenant à côté de la consigne technique** (`.ligne-consigne`
  dans `index.html`, un flex qui met les deux côte à côte) : masquée
  (`[hidden]`), elle sort du flux flex et la consigne reprend toute la
  largeur ; active, elle prend 128px fixes sur la droite. Aucun repère fixe
  n'est garanti à 100 % sur toutes les hauteurs d'écran une fois le clavier
  ouvert, mais une position au fil du texte plutôt qu'en tête de page limite
  le risque de scroll qui l'emporte hors champ.
- **La minuterie se ferme d'elle-même à zéro**, sans afficher de temps
  écoulé en trop-plein (décision de l'utilisateur le 26 août 2026). Fermeture
  naturelle et appui sur le bandeau partagent `minuterieTerminee()` : si la
  série qui vient de récupérer était la dernière de l'exercice, l'exercice
  suivant s'affiche automatiquement, plutôt que de laisser l'utilisateur sur
  une fiche entièrement complétée sans rien à y faire. **Le focus se pose sur
  le champ charge de la prochaine série non validée**
  (`focaliserProchaineSerie`) à chaque fermeture, pour reprendre la saisie
  sans toucher l'écran.
- **Le clavier virtuel s'ouvre via un champ d'amorce permanent**
  (`#amorce-clavier` dans `index.html`, `amorcerClavier()` dans `js/app.js`),
  ajouté le 27 août 2026 parce que Firefox Android n'ouvrait pas le clavier en
  fermant la minuterie. Deux causes se cumulaient : le champ visé venait
  parfois d'être recréé par `rendreExercice()`, et l'élément porteur du geste
  disparaissait au même instant. L'amorce existe depuis le chargement de la
  page et est focalisée **en tout premier**, avant même la fermeture, tant que
  le geste est encore actif ; le transfert vers le vrai champ, d'un champ
  texte à un autre, garde ensuite le clavier ouvert.
  - **Ne jamais lui donner `display:none` ni `visibility:hidden`** : elle
    deviendrait infocusable et tout le mécanisme tomberait en silence. Elle
    est rendue invisible par `opacity: 0` et sortie du flux, avec
    `font-size: 16px` pour éviter le zoom automatique à la mise au point.
  - **Toute la surface du bandeau de récupération ferme et redonne le
    clavier.** Les boutons ±15 ont existé un temps, exclus de la délégation ;
    retirés le 27 août 2026, le geste porte maintenant sur tout le bandeau
    sans exception. C'est la seule réponse possible à la fermeture
    automatique à zéro : **aucun navigateur mobile n'ouvre le clavier sans
    geste de l'utilisateur**, c'est une restriction volontaire de la
    plateforme, pas un défaut contournable. Élargir la cible du geste donne
    au moins le chemin le plus court vers la saisie.
  - **Le clavier peut rester ouvert pendant toute la récupération**, réglage
    `clavierPendantRecup` activé par défaut depuis le 27 août 2026 : c'est la
    seule façon d'être prêt à saisir dès zéro sans geste, puisque le clavier
    ne peut pas s'ouvrir seul. Le focus est alors posé **sur l'amorce, jamais
    sur un champ de série**, pour qu'une frappe accidentelle pendant le repos
    n'écrive dans aucune donnée. Le mécanisme de repositionnement au-dessus
    du clavier (`suivreClavier()`, sur `visualViewport`) a disparu le même
    jour avec la couche plein écran : dans le flux normal de la page, il n'y
    a plus de couche à recaler. Le réglage permet de revenir au comportement
    précédent.
  - **Changer d'exercice (← / →) amorce aussi le clavier**, sur le même
    principe : appelée dans les gestionnaires de `bouton-precedent` et
    `bouton-suivant`, avant même `rendreExercice()`, pendant que le geste est
    encore actif. Le focus se pose ensuite sur le champ charge de la première
    série non validée du nouvel exercice (`focaliserProchaineSerie()`), pour
    arriver prêt à saisir sans toucher l'écran.
- **La touche Entrée du clavier numérique avance au champ suivant** (charge →
  reps → RIR, puis la ligne suivante), construit dans `rendreSeries()` via un
  tableau `enchainement` reconstitué à chaque rendu : ne pas oublier de le
  repeupler si la structure de la ligne change. Depuis la suppression du
  bouton de validation, tous les éléments de ce tableau sont des champs de
  saisie ; Entrée n'y sert plus qu'à sauter au champ suivant sans attendre la
  frappe, la validation elle-même passant par le RIR renseigné.
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
  - **`formatDateCourte` n'appelle aucune API de fuseau horaire**, ni
    `SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone()` ni
    `Session.getScriptTimeZone()` : les deux ont fait échouer
    `Utilities.formatDate` en production le 27 août 2026 avec la même
    exception (« argument incorrect : timeZone, doit être de type String »),
    sans reproduction possible hors de l'éditeur Apps Script. Le contexte
    d'exécution d'un web app déployé semble ne pas exposer ces API
    normalement. Les accesseurs natifs de `Date()` n'en dépendent pas ;
  - **le titre d'une page de jour n'est jamais fusionné sur plusieurs
    colonnes.** Il l'était au départ, et Sheets refusait alors de figer la
    colonne A : « vous ne pouvez pas figer des colonnes contenant seulement
    une partie d'une cellule fusionnée ». L'exception faisait échouer toute
    la synchronisation. Le texte déborde visuellement sur les colonnes
    voisines vides, ce qui donne le même rendu sans la contrainte. Erreur
    rencontrée en production le 27 août 2026 ;
  - **les blocs et les groupes de dates sont à des positions fixes** (lignes
    4, 10, 16... et colonnes 3, 7, 11...), lues directement plutôt que
    déduites de `getLastRow()` / `getLastColumn()`. Ces deux fonctions ne
    comptent que les cellules réellement remplies : un bloc de six lignes
    dont trois séries seulement sont écrites en laisse trois vides, et le
    bloc suivant se serait posé en plein milieu du précédent. Défaut trouvé
    par relecture le 27 août 2026, avant qu'il ne se manifeste ;
  - **un exercice qui dépasse les 6 lignes réservées voit son détail tronqué,
    jamais débordé** sur le bloc suivant. Le tonnage, lui, porte sur toutes
    les séries : mieux vaut un total juste et un détail incomplet que
    l'inverse ;
  - **l'écriture est idempotente** (`dejaEcrite` / `marquerEcrite`, via
    `PropertiesService`). Les pages plates s'écrivent par ajout : une séance
    envoyée deux fois y compterait double. C'est arrivé le 27 août 2026,
    l'exception sur la mise en forme survenant après l'écriture des pages
    plates, laissant la séance « en attente » côté téléphone. **La grille
    s'écrit désormais en premier** (partie fragile, mais naturellement
    idempotente puisqu'elle cherche le groupe de dates et le bloc avant
    d'écrire), les pages plates ensuite, le marquage en dernier.

  Les colonnes `Debut seance` et `Fin seance` de l'ancien onglet unique ont
  été retirées, redondantes avec `Date` et `Duree (min)`.
- **Les pages J1, J3 et J4 portent une colonne « Référence »**, semée le
  27 août 2026 avec `semerReference()` (`appsscript/Code.gs`), reprenant les
  valeurs déjà importées de l'ancien classeur manuel (celles qui alimentaient
  `derniereFois()` avant la première vraie séance de chaque jour). But :
  repartir avec un premier point de comparaison plutôt que des pages vides.
  **J5 n'a pas de colonne Référence** : aucun historique n'a été importé pour
  ce jour (fiches vides au moment de l'import du 26 août 2026), et
  `Rotation externe poulie` / `Gainage anti-extension et anti-rotation` sur
  J4 en sont dépourvues pour la même raison. `semerReference()` est un
  utilitaire à lancer une fois depuis l'éditeur Apps Script, jamais appelé
  par le pont ; sans effet si rejoué, puisqu'elle retrouve le groupe et les
  blocs déjà créés plutôt que d'en recréer.
- **Un chronomètre mesure la séance entière** : un seul bouton vert, à droite
  du titre de l'exercice (pas un bandeau pleine largeur, revenu en arrière le
  27 août 2026 après un essai trop grand pour tenir sur un Pixel 9). Comme
  celui du footing, il compte depuis son horodatage de départ et survit donc
  au verrouillage du téléphone. **La durée qu'il mesure fait foi** dans le
  classeur si le chronomètre a servi : elle reflète le temps réellement passé
  à s'entraîner, là où l'écart début/fin compterait aussi les interruptions.
  **Pas de bouton d'arrêt manuel** : le chronomètre s'arrête de lui-même,
  toujours par l'un de ces trois chemins, tous dans `minuterieTerminee()` ou
  `terminer()` de `js/app.js` :
  1. un second appui sur le bouton vert (`basculerChronoSeance`) ;
  2. l'enregistrement de la séance (`terminer()`) ;
  3. la fermeture de la minuterie de récupération de la dernière série du
     dernier exercice — le seul des trois qui ne dépend d'aucun geste dédié.

  **Il démarre de lui-même à l'ouverture d'un jour de musculation**
  (`demarrerChronoSeance()`, appelée dans `commencer()`) : décidé le 27 août
  2026, pour ne pas avoir à y penser en plein échauffement. Volontairement
  pas un bascule comme `basculerChronoSeance()` : appelée alors qu'il tourne
  déjà, elle ne fait rien, plutôt que de le mettre en pause par accident. Ne
  concerne que les jours de musculation, `bloc-footing` n'ayant pas ce
  bouton. Ne joue pas à la reprise d'une séance déjà en cours (`reprendre()`)
  : un chronomètre qu'on a arrêté volontairement ne doit pas repartir tout
  seul.
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
  peut induire en erreur si l'utilisateur a saisi charge et reps sans jamais
  renseigner le RIR : depuis le 27 août 2026, c'est ce dernier qui valide (il
  n'y a plus de bouton), et une série sans RIR reste donc non validée.
- **Les consignes techniques modifiées depuis l'application restent sur le
  téléphone**, décision de l'utilisateur le 26 août 2026 : la cellule d'origine
  dans le classeur mélange plusieurs informations (prescription, RIR, muscle,
  repos), et y écrire automatiquement risquerait de la casser. Stockées dans
  `localStorage` sous `muscu.consignes`, une clé par `jour|nom d'exercice`
  (`cleConsigne` dans `js/app.js`), elles ne repartent jamais vers le classeur.
- **« Ne garder que les séances d'aujourd'hui »** (réglages, à côté de
  l'export) purge `muscu.historique` en local uniquement, après confirmation
  et avec le compte de séances retirées annoncé à l'avance. Ajouté le 27 août
  2026 pour nettoyer les séances de test accumulées pendant le
  développement. Ne touche jamais au classeur, qui a ses propres pages.

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
