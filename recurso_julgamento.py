"""Julgamento de recurso disciplinar (ART. 34) – Etapa 1: regras fixas, sem IA.

Fluxo:
1. Move o recurso (e anexos) para a pasta de recursos com nome padronizado (protocolo REC-AAAA-NNN),
   registra no "CONTROLE DE RECURSOS - AEUV.txt" e extrai o texto (PDF, DOCX, DOC ou TXT) para um
   TXT ao lado, para auditoria.
2. Carrega o contexto: nota oficial recorrida, sumula, regulamento e historico de punicoes.
3. Executa as verificacoes objetivas: prazo (48h da nota), legitimidade, assinatura, provas
   (72h do jogo), recurso coletivo, pena x faixa do regulamento, primariedade/reincidencia e
   duplicidade de punicao pelo mesmo fato.
4. Identifica pedidos e argumentos usuais do recurso e responde com base no regulamento.
5. Gera a PRÉVIA da Nota Oficial de julgamento. A decisao de merito sai sempre como
   [A DEFINIR PELA COMISSÃO] (com a sugestao automatica ao lado): so vale depois da revisao
   e da efetivacao com `python main.py --gerar-pdf-nota N`.

A nota de recurso NAO cita o protocolo da sumula e e marcada como "JULGAMENTO DE RECURSO":
assim ela nao substitui as punicoes da nota recorrida no controle de punicoes nem e
confundida com a nota da sumula numa reanalise.
"""

from __future__ import annotations

import configparser
import hashlib
import logging
import re
import shutil
import tempfile
import zipfile
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from xml.etree import ElementTree

from main import DEFAULT_CONFIG_PATH, configure_logging, normalize_text

LOGGER = logging.getLogger("ifut_bot")

MARCADOR_RECURSO = "JULGAMENTO DE RECURSO"
MARCADOR_DEFINIR = "[A DEFINIR PELA COMISSÃO]"
PRAZO_RECURSO_HORAS = 48      # ART. 34, §1º, I
PRAZO_PROVAS_HORAS = 72       # ART. 34, §2º
DURACAO_JOGO_HORAS = 2        # termino estimado da partida (inicio + 2h) para o prazo de provas
MIN_CARACTERES_TEXTO = 80     # abaixo disso o documento e tratado como escaneado (sem texto)
EXTENSOES = (".pdf", ".docx", ".doc", ".txt")

OK, FALHA, DEFINIR, ATENCAO = "OK", "FALHA", "DEFINIR", "ATENÇÃO"

PADRAO_ASSINATURA_TEXTO = re.compile(
    r"assinado digitalmente|assinatura eletronica|assinatura digital|gov br|icp brasil|docusign|clicksign|"
    r"zapsign|autentique|d4sign"
)

# Pedidos usuais (texto normalizado: minusculo, sem acento).
PEDIDOS: dict[str, tuple[str, str]] = {
    "efeito_suspensivo": ("Concessão de efeito suspensivo", r"efeito suspensivo|\bliminar"),
    "anulacao": ("Anulação/absolvição da punição",
                 r"\banula\w*|\babsolv\w*|\barquiva\w*|\bcancelamento\b|\binsubsist\w*|\bimprocedenc\w*"),
    "reducao": ("Redução da pena", r"\breduc\w*|\bminora\w*|\batenua\w*|dosimetria|\babrand\w*"),
    "conversao": ("Conversão em advertência/medida alternativa",
                  r"advertencia|pedagogic\w*|medida alternativa|pena alternativa|\bconvert\w*"),
}

# Argumentos usuais.
ARGUMENTOS: dict[str, tuple[str, str]] = {
    "contesta_fatos": ("Contestação dos fatos relatados pela arbitragem",
                       r"nao (houve|ocorreu|cometeu|praticou|existiu)|inveridic\w*|nao condiz|"
                       r"equivoco da arbitragem|arbitro se equivocou|\bvideo\w*|\bfilmag\w*|\bimagens\b|testemunh\w*"),
    "primariedade": ("Primariedade e bons antecedentes",
                     r"primari\w*|bons antecedentes|sem antecedentes|nunca (foi|havia sido) punido"),
    "sem_lesao": ("Ausência de lesão ou de consequências danosas",
                  r"sem lesao|ausencia de les\w*|inexistencia de les\w*|"
                  r"nao (chegou a )?necessit\w* (de )?atendimento|consequencias? danos\w*"),
    "calor_do_jogo": ("Lance isolado / calor do jogo",
                      r"calor do jogo|lance isolado|lance de jogo|acidental\w*|sem intencao|nao intencional"),
    "cbjd": ("Aplicação analógica do CBJD", r"\bcbjd\b|codigo brasileiro de justica desportiva"),
    "amador": ("Natureza amadora/varzeana da competição", r"\bamador\w*|\bvarzea\w*|recreativ\w*|socioesportiv\w*"),
    "proporcionalidade": ("Proporcionalidade/razoabilidade da pena",
                          r"proporcionalidade|razoabilidade|desproporc\w*|excessiv\w*"),
    "confissao": ("Confissão/arrependimento", r"\bconfess\w*|\bconfiss\w*|arrependi\w*|pedido de desculpas"),
}


# ---------------------------------------------------------------------------
# Extracao do texto do recurso
# ---------------------------------------------------------------------------

@dataclass
class DocumentoRecurso:
    arquivo: Path
    texto: str = ""
    paginas: int = 0
    imagens: int = 0
    assinatura_digital: bool = False
    criado_em: datetime | None = None
    autor: str = ""
    alertas: list[str] = field(default_factory=list)

    @property
    def sem_texto(self) -> bool:
        return len(re.sub(r"\s+", "", self.texto)) < MIN_CARACTERES_TEXTO


def _data_pdf(valor: str) -> datetime | None:
    """Converte data de metadado PDF (D:AAAAMMDDHHmmSS+hh'mm') para horario local."""
    achado = re.match(r"D:(\d{14})(Z|[+-]\d{2}'?\d{2}'?)?", valor or "")
    if not achado:
        return None
    data = datetime.strptime(achado.group(1), "%Y%m%d%H%M%S")
    fuso = achado.group(2)
    if fuso:
        if fuso == "Z":
            data = data.replace(tzinfo=timezone.utc)
        else:
            sinal = 1 if fuso[0] == "+" else -1
            numeros = re.sub(r"\D", "", fuso)
            delta = timedelta(hours=int(numeros[:2]), minutes=int(numeros[2:4] or 0))
            data = data.replace(tzinfo=timezone(sinal * delta))
        data = data.astimezone().replace(tzinfo=None)
    return data


def _extrair_pdf(caminho: Path) -> DocumentoRecurso:
    try:
        import pymupdf
    except ImportError:
        try:
            import fitz as pymupdf  # versoes antigas do PyMuPDF
        except ImportError as exc:
            raise RuntimeError("Leitura de PDF exige o pacote pymupdf: pip install pymupdf") from exc
    documento = DocumentoRecurso(caminho)
    assinatura_widget = getattr(pymupdf, "PDF_WIDGET_TYPE_SIGNATURE", 6)
    partes: list[str] = []
    with pymupdf.open(str(caminho)) as pdf:
        documento.paginas = len(pdf)
        for pagina in pdf:
            partes.append(pagina.get_text())
            documento.imagens += len(pagina.get_images(full=True))
            for widget in pagina.widgets() or []:
                if widget.field_type == assinatura_widget:
                    documento.assinatura_digital = True
        metadados = pdf.metadata or {}
    documento.texto = "\n".join(partes)
    documento.autor = (metadados.get("author") or "").strip()
    documento.criado_em = _data_pdf(metadados.get("creationDate", ""))
    return documento


