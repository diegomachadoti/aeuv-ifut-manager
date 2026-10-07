# Aplicativos Google Apps Script da AEUV

Este diretório reúne os aplicativos Web da AEUV desenvolvidos com Google Apps
Script (GAS): dois formulários públicos e o sistema interno da associação. O
formulário de inscrição, remoção e portabilidade produz os arquivos TXT de
solicitação que servem de entrada para a automação Python. Os projetos Web e o
processamento Python são aplicações distintas, conectadas por esses arquivos no
Google Drive.

| Aplicativo | Diretório | Para que serve |
| --- | --- | --- |
| **Inscrição, remoção e portabilidade** | `inscricao-portabilidade/` | Receber solicitações para atletas e comissão técnica, salvar comprovantes e gerar arquivos TXT. |
| **Súmula digital** | `sumula-digital/` | Registrar relatórios de arbitragem e gerar arquivos TXT e PDF. |
| **Sistema interno** | `sistema-interno/` | Área restrita da associação, com login Google e menu das funcionalidades internas. |

Cada aplicativo é um projeto GAS independente. **Não combine os arquivos das
pastas em um único projeto:** todos declaram `doGet()` e funções auxiliares com
nomes iguais.

> **Integração com Python:** após o envio, o formulário de inscrição salva o
> TXT na pasta `Arquivos TXT - Inscricoes de Atletas`. Para processamento
> automático, esse arquivo também precisa estar na pasta `Entrada` da estrutura
> do Drive configurada no `config.ini` do projeto Python. A movimentação entre
> essas pastas não é feita pelo formulário Web. O TXT da súmula digital
> (`Arquivos TXT - Sumulas Digitais`) é lido pelo comando
> `main.py --analisar-sumulas`, que gera o rascunho da Nota Oficial com base no
> regulamento. Consulte o [README da automação Python](../README.md) para configurar
> a pasta de entrada e executar o processamento.

## Conteúdo

