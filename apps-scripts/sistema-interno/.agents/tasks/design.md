# Requisitos e design técnico — publicação e consulta de relatórios financeiros

## Requisitos

### Summary

O fluxo `python main.py --gerar-pdf-financeiro` deve continuar gerando PDFs em `downloads/financeiro` e, somente depois de cada geração local terminar com sucesso, publicar o mesmo arquivo em uma pasta dedicada do Google Drive. A área **Financeiro e Prestação de Contas** do Apps Script deve consultar esses arquivos sem depender da planilha financeira e sem regredir o controle não commitado de ocultar/exibir valores já presente em `Index.html`.

A UX escolhida é uma seção compacta na própria tela financeira: o relatório publicado mais recentemente aparece em destaque e até 19 anteriores ficam em uma lista recolhível. A emissão é menos frequente que a consulta diária de lançamentos, portanto uma tela separada adicionaria navegação e manutenção; porém os relatórios de assembleia, emenda e competição têm valor histórico, então mostrar apenas o último seria insuficiente. A pasta exclusiva, os nomes canônicos e os metadados do Drive permitem a lista sem interpretar o conteúdo dos PDFs.

**Premissas explícitas:** `CONFIG.pastaRaizId` em `WebApp.gs` é a pasta existente `AEUV - Automação`; o mesmo ID será registrado em `[drive] root_folder_id` no `config.ini`. `admin` e `diretoria` continuam sendo os únicos perfis do módulo financeiro. Como o WebApp executa como `USER_ACCESSING`, cada usuário também precisa de acesso de leitura à pasta no Drive. Os botões atuais de PDF no Apps Script continuam apenas explicando/montando comandos Python; o navegador não executará o Python.

### Functional Requirements

- Todo retorno bem-sucedido de `financeiro_pdf.gerar_pdf_financeiro(...)` no fluxo suportado por `main.py --gerar-pdf-financeiro` deve ser seguido imediatamente por uma tentativa de publicação. Isso inclui `geral`, `emenda`, `competicao`, entrada JSON e cada um dos três PDFs de `exemplo`.
- O PDF local deve permanecer inalterado mesmo quando o upload falhar. Geração local com falha não pode iniciar upload daquele relatório.
- A publicação deve reutilizar `PublicadorDrive` e `drive_auth.py`, sem criar outro cliente, escopo ou arquivo de credencial, e usar `AEUV - Automação/Relatorios Financeiros`.
- Cada nova emissão deve persistir uma identidade UUID no próprio nome: `relatorio-financeiro-<tipo>-<AAAAMMDD-HHMMSS-microssegundos>-<uuid32>.pdf`. Retry usa exatamente o arquivo/nome já persistido; uma emissão nova sempre recebe nova identidade.
- Relatórios financeiros publicados são imutáveis. Retry de uma identidade já existente reutiliza o item remoto e não cria duplicata nem substitui bytes; uma colisão inconsistente de identidade/nome é erro, nunca sobrescrita.
- Deve existir recuperação operacional sem regenerar o documento: `--publicar-relatorio-financeiro CAMINHO.pdf` publica um PDF local canônico ou legado.
- Falha operacional no Drive deve ser **sucesso parcial**: código de saída `2`, categoria, ação recomendada e caminho local. Erro local/entrada inválida usa código `1`; sucesso completo usa `0`.
- O Apps Script deve oferecer o RPC sem argumentos `listarRelatoriosFinanceiros()`, autorizado no servidor, que devolve apenas nome, tipo, data de publicação e URL de até 20 PDFs válidos, do mais recentemente publicado para o mais antigo.
- A seção inline deve ter estados independentes de carregamento, vazio e erro, destacar o primeiro relatório e recolher os anteriores. Links devem abrir em nova aba com `rel="noopener"`.
- A alteração local do olho deve ser preservada integralmente: estado em `sessionStorage`, máscara dos cartões/tabela/modais, campo monetário, atributos ARIA, sincronização após renderizações, responsividade e tema escuro.

### Non-Functional Requirements

