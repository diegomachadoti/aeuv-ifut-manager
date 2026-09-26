"""Analise disciplinar das sumulas digitais com base exclusiva no regulamento.

Fluxo:
1. Baixa os TXT gerados pelo formulario sumula-digital (Google Drive).
2. Le o relato do arbitro e os envolvidos.
3. Identifica, por regras fixas, condutas previstas no regulamento. Cada
   enquadramento cita o texto literal do dispositivo lido do arquivo do
   regulamento; se o dispositivo nao existir no arquivo, a regra e ignorada.
4. Gera o rascunho da Nota Oficial sequencial. A quantidade exata da pena
   fica marcada como [A DEFINIR] para decisao da Comissao.
"""

from __future__ import annotations

import argparse
import configparser
import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

from main import (
    DEFAULT_CONFIG_PATH,
    DriveTxtDownloader,
    configure_logging,
    iter_txt_files,
    move_file,
    normalize_text,
)

MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]
MARCADOR_DEFINIR = "[A DEFINIR PELA COMISSÃO]"
PADRAO_TORCEDOR = r"\b(torcedor\w*|torcida|parente\w*|familiar\w*|pai|mae|irmao|irma|esposa|namorada)\b"
PADRAO_NEGACAO = re.compile(r"\b(nao|sem|nenhum|nenhuma|nem)\b(\s+\w+){0,3}\s*$")


# ---------------------------------------------------------------------------
# Regulamento
# ---------------------------------------------------------------------------

@dataclass
class Artigo:
    numero: str
    titulo: str
    caput: str
    paragrafos: dict[str, str] = field(default_factory=dict)


class Regulamento:
    ARTIGO = re.compile(r"^\W*ART\.?\s*(\d+(?:\.\d+)?)\s*:\s*(.*)$", re.IGNORECASE | re.MULTILINE)
    PARAGRAFO = re.compile(r"^\W*§\s*(\d+|único)\s*º?", re.IGNORECASE | re.MULTILINE)
    INCISO = re.compile(r"^\s*([IVX]+)\s*[–-]", re.MULTILINE)

    def __init__(self, path: Path) -> None:
        self.path = path
        texto = path.read_text(encoding="utf-8-sig").replace("\r", "")
        self.artigos: dict[str, Artigo] = {}
        marcas = list(self.ARTIGO.finditer(texto))
        for i, marca in enumerate(marcas):
            fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(texto)
            corpo = texto[marca.end():fim]
            corpo = corpo.split("\n---", 1)[0]
            artigo = Artigo(numero=marca.group(1), titulo=marca.group(2).strip(), caput="")
            paragrafos = list(self.PARAGRAFO.finditer(corpo))
            artigo.caput = self._limpar(corpo[: paragrafos[0].start()] if paragrafos else corpo)
            for j, paragrafo in enumerate(paragrafos):
                fim_p = paragrafos[j + 1].start() if j + 1 < len(paragrafos) else len(corpo)
                chave = paragrafo.group(1).lower()
                artigo.paragrafos.setdefault(chave, corpo[paragrafo.start():fim_p])
            self.artigos.setdefault(artigo.numero, artigo)

    @staticmethod
    def _limpar(texto: str) -> str:
        linhas = [re.sub(r"^[^\wÀ-ÿ§]+", "", linha).strip() for linha in texto.splitlines()]
        return "\n".join(linha for linha in linhas if linha)

    def trecho(self, artigo: str, paragrafo: str | None = None, inciso: str | None = None,
               incluir_caput: bool = False) -> str | None:
        item = self.artigos.get(artigo)
        if not item:
            return None
        partes: list[str] = []
        if incluir_caput and item.caput:
            partes.append(item.caput)
        if paragrafo is None:
            if not partes:
                partes.append(item.caput)
            return "\n".join(p for p in partes if p) or None
        bruto = item.paragrafos.get(paragrafo)
        if bruto is None:
            return None
        if inciso:
            incisos = list(self.INCISO.finditer(bruto))
            for k, marca in enumerate(incisos):
                if marca.group(1) == inciso:
                    fim = incisos[k + 1].start() if k + 1 < len(incisos) else len(bruto)
                    cabecalho = self._limpar(bruto[: incisos[0].start()])
                    partes.extend([cabecalho, self._limpar(bruto[marca.start():fim])])
                    break
            else:
                return None
        else:
            partes.append(self._limpar(bruto))
        return "\n".join(p for p in partes if p)


def extrair_pena(trecho: str) -> str | None:
    """Retorna, literalmente, a pena prevista no trecho do regulamento."""
    padroes = [
        r"(?:(?:suspensão|punição)\s+de\s+)?\d+\s*\([^)]*\)\s*a\s*\d+\s*\([^)]*\)\s*partidas",
        r"suspensos?\s+por\s+até\s+\d+\s*\([^)]*\)\s*anos[^.;]*",
        r"acrescida\s+de\s+mais\s+\d+\s*\([^)]*\)\s*jogos\s+de\s+suspensão",
    ]
    for padrao in padroes:
        encontrado = re.search(padrao, trecho, re.IGNORECASE)
        if encontrado:
            return re.sub(r"\s+", " ", encontrado.group(0)).strip()
    return None


