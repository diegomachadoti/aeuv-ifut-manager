/**
 * FORMULARIO EM TABELA - INSCRICAO, REMOCAO E PORTABILIDADE
 *
 * Adicione este arquivo ao MESMO projeto do Apps Script usado anteriormente.
 * Depois, adicione o arquivo Index.html e publique como aplicativo da Web.
 */

const WEBAPP_CONFIG = {
  spreadsheetId: '1i0-gA6mfH4W_loy3ELqtn3uZg7dL2GzZeBLdrgPHBns',
  spreadsheetName: 'AEUV - Respostas - Inscricao, Remocao e Portabilidade',
  sheetName: 'Inscricoes_Web',
  maxPessoas: 30,
  cnpjPix: '58.736.118/0001-62',
  valorPorAtleta: 50,
  competicoes: [
    'COPA AMERICA',
    'SUPER LIGA UNIÃO',
    'COPA METROPOLITANA',
    'COPA PREMIER',
  ],
  competicoesPortabilidade: [
    'COPA METROPOLITANA',
    '4° SUPER LIGA UNIAO 99 BET 2023',
    '2° COPA METROPOLITANA 2023',
    'RECOPA 2023',
    'SUPER LIGA UNIÃO 2024',
    '4º COPA METROPOLITANA 2025',
    '6º SUPER LIGA UNIÃO 2025',
    '5º COPA METROPOLITANA',
    '3º COPA PREMIER 2026',
    '2º COPA AMERICA 2026',
    '7º SUPER LIGA UNIÃO 2026',
  ],
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
  ],
  pastaComprovantes: 'Comprovantes PIX - Inscricoes de Atletas',
  pastaArquivosTxt: 'Arquivos TXT - Inscricoes de Atletas',
  maxArquivoBytes: 5 * 1024 * 1024,
  logoFileId: '1FZ5UyGPfciIp23D8d7XYJnY9vhFmSAhV',
  logoUrl: 'https://drive.google.com/thumbnail?id=1FZ5UyGPfciIp23D8d7XYJnY9vhFmSAhV&sz=w500',
  regulamentoUrl: 'https://campeonato.ifut.com.br/c/7-super-liga-uniao-2026', // Cole aqui o link do regulamento da competicao.
};

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.config = {
    maxPessoas: WEBAPP_CONFIG.maxPessoas,
    cnpjPix: WEBAPP_CONFIG.cnpjPix,
    valorPorAtleta: WEBAPP_CONFIG.valorPorAtleta,
    competicoes: WEBAPP_CONFIG.competicoes,
    equipes: WEBAPP_CONFIG.equipes,
    logoUrl: obterLogoDataUrl_(),
    regulamentoUrl: WEBAPP_CONFIG.regulamentoUrl,
  };

  return template
    .evaluate()
    .setTitle('Inscricao, Remocao e Portabilidade')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Incorpora a logo no proprio HTML. Assim, o navegador do visitante nao
 * precisa ter permissao para acessar o arquivo original no Google Drive.
 */