- **Segurança:** não tornar arquivos públicos, alterar compartilhamentos ou devolver conteúdo, valores, proprietários, permissões, credenciais ou tokens. A autorização funcional acontece antes de qualquer chamada ao Drive.
- **Robustez:** zero pasta é um estado inicial válido para leitura; pasta duplicada, arquivo homônimo/identidade inconsistente ou busca incompleta geram erro acionável, nunca seleção/lista parcial silenciosa.
- **Desempenho:** usar o Advanced Drive Service v3 já habilitado, solicitar somente metadados e parar quando houver 21 relatórios válidos ou acabarem as páginas; nenhum PDF será aberto.
- **Acessibilidade:** loading/erro devem ser anunciados por `aria-live="polite"`; ações têm texto e foco visível; o layout empilha em telas estreitas e não depende só de cor/ícone.
- **Compatibilidade:** Python 3.13; `google-api-python-client==2.171.0`; `google-auth==2.40.3`; Apps Script V8/Drive v3; HTML/CSS/JavaScript sem framework; testes com `unittest` e `node:test`/`vm`.

### Acceptance Criteria

1. Para cada PDF retornado por `gerar_pdf_financeiro`, o arquivo local continua existente e ocorre exatamente uma tentativa imediata de publicação antes da próxima geração ou do encerramento.
2. Se `SimpleDocTemplate.build(...)` falhar ou `gerar_pdf_financeiro` não retornar, não há upload daquele relatório. No modo `exemplo`, tentativas anteriores não são adiadas nem desfeitas.
3. Sucesso completo retorna `0` e registra nome, ID, URL e ação (`criado` ou `reutilizado`) sem segredos.
4. Falha operacional do Drive retorna `2`, registra “PDF local gerado; publicação no Drive falhou”, caminho, categoria e ação; não remove nem altera o local. Em `exemplo`, falhas remotas são acumuladas, os demais itens são tentados e qualquer falha remota resulta em `2`.
5. `--publicar-relatorio-financeiro` aceita somente arquivo regular existente, de 1 byte a 50 MiB, assinatura `%PDF-` e nome financeiro canônico novo ou legado; não chama o gerador e usa `0`, `1` ou `2` conforme o contrato.
6. `--publicar-relatorio-financeiro` combinado com `--gerar-pdf-financeiro` ou com `--origem`, `--emenda`, `--periodo`, `--data-inicio` ou `--data-fim` termina em erro de uso do parser antes de geração ou rede.
7. Duas novas emissões sequenciais, mesmo com relógio congelado, recebem UUIDs distintos. Repetir o upload do mesmo arquivo/UUID devolve o mesmo ID sem enviar bytes novamente. Identidade duplicada, nome divergente ou homônimo conflitante bloqueia escrita.
8. `[drive] root_folder_id` é igual a `CONFIG.pastaRaizId`, e `[drive] financial_reports_folder_name` é igual a `CONFIG.financeiro.pastaRelatorios`; ausência, formato inválido ou divergência é detectada com mensagem acionável. Nenhuma credencial é hardcoded.
9. No fluxo financeiro, token OAuth ausente/inválido ou refresh com `invalid_grant` nunca abre autorização interativa: gera erro parcial `credencial` e orienta autorização prévia. Os demais fluxos mantêm o comportamento interativo atual por padrão.
10. Sessão negada ou perfil sem `moduloLiberado_('financeiro', perfil)` não toca em `DriveApp` nem `Drive.Files`.
11. O RPC considera somente itens não excluídos, MIME `application/pdf` e nomes compatíveis com o formato novo ou legado; pagina até obter 21 válidos, retorna no máximo 20 por `modifiedTime` decrescente e calcula `temMais` pelo 21º válido.
12. Cada chamada a `Drive.Files.list` solicita `nextPageToken,incompleteSearch,files(id,name,mimeType,modifiedTime)`; `incompleteSearch === true` invalida toda a consulta antes de consumir/devolver resultados.
13. O contrato contém apenas `relatorios: [{nome, tipo, publicadoEm, url}]`, `limite` e `temMais`; a URL é construída no servidor e o ID não é campo separado.
14. Com relatórios, a interface destaca “Último relatório publicado”, tipo/data e “Abrir relatório”; os demais usam `<details>`. Campos são escapados e todos os links usam `target="_blank" rel="noopener"`.
15. Sem pasta/PDF válido, a seção mostra “Nenhum relatório financeiro publicado”. Falha de permissão/API/busca incompleta mostra erro e “Tentar novamente”. Nenhum desses estados bloqueia lançamentos.
16. Loading é anunciado; resposta atrasada é ignorada após sair do módulo; “Atualizar” renova lançamentos e relatórios.
17. Todos os IDs, seletores, data attributes, ARIA e pontos de sincronização atuais do olho permanecem funcionais; há regressão automatizada e smoke test visual de desktop/mobile/tema escuro.
18. Suítes Python e Apps Script existentes continuam passando; novos testes cobrem publicação, identidade/retry, falha parcial, autenticação não interativa, CLI inválida, configuração compartilhada, autorização, paginação/filtro/ordenação/incomplete search, estados da UI e links seguros.

