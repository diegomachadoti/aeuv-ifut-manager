/******************************************************
 * SUMULA DIGITAL AEUV
 * Projeto independente
 ******************************************************/

// Nome oficial da associação, usado no PDF e no TXT da súmula.
const ASSOCIACAO_NOME = 'AEUV (Associação Esportiva Uberlandense Varzeana)';

const CONFIG = {
  // Mesma planilha utilizada pelo sistema atual.
  spreadsheetId: '1xYG2w3sRiL-UGuJCfYOIzUoJaxPQ8XI6T8A3hz1LI8M',

  // Abas de armazenamento da súmula e dos envolvidos.
  abaSumulas: 'SUMULAS_DIGITAIS',
  abaEnvolvidos: 'SUMULA_ENVOLVIDOS',

  // Limite máximo de envolvidos por registro.
  maxEnvolvidos: 30,

  // Pastas utilizadas para arquivos gerados.
  pastaTxt: 'Arquivos TXT - Sumulas Digitais',
  pastaPdf: 'PDF - Sumulas Digitais',
  pastaAnexos: 'Anexos - Sumulas Digitais',

  // Arquivo do logo exibido no formulário e no PDF.
  logoFileId: '1FZ5UyGPfciIp23D8d7XYJnY9vhFmSAhV',

  // Equipes disponíveis para seleção no formulário.
  equipes: [
    'AJAX',
    'BEATS',
    'BOCA JRS',
    'CRUZMALTINO',
    'INTEGRAÇÃO',
    'KADOSH',
    'LEÕES DO MORUMBI',
    'ONZE GAROTOS',
    'PEQUIS',
    'RIVER',
    'TRANSNANE/BRASILIENSE',
    'TRK',
    'UNIÃO',
    'UNIAO SANTA MARIA',
    'OLHOS DÁGUA',
    'VENUS',
    'FUT ART',
    'REAL PREDADOR'
  ]
};

/******************************************************
 * ABERTURA DO FORMULÁRIO
 ******************************************************/

/**
 * Renderiza a interface HTML da súmula.
 * @return {HtmlOutput}
 */
function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');

  template.config = {
    associacao: ASSOCIACAO_NOME,
    equipes: CONFIG.equipes,
    logoUrl: obterLogo_(),
    limite: CONFIG.maxEnvolvidos
  };

  return template
    .evaluate()
    .setTitle('AEUV - Relatório de Súmula')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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
    return '';
  }
}

/******************************************************
 * SALVAR SÚMULA
 ******************************************************/

/**
 * Valida, registra e gera os arquivos da súmula enviada.
 * @param {Object} payload Dados recebidos do formulário.
 * @return {Object}
 */
function salvarSumula(payload) {
  validarDados_(payload);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const planilha = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    criarEstrutura_(planilha);

    const id = gerarProtocolo_();
    const agora = new Date();
    const pastaAnexos = salvarAnexos_(payload.anexos, id);
    const arquivoPdf = gerarPdf_(payload, id, agora, pastaAnexos);
    const arquivoTxt = gerarTxt_(payload, id, agora, arquivoPdf.url);

    const aba = planilha.getSheetByName(CONFIG.abaSumulas);
    aba.appendRow([
      agora,
      id,
      payload.arbitro,
      payload.documento,
      payload.time1,
      payload.time2,
      payload.dataJogo,
      payload.horaJogo,
      payload.fatos,
      payload.confirmacao,
      arquivoTxt.url,
      arquivoPdf.url,
      pastaAnexos,
      (payload.anexos || []).length,
      (payload.envolvidos || []).length,
      'RECEBIDA'
    ]);

    const abaEnv = planilha.getSheetByName(CONFIG.abaEnvolvidos);
    payload.envolvidos.forEach(function (item) {
      abaEnv.appendRow([
        id,
        item.equipe,
        item.tipo,
        item.nome,
        item.camisa
      ]);
    });

    return {
      sucesso: true,
      protocolo: id,
      arquivoTxtNome: arquivoTxt.nome,
      arquivoTxtConteudo: arquivoTxt.conteudo,
      arquivoPdfUrl: arquivoPdf.url
    };
  } finally {
    lock.releaseLock();
  }
}

