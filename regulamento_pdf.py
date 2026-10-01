"""Geracao do PDF do regulamento da competicao, no mesmo layout da Nota Oficial.

Le o arquivo texto do regulamento (ex.: regulamento\\regulamento-7-super-liga-união-2026.txt),
organiza capitulos, artigos, paragrafos e incisos e gera o PDF com logomarca, cabecalho,
rodape e assinatura digitalizada do Presidente, ao lado do arquivo de origem.
"""

from __future__ import annotations

import argparse
import logging
import re
import unicodedata
from datetime import date
from pathlib import Path

from nota_pdf import AZUL, AZUL_CLARO, DEFAULT_CONFIG_PATH, LOGGER, ConfigPdf, LayoutPdf

PASTA_PADRAO = Path("regulamento")
RE_ARTIGO_TITULO = re.compile(r"^ART\.?\s*\d+(?:\.\d+)?\s*:", re.IGNORECASE)
RE_ARTIGO_INLINE = re.compile(r"^(ART\.?\s*\d+(?:\.\d+)?)\s+(.+)$", re.IGNORECASE)
RE_PARAGRAFO = re.compile(r"^(§\s*(?:\d+º?(?:-[A-Z])?)?\s*[–-]?\s*)(.*)$")
RE_INCISO = re.compile(r"^[IVXL]+\s*[–-]")


def remover_emojis(linha: str) -> str:
    """Remove emojis/pictogramas (a fonte do PDF nao os desenha) mantendo §, º, ª, travessao etc."""
    sem = "".join(c for c in linha if unicodedata.category(c) != "So" and c not in "\ufe0f\u200d\u20e3")
    return re.sub(r"[ \t]{2,}", " ", sem)


def comecava_com_emoji(linha: str) -> bool:
    limpa = linha.strip()
    return bool(limpa) and unicodedata.category(limpa[0]) == "So"


def localizar_regulamento(nome: str) -> Path:
    """Aceita caminho completo ou so o nome; tolera o arquivo existir com ou sem a extensao .txt."""
    caminho = Path(nome)
    candidatos = [caminho, PASTA_PADRAO / caminho.name]
    for base in list(candidatos):
        candidatos.append(base.with_name(base.name[:-4]) if base.suffix.lower() == ".txt"
                          else base.with_name(base.name + ".txt"))
    for candidato in candidatos:
        if candidato.is_file():
            return candidato
    raise FileNotFoundError(f"Regulamento '{nome}' nao encontrado (procurado tambem em {PASTA_PADRAO}\\)")


def titulo_do_arquivo(caminho: Path) -> str:
    """regulamento-7-super-liga-união-2026(.txt) -> 7ª SUPER LIGA UNIÃO 2026."""
    nome = caminho.name[:-4] if caminho.suffix.lower() == ".txt" else caminho.name
    nome = re.sub(r"^regulamento[-_ ]*", "", nome, flags=re.IGNORECASE)
    nome = re.sub(r"[-_]+", " ", nome).strip()
    nome = re.sub(r"^(\d+)\s", r"\1ª ", nome)
    return nome.upper()


def _negrito_prefixo(prefixo: str, resto: str) -> str:
    return f"<b>{prefixo}</b> {resto}".strip()


