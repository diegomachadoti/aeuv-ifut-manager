"""Publicacao de regulamentos, formas de disputa e notas oficiais no Google Drive.

O sistema interno (Apps Script) so enxerga o que esta no Drive. Este modulo leva
para la os dois artefatos finais gerados localmente:

* regulamento (PDF)  -> "AEUV - Automacao/Regulamentos"
* forma de disputa (PDF) -> "AEUV - Automacao/Regulamentos"
* nota oficial (TXT + PDF) -> "<pasta das sumulas>/Notas Oficiais"
* relatorio financeiro (PDF) -> "AEUV - Automacao/Relatorios Financeiros"

Notas e regulamentos preservam a descoberta legada a partir de `[sumulas]
folder_embed_url`. Somente relatorios financeiros usam a raiz explicita de
`[drive] root_folder_id`, com publicacao imutavel e hash de integridade.

Somente notas FINAIS sao publicadas: rascunhos e notas com [A DEFINIR] ficam so
na maquina ate a comissao fechar a decisao.
"""

from __future__ import annotations

import configparser
import hashlib
import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import drive_auth
from financeiro_pdf import analisar_nome_relatorio_financeiro

LOGGER = logging.getLogger(__name__)

PASTA_REGULAMENTOS = "Regulamentos"
PASTA_NOTAS = "Notas Oficiais"
TAMANHO_MAXIMO_RELATORIO = 50 * 1024 * 1024

MIMES = {".txt": "text/plain", ".pdf": "application/pdf"}


class ErroArquivoRelatorio(ValueError):
    pass


class ErroPublicacaoRelatorio(RuntimeError):
    def __init__(self, categoria: str, mensagem: str, acao: str, causa=None) -> None:
        super().__init__(mensagem)
        self.categoria = categoria
        self.acao = acao
        self.causa = causa


@dataclass(frozen=True)
class ResultadoPublicacao:
    id: str
    nome: str
    url: str
    acao: str


@dataclass(frozen=True)
class ArquivoRelatorio:
    caminho: Path
    nome: str
    emissao_id: str | None
    sha256: str
    md5: str


def _extrair_folder_id(url: str) -> str:
    achado = re.search(r"[?&]id=([^&#]+)", url or "")
    if achado:
        return achado.group(1)
    return urlparse(url or "").path.rstrip("/").split("/")[-1]


def _escapar_consulta(valor: str) -> str:
    return str(valor).replace("\\", "\\\\").replace("'", "\\'")


def validar_arquivo_relatorio(pdf: Path) -> ArquivoRelatorio:
    caminho = Path(pdf)
    try:
        if not caminho.exists() or not caminho.is_file():
            raise ErroArquivoRelatorio(f"Relatorio financeiro nao encontrado ou nao e arquivo: {caminho}")
        tamanho = caminho.stat().st_size
        if tamanho < 1 or tamanho > TAMANHO_MAXIMO_RELATORIO:
            raise ErroArquivoRelatorio("O relatorio financeiro deve ter entre 1 byte e 50 MiB")
        with caminho.open("rb") as arquivo:
            if arquivo.read(5) != b"%PDF-":
                raise ErroArquivoRelatorio("O arquivo informado nao possui assinatura PDF valida")
            arquivo.seek(0)
            sha256 = hashlib.sha256()
            md5 = hashlib.md5()
            for bloco in iter(lambda: arquivo.read(1024 * 1024), b""):
                sha256.update(bloco)
                md5.update(bloco)
        identidade = analisar_nome_relatorio_financeiro(caminho.name)
    except ErroArquivoRelatorio:
        raise
    except (OSError, ValueError) as exc:
        raise ErroArquivoRelatorio(str(exc)) from exc
    return ArquivoRelatorio(caminho, caminho.name, identidade.emissao_id,
                            sha256.hexdigest(), md5.hexdigest())


