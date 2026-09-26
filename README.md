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
`config.ini`. A súmula digital também gera TXT, que é a entrada da
[análise disciplinar](#análise-disciplinar-das-súmulas) (geração do rascunho da
Nota Oficial).

Veja como os formulários geram e armazenam esses arquivos no
[guia dos aplicativos Apps Script](apps-scripts/README.md).

## Arquivos principais

- `main.py`: fluxo principal
- `sumula_disciplinar.py`: análise das súmulas e geração das notas oficiais
- `sumula_ia.py`: geração da nota oficial por IA (`--ia`)
- `nota_pdf.py`: PDF da nota oficial com a identidade da AEUV (`--gerar-pdf-nota`)
- `regulamento_pdf.py`: PDF do regulamento no mesmo layout, assinado pelo Presidente (`--gerar-pdf-regulamento`)
- `controle_punicoes.py`: TXT e PDF de controle com todos os punidos pelas notas oficiais (`--atualizar-controle-punicoes`)
- `regulamento\`: texto do regulamento usado na análise disciplinar
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

Os arquivos do fluxo de inscrição, remoção e portabilidade ficam em `downloads\inscricoes`, separados das súmulas (`downloads\sumulas`):

- Entrada (TXT baixados do Drive): `downloads\inscricoes`
- Processados: `downloads\inscricoes\processados`
- Falhas: `downloads\inscricoes\falhas`
- Resultados: `downloads\inscricoes\resultados`

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
Local:   downloads/inscricoes/ARQUIVO.txt → downloads/inscricoes/processados/ARQUIVO.txt
Drive:   Entrada/ARQUIVO.txt → Processados/ARQUIVO.txt
```