### Out of Scope

- Gerar PDFs no Apps Script, iniciar Python pelo navegador ou transformar os três botões atuais em geração remota.
- Criar novo menu/tela exclusiva, busca avançada ou paginação navegável de todo o histórico.
- Excluir, editar, substituir, compartilhar, tornar público ou baixar relatórios em lote pela tela.
- Migrar automaticamente relatórios antigos que estão apenas locais ou fora da pasta dedicada.
- Alterar conteúdo/layout/cálculos dos PDFs, lançamentos, filtros, planilha `AEUV - Financeiro` ou comprovantes.
- Alterar perfis, permissões efetivas do Drive ou autenticação dos fluxos não financeiros.
- Garantir ausência matemática de colisão UUID entre máquinas; o sistema usa UUID v4 persistido e trata qualquer inconsistência detectada como conflito sem sobrescrita.

## Design técnico

### Visão geral e stack

As responsabilidades existentes serão mantidas: `financeiro_pdf.py` continuará como gerador local puro; `publicacao_drive.py` será a única camada Python de escrita remota; `drive_auth.py` continuará centralizando credenciais; `main.py` orquestrará “gerar, receber o `Path`, publicar”; `WebApp.gs` autorizará e consultará metadados; `Index.html` renderizará a seção.

O ponto exato de conclusão local é o fim de `financeiro_pdf.gerar_pdf_financeiro(filtro, lancamentos, config, saida=None, logger=None)`: `SimpleDocTemplate.build(...)` retorna sem exceção, o logger registra `Relatorio financeiro PDF gerado com sucesso em: %s` e a função retorna `saida`. Hoje `main.py` guarda esse retorno nos ramos planilha e JSON e ignora os três retornos de `exemplo`; a integração será imediatamente após cada retorno.

A stack fica bloqueada em Python 3.13 + Google Drive API v3 via `google-api-python-client`/`google-auth`, ReportLab para PDF, Apps Script V8 + Advanced Drive Service v3 e frontend HTML/CSS/JavaScript existente. Não serão adicionadas dependências.

### Decisão de UX

Será implementada **lista inline com o último relatório publicado em destaque e até 19 anteriores recolhíveis**. A frequência esperada favorece um atalho dentro do contexto financeiro, não uma tela separada. A utilidade histórica impede a alternativa de apenas um botão para o último. A complexidade permanece baixa: uma RPC independente, um cartão e um `<details>`, seguindo os padrões de loading/erro, cartões e links já usados por Notas oficiais e Central de Documentos.

A interface usará “publicado”, não “gerado”: `modifiedTime` é um metadado remoto confiável para ordenar disponibilidade no Drive, mas não prova a data de geração de arquivos legados enviados depois. O nome continua visível e carrega o timestamp local. A seção entra em `montarTelaFinanceiro()`, abaixo da barra de ações (inclusive o olho) e antes dos filtros. Se `temMais`, informa que exibe os 20 mais recentes; não abre a pasta nem pagina nesta entrega.

### Configuração e pasta

`config.ini` receberá em `[drive]`:

```ini
root_folder_id = 1uDUmgEjeISQ1W3Uc5hcUc25pgXDvVhs3
financial_reports_folder_name = Relatorios Financeiros
```

O ID já está versionado como `CONFIG.pastaRaizId` e não é segredo. `WebApp.gs` receberá em `CONFIG.financeiro`:

```javascript
pastaRelatorios: 'Relatorios Financeiros',
chavePastaRelatorios: 'FINANCEIRO_RELATORIOS_PASTA_ID',
maxRelatorios: 20
```

Um teste estático comparará os valores dos dois arquivos. A publicação financeira não derivará a raiz do pai de `[sumulas] folder_embed_url`; isso evita Python e Apps Script apontarem para raízes diferentes. `download_dir` permanece apenas local.

