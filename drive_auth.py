"""Credenciais do Google Drive: OAuth do dono da conta, com a conta de servico como reserva.

A conta de servico nao tem cota de armazenamento propria. Ela atualiza arquivos
que ja existem, mas nao cria nenhum: o Drive responde storageQuotaExceeded. Pior,
a pasta que ela cria fica registrada com ela como dona e some da visao de quem
abre o Drive.

Com OAuth a automacao age como o proprio dono da conta e usa a cota dele, entao
cria pastas e arquivos normalmente. A autorizacao e feita uma unica vez no
navegador; o refresh token fica salvo em disco e e renovado sozinho.

Enquanto o OAuth nao estiver configurado, tudo continua funcionando pela conta de
servico - so com a limitacao de nao criar nada novo.
"""

from __future__ import annotations

import configparser
import logging
from pathlib import Path

LOGGER = logging.getLogger(__name__)

# Escopo amplo de proposito: a automacao precisa enxergar pastas que ja existem
# no Drive (criadas a mao ou por outros fluxos). O escopo drive.file so daria
# acesso ao que a propria automacao criasse.
ESCOPOS = ["https://www.googleapis.com/auth/drive"]

CLIENT_JSON_PADRAO = "google-oauth-client.json"
TOKEN_JSON_PADRAO = "google-oauth-token.json"


def _caminho(parser: configparser.ConfigParser, chave: str, padrao: str) -> Path:
    return Path(parser.get("drive", chave, fallback=padrao))


def credenciais_oauth(client_json: Path, token_json: Path,
                      logger: logging.Logger | None = None):
    """Devolve credenciais OAuth, abrindo o navegador na primeira vez."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    logger = logger or LOGGER
    credenciais = None
    if token_json.exists():
        try:
            credenciais = Credentials.from_authorized_user_file(str(token_json), ESCOPOS)
        except ValueError:
            logger.warning("[DRIVE] Token OAuth ilegivel; autorizando de novo.")

    if credenciais and credenciais.valid:
        return credenciais

    if credenciais and credenciais.expired and credenciais.refresh_token:
        try:
            credenciais.refresh(Request())
            token_json.write_text(credenciais.to_json(), encoding="utf-8")
            return credenciais
        except Exception as exc:
            # invalid_grant: token revogado, senha trocada ou 6 meses sem uso.
            logger.warning("[DRIVE] Nao foi possivel renovar o token (%s); autorizando de novo.", exc)

    if not client_json.exists():
        raise FileNotFoundError(
            f"Credencial OAuth nao encontrada: {client_json}. "
            "Baixe o JSON do cliente OAuth (tipo 'App para computador') no Google Cloud."
        )

    logger.info("[DRIVE] Abrindo o navegador para autorizar o acesso ao Drive...")
    fluxo = InstalledAppFlow.from_client_secrets_file(str(client_json), ESCOPOS)
    credenciais = fluxo.run_local_server(
        port=0,
        authorization_prompt_message="",
        success_message="Autorizacao concluida. Pode fechar esta aba e voltar ao terminal.",
    )
    token_json.write_text(credenciais.to_json(), encoding="utf-8")
    logger.info("[DRIVE] Autorizacao salva em %s; nao sera pedida de novo.", token_json.name)
    return credenciais


def credenciais_drive(parser: configparser.ConfigParser,
                      logger: logging.Logger | None = None):
    """OAuth quando houver cliente configurado; conta de servico caso contrario."""
    from google.oauth2 import service_account

    logger = logger or LOGGER
    client_json = _caminho(parser, "oauth_client_json", CLIENT_JSON_PADRAO)
    if client_json.exists():
        token_json = _caminho(parser, "oauth_token_json", TOKEN_JSON_PADRAO)
        return credenciais_oauth(client_json, token_json, logger)

    logger.debug("[DRIVE] Sem cliente OAuth (%s); usando a conta de servico.", client_json)
    service_account_json = _caminho(parser, "service_account_json", "google-service-account.json")
    return service_account.Credentials.from_service_account_file(
        str(service_account_json), scopes=ESCOPOS
    )


def _parser_de(config_path: Path) -> configparser.ConfigParser:
    parser = configparser.ConfigParser()
    if not parser.read(config_path, encoding="utf-8"):
        raise FileNotFoundError(f"Arquivo de configuracao nao encontrado: {config_path}")
    parser.read(Path(config_path).with_name("config.local.ini"), encoding="utf-8")
    return parser


def credenciais_por_arquivo(config_path: Path, logger: logging.Logger | None = None):
    """Mesma escolha de credencial, partindo do caminho do config.ini."""
    return credenciais_drive(_parser_de(config_path), logger)


def usando_oauth(parser: configparser.ConfigParser) -> bool:
    return _caminho(parser, "oauth_client_json", CLIENT_JSON_PADRAO).exists()


def usando_oauth_por_arquivo(config_path: Path) -> bool:
    try:
        return usando_oauth(_parser_de(config_path))
    except FileNotFoundError:
        return False


def tem_credencial(config_path: Path) -> bool:
    """Ha alguma credencial (OAuth ou conta de servico) para falar com a API do Drive?"""
    try:
        parser = _parser_de(config_path)
    except FileNotFoundError:
        return False
    return (_caminho(parser, "oauth_client_json", CLIENT_JSON_PADRAO).exists()
            or _caminho(parser, "service_account_json", "google-service-account.json").exists())
