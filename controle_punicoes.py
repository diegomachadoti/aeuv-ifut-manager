"""Controle de punicoes da AEUV (Associacao Esportiva Uberlandense Varzeana).

Apos cada Nota Oficial, os punidos da secao "DA PUNIÇÃO" sao registrados em um TXT unico
(tabela separada por "|", que tambem abre no Excel) e, a cada gravacao, o PDF do controle no
layout da associacao (mesmo nome, extensao .pdf). Cada linha e uma penalidade: competicao,
datas, partida, equipe, punido, artigo, partidas ou tempo de suspensao, status e situacao.

A leitura e feita no proprio TXT da nota, por isso funciona para regras fixas, IA e para notas
revisadas manualmente (basta regerar o PDF ou rodar --atualizar-controle-punicoes). Uma nova nota
da mesma sumula substitui os registros da nota anterior. A coluna SITUAÇÃO pode ser editada
(ex.: A CUMPRIR -> CUMPRIDA) e e preservada nas atualizacoes.
"""

from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

from main import DEFAULT_CONFIG_PATH, normalize_text

LOGGER = logging.getLogger("ifut_bot")
CONTROLE_PADRAO = Path("downloads\\sumulas\\CONTROLE DE PUNIÇÕES - AEUV.txt")
SITUACAO_PADRAO = "A CUMPRIR"
MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro",
         "outubro", "novembro", "dezembro"]
SECOES_FIM = ("DA PROPORCIONALIDADE", "DISPOSIÇÕES FINAIS", "DISPOSICOES FINAIS", "RELATÓRIO OFICIAL")
SEM_PENA = ("sem penalidade", "nao aplicar", "absolv", "arquiv", "nenhuma penalidade")
RE_ARTIGO = re.compile(r"ART\.?\s*(\d+(?:\.\d+)?)(?:\s*,?\s*§\s*(\d+|único|unico)\s*º?)?(?:\s*,?\s*inciso\s+([IVXL]+))?",
                       re.IGNORECASE)
RE_PARTIDAS = re.compile(r"(\d+)\s*(?:\([^)]*\)\s*)?partidas?\b", re.IGNORECASE)
RE_TEMPO = re.compile(r"(\d+)\s*(?:\([^)]*\)\s*)?(anos?|m[eê]s(?:es)?|dias?)\b", re.IGNORECASE)
RE_SUMULA = re.compile(r"SUM-\d{8}-[0-9A-F]+", re.IGNORECASE)


@dataclass
class Punicao:
    nota: str
    data_nota: str
    competicao: str
    data_jogo: str
    partida: str
    equipe: str
    punido: str
    tipo: str
    camisa: str
    artigo: str
    partidas: str
    tempo: str
    decisao: str
    cartao_vermelho: str
    status: str
    situacao: str
    sumula: str
    modo: str


COLUNAS = {
    "nota": "NOTA", "data_nota": "DATA NOTA", "competicao": "COMPETIÇÃO", "data_jogo": "DATA JOGO",
    "partida": "PARTIDA", "equipe": "EQUIPE", "punido": "PUNIDO", "tipo": "TIPO", "camisa": "CAMISA",
    "artigo": "ARTIGO", "partidas": "PARTIDAS", "tempo": "TEMPO", "decisao": "DECISÃO",
    "cartao_vermelho": "CARTÃO VERMELHO", "status": "STATUS", "situacao": "SITUAÇÃO", "sumula": "SÚMULA",
    "modo": "MODO",
}


# ---------------------------------------------------------------------------
# Leitura da nota
# ---------------------------------------------------------------------------

def _data_nota(texto: str, cidade: str, arquivo: Path) -> str:
    padrao = rf"{re.escape(cidade)},\s*(\d{{1,2}})\s+de\s+(\w+)\s+de\s+(\d{{4}})" if cidade else r"$^"
    achado = re.search(padrao, texto)
    if achado:
        mes = normalize_text(achado.group(2))
        if mes in MESES:
            return f"{int(achado.group(1)):02d}/{MESES.index(mes) + 1:02d}/{achado.group(3)}"
    return datetime.fromtimestamp(arquivo.stat().st_mtime).strftime("%d/%m/%Y")


def _referencia(achado: re.Match) -> str:
    artigo, paragrafo, inciso = achado.group(1), achado.group(2), achado.group(3)
    ref = f"ART. {artigo}"
    if paragrafo:
        ref += ", § único" if normalize_text(paragrafo) == "unico" else f", §{paragrafo}º"
    if inciso:
        ref += f", inciso {inciso.upper()}"
    return ref


