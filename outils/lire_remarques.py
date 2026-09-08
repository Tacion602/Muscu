"""Affiche les remarques de fin de seance laissees par l'utilisateur.

L'onglet Remarques n'existe dans le classeur qu'a partir du premier envoi
d'une seance qui en porte une (voir ecrireRemarque() dans appsscript/Code.gs) :
son gid n'est donc pas connu a l'avance, contrairement a celui du programme.
Il faut le lire une fois dans l'URL du classeur (parametre "gid=" une fois
l'onglet Remarques ouvert) et le passer ici.

Usage :
    python outils/lire_remarques.py --gid 123456789
"""

import argparse
import csv
import io
import urllib.request

CLASSEUR_ID = "1JyJSln_sqYnZzsnThiw7sbDcZjtma6n0Hmr-n8fYKiE"


def telecharger(gid):
    url = (
        "https://docs.google.com/spreadsheets/d/" + CLASSEUR_ID +
        "/export?format=csv&gid=" + str(gid)
    )
    requete = urllib.request.Request(url, headers={"User-Agent": "suivi-muscu/1.0"})
    with urllib.request.urlopen(requete, timeout=30) as reponse:
        if reponse.status != 200:
            raise SystemExit("Le classeur a repondu " + str(reponse.status) + ".")
        return reponse.read().decode("utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--gid", required=True, type=int, help="gid de l'onglet Remarques")
    args = parser.parse_args()

    lignes = list(csv.reader(io.StringIO(telecharger(args.gid))))
    if not lignes:
        print("Onglet vide.")
        return

    for date, jour, remarque in lignes[1:]:
        if not remarque.strip():
            continue
        print(date + " (" + jour + ") : " + remarque)


if __name__ == "__main__":
    main()
