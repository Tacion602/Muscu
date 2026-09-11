"""Compare le programme qui vient d'etre importe au dernier programme publie.

Ne le 10 septembre 2026 de trois incidents reels, tous causes par une
modification du classeur et tous passes inapercus a l'import :

- J1 : noms d'exercices deplaces sans leurs chiffres, chaque exercice heritant
  de l'historique d'un autre ;
- J3 : historique d'une seance efface d'un coup ;
- J6 : jour disparu, son bloc ayant ete fondu dans celui de J2.

Deux niveaux :
- ALERTE : a comprendre avant de publier, l'outil sort en erreur ;
- info : changement souvent voulu, affiche pour memoire.

Le compte rendu donne toujours le perimetre compare : un zero doit se voir.

Un temoin passe avant chaque verification : un echange d'historique fabrique
pour l'occasion doit etre detecte, sans quoi l'outil se declare inexecutable
plutot que de laisser croire a une comparaison propre.

Usage :
    python outils/verifier_import.py
Lance aussi automatiquement a la fin de importer_classeur.py.
"""

import json
import subprocess
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
FICHIER = RACINE / "data" / "programme.json"


def signature(exercice):
    """Empreinte de l'historique : charge et reps de chaque serie, seance par seance."""
    return tuple(
        (h.get("seance"), tuple((s.get("charge"), s.get("reps")) for s in h.get("series", [])))
        for h in exercice.get("historique", [])
    )


def comparer(ancien, neuf):
    constats = []
    a = {j["code"]: j for j in ancien.get("jours", [])}
    n = {j["code"]: j for j in neuf.get("jours", [])}

    for code in sorted(set(a) - set(n)):
        constats.append(("ALERTE", code + " a disparu du programme."))
    for code in sorted(set(n) - set(a)):
        constats.append(("info", code + " apparait."))

    for code in sorted(set(a) & set(n)):
        ea = {e["nom"]: e for e in a[code].get("exercices", [])}
        en = {e["nom"]: e for e in n[code].get("exercices", [])}

        # Un exercice qui porte aujourd'hui l'historique qu'un autre portait
        # hier : c'est la trace d'un nom deplace sans ses chiffres.
        anciennes = {signature(e): nom for nom, e in ea.items() if signature(e)}
        deplaces = set()
        for nom, e in en.items():
            origine = anciennes.get(signature(e))
            if signature(e) and origine and origine != nom:
                deplaces.add(nom)
                constats.append(("ALERTE", code + " : " + nom
                                 + " porte maintenant l'historique de " + origine + "."))

        for nom in sorted(set(ea) - set(en)):
            if signature(ea[nom]):
                constats.append(("ALERTE", code + " : " + nom
                                 + " n'existe plus, et il avait un historique (renomme ?)."))
            else:
                constats.append(("info", code + " : " + nom + " n'existe plus."))
        for nom in sorted(set(en) - set(ea)):
            if nom not in deplaces:
                constats.append(("info", code + " : " + nom + " apparait."))

        for nom in sorted(set(ea) & set(en)):
            ancien_exo, nouvel_exo = ea[nom], en[nom]
            if nom not in deplaces:
                sa, sn = signature(ancien_exo), signature(nouvel_exo)
                if sa and not sn:
                    constats.append(("ALERTE", code + " : " + nom + " a perdu son historique."))
                elif sa and sn and sa != sn:
                    constats.append(("ALERTE", code + " : l'historique de " + nom + " a change."))
            if ancien_exo.get("numero") != nouvel_exo.get("numero"):
                constats.append(("info", code + " : " + nom + " passe du numero "
                                 + str(ancien_exo.get("numero")) + " au numero "
                                 + str(nouvel_exo.get("numero")) + "."))
            for champ in ("series", "reps_min", "reps_max", "rir", "repos_s"):
                if ancien_exo.get(champ) != nouvel_exo.get(champ):
                    constats.append(("info", code + " : " + nom + ", " + champ + " "
                                     + str(ancien_exo.get(champ)) + " -> "
                                     + str(nouvel_exo.get(champ)) + "."))
    return constats


