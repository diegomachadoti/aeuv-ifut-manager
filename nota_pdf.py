"""Geracao do PDF da Nota Oficial a partir do TXT gerado pela analise das sumulas.

O PDF e montado com a identidade da Associacao AEUV (logomarca, cabecalho e
rodape). Pode ser chamado automaticamente apos a analise ou isoladamente,
para regerar o PDF de uma nota ja existente (ex.: depois de revisar o TXT).
"""

from __future__ import annotations

import argparse
import configparser
import io
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from xml.sax.saxutils import escape

import requests

DEFAULT_CONFIG_PATH = Path("config.ini")
LOGGER = logging.getLogger("ifut_bot")

AZUL = "#1F3A68"
AZUL_CLARO = "#E9EEF8"
CINZA = "#5A6270"
VERMELHO = "#B3261E"
SIMBOLOS = {"➡": "➡", "⬇": "⬇", "⚠": "⚠", "⛔": "⛔"}
SIMBOLOS_ASCII = {"➡": "->", "⬇": "v", "⚠": "!", "⛔": "X"}
SECOES = (
    "DOS FATOS", "DO ENQUADRAMENTO LEGAL", "DA PUNIÇÃO", "DA PROPORCIONALIDADE DA DECISÃO",
    "DISPOSIÇÕES FINAIS", "RELATÓRIO OFICIAL DA ARBITRAGEM",
)


@dataclass
class ConfigPdf:
    notas_dir: Path
    logo: Path
    logo_url: str
    associacao: str
    competicao: str
    cidade: str
    assinatura: Path = Path("assets\\assinatura-vice-presidente.png")
    assinatura_nome: str = ""
    assinatura_cargo: str = ""
    @classmethod
    def carregar(cls, config_path: Path = DEFAULT_CONFIG_PATH) -> "ConfigPdf":
        parser = configparser.ConfigParser()
        parser.read(config_path, encoding="utf-8")
        parser.read(Path(config_path).with_name("config.local.ini"), encoding="utf-8")
        s = parser["sumulas"] if parser.has_section("sumulas") else {}
        n = parser["notas"] if parser.has_section("notas") else {}
        p = parser["pdf"] if parser.has_section("pdf") else {}
        return cls(
            notas_dir=Path(s.get("notas_dir", "downloads\\sumulas\\notas-oficiais")),
            logo=Path(p.get("logo", "assets\\logo-aeuv.png")),
            logo_url=p.get("logo_url", ""),
            associacao=p.get("associacao", "ASSOCIAÇÃO AEUV"),
            competicao=n.get("competicao", ""),
            cidade=n.get("cidade", ""),
            assinatura=Path(p.get("assinatura", "assets\\assinatura-vice-presidente.png")),
            assinatura_nome=p.get("assinatura_nome", ""),
            assinatura_cargo=p.get("assinatura_cargo", ""),
        )


# ---------------------------------------------------------------------------
# Recursos (logo e fontes)
# ---------------------------------------------------------------------------

def garantir_logo(config: ConfigPdf, logger: logging.Logger = LOGGER) -> Path | None:
    """Usa a logo local; se nao existir, baixa do Drive (link publico) e salva reduzida."""
    if config.logo.exists():
        return config.logo
    if not config.logo_url:
        return None
    try:
        from PIL import Image

        resposta = requests.get(config.logo_url, timeout=180)
        resposta.raise_for_status()
        imagem = Image.open(io.BytesIO(resposta.content))
        imagem.thumbnail((400, 400))
        config.logo.parent.mkdir(parents=True, exist_ok=True)
        imagem.save(config.logo, "PNG", optimize=True)
        logger.info("[PDF] Logomarca baixada para %s", config.logo)
        return config.logo
    except Exception as exc:
        logger.warning("[PDF] Nao foi possivel obter a logomarca (%s); PDF sera gerado sem ela", exc)
        return None


