# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML/CSS/JS statique, sans framework ni bundler — décision fondatrice du
projet (voir CLAUDE.md, « Décision de départ ») : une PWA s'installe sur
Android depuis Chrome sans passer par un projet Google Cloud, un parcours
OAuth ou une chaîne de compilation. `Capacitor` reste l'échappatoire déjà
identifiée si un vrai `.apk` devenait nécessaire.

L'outillage de développement seul a changé le 16 septembre 2026 (Node.js,
impeccable.style, pour la refonte visuelle) — l'application livrée reste
sans build : ce qui part sur le téléphone est toujours du HTML/CSS/JS nu.

## Users

Un seul utilisateur, Jonathan Bassa : pratiquant récréatif/intermédiaire de
musculation (deux ans de pratique), en reconversion professionnelle,
méthodique, qui travaille à partir d'un programme écrit et suit sa
progression de façon rationnelle plutôt qu'intuitive. Utilise l'application
seul, en salle, sur téléphone Android (Pixel 9).

## Product Purpose

Suivre des séances de musculation et de course à pied en salle, contre un
programme hebdomadaire fixe défini dans un classeur Google Sheets, pour
juger la surcharge progressive d'une séance à l'autre. La saisie se fait
entièrement hors ligne pendant l'effort ; l'envoi vers le classeur n'a lieu
qu'à la fin, via un geste explicite.

## Positioning

Ce n'est pas un carnet d'entraînement générique : l'application est
étroitement couplée au programme personnel de l'utilisateur, importé
directement de son propre classeur (jamais un catalogue d'exercices
préconstruit). Elle fonctionne intégralement hors ligne pendant la séance,
sans compte ni dépendance au réseau pour la saisie. L'historique d'un
exercice suit son nom, pas le jour où il est programmé : un exercice
déplacé, remplacé puis remis en place ne perd jamais sa progression.

## Operating Context

Utilisée debout en salle de sport, doigts moites, écran regardé à bout de
bras posé au sol entre les séries. Le téléphone se verrouille et
l'application passe en arrière-plan en continu (changement d'appli pour une
calculatrice de plaques, appel, verrouillage). Réseau souvent mauvais ou
absent. Un seul exercice occupe l'écran à la fois. Installée depuis Chrome
Android sur l'écran d'accueil, jamais via un store.

## Capabilities and Constraints

- Aucun compte utilisateur, aucun backend applicatif : un pont Google Apps
  Script en écriture seule vers un classeur Google Sheets, qui sert à la
  fois de programme source et d'archive.
- `localStorage` du téléphone fait foi pendant la séance ; l'envoi au
  classeur est une synchronisation différée, jamais une dépendance
  temps réel.
- Doit survivre au verrouillage de l'écran et au passage en arrière-plan
  sans perdre de saisie ni interrompre les minuteries en cours.
- Mono-utilisateur par construction : pas de notion de comptes multiples,
  de partage ou de permissions.
- Le classeur source (« semaine 1 ») n'est jamais écrit automatiquement,
  seulement lu à l'import ; toutes les autres pages du classeur sont des
  sorties, jamais relues.

## Brand Commitments

Aucune identité de marque formelle : outil personnel, pas de logo ni de
charte au-delà du nom du dépôt (« Muscu ») et de l'intitulé « Suivi de
musculation ». Pas de public externe à satisfaire.

## Evidence on Hand

Le programme réel de l'utilisateur (`data/programme.json`, régénéré depuis
le classeur), avec les vrais noms d'exercices et groupes musculaires — les
maquettes et exemples doivent s'appuyer dessus plutôt que sur des noms
inventés. `CLAUDE.md` fait office d'historique produit détaillé (décisions,
incidents, raisons de chaque choix). Pas d'étude utilisateur au-delà des
remarques libres de l'utilisateur lui-même (onglets Remarques/Blessures du
classeur).

## Product Principles

- Hors ligne d'abord pendant l'effort : rien de ce qui se passe pendant une
  série ne doit dépendre du réseau.
- Ne jamais perdre une saisie déjà faite — plusieurs incidents passés
  (notes de consigne, séries) ont chacun mené à un correctif dédié plutôt
  qu'à une tolérance acceptée.
- Ne jamais inventer une donnée manquante ; interroger l'utilisateur plutôt
  que de déduire à sa place.
- L'identité d'un exercice est son nom, jamais le jour où il est
  programmé : sa progression le suit partout où il réapparaît.
- Peu de gestes, cibles larges, un élément à la fois plein écran — pensé
  pour un doigt moite et un regard pressé entre deux séries.

## Accessibility & Inclusion

Pas d'exigence d'accessibilité formalisée par un standard, mais un souci
déjà mesuré de lisibilité en conditions réelles de salle : contraste
vérifié (WCAG AA) sur les couleurs informatives du fond sombre actuel,
cibles tactiles larges pour des doigts moites, chiffres lisibles à bout de
bras. Ce travail de contraste est spécifique au fond sombre existant et
devra être repris pour tout nouveau fond.
