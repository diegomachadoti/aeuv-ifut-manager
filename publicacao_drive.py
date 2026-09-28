"""Publicacao de regulamentos e notas oficiais no Google Drive.

O sistema interno (Apps Script) so enxerga o que esta no Drive. Este modulo leva
para la os dois artefatos finais gerados localmente:

* regulamento (PDF)  -> "AEUV - Automacao/Regulamentos"
* nota oficial (TXT + PDF) -> "<pasta das sumulas>/Notas Oficiais"

Ambas as pastas sao descobertas a partir de [sumulas] folder_embed_url: o ID da
URL e a pasta das sumulas, e o pai dela e a raiz "AEUV - Automacao". Assim nao ha
ID novo para configurar em lugar nenhum - nem aqui, nem no Apps Script.

Somente notas FINAIS sao publicadas: rascunhos e notas com [A DEFINIR] ficam so
na maquina ate a comissao fechar a decisao.
"""

from __future__ import annotations

import configparser
import logging
import re
from pathlib import Path
from urllib.parse import urlparse

LOGGER = logging.getLogger(__name__)

PASTA_REGULAMENTOS = "Regulamentos"
PASTA_NOTAS = "Notas Oficiais"

MIMES = {".txt": "text/plain", ".pdf": "application/pdf"}


def _extrair_folder_id(url: str) -> str:
    achado = re.search(r"[?&]id=([^&#]+)", url or "")
    if achado:
        return achado.group(1)
    return urlparse(url or "").path.rstrip("/").split("/")[-1]


class PublicadorDrive:
    """Envia arquivos para subpastas fixas do Drive, atualizando quando ja existem."""

    def __init__(self, service_account_json: Path, folder_embed_url: str,
                 logger: logging.Logger | None = None) -> None:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        self.logger = logger or LOGGER
        credentials = service_account.Credentials.from_service_account_file(
            str(service_account_json),
            scopes=["https://www.googleapis.com/auth/drive"],
        )
        self.service = build("drive", "v3", credentials=credentials)
        self.pasta_sumulas_id = _extrair_folder_id(folder_embed_url)
        if not self.pasta_sumulas_id:
            raise ValueError("Nao foi possivel descobrir a pasta das sumulas em [sumulas] folder_embed_url")
        self._raiz_id: str | None = None

    @classmethod
    def carregar(cls, config_path: Path, logger: logging.Logger | None = None) -> "PublicadorDrive":
        parser = configparser.ConfigParser()
        if not parser.read(config_path, encoding="utf-8"):
            raise FileNotFoundError(f"Arquivo de configuracao nao encontrado: {config_path}")
        parser.read(Path(config_path).with_name("config.local.ini"), encoding="utf-8")
        return cls(
            Path(parser.get("drive", "service_account_json", fallback="google-service-account.json")),
            parser.get("sumulas", "folder_embed_url", fallback=""),
            logger,
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
        """Acha a subpasta pelo nome dentro do pai.

        A pasta *nao* e criada aqui de proposito. A conta de servico nao tem
        cota de armazenamento propria: tudo o que ela cria fica registrado com
        ela como dona, e uma pasta assim some da visao de quem abre o Drive -
        ela existe, mas ninguem alcanca. Criar pastas e trabalho de quem tem
        Drive de verdade.
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
        raise RuntimeError(
            f'A pasta "{nome}" nao existe dentro de "{pai["name"]}" no Drive. '
            f'Crie-a pelo navegador e rode o comando de novo.'
        )

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
                    # A conta de servico nao tem cota propria: consegue
                    # atualizar arquivos existentes, mas nao criar um arquivo
                    # novo. Mesma limitacao que o controle de punicoes
                    # enfrentou na primeira publicacao.
                    if not avisou:
                        self.logger.error(
                            "[DRIVE] A conta de servico nao pode criar arquivos novos no Drive. "
                            "Copie os arquivos para a pasta uma primeira vez pelo navegador; "
                            "as proximas execucoes atualizam a copia que ja esta la."
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


def publicar_tudo(config_path: Path, logger: logging.Logger = LOGGER) -> tuple[int, int]:
    """Reenvia todos os regulamentos em PDF e todas as notas finais (TXT + PDF).

    Util na primeira carga e depois de revisar varias notas de uma vez.
    """
    parser = configparser.ConfigParser()
    if not parser.read(config_path, encoding="utf-8"):
        raise FileNotFoundError(f"Arquivo de configuracao nao encontrado: {config_path}")
    parser.read(Path(config_path).with_name("config.local.ini"), encoding="utf-8")
    regulamento = Path(parser.get("sumulas", "regulamento", fallback="regulamento\\regulamento"))
    notas_dir = Path(parser.get("sumulas", "notas_dir", fallback="downloads\\sumulas\\notas-oficiais"))

    pdfs = sorted(p for p in regulamento.parent.glob("*.pdf") if p.is_file())
    notas: list[Path] = []
    for txt in sorted(notas_dir.glob("NOTA OFICIAL*.txt")):
        if nota_e_final(txt):
            notas.extend([txt, txt.with_suffix(".pdf")])
        else:
            logger.info("[DRIVE] %s ainda e rascunho; nao publicada", txt.name)

    publicador = PublicadorDrive.carregar(config_path, logger)

    # Uma pasta que falta nao pode impedir a outra de ser publicada.
    return (_silenciar("Regulamentos", logger, lambda: publicador.publicar_regulamentos(pdfs)),
            _silenciar("Notas oficiais", logger, lambda: publicador.publicar_notas(notas)))
