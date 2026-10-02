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
  { id: 'formularios', nome: 'Formulários', icone: '📨' }
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
    id: 'associados',
    nome: 'Associados',
    icone: '🤝',
    tipo: 'associados',
    descricao: 'Cadastro das equipes associadas, com representante legal, documentação e situação.',
    perfis: ['admin', 'diretoria', 'associado']
  },
  {
    id: 'equipes',
    nome: 'Equipes',
    icone: '🏳️',
    tipo: 'equipes',
    descricao: 'Equipes participantes. A lista alimenta o cadastro, os acessos e os dois formulários.',
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
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(String(email || ''));
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
    return String(nome || '').replace(/\s+/g, ' ').trim();
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

/**
 * Dados da tela de equipes.
 * @param {Array<string>} lista
 * @return {{equipes: Array<Object>, arquivoUrl: string, podeEditar: boolean}}
 */
function montarTelaEquipes_(lista, sessao) {
  const emUso = equipesEmUso_();

  return {
    equipes: lista.map(function (nome) {
      return { nome: nome, emUso: emUso[chaveEquipe_(nome)] || [] };
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
  const sessao = exigirEdicaoEquipes_();

  const nome = String((dados && dados.nome) || '').replace(/\s+/g, ' ').trim();
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
  const sessao = exigirEdicaoEquipes_();
  const alvo = chaveEquipe_(nome);

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
      + CONFIG.punicoes.subpasta + '" do Drive. Ele é publicado pela automação a cada nova punição.');
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
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || !moduloLiberado_('solicitacoes', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para consultar as solicitações de inscrição.');
  }

  const raiz = pastaSolicitacoes_();
  const achados = [];
  const nomesVistos = {};

  SOLICITACOES_PASTAS.forEach(function (origem) {
    const pastas = raiz.getFoldersByName(origem.pasta);

    // A pasta "Processados"/"Falhas" so existe depois que a automacao roda
    // pela primeira vez; a ausencia dela nao e erro.
    if (!pastas.hasNext()) {
      return;
    }

    const iterador = pastas.next().getFiles();

    while (iterador.hasNext()) {
      const arquivo = iterador.next();
      const nome = arquivo.getName();

      if (nome.toLowerCase().slice(-4) !== '.txt') {
        continue;
      }

      nomesVistos[nome] = true;
      achados.push({
        arquivo: arquivo,
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

    if (nome.toLowerCase().slice(-4) !== '.txt' || nomesVistos[nome]) {
      continue;
    }

    nomesVistos[nome] = true;
    achados.push({
      arquivo: arquivo,
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

  const limite = CONFIG.solicitacoes.maxLeitura;
  const resultados = indiceResultados_(raiz);
  const registros = achados.slice(0, limite).map(function (achado) {
    achado.resultado = resultados[nomeBase_(achado.arquivo.getName())] || null;
    return interpretarSolicitacao_(
      achado.arquivo.getBlob().getDataAsString('UTF-8'),
      achado
    );
  });

  return {
    registros: registros,
    situacoes: SOLICITACOES_PASTAS,
    acoes: SOLICITACOES_ACOES,
    total: achados.length,
    limite: limite,
    pastaUrl: raiz.getUrl()
  };
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
    throw new Error('Não foi possível abrir a pasta das inscrições no Drive (id '
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
function indiceResultados_(raiz) {
  const indice = {};
  const pastas = raiz.getFoldersByName('Resultados');

  if (!pastas.hasNext()) {
    return indice;
  }

  const arquivos = pastas.next().getFiles();

  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    const achado = String(arquivo.getName()).match(/^(.+)-resultado-\d{8}-\d{6}\.(txt|pdf)$/i);

    if (!achado) {
      continue;
    }

    const chave = achado[1];
    const campo = achado[2].toLowerCase() === 'pdf' ? 'pdfUrl' : 'txtUrl';

    if (!indice[chave]) {
      indice[chave] = { txtUrl: '', pdfUrl: '' };
    }

    // Se houver mais de um processamento do mesmo arquivo, fica o mais
    // recente: o carimbo no nome cresce com o tempo.
    if (!indice[chave][campo] || arquivo.getName() > indice[chave][campo + 'Nome']) {
      indice[chave][campo] = arquivo.getUrl();
      indice[chave][campo + 'Nome'] = arquivo.getName();
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
function interpretarSolicitacao_(conteudo, achado) {
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

  const resumo = {};

  SOLICITACOES_ACOES.forEach(function (acao) {
    resumo[acao] = registros.filter(function (registro) {
      return registro.acao === acao;
    }).length;
  });

  return {
    situacao: achado.situacao,
    icone: achado.icone,
    protocolo: cabecalho['PROTOCOLO'] || '',
    dataHora: cabecalho['DATA/HORA'] || '',
    ordem: achado.ordem,
    competicao: cabecalho['COMPETICAO'] || '',
    equipe: cabecalho['EQUIPE'] || '',
    responsavel: cabecalho['RESPONSAVEL'] || '',
    telefone: cabecalho['TELEFONE/WHATSAPP'] || '',
    comprovanteUrl: cabecalho['COMPROVANTE PIX'] || '',
    arquivoNome: achado.arquivo.getName(),
    arquivoUrl: achado.arquivo.getUrl(),
    resultadoTxtUrl: achado.resultado ? achado.resultado.txtUrl : '',
    resultadoPdfUrl: achado.resultado ? achado.resultado.pdfUrl : '',
    quantidade: registros.length,
    resumo: resumo,
    pessoas: registros
  };
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
  const sessao = identificarUsuario_();

  if (!sessao.autorizado || !moduloLiberado_('sumulas', sessao.usuario.perfil)) {
    throw new Error('Você não tem permissão para consultar as súmulas digitais.');
  }

  const raiz = pastaSumulas_();
  const achados = [];
  const nomesVistos = {};

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
      situacao: 'Aguardando',
      icone: '🕒',
      ordem: arquivo.getDateCreated().getTime()
    });
  }

  achados.sort(function (a, b) {
    return b.ordem - a.ordem;
  });

  const limite = CONFIG.sumulas.maxLeitura;
  const registros = achados.slice(0, limite).map(function (achado) {
    return interpretarSumula_(
      achado.arquivo.getBlob().getDataAsString('UTF-8'),
      achado
    );
  });

  const notas = indiceNotas_();

  registros.forEach(function (registro) {
    const achado = notas[chaveProtocolo_(registro.protocolo)];

    registro.notas = achado ? achado.notas : [];
    registro.dataNota = achado ? achado.dataNota : '';
    registro.punidos = achado ? achado.punidos : [];
  });

  return {
    registros: registros,
    situacoes: SUMULAS_PASTAS,
    equipes: equipesDasSumulas_(registros),
    total: achados.length,
    limite: limite,
    pastaUrl: raiz.getUrl()
  };
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
function interpretarSumula_(conteudo, achado) {
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
      fatos.push(linha.replace(/\s+$/, ''));
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
      // Na secao PARTIDA a linha sem ":" e o confronto "<time> x <time>".
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

  const equipes = times.slice();

  envolvidos.forEach(function (envolvido) {
    if (envolvido.equipe && equipes.indexOf(envolvido.equipe) === -1) {
      equipes.push(envolvido.equipe);
    }
  });

  return {
    situacao: achado.situacao,
    icone: achado.icone,
    ordem: achado.ordem,
    protocolo: cabecalho['PROTOCOLO'] || '',
    dataEnvio: cabecalho['DATA ENVIO'] || '',
    arbitro: cabecalho['ÁRBITRO'] || cabecalho['ARBITRO'] || '',
    documento: cabecalho['DOCUMENTO'] || '',
    confronto: confronto,
    mandante: times[0] || '',
    visitante: times[1] || '',
    dataJogo: partida['DATA'] || '',
    horaJogo: partida['HORA'] || '',
    fatos: aparar_(fatos).join('\n'),
    equipes: equipes,
    quantidade: envolvidos.length,
    envolvidos: envolvidos,
    pdfUrl: pdfUrl,
    arquivoNome: achado.arquivo.getName(),
    arquivoUrl: achado.arquivo.getUrl()
  };
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

    // Nota publicada deveria estar sempre fechada; o campo existe para a
    // tela avisar caso um rascunho chegue ao Drive por engano. O aviso do
    // topo cita "[A DEFINIR PELA COMISSÃO]" so como instrucao, por isso a
    // busca e feita no corpo (mesmo criterio de nota_pdf.tem_pendencias).
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
 * Grava um associado. Cria quando a equipe ainda nao tem cadastro e
 * atualiza quando ja tem: existe um registro por equipe.
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

    let linhaExistente = 0;
    let anterior = null;

    for (let i = 1; i < valores.length; i++) {
      if (chaveEquipe_(valores[i][0]) === chave) {
        linhaExistente = i + 1;
        anterior = linhaParaAssociado_(valores[i]);
        break;
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
    .replace(/\s+/g, ' ')
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

  const pastaEquipe = subpastaEquipe_(equipe);
  const extensao = (String(arquivo.nome || '').match(/\.[a-zA-Z0-9]+$/) || [''])[0];
  const nomeFinal = nomeSeguroAssociados_(equipe) + ' - ' + documento.nome + extensao;

  // Remove a versao anterior do mesmo documento para a pasta nao acumular
  // copias antigas e confundir quem consulta.
  const antigos = pastaEquipe.getFilesByName(nomeFinal);

  while (antigos.hasNext()) {
    antigos.next().setTrashed(true);
  }

  return pastaEquipe
    .createFile(Utilities.newBlob(bytes, tipo, nomeFinal))
    .getUrl();
}

/**
 * Pasta da equipe dentro da pasta de documentos, criada quando faltar.
 * @param {string} equipe
 * @return {DriveApp.Folder}
 */
function subpastaEquipe_(equipe) {
  const raiz = pastaAssociados_();
  const nome = nomeSeguroAssociados_(equipe);
  const existentes = raiz.getFoldersByName(nome);

  return existentes.hasNext() ? existentes.next() : raiz.createFolder(nome);
}

/**
 * Pasta de documentos dos associados, dentro da pasta raiz do projeto.
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
    } catch (e) {
      // Pasta removida ou sem acesso: procura de novo pelo nome.
    }
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
 * Planilha do cadastro, criada dentro da pasta raiz quando ainda nao existir.
 * @return {SpreadsheetApp.Spreadsheet}
 */
function planilhaAssociados_() {
  const propriedades = PropertiesService.getScriptProperties();
  const guardado = propriedades.getProperty(CONFIG.associados.chavePlanilha);

  if (guardado) {
    try {
      return SpreadsheetApp.openById(guardado);
    } catch (e) {
      // Planilha removida ou sem acesso: procura de novo pelo nome.
    }
  }

  const raiz = pastaRaizProjeto_();
  const existentes = raiz.getFilesByName(CONFIG.associados.planilha);
  let planilha;

  if (existentes.hasNext()) {
    planilha = SpreadsheetApp.openById(existentes.next().getId());
  } else {
    planilha = SpreadsheetApp.create(CONFIG.associados.planilha);

    // Uma planilha nova nasce na raiz do Meu Drive; movemos para a pasta
    // do projeto para nao espalhar arquivos soltos.
    DriveApp.getFileById(planilha.getId()).moveTo(raiz);
  }

  propriedades.setProperty(CONFIG.associados.chavePlanilha, planilha.getId());

  return planilha;
}

/**
 * Aba do cadastro, com o cabecalho garantido.
 * @return {SpreadsheetApp.Sheet}
 */
function abaAssociados_() {
  const planilha = planilhaAssociados_();
  const aba = planilha.getSheetByName(CONFIG.associados.aba)
    || planilha.insertSheet(CONFIG.associados.aba);

  const titulos = ASSOCIADOS_COLUNAS.map(function (coluna) {
    return coluna.titulo;
  });

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

/**
 * Pasta raiz do projeto no Drive.
 * @return {DriveApp.Folder}
 */
function pastaRaizProjeto_() {
  try {
    return DriveApp.getFolderById(CONFIG.pastaRaizId);
  } catch (e) {
    throw new Error('Não foi possível abrir a pasta "AEUV - Automação" no Drive (id '
      + CONFIG.pastaRaizId + '). Confirme que o seu e-mail tem acesso de edição a ela. '
      + 'Detalhe: ' + (e && e.message ? e.message : e));
  }
}

/**
 * Deixa o texto seguro para usar como nome de arquivo ou pasta.
 * @param {string} valor
 * @return {string}
 */
function nomeSeguroAssociados_(valor) {
  return String(valor || '').replace(/[\\/:*?"<>|]+/g, '-').trim().substring(0, 80);
}

/**
 * Corta espacos e limita o tamanho de um campo de texto.
 * @param {string} valor
 * @param {number} limite
 * @return {string}
 */
function limparCampo_(valor, limite) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, limite);
}

/**
 * Como limparCampo_, mas recusa valor vazio.
 * @param {string} valor
 * @param {number} limite
 * @param {string} mensagem Erro mostrado quando o campo vier vazio.
 * @return {string}
 */
function exigirCampo_(valor, limite, mensagem) {
  const limpo = limparCampo_(valor, limite);

  if (!limpo) {
    throw new Error(mensagem);
  }

  return limpo;
}

/**
 * Mantem apenas os digitos de um valor.
 * @param {string} valor
 * @return {string}
 */
function somenteDigitos_(valor) {
  return String(valor === null || valor === undefined ? '' : valor).replace(/\D+/g, '');
}

/**
 * Data e hora no formato usado na planilha.
 * @param {Date} data
 * @return {string}
 */
function formatarDataHora_(data) {
  return Utilities.formatDate(data, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
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

/**
 * Confere passo a passo a leitura do controle de punicoes.
 *
 * Execute esta funcao pelo editor quando a tela acusar falta de acesso. Alem de
 * mostrar onde a leitura parou, a execucao pelo editor pede o consentimento dos
 * servicos usados pelo codigo: se o app tiver sido autorizado antes de passar a
 * ler o Drive, e isso que restabelece a permissao.
 */
function diagnosticarPunicoes() {
  Logger.log('Usuario ...........: %s', obterEmailAtivo_() || '(vazio)');

  let raiz;

  try {
    raiz = DriveApp.getFolderById(CONFIG.punicoes.pastaSumulasId);
    Logger.log('Pasta das sumulas .: %s', raiz.getName());
  } catch (e) {
    Logger.log('FALHOU ao abrir a pasta das sumulas: %s', e && e.message ? e.message : e);
    Logger.log('Confira o id em CONFIG.punicoes.pastaSumulasId e o seu acesso a essa pasta.');
    return;
  }

  const pastas = raiz.getFoldersByName(CONFIG.punicoes.subpasta);

  if (!pastas.hasNext()) {
    Logger.log('FALHOU: subpasta "%s" nao encontrada.', CONFIG.punicoes.subpasta);
    Logger.log('Subpastas existentes:');

    const todas = raiz.getFolders();

    while (todas.hasNext()) {
      Logger.log(' - %s', todas.next().getName());
    }

    return;
  }

  const pasta = pastas.next();
  const arquivos = pasta.getFilesByName(CONFIG.punicoes.arquivo);

  if (!arquivos.hasNext()) {
    Logger.log('FALHOU: arquivo "%s" nao encontrado na subpasta.', CONFIG.punicoes.arquivo);
    Logger.log('Arquivos existentes:');

    const todos = pasta.getFiles();

    while (todos.hasNext()) {
      Logger.log(' - %s', todos.next().getName());
    }

    return;
  }

  const registros = interpretarPunicoes_(arquivos.next().getBlob().getDataAsString('UTF-8'));

  Logger.log('Leitura concluida .: %s punicao(oes) reconhecida(s).', registros.length);
}

/**
 * Confere a leitura das solicitacoes de inscricao.
 *
 * Execute pelo editor quando a tela acusar erro. Mostra quantos arquivos
 * existem em cada subpasta e o conteudo reconhecido no mais recente.
 */
function diagnosticarSolicitacoes() {
  Logger.log('Usuario ...........: %s', obterEmailAtivo_() || '(vazio)');

  let raiz;

  try {
    raiz = pastaSolicitacoes_();
    Logger.log('Pasta das inscricoes: %s', raiz.getName());
  } catch (e) {
    Logger.log('FALHOU: %s', e && e.message ? e.message : e);
    return;
  }

  SOLICITACOES_PASTAS.forEach(function (origem) {
    const pastas = raiz.getFoldersByName(origem.pasta);

    if (!pastas.hasNext()) {
      Logger.log('%s: subpasta nao encontrada (normal se a automacao ainda nao rodou).', origem.pasta);
      return;
    }

    const arquivos = pastas.next().getFiles();
    let total = 0;

    while (arquivos.hasNext()) {
      arquivos.next();
      total++;
    }

    Logger.log('%s: %s arquivo(s).', origem.pasta, total);
  });

  const arquivosRaizSol = raiz.getFiles();
  let totalRaizSol = 0;
  while (arquivosRaizSol.hasNext()) {
    if (arquivosRaizSol.next().getName().toLowerCase().slice(-4) === '.txt') {
      totalRaizSol++;
    }
  }
  Logger.log('Raiz (Aguardando) .: %s TXT(s).', totalRaizSol);

  const resultados = indiceResultados_(raiz);

  Logger.log('Resultados ........: %s solicitacao(oes) com resultado publicado pela automacao.',
    Object.keys(resultados).length);

  const dados = listarSolicitacoes();

  Logger.log('Leitura concluida .: %s solicitacao(oes) reconhecida(s) de %s arquivo(s).',
    dados.registros.length, dados.total);

  if (dados.registros.length) {
    const primeira = dados.registros[0];

    Logger.log('Mais recente ......: %s | %s | %s | %s pessoa(s) | resultado: %s',
      primeira.protocolo || '(sem protocolo)', primeira.equipe, primeira.situacao, primeira.quantidade,
      primeira.resultadoPdfUrl || primeira.resultadoTxtUrl ? 'sim' : 'nao');
  }
}

/**
 * Confere a leitura das sumulas digitais.
 *
 * Execute pelo editor quando a tela acusar erro. Mostra quantos arquivos
 * existem em cada subpasta e o que foi reconhecido no mais recente.
 */
function diagnosticarSumulas() {
  Logger.log('Usuario ...........: %s', obterEmailAtivo_() || '(vazio)');

  let raiz;

  try {
    raiz = pastaSumulas_();
    Logger.log('Pasta das sumulas .: %s', raiz.getName());
  } catch (e) {
    Logger.log('FALHOU: %s', e && e.message ? e.message : e);
    return;
  }

  SUMULAS_PASTAS.forEach(function (origem) {
    const pastas = raiz.getFoldersByName(origem.pasta);

    if (!pastas.hasNext()) {
      Logger.log('%s: subpasta nao encontrada (normal se a automacao ainda nao rodou).', origem.pasta);
      return;
    }

    const arquivos = pastas.next().getFiles();
    let total = 0;
    let sumulas = 0;

    while (arquivos.hasNext()) {
      const arq = arquivos.next();
      total++;

      if (/^SUMULA_.+\.txt$/i.test(arq.getName())) {
        sumulas++;
      }
    }

    Logger.log('%s: %s arquivo(s), sendo %s sumula(s).', origem.pasta, total, sumulas);
  });

  const arquivosRaizSum = raiz.getFiles();
  let totalRaizSum = 0;
  while (arquivosRaizSum.hasNext()) {
    if (/^SUMULA_.+\.txt$/i.test(arquivosRaizSum.next().getName())) {
      totalRaizSum++;
    }
  }
  Logger.log('Raiz (Aguardando) .: %s sumula(s).', totalRaizSum);

  const dados = listarSumulas();

  Logger.log('Leitura concluida .: %s sumula(s) reconhecida(s) de %s arquivo(s).',
    dados.registros.length, dados.total);

  if (dados.registros.length) {
    const primeira = dados.registros[0];

    Logger.log('Mais recente ......: %s | %s | %s | %s envolvido(s) | relato: %s caractere(s) | PDF: %s',
      primeira.protocolo || '(sem protocolo)', primeira.confronto || '(sem partida)',
      primeira.situacao, primeira.quantidade, primeira.fatos.length,
      primeira.pdfUrl ? 'sim' : 'nao');
  }
}

/**
 * Confere passo a passo o cadastro de associados.
 *
 * Execute pelo editor quando a tela acusar erro. Alem de mostrar onde parou,
 * a execucao pelo editor pede o consentimento dos servicos usados pelo codigo.
 */
function diagnosticarAssociados() {
  Logger.log('Usuario ...........: %s', obterEmailAtivo_() || '(vazio)');

  let raiz;

  try {
    raiz = pastaRaizProjeto_();
    Logger.log('Pasta raiz ........: %s', raiz.getName());
  } catch (e) {
    Logger.log('FALHOU: %s', e && e.message ? e.message : e);
    return;
  }

  try {
    const planilha = planilhaAssociados_();
    Logger.log('Planilha ..........: %s', planilha.getUrl());
  } catch (e) {
    Logger.log('FALHOU ao abrir a planilha: %s', e && e.message ? e.message : e);
    Logger.log('Confira se voce tem acesso de edicao a pasta raiz.');
    return;
  }

  try {
    Logger.log('Pasta documentos ..: %s', pastaAssociados_().getUrl());
  } catch (e) {
    Logger.log('FALHOU ao abrir a pasta de documentos: %s', e && e.message ? e.message : e);
    return;
  }

  const aba = abaAssociados_();
  const total = Math.max(0, aba.getLastRow() - 1);

  Logger.log('Leitura concluida .: %s associado(s) cadastrado(s).', total);
}

/******************************************************
 * ATAS DE REUNIOES
 ******************************************************/

const ATAS_COLUNAS = [
  'ID', 'Tipo', 'Título', 'Data', 'Local', 'Participantes', 'Texto',
  'Criado em', 'Criado por', 'Atualizado em', 'Atualizado por', 'Revisão', 'PDF'
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
    pdfUrl: String(linha[12] || '')
  };
}

function linhaAta_(ata) {
  return [
    ata.id, ata.tipo, ata.titulo, ata.data, ata.local, ata.participantes, ata.texto,
    ata.criadoEm, ata.criadoPor, ata.atualizadoEm, ata.atualizadoPor, ata.revisao, ata.pdfUrl
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
        id: ata.id, tipo: ata.tipo, titulo: ata.titulo, data: ata.data,
        criadoEm: ata.criadoEm, atualizadoEm: ata.atualizadoEm, pdfUrl: ata.pdfUrl
      };
    })
    .sort(function (a, b) { return b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm); });
  return {
    registros: registros,
    podeEditar: sessao.usuario.perfil === 'diretoria',
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
  if (id && sessao.usuario.perfil !== 'diretoria') {
    throw new Error('Somente a Diretoria pode editar atas existentes.');
  }
  const tipo = String(dados.tipo || '').trim();
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
      tipo: tipo, titulo: titulo, data: data, local: local,
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

function formatarDocumentoAta_(documento, ata) {
  const azul = '#1F3A68';
  const cinza = '#5A6270';
  const corpo = documento.getBody();
  corpo.setMarginTop(95).setMarginBottom(68).setMarginLeft(57).setMarginRight(57);

  const cabecalho = documento.addHeader();
  const marca = cabecalho.appendParagraph('');
  const logo = marca.appendInlineImage(DriveApp.getFileById(CONFIG.logoFileId).getBlob());
  const escala = Math.min(48 / logo.getWidth(), 48 / logo.getHeight());
  logo.setWidth(Math.round(logo.getWidth() * escala));
  logo.setHeight(Math.round(logo.getHeight() * escala));
  marca.appendText('   ' + ASSOCIACAO_NOME)
    .setBold(true).setFontSize(12).setForegroundColor(azul);
  marca.setSpacingAfter(0);
  const subtitulo = cabecalho.appendParagraph('Comissão Organizadora · '
    + (ata.tipo === 'campeonato' ? 'Campeonato' : 'Associação'));
  subtitulo.editAsText().setFontSize(9).setForegroundColor(cinza);
  subtitulo.setSpacingAfter(4);

  const rodape = documento.addFooter();
  const linhaRodape = rodape.appendParagraph(ASSOCIACAO_NOME + ' · Ata de reunião');
  linhaRodape.editAsText().setFontSize(8).setForegroundColor(cinza);

  const faixa = corpo.appendParagraph('ATA DE REUNIÃO · '
    + (ata.tipo === 'campeonato' ? 'CAMPEONATO' : 'ASSOCIAÇÃO'))
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setSpacingAfter(8);
  faixa.editAsText().setForegroundColor(azul).setFontSize(15);
  const titulo = corpo.appendParagraph(ata.titulo)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setSpacingAfter(14);
  titulo.editAsText().setForegroundColor(azul).setFontSize(13);

  const data = ata.data.slice(8, 10) + '/' + ata.data.slice(5, 7) + '/' + ata.data.slice(0, 4);
  const metadados = ['Data: ' + data];
  if (ata.local) metadados.push('Local: ' + ata.local);
  if (ata.participantes) metadados.push('Participantes: ' + ata.participantes);
  metadados.forEach(function (linha) {
    const paragrafo = corpo.appendParagraph(linha).setSpacingAfter(5);
    paragrafo.editAsText().setFontSize(10).setForegroundColor(cinza);
  });

  corpo.appendHorizontalRule();
  ata.texto.split(/\r?\n/).forEach(function (linha) {
    const paragrafo = corpo.appendParagraph(linha)
      .setLineSpacing(1.25).setSpacingAfter(linha ? 6 : 2);
    paragrafo.editAsText().setFontSize(11);
  });

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
  }).reverse(); // Mais recentes primeiro

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
