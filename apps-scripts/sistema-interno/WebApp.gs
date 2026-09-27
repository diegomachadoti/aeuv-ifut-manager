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

  // Contato exibido para quem tenta entrar sem autorizacao.
  emailSuporte: 'associacaoaeuv@gmail.com'
};

/**
 * Lista usada enquanto a propriedade USUARIOS_AUTORIZADOS nao for definida.
 * Para alterar os autorizados sem mexer no codigo, use definirUsuariosAutorizados().
 */
const USUARIOS_PADRAO = [
  { email: 'deejaydiego@gmail.com', nome: 'Diego Machado', perfil: 'admin' },
  { email: 'artetopudi@gmail.com', nome: 'Diretoria', perfil: 'admin' },
  { email: 'associacaoaeuv@gmail.com', nome: 'AEUV', perfil: 'admin' }
];

/**
 * Perfis aceitos pelo sistema.
 */
const PERFIS = {
  admin: 'Administrador',
  diretoria: 'Diretoria',
  membro: 'Membro'
};

/**
 * Modulos do sistema. Para publicar uma funcionalidade nova basta
 * acrescentar um item aqui e, se for uma tela propria, tratar o id
 * em renderizarModulo() no Index.html.
 *
 * tipo:
 *   painel   - tela inicial com os atalhos
 *   link     - abre um endereco externo em nova aba
 *   usuarios - tabela de autorizados (somente admin)
 *   breve    - funcionalidade planejada, ainda sem tela
 */
const MODULOS = [
  {
    id: 'inicio',
    nome: 'Início',
    icone: '🏠',
    tipo: 'painel',
    descricao: 'Visão geral do sistema e atalhos para as funcionalidades liberadas.',
    perfis: ['admin', 'diretoria', 'membro']
  },
  {
    id: 'sumula',
    nome: 'Súmula digital',
    icone: '📋',
    tipo: 'link',
    url: 'https://portal.aeuv.org/sumula/',
    descricao: 'Formulário oficial preenchido pela arbitragem após cada partida.',
    perfis: ['admin', 'diretoria', 'membro']
  },
  {
    id: 'inscricao',
    nome: 'Inscrição e portabilidade',
    icone: '📝',
    tipo: 'link',
    url: 'https://portal.aeuv.org/inscricao/',
    descricao: 'Solicitações de inscrição, remoção e portabilidade de atletas.',
    perfis: ['admin', 'diretoria', 'membro']
  },
  {
    id: 'notas',
    nome: 'Notas oficiais',
    icone: '📄',
    tipo: 'breve',
    descricao: 'Consulta às notas oficiais disciplinares geradas a partir das súmulas.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'punicoes',
    nome: 'Controle de punições',
    icone: '⚖️',
    tipo: 'breve',
    descricao: 'Acompanhamento das punições aplicadas e do cumprimento por atleta.',
    perfis: ['admin', 'diretoria']
  },
  {
    id: 'atletas',
    nome: 'Atletas',
    icone: '👥',
    tipo: 'breve',
    descricao: 'Cadastro consolidado dos atletas e a situação de cada um na competição.',
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

/******************************************************
 * ABERTURA DO SISTEMA
 ******************************************************/

/**
 * Abre o sistema interno. Usuarios nao identificados ou fora da
 * lista recebem a tela de acesso negado.
 * @return {HtmlOutput}
 */
function doGet() {
  const sessao = identificarUsuario_();

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
    modulos: sessao.autorizado ? modulosPermitidos_(sessao.usuario.perfil) : []
  };

  return template
    .evaluate()
    .setTitle('AEUV - Sistema Interno')
    .setFaviconUrl(CONFIG.faviconUrl)
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

  const perfil = PERFIS[autorizado.perfil] ? autorizado.perfil : 'membro';

  return {
    autorizado: true,
    email: email,
    motivo: '',
    usuario: {
      email: email,
      nome: autorizado.nome || email.split('@')[0],
      perfil: perfil,
      perfilNome: PERFIS[perfil]
    }
  };
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
      url: modulo.url || ''
    };
  });
}

/******************************************************
 * ADMINISTRACAO DOS AUTORIZADOS
 ******************************************************/

/**
 * Grava a lista de autorizados nas propriedades do script.
 * Execute esta funcao pelo editor do Apps Script depois de ajustar
 * a lista abaixo. Nao exige nova implantacao.
 */
function definirUsuariosAutorizados() {
  const lista = [
    { email: 'deejaydiego@gmail.com', nome: 'Diego Machado', perfil: 'admin' },
    { email: 'artetopudi@gmail.com', nome: 'Diretoria', perfil: 'admin' },
    { email: 'associacaoaeuv@gmail.com', nome: 'AEUV', perfil: 'admin' }
  ];

  const validos = lista.filter(function (usuario) {
    return normalizarEmail_(usuario.email).indexOf('@') > 0;
  });

  if (!validos.length) {
    throw new Error('Informe ao menos um e-mail valido antes de gravar a lista.');
  }

  const temAdmin = validos.some(function (usuario) {
    return usuario.perfil === 'admin';
  });

  if (!temAdmin) {
    throw new Error('Mantenha ao menos um usuario com perfil admin.');
  }

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
 * Devolve a lista de autorizados para a tela de usuarios.
 * Chamada pelo cliente; refaz a verificacao de permissao no servidor.
 * @return {Array<Object>}
 */
function listarUsuarios() {
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || sessao.usuario.perfil !== 'admin') {
    throw new Error('Apenas administradores podem consultar a lista de acessos.');
  }

  return obterUsuarios_().map(function (usuario) {
    const perfil = PERFIS[usuario.perfil] ? usuario.perfil : 'membro';

    return {
      email: normalizarEmail_(usuario.email),
      nome: usuario.nome || '',
      perfil: perfil,
      perfilNome: PERFIS[perfil]
    };
  });
}

/******************************************************
 * LOGO
 ******************************************************/

/**
 * Converte o logo configurado em data URL para uso no HTML.
 * @return {string}
 */
function obterLogo_() {
  try {
    const arquivo = DriveApp.getFileById(CONFIG.logoFileId);
    const blob = arquivo.getBlob();

    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return CONFIG.faviconUrl;
  }
}

/******************************************************
 * DIAGNOSTICO
 ******************************************************/

/**
 * Mostra no log como o sistema esta enxergando o usuario atual.
 * Util para conferir se a implantacao esta no modo correto.
 */
function diagnosticarAcesso() {
  const sessao = identificarUsuario_();

  Logger.log('E-mail lido .......: %s', sessao.email || '(vazio)');
  Logger.log('Autorizado ........: %s', sessao.autorizado);
  Logger.log('Motivo ............: %s', sessao.motivo || '-');
  Logger.log('Autorizados ativos : %s', obterUsuarios_().length);

  if (!sessao.email) {
    Logger.log('ATENCAO: implante como "Executar como: Usuario que acessa o app da web".');
  }
}