- [Endereços publicados](#endereços-publicados)
- [Publicação e permissões](#publicação-e-permissões)
- [Inscrição, remoção e portabilidade](#inscrição-remoção-e-portabilidade)
- [Súmula digital](#súmula-digital)
- [Sistema interno](#sistema-interno)
- [Operação e manutenção](#operação-e-manutenção)

## Endereços publicados

| Aplicativo | Link de divulgação | URL da implantação (Apps Script) |
| --- | --- | --- |
| Inscrição, remoção e portabilidade | https://portal.aeuv.org/inscricao/ | `https://script.google.com/macros/s/AKfycbyP2WRKuyR9dbF4HVUFM14_p-exiNoPlQFyOlIx05_BBzcNkCR_fS7ruxXhtQ0rsnDBbg/exec` |
| Súmula digital | https://portal.aeuv.org/sumula/ | `https://script.google.com/macros/s/AKfycbyTkmXq4OU_aCO7uZazbnY2jM95pTRzAVbna8_4b2Cy2TSQfq76uUpXh46LQ47eSRtQsA/exec` |
| Sistema interno | https://portal.aeuv.org/sistema/ | `https://script.google.com/macros/s/AKfycbwKfTZWMkmv80XbwvmfNyRHltEUFGOYQ3srJz9TKODKvbL5nu5FTuB5YR7KJ_3jwF7weg/exec` |

Divulgue sempre o link de `portal.aeuv.org`, que exibe a logomarca e o nome
da associação na prévia do compartilhamento e encaminha para a implantação
correspondente. As URLs do Apps Script continuam válidas para acesso direto e
para testes. Veja [Ícone da aba e prévia do link](#ícone-da-aba-e-prévia-do-link).

O subdomínio é definido pelo arquivo `docs/CNAME` e vale para o site inteiro do
GitHub Pages — o repositório aceita **um único** domínio personalizado. Trocar o
nome do subdomínio depois exige apenas editar esse arquivo, criar o CNAME
correspondente no provedor de DNS e atualizar a tabela acima; os caminhos
`/inscricao/`, `/sumula/` e `/sistema/` permanecem iguais.

## Publicação e permissões

O sistema interno inclui um **indice privado de validacao de CPF/participacao**,
atualizado nas gravacoes sincronas e reconciliado por agenda independente de
cinco minutos. Requer o servico avancado **Drive v3** declarado no manifesto;
nao muda a identidade de execucao nem compartilhamento. Para primeira geracao,
autorizacao, limites, fallback e controles Admin, consulte
[Indice privado de validacao](sistema-interno/campeonato/README.md#indice-privado-de-validacao-cpf-e-participacao).
As agendas de tabela, participantes e Banco de Atletas permanecem independentes
e nao sao desativadas por essa manutencao.

### Elencos particionados: etapa inativa

**A integração funcional está implementada atrás de um gate, mas o cutover
de produção continua desabilitado.** O literal
`const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = false;` permanece em `WebApp.gs`.
Com `false`, RPCs, histórico, índices, importação, imagens e consumidores
esportivos continuam usando as fontes legadas. Somente fixtures VM locais
substituem esse literal por `true`; nenhuma publicação ou alteração remota
faz parte desta entrega. Não execute funções privadas manualmente no Drive
para substituir os RPCs. Permissões, validações e IDs compartilhados permanecem.

Formato preparado na pasta raiz do projeto:

```text
AEUV - Elencos - <encodeURIComponent(campeonatoId)>
  manifesto.json
  Atletas - <encodeURIComponent(equipeId)> - <revisao>.json
  Comissao Tecnica - <encodeURIComponent(equipeId)> - <revisao>.json
  snapshot - <revisaoDestino>.json
  pendencia - <revisaoDestino>.json
```

Os nomes físicos usam somente identidades permanentes, nunca nomes visíveis.
A pasta e os arquivos são criados sob demanda, sob o `ScriptLock` existente.
O manifesto `aeuv.elencos.particoes`, versão 1, contém o `campeonatoId`, a
revisão publicada e referências `{equipeId, tipo, revisao, arquivo}`.
Cada arquivo referenciado contém uma lista JSON. As consultas da camada
nova juntam somente as referências publicadas da categoria solicitada.
Sem manifesto, o elenco novo é vazio; uma referência publicada ausente,
duplicada ou inválida gera erro, não um fallback para arquivos antigos.

Na camada privada, `timeVinculado` é derivado do ID permanente no registro
global, preservando os demais campos. Renomear a equipe não troca sua
partição nem exige regravar registros. A agregação não filtra por equipes
ativas ou vinculadas ao campeonato: registros de outras equipes globais
continuam presentes. IDs sem mapeamento, IDs ambíguos, nomes ambíguos ao
resolver um destino e registros inválidos/duplicados geram erro explícito.
Sob o gate ativo, `lerElencoBrutoOperacao_` usa a agregação por ID permanente,
com cache apenas no objeto de recursos da operação. Os normalizadores e
guardas RPC existentes continuam sendo aplicados.
`prepararParticoesElencoPorNome_` converte listas
com `timeVinculado` em grupos por ID permanente e falha se algum nome estiver
ausente/ambíguo; `lerElencoParticionadoPorEquipe_` retorna os grupos publicados
por ID e confirma o mapeamento canônico. `gravarElencoComHistorico_` representa
a lista inteira da categoria, inclusive equipes esvaziadas por exclusão ou
transferência; o gravador publica apenas as diferenças, numa única revisão.

As versões são **copy-on-write**: somente as partições alteradas ganham
novos arquivos; equipes/categorias não afetadas conservam suas referências.
Antes de preparar as versões, a camada nova grava e confirma um snapshot
de recuperação de todo o estado publicado anterior. Depois de preparar
as versões, grava e confirma um journal pendente com o snapshot e o
manifesto proposto. Ambos ficam na pasta nova, são imutáveis e não são
interpretados como fontes de elenco.
O manifesto é o único ponto de publicação de uma operação, inclusive uma
transferência. Falha ao preparar a segunda partição deixa o estado anterior
inteiro visível; falha após a publicação deixa o estado novo inteiro.
Erros da própria chamada de publicação ou de seu readback exigem recarregar
antes de repetir: o resultado pode já ter sido publicado integralmente,
sem fingir rollback parcial. Versões anteriores, snapshots, journals e
arquivos preparados mas não publicados ficam
retidos e ignorados nas leituras. **Não existe remoção automática**, nem
dos arquivos antigos nem dessas versões.

**O snapshot de recuperação não substitui o histórico global de inscrições.
O journal pendente não é a fila existente de reconciliação.** O adaptador
RPC prepara o snapshot síncrono no histórico global, no formato existente,
antes da mutação. Antes de publicar o manifesto, deixa o índice dirty,
persiste `marcarHistoricoElencoPendente_` e marca as cópias esportivas pendentes.
O worker existente lê a mesma fonte escolhida pelo gate e reconcilia o
estado persistido, tanto após sucesso como após falha. Os journals continuam
sendo evidência de recuperação, não uma segunda fila.

Na tela **Administração > Histórico de inscrições**, o administrador pode
selecionar um campeonato e executar **Diagnosticar journals do campeonato**.
O diagnóstico é somente leitura: confere snapshot, partições preparadas,
manifesto ativo e a fila atual, classificando cada journal como publicado,
substituído por publicação posterior, não publicado, divergente ou inválido.
A ausência da fila atual, isoladamente, não significa erro: ela é removida
quando o worker conclui a reconciliação. Journals antigos são classificados
como substituídos somente quando a cadeia de snapshots comprova a sequência
até o manifesto ativo. Não publica versões, não reverte dados, não limpa filas
e não apaga arquivos. Divergências ou documentos inválidos exigem análise
manual; a rotina não tenta adivinhar se deve confirmar ou descartar uma operação.

**Triagem conservadora antes de qualquer cutover:**

| Resultado | Interpretação e próximo passo seguro |
| --- | --- |
| `publicado` | Esta é a revisão ativa. Se a fila atual estiver presente, processe as pendências pela ação administrativa existente. |
| `substituido` | Uma revisão posterior comprovadamente a substituiu; não repita a operação antiga. A fila informada é a fila atual do campeonato, não a fila daquela revisão. |
| `nao_publicado` | O manifesto anterior permanece ativo e sem alteração de fonte. Recarregue; repita somente a operação que ainda for necessária após conferir os dados atuais. |
| Fila atual `ausente` | Pode significar que o worker já terminou. Para validar o histórico antes do cutover, execute **Reconciliar campeonato pelo elenco atual**. |
| Fila atual `invalida`, `divergente` ou `invalido` | Interrompa alterações/cutover e preserve os documentos. Não edite nem exclua journals, snapshots ou propriedades manualmente; encaminhe para análise técnica. |

Se a listagem indicar limite de 100 journals, os resultados que dependem da
cadeia de revisões podem não estar completos. Não use um relatório truncado
para autorizar o cutover.

O fingerprint `assinaturaFontesElencoParticionado_` lê as fontes novas
vivas, inclui o formato/manifesto, o digest de cada partição publicada e
seu nome canônico no registro global. Antes de publicar, o gravador
revalida todas essas fontes, inclusive partições não alteradas. A
transferência também compara o fingerprint entre sua leitura e o início
da gravação, não só a revisão do manifesto. Fontes ausentes ou corrompidas
impedem a publicação, mesmo quando não são o alvo da alteração. Isso
detecta edições externas sem depender de metadados legados. Não é um CAS
fornecido pelo Drive: existe uma janela entre a última leitura e a chamada
de publicação para escritores externos que não usam o `ScriptLock`.
Sob o gate ativo, o índice usa payload/metadados **V2**, embora conserve seu
namespace de propriedades para permitir a substituição segura. Payloads
V1 são automaticamente recusados. Atletas/comissão usam fingerprints vivos
com identidade da pasta/manifesto, todas as partições publicadas, tipo,
estado e nomes canônicos; ausência, corrupção, remoção ou edição externa
impedem o reaproveitamento do índice anterior. A tabela mantém versão/MD5
do Drive. A consulta V2 não reutiliza verificações de um índice em memória,
mesmo sob lock. Dentro de uma operação sob lock, o fingerprint e as listas
das duas categorias reutilizam a mesma leitura validada de cada partição;
antes da publicação, as fontes são relidas para detectar alterações externas.
Após mutação do elenco, o índice fica dirty e as guardas
usam a fonte viva até o reconciliador manual/agendado reconstruí-lo.
Não há promessa de validação V2 sem leituras de blobs.

Superfícies integradas, **somente sob o gate ativo**:

| Superfície | Implementação desabilitada em produção |
| --- | --- |
| Cadastros e transferências RPC | Adição/edição/remoção e transferência por lista completa, resolução por ID permanente e publicação única. Registros particionados exigem IDs válidos; não há migração automática dos antigos. |
| Histórico global e fila | Snapshot síncrono anterior, fila persistida antes do commit e reconciliação pós-publicação pela mesma fonte. Inscrições/snapshots antigos mantêm seus IDs e dados, inclusive para importação deliberada. |
| Índice CPF/participação | V2 usa fingerprint vivo para elencos e Drive version/MD5 para tabela. Com uma base V2 íntegra, inclusão/edição/remoção/transferência atualizam incrementalmente a categoria após o manifesto; o índice fica dirty até confirmar os novos chunks e fontes. Sem base V2 confiável ou após falha, as consultas usam fallback vivo até o recálculo manual/agendado. |
| Importação e respostas | Listagens/agregadores e candidatos usam listas novas/histórico global; importação explícita passa pelas mesmas guardas e publica partições, sem copiar arquivos legados. |
| Resultados e súmulas | Leituras diretas de comissão passam pelo adaptador. `ativo` é preservado também pelos normalizadores/edições V2; inativos não entram como participantes disponíveis nem na súmula atual. Resultados históricos salvos não são regravados. |
| Imagens | Lotes mantêm assinatura e backup anterior; aceitam filtro opcional `fonte.equipeId`. Sem filtro, mantêm o contrato agregado atual. Apenas equipes alteradas recebem versões, com uma publicação por lote e histórico pela fila. Falha do backup impede a gravação. |
| Cópias esportivas | Mutações marcam pendência; os builders/workers de tabela e participantes recompõem usando a fonte do gate. Cópias anteriores permanecem imutáveis e a releitura continua exibindo a cópia pronta, conforme o contrato existente. |
| Remoção do campeonato | Exclusão lógica do registro listado, tombstone durável e fila antes da alteração. O worker fecha a presença das inscrições quando o campeonato removido tem tombstone válido. Pasta nova, versões/journals, propriedades antigas, arquivos legados e jogos/tabela são preservados; apenas o namespace do índice removido é limpo. |

Limites ainda não suportados: limpeza física das pastas/versões e consumo
automático dos journals.
Não são necessários para as leituras/gravações com gate, nem estão sendo
executados. A validação local não substitui autorização, quotas e comportamento
real dos serviços Google; ativação/publicação de produção permanece fora
desta entrega. Não há CAS contra escritores externos que ignorem o lock.

**Cutover futuro da base de testes:** a decisão é iniciar elencos atuais
vazios, sem migrar/copiar/mesclar JSONs ou Script Properties antigos.
Preservar `equipes.json`/registro global de equipes e seus IDs, jogos
existentes e histórico global de inscrições; o arquivo de tabela continua
no local atual. Com gate ativo nas fixtures, as leituras atuais usam exclusivamente a
estrutura nova; JSONs/propriedades antigos ficam ignorados, não migrados,
e permanecem preservados. **Em produção o gate continua `false` e os
consumidores ainda dependem deles: não os apague.** Nenhuma ação no Drive
remoto ou remoção local/remota foi executada para implementar esta etapa.

Repita estes passos para cada aplicativo:

1. Crie um projeto independente em [Google Apps Script](https://script.google.com/).
2. Copie `WebApp.gs` para um arquivo de script e cada `.html` da pasta para um
   arquivo HTML de mesmo nome (`Index`, e no sistema interno também `Estilos`,
   `Negado` e `Ponte`).
3. Autorize os serviços solicitados. Os projetos usam Google Sheets e Drive;
   a súmula também usa Google Docs para gerar o PDF. No sistema interno,
   copie também o `appsscript.json`: ele declara os escopos OAuth, e sem o
   escopo do Drive a leitura do controle de punições falha mesmo com as pastas
   compartilhadas.
4. Siga as instruções de preparação específicas do aplicativo.
5. Publique como **Aplicativo da Web**, escolhendo a conta executora e o público
   autorizado de acordo com a tabela abaixo.
6. Após qualquer alteração, publique uma nova versão e compartilhe a URL da
   implantação atualizada.

| Aplicativo | Executar como | Quem tem acesso |
| --- | --- | --- |
| Inscrição, remoção e portabilidade | Eu (dono do projeto) | Qualquer pessoa |
| Súmula digital | Eu (dono do projeto) | Qualquer pessoa |
| Sistema interno | **Usuário que acessa o app da web** | **Qualquer pessoa com Conta do Google** |

A combinação do sistema interno não é opcional: só o modo "Usuário que acessa"
entrega o e-mail de quem abriu a página, e é esse e-mail que o servidor compara
com a lista de autorizados. Publicado como "Eu", o sistema não identifica
ninguém e bloqueia todo mundo.

Os três aplicativos permitem incorporação em outras páginas
(`XFrameOptionsMode.ALLOWALL`), recurso usado pelas páginas do domínio da
associação. A conta executora precisa manter acesso às planilhas, pastas e
imagens utilizadas.

### Ícone da aba e prévia do link

Os três projetos definem o ícone da aba do navegador pela chave `faviconUrl`,
aplicada com `setFaviconUrl()` no `doGet()`. A URL precisa ser pública e
terminar na extensão da imagem; links do Drive (`thumbnail?id=...`) não
funcionam nesse campo. Por padrão a chave aponta para `assets/logo-aeuv.png`
deste repositório. Uma tag `<link rel="icon">` escrita direto no `Index.html` é
ignorada pelo Apps Script.

Já a prévia exibida ao compartilhar o link (WhatsApp, Instagram e afins) vem das
tags Open Graph da página, e o Apps Script não permite incluí-las: o formulário é
servido dentro de uma página do Google e `addMetaTag()` só aceita tags como
`viewport`. Para contornar isso, a pasta `docs/` deste repositório traz três
páginas de entrada com as tags `og:image` e `og:title` da associação:

- `docs/inscricao/index.html`
- `docs/sumula/index.html`
- `docs/sistema/index.html`

Essas páginas já estão publicadas no GitHub Pages (pasta `docs/` do branch
`master`) e respondem no domínio da associação, conforme a tabela de
[endereços publicados](#endereços-publicados).

As duas páginas dos **formulários** abrem o aplicativo em um `iframe` que ocupa
a tela inteira e começa a carregar junto com a página, escondido atrás de uma
tela de carregamento com a logomarca da AEUV. Enquanto espera, a tela mostra um
anel girando ao redor da logomarca, uma barra de progresso e o nome da etapa em
andamento ("Conectando ao servidor", "Carregando o aplicativo", "Montando os
campos do formulário" e "Quase pronto"). A barra avança desacelerando até 98% ao
longo de 20 segundos, que é o tempo típico do Apps Script, e só completa quando o
formulário fica de fato pronto; então a tela de carregamento desaparece em
transição suave. Assim o usuário vê uma única espera, e não o encadeamento de
duas páginas em branco do redirecionamento. O endereço na barra continua sendo o
da associação. Não há limite de tempo nem atalho alternativo: a página aguarda o
carregamento terminar normalmente, mesmo que o Apps Script demore mais que o
previsto.

A página do **sistema interno** usa o mesmo `iframe`, mas com uma diferença: a
tela de login do Google envia `X-Frame-Options` e se recusa a aparecer dentro de
um quadro. Para contornar isso, a página embute o sistema com `?origem=portal` e
espera um aviso de que ele realmente abriu — o próprio aplicativo envia
`postMessage({ aeuv: 'sistema-pronto' })` ao topo da janela, pelo arquivo
`Ponte.html`. Chegando o aviso, o quadro aparece e o endereço continua sendo o da
associação. Se o aviso não chegar em 9 segundos, sinal de que o visitante ainda
não entrou na Conta Google: aí a página navega na própria aba para
`?origem=direto`, para que a tela de login apareça normalmente. Esse parâmetro
também evita o vaivém, porque o sistema só devolve a navegação ao portal quando
`origem` vem vazio, ou seja, quando alguém abriu a URL do Apps Script
diretamente. A barra de progresso aqui é indeterminada, já que o tempo depende da
sessão do Google, e a página traz `robots: noindex, nofollow` por ser área
restrita.

Pontos de manutenção:

- A URL `/exec` de cada aplicativo fica na constante `URL_FORMULARIO` (páginas
  dos formulários) ou `URL_SISTEMA` (página do sistema interno). Publicar uma
  **nova versão** da mesma implantação mantém a URL; criar uma **nova
  implantação** gera outra URL e exige atualizar a página.
- O tempo estimado usado pela barra de progresso fica na constante
  `DURACAO_ESTIMADA`, em milissegundos. Ele só controla a animação: a tela de
  carregamento some pelo evento `load` do `iframe`, não pelo relógio.
- No sistema interno o equivalente é `LIMITE_QUADRO`: o prazo de espera pelo
  aviso antes de cair para a navegação na própria aba.
- O `iframe` depende de `XFrameOptionsMode.ALLOWALL` no `doGet()` dos três
  aplicativos. Nos formulários depende ainda de a implantação estar publicada
  para acesso sem login; no sistema interno, do include `<?!= include_('Ponte')
  ?>` nas telas `Index` e `Negado`, que é quem envia o aviso.
- As animações são desligadas automaticamente para quem usa a preferência de
  redução de movimento do sistema.
- **Prevenção de cache em atualizações (TTL / Cache Busting):** as páginas de
  entrada em `docs/` e os arquivos `Index.html` dos três aplicativos contêm
  cabeçalhos meta anti-cache (`Cache-Control: no-cache, no-store, must-revalidate`,
  `Pragma: no-cache` e `Expires: 0`). Adicionalmente, as páginas de entrada embutem
  o `iframe` com o parâmetro de cache busting `?_v=` + timestamp atual, forçando o
  navegador do usuário a sempre carregar a versão mais recente do Apps Script
  imediatamente após a publicação de uma nova versão.
- O arquivo `docs/CNAME` fixa o domínio `portal.aeuv.org`. Ele corresponde
  a um registro CNAME no DNS do domínio apontando para `diegomachadoti.github.io`
  e não interfere no site da associação, que continua no Wix.
- **Para trocar o subdomínio:** crie o novo registro CNAME no provedor de DNS e
  espere ele resolver; só então altere o campo *Custom domain* em
  **Settings → Pages** do repositório, que reescreve o `docs/CNAME`. Atualize
  também a tabela de endereços acima e as URLs dos módulos em `MODULOS`
  (`sistema-interno/WebApp.gs`). O GitHub Pages responde por **um único**
  domínio: assim que o novo entra no ar, o anterior passa a devolver 404, sem
  redirecionamento. Avise quem já tinha o link antigo salvo.

> **Privacidade:** os formulários coletam dados pessoais, incluindo CPF,
> documento do árbitro e comprovantes de pagamento. Restrinja o acesso aos
> aplicativos e aos arquivos gerados ao necessário para a operação. A opção de
> publicar um formulário para acesso público não torna automaticamente seguros
> ou públicos os arquivos associados.

## Pastas no Drive

Todas as pastas e planilhas usadas pelos três aplicativos ficam agrupadas sob a
pasta raiz **`AEUV - Automação`**, no Drive da associação, junto com o material
da automação em Python. A lista completa está em
[Organização do Drive](../README.md#organização-do-drive), no README principal.

| Nome da pasta | Usada por |
| --- | --- |
| `Arquivos TXT - Sumulas Digitais` | Súmula digital (TXT) e sistema interno (punições) |
| `PDF - Sumulas Digitais` | Súmula digital |
| `Anexos - Sumulas Digitais` | Súmula digital |
| `Arquivos TXT - Inscricoes de Atletas` | Inscrição, remoção e portabilidade e sistema interno (solicitações) |
| `Comprovantes PIX - Inscricoes de Atletas` | Inscrição, remoção e portabilidade |
| `Documentos - Associados` | Sistema interno (cadastro de associados) |

Os nomes são procurados **pelo nome exato**, gravado em `CONFIG` de cada
projeto. Duas consequências práticas:

- **Não renomeie nem mova o conteúdo entre pastas.** Mover a pasta inteira é
  seguro (o nome e o ID não mudam); renomeá-la sem atualizar o `CONFIG` e
  republicar não é.
- **Não crie outra pasta com o mesmo nome.** A busca do `DriveApp` varre o Drive
  inteiro, e o aplicativo fica com a primeira que encontrar.

Quando não acha a pasta, o aplicativo **cria uma nova na raiz do Meu Drive** em
vez de falhar — nenhum envio se perde, mas o arquivo vai parar fora do lugar
sem aviso. Se surgir uma dessas pastas soltas na raiz, mova o conteúdo de volta
para a pasta original e apague a duplicata.

## Inscrição, remoção e portabilidade

### O que o formulário recebe

Cada envio reúne os dados gerais — competição, equipe, responsável e
telefone/WhatsApp — e inclui de 1 a 30 pessoas. Para cada pessoa, seleciona-se:

| Campo | Regras |
| --- | --- |
| Ação | Inclusão, remoção ou portabilidade |
| Tipo | Atleta ou comissão técnica |
| Nome completo | Obrigatório para todas as ações |
| Nascimento e CPF | Obrigatórios na inclusão; opcionais nas demais ações. Nascimento é digitado com máscara `dd/mm/aaaa` e enviado ao servidor como `aaaa-mm-dd`; no TXT sai `dd-mm-aaaa` |
| Competição anterior | Obrigatória na portabilidade |

O envio também exige um comprovante Pix e a confirmação de pagamento, do termo
médico, do regulamento e da autorização para fornecer os dados. Esses requisitos
valem para todas as ações.

**Competições disponíveis:** Copa America, Super Liga União, Copa Metropolitana
e Copa Premier. O formulário inicia com Super Liga União selecionada.

**Competições anteriores para portabilidade:** Copa Metropolitana; 4° Super
Liga União 99 Bet 2023; 2° Copa Metropolitana 2023; Recopa 2023; Super Liga
União 2024; 4º Copa Metropolitana 2025; 6º Super Liga União 2025; 5º Copa
Metropolitana; 3º Copa Premier 2026; 2º Copa America 2026; 7º Super Liga União
2026.

**Equipes configuradas:** AJAX, BEATS, BOCA JRS, CRUZMALTINO, INTEGRAÇÃO,
KADOSH, LEÕES DO MORUMBI, ONZE GAROTOS, PEQUIS, RIVER,
TRANSNANE/BRASILIENSE, TRK, UNIÃO, UNIAO SANTA MARIA, OLHOS DÁGUA, VENUS,
FUT ART e REAL PREDADOR.

### Validações e limites

O navegador oferece máscaras de telefone e CPF e valida os campos antes do
envio. O servidor repete as validações: verifica competição e equipe, exige
telefone com DDD e 11 dígitos, valida datas de nascimento entre 01/01/1900 e
hoje e exige CPF de 11 dígitos para inclusão. Se CPF ou nascimento forem
informados em remoção ou portabilidade, também são validados.

O comprovante pode ser PDF, JPG/JPEG, PNG ou WEBP e deve ter até 5 MB. A
declaração de pagamento é armazenada, mas o aplicativo **não verifica a
transação Pix**. A validação do CPF considera somente a quantidade de dígitos,
não os dígitos verificadores.

### Preparação do aplicativo

Antes da publicação, confira `WEBAPP_CONFIG` em `WebApp.gs`:

| Configuração | Uso |
| --- | --- |
| `spreadsheetId`, `spreadsheetName`, `sheetName` | Planilha de respostas e aba `Inscricoes_Web` |
| `competicoes`, `competicoesPortabilidade`, `equipes` | Opções aceitas pelo servidor; mantenha-as alinhadas ao HTML |
| `cnpjPix`, `regulamentoUrl` | Informações exibidas no formulário |
| `valorPorAtleta` | Está definido, mas não é exibido nem usado para calcular ou validar o pagamento |
| `pastaComprovantes`, `pastaArquivosTxt` | Nomes das pastas de arquivos no Drive |
| `maxPessoas`, `maxArquivoBytes` | Limites de registros e do comprovante |

Execute `prepararAplicativo()` uma vez pelo editor, usando a conta proprietária.
A função solicita permissões, localiza ou cria a planilha, localiza ou cria as
pastas de comprovantes e TXT, grava os IDs nas propriedades do script e prepara
a aba `Inscricoes_Web`.

Se a planilha indicada não puder ser aberta, a rotina procura outra com o nome
configurado; se não encontrar, cria uma nova. Confirme a planilha, os IDs e as
permissões resultantes antes de publicar.

### Processamento de um envio

1. O servidor valida os dados e adquire um bloqueio de script para coordenar
   envios simultâneos.
2. Gera um protocolo no formato `AAAAMMDD-XXXXXXXX`, salva o comprovante e
   cria o TXT no Drive.
3. Acrescenta uma linha por pessoa à aba `Inscricoes_Web`.
4. Retorna o protocolo e o conteúdo do TXT. A confirmação mostra o protocolo,
   a quantidade de pessoas registradas e o botão **Baixar resultado em TXT**.
   O carregamento padrão da AEUV permanece visível enquanto o envio é
   processado; o TXT é baixado quando a pessoa clica no botão.

O comprovante recebe um nome iniciado pelo protocolo. O TXT inclui os dados
gerais, as confirmações e um bloco `REGISTRO` por pessoa, com ação, tipo, nome,
nascimento, CPF e competição anterior. Campos não aplicáveis aparecem como
`NAO NECESSARIO`; o nome do arquivo contém equipe e data/hora.

**Colunas de `Inscricoes_Web` (19):** data/hora, protocolo, competição, equipe,
responsável, telefone/WhatsApp, número do registro, ação, tipo, nome completo,
nascimento, CPF, competição anterior, URL do comprovante, pagamento, termo
médico, regulamento, autorização e URL do TXT. O CPF é salvo apenas com
dígitos. Pessoas do mesmo envio compartilham protocolo, data/hora e comprovante.

| Arquivo ou registro | Destino |
| --- | --- |
| Comprovantes Pix | `Comprovantes PIX - Inscricoes de Atletas` |
| TXT gerado | `Arquivos TXT - Inscricoes de Atletas` |
| Respostas | Planilha configurada, aba `Inscricoes_Web` |

Os IDs das pastas ficam nas propriedades do script. Se um ID não estiver
configurado ou não puder ser usado, o aplicativo procura uma pasta com o nome
definido e, se necessário, cria uma.

## Súmula digital

### O que o formulário recebe

O formulário registra árbitro e documento; os dois times da partida, data e
horário; relato dos fatos; envolvidos opcionais; anexos opcionais; assinatura
desenhada e declaração de responsabilidade.

A assinatura é desenhada no próprio canvas, com mouse no computador ou com o
dedo no celular e no tablet. O campo se redimensiona ao tamanho real da tela e à
densidade do aparelho, de modo que o traço sai na mesma espessura em qualquer
dispositivo, e o desenho é preservado ao girar a tela. Enquanto o árbitro assina,
a rolagem da página fica bloqueada sobre o campo. Navegadores sem suporte a
eventos de ponteiro usam automaticamente os eventos de toque e de mouse.

Árbitro, documento, times, data, horário, relato, assinatura e confirmação são
obrigatórios. Os times devem ser diferentes. A interface informa o prazo de até
24 horas após a partida, mas o servidor não verifica esse prazo nem rejeita uma
data futura.

Data e horário usam o formato brasileiro, com máscara automática:
`dd/mm/aaaa` e `hh:mm` (24 horas), independentemente do idioma do navegador.
Datas ou horários inválidos (ex.: 31/02, 24:00) são rejeitados. No envio, a
data é convertida para `aaaa-mm-dd`, formato gravado na planilha e no TXT
(usado pela análise Python).

**Equipes configuradas:** AJAX, BEATS, BOCA JRS, CRUZMALTINO, INTEGRAÇÃO,
KADOSH, LEÕES DO MORUMBI, ONZE GAROTOS, PEQUIS, RIVER,
TRANSNANE/BRASILIENSE, TRK, UNIÃO, UNIAO SANTA MARIA, OLHOS DÁGUA, VENUS,
FUT ART e REAL PREDADOR.

É possível incluir até 30 envolvidos. A equipe de cada envolvido só pode ser
um dos dois times selecionados no cabeçalho da partida; ao trocar um time, as
opções são atualizadas e seleções inválidas são limpas. A tabela pode ficar vazia; porém, ao
preencher qualquer campo de uma linha, equipe, tipo (`Atleta` ou `Comissão`),
nome completo e número da camisa tornam-se obrigatórios. O número da camisa
deve estar entre 0 e 99. Para o tipo `Comissão`, a camisa fica marcada como
"Não necessário" e é gravada em branco. Linhas completamente vazias são ignoradas e não são
incluídas no TXT, PDF ou aba de envolvidos.

O seletor de anexos aceita PDF, JPG/JPEG e PNG. Eles são enviados em base64 e
salvos no Drive. **O código não define limite de tamanho nem de quantidade de
anexos no servidor.** O PDF lista os nomes dos arquivos e traz um link para a
pasta de evidências no Drive; os arquivos não são incorporados ao documento.

### Configuração e processamento

O ID da planilha está em `CONFIG.spreadsheetId`, em `WebApp.gs`. Não há uma
rotina de preparação obrigatória: a conta executora precisa ter acesso de
edição à planilha, e as abas e pastas são criadas sob demanda. O logo também
precisa estar acessível a essa conta.

Ao receber um envio válido, `salvarSumula()`:

1. Adquire um bloqueio de script e gera um protocolo no formato
   `SUM-AAAAMMDD-XXXXXXXX`.
2. Salva anexos, quando existirem, em uma subpasta identificada pelo protocolo.
3. Cria um Google Doc temporário, converte-o para PDF, salva
   `SUMULA_<protocolo>.pdf` e envia o documento temporário para a lixeira.
4. Gera `SUMULA_<protocolo>.txt`, com o link do PDF oficial na seção final
   `SÚMULA OFICIAL (PDF)`.
5. Registra a súmula e os envolvidos nas abas da planilha.
6. Retorna o protocolo, o TXT para download local e a URL do PDF. Na conclusão,
   a tela oferece o botão **Abrir PDF da súmula**; durante a gravação e a geração
   dos arquivos, exibe o carregamento padrão da AEUV.

| Conteúdo | Destino |
| --- | --- |
| TXT | `Arquivos TXT - Sumulas Digitais` |
| PDF | `PDF - Sumulas Digitais` |
| Anexos | `Anexos - Sumulas Digitais/SUMULA_<protocolo>` |
| Dados principais | Aba `SUMULAS_DIGITAIS` |
| Envolvidos | Aba `SUMULA_ENVOLVIDOS` |

> [!TIP]
> Para testar só o layout do PDF, execute `testarGeracaoPdf` no editor do Apps
> Script. A função monta o mesmo payload enviado pelo formulário, passa pela
> mesma validação (`validarDados_`), salva `SUMULA_TESTE-<data-hora>.pdf` na
> pasta de PDFs e mostra a URL no log. Ela não grava na planilha, não gera TXT
> e não salva anexos.

As pastas são procuradas pelo nome no Drive da conta executora e criadas se não
existirem.

**Dados gravados em `SUMULAS_DIGITAIS` (16 colunas):** data de envio, protocolo,
árbitro, documento, time 1, time 2, data da partida, horário, relato,
confirmação, URL do TXT, URL do PDF, URL da pasta de anexos, quantidade de
anexos, quantidade de itens de envolvidos e status.

**Dados gravados em `SUMULA_ENVOLVIDOS`:** protocolo, equipe, tipo, nome
completo e número da camisa, uma linha para cada envolvido preenchido e
validado.

### Atenção aos cabeçalhos da planilha

Há uma diferença entre os cabeçalhos criados e os dados gravados: na
inicialização, `criarEstrutura_()` cria apenas 10 cabeçalhos em
`SUMULAS_DIGITAIS`, enquanto `salvarSumula()` grava 16 valores. Portanto, as
seis últimas colunas não têm cabeçalho nessa criação.

A função auxiliar `criarPlanilhaSumula()` cria uma estrutura diferente e usa a
aba `ENVOLVIDOS`; o fluxo normal, porém, usa `SUMULA_ENVOLVIDOS`. Essa função
auxiliar não altera `CONFIG.spreadsheetId` e não é necessária na implantação.
Antes de usar a planilha em relatórios, alinhe os cabeçalhos com as 16 posições
gravadas e confirme o nome da aba de envolvidos.

## Sistema interno

Área restrita da associação, publicada em
[portal.aeuv.org/sistema/](https://portal.aeuv.org/sistema/). Reúne em
um só lugar as funcionalidades internas da AEUV, com menu lateral e controle de
acesso por Conta Google.

Os campos de data do sistema interno usam **DD/MM/AAAA**, inclusive nos
cadastros de atletas, comissão técnica e associados, campeonatos, jogos, atas
e financeiro. A digitação e a colagem recebem uma máscara numérica; datas
inexistentes, como 31/02, são rejeitadas. O horário dos jogos usa **HH:mm no
formato de 24 horas** (por exemplo, 15:30), sem AM/PM. Esses formatos de tela
não alteram os contratos de gravação nem as regras do servidor: as datas
continuam sendo enviadas em ISO onde já eram ISO, e o financeiro mantém seu
formato brasileiro. Os calendários auxiliares dos filtros financeiros
continuam disponíveis.

### Arquivos do projeto

| Arquivo | Conteúdo |
| --- | --- |
| `WebApp.gs` | Identificação do usuário, lista de autorizados, registro de módulos e `doGet()`. |
| `Index.html` | Tela do sistema: cabeçalho, menu e área de conteúdo. |
| `Negado.html` | Tela exibida a quem não está autorizado. |
| `Estilos.html` | CSS da identidade visual, compartilhado pelas duas telas. |
| `Ponte.html` | Script que conversa com `portal.aeuv.org/sistema/`: avisa que o sistema abriu ou devolve a navegação ao domínio da associação. |
| `appsscript.json` | Manifesto: fuso horário, escopos OAuth e modo de implantação do app da web. |

### Como o acesso é controlado

O servidor lê o e-mail de quem abriu a página com
`Session.getActiveUser().getEmail()` e compara com a lista de autorizados. Quem
não está na lista recebe `Negado.html` e nunca chega ao conteúdo — a verificação
acontece no servidor, antes de qualquer HTML do sistema ser gerado.

A lista de autorizados fica nas **propriedades do script**, na chave
`USUARIOS_AUTORIZADOS`, e cai para a constante `USUARIOS_PADRAO` do código
enquanto a propriedade não existir. Cada item tem `email`, `nome` e `perfil`.

Para conceder, alterar ou revogar um acesso, use a tela **Usuários do sistema**,
visível apenas para o perfil `admin`. A mudança passa a valer na hora, **sem
publicar nova versão** — quem estiver com o sistema aberto vê o novo perfil ao
recarregar a página. O servidor recusa:

- e-mail fora do formato `nome@dominio.com`;
- e-mail que já está na lista;
- perfil que não existe em `PERFIS`;
- qualquer alteração que deixe o sistema sem nenhum administrador;
- o administrador rebaixando ou removendo **a si mesmo** — sempre há outra
  pessoa capaz de desfazer um engano.

No editor do Apps Script ficam duas funções de socorro, para quando ninguém mais
conseguir entrar: `definirUsuariosAutorizados()` regrava `USUARIOS_PADRAO` por
cima da propriedade, e `restaurarUsuariosPadrao()` apaga a propriedade e devolve
o controle à lista do código.

As propriedades do script foram escolhidas de propósito no lugar de uma aba de
planilha: como o aplicativo roda com a permissão de quem acessa, ler uma
planilha exigiria compartilhá-la com todos — inclusive com quem ainda não tem
acesso liberado.

Perfis disponíveis:

| Perfil | Enxerga |
| --- | --- |
| `admin` | Tudo, inclusive conceder e revogar acesso. |
| `diretoria` | Tudo, menos a tela de acessos. |
| `arbitragem` | Início, súmula digital e regulamentos. |
| `associado` | Início, inscrição e portabilidade, regulamentos e associados. |

A única diferença entre `admin` e `diretoria` é a tela de acessos: quem dirige a
associação precisa operar o sistema inteiro, mas distribuir permissão é ato de
outra natureza e fica com quem administra.

Perfil desconhecido é tratado como `associado`, o de menor alcance: um perfil
renomeado nunca vira acesso a mais. A função `diagnosticarAcesso()` registra no
log o e-mail lido e o resultado da verificação; use-a quando a implantação
parecer bloquear alguém indevidamente.

#### O associado só enxerga a própria equipe

O perfil `associado` é o único que **exige uma equipe** no momento de conceder o
acesso — o formulário mostra o campo e o servidor recusa o registro sem ele ou
com equipe fora de `ASSOCIADOS_EQUIPES`. A equipe fica gravada no próprio
registro do usuário, e não é deduzida pelo e-mail do representante: o e-mail de
login costuma ser outro.

Com isso, `listarAssociados()` devolve a esse perfil **apenas o cadastro da
equipe dele**. A tela abre direto no formulário da equipe, sem lista, busca nem
filtro, e o endereço da planilha não é enviado a quem não pode editar.

> **Não compartilhe a planilha geral com associados.** A implantação roda como
> `USER_ACCESSING`: quem recebe leitura da planilha pode abri-la direto no Drive
> e ver todas as equipes. Para a consulta do associado, o servidor lê apenas a
> cópia do cadastro da equipe vinculada à conta, publicada nas propriedades do
> script, sem abrir a planilha geral. A administração deve executar
> `publicarCadastrosAssociados()` uma vez pelo editor (depois de
> `prepararAssociados()`) para publicar os cadastros já existentes. Ao salvar
> pelo sistema, a cópia da equipe é atualizada automaticamente; após editar a
> planilha diretamente, execute a publicação novamente. Não compartilhe
> também a pasta raiz: para consultar anexos, compartilhe **somente a subpasta
> de documentos da própria equipe**, como Leitor, com o e-mail associado.

### Módulos

O menu é montado a partir da constante `MODULOS` do `WebApp.gs`, e o servidor
envia ao navegador **apenas** os módulos liberados para o perfil de quem entrou.
Cada módulo declara `id`, `nome`, `icone`, `tipo`, `descricao` e `perfis`, e
pode declarar `grupo` para entrar num submenu.

| Tipo | Comportamento |
| --- | --- |
| `painel` | Tela inicial, com saudação e atalhos para os demais módulos. |
| `link` | Abre um endereço externo em nova aba (usado pelos dois formulários). |
| `usuarios` | Acessos do sistema: lista, concede, edita e revoga. `listarUsuarios()`, `salvarUsuario()` e `removerUsuario()`. |
| `punicoes` | Controle de punições; busca os dados com `listarPunicoes()`. |
| `solicitacoes` | Solicitações de Inscrições; busca os dados com `listarSolicitacoes()`. |
| `sumulas` | Súmulas Enviadas; busca os dados com `listarSumulas()`. |
| `notas` | Notas oficiais; busca os dados com `listarNotas()`. |
| `regulamentos` | Regulamentos; busca os dados com `listarRegulamentos()`. |
| `financeiro` | Financeiro e Prestação de Contas; controle de entradas/saídas, anexos e relatórios oficiais em PDF com `listarFinanceiro()` e `salvarLancamentoFinanceiro()`. |
| `atas` | Atas de reuniões da associação ou campeonato; usa `listarAtas()`, `salvarAta()`, `exportarAtaPdf()` e `excluirAta()`. |
| `associados` | Cadastro de associados; usa `listarAssociados()` e `salvarAssociado()`. |
| `equipes` | Equipes participantes; usa `listarEquipes()`, `salvarEquipe()` e `removerEquipe()`. |
| `atletas` | Banco de Dados de Atletas; busca os dados com `listarAtletas()` (somente admin/diretoria). |
| `breve` | Funcionalidade já prevista, exibida com o aviso "em desenvolvimento". |

Módulos publicados hoje: Início, Formulários (Súmula digital e Inscrição e
portabilidade), Solicitações de Inscrições, Súmulas Enviadas, Notas oficiais,
Regulamentos, Controle de punições, Financeiro e Prestação de Contas, Atas de reuniões, Associados,
Banco de Dados de Atletas e Usuários do sistema.

#### Banco de Dados de Atletas

Consulta somente leitura (admin/diretoria; a permissão é verificada antes de
qualquer leitura). `listarAtletas()` lê **somente o snapshot pronto**, nunca
as fontes nem a reconciliação do histórico. O construtor interno
`construirBancoAtletas_()`, usado no recálculo manual/programado, reúne:

- **todos os atletas dos elencos de todos os campeonatos**, inclusive cadastros
  inativos, sem equipe informada ou de equipes fora da lista atual de associadas;
- **inscrições anteriores** guardadas no histórico permanente
  (`AEUV - Historico de Inscricoes.json`): atletas removidos do elenco, que
  trocaram de equipe ou de competição, ou de campeonatos excluídos;
- as fontes legadas já existentes (solicitações, punições e súmulas enviadas),
  com os mesmos recortes de leitura e avisos de "mais recentes de".

Comissão técnica dos elencos não entra como atleta. Pessoas com o mesmo CPF
válido viram um único atleta com vários vínculos; sem CPF válido, cada cadastro
de elenco (campeonato + ID do cadastro) fica separado. Nomes nunca unem CPFs
diferentes. Punições e súmulas continuam associadas por nome + equipe apenas
quando há um único candidato.

A lista mostra situação, equipe/competição atuais e contagem de vínculos.
Clicar na linha (ou no botão do nome, por teclado) expande o **histórico de
vínculos em elencos**, mais recente primeiro: situação (inscrição atual,
atual inativa, vínculo anterior ou competição excluída), competição com
temporada e status, equipe com nome registrado/original quando renomeada,
camisa/posição e a data de entrada no histórico. Essa data não é a data real
de entrada no elenco para inscrições já existentes quando o histórico foi
ativado; datas de transferência não são deduzidas. O detalhe também lista as
solicitações, punições e súmulas do atleta. Filtros: busca por nome, apelido
ou CPF, equipe, competição e tipo de vínculo. A lista mostra CPF mascarado;
o completo aparece só no detalhe. Fotos e RG não saem do servidor.

A tabela usa **paginação local**, inicialmente 25 atletas por página, com
opção de 50 e navegação Anterior/Próxima indicando página e intervalo.
Todos os filtros e indicadores consideram o conjunto carregado inteiro,
antes do recorte da página; nenhum filtro se limita aos atletas visíveis.
Trocar filtros ou atualizar reinicia na primeira página. Detalhes abertos
ficam associados ao atleta original ao navegar ou filtrar, mas só são
renderizados quando o atleta está na página visível; atualizar os fecha.
Paginar, filtrar e expandir não fazem RPC adicional nem nova consolidação.
**Atualizar** relê a cópia pronta, sem recalcular; a busca recebida de outro módulo continua
aplicada após carregar os dados.

O **recálculo**, não a abertura da tela, reconcilia o histórico permanente sob o ScriptLock (o mesmo
processo das importações de elenco, podendo gravar o histórico e IDs
legados) e libera o lock antes de ler as fontes legadas. Falhas de leitura
são exibidas como erro, sem publicar uma lista parcial. **Recalcular agora**
refaz todas as fontes atuais e publica a cópia completa; admin/diretoria
podem acioná-lo, com nova verificação de permissão no servidor. A ação longa
tem aviso próprio, impede repetição/navegação durante a execução e, no sucesso,
relê a cópia publicada e reinicia paginação/detalhes.

A tela informa **última atualização**, agendamento registrado, estimativa
aproximada de próxima tentativa, recálculo em andamento e último erro
sanitizado. A estimativa não é um horário garantido; se vencida há um aviso
para conferir gatilhos/permissões/quotas. Sem snapshot, exibe mensagem explícita
e o botão para primeira geração. Snapshot corrompido/incompleto é erro com
possibilidade de recálculo, não uma lista vazia nem fallback silencioso às fontes.
Se o recálculo falhar, a cópia anterior conserva o timestamp e o erro original
é propagado (inclusive nas Execuções do gatilho); não há sucesso parcial.

Este é um **modelo de leitura compartilhado somente por admin/diretoria**,
que aceita dados defasados. Não valida transações: inscrição, edição, remoção,
transferência, punições e demais endpoints continuam usando seus dados atuais,
locks e guardas existentes, **nunca este snapshot**. Não há polling automático
da tela nem atualização automática do navegador após um gatilho.

##### Ativação do snapshot programado de atletas

1. Atualizar **Index.html e WebApp.gs juntos** no projeto Sistema Interno,
   gerar nova versão da implantação existente, mantendo execução como
   **usuário que acessa**. Autorizar os novos escopos de gatilhos quando solicitado.
2. Entrar como admin (ou diretoria), abrir **Banco de Dados de Atletas** e usar
   **Recalcular agora** para a primeira geração. Conferir o timestamp da cópia
   pronta antes de considerá-la disponível.
3. Entrar como **admin responsável**, com acesso às pastas de todas as fontes
   e à raiz privada do projeto, abrir **Administração** e clicar
   **Configurar agendamento**. Alternativa no editor, com a mesma conta
   admin: executar `configurarAgendamentoBancoAtletas()` uma vez e autorizar.
   Configurar não gera a primeira cópia; não é executado automaticamente ao publicar.
4. Nas **Execuções/Gatilhos** do Apps Script, conferir
   `atualizarBancoAtletasAgendado`, definir/conferir o intervalo desejado e
   acompanhar seu primeiro sucesso. A interface informa se o agendamento está
   registrado, mas não consegue detectar alterações de intervalo feitas no editor.
   O botão reutiliza o gatilho registrado; se precisar criar um novo, confira
   novamente a frequência em **Acionadores**. Execuções estão sujeitas a quotas
   de Drive, tempo de execução e tempo diário de gatilhos da conta criadora.
   Uma consolidação que ultrapasse o limite de execução não substitui a cópia pronta.

Configurar novamente reutiliza o gatilho registrado da própria conta e remove
apenas duplicatas próprias desse handler de relógio. Não toca gatilhos de outros
handlers/eventos/usuários. **Desativar meu agendamento** é admin-only e exige
a mesma conta responsável. O Apps Script só permite enxergar os gatilhos do
usuário atual: o status compartilhado mostra a configuração registrada, não
garante a presença de um gatilho que outra pessoa apagou no editor. Se o dono
apagou o gatilho, configurar novamente com essa conta recria-o. Antes de revogar
o acesso do dono, desativar por essa conta; não há tomada automática de gatilhos
alheios. Se a conta ficou indisponível, a troca de responsável exige intervenção
deliberada do administrador do projeto nas propriedades/gatilhos, não este botão.
Cada disparo valida novamente a conta efetiva do criador e seu perfil admin;
a ausência de sessão ativa usa o fallback efetivo já existente na identificação.
Conta revogada/rebaixada, dono diferente ou UID não registrado são rejeitados,
sem acesso às fontes. Se o gatilho for removido e recriado diretamente no editor,
os disparos só serão aceitos quando o UID corresponder a um acionador CLOCK ativo
do mesmo handler e pertencente à conta responsável. **Configurar agendamento**
reutiliza esse acionador existente, sincroniza seu UID e remove duplicatas próprias,
sem substituir a frequência configurada no editor. Confira a falha nas Execuções
se nenhum acionador correspondente estiver ativo.

O JSON versionado contém `schema: 1`, `generatedAt` ISO e o mesmo contrato
consolidado (`registros`, `total`, `fontes`, contagens e detalhes/recortes legados).
É gravado como arquivo **imutável** `AEUV - Banco de Atletas - <UUID>.json`
na raiz privada já usada pelo projeto, com CPF completo e as mesmas permissões
dos dados existentes; não mudar para compartilhamento público nem expor URLs
do snapshot. Um único ponteiro nas Script Properties é trocado sob lock apenas
após escrita e releitura validadas; o arquivo anterior nunca é sobrescrito.
Normalmente ficam a versão atual e a anterior; somente o ID obsoleto conhecido
é enviado à lixeira após publicar. Falhas de limpeza não anulam a publicação
e geram aviso técnico sanitizado; interrupção/quotas podem deixar órfãos,
que exigem limpeza administrativa preservando os IDs `currentId`/`previousId`
da propriedade `BANCO_ATLETAS_SNAPSHOT_V1`. A lixeira também consome espaço
até ser esvaziada pela manutenção habitual do Drive.

O recálculo usa lease persistida de UUID por dez minutos, adquirida/publicada
com ScriptLock curto; libera-o **antes** da consolidação, evitando deadlock com
o lock de histórico. Expiração permite recuperação após interrupção; uma
execução antiga não publica nem remove a lease de outra. Metadados de estado
e agenda ficam separados do JSON; último erro persistido é genérico, sem
nomes/CPF/conteúdo. Não há cache de dados de negócio entre usuários.

Campeonatos, equipes e listas de elenco já lidos na reconciliação são
reutilizados **somente nessa operação**. Não há cache de conteúdo entre
usuários, contexto autorizado artificial nem reutilização de handles sem
contexto validado. A varredura histórica continua global, incluindo comissão
para preservar o histórico; somente atletas entram na resposta. A paginação
não reduz a leitura durante o recálculo, o payload completo ou os limites já existentes
das fontes legadas/detalhes: não é paginação de backend nem detalhe sob demanda.

Solicitações e súmulas usam os mesmos leitores/parsers das telas completas,
com uma **projeção interna** para a consolidação. A autorização de cada módulo
continua verificada na própria leitura. Nomes de arquivos já encontrados são
reutilizados; o índice de resultados continua varrido integralmente, mas só
resolve URLs dos resultados das solicitações selecionadas pelo limite legado.
URLs de solicitações, resultados TXT/PDF e súmulas permanecem no histórico
do atleta, pois são usadas no detalhe. As súmulas não repetem a leitura do
controle de punições para montar notas/punidos que a consolidação não utiliza;
punições continuam sendo lidas pela fonte própria. Comprovantes, telefone,
relato e dados da arbitragem não são projetados. As telas de solicitações e
súmulas mantêm seus contratos completos, incluindo anexos e notas.
Nenhuma fonte, TXT selecionado, vínculo ou reconciliação histórica é eliminado.

`CADASTRO_METRICAS_ATIVAS = true` em `WebApp.gs` também habilita os tempos
`atleta_banco` no recálculo: `elenco`, `solicitacoes`, `punicoes`, `sumulas` e `consolidacao`.
Na consulta pronta, apenas a fase `snapshot` mede leitura/validação da cópia.
Cada fase mede apenas sua operação, sem sobrepor as outras quatro.
As fontes de solicitações/súmulas também emitem subfases agregadas por categoria,
com duração, quantidades e bytes UTF-8 dos TXT já lidos, nunca caminhos, URLs,
nomes, IDs, CPF ou conteúdo. `leitura` inclui todas as subfases da fonte;
`metadados` está dentro de `interpretar`. Não somar filhos aos pais nem somar
essas etapas às cinco fases principais. Etapas internas `cadastro_elenco`
estão incluídas em `elenco`. Definir a flag como `false` desliga os dois grupos,
inclusive cálculos de tamanho, sem mudar regras, IO ou resultados.
Veja fases e contagens do fixture em `sistema-interno/performance/README.md`.
Para operações do elenco, os pais `listar_elenco_total`,
`adicionar_atleta_total`, `editar_atleta_total`, `remover_elenco_total` e
`transferencia_total` medem o
tempo de ponta a ponta no servidor. Consulte as subfases `cadastro_elenco`
para separar espera do lock, validações, histórico e gravações; os totais são
inclusivos e não devem ser somados às suas próprias subfases.
Os 13,340 s de solicitações e 3,807 s de súmulas observados antes não distinguem
varredura, abertura dos TXT e metadados; a nova instrumentação permite separá-los.
O ganho de latência real permanece **não medido**, sem promessa de redução.

Para disponibilizar a mudança, atualizar **Index.html e WebApp.gs** juntos no
projeto do Sistema Interno e gerar uma nova versão da implantação existente.
Os testes locais não estimam a latência real; nenhuma implantação é realizada
pelo executor de testes.

#### Cópias de Equipes Participantes e Tabela de Classificação

As listas `listarEquipesParticipantes(campeonatoId)` e
`listarTabelaCampeonato(campeonatoId)` consultam **cópias prontas por campeonato**.
**Atualizar** apenas relê a cópia; **Recalcular agora** é exclusivo de
admin/diretoria. A tela informa timestamp, recálculo em andamento, erro e
alterações pendentes. Sem cópia há erro explícito, nunca cálculo automático
durante a consulta. Em Administração, o admin pode selecionar cada campeonato
e gerar sua primeira cópia, inclusive quando a lista ainda não abre.

Publicar **WebApp.gs e Index.html juntos**, preservando o escopo
`script.scriptapp` do manifesto. Depois, com a conta **admin responsável**
atual, efetiva e com acesso à raiz privada/fontes do Drive:

1. Em **Administração**, selecionar cada campeonato nas duas categorias e usar
   **Recalcular campeonato agora**; conferir o timestamp.
2. Configurar separadamente as agendas:
   - Tabela: `configurarAgendamentoTabela()` /
     `atualizarTabelaAgendada`;
   - Participantes: `configurarAgendamentoParticipantes()` /
     `atualizarParticipantesAgendado`;
   - Banco de Atletas mantém sua agenda existente.
3. Conferir as Execuções/Gatilhos reais. Os testes locais não instalam gatilhos,
   não publicam e não consultam nem escrevem dados reais.

O código define uma frequência padrão apenas quando precisa criar um gatilho
novo. A frequência que vale é a exibida/configurada em **Apps Script >
Acionadores**; a interface do sistema não consegue detectar alterações feitas
diretamente nessa tela. Após criar ou alterar um gatilho, confira ali o intervalo.

Configuração é idempotente por categoria: reutiliza o UID registrado ou, se o
gatilho foi recriado no editor, adota um CLOCK existente do mesmo handler; remove
somente duplicatas CLOCK do **próprio usuário e handler correspondente**.
Desativar uma agenda não afeta as outras. Conta diferente do dono, perfil
revogado/rebaixado, UID inexistente ou acionador de outro handler são recusados.
O registro de agenda não prova que um gatilho apagado externamente ainda exista;
o dono deve configurar novamente ou criar um acionador CLOCK para o handler.
Não há transferência automática de propriedade.

Os três acionadores compartilham quotas/runtime/ScriptLock; separá-los **não
garante atualização em um intervalo específico**. Cada execução esportiva verifica
um orçamento de **210 segundos antes de começar outro campeonato**, com
checkpoint persistido antes de cada tentativa e rodízio no disparo seguinte.
Um único campeonato ainda pode atingir o limite do Apps Script. A lease por
categoria dura dez minutos; execução interrompida impede novas gerações dessa
categoria até expirar, sem substituir cópias publicadas. Erros por campeonato
preservam sua cópia, registram status sanitizado e permitem tentar os demais.
Ao final, se alguma tentativa falhou, a execução do acionador é sinalizada
como erro; as cópias dos campeonatos atualizados com sucesso permanecem publicadas.
As fontes externas são sempre relidas a cada geração visitada, mesmo sem
marcação local; não há detecção imediata de alterações feitas fora do sistema.

Os cálculos/regras existentes foram preservados. Edição de jogos, campos,
grupos, critérios e desempates carrega o contexto atual; se a revisão mudou,
a tela avisa e pede conferir/reabrir a edição. Resultados/súmulas/elencos e
retornos de mutações continuam atuais. A revisão otimista existente recusa
gravação com contexto antigo, mesmo se a cópia permanece defasada.
`carregarTabelaCampeonatoAtual` e `carregarEquipesParticipantesAtual` são
endpoints vivos reautenticados de admin/diretoria, não caminhos para evitar
permissões; associado não pode recalcular nem chamar o builder vivo da lista.

Participantes conserva autorização atual em **toda consulta**: perfil,
identidade da equipe, campeonatos/vínculos e bloqueios são relidos; associado
recebe somente sua identidade atualmente vinculada e nunca equipes globais.
Contagens/escudos vêm da cópia, mas ela não concede acesso. Equipes sem resumo
após novo vínculo aguardam recálculo, com aviso explícito; **Gerenciar elenco**
continua consultando os dados atuais. Não foi criado cache de autorização.

Gravações de listas/cadastros, participantes, registro/equipes e bloqueios
marcam uma revisão compartilhada conservadora das duas categorias. Isso pode
indicar pendência também em campeonatos/categorias não afetados diretamente.
A publicação guarda a revisão capturada no início: writes durante a geração
continuam pendentes, nunca são apagados pela troca da cópia.

Cada JSON `AEUV - Copia <categoria> - <campeonato> - <UUID>.json` é imutável
na raiz **privada**, validado e relido antes da troca de um único ponteiro por
campeonato. Estado: `SNAPSHOT_ESPORTIVO_V1_<categoria>_campeonato_<id>`; agenda
e lease usam propriedades `_meta_agenda` e `_meta_execucao`.
Normalmente são conservadas atual e anterior; a limpeza só remove o ID
obsoleto conhecido, jamais enumera a pasta. Falhas/interrupções podem deixar
órfãos/lixeira: manutenção administrativa deve preservar `currentId` e
`previousId`, não apagar arquivos de cadastro/histórico. Não compartilhar
arquivos de cópia publicamente nem expor seus IDs/URLs na tela.

#### Atas de reuniões

**Admin e Diretoria** podem consultar, criar atas e exportar PDFs. O editor
contém tipo (Associação ou Campeonato), título, data, local, participantes e
texto livre. Ao escolher **Campeonato**, aparece o campo obrigatório de
competição, usando a mesma lista do módulo Financeiro; a escolha aparece na
lista de atas e no cabeçalho e corpo do PDF. Atas antigas continuam legíveis,
mesmo sem competição informada. O botão **Salvar ata** guarda o trabalho mesmo
antes de exportar.
**Admin e Diretoria** podem editar atas existentes; apenas o **Admin** pode
excluí-las. Alterações não salvas exigem confirmação antes de sair do editor.

As atas ficam na planilha `AEUV - Atas`, dentro de `AEUV - Automação`. A
exportação pelo próprio Web App (Apps Script, sem Python) cria o PDF na subpasta
`Atas` com logomarca, cabeçalho azul, margens e rodapé no padrão dos documentos
da AEUV. Ao final da ata, a data da reunião aparece por extenso, seguida da
assinatura do Presidente, nome e cargo (como nos PDFs gerados pelo Python).
Antes da primeira exportação, envie `assets/assinatura-presidente.png` para a
raiz da pasta `AEUV - Automação` no Drive. O script encontra a imagem pelo
nome e guarda seu ID em `ATAS_ASSINATURA_FILE_ID`; admin e Diretoria precisam
ter acesso de leitura a ela. Sem a imagem, a exportação exibe um erro em vez
de publicar uma ata sem assinatura. Cada clique em **Exportar PDF** recria o documento, inclusive para
atas já exportadas; o PDF anterior é substituído no Drive e o link muda. Após
editar a ata, exporte novamente para refletir o texto atualizado. Excluir
remove o registro e os PDFs da ata. Admin e Diretoria precisam de **edição** na pasta
raiz, na planilha e na subpasta `Atas`. A implantação requer o novo escopo
`.../auth/documents` do `appsscript.json`; publique uma nova versão do app e
conclua a autorização solicitada pelo Google.

#### Submenus

Um módulo pode declarar `grupo` com o id de um item da constante `GRUPOS`. Os
módulos de um mesmo grupo aparecem recolhidos sob um título que abre e fecha,
em vez de ocupar uma linha cada no menu. Hoje existe um grupo: **Formulários**,
que reúne a Súmula digital e a Inscrição e portabilidade — as duas telas que
apenas levam a um endereço externo.

Três regras valem a pena lembrar:

- Módulos do mesmo grupo precisam estar **lado a lado** em `MODULOS`; a ordem da
  lista é a ordem do menu.
- O submenu começa fechado, mas **abre sozinho** quando o módulo em uso está
  dentro dele, para o item ativo nunca ficar escondido.
- Um grupo sem nenhum módulo liberado para o perfil simplesmente não aparece,
  porque o servidor já filtra os módulos antes de enviá-los.

No painel inicial cada módulo continua com seu próprio atalho, sem agrupamento:
lá o objetivo é mostrar tudo o que a pessoa pode fazer.

#### Carregamento

Toda tela que busca dados no servidor mostra o **mesmo** bloco de carregamento,
montado por `blocoCarregando()`: a logomarca da associação com um anel girando,
a palavra "Carregando" com reticências animadas e uma barra indeterminada.

É a mesma identidade da tela de entrada das
[páginas de abertura](#ícone-da-aba-e-prévia-do-link)
(`docs/sistema/index.html`), de propósito: quem entra no sistema vê o anel
girando na abertura e reencontra o mesmo desenho a cada tela que abre, sem
mudança de cara no meio do caminho.

O texto é igual em todas elas. Antes cada tela escrevia o seu ("Carregando as
solicitações de inscrição...", "Carregando o controle de punições..."), o que
repetia uma informação que o cabeçalho logo acima já dá — e a espera é sempre a
mesma coisa, o servidor indo ao Drive, não algo específico da funcionalidade.

A barra é indeterminada porque não há como saber o tempo: depende de quantos
arquivos a pasta tem e da resposta do Drive. Quem configurou o sistema para
usar menos movimento (`prefers-reduced-motion`) vê o mesmo bloco, parado, com a
barra cheia.

### Controle de punições

Primeira funcionalidade com tela própria. Mostra todas as punições aplicadas
pelas notas oficiais, com indicadores, busca e filtros, e some com a necessidade
de abrir o arquivo no Drive para consultar uma suspensão.

A fonte é o arquivo **`CONTROLE DE PUNIÇÕES - AEUV.txt`**, mantido pela
automação em Python (`controle_punicoes.py`) e publicado por ela na subpasta
`Controle de Punicoes`, dentro da pasta das súmulas no Drive. A cada nova
punição o arquivo é regravado e reenviado, então a tela sempre reflete a última
nota — [veja o fluxo no README do projeto principal](../README.md#controle-de-punições-da-associação).

O servidor faz o caminho inverso do Python: localiza o arquivo, lê o texto e
transforma a tabela separada por `|` em registros, guiando-se pela ordem das
colunas (`PUNICOES_COLUNAS`). Linhas de cabeçalho e de apoio são descartadas
porque não têm o número exato de colunas. O id do arquivo encontrado fica
guardado na propriedade de script `PUNICOES_ARQUIVO_ID` para evitar uma busca no
Drive a cada abertura; se o arquivo for substituído, movido ou apagado, a busca
é refeita sozinha.

Na tela, os quatro indicadores (punições, a cumprir, cumpridas e pena a definir)
acompanham os filtros aplicados. A busca livre ignora acentos e maiúsculas e
varre todas as colunas; os seletores de competição, equipe, situação e status
são montados a partir dos próprios dados. No computador os dados aparecem em
tabela; no celular cada punição vira uma ficha com os rótulos à esquerda. O
botão "Atualizar" relê o arquivo e "Abrir arquivo" leva ao TXT no Drive.

Cada linha traz ainda um **"Ver súmula"**, abaixo do número da nota, que abre a
tela de [Súmulas Enviadas](#súmulas-enviadas) já filtrada pelo protocolo — o
caminho para ler o relato do árbitro que motivou aquela punição. O atalho só
aparece para quem tem a tela de súmulas no menu.

Dois pontos de atenção:

- **Permissão.** O aplicativo roda com a permissão de quem acessa, então cada
  pessoa autorizada precisa ter acesso de leitura à pasta das súmulas no Drive.
- **Primeira cópia.** A conta de serviço usada pelo Python não tem cota de
  armazenamento e só consegue atualizar arquivos já existentes. O TXT e o PDF
  precisam ser enviados uma única vez à subpasta por uma conta de pessoa; depois
  disso a atualização é automática.

A configuração fica em `CONFIG.punicoes`, no `WebApp.gs`: id da pasta das
súmulas, nome da subpasta e nome do arquivo. Os dois nomes precisam ser iguais
aos usados no `controle_punicoes.py`.

#### Quando a tela acusa falta de acesso

Execute `diagnosticarPunicoes()` no editor do Apps Script. A função percorre os
mesmos passos da tela — abrir a pasta, achar a subpasta, achar o arquivo, ler os
registros — e registra no log exatamente onde parou, listando o que existe de
fato no Drive quando um nome não confere.

Se o log trouxer **"You do not have permission to call DriveApp.getFolderById"**,
o problema não é a pasta: é o consentimento. O Google fixa os escopos no momento
em que o aplicativo é autorizado, então um projeto autorizado **antes** de passar
a ler o Drive continua sem essa permissão, mesmo com a pasta compartilhada
corretamente.

A correção é declarar os escopos no manifesto, que é o que o `appsscript.json`
deste repositório faz:

| Escopo | Para quê |
| --- | --- |
| `.../auth/userinfo.email` | `Session.getActiveUser().getEmail()`, base do controle de acesso. |
| `.../auth/drive` | Ler a pasta, o arquivo de controle e a logomarca; guardar os documentos dos associados. |
| `.../auth/spreadsheets` | Criar e manter a planilha do cadastro de associados. |

Para aplicar: no editor do Apps Script, abra **Configurações do projeto**, marque
*"Mostrar o arquivo de manifesto appsscript.json no editor"*, abra o arquivo,
substitua o conteúdo pelo deste repositório e salve.

Corrigir o manifesto **não basta por si só**. A autorização já concedida fica
guardada na conta, e o editor continua usando esse consentimento antigo sem
exibir nova tela — o erro se repete igual. Duas formas de forçar o pedido:

1. **Recarregar o editor.** O Apps Script calcula os escopos ao carregar a
   página, então salvar o manifesto na mesma sessão não muda nada. Feche a aba,
   reabra o projeto e execute `diagnosticarPunicoes()`.
2. **Revogar o acesso.** Em
   [permissões da Conta Google](https://myaccount.google.com/permissions),
   procure o projeto pelo nome e clique em *Remover acesso*. Projetos dos quais
   você é o dono podem não aparecer nessa lista; nesse caso vale o item 1.

Se mesmo assim a tela não aparecer, troque o escopo por um **diferente** do que
foi concedido antes (por exemplo, `.../auth/drive` no lugar de
`.../auth/drive.readonly`). Escopo diferente é o que garante que o Google
reconheça a mudança e refaça a pergunta. Por isso o manifesto deste repositório
usa `.../auth/drive`.

Quando a tela surgir, ela vem com o aviso de app não verificado: clique em
**Avançado** e depois em *Acessar (não seguro)*. É esperado — o aplicativo é da
própria associação e não passou pela verificação pública do Google.

Cada pessoa autorizada passa por essa tela na primeira vez que abrir o sistema,
porque o aplicativo roda com a permissão de quem acessa.

**Consentimento parcial.** A tela do Google traz uma caixa para cada escopo, e é
possível continuar deixando o Drive desmarcado. O sistema abriria, mas todo
módulo falharia com *"Você não tem permissão para chamar DriveApp..."*. Para
evitar isso, o `doGet()` chama `ScriptApp.requireAllScopes()`, que solicita a
autorização completa na abertura do aplicativo. Na tela de consentimento,
marque todas as caixas.

> **"Você precisa ter acesso" (Leitor/Editor).** Essa tela pede acesso ao
> **projeto** do Apps Script (código-fonte) e não deve ser solicitada nem
> concedida a associados. Ela aparece ao abrir o link `/dev` (implantação de
> teste, restrita a editores) ou o link do editor. Associados usam somente a URL
> `/exec` da implantação ou `portal.aeuv.org/sistema/`.

Concedido o escopo, a pessoa ainda precisa de **compartilhamento** nos arquivos
que o módulo lê. Para os regulamentos basta compartilhar **somente a subpasta
`Regulamentos`** como *Leitor* com os associados: o id dela fica
guardado em `REGULAMENTOS_PASTA_ID` na primeira vez que um admin/diretoria abre a
tela, e a partir daí o sistema abre a subpasta direto, sem passar pela pasta
raiz. O cadastro de associados consulta a cópia individual nas propriedades,
sem acesso à planilha geral (veja o alerta sobre o perfil `associado` acima).
Se a subpasta não estiver compartilhada, **Solicitar acesso como Leitor no
Drive** abre diretamente a subpasta `Regulamentos`. Na página do Google Drive,
o associado solicita acesso como *Leitor*; o proprietário recebe o pedido e
precisa aprová-lo. Se o cadastro ainda não estiver publicado, **Solicitar
publicação do cadastro** abre um e-mail preenchido com conta e equipe: a
administração deve cadastrar a equipe e publicar a consulta individual. Não
conceda acesso à planilha geral nem ao projeto Apps Script.

Com `oauthScopes` declarado, o Apps Script deixa de acrescentar escopos sozinho.
Por isso, ao usar um serviço novo no código, acrescente o escopo correspondente
ao manifesto — e lembre que a mudança só vale após nova autorização.

### Solicitações de Inscrições

Consulta aos pedidos de inscrição, remoção e portabilidade que as equipes
enviaram pelo formulário público. Evita abrir o Drive e ler os TXT um a um para
saber o que chegou, o que já foi processado e o que falhou.
Nada é gravado por esta tela: ela **só lê**. Quem escreve os arquivos é o
[formulário de inscrição](#inscrição-remoção-e-portabilidade), que grava o TXT
em `Entrada`; depois a automação em Python move o arquivo para `Processados` ou
`Falhas`, conforme o resultado de cada registro no iFut.

#### A pasta é o status

Não existe banco de dados nem planilha guardando o andamento de uma solicitação:
**a pasta em que o arquivo está é o próprio status**.

| Pasta | Situação na tela | Significa |
| --- | --- | --- |
| `Entrada` | 🕒 Aguardando | O formulário recebeu o pedido; a automação ainda não rodou. |
| `Processados` | 🟢 Processada | A automação executou os registros no iFut. |
| `Falhas` | 🔴 Falha | A automação encontrou erro e separou o arquivo. |

A vantagem é não haver nada para sincronizar: quem move o arquivo é a própria
automação, e a tela apenas observa o resultado. As subpastas `Processados` e
`Falhas` só passam a existir depois da primeira execução do Python; a ausência
delas não é erro e a tela simplesmente não encontra nada nelas.

#### O resultado da automação

Saber que uma solicitação falhou não basta: é preciso saber **por quê**. Ao
terminar cada processamento, a automação em Python publica na pasta
`Resultados` dois arquivos com o resultado — um TXT e um PDF — nomeados como
`<arquivo de origem sem extensão>-resultado-<carimbo>`.

A tela usa esse nome para ligar o resultado à solicitação correspondente e
oferece os dois no detalhe: **Resultado (PDF)**, em destaque, e
**Resultado (TXT)**. O PDF traz cada registro com o status colorido — `SUCESSO`
em verde, `FALHA` em vermelho, `PENDENTE` em laranja — e, quando há registros não
concluídos, uma caixa no topo com o nome e o motivo de cada um.

`PENDENTE` aparece quando o iFut não confirma a gravação dentro de
`save_confirm_timeout_seconds` (`[app]` no `config.ini`, padrão 45s): o pop-up
continua aberto após Salvar/Remover/Inscrever. A automação recarrega a página do
time, confere no elenco se a operação acabou sendo gravada (nesse caso marca
`SUCESSO`) e segue para o próximo registro. Se não conseguir confirmar, fica
`PENDENTE` para conferência manual no iFut.

Como a publicação só acontece depois que a automação roda, solicitações ainda
em `Entrada` aparecem sem esses botões e sem aviso. Já uma solicitação que
consta como processada ou com falha e mesmo assim não tem resultado anexado
mostra "Resultado ainda não publicado" — sinal de que a automação rodou numa
versão anterior, antes desta publicação existir, ou que o envio ao Drive
falhou.

#### Colunas escolhidas

A lista mostra o que identifica a solicitação; o resto fica no detalhe, que abre
ao clicar na linha. A separação é proposital: a tabela responde "o que chegou e
em que pé está", e o detalhe responde "quem exatamente foi inscrito".

| Coluna | Por que está ali |
| --- | --- |
| Situação | A pergunta mais frequente: já foi processada? |
| Protocolo | Identificador informado à equipe no envio; é por ele que cobram. |
| Enviada em | Data e hora do envio, com a competição abaixo. |
| Equipe | Quem pediu. |
| Responsável | Quem assinou, com o telefone abaixo, para contato direto. |
| Registros | Quantas inclusões, remoções e portabilidades o pedido tem. |

No detalhe aparecem os dados completos de cada pessoa — ação, tipo, nome
completo, data de nascimento, CPF e, nas portabilidades, a competição anterior —
além dos links para o comprovante PIX, para o arquivo TXT original e para o
resultado da automação em PDF e TXT. Campos que
a ação dispensa são gravados como `NAO NECESSARIO` pelo formulário e viram um
travessão na tela, em vez de repetir o aviso em toda linha.

Ficaram de fora da tabela as confirmações de aceite (pagamento, termo médico,
regulamento e declaração): o formulário só deixa enviar com todas marcadas, logo
elas seriam sempre iguais e não ajudariam a distinguir uma solicitação de outra.

#### Leitura e desempenho

Ler todo o conteúdo de centenas de arquivos estouraria o tempo do Apps Script.
A tela evita isso em duas etapas:

1. **Listagem.** Percorre as três pastas recolhendo só os nomes. O formulário
   nomeia cada arquivo como `<EQUIPE>-<data>-<milissegundos>.txt`, então dá para
   ordenar do mais recente para o mais antigo sem abrir nenhum deles.
2. **Leitura.** Abre apenas os primeiros `CONFIG.solicitacoes.maxLeitura`
   arquivos (200 por padrão). Quando há mais que isso, a barra de ações avisa
   quantos foram lidos do total.

Arquivos que não terminam em `.txt` são ignorados, e nomes fora do padrão vão
para o fim da lista em vez de quebrar a ordenação.

O interpretador é tolerante de propósito: lê linhas no formato `CHAVE: valor`,
trata `REGISTRO 01` como início de uma pessoa e descarta o que não tem `:`
(títulos e separadores). Assim, acrescentar uma linha nova ao TXT do formulário
não quebra a consulta.

#### Permissão

Liberada para **admin e diretoria**. Ficou fora dos perfis `associado` e
`arbitragem` porque a tela
expõe nome, data de nascimento e CPF dos atletas, além do telefone do
responsável. Como o aplicativo roda com a permissão de quem acessa, cada pessoa
autorizada também precisa de acesso de leitura à pasta das inscrições no Drive.

A pasta é a mesma usada pelo Python (`config.ini`, seção `[drive]`,
`folder_embed_url`) e está declarada em `CONFIG.solicitacoes.pastaRaizId`.
Quando a tela acusar erro, `diagnosticarSolicitacoes()` mostra quantos arquivos
existem em cada subpasta e o que foi reconhecido no mais recente.

### Súmulas Enviadas

Consulta às súmulas que a arbitragem enviou pelo
[formulário da súmula digital](#súmula-digital). Evita abrir o Drive e ler os
TXT um a um para saber o que chegou de cada rodada, quem foi citado e o que o
árbitro relatou. Como a tela de solicitações, ela **só lê**: quem escreve é o
formulário e quem move os arquivos é a automação em Python.

#### A pasta é o status

Mesma ideia das solicitações — não há banco de dados nem planilha de andamento:

| Pasta | Situação na tela | Significa |
| --- | --- | --- |
| `Entrada` | 🕒 Aguardando | A súmula chegou; a análise disciplinar ainda não rodou. |
| `Processados` | 🟢 Analisada | A automação leu a súmula e gerou a nota oficial. |
| `Falhas` | 🔴 Falha | A automação encontrou erro ao analisar o arquivo. |

A pasta é a mesma do controle de punições (`CONFIG.sumulas.pastaRaizId` e
`CONFIG.punicoes.pastaSumulasId` apontam para ela) e a mesma configurada no
Python em `config.ini`, seção `[sumulas]`.

#### Colunas escolhidas

| Coluna | Por que está ali |
| --- | --- |
| Situação | Já foi analisada? É a primeira pergunta. |
| Protocolo | Identificador do envio; é o que a nota oficial cita. |
| Enviada em | Quando o árbitro enviou — diferente da data do jogo. |
| Partida | O confronto, com a data e a hora do jogo abaixo. |
| Árbitro | Quem assinou o relato. |
| Envolvidos | Quantos atletas e quantos membros de comissão foram citados. |

O detalhe abre ao clicar na linha e traz o **relato dos fatos** em destaque,
com as quebras de linha como o árbitro escreveu, a tabela de envolvidos
(equipe, tipo, nome e camisa) e os botões da **súmula oficial em PDF** e do
arquivo TXT. Quando o PDF não foi gerado, o lugar dele mostra um aviso.

A busca livre cobre também o relato: é comum lembrar de uma palavra do texto e
não do protocolo. O filtro por equipe considera tanto os dois times da partida
quanto a equipe de cada envolvido, já que a súmula não tem uma equipe única.

#### O que a comissão decidiu

O detalhe fecha o ciclo mostrando a **nota oficial** que aquela súmula gerou:
número, data, quem foi punido, o artigo, a decisão e a situação de cada
punição. Um botão leva ao [controle de punições](#controle-de-punições) já
filtrado por aquele protocolo, e o caminho inverso também existe — cada linha
do controle traz um "Ver súmula" que abre esta tela no envio que originou a
punição.

Esse vínculo não custou nenhum arquivo novo: o controle de punições que a
automação publica já grava a coluna `SÚMULA` ao lado da coluna `NOTA`, então a
tela faz **uma leitura só**, do mesmo arquivo que a tela de punições usa.
Quando o controle ainda não existe, ou o usuário não tem acesso a ele, a tela
continua funcionando — apenas sem o vínculo.

Dois casos aparecem com texto próprio, e nenhum deles é erro:

| Caso | O que a tela diz |
| --- | --- |
| Súmula ainda em `Entrada` | "A análise disciplinar desta súmula ainda não foi feita." |
| Súmula analisada sem infração | "Súmula analisada sem punição registrada no controle." |

#### Um formato diferente do das inscrições

O TXT da súmula não é uma lista de `CHAVE: valor`. Ele tem seções, e uma delas
— `DOS FATOS` — é texto corrido, onde qualquer linha pode ter `:` sem ser um
campo. Por isso a leitura acompanha em que seção está, em vez de olhar cada
linha isoladamente:

```
(topo)                PROTOCOLO, DATA ENVIO, ÁRBITRO, DOCUMENTO
PARTIDA               "<mandante> x <visitante>", DATA, HORA
DOS FATOS             relato da arbitragem, copiado como veio
ENVOLVIDOS            blocos "REGISTRO n" com EQUIPE, TIPO, NOME, CAMISA
SÚMULA OFICIAL (PDF)  link do PDF, só quando o PDF foi gerado
```

Duas consequências práticas: o relato nunca engole o título da seção seguinte,
e uma linha do relato terminada em `:` não vira um campo fantasma.

A ordenação usa a **data de criação do arquivo no Drive**, e não o nome. O
formulário nomeia a súmula como `SUMULA_<protocolo>.txt`, e o protocolo só tem
a data — duas súmulas do mesmo dia empatariam. A data de criação é metadado:
dá para ordenar sem abrir nenhum arquivo. Vale o mesmo teto das solicitações,
`CONFIG.sumulas.maxLeitura` (200 arquivos abertos por consulta), e só arquivos
no padrão `SUMULA_*.txt` entram — a pasta também recebe PDFs e anexos.

#### Permissão

Liberada para **admin e diretoria**. Ficou fora dos perfis `associado` e
`arbitragem` porque o
relato costuma trazer acusações e ofensas atribuídas a pessoas com nome e
número da camisa — material da comissão disciplinar, não de consulta geral.
Cada pessoa autorizada também precisa de acesso de leitura à pasta das súmulas
no Drive. Quando a tela acusar erro, `diagnosticarSumulas()` mostra quantos
arquivos existem em cada subpasta e o que foi reconhecido no mais recente.

### Notas oficiais

Consulta às notas oficiais disciplinares — o documento que fecha o ciclo
iniciado pela [súmula](#súmulas-enviadas) e alimenta o
[controle de punições](#controle-de-punições). Antes desta tela, ler uma nota
significava abrir a pasta do Drive e caçar o PDF pelo nome do arquivo.

#### Só nota final chega aqui

A comissão trabalha em cima de um rascunho: a automação gera a nota com as
decisões sugeridas e, quando falta decidir alguma coisa, deixa marcadores
`[A DEFINIR PELA COMISSÃO]` no texto. **Esse rascunho não vai para o Drive.**
Só é publicado o que já está fechado, pelo mesmo critério que decide se o PDF
sai com a marca d'água RASCUNHO (`nota_pdf.tem_pendencias`).

A consequência é a que importa: ninguém na diretoria abre a tela e lê uma
decisão que ainda pode mudar. A publicação acontece quando a comissão regera o
PDF final (`python main.py --gerar-pdf-nota <número>`), ou em lote com
`--publicar-drive` — [veja o fluxo no README do projeto principal](../README.md#publicação-no-drive).

#### Colunas escolhidas

| Coluna | Por que está ali |
| --- | --- |
| Nota | O número (`008/2026`) é como a nota é citada em tudo. |
| Publicada em | A data da decisão, que não é a data do jogo. |
| Partida | O confronto, com a data do jogo abaixo. |
| Súmula | O protocolo que originou a nota, com atalho para a súmula. |
| Punidos | Quem foi punido e por qual equipe, até dois nomes. |

O detalhe abre ao clicar na linha e traz a competição, o árbitro da partida, a
tabela de punidos (artigo, decisão e situação de cada um), o **texto integral
da nota** e os botões do PDF oficial, do arquivo TXT e do controle de punições
filtrado por aquela nota.

O texto fica na tela mesmo havendo o PDF ao lado: é o que permite a busca livre
alcançar o enquadramento e a fundamentação, que não aparecem em nenhuma coluna.
Quem precisa do documento para anexar ou imprimir usa o PDF.

#### De onde vêm os punidos

Da mesma fonte do vínculo súmula → nota: o controle de punições já grava a
coluna `NOTA` em cada linha. A tela agrupa as linhas por esse número
(`indicePunidosPorNota_()`) em vez de reinterpretar o texto de cada nota — uma
leitura só, do arquivo que a tela de punições já usa. Sem o controle, a tela
continua funcionando; apenas a coluna de punidos fica vazia.

#### O que a leitura do TXT procura

A nota é um documento corrido, não uma lista de campos. A leitura pega os
poucos trechos de formato fixo e guarda o resto como corpo:

```
NOTA OFICIAL Nº 008/2026            número e ano
(linha seguinte)                    competição
"partida entre X x Y, realizada em" confronto e data do jogo
"(súmula SUM-..., árbitro ...)"     protocolo que originou a nota
"Uberlândia/MG, 26 de setembro..."  cidade e data da nota
```

O protocolo é **opcional**: as notas escritas com apoio de IA nem sempre o
citam no texto. Quando falta, a linha simplesmente não oferece o atalho para a
súmula.

#### Permissão

Liberada para **admin e diretoria**, pelo mesmo motivo das súmulas: a nota
nomeia pessoas e descreve condutas. Cada pessoa autorizada também precisa de
acesso de leitura à pasta das súmulas no Drive. Quando a tela acusar erro, a
própria mensagem já distingue os dois casos: a pasta `Notas Oficiais` ainda não
existe (nenhuma nota foi publicada) ou o usuário não tem acesso a ela.

### Regulamentos

Lista os regulamentos e as formas de disputa oficiais publicados na mesma
subpasta `Regulamentos` do Drive. É a tela mais simples do sistema e a
**única consulta aberta a todos os perfis**: são documentos que toda equipe e
a arbitragem precisam ter à mão, sem depender de quem está olhando.

Por isso não há tabela nem filtro. São poucos arquivos e o uso é sempre o
mesmo — abrir o PDF —, então cada documento é um cartão com o título, a data
da última atualização, o tamanho e dois botões: **Abrir PDF** e **Baixar**.

O título vem do nome do arquivo, com os hifens virando espaços:
`regulamento-7-super-liga-união-2026.pdf` aparece como "Regulamento 7 Super
Liga União 2026". A ordenação usa a data de atualização no Drive, então um
documento revisado no meio da temporada sobe para o topo. A forma de disputa
entra nessa lista quando gerada com `main.py --gerar-pdf-forma-disputa` ou
reenviada com `main.py --publicar-drive`.

Só os **PDFs** são publicados. Os textos de trabalho continuam no repositório,
em `regulamento/` e `formadisputa/` — publicar os dois formatos lado a lado
criaria dúvida sobre qual versão é a oficial.

### Banco de Dados de Equipes

Lista as equipes que podem aparecer em qualquer parte dos três projetos. É a
**fonte única**: antes desta tela, o mesmo nome de equipe existia hardcoded em
quatro lugares (`sistema-interno/WebApp.gs`, `sumula-digital/WebApp.gs`,
`inscricao-portabilidade/WebApp.gs` e `config.ini` da automação em Python) —
já haviam divergido entre si, e um time novo exigia editar e republicar até
três projetos. Agora um time novo é cadastrado **num lugar só**.

Liberada para **admin e diretoria** (`EQUIPES_PERFIS_EDICAO`); os demais
perfis só recebem a lista pronta, onde ela for usada (acesso de associado,
cadastro de associados, os dois formulários).

**Como funciona:**

1. A lista fica gravada nas propriedades do script (`EQUIPES_LISTA`) e vale na
   hora, sem publicar nova versão — igual à tela de usuários.
2. Toda gravação também **republica um arquivo `equipes.json`** na pasta raiz
   `AEUV - Automação` (`publicarEquipes_`). O arquivo sempre tem o mesmo id
   (guardado em `EQUIPES_ARQUIVO_ID`), então o link não muda a cada edição.
3. Os formulários `sumula-digital` e `inscricao-portabilidade` leem esse
   arquivo direto do Drive na abertura da página (`equipesConfiguradas_()`),
   com cache de 6 horas para não consultar o Drive a cada acesso. Se o
   arquivo ainda não existir ou o Drive estiver fora do ar, cada formulário
   cai na sua lista fixa antiga — a fonte única nunca vira ponto único de
   falha.
4. **A automação em Python (`config.ini`) não foi ligada a este arquivo.**
   Continua com a lista própria, usada para localizar o time no iFut e não
   apenas para preencher um combo — um nome de equipe ali precisa bater com
   o nome cadastrado no iFut, não com o nome usado nos formulários.

**Renomear ou remover uma equipe é recusado** enquanto ela tiver acesso de
associado vinculado (`USUARIOS_AUTORIZADOS`), cadastro na planilha de associados
ou vínculo com campeonato (`equipesEmUso_`). Isso preserva as referências
legadas por nome; não há migração em massa dos consumidores externos.
Editar somente o escudo continua permitido. Equipes sem uso podem ser
renomeadas sem perder seu identificador permanente.

O cadastro complementar **`AEUV - Equipes - Cadastro.json`**, na mesma pasta
raiz do Drive, guarda `{id, nome, escudo}`. Na primeira consulta, os nomes
legados ainda sem registro recebem UUIDs persistidos sob lock. Consultas
posteriores reutilizam os mesmos IDs, inclusive nos links de inscrição.
JSON inválido não é substituído silenciosamente: restaure o arquivo antes
de continuar. O escudo é uma imagem PNG, JPEG ou WebP de até 1,5 MB, armazenada
como Data URL base64 nesse arquivo, nunca nas Script Properties nem em
`equipes.json`. Nenhuma permissão pública é criada para as imagens.
O upload é feito por admin/diretoria no Banco de Dados de Equipes e o mesmo
escudo aparece nos cards de participação.

Depois de publicar o sistema interno pela primeira vez com esta tela, rode
`publicarEquipesAgora()` uma vez pelo editor do Apps Script para os dois
formulários já encontrarem o arquivo publicado — sem isso eles seguem com a
lista fixa até a primeira gravação pela tela.

### Equipes participantes e meu elenco

O submenu **Gestão do campeonato → Equipes participantes** mantém o ID
`times-campeonato` para compatibilidade. O fluxo desta etapa é:

1. Admin/diretoria cadastra a equipe global, com escudo opcional, no
   **Banco de Dados de Equipes**.
2. Em **Equipes participantes**, seleciona o campeonato e **Vincular equipe
   existente**. Os cards mostram o escudo e as quantidades de atletas e
   comissão técnica. A desvinculação é recusada enquanto houver cadastros.
3. **Gerenciar elenco** abre um contexto fixo de equipe + campeonato, com
   abas **Atletas** e **Comissão técnica**. Adicionar, editar e remover
   cadastram pessoas novas usando os validadores existentes (CPF, duplicidade
   entre as duas abas, nascimento, time, foto e campos do atleta).
   **Importar atletas / Importar comissão** copia inscrições atuais ou anteriores
   de outra competição da mesma equipe, com seleção múltipla e validação em lote.
   O histórico permanente fica no Drive em `AEUV - Historico de Inscricoes.json`;
   não depende de jogos e não é apagado por remoção, desvinculação ou exclusão
   de campeonato. A migração considera somente vínculos e cadastros ainda
   persistidos, sem reconstruir dados já excluídos. Veja
   [retenção, snapshots e recuperação de gravações](sistema-interno/campeonato/README.md#histórico-permanente-e-importação).
4. Admin/diretoria pode **Copiar link de inscrição** ou **Enviar pelo
   WhatsApp**. O link usa a URL real da implantação do Apps Script, com
   `campeonatoId` e `equipeId`; depois do login ele abre diretamente o elenco.
   O link é navegação, não concessão de acesso.

O associado precisa entrar com a **Conta Google cujo e-mail está autorizado**
e com `usuario.equipe` correspondente à equipe global. Ele vê esse mesmo
submenu, mas só os campeonatos vinculados à sua equipe e seus próprios
cadastros. Não pode vincular/desvincular equipes, editar campeonatos nem
enviar escudos. Links de outra equipe, campeonato não vinculado ou IDs de
cadastros de terceiros são recusados no servidor, inclusive em edição e
remoção. As mutações revalidam o contexto e o alvo persistido dentro do lock;
a resposta nunca inclui o cadastro global.

#### Consolidação assíncrona do histórico

Inclusão, edição, remoção e transferência continuam validando permissão,
vínculo, CPF, duplicidade e participação, e gravando o elenco atual de forma
síncrona. Antes da gravação, o histórico atual é reconciliado para preservar o
snapshot anterior; depois da gravação, uma pendência pequena por campeonato é
registrada nas Script Properties e o histórico detalhado é consolidado em
segundo plano. Isso posterga a escrita final do histórico, não altera suas regras
nem muda ainda os arquivos atuais de elenco.

Nas mutações rotineiras, a preparação lê os elencos apenas do campeonato alterado;
importações e manutenções globais continuam reconciliando todos. O histórico
detalhado permanece em um único JSON global: quando já existe, ainda é carregado
para preservar os demais campeonatos e pode ser regravado se o conteúdo mudar.

Em **Administração > Histórico de inscrições**, o administrador responsável
deve clicar **Configurar agendamento** uma vez. O handler
`processarHistoricoElencoAgendado` é criado com intervalo padrão de 15 minutos;
o intervalo efetivo é configurado em **Apps Script > Acionadores**. A tela mostra
campeonatos pendentes, última execução e falha. **Processar pendências agora**
executa a reconciliação manualmente. Falhas preservam as pendências para retry;
reprocessar é idempotente. O resultado da execução informa quantos campeonatos e
inscrições foram encontrados, e os logs das Execuções detalham as contagens por
campeonato. Se uma inscrição estiver faltando, **Reconciliar campeonato
selecionado** refaz a consolidação daquele campeonato a partir do elenco atual;
isso não recupera dados de atletas já removidos que ainda não existam no
histórico. Campeonatos associados a uma pendência que não forem encontrados não
terão a pendência descartada. Consultas de importação continuam reconciliando o
histórico antes de confiar nos candidatos, portanto podem fazer trabalho
síncrono quando forem usadas.

Em produção, o armazenamento do elenco continua nos JSONs atuais por campeonato,
pois o gate permanece `false`. A integração com partições por equipe/competição,
histórico, índice V2 e importação está implementada atrás desse gate e exercitada
somente em fixtures locais; não houve migração nem aposentadoria dos arquivos.
Veja [elencos particionados](#elencos-particionados-etapa-inativa).

**Bloquear elenco:** somente admin/diretoria pode bloquear/desbloquear no cabeçalho.
O bloqueio vale para o par de IDs permanentes **campeonato + equipe**, não para a
equipe global. O padrão é desbloqueado. O arquivo privado do Drive
`AEUV - Bloqueios de Elenco.json` mantém esses estados; renomear a equipe ou
desvincular/revincular o mesmo par não perde o bloqueio. Registros de campeonatos
excluídos são retidos, sem conceder acesso a contextos inexistentes.
Com o elenco bloqueado, o associado só consulta cards, detalhes e as quatro abas:
adicionar, editar, remover e importar ficam ocultos e são recusados no servidor,
inclusive por RPC direto. Administração continua editando normalmente.
Cada mutação revalida sessão, vínculo e bloqueio dentro do mesmo ScriptLock
antes de alterar elenco ou histórico; falha de leitura do registro impede escrita.

**Atleta que já jogou fica no elenco:** se um resultado detalhado salvo do
campeonato registra `participou: true` para o atleta (mesmo ID de cadastro ou
mesmo CPF, por qualquer equipe), ele não pode ser removido, transferido nem ter
equipe/CPF alterados, por nenhum perfil e em nenhuma das telas (elenco da equipe
e cadastro global), inclusive após o encerramento do campeonato. O CPF também
não pode ser inscrito ou importado em outra equipe da mesma competição. O botão
**Remover** fica desabilitado com o motivo visível, e o servidor revalida tudo
sob o ScriptLock antes de gravar. Apenas resultados detalhados ainda salvos são
evidência: gols/cartões sem `participou`, placares sem resultado detalhado e
jogos removidos não contam. Detalhes em `sistema-interno/campeonato/README.md`.

As ações **Importar atletas / Importar comissão** aparecem nas duas abas de
cadastro quando a edição é permitida, mesmo com elenco vazio ou sem histórico
de origem. Abrir a importação sem fontes mostra a orientação contextual.
O retorno do cabeçalho funciona com formulário aberto e confirma o descarte;
o cancelamento interno preserva a aba do elenco. Ambos impedem navegação
durante a gravação. O seletor de vínculo usa IDs, exclui equipes já vinculadas
e exige selecionar uma equipe disponível, com aparência compatível com os temas.

Os RPCs específicos são `listarEquipesParticipantes`, `listarElenco`,
`salvarCadastroElenco`, `removerCadastroElenco` e `definirBloqueioElenco`. Os antigos endpoints globais
de campeonato/atletas/comissão permanecem restritos a admin/diretoria.
O armazenamento das pessoas continua nos arquivos privados por campeonato
(`AEUV - Campeonato - <id> - Atletas.json` e `... - Comissao Tecnica.json`),
sem alterar o formulário unificado do campeonato e sua `estrutura`.

**Implantação/acesso:** permanece obrigatório executar como **Usuário que
acessa o app da web**, exigir Conta Google e manter a lista de e-mails
autorizados. Como nas demais telas atuais, a conta também precisa das
permissões do Drive necessárias na pasta do projeto; o link não compartilha
arquivos nem substitui essas permissões. Publique uma nova versão dos
arquivos `WebApp.gs` e `Index.html` no projeto interno para disponibilizar
este fluxo. Não use o backup diagnóstico `WebApp.publicado.gs`.
Capturas com a antiga tabela/toolbar não representam o markup local atual
(cards, detalhes e ações de importação): confirme a versão publicada. Atualize
**ambos** os arquivos e publique uma **nova versão** da implantação; atualizar
somente o backend ou somente o frontend não disponibiliza o fluxo completo.

### Tabela e Classificação

O submenu `jogos-campeonato` deixa de ser um espaço reservado e reúne a
operação de jogos para admin/diretoria, mantendo a autenticação Google e as
permissões atuais. Selecione o campeonato para consultar rodadas, classificação,
grupos e fases, cadastrar campos e parametrizar pontuação/desempates.

Os jogos são cadastrados manualmente, com mandante, visitante, fase, rodada,
campo, data e hora. **Editar jogo** altera o agendamento; **Lançar resultado**
abre uma tela separada com placar, participação, gols, gols contra e cartões
dos atletas, além de participação e cartões da comissão técnica, nas abas dos
dois times. As duas listas exibem CPF completo em vez de data de nascimento;
a súmula em PDF mantém o CPF parcialmente mascarado.
WO, prorrogação e placar de pênaltis são informados manualmente, sem avanço
automático. Três amarelos acumulados suspendem por um jogo (subtraindo três e
mantendo excedente); vermelho direto e expulsão por segundo amarelo suspendem
por um jogo cada. O segundo amarelo exige dois CA e não soma esses cartões ao
acumulado. Suspensões pendentes são cumpridas por jogo finalizado da mesma
equipe com participação explicitamente falsa; a participação suspensa é
bloqueada no editor e no servidor. Corrigir resultados recalcula as pendências.
O tipo do vermelho é obrigatório em novos resultados; vermelhos legados sem
tipo são tratados como diretos e avisados. A súmula em branco combina essas
suspensões com o Controle de punições manual, que permanece independente.
Cartões da comissão e contagem de cartões do ranking não mudam. Gols dos atletas atualizam o placar da equipe;
gols contra atualizam o placar do adversário. Ajustes diretos no placar permitem
gols administrativos ou sem autoria. Diferenças entre gols atribuídos e placar
geram aviso, não bloqueio. A coluna de assistências foi removida, preservando
os dados antigos armazenados. Resultados conservam a identificação das pessoas
para correções posteriores mesmo se saírem do elenco.

Somente placares principais de jogos **Encerrados** da fase de
classificação contam para a tabela geral e por grupo. O padrão é **3/1/0**
e desempate inicial por **vitórias, saldo de gols e gols pró**, configurável por
campeonato. A lista permite incluir, retirar e reordenar também **menos gols
sofridos**, **confronto direto entre duas equipes** e **menos amarelos/vermelhos**
(atletas e comissão dos jogos encerrados da primeira fase).
Empates residuais permitem registrar uma ordem final da organização, com motivo,
autor e data, separada por classificação geral ou grupo. Não há sorteio automático;
mudanças na situação esportiva podem exigir uma nova decisão.
Salvar, corrigir ou excluir recalcula a classificação; alterações
de outro navegador são consultadas pelo botão **Atualizar**.

As fases eliminatórias são selecionadas no cadastro do campeonato, sem
dedução pela quantidade de grupos. Distribuição de equipes e cruzamentos
continuam manuais neste MVP. Cada jogo permite baixar uma súmula básica em
PDF A4 paisagem, com logo AEUV, escudos disponíveis e painéis paralelos de
comissão e atletas ativos atuais, CPFs parcialmente mascarados e campos
manuais em branco. Elencos maiores continuam em folhas adicionais.
A emissão consulta obrigatoriamente o Controle de punições atual e marca
**SUSPENSO** em vermelho para punições manuais correspondentes e suspensões
automáticas apuradas antes do jogo impresso; falha de leitura do controle
manual bloqueia o PDF. O cálculo automático usa jogos finalizados da própria
equipe/competição em ordem de data, hora e ID e é recalculado, não congelado
como histórico. O controle manual não tem CPF ou ID de edição: nomes de
competição reutilizados exigem cuidado, e a consulta não representa o histórico
na data da partida
([critérios e limites](sistema-interno/campeonato/README.md#7-súmula-básica-em-pdf)).
Não há avanço automático, aplicação de punições em pontos nem integração do
placar com a súmula digital.

Consulte o [fluxo e limites do MVP](sistema-interno/campeonato/README.md#5-tabela-e-classificação).
Atualize **WebApp.gs e Index.html** no projeto interno e publique uma nova
versão da implantação para disponibilizar a funcionalidade.

### Súmulas finalizadas do campeonato

**Gestão do Campeonato → Súmula** (`sumula-campeonato`) permite a admin/diretoria
consultar e editar partidas **encerradas com resultado detalhado salvo**, em
todos os campeonatos, sem limite arbitrário de registros. Os filtros combinam
campeonato, rodada, equipe (mandante ou visitante) e data exata; a seleção
inicial abrange todos os campeonatos. **Limpar filtros** e **Atualizar** também
estão disponíveis. A lista retorna apenas metadados dos jogos e equipes, sem
CPFs nem eventos individuais; não migra ou altera cadastros.

**Consultar** usa exclusivamente os participantes e eventos salvos, em modo
somente leitura. **Editar resultado** usa o editor existente, mantendo as
verificações de revisão e o histórico das pessoas. Retorno, descarte e
salvamento preservam os filtros; salvar recarrega a lista. Alterações pendentes
exigem confirmação para sair, e gravações bloqueiam a navegação.
Jogos sem resultado detalhado (inclusive legados com apenas placar) permanecem
na Tabela e Classificação, mas não são apresentados como súmulas preenchidas.

Não confundir com **Súmulas Enviadas** da arbitragem. O PDF em branco da tabela
usa o elenco atual, não os eventos históricos, e não é oferecido nesta lista.
Veja [consulta de súmulas finalizadas](sistema-interno/campeonato/README.md#consulta-de-súmulas-finalizadas).

### Cadastro de associados

Reúne num só lugar quem são as equipes associadas, quem responde legalmente por
cada uma e qual documentação já foi entregue.

**Um registro por equipe.** O associado é a equipe; a pessoa aparece como
representante legal dela. Na edição, o sistema procura a equipe original na
planilha e atualiza a mesma linha, mesmo quando admin ou diretoria troca a
equipe no combo. A comparação ignora acentos, maiúsculas e espaços repetidos
(`chaveEquipe_`), então "Integração" e "INTEGRACAO" são a mesma equipe. O combo
de equipes vem da tela **Equipes**; no formulário de cadastro novo ele só
oferece equipes ainda sem registro; na edição também inclui a equipe atual.
O servidor impede equipe duplicada e CPF de representante já vinculado a outro
cadastro, antes de gravar ou enviar documentos. A troca preserva documentos e
data de criação, publica o cadastro para a equipe nova e remove a cópia da
equipe anterior. Não altera a equipe vinculada às contas do controle de acesso.
Perfis de consulta continuam sem permissão para editar.

#### Por que planilha e não um arquivo TXT

O controle de punições usa TXT porque só tem **um escritor**: a automação em
Python regrava o arquivo inteiro e o sistema apenas lê. Aqui várias pessoas
gravam e editam pela tela, uma de cada vez e sem ordem definida. Reescrever um
TXT inteiro a cada alteração abriria espaço para perder dados quando dois
cadastros acontecessem juntos.

A planilha resolve isso com pouco esforço: é nativa do Apps Script, o
`LockService` serializa as gravações, e a diretoria consegue abrir, filtrar,
conferir e corrigir na mão quando precisar. Um banco de dados de verdade
(Cloud SQL, Firestore) traria custo, credenciais e infraestrutura nova sem
ganho perceptível na escala da associação — algumas dezenas de registros.

#### Onde os dados ficam

| O quê | Onde |
| --- | --- |
| Dados do cadastro | Planilha `AEUV - Associados`, aba `Associados` |
| Documentos enviados | `Documentos - Associados/<EQUIPE>/` |

As duas são criadas dentro da pasta raiz `AEUV - Automação` pela função
`prepararAssociados()`, e os ids ficam nas propriedades de script
`ASSOCIADOS_PLANILHA_ID` e `ASSOCIADOS_PASTA_ID`. Se a planilha ou a pasta for
apagada, o sistema procura de novo pelo nome e recria se precisar.

A ordem das colunas (`ASSOCIADOS_COLUNAS`) é o que liga cada célula ao seu
campo. **Não reordene nem remova colunas** da planilha sem ajustar a constante:
os dados passariam a ser lidos trocados.

#### Campos

| Bloco | Campos |
| --- | --- |
| Equipe | Equipe associada, Situação |
| Representante legal | Nome completo, data de nascimento, CPF, RG, e-mail, telefone |
| Endereço | CEP, logradouro, número, complemento, bairro, cidade, UF |
| Documentação | Estatuto, ata de fundação, documento do responsável, comprovante de endereço, termo de associação, regulamento assinado |

O endereço é separado em campos em vez de um único texto livre: assim dá para
filtrar por cidade, conferir o CEP e aproveitar os dados depois, em mala direta
ou relatórios.

As quatro situações possíveis são 🟢 Ativo, 🟡 Pendente, 🔴 Inativo e ⚫ Suspenso.
Todo cadastro novo começa como **Pendente**.

Os documentos são **todos opcionais** — nem toda equipe tem estatuto registrado,
e a documentação costuma chegar aos poucos. Em vez de travar o cadastro, a tela
conta o que falta e mostra na coluna "Docs." e no indicador "Com documento
pendente". Aceita PDF, JPG, PNG e WEBP, até 5 MB por arquivo. Enviar um arquivo
novo **substitui** o anterior: a versão antiga vai para a lixeira, para a pasta
da equipe não acumular cópias.

#### Validações

O servidor refaz todas as conferências, porque o que o navegador envia nunca é
confiável:

- **CPF** com os dígitos verificadores calculados, recusando também sequências
  como `111.111.111-11`.
- **Data de nascimento** precisa existir no calendário (não passa `31/02`) e o
  representante precisa ser maior de 18 anos.
- **Telefone** com 10 ou 11 dígitos, **CEP** com 8, **UF** com exatamente duas
  letras, e-mail no formato esperado e nome completo com ao menos duas palavras.

CPF, telefone e CEP são guardados **somente com dígitos** e formatados na
exibição. Assim a busca funciona tanto por `52998224725` quanto pelo número
pontuado.

#### Permissões

| Perfil | Pode |
| --- | --- |
| `admin`, `diretoria` | Consultar, cadastrar e editar todas as equipes |
| `associado` | Apenas consultar, e só a própria equipe |
| `arbitragem` | Sem acesso à tela |

Quem só consulta vê a mesma tela, com os campos travados, sem botão de salvar e
sem campo de envio — mas com os links dos documentos disponíveis. A regra está
em `ASSOCIADOS_PERFIS_EDICAO` e é verificada de novo no servidor, dentro de
`salvarAssociado()`. O recorte por equipe do perfil `associado` está descrito em
[O associado só enxerga a própria equipe](#o-associado-só-enxerga-a-própria-equipe).

> **Atenção às permissões do Drive.** O sistema roda como *"Usuário que acessa"*,
> então a gravação acontece com a conta de quem está usando a tela. Admins e
> diretoria precisam de acesso de **Editor** à pasta `AEUV - Automação`; quem só
> consulta precisa de **Leitor**. Sem isso a tela abre, mas falha ao salvar.

No gerenciamento de elenco, uma falha de confirmação da gravação ou da
atualização do histórico exige **Recarregar elenco** antes de outra alteração.
O aviso substitui mensagens anteriores; erros de validação comuns continuam
permitindo corrigir o formulário. A releitura não corrige permissões do Drive.
Se um associado receber `Acesso negado: DriveApp`, conferir a autorização
Google e o acesso de edição da conta ao arquivo de elenco afetado, pois o
perfil do sistema não concede permissões Google. Não compartilhar a pasta
raiz inteira nem trocar a identidade de execução como atalho; acesso direto
de Editor ao JSON também permite alterar dados fora das regras do sistema.

#### Quando a tela acusa erro

Execute **`diagnosticarAssociados()`** no editor do Apps Script. A função
percorre pasta raiz → planilha → pasta de documentos → leitura e diz onde parou,
terminando com a contagem de associados. Rodar pelo editor também renova o
consentimento dos serviços usados pelo código, que é o que resolve a maior parte
dos erros de permissão.

### Como acrescentar uma funcionalidade
1. Inclua um item em `MODULOS` no `WebApp.gs`, com um `id` único e a lista de
   `perfis` que podem vê-lo.
2. Se for só um atalho para um endereço externo, use `tipo: 'link'` com a chave
   `url`. Nada mais é necessário.
3. Para uma tela própria, use um `tipo` novo e trate-o em `renderizarModulo()`
   no `Index.html`.
4. Se a tela precisar de dados, crie a função correspondente no `WebApp.gs` e
   chame-a com `google.script.run`. **Repita a verificação de permissão no
   servidor**, como faz `listarUsuarios()`: o que o navegador envia nunca deve
   ser considerado confiável.
5. Para recolher o módulo num submenu, declare `grupo` com o id de um item de
   `GRUPOS` e posicione-o junto dos irmãos na lista.
6. Publique uma nova versão da implantação.

A navegação usa o fragmento do endereço (`#usuarios`, `#notas`), então cada
módulo pode ser guardado nos favoritos e o botão "voltar" funciona. No celular o
menu fica recolhido atrás do botão "Menu do sistema" e se fecha sozinho ao
escolher uma opção.

## Operação e manutenção

- Mantenha os aplicativos em projetos GAS separados. Os arquivos HTML devem
  continuar se chamando `Index` (no sistema interno também `Estilos`, `Negado` e
  `Ponte`); as funções chamadas pela interface são `salvarInscricao()`,
  `salvarSumula()`, `listarUsuarios()`, `salvarUsuario()`, `removerUsuario()`,
  `listarPunicoes()`,
  `listarSolicitacoes()`, `listarSumulas()`, `listarNotas()`,
  `listarRegulamentos()`, `listarAssociados()`, `salvarAssociado()`,
  `listarFinanceiro()`, `salvarLancamentoFinanceiro()` e `removerLancamentoFinanceiro()`.
- Ao alterar equipes, competições ou outros dados de configuração, atualize as
  opções da interface e as validações do servidor em conjunto.
- Mantenha a conta executora com acesso às planilhas, pastas e logo; verifique
  também as permissões dos arquivos gerados.
- No sistema interno, revise periodicamente a lista de autorizados e remova
  quem deixou a diretoria. Mantenha sempre pelo menos um `admin`.
- Para investigar falhas, confira as execuções do Apps Script e as permissões
  dos serviços Google. Erros do servidor são exibidos no formulário; no sistema
  interno, use `diagnosticarAcesso()` para problemas de acesso,
  `diagnosticarPunicoes()` para a leitura do controle de punições,
  `diagnosticarSolicitacoes()` para a consulta das solicitações e
  `diagnosticarAssociados()` para o cadastro de associados.
