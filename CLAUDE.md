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

Un seul onglet fait autorité, celui du programme en cours, **nommé
« semaine 1 »** (gid `1138168114`) : six jours, J1 Push, J2 footing, J3 Pull,
J4 Bas du corps, J5 Haut prioritaire, J6/J7 repos ou footing. Deux anciens
onglets ont existé pendant la conception (un programme antérieur en superset,
un onglet vide) et ont été supprimés par l'utilisateur le 26 août 2026 : **ne
jamais s'y fier s'ils réapparaissent**, seul l'onglet du programme courant
compte.

**Un bloc peut servir plusieurs jours.** L'utilisateur a renommé le bloc de
course « J2 & J6 FOOTING » le 10 septembre 2026 et supprimé le bloc J6, les
deux jours étant le même entraînement : tenir deux blocs identiques n'aurait
servi qu'à les désynchroniser. `codes_du_titre()` lit donc **tous** les codes
du titre, et non le seul premier, et produit un jour par code à partir du
même bloc ; les jours sont ensuite remis dans l'ordre de leurs codes, un
second jour se plaçant sinon à la position de son bloc. Seule la
**définition** est partagée : J2 et J6 restent deux séances indépendantes,
avec leurs propres chiffres.

**L'ordre des exercices d'un jour est celui des numéros de la colonne A**, pas
celui des lignes : `convertir()` trie par `numero` depuis le 10 septembre 2026.
Jusque-là, l'ordre suivait les lignes et le numéro n'était qu'une étiquette.
Réordonner un jour se fait donc **en changeant des numéros, sans déplacer de
ligne**. Motif : deux déplacements à la main avaient laissé les chiffres d'une
séance sur place pendant que les noms bougeaient (J1, le 9 septembre 2026),
chaque exercice héritant de l'historique d'un autre. Un exercice retiré se
supprime **en lignes entières**, jamais en effaçant seulement son numéro :
sans numéro, ses lignes seraient rattachées au bloc précédent et fausseraient
sa lecture.

**Le bloc « GAINAGE » de « semaine 1 » est ignoré par l'import**, ajouté
par l'utilisateur le 11 septembre 2026. Son titre ne commençant pas par un
code de jour, ses lignes étaient rattachées à J5 avec des numéros déjà pris.
`decouper_en_jours()` y coupe le jour en cours. La séance de gainage est
définie dans l'application (catégories, mouvements au choix, modes de
saisie), ce que la grille ne sait pas représenter : ce bloc n'est qu'un aide-
mémoire, le modifier ne change rien.

**C'est le seul onglet en entrée. Tous les autres sont des sorties**, écrites
par le pont et jamais relues pour alimenter l'application : les grilles de
jour `J1`, `J3`, `J4`, `J5`, la page `Course`, les pages plates
`Exercices (app)` et `Séances (app)`, et les pages `Remarques` et
`Blessures`. Y modifier quoi que ce soit ne change rien dans l'application, et
peut au contraire casser l'écriture suivante : les grilles de jour attendent
un bloc d'exercice **toutes les 6 lignes à partir de la ligne 4**
(`ligneBlocExercice`), et un déplacement de lignes y fait perdre cet
alignement. Cas réel, le 9 septembre 2026 : l'utilisateur a réordonné des
exercices dans l'onglet de sortie `J3` en croyant modifier le programme, sans
effet côté application, et a dû restaurer une version du classeur.

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