def _categoria_erro(exc: Exception) -> tuple[str, str]:
    texto = str(exc)
    status = getattr(getattr(exc, "resp", None), "status", None)
    if "storageQuotaExceeded" in texto:
        return "cota", "Use OAuth do proprietario ou crie/compartilhe a pasta manualmente."
    if status == 403:
        return "permissao", "Compartilhe a raiz e a subpasta como Editor com a conta autenticada."
    if status == 404:
        return "pasta", "Confira o ID, restaure a pasta ou ajuste o compartilhamento."
    if status in (408, 429) or (isinstance(status, int) and status >= 500):
        return "transitorio", "Repita o mesmo arquivo com --publicar-relatorio-financeiro mais tarde."
    if isinstance(exc, (ConnectionError, TimeoutError)):
        return "transitorio", "Repita o mesmo arquivo com --publicar-relatorio-financeiro mais tarde."
    return "api", "Confira a API, as permissoes e repita o mesmo arquivo apos corrigir."


class PublicadorDrive:
    """Envia arquivos para subpastas fixas do Drive, atualizando quando ja existem."""

    def __init__(self, credenciais, folder_embed_url: str,
                 oauth: bool = False, logger: logging.Logger | None = None, *,
                 root_folder_id: str | None = None,
                 financial_reports_folder_name: str | None = None) -> None:
        from googleapiclient.discovery import build

        self.logger = logger or LOGGER
        self.oauth = oauth
        self.service = build("drive", "v3", credentials=credenciais)
        self.pasta_sumulas_id = _extrair_folder_id(folder_embed_url)
        if not self.pasta_sumulas_id:
            raise ValueError("Nao foi possivel descobrir a pasta das sumulas em [sumulas] folder_embed_url")
        self.root_folder_id = str(root_folder_id or "").strip() or None
        self.financial_reports_folder_name = str(financial_reports_folder_name or "").strip() or None
        self._raiz_id: str | None = None

    @classmethod
    def carregar(cls, config_path: Path, logger: logging.Logger | None = None, *,
                 permitir_reautorizacao: bool = True) -> "PublicadorDrive":
        parser = configparser.ConfigParser()
        if not parser.read(config_path, encoding="utf-8"):
            raise FileNotFoundError(f"Arquivo de configuracao nao encontrado: {config_path}")
        parser.read(Path(config_path).with_name("config.local.ini"), encoding="utf-8")
        return cls(
            drive_auth.credenciais_drive(
                parser, logger, permitir_reautorizacao=permitir_reautorizacao,
            ),
            parser.get("sumulas", "folder_embed_url", fallback=""),
            drive_auth.usando_oauth(parser),
            logger,
            root_folder_id=parser.get("drive", "root_folder_id", fallback=""),
            financial_reports_folder_name=parser.get(
                "drive", "financial_reports_folder_name", fallback="",
            ),
        )
    # -- pastas -------------------------------------------------------------

    def raiz_id(self) -> str:
        """ID da pasta "AEUV - Automacao" (pai da pasta das sumulas)."""
        if self._raiz_id is None:
            dados = self.service.files().get(
                fileId=self.pasta_sumulas_id, fields="parents",
            ).execute()
            pais = dados.get("parents") or []
            if not pais:
                raise RuntimeError("A pasta das sumulas nao tem pasta pai acessivel pela conta de servico")
            self._raiz_id = pais[0]
        return self._raiz_id

    def subpasta_id(self, nome: str, pai_id: str) -> str:
        """Acha a subpasta pelo nome dentro do pai, criando quando possivel.

        So criamos a pasta no modo OAuth, em que a automacao age como o dono da
        conta. Pela conta de servico a pasta ate seria criada, mas ficaria
        registrada com ela como dona, e uma pasta assim some da visao de quem
        abre o Drive: existe, e ninguem alcanca.
        """
        achados = self.service.files().list(
            q=(f"'{pai_id}' in parents and trashed = false "
               f"and mimeType = 'application/vnd.google-apps.folder' and name = '{nome}'"),
            fields="files(id)",
            pageSize=1,
        ).execute().get("files", [])
        if achados:
            return achados[0]["id"]

        pai = self.service.files().get(fileId=pai_id, fields="name").execute()
        if not self.oauth:
            raise RuntimeError(
                f'A pasta "{nome}" nao existe dentro de "{pai["name"]}" no Drive. '
                f'Crie-a pelo navegador e rode o comando de novo.'
            )
        criada = self.service.files().create(
            body={"name": nome, "mimeType": "application/vnd.google-apps.folder", "parents": [pai_id]},
            fields="id",
        ).execute()
        self.logger.info('[DRIVE] Pasta "%s" criada dentro de "%s".', nome, pai["name"])
        return criada["id"]

    # -- envio --------------------------------------------------------------

    def enviar(self, arquivo: Path, pasta_id: str) -> None:
        from googleapiclient.http import MediaFileUpload

        media = MediaFileUpload(str(arquivo), mimetype=MIMES.get(arquivo.suffix.lower(), "application/octet-stream"),
                                resumable=False)
        nome = arquivo.name.replace("'", "\\'")
        existentes = self.service.files().list(
            q=f"'{pasta_id}' in parents and trashed = false and name = '{nome}'",
            fields="files(id)",
            pageSize=1,
        ).execute().get("files", [])
        if existentes:
            self.service.files().update(fileId=existentes[0]["id"], media_body=media).execute()
            return
        self.service.files().create(
            body={"name": arquivo.name, "parents": [pasta_id]},
            media_body=media,
            fields="id",
        ).execute()

    def _erro_duplicidade(self, mensagem: str) -> ErroPublicacaoRelatorio:
        return ErroPublicacaoRelatorio(
            "duplicidade", mensagem,
            "Consolide os itens conflitantes no Drive e repita exatamente o mesmo arquivo.",
        )

    def _listar_financeiros(self, pasta_id: str, filtro: str) -> list[dict]:
        return self.service.files().list(
            q=f"'{_escapar_consulta(pasta_id)}' in parents and trashed = false and {filtro}",
            fields="files(id,name,webViewLink,md5Checksum,appProperties)", pageSize=2,
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute().get("files", [])

    def _pasta_relatorios_financeiros(self) -> str:
        if not self.root_folder_id:
            raise ValueError("Configure [drive] root_folder_id para publicar relatorios financeiros")
        nome = self.financial_reports_folder_name
        if not nome or "/" in nome or "\\" in nome:
            raise ValueError("Configure [drive] financial_reports_folder_name com um nome de subpasta valido")
        filtro = ("mimeType = 'application/vnd.google-apps.folder' and name = '"
                  + _escapar_consulta(nome) + "'")
        achados = self._listar_financeiros(self.root_folder_id, filtro)
        if len(achados) > 1:
            raise self._erro_duplicidade(f'Ha mais de uma pasta "{nome}" na raiz configurada.')
        if achados:
            return achados[0]["id"]
        if not self.oauth:
            raise ErroPublicacaoRelatorio(
                "pasta", f'A pasta "{nome}" nao existe e a conta de servico nao deve cria-la.',
                "Crie a subpasta pelo proprietario, compartilhe-a como Editor ou use OAuth.",
            )
        criada = self.service.files().create(
            body={"name": nome, "mimeType": "application/vnd.google-apps.folder",
                  "parents": [self.root_folder_id]}, fields="id",
            supportsAllDrives=True,
        ).execute()
        confirmadas = self._listar_financeiros(self.root_folder_id, filtro)
        if len(confirmadas) != 1 or confirmadas[0].get("id") != criada.get("id"):
            raise self._erro_duplicidade("Nao foi possivel reconciliar a subpasta financeira criada.")
        return criada["id"]

    @staticmethod
    def _resultado(item: dict, nome: str, acao: str) -> ResultadoPublicacao:
        arquivo_id = str(item.get("id") or "")
        if not arquivo_id:
            raise RuntimeError("Resposta do Drive sem ID do arquivo")
        url = item.get("webViewLink") or f"https://drive.google.com/file/d/{arquivo_id}/view"
        return ResultadoPublicacao(arquivo_id, nome, url, acao)

    def _confirmar_reutilizacao(self, item: dict, arquivo: ArquivoRelatorio) -> ResultadoPublicacao:
        if item.get("name") != arquivo.nome:
            raise self._erro_duplicidade("A identidade da emissao existe com outro nome no Drive.")
        if arquivo.emissao_id:
            propriedades = item.get("appProperties") or {}
            if propriedades.get("aeuvSha256") != arquivo.sha256:
                raise self._erro_duplicidade("A identidade da emissao existe com conteudo divergente no Drive.")
        else:
            remoto = str(item.get("md5Checksum") or "").lower()
            if not remoto or remoto != arquivo.md5:
                raise self._erro_duplicidade(
                    "O relatorio legado homonimo nao possui checksum que prove conteudo identico."
                )
        return self._resultado(item, arquivo.nome, "reutilizado")

    def _publicar_relatorio_validado(self, arquivo: ArquivoRelatorio) -> ResultadoPublicacao:
        from googleapiclient.http import MediaFileUpload

        pasta_id = self._pasta_relatorios_financeiros()
        nome_q = _escapar_consulta(arquivo.nome)
        if arquivo.emissao_id:
            identidade_q = _escapar_consulta(arquivo.emissao_id)
            candidatos = self._listar_financeiros(
                pasta_id, "appProperties has { key='aeuvEmissionId' and value='" + identidade_q + "' }",
            )
            if len(candidatos) > 1:
                raise self._erro_duplicidade("Ha varios arquivos com a mesma identidade de emissao no Drive.")
            homonimos = self._listar_financeiros(pasta_id, f"name = '{nome_q}'")
            if candidatos:
                if len(homonimos) != 1 or homonimos[0].get("id") != candidatos[0].get("id"):
                    raise self._erro_duplicidade(
                        "A identidade da emissao possui arquivo homonimo conflitante no Drive."
                    )
                return self._confirmar_reutilizacao(candidatos[0], arquivo)
            if homonimos:
                raise self._erro_duplicidade("Ja existe arquivo homonimo sem a identidade esperada no Drive.")
        else:
            candidatos = self._listar_financeiros(pasta_id, f"name = '{nome_q}'")
            if len(candidatos) > 1:
                raise self._erro_duplicidade("Ha varios relatorios legados homonimos no Drive.")
            if candidatos:
                return self._confirmar_reutilizacao(candidatos[0], arquivo)

        propriedades = {"aeuvArtifact": "financial-report", "aeuvSha256": arquivo.sha256}
        if arquivo.emissao_id:
            propriedades["aeuvEmissionId"] = arquivo.emissao_id
        media = MediaFileUpload(str(arquivo.caminho), mimetype="application/pdf", resumable=False)
        criado = self.service.files().create(
            body={"name": arquivo.nome, "mimeType": "application/pdf", "parents": [pasta_id],
                  "appProperties": propriedades},
            media_body=media, fields="id,name,webViewLink,modifiedTime",
            supportsAllDrives=True,
        ).execute()

        if arquivo.emissao_id:
            reconciliados = self._listar_financeiros(
                pasta_id, "appProperties has { key='aeuvEmissionId' and value='"
                + _escapar_consulta(arquivo.emissao_id) + "' }",
            )
            homonimos_reconciliados = self._listar_financeiros(pasta_id, f"name = '{nome_q}'")
            if (len(homonimos_reconciliados) != 1
                    or homonimos_reconciliados[0].get("id") != criado.get("id")):
                raise self._erro_duplicidade(
                    "A criacao concorrente produziu arquivo homonimo conflitante no Drive."
                )
        else:
            reconciliados = self._listar_financeiros(pasta_id, f"name = '{nome_q}'")
        if len(reconciliados) != 1 or reconciliados[0].get("id") != criado.get("id"):
            raise self._erro_duplicidade("A criacao concorrente produziu candidatos inconsistentes no Drive.")
        confirmado = reconciliados[0]
        if arquivo.emissao_id and (confirmado.get("appProperties") or {}).get("aeuvSha256") != arquivo.sha256:
            raise self._erro_duplicidade("O arquivo criado nao preservou o hash esperado.")
        self.logger.info("[DRIVE][RELATORIO_FINANCEIRO] Publicado: %s (%s)", arquivo.nome, criado.get("id"))
        return self._resultado(criado, arquivo.nome, "criado")

    def publicar_relatorio_financeiro(self, pdf: Path) -> ResultadoPublicacao:
        arquivo = validar_arquivo_relatorio(pdf)
        lock = arquivo.caminho.with_name("." + arquivo.nome + ".upload.lock")
        descritor = None
        limite = time.monotonic() + 10
        while descritor is None:
            try:
                descritor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            except FileExistsError:
                if time.monotonic() >= limite:
                    raise ErroArquivoRelatorio(
                        f"Outra publicacao deste relatorio ainda esta em andamento: {arquivo.caminho}"
                    )
                time.sleep(0.1)
        try:
            return self._publicar_relatorio_validado(arquivo)
        except (ErroPublicacaoRelatorio, ValueError):
            raise
        except Exception as exc:
            # Erros de programacao devem continuar visiveis, em vez de parecer falha operacional.
            if isinstance(exc, (TypeError, AssertionError)):
                raise
            categoria, acao = _categoria_erro(exc)
            raise ErroPublicacaoRelatorio(
                categoria, "Falha ao publicar o relatorio financeiro no Google Drive.", acao, exc,
            ) from exc
        finally:
            if descritor is not None:
                os.close(descritor)
            try:
                lock.unlink()
            except FileNotFoundError:
                pass

    def _publicar(self, arquivos, pasta_id: str) -> int:
        enviados = 0
        avisou = False
        for arquivo in arquivos:
            if not arquivo or not Path(arquivo).exists():
                continue
            arquivo = Path(arquivo)
            try:
                self.enviar(arquivo, pasta_id)
                self.logger.info("[DRIVE] Publicado: %s", arquivo.name)
                enviados += 1
            except Exception as exc:
                if "storageQuotaExceeded" in str(exc):
                    # Acontece so pela conta de servico, que nao tem cota
                    # propria: ela atualiza o que ja existe, mas nao cria nada.
                    if not avisou:
                        self.logger.error(
                            "[DRIVE] A conta de servico nao pode criar arquivos novos no Drive. "
                            "Configure o acesso OAuth (ver 'Publicacao no Drive' no README) ou "
                            "copie os arquivos para a pasta uma primeira vez pelo navegador."
                        )
                        avisou = True
                    self.logger.error("[DRIVE] Nao publicado (primeira copia manual): %s", arquivo.name)
                    continue
                self.logger.error("[DRIVE] Erro ao publicar %s: %s", arquivo.name, exc)
        return enviados

    def publicar_regulamentos(self, arquivos) -> int:
        return self._publicar(arquivos, self.subpasta_id(PASTA_REGULAMENTOS, self.raiz_id()))

    def publicar_notas(self, arquivos) -> int:
        return self._publicar(arquivos, self.subpasta_id(PASTA_NOTAS, self.pasta_sumulas_id))


# ---------------------------------------------------------------------------
# Atalhos usados pelos fluxos de geracao de PDF
# ---------------------------------------------------------------------------

def publicar_relatorio_financeiro(pdf: Path, config_path: Path,
                                   logger: logging.Logger = LOGGER) -> ResultadoPublicacao:
    # Arquivo e configuracao local sao validados antes de carregar qualquer credencial.
    arquivo = validar_arquivo_relatorio(pdf)
    parser = configparser.ConfigParser()
    if not parser.read(config_path, encoding="utf-8"):
        raise FileNotFoundError(f"Arquivo de configuracao nao encontrado: {config_path}")
    parser.read(Path(config_path).with_name("config.local.ini"), encoding="utf-8")
    if not parser.has_section("drive"):
        raise ValueError("A secao [drive] nao existe no arquivo de configuracao")
    raiz = parser.get("drive", "root_folder_id", fallback="").strip()
    nome_pasta = parser.get("drive", "financial_reports_folder_name", fallback="").strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,}", raiz):
        raise ValueError("Configure [drive] root_folder_id com o ID canonico da pasta raiz")
    if not nome_pasta or "/" in nome_pasta or "\\" in nome_pasta:
        raise ValueError("Configure [drive] financial_reports_folder_name com um nome valido")
    try:
        publicador = PublicadorDrive.carregar(
            config_path, logger, permitir_reautorizacao=False,
        )
    except drive_auth.ErroAutenticacaoDrive as exc:
        raise ErroPublicacaoRelatorio(
            "credencial", str(exc),
            "Autorize previamente o OAuth do Drive ou instale uma credencial valida.", exc,
        ) from exc
    except (FileNotFoundError, configparser.Error, ValueError):
        raise
    except Exception as exc:
        if isinstance(exc, (TypeError, AssertionError)):
            raise
        categoria, acao = _categoria_erro(exc)
        raise ErroPublicacaoRelatorio(
            categoria, "Falha ao iniciar o cliente do Google Drive.", acao, exc,
        ) from exc
    return publicador.publicar_relatorio_financeiro(arquivo.caminho)


