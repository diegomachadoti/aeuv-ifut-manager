# Limpeza de escopo da otimização de Solicitações de Inscrições

A limpeza remove os testes persistentes específicos da feature e restaura a suíte preexistente, sem desmontar a pré-carga híbrida nem interferir nas demais alterações locais. A implementação continua entregando um snapshot rápido de solicitações `Processada` em paralelo com uma leitura final autoritativa, preservando estado visual e usando o acionador compartilhado com o Banco de Atletas. A instrumentação e os runbooks remanescentes servem à operação do fluxo implantado sem persistir payload ou PII. A nota de verificação registra explicitamente a restrição que motivou a remoção e corrige o total da suíte para 431 testes.

**Watch for:** **confirmed, non-blocking** — a pasta e o owner do snapshot permanecem sem configuração, portanto a pré-carga fica fechada até o provisionamento manual; **confirmed, non-blocking** — latência, quotas e ACL efetiva do Google Drive continuam pendentes de validação pós-publicação autorizada.

**Verdict**: APPROVED

## High-level view

A limpeza ficou limitada aos artefatos de teste: `solicitacoes-snapshot.test.cjs` não está presente e `benchmark.test.cjs` está idêntico ao HEAD. O status local ainda contém as mudanças financeiras, Python, configuração e os renomes de `COMANDOS`/`TODO`, sem sinal de restauração ampla.

O backend mantém o inventário atual do Drive como fonte de verdade, reaproveitando snapshot apenas para `Processada` com fingerprint idêntico. A resposta rápida tenta slots íntegros `current` e `previous`; a final lê ativos e misses da origem, atualiza resultados e possui fallback único para o leitor legado.

O frontend continua disparando as RPCs rápida e final em paralelo, vinculando callbacks ao token da abertura e substituindo o conteúdo provisório pelo resultado final. Busca, filtros, página, tamanho e expansões são recapturados antes da troca de DOM.

A agenda do Banco de Atletas continua sendo o único mecanismo periódico. O dispatcher tenta as duas pré-cargas independentemente, preserva cópias anteriores em falha e mantém estado e lease próprios para Solicitações.

O snapshot contém dados pessoais necessários à tela, mas a publicação exige admin, usuário efetivo igual ao owner configurado e pasta My Drive dedicada. Limites estruturais e de bytes, allowlists exatas e logs sem conteúdo reduzem a exposição; a auditoria real de permissões permanece operacional.

A nota do coder informa 431/431 testes preexistentes, sintaxe válida, smoke ad hoc não persistido e `diff --check` limpo. Esta revisão não reexecutou suíte nem smokes, conforme solicitado.

<details>
<summary>Issues (2)</summary>

1. **Provisionamento e ACL pendentes — confirmed, non-blocking** — `snapshotPastaId` e `snapshotOwnerEmail` vazios mantêm a publicação fechada. Antes de ativar, criar a pasta My Drive dedicada, auditar proprietário, herança, grupos e links e preencher os dois valores em conjunto.
2. **Aceite no ambiente Google pendente — confirmed, non-blocking** — a evidência local não mede latência, quotas nem ACL efetiva. Após uma publicação autorizada, executar as medições e os cenários pós-deploy documentados no runbook.

</details>

<details>
<summary>Details</summary>

## Remoção dos testes sem restauração lateral

A busca do workspace não encontrou `performance/solicitacoes-snapshot.test.cjs`, e `git diff -- performance/benchmark.test.cjs` retornou vazio. O `git status --short` ainda mostra `COMANDOS.txt` e `TODO.txt` removidos com suas versões `.md` não rastreadas, além das mudanças em financeiro, Python, configuração, READMEs, `WebApp.gs` e `Index.html`; a limpeza não apagou trabalho paralelo.

`insc-verification.md` declara que os testes persistentes da feature foram retirados por restrição do usuário, que nenhum outro `*.test.*` foi criado ou alterado e que `benchmark.test.cjs` voltou ao HEAD. A contagem antiga de 437 foi substituída pelo resultado real de 431 testes preexistentes, todos aprovados.

## Fluxo híbrido preservado após a limpeza

`construirSolicitacoesHibridas_` inventaria as fontes e os resultados atuais e considera snapshot somente para descritores `Processada` cujo nome, ID, pasta, data de modificação, tamanho, versão e MD5 correspondem. Solicitações `Aguardando`, `Falha` e processadas divergentes abrem o TXT vivo; criação, edição, movimentação, exclusão e resultado tardio entram na resposta final sem depender de estado `dirty`.

`listarSnapshotSolicitacoesProcessadas()` tenta uma versão apresentável inteira em `current` e depois `previous`, recusando versões vencidas ou inválidas. `listarSolicitacoes()` tenta a reconciliação híbrida e depois o leitor legado uma única vez; falha de ambos devolve mensagem sanitizada, sem payload parcial ou detalhe interno.

