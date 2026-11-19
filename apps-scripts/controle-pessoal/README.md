# Controle pessoal — Diego Machado / Iris Marta / Edifício Lisboa

Projeto Google Apps Script **independente** dos sistemas da AEUV. Não copiar estes
arquivos para o Sistema Interno existente. Não precisa executar Python para funcionar.

## Situação da entrega

- Backend, interface responsiva e importação seletiva implementados localmente.
- **Pasta privada criada no Meu Drive da conta administradora**:
  [Diego Machado - Controle Pessoal e Edificio Lisboa](https://drive.google.com/drive/folders/1EcpSh4SOtasiFl4FW_HdG0zGm1D7sbXl).
- `CP.pastaExistenteId` aponta para essa pasta; a preparação a reutiliza.
- Nenhum lançamento real foi importado e nenhuma planilha original foi alterada.
- **Publicação do Web App ainda necessária**, conforme os passos abaixo. Não há
  URL `/exec` publicada por esta entrega nem página pública no portal da AEUV.

## Publicar pela primeira vez

1. Entre em [script.google.com](https://script.google.com/) com
   **deejaydiego@gmail.com**, crie um novo projeto e nomeie-o “Controle pessoal — Diego Machado”.
2. Crie dois arquivos de script: **WebApp** e **Importacao**. Copie os respectivos
   `.gs` desta pasta. Não crie outro `doGet` no arquivo padrão `Code.gs`.
3. Crie os arquivos HTML **Index**, **Estilos**, **Relatorios** e **Cliente**, copiando os arquivos
   `.html` de mesmo nome. Não copiar a pasta `tests/` para o Apps Script.
4. Em Configurações do projeto, habilite a exibição do manifesto e substitua
   `appsscript.json` pelo desta pasta. O manifesto inclui o serviço avançado **Drive v3**.
   Confira em Serviços que Drive está habilitado. Em projeto Cloud padrão isso é
   automático; em projeto Cloud próprio, habilite também a API Google Drive no Cloud.
5. Execute **prepararSistema** pelo editor. Autorize os escopos solicitados:
   e-mail, Google Drive e Google Sheets. A função reutiliza a pasta privada e
   cria somente a primeira versão vazia dos dados. Pode ser repetida.
6. Confira no Drive que pasta e arquivos estão com **Acesso geral: Restrito**,
   sem leitores, editores externos, grupos ou permissões herdadas. Não mover
   a pasta para uma árvore compartilhada; não publicar os JSONs na web.
7. Clique em **Implantar → Nova implantação → Aplicativo da Web**:
   - **Executar como: Usuário que acessa o app da Web** (`USER_ACCESSING`).
   - **Quem tem acesso: Qualquer pessoa com Conta do Google** (`ANYONE` no manifesto).
   - Essa opção exige login Google; **o servidor só aceita o e-mail acima**.
     Não escolher acesso anônimo (`ANYONE_ANONYMOUS`) nem execução como proprietário.
8. Abra a URL terminada em **`/exec`** com a conta administradora e aceite os
   escopos. Teste outra Conta Google: deve aparecer “Acesso restrito” sem dados.
9. Para atualizações, copie os arquivos alterados e use **Gerenciar implantações →
   Editar → Nova versão**, mantendo a identidade de execução e a mesma URL.

O botão **Preparar sistema** também funciona na primeira abertura. Se o e-mail
não estiver disponível na sessão, o sistema bloqueia: não há fallback para o
proprietário. Todas as consultas e mutações revalidam a conta no servidor.
O app não é embutido em iframe externo, para evitar problemas com o login Google.

## Modo noturno e visão geral compacta

- O botão **Modo noturno / Modo claro**, no cabeçalho de todas as páginas,
  alterna a aparência sem consultar ou alterar os dados financeiros.
- A primeira abertura acompanha a preferência clara/escura do dispositivo.
  Depois de uma escolha manual, o tema é salvo no navegador (`localStorage`,
  chave `meu-controle-tema`). Apenas o tema é salvo, nunca dados financeiros.
  Se o navegador bloquear esse armazenamento, a alternância continua funcionando
  na sessão, mas pode não ser preservada após recarregar.
- Tabelas, formulários, confirmações, avisos e loading acompanham o tema.
  Impressão e PDFs continuam com fundo claro.
- A visão geral destaca **Saldo final de caixa** e **Resultado previsto**, com
  resumos independentes para Diego, Iris e condomínio. Mostra a receber, a pagar
  e vencidos/pendentes; valores zerados dessas pendências ficam neutros.
- **Detalhes de planejamento e caixa** expande os demais indicadores. Os dez
  indicadores anteriores continuam disponíveis, com os mesmos cálculos.
- **Ver financeiro** abre a pessoa correspondente; **Ver checklist** abre as
  manutenções. A visão anual mantém a evolução dos 12 meses de cada escopo.
- O saldo final corresponde ao fim do período selecionado, não necessariamente
  ao saldo de hoje. O checklist independe desse período.

### Atualizar o sistema já publicado

1. No projeto Apps Script **controle-pessoal**, substitua **Index.html**,
   **Estilos.html** e **Cliente.html** pelos arquivos desta pasta, juntos.
2. Use **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**,
   mantendo a URL e as permissões existentes; reabra a URL `/exec`.
3. Confira os temas, os detalhes expansíveis, os atalhos e as visões mensal/anual
   no computador e no celular.

Não executar `prepararSistema`, reimportar planilhas ou alterar a base do Drive.
Esta atualização não modifica o backend nem os cálculos dos relatórios PDF.
Os testes locais de interface ficam em `tests/test_browser_smoke.py`.

## Logo e ícone próprios — Meu controle

A marca combina barras financeiras azuis e um check verde sobre azul-marinho,
representando organização e contas em dia. Substitui as iniciais “DM” no menu.
O SVG está incorporado ao **Index.html**, com descrição acessível, e não depende
de internet ou de imagens do Drive para aparecer dentro do sistema.

Arquivos reutilizáveis em **`docs/assets/meu-controle/`**:

- `logo.svg`: original vetorial, ampliável sem perder qualidade.
- `icon-512.png`: logo para imagens e atalhos.
- `icon-192.png`: ícone usado na aba do Apps Script.
- `icon-32.png` e `favicon.ico`: formatos para sites e outros atalhos.

Para regenerar os PNGs/ICO, execute `python apps-scripts/controle-pessoal/gerar_icones.py`
na raiz do projeto, com Pillow instalado. Não copiar esse script para o Apps Script.

### Aplicar no sistema já publicado

O favicon agora usa **jsDelivr**, servindo somente o PNG já publicado no repositório,
com URL fixada no commit que contém a imagem:

https://cdn.jsdelivr.net/gh/diegomachadoti/aeuv-ifut-manager@4c92b0d/docs/assets/meu-controle/icon-192.png

O endereço foi verificado: HTTP 200, `image/png`, 192 × 192 pixels. Não depende da
branch configurada no GitHub Pages, de publicar o portal ou de unir branches.
Mudanças em outras branches não substituem essa imagem, pois a URL aponta ao commit.
Não altera nem publica os outros Apps Scripts. O repositório/commit precisa continuar
acessível publicamente; não exponha dados privados ou credenciais para hospedar o logo.

1. Para corrigir somente o favicon, copie **WebApp.gs** atualizado para o projeto
   **controle-pessoal** no Apps Script. Index/Estilos já instalados não precisam mudar.
2. Use **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**.
   Mantenha a mesma URL e as permissões atuais.
3. Feche e reabra a aba; teste em janela anônima se o navegador mantiver o ícone antigo.

O Google Apps Script exige `.setFaviconUrl()` com uma imagem pública HTTPS; uma tag
`link rel="icon"` no HTML interno não troca o ícone da aba externa do aplicativo.
O Drive não é recomendado para favicon: links de compartilhamento podem mostrar
uma página, exigir login ou redirecionar em vez de entregar a imagem diretamente.
Não torne a pasta de dados privada do sistema pública para hospedar o ícone.
Para trocar o logo no futuro, publique o novo PNG, teste a URL CDN com o novo commit
e ajuste somente `CP.faviconUrl`; a nova URL também evita reutilizar o cache antigo.

Não executar `prepararSistema`, reimportar dados ou alterar os arquivos financeiros.
A logo interna é SVG incorporado e continua independente da hospedagem do favicon.

### Loading próprio

Consultas, salvamentos e operações de importação usam uma tela de espera com
a logo, anel animado e orientação para aguardar antes de repetir a operação.
Abertura/atualização mostra “Carregando seus dados…”; alterações mostram
“Salvando alterações…”. O indicador permanece até a resposta e a reconsulta
dos dados, inclusive dentro do cadastro, e desaparece também em caso de erro.
Os controles mantêm o bloqueio existente durante o processamento.

O SVG é local ao HTML, sem imagens externas. O texto é anunciado como status
para leitores de tela, e a preferência **movimento reduzido** desativa a animação.
Em navegadores com Popover API, o indicador usa a camada superior para cobrir
os modais; navegadores antigos mantêm a apresentação CSS disponível.

Para aplicar **somente o loading**, copie **Index.html**, **Estilos.html** e
**Cliente.html** juntos e publique uma **nova versão da implantação existente**.
Não é necessário atualizar o backend, hospedar imagens, preparar o sistema,
reimportar lançamentos ou autorizar novos escopos.

## Funcionalidades

| Menu | Recursos |
| --- | --- |
| Visão geral | Indicadores separados de Diego, Iris e Edifício Lisboa; mensal/anual e aviso de checklist. |
| Financeiro pessoal | Entradas, saídas, categoria, conta/cartão, meta de gasto, competência, vencimento, pagamento/recebimento, comprovante HTTPS e observações. Seletor Diego / Iris. |
| Serviços digitais | Valor, pessoa, cartão, ciclo mensal/anual, período de cobrança, portal e usuário sem senha. Total do mês por cartão e geração de subtotais financeiros. |
| IPTV → Clientes | Nome, telefone/WhatsApp, plano, valor mensal, vencimento, ativo/inativo e observações; filtros, renovação manual, avisos e CSV/PDF. |
| Edifício Lisboa → Financeiro e saldo | Movimentações, morador/unidade, baixas, pendências, resultado e saldo acumulado; mensal e anual. |
| Edifício Lisboa → Contatos | Fornecedores, tipos de serviço, telefone, e-mail e observações. |
| Edifício Lisboa → Simulações de gastos | Cenários de reforma/manutenção com materiais, mão de obra, outros custos, reserva para imprevistos e comparação com o caixa do condomínio. |
| Edifício Lisboa → Checklist | Prioridade, responsável, situação, última/próxima verificação, intervalo em dias e pendências; “Verificar hoje” agenda a próxima. |
| Administração → Importar planilhas | Prévia, seleção individual, avisos, comparação de saldo e proteção contra repetir itens. |
| Administração → Configurações / Drive | Link da pasta, saldos iniciais, cartão padrão, download JSON e histórico de alterações. |

As listas oferecem busca, exportação CSV e opções de abrir ou baixar PDF com layout próprio.
No financeiro também há filtros de pagos/recebidos, pendentes e vencidos. A busca
não reduz os indicadores: eles sempre representam o período inteiro.
No checklist, **Situação** oferece Todas, Pendente, Em andamento, OK e
Verificação vencida. A situação considera a próxima data: um item com verificação
vencida aparece nesse filtro mesmo se a última verificação foi OK. Busca e situação
são combinadas e restringem também CSV/PDF; trocar de página limpa os filtros.
Os financeiros de Diego, Iris e condomínio ordenam por vencimento crescente,
com registros sem vencimento no final (sem substituir a data pela competência).
O mesmo padrão vale nas visões mensal/anual e nas exportações da lista.

### Simulações de gastos do condomínio

**Simulações de gastos** substitui a tela **Contas de serviços**, removida do menu
e dos formulários. Os cadastros antigos de contas permanecem nos arquivos e no
backup JSON, sem serem apagados ou transformados em cenários automaticamente.

1. Abra **Edifício Lisboa → Simulações de gastos → Novo registro**.
2. Nomeie o cenário (ex.: Reforma da fachada) e preencha **Materiais**, **Mão de obra**,
   **Outros gastos** e **Reserva para imprevistos**, em reais. Campos sem custo usam zero.
3. A prévia mostra custo total, caixa atual registrado, saldo após o gasto e quanto
   faltaria quando o custo exceder o caixa. A reserva é um valor em reais, não percentual.
4. Salve o cenário para consultar, pesquisar, editar/recalcular, excluir ou exportar
   em CSV/PDF. A lista inclui os custos detalhados, referência salva, resultado salvo
   e uma comparação adicional com o caixa registrado de hoje.

O saldo considera **somente o condomínio**, a referência configurada e as baixas
desde essa referência **até hoje**, no dia de Brasília. Não inclui receitas previstas,
pagamentos anteriores à referência, caixa futuro ou saldos de outras pessoas. Não é
uma consulta bancária: confira lançamentos e saldo de referência com o extrato.
Se a referência começar no futuro, o saldo fica indisponível e o backend impede salvar.

**Cada cenário é uma alternativa independente**: salvar não cria despesas, não
reserva dinheiro e não reduz o saldo real. O custo total inclui todos os quatro campos.
O saldo/data de referência são calculados no servidor ao salvar, não aceitos do
navegador. Um cenário salvo preserva essa referência ao consultar; **editar e salvar**
atualiza a referência para o caixa de hoje. Versões anteriores continuam no histórico.
O mês/ano da tela financeira não filtra os cenários.

**Publicação:** atualize **WebApp.gs**, **Index.html** e **Cliente.html** juntos e
publique uma **nova versão da implantação existente**, mantendo Estilos/Relatorios
atuais. Não preparar a base, reimportar registros ou alterar permissões.

### Administração e clientes IPTV

**Administração** é um submenu recolhível com **Importar planilhas** e
**Configurações / Drive**. É uma reorganização da interface, não um novo perfil de
permissões: todo o aplicativo continua privado para a conta administradora.

Em **IPTV · Clientes**, cadastre nome, telefone/WhatsApp, plano, valor mensal,
vencimento/fim do acesso, status **Ativo/Inativo** e observações. Não guarde senhas.
O valor é armazenado em centavos e as datas aparecem em **DD/MM/AAAA**.

- A lista usa o cadastro inteiro, sem filtro de mês/ano; ordena por vencimento.
- Busca e situação: Todos, Ativos, Inativos, Vencidos, Vencem hoje e Próximos 2 dias.
  O filtro Ativos inclui ativos vencidos e próximos de vencer.
- Indicadores contam clientes no cadastro inteiro, sem reduzir pela busca/situação.
- Clientes ativos vencidos recebem destaque vermelho; inativos não geram avisos.
- **Renovar** pede uma nova data explícita, posterior ao vencimento atual e que não
  esteja no passado. Não acrescenta automaticamente 30 dias nem registra pagamento,
  receita ou alterações nos financeiros pessoais/condomínio. Para reativar um
  inativo, edite seu status primeiro. Renovação usa as mesmas proteções de revisão
  e snapshots do restante do sistema.
- O sininho inclui clientes ativos vencidos, para hoje e próximos 2 dias corridos;
  clicar no aviso localiza o cliente. CSV/PDF respeitam os filtros, sem misturar
  clientes com as entidades financeiras. A exportação contém contatos: é privada.
- Cadastro manual; não altera as fontes nem acrescenta importação de planilhas IPTV.

**Para publicar esta melhoria:** atualize **WebApp.gs**, **Index.html** e
**Cliente.html** juntos e publique uma **nova versão da implantação existente**.
Mantenha **Estilos.html** e **Relatorios.html** atuais. Não preparar a base,
reimportar registros, recriar projeto/pasta ou modificar permissões.

O backend atual lê os formatos antigos (`schema: 1` e `schema: 2`) e acrescenta
as coleções novas necessárias (IPTV e simulações) **somente em memória**, retornando
`schema: 3`. A consulta não grava dados nem muda o ponteiro; a próxima alteração
salva uma nova versão no formato 3 e preserva o arquivo anterior, inclusive contas
legadas. Dados corrompidos continuam recusados, inclusive coleção ausente/inválida
no formato novo. Após salvar no formato 3, não volte ao backend antigo, que não
conhece esse formato. O backup JSON de Administração inclui IPTV e simulações.

### Atenção a vencimentos e sininho de avisos

Nos financeiros de Diego, Iris e condomínio, vencimento anterior a hoje **sem baixa**
destaca a linha inteira em vermelho suave, com faixa lateral e **⚠ Vencido · sem baixa**.
Registros pagos/recebidos, sem vencimento ou vencendo hoje não recebem esse destaque.
A ordenação por vencimento, os filtros e os cálculos continuam iguais.

O **sininho no cabeçalho** reúne avisos de todas as pessoas e do condomínio:

- Lançamentos a pagar/a receber sem baixa: vencidos, para hoje ou para os próximos
  **2 dias corridos**, usando a data de vencimento, não a competência.
- Checklist: a próxima verificação segue a mesma antecedência, inclusive quando a
  última verificação foi OK. Itens sem próxima data não geram aviso por vencimento.
- IPTV: vencimentos de clientes ativos seguem a mesma antecedência; inativos ficam fora.
- Contador de itens e grupos **Vencidos**, **Hoje** e **Próximos 2 dias**; cada item
  identifica pessoa/entidade, prazo e valor financeiro, sem somar escopos diferentes.
- Os avisos independem do mês, ano, pessoa, busca e situação selecionados na tela.
  Clicar em **Ver item** abre a lista correta, ajusta pessoa/período e localiza o
  registro, sem registrar automaticamente baixa ou verificação.
- Avisos não são descartados apenas por abrir o painel: somem com a baixa ou mudança
  da próxima data; estornar a baixa pode trazer o aviso de volta.

São **avisos internos, com o aplicativo aberto**, sem e-mail, push ou permissões
adicionais. Usam os dados já consultados e o dia de Brasília; a mudança de dia é
reavaliada a cada minuto ou ao retornar à aba, sem interromper edições ou operações.
Use **Atualizar** para consultar alterações feitas em outra sessão e atualizar os
indicadores. Serviços/contas apenas cadastrados não criam avisos financeiros até
existir lançamento com vencimento; isso evita avisar duas vezes pela mesma cobrança.

**Para aplicar somente o destaque/sininho em uma base sem IPTV:** atualize **Index.html**, **Cliente.html** e **Estilos.html** e publique
uma **nova versão da implantação existente**. Não preparar a base, reimportar,
alterar permissões ou modificar o backend. Para cadastrar IPTV, atualize também **WebApp.gs** como descrito acima.

### Relatórios PDF com identidade própria

**Abrir PDF** mostra o documento A4 em uma nova aba para visualizar, imprimir ou
salvar pelo visualizador do navegador. **Baixar PDF** mantém o download direto.
O navegador precisa permitir pop-ups para abrir a aba; se bloquear, o sistema
orienta liberar pop-ups ou usar o download. A preferência do navegador para PDFs
pode determinar download em vez da visualização.
Disponível
no financeiro pessoal, condomínio, serviços digitais, contatos, contas e checklist.
A visão geral oferece **Abrir PDF da visão geral** e **Baixar PDF da visão geral**, com cada pessoa/entidade
em uma seção independente, sem misturar valores.

- Logo vetorial e cabeçalho azul-marinho em todas as páginas.
- Período, entidade, data de emissão, revisão dos dados e paginação.
- Indicadores organizados em cartões e tabelas com cabeçalho repetido, linhas
  alternadas e quebra automática de texto/página; orientação paisagem nas tabelas largas.
- Sem menus, botões de edição, seleção de baixa ou controles de formulário.
- Busca e situação respeitam a lista visível. **Os indicadores representam o
  período inteiro**, conforme a nota do relatório. Selecionar itens para baixa não
  restringe a exportação; use os filtros da lista.
- Serviços digitais continuam usando o **mês selecionado**, mesmo na visão anual.
- Listas vazias também geram PDF, identificadas como sem registros.

O loading aparece durante a geração. O PDF é criado inteiramente no navegador;
nenhum dado é enviado a um servidor de conversão, e nenhuma alteração é gravada
no Drive. Apenas o código das bibliotecas **jsPDF 4.2.1** e **jsPDF-AutoTable 5.0.9**
é baixado do CDN jsDelivr, com versões fixadas, na primeira exportação de cada aba.
Sem conexão ou com CDN bloqueado, o sistema mostra erro e libera os controles;
a exportação CSV permanece disponível. Compartilhe os PDFs com cuidado: são privados.

**Para aplicar:** crie um arquivo HTML chamado **Relatorios** no projeto Apps Script
existente e copie **Relatorios.html**. Atualize também **Index.html** e **Cliente.html**,
mantendo **Estilos.html** atual (inclui o loading). Publique uma **nova versão da
implantação existente**. Não executar preparação, reimportar dados ou alterar escopos.

**Para aplicar somente a opção de abrir PDF e o filtro de situação do checklist:**
atualize **Cliente.html** e publique uma **nova versão da implantação existente**.
Mantenha os arquivos Index/Relatorios da melhoria de PDF já instalada.
Não é necessário preparar a base, reimportar dados nem mudar o backend ou permissões.

### Pop-ups do sistema

Exclusão, estorno, baixa de pagamento/recebimento, verificação do checklist,
geração de subtotais, cópia mensal e confirmação final de importação usam uma
janela com a identidade do sistema, não `confirm`/`prompt`/`alert` do navegador.
Ela mostra o contexto da ação, oferece Cancelar/fechar/Esc e devolve o foco ao
botão de origem. Cancelar não envia alteração ao servidor. O fundo fica inacessível
enquanto a janela está aberta e não é possível abrir outra confirmação por cima.

Na baixa há campo de data em **DD/MM/AAAA**, com validação de datas futuras. Na cópia mensal há
seletor de mês/ano, sugestão do mês seguinte e validação para não copiar para o
mesmo mês de origem. Erros de preenchimento aparecem dentro do pop-up. Exclusão
e estorno destacam a ação em vermelho e começam com foco em Cancelar.
Os campos de dia em cadastro, edição e configuração também usam **DD/MM/AAAA**,
independentemente do idioma do navegador. Datas inexistentes são recusadas;
datas opcionais vazias continuam permitidas. O formato salvo/enviado ao backend
continua `AAAA-MM-DD`; competência e seletores de mês permanecem inalterados.

**Para aplicar somente a ordenação e o formato de datas**, atualize **Cliente.html**
e publique uma **nova versão da implantação existente**. Não é necessário alterar
o backend, preparar a base, reimportar registros ou mudar permissões.

Os pop-ups de cadastro/configuração e confirmação têm fundo branco explícito,
textos escuros e esquema de cores claro, inclusive com preferência de tema escuro
no navegador. Entradas são identificadas em verde e saídas em vermelho, com selo,
seta e valor destacados, sem depender apenas da cor para distinguir os tipos.

**Para aplicar as melhorias atuais no aplicativo já publicado**, atualize
**WebApp.gs**, **Cliente.html** e **Estilos.html** juntos no editor Apps Script.
Confira também que **Index.html** contém o modal `popup` da atualização anterior.
Publique uma **nova versão da implantação existente** e recarregue a página.
Não execute preparação novamente nem altere propriedades ou arquivos de dados.
A baixa em lote requer o novo backend; nenhum escopo/permissão adicional é exigido.

**Tela vazia após atualizar (ano/mês vazios e “Área privada”):** versões anteriores
do Cliente adicionavam eventos ao modal sem verificar sua existência no Index.
Publicar o Cliente novo com Index antigo sem `popup` interrompia o JavaScript
antes da consulta, sem evidenciar que os dados continuavam na fonte. O Cliente
atual cria o modal ausente antes de registrar eventos, sendo compatível com esse
Index antigo. Para corrigir, copie **Cliente.html** atualizado (e, preferencialmente,
**Index.html** atual), publique nova versão na mesma implantação e recarregue `/exec`.
Não reimporte, não recrie o projeto nem apague `CP_ESTADO`/`CP_PASTA_ID` ou JSONs.
Essa correção só modifica a interface; não recupera nem substitui dados por suposição.

O aviso de saída ao fechar/recarregar a aba com edição aberta ou operação em
andamento continua nativo: navegadores não permitem substituí-lo por um modal da
página. Impressão e seletores de calendário também continuam usando os recursos
próprios do navegador; não são caixas de confirmação de ações do sistema.

### Competência, pagamentos e saldo

- **Competência**: mês do planejamento. Entrada prevista, saída prevista,
  resultado previsto, a pagar/a receber usam esse mês.
- **Caixa**: usa a data real da baixa, mesmo quando diferente da competência.
  Exemplo: conta de novembro paga em dezembro aparece no planejamento de novembro
  e na saída de caixa de dezembro. Só lançamentos com baixa afetam o saldo de caixa.
- **Saldo inicial configurável** por pessoa/entidade: valor imediatamente anterior
  à data de início. Movimentos pagos anteriores a essa data são ignorados no caixa.
  Se iniciar no meio do mês, o caixa desse mês é parcial, a partir da data configurada.
  Meses inteiros anteriores ficam “Não disponível”.
- **Saldo acumulado** = saldo de referência + entradas baixadas − saídas baixadas
  desde a referência. O saldo final de um mês é o inicial do seguinte.
- **Baixa integral**: “Registrar baixa” informa a data real; “Estornar baixa”
  devolve a pendente. Para pagamentos parciais, divida em lançamentos separados.e- **Baixa dos selecionados**: marque as caixas da coluna Selecionar nos pendentes
  desejados, confira o contador e os totais de entradas/saídas e clique em
  “Registrar baixa dos selecionados”. “Selecionar todos” marca apenas os pendentes
  visíveis, e “Limpar seleção” desfaz as marcações. Itens já baixados têm a caixa
  desabilitada. Ao filtrar, itens ocultos saem da seleção; trocar pessoa, período,
  visão, página ou atualizar os dados limpa a seleção. Cancelar o pop-up preserva
  as marcações e não grava nenhuma baixa. A confirmação usa uma data real comum
  para apenas os registros marcados e as mesmas validações do lote abaixo.
  Para publicar esta melhoria, atualize **Cliente.html** e **Estilos.html** e crie
  nova versão da implantação existente. Reutiliza `pagarTodos` do **WebApp.gs**
  da atualização de baixa em lote; não precisa reimportar ou preparar a base.
- **Registrar baixa de todos (opcional)**: disponível no financeiro pessoal e
  do condomínio, com a quantidade de pendentes. Atua somente na pessoa/entidade
  e período exibidos, respeitando busca e filtro de situação. Em visão anual,
  abrange os pendentes filtrados do ano inteiro. O pop-up mostra quantidades e
  valores de entradas e saídas separadamente, solicita a data real comum e permite
  cancelar. Só use se todos realmente foram pagos/recebidos integralmente nessa
  data; para datas diferentes, use baixas individuais. Já baixados não entram no
  lote. Sem pendentes o botão fica desabilitado. Servidor valida todos os IDs,
  datas, pessoa/período e revisão sob lock antes de gravar uma única versão;
  seleção inválida não grava baixas parciais. O estorno continua individual.
- **Copiar mês**: copia lançamentos manuais/importados, apaga baixas e ajusta o dia
  de vencimento para o último dia existente (31 de janeiro vira 28/29 de fevereiro).
  Repetir a mesma cópia não duplica os mesmos registros de origem.
- Anual exibe os 12 meses e os totais. A projeção futura só contém registros que
  foram criados/copiados/gerados; não inventa despesas futuras.

### Serviços digitais e cartão sem dupla contagem

O cartão padrão é **Cartão Nubank Dany**, renomeável em Configurações. Isso muda
o padrão de novos cadastros; para alterar um cartão existente, edite cada serviço.
Cada pessoa/cartão tem uma linha financeira **Serviços digitais — nome do cartão**.

1. Cadastre/importar os serviços e confira cartão, pessoa, período e valor.
2. Selecione o mês e clique em **Gerar subtotais do mês**.
3. Cada subtotal guarda uma cópia dos nomes/valores e entra como saída pendente.
4. Lance a outra despesa do cartão como **restante da fatura**, excluindo os
   serviços já registrados. Ex.: fatura R$ 600, serviços R$ 150 → subtotal R$ 150
   e restante R$ 450. Não lançar subtotal R$ 150 mais fatura completa R$ 600.
5. Registre as baixas do subtotal e do restante na data real de pagamento da fatura.

Gerar novamente não duplica nem altera totais já gerados. **O subtotal gerado é
imutável**, para que mudar preços/cancelar serviços não reescreva o passado.
Finalize e confira todos os serviços antes de gerar; para corrigir um mês já gerado,
registre um lançamento de ajuste com descrição/motivo. Cadastros excluídos não
removem cobranças históricas. Ciclo anual cobra o valor integral apenas no mês
de aniversário; não divide por 12. `Fim` é o último mês cobrado.

## Importação das referências

As duas planilhas fornecidas foram consultadas somente para leitura na análise:

- Pessoal: `1CGsjl3iWO3SB6pNfo93weuRApywXPpsI`.
- Condomínio: `1EQlgPxWLxPpUcXiXlzSkYpxTiACEPylT`.

Em **Importar planilhas**, selecione ano/mês, escolha a fonte e gere a prévia.
Desmarque itens que não deseja copiar e confirme a seleção. O servidor relê a
fonte e verifica o digest antes de importar. Se a fonte mudar, gere outra prévia.
Itens são identificados por fonte/aba/linha: não são sincronizados depois da
importação nem reimportados ao repetir; serviços, contatos e checklist usam
identidade independente do mês para não se repetirem a cada aba mensal.
Excluir um item importado não apaga seu marcador de importação.

### Mapeamento utilizado

- **NOVEMBRO 2026**: despesas Diego nas colunas A/B, status/observações C/D, meta
  F; mãe no bloco H/I/J; salário Iris no bloco H/I; salário líquido e ajuda de
  custo Diego no bloco H/I da linha abaixo dos respectivos títulos.
- **Serviços Digitais** (inclusive nomes sem acentos): A/E até a linha TOTAL,
  mantendo nome, valor, fonte/cartão e observações. **Não lê a coluna de usuário/
  senha, não importa número do cartão nem blocos laterais.**
- **Condomínio, aba mensal**: A/B são entradas/morador, C/D saídas/descrição,
  F observações, linhas 2–16. Totais e históricos de obras abaixo ficam de fora.
- **CONTATOS**: A/B/C (tipo, contato, telefone).
- **CHECK-LIST / CHACK-LIST**: itens, data verificada, observações, status e
  pendências laterais. Periodicidade em texto não é adivinhada: revisar intervalo.
- **SALDO CONDOMINIO**: comparação do resultado mensal, não entrada financeira.
  Os rateios de seguro/projeções de reforma não são importados automaticamente.

**Conferência obrigatória:** o layout foi baseado em novembro de 2026. Meses
pessoais antigos podem ter blocos diferentes. As abas do condomínio não têm ano
no nome: confirme o ano antes de importar. Há divergências entre resultados
mensais e a aba SALDO CONDOMINIO (ex.: janeiro). Não transforma totais/saldos em
lançamentos, não ajusta caixa automaticamente e não deduz a data do pagamento
a partir de “OK”, valor preenchido ou débito automático. **Todas as movimentações
importadas ficam pendentes** até registrar as baixas reais.

Os serviços têm nomes repetidos na fonte: são preservados na prévia para sua
decisão. Ao importar faturas e serviços juntos, revise a dupla contagem antes de
gerar subtotais. Os serviços importados iniciam no mês selecionado, com os valores
atuais da aba; não recriam o histórico de preços.

Se a fonte for Excel, o serviço Drive v3 converte **uma cópia temporária privada**
na pasta do sistema. Essa cópia completa pode conter informações sensíveis da
fonte, mas somente campos permitidos vão à base. A cópia é enviada à lixeira
em `finally`. Interrupções do Apps Script podem deixar cópias “Temporario -
Importacao” na pasta: após terminar e conferir a importação, remova apenas essas
cópias e esvazie-as da lixeira. Nunca exclua os arquivos “Dados”. Google Sheets
nativo é lido diretamente, sem cópia. A conta precisa ter acesso às fontes;
não há necessidade de mantê-las compartilhadas por link público.

> **Segurança das referências:** foram encontrados dados de acesso na planilha
> pessoal, que estava acessível pelo link fornecido. Restrinja o compartilhamento
> e troque senhas ali armazenadas. Use gerenciador de senhas; o novo sistema não
> é destinado a armazenar credenciais. Não importar originais para repositório Git.

## Persistência, backups e limites

Cada gravação cria `Dados - <revisão> - <UUID>.json` na pasta exclusiva. A aplicação
confere a releitura e publica um único ponteiro `CP_ESTADO` nas propriedades do
script. `CP_PASTA_ID` guarda o ID canônico. Repetir preparação não cria outra base.
Em falha antes da publicação, a versão anterior continua ativa. Falha de rede
depois da publicação pode significar operação concluída: **atualize e confira
antes de repetir**. A revisão otimista rejeita pedidos de abas desatualizadas.

- `ScriptLock` coordena mutações, incluindo importação.
- Arquivos de dados precisam estar na pasta correta, privados e sob o administrador.
- JSONs inválidos, campos corrompidos ou IDs duplicados impedem leitura/escrita;
  não há fallback para lista vazia.
- Limites: 4 MiB por versão, 12.000 registros por coleção, 500 itens por importação
  e 1.000 eventos recentes no histórico da base. O custo cresce com a base inteira.
- Versões anteriores são retidas, **sem limpeza automática**; acompanhe a cota do
  Drive. Download JSON é backup, não há restauração automática pelo navegador.
- **Não editar arquivos JSON nem ponteiros manualmente na rotina diária.**

Para recuperação administrativa excepcional, pare de usar o app, salve uma cópia
das propriedades atuais, preserve todos os arquivos e confirme uma versão íntegra
com o schema/revisão corretos. A troca de `CP_ESTADO` para uma versão antiga precisa
ser feita deliberadamente pelo proprietário (ID atual, anterior e revisão dessa
versão). Não copiar só o número da revisão atual para um arquivo antigo nem excluir
a pasta. Recarregue todas as abas depois. Leitores externos que ignorem o lock
não são suportados; não editar snapshots pelo Drive.

Não há integração bancária, boletos, transferências automáticas, notificações por
e-mail nem anexos binários. Comprovantes são links HTTPS para arquivos privados já
existentes. CPF, senhas e cartões completos não fazem parte dos cadastros.

## Testes locais

Na raiz do repositório, em PowerShell:

```powershell
node --test apps-scripts/controle-pessoal/tests/controle-pessoal.test.cjs
python apps-scripts/controle-pessoal/tests/test_browser_smoke.py
python apps-scripts/controle-pessoal/tests/test_browser_pdf.py
python apps-scripts/controle-pessoal/tests/test_browser_avisos.py
python apps-scripts/controle-pessoal/tests/test_browser_iptv.py
python apps-scripts/controle-pessoal/tests/test_browser_simulacoes.py
```

Testes usam serviços Google simulados e dados fictícios: não leem nem escrevem
Drive real. Validam autorização, manifesto, sintaxe JS, snapshots, concorrência,
centavos, competência/caixa, saldo inicial, datas, pagamentos, cópias, serviços,
checklist e importação sem credenciais. O teste de navegador usa Selenium do
ambiente Python existente e Chrome headless, com chamadas Google simuladas;
valida cadastro com centavos, escape de HTML, menus, seleção de importação e
layout móvel. A suíte PDF usa as versões reais das bibliotecas (requer internet),
Selenium e PyMuPDF já presentes no projeto para conferir PDFs com várias páginas,
observações longas, filtros, cadastros, listas vazias e recuperação de erro.
A suíte de avisos cobre destaque em todos os financeiros, antecedência/limites de
datas, ano bissexto e virada do dia, navegação por pessoa/ano/checklist, baixa/estorno,
painel móvel, fechamento por Esc, escape de HTML e falha de consulta sem dados expostos.
Os testes IPTV cobrem Administração, cadastro/edição/exclusão, valores em centavos,
datas brasileiras, filtros/CSV/PDF, avisos e renovação explícita. O backend verifica
migração sem escrita, snapshots preservados, dados inválidos e isolamento financeiro.
Selenium Manager pode precisar baixar o driver na primeira execução.
Não substituem teste publicado de OAuth,
quotas, latência Google e conversão real de Excel.

Checklist após publicar: entrar como admin; recusar outra conta; criar/editar
lançamento fictício e estornar baixa; conferir soma anual; repetir geração de
serviços; conferir subtotais contra fatura; verificar checklist; gerar prévia de
novembro e desmarcar duplicatas; conferir saldo com extrato; testar celular e
exportação PDF; conferir pasta e permissões. Não tratar saldo zero inicial como saldo
bancário conhecido sem antes configurar a referência.