/******************************************************
 * GERAR PDF
 ******************************************************/

/**
 * Gera o PDF oficial da súmula e armazena no Drive.
 * @param {Object} payload
 * @param {string} id
 * @param {Date} data
 * @param {string} pastaAnexosUrl
 * @return {{url: string}}
 */
function gerarPdf_(payload, id, data, pastaAnexosUrl) {
  const doc = DocumentApp.create('SUMULA_' + id);
  const corpo = doc.getBody();

  corpo.setMarginTop(42);
  corpo.setMarginBottom(42);
  corpo.setMarginLeft(48);
  corpo.setMarginRight(48);

  const logo = DriveApp.getFileById(CONFIG.logoFileId).getBlob();
  const imagemLogo = corpo.insertImage(0, logo);

  imagemLogo.setWidth(90);
  imagemLogo.setHeight(90);
  imagemLogo.getParent().asParagraph()
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  const titulo = corpo.appendParagraph(ASSOCIACAO_NOME);
  titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  titulo.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  titulo.editAsText()
    .setForegroundColor('#14213d')
    .setFontSize(15)
    .setBold(true);

  const subtitulo = corpo.appendParagraph('SÚMULA DIGITAL OFICIAL DE PARTIDA');
  subtitulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  subtitulo.editAsText()
    .setForegroundColor('#475467')
    .setFontSize(11)
    .setBold(true);

  const protocolo = corpo.appendParagraph('PROTOCOLO  ' + id);
  protocolo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  protocolo.editAsText()
    .setForegroundColor('#14213d')
    .setFontSize(12)
    .setBold(true);
  corpo.appendParagraph(
    'Gerada em ' + Utilities.formatDate(data, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')
  ).setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  corpo.appendParagraph('');
  adicionarTituloSecaoPdf_(corpo, 'DADOS DA PARTIDA');

  const partida = corpo.appendTable([
    ['Árbitro', payload.arbitro],
    ['Documento', payload.documento],
    ['Confronto', payload.time1 + ' x ' + payload.time2],
    ['Horário', payload.horaJogo],
    ['Data', formatarDataPartidaPdf_(payload.dataJogo)]
  ]);
  estilizarTabelaPdf_(partida, false);

  corpo.appendParagraph('');
  adicionarTituloSecaoPdf_(corpo, 'RELATO DA ARBITRAGEM');
  String(payload.fatos || '').split(/\r?\n/).forEach(function (linha) {
    corpo.appendParagraph(linha || ' ').setSpacingAfter(4);
  });

  corpo.appendParagraph('');
  adicionarTituloSecaoPdf_(corpo, 'ENVOLVIDOS');

  const tabela = [
    ['Nº', 'Equipe', 'Tipo', 'Nome', 'Camisa']
  ];

  (payload.envolvidos || []).forEach(function (e, i) {
    tabela.push([
      String(i + 1),
      e.equipe,
      e.tipo,
      e.nome,
      e.camisa || ''
    ]);
  });

  if (tabela.length > 1) {
    estilizarTabelaPdf_(corpo.appendTable(tabela), true);
  } else {
    corpo.appendParagraph('Nenhum envolvido informado.');
  }

  corpo.appendParagraph('');
  adicionarTituloSecaoPdf_(corpo, 'ANEXOS E EVIDÊNCIAS');
  const anexos = payload.anexos || [];
  corpo.appendParagraph(
    anexos.length
      ? 'Arquivos anexados: ' + anexos.length
      : 'Nenhum arquivo anexado.'
  );
  anexos.forEach(function (anexo) {
    corpo.appendListItem(anexo.nome);
  });
  if (anexos.length && pastaAnexosUrl) {
    const linkPasta = corpo.appendParagraph('Abrir pasta de evidências no Google Drive');
    linkPasta.editAsText()
      .setLinkUrl(0, linkPasta.getText().length - 1, pastaAnexosUrl)
      .setForegroundColor('#1155cc')
      .setUnderline(true);
  }

  corpo.appendParagraph('');
  adicionarTituloSecaoPdf_(corpo, 'DECLARAÇÃO DO ÁRBITRO');

  corpo.appendParagraph(
    'Declaro, para os devidos fins, que todas as informações registradas nesta súmula correspondem aos acontecimentos observados durante a partida, assumindo responsabilidade pela veracidade dos dados informados.'
  );

  corpo.appendParagraph('');
  adicionarTituloSecaoPdf_(corpo, 'ASSINATURA DO ÁRBITRO');

  if (payload.assinatura) {
    const base64Assinatura = payload.assinatura.split(',')[1];
    const blobAssinatura = Utilities.newBlob(
      Utilities.base64Decode(base64Assinatura),
      'image/png',
      'assinatura.png'
    );

    const paragrafoAssinatura = corpo.appendParagraph('');
    paragrafoAssinatura.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    const imagemAssinatura = paragrafoAssinatura.appendInlineImage(blobAssinatura);
    imagemAssinatura.setWidth(220);
    imagemAssinatura.setHeight(60);

    const nomeAssinatura = corpo.appendParagraph(payload.arbitro);
    nomeAssinatura.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    const identificacaoAssinatura = corpo.appendParagraph('Árbitro responsável pela súmula');
    identificacaoAssinatura.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }

  const rodape = corpo.appendParagraph(
    'Documento gerado eletronicamente pelo Sistema de Súmula Digital AEUV\nProtocolo: ' + id
  );
  rodape.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  doc.saveAndClose();

  const pdf = DriveApp
    .getFileById(doc.getId())
    .getAs(MimeType.PDF);

  const pasta = obterOuCriarPasta_(CONFIG.pastaPdf);
  const arquivo = pasta.createFile(pdf);

  arquivo.setName('SUMULA_' + id + '.pdf');

  DriveApp.getFileById(doc.getId()).setTrashed(true);

  return {
    url: arquivo.getUrl()
  };
}

/**
 * Gera um PDF de teste com dados fictícios, sem gravar na planilha.
 * Execute pelo editor do Apps Script e abra a URL exibida no log.
 */
function testarGeracaoPdf() {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  const assinaturaTeste = 'data:image/png;base64,' + pngBase64;

  // Mesmo formato montado por obterDados()/obterAnexos() no Index.html.
  const payload = {
    arbitro: 'Árbitro de Teste',
    confirmacao: true,
    documento: 'MG-00000000',
    time1: 'FUT ART',
    time2: 'TRANSNANE/BRASILIENSE',
    dataJogo: '2026-09-25',
    horaJogo: '13:13',
    fatos: [
      'A súmula digital substitui o uso do papel e das planilhas manuais na gestão de campeonatos.',
      'O sistema registra os dados da partida e atualiza as informações em tempo real.',
      '',
      'Aos 12 minutos do primeiro tempo, o atleta camisa 10 recebeu cartão amarelo por reclamação.',
      'Aos 30 minutos do segundo tempo, houve substituição na equipe visitante.',
      'Partida encerrada sem outras ocorrências disciplinares.'
    ].join('\n'),
    envolvidos: [
      { equipe: 'FUT ART', tipo: 'Atleta', nome: 'Atleta Exemplo 1', camisa: '10' },
      { equipe: 'TRANSNANE/BRASILIENSE', tipo: 'Comissão', nome: 'Técnico Exemplo', camisa: '' }
    ],
    assinatura: assinaturaTeste,
    assinaturaPreenchida: true,
    anexos: [
      { nome: 'sumula-fisica.png', tipo: 'image/png', conteudo: pngBase64 },
      { nome: 'evidencia.png', tipo: 'image/png', conteudo: pngBase64 }
    ]
  };

  validarDados_(payload);

  const id = 'TESTE-' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd-HHmmss');
  // Não salva os anexos: usa a pasta principal apenas para exibir o link no PDF.
  const pastaAnexosUrl = obterOuCriarPasta_(CONFIG.pastaAnexos).getUrl();
  const resultado = gerarPdf_(payload, id, new Date(), pastaAnexosUrl);

  console.log('PDF de teste gerado: ' + resultado.url);
  return resultado.url;
}

function adicionarTituloSecaoPdf_(corpo, texto) {
  const titulo = corpo.appendParagraph(texto);
  titulo.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  titulo.setSpacingBefore(10);
  titulo.setSpacingAfter(5);
  titulo.editAsText()
    .setForegroundColor('#14213d')
    .setFontSize(12)
    .setBold(true);
}

function estilizarTabelaPdf_(tabela, temCabecalho) {
  tabela.setBorderColor('#d8deea');
  tabela.setBorderWidth(0.75);

  for (let linha = 0; linha < tabela.getNumRows(); linha++) {
    const cabecalho = temCabecalho && linha === 0;
    const linhaTabela = tabela.getRow(linha);

    for (let coluna = 0; coluna < linhaTabela.getNumCells(); coluna++) {
      const celula = linhaTabela.getCell(coluna);
      celula.setPaddingTop(6);
      celula.setPaddingBottom(6);
      celula.setPaddingLeft(7);
      celula.setPaddingRight(7);
      celula.setBackgroundColor(cabecalho ? '#14213d' : '#ffffff');
      celula.editAsText()
        .setForegroundColor(cabecalho ? '#ffffff' : (coluna === 0 ? '#344054' : '#172033'))
        .setFontSize(9)
        .setBold(cabecalho || (!temCabecalho && coluna === 0));
    }
  }
}

function formatarDataPartidaPdf_(valor) {
  const dataIso = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return dataIso
    ? dataIso[3] + '/' + dataIso[2] + '/' + dataIso[1]
    : String(valor || '');
}

/******************************************************
 * CRIAR ABAS AUTOMATICAMENTE
 ******************************************************/

/**
 * Garante a existência das abas e cabeçalhos necessários.
 * @param {Spreadsheet} ss
 */
function criarEstrutura_(ss) {
  let aba = ss.getSheetByName(CONFIG.abaSumulas);

  if (!aba) {
    aba = ss.insertSheet(CONFIG.abaSumulas);
  }

  if (aba.getLastRow() === 0) {
    aba.appendRow([
      'Data envio',
      'ID Súmula',
      'Árbitro',
      'Documento',
      'Time 1',
      'Time 2',
      'Data partida',
      'Hora partida',
      'Dos fatos',
      'Arquivo TXT'
    ]);

    aba.getRange(1, 1, 1, 10)
      .setFontWeight('bold')
      .setBackground('#14213d')
      .setFontColor('#ffffff');

    aba.setFrozenRows(1);
  }

  let envolvidos = ss.getSheetByName(CONFIG.abaEnvolvidos);

  if (!envolvidos) {
    envolvidos = ss.insertSheet(CONFIG.abaEnvolvidos);
  }

  if (envolvidos.getLastRow() === 0) {
    envolvidos.appendRow([
      'ID Súmula',
      'Equipe',
      'Tipo',
      'Nome completo',
      'Número camisa'
    ]);

    envolvidos.getRange(1, 1, 1, 5)
      .setFontWeight('bold')
      .setBackground('#14213d')
      .setFontColor('#ffffff');

    envolvidos.setFrozenRows(1);
  }
}

/******************************************************
 * VALIDAÇÃO DOS DADOS
 ******************************************************/

/**
 * Valida os dados recebidos antes de salvar a súmula.
 * @param {Object} p
 */
function validarDados_(p) {
  if (!p) {
    throw new Error('Nenhum dado recebido.');
  }

  const camposObrigatorios = {
    arbitro: 'Informe o nome do árbitro.',
    documento: 'Informe o documento do árbitro.',
    time1: 'Selecione o primeiro time da partida.',
    time2: 'Selecione o segundo time da partida.',
    dataJogo: 'Informe a data da partida.',
    horaJogo: 'Informe o horário da partida.',
    fatos: 'Informe o relato da arbitragem.'
  };

  Object.keys(camposObrigatorios).forEach(function (campo) {
    if (!String(p[campo] || '').trim()) {
      throw new Error(camposObrigatorios[campo]);
    }
  });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.dataJogo).trim())) {
    throw new Error('Informe uma data da partida válida (dd/mm/aaaa).');
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(p.horaJogo).trim())) {
    throw new Error('Informe um horário da partida válido (hh:mm, 24 horas).');
  }

  if (
    !CONFIG.equipes.includes(p.time1) ||
    !CONFIG.equipes.includes(p.time2)
  ) {
    throw new Error('Selecione corretamente os dois times da partida.');
  }

  if (p.time1 === p.time2) {
    throw new Error('Os dois times da partida não podem ser iguais.');
  }

  if (!Array.isArray(p.envolvidos)) {
    p.envolvidos = [];
  }

  const envolvidosValidados = [];
  p.envolvidos.forEach(function (e, i) {
    if (!e || typeof e !== 'object') {
      throw new Error('Dados inválidos para o envolvido na linha ' + (i + 1) + '.');
    }

    const equipe = String(e.equipe || '').trim();
    const tipo = String(e.tipo || '').trim();
    const nome = String(e.nome || '').trim();
    const camisa = String(e.camisa == null ? '' : e.camisa).trim();
    const campos = [equipe, tipo, nome, camisa];

    if (!campos.some(Boolean)) {
      return;
    }

    if (!equipe) {
      throw new Error('Selecione a equipe do envolvido na linha ' + (i + 1) + '.');
    }

    if (!tipo) {
      throw new Error('Informe se o envolvido é atleta ou comissão na linha ' + (i + 1) + '.');
    }

    if (!nome) {
      throw new Error('Informe o nome do envolvido na linha ' + (i + 1) + '.');
    }

    const comissao = tipo === 'Comissão';

    if (!comissao && !camisa) {
      throw new Error('Informe o número da camisa do envolvido na linha ' + (i + 1) + '.');
    }

    if (![p.time1, p.time2].includes(equipe)) {
      throw new Error('A equipe do envolvido na linha ' + (i + 1) + ' deve ser um dos times da partida.');
    }

    if (!['Atleta', 'Comissão'].includes(tipo)) {
      throw new Error('Informe um tipo válido para o envolvido na linha ' + (i + 1) + '.');
    }

    if (!comissao && (!/^\d+$/.test(camisa) || Number(camisa) > 99)) {
      throw new Error('O número da camisa na linha ' + (i + 1) + ' deve estar entre 0 e 99.');
    }

    envolvidosValidados.push({
      equipe: equipe,
      tipo: tipo,
      nome: nome,
      camisa: comissao ? '' : camisa
    });
  });

  if (envolvidosValidados.length > CONFIG.maxEnvolvidos) {
    throw new Error('Máximo permitido: 30 envolvidos.');
  }

  p.envolvidos = envolvidosValidados;

  if (!p.assinaturaPreenchida || !p.assinatura) {
    throw new Error('Realize a assinatura do árbitro antes do envio.');
  }

  if (!p.confirmacao) {
    throw new Error('O árbitro deve marcar a declaração de responsabilidade antes do envio.');
  }
}

