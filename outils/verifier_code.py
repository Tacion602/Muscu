# -*- coding: utf-8 -*-
"""Controles du code lui-meme, complementaires de `outils/verifier_import.py`
qui ne regarde que les donnees du classeur.

Nes le 12 septembre 2026 d'une relecture complete qui a trouve, sans qu'aucun
outil ne les signale : un passage de CLAUDE.md decrivant `GAINAGE_FOOTING` et
`tenuesGainage()`, disparus du code une journee plus tot ; un commentaire de
`sw.js` annoncant l'inverse de ce que fait le fichier ; des entetes de colonnes
decales de 26 pixels par une grille CSS divergente.

Trois regles, les memes que pour les autres verifications du projet :

- **quatre issues, jamais deux** : REUSSI, ALERTE, SANS OBJET, INEXECUTABLE.
  ALERTE et INEXECUTABLE sortent en erreur ; SANS OBJET reste affiche plutot
  que de se faire passer pour un succes ;
- **un temoin par controle** : l'instrument doit d'abord reperer une anomalie
  fabriquee pour lui, sans quoi son silence ne prouve rien ;
- **le perimetre s'affiche** : chaque ligne dit combien de fichiers, de noms
  ou de mouvements ont ete reellement inspectes. Un zero se voit.

Lancement : python outils/verifier_code.py
Lance aussi par `pytest tests/`, controles statiques seulement.
"""

import io
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent

FICHIERS_JS = ['js/app.js', 'sw.js', 'appsscript/Code.gs']

SOURCES = ['js/app.js', 'sw.js', 'index.html', 'css/style.css', 'appsscript/Code.gs',
           'outils/importer_classeur.py', 'outils/verifier_import.py',
           'outils/sauvegarder_classeur.py', 'outils/lire_remarques.py',
           'outils/verifier_code.py', 'tests/test_app.py']

# Noms que CLAUDE.md cite alors qu'ils n'existent plus, et c'est voulu : le
# texte les presente explicitement comme anciens, pour qu'on s'y retrouve dans
# l'historique git. Ajouter un nom ici doit rester un geste delibere ; sans
# cette liste, le controle se contenterait de bruire.
NOMS_HISTORIQUES = {
    'basculerSerie',     # remplace par validerSerie, 27 aout 2026
    'validerParRir',     # renomme validerSerie, 6 septembre 2026
}


def present(nom, code):
    """Le nom existe-t-il tel quel dans le code ?

    Aux frontieres de mot, sans quoi `GAINAGE_FOOTING` se declarerait present
    parce que `GAINAGE_FOOTING_ANCIEN` l'est, et la derogation historique
    porterait sur un nom qui n'existe plus.
    """
    return re.search(r'\b' + re.escape(nom) + r'\b', code) is not None


def lire(chemin):
    return io.open(str(RACINE / chemin), encoding='utf-8').read()


def nom_non_cite(nom, doc):
    return ('`' + nom + '()`') not in doc and ('`' + nom + '`') not in doc


class Controle(object):
    """Un controle et son verdict. `alertes` est une liste de phrases."""

    def __init__(self, nom):
        self.nom = nom
        self.alertes = []
        self.infos = []
        self.perimetre = ''
        self.etat = 'REUSSI'

    def inexecutable(self, pourquoi):
        self.etat = 'INEXECUTABLE'
        self.perimetre = pourquoi
        return self

    def sans_objet(self, pourquoi):
        self.etat = 'SANS OBJET'
        self.perimetre = pourquoi
        return self

    def alerte(self, phrase):
        self.alertes.append(phrase)
        self.etat = 'ALERTE'

    def afficher(self):
        print('  %-13s %s' % (self.etat, self.nom))
        for a in self.alertes:
            print('      ALERTE  ' + a)
        for i in self.infos:
            print('      info    ' + i)
        if self.perimetre:
            print('      ' + self.perimetre)


# --------------------------------------------------------------- controle 1

