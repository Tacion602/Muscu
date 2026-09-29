"""Génère css/charte.css à partir de la photo de palette charte/palette.jpg.

Charte graphique demandée par l'utilisateur le 29 septembre 2026 :
« uniquement ces couleurs dans toute l'appli, insère cette photo dans un
système qui permet, en la remplaçant, de changer la charte graphique ».

Principe : la photo est une bande de cinq couleurs verticales de même
largeur (format des générateurs de palettes type Coolors). Le script lit la
couleur au milieu de chaque bande, à 40 % de la hauteur pour éviter les
libellés hexadécimaux écrits en bas. Leur rôle suit leur position, de
gauche à droite (ROLES ci-dessous) : remplacer la photo par une autre bande
de cinq couleurs dans le même ordre de rôles, relancer ce script, et toute
l'application change de charte.

Tout le reste se déduit de ces cinq couleurs :
- le fond clair (l'utilisateur ne veut pas de fond noir) est un blanc à
  peine teinté de la couleur principale ;
- chaque couleur vive a une version « encre », assombrie vers la couleur
  la plus sombre jusqu'à passer WCAG AA (4,6:1) sur le fond de champ, pour
  le texte ; les couleurs vives telles quelles restent aux aplats, halos,
  jauges et dégradés ;
- des versions pâles pour les fonds teintés (état musculaire).

css/charte.css ne s'applique que sous html[data-charte="photo"], posé par
appliquerDegradeAccueil() (js/app.js) quand le réglage du dégradé vaut
« Charte (photo) » : les anciennes couleurs de css/style.css restent
intactes, choisir une autre palette dans les Réglages y ramène.

Usage : python outils/charte.py
"""

from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
PHOTO = RACINE / "charte" / "palette.jpg"
SORTIE = RACINE / "css" / "charte.css"

# Rôle de chaque bande, de gauche à droite.
ROLES = ["rose", "violet", "bleu", "menthe", "encre"]
SEUIL_TEXTE = 4.6


def hexa(c):
    return "#%02x%02x%02x" % tuple(round(v) for v in c)


def rgb(c):
    return "%d, %d, %d" % tuple(round(v) for v in c)


def melange(a, b, part_b):
    return tuple(a[i] * (1 - part_b) + b[i] * part_b for i in range(3))


def luminance(c):
    def canal(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (canal(v) for v in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def encre(c, encre_sombre, fond):
    """Assombrit c vers la couleur la plus sombre jusqu'au seuil de texte."""
    for pas in range(0, 101):
        essai = melange(c, encre_sombre, pas / 100)
        if contraste(essai, fond) >= SEUIL_TEXTE:
            return essai
    return encre_sombre


def lire_palette():
    image = Image.open(PHOTO).convert("RGB")
    largeur, hauteur = image.size
    bande = largeur / len(ROLES)
    return {
        role: image.getpixel((int(bande * i + bande / 2), int(hauteur * 0.4)))
        for i, role in enumerate(ROLES)
    }


def generer():
    p = lire_palette()
    rose, violet, bleu, menthe, noir = (p[r] for r in ROLES)
    blanc = (255, 255, 255)
    fond = melange(blanc, violet, 0.04)
    champ = melange(blanc, violet, 0.08)
    trait = melange(blanc, violet, 0.18)
    texte_faible = encre(melange(noir, fond, 0.5), noir, champ)
    e = {nom: encre(c, noir, champ) for nom, c in
         (("rose", rose), ("violet", violet), ("bleu", bleu), ("menthe", menthe))}
    # Neuf rangs d'interférence du gainage (vert → rouge à l'origine) :
    # menthe → bleu → violet → rose, en encre pour rester lisibles.
    echelle = [e["menthe"], e["bleu"], e["violet"], e["rose"]]
    interference = []
    for i in range(9):
        t = i / 8 * 3
        k = min(int(t), 2)
        interference.append(melange(echelle[k], echelle[k + 1], t - k))

    v = {
        "ROSE": hexa(rose), "VIOLET": hexa(violet), "BLEU": hexa(bleu),
        "MENTHE": hexa(menthe), "NOIR": hexa(noir),
        "FOND": hexa(fond), "CHAMP": hexa(champ), "TRAIT": hexa(trait),
        "TEXTE_FAIBLE": hexa(texte_faible),
        "ROSE_ENCRE": hexa(e["rose"]), "VIOLET_ENCRE": hexa(e["violet"]),
        "BLEU_ENCRE": hexa(e["bleu"]), "MENTHE_ENCRE": hexa(e["menthe"]),
        "ROSE_PALE": hexa(melange(rose, blanc, 0.55)),
        "VIOLET_PALE": hexa(melange(violet, blanc, 0.6)),
        "BLEU_PALE": hexa(melange(bleu, blanc, 0.55)),
        "MENTHE_PALE": hexa(melange(menthe, blanc, 0.45)),
        "VIOLET_SOMBRE": hexa(melange(violet, noir, 0.55)),
        "VIOLET_NUIT": hexa(melange(violet, noir, 0.75)),
        "BLEU_SOMBRE": hexa(melange(bleu, noir, 0.55)),
        "VIOLET_RGB": rgb(violet), "ROSE_RGB": rgb(rose), "BLEU_RGB": rgb(bleu),
        "MENTHE_RGB": rgb(menthe), "NOIR_RGB": rgb(noir),
        "ROSE_ENCRE_RGB": rgb(e["rose"]), "MENTHE_ENCRE_RGB": rgb(e["menthe"]),
        "INTERFERENCE": "\n".join(
            "  --interference-%d: %s;" % (i + 1, hexa(c)) for i, c in enumerate(interference)),
    }
    css = (RACINE / "charte" / "modele.css").read_text(encoding="utf-8")
    for cle, valeur in v.items():
        css = css.replace("{{%s}}" % cle, valeur)
    if "{{" in css:
        raise SystemExit("Variable non remplacée dans charte/modele.css")
    SORTIE.write_text(css, encoding="utf-8")
    print("Écrit", SORTIE.relative_to(RACINE))
    for role in ROLES:
        print(" ", role, hexa(p[role]))
    for nom, c in e.items():
        print("  encre", nom, hexa(c), "%.2f:1 sur le champ" % contraste(c, champ))


if __name__ == "__main__":
    generer()