`PublicadorDrive` localizará `Relatorios Financeiros` somente dentro de `root_folder_id`. Zero resultado: OAuth pode criar a pasta; conta de serviço falha com instrução para configurar OAuth ou criar/compartilhar manualmente. Um resultado é usado. Dois resultados bloqueiam a operação. O Apps Script nunca cria nem compartilha a pasta: zero pasta produz lista vazia; duplicidade produz erro.

### Nome, identidade e duplicatas

`financeiro_pdf.py` validará `filtro.tipo_relatorio` em `geral|emenda|competicao` e gerará o nome com uma única captura de relógio e `uuid.uuid4().hex` completo:

```text
relatorio-financeiro-<tipo>-<AAAAMMDD-HHMMSS>-<microssegundos>-<uuid32>.pdf
```

A identidade da emissão é o UUID persistido no nome. Mesmo com horário repetido, emissões sequenciais recebem UUIDs diferentes; concorrência entre máquinas fica protegida probabilisticamente por UUID v4, e não por promessa absoluta. Um arquivo novo é criado localmente com esse nome antes do upload; retry reutiliza o mesmo caminho, portanto não inventa identidade nova.

O publicador também grava `appProperties` privadas `aeuvArtifact=financial-report` e `aeuvEmissionId=<uuid32>`. Para formato novo, consulta pasta + `aeuvEmissionId` com `pageSize=2`:

- zero itens: verifica homônimo por nome e, se livre, cria o PDF com nome, MIME e propriedades;
- um item com mesmo nome: considera retry concluído e retorna `reutilizado`, sem novo `MediaFileUpload`/update;
- um item com nome diferente, dois itens, ou homônimo sem a identidade esperada: `duplicidade`, sem escrita.

Arquivos legados (`...-AAAAMMDD-HHMMSS.pdf` e a variante intermediária com microssegundos) não têm UUID. O comando de retry consulta pasta + nome: zero cria com `aeuvArtifact`; um retorna `reutilizado`; dois bloqueiam. Relatórios financeiros nunca usam o `enviar()` mutável existente, preservando o comportamento de regulamentos/notas e evitando sobrescrever histórico distinto.

A regex compartilhada aceita legado e novo:

```regex
^relatorio-financeiro-(geral|emenda|competicao)-\d{8}-\d{6}(?:-\d{6}(?:-[0-9a-f]{32})?)?\.pdf$
```

Novas gerações exigem microssegundos + UUID; a forma ampla existe apenas para descoberta/retry de legado.

### Autenticação e publicação Python

`drive_auth.py` ganhará `ErroAutenticacaoDrive` e parâmetro keyword-only preservando compatibilidade:

```python
credenciais_oauth(client_json, token_json, logger=None, *, permitir_reautorizacao=True)
credenciais_drive(parser, logger=None, *, permitir_reautorizacao=True)
credenciais_por_arquivo(config_path, logger=None, *, permitir_reautorizacao=True)
```

Com `permitir_reautorizacao=True`, todos os chamadores atuais mantêm o comportamento: refresh falho pode abrir `InstalledAppFlow.run_local_server`. Com `False`, usado apenas pela publicação financeira automática e retry, token ausente/ilegível, credencial sem refresh token ou refresh falho lança `ErroAutenticacaoDrive` antes de abrir navegador. A mensagem orienta autorizar previamente em ambiente com navegador (por um fluxo Drive existente) ou instalar token/credencial válida. Assim jobs/headless não bloqueiam esperando interação. A leitura da planilha em `financeiro_planilha.py` mantém o padrão atual; somente o upload financeiro é não interativo.

`PublicadorDrive.carregar(...)` aceitará `permitir_reautorizacao`; o helper financeiro chamará `False` e os fluxos legados usarão o default. Não haverá cliente ou escopo duplicado.

`publicacao_drive.py` adicionará:

- `ResultadoPublicacao(id, nome, url, acao)` com `acao` `criado|reutilizado`;
- `ErroPublicacaoRelatorio(categoria, mensagem, acao, causa)`;
- `PublicadorDrive.publicar_relatorio_financeiro(pdf)` imutável;
- `publicar_relatorio_financeiro(pdf, config_path, logger)` estrito, sem `_silenciar`.