def identifiants_dom(source_html=None, source_js=None):
    """Tout `$('...')` de app.js doit designer un element d'index.html.

    Une faute de frappe y est silencieuse jusqu'a l'execution de la ligne :
    `$('bloc-gainaje').hidden = true` ne leve rien tant que personne n'ouvre
    la seance de gainage, et plante alors toute la fonction.
    """
    controle = Controle("identifiants du DOM demandes par js/app.js")
    html = lire('index.html') if source_html is None else source_html
    app = lire('js/app.js') if source_js is None else source_js

    presents = set(re.findall(r'id="([^"]+)"', html))
    demandes = set(re.findall(r"\$\('([^']+)'\)", app))
    demandes |= set(re.findall(r"getElementById\('([^']+)'\)", app))
    if not demandes:
        return controle.inexecutable("aucun identifiant lu dans js/app.js : "
                                     "l'extraction ne fonctionne plus")

    for identifiant in sorted(demandes - presents):
        controle.alerte("js/app.js demande #%s, absent d'index.html" % identifiant)

    orphelins = sorted(presents - demandes)
    controle.perimetre = ('perimetre : %d identifiants demandes, %d declares ; '
                          '%d declare(s) jamais demande(s)'
                          % (len(demandes), len(presents), len(orphelins)))
    return controle


# --------------------------------------------------------------- controle 2

def noms_cites(source_doc=None, sources=None):
    """Les noms de code cites dans CLAUDE.md doivent exister dans le code.

    CLAUDE.md est la memoire du projet : un passage qui decrit une fonction
    disparue ne se voit pas, et egare la relecture suivante bien plus surement
    qu'une absence de documentation.
    """
    controle = Controle('noms de code cites par CLAUDE.md')
    doc = lire('CLAUDE.md') if source_doc is None else source_doc
    code = ''.join(lire(c) for c in SOURCES) if sources is None else sources
    # Ce fichier-ci nomme les derogations dans ses propres commentaires : les
    # y chercher ferait croire que chaque nom historique est revenu dans le
    # code. On les cherche donc partout ailleurs.
    ailleurs = (''.join(lire(c) for c in SOURCES if c != 'outils/verifier_code.py')
                if sources is None else sources)

    cites = set()
    for morceau in re.findall(r'`([^`]+)`', doc):
        morceau = morceau.strip()
        if re.match(r'^[A-Za-z_][A-Za-z0-9_]*\(\)$', morceau):
            cites.add(morceau[:-2])
        elif re.match(r'^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$', morceau):
            # Une constante porte un tiret bas. Sans cette exigence, le
            # controle ramassait les libelles du classeur que CLAUDE.md cite
            # aussi entre accents graves (`REPOS`, sa coquille `REOIS`,
            # `DELOAD`) : ce sont des contenus de cellule, pas des noms de
            # code, et ils n'ont aucune raison de figurer dans les sources.
            cites.add(morceau)
    if not cites:
        return controle.inexecutable("aucun nom lu dans CLAUDE.md : "
                                     "l'extraction ne fonctionne plus")

    introuvables = sorted(n for n in cites
                          if not present(n, code) and n not in NOMS_HISTORIQUES)
    for nom in introuvables:
        ligne = next((i + 1 for i, l in enumerate(doc.splitlines()) if '`' + nom in l), 0)
        controle.alerte('CLAUDE.md ligne %d cite `%s`, introuvable dans le code'
                        % (ligne, nom))

    # Une derogation qui ne sert plus est une derogation a retirer : sinon la
    # liste s'allonge et finit par couvrir des oublis reels.
    for nom in sorted(n for n in NOMS_HISTORIQUES if present(n, ailleurs)):
        controle.infos.append('`%s` est dans NOMS_HISTORIQUES mais existe de nouveau '
                              'dans le code : retirer la derogation' % nom)
    for nom in sorted(n for n in NOMS_HISTORIQUES if nom_non_cite(n, doc)):
        controle.infos.append('`%s` est dans NOMS_HISTORIQUES mais CLAUDE.md ne le '
                              'cite plus : retirer la derogation' % nom)

    controle.perimetre = ('perimetre : %d noms cites, %d fichiers de code, '
                          '%d derogation(s) historique(s)'
                          % (len(cites), len(SOURCES), len(NOMS_HISTORIQUES)))
    return controle