function obterLogoDataUrl_() {
  try {
    const blob = DriveApp.getFileById(WEBAPP_CONFIG.logoFileId).getBlob();
    const tipo = blob.getContentType() || 'image/png';
    return 'data:' + tipo + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (erro) {
    console.warn('Nao foi possivel incorporar a logo. Usando o link alternativo.');
    return WEBAPP_CONFIG.logoUrl;
  }
}

function salvarInscricao(payload) {
  validarEnvio_(payload);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const planilha = obterPlanilha_();
    const aba = obterAba_(planilha);
    const protocolo = gerarProtocolo_();
    const agora = new Date();
    const comprovanteUrl = salvarComprovante_(payload.comprovante, protocolo);
    const arquivoTxt = gerarArquivoTxt_(payload, protocolo, agora, comprovanteUrl);

    const linhas = payload.pessoas.map(function (pessoa, indice) {
      return [
        agora,
        protocolo,
        limparTexto_(payload.competicao, 150),
        limparTexto_(payload.equipe, 150),
        limparTexto_(payload.responsavel, 150),
        limparTexto_(payload.telefone, 30),
        indice + 1,
        limparTexto_(pessoa.acao, 30),
        limparTexto_(pessoa.tipo, 40),
        limparTexto_(pessoa.nome, 150),
        limparTexto_(pessoa.nascimento, 20),
        somenteDigitos_(pessoa.cpf || ''),
        pessoa.acao === 'Portabilidade'
          ? limparTexto_(pessoa.competicaoAnterior, 150)
          : '',
        comprovanteUrl,
        'Pagamento declarado',
        'Termo medico aceito',
        'Regulamento aceito',
        'Autorizacao declarada',
        arquivoTxt.url,
      ];
    });

    aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length)
      .setValues(linhas);

    return {
      sucesso: true,
      protocolo: protocolo,
      quantidade: linhas.length,
      arquivoTxtNome: arquivoTxt.nome,
      arquivoTxtConteudo: arquivoTxt.conteudo,
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Execute esta funcao UMA VEZ pelo editor, usando a conta proprietaria.
 * Ela solicita as permissoes necessarias e grava o ID correto da planilha nas
 * propriedades do projeto. Os visitantes do formulario nao precisam autorizar.
 */
function prepararAplicativo() {
  const planilha = localizarPlanilhaDoProprietario_() ||
    SpreadsheetApp.create(WEBAPP_CONFIG.spreadsheetName);

  const pastaComprovantes = obterOuCriarPasta_(WEBAPP_CONFIG.pastaComprovantes);
  const pastaArquivosTxt = obterOuCriarPasta_(WEBAPP_CONFIG.pastaArquivosTxt);

  PropertiesService.getScriptProperties()
    .setProperties({
      PLANILHA_RESPOSTAS_ID: planilha.getId(),
      PASTA_COMPROVANTES_ID: pastaComprovantes.getId(),
      PASTA_ARQUIVOS_TXT_ID: pastaArquivosTxt.getId(),
    });

  obterAba_(planilha);

  console.log('CONFIGURACAO CONCLUIDA');
  console.log('PLANILHA: ' + planilha.getUrl());
  console.log('PASTA DE COMPROVANTES: ' + pastaComprovantes.getUrl());
  console.log('PASTA DE ARQUIVOS TXT: ' + pastaArquivosTxt.getUrl());
  console.log('Agora publique uma nova versao executando o app como voce.');

  return planilha.getUrl();
}

/**
 * Durante os envios, abre somente a planilha previamente configurada.
 * Nao pesquisa arquivos no Drive do visitante.
 */
function obterPlanilha_() {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty('PLANILHA_RESPOSTAS_ID') ||
    WEBAPP_CONFIG.spreadsheetId;

  if (!id) {
    throw new Error(
      'Aplicativo ainda nao configurado. O administrador deve executar prepararAplicativo.'
    );
  }

  try {
    return SpreadsheetApp.openById(id);
  } catch (erro) {
    throw new Error(
      'Planilha de respostas indisponivel. O administrador deve executar prepararAplicativo novamente.'
    );
  }
}

/**
 * Usada somente pelo proprietario durante a configuracao inicial.
 * Havendo planilhas com o mesmo nome, escolhe a mais recente.
 */
function localizarPlanilhaDoProprietario_() {
  if (WEBAPP_CONFIG.spreadsheetId) {
    try {
      return SpreadsheetApp.openById(WEBAPP_CONFIG.spreadsheetId);
    } catch (erro) {
      console.warn('ID fixo da planilha invalido ou inacessivel. Procurando pelo nome.');
    }
  }

  const arquivos = DriveApp.getFilesByName(WEBAPP_CONFIG.spreadsheetName);
  let planilhaEncontrada = null;

  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    if (arquivo.getMimeType() !== MimeType.GOOGLE_SHEETS) continue;

    if (
      !planilhaEncontrada ||
      arquivo.getLastUpdated().getTime() > planilhaEncontrada.getLastUpdated().getTime()
    ) {
      planilhaEncontrada = arquivo;
    }
  }

  if (planilhaEncontrada) {
    return SpreadsheetApp.openById(planilhaEncontrada.getId());
  }

  return null;
}

function obterAba_(planilha) {
  let aba = planilha.getSheetByName(WEBAPP_CONFIG.sheetName);
  if (!aba) aba = planilha.insertSheet(WEBAPP_CONFIG.sheetName);

  if (aba.getLastRow() > 0) {
    const cabecalhoAntigo = aba.getRange(1, 14, 1, 2).getValues()[0];
    if (cabecalhoAntigo[0] === 'Pagamento' && cabecalhoAntigo[1] === 'Autorizacao') {
      aba.insertColumnBefore(14);
      aba.insertColumnsBefore(16, 2);
    }
  }

  const cabecalho = [
    'Data/hora',
    'Protocolo',
    'Competicao',
    'Equipe',
    'Responsavel',
    'Telefone/WhatsApp',
    'Numero',
    'Acao',
    'Tipo',
    'Nome completo',
    'Data de nascimento',
    'CPF',
    'Competicao anterior',
    'Comprovante PIX',
    'Pagamento',
    'Termo medico',
    'Regulamento',
    'Autorizacao',
    'Arquivo TXT',
  ];

  aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
  aba.getRange(1, 1, 1, cabecalho.length)
    .setFontWeight('bold')
    .setBackground('#14213d')
    .setFontColor('#ffffff');
  aba.setFrozenRows(1);
  aba.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  aba.showColumns(13);
  if (aba.getLastRow() <= 1) aba.autoResizeColumns(1, cabecalho.length);
  return aba;
}

function validarEnvio_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Dados do formulario nao recebidos.');
  }

  ['competicao', 'equipe', 'responsavel', 'telefone'].forEach(function (campo) {
    if (!String(payload[campo] || '').trim()) {
      throw new Error('Preencha todos os dados principais.');
    }
  });

  if (!WEBAPP_CONFIG.competicoes.includes(payload.competicao)) {
    throw new Error('Selecione uma competicao valida.');
  }
  if (!WEBAPP_CONFIG.equipes.includes(payload.equipe)) {
    throw new Error('Selecione uma equipe valida.');
  }

  if (somenteDigitos_(payload.telefone).length !== 11) {
    throw new Error('Informe um telefone ou WhatsApp com DDD e 11 digitos.');
  }

  if (
    payload.pagamento !== true ||
    payload.termoMedico !== true ||
    payload.regulamento !== true ||
    payload.autorizacao !== true
  ) {
    throw new Error('Aceite todas as confirmacoes obrigatorias para continuar.');
  }

  validarComprovante_(payload.comprovante);

  if (!Array.isArray(payload.pessoas) || payload.pessoas.length < 1) {
    throw new Error('Adicione pelo menos uma pessoa.');
  }

  if (payload.pessoas.length > WEBAPP_CONFIG.maxPessoas) {
    throw new Error('O limite e de ' + WEBAPP_CONFIG.maxPessoas + ' pessoas por envio.');
  }

  const acoes = ['Inclusao', 'Remocao', 'Portabilidade'];
  const tipos = ['Atleta', 'Comissao tecnica'];

  payload.pessoas.forEach(function (pessoa, indice) {
    const numero = indice + 1;
    const inclusao = pessoa && pessoa.acao === 'Inclusao';
    const portabilidade = pessoa && pessoa.acao === 'Portabilidade';
    if (!pessoa || !acoes.includes(pessoa.acao)) {
      throw new Error('Selecione uma acao valida na linha ' + numero + '.');
    }
    if (!tipos.includes(pessoa.tipo)) {
      throw new Error('Selecione um tipo valido na linha ' + numero + '.');
    }
    if (!String(pessoa.nome || '').trim()) {
      throw new Error('Informe o nome completo na linha ' + numero + '.');
    }
    if (
      portabilidade &&
      !WEBAPP_CONFIG.competicoesPortabilidade.includes(pessoa.competicaoAnterior)
    ) {
      throw new Error('Selecione a competicao anterior na linha ' + numero + '.');
    }
    const nascimento = String(pessoa.nascimento || '').trim();
    if (inclusao && !nascimento) {
      throw new Error('Informe a data de nascimento na linha ' + numero + '.');
    }
    if (nascimento) {
      validarDataNascimento_(nascimento, numero);
    }
    const cpf = somenteDigitos_(pessoa.cpf || '');
    if (inclusao && cpf.length !== 11) {
      throw new Error('Informe um CPF com 11 digitos na linha ' + numero + '.');
    }
    if (!inclusao && cpf && cpf.length !== 11) {
      throw new Error('O CPF informado na linha ' + numero + ' deve ter 11 digitos.');
    }
  });
}