W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _extrair_docx(caminho: Path) -> DocumentoRecurso:
    documento = DocumentoRecurso(caminho)
    with zipfile.ZipFile(caminho) as pacote:
        nomes = pacote.namelist()
        raiz = ElementTree.fromstring(pacote.read("word/document.xml"))
        documento.imagens = sum(1 for n in nomes if n.startswith("word/media/"))
        documento.assinatura_digital = any(n.startswith("_xmlsignatures/") for n in nomes)
        core = pacote.read("docProps/core.xml") if "docProps/core.xml" in nomes else b""
    paragrafos: list[str] = []
    for paragrafo in raiz.iter(f"{W}p"):
        trechos: list[str] = []
        for no in paragrafo.iter():
            if no.tag == f"{W}t":
                trechos.append(no.text or "")
            elif no.tag == f"{W}tab":
                trechos.append("\t")
            elif no.tag in (f"{W}br", f"{W}cr"):
                trechos.append("\n")
        paragrafos.append("".join(trechos))
    documento.texto = "\n".join(paragrafos)
    if core:
        meta = ElementTree.fromstring(core)
        for no in meta.iter():
            nome = no.tag.rsplit("}", 1)[-1]
            if nome == "creator" and no.text:
                documento.autor = no.text.strip()
            elif nome == "created" and no.text:
                try:
                    documento.criado_em = (datetime.fromisoformat(no.text.strip().replace("Z", "+00:00"))
                                           .astimezone().replace(tzinfo=None))
                except ValueError:
                    pass
    return documento


def _converter_doc(caminho: Path) -> Path:
    """Converte .doc (Word 97-2003) em .docx usando o Word instalado (Windows)."""
    try:
        import win32com.client  # type: ignore[import-not-found]
    except ImportError as exc:
        raise RuntimeError(
            f"{caminho.name} esta no formato .doc antigo. Abra no Word e salve como .docx ou PDF "
            "(ou instale o pacote pywin32 para conversao automatica)."
        ) from exc
    # Converte numa pasta temporaria: o .docx intermediario nao polui a pasta de recursos.
    destino = Path(tempfile.mkdtemp(prefix="recurso_")) / f"{caminho.stem}.docx"
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    try:
        doc = word.Documents.Open(str(caminho.resolve()), ReadOnly=True)
        doc.SaveAs2(str(destino.resolve()), FileFormat=16)  # 16 = wdFormatDocumentDefault (.docx)
        doc.Close(False)
    finally:
        word.Quit()
    return destino


def extrair_texto_recurso(caminho: Path, logger: logging.Logger = LOGGER,
                          destino_texto: Path | None = None, salvar_texto: bool = True) -> DocumentoRecurso:
    """Extrai o texto do recurso e salva em destino_texto (padrao: '<nome> (texto extraído).txt' ao lado)."""
    caminho = Path(caminho)
    if not caminho.exists():
        raise FileNotFoundError(f"Arquivo do recurso nao encontrado: {caminho}")
    extensao = caminho.suffix.lower()
    if extensao not in EXTENSOES:
        raise ValueError(f"Formato nao suportado ({extensao}). Use: {', '.join(EXTENSOES)}")
    if extensao == ".pdf":
        documento = _extrair_pdf(caminho)
    elif extensao == ".docx":
        documento = _extrair_docx(caminho)
    elif extensao == ".doc":
        convertido = _converter_doc(caminho)
        logger.info("[RECURSO] %s convertido para %s", caminho.name, convertido.name)
        documento = _extrair_docx(convertido)
        documento.arquivo = caminho
    else:
        documento = DocumentoRecurso(caminho, caminho.read_text(encoding="utf-8-sig", errors="ignore"))

    if documento.sem_texto:
        documento.alertas.append(
            "O documento praticamente não possui texto extraível (provável digitalização/imagem). "
            "Faça OCR ou transcreva o recurso; a análise automática ficou limitada."
        )
    if salvar_texto:
        salvar_texto_extraido(documento, destino_texto or caminho.with_name(f"{caminho.stem} (texto extraído).txt"),
                              logger)
    return documento


def salvar_texto_extraido(documento: DocumentoRecurso, destino: Path, logger: logging.Logger = LOGGER) -> Path:
    destino.write_text(documento.texto, encoding="utf-8")
    logger.info("[RECURSO] Texto extraido (%s caracteres) salvo em %s", len(documento.texto), destino)
    return destino


# ---------------------------------------------------------------------------
# Contexto: nota recorrida, sumula, punicoes e historico
# ---------------------------------------------------------------------------

@dataclass
class NotaRecorrida:
    arquivo: Path
    numero: str               # ex.: 010/2026
    data: date | None
    sumula: object | None     # sumula_disciplinar.Sumula
    punicoes: list            # controle_punicoes.Punicao


def eh_nota_recurso(texto: str) -> bool:
    """Notas de julgamento de recurso nao alimentam o controle nem fecham sumulas."""
    import nota_pdf

    return nota_pdf.eh_nota_recurso(texto)


def _data_extenso(texto: str, cidade: str) -> date | None:
    from sumula_disciplinar import MESES

    padrao = rf"{re.escape(cidade)},\s*(\d{{1,2}})\s+de\s+([^\s]+)\s+de\s+(\d{{4}})"
    achado = re.search(padrao, texto)
    if not achado:
        return None
    meses = [normalize_text(m) for m in MESES]
    mes = normalize_text(achado.group(2))
    if mes not in meses:
        return None
    return date(int(achado.group(3)), meses.index(mes) + 1, int(achado.group(1)))


def carregar_nota_recorrida(alvo: str, config_path: Path) -> NotaRecorrida:
    import controle_punicoes
    import nota_pdf

    config = controle_punicoes.ConfigControle.carregar(config_path)
    arquivo = nota_pdf.localizar_nota(str(alvo), config.notas_dir)
    texto = arquivo.read_text(encoding="utf-8-sig", errors="ignore")
    if eh_nota_recurso(texto):
        raise ValueError(f"{arquivo.name} ja e uma nota de julgamento de recurso; informe a nota disciplinar original")
    _, _, titulo = nota_pdf.ler_nota(texto)
    numero = re.search(r"N[º°o]\s*(\d+\s*/\s*\d{4})", titulo)
    sumula = controle_punicoes.localizar_sumula(arquivo, config)
    punicoes = (controle_punicoes.extrair_punicoes(arquivo, sumula, config.competicao, config.cidade,
                                                   controle_punicoes._modo(arquivo)) if sumula else [])
    return NotaRecorrida(arquivo, numero.group(1).replace(" ", "") if numero else arquivo.stem,
                         _data_extenso(texto, config.cidade), sumula, punicoes)


@dataclass
class Historico:
    anteriores: int                 # punicoes disciplinares por OUTROS fatos (controle + retroativas)
    notas_mesmo_fato: list[str]     # notas que punem a pessoa pelo mesmo jogo


def historico_pessoa(nome: str, equipe: str, partida: str, data_jogo: str, config_path: Path) -> Historico:
    import controle_punicoes

    arquivo = controle_punicoes.ConfigControle.carregar(config_path).arquivo
    registros = controle_punicoes.ler_controle(arquivo)
    historico = controle_punicoes.historico_punicoes_pessoa(registros, nome, equipe)

    def mesmo_fato(p) -> bool:
        return normalize_text(p.partida) == normalize_text(partida) and p.data_jogo.strip() == data_jogo.strip()

    anteriores = sum(1 for p in historico if not mesmo_fato(p))
    chave = controle_punicoes.chave_pessoa_reincidencia(nome, equipe)
    anteriores += sum(1 for n, e in controle_punicoes._retroativas_para_reincidencia(arquivo)
                      if controle_punicoes.chave_pessoa_reincidencia(n, e) == chave)
    notas = sorted({p.nota for p in historico if mesmo_fato(p)})
    return Historico(anteriores, notas)


# ---------------------------------------------------------------------------
# Verificacoes
# ---------------------------------------------------------------------------

