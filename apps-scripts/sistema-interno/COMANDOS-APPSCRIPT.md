# Funções do Apps Script — Guia Rápido (Sistema Interno)

Funções do `WebApp.gs` que podem ser **executadas diretamente no editor do Apps Script**
(sem passar pela tela), para manutenção, socorro e diagnóstico.

## Como executar

1. Abra o projeto **sistema-interno** no Apps Script.
2. No editor, abra o arquivo **`WebApp.gs`**.
3. Na barra do topo, no seletor de funções (ao lado de **Executar**/**Depuração**),
   escolha a função desejada.
4. Clique em **Executar**.
5. Veja o resultado em **Registro de execução** (logs) e, quando houver, em **Execuções**.

> **Atenção:** rodar no editor executa **com a sua conta** (normalmente o admin dono do
> projeto). Funções que exigem administração só funcionam para quem é admin. Operações que
> alteram dados (limpeza, recálculo, publicação) agem sobre o Drive/planilha reais — use com
> cuidado e confira o log.

---

## 1. Acesso e diagnóstico

- **`diagnosticarAcesso`** — refaz, passo a passo, o que a abertura do sistema faz
  (identificação, logo, módulos, template) e loga onde falha. Útil para descobrir por que
  um perfil não entra. Roda como você.
- **`diagnosticarAcessoComoEmail`** — mesmo diagnóstico, mas simulando a identificação de um
  e-mail específico. Como o editor não deixa passar argumento direto, crie uma função curta:
  ```javascript
  function testarAssociado() {
    return diagnosticarAcessoComoEmail('email-do-associado@gmail.com');
  }
  ```
  Selecione `testarAssociado` e Execute.

## 2. Usuários e permissões (socorro)

Use estas quando ninguém mais conseguir entrar ou a tela "Usuários do sistema" estiver
inacessível.

- **`definirUsuariosAutorizados`** — regrava a lista padrão de autorizados (do código) por
  cima da propriedade. Recupera o acesso quando a lista salva ficou inválida.
- **`restaurarUsuariosPadrao`** — remove a lista personalizada e volta a valer a lista padrão
  do código.
- **`restaurarPermissoesPadrao`** — remove a matriz de permissões por perfil personalizada e
  volta ao padrão definido em `MODULOS`.

## 3. Banco de Atletas

- **`recalcularBancoAtletas`** — gera um novo snapshot do Banco de Atletas (relê elenco,
  solicitações, punições e súmulas e consolida). Equivale ao botão "Recalcular agora" da tela.
- **`obterStatusBancoAtletas`** — mostra o estado do snapshot (data da última geração,
  se está em recálculo, se há agendamento).
- **`configurarAgendamentoBancoAtletas`** / **`desativarAgendamentoBancoAtletas`** —
  liga/desliga o gatilho periódico que recalcula o banco automaticamente.

## 4. Histórico de elencos (consolidação em segundo plano)

- **`processarHistoricoElencoAgora`** — processa a fila pendente de consolidação do histórico
  de inscrições dos elencos.
- **`obterStatusFilaHistoricoElenco`** — mostra o estado da fila (última execução, pendências).
- **`configurarAgendamentoHistoricoElenco`** / **`desativarAgendamentoHistoricoElenco`** —
  liga/desliga o gatilho periódico da consolidação do histórico.
- **`simularLimpezaHistoricoElencosTeste`** — **não altera nada**; mostra o que uma limpeza
  de histórico de teste removeria. Só funciona numa base **sem campeonatos**.
- **`executarLimpezaHistoricoElencosTeste`** — executa a limpeza do histórico de teste (cria
  backup antes). Só numa base **sem campeonatos**; preserva solicitações, punições e súmulas.
  Depois, use "Recalcular agora" no Banco de Atletas.

## 5. Solicitações de inscrição (pré-carga)

- **`recalcularSnapshotSolicitacoes`** — regera a pré-carga (snapshot) das solicitações
  processadas que acelera a tela. Exige pasta/dono da pré-carga configurados.
- **`obterStatusSnapshotSolicitacoes`** — estado da pré-carga de solicitações.

## 6. Índices de validação

- **`reconciliarIndicesValidacaoAgora`** — reconcilia os índices de validação usados nas
  operações de elenco.
- **`obterStatusIndicesValidacao`** — estado da reconciliação dos índices.
- **`configurarAgendamentoIndicesValidacao`** / **`desativarAgendamentoIndicesValidacao`** —
  liga/desliga o gatilho periódico dessa reconciliação.

## 7. Equipes, associados e logo

- **`publicarEquipesAgora`** — republica o arquivo de equipes (`equipes.json`) no Drive, que
  os formulários de inscrição e de súmula leem. Útil antes da primeira edição pela tela.
- **`prepararAssociados`** — cria (ou reaproveita) a planilha e a pasta de documentos dos
  associados na pasta raiz do projeto. **Execute uma vez**, com a conta dona da pasta raiz.
- **`publicarCadastrosAssociados`** — republica no Drive os cadastros de associados (útil após
  edição manual da planilha).
- **`lerLogoParaOtimizacao`** / **`salvarLogoOtimizado`** — apoio ao recurso de otimização do
  logo (a tela de Administração usa; raramente necessário pelo editor).

---

## Observações

- Prefira sempre fazer pela **tela** quando houver opção equivalente (Recalcular agora,
  Configurar agendamento, etc.). As funções do editor são para manutenção e socorro.
- Funções `listar...` (ex.: `listarAtletas`, `listarPunicoes`) são chamadas pela interface e
  retornam dados para a tela; rodá-las no editor serve apenas para inspeção, não para operar.
- As operações de agendamento criam/removem **gatilhos time-based** na sua conta; o dono do
  agendamento é a conta que executou a configuração.
