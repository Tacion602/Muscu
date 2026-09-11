"""Tests de l'application dans un vrai navigateur, pilote par Playwright.

Chaque test correspond a un defaut reellement rencontre ou a une decision
arretee avec l'utilisateur : le fichier sert de memoire executable. C'est le
vrai code qui tourne, servi par un serveur local, sur le vrai
data/programme.json, avec de vrais clics et de vraies saisies.

Temoin structurel : chaque test commence par verifier que l'accueil affiche
les six jours, et echoue sur toute exception JavaScript non rattrapee. Un test
ne peut donc pas passer sur une application qui n'a pas demarre.

Les tests ne supposent aucun nom d'exercice : ceux-ci viennent du classeur
et changent quand l'utilisateur le modifie.

Lancement : pytest tests/
Prealable, une fois : python -m playwright install chromium
"""

import functools
import http.server
import threading
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parent.parent


class ServeurMuet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="session")
def adresse():
    gestionnaire = functools.partial(ServeurMuet, directory=str(RACINE))
    serveur = http.server.ThreadingHTTPServer(("127.0.0.1", 0), gestionnaire)
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    yield "http://127.0.0.1:" + str(serveur.server_address[1]) + "/"
    serveur.shutdown()


@pytest.fixture(scope="session")
def navigateur():
    with sync_playwright() as p:
        chromium = p.chromium.launch()
        yield chromium
        chromium.close()


@pytest.fixture
def page(navigateur, adresse):
    # Un contexte neuf par test : stockage local vide, aucune seance
    # heritee du test precedent.
    contexte = navigateur.new_context(viewport={"width": 390, "height": 844})
    onglet = contexte.new_page()
    erreurs = []
    onglet.on("pageerror", lambda erreur: erreurs.append(str(erreur)))
    onglet.goto(adresse)
    onglet.wait_for_selector(".carte-jour")
    codes = onglet.eval_on_selector_all(
        ".carte-code", "cartes => cartes.map(c => c.textContent.trim().slice(0, 2))")
    assert codes == ["J1", "J2", "J3", "J4", "J5", "J6"], "accueil incomplet : " + str(codes)
    yield onglet
    contexte.close()
    assert not erreurs, "exception JavaScript : " + " ; ".join(erreurs)


def ouvrir_jour(page, code):
    page.locator(".carte-jour").nth(int(code[1]) - 1).click()


def saisir_serie(page, rang, charge, reps, confirmer=True):
    champs = page.locator(".ligne-serie").nth(rang).locator("input")
    champs.nth(0).fill(str(charge))
    champs.nth(1).fill(str(reps))
    if confirmer:
        champs.nth(1).press("Enter")


def nombre_de_series(page):
    return page.locator(".ligne-serie").count()


# ------------------------------------------------------------ navigation


def test_la_derniere_serie_fait_passer_a_l_exercice_suivant(page):
    """Decision du 27 aout 2026 : pas d'attente de la fin du repos."""
    ouvrir_jour(page, "J1")
    for rang in range(nombre_de_series(page)):
        saisir_serie(page, rang, 50, 10)
    assert page.evaluate("indexExo") == 1


def test_un_appui_sur_la_fleche_n_avance_que_d_un_exercice(page):
    """Defaut du 10 septembre 2026. La derniere serie saisie mais non
    confirmee etait validee par la sortie du champ, qui faisait deja changer
    d'exercice ; le clic en ajoutait un second. Un appui sautait deux
    exercices."""
    ouvrir_jour(page, "J1")
    n = nombre_de_series(page)
    for rang in range(n - 1):
        saisir_serie(page, rang, 50, 10)
    saisir_serie(page, n - 1, 50, 8, confirmer=False)
    page.click("#bouton-suivant")
    assert page.evaluate("seance.exercices[0].series.every(s => s.faite)"), \
        "la sortie du champ aurait du valider la derniere serie"
    assert page.evaluate("indexExo") == 1


def test_la_fleche_arriere_recule_meme_apres_une_validation_implicite(page):
    """Meme defaut, dans l'autre sens : la validation avancait de un, le clic
    reculait de un, et l'appui semblait sans effet."""
    ouvrir_jour(page, "J1")
    page.click("#bouton-suivant")
    n = nombre_de_series(page)
    for rang in range(n - 1):
        saisir_serie(page, rang, 50, 10)
    saisir_serie(page, n - 1, 50, 8, confirmer=False)
    page.click("#bouton-precedent")
    assert page.evaluate("indexExo") == 0


# -------------------------------------------------------------- consignes


def test_la_consigne_survit_au_changement_d_exercice(page):
    """Defaut du 10 septembre 2026 : la consigne n'etait ecrite que sur appui
    d'Enregistrer, et changer d'exercice jetait le texte sans rien dire.
    L'utilisateur y a perdu toutes ses notes de J4."""
    ouvrir_jour(page, "J4")
    nom = page.text_content("#exo-nom")
    page.click("#bouton-consigne-modifier")
    page.fill("#exo-consigne-champ", "Position 21")
    page.click("#bouton-suivant")
    page.click("#bouton-precedent")
    assert page.text_content("#exo-consigne") == "Position 21"
    stockees = page.evaluate("JSON.parse(localStorage.getItem('muscu.consignes'))")
    assert stockees["J4|" + nom] == "Position 21"


def test_annuler_la_consigne_revient_a_la_valeur_d_avant(page):
    """Enregistree a la frappe, la consigne ne peut plus etre defaite qu'en
    reecrivant la valeur retenue a l'ouverture de l'editeur."""
    ouvrir_jour(page, "J4")
    page.click("#bouton-consigne-modifier")
    page.fill("#exo-consigne-champ", "Premiere version")
    page.click("#bouton-consigne-enregistrer")
    page.click("#bouton-consigne-modifier")
    page.fill("#exo-consigne-champ", "Texte a annuler")
    page.click("#bouton-consigne-annuler")
    assert page.text_content("#exo-consigne") == "Premiere version"


