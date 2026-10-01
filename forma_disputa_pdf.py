"""Geracao do PDF da Forma de Disputa no layout padrao da Associacao AEUV.

Le os arquivos de texto/markdown da pasta formadisputa (ou arquivo informado),
interpreta secoes, artigos, paragrafos e converte tabelas markdown de rodadas,
fases e auditoria em tabelas formatadas no padrao visual AEUV (cabecalho azul,
linhas zebradas, bordas elegantes), com rodape, cabecalho institucional e bloco
de assinatura oficial.
"""

from __future__ import annotations

import argparse
import logging
import re
import unicodedata
from datetime import date
from pathlib import Path

from nota_pdf import AZUL, AZUL_CLARO, CINZA, VERMELHO, DEFAULT_CONFIG_PATH, LOGGER, ConfigPdf, LayoutPdf

PASTA_PADRAO = Path("formadisputa")
RE_PARAGRAFO = re.compile(r"^(§\s*(?:\d+(?:º|o)?(?:-[A-Z])?)?\s*[–-]?\s*)(.*)$")
RE_INCISO = re.compile(r"^[IVXL]+\s*[–-]")


def remover_emojis(linha: str) -> str:
    """Remove emojis mantendo §, º, ª, travessão etc."""
    sem = "".join(c for c in linha if unicodedata.category(c) != "So" and c not in "\ufe0f\u200d\u20e3")
    return re.sub(r"[ \t]{2,}", " ", sem)


def localizar_forma_disputa(nome: str) -> Path:
    """Aceita caminho direto ou nome de arquivo dentro de formadisputa."""
    caminho = Path(nome)
    candidatos = [caminho, PASTA_PADRAO / caminho.name]
    for base in list(candidatos):
        candidatos.append(base.with_name(base.name[:-4]) if base.suffix.lower() in (".txt", ".md")
                          else base.with_name(base.name + ".md"))
        candidatos.append(base.with_name(base.name + ".txt"))
    for candidato in candidatos:
        if candidato.is_file():
            return candidato
    raise FileNotFoundError(f"Arquivo de forma de disputa '{nome}' nao encontrado (procurado tambem em {PASTA_PADRAO}\\)")


def titulo_do_arquivo(caminho: Path) -> str:
    """forma-disputa-7-super-liga-uniao-2026-3-rodadas -> 7ª SUPER LIGA UNIÃO 2026 (3 RODADAS)."""
    nome = caminho.stem
    nome = re.sub(r"^forma[-_ ]*disputa[-_ ]*", "", nome, flags=re.IGNORECASE)
    nome = re.sub(r"[-_]+", " ", nome).strip()
    nome = re.sub(r"^(\d+)\s", r"\1ª ", nome)
    return nome.upper()


def _eh_linha_tabela(linha: str) -> bool:
    s = linha.strip()
    return s.startswith("|") and s.endswith("|") and s.count("|") >= 2


def _eh_divisor_tabela(linha: str) -> bool:
    s = linha.strip()
    if not (_eh_linha_tabela(s)):
        return False
    miolo = s[1:-1].replace("|", "").replace(":", "").replace("-", "").strip()
    return miolo == ""


def _separar_celulas(linha: str) -> list[str]:
    partes = linha.strip().split("|")[1:-1]
    return [p.strip() for p in partes]


def _formatar_markdown_inline(texto: str, destaque_vermelho: bool = True) -> str:
    """Converte marcadores simples do markdown para HTML suportado pelo ReportLab.
    
    Por padrao, converte **negrito** para vermelho (<font color="..."><b>...</b></font>),
    mantendo o mesmo padrao visual das Notas Oficiais da AEUV.
    """
    if destaque_vermelho:
        t = re.sub(r"\*\*(.+?)\*\*", rf'<font color="{VERMELHO}"><b>\1</b></font>', texto)
    else:
        t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", texto)
    # *italico*
    t = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", t)
    return t