def _decisao(linha: str) -> str:
    texto = linha.replace("➡️", "").replace("➡", "").replace("**", "").strip()
    texto = re.split(r",\s*com fundamento", texto, maxsplit=1, flags=re.IGNORECASE)[0]
    return texto.strip(" ;,.")


def _secao_punicao(texto: str) -> list[str]:
    linhas = texto.replace("\r", "").split("\n")
    inicio = next((i for i, l in enumerate(linhas) if l.strip().upper().startswith("DA PUNIÇÃO")), None)
    if inicio is None:
        return []
    fim = next((i for i in range(inicio + 1, len(linhas))
                if linhas[i].strip().upper().startswith(SECOES_FIM)), len(linhas))
    return linhas[inicio + 1:fim]


def extrair_punicoes(nota_txt: Path, sumula, competicao_padrao: str, cidade: str, modo: str) -> list[Punicao]:
    """Le a secao DA PUNIÇÃO e gera um registro por linha de decisao (➡️) com artigo."""
    import nota_pdf
    from sumula_disciplinar import _foi_expulso

    texto = nota_txt.read_text(encoding="utf-8-sig")
    _, corpo, titulo = nota_pdf.ler_nota(texto)
    numero = re.search(r"N[º°o]\s*(\d+\s*/\s*\d{4})", titulo)
    nota = numero.group(1).replace(" ", "") if numero else nota_txt.stem
    competicao = next((l.strip() for l in corpo[1:4] if l.strip()), "") or competicao_padrao
    if normalize_text(competicao) == normalize_text(competicao_padrao):
        competicao = competicao_padrao
    rascunho = nota_pdf.tem_pendencias(texto)
    iso = re.match(r"(\d{4})-(\d{2})-(\d{2})$", sumula.data_jogo.strip())
    base = dict(
        nota=nota, data_nota=_data_nota(texto, cidade, nota_txt), competicao=competicao,
        data_jogo=f"{iso.group(3)}/{iso.group(2)}/{iso.group(1)}" if iso else sumula.data_jogo.strip(),
        partida=f"{sumula.time1} x {sumula.time2}", sumula=sumula.protocolo, modo=modo,
    )
    envolvidos = sorted(sumula.envolvidos, key=lambda e: len(e.nome), reverse=True)
    equipes = [sumula.time1, sumula.time2]

    def citado(linha: str):
        normal = normalize_text(linha)
        return next((e for e in envolvidos if e.nome and normalize_text(e.nome) in normal), None)

    punicoes: list[Punicao] = []
    pessoa, equipe_atual = None, ""
    for linha in _secao_punicao(texto):
        limpa = linha.strip()
        if not limpa:
            continue
        decisao = limpa.startswith("➡")
        envolvido = citado(limpa)
        if not decisao:
            normal = re.sub(r"^\d+\s*", "", normalize_text(limpa))
            time = next((t for t in equipes if normalize_text(t) and normalize_text(t) in normal), "")
            if envolvido:
                pessoa, equipe_atual = envolvido, envolvido.equipe
            elif time and (normal.startswith("equipe") or len(normal) <= len(normalize_text(time)) + 12):
                pessoa, equipe_atual = None, time
            continue
        pessoa = envolvido or pessoa
        ref = RE_ARTIGO.search(limpa)
        if not ref or any(p in normalize_text(limpa) for p in SEM_PENA):
            continue
        texto_decisao = _decisao(limpa)
        pendente = "[A DEFINIR" in limpa
        partidas = RE_PARTIDAS.search(texto_decisao) if not pendente else None
        tempo = RE_TEMPO.search(texto_decisao) if not pendente else None
        if pessoa:
            dados = dict(equipe=pessoa.equipe, punido=pessoa.nome,
                         tipo="Comissão técnica" if pessoa.comissao else "Atleta", camisa=pessoa.camisa or "-",
                         cartao_vermelho="Sim" if _foi_expulso(pessoa, sumula) else "Não")
        else:
            dados = dict(equipe=equipe_atual or "-", punido=f"Equipe {equipe_atual}" if equipe_atual else "(não identificado)",
                         tipo="Equipe", camisa="-", cartao_vermelho="-")
        punicoes.append(Punicao(
            **base, **dados, artigo=_referencia(ref),
            partidas=partidas.group(1) if partidas else "-",
            tempo=f"{tempo.group(1)} {tempo.group(2).lower()}" if tempo else "-",
            decisao="A DEFINIR PELA COMISSÃO" if pendente else texto_decisao,
            status="PENDENTE" if pendente else ("RASCUNHO" if rascunho else "DEFINIDA"),
            situacao=SITUACAO_PADRAO,
        ))
    return punicoes