function validarDataNascimento_(valor, numeroLinha) {
  const data = String(valor || '').trim();
  const partes = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!partes) {
    throw new Error('Informe uma data de nascimento valida na linha ' + numeroLinha + '.');
  }

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const dataVerificada = new Date(Date.UTC(ano, mes - 1, dia));
  const dataExiste =
    dataVerificada.getUTCFullYear() === ano &&
    dataVerificada.getUTCMonth() === mes - 1 &&
    dataVerificada.getUTCDate() === dia;
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

  if (!dataExiste || data < '1900-01-01' || data > hoje) {
    throw new Error(
      'A data de nascimento da linha ' + numeroLinha +
      ' deve estar entre 01/01/1900 e a data atual.'
    );
  }
}

function validarComprovante_(comprovante) {
  if (!comprovante || !comprovante.nome || !comprovante.base64) {
    throw new Error('Anexe o comprovante de pagamento do Pix.');
  }

  const tiposPermitidos = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  const tipo = normalizarTipoArquivo_(comprovante);
  if (!tiposPermitidos.includes(tipo)) {
    throw new Error('O comprovante deve ser PDF, JPG, PNG ou WEBP.');
  }

  if (Number(comprovante.tamanho || 0) > WEBAPP_CONFIG.maxArquivoBytes) {
    throw new Error('O comprovante deve ter no maximo 5 MB.');
  }
}