# ---------------------------------------------------------------------------
# Regras de enquadramento (somente dispositivos existentes no regulamento)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Regra:
    id: str
    titulo: str
    artigo: str
    paragrafo: str | None
    padroes: tuple[str, ...]
    inciso: str | None = None
    incluir_caput: bool = False
    requer: tuple[str, ...] = ()
    suprime: tuple[str, ...] = ()
    sujeito: str = "pessoa"  # pessoa | equipe
    sem_dispositivo: bool = False


PADROES_AGRESSAO = (
    r"\bagrediu\b", r"\bagredid[oa]s?\b", r"\bagressao\b(?!\s+verbal)", r"\bsoc(o|os|ou|ando)\b",
    r"\bpontape", r"\bcabecada", r"\bcotovelada", r"\bjoelhada", r"\btapa\b", r"\bcusp(iu|ida|idas|iram|e)\b",
    r"\bchut\w*\s+(o|a)\s+(atleta|jogador|arbitro|adversario|auxiliar|tecnico)", r"\bempurr\w*\s+violent",
    r"\barremess\w*\s+(um|uma)?\s*(objeto|garrafa|pedra|copo|lata)",
)

REGRAS: tuple[Regra, ...] = (
    Regra("art8", "Briga generalizada", "8", "1",
          (r"briga generalizada", r"confusao generalizada", r"tumulto generalizado", r"briga entre as equipes"),
          suprime=("art11",)),
    Regra("art9", "Tentativa de agressão", "9", "1",
          (r"tentativa de agress", r"\btent\w*\s+(de\s+)?agred", r"\btent\w*\s+(dar|desferir|acertar)\s",
           r"partiu para cima", r"\bavanc\w*\s+(em direcao|contra|para cima)"),
          suprime=("art10_agressor", "art10_torcedor")),
    Regra("art10_torcedor", "Agressão por vias de fato praticada por torcedor vinculado à equipe", "10", "3",
          PADROES_AGRESSAO, requer=(PADRAO_TORCEDOR,), suprime=("art10_agressor",)),
    Regra("art10_revide", "Revide de agressão por vias de fato", "10", "2", (r"\brevid",), inciso="II"),
    Regra("art10_agressor", "Agressão por vias de fato", "10", "2", PADROES_AGRESSAO, inciso="I"),
    Regra("art11_torcedor", "Conduta de torcedor contra a arbitragem ou incentivando violência", "11", "2",
          (r"tumult", r"\binvad", r"violencia", r"interromp", r"ofend", r"ofens", r"xing"), inciso="I",
          requer=(PADRAO_TORCEDOR,), suprime=("art11",)),
    Regra("art11", "Ofensas ou tumultos incentivando a violência", "11", "1",
          (r"\bofend", r"\bofens", r"\bxing", r"\binsult", r"\bpalavr(ao|oes)\b", r"baixo calao", r"\bladra(o|oes)\b",
           r"\broubando\b", r"\bcomprado\b", r"\bdesrespeit", r"\bincit", r"incentiv\w*\s+(a\s+)?violencia",
           r"\btumult", r"gestos?\s+obscen")),
    Regra("art12", "Uso de entorpecente na área interna comum dos jogos", "12", "1",
          (r"entorpecente", r"maconha", r"\bdrogas?\b", r"cocaina", r"\bbaseado\b")),
    Regra("art13", "Injúria racial e atos discriminatórios", "13", "1",
          (r"\bracis", r"injuria racial", r"discrimin", r"preconceit", r"\bmacaco\b", r"xenofob",
           r"intoleranc\w*\s+religios"), incluir_caput=True),
    Regra("art14", "Participação de atleta ou membro da comissão cumprindo punição", "14", "2",
          (r"\bsuspens[oa]s?\b", r"cumprindo (suspensao|punicao)")),
    Regra("art15_abandono", "Abandono de partida", "15", "7",
          (r"\babandon\w*\s+(a\s+|o\s+)?(partida|jogo|campo)", r"\bretir\w*\s+(a equipe|o time)\s+d[eo]\s+campo"),
          sujeito="equipe"),
    Regra("art15_wo", "W.O.", "15", "5", (r"\bw o\b", r"nao compareceu", r"numero minimo"), sujeito="equipe"),
    Regra("art18", "Jogo interrompido", "18", "1",
          (r"\b(partida|jogo)\s+(foi\s+)?(interrompid|paralisad|encerrad\w*\s+antes)", r"\binvas\w*\s+d[eo]\s+campo"),
          sujeito="equipe"),
    Regra("art7_2", "Apresentação de bolas em condições de jogo", "7.2", "1",
          (r"(segunda|2a|duas)\s+bolas?",), requer=(r"\b(nao|sem)\b",), sujeito="equipe"),
    Regra("art7_5", "Pagamento de arbitragem e campo", "7.5", "3",
          (r"nao (efetuou|realizou|fez|pagou)\s+(o\s+)?pagamento", r"sem pagamento", r"\bnao pag"),
          sujeito="equipe"),
    Regra("ameaca", "Ameaça", "19", "2", (r"\bameac",), sem_dispositivo=True),
)


# ---------------------------------------------------------------------------
# Sumula
# ---------------------------------------------------------------------------

@dataclass
class Envolvido:
    equipe: str
    tipo: str
    nome: str
    camisa: str

    @property
    def comissao(self) -> bool:
        return normalize_text(self.tipo).startswith("comiss")

    def descricao(self) -> str:
        return ("o membro da comissão técnica " if self.comissao else "o atleta ") + self.nome

    def rotulo(self) -> str:
        if self.comissao:
            return f"{self.nome} – Comissão técnica"
        return f"{self.nome} – Atleta" + (f" (camisa {self.camisa})" if self.camisa else "")


