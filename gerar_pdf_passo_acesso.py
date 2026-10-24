"""Gera um PDF com o passo a passo de como o usuario acessa o sistema interno.

Documento de apoio para a diretoria/admin compartilhar com novos usuarios
(associados, arbitragem, diretoria). Reproduz o mesmo conteudo do bloco
"Como o usuario acessa o sistema" da tela Usuarios do sistema.

Uso:
    python gerar_pdf_passo_acesso.py
    python gerar_pdf_passo_acesso.py "caminho/saida.pdf"
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

AZUL = "#1F3A68"
CINZA = "#51606E"
FUNDO_CMD = "#0F172A"

LINK_DIRETO = (
    "https://script.google.com/macros/s/"
    "AKfycbwKfTZWMkmv80XbwvmfNyRHltEUFGOYQ3srJz9TKODKvbL5nu5FTuB5YR7KJ_3jwF7weg/exec"
)
LINK_PORTAL = "https://portal.aeuv.org/sistema/"

ASSOCIACAO = "AEUV (Associação Esportiva Uberlandense Varzeana)"


def _estilos():
    base = ParagraphStyle("base", fontName="Helvetica", fontSize=10.5, leading=15,
                          textColor=colors.HexColor("#1B2430"), alignment=TA_LEFT)
    return {
        "titulo": ParagraphStyle("titulo", parent=base, fontName="Helvetica-Bold",
                                 fontSize=17, leading=21, textColor=colors.HexColor(AZUL),
                                 spaceAfter=2),
        "subtitulo": ParagraphStyle("subtitulo", parent=base, fontSize=10,
                                    textColor=colors.HexColor(CINZA), spaceAfter=10),
        "intro": ParagraphStyle("intro", parent=base, spaceAfter=10),
        "passo": ParagraphStyle("passo", parent=base, spaceAfter=4),
        "sub": ParagraphStyle("sub", parent=base, fontSize=10, leading=14, spaceAfter=2),
        "cmd": ParagraphStyle("cmd", parent=base, fontName="Courier", fontSize=8.5,
                              leading=12, textColor=colors.white,
                              backColor=colors.HexColor(FUNDO_CMD),
                              borderPadding=(6, 8, 6, 8), spaceBefore=4, spaceAfter=4),
        "nota": ParagraphStyle("nota", parent=base, fontSize=9, textColor=colors.HexColor(CINZA),
                               spaceBefore=6),
        "rodape": ParagraphStyle("rodape", parent=base, fontSize=8,
                                 textColor=colors.HexColor(CINZA)),
    }


def _passo(texto, est, extras=None):
    """Um item de lista numerada: paragrafo + flowables extras (cmd, subitens)."""
    conteudo = [Paragraph(texto, est["passo"])]
    if extras:
        conteudo.extend(extras)
    return ListItem(conteudo, value=None)


def construir(saida: Path) -> Path:
    est = _estilos()
    doc = SimpleDocTemplate(
        str(saida), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=1.8 * cm,
        title="Como acessar o Sistema Interno - AEUV",
    )

    hist = []
    hist.append(Paragraph("Como acessar o Sistema Interno", est["titulo"]))
    hist.append(Paragraph(ASSOCIACAO + " &middot; Passo a passo de acesso", est["subtitulo"]))
    hist.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#C9D1DE"),
                           spaceAfter=10))

    hist.append(Paragraph(
        "O acesso é pela <b>conta Google</b> da pessoa. O e-mail cadastrado no sistema precisa "
        "ser exatamente o mesmo da conta Google com que ela vai entrar.", est["intro"]))

    # Sub-etapas da autorização (passo 3).
    sub_auth = ListFlowable([
        ListItem(Paragraph("Escolha a <b>conta Google</b> cujo e-mail foi cadastrado no sistema.",
                           est["sub"])),
        ListItem(Paragraph(
            'Vai aparecer o aviso <i>"O Google não verificou este app"</i>. Clique em '
            '<b>Avançado</b> (ou "Configurações avançadas") e depois em '
            '<b>Acessar [nome do app] (não seguro)</b>. É seguro: o app é da própria associação; '
            "esse aviso só existe porque é um app interno, não publicado para o público.",
            est["sub"])),
        ListItem(Paragraph(
            "Na tela de permissões, <b>marque todas as caixas</b> de acesso solicitadas "
            "(todas precisam estar marcadas para o sistema funcionar).", est["sub"])),
        ListItem(Paragraph("Clique em <b>Continuar</b> / <b>Permitir</b>.", est["sub"])),
    ], bulletType="a", leftIndent=16, bulletFontName="Helvetica")

    passos = ListFlowable([
        _passo(
            "<b>Cadastre o e-mail Google</b> da pessoa (Gmail ou conta Google corporativa) na "
            "tela <i>Usuários do sistema &rarr; Conceder acesso</i>, escolhendo o perfil "
            "(Diretoria, Arbitragem ou Associado).", est),
        _passo(
            "<b>No PRIMEIRO acesso, use o link direto</b> abaixo (não o do portal). A "
            "autorização do Google não funciona com o sistema embutido no portal, por isso a "
            "primeira vez precisa ser por este link, aberto numa aba comum do navegador. Dica: "
            "se a pessoa tiver várias contas Google logadas, abra numa <b>janela anônima</b> e "
            "entre só com a conta cadastrada, para o Google não abrir na conta errada.", est,
            [Paragraph(LINK_DIRETO, est["cmd"])]),
        _passo(
            "<b>Autorize o acesso do app (só na primeira vez).</b> O Google mostra algumas "
            "telas &mdash; siga nesta ordem:", est, [sub_auth]),
        _passo(
            "<b>Depois de autorizar uma vez</b>, a pessoa já usa o link normal do dia a dia, "
            "inclusive salvando nos favoritos:", est,
            [Paragraph(LINK_PORTAL, est["cmd"])]),
        _passo(
            "<b>Pronto:</b> o sistema abre com as telas do perfil dela. Se aparecer "
            '"acesso negado", confira se o e-mail cadastrado é idêntico ao da conta Google '
            'usada. Se aparecer erro do Google Drive ou "não foi possível abrir", quase sempre '
            "é a conta errada do navegador (várias contas logadas) ou a autorização que faltou "
            "&mdash; abra em janela anônima com a conta certa e repita o passo do link direto.",
            est),
    ], bulletType="1", leftIndent=18, bulletFontName="Helvetica-Bold")

    hist.append(passos)
    hist.append(Spacer(1, 8))
    hist.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#C9D1DE"),
                           spaceAfter=6))
    hist.append(Paragraph(
        "As permissões de telas por perfil são ajustadas em <i>Editar permissões</i>, na tela "
        "Usuários do sistema, e valem na hora.", est["nota"]))
    hist.append(Spacer(1, 14))
    hist.append(Paragraph(
        ASSOCIACAO + " &middot; Documento gerado em " + date.today().strftime("%d/%m/%Y"),
        est["rodape"]))

    doc.build(hist)
    return saida


def main() -> int:
    saida = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("downloads") / "Como acessar o Sistema Interno - AEUV.pdf"
    saida.parent.mkdir(parents=True, exist_ok=True)
    caminho = construir(saida)
    print(f"PDF gerado em: {caminho}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
