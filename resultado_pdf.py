"""Geracao do PDF do resultado da automacao de inscricao, remocao e portabilidade.

O TXT de resultado e escrito pelo main.py ao fim do processamento de cada
solicitacao. Este modulo transforma esse texto no PDF com a identidade da
associacao, destacando o desfecho de cada atleta: SUCESSO em verde, FALHA em
vermelho.

Pode ser chamado automaticamente apos o processamento ou isoladamente, para
regerar o PDF de um resultado ja existente.
"""

from __future__ import annotations

import argparse
import logging
import re
from dataclasses import dataclass, field, replace
from datetime import datetime
from pathlib import Path

DEFAULT_CONFIG_PATH = Path("config.ini")
LOGGER = logging.getLogger("ifut_bot")

VERDE = "#1E7B34"
VERDE_CLARO = "#E4F4E9"
VERMELHO_CLARO = "#FDECEA"
LARANJA = "#B26A00"
LARANJA_CLARO = "#FFF2D8"
CORES_STATUS = {"SUCESSO": VERDE, "FALHA": "#B3261E", "PENDENTE": LARANJA}
FUNDOS_STATUS = {"SUCESSO": VERDE_CLARO, "FALHA": VERMELHO_CLARO, "PENDENTE": LARANJA_CLARO}

# Campos que pertencem a uma pessoa. Qualquer outra chave encontrada no
# arquivo e tratada como cabecalho, mesmo aparecendo depois dos registros
# (e o caso de "Link do time para conferencia" e "Gerado em", no rodape).
CAMPOS_REGISTRO = {
    "ACAO": "acao",
    "TIPO": "tipo",
    "NOME COMPLETO": "nome",
    "DATA DE NASCIMENTO": "nascimento",
    "CPF": "cpf",
    "STATUS": "status",
    "MENSAGEM": "mensagem",
}

# O formulario grava isto nos campos que a acao dispensa.
DISPENSADO = "NAO NECESSARIO"

COLUNAS_PDF = (
    ("Nº", 1.0), ("Ação", 2.2), ("Tipo", 2.3), ("Nome completo", 6.4), ("Nascimento", 2.1),
    ("CPF", 2.6), ("Status", 2.1), ("Mensagem", 6.2),
)


@dataclass
class RegistroResultado:
    """Desfecho de uma pessoa dentro da solicitacao."""
    numero: str = ""
    acao: str = ""
    tipo: str = ""
    nome: str = ""
    nascimento: str = ""
    cpf: str = ""
    status: str = ""
    mensagem: str = ""

    @property
    def sucesso(self) -> bool:
        return self.status.upper() == "SUCESSO"


@dataclass
class Resultado:
    """Conteudo do arquivo de resultado."""
    protocolo: str = ""
    competicao: str = ""
    equipe: str = ""
    gerado_em: str = ""
    link_time: str = ""
    registros: list[RegistroResultado] = field(default_factory=list)

    @property
    def falhas(self) -> list[RegistroResultado]:
        return [r for r in self.registros if not r.sucesso]

    @property
    def sucessos(self) -> list[RegistroResultado]:
        return [r for r in self.registros if r.sucesso]

    @property
    def inscritos(self) -> list[RegistroResultado]:
        """Quem entrou no elenco: inclusao ou portabilidade bem-sucedida."""
        return [r for r in self.sucessos if _normalizar(r.acao) in {"inclusao", "portabilidade"}]

    @property
    def data_geracao(self) -> datetime:
        for formato in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M"):
            try:
                return datetime.strptime(self.gerado_em, formato)
            except ValueError:
                continue
        return datetime.now()


def _normalizar(valor: str) -> str:
    import unicodedata

    sem_acento = unicodedata.normalize("NFD", str(valor or ""))
    return "".join(c for c in sem_acento if unicodedata.category(c) != "Mn").strip().lower()


def _informado(valor: str) -> str:
    """Campo dispensado pela acao vira travessao, em vez de repetir o aviso."""
    texto = str(valor or "").strip()
    return "—" if not texto or texto.upper() == DISPENSADO else texto


