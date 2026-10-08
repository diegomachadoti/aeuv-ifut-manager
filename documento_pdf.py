"""Documentos livres AEUV a partir de TXT: ficha, certificado, recibo, plano e outros.

O TXT tem metadados INI antes de '---' e texto livre depois. Não valida
aprovação, pagamento ou regras de filiação; não publica nem altera o Drive.
"""

from __future__ import annotations

import argparse
import configparser
import logging
import re
from dataclasses import dataclass, replace
from pathlib import Path
from xml.sax.saxutils import escape

from nota_pdf import AZUL, AZUL_CLARO, ConfigPdf, LayoutPdf, LOGGER, DEFAULT_CONFIG_PATH

RAIZ = Path(__file__).resolve().parent
PASTA_FILIACAO = RAIZ / "filiacao"
PASTA_MODELOS = PASTA_FILIACAO / "modelos"
MODELOS_FILIACAO = {
    "ficha": "ficha-filiacao.txt",
    "certificado": "certificado-filiacao.txt",
    "recibo": "recibo-filiacao.txt",
    "plano": "plano-associado.txt",
}
RE_VARIAVEL = re.compile(r"\{\{([A-Za-z_]\w*)}}")


@dataclass
class DocumentoLivre:
    origem: Path
    dados: configparser.ConfigParser
    corpo: str

    def substituir(self, texto: str) -> str:
        def valor(match: re.Match) -> str:
            nome = match.group(1)
            if not self.dados.has_option("dados", nome):
                raise ValueError(f"Variável {{{{{nome}}}}} sem valor. Adicione {nome} na seção [dados].")
            return self.dados.get("dados", nome)
        return RE_VARIAVEL.sub(valor, texto)

    def campo(self, secao: str, nome: str, padrao: str = "") -> str:
        return self.substituir(self.dados.get(secao, nome, fallback=padrao).strip())


def localizar_documento(alvo: str | Path) -> Path:
    caminho = Path(alvo)
    for base in (caminho, PASTA_FILIACAO / caminho.name):
        for candidato in (base, base.with_name(base.name + ".txt")):
            if candidato.is_file() and candidato.suffix.lower() in (".txt", ".md"):
                return candidato
    raise FileNotFoundError(f"Documento texto não encontrado: {alvo}")


def ler_documento(alvo: str | Path) -> DocumentoLivre:
    origem = localizar_documento(alvo)
    texto = origem.read_text(encoding="utf-8-sig")
    partes = re.split(r"(?m)^---[ \t]*\r?$", texto, maxsplit=1)
    if len(partes) != 2:
        raise ValueError("Separe os metadados e o texto do documento com uma linha contendo apenas ---.")
    dados = configparser.ConfigParser(interpolation=None)
    try:
        dados.read_string(partes[0])
    except configparser.Error as exc:
        raise ValueError(f"Cabeçalho inválido em {origem.name}: {exc}") from exc
    documento = DocumentoLivre(origem, dados, partes[1].strip())
    if not documento.campo("documento", "titulo") or not documento.corpo:
        raise ValueError("Informe [documento] titulo e o texto após ---.")
    return documento


def criar_modelos_filiacao(pasta: str | Path = PASTA_FILIACAO,
                           tipos: tuple[str, ...] | None = None) -> list[Path]:
    """Cria cópias editáveis de todos ou dos modelos selecionados, sem sobrescrever."""
    pasta = Path(pasta)
    tipos = tipos if tipos is not None else tuple(MODELOS_FILIACAO)
    if not tipos or len(set(tipos)) != len(tipos) or any(tipo not in MODELOS_FILIACAO for tipo in tipos):
        raise ValueError("Selecione tipos válidos e sem repetição: " + ", ".join(MODELOS_FILIACAO))
    nomes = [MODELOS_FILIACAO[tipo] for tipo in tipos]
    destinos = [pasta / nome for nome in nomes]
    existentes = [p for p in destinos if p.exists()]
    if existentes:
        raise FileExistsError("Modelos não criados: já existe " + ", ".join(str(p) for p in existentes))
    textos = [(PASTA_MODELOS / nome).read_text(encoding="utf-8-sig") for nome in nomes]
    pasta.mkdir(parents=True, exist_ok=True)
    for destino, texto in zip(destinos, textos):
        with destino.open("x", encoding="utf-8") as arquivo:
            arquivo.write(texto)
    return destinos


