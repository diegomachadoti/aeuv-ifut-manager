from __future__ import annotations

import argparse
import configparser
import logging
import re
import sys
import time
import unicodedata
import io
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

import requests
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException, TimeoutException
from selenium.webdriver import ChromeOptions
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

import drive_auth


DEFAULT_CONFIG_PATH = Path("config.ini")
DEFAULT_DOWNLOAD_DIR = Path("downloads") / "inscricoes"
DEFAULT_LOG_PATH = Path("logs") / "ifut.log"
DEFAULT_PROCESSED_DIR = DEFAULT_DOWNLOAD_DIR / "processados"
DEFAULT_FAILED_DIR = DEFAULT_DOWNLOAD_DIR / "falhas"
DEFAULT_SELECTORS_PATH = Path("selectors.ini")


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    return normalized.strip()


def team_search_key(team_name: str) -> str:
    return normalize_text(team_name.split("-", 1)[0])


def text_tokens(text: str) -> set[str]:
    """Extrai tokens significantes ignorando particulas comuns."""
    particles = {"da", "de", "do", "a", "o", "e", "em"}
    normalized = normalize_text(text)
    tokens = {token for token in normalized.split() if token and token not in particles}
    return tokens


def text_tokens_all(text: str) -> set[str]:
    normalized = normalize_text(text)
    return {token for token in normalized.split() if token}


def token_overlap_score(target_tokens: set[str], candidate_tokens: set[str]) -> float:
    """Calcula similaridade entre conjuntos de tokens (0.0 a 1.0)."""
    if not target_tokens or not candidate_tokens:
        return 0.0
    intersection = len(target_tokens & candidate_tokens)
    union = len(target_tokens | candidate_tokens)
    return intersection / union if union > 0 else 0.0


def token_containment_score(target_tokens: set[str], candidate_tokens: set[str]) -> float:
    """Calcula quanto o conjunto menor esta contido no maior."""
    if not target_tokens or not candidate_tokens:
        return 0.0
    smaller = target_tokens if len(target_tokens) <= len(candidate_tokens) else candidate_tokens
    larger = candidate_tokens if smaller is target_tokens else target_tokens
    return len(smaller & larger) / len(smaller) if smaller else 0.0


def token_similarity_score(target_tokens: set[str], candidate_tokens: set[str]) -> float:
    if not target_tokens or not candidate_tokens:
        return 0.0
    target_core = {token for token in target_tokens if token not in {"da", "de", "do", "das", "dos", "e", "a", "o", "em"}}
    candidate_core = {token for token in candidate_tokens if token not in {"da", "de", "do", "das", "dos", "e", "a", "o", "em"}}
    if not target_core or not candidate_core:
        return 0.0
    intersection = len(target_core & candidate_core)
    return intersection / max(len(target_core), len(candidate_core))


def parse_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "sim", "yes", "y"}


@dataclass
class Record:
    index: int
    action: str
    person_type: str
    full_name: str
    birthdate: str
    cpf: str
    previous_competition: str = ""

    @property
    def normalized_action(self) -> str:
        return normalize_text(self.action)

    @property
    def normalized_person_type(self) -> str:
        return normalize_text(self.person_type)

    @property
    def requires_identity(self) -> bool:
        return self.normalized_action == "inclusao" and self.normalized_person_type == "atleta"

    @property
    def is_commission(self) -> bool:
        return "comissao tecnica" in self.normalized_person_type


@dataclass
class RequestFile:
    source_name: str
    source_url: str
    protocol: str
    team_name: str
    competition_name: str
    pix_receipt_url: str
    records: list[Record]
    raw_text: str


@dataclass
class TeamLinkInfo:
    name: str
    url: str


@dataclass
class TeamSpreadsheetUpdate:
    team_name: str
    total_athletes: int
    pix_receipt_url: str = ""


@dataclass
class RecordResult:
    index: int
    action: str
    person_type: str
    full_name: str
    birthdate: str
    cpf: str
    status: str
    message: str


class DuplicateAthleteError(ValueError):
    pass


class PortabilityMatchError(LookupError):
    pass


class RemovalValidationError(ValueError):
    pass


class SaveConfirmationTimeout(TimeoutError):
    """O iFut nao confirmou a gravacao (pop-up continuou aberto) dentro do prazo."""
    pass


STATUS_PENDENTE = "PENDENTE"


@dataclass
class PortabilityMatch:
    checkbox: WebElement | None
    label: str
    score: float
    threshold: float
    matched: bool


def _segredo_ifut(parser: configparser.ConfigParser, chave: str) -> str:
    """Le uma credencial do iFut, que deve ficar apenas no config.local.ini."""
    valor = parser.get("ifut", chave, fallback="").strip()
    if not valor:
        raise KeyError(
            f"Credencial [ifut] {chave} nao configurada. Crie o arquivo config.local.ini "
            "ao lado do config.ini com:\n\n[ifut]\nusername = seu-email\npassword = sua-senha\n\n"
            "Esse arquivo esta no .gitignore e nunca e enviado ao repositorio."
        )
    return valor


class AppConfig:
    def __init__(self, path: Path) -> None:
        parser = configparser.ConfigParser()
        if not parser.read(path, encoding="utf-8"):
            raise FileNotFoundError(f"Arquivo de configuracao nao encontrado: {path}")
        # config.local.ini (no .gitignore) guarda os segredos e sobrepoe o config.ini.
        parser.read(Path(path).with_name("config.local.ini"), encoding="utf-8")

        self.path = path
        self.parser = parser
        self.username = _segredo_ifut(parser, "username")
        self.password = _segredo_ifut(parser, "password")
        self.login_url = parser.get("ifut", "login_url")
        self.championship_url = parser.get("ifut", "championship_url")
        self.teams_url = parser.get("ifut", "teams_url")
        self.championship_public_id = parser.get("ifut", "championship_public_id", fallback="")
        self.championship_public_slug = parser.get("ifut", "championship_public_slug", fallback="")
        self.team_urls = dict(parser.items("teams")) if parser.has_section("teams") else {}
        self.headless = parse_bool(parser.get("selenium", "headless", fallback="false"))
        self.timeout = parser.getint("selenium", "timeout_seconds", fallback=20)
        self.download_dir = Path(parser.get("drive", "download_dir", fallback=str(DEFAULT_DOWNLOAD_DIR)))
        self.processed_dir = Path(parser.get("drive", "processed_dir", fallback=str(DEFAULT_PROCESSED_DIR)))
        self.failed_dir = Path(parser.get("drive", "failed_dir", fallback=str(DEFAULT_FAILED_DIR)))
        self.results_dir = Path(parser.get("drive", "results_dir", fallback=str(DEFAULT_DOWNLOAD_DIR / "resultados")))
        self.folder_embed_url = parser.get("drive", "folder_embed_url")
        self.service_account_json = Path(parser.get("drive", "service_account_json", fallback="google-service-account.json"))
        self.log_path = Path(parser.get("app", "log_path", fallback=str(DEFAULT_LOG_PATH)))
        self.pause_after_action = parse_bool(parser.get("app", "pause_after_action", fallback="true"), default=True)
        self.dry_run = parse_bool(parser.get("app", "dry_run", fallback="true"), default=True)
        self.wait_between_records_seconds = parser.getfloat("app", "wait_between_records_seconds", fallback=2.0)
        self.team_page_wait_seconds = parser.getfloat("app", "team_page_wait_seconds", fallback=2.0)
        self.portability_popup_wait_seconds = parser.getfloat("app", "portability_popup_wait_seconds", fallback=2.0)
        self.portability_cancel_delay_seconds = parser.getfloat("app", "portability_cancel_delay_seconds", fallback=1.0)
        self.removal_click_delay_seconds = parser.getfloat("app", "removal_click_delay_seconds", fallback=3.0)
        self.removal_confirm_delay_seconds = parser.getfloat("app", "removal_confirm_delay_seconds", fallback=3.0)
        # Prazo maximo para o iFut confirmar a gravacao (pop-up fechar) apos Salvar/Remover/Inscrever.
        self.save_confirm_timeout_seconds = parser.getfloat("app", "save_confirm_timeout_seconds", fallback=45.0)
        self.portability_source_championship = parser.get("app", "portability_source_championship", fallback="2º COPA AMERICA 2026")
        self.spreadsheet_id = parser.get("sheets", "spreadsheet_id", fallback="")
        self.sheets_range_times = parser.get("sheets", "range_times", fallback="A2:C")
        self.sheets_update_enabled = parse_bool(parser.get("sheets", "update_enabled", fallback="false"), default=False)
        self.associacao = parser.get(
            "pdf", "associacao", fallback="AEUV (Associação Esportiva Uberlandense Varzeana)"
        ).strip()


class SelectorConfig:
    def __init__(self, path: Path) -> None:
        parser = configparser.ConfigParser()
        if not parser.read(path, encoding="utf-8"):
            raise FileNotFoundError(f"Arquivo de seletores nao encontrado: {path}")
        self.parser = parser

    def get(self, section: str, option: str) -> str:
        value = self.parser.get(section, option, fallback="").strip()
        if not value:
            raise KeyError(f"Seletor ausente: [{section}] {option}")
        return value

    def get_optional(self, section: str, option: str) -> str | None:
        value = self.parser.get(section, option, fallback="").strip()
        return value or None