**Falha:**
```
Local:   downloads/inscricoes/ARQUIVO.txt → downloads/inscricoes/falhas/ARQUIVO.txt
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

## Análise disciplinar das súmulas

Lê as súmulas geradas pelo formulário [súmula digital](apps-scripts/README.md),
confronta o relato do árbitro com o regulamento e gera o **rascunho da Nota
Oficial** da Comissão Disciplinar.

```powershell
.\.venv\Scripts\python.exe .\main.py --analisar-sumulas
# ou somente com arquivos já baixados em downloads\sumulas
.\.venv\Scripts\python.exe .\main.py --analisar-sumulas --process-local-only
# gerando a nota com IA (Gemini/OpenAI) em vez das regras fixas
.\.venv\Scripts\python.exe .\main.py --analisar-sumulas --ia
```

Há dois modos de gerar a nota:

| | Regras fixas (padrão) | IA (`--ia`) |
| --- | --- | --- |
| Quem decide | Código, por palavras-chave | Modelo de IA (Gemini ou OpenAI) |
| Pena | Sugerida por critério brando (mínima + agravantes do relato) | Definida e justificada pela IA |
| Redação | Estruturada, com citações literais | Completa, no padrão do modelo de nota |
| Requisitos | Nenhum | Chave de API no `config.local.ini` e internet |
| Arquivo | `NOTA OFICIAL Nº 009-2026 … .txt` | `NOTA OFICIAL Nº 009-2026 … (IA).txt` |

Os dois modos usam a mesma numeração sequencial.

### Como funciona

1. Baixa os `SUMULA_*.txt` da pasta do Drive configurada em `[sumulas]`.
2. Lê protocolo, árbitro, confronto, data, relato (`DOS FATOS`), envolvidos e
   o link do PDF oficial (seção `SÚMULA OFICIAL (PDF)`).
3. Procura no relato, frase a frase, condutas previstas nos artigos
   disciplinares do regulamento (ART. 7.2, 7.5, 8, 9, 10, 11, 12, 13, 14, 15,
   18). Termos negados ("não houve agressão") são ignorados.
4. Relaciona cada conduta ao envolvido citado pelo nome ou pela camisa.
5. Gera a nota em `downloads\sumulas\notas-oficiais` e move o TXT para
   `Processados` (ou `Falhas`) no Drive e localmente.

Nos dois modos, a nota traz antes da assinatura o bloco
`RELATÓRIO OFICIAL DA ARBITRAGEM` com o link do PDF da súmula, para consulta
da íntegra do relato. Súmulas antigas, sem o link, geram a nota sem esse bloco.

> [!IMPORTANT]
> O regulamento é o documento máximo. A análise **não interpreta nada fora
> dele**: cada enquadramento traz o trecho do relato e o texto literal do
> dispositivo, lido de `regulamento\*.txt`. Se um dispositivo não existir no
> arquivo, a regra é ignorada. Condutas sem artigo
> específico (ex.: ameaça) são listadas com referência ao ART. 19, §2º.
> Ocorrências sem envolvido identificado ou com mais de um citado no mesmo
> trecho ficam sinalizadas para conferência.

#### Dosimetria (critério brando e equilibrado)

O modo de regras fixas já sugere a pena, sempre dentro da faixa literal do
dispositivo:

1. Parte da **pena mínima** do dispositivo.
2. Soma **1 partida** para cada circunstância registrada no relato:
   - reiteração da conduta (em 2 ou mais trechos do relatório);
   - ameaça do mesmo envolvido (conta uma vez, no primeiro enquadramento dele);
   - continuidade da conduta após a expulsão ("após a expulsão", "mesmo expulso").
3. Nunca ultrapassa o **máximo** previsto.

Penas fixas (ex.: ART. 14, §2º, "acrescida de mais 2 jogos") são aplicadas
como previstas. Infrações de equipe sem pena em partidas (W.O., abandono,
interrupção) recebem "aplicação das penalidades previstas no ART. X". Penas
"por até 2 anos" (ART. 8 e 13) e ocorrências sem autoria identificada ficam
como `[A DEFINIR PELA COMISSÃO]`.

As decisões sugeridas ficam entre `** **` no TXT, por exemplo
`➡️ **3 (três) partidas**`, e saem em **vermelho e negrito** no PDF para
indicar o ponto que a comissão pode alterar. Para mudar a decisão, edite o
texto entre os `**` no TXT e rode `--gerar-pdf-nota`.

Se nenhuma conduta for identificada, é gerado
`ANALISE_<protocolo>_sem-enquadramento.txt` para revisão manual, sem consumir
número de nota.

### Modo IA (`--ia`)

Não usa as regras fixas. A IA recebe o **texto integral do regulamento**, o
modelo de nota (`regulamento\modelo-nota-oficial.txt`, usado só como formato) e
a súmula, e redige a nota completa, com enquadramento e pena. As instruções
proíbem citar dispositivos, penas ou fatos que não estejam no regulamento ou no
relato.

Depois da resposta, o código **confere** a nota com o regulamento:

- todo artigo/§ citado precisa existir no arquivo do regulamento;
- toda pena em partidas precisa estar dentro da faixa do dispositivo.

Divergências aparecem no topo da nota como `⛔ DIVERGÊNCIAS COM O REGULAMENTO`
e no log. Se a IA não identificar infração, é gerado
`ANALISE_<protocolo>_sem-enquadramento (IA).txt`. Em falha de conexão ou erro
da API de IA, a súmula continua em `downloads\sumulas` para nova tentativa.
Se a API estiver temporariamente indisponível (429/5xx, comum no plano
gratuito), o programa tenta de novo automaticamente até 4 vezes, aguardando
15 s, 30 s e 60 s entre as tentativas.

> [!WARNING]
> No modo IA o regulamento e o relato da súmula (com nomes dos envolvidos)
> são enviados ao provedor de IA. No plano gratuito do Gemini, o Google pode usar
> esses dados para melhorar seus produtos. A nota continua sendo rascunho e deve ser revisada.

A chave fica no `config.local.ini` (no `.gitignore`, nunca é commitado), que
sobrepõe os valores do `config.ini`:

```ini
[ia]
; Google Gemini (plano gratuito): chave em https://aistudio.google.com/apikey
api_url = https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
modelo = gemini-3.8-flash
temperatura =
api_key = SUA_CHAVE
```

Para a OpenAI (paga, exige crédito em https://platform.openai.com/api-keys),
use `api_url = https://api.openai.com/v1/chat/completions`, `modelo = gpt-4.1`
e `api_key = sk-...`. A variável de ambiente `OPENAI_API_KEY`, se definida, tem
prioridade sobre o `api_key` do arquivo.

Demais opções, no `config.ini`:

```ini
[ia]
temperatura = 0
timeout_seconds = 180
modelo_nota = regulamento\modelo-nota-oficial.txt
```

Deixe `temperatura` vazio para modelos que não aceitam esse parâmetro.

### Configuração

```ini
[sumulas]
folder_embed_url = https://drive.google.com/embeddedfolderview?id=1OfcX-AFyeGEznieKfyqgQRiEjBDJockP#list
download_dir = downloads\sumulas
processed_dir = downloads\sumulas\processados
failed_dir = downloads\sumulas\falhas
notas_dir = downloads\sumulas\notas-oficiais
regulamento = regulamento\regulamento-7-super-liga-união-2026

[notas]
ultimo_numero = 8
ano = 2026
competicao = 7ª Super Liga União 2026
cidade = Uberlândia/MG
```