def formatar_inline(texto: str, cor_negrito: str = AZUL) -> str:
    """Escapa HTML e aceita apenas negrito e links escritos no TXT."""
    # Links são separados antes da formatação para não alterar seus destinos.
    def negrito(trecho: str) -> str:
        return re.sub(r"\*\*(.+?)\*\*", rf'<font color="{cor_negrito}"><b>\1</b></font>', escape(trecho))

    partes = []
    ultimo = 0
    for match in re.finditer(r"https?://[^\s<>]+", texto):
        partes.append(negrito(texto[ultimo:match.start()]))
        url = escape(match.group(), {'"': '&quot;'})
        partes.append(f'<link href="{url}" color="{cor_negrito}"><u>{escape(match.group())}</u></link>')
        ultimo = match.end()
    partes.append(negrito(texto[ultimo:]))
    return "".join(partes)


def _linha_tabela(linha: str) -> bool:
    return linha.startswith("|") and linha.endswith("|") and linha.count("|") >= 2


def _tabela(linhas: list[str], layout: LayoutPdf):
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph, Table, TableStyle

    celulas = [[c.strip() for c in linha.split("|")[1:-1]] for linha in linhas]
    cabecalho = len(celulas) > 1 and all(re.fullmatch(r":?-{1,}:?", c) for c in celulas[1])
    if cabecalho:
        del celulas[1]
    colunas = max(len(linha) for linha in celulas)
    estilo = ParagraphStyle("documento_celula", parent=layout.base, alignment=TA_LEFT,
                            fontSize=8.5, leading=12, spaceAfter=0, splitLongWords=1)
    estilo_titulo = ParagraphStyle("documento_cabecalho_tabela", parent=estilo,
                                   fontName=layout.negrito, textColor=colors.white)
    conteudo = []
    for i, linha in enumerate(celulas):
        linha += [""] * (colunas - len(linha))
        conteudo.append([Paragraph(formatar_inline(c, "#FFFFFF" if cabecalho and i == 0 else AZUL),
                                  estilo_titulo if cabecalho and i == 0 else estilo) for c in linha])
    tabela = Table(conteudo, colWidths=[layout.largura_util / colunas] * colunas,
                   repeatRows=1 if cabecalho else 0)
    tabela.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), .4, colors.HexColor("#C9D1DE")),
        ("ROWBACKGROUNDS", (0, 1 if cabecalho else 0), (-1, -1), [colors.white, colors.HexColor(AZUL_CLARO)]),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    if cabecalho:
        tabela.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(AZUL))]))
    return tabela


def montar_conteudo(texto: str, layout: LayoutPdf) -> list:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import CondPageBreak, PageBreak, Paragraph, Spacer, Table, TableStyle

    estilo = ParagraphStyle("documento_texto", parent=layout.base, alignment=TA_LEFT,
                             fontSize=10, leading=13, spaceAfter=4)
    topico = ParagraphStyle("documento_topico", parent=estilo, leftIndent=13, bulletIndent=0)
    destaque = ParagraphStyle("documento_destaque", parent=estilo,
                               fontName=layout.negrito, textColor=colors.HexColor(AZUL))
    historia = []
    linhas = texto.splitlines()
    i = 0
    while i < len(linhas):
        linha = linhas[i].strip()
        i += 1
        if not linha:
            historia.append(Spacer(1, 3))
        elif linha.startswith("# "):
            # Comentário editorial no TXT, não impresso.
            continue
        elif linha == "=== PAGINA ===":
            historia.append(PageBreak())
        elif _linha_tabela(linha):
            bloco = [linha]
            while i < len(linhas) and _linha_tabela(linhas[i].strip()):
                bloco.append(linhas[i].strip())
                i += 1
            historia.extend([_tabela(bloco, layout), Spacer(1, 7)])
        elif re.match(r"^\*(?!\*)\s*\S", linha):
            titulo = linha[1:].strip()
            faixa = Table([[Paragraph(formatar_inline(titulo, "#FFFFFF"), layout.estilos["secao"])]],
                          colWidths=[layout.largura_util])
            faixa.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(AZUL)),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            historia.extend([CondPageBreak(65), faixa, Spacer(1, 6)])
        elif linha.startswith(">"):
            historia.extend([CondPageBreak(50), layout.caixa(
                [Paragraph(formatar_inline(linha[1:].strip()), destaque)], AZUL_CLARO, AZUL), Spacer(1, 5)])
        elif linha.startswith("- "):
            historia.append(Paragraph(formatar_inline(linha[2:].strip()), topico, bulletText="•"))
        else:
            historia.append(Paragraph(formatar_inline(linha), estilo))
    return historia


