# TODO

## Novas implementações

#### 🚀(Da para esperar) ✅(Feito) 🆕(Nova Funcionalidade) ⛔(Bug) ⚠️(Precisamos atacar)

- [✅] **TD1 — Pendente — Financeiro e Prestação de Contas:** adicionar um status "Pendente" (esse status nao sai nos reports), ou seja, vai ser usado para controle na tela para filtrar ate pessoal regularizar o pagamento.

- [✅] **TD2 — Concluída — Implementar item ja existente no Menu "Atletas"** (banco de dados de todos os atletas inscritos em nossas competições).
  - Carga Inicial (Segue Planilhas exportadas no ifut para fazer uma carga inicial):
    - Avaliar um arquivo antes e analisar quais campos fazem sentido ter no cadastro de atleta.
    - Executar cadastrado na base de dados da associação para esses arquivos exportados dos ultimos campeonatos: <https://drive.google.com/drive/folders/1ByAsDKYFTpT0U5PXk6cnA5DkqscSboCY>.
      - Validar: Se o atleta ja existe atualizar. Se nao existir incluir um novo. A ideia no final e ter as informacoes atualizadas finais do atleta "historico de participação nas competições da associação e qual equipe atual ele se encontra cadastrado" (na planilha tem a data de inclusão no ifut entao sabemos qual foi a ordem).
      - Na planilha tem 2 colunas de documentos o RG e CPF porem pode ter competições que o RG foi usado com o valor do CPF do atleta nesse casos avaliar a coluna "RG" qual informação se aplica a CPF e na hora de inserir inserir como CPF.

      Todos registros do SUPER LIGA Uniao ja estoa na base.

- [🆕] **TD3 — Pendente — Em "Disciplina":**
  - Vai ter o filtro do campeonato ao seleciona e retornado a lista em abas de Pendurados, suspensos. Podendo fazer 2 ações zerar suspensos zera pendurados (isso influencia se o atleta vai estar disponível para jogo na súmula) poderia ter gráficos de cartão, média para o camepaonto e por time. Poderia ter um botão para gerar atletas suspensos e pendurados naquele momento um PDF com as informações no layout da súmula por exemplo para seguir um padrão.
  - Nesse sistema de punição é importante garantir que se o atleta tiver suspenso (vai aparecer na súmula como suspenso) após registro daquele jogo manual o mesmo cumprindo no próximo jogo vai estar disponível ou seja se ele cumpriu um jogo tem que zera para esse atleta esse controle.
  - Avaliar a melhor forma de centralizar as punições pois hj temos um fluxo automatizado que após o árbitro enviar um relatório do jogo nos rodamos a automação Python que vai avaliar punição conforme regulamento (punições extras fora dado no jogo) e será gerado a nota e registrado em controle de punições. Temos essas punições e temos aos punições de jogo avaliar melhor forma.

- [🆕] **TD4 — Pendente — Em "Estatisiticas":**
  - Aqui podemos ter um filtro do ranking por competição ou geral da associação (todos campeonatos).
  - Ranking de Artilheiro goleiro menos vazado, cartões amarelhos cartões vermelhos.
  - Ranking De equipes com mais vitorias.

- [✅] **TD5 — Concluído:** "Equipes participantes" agora mostra o loading padrão (overlay com spinner, o mesmo do Controle de punições) ao desvincular uma equipe; o overlay cobre a ação e a recarga da tela.
- [⁉️] **TD6 — Pendente:** Ao tentar desvincular uma equipe se tiver atleta nao deixar essa regra nao precisa: `Error: Não é possível remover este time porque ele possui 2 atleta(s) e 0 membro(s) da comissão vinculados.`
- [✅] **TD7 — Concluído (não era bug):** No "Novo jogo" os selects Mandante/Visitante só listam os times do grupo escolhido. O caso era falta de distribuir os times no grupo (aba "Grupos e fases" → "Distribuir times nos grupos"); após distribuir, os times aparecem normalmente. Melhorias aplicadas no front: ao abrir o Novo jogo, pré-seleciona automaticamente o primeiro grupo com 2+ times e popula os selects; a mensagem de apoio passou a distinguir "escolha um grupo" x "nenhum grupo tem 2 times (distribua na aba Grupos e fases)" x "este grupo tem menos de dois times". Possível melhoria futura: auto-atribuir as equipes ao grupo quando o campeonato tem um único grupo, eliminando o passo manual.