- `ultimo_numero` é atualizado a cada nota gerada (a próxima será `009/2026`).
  A numeração é **da associação, não da competição**: é única e sequencial para
  todas as competições (trocar `competicao` não altera a contagem). Ela
  reinicia apenas na virada do ano (ex.: `045/2026` → `001/2027`). Por isso
  `Nº/ano` identifica cada nota de forma única, inclusive no controle de
  punições. Não zere `ultimo_numero` manualmente.

Estrutura local:

```
downloads\sumulas\
├── SUMULA_*.txt      (baixadas, aguardando análise)
├── processados\      (súmulas analisadas)
├── falhas\           (súmulas com erro de leitura)
└── notas-oficiais\   (notas .txt e .pdf e análises geradas)
```
- A service account de `[drive]` precisa ser **Editor** da pasta das súmulas;
  as subpastas `Processados` e `Falhas` são criadas automaticamente.

### PDF da Nota Oficial

Cada nota gerada (nos dois modos) ganha também um **PDF** com a identidade da
AEUV (Associação Esportiva Uberlandense Varzeana), salvo ao lado do TXT com o mesmo nome: logomarca e nome da
associação no cabeçalho, seções destacadas, decisões (➡️) em caixa, citações
do regulamento em itálico, link clicável do relatório oficial do árbitro,
bloco de assinatura e rodapé com número da nota e página.

Trechos entre `** **` no TXT (decisões sugeridas) saem em vermelho e negrito.
Enquanto o corpo do TXT tiver `[A DEFINIR PELA COMISSÃO]` ou houver
divergências da IA, o PDF sai com a marca d'água **RASCUNHO** e os avisos no
topo. Depois que a comissão substitui todos os marcadores pela decisão e roda
`--gerar-pdf-nota`, o PDF sai como versão final, sem marca d'água nem avisos. A
linha de aviso do topo do TXT não precisa ser apagada.

Para regerar o PDF depois de revisar o TXT ou de refazer a análise, sem
analisar a súmula de novo:

```powershell
# pelo número da nota
.\.venv\Scripts\python.exe .\main.py --gerar-pdf-nota 5
# pelo protocolo da súmula (usa a nota de maior número dessa súmula)
.\.venv\Scripts\python.exe .\main.py --gerar-pdf-nota SUM-20260925-BAE8C370
# pelo caminho do TXT
.\.venv\Scripts\python.exe .\main.py --gerar-pdf-nota "downloads\sumulas\notas-oficiais\NOTA OFICIAL Nº 005-2026 – COMISSÃO DISCIPLINAR - CRUZMALTINOxTRK.txt"
```

```ini
[pdf]
logo = assets\logo-aeuv.png
logo_url = https://drive.google.com/uc?export=download&id=1FZ5UyGPfciIp23D8d7XYJnY9vhFmSAhV
associacao = AEUV (Associação Esportiva Uberlandense Varzeana)
assinatura = assets\assinatura-presidente.png
assinatura_nome = Iure Costtiti
assinatura_cargo = Presidente
```

A assinatura digitalizada do Presidente (PNG com fundo transparente) é
aplicada sobre a linha de assinatura, com nome e cargo abaixo e, em seguida,
o valor de `associacao` e a competição. `associacao` é o nome oficial padronizado,
**AEUV (Associação Esportiva Uberlandense Varzeana)**, usado em todos os
cabeçalhos, rodapés e assinaturas dos PDFs, nas notas geradas (regras fixas e
IA) e no PDF/TXT da súmula digital. Notas antigas assinadas como "COMISSÃO
ORGANIZADORA" ou "ASSOCIAÇÃO AEUV" saem com o nome oficial ao regerar o PDF. Por segurança, ela aparece **somente no PDF final**:
PDFs marcados como RASCUNHO saem com a linha em branco. O arquivo
`assets/assinatura-*.png` está no `.gitignore` e não é commitado.

Se `logo` não existir, a logomarca é baixada de `logo_url` (link público do
Drive) e salva reduzida. Para trocar a logo, substitua o arquivo ou apague-o
para baixar de novo. Usa `reportlab` e `pillow` (em `requirements.txt`).

### Controle de punições da associação

Depois de cada Nota Oficial (regras fixas ou IA), os punidos da seção **DA
PUNIÇÃO** são registrados em um TXT único de controle da AEUV:

```ini
[sumulas]
controle_punicoes = downloads\sumulas\CONTROLE DE PUNIÇÕES - AEUV.txt
```

Cada linha é uma penalidade (uma pessoa enquadrada em dois artigos gera duas
linhas). As colunas são separadas por `|`, o que permite abrir o arquivo no
Excel como texto delimitado.

