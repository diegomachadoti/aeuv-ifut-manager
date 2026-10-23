# Requisitos e design — desempenho de Solicitações de Inscrições

## Requisitos

### Summary

A abertura de **Solicitações de Inscrições** deve deixar de esperar a enumeração, o download e a interpretação síncrona de até 200 TXT antes de exibir conteúdo. O fluxo atual é `Index.html::carregarSolicitacoes()` → RPC `WebApp.gs::listarSolicitacoes()` → `lerSolicitacoes_(false)`: o servidor autoriza, abre `CONFIG.solicitacoes.pastaRaizId`, percorre `Entrada`, `Processados`, `Falhas` e a raiz com `DriveApp`, ordena pelo carimbo no nome, limita em 200, indexa `Resultados`, abre cada TXT selecionado e só então responde. Não há planilha nesse caminho. `main.py` busca `Entrada`, move o TXT para `Processados` ou `Falhas` e publica TXT/PDF em `Resultados` em operações distintas, portanto transições e resultados tardios precisam ser observados.

A decisão arquitetural é uma estratégia **híbrida**. Um snapshot durável somente das solicitações cujo estado consolidado é `Processada` fornece o primeiro conteúdo útil; em paralelo, uma consulta autoritativa inventaria o Drive atual, lê sempre os registros ativos (`Aguardando` e `Falha`) e reaproveita uma processada somente se `id`, nome, pai, tamanho, `modifiedTime`, `version`, `md5Checksum` e estado de lixeira confirmarem a mesma fonte. A resposta final substitui a provisória e é a única base atual da tela.

Cache completo foi rejeitado porque poderia apresentar pendências obsoletas. Cache somente de processadas sem reconciliação foi rejeitado porque não observaria criações, movimentos, edições, exclusões e resultados recentes. `CacheService` e conteúdo em `PropertiesService` foram rejeitados por expulsão/TTL, limites de tamanho e inadequação para PII. A solução reutiliza o padrão do **Banco de Dados de Atletas**: JSON imutável no Drive, ponteiro pequeno em Script Properties, validação/readback, slots atual/anterior, lease, `ScriptLock` curto e trigger idempotente. Diferentemente do padrão atual, este desenho fecha a autoridade e ACL do armazenamento e a recuperação da versão anterior.

**Suposições:** processadas são normalmente históricas, mas continuam editáveis/movíveis/excluíveis; portanto nem o snapshot nem seu timestamp provam atualidade. A tela atual é somente leitura. A pasta de fontes pode estar em My Drive ou Shared Drive; a pasta dedicada de snapshots será uma pasta My Drive previamente provisionada pelo administrador publicador. As metas dependem de benchmark autenticado porque os testes VM não reproduzem latência e quotas Google.

### Functional Requirements

- Abrir ou atualizar o módulo deve iniciar em paralelo a RPC rápida e a autoritativa. Snapshot apresentável pode renderizar processadas provisórias com data de geração; a resposta autoritativa sempre vence.
- `Aguardando` e `Falha` selecionadas devem ser confirmadas e lidas na requisição atual. Nenhum dado provisório pode habilitar ou alimentar aprovação, rejeição, inscrição, remoção ou transferência.
- Processadas só podem ser reutilizadas após inventário atual e igualdade integral do fingerprint forte. Divergência ou ausência assimétrica de digest é miss; divergência durante confirmação de blob invalida a tentativa híbrida inteira.
- Consolidação, precedência entre origens, ordenação pelo carimbo, limite global de 200, total antes do corte e vínculo com `Resultados` devem ser determinísticos e não gerar duplicatas.
- Busca, três filtros, ordenação, resumos, links, expansão de detalhes, limite, contagens, botão Atualizar, perfis e autorização atuais devem ser preservados. Controles e expansões ainda válidos sobrevivem à troca provisória/final.
- Loading, conteúdo provisório, atualização, vazio definitivo, aviso recuperável e erro fatal devem ser independentes. Callbacks de navegação/carga anterior não podem alterar a tela.
- Snapshot deve ter schema versionado, validade explícita, validação integral, publicação atômica por ponteiro e fallback `current` → `previous`. Payload parcial, corrompido, fora da pasta dedicada ou vencido não pode ser exibido provisoriamente.
- Build e publicação devem usar lease e lock curto, sem I/O de Drive sob lock. Falha preserva slots publicados; concorrência não inicia outro build.
- A geração manual, status administrativo e configuração/desativação do trigger exigem `admin`; gerar/configurar/desativar exige também a conta publicadora configurada. Diretoria mantém somente as RPCs de leitura.
- O pre-aquecimento deve reutilizar o mecanismo de trigger CLOCK e deduplicação por handler do Banco de Atletas. A entrega documenta ativação/verificação, mas não cria trigger nem realiza deploy.
- Nenhuma RPC deve ampliar o conteúdo de inscrição já retornado. Fingerprints, IDs de snapshot, ACL, conta publicadora, trigger UID e detalhes operacionais permanecem no servidor/estado administrativo.
- Mutação interna futura deve marcar o snapshot pendente antes de escrever e solicitar rebuild assíncrono. Alterações externas são detectadas por inventário/confirmação em toda consulta final.

