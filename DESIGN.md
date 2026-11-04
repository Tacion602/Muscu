---
name: Muscu v2
description: Suivi de musculation en salle, standard Android du marché joué sans détour, un seul thème clair.
colors:
  fond: "#f5f6f8"
  carte: "#ffffff"
  fond-2: "#eceef2"
  trait: "#e3e6eb"
  texte: "#111418"
  texte-2: "#5f6670"
  texte-3: "#8a9099"
  accent: "#2563eb"
  accent-fond: "#e8eefc"
  accent-fonce: "#1d4ed8"
  hausse: "#15803d"
  hausse-fond: "#e6f5ec"
  baisse: "#b91c1c"
  baisse-fond: "#fdecec"
  attention: "#b45309"
  attention-fond: "#fff3e0"
  repos: "#1e3a8a"
typography:
  display:
    fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.45
  title:
    fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.06em"
  numeric:
    fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tabular-nums"
rounded:
  petit: "8px"
  moyen: "12px"
  feuille: "16px"
  pilule: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  marge: "16px"
  carte: "14px"
  onglets: "64px"
components:
  bouton-primaire:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.carte}"
    rounded: "{rounded.pilule}"
    padding: "0 20px"
    height: "48px"
  bouton-primaire-active:
    backgroundColor: "{colors.accent-fonce}"
    textColor: "{colors.carte}"
  bouton-secondaire:
    backgroundColor: "{colors.fond-2}"
    textColor: "{colors.texte}"
    rounded: "{rounded.pilule}"
    padding: "0 20px"
    height: "48px"
  bouton-danger:
    backgroundColor: "{colors.baisse-fond}"
    textColor: "{colors.baisse}"
    rounded: "{rounded.pilule}"
    padding: "0 20px"
    height: "48px"
  bouton-discret:
    textColor: "{colors.accent}"
    rounded: "{rounded.pilule}"
    padding: "0 20px"
    height: "40px"
  bouton-petit:
    backgroundColor: "{colors.fond-2}"
    textColor: "{colors.texte}"
    rounded: "18px"
    padding: "0 14px"
    height: "36px"
  carte:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.texte}"
    rounded: "{rounded.moyen}"
    padding: "{spacing.carte}"
  puce:
    backgroundColor: "{colors.fond-2}"
    textColor: "{colors.texte-2}"
    rounded: "10px"
    padding: "2px 8px"
  puce-hausse:
    backgroundColor: "{colors.hausse-fond}"
    textColor: "{colors.hausse}"
  puce-baisse:
    backgroundColor: "{colors.baisse-fond}"
    textColor: "{colors.baisse}"
  puce-attention:
    backgroundColor: "{colors.attention-fond}"
    textColor: "{colors.attention}"
  segment:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.texte}"
    rounded: "20px"
    padding: "0 14px"
    height: "40px"
  segment-choisi:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.carte}"
  champ:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.texte}"
    rounded: "{rounded.petit}"
    padding: "10px 12px"
    height: "48px"
  alerte-info:
    backgroundColor: "{colors.accent-fond}"
    textColor: "{colors.repos}"
    rounded: "{rounded.moyen}"
    padding: "10px 14px"
  toast:
    backgroundColor: "{colors.texte}"
    textColor: "{colors.carte}"
    rounded: "{rounded.petit}"
    padding: "12px 16px"
  onglet-actif:
    backgroundColor: "{colors.accent-fond}"
    textColor: "{colors.accent}"
    rounded: "15px"
    width: "56px"
    height: "30px"
  minuterie:
    backgroundColor: "{colors.repos}"
    textColor: "{colors.carte}"
    padding: "10px 16px"
---

# Design System: Muscu v2

## Overview

**Creative North Star: "La salle sous lumière crue"**

Muscu v2 joue le standard Android du marché (Hevy, Strong, Material 3) sans costume ni effet : un fond gris très clair, des cartes blanches posées dessus par une ombre à peine visible, un seul bleu pour tout ce qui agit, et deux couleurs sémantiques qui ne parlent que quand un chiffre monte, recule ou pose problème. L'application vit dans un seul thème clair, pensé pour un écran lu à bout de bras entre deux séries, un doigt moite et un regard pressé. Tout ce qui est décoratif dans la v1 (fonds vivants, néon, palettes par page, vague plein écran) est refusé ici, ce refus étant le choix explicite de l'utilisateur le 4 novembre 2026.