# ---------------------------------------------------------------------------
# Arquivo de controle
# ---------------------------------------------------------------------------

def ler_controle(caminho: Path) -> list[Punicao]:
    if not caminho.exists():
        return []
    campos = list(COLUNAS)
    registros: list[Punicao] = []
    for linha in caminho.read_text(encoding="utf-8-sig").splitlines():
        partes = [p.strip() for p in linha.split("|")]
        if len(partes) != len(campos) or partes[0] == COLUNAS["nota"]:
            continue
        registros.append(Punicao(**dict(zip(campos, partes))))
    return registros


def _ordem(p: Punicao) -> tuple:
    achado = re.match(r"(\d+)/(\d{4})", p.nota)
    return (int(achado.group(2)), int(achado.group(1))) if achado else (0, 0)


def gravar_controle(caminho: Path, registros: list[Punicao], config_path: Path = DEFAULT_CONFIG_PATH,
                    logger: logging.Logger = LOGGER) -> None:
    registros = sorted(registros, key=_ordem)
    linhas_tabela = [list(COLUNAS.values())] + [
        [str(v).replace("|", "/") for v in asdict(r).values()] for r in registros
    ]
    larguras = [max(len(l[i]) for l in linhas_tabela) for i in range(len(COLUNAS))]

    def formatar(celulas: list[str]) -> str:
        return " | ".join(c.ljust(larguras[i]) for i, c in enumerate(celulas)).rstrip()

    pendentes = sum(r.status != "DEFINIDA" for r in registros)
    import nota_pdf

    config_pdf = nota_pdf.ConfigPdf.carregar(config_path)
    saida = [
        f"CONTROLE DE PUNIÇÕES – {config_pdf.associacao}",
        f"Atualizado em {datetime.now():%d/%m/%Y %H:%M} · {len(registros)} registro(s)"
        + (f" · {pendentes} pendente(s)/rascunho" if pendentes else ""),
        "STATUS: DEFINIDA (pena decidida) · PENDENTE ([A DEFINIR] na nota) · RASCUNHO (nota com divergências).",
        "SITUAÇÃO: editável pela comissão (ex.: A CUMPRIR -> CUMPRIDA); é mantida nas próximas atualizações.",
        "PARTIDAS/TEMPO: suspensão adicional aplicada na nota (a suspensão automática do cartão vermelho não entra).",
        "",
        formatar(linhas_tabela[0]),
        "-+-".join("-" * n for n in larguras),
        *(formatar(l) for l in linhas_tabela[1:]),
        "",
    ]
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text("\n".join(saida), encoding="utf-8-sig")
    try:
        gerar_pdf_controle(registros, caminho.with_suffix(".pdf"), config_pdf, logger)
    except Exception as exc:
        logger.exception("[CONTROLE] Falha ao gerar o PDF do controle de punicoes: %s", exc)


def _chave(p: Punicao) -> tuple:
    return (p.nota, normalize_text(p.punido), p.artigo)


def registrar_punicoes(caminho: Path, novas: list[Punicao], sumula_protocolo: str, nota: str = "",
                       config_path: Path = DEFAULT_CONFIG_PATH, logger: logging.Logger = LOGGER) -> None:
    """Substitui os registros da mesma sumula (nota mais recente prevalece) preservando a SITUAÇÃO."""
    atuais = ler_controle(caminho)
    situacoes = {_chave(p): p.situacao for p in atuais}
    for p in novas:
        p.situacao = situacoes.get(_chave(p), p.situacao)
    mantidos = [p for p in atuais if p.sumula != sumula_protocolo and (not nota or p.nota != nota)]
    gravar_controle(caminho, mantidos + novas, config_path, logger)


# ---------------------------------------------------------------------------
# PDF do controle (layout da associacao)
# ---------------------------------------------------------------------------

COLUNAS_PDF = (
    ("Nota", 1.6), ("Data nota", 1.9), ("Jogo", 3.7), ("Equipe", 2.6), ("Punido", 4.4), ("Artigo", 2.4),
    ("Partidas", 1.5), ("Tempo", 1.6), ("C. verm.", 1.4), ("Status", 2.1), ("Situação", 2.5),
)
CORES_STATUS = {"PENDENTE": "#B3261E", "RASCUNHO": "#B26A00", "DEFINIDA": "#1E7B34"}