def _registrar_fontes() -> tuple[str, str, str, str | None]:
    """Registra Arial (acentos e travessao) e Segoe UI Symbol (setas/alertas); cai para Helvetica."""
    from reportlab.lib.fonts import addMapping
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    fontes = Path("C:/Windows/Fonts")
    arquivos = {"AEUV": "arial.ttf", "AEUV-Bold": "arialbd.ttf", "AEUV-Italic": "ariali.ttf",
                "AEUV-BoldItalic": "arialbi.ttf"}
    if all((fontes / a).exists() for a in arquivos.values()):
        for nome, arquivo in arquivos.items():
            if nome not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(nome, str(fontes / arquivo)))
        addMapping("AEUV", 0, 0, "AEUV")
        addMapping("AEUV", 1, 0, "AEUV-Bold")
        addMapping("AEUV", 0, 1, "AEUV-Italic")
        addMapping("AEUV", 1, 1, "AEUV-BoldItalic")
        normal, negrito, italico = "AEUV", "AEUV-Bold", "AEUV-Italic"
    else:
        normal, negrito, italico = "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"
    simbolos = None
    if (fontes / "seguisym.ttf").exists():
        if "AEUV-Simbolos" not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont("AEUV-Simbolos", str(fontes / "seguisym.ttf")))
        simbolos = "AEUV-Simbolos"
    return normal, negrito, italico, simbolos


# ---------------------------------------------------------------------------
# Leitura do TXT
# ---------------------------------------------------------------------------

def ler_nota(texto: str) -> tuple[list[str], list[str], str]:
    """Separa avisos de rascunho (antes do titulo), corpo e titulo da nota."""
    linhas = texto.replace("\r", "").split("\n")
    inicio = next((i for i, l in enumerate(linhas) if l.strip().upper().startswith("NOTA OFICIAL")), 0)
    avisos = [l for l in linhas[:inicio] if l.strip()]
    corpo = linhas[inicio:]
    titulo = corpo[0].strip() if corpo else "NOTA OFICIAL"
    return avisos, corpo, titulo


def tem_pendencias(texto: str) -> bool:
    """Pendente se o corpo da nota ainda tem [A DEFINIR...] ou se ha divergencias da IA nos avisos.

    O aviso de rascunho do topo cita "[A DEFINIR PELA COMISSÃO]" apenas como instrucao, por isso
    nao conta: basta a comissao substituir os marcadores do corpo para o PDF sair como final.
    """
    avisos, corpo, _ = ler_nota(texto)
    return "[A DEFINIR" in "\n".join(corpo) or any("⛔ DIVERGÊNCIAS" in a for a in avisos)


def _eh_secao(linha: str) -> bool:
    limpa = linha.strip().rstrip(":")
    return limpa in SECOES


def _eh_maiuscula(linha: str) -> bool:
    limpa = linha.strip()
    return bool(limpa) and len(limpa) <= 80 and limpa == limpa.upper() and any(c.isalpha() for c in limpa)


# ---------------------------------------------------------------------------
# Montagem do PDF
# ---------------------------------------------------------------------------