def extrair_secoes_sumario(linhas: list[str]) -> list[tuple[str, str, str]]:
    """Analisa o arquivo do regulamento e extrai dinamicamente os capítulos, faixa de artigos e temas."""
    capitulos_nomes = {
        "DISPOSIÇÕES": "DISPOSIÇÕES & PREMIAÇÃO",
        "PREMIAÇÃO": "DISPOSIÇÕES & PREMIAÇÃO",
        "PREMIAÇÕES": "DISPOSIÇÕES & PREMIAÇÃO",
        "INSCRIÇÕES": "INSCRIÇÕES & ELEGIBILIDADE",
        "JOGO": "CONDUTA & JOGO",
        "DA PARTIDA": "DA PARTIDA & OPERAÇÃO",
        "PARTIDA": "DA PARTIDA & OPERAÇÃO",
        "DISCIPLINA": "DISCIPLINA, PENAS & RECURSOS",
    }

    resumos_padrao = {
        "DISPOSIÇÕES & PREMIAÇÃO": "Datas, campos oficiais, premiações coletivas e individuais, impedimentos disciplinares e desempate.",
        "INSCRIÇÕES & ELEGIBILIDADE": "Taxa e prazos, atletas federados (competição varzeana), vedações, comissão técnica, menores e desistência.",
        "CONDUTA & JOGO": "Identificação e obrigações, condutas proibidas, bolas oficiais da partida e padronização de uniformes.",
        "DA PARTIDA & OPERAÇÃO": "Substituições volantes, taxas de arbitragem e campo, horários, tolerâncias, adiamentos e direito de imagem.",
        "DISCIPLINA, PENAS & RECURSOS": "Brigas, agressões, W.O., penas pecuniárias e suspensões, cartões, jogos interrompidos, súmulas e recursos.",
    }

    def _sintetizar(titulos: list[str]) -> str:
        limpos = []
        for t in titulos:
            t_clean = re.sub(r"^(Disposições Preliminares e\s*)", "", t, flags=re.I)
            t_clean = re.sub(r"\s*/\s*Competição.*$", "", t_clean, flags=re.I)
            t_clean = re.sub(r":.*$", "", t_clean).strip()
            if t_clean and t_clean.lower() not in [x.lower() for x in limpos]:
                limpos.append(t_clean)
        if len(limpos) > 5:
            return ", ".join(limpos[:4]) + ", " + limpos[-1] + "."
        return ", ".join(limpos) + "."

    cap_atual = "DISPOSIÇÕES & PREMIAÇÃO"
    secoes_map: dict[str, list[tuple[int, str]]] = {}
    ordem_caps: list[str] = []

    for l in linhas:
        limpa = remover_emojis(l).strip()
        if comecava_com_emoji(l) and len(limpa) <= 45 and not re.search(r"\d|§", limpa):
            nome_norm = limpa.upper()
            nome_final = None
            for k, v in capitulos_nomes.items():
                if k in nome_norm:
                    nome_final = v
                    break
            if not nome_final:
                nome_final = nome_norm
            if nome_final not in ("FORMA DE DISPUTA", "TABELA"):
                cap_atual = nome_final

        elif RE_ARTIGO_TITULO.match(limpa):
            m = re.match(r"^(ART\.?\s*\d+)\s*:\s*(.*)$", limpa, re.I)
            if m:
                num = int(re.search(r"\d+", m.group(1)).group(0))
                tit = m.group(2).strip()
                if cap_atual not in secoes_map:
                    secoes_map[cap_atual] = []
                    ordem_caps.append(cap_atual)
                secoes_map[cap_atual].append((num, tit))

    resultado = []
    for cap in ordem_caps:
        arts = secoes_map[cap]
        nums = [a[0] for a in arts]
        faixa = f"Arts. {nums[0]}º a {nums[-1]}º" if len(nums) > 1 else f"Art. {nums[0]}º"
        titulos = [a[1] for a in arts]
        desc = resumos_padrao.get(cap, _sintetizar(titulos))
        resultado.append((cap, faixa, desc))

    return resultado


def construir_quadro_sumario(layout: LayoutPdf, linhas: list[str]) -> list:
    """Gera os elementos visuais do Sumário Geral / Índice Temático na primeira página a partir do arquivo."""
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import PageBreak, Paragraph, Spacer, Table, TableStyle

    fmt, base = layout.fmt, layout.base
    cab_style = ParagraphStyle("cab_sum", parent=base, fontName=layout.negrito, fontSize=9.5, leading=12, textColor=colors.white)
    cap_style = ParagraphStyle("cap_sum", parent=base, fontName=layout.negrito, fontSize=9, leading=12, textColor=colors.HexColor(AZUL))
    art_style = ParagraphStyle("art_sum", parent=base, fontName=layout.negrito, fontSize=9, leading=12, textColor=colors.HexColor("#1B5E20"), alignment=1)
    desc_style = ParagraphStyle("desc_sum", parent=base, fontSize=8.5, leading=11.5, textColor=colors.HexColor("#2C3E50"))
    info_style = ParagraphStyle("info_sum", parent=base, fontSize=9, leading=13, textColor=colors.HexColor("#5A6270"), alignment=1)

    secoes = extrair_secoes_sumario(linhas)

    data = [[
        Paragraph("CAPÍTULO / SEÇÃO", cab_style),
        Paragraph("ARTIGOS", cab_style),
        Paragraph("PRINCIPAIS ASSUNTOS TRATADOS", cab_style),
    ]]
    for cap, arts, desc in secoes:
        data.append([Paragraph(fmt(cap), cap_style), Paragraph(fmt(arts), art_style), Paragraph(fmt(desc), desc_style)])

    largura_total = layout.largura_util
    tabela = Table(data, colWidths=[5.6 * cm, 2.6 * cm, largura_total - 8.2 * cm])
    tabela.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(AZUL)),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(AZUL_CLARO)]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B0BEC5")),
    ]))

    return [
        Spacer(1, 14),
        layout.faixa("SUMÁRIO GERAL / ÍNDICE DOS ARTIGOS"),
        Spacer(1, 10),
        tabela,
        Spacer(1, 15),
        Paragraph("<i>Consulte os capítulos e artigos acima para localização rápida das regras e dispositivos deste regulamento.</i>", info_style),
        PageBreak(),
    ]


