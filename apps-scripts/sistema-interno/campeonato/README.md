# Gestão do Campeonato — MVP Fase 1

## Objetivo

**Fluxo implementado nesta etapa:** Banco de Dados de Equipes com escudo no
Drive → Equipes participantes (seleção do campeonato e vínculo de equipe
existente) → Gerenciar elenco (Atletas / Comissão técnica, cadastro e importação
de inscrições anteriores da mesma equipe). Admin/diretoria envia o link de inscrição; o associado autenticado
por e-mail autorizado só acessa sua equipe em campeonatos vinculados.
Consulte [armazenamento e permissões](../../README.md#equipes-participantes-e-meu-elenco).

Criar uma área inicial para operar campeonatos dentro do `sistema-interno`, seguindo o mesmo padrão visual e estrutural já usado no projeto.

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
- **Banco de Dados de Atletas** permanece como consulta administrativa geral
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
- inscrições removidas também aparecem, identificadas como anteriores; impedimentos
  por CPF (inclusive outro tipo ou equipe no destino), nomes similares ou dados
  obrigatórios inválidos aparecem na lista e desabilitam a seleção
- vincular atleta à participação atual
- manter histórico de inscrição

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

### 5. Jogos
Operação básica dos jogos do campeonato:

- gerar confrontos
- vincular mandante e visitante
- definir rodada
- lançar resultado
- atualizar status do jogo

### 6. Disciplina
Controle inicial de eventos disciplinares:

- cartões amarelos
- cartões vermelhos
- suspensão automática
- suspensão manual
- zeragem de cartões por regra configurada

### 7. Súmula
Geração da súmula básica do jogo:

- dados da partida
- times
- atletas relacionados
- árbitros / responsáveis
- placar
- eventos principais
- impressão ou visualização

---

## O que fica pendente para próximas fases

- estatísticas avançadas por atleta
- classificação automática completa
- relatórios e PDFs
- portal público
- carteirinha
- seleção da rodada
- artes e divulgação
- regras avançadas de disciplina

---

## Estrutura sugerida do módulo

### Menu principal
- **Gestão do campeonato**

### Submenus
- **Campeonatos** (dados do campeonato e forma de disputa)
- **Equipes participantes** (elenco por equipe e campeonato)
- **Jogos**
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