def gerar_pdf_nota(txt_path: Path, config: ConfigPdf | None = None, logger: logging.Logger = LOGGER) -> Path:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        CondPageBreak, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )

    config = config or ConfigPdf.carregar()
    txt_path = Path(txt_path)
    texto = txt_path.read_text(encoding="utf-8-sig")
    avisos, corpo, titulo = ler_nota(texto)
    pendente = tem_pendencias(texto)
    normal, negrito, italico, fonte_simbolos = _registrar_fontes()
    logo = garantir_logo(config, logger)

    def fmt(linha: str) -> str:
        html = escape(linha.replace("\ufe0f", "").strip())
        html = re.sub(r"\*\*(.+?)\*\*", rf'<font color="{VERMELHO}"><b>\1</b></font>', html)
        html = re.sub(r"(https?://\S+)", r'<link href="\1" color="#1F3A68"><u>\1</u></link>', html)
        for simbolo in SIMBOLOS:
            if simbolo in html:
                troca = (f'<font name="{fonte_simbolos}">{simbolo}</font>' if fonte_simbolos
                         else SIMBOLOS_ASCII[simbolo])
                html = html.replace(simbolo, troca)
        return html

    base = ParagraphStyle("base", fontName=normal, fontSize=10.5, leading=15, alignment=TA_JUSTIFY,
                          spaceAfter=5, textColor=colors.HexColor("#1B1B1B"))
    estilos = {
        "titulo": ParagraphStyle("titulo", parent=base, fontName=negrito, fontSize=17, leading=21,
                                 alignment=TA_CENTER, textColor=colors.HexColor(AZUL), spaceAfter=2),
        "subtitulo": ParagraphStyle("subtitulo", parent=base, fontName=negrito, fontSize=11.5,
                                    alignment=TA_CENTER, textColor=colors.HexColor(CINZA), spaceAfter=12),
        "secao": ParagraphStyle("secao", parent=base, fontName=negrito, fontSize=11.5, leading=14,
                                textColor=colors.white, alignment=TA_LEFT, spaceAfter=0),
        "item": ParagraphStyle("item", parent=base, fontName=negrito, textColor=colors.HexColor(AZUL), keepWithNext=1,
                               spaceBefore=6, alignment=TA_LEFT),
        "citacao": ParagraphStyle("citacao", parent=base, fontName=italico, leftIndent=18, rightIndent=12,
                                  textColor=colors.HexColor("#333333")),
        "decisao": ParagraphStyle("decisao", parent=base, fontName=negrito, alignment=TA_LEFT, spaceAfter=0),
        "destaque": ParagraphStyle("destaque", parent=base, fontName=negrito, alignment=TA_LEFT, keepWithNext=1),
        "centro": ParagraphStyle("centro", parent=base, alignment=TA_CENTER, spaceAfter=1),
        "alerta": ParagraphStyle("alerta", parent=base, fontName=negrito, fontSize=9.5, leading=13,
                                 textColor=colors.HexColor(VERMELHO), alignment=TA_LEFT, spaceAfter=1),
        "assinatura": ParagraphStyle("assinatura", parent=base, fontName=negrito, alignment=TA_CENTER,
                                     spaceAfter=0),
    }

    def faixa(texto_secao: str) -> Table:
        tabela = Table([[Paragraph(fmt(texto_secao), estilos["secao"])]], colWidths=[17 * cm])
        tabela.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(AZUL)),
            ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        return tabela

    def caixa(paragrafos: list, fundo: str, borda: str) -> Table:
        tabela = Table([[p] for p in paragrafos], colWidths=[17 * cm])
        tabela.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(fundo)),
            ("LINEBEFORE", (0, 0), (0, -1), 3, colors.HexColor(borda)),
            ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        return tabela

    historia: list = []
    if avisos and pendente:
        historia += [caixa([Paragraph(fmt(a), estilos["alerta"]) for a in avisos], "#FDECEA", VERMELHO),
                     Spacer(1, 10)]

    # Assinatura: da linha "Cidade, data." ate o fim.
    fim = len(corpo)
    for i in range(len(corpo) - 1, -1, -1):
        if config.cidade and corpo[i].strip().startswith(f"{config.cidade},"):
            fim = i
            break
    assinatura = [l.strip() for l in corpo[fim:] if l.strip()]
    linhas = corpo[1:fim]

    historia.append(Paragraph(fmt(titulo), estilos["titulo"]))
    while linhas and not linhas[0].strip():
        linhas.pop(0)
    if linhas and _eh_maiuscula(linhas[0]) and not _eh_secao(linhas[0]):
        historia.append(Paragraph(fmt(linhas.pop(0)), estilos["subtitulo"]))

    secao_atual = ""
    decisoes: list = []

    def descarregar_decisoes() -> None:
        if decisoes:
            historia.append(caixa(list(decisoes), AZUL_CLARO, AZUL))
            historia.append(Spacer(1, 6))
            decisoes.clear()

    for linha in linhas:
        limpa = linha.strip()
        if limpa.startswith("➡") or limpa.startswith("TOTAL:"):
            decisoes.append(Paragraph(fmt(limpa), estilos["decisao"]))
            continue
        descarregar_decisoes()
        if not limpa:
            historia.append(Spacer(1, 3))
        elif _eh_secao(limpa):
            secao_atual = limpa
            historia += [CondPageBreak(3 * cm), Spacer(1, 6), faixa(limpa), Spacer(1, 6)]
        elif limpa.startswith("⚠") or limpa.startswith("⛔"):
            historia.append(caixa([Paragraph(fmt(limpa), estilos["alerta"])], "#FDECEA", VERMELHO))
        elif limpa.startswith('"') or limpa.startswith("“"):
            historia.append(Paragraph(fmt(limpa), estilos["citacao"]))
        elif secao_atual == "DA PROPORCIONALIDADE DA DECISÃO" and (limpa.startswith("⬇") or linha.startswith(" ")):
            historia.append(Paragraph(fmt(limpa), estilos["centro"]))
        elif re.match(r"^\d+\.\s", limpa):
            historia.append(KeepTogether([Paragraph(fmt(limpa), estilos["item"])]))
        elif re.match(r"^ART\.?\s*\d", limpa, re.IGNORECASE) and len(limpa) <= 60 or limpa.startswith("TOTAL"):
            historia.append(Paragraph(fmt(limpa), estilos["destaque"]))
        elif _eh_maiuscula(limpa):
            historia.append(Paragraph(fmt(limpa), estilos["item"]))
        else:
            historia.append(Paragraph(fmt(limpa), base))
    descarregar_decisoes()

    if assinatura:
        bloco = [Spacer(1, 18), Paragraph(fmt(assinatura[0]), estilos["centro"]), Spacer(1, 18)]
        # Assinatura digitalizada so no PDF final: rascunho nao sai assinado.
        imagem_assinatura = config.assinatura if config.assinatura.exists() and not pendente else None
        if imagem_assinatura:
            from reportlab.lib.utils import ImageReader
            from reportlab.platypus import Image as ImagemPdf

            largura_img, altura_img = ImageReader(str(imagem_assinatura)).getSize()
            largura = 7.5 * cm
            conteudo = ImagemPdf(str(imagem_assinatura), width=largura, height=largura * altura_img / largura_img)
        else:
            conteudo = Spacer(1, 18)
        linha = Table([[conteudo]], colWidths=[9 * cm])
        linha.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LINEBELOW", (0, 0), (-1, -1), 0.8, colors.HexColor("#1B1B1B")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1), ("TOPPADDING", (0, 0), (-1, -1), 0),
        ]))
        bloco.append(linha)
        if config.assinatura_nome:
            bloco.append(Paragraph(fmt(config.assinatura_nome), estilos["centro"]))
        if config.assinatura_cargo:
            bloco.append(Paragraph(fmt(config.assinatura_cargo), estilos["centro"]))
        bloco.append(Spacer(1, 4))
        bloco += [Paragraph(fmt(l), estilos["assinatura"]) for l in assinatura[1:]]
        historia.append(KeepTogether(bloco))

    competicao = config.competicao

    def pagina(canvas, doc) -> None:
        largura, altura = A4
        canvas.saveState()
        topo = altura - 1.2 * cm
        x_texto = 2 * cm
        if logo:
            canvas.drawImage(str(logo), 2 * cm, topo - 2 * cm, width=2 * cm, height=2 * cm,
                             preserveAspectRatio=True, mask="auto")
            x_texto = 4.4 * cm
        canvas.setFillColor(colors.HexColor(AZUL))
        canvas.setFont(negrito, 15)
        canvas.drawString(x_texto, topo - 0.8 * cm, config.associacao)
        canvas.setFillColor(colors.HexColor(CINZA))
        canvas.setFont(normal, 9.5)
        canvas.drawString(x_texto, topo - 1.35 * cm, "Comissão Organizadora" + (f" · {competicao}" if competicao else ""))
        canvas.setStrokeColor(colors.HexColor(AZUL))
        canvas.setLineWidth(1.5)
        canvas.line(2 * cm, topo - 2.3 * cm, largura - 2 * cm, topo - 2.3 * cm)

        canvas.setStrokeColor(colors.HexColor("#C9D1DE"))
        canvas.setLineWidth(0.6)
        canvas.line(2 * cm, 1.7 * cm, largura - 2 * cm, 1.7 * cm)
        canvas.setFont(normal, 8)
        canvas.setFillColor(colors.HexColor(CINZA))
        canvas.drawString(2 * cm, 1.25 * cm, f"{config.associacao} · {titulo}")
        canvas.drawRightString(largura - 2 * cm, 1.25 * cm, f"Página {doc.page}")

        if pendente:
            canvas.setFillColor(colors.Color(0.85, 0.1, 0.1, alpha=0.08))
            canvas.setFont(negrito, 90)
            canvas.translate(largura / 2, altura / 2)
            canvas.rotate(45)
            canvas.drawCentredString(0, 0, "RASCUNHO")
        canvas.restoreState()

    destino = txt_path.with_suffix(".pdf")
    doc = SimpleDocTemplate(
        str(destino), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=4 * cm,
        bottomMargin=2.3 * cm, title=titulo, author=config.associacao, subject=competicao,
    )
    doc.build(historia, onFirstPage=pagina, onLaterPages=pagina)
    if pendente:
        logger.warning("[PDF] %s possui pendencias ([A DEFINIR]/divergencias); PDF marcado como RASCUNHO",
                       txt_path.name)
    logger.info("[PDF] PDF da nota gerado em %s", destino)
    return destino