| Coluna | Conteúdo |
|---|---|
| NOTA / DATA NOTA | Número e data da nota oficial |
| COMPETIÇÃO | Campeonato em que a punição foi aplicada |
| DATA JOGO / PARTIDA | Data e confronto da súmula |
| EQUIPE / PUNIDO / TIPO / CAMISA | Quem foi punido: atleta, comissão técnica ou equipe |
| ARTIGO | Dispositivo enquadrado, ex.: `ART. 11, §1º` |
| PARTIDAS | Número de partidas de suspensão adicional (`-` se não houver) |
| TEMPO | Punição em tempo, ex.: `1 ano` (`-` se não houver) |
| DECISÃO | Texto da decisão da nota, útil para penas de equipe ou outras penalidades |
| CARTÃO VERMELHO | Se o punido foi expulso, com suspensão automática além da adicional |
| STATUS | `DEFINIDA`; `PENDENTE` se ainda tem `[A DEFINIR]`; `RASCUNHO` se a nota tem divergências |
| SITUAÇÃO | Editável pela comissão, ex.: `A CUMPRIR` → `CUMPRIDA`; é preservada nas atualizações |
| SÚMULA / MODO | Protocolo da súmula e modo de geração (Regras fixas/IA) |

Os dados são lidos do próprio TXT da nota. Por isso, depois de revisar a
nota e rodar `--gerar-pdf-nota`, o controle é atualizado junto: por exemplo, um
`[A DEFINIR]` decidido passa de `PENDENTE` para `DEFINIDA`, com as partidas.
Uma nova nota da mesma súmula substitui os registros da nota anterior. Punidos
com "sem penalidade adicional" não entram.

Para refazer o controle a partir de todas as notas da pasta, valendo a nota de
maior número de cada súmula:

```powershell
.\.venv\Scripts\python.exe .\main.py --atualizar-controle-punicoes
```

#### PDF do controle

Sempre que o TXT de controle é gravado, o PDF é regerado ao lado dele
(`CONTROLE DE PUNIÇÕES - AEUV.pdf`). Isso acontece após cada nota, ao rodar
`--gerar-pdf-nota` e ao rodar `--atualizar-controle-punicoes`. A geração fica
dentro da gravação do controle, e não no PDF da nota, porque o controle também
muda sem gerar nota (reconstrução, edição da SITUAÇÃO). Assim, TXT e PDF
nunca ficam diferentes. Uma falha no PDF é registrada no log e não interrompe
a análise.

O PDF segue o layout dos demais, em A4 paisagem por causa das colunas:

- cabeçalho e rodapé apenas com o nome da associação, sem campeonato, pois o
  controle reúne todas as competições;
- resumo com registros, punidos, a cumprir, pendentes e rascunhos;
- tabela por competição, com o STATUS colorido;
- ao final, a data e a assinatura do Presidente.

Depois de editar a SITUAÇÃO no TXT, rode `--atualizar-controle-punicoes` para
atualizar o PDF.

### PDF do regulamento

Gera o PDF do regulamento no mesmo layout da Nota Oficial (logomarca,
cabeçalho, rodapé com página) e, ao final, a data, a assinatura digitalizada do
Presidente, o nome da associação e a competição. Informe o nome ou o caminho do
arquivo texto; ele é procurado também na pasta `regulamento\`, com ou sem a
extensão `.txt`:

```powershell
# pelo nome do arquivo (procurado na pasta regulamento\)
.\.venv\Scripts\python.exe .\main.py --gerar-pdf-regulamento regulamento-7-super-liga-união-2026.txt
# sem a extensão .txt
.\.venv\Scripts\python.exe .\main.py --gerar-pdf-regulamento regulamento-7-super-liga-união-2026
# pelo caminho completo
.\.venv\Scripts\python.exe .\main.py --gerar-pdf-regulamento "regulamento\regulamento-7-super-liga-união-2026"
# subtítulo personalizado (padrão: derivado do nome do arquivo -> "7ª SUPER LIGA UNIÃO 2026")
.\.venv\Scripts\python.exe .\regulamento_pdf.py regulamento-7-super-liga-união-2026.txt --titulo "7ª SUPER LIGA UNIÃO 2026"
```

Resultado: `regulamento\regulamento-7-super-liga-união-2026.pdf`.

O PDF é salvo ao lado do arquivo de origem, com o mesmo nome e extensão `.pdf`.
A formatação é automática:

- Linhas curtas iniciadas por emoji (ex.: "🖊️ Inscrições") viram faixas de capítulo.
- `ART X:` vira destaque do artigo.
- `§` tem o rótulo em negrito.
- Incisos (`I –`, `II –`...) saem recuados.

Os emojis são removidos no PDF, pois a fonte não os desenha. Sempre que o
regulamento mudar, basta rodar o comando de novo.
