const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const context = vm.createContext({
  DocumentApp: {
    GlyphType: { BULLET: 'BULLET' },
    HorizontalAlignment: { CENTER: 'CENTER', JUSTIFY: 'JUSTIFY' },
    Attribute: { FONT_FAMILY: 'fontFamily', FONT_SIZE: 'fontSize', FOREGROUND_COLOR: 'color' }
  },
  DriveApp: { getFileById: () => ({ getBlob: () => ({}) }) },
  CONFIG: { logoFileId: 'logo' },
  ASSOCIACAO_NOME: 'AEUV (Associação Esportiva Uberlandense Varzeana)',
  assinaturaAtas_: () => ({})
});
vm.runInContext(source.slice(source.indexOf('function formatarNegritoAta_('),
  source.indexOf('function exportarAtaPdf(')), context);

class Text {
  constructor(text = '') { this.text = text; this.boldRanges = []; this.colorRanges = []; }
  setText(text) { this.text = text; return this; }
  setFontFamily(value) { this.fontFamily = value; return this; }
  setFontSize(value) { this.fontSize = value; return this; }
  setBold(...args) {
    if (args.length === 1) this.bold = args[0];
    else this.boldRanges.push(args);
    return this;
  }
  setForegroundColor(...args) {
    if (args.length === 1) this.color = args[0];
    else this.colorRanges.push(args);
    return this;
  }
}

class Paragraph {
  constructor(text = '', kind = 'paragraph') {
    this.text = new Text(text); this.kind = kind; this.images = [];
  }
  editAsText() { return this.text; }
  asParagraph() { return this; }
  appendText(text) { this.text.text += text; return this.text; }
  appendInlineImage() {
    const image = {
      width: 100, height: 100,
      getWidth() { return this.width; }, getHeight() { return this.height; },
      setWidth(value) { this.width = value; return this; },
      setHeight(value) { this.height = value; return this; }
    };
    this.images.push(image);
    return image;
  }
}

for (const name of ['SpacingBefore', 'SpacingAfter', 'LineSpacing', 'Alignment',
  'GlyphType', 'NestingLevel', 'IndentStart', 'IndentFirstLine', 'IndentEnd', 'ListId']) {
  Paragraph.prototype['set' + name] = function (value) { this[name] = value; return this; };
}

class Cell {
  constructor() { this.paragraph = new Paragraph(); }
  getChild(index) { assert.equal(index, 0); return this.paragraph; }
}
for (const name of ['BackgroundColor', 'PaddingTop', 'PaddingBottom', 'PaddingLeft', 'PaddingRight']) {
  Cell.prototype['set' + name] = function (value) { this[name] = value; return this; };
}

class Section {
  constructor() { this.elements = []; }
  appendParagraph(text) {
    const paragraph = new Paragraph(text); this.elements.push(paragraph); return paragraph;
  }
  appendListItem(text) {
    const item = new Paragraph(text, 'list'); this.elements.push(item); return item;
  }
  appendHorizontalRule() { this.elements.push({ kind: 'rule' }); }
  appendTable(rows) {
    assert.deepEqual(Array.from(rows, row => Array.from(row)), [['']]);
    const table = {
      kind: 'table', cell: new Cell(),
      setBorderWidth(value) { this.borderWidth = value; return this; },
      getCell(row, col) { assert.equal(row, 0); assert.equal(col, 0); return this.cell; }
    };
    this.elements.push(table);
    return table;
  }
}
for (const name of ['PageWidth', 'PageHeight', 'MarginTop', 'MarginBottom', 'MarginLeft', 'MarginRight', 'Attributes']) {
  Section.prototype['set' + name] = function (value) { this[name] = value; return this; };
}

test('negrito azul remove delimitadores e calcula múltiplos intervalos, inclusive Unicode', () => {
  const paragraph = new Paragraph();
  context.formatarNegritoAta_(paragraph, 'Olá **ação** e **🏆 prêmio**.', '#000000', false);
  assert.equal(paragraph.text.text, 'Olá ação e 🏆 prêmio.');
  assert.deepEqual(paragraph.text.boldRanges, [[4, 7, true], [11, 19, true]]);
  assert.deepEqual(paragraph.text.colorRanges, [[4, 7, '#1F3A68'], [11, 19, '#1F3A68']]);
  assert.equal(paragraph.text.bold, false);
});