def _silenciar(acao: str, logger: logging.Logger, funcao):
    """Publicar e complemento: falhar no Drive nao invalida o PDF ja gravado."""
    try:
        return funcao()
    except Exception as exc:
        logger.error("[DRIVE] %s nao publicado: %s", acao, exc)
        return 0


def publicar_regulamento(pdf: Path, config_path: Path, logger: logging.Logger = LOGGER) -> int:
    return _silenciar("Regulamento", logger,
                      lambda: PublicadorDrive.carregar(config_path, logger).publicar_regulamentos([pdf]))


def publicar_forma_disputa(pdf: Path, config_path: Path, logger: logging.Logger = LOGGER) -> int:
    return _silenciar("Forma de disputa", logger,
                      lambda: PublicadorDrive.carregar(config_path, logger).publicar_regulamentos([pdf]))


def nota_e_final(nota_txt: Path) -> bool:
    """Nota final = sem marcadores [A DEFINIR] e sem divergencias apontadas pela IA."""
    import nota_pdf

    return not nota_pdf.tem_pendencias(nota_txt.read_text(encoding="utf-8-sig", errors="ignore"))


def publicar_nota(nota_txt: Path, config_path: Path, logger: logging.Logger = LOGGER) -> int:
    """Publica TXT + PDF da nota, desde que ela ja esteja fechada pela comissao."""
    if not nota_e_final(nota_txt):
        logger.info("[DRIVE] %s ainda e rascunho; nao publicada", nota_txt.name)
        return 0
    arquivos = [nota_txt, nota_txt.with_suffix(".pdf")]
    return _silenciar("Nota oficial", logger,
                      lambda: PublicadorDrive.carregar(config_path, logger).publicar_notas(arquivos))