## Melhorias

- [🚀] **TD8 — Pendente — Melhoria:** Ver uma forma de ficar escutando os diretórios para executar os fluxos ou ver uma forma de criar um sheduled de execução do BE.

- [✅] **TD9 — Concluída — Melhoria:** No "Controle de Punições" ter o historico do atleta dentro da associação se ele é reincidente ou nao ate pq em caso de reincidencia conforme regulamento as punições muda.
  - Reincidência identificada por nome + equipe (sem janela temporal), somando controle oficial (TXT) + punições retroativas (JSON). Conta para qualquer pessoa registrada no campeonato (atleta, comissão técnica, dirigente); só penalidades de equipe ficam de fora. Julgamento Python aplica regras fixas (ART 22 §5º e ART 24 §2º = suspensão até 2 anos; demais = +1 partida) e injeta o histórico no modo IA.

- [✅] **TD10 — Concluída:** Todos loading do sistema poderia deixar a tela com um preto transparente ou um blur com o loading carregando para o usuario saber que esta carregando algo a mais na usabilidade.
  - Criado overlay global (`mostrarOverlayGlobal_`/`removerOverlayGlobal_`): fundo escuro translúcido + blur + spinner, com suporte a tema escuro e "reduzir movimento". Aplicado nas ações de gravação/exclusão: Usuários (salvar acesso), Permissões de perfil, Equipes (salvar), Campeonatos (salvar), Associados (salvar e excluir). A carga inicial de cada tela mantém o `blocoCarregando` (logomarca + barra), que mostra a estrutura surgindo; Punições já tinha overlay próprio. Fluxos de elenco/tabela ficaram de fora por terem loading próprio.

- [🚀] **TD11 — Pendente:** Criar uma suite de teste para o sistema-interno.
  - apos toda modificação sendo rodar os testes para garantir que nada quebre.
  - Toda nova impelmatação ir acrecentando testes nesta suite.

- [✅] **TD12 — Pendente:** Na tela de "Usuarios de sistema" poder adicionar ou retirar permissoes de telas para os tipos de perfils que tem hoje (Associado, Diretoria e Arbitragem).

- [✅] **TD13 — Pendente:** No "Banco de Dados de Atletas" o agrupamento e feito pelo CPF (provavelmente) como segundo campo seria bom agrupar também pelo "Nome Completo", pois em caso que o CPF estiver vazio para alguma linha (pq as incrições por portabilidade o CPF aparece vazio como nao informado).

- [✅] **TD14 — Concluída:** No "Financeiro e Prestação de Contas" ter um olho para ocultar a exibição de valores de toda a tela. **OK**

- [✅] **TD15 — Concluída:** Tela "Solicitações de Inscrições" ao entrar na teal nao precisar carregar todos registros novamente ou so carrega so os que esta com status diferente de Processado ou os rgistros ja processados ter uma pre-carga ja feita para nao precisar toda vez consultar + os as novas solicitações ver a melhor forma pois a funcionalidade esta lenta.

- [✅] **TD16 — Concluída:** No projeto python hoje o "Relatorio Financeiro" e gerado local `download/financeiro`, precisamos quando for gerado fazer o upload tambem no drive.
  - Adicionar na funcionalidade "Financeiro e Prestação de Contas" talvez ter um botão na tela para abrir sempre o ultimo relatório gerado ou ter uma tela a parte com os reltorios financeiros gerados ver a a melhor forma.