def plausibilite(programme):
    """Une derniere seance au nombre de series different de la prescription.

    Signal faible, d'ou le niveau info : on ajoute ou retire parfois une serie
    pour de bonnes raisons. Mais c'est lui qui avait trahi l'echange de J1 le
    9 septembre 2026, quatre series sous un exercice prescrit en trois.
    """
    constats = []
    for jour in programme.get("jours", []):
        for exo in jour.get("exercices", []):
            normales = [h for h in exo.get("historique", []) if not h.get("deload")]
            if not normales or not exo.get("series"):
                continue
            faites = [s for s in normales[-1].get("series", []) if not s.get("echauffement")]
            if len(faites) != exo["series"]:
                constats.append(("info", jour["code"] + " : " + exo["nom"]
                                 + ", derniere seance du classeur en " + str(len(faites))
                                 + " series pour " + str(exo["series"]) + " prescrites."))
    return constats


def structure(programme):
    """Deux numeros identiques dans un jour, ou un exercice sans prescription.

    Cas reel du 11 septembre 2026 : trois lignes de gainage ajoutees en J5,
    numerotees 1, 2 et 3 alors que ces numeros etaient pris. L'ordre venant
    des numeros, elles se seraient intercalees entre les premiers exercices,
    avec trois series vides et un repos par defaut.
    """
    constats = []
    for jour in programme.get("jours", []):
        vus = {}
        for exo in jour.get("exercices", []):
            vus.setdefault(exo.get("numero"), []).append(exo["nom"])
            if not exo.get("series"):
                constats.append(("ALERTE", jour["code"] + " : " + exo["nom"]
                                 + " n'a pas de prescription de series lisible."))
        for numero, noms in sorted(vus.items(), key=lambda v: str(v[0])):
            if len(noms) > 1:
                constats.append(("ALERTE", jour["code"] + " : le numero " + str(numero)
                                 + " est porte par " + str(len(noms)) + " exercices ("
                                 + ", ".join(noms) + ")."))
    return constats


def temoin():
    """Un echange d'historique fabrique doit etre signale deux fois."""
    def exo(nom, charge):
        return {"nom": nom, "numero": 1,
                "historique": [{"seance": 0, "series": [{"charge": charge, "reps": 10}]}]}
    ancien = {"jours": [{"code": "J9", "exercices": [exo("A", 10), exo("B", 50)]}]}
    neuf = {"jours": [{"code": "J9", "exercices": [exo("A", 50), exo("B", 10)]}]}
    trouves = [t for niveau, t in comparer(ancien, neuf)
               if niveau == "ALERTE" and "porte maintenant" in t]
    return len(trouves) == 2


def reference():
    """Le dernier programme publie, lu dans git. None s'il est illisible."""
    try:
        sortie = subprocess.run(["git", "show", "HEAD:data/programme.json"],
                                cwd=RACINE, capture_output=True, check=True)
        return json.loads(sortie.stdout.decode("utf-8"))
    except (OSError, subprocess.CalledProcessError, ValueError):
        return None


def verifier():
    print()
    print("Verification de l'import")
    if not temoin():
        print("  INEXECUTABLE : le temoin, un echange d'historique fabrique, n'est pas detecte.")
        return 2

    neuf = json.loads(FICHIER.read_text(encoding="utf-8"))
    constats = []
    ancien = reference()
    if ancien is None:
        print("  sans reference : aucun programme publie lisible dans git, "
              "seule la plausibilite est controlee.")
    else:
        constats += comparer(ancien, neuf)
    constats += structure(neuf)
    constats += plausibilite(neuf)

    alertes = [t for niveau, t in constats if niveau == "ALERTE"]
    infos = [t for niveau, t in constats if niveau == "info"]
    for texte in alertes:
        print("  ALERTE  " + texte)
    for texte in infos:
        print("  info    " + texte)

    jours = neuf.get("jours", [])
    print("  perimetre : " + str(len(jours)) + " jours, "
          + str(sum(len(j.get("exercices", [])) for j in jours)) + " exercices"
          + ("" if ancien is None else ", compares au programme publie")
          + " ; temoin detecte ; " + str(len(alertes)) + " alerte(s), "
          + str(len(infos)) + " info(s).")
    if alertes:
        print("  -> a comprendre avant de publier.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(verifier())