def publicar_tudo(config_path: Path, logger: logging.Logger = LOGGER) -> tuple[int, int, int]:
    """Reenvia regulamentos, formas de disputa e notas finais (TXT + PDF).

    Util na primeira carga e depois de revisar varias notas de uma vez.
    """
    parser = configparser.ConfigParser()
    if not parser.read(config_path, encoding="utf-8"):
        raise FileNotFoundError(f"Arquivo de configuracao nao encontrado: {config_path}")
    parser.read(Path(config_path).with_name("config.local.ini"), encoding="utf-8")
    regulamento = Path(parser.get("sumulas", "regulamento", fallback="regulamento\\regulamento"))
    formas_dir = Path("formadisputa")
    notas_dir = Path(parser.get("sumulas", "notas_dir", fallback="downloads\\sumulas\\notas-oficiais"))

    pdfs = sorted(p for p in regulamento.parent.glob("*.pdf") if p.is_file())
    formas = sorted(p for p in formas_dir.glob("*.pdf") if p.is_file())
    notas: list[Path] = []
    for txt in sorted(notas_dir.glob("NOTA OFICIAL*.txt")):
        if nota_e_final(txt):
            notas.extend([txt, txt.with_suffix(".pdf")])
        else:
            logger.info("[DRIVE] %s ainda e rascunho; nao publicada", txt.name)

    publicador = PublicadorDrive.carregar(config_path, logger)

    # Uma publicacao que falha nao pode impedir as demais.
    return (_silenciar("Regulamentos", logger, lambda: publicador.publicar_regulamentos(pdfs)),
            _silenciar("Formas de disputa", logger, lambda: publicador.publicar_regulamentos(formas)),
            _silenciar("Notas oficiais", logger, lambda: publicador.publicar_notas(notas)))