# ---------------------------------------------------------------- footing


def test_l_historique_footing_liste_chaque_passage(page):
    """Defaut du 8 septembre 2026 : le passage aux passages multiples avait
    casse le resume des footings, qui affichait 'Sortie sans chiffres'."""
    ouvrir_jour(page, "J2")
    page.locator(".type-course").nth(2).click()
    premier = page.locator(".cycle-course").nth(0).locator("input")
    premier.nth(0).fill("20")
    premier.nth(1).fill("2")
    page.click("#bouton-cycle-ajouter")
    second = page.locator(".cycle-course").nth(1).locator("input")
    second.nth(0).fill("15")
    second.nth(1).fill("1.5")
    page.click("#bouton-terminer")
    page.click("#bouton-enregistrer")
    page.wait_for_selector("#ecran-historique.actif", timeout=8000)
    texte = page.text_content("#liste-historique")
    assert "20 min, 2 km" in texte and "15 min, 1.5 km" in texte
    assert "Sortie sans chiffres" not in texte


def test_j2_et_j6_sont_deux_seances_distinctes(page):
    """J6 est engendre depuis le bloc 'J2 & J6 FOOTING' du classeur : meme
    definition, mais chaque jour garde ses propres chiffres."""
    ouvrir_jour(page, "J6")
    assert page.text_content("#seance-jour").startswith("J6")
    page.locator(".cycle-course input").nth(0).fill("30")
    page.click("#bouton-quitter")
    ouvrir_jour(page, "J2")
    assert page.text_content("#seance-jour").startswith("J2")
    assert page.locator(".cycle-course input").nth(0).input_value() == ""


def test_la_rotation_externe_se_compte_en_repetitions(page):
    """Seul exercice du gainage de footing compte en repetitions, depuis le
    10 septembre 2026 ; les autres restent en secondes."""
    ouvrir_jour(page, "J2")
    etiquettes = page.locator(".gainage-nom").all_text_contents()
    assert any("Rotation externe" in t and t.endswith("reps") for t in etiquettes)
    assert any("Planche frontale" in t and t.endswith(" s") for t in etiquettes)


# ---------------------------------------------------------- fin de seance


def test_remarque_et_blessure_partent_avec_la_seance(page):
    """La remarque et la blessure sont enregistrees avec la seance. Apres
    l'envoi, on atterrit sur la fiche de la seance, ou la blessure se relit
    mais pas la remarque (decision du 10 septembre 2026)."""
    ouvrir_jour(page, "J1")
    saisir_serie(page, 0, 45, 10)
    page.click("#bouton-terminer")
    page.fill("#fin-remarque", "Remarque de test")
    page.fill("#fin-blessure-serie", "Dips")
    page.fill("#fin-blessure-texte", "Epaule sensible")
    page.click("#bouton-enregistrer")
    page.wait_for_selector("#ecran-historique.actif", timeout=8000)
    assert page.evaluate("document.querySelector('.entree-historique').open") is True
    texte = page.text_content("#liste-historique")
    assert "Epaule sensible" in texte
    assert "Remarque de test" not in texte
    enregistree = page.evaluate("JSON.parse(localStorage.getItem('muscu.historique')).pop()")
    assert enregistree["remarque"] == "Remarque de test"
    assert enregistree["blessure"] == {"serie": "Dips", "texte": "Epaule sensible"}


def test_la_courbe_suit_la_premiere_serie_et_non_le_tonnage(page):
    """Indicateur retenu le 11 septembre 2026 : charge x reps de la premiere
    serie de travail. Le tonnage est ecarte, parce qu'il monte quand la charge
    baisse et que les repetitions montent. Ici le tonnage progresse d'une
    seance a l'autre (1000 puis 1440) alors que la premiere serie recule
    (500 puis 480) : la courbe doit annoncer une baisse."""
    nom = page.evaluate("programme.jours[0].exercices[0].nom")

    def seance(identifiant, fin, series):
        return {"id": identifiant, "jour": "J1", "titre": "J1", "type": "muscu",
                "fin": fin, "envoye": True,
                "exercices": [{"nom": nom, "series": [
                    {"charge": c, "reps": r, "faite": True} for c, r in series]}]}

    historique = [
        seance("A", "2026-09-01T18:00:00.000Z", [(50, 10), (50, 10)]),
        seance("B", "2026-09-08T18:00:00.000Z", [(40, 12), (40, 12), (40, 12)]),
    ]
    page.evaluate("h => localStorage.setItem('muscu.historique', JSON.stringify(h))", historique)
    page.click("#bouton-historique")
    page.locator(".entree-historique summary").first.click()
    legende = page.locator(".courbe-legende").first
    assert "Indicateur de séance" in legende.text_content()
    assert "40 × 12 = 480" in legende.text_content()
    assert "-20" in legende.text_content()
    assert "baisse" in legende.locator(".compare").get_attribute("class")


def test_quitter_une_seance_arrete_le_chronometre(page):
    """Defaut du 10 septembre 2026 : quitter laissait le battement du
    chronometre tourner sur une seance nulle, une exception par seconde.
    L'absence d'exception est controlee par la fixture."""
    ouvrir_jour(page, "J4")
    assert page.evaluate("tictacSeance") is not None
    page.click("#bouton-quitter")
    page.wait_for_timeout(2500)
    assert page.evaluate("tictacSeance") is None
