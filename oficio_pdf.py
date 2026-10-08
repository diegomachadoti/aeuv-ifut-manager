"""Ofício à Futel: TXT/INI editável, PDF AEUV e checklist de documentação.

Não protocola, publica documentos pessoais ou altera permissões no Drive.
As exigências foram conferidas em oficio-requerimento/Futel.EspaçoPublico.doc.
"""

from __future__ import annotations

import argparse
import configparser
import logging
import re
from dataclasses import dataclass, replace
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlsplit
from xml.sax.saxutils import escape

from nota_pdf import AZUL, AZUL_CLARO, ConfigPdf, LayoutPdf, LOGGER, DEFAULT_CONFIG_PATH

RAIZ = Path(__file__).resolve().parent
PASTA_PADRAO = RAIZ / "oficio-requerimento"
MODELO_PADRAO = PASTA_PADRAO / "modelo-oficio-futel.txt"
MARCADOR_PENDENTE = re.compile(r"\[\s*(?:PENDENTE|A DEFINIR|A PREENCHER)|SUBSTITUIR", re.I)

# Associações usam estatuto e ata de eleição (2.2.3), não contrato social.
ANEXOS = (
    ("cnpj", "2.2.1 — Comprovante de inscrição no CNPJ"),
    ("estatuto", "1.7 / 2.2.3 — Estatuto registrado e suas alterações"),
    ("ata_eleicao", "1.7 / 2.2.3 — Ata de eleição dos atuais diretores"),
    ("documento_foto", "1.7 / 2.2.4 — Documento com foto / RG do Presidente"),
    ("cpf_dirigente", "2.2.4 — CPF do Presidente"),
    ("endereco_dirigente", "2.2.4 — Comprovante de endereço do Presidente"),
    ("cnd_federal", "2.2.5 — Certidão federal, Dívida Ativa da União e Previdência Social"),
    ("cnd_estadual", "2.2.6 — Certidão negativa da Fazenda Estadual"),
    ("cnd_municipal_entidade", "2.2.7 — Certidão negativa municipal da associação"),
    ("cnd_municipal_dirigente", "2.2.7 — Certidão negativa municipal do Presidente"),
    ("fgts", "2.2.8 — Certificado de regularidade do FGTS (CRF)"),
    ("cndt", "2.2.9 — Certidão negativa de débitos trabalhistas"),
    ("regulamento", "1.9 — Regulamento da competição"),
    ("folders", "1.9 — Folders / material de divulgação"),
    ("reportagens", "1.9 — Reportagens de jornais"),
)
POSTERIORES = (
    ("inscricoes", "2.3.1 — Inscrições das equipes e atletas"),
    ("tabela_jogos", "2.3.1 — Tabela de jogos"),
    ("sumulas", "2.3.2 — Súmulas"),
    ("pontuacao", "2.3.2 — Lista de pontuação / classificação"),
    ("resultados", "2.3.2 — Resultados finais / classificação final"),
    ("reportagens_finais", "2.3.2 — Reportagens de jornais após o evento"),
)
CAMPOS_OBRIGATORIOS = {
    "oficio": ("numero", "data", "destinatario", "assunto", "pedido", "alinhamento_previo"),
    "requerente": ("razao_social", "cnpj", "endereco", "telefone", "email", "contato",
                   "representante", "cargo", "cidade"),
    "evento": ("denominacao", "finalidade", "modalidade", "caracteristicas", "publico",
               "inicio_competicao", "inicio_uso", "fim_uso", "locais", "montagem",
               "desmontagem", "ingressos"),
    "condicoes": ("musica", "venda_alimentos", "criancas_adolescentes", "procuracao"),
}


@dataclass
class Oficio:
    origem: Path
    dados: configparser.ConfigParser

    def campo(self, secao: str, nome: str) -> str:
        return self.dados.get(secao, nome, fallback="").strip()