@dataclass
class Sumula:
    arquivo: Path
    protocolo: str
    arbitro: str
    time1: str
    time2: str
    data_jogo: str
    hora_jogo: str
    fatos: str
    envolvidos: list[Envolvido]
    pdf_url: str = ""


def bloco_relatorio_pdf(sumula: Sumula) -> list[str]:
    """Paragrafo com o link do PDF oficial da sumula (vazio para sumulas antigas sem link)."""
    if not sumula.pdf_url:
        return []
    return [
        "",
        "RELATÓRIO OFICIAL DA ARBITRAGEM",
        f"A íntegra da súmula {sumula.protocolo}, enviada pelo árbitro {sumula.arbitro}, pode ser consultada em:",
        sumula.pdf_url,
    ]


def inserir_antes_assinatura(nota: str, bloco: list[str], cidade: str) -> str:
    """Insere o bloco antes da linha 'Cidade, data.' da nota; sem essa linha, adiciona ao final."""
    if not bloco:
        return nota
    linhas = nota.rstrip("\n").split("\n")
    for i in range(len(linhas) - 1, -1, -1):
        if linhas[i].strip().startswith(f"{cidade},"):
            while i > 0 and not linhas[i - 1].strip():
                i -= 1
            return "\n".join(linhas[:i] + bloco + linhas[i:]) + "\n"
    return "\n".join(linhas + bloco) + "\n"


def ler_sumula(path: Path) -> Sumula:
    texto = path.read_text(encoding="utf-8-sig", errors="ignore").replace("\r", "")

    def campo(nome: str) -> str:
        achado = re.search(rf"^{nome}:\s*(.*)$", texto, re.MULTILINE)
        return achado.group(1).strip() if achado else ""

    partida = re.search(r"^PARTIDA\s*\n(.*?)\s+x\s+(.*?)\s*$", texto, re.MULTILINE)
    if not partida:
        raise ValueError(f"Confronto nao encontrado na sumula {path.name}")
    fatos = re.search(r"DOS FATOS\s*\n-+\s*\n(.*?)\n\s*ENVOLVIDOS\s*\n-+", texto, re.DOTALL)
    if not fatos:
        raise ValueError(f"Secao DOS FATOS nao encontrada na sumula {path.name}")

    envolvidos = [
        Envolvido(m.group(1).strip(), m.group(2).strip(), m.group(3).strip(), m.group(4).strip())
        for m in re.finditer(
            r"REGISTRO\s+\d+\s*\nEQUIPE:\s*(.*?)\s*\nTIPO:\s*(.*?)\s*\nNOME:\s*(.*?)\s*\nCAMISA:[ \t]*(.*)",
            texto,
        )
    ]
    pdf = re.search(r"S[UÚ]MULA OFICIAL \(PDF\)\s*\n-+\s*\n\s*(https?://\S+)", texto)
    return Sumula(
        arquivo=path,
        protocolo=campo("PROTOCOLO"),
        arbitro=campo("ÁRBITRO") or campo("ARBITRO"),
        time1=partida.group(1).strip(),
        time2=partida.group(2).strip(),
        data_jogo=campo("DATA"),
        hora_jogo=campo("HORA"),
        fatos=fatos.group(1).strip(),
        envolvidos=envolvidos,
        pdf_url=pdf.group(1) if pdf else "",
    )


# ---------------------------------------------------------------------------
# Analise
# ---------------------------------------------------------------------------

@dataclass
class Ocorrencia:
    regra: Regra
    trecho_regulamento: str
    pena: str | None
    sujeito: Envolvido | str | None
    frases: list[str] = field(default_factory=list)
    confirmar_autoria: bool = False


def paragrafos_relato(fatos: str) -> list[str]:
    """Junta quebras de linha simples (texto colado/quebrado) e separa por linha em branco."""
    blocos = re.split(r"\n\s*\n", fatos.replace("\r", ""))
    return [re.sub(r"\s+", " ", bloco).strip() for bloco in blocos if bloco.strip()]


def dividir_paragrafos(fatos: str) -> list[list[str]]:
    paragrafos = []
    for paragrafo in paragrafos_relato(fatos):
        frases = [f.strip() for f in re.split(r"(?<=[.!?;])\s+", paragrafo) if f.strip()]
        paragrafos.append(frases)
    return paragrafos


def _casa(padrao: str, texto: str) -> bool:
    for achado in re.finditer(padrao, texto):
        if not PADRAO_NEGACAO.search(texto[max(0, achado.start() - 40):achado.start()]):
            return True
    return False


def _envolvidos_citados(texto: str, envolvidos: list[Envolvido]) -> list[Envolvido]:
    citados = []
    primeiros = [normalize_text(e.nome).split()[:1] for e in envolvidos]
    for envolvido in envolvidos:
        tokens = normalize_text(envolvido.nome).split()
        if not tokens:
            continue
        nome_completo = " ".join(tokens)
        primeiro, ultimo = tokens[0], tokens[-1]
        unico = primeiros.count([primeiro]) == 1
        por_nome = (
            re.search(rf"\b{re.escape(nome_completo)}\b", texto)
            or (len(tokens) > 1 and re.search(rf"\b{primeiro}\b", texto) and re.search(rf"\b{ultimo}\b", texto))
            or (unico and len(primeiro) >= 3 and re.search(rf"\b{primeiro}\b", texto))
        )
        por_camisa = (
            not envolvido.comissao
            and envolvido.camisa.isdigit()
            and re.search(rf"\b(camisa|numero|n)\s+(de\s+numero\s+|n\s+|numero\s+)?0*{int(envolvido.camisa)}\b", texto)
        )
        if por_nome or por_camisa:
            citados.append(envolvido)
    return citados