@dataclass
class Verificacao:
    titulo: str
    situacao: str   # OK | FALHA | DEFINIR | ATENÇÃO
    texto: str


@dataclass
class AnalisePena:
    punicao: object             # controle_punicoes.Punicao
    referencia: str
    faixa: tuple[int, int] | None
    partidas: int | None
    situacao: str               # minimo | acima_minimo | fora_faixa | fixa | indefinida
    historico: Historico


def _parse_data_hora(valor: str | None) -> tuple[datetime | None, bool]:
    """Aceita DD/MM/AAAA [HH:MM] ou AAAA-MM-DD [HH:MM]. Retorna (data, tem_hora)."""
    if not valor:
        return None, False
    valor = valor.strip()
    for formato, tem_hora in (("%d/%m/%Y %H:%M", True), ("%Y-%m-%d %H:%M", True),
                              ("%d/%m/%Y", False), ("%Y-%m-%d", False)):
        try:
            return datetime.strptime(valor, formato), tem_hora
        except ValueError:
            continue
    raise ValueError(f"Data/hora invalida: '{valor}'. Use DD/MM/AAAA HH:MM")


def _fmt(data: datetime, com_hora: bool = True) -> str:
    return data.strftime("%d/%m/%Y %H:%M" if com_hora else "%d/%m/%Y")