def localizar_oficio(alvo: str | Path) -> Path:
    caminho = Path(alvo)
    for base in (caminho, PASTA_PADRAO / caminho.name):
        for candidato in (base, base.with_name(base.name + ".txt")):
            if candidato.is_file() and candidato.suffix.lower() == ".txt":
                return candidato
    raise FileNotFoundError(f"TXT de ofício não encontrado: {alvo}")


def ler_oficio(alvo: str | Path) -> Oficio:
    origem = localizar_oficio(alvo)
    dados = configparser.ConfigParser(interpolation=None)
    try:
        dados.read_string(origem.read_text(encoding="utf-8-sig"))
    except configparser.Error as exc:
        raise ValueError(f"Formato inválido em {origem.name}: {exc}") from exc
    return Oficio(origem, dados)


def _data(valor: str, campo: str) -> date:
    for formato in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(valor, formato).date()
        except ValueError:
            pass
    raise ValueError(f"{campo}: data inválida '{valor}'. Use DD/MM/AAAA.")


def _link_valido(valor: str) -> bool:
    try:
        url = urlsplit(valor)
        return url.scheme == "https" and bool(url.hostname) and not MARCADOR_PENDENTE.search(valor)
    except ValueError:
        return False


def cronograma(oficio: Oficio) -> list[list[str]]:
    """Cada linha do TXT é data = fase | horário | jogos | local."""
    linhas = []
    if oficio.dados.has_section("cronograma"):
        for dia, valor in oficio.dados.items("cronograma"):
            partes = [p.strip() for p in valor.split("|")]
            if len(partes) != 4 or not all(partes):
                raise ValueError(f"Cronograma {dia}: use fase | horário | jogos | local.")
            _data(dia, "cronograma")
            linhas.append([dia, *partes])
    return sorted(linhas, key=lambda linha: _data(linha[0], "cronograma"))


def _licencas(oficio: Oficio) -> list[tuple[str, str]]:
    documentos = [("alvara_evento", "3.1 — Alvará de licença para realização de eventos")]
    for condicao, chave, titulo in (
        ("musica", "ecad", "3.2 — Licença ECAD, se houver execução musical"),
        ("criancas_adolescentes", "alvara_infancia", "3.3 — Alvará da Infância e Juventude, se houver entrada de menores"),
        ("venda_alimentos", "alvara_sanitario", "3.4 — Alvará sanitário, se houver venda de alimentos"),
    ):
        if oficio.campo("condicoes", condicao).casefold() not in ("não", "nao"):
            documentos.append((chave, titulo))
    return documentos


def pendencias_oficio(oficio: Oficio) -> list[str]:
    pendencias = []
    for secao, nomes in CAMPOS_OBRIGATORIOS.items():
        for nome in nomes:
            valor = oficio.campo(secao, nome)
            if not valor or MARCADOR_PENDENTE.search(valor):
                pendencias.append(f"[{secao}] {nome}: {valor or 'PENDENTE — preencher'}")
    for nome in CAMPOS_OBRIGATORIOS["condicoes"]:
        valor = oficio.campo("condicoes", nome)
        if valor and not MARCADOR_PENDENTE.search(valor) and valor.casefold() not in ("sim", "não", "nao"):
            pendencias.append(f"[condicoes] {nome}: responda sim ou nao")
    datas = {}
    for secao, nome in (("oficio", "data"), ("evento", "inicio_competicao"),
                        ("evento", "inicio_uso"), ("evento", "fim_uso")):
        valor = oficio.campo(secao, nome)
        if valor and not MARCADOR_PENDENTE.search(valor):
            datas[nome] = _data(valor, nome)
    if "inicio_uso" in datas and "fim_uso" in datas and datas["inicio_uso"] > datas["fim_uso"]:
        raise ValueError("A data final de uso não pode ser anterior à data inicial.")
    if "inicio_competicao" in datas and "inicio_uso" in datas and datas["inicio_uso"] < datas["inicio_competicao"]:
        raise ValueError("O início do uso não pode ser anterior ao início da competição neste modelo.")
    for chave, titulo in ANEXOS:
        if not _link_valido(oficio.campo("anexos", chave)):
            pendencias.append(f"Anexo {titulo}: substituir o link provisório por acesso HTTPS ao documento")
    if oficio.campo("condicoes", "procuracao").casefold() == "sim":
        if not _link_valido(oficio.campo("anexos", "procuracao")):
            pendencias.append("2.2.4 — Procuração: informar o link do documento")
    linhas = cronograma(oficio)
    if not linhas:
        pendencias.append("[cronograma]: preencher datas, fases, horários, quantidade de jogos e locais")
    for linha in linhas:
        dia = _data(linha[0], "cronograma")
        if "inicio_uso" in datas and dia < datas["inicio_uso"] or "fim_uso" in datas and dia > datas["fim_uso"]:
            raise ValueError(f"Cronograma {linha[0]} fora do período de uso solicitado.")
        if MARCADOR_PENDENTE.search(" ".join(linha)):
            pendencias.append(f"Cronograma {linha[0]}: completar informações pendentes")
    return pendencias