# --------------------------------------------------------------- controle 3

def mouvements_de_gainage(source=None):
    """Invariants de la seance de gainage.

    Le code couleur d'interference n'a de sens que si les neuf rangs sont
    distincts et couvrent 1 a 9 : un rang double ou manquant ne leve aucune
    erreur, il rend seulement la legende fausse. Chaque mouvement doit par
    ailleurs appartenir a une categorie et une seule, sans quoi
    `seriesDuMouvement()` rendrait la premiere trouvee au hasard de l'ordre.
    """
    controle = Controle('mouvements de gainage (rangs, couleurs, categories)')
    app = lire('js/app.js') if source is None else source

    bloc = re.search(r'const MOUVEMENTS_GAINAGE = \{(.*?)\n\};', app, re.S)
    categories = re.search(r'const CATEGORIES_GAINAGE = \[(.*?)\n\];', app, re.S)
    if not bloc or not categories:
        return controle.inexecutable('MOUVEMENTS_GAINAGE ou CATEGORIES_GAINAGE '
                                     'introuvable dans js/app.js')

    corps = bloc.group(1)
    mouvements = {}
    for cle, contenu in re.findall(r'\n  (\w+): \{(.*?)\n  \},', corps + '\n  },', re.S):
        mouvements[cle] = contenu
    if not mouvements:
        return controle.inexecutable("aucun mouvement lu : l'extraction ne fonctionne plus")

    rangs = {}
    for cle, contenu in sorted(mouvements.items()):
        for champ in ['mode', 'prescription', 'repos', 'interference', 'couleur', 'consigne']:
            if (champ + ':') not in contenu:
                controle.alerte('%s : champ %s manquant' % (cle, champ))
        mode = re.search(r"mode: '(\w+)'", contenu)
        if mode and mode.group(1) not in ('chrono', 'reps', 'charge'):
            controle.alerte('%s : mode inconnu %s' % (cle, mode.group(1)))
        if not re.search(r"couleur: '#[0-9A-Fa-f]{6}'", contenu):
            controle.alerte('%s : couleur absente ou mal formee' % cle)
        rang = re.search(r'interference: (\d+)', contenu)
        if rang:
            rangs.setdefault(int(rang.group(1)), []).append(cle)

    attendus = set(range(1, len(mouvements) + 1))
    if set(rangs) != attendus:
        controle.alerte('les rangs d\'interference sont %s, attendus 1 a %d'
                        % (sorted(rangs), len(mouvements)))
    for rang, cles in sorted(rangs.items()):
        if len(cles) > 1:
            controle.alerte('rang %d partage par %s' % (rang, ', '.join(cles)))

    classes = {}
    for cle_cat, liste in re.findall(r"cle: '(\w+)'.*?mouvements: \[(.*?)\]",
                                     categories.group(1), re.S):
        for cle in re.findall(r"'(\w+)'", liste):
            classes.setdefault(cle, []).append(cle_cat)
    for cle in sorted(mouvements):
        cats = classes.get(cle, [])
        if len(cats) != 1:
            controle.alerte('%s appartient a %d categorie(s) : %s'
                            % (cle, len(cats), ', '.join(cats) or 'aucune'))
    for cle in sorted(set(classes) - set(mouvements)):
        controle.alerte('la categorie %s nomme %s, absent de MOUVEMENTS_GAINAGE'
                        % (classes[cle][0], cle))

    controle.perimetre = ('perimetre : %d mouvements, %d categories'
                          % (len(mouvements), len(re.findall(r"cle: '", categories.group(1)))))
    return controle


# --------------------------------------------------------------- controle 4