test('delimitadores incompletos permanecem literais e texto vazio não recebe intervalos', () => {
  for (const value of ['', 'Texto **sem fechamento', '****']) {
    const paragraph = new Paragraph();
    context.formatarNegritoAta_(paragraph, value, '#000000', false);
    assert.equal(paragraph.text.text, value);
    assert.deepEqual(paragraph.text.boldRanges, []);
  }
});

test('asterisco simples cria faixa escura e > cria faixa clara sem exibir marcadores', () => {
  const body = new Section();
  context.adicionarTextoAta_(body, '* PREMIAÇÃO **APROVADA**\n>ART 1: Disposições');
  const [dark, light] = body.elements;
  assert.equal(dark.cell.BackgroundColor, '#1F3A68');
  assert.equal(dark.cell.paragraph.text.text, 'PREMIAÇÃO APROVADA');
  assert.equal(dark.cell.paragraph.text.color, '#FFFFFF');
  assert.equal(dark.cell.paragraph.text.colorRanges[0][2], '#FFFFFF');
  assert.equal(light.cell.BackgroundColor, '#E9EEF8');
  assert.equal(light.cell.paragraph.text.text, 'ART 1: Disposições');
  assert.equal(light.cell.paragraph.text.color, '#1F3A68');
  assert.equal(dark.borderWidth, 0);
  assert.equal(light.cell.paragraph.text.bold, true);
});

test('negrito no começo da linha não cria faixa; texto comum é justificado', () => {
  const body = new Section();
  context.adicionarTextoAta_(body, '**Aprovado** por todos.\nTexto comum.');
  assert.equal(body.elements[0].kind, 'paragraph');
  assert.equal(body.elements[0].text.text, 'Aprovado por todos.');
  assert.deepEqual(body.elements[0].text.boldRanges, [[0, 7, true]]);
  assert.equal(body.elements[1].Alignment, 'JUSTIFY');
  assert.equal(body.elements[1].text.bold, false);
});

test('tópicos consecutivos usam a mesma lista e suportam negrito azul', () => {
  const body = new Section();
  context.adicionarTextoAta_(body, ' - Primeiro\r\n- **Segundo**\r\n\r\n- Terceiro');
  const [first, second, blank, third] = body.elements;
  assert.equal(first.kind, 'list');
  assert.equal(first.GlyphType, 'BULLET');
  assert.equal(first.text.text, 'Primeiro');
  assert.equal(second.ListId, first);
  assert.equal(second.text.text, 'Segundo');
  assert.equal(second.text.colorRanges[0][2], '#1F3A68');
  assert.equal(blank.text.text, '');
  assert.equal(third.ListId, undefined);
});

for (const [tipo, reuniao] of [['associacao', 'Associação'], ['campeonato', 'Campeonato']]) {
  test(`documento ${tipo} usa título e reunião nos lugares corretos e preserva dados e assinatura`, () => {
    const body = new Section(), header = new Section(), footer = new Section();
    context.formatarDocumentoAta_({
      getBody: () => body, addHeader: () => header, addFooter: () => footer
    }, {
      tipo, titulo: 'Deliberações da Diretoria', data: '2026-10-08',
      competicao: 'SUPER LIGA UNIÃO', local: 'Sede', participantes: 'Diretoria',
      texto: '* DECISÕES\n> Pauta\n- **Aprovado**'
    });
    assert.equal(header.elements[1].text.text, 'Comissão Organizadora · ' + reuniao);
    assert.equal(body.elements[0].text.text, 'Deliberações da Diretoria');
    assert.equal(body.elements[0].Alignment, 'CENTER');
    assert.equal(body.elements[0].text.fontSize, 18);
    assert.equal(body.elements[1].text.text, reuniao.toUpperCase());
    assert.equal(body.elements[1].Alignment, 'CENTER');
    const texts = body.elements.filter(item => item.text).map(item => item.text.text);
    assert(texts.includes('Data: 08/10/2026'));
    assert(texts.includes('Local: Sede'));
    assert(texts.includes('Participantes: Diretoria'));
    assert.equal(texts.includes('Competição: SUPER LIGA UNIÃO'), tipo === 'campeonato');
    assert(texts.includes('Uberlândia/MG, 8 de outubro de 2026.'));
    assert(texts.includes('Iure Costtiti'));
    assert(texts.includes('Presidente'));
    assert(body.elements.some(item => item.images && item.images.length === 1));
    assert.equal(body.PageWidth, 595.28);
    assert.equal(body.PageHeight, 841.89);
    assert.equal(footer.elements[0].text.text, 'AEUV (Associação Esportiva Uberlandense Varzeana)');
  });
}

