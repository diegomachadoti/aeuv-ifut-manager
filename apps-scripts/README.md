# Aplicativos Google Apps Script da AEUV

Este diretório reúne dois formulários Web desenvolvidos com Google Apps Script
(GAS). O formulário de inscrição, remoção e portabilidade produz os arquivos
TXT de solicitação que servem de entrada para a automação Python. Os projetos
Web e o processamento Python são aplicações distintas, conectadas por esses
arquivos no Google Drive.

| Aplicativo | Diretório | Para que serve |
| --- | --- | --- |
| **Inscrição, remoção e portabilidade** | `inscricao-portabilidade/` | Receber solicitações para atletas e comissão técnica, salvar comprovantes e gerar arquivos TXT. |
| **Súmula digital** | `sumula-digital/` | Registrar relatórios de arbitragem e gerar arquivos TXT e PDF. |

Cada aplicativo é um projeto GAS independente composto por `WebApp.gs` e
`Index.html`. **Não combine os arquivos das duas pastas em um único projeto:**
ambos declaram `doGet()` e funções auxiliares com nomes iguais.

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

- [Publicação e permissões](#publicação-e-permissões)
- [Inscrição, remoção e portabilidade](#inscrição-remoção-e-portabilidade)
- [Súmula digital](#súmula-digital)
- [Operação e manutenção](#operação-e-manutenção)

## Publicação e permissões

Repita estes passos para cada aplicativo:

1. Crie um projeto independente em [Google Apps Script](https://script.google.com/).
2. Copie `WebApp.gs` para um arquivo de script e `Index.html` para um arquivo
   HTML chamado `Index`.
3. Autorize os serviços solicitados. Os projetos usam Google Sheets e Drive;
   a súmula também usa Google Docs para gerar o PDF.
4. Siga as instruções de preparação específicas do aplicativo.
5. Publique como **Aplicativo da Web**, escolhendo a conta executora e o público
   autorizado de acordo com a política da associação.
6. Após qualquer alteração, publique uma nova versão e compartilhe a URL da
   implantação atualizada.

Os dois formulários permitem incorporação em outras páginas
(`XFrameOptionsMode.ALLOWALL`). A conta executora precisa manter acesso às
planilhas, pastas e imagens utilizadas.

> **Privacidade:** os formulários coletam dados pessoais, incluindo CPF,
> documento do árbitro e comprovantes de pagamento. Restrinja o acesso aos
> aplicativos e aos arquivos gerados ao necessário para a operação. A opção de
> publicar um formulário para acesso público não torna automaticamente seguros
> ou públicos os arquivos associados.

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

## Operação e manutenção

- Mantenha os aplicativos em projetos GAS separados. Os arquivos HTML devem
  continuar se chamando `Index`; as funções chamadas pela interface são
  `salvarInscricao()` e `salvarSumula()`.
- Ao alterar equipes, competições ou outros dados de configuração, atualize as
  opções da interface e as validações do servidor em conjunto.
- Mantenha a conta executora com acesso às planilhas, pastas e logo; verifique
  também as permissões dos arquivos gerados.
- Para investigar falhas, confira as execuções do Apps Script e as permissões
  dos serviços Google. Erros do servidor são exibidos no formulário.
