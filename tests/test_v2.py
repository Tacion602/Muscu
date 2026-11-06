"""Tests de l'application v2 (v2/), dans un vrai Chromium pilote par
Playwright, servie par un serveur local sur le vrai v2/data/programme.json.

Memes regles que tests/test_app.py : un test par decision arretee avec
l'utilisateur ou par defaut rencontre, des saisies reelles (fill, press,
click), echec sur toute exception JavaScript non rattrapee. Les tests ne
supposent aucun nom d'exercice.

Lancement : pytest tests/test_v2.py
Prealable : python -m playwright install chromium (ou PLAYWRIGHT_BROWSERS_PATH
vers un Chromium deja installe).
"""

import functools
import http.server
import json
import threading
from pathlib import Path

import pytest

RACINE = Path(__file__).resolve().parent.parent


class ServeurMuet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="session")
def adresse():
    gestionnaire = functools.partial(ServeurMuet, directory=str(RACINE))
    serveur = http.server.ThreadingHTTPServer(("127.0.0.1", 0), gestionnaire)
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    yield "http://127.0.0.1:" + str(serveur.server_address[1]) + "/v2/index.html"
    serveur.shutdown()


@pytest.fixture
def page(navigateur, adresse):
    contexte = navigateur.new_context(viewport={"width": 390, "height": 844})
    onglet = contexte.new_page()
    erreurs = []
    onglet.on("pageerror", lambda erreur: erreurs.append(str(erreur)))
    onglet.goto(adresse)
    # Page d'envoi animee : cadence reduite, sauf dans son propre test.
    onglet.evaluate("Object.assign(DUREES_ENVOI, { minimum: 0, rebond: 0, tenue: 0 })")
    ouvrir_sport(onglet)
    # Temoin structurel : six jours dans l'ordre de la semaine plus le bonus.
    codes = onglet.eval_on_selector_all("#ecran-sport .carte-jour .code", "c => c.map(x => x.textContent.trim())")
    assert codes == ["J1", "J2", "J3", "J4", "J5", "J6", "Bonus"], "accueil incomplet : " + str(codes)
    yield onglet
    contexte.close()
    assert not erreurs, "exception JavaScript : " + " ; ".join(erreurs)


def passer_intro(page):
    """Intro neon a chaque lancement depuis le 5 novembre 2026."""
    page.locator("#intro-entrer").click()
    page.wait_for_selector("#intro", state="hidden")


def ouvrir_sport(page):
    """L'accueil est la racine depuis le 4 novembre 2026 : Sport par l'onglet."""
    page.wait_for_selector("#accueil-programme")
    if page.locator("#intro").is_visible():
        passer_intro(page)
    page.locator('.onglet[data-onglet="sport"]').click()
    page.wait_for_selector(".carte-jour")


def ouvrir_jour(page, code, forme=None):
    """`code` est le code du classeur (J1 = Push, J5 = Haut max)."""
    page.locator('#ecran-sport .carte-jour[data-jour="%s"]' % code).click()
    bouton = page.locator("#demarrage-commencer")
    if bouton.is_visible():
        if forme:
            page.locator('[data-forme="%d"]' % forme).click()
        bouton.click()
    page.wait_for_selector("#ecran-seance.actif")


def saisir_serie_courante(page, charge, reps):
    courante = page.locator("#series .serie.courante")
    courante.locator("input.charge").fill(str(charge))
    courante.locator("input.reps").fill(str(reps))
    courante.locator("input.reps").press("Enter")


def fermer_repos(page):
    page.evaluate("arreterMinuterie()")


def terminer_seance(page, charge=40, reps=8):
    """Valide toutes les series de tous les exercices puis enregistre."""
    for _ in range(40):
        if page.locator("#series .serie.courante").count() == 0:
            break
        saisir_serie_courante(page, charge, reps)
        fermer_repos(page)
    page.locator("#exo-terminer").click()
    page.wait_for_selector("#ecran-fin.actif")
    page.locator("#fin-enregistrer").click()
    page.wait_for_selector("#ecran-historique.actif")


# ------------------------------------------------------------ navigation