def _formatar_cpf(valor: str) -> str:
    digitos = re.sub(r"\D", "", str(valor or ""))
    if len(digitos) != 11:
        return _informado(valor)
    return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"


# ---------------------------------------------------------------------------
# Leitura do TXT
# ---------------------------------------------------------------------------

def ler_resultado(texto: str) -> Resultado:
    """Transforma o TXT de resultado em objetos.

    O arquivo tem um cabecalho de linhas "CHAVE: valor", um bloco por pessoa
    iniciado por "REGISTRO 01" e um rodape com o link do time. Linhas sem ":"
    (titulos, separadores e a lista de inscritos) sao ignoradas: os inscritos
    sao deduzidos dos proprios registros.
    """
    resultado = Resultado()
    atual: RegistroResultado | None = None

    for linha in str(texto or "").replace("\r", "").split("\n"):
        limpa = linha.strip()
        if not limpa:
            continue

        inicio = re.match(r"^REGISTRO\s+(\d+)", limpa, re.IGNORECASE)
        if inicio:
            atual = RegistroResultado(numero=inicio.group(1))
            resultado.registros.append(atual)
            continue

        corte = limpa.find(":")
        if corte == -1:
            continue

        chave = limpa[:corte].strip().upper()
        valor = limpa[corte + 1:].strip()

        campo = CAMPOS_REGISTRO.get(chave)
        if atual is not None and campo:
            setattr(atual, campo, valor)
            continue

        if chave == "PROTOCOLO":
            resultado.protocolo = valor
        elif chave == "COMPETICAO":
            resultado.competicao = valor
        elif chave == "EQUIPE":
            resultado.equipe = valor
        elif chave == "GERADO EM":
            resultado.gerado_em = valor
        elif chave.startswith("LINK DO TIME"):
            resultado.link_time = valor

    return resultado


# ---------------------------------------------------------------------------
# Geracao do PDF
# ---------------------------------------------------------------------------