### Non-Functional Requirements

- Em pelo menos 10 aberturas autenticadas comparáveis, a mediana de `listarSnapshotSolicitacoesProcessadas()` deve ser ≤ 50% da baseline atual de `listarSolicitacoes()`; a mediana da consulta autoritativa híbrida deve ser ≤ 70% e seu p95 não pode piorar mais de 10%. Medir clique→primeiro conteúdo, clique→final, duração das RPCs, bytes e blobs abertos.
- A consulta autoritativa abre zero blobs para hits processados e no máximo um blob por ativo ou miss selecionado. Enumeração é O(total de filhos das cinco origens), com uma listagem paginada por origem, e não O(total) downloads.
- Logs e relatórios de benchmark contêm somente fase, código, duração, contagens, bytes e resultado. Não contêm arquivo, pessoa, CPF, telefone, protocolo, URL, ID cru ou mensagem externa.
- A stack fica bloqueada em Google Apps Script V8, HTMLService com JavaScript/CSS sem framework, Drive Advanced Service v3, `DriveApp`, `PropertiesService`, `LockService`, `ScriptApp` e testes CommonJS com `node:test`/`assert`/`vm`; não haverá dependência nova.
- A alteração será cirúrgica e não reverterá, sobrescreverá ou reformatará mudanças não commitadas de Financeiro, relatórios/Drive, `COMANDOS.md`, `TODO.md` ou qualquer código não relacionado.

### Acceptance Criteria

