"""Lit le classeur Google du programme et en tire data/programme.json.

Le classeur est une grille dessinee pour l'oeil humain : chaque jour occupe un
bloc de lignes, et sept groupes de cinq colonnes (Exo, Charge, Reps, RIR, Total)
y logent sept seances successives, la derniere etant le deload. La colonne B
porte, sur les lignes suivant le nom de l'exercice, la prescription de series,
le RIR cible, la consigne technique et le couple muscle plus temps de repos,
dans un ordre qui n'est pas garanti : on les reconnait donc par leur forme.

Usage :
    python outils/importer_classeur.py            # telecharge la version en ligne
    python outils/importer_classeur.py fichier.csv
"""

import csv
import io
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CLASSEUR_ID = "1JyJSln_sqYnZzsnThiw7sbDcZjtma6n0Hmr-n8fYKiE"
GID_PROGRAMME = 1138168114

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "programme.json"

# Colonne B (nom et consignes) puis sept groupes de cinq a partir de la colonne C.
PREMIERE_COLONNE_SEANCE = 2
LARGEUR_GROUPE = 5
NB_SEANCES = 7

# Une prescription de series : "4x 6-8", "3X12-15", "3-4 X 30-45sec".
MOTIF_SERIES = re.compile(r"(\d+(?:-\d+)?)\s*[xX]\s*(\d+)(?:\s*-\s*(\d+))?")
# Un temps de repos : 2'30, 1'15, 2'00, ou 2' seul.
MOTIF_REPOS = re.compile(r"(\d+)\s*'\s*(\d{2})?")
MOTIF_RIR = re.compile(r"RIR\s*([\d\s/]+)", re.IGNORECASE)
MOTIF_JOUR = re.compile(r"^(J\d)\b\s*(.*)$")
MOTIF_DATE = re.compile(r"^\d{2}/\d{2}/\d{4}$")
MOTIF_REPOS_MOT = re.compile(r"\bREPOS\b|\bREOIS\b", re.IGNORECASE)


def telecharger(gid=GID_PROGRAMME):
    url = (
        "https://docs.google.com/spreadsheets/d/" + CLASSEUR_ID +
        "/export?format=csv&gid=" + str(gid)
    )
    requete = urllib.request.Request(url, headers={"User-Agent": "suivi-muscu/1.0"})
    with urllib.request.urlopen(requete, timeout=30) as reponse:
        if reponse.status != 200:
            raise SystemExit("Le classeur a repondu " + str(reponse.status) + ".")
        return reponse.read().decode("utf-8")


def lire_grille(texte):
    lignes = list(csv.reader(io.StringIO(texte)))
    largeur = PREMIERE_COLONNE_SEANCE + NB_SEANCES * LARGEUR_GROUPE
    return [(ligne + [""] * largeur)[:largeur] for ligne in lignes]


def net(valeur):
    return re.sub(r"\s+", " ", (valeur or "").strip())


def nombre(valeur):
    """Les charges sont parfois decimales et notees a la virgule."""
    valeur = net(valeur).replace(",", ".")
    if not valeur:
        return None
    try:
        v = float(valeur)
    except ValueError:
        return None
    return int(v) if v == int(v) else v


def secondes_de_repos(texte):
    trouve = MOTIF_REPOS.search(texte)
    if not trouve:
        return None
    minutes = int(trouve.group(1))
    secondes = int(trouve.group(2) or 0)
    return minutes * 60 + secondes


def rir_cible(texte):
    trouve = MOTIF_RIR.search(texte)
    if not trouve:
        return []
    return [int(n) for n in re.findall(r"\d", trouve.group(1))]


def classer_consignes(lignes_b):
    """Range les lignes de la colonne B par ce qu'elles disent, pas par leur rang.

    L'ordre varie d'un exercice a l'autre dans le classeur : "Deltoide lateral
    1'15" met le muscle avant le repos, "Pectoraux REPOS 2'30" intercale le mot
    REPOS, et "1'15BICEPS" ne separe rien du tout.
    """
    fiche = {
        "prescription": "",
        "series": None,
        "reps_min": None,
        "reps_max": None,
        "rir": [],
        "consigne": "",
        "muscle": "",
        "repos_s": None,
    }
    consignes = []
    repos_de_repli = None
    for ligne in lignes_b:
        series = MOTIF_SERIES.search(ligne)
        repos = secondes_de_repos(ligne)
        if series:
            # "3 X 15-20 RIR 1'00" (FACE PULL) porte les deux : la prescription
            # l'emporte, le temps n'est retenu que si aucune autre ligne n'en donne.
            fiche["prescription"] = ligne
            fiche["series"] = int(series.group(1).split("-")[-1])
            fiche["reps_min"] = int(series.group(2))
            fiche["reps_max"] = int(series.group(3) or series.group(2))
            fiche["rir"] = fiche["rir"] or rir_cible(ligne)
            if repos is not None:
                repos_de_repli = repos
        elif repos is not None:
            fiche["repos_s"] = repos
            muscle = MOTIF_REPOS.sub(" ", ligne)
            muscle = MOTIF_REPOS_MOT.sub(" ", muscle)
            fiche["muscle"] = net(muscle).strip(" -").capitalize()
        elif ligne.upper().startswith("RIR"):
            fiche["rir"] = rir_cible(ligne)
        else:
            consignes.append(ligne)
    if fiche["repos_s"] is None:
        fiche["repos_s"] = repos_de_repli
    fiche["consigne"] = " ".join(consignes)
    return fiche


