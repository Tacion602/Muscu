"""Programme de la version 2 : un onglet plat, lu par colonnes nommees.

Le classeur de la v2 (nouveau classeur, decide le 4 novembre 2026) porte un
onglet « Programme » ou chaque ligne est un exercice, avec des colonnes
nommees. Plus de grille dessinee pour l'oeil ni de reconnaissance de forme :
l'en-tete dit ou est chaque information, et l'ordre des colonnes est libre.

Colonnes attendues (casse et accents indifferents) :

    Jour        code du jour tel qu'il identifie les seances (J1, J3...)
    Rang        position dans la semaine affichee (1 = premier jour)
    Nom         nom du jour (Push, Pull, Jambes, Haut max, Cardio, Gainage)
    Type        muscu, cardio ou gainage
    Numero      ordre de l'exercice dans le jour
    Exercice    nom exact de l'exercice : c'est son identite, voir CLAUDE.md
    Series      nombre de series de travail
    Reps min    bas de la fourchette de repetitions
    Reps max    haut de la fourchette
    RIR         cible par serie, « 2 / 2 / 1 / 1 » ou un seul chiffre
    Repos       temps de repos en secondes, ou « 2'30 »
    Muscle      muscle principal
    Consigne    consigne technique
    Reglages    reglages de machine (siege, dossier...), facultatif
    Substituts  exercices de remplacement, separes par « ; », facultatif

Un jour de cardio ou de gainage n'a qu'une ligne, sans exercice. Les colonnes
Reglages et Substituts peuvent manquer.

Usage :
    python outils/importer_programme_v2.py                     # telecharge l'onglet Programme
    python outils/importer_programme_v2.py Programme.csv       # depuis un export CSV
    python outils/importer_programme_v2.py --depuis-v1         # convertit data/programme.json (v1)
    python outils/importer_programme_v2.py --depuis-v1 --csv Programme.csv
        ecrit aussi le CSV a coller dans l'onglet Programme du nouveau classeur

Sortie : v2/data/programme.json, jamais edite a la main.
"""

import csv
import io
import json
import re
import sys
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "v2" / "data" / "programme.json"
PROGRAMME_V1 = RACINE / "data" / "programme.json"

# A renseigner une fois le nouveau classeur cree : identifiant du classeur et
# gid de l'onglet « Programme ». Tant qu'ils sont vides, seul l'import depuis
# un fichier CSV ou depuis la v1 est possible.
CLASSEUR_ID = "1JOiH7LYXLtosQnnyMYLMjrBFK_CDkeKN98sKSwJM7DI"
GID_PROGRAMME = "1897993877"

COLONNES = [
    "Jour", "Rang", "Nom", "Type", "Numero", "Exercice", "Series",
    "Reps min", "Reps max", "RIR", "Repos", "Muscle", "Consigne",
    "Reglages", "Substituts",
]

# Ordre de la semaine decide le 26 septembre 2026 (voir CLAUDE.md) : Haut
# max, Cardio, Pull, Jambes, Push, Cardio. Sert a la conversion depuis la v1,
# ou cet ordre vivait dans le code de l'application.
RANGS_V1 = {"J5": 1, "J2": 2, "J3": 3, "J4": 4, "J1": 5, "J6": 6}
NOMS_V1 = {"J1": "Push", "J2": "Cardio", "J3": "Pull", "J4": "Jambes",
           "J5": "Haut max", "J6": "Cardio"}


def cle(texte):
    """Forme normalisee d'un en-tete : sans accent, minuscule, espaces simples."""
    texte = unicodedata.normalize("NFKD", texte or "")
    texte = "".join(c for c in texte if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texte.strip().lower())


def net(valeur):
    return re.sub(r"\s+", " ", (valeur or "").strip())


def entier(valeur):
    valeur = net(valeur)
    if not valeur:
        return None
    try:
        return int(float(valeur.replace(",", ".")))
    except ValueError:
        raise SystemExit("Nombre illisible : " + repr(valeur))


def secondes(valeur):
    """« 150 », « 2'30 », « 2'00 » ou « 1'15 » : en secondes."""
    valeur = net(valeur)
    if not valeur:
        return None
    trouve = re.fullmatch(r"(\d+)\s*'\s*(\d{1,2})?\"?", valeur)
    if trouve:
        return int(trouve.group(1)) * 60 + int(trouve.group(2) or 0)
    return entier(valeur)


def rir_liste(valeur, series):
    """« 2 / 2 / 1 / 1 » ou « 2 » : une cible par serie."""
    chiffres = [int(c) for c in re.findall(r"\d+", valeur or "")]
    if not chiffres:
        return []
    if len(chiffres) == 1:
        return chiffres * (series or 1)
    return chiffres


def telecharger():
    if not CLASSEUR_ID or not GID_PROGRAMME:
        raise SystemExit(
            "CLASSEUR_ID et GID_PROGRAMME sont vides dans ce script : renseignez-les "
            "une fois le nouveau classeur cree, ou passez un export CSV en argument.")
    url = ("https://docs.google.com/spreadsheets/d/" + CLASSEUR_ID +
           "/export?format=csv&gid=" + str(GID_PROGRAMME))
    requete = urllib.request.Request(url, headers={"User-Agent": "suivi-muscu/2.0"})
    with urllib.request.urlopen(requete, timeout=30) as reponse:
        return reponse.read().decode("utf-8")


