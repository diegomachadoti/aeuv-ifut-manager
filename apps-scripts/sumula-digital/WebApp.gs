/******************************************************
 * SUMULA DIGITAL AEUV
 * Projeto independente
 ******************************************************/

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
    equipes: CONFIG.equipes,
    logoUrl: obterLogo_(),
    limite: CONFIG.maxEnvolvidos
  };

  return template
    .evaluate()
    .setTitle('Súmula Digital AEUV')
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
    const arquivoTxt = gerarTxt_(payload, id, agora);
    const arquivoPdf = gerarPdf_(payload, id, agora);

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
 * @return {{url: string}}
 */
function gerarPdf_(payload, id, data) {
  const doc = DocumentApp.create('SUMULA_' + id);
  const corpo = doc.getBody();

  corpo.setMarginTop(50);
  corpo.setMarginBottom(50);
  corpo.setMarginLeft(50);
  corpo.setMarginRight(50);

  const logo = DriveApp.getFileById('1FZ5UyGPfciIp23D8d7XYJnY9vhFmSAhV').getBlob();
  const imagemLogo = corpo.insertImage(0, logo);

  imagemLogo.setWidth(90);
  imagemLogo.setHeight(90);

  const titulo = corpo.appendParagraph('ASSOCIAÇÃO AEUV');
  titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  titulo.setHeading(DocumentApp.ParagraphHeading.HEADING1);

  const subtitulo = corpo.appendParagraph('SÚMULA DIGITAL OFICIAL DE PARTIDA');
  subtitulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  corpo.appendParagraph('');

  const dados = corpo.appendTable([
    ['PROTOCOLO', id],
    [
      'DATA DE GERAÇÃO',
      Utilities.formatDate(data, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')
    ],
    ['STATUS', 'Documento oficial registrado']
  ]);
  dados.setBorderWidth(1);

  corpo.appendParagraph('');

  corpo
    .appendParagraph('DADOS DA PARTIDA')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const partida = corpo.appendTable([
    ['Árbitro', payload.arbitro],
    ['Documento', payload.documento],
    ['Confronto', payload.time1 + ' x ' + payload.time2],
    ['Horário', payload.horaJogo],
    ['Data', payload.dataJogo]
  ]);
  partida.setBorderWidth(1);

  corpo.appendParagraph('');
  corpo
    .appendParagraph('DOS FATOS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  corpo.appendParagraph(payload.fatos);

  corpo.appendParagraph('');
  corpo
    .appendParagraph('ENVOLVIDOS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  corpo
    .appendParagraph('ANEXOS E EVIDÊNCIAS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  corpo.appendParagraph(
    payload.anexos && payload.anexos.length
      ? 'Quantidade de arquivos anexados: ' + payload.anexos.length
      : 'Nenhum arquivo anexado.'
  );

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

  if (tabela.length === 1) {
    tabela.push(['-', '-', '-', 'Nenhum envolvido informado', '-']);
  }

  const tabEnv = corpo.appendTable(tabela);
  tabEnv.setBorderWidth(1);

  corpo.appendParagraph('');
  corpo
    .appendParagraph('DECLARAÇÃO DO ÁRBITRO')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  corpo.appendParagraph(
    'Declaro, para os devidos fins, que todas as informações registradas nesta súmula correspondem aos acontecimentos observados durante a partida, assumindo responsabilidade pela veracidade dos dados informados.'
  );

  corpo.appendParagraph('');
  corpo
    .appendParagraph('ASSINATURA DO ÁRBITRO')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

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

  if (p.envolvidos.length > CONFIG.maxEnvolvidos) {
    throw new Error('Máximo permitido: 30 envolvidos.');
  }

  (p.envolvidos || []).forEach(function (e, i) {
    // Ignora linhas vazias da tabela.
    if (!e.nome || !e.nome.trim()) {
      return;
    }

    if (!CONFIG.equipes.includes(e.equipe)) {
      throw new Error('Selecione a equipe do envolvido na linha ' + (i + 1) + '.');
    }

    if (!['Atleta', 'Comissão'].includes(e.tipo)) {
      throw new Error('Informe se o envolvido é atleta ou comissão na linha ' + (i + 1) + '.');
    }
  });

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
 * @return {{nome: string, url: string, conteudo: string}}
 */
function gerarTxt_(payload, id, data) {
  const linhas = [];

  linhas.push('ASSOCIAÇÃO AEUV');
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