def gerar_pdf_regulamento(arquivo: str | Path, config: ConfigPdf | None = None, titulo: str | None = None,
                          logger: logging.Logger = LOGGER) -> Path:
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import CondPageBreak, Paragraph, Spacer

    from sumula_disciplinar import data_por_extenso

    config = config or ConfigPdf.carregar()
    origem = localizar_regulamento(str(arquivo))
    subtitulo = titulo or titulo_do_arquivo(origem)
    layout = LayoutPdf.criar(config, logger)
    fmt, estilos, base = layout.fmt, layout.estilos, layout.base
    artigo = ParagraphStyle("artigo", parent=estilos["item"], fontSize=11, textColor=colors.HexColor(AZUL))
    paragrafo = ParagraphStyle("paragrafo", parent=base, leftIndent=8)
    inciso = ParagraphStyle("inciso", parent=base, leftIndent=26, spaceAfter=3)

    historia: list = [Paragraph("REGULAMENTO OFICIAL", estilos["titulo"])]
    if subtitulo:
        historia.append(Paragraph(fmt(subtitulo), estilos["subtitulo"]))

    linhas = origem.read_text(encoding="utf-8-sig").replace("\r", "").split("\n")

    # Sumário executivo na primeira página (extraído dinamicamente das linhas do arquivo)
    historia.extend(construir_quadro_sumario(layout, linhas))

    # Início do texto integral do regulamento
    historia.append(Paragraph("REGULAMENTO OFICIAL", estilos["titulo"]))
    if subtitulo:
        historia.append(Paragraph(fmt(subtitulo), estilos["subtitulo"]))

    ultima_faixa = ""
    for bruta in linhas:
        emoji_inicial = comecava_com_emoji(bruta)
        limpa = remover_emojis(bruta).strip()
        if not limpa or re.fullmatch(r"[-_.=\s]+", limpa):
            continue
        html = fmt(limpa)

        # Capitulo: linha curta iniciada por emoji, sem numeros nem paragrafo (ex.: "🖊️ Inscrições").
        if emoji_inicial and len(limpa) <= 45 and not re.search(r"\d|§", limpa):
            if limpa.casefold() != ultima_faixa:
                historia += [CondPageBreak(3 * cm), Spacer(1, 8), layout.faixa(limpa.upper()), Spacer(1, 6)]
                ultima_faixa = limpa.casefold()
            continue
        ultima_faixa = ""

        if RE_ARTIGO_TITULO.match(limpa):
            historia.append(CondPageBreak(2.5 * cm))
            historia.append(layout.caixa([Paragraph(html, artigo)], AZUL_CLARO, AZUL))
            historia.append(Spacer(1, 4))
        elif (achado := RE_ARTIGO_INLINE.match(limpa)) and len(limpa) > 60:
            historia.append(Paragraph(_negrito_prefixo(fmt(achado.group(1)), fmt(achado.group(2))), base))
        elif limpa.startswith("§"):
            achado = RE_PARAGRAFO.match(limpa)
            prefixo, resto = achado.group(1), achado.group(2)
            if ":" in resto[:70]:
                rotulo, _, texto = resto.partition(":")
                prefixo, resto = f"{prefixo}{rotulo}:", texto
            elif len(limpa) <= 80:
                prefixo, resto = limpa, ""
            historia.append(Paragraph(_negrito_prefixo(fmt(prefixo), fmt(resto)), paragrafo))
        elif RE_INCISO.match(limpa):
            historia.append(Paragraph(html, inciso))
        elif len(limpa) <= 80 and limpa == limpa.upper() and any(c.isalpha() for c in limpa):
            historia.append(Paragraph(html, estilos["item"]))
        else:
            historia.append(Paragraph(html, base))

    linha_data = f"{config.cidade}, {data_por_extenso(date.today())}." if config.cidade else ""
    finais = [config.associacao] + ([config.competicao] if config.competicao else [])
    historia.append(layout.bloco_assinatura(linha_data, finais, assinar=True))

    destino = origem.with_name((origem.name[:-4] if origem.suffix.lower() == ".txt" else origem.name) + ".pdf")
    rodape = f"Regulamento {subtitulo.title()}" if subtitulo else "Regulamento"
    layout.construir(destino, historia, f"Regulamento {subtitulo}".strip(), rodape=rodape)
    logger.info("[PDF] PDF do regulamento gerado em %s", destino)
    return destino


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera o PDF do regulamento no layout da Associacao AEUV")
    parser.add_argument("arquivo", help="Nome ou caminho do regulamento (ex.: regulamento-7-super-liga-união-2026.txt)")
    parser.add_argument("--titulo", help="Subtitulo do PDF (padrao: derivado do nome do arquivo)")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    print(gerar_pdf_regulamento(args.arquivo, ConfigPdf.carregar(Path(args.config)), args.titulo))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
