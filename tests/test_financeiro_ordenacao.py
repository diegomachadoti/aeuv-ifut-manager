from __future__ import annotations

import json
import tempfile
import unittest
from dataclasses import asdict
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from reportlab.platypus import SimpleDocTemplate, Table

import financeiro_pdf
from financeiro_pdf import (
    FiltroRelatorio, LancamentoFinanceiro, carregar_lancamentos_de_json,
    gerar_pdf_financeiro, ordenar_lancamentos_financeiros,
)
from nota_pdf import ConfigPdf


def lancamento(protocolo, data, origem="Liga A", emenda="Emenda Teste", valor=50):
    return LancamentoFinanceiro(protocolo, data, "Entrada", origem, "Categoria", protocolo, valor,
                                 emenda=emenda)


class FinanceiroOrdenacaoTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.pasta = Path(self.temp.name)
        logo, assinatura = self.pasta / "logo.png", self.pasta / "assinatura-ficticia.png"
        Image.new("RGB", (100, 100), "white").save(logo)
        Image.new("RGB", (100, 30), "white").save(assinatura)
        self.config = ConfigPdf(self.pasta, logo, "", "AEUV", "", "Uberlândia/MG",
                                assinatura, "Presidente de teste", "Presidente")

    def pdf(self, filtro, itens):
        linhas = []
        original = SimpleDocTemplate.build

        def capturar(doc, elementos, *args, **kwargs):
            for elemento in elementos:
                if not isinstance(elemento, Table):
                    continue
                celulas = getattr(elemento, "_cellvalues")
                if celulas and hasattr(celulas[0][0], "getPlainText") and celulas[0][0].getPlainText() == "Data":
                    coluna_descricao = 4 if filtro.tipo_relatorio == "geral" else 3
                    linhas.extend((linha[0].getPlainText(), linha[coluna_descricao].getPlainText()) for linha in celulas[1:])
            return original(doc, elementos, *args, **kwargs)

        destino = self.pasta / f"{filtro.tipo_relatorio}.pdf"
        with patch.object(financeiro_pdf, "PASTA_RELATORIOS", self.pasta), \
             patch.object(SimpleDocTemplate, "build", autospec=True, side_effect=capturar):
            gerar_pdf_financeiro(filtro, itens, self.config, saida=destino)
        self.assertEqual(destino.read_bytes()[:5], b"%PDF-")
        return linhas

    def test_retroativos_e_edicoes_usam_data_movimentacao_sem_mutar_lista(self):
        itens = [lancamento("FIN-001", "06/10/2026"), lancamento("FIN-002", "08/10/2026"),
                 lancamento("FIN-003", "05/10/2026")]
        self.assertEqual([i.id_lancamento for i in ordenar_lancamentos_financeiros(itens)],
                         ["FIN-003", "FIN-001", "FIN-002"])
        self.assertEqual([i.id_lancamento for i in itens], ["FIN-001", "FIN-002", "FIN-003"])
        itens[0].data_movimentacao = "09/10/2026"
        self.assertEqual([i.id_lancamento for i in ordenar_lancamentos_financeiros(itens)],
                         ["FIN-003", "FIN-002", "FIN-001"])
        itens[0].data_movimentacao = "01/09/2026"
        self.assertEqual([i.id_lancamento for i in ordenar_lancamentos_financeiros(itens)],
                         ["FIN-001", "FIN-003", "FIN-002"])

    def test_formatos_diferentes_viradas_de_mes_e_ano(self):
        itens = [lancamento("a", "31/12/2025"), lancamento("b", "2026-01-01"),
                 lancamento("c", "30-09-2026"), lancamento("d", "2026/10/01"),
                 lancamento("e", "08/10/2026 10:00"), lancamento("f", "2026-10-09T15:00:00Z")]
        self.assertEqual([i.id_lancamento for i in ordenar_lancamentos_financeiros(itens)],
                         ["a", "b", "c", "d", "e", "f"])

    def test_empate_por_protocolo_e_invalidas_ao_final_sem_perder_valores(self):
        itens = [lancamento("FIN-090000", "08/10/2026"), lancamento("FIN-120000", "2026-10-08"),
                 lancamento("invalida", "31/02/2026"), lancamento("vazia", "")]
        ordenados = ordenar_lancamentos_financeiros(itens)
        self.assertEqual([i.id_lancamento for i in ordenados],
                         ["FIN-090000", "FIN-120000", "invalida", "vazia"])
        self.assertEqual(sum(i.valor for i in ordenados), sum(i.valor for i in itens))

    def test_tres_tipos_de_pdf_em_ordem_crescente_apos_filtros(self):
        itens = [lancamento("antigo", "05/10/2026"), lancamento("recente", "08/10/2026"),
                 lancamento("retroativo", "01/09/2026"),
                 lancamento("outra", "09/10/2026", origem="Liga B", emenda="Outra Emenda")]
        for tipo in ("geral", "competicao", "emenda"):
            with self.subTest(tipo=tipo):
                filtro = FiltroRelatorio(tipo, competicao="Liga A", numero_emenda="Emenda Teste",
                                         periodo_inicio="01/10/2026", periodo_fim="31/10/2026")
                linhas = self.pdf(filtro, itens)
                esperado = ["antigo", "recente", "outra"] if tipo == "geral" else ["antigo", "recente"]
                self.assertEqual([descricao for _, descricao in linhas], esperado)
        self.assertEqual([i.id_lancamento for i in itens], ["antigo", "recente", "retroativo", "outra"])

    def test_json_tambem_produz_pdf_em_ordem_crescente(self):
        itens = [lancamento("primeiro", "05/10/2026"), lancamento("segundo", "2026-10-08"),
                 lancamento("retroativo", "01/09/2026")]
        caminho = self.pasta / "lancamentos-teste.json"
        caminho.write_text(json.dumps({"filtro": {"tipo_relatorio": "geral"},
                                       "lancamentos": [asdict(i) for i in itens]}), encoding="utf-8")
        filtro, dados = carregar_lancamentos_de_json(caminho)
        self.assertEqual([descricao for _, descricao in self.pdf(filtro, dados)],
                         ["retroativo", "primeiro", "segundo"])


if __name__ == "__main__":
    unittest.main()
