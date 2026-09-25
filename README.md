# Automação iFut

Automação em Python para:

- fazer login no iFut
- baixar arquivos `.txt` de entrada do Google Drive
- ler cada formulário
- localizar o time no campeonato
- executar **inclusão**, **remoção** ou **portabilidade**

O formulário Web de **inscrição, remoção e portabilidade** gera os arquivos TXT
que alimentam este processamento. Para que o Python os processe, coloque os
arquivos gerados na pasta `Entrada` do Drive configurada em `[drive]` no
`config.ini`. A súmula digital também gera TXT, mas tem finalidade de registro
da arbitragem e não é entrada do parser Python.

Veja como os formulários geram e armazenam esses arquivos no
[guia dos aplicativos Apps Script](apps-scripts/README.md).

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

Atualizar somente a quantidade de atletas de todos os times configurados na planilha:

```powershell
.\.venv\Scripts\python.exe .\main.py --update-all-team-counts
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

## Atualização automática de planilha de controle

**Importante:** Esta é uma etapa **adicional e opcional** que **NÃO afeta o sucesso geral da automação**. 
Se houver algum erro durante a atualização da planilha, o processamento já terá sido concluído com sucesso e os resultados já terão sido salvos.

Ao final do processamento, o bot pode atualizar automaticamente uma planilha Excel com:
- **QTDA JOGADORES** (coluna C): total de atletas extraído da página do iFut
- **COMPROVANTES** (coluna J): link do comprovante PIX do arquivo processado (incrementa histórico)

Tambem existe uma rotina independente para atualizar apenas a **QTDA JOGADORES** de todos os times configurados em `[teams]`, sem processar TXT e sem impactar o fluxo principal.

### Configuração da planilha

Em `config.ini`, seção `[sheets]`:

```ini
[sheets]
spreadsheet_id = 16Tt-7abmpY2CKtY4TQUrqzkFl9T48MFa
update_enabled = true
```

- `spreadsheet_id`: ID do arquivo Excel no Google Drive (extrair da URL compartilhada)
- `update_enabled`: ativar/desativar atualização automática (false por padrão)

**Estrutura esperada da planilha Excel:**
- Coluna A: **TIMES** (nome dos times para busca)
- Coluna C: **QTDA JOGADORES** (quantidade de atletas - atualizada automaticamente)
- Coluna J: **COMPROVANTES** (links do comprovante PIX - incrementa histórico com quebra de linha a cada novo processamento)

### Permissões necessárias

A service account também precisa ter **permissão de Editor** no arquivo Excel compartilhado.

### Logs da atualização

Durante a execução, você verá logs prefixados com `[PLANILHA]` indicando cada etapa:
- Conexão com Google Drive
- Download do arquivo
- Localização do time na planilha
- Atualização de colunas
- Upload do arquivo atualizado
- Sucesso ou erro no processo

### Rotina independente de quantidade por time

O comando abaixo:

```powershell
.\.venv\Scripts\python.exe .\main.py --update-all-team-counts
```

faz o seguinte:

1. Faz login no iFut
2. Lê todos os times configurados na seção `[teams]`
3. Abre cada time um por um
4. Extrai o **Total de atletas** da página do time
5. Atualiza somente a coluna **C (QTDA JOGADORES)** na planilha

Essa rotina:
- não processa arquivos TXT
- não move arquivos no Drive
- não altera comprovantes PIX
- foi criada separada do fluxo atual para não impactar o que já funciona

## Fluxo de processamento

1. **Leitura**: Baixa arquivos TXT do Google Drive
2. **Processamento**: Para cada registro (Inclusão, Portabilidade, Remoção)
   - Acessa o time no iFut
   - Executa a ação configurada
   - Registra o resultado
3. **Resultado**: Salva arquivo com resultado da execução
4. **Sincronização**: Move arquivo processado (Processados/Falhas no Drive)
5. **Planilha** (opcional): Atualiza planilha de controle com dados (não impede sucesso se falhar)

## Observações

- `--process-local-only` usa apenas os TXT já existentes em `downloads\`.
- Sem `service_account_json`, o fluxo do Drive usa scraping público (lento) e não consegue mover arquivos.
- Com `service_account_json`, a API do Google Drive gerencia sincronização e movimentação automática.
- Em portabilidade, o campeonato de origem vem de `COMPETICAO ANTERIOR` do TXT; se não existir, usa `portability_source_championship`.
- Os delays mais sensíveis ficaram em `[app]`.
- Comissão técnica segue o fluxo da aba **Comissão Téc.** e retorna para **Elenco** nas ações de inclusão e remoção.
- A portabilidade opera na aba principal de **Elenco**.
- Remoção valida o nome do atleta/comissão antes de confirmar (segurança).
- A atualização da planilha é a **última etapa** e **não afeta** o resultado geral da execução.