- [🚀] **TD17 — Pendente:** Adicionar um sininho de cotificacões e um local para cadastrar elas.
  - Vencimento do domínio do site Renova em 6 de ago. de 2027): <https://manage.wix.com/dashboard/674f5ab4-5304-4677-8de2-217c92b3f48d/domain-settings?referralInfo=site-details-subscriptions-widget>.
    - Estender: <https://manage.wix.com/wix/api/domainStartRenew?metaSiteId=674f5ab4-5304-4677-8de2-217c92b3f48d&domainName=aeuv.org&referralAdditionalInfo=mydomains__domaininfotab>.
  - Todo mes contador.

- [✅] **TD23 — Concluída (operacional):** Subir ao Drive e publicar os dados das punições retroativas:
  - `AEUV - Punicoes Retroativas.json` na pasta raiz do Drive do projeto (o Apps Script lê de lá) e manter a cópia em `downloads/sumulas/` (o Python lê de lá).
  - Publicar a versão do Apps Script com as mudanças desta rodada e rodar "Recalcular agora" no Banco de Atletas.

## Evoluções

- [🚀] **TD18 — Pendente:** Fazer o projeto "rodar no app" pode ser "rodando como VIEW em uma aplicativo (para Android e iOS)".
  - Avaliar qual melhor estrateria se e usar:
    - Usar o que ja tem como VIEW dentro do app (mesmo desenvolvimento para tudo).
    - Ou desenvolver tudo para mobile (ou ter algo a parte).
  - Subir na "Aple Store" e "Google Store".
    - Qual o custo para fazer isso com que ja tenho configurado no projeto.

- [⚠️] **TD19 — Pendente:** Adicionar um "step a mais no fluxo de inclusao e portabilidade". (avaliar como esta estruturado hoje a funcionalidade de Atletas)
  - Apos registrar no ifut, gerar os resultados (TXT e CPF) e Atualizar planilha de controle que ja faz hoje o que o step faria:
    - Inserir os atletas no banco de dados da associação funcionalidade "Atletas" (para termos syncado todo atleta registrado nos campeonatos da associação).
    - Se o Atleta ja existir registrado atualizar.

## Avaliar Performance

- [🚀] **TD20 — Pendente — Prioridade: Performance** A performance esta muito ruim para consultas as informações e retornar e pensa que estamos com uma base de teste com poucos registros. Avaliar o que pode ser feito.
  - Exemplo consulta de Equipes participantes (demorou 1 minuto).
  - Exemplo Tabela e Classificação (demorou 29 segundos).
  - Exemplo Editar ou adicionar um Jogo (demorou 57 segundos).

## Orientações de limpeza de base do banco de dados de atletas

#### Deletar dados de testes

Criei a rotina de limpeza no `WebApp.gs` local. Não executei nada no seu Drive. Ela remove os históricos dos elencos de teste dos dois modelos, inclusive vínculos de pessoas que também aparecem em solicitações reais, e impede que pendências antigas recriem esses registros.

Depois de copiar o `WebApp.gs` atualizado para o Apps Script e salvar, execute como administrador:

1. `simularLimpezaHistoricoElencosTeste` — não altera nada; mostra o resumo nas Execuções.
2. `executarLimpezaHistoricoElencosTeste` — cria e confirma um backup antes da limpeza. O ID do backup aparece nas Execuções.
3. No Banco de Dados de Atletas, clique em **Recalcular agora** e depois **Atualizar**.

Funciona com a flag ligada ou desligada e bloqueia a limpeza se ainda houver algum campeonato.

Solicitações de inscrição/remoção, punições e súmulas são preservadas. Portanto, pessoas dessas fontes continuam aparecendo. Os documentos antigos de recuperação e o backup também ficam preservados; a limpeza retira os vínculos de teste do histórico utilizado pelo Banco, sem apagar fisicamente esses arquivos de segurança.