1. Com snapshot válido e processadas, abrir `#solicitacoes` mostra conteúdo provisório antes da consulta autoritativa, identifica a geração e depois substitui integralmente a coleção pela resposta final.
2. Toda `Aguardando` ou `Falha` entre as 200 selecionadas é lida do blob atual; fixture com 180 hits processados e 20 ativos abre exatamente 20 blobs de solicitação.
3. Processada criada, editada, movida ou excluída depois do snapshot é respectivamente incluída, atualizada, reclassificada ou removida na resposta final; resultado TXT/PDF posterior aparece a partir do inventário fresco de `Resultados`.
4. Um hit exige `version` decimal não vazia igual e os demais campos iguais. Se `md5Checksum` existir em qualquer lado, deve existir como MD5 válido e ser igual nos dois; ausência assimétrica ou divergência nunca gera hit.
5. Divergência entre inventário e `Drive.Files.get` antes de um blob aborta a tentativa híbrida sem resposta parcial e executa no máximo um fallback legado.
6. Duplicatas lógicas produzem uma única linha e contagem pela precedência definida. Zero/uma/múltiplas pastas reservadas significam, respectivamente, origem vazia/origem válida/erro de configuração sanitizado.
7. Build considera somente vencedores `Processada` após consolidação global, calcula `totalProcessadas` antes do corte, ordena como a consulta, guarda as primeiras 200 e confirma cada descritor; qualquer corrida aborta o build inteiro e preserva os slots anteriores.
8. Snapshot ausente, ilegível, corrompido, parcial, fora da pasta dedicada, com schema/timestamps/slot divergentes ou `now >= expiresAt` não é renderizado. A RPC rápida tenta `current` e depois `previous` ainda apresentável.
9. Falha de criação, readback, validação, publicação ou lease preserva integralmente `current` e `previous`, remove apenas artefato novo conhecido quando seguro, limpa somente o lease próprio e registra erro sanitizado.
10. Leitura de tela autoriza `admin`/`diretoria` antes de Properties ou Drive. Recálculo, status/configuração/desativação exigem `exigirAdministracao_()`; recálculo e mudanças de agenda por admin diferente de `snapshotOwnerEmail` falham antes de publicar/criar trigger.
11. Arquivo de snapshot é criado somente na pasta dedicada configurada pelo owner. Leitores sem acesso à pasta não recebem fallback que exponha snapshot; usam a consulta autoritativa original. IDs da pasta/arquivo não chegam ao frontend.
12. Sucesso final vence callback rápido posterior. Falha final + snapshot bem-sucedido mantém histórico provisório com aviso; falha final + snapshot pendente mantém loading; ambas falhando mostram erro fatal; vazio só é definitivo após sucesso final.
13. Refresh/navegação incrementam token e ignoram callbacks antigos. Busca, três selects e expansões cujas chaves continuem presentes sobrevivem às renderizações provisória e final.
14. A resposta final preserva campos, links, `situacoes`, `acoes`, `total`, `limite` e `pastaUrl` atuais. A resposta rápida/final adiciona somente `provisorio`, `consultadoEm` e `snapshotStatusPublico`.
15. Quando otimização e fallback falham, o cliente recebe exatamente `Não foi possível consultar as solicitações atuais. Tente novamente; se o problema continuar, contate a administração.`, sem dado ou mensagem externa.
16. Configurar repetidamente conserva um trigger CLOCK do handler para o owner atual, remove apenas duplicatas visíveis desse mesmo handler/owner e preserva handlers alheios. Handler com UID, owner ou autorização inválidos falha antes do build.
17. `expiresAt` é exatamente `generatedAt + 24h`; o servidor calcula `stale = now >= generatedAt + 30min`; `now >= expiresAt` impede exibição provisória. O documento não persiste nem dita `stale`.
18. Testes locais cobrem 0, 1, 200 e >200 itens, Unicode, parser, duplicatas, paginação, My/Shared Drive, transições, fingerprint forte, resultado tardio, slots, corrupção/expiração, falhas, concorrência, autorização, owner/ACL precondicionada, sanitização e ordens de callbacks.
19. Benchmark autenticado registra ao menos 10 amostras equivalentes e comprova as metas; métricas distinguem `inventario`, `snapshot`, `resultados`, `drive_ler`, `interpretar`, `consolidar`, hits, misses e fallback sem PII.
20. Documentação explica, sem executar, provisionamento/ACL da pasta dedicada, primeira geração pelo owner, configuração, verificação de owner/status e conferência de exatamente um handler em **Apps Script > Acionadores**.

### Out of Scope

- Alterar formulário público, planilha de respostas, regras iFut ou movimentação/publicação de `main.py`.
- Usar snapshot em qualquer decisão ou mutação de inscrição/elenco.
- Alterar `CONFIG.solicitacoes.maxLeitura`, adicionar paginação server-side ou ampliar dados visíveis.
- Criar automaticamente pasta/ACL, migrar para banco/serviço externo ou alterar compartilhamentos existentes.
- Deploy, chamada externa, criação/desativação real de trigger, dependência, commit/worktree ou mudança não relacionada.

## Design técnico

A implementação adicionará um snapshot histórico imutável e continuará reconciliando metadados atuais em toda abertura. O primeiro conteúdo útil passa a depender de um único JSON; a resposta final troca downloads/parses de processadas inalteradas por listagens de metadados e abre apenas ativos/misses. A resposta provisória é explicitamente informativa e nunca autoritativa.

### Stack e arquivos

A stack é Google Apps Script V8, HTMLService + JavaScript/CSS sem framework, Drive Advanced Service v3 já habilitado em `appsscript.json`, `DriveApp`, Script `PropertiesService`, `LockService`, `ScriptApp`, e Node.js `node:test`/`assert`/`vm`.