def _equipes_citadas(texto: str, sumula: Sumula) -> list[str]:
    return [t for t in (sumula.time1, sumula.time2) if normalize_text(t) and normalize_text(t) in texto]


def analisar(sumula: Sumula, regulamento: Regulamento, logger: logging.Logger | None = None) -> list[Ocorrencia]:
    regras_validas: list[tuple[Regra, str]] = []
    for regra in REGRAS:
        trecho = regulamento.trecho(regra.artigo, regra.paragrafo, regra.inciso, regra.incluir_caput)
        if trecho:
            regras_validas.append((regra, trecho))
        elif logger:
            logger.warning("Dispositivo ART. %s §%s nao encontrado no regulamento; regra %s ignorada",
                           regra.artigo, regra.paragrafo, regra.id)

    ocorrencias: dict[tuple[str, str], Ocorrencia] = {}
    for paragrafo in dividir_paragrafos(sumula.fatos):
        texto_paragrafo = normalize_text(" ".join(paragrafo))
        for frase in paragrafo:
            texto = normalize_text(frase)
            acionadas = [
                (regra, trecho) for regra, trecho in regras_validas
                if any(_casa(p, texto) for p in regra.padroes) and all(re.search(r, texto) for r in regra.requer)
            ]
            suprimidas = {s for regra, _ in acionadas for s in regra.suprime}
            for regra, trecho in acionadas:
                if regra.id in suprimidas:
                    continue
                if regra.sujeito == "equipe":
                    sujeitos: list[Envolvido | str | None] = list(
                        _equipes_citadas(texto, sumula) or _equipes_citadas(texto_paragrafo, sumula)
                    ) or [None]
                else:
                    sujeitos = list(
                        _envolvidos_citados(texto, sumula.envolvidos)
                        or _envolvidos_citados(texto_paragrafo, sumula.envolvidos)
                    ) or [None]
                for sujeito in sujeitos:
                    chave = (regra.id, sujeito.nome if isinstance(sujeito, Envolvido) else str(sujeito))
                    ocorrencia = ocorrencias.get(chave)
                    if not ocorrencia:
                        ocorrencia = Ocorrencia(regra, trecho, extrair_pena(trecho), sujeito)
                        ocorrencias[chave] = ocorrencia
                    if frase not in ocorrencia.frases:
                        ocorrencia.frases.append(frase)
                    if len(sujeitos) > 1:
                        ocorrencia.confirmar_autoria = True
    return list(ocorrencias.values())


# ---------------------------------------------------------------------------
# Nota oficial
# ---------------------------------------------------------------------------

def data_por_extenso(valor: date) -> str:
    return f"{valor.day} de {MESES[valor.month - 1]} de {valor.year}"


def formatar_data_jogo(valor: str) -> str:
    for formato in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return data_por_extenso(datetime.strptime(valor, formato).date())
        except ValueError:
            continue
    return valor


def _referencia(regra: Regra) -> str:
    texto = f"ART. {regra.artigo}"
    if regra.paragrafo:
        texto += ", § único" if regra.paragrafo == "único" else f", §{regra.paragrafo}º"
    if regra.inciso:
        texto += f", inciso {regra.inciso}"
    return texto


def _citar(texto: str) -> list[str]:
    return [f"   \"{linha}\"" for linha in texto.splitlines()]


# ---------------------------------------------------------------------------
# Dosimetria (criterio brando e equilibrado, sempre dentro da faixa do regulamento)
# ---------------------------------------------------------------------------

UNIDADES_F = ["", "uma", "duas", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze",
              "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"]
DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"]
PADRAO_APOS_EXPULSAO = (r"\b(apos|depois d[ae])\s+(a\s+|sua\s+)?expuls", r"\bmesmo\s+(apos\s+|depois\s+de\s+)?expuls",
                        r"\bja\s+expuls")


def extenso_feminino(n: int) -> str:
    if n < 20:
        return UNIDADES_F[n] or "zero"
    if n < 100:
        dezena, unidade = divmod(n, 10)
        return DEZENAS[dezena] + (f" e {UNIDADES_F[unidade]}" if unidade else "")
    return str(n)


def partidas_texto(n: int, maiusculo: bool = False) -> str:
    texto = f"{n} ({extenso_feminino(n)}) {'partida' if n == 1 else 'partidas'}"
    return texto.upper() if maiusculo else texto


def destacar(texto: str) -> str:
    """Marca o trecho de decisao sugerida; no PDF ele sai em vermelho e negrito."""
    return f"**{texto}**"


@dataclass
class Dosimetria:
    partidas: int | None
    decisao: str
    faixa: str
    circunstancias: list[str]


