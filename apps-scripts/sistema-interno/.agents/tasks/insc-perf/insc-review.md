# Pré-carga híbrida e renderização progressiva de Solicitações de Inscrições

A implementação troca a abertura síncrona por duas consultas paralelas: um snapshot de processadas entrega conteúdo provisório, enquanto a consulta híbrida reconcilia o Drive e produz a resposta final autoritativa. O backend adiciona inventário paginado, fingerprints fortes, slots `current`/`previous`, publicação atômica e limites explícitos; o frontend adiciona reducer tokenizado, preservação visual e paginação local. Os quatro achados do passe anterior foram corrigidos no código, nos testes persistentes, no benchmark e no runbook. Não encontrei preocupação bloqueante nova ou ainda não resolvida no diff atual.

**Watch for:** **confirmed, non-blocking** — `snapshotPastaId` e `snapshotOwnerEmail` continuam vazios de propósito, então ativação exige provisionamento e auditoria de ACL; **confirmed, non-blocking** — latência real e ACL efetiva do Google Drive permanecem verificações pós-publicação, não executadas nesta tarefa.

**Verdict**: APPROVED

## High-level view

A resposta rápida aceita apenas um snapshot integral, dentro do teto e não vencido, tentando `current` e depois `previous`. A final sempre reinventa fontes e resultados, lê estados ativos da origem e reutiliza uma `Processada` somente após comparar o fingerprint vivo contra os candidatos dos dois slots; falha da tentativa híbrida leva no máximo uma vez ao leitor legado, sem payload parcial.

A pré-carga foi incorporada a `atualizarBancoAtletasAgendado`. O dispatcher valida a agenda compartilhada uma vez e tenta os dois builds independentemente, enquanto estado, lease, publicação e erro continuam separados por pré-carga.

A navegação captura busca, três filtros, página, tamanho e expansões antes de substituir o DOM. Cada abertura vincula a cópia a um token novo; callbacks antigos são descartados, e o sucesso final substitui integralmente o provisório inclusive quando vazio.

O snapshot com protocolo, CPF, telefone e URLs de comprovantes fica restrito a uma pasta My Drive dedicada e exige administrador/owner configurado para publicar. TXT e JSON têm tetos em bytes UTF-8, limites por lista/campo, checagem de `file.size` antes dos blobs, medição antes da criação e allowlists públicas exatas.

A nota de verificação registra 437 testes passando, sintaxe e whitespace válidos e smokes dos fluxos críticos. Também registra ausência de deploy, chamada Google autenticada, trigger real, commit, push ou worktree; a inspeção atual encontrou um único worktree e todas as alterações locais paralelas ainda presentes.

<details>
<summary>Issues (2)</summary>

1. **Provisionamento e ACL pendentes — confirmed, non-blocking** — os IDs vazios mantêm a publicação fechada. Antes de ativar, provisionar a pasta My Drive dedicada, auditar proprietário/herança/grupos e preencher juntos pasta e owner conforme o runbook.
2. **Aceite de latência adiado — confirmed, non-blocking** — testes locais comprovam contratos e contagens, não a latência do Google. Após uma publicação autorizada, executar as dez aberturas equivalentes documentadas e conferir mediana/p95.

</details>

<details>
<summary>Details</summary>

## Reconciliação viva com recuperação por item nos dois slots

`construirSolicitacoesHibridas_` (`WebApp.gs:8527`) mantém, por `arquivoNome`, candidatos ordenados `current` → `previous`. Para cada vencedora `Processada` do inventário, procura o primeiro fingerprint integralmente idêntico; divergência no atual já não bloqueia o anterior, corrigindo o achado do passe anterior. `Aguardando`, `Falha` e misses passam por confirmação de ID, nome, pai, tamanho, `modifiedTime`, `version`, MD5 e lixeira antes do blob; divergência aborta a tentativa híbrida inteira.

O inventário pagina a raiz e cada pasta reservada, distingue My Drive de Shared Drive, rejeita buscas incompletas, tokens repetidos e pastas homônimas, e consolida pela precedência `Entrada` → raiz → `Falhas` → `Processados`. O total é calculado antes do corte de 200, e `Resultados` é indexada a partir do inventário atual apenas para as bases selecionadas. Criação, edição, movimento, exclusão e TXT/PDF tardio chegam à resposta final e ao próximo build sem `dirty` ou `marcarSnapshotSolicitacoesPendente_`.

A rápida recusa `now >= expiresAt` e tenta ambos os slots completos. A final pode usar slot expirado somente como candidato sujeito ao fingerprint vivo; sem hit, lê a fonte. Erros de inventário, confirmação, parser ou contrato chamam `lerSolicitacoes_(false)` uma vez, e falha também do legado devolve a mensagem fixa sanitizada.

## Um acionador compartilhado com falhas independentes

`atualizarBancoAtletasAgendado` (`WebApp.gs:10825`) conserva `BANCO_ATLETAS_AGENDA`, valida admin, owner, UID e CLOCK antes de chamar o dispatcher. `atualizarPreCargasCompartilhadas_` tenta os dois builds separadamente e agrega falhas sem mensagem externa; uma publicação bem-sucedida não é revertida pela falha da outra.

