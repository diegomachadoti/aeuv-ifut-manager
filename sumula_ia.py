"""Geracao da Nota Oficial por IA (OpenAI), sem usar o fluxo de regras fixas.

A IA recebe o texto integral do regulamento, o modelo de nota e a sumula, e
decide enquadramento e pena. Depois, o codigo confere se todos os
dispositivos citados existem no regulamento e se as penas estao dentro das
faixas previstas; divergencias ficam destacadas no topo da nota.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import requests

from sumula_disciplinar import (
    Regulamento, Sumula, bloco_relatorio_pdf, data_por_extenso, extrair_pena, formatar_data_jogo,
    inserir_antes_assinatura,
)

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
ENV_CHAVE = "OPENAI_API_KEY"
STATUS_TEMPORARIOS = {429, 500, 502, 503, 504}
TENTATIVAS = 4
ESPERA_INICIAL = 15
LOGGER = logging.getLogger("ifut_bot")
NUMEROS_EXTENSO = {
    "uma": 1, "um": 1, "duas": 2, "dois": 2, "tres": 3, "três": 3, "quatro": 4, "cinco": 5, "seis": 6,
    "sete": 7, "oito": 8, "nove": 9, "dez": 10,
}

INSTRUCOES = """Você é o redator da Comissão Organizadora/Disciplinar de uma competição de futebol varzeano.
Sua tarefa é analisar o relatório do árbitro (súmula) e redigir a NOTA OFICIAL com a decisão disciplinar.

REGRAS OBRIGATÓRIAS (não negociáveis):
1. O REGULAMENTO fornecido é o documento máximo. Use SOMENTE os artigos, parágrafos, incisos e faixas de pena
   que existem literalmente nele. Nunca cite dispositivo, pena, agravante ou atenuante que não esteja no texto.
2. Não invente fatos. Use apenas o que está no relato do árbitro e na lista de envolvidos. Se algo não está
   claro no relato, diga que não está claro; não presuma.
3. A pena escolhida deve estar dentro da faixa prevista no dispositivo. Justifique a dosimetria apenas com
   elementos do relato (reiteração, gravidade, consumação ou não do ato etc.).
4. Conduta sem dispositivo específico no regulamento não recebe pena autônoma. Registre isso expressamente
   e, se cabível, cite o artigo do regulamento que trata da ausência de dispositivo específico.
5. Cartões amarelos/vermelhos e jogadas normais de jogo não geram pena adicional, salvo se o relato
   descrever conduta prevista em dispositivo disciplinar do regulamento. Mencione a suspensão automática do
   cartão vermelho apenas para quem o relato diz que foi expulso.
6. O MODELO serve SOMENTE como referência de formato, estrutura, seções e tom. Os artigos e o nome da
   competição do modelo pertencem a outra competição: não copie nada do conteúdo dele.
7. Escreva em português formal, no mesmo padrão do modelo, com as seções: DOS FATOS, DO ENQUADRAMENTO LEGAL,
   DA PUNIÇÃO, DA PROPORCIONALIDADE DA DECISÃO e DISPOSIÇÕES FINAIS.
8. Não inclua links/URLs na nota: o link do relatório oficial (PDF) é adicionado automaticamente depois.

Responda APENAS com um JSON válido neste formato:
{
  "ha_infracao": true | false,
  "motivo_sem_infracao": "texto curto, quando ha_infracao for false",
  "dispositivos": [
    {"artigo": "11", "paragrafo": "1", "inciso": "", "envolvido": "Nome", "partidas": 4}
  ],
  "nota": "texto completo da nota"
}
Em "dispositivos", liste cada enquadramento aplicado. "paragrafo" é o número do § (ou "único"), "inciso" em
algarismos romanos ou vazio e "partidas" é o número de partidas aplicado (null se a pena não for em partidas).
"""


@dataclass
class ConfigIA:
    modelo: str
    temperatura: float | None
    timeout: int
    modelo_nota: Path
    api_url: str = OPENAI_URL
    api_key: str = ""

    @classmethod
    def carregar(cls, parser) -> "ConfigIA":
        secao = parser["ia"] if parser.has_section("ia") else {}
        temperatura = str(secao.get("temperatura", "0")).strip()
        return cls(
            modelo=secao.get("modelo", "gpt-4.1"),
            temperatura=float(temperatura) if temperatura else None,
            timeout=int(secao.get("timeout_seconds", "180")),
            modelo_nota=Path(secao.get("modelo_nota", "regulamento\\modelo-nota-oficial.txt")),
            api_url=str(secao.get("api_url", "")).strip() or OPENAI_URL,
            api_key=str(secao.get("api_key", "")).strip(),
        )


@dataclass
class ResultadoIA:
    ha_infracao: bool
    nota: str
    motivo_sem_infracao: str
    alertas: list[str]


def obter_chave(config: ConfigIA | None = None) -> str:
    chave = os.environ.get(ENV_CHAVE, "").strip() or (config.api_key if config else "")
    if not chave:
        raise RuntimeError(
            f"Chave da IA nao encontrada. Informe api_key na secao [ia] do config.local.ini "
            f"ou defina a variavel de ambiente {ENV_CHAVE}."
        )
    return chave


def montar_mensagens(sumula: Sumula, texto_sumula: str, regulamento_texto: str, modelo_nota: str,
                     competicao: str, cidade: str, hoje: date) -> list[dict]:
    envolvidos = "\n".join(
        f"- {e.nome} | {e.tipo} | equipe {e.equipe}" + (f" | camisa {e.camisa}" if e.camisa else "")
        for e in sumula.envolvidos
    ) or "- (nenhum envolvido informado)"
    dados = f"""DADOS PARA A NOTA