La densité est celle d'une liste native : rangées de 56 px, cartes de 14 px de marge intérieure séparées de 10 px, gouttière de 16 px, barre d'onglets basse de 64 px. Les chiffres sont la matière première de l'écran, toujours en chiffres tabulaires, grands quand ils comptent (objectif de charge à 40 px, minuterie plein écran à 64 px) et gris quand ils ne font que contextualiser. Le mouvement se limite à un glissement latéral de 220 ms entre écrans et à des micro-transitions de 180 ms sur les fonds ; tout est coupé sous `prefers-reduced-motion`.

**Key Characteristics:**
- Un seul thème clair, fond gris `fond` et cartes blanches `carte`, aucune bascule sombre.
- Un seul bleu d'action (`accent`), avec son fond pâle et sa version foncée pour l'appui.
- Vert et rouge réservés à la sémantique : hausse, recul, alerte. Le stable reste neutre.
- Roboto système partout, chiffres tabulaires sur toute valeur numérique.
- Un seul jeu d'icônes au trait, viewBox 24, trait 1,8 px, bouts ronds.
- Rayons 12 px pour les surfaces, 8 px pour les champs et petites cases, pilule pour les boutons.

## Colors

Une palette de produit Android : neutres gris froids, un bleu franc, des sémantiques sombres sur fonds pastel, tous mesurés contre les deux fonds de l'application (texte 16,1:1, texte secondaire 5,9:1, bleu 5,2:1, vert 4,6:1, rouge 5,9:1 sur fond gris et blanc).

### Primary
- **Bleu d'action** (`accent`) : la seule couleur qui agit. Bouton primaire, onglet actif, segment choisi, bouton RIR choisi, liseré de la série en cours, trait et points des courbes, contour 2 px de la carte du prochain jour, anneau de focus (2 px, décalé de 1 px), `accent-color` des cases à cocher.
- **Bleu d'action, fond pâle** (`accent-fond`) : fond du code de jour dans une carte, pastille de l'onglet actif, puce accent, alerte info, surlignage de sélection, case de calendrier d'un jour de musculation.
- **Bleu d'action, appui** (`accent-fonce`) : fond du bouton primaire pendant l'appui, rien d'autre.

### Secondary
- **Bleu nuit de repos** (`repos`) : fond du bandeau de minuterie et du plein écran de repos, texte blanc dessus, anneau de progression en bleu clair (`#93c5fd`) sur piste blanche à 20 %. Sert aussi de couleur de texte de l'alerte info. C'est la seule surface saturée pleine de l'application, et elle n'apparaît que pendant un repos.

### Tertiary
- **Vert de hausse** (`hausse`, fond `hausse-fond`) : un chiffre qui monte. Puce hausse, texte de comparaison, objectif atteint, champs d'une série faite meilleure que la dernière fois, point vert d'un segment rempli, zone musculaire en progression.
- **Rouge de recul** (`baisse`, fond `baisse-fond`) : un chiffre qui recule ou une action destructrice. Puce baisse, retard d'un jour dans sa carte, champs d'une série faite moins bonne, bouton danger, alerte d'insomnie, zone musculaire en recul.
- **Ambre d'attention** (`attention`, fond `attention-fond`) : avertissement sans jugement de progression. Charge aberrante, point deload d'une courbe, puce et alerte d'attention. Le même couple de valeurs colore le code des jours cardio et leurs cases de calendrier, écrit en dur dans la feuille plutôt que par les jetons.

### Neutral
- **Fond d'écran** (`fond`) : gris très clair, fond de chaque écran et de la grande barre de titre des racines.
- **Surface de carte** (`carte`) : blanc des cartes, barres de navigation, barre d'onglets, feuille basse, champs de saisie au repos, segments non choisis.
- **Fond creux** (`fond-2`) : gris un ton plus marqué que le fond, pour les éléments posés dans une carte : bouton secondaire, champs de série, boutons RIR, tuiles de chiffres, cases du calendrier et de la frise de sommeil, silhouette neutre des mannequins, état d'appui des icônes et rangées.
- **Trait** (`trait`) : séparateurs de rangées, bord des champs, piste des axes de courbe, poignée de la feuille basse, bordure basse des barres.
- **Texte** (`texte`) : texte courant, titres, fond du toast.
- **Texte secondaire** (`texte-2`) : libellés, sous-titres, unités, titres de section, axes de courbe, onglets inactifs.
- **Texte tertiaire** (`texte-3`) : chevrons, placeholders, crédit d'image.