/******************************************************
 * GERAR ARQUIVO TXT
 ******************************************************/

/**
 * Gera o arquivo TXT da súmula e salva no Drive.
 * @param {Object} payload
 * @param {string} id
 * @param {Date} data
 * @param {string} pdfUrl Link do PDF oficial, incluído ao final do TXT.
 * @return {{nome: string, url: string, conteudo: string}}
 */
function gerarTxt_(payload, id, data, pdfUrl) {
  const linhas = [];

  linhas.push(ASSOCIACAO_NOME);
  linhas.push('SÚMULA DIGITAL');
  linhas.push('');
  linhas.push('PROTOCOLO: ' + id);
  linhas.push(
    'DATA ENVIO: ' + Utilities.formatDate(data, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')
  );
  linhas.push('');
  linhas.push('ÁRBITRO: ' + payload.arbitro);
  linhas.push('DOCUMENTO: ' + payload.documento);
  linhas.push('');
  linhas.push('PARTIDA');
  linhas.push(payload.time1 + ' x ' + payload.time2);
  linhas.push('DATA: ' + payload.dataJogo);
  linhas.push('HORA: ' + payload.horaJogo);
  linhas.push('');
  linhas.push('DOS FATOS');
  linhas.push('--------------------------------');
  linhas.push(payload.fatos);
  linhas.push('');
  linhas.push('ENVOLVIDOS');
  linhas.push('--------------------------------');

  payload.envolvidos.forEach(function (e, i) {
    linhas.push('');
    linhas.push('REGISTRO ' + (i + 1));
    linhas.push('EQUIPE: ' + e.equipe);
    linhas.push('TIPO: ' + e.tipo);
    linhas.push('NOME: ' + e.nome);
    linhas.push('CAMISA: ' + (e.camisa || ''));
  });

  if (pdfUrl) {
    linhas.push('');
    linhas.push('SÚMULA OFICIAL (PDF)');
    linhas.push('--------------------------------');
    linhas.push(pdfUrl);
  }

  const conteudo = linhas.join('\r\n');
  const pasta = obterPastaTxt_();
  const nome = 'SUMULA_' + id + '.txt';

  const arquivo = pasta.createFile(
    Utilities.newBlob(conteudo, 'text/plain', nome)
  );

  return {
    nome: nome,
    url: arquivo.getUrl(),
    conteudo: conteudo
  };
}

/******************************************************
 * PASTA TXT
 ******************************************************/

/**
 * Obtém a pasta dos arquivos TXT, criando quando necessário.
 * @return {Folder}
 */
function obterPastaTxt_() {
  const pastas = DriveApp.getFoldersByName(CONFIG.pastaTxt);

  if (pastas.hasNext()) {
    return pastas.next();
  }

  return DriveApp.createFolder(CONFIG.pastaTxt);
}

/******************************************************
 * GERAR PROTOCOLO
 ******************************************************/

/**
 * Gera um identificador único para a súmula.
 * @return {string}
 */
function gerarProtocolo_() {
  const data = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd');
  const codigo = Utilities.getUuid()
    .replace(/-/g, '')
    .substring(0, 8)
    .toUpperCase();

  return 'SUM-' + data + '-' + codigo;
}

/**
 * Rotina auxiliar para criar a planilha inicial do projeto.
 */
function criarPlanilhaSumula() {
  const ss = SpreadsheetApp.create('AEUV - Sumula Digital');
  const aba = ss.getActiveSheet();

  aba.setName('SUMULAS_DIGITAIS');
  aba.appendRow([
    'Data envio',
    'Protocolo',
    'Arbitro',
    'Documento',
    'Time 1',
    'Time 2',
    'Data partida',
    'Horario',
    'Dos fatos',
    'Declaracao confirmada',
    'Arquivo TXT',
    'Arquivo PDF',
    'Anexos'
  ]);

  const envolvidos = ss.insertSheet('ENVOLVIDOS');
  envolvidos.appendRow([
    'Protocolo',
    'Equipe',
    'Tipo',
    'Nome completo',
    'Numero camisa'
  ]);

  const config = ss.insertSheet('CONFIG');
  config.appendRow(['Parametro', 'Valor']);

  Logger.log('Planilha criada: ' + ss.getUrl());
}

/******************************************************
 * CRIAR OU LOCALIZAR PASTA
 ******************************************************/

/**
 * Obtém uma pasta pelo nome ou cria caso não exista.
 * @param {string} nomePasta
 * @return {Folder}
 */
function obterOuCriarPasta_(nomePasta) {
  const pastas = DriveApp.getFoldersByName(nomePasta);

  if (pastas.hasNext()) {
    return pastas.next();
  }

  return DriveApp.createFolder(nomePasta);
}

/******************************************************
 * SALVAR ANEXOS
 ******************************************************/

/**
 * Salva os anexos em uma subpasta específica da súmula.
 * @param {Array<Object>} anexos
 * @param {string} id
 * @return {string}
 */
function salvarAnexos_(anexos, id) {
  if (!anexos || anexos.length === 0) {
    return '';
  }

  const pastaPrincipal = obterOuCriarPasta_(CONFIG.pastaAnexos);
  const pasta = pastaPrincipal.createFolder('SUMULA_' + id);

  anexos.forEach(function (arq) {
    const blob = Utilities.newBlob(
      Utilities.base64Decode(arq.conteudo),
      arq.tipo,
      arq.nome
    );

    pasta.createFile(blob);
  });

  return pasta.getUrl();
}