def gerar_tabela_reportlab(bloco_linhas: list[str], layout: LayoutPdf) -> object:
    """Transforma linhas de tabela Markdown em uma Table ReportLab estilizada no padrao AEUV."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph, Table, TableStyle

    linhas_dados: list[list[str]] = []
    tem_cabecalho = False

    for i, l in enumerate(bloco_linhas):
        if _eh_divisor_tabela(l):
            tem_cabecalho = True
            continue
        celulas = _separar_celulas(l)
        if celulas:
            linhas_dados.append(celulas)

    if not linhas_dados:
        return None

    num_colunas = max(len(row) for row in linhas_dados)
    # Normaliza todas as linhas para ter num_colunas
    for row in linhas_dados:
        while len(row) < num_colunas:
            row.append("")

    celula_base = ParagraphStyle("tab_cel", parent=layout.base, fontSize=8, leading=10, spaceAfter=0)
    celula_esq = ParagraphStyle("tab_esq", parent=celula_base, alignment=TA_LEFT)
    celula_centro = ParagraphStyle("tab_cent", parent=celula_base, alignment=TA_CENTER)
    celula_dir = ParagraphStyle("tab_dir", parent=celula_base, alignment=TA_RIGHT)

    # Identificar se a tabela e a tabela consolidada de auditoria (times x rodadas x totais)
    cabecalho_texto = " ".join(linhas_dados[0]).upper()
    eh_auditoria = "TOTAL" in cabecalho_texto or "AUDITORIA" in cabecalho_texto

    # Se for auditoria com 8 colunas, fonte um pouco mais compacta (7pt) para caber campo + horario com folga
    if eh_auditoria and num_colunas == 8:
        celula_base = ParagraphStyle("tab_cel8", parent=layout.base, fontSize=6.8, leading=8.5, spaceAfter=0)
        celula_esq = ParagraphStyle("tab_esq8", parent=celula_base, alignment=TA_LEFT)
        celula_centro = ParagraphStyle("tab_cent8", parent=celula_base, alignment=TA_CENTER)
        celula_dir = ParagraphStyle("tab_dir8", parent=celula_base, alignment=TA_RIGHT)

    cabecalho_esq = ParagraphStyle("tab_cab_esq", parent=celula_esq, fontName=layout.negrito, textColor=colors.white)
    cabecalho_cent = ParagraphStyle("tab_cab_cent", parent=celula_centro, fontName=layout.negrito, textColor=colors.white)

    # Calculo de larguras de colunas
    largura_total = layout.largura_util
    if num_colunas == 5 and not eh_auditoria:
        # Tabela tipica de jogos: Nº | Grupo/Fase | Hora | Campo | Confronto
        proporcoes = [1.2, 1.8, 1.2, 2.3, 4.5]
        soma = sum(proporcoes)
        larguras = [p * (largura_total / soma) for p in proporcoes]
    elif eh_auditoria and num_colunas == 6:
        # Equipe | Rodada 1 | Rodada 2 | Rodada 3 | Total Poli | Total Particulares
        proporcoes = [1.8, 2.2, 2.2, 2.2, 1.3, 1.8]
        soma = sum(proporcoes)
        larguras = [p * (largura_total / soma) for p in proporcoes]
    elif eh_auditoria and num_colunas == 8:
        # Equipe | R1 | R2 | R3 | R4 | R5 | Poli | Part
        proporcoes = [1.5, 1.8, 1.8, 1.8, 1.8, 1.8, 1.1, 1.2]
        soma = sum(proporcoes)
        larguras = [p * (largura_total / soma) for p in proporcoes]
    else:
        larguras = [largura_total / num_colunas] * num_colunas

    linhas_paragrafos: list[list[Paragraph]] = []
    for num_linha, row in enumerate(linhas_dados):
        linha_p = []
        is_header = (num_linha == 0 and tem_cabecalho)
        for col_idx, texto_raw in enumerate(row):
            texto_fmt = _formatar_markdown_inline(texto_raw, destaque_vermelho=not is_header)
            # Escolher alinhamento
            if is_header:
                alinhamento = cabecalho_cent if col_idx in (0, 2) or (eh_auditoria and col_idx >= 1) else cabecalho_esq
                linha_p.append(Paragraph(texto_fmt, alinhamento))
            else:
                if col_idx in (0, 2) or (eh_auditoria and col_idx >= (num_colunas - 2)):
                    estilo = celula_centro
                elif eh_auditoria and col_idx >= 1 and col_idx < (num_colunas - 2):
                    estilo = celula_centro
                else:
                    estilo = celula_esq
                linha_p.append(Paragraph(texto_fmt, estilo))
        linhas_paragrafos.append(linha_p)

    tabela = Table(linhas_paragrafos, colWidths=larguras, repeatRows=1 if tem_cabecalho else 0)
    estilo_tabela = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(AZUL)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9D1DE")),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]

    for idx_linha in range(1, len(linhas_dados)):
        if idx_linha % 2 == 0:
            estilo_tabela.append(("BACKGROUND", (0, idx_linha), (-1, idx_linha), colors.HexColor("#F4F6FA")))

    tabela.setStyle(TableStyle(estilo_tabela))
    return tabela


def gerar_pdf_forma_disputa(arquivo: str | Path, config: ConfigPdf | None = None, titulo: str | None = None,
                            logger: logging.Logger = LOGGER) -> Path:
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import CondPageBreak, KeepTogether, Paragraph, Spacer

    from sumula_disciplinar import data_por_extenso

    config = config or ConfigPdf.carregar()
    origem = localizar_forma_disputa(str(arquivo))
    subtitulo = titulo or titulo_do_arquivo(origem)
    layout = LayoutPdf.criar(config, logger)
    fmt, estilos, base = layout.fmt, layout.estilos, layout.base

    paragrafo = ParagraphStyle("paragrafo", parent=base, leftIndent=8)
    inciso = ParagraphStyle("inciso", parent=base, leftIndent=24, spaceAfter=2)
    item_lista = ParagraphStyle("item_lista", parent=base, leftIndent=14, spaceAfter=3)
    nota_it = ParagraphStyle("nota_it", parent=layout.estilos["citacao"], fontSize=8.5, leading=12, spaceAfter=6)

    historia: list = [
        Paragraph("FORMA DE DISPUTA OFICIAL", estilos["titulo"]),
    ]
    if subtitulo:
        historia.append(Paragraph(fmt(subtitulo), estilos["subtitulo"]))

    linhas = origem.read_text(encoding="utf-8-sig").replace("\r", "").split("\n")
    i = 0
    total_linhas = len(linhas)

    while i < total_linhas:
        bruta = linhas[i]
        limpa = bruta.strip()

        # Linha em branco ou separador markdown
        if not limpa or re.fullmatch(r"[-_.=\s*]+", limpa):
            i += 1
            continue

        # Detectar bloco de tabela markdown
        if _eh_linha_tabela(limpa):
            bloco_tabela = []
            while i < total_linhas and _eh_linha_tabela(linhas[i].strip()):
                bloco_tabela.append(linhas[i])
                i += 1
            tab = gerar_tabela_reportlab(bloco_tabela, layout)
            if tab:
                historia.append(Spacer(1, 4))
                historia.append(tab)
                historia.append(Spacer(1, 8))
            continue

        texto_sem_emoji = remover_emojis(limpa).strip()
        texto_sem_md = re.sub(r"^\s*#+\s*", "", texto_sem_emoji).strip()
        texto_sem_md = re.sub(r"^\*\*(.+?)\*\*$", r"\1", texto_sem_md).strip()

        # Cabecalho de Nivel 1 (# Titulo)
        if limpa.startswith("# ") or (limpa.startswith("## ") and any(term in limpa.upper() for term in ("TABELA", "FASE", "RODADA", "CHAVEAMENTO"))):
            texto_faixa = texto_sem_md.upper()
            historia.append(CondPageBreak(3.5 * cm))
            historia.append(Spacer(1, 6))
            historia.append(layout.faixa(texto_faixa))
            historia.append(Spacer(1, 6))
            i += 1
            continue

        # Subsecao / Rodada / Fase (### Rodada X, etc)
        if limpa.startswith("## ") or limpa.startswith("### "):
            historia.append(CondPageBreak(2.5 * cm))
            rotulo = _formatar_markdown_inline(texto_sem_md, destaque_vermelho=False)
            historia.append(Paragraph(f"<b>{rotulo}</b>", estilos["item"]))
            historia.append(Spacer(1, 3))
            i += 1
            continue

        # Nota em italico entre parenteses
        if limpa.startswith("*(") and limpa.endswith(")*"):
            conteudo_nota = limpa[2:-2].strip()
            historia.append(Paragraph(fmt(conteudo_nota), nota_it))
            i += 1
            continue

        # Itens de lista com marcador '*'
        if limpa.startswith("* ") or limpa.startswith("- "):
            conteudo_item = _formatar_markdown_inline(limpa[2:].strip())
            historia.append(Paragraph(f"• {conteudo_item}", item_lista))
            i += 1
            continue
        if limpa.startswith("    * ") or limpa.startswith("\t* "):
            conteudo_sub = _formatar_markdown_inline(limpa.strip()[2:].strip())
            historia.append(Paragraph(f"– {conteudo_sub}", inciso))
            i += 1
            continue

        # Paragrafos legais (§)
        if texto_sem_md.startswith("§") or texto_sem_md.startswith("Parágrafo"):
            achado = RE_PARAGRAFO.match(texto_sem_md)
            if achado:
                prefixo, resto = achado.group(1), achado.group(2)
                historia.append(Paragraph(f"<b>{fmt(prefixo)}</b> {_formatar_markdown_inline(resto)}", paragrafo))
            else:
                historia.append(Paragraph(_formatar_markdown_inline(texto_sem_md), paragrafo))
            i += 1
            continue

        # Incisos romanos (I -, II -, etc)
        if RE_INCISO.match(texto_sem_md):
            historia.append(Paragraph(_formatar_markdown_inline(texto_sem_md), inciso))
            i += 1
            continue

        # Texto normal
        historia.append(Paragraph(_formatar_markdown_inline(texto_sem_md), base))
        i += 1

    # Bloco final de data e assinatura
    linha_data = f"{config.cidade}, {data_por_extenso(date.today())}." if config.cidade else ""
    finais = [config.associacao] + ([config.competicao] if config.competicao else [])
    historia.append(layout.bloco_assinatura(linha_data, finais, assinar=True))

    destino = origem.with_suffix(".pdf")
    rodape = f"Forma de Disputa · {subtitulo.title()}" if subtitulo else "Forma de Disputa"
    layout.construir(destino, historia, f"Forma de Disputa {subtitulo}".strip(), rodape=rodape)
    logger.info("[PDF] PDF da Forma de Disputa gerado em %s", destino)
    return destino


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera o PDF da Forma de Disputa no layout oficial AEUV")
    parser.add_argument("arquivo", help="Nome ou caminho do arquivo da forma de disputa (ex.: forma-disputa-7-super-liga-união-2026-3-rodadas)")
    parser.add_argument("--titulo", help="Subtitulo customizado do PDF")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    destino = gerar_pdf_forma_disputa(args.arquivo, ConfigPdf.carregar(Path(args.config)), args.titulo)
    print(f"Sucesso: {destino}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
