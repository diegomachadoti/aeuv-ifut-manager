from __future__ import annotations

import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from reportlab.lib.enums import TA_LEFT

from nota_pdf import ConfigPdf, LayoutPdf
from oficio_pdf import (
    ANEXOS, MODELO_PADRAO, _acesso_documento, _fmt, _licencas, _tabela_documentos, criar_modelo_oficio,
    cronograma, gerar_pdf_oficio, ler_oficio, pendencias_oficio, relatorio_pendencias,
)


class OficioPdfTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.origem = criar_modelo_oficio(Path(self.temp.name) / "oficio.txt")
        logo = Path(self.temp.name) / "logo.png"
        assinatura = Path(self.temp.name) / "assinatura-ficticia.png"
        Image.new("RGB", (100, 50), "white").save(logo)
        Image.new("RGB", (100, 30), "white").save(assinatura)
        self.config = ConfigPdf(
            notas_dir=Path(self.temp.name), logo=logo, logo_url="",
            associacao="AEUV", competicao="", cidade="Uberlândia/MG",
            assinatura=assinatura,
            assinatura_nome="Iure Costtiti", assinatura_cargo="Presidente",
        )

    def pronto(self):
        oficio = ler_oficio(self.origem)
        oficio.dados["requerente"]["endereco"] = "Endereço de teste — não protocolar"
        oficio.dados["requerente"]["contato"] = "Contato de teste"
        oficio.dados["condicoes"]["criancas_adolescentes"] = "nao"
        for chave, _ in ANEXOS:
            oficio.dados["anexos"][chave] = f"https://drive.google.com/file/d/TESTE_{chave}/view"
        self.salvar(oficio)
        return oficio

    def salvar(self, oficio):
        with self.origem.open("w", encoding="utf-8") as arquivo:
            oficio.dados.write(arquivo)

    def test_copia_modelo_sem_sobrescrever(self):
        self.assertEqual(self.origem.read_text(encoding="utf-8"), MODELO_PADRAO.read_text(encoding="utf-8"))
        with self.assertRaises(FileExistsError):
            criar_modelo_oficio(self.origem)
        with self.assertRaises(ValueError):
            criar_modelo_oficio(Path(self.temp.name) / "modelo.pdf")

    def test_pendencias_mapeiam_dados_e_todos_anexos(self):
        pendencias = pendencias_oficio(ler_oficio(self.origem))
        self.assertTrue(any("endereco:" in p for p in pendencias))
        self.assertTrue(any("contato:" in p for p in pendencias))
        self.assertTrue(any("criancas_adolescentes:" in p for p in pendencias))
        self.assertEqual(sum(p.startswith("Anexo ") for p in pendencias), len(ANEXOS))

    def test_cronograma_apenas_poliesportivos_a_partir_de_novembro(self):
        oficio = ler_oficio(self.origem)
        linhas = cronograma(oficio)
        self.assertEqual(len(linhas), 8)
        self.assertEqual(linhas[0], ["01/11/2026", "2ª rodada — fase de grupos", "15:00", "5",
                                    "Poliesportivos definidos semanalmente pela Futel"])
        self.assertEqual(linhas[-1][0], "20/12/2026")
        self.assertNotIn("25/10/2026", [linha[0] for linha in linhas])

    def test_doc_posterior_nao_bloqueia_final_e_licencas_respeitam_condicoes(self):
        oficio = self.pronto()
        self.assertEqual(pendencias_oficio(oficio), [])
        self.assertEqual([chave for chave, _ in _licencas(oficio)], ["alvara_evento"])
        oficio.dados["condicoes"]["criancas_adolescentes"] = "sim"
        self.assertEqual([chave for chave, _ in _licencas(oficio)], ["alvara_evento", "alvara_infancia"])
        self.assertEqual(pendencias_oficio(oficio), [])
        oficio.dados["condicoes"]["musica"] = "sim"
        oficio.dados["condicoes"]["venda_alimentos"] = "sim"
        self.assertEqual(len(_licencas(oficio)), 4)

    def test_procuracao_condicional_exige_link(self):
        oficio = self.pronto()
        oficio.dados["condicoes"]["procuracao"] = "sim"
        self.assertTrue(any("Procuração" in p for p in pendencias_oficio(oficio)))
        oficio.dados["anexos"]["procuracao"] = "https://drive.google.com/file/d/TESTE_PROCURACAO/view"
        self.assertEqual(pendencias_oficio(oficio), [])

    def test_datas_invalidas_e_cronograma_fora_do_periodo(self):
        oficio = self.pronto()
        oficio.dados["oficio"]["data"] = "31/02/2026"
        with self.assertRaisesRegex(ValueError, "data inválida"):
            pendencias_oficio(oficio)
        oficio.dados["oficio"]["data"] = "09/10/2026"
        oficio.dados["evento"]["fim_uso"] = "01/10/2026"
        with self.assertRaisesRegex(ValueError, "anterior"):
            pendencias_oficio(oficio)
        oficio.dados["evento"]["fim_uso"] = "20/12/2026"
        oficio.dados["cronograma"]["25/10/2026"] = "Extra | 15:00 | 1 | Campo"
        with self.assertRaisesRegex(ValueError, "fora do período"):
            pendencias_oficio(oficio)

    def test_links_provisorios_e_http_nao_sao_anexos_validos(self):
        oficio = self.pronto()
        oficio.dados["anexos"]["cnpj"] = "http://drive.google.com/file/d/TESTE/view"
        self.assertEqual(len(pendencias_oficio(oficio)), 1)
        oficio.dados["anexos"]["cnpj"] = "https://drive.google.com/file/d/SUBSTITUIR_ID/view"
        self.assertEqual(len(pendencias_oficio(oficio)), 1)

    def test_relatorio_prazo_nao_presume_dispensa_e_separa_fases(self):
        oficio = ler_oficio(self.origem)
        relatorio = relatorio_pendencias(oficio, pendencias_oficio(oficio))
        self.assertIn("23 dias", relatorio)
        self.assertIn("40 dias", relatorio)
        self.assertIn("não comprova dispensa formal", relatorio)
        self.assertIn("APÓS ASSINATURA DO TERMO", relatorio)
        self.assertIn("2.3.3.1", relatorio)

    def test_html_escapado_e_link_clicavel(self):
        resultado = _fmt('Texto <script> & https://drive.google.com/file/d/teste/view?x=1&y=2')
        self.assertIn("&lt;script&gt; &amp;", resultado)
        self.assertIn('<link href="https://drive.google.com/file/d/teste/view?x=1&amp;y=2"', resultado)
        self.assertNotIn("<script>", resultado)

    def test_pdf_sempre_final_assinado_mesmo_com_pendencias(self):
        original_assinatura = LayoutPdf.bloco_assinatura
        original_construir = LayoutPdf.construir
        for exigir_final in (False, True):
            with self.subTest(exigir_final=exigir_final), \
                 patch.object(LayoutPdf, "bloco_assinatura", autospec=True,
                              side_effect=original_assinatura) as assinatura, \
                 patch.object(LayoutPdf, "construir", autospec=True,
                              side_effect=original_construir) as construir:
                destino = gerar_pdf_oficio(self.origem, self.config, exigir_final=exigir_final)
                self.assertEqual(destino.read_bytes()[:5], b"%PDF-")
                self.assertTrue(assinatura.call_args.kwargs["assinar"])
                self.assertEqual(construir.call_args.kwargs["marca_dagua"], "")
                historia = construir.call_args.args[2]
                textos = [elemento.getPlainText() for elemento in historia if hasattr(elemento, "getPlainText")]
                self.assertNotIn("RASCUNHO", " ".join(textos))
        relatorio = self.origem.with_suffix(".pendencias.txt")
        self.assertTrue(relatorio.exists())
        self.assertIn("endereco:", relatorio.read_text(encoding="utf-8"))

    def test_acesso_anexos_rotulos_curtos_e_urls_escapadas(self):
        documento = _acesso_documento("https://drive.google.com/file/d/ID/view?x=1&y=2")
        self.assertIn("<u>Abrir documento</u>", documento)
        self.assertIn('href="https://drive.google.com/file/d/ID/view?x=1&amp;y=2"', documento)
        pasta = _acesso_documento("https://drive.google.com/drive/folders/ID")
        self.assertIn("<u>Abrir pasta</u>", pasta)
        self.assertEqual(_acesso_documento("https://drive.google.com/file/d/SUBSTITUIR_ID/view"), "A disponibilizar")
        self.assertEqual(_acesso_documento("http://exemplo.com/anexo"), "Link a revisar")
        self.assertEqual(_acesso_documento(""), "A disponibilizar")

    def test_tabela_anexos_alinhada_esquerda_sem_urls_longas_visiveis(self):
        layout = LayoutPdf.criar(self.config)
        url = "https://drive.google.com/file/d/" + "ID_LONGO_" * 40 + "/view"
        tabela = _tabela_documentos([("2.2.1 — Comprovante de inscrição no CNPJ", url),
                                    ("Estatuto", "https://drive.google.com/file/d/SUBSTITUIR_ID/view")], layout)
        self.assertEqual(tabela.repeatRows, 1)
        self.assertEqual(tabela._cellvalues[1][0].style.alignment, TA_LEFT)
        self.assertEqual(tabela._cellvalues[1][1].style.alignment, TA_LEFT)
        self.assertEqual(tabela._cellvalues[1][1].getPlainText(), "Abrir documento")
        self.assertEqual(tabela._cellvalues[2][1].getPlainText(), "A disponibilizar")
        largura, _ = tabela.wrap(layout.largura_util, 500)
        self.assertAlmostEqual(largura, layout.largura_util)

    def test_regerar_reflete_edicao_e_final_recebe_assinatura(self):
        oficio = self.pronto()
        oficio.dados["oficio"]["numero"] = "002/2026"
        oficio.dados["oficio"]["data"] = "10/10/2026"
        self.salvar(oficio)
        original_assinatura = LayoutPdf.bloco_assinatura
        original_construir = LayoutPdf.construir
        with patch.object(LayoutPdf, "bloco_assinatura", autospec=True,
                          side_effect=original_assinatura) as assinatura, \
             patch.object(LayoutPdf, "construir", autospec=True,
                          side_effect=original_construir) as construir:
            destino = gerar_pdf_oficio(self.origem, self.config, exigir_final=True)
            self.assertEqual(destino.read_bytes()[:5], b"%PDF-")
            self.assertTrue(assinatura.call_args.kwargs["assinar"])
            self.assertEqual(construir.call_args.kwargs["marca_dagua"], "")
            self.assertEqual(construir.call_args.args[3], "OFÍCIO Nº 002/2026")
            self.assertIn("10 de outubro de 2026", assinatura.call_args.args[1])

    def test_assinatura_ausente_nao_permite_final(self):
        self.pronto()
        config = replace(self.config, assinatura=Path(self.temp.name) / "ausente.png")
        for exigir_final in (False, True):
            with self.subTest(exigir_final=exigir_final), self.assertRaisesRegex(ValueError, "Assinatura do Presidente não encontrada"):
                gerar_pdf_oficio(self.origem, config, exigir_final=exigir_final)
        relatorio = self.origem.with_suffix(".pendencias.txt").read_text(encoding="utf-8")
        self.assertIn("Assinatura do Presidente", relatorio)

    def test_logomarca_ausente_avisa_em_vez_de_emitir_sem_timbre(self):
        config = replace(self.config, logo=Path(self.temp.name) / "logo-ausente.png")
        with self.assertRaisesRegex(ValueError, "Papel timbrado indisponível"):
            gerar_pdf_oficio(self.origem, config)


if __name__ == "__main__":
    unittest.main()