function salvarComprovante_(comprovante, protocolo) {
  validarComprovante_(comprovante);
  const bytes = Utilities.base64Decode(comprovante.base64);
  if (bytes.length > WEBAPP_CONFIG.maxArquivoBytes) {
    throw new Error('O comprovante deve ter no maximo 5 MB.');
  }

  const pasta = obterPastaConfigurada_(
    'PASTA_COMPROVANTES_ID',
    WEBAPP_CONFIG.pastaComprovantes
  );
  const nomeOriginal = String(comprovante.nome).replace(/[^a-zA-Z0-9._-]/g, '_');
  const nomeFinal = protocolo + '_' + nomeOriginal.substring(0, 120);
  const blob = Utilities.newBlob(bytes, normalizarTipoArquivo_(comprovante), nomeFinal);
  return pasta.createFile(blob).getUrl();
}

function normalizarTipoArquivo_(comprovante) {
  if (comprovante.tipo) return comprovante.tipo;
  const extensao = String(comprovante.nome || '').toLowerCase().split('.').pop();
  const tiposPorExtensao = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return tiposPorExtensao[extensao] || '';
}

function gerarArquivoTxt_(payload, protocolo, dataHora, comprovanteUrl) {
  const dataFormatada = Utilities.formatDate(
    dataHora,
    'America/Sao_Paulo',
    'dd/MM/yyyy HH:mm'
  );
  const dataArquivo = Utilities.formatDate(
    dataHora,
    'America/Sao_Paulo',
    'yyyy-MM-dd-HH-mm-ss'
  );

  const timestampArquivo = dataHora.getTime();

  const linhas = [
    'FORMULARIO DA AEUV',
    'INSCRICAO, REMOCAO E PORTABILIDADE',
    '',
    'PROTOCOLO: ' + protocolo,
    'DATA/HORA: ' + dataFormatada,
    'COMPETICAO: ' + limparTexto_(payload.competicao, 150),
    'EQUIPE: ' + limparTexto_(payload.equipe, 150),
    'RESPONSAVEL: ' + limparTexto_(payload.responsavel, 150),
    'TELEFONE/WHATSAPP: ' + limparTexto_(payload.telefone, 30),
    'COMPROVANTE PIX: ' + comprovanteUrl,
    '',
    'CONFIRMACOES',
    'PAGAMENTO DO PIX: SIM',
    'TERMO DE RESPONSABILIDADE MEDICA: ACEITO',
    'REGULAMENTO DA COMPETICAO: ACEITO',
    'DECLARACAO E AUTORIZACAO: ACEITA',
    '',
    'ATLETAS E COMISSAO',
    '-------------------',
  ];

  payload.pessoas.forEach(function (pessoa, indice) {
    linhas.push('');
    linhas.push('REGISTRO ' + String(indice + 1).padStart(2, '0'));
    linhas.push('ACAO: ' + limparTexto_(pessoa.acao, 30));
    linhas.push('TIPO: ' + limparTexto_(pessoa.tipo, 40));
    linhas.push('NOME COMPLETO: ' + limparTexto_(pessoa.nome, 150));
    linhas.push('DATA DE NASCIMENTO: ' + (pessoa.nascimento ? String(pessoa.nascimento).split('-').reverse().join('-'): 'NAO NECESSARIO'));
    linhas.push('CPF: ' + (somenteDigitos_(pessoa.cpf || '') || 'NAO NECESSARIO'));
    linhas.push(
      'COMPETICAO ANTERIOR: ' +
      (pessoa.acao === 'Portabilidade'
        ? limparTexto_(pessoa.competicaoAnterior, 150)
        : 'NAO NECESSARIO')
    );
  });

  const conteudo = linhas.join('\r\n') + '\r\n';
  const nomeEquipe = nomeSeguroArquivo_(payload.equipe);
  const nome = nomeEquipe + '-' + dataArquivo + '-' + timestampArquivo + '.txt';
  const pasta = obterPastaConfigurada_(
    'PASTA_ARQUIVOS_TXT_ID',
    WEBAPP_CONFIG.pastaArquivosTxt
  );
  const arquivo = pasta.createFile(Utilities.newBlob(conteudo, 'text/plain', nome));

  return {
    nome: nome,
    conteudo: conteudo,
    url: arquivo.getUrl(),
  };
}