function gerar(ata) {
  const body = new Section(), header = new Section(), footer = new Section();
  context.formatarDocumentoAta_({ getBody: () => body, addHeader: () => header, addFooter: () => footer },
    Object.assign({ titulo: 'Aviso', data: '2026-11-13', local: '', participantes: '', texto: 'Texto.' }, ata));
  return { body, header, footer, texts: body.elements.filter(item => item.text).map(item => item.text.text) };
}

test('comunicado usa rodapé geral, subtítulo e destinatários próprios; competição é opcional', () => {
  const { body, header, footer, texts } = gerar({
    tipo: 'comunicado', competicao: 'SUPER LIGA UNIÃO', participantes: 'Todas as equipes'
  });
  assert.equal(header.elements[1].text.text, 'Comissão Organizadora · Comunicado geral');
  assert.equal(body.elements[1].text.text, 'COMUNICADO GERAL');
  assert.equal(footer.elements[0].text.text, 'AEUV (Associação Esportiva Uberlandense Varzeana)');
  assert(texts.includes('Competição: SUPER LIGA UNIÃO'));
  assert(texts.includes('Destinatários: Todas as equipes'));
  assert(!texts.some(t => t.startsWith('Participantes:')));
  assert(texts.includes('Iure Costtiti'));
  assert(!gerar({ tipo: 'comunicado', competicao: '' }).texts.some(t => t.startsWith('Competição:')));
});

test('texto livre antigo é exportado como Comunicado geral sem perder conteúdo', () => {
  const { body, header, footer, texts } = gerar({ tipo: 'livre', participantes: 'Diretoria' });
  assert.equal(header.elements[1].text.text, 'Comissão Organizadora · Comunicado geral');
  assert.equal(body.elements[0].text.text, 'Aviso');
  assert.equal(body.elements[1].text.text, 'COMUNICADO GERAL');
  assert(texts.includes('Data: 13/11/2026'));
  assert.equal(footer.elements[0].text.text, 'AEUV (Associação Esportiva Uberlandense Varzeana)');
  assert(texts.includes('Destinatários: Diretoria'));
  assert(texts.includes('Uberlândia/MG, 13 de novembro de 2026.'));
});

test('tipos e prefixos de arquivo: atas mantêm "Ata"; tipo desconhecido cai em associação', () => {
  assert.equal(context.prefixoArquivoAta_('associacao'), 'Ata');
  assert.equal(context.prefixoArquivoAta_('campeonato'), 'Ata');
  assert.equal(context.prefixoArquivoAta_('comunicado'), 'Comunicado geral');
  assert.equal(context.prefixoArquivoAta_('livre'), 'Comunicado geral');
  assert.equal(context.tipoDocumentoAta_('xyz').rotulo, 'Associação');
});

test('editor oferece somente atas e Comunicado geral; registros livres são normalizados', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
  assert(html.includes("opcaoTipo('comunicado', 'Comunicado geral')"));
  assert(!html.includes("opcaoTipo('livre'"));
  const rowContext = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('function ataDaLinha_('),
    source.indexOf('function linhaAta_(')), rowContext);
  const row = ['id', 'livre', 'Título', '2026-11-13', 'Local', 'Equipes', 'Conteúdo'];
  const result = rowContext.ataDaLinha_(row);
  assert.equal(result.tipo, 'comunicado');
  assert.equal(result.texto, 'Conteúdo');
});

