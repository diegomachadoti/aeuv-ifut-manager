# Aplicativos Google Apps Script da AEUV

Este diretório reúne os aplicativos Web da AEUV desenvolvidos com Google Apps
Script (GAS): dois formulários públicos e o sistema interno da associação. O
formulário de inscrição, remoção e portabilidade produz os arquivos TXT de
solicitação que servem de entrada para a automação Python. Os projetos Web e o
processamento Python são aplicações distintas, conectadas por esses arquivos no
Google Drive.

| Aplicativo | Diretório | Para que serve |
| --- | --- | --- |
| **Inscrição, remoção e portabilidade** | `inscricao-portabilidade/` | Receber solicitações para atletas e comissão técnica, salvar comprovantes e gerar arquivos TXT. |
| **Súmula digital** | `sumula-digital/` | Registrar relatórios de arbitragem e gerar arquivos TXT e PDF. |
| **Sistema interno** | `sistema-interno/` | Área restrita da associação, com login Google e menu das funcionalidades internas. |

Cada aplicativo é um projeto GAS independente. **Não combine os arquivos das
pastas em um único projeto:** todos declaram `doGet()` e funções auxiliares com
nomes iguais.

> **Integração com Python:** após o envio, o formulário de inscrição salva o
> TXT na pasta `Arquivos TXT - Inscricoes de Atletas`. Para processamento
> automático, esse arquivo também precisa estar na pasta `Entrada` da estrutura
> do Drive configurada no `config.ini` do projeto Python. A movimentação entre
> essas pastas não é feita pelo formulário Web. O TXT da súmula digital
> (`Arquivos TXT - Sumulas Digitais`) é lido pelo comando
> `main.py --analisar-sumulas`, que gera o rascunho da Nota Oficial com base no
> regulamento. Consulte o [README da automação Python](../README.md) para configurar
> a pasta de entrada e executar o processamento.

## Conteúdo