Antes de rede, valida `Path`, arquivo regular, 1 byte–50 MiB, `%PDF-`, regex e, para formato novo, UUID. `files.create` pede `fields='id,name,webViewLink,modifiedTime'`; URL ausente é construída pelo ID. Logs usam `[DRIVE][RELATORIO_FINANCEIRO]`.

Falhas operacionais são categorizadas:

| Condição | Categoria | Recuperável | Mensagem/ação ao operador |
| --- | --- | --- | --- |
| config/opção/ID/nome ou arquivo de credencial ausente | `configuracao` | sim | revisar `[drive]`, caminho e README |
| token ausente/inválido, refresh falho/`invalid_grant` em modo não interativo | `credencial` | sim | autorizar previamente ou instalar credencial válida |
| HTTP 403 `storageQuotaExceeded` | `cota` | sim | usar OAuth do proprietário; conta de serviço não cria arquivo |
| outros HTTP 403 | `permissao` | sim | compartilhar raiz/pasta como Editor com a conta autenticada |
| HTTP 404 da raiz/pasta | `pasta` | sim | corrigir/restaurar/compartilhar `root_folder_id` |
| pasta, identidade ou nome duplicado/inconsistente | `duplicidade` | manual | consolidar itens e repetir o mesmo arquivo |
| timeout, conexão, HTTP 408/429/5xx | `transitorio` | sim | repetir o comando de retry depois |
| outro `HttpError` | `api` | possível | revisar status/permissões e repetir após correção |

`TypeError`, `AssertionError` e defeitos inesperados não viram sucesso parcial; propagam como falha fatal. Nenhum log contém token, conteúdo do PDF ou credencial.

### Orquestração CLI e falha parcial

`main.py` adicionará `gerar_e_publicar_relatorio_financeiro(...)`. Ele chama o gerador e só após receber `Path` chama o publicador. Planilha e JSON usam uma vez; `exemplo` itera filtros e faz geração→publicação dentro de cada iteração. `ErroPublicacaoRelatorio` é acumulado para tentar os demais; qualquer erro remoto gera código final `2`. Erro local esperado (`ValueError`, `OSError` ou erro do ReportLab) retorna `1` e interrompe novas gerações, sem desfazer tentativas anteriores.

O parser adicionará `--publicar-relatorio-financeiro CAMINHO.pdf`. Antes dos branches:

```python
if args.publicar_relatorio_financeiro and args.gerar_pdf_financeiro:
    parser.error('--publicar-relatorio-financeiro não pode ser usado com --gerar-pdf-financeiro')
if args.publicar_relatorio_financeiro and any(
    (args.origem, args.emenda, args.periodo, args.data_inicio, args.data_fim)
):
    parser.error('filtros de geração não podem ser usados no reenvio de um PDF existente')
```

O ramo de retry valida/publica sem instanciar o gerador. `parser.error` mantém a semântica padrão de erro de uso (`SystemExit(2)` do argparse), distinta do retorno operacional parcial `2`; em ambos os casos não ocorre I/O de domínio, e os testes verificam ausência de geração/rede.

### Descoberta e contrato no Apps Script

`pastaRelatoriosFinanceiros_()` tentará o ID de `FINANCEIRO_RELATORIOS_PASTA_ID`. O cache só vale se a pasta existir, não estiver na lixeira, tiver o nome configurado e `CONFIG.pastaRaizId` como pai; caso contrário é removido. Depois percorre `pastaRaizProjeto_().getFoldersByName(...)` até distinguir zero, uma ou mais de uma pasta. Zero retorna `null`; uma é memorizada; duplicidade lança erro.

O RPC será:

```text
listarRelatoriosFinanceiros() -> {
  relatorios: [{ nome, tipo, publicadoEm, url }],
  limite: 20,
  temMais: boolean
}
```

A primeira operação é `identificarUsuario_()` + `moduloLiberado_('financeiro', perfil)`. Negação lança erro antes de Drive I/O. Pasta ausente retorna contrato vazio.

Cada `Drive.Files.list` usará:

```javascript
{
  q: "'<pastaId>' in parents and trashed = false and mimeType = 'application/pdf' and name contains 'relatorio-financeiro-'",
  orderBy: 'modifiedTime desc,name',
  pageSize: 100,
  fields: 'nextPageToken,incompleteSearch,files(id,name,mimeType,modifiedTime)',
  supportsAllDrives: true,
  includeItemsFromAllDrives: true
}
```

