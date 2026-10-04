# Gestão do Campeonato — MVP

## Objetivo

**Fluxo implementado nesta etapa:** Banco de Dados de Equipes com escudo no
Drive → Equipes participantes (seleção do campeonato e vínculo de equipe
existente) → Gerenciar elenco (Atletas / Comissão técnica, cadastro e importação
de inscrições anteriores da mesma equipe). Admin/diretoria envia o link de inscrição; o associado autenticado
por e-mail autorizado só acessa sua equipe em campeonatos vinculados.
Consulte [armazenamento e permissões](../../README.md#equipes-participantes-e-meu-elenco).

**Operação de jogos:** **Tabela e Classificação** reúne jogos e rodadas,
classificação, manutenção dos grupos e fases, cadastro de campos e critérios
de pontuação/desempate no contexto do campeonato selecionado.

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
