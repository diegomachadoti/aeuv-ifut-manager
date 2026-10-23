"""Testes da deduplicação de punições retroativas (lógica pura, sem IA nem Drive)."""

from __future__ import annotations

import logging
import unittest

from ingerir_notas_retroativas import deduplicar, punicoes_da_nota

LOG = logging.getLogger("teste")
LOG.addHandler(logging.NullHandler())


def reg(nota, atleta, equipe, artigo, partidas=2, decisao="susp", origem="a.docx"):
    return {
        "nota": nota, "data_nota": "", "competicao": "X", "data_jogo": "", "partida": "",
        "equipe": equipe, "atleta": atleta, "tipo": "Atleta", "artigo": artigo,
        "partidas": partidas, "decisao": decisao, "origem_arquivo": origem, "modo": "Retroativa",
    }


class DeduplicarTests(unittest.TestCase):
    def test_remove_punicao_identica_repetida(self):
        registros = [
            reg("007/2026", "Fulano", "Equipe A", "ART. 23, §1º", origem="nota.docx"),
            reg("007/2026", "Fulano", "Equipe A", "ART. 23, §1º", origem="nota v2.docx"),
        ]
        resultado = deduplicar(registros, LOG)
        self.assertEqual(len(resultado), 1)

    def test_normaliza_nome_e_artigo_ao_comparar(self):
        registros = [
            reg("007/2026", "João de Oliveira", "Cruzmaltino", "ART. 23, §1º"),
            reg("007/2026", "joao DE oliveira", "CRUZMALTINO", "art. 23, §1º"),
        ]
        self.assertEqual(len(deduplicar(registros, LOG)), 1)

    def test_versao_mais_completa_vence(self):
        # Mesma punição; uma sem partidas definidas, outra com. Fica a com partidas.
        registros = [
            reg("007/2026", "Fulano", "Equipe A", "ART. 23", partidas=None, decisao="a definir", origem="v1"),
            reg("007/2026", "Fulano", "Equipe A", "ART. 23", partidas=3, decisao="suspensão de 3 jogos", origem="v2"),
        ]
        resultado = deduplicar(registros, LOG)
        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]["partidas"], 3)
        self.assertEqual(resultado[0]["origem_arquivo"], "v2")

    def test_punicoes_diferentes_sao_mantidas(self):
        registros = [
            reg("007/2026", "Fulano", "Equipe A", "ART. 23"),
            reg("008/2026", "Fulano", "Equipe A", "ART. 23"),   # nota diferente
            reg("007/2026", "Beltrano", "Equipe B", "ART. 23"),  # atleta diferente
            reg("007/2026", "Fulano", "Equipe A", "ART. 22"),    # artigo diferente
        ]
        self.assertEqual(len(deduplicar(registros, LOG)), 4)


class PunicoesDaNotaTests(unittest.TestCase):
    def test_adendo_sem_punicao_retorna_vazio(self):
        dados = {"numero_nota": "007/2026", "eh_adendo_sem_punicao": True, "punicoes": []}
        self.assertEqual(punicoes_da_nota(dados, "adendo.docx"), [])

    def test_ignora_punicao_sem_artigo_ou_sem_atleta(self):
        dados = {
            "numero_nota": "007/2026", "eh_adendo_sem_punicao": False,
            "punicoes": [
                {"atleta": "Fulano", "equipe": "A", "artigo": "", "partidas": 1},   # sem artigo
                {"atleta": "", "equipe": "A", "artigo": "ART. 23", "partidas": 1},    # sem atleta
                {"atleta": "Ciclano", "equipe": "A", "artigo": "ART. 23", "partidas": 2},  # válida
            ],
        }
        out = punicoes_da_nota(dados, "nota.docx")
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["atleta"], "Ciclano")


if __name__ == "__main__":
    unittest.main()