def test_les_repetitions_valident_la_serie_et_lancent_le_repos(page):
    """Regle de la v1 conservee : ce sont les repetitions confirmees qui
    valident, et le repos part aussitot."""
    ouvrir_jour(page, "J1")
    saisir_serie_courante(page, 40, 8)
    assert page.locator("#series .serie.faite").count() == 1
    assert page.evaluate("minuterie !== null")


def test_le_chrono_de_la_fiche_lance_un_repos_sans_valider(page):
    """Remarque du 5 novembre 2026 : un repos doit pouvoir partir de
    n'importe quel exercice (unilateral, echauffement), sans serie validee."""
    ouvrir_jour(page, "J3")
    page.locator("#exo-suivant").click()
    page.locator("#chrono-exo").click()
    assert page.evaluate("minuterie !== null")
    assert page.locator("#series .serie.faite").count() == 0
    page.wait_for_selector("#minuterie-plein:not([hidden])")


def test_l_intro_s_ouvre_au_lancement_et_mene_a_l_accueil(navigateur, adresse):
    """Demande du 5 novembre 2026 : intro avant l'Accueil, un cadran central
    pour entrer, qui annonce la prochaine seance."""
    contexte = navigateur.new_context(viewport={"width": 390, "height": 844})
    onglet = contexte.new_page()
    erreurs = []
    onglet.on("pageerror", lambda erreur: erreurs.append(str(erreur)))
    onglet.goto(adresse)
    onglet.wait_for_selector("#accueil-programme", state="attached")
    assert onglet.locator("#intro").is_visible()
    assert onglet.locator("#intro-jour").inner_text().strip().startswith("J")
    passer_intro(onglet)
    onglet.locator("#accueil-programme").click()
    onglet.wait_for_selector("#ecran-sport .carte-jour")
    contexte.close()
    assert not erreurs, "exception JavaScript : " + " ; ".join(erreurs)


def test_reglages_signalent_que_firefox_ne_vibre_pas(navigateur, adresse):
    """Constat du 6 novembre 2026 : sous Firefox la vibration ne part jamais,
    Reglages le dit ; sous Chrome, rien."""
    for agent, attendu in (("Mozilla/5.0 (Android 15; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0", 1), (None, 0)):
        options = {"viewport": {"width": 390, "height": 844}}
        if agent:
            options["user_agent"] = agent
        contexte = navigateur.new_context(**options)
        onglet = contexte.new_page()
        erreurs = []
        onglet.on("pageerror", lambda erreur: erreurs.append(str(erreur)))
        onglet.goto(adresse)
        passer_intro(onglet)
        onglet.locator('.onglet[data-onglet="reglages"]').click()
        onglet.wait_for_selector("#reglages-corps .bascule")
        assert onglet.locator("#r-sans-vibration").count() == attendu, agent
        contexte.close()
        assert not erreurs, "exception JavaScript : " + " ; ".join(erreurs)


def test_l_envoi_passe_par_une_page_dediee_animee(page):
    """Demande du 5 novembre 2026 : page d'envoi a part, animation de la v1
    (rond pendant l'envoi, puis pilule avec son etat), avant la fiche."""
    page.evaluate("Object.assign(DUREES_ENVOI, { minimum: 600, rebond: 200, tenue: 600 })")
    ouvrir_jour(page, "J1")
    saisir_serie_courante(page, 40, 8)
    fermer_repos(page)
    page.locator("#exo-suivant").click()
    while page.locator("#exo-terminer").count() == 0:
        page.locator("#exo-suivant").click()
    page.locator("#exo-terminer").click()
    page.wait_for_selector("#ecran-fin.actif")
    page.locator("#fin-enregistrer").click()
    page.wait_for_selector("#envoi-plein:not([hidden]) #envoi-bouton.envoi")
    page.wait_for_selector("#envoi-bouton.envoye")
    assert page.locator("#envoi-texte").inner_text() in ("Envoyé", "En attente", "Enregistré")
    page.wait_for_selector("#ecran-historique.actif")
    assert page.locator("#envoi-plein").is_hidden()


