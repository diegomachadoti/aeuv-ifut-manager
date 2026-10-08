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

### Elencos separados por equipe: integração implementada, produção desabilitada

O sistema interno agora tem uma camada privada de armazenamento por
`campeonatoId` e `equipeId`, com versões de atletas/comissão e publicação
atômica por manifesto e integração funcional atrás de feature gate.
**O cutover não está ativado em produção:** cadastros, consultas,
histórico, índices e consumidores esportivos continuam no armazenamento
anterior. Não basta publicar esta versão para iniciar elencos vazios.

A camada nova não lê, copia, mescla nem apaga os JSONs antigos. Fixtures VM
locais ativam o gate por substituição do literal e exercitam RPCs, histórico,
índice V2, importação, resultados/súmulas, imagens e workers esportivos.
Com gate ativo, os elencos atuais começam vazios; os arquivos antigos ficam
ignorados, não migrados, e são preservados também na exclusão lógica.
Os IDs/registros globais de equipes, jogos e histórico devem ser mantidos.
O código mantém `ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = false`.
Não há limpeza automática, e nenhum dado remoto foi alterado nesta entrega.
Formato e pendências estão no
[guia de elencos particionados](apps-scripts/README.md#elencos-particionados-etapa-inativa).

## Arquivos principais

- `main.py`: fluxo principal
- `sumula_disciplinar.py`: análise das súmulas e geração das notas oficiais
- `sumula_ia.py`: geração da nota oficial por IA (`--ia`)
- `nota_pdf.py`: PDF da nota oficial com a identidade da AEUV (`--gerar-pdf-nota`)
- `regulamento_pdf.py`: PDF do regulamento no mesmo layout, assinado pelo Presidente (`--gerar-pdf-regulamento`)
- `forma_disputa_pdf.py`: PDF da Forma de Disputa com tabelas de fases, rodadas e auditoria (`--gerar-pdf-forma-disputa`)
- `oficio_pdf.py`: modelo TXT editável, PDF de requerimento à Futel e checklist de pendências (`--criar-modelo-oficio`, `--gerar-pdf-oficio`)
- `documento_pdf.py`: PDFs livres e modelos editáveis da ficha, certificado, recibo e Plano de Associado (`--gerar-pdf-documento`, `--gerar-pdf-filiacao`)
- `financeiro_pdf.py`: PDF oficial de Prestação de Contas e Relatório Financeiro nos padrões AEUV e emendas impositivas (`--gerar-pdf-financeiro`)
- `financeiro_planilha.py`: lê os lançamentos da planilha `AEUV - Financeiro` (aba `Movimentacoes`) no Drive, alimentada pelo módulo Financeiro do sistema interno. Exemplos: `python main.py --gerar-pdf-financeiro geral`, `... competicao --origem "SUPER LIGA UNIÃO"`, `... emenda --emenda "Emenda 042/2026"`, com `--periodo 3m|6m|anual` ou `--data-inicio/--data-fim` opcionais
- `controle_punicoes.py`: TXT e PDF de controle com todos os punidos pelas notas oficiais (`--atualizar-controle-punicoes`)
- `resultado_pdf.py`: PDF do resultado de inscrição, remoção e portabilidade, com o status de cada registro em destaque
- `publicacao_drive.py`: publica no Drive regulamentos, formas de disputa e notas oficiais já fechadas (`--publicar-drive`)
- `regulamento\`: texto do regulamento usado na análise disciplinar
- `config.ini`: credenciais, delays e URLs
- `selectors.ini`: seletores Selenium do iFut
- `downloads\`: entrada, processados, falhas e resultados

## Instalação inicial após clonar (Linux e Windows)

O clone traz o código, `config.ini`, `selectors.ini`, regulamentos e modelos.
O ambiente virtual, credenciais, tokens, assinatura digitalizada e arquivos
baixados/gerados precisam ser preparados na máquina; não acompanham o clone.

### 1. Instalar os pré-requisitos e clonar

Recomenda-se **Python 3.13** e **Google Chrome atualizado**. Também é necessário
ter Git para clonar. O projeto baixa o ChromeDriver automaticamente na primeira
execução; mantenha acesso à internet para instalar dependências, acessar o iFut
e autorizar o Google Drive.

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install git python3 python3-venv python3-pip
python3 --version
```

Esses pacotes instalam o Python padrão da distribuição, não necessariamente
3.13. Se você já instalou o Python 3.13 separadamente, use `python3.13` ao criar
a `.venv` e instale o pacote de suporte a `venv` dessa versão, quando necessário.

Instale o Google Chrome pelo [site oficial](https://www.google.com/chrome/).
Para a configuração padrão (`headless = false`), use uma sessão gráfica com
navegador disponível. Em servidor sem interface gráfica, é possível definir
`[selenium] headless = true`, mas a primeira autorização OAuth ainda precisa
de um navegador e do retorno ao servidor local aberto pela automação.

**Windows:** instale Git, Python 3.13 e Google Chrome. Abra o PowerShell.

Em ambos os sistemas, clone e entre na raiz do projeto:

```bash
git clone https://github.com/diegomachadoti/aeuv-ifut-manager.git
cd aeuv-ifut-manager
```

Se já clonou, apenas abra o terminal na pasta que contém `main.py` e
`requirements.txt`. Execute os comandos deste guia sempre nessa pasta: os
caminhos relativos de configuração e recursos dependem dela.

### 2. Criar o ambiente e instalar as dependências

**Linux:**

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
```

**Windows (PowerShell):**

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\requirements.txt
```

Não copie a `.venv` de outra máquina ou sistema operacional: crie um ambiente
novo. Os exemplos de execução abaixo usam **Linux**, com o Python da `.venv`
diretamente, sem precisar ativá-la. No Windows, substitua
`./.venv/bin/python` por `.\.venv\Scripts\python.exe` e use `\` nos caminhos.

No Linux, a ativação é opcional:

```bash
source .venv/bin/activate
python main.py --help
deactivate
```

Depois de ativar, `python` e `pip` apontam para a `.venv`. Sem ativar, continue
usando `./.venv/bin/python`. Não use `.venv/Scripts/python.exe` no Linux.

### 3. Configurar o acesso ao iFut

Crie o arquivo **`config.local.ini`** na raiz do projeto:

```ini
[ifut]
username = seu-email-do-ifut
password = sua-senha-do-ifut
```

Também é possível transferir esse arquivo da máquina antiga por um meio seguro.
Ele contém credenciais e **não deve ser enviado ao Git**. Se utilizar IA,
configure também a chave na seção `[ia]`, conforme
[Segredos e o `config.local.ini`](#segredos-e-o-configlocalini).

O `config.ini` e o `selectors.ini` já acompanham o clone. Revise caminhos
absolutos que possam apontar para a máquina antiga, além das URLs e parâmetros
usados nas rotinas.

### 4. Ajustar os caminhos no Linux

O `config.ini` versionado usa caminhos do Windows. No Linux, `\` **não é um
separador de diretório**: `logs\ifut.log`, por exemplo, vira um arquivo com
esse nome literal, em vez de um arquivo dentro de `logs/`.

Acrescente as seções abaixo ao mesmo `config.local.ini` das credenciais.
Elas substituem os caminhos sem alterar a configuração compartilhada:

```ini
[drive]
download_dir = downloads/inscricoes
processed_dir = downloads/inscricoes/processados
failed_dir = downloads/inscricoes/falhas
results_dir = downloads/inscricoes/resultados

[app]
log_path = logs/ifut.log
dry_run = true

[sumulas]
download_dir = downloads/sumulas
processed_dir = downloads/sumulas/processados
failed_dir = downloads/sumulas/falhas
notas_dir = downloads/sumulas/notas-oficiais
regulamento = regulamento/regulamento-7-super-liga-união-2026
controle_punicoes = downloads/sumulas/CONTROLE DE PUNIÇÕES - AEUV.txt

[ia]
modelo_nota = regulamento/modelo-nota-oficial.txt

[pdf]
logo = assets/logo-aeuv.png
assinatura = assets/assinatura-presidente.png
```

Se uma seção já existir no arquivo, adicione as opções nela, sem repetir o
cabeçalho. Preserve as credenciais de `[ifut]` e eventual chave de `[ia]`.
No Windows, mantenha os caminhos do `config.ini`; a substituição acima é para
Linux. Os exemplos de configuração nas demais seções deste README ainda
mostram caminhos Windows: converta-os para `/` se for usá-los no Linux.

As pastas de saída são criadas pelas rotinas que as utilizam. Para assinar PDFs
finais, transfira por um meio seguro a imagem privada para
`assets/assinatura-presidente.png`; ela não vem no clone. A logo é baixada de
`[pdf] logo_url` se não existir localmente.

> **Atenção:** `dry_run = true` impede salvar inclusões e confirmar
> portabilidades, mas **não impede remoções**, movimentação/publicação no Drive
> ou atualização da planilha. Não trate essa opção como uma simulação sem
> efeitos externos. Antes do fluxo completo, revise as entradas e permissões.

### 5. Configurar o Google Drive

Para usar **OAuth (recomendado)**, coloque o arquivo
**`google-oauth-client.json`** na raiz do projeto. Pode ser o mesmo arquivo de
cliente utilizado na máquina antiga.

Na primeira execução que acessar o Drive, o navegador solicitará autorização
e o sistema criará um novo `google-oauth-token.json`. Autorize uma conta Google
com acesso às pastas e planilhas da associação. Não é necessário copiar o token
da máquina antiga. Consulte [Configurar o OAuth](#configurar-o-oauth-uma-vez)
para obter o arquivo de cliente caso ainda não o tenha.

Se utilizar conta de serviço, transfira o JSON correspondente por um meio
seguro e confira o caminho em `[drive] service_account_json` (o nome atual é
`google-service-account-arte-top-udi.json`). Compartilhe as pastas e a planilha
com o e-mail `client_email` dessa conta, com permissão de Editor para as rotinas
que alteram arquivos. Para publicação de novos arquivos no Drive, prefira OAuth.

Confira se a **Google Drive API** está ativada no projeto Google Cloud das
credenciais. Revise `[drive] folder_embed_url`, `[sumulas] folder_embed_url`,
`[sheets] spreadsheet_id` e as URLs/times do iFut: os valores do clone apontam
para os recursos da associação, não para pastas de teste.

**Não envie os arquivos de credenciais ou tokens ao Git.**

### 6. Conferir a instalação e executar

Confira os comandos disponíveis, sem iniciar o processamento:

```bash
./.venv/bin/python main.py --help
```

Primeiro, teste apenas o login no iFut, **sem sincronizar o Drive**:

```bash
./.venv/bin/python main.py --login-only --process-local-only
```

`--login-only` sozinho sincroniza o Drive antes de fazer login; a combinação
acima dispensa a configuração do Drive para esse primeiro teste e encerra após
o login, sem processar os TXT locais.

Depois de configurar o OAuth, teste somente o download:

```bash
./.venv/bin/python main.py --sync-drive-only
```

Depois, para executar o fluxo completo:

```bash
./.venv/bin/python main.py
```

Para salvar inclusões e confirmar portabilidades de fato, altere
`[app] dry_run = false` no `config.local.ini` após revisar as entradas.

> **Atenção:** o `config.ini` atual utiliza `dry_run = false`. O fluxo completo
> pode realizar alterações reais no iFut, Drive e planilha. Revise as opções no
> `config.local.ini` e as limitações de `dry_run` descritas acima antes de executar.

Os aplicativos **Apps Script continuam rodando no Google**. Não é necessário
reinstalá-los ou republicá-los apenas por mudar a máquina que executa o Python.
A interface web não é um servidor Python local em `localhost`. Para uma
implantação nova dos formulários e sistema interno, siga o
[guia dos aplicativos Apps Script](apps-scripts/README.md).

### Problemas comuns na primeira instalação (Linux)

| Mensagem/sintoma | O que conferir |
| --- | --- |
| `..venvScriptspython.exe: command not found` | Foi usado um comando Windows no Bash. Use `./.venv/bin/python`. |
| `ensurepip is not available` ao criar a `.venv` | Instale `python3-venv` (ou o pacote correspondente à versão escolhida) e crie a `.venv` novamente. |
| `ModuleNotFoundError` | Instale `requirements.txt` com o mesmo Python da `.venv` usado para executar. |
| Credencial `[ifut]` não configurada | Crie `config.local.ini` na raiz com usuário e senha; confira se está executando na raiz do projeto. |
| JSON de credencial não encontrado | Coloque o cliente OAuth na raiz ou ajuste o caminho da conta de serviço; esses arquivos não vêm no clone. |
| `access_denied` no OAuth | Confira a conta autorizada e, se o app estiver em teste, inclua-a como usuário de teste na tela de permissão OAuth. |
| Erro ao abrir o Chrome ou ausência de janela | Confira a instalação do Google Chrome e a sessão gráfica; para execução sem janela, configure `[selenium] headless = true`. |
| Regulamento/assinatura não encontrado ou arquivos com `\` no nome | Aplique as substituições de caminhos Linux da etapa 4 e confira os arquivos de entrada. |
| Erro de acesso à API/pasta/planilha do Drive | Confira a API habilitada, os IDs configurados e as permissões da conta usada no OAuth ou da conta de serviço. |

## Configuração

1. Crie o `config.local.ini` com as credenciais do iFut (veja
   [Segredos](#segredos-e-o-configlocalini) logo abaixo).
2. Crie/edite `config.ini` com os demais parâmetros.
3. Ajuste os parâmetros de `[app]`.
4. Revise o mapa de times em `[teams]`.
5. Complete `selectors.ini` se o site mudar.

### Segredos e o `config.local.ini`

O `config.ini` é versionado no Git, então **não guarda segredo nenhum**. Senhas
e chaves ficam no `config.local.ini`, que está no `.gitignore` e nunca sai da
máquina. Os valores dele sobrepõem os do `config.ini`, seção por seção.

```ini
[ifut]
username = seu-email
password = sua-senha

[ia]
api_key = ...
```

Sem esse arquivo, a automação para logo no início com uma mensagem explicando o
que criar — não há usuário ou senha padrão embutidos no código.

A credencial da service account (`google-service-account-*.json`) segue a mesma
regra: fica só na máquina, fora do repositório.

## Parâmetros do `config.ini`

### `[ifut]`

- `username` e `password` — **apenas no `config.local.ini`**
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

Os comandos usam o Python da `.venv` no **Linux**, a partir da raiz do projeto.
No PowerShell do Windows, substitua `./.venv/bin/python` por
`.\.venv\Scripts\python.exe`. As opções (`--...`) são as mesmas.

Baixar somente os TXT do Drive:

```bash
./.venv/bin/python main.py --sync-drive-only
```

Processar somente os arquivos locais já baixados:

```bash
./.venv/bin/python main.py --process-local-only
```

Testar somente login, sem sincronizar o Drive:

```bash
./.venv/bin/python main.py --login-only --process-local-only
```

Fluxo completo:

```bash
./.venv/bin/python main.py
```

Atualizar somente a quantidade de atletas de todos os times configurados na planilha:

```bash
./.venv/bin/python main.py --update-all-team-counts
```

Gerar relatórios financeiros a partir da planilha do Drive:

```bash
./.venv/bin/python main.py --gerar-pdf-financeiro geral --periodo 3m
./.venv/bin/python main.py --gerar-pdf-financeiro competicao --origem "SUPER LIGA UNIÃO"
./.venv/bin/python main.py --gerar-pdf-financeiro emenda --emenda "Emenda 042/2026"
./.venv/bin/python main.py --gerar-pdf-financeiro geral --data-inicio 01/01/2026 --data-fim 31/03/2026
```

Esses relatórios exigem acesso à planilha `AEUV - Financeiro` no Drive.

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

### PDF do resultado

Junto do TXT a automação grava um **PDF com o mesmo nome**, no mesmo diretório.
Ele usa o layout padrão dos demais documentos (cabeçalho com o escudo, rodapé
com o protocolo e assinatura do presidente) e existe para ser enviado direto ao
representante da equipe, sem precisar abrir um arquivo de texto.

O que o PDF mostra:

- **cabeçalho** com protocolo, equipe, total de registros e a contagem de
  sucessos e falhas;
- **caixa de atenção em vermelho**, logo no começo, listando nome e motivo de
  cada registro que não foi concluído — ela só aparece quando existe falha;
- **tabela de registros**, uma linha por pessoa, com o status em destaque:
  `SUCESSO` em verde e `FALHA` em vermelho, com o fundo da linha acompanhando a
  cor. O cabeçalho da tabela se repete quando ela passa de uma página;
- **elenco atualizado**, apenas com quem entrou de fato (registros em falha
  ficam de fora), seguido do link do time no iFut para conferência.

A geração do PDF acontece depois que o TXT já está gravado e roda dentro de um
`try/except`: se algo falhar ali, o processamento não é invalidado — fica só um
aviso no log, e o PDF pode ser refeito depois pela linha de comando:

```bash
# um arquivo específico (nome completo ou trecho do nome)
./.venv/bin/python resultado_pdf.py CRUZMALTINO-2026-09-24-12-28-59-1790263739846-resultado-20260924-160911.txt
./.venv/bin/python resultado_pdf.py CRUZMALTINO

# todos os resultados já existentes
./.venv/bin/python resultado_pdf.py --todos
```

## Organização do Drive

Todo o material que a automação lê ou escreve fica sob uma única pasta raiz no
Google Drive, **`AEUV - Automação`**. Antes ela estava espalhada pela raiz do
Meu Drive, misturada com pastas pessoais; agrupar facilita achar, compartilhar e
fazer cópia de segurança de tudo de uma vez.

```
AEUV - Automação/
├── Arquivos TXT - Sumulas Digitais/        ← [sumulas] folder_embed_url
│   ├── Entrada/  Processados/  Falhas/     ← a pasta é o status na tela de súmulas
│   ├── Controle de Punicoes/               ← TXT + PDF lidos pelo sistema interno
│   └── Notas Oficiais/                     ← TXT + PDF das notas finais, lidos pelo sistema interno
├── Regulamentos/                           ← PDFs dos regulamentos e formas de disputa, lidos pelo sistema interno
├── PDF - Sumulas Digitais/
├── Anexos - Sumulas Digitais/
├── Arquivos TXT - Inscricoes de Atletas/   ← [drive] folder_embed_url
│   ├── Entrada/  Processados/  Falhas/     ← a pasta é o status na tela de solicitações
│   └── Resultados/                         ← TXT + PDF do resultado, lidos pelo sistema interno
├── Comprovantes PIX - Inscricoes de Atletas/
├── Documentos - Associados/                ← anexos do cadastro de associados
│   └── <EQUIPE>/
├── Comprovantes - Financeiro/              ← comprovantes (NF, recibos, PIX) do módulo financeiro
├── Atas/                                   ← PDFs exportados das reuniões
├── AEUV - Associados                       (planilha do cadastro)
├── AEUV - Financeiro                       (planilha de movimentações financeiras)
├── AEUV - Atas                             (planilha das atas de reuniões)
├── AEUV - Sumula Digital                   (planilha de respostas)
├── AEUV - Respostas - Inscricao, Remocao e Portabilidade
├── 7 SUPER LIGA UNIAO 2026 - CONTROLE FINANCEIRO...xlsx  ← [sheets] spreadsheet_id
└── AEUV Logo.png                           ← [pdf] logo_url
```

A pasta `Google Meet`, criada pelo próprio Google para guardar gravações de
reunião, não faz parte do projeto. Se ela aparecer aqui dentro, mova para fora.

### Como agrupar sem quebrar nada

Mover um item no Drive **não altera o ID nem o nome dele**. Como a automação em
Python usa IDs e os Apps Script procuram as pastas pelo nome, arrastar tudo para
dentro da pasta raiz é seguro e não exige nenhuma alteração de código nem nova
publicação dos WebApps.

1. Crie a pasta `AEUV - Automação` na raiz do Meu Drive.
2. Selecione os itens listados acima e arraste todos para dentro dela. As duas
   últimas linhas (`Documentos - Associados` e `AEUV - Associados`) são criadas
   pelo próprio sistema interno, já no lugar certo.
3. Compartilhe a pasta raiz com quem precisa de acesso, em vez de compartilhar
   pasta por pasta. O compartilhamento é herdado pelo conteúdo. Quem cadastra
   associados pelo sistema interno precisa de **Editor**; quem só consulta,
   de **Leitor**.
4. Compartilhe a pasta raiz também com a service account, como **Editor**. O
   endereço está no campo `client_email` do `google-service-account-*.json`.
   Assim a automação em Python enxerga tudo de uma vez, e um item novo dentro da
   raiz já nasce acessível — sem precisar lembrar de compartilhar de novo.

**Não renomeie as pastas.** Os três Apps Script as localizam pelo nome exato,
gravado em `CONFIG` (`pastaTxt`, `pastaPdf`, `pastaAnexos`, `pastaComprovantes`,
`pastaArquivosTxt`, `punicoes.subpasta`). Renomear no Drive sem atualizar o
`CONFIG` e republicar faz os formulários criarem uma pasta nova e vazia.

### Cuidado com pastas duplicadas

Quando não encontram a pasta pelo nome, os Apps Script **criam uma nova na raiz
do Meu Drive** em vez de falhar. É um comportamento proposital (o formulário
nunca perde um envio), mas silencioso: os arquivos novos passam a cair fora da
pasta raiz e ninguém percebe. Se aparecer uma pasta com nome conhecido solta na
raiz do Drive, mova o conteúdo de volta para a pasta original — a que tem o ID
usado no `config.ini` — e apague a duplicata.

Vale o mesmo cuidado ao criar pastas: a busca por nome é global no Drive, então
dois itens com o mesmo nome deixam o resultado imprevisível.

## Fluxo de sincronização com Google Drive

### Estrutura de pastas esperada no Drive

```
Arquivos TXT - Inscricoes de Atletas/   (folder_embed_url)
├── Entrada/          (arquivos a processar)
├── Processados/      (arquivos processados com sucesso)
├── Falhas/           (arquivos que falharam)
└── Resultados/       (TXT + PDF do resultado de cada processamento)
```

As três últimas pastas são criadas pela automação na primeira execução, caso
ainda não existam.

Essa pasta fica dentro de `AEUV - Automação` (veja
[Organização do Drive](#organização-do-drive)). A pasta das súmulas segue a
mesma divisão, configurada em `[sumulas] folder_embed_url`.

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

**Nos dois casos**, o resultado é publicado no Drive:
```
Local:   downloads/inscricoes/resultados/ARQUIVO-resultado-<carimbo>.txt (e .pdf)
Drive:   Resultados/ARQUIVO-resultado-<carimbo>.txt (e .pdf)
```

É essa publicação que permite à tela **Solicitações de Inscrições** do sistema
interno abrir o resultado — e mostrar o motivo de cada falha — ao lado da
solicitação. A publicação roda mesmo quando o processamento falha, e um erro
no envio não invalida a execução: o arquivo local continua gravado.

### Sincronização e processamento

1. **`main.py` (fluxo completo)**
   - ✅ Baixa arquivos de `Entrada/` do Drive (via service account)
   - ✅ Processa cada arquivo
   - ✅ Move local para `processados/` ou `falhas/`
   - ✅ Move no Drive para `Processados/` ou `Falhas/`
   - ✅ Publica o TXT e o PDF do resultado em `Resultados/` no Drive

2. **`main.py --sync-drive-only`**
   - ✅ Apenas baixa de `Entrada/` do Drive
   - ❌ Não processa, não move

3. **`main.py --process-local-only`**
   - ❌ Não sincroniza do Drive
   - ✅ Processa apenas arquivos locais em `downloads/`
   - ⚠️ Move local, mas não move no Drive (usar com cuidado)

4. **`main.py --login-only`**
   - ✅ Sincroniza os TXT do Drive, faz login e encerra
   - Para apenas fazer login, sem sincronizar, combine com `--process-local-only`

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

```bash
./.venv/bin/python main.py --update-all-team-counts
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
3. **Resultado**: Salva o TXT com o resultado da execução e gera o PDF correspondente
4. **Sincronização**: Move arquivo processado (Processados/Falhas no Drive)
5. **Planilha** (opcional): Atualiza planilha de controle com dados (não impede sucesso se falhar)

Essa movimentação é o que alimenta a tela **Solicitações de Inscrições** do
[sistema interno](apps-scripts/README.md#solicitações-de-inscrições): a pasta em que
o arquivo está é o status exibido para a diretoria, sem nada a sincronizar.

O mesmo vale para as súmulas: a análise disciplinar move o TXT enviado pela
arbitragem entre `Entrada`, `Processados` e `Falhas`, e é daí que a tela
**Súmulas Enviadas** do
[sistema interno](apps-scripts/README.md#súmulas-enviadas) tira a situação de
cada envio.

## Observações

- `--process-local-only` usa apenas os TXT já existentes em `downloads\`.
- Com o cliente OAuth ou a conta de serviço disponível, a API do Google Drive gerencia sincronização e movimentação automática.
- Sem credencial disponível, o download de inscrições usa scraping público (lento) e não consegue mover arquivos no Drive; isso não substitui as credenciais exigidas pelas demais rotinas.
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

```bash
./.venv/bin/python main.py --analisar-sumulas
# ou somente com arquivos já baixados em downloads/sumulas
./.venv/bin/python main.py --analisar-sumulas --process-local-only
# gerando a nota com IA (Gemini/OpenAI) em vez das regras fixas
./.venv/bin/python main.py --analisar-sumulas --ia
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

```bash
# pelo número da nota
./.venv/bin/python main.py --gerar-pdf-nota 5
# pelo protocolo da súmula (usa a nota de maior número dessa súmula)
./.venv/bin/python main.py --gerar-pdf-nota SUM-20260925-BAE8C370
# pelo caminho do TXT
./.venv/bin/python main.py --gerar-pdf-nota "downloads/sumulas/notas-oficiais/NOTA OFICIAL Nº 005-2026 – COMISSÃO DISCIPLINAR - CRUZMALTINOxTRK.txt"
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

A coluna `SÚMULA` é o que liga a punição ao envio da arbitragem. O sistema
interno usa esse par `NOTA` + `SÚMULA` para navegar de uma tela à outra —
[Súmulas Enviadas](apps-scripts/README.md#súmulas-enviadas) mostra a decisão
que a súmula gerou, e o [controle de punições](apps-scripts/README.md#controle-de-punições)
leva de volta ao relato que a motivou.

Para refazer o controle a partir de todas as notas da pasta, valendo a nota de
maior número de cada súmula:

```bash
./.venv/bin/python main.py --atualizar-controle-punicoes
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

#### Publicação no Drive para o sistema interno

A cada gravação, o TXT e o PDF do controle são enviados para a subpasta
**`Controle de Punicoes`**, criada dentro da pasta das súmulas no Drive
(`[sumulas] folder_embed_url`). É dessa cópia que a tela **Controle de
punições** do [sistema interno](apps-scripts/README.md#sistema-interno) lê os
dados, em `portal.aeuv.org/sistema/`.

Com o [acesso OAuth configurado](#quem-a-automação-é-quando-fala-com-o-drive),
a subpasta e os arquivos são criados automaticamente. Sem ele, a automação
depende da conta de serviço, que só consegue **atualizar** arquivos: nesse caso
a primeira cópia de cada arquivo precisa ser enviada uma vez pelo navegador
(arraste o TXT e o PDF de `downloads\sumulas\` para a subpasta). Enquanto isso
não for feito, o log traz o aviso com o endereço da pasta e o fluxo segue
normalmente — o controle local continua correto.

Quem for consultar a tela no sistema interno precisa ter acesso de leitura à
pasta das súmulas no Drive, porque o aplicativo é executado com a permissão de
quem abriu a página.

### PDF do regulamento

Gera o PDF do regulamento no mesmo layout da Nota Oficial (logomarca,
cabeçalho, rodapé com página) e, ao final, a data, a assinatura digitalizada do
Presidente, o nome da associação e a competição. Informe o nome ou o caminho do
arquivo texto; ele é procurado também na pasta `regulamento\`, com ou sem a
extensão `.txt`:

```bash
# pelo nome do arquivo (procurado na pasta regulamento/)
./.venv/bin/python main.py --gerar-pdf-regulamento regulamento-7-super-liga-união-2026.txt
# sem a extensão .txt
./.venv/bin/python main.py --gerar-pdf-regulamento regulamento-7-super-liga-união-2026
# pelo caminho completo
./.venv/bin/python main.py --gerar-pdf-regulamento "regulamento/regulamento-7-super-liga-união-2026"
# subtítulo personalizado (padrão: derivado do nome do arquivo -> "7ª SUPER LIGA UNIÃO 2026")
./.venv/bin/python regulamento_pdf.py regulamento-7-super-liga-união-2026.txt --titulo "7ª SUPER LIGA UNIÃO 2026"
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

Para gerar e publicar a forma de disputa, informe o nome do arquivo (procurado
automaticamente na pasta `formadisputa\`):

```bash
./.venv/bin/python main.py --gerar-pdf-forma-disputa "forma-disputa-7-super-liga-união-2026-3-rodadas"
```

O PDF gerado ao lado do texto também é publicado na subpasta `Regulamentos`,
onde aparece na tela de consulta do sistema interno.

## Publicação no Drive

As telas **Regulamentos** e **Notas oficiais** do
[sistema interno](apps-scripts/README.md#regulamentos) só enxergam o que está no
Drive. Quem leva os arquivos para lá é `publicacao_drive.py`:

| Artefato | Vai para | Quando |
| --- | --- | --- |
| PDF do regulamento | `AEUV - Automação/Regulamentos/` | ao rodar `--gerar-pdf-regulamento` |
| PDF da forma de disputa | `AEUV - Automação/Regulamentos/` | ao rodar `--gerar-pdf-forma-disputa` |
| Nota oficial (TXT + PDF) | `Arquivos TXT - Sumulas Digitais/Notas Oficiais/` | ao rodar `--gerar-pdf-nota` |

Ou seja, a publicação acontece no momento em que o documento final é gerado, e
não exige um passo a mais. Para reenviar tudo de uma vez — na primeira carga,
ou depois de revisar várias notas — existe o comando em lote:

```bash
./.venv/bin/python main.py --publicar-drive
```

**Só nota final é publicada.** Enquanto o texto tiver marcadores
`[A DEFINIR PELA COMISSÃO]` ou divergências apontadas pela IA, ela fica apenas
na máquina de quem gerou — o mesmo critério que faz o PDF sair com a marca
d'água RASCUNHO. Assim a diretoria nunca abre a tela e lê uma decisão que ainda
pode mudar.

Nenhum ID novo entra no `config.ini`: as duas pastas são descobertas a partir do
`[sumulas] folder_embed_url` (o ID da URL é a pasta das súmulas, e a pasta pai
dela é a raiz `AEUV - Automação`). O Apps Script segue a mesma regra, então os
dois lados continuam apontando para o mesmo lugar sozinhos. Arquivo que já
existe é **atualizado**, não duplicado.

### Quem a automação é quando fala com o Drive

Há duas credenciais possíveis, e a diferença entre elas decide o que a
automação consegue fazer:

| | Conta de serviço | OAuth (recomendado) |
| --- | --- | --- |
| Atualizar arquivo que já existe | sim | sim |
| Criar arquivo novo | **não** (`storageQuotaExceeded`) | sim |
| Criar pasta | vira dona dela, e a pasta **some** do Drive de todos | sim, e você é o dono |

A conta de serviço **não tem cota de armazenamento própria** — ela não é uma
pessoa, não tem um Drive. Por isso não cria nada. E o que ela cria fica
registrado com ela como dona, o que é pior do que falhar: a pasta existe, mas
não aparece para ninguém.

Com OAuth a automação age como **você**, usando a sua cota. Ela cria as pastas
e envia os arquivos sozinha, sem nenhum passo manual.

A escolha da credencial é feita num lugar só — `drive_auth.py` — e vale para
**todos** os fluxos que falam com o Drive: download de inscrições e súmulas,
pastas `Entrada`/`Processados`/`Falhas`/`Resultados`, TXT e PDF de resultado,
planilha financeira, controle de punições, notas oficiais e regulamentos. Basta
o `google-oauth-client.json` existir para o OAuth entrar no lugar da conta de
serviço em todos eles.

#### Configurar o OAuth (uma vez)

No [Google Cloud Console](https://console.cloud.google.com/), projeto
`arte-top-udi`:

1. **APIs e serviços → Biblioteca**: ative a **Google Drive API**, se ainda
   não estiver habilitada.
2. **APIs e serviços → Tela de permissão OAuth**: tipo **Externo**. Preencha
   nome do app, e-mail de suporte e de contato. Em **Público-alvo**, clique em
   **Publicar app** (sem isso a autorização vence a cada 7 dias). Se mantiver
   em teste durante a configuração, cadastre a conta que vai autorizar como
   usuário de teste.
3. **Credenciais → Criar credenciais → ID do cliente OAuth**, tipo
   **App para computador**. Baixe o JSON.
4. Salve o arquivo na raiz do projeto como **`google-oauth-client.json`**.

Na primeira execução o navegador abre pedindo autorização. Como o app não passou
pela verificação do Google, aparece o aviso *"O Google não verificou este app"* —
é o seu próprio app: clique em **Avançado → Acessar (não seguro)**. Isso acontece
uma única vez; o token fica em `google-oauth-token.json` e é renovado sozinho.

Nenhum dos dois arquivos vai para o Git. Enquanto o `google-oauth-client.json`
não existir, tudo continua funcionando pela conta de serviço — só com a
limitação de não criar nada novo, caso em que a automação avisa quais arquivos
você precisa copiar à mão.

> **Não renomeie as pastas do Drive**: tanto o Python quanto o Apps Script as
> localizam pelo nome exato.

## Ofício / requerimento de autorização à Futel

Modelo baseado nas exigências de `oficio-requerimento/Futel.EspaçoPublico.doc`,
com a identidade AEUV e os dados iniciais da 7ª Super Liga União 2026.
O fluxo é local: não publica documentos pessoais nem protocola o pedido.

Na raiz do projeto, em PowerShell:

```powershell
python main.py --criar-modelo-oficio "oficio-requerimento/oficio-futel-001-2026.txt"
python main.py --gerar-pdf-oficio "oficio-requerimento/oficio-futel-001-2026.txt"
```

O TXT pode ser editado e o segundo comando executado novamente para atualizar
o PDF. Um arquivo `.pendencias.txt` informa dados faltantes, links provisórios,
documentação posterior e cuidados com o prazo e o protocolo. O PDF sai sempre
como **versão final, sem marca de rascunho e com a assinatura do Presidente**,
mesmo com pendências de preenchimento. Revise o checklist antes de protocolar.
Logo e imagem da assinatura devem estar disponíveis; datas e formato inválidos
continuam sendo recusados.

Os anexos usam tabelas alinhadas à esquerda, com links curtos clicáveis
“Abrir documento” / “Abrir pasta”, sem exibir URLs longas. Os links provisórios
ficam como “A disponibilizar”, mantendo o endereço editável no TXT.

A opção `--oficio-final` é desnecessária e continua aceita por compatibilidade. Veja o
[guia do ofício Futel](oficio-requerimento/README.md) para o formato do TXT,
exigências por fase e informações ainda necessárias. Os links do Drive não são
validados remotamente nem substituem automaticamente a entrega de cópias.

## Documentos livres e plano de filiação de equipes

Modelos baseados na ata de 07/10/2026: **ficha de filiação com termo de
responsabilidade**, **certificado de filiação**, **recibo da taxa anual** e
**Plano de Associado para divulgação**.
Os TXTs editáveis e PDFs ficam em `filiacao/`; os modelos originais ficam em
`filiacao/modelos/`. Após alterar os dados ou o texto, regenere os quatro:

```powershell
python main.py --gerar-pdf-filiacao todos
```

Ou apenas um:

```powershell
python main.py --gerar-pdf-filiacao ficha
python main.py --gerar-pdf-filiacao certificado
python main.py --gerar-pdf-filiacao recibo
python main.py --gerar-pdf-filiacao plano
```

O plano público reúne benefícios, requisitos, documentos, valores anuais e
etapas da filiação. Edite valores/contatos em `[dados]` e o texto livre de
`filiacao/plano-associado.txt`; o comando `plano` atualiza
`filiacao/plano-associado.pdf`. O material não expõe dados pessoais ou assinatura
do Presidente, não comprova filiação e não promete repasses financeiros.

Para outra equipe, crie cópias sem sobrescrever as atuais e gere pelos caminhos:

```powershell
python main.py --criar-modelos-filiacao "filiacao/equipe-nova"
python main.py --gerar-pdf-documento "filiacao/equipe-nova/ficha-filiacao.txt" "filiacao/equipe-nova/certificado-filiacao.txt" "filiacao/equipe-nova/recibo-filiacao.txt"
```

Taxa anual: **R$ 150,00 no primeiro ano**, **R$ 100,00 nas renovações**. A carta
de desligamento é exigida somente quando houver vínculo anterior com outra
associação varzeana. A ficha tem assinatura manual da equipe; certificado e
recibo usam a assinatura do Presidente da AEUV.

Não há regras de rascunho, bloqueios de aprovação/pagamento ou publicação no
Drive: o conteúdo é livre e a conferência cabe ao emissor. O mesmo comando
`--gerar-pdf-documento` pode gerar outros documentos no padrão AEUV.
Veja o [guia de documentos de filiação](filiacao/README.md) para editar campos,
texto e taxas e para os cuidados de emissão de certificados e recibos.