def syntaxe_javascript():
    """Les trois fichiers JavaScript doivent s'analyser sans erreur.

    Aucun d'eux n'est couvert par un compilateur : `appsscript/Code.gs` ne
    tourne que chez Google, et une faute de frappe n'y apparait qu'au premier
    envoi de seance, une fois la salle quittee. Chromium sert ici d'analyseur
    syntaxique, sans rien executer.
    """
    controle = Controle('syntaxe des fichiers JavaScript')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return controle.inexecutable('playwright absent : pip install -r requirements-dev.txt')

    fautif = 'function casse( { return ;;; }'
    try:
        with sync_playwright() as p:
            navigateur = p.chromium.launch()
            page = navigateur.new_page()
            page.goto('about:blank')

            def analyser(source):
                return page.evaluate(
                    "src => { try { new Function(src); return ''; }"
                    " catch (e) { return e.message || String(e); } }", source)

            if not analyser(fautif):
                navigateur.close()
                return controle.inexecutable(
                    "temoin non detecte : une source volontairement fautive est "
                    "acceptee, l'analyseur ne prouve rien")

            for chemin in FICHIERS_JS:
                erreur = analyser(lire(chemin))
                if erreur:
                    controle.alerte('%s : %s' % (chemin, erreur))
            navigateur.close()
    except Exception as e:                                  # navigateur absent
        return controle.inexecutable('Chromium indisponible (%s) : '
                                     'python -m playwright install chromium' % type(e).__name__)

    controle.perimetre = ('perimetre : %d fichiers analyses ; temoin detecte'
                          % len(FICHIERS_JS))
    return controle


# ------------------------------------------------------------------- temoins

def temoins():
    """Chaque controle statique doit reperer une anomalie fabriquee pour lui.

    Sans ce passage, un controle dont l'extraction ne mord plus (une regex
    devenue caduque apres un renommage) rendrait un silence rassurant.
    """
    essais = [
        ('identifiants du DOM',
         identifiants_dom(source_html='<div id="vrai"></div>',
                          source_js="$('vrai'); $('invente-pour-le-temoin');")),
        ('noms cites par CLAUDE.md',
         noms_cites(source_doc='On lit `fonctionInventeePourLeTemoin()` ici.',
                    sources='const autreChose = 1;')),
        ('mouvements de gainage',
         mouvements_de_gainage(source=SOURCE_TEMOIN_GAINAGE)),
    ]
    rates = [nom for nom, controle in essais if controle.etat != 'ALERTE']
    return rates


SOURCE_TEMOIN_GAINAGE = """
const MOUVEMENTS_GAINAGE = {
  un: {
    nom: 'Un', mode: 'chrono', prescription: '45 s', repos: 45,
    interference: 1, couleur: '#000000',
    consigne: 'Rien.',
  },
  deux: {
    nom: 'Deux', mode: 'chrono', prescription: '45 s', repos: 45,
    interference: 1, couleur: '#000000',
    consigne: 'Rien.',
  },
};

const CATEGORIES_GAINAGE = [
  { cle: 'categorie', nom: 'Categorie', series: 3,
    mouvements: ['un', 'deux'] },
];
"""


# -------------------------------------------------------------------- entree

def verifier(avec_navigateur=True):
    """Rend la liste des controles. Le code de sortie se calcule dessus."""
    rates = temoins()
    controles = [identifiants_dom(), noms_cites(), mouvements_de_gainage()]
    if rates:
        for controle in controles:
            controle.inexecutable('temoin non detecte par : ' + ', '.join(rates))
    if avec_navigateur:
        controles.append(syntaxe_javascript())
    return controles


def main():
    print('Verification du code')
    controles = verifier()
    for controle in controles:
        controle.afficher()
    alertes = sum(len(c.alertes) for c in controles)
    bloquants = [c for c in controles if c.etat in ('ALERTE', 'INEXECUTABLE')]
    print('  %d controle(s), %d alerte(s), %d bloquant(s)'
          % (len(controles), alertes, len(bloquants)))
    return 1 if bloquants else 0


if __name__ == '__main__':
    sys.exit(main())