def gerar_pdf_documento(alvo: str | Path, config: ConfigPdf | None = None,
                        logger: logging.Logger = LOGGER) -> Path:
    from reportlab.platypus import Paragraph

    documento = ler_documento(alvo)
    config = replace(config or ConfigPdf.carregar(), competicao="")
    tipo = documento.campo("assinatura", "tipo", "presidente").casefold()
    if tipo not in ("presidente", "manual", "nenhuma"):
        raise ValueError("[assinatura] tipo deve ser presidente, manual ou nenhuma.")
    if tipo == "presidente" and not config.assinatura.is_file():
        raise ValueError("Imagem da assinatura do Presidente não encontrada. Revise [pdf] assinatura.")
    if tipo == "manual":
        config = replace(config, assinatura_nome=documento.campo("assinatura", "nome"),
                         assinatura_cargo=documento.campo("assinatura", "cargo"))
    texto = documento.substituir(documento.corpo)
    layout = LayoutPdf.criar(config, logger)
    if layout.logo is None:
        raise ValueError("Logomarca AEUV não encontrada. Revise [pdf] logo ou logo_url.")
    titulo = documento.campo("documento", "titulo")
    subtitulo = documento.campo("documento", "subtitulo")
    historia = [Paragraph(formatar_inline(titulo), layout.estilos["titulo"])]
    if subtitulo:
        historia.append(Paragraph(formatar_inline(subtitulo), layout.estilos["subtitulo"]))
    historia.extend(montar_conteudo(texto, layout))
    if tipo != "nenhuma":
        historia.append(layout.bloco_assinatura(documento.campo("assinatura", "data"),
                                              [config.associacao], assinar=tipo == "presidente"))
    destino = documento.origem.with_suffix(".pdf")
    layout.construir(destino, historia, titulo,
                     rodape=documento.campo("documento", "rodape", "Documento institucional"),
                     subtitulo=documento.campo("documento", "cabecalho", "Documentos institucionais · AEUV"),
                     marca_dagua="", assunto=documento.campo("documento", "assunto", titulo))
    logger.info("[DOCUMENTO] PDF gerado em %s", destino)
    return destino


def gerar_pdfs_filiacao(alvo: str = "todos", config: ConfigPdf | None = None,
                        logger: logging.Logger = LOGGER) -> list[Path]:
    if alvo.casefold() == "todos":
        arquivos = [PASTA_FILIACAO / nome for nome in MODELOS_FILIACAO.values()]
    else:
        arquivos = [PASTA_FILIACAO / MODELOS_FILIACAO[alvo.casefold()]] if alvo.casefold() in MODELOS_FILIACAO else [Path(alvo)]
    # Verifique as entradas antes de atualizar qualquer PDF do lote.
    for arquivo in arquivos:
        localizar_documento(arquivo)
    config = config or ConfigPdf.carregar()
    return [gerar_pdf_documento(arquivo, config, logger) for arquivo in arquivos]


def main() -> int:
    parser = argparse.ArgumentParser(description="PDFs livres no padrão AEUV e modelos de filiação")
    acao = parser.add_mutually_exclusive_group(required=True)
    acao.add_argument("--criar-modelos-filiacao", nargs="?", const=str(PASTA_FILIACAO), metavar="PASTA")
    acao.add_argument("--gerar-pdf-filiacao", nargs="?", const="todos", metavar="TIPO_OU_TXT")
    acao.add_argument("--gerar-pdf-documento", nargs="+", metavar="TXT")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    try:
        if args.criar_modelos_filiacao:
            destinos = criar_modelos_filiacao(args.criar_modelos_filiacao)
        elif args.gerar_pdf_filiacao:
            destinos = gerar_pdfs_filiacao(args.gerar_pdf_filiacao, ConfigPdf.carregar(Path(args.config)))
        else:
            config = ConfigPdf.carregar(Path(args.config))
            destinos = [gerar_pdf_documento(alvo, config) for alvo in args.gerar_pdf_documento]
        for destino in destinos:
            print(destino)
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Erro: {exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