class DriveTxtDownloader:
    def __init__(self, folder_embed_url: str, download_dir: Path, service_account_json: Path | None = None,
                 config_path: Path | None = None) -> None:
        self.folder_embed_url = folder_embed_url
        self.download_dir = download_dir
        self.service_account_json = service_account_json
        self.config_path = config_path or DEFAULT_CONFIG_PATH
        self.remote_files_by_name: dict[str, str] = {}
        self._drive_service = None
        self._root_folder_id: str | None = None
        self._entry_folder_id: str | None = None
        self._processed_folder_id: str | None = None
        self._failed_folder_id: str | None = None
        self._results_folder_id: str | None = None

    def sync(self) -> list[Path]:
        self.download_dir.mkdir(parents=True, exist_ok=True)
        if drive_auth.tem_credencial(self.config_path):
            return self._sync_pela_api()
        html = self._fetch_html(self.folder_embed_url)
        entry_folder_url = self._find_entry_folder_url(html)
        if entry_folder_url:
            html = self._fetch_html(self._folder_view_url(entry_folder_url))
        matches = re.findall(
            r'<div class="flip-entry"[^>]*>.*?<a href="https://drive\.google\.com/file/d/([^"/]+)/view[^"]*".*?<div class="flip-entry-title">(.*?)</div>',
            html,
            re.DOTALL,
        )
        files: list[Path] = []
        for file_id, title in matches:
            safe_name = title.strip()
            if not safe_name.lower().endswith(".txt"):
                continue
            destination = self.download_dir / safe_name
            content = requests.get(
                f"https://drive.google.com/uc?export=download&id={file_id}",
                timeout=30,
            )
            content.raise_for_status()
            destination.write_bytes(content.content)
            files.append(destination)
        return files

    def _sync_pela_api(self) -> list[Path]:
        service = build("drive", "v3", credentials=drive_auth.credenciais_por_arquivo(self.config_path))
        self._drive_service = service
        root_folder_id = self._extract_folder_id(self.folder_embed_url)
        self._root_folder_id = root_folder_id
        entry_folder_id = self._find_named_folder_id(service, root_folder_id, "Entrada")
        self._entry_folder_id = entry_folder_id or root_folder_id
        self._processed_folder_id = self._find_named_folder_id(service, root_folder_id, "Processados")
        self._failed_folder_id = self._find_named_folder_id(service, root_folder_id, "Falhas")
        self._results_folder_id = self._find_named_folder_id(service, root_folder_id, "Resultados")
        folder_id = self._entry_folder_id
        query = f"'{folder_id}' in parents and trashed = false and (name contains '.txt' or mimeType = 'text/plain')"
        response = service.files().list(
            q=query,
            fields="files(id, name)",
            pageSize=200,
        ).execute()
        files: list[Path] = []
        for item in response.get("files", []):
            destination = self.download_dir / item["name"].strip()
            self.remote_files_by_name[destination.name] = item["id"]
            request = service.files().get_media(fileId=item["id"])
            buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            destination.write_bytes(buffer.getvalue())
            files.append(destination)
        return files

    def _fetch_html(self, url: str) -> str:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.text

    def _find_entry_folder_url(self, html: str) -> str | None:
        match = re.search(
            r'<a href="(https://drive\.google\.com/drive/folders/[^"]+)".*?<div class="flip-entry-title">Entrada</div>',
            html,
            re.DOTALL,
        )
        return match.group(1) if match else None

    def _folder_view_url(self, folder_url: str) -> str:
        parsed = urlparse(folder_url)
        folder_id = parsed.path.rstrip("/").split("/")[-1]
        return f"https://drive.google.com/embeddedfolderview?id={folder_id}#list"

    def _extract_folder_id(self, url: str) -> str:
        parsed = urlparse(url)
        if "id=" in url:
            match = re.search(r"[?&]id=([^&#]+)", url)
            if match:
                return match.group(1)
        return parsed.path.rstrip("/").split("/")[-1]

    def _find_named_folder_id(self, service, root_folder_id: str, folder_name: str) -> str | None:
        query = (
            f"'{root_folder_id}' in parents and trashed = false "
            f"and mimeType = 'application/vnd.google-apps.folder' and name = '{folder_name}'"
        )
        response = service.files().list(
            q=query,
            fields="files(id, name)",
            pageSize=10,
        ).execute()
        files = response.get("files", [])
        return files[0]["id"] if files else None

    def ensure_status_folders(self, logger=None) -> None:
        """Cria as pastas Processados/Falhas/Resultados no Drive quando ainda nao existirem."""
        if not self._drive_service or not self._root_folder_id:
            return
        for attribute, folder_name in (
            ("_processed_folder_id", "Processados"),
            ("_failed_folder_id", "Falhas"),
            ("_results_folder_id", "Resultados"),
        ):

            if getattr(self, attribute):
                continue
            created = self._drive_service.files().create(
                body={
                    "name": folder_name,
                    "mimeType": "application/vnd.google-apps.folder",
                    "parents": [self._root_folder_id],
                },
                fields="id",
            ).execute()
            setattr(self, attribute, created["id"])
            if logger:
                logger.info("Pasta %s criada no Drive", folder_name)

    def move_remote_file(self, file_name: str, destination_kind: str, logger=None) -> None:
        if not self._drive_service:
            if logger:
                logger.warning("Servico Google Drive nao inicializado; skip movimentacao remota para %s", file_name)
            return
        file_id = self.remote_files_by_name.get(file_name)
        if not file_id:
            if logger:
                logger.warning("Arquivo %s nao encontrado no rastreamento remoto; talvez nao foi baixado via service account", file_name)
            return
        destination_folder_id = self._processed_folder_id if destination_kind == "processed" else self._failed_folder_id
        source_folder_id = self._entry_folder_id
        if not destination_folder_id or not source_folder_id:
            if logger:
                logger.error("Pastas de destino nao configuradas: processados=%s, falhas=%s", self._processed_folder_id, self._failed_folder_id)
            return
        try:
            self._drive_service.files().update(
                fileId=file_id,
                addParents=destination_folder_id,
                removeParents=source_folder_id,
                fields="id, parents",
            ).execute()
            if logger:
                logger.info("Arquivo movido no Drive: %s -> %s", file_name, destination_kind)
        except Exception as exc:
            if logger:
                logger.error("Erro ao mover arquivo no Drive %s: %s", file_name, exc)

    MIMES_RESULTADO = {".txt": "text/plain", ".pdf": "application/pdf"}

    def publish_results(self, paths, logger=None) -> None:
        """Envia o TXT e o PDF de resultado para a pasta Resultados no Drive.

        E o que permite a tela de solicitacoes do sistema interno mostrar por que
        um registro falhou. Falhar aqui nao invalida o processamento: o arquivo
        local ja esta gravado.
        """
        if not paths:
            return
        if not self._drive_service:
            if logger:
                logger.warning("Servico Google Drive nao inicializado; resultado nao publicado")
            return
        self.ensure_status_folders(logger)
        if not self._results_folder_id:
            if logger:
                logger.error("Pasta Resultados nao configurada no Drive")
            return
        for path in paths:
            if not path or not path.exists():
                continue
            try:
                self._upload_result_file(path)
                if logger:
                    logger.info("Resultado publicado no Drive: %s", path.name)
            except Exception as exc:
                if logger:
                    logger.error("Erro ao publicar %s no Drive: %s", path.name, exc)

    def _upload_result_file(self, path: Path) -> None:
        mimetype = self.MIMES_RESULTADO.get(path.suffix.lower(), "application/octet-stream")
        media = MediaFileUpload(str(path), mimetype=mimetype, resumable=False)
        existing = self._drive_service.files().list(
            q=f"'{self._results_folder_id}' in parents and trashed = false and name = '{path.name}'",
            fields="files(id)",
            pageSize=1,
        ).execute().get("files", [])
        if existing:
            self._drive_service.files().update(fileId=existing[0]["id"], media_body=media).execute()
            return
        self._drive_service.files().create(
            body={"name": path.name, "parents": [self._results_folder_id]},
            media_body=media,
            fields="id",
        ).execute()


class TxtRequestParser:
    HEADER_PATTERN = re.compile(r"^(.*?):\s*(.*)$")
    RECORD_PATTERN = re.compile(
        r"REGISTRO\s+(\d+)\s*\nACAO:\s*(.*?)\s*\nTIPO:\s*(.*?)\s*\nNOME COMPLETO:\s*(.*?)\s*\nDATA DE NASCIMENTO:\s*(.*?)\s*\nCPF:\s*(.*?)"
        r"(?:\s*\nCOMPETICAO ANTERIOR:\s*(.*?))?(?=\n\s*\nREGISTRO\s+\d+\s*\n|\Z)",
        re.DOTALL,
    )

    def parse(self, path: Path) -> RequestFile:
        raw_text = path.read_text(encoding="utf-8", errors="ignore")
        compact = raw_text.replace("\r", "")
        header: dict[str, str] = {}
        for line in compact.splitlines():
            line = line.strip()
            if not line:
                continue
            match = self.HEADER_PATTERN.match(line)
            if match:
                header[normalize_text(match.group(1))] = match.group(2).strip()

        records: list[Record] = []
        for record_match in self.RECORD_PATTERN.finditer(compact):
            records.append(
                Record(
                    index=int(record_match.group(1)),
                    action=record_match.group(2).strip(),
                    person_type=record_match.group(3).strip(),
                    full_name=record_match.group(4).strip(),
                    birthdate=record_match.group(5).strip(),
                    cpf=record_match.group(6).strip(),
                    previous_competition=(record_match.group(7) or "").strip(),
                )
            )

        return RequestFile(
            source_name=path.name,
            source_url="",
            protocol=header.get("protocolo", ""),
            team_name=header.get("equipe", ""),
            competition_name=header.get("competicao", ""),
            pix_receipt_url=header.get("comprovante pix", ""),
            records=records,
            raw_text=compact,
        )