def dosimetria(o: Ocorrencia, ocorrencias: list[Ocorrencia], sumula: Sumula) -> Dosimetria:
    """Parte da pena minima e soma 1 partida por circunstancia registrada no relato, sem passar do maximo.

    So usa fatos do relatorio (reiteracao, ameaca associada, continuidade apos a expulsao) e a faixa
    literal do dispositivo. Penas sem faixa em partidas ficam com a penalidade prevista no dispositivo
    ou para a comissao definir.
    """
    pena = o.pena or ""
    numeros = [int(n) for n in re.findall(r"(\d+)\s*\(", pena)]
    if not pena or "anos" in pena or not numeros:
        if o.regra.sujeito == "equipe":
            return Dosimetria(None, f"aplicação das penalidades previstas no {_referencia(o.regra)}", "", [])
        return Dosimetria(None, MARCADOR_DEFINIR, pena, [])
    if len(numeros) == 1:
        return Dosimetria(numeros[0], partidas_texto(numeros[0]), pena, ["pena fixa prevista no dispositivo"])

    minimo, maximo = numeros[0], numeros[1]
    circunstancias: list[str] = []
    if len(o.frases) >= 2:
        circunstancias.append(f"reiteração da conduta ({len(o.frases)} trechos do relatório)")
    primeira_do_sujeito = next(
        (x for x in ocorrencias if x.sujeito == o.sujeito and not x.regra.sem_dispositivo), None
    )
    mesmo_sujeito = isinstance(o.sujeito, Envolvido) and primeira_do_sujeito is o and any(
        x.regra.id == "ameaca" and x.sujeito == o.sujeito for x in ocorrencias
    )
    if mesmo_sujeito and o.regra.id != "ameaca":
        circunstancias.append("ameaça registrada no relatório, considerada na gravidade da conduta")
    if isinstance(o.sujeito, Envolvido) and any(
        _casa(p, normalize_text(f)) for f in o.frases for p in PADRAO_APOS_EXPULSAO
    ):
        circunstancias.append("continuidade da conduta após a expulsão")
    partidas = min(maximo, minimo + len(circunstancias))
    return Dosimetria(partidas, partidas_texto(partidas), pena, circunstancias)