def test_le_repos_persiste_hors_de_la_fiche_et_au_relancement(page):
    """Remarque du 5 novembre 2026 : chrono persistant, et plein ecran
    garde jusqu'a la fin (plus de masquage a 10 s)."""
    ouvrir_jour(page, "J1")
    saisir_serie_courante(page, 40, 8)
    page.wait_for_selector("#minuterie-plein:not([hidden])")
    page.evaluate("minuterie.fin = Date.now() + 5000; battre()")
    assert page.locator("#minuterie-plein").is_visible()
    page.locator("#minuterie-fermer").click()
    page.locator("#ecran-seance .barre [data-retour]").click()
    page.wait_for_selector("#repos-flottant:not([hidden])")
    page.evaluate("minuterie.fin = Date.now() + 60000; sauverRepos()")
    page.reload()
    passer_intro(page)
    page.wait_for_selector("#repos-flottant:not([hidden])")
    page.locator("#repos-flottant").click()
    page.wait_for_selector("#ecran-seance.actif")
    assert page.evaluate("minuterie !== null")
    assert page.locator("#repos-flottant").is_hidden()


def test_la_derniere_serie_passe_a_l_exercice_suivant(page):
    ouvrir_jour(page, "J1")
    n = page.locator("#series .serie").count()
    for _ in range(n):
        saisir_serie_courante(page, 40, 8)
        fermer_repos(page)
    assert page.evaluate("indexExo") == 1


def test_quitter_une_seance_la_garde_en_cours(page):
    ouvrir_jour(page, "J1")
    saisir_serie_courante(page, 40, 8)
    fermer_repos(page)
    page.locator("#ecran-seance [data-retour]").click()
    page.wait_for_selector("#ecran-sport.actif")
    assert page.locator(".carte-jour.encours").count() == 1
    page.locator('.carte-jour[data-jour="J1"]').click()
    page.wait_for_selector("#ecran-seance.actif")
    assert page.locator("#series .serie.faite").count() == 1


def test_l_abandon_depuis_la_fiche_ramene_a_sport(page):
    ouvrir_jour(page, "J1")
    saisir_serie_courante(page, 40, 8)
    page.wait_for_timeout(300)
    page.locator("#minuterie-fermer").click()
    page.wait_for_timeout(300)
    page.locator("#seance-abandonner").click()
    page.locator("[data-ok]").click()
    page.wait_for_selector("#ecran-sport.actif")
    assert not page.locator("#ecran-seance").evaluate("e => e.classList.contains('actif')")
    assert page.locator("#onglets").is_visible()
    assert page.evaluate("Object.values(lireSeancesEnCours()).filter((s) => s && !s.fin).length") == 0


def test_le_retour_android_remonte_d_un_ecran(page):
    page.locator('.onglet[data-onglet="suivi"]').click()
    page.locator('.tuile[data-ecran="calendrier"]').click()
    page.wait_for_selector("#ecran-calendrier.actif")
    page.go_back()
    page.wait_for_selector("#ecran-suivi.actif")
    assert page.evaluate("ecranActif()") == "suivi"


# ------------------------------------------------------------ progression


def test_l_objectif_monte_la_charge_apres_une_seance_en_haut_de_fourchette(page):
    """Double progression : toutes les series a reps_max au RIR cible, la
    charge suggere un pas de plus a la seance suivante."""
    reps_max = page.evaluate("programme.jours.find(j => j.code === 'J1').exercices[0].reps_max")
    ouvrir_jour(page, "J1")
    terminer_seance(page, 40, reps_max)
    page.locator("#ecran-historique [data-retour]").click()
    ouvrir_jour(page, "J1")
    texte = page.locator(".objectif .val").inner_text()
    assert texte.startswith("42,5"), texte
    assert page.locator(".objectif").get_attribute("class").find("monte") >= 0


def test_l_objectif_garde_la_charge_quand_la_fourchette_n_est_pas_atteinte(page):
    reps_max = page.evaluate("programme.jours.find(j => j.code === 'J1').exercices[0].reps_max")
    ouvrir_jour(page, "J1")
    terminer_seance(page, 40, reps_max - 1)
    page.locator("#ecran-historique [data-retour]").click()
    ouvrir_jour(page, "J1")
    assert page.locator(".objectif .val").inner_text().startswith("40")


def test_le_e1rm_ne_compte_pas_une_hausse_de_charge_comme_un_recul(page):
    """40 x 8 puis 42,5 x 6 : le tonnage baisse (320 -> 255) mais le 1RM
    estime est stable. Demande de l'utilisateur le 4 novembre 2026."""
    resultat = page.evaluate("""() => comparerSeries({charge: 42.5, reps: 6, rir: 1}, {charge: 40, reps: 8, rir: 1}, {reps_min: 6, reps_max: 8})""")
    assert resultat["sens"] == "stable", resultat


