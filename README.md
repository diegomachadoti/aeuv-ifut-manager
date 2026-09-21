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

## Observações

- `--process-local-only` usa apenas os TXT já existentes em `downloads\`.
- Em portabilidade, o campeonato de origem vem de `COMPETICAO ANTERIOR` do TXT; se não existir, usa `portability_source_championship`.
- Os delays mais sensíveis ficaram em `[app]`.
- Comissão técnica segue o fluxo da aba **Comissão Téc.** e retorna para **Elenco** nas ações de inclusão e remoção.
- A portabilidade opera na aba principal de **Elenco**.
