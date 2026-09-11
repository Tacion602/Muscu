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
    assert codes == ["J1", "J2", "J3", "J4", "J5", "J6", "G"], "accueil incomplet : " + str(codes)
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


def test_les_footings_n_ont_plus_que_le_farmer_walk(page):
    """11 septembre 2026 : le gainage des footings rejoint la seance de
    gainage, la rotation externe est abandonnee, le farmer walk reste."""
    ouvrir_jour(page, "J2")
    texte = page.text_content("#bloc-footing")
    assert "Planche frontale" not in texte and "Rotation externe" not in texte
    assert "Farmer walk" in page.text_content("#footing-farmer")


def test_revenir_de_l_ecran_de_fin_sur_un_footing(page):
    """Defaut ancien, corrige le 11 septembre 2026 : le retour depuis l'ecran
    de fin rappelait l'affichage de musculation, qui plantait sur un footing.
    L'exception est controlee par la fixture."""
    ouvrir_jour(page, "J2")
    page.click("#bouton-terminer")
    page.click("#bouton-fin-retour")
    assert page.is_visible("#bloc-footing")


# --------------------------------------------------------- seance gainage


def ouvrir_gainage(page):
    page.locator(".carte-jour").nth(6).click()


def carte_gainage(page, rang):
    return page.locator("#gainage-categories .gainage-exo").nth(rang)


def test_la_seance_de_gainage_propose_quatre_categories(page):
    """Recapitulatif du 11 septembre 2026 : quatre categories, un mouvement
    au choix, le premier par defaut faute d'historique, et la legende de
    l'interference avec la course."""
    ouvrir_gainage(page)
    assert page.locator("#gainage-categories .gainage-exo").count() == 4
    choisis = page.locator("#gainage-categories .type-course.choisi").all_text_contents()
    assert choisis == ["Dead bug", "Pallof press", "Planche latérale", "Crunch inversé"]
    assert "Interférence avec les muscles de la course" in page.text_content("#bloc-gainage")


def test_le_mouvement_par_defaut_est_celui_de_la_derniere_seance(page):
    """Pas d'alternance automatique : chaque categorie reprend le mouvement
    de la seance precedente, et montre ses dernieres valeurs."""
    precedente = {
        "id": "G1", "jour": "G", "titre": "Gainage", "type": "gainage",
        "fin": "2026-09-05T18:00:00.000Z", "envoye": True,
        "choix": {"anti_extension": "planche", "anti_rotation": "bird_dog",
                  "anti_lateroflexion": "farmer_walk", "flexion_chargee": "releve_genoux"},
        "mouvements": {"planche": [40, 35, 30]},
    }
    page.evaluate("h => localStorage.setItem('muscu.historique', JSON.stringify(h))", [precedente])
    ouvrir_gainage(page)
    choisis = page.locator("#gainage-categories .type-course.choisi").all_text_contents()
    assert choisis == ["Planche", "Bird dog", "Farmer walk une main", "Relevé de genoux suspendu"]
    assert "Dernière fois : 40 s" in carte_gainage(page, 0).text_content()


def test_une_tenue_se_chronometre_et_s_interrompt(page):
    """Minuteur de 45 s en mode chrono, interruptible : on note le temps
    reellement tenu, puis le repos demarre."""
    ouvrir_gainage(page)
    carte = carte_gainage(page, 0)
    carte.locator(".type-course", has_text="Planche").click()
    carte_gainage(page, 0).locator(".gainage-demarrer").first.click()
    page.wait_for_timeout(1500)
    assert "Tenue" in page.text_content("#gainage-chrono")
    page.click("#gainage-chrono")
    tenu = page.evaluate("seance.mouvements.planche[0]")
    assert 1 <= tenu <= 3
    assert "Repos" in page.text_content("#gainage-chrono")