Arquivos a modificar:

- `apps-scripts/sistema-interno/WebApp.gs`: configuração, inventário/confirmador Drive, merge/fallback, snapshot, autorização, métricas, lease e agenda.
- `apps-scripts/sistema-interno/Index.html`: duas RPCs, reducer de carga, render progressivo e preservação visual; controles administrativos somente no bloco já restrito a admin.
- `apps-scripts/sistema-interno/performance/solicitacoes-snapshot.test.cjs` (novo): fixtures backend/frontend, Drive, slots, segurança, corridas e contagem de blobs.
- `apps-scripts/sistema-interno/performance/benchmark.js` e `benchmark.test.cjs`: incluir as duas consultas e marcas de primeiro/final.
- `apps-scripts/sistema-interno/performance/README.md`: baseline, coleta e provisionamento/ativação/verificação administrativa.

`appsscript.json`, `main.py`, planilhas e arquivos não relacionados não serão alterados.

### Configuração, autoridade e ACL

`CONFIG.solicitacoes` receberá `snapshotPastaId` e `snapshotOwnerEmail`. A pasta é um recurso My Drive dedicado, criado manualmente e pertencente à conta configurada; não será filha de pasta com compartilhamento mais amplo. Pré-requisito operacional: owner como editor/proprietário e somente usuários que já possuem perfil `admin` ou `diretoria` como leitores, diretamente ou via grupo administrativo controlado. O sistema não tentará inferir ACL efetiva, pois permissões herdadas/grupos não podem ser comparados com segurança à lista lógica de perfis. O README exigirá auditoria da tela **Compartilhar** antes da ativação.

`validarPastaSnapshotSolicitacoes_(paraPublicar)` abre o ID configurado, usa `Drive.Files.get` para exigir pasta não excluída, `mimeType` de folder e ausência de `driveId` (My Drive). Para publicação também exige `normalizarEmail_(Session.getEffectiveUser().getEmail()) === snapshotOwnerEmail`, sessão admin com o mesmo e-mail e capacidade real de `createFile`; falha ocorre antes de criar o JSON quando detectável. Para leitura, falta de acesso torna somente o snapshot indisponível; a consulta autoritativa segue. Todo arquivo lido deve ter essa pasta como único pai. Não se expõem URL/ID da pasta de snapshot.

`recalcularSnapshotSolicitacoes()`, `configurarAgendamentoSnapshotSolicitacoes()` e `desativarAgendamentoSnapshotSolicitacoes()` chamam `exigirAdministracao_()` e a guarda de owner. `obterStatusSnapshotSolicitacoes()` chama `exigirAdministracao_()`, mas pode ser lido por qualquer admin; nunca inclui IDs/ACL. Diretoria pode chamar apenas `listarSolicitacoes()` e `listarSnapshotSolicitacoesProcessadas()`.

### Contratos RPC

`listarSolicitacoes()` continua sem argumentos e devolve a resposta autoritativa híbrida. `listarSnapshotSolicitacoesProcessadas()` é a RPC rápida, também sem argumentos. Ambas iniciam com `identificarUsuario_()` + `moduloLiberado_('solicitacoes', perfil)` antes de Properties/Drive. `lerSolicitacoes_(paraAtletas)` permanece como caminho completo independente para o Banco de Atletas e como fallback legado; ele não consulta o novo snapshot.

A rápida devolve o envelope atual (`registros`, `situacoes`, `acoes`, `total`, `limite`, `pastaUrl`) mais `provisorio:true`, `consultadoEm` e `snapshotStatusPublico`. Só há processadas; `total` é `totalProcessadas` provisório. A final usa `provisorio:false`. `snapshotStatusPublico` é exatamente `{generatedAt, expiresAt, stale, emRecalculo}`. O status admin adiciona `{agendado,responsavel,ultimoErro,ultimaTentativaEm}`. Fingerprints, IDs e trigger UID nunca saem.

