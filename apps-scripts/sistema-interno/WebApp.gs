/******************************************************
 * SISTEMA INTERNO AEUV
 * Projeto independente
 *
 * Area restrita da associacao. O acesso exige login com Conta
 * Google e o e-mail precisa constar na lista de autorizados.
 *
 * IMPLANTACAO OBRIGATORIA:
 *   Executar como .......: Usuario que acessa o app da web
 *   Quem tem acesso .....: Qualquer pessoa com Conta do Google
 *
 * O modo "Usuario que acessa" e o unico que garante a leitura do
 * e-mail de quem abriu a pagina. Sem ele o sistema nao identifica
 * o visitante e bloqueia todo mundo.
 ******************************************************/

// Nome oficial da associacao, exibido no cabecalho.
const ASSOCIACAO_NOME = 'AEUV (Associação Esportiva Uberlandense Varzeana)';

const CONFIG = {
  // Arquivo do logo exibido no cabecalho.
  logoFileId: '1FZ5UyGPfciIp23D8d7XYJnY9vhFmSAhV',

  // Icone da aba do navegador. Precisa ser uma URL publica terminada na extensao da imagem;
  // links do Drive (thumbnail?id=...) nao funcionam aqui.
  faviconUrl: 'https://raw.githubusercontent.com/diegomachadoti/aeuv-ifut-manager/master/assets/logo-aeuv.png',

  // Chave da propriedade de script que guarda a lista de autorizados.
  chaveUsuarios: 'USUARIOS_AUTORIZADOS',

  // Endereco oficial de divulgacao, usado para manter o dominio da
  // associacao na barra do navegador.
  urlPortal: 'https://portal.aeuv.org/sistema/',

  // Controle de punicoes: arquivo mantido pela automacao em Python
  // (controle_punicoes.py), publicado numa subpasta da pasta das sumulas.
  // Os nomes precisam ser iguais aos usados la.
  punicoes: {
    pastaSumulasId: '1OfcX-AFyeGEznieKfyqgQRiEjBDJockP',
    subpasta: 'Controle de Punicoes',
    arquivo: 'CONTROLE DE PUNIÇÕES - AEUV.txt',

    // Guarda o id do arquivo encontrado para evitar nova busca a cada abertura.
    chaveArquivo: 'PUNICOES_ARQUIVO_ID'
  },

  // Contato exibido para quem tenta entrar sem autorizacao.
  emailSuporte: 'associacaoaeuv@gmail.com',

  // Solicitacoes de inscricao, remocao e portabilidade. A pasta e a mesma
  // usada pelo formulario publico e pela automacao em Python (config.ini,
  // secao [drive], folder_embed_url). Dentro dela ficam as subpastas
  // Entrada, Processados e Falhas, que dao a situacao de cada solicitacao.
  solicitacoes: {
    pastaRaizId: '10hhnvDF_J7C0LE5JU9BrPST9D8Rf9qk1',

    // Teto de arquivos abertos por consulta. A listagem le todos os nomes,
    // mas so abre os mais recentes, para a tela nao estourar o tempo do
    // Apps Script quando a temporada acumular centenas de envios.
    maxLeitura: 200
  },

  // Sumulas digitais enviadas pela arbitragem. A pasta e a mesma do
  // controle de punicoes (punicoes.pastaSumulasId) e a mesma configurada
  // na automacao em Python (config.ini, secao [sumulas]). Dentro dela
  // ficam Entrada, Processados e Falhas, que dao a situacao de cada envio.
  sumulas: {
    pastaRaizId: '1OfcX-AFyeGEznieKfyqgQRiEjBDJockP',

    // Mesmo motivo do teto das solicitacoes: a listagem le todos os
    // nomes, mas so abre os mais recentes.
    maxLeitura: 200
  },

  // Notas oficiais disciplinares. Ficam numa subpasta da pasta das
  // sumulas, ao lado do controle de punicoes. Quem publica e a automacao
  // em Python, e so as notas ja fechadas pela comissao (main.py
  // --publicar-drive, ou --gerar-pdf-nota ao regerar o PDF final).
  notas: {
    subpasta: 'Notas Oficiais',
    maxLeitura: 200
  },

  // Regulamentos publicados das competicoes. Ficam numa subpasta da
  // pasta raiz do projeto, alimentada pela mesma automacao
  // (main.py --gerar-pdf-regulamento ou --publicar-drive).
  regulamentos: {
    subpasta: 'Regulamentos',
    chavePasta: 'REGULAMENTOS_PASTA_ID',
    maxLeitura: 100
  },

  // Pasta raiz "AEUV - Automacao", que agrupa tudo o que o projeto usa no Drive.
  // A planilha e a pasta de documentos dos associados sao criadas dentro dela
  // por prepararAssociados().
  pastaRaizId: '1uDUmgEjeISQ1W3Uc5hcUc25pgXDvVhs3',

  // Equipes participantes. Fonte unica dos tres apps: a tela "Equipes"
  // grava a lista nas propriedades e publica o arquivo abaixo na pasta
  // raiz, que os formularios de sumula e de inscricao leem. Assim um time
  // novo e cadastrado num lugar so e aparece em todos.
  equipes: {
    chaveLista: 'EQUIPES_LISTA',
    arquivo: 'equipes.json',
    arquivoRegistro: 'AEUV - Equipes - Cadastro.json',
    chaveArquivo: 'EQUIPES_ARQUIVO_ID'
  },

  // Cadastro de associados: uma planilha propria, criada e localizada por
  // prepararAssociados(). Os ids ficam nas propriedades do script.
  associados: {
    planilha: 'AEUV - Associados',
    aba: 'Associados',
    pastaDocumentos: 'Documentos - Associados',
    chavePlanilha: 'ASSOCIADOS_PLANILHA_ID',
    chavePasta: 'ASSOCIADOS_PASTA_ID',
    prefixoConsulta: 'ASSOCIADOS_CONSULTA_',
    maxArquivoBytes: 5 * 1024 * 1024
  },

  // Modulo Financeiro e Prestacao de Contas: planilha e pasta de comprovantes
  // na pasta raiz do projeto.
  financeiro: {
    planilha: 'AEUV - Financeiro',
    aba: 'Movimentacoes',
    pastaComprovantes: 'Comprovantes - Financeiro',
    chavePlanilha: 'FINANCEIRO_PLANILHA_ID',
    chavePasta: 'FINANCEIRO_PASTA_ID',
    maxArquivoBytes: 8 * 1024 * 1024
  },
  atas: {
    planilha: 'AEUV - Atas',
    aba: 'Atas',
    pasta: 'Atas',
    chavePlanilha: 'ATAS_PLANILHA_ID',
    chavePasta: 'ATAS_PASTA_ID',
    assinatura: 'assinatura-presidente.png',
    chaveAssinatura: 'ATAS_ASSINATURA_FILE_ID'
  }
};

/**
 * Lista usada enquanto a propriedade USUARIOS_AUTORIZADOS nao for definida.
 * O caminho normal para incluir ou remover alguem e a tela "Usuarios do
 * sistema"; esta lista e a rede de seguranca para quando a propriedade for
 * apagada ou o sistema entrar no ar num script novo.
 */
const USUARIOS_PADRAO = [
  { email: 'deejaydiego@gmail.com', nome: 'Diego Machado', perfil: 'admin' },
  { email: 'associacaoaeuv@gmail.com', nome: 'AEUV', perfil: 'diretoria' },
  { email: 'costtitiiure@gmail.com', nome: 'Iure Costtiti', perfil: 'diretoria' },
  { email: 'xavierelegance68@gmail.com', nome: 'Xavier', perfil: 'diretoria' },
  { email: 'artetopudi@gmail.com', nome: 'Teste', perfil: 'associado', equipe: 'TESTE' }
];

/**
 * Perfis aceitos pelo sistema, na ordem em que aparecem na tela.
 *
 * admin      - tudo, inclusive conceder e revogar acesso.
 * diretoria  - tudo, menos mexer em quem tem acesso.
 * arbitragem - envia sumula e consulta o regulamento.
 * associado  - a equipe: formularios, regulamentos e o proprio cadastro.
 *              Um acesso desse perfil e sempre amarrado a uma equipe.
 */
const PERFIS = {
  admin: 'Administrador',
  diretoria: 'Diretoria',
  arbitragem: 'Arbitragem',
  associado: 'Associado'
};

/**
 * Perfil assumido quando o gravado nao existe mais em PERFIS. E o de
 * menor alcance de proposito: um perfil renomeado nunca vira acesso a mais.
 */
const PERFIL_PADRAO = 'associado';

/** Perfis que enxergam apenas a propria equipe, nunca as demais. */
const PERFIS_DA_EQUIPE = ['associado'];

/**
 * Grupos do menu lateral. Um modulo entra num grupo declarando
 * "grupo" com o id correspondente; os demais ficam soltos, no nivel
 * de cima. Grupo sem nenhum modulo liberado nao aparece.
 */
const GRUPOS = [
  { id: 'formularios', nome: 'Formulários', icone: '📨' },
  { id: 'campeonato', nome: 'Gestão do campeonato', icone: '🏆' }
];

/**
 * Modulos do sistema. Para publicar uma funcionalidade nova basta
 * acrescentar um item aqui e, se for uma tela propria, tratar o id
 * em renderizarModulo() no Index.html.
 *
 * tipo:
 *   painel    - tela inicial com os atalhos
 *   link      - abre um endereco externo em nova aba
 *   usuarios  - tabela de autorizados (somente admin)
 *   punicoes  - controle de punicoes lido do arquivo no Drive
 *   solicitacoes - consulta dos pedidos de inscricao, remocao e portabilidade
 *   sumulas   - consulta das sumulas enviadas pela arbitragem
 *   equipes   - lista das equipes participantes, fonte dos tres apps
 *   associados- cadastro e consulta das equipes associadas
 *   breve     - funcionalidade planejada, ainda sem tela
 *
 * grupo (opcional): id de um item de GRUPOS. Modulos do mesmo grupo
 * ficam juntos num submenu e precisam estar lado a lado nesta lista.
 */
const MODULOS = [
  {
    id: 'inicio',
    nome: 'Início',
    icone: '🏠',
    tipo: 'painel',
    descricao: 'Visão geral do sistema e atalhos para as funcionalidades liberadas.',
    perfis: ['admin', 'diretoria', 'arbitragem', 'associado']
  },
  {
    id: 'sumula',
    nome: 'Súmula digital',
    icone: '📋',
    tipo: 'link',
    grupo: 'formularios',
    url: 'https://portal.aeuv.org/sumula/',
    descricao: 'Formulário oficial preenchido pela arbitragem após cada partida.',
    perfis: ['admin', 'diretoria', 'arbitragem']
  },
  {
    id: 'inscricao',
    nome: 'Inscrição e portabilidade',
    icone: '📝',
    tipo: 'link',
    grupo: 'formularios',
    url: 'https://portal.aeuv.org/inscricao/',
    descricao: 'Solicitações de inscrição, remoção e portabilidade de atletas.',
    perfis: ['admin', 'diretoria', 'associado']
  },
  {
    id: 'solicitacoes',
    nome: 'Solicitações de Inscrições',
    icone: '📥',
    tipo: 'solicitacoes',
    descricao: 'Consulta aos pedidos de inscrição, remoção e portabilidade e à situação de cada um.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'sumulas',
    nome: 'Súmulas Enviadas',
    icone: '📑',
    tipo: 'sumulas',
    descricao: 'Consulta às súmulas enviadas pela arbitragem, com o relato dos fatos e os envolvidos.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'notas',
    nome: 'Notas oficiais',
    icone: '📄',
    tipo: 'notas',
    descricao: 'Consulta às notas oficiais disciplinares geradas a partir das súmulas.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'regulamentos',
    nome: 'Regulamentos',
    icone: '📕',
    tipo: 'regulamentos',
    descricao: 'Regulamentos oficiais publicados das competições da associação.',
    perfis: ['admin', 'diretoria', 'arbitragem', 'associado']
  },
  {
    id: 'punicoes',
    nome: 'Controle de punições',
    icone: '⚖️',
    tipo: 'punicoes',
    descricao: 'Acompanhamento das punições aplicadas e do cumprimento por atleta.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'administracao',
    nome: 'Administração',
    icone: '⚙️',
    tipo: 'administracao',
    descricao: 'Ferramentas administrativas e manutenção da base de dados.',
    perfis: ['admin']
  },
  {
    id: 'equipes',
    nome: 'Banco de Dados de Equipes',
    icone: '📟',
    tipo: 'equipes',
    descricao: 'Equipes participantes. A lista alimenta o cadastro, os acessos e os dois formulários.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'associados',
    nome: 'Associados',
    icone: '🤝',
    tipo: 'associados',
    descricao: 'Cadastro das equipes associadas, com representante legal, documentacao e situacao.',
    perfis: ['admin', 'diretoria', 'associado']
  },
  {
    id: 'campeonatos',
    nome: 'Campeonatos',
    icone: '🏆',
    tipo: 'campeonato',
    grupo: 'campeonato',
    descricao: 'Cadastro e gestão das competições da associação.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'times-campeonato',
    nome: 'Equipes participantes',
    icone: '🎫',
    tipo: 'campeonato',
    grupo: 'campeonato',
    descricao: 'Equipes vinculadas ao campeonato e cadastro de novos atletas e comissão técnica.',
    perfis: ['admin', 'diretoria', 'associado']
  },
  {
    id: 'jogos-campeonato',
    nome: 'Tabela e Classificação',
    icone: '⚽',
    tipo: 'campeonato',
    grupo: 'campeonato',
    descricao: 'Tabela de jogos, resultados manuais, classificação e súmulas para impressão.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'disciplina-campeonato',
    nome: 'Disciplina',
    icone: '🟨',
    tipo: 'campeonato',
    grupo: 'campeonato',
    descricao: 'Cartões, suspensão e zeragem de cartões.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'sumula-campeonato',
    nome: 'Súmula',
    icone: '📋',
    tipo: 'campeonato',
    grupo: 'campeonato',
    descricao: 'Consulta e edição de súmulas finalizadas, com filtros por campeonato, rodada, equipe e data.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'financeiro',
    nome: 'Financeiro e Prestação de Contas',
    icone: '💰',
    tipo: 'financeiro',
    descricao: 'Controle de entradas, saídas, anexos de comprovantes e geração de relatórios oficiais para assembleias e emendas impositivas.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'atas',
    nome: 'Atas de reuniões',
    icone: '🗒️',
    tipo: 'atas',
    descricao: 'Redação, consulta e exportação das atas da associação e dos campeonatos.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'atletas',
    nome: 'Banco de Dados de Atletas',
    icone: '📟',
    tipo: 'atletas',
    descricao: 'Todos os atletas dos elencos de todos os campeonatos, com o histórico de vínculos por equipe e competição.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'usuarios',
    nome: 'Usuários do sistema',
    icone: '🔐',
    tipo: 'usuarios',
    descricao: 'Quem tem acesso à área interna e com qual perfil.',
    perfis: ['admin']
  }
];

/** A lista fica no Drive; a chave antiga permite migrar os registros do MVP. */
const CAMPEONATOS_CHAVE = 'CAMPEONATOS_LISTA';
const CAMPEONATOS_ARQUIVO = 'AEUV - Campeonatos.json';
const CAMPEONATOS_STATUS = ['rascunho', 'ativo', 'encerrado'];
const CAMPEONATOS_MODALIDADES = ['Futsal', 'Society', 'Futebol de Campo', 'Outro'];
const CAMPEONATOS_VISIBILIDADES = ['Interno', 'Público'];
const CAMPEONATO_ESTRUTURA_CHAVE = 'CAMPEONATO_ESTRUTURA_';
const CAMPEONATO_TIMES_CHAVE = 'CAMPEONATO_TIMES_';
const CAMPEONATO_ATLETAS_CHAVE = 'CAMPEONATO_ATLETAS_';
const CAMPEONATO_COMISSAO_CHAVE = 'CAMPEONATO_COMISSAO_';
const CAMPEONATO_FORMATOS_FASE = ['Grupos corridos', 'Mata-mata', 'Grupos + mata-mata', 'Pontos corridos'];
const TABELA_FASES_ELIMINATORIAS = ['oitavas', 'quartas', 'semifinal', 'final'];
const TABELA_CAMPOS_ARQUIVO = 'AEUV - Campos.json';
const TABELA_CAMPOS_CHAVE = 'aeuv.tabela.campos';
const TABELA_DESEMPATES = [
  'vitorias', 'saldoGols', 'golsPro', 'golsContra',
  'confrontoDireto', 'amarelos', 'vermelhos'
];
const TABELA_DESEMPATES_ASC = ['golsContra', 'amarelos', 'vermelhos'];
const TABELA_CRITERIO_OPCOES = [
  { id: 'vitorias', nome: 'Vitórias' },
  { id: 'saldoGols', nome: 'Saldo de gols' },
  { id: 'golsPro', nome: 'Gols pró' },
  { id: 'golsContra', nome: 'Gols sofridos (menos)' },
  { id: 'confrontoDireto', nome: 'Confronto direto' },
  { id: 'amarelos', nome: 'Cartões amarelos' },
  { id: 'vermelhos', nome: 'Cartões vermelhos' }
];

/******************************************************
 * ABERTURA DO SISTEMA
 ******************************************************/

/**
 * Abre o sistema interno. Usuarios nao identificados ou fora da
 * lista recebem a tela de acesso negado.
 *
 * O parametro "origem" diz como a pagina foi aberta:
 *   portal - dentro do quadro de portal.aeuv.org/sistema/
 *   direto - o portal nao conseguiu embutir e mandou abrir aqui
 *   (vazio) - acesso direto pela URL /exec
 *
 * @param {Object} e Evento do Apps Script com os parametros da URL.
 * @return {HtmlOutput}
 */
function doGet(e) {
  const sessao = identificarUsuario_();
  if (sessao.autorizado) {
    ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  }

  const origem = (e && e.parameter && e.parameter.origem) || '';

  const template = sessao.autorizado
    ? HtmlService.createTemplateFromFile('Index')
    : HtmlService.createTemplateFromFile('Negado');

  template.config = {
    associacao: ASSOCIACAO_NOME,
    logoUrl: obterLogo_(),
    emailSuporte: CONFIG.emailSuporte,
    usuario: sessao.usuario,
    email: sessao.email,
    motivo: sessao.motivo,
    modulos: sessao.autorizado ? modulosPermitidos_(sessao.usuario.perfil) : [],
    regulamentosPastaUrl: sessao.autorizado && sessao.usuario.perfil === 'associado'
      ? urlPastaRegulamentos_() : '',
    grupos: GRUPOS,
    embutido: origem === 'portal',
    elenco: {
      campeonatoId: String((e && e.parameter && e.parameter.campeonatoId) || ''),
      equipeId: String((e && e.parameter && e.parameter.equipeId) || '')
    },

    // Só oferece a volta ao portal em acesso direto. Quando o proprio portal
    // desistiu de embutir (origem=direto), voltar criaria um vaivem sem fim.
    urlPortal: origem === '' ? CONFIG.urlPortal : ''
  };

  return template
    .evaluate()
    .setTitle('AEUV - Sistema Interno')
    .setFaviconUrl(CONFIG.faviconUrl)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Inclui um arquivo HTML dentro de outro.
 * @param {string} nome Nome do arquivo sem extensao.
 * @return {string}
 */
function include_(nome) {
   return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/**
 * Obtém o logo da AEUV do Drive e converte para Data URL base64.
 * @return {string}
 */
function obterLogo_() {
   const otimizadoId = PropertiesService.getScriptProperties().getProperty(LOGO_SISTEMA_CHAVE);
   if (otimizadoId) return lerImagemLogo_(otimizadoId);
   try {
     return lerImagemLogo_(CONFIG.logoFileId);
   } catch (e) {
     return '';
   }
}

const LOGO_SISTEMA_CHAVE = 'AEUV_LOGO_SISTEMA_OTIMIZADO_ID';

function lerImagemLogo_(id) {
  const blob = DriveApp.getFileById(id).getBlob();
  return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

function assinaturaLogoSistema_(imagem) {
  return assinaturaEscudoEquipe_(CONFIG.logoFileId + '\n'
    + (PropertiesService.getScriptProperties().getProperty(LOGO_SISTEMA_CHAVE) || '') + '\n' + imagem);
}

function lerLogoParaOtimizacao() {
  exigirAdministracao_();
  const imagem = lerImagemLogo_(CONFIG.logoFileId);
  return { imagem: imagem, assinatura: assinaturaLogoSistema_(imagem) };
}

function salvarLogoOtimizado(payload) {
  exigirAdministracao_();
  const imagem = validarEscudoEquipe_(payload && payload.imagem);
  if (!imagem || imagem.length > 100 * 1024) throw new Error('O logo otimizado deve ter ate 100 KB.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const original = lerImagemLogo_(CONFIG.logoFileId);
    if (!payload || payload.assinatura !== assinaturaLogoSistema_(original)) {
      throw new Error('O logo foi alterado durante a preparacao. Recarregue antes de otimizar.');
    }
    if (imagem.length > original.length) throw new Error('O logo otimizado nao pode ser maior que o original.');
    const partes = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(imagem);
    const arquivo = pastaRaizProjeto_().createFile(Utilities.newBlob(
      Utilities.base64Decode(partes[2]), partes[1], 'AEUV - Logo Sistema - ' + Utilities.getUuid()));
    // Arquivos imutaveis: original e versoes anteriores continuam disponiveis no Drive.
    PropertiesService.getScriptProperties().setProperty(LOGO_SISTEMA_CHAVE, arquivo.getId());
    return { bytesAntes: original.length, bytesDepois: imagem.length };
  } finally {
    lock.releaseLock();
  }
}

/******************************************************
 * IDENTIFICACAO E PERMISSAO
 ******************************************************/

/**
 * Descobre quem abriu a pagina e se essa pessoa pode entrar.
 * @return {{autorizado: boolean, email: string, motivo: string, usuario: Object}}
 */
function identificarUsuario_() {
  const email = normalizarEmail_(obterEmailAtivo_());

  if (!email) {
    return { autorizado: false, email: '', motivo: 'nao-identificado', usuario: null };
  }

  const autorizado = obterUsuarios_().filter(function (usuario) {
    return normalizarEmail_(usuario.email) === email;
  })[0];

  if (!autorizado) {
    return { autorizado: false, email: email, motivo: 'sem-permissao', usuario: null };
  }

  const perfil = PERFIS[autorizado.perfil] ? autorizado.perfil : PERFIL_PADRAO;

  return {
    autorizado: true,
    email: email,
    motivo: '',
    usuario: {
      email: email,
      nome: autorizado.nome || email.split('@')[0],
      perfil: perfil,
      perfilNome: PERFIS[perfil],
      equipe: perfilDaEquipe_(perfil) ? String(autorizado.equipe || '').trim() : ''
    }
  };
}

/**
 * Diz se o perfil so enxerga a propria equipe.
 * @param {string} perfil
 * @return {boolean}
 */
function perfilDaEquipe_(perfil) {
  return PERFIS_DA_EQUIPE.indexOf(perfil) !== -1;
}

/**
 * Le o e-mail de quem esta acessando. Depende da implantacao estar
 * configurada como "Executar como: Usuario que acessa o app da web".
 * @return {string}
 */
function obterEmailAtivo_() {
  try {
    const ativo = Session.getActiveUser().getEmail();

    if (ativo) {
      return ativo;
    }

    return Session.getEffectiveUser().getEmail() || '';
  } catch (e) {
    return '';
  }
}

/**
 * Deixa o e-mail em minusculas e sem espacos, para comparacao segura.
 * @param {string} email
 * @return {string}
 */
function normalizarEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Lista de autorizados: usa a propriedade de script quando existir e,
 * na falta dela, a lista padrao gravada no codigo.
 * @return {Array<Object>}
 */
function obterUsuarios_() {
  try {
    const bruto = PropertiesService.getScriptProperties().getProperty(CONFIG.chaveUsuarios);

    if (bruto) {
      const lista = JSON.parse(bruto);

      if (Array.isArray(lista) && lista.length) {
        return lista;
      }
    }
  } catch (e) {
    // Propriedade ausente ou com conteudo invalido: segue com a lista padrao.
  }

  return USUARIOS_PADRAO;
}

/**
 * Filtra os modulos visiveis para um perfil.
 * @param {string} perfil
 * @return {Array<Object>}
 */
function modulosPermitidos_(perfil) {
  return MODULOS.filter(function (modulo) {
    return modulo.perfis.indexOf(perfil) !== -1;
  }).map(function (modulo) {
    return {
      id: modulo.id,
      nome: modulo.nome,
      icone: modulo.icone,
      tipo: modulo.tipo,
      descricao: modulo.descricao,
      grupo: modulo.grupo || '',
      url: modulo.url || ''
    };
  });
}

/******************************************************
 * ADMINISTRACAO DOS AUTORIZADOS
 *
 * O caminho normal e a tela "Usuarios do sistema": o admin inclui,
 * edita e remove ali mesmo, e vale na hora, sem publicar nova versao.
 * As funcoes do editor abaixo ficam como socorro, para o caso de
 * ninguem conseguir mais entrar.
 ******************************************************/

/**
 * Regravar a lista padrao do codigo por cima da propriedade. Use pelo
 * editor do Apps Script quando o acesso pela tela estiver perdido.
 */
function definirUsuariosAutorizados() {
  const validos = higienizarUsuarios_(USUARIOS_PADRAO);

  PropertiesService.getScriptProperties()
    .setProperty(CONFIG.chaveUsuarios, JSON.stringify(validos));

  Logger.log('Autorizados gravados: %s', validos.length);
}

/**
 * Remove a lista gravada e volta a valer a lista padrao do codigo.
 */
function restaurarUsuariosPadrao() {
  PropertiesService.getScriptProperties().deleteProperty(CONFIG.chaveUsuarios);
  Logger.log('Lista personalizada removida. Valendo USUARIOS_PADRAO.');
}

/**
 * Normaliza a lista e recusa o que deixaria o sistema inacessivel.
 * E o unico ponto que valida: tela e editor passam por aqui.
 * @param {Array<Object>} lista
 * @return {Array<Object>}
 */
function higienizarUsuarios_(lista) {
  const vistos = {};

  const validos = (lista || []).map(function (usuario) {
    const email = normalizarEmail_(usuario.email);
    const perfil = PERFIS[usuario.perfil] ? usuario.perfil : PERFIL_PADRAO;

    const registro = { email: email, nome: String(usuario.nome || '').trim(), perfil: perfil };

    // A equipe so faz sentido para quem enxerga apenas a propria:
    // guardar em outro perfil deixaria lixo que confunde na proxima leitura.
    if (perfilDaEquipe_(perfil)) {
      registro.equipe = String(usuario.equipe || '').trim();
    }

    return registro;
  }).filter(function (usuario) {
    if (!emailValido_(usuario.email) || vistos[usuario.email]) {
      return false;
    }

    vistos[usuario.email] = true;

    return true;
  });

  if (!validos.length) {
    throw new Error('Informe ao menos um e-mail válido antes de gravar a lista.');
  }

  const temAdmin = validos.some(function (usuario) {
    return usuario.perfil === 'admin';
  });

  if (!temAdmin) {
    throw new Error('Mantenha ao menos um usuário com o perfil Administrador.');
  }

  return validos;
}

/**
 * Formato de e-mail aceito. Proposital e frouxo: so impede erro de
 * digitacao grosseiro, porque quem decide se o e-mail existe e o Google.
 * @param {string} email
 * @return {boolean}
 */
function emailValido_(email) {
  return new RegExp('^[^@\\s]+@[^@\\s.]+\\.[^@\\s]+$').test(String(email || ''));
}

/**
 * Exige que quem chamou seja admin e devolve a sessao.
 * @return {Object}
 */
function exigirAdmin_() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || sessao.usuario.perfil !== 'admin') {
    throw new Error('Apenas administradores podem gerenciar os acessos.');
  }

  return sessao;
}

/**
 * Grava a lista e devolve a tela atualizada, para o cliente nao
 * precisar de uma segunda chamada.
 * @param {Array<Object>} lista
 * @param {Object} sessao
 * @return {Object}
 */
function gravarUsuarios_(lista, sessao) {
  const validos = higienizarUsuarios_(lista);

  PropertiesService.getScriptProperties()
    .setProperty(CONFIG.chaveUsuarios, JSON.stringify(validos));

  return montarTelaUsuarios_(validos, sessao);
}

/**
 * Monta a resposta da tela de usuarios.
 * @param {Array<Object>} lista
 * @param {Object} sessao
 * @return {Object}
 */
function montarTelaUsuarios_(lista, sessao) {
  return {
    registros: lista.map(function (usuario) {
      const perfil = PERFIS[usuario.perfil] ? usuario.perfil : PERFIL_PADRAO;

      return {
        email: normalizarEmail_(usuario.email),
        nome: usuario.nome || '',
        perfil: perfil,
        perfilNome: PERFIS[perfil],
        equipe: perfilDaEquipe_(perfil) ? (usuario.equipe || '') : ''
      };
    }),
    perfis: Object.keys(PERFIS).map(function (id) {
      return {
        id: id,
        nome: PERFIS[id],
        modulos: modulosDoPerfil_(id),
        exigeEquipe: perfilDaEquipe_(id)
      };
    }),
    equipes: obterEquipes_(),
    emailAtual: sessao.usuario.email
  };
}

/**
 * Nome dos modulos que um perfil enxerga. Serve para a tela explicar,
 * na hora de escolher, o que aquele perfil passa a ver.
 * @param {string} perfil
 * @return {Array<string>}
 */
function modulosDoPerfil_(perfil) {
  return MODULOS.filter(function (modulo) {
    return modulo.perfis.indexOf(perfil) !== -1;
  }).map(function (modulo) {
    return modulo.nome;
  });
}

/**
 * Devolve a lista de autorizados para a tela de usuarios.
 * Chamada pelo cliente; refaz a verificacao de permissao no servidor.
 * @return {Object}
 */
function listarUsuarios() {
  const sessao = exigirAdmin_();

  return montarTelaUsuarios_(obterUsuarios_(), sessao);
}

/**
 * Inclui um acesso novo ou atualiza o de um e-mail que ja esta na lista.
 * @param {{email: string, nome: string, perfil: string, emailOriginal: string}} dados
 * @return {Object}
 */
function salvarUsuario(dados) {
  const sessao = exigirAdmin_();

  const email = normalizarEmail_(dados && dados.email);
  const original = normalizarEmail_(dados && dados.emailOriginal);
  const perfil = dados && dados.perfil;

  if (!emailValido_(email)) {
    throw new Error('Informe um e-mail válido, no formato nome@dominio.com.');
  }

  if (!PERFIS[perfil]) {
    throw new Error('Escolha um perfil da lista.');
  }

  const equipe = String((dados && dados.equipe) || '').trim();

  // Sem equipe, o acesso de associado nao enxergaria cadastro nenhum:
  // melhor recusar aqui do que entregar uma tela vazia sem explicacao.
  if (perfilDaEquipe_(perfil)) {
    if (!equipe) {
      throw new Error('Escolha a equipe deste associado.');
    }

    const conhecida = obterEquipes_().some(function (nome) {
      return chaveEquipe_(nome) === chaveEquipe_(equipe);
    });

    if (!conhecida) {
      throw new Error('Equipe não reconhecida: ' + equipe);
    }
  }

  // Tirar o proprio admin de si mesmo tranca a tela para quem esta mexendo.
  if (original === sessao.usuario.email && perfil !== 'admin') {
    throw new Error('Você não pode mudar o seu próprio perfil. Peça a outro administrador.');
  }

  const lista = obterUsuarios_().slice();

  // Sem emailOriginal e inclusao: um e-mail que ja esta na lista tem que
  // ser recusado, nunca sobrescrito em silencio.
  const posicao = original
    ? lista.reduce(function (achado, usuario, indice) {
        return normalizarEmail_(usuario.email) === original ? indice : achado;
      }, -1)
    : -1;

  if (original && posicao === -1) {
    throw new Error('Este acesso não está mais na lista. Recarregue a página.');
  }

  const repetido = lista.some(function (usuario, indice) {
    return indice !== posicao && normalizarEmail_(usuario.email) === email;
  });

  if (repetido) {
    throw new Error('Este e-mail já tem acesso ao sistema.');
  }

  const registro = { email: email, nome: String((dados && dados.nome) || '').trim(), perfil: perfil };

  if (perfilDaEquipe_(perfil)) {
    registro.equipe = equipe;
  }

  if (posicao === -1) {
    lista.push(registro);
  } else {
    lista[posicao] = registro;
  }

  const tela = gravarUsuarios_(lista, sessao);

  tela.recado = (posicao === -1 ? 'Acesso concedido a ' : 'Acesso atualizado: ') + email;

  return tela;
}

/**
 * Revoga o acesso de um e-mail.
 * @param {string} email
 * @return {Object}
 */
function removerUsuario(email) {
  const sessao = exigirAdmin_();
  const alvo = normalizarEmail_(email);

  if (alvo === sessao.usuario.email) {
    throw new Error('Você não pode remover o seu próprio acesso.');
  }

  const lista = obterUsuarios_().filter(function (usuario) {
    return normalizarEmail_(usuario.email) !== alvo;
  });

  const tela = gravarUsuarios_(lista, sessao);

  tela.recado = 'Acesso removido: ' + alvo;

  return tela;
}

/******************************************************
 * EQUIPES PARTICIPANTES
 *
 * Fonte unica dos tres apps. A lista fica nas propriedades do script,
 * editada pela tela "Equipes", e e publicada num arquivo JSON na pasta
 * raiz do Drive. Os formularios de sumula e de inscricao leem esse
 * arquivo, entao um time novo entra num lugar so e aparece em todos,
 * sem publicar versao nova de nenhum dos projetos.
 ******************************************************/

/**
 * Lista usada enquanto a propriedade EQUIPES_LISTA nao for gravada.
 * Serve de rede de seguranca; o caminho normal e a tela "Equipes".
 */
const EQUIPES_PADRAO = [
  'AJAX',
  'BEATS',
  'BOCA JRS',
  'CRUZMALTINO',
  'INTEGRAÇÃO',
  'KADOSH',
  'LEÕES DO MORUMBI',
  'OLHOS DÁGUA',
  'ONZE GAROTOS',
  'PEQUIS',
  'REAL PREDADOR',
  'RIVER',
  'TRANSNANE/BRASILIENSE',
  'TRK',
  'UNIÃO',
  'UNIAO SANTA MARIA',
  'VENUS',
  'FUT ART'
];

/** Perfis que podem incluir e remover equipes. */
const EQUIPES_PERFIS_EDICAO = ['admin', 'diretoria'];

/**
 * Lista valendo agora: a gravada, ou a do codigo enquanto nao houver
 * nenhuma. Todo lugar que oferece equipes passa por aqui.
 * @return {Array<string>}
 */
function obterEquipes_() {
  const guardado = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.equipes.chaveLista);

  if (guardado) {
    try {
      const lista = JSON.parse(guardado);

      if (Array.isArray(lista) && lista.length) {
        return higienizarEquipes_(lista);
      }
    } catch (e) {
      // Conteudo invalido: vale a lista do codigo, nunca uma lista vazia.
    }
  }

  return higienizarEquipes_(EQUIPES_PADRAO);
}

/**
 * Limpa espacos, descarta vazios e repetidos e ordena. A comparacao
 * ignora acento e caixa, para "UNIAO" e "UNIÃO" nao entrarem as duas.
 * @param {Array<string>} lista
 * @return {Array<string>}
 */
function higienizarEquipes_(lista) {
  const vistos = {};

  const validos = (lista || []).map(function (nome) {
    return limparEspacos_(nome);
  }).filter(function (nome) {
    const chave = chaveEquipe_(nome);

    if (!chave || vistos[chave]) {
      return false;
    }

    vistos[chave] = true;

    return true;
  });

  if (!validos.length) {
    throw new Error('Mantenha ao menos uma equipe na lista.');
  }

  return validos.sort(function (a, b) {
    return a.localeCompare(b, 'pt-BR');
  });
}

/**
 * Exige perfil que pode mexer nas equipes e devolve a sessao.
 * @return {Object}
 */
function exigirEdicaoEquipes_() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || EQUIPES_PERFIS_EDICAO.indexOf(sessao.usuario.perfil) === -1) {
    throw new Error('Você não tem permissão para gerenciar as equipes.');
  }

  return sessao;
}

function lerRegistroEquipes_(recursos) {
  const arquivo = resolverArquivoCadastro_(CONFIG.equipes.arquivoRegistro, recursos, 'equipes').arquivo;
  if (!arquivo) return [];
  let lista;
  try {
    const bruto = medirEtapaCadastro_(recursos, 'equipes', 'drive_ler', function () {
      return arquivo.getBlob().getDataAsString('UTF-8');
    });
    lista = medirEtapaCadastro_(recursos, 'equipes', 'json_parse', function () { return JSON.parse(bruto); });
  } catch (e) {
    throw new Error('O cadastro de equipes no Drive está inválido. Restaure o arquivo antes de continuar.');
  }
  if (!Array.isArray(lista) || lista.some(function (item) { return !item || !item.id || !item.nome; })) {
    throw new Error('O cadastro de equipes no Drive está inválido.');
  }
  const ids = {};
  const nomes = {};
  lista.forEach(function (item) {
    const nome = chaveEquipe_(item.nome);
    if (ids[item.id] || nomes[nome]) throw new Error('O cadastro de equipes contém identificadores duplicados.');
    ids[item.id] = true;
    nomes[nome] = true;
  });
  return lista;
}

function gravarRegistroEquipes_(lista) {
  marcarSnapshotsEsportivosPendentes_();
  const localizado = resolverArquivoCadastro_(CONFIG.equipes.arquivoRegistro);
  const json = JSON.stringify(lista);
  if (localizado.arquivo) localizado.arquivo.setContent(json);
  else criarArquivoCadastro_(localizado, CONFIG.equipes.arquivoRegistro, json);
}

// A leitura só semeia os nomes ainda sem ID; não muda equipes.json nem vínculos legados.
function equipesRegistro_(lockJaAdquirido, somenteLeitura, recursos) {
  let registros = lerRegistroEquipes_(recursos);
  const faltam = function () {
    return obterEquipes_().filter(function (nome) {
      return !registros.some(function (item) { return chaveEquipe_(item.nome) === chaveEquipe_(nome); });
    });
  };
  if (somenteLeitura || !faltam().length) return registros;
  const lock = lockJaAdquirido ? null : LockService.getScriptLock();
  if (lock) lock.waitLock(30000);
  try {
    registros = lerRegistroEquipes_();
    faltam().forEach(function (nome) {
      registros.push({ id: Utilities.getUuid(), nome: nome, escudo: '' });
    });
    gravarRegistroEquipes_(registros);
    return registros;
  } finally {
    if (lock) lock.releaseLock();
  }
}

function validarEscudoEquipe_(valor) {
  const escudo = String(valor || '').trim();
  if (!escudo) return '';
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(escudo)
      || escudo.length > 2 * 1024 * 1024 + 32) {
    throw new Error('Envie um escudo PNG, JPEG ou WebP de até 1,5 MB.');
  }
  return escudo;
}

function assinaturaEscudoEquipe_(escudo) {
  return Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, String(escudo || '')));
}

function exigirAdministracao_() {
  const sessao = identificarUsuario_();
  if (!sessao.autorizado || !sessao.usuario || sessao.usuario.perfil !== 'admin') {
    throw new Error('Somente o administrador pode executar as ferramentas de manutencao.');
  }
  return sessao;
}

function otimizarEscudosEquipes(payload) {
  exigirAdministracao_();
  const entradas = payload && payload.escudos;
  if (!Array.isArray(entradas) || !entradas.length) throw new Error('Informe os escudos a otimizar.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const registros = equipesRegistro_(true);
    const ids = new Set();
    const alteracoes = entradas.map(function (entrada) {
      if (!entrada || typeof entrada.id !== 'string' || ids.has(entrada.id)) {
        throw new Error('Escudos com identificadores invalidos ou repetidos.');
      }
      ids.add(entrada.id);
      const equipe = registros.find(function (item) { return item.id === entrada.id; });
      if (!equipe || entrada.assinatura !== assinaturaEscudoEquipe_(equipe.escudo)) {
        throw new Error('Um escudo foi alterado. Recarregue as equipes antes de otimizar.');
      }
      const escudo = validarEscudoEquipe_(entrada.escudo);
      if (!escudo || escudo.length >= String(equipe.escudo || '').length || escudo.length > 100 * 1024) {
        throw new Error('O escudo otimizado deve ser menor que o original e ter ate 100 KB.');
      }
      return { equipe: equipe, escudo: escudo };
    });
    // Preserva os originais antes da unica gravacao do registro de equipes.
    pastaRaizProjeto_().createFile(Utilities.newBlob(JSON.stringify(registros), 'application/json',
      'AEUV - Backup Escudos - ' + Utilities.getUuid() + '.json'));
    alteracoes.forEach(function (item) { item.equipe.escudo = item.escudo; });
    gravarRegistroEquipes_(registros);
    return { total: alteracoes.length, recado: alteracoes.length + ' escudo(s) otimizado(s). Originais preservados em backup no Drive.' };
  } finally { lock.releaseLock(); }
}

function listarFontesOtimizacaoImagens() {
  exigirAdministracao_();
  const fontes = [
    { tipo: 'equipes', rotulo: 'Escudos das equipes' },
    { tipo: 'campeonatos', rotulo: 'Escudos dos campeonatos' }
  ];
  lerListaCadastroDrive_(CAMPEONATOS_ARQUIVO, CAMPEONATOS_CHAVE).forEach(function (campeonato) {
    if (!campeonato || !campeonato.id || !campeonato.nome) {
      throw new Error('Cadastro de campeonatos invalido. Corrija antes de otimizar.');
    }
    ['atletas', 'comissao'].forEach(function (tipo) {
      fontes.push({ tipo: tipo, campeonatoId: campeonato.id,
        campeonatoNome: campeonato.nome,
        rotulo: campeonato.nome + ' - ' + (tipo === 'atletas' ? 'Atletas' : 'Comissao') });
    });
  });
  return fontes;
}

function fonteOtimizacaoImagens_(fonte) {
  if (!fonte || ['equipes', 'campeonatos', 'atletas', 'comissao'].indexOf(fonte.tipo) === -1) {
    throw new Error('Fonte de imagens invalida.');
  }
  if (fonte.tipo === 'equipes') {
    return { lista: lerRegistroEquipes_(), campo: 'escudo', limite: 100 * 1024,
      nome: CONFIG.equipes.arquivoRegistro, gravar: gravarRegistroEquipes_ };
  }
  if (fonte.tipo === 'campeonatos') {
    return { lista: lerListaCadastroDrive_(CAMPEONATOS_ARQUIVO, CAMPEONATOS_CHAVE),
      campo: 'escudo', limite: 100 * 1024, nome: CAMPEONATOS_ARQUIVO, gravar: gravarCampeonatos_ };
  }
  const id = String(fonte.campeonatoId || '');
  const campeonatos = lerListaCadastroDrive_(CAMPEONATOS_ARQUIVO, CAMPEONATOS_CHAVE);
  if (!campeonatos.some(function (item) { return item && item.id === id; })) {
    throw new Error('Campeonato nao encontrado. Recarregue antes de otimizar.');
  }
  const nome = arquivoCadastroPessoasCampeonato_(id, fonte.tipo === 'atletas' ? 'Atletas' : 'Comissao Tecnica');
  const chave = fonte.tipo === 'atletas' ? chaveAtletasCampeonato_(id) : chaveComissaoTecnicaCampeonato_(id);
  if (elencosParticionadosCutoverAtivo_()) {
    const recursos = {};
    const lista = lerElencoBrutoOperacao_(id, fonte.tipo, recursos);
    // The photo list is mutated in memory only after its durable backup.
    delete recursos.elencosBrutos;
    const equipe = fonte.equipeId ? equipePermanenteElencoParticionado_(fonte.equipeId) : null;
    return { lista: equipe ? lista.filter(function (item) {
      return chaveEquipe_(item.timeVinculado) === chaveEquipe_(equipe.nome);
    }) : lista, campo: 'foto', limite: 200 * 1024, nome: nomePastaElencosParticionados_(id),
    gravar: function () { gravarElencoComHistorico_(id, fonte.tipo, lista, null, null, recursos); } };
  }
  return { lista: lerListaCadastroDrive_(nome, chave), campo: 'foto', limite: 200 * 1024,
    nome: nome, gravar: function (lista) { gravarListaCadastroDrive_(nome, chave, lista); } };
}

function listarLoteOtimizacaoImagens(payload) {
  exigirAdministracao_();
  const inicio = payload && payload.inicio;
  if (!Number.isInteger(inicio) || inicio < 0) throw new Error('Posicao de lote invalida.');
  const fonte = fonteOtimizacaoImagens_(payload.fonte);
  if (inicio > fonte.lista.length) throw new Error('O cadastro mudou. Reinicie a otimizacao.');
  const imagens = [];
  let proximo = inicio, tamanho = 0;
  // Limita quantidade e payload; uma imagem legada grande ainda precisa caber sozinha.
  while (proximo < fonte.lista.length && imagens.length < 5) {
    const item = fonte.lista[proximo];
    if (!item || typeof item !== 'object') throw new Error('Registro invalido em ' + fonte.nome + '.');
    const imagem = String(item[fonte.campo] || '');
    if (imagem) {
      if (imagens.length && tamanho + imagem.length > 4 * 1024 * 1024) break;
      imagens.push({ indice: proximo, imagem: imagem });
      tamanho += imagem.length;
    }
    proximo++;
  }
  return { imagens: imagens, proximo: proximo, fim: proximo === fonte.lista.length,
    assinatura: assinaturaEscudoEquipe_(JSON.stringify(fonte.lista)) };
}

function salvarLoteOtimizacaoImagens(payload) {
  exigirAdministracao_();
  const entradas = payload && payload.imagens;
  if (!Array.isArray(entradas) || !entradas.length || entradas.length > 5) {
    throw new Error('Informe de uma a cinco imagens por lote.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const fonte = fonteOtimizacaoImagens_(payload.fonte);
    if (payload.assinatura !== assinaturaEscudoEquipe_(JSON.stringify(fonte.lista))) {
      throw new Error('O cadastro mudou durante a preparacao. Reinicie a otimizacao; lotes anteriores permanecem salvos.');
    }
    const indices = new Set();
    const alteracoes = entradas.map(function (entrada) {
      if (!entrada || !Number.isInteger(entrada.indice) || entrada.indice < 0
          || entrada.indice >= fonte.lista.length || indices.has(entrada.indice)) {
        throw new Error('Indices de imagens invalidos ou repetidos.');
      }
      indices.add(entrada.indice);
      const item = fonte.lista[entrada.indice];
      const imagem = entrada.imagem;
      if (!item || typeof imagem !== 'string'
          || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imagem)
          || imagem.length > fonte.limite || imagem.length >= String(item[fonte.campo] || '').length) {
        throw new Error('A imagem otimizada deve ser valida, menor que a original e respeitar o limite de tamanho.');
      }
      return { item: item, imagem: imagem };
    });
    const backup = pastaRaizProjeto_().createFile(Utilities.newBlob(JSON.stringify({
      arquivoOriginal: fonte.nome, fonte: payload.fonte, registros: fonte.lista
    }), 'application/json', 'AEUV - Backup Imagens - ' + Utilities.getUuid() + '.json'));
    alteracoes.forEach(function (alteracao) { alteracao.item[fonte.campo] = alteracao.imagem; });
    // O backup precede a publicacao; snapshots esportivos salvos permanecem intactos.
    fonte.gravar(fonte.lista);
    return { total: alteracoes.length, backupId: backup.getId() };
  } finally {
    lock.releaseLock();
  }
}

function exigirSessaoElenco_(recursos) {
  const atual = medirRecursoCadastro_(recursos, 'lock_autorizacao_identificar', identificarUsuario_);
  medirRecursoCadastro_(recursos, 'lock_autorizacao_perfil', function () {
    if (!atual.autorizado || ['admin', 'diretoria', 'associado'].indexOf(atual.usuario.perfil) === -1) {
      throw new Error('Você não tem permissão para acessar este elenco.');
    }
  });
  return atual;
}

// recursos: objeto local de uma única operação, preenchido apenas sob o ScriptLock.
function sessaoElenco_(campeonatoId, equipeId, lockJaAdquirido, recursos) {
  const prefixo = lockJaAdquirido ? 'lock_' : 'pre_lock_';
  const medir = function (fase, operacao) {
    return recursos ? medirFaseCadastro_(prefixo + fase, operacao) : operacao();
  };
  const sessao = medir('autorizacao', function () {
    return exigirSessaoElenco_(lockJaAdquirido ? recursos : null);
  });
  const vinculo = medir('vinculo', function () {
    // Salvamentos com recursos não migram o registro antes de validar todo o alvo.
    const registroEquipes = medir('equipes_registro', function () {
      return equipesRegistro_(lockJaAdquirido, Boolean(recursos && lockJaAdquirido), recursos);
    });
    const ativas = medir('equipes_ativas', function () { return obterEquipes_().map(chaveEquipe_); });
    const equipe = medir('equipe_acesso', function () {
      const encontrada = registroEquipes.find(function (item) {
        return item.id === String(equipeId || '').trim()
          && ativas.indexOf(chaveEquipe_(item.nome)) !== -1;
      });
      if (!encontrada || (sessao.usuario.perfil === 'associado'
          && chaveEquipe_(sessao.usuario.equipe) !== chaveEquipe_(encontrada.nome))) {
        throw new Error('Esta equipe não pertence ao seu acesso.');
      }
      return encontrada;
    });
    const campeonatos = medir('campeonatos', function () { return campeonatos_(recursos); });
    const campeonato = medir('campeonato_alvo', function () {
      return campeonatos.find(function (item) { return item.id === String(campeonatoId || '').trim(); });
    });
    const times = medir('times', function () { return campeonato ? timesCampeonato_(campeonato.id) : []; });
    medir('vinculo_validacao', function () {
      if (!campeonato || !times.some(function (nome) {
        return chaveEquipe_(nome) === chaveEquipe_(equipe.nome);
      })) {
        throw new Error('Esta equipe não está vinculada a este campeonato.');
      }
    });
    return { registroEquipes: registroEquipes, ativas: ativas, equipe: equipe,
      campeonatos: campeonatos, campeonato: campeonato, times: times };
  });
  if (recursos && lockJaAdquirido) {
    recursos.equipes = vinculo.registroEquipes;
    recursos.equipesAtivas = vinculo.ativas;
    recursos.campeonatos = vinculo.campeonatos;
    recursos.times = Object.create(null);
    recursos.times[vinculo.campeonato.id] = vinculo.times;
  }
  return { sessao: sessao, equipe: vinculo.equipe, campeonato: vinculo.campeonato,
    registroEquipes: vinculo.registroEquipes };
}

// Recursos lidos sob o lock da própria operação; sem recursos, lê normalmente.
function timesCampeonatoOperacao_(campeonatoId, recursos) {
  if (!recursos) return timesCampeonato_(campeonatoId);
  const times = recursos.times || (recursos.times = Object.create(null));
  if (!times[campeonatoId]) times[campeonatoId] = timesCampeonato_(campeonatoId);
  return times[campeonatoId].slice();
}

function lerElencoBrutoOperacao_(campeonatoId, tipo, recursos) {
  const ler = function () {
    if (elencosParticionadosCutoverAtivo_()) {
      if (recursos && recursos.elencoEquipeId) {
        return lerParticaoElencoOperacao_(campeonatoId, tipo, recursos.elencoEquipeId, recursos);
      }
      const podeReutilizar = recursos && LockService.getScriptLock().hasLock();
      const snapshots = podeReutilizar
        ? (recursos.elencosParticionadosSnapshots
          || (recursos.elencosParticionadosSnapshots = Object.create(null)))
        : null;
      let snapshot = snapshots && snapshots[campeonatoId];
      if (!snapshot) {
        const estado = lerEstadoElencosParticionados_(campeonatoId);
        const fontes = fontesEstadoElencoParticionado_(estado);
        snapshot = {
          estado: estado,
          fontes: fontes,
          assinatura: assinaturaEstadoElencoParticionado_(estado, fontes, recursos && recursos.equipes)
        };
        if (snapshots) snapshots[campeonatoId] = snapshot;
      }
      const estado = snapshot.estado;
      const assinatura = snapshot.assinatura;
      if (recursos) {
        const estados = recursos.estadosElencosParticionados
          || (recursos.estadosElencosParticionados = Object.create(null));
        const anterior = estados[campeonatoId];
        if (anterior && anterior.assinatura !== assinatura) {
          throw new Error('Uma fonte do elenco mudou durante a operacao. Recarregue antes de repetir.');
        }
        estados[campeonatoId] = { revisao: estado.manifesto.revisao, assinatura: assinatura };
      }
      return lerElencoParticionadoPorEquipe_(campeonatoId, tipo, estado, snapshot.fontes)
        .reduce(function (lista, equipe) { return lista.concat(equipe.registros); }, []);
    }
    return lerListaCadastroDrive_(
      arquivoCadastroPessoasCampeonato_(campeonatoId, tipo === 'atletas' ? 'Atletas' : 'Comissao Tecnica'),
      tipo === 'atletas' ? chaveAtletasCampeonato_(campeonatoId) : chaveComissaoTecnicaCampeonato_(campeonatoId),
      recursos, tipo
    );
  };
  if (!recursos) return ler();
  const brutos = recursos.elencosBrutos || (recursos.elencosBrutos = Object.create(null));
  const chave = JSON.stringify([campeonatoId, tipo]);
  if (!brutos[chave]) brutos[chave] = ler();
  return brutos[chave];
}

function lerParticaoElencoOperacao_(campeonatoId, tipo, equipeId, recursos, checkpoint) {
  checkpoint = checkpoint || recursos.checkpointsValidacaoElenco
    && recursos.checkpointsValidacaoElenco[campeonatoId];
  const estado = checkpoint ? checkpoint.estado : lerEstadoElencosParticionados_(campeonatoId);
  const assinatura = assinaturaEstadoElencoParticionado_(estado, null, recursos.equipes, checkpoint);
  const estados = recursos.estadosElencosParticionados
    || (recursos.estadosElencosParticionados = Object.create(null));
  const anterior = estados[campeonatoId];
  if (anterior && anterior.assinatura !== assinatura) {
    throw new Error('Uma fonte do elenco mudou durante a operacao. Recarregue antes de repetir.');
  }
  estados[campeonatoId] = { revisao: estado.manifesto.revisao, assinatura: assinatura };
  const chave = JSON.stringify([tipo, equipeId]);
  const validadas = recursos.particoesElencosValidadas
    || (recursos.particoesElencosValidadas = Object.create(null));
  const chaveValidada = JSON.stringify([campeonatoId, tipo, equipeId]);
  const validada = validadas[chaveValidada];
  const registros = checkpoint && validada && validada.assinatura === assinatura
    ? validada.registros : lerParticaoElenco_(campeonatoId, equipeId, tipo, estado);
  validadas[chaveValidada] = { assinatura: assinatura, registros: registros };
  const particoes = recursos.particoesElencos || (recursos.particoesElencos = Object.create(null));
  particoes[chave] = registros;
  return registros;
}

function descartarElencoBrutoOperacao_(campeonatoId, tipo, recursos) {
  if (recursos && recursos.elencosBrutos) delete recursos.elencosBrutos[JSON.stringify([campeonatoId, tipo])];
  if (recursos && recursos.elencosParticionadosSnapshots) delete recursos.elencosParticionadosSnapshots[campeonatoId];
  if (recursos && recursos.particoesElencos && recursos.elencoEquipeId) {
    delete recursos.particoesElencos[JSON.stringify([tipo, recursos.elencoEquipeId])];
  }
}

function jogosParticipacaoOperacao_(campeonatoId, recursos) {
  const indice = consultarIndiceValidacao_(campeonatoId, recursos, 'tabela');
  if (indice) return { indiceParticipacao: indice.participacao };
  if (!recursos) return jogosParticipacaoCampeonato_(campeonatoId);
  const jogos = recursos.jogos || (recursos.jogos = Object.create(null));
  if (!jogos[campeonatoId]) jogos[campeonatoId] = jogosParticipacaoCampeonato_(campeonatoId);
  return jogos[campeonatoId];
}

function medirRecursoCadastro_(recursos, fase, operacao) {
  return recursos ? medirFaseCadastro_(fase, operacao) : operacao();
}

const ELENCO_BLOQUEIOS_ARQUIVO = 'AEUV - Bloqueios de Elenco.json';

function lerBloqueiosElenco_(recursos) {
  const arquivo = resolverArquivoCadastro_(ELENCO_BLOQUEIOS_ARQUIVO, recursos, 'bloqueios').arquivo;
  if (!arquivo) return [];
  let registros;
  try {
    const bruto = medirEtapaCadastro_(recursos, 'bloqueios', 'drive_ler', function () {
      return arquivo.getBlob().getDataAsString('UTF-8');
    });
    registros = medirEtapaCadastro_(recursos, 'bloqueios', 'json_parse', function () { return JSON.parse(bruto); });
  }
  catch (e) { throw new Error('O registro de bloqueios de elenco no Drive está inválido.'); }
  if (!Array.isArray(registros) || registros.some(function (item) {
    return !item || typeof item.campeonatoId !== 'string' || !item.campeonatoId
      || typeof item.equipeId !== 'string' || !item.equipeId || typeof item.bloqueado !== 'boolean';
  })) throw new Error('O registro de bloqueios de elenco no Drive está inválido.');
  const pares = new Set();
  registros.forEach(function (item) {
    const chave = JSON.stringify([item.campeonatoId, item.equipeId]);
    if (pares.has(chave)) throw new Error('O registro de bloqueios de elenco contém vínculos duplicados.');
    pares.add(chave);
  });
  return registros;
}

function elencoBloqueado_(campeonatoId, equipeId, registros) {
  return (registros || lerBloqueiosElenco_()).some(function (item) {
    return item.campeonatoId === campeonatoId && item.equipeId === equipeId && item.bloqueado;
  });
}

// Executado dentro do ScriptLock de cada escrita, com sessão e vínculo reavaliados.
function exigirEdicaoElenco_(contexto, recursos) {
  return exigirEdicaoElencoPorIds_(contexto.campeonato.id, contexto.equipe.id, recursos);
}

function exigirEdicaoElencoPorIds_(campeonatoId, equipeId, recursos) {
  const atual = sessaoElenco_(campeonatoId, equipeId, true, recursos);
  let bloqueios;
  const bloqueado = medirRecursoCadastro_(recursos, 'lock_bloqueio', function () {
    bloqueios = medirRecursoCadastro_(recursos, 'lock_bloqueio_leitura', function () {
      return lerBloqueiosElenco_(recursos);
    });
    return medirRecursoCadastro_(recursos, 'lock_bloqueio_consulta', function () {
      return elencoBloqueado_(atual.campeonato.id, atual.equipe.id, bloqueios);
    });
  });
  if (atual.sessao.usuario.perfil === 'associado' && bloqueado) {
    throw new Error('Elenco bloqueado. Somente leitura para o associado.');
  }
  if (recursos) {
    recursos.bloqueios = bloqueios;
    // Marca o único contexto autorizado a reutilizar estes recursos na resposta.
    recursos.contexto = atual;
    recursos.arquivosDrive = { contexto: atual, arquivos: Object.create(null) };
  }
  return atual;
}

function definirBloqueioElenco(payload) {
  const dados = payload || {};
  if (typeof dados.bloqueado !== 'boolean') throw new Error('Informe o estado de bloqueio do elenco.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const contexto = sessaoElenco_(dados.campeonatoId, dados.equipeId, true);
    if (EQUIPES_PERFIS_EDICAO.indexOf(contexto.sessao.usuario.perfil) === -1) {
      throw new Error('Somente admin e diretoria podem bloquear ou desbloquear o elenco.');
    }
    const registros = lerBloqueiosElenco_();
    let registro = registros.find(function (item) {
      return item.campeonatoId === contexto.campeonato.id && item.equipeId === contexto.equipe.id;
    });
    if (!registro) {
      registro = { campeonatoId: contexto.campeonato.id, equipeId: contexto.equipe.id };
      registros.push(registro);
    }
    registro.bloqueado = dados.bloqueado;
    marcarSnapshotsEsportivosPendentes_();
    const localizado = resolverArquivoCadastro_(ELENCO_BLOQUEIOS_ARQUIVO);
    const json = JSON.stringify(registros);
    if (localizado.arquivo) localizado.arquivo.setContent(json);
    else criarArquivoCadastro_(localizado, ELENCO_BLOQUEIOS_ARQUIVO, json);
    return listarElenco(contexto.campeonato.id, contexto.equipe.id, true);
  } finally { lock.releaseLock(); }
}

function validarAlvoElenco_(contexto, tipo, id, recursos, solicitacaoElenco) {
  if (!contexto && !solicitacaoElenco) return;
  // A solicitação contém só IDs não confiáveis, nunca sessão, equipe ou campeonato validados.
  const atual = solicitacaoElenco
    ? exigirEdicaoElencoPorIds_(solicitacaoElenco.campeonatoId, solicitacaoElenco.equipeId, recursos)
    : exigirEdicaoElenco_(contexto, recursos);
  if (recursos) recursos.elencoEquipeId = atual.equipe.id;
  if (recursos && elencosParticionadosCutoverAtivo_()) {
    // One immutable validation phase; the writer establishes a fresh boundary.
    recursos.checkpointsValidacaoElenco = Object.create(null);
    recursos.checkpointsValidacaoElenco[atual.campeonato.id] =
      checkpointElencoParticionado_(atual.campeonato.id, recursos.equipes);
  }
  if (!id) return atual;
  const lista = medirRecursoCadastro_(recursos, 'lock_elenco_leitura', function () {
    return tipo === 'comissao' ? comissaoTecnicaCampeonato_(atual.campeonato.id, false, recursos)
      : atletasCampeonato_(atual.campeonato.id, false, recursos);
  });
  const alvo = lista.find(function (item) { return item.id === id; });
  if (!alvo || chaveEquipe_(alvo.timeVinculado) !== chaveEquipe_(atual.equipe.nome)) {
    throw new Error('Este cadastro não pertence ao elenco selecionado.');
  }
  if (recursos) recursos.listaValidacao = lista;
  return atual;
}

// Evidência de participação: somente snapshots de resultado salvos (jogo encerrado com
// resultado detalhado) com participou === true. Gols/cartões sem participação, placares sem
// resultado detalhado e jogos já removidos da tabela não são considerados.
function jogosParticipacaoCampeonato_(campeonatoId) {
  const doc = lerTabelaCampeonato_(campeonatoId);
  doc.jogos.forEach(function (jogo) {
    if (!Object.prototype.hasOwnProperty.call(jogo, 'resultado')) return;
    try { validarResultadoSalvoTabela_(jogo.resultado, jogo); }
    catch (e) {
      throw new Error('O resultado salvo do jogo ' + jogo.id + ' está inválido; não é possível verificar a participação '
        + 'dos atletas neste campeonato. Corrija a tabela antes de continuar. ' + e.message);
    }
  });
  return doc.jogos;
}

// IDs das equipes pelas quais o atleta (mesmo ID ou mesmo CPF normalizado) participou no campeonato.
function equipesParticipacaoAtleta_(jogos, atleta) {
  const id = String((atleta && atleta.id) || '').trim();
  const cpf = somenteDigitos_((atleta && atleta.cpf) || '');
  if (jogos && jogos.indiceParticipacao) {
    const mapa = jogos.indiceParticipacao;
    const primeiras = Object.create(null);
    (mapa[JSON.stringify(['id', id])] || []).concat(mapa[JSON.stringify(['cpf', cpf])] || [])
      .forEach(function (entrada) {
        if (primeiras[entrada[0]] === undefined || entrada[1] < primeiras[entrada[0]]) primeiras[entrada[0]] = entrada[1];
      });
    return Object.keys(primeiras).sort(function (a, b) { return primeiras[a] - primeiras[b]; });
  }
  const equipes = [];
  (jogos || []).forEach(function (jogo) {
    if (jogo.status !== 'encerrado' || !jogo.resultado) return;
    jogo.resultado.equipes.forEach(function (equipe) {
      if (equipes.indexOf(equipe.id) !== -1) return;
      if (equipe.atletas.some(function (participante) {
        if (participante.participou !== true) return false;
        return (id && participante.id === id) || (cpf && somenteDigitos_(participante.cpf || '') === cpf);
      })) equipes.push(equipe.id);
    });
  });
  return equipes;
}

function atletaParticipouCompeticao_(jogos, atleta) {
  return equipesParticipacaoAtleta_(jogos, atleta).length > 0;
}

function mensagemVinculoCompeticao_(atleta, campeonato, restricao) {
  return 'O atleta ' + String((atleta && atleta.nome) || '').trim() + ' já participou de jogo do campeonato '
    + campeonato.nome + ' e ' + restricao + '. O vínculo com a equipe é mantido no elenco histórico da competição, '
    + 'inclusive após o encerramento.';
}

// Somente campos derivados de resposta; gravarAtletasCampeonato_ não persiste estes campos.
function anotarVinculoCompeticaoAtletas_(campeonato, atletas, jogos) {
  atletas.forEach(function (atleta) {
    const participou = atletaParticipouCompeticao_(jogos, atleta);
    atleta.participouCompeticao = participou;
    atleta.podeRemover = !participou;
    atleta.motivoRemocao = participou ? mensagemVinculoCompeticao_(atleta, campeonato, 'não pode ser removido') : '';
  });
  return atletas;
}

// Novo vínculo (inscrição, importação, troca de CPF/equipe): um CPF que já jogou no campeonato
// só pode voltar à(s) equipe(s) pela(s) qual(is) participou.
function bloquearVinculoAtletaParticipante_(campeonato, jogos, cpf, timeVinculado, contexto, registroEquipes) {
  const jogadas = equipesParticipacaoAtleta_(jogos, { id: '', cpf: cpf });
  if (!jogadas.length) return;
  // registroEquipes, quando informado, foi relido sob o lock desta mesma operação.
  const registro = registroEquipes || lerRegistroEquipes_();
  const destino = registro.find(function (item) { return chaveEquipe_(item.nome) === chaveEquipe_(timeVinculado); });
  if (destino && jogadas.indexOf(destino.id) !== -1) return;
  const nomes = jogadas.map(function (id) {
    const equipe = registro.find(function (item) { return item.id === id; });
    return equipe ? equipe.nome : '';
  }).filter(function (nome) { return !!nome; });
  let mensagem = 'Este CPF já participou de jogo do campeonato ' + campeonato.nome
    + (nomes.length ? ' pela equipe ' + nomes.join(', ') : '')
    + ' e não pode ser vinculado a outra equipe nesta competição. O vínculo original é mantido no elenco histórico, '
    + 'inclusive após o encerramento.';
  if (contexto && contexto.sessao.usuario.perfil === 'associado' && nomes.length) {
    const contato = contatoResponsavelEquipeConflito_(nomes[0]);
    mensagem += ' Responsável: ' + contato.nome + '. Telefone: ' + contato.telefone + '.';
  }
  throw new Error(mensagem);
}

function equipesDestinoTransferencia_(contexto, lockJaAdquirido, recursos) {
  const nomes = timesCampeonatoOperacao_(contexto.campeonato.id, recursos);
  const ativas = recursos && recursos.equipesAtivas ? recursos.equipesAtivas : obterEquipes_().map(chaveEquipe_);
  return (contexto.registroEquipes || equipesRegistro_(lockJaAdquirido)).filter(function (equipe) {
    return equipe.id !== contexto.equipe.id && ativas.indexOf(chaveEquipe_(equipe.nome)) !== -1
      && nomes.some(function (nome) { return chaveEquipe_(nome) === chaveEquipe_(equipe.nome); });
  }).map(function (equipe) { return { id: equipe.id, nome: equipe.nome }; });
}

function listarElenco(campeonatoId, equipeId, lockJaAdquirido) {
  return medirFaseCadastro_('listar_elenco_total', function () {
    return listarElencoInterno_(campeonatoId, equipeId, lockJaAdquirido);
  });
}

function listarElencoInterno_(campeonatoId, equipeId, lockJaAdquirido) {
  const lock = lockJaAdquirido ? null : LockService.getScriptLock();
  if (lock) medirFaseCadastro_('listar_elenco_espera_lock', function () { lock.waitLock(30000); });
  try {
    const contexto = sessaoElenco_(campeonatoId, equipeId, true);
    let recursos, listas;
    if (elencosParticionadosCutoverAtivo_()) {
      recursos = {
        contexto: contexto, elencoEquipeId: contexto.equipe.id,
        equipes: contexto.registroEquipes, campeonatos: [contexto.campeonato]
      };
      listas = {
        atletas: atletasCampeonato_(contexto.campeonato.id, false, recursos),
        comissao: comissaoTecnicaCampeonato_(contexto.campeonato.id, false, recursos)
      };
    }
    return medirFaseCadastro_('listar_elenco_montar_resposta', function () {
      return montarRespostaElenco_(contexto, listas, recursos);
    });
  } finally {
    if (lock) lock.releaseLock();
  }
}

// Contexto revalidado e listas persistidas na mesma operação, ainda sob ScriptLock.
// Recursos só são reaproveitados quando pertencem ao contexto produzido por exigirEdicaoElenco_.
function montarRespostaElenco_(contexto, listas, recursos) {
    const operacao = recursos && recursos.contexto === contexto ? recursos : null;
    const bloqueado = elencoBloqueado_(contexto.campeonato.id, contexto.equipe.id,
      operacao ? operacao.bloqueios : null);
    const podeBloquear = EQUIPES_PERFIS_EDICAO.indexOf(contexto.sessao.usuario.perfil) !== -1;
    const podeEditar = podeBloquear || !bloqueado;
    const proprio = function (item) { return chaveEquipe_(item.timeVinculado) === chaveEquipe_(contexto.equipe.nome); };
    const atletas = (listas ? listas.atletas : atletasCampeonato_(contexto.campeonato.id, true))
      .filter(proprio).map(function (item) { return Object.assign({}, item); });
    const podeTransferir = EQUIPES_PERFIS_EDICAO.indexOf(contexto.sessao.usuario.perfil) !== -1;
    const destinos = podeTransferir ? medirRecursoCadastro_(operacao, 'resposta_destinos', function () {
      return equipesDestinoTransferencia_(contexto, true, operacao);
    }) : [];
    // A trava de remoção vale para todos os perfis, independentemente de haver destinos de transferência.
    anotarVinculoCompeticaoAtletas_(contexto.campeonato, atletas,
      atletas.length ? medirRecursoCadastro_(operacao, 'resposta_participacao', function () {
        return jogosParticipacaoOperacao_(contexto.campeonato.id, operacao);
      }) : []);
    if (podeTransferir) {
      atletas.forEach(function (atleta) {
        atleta.motivoTransferencia = atleta.participouCompeticao
          ? mensagemVinculoCompeticao_(atleta, contexto.campeonato, 'não pode ser transferido')
          : (destinos.length ? 'Não há participação registrada em jogos encerrados deste campeonato.'
            : 'Não há outra equipe ativa vinculada a este campeonato.');
      });
    }
    const times = {};
    times[contexto.campeonato.id] = [contexto.equipe.nome];
    return {
      bloqueado: bloqueado,
      podeEditar: podeEditar,
      podeBloquear: podeBloquear,
      podeTransferir: podeTransferir,
      equipesDestinoTransferencia: destinos,
      recado: !podeEditar ? 'Somente leitura — elenco bloqueado pela administração.' : '',
      equipe: contexto.equipe,
      campeonatos: [{ id: contexto.campeonato.id, nome: contexto.campeonato.nome }],
      times: times,
      posicoes: ATLETAS_CAMPEONATO_POSICOES,
      cargos: COMISSAO_CARGOS.slice(),
      registros: [{
        campeonatoId: contexto.campeonato.id, campeonatoNome: contexto.campeonato.nome,
        atletas: atletas,
        comissao: (listas ? listas.comissao : comissaoTecnicaCampeonato_(contexto.campeonato.id)).filter(proprio)
      }],
      linkInscricao: contexto.sessao.usuario.perfil === 'associado' ? ''
        : ScriptApp.getService().getUrl() + '?origem=direto&campeonatoId='
          + encodeURIComponent(contexto.campeonato.id) + '&equipeId=' + encodeURIComponent(contexto.equipe.id)
    };
}

function transferirAtletaElenco(payload) {
  return medirFaseCadastro_('transferencia_total', function () {
    return transferirAtletaElencoInterno_(payload);
  });
}

function transferirAtletaElencoInterno_(payload) {
  const dados = payload || {};
  medirFaseCadastro_('pre_lock_autorizacao', exigirTransferenciaElenco_);
  const solicitacao = validarIdsMutacaoElenco_(dados, true);
  const lock = LockService.getScriptLock();
  medirFaseCadastro_('espera_lock', function () { lock.waitLock(30000); });
  const recursos = {};
  try {
    const origemAtual = validarAlvoElenco_(null, 'atletas', solicitacao.registroId, recursos, solicitacao);
    if (EQUIPES_PERFIS_EDICAO.indexOf(origemAtual.sessao.usuario.perfil) === -1) {
      throw new Error('Somente admin e diretoria podem transferir atletas entre equipes.');
    }
    if (solicitacao.equipeDestinoId === origemAtual.equipe.id) throw new Error('Escolha outra equipe do mesmo campeonato.');
    // Destinos derivados apenas do registro, equipes ativas e vínculos relidos sob este lock.
    const destino = medirRecursoCadastro_(recursos, 'lock_destino', function () {
      return equipesDestinoTransferencia_(origemAtual, true, recursos).find(function (item) {
        return item.id === solicitacao.equipeDestinoId;
      });
    });
    if (!destino) {
      throw new Error('A equipe de destino não está ativa e vinculada a este campeonato.');
    }
    const lista = recursos.listaValidacao;
    const atleta = lista.find(function (item) { return item.id === solicitacao.registroId; });

    // Qualquer participação no campeonato (por qualquer equipe, mesmo ID ou mesmo CPF) bloqueia a troca.
    medirRecursoCadastro_(recursos, 'lock_participacao', function () {
      if (atletaParticipouCompeticao_(jogosParticipacaoOperacao_(origemAtual.campeonato.id, recursos), atleta)) {
        throw new Error(mensagemVinculoCompeticao_(atleta, origemAtual.campeonato, 'não pode ser transferido'));
      }
    });

    if (elencosParticionadosCutoverAtivo_()) {
      const origemId = origemAtual.equipe.id;
      const origemAntes = lista.slice();
      const destinoAntes = lerParticaoElencoOperacao_(
        origemAtual.campeonato.id, 'atletas', solicitacao.equipeDestinoId, recursos);
      if (destinoAntes.some(function (item) { return item.id === atleta.id; })) {
        throw new Error('Registro de transferencia ausente ou duplicado. Recarregue antes de continuar.');
      }
      const cache = {};
      medirFaseCadastro_('preparacao_historico', function () {
        return prepararHistoricoElenco_(cache, recursos, origemAtual.campeonato.id);
      });
      const origemDepois = origemAntes.filter(function (item) { return item.id !== atleta.id; });
      const destinoDepois = destinoAntes.concat([
        Object.assign({}, atleta, { timeVinculado: destino.nome })
      ]);
      try {
        medirFaseCadastro_('gravacao_elenco', function () {
          const checkpoint = medirFaseCadastro_('elenco_metadados_preparacao', function () {
            delete recursos.checkpointsValidacaoElenco;
            return checkpointElencoParticionado_(origemAtual.campeonato.id, recursos.equipes);
          });
          const anterior = recursos.estadosElencosParticionados[origemAtual.campeonato.id];
          if (anterior.assinatura !== checkpoint.assinatura) {
            throw new Error('Uma fonte do elenco mudou durante a operacao. Recarregue antes de repetir.');
          }
          const mutacaoIndice = medirFaseCadastro_('elenco_indice_base', function () {
            return iniciarMutacaoIndiceParticionado_(origemAtual.campeonato.id, recursos, checkpoint);
          });
          delete recursos.indicesValidacao;
          marcarHistoricoElencoPendente_(origemAtual.campeonato.id);
          marcarSnapshotsEsportivosPendentes_();
          gravarParticoesElenco_(origemAtual.campeonato.id, [
            { tipo: 'atletas', equipeId: origemId, registros: origemDepois },
            { tipo: 'atletas', equipeId: destino.id, registros: destinoDepois }
          ], anterior.revisao, anterior.assinatura, false, recursos, checkpoint);
          medirFaseCadastro_('elenco_indice_incremental', function () {
            concluirMutacaoIndiceParticionado_(mutacaoIndice, origemAtual.campeonato.id, [
              { tipo: 'atletas', equipeId: origemId, antes: origemAntes, depois: origemDepois },
              { tipo: 'atletas', equipeId: destino.id, antes: destinoAntes, depois: destinoDepois }
            ], recursos);
          });
        });
      } catch (causa) {
        const erro = new Error('Nao foi possivel confirmar a transferencia do elenco. Recarregue antes de repetir a operacao.');
        erro.cause = causa;
        throw erro;
      }
      cache[origemAtual.campeonato.id].atletas = origemDepois;
      const resposta = medirFaseCadastro_('resposta', function () {
        return montarRespostaElenco_(origemAtual, cache[origemAtual.campeonato.id], recursos);
      });
      resposta.recado = atleta.nome + ' transferido para ' + destino.nome
        + '. O histórico será consolidado em segundo plano.';
      return resposta;
    }

    const cache = {};
    // Persist the original snapshot for this championship before changing the team.
    const historico = medirFaseCadastro_('preparacao_historico', function () {
      return prepararHistoricoElenco_(cache, recursos, origemAtual.campeonato.id);
    });
    const atualizada = lista.map(function (item) {
      if (item.id !== atleta.id) return item;
      return Object.assign({}, item, { timeVinculado: destino.nome });
    });
    gravarAtletasCampeonato_(origemAtual.campeonato.id, atualizada, recursos,
      historico, cache[origemAtual.campeonato.id]);
    const resposta = medirFaseCadastro_('resposta', function () {
      return montarRespostaElenco_(origemAtual, cache[origemAtual.campeonato.id], recursos);
    });
    resposta.recado = atleta.nome + ' transferido para ' + destino.nome
      + '. O histórico será consolidado em segundo plano.';
    return resposta;
  } finally {
    delete recursos.arquivosDrive;
    lock.releaseLock();
  }
}

function exigirTransferenciaElenco_() {
  const sessao = identificarUsuario_();
  if (!sessao.autorizado || EQUIPES_PERFIS_EDICAO.indexOf(sessao.usuario.perfil) === -1) {
    throw new Error('Somente admin e diretoria podem transferir atletas entre equipes.');
  }
  return sessao;
}

function validarIdsMutacaoElenco_(dados, transferencia) {
  const campos = ['campeonatoId', 'equipeId', 'registroId'];
  if (transferencia) campos.push('equipeDestinoId');
  if (campos.some(function (campo) { return typeof dados[campo] !== 'string' || !dados[campo].trim(); })) {
    throw new Error('Informe campeonato, equipe e cadastro válidos.');
  }
  const solicitacao = {};
  campos.forEach(function (campo) { solicitacao[campo] = dados[campo].trim(); });
  return solicitacao;
}

function salvarCadastroElenco(payload) {
  const dados = payload || {};
  const tipo = dados.tipo === 'comissao' ? 'comissao' : 'atleta';
  const acao = String(dados.registroId || '').trim() ? 'editar' : 'adicionar';
  return medirFaseCadastro_(acao + '_' + tipo + '_total', function () {
    return salvarCadastroElencoInterno_(payload);
  });
}

function salvarCadastroElencoInterno_(payload) {
  const dados = Object.assign({}, payload || {});
  medirFaseCadastro_('validacao_leitura', function () {
    medirFaseCadastro_('pre_lock_autorizacao', exigirSessaoElenco_);
  });
  if (dados.tipo !== 'atletas' && dados.tipo !== 'comissao') throw new Error('Escolha um tipo de cadastro válido.');
  if (typeof dados.campeonatoId !== 'string' || !dados.campeonatoId.trim()
      || typeof dados.equipeId !== 'string' || !dados.equipeId.trim()
      || (dados.registroId != null && typeof dados.registroId !== 'string')) {
    throw new Error('Informe campeonato, equipe e cadastro válidos.');
  }
  const solicitacaoElenco = { campeonatoId: dados.campeonatoId.trim(), equipeId: dados.equipeId.trim() };
  const id = String(dados.registroId || '').trim();
  dados.campeonatoId = solicitacaoElenco.campeonatoId;
  delete dados.timeVinculado;
  delete dados.id;
  delete dados.atletaId;
  delete dados.membroId;
  if (dados.tipo === 'comissao') {
    if (id) {
      dados.membroId = id;
      return atualizarMembroComissaoInterno_(dados, null, solicitacaoElenco);
    }
    return salvarMembroComissaoInterno_(dados, null, solicitacaoElenco);
  }
  if (id) {
    dados.atletaId = id;
    return atualizarAtletaCampeonatoInterno_(dados, null, solicitacaoElenco);
  }
  return salvarAtletaCampeonatoInterno_(dados, null, solicitacaoElenco);
}

function removerCadastroElenco(payload) {
  return medirFaseCadastro_('remover_elenco_total', function () {
    return removerCadastroElencoInterno_(payload);
  });
}

function removerCadastroElencoInterno_(payload) {
  const dados = payload || {};
  medirFaseCadastro_('pre_lock_autorizacao', exigirSessaoElenco_);
  const solicitacao = validarIdsMutacaoElenco_(dados, false);
  if (['atletas', 'comissao'].indexOf(dados.tipo) === -1) throw new Error('Informe o cadastro a remover.');
  return dados.tipo === 'comissao'
    ? removerMembroComissaoInterno_(solicitacao.campeonatoId, solicitacao.registroId, null, solicitacao)
    : removerAtletaCampeonatoInterno_(solicitacao.campeonatoId, solicitacao.registroId, null, solicitacao);
}

function removerPessoaCampeonatoInterno_(campeonatoId, registroId, tipo, contexto, solicitacaoElenco) {
  return medirFaseCadastro_('remocao_' + tipo + '_total', function () {
    const id = String(campeonatoId || '').trim();
    const alvoId = String(registroId || '').trim();
    if (!id || !alvoId) throw new Error(tipo === 'atletas'
      ? 'Informe o campeonato e o atleta a remover.' : 'Informe o campeonato e o membro a remover.');
    const lock = LockService.getScriptLock();
    medirFaseCadastro_('espera_lock', function () { lock.waitLock(30000); });
    const recursos = {};
    let tela;
    try {
      // O endpoint legado continua exclusivo de admin/diretoria; não aceita contexto do cliente.
      if (!contexto && !solicitacaoElenco) medirFaseCadastro_('lock_autorizacao', sessaoCampeonato_);
      const atual = validarAlvoElenco_(contexto, tipo, alvoId, recursos, solicitacaoElenco);
      if (!atual) recursos.campeonatos = campeonatos_();
      const campeonato = atual ? atual.campeonato
        : recursos.campeonatos.find(function (item) { return item.id === id; });
      if (tipo === 'atletas' && !campeonato) throw new Error('Campeonato não encontrado.');
      const atuais = recursos.listaValidacao || medirRecursoCadastro_(recursos, 'lock_elenco_leitura', function () {
        return tipo === 'atletas' ? atletasCampeonato_(id, false, recursos)
          : comissaoTecnicaCampeonato_(id, false, recursos);
      });
      if (tipo === 'atletas') {
        const alvo = atuais.find(function (item) { return item.id === alvoId; });
        if (!alvo) throw new Error('Atleta não encontrado neste campeonato. Atualize a lista antes de remover.');
        medirRecursoCadastro_(recursos, 'lock_participacao', function () {
          if (atletaParticipouCompeticao_(jogosParticipacaoOperacao_(id, recursos), alvo)) {
            throw new Error(mensagemVinculoCompeticao_(alvo, campeonato, 'não pode ser removido'));
          }
        });
      }
      const cache = {};
      // Save the current championship snapshot before the destructive roster write.
      const historico = medirFaseCadastro_('preparacao_historico', function () {
        return prepararHistoricoElenco_(cache, recursos, id);
      });
      const lista = atuais.filter(function (item) { return item.id !== alvoId; });
      if (tipo === 'atletas') gravarAtletasCampeonato_(id, lista, recursos, historico, cache[id]);
      else gravarComissaoTecnicaCampeonato_(id, lista, recursos, historico, cache[id]);
      if (atual) tela = medirFaseCadastro_('resposta', function () {
        return montarRespostaElenco_(atual, cache[id], recursos);
      });
    } finally {
      delete recursos.arquivosDrive;
      lock.releaseLock();
    }
    // O contrato agregado dos endpoints legados permanece inalterado.
    if (!tela) tela = medirFaseCadastro_('resposta', function () { return respostaCadastro_(contexto); });
    tela.recado = (tipo === 'atletas' ? 'Atleta removido do campeonato.' : 'Membro removido da comissão técnica.')
      + ' O histórico será consolidado em segundo plano.';
    return tela;
  });
}

function respostaCadastro_(contexto) {
  return contexto ? listarElenco(contexto.campeonato.id, contexto.equipe.id) : listarCadastroPessoasCampeonato();
}

const CADASTRO_METRICAS_ATIVAS = true;

function registrarTempoCadastro_(fase, inicio) {
  if (!CADASTRO_METRICAS_ATIVAS) return;
  console.log(JSON.stringify({ metrica: 'cadastro_elenco', fase: fase, duracaoMs: Date.now() - inicio }));
}

function medirFaseCadastro_(fase, operacao) {
  if (!CADASTRO_METRICAS_ATIVAS) return operacao();
  const inicio = Date.now();
  try { return operacao(); }
  finally { registrarTempoCadastro_(fase, inicio); }
}

function medirEtapaCadastro_(recursos, categoria, fase, operacao) {
  if (!CADASTRO_METRICAS_ATIVAS || !recursos) return operacao();
  const inicio = Date.now();
  try { return operacao(); }
  finally {
    console.log(JSON.stringify({ metrica: 'cadastro_elenco', fase: fase,
      categoria: categoria, duracaoMs: Date.now() - inicio }));
  }
}

// Handles e ausência pertencem ao contexto validado desta operação sob ScriptLock.
// Separado das listas brutas: invalidar uma lista não descarta seu arquivo.
function arquivosDriveOperacao_(recursos) {
  if (!recursos) return null;
  if (!recursos.contexto || !recursos.arquivosDrive
      || recursos.arquivosDrive.contexto !== recursos.contexto) {
    delete recursos.arquivosDrive;
    return null;
  }
  if (!LockService.getScriptLock().hasLock()) {
    delete recursos.arquivosDrive;
    return null;
  }
  return recursos.arquivosDrive.arquivos;
}

function localizarArquivoCadastro_(nomeArquivo, recursos, categoria) {
  const operacao = arquivosDriveOperacao_(recursos);
  if (operacao && Object.prototype.hasOwnProperty.call(operacao, nomeArquivo)) {
    return operacao[nomeArquivo];
  }
  const localizado = resolverArquivoCadastro_(nomeArquivo, recursos, categoria);
  if (operacao) operacao[nomeArquivo] = localizado;
  return localizado;
}

// Cache por usuário (USER_ACCESSING) apenas com IDs de arquivos: nunca conteúdo, ausência ou
// autorização. Todo uso reabre o arquivo e confere nome, lixeira e pasta raiz; o conteúdo é
// sempre lido do Drive. Sem cache, o comportamento é a busca por nome original.
// Desligar (false) volta integralmente à busca por nome, sem consultar o CacheService.
const ARQUIVO_ID_CACHE_ATIVO = true;
const ARQUIVO_ID_CACHE_VERSAO = 1;
const ARQUIVO_ID_CACHE_TTL_SEGUNDOS = 21600;

function arquivoIdCacheavel_(nomeArquivo) {
  return nomeArquivo === CONFIG.equipes.arquivoRegistro || nomeArquivo === CAMPEONATOS_ARQUIVO
    || nomeArquivo === ELENCO_BLOQUEIOS_ARQUIVO || nomeArquivo === ELENCO_HISTORICO_ARQUIVO
    || /^AEUV - Campeonato - [^ ]+ - (Atletas|Comissao Tecnica)\.json$/.test(nomeArquivo);
}

function cacheIdsArquivos_() {
  // Fixtures locais sem o serviço seguem a busca por nome; em produção usa a API real.
  if (!ARQUIVO_ID_CACHE_ATIVO || typeof CacheService === 'undefined') return null;
  try { return CacheService.getUserCache() || null; }
  catch (e) { return null; }
}

function chaveCacheIdArquivo_(nomeArquivo) {
  return 'aeuv.arquivoId.v' + ARQUIVO_ID_CACHE_VERSAO + '.' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify([ARQUIVO_ID_CACHE_VERSAO, CONFIG.pastaRaizId, nomeArquivo]), Utilities.Charset.UTF_8));
}

function registrarCacheIdArquivo_(recursos, categoria, resultado) {
  if (!CADASTRO_METRICAS_ATIVAS || !recursos) return;
  console.log(JSON.stringify({ metrica: 'cadastro_elenco', fase: 'drive_id',
    categoria: categoria, resultado: resultado }));
}

// Falhas do CacheService equivalem a "não memorizado"; nunca a arquivo ausente.
function removerCacheIdArquivo_(cache, chave) {
  if (!cache || !chave) return;
  try { cache.remove(chave); } catch (e) { /* o ID será reverificado no próximo uso */ }
}

function memorizarIdArquivo_(localizado) {
  if (!localizado.cache || !localizado.arquivo) return;
  const id = localizado.arquivo.getId();
  try { localizado.cache.put(localizado.chaveCache, id, ARQUIVO_ID_CACHE_TTL_SEGUNDOS); }
  catch (e) { /* sem ID memorizado, a próxima chamada busca pelo nome */ }
}

function invalidarIdArquivoCadastro_(nomeArquivo) {
  const cache = arquivoIdCacheavel_(nomeArquivo) ? cacheIdsArquivos_() : null;
  if (cache) removerCacheIdArquivo_(cache, chaveCacheIdArquivo_(nomeArquivo));
}

function lerCacheIdArquivo_(cache, chave, recursos, categoria) {
  let id;
  try {
    id = medirEtapaCadastro_(recursos, categoria, 'drive_id_cache', function () { return cache.get(chave); });
  } catch (e) {
    registrarCacheIdArquivo_(recursos, categoria, 'cache_indisponivel');
    return null;
  }
  if (id === null || id === undefined) {
    registrarCacheIdArquivo_(recursos, categoria, 'ausente');
    return null;
  }
  if (!/^[A-Za-z0-9_-]{10,128}$/.test(String(id))) {
    removerCacheIdArquivo_(cache, chave);
    registrarCacheIdArquivo_(recursos, categoria, 'invalido');
    return null;
  }
  return String(id);
}

function arquivoNaPastaRaiz_(arquivo) {
  const pais = arquivo.getParents();
  while (pais.hasNext()) {
    if (pais.next().getId() === CONFIG.pastaRaizId) return true;
  }
  return false;
}

// Apps Script não distingue com segurança "removido" de "sem permissão" em getFileById:
// nenhum erro vira busca por nome na mesma chamada. O ID é descartado e o erro é exibido;
// a próxima chamada busca pelo nome com as permissões atuais do usuário.
function abrirArquivoPorIdCache_(id, nomeArquivo, cache, chave, recursos, categoria) {
  let arquivo;
  let verificado = false;
  try {
    arquivo = medirEtapaCadastro_(recursos, categoria, 'drive_id_abrir', function () {
      const candidato = DriveApp.getFileById(id);
      return candidato.getName() === nomeArquivo && !candidato.isTrashed()
        && arquivoNaPastaRaiz_(candidato) ? candidato : null;
    });
    verificado = true;
  } catch (e) {
    registrarCacheIdArquivo_(recursos, categoria, 'falha');
    const erro = new Error('Não foi possível abrir um arquivo de cadastro no Drive pela referência memorizada '
      + '(removido definitivamente ou sem permissão). A referência foi descartada; tente novamente. '
      + 'Se persistir, verifique o seu acesso à pasta do projeto.');
    erro.cause = e;
    throw erro;
  } finally {
    if (!verificado) removerCacheIdArquivo_(cache, chave);
  }
  // Renomeado, movido ou na lixeira: o arquivo foi aberto com permissão, então a busca por nome é segura.
  if (!arquivo) removerCacheIdArquivo_(cache, chave);
  registrarCacheIdArquivo_(recursos, categoria, arquivo ? 'acerto' : 'divergente');
  return arquivo;
}

// Primeiro arquivo com o nome exato na pasta raiz, como antes; o ID dele é reutilizado entre
// chamadas enquanto continuar válido. Ausência nunca é memorizada.
function resolverArquivoCadastro_(nomeArquivo, recursos, categoria) {
  const cache = arquivoIdCacheavel_(nomeArquivo) ? cacheIdsArquivos_() : null;
  const chave = cache ? chaveCacheIdArquivo_(nomeArquivo) : '';
  if (cache) {
    const id = lerCacheIdArquivo_(cache, chave, recursos, categoria);
    const porId = id ? abrirArquivoPorIdCache_(id, nomeArquivo, cache, chave, recursos, categoria) : null;
    if (porId) return { raiz: null, arquivo: porId, cache: cache, chaveCache: chave };
  }
  let raiz;
  const arquivos = medirEtapaCadastro_(recursos, categoria, 'drive_localizar', function () {
    raiz = pastaRaizProjeto_();
    return raiz.getFilesByName(nomeArquivo);
  });
  const arquivo = medirEtapaCadastro_(recursos, categoria, 'drive_iterar', function () {
    return arquivos.hasNext() ? arquivos.next() : null;
  });
  const localizado = { raiz: raiz, arquivo: arquivo, cache: cache, chaveCache: chave };
  memorizarIdArquivo_(localizado);
  return localizado;
}

function criarArquivoCadastro_(localizado, nomeArquivo, conteudo) {
  const raiz = localizado.raiz || pastaRaizProjeto_();
  localizado.raiz = raiz;
  localizado.arquivo = raiz.createFile(Utilities.newBlob(conteudo, 'application/json', nomeArquivo));
  memorizarIdArquivo_(localizado);
  return localizado.arquivo;
}

// UTF-8, inclusive pares de surrogates e substituição de surrogates isolados.
function bytesUtf8Cadastro_(texto) {
  let bytes = 0;
  for (let i = 0; i < texto.length; i++) {
    const codigo = texto.charCodeAt(i);
    if (codigo < 0x80) bytes++;
    else if (codigo < 0x800) bytes += 2;
    else if (codigo >= 0xD800 && codigo <= 0xDBFF && i + 1 < texto.length
        && texto.charCodeAt(i + 1) >= 0xDC00 && texto.charCodeAt(i + 1) <= 0xDFFF) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

function registrarTamanhoCadastro_(recursos, categoria, direcao, origem, json, dados) {
  if (!CADASTRO_METRICAS_ATIVAS || !recursos) return;
  const bytes = medirEtapaCadastro_(recursos, categoria, 'tamanho_utf8', function () {
    return bytesUtf8Cadastro_(json);
  });
  const metrica = { metrica: 'cadastro_elenco', fase: 'tamanho_json', categoria: categoria,
    direcao: direcao, origem: origem, bytesJson: bytes };
  if (Array.isArray(dados)) metrica.registros = dados.length;
  else {
    metrica.participacoes = dados.participacoes.length;
    metrica.inscricoes = dados.inscricoes.length;
  }
  console.log(JSON.stringify(metrica));
}

// Permanent Drive history: enrollment snapshots, never a PropertiesService payload.
const ELENCO_HISTORICO_ARQUIVO = 'AEUV - Historico de Inscricoes.json';
const ELENCO_HISTORICO_FILA_PREFIXO = 'ELENCO_HISTORICO_FILA_V1_';
const ELENCO_HISTORICO_AGENDA = 'ELENCO_HISTORICO_AGENDA_V1';
const ELENCO_HISTORICO_STATUS = 'ELENCO_HISTORICO_STATUS_V1';
const ELENCO_HISTORICO_HANDLER = 'processarHistoricoElencoAgendado';
const ELENCO_HISTORICO_PARTICOES_CATALOGO = 'ELENCO_HISTORICO_PARTICOES_CATALOGO_V2';

function catalogoHistoricoParticionado_() {
  const bruto = PropertiesService.getScriptProperties().getProperty(ELENCO_HISTORICO_PARTICOES_CATALOGO);
  const ids = bruto ? interpretarJsonElencoParticionado_(bruto) : [];
  if (!Array.isArray(ids) || ids.some(function (id) { return typeof id !== 'string' || !id.trim(); })
      || new Set(ids).size !== ids.length) throw new Error('Catalogo do historico particionado invalido.');
  return ids;
}

function registrarCampeonatoHistoricoParticionado_(id) {
  const ids = catalogoHistoricoParticionado_();
  if (ids.indexOf(id) === -1) {
    ids.push(id);
    PropertiesService.getScriptProperties().setProperty(ELENCO_HISTORICO_PARTICOES_CATALOGO, JSON.stringify(ids));
  }
}

function chaveCheckpointHistoricoParticionado_(id) {
  return 'ELENCO_HISTORICO_CHECKPOINT_V2_' + digestIndiceValidacao_(id);
}

function nomeHistoricoEquipeParticionado_(equipeId) {
  return 'historico - ' + identidadeElencoParticionado_(equipeId) + '.json';
}

function lerHistoricoEquipeParticionado_(estado, equipeId) {
  const arquivo = estado.pasta && itemUnicoElencoParticionado_(
    estado.pasta.getFilesByName(nomeHistoricoEquipeParticionado_(equipeId)));
  if (!arquivo) {
    const checkpoint = PropertiesService.getScriptProperties().getProperty(
      chaveCheckpointHistoricoParticionado_(estado.manifesto.campeonatoId));
    if (checkpoint) {
      const commit = lerDocumentoRecuperacaoElenco_(estado.pasta,
        'pendencia - ' + identidadeElencoParticionado_(checkpoint) + '.json');
      const manifesto = validarManifestoRecuperacaoElenco_(
        commit.manifestoDestino, estado.manifesto.campeonatoId, checkpoint);
      if (manifesto.particoes.concat(manifesto.participacoes || []).some(function (item) {
        return item.equipeId === equipeId;
      })) throw new Error('Historico consolidado da equipe ausente; restaure os dados antes de continuar.');
    }
  }
  const dados = arquivo ? interpretarJsonElencoParticionado_(arquivo.getBlob().getDataAsString('UTF-8'))
    : { schema: 'aeuv.elencos.historico', versao: 2, campeonatoId: estado.manifesto.campeonatoId,
      equipeId: equipeId, ultimoCommit: 0, sequencia: 0, participacoes: [], inscricoes: [] };
  if (!dados || dados.schema !== 'aeuv.elencos.historico' || dados.versao !== 2
      || dados.campeonatoId !== estado.manifesto.campeonatoId || dados.equipeId !== equipeId
      || !Number.isSafeInteger(dados.ultimoCommit) || dados.ultimoCommit < 0
      || dados.ultimoCommit > (estado.manifesto.sequenciaPublicacao || 0)
      || !Number.isSafeInteger(dados.sequencia) || dados.sequencia < 0
      || !Array.isArray(dados.participacoes) || !Array.isArray(dados.inscricoes)) {
    throw new Error('Historico da equipe invalido; pendencias preservadas.');
  }
  const ids = new Set();
  if (dados.participacoes.length > 1 || dados.participacoes.some(function (item) {
    return !item || item.campeonatoId !== dados.campeonatoId || item.equipeId !== equipeId
      || typeof item.id !== 'string' || !item.id || typeof item.equipeNome !== 'string'
      || typeof item.campeonatoNome !== 'string';
  }) || dados.inscricoes.some(function (item) {
    if (!item || item.campeonatoId !== dados.campeonatoId || item.equipeId !== equipeId
        || ['atletas', 'comissao'].indexOf(item.tipo) === -1 || typeof item.registroId !== 'string'
        || !item.registroId || typeof item.cpf !== 'string' || typeof item.presente !== 'boolean'
        || !Number.isSafeInteger(item.sequencia) || item.sequencia < 1 || item.sequencia > dados.sequencia
        || !item.dados || typeof item.dados !== 'object' || Array.isArray(item.dados)
        || typeof item.id !== 'string' || !item.id || ids.has(item.id)) return true;
    ids.add(item.id);
    return false;
  })) throw new Error('Inscricoes do historico da equipe invalidas; pendencias preservadas.');
  return dados;
}

function gravarHistoricoEquipeParticionado_(estado, dados) {
  exigirLockElencoParticionado_();
  const nome = nomeHistoricoEquipeParticionado_(dados.equipeId);
  const arquivo = itemUnicoElencoParticionado_(estado.pasta.getFilesByName(nome));
  const texto = JSON.stringify(dados);
  if (arquivo) arquivo.setContent(texto);
  else estado.pasta.createFile(Utilities.newBlob(texto, 'application/json', nome));
  if (JSON.stringify(lerDocumentoRecuperacaoElenco_(estado.pasta, nome)) !== texto) {
    throw new Error('Nao foi possivel confirmar o historico da equipe; pendencias preservadas.');
  }
}

// Only the manifest lineage is authoritative. Staged journals are never replayed.
function commitsHistoricoParticionado_(estado) {
  const checkpoint = PropertiesService.getScriptProperties().getProperty(
    chaveCheckpointHistoricoParticionado_(estado.manifesto.campeonatoId)) || '';
  let manifesto = estado.manifesto;
  const commits = [], vistos = new Set();
  while (manifesto.revisao !== checkpoint) {
    if (!manifesto.revisao || vistos.has(manifesto.revisao)) {
      throw new Error('Cadeia do historico incompleta ou ciclica; pendencias preservadas.');
    }
    vistos.add(manifesto.revisao);
    const journal = lerDocumentoRecuperacaoElenco_(estado.pasta,
      'pendencia - ' + identidadeElencoParticionado_(manifesto.revisao) + '.json');
    if (!journal || journal.schema !== 'aeuv.elencos.publicacao' || journal.versao !== 2
        || journal.campeonatoId !== manifesto.campeonatoId || journal.revisaoDestino !== manifesto.revisao
        || JSON.stringify(journal.manifestoDestino) !== JSON.stringify(manifesto)
        || journal.snapshotAnterior !== 'snapshot - ' + identidadeElencoParticionado_(manifesto.revisao) + '.json'
        || typeof journal.registradoEm !== 'string' || !journal.registradoEm
        || typeof journal.campeonatoNome !== 'string' || !Array.isArray(journal.alteracoes)) {
      throw new Error('Journal do historico invalido; pendencias preservadas.');
    }
    const snapshot = lerDocumentoRecuperacaoElenco_(estado.pasta, journal.snapshotAnterior);
    if (!snapshot || snapshot.schema !== 'aeuv.elencos.snapshot' || snapshot.versao !== 2
        || snapshot.campeonatoId !== manifesto.campeonatoId || snapshot.revisaoDestino !== manifesto.revisao
        || snapshot.assinaturaAnterior !== journal.assinaturaAnterior || !Array.isArray(snapshot.particoes)) {
      throw new Error('Snapshot do historico invalido; pendencias preservadas.');
    }
    const anterior = validarManifestoRecuperacaoElenco_(snapshot.manifestoAnterior, manifesto.campeonatoId, '');
    validarManifestoRecuperacaoElenco_(manifesto, manifesto.campeonatoId, manifesto.revisao);
    if (!Number.isSafeInteger(manifesto.sequenciaPublicacao)
        || manifesto.sequenciaPublicacao !== (anterior.sequenciaPublicacao || 0) + 1
        || snapshot.particoes.length !== anterior.particoes.length
        || snapshot.particoes.some(function (item) {
          return !item || typeof item.digest !== 'string'
            || (item.algoritmo !== undefined && ['md5', 'sha256'].indexOf(item.algoritmo) === -1);
        })
        || anterior.particoes.some(function (ref, i) {
          return JSON.stringify(snapshot.particoes[i].referencia) !== JSON.stringify(ref);
        })) throw new Error('Sequencia ou referencias do historico invalidas.');
    const mudaram = manifesto.particoes.filter(function (ref) {
      return !anterior.particoes.some(function (item) { return item.arquivo === ref.arquivo; });
    });
    if (anterior.particoes.some(function (ref) {
      return !manifesto.particoes.some(function (item) { return item.tipo === ref.tipo && item.equipeId === ref.equipeId; });
    }) || mudaram.length !== journal.alteracoes.length || mudaram.some(function (ref, i) {
      return JSON.stringify(journal.alteracoes[i].referencia) !== JSON.stringify(ref)
        || typeof journal.alteracoes[i].equipeNome !== 'string' || !journal.alteracoes[i].equipeNome
        || typeof journal.alteracoes[i].digest !== 'string'
        || (journal.alteracoes[i].algoritmo !== undefined
          && ['md5', 'sha256'].indexOf(journal.alteracoes[i].algoritmo) === -1);
    })) throw new Error('Alteracoes do journal inconsistentes.');
    const participacoes = (manifesto.participacoes || []).filter(function (item) {
      return !(anterior.participacoes || []).some(function (antes) {
        return JSON.stringify(antes) === JSON.stringify(item);
      });
    });
    if (!Array.isArray(journal.participacoes)
        || JSON.stringify(journal.participacoes) !== JSON.stringify(participacoes)
        || (anterior.participacoes || []).some(function (item) {
          return !(manifesto.participacoes || []).some(function (depois) { return depois.equipeId === item.equipeId; });
        })) throw new Error('Participacoes do journal inconsistentes.');
    commits.push({ journal: journal, snapshot: snapshot });
    manifesto = anterior;
  }
  return commits.reverse();
}

function registrosReferenciaHistorico_(estado, item) {
  const conteudo = lerConteudoParticaoElenco_(estado, item.referencia);
  const digest = item.algoritmo === 'md5'
    ? md5IndiceValidacao_(conteudo.texto) : digestIndiceValidacao_(conteudo.texto);
  if (digest !== item.digest) {
    throw new Error('Particao imutavel do historico alterada; pendencias preservadas.');
  }
  return conteudo.registros;
}

function aplicarRegistrosHistoricoEquipe_(historico, tipo, registros, journal, equipeNome) {
  const id = historico.campeonatoId, equipeId = historico.equipeId;
  atualizarParticipacaoHistoricoEquipe_(historico, journal, equipeNome);
  const presentes = new Set();
  registros.forEach(function (pessoa) {
    const cpf = somenteDigitos_(pessoa.cpf || '');
    const chave = digestIndiceValidacao_(JSON.stringify(['inscricao', id, equipeId, tipo, pessoa.id, cpf]));
    presentes.add(chave);
    let inscricao = historico.inscricoes.find(function (item) { return item.id === chave; });
    if (!inscricao) {
      inscricao = { id: chave, campeonatoId: id, equipeId: equipeId, tipo: tipo,
        registroId: pessoa.id, cpf: cpf, inscritoEm: journal.registradoEm };
      historico.inscricoes.push(inscricao);
    }
    if (!inscricao.presente || JSON.stringify(inscricao.dados) !== JSON.stringify(pessoa)) {
      inscricao.dados = Object.assign({}, pessoa);
      inscricao.atualizadoEm = journal.registradoEm;
      inscricao.sequencia = ++historico.sequencia;
    }
    inscricao.presente = true;
  });
  historico.inscricoes.forEach(function (item) {
    if (item.tipo === tipo && !presentes.has(item.id)) item.presente = false;
  });
}

function atualizarParticipacaoHistoricoEquipe_(historico, journal, equipeNome) {
  const id = historico.campeonatoId, equipeId = historico.equipeId;
  if (!historico.participacoes.length) historico.participacoes.push({
    id: digestIndiceValidacao_(JSON.stringify(['participacao', id, equipeId])),
    campeonatoId: id, equipeId: equipeId, campeonatoNomeOriginal: journal.campeonatoNome,
    equipeNomeOriginal: equipeNome, inscritoEm: journal.registradoEm
  });
  historico.participacoes[0].campeonatoNome = journal.campeonatoNome;
  historico.participacoes[0].equipeNome = equipeNome;
}

function consolidarHistoricoParticionado_(estado, persistir, equipeFiltro) {
  const porEquipe = new Map();
  function obter(id) {
    if (!porEquipe.has(id)) porEquipe.set(id, lerHistoricoEquipeParticionado_(estado, id));
    return porEquipe.get(id);
  }
  commitsHistoricoParticionado_(estado).forEach(function (commit) {
    const journal = commit.journal, sequencia = journal.manifestoDestino.sequenciaPublicacao;
    const afetadas = new Set();
    (journal.participacoes || []).forEach(function (item) {
      if (equipeFiltro && item.equipeId !== equipeFiltro) return;
      const historico = obter(item.equipeId);
      if (historico.ultimoCommit >= sequencia) return;
      atualizarParticipacaoHistoricoEquipe_(historico, journal, item.equipeNome);
      afetadas.add(item.equipeId);
    });
    journal.alteracoes.forEach(function (item) {
      const ref = item.referencia;
      if (equipeFiltro && ref.equipeId !== equipeFiltro) return;
      const historico = obter(ref.equipeId);
      if (historico.ultimoCommit >= sequencia) return;
      const antes = commit.snapshot.particoes.find(function (fonte) {
        return fonte.referencia.equipeId === ref.equipeId && fonte.referencia.tipo === ref.tipo;
      });
      if (antes) aplicarRegistrosHistoricoEquipe_(historico, ref.tipo,
        registrosReferenciaHistorico_(estado, antes), journal, item.equipeNome);
      aplicarRegistrosHistoricoEquipe_(historico, ref.tipo,
        registrosReferenciaHistorico_(estado, item), journal, item.equipeNome);
      afetadas.add(ref.equipeId);
    });
    afetadas.forEach(function (id) {
      const historico = obter(id);
      historico.ultimoCommit = sequencia;
      if (persistir) gravarHistoricoEquipeParticionado_(estado, historico);
    });
    // A partial team write can be retried; the championship cursor advances last.
    if (persistir) PropertiesService.getScriptProperties().setProperty(
      chaveCheckpointHistoricoParticionado_(estado.manifesto.campeonatoId), journal.revisaoDestino);
  });
  estado.manifesto.particoes.forEach(function (ref) {
    if (!equipeFiltro || equipeFiltro === ref.equipeId) obter(ref.equipeId);
  });
  (estado.manifesto.participacoes || []).forEach(function (item) {
    if (!equipeFiltro || equipeFiltro === item.equipeId) obter(item.equipeId);
  });
  const tombstone = PropertiesService.getScriptProperties().getProperty(
    chaveRemocaoElencosParticionados_(estado.manifesto.campeonatoId));
  if (tombstone && !campeonatos_().some(function (item) { return item.id === estado.manifesto.campeonatoId; })) {
    const removido = interpretarJsonElencoParticionado_(tombstone);
    if (!removido || removido.versao !== 1 || removido.campeonatoId !== estado.manifesto.campeonatoId) {
      throw new Error('Remocao do campeonato invalida; pendencias preservadas.');
    }
    porEquipe.forEach(function (historico) {
      const presentes = historico.inscricoes.some(function (item) { return item.presente; });
      historico.inscricoes.forEach(function (item) { item.presente = false; });
      if (persistir && presentes) gravarHistoricoEquipeParticionado_(estado, historico);
    });
  }
  return Array.from(porEquipe.values());
}

function lerHistoricoParticionado_(incluirPendentes, equipeId) {
  const resultado = { versao: 2, sequencia: 0, participacoes: [], inscricoes: [] };
  catalogoHistoricoParticionado_().forEach(function (id) {
    const estado = lerEstadoElencosParticionados_(id);
    const equipes = incluirPendentes ? consolidarHistoricoParticionado_(estado, false, equipeId)
      : Array.from(new Set(estado.manifesto.particoes.concat(estado.manifesto.participacoes || [])
        .map(function (ref) { return ref.equipeId; })))
        .filter(function (equipe) { return !equipeId || equipe === equipeId; })
        .map(function (equipe) { return lerHistoricoEquipeParticionado_(estado, equipe); });
    equipes.forEach(function (historico) {
      resultado.participacoes = resultado.participacoes.concat(historico.participacoes);
      resultado.inscricoes = resultado.inscricoes.concat(historico.inscricoes);
      resultado.sequencia += historico.sequencia;
    });
  });
  return resultado;
}

function processarHistoricoParticionadoSobLock_() {
  exigirLockElencoParticionado_();
  const props = PropertiesService.getScriptProperties(), todas = props.getProperties(), resultados = [];
  Object.keys(todas).filter(function (chave) {
    return chave.indexOf(ELENCO_HISTORICO_FILA_PREFIXO) === 0;
  }).forEach(function (chave) {
    const pendencia = interpretarJsonElencoParticionado_(todas[chave]);
    if (!pendencia || chave !== chaveFilaHistoricoElenco_(pendencia.campeonatoId)) {
      throw new Error('Fila do historico invalida; pendencias preservadas.');
    }
    lerFilaHistoricoElenco_(chave, pendencia.campeonatoId);
    const estado = lerEstadoElencosParticionados_(pendencia.campeonatoId);
    const campeonato = campeonatos_().some(function (item) { return item.id === pendencia.campeonatoId; });
    if (!campeonato && !props.getProperty(chaveRemocaoElencosParticionados_(pendencia.campeonatoId))) {
      throw new Error('Campeonato da fila nao encontrado; pendencia preservada.');
    }
    const historicos = consolidarHistoricoParticionado_(estado, true);
    resultados.push({ campeonatoId: pendencia.campeonatoId,
      inscricoesConsolidadas: historicos.reduce(function (total, item) { return total + item.inscricoes.length; }, 0) });
    if (props.getProperty(chave) === todas[chave]) props.deleteProperty(chave);
  });
  props.setProperty(ELENCO_HISTORICO_STATUS, JSON.stringify({
    ultimaExecucao: new Date().toISOString(), erro: '', codigoErro: '', campeonatoErro: '',
    processados: resultados.length, campeonatosProcessados: resultados,
    registrosConsolidados: resultados.reduce(function (total, item) { return total + item.inscricoesConsolidadas; }, 0)
  }));
  return statusFilaHistoricoElenco_();
}

function chaveFilaHistoricoElenco_(campeonatoId) {
  return ELENCO_HISTORICO_FILA_PREFIXO + digestIndiceValidacao_(String(campeonatoId));
}

function lerFilaHistoricoElenco_(chave, campeonatoId, recursos) {
  const bruto = PropertiesService.getScriptProperties().getProperty(chave);
  if (!bruto) return null;
  let pendencia;
  try { pendencia = JSON.parse(bruto); }
  catch (e) { throw new Error('Fila de histórico inválida; o elenco não será alterado.'); }
  if (!pendencia || pendencia.versao !== 1 || pendencia.campeonatoId !== campeonatoId
      || typeof pendencia.token !== 'string' || !pendencia.token) {
    throw new Error('Fila de histórico inconsistente; o elenco não será alterado.');
  }
  return pendencia;
}

function marcarHistoricoElencoPendente_(campeonatoId) {
  const id = String(campeonatoId || '').trim();
  if (!id) throw new Error('Campeonato inválido para atualizar a fila do histórico.');
  const props = PropertiesService.getScriptProperties(), chave = chaveFilaHistoricoElenco_(id);
  const anterior = lerFilaHistoricoElenco_(chave, id);
  props.setProperty(chave, JSON.stringify({
    versao: 1, campeonatoId: id, token: Utilities.getUuid(),
    marcadoEm: anterior && anterior.marcadoEm || new Date().toISOString()
  }));
  if (CADASTRO_METRICAS_ATIVAS) console.log(JSON.stringify({
    metrica: 'historico_fila', resultado: 'pendencia_criada',
    campeonatoRef: digestIndiceValidacao_(id)
  }));
}

function statusFilaHistoricoElenco_() {
  const props = PropertiesService.getScriptProperties();
  const agenda = JSON.parse(props.getProperty(ELENCO_HISTORICO_AGENDA) || '{}');
  const estado = JSON.parse(props.getProperty(ELENCO_HISTORICO_STATUS) || '{}');
  const pendencias = Object.keys(props.getProperties()).filter(function (chave) {
    return chave.indexOf(ELENCO_HISTORICO_FILA_PREFIXO) === 0;
  });
  return {
    agendado: !!agenda.triggerId,
    responsavel: agenda.owner || '',
    pendencias: pendencias.length,
    ultimaExecucao: estado.ultimaExecucao || '',
    erro: estado.erro || '',
    codigoErro: estado.codigoErro || '',
    campeonatoErro: estado.campeonatoErro || '',
    processados: Number(estado.processados) || 0,
    registrosConsolidados: Number(estado.registrosConsolidados) || 0,
    campeonatosProcessados: Array.isArray(estado.campeonatosProcessados)
      ? estado.campeonatosProcessados : []
  };
}

function obterStatusFilaHistoricoElenco() {
  exigirAdministracao_();
  return statusFilaHistoricoElenco_();
}

function listarCampeonatosFilaHistoricoElenco() {
  exigirAdministracao_();
  return campeonatos_().map(function (campeonato) {
    return { id: campeonato.id, nome: campeonato.nome };
  });
}

function reconciliarCampeonatoHistoricoElencoAgora(campeonatoId) {
  exigirAdministracao_();
  const id = String(campeonatoId || '').trim();
  if (!id) throw new Error('Selecione um campeonato para reconciliar o histórico.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const campeonato = campeonatos_().find(function (item) { return item.id === id; });
    if (!campeonato) throw new Error('Campeonato não encontrado; nenhuma pendência foi criada.');
    marcarHistoricoElencoPendente_(id);
  } finally { lock.releaseLock(); }
  return processarHistoricoElencoAgora();
}

function configurarAgendamentoHistoricoElenco() {
  const sessao = exigirAdministracao_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    const agenda = JSON.parse(props.getProperty(ELENCO_HISTORICO_AGENDA) || '{}');
    const owner = exigirDonoAgendaBancoAtletas_(sessao, agenda);
    const proprios = ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === ELENCO_HISTORICO_HANDLER
        && trigger.getEventType() === ScriptApp.EventType.CLOCK;
    });
    const trigger = proprios.find(function (item) { return String(item.getUniqueId()) === agenda.triggerId; })
      || proprios[0]
      || ScriptApp.newTrigger(ELENCO_HISTORICO_HANDLER).timeBased().everyMinutes(15).create();
    props.setProperty(ELENCO_HISTORICO_AGENDA, JSON.stringify({
      owner: owner, triggerId: String(trigger.getUniqueId())
    }));
    proprios.forEach(function (item) {
      if (String(item.getUniqueId()) !== String(trigger.getUniqueId())) ScriptApp.deleteTrigger(item);
    });
  } finally { lock.releaseLock(); }
  return statusFilaHistoricoElenco_();
}

function desativarAgendamentoHistoricoElenco() {
  const sessao = exigirAdministracao_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    const agenda = JSON.parse(props.getProperty(ELENCO_HISTORICO_AGENDA) || '{}');
    exigirDonoAgendaBancoAtletas_(sessao, agenda);
    ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === ELENCO_HISTORICO_HANDLER
        && trigger.getEventType() === ScriptApp.EventType.CLOCK;
    }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
    props.deleteProperty(ELENCO_HISTORICO_AGENDA);
  } finally { lock.releaseLock(); }
  return statusFilaHistoricoElenco_();
}

function processarFilaHistoricoElencoSobLock_() {
  if (elencosParticionadosCutoverAtivo_()) return processarHistoricoParticionadoSobLock_();
  const props = PropertiesService.getScriptProperties();
  const todas = props.getProperties();
  const pendencias = Object.keys(todas).filter(function (chave) {
    return chave.indexOf(ELENCO_HISTORICO_FILA_PREFIXO) === 0;
  }).map(function (chave) {
    let valor;
    try { valor = JSON.parse(todas[chave]); }
    catch (e) { throw new Error('Fila de histórico inválida; pendências preservadas.'); }
    if (!valor || valor.versao !== 1 || typeof valor.campeonatoId !== 'string'
        || !valor.campeonatoId || !valor.token || chave !== chaveFilaHistoricoElenco_(valor.campeonatoId)) {
      throw new Error('Fila de histórico inconsistente; pendências preservadas.');
    }
    return { chave: chave, bruto: todas[chave], campeonatoId: valor.campeonatoId };
  });
  if (!pendencias.length) {
    const estado = {
      ultimaExecucao: new Date().toISOString(), erro: '', processados: 0,
      codigoErro: '', campeonatoErro: '',
      registrosConsolidados: 0, campeonatosProcessados: []
    };
    props.setProperty(ELENCO_HISTORICO_STATUS, JSON.stringify(estado));
    if (CADASTRO_METRICAS_ATIVAS) {
      console.log(JSON.stringify({ metrica: 'historico_fila', resultado: 'sem_pendencias' }));
    }
    return statusFilaHistoricoElenco_();
  }

  const campeonatos = campeonatos_();
  const alvos = pendencias.map(function (pendencia) {
    const campeonato = campeonatos.find(function (item) { return item.id === pendencia.campeonatoId; });
    if (!campeonato && elencosParticionadosCutoverAtivo_()) {
      const tombstone = props.getProperty(chaveRemocaoElencosParticionados_(pendencia.campeonatoId));
      if (tombstone) {
        const removido = JSON.parse(tombstone);
        if (removido.versao === 1 && removido.campeonatoId === pendencia.campeonatoId) {
          return { pendencia: pendencia, campeonato: { id: pendencia.campeonatoId }, removido: true };
        }
      }
    }
    if (!campeonato) {
      const erro = new Error('Campeonato da fila não encontrado; pendência preservada.');
      erro.code = 'CAMPEONATO_AUSENTE';
      erro.campeonatoId = pendencia.campeonatoId;
      throw erro;
    }
    return { pendencia: pendencia, campeonato: campeonato };
  });
  const historico = lerHistoricoElenco_();
  const antes = JSON.stringify(historico);
  const equipes = equipesRegistro_(true);
  const resultados = [];
  alvos.forEach(function (alvo) {
    const pendencia = alvo.pendencia, campeonato = alvo.campeonato;
    historico.inscricoes.forEach(function (item) {
      if (item.campeonatoId === campeonato.id) {
        item.presenteAntes = item.presente;
        item.presente = false;
      }
    });
    const listas = alvo.removido ? { atletas: [], comissao: [] } : {
      atletas: atletasCampeonato_(campeonato.id, false),
      comissao: comissaoTecnicaCampeonato_(campeonato.id, false)
    };
    if (!alvo.removido) reconciliarHistoricoCampeonato_(historico, campeonato, equipes, listas);
    resultados.push({
      campeonatoId: campeonato.id,
      atletasLidos: listas.atletas.length,
      comissaoLida: listas.comissao.length,
      inscricoesConsolidadas: historico.inscricoes.filter(function (item) {
        return item.campeonatoId === campeonato.id;
      }).length
    });
    historico.inscricoes.forEach(function (item) {
      if (item.campeonatoId === campeonato.id) delete item.presenteAntes;
    });
  });
  const alterado = antes !== JSON.stringify(historico);
  if (alterado) gravarHistoricoElenco_(historico);

  pendencias.forEach(function (pendencia) {
    if (props.getProperty(pendencia.chave) === pendencia.bruto) props.deleteProperty(pendencia.chave);
  });
  const estado = {
    ultimaExecucao: new Date().toISOString(), erro: '',
    codigoErro: '', campeonatoErro: '',
    processados: resultados.length,
    registrosConsolidados: resultados.reduce(function (total, item) {
      return total + item.inscricoesConsolidadas;
    }, 0),
    campeonatosProcessados: resultados
  };
  props.setProperty(ELENCO_HISTORICO_STATUS, JSON.stringify(estado));
  resultados.forEach(function (item) {
    if (CADASTRO_METRICAS_ATIVAS) console.log(JSON.stringify({
      metrica: 'historico_fila', resultado: 'campeonato_processado',
      campeonatoRef: digestIndiceValidacao_(item.campeonatoId),
      atletasLidos: item.atletasLidos, comissaoLida: item.comissaoLida,
      inscricoesConsolidadas: item.inscricoesConsolidadas,
      historicoGravado: alterado
    }));
  });
  return statusFilaHistoricoElenco_();
}

function processarHistoricoElencoAgora() {
  exigirAdministracao_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    try { return processarFilaHistoricoElencoSobLock_(); }
    catch (erro) {
      if (CADASTRO_METRICAS_ATIVAS) console.log(JSON.stringify({
        metrica: 'historico_fila', resultado: 'erro',
        codigoErro: erro && erro.code || 'FALHA_RECONCILIACAO',
        campeonatoRef: erro && erro.campeonatoId
          ? digestIndiceValidacao_(erro.campeonatoId) : ''
      }));
      PropertiesService.getScriptProperties().setProperty(ELENCO_HISTORICO_STATUS, JSON.stringify({
        ultimaExecucao: new Date().toISOString(),
        erro: 'Falha ao consolidar o histórico; as pendências foram preservadas. Confira as Execuções.',
        codigoErro: erro && erro.code || 'FALHA_RECONCILIACAO',
        campeonatoErro: erro && erro.campeonatoId || '',
        processados: 0, registrosConsolidados: 0, campeonatosProcessados: []
      }));
      throw new Error('Falha ao consolidar o histórico. As pendências foram preservadas; confira as Execuções.');
    }
  } finally { lock.releaseLock(); }
}

function processarHistoricoElencoAgendado(evento) {
  const sessao = exigirAdministracao_();
  const props = PropertiesService.getScriptProperties();
  let agenda = JSON.parse(props.getProperty(ELENCO_HISTORICO_AGENDA) || '{}');
  validarGatilhoAgendado_(sessao, agenda, ELENCO_HISTORICO_HANDLER, evento,
    'Gatilho do histórico não configurado para esta conta.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    agenda = JSON.parse(props.getProperty(ELENCO_HISTORICO_AGENDA) || '{}');
    validarGatilhoAgendado_(sessao, agenda, ELENCO_HISTORICO_HANDLER, evento,
      'Gatilho do histórico não configurado para esta conta.');
    try { return processarFilaHistoricoElencoSobLock_(); }
    catch (erro) {
      if (CADASTRO_METRICAS_ATIVAS) console.log(JSON.stringify({
        metrica: 'historico_fila', resultado: 'erro',
        codigoErro: erro && erro.code || 'FALHA_RECONCILIACAO',
        campeonatoRef: erro && erro.campeonatoId
          ? digestIndiceValidacao_(erro.campeonatoId) : ''
      }));
      props.setProperty(ELENCO_HISTORICO_STATUS, JSON.stringify({
        ultimaExecucao: new Date().toISOString(),
        erro: 'Falha ao consolidar o histórico; as pendências foram preservadas. Confira as Execuções.',
        codigoErro: erro && erro.code || 'FALHA_RECONCILIACAO',
        campeonatoErro: erro && erro.campeonatoId || '',
        processados: 0, registrosConsolidados: 0, campeonatosProcessados: []
      }));
      throw new Error('Falha ao consolidar o histórico. As pendências foram preservadas; confira as Execuções.');
    }
  } finally { lock.releaseLock(); }
}

function simularLimpezaHistoricoElencosTeste() {
  return limparHistoricoElencosTeste_(false);
}

function executarLimpezaHistoricoElencosTeste() {
  return limparHistoricoElencosTeste_(true);
}

// One-time reset for an empty test base, independent of the cutover gate.
function limparHistoricoElencosTeste_(executar) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    exigirAdmin_();
    if (campeonatos_().length) {
      throw new Error('A limpeza exige uma base sem campeonatos. Nenhum historico foi alterado.');
    }
    const estadoBanco = lerEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO);
    if (estadoBanco.lease && estadoBanco.lease.expiresAt > Date.now()) {
      throw new Error('Aguarde o recalculo do Banco de Atletas terminar antes da limpeza.');
    }
    const props = PropertiesService.getScriptProperties(), propriedades = props.getProperties();
    const ids = catalogoHistoricoParticionado_();
    const filas = Object.keys(propriedades).filter(function (chave) {
      return chave.indexOf(ELENCO_HISTORICO_FILA_PREFIXO) === 0;
    });
    filas.forEach(function (chave) {
      const pendencia = interpretarJsonElencoParticionado_(propriedades[chave]);
      if (!pendencia || typeof pendencia.campeonatoId !== 'string'
          || chave !== chaveFilaHistoricoElenco_(pendencia.campeonatoId)) {
        throw new Error('Fila de historico invalida. Corrija a fonte antes da limpeza.');
      }
      lerFilaHistoricoElenco_(chave, pendencia.campeonatoId);
      if (ids.indexOf(pendencia.campeonatoId) === -1) ids.push(pendencia.campeonatoId);
    });
    const alvos = [];
    const global = localizarArquivoCadastro_(ELENCO_HISTORICO_ARQUIVO, null, 'historico').arquivo;
    if (global) {
      const texto = global.getBlob().getDataAsString('UTF-8');
      const dados = interpretarJsonElencoParticionado_(texto);
      if (!dados || dados.versao !== 1 || !Array.isArray(dados.inscricoes)
          || !Array.isArray(dados.participacoes) || !Number.isFinite(dados.sequencia)) {
        throw new Error('Historico global invalido. Corrija a fonte antes da limpeza.');
      }
      alvos.push({ arquivo: global, texto: texto, quantidade: dados.inscricoes.length,
        participacoes: dados.participacoes.length,
        novo: JSON.stringify({ versao: 1, sequencia: 0, participacoes: [], inscricoes: [] }) });
    }
    const checkpoints = {};
    ids.forEach(function (id) {
      const estado = lerEstadoElencosParticionados_(id);
      const equipes = Array.from(new Set(estado.manifesto.particoes
        .concat(estado.manifesto.participacoes || []).map(function (item) { return item.equipeId; })));
      const sequencia = estado.manifesto.sequenciaPublicacao || 0;
      if (!Number.isSafeInteger(sequencia) || sequencia < 0) {
        throw new Error('Sequencia de publicacao invalida. Corrija a fonte antes da limpeza.');
      }
      equipes.forEach(function (equipeId) {
        const dados = lerHistoricoEquipeParticionado_(estado, equipeId);
        const nome = nomeHistoricoEquipeParticionado_(equipeId);
        const arquivo = itemUnicoElencoParticionado_(estado.pasta.getFilesByName(nome));
        alvos.push({ arquivo: arquivo, pasta: estado.pasta, nome: nome,
          texto: arquivo ? arquivo.getBlob().getDataAsString('UTF-8') : null,
          quantidade: dados.inscricoes.length, participacoes: dados.participacoes.length,
          novo: JSON.stringify(Object.assign({}, dados, {
            ultimoCommit: sequencia, participacoes: [], inscricoes: []
          })) });
      });
      // Keep the baseline so old immutable journals cannot recreate test records.
      checkpoints[chaveCheckpointHistoricoParticionado_(id)] = estado.manifesto.revisao;
    });
    const resumo = {
      simulacao: !executar, campeonatosHistoricos: ids.length, arquivosHistoricos: alvos.length,
      inscricoesRemovidas: alvos.reduce(function (total, alvo) { return total + alvo.quantidade; }, 0),
      participacoesRemovidas: alvos.reduce(function (total, alvo) { return total + alvo.participacoes; }, 0),
      pendenciasDescartadas: filas.length,
      recado: 'Solicitacoes, punicoes, sumulas, equipes, jogos e elencos originais sao preservados.'
    };
    if (executar) {
      const chaves = filas.concat(Object.keys(checkpoints), [
        ELENCO_HISTORICO_PARTICOES_CATALOGO, ELENCO_HISTORICO_STATUS, BANCO_ATLETAS_ESTADO
      ]);
      const anteriores = {};
      chaves.forEach(function (chave) {
        anteriores[chave] = Object.prototype.hasOwnProperty.call(propriedades, chave)
          ? propriedades[chave] : null;
      });
      const backup = {
        schema: 'aeuv.historico.limpeza.backup', versao: 1, criadoEm: new Date().toISOString(),
        propriedades: anteriores,
        arquivos: alvos.map(function (alvo) {
          return { arquivoId: alvo.arquivo ? alvo.arquivo.getId() : null,
            pastaId: alvo.pasta ? alvo.pasta.getId() : null,
            nome: alvo.arquivo ? alvo.arquivo.getName() : alvo.nome, texto: alvo.texto };
        })
      };
      const textoBackup = JSON.stringify(backup);
      const arquivoBackup = pastaRaizProjeto_().createFile(Utilities.newBlob(textoBackup,
        'application/json', 'AEUV - Backup limpeza historico - ' + Utilities.getUuid() + '.json'));
      if (arquivoBackup.getBlob().getDataAsString('UTF-8') !== textoBackup) {
        throw new Error('Backup nao confirmado. Nenhum historico foi alterado.');
      }
      resumo.backupId = arquivoBackup.getId();
      console.log(JSON.stringify({ limpezaHistoricoBackupId: resumo.backupId }));
      alvos.forEach(function (alvo) {
        const arquivo = alvo.arquivo || alvo.pasta.createFile(
          Utilities.newBlob(alvo.novo, 'application/json', alvo.nome));
        if (alvo.arquivo) arquivo.setContent(alvo.novo);
        if (arquivo.getBlob().getDataAsString('UTF-8') !== alvo.novo) {
          throw new Error('Limpeza parcial: historico nao confirmado. Preserve o backup e execute novamente.');
        }
      });
      Object.keys(checkpoints).forEach(function (chave) {
        if (checkpoints[chave]) props.setProperty(chave, checkpoints[chave]);
        else props.deleteProperty(chave);
      });
      props.setProperty(ELENCO_HISTORICO_PARTICOES_CATALOGO, JSON.stringify(ids));
      filas.forEach(function (chave) { props.deleteProperty(chave); });
      props.deleteProperty(ELENCO_HISTORICO_STATUS);
      // Invalidate the ready copy; a later rebuild reads only the preserved sources.
      delete estadoBanco.lease;
      estadoBanco.currentId = '';
      estadoBanco.previousId = '';
      estadoBanco.lastError = 'Historico de testes limpo. Use Recalcular agora para gerar uma nova copia.';
      gravarEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO, estadoBanco);
      resumo.recado += ' No Banco de Atletas, use Recalcular agora e depois Atualizar.';
    }
    console.log(JSON.stringify(resumo));
    return resumo;
  } finally { lock.releaseLock(); }
}

function lerHistoricoElenco_(recursos) {
  if (elencosParticionadosCutoverAtivo_()) return lerHistoricoParticionado_(false);
  const localizado = localizarArquivoCadastro_(ELENCO_HISTORICO_ARQUIVO, recursos, 'historico');
  if (!localizado.arquivo) return { versao: 1, sequencia: 0, participacoes: [], inscricoes: [] };
  let dados;
  let bruto;
  try {
    bruto = medirEtapaCadastro_(recursos, 'historico', 'drive_ler', function () {
      return localizado.arquivo.getBlob().getDataAsString('UTF-8');
    });
    dados = medirEtapaCadastro_(recursos, 'historico', 'json_parse', function () { return JSON.parse(bruto); });
  } catch (e) {
    throw new Error('Histórico de inscrições inválido no Drive. Restaure o arquivo antes de continuar.');
  }
  if (!dados || dados.versao !== 1 || !Array.isArray(dados.participacoes)
      || !Array.isArray(dados.inscricoes) || !Number.isFinite(dados.sequencia)) {
    throw new Error('Histórico de inscrições inválido no Drive.');
  }
  registrarTamanhoCadastro_(recursos, 'historico', 'leitura', 'drive', bruto, dados);
  return dados;
}

function gravarHistoricoElenco_(dados, recursos) {
  const localizado = localizarArquivoCadastro_(ELENCO_HISTORICO_ARQUIVO, recursos, 'historico');
  const json = medirEtapaCadastro_(recursos, 'historico', 'json_serializar', function () { return JSON.stringify(dados); });
  const arquivo = localizado.arquivo;
  if (arquivo) medirEtapaCadastro_(recursos, 'historico', 'drive_setContent', function () { arquivo.setContent(json); });
  else medirEtapaCadastro_(recursos, 'historico', 'drive_criar', function () {
    criarArquivoCadastro_(localizado, ELENCO_HISTORICO_ARQUIVO, json);
  });
  registrarTamanhoCadastro_(recursos, 'historico', 'gravacao', 'drive', json, dados);
}

function garantirIdsHistoricoElenco_(campeonatoId, tipo, lista, persistirIds, recursos) {
  if (elencosParticionadosCutoverAtivo_()) {
    validarRegistrosParticaoElenco_(lista);
    return;
  }
  if (!persistirIds) return;
  let mudou = false;
  lista.forEach(function (pessoa) {
    if (pessoa && typeof pessoa === 'object' && String(pessoa.nome || '').trim()
        && !String(pessoa.id || '').trim()) {
      pessoa.id = gerarIdUnico_();
      mudou = true;
    }
  });
  // One-time migration under the caller's lock; preserve all legacy fields.
  if (mudou) gravarListaCadastroDrive_(
    arquivoCadastroPessoasCampeonato_(campeonatoId, tipo === 'atletas' ? 'Atletas' : 'Comissao Tecnica'),
    tipo === 'atletas' ? chaveAtletasCampeonato_(campeonatoId) : chaveComissaoTecnicaCampeonato_(campeonatoId),
    lista, recursos, tipo
  );
}

function reconciliarHistoricoCampeonato_(historico, campeonato, equipes, listas, recursos) {
  const agora = new Date().toISOString();
  const nomes = timesCampeonatoOperacao_(campeonato.id, recursos).concat(
    listas.atletas.concat(listas.comissao).map(function (pessoa) { return pessoa.timeVinculado; })
  ).filter(function (nome) { return !!nome; });
  return medirEtapaCadastro_(recursos, 'historico', 'reconciliacao_memoria', function () {
    const identidades = Object.create(null);
    nomes.forEach(function (nome) {
      const chave = chaveEquipe_(nome);
      if (identidades[chave]) return;
      const equipe = equipes.find(function (item) { return chaveEquipe_(item.nome) === chave; });
      const anterior = historico.participacoes.find(function (item) {
        return chaveEquipe_(item.equipeNome) === chave;
      });
      const equipeId = equipe ? equipe.id : (anterior ? anterior.equipeId : Utilities.getUuid());
      identidades[chave] = equipeId;
      let participacao = historico.participacoes.find(function (item) {
        return item.equipeId === equipeId && item.campeonatoId === campeonato.id;
      });
      if (!participacao) {
        participacao = {
          id: Utilities.getUuid(), equipeId: equipeId, campeonatoId: campeonato.id,
          equipeNomeOriginal: nome, campeonatoNomeOriginal: campeonato.nome, inscritoEm: agora
        };
        historico.participacoes.push(participacao);
      }
      participacao.equipeNome = nome;
      participacao.campeonatoNome = campeonato.nome;
    });
    historico.inscricoes.forEach(function (item) {
      if (item.campeonatoId === campeonato.id) item.presente = false;
    });
    ['atletas', 'comissao'].forEach(function (tipo) {
      listas[tipo].forEach(function (pessoa) {
        const equipeId = identidades[chaveEquipe_(pessoa.timeVinculado)];
        if (!equipeId) return;
        const cpf = somenteDigitos_(pessoa.cpf || '');
        let inscricao = historico.inscricoes.find(function (item) {
          return item.campeonatoId === campeonato.id && item.equipeId === equipeId
            && item.tipo === tipo && item.registroId === pessoa.id && item.cpf === cpf;
        });
        if (!inscricao) {
          inscricao = {
            id: Utilities.getUuid(), equipeId: equipeId, campeonatoId: campeonato.id,
            tipo: tipo, registroId: pessoa.id, cpf: cpf, inscritoEm: agora
          };
          historico.inscricoes.push(inscricao);
        }
        if (!inscricao.presenteAntes || JSON.stringify(inscricao.dados) !== JSON.stringify(pessoa)) {
          inscricao.dados = Object.assign({}, pessoa);
          inscricao.atualizadoEm = agora;
          inscricao.sequencia = ++historico.sequencia;
        }
        inscricao.presente = true;
      });
    });
  });
}

// Under the script lock. Legacy calls reconcile synchronously; active mutations
// only prepare roster response lists, while imports project pending commits.
function prepararHistoricoElenco_(cache, recursos, campeonatoId, equipeId) {
  if (elencosParticionadosCutoverAtivo_()) {
    const campeonatos = recursos && recursos.campeonatos || campeonatos_();
    const equipes = recursos && recursos.equipes || lerRegistroEquipes_();
    if (campeonatoId && !campeonatos.some(function (item) { return item.id === campeonatoId; })) {
      throw new Error('Campeonato não encontrado.');
    }
    if (recursos) {
      recursos.campeonatos = campeonatos;
      recursos.equipes = equipes;
      recursos.listas = cache;
    }
    // Maintenance preserves team enrollments (including empty rosters) through
    // the same publication chain, never by scanning/writing global history.
    if (!cache) {
      campeonatos.filter(function (item) { return !campeonatoId || item.id === campeonatoId; })
        .forEach(function (item) { gravarParticoesElenco_(item.id, [], undefined, undefined, true); });
      return { participacoes: [], inscricoes: [] };
    }
    if (cache) campeonatos.filter(function (item) {
      return !campeonatoId || item.id === campeonatoId;
    }).forEach(function (item) {
      if (recursos && recursos.elencoEquipeId) {
        const checkpoint = recursos.checkpointsValidacaoElenco
          && recursos.checkpointsValidacaoElenco[item.id]
          || checkpointElencoParticionado_(item.id, equipes);
        cache[item.id] = {
          atletas: lerParticaoElencoOperacao_(item.id, 'atletas', recursos.elencoEquipeId, recursos, checkpoint),
          comissao: lerParticaoElencoOperacao_(item.id, 'comissao', recursos.elencoEquipeId, recursos, checkpoint)
        };
      } else {
        cache[item.id] = {
          atletas: atletasCampeonato_(item.id, false, recursos),
          comissao: comissaoTecnicaCampeonato_(item.id, false, recursos)
        };
      }
    });
    // Mutations preserve history through the publication journal, not a history scan.
    return campeonatoId ? { participacoes: [], inscricoes: [] }
      : lerHistoricoParticionado_(true, equipeId);
  }
  const historico = lerHistoricoElenco_(recursos);
  const antes = medirEtapaCadastro_(recursos, 'historico', 'json_comparacao_antes', function () { return JSON.stringify(historico); });
  const campeonatosDisponiveis = recursos && recursos.campeonatos
    ? recursos.campeonatos : campeonatos_();
  const campeonatos = campeonatoId
    ? campeonatosDisponiveis.filter(function (item) { return item.id === campeonatoId; })
    : campeonatosDisponiveis;
  if (campeonatoId && !campeonatos.length) throw new Error('Campeonato não encontrado.');
  const idsCampeonatos = Object.create(null);
  campeonatos.forEach(function (item) { idsCampeonatos[item.id] = true; });
  if (!campeonatoId) historico.inscricoes.forEach(function (item) {
    idsCampeonatos[item.campeonatoId] = true;
  });
  medirEtapaCadastro_(recursos, 'historico', 'historico_marcar_memoria', function () {
    historico.inscricoes.forEach(function (item) {
      if (!idsCampeonatos[item.campeonatoId]) return;
      item.presenteAntes = item.presente;
      item.presente = false;
    });
  });
  let equipes = recursos && recursos.equipes ? recursos.equipes : equipesRegistro_(true);
  // Preserva a migração global, mas só depois das guardas do salvamento sob lock.
  if (recursos && recursos.equipesAtivas && recursos.equipesAtivas.some(function (nome) {
    return !equipes.some(function (item) { return chaveEquipe_(item.nome) === nome; });
  })) {
    equipes = equipesRegistro_(true);
    if (recursos.contexto) recursos.contexto.registroEquipes = equipes;
  }
  if (recursos) {
    recursos.equipes = equipes;
    recursos.campeonatos = campeonatos;
    recursos.listas = cache;
  }
  campeonatos.forEach(function (campeonato) {
    const listas = {
      atletas: atletasCampeonato_(campeonato.id, true, recursos),
      comissao: comissaoTecnicaCampeonato_(campeonato.id, true, recursos)
    };
    if (cache) cache[campeonato.id] = listas;
    reconciliarHistoricoCampeonato_(historico, campeonato, equipes, listas, recursos);
  });
  medirEtapaCadastro_(recursos, 'historico', 'historico_limpar_memoria', function () {
    historico.inscricoes.forEach(function (item) {
      if (idsCampeonatos[item.campeonatoId]) delete item.presenteAntes;
    });
  });
  if (antes !== medirEtapaCadastro_(recursos, 'historico', 'json_comparacao_depois', function () { return JSON.stringify(historico); })) {
    if (recursos) medirFaseCadastro_('gravacao_historico', function () { gravarHistoricoElenco_(historico, recursos); });
    else gravarHistoricoElenco_(historico);
  }
  return historico;
}

function gravarElencoComHistorico_(campeonatoId, tipo, lista, historicoPreparado, listasPreparadas, recursos) {
  const cache = {};
  if (!historicoPreparado) {
    if (recursos) medirFaseCadastro_('preparacao_historico', function () {
      return prepararHistoricoElenco_(cache, recursos, campeonatoId);
    });
    else prepararHistoricoElenco_(cache, null, campeonatoId);
  }
  const campeonato = (recursos && recursos.campeonatos ? recursos.campeonatos : campeonatos_())
    .find(function (item) { return item.id === campeonatoId; });
  if (!campeonato) throw new Error('Campeonato não encontrado.');
  const equipeIdAlvo = recursos && recursos.elencoEquipeId;
  const chaveListaAnterior = equipeIdAlvo && JSON.stringify([tipo, equipeIdAlvo]);
  const listaAnterior = chaveListaAnterior && recursos.particoesElencos
    ? (recursos.particoesElencos[chaveListaAnterior] || []).slice() : null;
  try {
    const gravar = function () {
      if (elencosParticionadosCutoverAtivo_()) {
        const checkpoint = medirFaseCadastro_('elenco_metadados_preparacao', function () {
          if (recursos) delete recursos.checkpointsValidacaoElenco;
          return checkpointElencoParticionado_(campeonatoId, recursos && recursos.equipes);
        });
        const estado = checkpoint.estado;
        const assinatura = checkpoint.assinatura;
        const anterior = recursos && recursos.estadosElencosParticionados
          && recursos.estadosElencosParticionados[campeonatoId];
        if (anterior && anterior.assinatura !== assinatura) {
          throw new Error('Uma fonte do elenco mudou durante a operacao. Recarregue antes de repetir.');
        }
        const grupos = prepararParticoesElencoPorNome_(lista, recursos && recursos.equipes);
        let alteracoes;
        if (equipeIdAlvo) {
          if (grupos.some(function (grupo) { return grupo.equipeId !== equipeIdAlvo; })) {
            throw new Error('A alteracao tentou gravar fora da equipe validada.');
          }
          alteracoes = [{ tipo: tipo, equipeId: equipeIdAlvo,
            registros: grupos.length ? grupos[0].registros : [] }];
        } else {
          alteracoes = grupos.map(function (grupo) {
            return { tipo: tipo, equipeId: grupo.equipeId, registros: grupo.registros };
          });
          estado.manifesto.particoes.forEach(function (particao) {
            if (particao.tipo === tipo && !grupos.some(function (grupo) {
              return grupo.equipeId === particao.equipeId;
            })) alteracoes.push({ tipo: tipo, equipeId: particao.equipeId, registros: [] });
          });
        }
        const mutacaoIndice = medirFaseCadastro_('elenco_indice_base', function () {
          return iniciarMutacaoIndiceParticionado_(campeonatoId, recursos, checkpoint);
        });
        if (recursos) delete recursos.indicesValidacao;
        marcarHistoricoElencoPendente_(campeonatoId);
        marcarSnapshotsEsportivosPendentes_();
        if (alteracoes.length) gravarParticoesElenco_(
          campeonatoId, alteracoes, estado.manifesto.revisao, assinatura, false, recursos, checkpoint);
        medirFaseCadastro_('elenco_indice_incremental', function () {
          concluirMutacaoIndiceParticionado_(mutacaoIndice, campeonatoId, [{
            tipo: tipo, equipeId: equipeIdAlvo || null, antes: listaAnterior, depois: lista
          }], recursos);
        });
        if (recursos && recursos.estadosElencosParticionados) {
          delete recursos.estadosElencosParticionados[campeonatoId];
        }
        return;
      }
      return gravarListaCadastroDrive_(
        arquivoCadastroPessoasCampeonato_(campeonatoId, tipo === 'atletas' ? 'Atletas' : 'Comissao Tecnica'),
        tipo === 'atletas' ? chaveAtletasCampeonato_(campeonatoId) : chaveComissaoTecnicaCampeonato_(campeonatoId),
        lista, recursos, tipo
      );
    };
    // A leitura bruta deixa de representar o arquivo depois da gravação.
    descartarElencoBrutoOperacao_(campeonatoId, tipo, recursos);
    if (recursos) medirFaseCadastro_('gravacao_elenco', gravar);
    else gravar();
  } catch (e) {
    const orientacao = /Acesso negado:\s*DriveApp/i.test(e.message || '')
      ? ' A execução usa a conta de quem acessa. Peça ao administrador para verificar a autorização Google e a permissão de edição dessa conta no arquivo de elenco; não compartilhe a pasta inteira como solução.'
      : '';
    const erro = new Error('Não foi possível confirmar a gravação do elenco. Recarregue antes de repetir a operação; o histórico será reconciliado com os dados persistidos. ' + e.message + orientacao);
    erro.cause = e;
    throw erro;
  }
  const listasResposta = listasPreparadas || cache[campeonatoId];
  if (listasResposta) listasResposta[tipo] = lista;
}

function validarTipoImportacaoElenco_(tipo) {
  if (tipo !== 'atletas' && tipo !== 'comissao') throw new Error('Escolha um tipo de importação válido.');
}

function fontesImportacaoElenco_(historico, contexto) {
  return historico.participacoes.filter(function (item) {
    return item.equipeId === contexto.equipe.id && item.campeonatoId !== contexto.campeonato.id;
  });
}

function candidatosImportacaoElenco_(historico, contexto, tipo, origemId) {
  const fonte = fontesImportacaoElenco_(historico, contexto).find(function (item) { return item.campeonatoId === origemId; });
  if (!fonte) throw new Error('A origem não pertence ao histórico desta equipe ou é o campeonato de destino.');
  const porPessoa = Object.create(null);
  historico.inscricoes.filter(function (item) {
    return item.equipeId === contexto.equipe.id && item.campeonatoId === origemId && item.tipo === tipo;
  }).forEach(function (item) {
    const chave = item.cpf || ('registro:' + item.registroId);
    if (!porPessoa[chave] || porPessoa[chave].sequencia < item.sequencia) porPessoa[chave] = item;
  });
  return Object.keys(porPessoa).map(function (chave) { return porPessoa[chave]; });
}

function validarPessoaImportacaoElenco_(inscricao, contexto, tipo, listas, jogos, recursos) {
  const pessoa = Object.assign({}, inscricao.dados);
  pessoa.nome = limparCampo_(pessoa.nome || '', 100);
  if (!pessoa.nome) throw new Error('Informe o nome do cadastro.');
  pessoa.cpf = validarCpfCadastroCampeonato_(pessoa.cpf, 'do cadastro a importar');
  pessoa.dataNascimento = validarDataNascimentoCampeonato_(pessoa.dataNascimento, 'do cadastro a importar');
  pessoa.foto = String(pessoa.foto || '').trim();
  if (!pessoa.foto) throw new Error('O cadastro anterior não possui a foto obrigatória.');
  pessoa.rg = limparCampo_(pessoa.rg || '', 30);
  pessoa.timeVinculado = contexto.equipe.nome;
  if (tipo === 'comissao') {
    // The existing-role exception is only applied to the trusted stored snapshot.
    pessoa.cargo = validarCargoComissao_(pessoa.cargo, inscricao.dados);
  } else {
    if (ATLETAS_CAMPEONATO_POSICOES.indexOf(pessoa.posicao) === -1) throw new Error('Posição anterior inválida.');
    if (pessoa.numero !== '' && (!Number.isFinite(Number(pessoa.numero)) || Number(pessoa.numero) < 0 || Number(pessoa.numero) > 99)) {
      throw new Error('O número da camisa deve ficar entre 0 e 99.');
    }
    bloquearCpfAtletaEmOutraEquipe_(contexto, pessoa.cpf, listas.atletas, '', recursos);
    bloquearVinculoAtletaParticipante_(contexto.campeonato, jogos, pessoa.cpf, contexto.equipe.nome, contexto);
  }
  const duplicata = validarDuplicataCadastroOperacao_(
    contexto.campeonato.id, tipo, pessoa.nome, pessoa.cpf, listas[tipo], '', recursos);
  if (!duplicata.ok) throw new Error(duplicata.motivo + ' A verificação abrange todas as equipes do campeonato de destino.');
  const outroTipo = tipo === 'atletas' ? 'comissao' : 'atletas';
  const indice = elencosParticionadosCutoverAtivo_()
    ? consultarIndiceValidacao_(contexto.campeonato.id, recursos, outroTipo) : null;
  const existeEmOutroTipo = indice
    ? (indice.cadastros[outroTipo][somenteDigitos_(pessoa.cpf)] || []).length > 0
    : existeCpfNoCadastro_(elencosParticionadosCutoverAtivo_()
      ? lerElencoParticionado_(contexto.campeonato.id, outroTipo) : listas[outroTipo], pessoa.cpf);
  if (existeEmOutroTipo) {
    throw new Error('CPF já cadastrado em ' + (outroTipo === 'atletas' ? 'atletas' : 'comissão técnica') + ' neste campeonato (inclusive outras equipes).');
  }
  return pessoa;
}

function listarImportacaoElenco(payload) {
  const dados = payload || {};
  validarTipoImportacaoElenco_(dados.tipo);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const contexto = sessaoElenco_(dados.campeonatoId, dados.equipeId, true);
    const recursos = elencosParticionadosCutoverAtivo_()
      ? { elencoEquipeId: contexto.equipe.id } : null;
    exigirEdicaoElenco_(contexto, recursos);
    const cache = {};
    const historico = prepararHistoricoElenco_(cache, recursos, null, contexto.equipe.id);
    const fontes = fontesImportacaoElenco_(historico, contexto);
    const origens = fontes.map(function (item) {
      return { campeonatoId: item.campeonatoId, nome: item.campeonatoNome, equipeNome: item.equipeNome };
    });
    const candidatos = dados.origemId ? candidatosImportacaoElenco_(historico, contexto, dados.tipo, dados.origemId) : [];
    const jogos = candidatos.length && dados.tipo === 'atletas'
      ? jogosParticipacaoOperacao_(contexto.campeonato.id, recursos) : [];
    return {
      origens: origens,
      candidatos: candidatos.map(function (item) {
        let motivo = '';
        const listas = cache[contexto.campeonato.id];
        const cpf = somenteDigitos_(item.cpf || item.dados.cpf);
        const indice = cpf && elencosParticionadosCutoverAtivo_()
          ? consultarIndiceValidacao_(contexto.campeonato.id, recursos) : null;
        const jaCadastrado = Boolean(cpf && ['atletas', 'comissao'].some(function (tipo) {
          return indice
            ? (indice.cadastros[tipo][cpf] || []).length > 0
            : existeCpfNoCadastro_(elencosParticionadosCutoverAtivo_()
              ? lerElencoParticionado_(contexto.campeonato.id, tipo) : listas[tipo], cpf);
        }));
        if (jaCadastrado) {
          motivo = 'Já cadastrado no campeonato de destino.';
        } else {
          try { validarPessoaImportacaoElenco_(item, contexto, dados.tipo, listas, jogos, recursos); }
          catch (e) { motivo = e.message; }
        }
        return {
          id: item.id, nome: item.dados.nome, cpf: item.cpf,
          funcao: dados.tipo === 'comissao' ? item.dados.cargo : item.dados.posicao,
          situacao: item.presente ? 'Inscrição atual na origem' : 'Inscrição anterior (removida ou competição excluída)',
          atualizadoEm: item.atualizadoEm, motivo: motivo, jaCadastrado: jaCadastrado
        };
      }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); })
    };
  } finally { lock.releaseLock(); }
}

function importarCadastrosElenco(payload) {
  const dados = payload || {};
  validarTipoImportacaoElenco_(dados.tipo);
  if (!Array.isArray(dados.inscricaoIds) || !dados.inscricaoIds.length
      || dados.inscricaoIds.some(function (id) { return typeof id !== 'string' || !id; })
      || new Set(dados.inscricaoIds).size !== dados.inscricaoIds.length) {
    throw new Error('Selecione inscrições válidas, sem repetir identificadores.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const contexto = sessaoElenco_(dados.campeonatoId, dados.equipeId, true);
    const recursos = elencosParticionadosCutoverAtivo_()
      ? { elencoEquipeId: contexto.equipe.id } : null;
    exigirEdicaoElenco_(contexto, recursos);
    const cache = {};
    const historico = prepararHistoricoElenco_(cache, recursos, null, contexto.equipe.id);
    const candidatos = candidatosImportacaoElenco_(historico, contexto, dados.tipo, dados.origemId);
    const listas = cache[contexto.campeonato.id];
    const chaveParticao = JSON.stringify([dados.tipo, contexto.equipe.id]);
    if (recursos) recursos.particoesElencos[chaveParticao] = listas[dados.tipo].slice();
    const jogos = dados.tipo === 'atletas'
      ? jogosParticipacaoOperacao_(contexto.campeonato.id, recursos) : [];
    const novos = dados.inscricaoIds.map(function (id) {
      const inscricao = candidatos.find(function (item) { return item.id === id; });
      if (!inscricao) throw new Error('Inscrição inválida para a origem, equipe e tipo selecionados.');
      const pessoa = validarPessoaImportacaoElenco_(inscricao, contexto, dados.tipo, listas, jogos, recursos);
      pessoa.id = gerarIdUnico_();
      listas[dados.tipo].push(pessoa);
      return pessoa;
    });
    // No roster write occurs until every selection has passed preflight.
    gravarElencoComHistorico_(contexto.campeonato.id, dados.tipo,
      listas[dados.tipo], historico, listas, recursos);
    return { quantidade: novos.length, recado: novos.length + ' cadastro(s) importado(s). Recarregue o elenco para consultar.' };
  } finally { lock.releaseLock(); }
}

/**
 * Dados da tela de equipes.
 * @param {Array<string>} lista
 * @return {{equipes: Array<Object>, arquivoUrl: string, podeEditar: boolean}}
 */
function montarTelaEquipes_(lista, sessao) {
  const emUso = equipesEmUso_();
  const registros = equipesRegistro_();

  return {
    equipes: lista.map(function (nome) {
      const registro = registros.find(function (item) { return chaveEquipe_(item.nome) === chaveEquipe_(nome); });
      return { id: registro.id, nome: nome, escudo: registro.escudo || '',
        assinaturaEscudo: assinaturaEscudoEquipe_(registro.escudo),
        emUso: emUso[chaveEquipe_(nome)] || [] };
    }),
    arquivoUrl: arquivoEquipesUrl_(),
    podeEditar: EQUIPES_PERFIS_EDICAO.indexOf(sessao.usuario.perfil) !== -1
  };
}

/**
 * Onde cada equipe ja aparece hoje. Serve para avisar antes de remover:
 * tirar da lista um time com cadastro ou com acesso deixa orfao.
 * @return {Object} Chave da equipe para a lista de lugares onde aparece.
 */
function equipesEmUso_() {
  const uso = {};

  const marcar = function (equipe, lugar) {
    const chave = chaveEquipe_(equipe);

    if (!chave) {
      return;
    }

    uso[chave] = uso[chave] || [];

    if (uso[chave].indexOf(lugar) === -1) {
      uso[chave].push(lugar);
    }
  };

  obterUsuarios_().forEach(function (usuario) {
    marcar(usuario.equipe, 'acesso');
  });
  campeonatos_().forEach(function (campeonato) {
    timesCampeonato_(campeonato.id).forEach(function (nome) {
      marcar(nome, 'vínculo com campeonato');
    });
  });

  // O cadastro pode ainda nao existir; a tela de equipes nao depende dele.
  try {
    abaAssociados_().getDataRange().getValues().slice(1).forEach(function (linha) {
      marcar(linha[0], 'cadastro');
    });
  } catch (e) {
    // Sem planilha de associados ainda: so o uso nos acessos conta.
  }

  return uso;
}

/**
 * Devolve a lista para a tela. Chamada pelo cliente; refaz a
 * verificacao de permissao no servidor.
 * @return {Object}
 */
function listarEquipes() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || !moduloLiberado_('equipes', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para consultar as equipes.');
  }

  return montarTelaEquipes_(obterEquipes_(), sessao);
}

/**
 * Inclui uma equipe, ou renomeia quando vier nomeOriginal.
 * @param {{nome: string, nomeOriginal: string}} dados
 * @return {Object}
 */
function salvarEquipe(dados) {
  exigirEdicaoEquipes_();
  equipesRegistro_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let tela;
  try {
    tela = salvarEquipeInterno_(dados);
  } finally {
    lock.releaseLock();
  }
  return tela;
}

function salvarEquipeInterno_(dados) {
  const sessao = exigirEdicaoEquipes_();

  const nome = limparEspacos_(dados && dados.nome);
  const original = String((dados && dados.nomeOriginal) || '').trim();

  if (!nome) {
    throw new Error('Informe o nome da equipe.');
  }

  const lista = obterEquipes_().slice();
  const posicao = original
    ? lista.reduce(function (achado, item, indice) {
        return chaveEquipe_(item) === chaveEquipe_(original) ? indice : achado;
      }, -1)
    : -1;

  if (original && posicao === -1) {
    throw new Error('Esta equipe não está mais na lista. Recarregue a página.');
  }

  const repetida = lista.some(function (item, indice) {
    return indice !== posicao && chaveEquipe_(item) === chaveEquipe_(nome);
  });

  if (repetida) {
    throw new Error('Esta equipe já está na lista.');
  }
  if (original && nome !== lista[posicao] && (equipesEmUso_()[chaveEquipe_(original)] || []).length) {
    throw new Error('Esta equipe está em uso. Mantenha o nome para preservar os acessos e vínculos existentes.');
  }
  prepararHistoricoElenco_();
  const registros = equipesRegistro_(true);
  let registro = registros.find(function (item) { return chaveEquipe_(item.nome) === chaveEquipe_(original || nome); });
  if (!registro) {
    registro = { id: Utilities.getUuid(), nome: nome, escudo: '' };
    registros.push(registro);
  }
  registro.nome = nome;
  if (dados && Object.prototype.hasOwnProperty.call(dados, 'escudo')) {
    registro.escudo = validarEscudoEquipe_(dados.escudo);
  }
  gravarRegistroEquipes_(registros);

  if (posicao === -1) {
    lista.push(nome);
  } else {
    lista[posicao] = nome;
  }

  const tela = gravarEquipes_(lista, sessao);

  tela.recado = (posicao === -1 ? 'Equipe incluída: ' : 'Equipe renomeada: ') + nome;

  return tela;
}

/**
 * Remove uma equipe da lista.
 * @param {string} nome
 * @return {Object}
 */
function removerEquipe(nome) {
  exigirEdicaoEquipes_();
  equipesRegistro_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return removerEquipeInterno_(nome);
  } finally {
    lock.releaseLock();
  }
}

function removerEquipeInterno_(nome) {
  const sessao = exigirEdicaoEquipes_();
  const alvo = chaveEquipe_(nome);
  impedirRemocaoEquipeTabela_('', alvo);

  // Remover um time que tem cadastro ou acesso deixaria os dois orfaos:
  // o cadastro sem opcao no combo e o associado sem equipe valida.
  const usos = equipesEmUso_()[alvo] || [];

  if (usos.length) {
    throw new Error('Esta equipe ainda tem ' + usos.join(' e ')
      + ' no sistema. Remova antes de tirá-la da lista.');
  }

  const lista = obterEquipes_().filter(function (item) {
    return chaveEquipe_(item) !== alvo;
  });
  prepararHistoricoElenco_();
  higienizarEquipes_(lista);
  // Mantém a identidade histórica; a lista global define as equipes ativas.

  const tela = gravarEquipes_(lista, sessao);

  tela.recado = 'Equipe removida: ' + String(nome || '').trim();

  return tela;
}

/**
 * Grava a lista, republica o arquivo do Drive e devolve a tela pronta.
 * @param {Array<string>} lista
 * @param {Object} sessao
 * @return {Object}
 */
function gravarEquipes_(lista, sessao) {
  marcarSnapshotsEsportivosPendentes_();
  const validas = higienizarEquipes_(lista);

  PropertiesService.getScriptProperties()
    .setProperty(CONFIG.equipes.chaveLista, JSON.stringify(validas));

  publicarEquipes_(validas);

  return montarTelaEquipes_(validas, sessao);
}

/**
 * Escreve o arquivo que os formularios leem. Reaproveita sempre o mesmo
 * arquivo para o id nao mudar a cada gravacao.
 * @param {Array<string>} lista
 * @return {DriveApp.File}
 */
function publicarEquipes_(lista) {
  const conteudo = JSON.stringify({
    atualizadoEm: new Date().toISOString(),
    equipes: lista
  }, null, 2);

  const arquivo = arquivoEquipes_(true);

  arquivo.setContent(conteudo);

  return arquivo;
}

/**
 * Arquivo equipes.json na pasta raiz do projeto.
 * @param {boolean} criar Cria quando ainda nao existir.
 * @return {DriveApp.File}
 */
function arquivoEquipes_(criar) {
  const propriedades = PropertiesService.getScriptProperties();
  const guardado = propriedades.getProperty(CONFIG.equipes.chaveArquivo);

  if (guardado) {
    try {
      const arquivo = DriveApp.getFileById(guardado);

      if (!arquivo.isTrashed()) {
        return arquivo;
      }
    } catch (e) {
      // Arquivo removido ou sem acesso: procura de novo pelo nome.
    }
  }

  const raiz = pastaRaizProjeto_();
  const existentes = raiz.getFilesByName(CONFIG.equipes.arquivo);
  let arquivo;

  if (existentes.hasNext()) {
    arquivo = existentes.next();
  } else if (criar) {
    arquivo = raiz.createFile(CONFIG.equipes.arquivo, '', MimeType.PLAIN_TEXT);
  } else {
    return null;
  }

  propriedades.setProperty(CONFIG.equipes.chaveArquivo, arquivo.getId());

  return arquivo;
}

/**
 * Endereco do arquivo publicado, ou vazio enquanto ninguem gravou.
 * @return {string}
 */
function arquivoEquipesUrl_() {
  try {
    const arquivo = arquivoEquipes_(false);

    return arquivo ? arquivo.getUrl() : '';
  } catch (e) {
    return '';
  }
}

/**
 * Republica o arquivo do Drive com a lista que esta valendo. Use pelo
 * editor quando o arquivo for apagado ou quando um formulario novo
 * precisar dele antes da primeira edicao pela tela.
 */
function publicarEquipesAgora() {
  const lista = obterEquipes_();
  const arquivo = publicarEquipes_(lista);

  Logger.log('Equipes publicadas: %s', lista.length);
  Logger.log('ARQUIVO: %s', arquivo.getUrl());
}

/******************************************************
 * CONTROLE DE PUNICOES
 ******************************************************/

/**
 * Colunas do arquivo de controle, na mesma ordem em que a automacao
 * em Python as grava. A ordem e o que liga cada celula ao seu campo.
 */
const PUNICOES_COLUNAS = [
  'nota', 'dataNota', 'competicao', 'dataJogo', 'partida', 'equipe', 'punido', 'tipo', 'camisa',
  'artigo', 'partidas', 'tempo', 'decisao', 'cartaoVermelho', 'status', 'situacao', 'sumula', 'modo'
];

/**
 * Devolve as punicoes registradas para a tela do sistema.
 * Chamada pelo cliente; refaz a verificacao de permissao no servidor.
 * @return {{atualizadoEm: string, arquivoUrl: string, registros: Array<Object>}}
 */
function listarPunicoes() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || !moduloLiberado_('punicoes', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para consultar o controle de punições.');
  }

  const arquivo = arquivoPunicoes_();
  const conteudo = arquivo.getBlob().getDataAsString('UTF-8');

  return {
    atualizadoEm: linhaAtualizacao_(conteudo),
    arquivoUrl: arquivo.getUrl(),
    registros: interpretarPunicoes_(conteudo)
  };
}

/**
 * Localiza o arquivo de controle no Drive. O id encontrado fica guardado
 * nas propriedades do script para evitar nova busca a cada abertura.
 * @return {DriveApp.File}
 */
function arquivoPunicoes_() {
  const propriedades = PropertiesService.getScriptProperties();
  const guardado = propriedades.getProperty(CONFIG.punicoes.chaveArquivo);

  if (guardado) {
    try {
      const arquivo = DriveApp.getFileById(guardado);

      if (!arquivo.isTrashed()) {
        return arquivo;
      }
    } catch (e) {
      // Arquivo removido, renomeado ou sem acesso: procura de novo.
    }
  }

  const pastas = pastaPunicoes_().getFilesByName(CONFIG.punicoes.arquivo);

  if (!pastas.hasNext()) {
    throw new Error('O arquivo "' + CONFIG.punicoes.arquivo + '" ainda não está na pasta "'
      + CONFIG.punicoes.subpasta + '" do Drive. Ele é publicado pela automacao a cada nova punição.');
  }

  const arquivo = pastas.next();
  propriedades.setProperty(CONFIG.punicoes.chaveArquivo, arquivo.getId());

  return arquivo;
}

/**
 * Subpasta do Drive onde a automacao publica o controle.
 * @return {DriveApp.Folder}
 */
function pastaPunicoes_() {
  let raiz;

  try {
    raiz = DriveApp.getFolderById(CONFIG.punicoes.pastaSumulasId);
  } catch (e) {
    // A mensagem original entra no texto porque distingue os dois casos comuns:
    // falta de acesso a pasta e falta de autorizacao do servico Drive.
    throw new Error('Não foi possível abrir a pasta das súmulas no Drive (id '
      + CONFIG.punicoes.pastaSumulasId + '). Verifique se o seu e-mail tem acesso a ela. '
      + 'Detalhe: ' + (e && e.message ? e.message : e));
  }

  const pastas = raiz.getFoldersByName(CONFIG.punicoes.subpasta);

  if (!pastas.hasNext()) {
    throw new Error('A pasta "' + CONFIG.punicoes.subpasta + '" não foi encontrada dentro de "'
      + raiz.getName() + '".');
  }

  return pastas.next();
}

/**
 * Transforma a tabela separada por "|" do arquivo em objetos.
 * @param {string} conteudo
 * @return {Array<Object>}
 */
function interpretarPunicoes_(conteudo) {
  return String(conteudo || '').split(/\r?\n/).map(function (linha) {
    return linha.split('|').map(function (celula) {
      return celula.trim();
    });
  }).filter(function (celulas) {
    // Cabecalho, linha de tracos e textos de apoio nao tem o numero exato de colunas.
    return celulas.length === PUNICOES_COLUNAS.length && celulas[0] && celulas[0].indexOf('NOTA') !== 0;
  }).map(function (celulas) {
    const registro = {};

    PUNICOES_COLUNAS.forEach(function (campo, i) {
      registro[campo] = celulas[i];
    });

    return registro;
  });
}

/**
 * Extrai do cabecalho do arquivo a data da ultima atualizacao.
 * @param {string} conteudo
 * @return {string}
 */
function linhaAtualizacao_(conteudo) {
  const achado = String(conteudo || '').match(/Atualizado em ([^\n·]+)/);

  return achado ? achado[1].trim() : '';
}

/**
 * Diz se um modulo esta liberado para o perfil informado.
 * @param {string} id
 * @param {string} perfil
 * @return {boolean}
 */
function moduloLiberado_(id, perfil) {
  return MODULOS.some(function (modulo) {
    return modulo.id === id && modulo.perfis.indexOf(perfil) !== -1;
  });
}

function limparEspacos_(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(new RegExp('\\s+', 'g'), ' ')
    .trim();
}

/******************************************************
 * GESTAO DO CAMPEONATO
 ******************************************************/

function sessaoCampeonato_() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || (sessao.usuario.perfil !== 'admin' && sessao.usuario.perfil !== 'diretoria')) {
    throw new Error('Você não tem permissão para gerenciar campeonatos.');
  }

  return sessao;
}

function dataIsoValida_(valor) {
  const texto = String(valor || '').trim();

  if (!texto) {
    return '';
  }

  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!partes) {
    return '';
  }

  const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));

  if (data.getFullYear() !== Number(partes[1]) || data.getMonth() !== Number(partes[2]) - 1 || data.getDate() !== Number(partes[3])) {
    return '';
  }

  return texto;
}

function campeonatos_(recursos) {
  const lista = lerListaCadastroDrive_(CAMPEONATOS_ARQUIVO, CAMPEONATOS_CHAVE, recursos, 'campeonatos');

  return lista.map(function (item) {
    return normalizarCampeonato_(item, true);
  }).filter(function (item) {
    return Boolean(item.id && item.nome);
  });
}

function lerListaCadastroDrive_(nomeArquivo, chaveLegada, recursos, categoria) {
  const arquivo = localizarArquivoCadastro_(nomeArquivo, recursos, categoria).arquivo;
  const bruto = arquivo
    ? medirEtapaCadastro_(recursos, categoria, 'drive_ler', function () {
      return arquivo.getBlob().getDataAsString('UTF-8');
    })
    : medirEtapaCadastro_(recursos, categoria, 'legado_ler', function () {
      return PropertiesService.getScriptProperties().getProperty(chaveLegada);
    });

  if (!arquivo && bruto === null) {
    return [];
  }

  if (!String(bruto || '').trim()) {
    throw new Error('O cadastro ' + nomeArquivo + ' está vazio. Restaure os dados antes de continuar.');
  }

  let lista;
  try {
    lista = medirEtapaCadastro_(recursos, categoria, 'json_parse', function () { return JSON.parse(bruto); });
  } catch (e) {
    throw new Error('O cadastro ' + nomeArquivo + ' contém JSON inválido. Restaure os dados antes de continuar.');
  }

  if (!Array.isArray(lista)) {
    throw new Error('O cadastro ' + nomeArquivo + ' está inválido: o conteúdo deve ser uma lista.');
  }

  registrarTamanhoCadastro_(recursos, categoria, 'leitura', arquivo ? 'drive' : 'legado', bruto, lista);
  return lista;
}

function normalizarCampeonato_(dados, preservaMetadados) {
  const bruto = dados || {};
  const id = String(bruto.id || '').trim() || Utilities.getUuid();
  const nome = limparEspacos_(bruto.nome);
  const temporada = limparEspacos_(bruto.temporada);
  const modalidade = CAMPEONATOS_MODALIDADES.indexOf(String(bruto.modalidade || '').trim()) !== -1
    ? String(bruto.modalidade || '').trim()
    : CAMPEONATOS_MODALIDADES[0];
  const status = CAMPEONATOS_STATUS.indexOf(String(bruto.status || '').trim()) !== -1
    ? String(bruto.status || '').trim()
    : CAMPEONATOS_STATUS[0];
  const visibilidade = CAMPEONATOS_VISIBILIDADES.indexOf(String(bruto.visibilidade || '').trim()) !== -1
    ? String(bruto.visibilidade || '').trim()
    : CAMPEONATOS_VISIBILIDADES[0];

  const registro = {
    id: id,
    nome: nome,
    temporada: temporada,
    modalidade: modalidade,
    status: status,
    descricao: String(bruto.descricao || '').trim(),
    responsavel: String(bruto.responsavel || '').trim(),
    visibilidade: visibilidade,
    dataInicio: dataIsoValida_(bruto.dataInicio),
    dataFim: dataIsoValida_(bruto.dataFim),
    escudo: String(bruto.escudo || '').trim(),
    criadoEm: preservaMetadados ? String(bruto.criadoEm || '') : '',
    criadoPor: preservaMetadados ? String(bruto.criadoPor || '') : '',
    atualizadoEm: preservaMetadados ? String(bruto.atualizadoEm || '') : '',
    atualizadoPor: preservaMetadados ? String(bruto.atualizadoPor || '') : '',
    revisao: preservaMetadados ? String(bruto.revisao || '') : ''
  };

  if (Object.prototype.hasOwnProperty.call(bruto, 'estrutura')) {
    registro.estrutura = validarEstruturaCampeonato_(bruto.estrutura, id);
  }

  return registro;
}

function gravarCampeonatos_(lista) {
  gravarListaCadastroDrive_(CAMPEONATOS_ARQUIVO, CAMPEONATOS_CHAVE, lista);
}

function gravarListaCadastroDrive_(nomeArquivo, chaveLegada, lista, recursos, categoria) {
  marcarSnapshotsEsportivosPendentes_();
  const localizado = localizarArquivoCadastro_(nomeArquivo, recursos, categoria);
  const conteudo = medirEtapaCadastro_(recursos, categoria, 'json_serializar', function () { return JSON.stringify(lista); });
  const indice = iniciarMutacaoIndiceValidacao_(nomeArquivo, recursos);
  const alvoHistorico = alvoArquivoIndiceValidacao_(nomeArquivo);
  if (alvoHistorico && alvoHistorico.tipo !== 'tabela') {
    // Persist the reconciliation marker before changing the roster; retries are safe
    // because the worker rebuilds this championship's history from its current sources.
    marcarHistoricoElencoPendente_(alvoHistorico.id);
  }

  // As chamadas de gravação já são protegidas pelo lock de salvar/remover.
  const arquivo = localizado.arquivo;
  if (arquivo) {
    medirEtapaCadastro_(recursos, categoria, 'drive_setContent', function () { arquivo.setContent(conteudo); });
  } else {
    medirEtapaCadastro_(recursos, categoria, 'drive_criar', function () {
      criarArquivoCadastro_(localizado, nomeArquivo, conteudo);
    });
  }

  // Só remove o armazenamento legado depois de persistir no Drive com sucesso.
  PropertiesService.getScriptProperties().deleteProperty(chaveLegada);
  registrarTamanhoCadastro_(recursos, categoria, 'gravacao', 'drive', conteudo, lista);
  concluirMutacaoIndiceValidacao_(indice, lista, conteudo, recursos);
}

function arquivoCadastroPessoasCampeonato_(campeonatoId, tipo) {
  const id = String(campeonatoId || '').trim();
  if (!id) {
    throw new Error('Informe um campeonato válido para acessar o cadastro.');
  }
  return 'AEUV - Campeonato - ' + encodeURIComponent(id) + ' - ' + tipo + '.json';
}

// Production remains legacy; active-gate integration is exercised only in VM fixtures.
const ELENCOS_PARTICOES_MANIFESTO = 'manifesto.json';
const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = true;

function elencosParticionadosCutoverAtivo_() {
  return ELENCOS_PARTICIONADOS_CUTOVER_ATIVO;
}

function chaveRemocaoElencosParticionados_(campeonatoId) {
  return 'ELENCOS_PARTICOES_REMOVIDO_V1_' + digestIndiceValidacao_(campeonatoId);
}

function identidadeElencoParticionado_(id) {
  if (typeof id !== 'string' || !id.trim() || id !== id.trim()) {
    throw new Error('Informe uma identidade permanente valida para o elenco.');
  }
  return encodeURIComponent(id);
}

function nomePastaElencosParticionados_(campeonatoId) {
  return 'AEUV - Elencos - ' + identidadeElencoParticionado_(campeonatoId);
}

function nomeArquivoParticaoElenco_(equipeId, tipo, revisao) {
  if (tipo !== 'atletas' && tipo !== 'comissao') throw new Error('Categoria de elenco invalida.');
  return (tipo === 'atletas' ? 'Atletas' : 'Comissao Tecnica') + ' - '
    + identidadeElencoParticionado_(equipeId) + ' - '
    + identidadeElencoParticionado_(revisao) + '.json';
}

function itemUnicoElencoParticionado_(iterador) {
  if (!iterador.hasNext()) return null;
  const item = iterador.next();
  if (iterador.hasNext()) throw new Error('Fonte de elenco duplicada no Drive. Resolva a duplicidade antes de continuar.');
  return item;
}

function pastaElencosParticionados_(campeonatoId, criar) {
  const raiz = pastaRaizProjeto_();
  const nome = nomePastaElencosParticionados_(campeonatoId);
  const pasta = itemUnicoElencoParticionado_(raiz.getFoldersByName(nome));
  if (pasta || !criar) return pasta;
  exigirLockElencoParticionado_();
  return raiz.createFolder(nome);
}

function exigirLockElencoParticionado_() {
  if (!LockService.getScriptLock().hasLock()) {
    throw new Error('A gravacao das particoes exige o ScriptLock da operacao.');
  }
}

function interpretarJsonElencoParticionado_(texto) {
  try { return JSON.parse(texto); }
  catch (e) { throw new Error('Fonte de elenco particionado contem JSON invalido. Restaure os dados antes de continuar.'); }
}

function validarParticipacoesManifestoElenco_(manifesto) {
  if (manifesto.participacoes === undefined) return;
  const ids = new Set();
  if (!Array.isArray(manifesto.participacoes)) throw new Error('Participacoes do manifesto invalidas.');
  manifesto.participacoes.forEach(function (item) {
    if (!item || typeof item.equipeId !== 'string' || !item.equipeId.trim()
        || typeof item.equipeNome !== 'string' || !item.equipeNome.trim()
        || typeof item.campeonatoNome !== 'string' || ids.has(item.equipeId)) {
      throw new Error('Participacao do manifesto invalida.');
    }
    identidadeElencoParticionado_(item.equipeId);
    ids.add(item.equipeId);
  });
}

function lerEstadoElencosParticionados_(campeonatoId) {
  const pasta = pastaElencosParticionados_(campeonatoId, false);
  const arquivo = pasta && itemUnicoElencoParticionado_(pasta.getFilesByName(ELENCOS_PARTICOES_MANIFESTO));
  const texto = arquivo ? arquivo.getBlob().getDataAsString('UTF-8') : null;
  const manifesto = texto === null ? {
    schema: 'aeuv.elencos.particoes', versao: 1, campeonatoId: campeonatoId, revisao: '', particoes: []
  } : interpretarJsonElencoParticionado_(texto);
  if (texto !== null && (!manifesto || manifesto.schema !== 'aeuv.elencos.particoes' || manifesto.versao !== 1
      || manifesto.campeonatoId !== campeonatoId || typeof manifesto.revisao !== 'string'
      || !manifesto.revisao || !Array.isArray(manifesto.particoes))) {
    throw new Error('Manifesto de elenco particionado invalido.');
  }
  const chaves = new Set();
  validarParticipacoesManifestoElenco_(manifesto);
  manifesto.particoes.forEach(function (particao) {
    if (!particao || particao.arquivo !== nomeArquivoParticaoElenco_(
      particao.equipeId, particao.tipo, particao.revisao)) {
      throw new Error('Referencia de particao de elenco invalida.');
    }
    const chave = JSON.stringify([particao.tipo, particao.equipeId]);
    if (chaves.has(chave)) throw new Error('Particao de elenco repetida no manifesto.');
    chaves.add(chave);
  });
  return { pasta: pasta, arquivo: arquivo, texto: texto, manifesto: manifesto };
}

function validarRegistrosParticaoElenco_(registros) {
  if (!Array.isArray(registros)) throw new Error('A particao de elenco deve conter uma lista.');
  const ids = new Set();
  registros.forEach(function (registro) {
    if (!registro || typeof registro !== 'object' || Array.isArray(registro)
        || typeof registro.id !== 'string' || !registro.id.trim() || registro.id !== registro.id.trim()
        || typeof registro.nome !== 'string' || !registro.nome.trim()) {
      throw new Error('Registro de elenco particionado invalido. Restaure os dados antes de continuar.');
    }
    if (ids.has(registro.id)) throw new Error('Identificador repetido na particao de elenco.');
    ids.add(registro.id);
  });
}

function lerConteudoParticaoElenco_(estado, particao) {
  const arquivo = itemUnicoElencoParticionado_(estado.pasta.getFilesByName(particao.arquivo));
  if (!arquivo) throw new Error('Particao publicada de elenco nao encontrada. Restaure os dados antes de continuar.');
  const texto = arquivo.getBlob().getDataAsString('UTF-8');
  const registros = interpretarJsonElencoParticionado_(texto);
  validarRegistrosParticaoElenco_(registros);
  return { texto: texto, registros: registros };
}

function equipePermanenteElencoParticionado_(equipeId, equipes) {
  const encontrados = (equipes || lerRegistroEquipes_()).filter(function (item) {
    return item && item.id === equipeId;
  });
  if (encontrados.length !== 1 || typeof encontrados[0].nome !== 'string' || !encontrados[0].nome.trim()) {
    throw new Error('Mapeamento de equipe permanente ausente ou ambiguo. Corrija o registro global antes de continuar.');
  }
  return encontrados[0];
}

function equipePorNomeElencoParticionado_(nome, equipes) {
  const registro = equipes || lerRegistroEquipes_();
  const chave = chaveEquipe_(nome);
  const encontrados = registro.filter(function (item) {
    return item && chave && chaveEquipe_(item.nome) === chave;
  });
  if (encontrados.length !== 1) {
    throw new Error('Mapeamento do nome da equipe ausente ou ambiguo. Corrija o registro global antes de continuar.');
  }
  identidadeElencoParticionado_(encontrados[0].id);
  return equipePermanenteElencoParticionado_(encontrados[0].id, registro);
}

function registrosCanonicosElencoParticionado_(registros, equipeId, equipes) {
  validarRegistrosParticaoElenco_(registros);
  const equipe = equipePermanenteElencoParticionado_(equipeId, equipes);
  return registros.map(function (registro) {
    return Object.assign({}, registro, { timeVinculado: equipe.nome });
  });
}

function lerParticaoElenco_(campeonatoId, equipeId, tipo, estado) {
  nomeArquivoParticaoElenco_(equipeId, tipo, 'validacao');
  const atual = estado || lerEstadoElencosParticionados_(campeonatoId);
  if (atual.manifesto.campeonatoId !== campeonatoId) throw new Error('Estado de outro campeonato.');
  const particao = atual.manifesto.particoes.find(function (item) {
    return item.equipeId === equipeId && item.tipo === tipo;
  });
  return particao ? registrosCanonicosElencoParticionado_(
    lerConteudoParticaoElenco_(atual, particao).registros, equipeId) : [];
}

function lerElencoParticionado_(campeonatoId, tipo) {
  if (tipo !== 'atletas' && tipo !== 'comissao') throw new Error('Categoria de elenco invalida.');
  const estado = lerEstadoElencosParticionados_(campeonatoId);
  const equipes = lerRegistroEquipes_(), ids = new Set();
  return estado.manifesto.particoes.filter(function (item) { return item.tipo === tipo; })
    .reduce(function (lista, particao) {
      const registros = registrosCanonicosElencoParticionado_(
        lerConteudoParticaoElenco_(estado, particao).registros, particao.equipeId, equipes);
      registros.forEach(function (registro) {
        if (ids.has(registro.id)) throw new Error('Identificador repetido entre particoes de elenco.');
        ids.add(registro.id);
      });
      return lista.concat(registros);
    }, []);
}

// Gated RPC write adapter. It resolves every
// timeVinculado to exactly one permanent team and never silently drops rows.
function prepararParticoesElencoPorNome_(registros, equipes) {
  validarRegistrosParticaoElenco_(registros);
  const registroEquipes = equipes || lerRegistroEquipes_(), porEquipe = new Map();
  registros.forEach(function (registro) {
    if (typeof registro.timeVinculado !== 'string' || !registro.timeVinculado.trim()) {
      throw new Error('Registro sem timeVinculado. Corrija o cadastro antes de continuar.');
    }
    const mapeada = equipePorNomeElencoParticionado_(registro.timeVinculado, registroEquipes);
    const equipe = equipePermanenteElencoParticionado_(mapeada.id, registroEquipes);
    if (!porEquipe.has(equipe.id)) porEquipe.set(equipe.id, []);
    porEquipe.get(equipe.id).push(Object.assign({}, registro, { timeVinculado: equipe.nome }));
  });
  return Array.from(porEquipe.keys()).map(function (equipeId) {
    return { equipeId: equipeId, registros: porEquipe.get(equipeId) };
  });
}

// ID-keyed read adapter for consumers that must not infer storage identity
// from labels. Resolving the canonical label back to an ID also rejects
// ambiguous names rather than returning a partial roster.
function lerElencoParticionadoPorEquipe_(campeonatoId, tipo, estadoPreparado, fontesPreparadas) {
  if (tipo !== 'atletas' && tipo !== 'comissao') throw new Error('Categoria de elenco invalida.');
  const estado = estadoPreparado || lerEstadoElencosParticionados_(campeonatoId);
  if (estado.manifesto.campeonatoId !== campeonatoId) throw new Error('Estado de outro campeonato.');
  const equipes = lerRegistroEquipes_(), ids = new Set();
  return estado.manifesto.particoes.filter(function (item) { return item.tipo === tipo; })
    .map(function (particao) {
      const equipe = equipePermanenteElencoParticionado_(particao.equipeId, equipes);
      const fontePreparada = fontesPreparadas && fontesPreparadas.find(function (fonte) {
        return fonte.particao.arquivo === particao.arquivo;
      });
      if (fontesPreparadas && !fontePreparada) {
        throw new Error('Snapshot de elenco incompleto. Recarregue antes de continuar.');
      }
      const registros = registrosCanonicosElencoParticionado_(
        fontePreparada ? fontePreparada.registros
          : lerConteudoParticaoElenco_(estado, particao).registros, particao.equipeId, equipes);
      registros.forEach(function (registro) {
        if (ids.has(registro.id)) throw new Error('Identificador repetido entre particoes de elenco.');
        ids.add(registro.id);
        const mapeada = equipePorNomeElencoParticionado_(registro.timeVinculado, equipes);
        if (mapeada.id !== equipe.id) {
          throw new Error('Nome da equipe nao corresponde a identidade permanente da particao.');
        }
      });
      return { equipeId: equipe.id, registros: registros };
    });
}

// Live fingerprint, deliberately not based on legacy metadata or cached IDs.
// External edits of a published partition also change this fingerprint.
function fontesEstadoElencoParticionado_(estado) {
  const equipes = lerRegistroEquipes_(), ids = new Set();
  return estado.manifesto.particoes.map(function (particao) {
    const conteudo = lerConteudoParticaoElenco_(estado, particao);
    const equipe = equipePermanenteElencoParticionado_(particao.equipeId, equipes);
    conteudo.registros.forEach(function (registro) {
      const chave = JSON.stringify([particao.tipo, registro.id]);
      if (ids.has(chave)) throw new Error('Identificador repetido entre particoes de elenco.');
      ids.add(chave);
    });
    return { particao: particao, texto: conteudo.texto, registros: conteudo.registros, equipeNome: equipe.nome };
  });
}

function metadadosFonteElencoParticionado_(estado, arquivo, nome, pastaEsperada) {
  if (typeof Drive === 'undefined' || !Drive.Files || typeof Drive.Files.get !== 'function') {
    throw new Error('Ative o servico avancado Drive v3 para validar as fontes particionadas.');
  }
  const id = arquivo.getId();
  const meta = Drive.Files.get(id, {
    fields: 'id,name,trashed,parents,version,md5Checksum', supportsAllDrives: true
  });
  return validarMetadadosFonteElencoParticionado_(meta, nome, pastaEsperada, id);
}

function validarMetadadosFonteElencoParticionado_(meta, nome, pastaEsperada, idEsperado) {
  if (!meta || !meta.id || (idEsperado !== undefined && String(meta.id) !== String(idEsperado))
      || meta.name !== nome || meta.trashed
      || !Array.isArray(meta.parents) || meta.parents.indexOf(pastaEsperada) === -1
      || !meta.version || !/^[a-f0-9]{32}$/i.test(meta.md5Checksum || '')) {
    throw new Error('Fonte particionada ausente, movida ou sem versao verificavel. Restaure os dados antes de continuar.');
  }
  return [String(meta.id), String(meta.version), String(meta.md5Checksum).toLowerCase()];
}

function literalConsultaDriveElenco_(valor) {
  return "'" + String(valor).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function listarMetadadosCheckpointElenco_(estado) {
  if (typeof Drive === 'undefined' || !Drive.Files || typeof Drive.Files.list !== 'function') {
    throw new Error('Ative o servico avancado Drive v3 Files.list para validar as fontes particionadas.');
  }
  const pastaId = estado.pasta.getId(), encontrados = new Map();
  const nomes = [ELENCOS_PARTICOES_MANIFESTO].concat(estado.manifesto.particoes.map(function (item) {
    return item.arquivo;
  }));
  const filtro = literalConsultaDriveElenco_(pastaId) + ' in parents and trashed = false and (';
  const lotes = [], limite = 7000;
  let termos = [], tamanho = filtro.length + 1;
  nomes.forEach(function (nome) {
    const termo = 'name = ' + literalConsultaDriveElenco_(nome);
    if (filtro.length + termo.length + 1 > limite) {
      throw new Error('Nome de fonte particionada excede o limite seguro da consulta Drive.');
    }
    if (termos.length && (termos.length >= 100 || tamanho + 4 + termo.length > limite)) {
      lotes.push(filtro + termos.join(' or ') + ')');
      termos = [];
      tamanho = filtro.length + 1;
    }
    tamanho += (termos.length ? 4 : 0) + termo.length;
    termos.push(termo);
  });
  if (termos.length) lotes.push(filtro + termos.join(' or ') + ')');
  const esperados = new Set(nomes);
  lotes.forEach(function (q) {
    let token;
    const tokens = new Set();
    do {
      const opcoes = { q: q, pageSize: 1000,
        fields: 'nextPageToken,incompleteSearch,files(id,name,trashed,parents,version,md5Checksum)',
        supportsAllDrives: true, includeItemsFromAllDrives: true };
      if (token) opcoes.pageToken = token;
      const pagina = Drive.Files.list(opcoes);
      // Drive can omit false/default fields; true or malformed values cannot prove completeness.
      if (!pagina || (pagina.incompleteSearch !== undefined && pagina.incompleteSearch !== false)
          || (pagina.files !== undefined && !Array.isArray(pagina.files))) {
        throw new Error('Consulta de fontes particionadas incompleta. Recarregue antes de continuar.');
      }
      (pagina.files || []).forEach(function (meta) {
        if (!meta || !esperados.has(meta.name)) {
          throw new Error('Consulta Drive retornou uma fonte particionada inesperada.');
        }
        validarMetadadosFonteElencoParticionado_(meta, meta.name, pastaId);
        if (encontrados.has(meta.name)) {
          throw new Error('Fonte de elenco duplicada no Drive. Resolva a duplicidade antes de continuar.');
        }
        encontrados.set(meta.name, meta);
      });
      token = pagina.nextPageToken;
      if (token !== undefined && token !== '' && (typeof token !== 'string' || tokens.has(token))) {
        throw new Error('Paginacao de fontes particionadas invalida. Recarregue antes de continuar.');
      }
      if (token) tokens.add(token);
    } while (token);
  });
  return encontrados;
}

function fontesMetadadosElencoParticionado_(estado, equipes, metadados) {
  if (!estado.pasta) {
    if (estado.manifesto.particoes.length) throw new Error('Pasta de particoes ausente.');
    return [];
  }
  const registroEquipes = equipes || lerRegistroEquipes_();
  const fontes = metadados || listarMetadadosCheckpointElenco_(estado);
  return estado.manifesto.particoes.map(function (particao) {
    const meta = fontes.get(particao.arquivo);
    if (!meta) throw new Error('Particao publicada de elenco nao encontrada. Restaure os dados antes de continuar.');
    const equipe = equipePermanenteElencoParticionado_(particao.equipeId, registroEquipes);
    return [particao.tipo, particao.equipeId, particao.arquivo, equipe.nome,
      validarMetadadosFonteElencoParticionado_(meta, particao.arquivo, estado.pasta.getId())];
  });
}

// Explicit checkpoint bundle: never stored in Properties/CacheService or reused
// across a write. Each boundary resolves names and validates all Drive metadata.
function checkpointElencoParticionado_(campeonatoId, equipes, estadoPreparado) {
  const estado = estadoPreparado || lerEstadoElencosParticionados_(campeonatoId);
  const metadados = estado.pasta ? listarMetadadosCheckpointElenco_(estado) : new Map();
  const fontes = fontesMetadadosElencoParticionado_(estado, equipes, metadados);
  const manifesto = estado.arquivo
    ? validarMetadadosFonteElencoParticionado_(metadados.get(ELENCOS_PARTICOES_MANIFESTO),
      ELENCOS_PARTICOES_MANIFESTO, estado.pasta.getId(), estado.arquivo.getId())
    : null;
  if ((!estado.arquivo && metadados.has(ELENCOS_PARTICOES_MANIFESTO))
      || (manifesto && manifesto[2] !== md5IndiceValidacao_(estado.texto))) {
    throw new Error('Manifesto de elenco mudou durante a leitura. Recarregue antes de continuar.');
  }
  return { estado: estado, fontes: fontes, manifesto: manifesto,
    assinatura: digestIndiceValidacao_(JSON.stringify(['aeuv.elencos.particoes.v2', manifesto, fontes])) };
}

function assinaturaEstadoElencoParticionado_(estado, conteudos, equipes, checkpoint) {
  if (elencosParticionadosCutoverAtivo_()) {
    return (checkpoint || checkpointElencoParticionado_(
      estado.manifesto.campeonatoId, equipes, estado)).assinatura;
  }
  const fontes = (conteudos || fontesEstadoElencoParticionado_(estado)).map(function (conteudo) {
    const particao = conteudo.particao;
    return [particao.tipo, particao.equipeId, particao.arquivo, conteudo.equipeNome,
      digestIndiceValidacao_(conteudo.texto)];
  });
  return digestIndiceValidacao_(JSON.stringify(['aeuv.elencos.particoes.v1', estado.texto, fontes]));
}

function assinaturaFontesElencoParticionado_(campeonatoId) {
  return assinaturaEstadoElencoParticionado_(lerEstadoElencosParticionados_(campeonatoId));
}

function criarDocumentoPreparacaoElenco_(pasta, nome, dados) {
  if (itemUnicoElencoParticionado_(pasta.getFilesByName(nome))) {
    throw new Error('Documento de preparacao ja existe. Recarregue antes de repetir a operacao.');
  }
  const texto = JSON.stringify(dados);
  const arquivo = pasta.createFile(Utilities.newBlob(texto, 'application/json', nome));
  if (arquivo.getBlob().getDataAsString('UTF-8') !== texto) {
    throw new Error('Nao foi possivel confirmar a preparacao do elenco. Nada foi publicado.');
  }
  return nome;
}

// Active snapshots retain immutable references instead of copying roster data.
function prepararSnapshotPublicacaoElenco_(pasta, estado, conteudos, revisao, assinatura) {
  if (elencosParticionadosCutoverAtivo_()) {
    return criarDocumentoPreparacaoElenco_(pasta, 'snapshot - ' + identidadeElencoParticionado_(revisao) + '.json', {
      schema: 'aeuv.elencos.snapshot', versao: 2, campeonatoId: estado.manifesto.campeonatoId,
      revisaoDestino: revisao, assinaturaAnterior: assinatura, manifestoAnterior: estado.manifesto,
      particoes: conteudos.map(function (conteudo) {
        return { referencia: conteudo.particao,
          digest: conteudo.digest || digestIndiceValidacao_(conteudo.texto),
          algoritmo: conteudo.algoritmo || 'sha256' };
      })
    });
  }
  return criarDocumentoPreparacaoElenco_(pasta, 'snapshot - ' + identidadeElencoParticionado_(revisao) + '.json', {
    schema: 'aeuv.elencos.snapshot', versao: 1, campeonatoId: estado.manifesto.campeonatoId,
    revisaoDestino: revisao, assinaturaAnterior: assinatura, manifestoAnterior: estado.manifesto,
    particoes: conteudos.map(function (conteudo) {
      return { referencia: conteudo.particao, registros: conteudo.registros };
    })
  });
}

function prepararPendenciaPublicacaoElenco_(pasta, manifesto, snapshot, assinatura, recursos, preparadas) {
  if (elencosParticionadosCutoverAtivo_()) {
    const anterior = lerDocumentoRecuperacaoElenco_(pasta, snapshot).manifestoAnterior;
    const equipes = recursos && recursos.equipes || lerRegistroEquipes_();
    const campeonatos = recursos && recursos.campeonatos || campeonatos_();
    const campeonato = campeonatos.find(function (item) { return item.id === manifesto.campeonatoId; });
    if (!campeonato) throw new Error('Campeonato não encontrado para o journal.');
    const alteracoes = manifesto.particoes.filter(function (particao) {
      return !anterior.particoes.some(function (item) { return item.arquivo === particao.arquivo; });
    }).map(function (particao) {
      const arquivo = itemUnicoElencoParticionado_(pasta.getFilesByName(particao.arquivo));
      if (!arquivo) throw new Error('Particao do journal ausente.');
      const metadados = metadadosFonteElencoParticionado_(
        { pasta: pasta }, arquivo, particao.arquivo, pasta.getId());
      const preparada = (preparadas || []).find(function (item) {
        return item.item.tipo === particao.tipo && item.item.equipeId === particao.equipeId;
      });
      if (!preparada || metadados[2] !== md5IndiceValidacao_(preparada.texto)) {
        throw new Error('Particao do journal divergiu dos dados preparados.');
      }
      return { referencia: particao, digest: digestIndiceValidacao_(preparada.texto), algoritmo: 'sha256',
        equipeNome: equipePermanenteElencoParticionado_(particao.equipeId, equipes).nome };
    });
    return criarDocumentoPreparacaoElenco_(pasta,
      'pendencia - ' + identidadeElencoParticionado_(manifesto.revisao) + '.json', {
        schema: 'aeuv.elencos.publicacao', versao: 2, campeonatoId: manifesto.campeonatoId,
        revisaoDestino: manifesto.revisao, snapshotAnterior: snapshot,
        assinaturaAnterior: assinatura, manifestoDestino: manifesto,
        registradoEm: new Date().toISOString(), campeonatoNome: campeonato.nome,
        alteracoes: alteracoes,
        participacoes: (manifesto.participacoes || []).filter(function (item) {
          return !(anterior.participacoes || []).some(function (antes) {
            return JSON.stringify(antes) === JSON.stringify(item);
          });
        })
      });
  }
  return criarDocumentoPreparacaoElenco_(pasta,
    'pendencia - ' + identidadeElencoParticionado_(manifesto.revisao) + '.json', {
      schema: 'aeuv.elencos.publicacao', versao: 1, campeonatoId: manifesto.campeonatoId,
      revisaoDestino: manifesto.revisao, snapshotAnterior: snapshot,
      assinaturaAnterior: assinatura, manifestoDestino: manifesto
    });
}

function validarManifestoRecuperacaoElenco_(manifesto, campeonatoId, revisao) {
    if (!manifesto || manifesto.schema !== 'aeuv.elencos.particoes' || manifesto.versao !== 1
        || manifesto.campeonatoId !== campeonatoId || typeof manifesto.revisao !== 'string'
        || (revisao && manifesto.revisao !== revisao) || !Array.isArray(manifesto.particoes)) {
      throw new Error('Manifesto de recuperacao de elenco invalido.');
    }
    const chaves = new Set();
    validarParticipacoesManifestoElenco_(manifesto);
    manifesto.particoes.forEach(function (particao) {
      if (!particao || particao.arquivo !== nomeArquivoParticaoElenco_(
        particao.equipeId, particao.tipo, particao.revisao)) {
        throw new Error('Referencia de recuperacao de elenco invalida.');
      }
      const chave = JSON.stringify([particao.tipo, particao.equipeId]);
      if (chaves.has(chave)) throw new Error('Particao repetida no manifesto de recuperacao.');
      chaves.add(chave);
    });
    return manifesto;
}

function lerDocumentoRecuperacaoElenco_(pasta, nome) {
    const arquivo = itemUnicoElencoParticionado_(pasta.getFilesByName(nome));
    if (!arquivo) throw new Error('Documento de recuperacao nao encontrado.');
    return interpretarJsonElencoParticionado_(arquivo.getBlob().getDataAsString('UTF-8'));
}

function diagnosticarRecuperacaoElencosParticionados(campeonatoId) {
    exigirAdministracao_();
    const id = String(campeonatoId || '').trim();
    if (!id) throw new Error('Selecione um campeonato para verificar os journals.');
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const pasta = pastaElencosParticionados_(id, false);
      if (!pasta) return { campeonatoId: id, total: 0, truncado: false, journals: [] };
      const iterador = pasta.getFiles(), encontrados = [];
      let truncado = false;
      while (iterador.hasNext()) {
        const arquivo = iterador.next(), nome = arquivo.getName();
        if (!/^pendencia - .+\.json$/.test(nome)) continue;
        if (encontrados.length === 100) {
          truncado = true;
          break;
        }
        encontrados.push({ nome: nome, texto: arquivo.getBlob().getDataAsString('UTF-8') });
      }
      const estadoAtual = lerEstadoElencosParticionados_(id);
      const assinaturaAtual = assinaturaEstadoElencoParticionado_(estadoAtual);
      const propriedades = PropertiesService.getScriptProperties();
      const destinosValidos = [];
      const journals = encontrados.map(function (entrada) {
        const resultado = { campeonatoId: id, revisao: '', estado: 'invalido', filaHistorico: 'desconhecida' };
        try {
          const correspondencia = entrada.nome.match(/^pendencia - (.+)\.json$/);
          const dados = interpretarJsonElencoParticionado_(entrada.texto);
          if (!correspondencia || !dados || dados.schema !== 'aeuv.elencos.publicacao'
              || dados.versao !== (elencosParticionadosCutoverAtivo_() ? 2 : 1) || dados.campeonatoId !== id
              || typeof dados.revisaoDestino !== 'string'
              || decodeURIComponent(correspondencia[1]) !== dados.revisaoDestino
              || dados.snapshotAnterior !== 'snapshot - ' + identidadeElencoParticionado_(dados.revisaoDestino) + '.json'
              || typeof dados.assinaturaAnterior !== 'string' || !dados.assinaturaAnterior) {
            throw new Error('Journal de publicacao invalido.');
          }
          resultado.revisao = dados.revisaoDestino;
          const snapshot = lerDocumentoRecuperacaoElenco_(pasta, dados.snapshotAnterior);
          if (!snapshot || snapshot.schema !== 'aeuv.elencos.snapshot' || snapshot.versao !== dados.versao
              || snapshot.campeonatoId !== id || snapshot.revisaoDestino !== dados.revisaoDestino
              || snapshot.assinaturaAnterior !== dados.assinaturaAnterior
              || !Array.isArray(snapshot.particoes)) {
            throw new Error('Snapshot de recuperacao invalido.');
          }
          const anterior = validarManifestoRecuperacaoElenco_(snapshot.manifestoAnterior, id, '');
          const destino = validarManifestoRecuperacaoElenco_(dados.manifestoDestino, id, dados.revisaoDestino);
          const referenciasSnapshot = Object.create(null), idsSnapshot = Object.create(null);
          snapshot.particoes.forEach(function (item) {
            if (snapshot.versao === 2) {
              const conteudo = lerConteudoParticaoElenco_({ pasta: pasta }, item.referencia);
                const digest = item.algoritmo === 'md5'
                  ? md5IndiceValidacao_(conteudo.texto) : digestIndiceValidacao_(conteudo.texto);
                if (digest !== item.digest) {
                  throw new Error('Versao imutavel do snapshot alterada.');
                }
              item = { referencia: item.referencia, registros: conteudo.registros };
            }
            if (!item || !Array.isArray(item.registros) || !item.referencia
                || item.referencia.arquivo !== nomeArquivoParticaoElenco_(
                  item.referencia.equipeId, item.referencia.tipo, item.referencia.revisao)) {
              throw new Error('Particao do snapshot de recuperacao invalida.');
            }
            const chave = JSON.stringify([item.referencia.tipo, item.referencia.equipeId]);
            if (referenciasSnapshot[chave]) throw new Error('Particao repetida no snapshot de recuperacao.');
            validarRegistrosParticaoElenco_(item.registros);
            item.registros.forEach(function (registro) {
              const chaveRegistro = JSON.stringify([item.referencia.tipo, registro.id]);
              if (idsSnapshot[chaveRegistro]) throw new Error('Registro repetido no snapshot de recuperacao.');
              idsSnapshot[chaveRegistro] = true;
            });
            referenciasSnapshot[chave] = item;
          });
          if (snapshot.particoes.length !== anterior.particoes.length
              || anterior.particoes.some(function (particao) {
                const item = referenciasSnapshot[JSON.stringify([particao.tipo, particao.equipeId])];
                return !item || JSON.stringify(item.referencia) !== JSON.stringify(particao);
              })) throw new Error('Snapshot nao representa todas as particoes anteriores.');
          const estadoDestino = {
            pasta: pasta, arquivo: estadoAtual.arquivo,
            texto: JSON.stringify(destino), manifesto: destino
          };
          fontesEstadoElencoParticionado_(estadoDestino);
          if (dados.versao === 2) {
            const alteradas = destino.particoes.filter(function (ref) {
              return !anterior.particoes.some(function (item) { return item.arquivo === ref.arquivo; });
            });
            if (!Array.isArray(dados.alteracoes) || dados.alteracoes.length !== alteradas.length
                || destino.sequenciaPublicacao !== (anterior.sequenciaPublicacao || 0) + 1) {
              throw new Error('Journal de historico inconsistente.');
            }
            dados.alteracoes.forEach(function (item, i) {
              if (!item || JSON.stringify(item.referencia) !== JSON.stringify(alteradas[i])) {
                throw new Error('Referencia de historico inconsistente.');
              }
              registrosReferenciaHistorico_(estadoDestino, item);
            });
          }
          const filaBruta = propriedades.getProperty(chaveFilaHistoricoElenco_(id));
          if (filaBruta === null) resultado.filaHistorico = 'ausente';
          else {
            try {
              const fila = JSON.parse(filaBruta);
              resultado.filaHistorico = fila && fila.versao === 1 && fila.campeonatoId === id
                && typeof fila.token === 'string' && fila.token ? 'presente' : 'invalida';
            } catch (erroFila) {
              resultado.filaHistorico = 'invalida';
            }
          }
          if (estadoAtual.manifesto.revisao === destino.revisao
              && JSON.stringify(estadoAtual.manifesto) === JSON.stringify(destino)) {
            fontesEstadoElencoParticionado_(estadoAtual);
            resultado.estado = 'publicado';
          } else if (JSON.stringify(estadoAtual.manifesto) === JSON.stringify(snapshot.manifestoAnterior)) {
            resultado.estado = assinaturaAtual === dados.assinaturaAnterior ? 'nao_publicado' : 'divergente';
          } else {
            resultado.estado = 'divergente';
          }
          destinosValidos.push({
            resultado: resultado,
            anterior: anterior,
            destino: destino
          });
        } catch (e) {
          resultado.diagnostico = String(e && e.message || 'Documento de recuperacao invalido.');
        }
        return resultado;
      });
      let manifestoAlvo = JSON.stringify(estadoAtual.manifesto);
      const manifestosPercorridos = Object.create(null);
      let revisaoAtiva = true;
      while (manifestoAlvo && !manifestosPercorridos[manifestoAlvo]) {
        manifestosPercorridos[manifestoAlvo] = true;
        const publicado = destinosValidos.find(function (item) {
          return JSON.stringify(item.destino) === manifestoAlvo;
        });
        if (!publicado) break;
        if (!revisaoAtiva && publicado.resultado.estado === 'divergente') {
          publicado.resultado.estado = 'substituido';
        }
        revisaoAtiva = false;
        manifestoAlvo = JSON.stringify(publicado.anterior);
      }
      return { campeonatoId: id, total: encontrados.length, truncado: truncado,
        revisaoAtual: estadoAtual.manifesto.revisao || '', journals: journals };
    } finally { lock.releaseLock(); }
}

function validarIdsPublicacaoElenco_(manifesto, conteudos, preparadas, indiceBase, equipes) {
  const alteradas = Object.create(null), ids = Object.create(null);
  preparadas.forEach(function (preparada) {
    const tipo = preparada.item.tipo, equipeId = preparada.item.equipeId;
    (alteradas[tipo] || (alteradas[tipo] = Object.create(null)))[equipeId] = true;
  });
  ['atletas', 'comissao'].forEach(function (tipo) {
    ids[tipo] = Object.create(null);
    if (indiceBase && indiceBase.ids && indiceBase.ids[tipo]) {
      const equipesAlteradas = Object.create(null);
      Object.keys(alteradas[tipo] || {}).forEach(function (equipeId) {
        const equipe = equipePermanenteElencoParticionado_(equipeId, equipes);
        equipesAlteradas[chaveEquipe_(equipe.nome)] = true;
      });
      Object.keys(indiceBase.ids[tipo]).forEach(function (registroId) {
        const equipe = indiceBase.ids[tipo][registroId];
        if (!equipesAlteradas[equipe]) ids[tipo][registroId] = true;
      });
    } else {
      conteudos.filter(function (conteudo) { return conteudo.particao.tipo === tipo; })
        .forEach(function (conteudo) {
          if (alteradas[tipo] && alteradas[tipo][conteudo.particao.equipeId]) return;
          conteudo.registros.forEach(function (registro) {
            if (ids[tipo][registro.id]) {
              throw new Error('Identificador repetido entre particoes de elenco.');
            }
            ids[tipo][registro.id] = true;
          });
        });
    }
  });
  preparadas.forEach(function (preparada) {
    validarRegistrosParticaoElenco_(preparada.item.registros);
    preparada.item.registros.forEach(function (registro) {
      if (ids[preparada.item.tipo][registro.id]) {
        throw new Error('Identificador repetido entre particoes de elenco.');
      }
      ids[preparada.item.tipo][registro.id] = true;
    });
  });
}

function validarAssociacoesPublicacaoElenco_(campeonatoId, estado, equipesAlteradas, recursos) {
  const equipes = lerRegistroEquipes_();
  const campeonatos = campeonatos_();
  const campeonato = campeonatos.find(function (item) { return item.id === campeonatoId; });
  if (!campeonato) throw new Error('Campeonato removido durante a gravacao.');
  const campeonatoAnterior = recursos && recursos.campeonatos
    && recursos.campeonatos.find(function (item) { return item.id === campeonatoId; });
  if (campeonatoAnterior && campeonatoAnterior.nome !== campeonato.nome) {
    throw new Error('O campeonato mudou durante a gravacao.');
  }
  const equipesAnteriores = recursos && recursos.equipes;
  const idsRelevantes = new Set(equipesAlteradas || []);
  estado.manifesto.particoes.forEach(function (item) { idsRelevantes.add(item.equipeId); });
  (estado.manifesto.participacoes || []).forEach(function (item) { idsRelevantes.add(item.equipeId); });
  idsRelevantes.forEach(function (equipeId) {
    const atual = equipePermanenteElencoParticionado_(equipeId, equipes);
    const anteriores = equipesAnteriores && equipesAnteriores.filter(function (item) {
      return item.id === equipeId;
    });
    if (anteriores && (anteriores.length !== 1 || anteriores[0].nome !== atual.nome)) {
      throw new Error('O registro de uma equipe mudou durante a gravacao.');
    }
  });
  const timesAtuais = timesCampeonato_(campeonatoId);
  const timesAnteriores = recursos && recursos.times && recursos.times[campeonatoId];
  if (timesAnteriores && JSON.stringify(timesAnteriores.map(function (nome) {
    return chaveEquipe_(nome);
  }).sort()) !== JSON.stringify(timesAtuais.map(function (nome) {
    return chaveEquipe_(nome);
  }).sort())) {
    throw new Error('Os vinculos de equipes do campeonato mudaram durante a gravacao.');
  }
  const ativas = obterEquipes_().map(chaveEquipe_);
  (equipesAlteradas || []).forEach(function (equipeId) {
    const equipe = equipePermanenteElencoParticionado_(equipeId, equipes);
    if (ativas.indexOf(chaveEquipe_(equipe.nome)) === -1
        || !timesAtuais.some(function (nome) { return chaveEquipe_(nome) === chaveEquipe_(equipe.nome); })) {
      throw new Error('A equipe alterada deixou de estar ativa e vinculada ao campeonato.');
    }
  });
  return { equipes: equipes, campeonato: campeonato };
}

function confirmarFontesPublicacaoElenco_(campeonatoId, assinatura, recursos, equipesAlteradas) {
  const atual = lerEstadoElencosParticionados_(campeonatoId);
  if (!elencosParticionadosCutoverAtivo_()) {
    if (assinaturaEstadoElencoParticionado_(atual) !== assinatura) {
      throw new Error('O manifesto ou uma particao mudou durante a gravacao. Recarregue antes de repetir a operacao.');
    }
    return [];
  }
  const contexto = validarAssociacoesPublicacaoElenco_(
    campeonatoId, atual, equipesAlteradas, recursos);
  if (assinaturaEstadoElencoParticionado_(atual, null, contexto.equipes) !== assinatura) {
    throw new Error('O manifesto ou uma particao mudou durante a gravacao. Recarregue antes de repetir a operacao.');
  }
  return contexto.equipes;
}

function publicarManifestoElenco_(pasta, estado, texto) {
  // The Drive call itself can fail after committing. Never claim rollback.
  try {
    if (estado.arquivo) estado.arquivo.setContent(texto);
    else pasta.createFile(Utilities.newBlob(texto, 'application/json', ELENCOS_PARTICOES_MANIFESTO));
    const publicado = itemUnicoElencoParticionado_(pasta.getFilesByName(ELENCOS_PARTICOES_MANIFESTO));
    if (!publicado || publicado.getBlob().getDataAsString('UTF-8') !== texto) {
      throw new Error('Conteudo publicado divergente.');
    }
  } catch (causa) {
    const erro = new Error('Nao foi possivel confirmar a publicacao do elenco. O estado pode ter sido publicado integralmente; '
      + 'recarregue antes de repetir a operacao. Nenhum rollback foi executado.');
    erro.cause = causa;
    throw erro;
  }
}

function gravarParticoesElenco_(campeonatoId, alteracoes, revisaoEsperada, assinaturaEsperada,
    somenteParticipacoes, recursosOperacao, checkpointPreparado) {
  exigirLockElencoParticionado_();
  if (recursosOperacao) {
    delete recursosOperacao.checkpointsValidacaoElenco;
    delete recursosOperacao.elencoCheckpointPosCommit;
  }
  if (!Array.isArray(alteracoes) || (!alteracoes.length
      && !(somenteParticipacoes && elencosParticionadosCutoverAtivo_()))) {
    throw new Error('Informe as particoes alteradas.');
  }
  const chaves = new Set();
  alteracoes.forEach(function (item) {
    if (!item || !Array.isArray(item.registros)) throw new Error('A particao de elenco deve conter uma lista.');
    nomeArquivoParticaoElenco_(item.equipeId, item.tipo, 'validacao');
    const chave = JSON.stringify([item.tipo, item.equipeId]);
    if (chaves.has(chave)) throw new Error('Particao repetida na gravacao.');
    chaves.add(chave);
  });
  const checkpoint = elencosParticionadosCutoverAtivo_()
    ? (checkpointPreparado || medirFaseCadastro_('elenco_metadados_preparacao', function () {
      return checkpointElencoParticionado_(campeonatoId, recursosOperacao && recursosOperacao.equipes);
    })) : null;
  const estado = checkpoint ? checkpoint.estado : lerEstadoElencosParticionados_(campeonatoId);
  if (revisaoEsperada !== undefined && revisaoEsperada !== estado.manifesto.revisao) {
    throw new Error('O elenco mudou. Recarregue antes de repetir a operacao.');
  }
  // The active path fingerprints every source with Drive metadata. Roster blobs
  // are read only for changed partitions unless no valid compact index exists.
  let conteudos = [];
  let indiceBase = null;
  if (elencosParticionadosCutoverAtivo_()) {
    indiceBase = recursosOperacao && recursosOperacao.indiceBaseMutacao
      || consultarIndiceValidacao_(campeonatoId, null, null, checkpoint);
    if (!indiceBase) conteudos = fontesEstadoElencoParticionado_(estado);
  } else {
    conteudos = fontesEstadoElencoParticionado_(estado);
  }
  const fontesAntes = elencosParticionadosCutoverAtivo_()
    ? checkpoint.fontes : null;
  const equipes = recursosOperacao && recursosOperacao.equipes || lerRegistroEquipes_();
  const assinatura = assinaturaEstadoElencoParticionado_(estado, conteudos, equipes, checkpoint);
  if (assinaturaEsperada !== undefined && assinaturaEsperada !== assinatura) {
    throw new Error('Uma fonte do elenco mudou. Recarregue antes de repetir a operacao.');
  }
  let participacoes = estado.manifesto.participacoes || [];
  let mudouParticipacao = false;
  if (elencosParticionadosCutoverAtivo_()) {
    participacoes = participacoes.slice();
    const campeonatos = recursosOperacao && recursosOperacao.campeonatos || campeonatos_();
    const campeonato = campeonatos.find(function (item) { return item.id === campeonatoId; });
    if (!campeonato) throw new Error('Campeonato não encontrado.');
    timesCampeonatoOperacao_(campeonatoId, recursosOperacao).forEach(function (nome) {
      const equipe = equipePorNomeElencoParticionado_(nome, equipes);
      const item = { equipeId: equipe.id, equipeNome: equipe.nome, campeonatoNome: campeonato.nome };
      const indice = participacoes.findIndex(function (anterior) { return anterior.equipeId === equipe.id; });
      if (indice === -1) {
        participacoes.push(item);
        mudouParticipacao = true;
      } else if (JSON.stringify(participacoes[indice]) !== JSON.stringify(item)) {
        participacoes[indice] = item;
        mudouParticipacao = true;
      }
    });
  }
  const preparadas = medirFaseCadastro_('elenco_preparacao_particoes', function () { return alteracoes.map(function (item) {
    const registros = registrosCanonicosElencoParticionado_(item.registros, item.equipeId, equipes);
    const referencia = estado.manifesto.particoes.find(function (particao) {
      return particao.tipo === item.tipo && particao.equipeId === item.equipeId;
    });
    const anterior = referencia ? (conteudos.find(function (conteudo) {
      return conteudo.particao.arquivo === referencia.arquivo;
    }) || lerConteudoParticaoElenco_(estado, referencia)) : null;
    const texto = JSON.stringify(registros);
    const antes = anterior ? JSON.stringify(registrosCanonicosElencoParticionado_(
      anterior.registros, item.equipeId, equipes)) : '[]';
    return { item: { equipeId: item.equipeId, tipo: item.tipo, registros: registros },
      texto: texto, mudou: texto !== antes, anteriorTexto: anterior && anterior.texto };
  }).filter(function (item) { return item.mudou; }); });
  if (!preparadas.length && !mudouParticipacao) {
    if (checkpoint && recursosOperacao) {
      recursosOperacao.elencoAssinaturaPosCommit = checkpoint.assinatura;
      recursosOperacao.elencoCheckpointPosCommit = checkpoint;
    }
    return estado.manifesto.revisao;
  }
  if (elencosParticionadosCutoverAtivo_() && !recursosOperacao) {
    invalidarIndiceValidacao_(campeonatoId);
  }
  const manifesto = Object.assign({}, estado.manifesto, {
    revisao: Utilities.getUuid(), particoes: estado.manifesto.particoes.slice()
  });
  if (elencosParticionadosCutoverAtivo_()) {
    manifesto.sequenciaPublicacao = (estado.manifesto.sequenciaPublicacao || 0) + 1;
    manifesto.participacoes = participacoes;
  }
  preparadas.forEach(function (preparada) {
    if (!manifesto.particoes.some(function (particao) {
      return particao.tipo === preparada.item.tipo && particao.equipeId === preparada.item.equipeId;
    })) manifesto.particoes.push({ tipo: preparada.item.tipo, equipeId: preparada.item.equipeId });
  });
  medirFaseCadastro_('elenco_ids_publicacao', function () {
    validarIdsPublicacaoElenco_(manifesto, conteudos, preparadas, indiceBase, equipes);
  });
  const pasta = estado.pasta || pastaElencosParticionados_(campeonatoId, true);
  let conteudosSnapshot = conteudos;
  if (elencosParticionadosCutoverAtivo_()) {
    conteudosSnapshot = fontesAntes.map(function (fonte) {
      const referencia = estado.manifesto.particoes.find(function (item) {
        return item.tipo === fonte[0] && item.equipeId === fonte[1];
      });
      const preparada = preparadas.find(function (item) {
        return item.item.tipo === fonte[0] && item.item.equipeId === fonte[1];
      });
      return { particao: referencia,
        digest: preparada && preparada.anteriorTexto !== undefined
          ? digestIndiceValidacao_(preparada.anteriorTexto) : fonte[4][2],
        algoritmo: preparada && preparada.anteriorTexto !== undefined ? 'sha256' : 'md5' };
    });
  }
  const snapshot = medirFaseCadastro_('elenco_snapshot', function () {
    return prepararSnapshotPublicacaoElenco_(pasta, estado, conteudosSnapshot, manifesto.revisao, assinatura);
  });
  medirFaseCadastro_('elenco_particoes', function () { preparadas.forEach(function (preparada) {
    const item = preparada.item, revisao = Utilities.getUuid();
    const nome = nomeArquivoParticaoElenco_(item.equipeId, item.tipo, revisao);
    if (itemUnicoElencoParticionado_(pasta.getFilesByName(nome))) {
      throw new Error('Versao de particao ja existe. Recarregue antes de repetir a operacao.');
    }
    const arquivo = pasta.createFile(Utilities.newBlob(preparada.texto, 'application/json', nome));
    if (arquivo.getBlob().getDataAsString('UTF-8') !== preparada.texto) {
      throw new Error('Nao foi possivel confirmar a nova particao de elenco.');
    }
    const referencia = { equipeId: item.equipeId, tipo: item.tipo, revisao: revisao, arquivo: nome };
    const posicao = manifesto.particoes.findIndex(function (particao) {
      return particao.equipeId === item.equipeId && particao.tipo === item.tipo;
    });
    if (posicao === -1) manifesto.particoes.push(referencia);
    else manifesto.particoes[posicao] = referencia;
  }); });
  medirFaseCadastro_('elenco_journal', function () {
    prepararPendenciaPublicacaoElenco_(pasta, manifesto, snapshot, assinatura, recursosOperacao, preparadas);
  });
  if (elencosParticionadosCutoverAtivo_()) {
    registrarCampeonatoHistoricoParticionado_(campeonatoId);
    marcarHistoricoElencoPendente_(campeonatoId);
  }
  medirFaseCadastro_('elenco_precommit', function () {
    confirmarFontesPublicacaoElenco_(
      campeonatoId, assinatura, recursosOperacao, alteracoes.map(function (item) { return item.equipeId; }));
  });
  const texto = JSON.stringify(manifesto);
  // Copy-on-write: one publication point for every affected team/category.
  // A failure before this point leaves all old references intact. A failure
  // after it leaves the complete new state; never roll back one partition.
  medirFaseCadastro_('elenco_commit', function () { publicarManifestoElenco_(pasta, estado, texto); });
  medirFaseCadastro_('elenco_poscommit', function () {
  if (elencosParticionadosCutoverAtivo_()) {
    const estadoDepois = lerEstadoElencosParticionados_(campeonatoId);
    const equipesDepois = validarAssociacoesPublicacaoElenco_(
      campeonatoId, estadoDepois,
      alteracoes.map(function (item) { return item.equipeId; }), recursosOperacao).equipes;
    const checkpointDepois = checkpointElencoParticionado_(campeonatoId, equipesDepois, estadoDepois);
    const fontesDepois = checkpointDepois.fontes;
    const chavesAlteradas = Object.create(null);
    preparadas.forEach(function (preparada) {
      chavesAlteradas[JSON.stringify([preparada.item.tipo, preparada.item.equipeId])] = preparada;
    });
    const fontesAntesPorChave = Object.create(null);
    fontesAntes.forEach(function (fonte) {
      fontesAntesPorChave[JSON.stringify([fonte[0], fonte[1]])] = fonte;
    });
    const novas = preparadas.filter(function (preparada) {
      return !fontesAntesPorChave[JSON.stringify([preparada.item.tipo, preparada.item.equipeId])];
    }).length;
    if (fontesDepois.length !== fontesAntes.length + novas) {
      throw new Error('Fontes de elenco divergiram apos a publicacao.');
    }
    fontesDepois.forEach(function (fonte) {
      const chave = JSON.stringify([fonte[0], fonte[1]]);
      const preparada = chavesAlteradas[chave];
      if (preparada) {
        const ref = manifesto.particoes.find(function (item) {
          return item.tipo === preparada.item.tipo && item.equipeId === preparada.item.equipeId;
        });
        if (!ref || ref.arquivo !== fonte[2]
            || fonte[4][2] !== md5IndiceValidacao_(preparada.texto)) {
          throw new Error('Particao publicada divergiu dos dados preparados.');
        }
      } else if (JSON.stringify(fonte) !== JSON.stringify(fontesAntesPorChave[chave])) {
        throw new Error('Uma particao nao alterada mudou durante a publicacao.');
      }
    });
    const metaManifesto = checkpointDepois.manifesto;
    if (metaManifesto[2] !== md5IndiceValidacao_(texto)) {
      throw new Error('Manifesto publicado divergiu dos dados preparados.');
    }
    if (recursosOperacao) {
      recursosOperacao.elencoAssinaturaPosCommit = checkpointDepois.assinatura;
      recursosOperacao.elencoCheckpointPosCommit = checkpointDepois;
    }
  }
  });
  return manifesto.revisao;
}

// Storage operation only: the future RPC adapter must run the existing
// permission, CPF, championship binding and participation guards beforehand.
function transferirRegistroParticionado_(campeonatoId, tipo, registroId, origemId, destinoId, destinoNome) {
  exigirLockElencoParticionado_();
  if (origemId === destinoId || typeof registroId !== 'string' || !registroId.trim()
      || typeof destinoNome !== 'string' || !destinoNome.trim()) {
    throw new Error('Informe uma transferencia de elenco valida.');
  }
  const estado = lerEstadoElencosParticionados_(campeonatoId);
  const assinatura = assinaturaEstadoElencoParticionado_(estado);
  const origem = lerParticaoElenco_(campeonatoId, origemId, tipo, estado);
  const destino = lerParticaoElenco_(campeonatoId, destinoId, tipo, estado);
  const encontrados = origem.filter(function (item) { return item && item.id === registroId; });
  if (encontrados.length !== 1 || destino.some(function (item) { return item && item.id === registroId; })) {
    throw new Error('Registro de transferencia ausente ou duplicado. Recarregue antes de continuar.');
  }
  return gravarParticoesElenco_(campeonatoId, [
    { tipo: tipo, equipeId: origemId, registros: origem.filter(function (item) { return item !== encontrados[0]; }) },
    { tipo: tipo, equipeId: destinoId, registros: destino.concat([
      Object.assign({}, encontrados[0], { timeVinculado: destinoNome })
    ]) }
  ], estado.manifesto.revisao, assinatura);
}

function removerCadastroPessoasCampeonato_(campeonatoId) {
  invalidarIndiceValidacao_(campeonatoId);
  if (elencosParticionadosCutoverAtivo_()) return;
  ['Atletas', 'Comissao Tecnica'].forEach(function (tipo) {
    const nome = arquivoCadastroPessoasCampeonato_(campeonatoId, tipo);
    try {
      const arquivos = pastaRaizProjeto_().getFilesByName(nome);
      while (arquivos.hasNext()) {
        arquivos.next().setTrashed(true);
      }
    } finally {
      invalidarIdArquivoCadastro_(nome);
    }
  });
  const propriedades = PropertiesService.getScriptProperties();
  propriedades.deleteProperty(chaveAtletasCampeonato_(campeonatoId));
  propriedades.deleteProperty(chaveComissaoTecnicaCampeonato_(campeonatoId));
}

 function montarTelaCampeonatos_(lista, sessao) {
   const ordenados = lista.slice().sort(function (a, b) {
     const ordemStatus = CAMPEONATOS_STATUS.indexOf(a.status) - CAMPEONATOS_STATUS.indexOf(b.status);

     return ordemStatus || String(b.atualizadoEm || b.criadoEm || '').localeCompare(String(a.atualizadoEm || a.criadoEm || ''));
   });

   return {
     registros: ordenados.map(function (item) {
       return {
         id: item.id,
         nome: item.nome,
         temporada: item.temporada,
         modalidade: item.modalidade,
         status: item.status,
         descricao: item.descricao,
         responsavel: item.responsavel,
         visibilidade: item.visibilidade,
         dataInicio: item.dataInicio,
         dataFim: item.dataFim,
         escudo: item.escudo,
         estrutura: estruturaCampeonato_(item.id, item),
         criadoEm: item.criadoEm,
         criadoPor: item.criadoPor,
         atualizadoEm: item.atualizadoEm,
         atualizadoPor: item.atualizadoPor
       };
     }),
     status: CAMPEONATOS_STATUS.map(function (valor) {
       return { id: valor, nome: valor.charAt(0).toUpperCase() + valor.slice(1) };
     }),
     modalidades: CAMPEONATOS_MODALIDADES.map(function (valor) {
       return { id: valor, nome: valor };
     }),
     visibilidades: CAMPEONATOS_VISIBILIDADES.map(function (valor) {
       return { id: valor, nome: valor };
     }),
     formatos: CAMPEONATO_FORMATOS_FASE.map(function (valor) {
       return { id: valor, nome: valor };
     }),
     podeEditar: true,
     podeExcluir: sessao.usuario.perfil === 'admin'
   };
 }

function listarCampeonatos() {
  const sessao = sessaoCampeonato_();

  return montarTelaCampeonatos_(campeonatos_(), sessao);
}

function salvarCampeonato(payload) {
  const sessao = sessaoCampeonato_();
  const dados = payload || {};
  const nome = limparEspacos_(dados.nome);
  const temporada = limparEspacos_(dados.temporada);
  const modalidade = String(dados.modalidade || '').trim();
  const status = String(dados.status || '').trim();
  const visibilidade = String(dados.visibilidade || '').trim();
  const descricao = String(dados.descricao || '').trim();
  const responsavel = String(dados.responsavel || '').trim();
  const dataInicio = dataIsoValida_(dados.dataInicio);
  const dataFim = dataIsoValida_(dados.dataFim);

  if (!nome) {
    throw new Error('Informe o nome do campeonato.');
  }

  if (dados.dataInicio && !dataInicio) {
    throw new Error('Informe uma data inicial válida no formato AAAA-MM-DD.');
  }

  if (dados.dataFim && !dataFim) {
    throw new Error('Informe uma data final válida no formato AAAA-MM-DD.');
  }

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new Error('A data inicial não pode ser maior que a data final.');
  }

  if (CAMPEONATOS_MODALIDADES.indexOf(modalidade) === -1) {
    throw new Error('Escolha uma modalidade válida.');
  }

  if (CAMPEONATOS_STATUS.indexOf(status) === -1) {
    throw new Error('Escolha um status válido.');
  }

  if (CAMPEONATOS_VISIBILIDADES.indexOf(visibilidade) === -1) {
    throw new Error('Escolha uma visibilidade válida.');
  }

  return salvarCampeonatoValidado_(Object.assign({}, dados, {
    nome: nome,
    temporada: temporada,
    modalidade: modalidade,
    status: status,
    visibilidade: visibilidade,
    descricao: descricao,
    responsavel: responsavel,
    dataInicio: dataInicio,
    dataFim: dataFim
  }), sessao, false);
}

function salvarCampeonatoValidado_(dados, sessao, apenasEstrutura) {
  const temEstrutura = Object.prototype.hasOwnProperty.call(dados, 'estrutura');
  let estruturaNova = temEstrutura ? validarEstruturaCampeonato_(dados.estrutura, '') : null;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const lista = campeonatos_();
    const idOriginal = String(dados.idOriginal || dados.id || '').trim();
    const agora = formatarDataHora_(new Date());
    const existente = idOriginal
      ? lista.reduce(function (achado, item, indice) {
          return item.id === idOriginal ? { item: item, indice: indice } : achado;
        }, null)
      : null;

    if (idOriginal && !existente) {
      throw new Error('Este campeonato não está mais na lista. Recarregue a página.');
    }

    if (temEstrutura && existente && dados.estrutura.fasesEliminatorias === undefined) {
      const estruturaAnterior = estruturaCampeonato_(existente.item.id, existente.item);
      if (estruturaAnterior && estruturaAnterior.formato === estruturaNova.formato) {
        estruturaNova = validarEstruturaCampeonato_(Object.assign({}, dados.estrutura, {
          fasesEliminatorias: estruturaAnterior.fasesEliminatorias
        }), existente.item.id);
      }
    }

    const campos = apenasEstrutura ? existente.item : dados;
    const estrutura = temEstrutura
      ? Object.assign({}, estruturaNova, {
          campeonatoId: existente ? existente.item.id : '',
          atualizadoEm: agora,
          atualizadoPor: sessao.email
        })
      : (existente ? estruturaCampeonato_(existente.item.id, existente.item) : null);
    const registro = normalizarCampeonato_({
      id: existente ? existente.item.id : '',
      nome: campos.nome,
      temporada: campos.temporada,
      modalidade: campos.modalidade,
      status: campos.status,
      descricao: campos.descricao,
      responsavel: campos.responsavel,
      visibilidade: campos.visibilidade,
      dataInicio: campos.dataInicio,
      dataFim: campos.dataFim,
      escudo: String(dados.escudo || (existente ? existente.item.escudo : '') || '').trim(),
      criadoEm: existente ? existente.item.criadoEm : agora,
      criadoPor: existente ? existente.item.criadoPor : sessao.email,
      atualizadoEm: agora,
      atualizadoPor: sessao.email,
      revisao: Utilities.getUuid()
    }, true);

    if (estrutura) {
      estrutura.campeonatoId = registro.id;
      registro.estrutura = estrutura;
    }

    if (existente) validarAlteracaoEstruturaTabela_(registro);

    if (existente) {
      lista[existente.indice] = registro;
    } else {
      lista.push(registro);
    }

    const tela = apenasEstrutura ? montarTelaGruposRodadas_(lista) : montarTelaCampeonatos_(lista, sessao);
    prepararHistoricoElenco_();
    gravarCampeonatos_(lista);
    tela.recado = apenasEstrutura
      ? 'Grupos e rodadas atualizados para ' + registro.nome + '.'
      : (existente ? 'Campeonato atualizado: ' : 'Campeonato incluído: ') + registro.nome;
    return tela;
  } finally {
    lock.releaseLock();
  }
}

function removerCampeonato(id) {
  const sessao = sessaoCampeonato_();

  if (sessao.usuario.perfil !== 'admin') {
    throw new Error('Somente o Administrador pode excluir campeonatos.');
  }

  const idAlvo = String(id || '').trim();

  if (!idAlvo) {
    throw new Error('Informe o campeonato que deseja excluir.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const lista = campeonatos_();
    const restante = lista.filter(function (item) {
      return item.id !== idAlvo;
    });

    if (restante.length === lista.length) {
      throw new Error('Campeonato não encontrado.');
    }

      prepararHistoricoElenco_(null, null, elencosParticionadosCutoverAtivo_() ? idAlvo : null);
      if (elencosParticionadosCutoverAtivo_()) {
        const props = PropertiesService.getScriptProperties();
        props.setProperty(chaveRemocaoElencosParticionados_(idAlvo), JSON.stringify({
          versao: 1, campeonatoId: idAlvo, removidoEm: new Date().toISOString()
        }));
        invalidarIndiceValidacao_(idAlvo);
        marcarHistoricoElencoPendente_(idAlvo);
      }
      try { gravarCampeonatos_(restante); }
      catch (causa) {
        if (!elencosParticionadosCutoverAtivo_()) throw causa;
        const erro = new Error('Nao foi possivel confirmar a exclusao logica do campeonato. '
          + 'Recarregue antes de repetir; os arquivos e o historico foram preservados.');
        erro.cause = causa;
        throw erro;
      }
      if (!elencosParticionadosCutoverAtivo_()) {
        PropertiesService.getScriptProperties().deleteProperty(CAMPEONATO_ESTRUTURA_CHAVE + idAlvo);
        PropertiesService.getScriptProperties().deleteProperty(CAMPEONATO_TIMES_CHAVE + idAlvo);
        removerCadastroPessoasCampeonato_(idAlvo);
        removerCadastroTabelaCampeonato_(idAlvo);
        PropertiesService.getScriptProperties().deleteProperty(CAMPEONATO_COMISSAO_CHAVE + idAlvo);
      }
      limparIndiceValidacaoRemovido_(idAlvo);

     const tela = montarTelaCampeonatos_(restante, sessao);
     tela.recado = 'Campeonato removido com sucesso.';
     return tela;
  } finally {
    lock.releaseLock();
  }
}

function chaveEstruturaCampeonato_(campeonatoId) {
  return CAMPEONATO_ESTRUTURA_CHAVE + String(campeonatoId || '').trim();
}

function campeonatosResumo_() {
  return campeonatos_().map(function (item) {
    return {
      id: item.id,
      nome: item.nome,
      temporada: item.temporada,
      status: item.status
    };
  });
}

function estruturaCampeonato_(campeonatoId, campeonato) {
  const item = campeonato || campeonatos_().filter(function (registro) {
    return registro.id === campeonatoId;
  })[0];

  if (item && Object.prototype.hasOwnProperty.call(item, 'estrutura')) {
    return validarEstruturaCampeonato_(item.estrutura, campeonatoId);
  }

  const chave = chaveEstruturaCampeonato_(campeonatoId);
  const bruto = PropertiesService.getScriptProperties().getProperty(chave);
  if (bruto === null) {
    return null;
  }

  let estrutura;
  try {
    estrutura = JSON.parse(bruto);
  } catch (e) {
    throw new Error('A forma de disputa do campeonato ' + campeonatoId + ' contém JSON inválido. Restaure os dados antes de continuar.');
  }
  return validarEstruturaCampeonato_(estrutura, campeonatoId);
}

function listarGruposRodadas() {
  sessaoCampeonato_();
  return montarTelaGruposRodadas_(campeonatos_());
}

function montarTelaGruposRodadas_(lista) {
  const campeonatos = lista.map(function (item) {
    return { id: item.id, nome: item.nome, temporada: item.temporada, status: item.status };
  });
  const estruturas = lista.map(function (campeonato) {
    const estrutura = estruturaCampeonato_(campeonato.id, campeonato);

    return {
      campeonatoId: campeonato.id,
      campeonatoNome: campeonato.nome,
      temporada: campeonato.temporada,
      status: campeonato.status,
      faseNome: estrutura ? estrutura.faseNome : '',
      formato: estrutura ? estrutura.formato : '',
      grupos: estrutura ? estrutura.grupos : 0,
      vagasPorGrupo: estrutura ? estrutura.vagasPorGrupo : 0,
      rodadas: estrutura ? estrutura.rodadas : 0,
      idaVolta: estrutura ? estrutura.idaVolta : false,
      fasesEliminatorias: estrutura ? estrutura.fasesEliminatorias : [],
      observacoes: estrutura ? estrutura.observacoes : '',
      atualizadoEm: estrutura ? estrutura.atualizadoEm : '',
      atualizadoPor: estrutura ? estrutura.atualizadoPor : ''
    };
  });

  return {
    campeonatos: campeonatos,
    formatos: CAMPEONATO_FORMATOS_FASE.map(function (valor) {
      return { id: valor, nome: valor };
    }),
    registros: estruturas,
    podeEditar: true
  };
}

function salvarGruposRodadas(payload) {
  const sessao = sessaoCampeonato_();
  const dados = payload || {};
  const campeonatoId = String(dados.campeonatoId || '').trim();

  if (!campeonatoId) {
    throw new Error('Escolha um campeonato válido para configurar.');
  }

  return salvarCampeonatoValidado_({
    idOriginal: campeonatoId,
    estrutura: dados
  }, sessao, true);
}

function validarEstruturaCampeonato_(dados, campeonatoId) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new Error('A forma de disputa do campeonato está inválida. Restaure os dados antes de continuar.');
  }

  const faseNome = limparCampo_(dados.faseNome || 'Classificação', 80);
  const formato = String(dados.formato || '').trim();
  const grupos = Number(dados.grupos || 0);
  const vagasPorGrupo = Number(dados.vagasPorGrupo || 0);
  const rodadas = Number(dados.rodadas || 0);
  const observacoes = limparCampo_(dados.observacoes || '', 500);

  if (!faseNome) {
    throw new Error('Informe o nome da fase ou etapa.');
  }

  if (CAMPEONATO_FORMATOS_FASE.indexOf(formato) === -1) {
    throw new Error('Escolha um formato válido para a fase.');
  }

  if (!Number.isInteger(grupos) || grupos < 1 || grupos > 32) {
    throw new Error('A quantidade de grupos deve ficar entre 1 e 32.');
  }

  if (!Number.isInteger(vagasPorGrupo) || vagasPorGrupo < 2 || vagasPorGrupo > 64) {
    throw new Error('As vagas por grupo devem ficar entre 2 e 64.');
  }

  if (!Number.isInteger(rodadas) || rodadas < 1 || rodadas > 99) {
    throw new Error('A quantidade de rodadas deve ficar entre 1 e 99.');
  }

  const fasesEliminatorias = dados.fasesEliminatorias === undefined ? [] : dados.fasesEliminatorias;
  if (!Array.isArray(fasesEliminatorias) || fasesEliminatorias.some(function (fase, indice) {
    return TABELA_FASES_ELIMINATORIAS.indexOf(fase) === -1 || fasesEliminatorias.indexOf(fase) !== indice;
  })) {
    throw new Error('Escolha somente oitavas, quartas, semifinal e final, sem repetir fases.');
  }
  if (['Grupos corridos', 'Pontos corridos'].indexOf(formato) !== -1 && fasesEliminatorias.length) {
    throw new Error('Este formato não admite fases eliminatórias.');
  }

  return {
      campeonatoId: campeonatoId,
      faseNome: faseNome,
      formato: formato,
      grupos: grupos,
      vagasPorGrupo: vagasPorGrupo,
      rodadas: rodadas,
      idaVolta: Boolean(dados.idaVolta),
      fasesEliminatorias: TABELA_FASES_ELIMINATORIAS.filter(function (fase) {
        return fasesEliminatorias.indexOf(fase) !== -1;
      }),
      observacoes: observacoes,
      atualizadoEm: String(dados.atualizadoEm || ''),
      atualizadoPor: String(dados.atualizadoPor || '')
  };
}

 /******************************************************
  * TABELA E CLASSIFICAÇÃO
  ******************************************************/

function arquivoTabelaCampeonato_(id) {
  return arquivoCadastroPessoasCampeonato_(id, 'Tabela');
}

function chaveTabelaCampeonato_(id) {
  return 'aeuv.tabela.campeonato.' + id;
}

function criteriosPadraoTabela_() {
  return { pontosVitoria: 3, pontosEmpate: 1, pontosDerrota: 0, desempates: TABELA_DESEMPATES.slice(0, 3) };
}

function inteiroTabela_(valor, minimo, maximo, nome) {
  if ((typeof valor !== 'number' && typeof valor !== 'string')
      || String(valor).trim() === '' || !Number.isInteger(Number(valor))
      || Number(valor) < minimo || Number(valor) > maximo) {
    throw new Error(nome + ' deve ser um inteiro entre ' + minimo + ' e ' + maximo + '.');
  }
  return Number(valor);
}

function validarCriteriosTabela_(dados) {
  if (!dados || !Array.isArray(dados.desempates) || dados.desempates.some(function (item, indice) {
    return TABELA_DESEMPATES.indexOf(item) === -1 || dados.desempates.indexOf(item) !== indice;
  }) || dados.desempates.length > TABELA_DESEMPATES.length) {
    throw new Error('Informe uma ordem de desempates válida, sem critérios repetidos.');
  }
  return {
    pontosVitoria: inteiroTabela_(dados.pontosVitoria, 0, 999, 'Pontos por vitória'),
    pontosEmpate: inteiroTabela_(dados.pontosEmpate, 0, 999, 'Pontos por empate'),
    pontosDerrota: inteiroTabela_(dados.pontosDerrota, 0, 999, 'Pontos por derrota'),
    desempates: dados.desempates.slice()
  };
}

function lerDocumentoTabela_(arquivo, chave, padrao) {
  const lista = lerListaCadastroDrive_(arquivo, chave);
  if (!lista.length) {
    // Uma lista vazia já armazenada indica corrupção, não uma tabela ainda não criada.
    const arquivos = pastaRaizProjeto_().getFilesByName(arquivo);
    if (arquivos.hasNext() || PropertiesService.getScriptProperties().getProperty(chave) !== null) {
      throw new Error('O cadastro ' + arquivo + ' está inválido. Restaure os dados antes de continuar.');
    }
    return padrao;
  }
  const doc = lista[0];
  if (lista.length !== 1 || !doc || doc.schema !== 'aeuv.tabela' || doc.versao !== 1
      || typeof doc.revisao !== 'string' || !doc.revisao) {
    throw new Error('O cadastro ' + arquivo + ' tem uma versão ou estrutura inválida.');
  }
  return doc;
}

function idsUnicosTabela_(lista, nome) {
  if (!Array.isArray(lista)) throw new Error('O cadastro de ' + nome + ' está inválido.');
  const ids = {};
  lista.forEach(function (item) {
    if (!item || typeof item.id !== 'string' || !item.id || ids[item.id]) {
      throw new Error('O cadastro de ' + nome + ' contém identificadores inválidos ou repetidos.');
    }
    ids[item.id] = true;
  });
}

function lerTabelaCampeonato_(id) {
  const doc = lerDocumentoTabela_(arquivoTabelaCampeonato_(id), chaveTabelaCampeonato_(id), {
    schema: 'aeuv.tabela', versao: 1, revisao: 'inicial', campeonatoId: id,
    grupos: [], jogos: [], criterios: criteriosPadraoTabela_()
  });
  if (doc.campeonatoId !== id) throw new Error('A tabela pertence a outro campeonato.');
  idsUnicosTabela_(doc.grupos, 'grupos');
  idsUnicosTabela_(doc.jogos, 'jogos');
  doc.grupos.forEach(function (grupo) {
    if (!Array.isArray(grupo.equipeIds) || grupo.equipeIds.some(function (equipeId) {
      return typeof equipeId !== 'string' || !equipeId;
    })) throw new Error('As equipes dos grupos estão inválidas.');
  });
  doc.criterios = validarCriteriosTabela_(doc.criterios);
  if (!Object.prototype.hasOwnProperty.call(doc, 'desempatesOrganizacao')) doc.desempatesOrganizacao = [];
  if (!Array.isArray(doc.desempatesOrganizacao)) throw new Error('As decisões de organização da tabela estão inválidas.');
  const decisoes = new Set();
  doc.desempatesOrganizacao.forEach(function (decisao) {
    if (!decisao || typeof decisao.escopo !== 'string' || !decisao.escopo.trim()
        || typeof decisao.assinaturaEmpate !== 'string' || !decisao.assinaturaEmpate
        || !Array.isArray(decisao.equipeIds) || !decisao.equipeIds.length
        || decisao.equipeIds.some(function (equipeId) {
          return typeof equipeId !== 'string' || !equipeId || equipeId !== equipeId.trim();
        })
        || new Set(decisao.equipeIds).size !== decisao.equipeIds.length
        || typeof decisao.motivo !== 'string' || !decisao.motivo.trim() || decisao.motivo.length > 1000
        || typeof decisao.registradoEm !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(decisao.registradoEm)
        || !Number.isFinite(Date.parse(decisao.registradoEm))
        || typeof decisao.registradoPor !== 'string' || !decisao.registradoPor.trim()) {
      throw new Error('As decisões de organização da tabela estão inválidas.');
    }
    const chave = JSON.stringify([decisao.escopo, decisao.assinaturaEmpate]);
    if (decisoes.has(chave)) throw new Error('As decisões de organização da tabela contêm duplicatas.');
    decisoes.add(chave);
  });
  return doc;
}

function lerCamposTabela_() {
  const doc = lerDocumentoTabela_(TABELA_CAMPOS_ARQUIVO, TABELA_CAMPOS_CHAVE, {
    schema: 'aeuv.tabela', versao: 1, revisao: 'inicial', campos: []
  });
  idsUnicosTabela_(doc.campos, 'campos');
  doc.campos.forEach(function (campo) {
    if (typeof campo.nome !== 'string' || !campo.nome.trim()
        || typeof campo.endereco !== 'string' || typeof campo.ativo !== 'boolean') {
      throw new Error('O cadastro de campos está inválido.');
    }
  });
  return doc;
}

function esqueletoTabela_(estrutura) {
  const grupos = [];
  const fases = [];
  if (!estrutura) return { grupos: grupos, fases: fases };
  if (estrutura.formato !== 'Mata-mata') {
    fases.push({ id: 'fase-classificacao', nome: estrutura.faseNome, tipo: 'classificacao', rodadas: estrutura.rodadas });
  }
  if (estrutura.formato.indexOf('Grupos') === 0) {
    for (let i = 1; i <= estrutura.grupos; i++) {
      grupos.push({ id: 'grupo-' + i, nome: 'Grupo ' + i, equipeIds: [] });
    }
  }
  if (['Mata-mata', 'Grupos + mata-mata'].indexOf(estrutura.formato) !== -1) {
    const nomes = { oitavas: 'Oitavas de final', quartas: 'Quartas de final', semifinal: 'Semifinal', final: 'Final' };
    TABELA_FASES_ELIMINATORIAS.forEach(function (chave) {
      if (estrutura.fasesEliminatorias.indexOf(chave) !== -1) {
        fases.push({ id: 'fase-' + chave, nome: nomes[chave], tipo: 'eliminatoria', rodadas: estrutura.idaVolta ? 2 : 1 });
      }
    });
  }
  return { grupos: grupos, fases: fases };
}

function equipesTabela_(id, lockJaAdquirido) {
  const nomes = timesCampeonato_(id).map(chaveEquipe_);
  const ativas = obterEquipes_().map(chaveEquipe_);
  return equipesRegistro_(lockJaAdquirido).filter(function (item) {
    return nomes.indexOf(chaveEquipe_(item.nome)) !== -1 && ativas.indexOf(chaveEquipe_(item.nome)) !== -1;
  }).map(function (item) { return { id: item.id, nome: item.nome, escudo: item.escudo || '' }; });
}

function gruposTabela_(doc, esqueleto, equipes, estrutura) {
  const usados = {};
  doc.grupos.forEach(function (grupo) {
    if (!esqueleto.grupos.some(function (item) { return item.id === grupo.id; }) && grupo.equipeIds.length) {
      throw new Error('A nova configuração removeria grupos com equipes. Esvazie os grupos antes de alterar o formato.');
    }
  });
  return esqueleto.grupos.map(function (grupo) {
    const salvo = doc.grupos.find(function (item) { return item.id === grupo.id; });
    const ids = salvo ? salvo.equipeIds.slice() : [];
    if (ids.length > estrutura.vagasPorGrupo) throw new Error('O grupo excede as vagas configuradas.');
    ids.forEach(function (id) {
      if (usados[id] || !equipes.some(function (item) { return item.id === id; })) {
        throw new Error('As equipes dos grupos devem estar vinculadas e não podem repetir.');
      }
      usados[id] = true;
    });
    return { id: grupo.id, nome: grupo.nome, equipeIds: ids };
  });
}

function validarJogoTabela_(dados, contexto, existente) {
  const fase = contexto.fases.find(function (item) { return item.id === dados.faseId; });
  if (!fase) throw new Error('Escolha uma fase configurada no campeonato.');
  const rodada = inteiroTabela_(dados.rodada, 1, fase.rodadas, 'Rodada');
  if (typeof dados.mandanteId !== 'string' || typeof dados.visitanteId !== 'string'
      || dados.mandanteId === dados.visitanteId || !contexto.equipes.some(function (item) { return item.id === dados.mandanteId; })
      || !contexto.equipes.some(function (item) { return item.id === dados.visitanteId; })) {
    throw new Error('Escolha duas equipes distintas, ativas e vinculadas ao campeonato.');
  }
  const grupoId = String(dados.grupoId || '');
  if (fase.tipo === 'classificacao' && contexto.grupos.length) {
    const grupo = contexto.grupos.find(function (item) { return item.id === grupoId; });
    if (!grupo || grupo.equipeIds.indexOf(dados.mandanteId) === -1 || grupo.equipeIds.indexOf(dados.visitanteId) === -1) {
      throw new Error('As duas equipes devem pertencer ao grupo escolhido.');
    }
  } else if (grupoId) throw new Error('Esta fase não admite grupo.');
  const campo = contexto.campos.find(function (item) { return item.id === dados.campoId; });
  if (!campo || (!campo.ativo && (!existente || existente.campoId !== campo.id))) {
    throw new Error('Escolha um campo ativo do cadastro.');
  }
  const data = typeof dados.data === 'string' ? dataIsoValida_(dados.data) : '';
  const hora = typeof dados.hora === 'string' ? dados.hora : '';
  if (!data || data !== dados.data || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    throw new Error('Informe uma data real (AAAA-MM-DD) e horário válido (HH:mm).');
  }
  if (['agendado', 'encerrado', 'adiado', 'cancelado'].indexOf(dados.status) === -1) {
    throw new Error('Escolha um status válido para o jogo.');
  }
  const golsMandante = dados.status === 'encerrado' ? inteiroTabela_(dados.golsMandante, 0, 999, 'Gols do mandante') : null;
  const golsVisitante = dados.status === 'encerrado' ? inteiroTabela_(dados.golsVisitante, 0, 999, 'Gols do visitante') : null;
  if (contexto.jogos.some(function (item) {
    return item.id !== (existente ? existente.id : '') && item.faseId === fase.id && item.grupoId === grupoId
      && item.rodada === rodada && item.mandanteId === dados.mandanteId && item.visitanteId === dados.visitanteId;
  })) throw new Error('Este confronto já existe nesta fase, grupo e rodada.');
  const jogo = {
    id: existente ? existente.id : Utilities.getUuid(), faseId: fase.id, grupoId: grupoId, rodada: rodada,
    mandanteId: dados.mandanteId, visitanteId: dados.visitanteId, campoId: campo.id,
    data: data, hora: hora, status: dados.status, golsMandante: golsMandante, golsVisitante: golsVisitante
  };
  if (Object.prototype.hasOwnProperty.call(dados, 'resultado')) {
    validarResultadoSalvoTabela_(dados.resultado, jogo);
    jogo.resultado = dados.resultado;
  }
  return jogo;
}

function contextoTabela_(id, lista, lockJaAdquirido, recursos) {
  const campeonato = lista.find(function (item) { return item.id === id; });
  if (!campeonato) throw new Error('Campeonato não encontrado.');
  const estrutura = estruturaCampeonato_(id, campeonato);
  const doc = lerTabelaCampeonato_(id);
  const camposDoc = recursos ? recursos.camposDoc : lerCamposTabela_();
  const nomes = recursos ? timesCampeonato_(id).map(chaveEquipe_) : [];
  const equipes = recursos ? recursos.registro.filter(function (item) {
    return nomes.indexOf(chaveEquipe_(item.nome)) !== -1 && recursos.ativas.indexOf(chaveEquipe_(item.nome)) !== -1;
  }).map(function (item) { return { id: item.id, nome: item.nome, escudo: item.escudo || '' }; })
    : equipesTabela_(id, lockJaAdquirido);
  const esqueleto = esqueletoTabela_(estrutura);
  const contexto = {
    campeonato: campeonato, estrutura: estrutura, doc: doc, camposDoc: camposDoc,
    equipes: equipes, fases: esqueleto.fases,
    grupos: gruposTabela_(doc, esqueleto, equipes, estrutura), campos: camposDoc.campos,
    jogos: doc.jogos, criterios: doc.criterios
  };
  doc.jogos.forEach(function (jogo) {
    const normalizado = validarJogoTabela_(jogo, contexto, jogo);
    Object.keys(normalizado).forEach(function (chave) {
      if (chave !== 'resultado' && normalizado[chave] !== jogo[chave]) {
        throw new Error('O cadastro do jogo ' + jogo.id + ' está inválido.');
      }
    });
  });
  return contexto;
}

function revisaoTabela_(contexto) {
  // Invalida formulários abertos após alterações globais de campos, estrutura ou participantes.
  return JSON.stringify([
    contexto.doc.revisao, contexto.camposDoc.revisao, contexto.campeonato.revisao || '',
    contexto.estrutura, contexto.equipes.map(function (equipe) { return equipe.id; })
  ]);
}

function assinaturaEmpateTabela_(escopo, equipeIds, jogos, criterios) {
  const partidas = jogos.filter(function (jogo) {
    return jogo.faseId === 'fase-classificacao' && jogo.status === 'encerrado'
      && (escopo.id === 'geral' || jogo.grupoId === escopo.id);
  }).map(function (jogo) {
    const eventos = jogo.resultado && Array.isArray(jogo.resultado.equipes) ? jogo.resultado.equipes : [];
    const snapshots = eventos.map(function (equipe) {
      return {
        id: equipe.id,
        atletas: (equipe.atletas || []).map(function (pessoa) {
          return [pessoa.id, pessoa.gols || 0, pessoa.golsContra || 0, pessoa.amarelos || 0, pessoa.vermelho === true];
        }).sort(function (a, b) { return String(a[0]).localeCompare(String(b[0])); }),
        comissao: (equipe.comissao || []).map(function (pessoa) {
          return [pessoa.id, pessoa.amarelos || 0, pessoa.vermelho === true];
        }).sort(function (a, b) { return String(a[0]).localeCompare(String(b[0])); })
      };
    }).sort(function (a, b) { return a.id.localeCompare(b.id); });
    return [jogo.id, jogo.grupoId || '', jogo.mandanteId, jogo.visitanteId,
      jogo.golsMandante, jogo.golsVisitante, snapshots];
  }).sort(function (a, b) { return String(a[0]).localeCompare(String(b[0])); });
  const material = JSON.stringify(['aeuv-empate-v1', escopo.id,
    (escopo.equipeIds || []).slice().sort(), escopo.contexto || null,
    equipeIds.slice().sort(), criterios, partidas]);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, material);
  return 'sha256:' + digest.map(function (byte) {
    const valor = byte < 0 ? byte + 256 : byte;
    return (valor < 16 ? '0' : '') + valor.toString(16);
  }).join('');
}

function resultadoClassificacaoTabela_(equipes, jogos, criterios, escopo, decisoes) {
  const linhas = equipes.map(function (equipe) {
    return { posicao: 0, equipeId: equipe.id, equipeNome: equipe.nome, escudo: equipe.escudo,
      pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0,
      saldoGols: 0, amarelos: 0, vermelhos: 0, aproveitamento: 0 };
  });
  const porId = {};
  linhas.forEach(function (linha) { porId[linha.equipeId] = linha; });
  const jogosClassificacao = [];
  jogos.forEach(function (jogo) {
    if (jogo.faseId !== 'fase-classificacao' || jogo.status !== 'encerrado'
        || (escopo.id !== 'geral' && jogo.grupoId !== escopo.id)) return;
    const mandante = porId[jogo.mandanteId];
    const visitante = porId[jogo.visitanteId];
    if (!mandante || !visitante) return;
    jogosClassificacao.push(jogo);
    [[mandante, jogo.golsMandante, jogo.golsVisitante], [visitante, jogo.golsVisitante, jogo.golsMandante]].forEach(function (item) {
      const linha = item[0];
      linha.jogos++;
      linha.golsPro += item[1];
      linha.golsContra += item[2];
      if (item[1] > item[2]) { linha.vitorias++; linha.pontos += criterios.pontosVitoria; }
      else if (item[1] === item[2]) { linha.empates++; linha.pontos += criterios.pontosEmpate; }
      else { linha.derrotas++; linha.pontos += criterios.pontosDerrota; }
    });
    [jogo.mandanteId, jogo.visitanteId].forEach(function (id) {
      const linha = porId[id];
      const equipe = jogo.resultado && Array.isArray(jogo.resultado.equipes)
        ? jogo.resultado.equipes.find(function (item) { return item.id === id; }) : null;
      ['atletas', 'comissao'].forEach(function (tipo) {
        (equipe && Array.isArray(equipe[tipo]) ? equipe[tipo] : []).forEach(function (pessoa) {
          linha.amarelos += Number.isInteger(pessoa.amarelos) ? pessoa.amarelos : 0;
          if (pessoa.vermelho === true) linha.vermelhos++;
        });
      });
    });
  });
  linhas.forEach(function (linha) {
    linha.saldoGols = linha.golsPro - linha.golsContra;
    linha.aproveitamento = linha.jogos && criterios.pontosVitoria
      ? Math.round(linha.pontos * 10000 / (linha.jogos * criterios.pontosVitoria)) / 100 : 0;
  });
  let buckets = [];
  const porPontos = {};
  linhas.forEach(function (linha) {
    const chave = String(linha.pontos);
    (porPontos[chave] = porPontos[chave] || []).push(linha);
  });
  Object.keys(porPontos).sort(function (a, b) { return Number(b) - Number(a); })
    .forEach(function (chave) { buckets.push(porPontos[chave]); });
  criterios.desempates.forEach(function (criterio) {
    buckets = buckets.reduce(function (resultado, bucket) {
      if (criterio === 'confrontoDireto') {
        if (bucket.length !== 2) { resultado.push(bucket); return resultado; }
        const ids = bucket.map(function (linha) { return linha.equipeId; });
        const confrontos = jogosClassificacao.filter(function (jogo) {
          return ids.indexOf(jogo.mandanteId) !== -1 && ids.indexOf(jogo.visitanteId) !== -1;
        });
        if (!confrontos.length) { resultado.push(bucket); return resultado; }
        const diretos = {};
        ids.forEach(function (id) { diretos[id] = 0; });
        confrontos.forEach(function (jogo) {
          if (jogo.golsMandante > jogo.golsVisitante) {
            diretos[jogo.mandanteId] += criterios.pontosVitoria;
            diretos[jogo.visitanteId] += criterios.pontosDerrota;
          } else if (jogo.golsMandante < jogo.golsVisitante) {
            diretos[jogo.visitanteId] += criterios.pontosVitoria;
            diretos[jogo.mandanteId] += criterios.pontosDerrota;
          }
          else {
            diretos[jogo.mandanteId] += criterios.pontosEmpate;
            diretos[jogo.visitanteId] += criterios.pontosEmpate;
          }
        });
        const particoes = {};
        bucket.forEach(function (linha) {
          const chave = String(diretos[linha.equipeId]);
          (particoes[chave] = particoes[chave] || []).push(linha);
        });
        Object.keys(particoes).sort(function (a, b) { return Number(b) - Number(a); })
          .forEach(function (chave) { resultado.push(particoes[chave]); });
        return resultado;
      }
      const particoes = {};
      bucket.forEach(function (linha) {
        const chave = String(linha[criterio]);
        (particoes[chave] = particoes[chave] || []).push(linha);
      });
      const ascendente = TABELA_DESEMPATES_ASC.indexOf(criterio) !== -1;
      Object.keys(particoes).sort(function (a, b) {
        return (Number(a) - Number(b)) * (ascendente ? 1 : -1);
      }).forEach(function (chave) { resultado.push(particoes[chave]); });
      return resultado;
    }, []);
  });

  const empates = [];
  const ranqueados = [];
  buckets.forEach(function (bucket) {
    if (bucket.length < 2) { ranqueados.push({ bucket: bucket, decisao: false }); return; }
    const assinatura = assinaturaEmpateTabela_(escopo, bucket.map(function (linha) {
      return linha.equipeId;
    }), jogosClassificacao, criterios);
    const decisao = (decisoes || []).find(function (item) {
      return item.escopo === escopo.id && item.assinaturaEmpate === assinatura
        && item.equipeIds.length === bucket.length
        && item.equipeIds.every(function (id) {
          return bucket.some(function (linha) { return linha.equipeId === id; });
        });
    }) || null;
    empates.push({
      escopo: escopo.id, escopoNome: escopo.nome, assinaturaEmpate: assinatura,
      equipes: bucket.map(function (linha) { return { id: linha.equipeId, nome: linha.equipeNome }; }),
      decisao: decisao ? {
        equipeIds: decisao.equipeIds.slice(), motivo: decisao.motivo,
        registradoEm: decisao.registradoEm, registradoPor: decisao.registradoPor
      } : null
    });
    if (decisao) {
      const porEquipe = {};
      bucket.forEach(function (linha) { porEquipe[linha.equipeId] = linha; });
      ranqueados.push({ bucket: decisao.equipeIds.map(function (id) { return porEquipe[id]; }), decisao: true });
    } else {
      bucket.sort(function (a, b) { return a.equipeNome.localeCompare(b.equipeNome, 'pt-BR'); });
      ranqueados.push({ bucket: bucket, decisao: false });
    }
  });
  let proximaPosicao = 1;
  ranqueados.forEach(function (grupo) {
    grupo.bucket.forEach(function (linha, indice) {
      linha.posicao = grupo.decisao ? proximaPosicao + indice : proximaPosicao;
    });
    proximaPosicao += grupo.bucket.length;
  });
  return {
    linhas: linhas.slice().sort(function (a, b) {
      return a.posicao - b.posicao || a.equipeNome.localeCompare(b.equipeNome, 'pt-BR');
    }),
    empates: empates
  };
}

function calcularClassificacaoTabela_(equipes, jogos, criterios, escopo, decisoes) {
  return resultadoClassificacaoTabela_(equipes, jogos, criterios,
    escopo || { id: 'geral', nome: 'Classificação geral' }, decisoes).linhas;
}

function montarTelaTabela_(lista, contexto) {
  const criterios = contexto ? contexto.criterios : criteriosPadraoTabela_();
  const equipes = contexto ? contexto.equipes : [];
  const jogos = contexto ? contexto.jogos : [];
  const grupos = contexto ? contexto.grupos : [];
  const temClassificacao = contexto && contexto.fases.some(function (fase) { return fase.tipo === 'classificacao'; });
  const resultadoGeral = temClassificacao ? resultadoClassificacaoTabela_(equipes, jogos, criterios,
    { id: 'geral', nome: 'Classificação geral', equipeIds: equipes.map(function (item) { return item.id; }),
      contexto: grupos.map(function (grupo) { return [grupo.id, grupo.equipeIds.slice().sort()]; }) },
    contexto.doc.desempatesOrganizacao) : { linhas: [], empates: [] };
  const resultadoGrupos = grupos.map(function (grupo) {
    const grupoEquipes = equipes.filter(function (equipe) { return grupo.equipeIds.indexOf(equipe.id) !== -1; });
    const resultado = resultadoClassificacaoTabela_(grupoEquipes, jogos, criterios,
      { id: grupo.id, nome: grupo.nome, equipeIds: grupo.equipeIds },
      contexto.doc.desempatesOrganizacao);
    return { grupoId: grupo.id, nome: grupo.nome, linhas: resultado.linhas, empatesOrganizacao: resultado.empates };
  });
  const avisosLegado = [];
  if (contexto) {
    jogos.forEach(function (jogo) {
      if (jogo.faseId !== 'fase-classificacao' || jogo.status !== 'encerrado') return;
      if (!jogo.resultado || !Array.isArray(jogo.resultado.equipes)
          || jogo.resultado.equipes.some(function (item) {
            return !Array.isArray(item.atletas) || !Array.isArray(item.comissao)
              || item.atletas.concat(item.comissao).some(function (pessoa) {
                return !Number.isInteger(pessoa.amarelos) || typeof pessoa.vermelho !== 'boolean';
              });
          })) {
        avisosLegado.push('O jogo ' + jogo.id
          + ' não possui todos os snapshots de cartões; cartões históricos ausentes foram considerados zero.');
      }
    });
  }
  return {
    campeonatos: lista.map(function (item) { return { id: item.id, nome: item.nome, temporada: item.temporada, status: item.status }; }),
    campeonatoId: contexto ? contexto.campeonato.id : '',
    campeonato: contexto ? { id: contexto.campeonato.id, nome: contexto.campeonato.nome,
      temporada: contexto.campeonato.temporada, status: contexto.campeonato.status } : null,
    estrutura: contexto ? contexto.estrutura : null, grupos: grupos, fases: contexto ? contexto.fases : [],
    equipes: equipes, campos: contexto ? contexto.campos : lerCamposTabela_().campos,
    // Os snapshots permanecem no Drive e nos endpoints de resultado, nao na lista de jogos.
    jogos: jogos.map(function (jogo) {
      const resumo = Object.assign({}, jogo);
      delete resumo.resultado;
      return resumo;
    }), criterios: criterios,
    criterioOpcoes: TABELA_CRITERIO_OPCOES.map(function (item) { return { id: item.id, nome: item.nome }; }),
    avisos: avisosLegado,
    empatesOrganizacao: resultadoGeral.empates.concat.apply(resultadoGeral.empates,
      resultadoGrupos.map(function (grupo) { return grupo.empatesOrganizacao; })),
    classificacao: {
      geral: resultadoGeral.linhas.map(resumirLinhaClassificacao_),
      empatesOrganizacao: resultadoGeral.empates,
      grupos: resultadoGrupos.map(function (grupo) {
        return Object.assign({}, grupo, { linhas: grupo.linhas.map(resumirLinhaClassificacao_) });
      })
    },
    revisao: contexto ? revisaoTabela_(contexto) : '', podeEditar: true
  };
}

function resumirLinhaClassificacao_(linha) {
  const resumo = Object.assign({}, linha);
  // O cliente resolve o escudo pelo equipeId na colecao unica de equipes.
  delete resumo.escudo;
  return resumo;
}

function carregarTabelaCampeonatoAtual(campeonatoId) {
  sessaoCampeonato_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lista = campeonatos_();
    const id = String(campeonatoId || '').trim() || (lista.length ? lista[0].id : '');
    const recursos = recursosTabelaCampeonato_(true);
    return respostaEsportivaAtual_(montarTelaTabela_(lista, id ? contextoTabela_(id, lista, true, recursos) : null));
  } finally { lock.releaseLock(); }
}

function recursosTabelaCampeonato_(garantirRegistro) {
  return { camposDoc: lerCamposTabela_(),
    registro: garantirRegistro ? equipesRegistro_(true) : lerRegistroEquipes_(),
    ativas: obterEquipes_().map(chaveEquipe_) };
}

function listarSumulasCampeonato() {
  sessaoCampeonato_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lista = campeonatos_(), recursos = recursosTabelaCampeonato_();
    const jogos = [];
    const equipes = {};
    lista.forEach(function (campeonato) {
      const contexto = contextoTabela_(campeonato.id, lista, true, recursos);
      contexto.jogos.forEach(function (jogo) {
        if (jogo.status !== 'encerrado' || !jogo.resultado) return;
        [jogo.mandanteId, jogo.visitanteId].forEach(function (id) {
          equipes[id] = contexto.equipes.find(function (item) { return item.id === id; });
        });
        jogos.push({
          id: jogo.id, campeonatoId: campeonato.id, campeonatoNome: campeonato.nome, temporada: campeonato.temporada,
          mandanteId: jogo.mandanteId, visitanteId: jogo.visitanteId, rodada: jogo.rodada,
          faseNome: contexto.fases.find(function (item) { return item.id === jogo.faseId; }).nome,
          grupoNome: (contexto.grupos.find(function (item) { return item.id === jogo.grupoId; }) || {}).nome || '',
          campoNome: contexto.campos.find(function (item) { return item.id === jogo.campoId; }).nome,
          data: jogo.data, hora: jogo.hora, golsMandante: jogo.golsMandante, golsVisitante: jogo.golsVisitante,
          resultadoDisponivel: true
        });
      });
    });
    jogos.sort(function (a, b) { return (b.data + b.hora).localeCompare(a.data + a.hora) || a.id.localeCompare(b.id); });
    return {
      campeonatos: lista.map(function (item) { return { id: item.id, nome: item.nome, temporada: item.temporada }; }),
      equipes: Object.keys(equipes).map(function (id) { return equipes[id]; }), jogos: jogos, podeEditar: true
    };
  } finally { lock.releaseLock(); }
}

function consultarSumulaCampeonato(payload) {
  sessaoCampeonato_();
  const dados = payload || {}, lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const contexto = contextoTabela_(String(dados.campeonatoId || '').trim(), campeonatos_(), true, recursosTabelaCampeonato_());
    const jogo = contexto.jogos.find(function (item) { return item.id === dados.id; });
    if (!jogo || jogo.status !== 'encerrado' || !jogo.resultado) throw new Error('Súmula finalizada não encontrada. Atualize a lista.');
    const equipes = [jogo.mandanteId, jogo.visitanteId].map(function (id, indice) {
      const equipe = contexto.equipes.find(function (item) { return item.id === id; });
      const salvo = jogo.resultado.equipes.find(function (item) { return item.id === id; });
      const resposta = { id: id, nome: equipe.nome, escudo: equipe.escudo, lado: indice ? 'visitante' : 'mandante' };
      ['atletas', 'comissao'].forEach(function (tipo) {
        resposta[tipo] = salvo[tipo].map(function (pessoa) {
          const retorno = Object.assign({ numeroJogo: '', participou: false, golsContra: 0, amarelos: 0, vermelho: false }, pessoa);
          if (tipo === 'atletas' && retorno.vermelho === true && !retorno.vermelhoTipo) retorno.vermelhoTipo = 'direto';
          return retorno;
        });
      });
      anotarDisciplinaAutomaticaResultadoTabela_(contexto.jogos, jogo, [resposta]);
      return resposta;
    });
    return {
      campeonatoId: contexto.campeonato.id, campeonato: { id: contexto.campeonato.id, nome: contexto.campeonato.nome, temporada: contexto.campeonato.temporada },
      fase: contexto.fases.find(function (item) { return item.id === jogo.faseId; }),
      jogo: jogo, resultado: jogo.resultado, equipes: equipes, podeEditar: false,
      avisos: avisosResultadoTabela_(jogo, equipes).concat(avisosDisciplinaLegadaTabela_(contexto.jogos, jogo))
    };
  } finally { lock.releaseLock(); }
}

function mutarTabelaCampeonato_(payload, operacao, global) {
  sessaoCampeonato_();
  const dados = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lista = campeonatos_();
    const contexto = contextoTabela_(String(dados.campeonatoId || '').trim(), lista, true, recursosTabelaCampeonato_(true));
    if (typeof dados.revisao !== 'string' || dados.revisao !== revisaoTabela_(contexto)) {
      throw new Error('A tabela foi alterada. Recarregue antes de salvar novamente.');
    }
    const infracoesAntes = infracoesDisciplinaTabela_(contexto.doc.jogos);
    operacao(contexto, dados, lista);
    validarNovasInfracoesDisciplinaTabela_(infracoesAntes, contexto.doc.jogos);
    // Toda a validação precede a única operação de persistência.
    contexto.jogos = contexto.doc.jogos;
    contexto.criterios = contexto.doc.criterios;
    contexto.campos = contexto.camposDoc.campos;
    contexto.grupos = gruposTabela_(contexto.doc, esqueletoTabela_(contexto.estrutura), contexto.equipes, contexto.estrutura);
    contexto.doc.jogos.forEach(function (jogo) { validarJogoTabela_(jogo, contexto, jogo); });
    if (global) {
      contexto.camposDoc.revisao = Utilities.getUuid();
      gravarListaCadastroDrive_(TABELA_CAMPOS_ARQUIVO, TABELA_CAMPOS_CHAVE, [contexto.camposDoc]);
    } else {
      contexto.doc.revisao = Utilities.getUuid();
      gravarListaCadastroDrive_(arquivoTabelaCampeonato_(contexto.campeonato.id),
        chaveTabelaCampeonato_(contexto.campeonato.id), [contexto.doc]);
    }
    return respostaEsportivaAtual_(montarTelaTabela_(lista, contexto));
  } finally { lock.releaseLock(); }
}

function salvarJogoCampeonato(payload) {
  return mutarTabelaCampeonato_(payload, function (contexto, dados) {
    const id = String(dados.id || '').trim();
    const existente = contexto.doc.jogos.find(function (item) { return item.id === id; });
    if (id && !existente) throw new Error('Jogo não encontrado.');
    const entrada = Object.assign({}, existente || {}, dados);
    const fechado = existente && (existente.status === 'encerrado' || existente.resultado);
    ['golsMandante', 'golsVisitante', 'resultado'].forEach(function (chave) {
      if (!Object.prototype.hasOwnProperty.call(dados, chave)) return;
      const esperado = existente ? existente[chave] : (chave === 'resultado' ? undefined : null);
      if (JSON.stringify(dados[chave]) !== JSON.stringify(esperado)) {
        throw new Error('Lance ou corrija o placar pela tela de resultado, não pela edição do jogo.');
      }
    });
    if (fechado) {
      ['status', 'faseId', 'grupoId', 'mandanteId', 'visitanteId'].forEach(function (chave) {
        if (Object.prototype.hasOwnProperty.call(dados, chave) && dados[chave] !== existente[chave]) {
          throw new Error('Não é possível alterar status, fase, grupo ou equipes de um jogo encerrado.');
        }
      });
    } else if (['agendado', 'adiado', 'cancelado'].indexOf(entrada.status) === -1) {
      throw new Error('Encerre o jogo pela tela de resultado.');
    }
    const jogo = validarJogoTabela_(entrada, contexto, existente);
    if (existente) contexto.doc.jogos[contexto.doc.jogos.indexOf(existente)] = jogo;
    else contexto.doc.jogos.push(jogo);
  }, false);
}

function booleanoResultadoTabela_(valor, nome) {
  if (typeof valor !== 'boolean') throw new Error(nome + ' deve ser verdadeiro ou falso.');
  return valor;
}

function inteiroResultadoTabela_(valor, maximo, nome) {
  if (typeof valor !== 'number') throw new Error(nome + ' deve ser um número inteiro.');
  return inteiroTabela_(valor, 0, maximo, nome);
}

function eventosResultadoTabela_(dados, atleta, legado) {
  if (!dados || typeof dados !== 'object') throw new Error('Informe os eventos de cada participante.');
  const eventos = {
    participou: booleanoResultadoTabela_(dados.participou, 'Participação'),
    amarelos: inteiroResultadoTabela_(dados.amarelos, 2, 'Cartões amarelos'),
    vermelho: booleanoResultadoTabela_(dados.vermelho, 'Cartão vermelho')
  };
  if (atleta) {
    const tipoVermelho = dados.vermelhoTipo == null ? '' : dados.vermelhoTipo;
    if (eventos.vermelho && !tipoVermelho && !legado) {
      throw new Error('Informe se o cartão vermelho foi direto ou por segundo amarelo.');
    }
    if (tipoVermelho && ['direto', 'segundo-amarelo'].indexOf(tipoVermelho) === -1) {
      throw new Error('O tipo de cartão vermelho é inválido.');
    }
    if (eventos.vermelho && tipoVermelho === 'segundo-amarelo' && eventos.amarelos !== 2) {
      throw new Error('Expulsão por segundo amarelo exige dois cartões amarelos na partida.');
    }
    eventos.vermelhoTipo = eventos.vermelho ? (tipoVermelho || 'direto') : '';
    eventos.numeroJogo = dados.numeroJogo === undefined || dados.numeroJogo === ''
      ? '' : inteiroResultadoTabela_(dados.numeroJogo, 999, 'Número do atleta na partida');
    eventos.gols = inteiroResultadoTabela_(dados.gols, 999, 'Gols do atleta');
    eventos.golsContra = inteiroResultadoTabela_(dados.golsContra, 999, 'Gols contra');
  }
  return eventos;
}

function informacoesResultadoTabela_(dados, jogo) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Informe os detalhes do resultado.');
  const wo = booleanoResultadoTabela_(dados.wo, 'WO');
  const penaltis = booleanoResultadoTabela_(dados.penaltis, 'Pênaltis');
  const prorrogacao = booleanoResultadoTabela_(dados.prorrogacao, 'Prorrogação');
  if (typeof dados.woEquipeId !== 'string' || (wo && [jogo.mandanteId, jogo.visitanteId].indexOf(dados.woEquipeId) === -1)) {
    throw new Error('Informe a equipe ausente no WO.');
  }
  if (typeof dados.observacoes !== 'string' || dados.observacoes.length > 2000) {
    throw new Error('As observações devem ter no máximo 2000 caracteres.');
  }
  return {
    wo: wo, woEquipeId: wo ? dados.woEquipeId : '', prorrogacao: prorrogacao, penaltis: penaltis,
    golsPenaltisMandante: penaltis ? inteiroResultadoTabela_(dados.golsPenaltisMandante, 999, 'Pênaltis do mandante') : null,
    golsPenaltisVisitante: penaltis ? inteiroResultadoTabela_(dados.golsPenaltisVisitante, 999, 'Pênaltis do visitante') : null,
    observacoes: dados.observacoes
  };
}

function equipesResultadoValidasTabela_(equipes, jogo) {
  idsUnicosTabela_(equipes, 'equipes do resultado');
  if (equipes.length !== 2 || ![jogo.mandanteId, jogo.visitanteId].every(function (id) {
    return equipes.some(function (equipe) { return equipe.id === id; });
  })) throw new Error('Informe exatamente as duas equipes do jogo.');
  equipes.forEach(function (equipe) {
    ['atletas', 'comissao'].forEach(function (tipo) { idsUnicosTabela_(equipe[tipo], tipo + ' do resultado'); });
  });
}

function validarResultadoSalvoTabela_(resultado, jogo) {
  if (jogo.status !== 'encerrado') throw new Error('Um resultado detalhado exige jogo encerrado.');
  const info = informacoesResultadoTabela_(resultado, jogo);
  Object.keys(info).forEach(function (chave) {
    if (info[chave] !== resultado[chave]) throw new Error('O resultado armazenado está inválido.');
  });
  equipesResultadoValidasTabela_(resultado.equipes, jogo);
  const ids = new Set();
  resultado.equipes.forEach(function (equipe) {
    ['atletas', 'comissao'].forEach(function (tipo) {
      equipe[tipo].forEach(function (pessoa) {
        if (ids.has(pessoa.id) || typeof pessoa.nome !== 'string' || !pessoa.nome.trim()) {
          throw new Error('Participantes armazenados inválidos ou repetidos.');
        }
        ids.add(pessoa.id);
        const eventos = eventosResultadoTabela_(
          Object.assign({ golsContra: 0, amarelos: 0, vermelho: false, participou: false }, pessoa),
          tipo === 'atletas', true);
        Object.keys(eventos).forEach(function (chave) {
          if (chave === 'numeroJogo' && pessoa.numeroJogo === undefined) return;
          if (chave === 'participou' && tipo === 'comissao' && pessoa.participou === undefined) return;
          if (chave === 'golsContra' && pessoa.golsContra === undefined) return;
          if ((chave === 'amarelos' || chave === 'vermelho') && pessoa[chave] === undefined) return;
          if (chave === 'vermelhoTipo' && pessoa.vermelhoTipo === undefined && pessoa.vermelho !== true) return;
          if (chave === 'vermelhoTipo' && pessoa.vermelhoTipo === undefined && pessoa.vermelho === true) return;
          if (eventos[chave] !== pessoa[chave]) throw new Error('Eventos armazenados inválidos.');
        });
        if (pessoa.cpf !== undefined && typeof pessoa.cpf !== 'string') {
          throw new Error('CPF armazenado do participante inválido.');
        }
        if (tipo === 'atletas') {
          if (typeof pessoa.dataNascimento !== 'string'
              || (typeof pessoa.numero !== 'string' && typeof pessoa.numero !== 'number')
              || (typeof pessoa.numero === 'number' && !Number.isFinite(pessoa.numero))) {
            throw new Error('Identificação do atleta armazenada inválida.');
          }
        } else if (typeof pessoa.cargo !== 'string') throw new Error('Cargo armazenado inválido.');
      });
    });
  });
}

function ordemJogoDisciplinaTabela_(jogo) {
  return String(jogo.data || '') + String(jogo.hora || '') + String(jogo.id || '');
}

function aliasesDisciplinaTabela_(jogos, identidades) {
  const pais = Object.create(null);
  function raiz(alias) {
    if (!pais[alias]) pais[alias] = alias;
    if (pais[alias] !== alias) pais[alias] = raiz(pais[alias]);
    return pais[alias];
  }
  function unir(a, b) {
    const raizA = raiz(a), raizB = raiz(b);
    if (raizA !== raizB) {
      if (raizA < raizB) pais[raizB] = raizA;
      else pais[raizA] = raizB;
    }
  }
  function adicionar(equipeId, pessoa) {
    if (!pessoa.id) return;
    const id = JSON.stringify([equipeId, 'id', String(pessoa.id)]);
    raiz(id);
    const cpf = somenteDigitos_(pessoa.cpf || '');
    if (cpfValido_(cpf)) unir(id, JSON.stringify([equipeId, 'cpf', cpf]));
  }
  (jogos || []).forEach(function (partida) {
    (partida.resultado && partida.resultado.equipes || []).forEach(function (equipe) {
      (equipe.atletas || []).forEach(function (pessoa) { adicionar(equipe.id, pessoa); });
    });
  });
  (identidades || []).forEach(function (pessoa) {
    adicionar(pessoa.equipeId, pessoa);
  });
  Object.keys(pais).forEach(function (alias) { pais[alias] = raiz(alias); });
  return pais;
}

function identidadeDisciplinaTabela_(equipeId, pessoa, aliases) {
  const id = pessoa && pessoa.id ? JSON.stringify([equipeId, 'id', String(pessoa.id)]) : '';
  const cpf = somenteDigitos_(pessoa && pessoa.cpf || '');
  const cpfAlias = cpfValido_(cpf) ? JSON.stringify([equipeId, 'cpf', cpf]) : '';
  return (id && aliases[id]) || (cpfAlias && aliases[cpfAlias]) || id || cpfAlias;
}

function calcularDisciplinaAutomaticaTabela_(jogos, antesDe, identidades) {
  const partidas = (jogos || []).filter(function (jogo) {
    return jogo.status === 'encerrado' && jogo.resultado && Array.isArray(jogo.resultado.equipes)
      && (!antesDe || ordemJogoDisciplinaTabela_(jogo) < ordemJogoDisciplinaTabela_(antesDe));
  }).slice().sort(function (a, b) {
    return ordemJogoDisciplinaTabela_(a).localeCompare(ordemJogoDisciplinaTabela_(b));
  });
  const aliases = aliasesDisciplinaTabela_(partidas, identidades);
  const estados = Object.create(null), infracoes = [];
  function chaveEstado(equipeId, pessoa) {
    return JSON.stringify([equipeId, identidadeDisciplinaTabela_(equipeId, pessoa, aliases)]);
  }
  partidas.forEach(function (jogo) {
    [jogo.mandanteId, jogo.visitanteId].forEach(function (equipeId) {
      const eventosEquipe = jogo.resultado.equipes.find(function (item) { return item.id === equipeId; });
      if (!eventosEquipe || !Array.isArray(eventosEquipe.atletas)) return;
      eventosEquipe.atletas.forEach(function (pessoa) {
        const chave = chaveEstado(equipeId, pessoa);
        const estado = estados[chave] || (estados[chave] = { amarelos: 0, pendencias: [] });
        const motivosAntes = estado.pendencias.slice();
        if (motivosAntes.length && pessoa.participou === true) {
          infracoes.push({
            jogoId: jogo.id, equipeId: equipeId, identidade: chave,
            atletaId: String(pessoa.id || ''), atleta: String(pessoa.nome || pessoa.id || 'Atleta'),
            pendencias: motivosAntes.slice()
          });
        } else if (motivosAntes.length && pessoa.participou === false) {
          estado.pendencias.shift();
        }
        const vermelho = pessoa.vermelho === true;
        const tipoVermelho = pessoa.vermelhoTipo || 'direto';
        const amarelos = Number.isInteger(pessoa.amarelos) ? pessoa.amarelos : 0;
        if (!(vermelho && tipoVermelho === 'segundo-amarelo')) estado.amarelos += amarelos;
        while (estado.amarelos >= 3) {
          estado.amarelos -= 3;
          estado.pendencias.push('3 cartões amarelos');
        }
        if (vermelho) {
          estado.pendencias.push(tipoVermelho === 'segundo-amarelo'
            ? 'expulsão por segundo amarelo' : 'cartão vermelho direto');
        }
      });
    });
  });
  return { estados: estados, infracoes: infracoes, aliases: aliases };
}

function infracoesDisciplinaTabela_(jogos) {
  return calcularDisciplinaAutomaticaTabela_(jogos).infracoes;
}

function validarNovasInfracoesDisciplinaTabela_(infracoesAntes, jogos) {
  const existentes = new Set((infracoesAntes || []).map(function (item) {
    return JSON.stringify([item.jogoId, item.equipeId, item.atletaId, item.pendencias.length]);
  }));
  const nova = infracoesDisciplinaTabela_(jogos).find(function (item) {
    return !existentes.has(JSON.stringify([item.jogoId, item.equipeId, item.atletaId, item.pendencias.length]));
  });
  if (nova) {
    throw new Error('Alteração não salva: ' + nova.atleta + ' está suspenso em ' + nova.jogoId
      + ' e participou. Pendência: ' + nova.pendencias.join(' + ') + '.');
  }
}

function elencosResultadoTabela_(contexto, jogo, persistirIds) {
  // A lista bruta preserva a situação ativa omitida pelo normalizador legado da comissão.
  const listas = { atletas: atletasCampeonato_(contexto.campeonato.id, persistirIds !== false),
    comissao: lerElencoBrutoOperacao_(contexto.campeonato.id, 'comissao') };
  garantirIdsHistoricoElenco_(contexto.campeonato.id, 'comissao', listas.comissao, persistirIds !== false);
  const identidades = new Set();
  const metadadosAtuais = [];
  const equipes = [jogo.mandanteId, jogo.visitanteId].map(function (id, indice) {
    const equipe = contexto.equipes.find(function (item) { return item.id === id; });
    const salvo = jogo.resultado && jogo.resultado.equipes.find(function (item) { return item.id === id; });
    const resposta = { id: id, nome: equipe.nome, escudo: equipe.escudo,
      lado: indice ? 'visitante' : 'mandante' };
    ['atletas', 'comissao'].forEach(function (tipo) {
      const atuais = listas[tipo].filter(function (pessoa) {
        return pessoa && String(pessoa.nome || '').trim() && pessoa.ativo !== false
          && chaveEquipe_(pessoa.timeVinculado) === chaveEquipe_(equipe.nome);
      });
      idsUnicosTabela_(atuais, tipo + ' do elenco');
      metadadosAtuais.push({ equipeId: id, tipo: tipo, pessoas: atuais.map(function (pessoa) {
        return tipo === 'atletas' ? { id: pessoa.id, nome: pessoa.nome, cpf: String(pessoa.cpf || ''), numero: pessoa.numero == null ? '' : pessoa.numero,
          dataNascimento: String(pessoa.dataNascimento || '') }
          : { id: pessoa.id, nome: pessoa.nome, cpf: String(pessoa.cpf || ''), cargo: String(pessoa.cargo || 'Comissão Técnica') };
      }) });
      const anteriores = salvo ? salvo[tipo] : [];
      const pessoas = anteriores.concat(atuais.filter(function (pessoa) {
        return !anteriores.some(function (anterior) { return anterior.id === pessoa.id; });
      }));
      resposta[tipo] = pessoas.map(function (pessoa) {
        if (identidades.has(pessoa.id)) throw new Error('Elencos com identificadores de participantes repetidos.');
        identidades.add(pessoa.id);
        const anterior = anteriores.find(function (item) { return item.id === pessoa.id; });
        const atual = listas[tipo].find(function (item) {
          return item.id === pessoa.id && chaveEquipe_(item.timeVinculado) === chaveEquipe_(equipe.nome);
        });
        const snapshot = anterior || pessoa;
        const item = {
          id: pessoa.id, nome: String(snapshot.nome), disponivel: atuais.some(function (atual) { return atual.id === pessoa.id; }),
          cpf: String(snapshot.cpf || (atual ? atual.cpf : '') || ''),
          participou: anterior && typeof anterior.participou === 'boolean' ? anterior.participou : false,
          amarelos: anterior && Number.isInteger(anterior.amarelos) ? anterior.amarelos : 0,
          vermelho: anterior && typeof anterior.vermelho === 'boolean' ? anterior.vermelho : false
        };
        if (tipo === 'atletas') {
          item.vermelhoTipo = anterior && anterior.vermelho === true
            ? (anterior.vermelhoTipo || 'direto') : '';
          item.numero = snapshot.numero == null ? '' : snapshot.numero;
          item.numeroJogo = anterior && anterior.numeroJogo !== undefined ? anterior.numeroJogo : '';
          item.dataNascimento = String(snapshot.dataNascimento || '');
          item.gols = anterior ? anterior.gols : 0;
          item.golsContra = anterior && anterior.golsContra !== undefined ? anterior.golsContra : 0;
          if (anterior && anterior.assistencias !== undefined) item.assistencias = anterior.assistencias;
        } else item.cargo = String(snapshot.cargo || 'Comissão Técnica');
        return item;
      });
    });
    return resposta;
  });
  const snapshots = equipes.map(function (equipe) {
    const snapshot = { id: equipe.id };
    ['atletas', 'comissao'].forEach(function (tipo) {
      snapshot[tipo] = equipe[tipo].map(function (pessoa) {
        return tipo === 'atletas' ? { id: pessoa.id, nome: pessoa.nome, cpf: pessoa.cpf, numero: pessoa.numero,
          dataNascimento: pessoa.dataNascimento, disponivel: pessoa.disponivel }
          : { id: pessoa.id, nome: pessoa.nome, cpf: pessoa.cpf, cargo: pessoa.cargo, disponivel: pessoa.disponivel };
      });
    });
    return snapshot;
  });
  Object.defineProperty(equipes, 'revisaoElencos', { value: JSON.stringify([metadadosAtuais, snapshots]) });
  return equipes;
}

function revisaoElencosResultadoTabela_(equipes) {
  // Detecta mudanças no cadastro atual mesmo quando a tela exibe a identificação histórica.
  return equipes.revisaoElencos;
}

function avisosResultadoTabela_(jogo, equipes) {
  const avisos = equipes.reduce(function (lista, equipe) {
    const adversaria = equipes.find(function (item) { return item.id !== equipe.id; });
    const total = equipe.atletas.reduce(function (soma, pessoa) { return soma + pessoa.gols; }, 0)
      + adversaria.atletas.reduce(function (soma, pessoa) { return soma + (pessoa.golsContra || 0); }, 0);
    const placar = equipe.id === jogo.mandanteId ? jogo.golsMandante : jogo.golsVisitante;
    if (placar !== null && total !== placar) lista.push('O total de gols de ' + equipe.nome + ', incluindo gols contra do adversário,'
      + ' (' + total + ') difere do placar manual (' + placar + '). O placar manual foi mantido.');
    return lista;
  }, []);
  if (jogo.resultado && jogo.resultado.equipes.some(function (equipe) {
    return (equipe.atletas || []).some(function (atleta) {
      return atleta.vermelho === true && !atleta.vermelhoTipo;
    });
  })) avisos.push('Cartão vermelho legado sem tipo explícito foi tratado como vermelho direto; revise a súmula se a expulsão foi por segundo amarelo.');
  return avisos;
}

function avisosDisciplinaLegadaTabela_(jogos, jogo) {
  const avisos = [];
  (jogos || []).filter(function (partida) {
    return partida.status === 'encerrado' && partida.resultado && Array.isArray(partida.resultado.equipes)
      && ordemJogoDisciplinaTabela_(partida) < ordemJogoDisciplinaTabela_(jogo);
  }).forEach(function (partida) {
    partida.resultado.equipes.forEach(function (equipe) {
      (equipe.atletas || []).forEach(function (atleta) {
        if (atleta.vermelho === true && !atleta.vermelhoTipo) {
          avisos.push('Jogo ' + partida.id + ': o vermelho legado de ' + String(atleta.nome || 'atleta')
            + ' foi tratado como direto. Revise o tipo se necessário.');
        }
      });
    });
  });
  return avisos;
}

function anotarDisciplinaAutomaticaResultadoTabela_(jogos, jogo, equipes) {
  const identidades = [];
  equipes.forEach(function (equipe) {
    equipe.atletas.forEach(function (atleta) {
      identidades.push({ equipeId: equipe.id, id: atleta.id, cpf: atleta.cpf });
    });
  });
  const calculo = calcularDisciplinaAutomaticaTabela_(jogos, jogo, identidades);
  equipes.forEach(function (equipe) {
    equipe.atletas.forEach(function (atleta) {
      const chave = JSON.stringify([equipe.id,
        identidadeDisciplinaTabela_(equipe.id, atleta, calculo.aliases)]);
      const estado = calculo.estados[chave] || { amarelos: 0, pendencias: [] };
      Object.assign(atleta, {
        amarelosAcumulados: estado.amarelos,
        jogosSuspensaoPendentes: estado.pendencias.length,
        motivoSuspensaoAutomatica: estado.pendencias.join(' + '),
        suspensaoAutomatica: estado.pendencias.length > 0
      });
    });
  });
  return equipes;
}

function listarResultadoJogoCampeonato(payload) {
  sessaoCampeonato_();
  equipesRegistro_();
  const dados = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const contexto = contextoTabela_(String(dados.campeonatoId || '').trim(), campeonatos_(), true);
    const jogo = contexto.jogos.find(function (item) { return item.id === dados.id; });
    if (!jogo) throw new Error('Jogo não encontrado.');
    const equipes = anotarDisciplinaAutomaticaResultadoTabela_(
      contexto.jogos, jogo, elencosResultadoTabela_(contexto, jogo));
    const fase = contexto.fases.find(function (item) { return item.id === jogo.faseId; });
    const resultado = jogo.resultado || { wo: false, woEquipeId: '', prorrogacao: false, penaltis: false,
      golsPenaltisMandante: null, golsPenaltisVisitante: null, observacoes: '' };
    const info = {};
    ['wo', 'woEquipeId', 'prorrogacao', 'penaltis', 'golsPenaltisMandante', 'golsPenaltisVisitante', 'observacoes']
      .forEach(function (chave) { info[chave] = resultado[chave]; });
    return { campeonatoId: contexto.campeonato.id, jogo: jogo,
      campeonato: { id: contexto.campeonato.id, nome: contexto.campeonato.nome, temporada: contexto.campeonato.temporada },
      fase: { id: fase.id, nome: fase.nome, tipo: fase.tipo }, revisao: revisaoTabela_(contexto),
      revisaoElencos: revisaoElencosResultadoTabela_(equipes), podeEditar: true,
      equipes: equipes, resultado: info,
      avisos: avisosResultadoTabela_(jogo, equipes).concat(avisosDisciplinaLegadaTabela_(contexto.jogos, jogo)) };
  } finally { lock.releaseLock(); }
}

function salvarResultadoJogoCampeonato(payload) {
  let avisos;
  const tela = mutarTabelaCampeonato_(payload, function (contexto, dados) {
    const jogo = contexto.jogos.find(function (item) { return item.id === dados.id; });
    if (!jogo) throw new Error('Jogo não encontrado.');
    const elencos = elencosResultadoTabela_(contexto, jogo, false);
    if (typeof dados.revisaoElencos !== 'string' || dados.revisaoElencos !== revisaoElencosResultadoTabela_(elencos)) {
      throw new Error('Os elencos foram alterados. Recarregue o resultado antes de salvar.');
    }
    equipesResultadoValidasTabela_(dados.equipes, jogo);
    const resultado = informacoesResultadoTabela_(dados.resultado, jogo);
    resultado.equipes = elencos.map(function (equipe) {
      const entrada = dados.equipes.find(function (item) { return item.id === equipe.id; });
      const snapshot = { id: equipe.id };
      ['atletas', 'comissao'].forEach(function (tipo) {
        if (entrada[tipo].length !== equipe[tipo].length) throw new Error('Envie todos os participantes exibidos no resultado.');
        snapshot[tipo] = entrada[tipo].map(function (pessoa) {
          const confiavel = equipe[tipo].find(function (item) { return item.id === pessoa.id; });
          if (!confiavel) throw new Error('Participante não pertence a este elenco e tipo de cadastro.');
          const salvo = Object.assign({}, confiavel, eventosResultadoTabela_(pessoa, tipo === 'atletas'));
          delete salvo.disponivel;
          delete salvo.suspensaoAutomatica;
          delete salvo.motivoSuspensaoAutomatica;
          delete salvo.jogosSuspensaoPendentes;
          delete salvo.amarelosAcumulados;
          return salvo;
        });
      });
      return snapshot;
    });
    const atualizado = Object.assign({}, jogo, {
      status: 'encerrado',
      golsMandante: inteiroResultadoTabela_(dados.golsMandante, 999, 'Gols do mandante'),
      golsVisitante: inteiroResultadoTabela_(dados.golsVisitante, 999, 'Gols do visitante'),
      resultado: resultado
    });
    validarJogoTabela_(atualizado, contexto, jogo);
    contexto.doc.jogos[contexto.doc.jogos.indexOf(jogo)] = atualizado;
    const infracaoNoJogo = infracoesDisciplinaTabela_(contexto.doc.jogos).find(function (item) {
      return item.jogoId === atualizado.id;
    });
    if (infracaoNoJogo) {
      throw new Error('Resultado não salvo: ' + infracaoNoJogo.atleta + ' está suspenso e participou. Pendência: '
        + infracaoNoJogo.pendencias.join(' + ') + '.');
    }
    avisos = avisosResultadoTabela_(atualizado, elencos.map(function (equipe, indice) {
      return Object.assign({}, equipe, { atletas: resultado.equipes[indice].atletas });
    }));
  }, false);
  tela.avisos = tela.avisos.concat(avisos);
  tela.recado = 'Resultado salvo. O placar manual inclui a prorrogação. Suspensões automáticas são recalculadas pelos cartões e jogos finalizados.';
  return tela;
}

function removerJogoCampeonato(payload) {
  return mutarTabelaCampeonato_(payload, function (contexto, dados) {
    const indice = contexto.doc.jogos.findIndex(function (jogo) { return jogo.id === dados.id; });
    if (indice === -1) throw new Error('Jogo não encontrado.');
    contexto.doc.jogos.splice(indice, 1);
  }, false);
}

function salvarGruposTabelaCampeonato(payload) {
  return mutarTabelaCampeonato_(payload, function (contexto, dados) {
    idsUnicosTabela_(dados.grupos, 'grupos');
    if (dados.grupos.length !== contexto.grupos.length || dados.grupos.some(function (grupo) {
      return !contexto.grupos.some(function (item) { return item.id === grupo.id; }) || !Array.isArray(grupo.equipeIds);
    })) throw new Error('Informe todos os grupos configurados, sem incluir outros.');
    contexto.doc.grupos = dados.grupos.map(function (grupo) { return { id: grupo.id, equipeIds: grupo.equipeIds.slice() }; });
    // Os jogos existentes, mesmo não encerrados, devem continuar no mesmo grupo.
  }, false);
}

function salvarCriteriosTabelaCampeonato(payload) {
  return mutarTabelaCampeonato_(payload, function (contexto, dados) {
    contexto.doc.criterios = validarCriteriosTabela_(dados.criterios);
  }, false);
}

function salvarDesempateOrganizacaoTabela(payload) {
  const sessao = sessaoCampeonato_();
  const tela = mutarTabelaCampeonato_(payload, function (contexto, dados, lista) {
    if (typeof dados.escopo !== 'string' || typeof dados.assinaturaEmpate !== 'string'
        || !dados.assinaturaEmpate || !Array.isArray(dados.equipeIds)
        || !dados.equipeIds.length || dados.equipeIds.some(function (id) {
          return typeof id !== 'string' || !id;
        }) || new Set(dados.equipeIds).size !== dados.equipeIds.length) {
      throw new Error('Informe um desempate e uma ordem de equipes válidos.');
    }
    if (typeof dados.motivo !== 'string' || !dados.motivo.trim() || dados.motivo.length > 1000) {
      throw new Error('Informe o motivo da organização manual (até 1000 caracteres).');
    }
    const tela = montarTelaTabela_(lista, contexto);
    const empate = tela.empatesOrganizacao.find(function (item) {
      return item.escopo === dados.escopo && item.assinaturaEmpate === dados.assinaturaEmpate;
    });
    if (!empate) throw new Error('O empate esportivo foi alterado. Recarregue a tabela antes de organizar.');
    if (dados.equipeIds.length !== empate.equipes.length
        || dados.equipeIds.some(function (id) {
          return !empate.equipes.some(function (equipe) { return equipe.id === id; });
        })) throw new Error('A ordem deve incluir exatamente todas as equipes empatadas.');
    const decisao = {
      escopo: empate.escopo, assinaturaEmpate: empate.assinaturaEmpate,
      equipeIds: dados.equipeIds.slice(), motivo: dados.motivo.trim(),
      registradoEm: new Date().toISOString(), registradoPor: sessao.usuario.nome
    };
    const indice = contexto.doc.desempatesOrganizacao.findIndex(function (item) {
      return item.escopo === decisao.escopo && item.assinaturaEmpate === decisao.assinaturaEmpate;
    });
    if (indice === -1) contexto.doc.desempatesOrganizacao.push(decisao);
    else contexto.doc.desempatesOrganizacao[indice] = decisao;
  }, false);
  tela.recado = 'Organização manual do empate registrada.';
  return tela;
}

function removerDesempateOrganizacaoTabela(payload) {
  const dados = payload || {};
  const tela = mutarTabelaCampeonato_(dados, function (contexto, entrada, lista) {
    if (typeof entrada.escopo !== 'string' || typeof entrada.assinaturaEmpate !== 'string'
        || !entrada.assinaturaEmpate) throw new Error('Informe o empate cuja decisão será removida.');
    const tela = montarTelaTabela_(lista, contexto);
    const empate = tela.empatesOrganizacao.find(function (item) {
      return item.escopo === entrada.escopo && item.assinaturaEmpate === entrada.assinaturaEmpate;
    });
    if (!empate) throw new Error('O empate esportivo foi alterado. Recarregue a tabela antes de remover a decisão.');
    const indice = contexto.doc.desempatesOrganizacao.findIndex(function (item) {
      return item.escopo === empate.escopo && item.assinaturaEmpate === empate.assinaturaEmpate;
    });
    if (indice === -1) throw new Error('Não há decisão manual registrada para este empate.');
    contexto.doc.desempatesOrganizacao.splice(indice, 1);
  }, false);
  tela.recado = 'Decisão manual removida.';
  return tela;
}

function salvarCampoCampeonato(payload) {
  return mutarTabelaCampeonato_(payload, function (contexto, dados) {
    const nome = limparCampo_(dados.nome || '', 120);
    const endereco = limparCampo_(dados.endereco || '', 300);
    if (!nome) throw new Error('Informe o nome do campo.');
    if (typeof dados.ativo !== 'boolean') throw new Error('Informe se o campo está ativo.');
    const id = String(dados.id || '').trim();
    const indice = contexto.campos.findIndex(function (campo) { return campo.id === id; });
    if (id && indice === -1) throw new Error('Campo não encontrado.');
    if (contexto.campos.some(function (campo) { return campo.id !== id && chaveEquipe_(campo.nome) === chaveEquipe_(nome); })) {
      throw new Error('Já existe um campo com esse nome.');
    }
    const campo = { id: id || Utilities.getUuid(), nome: nome, endereco: endereco, ativo: dados.ativo };
    if (indice === -1) contexto.campos.push(campo);
    else contexto.campos[indice] = campo;
  }, true);
}

function removerCampoCampeonato(payload) {
  return mutarTabelaCampeonato_(payload, function (contexto, dados, lista) {
    const indice = contexto.campos.findIndex(function (campo) { return campo.id === dados.id; });
    if (indice === -1) throw new Error('Campo não encontrado.');
    if (lista.some(function (campeonato) {
      return lerTabelaCampeonato_(campeonato.id).jogos.some(function (jogo) { return jogo.campoId === dados.id; });
    })) throw new Error('Este campo está em uso em jogos. Inative-o para preservar o histórico.');
    contexto.campos.splice(indice, 1);
  }, true);
}

function validarAlteracaoEstruturaTabela_(campeonato) {
  const doc = lerTabelaCampeonato_(campeonato.id);
  const estrutura = estruturaCampeonato_(campeonato.id, campeonato);
  const esqueleto = esqueletoTabela_(estrutura);
  const contexto = {
    fases: esqueleto.fases, grupos: gruposTabela_(doc, esqueleto, equipesTabela_(campeonato.id, true), estrutura),
    equipes: equipesTabela_(campeonato.id, true), campos: lerCamposTabela_().campos, jogos: doc.jogos
  };
  doc.jogos.forEach(function (jogo) { validarJogoTabela_(jogo, contexto, jogo); });
}

function impedirRemocaoEquipeTabela_(campeonatoId, nomeChave) {
  const equipe = lerRegistroEquipes_().find(function (item) { return chaveEquipe_(item.nome) === nomeChave; });
  if (!equipe) return;
  const lista = campeonatos_().filter(function (item) { return !campeonatoId || item.id === campeonatoId; });
  lista.forEach(function (campeonato) {
    const doc = lerTabelaCampeonato_(campeonato.id);
    if (doc.jogos.some(function (jogo) { return jogo.mandanteId === equipe.id || jogo.visitanteId === equipe.id; })
        || doc.grupos.some(function (grupo) { return grupo.equipeIds.indexOf(equipe.id) !== -1; })) {
      throw new Error('Esta equipe está em uso na tabela. Remova seus jogos e sua atribuição de grupo antes de desvincular.');
    }
  });
}

function removerCadastroTabelaCampeonato_(id) {
  invalidarIndiceValidacao_(id);
  const arquivos = pastaRaizProjeto_().getFilesByName(arquivoTabelaCampeonato_(id));
  while (arquivos.hasNext()) arquivos.next().setTrashed(true);
  PropertiesService.getScriptProperties().deleteProperty(chaveTabelaCampeonato_(id));
}

function escaparSumulaTabela_(valor) {
  return String(valor === undefined || valor === null ? '' : valor).replace(/[&<>"']/g, function (caractere) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caractere];
  });
}

function cpfSumulaTabela_(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');
  return digitos.length === 11 ? '***' + digitos.slice(3, 7) + '****' : '—';
}

function suspensosSumulaTabela_(controle, campeonato) {
  const competicao = chaveEquipe_(campeonato.nome);
  const suspensos = Object.create(null);
  controle.registros.forEach(function (item) {
    const equipe = chaveEquipe_(item.equipe);
    const pessoa = chaveEquipe_(item.punido);
    const tipo = chaveEquipe_(item.tipo);
    if (!competicao || !equipe || !pessoa || chaveEquipe_(item.competicao) !== competicao
        || chaveEquipe_(item.status) !== 'DEFINIDA'
        || !/^A CUMPRIR(?:\b|$)/.test(chaveEquipe_(item.situacao))
        || (tipo !== 'ATLETA' && tipo !== 'COMISSAO TECNICA')) return;
    suspensos[JSON.stringify([equipe, tipo, pessoa])] = true;
  });
  return suspensos;
}

function suspensoesAutomaticasSumulaTabela_(jogos, jogo, equipes, calculo) {
  calculo = calculo || calcularDisciplinaAutomaticaTabela_(jogos, jogo, equipes.reduce(function (lista, item) {
    return lista.concat(item.atletas.map(function (atleta) {
      return { equipeId: item.equipe.id, id: atleta.id, cpf: atleta.cpf };
    }));
  }, []));
  const suspensos = Object.create(null);
  equipes.forEach(function (item) {
    item.atletas.forEach(function (atleta) {
      const chave = JSON.stringify([item.equipe.id,
        identidadeDisciplinaTabela_(item.equipe.id, atleta, calculo.aliases)]);
      const estado = calculo.estados[chave];
      if (estado && estado.pendencias.length) {
        suspensos[chave] = { jogos: estado.pendencias.length, motivo: estado.pendencias.join(' + ') };
      }
    });
  });
  return suspensos;
}

const SUMULA_ATLETAS_POR_FOLHA = 18;

function painelSumulaTabela_(equipe, atletas, comissao, suspensos, automaticos, aliases, pagina) {
  if (pagina === undefined) {
    pagina = automaticos;
    automaticos = Object.create(null);
    aliases = Object.create(null);
  }
  automaticos = automaticos || Object.create(null);
  aliases = aliases || Object.create(null);
  const e = escaparSumulaTabela_;
  const chave = chaveEquipe_(equipe.nome);
  function nomePessoa(item, tipo) {
    const suspensoManual = suspensos[JSON.stringify([chave, tipo, chaveEquipe_(item.nome)])];
    const identidade = tipo === 'ATLETA'
      ? identidadeDisciplinaTabela_(equipe.id, item, aliases) : '';
    const suspensoAutomatico = tipo === 'ATLETA' && automaticos[JSON.stringify([equipe.id, identidade])];
    const suspenso = suspensoManual || suspensoAutomatico;
    const detalhe = suspensoAutomatico
      ? ' — ' + suspensoAutomatico.motivo + ' (' + suspensoAutomatico.jogos + ' jogo(s))'
      : '';
    return {
      classe: suspenso ? ' class="suspenso"' : '',
      nome: e(item.nome) + (suspenso ? ' <strong>SUSPENSO' + e(detalhe) + '</strong>' : '')
    };
  }
  function vazias(quantidade, colunas) {
    let linhas = '';
    for (let i = 0; i < quantidade; i++) {
      linhas += '<tr class="linha"><td>&nbsp;</td>' + '<td></td>'.repeat(colunas - 1) + '</tr>';
    }
    return linhas;
  }
  const membros = comissao.slice(pagina * 4, (pagina + 1) * 4);
  const elenco = atletas.slice(pagina * SUMULA_ATLETAS_POR_FOLHA, (pagina + 1) * SUMULA_ATLETAS_POR_FOLHA);
  let html = '<table class="identidade"><tr><td>'
    + (equipe.escudo ? '<img class="escudo" alt="Escudo da equipe" src="' + e(equipe.escudo) + '">' : '')
    + '<strong>' + e(equipe.nome) + '</strong></td></tr></table>'
    + '<table class="comissao"><colgroup><col style="width:18%"><col style="width:42%">'
    + '<col style="width:28%"><col style="width:6%"><col style="width:6%"></colgroup>'
    + '<thead><tr><th colspan="5">COMISSÃO TÉCNICA</th></tr>'
    + '<tr><th>CPF</th><th>Nome — Cargo</th><th>Assinatura</th><th>CA</th><th>CV</th></tr></thead><tbody>';
  membros.forEach(function (item) {
    const pessoa = nomePessoa(item, 'COMISSAO TECNICA');
    html += '<tr' + pessoa.classe + '><td>' + e(cpfSumulaTabela_(item.cpf)) + '</td><td class="nome">'
      + pessoa.nome + ' — ' + e(item.cargo || 'Comissão Técnica') + '</td><td></td><td></td><td></td></tr>';
  });
  html += vazias(4 - membros.length, 5) + '</tbody></table>'
    + '<table class="atletas"><colgroup><col style="width:16%"><col style="width:40%">'
    + '<col style="width:6%"><col style="width:11%"><col style="width:11%">'
    + '<col style="width:5%"><col style="width:5%"><col style="width:6%"></colgroup>'
    + '<thead><tr><th colspan="8">ATLETAS</th></tr><tr><th rowspan="2">CPF</th><th rowspan="2">Nome</th>'
    + '<th rowspan="2">Nº</th><th colspan="2">Substituições</th><th rowspan="2">CA</th><th rowspan="2">CV</th>'
    + '<th rowspan="2">Gols</th></tr><tr><th>Entrada</th><th>Saída</th></tr></thead><tbody>';
  elenco.forEach(function (item) {
    const pessoa = nomePessoa(item, 'ATLETA');
    html += '<tr' + pessoa.classe + '><td>' + e(cpfSumulaTabela_(item.cpf)) + '</td><td class="nome">'
      + pessoa.nome + '</td><td>' + e(item.numero) + '</td>' + '<td></td>'.repeat(5) + '</tr>';
  });
  html += vazias(SUMULA_ATLETAS_POR_FOLHA - elenco.length, 8) + '</tbody></table>'
    + '<table class="substituicoes"><colgroup><col style="width:8%"><col style="width:21%"><col style="width:21%">'
    + '<col style="width:8%"><col style="width:21%"><col style="width:21%"></colgroup>'
    + '<thead><tr><th colspan="6">SUBSTITUIÇÕES — NÚMEROS DOS ATLETAS</th></tr>'
    + '<tr><th>Nº</th><th>Entra</th><th>Sai</th><th>Nº</th><th>Entra</th><th>Sai</th></tr></thead><tbody>';
  for (let i = 1; i <= 5; i++) {
    html += '<tr><td>' + i + '</td><td></td><td></td><td>' + (i + 5) + '</td><td></td><td></td></tr>';
  }
  html += '</tbody></table><table class="suplemento"><thead><tr><th>GOLS CONTRA — JOGADOR / QUANTIDADE</th></tr></thead>'
    + '<tbody><tr class="anotacao"><td></td></tr></tbody></table>'
    + '<table><tr class="assinatura"><td>Capitão(ã) / assinatura:</td></tr></table>';
  return html;
}

function gerarSumulaJogoCampeonato(payload) {
  sessaoCampeonato_();
  equipesRegistro_();
  const dados = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let html;
  let nome;
  try {
    const contexto = contextoTabela_(String(dados.campeonatoId || '').trim(), campeonatos_(), true);
    const jogo = contexto.jogos.find(function (item) { return item.id === dados.id; });
    if (!jogo) throw new Error('Jogo não encontrado.');
    const campo = contexto.campos.find(function (item) { return item.id === jogo.campoId; });
    const fase = contexto.fases.find(function (item) { return item.id === jogo.faseId; });
    const grupo = contexto.grupos.find(function (item) { return item.id === jogo.grupoId; });
    const atletas = atletasCampeonato_(contexto.campeonato.id);
    // O normalizador público da comissão legada não expõe o campo ativo.
    const comissao = lerElencoBrutoOperacao_(contexto.campeonato.id, 'comissao');
    const e = escaparSumulaTabela_;
    // A leitura é obrigatória: uma falha não pode aparentar ausência de suspensões.
    const controle = listarPunicoes();
    const suspensos = suspensosSumulaTabela_(controle, contexto.campeonato);
    const jogoEquipes = [jogo.mandanteId, jogo.visitanteId].map(function (id) {
      const equipe = contexto.equipes.find(function (item) { return item.id === id; });
      return {
        equipe: equipe,
        atletas: atletas.filter(function (item) {
          return item.ativo !== false && chaveEquipe_(item.timeVinculado) === chaveEquipe_(equipe.nome);
        })
      };
    });
    const identidadesDisciplina = jogoEquipes.reduce(function (lista, item) {
      return lista.concat(item.atletas.map(function (atleta) {
        return { equipeId: item.equipe.id, id: atleta.id, cpf: atleta.cpf };
      }));
    }, []);
    const calculoDisciplina = calcularDisciplinaAutomaticaTabela_(contexto.jogos, jogo, identidadesDisciplina);
    const suspensosAutomaticos = suspensoesAutomaticasSumulaTabela_(
      contexto.jogos, jogo, jogoEquipes, calculoDisciplina);
    const avisosLegadoDisciplina = avisosDisciplinaLegadaTabela_(contexto.jogos, jogo);
    const fuso = Session.getScriptTimeZone();
    const emitidoEm = Utilities.formatDate(new Date(), fuso, 'dd/MM/yyyy HH:mm:ss');
    const logoBlob = DriveApp.getFileById(CONFIG.logoFileId).getBlob();
    const logo = 'data:' + logoBlob.getContentType() + ';base64,' + Utilities.base64Encode(logoBlob.getBytes());
    html = '<!doctype html><html><head><meta charset="UTF-8"><style>'
      + '@page{size:A4 landscape;margin:5mm 10mm}body{margin:0;font:7.5pt Arial,sans-serif;line-height:1.05;color:#000}'
      + 'table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 1mm}'
      + 'th,td{border:0.2mm solid #000;padding:0.15mm 0.6mm;text-align:center;vertical-align:middle;overflow-wrap:break-word;word-wrap:break-word}'
      + 'th{font-size:7pt;background:#fff;color:#000}thead tr:first-child th{padding:0.7mm 0.6mm}td.nome{text-align:left;font-size:8pt}'
      + 'thead{display:table-header-group}tr{page-break-inside:avoid;break-inside:avoid}'
      + '.folha{page-break-before:always}.folha.primeira{page-break-before:auto}'
      + '.cabecalho td,.paineis>tbody>tr>td,.identidade td{border:0}'
      + '.cabecalho{margin-bottom:1mm;border-bottom:0.5mm solid #000}.cabecalho .marca{width:17mm}.logo{width:15mm;height:15mm}'
      + '.cabecalho .emissao{width:47mm;text-align:right;vertical-align:top;font-size:7pt}'
      + 'h1{font-size:12pt;margin:0.5mm 0;color:#000}'
      + '.placar{font-size:10pt;padding:0.8mm;margin-bottom:1mm}.caixa{display:inline-block;border:0.3mm solid #000;background:#fff;width:10mm;height:6mm;vertical-align:middle}'
      + '.paineis>tbody>tr>td{width:50%;padding:0 1mm;vertical-align:top}.paineis>tbody>tr{page-break-inside:auto}'
      + '.identidade td{height:11mm;font-size:10pt;color:#000}.escudo{width:10mm;height:10mm;vertical-align:middle;margin-right:2mm}'
      + '.atletas td,.comissao td{height:2.8mm}.linha{height:3.3mm}'
      + '.suspenso td{color:#b00020;background:#ffe6e6}.suspenso strong{font-size:7pt}'
      + '.substituicoes td{height:3.5mm}.anotacao{height:5mm}.assinatura{height:6mm;text-align:left}.relatorio{height:8mm}'
      + '.rodape{text-align:left;font-size:7pt;margin:1mm 0}'
      + '</style></head><body>';
    const equipes = [jogo.mandanteId, jogo.visitanteId].map(function (id) {
      const equipe = contexto.equipes.find(function (item) { return item.id === id; });
      const chave = chaveEquipe_(equipe.nome);
      const elenco = atletas.filter(function (item) { return item.ativo !== false && chaveEquipe_(item.timeVinculado) === chave; });
      const membros = comissao.filter(function (item) {
        return item && item.ativo !== false && String(item.nome || '').trim() && chaveEquipe_(item.timeVinculado) === chave;
      });
      return { equipe: equipe, atletas: elenco, comissao: membros };
    });
    // Blocos limitados por folha preservam todos os inscritos sem reduzir a fonte.
    const paginas = Math.max.apply(null, equipes.map(function (item) {
      return Math.max(1, Math.ceil(item.atletas.length / SUMULA_ATLETAS_POR_FOLHA), Math.ceil(item.comissao.length / 4));
    }));
    const dataJogo = String(jogo.data || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
    for (let pagina = 0; pagina < paginas; pagina++) {
      html += '<section class="folha' + (pagina === 0 ? ' primeira' : '') + '">'
        + '<table class="cabecalho"><tr><td class="marca"><img class="logo" alt="AEUV" src="' + e(logo) + '"></td>'
        + '<td><strong>' + e(ASSOCIACAO_NOME) + '</strong><h1>' + e(contexto.campeonato.nome)
        + ' — ' + e(contexto.campeonato.temporada) + '</h1>'
        + e(fase.nome) + (grupo ? ' / ' + e(grupo.nome) : '') + ' / Rodada ' + e(jogo.rodada)
        + '<br>Local: ' + e(campo.nome) + ' — ' + e(campo.endereco)
        + '<br>Data: ' + e(dataJogo) + ' — Horário: ' + e(jogo.hora) + '</td>'
        + '<td class="emissao"><strong>SÚMULA — MANUAL</strong><br>Gerada em: ' + e(emitidoEm) + '<br>Fuso: ' + e(fuso)
        + '<br>Jogo: ' + e(jogo.id) + '<br>Folha ' + (pagina + 1) + '/' + paginas + '</td></tr></table>'
        + '<div class="placar" style="text-align:center">PLACAR: <span class="caixa">&nbsp;</span>'
        + ' × <span class="caixa">&nbsp;</span></div><table class="paineis"><tbody><tr>';
      equipes.forEach(function (item) {
        html += '<td>' + painelSumulaTabela_(item.equipe, item.atletas, item.comissao,
          suspensos, suspensosAutomaticos, calculoDisciplina.aliases, pagina) + '</td>';
      });
      html += '</tr></tbody></table>'
        + '<table><thead><tr><th>ARBITRAGEM — função</th><th>Nome</th><th>Documento</th><th>Assinatura</th>'
        + '<th>PERÍODO</th><th>Início</th><th>Fim</th></tr></thead><tbody>'
        + '<tr><td>Árbitro(a)</td><td></td><td></td><td></td><td>1º tempo</td><td></td><td></td></tr>'
        + '<tr><td>Auxiliar 1</td><td></td><td></td><td></td><td>2º tempo</td><td></td><td></td></tr>'
        + '<tr><td>Auxiliar 2</td><td></td><td></td><td></td><td>Prorrogação</td><td></td><td></td></tr>'
        + '<tr><td>Mesário(a)</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'
        + '</tbody></table><table><thead><tr><th>RELATÓRIO / OBSERVAÇÕES</th></tr></thead>'
        + '<tbody><tr class="relatorio"><td></td></tr></tbody></table>'
        + '<p class="rodape">CA: cartão amarelo · CV: cartão vermelho · CPF parcialmente mascarado. '
        + 'Elencos e suspensões atuais, consultados na emissão; não representam o histórico na data do jogo.'
        + '<br>Suspensões: Controle de punições — atualizado em ' + e(controle.atualizadoEm || 'data não informada')
        + '. Somente DEFINIDA / A CUMPRIR, por competição, equipe, tipo e nome.'
        + (avisosLegadoDisciplina.length ? '<br><strong>AVISO:</strong> ' + e(avisosLegadoDisciplina.join(' ')) : '')
        + '</p></section>';
    }
    html += '</body></html>';
    nome = 'Sumula-' + String(jogo.id).replace(/[^A-Za-z0-9_-]/g, '-') + '.pdf';
  } finally { lock.releaseLock(); }
  const pdf = Utilities.newBlob(html, 'text/html', 'Sumula.html').getAs('application/pdf').setName(nome);
  return { nome: nome, mimeType: 'application/pdf', base64: Utilities.base64Encode(pdf.getBytes()) };
}

 /******************************************************
  * TIMES DO CAMPEONATO
  ******************************************************/

 function chaveTimesCampeonato_(campeonatoId) {
   return CAMPEONATO_TIMES_CHAVE + String(campeonatoId || '').trim();
 }

 function timesCampeonato_(campeonatoId) {
   const chave = chaveTimesCampeonato_(campeonatoId);

   try {
     const bruto = PropertiesService.getScriptProperties().getProperty(chave);

     if (!bruto) {
       return [];
     }

     const lista = JSON.parse(bruto);

    if (!Array.isArray(lista) || !lista.length) {
       return [];
     }

    const nomes = lista.map(function (item) {
      if (item && typeof item === 'object') {
        return limparEspacos_(item.nome || item.time || item.equipe || '');
      }

      return limparEspacos_(item);
    }).filter(function (nome) {
      return !!nome;
    });

    return nomes.length ? higienizarEquipes_(nomes) : [];
   } catch (e) {
     return [];
   }
 }

 function gravarTimesCampeonato_(campeonatoId, lista) {
   marcarSnapshotsEsportivosPendentes_();
   const validos = lista.length ? higienizarEquipes_(lista) : [];

   const ativo = elencosParticionadosCutoverAtivo_();
   // Capture removed empty enrollments before unlinking. Additions can capture
   // both existing and new enrollments in the single post-write journal.
   if (!ativo || timesCampeonato_(campeonatoId).some(function (nome) {
     return !validos.some(function (atual) { return chaveEquipe_(atual) === chaveEquipe_(nome); });
   })) prepararHistoricoElenco_(null, null, ativo ? campeonatoId : null);
   PropertiesService.getScriptProperties()
     .setProperty(chaveTimesCampeonato_(campeonatoId), JSON.stringify(validos));
   prepararHistoricoElenco_(null, null, elencosParticionadosCutoverAtivo_() ? campeonatoId : null);
 }

  function detalharTimesCampeonato_(campeonatoId, times, registroEquipes, somenteResumo) {
    if (!(times || []).length) return [];
    const atletas = atletasCampeonato_(campeonatoId);
    const comissao = comissaoTecnicaCampeonato_(campeonatoId);
    const equipes = registroEquipes || equipesRegistro_();

    return (times || []).map(function (nomeTime) {
      const chaveTime = chaveEquipe_(nomeTime);
      const atletasVinculados = atletas.filter(function (atleta) {
        return chaveEquipe_(atleta.timeVinculado) === chaveTime;
      });
      const equipe = equipes.find(function (item) { return chaveEquipe_(item.nome) === chaveTime; }) || {};
      const resumo = {
        id: equipe.id || '',
        escudo: equipe.escudo || '',
        nome: nomeTime,
        totalAtletas: atletasVinculados.length,
        totalComissao: comissao.filter(function (item) { return chaveEquipe_(item.timeVinculado) === chaveTime; }).length
      };
      if (!somenteResumo) resumo.atletas = atletasVinculados.map(function (atleta) {
        return { id: atleta.id, nome: atleta.nome, apelido: atleta.apelido, cpf: atleta.cpf, foto: atleta.foto };
      });
      return resumo;
    });
  }

 function carregarEquipesParticipantesAtual(campeonatoId) {
   sessaoCampeonato_();
   return comLockSnapshotEsportivo_(function () {
     return respostaEsportivaAtual_(construirEquipesParticipantesAtual_(campeonatoId, true));
   });
 }

 function construirEquipesParticipantesAtual_(campeonatoId, lockJaAdquirido) {
   const sessao = identificarUsuario_();
   if (!sessao.autorizado || !sessao.usuario || ['admin', 'diretoria', 'associado'].indexOf(sessao.usuario.perfil) === -1) {
     throw new Error('Você não tem permissão para consultar os elencos.');
   }
   const associado = sessao.usuario.perfil === 'associado';
   const globais = equipesRegistro_(lockJaAdquirido);
   const ativas = obterEquipes_().map(chaveEquipe_);
   const bloqueios = lerBloqueiosElenco_();
   const campeonatos = campeonatosResumo_().filter(function (campeonato) {
     return !associado || timesCampeonato_(campeonato.id).some(function (nome) {
       return chaveEquipe_(nome) === chaveEquipe_(sessao.usuario.equipe);
     });
   });
   const selecionado = campeonatos.find(function (item) { return item.id === String(campeonatoId || '').trim(); })
     || campeonatos[0];
   return {
     campeonatos: campeonatos,
     campeonatoId: selecionado ? selecionado.id : '',
     equipesGlobais: associado ? [] : globais.filter(function (item) {
       return ativas.indexOf(chaveEquipe_(item.nome)) !== -1;
     }).map(function (item) { return { id: item.id, nome: item.nome }; }),
     podeEditar: !associado,
     registros: (selecionado ? [selecionado] : []).map(function (campeonato) {
       const nomes = timesCampeonato_(campeonato.id).filter(function (nome) {
         return !associado || chaveEquipe_(nome) === chaveEquipe_(sessao.usuario.equipe);
       });
       return {
         campeonatoId: campeonato.id, campeonatoNome: campeonato.nome,
         times: nomes,
         timesDetalhados: detalharTimesCampeonato_(campeonato.id, nomes, globais, true).map(function (time) {
           return { id: time.id, nome: time.nome, escudo: time.escudo,
             bloqueado: elencoBloqueado_(campeonato.id, time.id, bloqueios),
             totalAtletas: time.totalAtletas, totalComissao: time.totalComissao };
         })
       };
     })
   };
 }

 function vincularEquipeParticipante(payload) {
   sessaoCampeonato_();
   const dados = payload || {};
   equipesRegistro_();
   const lock = LockService.getScriptLock();
   lock.waitLock(30000);
   try {
     const equipe = equipesRegistro_(true).find(function (item) { return item.id === dados.equipeId; });
     if (!equipe || !obterEquipes_().some(function (nome) { return chaveEquipe_(nome) === chaveEquipe_(equipe.nome); })) {
       throw new Error('Escolha uma equipe do Banco de Dados de Equipes.');
     }
     salvarTimeCampeonatoInterno_({ campeonatoId: dados.campeonatoId, equipeExistente: equipe.nome }, true);
   } finally {
     lock.releaseLock();
   }
   return carregarEquipesParticipantesAtual(dados.campeonatoId);
 }

 function listarTimesCampeonato(campeonatoId) {
   sessaoCampeonato_();

   const campeonatos = campeonatosResumo_();

   return {
     campeonatos: campeonatos,
     equipesGlobais: obterEquipes_(),
     registros: campeonatos.filter(function (campeonato) {
       return !campeonatoId || campeonato.id === campeonatoId;
     }).map(function (campeonato) {
       const times = timesCampeonato_(campeonato.id);

       return {
         campeonatoId: campeonato.id,
         campeonatoNome: campeonato.nome,
         temporada: campeonato.temporada,
         status: campeonato.status,
         total: times.length,
          times: times,
          timesDetalhados: detalharTimesCampeonato_(campeonato.id, times)
       };
     }),
     podeEditar: true
   };
 }

 function salvarTimeCampeonato(payload) {
   sessaoCampeonato_();
   equipesRegistro_();
   const lock = LockService.getScriptLock();
   lock.waitLock(30000);
   try {
     return salvarTimeCampeonatoInterno_(payload);
   } finally {
     lock.releaseLock();
   }
 }

 function salvarTimeCampeonatoInterno_(payload, semResposta) {
   const sessao = sessaoCampeonato_();
   const dados = payload || {};
   const campeonatoId = String(dados.campeonatoId || '').trim();
   const campeonatos = campeonatos_();
   const campeonato = campeonatos.filter(function (item) {
     return item.id === campeonatoId;
   })[0];

   if (!campeonato) {
     throw new Error('Escolha um campeonato válido.');
   }

   const existente = limparEspacos_(dados.equipeExistente);
   const novo = limparEspacos_(dados.equipeNova);

   if (!existente && !novo) {
     throw new Error('Escolha uma equipe existente ou informe um novo time.');
   }

   if (existente && novo) {
     throw new Error('Escolha uma equipe existente ou digite uma nova, não os dois ao mesmo tempo.');
   }

   const nomeFinal = novo || existente;
   const globais = obterEquipes_().slice();
   const jaExisteGlobal = globais.some(function (nome) {
     return chaveEquipe_(nome) === chaveEquipe_(nomeFinal);
   });

   if (!jaExisteGlobal) {
     marcarSnapshotsEsportivosPendentes_();
     globais.push(nomeFinal);

     const validas = higienizarEquipes_(globais);

     PropertiesService.getScriptProperties()
       .setProperty(CONFIG.equipes.chaveLista, JSON.stringify(validas));

     publicarEquipes_(validas);
   }

   const lista = timesCampeonato_(campeonatoId).slice();
   const repetido = lista.some(function (nome) {
     return chaveEquipe_(nome) === chaveEquipe_(nomeFinal);
   });

   if (repetido) {
     throw new Error('Este time já está vinculado a este campeonato.');
   }

   lista.push(nomeFinal);

   gravarTimesCampeonato_(campeonatoId, lista);
   equipesRegistro_(true);

   if (semResposta) return;
   const tela = listarTimesCampeonato(campeonatoId);
   tela.recado = 'Time vinculado ao campeonato: ' + nomeFinal;
   return tela;
 }

 function removerTimeCampeonato(campeonatoId, nome) {
   sessaoCampeonato_();
   equipesRegistro_();
   const lock = LockService.getScriptLock();
   lock.waitLock(30000);
   try {
     return removerTimeCampeonatoInterno_(campeonatoId, nome);
   } finally {
     lock.releaseLock();
   }
 }

 function removerTimeCampeonatoInterno_(campeonatoId, nome) {
   sessaoCampeonato_();

   const id = String(campeonatoId || '').trim();
   const alvo = chaveEquipe_(nome);

   if (!id || !alvo) {
     throw new Error('Informe o campeonato e o time a remover.');
   }
   if (!campeonatos_().some(function (item) { return item.id === id; })
       || !timesCampeonato_(id).some(function (item) { return chaveEquipe_(item) === alvo; })) {
     throw new Error('Esta equipe não está vinculada a este campeonato.');
   }
   impedirRemocaoEquipeTabela_(id, alvo);

    const atletasVinculados = atletasCampeonato_(id).filter(function (item) {
      return chaveEquipe_(item.timeVinculado) === alvo;
    });
    const membrosVinculados = comissaoTecnicaCampeonato_(id).filter(function (item) {
      return chaveEquipe_(item.timeVinculado) === alvo;
    });

    if (atletasVinculados.length || membrosVinculados.length) {
      throw new Error('Não é possível remover este time porque ele possui '
        + atletasVinculados.length + ' atleta(s) e '
        + membrosVinculados.length + ' membro(s) da comissão vinculados.');
    }

   const lista = timesCampeonato_(id).filter(function (item) {
     return chaveEquipe_(item) !== alvo;
   });
   gravarTimesCampeonato_(id, lista);

   const tela = listarTimesCampeonato(id);
   tela.recado = 'Time removido do campeonato: ' + nome;
   return tela;
 }

 /******************************************************
  * ATLETAS DO CAMPEONATO
  ******************************************************/

  const ATLETAS_CAMPEONATO_POSICOES = ['Indefinida', 'Goleiro', 'Zagueiro', 'Lateral', 'Meia', 'Atacante'];

 function chaveAtletasCampeonato_(campeonatoId) {
   return CAMPEONATO_ATLETAS_CHAVE + String(campeonatoId || '').trim();
 }

 function atletasCampeonato_(campeonatoId, persistirIds, recursos) {
   const lista = lerElencoBrutoOperacao_(campeonatoId, 'atletas', recursos);
   garantirIdsHistoricoElenco_(campeonatoId, 'atletas', lista, persistirIds, recursos);

      return lista.filter(function (item) {
        return item && typeof item === 'object' && String(item.nome || '').trim();
      }).map(function (item) {
        return {
          id: String(item.id || '').trim() || gerarIdUnico_(),
          nome: limparCampo_(item.nome || '', 100),
          apelido: limparCampo_(item.apelido || '', 50),
          numero: String(item.numero || '').trim() === '' ? '' : Number(item.numero),
          posicao: String(item.posicao || '').trim() || 'Indefinida',
          timeVinculado: String(item.timeVinculado || '').trim(),
          cpf: String(item.cpf || '').trim(),
          rg: String(item.rg || '').trim(),
          foto: String(item.foto || '').trim(),
          dataNascimento: String(item.dataNascimento || '').trim(),
          ativo: Boolean(item.ativo !== false)
        };
      });
 }

  function gravarAtletasCampeonato_(campeonatoId, lista, recursos, historicoPreparado, listasPreparadas) {
    const validos = (lista || []).filter(function (item) {
      return item && typeof item === 'object' && String(item.nome || '').trim();
    }).map(function (item) {
      return {
        id: String(item.id || '').trim() || gerarIdUnico_(),
        nome: limparCampo_(item.nome || '', 100),
        apelido: limparCampo_(item.apelido || '', 50),
        numero: String(item.numero || '').trim() === '' ? '' : Number(item.numero),
        posicao: String(item.posicao || '').trim() || 'Indefinida',
        timeVinculado: String(item.timeVinculado || '').trim(),
        cpf: String(item.cpf || '').trim(),
        rg: String(item.rg || '').trim(),
        foto: String(item.foto || '').trim(),
        dataNascimento: String(item.dataNascimento || '').trim(),
        ativo: Boolean(item.ativo !== false)
      };
    });

    gravarElencoComHistorico_(campeonatoId, 'atletas', validos, historicoPreparado, listasPreparadas, recursos);
  }

 function listarAtletasCampeonato() {
   sessaoCampeonato_();

   const campeonatos = campeonatosResumo_();

   return {
     campeonatos: campeonatos,
     times: (function () {
       const times = {};

       campeonatos.forEach(function (campeonato) {
         times[campeonato.id] = timesCampeonato_(campeonato.id) || [];
       });

       return times;
     })(),
     registros: campeonatos.map(function (campeonato) {
       const atletas = atletasCampeonato_(campeonato.id);
       const times = timesCampeonato_(campeonato.id) || [];
       anotarVinculoCompeticaoAtletas_(campeonato, atletas, atletas.length ? jogosParticipacaoOperacao_(campeonato.id) : []);

       return {
         campeonatoId: campeonato.id,
         campeonatoNome: campeonato.nome,
         temporada: campeonato.temporada,
         status: campeonato.status,
         total: atletas.length,
         atletas: atletas,
         times: times
       };
     }),
      posicoes: ATLETAS_CAMPEONATO_POSICOES.slice(),
     podeEditar: true
   };
 }

function validarDataNascimentoCampeonato_(valor, contexto) {
  const texto = limparCampo_(valor, 10);
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!partes) {
    throw new Error('Informe a data de nascimento ' + contexto + '.');
  }

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(ano, mes - 1, dia);

  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    throw new Error('A data de nascimento informada ' + contexto + ' não existe no calendário.');
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (data > hoje) {
    throw new Error('A data de nascimento informada ' + contexto + ' não pode ser futura.');
  }

  if (ano < 1900) {
    throw new Error('Confira a data de nascimento informada ' + contexto + '.');
  }

  return partes[1] + '-' + partes[2] + '-' + partes[3];
}

function validarCpfCadastroCampeonato_(valor, contexto) {
  const cpf = somenteDigitos_(valor || '');

  if (!cpfValido_(cpf)) {
    throw new Error('Informe um CPF válido ' + contexto + '.');
  }

  return cpf;
}

function validarTimeVinculadoCampeonato_(campeonatoId, valor, contexto, recursos) {
  const timeVinculado = limparCampo_(valor || '', 100);

  if (!timeVinculado) {
    throw new Error('Selecione o time vinculado ' + contexto + '.');
  }

  const times = timesCampeonatoOperacao_(campeonatoId, recursos) || [];
  if (!times.some(function (t) {
    return chaveEquipe_(t) === chaveEquipe_(timeVinculado);
  })) {
    throw new Error('Time não encontrado neste campeonato.');
  }

  return timeVinculado;
}

function existeCpfNoCadastro_(lista, cpf, idIgnorado) {
  return (lista || []).some(function (item) {
    if (idIgnorado && item.id === idIgnorado) {
      return false;
    }

    return somenteDigitos_(item.cpf || '') === cpf;
  });
}

function validarCpfUnicoEntreCadastros_(campeonatoId, cpf, origem, idIgnorado, recursos) {
  const indice = consultarIndiceValidacao_(campeonatoId, recursos, origem === 'atleta' ? 'comissao' : 'atletas');
  if (indice) {
    const tipo = origem === 'atleta' ? 'comissao' : 'atletas';
    const duplicado = (indice.cadastros[tipo][somenteDigitos_(cpf)] || []).some(function (item) {
      return !idIgnorado || item[0] !== idIgnorado;
    });
    if (duplicado) throw new Error('Este CPF já está cadastrado na '
      + (origem === 'atleta' ? 'comissão técnica' : 'lista de atletas') + ' deste campeonato.');
    return;
  }
  const outraLista = medirRecursoCadastro_(recursos, 'lock_cpf_categorias', function () {
    if (elencosParticionadosCutoverAtivo_()) {
      return lerElencoParticionado_(campeonatoId, origem === 'atleta' ? 'comissao' : 'atletas');
    }
    return origem === 'atleta'
      ? comissaoTecnicaCampeonato_(campeonatoId, false, recursos)
      : atletasCampeonato_(campeonatoId, false, recursos);
  });

  if (existeCpfNoCadastro_(outraLista, cpf, idIgnorado)) {
    throw new Error('Este CPF já está cadastrado na ' + (origem === 'atleta' ? 'comissão técnica' : 'lista de atletas') + ' deste campeonato.');
  }
}

function validarDuplicataCadastroOperacao_(campeonatoId, tipo, nome, cpf, lista, idIgnorado, recursos) {
  const duplicataLocal = tipo === 'atletas'
    ? validarDuplicataAtleta_(nome, cpf, lista, idIgnorado)
    : validarDuplicataComissao_(nome, cpf, lista, idIgnorado);
  if (!duplicataLocal.ok) return duplicataLocal;
  if (!elencosParticionadosCutoverAtivo_()) {
    return duplicataLocal;
  }
  const indice = consultarIndiceValidacao_(campeonatoId, recursos, tipo);
  if (!indice) {
    const completa = lerElencoParticionado_(campeonatoId, tipo);
    return tipo === 'atletas'
      ? validarDuplicataAtleta_(nome, cpf, completa, idIgnorado)
      : validarDuplicataComissao_(nome, cpf, completa, idIgnorado);
  }
  const cpfLimpo = somenteDigitos_(cpf || '');
  const duplicadoCpf = (indice.cadastros[tipo][cpfLimpo] || []).some(function (item) {
    return !idIgnorado || item[0] !== idIgnorado;
  });
  if (duplicadoCpf) {
    return { ok: false, motivo: tipo === 'atletas'
      ? 'CPF já cadastrado: este CPF já pertence a outro atleta neste campeonato.'
      : 'CPF já cadastrado: este CPF já pertence a outro comissionado neste campeonato.' };
  }
  const nomeSimilar = Object.keys(indice.nomes[tipo]).some(function (nomeIndice) {
    return nomeSimilar_(nome, nomeIndice) && indice.nomes[tipo][nomeIndice].some(function (item) {
      return !idIgnorado || item[0] !== idIgnorado;
    });
  });
  if (nomeSimilar) {
    return { ok: false, motivo: tipo === 'atletas'
      ? 'Nome similar já cadastrado: existe um atleta com nome muito parecido. Verifique se não é duplicata.'
      : 'Nome similar já cadastrado: existe um comissionado com nome muito parecido. Verifique se não é duplicata.' };
  }
  return { ok: true, motivo: '' };
}

function contatoResponsavelEquipeConflito_(equipe) {
  const bruto = PropertiesService.getScriptProperties().getProperty(chaveConsultaAssociado_(equipe));
  if (!bruto) return { nome: 'responsável não cadastrado', telefone: 'telefone não informado' };
  let registro;
  try { registro = JSON.parse(bruto); }
  catch (e) { throw new Error('O cadastro publicado de contato da equipe ' + equipe + ' está inválido. Peça à administração que o corrija.'); }
  if (!registro || typeof registro !== 'object' || Array.isArray(registro)
      || typeof registro.equipe !== 'string' || chaveEquipe_(registro.equipe) !== chaveEquipe_(equipe)) {
    throw new Error('O cadastro publicado de contato da equipe ' + equipe + ' está inconsistente. Peça à administração que o corrija.');
  }
  return {
    nome: typeof registro.nome === 'string' && registro.nome.trim() ? registro.nome.trim() : 'responsável não cadastrado',
    telefone: typeof registro.telefone === 'string' && registro.telefone.trim()
      ? registro.telefone.trim() : 'telefone não informado'
  };
}

function bloquearCpfAtletaEmOutraEquipe_(contexto, cpf, lista, atletaIdIgnorado, recursos) {
  if (!contexto || contexto.sessao.usuario.perfil !== 'associado') return;
  let atual;
  const indice = elencosParticionadosCutoverAtivo_()
    ? consultarIndiceValidacao_(contexto.campeonato.id, recursos, 'atletas') : null;
  if (indice) {
    const conflito = (indice.cadastros.atletas[somenteDigitos_(cpf)] || []).find(function (item) {
      return (!atletaIdIgnorado || item[0] !== atletaIdIgnorado)
        && item[1] !== chaveEquipe_(contexto.equipe.nome) && item[2];
    });
    if (conflito) atual = { timeVinculado: conflito[2] };
  } else {
    const candidatos = elencosParticionadosCutoverAtivo_()
      ? lerElencoParticionado_(contexto.campeonato.id, 'atletas') : lista;
    atual = candidatos.find(function (item) {
      return (!atletaIdIgnorado || item.id !== atletaIdIgnorado)
        && somenteDigitos_(item.cpf || '') === somenteDigitos_(cpf)
        && String(item.timeVinculado || '').trim()
        && chaveEquipe_(item.timeVinculado) !== chaveEquipe_(contexto.equipe.nome);
    });
  }
  if (!atual) return;
  const contato = contatoResponsavelEquipeConflito_(atual.timeVinculado);
  throw new Error('Este atleta já está cadastrado na equipe ' + atual.timeVinculado
    + ' neste campeonato. Responsável: ' + contato.nome + '. Telefone: ' + contato.telefone + '.');
}

 function salvarAtletaCampeonato(payload) {
   sessaoCampeonato_();
   return salvarAtletaCampeonatoInterno_(payload);
 }

 function salvarAtletaCampeonatoInterno_(payload, contexto, solicitacaoElenco) {
   let inicioValidacao = Date.now();
   const dados = payload || {};
   const campeonatoId = String(dados.campeonatoId || '').trim();
   // No salvamento do elenco, só a validação sob lock produz o campeonato autorizado.
   const campeonato = solicitacaoElenco ? null
     : contexto && contexto.campeonato.id === campeonatoId ? contexto.campeonato
     : campeonatos_().filter(function (item) {
       return item.id === campeonatoId;
     })[0];

   if (!solicitacaoElenco && !campeonato) {
     throw new Error('Escolha um campeonato válido.');
   }

   const nome = limparCampo_(dados.nome || '', 100);
   const apelido = limparCampo_(dados.apelido || '', 50);
    const numeroInformado = String(dados.numero || '').trim();
    const numero = numeroInformado === '' ? '' : Number(numeroInformado);
   const posicao = String(dados.posicao || 'Indefinida').trim();
    let timeVinculado = solicitacaoElenco ? '' : validarTimeVinculadoCampeonato_(campeonatoId, dados.timeVinculado, 'do atleta');
    const cpf = validarCpfCadastroCampeonato_(dados.cpf, 'do atleta');
   const rg = limparCampo_(dados.rg || '', 30);
   const foto = String(dados.foto || '').trim();
    const dataNascimento = validarDataNascimentoCampeonato_(dados.dataNascimento, 'do atleta');

   if (!nome) {
     throw new Error('Informe o nome do atleta.');
   }

    if (ATLETAS_CAMPEONATO_POSICOES.indexOf(posicao) === -1) {
      throw new Error('Escolha uma posição válida para o atleta.');
   }

    if (numeroInformado !== '' && (isNaN(numero) || numero < 0 || numero > 99)) {
     throw new Error('O número da camisa deve ficar entre 0 e 99.');
   }


    if (!foto) {
      throw new Error('Envie a foto do atleta.');
   }

   const lock = LockService.getScriptLock();
   registrarTempoCadastro_('validacao_leitura', inicioValidacao);
   medirFaseCadastro_('espera_lock', function () { lock.waitLock(30000); });
   let tela;
   const recursos = {};

   try {
     inicioValidacao = Date.now();
     const contextoAtual = validarAlvoElenco_(contexto, 'atletas', '', recursos, solicitacaoElenco);
     if (solicitacaoElenco) timeVinculado = validarTimeVinculadoCampeonato_(
       campeonatoId, contextoAtual.equipe.nome, 'do atleta', recursos);
     const campeonatoAtual = contextoAtual ? contextoAtual.campeonato : campeonato;
     const lista = medirRecursoCadastro_(recursos, 'lock_elenco_leitura', function () {
       return atletasCampeonato_(campeonatoId, false, recursos).slice();
     });
      bloquearCpfAtletaEmOutraEquipe_(contextoAtual, cpf, lista, '', recursos);
      const validacaoDuplicata = validarDuplicataCadastroOperacao_(
        campeonatoId, 'atletas', nome, cpf, lista, '', recursos);

      if (!validacaoDuplicata.ok) {
        throw new Error(validacaoDuplicata.motivo);
     }

      validarCpfUnicoEntreCadastros_(campeonatoId, cpf, 'atleta', '', recursos);
      medirRecursoCadastro_(recursos, 'lock_participacao', function () {
        bloquearVinculoAtletaParticipante_(campeonatoAtual, jogosParticipacaoOperacao_(campeonatoId, recursos),
          cpf, timeVinculado, contextoAtual, contextoAtual ? recursos.equipes : null);
      });

     const novoAtleta = {
       id: gerarIdUnico_(),
       nome: nome,
       apelido: apelido,
       numero: numero,
       posicao: posicao,
       timeVinculado: timeVinculado,
       cpf: cpf,
       rg: rg,
       foto: foto,
        dataNascimento: dataNascimento,
       ativo: true
     };

     lista.push(novoAtleta);

     registrarTempoCadastro_('validacao_leitura', inicioValidacao);
     gravarAtletasCampeonato_(campeonatoId, lista, recursos);
     if (contextoAtual) tela = medirFaseCadastro_('resposta', function () {
       return montarRespostaElenco_(contextoAtual, recursos.listas[campeonatoId], recursos);
     });
   } finally {
     delete recursos.arquivosDrive;
     lock.releaseLock();
   }

    if (!tela) tela = medirFaseCadastro_('resposta', function () { return respostaCadastro_(contexto); });
   tela.recado = 'Atleta ' + nome + ' adicionado ao campeonato. O histórico será consolidado em segundo plano.';
   return tela;
 }

 function removerAtletaCampeonato(campeonatoId, atletaId) {
   sessaoCampeonato_();
   return removerAtletaCampeonatoInterno_(campeonatoId, atletaId);
 }

 function removerAtletaCampeonatoInterno_(campeonatoId, atletaId, contexto, solicitacaoElenco) {
   return removerPessoaCampeonatoInterno_(campeonatoId, atletaId, 'atletas', contexto, solicitacaoElenco);
 }

  function atualizarAtletaCampeonato(payload) {
     sessaoCampeonato_();
     return atualizarAtletaCampeonatoInterno_(payload);
   }

  function atualizarAtletaCampeonatoInterno_(payload, contexto, solicitacaoElenco) {
     let inicioValidacao = Date.now();
     const dados = payload || {};
     const campeonatoId = String(dados.campeonatoId || '').trim();
     const atletaId = String(dados.atletaId || '').trim();

     if (!campeonatoId || !atletaId) {
       throw new Error('Informe campeonato e atleta válidos.');
     }

     const nome = limparCampo_(dados.nome || '', 100);
     const apelido = limparCampo_(dados.apelido || '', 50);
      const numeroInformado = String(dados.numero || '').trim();
      const numero = numeroInformado === '' ? '' : Number(numeroInformado);
     const posicao = String(dados.posicao || 'Indefinida').trim();
      let timeVinculado = solicitacaoElenco ? '' : validarTimeVinculadoCampeonato_(campeonatoId, dados.timeVinculado, 'do atleta');
      const cpf = validarCpfCadastroCampeonato_(dados.cpf, 'do atleta');
     const ativo = Boolean(dados.ativo !== false);
     const rg = limparCampo_(dados.rg || '', 30);
     const foto = String(dados.foto || '').trim();
      const dataNascimento = validarDataNascimentoCampeonato_(dados.dataNascimento, 'do atleta');

     if (!nome) {
       throw new Error('Informe o nome do atleta.');
     }

      if (ATLETAS_CAMPEONATO_POSICOES.indexOf(posicao) === -1) {
        throw new Error('Escolha uma posição válida para o atleta.');
      }

      if (numeroInformado !== '' && (isNaN(numero) || numero < 0 || numero > 99)) {
       throw new Error('O número da camisa deve ficar entre 0 e 99.');
     }


     const lock = LockService.getScriptLock();
     registrarTempoCadastro_('validacao_leitura', inicioValidacao);
     medirFaseCadastro_('espera_lock', function () { lock.waitLock(30000); });
     let tela;
     const recursos = {};

     try {
       inicioValidacao = Date.now();
       const contextoAtual = validarAlvoElenco_(contexto, 'atletas', atletaId, recursos, solicitacaoElenco);
       if (solicitacaoElenco) timeVinculado = validarTimeVinculadoCampeonato_(
         campeonatoId, contextoAtual.equipe.nome, 'do atleta', recursos);
       const lista = recursos.listaValidacao || medirRecursoCadastro_(recursos, 'lock_elenco_leitura', function () {
         return atletasCampeonato_(campeonatoId, false, recursos);
       });
       const atletaExistente = lista.find(function (a) { return a.id === atletaId; });

       if (!atletaExistente) {
         throw new Error('Atleta não encontrado neste campeonato.');
       }

        if (!foto && !atletaExistente.foto) {
          throw new Error('Envie a foto do atleta.');
       }

        bloquearCpfAtletaEmOutraEquipe_(contextoAtual, cpf, lista, atletaId, recursos);
        const validacaoDuplicata = validarDuplicataCadastroOperacao_(
          campeonatoId, 'atletas', nome, cpf, lista, atletaId, recursos);
        if (!validacaoDuplicata.ok) {
          throw new Error(validacaoDuplicata.motivo);
        }

        validarCpfUnicoEntreCadastros_(campeonatoId, cpf, 'atleta', '', recursos);

        // A identidade de origem (ID/CPF atuais) é verificada antes de aceitar novo CPF ou equipe.
        if (cpf !== somenteDigitos_(atletaExistente.cpf || '')
            || chaveEquipe_(timeVinculado) !== chaveEquipe_(atletaExistente.timeVinculado)) {
          medirRecursoCadastro_(recursos, 'lock_participacao', function () {
            // Com contexto, campeonatos e equipes foram relidos sob este mesmo lock.
            const campeonato = (contextoAtual ? recursos.campeonatos : campeonatos_())
              .find(function (item) { return item.id === campeonatoId; });
            if (!campeonato) {
              throw new Error('Campeonato não encontrado.');
            }
            const jogos = jogosParticipacaoOperacao_(campeonatoId, recursos);
            if (atletaParticipouCompeticao_(jogos, atletaExistente)) {
              throw new Error(mensagemVinculoCompeticao_(atletaExistente, campeonato, 'não pode ter a equipe nem o CPF alterados'));
            }
            bloquearVinculoAtletaParticipante_(campeonato, jogos, cpf, timeVinculado, contextoAtual,
              contextoAtual ? recursos.equipes : null);
          });
        }

       const novaLista = lista.map(function (item) {
         if (item.id === atletaId) {
           return {
             id: atletaId,
             nome: nome,
             apelido: apelido,
             numero: numero,
             posicao: posicao,
             timeVinculado: timeVinculado,
              cpf: cpf,
              rg: rg,
              foto: foto || item.foto,
              dataNascimento: dataNascimento,
             ativo: ativo
           };
         }

         return item;
       });

       registrarTempoCadastro_('validacao_leitura', inicioValidacao);
       gravarAtletasCampeonato_(campeonatoId, novaLista, recursos);
       if (contextoAtual) tela = medirFaseCadastro_('resposta', function () {
         return montarRespostaElenco_(contextoAtual, recursos.listas[campeonatoId], recursos);
       });
     } finally {
       delete recursos.arquivosDrive;
       lock.releaseLock();
     }

      if (!tela) tela = medirFaseCadastro_('resposta', function () { return respostaCadastro_(contexto); });
     tela.recado = 'Atleta ' + nome + ' atualizado com sucesso. O histórico será consolidado em segundo plano.';
     return tela;
   }

  /******************************************************
   * COMISSÃO TÉCNICA DO CAMPEONATO
   ******************************************************/

  const COMISSAO_CARGOS = ['Massagista', 'Médico', 'Diretoria', 'Treinador', 'Auxiliar Técnico', 'Preparador Físico', 'Preparador de Goleiros', 'Fisioterapeuta'];

  function validarCargoComissao_(valor, membroExistente) {
    const cargo = String(valor || '').trim();
    if (COMISSAO_CARGOS.indexOf(cargo) !== -1
        || (membroExistente && cargo === membroExistente.cargo)) return cargo;
    throw new Error('Selecione um cargo válido para a comissão técnica.');
  }

  function chaveComissaoCampeonato_(campeonatoId) {
    return chaveComissaoTecnicaCampeonato_(campeonatoId);
  }

function listarCadastroPessoasCampeonato() {
  sessaoCampeonato_();

  const campeonatos = campeonatosResumo_();
  const times = {};

  const registros = campeonatos.map(function (campeonato) {
    const timesDoCampeonato = timesCampeonato_(campeonato.id) || [];
    times[campeonato.id] = timesDoCampeonato;
    const atletas = atletasCampeonato_(campeonato.id);
    anotarVinculoCompeticaoAtletas_(campeonato, atletas, atletas.length ? jogosParticipacaoOperacao_(campeonato.id) : []);

    return {
      campeonatoId: campeonato.id,
      campeonatoNome: campeonato.nome,
      temporada: campeonato.temporada,
      status: campeonato.status,
      times: timesDoCampeonato,
      atletas: atletas,
      comissao: comissaoTecnicaCampeonato_(campeonato.id)
    };
  });

  return {
    campeonatos: campeonatos,
    times: times,
    registros: registros,
    posicoes: ATLETAS_CAMPEONATO_POSICOES.slice(),
    cargos: COMISSAO_CARGOS.slice(),
    podeEditar: true
  };
}

  function comissaoCampeonato_(campeonatoId) {
    const lista = lerElencoBrutoOperacao_(campeonatoId, 'comissao');

      return lista.filter(function (item) {
        return item && typeof item === 'object' && String(item.nome || '').trim();
      }).map(function (item) {
        return {
          id: String(item.id || '').trim() || gerarIdUnico_(),
          nome: limparCampo_(item.nome || '', 100),
          cargo: String(item.cargo || '').trim() || 'Comissão Técnica',
          cpf: String(item.cpf || '').trim(),
          foto: String(item.foto || '').trim(),
          dataNascimento: String(item.dataNascimento || '').trim(),
          telefone: String(item.telefone || '').trim(),
          email: String(item.email || '').trim(),
          timeVinculado: String(item.timeVinculado || '').trim(),
          ativo: Boolean(item.ativo !== false)
        };
      });
  }

  function gravarComissaoCampeonato_(campeonatoId, lista) {
    const validos = (lista || []).filter(function (item) {
      return item && typeof item === 'object' && String(item.nome || '').trim();
    }).map(function (item) {
      return {
        id: String(item.id || '').trim() || gerarIdUnico_(),
        nome: limparCampo_(item.nome || '', 100),
        cargo: String(item.cargo || '').trim() || 'Comissão Técnica',
        cpf: somenteDigitos_(item.cpf || ''),
        rg: limparCampo_(item.rg || '', 30),
        foto: String(item.foto || '').trim(),
        dataNascimento: String(item.dataNascimento || '').trim(),
        telefone: somenteDigitos_(item.telefone || ''),
        email: String(item.email || '').trim().toLowerCase(),
        timeVinculado: String(item.timeVinculado || '').trim(),
        ativo: Boolean(item.ativo !== false)
      };
    });

    gravarElencoComHistorico_(campeonatoId, 'comissao', validos);
  }

  function listarComissaoCampeonato() {
    sessaoCampeonato_();

    const campeonatos = campeonatosResumo_();

    return {
      campeonatos: campeonatos,
      times: (function () {
        const times = {};

        campeonatos.forEach(function (campeonato) {
          times[campeonato.id] = timesCampeonato_(campeonato.id) || [];
        });

        return times;
      })(),
      cargos: COMISSAO_CARGOS.map(function (cargo) {
        return { id: cargo, nome: cargo };
      }),
      registros: campeonatos.map(function (campeonato) {
        const comissao = comissaoCampeonato_(campeonato.id);
        const times = timesCampeonato_(campeonato.id) || [];

        return {
          campeonatoId: campeonato.id,
          campeonatoNome: campeonato.nome,
          temporada: campeonato.temporada,
          status: campeonato.status,
          total: comissao.length,
          membros: comissao,
          times: times
        };
      })
    };
  }

  /******************************************************
   * SOLICITACOES DE INSCRICAO, REMOCAO E PORTABILIDADE
 *
 * Somente leitura. Quem escreve os arquivos e o formulario publico
 * (apps-scripts/inscricao-portabilidade), que grava o TXT em "Entrada";
 * depois a automacao em Python move o arquivo para "Processados" ou
 * "Falhas" conforme o resultado. Por isso a pasta onde o arquivo esta
 * e o proprio status da solicitacao: nao existe outro lugar guardando
 * esse estado, e nada precisa ser sincronizado.
 ******************************************************/

/**
 * Pastas lidas, na ordem em que aparecem no filtro da tela.
 * A ordem tambem define a prioridade quando o mesmo protocolo aparece
 * em duas pastas (situacao rara, so acontece durante uma movimentacao).
 */
const SOLICITACOES_PASTAS = [
  { pasta: 'Entrada', situacao: 'Aguardando', icone: '🕒' },
  { pasta: 'Processados', situacao: 'Processada', icone: '🟢' },
  { pasta: 'Falhas', situacao: 'Falha', icone: '🔴' }
];

/** Acoes possiveis em cada registro, como gravadas no TXT pelo formulario. */
const SOLICITACOES_ACOES = ['Inclusao', 'Remocao', 'Portabilidade'];

/**
 * Devolve as solicitacoes para a tela de consulta.
 * Chamada pelo cliente; refaz a verificacao de permissao no servidor.
 * @return {{registros: Array<Object>, situacoes: Array<Object>, total: number,
 *           limite: number, pastaUrl: string}}
 */
function listarSolicitacoes() {
  return lerSolicitacoes_(false);
}

function lerSolicitacoes_(paraAtletas) {
  const metricas = criarMetricasFonteAtleta_(paraAtletas, 'solicitacoes');
  return medirFonteAtleta_(metricas, 'leitura', function () {
    medirFonteAtleta_(metricas, 'autorizacao', function () {
      const sessao = identificarUsuario_();

      if (!sessao.autorizado || !moduloLiberado_('solicitacoes', sessao.usuario.perfil)) {
        throw new Error('Você não tem permissão para consultar as solicitacoes de inscrição.');
      }
    });

    const raiz = medirFonteAtleta_(metricas, 'localizar', pastaSolicitacoes_);
    const achados = [];
    const nomesVistos = {};

    medirFonteAtleta_(metricas, 'enumerar', function () {
      SOLICITACOES_PASTAS.forEach(function (origem) {
        const pastas = raiz.getFoldersByName(origem.pasta);

        // A pasta tambem recebe PDFs e anexos; so os TXT das inscricoes interessam.
        // O formulario nomeia o arquivo como "<EQUIPE>-<data>-<milissegundos>.txt"
        if (!pastas.hasNext()) {
          return;
        }

        const iterador = pastas.next().getFiles();

        while (iterador.hasNext()) {
          const arquivo = iterador.next();
          const nome = arquivo.getName();

          // Arquivo de solicitacao tem carimbo de millisegundos no final do nome
          if (carimboDoNome_(nome) === 0) {
            continue;
          }

          nomesVistos[nome] = true;
          achados.push({
            arquivo: arquivo,
            nome: nome,
            situacao: origem.situacao,
            icone: origem.icone,
            ordem: carimboDoNome_(nome)
          });
        }
      });

      // Arquivos na raiz da pasta que ainda aguardam processamento pela automacao.
      const iteradorRaiz = raiz.getFiles();
      while (iteradorRaiz.hasNext()) {
        const arquivo = iteradorRaiz.next();
        const nome = arquivo.getName();

        if (carimboDoNome_(nome) === 0 || nomesVistos[nome]) {
          continue;
        }

        nomesVistos[nome] = true;
        achados.push({
          arquivo: arquivo,
          nome: nome,
          situacao: 'Aguardando',
          icone: '🕒',
          ordem: carimboDoNome_(nome)
        });
      }

      // Mais recentes primeiro. O nome do arquivo termina com o horario do
      // envio em milissegundos, entao da para ordenar sem abrir nenhum deles.
      achados.sort(function (a, b) {
        return b.ordem - a.ordem;
      });
    });

    const limite = CONFIG.solicitacoes.maxLeitura;
    const selecionados = achados.slice(0, limite);
    const nomesResultados = {};
    selecionados.forEach(function (achado) { nomesResultados[nomeBase_(achado.nome)] = true; });
    const resultados = medirFonteAtleta_(metricas, 'resultados', function () {
      return indiceResultados_(raiz, paraAtletas ? nomesResultados : null);
    });
    const registros = selecionados.map(function (achado) {
      achado.resultado = resultados[nomeBase_(achado.nome)] || null;
      const conteudo = lerTextoFonteAtleta_(achado.arquivo, metricas);
      return medirFonteAtleta_(metricas, 'interpretar', function () {
        return interpretarSolicitacao_(conteudo, achado, paraAtletas, metricas);
      });
    });

    registrarMetricasFonteAtleta_(metricas, achados.length, registros.length);
    return {
      registros: registros,
      situacoes: SOLICITACOES_PASTAS,
      acoes: SOLICITACOES_ACOES,
      total: achados.length,
      limite: limite,
      pastaUrl: raiz.getUrl()
    };
  });
}

/**
 * Pasta raiz das inscricoes, a mesma usada pelo formulario publico e
 * pela automacao em Python (config.ini, secao [drive]).
 * @return {DriveApp.Folder}
 */
function pastaSolicitacoes_() {
  try {
    return DriveApp.getFolderById(CONFIG.solicitacoes.pastaRaizId);
  } catch (e) {
    throw new Error('Não foi possível abrir a pasta das inscricoes no Drive (id '
      + CONFIG.solicitacoes.pastaRaizId + '). Verifique se o seu e-mail tem acesso a ela. '
      + 'Detalhe: ' + (e && e.message ? e.message : e));
  }
}

/**
 * Indexa a pasta "Resultados" pelo nome do arquivo de origem.
 *
 * A automacao em Python publica ali o TXT e o PDF de cada processamento,
 * nomeados como "<arquivo de origem sem extensao>-resultado-<carimbo>".
 * E por esse indice que a tela consegue mostrar o resultado — e o motivo
 * de cada falha — ao lado da solicitacao correspondente.
 *
 * A pasta so existe depois da primeira execucao da automacao; a ausencia
 * dela nao e erro, apenas deixa as solicitacoes sem resultado anexado.
 *
 * @param {DriveApp.Folder} raiz Pasta raiz das inscricoes.
 * @return {Object<string, {txtUrl: string, pdfUrl: string}>}
 */
function indiceResultados_(raiz, nomesSelecionados) {
  const indice = {};
  const pastas = raiz.getFoldersByName('Resultados');

  if (!pastas.hasNext()) {
    return indice;
  }

  const arquivos = pastas.next().getFiles();

  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    const nome = arquivo.getName();
    const achado = String(nome).match(/^(.+)-resultado-\d{8}-\d{6}\.(txt|pdf)$/i);

    if (!achado) {
      continue;
    }

    const chave = achado[1];
    if (nomesSelecionados && !nomesSelecionados[chave]) {
      continue;
    }
    const campo = achado[2].toLowerCase() === 'pdf' ? 'pdfUrl' : 'txtUrl';

    if (!indice[chave]) {
      indice[chave] = { txtUrl: '', pdfUrl: '' };
    }

    // Se houver mais de um processamento do mesmo arquivo, fica o mais
    // recente: o carimbo no nome cresce com o tempo.
    if (!indice[chave][campo] || nome > indice[chave][campo + 'Nome']) {
      indice[chave][campo] = arquivo.getUrl();
      indice[chave][campo + 'Nome'] = nome;
    }
  }

  return indice;
}

/**
 * Nome do arquivo sem a extensao, que e a chave usada pelo indice de resultados.
 * @param {string} nome
 * @return {string}
 */
function nomeBase_(nome) {
  return String(nome || '').replace(/\.[^.]+$/, '');
}

/**
 * O formulario nomeia o arquivo como "<EQUIPE>-<data>-<milissegundos>.txt".
 * Ler o carimbo do nome evita abrir o arquivo so para ordenar a lista.
 * @param {string} nome
 * @return {number} Milissegundos do envio, ou 0 quando o nome foge do padrao.
 */
function carimboDoNome_(nome) {
  const achado = String(nome || '').match(/-(\d{10,})\.txt$/i);

  return achado ? Number(achado[1]) : 0;
}

/**
 * Transforma o TXT gerado pelo formulario em um objeto.
 *
 * O arquivo tem duas partes: um cabecalho de linhas "CHAVE: valor" e,
 * depois de "ATLETAS E COMISSAO", um bloco por pessoa iniciado por
 * "REGISTRO 01". Linhas sem ":" (titulos e separadores) sao ignoradas.
 *
 * @param {string} conteudo
 * @param {{situacao: string, icone: string, arquivo: DriveApp.File}} achado
 * @return {Object}
 */
function interpretarSolicitacao_(conteudo, achado, paraAtletas, metricas) {
  const cabecalho = {};
  const pessoas = [];
  let atual = null;

  String(conteudo || '').split(/\r?\n/).forEach(function (linha) {
    const texto = linha.trim();

    if (!texto) {
      return;
    }

    if (/^REGISTRO\s+\d+/i.test(texto)) {
      atual = {};
      pessoas.push(atual);
      return;
    }

    const corte = texto.indexOf(':');

    if (corte === -1) {
      return;
    }

    const chave = texto.slice(0, corte).trim().toUpperCase();
    const valor = texto.slice(corte + 1).trim();

    if (atual) {
      atual[chave] = valor;
    } else {
      cabecalho[chave] = valor;
    }
  });

  const registros = pessoas.map(function (pessoa) {
    return {
      acao: pessoa['ACAO'] || '',
      tipo: pessoa['TIPO'] || '',
      nome: pessoa['NOME COMPLETO'] || '',
      nascimento: valorInformado_(pessoa['DATA DE NASCIMENTO']),
      cpf: valorInformado_(pessoa['CPF']),
      competicaoAnterior: valorInformado_(pessoa['COMPETICAO ANTERIOR'])
    };
  });

  const registro = {
    situacao: achado.situacao,
    protocolo: cabecalho['PROTOCOLO'] || '',
    dataHora: cabecalho['DATA/HORA'] || '',
    ordem: achado.ordem,
    competicao: cabecalho['COMPETICAO'] || '',
    equipe: cabecalho['EQUIPE'] || '',
    responsavel: cabecalho['RESPONSAVEL'] || '',
    arquivoUrl: medirFonteAtleta_(metricas, 'metadados', function () { return achado.arquivo.getUrl(); }),
    resultadoTxtUrl: achado.resultado ? achado.resultado.txtUrl : '',
    resultadoPdfUrl: achado.resultado ? achado.resultado.pdfUrl : '',
    pessoas: registros
  };
  if (paraAtletas) return registro;

  const resumo = {};
  SOLICITACOES_ACOES.forEach(function (acao) {
    resumo[acao] = registros.filter(function (registro) {
      return registro.acao === acao;
    }).length;
  });

  registro.icone = achado.icone;
  registro.telefone = cabecalho['TELEFONE/WHATSAPP'] || '';
  registro.comprovanteUrl = cabecalho['COMPROVANTE PIX'] || '';
  registro.arquivoNome = achado.nome === undefined ? achado.arquivo.getName() : achado.nome;
  registro.quantidade = registros.length;
  registro.resumo = resumo;
  return registro;
}

/**
 * O formulario grava "NAO NECESSARIO" nos campos que a acao dispensa.
 * Na consulta isso vira vazio, para a tela mostrar um travessao.
 * @param {string} valor
 * @return {string}
 */
function valorInformado_(valor) {
  const texto = String(valor == null ? '' : valor).trim();

  return texto === 'NAO NECESSARIO' ? '' : texto;
}

/******************************************************
 * SUMULAS DIGITAIS
 *
 * Consulta as sumulas enviadas pela arbitragem. Segue a mesma ideia da
 * tela de solicitacoes: a pasta em que o arquivo esta e o proprio status,
 * e quem move os arquivos e a automacao em Python (sumula_disciplinar.py).
 * Esta tela so le.
 *
 * A pasta e a mesma usada pelo controle de punicoes
 * (CONFIG.punicoes.pastaSumulasId), so que aqui interessam as subpastas
 * Entrada, Processados e Falhas, e nao a subpasta do controle.
 ******************************************************/

/** Pastas lidas, na ordem em que aparecem no filtro da tela. */
const SUMULAS_PASTAS = [
  { pasta: 'Entrada', situacao: 'Aguardando', icone: '🕒' },
  { pasta: 'Processados', situacao: 'Analisada', icone: '🟢' },
  { pasta: 'Falhas', situacao: 'Falha', icone: '🔴' }
];

/**
 * Devolve as sumulas enviadas para a tela de consulta.
 * Chamada pelo cliente; refaz a verificacao de permissao no servidor.
 * @return {{registros: Array<Object>, situacoes: Array<Object>, equipes: Array<string>,
 *           total: number, limite: number, pastaUrl: string}}
 */
function listarSumulas() {
  return lerSumulas_(false);
}

function lerSumulas_(paraAtletas) {
  const metricas = criarMetricasFonteAtleta_(paraAtletas, 'sumulas');
  return medirFonteAtleta_(metricas, 'leitura', function () {
    medirFonteAtleta_(metricas, 'autorizacao', function () {
      const sessao = identificarUsuario_();

      if (!sessao.autorizado || !moduloLiberado_('sumulas', sessao.usuario.perfil)) {
        throw new Error('Você não tem permissão para consultar as súmulas digitais.');
      }
    });

    const raiz = medirFonteAtleta_(metricas, 'localizar', pastaSumulas_);
    const achados = [];
    const nomesVistos = {};

    medirFonteAtleta_(metricas, 'enumerar', function () {
      SUMULAS_PASTAS.forEach(function (origem) {
        const pastas = raiz.getFoldersByName(origem.pasta);

        // "Processados" e "Falhas" so existem depois que a automacao roda
        // pela primeira vez; a ausencia delas nao e erro.
        if (!pastas.hasNext()) {
          return;
        }

        const iterador = pastas.next().getFiles();

        while (iterador.hasNext()) {
          const arquivo = iterador.next();
          const nome = arquivo.getName();

          // A pasta tambem recebe PDFs e anexos; so os TXT da sumula interessam.
          if (!/^SUMULA_.+\.txt$/i.test(nome)) {
            continue;
          }

          nomesVistos[nome] = true;
          achados.push({
            arquivo: arquivo,
            nome: nome,
            situacao: origem.situacao,
            icone: origem.icone,

            // O nome do arquivo tem a data, mas nao a hora, entao dois envios
            // do mesmo dia ficariam empatados. A data de criacao no Drive e
            // metadado: da para ordenar sem abrir o arquivo.
            ordem: arquivo.getDateCreated().getTime()
          });
        }
      });

      // Arquivos na raiz da pasta que ainda aguardam processamento pela automacao.
      const iteradorRaiz = raiz.getFiles();
      while (iteradorRaiz.hasNext()) {
        const arquivo = iteradorRaiz.next();
        const nome = arquivo.getName();

        if (!/^SUMULA_.+\.txt$/i.test(nome) || nomesVistos[nome]) {
          continue;
        }

        nomesVistos[nome] = true;
        achados.push({
          arquivo: arquivo,
          nome: nome,
          situacao: 'Aguardando',
          icone: '🕒',
          ordem: arquivo.getDateCreated().getTime()
        });
      }

      achados.sort(function (a, b) {
        return b.ordem - a.ordem;
      });
    });

    const limite = CONFIG.sumulas.maxLeitura;
    const registros = achados.slice(0, limite).map(function (achado) {
      const conteudo = lerTextoFonteAtleta_(achado.arquivo, metricas);
      return medirFonteAtleta_(metricas, 'interpretar', function () {
        return interpretarSumula_(conteudo, achado, paraAtletas, metricas);
      });
    });

    // Notas/punidos enriquecem a tela de súmulas, mas o banco já usa listarPunicoes.
    if (!paraAtletas) {
      const notas = indiceNotas_();

      registros.forEach(function (registro) {
        const achado = notas[chaveProtocolo_(registro.protocolo)];

        registro.notas = achado ? achado.notas : [];
        registro.dataNota = achado ? achado.dataNota : '';
        registro.punidos = achado ? achado.punidos : [];
      });
    }

    registrarMetricasFonteAtleta_(metricas, achados.length, registros.length);
    return {
      registros: registros,
      situacoes: SUMULAS_PASTAS,
      equipes: paraAtletas ? [] : equipesDasSumulas_(registros),
      total: achados.length,
      limite: limite,
      pastaUrl: raiz.getUrl()
    };
  });
}

/**
 * Indice protocolo da sumula -> nota oficial que ela gerou.
 *
 * Nao e preciso abrir as notas uma a uma: o controle de punicoes que a
 * automacao publica ja traz a coluna NOTA ao lado da coluna SUMULA. E
 * uma leitura so, do mesmo arquivo que a tela de punicoes ja usa.
 *
 * O controle so existe depois da primeira nota publicada, e a sumula
 * analisada sem infracao nao gera linha nenhuma nele. Nos dois casos a
 * tela continua funcionando, apenas sem o vinculo.
 * @return {Object<string, {notas: Array<string>, dataNota: string, punidos: Array<Object>}>}
 */
function indiceNotas_() {
  let conteudo;

  try {
    conteudo = arquivoPunicoes_().getBlob().getDataAsString('UTF-8');
  } catch (e) {
    return {};
  }

  const indice = {};

  interpretarPunicoes_(conteudo).forEach(function (registro) {
    const chave = chaveProtocolo_(registro.sumula);

    if (!chave) {
      return;
    }

    if (!indice[chave]) {
      indice[chave] = { notas: [], dataNota: registro.dataNota || '', punidos: [] };
    }

    const item = indice[chave];

    // Uma sumula costuma gerar uma nota so, mas uma nota retificadora
    // sobre a mesma partida entraria aqui tambem.
    if (registro.nota && item.notas.indexOf(registro.nota) === -1) {
      item.notas.push(registro.nota);
    }

    item.punidos.push({
      nome: registro.punido,
      equipe: registro.equipe,
      tipo: registro.tipo,
      artigo: registro.artigo,
      decisao: registro.decisao,
      status: registro.status,
      situacao: registro.situacao
    });
  });

  return indice;
}

/**
 * Normaliza o protocolo para comparar a sumula com a coluna SUMULA do
 * controle, que e preenchida a partir do mesmo campo mas pode chegar
 * com espacos ou em caixa diferente.
 * @param {string} valor
 * @return {string}
 */
function chaveProtocolo_(valor) {
  return String(valor == null ? '' : valor).trim().toUpperCase();
}

/**
 * Pasta raiz das sumulas, a mesma usada pelo formulario da arbitragem e
 * pela automacao em Python (config.ini, secao [sumulas]).
 * @return {DriveApp.Folder}
 */
function pastaSumulas_() {
  try {
    return DriveApp.getFolderById(CONFIG.sumulas.pastaRaizId);
  } catch (e) {
    throw new Error('Não foi possível abrir a pasta das súmulas no Drive (id '
      + CONFIG.sumulas.pastaRaizId + '). Verifique se o seu e-mail tem acesso a ela. '
      + 'Detalhe: ' + (e && e.message ? e.message : e));
  }
}

/**
 * Todas as equipes citadas nas sumulas, em ordem alfabetica.
 * Alimenta o filtro por equipe, que considera tanto os times da partida
 * quanto a equipe de cada envolvido.
 * @param {Array<Object>} registros
 * @return {Array<string>}
 */
function equipesDasSumulas_(registros) {
  const equipes = [];

  registros.forEach(function (registro) {
    registro.equipes.forEach(function (equipe) {
      if (equipe && equipes.indexOf(equipe) === -1) {
        equipes.push(equipe);
      }
    });
  });

  return equipes.sort();
}

/**
 * Le o TXT da sumula gerado pelo formulario da arbitragem.
 *
 * O arquivo nao e uma lista de "CHAVE: valor" como o das inscricoes: ele
 * tem secoes, e uma delas ("DOS FATOS") e texto corrido, onde qualquer
 * linha pode ter ":" sem ser um campo. Por isso a leitura acompanha em
 * que secao esta, em vez de olhar linha a linha isoladamente.
 *
 * Secoes, na ordem em que o formulario grava:
 *   (topo)               PROTOCOLO, DATA ENVIO, ARBITRO, DOCUMENTO
 *   PARTIDA              "<MANDANTE> x <VISITANTE>", DATA, HORA
 *   DOS FATOS            relato da arbitragem, texto livre
 *   ENVOLVIDOS           blocos "REGISTRO n" com EQUIPE, TIPO, NOME, CAMISA
 *   SUMULA OFICIAL (PDF) link do PDF, presente so quando o PDF foi gerado
 *
 * @param {string} conteudo
 * @param {{situacao: string, icone: string, ordem: number, arquivo: DriveApp.File}} achado
 * @return {Object}
 */
function interpretarSumula_(conteudo, achado, paraAtletas, metricas) {
  const cabecalho = {};
  const partida = {};
  const pessoas = [];
  const fatos = [];
  let secao = 'topo';
  let atual = null;
  let confronto = '';
  let pdfUrl = '';

  String(conteudo || '').split(/\r?\n/).forEach(function (linha) {
    const texto = linha.trim();

    // Linha de tracos que separa o titulo do conteudo da secao.
    if (/^-{3,}$/.test(texto)) {
      return;
    }

    const titulo = texto.toUpperCase();

    if (titulo === 'PARTIDA') {
      secao = 'partida';
      return;
    }

    if (titulo === 'DOS FATOS') {
      secao = 'fatos';
      return;
    }

    if (titulo === 'ENVOLVIDOS') {
      secao = 'envolvidos';
      return;
    }

    if (titulo.indexOf('SÚMULA OFICIAL') === 0 || titulo.indexOf('SUMULA OFICIAL') === 0) {
      secao = 'pdf';
      return;
    }

    // O relato e copiado como veio, inclusive as quebras de linha: e o
    // texto que a comissao le para decidir a punicao.
    if (secao === 'fatos') {
      if (!paraAtletas) fatos.push(linha.replace(/\s+$/, ''));
      return;
    }

    if (!texto) {
      return;
    }

    if (secao === 'pdf') {
      if (!pdfUrl && /^https?:\/\//i.test(texto)) {
        pdfUrl = texto;
      }
      return;
    }

    if (/^REGISTRO\s+\d+/i.test(texto)) {
      atual = {};
      pessoas.push(atual);
      return;
    }

    const corte = texto.indexOf(':');

    if (corte === -1) {
      // Na secao PARTIDA a linha sem ":" e o confronto "<time> x <time>"
      if (secao === 'partida' && !confronto) {
        confronto = texto;
      }
      return;
    }

    const chave = texto.slice(0, corte).trim().toUpperCase();
    const valor = texto.slice(corte + 1).trim();

    if (atual) {
      atual[chave] = valor;
    } else if (secao === 'partida') {
      partida[chave] = valor;
    } else {
      cabecalho[chave] = valor;
    }
  });

  const times = separarConfronto_(confronto);
  const envolvidos = pessoas.map(function (pessoa) {
    return {
      equipe: pessoa['EQUIPE'] || '',
      tipo: pessoa['TIPO'] || '',
      nome: pessoa['NOME'] || '',
      camisa: pessoa['CAMISA'] || ''
    };
  });

  const registro = {
    situacao: achado.situacao,
    ordem: achado.ordem,
    protocolo: cabecalho['PROTOCOLO'] || '',
    dataEnvio: cabecalho['DATA ENVIO'] || '',
    confronto: confronto,
    dataJogo: partida['DATA'] || '',
    envolvidos: envolvidos,
    pdfUrl: pdfUrl,
    arquivoUrl: medirFonteAtleta_(metricas, 'metadados', function () { return achado.arquivo.getUrl(); })
  };
  if (paraAtletas) return registro;

  const equipes = times.slice();
  envolvidos.forEach(function (envolvido) {
    if (envolvido.equipe && equipes.indexOf(envolvido.equipe) === -1) {
      equipes.push(envolvido.equipe);
    }
  });

  registro.icone = achado.icone;
  registro.arbitro = cabecalho['ÁRBITRO'] || cabecalho['ARBITRO'] || '';
  registro.documento = cabecalho['DOCUMENTO'] || '';
  registro.mandante = times[0] || '';
  registro.visitante = times[1] || '';
  registro.horaJogo = partida['HORA'] || '';
  registro.fatos = aparar_(fatos).join('\n');
  registro.equipes = equipes;
  registro.quantidade = envolvidos.length;
  registro.arquivoNome = achado.nome === undefined ? achado.arquivo.getName() : achado.nome;
  return registro;
}

/**
 * Separa "<mandante> x <visitante>". O corte e feito no primeiro " x "
 * isolado por espacos, para nao quebrar nomes que tenham a letra x.
 * @param {string} confronto
 * @return {Array<string>} Um ou dois nomes; vazio quando nao ha confronto.
 */
function separarConfronto_(confronto) {
  const texto = String(confronto || '').trim();

  if (!texto) {
    return [];
  }

  const achado = texto.match(/^(.+?)\s+x\s+(.+)$/i);

  return achado ? [achado[1].trim(), achado[2].trim()] : [texto];
}

/**
 * Tira as linhas em branco do comeco e do fim de um bloco de texto.
 * @param {Array<string>} linhas
 * @return {Array<string>}
 */
function aparar_(linhas) {
  const copia = linhas.slice();

  while (copia.length && !copia[0].trim()) {
    copia.shift();
  }

  while (copia.length && !copia[copia.length - 1].trim()) {
    copia.pop();
  }

  return copia;
}

/******************************************************
 * ATLETAS CONSOLIDADOS
 ******************************************************/

function medirFaseAtletaBanco_(fase, operacao) {
  if (!CADASTRO_METRICAS_ATIVAS) return operacao();
  const inicio = Date.now();
  try { return operacao(); }
  finally {
    console.log(JSON.stringify({ metrica: 'atleta_banco', fase: fase, duracaoMs: Date.now() - inicio }));
  }
}

function criarMetricasFonteAtleta_(ativa, categoria) {
  return ativa && CADASTRO_METRICAS_ATIVAS
    ? { categoria: categoria, fases: {}, arquivosLidos: 0, bytesLidos: 0 } : null;
}

function medirFonteAtleta_(metricas, fase, operacao) {
  if (!metricas) return operacao();
  const inicio = Date.now();
  try { return operacao(); }
  finally {
    metricas.fases[fase] = (metricas.fases[fase] || 0) + Date.now() - inicio;
    if (fase === 'leitura') {
      Object.keys(metricas.fases).forEach(function (nome) {
        console.log(JSON.stringify({
          metrica: 'atleta_banco', categoria: metricas.categoria, fase: nome,
          duracaoMs: metricas.fases[nome], arquivosLidos: metricas.arquivosLidos,
          bytesLidos: metricas.bytesLidos, total: metricas.total, selecionados: metricas.selecionados
        }));
      });
    }
  }
}

function lerTextoFonteAtleta_(arquivo, metricas) {
  const texto = medirFonteAtleta_(metricas, 'drive_ler', function () {
    return arquivo.getBlob().getDataAsString('UTF-8');
  });
  if (metricas) {
    metricas.arquivosLidos++;
    medirFonteAtleta_(metricas, 'tamanho_utf8', function () {
      metricas.bytesLidos += bytesUtf8Cadastro_(texto);
    });
  }
  return texto;
}

function registrarMetricasFonteAtleta_(metricas, total, selecionados) {
  if (!metricas) return;
  metricas.total = total;
  metricas.selecionados = selecionados;
}

// Server-only, bounded PropertiesService payloads: no Drive sharing or client CPF index.
const INDICE_VALIDACAO_PREFIXO = 'INDICE_VALIDACAO_V1_';
const INDICE_VALIDACAO_AGENDA = INDICE_VALIDACAO_PREFIXO + 'agenda';
const INDICE_VALIDACAO_STATUS = INDICE_VALIDACAO_PREFIXO + 'status';
const INDICE_VALIDACAO_HANDLER = 'reconciliarIndicesValidacaoAgendado';
const INDICE_VALIDACAO_CHUNK_BYTES = 8000;
const INDICE_VALIDACAO_LIMITE_BYTES = 180000;

function chaveIndiceValidacao_(id) {
  return INDICE_VALIDACAO_PREFIXO + 'c_' + digestIndiceValidacao_(String(id)) + '_';
}

function lerMetaIndiceValidacao_(id) {
  const texto = PropertiesService.getScriptProperties().getProperty(chaveIndiceValidacao_(id) + 'meta');
  if (!texto) return {};
  const meta = JSON.parse(texto);
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error('Metadados do indice invalidos.');
  return meta;
}

function registrarFalhaIndiceValidacao_(fase) {
  // Never log source contents, CPF, IDs, or exception messages.
  console.log(JSON.stringify({ metrica: 'indice_validacao', fase: fase, resultado: 'fallback_fonte' }));
}

function fontesIndiceValidacao_(id) {
  return [
    { tipo: 'atletas', nome: arquivoCadastroPessoasCampeonato_(id, 'Atletas'), chave: chaveAtletasCampeonato_(id) },
    { tipo: 'comissao', nome: arquivoCadastroPessoasCampeonato_(id, 'Comissao Tecnica'), chave: chaveComissaoTecnicaCampeonato_(id) },
    { tipo: 'tabela', nome: arquivoTabelaCampeonato_(id), chave: chaveTabelaCampeonato_(id) }
  ];
}

function digestIndiceValidacao_(texto, algoritmo) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    algoritmo || Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8));
}

function md5IndiceValidacao_(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, texto, Utilities.Charset.UTF_8)
    .map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function versoesFontesIndiceValidacao_(id, recursos, posicoes, checkpoint) {
  const fontes = fontesIndiceValidacao_(id);
  let elenco = checkpoint;
  return (posicoes || [0, 1, 2]).map(function (posicao) {
    const fonte = fontes[posicao];
    if (elencosParticionadosCutoverAtivo_() && fonte.tipo !== 'tabela') {
      if (!elenco) elenco = checkpointElencoParticionado_(id);
      const estado = elenco.estado;
      return ['aeuv.elencos.particoes.v2', fonte.tipo, digestIndiceValidacao_(JSON.stringify([
        estado.pasta ? estado.pasta.getId() : null, estado.arquivo ? estado.arquivo.getId() : null,
        elenco.assinatura
      ]))];
    }
    if (typeof Drive === 'undefined') throw new Error('Ative o servico avancado Drive v3 para usar o indice.');
    const arquivo = localizarArquivoCadastro_(fonte.nome, recursos, fonte.tipo).arquivo;
    // Absence is resolved again on every request; never persist/cache a negative file lookup.
    if (!arquivo) {
      const legado = PropertiesService.getScriptProperties().getProperty(fonte.chave);
      return ['legado', digestIndiceValidacao_(JSON.stringify([fonte.chave, legado])), md5IndiceValidacao_(legado || '')];
    }
    const meta = Drive.Files.get(arquivo.getId(), {
      fields: 'id,name,trashed,parents,version,md5Checksum', supportsAllDrives: true
    });
    if (meta.name !== fonte.nome || meta.trashed || !meta.parents
        || meta.parents.indexOf(CONFIG.pastaRaizId) === -1 || !meta.version || !meta.md5Checksum) {
      throw new Error('Fonte do indice indisponivel ou sem versao verificavel.');
    }
    return [String(meta.id), String(meta.version), meta.md5Checksum];
  });
}

function compactarCadastroIndiceValidacao_(lista) {
  const mapa = Object.create(null);
  lista.forEach(function (pessoa) {
    if (!pessoa || typeof pessoa !== 'object' || !String(pessoa.nome || '').trim()) return;
    const cpf = somenteDigitos_(pessoa.cpf || '');
    const entrada = [String(pessoa.id || '').trim(), chaveEquipe_(pessoa.timeVinculado || ''),
      String(pessoa.timeVinculado || '').trim()];
    (mapa[cpf] || (mapa[cpf] = [])).push(entrada);
  });
  return mapa;
}

function chaveNomeIndiceValidacao_(nome) {
  return String(nome || '').trim().toLowerCase();
}

function compactarNomesCadastroIndiceValidacao_(lista) {
  const mapa = Object.create(null);
  lista.forEach(function (pessoa) {
    if (!pessoa || typeof pessoa !== 'object' || !String(pessoa.nome || '').trim()) return;
    const nome = chaveNomeIndiceValidacao_(pessoa.nome);
    (mapa[nome] || (mapa[nome] = [])).push([
      String(pessoa.id || '').trim(), chaveEquipe_(pessoa.timeVinculado || ''),
      String(pessoa.timeVinculado || '').trim()
    ]);
  });
  return mapa;
}

function compactarIdsCadastroIndiceValidacao_(lista) {
  const mapa = Object.create(null);
  lista.forEach(function (pessoa) {
    if (!pessoa || typeof pessoa !== 'object' || !String(pessoa.nome || '').trim()) return;
    const id = String(pessoa.id || '').trim();
    if (id) mapa[id] = chaveEquipe_(pessoa.timeVinculado || '');
  });
  return mapa;
}

function removerEntradaMapaIndiceValidacao_(mapa, chave, id, equipe) {
  const entradas = mapa[chave];
  if (!entradas) return;
  mapa[chave] = entradas.filter(function (entrada) {
    return entrada[0] !== id || entrada[1] !== equipe;
  });
  if (!mapa[chave].length) delete mapa[chave];
}

function aplicarDeltaCadastroIndiceValidacao_(indice, tipo, antes, depois) {
  [antes || [], depois || []].forEach(function (lista, posicao) {
    const adicionar = posicao === 1;
    lista.forEach(function (pessoa) {
      if (!pessoa || !String(pessoa.nome || '').trim()) return;
      const id = String(pessoa.id || '').trim();
      const equipe = chaveEquipe_(pessoa.timeVinculado || '');
      const equipeNome = String(pessoa.timeVinculado || '').trim();
      const cpf = somenteDigitos_(pessoa.cpf || '');
      const nome = chaveNomeIndiceValidacao_(pessoa.nome);
      if (adicionar) {
        (indice.cadastros[tipo][cpf] || (indice.cadastros[tipo][cpf] = [])).push([id, equipe, equipeNome]);
        (indice.nomes[tipo][nome] || (indice.nomes[tipo][nome] = [])).push([id, equipe, equipeNome]);
        indice.ids[tipo][id] = equipe;
      } else {
        removerEntradaMapaIndiceValidacao_(indice.cadastros[tipo], cpf, id, equipe);
        removerEntradaMapaIndiceValidacao_(indice.nomes[tipo], nome, id, equipe);
        if (indice.ids[tipo][id] === equipe) delete indice.ids[tipo][id];
      }
    });
  });
}

function compactarParticipacaoIndiceValidacao_(jogos) {
  const mapa = Object.create(null);
  let ordem = 0;
  jogos.forEach(function (jogo) {
    if (Object.prototype.hasOwnProperty.call(jogo, 'resultado')) validarResultadoSalvoTabela_(jogo.resultado, jogo);
    if (jogo.status !== 'encerrado' || !jogo.resultado) return;
    jogo.resultado.equipes.forEach(function (equipe) {
      const posicao = ordem++;
      equipe.atletas.forEach(function (pessoa) {
        if (pessoa.participou !== true) return;
        [['id', pessoa.id], ['cpf', somenteDigitos_(pessoa.cpf || '')]].forEach(function (par) {
          if (!par[1]) return;
          const chave = JSON.stringify(par), times = mapa[chave] || (mapa[chave] = []);
          if (!times.some(function (entrada) { return entrada[0] === equipe.id; })) times.push([equipe.id, posicao]);
        });
      });
    });
  });
  return mapa;
}

function lerPayloadIndiceValidacao_(id, meta) {
  const versao = elencosParticionadosCutoverAtivo_() ? 2 : 1;
  if (meta.versao !== versao || meta.dirty !== false || !meta.token
      || !Number.isInteger(meta.chunks) || meta.chunks < 1 || meta.chunks > 24
      || !Array.isArray(meta.fontes) || meta.fontes.length !== 3 || !meta.digest) return null;
  const props = PropertiesService.getScriptProperties(), prefixo = chaveIndiceValidacao_(id) + meta.token + '_';
  let texto = '';
  for (let i = 0; i < meta.chunks; i++) {
    const parte = props.getProperty(prefixo + i);
    if (parte === null) return null;
    texto += parte;
  }
  if (digestIndiceValidacao_(texto) !== meta.digest) return null;
  let indice;
  try { indice = JSON.parse(texto); }
  catch (e) {
    registrarFalhaIndiceValidacao_('payload_corrompido');
    return null;
  }
  if (indice.versao !== versao || indice.campeonatoId !== id || indice.token !== meta.token
      || !indice.cadastros || !indice.cadastros.atletas || !indice.cadastros.comissao || !indice.participacao) return null;
  if (versao === 2 && (!indice.nomes || !indice.nomes.atletas || !indice.nomes.comissao
      || !indice.ids || !indice.ids.atletas || !indice.ids.comissao)) return null;
  if (versao === 2 && ['atletas', 'comissao'].some(function (tipo) {
    return Object.keys(indice.ids[tipo]).some(function (registroId) {
      return !registroId || typeof indice.ids[tipo][registroId] !== 'string';
    }) || Object.keys(indice.nomes[tipo]).some(function (nome) {
      return !Array.isArray(indice.nomes[tipo][nome]) || indice.nomes[tipo][nome].some(function (item) {
        return !Array.isArray(item) || item.length < 2 || typeof item[0] !== 'string'
          || typeof item[1] !== 'string';
      });
    });
  })) return null;
  return indice;
}

function consultarIndiceValidacao_(id, recursos, tipo, checkpoint) {
  try {
    checkpoint = checkpoint || recursos && recursos.checkpointsValidacaoElenco
      && recursos.checkpointsValidacaoElenco[id];
    // Reuse only within the existing synchronous lock, never across requests.
    const reutilizar = !elencosParticionadosCutoverAtivo_() && recursos && LockService.getScriptLock().hasLock();
    const cache = checkpoint ? checkpoint.indicesValidacao : reutilizar && recursos.indicesValidacao;
    let entrada = cache && cache[id];
    if (checkpoint && entrada
        && JSON.stringify(lerMetaIndiceValidacao_(id)) !== JSON.stringify(entrada.meta)) entrada = null;
    if (!entrada) {
      const meta = lerMetaIndiceValidacao_(id);
      entrada = { meta: meta, indice: lerPayloadIndiceValidacao_(id, meta), verificadas: [] };
    }
    const posicoes = (tipo ? [['atletas', 'comissao', 'tabela'].indexOf(tipo)] : [0, 1, 2])
      .filter(function (posicao) { return entrada.verificadas.indexOf(posicao) === -1; });
    if (entrada.indice && posicoes.length) {
      const fontes = versoesFontesIndiceValidacao_(id, recursos, posicoes, checkpoint);
      if (fontes.some(function (fonte, i) {
        return JSON.stringify(fonte) !== JSON.stringify(entrada.meta.fontes[posicoes[i]]);
      }) || JSON.stringify(lerMetaIndiceValidacao_(id)) !== JSON.stringify(entrada.meta)) entrada.indice = null;
      else entrada.verificadas = entrada.verificadas.concat(posicoes);
    }
    if (checkpoint || reutilizar) {
      const destino = checkpoint || recursos;
      if (!destino.indicesValidacao) destino.indicesValidacao = Object.create(null);
      destino.indicesValidacao[id] = entrada;
    }
    return entrada.indice;
  } catch (e) {
    registrarFalhaIndiceValidacao_('leitura');
    return null;
  }
}

function invalidarIndiceValidacao_(id) {
  const checkpoint = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty(chaveIndiceValidacao_(id) + 'meta',
    JSON.stringify({ versao: elencosParticionadosCutoverAtivo_() ? 2 : 1, dirty: true, checkpoint: checkpoint }));
  return checkpoint;
}

function limparIndiceValidacaoRemovido_(id) {
  try {
    const props = PropertiesService.getScriptProperties(), prefixo = chaveIndiceValidacao_(id);
    Object.keys(props.getProperties()).forEach(function (chave) {
      if (chave.indexOf(prefixo) === 0) props.deleteProperty(chave);
    });
  } catch (e) { registrarFalhaIndiceValidacao_('limpeza'); }
}

function alvoArquivoIndiceValidacao_(nome) {
  const elenco = nome.match(/^AEUV - Campeonato - (\S+) - (Atletas|Comissao Tecnica)\.json$/);
  if (elenco) return { id: decodeURIComponent(elenco[1]), tipo: elenco[2] === 'Atletas' ? 'atletas' : 'comissao' };
  const tabela = nome.match(/^AEUV - Campeonato - (\S+) - Tabela\.json$/);
  return tabela ? { id: decodeURIComponent(tabela[1]), tipo: 'tabela' } : null;
}

function iniciarMutacaoIndiceValidacao_(nome, recursos) {
  const alvo = alvoArquivoIndiceValidacao_(nome);
  if (!alvo) return null;
  let indice = null, fontes = null, meta = null;
  try {
    meta = lerMetaIndiceValidacao_(alvo.id);
    const entrada = recursos && recursos.indicesValidacao && recursos.indicesValidacao[alvo.id];
    indice = entrada && JSON.stringify(entrada.meta) === JSON.stringify(meta)
      ? entrada.indice : lerPayloadIndiceValidacao_(alvo.id, meta);
    if (indice) fontes = meta.fontes;
  } catch (e) { registrarFalhaIndiceValidacao_('pre_gravacao'); }
  const checkpoint = invalidarIndiceValidacao_(alvo.id);
  if (recursos) {
    delete recursos.indicesValidacao;
    if (alvo.tipo === 'tabela' && recursos.jogos) delete recursos.jogos[alvo.id];
  }
  return { alvo: alvo, indice: indice, fontes: fontes, meta: meta, checkpoint: checkpoint };
}

function publicarIndiceValidacao_(id, indice, fontes, checkpoint, anterior, validarFontes) {
  const props = PropertiesService.getScriptProperties(), prefixo = chaveIndiceValidacao_(id);
  function confirmarCheckpoint_() {
    const atual = lerMetaIndiceValidacao_(id);
    if (!atual.dirty || atual.checkpoint !== checkpoint) throw new Error('Indice alterado durante a reconciliacao.');
  }
  confirmarCheckpoint_();
  if (anterior && anterior.dirty === false) {
    indice.token = anterior.token;
    if (digestIndiceValidacao_(JSON.stringify(indice)) === anterior.digest
        && lerPayloadIndiceValidacao_(id, anterior)) {
      confirmarCheckpoint_();
      if (validarFontes) validarFontes();
      const meta = Object.assign({}, anterior, { fontes: fontes, checkpoint: checkpoint,
        atualizadoEm: new Date().toISOString() });
      props.setProperty(prefixo + 'meta', JSON.stringify(meta));
      return meta;
    }
  }
  const token = Utilities.getUuid();
  indice.token = token;
  const texto = JSON.stringify(indice), partes = [];
  // Chunk by UTF-8 bytes, not JS characters (team names can be non-ASCII).
  let parte = '', bytes = 0;
  for (const caractere of texto) {
    const tamanho = bytesUtf8Cadastro_(caractere);
    if (bytes + tamanho > INDICE_VALIDACAO_CHUNK_BYTES) { partes.push(parte); parte = ''; bytes = 0; }
    parte += caractere; bytes += tamanho;
  }
  partes.push(parte);
  if (partes.length > 24) throw new Error('Indice excede o limite compacto por campeonato.');
  const todas = props.getProperties();
  // Already dirty: discard only this championship's superseded/orphan chunks before reserving quota.
  Object.keys(todas).forEach(function (chave) {
    if (chave.indexOf(prefixo) === 0 && chave !== prefixo + 'meta') {
      props.deleteProperty(chave);
      delete todas[chave];
    }
  });
  let total = 0, indices = 0;
  Object.keys(todas).forEach(function (chave) {
    const tamanho = bytesUtf8Cadastro_(chave) + bytesUtf8Cadastro_(todas[chave]);
    total += tamanho;
    if (chave.indexOf(INDICE_VALIDACAO_PREFIXO) === 0) indices += tamanho;
  });
  const adicional = bytesUtf8Cadastro_(texto) + partes.length * (prefixo.length + token.length + 12) + 2000;
  if (indices + adicional > INDICE_VALIDACAO_LIMITE_BYTES || total + adicional > 450000) {
    throw new Error('Sem espaco seguro nas propriedades para publicar o indice.');
  }
  partes.forEach(function (valor, i) { props.setProperty(prefixo + token + '_' + i, valor); });
  const meta = { versao: elencosParticionadosCutoverAtivo_() ? 2 : 1, dirty: false, checkpoint: checkpoint, token: token, chunks: partes.length,
    fontes: fontes, digest: digestIndiceValidacao_(texto), atualizadoEm: new Date().toISOString() };
  if (!lerPayloadIndiceValidacao_(id, meta)) throw new Error('Falha na leitura de confirmacao do indice.');
  // Single publication point. Dirty metadata survives all earlier failures.
  confirmarCheckpoint_();
  if (validarFontes) validarFontes();
  props.setProperty(prefixo + 'meta', JSON.stringify(meta));
  return meta;
}

function iniciarMutacaoIndiceParticionado_(id, recursos, checkpointElenco) {
  let indice = null, meta = null;
  try {
    meta = lerMetaIndiceValidacao_(id);
    if (meta.versao === 2 && meta.dirty === false) {
      indice = consultarIndiceValidacao_(id, recursos, null, checkpointElenco);
      if (!indice || JSON.stringify(lerMetaIndiceValidacao_(id)) !== JSON.stringify(meta)) {
        indice = null;
        meta = null;
      } else {
        indice = JSON.parse(JSON.stringify(indice));
      }
    } else {
      meta = null;
    }
  } catch (e) {
    registrarFalhaIndiceValidacao_('incremental_pre_gravacao');
    indice = null;
    meta = null;
  }
  const mutacao = { indice: indice, meta: meta, checkpoint: invalidarIndiceValidacao_(id) };
  if (checkpointElenco) delete checkpointElenco.indicesValidacao;
  if (recursos) recursos.indiceBaseMutacao = indice;
  return mutacao;
}

function concluirMutacaoIndiceParticionado_(mutacao, id, deltas, recursos) {
  const checkpointInicial = recursos && recursos.elencoCheckpointPosCommit;
  if (recursos) delete recursos.elencoCheckpointPosCommit;
  if (!mutacao || !mutacao.indice || !mutacao.meta) {
    registrarFalhaIndiceValidacao_('incremental_sem_base_v2');
    return;
  }
  let fase = 'leitura_estado';
  try {
    const indice = mutacao.indice;
    fase = 'fingerprint_inicial';
    const equipesAlteradas = deltas.map(function (delta) { return delta.equipeId; })
      .filter(function (equipeId) { return !!equipeId; });
    if (!checkpointInicial || checkpointInicial.estado.manifesto.campeonatoId !== id
        || !recursos.elencoAssinaturaPosCommit
        || checkpointInicial.assinatura
          !== recursos.elencoAssinaturaPosCommit) {
      throw new Error('Fontes divergiram apos a publicacao.');
    }
    const fontes = medirFaseCadastro_('elenco_indice_baseline', function () {
      return versoesFontesIndiceValidacao_(id, null, [0, 1], checkpointInicial)
        .concat([mutacao.meta.fontes[2]]);
    });
    medirFaseCadastro_('elenco_indice_delta', function () { deltas.forEach(function (delta) {
      if (delta.antes === null || delta.antes === undefined) {
        throw new Error('Delta de elenco incompleto.');
      }
      aplicarDeltaCadastroIndiceValidacao_(indice, delta.tipo, delta.antes, delta.depois);
    }); });
    fase = 'publicacao';
    medirFaseCadastro_('elenco_indice_publicacao', function () {
      publicarIndiceValidacao_(id, indice, fontes, mutacao.checkpoint, mutacao.meta, function () {
        medirFaseCadastro_('elenco_indice_confirmacao_fontes', function () {
          // Chunks may invoke remote work: resolve ALL sources and associations
          // afresh here, including the unchanged table from the old index base.
          const estadoFinal = lerEstadoElencosParticionados_(id);
          const contextoFinal = validarAssociacoesPublicacaoElenco_(
            id, estadoFinal, equipesAlteradas, recursos);
          const checkpointFinal = checkpointElencoParticionado_(id, contextoFinal.equipes, estadoFinal);
          if (JSON.stringify(versoesFontesIndiceValidacao_(id, null, null, checkpointFinal))
              !== JSON.stringify(fontes)) {
            throw new Error('Fontes divergiram durante a publicacao incremental.');
          }
        });
      });
    });
  } catch (e) {
    // The manifest is already committed; stale or unavailable indexes stay dirty.
    registrarFalhaIndiceValidacao_('incremental_particionado_' + fase);
  }
}

function concluirMutacaoIndiceValidacao_(mutacao, lista, conteudo, recursos) {
  if (!mutacao || !mutacao.indice || !mutacao.fontes) return;
  try {
    const alvo = mutacao.alvo, antes = mutacao.fontes, depois = versoesFontesIndiceValidacao_(alvo.id, recursos);
    const posicao = ['atletas', 'comissao', 'tabela'].indexOf(alvo.tipo);
    if (depois.some(function (versao, i) {
      return i === posicao ? versao[2] !== md5IndiceValidacao_(conteudo)
        : JSON.stringify(versao) !== JSON.stringify(antes[i]);
    })) throw new Error('Fontes divergiram durante a gravacao.');
    const indice = mutacao.indice;
    if (alvo.tipo === 'tabela') indice.participacao = compactarParticipacaoIndiceValidacao_(lista[0].jogos);
    else indice.cadastros[alvo.tipo] = compactarCadastroIndiceValidacao_(lista);
    const meta = publicarIndiceValidacao_(alvo.id, indice, depois, mutacao.checkpoint, mutacao.meta);
    if (recursos) {
      recursos.indicesValidacao = Object.create(null);
      recursos.indicesValidacao[alvo.id] = { indice: indice, meta: meta, verificadas: [0, 1, 2] };
    }
  } catch (e) {
    // The source already committed. Index maintenance must not report a failed roster/result save.
    registrarFalhaIndiceValidacao_('incremental');
  }
}

function tentarLockIndiceValidacao_(operacao) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1)) return false;
  try { operacao(); return true; }
  finally { lock.releaseLock(); }
}

function reconciliarIndiceValidacao_(id) {
  const props = PropertiesService.getScriptProperties(), chaveMeta = chaveIndiceValidacao_(id) + 'meta';
  const brutoAntes = props.getProperty(chaveMeta);
  let antes;
  try { antes = lerMetaIndiceValidacao_(id); }
  catch (e) { registrarFalhaIndiceValidacao_('metadados'); antes = {}; }
  const fontes = versoesFontesIndiceValidacao_(id);
  try {
    if (lerPayloadIndiceValidacao_(id, antes)
        && JSON.stringify(fontes) === JSON.stringify(antes.fontes)) return 'atual';
  } catch (e) { registrarFalhaIndiceValidacao_('payload_reconciliacao'); }
  // Never hold ScriptLock while reading/parsing large roster/table files.
  const atletas = lerElencoBrutoOperacao_(id, 'atletas');
  const comissao = lerElencoBrutoOperacao_(id, 'comissao');
  const indice = { versao: elencosParticionadosCutoverAtivo_() ? 2 : 1, campeonatoId: id, cadastros: {
    atletas: compactarCadastroIndiceValidacao_(atletas),
    comissao: compactarCadastroIndiceValidacao_(comissao)
  }, participacao: compactarParticipacaoIndiceValidacao_(jogosParticipacaoCampeonato_(id)) };
  if (indice.versao === 2) {
    indice.nomes = {
      atletas: compactarNomesCadastroIndiceValidacao_(atletas),
      comissao: compactarNomesCadastroIndiceValidacao_(comissao)
    };
    indice.ids = {
      atletas: compactarIdsCadastroIndiceValidacao_(atletas),
      comissao: compactarIdsCadastroIndiceValidacao_(comissao)
    };
  }
  if (JSON.stringify(versoesFontesIndiceValidacao_(id)) !== JSON.stringify(fontes)) return 'concorrente';
  if (!campeonatos_().some(function (item) { return item.id === id; })) return 'concorrente';
  let publicado = false;
  const adquiriu = tentarLockIndiceValidacao_(function () {
    // App writes invalidate the checkpoint under this same lock. Keep Drive/API
    // calls and full championship reads outside it to avoid blocking user edits.
    if (props.getProperty(chaveMeta) !== brutoAntes) return;
    const checkpoint = invalidarIndiceValidacao_(id);
    publicarIndiceValidacao_(id, indice, fontes, checkpoint, antes);
    publicado = true;
  });
  return adquiriu && publicado ? 'reconciliado' : 'concorrente';
}

function obterStatusIndicesValidacao() {
  exigirAdministracao_();
  const props = PropertiesService.getScriptProperties();
  const agenda = JSON.parse(props.getProperty(INDICE_VALIDACAO_AGENDA) || '{}');
  const estado = JSON.parse(props.getProperty(INDICE_VALIDACAO_STATUS) || '{}');
  return { agendado: !!agenda.triggerId, responsavel: agenda.owner || '',
    ultimaExecucao: estado.ultimaExecucao || '', erro: estado.erro || '', resultados: estado.resultados || {},
    campeonatos: campeonatos_().map(function (campeonato) {
      let meta;
      try { meta = lerMetaIndiceValidacao_(campeonato.id); }
      catch (e) { registrarFalhaIndiceValidacao_('status'); meta = {}; }
      return { id: campeonato.id, nome: campeonato.nome, pendente: meta.dirty !== false,
        atualizadoEm: meta.atualizadoEm || '' };
    }) };
}

function executarReconciliacaoIndicesValidacao_() {
  try { return processarReconciliacaoIndicesValidacao_(); }
  catch (e) {
    const mensagem = 'Nao foi possivel concluir a reconciliacao do indice. Validacoes continuam pelas fontes atuais; confira acesso e quotas.';
    try {
      PropertiesService.getScriptProperties().setProperty(INDICE_VALIDACAO_STATUS,
        JSON.stringify({ ultimaExecucao: new Date().toISOString(), erro: mensagem }));
    } catch (falhaStatus) { registrarFalhaIndiceValidacao_('registro_status'); }
    const erro = new Error(mensagem);
    erro.cause = e;
    throw erro;
  }
}

function processarReconciliacaoIndicesValidacao_() {
  const props = PropertiesService.getScriptProperties(), inicio = Date.now();
  const resultados = { atual: 0, reconciliado: 0, concorrente: 0, falhas: 0 };
  const lista = campeonatos_();
  const anterior = JSON.parse(props.getProperty(INDICE_VALIDACAO_STATUS) || '{}');
  const cursor = Number.isInteger(anterior.cursor) ? anterior.cursor % Math.max(1, lista.length) : 0;
  let processados = 0;
  for (; processados < lista.length && Date.now() - inicio < 180000; processados++) {
    try { resultados[reconciliarIndiceValidacao_(lista[(cursor + processados) % lista.length].id)]++; }
    catch (e) { resultados.falhas++; registrarFalhaIndiceValidacao_('reconciliacao'); }
  }
  props.setProperty(INDICE_VALIDACAO_STATUS, JSON.stringify({
    ultimaExecucao: new Date().toISOString(), resultados: resultados,
    cursor: lista.length ? (cursor + processados) % lista.length : 0,
    erro: resultados.falhas ? 'Falha ao reconciliar fontes/indice. Validacoes continuam pelas fontes atuais; confira Drive v3, acesso e quotas.' : ''
  }));
  return obterStatusIndicesValidacao();
}

function reconciliarIndicesValidacaoAgora() {
  exigirAdministracao_();
  return executarReconciliacaoIndicesValidacao_();
}

function configurarAgendamentoIndicesValidacao() {
  const sessao = exigirAdministracao_();
  const executar = function () {
    const props = PropertiesService.getScriptProperties();
    const agenda = JSON.parse(props.getProperty(INDICE_VALIDACAO_AGENDA) || '{}');
    const owner = exigirDonoAgendaBancoAtletas_(sessao, agenda);
    const proprios = ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === INDICE_VALIDACAO_HANDLER && trigger.getEventType() === ScriptApp.EventType.CLOCK;
    });
    const trigger = proprios.find(function (item) { return String(item.getUniqueId()) === agenda.triggerId; })
      || proprios[0]
      || ScriptApp.newTrigger(INDICE_VALIDACAO_HANDLER).timeBased().everyMinutes(5).create();
    props.setProperty(INDICE_VALIDACAO_AGENDA, JSON.stringify({ owner: owner, triggerId: String(trigger.getUniqueId()) }));
    proprios.forEach(function (item) {
      if (item.getUniqueId() !== trigger.getUniqueId()) ScriptApp.deleteTrigger(item);
    });
  };
  if (!tentarLockIndiceValidacao_(executar)) throw new Error('Sistema ocupado. Tente configurar novamente.');
  return obterStatusIndicesValidacao();
}

function desativarAgendamentoIndicesValidacao() {
  const sessao = exigirAdministracao_();
  if (!tentarLockIndiceValidacao_(function () {
    const props = PropertiesService.getScriptProperties();
    exigirDonoAgendaBancoAtletas_(sessao, JSON.parse(props.getProperty(INDICE_VALIDACAO_AGENDA) || '{}'));
    ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === INDICE_VALIDACAO_HANDLER && trigger.getEventType() === ScriptApp.EventType.CLOCK;
    }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
    props.deleteProperty(INDICE_VALIDACAO_AGENDA);
  })) throw new Error('Sistema ocupado. Tente desativar novamente.');
  return obterStatusIndicesValidacao();
}

function reconciliarIndicesValidacaoAgendado(evento) {
  const sessao = exigirAdministracao_();
  const props = PropertiesService.getScriptProperties();
  const agenda = JSON.parse(props.getProperty(INDICE_VALIDACAO_AGENDA) || '{}');
  validarGatilhoAgendado_(sessao, agenda, INDICE_VALIDACAO_HANDLER, evento,
    'Gatilho do indice de validacao nao configurado para esta conta.');
  const status = executarReconciliacaoIndicesValidacao_();
  if (status.erro) throw new Error(status.erro);
  return status;
}

const SNAPSHOTS_ESPORTIVOS = {
  tabela: { nome: 'Tabela de Classificação', minutos: 5, handler: 'atualizarTabelaAgendada' },
  participantes: { nome: 'Equipes Participantes', minutos: 15, handler: 'atualizarParticipantesAgendado' }
};
const SNAPSHOTS_ESPORTIVOS_REVISAO = 'SNAPSHOTS_ESPORTIVOS_REVISAO_V1';
const SNAPSHOTS_ESPORTIVOS_ORCAMENTO_MS = 210000;

function respostaEsportivaAtual_(dados) {
  dados.contextoAtual = true;
  dados.consultadoEm = new Date().toISOString();
  return dados;
}

function marcarSnapshotsEsportivosPendentes_() {
  // Antes da persistência, inclusive se uma gravação composta falhar parcialmente.
  PropertiesService.getScriptProperties().setProperty(SNAPSHOTS_ESPORTIVOS_REVISAO, Utilities.getUuid());
}

function revisaoSnapshotsEsportivos_() {
  return PropertiesService.getScriptProperties().getProperty(SNAPSHOTS_ESPORTIVOS_REVISAO) || 'inicial';
}

function chaveSnapshotEsportivo_(tipo, id) {
  if (!SNAPSHOTS_ESPORTIVOS[tipo]) throw new Error('Categoria de cópia inválida.');
  return 'SNAPSHOT_ESPORTIVO_V1_' + tipo + '_campeonato_' + encodeURIComponent(id);
}

function chaveMetaSnapshotEsportivo_(tipo, nome) {
  if (!SNAPSHOTS_ESPORTIVOS[tipo]) throw new Error('Categoria de cópia inválida.');
  return 'SNAPSHOT_ESPORTIVO_V1_' + tipo + '_meta_' + nome;
}

function lerEstadoSnapshotEsportivo_(chave) {
  const texto = PropertiesService.getScriptProperties().getProperty(chave);
  if (!texto) return {};
  try {
    const estado = JSON.parse(texto);
    if (estado && typeof estado === 'object' && !Array.isArray(estado)) return estado;
  } catch (e) {}
  throw new Error('Metadados da cópia esportiva inválidos. Peça ao administrador para corrigir a configuração.');
}

function gravarEstadoSnapshotEsportivo_(chave, estado) {
  PropertiesService.getScriptProperties().setProperty(chave, JSON.stringify(estado));
}

function comLockSnapshotEsportivo_(acao) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return acao(); } finally { lock.releaseLock(); }
}

function statusSnapshotEsportivo_(tipo, id) {
  const estado = lerEstadoSnapshotEsportivo_(chaveSnapshotEsportivo_(tipo, id));
  const agenda = lerEstadoSnapshotEsportivo_(chaveMetaSnapshotEsportivo_(tipo, 'agenda'));
  const execucao = lerEstadoSnapshotEsportivo_(chaveMetaSnapshotEsportivo_(tipo, 'execucao'));
  const agora = Date.now();
  return {
    disponivel: !!estado.currentId, generatedAt: estado.generatedAt || '',
    pendente: !estado.currentId || estado.sourceRevision !== revisaoSnapshotsEsportivos_(),
    emRecalculo: !!(execucao.lease && execucao.lease.expiresAt > agora),
    ultimaTentativaEm: estado.lastAttemptAt || '',
    ultimoErro: execucao.lease && execucao.lease.expiresAt <= agora
      ? 'O recálculo não terminou no prazo; a cópia anterior foi preservada.' : (estado.lastError || ''),
    agendado: !!agenda.triggerId, responsavel: agenda.owner || ''
  };
}

function validarSnapshotEsportivo_(tipo, id, documento) {
  const dados = documento && documento.dados;
  if (!documento || documento.schema !== 1 || documento.tipo !== tipo || documento.campeonatoId !== id
      || typeof documento.generatedAt !== 'string' || !Number.isFinite(Date.parse(documento.generatedAt))
      || typeof documento.sourceRevision !== 'string' || !dados || dados.campeonatoId !== id
      || !Array.isArray(dados.campeonatos)
      || (tipo === 'tabela' && (!Array.isArray(dados.jogos) || !Array.isArray(dados.equipes)
        || !Array.isArray(dados.grupos) || !Array.isArray(dados.fases) || !Array.isArray(dados.campos)
        || !Array.isArray(dados.criterioOpcoes) || !Array.isArray(dados.avisos)
        || typeof dados.revisao !== 'string' || !dados.campeonato || dados.campeonato.id !== id
        || !dados.criterios || !dados.classificacao || !Array.isArray(dados.classificacao.geral)
        || !Array.isArray(dados.classificacao.grupos)))
      || (tipo === 'participantes' && (!Array.isArray(dados.registros) || dados.registros.length !== 1
        || !dados.registros[0] || dados.registros[0].campeonatoId !== id
        || !Array.isArray(dados.registros[0].times) || !Array.isArray(dados.registros[0].timesDetalhados)
        || dados.registros[0].timesDetalhados.some(function (time) {
          return !time || typeof time.id !== 'string' || !time.id || typeof time.nome !== 'string'
            || typeof time.escudo !== 'string' || !Number.isSafeInteger(time.totalAtletas) || time.totalAtletas < 0
            || !Number.isSafeInteger(time.totalComissao) || time.totalComissao < 0;
        })))) {
    throw new Error('Cópia de ' + SNAPSHOTS_ESPORTIVOS[tipo].nome + ' inválida. Use Recalcular agora.');
  }
  return documento;
}

function lerSnapshotEsportivo_(tipo, id) {
  const estado = lerEstadoSnapshotEsportivo_(chaveSnapshotEsportivo_(tipo, id));
  if (!estado.currentId) throw new Error(SNAPSHOTS_ESPORTIVOS[tipo].nome
    + ' ainda não possui cópia para este campeonato. Admin/diretoria devem usar Recalcular agora.');
  try {
    const arquivo = DriveApp.getFileById(estado.currentId);
    if (arquivo.isTrashed() || !arquivoNaPastaRaiz_(arquivo)) throw new Error('Arquivo indisponível.');
    const documento = validarSnapshotEsportivo_(tipo, id, JSON.parse(arquivo.getBlob().getDataAsString('UTF-8')));
    if (documento.generatedAt !== estado.generatedAt || documento.sourceRevision !== estado.sourceRevision) {
      throw new Error('Versão da cópia inconsistente.');
    }
    return documento.dados;
  } catch (e) {
    throw new Error('Não foi possível ler a cópia de ' + SNAPSHOTS_ESPORTIVOS[tipo].nome
      + '. A cópia anterior foi preservada; admin/diretoria devem usar Recalcular agora.');
  }
}

function listarTabelaCampeonato(campeonatoId) {
  sessaoCampeonato_();
  const lista = campeonatos_();
  const id = String(campeonatoId || '').trim() || (lista[0] || {}).id || '';
  if (!id) return montarTelaTabela_(lista, null);
  if (!lista.some(function (item) { return item.id === id; })) throw new Error('Campeonato não encontrado. Atualize a lista.');
  const dados = lerSnapshotEsportivo_('tabela', id);
  dados.campeonatos = lista.map(function (item) {
    return { id: item.id, nome: item.nome, temporada: item.temporada, status: item.status };
  });
  dados.podeEditar = true;
  dados.snapshotStatus = statusSnapshotEsportivo_('tabela', id);
  return dados;
}

function listarEquipesParticipantes(campeonatoId) {
  const sessao = identificarUsuario_();
  if (!sessao.autorizado || !sessao.usuario || ['admin', 'diretoria', 'associado'].indexOf(sessao.usuario.perfil) === -1) {
    throw new Error('Você não tem permissão para consultar os elencos.');
  }
  const associado = sessao.usuario.perfil === 'associado';
  // Identidade, vínculos e bloqueios são sempre atuais, nunca autorizados pela cópia.
  const globais = equipesRegistro_(), ativas = obterEquipes_().map(chaveEquipe_);
  const bloqueios = lerBloqueiosElenco_();
  const campeonatos = campeonatosResumo_().filter(function (campeonato) {
    return !associado || timesCampeonato_(campeonato.id).some(function (nome) {
      return chaveEquipe_(nome) === chaveEquipe_(sessao.usuario.equipe);
    });
  });
  const selecionado = campeonatos.find(function (item) { return item.id === String(campeonatoId || '').trim(); }) || campeonatos[0];
  const resposta = {
    campeonatos: campeonatos, campeonatoId: selecionado ? selecionado.id : '',
    equipesGlobais: associado ? [] : globais.filter(function (item) {
      return ativas.indexOf(chaveEquipe_(item.nome)) !== -1;
    }).map(function (item) { return { id: item.id, nome: item.nome }; }),
    podeEditar: !associado, registros: []
  };
  if (!selecionado) return resposta;
  const nomes = timesCampeonato_(selecionado.id).filter(function (nome) {
    return !associado || chaveEquipe_(nome) === chaveEquipe_(sessao.usuario.equipe);
  });
  const identidades = globais.filter(function (item) {
    return nomes.some(function (nome) { return chaveEquipe_(nome) === chaveEquipe_(item.nome); });
  });
  const dados = lerSnapshotEsportivo_('participantes', selecionado.id);
  const times = dados.registros[0].timesDetalhados.filter(function (time) {
    return identidades.some(function (equipe) { return equipe.id === time.id; });
  }).map(function (time) {
    const equipe = identidades.find(function (item) { return item.id === time.id; });
    return { id: equipe.id, nome: equipe.nome, escudo: time.escudo,
      bloqueado: elencoBloqueado_(selecionado.id, equipe.id, bloqueios),
      totalAtletas: time.totalAtletas, totalComissao: time.totalComissao };
  });
  resposta.registros = [{ campeonatoId: selecionado.id, campeonatoNome: selecionado.nome,
    times: nomes, timesDetalhados: times }];
  resposta.snapshotStatus = statusSnapshotEsportivo_('participantes', selecionado.id);
  return resposta;
}

function limparVersaoSnapshotEsportivo_(tipo, campeonatoId, id) {
  if (!id) return;
  try {
    comLockSnapshotEsportivo_(function () {
      const estado = lerEstadoSnapshotEsportivo_(chaveSnapshotEsportivo_(tipo, campeonatoId));
      if (id === estado.currentId || id === estado.previousId) return;
      const arquivo = DriveApp.getFileById(id);
      if (arquivoNaPastaRaiz_(arquivo)) arquivo.setTrashed(true);
    });
  } catch (e) { console.log('Cópia esportiva: limpeza adiada; versões publicadas preservadas.'); }
}

function gerarSnapshotEsportivo_(tipo, campeonatoId) {
  sessaoCampeonato_();
  const id = String(campeonatoId || '').trim() || (campeonatos_()[0] || {}).id || '';
  if (!id || !campeonatos_().some(function (item) { return item.id === id; })) throw new Error('Escolha um campeonato válido.');
  const chave = chaveSnapshotEsportivo_(tipo, id), execucaoChave = chaveMetaSnapshotEsportivo_(tipo, 'execucao');
  const token = Utilities.getUuid();
  const sourceRevision = comLockSnapshotEsportivo_(function () {
    const execucao = lerEstadoSnapshotEsportivo_(execucaoChave);
    if (execucao.lease && execucao.lease.expiresAt > Date.now()) {
      throw new Error(SNAPSHOTS_ESPORTIVOS[tipo].nome + ' já está sendo recalculada. Aguarde e use Atualizar.');
    }
    execucao.lease = { token: token, expiresAt: Date.now() + 600000 };
    gravarEstadoSnapshotEsportivo_(execucaoChave, execucao);
    const estado = lerEstadoSnapshotEsportivo_(chave);
    estado.lastAttemptAt = new Date().toISOString();
    gravarEstadoSnapshotEsportivo_(chave, estado);
    return revisaoSnapshotsEsportivos_();
  });
  let novoArquivo;
  try {
    // Builders podem adquirir ScriptLock: não reter o lock da lease.
    const dados = tipo === 'tabela' ? carregarTabelaCampeonatoAtual(id) : carregarEquipesParticipantesAtual(id);
    delete dados.podeEditar;
    delete dados.equipesGlobais;
    delete dados.contextoAtual;
    delete dados.consultadoEm;
    const documento = { schema: 1, tipo: tipo, campeonatoId: id, sourceRevision: sourceRevision,
      generatedAt: new Date().toISOString(), dados: dados };
    validarSnapshotEsportivo_(tipo, id, documento);
    novoArquivo = pastaRaizProjeto_().createFile(Utilities.newBlob(JSON.stringify(documento),
      'application/json', 'AEUV - Copia ' + tipo + ' - ' + encodeURIComponent(id) + ' - ' + token + '.json'));
    const confirmado = validarSnapshotEsportivo_(tipo, id, JSON.parse(novoArquivo.getBlob().getDataAsString('UTF-8')));
    if (JSON.stringify(confirmado) !== JSON.stringify(documento)) throw new Error('A verificação da cópia completa falhou.');
    const obsoleto = comLockSnapshotEsportivo_(function () {
      const execucao = lerEstadoSnapshotEsportivo_(execucaoChave);
      if (!execucao.lease || execucao.lease.token !== token || execucao.lease.expiresAt <= Date.now()) {
        throw new Error('O prazo do recálculo expirou. Tente novamente.');
      }
      const estado = lerEstadoSnapshotEsportivo_(chave), anterior = estado.previousId;
      estado.previousId = estado.currentId || '';
      estado.currentId = novoArquivo.getId();
      estado.generatedAt = documento.generatedAt;
      // Não apagar marcações: a comparação com a revisão atual mantém writes concorrentes pendentes.
      estado.sourceRevision = sourceRevision;
      estado.lastError = '';
      gravarEstadoSnapshotEsportivo_(chave, estado);
      delete execucao.lease;
      try { gravarEstadoSnapshotEsportivo_(execucaoChave, execucao); }
      catch (e) { console.log('Cópia esportiva publicada; liberação da lease adiada até expirar.'); }
      return anterior;
    });
    limparVersaoSnapshotEsportivo_(tipo, id, obsoleto);
    return statusSnapshotEsportivo_(tipo, id);
  } catch (erro) {
    try {
      comLockSnapshotEsportivo_(function () {
        const execucao = lerEstadoSnapshotEsportivo_(execucaoChave);
        if (!execucao.lease || execucao.lease.token !== token) return;
        const estado = lerEstadoSnapshotEsportivo_(chave);
        estado.lastError = 'O último recálculo falhou; a cópia anterior foi preservada. Use Recalcular agora.';
        gravarEstadoSnapshotEsportivo_(chave, estado);
        delete execucao.lease;
        gravarEstadoSnapshotEsportivo_(execucaoChave, execucao);
      });
    } catch (e) { console.log('Cópia esportiva: não foi possível registrar a falha.'); }
    if (novoArquivo) limparVersaoSnapshotEsportivo_(tipo, id, novoArquivo.getId());
    throw erro;
  }
}

function recalcularTabelaCampeonato(id) { return gerarSnapshotEsportivo_('tabela', id); }
function recalcularEquipesParticipantes(id) { return gerarSnapshotEsportivo_('participantes', id); }

function obterStatusSnapshotsEsportivos() {
  sessaoCampeonato_();
  const campeonatos = campeonatosResumo_();
  return { campeonatos: campeonatos, categorias: Object.keys(SNAPSHOTS_ESPORTIVOS).map(function (tipo) {
    return { tipo: tipo, nome: SNAPSHOTS_ESPORTIVOS[tipo].nome,
      estado: statusSnapshotEsportivo_(tipo, (campeonatos[0] || {}).id || ''),
      campeonatos: campeonatos.map(function (item) { return { id: item.id, estado: statusSnapshotEsportivo_(tipo, item.id) }; }) };
  }) };
}

function agendaSnapshotEsportivo_(tipo, desativar) {
  const sessao = exigirAdministracao_(), config = SNAPSHOTS_ESPORTIVOS[tipo];
  return comLockSnapshotEsportivo_(function () {
    const chave = chaveMetaSnapshotEsportivo_(tipo, 'agenda'), agenda = lerEstadoSnapshotEsportivo_(chave);
    const owner = exigirDonoAgendaBancoAtletas_(sessao, agenda);
    const proprios = ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === config.handler && trigger.getEventType() === ScriptApp.EventType.CLOCK;
    });
    if (desativar) {
      proprios.forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
      PropertiesService.getScriptProperties().deleteProperty(chave);
    } else {
      const trigger = proprios.find(function (item) { return String(item.getUniqueId()) === agenda.triggerId; })
        || proprios[0]
        || ScriptApp.newTrigger(config.handler).timeBased().everyMinutes(config.minutos).create();
      gravarEstadoSnapshotEsportivo_(chave, { owner: owner, triggerId: String(trigger.getUniqueId()),
        installedAt: agenda.installedAt || new Date().toISOString(), cursor: agenda.cursor || '' });
      proprios.forEach(function (item) { if (item.getUniqueId() !== trigger.getUniqueId()) ScriptApp.deleteTrigger(item); });
    }
    return { agendado: !desativar, responsavel: owner };
  });
}

function configurarAgendamentoTabela() { return agendaSnapshotEsportivo_('tabela', false); }
function desativarAgendamentoTabela() { return agendaSnapshotEsportivo_('tabela', true); }
function configurarAgendamentoParticipantes() { return agendaSnapshotEsportivo_('participantes', false); }
function desativarAgendamentoParticipantes() { return agendaSnapshotEsportivo_('participantes', true); }

function atualizarSnapshotEsportivoAgendado_(tipo, evento) {
  const sessao = exigirAdministracao_(), chave = chaveMetaSnapshotEsportivo_(tipo, 'agenda');
  const agenda = lerEstadoSnapshotEsportivo_(chave);
  validarGatilhoAgendado_(sessao, agenda, SNAPSHOTS_ESPORTIVOS[tipo].handler, evento,
    'Gatilho esportivo não configurado para esta conta.');
  const inicio = Date.now(), lista = campeonatos_();
  const anterior = lista.findIndex(function (item) { return item.id === agenda.cursor; });
  const resultados = [];
  let falhas = 0;
  for (let i = 0; i < lista.length && Date.now() - inicio < SNAPSHOTS_ESPORTIVOS_ORCAMENTO_MS; i++) {
    const campeonato = lista[(anterior + 1 + i) % lista.length];
    // Checkpoint antes da execução: se houver timeout, o próximo disparo não fica preso no mesmo campeonato.
    comLockSnapshotEsportivo_(function () {
      const atual = lerEstadoSnapshotEsportivo_(chave);
      if (atual.triggerId !== agenda.triggerId || atual.owner !== agenda.owner) throw new Error('Agendamento alterado durante a execução.');
      atual.cursor = campeonato.id;
      gravarEstadoSnapshotEsportivo_(chave, atual);
    });
    exigirAdministracao_();
    try {
      gerarSnapshotEsportivo_(tipo, campeonato.id);
      resultados.push({ campeonatoId: campeonato.id, atualizado: true });
    } catch (e) {
      falhas++;
      resultados.push({ campeonatoId: campeonato.id, atualizado: false });
      console.log('Cópia esportiva: tentativa não concluída; conferir status e Execuções.');
      const execucao = lerEstadoSnapshotEsportivo_(chaveMetaSnapshotEsportivo_(tipo, 'execucao'));
      if (execucao.lease && execucao.lease.expiresAt > Date.now()) break;
    }
  }
  if (falhas) {
    throw new Error(SNAPSHOTS_ESPORTIVOS[tipo].nome + ': ' + falhas
      + ' recálculo(s) não concluído(s). As demais tentativas foram realizadas e as cópias anteriores preservadas. Consulte os estados na Administração.');
  }
  return resultados;
}

function atualizarTabelaAgendada(evento) { return atualizarSnapshotEsportivoAgendado_('tabela', evento); }
function atualizarParticipantesAgendado(evento) { return atualizarSnapshotEsportivoAgendado_('participantes', evento); }

const BANCO_ATLETAS_ESTADO = 'BANCO_ATLETAS_SNAPSHOT_V1';
const BANCO_ATLETAS_AGENDA = 'BANCO_ATLETAS_AGENDA_V1';
const BANCO_ATLETAS_HANDLER = 'atualizarBancoAtletasAgendado';
// Superior ao limite de execução de seis minutos, inferior ao próximo disparo.
const BANCO_ATLETAS_LEASE_MS = 10 * 60 * 1000;

function exigirBancoAtletas_() {
  const sessao = identificarUsuario_();
  if (!sessao.autorizado || !sessao.usuario || !moduloLiberado_('atletas', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para consultar o cadastro consolidado de atletas.');
  }
  return sessao;
}

function lerEstadoBancoAtletas_(chave) {
  const texto = PropertiesService.getScriptProperties().getProperty(chave);
  if (!texto) return {};
  let estado;
  try { estado = JSON.parse(texto); }
  catch (e) { throw new Error('Metadados do Banco de Atletas inválidos. Peça ao administrador para corrigir a configuração.'); }
  if (!estado || typeof estado !== 'object' || Array.isArray(estado)) {
    throw new Error('Metadados do Banco de Atletas inválidos. Peça ao administrador para corrigir a configuração.');
  }
  return estado;
}

function comLockBancoAtletas_(acao) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return acao(); }
  finally { lock.releaseLock(); }
}

function gravarEstadoBancoAtletas_(chave, estado) {
  PropertiesService.getScriptProperties().setProperty(chave, JSON.stringify(estado));
}

function statusBancoAtletas_(estado, agenda) {
  const agora = Date.now();
  return {
    disponivel: !!estado.currentId,
    generatedAt: estado.generatedAt || '',
    emRecalculo: !!(estado.lease && estado.lease.expiresAt > agora),
    ultimaTentativaEm: estado.lastAttemptAt || '',
    ultimoErro: estado.lease && estado.lease.expiresAt <= agora
      ? 'O último recálculo não terminou dentro do prazo. A cópia anterior foi preservada; use Recalcular agora.'
      : (estado.lastError || ''),
    agendado: !!agenda.triggerId,
    responsavel: agenda.owner || ''
  };
}

function obterStatusBancoAtletas() {
  exigirBancoAtletas_();
  return statusBancoAtletas_(lerEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO), lerEstadoBancoAtletas_(BANCO_ATLETAS_AGENDA));
}

function validarSnapshotBancoAtletas_(dados) {
  const invalido = function () {
    throw new Error('Snapshot do Banco de Atletas inválido. Use Recalcular agora para gerar uma nova cópia completa.');
  };
  const objeto = function (valor) { return valor && typeof valor === 'object' && !Array.isArray(valor); };
  const contagem = function (valor) { return Number.isSafeInteger(valor) && valor >= 0; };
  if (!objeto(dados) || dados.schema !== 1 || typeof dados.generatedAt !== 'string'
      || !Number.isFinite(Date.parse(dados.generatedAt)) || !Array.isArray(dados.registros)
      || dados.total !== dados.registros.length || !objeto(dados.fontes)) invalido();
  if (new Date(dados.generatedAt).toISOString() !== dados.generatedAt) invalido();
  const f = dados.fontes;
  ['solicitacoesLidas', 'solicitacoesTotal', 'punicoesTotal', 'sumulasLidas', 'sumulasTotal',
    'elencoCampeonatos', 'elencoInscricoesAtuais', 'elencoInscricoesAnteriores'].forEach(function (campo) {
    if (!contagem(f[campo])) invalido();
  });
  ['solicitacoesPastaUrl', 'punicoesArquivoUrl', 'punicoesAtualizadoEm', 'sumulasPastaUrl'].forEach(function (campo) {
    if (typeof f[campo] !== 'string') invalido();
  });
  if (f.solicitacoesLidas > f.solicitacoesTotal || f.sumulasLidas > f.sumulasTotal) invalido();
  const chaves = new Set();
  dados.registros.forEach(function (registro) {
    if (!objeto(registro) || typeof registro.chave !== 'string' || !registro.chave
        || chaves.has(registro.chave) || typeof registro.nome !== 'string'
        || typeof registro.cpf !== 'string') invalido();
    chaves.add(registro.chave);
    ['nascimento', 'tipo', 'equipeAtual', 'competicaoAtual', 'situacaoAtual', 'situacaoCadastro',
      'situacaoDisciplina', 'situacaoElenco', 'ultimaMovimentacao', 'ultimaAcao', 'ultimaSolicitacaoSituacao',
      'ultimaSolicitacaoProtocolo', 'ultimaSumulaData'].forEach(function (campo) {
      if (typeof registro[campo] !== 'string') invalido();
    });
    ['totalMovimentacoes', 'pendenciasCadastro', 'aguardandoCadastro', 'falhasCadastro', 'totalPunicoes',
      'punicoesACumprir', 'punicoesPendentes', 'totalSumulas'].forEach(function (campo) {
      if (!contagem(registro[campo])) invalido();
    });
    ['vinculos', 'movimentacoes', 'punicoes', 'sumulas', 'equipesHistorico', 'competicoesHistorico',
      'equipesAtuais', 'competicoesAtuais'].forEach(function (campo) {
      if (!Array.isArray(registro[campo])) invalido();
    });
    ['vinculos', 'movimentacoes', 'punicoes', 'sumulas'].forEach(function (campo) {
      if (!registro[campo].every(objeto)) invalido();
    });
    const detalhes = {
      vinculos: ['id', 'registroId', 'situacao', 'campeonatoId', 'campeonatoNome', 'campeonatoNomeOriginal',
        'campeonatoNomeRegistrado', 'temporada', 'campeonatoStatus', 'equipeId', 'equipeNome',
        'equipeNomeOriginal', 'equipeNomeRegistrado', 'nome', 'apelido', 'posicao', 'cpf',
        'dataNascimento', 'registradoEm', 'atualizadoEm'],
      movimentacoes: ['protocolo', 'dataHora', 'situacaoSolicitacao', 'acao', 'tipo', 'equipe',
        'competicao', 'competicaoAnterior', 'arquivoUrl', 'resultadoPdfUrl', 'resultadoTxtUrl'],
      punicoes: ['nota', 'dataNota', 'competicao', 'dataJogo', 'partida', 'equipe', 'tipo',
        'artigo', 'tempo', 'decisao', 'status', 'situacao', 'sumula'],
      sumulas: ['situacao', 'protocolo', 'dataJogo', 'dataEnvio', 'confronto', 'equipe', 'tipo', 'pdfUrl', 'arquivoUrl']
    };
    Object.keys(detalhes).forEach(function (campo) {
      registro[campo].forEach(function (detalhe) {
        detalhes[campo].forEach(function (atributo) {
          if (typeof detalhe[atributo] !== 'string') invalido();
        });
      });
    });
    registro.vinculos.forEach(function (vinculo) {
      ['atual', 'ativo', 'noHistorico', 'campeonatoExcluido', 'equipeAssociada'].forEach(function (campo) {
        if (typeof vinculo[campo] !== 'boolean') invalido();
      });
    });
    ['equipesHistorico', 'competicoesHistorico', 'equipesAtuais', 'competicoesAtuais'].forEach(function (campo) {
      if (!registro[campo].every(function (valor) { return typeof valor === 'string'; })) invalido();
    });
    if (!contagem(registro.totalVinculos) || !contagem(registro.vinculosAtuais)
        || registro.totalVinculos !== registro.vinculos.length
        || registro.vinculosAtuais !== registro.vinculos.filter(function (v) { return v.atual; }).length
        || registro.totalMovimentacoes < registro.movimentacoes.length
        || registro.totalPunicoes < registro.punicoes.length || registro.totalSumulas < registro.sumulas.length) invalido();
  });
  return dados;
}

function listarAtletas() {
  exigirBancoAtletas_();
  const estado = lerEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO);
  if (!estado.currentId) {
    throw new Error('O Banco de Atletas ainda não possui snapshot. Use Recalcular agora para a primeira geração.');
  }
  return medirFaseAtletaBanco_('snapshot', function () {
    const arquivo = DriveApp.getFileById(estado.currentId);
    if (arquivo.isTrashed() || !arquivoNaPastaRaiz_(arquivo)) {
      throw new Error('Snapshot do Banco de Atletas indisponível. Use Recalcular agora.');
    }
    let dados;
    try { dados = JSON.parse(arquivo.getBlob().getDataAsString('UTF-8')); }
    catch (e) {
      throw new Error('Não foi possível ler o snapshot do Banco de Atletas. Use Recalcular agora. Detalhe: ' + e.message);
    }
    validarSnapshotBancoAtletas_(dados);
    if (dados.generatedAt !== estado.generatedAt) {
      throw new Error('Snapshot do Banco de Atletas inválido. Use Recalcular agora.');
    }
    dados.snapshotStatus = statusBancoAtletas_(estado, lerEstadoBancoAtletas_(BANCO_ATLETAS_AGENDA));
    return dados;
  });
}

function recalcularBancoAtletas() {
  exigirBancoAtletas_();
  return gerarSnapshotBancoAtletas_();
}

function gerarSnapshotBancoAtletas_() {
  const token = Utilities.getUuid();
  comLockBancoAtletas_(function () {
    const estado = lerEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO);
    const agora = Date.now();
    if (estado.lease && estado.lease.expiresAt > agora) {
      throw new Error('O Banco de Atletas já está sendo recalculado. Aguarde e use Atualizar para reler a cópia pronta.');
    }
    estado.lease = { token: token, expiresAt: agora + BANCO_ATLETAS_LEASE_MS };
    estado.lastAttemptAt = new Date(agora).toISOString();
    gravarEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO, estado);
  });
  let novoArquivo;
  try {
    // Não manter ScriptLock aqui: a reconciliação de histórico usa o mesmo lock.
    const dados = construirBancoAtletas_();
    dados.schema = 1;
    dados.generatedAt = new Date().toISOString();
    validarSnapshotBancoAtletas_(dados);
    novoArquivo = pastaRaizProjeto_().createFile(Utilities.newBlob(JSON.stringify(dados),
      'application/json', 'AEUV - Banco de Atletas - ' + token + '.json'));
    const id = novoArquivo.getId();
    // Confirma que o arquivo está completo antes de trocar o único ponteiro.
    const confirmado = validarSnapshotBancoAtletas_(JSON.parse(novoArquivo.getBlob().getDataAsString('UTF-8')));
    if (JSON.stringify(confirmado) !== JSON.stringify(dados)) throw new Error('A verificação do novo snapshot falhou.');
    const resultado = comLockBancoAtletas_(function () {
      const estado = lerEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO);
      if (!estado.lease || estado.lease.token !== token || estado.lease.expiresAt <= Date.now()) {
        throw new Error('O prazo do recálculo expirou ou outra execução assumiu a atualização. Tente novamente.');
      }
      // Publicação em uma única propriedade; jamais sobrescreve o arquivo anterior.
      const anteriorObsoleto = estado.previousId;
      estado.previousId = estado.currentId || '';
      estado.currentId = id;
      estado.generatedAt = dados.generatedAt;
      estado.lastError = '';
      delete estado.lease;
      gravarEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO, estado);
      return { generatedAt: dados.generatedAt, anteriorObsoleto: anteriorObsoleto || '' };
    });
    if (resultado.anteriorObsoleto) limparVersaoBancoAtletas_(resultado.anteriorObsoleto);
    return { generatedAt: resultado.generatedAt };
  } catch (erro) {
    // A limpeza de estado não substitui a exceção original nem apaga leases alheios.
    try {
      comLockBancoAtletas_(function () {
        const estado = lerEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO);
        if (estado.lease && estado.lease.token === token) {
          delete estado.lease;
          estado.lastError = 'O último recálculo falhou. A cópia anterior foi preservada; tente Recalcular agora.';
          gravarEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO, estado);
        }
      });
    } catch (falhaEstado) {
      console.log('Banco de Atletas: não foi possível registrar o estado da falha.');
    }
    if (novoArquivo) {
      try { limparVersaoBancoAtletas_(novoArquivo.getId()); }
      catch (falhaLimpeza) { console.log('Banco de Atletas: arquivo não publicado aguardando limpeza administrativa.'); }
    }
    throw erro;
  }
}

function limparVersaoBancoAtletas_(id) {
  // Apenas IDs desta rotina; nunca enumera ou remove outros arquivos da pasta.
  // A publicação já ocorreu: falha de limpeza não transforma sucesso em falha.
  try {
    comLockBancoAtletas_(function () {
      const estado = lerEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO);
      if (id === estado.currentId || id === estado.previousId) return;
      const arquivo = DriveApp.getFileById(id);
      if (arquivoNaPastaRaiz_(arquivo)) arquivo.setTrashed(true);
    });
  } catch (e) {
    console.log('Banco de Atletas: uma versão obsoleta não pôde ser removida; cópias publicadas preservadas.');
  }
}

function exigirDonoAgendaBancoAtletas_(sessao, agenda) {
  const efetivo = normalizarEmail_(Session.getEffectiveUser().getEmail());
  if (!efetivo || efetivo !== sessao.email || (agenda.owner && agenda.owner !== efetivo)) {
    throw new Error('O agendamento pertence a outra conta. Somente o administrador responsável pode configurar ou desativar seus próprios gatilhos.');
  }
  return efetivo;
}

function validarGatilhoAgendado_(sessao, agenda, handler, evento, mensagemErro) {
  exigirDonoAgendaBancoAtletas_(sessao, agenda);
  const uid = evento && evento.triggerUid != null ? String(evento.triggerUid) : '';
  const encontrado = !!agenda.triggerId && !!uid && ScriptApp.getProjectTriggers().some(function (trigger) {
    return String(trigger.getUniqueId()) === uid
      && trigger.getHandlerFunction() === handler
      && trigger.getEventType() === ScriptApp.EventType.CLOCK;
  });
  if (!encontrado) throw new Error(mensagemErro);
}

function configurarAgendamentoBancoAtletas() {
  const sessao = exigirAdministracao_();
  return comLockBancoAtletas_(function () {
    const agenda = lerEstadoBancoAtletas_(BANCO_ATLETAS_AGENDA);
    const owner = exigirDonoAgendaBancoAtletas_(sessao, agenda);
    // getProjectTriggers só mostra gatilhos do usuário atual, nunca de outros donos.
    const proprios = ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === BANCO_ATLETAS_HANDLER && trigger.getEventType() === ScriptApp.EventType.CLOCK;
    });
    const trigger = proprios.find(function (item) { return String(item.getUniqueId()) === agenda.triggerId; })
      || proprios[0]
      || ScriptApp.newTrigger(BANCO_ATLETAS_HANDLER).timeBased().everyMinutes(15).create();
    gravarEstadoBancoAtletas_(BANCO_ATLETAS_AGENDA, {
      owner: owner, triggerId: String(trigger.getUniqueId()), installedAt: new Date().toISOString()
    });
    proprios.forEach(function (item) {
      if (item.getUniqueId() !== trigger.getUniqueId()) ScriptApp.deleteTrigger(item);
    });
    return statusBancoAtletas_(lerEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO), lerEstadoBancoAtletas_(BANCO_ATLETAS_AGENDA));
  });
}

function desativarAgendamentoBancoAtletas() {
  const sessao = exigirAdministracao_();
  return comLockBancoAtletas_(function () {
    const agenda = lerEstadoBancoAtletas_(BANCO_ATLETAS_AGENDA);
    exigirDonoAgendaBancoAtletas_(sessao, agenda);
    ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === BANCO_ATLETAS_HANDLER && trigger.getEventType() === ScriptApp.EventType.CLOCK;
    }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
    PropertiesService.getScriptProperties().deleteProperty(BANCO_ATLETAS_AGENDA);
    return statusBancoAtletas_(lerEstadoBancoAtletas_(BANCO_ATLETAS_ESTADO), {});
  });
}

function atualizarBancoAtletasAgendado(evento) {
  const sessao = exigirAdministracao_();
  const agenda = lerEstadoBancoAtletas_(BANCO_ATLETAS_AGENDA);
  validarGatilhoAgendado_(sessao, agenda, BANCO_ATLETAS_HANDLER, evento,
    'Gatilho do Banco de Atletas não configurado para esta conta.');
  return gerarSnapshotBancoAtletas_();
}

function construirBancoAtletas_() {
  exigirBancoAtletas_();

  const elenco = medirFaseAtletaBanco_('elenco', vinculosAtletasElenco_);
  const dadosSolicitacoes = medirFaseAtletaBanco_('solicitacoes', function () { return lerSolicitacoes_(true); });
  const dadosPunicoes = medirFaseAtletaBanco_('punicoes', listarPunicoes);
  const dadosSumulas = medirFaseAtletaBanco_('sumulas', function () { return lerSumulas_(true); });
  return medirFaseAtletaBanco_('consolidacao', function () {
    return consolidarAtletasBanco_(elenco, dadosSolicitacoes, dadosPunicoes, dadosSumulas);
  });
}

function consolidarAtletasBanco_(elenco, dadosSolicitacoes, dadosPunicoes, dadosSumulas) {
  const mapa = {};
  const lista = [];
  const indiceNome = {};

  (dadosSolicitacoes.registros || []).forEach(function (solicitacao) {
    (solicitacao.pessoas || []).forEach(function (pessoa) {
      const chave = chaveAtletaSolicitacao_(pessoa);

      if (!chave) {
        return;
      }

      let atleta = mapa[chave];

      if (!atleta) {
        atleta = criarAtletaConsolidado_(chave, {
          nome: pessoa.nome,
          cpf: pessoa.cpf,
          nascimento: pessoa.nascimento,
          tipo: pessoa.tipo,
          equipe: solicitacao.equipe,
          competicao: solicitacao.competicao
        });
        mapa[chave] = atleta;
        lista.push(atleta);
        registrarIndiceNomeAtleta_(indiceNome, atleta);
      }

      atualizarBaseAtleta_(atleta, {
        nome: pessoa.nome,
        cpf: pessoa.cpf,
        nascimento: pessoa.nascimento,
        tipo: pessoa.tipo,
        equipe: solicitacao.equipe,
        competicao: solicitacao.competicao
      });

      adicionarEquipeAoAtleta_(atleta, solicitacao.equipe);
      adicionarCompeticaoAoAtleta_(atleta, solicitacao.competicao);
      atleta.movimentacoes.push({
        ordem: Number(solicitacao.ordem || 0),
        protocolo: solicitacao.protocolo || '',
        dataHora: solicitacao.dataHora || '',
        situacaoSolicitacao: solicitacao.situacao || '',
        acao: pessoa.acao || '',
        tipo: pessoa.tipo || '',
        equipe: solicitacao.equipe || '',
        competicao: solicitacao.competicao || '',
        competicaoAnterior: pessoa.competicaoAnterior || '',
        responsavel: solicitacao.responsavel || '',
        arquivoUrl: solicitacao.arquivoUrl || '',
        resultadoPdfUrl: solicitacao.resultadoPdfUrl || '',
        resultadoTxtUrl: solicitacao.resultadoTxtUrl || ''
      });
    });
  });

  // Roster links come before name-based sources so punishments/súmulas can attach to them.
  elenco.grupos.forEach(function (grupo) {
    let atleta = mapa[grupo.chave];
    const criado = !atleta;

    if (!atleta) {
      // The most recent roster name wins for roster-only athletes.
      atleta = criarAtletaConsolidado_(grupo.chave, {
        nome: grupo.vinculos[0].nome,
        cpf: grupo.vinculos[0].cpf,
        nascimento: dataIsoParaBrAtleta_(grupo.vinculos[0].dataNascimento),
        tipo: 'Atleta'
      });
      mapa[grupo.chave] = atleta;
      lista.push(atleta);
    }

    grupo.vinculos.forEach(function (vinculo) {
      atualizarBaseAtleta_(atleta, {
        nome: criado ? '' : vinculo.nome,
        cpf: vinculo.cpf,
        nascimento: dataIsoParaBrAtleta_(vinculo.dataNascimento),
        tipo: 'Atleta'
      });
      adicionarEquipeAoAtleta_(atleta, vinculo.equipeNome);
      adicionarCompeticaoAoAtleta_(atleta, vinculo.campeonatoNome);
      atleta.vinculos.push(vinculo);
    });

    registrarIndiceNomeAtleta_(indiceNome, atleta);
  });

  (dadosPunicoes.registros || []).forEach(function (registro) {
    let atleta = localizarAtletaPorNomeEquipe_(indiceNome, registro.punido, registro.equipe);

    if (!atleta) {
      const chaveAvulsa = chaveAtletaAvulso_(registro.punido, registro.equipe);

      if (!chaveAvulsa) {
        return;
      }

      atleta = mapa[chaveAvulsa];

      if (!atleta) {
        atleta = criarAtletaConsolidado_(chaveAvulsa, {
          nome: registro.punido,
          tipo: registro.tipo,
          equipe: registro.equipe,
          competicao: registro.competicao
        });
        mapa[chaveAvulsa] = atleta;
        lista.push(atleta);
        registrarIndiceNomeAtleta_(indiceNome, atleta);
      }
    }

    atualizarBaseAtleta_(atleta, {
      nome: registro.punido,
      tipo: registro.tipo,
      equipe: registro.equipe,
      competicao: registro.competicao
    });

    adicionarEquipeAoAtleta_(atleta, registro.equipe);
    adicionarCompeticaoAoAtleta_(atleta, registro.competicao);
    atleta.punicoes.push({
      nota: registro.nota || '',
      dataNota: registro.dataNota || '',
      competicao: registro.competicao || '',
      dataJogo: registro.dataJogo || '',
      partida: registro.partida || '',
      equipe: registro.equipe || '',
      tipo: registro.tipo || '',
      camisa: registro.camisa || '',
      artigo: registro.artigo || '',
      partidas: registro.partidas || '',
      tempo: registro.tempo || '',
      decisao: registro.decisao || '',
      status: registro.status || '',
      situacao: registro.situacao || '',
      sumula: registro.sumula || ''
    });
  });

  (dadosSumulas.registros || []).forEach(function (registro) {
    (registro.envolvidos || []).forEach(function (envolvido) {
      let atleta = localizarAtletaPorNomeEquipe_(indiceNome, envolvido.nome, envolvido.equipe);

      if (!atleta) {
        const chaveAvulsa = chaveAtletaAvulso_(envolvido.nome, envolvido.equipe);

        if (!chaveAvulsa) {
          return;
        }

        atleta = mapa[chaveAvulsa];

        if (!atleta) {
          atleta = criarAtletaConsolidado_(chaveAvulsa, {
            nome: envolvido.nome,
            tipo: envolvido.tipo,
            equipe: envolvido.equipe
          });
          mapa[chaveAvulsa] = atleta;
          lista.push(atleta);
          registrarIndiceNomeAtleta_(indiceNome, atleta);
        }
      }

      atualizarBaseAtleta_(atleta, {
        nome: envolvido.nome,
        tipo: envolvido.tipo,
        equipe: envolvido.equipe
      });

      adicionarEquipeAoAtleta_(atleta, envolvido.equipe);
      atleta.sumulas.push({
        ordem: Number(registro.ordem || 0),
        situacao: registro.situacao || '',
        protocolo: registro.protocolo || '',
        dataJogo: registro.dataJogo || '',
        dataEnvio: registro.dataEnvio || '',
        confronto: registro.confronto || '',
        equipe: envolvido.equipe || '',
        tipo: envolvido.tipo || '',
        camisa: envolvido.camisa || '',
        pdfUrl: registro.pdfUrl || '',
        arquivoUrl: registro.arquivoUrl || ''
      });
    });
  });

  const registros = lista.map(function (atleta) {
    atleta.movimentacoes.sort(function (a, b) {
      return Number(b.ordem || 0) - Number(a.ordem || 0);
    });

    atleta.punicoes.sort(function (a, b) {
      const ordemB = ordemDataBr_(b.dataNota) || ordemDataBr_(b.dataJogo);
      const ordemA = ordemDataBr_(a.dataNota) || ordemDataBr_(a.dataJogo);

      return ordemB - ordemA;
    });

    atleta.sumulas.sort(function (a, b) {
      return Number(b.ordem || 0) - Number(a.ordem || 0);
    });

    const ultimaMovimentacao = atleta.movimentacoes[0] || null;
    const ultimaProcessada = atleta.movimentacoes.filter(function (item) {
      return item.situacaoSolicitacao === 'Processada';
    })[0] || null;

    atleta.aguardandoCadastro = atleta.movimentacoes.filter(function (item) {
      return item.situacaoSolicitacao === 'Aguardando';
    }).length;
    atleta.falhasCadastro = atleta.movimentacoes.filter(function (item) {
      return item.situacaoSolicitacao === 'Falha';
    }).length;
    atleta.pendenciasCadastro = atleta.aguardandoCadastro + atleta.falhasCadastro;
    atleta.totalMovimentacoes = atleta.movimentacoes.length;
    atleta.totalPunicoes = atleta.punicoes.length;
    atleta.punicoesACumprir = atleta.punicoes.filter(function (item) {
      return String(item.situacao || '').indexOf('A CUMPRIR') === 0;
    }).length;
    atleta.punicoesPendentes = atleta.punicoes.filter(function (item) {
      return item.status !== 'DEFINIDA';
    }).length;
    atleta.totalSumulas = atleta.sumulas.length;
    atleta.ultimaMovimentacao = ultimaMovimentacao ? ultimaMovimentacao.dataHora : '';
    atleta.ultimaAcao = ultimaMovimentacao ? ultimaMovimentacao.acao : '';
    atleta.ultimaSolicitacaoSituacao = ultimaMovimentacao ? ultimaMovimentacao.situacaoSolicitacao : '';
    atleta.ultimaSolicitacaoProtocolo = ultimaMovimentacao ? ultimaMovimentacao.protocolo : '';
    atleta.ultimaSumulaData = atleta.sumulas.length ? (atleta.sumulas[0].dataJogo || atleta.sumulas[0].dataEnvio) : '';
    atleta.situacaoCadastro = situacaoCadastroAtleta_(ultimaMovimentacao, ultimaProcessada);
    atleta.situacaoDisciplina = situacaoDisciplinaAtleta_(atleta);
    atleta.situacaoAtual = situacaoAtualAtleta_(atleta, ultimaMovimentacao, ultimaProcessada);

    const vinculosAtuais = atleta.vinculos.filter(function (vinculo) { return vinculo.atual; });
    const vinculosAtivos = vinculosAtuais.filter(function (vinculo) { return vinculo.ativo; });

    atleta.situacaoElenco = !atleta.vinculos.length ? 'Sem vínculo no elenco'
      : (vinculosAtivos.length ? 'Inscrito' : (vinculosAtuais.length ? 'Inscrito (inativo)' : 'Somente histórico'));

    // Legacy-only signals keep their meaning; roster data only replaces "no information".
    if (atleta.situacaoAtual === 'Sem inscrição processada' && atleta.vinculos.length) {
      atleta.situacaoAtual = vinculosAtuais.length ? 'Inscrito no elenco' : 'Fora dos elencos atuais';
    }

    if (ultimaProcessada) {
      atleta.equipeAtual = ultimaProcessada.equipe || atleta.equipeAtual;
      atleta.competicaoAtual = ultimaProcessada.competicao || atleta.competicaoAtual;
    } else if (vinculosAtuais.length) {
      const referencia = vinculosAtivos[0] || vinculosAtuais[0];
      atleta.equipeAtual = referencia.equipeNome || atleta.equipeAtual;
      atleta.competicaoAtual = referencia.campeonatoNome || atleta.competicaoAtual;
    }

    const equipesAtuais = [];
    const competicoesAtuais = [];

    vinculosAtuais.forEach(function (vinculo) {
      adicionarValorUnico_(equipesAtuais, vinculo.equipeNome);
      adicionarValorUnico_(competicoesAtuais, vinculo.campeonatoNome);
    });

    return {
      chave: atleta.chave,
      nome: atleta.nome,
      cpf: atleta.cpf,
      nascimento: atleta.nascimento,
      tipo: atleta.tipo,
      equipeAtual: atleta.equipeAtual,
      competicaoAtual: atleta.competicaoAtual,
      situacaoAtual: atleta.situacaoAtual,
      situacaoCadastro: atleta.situacaoCadastro,
      situacaoDisciplina: atleta.situacaoDisciplina,
      totalMovimentacoes: atleta.totalMovimentacoes,
      pendenciasCadastro: atleta.pendenciasCadastro,
      aguardandoCadastro: atleta.aguardandoCadastro,
      falhasCadastro: atleta.falhasCadastro,
      totalPunicoes: atleta.totalPunicoes,
      punicoesACumprir: atleta.punicoesACumprir,
      punicoesPendentes: atleta.punicoesPendentes,
      totalSumulas: atleta.totalSumulas,
      ultimaMovimentacao: atleta.ultimaMovimentacao,
      ultimaAcao: atleta.ultimaAcao,
      ultimaSolicitacaoSituacao: atleta.ultimaSolicitacaoSituacao,
      ultimaSolicitacaoProtocolo: atleta.ultimaSolicitacaoProtocolo,
      ultimaSumulaData: atleta.ultimaSumulaData,
      equipesHistorico: atleta.equipesHistorico.slice(),
      competicoesHistorico: atleta.competicoesHistorico.slice(),
      movimentacoes: atleta.movimentacoes.slice(0, 12),
      punicoes: atleta.punicoes.slice(0, 8),
      sumulas: atleta.sumulas.slice(0, 8),
      situacaoElenco: atleta.situacaoElenco,
      equipesAtuais: equipesAtuais,
      competicoesAtuais: competicoesAtuais,
      totalVinculos: atleta.vinculos.length,
      vinculosAtuais: vinculosAtuais.length,
      vinculos: atleta.vinculos.slice()
    };
  }).sort(function (a, b) {
    const ordem = prioridadeSituacaoAtleta_(a.situacaoAtual) - prioridadeSituacaoAtleta_(b.situacaoAtual);

    if (ordem !== 0) {
      return ordem;
    }

    return String(a.nome || '').localeCompare(String(b.nome || ''));
  });

  return {
    registros: registros,
    total: registros.length,
    fontes: {
      solicitacoesLidas: (dadosSolicitacoes.registros || []).length,
      solicitacoesTotal: Number(dadosSolicitacoes.total || 0),
      solicitacoesPastaUrl: dadosSolicitacoes.pastaUrl || '',
      punicoesTotal: (dadosPunicoes.registros || []).length,
      punicoesArquivoUrl: dadosPunicoes.arquivoUrl || '',
      punicoesAtualizadoEm: dadosPunicoes.atualizadoEm || '',
      sumulasLidas: (dadosSumulas.registros || []).length,
      sumulasTotal: Number(dadosSumulas.total || 0),
      sumulasPastaUrl: dadosSumulas.pastaUrl || '',
      elencoCampeonatos: elenco.campeonatos,
      elencoInscricoesAtuais: elenco.atuais,
      elencoInscricoesAnteriores: elenco.anteriores
    }
  };
}

/**
 * Athlete enrollments from every championship roster, current and historical.
 * Reconciles the permanent history under the script lock (same path as imports),
 * then releases it before the legacy Drive sources are read. Commission members
 * are not athletes and stay out. Photos/RG never leave the server.
 */
function vinculosAtletasElenco_() {
  const lock = LockService.getScriptLock();
  const cache = {};
  // Apenas listas desta reconciliação; não representa contexto autorizado nem reutiliza handles.
  const recursos = {};
  let historico;
  let campeonatos;
  let equipes;

  lock.waitLock(30000);

  try {
    historico = prepararHistoricoElenco_(cache, recursos);
    campeonatos = recursos.campeonatos;
    equipes = recursos.equipes;
  } finally {
    lock.releaseLock();
  }

  const associadas = obterEquipes_().map(chaveEquipe_);
  const campeonatoPorId = {};
  const equipePorId = {};
  const participacaoPorPar = {};
  const cobertos = {};
  const grupos = {};
  const ordem = [];
  let atuais = 0;
  let anteriores = 0;

  campeonatos.forEach(function (item) { campeonatoPorId[item.id] = item; });
  equipes.forEach(function (item) { equipePorId[item.id] = item; });
  historico.participacoes.forEach(function (item) {
    participacaoPorPar[item.equipeId + '|' + item.campeonatoId] = item;
  });

  function adicionar(vinculo) {
    // Valid CPF links the same person across teams/championships; otherwise
    // only the stable roster record does — names are never used to merge.
    const chave = cpfValido_(vinculo.cpf)
      ? 'CPF:' + vinculo.cpf
      : 'REGISTRO:' + vinculo.campeonatoId + ':' + (vinculo.registroId || vinculo.id);

    if (!grupos[chave]) {
      grupos[chave] = { chave: chave, vinculos: [] };
      ordem.push(chave);
    }

    grupos[chave].vinculos.push(vinculo);

    if (vinculo.atual) atuais++;
    else anteriores++;
  }

  historico.inscricoes.forEach(function (item) {
    if (item.tipo !== 'atletas') return;

    const campeonato = campeonatoPorId[item.campeonatoId] || null;
    const atual = Boolean(item.presente && campeonato);

    if (atual) cobertos[item.campeonatoId + '|' + item.registroId] = true;

    adicionar(montarVinculoAtleta_({
      id: item.id,
      registroId: item.registroId,
      campeonatoId: item.campeonatoId,
      campeonato: campeonato,
      participacao: participacaoPorPar[item.equipeId + '|' + item.campeonatoId] || null,
      equipeId: item.equipeId,
      equipe: equipePorId[item.equipeId] || null,
      associadas: associadas,
      cpf: item.cpf,
      dados: item.dados || {},
      atual: atual,
      registradoEm: item.inscritoEm,
      atualizadoEm: item.atualizadoEm,
      sequencia: item.sequencia,
      noHistorico: true
    }));
  });

  // Rows the history cannot attach to a team (blank team) are still real roster rows.
  campeonatos.forEach(function (campeonato) {
    ((cache[campeonato.id] || {}).atletas || []).forEach(function (pessoa) {
      if (cobertos[campeonato.id + '|' + pessoa.id]) return;

      adicionar(montarVinculoAtleta_({
        id: 'elenco:' + campeonato.id + ':' + pessoa.id,
        registroId: pessoa.id,
        campeonatoId: campeonato.id,
        campeonato: campeonato,
        participacao: null,
        equipeId: '',
        equipe: null,
        associadas: associadas,
        cpf: pessoa.cpf,
        dados: pessoa,
        atual: true,
        registradoEm: '',
        atualizadoEm: '',
        sequencia: 0,
        noHistorico: false
      }));
    });
  });

  return {
    campeonatos: campeonatos.length,
    atuais: atuais,
    anteriores: anteriores,
    grupos: ordem.map(function (chave) {
      grupos[chave].vinculos.sort(compararVinculosAtleta_);
      return grupos[chave];
    })
  };
}

function montarVinculoAtleta_(origem) {
  const dados = origem.dados || {};
  const campeonato = origem.campeonato;
  const participacao = origem.participacao;
  const equipe = origem.equipe;
  const nomeRegistrado = participacao ? String(participacao.equipeNome || '') : String(dados.timeVinculado || '');
  const equipeNome = equipe ? String(equipe.nome || '') : nomeRegistrado;
  const equipeNomeOriginal = participacao ? String(participacao.equipeNomeOriginal || '') : '';
  const campeonatoNomeRegistrado = participacao ? String(participacao.campeonatoNome || '') : '';
  const campeonatoNomeOriginal = participacao ? String(participacao.campeonatoNomeOriginal || '') : '';
  const campeonatoNome = campeonato ? campeonato.nome : (campeonatoNomeRegistrado || campeonatoNomeOriginal);
  const ativo = dados.ativo !== false;
  const diferente = function (a, b) { return Boolean(a) && chaveEquipe_(a) !== chaveEquipe_(b); };
  let situacao = 'Vínculo anterior';

  if (origem.atual) situacao = ativo ? 'Inscrição atual' : 'Inscrição atual (inativo)';
  else if (!campeonato) situacao = 'Competição excluída';

  return {
    id: String(origem.id || ''),
    registroId: String(origem.registroId || ''),
    atual: Boolean(origem.atual),
    ativo: ativo,
    situacao: situacao,
    noHistorico: Boolean(origem.noHistorico),
    campeonatoId: String(origem.campeonatoId || ''),
    campeonatoNome: campeonatoNome,
    campeonatoNomeOriginal: diferente(campeonatoNomeOriginal, campeonatoNome) ? campeonatoNomeOriginal : '',
    campeonatoNomeRegistrado: diferente(campeonatoNomeRegistrado, campeonatoNome) ? campeonatoNomeRegistrado : '',
    temporada: campeonato ? String(campeonato.temporada || '') : '',
    campeonatoStatus: campeonato ? String(campeonato.status || '') : 'excluido',
    campeonatoExcluido: !campeonato,
    equipeId: String(origem.equipeId || ''),
    equipeNome: equipeNome,
    equipeNomeOriginal: diferente(equipeNomeOriginal, equipeNome) ? equipeNomeOriginal : '',
    equipeNomeRegistrado: diferente(nomeRegistrado, equipeNome) ? nomeRegistrado : '',
    equipeAssociada: Boolean(equipe && origem.associadas.indexOf(chaveEquipe_(equipe.nome)) !== -1),
    nome: limparCampo_(dados.nome || '', 150),
    apelido: limparCampo_(dados.apelido || '', 50),
    numero: dados.numero === undefined || dados.numero === null ? '' : dados.numero,
    posicao: limparCampo_(dados.posicao || '', 40),
    cpf: somenteDigitos_(origem.cpf || dados.cpf || ''),
    dataNascimento: limparCampo_(dados.dataNascimento || '', 20),
    registradoEm: String(origem.registradoEm || ''),
    atualizadoEm: String(origem.atualizadoEm || ''),
    sequencia: Number(origem.sequencia || 0)
  };
}

// Most recent first: rows outside the history are current, so they lead.
function compararVinculosAtleta_(a, b) {
  const dataA = a.noHistorico ? a.registradoEm : '\uffff';
  const dataB = b.noHistorico ? b.registradoEm : '\uffff';

  if (dataA !== dataB) return dataA < dataB ? 1 : -1;
  if (a.sequencia !== b.sequencia) return b.sequencia - a.sequencia;
  if (a.atual !== b.atual) return a.atual ? -1 : 1;

  return String(a.campeonatoNome).localeCompare(String(b.campeonatoNome));
}

function dataIsoParaBrAtleta_(valor) {
  const partes = String(valor || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return partes ? partes[3] + '/' + partes[2] + '/' + partes[1] : limparCampo_(valor || '', 20);
}

function criarAtletaConsolidado_(chave, dados) {
  const atleta = {
    chave: chave,
    nome: limparCampo_(dados.nome || 'Atleta não identificado', 150) || 'Atleta não identificado',
    cpf: somenteDigitos_(dados.cpf),
    nascimento: limparCampo_(dados.nascimento || '', 20),
    tipo: limparCampo_(dados.tipo || '', 40),
    equipeAtual: limparCampo_(dados.equipe || '', 120),
    competicaoAtual: limparCampo_(dados.competicao || '', 120),
    situacaoAtual: '',
    situacaoCadastro: '',
    situacaoDisciplina: '',
    totalMovimentacoes: 0,
    pendenciasCadastro: 0,
    aguardandoCadastro: 0,
    falhasCadastro: 0,
    totalPunicoes: 0,
    punicoesACumprir: 0,
    punicoesPendentes: 0,
    totalSumulas: 0,
    ultimaMovimentacao: '',
    ultimaAcao: '',
    ultimaSolicitacaoSituacao: '',
    ultimaSolicitacaoProtocolo: '',
    ultimaSumulaData: '',
    equipesHistorico: [],
    competicoesHistorico: [],
    movimentacoes: [],
    punicoes: [],
    sumulas: [],
    vinculos: [],
    _equipes: {}
  };

  adicionarEquipeAoAtleta_(atleta, dados.equipe);
  adicionarCompeticaoAoAtleta_(atleta, dados.competicao);

  return atleta;
}

function atualizarBaseAtleta_(atleta, dados) {
  const nome = limparCampo_(dados.nome || '', 150);
  const cpf = somenteDigitos_(dados.cpf);
  const nascimento = limparCampo_(dados.nascimento || '', 20);
  const tipo = limparCampo_(dados.tipo || '', 40);
  const equipe = limparCampo_(dados.equipe || '', 120);
  const competicao = limparCampo_(dados.competicao || '', 120);

  if (nome && (atleta.nome === 'Atleta não identificado' || atleta.nome.length < nome.length)) {
    atleta.nome = nome;
  }

  if (!atleta.cpf && cpf.length === 11) {
    atleta.cpf = cpf;
  }

  if (!atleta.nascimento && nascimento) {
    atleta.nascimento = nascimento;
  }

  if (!atleta.tipo && tipo) {
    atleta.tipo = tipo;
  }

  if (!atleta.equipeAtual && equipe) {
    atleta.equipeAtual = equipe;
  }

  if (!atleta.competicaoAtual && competicao) {
    atleta.competicaoAtual = competicao;
  }
}

function registrarIndiceNomeAtleta_(indiceNome, atleta) {
  const chave = chaveNomePessoa_(atleta.nome);

  if (!chave) {
    return;
  }

  if (!indiceNome[chave]) {
    indiceNome[chave] = [];
  }

  if (indiceNome[chave].indexOf(atleta) === -1) {
    indiceNome[chave].push(atleta);
  }
}

function localizarAtletaPorNomeEquipe_(indiceNome, nome, equipe) {
  const candidatos = indiceNome[chaveNomePessoa_(nome)] || [];

  if (!candidatos.length) {
    return null;
  }

  const equipeChave = chaveEquipe_(equipe);

  if (!equipeChave) {
    return candidatos.length === 1 ? candidatos[0] : null;
  }

  const comEquipe = candidatos.filter(function (atleta) {
    return Boolean(atleta._equipes[equipeChave]);
  });

  if (comEquipe.length === 1) {
    return comEquipe[0];
  }

  return candidatos.length === 1 ? candidatos[0] : null;
}

function adicionarEquipeAoAtleta_(atleta, equipe) {
  const texto = limparCampo_(equipe || '', 120);

  if (!texto) {
    return;
  }

  atleta._equipes[chaveEquipe_(texto)] = true;
  adicionarValorUnico_(atleta.equipesHistorico, texto);
}

function adicionarCompeticaoAoAtleta_(atleta, competicao) {
  adicionarValorUnico_(atleta.competicoesHistorico, limparCampo_(competicao || '', 120));
}

function adicionarValorUnico_(lista, valor) {
  const texto = String(valor || '').trim();

  if (texto && lista.indexOf(texto) === -1) {
    lista.push(texto);
  }
}

function chaveAtletaSolicitacao_(pessoa) {
  const cpf = somenteDigitos_(pessoa && pessoa.cpf);

  if (cpf.length === 11) {
    return 'CPF:' + cpf;
  }

  const nome = chaveNomePessoa_(pessoa && pessoa.nome);
  const nascimento = limparCampo_(pessoa && pessoa.nascimento || '', 20);

  return nome ? 'NOME:' + nome + '|' + nascimento : '';
}

function chaveAtletaAvulso_(nome, equipe) {
  const chaveNome = chaveNomePessoa_(nome);

  if (!chaveNome) {
    return '';
  }

  return 'AVULSO:' + chaveNome + '|' + chaveEquipe_(equipe || '');
}

function chaveNomePessoa_(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function ordemDataBr_(valor) {
  const achado = String(valor || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);

  if (!achado) {
    return 0;
  }

  return Number(achado[3] + achado[2] + achado[1] + (achado[4] || '00') + (achado[5] || '00'));
}

function situacaoCadastroAtleta_(ultimaMovimentacao, ultimaProcessada) {
  if (ultimaMovimentacao && ultimaMovimentacao.situacaoSolicitacao === 'Aguardando') {
    return 'Aguardando';
  }

  if (ultimaMovimentacao && ultimaMovimentacao.situacaoSolicitacao === 'Falha') {
    return 'Falha';
  }

  if (!ultimaProcessada) {
    return 'Sem cadastro';
  }

  if (ultimaProcessada.acao === 'Remocao') {
    return 'Fora da competição';
  }

  if (ultimaProcessada.acao === 'Portabilidade') {
    return 'Portado';
  }

  if (ultimaProcessada.acao === 'Inclusao') {
    return 'Inscrito';
  }

  return 'Processado';
}

function situacaoDisciplinaAtleta_(atleta) {
  if (atleta.punicoesACumprir > 0) {
    return 'Suspenso';
  }

  if (atleta.punicoesPendentes > 0) {
    return 'Pena a definir';
  }

  return 'Regular';
}

function situacaoAtualAtleta_(atleta, ultimaMovimentacao, ultimaProcessada) {
  if (atleta.punicoesACumprir > 0) {
    return 'Suspenso';
  }

  if (ultimaMovimentacao && ultimaMovimentacao.situacaoSolicitacao === 'Aguardando') {
    return ultimaProcessada ? 'Aguardando atualização' : 'Aguardando inscrição';
  }

  if (ultimaMovimentacao && ultimaMovimentacao.situacaoSolicitacao === 'Falha') {
    return ultimaProcessada ? 'Falha recente' : 'Cadastro com falha';
  }

  if (ultimaProcessada) {
    return ultimaProcessada.acao === 'Remocao' ? 'Fora da competição' : 'Regular';
  }

  if (atleta.totalSumulas > 0) {
    return 'Em súmula';
  }

  if (atleta.punicoesPendentes > 0) {
    return 'Pena a definir';
  }

  return 'Sem inscrição processada';
}

function prioridadeSituacaoAtleta_(situacao) {
  const ordem = {
    'Suspenso': 0,
    'Aguardando inscrição': 1,
    'Aguardando atualização': 2,
    'Cadastro com falha': 3,
    'Falha recente': 4,
    'Pena a definir': 5,
    'Regular': 6,
    'Inscrito no elenco': 6,
    'Em súmula': 7,
    'Fora da competição': 8,
    'Fora dos elencos atuais': 8,
    'Sem inscrição processada': 9
  };

  return ordem[situacao] !== undefined ? ordem[situacao] : 99;
}

/******************************************************
 * NOTAS OFICIAIS
 *
 * Consulta as notas oficiais disciplinares ja fechadas pela comissao.
 * O caminho e o mesmo das outras telas: a automacao em Python publica o
 * arquivo no Drive e esta tela apenas le.
 *
 * So chega aqui nota final. Enquanto a nota tem [A DEFINIR] ou
 * divergencias apontadas pela IA, ela fica so na maquina de quem gerou
 * (publicacao_drive.nota_e_final). Assim a diretoria nunca ve na tela um
 * texto que ainda pode mudar.
 *
 * Cada nota tem dois arquivos com o mesmo nome: o TXT, que esta tela le
 * para montar o resumo, e o PDF assinado, que e o documento oficial.
 ******************************************************/

/**
 * Devolve as notas oficiais publicadas para a tela de consulta.
 * Chamada pelo cliente; refaz a verificacao de permissao no servidor.
 * @return {{registros: Array<Object>, competicoes: Array<string>, equipes: Array<string>,
 *           total: number, limite: number, pastaUrl: string}}
 */
function listarNotas() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || !moduloLiberado_('notas', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para consultar as notas oficiais.');
  }

  const pasta = pastaNotas_();
  const arquivos = [];
  const pdfs = {};
  const iterador = pasta.getFiles();

  while (iterador.hasNext()) {
    const arquivo = iterador.next();
    const nome = arquivo.getName();

    // O TXT e a fonte do resumo; o PDF entra so como link, casado pelo
    // nome sem extensao (a automacao grava os dois com o mesmo nome).
    if (/\.pdf$/i.test(nome)) {
      pdfs[nome.replace(/\.pdf$/i, '')] = arquivo.getUrl();
      continue;
    }

    if (/^NOTA OFICIAL.+\.txt$/i.test(nome)) {
      arquivos.push(arquivo);
    }
  }

  const limite = CONFIG.notas.maxLeitura;

  const registros = arquivos.map(function (arquivo) {
    return interpretarNota_(arquivo.getBlob().getDataAsString('UTF-8'), arquivo);
  });

  // A nota mais recente primeiro: o numero e sequencial e nunca se repete.
  registros.sort(function (a, b) {
    return b.ordem - a.ordem;
  });

  const punidos = indicePunidosPorNota_();

  const recortados = registros.slice(0, limite);

  recortados.forEach(function (registro) {
    registro.pdfUrl = pdfs[registro.arquivoNome.replace(/\.txt$/i, '')] || '';
    registro.punidos = punidos[chaveProtocolo_(registro.numero)] || [];
    registro.equipes = equipesDaNota_(registro);
  });

  return {
    registros: recortados,
    competicoes: valoresUnicos_(recortados, 'competicao'),
    equipes: equipesDasNotas_(recortados),
    total: registros.length,
    limite: limite,
    pastaUrl: pasta.getUrl()
  };
}

/**
 * Subpasta do Drive com as notas oficiais publicadas.
 * @return {DriveApp.Folder}
 */
function pastaNotas_() {
  const raiz = pastaSumulas_();
  const pastas = raiz.getFoldersByName(CONFIG.notas.subpasta);

  if (!pastas.hasNext()) {
    throw new Error('A pasta "' + CONFIG.notas.subpasta + '" ainda não existe dentro de "'
      + raiz.getName() + '". Crie-a no Drive e publique as notas com '
      + 'main.py --publicar-drive.');
  }

  return pastas.next();
}

/**
 * Punidos agrupados pelo numero da nota que aplicou a punicao.
 *
 * Mesma ideia de indiceNotas_(), so que a chave aqui e a coluna NOTA em
 * vez da coluna SUMULA: evita abrir e reinterpretar o texto de cada nota
 * para saber quem foi punido e qual pena recebeu.
 * @return {Object<string, Array<Object>>}
 */
function indicePunidosPorNota_() {
  let conteudo;

  try {
    conteudo = arquivoPunicoes_().getBlob().getDataAsString('UTF-8');
  } catch (e) {
    // Controle ausente ou sem acesso: a tela continua, apenas sem os punidos.
    return {};
  }

  const indice = {};

  interpretarPunicoes_(conteudo).forEach(function (registro) {
    const chave = chaveProtocolo_(registro.nota);

    if (!chave) {
      return;
    }

    if (!indice[chave]) {
      indice[chave] = [];
    }

    indice[chave].push({
      nome: registro.punido,
      equipe: registro.equipe,
      tipo: registro.tipo,
      camisa: registro.camisa,
      artigo: registro.artigo,
      decisao: registro.decisao,
      status: registro.status,
      situacao: registro.situacao
    });
  });

  return indice;
}

/**
 * Le o TXT da nota oficial gerado por sumula_disciplinar.py.
 *
 * O texto e um documento corrido, nao uma lista de campos: a leitura
 * procura os poucos trechos com formato fixo e guarda o resto como corpo,
 * que a tela mostra na integra.
 *
 * Trechos com formato fixo:
 *   "NOTA OFICIAL Nº 008/2026"          numero e ano
 *   linha seguinte                      competicao
 *   "partida entre X x Y, realizada em" confronto e data do jogo
 *   "(súmula SUM-..., árbitro ...)"     protocolo que originou a nota
 *   "Uberlândia/MG, 26 de setembro..."  cidade e data da nota
 *
 * @param {string} conteudo
 * @param {DriveApp.File} arquivo
 * @return {Object}
 */
function interpretarNota_(conteudo, arquivo) {
  const texto = String(conteudo || '').replace(/\r/g, '');
  const linhas = texto.split('\n');

  // O aviso de rascunho, quando existe, vem antes do titulo.
  let inicio = 0;

  for (let i = 0; i < linhas.length; i++) {
    if (/^NOTA OFICIAL/i.test(linhas[i].trim())) {
      inicio = i;
      break;
    }
  }

  const corpo = linhas.slice(inicio);
  const numeroAchado = texto.match(/NOTA OFICIAL\s+N[ºo°]?\s*(\d+)\s*[\/-]\s*(\d{4})/i);
  const numero = numeroAchado ? (numeroAchado[1] + '/' + numeroAchado[2]) : '';

  // Competicao: primeira linha com conteudo depois do titulo.
  let competicao = '';

  for (let i = 1; i < corpo.length && !competicao; i++) {
    if (corpo[i].trim()) {
      competicao = corpo[i].trim();
    }
  }

  const partidaAchada = texto.match(/partida entre\s+(.+?),\s*realizada em\s+([^,.]+)/i);
  const protocoloAchado = texto.match(/\b(SUM-\d{6,}-[A-Z0-9]+)\b/i);
  const arbitroAchado = texto.match(/árbitro\s+([^)\n]+)\)/i);
  const dataNotaAchada = texto.match(/\n\s*([^,\n]+),\s*(\d{1,2}\s+de\s+[^\s]+\s+de\s+\d{4})\s*\.\s*\n/i);
  const confronto = partidaAchada ? partidaAchada[1].trim() : '';

  return {
    numero: numero,

    // Ordena pelo numero da nota, que e sequencial dentro do ano.
    ordem: numeroAchado ? (Number(numeroAchado[2]) * 1000 + Number(numeroAchado[1])) : 0,
    competicao: competicao,
    confronto: confronto,
    times: separarConfronto_(confronto),
    dataJogo: partidaAchada ? partidaAchada[2].trim() : '',
    protocolo: protocoloAchado ? protocoloAchado[1].toUpperCase() : '',
    arbitro: arbitroAchado ? arbitroAchado[1].trim() : '',
    cidade: dataNotaAchada ? dataNotaAchada[1].trim() : '',
    dataNota: dataNotaAchada ? dataNotaAchada[2].trim() : '',
    pendente: corpo.join('\n').indexOf('[A DEFINIR') !== -1,
    texto: aparar_(corpo).join('\n'),
    arquivoNome: arquivo.getName(),
    arquivoUrl: arquivo.getUrl(),
    pdfUrl: '',
    punidos: [],
    equipes: []
  };
}

/**
 * Equipes citadas na nota: os times da partida mais a equipe de cada punido.
 * @param {Object} registro
 * @return {Array<string>}
 */
function equipesDaNota_(registro) {
  const equipes = registro.times.slice();

  registro.punidos.forEach(function (punido) {
    if (punido.equipe && equipes.indexOf(punido.equipe) === -1) {
      equipes.push(punido.equipe);
    }
  });

  return equipes;
}

/**
 * Todas as equipes citadas nas notas, em ordem alfabetica; alimenta o filtro.
 * @param {Array<Object>} registros
 * @return {Array<string>}
 */
function equipesDasNotas_(registros) {
  const equipes = [];

  registros.forEach(function (registro) {
    registro.equipes.forEach(function (equipe) {
      if (equipe && equipes.indexOf(equipe) === -1) {
        equipes.push(equipe);
      }
    });
  });

  return equipes.sort();
}

/**
 * Valores distintos de um campo, em ordem alfabetica; alimenta filtros.
 * @param {Array<Object>} registros
 * @param {string} campo
 * @return {Array<string>}
 */
function valoresUnicos_(registros, campo) {
  const valores = [];

  registros.forEach(function (registro) {
    const valor = registro[campo];

    if (valor && valores.indexOf(valor) === -1) {
      valores.push(valor);
    }
  });

  return valores.sort();
}

/******************************************************
 * REGULAMENTOS
 *
 * Lista os regulamentos oficiais publicados. E a unica tela de consulta
 * aberta a todos os perfis: o regulamento e o documento que todas as
 * equipes e a arbitragem precisam ter a mao.
 *
 * A pasta fica na raiz do projeto no Drive e recebe o PDF final gerado
 * por main.py --gerar-pdf-regulamento. So o PDF e publicado: o texto de
 * trabalho continua no repositorio.
 ******************************************************/

/**
 * Devolve os regulamentos publicados para a tela de consulta.
 * Chamada pelo cliente; refaz a verificacao de permissao no servidor.
 * @return {{registros: Array<Object>, total: number, limite: number, pastaUrl: string}}
 */
function listarRegulamentos() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || !moduloLiberado_('regulamentos', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para consultar os regulamentos.');
  }

  const pasta = pastaRegulamentos_();
  const registros = [];
  const iterador = pasta.getFiles();

  while (iterador.hasNext()) {
    const arquivo = iterador.next();
    const nome = arquivo.getName();

    if (!/\.pdf$/i.test(nome)) {
      continue;
    }

    const atualizado = arquivo.getLastUpdated();

    registros.push({
      nome: nome,
      titulo: tituloRegulamento_(nome),
      url: arquivo.getUrl(),

      // Link direto de download, util para quem quer guardar o arquivo.
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + arquivo.getId(),
      tamanho: tamanhoLegivel_(arquivo.getSize()),
      atualizadoEm: Utilities.formatDate(atualizado, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
      ordem: atualizado.getTime()
    });
  }

  // O regulamento revisado mais recentemente aparece primeiro.
  registros.sort(function (a, b) {
    return b.ordem - a.ordem;
  });

  return {
    registros: registros.slice(0, CONFIG.regulamentos.maxLeitura),
    total: registros.length,
    limite: CONFIG.regulamentos.maxLeitura,
    pastaUrl: pasta.getUrl()
  };
}

/**
 * Link da subpasta para que o associado solicite acesso pelo proprio Drive.
 * Nao compartilha a pasta nem expoe o id da pasta raiz.
 * @return {string}
 */
function urlPastaRegulamentos_() {
  const id = PropertiesService.getScriptProperties().getProperty(CONFIG.regulamentos.chavePasta);
  return id ? 'https://drive.google.com/drive/folders/' + encodeURIComponent(id) : '';
}

/**
 * Subpasta do Drive com os regulamentos publicados.
 * @return {DriveApp.Folder}
 */
function pastaRegulamentos_() {
  const propriedades = PropertiesService.getScriptProperties();
  const guardado = propriedades.getProperty(CONFIG.regulamentos.chavePasta);

  // Abre a subpasta direto pelo id: quem so tem leitura em "Regulamentos"
  // (caso dos associados) nao precisa de acesso a pasta raiz do projeto.
  if (guardado) {
    try {
      const pasta = DriveApp.getFolderById(guardado);

      if (!pasta.isTrashed()) {
        return pasta;
      }
    } catch (e) {
      // Sem acesso ou pasta removida: tenta pela raiz.
    }
  }

  let raiz;

  try {
    raiz = DriveApp.getFolderById(CONFIG.pastaRaizId);
  } catch (e) {
    throw new Error(guardado
      ? 'Não foi possível abrir a pasta "' + CONFIG.regulamentos.subpasta + '" no Drive. '
        + 'Peça à administração para compartilhá-la com o seu e-mail (Leitor).'
      : 'A pasta de regulamentos ainda não foi registrada. Um administrador ou a '
        + 'diretoria precisa abrir a tela de Regulamentos uma vez.');
  }

  const pastas = raiz.getFoldersByName(CONFIG.regulamentos.subpasta);

  if (!pastas.hasNext()) {
    throw new Error('A pasta "' + CONFIG.regulamentos.subpasta + '" ainda não existe dentro de "'
      + raiz.getName() + '". Crie-a no Drive e publique o regulamento com '
      + 'main.py --publicar-drive.');
  }

  const pasta = pastas.next();
  propriedades.setProperty(CONFIG.regulamentos.chavePasta, pasta.getId());

  return pasta;
}

/**
 * Titulo legivel a partir do nome do arquivo.
 * "regulamento-7-super-liga-união-2026.pdf" -> "Regulamento 7 Super Liga União 2026".
 * @param {string} nome
 * @return {string}
 */
function tituloRegulamento_(nome) {
  const limpo = String(nome || '').replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();

  return limpo.replace(/\S+/g, function (palavra) {
    // Numeros e siglas curtas ficam como estao; o resto vai para Capitalizado.
    if (/^\d/.test(palavra)) {
      return palavra;
    }

    return palavra.charAt(0).toUpperCase() + palavra.slice(1);
  });
}

/**
 * Tamanho do arquivo em texto curto, para a tela.
 * @param {number} bytes
 * @return {string}
 */
function tamanhoLegivel_(bytes) {
  const valor = Number(bytes) || 0;

  if (valor < 1024) {
    return valor + ' B';
  }

  if (valor < 1024 * 1024) {
    return Math.round(valor / 1024) + ' KB';
  }

  return (valor / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
}

/******************************************************
 * CADASTRO DE ASSOCIADOS
 *
 * O associado e a equipe: existe um registro por equipe, com os dados
 * do representante legal e a documentacao entregue. Os dados ficam numa
 * planilha propria e os arquivos numa pasta do Drive, ambas criadas por
 * prepararAssociados() dentro da pasta raiz do projeto.
 *
 * A planilha foi escolhida no lugar de um arquivo TXT porque aqui varias
 * pessoas gravam e editam pela tela. O TXT do controle de punicoes e so
 * leitura: quem escreve nele e a automacao em Python, sozinha.
 ******************************************************/

/** Perfis que podem cadastrar e editar. Os demais apenas consultam. */
const ASSOCIADOS_PERFIS_EDICAO = ['admin', 'diretoria'];

/** Situacoes possiveis de um associado. */
const ASSOCIADOS_STATUS = [
  { id: 'ativo', nome: 'Ativo', icone: '🟢' },
  { id: 'pendente', nome: 'Pendente', icone: '🟡' },
  { id: 'inativo', nome: 'Inativo', icone: '🔴' },
  { id: 'suspenso', nome: 'Suspenso', icone: '⚫' }
];

/**
 * Documentos aceitos no cadastro. O id vira a coluna da planilha e o
 * nome do arquivo no Drive.
 */
const ASSOCIADOS_DOCUMENTOS = [
  { id: 'estatuto', nome: 'Estatuto da equipe', apoio: 'Se a equipe tiver estatuto registrado.' },
  { id: 'ata', nome: 'Ata de fundação', apoio: 'Ata que formalizou a criação da equipe.' },
  { id: 'documentoResponsavel', nome: 'Documento do responsável', apoio: 'RG ou CNH do representante legal.' },
  { id: 'comprovanteEndereco', nome: 'Comprovante de endereço', apoio: 'Emitido nos últimos três meses.' },
  { id: 'termoAssociacao', nome: 'Termo de associação AEUV', apoio: 'Termo assinado pelo representante.' },
  { id: 'regulamento', nome: 'Regulamento assinado', apoio: 'Regulamento da competição, assinado.' }
];

/** Tipos de arquivo aceitos nos anexos. */
const ASSOCIADOS_TIPOS_ARQUIVO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * Colunas da planilha, na ordem em que aparecem. A ordem e o que liga
 * cada celula ao seu campo: nao reordene sem migrar a planilha.
 */
const ASSOCIADOS_COLUNAS = [
  { id: 'equipe', titulo: 'Equipe' },
  { id: 'status', titulo: 'Status' },
  { id: 'nome', titulo: 'Representante legal' },
  { id: 'nascimento', titulo: 'Data de nascimento' },
  { id: 'email', titulo: 'E-mail' },
  { id: 'telefone', titulo: 'Telefone' },
  { id: 'cep', titulo: 'CEP' },
  { id: 'logradouro', titulo: 'Logradouro' },
  { id: 'numero', titulo: 'Número' },
  { id: 'complemento', titulo: 'Complemento' },
  { id: 'bairro', titulo: 'Bairro' },
  { id: 'cidade', titulo: 'Cidade' },
  { id: 'uf', titulo: 'UF' },
  { id: 'rg', titulo: 'RG' },
  { id: 'cpf', titulo: 'CPF' },
  { id: 'estatuto', titulo: 'Estatuto da equipe' },
  { id: 'ata', titulo: 'Ata de fundação' },
  { id: 'documentoResponsavel', titulo: 'Documento do responsável' },
  { id: 'comprovanteEndereco', titulo: 'Comprovante de endereço' },
  { id: 'termoAssociacao', titulo: 'Termo de associação' },
  { id: 'regulamento', titulo: 'Regulamento assinado' },
  { id: 'criadoEm', titulo: 'Criado em' },
  { id: 'atualizadoEm', titulo: 'Atualizado em' },
  { id: 'atualizadoPor', titulo: 'Atualizado por' }
];

/******************************************************
 * ATAS DE REUNIOES
 ******************************************************/

const ATAS_COLUNAS = [
  'ID', 'Tipo', 'Título', 'Data', 'Local', 'Participantes', 'Texto',
  'Criado em', 'Criado por', 'Atualizado em', 'Atualizado por', 'Revisão', 'PDF', 'Competição'
];

function exigirAcessoAtas_() {
  const sessao = identificarUsuario_();
  if (!sessao.autorizado || !moduloLiberado_('atas', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para acessar as atas.');
  }
  return sessao;
}

function planilhaAtas_() {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty(CONFIG.atas.chavePlanilha);
  if (id) {
    return SpreadsheetApp.openById(id);
  }

  const raiz = pastaRaizProjeto_();
  const arquivos = raiz.getFilesByName(CONFIG.atas.planilha);
  let planilha;
  if (arquivos.hasNext()) {
    planilha = SpreadsheetApp.openById(arquivos.next().getId());
  } else {
    planilha = SpreadsheetApp.create(CONFIG.atas.planilha);
    DriveApp.getFileById(planilha.getId()).moveTo(raiz);
  }
  propriedades.setProperty(CONFIG.atas.chavePlanilha, planilha.getId());
  return planilha;
}

function abaAtas_() {
  const planilha = planilhaAtas_();
  let aba = planilha.getSheetByName(CONFIG.atas.aba);
  if (!aba) {
    aba = planilha.insertSheet(CONFIG.atas.aba);
    aba.getRange(1, 1, 1, ATAS_COLUNAS.length).setValues([ATAS_COLUNAS]).setFontWeight('bold');
    aba.setFrozenRows(1);
    aba.getRange('D:D').setNumberFormat('@');
  } else if (aba.getRange(1, 14).getValue() !== ATAS_COLUNAS[13]) {
    aba.getRange(1, 14).setValue(ATAS_COLUNAS[13]).setFontWeight('bold');
  }
  return aba;
}

function pastaAtas_() {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty(CONFIG.atas.chavePasta);
  if (id) {
    return DriveApp.getFolderById(id);
  }

  const raiz = pastaRaizProjeto_();
  const pastas = raiz.getFoldersByName(CONFIG.atas.pasta);
  const pasta = pastas.hasNext() ? pastas.next() : raiz.createFolder(CONFIG.atas.pasta);
  propriedades.setProperty(CONFIG.atas.chavePasta, pasta.getId());
  return pasta;
}

function ataDaLinha_(linha) {
  const data = Object.prototype.toString.call(linha[3]) === '[object Date]'
    ? Utilities.formatDate(linha[3], Session.getScriptTimeZone(), 'yyyy-MM-dd')
    : String(linha[3] || '');
  return {
    id: String(linha[0] || ''),
    tipo: String(linha[1] || ''),
    titulo: String(linha[2] || ''),
    data: data,
    local: String(linha[4] || ''),
    participantes: String(linha[5] || ''),
    texto: String(linha[6] || ''),
    criadoEm: String(linha[7] || ''),
    criadoPor: String(linha[8] || ''),
    atualizadoEm: String(linha[9] || ''),
    atualizadoPor: String(linha[10] || ''),
    revisao: String(linha[11] || ''),
    pdfUrl: String(linha[12] || ''),
    competicao: String(linha[13] || '')
  };
}

function linhaAta_(ata) {
  return [
    ata.id, ata.tipo, ata.titulo, ata.data, ata.local, ata.participantes, ata.texto,
    ata.criadoEm, ata.criadoPor, ata.atualizadoEm, ata.atualizadoPor, ata.revisao, ata.pdfUrl,
    ata.competicao
  ];
}

function localizarAta_(aba, id) {
  const valores = aba.getDataRange().getValues();
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === id) {
      return { numero: i + 1, ata: ataDaLinha_(valores[i]) };
    }
  }
  throw new Error('Ata não encontrada. Atualize a lista e tente novamente.');
}

function listarAtas() {
  const sessao = exigirAcessoAtas_();
  const registros = abaAtas_().getDataRange().getValues().slice(1)
    .filter(function (linha) { return Boolean(linha[0]); })
    .map(function (linha) {
      const ata = ataDaLinha_(linha);
      return {
        id: ata.id, tipo: ata.tipo, titulo: ata.titulo, data: ata.data, competicao: ata.competicao,
        criadoEm: ata.criadoEm, atualizadoEm: ata.atualizadoEm, pdfUrl: ata.pdfUrl
      };
    })
    .sort(function (a, b) { return b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm); });
  return {
    registros: registros,
    competicoes: FINANCEIRO_COMPETICOES_ORIGEM.slice(1),
    podeEditar: sessao.usuario.perfil === 'admin' || sessao.usuario.perfil === 'diretoria',
    podeExcluir: sessao.usuario.perfil === 'admin'
  };
}

function obterAta(id) {
  exigirAcessoAtas_();
  return localizarAta_(abaAtas_(), String(id || '')).ata;
}

function salvarAta(payload) {
  const sessao = exigirAcessoAtas_();
  const dados = payload || {};
  const id = String(dados.id || '').trim();
  if (id && sessao.usuario.perfil !== 'admin' && sessao.usuario.perfil !== 'diretoria') {
    throw new Error('Somente Administrador e Diretoria podem editar atas existentes.');
  }
  const tipo = String(dados.tipo || '').trim();
  const competicao = tipo === 'campeonato' ? String(dados.competicao || '').trim() : '';
  if (tipo === 'campeonato' && FINANCEIRO_COMPETICOES_ORIGEM.slice(1).indexOf(competicao) === -1) {
    throw new Error('Selecione uma competição da lista para a ata do campeonato.');
  }
  const titulo = String(dados.titulo || '').trim();
  const data = String(dados.data || '').trim();
  const local = String(dados.local || '').trim();
  const participantes = String(dados.participantes || '').trim();
  const texto = String(dados.texto || '').trim();
  const partes = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dia = partes && new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  if (['associacao', 'campeonato'].indexOf(tipo) === -1 || !titulo || !partes || !dia
      || dia.getFullYear() !== Number(partes[1]) || dia.getMonth() !== Number(partes[2]) - 1
      || dia.getDate() !== Number(partes[3]) || !texto) {
    throw new Error('Preencha tipo, título, data válida e texto da ata.');
  }
  if (titulo.length > 160 || local.length > 200 || participantes.length > 5000 || texto.length > 40000) {
    throw new Error('Texto muito longo: título até 160, local até 200, participantes até 5.000 e ata até 40.000 caracteres.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const aba = abaAtas_();
    const anterior = id ? localizarAta_(aba, id) : null;
    if (anterior && anterior.ata.revisao !== String(dados.revisao || '')) {
      throw new Error('Esta ata foi alterada por outra pessoa. Recarregue antes de salvar.');
    }
    const agora = formatarDataHora_(new Date());
    const ata = {
      id: id || Utilities.getUuid(),
      tipo: tipo, titulo: titulo, data: data, local: local, competicao: competicao,
      participantes: participantes, texto: texto,
      criadoEm: anterior ? anterior.ata.criadoEm : agora,
      criadoPor: anterior ? anterior.ata.criadoPor : sessao.email,
      atualizadoEm: agora, atualizadoPor: sessao.email,
      revisao: Utilities.getUuid(), pdfUrl: ''
    };
    if (anterior) {
      aba.getRange(anterior.numero, 1, 1, ATAS_COLUNAS.length).setValues([linhaAta_(ata)]);
    } else {
      aba.appendRow(linhaAta_(ata));
    }
    return ata;
  } finally {
    lock.releaseLock();
  }
}

function excluirAta(id) {
  const sessao = exigirAcessoAtas_();
  if (sessao.usuario.perfil !== 'admin') {
    throw new Error('Somente o Administrador pode excluir atas.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const aba = abaAtas_();
    const encontrada = localizarAta_(aba, String(id || ''));
    const pastaId = PropertiesService.getScriptProperties().getProperty(CONFIG.atas.chavePasta);
    if (pastaId) {
      const arquivos = DriveApp.getFolderById(pastaId).getFiles();
      while (arquivos.hasNext()) {
        const arquivo = arquivos.next();
        if (arquivo.getName().indexOf('Ata ' + encontrada.ata.id + ' - ') === 0) {
          arquivo.setTrashed(true);
        }
      }
    }
    aba.deleteRow(encontrada.numero);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function assinaturaAtas_() {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty(CONFIG.atas.chaveAssinatura);
  if (id) {
    return DriveApp.getFileById(id).getBlob();
  }

  const arquivos = pastaRaizProjeto_().getFilesByName(CONFIG.atas.assinatura);
  if (!arquivos.hasNext()) {
    throw new Error('Assinatura do Presidente não encontrada. Envie assets/assinatura-presidente.png '
      + 'para a pasta AEUV - Automação no Drive antes de exportar a ata.');
  }
  const arquivo = arquivos.next();
  propriedades.setProperty(CONFIG.atas.chaveAssinatura, arquivo.getId());
  return arquivo.getBlob();
}

function formatarNegritoAta_(paragrafo, conteudo, corBase, negritoBase) {
  const intervalos = [];
  let removidos = 0;
  const texto = conteudo.replace(/\*\*(.+?)\*\*/g, function (_, trecho, indice) {
    const inicio = indice - removidos;
    intervalos.push({ inicio: inicio, fim: inicio + trecho.length - 1 });
    removidos += 4;
    return trecho;
  });
  const elemento = paragrafo.editAsText();
  elemento.setText(texto);
  if (!texto) return;
  elemento.setFontFamily('Arial').setFontSize(11)
    .setForegroundColor(corBase).setBold(negritoBase);
  intervalos.forEach(function (intervalo) {
    elemento.setBold(intervalo.inicio, intervalo.fim, true);
    // Nas faixas escuras, mantenha o contraste branco do título.
    elemento.setForegroundColor(intervalo.inicio, intervalo.fim,
      corBase === '#FFFFFF' ? corBase : '#1F3A68');
  });
}

function adicionarFaixaAta_(corpo, conteudo, clara) {
  const tabela = corpo.appendTable([['']]);
  tabela.setBorderWidth(0);
  const celula = tabela.getCell(0, 0);
  celula.setBackgroundColor(clara ? '#E9EEF8' : '#1F3A68')
    .setPaddingTop(5).setPaddingBottom(5)
    .setPaddingLeft(8).setPaddingRight(8);
  const paragrafo = celula.getChild(0).asParagraph();
  paragrafo.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);
  formatarNegritoAta_(paragrafo, conteudo, clara ? '#1F3A68' : '#FFFFFF', true);
}

function adicionarTextoAta_(corpo, texto) {
  let ultimoTopico = null;
  String(texto || '').split(/\r\n|\r|\n/).forEach(function (linha) {
    const limpa = linha.trim();
    if (!limpa) {
      corpo.appendParagraph('').setSpacingAfter(2);
      ultimoTopico = null;
      return;
    }
    // Não confunda **negrito** no início da linha com o marcador de faixa.
    const marcador = limpa.match(/^(\*(?!\*)|>|-)\s*(.+)$/);
    if (marcador && marcador[1] !== '-') {
      adicionarFaixaAta_(corpo, marcador[2], marcador[1] === '>');
      ultimoTopico = null;
      return;
    }
    let paragrafo;
    let conteudo = limpa;
    if (marcador && marcador[1] === '-') {
      conteudo = marcador[2];
      paragrafo = corpo.appendListItem('');
      if (ultimoTopico) paragrafo.setListId(ultimoTopico);
      paragrafo.setGlyphType(DocumentApp.GlyphType.BULLET).setNestingLevel(0)
        .setIndentStart(14).setIndentFirstLine(0).setIndentEnd(0);
      ultimoTopico = paragrafo;
    } else {
      paragrafo = corpo.appendParagraph('');
      paragrafo.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
      ultimoTopico = null;
    }
    paragrafo.setLineSpacing(1.2).setSpacingAfter(6);
    formatarNegritoAta_(paragrafo, conteudo, '#000000', false);
  });
}

function formatarDocumentoAta_(documento, ata) {
  const azul = '#1F3A68';
  const cinza = '#5A6270';
  const reuniao = ata.tipo === 'campeonato' ? 'Campeonato' : 'Associação';
  const corpo = documento.getBody();
  corpo.setPageWidth(595.28).setPageHeight(841.89);
  corpo.setMarginTop(95).setMarginBottom(68).setMarginLeft(57).setMarginRight(57);
  const estiloBase = {};
  estiloBase[DocumentApp.Attribute.FONT_FAMILY] = 'Arial';
  estiloBase[DocumentApp.Attribute.FONT_SIZE] = 11;
  estiloBase[DocumentApp.Attribute.FOREGROUND_COLOR] = '#000000';
  corpo.setAttributes(estiloBase);

  const cabecalho = documento.addHeader();
  const marca = cabecalho.appendParagraph('');
  const logo = marca.appendInlineImage(DriveApp.getFileById(CONFIG.logoFileId).getBlob());
  const escala = Math.min(48 / logo.getWidth(), 48 / logo.getHeight());
  logo.setWidth(Math.round(logo.getWidth() * escala));
  logo.setHeight(Math.round(logo.getHeight() * escala));
  marca.appendText('   ' + ASSOCIACAO_NOME)
    .setFontFamily('Arial').setBold(true).setFontSize(12).setForegroundColor(azul);
  marca.setSpacingAfter(0);
  const subtitulo = cabecalho.appendParagraph('Comissão Organizadora · ' + reuniao);
  subtitulo.editAsText().setFontFamily('Arial').setFontSize(9).setForegroundColor(cinza);
  subtitulo.setSpacingAfter(4);
  cabecalho.appendHorizontalRule();

  const rodape = documento.addFooter();
  const linhaRodape = rodape.appendParagraph(ASSOCIACAO_NOME + ' · Ata de reunião');
  linhaRodape.editAsText().setFontSize(8).setForegroundColor(cinza);

  const titulo = corpo.appendParagraph(ata.titulo)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setSpacingBefore(12).setSpacingAfter(4);
  titulo.editAsText().setFontFamily('Arial').setBold(true)
    .setForegroundColor(azul).setFontSize(18);
  const subtituloAta = corpo.appendParagraph(reuniao.toUpperCase())
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(14);
  subtituloAta.editAsText().setFontFamily('Arial').setBold(true)
    .setForegroundColor(cinza).setFontSize(11);

  const data = ata.data.slice(8, 10) + '/' + ata.data.slice(5, 7) + '/' + ata.data.slice(0, 4);
  const metadados = ['Data: ' + data];
  if (ata.tipo === 'campeonato' && ata.competicao) metadados.push('Competição: ' + ata.competicao);
  if (ata.local) metadados.push('Local: ' + ata.local);
  if (ata.participantes) metadados.push('Participantes: ' + ata.participantes);
  metadados.forEach(function (linha) {
    const paragrafo = corpo.appendParagraph(linha).setSpacingAfter(5);
    paragrafo.editAsText().setFontSize(10).setForegroundColor(cinza);
  });

  corpo.appendHorizontalRule();
  adicionarTextoAta_(corpo, ata.texto);

  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataExtenso = Number(ata.data.slice(8, 10)) + ' de '
    + meses[Number(ata.data.slice(5, 7)) - 1] + ' de ' + ata.data.slice(0, 4);
  corpo.appendParagraph('Uberlândia/MG, ' + dataExtenso + '.')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(26).setSpacingAfter(18);
  const assinatura = corpo.appendParagraph('').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const imagem = assinatura.appendInlineImage(assinaturaAtas_());
  const escalaAssinatura = Math.min(128 / imagem.getWidth(), 54 / imagem.getHeight());
  imagem.setWidth(Math.round(imagem.getWidth() * escalaAssinatura));
  imagem.setHeight(Math.round(imagem.getHeight() * escalaAssinatura));
  const linhaAssinatura = corpo.appendParagraph('________________________________');
  linhaAssinatura.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(2);
  const nomePresidente = corpo.appendParagraph('Iure Costtiti');
  nomePresidente.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(0);
  nomePresidente.editAsText().setBold(true).setFontSize(10).setForegroundColor(azul);
  corpo.appendParagraph('Presidente')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(0);
  corpo.appendParagraph(ASSOCIACAO_NOME)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
}

function exportarAtaPdf(id) {
  exigirAcessoAtas_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const aba = abaAtas_();
    const encontrada = localizarAta_(aba, String(id || ''));
    const ata = encontrada.ata;
    const pasta = pastaAtas_();
    const documento = DocumentApp.create('Ata - ' + ata.titulo);
    const arquivoDocumento = DriveApp.getFileById(documento.getId());
    try {
      formatarDocumentoAta_(documento, ata);
      documento.saveAndClose();
      const nome = ('Ata ' + ata.id + ' - ' + ata.data + ' - ' + ata.titulo)
        .replace(/[\\/:*?"<>|]/g, '-').slice(0, 160) + '.pdf';
      const pdf = pasta.createFile(arquivoDocumento.getAs(MimeType.PDF).setName(nome));
      try {
        aba.getRange(encontrada.numero, 13).setValue(pdf.getUrl());
      } catch (e) {
        pdf.setTrashed(true);
        throw e;
      }
      if (ata.pdfUrl) {
        const antigoId = String(ata.pdfUrl).match(/\/file\/d\/([^/]+)/);
        if (antigoId) {
          try {
            DriveApp.getFileById(antigoId[1]).setTrashed(true);
          } catch (e) {
            Logger.log('[ATAS] PDF anterior não removido (%s): %s', antigoId[1], e);
          }
        }
      }
      return pdf.getUrl();
    } finally {
      arquivoDocumento.setTrashed(true);
    }
  } finally {
    lock.releaseLock();
  }
}

/******************************************************
 * MODULO FINANCEIRO E PRESTACAO DE CONTAS
 ******************************************************/

const FINANCEIRO_COMPETICOES_ORIGEM = [
  'Geral / Administrativo',
  'COPA AMERICA',
  'SUPER LIGA UNIÃO',
  'COPA METROPOLITANA',
  'COPA PREMIER',
  'Outras Competições / Eventos'
];

const FINANCEIRO_CATEGORIAS_ENTRADA = [
  'Repasse Público / Emenda Impositiva',
  'Taxa de Inscrição / Participação',
  'Taxas de Portabilidade / Transferência',
  'Mensalidades / Contribuição de Associados',
  'Patrocínios e Apoios Comerciais',
  'Multas Disciplinares / Recursos',
  'Doações / Eventos Beneficentes',
  'Outras Entradas'
];

const FINANCEIRO_CATEGORIAS_SAIDA = [
  'Arbitragem e Mesários',
  'Premiação e Troféus',
  'Material Esportivo e Bolas',
  'Locação e Manutenção de Campos / Sedes',
  'Atendimento Médico e Primeiros Socorros',
  'Segurança e Apoio Operacional',
  'Marketing, Comunicação e Mídia',
  'Despesas Administrativas, Jurídicas e Cartorárias',
  'Outras Saídas'
];

const FINANCEIRO_COLUNAS = [
  { id: 'idLancamento', titulo: 'ID / Protocolo' },
  { id: 'dataMovimentacao', titulo: 'Data da Movimentação' },
  { id: 'tipo', titulo: 'Tipo (Entrada/Saída)' },
  { id: 'origem', titulo: 'Origem / Competição' },
  { id: 'categoria', titulo: 'Categoria' },
  { id: 'descricao', titulo: 'Descrição detalhada' },
  { id: 'valor', titulo: 'Valor (R$)' },
  { id: 'favorecidoPagador', titulo: 'Favorecido / Pagador' },
  { id: 'documento', titulo: 'Documento Fiscal / Recibo' },
  { id: 'idTransacaoBancaria', titulo: 'ID Transação / Extrato Bancário' },
  { id: 'emenda', titulo: 'Emenda Impositiva / Fomento' },
  { id: 'comprovanteUrl', titulo: 'Comprovante (Drive)' },
  { id: 'criadoEm', titulo: 'Criado em' },
  { id: 'criadoPor', titulo: 'Criado por' }
];

function normalizarDataFinanceiro_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, 'America/Sao_Paulo', 'dd/MM/yyyy');
  }
  const str = String(valor).trim();
  // Se for ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const partes = str.substring(0, 10).split('-');
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }
  // Se for string de data do Sheets (ex: Thu Oct 01 2026 ...)
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp) && (str.indexOf('GMT') !== -1 || str.indexOf('T') !== -1)) {
    try {
      return Utilities.formatDate(new Date(timestamp), 'America/Sao_Paulo', 'dd/MM/yyyy');
    } catch (e) {}
  }
  return str;
}

function chaveDataOrdenacaoFinanceiro_(valor) {
  const texto = normalizarDataFinanceiro_(valor);
  const br = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:$|[ T])/);
  const iso = texto.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:$|[ T])/);
  if (!br && !iso) return 0;
  const ano = Number(br ? br[3] : iso[1]);
  const mes = Number(br ? br[2] : iso[2]);
  const dia = Number(br ? br[1] : iso[3]);
  const data = new Date(0);
  data.setUTCFullYear(ano, mes - 1, dia);
  if (ano < 1 || data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1
      || data.getUTCDate() !== dia) return 0;
  return ano * 10000 + mes * 100 + dia;
}

function compararLancamentosFinanceiro_(a, b) {
  const diferenca = chaveDataOrdenacaoFinanceiro_(b.dataMovimentacao)
    - chaveDataOrdenacaoFinanceiro_(a.dataMovimentacao);
  if (diferenca) return diferenca;
  // Mesmo dia: protocolo mais recente primeiro, independentemente da linha da planilha.
  const idA = String(a.idLancamento || '');
  const idB = String(b.idLancamento || '');
  return idA < idB ? 1 : idA > idB ? -1 : 0;
}

/**
 * Retorna dados para abrir o modulo financeiro:
 * lista de lancamentos, totais calculados, categorias e lista de competicoes.
 */
function listarFinanceiro() {
  const sessao = identificarUsuario_();
  if (!sessao.autorizado || !moduloLiberado_('financeiro', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para acessar o módulo financeiro.');
  }

  const aba = abaFinanceiro_();
  const valores = aba.getDataRange().getValues();

  let totalEntradas = 0;
  let totalSaidas = 0;

  const lancamentos = valores.slice(1).map(function (linha) {
    const valNum = parseFloat(String(linha[6] || 0).replace(',', '.')) || 0;
    const ehEntrada = String(linha[2] || '').trim().toLowerCase() === 'entrada';

    if (ehEntrada) {
      totalEntradas += valNum;
    } else {
      totalSaidas += valNum;
    }

    return {
      idLancamento: String(linha[0] || ''),
      dataMovimentacao: normalizarDataFinanceiro_(linha[1]),
      tipo: String(linha[2] || ''),
      origem: String(linha[3] || ''),
      categoria: String(linha[4] || ''),
      descricao: String(linha[5] || ''),
      valor: valNum,
      favorecidoPagador: String(linha[7] || ''),
      documento: String(linha[8] || ''),
      idTransacaoBancaria: String(linha[9] || ''),
      emenda: String(linha[10] || ''),
      comprovanteUrl: String(linha[11] || ''),
      criadoEm: String(linha[12] || ''),
      criadoPor: String(linha[13] || '')
    };
  }).sort(compararLancamentosFinanceiro_); // Data da movimentação mais recente primeiro.

  return {
    lancamentos: lancamentos,
    totalEntradas: totalEntradas,
    totalSaidas: totalSaidas,
    saldoAtual: totalEntradas - totalSaidas,
    categoriasEntrada: FINANCEIRO_CATEGORIAS_ENTRADA,
    categoriasSaida: FINANCEIRO_CATEGORIAS_SAIDA,
    competicoes: FINANCEIRO_COMPETICOES_ORIGEM,
    podeEditar: sessao.usuario.perfil === 'admin' || sessao.usuario.perfil === 'diretoria',
    planilhaUrl: planilhaFinanceiro_().getUrl()
  };
}

/**
 * Salva um novo lancamento financeiro na planilha e anexa o comprovante no Drive.
 */
function salvarLancamentoFinanceiro(payload) {
  const sessao = identificarUsuario_();
  if (!sessao.autorizado || !moduloLiberado_('financeiro', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para gravar lançamentos financeiros.');
  }

  if (!payload.dataMovimentacao || !payload.tipo || !payload.categoria || !payload.valor || !payload.descricao) {
    throw new Error('Preencha os campos obrigatórios (Data, Tipo, Categoria, Descrição e Valor).');
  }

  const valorFloat = Math.abs(parseFloat(String(payload.valor).replace(',', '.')));
  if (isNaN(valorFloat) || valorFloat <= 0) {
    throw new Error('Informe um valor numérico válido maior que zero.');
  }

  const idEdicao = String(payload.idLancamento || '').trim();
  if (idEdicao && sessao.usuario.perfil !== 'admin' && sessao.usuario.perfil !== 'diretoria') {
    throw new Error('Você não tem permissão para editar lançamentos financeiros.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    let comprovanteUrl = '';
    if (payload.comprovante && payload.comprovante.base64) {
      comprovanteUrl = salvarComprovanteFinanceiro_(payload.comprovante, payload.dataMovimentacao, payload.descricao);
    }

    if (idEdicao) {
      return atualizarLancamentoFinanceiro_(idEdicao, payload, valorFloat, comprovanteUrl, sessao);
    }

    const agora = new Date();
    const idLancamento = 'FIN-' + Utilities.formatDate(agora, 'America/Sao_Paulo', 'yyyyMMdd-HHmmss');

    const dataFormatada = normalizarDataFinanceiro_(payload.dataMovimentacao) || payload.dataMovimentacao;

    const linha = [
      idLancamento,
      dataFormatada,
      payload.tipo,
      payload.origem || 'Geral / Administrativo',
      payload.categoria,
      payload.descricao,
      valorFloat,
      payload.favorecidoPagador || '',
      payload.documento || '',
      payload.idTransacaoBancaria || '',
      payload.emenda || '',
      comprovanteUrl,
      formatarDataHora_(agora),
      sessao.email
    ];

    // Grava a data como Date real: texto "01/10/2026" pode ser lido pelo
    // Sheets no locale americano (10 de janeiro) e sumir dos filtros.
    const mData = String(dataFormatada).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (mData) {
      linha[1] = new Date(Number(mData[3]), Number(mData[2]) - 1, Number(mData[1]), 12, 0, 0);
    }

    const aba = abaFinanceiro_();
    aba.appendRow(linha);
    aba.getRange(aba.getLastRow(), 2).setNumberFormat('dd/MM/yyyy');

    return {
      sucesso: true,
      idLancamento: idLancamento,
      mensagem: 'Lançamento financeiro registrado com sucesso!'
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Converte "dd/MM/yyyy" em Date (meio-dia, evita deslocamento de fuso).
 * Retorna o valor original quando nao reconhece o formato.
 */
function dataFinanceiroParaCelula_(valor) {
  const texto = normalizarDataFinanceiro_(valor) || String(valor || '');
  const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0) : texto;
}

/**
 * Atualiza um lancamento existente mantendo ID, criadoEm e criadoPor.
 * O comprovante so e trocado quando um novo arquivo e enviado, ou
 * removido quando payload.removerComprovante for verdadeiro.
 */
function atualizarLancamentoFinanceiro_(idLancamento, payload, valorFloat, novoComprovanteUrl, sessao) {
  const aba = abaFinanceiro_();
  const dados = aba.getDataRange().getValues();
  let linhaPlanilha = -1;

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0] || '').trim() === idLancamento) {
      linhaPlanilha = i + 1;
      break;
    }
  }

  if (linhaPlanilha === -1) {
    throw new Error('Lançamento não encontrado na planilha: ' + idLancamento);
  }

  const atual = dados[linhaPlanilha - 1];
  let comprovanteUrl = String(atual[11] || '');
  if (novoComprovanteUrl) {
    comprovanteUrl = novoComprovanteUrl;
  } else if (payload.removerComprovante) {
    comprovanteUrl = '';
  }

  const valores = [
    dataFinanceiroParaCelula_(payload.dataMovimentacao),
    payload.tipo,
    payload.origem || 'Geral / Administrativo',
    payload.categoria,
    payload.descricao,
    valorFloat,
    payload.favorecidoPagador || '',
    payload.documento || '',
    payload.idTransacaoBancaria || '',
    payload.emenda || '',
    comprovanteUrl
  ];

  aba.getRange(linhaPlanilha, 2, 1, valores.length).setValues([valores]);
  aba.getRange(linhaPlanilha, 2).setNumberFormat('dd/MM/yyyy');

  return {
    sucesso: true,
    idLancamento: idLancamento,
    mensagem: 'Lançamento atualizado com sucesso por ' + sessao.email + '.'
  };
}

/**
 * Remove um lancamento financeiro da planilha pelo seu ID de protocolo.
 * Disponivel apenas para usuarios com perfil admin ou diretoria.
 */
function removerLancamentoFinanceiro(idLancamento) {
  const sessao = identificarUsuario_();
  if (!sessao.autorizado || (sessao.usuario.perfil !== 'admin' && sessao.usuario.perfil !== 'diretoria')) {
    throw new Error('Você não tem permissão para excluir lançamentos financeiros.');
  }

  const idAlvo = String(idLancamento || '').trim();
  if (!idAlvo) {
    throw new Error('ID do lançamento não informado.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const aba = abaFinanceiro_();
    const dados = aba.getDataRange().getValues();
    let linhaParaExcluir = -1;

    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][0] || '').trim() === idAlvo) {
        linhaParaExcluir = i + 1; // 1-based index na planilha
        break;
      }
    }

    if (linhaParaExcluir === -1) {
      throw new Error('Lançamento não encontrado na planilha: ' + idAlvo);
    }

    aba.deleteRow(linhaParaExcluir);

    return {
      sucesso: true,
      idLancamento: idAlvo,
      mensagem: 'Lançamento ' + idAlvo + ' excluído com sucesso!'
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Grava o arquivo de comprovante (PDF ou imagem) na pasta Comprovantes - Financeiro do Drive.
 */
function salvarComprovanteFinanceiro_(arquivo, dataMov, descricao) {
  const pasta = pastaComprovantesFinanceiro_();
  const bytes = Utilities.base64Decode(arquivo.base64);

  if (bytes.length > CONFIG.financeiro.maxArquivoBytes) {
    throw new Error('O comprovante excede o tamanho máximo permitido de 8 MB.');
  }

  const dataLimpa = String(dataMov || '').replace(/[^\d]/g, '');
  const descLimpa = String(descricao || 'comprovante').replace(/[\\/:*?"<>|]+/g, '-').substring(0, 30);
  const ext = arquivo.nome && arquivo.nome.indexOf('.') !== -1 ? arquivo.nome.split('.').pop() : 'pdf';
  const nomeArquivo = 'COMP-' + dataLimpa + '-' + descLimpa + '.' + ext;

  const blob = Utilities.newBlob(bytes, arquivo.tipo || 'application/pdf', nomeArquivo);
  const file = pasta.createFile(blob);
  file.setDescription('Comprovante financeiro da movimentação de ' + dataMov + ' - ' + descricao);

  return file.getUrl();
}

/**
 * Prepara o cadastro: cria (ou reaproveita) a planilha e a pasta de
 * documentos dentro da pasta raiz do projeto e guarda os ids.
 *
 * Execute UMA VEZ pelo editor, com a conta dona da pasta raiz.
 */
function prepararAssociados() {
  const planilha = planilhaAssociados_();
  const pasta = pastaAssociados_();

  Logger.log('PLANILHA ..........: %s', planilha.getUrl());
  Logger.log('PASTA DE DOCUMENTOS: %s', pasta.getUrl());
  Logger.log('Cadastro de associados pronto.');
}

/**
 * Publica as consultas individuais existentes sem compartilhar a planilha
 * geral. Execute como administrador apos prepararAssociados() ou apos editar
 * a planilha manualmente; novos cadastros pela tela sao publicados ao salvar.
 */
function publicarCadastrosAssociados() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || sessao.usuario.perfil !== 'admin') {
    throw new Error('Apenas administradores podem publicar os cadastros de associados.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const propriedades = PropertiesService.getScriptProperties();
    const prefixo = CONFIG.associados.prefixoConsulta;
    const antigos = Object.keys(propriedades.getProperties()).filter(function (chave) {
      return chave.indexOf(prefixo) === 0;
    });
    const linhas = abaAssociados_().getDataRange().getValues().slice(1);
    const atuais = {};

    linhas.forEach(function (linha) {
      const registro = linhaParaAssociado_(linha);

      if (registro.equipe) {
        const chave = chaveConsultaAssociado_(registro.equipe);
        propriedades.setProperty(chave, JSON.stringify(registro));
        atuais[chave] = true;
      }
    });

    antigos.forEach(function (chave) {
      if (!atuais[chave]) {
        propriedades.deleteProperty(chave);
      }
    });

    Logger.log('Cadastros individuais publicados: %s', Object.keys(atuais).length);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Chave deterministica para o cadastro de uma equipe nas propriedades.
 * @param {string} equipe
 * @return {string}
 */
function chaveConsultaAssociado_(equipe) {
  return CONFIG.associados.prefixoConsulta + chaveEquipe_(equipe);
}

/**
 * Devolve os dados necessarios para montar a tela de associados.
 * Chamada pelo cliente; refaz a verificacao de permissao no servidor.
 * @return {{registros: Array<Object>, equipes: Array<string>, status: Array<Object>,
 *           documentos: Array<Object>, podeEditar: boolean, planilhaUrl: string}}
 */
function listarAssociados() {
  const sessao = sessaoAssociados_();
  const daEquipe = perfilDaEquipe_(sessao.usuario.perfil);
  let registros;

  if (daEquipe) {
    if (!sessao.usuario.equipe) {
      throw new Error('Sua conta não tem equipe vinculada. Solicite a correção ao administrador.');
    }

    // O associado nao le a planilha geral nem recebe dados de outras
    // equipes: so consulta a copia publicada para a propria equipe.
    const bruto = PropertiesService.getScriptProperties()
      .getProperty(chaveConsultaAssociado_(sessao.usuario.equipe));

    if (!bruto) {
      throw new Error('O cadastro da sua equipe ainda não foi publicado. '
        + 'Peça à administração para cadastrar a equipe ou executar publicarCadastrosAssociados().');
    }

    registros = [JSON.parse(bruto)];
  } else {
    registros = abaAssociados_().getDataRange().getValues().slice(1).map(function (linha) {
      return linhaParaAssociado_(linha);
    }).filter(function (registro) {
      return Boolean(registro.equipe);
    }).sort(function (a, b) {
      return a.equipe.localeCompare(b.equipe, 'pt-BR');
    });
  }

  return {
    registros: registros,
    equipes: daEquipe ? [sessao.usuario.equipe].filter(String) : obterEquipes_(),
    status: ASSOCIADOS_STATUS,
    documentos: ASSOCIADOS_DOCUMENTOS,
    podeEditar: podeEditarAssociados_(sessao.usuario.perfil),
    somenteMinhaEquipe: daEquipe,
    minhaEquipe: daEquipe ? sessao.usuario.equipe : '',
    planilhaUrl: !daEquipe && podeEditarAssociados_(sessao.usuario.perfil)
      ? planilhaAssociados_().getUrl() : ''
  };
}

/**
 * Grava um associado, identificado na edicao pela equipe original.
 * Equipe e CPF do representante devem ser exclusivos entre cadastros.
 *
 * @param {Object} payload Campos da tela, com os anexos em base64.
 * @return {{sucesso: boolean, equipe: string, novo: boolean}}
 */
function salvarAssociado(payload) {
  const sessao = sessaoAssociados_();

  if (!podeEditarAssociados_(sessao.usuario.perfil)) {
    throw new Error('O seu perfil pode consultar os associados, mas não alterar o cadastro.');
  }

  const dados = validarAssociado_(payload);
  const lock = LockService.getScriptLock();

  // Sem a trava, dois cadastros simultaneos da mesma equipe criariam
  // duas linhas em vez de uma.
  lock.waitLock(30000);

  try {
    const aba = abaAssociados_();
    const valores = aba.getDataRange().getValues();
    const chave = chaveEquipe_(dados.equipe);
    const equipeOriginal = limparCampo_(payload.equipeOriginal || '', 120);
    const chaveOriginal = chaveEquipe_(equipeOriginal);

    let linhaExistente = 0;
    let anterior = null;

    for (let i = 1; i < valores.length; i++) {
      if (chaveOriginal && chaveEquipe_(valores[i][0]) === chaveOriginal) {
        linhaExistente = i + 1;
        anterior = linhaParaAssociado_(valores[i]);
        break;
      }
    }

    if (chaveOriginal && !anterior) {
      throw new Error('O cadastro original não foi encontrado. Atualize a lista antes de salvar.');
    }
    for (let i = 1; i < valores.length; i++) {
      if (i + 1 === linhaExistente) continue;
      const outro = linhaParaAssociado_(valores[i]);
      if (!outro.equipe) continue;
      if (chaveEquipe_(outro.equipe) === chave) {
        throw new Error('Esta equipe já possui um associado cadastrado. Escolha outra equipe.');
      }
      if (somenteDigitos_(outro.cpf) === dados.cpf) {
        throw new Error('Este representante legal já está cadastrado para a equipe ' + outro.equipe + '.');
      }
    }

    const agora = new Date();
    const registro = Object.assign({}, anterior || {}, dados);

    ASSOCIADOS_DOCUMENTOS.forEach(function (documento) {
      const enviado = payload.arquivos && payload.arquivos[documento.id];

      if (enviado && enviado.base64) {
        registro[documento.id] = salvarDocumento_(enviado, dados.equipe, documento);
      } else if (!anterior) {
        registro[documento.id] = '';
      }
    });

    registro.criadoEm = (anterior && anterior.criadoEm) || formatarDataHora_(agora);
    registro.atualizadoEm = formatarDataHora_(agora);
    registro.atualizadoPor = sessao.email;

    const linha = ASSOCIADOS_COLUNAS.map(function (coluna) {
      return registro[coluna.id] || '';
    });

    if (linhaExistente) {
      aba.getRange(linhaExistente, 1, 1, linha.length).setValues([linha]);
    } else {
      aba.appendRow(linha);
    }

    PropertiesService.getScriptProperties()
      .setProperty(chaveConsultaAssociado_(dados.equipe), JSON.stringify(linhaParaAssociado_(linha)));
    if (anterior && chaveOriginal !== chave) {
      PropertiesService.getScriptProperties().deleteProperty(chaveConsultaAssociado_(anterior.equipe));
    }

    return { sucesso: true, equipe: dados.equipe, novo: !linhaExistente };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Confere a sessao e o acesso ao modulo de associados.
 * @return {Object} Sessao do usuario.
 */
function sessaoAssociados_() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || !moduloLiberado_('associados', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para acessar o cadastro de associados.');
  }

  return sessao;
}

/**
 * Diz se o perfil pode cadastrar e editar.
 * @param {string} perfil
 * @return {boolean}
 */
function podeEditarAssociados_(perfil) {
  return ASSOCIADOS_PERFIS_EDICAO.indexOf(perfil) !== -1;
}

/**
 * Transforma uma linha da planilha em objeto.
 * @param {Array} linha
 * @return {Object}
 */
function linhaParaAssociado_(linha) {
  const registro = {};

  ASSOCIADOS_COLUNAS.forEach(function (coluna, i) {
    registro[coluna.id] = linha[i] === null || linha[i] === undefined ? '' : String(linha[i]).trim();
  });

  registro.pendencias = ASSOCIADOS_DOCUMENTOS.filter(function (documento) {
    return !registro[documento.id];
  }).length;

  return registro;
}

/**
 * Normaliza o nome da equipe para comparacao, ignorando acentos,
 * espacos repetidos e maiusculas.
 * @param {string} equipe
 * @return {string}
 */
function chaveEquipe_(equipe) {
  return String(equipe || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(new RegExp('\\s+', 'g'), ' ')
    .trim()
    .toUpperCase();
}

/**
 * Valida e limpa os campos do formulario.
 * @param {Object} payload
 * @return {Object} Campos prontos para gravar.
 */
function validarAssociado_(payload) {
  const dados = payload || {};
  const equipe = limparCampo_(dados.equipe, 120);

  if (!equipe) {
    throw new Error('Escolha a equipe associada.');
  }

  const status = ASSOCIADOS_STATUS.filter(function (item) {
    return item.id === dados.status;
  })[0];

  if (!status) {
    throw new Error('Escolha a situação do associado.');
  }

  const nome = limparCampo_(dados.nome, 150);

  if (nome.split(' ').filter(Boolean).length < 2) {
    throw new Error('Informe o nome completo do representante legal.');
  }

  const email = limparCampo_(dados.email, 150).toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Informe um e-mail válido para o representante legal.');
  }

  const telefone = somenteDigitos_(dados.telefone);

  if (telefone.length < 10 || telefone.length > 11) {
    throw new Error('Informe o telefone com DDD, com 10 ou 11 dígitos.');
  }

  const cpf = somenteDigitos_(dados.cpf);

  if (!cpfValido_(cpf)) {
    throw new Error('O CPF informado não é válido. Confira os números digitados.');
  }

  const rg = limparCampo_(dados.rg, 30);

  if (!rg) {
    throw new Error('Informe o RG do representante legal.');
  }

  const cep = somenteDigitos_(dados.cep);

  if (cep.length !== 8) {
    throw new Error('Informe o CEP com 8 dígitos.');
  }

  // Confere antes de cortar: "MGX" cortado viraria "MG" e gravaria uma UF
  // que a pessoa nao escolheu.
  const uf = limparCampo_(dados.uf, 10).toUpperCase();

  if (!/^[A-Z]{2}$/.test(uf)) {
    throw new Error('Informe a UF com duas letras (ex.: MG).');
  }

  return {
    equipe: equipe,
    status: status.id,
    nome: nome,
    nascimento: validarNascimento_(dados.nascimento),
    email: email,
    telefone: telefone,
    cep: cep,
    logradouro: exigirCampo_(dados.logradouro, 150, 'Informe o logradouro (rua, avenida).'),
    numero: exigirCampo_(dados.numero, 20, 'Informe o número do endereço.'),
    complemento: limparCampo_(dados.complemento, 60),
    bairro: exigirCampo_(dados.bairro, 80, 'Informe o bairro.'),
    cidade: exigirCampo_(dados.cidade, 80, 'Informe a cidade.'),
    uf: uf,
    rg: rg,
    cpf: cpf
  };
}

/**
 * Confere a data de nascimento e devolve no formato dd/mm/aaaa.
 * @param {string} valor Data no formato aaaa-mm-dd vinda do formulario.
 * @return {string}
 */
function validarNascimento_(valor) {
  const texto = limparCampo_(valor, 10);
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!partes) {
    throw new Error('Informe a data de nascimento do representante legal.');
  }

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(ano, mes - 1, dia);

  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    throw new Error('A data de nascimento informada não existe no calendário.');
  }

  const hoje = new Date();
  const idade = (hoje - data) / (365.25 * 24 * 60 * 60 * 1000);

  if (idade < 18) {
    throw new Error('O representante legal precisa ser maior de 18 anos.');
  }

  if (idade > 110) {
    throw new Error('Confira a data de nascimento: o ano informado está muito distante.');
  }

  return partes[3] + '/' + partes[2] + '/' + partes[1];
}

/**
 * Confere os digitos verificadores do CPF.
 * @param {string} cpf Somente digitos.
 * @return {boolean}
 */
function cpfValido_(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  for (let posicao = 9; posicao <= 10; posicao++) {
    let soma = 0;

    for (let i = 0; i < posicao; i++) {
      soma += Number(cpf.charAt(i)) * (posicao + 1 - i);
    }

    const resto = (soma * 10) % 11;
    const digito = resto === 10 ? 0 : resto;

    if (digito !== Number(cpf.charAt(posicao))) {
      return false;
    }
  }

  return true;
}

/**
 * Guarda um anexo na pasta da equipe e devolve a URL.
 * @param {Object} arquivo Objeto com nome, tipo, tamanho e base64.
 * @param {string} equipe
 * @param {Object} documento Item de ASSOCIADOS_DOCUMENTOS.
 * @return {string} URL do arquivo no Drive.
 */
function salvarDocumento_(arquivo, equipe, documento) {
  const tipo = String(arquivo.tipo || '').toLowerCase();

  if (ASSOCIADOS_TIPOS_ARQUIVO.indexOf(tipo) === -1) {
    throw new Error('O arquivo "' + documento.nome + '" deve ser PDF, JPG, PNG ou WEBP.');
  }

  const bytes = Utilities.base64Decode(arquivo.base64);

  if (bytes.length > CONFIG.associados.maxArquivoBytes) {
    throw new Error('O arquivo "' + documento.nome + '" passa de 5 MB. Reduza o tamanho e tente de novo.');
  }

  const dataLimpa = String(arquivo.data || '').replace(/[^\d]/g, '');
  const descLimpa = String(documento.nome || 'comprovante').replace(/[\\/:*?"<>|]+/g, '-').substring(0, 30);
  const ext = arquivo.nome && arquivo.nome.indexOf('.') !== -1 ? arquivo.nome.split('.').pop() : 'pdf';
  const nomeArquivo = 'DOC-' + dataLimpa + '-' + descLimpa + '.' + ext;

  const blob = Utilities.newBlob(bytes, arquivo.tipo || 'application/pdf', nomeArquivo);
  const pasta = pastaAssociados_();
  const file = pasta.createFile(blob);
  file.setDescription('Documento do associado: ' + equipe + ' - ' + documento.nome);

  return file.getUrl();
}

/**
 * Localiza ou cria a pasta Comprovantes - Financeiro no Drive.
 */
function pastaComprovantesFinanceiro_() {
  const propriedades = PropertiesService.getScriptProperties();
  const guardado = propriedades.getProperty(CONFIG.financeiro.chavePasta);

  if (guardado) {
    try {
      const pasta = DriveApp.getFolderById(guardado);
      if (!pasta.isTrashed()) {
        return pasta;
      }
    } catch (e) {}
  }

  const raiz = pastaRaizProjeto_();
  const existentes = raiz.getFoldersByName(CONFIG.financeiro.pastaComprovantes);
  const pasta = existentes.hasNext()
    ? existentes.next()
    : raiz.createFolder(CONFIG.financeiro.pastaComprovantes);

  propriedades.setProperty(CONFIG.financeiro.chavePasta, pasta.getId());
  return pasta;
}

/**
 * Localiza ou cria a planilha AEUV - Financeiro na pasta raiz do projeto.
 */
function planilhaFinanceiro_() {
  const propriedades = PropertiesService.getScriptProperties();
  const guardado = propriedades.getProperty(CONFIG.financeiro.chavePlanilha);

  if (guardado) {
    try {
      return SpreadsheetApp.openById(guardado);
    } catch (e) {}
  }

  const raiz = pastaRaizProjeto_();
  const existentes = raiz.getFilesByName(CONFIG.financeiro.planilha);
  let planilha;

  if (existentes.hasNext()) {
    planilha = SpreadsheetApp.openById(existentes.next().getId());
  } else {
    planilha = SpreadsheetApp.create(CONFIG.financeiro.planilha);
    DriveApp.getFileById(planilha.getId()).moveTo(raiz);
  }

  propriedades.setProperty(CONFIG.financeiro.chavePlanilha, planilha.getId());
  return planilha;
}

/**
 * Retorna a aba Movimentacoes com cabecalho garantido.
 */
function abaFinanceiro_() {
  const planilha = planilhaFinanceiro_();
  const aba = planilha.getSheetByName(CONFIG.financeiro.aba) || planilha.insertSheet(CONFIG.financeiro.aba);

  const titulos = FINANCEIRO_COLUNAS.map(function (c) { return c.titulo; });
  const primeira = aba.getRange(1, 1, 1, titulos.length).getValues()[0];
  const precisaCabecalho = titulos.some(function (titulo, i) {
    return String(primeira[i] || '') !== titulo;
  });

  if (precisaCabecalho) {
    aba.getRange(1, 1, 1, titulos.length).setValues([titulos]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }

  return aba;
}

/******************************************************
 * GESTÃO DA COMISSÃO TÉCNICA DO CAMPEONATO
 ******************************************************/

  function chaveComissaoTecnicaCampeonato_(campeonatoId) {
    return 'aeuv.comissaoTecnica.campeonato.' + String(campeonatoId || '').trim();
  }

  function comissaoTecnicaCampeonato_(campeonatoId, persistirIds, recursos) {
    const lista = lerElencoBrutoOperacao_(campeonatoId, 'comissao', recursos);
    garantirIdsHistoricoElenco_(campeonatoId, 'comissao', lista, persistirIds, recursos);

      return lista.filter(function (item) {
        return item && typeof item === 'object' && String(item.nome || '').trim();
      }).map(function (item) {
        return Object.assign({
          id: String(item.id || '').trim() || gerarIdUnico_(),
          nome: limparCampo_(item.nome || '', 100),
          cargo: String(item.cargo || '').trim() || 'Comissão Técnica',
          telefone: String(item.telefone || '').trim(),
          email: String(item.email || '').trim(),
          cpf: somenteDigitos_(item.cpf || ''),
          rg: limparCampo_(item.rg || '', 30),
          foto: String(item.foto || '').trim(),
          dataNascimento: String(item.dataNascimento || '').trim(),
          timeVinculado: String(item.timeVinculado || '').trim()
        }, elencosParticionadosCutoverAtivo_() ? { ativo: item.ativo !== false } : {});
      });
  }

  function gravarComissaoTecnicaCampeonato_(campeonatoId, lista, recursos, historicoPreparado, listasPreparadas) {
    const validos = (lista || []).filter(function (item) {
      return item && typeof item === 'object' && String(item.nome || '').trim();
    }).map(function (item) {
      return Object.assign({
        id: String(item.id || '').trim() || gerarIdUnico_(),
        nome: limparCampo_(item.nome || '', 100),
        cargo: String(item.cargo || '').trim() || 'Comissão Técnica',
        telefone: String(item.telefone || '').trim(),
        email: String(item.email || '').trim(),
        cpf: somenteDigitos_(item.cpf || ''),
        rg: limparCampo_(item.rg || '', 30),
        foto: String(item.foto || '').trim(),
        dataNascimento: String(item.dataNascimento || '').trim(),
        timeVinculado: String(item.timeVinculado || '').trim()
      }, elencosParticionadosCutoverAtivo_() ? { ativo: item.ativo !== false } : {});
    });

    gravarElencoComHistorico_(campeonatoId, 'comissao', validos, historicoPreparado, listasPreparadas, recursos);
  }

  function listarComissaoTecnica() {
    sessaoCampeonato_();

    const campeonatos = campeonatosResumo_();

    return {
      campeonatos: campeonatos,
      cargos: COMISSAO_CARGOS.slice(),
      times: (function () {
        const times = {};

        campeonatos.forEach(function (campeonato) {
          times[campeonato.id] = timesCampeonato_(campeonato.id) || [];
        });

        return times;
      })(),
      registros: campeonatos.map(function (campeonato) {
        const comissao = comissaoTecnicaCampeonato_(campeonato.id);
        const times = timesCampeonato_(campeonato.id) || [];

        return {
          campeonatoId: campeonato.id,
          campeonatoNome: campeonato.nome,
          temporada: campeonato.temporada,
          status: campeonato.status,
          total: comissao.length,
          membros: comissao,
          times: times
        };
      })
    };
  }

  function salvarMembroComissao(payload) {
    sessaoCampeonato_();
    return salvarMembroComissaoInterno_(payload);
  }

  function salvarMembroComissaoInterno_(payload, contexto, solicitacaoElenco) {
    let inicioValidacao = Date.now();
    const dados = payload || {};
    const campeonatoId = String(dados.campeonatoId || '').trim();

    if (!campeonatoId) {
      throw new Error('Informe o campeonato válido.');
    }

    const nome = limparCampo_(dados.nome || '', 100);
    const cargo = validarCargoComissao_(dados.cargo);
    const rg = limparCampo_(dados.rg || '', 30);
    const telefone = String(dados.telefone || '').trim();
    const email = String(dados.email || '').trim();
    const cpf = validarCpfCadastroCampeonato_(dados.cpf, 'da comissão técnica');
    const foto = String(dados.foto || '').trim();
    const dataNascimento = validarDataNascimentoCampeonato_(dados.dataNascimento, 'da comissão técnica');
    let timeVinculado = solicitacaoElenco ? '' : validarTimeVinculadoCampeonato_(campeonatoId, dados.timeVinculado, 'da comissão técnica');

    if (!nome) {
      throw new Error('Informe o nome do membro.');
    }
    if (!foto) {
      throw new Error('Envie a foto do membro da comissão técnica.');
    }

    const lock = LockService.getScriptLock();
    registrarTempoCadastro_('validacao_leitura', inicioValidacao);
    medirFaseCadastro_('espera_lock', function () { lock.waitLock(30000); });
    let tela;
    const recursos = {};

    try {
      inicioValidacao = Date.now();
      const contextoAtual = validarAlvoElenco_(contexto, 'comissao', '', recursos, solicitacaoElenco);
      if (solicitacaoElenco) timeVinculado = validarTimeVinculadoCampeonato_(
        campeonatoId, contextoAtual.equipe.nome, 'da comissão técnica', recursos);
      const lista = medirRecursoCadastro_(recursos, 'lock_elenco_leitura', function () {
        return comissaoTecnicaCampeonato_(campeonatoId, false, recursos);
      });
      const validacaoDuplicata = validarDuplicataCadastroOperacao_(
        campeonatoId, 'comissao', nome, cpf, lista, '', recursos);

      if (!validacaoDuplicata.ok) {
        throw new Error(validacaoDuplicata.motivo);
      }

      validarCpfUnicoEntreCadastros_(campeonatoId, cpf, 'comissao', '', recursos);

      lista.push({
        id: gerarIdUnico_(),
        nome: nome,
        cargo: cargo,
        rg: rg,
        telefone: telefone,
        email: email,
        cpf: cpf,
        foto: foto,
        dataNascimento: dataNascimento,
        timeVinculado: timeVinculado
      });

      registrarTempoCadastro_('validacao_leitura', inicioValidacao);
      gravarComissaoTecnicaCampeonato_(campeonatoId, lista, recursos);
      if (contextoAtual) tela = medirFaseCadastro_('resposta', function () {
        return montarRespostaElenco_(contextoAtual, recursos.listas[campeonatoId], recursos);
      });
    } finally {
      delete recursos.arquivosDrive;
      lock.releaseLock();
    }

    if (!tela) tela = medirFaseCadastro_('resposta', function () { return respostaCadastro_(contexto); });
    tela.recado = 'Membro ' + nome + ' adicionado à comissão técnica. O histórico será consolidado em segundo plano.';
    return tela;
  }

  function atualizarMembroComissao(payload) {
    sessaoCampeonato_();
    return atualizarMembroComissaoInterno_(payload);
  }

  function atualizarMembroComissaoInterno_(payload, contexto, solicitacaoElenco) {
    let inicioValidacao = Date.now();
    const dados = payload || {};
    const campeonatoId = String(dados.campeonatoId || '').trim();
    const membroId = String(dados.membroId || '').trim();

    if (!campeonatoId || !membroId) {
      throw new Error('Informe campeonato e membro válidos.');
    }

    const nome = limparCampo_(dados.nome || '', 100);
    const cpf = validarCpfCadastroCampeonato_(dados.cpf, 'da comissão técnica');
    const foto = String(dados.foto || '').trim();
    const dataNascimento = validarDataNascimentoCampeonato_(dados.dataNascimento, 'da comissão técnica');
    let timeVinculado = solicitacaoElenco ? '' : validarTimeVinculadoCampeonato_(campeonatoId, dados.timeVinculado, 'da comissão técnica');

    if (!nome) {
      throw new Error('Informe o nome do membro.');
    }

    const lock = LockService.getScriptLock();
    registrarTempoCadastro_('validacao_leitura', inicioValidacao);
    medirFaseCadastro_('espera_lock', function () { lock.waitLock(30000); });
    let tela;
    const recursos = {};

    try {
      inicioValidacao = Date.now();
      const contextoAtual = validarAlvoElenco_(contexto, 'comissao', membroId, recursos, solicitacaoElenco);
      if (solicitacaoElenco) timeVinculado = validarTimeVinculadoCampeonato_(
        campeonatoId, contextoAtual.equipe.nome, 'da comissão técnica', recursos);
      const existentes = recursos.listaValidacao || medirRecursoCadastro_(recursos, 'lock_elenco_leitura', function () {
        return comissaoTecnicaCampeonato_(campeonatoId, false, recursos);
      });
      const membroExistente = existentes.find(function (item) { return item.id === membroId; });

      if (!membroExistente) {
        throw new Error('Membro não encontrado neste campeonato.');
      }
      const cargo = validarCargoComissao_(dados.cargo, membroExistente);
      const rg = Object.prototype.hasOwnProperty.call(dados, 'rg')
        ? limparCampo_(dados.rg || '', 30) : membroExistente.rg;
      const telefone = Object.prototype.hasOwnProperty.call(dados, 'telefone')
        ? String(dados.telefone || '').trim() : membroExistente.telefone;
      const email = Object.prototype.hasOwnProperty.call(dados, 'email')
        ? String(dados.email || '').trim() : membroExistente.email;
      if (!foto && !membroExistente.foto) {
        throw new Error('Envie a foto do membro da comissão técnica.');
      }
      const duplicata = validarDuplicataCadastroOperacao_(
        campeonatoId, 'comissao', nome, cpf, existentes, membroId, recursos);
      if (!duplicata.ok) throw new Error(duplicata.motivo);
      validarCpfUnicoEntreCadastros_(campeonatoId, cpf, 'comissao', '', recursos);

      const lista = existentes.map(function (item) {
        if (item.id === membroId) {
          return Object.assign({
            id: membroId,
            nome: nome,
            cargo: cargo,
            rg: rg,
            telefone: telefone,
            email: email,
            cpf: cpf,
            foto: foto || item.foto,
            dataNascimento: dataNascimento,
            timeVinculado: timeVinculado
          }, elencosParticionadosCutoverAtivo_() ? { ativo: item.ativo !== false } : {});
        }

        return item;
      });

      registrarTempoCadastro_('validacao_leitura', inicioValidacao);
      gravarComissaoTecnicaCampeonato_(campeonatoId, lista, recursos);
      if (contextoAtual) tela = medirFaseCadastro_('resposta', function () {
        return montarRespostaElenco_(contextoAtual, recursos.listas[campeonatoId], recursos);
      });
    } finally {
      delete recursos.arquivosDrive;
      lock.releaseLock();
    }

    if (!tela) tela = medirFaseCadastro_('resposta', function () { return respostaCadastro_(contexto); });
    tela.recado = 'Membro ' + nome + ' atualizado com sucesso. O histórico será consolidado em segundo plano.';
    return tela;
  }

  function removerMembroComissao(campeonatoId, membroId) {
    sessaoCampeonato_();
    return removerMembroComissaoInterno_(campeonatoId, membroId);
  }

  function removerMembroComissaoInterno_(campeonatoId, membroId, contexto, solicitacaoElenco) {
    return removerPessoaCampeonatoInterno_(campeonatoId, membroId, 'comissao', contexto, solicitacaoElenco);
  }

  /**
   * Detecta se um nome é similar a outro usando verificação simplificada.
   * Retorna true se os nomes são muito parecidos (possível duplicata).
   * @param {string} nome1
   * @param {string} nome2
   * @return {boolean}
   */
  function nomeSimilar_(nome1, nome2) {
    const n1 = String(nome1 || '').toLowerCase().trim();
    const n2 = String(nome2 || '').toLowerCase().trim();

    if (!n1 || !n2) return false;

    // Se um é substring do outro
    if (n1.indexOf(n2) !== -1 || n2.indexOf(n1) !== -1) return true;

    // Remover acentos, caracteres especiais e espaços extras
    const limpar = function (s) {
      return s.replace(/[àáäâãèéëêìíïîòóöôõùúüûç\s]/g, '').toLowerCase();
    };

    const l1 = limpar(n1);
    const l2 = limpar(n2);

    // Se forem iguais sem acentos
    if (l1 === l2) return true;

    // Se um é substring do outro (mesmo sem acentos)
    if (l1.indexOf(l2) !== -1 || l2.indexOf(l1) !== -1) return true;

    return false;
  }

  /**
   * Valida duplicatas de atleta verificando CPF e nome similar.
   * @param {string} nome
   * @param {string} cpf
   * @param {Array} lista
   * @param {string} atletaIdExcluir (opcional, para edição)
   * @return {Object} {ok: boolean, motivo: string}
   */
  function validarDuplicataAtleta_(nome, cpf, lista, atletaIdExcluir) {
    const cpfLimpo = somenteDigitos_(cpf || '');

    // Verificar CPF duplicado
    const cpfDuplicado = lista.some(function (a) {
      if (atletaIdExcluir && a.id === atletaIdExcluir) return false;
      return somenteDigitos_(a.cpf || '') === cpfLimpo;
    });

    if (cpfDuplicado) {
      return {
        ok: false,
        motivo: 'CPF já cadastrado: este CPF já pertence a outro atleta neste campeonato.'
      };
    }

    // Verificar nome similar
    const nomeSimilarEncontrado = lista.some(function (a) {
      if (atletaIdExcluir && a.id === atletaIdExcluir) return false;
      return nomeSimilar_(nome, a.nome);
    });

    if (nomeSimilarEncontrado) {
      return {
        ok: false,
        motivo: 'Nome similar já cadastrado: existe um atleta com nome muito parecido. Verifique se não é duplicata.'
      };
    }

    return { ok: true, motivo: '' };
  }

  /**
   * Valida duplicatas de comissionado verificando CPF e nome similar.
   * @param {string} nome
   * @param {string} cpf
   * @param {Array} lista
   * @param {string} comissionadoIdExcluir (opcional, para edição)
   * @return {Object} {ok: boolean, motivo: string}
   */
  function validarDuplicataComissao_(nome, cpf, lista, comissionadoIdExcluir) {
    // Verificar CPF duplicado (se fornecido)
    if (cpf) {
      const cpfLimpo = somenteDigitos_(cpf);
      const cpfDuplicado = lista.some(function (c) {
        if (comissionadoIdExcluir && c.id === comissionadoIdExcluir) return false;
        return somenteDigitos_(c.cpf || '') === cpfLimpo;
      });

      if (cpfDuplicado) {
        return {
          ok: false,
          motivo: 'CPF já cadastrado: este CPF já pertence a outro comissionado neste campeonato.'
        };
      }
    }

    // Verificar nome similar
    const nomeSimilarEncontrado = lista.some(function (c) {
      if (comissionadoIdExcluir && c.id === comissionadoIdExcluir) return false;
      return nomeSimilar_(nome, c.nome);
    });

    if (nomeSimilarEncontrado) {
      return {
        ok: false,
        motivo: 'Nome similar já cadastrado: existe um comissionado com nome muito parecido. Verifique se não é duplicata.'
      };
    }

    return { ok: true, motivo: '' };
  }

/******************************************************
 * FUNÇÕES AUXILIARES
 ******************************************************/

/**
 * Pasta raiz do projeto no Drive.
 * @return {DriveApp.Folder}
 */
function pastaRaizProjeto_() {
  try {
    return DriveApp.getFolderById(CONFIG.pastaRaizId);
  } catch (e) {
    throw new Error('Não foi possível abrir a pasta raiz do projeto no Drive (id '
      + CONFIG.pastaRaizId + '). Verifique se o seu e-mail tem acesso a ela.');
  }
}

/**
 * Gera um ID único baseado em UUID.
 * @return {string}
 */
function gerarIdUnico_() {
  return Utilities.getUuid();
}

/**
 * Limpa um campo: remove espaços, limita tamanho.
 * @param {string} valor
 * @param {number} tamanhoMax
 * @return {string}
 */
function limparCampo_(valor, tamanhoMax) {
  const texto = String(valor === null || valor === undefined ? '' : valor)
    .replace(/\s+/g, ' ')
    .trim();

  return tamanhoMax ? texto.substring(0, tamanhoMax) : texto;
}

/**
 * Extrai somente dígitos de uma string.
 * @param {string} valor
 * @return {string}
 */
function somenteDigitos_(valor) {
  return String(valor || '').replace(/\D/g, '');
}

/**
 * Exige e valida um campo de formulário.
 * @param {string} valor
 * @param {number} tamanhoMax
 * @param {string} mensagem Mensagem de erro.
 * @return {string}
 */
function exigirCampo_(valor, tamanhoMax, mensagem) {
  const texto = limparCampo_(valor, tamanhoMax);

  if (!texto) {
    throw new Error(mensagem || 'Este campo é obrigatório.');
  }

  return texto;
}

/**
 * Formata a data e hora atual para string "AAAA-MM-DD HH:mm:ss".
 * @param {Date} data
 * @return {string}
 */
function formatarDataHora_(data) {
  const d = data || new Date();

  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const minuto = String(d.getMinutes()).padStart(2, '0');
  const segundo = String(d.getSeconds()).padStart(2, '0');

  return ano + '-' + mes + '-' + dia + ' ' + hora + ':' + minuto + ':' + segundo;
}

/**
 * Localiza ou cria a planilha AEUV - Associados na pasta raiz do projeto.
 * @return {SpreadsheetApp.Spreadsheet}
 */
function planilhaAssociados_() {
  const propriedades = PropertiesService.getScriptProperties();
  const guardado = propriedades.getProperty(CONFIG.associados.chavePlanilha);

  if (guardado) {
    try {
      return SpreadsheetApp.openById(guardado);
    } catch (e) {}
  }

  const raiz = pastaRaizProjeto_();
  const existentes = raiz.getFilesByName(CONFIG.associados.planilha);
  let planilha;

  if (existentes.hasNext()) {
    planilha = SpreadsheetApp.openById(existentes.next().getId());
  } else {
    planilha = SpreadsheetApp.create(CONFIG.associados.planilha);
    DriveApp.getFileById(planilha.getId()).moveTo(raiz);
  }

  propriedades.setProperty(CONFIG.associados.chavePlanilha, planilha.getId());
  return planilha;
}

/**
 * Localiza ou cria a pasta de documentos dos associados.
 * @return {DriveApp.Folder}
 */
function pastaAssociados_() {
  const propriedades = PropertiesService.getScriptProperties();
  const guardado = propriedades.getProperty(CONFIG.associados.chavePasta);

  if (guardado) {
    try {
      const pasta = DriveApp.getFolderById(guardado);
      if (!pasta.isTrashed()) {
        return pasta;
      }
    } catch (e) {}
  }

  const raiz = pastaRaizProjeto_();
  const existentes = raiz.getFoldersByName(CONFIG.associados.pastaDocumentos);
  const pasta = existentes.hasNext()
    ? existentes.next()
    : raiz.createFolder(CONFIG.associados.pastaDocumentos);

  propriedades.setProperty(CONFIG.associados.chavePasta, pasta.getId());
  return pasta;
}

/**
 * Retorna a aba de associados com cabeçalho garantido.
 * @return {SpreadsheetApp.Sheet}
 */
function abaAssociados_() {
  const planilha = planilhaAssociados_();
  const aba = planilha.getSheetByName(CONFIG.associados.aba) || planilha.insertSheet(CONFIG.associados.aba);

  const titulos = ASSOCIADOS_COLUNAS.map(function (c) { return c.titulo; });
  const primeira = aba.getRange(1, 1, 1, titulos.length).getValues()[0];
  const precisaCabecalho = titulos.some(function (titulo, i) {
    return String(primeira[i] || '') !== titulo;
  });

  if (precisaCabecalho) {
    aba.getRange(1, 1, 1, titulos.length).setValues([titulos]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }

  return aba;
}
