# Gestão do Campeonato — MVP

## Objetivo

**Logs de diagnóstico do cadastro:** `CADASTRO_METRICAS_ATIVAS` em
`WebApp.gs` controla os registros `cadastro_elenco`. Está inicialmente
`true` para manter a coleta atual. Use `false` na operação normal e publique
uma nova versão; isso desativa logs de fases, resultados do cache de IDs e
cálculos de tamanho UTF-8. Não desativa o cache, validações, gravações ou
recuperação do histórico. Para investigar novamente, retorne a `true` e
publique. Erros normais do Apps Script continuam visíveis.

**Fluxo implementado nesta etapa:** Banco de Dados de Equipes com escudo no
Drive → Equipes participantes (seleção do campeonato e vínculo de equipe
existente) → Gerenciar elenco (Atletas / Comissão técnica, cadastro e importação
de inscrições anteriores da mesma equipe). Admin/diretoria envia o link de inscrição; o associado autenticado
por e-mail autorizado só acessa sua equipe em campeonatos vinculados.
Consulte [armazenamento e permissões](../../README.md#equipes-participantes-e-meu-elenco).

**Operação de jogos:** **Tabela e Classificação** reúne jogos e rodadas,
classificação, manutenção dos grupos e fases, cadastro de campos e critérios
de pontuação/desempate no contexto do campeonato selecionado.

### Consultas e desempenho

- **Equipes participantes** retorna os campeonatos permitidos para o seletor,
  mas carrega cards e contagens somente do campeonato selecionado. Trocar o
  campeonato faz uma nova consulta; voltar do elenco mantém a seleção.
  A lista usada para vincular equipes contém somente ID e nome, sem escudos.
- **Tabela e Classificação** envia o escudo uma única vez por equipe. As linhas
  de classificação o consultam pelo ID da equipe. A lista de jogos não envia
  snapshots detalhados de resultados; consulta e edição da súmula continuam
  buscando esses dados pelos endpoints próprios, sem alterar o arquivo salvo.
- Depois de uma alteração na tabela, a resposta contém a tela atualizada e a
  nova revisão. O navegador a renderiza sem repetir a consulta completa.
  O servidor reutiliza o contexto validado sob o mesmo lock, sem reler os
  arquivos que acabou de gravar. Avisos e regras esportivas são preservados.
- As alterações de elenco reutilizam as listas já lidas na reconciliação
  histórica. A reconciliação global, os snapshots, a recuperação após falhas e
  as verificações de participação continuam ativos.
- Não há cache persistente de permissões, elencos ou tabelas; só IDs de
  arquivos ficam memorizados por usuário (veja **IDs de arquivos entre chamadas**).
  Fotos do elenco continuam sendo enviadas na consulta e na resposta de
  cadastro/remoção/transferência; bases com imagens grandes ainda podem ter
  custo significativo nesses fluxos.

**Salvar atletas e comissão:** criação e edição reaproveitam apenas recursos
da operação atual, lidos depois de adquirir o `ScriptLock`: sessão e
autorização, registro de equipes, lista de equipes ativas, campeonatos,
times do campeonato, bloqueio do elenco, listas de atletas/comissão do
campeonato alvo e jogos usados na verificação de participação. Esses mesmos
dados alimentam a validação (alvo, duplicatas, CPF entre categorias,
participação), a preparação histórica e a resposta, antes de liberar o lock.
A lista bruta gravada é descartada desse conjunto logo antes da gravação.
A entrada `salvarCadastroElenco` mantém autenticação/perfil, formato dos IDs
e campos baratos antes do lock, mas não consulta equipes, campeonatos ou times
para validar o vínculo nessa etapa. O despacho leva apenas IDs solicitados,
não um contexto autorizado. Depois da espera, sessão, acesso à equipe ativa,
vínculo ao campeonato, bloqueio e propriedade do cadastro são validados com
dados frescos antes de qualquer escrita, inclusive histórica. O time gravado
é forçado pelo nome da equipe assim validada, nunca pelo payload. Consultas
mantêm seus fluxos; os endpoints
legados de atletas/comissão continuam restritos a admin/diretoria e validam o
time informado. Não há cache de dados global nem entre
requisições (apenas IDs de arquivos, descritos abaixo). A resposta só reutiliza recursos vinculados ao contexto
produzido pela revalidação sob lock; qualquer outro contexto relê bloqueio,
destinos e participação. Fotos são mantidas.

Nesse salvamento, a leitura de registro de equipes é estritamente de consulta
durante as guardas: equipes ativas sem ID ainda são migradas globalmente pela
preparação histórica, mas somente após a validação completa sob lock. Assim,
uma solicitação recusada não grava sequer essa migração auxiliar. Havendo
equipes a migrar, as leituras/escritas adicionais necessárias são preservadas.

A preparação histórica continua percorrendo **todos os campeonatos**, inclusive
inativos/encerrados, lendo atletas e comissão, migrando IDs legados e
reconciliando snapshots. A leitura anterior à gravação não foi eliminada:
ela preserva registros anteriores e recupera falhas de atualização do histórico.
Falhas continuam propagadas com orientação de recarregar. CPF, duplicatas,
vínculos, participação, transferências e snapshots esportivos não mudam.

No fixture local com dois campeonatos (antes → depois da retirada do vínculo
pré-lock), para criação e edição via `salvarCadastroElenco`: leituras de elencos
4 → **4**; registro de equipes 2 → **1**; campeonatos 2 → **1**;
bloqueios 1 → **1**; times do campeonato 4 → **2**; sessão
2 → **2** (antes e depois do lock). Antes do lock há somente a autenticação,
sem consultas de contexto ou de arquivos do Drive pelo fluxo de salvamento.
A tabela de jogos é lida uma vez na
criação de atleta (antes 2) e na edição com troca de CPF/equipe (antes 2,
além de uma leitura extra do registro de equipes). A resposta não readquire
o lock.
São contagens de chamadas/leituras no fixture, não uma promessa de latência
no Drive. A otimização busca eliminar o custo do vínculo pré-lock redundante
(2.176 ms na amostra observada), não o custo da validação sob lock, das escritas
ou da reconciliação global. Não é uma previsão de redução do tempo total:
compare novas amostras equivalentes após publicar. Testes: `node --test apps-scripts\sistema-interno\performance\save.test.cjs
apps-scripts\sistema-interno\performance\escudos.test.cjs
apps-scripts\sistema-interno\performance\arquivos-id.test.cjs`, executado na raiz
do repositório.

**Remover atletas/comissão e transferir atletas:** `removerCadastroElenco`
e `transferirAtletaElenco` aplicam a mesma arquitetura conservadora: antes do
lock somente autenticação/perfil e formato dos IDs. Sob o lock reavaliam
acesso, equipe ativa, vínculo, bloqueio e propriedade; transferência continua
exclusiva de admin/diretoria e verifica destino diferente, existente, ativo e
vinculado ao mesmo campeonato. Participação por ID **ou CPF normalizado**
impede remover/transferir atleta para qualquer perfil, inclusive admin.
Associado só remove na própria equipe desbloqueada; admin/diretoria mantêm
a exceção aos bloqueios de elenco, inclusive na transferência entre elencos
bloqueados. Payload não escolhe time, CPF nem contexto autorizado.

Após todas as guardas, a reconciliação global síncrona persiste o snapshot
**original antes da escrita destrutiva**. Histórico e listas preparados são
passados à gravação para não repetir a varredura global; a reconciliação
pós-escrita continua ativa. Inscrições ausentes e campeonatos removidos mantêm
snapshots, com presença atualizada. Falha pré-histórico impede a escrita do
elenco; falha no elenco ou no histórico posterior exige recarregar e mantém
a recuperação pela próxima reconciliação. Não há tarefas adiadas, alteração
de snapshots esportivos, novas regras de CPF ou saneamento de duplicatas
legadas. A resposta completa usa listas persistidas e contexto autorizado
ainda sob lock; o frontend existente a renderiza na mesma RPC, sem segunda
consulta. Remoções legadas continuam restritas a admin/diretoria (reavaliados
também após a espera), com resposta agregada e sem mudar o contrato.

Contagens no fixture de dois campeonatos, histórico inicialmente ausente,
um alvo e sem migração de IDs, medidas antes/depois desta otimização:

| Recurso | Remover atleta | Remover comissão | Transferir atleta |
| --- | --- | --- | --- |
| Leituras de elencos | 8 → 4 | 8 → 4 | 7 → 4 |
| Buscas Drive por nome | 12 → 5 | 12 → 5 | 11 → 5 |
| Listas de campeonatos | 6 → 1 | 5 → 1 | 6 → 1 |
| Registros de equipes | 5 → 1 | 5 → 1 | 6 → 1 |
| Consultas de times | 7 → 2 | 7 → 2 | 9 → 2 |
| Leituras de bloqueios | 2 → 1 | 2 → 1 | 2 → 1 |
| Identificações de sessão | 3 → 2 | 3 → 2 | 5 → 2 |
| Aquisições de lock | 2 → 1 | 2 → 1 | 1 → 1 |

As três escritas necessárias permanecem: histórico original, elenco e
histórico atualizado. Com histórico preexistente lê-se esse arquivo uma vez.
As contagens não estimam latência real: espera por lock, Drive, fotos e
reconciliação global ainda custam tempo. Testes adicionais:
`node --test apps-scripts\sistema-interno\performance\mutations.test.cjs`.

**Publicar estas otimizações:** copie o `WebApp.gs` atualizado para o projeto
Apps Script do **sistema interno**; mantenha o `Index.html` mais recente junto
dele para preservar as melhorias anteriores de imagens e interface. No editor,
salve e use **Implantar → Gerenciar implantações → Editar (lápis) → Versão:
Nova versão → Implantar**, na implantação WebApp já existente, sem alterar
identidade de execução/permissões. A URL existente permanece. Esta mudança
não publica nem executa gravações automaticamente. Primeiro valide manualmente
em uma base de teste, com os mesmos perfis/cenários, confirmando a tela e o
histórico. Não faça benchmark automático de remoções/transferências reais.
Para desligar métricas, mude `CADASTRO_METRICAS_ATIVAS` para `false` e publique
outra versão pelo mesmo procedimento.

**Logs de salvamento, remoção e transferência:** nas execuções do Apps Script, filtre as mensagens
JSON por `"metrica":"cadastro_elenco"`. Tempos gerais contêm `metrica`,
`fase` e `duracaoMs`; etapas de IO/memória também têm `categoria`
(`historico`, `atletas`, `comissao`, `equipes`, `campeonatos` ou `bloqueios`).
Contadores `tamanho_json` têm
`metrica`, `fase`, `categoria`, `direcao` (`leitura`/`gravacao`),
`origem` (`drive`/`legado`), `bytesJson` e `registros` para listas ou
`participacoes`/`inscricoes` para histórico. Não registram nomes, arquivos,
IDs, CPF, fotos, payloads ou conteúdo de erros.
As fases são `espera_lock`, `validacao_leitura`, `preparacao_historico`,
`gravacao_elenco`, `gravacao_historico` e `resposta`. A validação possui
medidas antes e depois da espera do lock. Subfases aninhadas detalham o custo:
`pre_lock_autorizacao`/`lock_autorizacao` (sessão e perfil),
`lock_vinculo` (equipes, campeonato e times; `salvarCadastroElenco` não emite
mais `pre_lock_vinculo`),
`lock_bloqueio`, `lock_elenco_leitura`, `lock_cpf_categorias`,
`lock_participacao` (leitura/validação dos jogos e vínculo por CPF),
`resposta_destinos` e `resposta_participacao` (quando há atletas; se os jogos
já foram lidos na validação sob o mesmo lock, não há nova leitura). A preparação pode conter uma
gravação histórica de reconciliação, medida também como `gravacao_historico`;
esses intervalos são aninhados e não devem ser somados para obter o total.
A resposta inclui a montagem no servidor, não transporte nem renderização.
Operações interrompidas não produzem todas as fases. Compare a mesma base,
perfil e ação depois da publicação; não repita gravações reais por benchmark.
Remoções emitem o pai inclusivo `remocao_atletas_total` ou
`remocao_comissao_total`; transferência emite `transferencia_total` e a
subfase `lock_destino` (consulta em memória aos destinos frescos). A remoção
tem autenticação/guardas baratas antes do intervalo total; transferência as
inclui. Esses pais são tempos do servidor, não do navegador. As fases
comuns, etapas por categoria, tamanhos e resultados do cache de IDs continuam
sob a única flag `CADASTRO_METRICAS_ATIVAS`; desligá-la evita também o cálculo
dos tamanhos. Nenhum rótulo contém identificadores ou dados de pessoas.

O arquivo Drive localizado na leitura do elenco/histórico é reutilizado nas
escritas da **mesma operação**, somente após validar o contexto sob ScriptLock.
Ausência também é retida: a primeira escrita cria o arquivo e as seguintes
reutilizam o handle retornado. Invalidar a lista bruta não invalida o handle;
o `finally` do salvamento descarta os handles antes de liberar o lock, inclusive
nas falhas. Handles não atravessam requisições, nem há índice ou mudança de
armazenamento; helpers sem contexto validado continuam localizando normalmente.
Limpeza das propriedades legadas continua somente após persistência bem-sucedida.
No fixture com quatro elencos, migração de ID e duas escritas históricas,
buscas por nome/`hasNext` caem **9 → 5** (uma por arquivo); leituras e escritas
permanecem iguais. Com histórico já reconciliado e sem migração de ID, o
salvamento comum cai **7 → 5**. Cada escrita reaproveitada elimina uma busca e seu iterador.
Na amostra real, as buscas/iterações redundantes do elenco e histórico somavam
**524 ms** (84+133+101+206 ms): ganho candidato modesto de **~0,5 s**, não garantido.
Os custos principais de leitura/escrita e reconciliação global permanecem.

**IDs de arquivos entre chamadas:** registro de equipes, campeonatos,
bloqueios, histórico e listas de atletas/comissão de cada campeonato guardam
apenas o **ID** do arquivo em `CacheService.getUserCache()` (por usuário, pois o
Web App executa como `USER_ACCESSING`), por até 6 horas. A chave é um hash
SHA-256 de versão do esquema + pasta raiz + nome lógico exato; não há conteúdo,
listas, ausência, sessão, perfil ou autorização no cache. Toda chamada reabre o
arquivo pelo ID e confere nome exato, lixeira e pasta raiz antes de usá-lo; o
conteúdo é sempre lido do Drive, e as validações sob lock são as mesmas. Tabelas
e demais arquivos continuam somente com a busca por nome.

- **Sem cache negativo:** arquivo ausente (inclusive com dados legados em
  PropertiesService) sempre volta a ser procurado pelo nome; o ID só é guardado
  quando a busca encontra o arquivo ou depois que a criação tem sucesso.
- **Renomeado, movido ou na lixeira:** o ID é descartado e a mesma chamada busca
  pelo nome (o arquivo foi aberto com permissão, então a divergência é segura).
  Substituição externa (antigo na lixeira + novo homônimo) passa a usar o novo.
- **Erro ao abrir pelo ID** (removido definitivamente ou sem permissão — o Apps
  Script não distingue os dois com segurança): o ID é descartado e a operação
  **falha** com mensagem pedindo nova tentativa, sem busca por nome nem gravação
  nessa chamada. A próxima chamada busca pelo nome com as permissões atuais,
  exatamente como antes do cache. Falhas na verificação de metadados seguem a
  mesma regra.
- **Homônimos:** guarda-se o primeiro arquivo devolvido pela busca, como antes;
  enquanto ele continuar válido, as chamadas seguintes ficam nele, mesmo que a
  ordem do Drive (não garantida) mude. Os demais nunca são lidos ou gravados.
- **Remoção pelo sistema:** excluir um campeonato invalida os IDs das listas no
  cache do usuário que excluiu. Caches de outros usuários não são alcançáveis,
  mas a verificação detecta o arquivo na lixeira na chamada seguinte.
- **Indisponibilidade/expulsão do CacheService:** o cache pode descartar entradas
  a qualquer momento; falhas ou ausência do serviço equivalem a "não memorizado"
  e usam a busca por nome original, nunca a "arquivo ausente". Valores
  adulterados que não parecem um ID são descartados. `ARQUIVO_ID_CACHE_ATIVO =
  false` em `WebApp.gs` desliga o recurso por completo.
- **Sem promessa de velocidade:** com cache quente, cada arquivo troca
  `getFolderById` + busca por nome + `hasNext`/`next` (4 chamadas) por
  `getFileById` + `getName` + `isTrashed` + `getParents`/`hasNext`/`getId`
  (6 chamadas de método). Num salvamento com 8 arquivos, no fixture, são 32 → 48
  chamadas de método e 8 → **0** buscas por nome; leituras de conteúdo e
  escritas não mudam. A primeira chamada acrescenta um `getId` e um `put` por
  arquivo encontrado. O ganho depende de a busca por nome no Drive ser mais lenta
  que a abertura direta mais metadados — só a medição real responde. Compare
  `drive_localizar` + `drive_iterar` antes com `drive_id_cache` + `drive_id_abrir`
  depois, na mesma base/ação; se não houver ganho, desligue a constante.

Para avaliar o cache de IDs, os pais
`lock_autorizacao`, `lock_vinculo` (2.336 ms na amostra) e `lock_bloqueio`
(1.037 ms) têm medidas mais finas: `lock_autorizacao_identificar`,
`lock_autorizacao_perfil`, `lock_equipes_registro`, `lock_equipes_ativas`,
`lock_equipe_acesso`, `lock_campeonatos`, `lock_campeonato_alvo`, `lock_times`,
`lock_vinculo_validacao`, `lock_bloqueio_leitura` e `lock_bloqueio_consulta`.
Registro de equipes, lista de campeonatos e bloqueios também usam as etapas
Drive/parse existentes com suas categorias, sem consultas extras. São medidas
aninhadas: não some filhos aos pais. `lock_times` mede PropertiesService e
normalização; a consulta de bloqueio mede somente a busca em memória.

**Separar memória e Drive:** `drive_localizar` mede pasta e busca por nome;
`drive_iterar` mede o iterador; `drive_ler` mede blob e decodificação UTF-8
(`next()` fica em `drive_iterar`, inclusive no histórico); `drive_setContent` mede a escrita existente;
`drive_criar` inclui a preparação do blob e criação. `legado_ler` mede
PropertiesService quando não há arquivo; não representa Drive.
`json_parse`/`json_serializar` medem parse e serialização para persistência;
`json_comparacao_antes`/`json_comparacao_depois` medem serializações usadas
para detectar mudanças históricas. `reconciliacao_memoria` mede cada campeonato
sem a consulta de times, incluindo comparação JSON dos snapshots, buscas,
UUIDs e atualizações em memória. `historico_marcar_memoria` e
`historico_limpar_memoria` medem preparação/remoção dos marcadores temporários.
`tamanho_utf8` mede separadamente o custo da contagem de bytes, sem nova
leitura ou serialização do documento.
Escritas com handle reutilizado não emitem `drive_localizar`/`drive_iterar`;
ausência dessas etapas não representa tempo zero de persistência.
Com ID memorizado, `drive_id_cache` mede a leitura do CacheService e
`drive_id_abrir` mede `getFileById` e a verificação de nome/lixeira/pasta; a
busca por nome só aparece quando o ID falta ou diverge. Linhas `drive_id` têm
apenas `metrica`, `fase`, `categoria` e `resultado` (`acerto`, `ausente`,
`divergente`, `invalido`, `falha` ou `cache_indisponivel`), sem IDs ou nomes.

`bytesJson` é UTF-8 do texto bruto já lido (inclusive espaços) ou do JSON
compacto efetivamente escrito, não caracteres, transferência comprimida,
quota do Drive ou tamanho binário das imagens. Inclui base64/fotos e snapshots,
sem detalhar imagens. Tamanhos/contagens saem após leitura validada ou escrita
bem-sucedida; arquivo ausente sem legado não produz contador de tamanho.
São medidas por acesso, sem identificador: agrupe por categoria e direção,
não some leitura e escrita como tamanho único da base. A varredura global
obrigatória continua medindo também elencos dos outros campeonatos e migração
de IDs. Helpers sem recursos da operação não emitem essas novas etapas.

As etapas são **aninhadas/inclusivas**, não parcelas aditivas dos pais:
`preparacao_historico` contém leitura, reconciliação e eventual gravação;
`gravacao_historico` pós-elenco contém reconciliação e escrita. Não some os
pais com seus filhos nem com `validacao_leitura`/`resposta`. Tempos de etapas
são emitidos também em falhas, sem status/mensagem; um log de tempo não
comprova sucesso. A instrumentação não altera armazenamento ou regras.

**Escudos:** novos uploads de equipe e campeonato são redimensionados no
navegador para até 256 pixels, preservando proporção e transparência, usando
PNG ou WebP (o menor resultado), com limite de 100 KB para a imagem otimizada.
Na tela **Administração**, somente admin pode otimizar os escudos antigos.
Não renomeia equipes nem altera vínculos. Pode haver pequena perda de
qualidade; os backups por lote permitem restauração administrativa.
Publicar os arquivos não otimiza automaticamente os registros antigos:
executar a ação uma vez e repetir o benchmark com a mesma base.

**Fotos de atletas e comissão:** ao selecionar uma nova foto no cadastro ou
na edição, o navegador reduz o maior lado para até 512 pixels, sem ampliar
imagens pequenas nem recortar. Usa o menor resultado entre PNG e WebP com
qualidade 0,85, limitado a 200 KB de Data URL (incluindo base64). A tela indica
a preparação antes de enviar a imagem no mesmo RPC de cadastro, sem chamada
extra ao servidor. Se a imagem não puder ser processada, o envio é impedido e
o formulário exibe o erro. Editar sem selecionar outra foto mantém a original.
Fotos antigas e snapshots históricos não são convertidos automaticamente.
O processamento é local e depende do aparelho e das dimensões do arquivo;
o ganho nas consultas ocorre à medida que fotos menores são cadastradas.
Comprovantes e anexos documentais não passam por essa conversão.

**Administração:** módulo exclusivo do perfil admin, inclusive nos endpoints
de manutenção do servidor. Centraliza ferramentas administrativas sem
alterar as permissões do cadastro normal de equipes e campeonatos.
Os botões são **Escudos de equipes**, **Escudos de campeonatos**, **Fotos de
atletas**, **Fotos da comissão** e **Otimizar toda a base**. Para fotos,
selecione um campeonato ou **Todos os campeonatos**; a ação de toda a base
ignora esse seletor e inclui todas as categorias.

**Otimizar imagens da base:** o administrador pode confirmar a ação para
processar escudos de equipes, escudos dos
campeonatos e fotos dos cadastros de atletas e comissão de cada campeonato,
inclusive campeonatos inativos. O navegador usa os mesmos limites dos uploads.
Mantenha a tela aberta e evite alterações simultâneas. A navegação interna
fica bloqueada durante a execução (fechar/recarregar a aba ainda interrompe).
A preparação ocorre
fora do lock; a gravação confere a assinatura do documento completo sob lock
e recusa o lote se houver mudança concorrente.

Cada lote tem até cinco imagens, altera um único documento e cria antes um
`AEUV - Backup Imagens - <id>.json` na raiz do Drive, contendo `arquivoOriginal`,
`fonte` e `registros` completos antes da alteração. Esses backups contêm
dados pessoais: mantenha o acesso restrito. Para restauração administrativa,
use o conteúdo de `registros` no arquivo indicado por `arquivoOriginal`;
o backup é um envelope, não uma cópia direta para substituir o arquivo.
Falha de backup impede a gravação. Não há transação entre documentos:
se houver erro/interrupção, lotes já gravados permanecem salvos. Recarregue
antes de repetir se a resposta de uma gravação falhar.

A ação substitui apenas imagens menores que as originais. Não altera
identificadores, vínculos, revisões ou campos cadastrais, nem executa
reconciliação esportiva. Súmulas, snapshots de resultados e histórico de
inscrições ficam intactos; portanto, imagens nessas cópias podem continuar
grandes. A reconciliação habitual do sistema continua funcionando.
Não é uma função de compressão executável no editor do Apps Script: o
redimensionamento requer o Canvas do navegador. Nenhum serviço externo de
processamento é utilizado. Publicar não inicia a operação automaticamente.

**Logo principal do sistema:** em Administração, execute **Otimizar logo
principal do sistema** após publicar. O navegador prepara uma versão de até
512 pixels e 100 KB de Data URL. O servidor valida a assinatura sob lock,
cria um arquivo separado `AEUV - Logo Sistema - <id>` no Drive e guarda seu
ID na propriedade `AEUV_LOGO_SISTEMA_OTIMIZADO_ID`. O arquivo original
`CONFIG.logoFileId` e as versões anteriores não são modificados ou excluídos;
a geração de documentos no servidor continua usando o original.
As próximas aberturas leem somente a versão leve. Até executar a ação,
a abertura continua usando o original. Para voltar ao original, remova essa
propriedade nas configurações do projeto; para atualizar a versão leve após
trocar o original, execute a ação novamente.

O `Index.html` inclui a imagem apenas uma vez, na configuração JavaScript;
o cabeçalho reutiliza esse valor em vez de embutir uma segunda cópia no HTML.
O logo leve também é usado pelos relatórios montados no navegador e pela tela
de acesso negado. Não há cache de usuários ou permissões. O ganho real na
abertura deve ser medido após executar a ação e recarregar; essa alteração
não elimina necessariamente a espera pela infraestrutura do Apps Script.

**Publicação:** atualizar `WebApp.gs` e `Index.html` juntos no Apps Script e
publicar uma nova versão da implantação. Os contratos de consulta mudaram;
recarregar abas antigas após a publicação. Não há migração de arquivos no Drive.
Comparar os tempos e os tamanhos dos callbacks no Network usando a mesma base e
os mesmos fluxos antes/depois, incluindo troca de campeonato, edição de
critérios, resultado, transferência e consulta de súmula.
O [benchmark reutilizável](../performance/README.md) executa consultas na sessão
autenticada do navegador, acompanha callbacks das ações manuais e exporta
somente métricas. Não publicar a ferramenta como parte do WebApp.

**Armazenamento:** o Drive continua como persistência nesta etapa. Ele é adequado
para uma operação pequena com baixa concorrência, mas arquivos JSON completos
e um lock global limitam o crescimento. Se as consultas continuarem lentas após
reduzir payloads e leituras, medir separadamente execução, espera do lock e
transporte antes de decidir a migração. Firestore ou PostgreSQL gerenciado
(por exemplo, Supabase) são opções a avaliar; planos gratuitos têm limites e
exigem projetar autenticação, acesso, índices, transações, backups e migração
dos históricos. Imagens devem ser tratadas separadamente dos registros, mesmo
ao trocar de banco.

Criar uma área para operar campeonatos dentro do `sistema-interno`, seguindo o mesmo padrão visual e estrutural já usado no projeto.

Este MVP deve permitir começar uma competição com o básico necessário para operação:

- criar campeonato
- configurar grupos e rodadas
- cadastrar ou reaproveitar times de outras competições
- cadastrar ou reaproveitar atletas
- controlar cartões, suspensão e zeragem de cartões
- gerar súmula básica de jogo
- lançar resultado de jogo
- consultar a operação em telas organizadas por submenu

---

## Escopo do MVP fase 1

### 1. Campeonato
Cadastro da edição do campeonato com informações básicas:

- nome da competição
- temporada / edição
- modalidade
- status
- descrição
- visibilidade interna
- data de início e fim
- organização responsável

### 2. Forma de disputa (no cadastro do campeonato)
Configuração da estrutura esportiva no mesmo formulário de **Campeonatos**:

- nome da fase
- formato da fase
- grupos
- quantidade de vagas por grupo
- rodadas
- ida e volta
- observações da forma de disputa
- fases
- identificação das rodadas
- organização dos jogos por fase

### 3. Equipes participantes
Participação de equipes globais na competição:

- criar equipe no Banco de Dados de Equipes, com escudo opcional no Drive
- vincular equipe existente ao campeonato sem importar elencos
- cards responsivos com quantidade de atletas e comissão técnica
- identificador permanente aditivo, preservando as listas legadas por nome
- gerenciar o elenco e copiar/enviar o link de inscrição pelo WhatsApp

### 4. Elenco (Atletas e Comissão técnica)
Cadastro dos atletas vinculados aos times:

- cadastro exclusivamente em **Equipes participantes → Gerenciar elenco**
- sem entradas separadas **Atletas** ou **Comissão técnica** no menu lateral
- **Banco de Dados de Atletas** permanece como consulta administrativa geral:
  lista todos os atletas dos elencos de todos os campeonatos e, ao expandir,
  o histórico de vínculos (atuais, removidos, de outra equipe ou de campeonato
  excluído) a partir do histórico permanente abaixo; comissão técnica não entra
- cabeçalho com equipe, escudo, campeonato e retorno às equipes participantes
- abas **Atletas**, **Comissão técnica**, **Jogos** e **Estatísticas** sempre visíveis;
  somente as duas primeiras possuem contagem de cadastros
- navegação por abas integrada ao painel, com seleção visual evidente e rolagem
  horizontal em telas estreitas
- **Jogos** e **Estatísticas** são áreas reservadas para etapas futuras, com
  mensagem contextual, sem dados simulados, tabelas, formulários ou ações de cadastro
- navegação pelas quatro abas com clique, setas esquerda/direita e Home/End
- lista e formulário separados: **Adicionar atleta** ou **Adicionar membro da comissão**
- atletas e comissão exibidos em cards responsivos com foto e resumo; **Ver detalhes**
  abre uma janela acessível com foto ampliada e somente os dados existentes, sem
  expor CPF na lista
- **Editar** e **Remover** permanecem disponíveis nos cards e na janela de detalhes
  quando o perfil pode editar; **Ver detalhes** permanece em modo somente leitura
- formulário com **Dados pessoais**, dados específicos do atleta/membro e **Foto**
- comissão técnica sem campos de telefone ou e-mail; cargo obrigatório com opções
  **Massagista**, **Médico**, **Diretoria**, **Treinador**, **Auxiliar Técnico**,
  **Preparador Físico**, **Preparador de Goleiros** e **Fisioterapeuta**
- na edição, cargos legados aparecem como **(cargo anterior)** e podem ser mantidos;
  novos cadastros e alterações de cargo exigem uma opção atual válida
- contatos legados permanecem armazenados ao editar sem informar esses campos
- retorno compacto no cabeçalho e cópia do link/WhatsApp discretos no rodapé da
  lista, com controles utilizáveis em telas pequenas e nos temas claro/escuro
- equipe e campeonato fixos no formulário, exibidos como contexto (não seletores)
- abas ficam desabilitadas durante o formulário; o retorno às equipes participantes
  continua disponível e confirma o descarte de alterações/seleções não salvas,
  mantendo o campeonato selecionado. **Cancelar e voltar à lista** retorna ao elenco
  na mesma aba. Durante gravação/importação, o retorno fica desabilitado
- duas colunas no desktop e uma no celular, sem campos estreitos de CPF e datas
- cadastrar atleta novo
- editar e remover cadastros do elenco selecionado
- aba de comissão técnica no mesmo contexto
- **Importar atletas / Importar comissão** ao lado de adicionar: escolha a
  competição anterior da mesma equipe, marque inscrições ou selecione todas
  as disponíveis e confirme a quantidade; cancelar retorna à mesma aba
- admin e diretoria podem transferir um atleta para outra equipe ativa vinculada
  ao mesmo campeonato somente quando nenhum resultado detalhado encerrado do
  campeonato registra sua participação (por qualquer equipe); o vínculo do atleta é atualizado sem trocar
  seu ID, foto ou dados pessoais/esportivos, e a inscrição anterior permanece no
  histórico. Associados não recebem essa ação
- ao inscrever atleta, CPF já vinculado a outra equipe no mesmo campeonato bloqueia
  o cadastro do associado e informa equipe, responsável legal e telefone publicados
  para aquela equipe; cadastros de outras competições não causam bloqueio
- inscrições removidas também aparecem, identificadas como anteriores; impedimentos
  por CPF (inclusive outro tipo ou equipe no destino), nomes similares ou dados
  obrigatórios inválidos aparecem na lista e desabilitam a seleção
- vincular atleta à participação atual
- manter histórico de inscrição
- atleta que já participou de algum jogo do campeonato permanece vinculado à
  equipe: não pode ser removido nem transferido, e a edição não aceita troca de
  equipe ou CPF (nome, apelido, número, posição, data, RG e foto continuam
  editáveis). A regra vale para todos os perfis (admin, diretoria e associado),
  tanto no elenco da equipe quanto no cadastro global de atletas, e continua
  valendo depois que o campeonato é encerrado, preservando o elenco histórico.
  O botão **Remover** aparece desabilitado com o motivo visível; o servidor
  revalida sob o lock antes de qualquer gravação de elenco ou histórico
- um CPF com participação registrada no campeonato só pode ser inscrito,
  importado ou ter o cadastro alterado para a(s) equipe(s) pela(s) qual(is) jogou;
  vincular a outra equipe é recusado, informando a equipe original (e, para o
  associado, o responsável e telefone publicados). Isso cobre inscrições removidas
  antes desta regra, desde que o resultado detalhado do jogo continue salvo.
  Comissão técnica não é afetada

#### Histórico permanente e importação

`AEUV - Historico de Inscricoes.json`, na pasta raiz do projeto no Drive,
guarda participações de equipes mesmo sem elenco ou jogos e inscrições de atletas
e comissão. Não usa Script Properties para o conteúdo histórico. Equipe e competição
são identificadas por IDs permanentes; cada inscrição conserva tipo, ID de cadastro,
CPF, dados, nomes legíveis da participação e timestamps mínimos. Nomes originais
da equipe e competição também são preservados. A importação usa a inscrição mais
recente **naquela equipe, competição e tipo**, não o cadastro global mais recente.

A ativação é retrospectiva e automática na primeira consulta de importação ou
mutação abrangida: semeia os vínculos e elencos **ainda persistidos**. Cadastros
legados sem ID recebem um ID persistido uma única vez, preservando os outros dados.
Não é possível reconstruir vínculos ou pessoas excluídos antes dessa ativação.
Edição, remoção, desvinculação, encerramento ou exclusão da competição não apagam
o histórico. Somente a presença atual é reconciliada; os dados da última inscrição
continuam disponíveis. Não é necessário ter participado de jogos.
O **Banco de Dados de Atletas** lê esse mesmo histórico (somente inscrições
do tipo atleta), reconciliando-o antes sob o lock. `inscritoEm` é exibido como
data de registro no histórico, nunca como data real de entrada ou transferência.

A elegibilidade de transferência, remoção e troca de equipe/CPF consulta os
resultados detalhados ainda persistidos do campeonato e considera somente o campo
explícito `participou: true`, em qualquer equipe, casando o atleta pelo mesmo ID
de cadastro ou pelo mesmo CPF normalizado; gols, cartões, escalação e participação em outra equipe
ou competição não substituem esse registro. Um resultado antigo sem evidência de
participação não é tratado como participação. Jogos/resultados apagados antes da
consulta não podem ser reconstruídos, então essa regra reflete os dados detalhados
disponíveis e não certifica participação fora deles; a regra também não impede
o uso de um CPF diferente ainda não registrado em jogo. Uma tabela ou resultado
salvo inválido interrompe a consulta com erro explícito (nunca libera a ação).
Campeonatos sem tabela gravada não têm jogos e, portanto, nenhuma participação.
A transferência é validada
novamente sob o lock do servidor e a gravação preserva a inscrição histórica da
equipe de origem e registra o novo vínculo.

Somente fontes da mesma equipe, diferentes do destino, são oferecidas. Destino,
vínculo e acesso são novamente verificados sob um único lock. Associados acessam
somente sua equipe vinculada; os endpoints administrativos globais não recebem
novas permissões. O cliente envia apenas IDs das inscrições selecionadas, origem,
tipo e contexto; os dados são lidos do snapshot confiável no servidor.

Toda a seleção passa por validação antes de uma gravação única do elenco:
CPF, data, foto obrigatória, posição/número ou cargo e as regras existentes de
duplicidade por CPF e nome similar. RG continua opcional. Cargo legado pode ser
mantido **somente como armazenado na inscrição histórica**, usando a mesma
exceção de edição; nenhum cargo arbitrário enviado pelo cliente é aceito.
A origem não é movida nem apagada. Os cadastros de destino recebem IDs novos,
preservando fotos e demais dados pessoais/esportivos e contatos legados.

**Coerência de gravação:** Drive não oferece transação entre os arquivos.
O histórico existente é persistido antes de alterações destrutivas; uma falha
nessa etapa impede a alteração. Novas inscrições de destino só entram no histórico
após a gravação do elenco. Se essa atualização posterior falhar, o servidor retorna
erro explícito informando que o elenco foi salvo, sem resposta de sucesso parcial.
A próxima consulta de importação (ou mutação) reconcilia o histórico com os
elencos persistidos. Se a confirmação da própria gravação falhar, o erro pede
recarregar antes de repetir; a interface não oferece repetição automática.
Mantenha backup dos JSONs no Drive. Não há promessa de atomicidade multiarquivo.

### 5. Tabela e Classificação

O submenu mantém o ID `jogos-campeonato`, com acesso de admin/diretoria.
As abas mantêm o campeonato selecionado e se adaptam a telas menores, sem
comprimir jogos e classificação em duas colunas fixas.
As abas seguem o padrão do elenco, em uma faixa horizontal com rolagem no
celular e indicação da seleção em dourado. Classificação e lançamento de
resultados mantêm as colunas alinhadas, com rolagem horizontal dentro da tabela,
sem transformar cada célula em um bloco vertical.
Em **Jogos e rodadas**, cada rodada tem seção e cabeçalho próprios. Ao selecionar
uma fase, use as setas anterior/próxima para mostrar uma rodada por vez, ou
escolha **Todas as rodadas** no filtro para voltar à visão completa.

Em **Campeonatos → Forma de disputa**, selecione explicitamente as fases
eliminatórias: **Oitavas de final**, **Quartas de final**, **Semifinal** e
**Final**, quando o formato tiver mata-mata. A quantidade de grupos não
determina essas fases. Campeonatos antigos não recebem fases eliminatórias
presumidas: edite a configuração para escolhê-las.

Em **Grupos e fases**, os espaços são apresentados conforme a configuração
salva. Distribua manualmente as equipes participantes nos grupos após o
sorteio. Equipes podem permanecer sem grupo enquanto a distribuição não
estiver concluída. O MVP não realiza sorteio, não escolhe classificados e
não monta cruzamentos automaticamente.

Em **Jogos e rodadas**, cadastre mandante, visitante, fase, grupo quando
aplicável, rodada, campo, data e hora. Os confrontos são cadastrados
manualmente. É possível editar, excluir com confirmação e gerar a súmula
em PDF. **Editar jogo** altera somente os dados do confronto e agendamento;
não lança nem apaga resultados. Jogos ainda sem resultado podem ficar
**Agendados**, **Adiados** ou **Cancelados**. Em jogos encerrados, equipes,
fase e grupo ficam protegidos; rodada, campo, data e hora podem ser corrigidos.

#### Lançamento do resultado e participação

**Lançar resultado** abre uma tela própria, preenchida manualmente com base
na súmula do árbitro. Jogos já encerrados apresentam **Editar resultado**,
incluindo resultados antigos cadastrados antes deste fluxo.

O placar fica no topo, com identificação das duas equipes. As abas mantêm os
dados de ambos os times durante o preenchimento. Para atletas, registre
**participação**, **gols**, **gols contra**, **amarelos (0 a 2)** e
**cartão vermelho**. Para comissão técnica, registre **participação**, amarelos
e vermelho. O **número na partida** do atleta é opcional e começa em branco:
preencha conforme a súmula física, sem importar o número do cadastro. Ele fica
salvo apenas no resultado dessa partida e reaparece ao editar esse resultado,
sem alterar a numeração do cadastro. Resultados antigos sem esse campo também
abrem com o número da partida em branco.
Marcar ou desmarcar todas as participações inclui atletas e
comissão da equipe selecionada, sem apagar gols ou cartões. O resumo informa
separadamente quantos atletas e integrantes da comissão participaram.
Ambas as listas identificam as pessoas pelo **CPF completo, sem máscara**;
a data de nascimento não aparece nesta tela. O CPF vem do cadastro confiável,
é preservado no resultado e não pode ser alterado pelo lançamento. Resultados
antigos recuperam o CPF do cadastro da mesma equipe quando ainda disponível;
sem essa informação, exibem **Não informado**. A súmula em PDF continua com
CPF parcialmente mascarado. Participações antigas da comissão sem registro
são exibidas desmarcadas, sem presumir presença.
Não há campos de assistência, defesa difícil, defesa de pênalti ou cartão azul.
Assistências registradas em resultados anteriores continuam armazenadas,
mas não aparecem nem são alteradas por esta tela.

Adicionar ou retirar gols de um atleta atualiza o placar da sua equipe pela
diferença informada. Gols contra atualizam o placar da equipe adversária,
sem contar como gols a favor do atleta. Alterar o placar diretamente continua
permitido para gols administrativos, autoria desconhecida ou WO; esses ajustes
são mantidos ao lançar mais gols individuais. O placar não é recalculado do
zero ao abrir um resultado antigo. Diferenças entre os gols atribuídos
(incluindo gols contra do adversário) e o placar geram aviso, sem bloquear.
**WO** identifica a equipe ausente, mas não calcula um placar automaticamente.
**Prorrogação** é informativa; o placar principal deve incluir seus gols.
Quando houver **pênaltis**, informe o placar da disputa separadamente: ele
não é somado aos gols da classificação. Observações complementam o registro.

Finalizar grava o resultado e encerra a partida. Não há suspensão automática,
avanço de classificados nem interpretação das regras de WO nesta etapa.
O registro de amarelos não marca automaticamente um vermelho, e os eventos
não alteram automaticamente a participação indicada. Os gols contra já estão
incluídos no placar principal ao salvar, sem nova soma na classificação.

O servidor usa os IDs dos cadastros e conserva os dados de identificação
registrados no resultado. Atletas e comissão já registrados na partida
continuam disponíveis para correção histórica mesmo após remoção ou inativação
no elenco, identificados como cadastros anteriores. A tela não inscreve novas
pessoas: use **Gerenciar elenco** antes do lançamento. Alterações simultâneas
do elenco ou resultado exigem recarregar antes de salvar novamente.

Em **Classificação**, consulte a visão geral ou por grupo. Somente jogos
**Encerrados** da fase de classificação entram no cálculo; mata-mata,
partidas agendadas, adiadas e canceladas não contam. Salvar, corrigir ou
excluir um resultado recalcula a tabela da tela. Não há sincronização
automática com a súmula digital nem atualização contínua entre navegadores:
use **Atualizar** para consultar alterações feitas por outra pessoa.

Em **Critérios**, configure a pontuação e uma lista ordenada de desempates
por campeonato. Adicione, retire e reordene os critérios sem precisar preencher
três posições fixas. Estão disponíveis: **mais vitórias**, **melhor saldo de
gols**, **mais gols pró**, **menos gols sofridos**, **confronto direto**,
**menos amarelos** e **menos vermelhos**. Pontos sempre são comparados primeiro.
O padrão permanece **vitória 3, empate 1, derrota 0**, com desempate por
**vitórias, saldo de gols e gols pró**, preservando configurações já salvas.
Alterar os critérios recalcula os resultados encerrados, sem mudar os placares.

O **confronto direto** só é aplicado quando restarem exatamente duas equipes
empatadas no momento desse critério e elas tiverem se enfrentado na primeira
fase. Se forem três ou mais, ou não houver confronto, passa ao critério seguinte.
Com mais de um confronto, compara a soma de pontos nesses jogos usando a
pontuação configurada; permanecendo empate, segue ao próximo critério.
Pênaltis não alteram esse cálculo.

Os critérios de cartões somam **atletas e comissão técnica**, somente nos jogos
encerrados da fase de classificação. Resultados antigos sem eventos detalhados
contribuem com zero cartões registrados; isso não comprova ausência de cartões
na súmula original. Preencha os resultados para ter um desempate completo.

#### Desempate final da organização

Se todos os critérios esportivos empatarem, registre a ordem definida pela
Comissão Organizadora (por exemplo, após sorteio externo), com **motivo
obrigatório**. O sistema registra autor e data, sem realizar sorteio sozinho.
Essa ordem só separa as equipes daquele empate residual, nunca ultrapassa
equipes melhor classificadas pelos critérios esportivos.

A decisão é específica da **classificação geral** ou do **grupo** selecionado:
uma não substitui automaticamente a outra. Pode ser corrigida ou removida com
confirmação. Sem decisão válida, equipes empatadas mantêm a mesma posição;
a ordem alfabética de apresentação não decide classificação esportiva.
Alterações nos resultados, critérios ou participantes podem invalidar a
decisão, exigindo novo registro para a situação atual do empate.

A visão geral usa os mesmos critérios,
sem normalizar resultados de grupos com números diferentes de jogos.
O aproveitamento é relativo aos pontos por vitória: com vitória valendo zero,
aparece como zero; configurações em que empate ou derrota valem mais que
vitória podem produzir percentuais acima de 100%.

Em **Campos**, cadastre nome, endereço e situação. Esse cadastro é
compartilhado entre campeonatos. Campos inativos não são oferecidos para
novas marcações. Referências de jogos existentes são protegidas contra
exclusões e alterações de estrutura que tornariam a tabela inconsistente.

### 6. Disciplina
Cartões de atletas e comissão são registrados no resultado, mas a disciplina
automática aplica-se somente a atletas e é recalculada a partir dos resultados
detalhados finalizados da mesma equipe e competição:

- A cada três cartões amarelos acumulados, aplica-se uma suspensão de um jogo.
  Subtrai-se três do acumulado e qualquer excedente continua para a próxima
  partida; cartões não são zerados automaticamente por fase.
- Vermelho direto aplica uma suspensão de um jogo. Expulsão por segundo amarelo
  também aplica um jogo, mas os dois amarelos informados nessa partida não
  entram no acumulado. O resultado exige tipo explícito para todo vermelho e
  exige exatamente dois amarelos para o tipo segundo amarelo.
- Amarelos que completam a terceira advertência e vermelho direto no mesmo
  jogo geram duas suspensões cumulativas. A suspensão começa após essa partida.
- A suspensão é cumprida no próximo jogo da equipe que tenha resultado
  detalhado finalizado e registre `participou: false` para o atleta. Cada jogo
  assim cumpre uma suspensão, independentemente do número da rodada. Um
  participante ausente do snapshot, sem registro explícito, não cumpre jogo.
  Jogos agendados, adiados, cancelados e partidas sem resultado detalhado não
  contam; um jogo finalizado por WO conta apenas quando o snapshot explicita a
  não participação.
- A ordem é data, horário e ID estável do jogo. Corrigir ou salvar um resultado
  recalcula o histórico; a gravação é bloqueada se criar participação em jogo
  com suspensão pendente. Violações já existentes são preservadas para permitir
  corrigir os respectivos resultados sem bloquear alterações não relacionadas.
- Resultados antigos com vermelho e sem tipo são interpretados como vermelho
  direto, com aviso visível; não se tenta inferir expulsão por segundo amarelo.
  Novos resultados não podem omitir o tipo do vermelho.
- A súmula em branco indica a suspensão calculada para aquele jogo. O editor
  mostra motivo e saldo, impede marcar participação de atleta suspenso e pula
  esses atletas na marcação em lote. O servidor repete a validação.
- Suspensões definidas manualmente no **Controle de punições** continuam
  independentes e aparecem junto das automáticas na súmula. As regras não
  alteram estatísticas de cartões do ranking, sanções da comissão, avanço de
  fase ou pontuação.

### 7. Súmula básica em PDF

#### Consulta de súmulas finalizadas

O submenu **Súmula** (`sumula-campeonato`), exclusivo de admin/diretoria,
lista todas as partidas encerradas com resultado detalhado salvo, inicialmente
de **todos os campeonatos**. Filtre por campeonato/temporada, rodada, equipe
(mandante ou visitante, pelo ID permanente) e data exata do jogo. **Limpar
filtros** retorna à lista completa; **Atualizar** busca novamente os dados,
mantendo os filtros válidos. Campeonatos sem súmulas também aparecem no seletor.
Jogos agendados, adiados, cancelados ou legados com somente placar não aparecem.
Estes últimos continuam disponíveis na Tabela e Classificação para detalhamento.

**Consultar** mostra somente os snapshots salvos dos atletas e da comissão,
com participação, número na partida (`numeroJogo`, opcional e independente
do número cadastrado), CPF, gols/gols contra, cartões, placar, WO, prorrogação,
pênaltis e observações. Não acrescenta pessoas do elenco atual e não grava
cadastros. **Editar resultado** reutiliza o editor da tabela, com controle de
revisão do jogo/elenco e participantes históricos preservados. O retorno,
descarte e salvamento mantêm os filtros; após salvar, a lista é atualizada.
Navegação e fechamento da página protegem alterações pendentes e gravações.

Este módulo não é **Súmulas Enviadas** da arbitragem. Não oferece PDF histórico
preenchido: o PDF abaixo permanece um formulário em branco com elencos atuais.

#### Emissão do formulário em branco

A ação **Gerar súmula** fica no jogo em **Tabela e Classificação**. O PDF
usa A4 paisagem, com identificação e logo da AEUV, escudos disponíveis,
campeonato, temporada, fase/grupo/rodada, local, data e horário da partida.
A data/hora de geração fica no canto superior direito, no fuso do script.
As duas equipes aparecem lado a lado, com comissão acima dos atletas e CPF
parcialmente mascarado em ambas (somente quatro dígitos centrais; ausente ou
inválido aparece como `—`). Há 18 linhas de atletas e quatro de
comissão por equipe/folha. Elencos maiores continuam em folhas adicionais,
sem truncar inscritos nem diminuir a fonte. Placar, cartões, gols,
substituições, gols contra, arbitragem, assinaturas,
relatório e horários de início/fim ficam para preenchimento manual.
Não há campos de faltas acumuladas ou defesa difícil.
O layout usa texto e bordas pretos sobre fundo branco, mantendo suspensos em
vermelho e as cores originais das logos e escudos. Gols e gols contra não têm campo de minuto. Cada equipe tem dez
espaços numerados de substituição (Entra/Sai), sem minuto ou pedido de tempo.
A arbitragem inclui Árbitro(a), Auxiliar 1, Auxiliar 2 e Mesário(a), mantendo
os horários de início/fim dos tempos.

Os elencos ativos e as suspensões manuais são consultados **no momento da
emissão**; as suspensões automáticas são calculadas antes do jogo impresso,
considerando somente partidas anteriores na ordem data/hora/ID. A marcação
automática identifica atleta por CPF válido, com ID como alternativa, sempre
dentro da mesma equipe e competição. O PDF junta essas suspensões às do
**Controle de punições** (status `DEFINIDA`, situação iniciada por
`A CUMPRIR`, competição/equipe/tipo/nome correspondentes); as sanções manuais
continuam independentes e não substituem o cálculo automático. Falta do arquivo
manual, erro de leitura ou permissão bloqueiam a geração: não são interpretados
como ausência de suspensão.

**Limite da fonte:** o controle não fornece CPF nem ID/temporada da competição;
a correspondência é pelo nome completo do campeonato, não por trecho ou ID.
Identifique a edição exatamente no nome da competição no controle e no
cadastro, especialmente quando o nome é reutilizado em temporadas diferentes.
Homônimos na mesma equipe/tipo não podem ser distinguidos pela fonte manual.
O PDF não registra eventos, não envia a súmula digital e não lança resultados.
O download não exige tornar
os cadastros, o logo ou o controle públicos no Drive.

---

## O que fica pendente para próximas fases

- estatísticas avançadas por atleta
- avanço automático de classificados e cruzamentos do mata-mata
- critérios adicionais de regulamento além dos disponíveis e punições em pontos
- integração dos resultados com a súmula digital
- relatórios e PDFs além da súmula básica
- portal público
- carteirinha
- artes e divulgação
- regras avançadas de disciplina

---

## Estrutura sugerida do módulo

### Menu principal
- **Gestão do campeonato**

### Submenus
- **Campeonatos** (dados do campeonato e forma de disputa)
- **Equipes participantes** (elenco por equipe e campeonato)
- **Tabela e Classificação** (jogos, rodadas, grupos, campos e critérios)
- **Disciplina**
- **Súmula**

---

## Ordem de implementação sugerida

### Etapa 1 — Base do campeonato
- criar campeonato
- listar campeonatos
- editar campeonato
- selecionar campeonato ativo

### Etapa 2 — Cadastros
- times
- atletas
- reaproveitamento de cadastro

### Etapa 3 — Estrutura esportiva
- grupos
- rodadas
- fases
- jogos

### Etapa 4 — Operação
- resultado de jogo
- cartões
- suspensões
- zeragem

### Etapa 5 — Documentação
- súmula básica
- visualização da súmula
- registro da partida finalizada

---

## Padrão visual e técnico

Este módulo deve seguir o padrão já existente no `sistema-interno`:

- cabeçalho da AEUV
- menu lateral
- submenus recolhíveis
- tela de carregamento padrão
- botões com a identidade visual atual
- permissões por perfil no servidor
- validação no backend
- navegação por módulos usando `MODULOS` e `GRUPOS`

### Persistência do cadastro de campeonatos

A lista de campeonatos, incluindo os escudos e a configuração `estrutura`, fica no arquivo
`AEUV - Campeonatos.json`, dentro da pasta configurada em `CONFIG.pastaRaizId`.
Isso evita armazenar imagens no `PropertiesService`, que limita o tamanho de
cada valor e o total de dados do script.

Se o arquivo ainda não existir, a leitura utiliza a propriedade legada
`CAMPEONATOS_LISTA`. Na primeira gravação bem-sucedida, a lista completa é
persistida no Drive e somente essa propriedade legada é removida. Os demais
cadastros e propriedades não são alterados por essa gravação.

Não exclua nem renomeie esse arquivo: ele é a fonte do cadastro após a migração.
Falhas de leitura são exibidas em vez de serem tratadas como uma lista vazia.
Editar sem selecionar um novo escudo mantém a imagem anterior.

A listagem usa cards responsivos com os mesmos controles de edição e exclusão,
respeitando as permissões existentes.

### Cadastro e forma de disputa unificados

Em **Campeonatos**, use **Novo campeonato** ou **Editar**. O formulário possui
duas seções: **Dados do campeonato** e **Forma de disputa**, com um único botão
para gravar ambas. O submenu **Grupos e Rodadas** foi removido, sem atalho.
Os cards também mostram um resumo da configuração salva.

Novos cadastros e campeonatos ainda sem configuração apresentam os valores
iniciais: fase **Classificação**, primeiro formato disponível (**Grupos corridos**),
**2** grupos, **4** vagas por grupo, **3** rodadas e sem ida e volta.
Configurações existentes são carregadas, sem substituição por esses padrões.
Mantêm-se os limites de 1–32 grupos, 2–64 vagas por grupo e 1–99 rodadas,
nome da fase com até 80 caracteres e observações com até 500 caracteres.

A fonte canônica da forma de disputa é o objeto `estrutura` dentro do registro
do campeonato em `AEUV - Campeonatos.json`. Somente quando esse objeto está
ausente, a leitura consulta a propriedade legada `CAMPEONATO_ESTRUTURA_<id>`.
JSON ou configuração inválidos produzem erro explícito, nunca valores vazios
que possam apagar a configuração. Ao editar um cadastro legado, a estrutura
é incorporada ao JSON na mesma gravação dos dados do campeonato, sob um único
lock e somente após validar ambas as seções.

As propriedades legadas de estrutura são mantidas como recuperação, inclusive
se a gravação falhar; quando existe `estrutura` no JSON, elas não são consultadas
nem atualizadas. As APIs antigas `listarGruposRodadas` e `salvarGruposRodadas`
continuam compatíveis e usam essa mesma fonte canônica, sem gravações separadas
da configuração. Chamadas antigas a `salvarCampeonato` sem o campo `estrutura`
preservam a configuração existente, inclusive a legada. A exclusão do campeonato
continua removendo sua propriedade legada de estrutura.

### Persistência da tabela e dos campos

Jogos, atribuições de grupos e critérios ficam em
`AEUV - Campeonato - <id> - Tabela.json`. O cadastro compartilhado de campos
fica em `AEUV - Campos.json`. Ambos usam documentos versionados dentro de uma
lista com um único objeto, na pasta raiz configurada no Drive. Não substitua
um documento existente por `[]`: isso é tratado como cadastro inválido, não
como uma tabela nova.

As gravações usam lock e revisão para rejeitar formulários desatualizados.
Se outra pessoa alterar a tabela, os campos ou a configuração do campeonato,
recarregue antes de salvar novamente. Fases e rodadas vazias são derivadas
da forma de disputa; não correspondem a jogos gerados automaticamente.
Excluir o campeonato envia seu arquivo de tabela para a lixeira, sem excluir
o cadastro compartilhado de campos nem o histórico permanente das inscrições.

### Persistência dos atletas e da comissão técnica

Os cadastros de pessoas usam arquivos JSON separados por campeonato, na mesma
pasta raiz do projeto (`CONFIG.pastaRaizId`):

- `AEUV - Campeonato - <id> - Atletas.json`
- `AEUV - Campeonato - <id> - Comissao Tecnica.json`

O `<id>` é o identificador do campeonato codificado com `encodeURIComponent`
(IDs UUID comuns permanecem iguais). Os nomes não dependem do nome da competição.
As fotos continuam armazenadas como Data URLs base64 no JSON, sem compartilhamento
público de arquivos nem conversão para links de imagens.

Enquanto o arquivo correspondente não existir, a leitura utiliza a propriedade
legada `CAMPEONATO_ATLETAS_<id>` ou `aeuv.comissaoTecnica.campeonato.<id>`.
A primeira gravação bem-sucedida daquele cadastro persiste a lista completa no
Drive e remove **somente** sua propriedade legada. Se a gravação falhar, a
propriedade é preservada. Arquivos existentes têm prioridade e são atualizados,
sem recriar nem apagar a lista de campeonatos ou os cadastros de outras competições.

Arquivos vazios, JSON inválido ou conteúdo que não seja uma lista produzem erro
explícito; falhas de acesso/leitura não são convertidas em cadastros vazios.
Uma lista vazia válida deve ser representada por `[]`. Não exclua nem renomeie
esses arquivos após a migração. Editar uma pessoa sem enviar nova foto preserva
a foto existente. Falhas na leitura local de uma foto são exibidas no formulário
e liberam o botão para tentar novamente.

Excluir um campeonato remove seus arquivos de atletas e comissão técnica para
a lixeira do Drive e limpa as propriedades legadas correspondentes, mantendo os
arquivos e propriedades dos demais campeonatos.

---

## Resultado esperado do MVP

Ao final da fase 1, o sistema deve permitir:

- abrir um campeonato
- cadastrar seus times
- cadastrar atletas
- organizar grupos e rodadas
- gerar jogos
- lançar resultado
- acompanhar disciplina básica
- gerar súmula simples
- operar uma competição pequena do início ao fim

---

## Observação

Este README define o escopo inicial do módulo de campeonato para o `sistema-interno`.  
Funcionalidades mais completas serão adicionadas em fases futuras.