- Cabeçalho: "NOTA OFICIAL Nº {{NUMERO}}" (mantenha exatamente o marcador {{NUMERO}}) e, na linha seguinte, "{competicao.upper()}".
- Competição: {competicao}
- Partida: {sumula.time1} x {sumula.time2}, realizada em {formatar_data_jogo(sumula.data_jogo)}
- Local e data de assinatura: {cidade}, {data_por_extenso(hoje)}.
- Assinatura final: "ASSOCIAÇÃO AEUV" e, na linha seguinte, "{competicao}".

ENVOLVIDOS INFORMADOS PELO ÁRBITRO
{envolvidos}"""
    return [
        {"role": "system", "content": INSTRUCOES},
        {"role": "user", "content": f"=== REGULAMENTO (documento máximo) ===\n{regulamento_texto}"},
        {"role": "user", "content": f"=== MODELO DE NOTA (apenas formato) ===\n{modelo_nota}"},
        {"role": "user", "content": f"{dados}\n\n=== SÚMULA (relatório do árbitro) ===\n{texto_sumula}"},
    ]


class ErroIA(RuntimeError):
    """Falha de comunicacao com a IA; a sumula permanece para nova tentativa."""


def _post(corpo: dict, config: ConfigIA, chave: str) -> requests.Response:
    try:
        resposta = requests.post(
            config.api_url,
            headers={"Authorization": f"Bearer {chave}", "Content-Type": "application/json"},
            json=corpo,
            timeout=config.timeout,
        )
    except requests.RequestException as exc:
        raise ErroIA(f"Falha de conexao com a API de IA: {exc}") from exc
    return resposta


def chamar_openai(mensagens: list[dict], config: ConfigIA, chave: str) -> dict:
    corpo = {"model": config.modelo, "messages": mensagens, "response_format": {"type": "json_object"}}
    if config.temperatura is not None:
        corpo["temperature"] = config.temperatura
    for tentativa in range(1, TENTATIVAS + 1):
        resposta = _post(corpo, config, chave)
        if resposta.status_code not in STATUS_TEMPORARIOS or tentativa == TENTATIVAS:
            break
        espera = ESPERA_INICIAL * 2 ** (tentativa - 1)
        LOGGER.warning("[SUMULAS][IA] API indisponivel (%s); nova tentativa %s/%s em %ss",
                       resposta.status_code, tentativa + 1, TENTATIVAS, espera)
        time.sleep(espera)
    if resposta.status_code >= 400:
        raise ErroIA(f"Erro da API de IA ({resposta.status_code}): {resposta.text[:500]}")
    conteudo = resposta.json()["choices"][0]["message"]["content"]
    try:
        return json.loads(conteudo)
    except json.JSONDecodeError as exc:
        raise ErroIA(f"Resposta da IA nao e um JSON valido: {conteudo[:300]}") from exc


def _numero_partidas(texto: str) -> int | None:
    achado = re.search(r"(\d+)\s*\(", texto)
    if achado:
        return int(achado.group(1))
    achado = re.search(r"\b(\w+)\s+partidas", texto)
    return NUMEROS_EXTENSO.get(achado.group(1).lower()) if achado else None


def _faixa(pena: str | None) -> tuple[int, int] | None:
    if not pena or "partidas" not in pena:
        return None
    numeros = [int(n) for n in re.findall(r"(\d+)\s*\(", pena)]
    return (numeros[0], numeros[1]) if len(numeros) >= 2 else None


def validar_resposta(dados: dict, regulamento: Regulamento) -> list[str]:
    alertas: list[str] = []
    for item in dados.get("dispositivos") or []:
        artigo = str(item.get("artigo", "")).strip().upper().replace("ART.", "").replace("ART", "").strip()
        paragrafo = str(item.get("paragrafo", "") or "").strip().lower().replace("§", "").replace("º", "").strip()
        inciso = str(item.get("inciso", "") or "").strip().upper() or None
        referencia = f"ART. {artigo}" + (f", §{paragrafo}" if paragrafo else "") + (f", inciso {inciso}" if inciso else "")
        trecho = regulamento.trecho(artigo, paragrafo or None, inciso)
        if not trecho:
            alertas.append(f"{referencia} citado pela IA NÃO existe no regulamento.")
            continue
        partidas = item.get("partidas")
        faixa = _faixa(extrair_pena(trecho))
        if faixa and isinstance(partidas, (int, float)) and not faixa[0] <= partidas <= faixa[1]:
            alertas.append(
                f"{referencia}: pena de {partidas} partida(s) para {item.get('envolvido', '?')} fora da faixa "
                f"prevista ({faixa[0]} a {faixa[1]})."
            )

    nota = str(dados.get("nota", ""))
    for achado in re.finditer(r"ART\.?\s*(\d+(?:\.\d+)?)", nota, re.IGNORECASE):
        if achado.group(1) not in regulamento.artigos:
            alertas.append(f"A nota cita o ART. {achado.group(1)}, que NÃO existe no regulamento.")
    for linha in nota.splitlines():
        ref = re.search(r"ART\.?\s*(\d+(?:\.\d+)?),?\s*§\s*(\d+|único)", linha, re.IGNORECASE)
        if ref and "➡️" in linha:
            faixa = _faixa(extrair_pena(regulamento.trecho(ref.group(1), ref.group(2).lower()) or ""))
            aplicada = _numero_partidas(linha.split("–", 1)[-1]) if "–" in linha else None
            if faixa and aplicada and not faixa[0] <= aplicada <= faixa[1]:
                alertas.append(f"Linha fora da faixa do regulamento ({faixa[0]} a {faixa[1]}): "
                               f"{linha.replace('➡️', '').strip()}")
    return list(dict.fromkeys(alertas))


def gerar_nota_ia(sumula: Sumula, regulamento: Regulamento, config: ConfigIA, competicao: str, cidade: str,
                  hoje: date, chave: str) -> ResultadoIA:
    texto_sumula = sumula.arquivo.read_text(encoding="utf-8-sig", errors="ignore")
    regulamento_texto = regulamento.path.read_text(encoding="utf-8-sig")
    modelo_nota = config.modelo_nota.read_text(encoding="utf-8-sig") if config.modelo_nota.exists() else ""
    mensagens = montar_mensagens(sumula, texto_sumula, regulamento_texto, modelo_nota, competicao, cidade, hoje)
    dados = chamar_openai(mensagens, config, chave)
    return ResultadoIA(
        ha_infracao=bool(dados.get("ha_infracao")),
        nota=str(dados.get("nota", "")).strip(),
        motivo_sem_infracao=str(dados.get("motivo_sem_infracao", "")).strip(),
        alertas=validar_resposta(dados, regulamento),
    )


def finalizar_nota_ia(resultado: ResultadoIA, numero: int, ano: int, modelo: str,
                      sumula: Sumula | None = None, cidade: str = "") -> str:
    nota = resultado.nota.replace("{NUMERO}", f"{numero:03d}/{ano}")
    if sumula is not None:
        nota = inserir_antes_assinatura(nota, bloco_relatorio_pdf(sumula), cidade).rstrip("\n")
    cabecalho = [f"⚠️ RASCUNHO GERADO POR IA ({modelo}) – revise antes de publicar."]
    if resultado.alertas:
        cabecalho.append("⛔ DIVERGÊNCIAS COM O REGULAMENTO DETECTADAS – corrija antes de publicar:")
        cabecalho += [f"   - {alerta}" for alerta in resultado.alertas]
    return "\n".join(cabecalho) + "\n\n" + nota + "\n"


def gerar_analise_ia_sem_infracao(sumula: Sumula, resultado: ResultadoIA, modelo: str) -> str:
    return "\n".join([
        f"ANÁLISE DA SÚMULA {sumula.protocolo} (IA – {modelo})",
        f"Partida: {sumula.time1} x {sumula.time2} – {formatar_data_jogo(sumula.data_jogo)}",
        "",
        "A IA não identificou infração disciplinar prevista no regulamento.",
        f"Motivo: {resultado.motivo_sem_infracao or '(não informado)'}",
        "Recomenda-se revisão manual pela Comissão.",
        "",
        "DOS FATOS",
        sumula.fatos,
        *bloco_relatorio_pdf(sumula),
        "",
    ])
