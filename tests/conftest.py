"""Fixture partagee par tests/test_app.py (v1) et tests/test_v2.py (v2).

Un seul Playwright par session : chaque fichier ouvrait le sien, et le
second `sync_playwright()` echouait quand `pytest tests/` lancait les deux
suites d'un coup (trouve le 4 novembre 2026, 20 erreurs v2 apres 59 v1
reussis, aucune en lancant test_v2.py seul).
"""

import pytest
from playwright.sync_api import sync_playwright


@pytest.fixture(scope="session")
def navigateur():
    with sync_playwright() as p:
        chromium = p.chromium.launch()
        yield chromium
        chromium.close()
