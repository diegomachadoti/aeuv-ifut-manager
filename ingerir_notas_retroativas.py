"""Ingestao de notas oficiais RETROATIVAS (Google Docs antigos) para o controle de punicoes.

Script isolado, nao altera o fluxo normal (sumula_disciplinar / controle_punicoes).

As notas antigas sao Google Docs escritos a mao (texto livre, sem a estrutura das
notas geradas pelo sistema). Por isso a extracao usa IA (a mesma config [ia] do
config.local.ini): a IA le o texto de cada nota e devolve, em JSON, as punicoes
disciplinares APLICADAS pela comissao (artigo + jogos). Expulsao automatica por
cartao vermelho NAO entra (nao conta para reincidencia) — so artigos aplicados.

As punicoes extraidas sao gravadas num arquivo PROPRIO e isolado:
    AEUV - Punicoes Retroativas.json
que o fluxo normal do Python nunca sobrescreve. Um passo posterior (opcional)
mescla esse arquivo ao controle e a reincidencia.

Fonte dos documentos (escolha uma):
    --dir   <PASTA_LOCAL>   le arquivos .txt e .docx (recursivo) cujo nome contem NOTA OFICIAL
    --pasta <ID_DA_PASTA>   le Google Docs 'NOTA OFICIAL' direto do Drive (recursivo)

Uso:
    # 1) Conferir o que a IA extraiu, SEM gravar nada (sempre faca isto primeiro):
    python ingerir_notas_retroativas.py --dir "C:\\caminho\\notas antigas" --dry-run

    # 2) Gravar o JSON de punicoes retroativas:
    python ingerir_notas_retroativas.py --dir "C:\\caminho\\notas antigas"

    # Pelo Drive (alternativa):
    python ingerir_notas_retroativas.py --pasta <ID_DA_PASTA> --dry-run

    # Opcoes:
    #   --config caminho/config.ini   (padrao: config.ini)
    #   --saida  caminho.json         (padrao: AEUV - Punicoes Retroativas.json)
    #   --limite N                    (processa no maximo N notas; util para teste)
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import re
from datetime import datetime
from pathlib import Path

from main import DEFAULT_CONFIG_PATH, configure_logging, normalize_text

LOGGER = logging.getLogger("ifut_bot")

SAIDA_PADRAO = Path("AEUV - Punicoes Retroativas.json")
MIME_DOC = "application/vnd.google-apps.document"
MIME_PASTA = "application/vnd.google-apps.folder"
FILTRO_NOME = "NOTA OFICIAL"

# Instrucao para a IA extrair as punicoes de uma nota antiga de texto livre.
INSTRUCOES_IA = """Você recebe o texto de uma NOTA OFICIAL disciplinar de futebol varzeano (documento antigo,
escrito à mão, em texto livre). Sua tarefa é EXTRAIR as punições disciplinares APLICADAS pela comissão.

REGRAS:
1. Considere APENAS punições aplicadas pela comissão com base em artigo/dispositivo do regulamento
   (ex.: "suspensão de X partidas por ART. 23"). 
2. NÃO inclua a suspensão automática por cartão vermelho/expulsão — ela não é uma punição da comissão.
   Se a nota disser que "permanece apenas a suspensão automática", NÃO gere punição para essa pessoa.
3. Se o documento for um ADENDO/CORREÇÃO que não aplica punição nova, retorne lista vazia de punições.
4. Não invente dados. Se um campo não estiver claro no texto, use string vazia (ou null em partidas).
5. "partidas" é o número de jogos de suspensão aplicados pela comissão (inteiro), ou null se a pena não
   for em partidas (ex.: suspensão por tempo/anos — nesse caso descreva em "decisao").