A publicação conserva lease, validação integral, readback antes da troca de ponteiros e uma versão anterior válida. Os tetos permanecem em 200 registros, 30 pessoas por registro, 256 KiB por TXT e 8 MiB por snapshot, com checagem de metadado antes do blob e medição UTF-8.

## Renderização progressiva vinculada à abertura

`carregarSolicitacoes()` inicia as duas RPCs sem serialização. Cada callback valida módulo e token; o reducer prioriza o sucesso final e mantém o snapshot apenas como histórico provisório enquanto a consulta autoritativa está pendente ou quando ela falha.

Antes de remontar a tela, o fluxo recaptura busca, filtros, página, opção 25/50 e linhas expandidas. O resultado final substitui integralmente o provisório, inclusive quando vazio, e a telemetria de interface emite somente `primeiro-conteudo`, `final-autoritativo` e token efêmero.

## Trigger compartilhado com falhas isoladas

`atualizarBancoAtletasAgendado()` valida o trigger CLOCK persistido e chama `atualizarPreCargasCompartilhadas_()`. O dispatcher tenta os dois builds separadamente e agrega somente mensagem sem dados; falhar uma pré-carga não impede a tentativa nem desfaz a publicação da outra.

A configuração reutiliza `BANCO_ATLETAS_HANDLER`, seu UID e os triggers visíveis do usuário atual. Não há handler ou configuração CLOCK adicional para Solicitações.

## Instrumentação operacional sem payload

`performance/benchmark.js` conserva os contratos das duas RPCs, duração, tamanho da resposta, estado, mediana/p95 e marcos de interface. Falhas descartam a mensagem do servidor; os eventos carregam apenas fase e token, e a exportação não incorpora registros, CPF, protocolo, URLs, cookies ou corpos de requisição.

`executarSolicitacoes()` compara as RPCs sequencialmente, enquanto o listener mede a abertura paralela real. Essas rotinas sustentam o runbook e o aceite pós-deploy, em vez de existirem apenas para os testes removidos. `performance/README.md` documenta coleta e critérios de mediana/p95; `apps-scripts/README.md` mantém provisionamento, ACL, geração inicial, trigger único, limites, recuperação e checklist pós-publicação.

## Fronteira de segurança e aceite no Google

A leitura exige perfil autorizado antes de Properties ou Drive, e a publicação exige administrador efetivo igual a `snapshotOwnerEmail`. O arquivo fica restrito à pasta My Drive configurada; Shared Drive e campos fora das projeções exatas são rejeitados.

**Confidence: confirmed, non-blocking.** `snapshotPastaId` e `snapshotOwnerEmail` continuam vazios, fazendo geração e configuração relacionadas ao snapshot falharem fechadas. A ativação depende de pasta dedicada, auditoria de proprietário/herança/grupos/links e preenchimento conjunto dos valores.

**Confidence: confirmed, non-blocking.** A nota afirma que não houve benchmark autenticado, deploy ou chamada externa. Latência real, quotas e ACL efetiva só podem ser aceitas após publicação autorizada com as medições e os cenários documentados.

## Evidência final consumida sem reexecução

`insc-verification.md` registra 431 testes executados e aprovados, sem falhas, cancelamentos, skips ou TODO; registra também checagens de sintaxe, compilação dos dois scripts do HTML, smoke em VM por stdin para o fluxo crítico e `git diff --check` bem-sucedido. O spot-check desta revisão limitou-se ao status do working tree, ao diff vazio de `benchmark.test.cjs` e à busca do arquivo proibido.

</details>

<details>
<summary>File map</summary>

- `apps-scripts/sistema-interno/WebApp.gs` — consulta híbrida, snapshot de processadas, limites, fallback e dispatcher compartilhado preservados.
- `apps-scripts/sistema-interno/Index.html` — RPCs paralelas, reducer tokenizado, render progressiva e estado visual preservados.
- `apps-scripts/sistema-interno/performance/benchmark.js` — medição operacional sem payload/PII.
- `apps-scripts/sistema-interno/performance/README.md` — procedimento e critérios de benchmark pós-publicação.
- `apps-scripts/README.md` — provisionamento, ACL, operação, recuperação e checklist da pré-carga.
- `apps-scripts/sistema-interno/.agents/tasks/insc-perf/insc-verification.md` — remoção transparente dos testes e evidência real de 431/431.
- `apps-scripts/sistema-interno/performance/benchmark.test.cjs` — sem diff contra HEAD.
- `apps-scripts/sistema-interno/performance/solicitacoes-snapshot.test.cjs` — removido e ausente do workspace.

Diff completo revisado: `git diff -- apps-scripts/sistema-interno/WebApp.gs apps-scripts/sistema-interno/Index.html apps-scripts/sistema-interno/performance/benchmark.js apps-scripts/sistema-interno/performance/README.md apps-scripts/README.md`.

</details>
