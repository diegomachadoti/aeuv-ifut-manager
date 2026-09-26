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

    ultima_faixa = ""
    linhas = origem.read_text(encoding="utf-8-sig").replace("\r", "").split("\n")
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