Antes de consumir `files` ou devolver qualquer dado de uma página, o servidor verifica `resposta.incompleteSearch === true`; se verdadeiro, descarta todo o acumulado, registra erro sem IDs/tokens e lança mensagem curta para retry. O loop rejeita token não textual, vazio quando ainda esperado ou repetido. Ele valida MIME, regex, ID e `modifiedTime`, acumula até 21 válidos ou fim das páginas e então corta em 20. `publicadoEm` usa timezone do script; `tipo` vem do grupo da regex; URL é `https://drive.google.com/file/d/<id-encoded>/view`. Metadado individual inválido é ignorado com `console.warn`; falha Drive é `console.error` no servidor e mensagem sanitizada ao cliente.

Não haverá `CacheService` de resultados porque permissões variam por usuário. Somente o ID da pasta usa Script Properties e é revalidado.

### Integração da interface

`Index.html` adicionará estado `financeiroRelatorios`, contador de requisição, `carregarRelatoriosFinanceiros()` e `renderizarRelatoriosFinanceiros()`. `montarTelaFinanceiro()` insere `#areaRelatoriosFinanceiros` com `role="status" aria-live="polite"`, deixa o restante da tela utilizável e inicia a RPC separada de `listarFinanceiro()`. Assim falha remota não impede consulta/edição dos lançamentos.

Handlers validam contador e `moduloAtual === 'financeiro'`. “Tentar novamente” repete somente a RPC de relatórios. O botão `btnRecarregarFinanceiro` remonta lançamentos e dispara nova consulta. Dados passam por `escapar`; links são `<a target="_blank" rel="noopener">`, sem `window.open`. O primeiro item é cartão de destaque; itens 2–20 ficam em `<details><summary>Relatórios anteriores</summary>`.

A seção não exibe valores monetários nem usa `data-valor-financeiro`, portanto não entra na máscara. Nenhuma função, seletor ou sincronização do olho será removida ou renomeada. Os estilos específicos entram no bloco financeiro de `Index.html`; `Estilos.html` não muda. `appsscript.json` não muda porque Drive v3, escopo Drive, V8 e Stackdriver já estão configurados.

### Tratamento de erros e invariantes

- **Geração local:** configuração/layout/recurso/diretório/ReportLab falhou; fatal `1`; nenhum upload daquele item; log no CLI.
- **Upload:** categorias operacionais da tabela; parcial `2`; local preservado; retry pelo mesmo caminho. Autenticação financeira nunca abre navegador.
- **Modo exemplo:** upload falho não impede os seguintes; geração falha interrompe; itens anteriores permanecem tentados.
- **Consulta:** sem perfil é fatal para a seção; sem pasta/PDF é vazio recuperável; permissão/API/incomplete search é erro recuperável pelo botão; lançamentos permanecem funcionais.
- **Duplicidade:** nenhuma escolha arbitrária/escrita. UUID diferencia emissão de retry; inconsistência exige intervenção.
- **Logging:** Python INFO no sucesso e ERROR no parcial; Apps Script não loga negação esperada e usa warn/error sem valores, conteúdo, credenciais ou dados pessoais.

Propriedade dos invariantes: `financeiro_pdf.py` valida tipo/cria identidade e nome; `publicacao_drive.py` valida arquivo/raiz/pasta, imutabilidade, idempotência e categorias; `drive_auth.py` garante ausência de interação no fluxo financeiro; `main.py` garante ordem e códigos; `WebApp.gs` garante autorização, minimização, paginação e integridade da busca; `Index.html` garante apresentação/acessibilidade/respostas atuais; o Drive garante permissão efetiva.

### Arquivos a modificar