def series_de_la_seance(bloc, groupe):
    """Releve les series reellement effectuees dans un groupe de colonnes."""
    base = PREMIERE_COLONNE_SEANCE + groupe * LARGEUR_GROUPE
    series = []
    for ligne in bloc:
        note = net(ligne[base])
        charge = nombre(ligne[base + 1])
        reps = nombre(ligne[base + 2])
        rir = nombre(ligne[base + 3])
        if charge is None and reps is None:
            continue
        series.append({
            "note": note,
            "charge": charge,
            "reps": reps,
            "rir": rir,
            # L'echauffement ne compte pas dans la surcharge progressive.
            "echauffement": bool(re.match(r"^ECH\b", note, re.IGNORECASE)),
        })
    return series


def total_de_la_seance(bloc, groupe):
    colonne = PREMIERE_COLONNE_SEANCE + groupe * LARGEUR_GROUPE + 4
    for ligne in bloc:
        valeur = nombre(ligne[colonne])
        if valeur:
            return valeur
    return 0


def decouper_en_jours(grille):
    jours = []
    courant = None
    for index, ligne in enumerate(grille):
        titre = net(ligne[0])
        trouve = MOTIF_JOUR.match(titre)
        if trouve:
            courant = {"code": trouve.group(1), "titre": titre, "entete": index, "lignes": []}
            jours.append(courant)
        elif courant is not None:
            courant["lignes"].append((index, ligne))
    return jours


def dates_des_seances(ligne_entete):
    return [
        net(ligne_entete[PREMIERE_COLONNE_SEANCE + groupe * LARGEUR_GROUPE])
        for groupe in range(NB_SEANCES)
    ]


def exercices_du_jour(lignes):
    """Un exercice commence des que la colonne A porte un numero."""
    blocs = []
    courant = None
    for _, ligne in lignes:
        marque = net(ligne[0])
        if marque.isdigit():
            courant = {"numero": int(marque), "lignes": [ligne]}
            blocs.append(courant)
        elif courant is not None:
            courant["lignes"].append(ligne)
    return blocs


def convertir(grille):
    jours = []
    for jour in decouper_en_jours(grille):
        entete = grille[jour["entete"]]
        blocs = exercices_du_jour(jour["lignes"])
        if not blocs:
            # J2 et J6 sont des footings : ni exercice numerote ni charge.
            jours.append({
                "code": jour["code"],
                "titre": jour["titre"],
                "type": "footing",
                "exercices": [],
            })
            continue

        dates = dates_des_seances(entete)
        exercices = []
        for bloc in blocs:
            lignes = bloc["lignes"]
            textes_b = [net(l[1]) for l in lignes if net(l[1])]
            if not textes_b:
                continue
            nom, reste = textes_b[0], textes_b[1:]
            fiche = classer_consignes(reste)
            historique = []
            for groupe in range(NB_SEANCES):
                series = series_de_la_seance(lignes, groupe)
                if not series:
                    continue
                historique.append({
                    "seance": groupe,
                    "date": dates[groupe] if MOTIF_DATE.match(dates[groupe]) else "",
                    "deload": dates[groupe].upper() == "DELOAD",
                    "total": total_de_la_seance(lignes, groupe),
                    "series": series,
                })
            exercice = {"numero": bloc["numero"], "nom": nom}
            exercice.update(fiche)
            exercice["historique"] = historique
            exercices.append(exercice)

        jours.append({
            "code": jour["code"],
            "titre": jour["titre"],
            "type": "muscu",
            "dates": dates,
            "exercices": exercices,
        })
    return jours


def main():
    if len(sys.argv) > 1:
        texte = Path(sys.argv[1]).read_text(encoding="utf-8")
        origine = sys.argv[1]
    else:
        texte = telecharger()
        origine = "classeur " + CLASSEUR_ID + ", onglet " + str(GID_PROGRAMME)

    jours = convertir(lire_grille(texte))
    programme = {
        "origine": origine,
        "importe_le": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "jours": jours,
    }
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(programme, ensure_ascii=False, indent=1), encoding="utf-8")

    # Le perimetre s'affiche : un zero doit se voir.
    print("Ecrit " + str(SORTIE.relative_to(RACINE)))
    for jour in jours:
        if jour["type"] == "footing":
            print("  " + jour["code"].ljust(3) + " footing")
            continue
        seances = {h["seance"] for e in jour["exercices"] for h in e["historique"]}
        muets = [e["nom"] for e in jour["exercices"] if e["repos_s"] is None]
        ligne = (
            "  " + jour["code"].ljust(3) + " " + str(len(jour["exercices"])) +
            " exercices, " + str(len(seances)) + " seance(s) remplie(s)"
        )
        if muets:
            ligne += ", " + str(len(muets)) + " sans temps de repos"
        print(ligne)


if __name__ == "__main__":
    main()