def verificar_prazo(recebido: datetime, publicada: datetime | None, publicada_tem_hora: bool,
                    numero_nota: str) -> Verificacao:
    titulo = "Tempestividade (ART. 34, §1º, inciso I)"
    if publicada is None:
        return Verificacao(titulo, DEFINIR,
                           f"Data de publicação da Nota Oficial nº {numero_nota} não identificada; "
                           f"informe-a para conferir o prazo de {PRAZO_RECURSO_HORAS} horas.")
    if publicada_tem_hora:
        limite = publicada + timedelta(hours=PRAZO_RECURSO_HORAS)
        dentro = recebido <= limite
        return Verificacao(
            titulo, OK if dentro else FALHA,
            f"Por se tratar de recurso dependente da Nota Oficial, o prazo é de até {PRAZO_RECURSO_HORAS} "
            f"(quarenta e oito) horas após sua publicação. A Nota Oficial nº {numero_nota} foi publicada em "
            f"{_fmt(publicada)} (prazo final: {_fmt(limite)}) e o recurso foi recebido em {_fmt(recebido)}, "
            + ("sendo, portanto, tempestivo." if dentro else "sendo, portanto, intempestivo (ART. 34, §1º, inciso III).")
        )
    limite = publicada.date() + timedelta(days=PRAZO_RECURSO_HORAS // 24)
    base = (f"Por se tratar de recurso dependente da Nota Oficial, o prazo é de até {PRAZO_RECURSO_HORAS} "
            f"(quarenta e oito) horas após sua publicação. A Nota Oficial nº {numero_nota} foi publicada em "
            f"{_fmt(publicada, False)} e o recurso foi recebido em {_fmt(recebido)}")
    if recebido.date() < limite:
        return Verificacao(titulo, OK, base + ", sendo, portanto, tempestivo.")
    if recebido.date() > limite:
        return Verificacao(titulo, FALHA, base + ", sendo, portanto, intempestivo (ART. 34, §1º, inciso III).")
    return Verificacao(titulo, DEFINIR, base + f". O recurso chegou no último dia do prazo; confirme o horário de "
                                               f"publicação da nota para concluir a tempestividade {MARCADOR_DEFINIR}.")


def verificar_legitimidade(texto: str, recorrentes: list[str]) -> tuple[Verificacao, str]:
    titulo = "Legitimidade (ART. 34, §1º, inciso IV)"
    final = normalize_text(texto[-1500:])
    if recorrentes and any(normalize_text(nome) in final for nome in recorrentes):
        return Verificacao(titulo, OK, "O recurso foi interposto pelo próprio atleta/membro envolvido, parte "
                                       "legítima nos termos do ART. 34, §1º, inciso IV."), "proprio"
    if re.search(r"\b(representante|presidente|diretor|dirigente|responsavel)\b", final):
        return Verificacao(titulo, OK, "O recurso foi interposto pelo representante da equipe, parte legítima nos "
                                       "termos do ART. 34, §1º, inciso IV (confirmar se é o representante legal "
                                       "cadastrado)."), "representante"
    return Verificacao(titulo, DEFINIR, "Não foi possível identificar automaticamente quem subscreve o recurso "
                                        f"(atleta envolvido ou representante legal da equipe) {MARCADOR_DEFINIR}."), ""


def verificar_assinatura(documento: DocumentoRecurso) -> Verificacao:
    titulo = "Assinatura (ART. 34, §1º, inciso IV)"
    texto_norm = normalize_text(documento.texto)
    if documento.assinatura_digital or PADRAO_ASSINATURA_TEXTO.search(texto_norm):
        return Verificacao(titulo, OK, "O documento apresenta assinatura digital/eletrônica.")
    if documento.imagens:
        return Verificacao(titulo, ATENCAO, f"O documento contém {documento.imagens} imagem(ns), possivelmente a "
                                            "assinatura digitalizada; confirmar visualmente.")
    autor = f" (autor do arquivo nos metadados: {documento.autor})" if documento.autor else ""
    return Verificacao(
        titulo, DEFINIR,
        "O ART. 34, §1º, inciso IV exige a formalização do recurso mediante assinatura. O documento apresentado "
        f"não contém assinatura do recorrente{autor}. A Comissão deve decidir entre não conhecer do recurso ou "
        "recebê-lo em caráter excepcional, com fundamento no ART. 32, §4º, sem que isso constitua precedente "
        f"{MARCADOR_DEFINIR}."
    )


def verificar_provas(recebido: datetime, anexos: list[Path], sumula, fatos_contestados: bool) -> Verificacao:
    titulo = "Provas (ART. 34, §§ 2º e 3º, inciso II)"
    inicio, _ = _parse_data_hora(f"{sumula.data_jogo} {sumula.hora_jogo}".strip()) if sumula else (None, False)
    limite = inicio + timedelta(hours=DURACAO_JOGO_HORAS + PRAZO_PROVAS_HORAS) if inicio else None
    prazo = (f"O prazo para envio de provas é de {PRAZO_PROVAS_HORAS} (setenta e duas) horas após o término da "
             f"partida (ART. 34, §2º), encerrando-se por volta de {_fmt(limite)}." if limite else
             f"O prazo para envio de provas é de {PRAZO_PROVAS_HORAS} (setenta e duas) horas após o término da partida "
             "(ART. 34, §2º).")
    if not anexos:
        situacao = DEFINIR if fatos_contestados else ATENCAO
        complemento = (f" Como o recurso contesta os fatos sem apresentar provas, a Comissão deve avaliar a "
                       f"admissibilidade nos termos do ART. 34, §3º, inciso II {MARCADOR_DEFINIR}."
                       if fatos_contestados else
                       " A análise foi realizada com base no relatório oficial da arbitragem, na Nota Oficial "
                       "recorrida e nos registros disciplinares da organização.")
        return Verificacao(titulo, situacao,
                           "O recurso não foi acompanhado de documentos comprobatórios. " + prazo + complemento)
    nomes = ", ".join(a.name for a in anexos)
    if limite and recebido > limite:
        return Verificacao(titulo, FALHA, f"Foram apresentados os anexos {nomes}, porém após o prazo. {prazo} "
                                          "Nos termos do ART. 34, §2º, inciso I, os documentos serão desconsiderados.")
    return Verificacao(titulo, DEFINIR, f"Foram apresentados os anexos {nomes}, dentro do prazo. {prazo} "
                                        f"Os documentos devem ser analisados pela Comissão {MARCADOR_DEFINIR}.")


def verificar_coletivo(pessoas: list) -> Verificacao | None:
    equipes = {normalize_text(p.equipe) for p in pessoas}
    if len(equipes) > 1:
        return Verificacao("Recurso individual (ART. 34, §6º)", FALHA,
                           "O recurso envolve pessoas de equipes diferentes; o ART. 34, §6º não admite recurso "
                           "coletivo ou conjunto por mais de uma parte.")
    return None


def _faixa(pena: str | None) -> tuple[int, int] | None:
    if not pena or "partidas" not in pena:
        return None
    numeros = [int(n) for n in re.findall(r"(\d+)\s*\(", pena)]
    return (numeros[0], numeros[1]) if len(numeros) >= 2 else None


def analisar_pena(punicao, regulamento, nota: NotaRecorrida, config_path: Path) -> AnalisePena:
    import controle_punicoes
    from sumula_disciplinar import extrair_pena

    ref = controle_punicoes.RE_ARTIGO.search(punicao.artigo or "")
    trecho = None
    if ref:
        paragrafo = ref.group(2)
        if paragrafo and normalize_text(paragrafo) == "unico":
            paragrafo = "único"
        trecho = regulamento.trecho(ref.group(1), paragrafo, ref.group(3).upper() if ref.group(3) else None)
    pena = extrair_pena(trecho) if trecho else None
    faixa = _faixa(pena)
    partidas = int(punicao.partidas) if str(punicao.partidas).isdigit() else None
    if faixa and partidas is not None:
        if not faixa[0] <= partidas <= faixa[1]:
            situacao = "fora_faixa"
        else:
            situacao = "minimo" if partidas == faixa[0] else "acima_minimo"
    elif pena and "acrescida" in pena:
        situacao = "fixa"
    else:
        situacao = "indefinida"
    historico = historico_pessoa(punicao.punido, punicao.equipe, punicao.partida, punicao.data_jogo, config_path)
    return AnalisePena(punicao, punicao.artigo, faixa, partidas, situacao, historico)


def detectar(texto: str, catalogo: dict[str, tuple[str, str]]) -> list[str]:
    norm = normalize_text(texto)
    return [chave for chave, (_, padrao) in catalogo.items() if re.search(padrao, norm)]


def identificar_recorrentes(texto: str, punicoes: list, nome: str | None) -> list:
    """Punicoes da nota recorrida que pertencem ao(s) recorrente(s)."""
    if nome:
        alvo = normalize_text(nome)
        return [p for p in punicoes if alvo in normalize_text(p.punido) or normalize_text(p.punido) in alvo]
    norm = normalize_text(texto)
    return [p for p in punicoes if normalize_text(p.punido) and normalize_text(p.punido) in norm]


# ---------------------------------------------------------------------------
# Redacao da nota
# ---------------------------------------------------------------------------

def _rotulo(p) -> str:
    tipo = "Comissão técnica" if normalize_text(p.tipo).startswith("comiss") else p.tipo or "Atleta"
    camisa = f" (camisa {p.camisa})" if p.camisa and p.camisa != "-" else ""
    return f"{p.punido} – {tipo}{camisa} – {p.equipe}"


def _pena_txt(p) -> str:
    vermelho = ", além da suspensão automática decorrente do cartão vermelho" if p.cartao_vermelho == "Sim" else ""
    return f"{p.decisao}{vermelho}, com fundamento no {p.artigo}"


def _resposta_argumento(chave: str, penas: list[AnalisePena]) -> tuple[str, str]:
    """(titulo, texto) da resposta padronizada a cada argumento."""
    titulo = ARGUMENTOS[chave][0]
    todas_minimo = penas and all(a.situacao == "minimo" for a in penas)
    primario = penas and all(a.historico.anteriores == 0 for a in penas)
    faixas = "; ".join(f"{a.referencia}: {a.faixa[0]} a {a.faixa[1]} partidas" for a in penas if a.faixa)

    if chave == "contesta_fatos":
        return titulo, ("O recurso questiona a ocorrência ou a dinâmica dos fatos registrados pela arbitragem. O "
                        "relatório oficial da arbitragem é o elemento fundamental de apuração e somente pode ser "
                        "afastado por prova robusta apresentada no prazo do ART. 34, §2º. A Comissão deve avaliar "
                        f"as alegações e eventuais provas {MARCADOR_DEFINIR}.")
    if chave == "primariedade":
        if primario and todas_minimo:
            return titulo, ("A Comissão reconhece que não há registros disciplinares anteriores do recorrente perante "
                            "a organização. Contudo, a primariedade já foi considerada na decisão recorrida, que "
                            "aplicou a pena mínima prevista no regulamento, não existindo previsão de redução abaixo "
                            "desse patamar.")
        if not primario:
            return titulo, ("Não procede: constam registros disciplinares anteriores do recorrente no controle de "
                            "punições da organização, o que afasta a alegação de primariedade.")
        return titulo, ("A Comissão reconhece a primariedade do recorrente. Como a pena aplicada está acima do "
                        "mínimo previsto, cabe à Comissão avaliar se essa circunstância foi devidamente "
                        f"considerada na dosimetria {MARCADOR_DEFINIR}.")
    if chave == "sem_lesao":
        return titulo, ("O regulamento não exige a ocorrência de lesão ou a necessidade de atendimento médico para a "
                        "caracterização da infração enquadrada. "
                        + ("A ausência de lesão foi, inclusive, um dos fatores que conduziram à aplicação da pena "
                           "mínima, sem qualquer acréscimo." if todas_minimo else
                           f"A Comissão pode avaliar essa circunstância na dosimetria {MARCADOR_DEFINIR}."))
    if chave == "calor_do_jogo":
        return titulo, ("A alegação deve ser confrontada com o relatório oficial da arbitragem, que descreve a "
                        "conduta praticada. Sem prova em contrário, prevalece o relato oficial; caso a súmula "
                        "registre conduta deliberada ou fora da disputa de bola, a tese de lance acidental fica "
                        "afastada.")
    if chave == "cbjd":
        return titulo, ("Nos termos do ART. 32, §§ 2º e 3º, o CBJD somente é aplicado de forma subsidiária nos casos "
                        "não previstos no regulamento. A conduta e a respectiva pena estão expressamente previstas "
                        f"no regulamento da competição ({faixas or 'dispositivo aplicado na nota recorrida'}), não "
                        "havendo omissão a ser suprida por analogia.")
    if chave == "amador":
        return titulo, ("O regulamento da competição foi elaborado considerando a natureza varzeana da competição, "
                        "e seu conhecimento é obrigatório a todos os participantes (ART. 32, §§ 5º e 6º). A natureza "
                        "amadora não autoriza a aplicação de pena fora dos limites nele previstos.")
    if chave == "proporcionalidade":
        return titulo, (("A pena aplicada corresponde ao mínimo previsto no regulamento, o que já reflete a "
                         "proporcionalidade da decisão.") if todas_minimo else
                        f"A Comissão deve reavaliar a dosimetria dentro da faixa prevista {MARCADOR_DEFINIR}.")
    if chave == "confissao":
        return titulo, ("O regulamento não prevê redução de pena por confissão, colaboração ou arrependimento, "
                        "circunstâncias que não autorizam a aplicação de pena abaixo do mínimo previsto.")
    return titulo, MARCADOR_DEFINIR


def _sugestao_merito(pedidos: list[str], argumentos: list[str], penas: list[AnalisePena],
                     anexos: list[Path]) -> str:
    if not penas:
        return "sem sugestão automática: recorrente/punição não identificado na nota recorrida"
    if any(a.situacao == "fora_faixa" for a in penas):
        return "DAR PROVIMENTO para adequar a pena à faixa prevista no regulamento"
    if "contesta_fatos" in argumentos and anexos:
        return "sem sugestão automática: analisar as provas apresentadas"
    if any(a.situacao in ("acima_minimo", "indefinida") for a in penas):
        return "avaliar a dosimetria: pena acima do mínimo ou sem faixa identificada"
    return "NEGAR PROVIMENTO – pena já aplicada no mínimo previsto no regulamento"


def montar_nota(numero: int, ano: int, competicao: str, cidade: str, associacao: str, hoje: date,
                documento: DocumentoRecurso, nota: NotaRecorrida, penas: list[AnalisePena],
                verificacoes: list[Verificacao], pedidos: list[str], argumentos: list[str],
                anexos: list[Path], recebido: datetime, texto_extraido: Path) -> str:
    from sumula_disciplinar import data_por_extenso, formatar_data_jogo

    sumula = nota.sumula
    partida = f"{sumula.time1.upper()} x {sumula.time2.upper()}" if sumula else "(partida não identificada)"
    data_jogo = formatar_data_jogo(sumula.data_jogo) if sumula else ""
    pessoas = [a.punicao for a in penas]
    nomes = "; ".join(dict.fromkeys(_rotulo(p) for p in pessoas)) or MARCADOR_DEFINIR
    recorrente_curto = ", ".join(dict.fromkeys(p.punido for p in pessoas)) or MARCADOR_DEFINIR

    alertas = list(documento.alertas)
    for a in penas:
        if len(a.historico.notas_mesmo_fato) > 1:
            alertas.append(f"{a.punicao.punido} possui punições pelo mesmo jogo em mais de uma nota "
                           f"({', '.join(a.historico.notas_mesmo_fato)}): verificar dupla punição pelo mesmo fato.")
    if not penas:
        alertas.append("Recorrente não identificado entre os punidos da nota recorrida; use --recorrente NOME.")

    linhas = [
        f"📝 PRÉVIA EM ANÁLISE – {MARCADOR_RECURSO} (ART. 34). Esta nota ainda NÃO é oficial. Revise, resolva os "
        f"campos [A DEFINIR] e efetive com: python main.py --gerar-pdf-nota {numero}.",
        f"⚠️ NOTA GERADA AUTOMATICAMENTE (regras fixas) – RECURSO-ARQUIVO: {documento.arquivo.name} | nota recorrida: "
        f"{nota.numero} | texto extraído: {texto_extraido.name}. As sugestões estão entre ** ** (vermelho no PDF).",
    ]
    linhas += [f"🔎 ALERTA: {a}" for a in alertas]
    linhas += [
        "",
        f"NOTA OFICIAL Nº {numero:03d}/{ano}",
        competicao.upper(),
        "",
        f"{MARCADOR_RECURSO} – NOTA OFICIAL Nº {nota.numero}",
        f"A Comissão Organizadora/Disciplinar da {competicao}, no uso de suas atribuições regulamentares e nos termos "
        f"do ART. 34 do Regulamento da competição, vem apresentar o julgamento do recurso interposto por "
        f"{recorrente_curto} contra a decisão proferida na Nota Oficial nº {nota.numero}, referente à partida entre "
        f"{partida}" + (f", realizada em {data_jogo}." if data_jogo else "."),
        "",
        "DO RECURSO",
        f"Recorrente: {nomes}.",
    ]
    for p in pessoas:
        linhas.append(f"Decisão recorrida: Nota Oficial nº {nota.numero} – {_pena_txt(p)}.")
    protocolo = re.match(r"(REC-\d{4}-\d+)", documento.arquivo.name)
    linhas.append(f"Recurso recebido em {_fmt(recebido)}"
                  + (f", protocolo {protocolo.group(1)}" if protocolo else "")
                  + (f" (arquivo criado em {_fmt(documento.criado_em)})" if documento.criado_em else "") + ".")
    if pedidos:
        linhas.append("Pedidos identificados: " + "; ".join(f"({i}) {PEDIDOS[c][0]}" for i, c in
                                                             enumerate(pedidos, start=1)) + ".")
    if argumentos:
        linhas.append("Argumentos identificados: " + "; ".join(f"({i}) {ARGUMENTOS[c][0]}" for i, c in
                                                               enumerate(argumentos, start=1)) + ".")
    if "contesta_fatos" not in argumentos:
        linhas.append("O recorrente não contesta os fatos registrados pela arbitragem, limitando-se a questionar a "
                      "penalidade aplicada.")

    linhas += ["", "DA ADMISSIBILIDADE"]
    for v in verificacoes:
        linhas.append(f"{v.titulo}: {v.texto}")
    if any(v.situacao == FALHA for v in verificacoes):
        falhas = ", ".join(v.titulo for v in verificacoes if v.situacao == FALHA)
        linhas.append(f"➡️ Admissibilidade: {MARCADOR_DEFINIR} (sugestão automática: **NÃO CONHECER DO RECURSO** – "
                      f"{falhas})")
    elif any(v.situacao == DEFINIR for v in verificacoes):
        linhas.append(f"➡️ Admissibilidade: {MARCADOR_DEFINIR} (há requisitos pendentes de decisão da Comissão)")
    else:
        linhas.append("➡️ **RECURSO RECEBIDO E CONHECIDO**")

    if "efeito_suspensivo" in pedidos:
        vermelho = any(p.cartao_vermelho == "Sim" for p in pessoas)
        linhas += [
            "",
            "DO PEDIDO DE EFEITO SUSPENSIVO",
            "O Regulamento estabelece expressamente:",
            "   \"ART. 34, § 4º – Apresentar recurso não suspende nem cancela automaticamente a punição. A decisão "
            "continua válida até o julgamento final, salvo decisão expressa em contrário da comissão organizadora.\"",
        ]
        if vermelho:
            linhas.append("   \"ART. 30 – Atleta com acumula de 3 amarelos ou 1 vermelho será suspenso automaticamente "
                          "na partida subsequente, independentemente de recurso.\"")
        linhas.append(
            "A concessão de efeito suspensivo é excepcional e depende de decisão expressa da Comissão. Eventual "
            "participação do punido antes do julgamento poderia expor a própria equipe às consequências do ART. 28, "
            "§2º (escalação de atleta suspenso). Sendo o recurso julgado de forma definitiva nesta Nota, o pedido "
            "fica prejudicado."
        )
        linhas.append("➡️ **EFEITO SUSPENSIVO INDEFERIDO**")

    linhas += ["", "DO MÉRITO"]
    item = 1
    for a in penas:
        p = a.punicao
        if a.situacao == "minimo":
            texto = (f"A pena aplicada a {p.punido} ({p.decisao}) corresponde exatamente ao mínimo previsto no "
                     f"{a.referencia} ({a.faixa[0]} a {a.faixa[1]} partidas), não havendo no regulamento previsão de "
                     "redução abaixo desse patamar.")
        elif a.situacao == "acima_minimo":
            texto = (f"A pena aplicada a {p.punido} ({p.decisao}) está dentro da faixa do {a.referencia} "
                     f"({a.faixa[0]} a {a.faixa[1]} partidas), acima do mínimo. A Comissão deve verificar se a "
                     f"dosimetria foi justificada por circunstâncias registradas no relatório {MARCADOR_DEFINIR}.")
        elif a.situacao == "fora_faixa":
            texto = (f"A pena aplicada a {p.punido} ({p.decisao}) está FORA da faixa do {a.referencia} "
                     f"({a.faixa[0]} a {a.faixa[1]} partidas) e deve ser adequada {MARCADOR_DEFINIR}.")
        elif a.situacao == "fixa":
            texto = (f"A pena aplicada a {p.punido} ({p.decisao}) é fixa, prevista no {a.referencia}, não "
                     "comportando gradação.")
        else:
            texto = (f"Não foi possível identificar automaticamente a faixa de pena do {a.referencia} aplicada a "
                     f"{p.punido} {MARCADOR_DEFINIR}.")
        reinc = ("Não constam registros disciplinares anteriores do punido por outros fatos."
                 if a.historico.anteriores == 0 else
                 f"Constam {a.historico.anteriores} registro(s) disciplinar(es) anterior(es) do punido por outros fatos.")
        linhas += [f"{item}. Da pena aplicada – {p.punido}", texto, reinc]
        item += 1
    for chave in argumentos:
        titulo, texto = _resposta_argumento(chave, penas)
        linhas += [f"{item}. {titulo}", texto]
        item += 1
    if "conversao" in pedidos:
        linhas += [f"{item}. Do pedido de conversão em advertência ou medida alternativa",
                   "O regulamento não prevê pena alternativa, advertência ou medida pedagógica para a infração "
                   "enquadrada. O acolhimento desse pedido violaria a isonomia entre as equipes e a segurança da "
                   "competição."]
        item += 1

    sugestao = _sugestao_merito(pedidos, argumentos, penas, anexos)
    linhas += ["", "DA DECISÃO", "Diante do exposto, a Comissão Organizadora/Disciplinar decide:"]
    linhas.append(f"➡️ Admissibilidade: {MARCADOR_DEFINIR} (conforme item DA ADMISSIBILIDADE)"
                  if any(v.situacao in (FALHA, DEFINIR) for v in verificacoes) else "➡️ **CONHECER do recurso**;")
    if "efeito_suspensivo" in pedidos:
        linhas.append("➡️ **INDEFERIR o pedido de efeito suspensivo**;")
    linhas.append(f"➡️ No mérito: {MARCADOR_DEFINIR} (sugestão automática: **{sugestao}**);")
    for p in pessoas:
        linhas.append(f"➡️ {_rotulo(p)}: {MARCADOR_DEFINIR} (se negado provimento: **mantida a pena de "
                      f"{p.decisao}**{' além da suspensão automática' if p.cartao_vermelho == 'Sim' else ''}).")
    for a in penas:
        if len(a.historico.notas_mesmo_fato) > 1:
            notas = " e ".join(a.historico.notas_mesmo_fato)
            linhas.append(f"Esclarecimento: constam punições de {a.punicao.punido} pelo mesmo jogo nas Notas Oficiais "
                          f"{notas}. Para que não haja dupla punição pelo mesmo fato, a Comissão deve declarar qual "
                          f"nota prevalece {MARCADOR_DEFINIR}.")
    linhas.append("Registra-se ainda que, nos termos do ART. 2º, o atleta punido fica impedido de concorrer ou "
                  "receber qualquer premiação individual da competição.")
    outros = [p for p in nota.punicoes if p not in pessoas]
    for p in outros:
        linhas.append(f"A punição aplicada a {p.punido} na Nota Oficial nº {nota.numero} não foi objeto deste recurso "
                      "e permanece inalterada.")

    linhas += [
        "",
        "DISPOSIÇÕES FINAIS",
        "Nos termos do ART. 34, §5º, a presente decisão é definitiva e irrecorrível no âmbito desta competição.",
        "A Comissão Organizadora reafirma seu compromisso com a disciplina, o respeito à arbitragem, a transparência, "
        "a proporcionalidade e a aplicação criteriosa do regulamento, assegurando a todos os participantes o direito "
        "ao contraditório e à ampla defesa.",
        "",
        "",
        f"{cidade}, {data_por_extenso(hoje)}.",
        "",
        "",
        associacao,
        f" {competicao}",
        "",
    ]
    return "\n".join(linhas)


# ---------------------------------------------------------------------------
# Pasta e controle de recursos
# ---------------------------------------------------------------------------
# Todo recurso recebido vai para a pasta de recursos (padrao: downloads/sumulas/recursos,
# configuravel em [recursos] pasta) com nome padronizado:
#   REC-AAAA-NNN - NOTA 010-2026 - EQUIPE - RECORRENTE.pdf
#   REC-AAAA-NNN - NOTA 010-2026 - EQUIPE - RECORRENTE (texto extraído).txt
#   REC-AAAA-NNN - NOTA 010-2026 - EQUIPE - RECORRENTE - ANEXO 01.jpg
# e ganha uma linha no "CONTROLE DE RECURSOS - AEUV.txt". O mesmo arquivo (mesmo conteudo/hash)
# reaproveita o protocolo REC e a nota de julgamento ao ser reanalisado.

CONTROLE_RECURSOS = "CONTROLE DE RECURSOS - AEUV.txt"
SITUACAO_EM_ANALISE = "EM ANÁLISE"
SITUACAO_JULGADO = "JULGADO"
TAMANHO_MAX_BASE = 150

COLUNAS_RECURSOS = {
    "recurso": "RECURSO",
    "recebido": "RECEBIDO",
    "nota_recorrida": "NOTA RECORRIDA",
    "equipe": "EQUIPE",
    "recorrente": "RECORRENTE",
    "nota_julgamento": "NOTA JULGAMENTO",
    "admissibilidade": "ADMISSIBILIDADE",
    "sugestao": "SUGESTÃO",
    "decisao": "DECISÃO",
    "situacao": "SITUAÇÃO",
    "arquivo": "ARQUIVO",
    "anexos": "ANEXOS",
    "arquivo_original": "ARQUIVO ORIGINAL",
    "hash": "HASH",
}


@dataclass
class RegistroRecurso:
    recurso: str
    recebido: str
    nota_recorrida: str
    equipe: str
    recorrente: str
    nota_julgamento: str = "-"
    admissibilidade: str = "-"
    sugestao: str = "-"
    decisao: str = "-"
    situacao: str = SITUACAO_EM_ANALISE
    arquivo: str = "-"
    anexos: str = "-"
    arquivo_original: str = "-"
    hash: str = "-"

    @property
    def lista_anexos(self) -> list[str]:
        return [a.strip() for a in self.anexos.split(";") if a.strip() and a.strip() != "-"]


def pasta_recursos(config_path: Path, notas_dir: Path) -> Path:
    parser = configparser.ConfigParser(interpolation=None)
    parser.read(config_path, encoding="utf-8-sig")
    valor = parser.get("recursos", "pasta", fallback="").strip()
    return Path(valor) if valor else Path(notas_dir).parent / "recursos"


def ler_controle_recursos(pasta: Path) -> list[RegistroRecurso]:
    caminho = pasta / CONTROLE_RECURSOS
    if not caminho.exists():
        return []
    campos = list(COLUNAS_RECURSOS)
    registros: list[RegistroRecurso] = []
    for linha in caminho.read_text(encoding="utf-8-sig").splitlines():
        partes = [p.strip() for p in linha.split("|")]
        if len(partes) != len(campos) or partes[0] == COLUNAS_RECURSOS["recurso"]:
            continue
        registros.append(RegistroRecurso(**dict(zip(campos, partes))))
    return registros


def gravar_controle_recursos(pasta: Path, registros: list[RegistroRecurso],
                             logger: logging.Logger = LOGGER) -> Path:
    pasta.mkdir(parents=True, exist_ok=True)
    registros = sorted(registros, key=lambda r: r.recurso)
    tabela = [list(COLUNAS_RECURSOS.values())] + [
        [(str(v).replace("|", "/").strip() or "-") for v in asdict(r).values()] for r in registros
    ]
    larguras = [max(len(l[i]) for l in tabela) for i in range(len(COLUNAS_RECURSOS))]

    def formatar(celulas: list[str]) -> str:
        return " | ".join(c.ljust(larguras[i]) for i, c in enumerate(celulas)).rstrip()

    em_analise = sum(r.situacao == SITUACAO_EM_ANALISE for r in registros)
    saida = [
        "CONTROLE DE RECURSOS (ART. 34)",
        f"Atualizado em {datetime.now():%d/%m/%Y %H:%M} · {len(registros)} recurso(s)"
        + (f" · {em_analise} em análise" if em_analise else ""),
        "Gerado por --julgar-recurso. Os arquivos ficam nesta pasta com o nome padronizado (protocolo REC).",
        f"SITUAÇÃO: {SITUACAO_EM_ANALISE} (prévia gerada) -> {SITUACAO_JULGADO} (nota de julgamento efetivada com "
        "--gerar-pdf-nota). Pode ser editada pela comissão e é mantida nas próximas atualizações.",
        "",
        formatar(tabela[0]),
        "-+-".join("-" * n for n in larguras),
        *(formatar(l) for l in tabela[1:]),
        "",
    ]
    caminho = pasta / CONTROLE_RECURSOS
    caminho.write_text("\n".join(saida), encoding="utf-8")
    logger.info("[RECURSO] Controle de recursos atualizado: %s", caminho)
    return caminho


def _hash_arquivo(caminho: Path) -> str:
    return hashlib.sha256(caminho.read_bytes()).hexdigest()[:16]


def _nome_seguro(texto: str) -> str:
    texto = re.sub(r'[\\/:*?"<>|\r\n\t]+', "-", texto)
    texto = re.sub(r"\s+", " ", texto).strip(" .-")
    return texto[:TAMANHO_MAX_BASE].rstrip(" .-")


def _proximo_protocolo(registros: list[RegistroRecurso], ano: int) -> str:
    numeros = [int(m.group(1)) for r in registros if (m := re.fullmatch(rf"REC-{ano}-(\d+)", r.recurso))]
    return f"REC-{ano}-{max(numeros, default=0) + 1:03d}"


def localizar_arquivo_recurso(caminho: Path, pasta: Path) -> Path:
    """O arquivo original e movido na 1a leitura; numa reanalise pelo caminho antigo, acha o padronizado."""
    caminho = Path(caminho)
    if caminho.exists():
        return caminho
    for registro in ler_controle_recursos(pasta):
        if registro.arquivo_original == caminho.name and (pasta / registro.arquivo).exists():
            return pasta / registro.arquivo
    raise FileNotFoundError(f"Arquivo do recurso nao encontrado: {caminho}")


def _mover(origem: Path, destino: Path, logger: logging.Logger) -> Path:
    if origem.resolve() == destino.resolve():
        return destino
    if destino.exists():
        if _hash_arquivo(destino) != _hash_arquivo(origem):
            raise FileExistsError(f"Ja existe outro arquivo com o nome padronizado: {destino}")
        origem.unlink()
        logger.info("[RECURSO] %s ja arquivado como %s; copia duplicada removida", origem.name, destino.name)
        return destino
    destino.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(origem), str(destino))
    logger.info("[RECURSO] Arquivo movido e renomeado: %s -> %s", origem, destino)
    return destino