def test_le_farmer_walk_partage_son_historique_avec_le_footing(page):
    """Decision du 11 septembre 2026 : un seul historique pour le farmer
    walk, qu'il ait ete fait en footing ou en seance de gainage."""
    footing = {
        "id": "F1", "jour": "J2", "titre": "J2 & J6 FOOTING", "type": "footing",
        "fin": "2026-09-05T18:00:00.000Z", "envoye": True, "footing": {},
        "mouvements": {"farmer_walk": [{"poids": 20, "distance": 25, "vitesse": 4.5}, None, None]},
    }
    page.evaluate("h => localStorage.setItem('muscu.historique', JSON.stringify(h))", [footing])
    ouvrir_gainage(page)
    carte_gainage(page, 2).locator(".type-course", has_text="Farmer walk").click()
    carte = carte_gainage(page, 2)
    assert "Dernière fois : 20 kg, 25 m, 4.5 km/h" in carte.text_content()
    assert carte.locator("input[data-champ='poids']").first.get_attribute("placeholder") == "20"


def test_la_seance_de_gainage_s_enregistre_et_se_relit(page):
    """La seance part avec ses lignes a plat pour le classeur, et se relit
    dans l'historique."""
    ouvrir_gainage(page)
    champ = carte_gainage(page, 0).locator(".gainage-serie input").first
    champ.fill("7")
    champ.press("Tab")
    page.click("#bouton-terminer")
    assert "Anti-extension · Dead bug" in page.text_content("#fin-resume")
    assert "7 rép." in page.text_content("#fin-resume")
    page.click("#bouton-enregistrer")
    page.wait_for_selector("#ecran-historique.actif", timeout=8000)
    assert "Dead bug" in page.text_content("#liste-historique")
    enregistree = page.evaluate("JSON.parse(localStorage.getItem('muscu.historique')).pop()")
    assert enregistree["lignesGainage"] == [{
        "categorie": "Anti-extension", "mouvement": "Dead bug", "serie": 1, "valeur": 7,
        "unite": "reps", "poids": None, "distance": None, "vitesse": None,
    }]


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


def test_une_tenue_tapee_a_la_main_lance_le_repos(page):
    """Trouve le 12 septembre 2026 par une boucle de controle : le repos
    partait apres des repetitions confirmees, pas apres une tenue tapee au
    clavier. Or on tape une tenue chaque fois qu'on a chronometre au mur, ou
    qu'on corrige apres coup."""
    ouvrir_gainage(page)
    carte_gainage(page, 0).locator(".type-course", has_text="Planche").click()
    champ = carte_gainage(page, 0).locator(".gainage-serie input").first
    champ.fill("30")
    champ.press("Tab")
    assert page.eval_on_selector("#gainage-chrono", "e => !e.hidden")
    assert "Repos" in page.text_content("#gainage-chrono")
    assert page.evaluate("seance.mouvements.planche[0]") == 30


def test_les_titres_de_colonnes_sont_alignes_sur_les_champs(page):
    """Trouve le 12 septembre 2026 : les titres et les lignes de series sont
    deux grilles distinctes, et la colonne de la croix de suppression, laissee
    en `auto`, se reduisait a zero dans la premiere. Les titres derivaient
    vers la droite, jusqu'a 26 pixels mesures sur RIR."""
    ouvrir_jour(page, "J1")
    ecarts = page.evaluate("""() => {
      const titres = document.querySelectorAll('.tableau-titres span');
      const champs = document.querySelectorAll('.ligne-serie input');
      const centre = (e) => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; };
      return [0, 1, 2].map(i => Math.abs(centre(titres[i]) - centre(champs[i])));
    }""")
    assert max(ecarts) <= 2, "titres decales de " + str(ecarts) + " pixels"


def test_le_code_et_sa_documentation_restent_accordes():
    """Controles statiques de outils/verifier_code.py, joues ici pour qu'un
    seul `pytest tests/` couvre tout : identifiants du DOM, noms de code cites
    par CLAUDE.md, invariants de la seance de gainage. Chacun porte son temoin,
    et l'outil se declare inexecutable si le temoin n'est pas detecte."""
    import sys
    sys.path.insert(0, str(RACINE / "outils"))
    import verifier_code

    controles = verifier_code.verifier(avec_navigateur=False)
    assert controles, "aucun controle n'a tourne"
    for controle in controles:
        assert controle.etat == "REUSSI", (
            controle.nom + " : " + controle.etat + " ; " + " ; ".join(controle.alertes))