Responda APENAS com um JSON válido:
{
  "numero_nota": "007/2026",
  "competicao": "2ª Copa América 2026",
  "data_jogo": "DD/MM/AAAA ou vazio",
  "data_nota": "DD/MM/AAAA ou vazio",
  "partida": "EQUIPE A x EQUIPE B ou vazio",
  "eh_adendo_sem_punicao": true | false,
  "punicoes": [
    {
      "atleta": "Nome completo",
      "equipe": "Nome da equipe",
      "tipo": "Atleta" | "Comissão técnica",
      "artigo": "ART. 23, §1º",
      "partidas": 2,
      "decisao": "texto curto da decisão aplicada"
    }
  ]
}
"""


# ---------------------------------------------------------------------------
# Drive
# ---------------------------------------------------------------------------

def _servico_drive(config_path: Path, logger: logging.Logger):
    import drive_auth
    from googleapiclient.discovery import build

    credenciais = drive_auth.credenciais_por_arquivo(config_path, logger)
    return build("drive", "v3", credentials=credenciais, cache_discovery=False)


def _listar_filhos(service, pasta_id: str) -> list[dict]:
    """Lista arquivos e subpastas (nao-lixeira) de uma pasta, com paginacao."""
    itens: list[dict] = []
    token = None
    while True:
        resposta = service.files().list(
            q=f"'{pasta_id}' in parents and trashed = false",
            fields="nextPageToken, files(id, name, mimeType)",
            pageSize=200,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            pageToken=token,
        ).execute()
        itens.extend(resposta.get("files", []))
        token = resposta.get("nextPageToken")
        if not token:
            break
    return itens


def coletar_docs_nota(service, pasta_id: str, logger: logging.Logger) -> list[dict]:
    """Percorre a pasta e subpastas, devolvendo os Google Docs cujo nome contem NOTA OFICIAL."""
    encontrados: list[dict] = []
    pilha = [pasta_id]
    vistos: set[str] = set()
    while pilha:
        atual = pilha.pop()
        if atual in vistos:
            continue
        vistos.add(atual)
        for item in _listar_filhos(service, atual):
            if item["mimeType"] == MIME_PASTA:
                pilha.append(item["id"])
            elif item["mimeType"] == MIME_DOC and FILTRO_NOME in item["name"].upper():
                encontrados.append(item)
    logger.info("[RETROATIVO] %s documento(s) 'NOTA OFICIAL' encontrados.", len(encontrados))
    return encontrados


def exportar_texto(service, doc_id: str) -> str:
    """Exporta um Google Doc como texto puro."""
    from googleapiclient.http import MediaIoBaseDownload

    buffer = io.BytesIO()
    requisicao = service.files().export_media(fileId=doc_id, mimeType="text/plain")
    baixador = MediaIoBaseDownload(buffer, requisicao)
    concluido = False
    while not concluido:
        _, concluido = baixador.next_chunk()
    return buffer.getvalue().decode("utf-8-sig", errors="ignore")


# ---------------------------------------------------------------------------
# Leitura de arquivos locais (.txt, .docx) — alternativa ao Drive
# ---------------------------------------------------------------------------

EXTENSOES_LOCAIS = (".txt", ".docx")


def coletar_arquivos_locais(diretorio: Path, logger: logging.Logger) -> list[Path]:
    """Lista arquivos .txt/.docx (recursivo) cujo nome contem NOTA OFICIAL."""
    encontrados = [
        caminho for caminho in sorted(diretorio.rglob("*"))
        if caminho.is_file()
        and caminho.suffix.lower() in EXTENSOES_LOCAIS
        and FILTRO_NOME in caminho.name.upper()
        and not caminho.name.startswith("~$")  # arquivos temporarios do Word
    ]
    logger.info("[RETROATIVO] %s arquivo(s) 'NOTA OFICIAL' encontrados em %s", len(encontrados), diretorio)
    return encontrados


def ler_texto_local(caminho: Path) -> str:
    """Le o texto de um arquivo local .txt ou .docx."""
    if caminho.suffix.lower() == ".docx":
        import docx
        documento = docx.Document(str(caminho))
        return "\n".join(p.text for p in documento.paragraphs)
    return caminho.read_text(encoding="utf-8-sig", errors="ignore")


# ---------------------------------------------------------------------------
# Extracao via IA
# ---------------------------------------------------------------------------

# Timeout proprio do ingestor: (conexao, leitura) em segundos. Mais curto que o
# do fluxo principal para nao ficar pendurado quando o endpoint nao responde.
IA_TIMEOUT = (15, 75)
IA_TENTATIVAS = 3
IA_ESPERA = 10


def extrair_com_ia(texto: str, config_ia, chave: str, logger: logging.Logger) -> dict:
    """Chama a IA com timeout proprio e retry curto; nao usa o chamar_openai do fluxo principal
    para evitar ficar preso em conexoes penduradas."""
    import requests

    corpo = {
        "model": config_ia.modelo,
        "messages": [
            {"role": "system", "content": INSTRUCOES_IA},
            {"role": "user", "content": f"=== TEXTO DA NOTA OFICIAL ===\n{texto}"},
        ],
        "response_format": {"type": "json_object"},
    }
    if config_ia.temperatura is not None:
        corpo["temperature"] = config_ia.temperatura

    ultimo_erro = ""
    for tentativa in range(1, IA_TENTATIVAS + 1):
        try:
            resp = requests.post(
                config_ia.api_url,
                headers={"Authorization": f"Bearer {chave}", "Content-Type": "application/json"},
                json=corpo, timeout=IA_TIMEOUT,
            )
        except requests.RequestException as exc:
            ultimo_erro = f"conexao: {exc}"
            if tentativa < IA_TENTATIVAS:
                logger.warning("[RETROATIVO] IA sem resposta (%s); tentativa %s/%s em %ss",
                               exc, tentativa + 1, IA_TENTATIVAS, IA_ESPERA)
                import time
                time.sleep(IA_ESPERA)
            continue

        if resp.status_code in (429, 500, 502, 503, 504):
            ultimo_erro = f"HTTP {resp.status_code}"
            if tentativa < IA_TENTATIVAS:
                logger.warning("[RETROATIVO] IA indisponivel (%s); tentativa %s/%s em %ss",
                               resp.status_code, tentativa + 1, IA_TENTATIVAS, IA_ESPERA)
                import time
                time.sleep(IA_ESPERA)
            continue

        if resp.status_code >= 400:
            raise RuntimeError(f"Erro da IA ({resp.status_code}): {resp.text[:300]}")

        conteudo = resp.json()["choices"][0]["message"]["content"]
        try:
            return json.loads(conteudo)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Resposta da IA nao e JSON valido: {conteudo[:200]}") from exc

    raise RuntimeError(f"IA nao respondeu apos {IA_TENTATIVAS} tentativas ({ultimo_erro})")


def _normalizar_artigo(valor: str) -> str:
    texto = re.sub(r"\s+", " ", str(valor or "").strip())
    return texto


def punicoes_da_nota(dados: dict, nome_arquivo: str) -> list[dict]:
    """Converte a resposta da IA numa lista de registros de punicao (so artigos aplicados)."""
    if dados.get("eh_adendo_sem_punicao"):
        return []

    registros: list[dict] = []
    for p in dados.get("punicoes") or []:
        artigo = _normalizar_artigo(p.get("artigo"))
        atleta = str(p.get("atleta") or "").strip()
        # So conta punicao com atleta e artigo (reincidencia e de artigo aplicado).
        if not atleta or not artigo:
            continue
        partidas = p.get("partidas")
        registros.append({
            "nota": str(dados.get("numero_nota") or "").strip(),
            "data_nota": str(dados.get("data_nota") or "").strip(),
            "competicao": str(dados.get("competicao") or "").strip(),
            "data_jogo": str(dados.get("data_jogo") or "").strip(),
            "partida": str(dados.get("partida") or "").strip(),
            "equipe": str(p.get("equipe") or "").strip(),
            "atleta": atleta,
            "tipo": str(p.get("tipo") or "Atleta").strip() or "Atleta",
            "artigo": artigo,
            "partidas": partidas if isinstance(partidas, int) else None,
            "decisao": str(p.get("decisao") or "").strip(),
            "origem_arquivo": nome_arquivo,
            "modo": "Retroativa",
        })
    return registros


# ---------------------------------------------------------------------------
# Deduplicacao (no nivel da punicao)
# ---------------------------------------------------------------------------

def _chave_punicao(r: dict) -> tuple:
    """Identidade de uma punicao: nota + atleta + equipe + artigo (tudo normalizado)."""
    return (
        normalize_text(r.get("nota") or ""),
        normalize_text(r.get("atleta") or ""),
        normalize_text(r.get("equipe") or ""),
        normalize_text(r.get("artigo") or ""),
    )


def deduplicar(registros: list[dict], logger: logging.Logger) -> list[dict]:
    """Remove punicoes repetidas (mesma nota+atleta+equipe+artigo).

    Quando ha repeticao, mantem a de informacao mais completa (mais partidas
    conhecidas / decisao mais longa), tratada como a versao mais recente.
    """
    unicos: dict[tuple, dict] = {}
    duplicadas = 0
    for r in registros:
        chave = _chave_punicao(r)
        atual = unicos.get(chave)
        if atual is None:
            unicos[chave] = r
            continue
        duplicadas += 1
        # Mantem o registro mais "informativo": com partidas definidas e decisao mais longa.
        def completude(x):
            return (x.get("partidas") is not None, len(x.get("decisao") or ""))
        vencedor = r if completude(r) > completude(atual) else atual
        logger.info("[RETROATIVO] Duplicada ignorada: %s | %s | %s (origem: %s / %s)",
                    r.get("atleta"), r.get("equipe"), r.get("artigo"),
                    atual.get("origem_arquivo"), r.get("origem_arquivo"))
        unicos[chave] = vencedor

    if duplicadas:
        logger.info("[RETROATIVO] %s punicao(oes) duplicada(s) consolidada(s); %s unica(s).",
                    duplicadas, len(unicos))
    return list(unicos.values())


# ---------------------------------------------------------------------------
# Execucao
# ---------------------------------------------------------------------------

def _fontes_do_drive(pasta_id: str, config_path: Path, logger: logging.Logger) -> list[tuple]:
    """Devolve [(nome, callable->texto)] para cada Google Doc 'NOTA OFICIAL' da pasta."""
    service = _servico_drive(config_path, logger)
    docs = coletar_docs_nota(service, pasta_id, logger)
    docs.sort(key=lambda d: d["name"])
    return [(doc["name"], (lambda i=doc["id"]: exportar_texto(service, i))) for doc in docs]


def _fontes_locais(diretorio: Path, logger: logging.Logger) -> list[tuple]:
    """Devolve [(nome, callable->texto)] para cada arquivo .txt/.docx 'NOTA OFICIAL' local."""
    arquivos = coletar_arquivos_locais(diretorio, logger)
    return [(caminho.name, (lambda c=caminho: ler_texto_local(c))) for caminho in arquivos]


def ingerir(fontes: list[tuple], config_path: Path, saida: Path, dry_run: bool,
            limite: int | None, logger: logging.Logger, origem_desc: str = "") -> list[dict]:
    import sumula_ia
    from sumula_disciplinar import ConfigSumulas

    parser = ConfigSumulas.carregar(config_path).parser
    config_ia = sumula_ia.ConfigIA.carregar(parser)
    chave_ia = sumula_ia.obter_chave(config_ia)
    logger.info("[RETROATIVO] IA ativa (modelo %s)", config_ia.modelo)

    if limite:
        fontes = fontes[:limite]

    total = len(fontes)
    todas: list[dict] = []
    falhas: list[str] = []
    for indice, (nome, obter_texto) in enumerate(fontes, start=1):
        logger.info("[RETROATIVO] (%s/%s) Processando: %s", indice, total, nome)
        try:
            texto = obter_texto()
            if not texto.strip():
                logger.warning("[RETROATIVO] %s: documento vazio; ignorado.", nome)
                continue
            dados = extrair_com_ia(texto, config_ia, chave_ia, logger)
            registros = punicoes_da_nota(dados, nome)
            if registros:
                logger.info("[RETROATIVO] %s: %s punicao(oes) extraida(s).", nome, len(registros))
                for r in registros:
                    logger.info("           -> %s (%s) | %s | %s partida(s)",
                                r["atleta"], r["equipe"], r["artigo"],
                                r["partidas"] if r["partidas"] is not None else "—")
            else:
                logger.info("[RETROATIVO] %s: sem punicao de comissao (adendo/automatica).", nome)
            todas.extend(registros)
        except Exception as exc:
            # Uma nota que falha (ex.: IA sobrecarregada/503) nao derruba o lote.
            falhas.append(nome)
            logger.error("[RETROATIVO] Falha em %s: %s — segue para a proxima.", nome, exc)

    # Consolida punicoes repetidas (mesma nota+atleta+equipe+artigo) entre os documentos.
    todas = deduplicar(todas, logger)

    logger.info("[RETROATIVO] Total: %s punicao(oes) unica(s) de %s nota(s). Falhas: %s.",
                len(todas), total, len(falhas))
    if falhas:
        logger.warning("[RETROATIVO] Notas que falharam (reprocesse depois): %s", "; ".join(falhas))

    if dry_run:
        logger.info("[RETROATIVO] --dry-run: nada foi gravado. Confira o resultado acima.")
        print(json.dumps(todas, ensure_ascii=False, indent=2))
        return todas

    conteudo = {
        "gerado_em": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "origem": origem_desc,
        "notas_processadas": total,
        "notas_com_falha": falhas,
        "punicoes": todas,
    }
    saida.write_text(json.dumps(conteudo, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("[RETROATIVO] Gravado em %s", saida)
    return todas


def main() -> int:
    ap = argparse.ArgumentParser(description="Ingestao de notas oficiais retroativas (locais ou Google Docs).")
    fonte = ap.add_mutually_exclusive_group(required=True)
    fonte.add_argument("--dir", help="Pasta LOCAL com .txt/.docx (percorre subpastas).")
    fonte.add_argument("--pasta", help="ID da pasta do Drive (percorre subpastas).")
    ap.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    ap.add_argument("--saida", default=str(SAIDA_PADRAO))
    ap.add_argument("--dry-run", action="store_true",
                    help="So mostra o que a IA extraiu, sem gravar nada.")
    ap.add_argument("--limite", type=int, default=None,
                    help="Processa no maximo N notas (teste).")
    args = ap.parse_args()

    config_path = Path(args.config)
    from sumula_disciplinar import ConfigSumulas
    logger = configure_logging(ConfigSumulas.carregar(config_path).log_path)

    if args.dir:
        diretorio = Path(args.dir)
        if not diretorio.is_dir():
            logger.error("[RETROATIVO] Pasta local nao encontrada: %s", diretorio)
            return 1
        fontes = _fontes_locais(diretorio, logger)
        origem = f"local:{diretorio}"
    else:
        fontes = _fontes_do_drive(args.pasta, config_path, logger)
        origem = f"drive:{args.pasta}"

    ingerir(fontes, config_path, Path(args.saida), args.dry_run, args.limite, logger, origem)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
