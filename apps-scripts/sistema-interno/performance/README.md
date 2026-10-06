# Benchmark de performance do Apps Script

Ferramenta local reutilizável; **não publicar `benchmark.js` no Apps Script**.
Não muda endpoints, permissões, regras ou dados do sistema.

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
`mutations.test.cjs` cobre snapshot original persistido antes de remoção ou
transferência, reconciliação global sem segunda varredura, inscrições ausentes,
recuperação de falhas, participante por ID/CPF, permissões revogadas durante a
espera, bloqueios, destinos/alvos removidos ou movidos, cache de IDs, flag de
métricas e contratos de resposta/frontend/legados. No fixture, elencos lidos
caem de 8/8/7 para 4 e buscas por nome de 12/12/11 para 5
(remover atleta/comissão/transferir). As escritas históricas permanecem.

## Logs do servidor: tamanho e memória versus Drive

No editor Apps Script → **Execuções**, abra a execução do salvamento,
remoção ou transferência e filtre
as linhas JSON por `"metrica":"cadastro_elenco"`. Não é necessário instalar
o monitor do navegador para estes logs. Consulte a seção **Logs de salvamento, remoção e transferência**
em `apps-scripts\sistema-interno\campeonato\README.md` para todos os campos
e fases. Compare uma criação/edição equivalente por execução, confirmando o
sucesso na tela, sem repetir gravações reais automaticamente.

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