def relatorio_pendencias(oficio: Oficio, pendencias: list[str]) -> str:
    linhas = [f"CHECKLIST FUTEL — OFÍCIO {oficio.campo('oficio', 'numero')}", "",
              "PENDÊNCIAS DE PREENCHIMENTO / ANEXOS PARA O REQUERIMENTO E O TERMO"]
    linhas.extend(f"- {p}" for p in pendencias)
    if not pendencias:
        linhas.append("- Sem pendências de preenchimento. Conferir validade, conteúdo e acesso aos documentos.")
    emissao, inicio = oficio.campo("oficio", "data"), oficio.campo("evento", "inicio_uso")
    linhas += ["", "ANTECEDÊNCIA / ALINHAMENTO"]
    if emissao and inicio and not MARCADOR_PENDENTE.search(emissao + inicio):
        dias = (_data(inicio, "inicio_uso") - _data(emissao, "data")).days
        linhas.append(f"- Emissão até primeiro uso: {dias} dias. O documento da Futel exige antecedência mínima de 40 dias.")
        if dias < 40:
            linhas.append("- Confirmar com a Futel o tratamento do prazo no protocolo; reunião prévia não comprova dispensa formal.")
    linhas.append("- Alinhamento informado: " + oficio.campo("oficio", "alinhamento_previo"))
    linhas += ["", "DOCUMENTOS ESPORTIVOS POSTERIORES (2.3.3.1 permite apresentação após o evento)"]
    linhas.extend(f"- {titulo}: {oficio.campo('posteriores', chave) or 'PENDENTE — mapear acesso'}"
                  for chave, titulo in POSTERIORES)
    linhas += ["", "DOCUMENTOS APÓS ASSINATURA DO TERMO (item 3)"]
    linhas.extend(f"- {titulo}: {oficio.campo('licencas', chave) or 'PENDENTE — providenciar / confirmar aplicabilidade'}"
                  for chave, titulo in _licencas(oficio))
    linhas += ["", "CONFERÊNCIAS ANTES DO PROTOCOLO",
               "- Links não substituem a apresentação exigida: confirmar com a Futel o formato aceito e anexar cópias quando solicitado.",
               "- Conferir certidões vigentes, estatuto registrado, ata atual e documentação do representante.",
               "- Não publicar RG, CPF e comprovantes como arquivos abertos; conceder acesso apenas aos destinatários autorizados.",
               "- Não foi verificado o conteúdo remoto dos links. Não há protocolo, aprovação ou dispensa automática."]
    return "\n".join(linhas) + "\n"


def criar_modelo_oficio(destino: str | Path) -> Path:
    """Copia o modelo editável sem sobrescrever uma redação já existente."""
    destino = Path(destino)
    if destino.suffix.lower() != ".txt":
        raise ValueError("O modelo de ofício deve ter extensão .txt.")
    destino.parent.mkdir(parents=True, exist_ok=True)
    with destino.open("x", encoding="utf-8") as arquivo:
        arquivo.write(MODELO_PADRAO.read_text(encoding="utf-8-sig"))
    return destino