As RPCs não aceitam payload externo. O evento do trigger exige objeto, `triggerUid` textual não vazio e correspondência com trigger CLOCK visível. Metadados Drive e documento JSON seguem as validações estritas descritas abaixo; qualquer tipo/limite inválido rejeita o conjunto, não é coercionado silenciosamente além de `size`/`version` textuais da API.

### Estado e renderização no frontend

Cada abertura/refresh incrementa `solicitacoesCarga.token`, captura busca, três selects e `solicitacoesAbertas`, e cria ramos independentes:

```js
solicitacoesCarga = {
  token: token,
  snapshot: { estado: 'pendente', dados: null },
  final: { estado: 'pendente', dados: null }
};
```

As RPCs são paralelas. Cada callback primeiro exige `moduloAtual === 'solicitacoes'` e token atual, atualiza somente seu ramo (`pendente|sucesso|falha`) e chama `renderizarCargaSolicitacoes_()`; callbacks não escrevem DOM diretamente.

O reducer aplica: (1) sucesso final sempre vence, inclusive vazio; (2) falha final + snapshot sucesso mantém provisório e aviso persistente; (3) falha final + snapshot pendente mantém loading; (4) ambas falhando mostram erro fatal; (5) final pendente + snapshot sucesso mostra provisório e “conferindo”; (6) final pendente + snapshot falha mantém loading final; (7) ambos pendentes mostram skeleton/status sem bloquear navegação. Snapshot vazio nunca define vazio definitivo.

Antes de remontar, `capturarEstadoVisualSolicitacoes_()` lê busca/selects e expansões. A remontagem reaplica valores ainda disponíveis e expansões cujo `arquivoNome` permaneça. O status usa `role="status" aria-live="polite"`; erro fatal usa `.erro`; vazio final usa `.vazio`. Não haverá ação mutável em linha provisória.

### Inventário Drive, origens e consolidação

`contextoDriveSolicitacoes_()` chama `Drive.Files.get(CONFIG.solicitacoes.pastaRaizId, {fields:'id,mimeType,trashed,driveId',supportsAllDrives:true})`, exige pasta válida e retorna escopo. Em My Drive, listagens usam `corpora:'user'`; em Shared Drive usam `corpora:'drive'`, `driveId:<driveId>`, `includeItemsFromAllDrives:true` e `supportsAllDrives:true`.

`listarFilhosDrive_(parentId, contexto)` executa exatamente:

```text
q: "'<parentId escapado>' in parents and trashed = false"
spaces: 'drive'
pageSize: 1000
fields: nextPageToken,incompleteSearch,files(id,name,mimeType,modifiedTime,size,webViewLink,parents,trashed,version,md5Checksum)
```

O ID no `q` escapa `\\` e `'`. Cada chamada mantém seu próprio conjunto de tokens, rejeita token vazio/repetido, mais de 100 páginas, `incompleteSearch === true`, `files` malformado e metadado inválido. A raiz é listada uma vez para obter TXT raiz e resolver, por nome exato/MIME folder, `Entrada`, `Processados`, `Falhas` e `Resultados`. Zero pasta significa origem vazia; uma é usada; duas ou mais geram `PASTA_RESERVADA_DUPLICADA`. Cada pasta resolvida é listada exatamente uma vez; não há busca global nem listagem por arquivo.

TXT entra somente se `carimboDoNome_` reconhecer `-(\d{10,})\.txt`. Descritor normalizado contém `{id,name,parentId,modifiedTime,size,version,md5Checksum,webViewLink,situacao,icone,ordem,prioridade}`. `size` é inteiro seguro não negativo; `version` é string decimal não vazia; `md5Checksum`, quando presente, é MD5 hexadecimal de 32 caracteres minúsculos. Nome/ID/pai/timestamp/URL são strings válidas e `parents` deve conter somente o pai consultado.

A precedência lógica será explícita e orientada a não esconder estado ativo: `Entrada/Aguardando` > raiz/Aguardando > `Falha` > `Processada`; dentro da mesma prioridade vence `modifiedTime` mais recente e depois ID lexical. Essa é a única mudança deliberada na rara duplicidade transitória: um ativo atual nunca fica oculto por histórico processado. Após deduplicar por `name`, calcula-se `total`, ordena-se por `ordem` decrescente, depois prioridade, `modifiedTime` e ID, e corta-se em 200.