### Named Rules
**La règle du seul bleu.** Tout ce qui est interactif et neutre s'exprime en `accent`. Aucune deuxième couleur d'action, aucun dégradé, aucun halo.

**La règle de la sémantique muette.** Vert et rouge ne colorent qu'un chiffre comparé (hausse, recul), une alerte ou une action destructrice. Une série stable garde le gris `fond-2` et le texte normal : l'absence de couleur est l'information.

**La règle du fond pâle.** Chaque couleur sémantique a son fond pastel dédié (`*-fond`) et son texte sombre ; une couleur vive n'est jamais posée en texte sur blanc à moins de 4,5:1, et jamais en aplat sous du texte blanc hormis `accent` et `repos`.

## Typography

**Display Font:** Roboto (avec system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Roboto (même pile)
**Label/Mono Font:** aucune police distincte ; les chiffres passent en `font-variant-numeric: tabular-nums`.

**Character:** la police système Android telle quelle, choisie et non subie. Hiérarchie par la graisse (400, 500, 600, 700) et la taille plus que par le style ; les grands chiffres resserrent légèrement leur approche (-0,02 em), les titres de barre à peine (-0,01 em).

### Hierarchy
- **Display** (700, 40 px, interligne 1, -0,02 em, tabulaire) : l'objectif de charge sur la fiche d'exercice, avec son unité en 15 px 500 gris. La minuterie plein écran pousse le même registre à 64 px, le bandeau compact à 30 px.
- **Headline** (700, 24 px) : titre des trois écrans racines (Sport, Suivi, Réglages) dans la grande barre sans bordure ; le nom de l'exercice en séance en 22 px, interligne 1,15, `text-wrap: balance`.
- **Title** (600, 18 px, -0,01 em) : titre des sous-écrans dans la barre de 56 px, titre d'une feuille basse. La phrase d'accroche de l'écran de démarrage prend 19 px 500 interligne 1,35.
- **Body** (400, 15 px, interligne 1,45) : texte courant et boutons (600). Les titres de rangée et de carte de jour passent en 500 ou 600 à 15 ou 16 px.
- **Label** (600, 13 px, 0,06 em, capitales) : titres de section au-dessus des listes, en-têtes de colonnes de séries et libellé RIR (11 px). Les libellés de champ et sous-textes restent en 13 px 400 gris, sans capitales ; les onglets en 11 px 500, 0,02 em.
- **Numeric** (700, 22 px, tabulaire) : tuiles de chiffres et bilan de repos ; les champs de série saisissent en 19 px 600 centré, les champs ordinaires en 17 px pour éviter le zoom du clavier.

### Named Rules
**La règle du chiffre tabulaire.** Toute valeur numérique qui peut changer (charge, répétitions, chrono, allure, écart) porte `tabular-nums`, pour que rien ne bouge latéralement quand le chiffre change.

**La règle des capitales rares.** Les capitales espacées ne servent qu'aux titres de section et en-têtes de colonnes en 11 à 13 px gris ; jamais sur un titre, un bouton ou un libellé de champ.

## Layout

Une seule colonne, plafonnée à 640 px et centrée, dans un conteneur fixé sur tout le viewport (`#app`, `position: fixed; inset: 0`). Chaque écran est une pile verticale : barre en haut (56 px minimum, `safe-area-inset-top` ajouté), corps défilant, et sur les trois racines la barre d'onglets de 64 px collée en bas (plus `safe-area-inset-bottom`). Le corps porte 12 px en haut, 16 px de gouttière latérale (ou l'encoche si elle dépasse), 24 px en bas, ou 64 + 16 px quand les onglets sont présents.

Rythme : cartes séparées de 10 px, listes à 10 px, titre de section à 18 px au-dessus et 8 px en dessous, rangées de 56 px séparées d'un trait, segments et puces à 6 px, champs en grille de deux colonnes à 10 px. Les grilles de suivi passent à trois colonnes à partir de 600 px, seule rupture de mise en page observée. Les bandeaux collants (minuterie, chrono de gainage) annulent la gouttière par des marges négatives pour courir d'un bord à l'autre.