def arquivar_recurso(origem: Path, anexos: list[Path], pasta: Path, registro: RegistroRecurso | None,
                     protocolo: str, nota_numero: str, equipe: str, recorrente: str,
                     logger: logging.Logger) -> tuple[Path, list[Path], Path]:
    """Move o recurso e os anexos para a pasta de recursos com o nome padronizado.

    Retorna (arquivo do recurso, anexos arquivados, caminho do texto extraido).
    """
    base = _nome_seguro(f"{protocolo} - NOTA {nota_numero.replace('/', '-')} - {equipe or 'EQUIPE'} - "
                        f"{recorrente or 'RECORRENTE NAO IDENTIFICADO'}").upper()
    base_antiga = Path(registro.arquivo).stem if registro and registro.arquivo not in ("", "-") else None

    arquivo = _mover(origem, pasta / f"{base}{origem.suffix.lower()}", logger)

    # Reanalise com nome diferente (ex.: recorrente corrigido): renomeia os anexos ja arquivados.
    arquivados: list[Path] = []
    hashes: set[str] = set()
    for nome in (registro.lista_anexos if registro else []):
        atual = pasta / nome
        if not atual.exists():
            logger.warning("[RECURSO] Anexo registrado nao encontrado na pasta: %s", atual)
            continue
        novo = pasta / (nome.replace(base_antiga, base, 1) if base_antiga else nome)
        arquivados.append(_mover(atual, novo, logger))
        hashes.add(_hash_arquivo(novo))
    if base_antiga and base_antiga != base:
        antigo_txt = pasta / f"{base_antiga} (texto extraído).txt"
        if antigo_txt.exists():
            antigo_txt.unlink()

    for anexo in anexos:
        if not anexo.exists():
            if not any(a.name == anexo.name for a in arquivados):
                logger.warning("[RECURSO] Anexo nao encontrado: %s", anexo)
            continue
        if anexo.resolve().parent == pasta.resolve() and anexo.name.startswith(base):
            if anexo not in arquivados:
                arquivados.append(anexo)
            continue
        if _hash_arquivo(anexo) in hashes:
            logger.info("[RECURSO] Anexo %s ja arquivado; ignorado", anexo.name)
            continue
        destino = pasta / f"{base} - ANEXO {len(arquivados) + 1:02d}{anexo.suffix.lower()}"
        arquivados.append(_mover(anexo, destino, logger))
        hashes.add(_hash_arquivo(destino))

    return arquivo, arquivados, pasta / f"{base} (texto extraído).txt"


