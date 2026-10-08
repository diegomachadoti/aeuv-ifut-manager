from __future__ import annotations

import io
import re
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import Paragraph, Table

import documento_pdf
from documento_pdf import (
    MODELOS_FILIACAO, criar_modelos_filiacao, formatar_inline, gerar_pdf_documento,
    gerar_pdfs_filiacao, ler_documento, montar_conteudo,
)
from nota_pdf import ConfigPdf, LayoutPdf


class DocumentoPdfTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.pasta = Path(self.temp.name)
        self.arquivos = criar_modelos_filiacao(self.pasta)
        logo, assinatura = self.pasta / "logo.png", self.pasta / "assinatura-ficticia.png"
        Image.new("RGB", (100, 100), "white").save(logo)
        Image.new("RGB", (100, 30), "white").save(assinatura)
        self.config = ConfigPdf(self.pasta, logo, "", "AEUV", "NÃO USAR COMPETIÇÃO", "Uberlândia/MG",
                                assinatura, "Presidente de teste", "Presidente")

    def escrever(self, documento):
        cabecalho = io.StringIO()
        documento.dados.write(cabecalho)
        documento.origem.write_text(cabecalho.getvalue() + "---\n" + documento.corpo, encoding="utf-8")

    def contar_paginas(self, arquivo):
        return len(re.findall(rb"/Type\s*/Page\b", arquivo.read_bytes()))

    def test_cria_quatro_modelos_sem_sobrescrever(self):
        self.assertEqual([p.name for p in self.arquivos], list(MODELOS_FILIACAO.values()))
        self.assertEqual(len(self.arquivos), 4)
        self.arquivos[0].write_text("Ficha já preenchida", encoding="utf-8")
        with self.assertRaises(FileExistsError):
            criar_modelos_filiacao(self.pasta)
        self.assertEqual(self.arquivos[0].read_text(encoding="utf-8"), "Ficha já preenchida")

    def test_cria_apenas_plano_sem_alterar_ficha_existente(self):
        pasta = self.pasta / "copia-seletiva"
        pasta.mkdir()
        ficha = pasta / "ficha-filiacao.txt"
        ficha.write_text("Ficha preenchida", encoding="utf-8")
        self.assertEqual(criar_modelos_filiacao(pasta, tipos=("plano",)), [pasta / "plano-associado.txt"])
        self.assertEqual(ficha.read_text(encoding="utf-8"), "Ficha preenchida")
        with self.assertRaises(ValueError):
            criar_modelos_filiacao(pasta, tipos=("inexistente",))

    def test_plano_publico_inclui_requisitos_taxas_beneficios_e_contatos_editaveis(self):
        plano = ler_documento(self.pasta / "plano-associado.txt")
        texto = plano.substituir(plano.corpo)
        for trecho in ("R$ 150,00", "R$ 100,00", "anual, por equipe", "Vínculo exclusivo",
                       "membros da diretoria ou representantes legais", "autenticado em cartório",
                       "Termo de responsabilidade", "comprovante de endereço",
                       "somente quando necessária", "não é exigida de todas", "emendas parlamentares futuras",
                       "Não há garantia", "Certificado de Filiação", "recibo de pagamento",
                       "associacaoaeuv@gmail.com"):
            self.assertIn(trecho.casefold(), texto.casefold())
        self.assertNotIn("___", texto)
        self.assertNotIn("Iure", texto)
        self.assertEqual(plano.campo("assinatura", "tipo"), "nenhuma")
        plano.dados["dados"]["taxa_inicial"] = "R$ 175,00"
        plano.dados["dados"]["email"] = "contato@example.org"
        self.escrever(plano)
        atualizado = ler_documento(plano.origem)
        self.assertIn("R$ 175,00", atualizado.substituir(atualizado.corpo))
        self.assertIn("contato@example.org", atualizado.substituir(atualizado.corpo))

    def test_plano_pdf_duas_paginas_sem_imagem_de_assinatura(self):
        config = replace(self.config, assinatura=self.pasta / "ausente.png")
        with patch.object(LayoutPdf, "bloco_assinatura") as assinatura:
            pdf = gerar_pdf_documento(self.pasta / "plano-associado.txt", config)
            self.assertEqual(self.contar_paginas(pdf), 2)
            assinatura.assert_not_called()

    def test_ata_refletida_nos_modelos_sem_desligamento_obrigatorio_para_todos(self):
        ficha = ler_documento(self.pasta / "ficha-filiacao.txt")
        self.assertIn("R$ 150,00", ficha.corpo)
        self.assertIn("R$ 100,00", ficha.corpo)
        self.assertIn("Somente se houver vínculo anterior", ficha.corpo)
        self.assertIn("não mantém filiação simultânea", ficha.corpo)
        self.assertIn("de outra associação varzeana", ficha.corpo)
        self.assertIn("confirmac", ficha.corpo.replace("ç", "c").replace("ã", "a"))

    def test_todos_os_modelos_resolvem_as_variaveis(self):
        for arquivo in self.arquivos:
            with self.subTest(arquivo=arquivo.name):
                documento = ler_documento(arquivo)
                self.assertNotRegex(documento.substituir(documento.corpo), r"\{\{\w+}}")
                self.assertNotIn("{{", documento.campo("documento", "subtitulo"))
                self.assertNotIn("{{", documento.campo("assinatura", "data"))

    def test_variavel_ausente_explica_como_corrigir(self):
        documento = ler_documento(self.arquivos[0])
        with self.assertRaisesRegex(ValueError, "seção \\[dados\\]"):
            documento.substituir("Equipe {{campo_inexistente}}")

    def test_formato_do_txt_e_tipo_de_assinatura(self):
        invalido = self.pasta / "invalido.txt"
        invalido.write_text("Texto sem separador", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Separe"):
            ler_documento(invalido)
        documento = ler_documento(self.arquivos[0])
        documento.dados["assinatura"]["tipo"] = "outro"
        self.escrever(documento)
        with self.assertRaisesRegex(ValueError, "presidente, manual ou nenhuma"):
            gerar_pdf_documento(documento.origem, self.config)

    def test_inline_negrito_azul_e_html_escapado(self):
        html = formatar_inline('<script> **Aprovado** & https://exemplo.com/?x=1&y=2')
        self.assertIn("&lt;script&gt;", html)
        self.assertNotIn("<script>", html)
        self.assertIn('<font color="#1F3A68"><b>Aprovado</b></font>', html)
        self.assertIn('href="https://exemplo.com/?x=1&amp;y=2"', html)

    def test_marcadores_tabelas_e_comentarios(self):
        layout = LayoutPdf.criar(self.config)
        historia = montar_conteudo(
            '# comentário não impresso\n* CAPÍTULO\n> Subtítulo\n- Item\n**Primeiro** trecho\n'
            '| Nome | CPF |\n| --- | --- |\n| Equipe | ______ |', layout)
        tabelas = [p for p in historia if isinstance(p, Table)]
        self.assertEqual(len(tabelas), 3)
        self.assertEqual(tabelas[-1].repeatRows, 1)
        self.assertEqual(getattr(tabelas[-1], "_cellvalues")[1][0].style.alignment, TA_LEFT)
        paragrafos = [p for p in historia if isinstance(p, Paragraph)]
        self.assertTrue(any(p.bulletText == "•" for p in paragrafos))
        self.assertTrue(any(p.getPlainText() == "Primeiro trecho" for p in paragrafos))
        self.assertFalse(any("comentário" in p.getPlainText() for p in paragrafos))

    def test_ficha_assinatura_manual_da_equipe_sem_imagem_do_presidente(self):
        documento = ler_documento(self.pasta / "ficha-filiacao.txt")
        documento.dados["dados"]["representante"] = "Representante da Equipe"
        self.escrever(documento)
        config = replace(self.config, assinatura=self.pasta / "ausente.png")
        original = LayoutPdf.bloco_assinatura
        with patch.object(LayoutPdf, "bloco_assinatura", autospec=True, side_effect=original) as assinatura:
            pdf = gerar_pdf_documento(documento.origem, config)
            self.assertFalse(assinatura.call_args.kwargs["assinar"])
            self.assertEqual(assinatura.call_args.args[0].config.assinatura_nome, "Representante da Equipe")
            self.assertEqual(self.contar_paginas(pdf), 2)

    def test_certificado_e_recibo_assinados_sem_marca_dagua_ou_competicao(self):
        original_assinatura, original_construir = LayoutPdf.bloco_assinatura, LayoutPdf.construir
        for nome in ("certificado-filiacao.txt", "recibo-filiacao.txt"):
            with self.subTest(nome=nome), \
                 patch.object(LayoutPdf, "bloco_assinatura", autospec=True,
                              side_effect=original_assinatura) as assinatura, \
                 patch.object(LayoutPdf, "construir", autospec=True,
                              side_effect=original_construir) as construir:
                pdf = gerar_pdf_documento(self.pasta / nome, self.config)
                self.assertTrue(assinatura.call_args.kwargs["assinar"])
                self.assertEqual(construir.call_args.kwargs["marca_dagua"], "")
                self.assertEqual(assinatura.call_args.args[0].config.competicao, "")
                self.assertEqual(self.contar_paginas(pdf), 1)

    def test_regenerar_recibo_com_renovacao_usa_valores_editados(self):
        documento = ler_documento(self.pasta / "recibo-filiacao.txt")
        documento.dados["dados"].update({"valor": "100,00", "valor_extenso": "cem reais",
                                         "tipo_filiacao": "Renovação anual", "equipe": "Equipe Teste"})
        self.escrever(documento)
        original = LayoutPdf.construir
        textos = []

        def construir_e_capturar(layout, destino, historia, *args, **kwargs):
            textos.extend(p.getPlainText() for p in historia if isinstance(p, Paragraph))
            return original(layout, destino, historia, *args, **kwargs)

        with patch.object(LayoutPdf, "construir", autospec=True, side_effect=construir_e_capturar):
            pdf = gerar_pdf_documento(documento.origem, self.config)
            texto = " ".join(textos)
            self.assertIn("R$ 100,00 (cem reais)", texto)
            self.assertIn("Renovação anual", texto)
            self.assertIn("Equipe Teste", texto)
            self.assertNotIn("150,00", texto)
            self.assertEqual(pdf.read_bytes()[:5], b"%PDF-")

    def test_documento_livre_sem_assinatura_sem_validacao_de_negocio(self):
        documento = ler_documento(self.pasta / "recibo-filiacao.txt")
        documento.dados["assinatura"]["tipo"] = "nenhuma"
        documento.dados["dados"]["valor"] = "[A DEFINIR]"
        documento.dados["dados"]["data_documento"] = "[A DEFINIR]"
        self.escrever(documento)
        with patch.object(LayoutPdf, "bloco_assinatura") as assinatura:
            pdf = gerar_pdf_documento(documento.origem, self.config)
            self.assertTrue(pdf.exists())
            assinatura.assert_not_called()

    def test_assinatura_presidente_ausente_avisa(self):
        config = replace(self.config, assinatura=self.pasta / "ausente.png")
        with self.assertRaisesRegex(ValueError, "assinatura do Presidente"):
            gerar_pdf_documento(self.pasta / "recibo-filiacao.txt", config)

    def test_lote_e_aliases(self):
        with patch.object(documento_pdf, "PASTA_FILIACAO", self.pasta):
            pdfs = gerar_pdfs_filiacao("todos", self.config)
            self.assertEqual(len(pdfs), 4)
            self.assertTrue(all(p.exists() for p in pdfs))
            self.assertEqual(gerar_pdfs_filiacao("recibo", self.config), [self.pasta / "recibo-filiacao.pdf"])
            self.assertEqual(gerar_pdfs_filiacao("plano", self.config), [self.pasta / "plano-associado.pdf"])


if __name__ == "__main__":
    unittest.main()