def gerar_pdf_controle(registros: list[Punicao], destino: Path, config=None,
                       logger: logging.Logger = LOGGER) -> Path:
    """PDF paisagem com os punidos agrupados por competicao, resumo e assinatura do Presidente.

    Cabecalho e rodape levam somente a associacao (o controle reune todas as competicoes).
    """
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import CondPageBreak, Paragraph, Spacer, Table, TableStyle

    import nota_pdf
    from sumula_disciplinar import data_por_extenso

    config = config or nota_pdf.ConfigPdf.carregar()
    layout = nota_pdf.LayoutPdf.criar(config, logger, paisagem=True)
    fmt, estilos = layout.fmt, layout.estilos
    celula = ParagraphStyle("celula", parent=layout.base, fontSize=8.5, leading=10.5, alignment=0, spaceAfter=0)
    centro = ParagraphStyle("celula_centro", parent=celula, alignment=TA_CENTER)
    cabeca = ParagraphStyle("celula_cabeca", parent=centro, fontName=layout.negrito, textColor=colors.white)

    agora = datetime.now()
    registros = sorted(registros, key=_ordem)
    pendentes = sum(r.status == "PENDENTE" for r in registros)
    rascunhos = sum(r.status == "RASCUNHO" for r in registros)
    a_cumprir = sum(normalize_text(r.situacao) == normalize_text(SITUACAO_PADRAO) for r in registros)
    punidos = len({(normalize_text(r.punido), normalize_text(r.equipe)) for r in registros})

    historia: list = [
        Paragraph("CONTROLE DE PUNIÇÕES", estilos["titulo"]),
        Paragraph(fmt(f"Atualizado em {agora:%d/%m/%Y} às {agora:%H:%M}"), estilos["subtitulo"]),
        layout.caixa([
            Paragraph(fmt(f"Registros: {len(registros)}   ·   Punidos: {punidos}   ·   A cumprir: {a_cumprir}   ·   "
                          f"Pendentes: {pendentes}   ·   Rascunho: {rascunhos}"), estilos["destaque"]),
            Paragraph(fmt("PARTIDAS/TEMPO: suspensão adicional aplicada na nota oficial (a suspensão automática do "
                          "cartão vermelho não entra). STATUS: DEFINIDA (pena decidida), PENDENTE ([A DEFINIR] "
                          "na nota) ou RASCUNHO (nota com divergências)."), celula),
        ], nota_pdf.AZUL_CLARO, nota_pdf.AZUL),
        Spacer(1, 10),
    ]
    if not registros:
        historia.append(Paragraph("Nenhuma punição registrada até o momento.", layout.base))

    larguras = [l * cm for _, l in COLUNAS_PDF]
    escala = layout.largura_util / sum(larguras)
    larguras = [l * escala for l in larguras]
    competicoes: dict[str, list[Punicao]] = {}
    for r in registros:
        competicoes.setdefault(r.competicao or "Competição não informada", []).append(r)

    for competicao, itens in competicoes.items():
        historia += [CondPageBreak(3 * cm), layout.faixa(competicao.upper()), Spacer(1, 4)]
        linhas = [[Paragraph(fmt(nome), cabeca) for nome, _ in COLUNAS_PDF]]
        estilo = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(nota_pdf.AZUL)),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9D1DE")),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]
        for i, r in enumerate(itens, start=1):
            punido = f"<b>{fmt(r.punido)}</b><br/>{fmt(r.tipo)}" + (
                f" · camisa {fmt(r.camisa)}" if r.camisa not in ("", "-") else "")
            cor = CORES_STATUS.get(r.status, "#1B1B1B")
            linhas.append([
                Paragraph(fmt(r.nota), centro),
                Paragraph(fmt(r.data_nota), centro),
                Paragraph(f"{fmt(r.partida)}<br/>{fmt(r.data_jogo)}", celula),
                Paragraph(fmt(r.equipe), celula),
                Paragraph(punido, celula),
                Paragraph(fmt(r.artigo), centro),
                Paragraph(f"<b>{fmt(r.partidas)}</b>", centro),
                Paragraph(fmt(r.tempo), centro),
                Paragraph(fmt(r.cartao_vermelho), centro),
                Paragraph(f'<font color="{cor}"><b>{fmt(r.status)}</b></font>', centro),
                Paragraph(fmt(r.situacao), centro),
            ])
            if i % 2 == 0:
                estilo.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F4F6FA")))
        tabela = Table(linhas, colWidths=larguras, repeatRows=1)
        tabela.setStyle(TableStyle(estilo))
        historia += [tabela, Spacer(1, 10)]

    linha_data = f"{config.cidade}, {data_por_extenso(agora.date())}." if config.cidade else ""
    historia.append(layout.bloco_assinatura(linha_data, [config.associacao], assinar=True))
    layout.construir(destino, historia, "Controle de Punições", rodape="Controle de Punições",
                     subtitulo="Controle de Punições", assunto="Controle de Punições")
    logger.info("[CONTROLE] PDF do controle de punicoes gerado em %s", destino)
    return destino