def _resumo_admissibilidade(verificacoes: list[Verificacao]) -> str:
    pendentes = [f"{v.titulo.split(' (')[0]} {v.situacao}" for v in verificacoes if v.situacao != OK]
    return "OK" if not pendentes else "; ".join(pendentes)


def marcar_recurso_julgado(nota_txt: Path, config_path: Path = DEFAULT_CONFIG_PATH,
                           logger: logging.Logger = LOGGER) -> RegistroRecurso | None:
    """Chamado ao efetivar a nota de julgamento (--gerar-pdf-nota): atualiza decisao e situacao."""
    import nota_pdf

    achado = re.search(r"Nº (\d+)-(\d{4})", nota_txt.name)
    if not achado:
        return None
    numero = f"{int(achado.group(1)):03d}/{achado.group(2)}"
    config = nota_pdf.ConfigPdf.carregar(config_path)
    pasta = pasta_recursos(config_path, config.notas_dir)
    registros = ler_controle_recursos(pasta)
    registro = next((r for r in registros if r.nota_julgamento == numero), None)
    if registro is None:
        logger.info("[RECURSO] Nota %s sem registro no controle de recursos", numero)
        return None
    texto = nota_txt.read_text(encoding="utf-8-sig")
    merito = re.search(r"No mérito\s*[:,]\s*(.+)", texto)
    if merito:
        decisao = re.sub(r"\s*\(sugestão automática:.*$", "", merito.group(1))
        registro.decisao = re.sub(r"\*\*|[;.]\s*$", "", decisao).strip()[:120] or "-"
    if nota_pdf.tem_pendencias(texto):
        logger.info("[RECURSO] Nota %s ainda tem pendencias; recurso %s segue %s", numero, registro.recurso,
                    registro.situacao)
    else:
        registro.situacao = SITUACAO_JULGADO
    gravar_controle_recursos(pasta, registros, logger)
    return registro


