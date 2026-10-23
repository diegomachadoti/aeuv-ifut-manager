# Verificação — desempenho de Solicitações de Inscrições

Data: 2026-10-22

## Limpeza de escopo

A implementação funcional da otimização em `WebApp.gs` e `Index.html` foi preservada sem alterações nesta limpeza: estratégia híbrida, snapshot de `Processada`, leitura fresca dos dados ativos, renderização progressiva, preservação de estado, trigger compartilhado, limites e fallback continuam presentes.

Por restrição explícita do usuário, os testes persistentes adicionados pela feature foram removidos:

- `performance/solicitacoes-snapshot.test.cjs` foi excluído;
- `performance/benchmark.test.cjs` foi restaurado exatamente ao `HEAD` anterior e não aparece mais modificado.

Nenhum outro arquivo `*.test.*` foi criado ou alterado. `performance/benchmark.js` foi preservado somente como instrumentação operacional sem payload/PII: RPC rápida/final, clique→primeiro conteúdo, clique→final e agregações de mediana/p95. O registro e a remoção do listener usam uma guarda de disponibilidade para manter compatibilidade com a suíte preexistente. Os runbooks em `performance/README.md` e `apps-scripts/README.md` foram preservados por documentarem configuração, operação, trigger compartilhado, recuperação e benchmark pós-deploy.

Não houve deploy, chamada externa, commit, push ou worktree. Todas as demais mudanças locais e renomes foram preservados.

## Suíte preexistente

Executado na raiz `/Users/tqi_dmachado/workspace/aeuv-ifut-manager`:

```sh
node --test apps-scripts/sistema-interno/performance/*.test.cjs
```

Resultado real após a limpeza:

- **431 testes**
- **431 passaram**
- 0 falharam
- 0 cancelados
- 0 ignorados
- 0 TODO
- duração: 506,047833 ms

A validação final usa somente essa suíte preexistente e smokes ad hoc fornecidos por stdin; não há teste persistente novo para a feature.

## Sintaxe

Executados com sucesso, código de saída 0:

```sh
node --check < apps-scripts/sistema-interno/WebApp.gs
node --check apps-scripts/sistema-interno/performance/benchmark.js
node - <<'NODE'
// lê Index.html, extrai cada <script>, remove blocos de template <? ... ?>
// e compila cada corpo com new vm.Script(...)
NODE
```

O validador de `Index.html` encontrou e compilou **2 scripts** sem erro. Uma primeira execução combinada do validador de HTML terminou sem saída com código de ferramenta `-1`; a mesma verificação foi repetida isoladamente via stdin e concluiu com código 0.

## Smoke ad hoc não persistido

Foi executado via `node - <<'NODE'`, sem gravar arquivo e sem rede. O smoke carregou `WebApp.gs` e a seção de Solicitações de `Index.html` em `node:vm` e verificou:

- presença das RPCs rápida e final;
- presença da leitura/build de snapshots e do dispatcher compartilhado;
- ausência de handler CLOCK exclusivo para Solicitações;
- disparo paralelo das duas RPCs;
- renderização provisória seguida da final autoritativa;
- preservação de busca, filtros, paginação, tamanho da página e expansões;
- marcas `primeiro-conteudo` e `final-autoritativo`.

Saída do smoke final:

```json
{"smoke":"solicitacoes","rpcs":2,"progressive":true,"finalAuthoritative":true,"statePreserved":true,"sharedTrigger":true}
```

Duas tentativas anteriores do próprio harness falharam porque o stub de DOM devolvia o estado visual padrão (`pagina: 0`, `porPagina: 25`, sem expansões), e não por falha do produto. O harness final passou a simular corretamente a captura do estado da tela e concluiu com código 0.

## Integridade do diff

Executado antes da atualização desta nota:

```sh
git -C /Users/tqi_dmachado/workspace/aeuv-ifut-manager diff --check
```

Resultado: código 0, sem erro de whitespace. Após esta nota, o mesmo comando foi executado novamente na conferência final.

Também foram conferidos ao final:

```sh
git -C /Users/tqi_dmachado/workspace/aeuv-ifut-manager status --short
git -C /Users/tqi_dmachado/workspace/aeuv-ifut-manager diff
git -C /Users/tqi_dmachado/workspace/aeuv-ifut-manager diff -- apps-scripts/sistema-interno/performance/benchmark.test.cjs
git -C /Users/tqi_dmachado/workspace/aeuv-ifut-manager ls-files --others --exclude-standard
```

A conferência confirmou que `benchmark.test.cjs` está idêntico ao HEAD e que nenhum novo `*.test.*` permaneceu adicionado.

## Limitação

Não foi realizado benchmark autenticado no Apps Script/Google Drive, pois deploy e chamadas externas estão proibidos nesta tarefa. A validação comprova sintaxe, regressão local e contratos do fluxo em VM, mas a latência real, quotas e comportamento dos serviços Google devem ser medidos apenas em uma tarefa pós-publicação autorizada.