def lire_csv(texte):
    lignes = list(csv.reader(io.StringIO(texte)))
    if not lignes:
        raise SystemExit("Onglet vide.")
    entetes = [cle(e) for e in lignes[0]]
    manquantes = [c for c in COLONNES[:13] if cle(c) not in entetes]
    if manquantes:
        raise SystemExit("Colonnes absentes de l'onglet Programme : " + ", ".join(manquantes))
    rangs = []
    for ligne in lignes[1:]:
        if not any(net(v) for v in ligne):
            continue
        rang = {}
        for i, e in enumerate(entetes):
            rang[e] = ligne[i] if i < len(ligne) else ""
        rangs.append(rang)
    return rangs


def convertir(rangs, origine):
    jours = {}
    for r in rangs:
        code = net(r.get("jour", "")).upper()
        if not re.fullmatch(r"J\d", code):
            raise SystemExit("Code de jour invalide : " + repr(code))
        jour = jours.setdefault(code, {
            "code": code,
            "rang": entier(r.get("rang")) or 99,
            "nom": net(r.get("nom")) or code,
            "type": cle(r.get("type")) or "muscu",
            "exercices": [],
        })
        nom = net(r.get("exercice"))
        if not nom:
            continue
        series = entier(r.get("series"))
        exo = {
            "numero": entier(r.get("numero")) or len(jour["exercices"]) + 1,
            "nom": nom,
            "series": series,
            "reps_min": entier(r.get("reps min")),
            "reps_max": entier(r.get("reps max")),
            "rir": rir_liste(r.get("rir"), series),
            "repos_s": secondes(r.get("repos")),
            "muscle": net(r.get("muscle")),
            "consigne": net(r.get("consigne")),
            "reglages": net(r.get("reglages", "")),
            "substituts": [net(s) for s in (r.get("substituts") or "").split(";") if net(s)],
        }
        jour["exercices"].append(exo)
    for jour in jours.values():
        jour["exercices"].sort(key=lambda e: e["numero"])
        if jour["type"] == "footing":
            jour["type"] = "cardio"
    liste = sorted(jours.values(), key=lambda j: (j["rang"], j["code"]))
    verifier(liste)
    return {
        "version": 2,
        "origine": origine,
        "importe_le": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "jours": liste,
    }


def verifier(jours):
    """Les controles que la v1 confiait a verifier_import.py et qui gardent
    leur sens ici : noms proches mais differents, prescriptions incompletes."""
    noms = {}
    for j in jours:
        if j["type"] == "muscu" and not j["exercices"]:
            raise SystemExit("Le jour " + j["code"] + " est de type muscu sans exercice.")
        for e in j["exercices"]:
            for champ in ("series", "reps_min", "reps_max", "repos_s"):
                if e[champ] is None:
                    raise SystemExit(j["code"] + " / " + e["nom"] + " : " + champ + " manquant.")
            if e["reps_min"] > e["reps_max"]:
                raise SystemExit(j["code"] + " / " + e["nom"] + " : reps min > reps max.")
            if len(e["rir"]) not in (0, e["series"]):
                raise SystemExit(j["code"] + " / " + e["nom"] + " : " + str(len(e["rir"])) +
                                 " cibles RIR pour " + str(e["series"]) + " series.")
            forme = cle(e["nom"])
            if forme in noms and noms[forme] != e["nom"]:
                raise SystemExit("Deux noms proches mais differents, qui feraient deux "
                                 "historiques : " + repr(noms[forme]) + " et " + repr(e["nom"]))
            noms[forme] = e["nom"]


def rangs_depuis_v1(programme_v1):
    """Convertit data/programme.json (v1) en lignes de l'onglet Programme."""
    rangs = []
    for j in programme_v1["jours"]:
        code = j["code"]
        base = {
            "jour": code, "rang": str(RANGS_V1.get(code, 99)),
            "nom": NOMS_V1.get(code, code),
            "type": "cardio" if j["type"] == "footing" else j["type"],
        }
        if not j.get("exercices"):
            rangs.append(dict(base, exercice=""))
            continue
        for e in j["exercices"]:
            rangs.append(dict(base, **{
                "numero": str(e["numero"]), "exercice": e["nom"],
                "series": str(e["series"]), "reps min": str(e["reps_min"]),
                "reps max": str(e["reps_max"]),
                "rir": " / ".join(str(r) for r in (e.get("rir") or [])),
                "repos": str(e["repos_s"]), "muscle": e.get("muscle", ""),
                "consigne": e.get("consigne", ""), "reglages": "", "substituts": "",
            }))
    return rangs


def ecrire_csv(rangs, chemin):
    with open(chemin, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(COLONNES)
        for r in rangs:
            w.writerow([r.get(cle(c), "") for c in COLONNES])


def main(argv):
    csv_sortie = None
    if "--csv" in argv:
        i = argv.index("--csv")
        csv_sortie = Path(argv[i + 1])
        del argv[i:i + 2]
    if "--depuis-v1" in argv:
        argv.remove("--depuis-v1")
        source = Path(argv[0]) if argv else PROGRAMME_V1
        rangs = rangs_depuis_v1(json.loads(source.read_text(encoding="utf-8")))
        origine = "converti depuis " + str(source.relative_to(RACINE))
    elif argv:
        rangs = lire_csv(Path(argv[0]).read_text(encoding="utf-8"))
        origine = "fichier " + argv[0]
    else:
        rangs = lire_csv(telecharger())
        origine = "classeur " + CLASSEUR_ID + ", onglet " + str(GID_PROGRAMME)
    programme = convertir(rangs, origine)
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(programme, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if csv_sortie:
        ecrire_csv(rangs, csv_sortie)
        print("CSV ecrit :", csv_sortie)
    nb = sum(len(j["exercices"]) for j in programme["jours"])
    print("Programme v2 ecrit :", SORTIE.relative_to(RACINE), "(", len(programme["jours"]),
          "jours,", nb, "exercices )")


if __name__ == "__main__":
    main(sys.argv[1:])
