# Automacao iFut + Google Drive

Automacao em Python para:

- fazer login no iFut
- baixar todos os arquivos `.txt` de uma pasta publica do Google Drive
- ler cada formulario
- localizar o time no campeonato
- executar **inclusao**, **remocao** ou **portabilidade**

## Arquivos principais

- `main.py`: fluxo principal
- `config.ini`: credenciais e configuracao da execucao
- `selectors.ini`: mapeamento dos seletores Selenium do iFut
- `downloads\`: entrada, processados, falhas e resultados

## Configuracao

1. Crie e edite `config.ini`.
2. Preencha:
   - `username`
   - `password`
3. Ajuste os parametros de execucao em `[app]`.
4. Mapeie ou revise as URLs dos times em `[teams]`.
5. Complete `selectors.ini` se algum seletor do iFut mudar.

### Parametros atuais do `config.ini`

#### `[ifut]`

- `username`
- `password`
- `login_url`
- `championship_url`
- `teams_url`

#### `[teams]`

Mapa `nome do time = url direta do time no iFut`.

#### `[drive]`

- `folder_embed_url`
- `download_dir`
- `processed_dir`
- `failed_dir`
- `results_dir` (opcional, usa `downloads\resultados` por padrao)

#### `[selenium]`

- `headless`
- `timeout_seconds`

#### `[app]`

- `log_path`
- `dry_run`
- `wait_between_records_seconds`
- `team_page_wait_seconds`
- `portability_popup_wait_seconds`
- `portability_source_championship`

## Instalacao

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Execucao

Baixar somente os TXTs do Drive:

```powershell
.\.venv\Scripts\python.exe .\main.py --sync-drive-only
```

Processar os TXTs locais:

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

## Estrutura dos arquivos baixados

O parser identifica:

- `PROTOCOLO`
- `COMPETICAO`
- `EQUIPE`
- `COMPROVANTE PIX`
- blocos `REGISTRO 01 ... REGISTRO 30`

## Observacoes importantes

- O Google Drive publico esta sendo lido pela URL `embeddedfolderview`.
- `dry_run = true` preenche os fluxos sem confirmar a inclusao/portabilidade final.
- Depois do processamento, os arquivos vao para:
  - `downloads\processados`
  - `downloads\falhas`
- Os arquivos de resultado vao para:
  - `downloads\resultados`
- O log fica em `logs\ifut.log`.
- Em inclusao, se houver duplicidade como `RG ja cadastrado`, a falha e registrada no log e no arquivo de resultado, o pop-up e fechado e o fluxo segue.
- Em portabilidade, o campeonato de origem usado no combo vem de `portability_source_championship`.

## O que falta mapear no iFut

Como o site e uma SPA e exige sessao autenticada, deixei os fluxos prontos com **seletores configuraveis**:

- inclusao de atleta
- portabilidade por importacao
- mensagens de duplicidade
- acao de remocao por linha
- campos restantes de formulario e remocao, se necessario

Assim o projeto fica pronto para ajustar somente os seletores sem reescrever a logica.
