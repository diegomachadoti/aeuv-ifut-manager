# Benchmark de performance do Apps Script

Ferramenta local reutilizável; **não publicar `benchmark.js` no Apps Script**.
Não muda endpoints, permissões, regras ou dados do sistema.

## Elencos particionados: integração com gate de produção desabilitado

`elencos-particionados.test.cjs` cobre o armazenamento privado e o canário
do gate desabilitado. `elencos-cutover.test.cjs` cobre a integração funcional
com gate ativo **exclusivamente no VM local**. O formato e os limites estão no
[guia principal](../../README.md#elencos-particionados-etapa-inativa).
O literal `const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = false;` permanece no
código de produção. Fixtures ativas substituem esse literal por `true`,
sem alterar endpoints/regras nem executar ferramentas de publicação.
Os adaptadores `prepararParticoesElencoPorNome_` e
`lerElencoParticionadoPorEquipe_` conectam os RPCs somente quando o gate é ativo.

A camada nova usa a pasta `AEUV - Elencos - <campeonatoId codificado>` e
arquivos `Atletas - <equipeId codificado> - <revisao>.json` /
`Comissao Tecnica - <equipeId codificado> - <revisao>.json`.
`manifesto.json` publica as referências de uma vez. Somente as equipes e
categorias alteradas recebem novas versões; versões anteriores e arquivos
preparados sem publicação são retidos, nunca apagados automaticamente.
IDs permanentes definem a identidade física, não os nomes das equipes.
O nome canônico vem do registro global por ID, com erro explícito para
mapeamento ausente/ambíguo. A leitura agregada inclui equipes globais que
não estejam associadas ao campeonato ou à lista ativa, sem descartar dados.

Cada alteração efetiva confirma um `snapshot - <revisaoDestino>.json`
do estado anterior antes de preparar as partições, e um
`pendencia - <revisaoDestino>.json` antes de publicar o manifesto.
Com gate ativo, são documentos V2 de referências imutáveis + digests, sem
cópias dos registros. A integração RPC não lê/grava o histórico global:
persiste fila, índice dirty e pendência esportiva antes do manifesto.
O worker de histórico existente consome somente a linhagem publicada, em ordem,
e grava `historico - <equipeId>.json` na pasta da competição. Checkpoint por
campeonato e último commit por equipe permitem retry idempotente após falha
parcial. Journals não publicados continuam ignorados. Imports projetam os
commits pendentes em memória, filtrados pela equipe autorizada; Banco de Atletas
usa a projeção global. O histórico global V1 é ignorado sob gate ativo.
Não execute as funções privadas manualmente para substituir RPCs.

A fixture mantém o fake plano anterior e acrescenta pastas aninhadas,
arquivos homônimos em pastas distintas, IDs/pais corretos e falhas de
criação/escrita/confirmação. A cobertura nova inclui agregação multi-equipe
e multi-categoria, escrita isolada, transferências com falha na segunda
partição ou na publicação, ausência de perda/duplicação, retries, fontes
inválidas sem fallback silencioso, fingerprint vivo recuperável e
preservação byte a byte dos arquivos/IDs/histórico existentes. Também compara
campos completos (CPF, imagens, contato, situação ativa e metadados), nomes
canônicos após renomeação, dados não associados, snapshots anteriores e
journals confirmados antes da publicação. Injeta falhas de criação/leitura/
conteúdo nesses documentos, alterações em partições não afetadas e
alteração externa entre leitura e gravação da transferência. Confirmação
pós-publicação divergente ou com erro sempre exige recarregar, preserva a
causa e não declara rollback.

Um teste canário com dados novos diferentes dos legados bloqueia as funções
novas e compara os contratos atuais de elenco/cadastros, comissão ativa de
resultados, imagens, CPF, histórico, importação e gravação. Isso comprova a
inatividade consistente desses caminhos quando o gate é `false`.
Os novos testes de adaptação por `timeVinculado` verificam que todos os
registros são agrupados por ID permanente, nomes não resolvidos/ambíguos
falham e a leitura por equipe mantém os dados e nomes canônicos sem escrita.
`elencos-cutover.test.cjs` exerce adição/edição/remoção/transferência via RPC,
listagens/agregadores, cache local de operação, guardas originais,
importação de candidaturas novas e rejeição de fontes globais antigas, imagens por
equipe e agregadas com assinatura/backup, comissão ativa/inativa em resultados
e geração real da súmula no VM, histórico pré/pós-publicação e exclusão lógica
com tombstone. Falhas de histórico no worker, fila, índice dirty, snapshot, segunda
partição, journal, manifesto e resposta/readback após commit preservam estado,
causa, pendências e necessidade de recarregar, sem perda/duplicação. A cobertura
de journals inclui inclusão/edição/troca de CPF/remoção acumuladas antes do worker,
transferência seguida de edição/remoção, retry após segunda equipe, resposta
perdida de histórico e checkpoint, branches não publicados e corrupção de
versões antigas. Também compara projeção sem escrita com histórico consolidado.
Commits sem alterações de elenco preservam participações de equipes vazias
após desvinculação; histórico consolidado ausente gera erro, nunca fallback vazio.
Os testes também impedem sobrescrita por mudança externa durante a operação.

`validation-index.test.cjs` mantém as regressões V1 e acrescenta V2 sob gate:
rejeição de payload antigo, fingerprints vivos completos, corrupção/remoção/
edição externa de pasta/manifesto/partições e mudança de nome canônico,
fallback live enquanto dirty e recálculo manual/agendado, incluindo corridas.
Com índice V2 limpo, CRUD lê blobs apenas das categorias/equipes afetadas;
transferência lê e publica origem/destino juntas. O índice compacto conserva
CPF, nomes normalizados, IDs e participação para guardas entre equipes.
Após o manifesto ser publicado, deltas das listas anterior/nova atualizam o
índice sem reler os elencos. A validação das fontes continua consultando
metadados Drive v3 (ID, pasta, nome, versão e MD5) de todas as referências,
além do manifesto; isso evita baixar todos os blobs, mas ainda tem custo
de bytes/processamento proporcional ao número de partições atuais.
Cada checkpoint consulta esses metadados em lotes via `Drive.Files.list` v3:
pai exato, `trashed = false` e disjunção dos nomes exatos atuais, com escape
de barras invertidas/apóstrofos. Limites de 100 nomes e 7.000 caracteres por
consulta mantêm o filtro limitado, sem enumerar milhares de versões antigas,
snapshots ou journals. Cada lote percorre todas as páginas (até 1.000 itens
por página); duplicidades inclusive entre páginas e `incompleteSearch = true`
são rejeitadas. O campo falso/default pode estar ausente na resposta Drive;
valores malformados também são rejeitados. O manifesto listado deve manter
o ID do handle lido e o MD5 dos bytes interpretados. Ausência/falha de
`Files.list` não provoca fallback silencioso para buscas individuais.
Sem base limpa/confiável, as guardas voltam a ler as partições ao vivo e o
índice permanece dirty. Falhas de metadados impedem autorizar a mutação.
Checks antes/depois do manifesto rejeitam alterações externas observadas,
inclusive em partições não afetadas; edições manuais ainda não participam do
ScriptLock e permanece a janela inerente entre chamadas Drive.

Os checkpoints agora recebem bundles explícitos de estado, assinatura e
metadados: atletas/comissão compartilham a mesma varredura apenas naquele
checkpoint. A fase inicial de validação sem escrita também compartilha esse
bundle entre guardas e leituras de categorias; a preparação da resposta
reutiliza o baseline da equipe já lido, sem outra leitura do alvo.
Não há cache persistente de fingerprints/permissões nem reutilização de um
bundle anterior à escrita para validar o estado publicado. Preparação, precommit, poscommit e
publicação final do índice continuam verificando fontes vivas; nome/pasta,
versão e MD5 permanecem obrigatórios. O cache de índice verificado pertence ao
bundle, não à duração inteira do pedido ativo. O gravador entrega o checkpoint
poscommit completo e já verificado ao índice incremental (consumido uma vez),
sem repetir a varredura inicial nem fazer uma varredura intermediária antes
dos chunks. Após os chunks, a confirmação final resolve novamente todas as
fontes e associações/nomes vivos. A tabela inalterada é comparada à base antiga,
nunca incorporada sem recomputar participação. Qualquer falha deixa o índice
dirty e conserva o elenco, snapshots e journals já confirmados.

Fixture local de edição de atleta, índice V2 limpo e duas partições publicadas:
**63 → 31 → 16 → 6 consultas de metadados Drive v3;
75 → 41 → 26 → 16 buscas por nome** (reuso de fases seguido de lotes).
São contagens de chamadas fake, não segundos medidos no Google. A regressão
limita a edição a cinco listas independentes + um get da nova partição
e 16 buscas por nome (fixtures com duas/quatro partições: antes 16/26 e
26/36; agora 6/16 em ambas), com até 13 leituras de blobs;
um teste repete consultas de categorias doze vezes no mesmo checkpoint sem
repetir a lista única das três fontes (duas partições + manifesto).
`metadata-batch.test.cjs` verifica paginação, chunking, fontes duplicadas,
escapes, respostas incompletas/malformadas, mudanças de versão/MD5 e corrida
entre bytes do manifesto e metadados novos. Inclui 3.000 arquivos históricos
que não entram na resposta filtrada. Contagens desta correção, mesma fixture
quente com duas partições; antes eram somente `Files.get`, depois:

| Operação | Gets antes → depois | Lists antes → depois | Buscas por nome antes → depois | Blobs antes → depois |
| --- | --- | --- | --- | --- |
| Inclusão | 16 → 1 | 0 → 5 | 26 → 16 | 13 → 13 |
| Edição | 16 → 1 | 0 → 5 | 26 → 16 | 13 → 13 |
| Remoção | 16 → 1 | 0 → 5 | 26 → 16 | 13 → 13 |
| Transferência para equipe sem partição prévia | 19 → 2 | 0 → 5 | 30 → 18 | 14 → 14 |
| Listagem selecionada | 6 → 0 | 0 → 2 | 9 → 5 | 4 → 4 |
| Vínculo de equipe selecionado | 9 → 0 | 0 → 3 | 14 → 8 | 7 → 7 |

Os limites de CRUD, transferência, listagem e vínculo são regressões locais.
As corridas novas alteram fontes entre poscommit e publicação limpa e durante
escrita de chunks: edição/exclusão/renomeação de partição não afetada, manifesto,
registro global/nome canônico, campeonato, vínculos, equipes ativas e
edição/criação da tabela. Todas mantêm o índice dirty, sem rollback do elenco.
Chamadas são **O(lotes + páginas)** por fronteira fresca; bytes/processamento
continuam **O(partições atuais)**, e o fallback dirty
continua podendo baixar todos os elencos.
Snapshots e journals continuam separados, sem migração de IDs/schema ou
cache persistente de fingerprints. Gets individuais da nova partição/journal
e da tabela, quando presente, continuam necessários fora dos lotes.
A medição Google anterior à mudança registrou 32,916 s no backend ativo
(validação 7,263 s, snapshot 2,557 s, partições 2,595 s, journal 3,267 s,
precommit 3,508 s, commit 2,332 s, poscommit 3,545 s e índice 4,174 s,
incluindo confirmação fresca 3,813 s). Esses números não são uma previsão
do resultado dos lotes. Menos de 12 s é uma meta aspiracional, não garantia;
somente medição real autorizada poderá confirmar. Nenhuma publicação nem
ação remota faz parte desta etapa; o literal local permanece `false`.

`gravacao_elenco` mantém sua métrica agregada. As fases internas
`elenco_metadados_preparacao`, `elenco_indice_base`,
`elenco_preparacao_particoes`, `elenco_ids_publicacao`, `elenco_snapshot`,
`elenco_particoes`, `elenco_journal`, `elenco_precommit`, `elenco_commit`,
`elenco_poscommit` e `elenco_indice_incremental` medem blocos sequenciais,
incluindo falhas; não somar esses filhos novamente à métrica agregada.
Dentro de `elenco_indice_incremental`, `elenco_indice_baseline` mede a projeção
do bundle já confirmado, `elenco_indice_delta` a atualização compacta e
`elenco_indice_publicacao` chunks/readback/publicação. A métrica filha
`elenco_indice_confirmacao_fontes` mede a checagem fresca final, incluída
em `elenco_indice_publicacao`; não somar pai e filho.
Não cobrem todo o overhead entre blocos e outras métricas preexistentes
podem estar aninhadas.

Vincular equipe não constrói mais uma listagem agregada descartada antes
da resposta selecionada. Na adição, um único journal pós-vínculo captura
participações existentes/novas; desvinculações mantêm a captura anterior para
preservar equipes vazias removidas. `salvarTimeCampeonato`/remoção mantêm
`campeonatos`, `equipesGlobais`, `registros` (array) e `podeEditar`, mas detalham
apenas o campeonato alterado. A listagem sem filtro permanece agregada.

`esportivos-snapshot.test.cjs` também executa builders e workers agendados
com gate ativo, preservando cópias anteriores.
O diagnóstico administrativo de journals valida snapshot, destino e fontes
sem escrever/limpar; os testes comparam Drive e Script Properties antes/depois
para journals publicados, não publicados, substituídos por revisões posteriores
e corrompidos. A cadeia entre snapshots comprova as substituições; a fila é
reportada como estado atual independente, pois sua ausência também ocorre após
o worker concluir a reconciliação. O diagnóstico não executa rollback nem
roll-forward.

As regressões existentes de credenciais, índices, participação, snapshots
esportivos e agendas continuam exercitando o comportamento legado. O VM não simula
latência, quotas reais nem atomicidade entre serviços Google distintos.
O manifesto depende da substituição integral do conteúdo de um único
arquivo pelo Drive e do `ScriptLock` dos escritores da aplicação; edições
manuais concorrentes no Drive não participam desse lock. Metadados Drive v3
validam nome, pasta, versão e MD5 sem baixar os registros, em consultas
filtradas por lotes, e não removem a janela entre checagem e publicação.
Snapshots de histórico guardam referências imutáveis e digests: versões
anteriores e novas partições afetadas usam SHA-256 para replay; referências
inalteradas usam MD5 do Drive, sem baixar seus blobs. Snapshots legados continuam
aceitando o SHA-256 já persistido.

O namespace de propriedades do índice é preservado, mas payloads V1 não
autorizam consultas V2. Em mutações V2, o índice fica dirty durante preparação
e publicação. Somente uma base limpa com fingerprints atuais permite aplicar
deltas; fontes são revalidadas antes da publicação limpa. Falta de base,
divergência, concorrência, falha ou limite de propriedades mantém o índice
dirty e força guardas live até reconciliação. O fallback pode ler todas as
partições do campeonato; agregações e reconstruções completas também continuam
proporcionais aos dados. A transferência publica as duas partições num único
manifesto, sem janela de perda/duplicação para leitores do manifesto. Não há
limpeza física; journals publicados são consumidos pelo worker de
histórico, sem apagá-los. Remoção com gate ativo é somente lógica e preserva os arquivos.
Ativação remota e validação nos serviços Google reais continuam fora desta
entrega.

No cutover futuro da base de testes, os elencos atuais começarão vazios.
A leitura nova ignora os JSONs e propriedades antigos: não os copia,
migra ou mescla. Eles permanecem preservados, sem nenhum apagar automático.
Com o gate de produção desabilitado, os
consumidores legados ainda dependem deles; mantenha-os. Equipes e IDs
globais e jogos/tabela não são migrados. O histórico global antigo permanece
fisicamente preservado, mas não participa do modelo ativo.
Os testes são exclusivamente locais e não executam ações no Drive remoto.

**Limites ainda pendentes:** fingerprints e confirmações percorrem metadados de
todas as referências (sem baixar os blobs); fallback dirty e rebuild do índice
leem as fontes completas. Listagens agregadas, histórico assíncrono e
reconciliação mantêm seus próprios custos por dados/equipes. O VM não mede
latência real nem quotas Drive v3/Apps Script, e esta entrega não afirma
complexidade constante nem melhoria específica em segundos. Catálogo,
referências, versões e checkpoints não têm compactação automática.

### Regressao do indice de validacao

`validation-index.test.cjs` usa o VM de `save-fixture.cjs`, fontes Drive com
versao/MD5 e Script Properties com falhas injetadas. Cobre atualização
incremental V1 e, em V2, inclusão/edição/remoção/transferência após commit do
manifesto, além de falha de publicação que mantém dirty e força fallback live.
Também cobre CPF entre categorias, participação por IDs/CPFs antigos,
correção/exclusão de resultados, checkpoint concorrente, limites UTF-8/quota e
agenda Admin independente.
Os contadores demonstram leituras de validacao sem blobs de elenco/tabela
quando o indice e confiavel e ausencia de lock/reescrita na reconciliacao
ja atual. **Nao** simulam latencia dos servicos Google: nao converter esses
contadores nem logs misturados em promessa de reducao em segundos.

```powershell
node --test apps-scripts\sistema-interno\performance\*.test.cjs
git diff --check
```

Os cURLs copiados do Network usam callbacks internos e tokens temporários.
Podem depender da sessão Google e retornar HTTP 401 quando repetidos fora do
navegador. Tokens, cookies, cURLs, HARs e respostas com CPF/fotos não devem ser
versionados. As revisões de jogos também mudam após cada gravação: repetir um
cURL antigo pode medir um erro ou duplicar/excluir dados, não o fluxo desejado.

## Executor local com curl: somente consultas

Requer Node.js e curl com suporte a `%{json}` (curl 7.70 ou posterior).
Não instala dependências. Executa equipes, elenco e tabela sequencialmente,
sem transferência, cadastro, exclusão ou edição de critérios.

1. Copie `config.example.json` para `config.local.json` nesta pasta. O arquivo
   local é ignorado pelo Git.
2. No Network, copie um cURL **recente** de consulta. Preencha `callbackUrl`
   com sua URL completa (incluindo o token), `referer`, IDs, etiqueta e
   quantidade de repetições. Não cole os escapes de CMD (`^`, `^%^`): no JSON
   use a URL normal, com `&` e `%3A`, por exemplo.
3. Execute na raiz do projeto:

```powershell
node apps-scripts\sistema-interno\performance\executar-consultas.cjs apps-scripts\sistema-interno\performance\config.local.json > downloads\metricas-consultas.json
```

Crie a pasta de saída antes caso não exista. O programa interrompe na primeira
falha de HTTP/rede ou página HTML, preservando as métricas das chamadas anteriores.
Não segue redirecionamentos de login, não renova tokens automaticamente e
não registra corpos ou mensagens do servidor. Token/cookies são passados ao
curl via entrada padrão, não como argumentos de linha de comando.

Se retornar 401/403, atualize o token com uma captura recente. Se persistir,
a chamada pode depender de cookies da sessão: o campo `cookie` aceita o valor
do cabeçalho Cookie, **somente se disponível na sua própria captura local**.
Não envie cookies ou a configuração aqui; não tente contornar o login.
Se mesmo a cópia completa não funcionar fora do navegador, use o benchmark
autenticado ou o HAR. Estes callbacks internos não são uma API estável.

O relatório exporta duração, primeiro byte, bytes transferidos, bytes da
resposta decodificada, mediana e p95. HTTP 2xx sem HTML é
`http-ok-nao-validado`: pode ainda ser erro de aplicação no envelope interno.
Não confundir com sucesso funcional nem comparar uma resposta de erro com
dados válidos. Envie somente `metricas-consultas.json` para avaliação.
Para outra versão, troque a etiqueta; para outra sessão, atualize a configuração.

## Instalar e medir consultas

1. Abra a implantação do sistema, faça login e aguarde o carregamento inicial.
2. Abra DevTools → Console. No seletor de contexto do Console, escolha o iframe
   do sistema onde `typeof google.script.run` não retorna `undefined`.
3. Cole o conteúdo de `benchmark.js`. O navegador pode pedir autorização para
   colar scripts; revise o conteúdo antes de permitir.
4. Execute com IDs de campeonato/equipe acessíveis ao seu perfil:

```javascript
await aeuvPerformance.executarConsultas({
  etiqueta: 'branch-perf-v1',
  campeonatoId: 'ID_DO_CAMPEONATO',
  equipeId: 'ID_DA_EQUIPE',
  repeticoes: 3
});
```

São três consultas por repetição: equipes participantes, elenco e tabela.
Execução sequencial, de 1 a 10 repetições; uma falha interrompe a rodada.
O carregamento/login inicial não é medido. A primeira consulta automática não
equivale necessariamente a um cold start: o sistema pode já ter consultado
esses dados antes da instalação do monitor.

Resultados RPC com contrato reconhecido são marcados como `sucesso`.
Falhas de aplicação e respostas inválidas ficam separadas, mesmo que o HTTP
seja 200. O tempo RPC vai do disparo até o callback, incluindo execução,
transporte e desserialização; não inclui renderização da tela.
`bytesResposta` do RPC é o tamanho UTF-8 do JSON dos dados retornados,
não o tamanho comprimido transferido pela rede.

## Medir os fluxos reais, incluindo gravações

```javascript
aeuvPerformance.marcar('branch-perf-v1-manual');
```

Depois use o sistema normalmente: abrir equipes, gerenciar elenco, adicionar
ou editar atleta, transferir, remover, voltar, abrir tabela, adicionar/remover
jogo e salvar critérios. **Use somente registros descartáveis em uma base de
teste para ações que alteram dados.** O monitor não executa essas ações e não
tenta revertê-las. Cada clique usa as validações e a revisão atual do sistema.

O monitor observa os XHRs `/callback` dos métodos conhecidos. Não guarda URL,
token, cookies, argumentos, respostas, IDs, CPF, foto ou mensagens de erro.
O tempo de transporte vai de `send()` a `loadend`; o tamanho corresponde aos
bytes UTF-8 da resposta decodificada, incluindo o envelope RPC.
HTTP 2xx é **`http-ok-nao-validado`**, não sucesso de negócio: confirme na tela
que a ação funcionou antes de usar a amostra como comparação. Uma falha pode
ser rápida e não deve ser contabilizada como melhoria.
Chamadas feitas por outro transporte, como `fetch`, não são observadas.
O Apps Script também pode encaminhar RPCs ao iframe pai por `postMessage`.
Nesse caso o monitor instalado no iframe do sistema não enxerga os XHRs:
use a captura HAR abaixo para as ações manuais. As consultas automáticas
continuam sendo medidas pelo callback, independentemente do transporte.

Chamadas automáticas podem aparecer tanto como `rpc` quanto como `transporte`.
São duas medidas da mesma chamada: **não somar nem misturar os dois tipos**.
O monitor não mede o tempo de renderização nem o intervalo entre duas
requisições consecutivas; para tempo completo de clique até tela pronta,
compare também a gravação no painel Performance do navegador.

## Guardar e comparar

```javascript
aeuvPerformance.resumo();   // primeira, minimo, mediana, p95, maximo e bytes
aeuvPerformance.exportar(); // download de JSON somente com metricas
aeuvPerformance.limpar();   // inicia outra coleta
aeuvPerformance.desinstalar();
```

Guarde o JSON fora do repositório ou em `resultados\` (ignorado pelo Git).
Use etiquetas diferentes para versão anterior e nova. Mantenha navegador,
perfil, rede, campeonato, equipe e quantidade de registros/imagens equivalentes.
Não rode operações simultâneas durante a coleta. Compare mediana e tamanho,
não apenas a chamada mais rápida; p95 com poucas amostras é apenas indicativo.
Mudanças de elenco/jogos alteram a base: documente isso fora do relatório ou
restaure uma cópia de teste antes da próxima comparação.

Os arquivos ficam na branch e podem ser usados após qualquer publicação;
reinstale o script a cada recarga. Atualizar a implantação não instala o monitor.

## Captura HAR: todos os callbacks vistos no Network

Alternativa para medir os fluxos manuais independentemente de qual iframe
executa a requisição:

1. Abra Network, limpe a lista e ative Preserve log.
2. Faça os fluxos uma vez na base de teste, confirmando os sucessos na tela.
3. Exporte o HAR com os dados das requisições. Trate o arquivo como privado:
   pode conter tokens, cookies, CPF e fotos. Não envie ao GitHub.
4. Analise localmente, sem enviar o HAR ou suas respostas para serviços externos:

```powershell
node apps-scripts\sistema-interno\performance\analisar-har.cjs "C:\caminho\captura.har" branch-perf-v1 > "C:\caminho\metricas.json"
```

O JSON de saída contém somente método, sequência, duração, espera/recebimento
do HAR, status HTTP, tamanhos e resumo estatístico. Não contém os payloads
ou dados pessoais. `wait` inclui espera até o primeiro byte, não apenas
execução do Apps Script; `receive` é recebimento de resposta. Tamanhos
indisponíveis ficam `null`, nunca zero artificial. HTTP 200 continua sem
certificar sucesso de negócio. Sequência e quantidade de callbacks ajudam a
identificar recargas duplicadas.

## Testes locais da ferramenta

As consultas de Participantes e Tabela agora medem **leitura da cópia pronta**
por campeonato, não reconstrução. Antes de medir em uma implantação,
admin/diretoria devem gerar ambas as cópias e conferir seu timestamp/status.
Compare payloads do mesmo campeonato e revisão; uma resposta sem cópia é erro,
não ganho de performance. Abrir edição/resultado/elenco e retornos de gravações
continuam consultando contexto atual. Não automatize recálculos/mutações reais
no executor de consultas.

Cobertura persistente das cópias esportivas:

```powershell
node --test apps-scripts\sistema-interno\performance\esportivos-snapshot.test.cjs
node --test apps-scripts\sistema-interno\performance\*.test.cjs
```

`esportivos-snapshot.test.cjs` usa o fixture de cadastros existente e Drive,
PropertiesService, relógio e gatilhos simulados. Verifica contratos dos builders
existentes, isolamento por campeonato, autenticação/revogação/identidade de
associado, bloqueios atuais, retorno vivo/revisão otimista das mutações,
pendência durante geração, lease/expiração, erros/readback e conservação da
versão anterior, limpeza targeted, agendas 5/15/15 independentes/idempotentes,
responsável/UID e orçamento/checkpoint/rodízio. Também verifica sintaxe do
frontend, separação Atualizar/recálculo e revalidação antes de editar.

Não instala gatilhos nem acessa serviços reais. Latência, quotas, disputa de
lock e periodicidade efetiva **não foram medidos em produção**. Os acionadores
compartilham quotas; orçamento de 210 s entre campeonatos não interrompe um
builder individual. A lease de dez minutos recupera timeout sem publicação
parcial. Invalidação local é conservadora/compartilhada; alterações externas
aparecem quando o campeonato é reconstruído no próximo rodízio. Consulte a
seção **Cópias de Equipes Participantes e Tabela de Classificação** no README
dos aplicativos para ativação, permissões e recuperação.

Com Node.js, sem instalar dependências:

```powershell
node --test apps-scripts\sistema-interno\performance\benchmark.test.cjs
```

Esses testes verificam a coleta, os limites, a separação entre HTTP e sucesso
RPC e a ausência de dados privados no relatório. Não medem a implantação real.

Para salvamento, remoção/transferência de elencos e otimização de imagens:

```powershell
node --test apps-scripts\sistema-interno\performance\save.test.cjs apps-scripts\sistema-interno\performance\mutations.test.cjs apps-scripts\sistema-interno\performance\escudos.test.cjs apps-scripts\sistema-interno\performance\arquivos-id.test.cjs apps-scripts\sistema-interno\performance\benchmark.test.cjs
```

Fixtures locais, sem acesso ou escrita na rede. Os testes de salvamento cobrem
criação/edição de atleta e comissão, ausência de leituras de vínculo/Drive
antes do lock, revalidação de autorização e propriedade depois da espera,
time forçado pelo contexto fresco, CPF/participação, resposta autorizada,
reconciliação histórica global e recuperação de falhas. Também verificam que
os endpoints legados mantêm seu time solicitado e suas permissões.
Contagens são chamadas no fixture, não uma garantia de tempo no Drive.
Nas mutações de elenco, a preparação e a leitura dos arquivos de elenco são
limitadas ao campeonato afetado; a reconciliação global permanece nos fluxos de
importação e manutenção. Isso não segmenta o armazenamento do histórico:
quando o JSON global já existe, ele ainda precisa ser carregado para preservar
as inscrições das demais competições.

Para o Banco de Dados de Atletas:

```powershell
node --test apps-scripts\sistema-interno\performance\atletas-banco.test.cjs apps-scripts\sistema-interno\performance\atletas-snapshot.test.cjs
```

VM do frontend com 141 e 1.001 atletas: páginas de 25/50, filtros sobre toda
a base, indicadores globais, busca recebida, índices originais nos detalhes,
zero resultados, limites de página, atualização e callbacks obsoletos.
Navegação e expansão não repetem RPC, filtragem ou indicadores.
O fixture de backend compara resposta e histórico com o caminho sem reuso:
leituras de campeonatos/equipes passam de 2 para 1 por recálculo; as quatro
listas dos dois campeonatos continuam lidas na reconciliação global.
Verifica permissões, recuperação, campos de detalhe e ausência de fotos/RG
na resposta. Não implica redução garantida de segundos ou tamanho do payload.

Também compara **todo o resultado do construtor vivo `construirBancoAtletas_`
(antigo corpo de `listarAtletas`) e o histórico persistido**
com a cadeia anterior de fontes completas (fixtures sintéticos, sem rede),
incluindo homônimos/CPFs, comissão, solicitações de inclusão/remoção/portabilidade,
documentos malformados, fonte vazia, limites 0/1/3/20, duplicatas legadas entre
subpastas e exclusão de duplicatas na raiz. Verifica autorização em cada fonte,
propagação de erros, contratos públicos completos, notas ausentes, silêncio
fora do banco, IO equivalente com métricas desligadas e releitura em cada recálculo.

`atletas-snapshot.test.cjs` cobre primeira geração explícita, permissão atual
antes da leitura, contrato/schema/contagens, cópia corrompida ou incompleta,
isolamento da leitura pronta (sem fontes/reconciliação/cache de negócio),
falhas de fonte/escrita/validação/publicação preservando a cópia anterior e o
erro original, metadados sanitizados, lease concorrente/expirada/tomada por
outra execução, ausência de lock aninhado, retenção atual+anterior e limpeza
dirigida. Mocka instalação idempotente a cada 15 minutos, propriedade/visibilidade
dos gatilhos, preservação dos demais gatilhos, desativação exclusiva do dono,
conta efetiva sem sessão ativa, revogação de admin e erros automáticos.
Os testes de frontend também cobrem timestamp, primeiro recálculo, ação longa
única, falha explícita e releitura que reinicia paginação/detalhes.
Nenhum teste instala gatilhos, grava Drive real ou publica a implantação.

No cenário de três TXT selecionados dentre cinco achados por fonte:

| Operação simulada | Antes | Depois |
| --- | ---: | ---: |
| Nomes de arquivos de solicitações (`getName`) | 13 | 7 |
| Nomes dos arquivos de resultados (`getName`) | 23 | 11 |
| URLs dos resultados (`getUrl`) | 11 | 7 |
| Nomes de arquivos de súmulas (`getName`) | 10 | 7 |
| Leituras do controle de punições (`getBlob`) | 2 | 1 |
| TXT de solicitações/súmulas abertos | 3 + 3 | 3 + 3 |

São contagens de métodos no fixture, não chamadas HTTP nem segundos economizados.
O índice de resultados ainda percorre todos os nomes e escolhe o processamento
mais recente para cada TXT/PDF necessário. Os links usados nos detalhes,
os totais/limites e URLs das pastas não mudam. `getDateCreated` de todas as
súmulas candidatas permanece necessário para manter a ordenação/recorte.
As telas públicas mantêm anexos, resumo, relato, arbitragem, notas/punidos e
seus filtros; somente a projeção privada dispensa esses campos não utilizados.
Não há cache de conteúdo que dispense a reconciliação global no **recálculo**.
A consulta agora autoriza e lê apenas o snapshot persistido pronto; ele é
intencionalmente defasado e não participa das validações de mutação.

Cadeias verificadas no servidor:

- `construirBancoAtletas_` → `lerSolicitacoes_(true)` → autorização →
  `pastaSolicitacoes_` → enumeração Entrada/Processados/Falhas/raiz →
  ordenação/carimbo e limite → `indiceResultados_` → TXT selecionados →
  `interpretarSolicitacao_` → consolidação. A tela pública usa
  `listarSolicitacoes` → o mesmo leitor com projeção desligada.
- `construirBancoAtletas_` → `listarPunicoes` → autorização → `arquivoPunicoes_` →
  blob/`interpretarPunicoes_`; depois `lerSumulas_(true)` → autorização →
  `pastaSumulas_` → enumeração/data de criação/ordenação e limite →
  TXT/`interpretarSumula_` → consolidação. A tela pública usa
  `listarSumulas` → o mesmo leitor completo → `indiceNotas_` →
  `arquivoPunicoes_`/blob/`interpretarPunicoes_` → notas/punidos e filtro de equipes.
  Essa última cadeia de enriquecimento não alimentava nenhum campo do atleta.

`mutations.test.cjs` cobre snapshot original persistido antes de remoção ou
transferência, reconciliação global sem segunda varredura, inscrições ausentes,
recuperação de falhas, participante por ID/CPF, permissões revogadas durante a
espera, bloqueios, destinos/alvos removidos ou movidos, cache de IDs, flag de
métricas, contratos de resposta/frontend/legados e fila do histórico: marcador
anterior à gravação, retry idempotente, falha sem perda de pendência e acionador
de consolidação. Também verifica que competição ausente não perde a pendência e
que a reconciliação manual de uma competição reconstitui inscrições a partir
dos elencos atuais. A preparação/snapshot anterior continua síncrona; a escrita
final do histórico passa a ocorrer no processador da fila. No fixture, elencos
lidos caem de 8/8/7 para 4 e buscas por nome de 12/12/11 para 5
(remover atleta/comissão/transferir).

## Logs do servidor: tamanho e memória versus Drive

No editor Apps Script → **Execuções**, abra a execução do salvamento,
remoção ou transferência e filtre
as linhas JSON por `"metrica":"cadastro_elenco"`. Não é necessário instalar
o monitor do navegador para estes logs. Consulte a seção **Logs de salvamento, remoção e transferência**
em `apps-scripts\sistema-interno\campeonato\README.md` para todos os campos
e fases. Compare uma criação/edição equivalente por execução, confirmando o
sucesso na tela, sem repetir gravações reais automaticamente.

Para `listarAtletas`, filtre `"metrica":"atleta_banco"`: apenas a fase
`snapshot` (leitura e validação da cópia pronta), sem leitura de fontes.
No recálculo manual/programado, o construtor vivo mantém cinco fases sequenciais
`elenco`, `solicitacoes`, `punicoes`, `sumulas` e `consolidacao`, sem contagem
duplicada entre essas fases. `elenco` inclui espera pelo lock, reconciliação
global e montagem dos vínculos; `consolidacao` mede apenas o merge/ordenação
em memória depois de ler as quatro fontes. Logs `cadastro_elenco` internos
de reconciliação são filhos de `elenco`, não valores adicionais para somar.
As cinco fases principais registram apenas `metrica`, `fase`, `duracaoMs`,
inclusive em falhas, sem identificadores ou dados pessoais. A mesma flag
`CADASTRO_METRICAS_ATIVAS` desliga todos os logs/cálculos adicionais.
Publicar Index.html e WebApp.gs juntos é necessário para atualizar a tela e
o backend; o teste local não publica nem faz chamadas de rede.

As categorias `solicitacoes` e `sumulas` em `atleta_banco` detalham:

- `autorizacao`: identificação e permissão do módulo, mantidas em cada fonte;
- `localizar`: abertura da pasta raiz;
- `enumerar`: subpastas/raiz, nomes, data de criação de súmulas e ordenação;
- `resultados`: índice dos resultados de solicitações (nomes e URLs necessários);
- `drive_ler`: abertura/decodificação dos TXT selecionados;
- `tamanho_utf8`: custo de medir os textos já lidos, sem IO extra;
- `interpretar`: parser/projeção, incluindo `metadados` (URLs usadas no detalhe);
- `leitura`: pai inclusivo de toda a fonte, incluindo preparação da resposta.

Há somente uma linha por subfase/categoria na execução, agregando todos os TXT,
não uma linha por arquivo. Contadores `arquivosLidos`/`bytesLidos` referem-se aos
TXT decodificados com sucesso daquela fonte, não a resultados, controle de
punições, tamanho da resposta ou bytes transferidos pela rede.
`total`/`selecionados` aparecem depois da montagem bem-sucedida dos registros;
em falhas antecipadas podem estar ausentes. Os números são repetidos nas
subfases para contexto, **não somá-los**. `metadados` é filho de `interpretar`;
ambos estão em `leitura`, que por sua vez está na fase principal da fonte.
Não somar esses pais/filhos. Consultas públicas de solicitações/súmulas
não emitem essas métricas.

Na amostra informada, solicitações custaram 13,340 s e súmulas 3,807 s de
31,25 s; as fases antigas não identificam qual suboperação domina. A análise
do caminho e contagens sintéticas comprovam trabalho descartado (URLs de
resultados não selecionados, nomes relidos e enriquecimento duplicado com
punições), não uma redução mensurada de latência. TXT, varreduras e história
global continuam necessários. **Tempo real depois permanece não medido**:
nenhuma publicação, consulta à rede ou escrita em dados reais foi executada.


Separe `drive_localizar`, `drive_iterar`, `drive_ler`, `drive_setContent` e
`drive_criar` das etapas `json_*`, `reconciliacao_memoria` e
`historico_*_memoria`. `tamanho_json` informa bytes UTF-8 brutos/gravados e
contagens por categoria/direção; `tamanho_utf8` explicita a sobrecarga de medir.
Não some etapas com os pais inclusivos `preparacao_historico`,
`gravacao_historico`, `gravacao_elenco`, `validacao_leitura` e `resposta`.
O custo de normalizações e chamadas não instrumentadas continua nos pais;
as novas etapas não pretendem decompor todo o tempo do servidor.
Ausência de arquivo, validação inválida ou falha de escrita pode não produzir
contador de tamanho; tempos de falha não comprovam sucesso.

Nenhuma leitura Drive extra é feita para medir: usa os textos já lidos e o
JSON já serializado para gravar. Bytes incluem imagens base64 e snapshots,
não seu tamanho binário; não há conteúdo/identificador nos logs. Os testes
também verificam Unicode, contadores, privacidade, IO equivalente, migração
global, silêncio fora da operação e emissão de etapas nas falhas.

O refinamento de handles reutiliza o File encontrado na leitura somente nas
escritas da mesma operação sob ScriptLock/contexto autorizado. Captura também
ausência/legado, guarda o handle após criação e o descarta ao terminar, mesmo
em erro; não introduz cache/índice entre requisições. No fixture com migração
global e duas escritas históricas, buscas/iterações caem de 9 para 5, sem mudar
leituras, snapshots ou escritas; no salvamento comum com histórico reconciliado,
caem de 7 para 5. Na amostra real, as duas buscas/iterações
redundantes custaram 524 ms: redução candidata **~0,5 s**, não promessa de tempo.

`lock_vinculo` e `lock_bloqueio` agora detalham registro de equipes, equipes
ativas, autorização da equipe, lista/alvo de campeonato, times e validação
de vínculo, além de leitura/consulta em memória do bloqueio. A autorização
separa identificação e perfil. Registro/campeonatos/bloqueios usam categorias
próprias nas etapas Drive/parse; nenhuma consulta extra é feita para medir.
Veja os nomes exatos e a hierarquia no README de campeonato. Filhos continuam
inclusos nos pais e não devem ser somados. Quando a escrita reutiliza o handle,
ela não emite etapas de localização/iteração. O custo dominante de `setContent`,
das quatro leituras e da reconciliação global continua presente.

O cache de IDs de arquivos (somente IDs, por usuário, sempre reverificados) é
descrito em **IDs de arquivos entre chamadas** no README de campeonato. No
fixture, um salvamento quente com 8 arquivos troca 8 buscas por nome por 8
aberturas diretas, mas as chamadas de método sobem de 32 para 48 por causa da
verificação de nome/lixeira/pasta. Não é promessa de ganho: compare, na mesma
base e ação, `drive_localizar` + `drive_iterar` (antes) com `drive_id_cache` +
`drive_id_abrir` (depois) e desligue `ARQUIVO_ID_CACHE_ATIVO` se não houver
redução. O CacheService pode expulsar entradas a qualquer momento; nesse caso
a chamada volta à busca por nome sem erro.
