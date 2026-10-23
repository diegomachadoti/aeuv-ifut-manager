# Revisão de design — desempenho de Solicitações de Inscrições

## Achados

1. **MEDIUM — O desenho cria mais um trigger periódico em vez de realmente reutilizar o pre-aquecimento do Banco de Atletas.** Em **“Schema, slots e validade”** e **“Build, publicação, invalidação e trigger”**, são definidos um handler próprio (`atualizarSolicitacoesProcessadasAgendado`), uma agenda própria e um novo `everyMinutes(15)`. O código existente confirma que `atualizarBancoAtletasAgendado` já possui um trigger CLOCK de 15 minutos e que a construção do Banco de Atletas já chama `lerSolicitacoes_(true)`. Deduplicar apenas triggers do novo handler evita duplicatas desse handler, mas deixa dois triggers de 15 minutos e duas leituras periódicas da mesma fonte. Isso contradiz a exigência de reutilizar o mecanismo existente sem duplicar triggers e aumenta quota/concorrência. **Correção concreta:** escolher um único trigger proprietário para as duas pré-cargas. A opção mais cirúrgica é fazer `atualizarBancoAtletasAgendado(evento)` validar uma vez o trigger existente e executar, com leases e registro de erro independentes, `gerarSnapshotBancoAtletas_()` e `gerarSnapshotSolicitacoesProcessadas_()`; a configuração/desativação de Solicitações deve então consultar o status da agenda compartilhada, sem criar/excluir outro CLOCK. Se for necessário desacoplar falhas, usar um dispatcher único que capture cada erro separadamente e prossiga para o outro build. Atualizar contratos, UI administrativa e critério 16 para afirmar que existe exatamente um trigger compartilhado, não “um por handler”.

2. **MEDIUM — A invalidação citada para mutações internas não tem estado nem semântica definidos, e a matriz criar/editar/mover/excluir fica incompleta.** Em **“Functional Requirements”** e **“Build, publicação, invalidação e trigger”**, `marcarSnapshotSolicitacoesPendente_()` e a solicitação de rebuild assíncrono são mencionadas, mas o schema da Script Property não possui `dirty`, `pendingSince` ou equivalente; também não é definido se a RPC rápida recusa um snapshot marcado, se apenas informa stale, nem qual mecanismo solicita o worker. O código verificado mostra que o Apps Script atual é somente leitura para solicitações; as transições atuais são externas, em `main.py`, que move o TXT de `Entrada` para `Processados`/`Falhas` e publica TXT/PDF em operações separadas. Portanto a promessa de invalidação interna futura é ao mesmo tempo fora do escopo atual e impossível de implementar de forma unívoca a partir deste documento. **Correção concreta:** substituir a promessa genérica por uma tabela normativa. Para o escopo atual: “criação, edição, movimentação/processamento e exclusão externas não invalidam o slot; a resposta provisória pode permanecer histórica até `expiresAt`, enquanto toda resposta final detecta criação/edição/movimento/exclusão pelo inventário e resultados tardios pelo inventário de `Resultados`; o trigger compartilhado apenas renova o snapshot”. Remover `marcarSnapshotSolicitacoesPendente_()` do design. Se já houver mutações internas planejadas para esta entrega, então definir no estado `dirty:{at,reason}` (sem PII), gravá-lo antes da escrita, proibir a RPC rápida de exibir slots enquanto dirty, limpar somente após publicação bem-sucedida e especificar exatamente como o worker é acordado.

3. **MEDIUM — A preservação de filtros/expansões no refresh não está integrada à ordem real de navegação.** Em **“Estado e renderização no frontend”**, o design diz que cada abertura/refresh captura busca, selects e expansões, mas não define onde essa captura ocorre. Hoje `abrirModulo('solicitacoes')` substitui `conteudo.innerHTML` pelo loading antes de chamar `carregarSolicitacoes()` (`Index.html`, ramo de solicitações próximo das linhas 2958–2960). Assim, uma implementação literal da captura dentro de `carregarSolicitacoes()` já perdeu os inputs e a tabela; o critério 13 falharia no botão Atualizar, que chama novamente `abrirModulo('solicitacoes')`. **Correção concreta:** definir a integração, por exemplo:

```js
function abrirModulo(id, busca, aprovacaoDescarte) {
  const estadoSolicitacoes = id === 'solicitacoes' && moduloAtual === 'solicitacoes'
    ? capturarEstadoVisualSolicitacoes_()
    : estadoVisualSolicitacoesVazio_();
  // ... só depois substituir conteudo.innerHTML
  if (modulo.tipo === 'solicitacoes') {
    conteudo.innerHTML = cabecalho + blocoCarregando('statusSolicitacoes');
    carregarSolicitacoes(estadoSolicitacoes);
    return;
  }
}
```

O design deve também fixar que `carregarSolicitacoes(estadoInicial)` copia esse estado para a carga identificada pelo token e que callbacks antigos nunca podem sobrescrevê-lo.