- [Endereços publicados](#endereços-publicados)
- [Publicação e permissões](#publicação-e-permissões)
- [Inscrição, remoção e portabilidade](#inscrição-remoção-e-portabilidade)
- [Súmula digital](#súmula-digital)
- [Sistema interno](#sistema-interno)
- [Operação e manutenção](#operação-e-manutenção)

## Endereços publicados

| Aplicativo | Link de divulgação | URL da implantação (Apps Script) |
| --- | --- | --- |
| Inscrição, remoção e portabilidade | https://portal.aeuv.org/inscricao/ | `https://script.google.com/macros/s/AKfycbyP2WRKuyR9dbF4HVUFM14_p-exiNoPlQFyOlIx05_BBzcNkCR_fS7ruxXhtQ0rsnDBbg/exec` |
| Súmula digital | https://portal.aeuv.org/sumula/ | `https://script.google.com/macros/s/AKfycbyTkmXq4OU_aCO7uZazbnY2jM95pTRzAVbna8_4b2Cy2TSQfq76uUpXh46LQ47eSRtQsA/exec` |
| Sistema interno | https://portal.aeuv.org/sistema/ | `https://script.google.com/macros/s/AKfycbwKfTZWMkmv80XbwvmfNyRHltEUFGOYQ3srJz9TKODKvbL5nu5FTuB5YR7KJ_3jwF7weg/exec` |

Divulgue sempre o link de `portal.aeuv.org`, que exibe a logomarca e o nome
da associação na prévia do compartilhamento e encaminha para a implantação
correspondente. As URLs do Apps Script continuam válidas para acesso direto e
para testes. Veja [Ícone da aba e prévia do link](#ícone-da-aba-e-prévia-do-link).

O subdomínio é definido pelo arquivo `docs/CNAME` e vale para o site inteiro do
GitHub Pages — o repositório aceita **um único** domínio personalizado. Trocar o
nome do subdomínio depois exige apenas editar esse arquivo, criar o CNAME
correspondente no provedor de DNS e atualizar a tabela acima; os caminhos
`/inscricao/`, `/sumula/` e `/sistema/` permanecem iguais.

## Publicação e permissões

Repita estes passos para cada aplicativo:

1. Crie um projeto independente em [Google Apps Script](https://script.google.com/).
2. Copie `WebApp.gs` para um arquivo de script e cada `.html` da pasta para um
   arquivo HTML de mesmo nome (`Index`, e no sistema interno também `Estilos`,
   `Negado` e `Ponte`).
3. Autorize os serviços solicitados. Os projetos usam Google Sheets e Drive;
   a súmula também usa Google Docs para gerar o PDF. No sistema interno,
   copie também o `appsscript.json`: ele declara os escopos OAuth, e sem o
   escopo do Drive a leitura do controle de punições falha mesmo com as pastas
   compartilhadas.
4. Siga as instruções de preparação específicas do aplicativo.
5. Publique como **Aplicativo da Web**, escolhendo a conta executora e o público
   autorizado de acordo com a tabela abaixo.
6. Após qualquer alteração, publique uma nova versão e compartilhe a URL da
   implantação atualizada.

| Aplicativo | Executar como | Quem tem acesso |
| --- | --- | --- |
| Inscrição, remoção e portabilidade | Eu (dono do projeto) | Qualquer pessoa |
| Súmula digital | Eu (dono do projeto) | Qualquer pessoa |
| Sistema interno | **Usuário que acessa o app da web** | **Qualquer pessoa com Conta do Google** |

A combinação do sistema interno não é opcional: só o modo "Usuário que acessa"
entrega o e-mail de quem abriu a página, e é esse e-mail que o servidor compara
com a lista de autorizados. Publicado como "Eu", o sistema não identifica
ninguém e bloqueia todo mundo.

Os três aplicativos permitem incorporação em outras páginas
(`XFrameOptionsMode.ALLOWALL`), recurso usado pelas páginas do domínio da
associação. A conta executora precisa manter acesso às planilhas, pastas e
imagens utilizadas.

### Ícone da aba e prévia do link

Os três projetos definem o ícone da aba do navegador pela chave `faviconUrl`,
aplicada com `setFaviconUrl()` no `doGet()`. A URL precisa ser pública e
terminar na extensão da imagem; links do Drive (`thumbnail?id=...`) não
funcionam nesse campo. Por padrão a chave aponta para `assets/logo-aeuv.png`
deste repositório. Uma tag `<link rel="icon">` escrita direto no `Index.html` é
ignorada pelo Apps Script.

Já a prévia exibida ao compartilhar o link (WhatsApp, Instagram e afins) vem das
tags Open Graph da página, e o Apps Script não permite incluí-las: o formulário é
servido dentro de uma página do Google e `addMetaTag()` só aceita tags como
`viewport`. Para contornar isso, a pasta `docs/` deste repositório traz três
páginas de entrada com as tags `og:image` e `og:title` da associação:

- `docs/inscricao/index.html`
- `docs/sumula/index.html`
- `docs/sistema/index.html`

Essas páginas já estão publicadas no GitHub Pages (pasta `docs/` do branch
`master`) e respondem no domínio da associação, conforme a tabela de
[endereços publicados](#endereços-publicados).

As duas páginas dos **formulários** abrem o aplicativo em um `iframe` que ocupa
a tela inteira e começa a carregar junto com a página, escondido atrás de uma
tela de carregamento com a logomarca da AEUV. Enquanto espera, a tela mostra um
anel girando ao redor da logomarca, uma barra de progresso e o nome da etapa em
andamento ("Conectando ao servidor", "Carregando o aplicativo", "Montando os
campos do formulário" e "Quase pronto"). A barra avança desacelerando até 98% ao
longo de 20 segundos, que é o tempo típico do Apps Script, e só completa quando o
formulário fica de fato pronto; então a tela de carregamento desaparece em
transição suave. Assim o usuário vê uma única espera, e não o encadeamento de
duas páginas em branco do redirecionamento. O endereço na barra continua sendo o
da associação. Não há limite de tempo nem atalho alternativo: a página aguarda o
carregamento terminar normalmente, mesmo que o Apps Script demore mais que o
previsto.

A página do **sistema interno** usa o mesmo `iframe`, mas com uma diferença: a
tela de login do Google envia `X-Frame-Options` e se recusa a aparecer dentro de
um quadro. Para contornar isso, a página embute o sistema com `?origem=portal` e
espera um aviso de que ele realmente abriu — o próprio aplicativo envia
`postMessage({ aeuv: 'sistema-pronto' })` ao topo da janela, pelo arquivo
`Ponte.html`. Chegando o aviso, o quadro aparece e o endereço continua sendo o da
associação. Se o aviso não chegar em 9 segundos, sinal de que o visitante ainda
não entrou na Conta Google: aí a página navega na própria aba para
`?origem=direto`, para que a tela de login apareça normalmente. Esse parâmetro
também evita o vaivém, porque o sistema só devolve a navegação ao portal quando
`origem` vem vazio, ou seja, quando alguém abriu a URL do Apps Script
diretamente. A barra de progresso aqui é indeterminada, já que o tempo depende da
sessão do Google, e a página traz `robots: noindex, nofollow` por ser área
restrita.

Pontos de manutenção:

- A URL `/exec` de cada aplicativo fica na constante `URL_FORMULARIO` (páginas
  dos formulários) ou `URL_SISTEMA` (página do sistema interno). Publicar uma
  **nova versão** da mesma implantação mantém a URL; criar uma **nova
  implantação** gera outra URL e exige atualizar a página.
- O tempo estimado usado pela barra de progresso fica na constante
  `DURACAO_ESTIMADA`, em milissegundos. Ele só controla a animação: a tela de
  carregamento some pelo evento `load` do `iframe`, não pelo relógio.
- No sistema interno o equivalente é `LIMITE_QUADRO`: o prazo de espera pelo
  aviso antes de cair para a navegação na própria aba.
- O `iframe` depende de `XFrameOptionsMode.ALLOWALL` no `doGet()` dos três
  aplicativos. Nos formulários depende ainda de a implantação estar publicada
  para acesso sem login; no sistema interno, do include `<?!= include_('Ponte')
  ?>` nas telas `Index` e `Negado`, que é quem envia o aviso.
- As animações são desligadas automaticamente para quem usa a preferência de
  redução de movimento do sistema.
- O arquivo `docs/CNAME` fixa o domínio `portal.aeuv.org`. Ele corresponde
  a um registro CNAME no DNS do domínio apontando para `diegomachadoti.github.io`
  e não interfere no site da associação, que continua no Wix.
- **Para trocar o subdomínio:** crie o novo registro CNAME no provedor de DNS e
  espere ele resolver; só então altere o campo *Custom domain* em
  **Settings → Pages** do repositório, que reescreve o `docs/CNAME`. Atualize
  também a tabela de endereços acima e as URLs dos módulos em `MODULOS`
  (`sistema-interno/WebApp.gs`). O GitHub Pages responde por **um único**
  domínio: assim que o novo entra no ar, o anterior passa a devolver 404, sem
  redirecionamento. Avise quem já tinha o link antigo salvo.

> **Privacidade:** os formulários coletam dados pessoais, incluindo CPF,
> documento do árbitro e comprovantes de pagamento. Restrinja o acesso aos
> aplicativos e aos arquivos gerados ao necessário para a operação. A opção de
> publicar um formulário para acesso público não torna automaticamente seguros
> ou públicos os arquivos associados.

## Pastas no Drive

Todas as pastas e planilhas usadas pelos três aplicativos ficam agrupadas sob a
pasta raiz **`AEUV - Automação`**, no Drive da associação, junto com o material
da automação em Python. A lista completa está em
[Organização do Drive](../README.md#organização-do-drive), no README principal.

| Nome da pasta | Usada por |
| --- | --- |
| `Arquivos TXT - Sumulas Digitais` | Súmula digital (TXT) e sistema interno (punições) |
| `PDF - Sumulas Digitais` | Súmula digital |
| `Anexos - Sumulas Digitais` | Súmula digital |
| `Arquivos TXT - Inscricoes de Atletas` | Inscrição, remoção e portabilidade e sistema interno (solicitações) |
| `Comprovantes PIX - Inscricoes de Atletas` | Inscrição, remoção e portabilidade |
| `Documentos - Associados` | Sistema interno (cadastro de associados) |

Os nomes são procurados **pelo nome exato**, gravado em `CONFIG` de cada
projeto. Duas consequências práticas:

- **Não renomeie nem mova o conteúdo entre pastas.** Mover a pasta inteira é
  seguro (o nome e o ID não mudam); renomeá-la sem atualizar o `CONFIG` e
  republicar não é.
- **Não crie outra pasta com o mesmo nome.** A busca do `DriveApp` varre o Drive
  inteiro, e o aplicativo fica com a primeira que encontrar.

Quando não acha a pasta, o aplicativo **cria uma nova na raiz do Meu Drive** em
vez de falhar — nenhum envio se perde, mas o arquivo vai parar fora do lugar
sem aviso. Se surgir uma dessas pastas soltas na raiz, mova o conteúdo de volta
para a pasta original e apague a duplicata.

## Inscrição, remoção e portabilidade

### O que o formulário recebe

Cada envio reúne os dados gerais — competição, equipe, responsável e
telefone/WhatsApp — e inclui de 1 a 30 pessoas. Para cada pessoa, seleciona-se:

| Campo | Regras |
| --- | --- |
| Ação | Inclusão, remoção ou portabilidade |
| Tipo | Atleta ou comissão técnica |
| Nome completo | Obrigatório para todas as ações |
| Nascimento e CPF | Obrigatórios na inclusão; opcionais nas demais ações. Nascimento é digitado com máscara `dd/mm/aaaa` e enviado ao servidor como `aaaa-mm-dd`; no TXT sai `dd-mm-aaaa` |
| Competição anterior | Obrigatória na portabilidade |

O envio também exige um comprovante Pix e a confirmação de pagamento, do termo
médico, do regulamento e da autorização para fornecer os dados. Esses requisitos
valem para todas as ações.

**Competições disponíveis:** Copa America, Super Liga União, Copa Metropolitana
e Copa Premier. O formulário inicia com Super Liga União selecionada.

**Competições anteriores para portabilidade:** Copa Metropolitana; 4° Super
Liga União 99 Bet 2023; 2° Copa Metropolitana 2023; Recopa 2023; Super Liga
União 2024; 4º Copa Metropolitana 2025; 6º Super Liga União 2025; 5º Copa
Metropolitana; 3º Copa Premier 2026; 2º Copa America 2026; 7º Super Liga União
2026.

**Equipes configuradas:** AJAX, BEATS, BOCA JRS, CRUZMALTINO, INTEGRAÇÃO,
KADOSH, LEÕES DO MORUMBI, ONZE GAROTOS, PEQUIS, RIVER,
TRANSNANE/BRASILIENSE, TRK, UNIÃO, UNIAO SANTA MARIA, OLHOS DÁGUA, VENUS,
FUT ART e REAL PREDADOR.

### Validações e limites

O navegador oferece máscaras de telefone e CPF e valida os campos antes do
envio. O servidor repete as validações: verifica competição e equipe, exige
telefone com DDD e 11 dígitos, valida datas de nascimento entre 01/01/1900 e
hoje e exige CPF de 11 dígitos para inclusão. Se CPF ou nascimento forem
informados em remoção ou portabilidade, também são validados.

O comprovante pode ser PDF, JPG/JPEG, PNG ou WEBP e deve ter até 5 MB. A
declaração de pagamento é armazenada, mas o aplicativo **não verifica a
transação Pix**. A validação do CPF considera somente a quantidade de dígitos,
não os dígitos verificadores.

### Preparação do aplicativo

Antes da publicação, confira `WEBAPP_CONFIG` em `WebApp.gs`:

| Configuração | Uso |
| --- | --- |
| `spreadsheetId`, `spreadsheetName`, `sheetName` | Planilha de respostas e aba `Inscricoes_Web` |
| `competicoes`, `competicoesPortabilidade`, `equipes` | Opções aceitas pelo servidor; mantenha-as alinhadas ao HTML |
| `cnpjPix`, `regulamentoUrl` | Informações exibidas no formulário |
| `valorPorAtleta` | Está definido, mas não é exibido nem usado para calcular ou validar o pagamento |
| `pastaComprovantes`, `pastaArquivosTxt` | Nomes das pastas de arquivos no Drive |
| `maxPessoas`, `maxArquivoBytes` | Limites de registros e do comprovante |

Execute `prepararAplicativo()` uma vez pelo editor, usando a conta proprietária.
A função solicita permissões, localiza ou cria a planilha, localiza ou cria as
pastas de comprovantes e TXT, grava os IDs nas propriedades do script e prepara
a aba `Inscricoes_Web`.

Se a planilha indicada não puder ser aberta, a rotina procura outra com o nome
configurado; se não encontrar, cria uma nova. Confirme a planilha, os IDs e as
permissões resultantes antes de publicar.

### Processamento de um envio

1. O servidor valida os dados e adquire um bloqueio de script para coordenar
   envios simultâneos.
2. Gera um protocolo no formato `AAAAMMDD-XXXXXXXX`, salva o comprovante e
   cria o TXT no Drive.
3. Acrescenta uma linha por pessoa à aba `Inscricoes_Web`.
4. Retorna o protocolo e o conteúdo do TXT. O navegador baixa uma cópia local
   e mostra o protocolo e a quantidade de pessoas registradas.

O comprovante recebe um nome iniciado pelo protocolo. O TXT inclui os dados
gerais, as confirmações e um bloco `REGISTRO` por pessoa, com ação, tipo, nome,
nascimento, CPF e competição anterior. Campos não aplicáveis aparecem como
`NAO NECESSARIO`; o nome do arquivo contém equipe e data/hora.

**Colunas de `Inscricoes_Web` (19):** data/hora, protocolo, competição, equipe,
responsável, telefone/WhatsApp, número do registro, ação, tipo, nome completo,
nascimento, CPF, competição anterior, URL do comprovante, pagamento, termo
médico, regulamento, autorização e URL do TXT. O CPF é salvo apenas com
dígitos. Pessoas do mesmo envio compartilham protocolo, data/hora e comprovante.

| Arquivo ou registro | Destino |
| --- | --- |
| Comprovantes Pix | `Comprovantes PIX - Inscricoes de Atletas` |
| TXT gerado | `Arquivos TXT - Inscricoes de Atletas` |
| Respostas | Planilha configurada, aba `Inscricoes_Web` |

Os IDs das pastas ficam nas propriedades do script. Se um ID não estiver
configurado ou não puder ser usado, o aplicativo procura uma pasta com o nome
definido e, se necessário, cria uma.

## Súmula digital

### O que o formulário recebe

O formulário registra árbitro e documento; os dois times da partida, data e
horário; relato dos fatos; envolvidos opcionais; anexos opcionais; assinatura
desenhada e declaração de responsabilidade.

A assinatura é desenhada no próprio canvas, com mouse no computador ou com o
dedo no celular e no tablet. O campo se redimensiona ao tamanho real da tela e à
densidade do aparelho, de modo que o traço sai na mesma espessura em qualquer
dispositivo, e o desenho é preservado ao girar a tela. Enquanto o árbitro assina,
a rolagem da página fica bloqueada sobre o campo. Navegadores sem suporte a
eventos de ponteiro usam automaticamente os eventos de toque e de mouse.

Árbitro, documento, times, data, horário, relato, assinatura e confirmação são
obrigatórios. Os times devem ser diferentes. A interface informa o prazo de até
24 horas após a partida, mas o servidor não verifica esse prazo nem rejeita uma
data futura.

Data e horário usam o formato brasileiro, com máscara automática:
`dd/mm/aaaa` e `hh:mm` (24 horas), independentemente do idioma do navegador.
Datas ou horários inválidos (ex.: 31/02, 24:00) são rejeitados. No envio, a
data é convertida para `aaaa-mm-dd`, formato gravado na planilha e no TXT
(usado pela análise Python).

**Equipes configuradas:** AJAX, BEATS, BOCA JRS, CRUZMALTINO, INTEGRAÇÃO,
KADOSH, LEÕES DO MORUMBI, ONZE GAROTOS, PEQUIS, RIVER,
TRANSNANE/BRASILIENSE, TRK, UNIÃO, UNIAO SANTA MARIA, OLHOS DÁGUA, VENUS,
FUT ART e REAL PREDADOR.

É possível incluir até 30 envolvidos. A equipe de cada envolvido só pode ser
um dos dois times selecionados no cabeçalho da partida; ao trocar um time, as
opções são atualizadas e seleções inválidas são limpas. A tabela pode ficar vazia; porém, ao
preencher qualquer campo de uma linha, equipe, tipo (`Atleta` ou `Comissão`),
nome completo e número da camisa tornam-se obrigatórios. O número da camisa
deve estar entre 0 e 99. Para o tipo `Comissão`, a camisa fica marcada como
"Não necessário" e é gravada em branco. Linhas completamente vazias são ignoradas e não são
incluídas no TXT, PDF ou aba de envolvidos.

O seletor de anexos aceita PDF, JPG/JPEG e PNG. Eles são enviados em base64 e
salvos no Drive. **O código não define limite de tamanho nem de quantidade de
anexos no servidor.** O PDF lista os nomes dos arquivos e traz um link para a
pasta de evidências no Drive; os arquivos não são incorporados ao documento.

### Configuração e processamento

O ID da planilha está em `CONFIG.spreadsheetId`, em `WebApp.gs`. Não há uma
rotina de preparação obrigatória: a conta executora precisa ter acesso de
edição à planilha, e as abas e pastas são criadas sob demanda. O logo também
precisa estar acessível a essa conta.

Ao receber um envio válido, `salvarSumula()`:

1. Adquire um bloqueio de script e gera um protocolo no formato
   `SUM-AAAAMMDD-XXXXXXXX`.
2. Salva anexos, quando existirem, em uma subpasta identificada pelo protocolo.
3. Cria um Google Doc temporário, converte-o para PDF, salva
   `SUMULA_<protocolo>.pdf` e envia o documento temporário para a lixeira.
4. Gera `SUMULA_<protocolo>.txt`, com o link do PDF oficial na seção final
   `SÚMULA OFICIAL (PDF)`.
5. Registra a súmula e os envolvidos nas abas da planilha.
6. Retorna o protocolo, o TXT para download local e a URL do PDF.

| Conteúdo | Destino |
| --- | --- |
| TXT | `Arquivos TXT - Sumulas Digitais` |
| PDF | `PDF - Sumulas Digitais` |
| Anexos | `Anexos - Sumulas Digitais/SUMULA_<protocolo>` |
| Dados principais | Aba `SUMULAS_DIGITAIS` |
| Envolvidos | Aba `SUMULA_ENVOLVIDOS` |

> [!TIP]
> Para testar só o layout do PDF, execute `testarGeracaoPdf` no editor do Apps
> Script. A função monta o mesmo payload enviado pelo formulário, passa pela
> mesma validação (`validarDados_`), salva `SUMULA_TESTE-<data-hora>.pdf` na
> pasta de PDFs e mostra a URL no log. Ela não grava na planilha, não gera TXT
> e não salva anexos.

As pastas são procuradas pelo nome no Drive da conta executora e criadas se não
existirem.

**Dados gravados em `SUMULAS_DIGITAIS` (16 colunas):** data de envio, protocolo,
árbitro, documento, time 1, time 2, data da partida, horário, relato,
confirmação, URL do TXT, URL do PDF, URL da pasta de anexos, quantidade de
anexos, quantidade de itens de envolvidos e status.

**Dados gravados em `SUMULA_ENVOLVIDOS`:** protocolo, equipe, tipo, nome
completo e número da camisa, uma linha para cada envolvido preenchido e
validado.

### Atenção aos cabeçalhos da planilha

Há uma diferença entre os cabeçalhos criados e os dados gravados: na
inicialização, `criarEstrutura_()` cria apenas 10 cabeçalhos em
`SUMULAS_DIGITAIS`, enquanto `salvarSumula()` grava 16 valores. Portanto, as
seis últimas colunas não têm cabeçalho nessa criação.

A função auxiliar `criarPlanilhaSumula()` cria uma estrutura diferente e usa a
aba `ENVOLVIDOS`; o fluxo normal, porém, usa `SUMULA_ENVOLVIDOS`. Essa função
auxiliar não altera `CONFIG.spreadsheetId` e não é necessária na implantação.
Antes de usar a planilha em relatórios, alinhe os cabeçalhos com as 16 posições
gravadas e confirme o nome da aba de envolvidos.

## Sistema interno

Área restrita da associação, publicada em
[portal.aeuv.org/sistema/](https://portal.aeuv.org/sistema/). Reúne em
um só lugar as funcionalidades internas da AEUV, com menu lateral e controle de
acesso por Conta Google.

### Arquivos do projeto

| Arquivo | Conteúdo |
| --- | --- |
| `WebApp.gs` | Identificação do usuário, lista de autorizados, registro de módulos e `doGet()`. |
| `Index.html` | Tela do sistema: cabeçalho, menu e área de conteúdo. |
| `Negado.html` | Tela exibida a quem não está autorizado. |
| `Estilos.html` | CSS da identidade visual, compartilhado pelas duas telas. |
| `Ponte.html` | Script que conversa com `portal.aeuv.org/sistema/`: avisa que o sistema abriu ou devolve a navegação ao domínio da associação. |
| `appsscript.json` | Manifesto: fuso horário, escopos OAuth e modo de implantação do app da web. |

### Como o acesso é controlado

O servidor lê o e-mail de quem abriu a página com
`Session.getActiveUser().getEmail()` e compara com a lista de autorizados. Quem
não está na lista recebe `Negado.html` e nunca chega ao conteúdo — a verificação
acontece no servidor, antes de qualquer HTML do sistema ser gerado.

A lista de autorizados fica nas **propriedades do script**, na chave
`USUARIOS_AUTORIZADOS`, e cai para a constante `USUARIOS_PADRAO` do código
enquanto a propriedade não existir. Cada item tem `email`, `nome` e `perfil`.

Para conceder, alterar ou revogar um acesso, use a tela **Usuários do sistema**,
visível apenas para o perfil `admin`. A mudança passa a valer na hora, **sem
publicar nova versão** — quem estiver com o sistema aberto vê o novo perfil ao
recarregar a página. O servidor recusa:

- e-mail fora do formato `nome@dominio.com`;
- e-mail que já está na lista;
- perfil que não existe em `PERFIS`;
- qualquer alteração que deixe o sistema sem nenhum administrador;
- o administrador rebaixando ou removendo **a si mesmo** — sempre há outra
  pessoa capaz de desfazer um engano.

No editor do Apps Script ficam duas funções de socorro, para quando ninguém mais
conseguir entrar: `definirUsuariosAutorizados()` regrava `USUARIOS_PADRAO` por
cima da propriedade, e `restaurarUsuariosPadrao()` apaga a propriedade e devolve
o controle à lista do código.

As propriedades do script foram escolhidas de propósito no lugar de uma aba de
planilha: como o aplicativo roda com a permissão de quem acessa, ler uma
planilha exigiria compartilhá-la com todos — inclusive com quem ainda não tem
acesso liberado.

Perfis disponíveis:

| Perfil | Enxerga |
| --- | --- |
| `admin` | Tudo, inclusive conceder e revogar acesso. |
| `diretoria` | Tudo, menos a tela de acessos. |
| `arbitragem` | Início, súmula digital e regulamentos. |
| `associado` | Início, inscrição e portabilidade, regulamentos e associados. |

A única diferença entre `admin` e `diretoria` é a tela de acessos: quem dirige a
associação precisa operar o sistema inteiro, mas distribuir permissão é ato de
outra natureza e fica com quem administra.

Perfil desconhecido é tratado como `associado`, o de menor alcance: um perfil
renomeado nunca vira acesso a mais. A função `diagnosticarAcesso()` registra no
log o e-mail lido e o resultado da verificação; use-a quando a implantação
parecer bloquear alguém indevidamente.

#### O associado só enxerga a própria equipe

O perfil `associado` é o único que **exige uma equipe** no momento de conceder o
acesso — o formulário mostra o campo e o servidor recusa o registro sem ele ou
com equipe fora de `ASSOCIADOS_EQUIPES`. A equipe fica gravada no próprio
registro do usuário, e não é deduzida pelo e-mail do representante: o e-mail de
login costuma ser outro.

Com isso, `listarAssociados()` devolve a esse perfil **apenas o cadastro da
equipe dele**. A tela abre direto no formulário da equipe, sem lista, busca nem
filtro, e o endereço da planilha não é enviado a quem não pode editar.

> **O filtro protege a tela, não o arquivo.** A implantação roda como
> `USER_ACCESSING`, ou seja, a planilha é lida com a permissão de quem acessa.
> Um associado que tenha leitura na planilha pode abri-la direto no Drive e ver
> todas as equipes. Por isso **não compartilhe a planilha de associados com esse
> perfil** — sem compartilhamento o módulo simplesmente não carrega para ele, e
> os dados das outras equipes ficam de fato fora de alcance.

### Módulos

O menu é montado a partir da constante `MODULOS` do `WebApp.gs`, e o servidor
envia ao navegador **apenas** os módulos liberados para o perfil de quem entrou.
Cada módulo declara `id`, `nome`, `icone`, `tipo`, `descricao` e `perfis`, e
pode declarar `grupo` para entrar num submenu.

| Tipo | Comportamento |
| --- | --- |
| `painel` | Tela inicial, com saudação e atalhos para os demais módulos. |
| `link` | Abre um endereço externo em nova aba (usado pelos dois formulários). |
| `usuarios` | Acessos do sistema: lista, concede, edita e revoga. `listarUsuarios()`, `salvarUsuario()` e `removerUsuario()`. |
| `punicoes` | Controle de punições; busca os dados com `listarPunicoes()`. |
| `solicitacoes` | Solicitações de Inscrições; busca os dados com `listarSolicitacoes()`. |
| `sumulas` | Súmulas Enviadas; busca os dados com `listarSumulas()`. |
| `notas` | Notas oficiais; busca os dados com `listarNotas()`. |
| `regulamentos` | Regulamentos; busca os dados com `listarRegulamentos()`. |
| `associados` | Cadastro de associados; usa `listarAssociados()` e `salvarAssociado()`. |
| `breve` | Funcionalidade já prevista, exibida com o aviso "em desenvolvimento". |

Módulos publicados hoje: Início, Formulários (Súmula digital e Inscrição e
portabilidade), Solicitações de Inscrições, Súmulas Enviadas, Notas oficiais,
Regulamentos, Controle de punições, Associados, Atletas e Usuários do sistema.
Só Atletas ainda está marcado como `breve`, aguardando a tela correspondente.

#### Submenus

Um módulo pode declarar `grupo` com o id de um item da constante `GRUPOS`. Os
módulos de um mesmo grupo aparecem recolhidos sob um título que abre e fecha,
em vez de ocupar uma linha cada no menu. Hoje existe um grupo: **Formulários**,
que reúne a Súmula digital e a Inscrição e portabilidade — as duas telas que
apenas levam a um endereço externo.

Três regras valem a pena lembrar:

- Módulos do mesmo grupo precisam estar **lado a lado** em `MODULOS`; a ordem da
  lista é a ordem do menu.
- O submenu começa fechado, mas **abre sozinho** quando o módulo em uso está
  dentro dele, para o item ativo nunca ficar escondido.
- Um grupo sem nenhum módulo liberado para o perfil simplesmente não aparece,
  porque o servidor já filtra os módulos antes de enviá-los.

No painel inicial cada módulo continua com seu próprio atalho, sem agrupamento:
lá o objetivo é mostrar tudo o que a pessoa pode fazer.

#### Carregamento

Toda tela que busca dados no servidor mostra o **mesmo** bloco de carregamento,
montado por `blocoCarregando()`: a logomarca da associação com um anel girando,
a palavra "Carregando" com reticências animadas e uma barra indeterminada.

É a mesma identidade da tela de entrada das
[páginas de abertura](#ícone-da-aba-e-prévia-do-link)
(`docs/sistema/index.html`), de propósito: quem entra no sistema vê o anel
girando na abertura e reencontra o mesmo desenho a cada tela que abre, sem
mudança de cara no meio do caminho.

O texto é igual em todas elas. Antes cada tela escrevia o seu ("Carregando as
solicitações de inscrição...", "Carregando o controle de punições..."), o que
repetia uma informação que o cabeçalho logo acima já dá — e a espera é sempre a
mesma coisa, o servidor indo ao Drive, não algo específico da funcionalidade.

A barra é indeterminada porque não há como saber o tempo: depende de quantos
arquivos a pasta tem e da resposta do Drive. Quem configurou o sistema para
usar menos movimento (`prefers-reduced-motion`) vê o mesmo bloco, parado, com a
barra cheia.

### Controle de punições

Primeira funcionalidade com tela própria. Mostra todas as punições aplicadas
pelas notas oficiais, com indicadores, busca e filtros, e some com a necessidade
de abrir o arquivo no Drive para consultar uma suspensão.

A fonte é o arquivo **`CONTROLE DE PUNIÇÕES - AEUV.txt`**, mantido pela
automação em Python (`controle_punicoes.py`) e publicado por ela na subpasta
`Controle de Punicoes`, dentro da pasta das súmulas no Drive. A cada nova
punição o arquivo é regravado e reenviado, então a tela sempre reflete a última
nota — [veja o fluxo no README do projeto principal](../README.md#controle-de-punições-da-associação).

O servidor faz o caminho inverso do Python: localiza o arquivo, lê o texto e
transforma a tabela separada por `|` em registros, guiando-se pela ordem das
colunas (`PUNICOES_COLUNAS`). Linhas de cabeçalho e de apoio são descartadas
porque não têm o número exato de colunas. O id do arquivo encontrado fica
guardado na propriedade de script `PUNICOES_ARQUIVO_ID` para evitar uma busca no
Drive a cada abertura; se o arquivo for substituído, movido ou apagado, a busca
é refeita sozinha.

Na tela, os quatro indicadores (punições, a cumprir, cumpridas e pena a definir)
acompanham os filtros aplicados. A busca livre ignora acentos e maiúsculas e
varre todas as colunas; os seletores de competição, equipe, situação e status
são montados a partir dos próprios dados. No computador os dados aparecem em
tabela; no celular cada punição vira uma ficha com os rótulos à esquerda. O
botão "Atualizar" relê o arquivo e "Abrir arquivo" leva ao TXT no Drive.

Cada linha traz ainda um **"Ver súmula"**, abaixo do número da nota, que abre a
tela de [Súmulas Enviadas](#súmulas-enviadas) já filtrada pelo protocolo — o
caminho para ler o relato do árbitro que motivou aquela punição. O atalho só
aparece para quem tem a tela de súmulas no menu.

Dois pontos de atenção:

- **Permissão.** O aplicativo roda com a permissão de quem acessa, então cada
  pessoa autorizada precisa ter acesso de leitura à pasta das súmulas no Drive.
- **Primeira cópia.** A conta de serviço usada pelo Python não tem cota de
  armazenamento e só consegue atualizar arquivos já existentes. O TXT e o PDF
  precisam ser enviados uma única vez à subpasta por uma conta de pessoa; depois
  disso a atualização é automática.

A configuração fica em `CONFIG.punicoes`, no `WebApp.gs`: id da pasta das
súmulas, nome da subpasta e nome do arquivo. Os dois nomes precisam ser iguais
aos usados no `controle_punicoes.py`.

#### Quando a tela acusa falta de acesso

Execute `diagnosticarPunicoes()` no editor do Apps Script. A função percorre os
mesmos passos da tela — abrir a pasta, achar a subpasta, achar o arquivo, ler os
registros — e registra no log exatamente onde parou, listando o que existe de
fato no Drive quando um nome não confere.

Se o log trouxer **"You do not have permission to call DriveApp.getFolderById"**,
o problema não é a pasta: é o consentimento. O Google fixa os escopos no momento
em que o aplicativo é autorizado, então um projeto autorizado **antes** de passar
a ler o Drive continua sem essa permissão, mesmo com a pasta compartilhada
corretamente.

A correção é declarar os escopos no manifesto, que é o que o `appsscript.json`
deste repositório faz:

| Escopo | Para quê |
| --- | --- |
| `.../auth/userinfo.email` | `Session.getActiveUser().getEmail()`, base do controle de acesso. |
| `.../auth/drive` | Ler a pasta, o arquivo de controle e a logomarca; guardar os documentos dos associados. |
| `.../auth/spreadsheets` | Criar e manter a planilha do cadastro de associados. |

Para aplicar: no editor do Apps Script, abra **Configurações do projeto**, marque
*"Mostrar o arquivo de manifesto appsscript.json no editor"*, abra o arquivo,
substitua o conteúdo pelo deste repositório e salve.

Corrigir o manifesto **não basta por si só**. A autorização já concedida fica
guardada na conta, e o editor continua usando esse consentimento antigo sem
exibir nova tela — o erro se repete igual. Duas formas de forçar o pedido:

1. **Recarregar o editor.** O Apps Script calcula os escopos ao carregar a
   página, então salvar o manifesto na mesma sessão não muda nada. Feche a aba,
   reabra o projeto e execute `diagnosticarPunicoes()`.
2. **Revogar o acesso.** Em
   [permissões da Conta Google](https://myaccount.google.com/permissions),
   procure o projeto pelo nome e clique em *Remover acesso*. Projetos dos quais
   você é o dono podem não aparecer nessa lista; nesse caso vale o item 1.

Se mesmo assim a tela não aparecer, troque o escopo por um **diferente** do que
foi concedido antes (por exemplo, `.../auth/drive` no lugar de
`.../auth/drive.readonly`). Escopo diferente é o que garante que o Google
reconheça a mudança e refaça a pergunta. Por isso o manifesto deste repositório
usa `.../auth/drive`.

Quando a tela surgir, ela vem com o aviso de app não verificado: clique em
**Avançado** e depois em *Acessar (não seguro)*. É esperado — o aplicativo é da
própria associação e não passou pela verificação pública do Google.

Cada pessoa autorizada passa por essa tela na primeira vez que abrir o sistema,
porque o aplicativo roda com a permissão de quem acessa.

Com `oauthScopes` declarado, o Apps Script deixa de acrescentar escopos sozinho.
Por isso, ao usar um serviço novo no código, acrescente o escopo correspondente
ao manifesto — e lembre que a mudança só vale após nova autorização.

### Solicitações de Inscrições

Consulta aos pedidos de inscrição, remoção e portabilidade que as equipes
enviaram pelo formulário público. Evita abrir o Drive e ler os TXT um a um para
saber o que chegou, o que já foi processado e o que falhou.
Nada é gravado por esta tela: ela **só lê**. Quem escreve os arquivos é o
[formulário de inscrição](#inscrição-remoção-e-portabilidade), que grava o TXT
em `Entrada`; depois a automação em Python move o arquivo para `Processados` ou
`Falhas`, conforme o resultado de cada registro no iFut.

#### A pasta é o status

Não existe banco de dados nem planilha guardando o andamento de uma solicitação:
**a pasta em que o arquivo está é o próprio status**.

| Pasta | Situação na tela | Significa |
| --- | --- | --- |
| `Entrada` | 🕒 Aguardando | O formulário recebeu o pedido; a automação ainda não rodou. |
| `Processados` | 🟢 Processada | A automação executou os registros no iFut. |
| `Falhas` | 🔴 Falha | A automação encontrou erro e separou o arquivo. |

A vantagem é não haver nada para sincronizar: quem move o arquivo é a própria
automação, e a tela apenas observa o resultado. As subpastas `Processados` e
`Falhas` só passam a existir depois da primeira execução do Python; a ausência
delas não é erro e a tela simplesmente não encontra nada nelas.

#### O resultado da automação

Saber que uma solicitação falhou não basta: é preciso saber **por quê**. Ao
terminar cada processamento, a automação em Python publica na pasta
`Resultados` dois arquivos com o resultado — um TXT e um PDF — nomeados como
`<arquivo de origem sem extensão>-resultado-<carimbo>`.

A tela usa esse nome para ligar o resultado à solicitação correspondente e
oferece os dois no detalhe: **Resultado (PDF)**, em destaque, e
**Resultado (TXT)**. O PDF traz cada registro com o status colorido — `SUCESSO`
em verde, `FALHA` em vermelho — e, quando há falhas, uma caixa no topo com o
nome e o motivo de cada uma.

Como a publicação só acontece depois que a automação roda, solicitações ainda
em `Entrada` aparecem sem esses botões e sem aviso. Já uma solicitação que
consta como processada ou com falha e mesmo assim não tem resultado anexado
mostra "Resultado ainda não publicado" — sinal de que a automação rodou numa
versão anterior, antes desta publicação existir, ou que o envio ao Drive
falhou.

#### Colunas escolhidas

A lista mostra o que identifica a solicitação; o resto fica no detalhe, que abre
ao clicar na linha. A separação é proposital: a tabela responde "o que chegou e
em que pé está", e o detalhe responde "quem exatamente foi inscrito".

| Coluna | Por que está ali |
| --- | --- |
| Situação | A pergunta mais frequente: já foi processada? |
| Protocolo | Identificador informado à equipe no envio; é por ele que cobram. |
| Enviada em | Data e hora do envio, com a competição abaixo. |
| Equipe | Quem pediu. |
| Responsável | Quem assinou, com o telefone abaixo, para contato direto. |
| Registros | Quantas inclusões, remoções e portabilidades o pedido tem. |

No detalhe aparecem os dados completos de cada pessoa — ação, tipo, nome
completo, data de nascimento, CPF e, nas portabilidades, a competição anterior —
além dos links para o comprovante PIX, para o arquivo TXT original e para o
resultado da automação em PDF e TXT. Campos que
a ação dispensa são gravados como `NAO NECESSARIO` pelo formulário e viram um
travessão na tela, em vez de repetir o aviso em toda linha.

Ficaram de fora da tabela as confirmações de aceite (pagamento, termo médico,
regulamento e declaração): o formulário só deixa enviar com todas marcadas, logo
elas seriam sempre iguais e não ajudariam a distinguir uma solicitação de outra.

#### Leitura e desempenho

Ler todo o conteúdo de centenas de arquivos estouraria o tempo do Apps Script.
A tela evita isso em duas etapas:

1. **Listagem.** Percorre as três pastas recolhendo só os nomes. O formulário
   nomeia cada arquivo como `<EQUIPE>-<data>-<milissegundos>.txt`, então dá para
   ordenar do mais recente para o mais antigo sem abrir nenhum deles.
2. **Leitura.** Abre apenas os primeiros `CONFIG.solicitacoes.maxLeitura`
   arquivos (200 por padrão). Quando há mais que isso, a barra de ações avisa
   quantos foram lidos do total.

Arquivos que não terminam em `.txt` são ignorados, e nomes fora do padrão vão
para o fim da lista em vez de quebrar a ordenação.

O interpretador é tolerante de propósito: lê linhas no formato `CHAVE: valor`,
trata `REGISTRO 01` como início de uma pessoa e descarta o que não tem `:`
(títulos e separadores). Assim, acrescentar uma linha nova ao TXT do formulário
não quebra a consulta.

#### Permissão

Liberada para **admin e diretoria**. Ficou fora dos perfis `associado` e
`arbitragem` porque a tela
expõe nome, data de nascimento e CPF dos atletas, além do telefone do
responsável. Como o aplicativo roda com a permissão de quem acessa, cada pessoa
autorizada também precisa de acesso de leitura à pasta das inscrições no Drive.

A pasta é a mesma usada pelo Python (`config.ini`, seção `[drive]`,
`folder_embed_url`) e está declarada em `CONFIG.solicitacoes.pastaRaizId`.
Quando a tela acusar erro, `diagnosticarSolicitacoes()` mostra quantos arquivos
existem em cada subpasta e o que foi reconhecido no mais recente.

### Súmulas Enviadas

Consulta às súmulas que a arbitragem enviou pelo
[formulário da súmula digital](#súmula-digital). Evita abrir o Drive e ler os
TXT um a um para saber o que chegou de cada rodada, quem foi citado e o que o
árbitro relatou. Como a tela de solicitações, ela **só lê**: quem escreve é o
formulário e quem move os arquivos é a automação em Python.

#### A pasta é o status

Mesma ideia das solicitações — não há banco de dados nem planilha de andamento:

| Pasta | Situação na tela | Significa |
| --- | --- | --- |
| `Entrada` | 🕒 Aguardando | A súmula chegou; a análise disciplinar ainda não rodou. |
| `Processados` | 🟢 Analisada | A automação leu a súmula e gerou a nota oficial. |
| `Falhas` | 🔴 Falha | A automação encontrou erro ao analisar o arquivo. |

A pasta é a mesma do controle de punições (`CONFIG.sumulas.pastaRaizId` e
`CONFIG.punicoes.pastaSumulasId` apontam para ela) e a mesma configurada no
Python em `config.ini`, seção `[sumulas]`.

#### Colunas escolhidas

| Coluna | Por que está ali |
| --- | --- |
| Situação | Já foi analisada? É a primeira pergunta. |
| Protocolo | Identificador do envio; é o que a nota oficial cita. |
| Enviada em | Quando o árbitro enviou — diferente da data do jogo. |
| Partida | O confronto, com a data e a hora do jogo abaixo. |
| Árbitro | Quem assinou o relato. |
| Envolvidos | Quantos atletas e quantos membros de comissão foram citados. |

O detalhe abre ao clicar na linha e traz o **relato dos fatos** em destaque,
com as quebras de linha como o árbitro escreveu, a tabela de envolvidos
(equipe, tipo, nome e camisa) e os botões da **súmula oficial em PDF** e do
arquivo TXT. Quando o PDF não foi gerado, o lugar dele mostra um aviso.

A busca livre cobre também o relato: é comum lembrar de uma palavra do texto e
não do protocolo. O filtro por equipe considera tanto os dois times da partida
quanto a equipe de cada envolvido, já que a súmula não tem uma equipe única.

#### O que a comissão decidiu

O detalhe fecha o ciclo mostrando a **nota oficial** que aquela súmula gerou:
número, data, quem foi punido, o artigo, a decisão e a situação de cada
punição. Um botão leva ao [controle de punições](#controle-de-punições) já
filtrado por aquele protocolo, e o caminho inverso também existe — cada linha
do controle traz um "Ver súmula" que abre esta tela no envio que originou a
punição.

Esse vínculo não custou nenhum arquivo novo: o controle de punições que a
automação publica já grava a coluna `SÚMULA` ao lado da coluna `NOTA`, então a
tela faz **uma leitura só**, do mesmo arquivo que a tela de punições usa.
Quando o controle ainda não existe, ou o usuário não tem acesso a ele, a tela
continua funcionando — apenas sem o vínculo.

Dois casos aparecem com texto próprio, e nenhum deles é erro:

| Caso | O que a tela diz |
| --- | --- |
| Súmula ainda em `Entrada` | "A análise disciplinar desta súmula ainda não foi feita." |
| Súmula analisada sem infração | "Súmula analisada sem punição registrada no controle." |

#### Um formato diferente do das inscrições

O TXT da súmula não é uma lista de `CHAVE: valor`. Ele tem seções, e uma delas
— `DOS FATOS` — é texto corrido, onde qualquer linha pode ter `:` sem ser um
campo. Por isso a leitura acompanha em que seção está, em vez de olhar cada
linha isoladamente:

```
(topo)                PROTOCOLO, DATA ENVIO, ÁRBITRO, DOCUMENTO
PARTIDA               "<mandante> x <visitante>", DATA, HORA
DOS FATOS             relato da arbitragem, copiado como veio
ENVOLVIDOS            blocos "REGISTRO n" com EQUIPE, TIPO, NOME, CAMISA
SÚMULA OFICIAL (PDF)  link do PDF, só quando o PDF foi gerado
```

Duas consequências práticas: o relato nunca engole o título da seção seguinte,
e uma linha do relato terminada em `:` não vira um campo fantasma.

A ordenação usa a **data de criação do arquivo no Drive**, e não o nome. O
formulário nomeia a súmula como `SUMULA_<protocolo>.txt`, e o protocolo só tem
a data — duas súmulas do mesmo dia empatariam. A data de criação é metadado:
dá para ordenar sem abrir nenhum arquivo. Vale o mesmo teto das solicitações,
`CONFIG.sumulas.maxLeitura` (200 arquivos abertos por consulta), e só arquivos
no padrão `SUMULA_*.txt` entram — a pasta também recebe PDFs e anexos.

#### Permissão

Liberada para **admin e diretoria**. Ficou fora dos perfis `associado` e
`arbitragem` porque o
relato costuma trazer acusações e ofensas atribuídas a pessoas com nome e
número da camisa — material da comissão disciplinar, não de consulta geral.
Cada pessoa autorizada também precisa de acesso de leitura à pasta das súmulas
no Drive. Quando a tela acusar erro, `diagnosticarSumulas()` mostra quantos
arquivos existem em cada subpasta e o que foi reconhecido no mais recente.

### Notas oficiais

Consulta às notas oficiais disciplinares — o documento que fecha o ciclo
iniciado pela [súmula](#súmulas-enviadas) e alimenta o
[controle de punições](#controle-de-punições). Antes desta tela, ler uma nota
significava abrir a pasta do Drive e caçar o PDF pelo nome do arquivo.

#### Só nota final chega aqui

A comissão trabalha em cima de um rascunho: a automação gera a nota com as
decisões sugeridas e, quando falta decidir alguma coisa, deixa marcadores
`[A DEFINIR PELA COMISSÃO]` no texto. **Esse rascunho não vai para o Drive.**
Só é publicado o que já está fechado, pelo mesmo critério que decide se o PDF
sai com a marca d'água RASCUNHO (`nota_pdf.tem_pendencias`).

A consequência é a que importa: ninguém na diretoria abre a tela e lê uma
decisão que ainda pode mudar. A publicação acontece quando a comissão regera o
PDF final (`python main.py --gerar-pdf-nota <número>`), ou em lote com
`--publicar-drive` — [veja o fluxo no README do projeto principal](../README.md#publicação-no-drive).

#### Colunas escolhidas

| Coluna | Por que está ali |
| --- | --- |
| Nota | O número (`008/2026`) é como a nota é citada em tudo. |
| Publicada em | A data da decisão, que não é a data do jogo. |
| Partida | O confronto, com a data do jogo abaixo. |
| Súmula | O protocolo que originou a nota, com atalho para a súmula. |
| Punidos | Quem foi punido e por qual equipe, até dois nomes. |

O detalhe abre ao clicar na linha e traz a competição, o árbitro da partida, a
tabela de punidos (artigo, decisão e situação de cada um), o **texto integral
da nota** e os botões do PDF oficial, do arquivo TXT e do controle de punições
filtrado por aquela nota.

O texto fica na tela mesmo havendo o PDF ao lado: é o que permite a busca livre
alcançar o enquadramento e a fundamentação, que não aparecem em nenhuma coluna.
Quem precisa do documento para anexar ou imprimir usa o PDF.

#### De onde vêm os punidos

Da mesma fonte do vínculo súmula → nota: o controle de punições já grava a
coluna `NOTA` em cada linha. A tela agrupa as linhas por esse número
(`indicePunidosPorNota_()`) em vez de reinterpretar o texto de cada nota — uma
leitura só, do arquivo que a tela de punições já usa. Sem o controle, a tela
continua funcionando; apenas a coluna de punidos fica vazia.

#### O que a leitura do TXT procura

A nota é um documento corrido, não uma lista de campos. A leitura pega os
poucos trechos de formato fixo e guarda o resto como corpo:

```
NOTA OFICIAL Nº 008/2026            número e ano
(linha seguinte)                    competição
"partida entre X x Y, realizada em" confronto e data do jogo
"(súmula SUM-..., árbitro ...)"     protocolo que originou a nota
"Uberlândia/MG, 26 de setembro..."  cidade e data da nota
```

O protocolo é **opcional**: as notas escritas com apoio de IA nem sempre o
citam no texto. Quando falta, a linha simplesmente não oferece o atalho para a
súmula.

#### Permissão

Liberada para **admin e diretoria**, pelo mesmo motivo das súmulas: a nota
nomeia pessoas e descreve condutas. Cada pessoa autorizada também precisa de
acesso de leitura à pasta das súmulas no Drive. Quando a tela acusar erro, a
própria mensagem já distingue os dois casos: a pasta `Notas Oficiais` ainda não
existe (nenhuma nota foi publicada) ou o usuário não tem acesso a ela.

### Regulamentos

Lista os regulamentos oficiais publicados. É a tela mais simples do sistema e a
**única consulta aberta a todos os perfis**: o regulamento é o
documento que toda equipe e a arbitragem precisam ter à mão, e não há nada nele
que dependa de quem está olhando.

Por isso não há tabela nem filtro. São poucos arquivos e o uso é sempre o
mesmo — abrir o PDF —, então cada regulamento é um cartão com o título, a data
da última atualização, o tamanho e dois botões: **Abrir PDF** e **Baixar**.

O título vem do nome do arquivo, com os hifens virando espaços:
`regulamento-7-super-liga-união-2026.pdf` aparece como "Regulamento 7 Super
Liga União 2026". A ordenação usa a data de atualização no Drive, então um
regulamento revisado no meio da temporada sobe para o topo.

Só o **PDF** é publicado. O texto de trabalho continua no repositório, em
`regulamento/`, onde a automação o lê para enquadrar as infrações — publicar os
dois lado a lado só criaria dúvida sobre qual é o oficial.

### Cadastro de associados

Reúne num só lugar quem são as equipes associadas, quem responde legalmente por
cada uma e qual documentação já foi entregue.

**Um registro por equipe.** O associado é a equipe; a pessoa aparece como
representante legal dela. Por isso a equipe funciona como chave: ao salvar, o
sistema procura a equipe na planilha e atualiza a linha existente em vez de
criar outra. A comparação ignora acentos, maiúsculas e espaços repetidos
(`chaveEquipe_`), então "Integração" e "INTEGRACAO" são a mesma equipe. No
formulário de cadastro novo o combo só oferece equipes ainda sem registro, e na
edição o campo fica travado.

#### Por que planilha e não um arquivo TXT

O controle de punições usa TXT porque só tem **um escritor**: a automação em
Python regrava o arquivo inteiro e o sistema apenas lê. Aqui várias pessoas
gravam e editam pela tela, uma de cada vez e sem ordem definida. Reescrever um
TXT inteiro a cada alteração abriria espaço para perder dados quando dois
cadastros acontecessem juntos.

A planilha resolve isso com pouco esforço: é nativa do Apps Script, o
`LockService` serializa as gravações, e a diretoria consegue abrir, filtrar,
conferir e corrigir na mão quando precisar. Um banco de dados de verdade
(Cloud SQL, Firestore) traria custo, credenciais e infraestrutura nova sem
ganho perceptível na escala da associação — algumas dezenas de registros.

#### Onde os dados ficam

| O quê | Onde |
| --- | --- |
| Dados do cadastro | Planilha `AEUV - Associados`, aba `Associados` |
| Documentos enviados | `Documentos - Associados/<EQUIPE>/` |

As duas são criadas dentro da pasta raiz `AEUV - Automação` pela função
`prepararAssociados()`, e os ids ficam nas propriedades de script
`ASSOCIADOS_PLANILHA_ID` e `ASSOCIADOS_PASTA_ID`. Se a planilha ou a pasta for
apagada, o sistema procura de novo pelo nome e recria se precisar.

A ordem das colunas (`ASSOCIADOS_COLUNAS`) é o que liga cada célula ao seu
campo. **Não reordene nem remova colunas** da planilha sem ajustar a constante:
os dados passariam a ser lidos trocados.

#### Campos

| Bloco | Campos |
| --- | --- |
| Equipe | Equipe associada, Situação |
| Representante legal | Nome completo, data de nascimento, CPF, RG, e-mail, telefone |
| Endereço | CEP, logradouro, número, complemento, bairro, cidade, UF |
| Documentação | Estatuto, ata de fundação, documento do responsável, comprovante de endereço, termo de associação, regulamento assinado |

O endereço é separado em campos em vez de um único texto livre: assim dá para
filtrar por cidade, conferir o CEP e aproveitar os dados depois, em mala direta
ou relatórios.

As quatro situações possíveis são 🟢 Ativo, 🟡 Pendente, 🔴 Inativo e ⚫ Suspenso.
Todo cadastro novo começa como **Pendente**.

Os documentos são **todos opcionais** — nem toda equipe tem estatuto registrado,
e a documentação costuma chegar aos poucos. Em vez de travar o cadastro, a tela
conta o que falta e mostra na coluna "Docs." e no indicador "Com documento
pendente". Aceita PDF, JPG, PNG e WEBP, até 5 MB por arquivo. Enviar um arquivo
novo **substitui** o anterior: a versão antiga vai para a lixeira, para a pasta
da equipe não acumular cópias.

#### Validações

O servidor refaz todas as conferências, porque o que o navegador envia nunca é
confiável:

- **CPF** com os dígitos verificadores calculados, recusando também sequências
  como `111.111.111-11`.
- **Data de nascimento** precisa existir no calendário (não passa `31/02`) e o
  representante precisa ser maior de 18 anos.
- **Telefone** com 10 ou 11 dígitos, **CEP** com 8, **UF** com exatamente duas
  letras, e-mail no formato esperado e nome completo com ao menos duas palavras.

CPF, telefone e CEP são guardados **somente com dígitos** e formatados na
exibição. Assim a busca funciona tanto por `52998224725` quanto pelo número
pontuado.

#### Permissões

| Perfil | Pode |
| --- | --- |
| `admin`, `diretoria` | Consultar, cadastrar e editar todas as equipes |
| `associado` | Apenas consultar, e só a própria equipe |
| `arbitragem` | Sem acesso à tela |

Quem só consulta vê a mesma tela, com os campos travados, sem botão de salvar e
sem campo de envio — mas com os links dos documentos disponíveis. A regra está
em `ASSOCIADOS_PERFIS_EDICAO` e é verificada de novo no servidor, dentro de
`salvarAssociado()`. O recorte por equipe do perfil `associado` está descrito em
[O associado só enxerga a própria equipe](#o-associado-só-enxerga-a-própria-equipe).

> **Atenção às permissões do Drive.** O sistema roda como *"Usuário que acessa"*,
> então a gravação acontece com a conta de quem está usando a tela. Admins e
> diretoria precisam de acesso de **Editor** à pasta `AEUV - Automação`; quem só
> consulta precisa de **Leitor**. Sem isso a tela abre, mas falha ao salvar.

#### Quando a tela acusa erro

Execute **`diagnosticarAssociados()`** no editor do Apps Script. A função
percorre pasta raiz → planilha → pasta de documentos → leitura e diz onde parou,
terminando com a contagem de associados. Rodar pelo editor também renova o
consentimento dos serviços usados pelo código, que é o que resolve a maior parte
dos erros de permissão.

### Como acrescentar uma funcionalidade
1. Inclua um item em `MODULOS` no `WebApp.gs`, com um `id` único e a lista de
   `perfis` que podem vê-lo.
2. Se for só um atalho para um endereço externo, use `tipo: 'link'` com a chave
   `url`. Nada mais é necessário.
3. Para uma tela própria, use um `tipo` novo e trate-o em `renderizarModulo()`
   no `Index.html`.
4. Se a tela precisar de dados, crie a função correspondente no `WebApp.gs` e
   chame-a com `google.script.run`. **Repita a verificação de permissão no
   servidor**, como faz `listarUsuarios()`: o que o navegador envia nunca deve
   ser considerado confiável.
5. Para recolher o módulo num submenu, declare `grupo` com o id de um item de
   `GRUPOS` e posicione-o junto dos irmãos na lista.
6. Publique uma nova versão da implantação.

A navegação usa o fragmento do endereço (`#usuarios`, `#notas`), então cada
módulo pode ser guardado nos favoritos e o botão "voltar" funciona. No celular o
menu fica recolhido atrás do botão "Menu do sistema" e se fecha sozinho ao
escolher uma opção.

## Operação e manutenção

- Mantenha os aplicativos em projetos GAS separados. Os arquivos HTML devem
  continuar se chamando `Index` (no sistema interno também `Estilos`, `Negado` e
  `Ponte`); as funções chamadas pela interface são `salvarInscricao()`,
  `salvarSumula()`, `listarUsuarios()`, `salvarUsuario()`, `removerUsuario()`,
  `listarPunicoes()`,
  `listarSolicitacoes()`, `listarSumulas()`, `listarNotas()`,
  `listarRegulamentos()`, `listarAssociados()` e `salvarAssociado()`.
- Ao alterar equipes, competições ou outros dados de configuração, atualize as
  opções da interface e as validações do servidor em conjunto.
- Mantenha a conta executora com acesso às planilhas, pastas e logo; verifique
  também as permissões dos arquivos gerados.
- No sistema interno, revise periodicamente a lista de autorizados e remova
  quem deixou a diretoria. Mantenha sempre pelo menos um `admin`.
- Para investigar falhas, confira as execuções do Apps Script e as permissões
  dos serviços Google. Erros do servidor são exibidos no formulário; no sistema
  interno, use `diagnosticarAcesso()` para problemas de acesso,
  `diagnosticarPunicoes()` para a leitura do controle de punições,
  `diagnosticarSolicitacoes()` para a consulta das solicitações e
  `diagnosticarAssociados()` para o cadastro de associados.