def gerar_nota(sumula: Sumula, ocorrencias: list[Ocorrencia], numero: int, ano: int,
               competicao: str, cidade: str, hoje: date) -> str:
    pessoas = [o for o in ocorrencias if isinstance(o.sujeito, Envolvido) and not o.regra.sem_dispositivo]
    equipes = [o for o in ocorrencias if o.regra.sujeito == "equipe" and o.sujeito]
    sem_sujeito = [o for o in ocorrencias if o.sujeito is None]
    sem_dispositivo = [o for o in ocorrencias if o.regra.sem_dispositivo and o.sujeito is not None]
    enquadraveis = pessoas + equipes

    nomes: list[str] = []
    for o in pessoas:
        descricao = f"{o.sujeito.descricao()}, da equipe {o.sujeito.equipe}"
        if descricao not in nomes:
            nomes.append(descricao)
    for o in equipes:
        descricao = f"a equipe {o.sujeito}"
        if descricao not in nomes:
            nomes.append(descricao)
    alvo = "aos fatos envolvendo " + "; ".join(nomes) if nomes else "aos fatos relatados"
    doses = {id(o): dosimetria(o, ocorrencias, sumula) for o in enquadraveis}

    linhas = [
        "⚠️ NOTA GERADA AUTOMATICAMENTE (regras fixas) – as decisões sugeridas estão entre ** ** "
        f"(vermelho no PDF); revise-as e os campos {MARCADOR_DEFINIR}, se houver, antes de publicar.",
        "",
        f"NOTA OFICIAL Nº {numero:03d}/{ano}",
        competicao.upper(),
        "",
        f"A Comissão Organizadora da {competicao}, no uso de suas atribuições regulamentares, após análise do "
        f"relatório oficial da equipe de arbitragem referente à partida entre "
        f"{sumula.time1.upper()} x {sumula.time2.upper()}, realizada em "
        f"{formatar_data_jogo(sumula.data_jogo)}, vem apresentar a decisão disciplinar referente "
        f"{alvo}.",
        "A decisão considera o relato oficial da arbitragem, bem como a análise realizada pela Comissão "
        "Organizadora acerca da sequência dos fatos.",
        "",
        "DOS FATOS",
        f"Conforme registrado no relatório da arbitragem (súmula {sumula.protocolo}, árbitro {sumula.arbitro}):",
    ]
    linhas += paragrafos_relato(sumula.fatos)

    linhas += ["", "DO ENQUADRAMENTO LEGAL"]
    total = len(enquadraveis)
    linhas.append(
        "Após análise individualizada da conduta, a Comissão Organizadora identificou "
        f"{total} {'infração disciplinar prevista' if total == 1 else 'infrações disciplinares previstas'} "
        "no regulamento da competição."
    )
    for i, o in enumerate(enquadraveis, start=1):
        sujeito = o.sujeito.rotulo() if isinstance(o.sujeito, Envolvido) else o.sujeito
        equipe = f" ({o.sujeito.equipe})" if isinstance(o.sujeito, Envolvido) else ""
        linhas += ["", f"{i}. {o.regra.titulo} – {sujeito}{equipe}", "Trecho do relatório:"]
        linhas += [f"   \"{frase}\"" for frase in o.frases]
        if o.confirmar_autoria:
            linhas.append(f"⚠️ Mais de um envolvido citado no mesmo trecho – confirmar a autoria {MARCADOR_DEFINIR}.")
        linhas += [f"A conduta enquadra-se no {_referencia(o.regra)}:"]
        linhas += _citar(o.trecho_regulamento)
        if o.pena:
            linhas.append(f"O dispositivo prevê {o.pena}.")
        linhas.append(f"➡️ {_referencia(o.regra)} – {destacar(doses[id(o)].decisao)}")

    if sem_dispositivo:
        trecho = sem_dispositivo[0].trecho_regulamento
        linhas += ["", "Condutas sem dispositivo específico no regulamento"]
        for o in sem_dispositivo:
            linhas.append(f"- {o.regra.titulo} – {o.sujeito.rotulo()} ({o.sujeito.equipe}):")
            linhas += [f"   \"{frase}\"" for frase in o.frases]
        linhas.append(
            "O regulamento não possui dispositivo específico para essa conduta. Nos termos do "
            f"{_referencia(sem_dispositivo[0].regra)}:"
        )
        linhas += _citar(trecho)

    if sem_sujeito:
        linhas += ["", f"Ocorrências sem envolvido identificado no relatório {MARCADOR_DEFINIR}"]
        for o in sem_sujeito:
            linhas.append(f"- {o.regra.titulo} ({_referencia(o.regra)}):")
            linhas += [f"   \"{frase}\"" for frase in o.frases]

    linhas += [
        "",
        "DA PUNIÇÃO",
        "Diante dos fatos apurados e dos enquadramentos regulamentares acima apresentados, a Comissão "
        "Organizadora decide aplicar:",
    ]
    agrupado: dict[str, dict[str, list[Ocorrencia]]] = {}
    for o in enquadraveis:
        equipe = o.sujeito.equipe if isinstance(o.sujeito, Envolvido) else o.sujeito
        rotulo = o.sujeito.rotulo() if isinstance(o.sujeito, Envolvido) else f"Equipe {o.sujeito}"
        agrupado.setdefault(equipe, {}).setdefault(rotulo, []).append(o)
    for equipe, sujeitos in agrupado.items():
        linhas += ["", equipe.upper()]
        for rotulo, itens in sujeitos.items():
            linhas.append(rotulo)
            for o in itens:
                linhas.append(
                    f"➡️ {destacar(doses[id(o)].decisao)}, com fundamento no {_referencia(o.regra)}, "
                    f"em razão de {o.regra.titulo[0].lower() + o.regra.titulo[1:]};"
                )
            com_partidas = [doses[id(o)] for o in itens if o.pena and "partidas" in o.pena]
            if com_partidas:
                if all(d.partidas is not None for d in com_partidas):
                    total = partidas_texto(sum(d.partidas for d in com_partidas), maiusculo=True)
                    linhas.append(f"TOTAL: {destacar(total + ' DE SUSPENSÃO ADICIONAL')}")
                else:
                    linhas.append(f"TOTAL: {MARCADOR_DEFINIR} PARTIDAS DE SUSPENSÃO ADICIONAL")
            if isinstance(itens[0].sujeito, Envolvido) and _foi_expulso(itens[0].sujeito, sumula):
                linhas.append("Além da suspensão automática decorrente do cartão vermelho recebido na partida.")

    linhas += ["", "DA PROPORCIONALIDADE DA DECISÃO",
               "A decisão considera a sequência de condutas registrada no relatório, incluindo:"]
    sequencia = []
    for paragrafo in dividir_paragrafos(sumula.fatos):
        for frase in paragrafo:
            for o in ocorrencias:
                if frase in o.frases and o.regra.titulo not in sequencia[-1:]:
                    sequencia.append(o.regra.titulo)
    for j, item in enumerate(sequencia):
        if j:
            linhas.append(" ⬇️")
        linhas.append(f" {item}")
    linhas += [
        "",
        "Na dosimetria, a Comissão adotou critério equilibrado: parte-se da pena mínima prevista em cada "
        "dispositivo, acrescendo-se 1 (uma) partida para cada circunstância registrada no relatório da "
        "arbitragem, sem ultrapassar o máximo previsto no regulamento.",
    ]
    for o in enquadraveis:
        d = doses[id(o)]
        sujeito = o.sujeito.nome if isinstance(o.sujeito, Envolvido) else f"equipe {o.sujeito}"
        if d.partidas is None:
            linhas.append(f"- {_referencia(o.regra)} – {sujeito}: {destacar(d.decisao)}.")
            continue
        motivo = "; ".join(d.circunstancias) if d.circunstancias else (
            "nenhuma circunstância adicional registrada no relatório, aplicando-se a pena mínima"
        )
        linhas.append(
            f"- {_referencia(o.regra)} – {sujeito}: o dispositivo prevê {d.faixa}; {motivo}. "
            f"Pena aplicada: {destacar(d.decisao)}."
        )

    linhas += [
        "",
        "DISPOSIÇÕES FINAIS",
        "A Comissão Organizadora esclarece que a análise do caso considerou o relatório oficial da equipe de "
        "arbitragem como elemento fundamental para a apuração dos fatos, juntamente com a avaliação realizada "
        "pela organização.",
        "A presente decisão refere-se exclusivamente às condutas acima identificadas.",
        "A Comissão Organizadora reafirma seu compromisso com a disciplina, respeito à arbitragem, "
        "transparência, proporcionalidade e aplicação criteriosa do regulamento, garantindo que as decisões "
        "disciplinares sejam individualizadas de acordo com os fatos efetivamente apurados.",
        *bloco_relatorio_pdf(sumula),
        "",
        "",
        f"{cidade}, {data_por_extenso(hoje)}.",
        "",
        "",
        "COMISSÃO ORGANIZADORA",
        f" {competicao}",
    ]
    return "\n".join(linhas) + "\n"