def gerar_pdf_resultado(txt_path: Path, config=None, logger: logging.Logger = LOGGER) -> Path:
    """PDF paisagem com o desfecho de cada pessoa da solicitacao.

    O status fica destacado na tabela (verde para sucesso, vermelho para
    falha) e, quando ha falhas, elas sao repetidas numa caixa de alerta logo
    no inicio, para nao passarem despercebidas no meio da lista.
    """
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import CondPageBreak, Paragraph, Spacer, Table, TableStyle

    import nota_pdf
    from sumula_disciplinar import data_por_extenso

    txt_path = Path(txt_path)
    resultado = ler_resultado(txt_path.read_text(encoding="utf-8-sig"))

    config = config or nota_pdf.ConfigPdf.carregar()
    # O cabecalho do PDF mostra a competicao do proprio arquivo, que pode ser
    # diferente da competicao corrente do config.ini em resultados antigos.
    if resultado.competicao:
        config = replace(config, competicao=resultado.competicao)

    layout = nota_pdf.LayoutPdf.criar(config, logger, paisagem=True)
    fmt, estilos = layout.fmt, layout.estilos
    celula = ParagraphStyle("celula", parent=layout.base, fontSize=8.5, leading=10.5, alignment=0, spaceAfter=0)
    centro = ParagraphStyle("celula_centro", parent=celula, alignment=TA_CENTER)
    cabeca = ParagraphStyle("celula_cabeca", parent=centro, fontName=layout.negrito, textColor=colors.white)

    total = len(resultado.registros)
    falhas = resultado.falhas
    inscritos = resultado.inscritos

    resumo = (f"Protocolo: {resultado.protocolo or '—'}   ·   Equipe: {resultado.equipe or '—'}   ·   "
              f"Registros: {total}   ·   Sucesso: {len(resultado.sucessos)}   ·   Falha: {len(falhas)}")

    historia: list = [
        Paragraph("RESULTADO DO PROCESSAMENTO", estilos["titulo"]),
        Paragraph(fmt("Inscrição, remoção e portabilidade"), estilos["subtitulo"]),
        layout.caixa([
            Paragraph(fmt(resumo), estilos["destaque"]),
            Paragraph(fmt(f"Processado em {resultado.gerado_em}" if resultado.gerado_em
                          else "Processado pela automação da associação."), celula),
        ], nota_pdf.AZUL_CLARO, nota_pdf.AZUL),
        Spacer(1, 10),
    ]

    # Falhas primeiro: sao o que exige providencia de quem le.
    if falhas:
        alerta = [Paragraph(fmt(f"ATENÇÃO: {len(falhas)} de {total} registro(s) não foram concluídos."),
                            estilos["alerta"])]
        alerta += [Paragraph(fmt(f"• {r.nome or 'Sem nome'} ({r.acao}): {r.mensagem or 'sem detalhe'}"), celula)
                   for r in falhas]
        historia += [layout.caixa(alerta, VERMELHO_CLARO, nota_pdf.VERMELHO), Spacer(1, 10)]

    if not total:
        historia.append(Paragraph("Nenhum registro processado nesta solicitação.", layout.base))

    larguras = [l * cm for _, l in COLUNAS_PDF]
    escala = layout.largura_util / sum(larguras)
    larguras = [l * escala for l in larguras]

    if total:
        historia += [layout.faixa("REGISTROS PROCESSADOS"), Spacer(1, 4)]
        linhas = [[Paragraph(fmt(nome), cabeca) for nome, _ in COLUNAS_PDF]]
        estilo = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(nota_pdf.AZUL)),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9D1DE")),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]
        coluna_status = [nome for nome, _ in COLUNAS_PDF].index("Status")

        for i, r in enumerate(resultado.registros, start=1):
            status = r.status.upper() or "—"
            cor = CORES_STATUS.get(status, "#1B1B1B")
            linhas.append([
                Paragraph(fmt(r.numero), centro),
                Paragraph(fmt(r.acao), celula),
                Paragraph(fmt(r.tipo), celula),
                Paragraph(f"<b>{fmt(r.nome)}</b>", celula),
                Paragraph(fmt(_informado(r.nascimento)), centro),
                Paragraph(fmt(_formatar_cpf(r.cpf)), centro),
                Paragraph(f'<font color="{cor}"><b>{fmt(status)}</b></font>', centro),
                Paragraph(fmt(r.mensagem), celula),
            ])
            # A cor de fundo repete o status: a linha inteira se le de relance.
            fundo = FUNDOS_STATUS.get(status)
            if fundo:
                estilo.append(("BACKGROUND", (coluna_status, i), (coluna_status, i), colors.HexColor(fundo)))
            elif i % 2 == 0:
                estilo.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F4F6FA")))
            if status == "FALHA":
                estilo.append(("BACKGROUND", (0, i), (coluna_status - 1, i), colors.HexColor("#FDF5F4")))
                estilo.append(("BACKGROUND", (coluna_status + 1, i), (-1, i), colors.HexColor("#FDF5F4")))

        tabela = Table(linhas, colWidths=larguras, repeatRows=1)
        tabela.setStyle(TableStyle(estilo))
        historia += [tabela, Spacer(1, 12)]

    if inscritos:
        historia += [CondPageBreak(3 * cm), layout.faixa(f"ELENCO ATUALIZADO ({len(inscritos)})"), Spacer(1, 4)]
        historia.append(Paragraph(
            fmt("Pessoas que passaram a constar no elenco da equipe por esta solicitação:"), celula))
        historia.append(Spacer(1, 4))
        historia += [Paragraph(f"{i}. {fmt(r.nome)}", layout.base) for i, r in enumerate(inscritos, start=1)]
        historia.append(Spacer(1, 8))

    if resultado.link_time:
        historia.append(layout.caixa([
            Paragraph(fmt("Representante da equipe: confira no aplicativo se os dados cadastrados estão corretos."),
                      estilos["destaque"]),
            Paragraph(fmt(resultado.link_time), celula),
        ], nota_pdf.AZUL_CLARO, nota_pdf.AZUL))

    linha_data = (f"{config.cidade}, {data_por_extenso(resultado.data_geracao.date())}."
                  if config.cidade else "")
    historia.append(layout.bloco_assinatura(linha_data, [config.associacao], assinar=True))

    destino = txt_path.with_suffix(".pdf")
    layout.construir(destino, historia, "Resultado do Processamento",
                     rodape=f"Resultado · Protocolo {resultado.protocolo}" if resultado.protocolo
                     else "Resultado do Processamento")
    if falhas:
        logger.warning("[PDF] Resultado %s tem %s registro(s) com falha", txt_path.name, len(falhas))
    logger.info("[PDF] PDF do resultado gerado em %s", destino)
    return destino