`Resultados` é indexado somente para bases selecionadas; por extensão TXT/PDF vence o nome lexical mais recente, preservando a regra atual. Ausência da pasta é normal; falha ao listar não equivale a ausência.

### Fingerprint, confirmação e resposta autoritativa

O fingerprint persistido é `{arquivoNome,arquivoId,parentId,modifiedTime,size,version,md5Checksum}`. Comparação exige igualdade de todos os campos, `version` decimal igual e esta regra única para digest: se o inventário ou snapshot tiver `md5Checksum`, ambos devem tê-lo como MD5 válido e igual; ausência em ambos é aceita somente com `version` igual. Divergência é miss.

`lerDescritorConfirmado_(descritor)` chama `Drive.Files.get(id, {fields:'id,name,modifiedTime,size,trashed,parents,version,md5Checksum',supportsAllDrives:true})`. Exige ID/nome, único pai esperado, tamanho, `modifiedTime`, `version`, regra de MD5 e `trashed === false` iguais ao inventário. Só então abre `DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8')`. Divergência/erro aborta a tentativa híbrida inteira antes da resposta. A janela inevitável entre `get` e blob permanece; `version`/MD5 tornam qualquer alteração observável nos checkpoints, e o fallback mantém a semântica segura.

Para cada selecionado, ativos sempre usam esse helper e o parser atual. Processada com fingerprint idêntico em `current` ou `previous` validado reaproveita somente dados interpretados; miss usa helper/parser. `arquivoUrl` e links de resultado vêm do inventário fresco, nunca do snapshot. O merge só termina depois de todos os itens; não há resposta parcial.

Falha recuperável de inventário, confirmação, API, schema auxiliar ou consolidação registra um código e chama `lerSolicitacoes_(false)` exatamente uma vez. Duplicidade de pasta é fatal sem legado, porque o legado escolheria arbitrariamente. Falha do legado resulta na mensagem fixa do critério 15.

### Schema, slots e validade

Constantes próximas de `BANCO_ATLETAS_*`: `SOLICITACOES_PROCESSADAS_ESTADO = 'SOLICITACOES_PROCESSADAS_SNAPSHOT_V1'`, agenda própria, handler `atualizarSolicitacoesProcessadasAgendado`, lease de 10 minutos, agenda de 15 minutos, stale de 30 minutos e expiração de 24 horas.

Documento imutável:

```text
{
  schema: 1,
  tipo: 'solicitacoes-processadas',
  generatedAt: ISO UTC canônico,
  expiresAt: ISO UTC canônico (= generatedAt + 24h),
  totalProcessadas: inteiro >= 0,
  limite: 200,
  pastaUrl: string,
  registros: [{
    fingerprint: { arquivoNome, arquivoId, parentId, modifiedTime, size, version, md5Checksum },
    dados: <registro público atual completo com situacao Processada>
  }]
}
```

Estado em uma única Script Property:

```text
{
  current:  { id, generatedAt, expiresAt },
  previous: { id, generatedAt, expiresAt },
  lease: { token, expiresAt },
  lastAttemptAt,
  lastError
}
```

Slots ausentes são `{}`. `lerVersaoSnapshotSolicitacoes_(slot, modo)` valida tipos, datas canônicas, `expiresAt === generatedAt + 24h`, arquivo não excluído com único pai igual à pasta dedicada, documento completo e igualdade dos timestamps documento/slot. `modo:'provisorio'` rejeita `now >= expiresAt`; `modo:'hit'` aceita expirado porque o fingerprint vivo prova identidade do item. A RPC rápida tenta `current` e depois `previous` em modo provisório. A consulta final carrega current e previous válidos em modo hit e procura current primeiro. Arquivo inválido nunca causa aproveitamento parcial.

`stale` não é persistido nem aceito do JSON: `now >= Date.parse(generatedAt) + 30min`. O instante exatamente igual a `expiresAt` já está vencido.