# ---------------------------------------------------------------------------
# Integracao com o fluxo
# ---------------------------------------------------------------------------

@dataclass
class ConfigControle:
    arquivo: Path
    pastas_sumulas: list[Path]
    notas_dir: Path
    competicao: str
    cidade: str

    @classmethod
    def carregar(cls, config_path: Path = DEFAULT_CONFIG_PATH) -> "ConfigControle":
        from sumula_disciplinar import ConfigSumulas

        c = ConfigSumulas.carregar(Path(config_path))
        arquivo = c.parser.get("sumulas", "controle_punicoes", fallback="") if c.parser else ""
        return cls(Path(arquivo) if arquivo else CONTROLE_PADRAO,
                   [c.processed_dir, c.download_dir, c.failed_dir], c.notas_dir, c.competicao, c.cidade)


def _modo(nota_txt: Path) -> str:
    return "IA" if "(IA)" in nota_txt.name else "Regras fixas"


def localizar_sumula(nota_txt: Path, config: ConfigControle):
    from sumula_disciplinar import ler_sumula

    achado = RE_SUMULA.search(nota_txt.read_text(encoding="utf-8-sig"))
    if not achado:
        return None
    for pasta in config.pastas_sumulas:
        for arquivo in pasta.glob(f"*{achado.group(0).upper()}*.txt"):
            return ler_sumula(arquivo)
    return None


def registrar_nota(nota_txt: Path, sumula=None, config_path: Path = DEFAULT_CONFIG_PATH,
                   logger: logging.Logger = LOGGER) -> list[Punicao]:
    """Registra no controle as punicoes de uma nota; falhas sao logadas sem interromper o fluxo."""
    try:
        config = ConfigControle.carregar(config_path)
        sumula = sumula or localizar_sumula(nota_txt, config)
        if sumula is None:
            logger.warning("[CONTROLE] Sumula da nota %s nao encontrada; controle nao atualizado", nota_txt.name)
            return []
        punicoes = extrair_punicoes(nota_txt, sumula, config.competicao, config.cidade, _modo(nota_txt))
        registrar_punicoes(config.arquivo, punicoes, sumula.protocolo, config_path=config_path, logger=logger)
        logger.info("[CONTROLE] %s punicao(oes) da nota %s registrada(s) em %s",
                    len(punicoes), nota_txt.name, config.arquivo)
        return punicoes
    except Exception as exc:
        logger.exception("[CONTROLE] Falha ao atualizar o controle de punicoes com %s: %s", nota_txt.name, exc)
        return []


def reconstruir_controle(config_path: Path = DEFAULT_CONFIG_PATH, logger: logging.Logger = LOGGER) -> Path:
    """Refaz o controle a partir de todas as notas; por sumula vale a nota de maior numero."""
    config = ConfigControle.carregar(config_path)
    situacoes = {_chave(p): p.situacao for p in ler_controle(config.arquivo)}
    por_sumula: dict[str, tuple[int, list[Punicao]]] = {}
    for nota_txt in config.notas_dir.glob("NOTA OFICIAL*.txt"):
        sumula = localizar_sumula(nota_txt, config)
        if sumula is None:
            logger.warning("[CONTROLE] Sumula da nota %s nao encontrada; nota ignorada", nota_txt.name)
            continue
        punicoes = extrair_punicoes(nota_txt, sumula, config.competicao, config.cidade, _modo(nota_txt))
        numero = int(m.group(1)) if (m := re.search(r"Nº (\d+)-", nota_txt.name)) else 0
        if numero >= por_sumula.get(sumula.protocolo, (-1, []))[0]:
            por_sumula[sumula.protocolo] = (numero, punicoes)
    registros = [p for _, lista in por_sumula.values() for p in lista]
    for p in registros:
        p.situacao = situacoes.get(_chave(p), p.situacao)
    gravar_controle(config.arquivo, registros, config_path, logger)
    logger.info("[CONTROLE] Controle de punicoes reconstruido: %s registro(s) em %s", len(registros), config.arquivo)
    return config.arquivo