def _foi_expulso(envolvido: Envolvido, sumula: Sumula) -> bool:
    """Expulsao so e atribuida quando citada na mesma frase do envolvido ou em frase sem outro envolvido."""
    padroes = (r"cartao vermelho", r"\bexpuls(o|a|os|as|ou|ei|aram)\b", r"\bc v\b")
    for paragrafo in dividir_paragrafos(sumula.fatos):
        ultimo_citado: list[Envolvido] = []
        for frase in paragrafo:
            texto = normalize_text(frase)
            citados = _envolvidos_citados(texto, sumula.envolvidos) or ultimo_citado
            if citados:
                ultimo_citado = citados
            if citados == [envolvido] and any(_casa(p, texto) for p in padroes):
                return True
    return False


def gerar_analise_sem_enquadramento(sumula: Sumula) -> str:
    return "\n".join([
        f"ANÁLISE DA SÚMULA {sumula.protocolo}",
        f"Partida: {sumula.time1} x {sumula.time2} – {formatar_data_jogo(sumula.data_jogo)}",
        "",
        "Nenhuma conduta prevista nos dispositivos disciplinares do regulamento foi identificada",
        "automaticamente no relato do árbitro. Recomenda-se revisão manual pela Comissão.",
        "",
        "DOS FATOS",
        sumula.fatos,
        *bloco_relatorio_pdf(sumula),
        "",
    ])


# ---------------------------------------------------------------------------
# Configuracao e execucao
# ---------------------------------------------------------------------------

@dataclass
class ConfigSumulas:
    path: Path
    folder_embed_url: str
    service_account_json: Path
    download_dir: Path
    processed_dir: Path
    failed_dir: Path
    notas_dir: Path
    regulamento: Path
    log_path: Path
    ultimo_numero: int
    ano: int
    competicao: str
    cidade: str
    parser: configparser.ConfigParser | None = None

    @classmethod
    def carregar(cls, path: Path) -> "ConfigSumulas":
        parser = configparser.ConfigParser()
        if not parser.read(path, encoding="utf-8"):
            raise FileNotFoundError(f"Arquivo de configuracao nao encontrado: {path}")
        # config.local.ini (no .gitignore) guarda segredos como a chave da IA e sobrepoe o config.ini.
        parser.read(Path(path).with_name("config.local.ini"), encoding="utf-8")
        if not parser.has_section("sumulas"):
            raise KeyError("Secao [sumulas] ausente no config.ini")
        s = parser["sumulas"]
        n = parser["notas"] if parser.has_section("notas") else {}
        return cls(
            path=path,
            folder_embed_url=s.get("folder_embed_url"),
            service_account_json=Path(parser.get("drive", "service_account_json", fallback="google-service-account.json")),
            download_dir=Path(s.get("download_dir", "downloads\\sumulas")),
            processed_dir=Path(s.get("processed_dir", "downloads\\sumulas\\processados")),
            failed_dir=Path(s.get("failed_dir", "downloads\\sumulas\\falhas")),
            notas_dir=Path(s.get("notas_dir", "downloads\\sumulas\\notas-oficiais")),
            regulamento=Path(s.get("regulamento", "regulamento\\regulamento-7-super-liga-união-2026")),
            log_path=Path(parser.get("app", "log_path", fallback="logs\\ifut.log")),
            ultimo_numero=int(n.get("ultimo_numero", "0")),
            ano=int(n.get("ano", str(date.today().year))),
            competicao=n.get("competicao", "7ª Super Liga União 2026"),
            cidade=n.get("cidade", "Uberlândia/MG"),
            parser=parser,
        )


def atualizar_valor_ini(path: Path, secao: str, chave: str, valor: str) -> None:
    """Atualiza uma chave do INI preservando comentarios e demais linhas."""
    linhas = path.read_text(encoding="utf-8").splitlines(keepends=True)
    secao_atual = None
    for i, linha in enumerate(linhas):
        cabecalho = re.match(r"^\s*\[(.+?)\]\s*$", linha)
        if cabecalho:
            secao_atual = cabecalho.group(1).strip()
            continue
        if secao_atual == secao and re.match(rf"^\s*{re.escape(chave)}\s*=", linha):
            linhas[i] = f"{chave} = {valor}\n"
            break
    else:
        raise KeyError(f"Chave [{secao}] {chave} nao encontrada em {path}")
    path.write_text("".join(linhas), encoding="utf-8")


def nome_arquivo_nota(numero: int, ano: int, sumula: Sumula, sufixo: str = "") -> str:
    confronto = f"{sumula.time1}x{sumula.time2}"
    confronto = re.sub(r'[\\/:*?"<>|]+', "-", confronto)
    return f"NOTA OFICIAL Nº {numero:03d}-{ano} – COMISSÃO DISCIPLINAR - {confronto}{sufixo}.txt"


def _gerar_pdf(nota_txt: Path, config_path: Path, logger: logging.Logger) -> None:
    """Gera o PDF da nota; falhas no PDF nao interrompem a analise (pode ser regerado depois)."""
    try:
        import nota_pdf

        nota_pdf.gerar_pdf_nota(nota_txt, nota_pdf.ConfigPdf.carregar(config_path), logger)
    except Exception as exc:
        logger.exception("[PDF] Falha ao gerar o PDF de %s: %s", nota_txt.name, exc)