`validarSnapshotSolicitacoes_()` rejeita objeto/schema/tipo/datas/limite/contagens inválidos, mais de 200 registros, fingerprint ausente/duplicado, `totalProcessadas < registros.length`, digest/version inválidos ou campo extra de conteúdo. `dados` exige os campos públicos atuais com seus tipos, `situacao === 'Processada'`, inteiros seguros não negativos, `quantidade === pessoas.length`, resumo das três ações e exatamente as seis strings atuais por pessoa. A validação é integral antes de qualquer uso.

### Build, publicação, invalidação e trigger

`gerarSnapshotSolicitacoesProcessadas_()` obtém sob lock curto um lease `{token,expiresAt}` e grava `lastAttemptAt`; não mantém lock durante Drive. O build resolve todas as origens, aplica a mesma precedência/deduplicação global, conserva apenas vencedores `Processada`, calcula `totalProcessadas` antes do corte, ordena/corta as primeiras 200, inventaria resultados e chama `lerDescritorConfirmado_()` para **cada** processada antes de interpretar. Qualquer divergência aborta o build inteiro.

Após validação, cria JSON na pasta dedicada, relê bytes, faz parse/validação e compara objeto/bytes. Sob novo lock confirma token e prazo, move `current` completo para `previous`, publica o novo slot `current` completo e limpa erro/lease em uma única gravação. Somente depois tenta excluir o arquivo anterior ao novo `previous`, por ID conhecido. Limpeza falha como warning. Falha anterior à publicação remove apenas o novo arquivo conhecido quando não referenciado, limpa apenas lease com mesmo token e preserva slots/timestamps.

Properties guarda apenas slots, lease, agenda e mensagem/código sanitizado. `CacheService` não é usado. Alteração externa não marca dirty, por isso a consulta final sempre reinventa e confirma. Uma futura mutação interna será dona de chamar `marcarSnapshotSolicitacoesPendente_()` antes da primeira escrita e apenas solicitar o worker após sucesso; rebuild nunca será parte do commit da mutação.

Agenda usa helpers generalizados do Banco de Atletas. Configuração pelo owner lista apenas triggers visíveis com handler próprio e CLOCK, conserva UID persistido ou primeiro, cria `everyMinutes(15)` somente se nenhum existir, remove somente duplicatas desse handler e grava `{owner,triggerId,installedAt}`. Outro admin não assume agenda/publicação. O handler exige sessão admin, e-mail efetivo igual ao owner, UID textual igual ao persistido e trigger CLOCK visível antes do build. Como `getProjectTriggers()` só mostra triggers do usuário corrente, o README manda verificar manualmente que não existe trigger legado de outra conta; o estado de owner impede criar um segundo por outra conta via UI.

A Administração terá “Solicitações processadas — pré-carga” com status e botões Gerar agora, Configurar e Desativar. O guia manda provisionar/auditar a pasta, entrar como owner, gerar a primeira cópia, configurar e conferir exatamente um `atualizarSolicitacoesProcessadasAgendado` em **Apps Script > Acionadores**. Nada é ativado na implementação.

### Erros e observabilidade

Uma fronteira sanitizada nas RPCs nunca concatena `e.message` externo:

- Falha de autorização: fatal antes de Properties/Drive; mensagem atual de permissão, sem log de identidade.
- Snapshot ausente/sem acesso/vencido: recuperável; rápida informa indisponibilidade e final continua. Log `SNAPSHOT_INDISPONIVEL`.
- Snapshot/slot corrompido ou pasta dedicada inválida: versão é descartada integralmente; tenta outro slot. Se ambos falham, rápida falha de forma sanitizada; final segue sem hits.
- Inventário, paginação, metadado, confirmação ou Drive: recuperável por um fallback legado; log somente fase/código/contagens.
- Pasta reservada duplicada: fatal sem fallback; mensagem fixa de configuração.
- TXT ilegível/parser fatal: aborta híbrido e tenta legado; persistência da falha gera erro final, nunca omissão silenciosa.
- `Resultados` ausente: normal; pasta existente ilegível segue fallback.
- Rebuild concorrente: recuperável; caller recebe “já em atualização” e slots continuam legíveis.
- Owner/ACL/configuração inválidos: fatal para ação administrativa antes da publicação; mensagem orienta corrigir configuração sem revelar ID.
- Build/criação/readback/publicação/lease vencido: fatal para execução, slots preservados e erro genérico no estado.
- Limpeza obsoleta: recuperável; publicação continua sucesso e warning contém somente código.
- Trigger inválido: fatal antes do build; execução registra mensagem sanitizada.