# ---------------------------------------------------------------------------
# Numeracao e arquivo
# ---------------------------------------------------------------------------

def _numero_existente(notas_dir: Path, nome_recurso: str) -> tuple[int, Path] | None:
    """Reanalise do mesmo recurso reutiliza o numero da previa anterior."""
    for txt in notas_dir.glob("NOTA OFICIAL*.txt"):
        cabecalho = txt.read_text(encoding="utf-8-sig", errors="ignore")[:1500]
        if f"RECURSO-ARQUIVO: {nome_recurso} " in cabecalho or f"RECURSO-ARQUIVO: {nome_recurso}\n" in cabecalho:
            achado = re.search(r"Nº (\d+)-", txt.name)
            if achado:
                return int(achado.group(1)), txt
    return None


def _maior_numero(notas_dir: Path, ano: int) -> int:
    numeros = [int(m.group(1)) for p in notas_dir.glob(f"NOTA OFICIAL*-{ano}*.txt")
               if (m := re.search(r"Nº (\d+)-", p.name))]
    return max(numeros, default=0)


def julgar_recurso(arquivo: str | Path, nota_alvo: str, recebido: str, publicada: str | None = None,
                   recorrente: str | None = None, anexos: list[str] | None = None,
                   config_path: Path = DEFAULT_CONFIG_PATH, logger: logging.Logger | None = None,
                   publicar_previa: bool = True) -> Path:
    from sumula_disciplinar import (
        ConfigSumulas, Regulamento, _gerar_pdf, _publicar_previa, _remover_nota_antiga, atualizar_valor_ini,
    )

    config = ConfigSumulas.carregar(Path(config_path))
    logger = logger or configure_logging(config.log_path)
    recebido_dt, recebido_hora = _parse_data_hora(recebido)
    if recebido_dt is None:
        raise ValueError("Informe a data/hora de recebimento do recurso (--recebido \"DD/MM/AAAA HH:MM\")")
    if not recebido_hora:
        logger.warning("[RECURSO] Recebimento sem horario; considerado 23:59 do dia informado")
        recebido_dt = recebido_dt.replace(hour=23, minute=59)

    pasta = pasta_recursos(config.path, config.notas_dir)
    origem = localizar_arquivo_recurso(Path(arquivo), pasta)
    documento = extrair_texto_recurso(origem, logger, salvar_texto=False)
    regulamento = Regulamento(config.regulamento)
    nota = carregar_nota_recorrida(nota_alvo, Path(config_path))
    logger.info("[RECURSO] Nota recorrida: %s (%s punicao(oes))", nota.arquivo.name, len(nota.punicoes))
    if nota.sumula is None:
        logger.warning("[RECURSO] Sumula da nota recorrida nao encontrada; prazo de provas e punicoes ficam a definir")

    publicada_dt, publicada_hora = _parse_data_hora(publicada) if publicada else (None, False)
    if publicada_dt is None and nota.data:
        publicada_dt = datetime.combine(nota.data, datetime.min.time())

    recorrentes = identificar_recorrentes(documento.texto, nota.punicoes, recorrente)
    penas = [analisar_pena(p, regulamento, nota, Path(config_path)) for p in recorrentes]
    pedidos = detectar(documento.texto, PEDIDOS)
    argumentos = detectar(documento.texto, ARGUMENTOS)

    # Arquiva o recurso (e anexos) na pasta de recursos com nome padronizado.
    registros = ler_controle_recursos(pasta)
    hash_recurso = _hash_arquivo(origem)
    registro = next((r for r in registros if r.hash == hash_recurso), None)
    protocolo = registro.recurso if registro else _proximo_protocolo(registros, recebido_dt.year)
    equipe = recorrentes[0].equipe if recorrentes else (registro.equipe if registro else "")
    nome_recorrente = ", ".join(dict.fromkeys(p.punido for p in recorrentes)) or (recorrente or "")
    nome_original = registro.arquivo_original if registro else origem.name
    arquivo_antigo = registro.arquivo if registro else None
    arquivo_final, caminhos_anexos, texto_extraido = arquivar_recurso(
        origem, [Path(a) for a in (anexos or [])], pasta, registro, protocolo, nota.numero, equipe,
        nome_recorrente, logger)
    documento.arquivo = arquivo_final
    salvar_texto_extraido(documento, texto_extraido, logger)
    # Registro preliminar: se algo falhar adiante, a reanalise ainda acha o arquivo ja movido.
    if registro is None:
        preliminar = RegistroRecurso(protocolo, _fmt(recebido_dt), nota.numero, equipe or "-",
                                     nome_recorrente or "-", arquivo=arquivo_final.name,
                                     anexos="; ".join(a.name for a in caminhos_anexos) or "-",
                                     arquivo_original=nome_original, hash=hash_recurso)
        gravar_controle_recursos(pasta, registros + [preliminar], logger)

    legitimidade, _ = verificar_legitimidade(documento.texto, [p.punido for p in recorrentes])
    verificacoes = [
        verificar_prazo(recebido_dt, publicada_dt, publicada_hora, nota.numero),
        legitimidade,
        verificar_assinatura(documento),
        verificar_provas(recebido_dt, caminhos_anexos, nota.sumula, "contesta_fatos" in argumentos),
    ]
    coletivo = verificar_coletivo(recorrentes)
    if coletivo:
        verificacoes.append(coletivo)

    hoje = date.today()
    numero_cfg, ano = config.ultimo_numero, config.ano
    if ano != hoje.year:
        numero_cfg, ano = 0, hoje.year
        atualizar_valor_ini(config.path, "notas", "ano", str(ano))
    config.notas_dir.mkdir(parents=True, exist_ok=True)
    existente = _numero_existente(config.notas_dir, documento.arquivo.name)
    for nome_anterior in (arquivo_antigo, nome_original):
        if not existente and nome_anterior and nome_anterior not in ("-", documento.arquivo.name):
            existente = _numero_existente(config.notas_dir, nome_anterior)
    if existente:
        numero = existente[0]
    else:
        numero = max(numero_cfg, _maior_numero(config.notas_dir, ano)) + 1

    sumula = nota.sumula
    confronto = re.sub(r'[\\/:*?"<>|]+', "-", f"{sumula.time1}x{sumula.time2}") if sumula else "RECURSO"
    destino = config.notas_dir / (f"NOTA OFICIAL Nº {numero:03d}-{ano} – COMISSÃO DISCIPLINAR - {confronto} "
                                  f"({MARCADOR_RECURSO}).txt")
    if existente and existente[1] != destino:
        _remover_nota_antiga(existente[1], destino.name, config.path, logger)

    texto = montar_nota(numero, ano, config.competicao, config.cidade, config.associacao, hoje, documento, nota,
                        penas, verificacoes, pedidos, argumentos, caminhos_anexos, recebido_dt, texto_extraido)
    destino.write_text(texto, encoding="utf-8")
    if not existente and numero > config.ultimo_numero:
        atualizar_valor_ini(config.path, "notas", "ultimo_numero", str(numero))

    novo = RegistroRecurso(
        recurso=protocolo,
        recebido=_fmt(recebido_dt),
        nota_recorrida=nota.numero,
        equipe=equipe or "-",
        recorrente=nome_recorrente or "-",
        nota_julgamento=f"{numero:03d}/{ano}",
        admissibilidade=_resumo_admissibilidade(verificacoes),
        sugestao=_sugestao_merito(pedidos, argumentos, penas, caminhos_anexos),
        decisao=registro.decisao if registro else "-",
        situacao=registro.situacao if registro and registro.situacao not in ("", "-") else SITUACAO_EM_ANALISE,
        arquivo=documento.arquivo.name,
        anexos="; ".join(a.name for a in caminhos_anexos) or "-",
        arquivo_original=nome_original,
        hash=hash_recurso,
    )
    registros = [r for r in registros if r.recurso != protocolo] + [novo]
    gravar_controle_recursos(pasta, registros, logger)
    logger.info("[RECURSO] Protocolo %s registrado (arquivo: %s)", protocolo, documento.arquivo)

    for v in verificacoes:
        logger.info("[RECURSO] %s: %s", v.titulo, v.situacao)
    logger.info("[RECURSO] Pedidos: %s | Argumentos: %s", ", ".join(pedidos) or "-", ", ".join(argumentos) or "-")
    logger.info("[RECURSO] PREVIA do julgamento gerada em %s (aguardando revisao; nao efetivada)", destino)
    _gerar_pdf(destino, config.path, logger)
    if publicar_previa:
        _publicar_previa(destino, config.path, logger)
    return destino




