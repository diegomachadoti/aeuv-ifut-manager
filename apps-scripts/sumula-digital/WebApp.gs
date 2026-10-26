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

  // Icone da aba do navegador. Precisa ser uma URL publica terminada na extensao da imagem;
  // links do Drive (thumbnail?id=...) nao funcionam aqui.
  faviconUrl: 'https://raw.githubusercontent.com/diegomachadoti/aeuv-ifut-manager/master/assets/logo-aeuv.png',

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
 * @param {Object=} e Parâmetros da requisição HTTP.
 * @return {HtmlOutput}
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  const forcarRecache = !!(e && e.parameter && (e.parameter.recache === '1' || e.parameter.limparCache === '1' || e.parameter.t));

  template.config = {
    associacao: ASSOCIACAO_NOME,
    equipes: equipesConfiguradas_(forcarRecache),
    logoUrl: obterLogo_(),
    limite: CONFIG.maxEnvolvidos
  };

  return template
    .evaluate()
    .setTitle('AEUV - Relatório de Súmula')
    .setFaviconUrl(CONFIG.faviconUrl)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Equipes participantes. Fonte unica: le o arquivo "equipes.json" que o
 * sistema interno publica na pasta "AEUV - Automacao" ao gravar a lista
 * pela tela "Equipes". Assim um time novo entra num lugar so e aparece
 * aqui sem publicar nova versao deste formulario.
 *
 * Guarda o resultado em cache por 30 segundos para evitar excesso de
 * chamadas ao Drive e refletir alteracoes quase em tempo real.
 * Suporta parametro ?recache=1 para forcar recarregamento imediato.
 * @param {boolean=} forcarRecache Quando true, limpa o cache e rele do Drive.
 * @return {Array<string>}
 */
function equipesConfiguradas_(forcarRecache) {
  const cache = CacheService.getScriptCache();

  if (forcarRecache) {
    try {
      cache.remove('EQUIPES_CONFIGURADAS');
    } catch (e) {
      // Ignora erro ao limpar cache.
    }
  } else {
    const guardado = cache.get('EQUIPES_CONFIGURADAS');

    if (guardado) {
      try {
        return JSON.parse(guardado);
      } catch (e) {
        // Cache corrompido: segue para ler o arquivo de novo.
      }
    }
  }

  try {
    const raiz = DriveApp.getFolderById('1uDUmgEjeISQ1W3Uc5hcUc25pgXDvVhs3');
    const arquivos = raiz.getFilesByName('equipes.json');
    let arquivoMaisRecente = null;
    let dataMaisRecente = 0;

    while (arquivos.hasNext()) {
      const arq = arquivos.next();
      if (arq.isTrashed()) {
        continue;
      }
      const dataAtualizacao = arq.getLastUpdated().getTime();
      if (!arquivoMaisRecente || dataAtualizacao >= dataMaisRecente) {
        arquivoMaisRecente = arq;
        dataMaisRecente = dataAtualizacao;
      }
    }

    if (arquivoMaisRecente) {
      const dados = JSON.parse(arquivoMaisRecente.getBlob().getDataAsString('UTF-8'));

      if (dados && Array.isArray(dados.equipes) && dados.equipes.length) {
        // Cache reduzido para 30 segundos: reflete novos times quase
        // imediatamente sem sobrecarregar a cota do Drive.
        cache.put('EQUIPES_CONFIGURADAS', JSON.stringify(dados.equipes), 30);

        return dados.equipes;
      }
    }
  } catch (erro) {
    console.warn('equipes.json indisponivel, usando a lista fixa: ' + erro);
  }

  return CONFIG.equipes;
}

/**
 * Utilitario para executar direto pelo editor do Apps Script: limpa o cache
 * e exibe o conteudo atual lido do equipes.json no Drive.
 */