Navigation : trois racines accessibles par la barre d'onglets ; tout sous-écran arrive par glissement depuis la droite en 220 ms (`cubic-bezier(.2, 0, 0, 1)`), l'écran quitté reculant de 30 % à 60 % d'opacité ; le retour inverse le geste. Les dialogues sont des feuilles basses sous un voile gris à 40 %, rayon 16 px en haut, poignée de 36 par 4 px, 85 % de hauteur au plus. Tout cela est coupé sous `prefers-reduced-motion`, y compris l'alternance des schémas d'exercice et le spinner.

## Elevation & Depth

Hybride plat : la profondeur vient d'abord du contraste tonal (carte blanche sur fond gris, élément gris `fond-2` creusé dans la carte), puis d'une ombre si discrète qu'elle ne fait qu'ourler la carte. Les états interactifs ne montent pas : ils s'enfoncent (`scale(.98)` ou `.985` à l'appui, fond `fond-2` sur une rangée ou une icône). La mise en avant se fait par un contour bleu de 2 px (`box-shadow: 0 0 0 2px accent`), jamais par une ombre plus forte.

### Shadow Vocabulary
- **Ombre de carte** (`box-shadow: 0 1px 2px rgba(17, 20, 24, .06), 0 1px 1px rgba(17, 20, 24, .04)`) : toute carte, tuile, carte de jour, groupe de réglages, détail d'historique.
- **Ombre haute** (`box-shadow: 0 8px 24px -8px rgba(17, 20, 24, .25)`) : le toast seul, qui flotte au-dessus de la barre d'onglets.
- **Contour de sélection** (`box-shadow: 0 0 0 2px var(--accent), var(--ombre)`) : carte du prochain jour ou de la séance en cours, fiche d'un point de courbe choisi ; en inset de 2 px sur la case du jour dans le calendrier.

### Named Rules
**La règle de l'ourlet.** L'ombre de carte est la seule ombre de surface. Une carte plus importante ne reçoit pas plus d'ombre ; elle reçoit un contour bleu.

## Shapes