class IfutBot:
    def __init__(self, config: AppConfig, selectors: SelectorConfig, logger: logging.Logger) -> None:
        self.config = config
        self.selectors = selectors
        self.logger = logger
        self.driver = self._build_driver()
        self.wait = WebDriverWait(self.driver, self.config.timeout)
        self.last_result_files: list[Path] = []

    def _build_driver(self) -> webdriver.Chrome:
        options = ChromeOptions()
        if self.config.headless:
            options.add_argument("--headless=new")
        options.add_argument("--start-maximized")
        options.add_argument("--disable-notifications")
        options.add_argument("--lang=pt-BR")
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)

    def close(self) -> None:
        self.driver.quit()

    def login(self) -> None:
        self.driver.get(self.config.login_url)
        self._fill(self.selectors.get("login", "username_input"), self.config.username)
        self._fill(self.selectors.get("login", "password_input"), self.config.password)
        self._click(self.selectors.get("login", "submit_button"))
        self.wait.until(ec.url_contains("/campeonatos"))

    def open_teams_page(self) -> None:
        self.driver.get(self.config.teams_url)
        self.wait.until(ec.presence_of_element_located(self._locator(self.selectors.get("teams", "page_ready"))))

    def open_team_page(self, team_name: str) -> None:
        team_url = self._team_url_for(team_name)
        if not team_url:
            raise LookupError(f"URL do time nao mapeada: {team_name}")
        self.driver.get(team_url)
        self.wait.until(ec.url_contains("/time/"))
        time.sleep(self.config.team_page_wait_seconds)

    def _team_url_for(self, team_name: str) -> str | None:
        key = team_search_key(team_name)
        for mapped_key, mapped_url in self.config.team_urls.items():
            if normalize_text(mapped_key) == key:
                return mapped_url
        return None

    def process_request(self, request: RequestFile) -> None:
        self.logger.info("Processando protocolo %s do time %s", request.protocol, request.team_name)
        self.open_team_page(request.team_name)
        self._open_roster_section()
        results: list[RecordResult] = []
        for record in request.records:
            self.logger.info(
                "Registro %s - acao=%s tipo=%s nome=%s",
                record.index,
                record.action,
                record.person_type,
                record.full_name,
            )
            try:
                message = self._execute_record(record)
                self.logger.info("Registro %s processado com sucesso", record.index)
                results.append(self._build_record_result(record, "SUCESSO", message))
            except DuplicateAthleteError as exc:
                self.logger.error("Registro %s falhou: %s", record.index, exc)
                results.append(self._build_record_result(record, "FALHA", str(exc)))
            except SaveConfirmationTimeout as exc:
                self.logger.warning("Registro %s sem confirmacao do iFut: %s", record.index, exc)
                self._recover_team_page(request)
                results.append(self._resolve_unconfirmed_record(record, str(exc)))
            except Exception as exc:
                self.logger.exception("Registro %s falhou: %s", record.index, exc)
                results.append(self._build_record_result(record, "FALHA", str(exc)))
                # Garante que um pop-up preso nao contamine o proximo registro.
                self._recover_team_page(request)
            time.sleep(self.config.wait_between_records_seconds)
        
        self.logger.info("Escrevendo arquivo de resultado...")
        self._write_result_file(request, results)
        
        self.logger.info("Etapa final: Atualizando planilha de controle (etapa adicional, nao obrigatoria)...")
        self._update_spreadsheet(request)
        
        self.logger.info("Processamento do arquivo finalizado com sucesso")

    def _recover_team_page(self, request: RequestFile) -> None:
        """Recarrega a pagina do time do zero, descartando qualquer pop-up travado."""
        try:
            self.logger.info("[RECUPERACAO] Recarregando a pagina do time '%s' para seguir ao proximo registro",
                             request.team_name)
            self.open_team_page(request.team_name)
            self._open_roster_section()
        except Exception as exc:
            self.logger.error("[RECUPERACAO] Nao foi possivel recarregar a pagina do time: %s", exc)

    def _resolve_unconfirmed_record(self, record: Record, timeout_message: str) -> RecordResult:
        """Apos recarregar a pagina, confere no elenco se a operacao lenta acabou sendo gravada."""
        action = record.normalized_action
        try:
            if action == "remocao":
                self._open_removal_context(record)
                rows = self.driver.find_elements(*self._locator(self.selectors.get("team", "roster_row")))
                try:
                    self._find_person_row(record.full_name)
                    encontrado = True
                except LookupError:
                    encontrado = False
                if rows and not encontrado:
                    self._restore_default_team_tab(record)
                    return self._build_record_result(
                        record, "SUCESSO", "Remocao confirmada apos recarregar a pagina (iFut demorou a responder)")
            else:
                if record.is_commission:
                    self._open_removal_context(record)
                self._find_person_row(record.full_name)
                self._restore_default_team_tab(record)
                verbo = "Portabilidade" if action == "portabilidade" else "Inclusao"
                return self._build_record_result(
                    record, "SUCESSO", f"{verbo} confirmada apos recarregar a pagina (iFut demorou a responder)")
        except LookupError:
            pass
        except Exception as exc:
            self.logger.warning("[RECUPERACAO] Falha ao conferir o elenco apos timeout: %s", exc)
        try:
            self._restore_default_team_tab(record)
        except Exception:
            pass
        return self._build_record_result(
            record,
            STATUS_PENDENTE,
            f"{timeout_message} Conferir manualmente no iFut se a operacao foi efetivada.",
        )

    def _has_visible(self, selector: str) -> bool:
        for element in self.driver.find_elements(*self._locator(selector)):
            try:
                if element.is_displayed():
                    return True
            except StaleElementReferenceException:
                continue
        return False

    def _wait_dialog_closed(self, selector: str | None, operacao: str) -> None:
        """Aguarda o pop-up sumir; se continuar aberto apos o prazo, sinaliza timeout de gravacao."""
        if not selector:
            return
        limite = time.time() + self.config.save_confirm_timeout_seconds
        while time.time() < limite:
            if not self._has_visible(selector):
                return
            time.sleep(0.5)
        raise SaveConfirmationTimeout(
            f"iFut nao confirmou a {operacao} em {self.config.save_confirm_timeout_seconds:.0f}s "
            "(pop-up permaneceu aberto)."
        )

    def update_all_teams_athlete_counts(self) -> None:
        self.logger.info("[PLANILHA] Iniciando rotina independente de atualizacao de quantidade de atletas")
        for mapped_team_name in self.config.team_urls:
            team_name = mapped_team_name.strip()
            self.logger.info("[PLANILHA] Lendo total de atletas do time '%s' no iFut...", team_name)
            try:
                self.open_team_page(team_name)
                self._open_roster_section()
                total_athletes = self._extract_total_athletes()
                if total_athletes is None:
                    self.logger.warning("[PLANILHA] Nao foi possivel obter total de atletas do time '%s'", team_name)
                    continue
                self._update_spreadsheet_entry(
                    TeamSpreadsheetUpdate(team_name=team_name, total_athletes=total_athletes)
                )
            except Exception as exc:
                self.logger.exception(
                    "[PLANILHA] Falha ao atualizar quantidade do time '%s' na rotina independente: %s",
                    team_name,
                    exc,
                )
        self.logger.info("[PLANILHA] Rotina independente de atualizacao de quantidade de atletas finalizada")

    def _open_roster_section(self) -> None:
        tab_selector = self.selectors.get_optional("team", "roster_tab")
        if tab_selector:
            self._click(tab_selector)
        self.wait.until(ec.presence_of_element_located(self._locator(self.selectors.get("team", "roster_ready"))))

    def _execute_record(self, record: Record) -> str:
        action = record.normalized_action
        if action == "inclusao":
            return self._include_person(record)
        if action == "remocao":
            self._remove_person(record)
            return "Remocao executada"
        if action == "portabilidade":
            self._port_person(record)
            return "Portabilidade executada"
        raise ValueError(f"Acao nao suportada: {record.action}")

    def _include_person(self, record: Record) -> str:
        self._open_include_context(record)
        include_selector = (
            self.selectors.get_optional("actions", "commission_include_button")
            if record.is_commission
            else None
        ) or self.selectors.get("actions", "include_button")
        self._click(include_selector)
        dialog_selector = self.selectors.get_optional("messages", "include_dialog")
        if record.is_commission and dialog_selector:
            self._wait_for_include_dialog_or_fail()
        elif record.is_commission:
            time.sleep(self.config.portability_popup_wait_seconds)
        self._fill_person_form(record)
        if self.config.dry_run:
            self.logger.info("DRY RUN ativo: formulario preenchido, sem clicar em salvar.")
            self._restore_default_team_tab(record)
            return "Formulario preenchido em DRY RUN"
        self._click(self.selectors.get("actions", "save_button"))
        duplicate_message = self._wait_for_include_outcome()
        if duplicate_message:
            self.logger.error("Inclusao recusada para %s: %s", record.full_name, duplicate_message)
            self._close_include_popup()
            self._restore_default_team_tab(record)
            raise DuplicateAthleteError(duplicate_message)
        self.logger.info("Inclusao enviada com sucesso para %s", record.full_name)
        time.sleep(3)
        self._restore_default_team_tab(record)
        return "Inclusao enviada com sucesso"

    def _remove_person(self, record: Record) -> None:
        self._open_removal_context(record)
        row = self._find_person_row(record.full_name)
        time.sleep(self.config.removal_click_delay_seconds)
        try:
            self._click_child(row, self.selectors.get("actions", "remove_row_button"))
        except NoSuchElementException:
            delete_button = row.find_element(
                By.XPATH,
                ".//button[contains(@class, 'text-negative') or .//i[contains(@class, 'delete')]]",
            )
            self.driver.execute_script("arguments[0].click();", delete_button)
        confirm = self.selectors.get_optional("actions", "confirm_remove_button")
        if confirm:
            self.wait.until(ec.presence_of_element_located(self._locator(confirm)))
            time.sleep(self.config.removal_confirm_delay_seconds)
            self._validate_removal_confirmation(record)
            self._click(confirm)
            time.sleep(self.config.removal_confirm_delay_seconds)
            self._wait_dialog_closed(confirm, "remocao")
        self._restore_default_team_tab(record)

    def _port_person(self, record: Record) -> None:
        self._open_roster_section()
        self._click(self.selectors.get("actions", "portability_button"))
        time.sleep(self.config.portability_popup_wait_seconds)
        self._select_portability_source_championship(record)
        match = self._find_portability_checkbox(record.full_name)
        if not match.matched or match.checkbox is None:
            self._close_portability_popup()
            raise PortabilityMatchError(
                f"Atleta nao encontrado na lista de portabilidade: {record.full_name}. "
                f"Nome mais proximo encontrado: {match.label or 'NENHUM'}. "
                f"Similaridade: {match.score:.2f}. "
                f"Limiar minimo: {match.threshold:.2f}."
            )
        self.driver.execute_script("arguments[0].click();", match.checkbox)
        if self.config.dry_run:
            self.logger.info(
                "DRY RUN ativo: atleta marcado para portabilidade (%s, score=%.2f), sem clicar em inscrever.",
                match.label,
                match.score,
            )
            self._close_portability_popup()
            return
        self._click(self.selectors.get("actions", "portability_submit_button"))
        time.sleep(2)
        self._wait_dialog_closed(self.selectors.get_optional("actions", "portability_submit_button"), "portabilidade")

    def _select_portability_source_championship(self, record: Record) -> None:
        championship_name = record.previous_competition or self.config.portability_source_championship
        self._click(self.selectors.get("actions", "portability_championship_select"))
        option_xpath = self.selectors.get("actions", "portability_championship_option").format(championship_name=championship_name)
        time.sleep(self.config.portability_popup_wait_seconds)
        self._click(option_xpath)
        time.sleep(self.config.portability_popup_wait_seconds)
        self.wait.until(ec.presence_of_element_located(self._locator(self.selectors.get("actions", "portability_player_checkbox"))))

    def _find_portability_checkbox(self, full_name: str) -> PortabilityMatch:
        from difflib import SequenceMatcher

        normalized_target = normalize_text(full_name)
        target_tokens = text_tokens(full_name)
        target_tokens_all = text_tokens_all(full_name)
        threshold = 0.88
        relaxed_threshold = 0.58

        checkboxes = self.driver.find_elements(*self._locator(self.selectors.get("actions", "portability_player_checkbox")))
        best_match = None
        best_label = ""
        best_score = 0.0

        for checkbox in checkboxes:
            label = checkbox.get_attribute("aria-label") or checkbox.text
            normalized_label = normalize_text(label)

            if normalized_target == normalized_label:
                return PortabilityMatch(checkbox, label, 1.0, threshold, True)

            candidate_tokens = text_tokens(label)
            candidate_tokens_all = text_tokens_all(label)
            token_score = token_overlap_score(target_tokens, candidate_tokens)
            token_score_all = token_overlap_score(target_tokens_all, candidate_tokens_all)
            containment_score = token_containment_score(target_tokens_all, candidate_tokens_all)
            similarity_score = token_similarity_score(target_tokens_all, candidate_tokens_all)
            sequence_score = SequenceMatcher(None, normalized_target, normalized_label).ratio()
            combined_score = (token_score * 0.25) + (token_score_all * 0.15) + (containment_score * 0.15) + (similarity_score * 0.20) + (sequence_score * 0.25)

            self.logger.debug(
                "Portabilidade: %s vs %s | token=%.2f seq=%.2f combined=%.2f",
                full_name,
                label,
                token_score,
                sequence_score,
                combined_score,
            )

            if combined_score > best_score:
                best_score = combined_score
                best_match = checkbox
                best_label = label

        if best_score >= threshold or (best_score >= relaxed_threshold and self._looks_like_particle_only_difference(normalized_target, normalize_text(best_label))):
            self.logger.info(
                "Portabilidade: Atleta encontrado com fuzzy matching (score=%.2f): %s",
                best_score,
                full_name,
            )
            return PortabilityMatch(best_match, best_label, best_score, threshold, True)

        if best_label:
            return PortabilityMatch(None, best_label, best_score, threshold, False)

        return PortabilityMatch(None, "", 0.0, threshold, False)

    def _looks_like_particle_only_difference(self, normalized_target: str, normalized_candidate: str) -> bool:
        from difflib import SequenceMatcher

        target_tokens = [token for token in normalized_target.split() if token]
        candidate_tokens = [token for token in normalized_candidate.split() if token]
        particles = {"da", "de", "do", "das", "dos", "e", "a", "o", "em"}
        target_core = [token for token in target_tokens if token not in particles]
        candidate_core = [token for token in candidate_tokens if token not in particles]
        if target_core == candidate_core:
            return True
        if len(target_core) != len(candidate_core):
            return False
        differences = 0
        for target_token, candidate_token in zip(target_core, candidate_core):
            if target_token == candidate_token:
                continue
            if SequenceMatcher(None, target_token, candidate_token).ratio() >= 0.8:
                differences += 1
            else:
                return False
        return differences <= 1 and abs(len(target_tokens) - len(candidate_tokens)) <= 2

    def _validate_removal_confirmation(self, record: Record) -> None:
        try:
            confirmation_msg = self.driver.find_element(
                By.XPATH,
                ".//div[contains(@class, 'q-dialog__message')]"
            )
            dialog_text = confirmation_msg.text.strip()
            
            extracted_name = self._extract_name_from_removal_dialog(dialog_text)
            
            if not extracted_name or not self._names_match(record.full_name, extracted_name):
                self.logger.error(
                    "Nome no popup de confirmacao nao bate: esperado '%s', encontrado '%s'",
                    record.full_name,
                    extracted_name or "NENHUM"
                )
                deny_button = self.driver.find_element(
                    By.XPATH,
                    ".//button[contains(., 'Eita, não')]"
                )
                self.driver.execute_script("arguments[0].click();", deny_button)
                raise RemovalValidationError(
                    f"Nome do registro ({record.full_name}) nao encontrado no popup de confirmacao. "
                    f"Remocao foi cancelada por seguranca."
                )
            
            self.logger.info("Confirmacao de remocao validada: '%s'", extracted_name)
        except NoSuchElementException:
            self.logger.warning("Nao foi possivel validar popup de confirmacao de remocao")

    def _extract_name_from_removal_dialog(self, dialog_text: str) -> str:
        import re
        match = re.search(r"excluir o atleta\s+(.+?)\s+desse", dialog_text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return ""

    def _names_match(self, name1: str, name2: str, threshold: float = 0.85) -> bool:
        from difflib import SequenceMatcher
        normalized1 = self._normalize_name(name1)
        normalized2 = self._normalize_name(name2)
        
        if normalized1 == normalized2:
            return True
        
        similarity = SequenceMatcher(None, normalized1, normalized2).ratio()
        return similarity >= threshold

    def _normalize_name(self, name: str) -> str:
        import unicodedata
        name = name.strip().lower()
        name = unicodedata.normalize('NFKD', name)
        name = name.encode('ascii', 'ignore').decode('ascii')
        return ' '.join(name.split())

    def _close_portability_popup(self) -> None:
        cancel_selector = self.selectors.get_optional("actions", "portability_cancel_button")
        if cancel_selector:
            time.sleep(self.config.portability_cancel_delay_seconds)
            self._click(cancel_selector)
            time.sleep(self.config.portability_cancel_delay_seconds)
            checkbox_selector = self.selectors.get_optional("actions", "portability_player_checkbox")
            if checkbox_selector:
                try:
                    self.wait.until(ec.invisibility_of_element_located(self._locator(checkbox_selector)))
                except TimeoutException:
                    self.logger.warning("Pop-up de portabilidade permaneceu aberto apos clicar em Cancelar.")

    def _select_person_type(self, record: Record) -> None:
        type_selector = self.selectors.get_optional("actions", "person_type_select")
        if not type_selector:
            return
        self._click(type_selector)
        option_key = "commission_type_option" if "comissao tecnica" in record.normalized_person_type else "athlete_type_option"
        self._click(self.selectors.get("actions", option_key))

    def _open_include_context(self, record: Record) -> None:
        if not record.is_commission:
            return
        commission_tab_selector = self.selectors.get_optional("team", "commission_tab")
        if commission_tab_selector:
            self._click(commission_tab_selector)
            time.sleep(self.config.portability_popup_wait_seconds)
            team_ready = self.selectors.get_optional("team", "commission_ready") or self.selectors.get("team", "roster_ready")
            self.wait.until(ec.presence_of_element_located(self._locator(team_ready)))

    def _restore_default_team_tab(self, record: Record) -> None:
        if not record.is_commission:
            return
        self._open_roster_section()

    def _open_removal_context(self, record: Record) -> None:
        if not record.is_commission:
            self._open_roster_section()
            return
        commission_tab_selector = self.selectors.get_optional("team", "commission_tab")
        if commission_tab_selector:
            self._click(commission_tab_selector)
            time.sleep(self.config.portability_popup_wait_seconds)
            team_ready = self.selectors.get_optional("team", "commission_ready") or self.selectors.get("team", "roster_ready")
            self.wait.until(ec.presence_of_element_located(self._locator(team_ready)))

    def _fill_person_form(self, record: Record) -> None:
        image_path = Path("perfil-foto-default.png")
        upload_selector = self.selectors.get_optional("form", "image_input")
        if upload_selector and image_path.exists():
            input_element = self.wait.until(ec.presence_of_element_located(self._locator(upload_selector)))
            input_element.send_keys(str(image_path.resolve()))
            time.sleep(1)
        self._fill(self.selectors.get("form", "full_name_input"), record.full_name)
        if record.requires_identity:
            self._fill(self.selectors.get("form", "birthdate_input"), record.birthdate)
            self._fill(self.selectors.get("form", "cpf_input"), record.cpf)
        if record.is_commission:
            role_selector = self.selectors.get_optional("form", "role_input")
            role_option_selector = self.selectors.get_optional("form", "role_default_option")
            if role_selector and role_option_selector:
                self.logger.info("Clicando em Posição")
                self._click(role_selector)
                time.sleep(0.8)
                self.logger.info("Clicando na opção Treinador")
                self._click(role_option_selector)
                self.logger.info("Aguardando 3 segundos para estabilizar o combobox...")
                time.sleep(3.0)
            document_selector = self.selectors.get_optional("form", "commission_document_input")
            if document_selector and record.cpf and normalize_text(record.cpf) != "nao necessario":
                self._fill(document_selector, record.cpf)

    def _find_duplicate_message(self) -> str | None:
        duplicate_selector = self.selectors.get_optional("messages", "duplicate_rg_card")
        if not duplicate_selector:
            return None
        elements = self.driver.find_elements(*self._locator(duplicate_selector))
        for element in elements:
            text = element.text.strip()
            if text:
                return " ".join(text.split())
        return None

    def _wait_for_include_outcome(self) -> str | None:
        dialog_selector = self.selectors.get_optional("messages", "include_dialog")
        end_time = time.time() + max(self.config.timeout, self.config.save_confirm_timeout_seconds)
        while time.time() < end_time:
            duplicate_message = self._find_duplicate_message()
            if duplicate_message:
                return duplicate_message

            if dialog_selector:
                if not self._has_visible(dialog_selector):
                    return None
            time.sleep(0.3)
        duplicate_message = self._find_duplicate_message()
        if duplicate_message:
            return duplicate_message
        if dialog_selector:
            # Antes o timeout era tratado como sucesso mesmo com o pop-up aberto.
            raise SaveConfirmationTimeout(
                f"iFut nao confirmou a inclusao em {self.config.save_confirm_timeout_seconds:.0f}s "
                "(pop-up de cadastro permaneceu aberto apos Salvar)."
            )
        return None

    def _close_include_popup(self) -> None:
        cancel_selector = self.selectors.get_optional("actions", "cancel_button")
        if not cancel_selector:
            return
        try:
            self._click(cancel_selector)
            dialog_selector = self.selectors.get_optional("messages", "include_dialog")
            if dialog_selector:
                self.wait.until(ec.invisibility_of_element_located(self._locator(dialog_selector)))
            else:
                time.sleep(1)
            self._open_roster_section()
        except Exception:
            self.logger.warning("Nao foi possivel fechar o pop-up de inclusao apos duplicidade.")

    def _wait_for_include_dialog_or_fail(self) -> None:
        dialog_selector = self.selectors.get_optional("messages", "include_dialog")
        if not dialog_selector:
            time.sleep(self.config.portability_popup_wait_seconds)
            return

        end_time = time.time() + self.config.timeout
        while time.time() < end_time:
            dialogs = self.driver.find_elements(*self._locator(dialog_selector))
            if dialogs:
                return
            current_url = self.driver.current_url
            if "/atletas/" in current_url:
                raise RuntimeError(
                    "Fluxo de inclusao de comissao saiu do modal e navegou para a tela de detalhe do atleta/comissao."
                )
            time.sleep(0.2)

        raise TimeoutException("Modal de inclusao nao apareceu apos clicar em Adicionar comissao.")

    def _build_record_result(self, record: Record, status: str, message: str) -> RecordResult:
        return RecordResult(
            index=record.index,
            action=record.action,
            person_type=record.person_type,
            full_name=record.full_name,
            birthdate=record.birthdate,
            cpf=record.cpf,
            status=status,
            message=message,
        )

    def _team_link_for_request(self, request: RequestFile) -> str:
        team_key = normalize_text(request.team_name)
        direct_url = self.config.team_urls.get(team_key)
        if direct_url:
            match = re.search(r"/campeonatos/(\d+)/time/(\d+)", direct_url)
            if match:
                team_id = match.group(2)
                if self.config.championship_public_id and self.config.championship_public_slug:
                    return f"https://campeonato.ifut.com.br/c/{self.config.championship_public_id}-{self.config.championship_public_slug}/time/{team_id}"
                else:
                    public_slug = normalize_text(request.competition_name).replace(" ", "-")
                    return f"https://campeonato.ifut.com.br/c/{self.config.championship_public_id}-{public_slug}/time/{team_id}"
            return direct_url
        return self.config.championship_url.rstrip("/")

    def _write_result_file(self, request: RequestFile, results: list[RecordResult]) -> None:
        self.config.results_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        result_name = f"{Path(request.source_name).stem}-resultado-{timestamp}.txt"
        result_path = self.config.results_dir / result_name
        inclusions = [
            result
            for result in results
            if result.status == "SUCESSO"
            and normalize_text(result.action) in {"inclusao", "portabilidade"}
        ]
        lines = [
            self.config.associacao,
            "RESULTADO DO PROCESSAMENTO - INSCRICAO, REMOCAO E PORTABILIDADE",
            "",
            f"PROTOCOLO: {request.protocol}",
            f"COMPETICAO: {request.competition_name}",
            f"EQUIPE: {request.team_name}",
            f"QUANTIDADE DE ATLETAS INSCRITOS: {len(inclusions)}",
        ]
        if inclusions:
            lines.extend(["ATLETAS INSCRITOS", "-----------------"])
            for result in inclusions:
                lines.append(f"- {result.full_name}")
        lines.extend(["", "RESULTADOS", "----------", ""])
        for result in results:
            lines.extend(
                [
                    f"REGISTRO {result.index:02d}",
                    f"ACAO: {result.action}",
                    f"TIPO: {result.person_type}",
                    f"NOME COMPLETO: {result.full_name}",
                    f"DATA DE NASCIMENTO: {result.birthdate}",
                    f"CPF: {result.cpf}",
                    f"STATUS: {result.status}",
                    f"MENSAGEM: {result.message}",
                    "",
                ]
            )
        lines.append("")
        lines.append("----------------------------------------")
        lines.append("IMPORTANTE:")
        lines.append("Representante da equipe, confira no aplicativo se as informacoes cadastradas estao corretas.")
        lines.append(f"Link do time para conferencia: {self._team_link_for_request(request)}")
        lines.append(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        result_path.write_text("\n".join(lines), encoding="utf-8")
        self.last_result_files = [result_path]
        pdf_path = self._write_result_pdf(result_path)
        if pdf_path:
            self.last_result_files.append(pdf_path)

    def _write_result_pdf(self, result_path: Path) -> Path | None:
        """Gera o PDF do resultado. Falha aqui nao invalida o processamento:
        o TXT ja esta gravado e e ele que alimenta o restante do fluxo."""
        try:
            import resultado_pdf

            return resultado_pdf.gerar_pdf_resultado(result_path, logger=self.logger)
        except Exception as exc:
            self.logger.warning("[PDF] Nao foi possivel gerar o PDF do resultado (%s): %s",
                                result_path.name, exc)
            return None

    def _extract_total_athletes(self) -> int | None:
        """Extrai o total de atletas da página."""
        try:
           self.logger.debug("[PLANILHA] Procurando elemento com total de atletas...")
           element = self.driver.find_element(By.XPATH, "//div[contains(@class, 'text-h5')]")
           text = element.text
           match = re.search(r'Total de atletas:\s*(\d+)', text)
           if match:
               total = int(match.group(1))
               self.logger.info("[PLANILHA] Total de atletas extraido: %d", total)
               return total
           self.logger.warning("[PLANILHA] Formato de total de atletas nao reconhecido: %s", text)
        except Exception as exc:
           self.logger.warning("[PLANILHA] Nao foi possivel extrair total de atletas: %s", exc)
        return None

    def _find_team_row_in_sheet(self, worksheet, team_name: str) -> tuple[int | None, str | None]:
        normalized_team = normalize_text(team_name)
        search_tokens = [token for token in normalized_team.split() if token]
        best_contains_row = None
        best_contains_value = None

        for idx, row in enumerate(worksheet.iter_rows(values_only=False), 1):
           cell_value = row[0].value
           if not cell_value:
               continue

           normalized_cell = normalize_text(str(cell_value))
           if not normalized_cell:
               continue

           if normalized_cell == normalized_team:
               return idx, str(cell_value)

           if normalized_team in normalized_cell or normalized_cell in normalized_team:
               if best_contains_row is None:
                   best_contains_row = idx
                   best_contains_value = str(cell_value)
               continue

           cell_tokens = [token for token in normalized_cell.split() if token]
           if search_tokens and all(token in cell_tokens for token in search_tokens):
               if best_contains_row is None:
                   best_contains_row = idx
                   best_contains_value = str(cell_value)

        return best_contains_row, best_contains_value

    def _update_spreadsheet_entry(self, entry: TeamSpreadsheetUpdate) -> None:
        """Atualiza uma linha da planilha de controle."""
        if not self.config.sheets_update_enabled or not self.config.spreadsheet_id:
           self.logger.info("[PLANILHA] Atualizacao de planilha desabilitada no config.ini")
           return

        try:
           import tempfile
           from openpyxl import load_workbook

           self.logger.info("[PLANILHA] Conectando ao Google Drive...")
           drive_service = build("drive", "v3",
                                 credentials=drive_auth.credenciais_por_arquivo(self.config.path, self.logger))

           self.logger.info("[PLANILHA] Baixando arquivo: %s", self.config.spreadsheet_id)
           file_id = self.config.spreadsheet_id
           request_obj = drive_service.files().get_media(fileId=file_id)

           with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
               tmp_path = Path(tmp.name)
               downloader = MediaIoBaseDownload(tmp, request_obj)
               done = False
               while not done:
                   _, done = downloader.next_chunk()
           self.logger.info("[PLANILHA] Arquivo baixado: %s", tmp_path)

           self.logger.info("[PLANILHA] Abrindo workbook...")
           wb = load_workbook(tmp_path)
           ws = wb.active

           team_row, matched_team_name = self._find_team_row_in_sheet(ws, entry.team_name)

           if team_row is None:
               self.logger.warning("[PLANILHA] Time '%s' nao encontrado na planilha", entry.team_name)
               tmp_path.unlink(missing_ok=True)
               return

           self.logger.info(
               "[PLANILHA] Time '%s' encontrado na linha %d da planilha como '%s'",
               entry.team_name,
               team_row,
               matched_team_name,
           )
           self.logger.info("[PLANILHA] Atualizando coluna C (QTDA JOGADORES) = %d", entry.total_athletes)
           ws[f"C{team_row}"].value = entry.total_athletes

           if entry.pix_receipt_url:
               self.logger.info("[PLANILHA] Adicionando comprovante PIX na coluna J")
               current_cell = ws[f"J{team_row}"]
               current_value = str(current_cell.value) if current_cell.value else ""
               if current_value and current_value.strip():
                   new_value = f"{current_value}\n{entry.pix_receipt_url}"
                   self.logger.info("[PLANILHA] Comprovante PIX adicionado ao historico existente")
               else:
                   new_value = entry.pix_receipt_url
                   self.logger.info("[PLANILHA] Novo comprovante PIX registrado")
               current_cell.value = new_value
           else:
               self.logger.info("[PLANILHA] Nenhum comprovante PIX para adicionar")

           self.logger.info("[PLANILHA] Salvando workbook em arquivo temporario...")
           wb.save(tmp_path)

           self.logger.info("[PLANILHA] Enviando arquivo de volta para o Drive...")
           drive_service.files().update(
               fileId=file_id,
               media_body=MediaFileUpload(str(tmp_path), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
           ).execute()

           tmp_path.unlink(missing_ok=True)
           self.logger.info(
               "[PLANILHA] SUCESSO - Planilha atualizada: time='%s' linha=%d atletas=%d",
               entry.team_name,
               team_row,
               entry.total_athletes,
           )

        except FileNotFoundError as exc:
           self.logger.error("[PLANILHA] Erro: Arquivo de servico ou arquivo temporario nao encontrado: %s", exc)
        except Exception as exc:
           self.logger.error("[PLANILHA] Erro ao atualizar planilha (nao afeta o resultado geral): %s", exc)
           self.logger.exception("[PLANILHA] Stack trace:")

    def _update_spreadsheet(self, request: RequestFile) -> None:
        """Atualiza a planilha de controle com dados do processamento.
         
        Esta é uma etapa adicional que NÃO afeta o sucesso geral da automação.
        Erros na atualização são registrados mas não interrompem o fluxo.
        """
        self.logger.info("[PLANILHA] Iniciando atualização da planilha de controle...")
        total_athletes = self._extract_total_athletes()
        if total_athletes is None:
           self.logger.warning("[PLANILHA] Nao foi possivel extrair quantidade de atletas. Abortando atualizar.")
           return
        self._update_spreadsheet_entry(
           TeamSpreadsheetUpdate(
               team_name=request.team_name,
               total_athletes=total_athletes,
               pix_receipt_url=request.pix_receipt_url,
           )
        )

    def _find_person_row(self, full_name: str) -> WebElement:
        rows = self.driver.find_elements(*self._locator(self.selectors.get("team", "roster_row")))
        normalized_name = normalize_text(full_name)
        search_tokens = [token for token in normalized_name.split() if token]
        search_key = " ".join(search_tokens[:2]) if len(search_tokens) >= 2 else normalized_name
        
        # 1. Busca exata ou por chave (primeiros 2 nomes)
        for row in rows:
            row_text = normalize_text(row.text)
            if normalized_name in row_text:
                return row
            if search_key and search_key in row_text:
                return row

        # 2. Busca por similaridade/fuzzy em cada card
        best_row = None
        best_score = 0.0
        for row in rows:
            row_text = normalize_text(row.text)
            score = self._row_match_score(row_text, normalized_name)
            if score > best_score:
                best_score = score
                best_row = row

        if best_row and best_score >= 0.85:
            self.logger.info("Atleta '%s' localizado na lista por similaridade (score=%.2f)", full_name, best_score)
            return best_row

        raise LookupError(f"Pessoa nao encontrada na lista do time: {full_name}")

    def _row_match_score(self, row_text: str, normalized_name: str) -> float:
        from difflib import SequenceMatcher

        # O card do iFut contém nome, idade, data de nascimento, RG, botões ("sports", "delete", etc.)
        # Extrai a linha principal ou tokens do card
        row_first_line = normalize_text(row_text.split("\n")[0] if "\n" in row_text else row_text)
        
        # Similaridade direta com o início do texto do card
        ratio_first = SequenceMatcher(None, normalized_name, row_first_line[:len(normalized_name) + 10]).ratio()
        if ratio_first >= 0.85:
            return ratio_first

        # Similaridade por tokens do nome vs tokens do card
        name_tokens = [t for t in normalized_name.split() if t not in {"da", "de", "do", "das", "dos", "e"}]
        row_tokens = set(normalize_text(row_text).split())
        if not name_tokens:
            return 0.0

        matches = sum(1 for t in name_tokens if t in row_tokens or any(SequenceMatcher(None, t, rt).ratio() >= 0.85 for rt in row_tokens))
        token_ratio = matches / len(name_tokens)

        return max(ratio_first, token_ratio if matches >= 2 else 0.0)

    def _row_matches_name(self, row_text: str, normalized_name: str) -> bool:
        return self._row_match_score(row_text, normalized_name) >= 0.85

    def _fill(self, selector: str, value: str, clear: bool = True) -> None:
        element = self._wait_for_any_selector(selector)
        if clear:
            element.clear()
        element.send_keys(value)

    def _click(self, selector: str) -> None:
        self._guard_against_modal_context_leak(selector)
        element = self.wait.until(ec.element_to_be_clickable(self._locator(selector)))
        self.driver.execute_script("arguments[0].click();", element)

    def _click_child(self, parent: WebElement, selector: str) -> None:
        self._guard_against_modal_context_leak(selector)
        by, value = self._locator(selector)
        child = parent.find_element(by, value)
        self.driver.execute_script("arguments[0].click();", child)

    def _locator(self, selector: str) -> tuple[str, str]:
        if "=" not in selector:
            raise ValueError(f"Seletor invalido: {selector}")
        strategy, value = selector.split("=", 1)
        strategy = strategy.strip().lower()
        value = value.strip()
        mapping = {
            "css": By.CSS_SELECTOR,
            "xpath": By.XPATH,
            "id": By.ID,
            "name": By.NAME,
        }
        if strategy not in mapping:
            raise ValueError(f"Estrategia de seletor nao suportada: {strategy}")
        return mapping[strategy], value

    def _wait_for_any_selector(self, selector: str) -> WebElement:
        selector_parts = [part.strip() for part in selector.split("||") if part.strip()]
        if len(selector_parts) <= 1:
            return self.wait.until(ec.presence_of_element_located(self._locator(selector)))

        end_time = time.time() + self.config.timeout
        last_error: Exception | None = None
        while time.time() < end_time:
            for selector_part in selector_parts:
                try:
                    element = self.driver.find_element(*self._locator(selector_part))
                    if element:
                        return element
                except Exception as exc:
                    last_error = exc
            time.sleep(0.2)

        raise TimeoutException(f"Nenhum seletor encontrado: {selector}") from last_error

    def _guard_against_modal_context_leak(self, selector: str) -> None:
        dialog_selector = self.selectors.get_optional("messages", "include_dialog")
        if not dialog_selector:
            return
        dialogs = self.driver.find_elements(*self._locator(dialog_selector))
        if not dialogs:
            return
        safe_markers = ("cancelar", "salvar", "nome", "posição", "posicao", "documento", "rg", "escolher imagem")
        blocked_markers = ("adicionar", "importar", "remove", "elenco", "comissão", "comissao")
        selector_text = selector.lower()
        if any(marker in selector_text for marker in safe_markers):
            return
        if any(marker in selector_text for marker in blocked_markers):
            raise RuntimeError("Tentativa de clicar fora do modal enquanto o pop-up de inclusao ainda esta aberto.")


def configure_logging(log_path: Path) -> logging.Logger:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("ifut_bot")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    return logger


def move_file(source: Path, destination_dir: Path) -> None:
    destination_dir.mkdir(parents=True, exist_ok=True)
    target = destination_dir / source.name
    if target.exists():
        target.unlink()
    source.replace(target)


def iter_txt_files(directory: Path) -> Iterable[Path]:
    return sorted(path for path in directory.glob("*.txt") if path.is_file())


def write_default_config() -> None:
    if not DEFAULT_CONFIG_PATH.exists():
        DEFAULT_CONFIG_PATH.write_text(
            """[ifut]
username = seu_email@ifut.com
password = sua_senha
login_url = https://admin.ifut.com.br/login
championship_url = https://admin.ifut.com.br/campeonatos/131038
teams_url = https://admin.ifut.com.br/campeonatos/131038/times
 
[drive]
folder_embed_url = https://drive.google.com/embeddedfolderview?id=10hhnvDF_J7C0LE5JU9BrPST9D8Rf9qk1#list
download_dir = downloads\\inscricoes
processed_dir = downloads\\inscricoes\\processados
failed_dir = downloads\\inscricoes\\falhas
results_dir = downloads\\inscricoes\\resultados
 
[selenium]
headless = false
timeout_seconds = 20
 
[app]
log_path = logs\\ifut.log
pause_after_action = true
dry_run = true
 
[sheets]
spreadsheet_id = 16Tt-7abmpY2CKtY4TQUrqzkFl9T48MFa
update_enabled = false
""",
            encoding="utf-8",
        )

    if not DEFAULT_SELECTORS_PATH.exists():
        DEFAULT_SELECTORS_PATH.write_text(
            """[login]
username_input = css=input[type='email']
password_input = css=input[type='password']
submit_button = css=button[type='submit']

[teams]
page_ready = css=body
search_input =
team_card = xpath=//a[contains(@href, '/campeonatos/131038/time/') or contains(@href, '/time/')]

[team]
roster_tab =
roster_ready = css=body
roster_row = xpath=//*[self::tr or self::div][contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'atleta') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'comissao')]

[actions]
include_button =
portability_button =
person_type_select =
athlete_type_option =
commission_type_option =
search_person_input =
search_person_button =
select_first_search_result =
save_button =
remove_row_button =
confirm_remove_button =

[form]
full_name_input =
birthdate_input =
cpf_input =
role_input =
""",
            encoding="utf-8",
        )


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Automacao iFut para inclusao, remocao e portabilidade")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Arquivo INI de configuracao")
    parser.add_argument("--selectors", default=str(DEFAULT_SELECTORS_PATH), help="Arquivo INI de seletores Selenium")
    parser.add_argument("--sync-drive-only", action="store_true", help="Baixa os TXTs do Google Drive e encerra")
    parser.add_argument("--process-local-only", action="store_true", help="Processa somente os TXTs locais ja baixados")
    parser.add_argument("--login-only", action="store_true", help="Abre o iFut e para logo apos o login")
    parser.add_argument(
        "--update-all-team-counts",
        action="store_true",
        help="Atualiza somente a quantidade de atletas de todos os times configurados na planilha",
    )
    parser.add_argument(
        "--analisar-sumulas",
        action="store_true",
        help="Baixa as sumulas digitais do Drive e gera o rascunho das notas oficiais disciplinares",
    )
    parser.add_argument(
        "--ia",
        action="store_true",
        help="Com --analisar-sumulas: gera a nota com IA (Gemini/OpenAI) em vez das regras fixas",
    )
    parser.add_argument(
        "--gerar-pdf-nota",
        metavar="ALVO",
        help="Regera o PDF de uma nota oficial a partir do TXT: caminho do TXT, numero da nota (ex.: 4) "
             "ou protocolo da sumula (SUM-...)",
    )
    parser.add_argument(
        "--gerar-pdf-regulamento",
        metavar="ARQUIVO",
        help="Gera o PDF do regulamento (layout AEUV, com assinatura do Presidente) a partir do arquivo texto, "
             "ex.: regulamento-7-super-liga-união-2026.txt (procurado tambem na pasta regulamento)",
    )
    parser.add_argument(
        "--gerar-pdf-forma-disputa",
        metavar="ARQUIVO",
        help="Gera o PDF da Forma de Disputa (layout AEUV com tabelas formatadas e assinatura) a partir do arquivo "
             "texto/markdown na pasta formadisputa (ex.: forma-disputa-7-super-liga-união-2026-3-rodadas)",
    )
    oficio = parser.add_mutually_exclusive_group()
    oficio.add_argument(
        "--criar-modelo-oficio", metavar="TXT",
        help="Cria uma cópia editável do modelo de requerimento à Futel, sem sobrescrever um TXT existente",
    )
    oficio.add_argument(
        "--gerar-pdf-oficio", metavar="TXT",
        help="Gera o PDF AEUV do requerimento à Futel e relatório de pendências a partir do TXT editável",
    )
    parser.add_argument(
        "--oficio-final", action="store_true",
        help="Compatibilidade com comandos antigos: o PDF de ofício já é sempre final e assinado",
    )
    parser.add_argument(
        "--gerar-pdf-financeiro",
        metavar="TIPO_OU_JSON",
        nargs="?",
        const="geral",
        help="Gera o PDF de Prestacao de Contas no padrao AEUV lendo a planilha 'AEUV - Financeiro' do Drive. "
             "TIPO: geral (padrao), emenda (use --emenda) ou competicao (use --origem). "
             "Tambem aceita o caminho de um JSON de lancamentos ou 'exemplo' para demonstrativos modelo",
    )
    parser.add_argument(
        "--origem",
        metavar="COMPETICAO",
        help="Competicao/origem do relatorio financeiro por competicao (ex.: \"SUPER LIGA UNIÃO\")",
    )
    parser.add_argument(
        "--emenda",
        metavar="NUMERO",
        help="Numero da emenda / termo de fomento do relatorio financeiro (ex.: \"Emenda 042/2026\")",
    )
    parser.add_argument(
        "--periodo",
        metavar="PERIODO",
        help="Filtro rapido de periodo para o relatorio financeiro: 3m (3 meses), 6m (6 meses), anual (ano vigente)",
    )
    parser.add_argument(
        "--data-inicio",
        metavar="DD/MM/AAAA",
        help="Data inicial para o relatorio financeiro (ex.: 01/01/2026 ou 2026-01-01)",
    )
    parser.add_argument(
        "--data-fim",
        metavar="DD/MM/AAAA",
        help="Data final para o relatorio financeiro (ex.: 31/03/2026 ou 2026-03-31)",
    )
    parser.add_argument(
        "--atualizar-controle-punicoes",
        action="store_true",
        help="Refaz o TXT de controle de punicoes da associacao a partir de todas as notas oficiais",
    )
    parser.add_argument(
        "--publicar-drive",
        action="store_true",
        help="Publica no Drive os PDFs de regulamento e forma de disputa e as notas oficiais "
             "ja finalizadas (TXT + PDF), para consulta no sistema interno",
    )
    return parser


def main() -> int:
    write_default_config()
    parser = build_argument_parser()
    args = parser.parse_args()
    if args.oficio_final and not args.gerar_pdf_oficio:
        parser.error("--oficio-final exige --gerar-pdf-oficio")
    if args.criar_modelo_oficio or args.gerar_pdf_oficio:
        from nota_pdf import ConfigPdf
        from oficio_pdf import criar_modelo_oficio, gerar_pdf_oficio

        logger = configure_logging(DEFAULT_LOG_PATH)
        try:
            if args.criar_modelo_oficio:
                modelo = criar_modelo_oficio(args.criar_modelo_oficio)
                logger.info("[OFICIO] Modelo editável criado em %s", modelo)
            else:
                gerar_pdf_oficio(args.gerar_pdf_oficio, ConfigPdf.carregar(Path(args.config)),
                                 logger=logger, exigir_final=args.oficio_final)
        except (ValueError, OSError) as exc:
            logger.error("[OFICIO] %s", exc)
            return 1
        return 0
    if args.publicar_drive:
        import publicacao_drive

        config = AppConfig(Path(args.config))
        logger = configure_logging(config.log_path)
        regulamentos, formas, notas = publicacao_drive.publicar_tudo(Path(args.config), logger)
        logger.info("Publicados no Drive: %s regulamento(s), %s forma(s) de disputa e %s arquivo(s) "
                    "de nota oficial", regulamentos, formas, notas)
        return 0
    if args.atualizar_controle_punicoes:
        from controle_punicoes import reconstruir_controle

        config = AppConfig(Path(args.config))
        reconstruir_controle(Path(args.config), configure_logging(config.log_path))
        return 0
    if args.gerar_pdf_regulamento:
        from nota_pdf import ConfigPdf
        from regulamento_pdf import gerar_pdf_regulamento

        import publicacao_drive

        config = AppConfig(Path(args.config))
        logger = configure_logging(config.log_path)
        pdf = gerar_pdf_regulamento(args.gerar_pdf_regulamento, ConfigPdf.carregar(Path(args.config)), logger=logger)
        publicacao_drive.publicar_regulamento(pdf, Path(args.config), logger)
        return 0
    if args.gerar_pdf_forma_disputa:
        from forma_disputa_pdf import gerar_pdf_forma_disputa
        from nota_pdf import ConfigPdf

        import publicacao_drive

        config = AppConfig(Path(args.config))
        logger = configure_logging(config.log_path)
        pdf = gerar_pdf_forma_disputa(args.gerar_pdf_forma_disputa, ConfigPdf.carregar(Path(args.config)), logger=logger)
        publicacao_drive.publicar_forma_disputa(pdf, Path(args.config), logger)
        return 0
    if args.gerar_pdf_financeiro:
        from datetime import date, timedelta
        from financeiro_pdf import (
            gerar_pdf_financeiro,
            carregar_dados_exemplo,
            carregar_lancamentos_de_json,
            FiltroRelatorio,
            parse_data_flexivel,
        )
        from nota_pdf import ConfigPdf

        config = AppConfig(Path(args.config))
        logger = configure_logging(config.log_path)
        cfg_pdf = ConfigPdf.carregar(Path(args.config))
        alvo = args.gerar_pdf_financeiro.strip()
        tipo_alvo = alvo.lower()
        # Sem tipo explicito: --origem/--emenda definem o relatorio.
        if tipo_alvo == "geral" and args.origem:
            tipo_alvo = "competicao"
        elif tipo_alvo == "geral" and args.emenda:
            tipo_alvo = "emenda"

        # Determinacao de periodo e datas
        dt_ini_str = args.data_inicio.strip() if args.data_inicio else ""
        dt_fim_str = args.data_fim.strip() if args.data_fim else ""

        if args.periodo:
            p = args.periodo.strip().lower()
            hoje = date.today()
            if p in ("hoje", "today"):
                dt_ini_str = hoje.strftime("%d/%m/%Y")
                dt_fim_str = hoje.strftime("%d/%m/%Y")
            elif p in ("mes", "mes_atual", "mes-atual"):
                import calendar
                dt_ini_str = f"01/{hoje.month:02d}/{hoje.year}"
                ultimo_dia = calendar.monthrange(hoje.year, hoje.month)[1]
                dt_fim_str = f"{ultimo_dia:02d}/{hoje.month:02d}/{hoje.year}"
            elif p in ("3m", "3meses", "trimestre"):
                dt_ini_str = (hoje - timedelta(days=90)).strftime("%d/%m/%Y")
                dt_fim_str = hoje.strftime("%d/%m/%Y")
            elif p in ("6m", "6meses", "semestre"):
                dt_ini_str = (hoje - timedelta(days=180)).strftime("%d/%m/%Y")
                dt_fim_str = hoje.strftime("%d/%m/%Y")
            elif p in ("anual", "ano", "12m", "1ano"):
                dt_ini_str = f"01/01/{hoje.year}"
                dt_fim_str = f"31/12/{hoje.year}"

        if tipo_alvo == "exemplo":
            dados = carregar_dados_exemplo()
            gerar_pdf_financeiro(FiltroRelatorio("geral", periodo_inicio=dt_ini_str, periodo_fim=dt_fim_str), dados, cfg_pdf, logger=logger)
            gerar_pdf_financeiro(FiltroRelatorio("emenda", numero_emenda="Emenda 042/2026", periodo_inicio=dt_ini_str, periodo_fim=dt_fim_str), dados, cfg_pdf, logger=logger)
            gerar_pdf_financeiro(FiltroRelatorio("competicao", competicao="7ª Super Liga União 2026", periodo_inicio=dt_ini_str, periodo_fim=dt_fim_str), dados, cfg_pdf, logger=logger)
            logger.info("3 demonstrativos de prestacao de contas gerados em downloads/financeiro/")
        elif tipo_alvo in ("geral", "emenda", "competicao"):
            from financeiro_planilha import carregar_lancamentos_da_planilha

            if tipo_alvo == "competicao" and not (args.origem or "").strip():
                logger.error("Informe a competicao com --origem \"NOME DA COMPETICAO\"")
                return 1
            if tipo_alvo == "emenda" and not (args.emenda or "").strip():
                logger.error("Informe a emenda com --emenda \"Emenda 042/2026\"")
                return 1
            try:
                lancamentos = carregar_lancamentos_da_planilha(Path(args.config), logger)
            except Exception as exc:
                logger.error("Falha ao ler a planilha financeira no Drive: %s", exc)
                return 1
            filtro = FiltroRelatorio(
                tipo_alvo,
                competicao=(args.origem or "").strip(),
                numero_emenda=(args.emenda or "").strip(),
                periodo_inicio=dt_ini_str,
                periodo_fim=dt_fim_str,
            )
            pdf_path = gerar_pdf_financeiro(filtro, lancamentos, cfg_pdf, logger=logger)
            logger.info("PDF financeiro gerado com sucesso: %s", pdf_path)
        else:
            caminho_json = Path(alvo)
            if not caminho_json.exists():
                logger.error("Arquivo JSON nao encontrado: %s", caminho_json)
                return 1
            filtro, lancamentos = carregar_lancamentos_de_json(caminho_json)
            if dt_ini_str:
                filtro.periodo_inicio = dt_ini_str
            if dt_fim_str:
                filtro.periodo_fim = dt_fim_str
            pdf_path = gerar_pdf_financeiro(filtro, lancamentos, cfg_pdf, logger=logger)
            logger.info("PDF financeiro gerado com sucesso: %s", pdf_path)
        return 0
    if args.gerar_pdf_nota:
        from nota_pdf import regerar_pdf

        config = AppConfig(Path(args.config))
        regerar_pdf(args.gerar_pdf_nota, Path(args.config), configure_logging(config.log_path))
        return 0
    if args.analisar_sumulas:
        from sumula_disciplinar import processar_sumulas

        processar_sumulas(Path(args.config), local_only=args.process_local_only, usar_ia=args.ia)
        return 0
    config = AppConfig(Path(args.config))
    selectors = SelectorConfig(Path(args.selectors))
    logger = configure_logging(config.log_path)

    downloader = DriveTxtDownloader(config.folder_embed_url, config.download_dir, config.service_account_json,
                                    config.path)
    if not args.process_local_only:
        downloaded = downloader.sync()
        logger.info("Arquivos sincronizados do Drive: %s", len(downloaded))
        if args.sync_drive_only:
            return 0

    bot = IfutBot(config, selectors, logger)
    try:
        bot.login()
        if args.login_only:
            logger.info("Login executado com sucesso; encerrando por --login-only.")
            return 0
        if args.update_all_team_counts:
            bot.update_all_teams_athlete_counts()
            return 0
        parser = TxtRequestParser()
        txt_files = list(iter_txt_files(config.download_dir))
        if not txt_files:
            logger.info("Nenhum arquivo TXT encontrado em %s", config.download_dir)
            return 0
        for txt_file in txt_files:
            try:
                request = parser.parse(txt_file)
                bot.last_result_files = []
                bot.process_request(request)
                move_file(txt_file, config.processed_dir)
                downloader.move_remote_file(txt_file.name, "processed", logger)
            except Exception as exc:
                logger.exception("Falha ao processar %s: %s", txt_file.name, exc)
                move_file(txt_file, config.failed_dir)
                downloader.move_remote_file(txt_file.name, "failed", logger)
            finally:
                downloader.publish_results(bot.last_result_files, logger)
    finally:
        bot.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