def processar_sumulas(config_path: Path = DEFAULT_CONFIG_PATH, local_only: bool = False,
                      logger: logging.Logger | None = None, usar_ia: bool = False) -> list[Path]:
    config = ConfigSumulas.carregar(config_path)
    logger = logger or configure_logging(config.log_path)
    regulamento = Regulamento(config.regulamento)
    logger.info("[SUMULAS] Regulamento carregado: %s artigos", len(regulamento.artigos))

    if usar_ia:
        import sumula_ia

        config_ia = sumula_ia.ConfigIA.carregar(config.parser)
        chave_ia = sumula_ia.obter_chave(config_ia)
        logger.info("[SUMULAS] Modo IA ativo (modelo %s)", config_ia.modelo)

    downloader = DriveTxtDownloader(config.folder_embed_url, config.download_dir, config.service_account_json)
    config.download_dir.mkdir(parents=True, exist_ok=True)
    if not local_only:
        baixados = downloader.sync()
        downloader.ensure_status_folders(logger)
        logger.info("[SUMULAS] Arquivos sincronizados do Drive: %s", len(baixados))

    hoje = date.today()
    numero, ano = config.ultimo_numero, config.ano
    if ano != hoje.year:
        numero, ano = 0, hoje.year
        atualizar_valor_ini(config.path, "notas", "ano", str(ano))

    config.notas_dir.mkdir(parents=True, exist_ok=True)
    gerados: list[Path] = []
    for arquivo in iter_txt_files(config.download_dir):
        if not arquivo.name.upper().startswith("SUMULA_"):
            continue
        try:
            sumula = ler_sumula(arquivo)
            if usar_ia:
                resultado = sumula_ia.gerar_nota_ia(
                    sumula, regulamento, config_ia, config.competicao, config.cidade, hoje, chave_ia
                )
                if resultado.ha_infracao and resultado.nota:
                    numero += 1
                    destino = config.notas_dir / nome_arquivo_nota(numero, ano, sumula, " (IA)")
                    destino.write_text(
                        sumula_ia.finalizar_nota_ia(resultado, numero, ano, config_ia.modelo, sumula, config.cidade),
                        encoding="utf-8",
                    )
                    atualizar_valor_ini(config.path, "notas", "ultimo_numero", str(numero))
                    for alerta in resultado.alertas:
                        logger.warning("[SUMULAS][IA] %s: %s", sumula.protocolo, alerta)
                    logger.info("[SUMULAS][IA] %s: nota gerada em %s", sumula.protocolo, destino)
                    _gerar_pdf(destino, config.path, logger)
                else:
                    destino = config.notas_dir / f"ANALISE_{sumula.protocolo}_sem-enquadramento (IA).txt"
                    destino.write_text(
                        sumula_ia.gerar_analise_ia_sem_infracao(sumula, resultado, config_ia.modelo),
                        encoding="utf-8",
                    )
                    logger.info("[SUMULAS][IA] %s: sem infracao; analise salva em %s", sumula.protocolo, destino)
                gerados.append(destino)
                move_file(arquivo, config.processed_dir)
                downloader.move_remote_file(arquivo.name, "processed", logger)
                continue
            ocorrencias = analisar(sumula, regulamento, logger)
            if ocorrencias:
                numero += 1
                destino = config.notas_dir / nome_arquivo_nota(numero, ano, sumula)
                destino.write_text(
                    gerar_nota(sumula, ocorrencias, numero, ano, config.competicao, config.cidade, hoje),
                    encoding="utf-8",
                )
                atualizar_valor_ini(config.path, "notas", "ultimo_numero", str(numero))
                logger.info("[SUMULAS] %s: %s ocorrencia(s); nota gerada em %s",
                            sumula.protocolo, len(ocorrencias), destino)
                _gerar_pdf(destino, config.path, logger)
            else:
                destino = config.notas_dir / f"ANALISE_{sumula.protocolo}_sem-enquadramento.txt"
                destino.write_text(gerar_analise_sem_enquadramento(sumula), encoding="utf-8")
                logger.info("[SUMULAS] %s: nenhuma conduta enquadrada; analise salva em %s",
                            sumula.protocolo, destino)
            gerados.append(destino)
            move_file(arquivo, config.processed_dir)
            downloader.move_remote_file(arquivo.name, "processed", logger)
        except Exception as exc:
            if usar_ia and isinstance(exc, sumula_ia.ErroIA):
                logger.error("[SUMULAS][IA] %s mantida para nova tentativa: %s", arquivo.name, exc)
                continue
            logger.exception("[SUMULAS] Falha ao analisar %s: %s", arquivo.name, exc)
            move_file(arquivo, config.failed_dir)
            downloader.move_remote_file(arquivo.name, "failed", logger)
    return gerados


def main() -> int:
    parser = argparse.ArgumentParser(description="Analise disciplinar das sumulas digitais")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    parser.add_argument("--process-local-only", action="store_true",
                        help="Analisa somente as sumulas ja baixadas, sem acessar o Drive")
    parser.add_argument("--ia", action="store_true",
                        help="Gera a nota com IA (OpenAI/Gemini) em vez das regras fixas")
    args = parser.parse_args()
    processar_sumulas(Path(args.config), local_only=args.process_local_only, usar_ia=args.ia)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