def _fmt(texto: str) -> str:
    """Escapa texto e cria links clicáveis sem aceitar HTML do arquivo."""
    partes = []
    ultimo = 0
    for match in re.finditer(r"https://[^\s<>]+", texto):
        partes.append(escape(texto[ultimo:match.start()]))
        url = escape(match.group(), {'"': '&quot;'})
        partes.append(f'<link href="{url}" color="{AZUL}"><u>{url}</u></link>')
        ultimo = match.end()
    partes.append(escape(texto[ultimo:]))
    return "".join(partes).replace("\n", "<br/>")


def _acesso_documento(valor: str) -> str:
    """Mostra um rótulo curto, preservando a URL real apenas no destino do link."""
    if _link_valido(valor):
        url = escape(valor, {'"': '&quot;'})
        rotulo = "Abrir pasta" if "/folders/" in urlsplit(valor).path else "Abrir documento"
        return f'<link href="{url}" color="{AZUL}"><u>{rotulo}</u></link>'
    if not valor or MARCADOR_PENDENTE.search(valor):
        return "A disponibilizar"
    if valor.startswith(("http://", "https://")):
        return "Link a revisar"
    return _fmt(valor)


def _tabela_documentos(documentos: list[tuple[str, str]], layout: LayoutPdf):
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph, Table, TableStyle

    descricao = ParagraphStyle("oficio_documento", parent=layout.base, alignment=TA_LEFT,
                               fontName=layout.negrito, textColor=colors.HexColor(AZUL),
                               fontSize=9.5, leading=13, spaceAfter=0)
    acesso = ParagraphStyle("oficio_acesso", parent=layout.base, alignment=TA_LEFT,
                            fontSize=9, leading=12, spaceAfter=0, splitLongWords=1)
    cabecalho = ParagraphStyle("oficio_documentos_cabecalho", parent=descricao, textColor=colors.white)
    linhas = [[Paragraph("Documento", cabecalho), Paragraph("Acesso", cabecalho)]]
    linhas.extend([Paragraph(escape(titulo), descricao), Paragraph(_acesso_documento(valor), acesso)]
                  for titulo, valor in documentos)
    tabela = Table(linhas, colWidths=[layout.largura_util * .76, layout.largura_util * .24], repeatRows=1)
    tabela.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(AZUL)),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor(AZUL_CLARO), colors.white]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, 0), .5, colors.HexColor(AZUL)),
    ]))
    return tabela