- `financeiro_pdf.py`: tipo válido e nome com microssegundos + UUID.
- `drive_auth.py`: exceção tipada e modo não interativo opt-in, mantendo default atual.
- `publicacao_drive.py`: raiz/pasta explícitas, validação, identidade/appProperties, criação imutável, resultado e erros financeiros.
- `main.py`: geração→publicação, modo exemplo sequencial, retry, exclusividade CLI e códigos.
- `config.ini`: `root_folder_id` e `financial_reports_folder_name`; nenhuma credencial.
- `README.md`: pasta, configuração, identidade/retry, OAuth prévio, código `2`, árvore e acesso pelo Apps Script.
- `COMANDOS.md`: seção 7 com upload/retry, combinações inválidas e códigos.
- `apps-scripts/sistema-interno/WebApp.gs`: configuração, helper de pasta e RPC minimalista.
- `apps-scripts/sistema-interno/Index.html`: seção inline, estados, links e estilos, preservando o diff do olho.
- `tests/test_financeiro_publicacao.py` (novo): nome/UUID, validação, create/reuse/conflitos, autenticação, ordem, retry, erros e CLI.
- `apps-scripts/sistema-interno/performance/financeiro-relatorios.test.cjs` (novo): backend, configuração, paginação/incomplete search, contrato, UI e olho.

Inspecionados e sem mudança: `financeiro_planilha.py` (leitura existente), `documento_pdf.py` (gerador local não relacionado), `Estilos.html` (estilos globais suficientes) e `appsscript.json` (serviço/escopos já habilitados).

### Estratégia de testes

Testes Python usarão gerador e Drive falsos, nunca produção. Cobertura unitária: UUID distinto com relógio fixo; regex nova/legada; validação antes da rede; create e retry reutilizado sem upload; colisões bloqueadas; metadados/log; categorias, inclusive `invalid_grant`; modo não interativo não chama `run_local_server`; defaults legados continuam interativos; local preservado; `0/1/2`; retry sem geração; combinações CLI inválidas sem I/O; ordem geração→upload; três tentativas em `exemplo`; geração posterior falha após tentativa anterior. `test_financeiro_ordenacao.py` continua cobrindo conteúdo/filtros/ordenação.

O teste Node seguirá o padrão `node:test` + `vm`. Cobrirá: negação antes de I/O; cache de pasta válido/inválido; pasta ausente/duplicada; projeção incluindo `incompleteSearch`; descarte de todo resultado incompleto; páginas com inválidos antes do 21º válido; token repetido; regex/ordem/contrato mínimo/URL; loading/vazio/erro/retry/destaque/lista/`temMais`; escaping/`noopener`; resposta obsoleta; igualdade config; e presença/comportamento dos IDs, data attributes e ARIA do olho.

Validação da implementação:

```text
python -m unittest discover -s tests -p "test_*.py" -v
node --test "apps-scripts/sistema-interno/performance/*.test.cjs"
git diff --check
```

Smoke test manual, sem automação contra produção: usar OAuth e relatório controlado; confirmar local/remoto, destaque/histórico, nova aba, conta sem permissão e retry. Validar também o olho em desktop/mobile/tema escuro: máscara/restauração, foco, rótulos e estado após filtro, modal e atualização. A revisão já aprovou a lógica do olho; a implantação real continua como acompanhamento obrigatório não bloqueante.

## Respostas aos achados da revisão

1. **MEDIUM — `incompleteSearch` ausente da projeção: endereçado.** `fields` agora inclui explicitamente `incompleteSearch`; cada página é rejeitada antes de consumir/devolver arquivos, e o teste comprova descarte do acumulado.
2. **MEDIUM — `invalid_grant` incompatível com o comportamento atual: endereçado.** `drive_auth.py` passa a ter modo não interativo opt-in e exceção tipada. O upload financeiro usa esse modo e converte falha de token/refresh em parcial `credencial`; demais fluxos preservam a reautorização atual.
3. **MEDIUM — retry combinável com geração/filtros: endereçado.** `main.py` rejeita ambas as combinações via `parser.error` antes de qualquer geração/rede, com testes específicos.
4. **MEDIUM — microssegundos não garantem identidade: endereçado.** A emissão recebe UUID v4 completo persistido no nome e em `appProperties`; upload financeiro é imutável e retry reutiliza a identidade sem substituir bytes. A garantia foi corretamente limitada: colisão UUID global matemática está fora do escopo e qualquer inconsistência detectável bloqueia escrita.

Decisões de revisões anteriores permanecem incorporadas: raiz explícita compartilhada, publicação imediata por item no modo `exemplo`, limite aplicado após filtro válido, terminologia `publicado`, comando de retry, falhas tipadas e regex comum ao produtor/consumidor. O finding não bloqueante da revisão aprovada do olho foi mantido como smoke test de implantação.