Coins doux et constants : 12 px pour toute surface (carte, alerte, tuile, fiche, code de jour), 8 px pour ce qui vit dedans (champ, case de calendrier, tuile de chiffre, bouton RIR, image d'exercice), 16 px pour le haut de la feuille basse, 6 px pour les créneaux de sommeil. Les boutons sont des pilules pleines (hauteur 48 px, rayon 24 ; petit 36 px, rayon 18 ; segments 40 px, rayon 20 ; puces rayon 10) et les boutons d'icône des disques de 44 px. Les bordures sont rares et fines (1 px `trait` sur champs, segments, séparateurs, barres) ; les champs de série n'ont pas de bordure au repos et la prennent en bleu quand ils sont courants, en ambre quand la charge est aberrante. Les courbes utilisent un trait de 2,5 px à jointures rondes, points blancs cerclés de bleu, dernier point plein, point choisi plus gros avec une ombre portée bleue ; les polygones de mannequin sont bordés de blanc à 3 px et de bleu à 8 px quand ils sont sélectionnés.

## Components

### Buttons
- **Shape:** pilule pleine (rayon 24 px, hauteur minimale 48 px, marge intérieure 0 20 px, texte 15 px 600, écart icône-texte 8 px).
- **Primary:** fond `accent`, texte blanc ; `accent-fonce` à l'appui. `.large` prend toute la largeur ; dans la feuille basse les boutons d'action se partagent la ligne à parts égales.
- **Secondary (défaut):** fond `fond-2`, texte `texte`. Sert aux actions non principales (passage précédent, ajouter une série).
- **Danger:** texte `baisse` sur `baisse-fond`, même pilule.
- **Discret:** sans fond, texte `accent`, 40 px de haut.
- **Petit:** 36 px, rayon 18, 14 px de marge, texte 14 px.
- **Hover / Focus:** pas d'état hover (surface tactile) ; `scale(.98)` à l'appui en 180 ms ; `focus-visible` en anneau bleu 2 px décalé de 1 px ; désactivé à 50 % d'opacité sans pointeur.
- **Icône seule:** disque de 44 px, fond `fond-2` à l'appui, icône 22 px.
- **Sur le plein écran de repos:** boutons en blanc à 16 % sur `repos`, texte blanc.

### Chips
- **Puce (`.puce`):** 12 px 600, rayon 10, marge 2 8 px, fond `fond-2` texte `texte-2` ; variantes hausse, baisse, attention, accent avec leur fond pâle et leur texte sombre. Lecture seule, jamais un bouton.
- **Segment (`.segment`):** bouton de choix exclusif, 40 px, rayon 20, blanc bordé de `trait`, 14 px 500 ; choisi en `accent` plein texte blanc ; un segment rempli non choisi porte un point vert de 7 px. Même grammaire pour `.chip` (36 px, fond `fond-2`) et `.echelle` (boutons carrés de 44 px rayon 8 à parts égales), armé en pointillé bleu.

### Cards / Containers
- **Carte (`.carte`):** blanc, rayon 12, ombre de carte, 14 px de marge intérieure, 10 px entre cartes.
- **Carte de jour (`.carte-jour`):** carte entière cliquable en rangée : code du jour dans un carré de 44 px rayon 12 (`accent-fond` sur `accent`, ambre pour le cardio, ardoise pour le gainage), nom 16 px 600, sous-texte 13 px gris (retard en rouge 500, en cours en bleu 500), chevron gris tertiaire ; contour bleu 2 px si c'est la prochaine ou en cours ; `scale(.985)` à l'appui.
- **Tuile (`.tuile`):** carte de grille de suivi, 96 px minimum, icône bleue, titre 15 px 600, sous-texte 12 px.
- **Rangée (`.rangee`):** 56 px, écart 12 px, icône carrée 40 px rayon 10 sur `accent-fond`, titre 500 et sous-texte 13 px gris, chevron 20 px trait 2 ; séparateurs `trait` ; en bouton, l'appui déborde de la carte de 14 px de chaque côté en `fond-2`.
- **Alerte (`.alerte`):** rayon 12, 10 14 px, 14 px, fond pâle et texte foncé de sa famille (baisse `#7f1d1d`, attention `#7c3a03`, info `repos`).
- **Tuiles de chiffres (`.chiffres`):** rangée de cases `fond-2` rayon 8, valeur 22 px 700 tabulaire, libellé 12 px gris.

### Inputs / Fields
- **Style:** fond blanc, bordure 1 px `trait`, rayon 8, 10 12 px, 48 px minimum, texte 17 px ; libellé 13 px gris au-dessus (`.champ`), grille de deux colonnes à 10 px.
- **Focus:** anneau `accent` 2 px décalé de 1 px, aucune ombre.
- **Bascule (`.bascule`):** rangée de 52 px, libellé à gauche, case native de 26 px en `accent-color: accent`.
- **Champ de série (`.serie input.f`):** 48 px, fond `fond-2`, bordure transparente, texte 19 px 600 centré tabulaire, placeholder gris tertiaire 400 ; courant : bordure `accent` sur blanc ; fait : `hausse-fond` et texte vert, ou `baisse-fond` et rouge, ou `fond-2` si stable ; charge aberrante : bordure et fond ambre.

### Navigation
- **Barre d'onglets (`.onglets`):** 64 px plus encoche, blanc bordé de `trait` en haut, quatre onglets (Accueil, Sport, Suivi, Réglages, depuis le 4 novembre 2026) à parts égales : icône 22 px dans une pastille de 56 par 30 px rayon 15, libellé 11 px 500 0,02 em ; actif en `accent` avec pastille `accent-fond`, inactif en `texte-2`, appui en `fond-2`. Masquée hors des racines.
- **Barre d'écran (`.barre`):** 56 px, blanc, bordure basse `trait`, bouton retour rond 44 px à gauche, titre 18 px 600 tronqué avec sous-titre 12 px gris. Les racines prennent la grande barre : fond `fond`, sans bordure, titre 24 px 700, 18 px au-dessus.
- **Glissement d'écran:** 220 ms `cubic-bezier(.2, 0, 0, 1)` ; écran sortant à -30 % et 60 % d'opacité.
- **Feuille basse (`.voile` / `.feuille`):** voile `rgba(17, 20, 24, .4)` en fondu 180 ms, feuille blanche rayon 16 en haut, poignée de 36 par 4 px en `trait`, montée en 220 ms ; liste de choix en rangées de 52 px séparées d'un trait.
- **Toast:** fond `texte`, texte blanc 14 px, rayon 8, 12 16 px, ombre haute, posé 16 px au-dessus des onglets, fondu et montée de 8 px en 180 ms, 2,2 s à l'écran.

### Icons
Un seul jeu de 23 icônes dessiné dans `ICONES` (ui.js) : viewBox 24, aucun remplissage, trait 1,8 px en `currentColor`, bouts et jointures ronds, affiché à 22 px dans les boutons ronds, onglets et rangées. Les chevrons de rangée et le petit bouton de série passent à un trait de 2 px à 18 ou 20 px.

### Minuterie de repos (signature)
- **Bandeau (`.minuterie`):** collant en haut du corps, pleine largeur par marges négatives, fond `repos` texte blanc, 10 16 px, chiffre 30 px 700 tabulaire à gauche, libellé 12 px à 90 % à droite.
- **Plein écran (`.minuterie-plein`):** couche absolue sur `repos`, anneau SVG de 220 px, trait 8 arrondi, piste blanche à 20 %, progrès `#93c5fd` tourné de -90°, chiffre 64 px 700 au centre, exercice suivant 15 px à 90 % (titre 20 px), bilan en 22 px, bouton fermer blanc en haut à droite, boutons à fond blanc 16 %.
- **Progression de séance (`.progression`):** filet de 4 px `fond-2` en tête d'écran, remplissage `accent`, largeur animée 250 ms.

### Courbe (svg.courbe)
Tracé 340 par 210 généré par `courbeSvg()` : 46 px de gouttière gauche pour les valeurs, quatre lignes de grille en `trait` pointillé 2 4, axe plein, au plus six dates en bas, texte 11 px gris en Roboto ; ligne `accent` 2,5 px, points de rayon 4,5 blancs cerclés de bleu, dernier point plein, point choisi rayon 6,5 bleu cerclé de blanc avec ombre bleue, point deload en ambre ; une zone transparente de 28 px par point reçoit l'appui et ouvre une fiche contourée de bleu.

## Do's and Don'ts

### Do:
- **Do** poser toute surface sur `fond` en carte blanche rayon 12 px avec l'ombre de carte, séparée de 10 px de la suivante et de 16 px des bords.
- **Do** réserver `accent` à ce qui agit ou est sélectionné, et le fond `accent-fond` à ce qui le signale au repos (onglet actif, code de jour, puce).
- **Do** colorer un chiffre comparé en `hausse` ou `baisse` sur son fond pâle, et laisser une valeur stable en gris `fond-2` texte normal.
- **Do** garder 48 px de hauteur sur tout bouton et champ de saisie, 44 px sur un bouton d'icône, 56 px sur une rangée, 40 px sur un segment.
- **Do** écrire chaque valeur numérique en chiffres tabulaires, en 700 dès qu'elle est la raison d'être de l'écran.
- **Do** dessiner toute icône nouvelle dans `ICONES` : viewBox 24, trait 1,8 px, bouts ronds, sans remplissage.
- **Do** faire arriver un sous-écran par glissement de 220 ms et un dialogue par feuille basse, et couper ces mouvements sous `prefers-reduced-motion`.

### Don't:
- **Don't** introduire une deuxième couleur d'action, un dégradé, un halo ou un fond animé : la v1 les a eus, la v2 les refuse par choix explicite.
- **Don't** ajouter un thème sombre ni une palette par écran ; `repos` est la seule surface saturée et n'existe que pendant un repos.
- **Don't** utiliser vert ou rouge pour décorer, hiérarchiser ou marquer un état neutre ; ils ne disent que hausse, recul, alerte ou suppression.
- **Don't** monter une carte par une ombre plus forte ; une mise en avant est un contour `accent` de 2 px.
- **Don't** poser des capitales espacées ailleurs que sur un titre de section ou un en-tête de colonne en 11 à 13 px gris.
- **Don't** charger une police web ni une icône d'un autre jeu : la pile Roboto système et `ICONES` suffisent.