4. **MEDIUM — A validação integral não impõe limite de bytes nem limites de strings antes de ler/devolver o snapshot.** Em **“Schema, slots e validade”**, a proteção limita o array a 200 e valida tipos, mas todos os campos textuais de `dados`, pessoas, URLs e o próprio arquivo JSON permanecem sem limite. Um TXT fonte muito grande ou um arquivo de snapshot corrompido com strings enormes ainda pode consumir memória/tempo no `getDataAsString`, gerar um snapshot/RPC acima do limite prático do Apps Script e ampliar significativamente o payload ao frontend antes que a contagem de itens ajude. A frase “campos públicos atuais” também não enumera o objeto exato, embora a validação prometa rejeitar campos extras. **Correção concreta:** declarar uma constante de tamanho máximo em bytes UTF-8 para o documento (definida a partir da baseline dos 200 registros, com margem explícita) e limites por campo/lista; o build deve medir o JSON serializado antes de criar o arquivo, e a leitura deve rejeitar por `file.size` antes de abrir o blob. Enumerar no schema todos os campos top-level de `dados` (`situacao`, `protocolo`, `dataHora`, `ordem`, `competicao`, `equipe`, `responsavel`, `arquivoUrl`, `resultadoTxtUrl`, `resultadoPdfUrl`, `pessoas`, `icone`, `telefone`, `comprovanteUrl`, `arquivoNome`, `quantidade`, `resumo`) e os seis campos de pessoa. Snapshot acima do teto deve ser descartado integralmente e seguir `current → previous`; na consulta final, ausência de slot utilizável deve resultar em misses/fallback seguro, nunca resposta parcial.

## Suposições verificadas

- `listarSolicitacoes()` não recebe argumentos e delega diretamente a `lerSolicitacoes_(false)`.
- O backend atual autoriza por `identificarUsuario_()` e `moduloLiberado_('solicitacoes', perfil)` antes de abrir a pasta; o módulo está liberado somente para `admin` e `diretoria`.
- O fluxo atual enumera `Entrada`, `Processados`, `Falhas` e TXT na raiz, ordena pelo carimbo final do nome, limita a 200, abre cada blob selecionado e indexa a pasta `Resultados`.
- O módulo de solicitações no Apps Script é somente leitura. Não foram encontradas rotinas internas de criação, edição, exclusão ou processamento desses TXT.
- `main.py` busca em `Entrada` (ou na raiz como fallback), move remotamente o arquivo com `files().update(addParents/removeParents)` para `Processados` ou `Falhas` e publica cada resultado TXT/PDF depois, em chamadas independentes. Logo movimentos e resultados tardios realmente podem ser observados em instantes diferentes.
- O contrato público atual contém os campos de registro e os seis campos por pessoa descritos no design; o frontend usa esses dados em busca, filtros, resumo, links e detalhes.
- A UI atual faz uma única RPC, limpa `solicitacoesAbertas` no sucesso e protege callbacks apenas com `moduloAtual`, sem token de carga. O reducer/token proposto trata um problema real.
- O serviço avançado Drive v3 está habilitado, o escopo Drive está declarado e o Web App executa como `USER_ACCESSING`.
- O Banco de Atletas existente usa JSON no Drive, Script Properties, slots atual/anterior, lease, `ScriptLock` curto, readback e trigger CLOCK idempotente por handler/owner.
- O trigger existente do Banco de Atletas roda a cada 15 minutos, e seu build já lê solicitações via `lerSolicitacoes_(true)`.
- A estratégia híbrida está justificada: evita exibir ativos apenas de cache, conserva processadas como primeiro conteúdo útil e reconcilia metadados/resultados atuais antes da resposta final. O cache completo e o cache apenas de processadas sem reconciliação foram rejeitados com tradeoffs coerentes.
- Fingerprint forte, slots versionados, expiração inclusiva, fallback `current → previous`, confirmação antes de blob e fallback único para a leitura legada estão especificados de forma suficiente no design revisado.
- A matriz de leitura mantém `admin`/`diretoria`, enquanto geração/status/agenda exigem `admin` e geração/agenda exigem também o owner configurado.

## Suposições não verificadas ou erradas

- **Errada:** criar e deduplicar um handler CLOCK próprio para Solicitações equivale a “reutilizar” o pre-aquecimento existente sem duplicar triggers. O resultado descrito são dois triggers periódicos e leituras repetidas da mesma fonte.
- **Não verificada:** a pasta My Drive dedicada já foi provisionada, pertence ao `snapshotOwnerEmail` e possui ACL efetiva somente para os leitores autorizados. O design corretamente trata isso como pré-requisito operacional, mas o repositório não comprova o estado real do Drive.
- **Não verificada:** snapshots de até 200 registros sempre caberão com segurança em memória, arquivo e resposta RPC. Não há baseline de bytes nem teto no design.
- **Não verificada:** as metas de mediana e p95 serão atingidas. O design corretamente exige benchmark autenticado posterior, mas nenhuma medição atual confirma o ganho.
- **Incompleta:** “marcar pendente” invalida uma versão publicada. Não há campo correspondente no estado nem regra de leitura/limpeza/acionamento do worker.

## Veredito

**CHANGES_REQUESTED** — há 0 achados HIGH e 4 achados MEDIUM.
