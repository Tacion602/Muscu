"""Sauvegarde locale du classeur entier, tous onglets, au format xlsx.

Le classeur est la seule copie de ce que le pont y ecrit, et l'historique des
versions de Google Sheets porte sur le classeur entier : une restauration faite
pour reparer un onglet ramene tous les autres en arriere, cas reel du
9 septembre 2026 ou la seance de la veille a ete perdue ainsi. Une copie datee,
hors de Google, permet de recuperer un onglet sans toucher aux autres.

Les copies vont dans sauvegardes/, **exclu de git** : le depot est public
(GitHub Pages) et le classeur contient les onglets Remarques et Blessures.

La copie n'est ecrite que si elle se relit comme un classeur et contient
l'onglet du programme : une page d'erreur de Google enregistree sous un nom
de sauvegarde rassurerait a tort.

Usage :
    python outils/sauvegarder_classeur.py
"""

import html
import io
import re
import urllib.request
import zipfile
from datetime import datetime
from pathlib import Path

CLASSEUR_ID = "1JyJSln_sqYnZzsnThiw7sbDcZjtma6n0Hmr-n8fYKiE"
ONGLET_OBLIGATOIRE = "semaine 1"

RACINE = Path(__file__).resolve().parent.parent
DOSSIER = RACINE / "sauvegardes"


def telecharger():
    url = "https://docs.google.com/spreadsheets/d/" + CLASSEUR_ID + "/export?format=xlsx"
    requete = urllib.request.Request(url, headers={"User-Agent": "suivi-muscu/1.0"})
    with urllib.request.urlopen(requete, timeout=60) as reponse:
        if reponse.status != 200:
            raise SystemExit("ECHEC : le classeur a repondu " + str(reponse.status) + ".")
        return reponse.read()


def onglets(contenu):
    with zipfile.ZipFile(io.BytesIO(contenu)) as archive:
        xml = archive.read("xl/workbook.xml").decode("utf-8")
    return [html.unescape(nom) for nom in re.findall(r'<sheet[^>]*\bname="([^"]+)"', xml)]


def main():
    contenu = telecharger()
    try:
        noms = onglets(contenu)
    except (zipfile.BadZipFile, KeyError):
        raise SystemExit("ECHEC : le fichier recu n'est pas un classeur lisible. Rien n'est ecrit.")

    if ONGLET_OBLIGATOIRE not in [n.strip().lower() for n in noms]:
        raise SystemExit(
            "ECHEC : l'onglet '" + ONGLET_OBLIGATOIRE + "' manque parmi " + str(noms)
            + ". Rien n'est ecrit."
        )

    DOSSIER.mkdir(exist_ok=True)
    chemin = DOSSIER / ("classeur_" + datetime.now().strftime("%Y-%m-%d_%H%M") + ".xlsx")
    chemin.write_bytes(contenu)

    print("Sauvegarde : " + str(chemin.relative_to(RACINE)) + " (" + str(len(contenu) // 1024) + " Ko)")
    print(str(len(noms)) + " onglets : " + ", ".join(noms))


if __name__ == "__main__":
    main()