# ---------------------------------------------------------------------------
# Localizacao do resultado e CLI
# ---------------------------------------------------------------------------

def localizar_resultado(alvo: str, resultados_dir: Path) -> Path:
    """Aceita caminho do TXT, nome do arquivo ou protocolo (ex.: 20260924-AB4D238E)."""
    caminho = Path(alvo)
    if caminho.suffix.lower() == ".txt" and caminho.exists():
        return caminho
    if (resultados_dir / alvo).exists():
        return resultados_dir / alvo

    arquivos = sorted(resultados_dir.glob("*-resultado-*.txt"), key=lambda p: p.stat().st_mtime, reverse=True)
    alvo_normalizado = _normalizar(alvo)

    for arquivo in arquivos:
        if alvo_normalizado in _normalizar(arquivo.name):
            return arquivo

    # Ultimo recurso: procura o protocolo dentro do proprio texto.
    for arquivo in arquivos:
        if alvo_normalizado in _normalizar(ler_resultado(arquivo.read_text(encoding="utf-8-sig")).protocolo):
            return arquivo

    raise FileNotFoundError(f"Resultado nao encontrado para '{alvo}' em {resultados_dir}")


def _resultados_dir(config_path: Path) -> Path:
    import configparser

    parser = configparser.ConfigParser()
    parser.read(config_path, encoding="utf-8")
    parser.read(Path(config_path).with_name("config.local.ini"), encoding="utf-8")
    drive = parser["drive"] if parser.has_section("drive") else {}
    return Path(drive.get("results_dir", "downloads\\inscricoes\\resultados"))


def regerar_pdf(alvo: str, config_path: Path = DEFAULT_CONFIG_PATH, logger: logging.Logger = LOGGER) -> Path:
    import nota_pdf

    caminho = localizar_resultado(alvo, _resultados_dir(config_path))
    return gerar_pdf_resultado(caminho, nota_pdf.ConfigPdf.carregar(config_path), logger)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Gera o PDF de um resultado de inscricao, remocao e portabilidade.")
    parser.add_argument("alvo", nargs="?",
                        help="Caminho do TXT, nome do arquivo ou protocolo. Sem valor, refaz o mais recente.")
    parser.add_argument("--todos", action="store_true", help="Regera o PDF de todos os resultados.")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Caminho do config.ini.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    config_path = Path(args.config)
    pasta = _resultados_dir(config_path)

    if args.todos:
        import nota_pdf

        config = nota_pdf.ConfigPdf.carregar(config_path)
        arquivos = sorted(pasta.glob("*-resultado-*.txt"))
        if not arquivos:
            LOGGER.error("Nenhum resultado encontrado em %s", pasta)
            return 1
        for arquivo in arquivos:
            gerar_pdf_resultado(arquivo, config, LOGGER)
        LOGGER.info("%s PDF(s) gerado(s).", len(arquivos))
        return 0

    alvo = args.alvo
    if not alvo:
        arquivos = sorted(pasta.glob("*-resultado-*.txt"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not arquivos:
            LOGGER.error("Nenhum resultado encontrado em %s", pasta)
            return 1
        alvo = str(arquivos[0])

    try:
        destino = regerar_pdf(alvo, config_path)
    except FileNotFoundError as exc:
        LOGGER.error("%s", exc)
        return 1

    LOGGER.info("PDF gerado em %s", destino)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