def test_une_serie_longue_se_juge_par_la_fourchette(page):
    resultat = page.evaluate("""() => comparerSeries({charge: 12, reps: 15}, {charge: 10, reps: 18}, {reps_min: 15, reps_max: 20})""")
    assert resultat["sens"] == "hausse", resultat


def test_une_charge_aberrante_demande_confirmation(page):
    ouvrir_jour(page, "J1")
    terminer_seance(page, 25, 8)
    page.locator("#ecran-historique [data-retour]").click()
    ouvrir_jour(page, "J1")
    saisir_serie_courante(page, 55, 8)
    assert page.locator(".voile .feuille").is_visible()
    assert page.locator("#series .serie.faite").count() == 0
    page.locator("[data-ok]").click()
    page.wait_for_timeout(300)
    assert page.locator("#series .serie.faite").count() == 1


def test_une_seance_de_deload_n_entre_pas_dans_les_comparaisons(page):
    ouvrir_jour(page, "J1")
    terminer_seance(page, 40, 8)
    page.locator("#ecran-historique [data-retour]").click()
    page.locator('.carte-jour[data-jour="J1"]').click()
    page.locator("#demarrage-deload").check()
    page.locator("#demarrage-commencer").click()
    page.wait_for_selector("#ecran-seance.actif")
    terminer_seance(page, 28, 8)
    nom = page.evaluate("programme.jours.find(j => j.code === 'J1').exercices[0].nom")
    derniere = page.evaluate("(nom) => derniereFois(nom).series[0].charge", nom)
    assert derniere == 40


def test_le_recul_double_est_signale(page):
    nom = page.evaluate("programme.jours.find(j => j.code === 'J1').exercices[0].nom")
    for charge in (40, 37.5, 35):
        ouvrir_jour(page, "J1")
        terminer_seance(page, charge, 8)
        page.locator("#ecran-historique [data-retour]").click()
    assert page.evaluate("(nom) => reculDouble(nom, ficheDuProgramme(nom)) !== null", nom)
    page.locator('.carte-jour[data-jour="J1"]').click()
    assert page.locator("#demarrage-corps .alerte.baisse").count() >= 1


# ------------------------------------------------------------ exercice


def test_le_rir_cible_est_propose_et_un_appui_le_corrige(page):
    ouvrir_jour(page, "J1")
    courante = page.locator("#series .serie.courante")
    assert courante.locator(".rir button.cible").count() == 1
    courante.locator(".rir button").nth(0).click()
    assert courante.locator(".rir button.choisi").inner_text() == "0"


def test_le_remplacement_garde_l_identite_par_nom(page):
    ouvrir_jour(page, "J1")
    page.locator("#exo-menu").click()
    page.locator('[data-action="remplacer"]').click()
    remplacant = page.locator('.liste-choix [data-i="0"]').inner_text().split("\n")[0].strip()
    page.locator('.liste-choix [data-i="0"]').click()
    page.wait_for_timeout(200)
    assert page.locator(".exo-entete h3").inner_text() == remplacant
    assert page.evaluate("seance.exercices[0].remplace") is not None


def test_une_douleur_notee_est_rappelee_la_fois_suivante(page):
    ouvrir_jour(page, "J1")
    page.locator("#douleur-exo").click()
    page.locator(".feuille [data-champ]").fill("epaule droite")
    page.locator(".feuille [data-ok]").click()
    page.wait_for_timeout(200)
    assert page.locator("#seance-corps .alerte.baisse").count() == 1
    terminer_seance(page)
    page.locator("#ecran-historique [data-retour]").click()
    page.locator('.carte-jour[data-jour="J1"]').click()
    assert page.locator("#demarrage-corps .alerte.info").count() == 1


# ------------------------------------------------------------ reprise de la v1


