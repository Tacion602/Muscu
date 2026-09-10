"""Affiche les remarques et les blessures laissees par l'utilisateur.

Les deux onglets sont ecrits par le pont (voir ecrireRemarque() et
ecrireBlessure() dans appsscript/Code.gs) et n'existent qu'a partir du premier
envoi qui en porte une.

L'interrogation se fait **par nom d'onglet**, via l'API de visualisation de
Google Sheets, et non par gid : le gid d'un onglet cree automatiquement n'est
connu qu'une fois l'onglet ouvert a la main, ce qui obligeait a le demander a
l'utilisateur. Le nom, lui, est fixe par le code qui cree l'onglet.

Usage :
    python outils/lire_remarques.py                 # les deux onglets
    python outils/lire_remarques.py Blessures       # un seul
"""

import csv
import io
import sys
import urllib.parse
import urllib.request

CLASSEUR_ID = "1JyJSln_sqYnZzsnThiw7sbDcZjtma6n0Hmr-n8fYKiE"
ONGLETS = ["Remarques", "Blessures"]


def telecharger(onglet):
    url = (
        "https://docs.google.com/spreadsheets/d/" + CLASSEUR_ID +
        "/gviz/tq?tqx=out:csv&sheet=" + urllib.parse.quote(onglet)
    )
    requete = urllib.request.Request(url, headers={"User-Agent": "suivi-muscu/1.0"})
    with urllib.request.urlopen(requete, timeout=30) as reponse:
        if reponse.status != 200:
            raise SystemExit("Le classeur a repondu " + str(reponse.status) + ".")
        return reponse.read().decode("utf-8")


def afficher(onglet):
    print("=" * 60)
    print(onglet)
    print("=" * 60)

    try:
        lignes = list(csv.reader(io.StringIO(telecharger(onglet))))
    except Exception as erreur:
        # Un onglet absent est un cas normal tant qu'aucune seance n'en a
        # produit : le dire plutot que de sortir en erreur.
        print("Onglet introuvable ou illisible : " + str(erreur))
        return

    corps = [l for l in lignes[1:] if any(c.strip() for c in l)]
    if not corps:
        print("Aucune entree.")
        return

    for ligne in corps:
        entete = " | ".join(c for c in ligne[:-1] if c.strip())
        print("\n--- " + entete)
        print(ligne[-1].strip())


def main():
    for onglet in (sys.argv[1:] or ONGLETS):
        afficher(onglet)
        print()


if __name__ == "__main__":
    main()