def gerar_pdf_oficio(alvo: str | Path, config: ConfigPdf | None = None,
                     logger: logging.Logger = LOGGER, exigir_final: bool = False) -> Path:
    """Gera sempre versão final assinada; exigir_final é mantido por compatibilidade."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import CondPageBreak, Flowable, Paragraph, Spacer, Table, TableStyle

    oficio = ler_oficio(alvo)
    pendencias = pendencias_oficio(oficio)
    config = config or ConfigPdf.carregar()
    config = replace(config, associacao=oficio.campo("requerente", "razao_social") or config.associacao,
                     competicao=oficio.campo("evento", "denominacao"),
                     cidade=oficio.campo("requerente", "cidade"),
                     assinatura_nome=oficio.campo("requerente", "representante"),
                     assinatura_cargo=oficio.campo("requerente", "cargo"))
    if not config.logo.is_file() and not config.logo_url:
        pendencias.append("Logomarca AEUV: configurar [pdf] logo ou logo_url para o papel timbrado")
    if not config.assinatura.is_file():
        pendencias.append("Assinatura do Presidente: imagem não encontrada no caminho configurado em [pdf]")
    relatorio = oficio.origem.with_suffix(".pendencias.txt")
    relatorio.write_text(relatorio_pendencias(oficio, pendencias), encoding="utf-8")
    if not config.assinatura.is_file():
        raise ValueError(f"Assinatura do Presidente não encontrada. Revise [pdf] assinatura e {relatorio}.")
    if exigir_final:
        logger.debug("[OFICIO] A opção de finalização é mantida por compatibilidade; o PDF é sempre final.")
    layout = LayoutPdf.criar(config, logger)
    if layout.logo is None:
        if not any("Logomarca AEUV" in p for p in pendencias):
            pendencias.append("Logomarca AEUV: não foi possível obter a imagem do papel timbrado")
        relatorio.write_text(relatorio_pendencias(oficio, pendencias), encoding="utf-8")
        raise ValueError(f"Papel timbrado indisponível. Revise {relatorio}.")
    base = layout.base
    estilo_campo = ParagraphStyle("oficio_campo", parent=base, alignment=TA_LEFT)
    pequeno = ParagraphStyle("oficio_pequeno", parent=base, fontSize=8, leading=11,
                             alignment=TA_LEFT, splitLongWords=1)
    titulo = f"OFÍCIO Nº {oficio.campo('oficio', 'numero')}"
    historia: list[Flowable] = [Paragraph(_fmt(titulo), layout.estilos["titulo"]),
                               Paragraph("REQUERIMENTO DE AUTORIZAÇÃO DE USO DE ESPAÇOS PÚBLICOS", layout.estilos["subtitulo"])]

    def paragrafo(texto: str) -> None:
        historia.append(Paragraph(_fmt(texto), base))

    def campo(rotulo: str, texto: str) -> None:
        historia.append(Paragraph(f"<b>{escape(rotulo)}:</b> {_fmt(texto or '[PENDENTE: preencher]')}", estilo_campo))

    def secao(texto: str) -> None:
        historia.extend([CondPageBreak(80), Spacer(1, 8), layout.faixa(texto), Spacer(1, 7)])

    campo("Requerente", config.associacao)
    for nome, rotulo in (("cnpj", "CNPJ"), ("endereco", "Endereço"), ("telefone", "Telefone"),
                         ("email", "E-mail"), ("contato", "Contato responsável")):
        campo(rotulo, oficio.campo("requerente", nome))
    campo("À", oficio.campo("oficio", "destinatario"))
    campo("Assunto", oficio.campo("oficio", "assunto"))
    paragrafo(oficio.campo("oficio", "pedido"))
    paragrafo(oficio.campo("oficio", "alinhamento_previo"))
    secao("1 — INFORMAÇÕES DO EVENTO")
    for nome, rotulo in (("denominacao", "1.1 — Denominação"), ("finalidade", "1.2 — Finalidade"),
                         ("modalidade", "1.3 — Modalidade"), ("caracteristicas", "1.4 — Características básicas"),
                         ("publico", "1.5 — Estimativa de público")):
        campo(rotulo, oficio.campo("evento", nome))
    campo("Início da competição", oficio.campo("evento", "inicio_competicao"))
    campo("Período de uso solicitado", oficio.campo("evento", "inicio_uso") + " a " + oficio.campo("evento", "fim_uso"))
    campo("Locais", oficio.campo("evento", "locais"))
    campo("1.6 — Montagem", oficio.campo("evento", "montagem"))
    campo("1.6 — Desmontagem", oficio.campo("evento", "desmontagem"))
    campo("1.7 — Representante legal", config.assinatura_nome + " — " + config.assinatura_cargo)
    campo("1.8 — Ingressos", oficio.campo("evento", "ingressos"))
    secao("CRONOGRAMA DE USO DOS POLIESPORTIVOS")
    linhas = cronograma(oficio)
    if linhas:
        tabela = Table([[Paragraph(t, layout.estilos["secao"]) for t in ("Data", "Fase", "Hora", "Jogos", "Local")]] +
                       [[Paragraph(_fmt(c), pequeno) for c in linha] for linha in linhas],
                       colWidths=[layout.largura_util * f for f in (.15, .23, .12, .1, .4)], repeatRows=1)
        tabela.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(AZUL)),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(AZUL_CLARO)]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        historia.append(tabela)
    else:
        paragrafo("[PENDENTE: informar cronograma no TXT]")
    paragrafo("Horários e locais sujeitos à disponibilidade e definição semanal da Futel. A indicação de local a confirmar não representa reserva ou autorização já expedida.")
    secao("2 — DOCUMENTOS DO REQUERIMENTO E DA ASSOCIAÇÃO")
    paragrafo("Relação de documentos para apresentação e elaboração do termo. Conferir o acesso aos links e entregar as cópias na forma solicitada pela Futel.")
    anexos: list[tuple[str, str]] = list(ANEXOS)
    if oficio.campo("condicoes", "procuracao").casefold() == "sim":
        anexos.append(("procuracao", "2.2.4 — Procuração do representante"))
    documentos = [(descricao, oficio.campo("anexos", chave)) for chave, descricao in anexos]
    documentos.append(("Divulgação complementar — Instagram AEUV", oficio.campo("fontes", "instagram")))
    historia.append(_tabela_documentos(documentos, layout))
    secao("DOCUMENTAÇÃO ESPORTIVA POSTERIOR — ITEM 2.3")
    paragrafo("Conforme o subitem 2.3.3.1 das orientações, os documentos dos subitens 2.3.1 e 2.3.2 poderão ser apresentados após a realização do evento. A tabela oficial já integra o planejamento da competição.")
    historia.append(_tabela_documentos(
        [(descricao, oficio.campo("posteriores", chave)) for chave, descricao in POSTERIORES], layout))
    secao("DOCUMENTAÇÃO APÓS ASSINATURA DO TERMO — ITEM 3")
    historia.append(_tabela_documentos(
        [(descricao, oficio.campo("licencas", chave)) for chave, descricao in _licencas(oficio)], layout))
    paragrafo("A autorização de uso e o agendamento permanecem sujeitos à análise da Futel e à apresentação da documentação exigida.")
    emissao = oficio.campo("oficio", "data")
    if emissao and not MARCADOR_PENDENTE.search(emissao):
        from sumula_disciplinar import data_por_extenso
        emissao = data_por_extenso(_data(emissao, "data"))
    historia.append(layout.bloco_assinatura(f"{config.cidade}, {emissao}.", [config.associacao], assinar=True))
    destino = oficio.origem.with_suffix(".pdf")
    layout.construir(destino, historia, titulo, rodape=f"Ofício {oficio.campo('oficio', 'numero')} · Futel",
                     marca_dagua="",
                     subtitulo="CNPJ: " + oficio.campo("requerente", "cnpj"),
                     assunto=oficio.campo("oficio", "assunto"))
    logger.info("[OFICIO] PDF final assinado: %s; checklist: %s", destino, relatorio)
    if pendencias:
        logger.warning("[OFICIO] %s pendência(s) registradas em %s; revisar antes do protocolo.", len(pendencias), relatorio)
    return destino


def main() -> int:
    parser = argparse.ArgumentParser(description="Modelo TXT e PDF de ofício de autorização à Futel")
    acao = parser.add_mutually_exclusive_group(required=True)
    acao.add_argument("--criar-modelo", metavar="TXT")
    acao.add_argument("--gerar-pdf", metavar="TXT")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    parser.add_argument("--final", action="store_true", help="Compatibilidade: o PDF já é sempre final e assinado")
    args = parser.parse_args()
    if args.final and not args.gerar_pdf:
        parser.error("--final exige --gerar-pdf")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    try:
        if args.criar_modelo:
            print(criar_modelo_oficio(args.criar_modelo))
        else:
            print(gerar_pdf_oficio(args.gerar_pdf, ConfigPdf.carregar(Path(args.config)), exigir_final=args.final))
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Erro: {exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