Métricas sob `CADASTRO_METRICAS_ATIVAS` usam `metrica:'solicitacoes'` e fases não sobrepostas `autorizacao`, `inventario`, `snapshot`, `resultados`, `drive_ler`, `interpretar`, `consolidar`, `fallback`, `total`, com duração, inventariados, selecionados, ativos lidos, hits, misses, bytes e resultado. Apenas `total` agrega; não se somam pais e filhos.

### Testabilidade e validação

`solicitacoes-snapshot.test.cjs` usará VM/fakes sem rede. Unitários cobrem schema, datas inclusivas, fingerprint version/MD5, precedência, deduplicação, ordenação/limite, parser e sanitização. Integração fake cobre consultas/opções/paginação/tokens por parent, `incompleteSearch`, My/Shared Drive, 0/1/múltiplas pastas, confirmação, transições, resultado tardio, fallback único, seleção exata do build, readback, slots current/previous, expiração, falhas, lease, owner, guards e trigger idempotente. Contadores comprovam 180 hits + 20 blobs.

Frontend segue os padrões de `atletas-banco.test.cjs` e `snapshots-navigation.test.cjs`: todas as ordens de sucesso/falha, final antes da rápida, falha final antes do snapshot, vazio, refresh, navegação e preservação de busca/selects/expansões. `atletas-banco.test.cjs`, `atletas-snapshot.test.cjs`, `associados-filiacao.test.cjs`, `snapshots-navigation.test.cjs` e `validation-index.test.cjs` permanecem como regressão.

Validação local: `node --test apps-scripts/sistema-interno/performance/*.test.cjs` e `git diff --check`. O benchmark autenticado será ampliado para 1–10 repetições sequenciais das RPCs, duração/bytes sem corpo e marcas de abertura/primeiro render/final; aceite usa ao menos 10 amostras equivalentes. Nenhuma chamada autenticada, trigger ou deploy ocorre localmente.

## Respostas aos achados da revisão

1. **HIGH — identidade de conteúdo: endereçado.** `version` e `md5Checksum` agora pertencem ao inventário, confirmação, fingerprint e schema. `version` é obrigatório/igual; MD5 presente em qualquer lado deve estar presente e igual em ambos; divergência nunca é hit.
2. **HIGH — autoridade e ACL: endereçado.** Foi escolhida uma pasta My Drive dedicada, provisionada/auditada, e uma única `snapshotOwnerEmail`. Somente esse admin publica/configura; diretoria apenas lê. A limitação de validar grupos/herança em runtime está explícita como pré-requisito operacional, sem criação automática de ACL.
3. **MEDIUM — versão anterior: endereçado.** Estado usa slots `current`/`previous` completos. Um helper valida arquivo, pai, schema e timestamps; rápida tenta current e previous apresentável, e final usa qualquer slot integralmente válido somente com fingerprint vivo exato.
4. **MEDIUM — inventário Drive: endereçado.** `listarFilhosDrive_` tem `q`, escape, `spaces`, `pageSize`, campos, tokens/páginas, sequência raiz→cada pasta e escopo distinto para My Drive/Shared Drive.
5. **MEDIUM — construção do snapshot: endereçado.** Build aplica consolidação global, precedência/deduplicação, total antes do corte, comparador e limite iguais à consulta, e confirma cada descritor; qualquer corrida aborta tudo.
6. **MEDIUM — autorização do recálculo: endereçado.** Recálculo/status/configuração/desativação exigem admin; publicação e agenda também exigem owner. Diretoria conserva somente leitura.
7. **NIT — limites temporais: endereçado.** `expiresAt = generatedAt + 24h`, `stale` é calculado pelo servidor com `now >= generatedAt + 30min`, e `now >= expiresAt` proíbe provisório.