function obterPastaConfigurada_(chavePropriedade, nomePasta) {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty(chavePropriedade);

  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (erro) {
      console.warn('Pasta configurada indisponivel: ' + nomePasta);
    }
  }

  const pasta = obterOuCriarPasta_(nomePasta);
  propriedades.setProperty(chavePropriedade, pasta.getId());
  return pasta;
}

function obterOuCriarPasta_(nomePasta) {
  const pastas = DriveApp.getFoldersByName(nomePasta);
  return pastas.hasNext() ? pastas.next() : DriveApp.createFolder(nomePasta);
}

function nomeSeguroArquivo_(valor) {
  const nome = String(valor || 'EQUIPE').trim().replace(/[\\/:*?"<>|]/g, '-');
  return nome.substring(0, 100) || 'EQUIPE';
}

function formatarDataNascimentoArquivo_(valor) {
  const data = String(valor || '').trim();

  if (!data) {
    return 'NAO NECESSARIO';
  }

  const formatoIso = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (formatoIso) {
    return formatoIso[3] + '-' + formatoIso[2] + '-' + formatoIso[1];
  }

  const formatoBrasileiro = data.match(
    /^(\d{2})[\/-](\d{2})[\/-](\d{4})$/
  );

  if (formatoBrasileiro) {
    return (
      formatoBrasileiro[1] +
      '-' +
      formatoBrasileiro[2] +
      '-' +
      formatoBrasileiro[3]
    );
  }

  return data;
}

function limparTexto_(valor, limite) {
  let texto = String(valor == null ? '' : valor).trim();
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
  return texto.substring(0, limite);
}

function somenteDigitos_(valor) {
  return String(valor == null ? '' : valor).replace(/\D/g, '').substring(0, 11);
}

function gerarProtocolo_() {
  const data = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd');
  const codigo = Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
  return data + '-' + codigo;
}
