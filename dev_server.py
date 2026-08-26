"""Petit serveur local pour tester l'application dans un navigateur.

python dev_server.py       # sert sur http://127.0.0.1:5600
"""

import http.server

PORT = 5600


class Gestionnaire(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 est necessaire a l'enregistrement du service worker, mais il
    # suppose des connexions persistantes : sans le threading ci-dessous, un
    # onglet gardant une connexion ouverte bloque toute requete suivante,
    # le serveur mono-thread ne pouvant en traiter qu'une a la fois.
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        # L'application lit data/programme.json et sw.js a chaque chargement :
        # eviter que le navigateur les garde en cache pendant le developpement.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Gestionnaire) as serveur:
        print(f"Sert sur http://127.0.0.1:{PORT}")
        serveur.serve_forever()