Não há agenda, handler CLOCK nem criação/exclusão de trigger específica de Solicitações. A administração usa somente os controles existentes do Banco; a configuração reutiliza o UID persistido ou um trigger visível e remove apenas duplicatas visíveis do mesmo handler. O status de Solicitações lê essa agenda com `agendaCompartilhada:true`, mas mantém property, lease e erro próprios.

## Snapshot de dados pessoais com publicação fechada

As leituras autorizam `admin`/`diretoria` antes de Properties ou Drive; recálculo/status exigem administração, e publicação exige o usuário efetivo igual a `snapshotOwnerEmail`. O estado aceita somente `current`, `previous`, `lease`, `lastAttemptAt` e `lastError`. O build mantém I/O fora do lock, valida e relê o arquivo inteiro antes de trocar slots, preserva versões publicadas em falha e remove apenas artefatos novos/obsoletos conhecidos quando não referenciados.

O schema limita a 200 registros e 30 pessoas, exige fingerprints únicos, datas canônicas, expiração de 24 horas, contagens coerentes e `situacao === 'Processada'`. A projeção contém exatamente 17 campos do registro e seis por pessoa. Cada TXT é limitado a 256 KiB e o snapshot a 8 MiB; metadado e bytes decodificados são conferidos, e o JSON serializado é medido antes de `createFile`.

**Confidence: confirmed, non-blocking.** O runtime valida My Drive, owner configurado e acesso, mas não prova herança nem composição de grupos. `apps-scripts/README.md:831` trata a auditoria manual da ACL e a primeira geração pelo owner como pré-requisitos, e os valores vazios atuais impedem publicação acidental.

## Estado visual vinculado ao token da abertura

No ramo real de `abrirModulo` (`Index.html:2850`), o estado é capturado antes de `renderizarModulo` trocar `conteudo.innerHTML` e segue para `carregarSolicitacoes(estadoInicial)`. Snapshot e final ocupam ramos independentes do token; callbacks verificam módulo/token e não escrevem DOM diretamente.

O reducer mantém loading enquanto resta resposta autoritativa possível, conserva o histórico provisório com aviso quando a final falha e sempre prioriza o sucesso final. Antes de remontar, recaptura o estado do token, reaplica filtros ainda disponíveis, limita a página e conserva expansões presentes. Busca, filtros, paginação 25/50 e expansão permanecem locais; ordenação, indicadores, links, Atualizar, pasta e detalhes continuam no contrato.

## Evidência persistente e fronteira da validação

O novo `performance/solicitacoes-snapshot.test.cjs` cobre `current` divergente → `previous` idêntico, ativos frescos, slots grandes/corrompidos, miss integral, allowlists, limites, consolidação, dispatcher e tokenização. O benchmark reconhece as duas RPCs e os marcos `primeiro-conteudo`/`final-autoritativo`, guardando apenas método, duração, bytes e estado.

Não reexecutei testes ou benchmarks. A nota do coder registra 437/437 testes na suíte final, 146/146 no conjunto direcionado, sintaxe de backend/frontend/benchmark e `git diff --check` sem erros, além de smokes locais sem rede. **Confidence: confirmed, non-blocking.** O benchmark autenticado e a ACL real não foram validados porque exigem deploy/chamadas Google proibidos aqui; o runbook os mantém como checklist pós-publicação.

## Mudanças paralelas e salvaguardas locais

O working tree ainda contém olho dos valores financeiros, relatório/Drive, conversões `COMANDOS.md`/`TODO.md`, Python, configuração, READMEs e `.agents` registrados como preexistentes. `appsscript.json` segue sem diff, e `main.py` permanece modificado como alteração anterior documentada.

A nota declara ausência de deploy, chamadas externas, trigger real, commit, push e worktree. A inspeção local corrobora um único worktree, HEAD `06e8448b396c7dd36e98b24b3ae94e8dc38773d8`, mudanças ainda não commitadas e `git diff --check` limpo; deploy e estado remoto do Apps Script não puderam ser consultados por proibição expressa da tarefa.

</details>

<details>
<summary>File map</summary>

- `apps-scripts/sistema-interno/WebApp.gs` — inventário híbrido, snapshot atômico, contrato limitado e dispatcher compartilhado; mantém mudanças financeiras paralelas.
- `apps-scripts/sistema-interno/Index.html` — renderização tokenizada, preservação visual, paginação e administração compartilhada; mantém olho e relatórios financeiros.
- `apps-scripts/sistema-interno/performance/solicitacoes-snapshot.test.cjs` — regressão dos slots, limites, leitura viva, dispatcher e reducer.
- `apps-scripts/sistema-interno/performance/benchmark.js`, `benchmark.test.cjs` e `README.md` — instrumentação e aceite rápido/final sem payload.
- `apps-scripts/README.md` — provisionamento, ACL, owner, trigger único, recuperação e checklist pós-publicação.
- `COMANDOS.txt` → `COMANDOS.md`, `TODO.txt` → `TODO.md`, `README.md`, `config.ini`, `drive_auth.py`, `financeiro_pdf.py`, `main.py`, `publicacao_drive.py` e `.agents/` — alterações paralelas preservadas, fora deste escopo.

Diff completo revisado: `git diff -- apps-scripts/sistema-interno/WebApp.gs apps-scripts/sistema-interno/Index.html`.

</details>