# ---------------------------------------------------------------------------
# Localizacao da nota e CLI
# ---------------------------------------------------------------------------

def localizar_nota(alvo: str, notas_dir: Path) -> Path:
    """Aceita caminho do TXT, numero da nota (ex.: 4 ou 004) ou protocolo da sumula (SUM-...)."""
    caminho = Path(alvo)
    if caminho.suffix.lower() == ".txt" and caminho.exists():
        return caminho
    if (notas_dir / alvo).exists():
        return notas_dir / alvo
    candidatos: list[Path] = []
    if alvo.isdigit():
        candidatos = list(notas_dir.glob(f"NOTA OFICIAL Nº {int(alvo):03d}-*.txt"))
    elif alvo.upper().startswith("SUM-"):
        candidatos = [p for p in notas_dir.glob("NOTA OFICIAL*.txt")
                      if alvo.upper() in p.read_text(encoding="utf-8-sig", errors="ignore").upper()]
    if not candidatos:
        raise FileNotFoundError(f"Nenhuma nota oficial encontrada para '{alvo}' em {notas_dir}")
    def ordem(p: Path) -> tuple[int, float]:
        achado = re.search(r"Nº (\d+)-", p.name)
        return (int(achado.group(1)) if achado else 0, p.stat().st_mtime)

    return max(candidatos, key=ordem)


def regerar_pdf(alvo: str, config_path: Path = DEFAULT_CONFIG_PATH, logger: logging.Logger = LOGGER) -> Path:
    config = ConfigPdf.carregar(config_path)
    return gerar_pdf_nota(localizar_nota(alvo, config.notas_dir), config, logger)


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera o PDF de uma Nota Oficial a partir do TXT")
    parser.add_argument("alvo", help="Caminho do TXT, numero da nota (ex.: 4) ou protocolo da sumula (SUM-...)")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    print(regerar_pdf(args.alvo, Path(args.config)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
