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
    maxLeitura: 100
  },

  // Pasta raiz "AEUV - Automacao", que agrupa tudo o que o projeto usa no Drive.
  // A planilha e a pasta de documentos dos associados sao criadas dentro dela
  // por prepararAssociados().
  pastaRaizId: '1uDUmgEjeISQ1W3Uc5hcUc25pgXDvVhs3',

  // Cadastro de associados: uma planilha propria, criada e localizada por
  // prepararAssociados(). Os ids ficam nas propriedades do script.
  associados: {
    planilha: 'AEUV - Associados',
    aba: 'Associados',
    pastaDocumentos: 'Documentos - Associados',
    chavePlanilha: 'ASSOCIADOS_PLANILHA_ID',
    chavePasta: 'ASSOCIADOS_PASTA_ID',
    maxArquivoBytes: 5 * 1024 * 1024
  }
};

/**
 * Lista usada enquanto a propriedade USUARIOS_AUTORIZADOS nao for definida.
 * Para alterar os autorizados sem mexer no codigo, use definirUsuariosAutorizados().
 */
const USUARIOS_PADRAO = [
  { email: 'deejaydiego@gmail.com', nome: 'Diego Machado', perfil: 'admin' },
  { email: 'artetopudi@gmail.com', nome: 'Diretoria', perfil: 'admin' },
  { email: 'associacaoaeuv@gmail.com', nome: 'AEUV', perfil: 'admin' },
  { email: 'costtitiiure@gmail.com', nome: 'Iure Costtiti', perfil: 'admin' }
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
    perfis: ['admin', 'diretoria', 'membro']
  },
  {
    id: 'sumula',
    nome: 'Súmula digital',
    icone: '📋',
    tipo: 'link',
    grupo: 'formularios',
    url: 'https://portal.aeuv.org/sumula/',
    descricao: 'Formulário oficial preenchido pela arbitragem após cada partida.',
    perfis: ['admin', 'diretoria', 'membro']
  },
  {
    id: 'inscricao',
    nome: 'Inscrição e portabilidade',
    icone: '📝',
    tipo: 'link',
    grupo: 'formularios',
    url: 'https://portal.aeuv.org/inscricao/',
    descricao: 'Solicitações de inscrição, remoção e portabilidade de atletas.',
    perfis: ['admin', 'diretoria', 'membro']
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
    perfis: ['admin', 'diretoria', 'membro']
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
    perfis: ['admin', 'diretoria', 'membro']
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
      grupo: modulo.grupo || '',
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
    { email: 'associacaoaeuv@gmail.com', nome: 'AEUV', perfil: 'admin' },
    { email: 'costtitiiure@gmail.com', nome: 'Iure Costtiti', perfil: 'admin' }
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

      if (arquivo.getName().toLowerCase().slice(-4) !== '.txt') {
        continue;
      }

      achados.push({
        arquivo: arquivo,
        situacao: origem.situacao,
        icone: origem.icone,
        ordem: carimboDoNome_(arquivo.getName())
      });
    }
  });

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
 * liberada tambem para o perfil membro: o regulamento e o documento que
 * todas as equipes precisam ter a mao.
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
 * Subpasta do Drive com os regulamentos publicados.
 * @return {DriveApp.Folder}
 */
function pastaRegulamentos_() {
  let raiz;

  try {
    raiz = DriveApp.getFolderById(CONFIG.pastaRaizId);
  } catch (e) {
    throw new Error('Não foi possível abrir a pasta raiz do projeto no Drive (id '
      + CONFIG.pastaRaizId + '). Verifique se o seu e-mail tem acesso a ela. '
      + 'Detalhe: ' + (e && e.message ? e.message : e));
  }

  const pastas = raiz.getFoldersByName(CONFIG.regulamentos.subpasta);

  if (!pastas.hasNext()) {
    throw new Error('A pasta "' + CONFIG.regulamentos.subpasta + '" ainda não existe dentro de "'
      + raiz.getName() + '". Crie-a no Drive e publique o regulamento com '
      + 'main.py --publicar-drive.');
  }

  return pastas.next();
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

/**
 * Equipes que podem ser escolhidas no cadastro. Mantenha igual a lista
 * usada nos formularios de inscricao e de sumula.
 */
const ASSOCIADOS_EQUIPES = [
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
 * Devolve os dados necessarios para montar a tela de associados.
 * Chamada pelo cliente; refaz a verificacao de permissao no servidor.
 * @return {{registros: Array<Object>, equipes: Array<string>, status: Array<Object>,
 *           documentos: Array<Object>, podeEditar: boolean, planilhaUrl: string}}
 */
function listarAssociados() {
  const sessao = sessaoAssociados_();
  const aba = abaAssociados_();
  const valores = aba.getDataRange().getValues();

  const registros = valores.slice(1).map(function (linha) {
    return linhaParaAssociado_(linha);
  }).filter(function (registro) {
    return registro.equipe;
  }).sort(function (a, b) {
    return a.equipe.localeCompare(b.equipe, 'pt-BR');
  });

  return {
    registros: registros,
    equipes: ASSOCIADOS_EQUIPES,
    status: ASSOCIADOS_STATUS,
    documentos: ASSOCIADOS_DOCUMENTOS,
    podeEditar: podeEditarAssociados_(sessao.usuario.perfil),
    planilhaUrl: planilhaAssociados_().getUrl()
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
      total++;

      if (/^SUMULA_.+\.txt$/i.test(arquivos.next().getName())) {
        sumulas++;
      }
    }

    Logger.log('%s: %s arquivo(s), sendo %s sumula(s).', origem.pasta, total, sumulas);
  });

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