- **L'identité d'un exercice est son nom, jamais le jour où il est fait**
  (décision de l'utilisateur le 13 septembre 2026). « Élévation latérale
  haltères » apparaît en J3 et en J5 : c'est le même exercice, et il ne doit
  suivre qu'une seule progression. `derniereFois(nomExo)` cherche donc dans
  toutes les séances enregistrées, sans filtrer par jour ; même règle dans
  `progressionPremiereSerie()` pour la courbe de l'historique. C'est aussi ce
  qui permet de remplacer un exercice un temps puis de le remettre plus tard
  sans rien perdre : l'historique du téléphone (`muscu.historique`) est
  indépendant du programme du moment, et n'importe quelle séance passée
  portant ce nom est retrouvée dès qu'il réapparaît dans un jour, quel qu'il
  soit. Aucune modification du classeur ni de `appsscript/Code.gs` n'est donc
  nécessaire pour ce geste : les pages du classeur sont des sorties
  d'écriture, jamais relues (voir plus haut, « Le classeur »).
  - **La correspondance est exacte au caractère près.** Un nom ressaisi
    autrement (accent oublié, casse différente, espace en trop) démarre en
    silence un second historique au lieu de rejoindre le premier : rien dans
    l'application ne le signale, la nouvelle fiche paraît juste vide de
    passé. `outils/verifier_import.py` (`noms_ambigus`) compare les noms d'un
    même import une fois accents, casse et espaces neutralisés, et alerte sur
    toute paire proche mais non identique — sans confondre ce cas avec celui,
    désormais normal, de deux jours qui partagent vraiment le même nom.
  - **Les consignes techniques ne suivent pas ce regroupement** : elles
    restent indexées par jour et par nom (`cleConsigne`), pas seulement par
    nom. Un même exercice peut donc afficher une consigne différente sur
    deux jours si elle a été modifiée sur l'un et pas l'autre ; non demandé,
    à revoir si ça gêne à l'usage.

- **Plusieurs séances peuvent être en cours en même temps, une par jour.**
  Décision de l'utilisateur le 27 août 2026 : entrer dans J3 ne doit rien
  effacer de ce qui a été saisi dans J1. Elles vivent dans une carte indexée
  par code de jour sous `muscu.seances` (`lireSeancesEnCours()` dans
  `js/app.js`), là où une seule séance tenait sous `muscu.seance`. Points à
  connaître :
  - **`commencer(code)` reprend, il ne recrée pas** : une séance déjà ouverte
    sur ce jour est rouverte à l'exercice où la saisie s'était arrêtée
    (`positionDeReprise()`), jamais remplacée par une neuve ;
  - **quitter une séance (←) ne l'efface pas.** L'abandon est explicite, une
    ligne par jour dans le bloc « Séances en cours » de l'accueil : avec
    plusieurs jours ouverts, un bouton unique ne saurait pas lequel il
    abandonne. Les cartes de jour portent une pastille « en cours » ;
  - **`lireSeancesEnCours()` relit l'ancienne clé** `muscu.seance` si la
    nouvelle est absente, pour ne pas perdre une séance en cours au moment
    de la mise à jour.
- **Il n'y a plus de bouton de validation sur une série depuis le 27 août
  2026.** Décision de l'utilisateur : **ce sont les répétitions qui valident
  la série** (`rendreSeries()` dans `js/app.js`), et les effacer l'annule, sur
  un principe symétrique. `validerSerie()` reprend l'essentiel de l'ancien
  `basculerSerie()` : elle reprend les chiffres de la dernière fois si charge
  ou reps manquent, lance la minuterie, et pose le focus sur la prochaine
  série non validée (`focaliserProchaineSerie()`).
  - **Le RIR ne valide rien, il est purement indicatif** (décision de
    l'utilisateur le 6 septembre 2026). C'est lui qui validait du 27 août au
    6 septembre 2026 : d'où l'ancien nom `validerParRir()` qu'on peut encore
    croiser dans un historique git. Il ne fait plus qu'enregistrer son
    chiffre.
  - **La validation attend la confirmation du champ, pas la frappe**
    (précision de l'utilisateur le 27 août 2026, après un premier essai trop
    pressé) : la saisie se contente d'enregistrer le chiffre, et c'est
    `change` (sortie du champ) ou Entrée qui valide. Sans cela, taper le 1
    de 10 validait la série au passage, puis sautait au champ suivant. Le
    champ des répétitions est pour cette raison **exclu de la navigation
    générique par Entrée** (`dataset.role === 'reps'`), qui déplacerait le
    focus au lieu de valider.
  - **Conséquence à connaître** : la validation étant déclenchée par le champ
    du milieu, le focus part vers la série suivante avant le RIR, qui reste
    saisissable mais seulement en le touchant. Sur la **dernière série d'un
    exercice**, le basculement automatique vers l'exercice suivant emporte
    même la ligne : le RIR doit y être saisi **avant** de confirmer les
    répétitions.
- **La consigne s'enregistre à la frappe** depuis le 10 septembre 2026, comme
  le reste de la séance. Elle n'était auparavant écrite que sur appui du bouton
  « Enregistrer », et `rendreExercice()` refermait l'éditeur en jetant son
  contenu : **changer d'exercice en cours de saisie perdait le texte sans rien
  dire**, et le passage automatique à l'exercice suivant rendait ce cas
  courant. L'utilisateur y a perdu toutes ses notes de J4. Le bouton
  « Annuler » réécrit la valeur retenue à l'ouverture de l'éditeur, seul moyen
  de défaire ce que la frappe a déjà enregistré.
- **Séance de gainage optionnelle**, carte `G` de l'accueil, spécifiée le
  11 septembre 2026 par le récapitulatif de programme de l'utilisateur.
  Définie dans le code (`MOUVEMENTS_GAINAGE`, `CATEGORIES_GAINAGE`) et ajoutée
  aux jours au démarrage (`JOUR_GAINAGE`), jamais importée : le bloc
  « GAINAGE » du classeur n'est qu'un aide-mémoire.
  - **Quatre catégories, un mouvement au choix**, par défaut celui de la
    dernière séance de gainage pour cette catégorie (`mouvementParDefaut`) :
    pas d'alternance automatique, la progression se suit sur un mouvement.
  - **Historique par mouvement**, toutes séances confondues
    (`derniereFoisMouvement`, sur `seance.mouvements`). Le farmer walk partage
    le sien entre la séance de gainage et les footings, décision de
    l'utilisateur le 11 septembre 2026, **vitesse saisie**, pas calculée.
  - **Trois modes** : `chrono` (minuteur de tenue de 45 s, interruptible, qui
    note le temps réellement tenu puis lance le repos), `reps`, `charge`
    (poids, distance, vitesse). **Le repos part à la confirmation d'une valeur
    quel que soit le mode** (`serieSaisie()`), et pas seulement au bout du
    minuteur : une tenue se tape à la main dès qu'on a chronométré au mur ou
    qu'on corrige après coup. Le cas du bouton ▶ reste juste, le `blur` du
    champ précédant le `click` : un repos démarre une fraction de seconde
    avant que la tenue ne le remplace. **Le dead bug est en répétitions** : le
    récapitulatif le disait chrono dans un tableau et « 6-8 par côté » dans
    l'autre, tranché ainsi, le tempo 3-1-3 faisant de chaque répétition la
    mesure utile.
  - **Un minuteur à part** (`#gainage-chrono`, collé en haut de l'écran)
    pour la tenue et le repos (45 s, 60 s pour le farmer walk et le relevé de
    genoux), indépendant de la minuterie de musculation ; `arreterMinuterie()`
    l'arrête aussi, comme `commencer()`.
  - **Le nom du mouvement porte la couleur d'interférence avec la course**,
    du vert au rouge (`nomMouvementColore()`) : plus de pastille à côté,
    décision de l'utilisateur le 13 septembre 2026 qui inverse celle du
    11 (pastille préférée en pensant les teintes pâles illisibles en texte).
    Mesuré sur les fonds réels de l'écran : c'est l'inverse qui est vrai, les
    teintes pâles du dégradé sont très lisibles sur fond sombre (12 à 15:1),
    et seules les deux plus sombres tombent sous le seuil WCAG AA de 4,5:1
    (`farmer_walk` 1,9:1, `marche_ours` 3,2:1) : `couleurTexte` les éclaircit
    pour l'affichage sans changer `couleur`. Sur le bouton choisi, les neuf
    teintes perdent toute lisibilité sur le fond turquoise de la sélection
    (1 à 3,8:1) : le nom y reste blanc (`.type-course.choisi
    .gainage-nom-mouvement` dans `css/style.css`), la sélection étant déjà
    dite par ce fond.
  - **Vers le classeur**, `lignesGainage()` met les séries à plat dans
    `seance.lignesGainage` à l'enregistrement, et `ecrireGainage()` les écrit
    dans une page `Gainage` : le pont n'a pas à connaître les mouvements.
  - **La rotation externe est abandonnée**, décision de l'utilisateur le
    11 septembre 2026.
- **Le retour depuis l'écran de fin réaffiche la séance selon son type**
  (`rendreSeanceCourante`). Il appelait l'affichage de musculation quel que
  soit le jour, et plantait donc sur un footing. L'erreur avait été vue dans
  la console dès le 8 septembre 2026 et prise à tort pour un artefact de
  test : une exception vue en vérifiant se reproduit avant d'être écartée.
- **L'indicateur de progression est la première série de travail**, charge ×
  répétitions, depuis le 11 septembre 2026 (récapitulatif de programme de
  l'utilisateur, `Desktop\PROGRAMME_RECAP.md` sur sa machine) : courbes de la
  fiche de séance (`progressionPremiereSerie`) et comparaison de fin de
  séance, sur l'exercice 1. **Le tonnage n'y sert plus** : il monte
  mécaniquement quand la charge baisse et que les répétitions montent, et
  ferait passer un recul pour un progrès. La comparaison se dit indicative si
  les deux premières séries n'ont pas le même RIR, la mesure ne valant qu'à
  RIR constant. Le tonnage reste affiché comme simple chiffre, sans
  comparaison. Un test le garde, sur un cas où le tonnage monte pendant que
  la première série recule.
- **`validerSerie()` marque la série faite avant d'amorcer le clavier.**
  Déplacer le focus fait perdre le sien au champ des répétitions, dont le
  `change` rappelle alors la validation ; placé en tête jusqu'au 10 septembre
  2026, l'amorçage provoquait une validation imbriquée, et la dernière série
  validée par Entrée faisait sauter **deux** exercices. Trouvé par
  `tests/test_app.py`, pas à la main.
- **Les flèches d'exercice comptent leur pas depuis l'exercice regardé au
  moment où le doigt se pose**, pas depuis `indexExo` au moment du clic.
  Défaut signalé par l'utilisateur le 10 septembre 2026 et reproduit : un
  champ de saisie perd le focus **avant** que le clic n'arrive, ce qui
  déclenche son `change` ; si c'était la dernière série non confirmée, sa
  validation faisait déjà passer à l'exercice suivant, puis le clic en
  ajoutait un second. Un appui sur → sautait donc **deux** exercices, et un
  appui sur ← ne faisait rien de visible, les deux mouvements s'annulant.
  `pointerdown` précède le `blur` : c'est lui qui donne le point de départ.
- **La dernière série d'un exercice fait passer au suivant immédiatement**,
  sans attendre la fin de la récupération (décision de l'utilisateur le
  27 août 2026, dans `validerSerie()`). La minuterie continue de tourner
  par-dessus la fiche suivante : elle appartient à la série qu'on vient de
  finir, pas à la fiche qu'on regarde. C'est aussi pourquoi **changer
  d'exercice à la main (← / →) n'arrête plus la minuterie**. Le temps de
  repos est lu **avant** le changement d'exercice, sinon ce serait celui du
  nouveau. `minuterieTerminee()` ne change donc plus d'exercice, elle ne
  garde que l'arrêt du chronomètre de séance sur le dernier exercice fini.
- **Plus aucun échauffement ne peut être créé depuis l'application**, décision
  de l'utilisateur le 2 septembre 2026 : il n'en veut pas dans son suivi, et
  il a retiré les lignes `ECH` correspondantes du classeur. Le geste qui
  servait à en marquer un (appui long sur le champ charge, hérité du bouton
  de validation supprimé la veille) a été retiré : c'était devenu un piège,
  un appui long involontaire faisant sortir en silence une vraie série du
  tonnage et du classeur.
  - **Le reste du code sur l'échauffement doit rester en place.** Il ne
    fabrique plus rien, mais il protège les données déjà là : une séance
    enregistrée avant ce jour, ou un historique importé, peut encore porter
    des séries marquées. Retirer les filtres (`!s.echauffement` dans
    `tonnageDesSeries`, `derniereFois`, la grille du classeur) les ferait
    silencieusement recompter et gonflerait les comparaisons.
  - **Une série marquée avant ce jour n'est plus démarquable** depuis
    l'application, faute de geste. Cas peu probable, mais s'il se présente
    (ligne aux bordures tiretées, exclue du tonnage), il faut un nettoyage
    ponctuel plutôt qu'un rétablissement du geste.
- **Valider une série sans chiffres saisis reprend ceux de la dernière fois**
  plutôt que d'enregistrer un vide : l'utilisateur peut confirmer d'un geste
  qu'il a reproduit sa performance précédente sans retaper les nombres.
- **Une série en trop se supprime d'une croix**, ajoutée le 7 septembre 2026
  à la demande de l'utilisateur (`.ligne-serie-suppr` dans `rendreSeries()`),
  sans confirmation : la série se rajoute d'un geste (`+ Ajouter une série`)
  et rien n'est encore synchronisé pendant la séance, contrairement au
  nettoyage de l'historique qui, lui, demande confirmation.
- **Le signal sonore de fin de récupération est au volume maximal utile**
  depuis le 7 septembre 2026 (gain 0.9 dans `signaler()`, contre 0.3
  auparavant) : jugé trop faible par l'utilisateur pour s'entendre depuis
  l'autre bout de la salle. 0.9 plutôt que 1 pour garder une marge avant
  écrêtage du haut-parleur du téléphone.
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
  - **Fond rouge, même hauteur que le chrono de séance (71px)**, et plus
    aucun texte de détail (« Ensuite : série X sur Y » a disparu), demande de
    l'utilisateur le 7 septembre 2026 : la minuterie doit se voir de loin, un
    seul gros chiffre en gras remplissant tout le cadre plutôt qu'un petit
    compteur secondaire à côté d'un libellé.
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
    ne peut pas s'ouvrir seul. Le mécanisme de repositionnement au-dessus du
    clavier (`suivreClavier()`, sur `visualViewport`) a disparu le 27 août
    2026 avec la couche plein écran : dans le flux normal de la page, il n'y
    a plus de couche à recaler.
    - **Jusqu'au 7 septembre 2026, le focus était posé sur l'amorce, jamais
      sur un champ de série**, pour qu'une frappe accidentelle pendant le
      repos n'écrive dans aucune donnée. Mais la charge de la série
      suivante restait de ce fait impossible à remplir tant que le décompte
      n'atteignait pas zéro, ce que l'utilisateur a signalé comme une gêne :
      il voulait pouvoir pré-remplir la charge pendant le repos lui-même.
      `validerSerie()` amorce désormais le clavier **avant** son propre rendu
      (`amorcerClavier()` en tout premier, ajouté le 7 septembre 2026 pour la
      même raison que pour les boutons ← / →), puis focalise directement le
      champ charge de la série suivante via `focaliserProchaineSerie()` :
      c'est ce champ, pas l'amorce, qui garde le focus pendant toute la
      récupération. `lancerMinuterie()` ne touche plus au focus dans ce cas ;
      le réglage ne sert plus qu'à fermer volontairement le clavier
      (`document.activeElement.blur()`) quand il est décoché, pour qui ne
      veut pas du clavier pendant le repos.
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
  frappe, la validation elle-même passant par les répétitions confirmées.
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
  option lesté ou farmer walk, et séance au seuil.
  - **Ce sont quatre exercices distincts, pas quatre modes d'un même
    exercice** (correction de l'utilisateur le 27 août 2026). Les quatre
    peuvent être faits le même jour, chacun avec ses propres chiffres :
    `seance.footing` est une **carte indexée par type**, remplie à la
    demande. Les boutons choisissent l'exercice affiché, ils n'effacent plus
    rien — la première version supprimait les champs de l'ancien type au
    changement, ce qui rendait impossible d'en faire deux le même jour.
    `indexExo` sert d'index dans `TYPES_COURSE`, comme il sert d'index
    d'exercice en musculation.
  - **J2 et J6 partagent les mêmes données** : c'est le même entraînement,
    seul le jour de la semaine change. `derniereSortie()` cherche donc la
    dernière sortie **du même type, tous jours de course confondus**, et le
    classeur les range dans la même page `Course`, par type. Comparer une
    endurance du mardi à une endurance du samedi a du sens ; les séparer par
    jour n'en aurait aucun.
  - **`footingParType()` relit les anciens formats** (une seule sortie à
    plat avec un champ `type`, jusqu'au 27 août 2026 ; un seul passage par
    type sans tableau, jusqu'au 8 septembre 2026) sous forme d'un tableau
    d'un seul cycle, côté application comme côté Apps Script : sans cela, les
    séances antérieures seraient silencieusement illisibles.
  - **Chaque type a son échauffement**, parce que l'exigence diffère : une
    endurance fondamentale se lance presque à froid, un fractionné demande un
    corps déjà chaud sous peine de blessure.
  - **Le type précis part dans le classeur**, jamais un `footing` uniforme :
    comparer l'allure d'une endurance et celle d'un fractionné n'aurait pas
    de sens, et les colonnes dédiées (répétitions, récup, pente, charge
    portée, durée au seuil) restent traçables en graphique là où un champ
    texte libre ne le serait pas. Une **ligne par passage renseigné**, pas
    une par séance ni une par type.
- **Un type peut compter plusieurs passages depuis le 8 septembre 2026**,
  demande de l'utilisateur : refaire l'Incliné à une autre charge dans la
  même séance, sans écraser le premier passage. `seance.footing[cle]` est
  donc un **tableau de cycles** (`cyclesCourse()` dans `js/app.js`), chacun
  avec ses propres champs communs (durée, distance) et propres au type
  (pente, charge portée...), plutôt qu'un objet plat limité à un seul
  passage.
  - **Le bouton « + Ajouter un passage »** pousse un cycle vide dans le
    tableau du type affiché ; chaque passage au delà du premier porte une
    croix de suppression, sur le même principe que les séries de musculation
    en trop (voir plus haut). Aucune confirmation, pour la même raison :
    rien n'est encore synchronisé pendant la séance.
  - **Seul le premier passage se compare à la dernière sortie**
    (`majAllureCycle()`) : les passages suivants n'ont pas d'équivalent fixe
    d'une séance à l'autre, leur nombre pouvant varier. Ils affichent leur
    propre allure, sans comparaison.
  - **Côté classeur, `ecrireCourseGrille()` et la construction des lignes de
    `ecrireSeance()` itèrent sur les cycles**, pas sur les seuls types : un
    passage supplémentaire écrit une ligne de plus dans le bloc de son type
    (`Course`) et dans l'onglet `Seances`, jamais une case écrasée.
- **Les jours de footing ont porté du gainage** du 6 au 11 septembre 2026 :
  planches frontale et latérale d'abord, pallof press et rotation externe
  ensuite, retirés de J4 parce que trop peu fatigants pour une séance de
  jambes. Le tout se saisissait en secondes de tenue, une case par série.
  **Remplacé le 11 septembre 2026** par la séance de gainage à part (voir
  plus haut) : seul le farmer walk reste aux jours de course, et la rotation
  externe est abandonnée.
  - **Ce qui en subsiste dans le code est en lecture seule** :
    `GAINAGE_FOOTING_ANCIEN` et `uniteGainage()`. Les séances de cette
    semaine-là portent encore leurs valeurs dans `seance.gainage`, que le
    résumé de fin et la fiche d'historique savent afficher. Ne plus rien y
    écrire de neuf.
  - **La raison de le loger dans le code plutôt que dans le classeur vaut
    toujours**, et c'est elle qui a fait loger la séance de gainage au même
    endroit : les blocs J2 et J6 de « semaine 1 » sont dessinés en colonnes
    TEMPS et DISTANCE, celles-là mêmes où l'importateur lirait charge et reps
    d'une ligne numérotée. Les deux lectures entreraient en collision, et
    `convertir()` bascule de surcroît un jour en `type: "muscu"` dès qu'il
    trouve un exercice numéroté, ce qui ferait disparaître tout le bloc de
    course.
  - **Ce gainage-là ne remontait pas au classeur**, faute de colonne pour une
    tenue en secondes. Ce n'est plus vrai de ce qui lui succède :
    `ecrireGainage()` écrit le farmer walk des jours de course dans la page
    `Gainage`, à côté des séries de la séance de gainage.
- **Le garde-fou anti-doublon du pont est sectionné**, une marque par page
  écrite par ajout et non une seule pour la séance entière
  (`cleEcriture()`, `dejaEcrite(id, section)`). Sans cela le trou du 27 août
  2026 restait ouvert pour `Remarques`, `Blessures` et `Gainage` : ces trois
  pages s'écrivent **avant** la grille, la partie fragile, et la marque unique
  n'était posée qu'après elle. Une exception sur la mise en forme laissait
  donc la séance « en attente » côté téléphone avec sa remarque, sa blessure
  et ses douze lignes de gainage déjà ajoutées, que le renvoi ajoutait une
  seconde fois. Trouvé par relecture le 12 septembre 2026, **jamais observé en
  production** : le classeur n'en porte aucune trace. Les écrire en premier
  reste juste, une séance sans série validée pouvant n'avoir qu'une blessure à
  raconter ; c'est la marque qui devait suivre, pas l'ordre.
- **Remarque libre de fin de séance**, ajoutée le 8 septembre 2026 : un
  champ `#fin-remarque` sur `ecran-fin`, commun aux deux types de séance,
  pour signaler une douleur, une gêne ou une idée d'amélioration à
  destination du développeur, en dehors de toute conversation.
  - **Liée à `seance.remarque`, enregistrée à la frappe** comme le reste de
    la séance en cours (`preparerEcranFin()` la relit à chaque passage sur
    l'écran de fin) : elle survit à un aller-retour vers l'écran précédent,
    et à la fermeture de l'application avant l'enregistrement.
  - **Part avec la séance dans `envoyer({ action: 'seance', seance })`**,
    sans plomberie dédiée côté requête : `seance` part déjà en entier.
  - **Côté classeur, `ecrireRemarque()` l'écrit dans un onglet `Remarques`
    dédié** (`feuilleRemarques()` dans `appsscript/Code.gs`, créé à la
    première remarque envoyée), jamais dans les grilles de jour ou de
    course qui restent des tableaux de chiffres. Une remarque vide n'écrit
    rien, pour ne pas remplir l'onglet d'une ligne blanche par séance sans
    rien à signaler. Écrite **avant tout retour anticipé** dans
    `ecrireSeance()` (aucune série faite, aucun passage de course
    renseigné) : une séance sans rien d'autre à écrire peut tout de même
    porter une remarque.
  - **C'est le développeur (Claude) qui doit la lire**, à chaque session de
    travail sur l'application, pour en tenir compte dans ses propositions.
    `python outils/lire_remarques.py` affiche les onglets `Remarques` et
    `Blessures`, **sans rien demander à l'utilisateur**.
  - **La lecture se fait par nom d'onglet, pas par gid**, via l'API de
    visualisation (`/gviz/tq?tqx=out:csv&sheet=<nom>`). Le gid d'un onglet
    créé automatiquement n'est connu qu'une fois l'onglet ouvert à la main,
    ce qui obligeait à le réclamer ; le nom, lui, est fixé par le code qui
    crée l'onglet. Éprouvé le 10 septembre 2026 sur les deux onglets.
- **Blessure du jour**, ajoutée le 9 septembre 2026 sous la remarque, sur
  l'écran de fin : la série concernée et la description de ce qui a été
  ressenti, rangées dans un onglet `Blessures` à part (date, jour, série,
  blessure).
  - **Page distincte des remarques, volontairement.** Les deux sont des
    champs libres de fin de séance, mais ils ne se relisent pas dans le même
    esprit : la remarque s'adresse au développeur et se périme une fois
    traitée, la blessure suit le corps dans le temps et gagne à se relire
    seule, sans le bruit des demandes d'évolution.
  - **La description fait foi** (`ecrireBlessure` dans `appsscript/Code.gs`) :
    une série renseignée sans description ne décrit aucune blessure et
    n'écrit rien.
  - **La série se saisit librement**, les exercices du jour n'étant proposés
    qu'en suggestions (`<datalist>` rempli par `nomsDesExercices()`) : une
    douleur peut ne tenir à aucune série, et une liste fermée obligerait à
    en désigner une faussement.
- **Les séances enregistrées se déplient et se suppriment**, demandes de
  l'utilisateur le 9 septembre 2026 (`rendreHistorique()` dans `js/app.js`).
  - **Le détail reprend la matière du résumé de fin de séance**, plus la
    blessure : c'est le seul endroit d'où la relire depuis le téléphone une
    fois la séance enregistrée. **La remarque, elle, n'y figure pas**
    (décision de l'utilisateur le 10 septembre 2026) : elle s'adresse au
    développeur et n'a plus d'intérêt une fois partie au classeur, là où une
    douleur se relit d'une séance à l'autre. Elle reste écrite dans l'onglet
    `Remarques`, mais devient de ce fait **illisible depuis le téléphone**.
  - **Chaque exercice y porte sa courbe de progression**
    (`progressionPremiereSerie()` et `courbe()`), demandée par l'utilisateur
    le 10 septembre 2026 sur cette page précisément. Elle trace l'indicateur
    retenu, charge × répétitions de la première série de travail, et non le
    tonnage (voir plus haut). Dessinée en SVG à la main : quelques points et une
    ligne ne justifient pas une bibliothèque, et l'application doit rester
    utilisable hors ligne sans rien télécharger. Deux partis pris :
    - **seules les séances du téléphone comptent**, pas l'historique repris du
      classeur : celui-ci est une reprise ponctuelle et non un journal, et ses
      valeurs ont déjà été désalignées de leurs exercices par une manipulation
      de la grille ;
    - **la courbe s'arrête à la séance affichée** : rouvrir une séance
      ancienne montre la progression telle qu'elle était ce jour-là, pas des
      points postérieurs qui n'existaient pas encore. En dessous de deux
      points, rien n'est dessiné.
  - **C'est la page d'atterrissage après l'envoi** depuis le même jour :
    `enregistrerEtSynchroniser()` ouvre la fiche de la séance qu'on vient de
    finir (`afficherSeanceEnregistree()`) au lieu de renvoyer à l'accueil.
    Sa pastille dit si elle a atteint le classeur. **Seule l'erreur d'envoi
    reste sur l'écran de fin** : son message nomme la cause, ce que la
    pastille « en attente » ne dirait pas.
  - **Un `<details>` natif plutôt qu'une bascule maison** : l'ouverture et la
    fermeture ne demandent alors aucun état à tenir côté script.
  - **La suppression demande confirmation**, contrairement à la croix des
    séries en trop d'une séance en cours : la donnée est ici définitive côté
    téléphone. Le message distingue les deux cas, **une séance déjà envoyée
    restant dans le classeur** : l'application n'y écrit que par ajout et ne
    reprend jamais ce qu'elle y a mis.
- **Les exercices oubliés sont signalés sur l'écran de fin, jamais
  bloquants** (`#fin-alerte`, rempli par `preparerEcranFin()`), demande de
  l'utilisateur le 10 septembre 2026 : la liste des exercices restés sans
  aucune série validée s'affiche au-dessus du bouton, mais **l'envoi reste
  possible**. Une séance écourtée est une séance, et l'oubli se voit mieux là
  qu'une fois le classeur rempli. Les jours de course n'ont pas d'exercices
  numérotés : le résumé y dit déjà « Aucune sortie renseignée ».
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

Trois outils, nés le 10 septembre 2026 d'une série d'incidents que les
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

## Chantiers ouverts

1. **Déployer `appsscript/Code.gs`** et coller l'adresse obtenue, ainsi que le
   secret choisi, dans les réglages de l'application. Rien ne part vers le
   classeur tant que ce n'est pas fait ; l'application reste utilisable en
   local sans cette étape.
2. **Graphiques de progression côté classeur**, une fois plusieurs semaines
   accumulées. Côté application, c'est fait depuis le 10 septembre 2026 : la
   fiche d'une séance enregistrée porte la courbe de chaque exercice
   (`progressionPremiereSerie()`).
3. **Mensurations et poids de corps**, non retenus au démarrage.
4. **Programmes multiples** : le programme est aujourd'hui unique et fixe. Le
   basculer vers un autre bloc d'entraînement demandera de relancer l'import
   sur un autre onglet, geste manuel pour l'instant.
5. **Sortir ce dépôt de `C:\Users\Utilisateur\.claude\`**, décidé par
   l'utilisateur le 9 septembre 2026 pour ne plus risquer de confusion avec
   l'autre projet qu'il y héberge. Le code est déjà séparé (deux dépôts
   indépendants) ; ce qui est couplé, c'est la session de travail, ancrée sur
   l'autre projet, dont ce `CLAUDE.md` n'est donc **jamais chargé
   automatiquement**. S'y ajoute que `.claude` est le dossier de
   configuration de Claude Code lui-même, mauvais emplacement pour du code.
   Le déplacement du dossier suffit, `.git` étant dedans et le remote
   inchangé ; la mémoire de travail, elle, est rangée sous la clé de l'autre
   projet et devra être recopiée. À faire hors d'une séance en cours de
   saisie.