function testarLeituraEquipes() {
  const equipes = equipesConfiguradas_(true);
  Logger.log('Total de equipes lidas: ' + equipes.length);
  Logger.log('Lista: ' + JSON.stringify(equipes));
  return equipes;
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
  const geradaEm = corpo.appendParagraph(
    'Gerada em ' + Utilities.formatDate(data, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')
  );
  geradaEm.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  geradaEm.editAsText().setForegroundColor('#475467').setFontSize(9).setBold(false);

  // Linha fina fechando o cabeçalho, para separar do corpo do documento.
  adicionarLinhaDivisoriaPdf_(corpo);

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
  adicionarRelatoPdf_(corpo, payload.fatos);

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
  const resumoAnexos = corpo.appendParagraph(
    anexos.length
      ? 'Arquivos anexados: ' + anexos.length
      : 'Nenhum arquivo anexado.'
  );
  resumoAnexos.editAsText().setForegroundColor('#172033').setFontSize(10);
  anexos.forEach(function (anexo) {
    corpo.appendListItem(anexo.nome).editAsText().setForegroundColor('#172033').setFontSize(10);
  });
  if (anexos.length && pastaAnexosUrl) {
    const linkPasta = corpo.appendParagraph('Abrir pasta de evidências no Google Drive');
    linkPasta.editAsText()
      .setLinkUrl(0, linkPasta.getText().length - 1, pastaAnexosUrl)
      .setForegroundColor('#1155cc')
      .setFontSize(10)
      .setUnderline(true);
  }

  corpo.appendParagraph('');
  adicionarTituloSecaoPdf_(corpo, 'DECLARAÇÃO DO ÁRBITRO');

  const declaracao = corpo.appendParagraph(
    'Declaro, para os devidos fins, que todas as informações registradas nesta súmula correspondem aos acontecimentos observados durante a partida, assumindo responsabilidade pela veracidade dos dados informados.'
  );
  declaracao.setSpacingAfter(6);
  declaracao.setLineSpacing(1.3);
  try {
    declaracao.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  } catch (e) {
    // JUSTIFY pode não ser aceito em alguns ambientes; mantém o padrão.
  }
  declaracao.editAsText().setForegroundColor('#172033').setFontSize(10);

  corpo.appendParagraph('');
  adicionarTituloSecaoPdf_(corpo, 'ASSINATURA DO ÁRBITRO');

  // Espaço antes da linha de assinatura, para o bloco respirar.
  corpo.appendParagraph('').setSpacingAfter(2);

  if (payload.assinatura) {
    const base64Assinatura = payload.assinatura.split(',')[1];
    const blobAssinatura = Utilities.newBlob(
      Utilities.base64Decode(base64Assinatura),
      'image/png',
      'assinatura.png'
    );

    const paragrafoAssinatura = corpo.appendParagraph('');
    paragrafoAssinatura.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    paragrafoAssinatura.setSpacingAfter(0);

    const imagemAssinatura = paragrafoAssinatura.appendInlineImage(blobAssinatura);
    imagemAssinatura.setWidth(220);
    imagemAssinatura.setHeight(60);
  }

  // Linha de assinatura (traço), sob a imagem ou no lugar dela.
  const linhaAssinatura = corpo.appendParagraph('______________________________');
  linhaAssinatura.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  linhaAssinatura.setSpacingBefore(0).setSpacingAfter(2);
  linhaAssinatura.editAsText().setForegroundColor('#98a2b3').setFontSize(11);

  const nomeAssinatura = corpo.appendParagraph(payload.arbitro);
  nomeAssinatura.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  nomeAssinatura.setSpacingAfter(0);
  nomeAssinatura.editAsText().setForegroundColor('#14213d').setFontSize(11).setBold(true);

  const docArbitro = corpo.appendParagraph(
    'Árbitro responsável pela súmula' + (payload.documento ? '  ·  Doc.: ' + payload.documento : '')
  );
  docArbitro.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  docArbitro.editAsText().setForegroundColor('#475467').setFontSize(9).setBold(false);

  // Rodapé: linha fina acima e texto discreto.
  corpo.appendParagraph('');
  adicionarLinhaDivisoriaPdf_(corpo);
  const rodape = corpo.appendParagraph(
    'Documento gerado eletronicamente pelo Sistema de Súmula Digital AEUV  ·  Protocolo: ' + id
  );
  rodape.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  rodape.editAsText().setForegroundColor('#98a2b3').setFontSize(8).setBold(false);

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
      'RELATÓRIO DE EXPULSÃO',
      'Data: 25 de outubro de 2026',
      'Local: CEJOR – Uberlândia/MG',
      'Competição: Liga União 2026',
      'Atleta expulso: Romão Pereira da Silva, número 22',
      '',
      'Descrição da Ocorrência:',
      'Aos 42 minutos do segundo tempo da partida realizada no CEJOR, válida pela competição Liga União 2026, o atleta Romão Pereira da Silva, da equipe Pequis FC, foi expulso de campo de forma direta.',
      'A expulsão ocorreu em razão de jogo brusco grave fora da disputa da bola. O atleta atingiu o adversário com uso de força excessiva, em lance sem possibilidade de disputa da bola, colocando em risco a integridade física do oponente.',
      '',
      'Observações:',
      'Nada mais digno de nota após a expulsão. O presente relatório é lavrado para os devidos fins disciplinares junto à organização da Liga União 2026.'
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
  // Faixa de seção: uma tabela de 1 célula com fundo azul claro e uma barra
  // azul à esquerda (borda), para cada seção virar um bloco bem visível.
  const faixa = corpo.appendTable([[texto]]);
  faixa.setBorderWidth(0);

  const celula = faixa.getCell(0, 0);
  celula.setBackgroundColor('#eef2f9');
  celula.setPaddingTop(5);
  celula.setPaddingBottom(5);
  celula.setPaddingLeft(9);
  celula.setPaddingRight(9);
  celula.editAsText()
    .setForegroundColor('#14213d')
    .setFontSize(11)
    .setBold(true);

  // A faixa (tabela) herda a borda padrão de tabela do Docs; deixa a borda
  // da cor do fundo da faixa para não aparecer o contorno de tabela.
  faixa.setBorderColor('#eef2f9');

  // Espaço interno do parágrafo da faixa.
  const paragrafoFaixa = celula.getChild(0).asParagraph();
  paragrafoFaixa.setSpacingBefore(0).setSpacingAfter(0);

  // Pequeno respiro após a faixa, antes do conteúdo da seção.
  corpo.appendParagraph('').setSpacingAfter(4);
}

/**
 * Linha horizontal fina (divisória) entre blocos do documento.
 * @param {GoogleAppsScript.Document.Body} corpo
 */
function adicionarLinhaDivisoriaPdf_(corpo) {
  const paragrafo = corpo.appendParagraph('');
  paragrafo.setSpacingBefore(6).setSpacingAfter(6);
  paragrafo.appendHorizontalRule();
}

/**
 * Renderiza o relato da arbitragem (texto livre do árbitro) de forma legível.
 *
 * O relato antigo quebrava cada linha num parágrafo próprio com espaçamento,
 * deixando o texto picado, com buracos (linhas em branco viravam parágrafos
 * vazios) e cortes feios entre páginas. Aqui o texto é tratado como blocos:
 *  - linhas consecutivas viram UM parágrafo (quebra de parágrafo só em linha
 *    em branco), com texto justificado e espaçamento confortável;
 *  - uma linha curta isolada que termine em ":" vira subtítulo (ex.: cabeçalhos
 *    que o árbitro escreve, como "Descrição da Ocorrência:");
 *  - uma linha no formato "Rótulo: valor" (rótulo curto) destaca o rótulo em
 *    negrito, deixando os dados (Data, Local, Competição, etc.) mais claros.
 * @param {GoogleAppsScript.Document.Body} corpo
 * @param {string} texto  Conteúdo do campo "fatos".
 */
function adicionarRelatoPdf_(corpo, texto) {
  const linhas = String(texto || '').replace(/\r\n/g, '\n').split('\n');

  // Agrupa linhas em blocos (parágrafos), separados por linha(s) em branco.
  const blocos = [];
  let atual = [];
  linhas.forEach(function (linha) {
    if (String(linha).trim() === '') {
      if (atual.length) { blocos.push(atual); atual = []; }
    } else {
      atual.push(String(linha).trim());
    }
  });
  if (atual.length) blocos.push(atual);

  if (!blocos.length) {
    corpo.appendParagraph('Nenhum relato informado.').editAsText().setFontSize(10);
    return;
  }

  // Rótulos curtos no formato "Rótulo: valor" (ex.: Data: 25/10/2026).
  const RE_ROTULO = /^([A-Za-zÀ-ÿ][\wÀ-ÿ .º°]{1,28}?):\s+(.+)$/;

  blocos.forEach(function (bloco) {
    // Bloco de uma linha só: pode ser subtítulo ("Algo:") ou "Rótulo: valor".
    if (bloco.length === 1) {
      const linha = bloco[0];

      // Subtítulo: linha curta terminada em ":" e sem valor depois.
      if (/:\s*$/.test(linha) && linha.length <= 60) {
        const sub = corpo.appendParagraph(linha.replace(/:\s*$/, ''));
        sub.setSpacingBefore(8).setSpacingAfter(3);
        sub.editAsText().setForegroundColor('#14213d').setFontSize(10.5).setBold(true);
        return;
      }

      const campo = linha.match(RE_ROTULO);
      if (campo) {
        const paragrafo = corpo.appendParagraph('');
        paragrafo.setSpacingAfter(3);
        const t = paragrafo.editAsText();
        t.appendText(campo[1] + ': ').setBold(true).setForegroundColor('#344054').setFontSize(10);
        t.appendText(campo[2]).setBold(false).setForegroundColor('#172033').setFontSize(10);
        return;
      }
    }

    // Demais blocos: texto corrido, justificado, com as linhas unidas.
    const paragrafo = corpo.appendParagraph(bloco.join(' '));
    paragrafo.setSpacingAfter(8);
    paragrafo.setLineSpacing(1.3);
    try {
      paragrafo.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
    } catch (e) {
      // Alguns ambientes não aceitam JUSTIFY; mantém o alinhamento padrão.
    }
    paragrafo.editAsText().setForegroundColor('#172033').setFontSize(10);
  });
}

function estilizarTabelaPdf_(tabela, temCabecalho) {
  tabela.setBorderColor('#d8deea');
  tabela.setBorderWidth(0.75);

  for (let linha = 0; linha < tabela.getNumRows(); linha++) {
    const cabecalho = temCabecalho && linha === 0;
    const linhaTabela = tabela.getRow(linha);

    // Zebra: nas tabelas com cabeçalho (ex.: Envolvidos), as linhas de dados
    // alternam branco/cinza-claro para facilitar a leitura entre colunas.
    let fundo = '#ffffff';
    if (cabecalho) {
      fundo = '#14213d';
    } else if (temCabecalho && (linha % 2 === 0)) {
      fundo = '#f4f6fb';
    }

    for (let coluna = 0; coluna < linhaTabela.getNumCells(); coluna++) {
      const celula = linhaTabela.getCell(coluna);
      celula.setPaddingTop(6);
      celula.setPaddingBottom(6);
      celula.setPaddingLeft(7);
      celula.setPaddingRight(7);
      celula.setBackgroundColor(fundo);
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

  const equipesPermitidas = equipesConfiguradas_();

  if (
    !equipesPermitidas.includes(p.time1) ||
    !equipesPermitidas.includes(p.time2)
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