def test_l_historique_v1_est_repris_une_fois(adresse, navigateur):
    contexte = navigateur.new_context(viewport={"width": 390, "height": 844})
    onglet = contexte.new_page()
    onglet.goto(adresse)
    onglet.wait_for_selector("#accueil-programme")
    seance_v1 = {
        "id": "S1", "jour": "J2", "titre": "J2 & J6 FOOTING", "type": "footing",
        "debut": "2026-10-01T10:00:00.000Z", "fin": "2026-10-01T10:40:00.000Z", "envoye": True,
        "footing": {"ef": {"duree_min": 30, "distance_km": 5}},
    }
    onglet.evaluate("(s) => { localStorage.clear(); localStorage.setItem('muscu.historique', JSON.stringify([s])); }", seance_v1)
    onglet.reload()
    onglet.wait_for_selector("#accueil-programme")
    repris = onglet.evaluate("historique()")
    assert len(repris) == 1 and repris[0]["type"] == "cardio"
    assert repris[0]["cardio"]["ef"][0]["distance_km"] == 5
    # Une seconde ouverture ne reprend rien de plus, meme si la v1 change.
    onglet.evaluate("() => localStorage.setItem('muscu.historique', JSON.stringify([]))")
    onglet.reload()
    onglet.wait_for_selector("#accueil-programme")
    assert len(onglet.evaluate("historique()")) == 1
    contexte.close()


def test_les_seances_d_aout_reviennent_et_un_point_se_retire_seul(adresse, navigateur):
    """6 novembre 2026 : les seances des 27 et 28 aout, supprimees entieres
    la veille, sont reprises de la v1 ; seul l'exercice aberrant se retire,
    depuis la fiche du point, le reste de la seance reste."""
    contexte = navigateur.new_context(viewport={"width": 390, "height": 844})
    onglet = contexte.new_page()
    erreurs = []
    onglet.on("pageerror", lambda erreur: erreurs.append(str(erreur)))
    onglet.goto(adresse)
    onglet.wait_for_selector("#accueil-programme", state="attached")
    exo = onglet.evaluate("programme.jours.find((j) => j.type === 'muscu').exercices[0].nom")
    autre = onglet.evaluate("programme.jours.find((j) => j.type === 'muscu').exercices[1].nom")
    def seance(ident, date, charge):
        return {"id": ident, "jour": "J1", "type": "muscu", "debut": date + "T10:00:00", "fin": date + "T11:00:00",
                "exercices": [{"nom": exo, "series": [{"charge": charge, "reps": 8, "rir": 2, "faite": True}]},
                              {"nom": autre, "series": [{"charge": 20, "reps": 10, "rir": 2, "faite": True}]}]}
    v1 = [seance("A", "2026-08-28", 400), seance("B", "2026-09-04", 40)]
    # Etat du telephone apres la version qui supprimait : migration faite,
    # seance du 28 aout absente de la v2.
    onglet.evaluate("""(v1) => { localStorage.clear();
        localStorage.setItem('muscu.historique', JSON.stringify(v1));
        localStorage.setItem('muscu2.migration', JSON.stringify({ quand: '2026-11-04', seances: 2, source: 'v1' }));
        localStorage.setItem('muscu2.historique', JSON.stringify([v1[1]])); }""", v1)
    onglet.reload()
    onglet.wait_for_selector("#accueil-programme", state="attached")
    assert sorted(s["id"] for s in onglet.evaluate("historique()")) == ["A", "B"]
    passer_intro(onglet)
    onglet.evaluate("(n) => afficher('exercice', { parametres: n })", exo)
    onglet.wait_for_selector("#ecran-exercice.actif")
    onglet.locator(".zone[data-index='0']").click()
    onglet.locator("#point-retirer").click()
    onglet.locator(".voile [data-ok]").click()
    seance_a = next(s for s in onglet.evaluate("historique()") if s["id"] == "A")
    assert [e["nom"] for e in seance_a["exercices"]] == [autre]
    # Une seule restauration : le point retire ne revient pas au relancement.
    onglet.reload()
    onglet.wait_for_selector("#accueil-programme", state="attached")
    seance_a = next(s for s in onglet.evaluate("historique()") if s["id"] == "A")
    assert [e["nom"] for e in seance_a["exercices"]] == [autre]
    contexte.close()
    assert not erreurs, "exception JavaScript : " + " ; ".join(erreurs)


# ------------------------------------------------------------ cardio, gainage, suivi


