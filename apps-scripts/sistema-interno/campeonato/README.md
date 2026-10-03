# Gestão do Campeonato — MVP Fase 1

## Objetivo

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

### 2. Grupos e Rodadas
Configuração da estrutura esportiva da competição:

- grupos
- quantidade de vagas por grupo
- rodadas
- fases
- identificação das rodadas
- organização dos jogos por fase

### 3. Times
Cadastro de times da competição com opção de reaproveitamento:

- criar time novo
- importar time já cadastrado em outro campeonato
- manter histórico de participação
- evitar duplicidade de cadastro

### 4. Atletas
Cadastro dos atletas vinculados aos times:

- cadastrar atleta novo
- importar atleta de outro time/competição
- reaproveitar cadastro anterior
- vincular atleta à participação atual
- manter histórico de inscrição

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
- **Campeonatos**
- **Grupos e Rodadas**
- **Times**
- **Atletas**
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

