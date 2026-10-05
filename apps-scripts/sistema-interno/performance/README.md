# Benchmark de performance do Apps Script

Ferramenta local reutilizável; **não publicar `benchmark.js` no Apps Script**.
Não muda endpoints, permissões, regras ou dados do sistema.

Os cURLs copiados do Network usam callbacks internos e tokens temporários.
Podem depender da sessão Google e retornar HTTP 401 quando repetidos fora do
navegador. Tokens, cookies, cURLs, HARs e respostas com CPF/fotos não devem ser
versionados. As revisões de jogos também mudam após cada gravação: repetir um
cURL antigo pode medir um erro ou duplicar/excluir dados, não o fluxo desejado.

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
