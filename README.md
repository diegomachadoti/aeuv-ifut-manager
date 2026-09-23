# Automação iFut

Automação em Python para:

- fazer login no iFut
- baixar arquivos `.txt` de uma pasta pública do Google Drive
- ler cada formulário
- localizar o time no campeonato
- executar **inclusão**, **remoção** ou **portabilidade**

## Arquivos principais

- `main.py`: fluxo principal
- `config.ini`: credenciais, delays e URLs
- `selectors.ini`: seletores Selenium do iFut
- `downloads\`: entrada, processados, falhas e resultados

## Configuração

1. Crie/edite `config.ini`.
2. Preencha `username` e `password`.
3. Ajuste os parâmetros de `[app]`.
4. Revise o mapa de times em `[teams]`.
5. Complete `selectors.ini` se o site mudar.

## Parâmetros do `config.ini`

### `[ifut]`

- `username`
- `password`
- `login_url`
- `championship_url`
- `teams_url`

### `[teams]`

Mapa `nome do time = url direta do time no iFut`.

### `[drive]`

- `folder_embed_url`
- `service_account_json` (opcional, caminho do JSON local da service account)
- `download_dir`
- `processed_dir`
- `failed_dir`
- `results_dir` (opcional)

### `[selenium]`

- `headless`
- `timeout_seconds`

### `[app]`

- `log_path`
- `pause_after_action`
- `dry_run`
- `wait_between_records_seconds`
- `team_page_wait_seconds`
- `portability_popup_wait_seconds`
- `portability_cancel_delay_seconds`
- `removal_click_delay_seconds`
- `removal_confirm_delay_seconds`
- `portability_source_championship`

## Execução

Baixar somente os TXT do Drive:

```powershell
.\.venv\Scripts\python.exe .\main.py --sync-drive-only
```

Processar somente os arquivos locais já baixados:

```powershell
.\.venv\Scripts\python.exe .\main.py --process-local-only
```

Testar somente login:

```powershell
.\.venv\Scripts\python.exe .\main.py --login-only
```

Fluxo completo:

```powershell
.\.venv\Scripts\python.exe .\main.py
```

## Fluxos suportados

- Inclusão de atleta
- Inclusão de comissão técnica
- Remoção de atleta
- Remoção de comissão técnica
- Portabilidade de atleta
- Portabilidade de comissão técnica

## Estrutura dos arquivos TXT

O parser identifica:

- `PROTOCOLO`
- `COMPETICAO`
- `EQUIPE`
- `COMPROVANTE PIX`
- blocos `REGISTRO 01 ... REGISTRO 30`

Para portabilidade, também lê:

- `COMPETICAO ANTERIOR`

## Saída gerada

- Processados: `downloads\processados`
- Falhas: `downloads\falhas`
- Resultados: `downloads\resultados`

O arquivo de resultado traz:

- quantidade de atletas inscritos
- lista de inscritos por **inclusão** e **portabilidade**
- bloco com todos os resultados por registro

## Fluxo de sincronização com Google Drive

### Estrutura de pastas esperada no Drive

```
Pasta Raiz (folder_embed_url)
├── Entrada/          (arquivos a processar)
├── Processados/      (arquivos processados com sucesso)
└── Falhas/           (arquivos que falharam)
```

### Movimentação automática de arquivos

Quando `service_account_json` está configurado:

**Sucesso:**
```
Local:   downloads/ARQUIVO.txt → downloads/processados/ARQUIVO.txt
Drive:   Entrada/ARQUIVO.txt → Processados/ARQUIVO.txt
```

**Falha:**
```
Local:   downloads/ARQUIVO.txt → downloads/falhas/ARQUIVO.txt
Drive:   Entrada/ARQUIVO.txt → Falhas/ARQUIVO.txt
```

### Sincronização e processamento

1. **`main.py` (fluxo completo)**
   - ✅ Baixa arquivos de `Entrada/` do Drive (via service account)
   - ✅ Processa cada arquivo
   - ✅ Move local para `processados/` ou `falhas/`
   - ✅ Move no Drive para `Processados/` ou `Falhas/`

2. **`main.py --sync-drive-only`**
   - ✅ Apenas baixa de `Entrada/` do Drive
   - ❌ Não processa, não move

3. **`main.py --process-local-only`**
   - ❌ Não sincroniza do Drive
   - ✅ Processa apenas arquivos locais em `downloads/`
   - ⚠️ Move local, mas não move no Drive (usar com cuidado)

4. **`main.py --login-only`**
   - ✅ Apenas faz login e encerra

### Configuração de service account

Para ativar a movimentação no Drive, configure em `config.ini`:

```ini
[drive]
service_account_json = google-service-account-arte-top-udi.json
folder_embed_url = https://drive.google.com/embeddedfolderview?id=10hhnvDF_J7C0LE5JU9BrPST9D8Rf9qk1#list
```

O arquivo `google-service-account-*.json` deve estar na raiz do projeto.

O JSON da service account precisa conter campos como:

```json
{
  "type": "service_account",
  "project_id": "arte-top-udi"
}
```

Esse arquivo é a credencial técnica usada pelo app para acessar o Google Drive sem login manual. Com ele, o sistema consegue listar arquivos da pasta `Entrada` e mover automaticamente para `Processados` ou `Falhas` após o processamento.

Link para acessar/criar a credencial no Google Cloud:
https://console.cloud.google.com/apis/credentials

## Observações

- `--process-local-only` usa apenas os TXT já existentes em `downloads\`.
- Sem `service_account_json`, o fluxo do Drive usa scraping público (lento) e não consegue mover arquivos.
- Com `service_account_json`, a API do Google Drive gerencia sincronização e movimentação automática.
- Em portabilidade, o campeonato de origem vem de `COMPETICAO ANTERIOR` do TXT; se não existir, usa `portability_source_championship`.
- Os delays mais sensíveis ficaram em `[app]`.
- Comissão técnica segue o fluxo da aba **Comissão Téc.** e retorna para **Elenco** nas ações de inclusão e remoção.
- A portabilidade opera na aba principal de **Elenco**.
- Remoção valida o nome do atleta/comissão antes de confirmar (segurança).