def test_une_sortie_de_cardio_s_enregistre(page):
    ouvrir_jour(page, "J2")
    page.locator('input[data-cle="duree_min"]').fill("30")
    page.locator('input[data-cle="distance_km"]').fill("5")
    assert "6:00" in page.locator(".allure").first.inner_text()
    page.locator("#cardio-terminer").click()
    page.locator("#fin-enregistrer").click()
    page.wait_for_selector("#ecran-historique.actif")
    assert page.evaluate("historique()[0].cardio.ef[0].distance_km") == 5


def test_une_serie_de_gainage_lance_le_repos(page):
    ouvrir_jour(page, "G")
    champ = page.locator(".gainage-serie input").first
    champ.fill("8")
    champ.press("Tab")
    assert page.locator("#gainage-chrono").is_visible()


def test_pas_de_champ_poids_sur_les_mouvements_au_poids_du_corps(page):
    # Remarque du 5 novembre 2026 : ni planche, ni bird dog, ni dead bug,
    # ni marche de l'ours ne prennent de charge ; le Pallof press, si.
    ouvrir_jour(page, "G")
    for mouvement in ("Dead bug", "Planche", "Bird dog", "Marche de l'ours"):
        bouton = page.locator(".segment", has_text=mouvement)
        if bouton.count():
            bouton.first.click()
        assert page.get_by_label(mouvement + ", série 1, poids en kg").count() == 0, mouvement
    page.locator(".segment", has_text="Pallof press").first.click()
    assert page.get_by_label("Pallof press, série 1, poids en kg").count() == 1


def test_le_bird_dog_bipe_une_seule_fois_a_mi_tenue(page):
    # Remarque du 5 novembre 2026 : un côté par moitié, bip au milieu.
    ouvrir_jour(page, "G")
    page.locator('[data-m="bird_dog"]').click()
    page.evaluate("window.bipsCote = 0; signalerChangementDeCote = () => { window.bipsCote++; }; null")
    page.locator('[data-m="bird_dog"].choisi').locator("xpath=ancestor::div[contains(@class,'gainage-exo')]").locator(".demarrer").first.click()
    assert "1er côté" in page.locator("#gainage-chrono-l").inner_text()
    page.evaluate("minuteurGainage.debut -= 600000; minuteurGainage.fin = Date.now() + 5000")
    page.wait_for_function("document.getElementById('gainage-chrono-l').textContent.includes('2e côté')")
    assert page.evaluate("window.bipsCote") == 1
    page.wait_for_timeout(600)
    assert page.evaluate("window.bipsCote") == 1


def test_la_courbe_porte_des_axes_lisibles_et_une_fiche_au_point(page):
    for charge in (40, 42.5):
        ouvrir_jour(page, "J1")
        terminer_seance(page, charge, 8)
        page.locator("#ecran-historique [data-retour]").click()
    page.locator('.onglet[data-onglet="suivi"]').click()
    page.locator('.tuile[data-ecran="surcharge"]').click()
    page.locator("[data-exo]").first.click()
    page.wait_for_selector("#ecran-exercice.actif")
    textes = page.eval_on_selector_all("#ecran-exercice svg.courbe text", "t => t.map(x => x.textContent)")
    assert any("kg" in t for t in textes) and any("/" in t for t in textes), textes
    page.locator("#ecran-exercice .zone[data-index='0']").click()
    assert "40" in page.locator(".fiche-point b").inner_text()


def test_le_service_worker_liste_tous_les_fichiers_servis(page):
    sw = (RACINE / "v2" / "sw.js").read_text(encoding="utf-8")
    for script in ["tables", "donnees", "calculs", "ui", "sport", "seance", "cardio", "gainage", "suivi", "sommeil", "mensurations", "reglages", "app"]:
        assert "./js/%s.js" % script in sw, script
    assert "VERSION = 'muscu2-" in sw


def test_les_schemas_precaches_existent(page):
    sw = (RACINE / "v2" / "sw.js").read_text(encoding="utf-8")
    tables = (RACINE / "v2" / "js" / "tables.js").read_text(encoding="utf-8")
    import re
    for schema in re.findall(r"schema: '([^']+)'", tables):
        assert schema in sw, "schema absent du precache : " + schema
        for pose in ("relaxation", "tension"):
            assert (RACINE / "images-exercices" / "schemas" / (schema + "-" + pose + ".svg")).exists()
