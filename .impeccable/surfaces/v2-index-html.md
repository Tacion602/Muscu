---
version: 1
slug: "v2-index-html"
primary_target: "v2/index.html"
related_targets: []
---

# Surface : application v2 (v2/index.html), mode Operate

Portée : toute l'application v2 (Sport, Séance, Suivi, Réglages), PWA Android mobile, usage en salle.
Public : un seul utilisateur, pratiquant intermédiaire, méthodique. Tâche : saisir une séance vite et sans erreur, lire sa progression entre deux séries.
Contraintes : hors ligne d'abord, pas de build, cibles larges, chiffres lisibles à bout de bras, reprise de l'historique v1.

## Direction contract

THESIS : le standard du marché (Hevy, Strong, Material 3 Android) exécuté à leur niveau de finition, sans costume ; refuse le patchwork d'effets de la v1 (fonds vivants, néon, palettes par page).
OWN-WORLD : fond gris très clair, cartes blanches à rayon 12 px avec ombre légère, un seul bleu d'action, vert et rouge sémantiques uniquement pour hausse, recul, alerte ; Roboto partout, chiffres tabulaires ; icônes trait 1,8 px d'un seul jeu ; barre d'onglets basse Sport, Suivi, Réglages.
STORY : l'utilisateur ouvre sur ses jours, voit ce qui est en retard, entre dans sa séance en un appui, suit l'objectif de charge calculé, valide par les répétitions, lit sa courbe e1RM ensuite.
FIRST VIEWPORT : en-tête « Sport » avec la semaine, liste de cartes jour (code, nom, dernière fois, retard en rouge), barre d'onglets en bas ; l'action primaire est la carte du prochain jour.
FORM : canon (standard du marché), choix explicite de l'utilisateur le 4 novembre 2026 après trois cartes ; seed 617246f5 (tirage dégradé, sans challengers).
FINISH : unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Signature interaction : glissement 220 ms entre écrans, objectif de charge qui se met à jour à la validation d'une série.
