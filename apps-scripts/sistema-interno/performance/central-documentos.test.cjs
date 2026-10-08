const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
function functionSource(text, name, indentation = '') {
  const start = text.indexOf(indentation + 'function ' + name + '(');
  assert.notEqual(start, -1, name);
  const end = text.indexOf('\n' + indentation + '}', start);
  assert.notEqual(end, -1, name);
  return text.slice(start, end + indentation.length + 2);
}

function backend(profile = 'associado', authorized = true, allowed = true) {
  const names = ['regulamento-2026.pdf', 'forma-de-disputa.pdf', 'tabela-de-jogos.PDF', 'estatuto-aeuv.pdf', 'rascunho.txt'];
  let index = 0, folderReads = 0;
  const files = names.map((name, i) => ({
    getName: () => name, getLastUpdated: () => new Date(2026, 9, i + 1),
    getUrl: () => 'https://drive.example/' + i, getId: () => 'file-' + i, getSize: () => 1024
  }));
  const context = vm.createContext({
    CONFIG: { regulamentos: { maxLeitura: 100 } },
    identificarUsuario_: () => ({ autorizado: authorized, usuario: { perfil: profile } }),
    moduloLiberado_(id, value) { assert.equal(id, 'regulamentos'); assert.equal(value, profile); return allowed; },
    pastaRegulamentos_() {
      folderReads++;
      return {
        getFiles: () => ({ hasNext: () => index < files.length, next: () => files[index++] }),
        getUrl: () => 'https://drive.example/original-folder'
      };
    },
    tamanhoLegivel_: () => '1 KB',
    Utilities: { formatDate: () => '08/10/2026 12:00' },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' }
  });
  for (const name of ['listarRegulamentos', 'tituloRegulamento_']) {
    vm.runInContext(functionSource(source, name), context);
  }
  return { context, getFolderReads: () => folderReads };
}

function frontend(records = []) {
  const status = { outerHTML: '' };
  const button = { addEventListener(event, handler) { this.handler = handler; } };
  const context = vm.createContext({
    regulamentos: { registros: records, pastaUrl: 'https://drive.example/original-folder' },
    CONFIG: { usuario: { perfil: 'associado' }, regulamentosPastaUrl: 'https://drive.example/original-folder' },
    moduloAtual: 'regulamentos',
    document: { getElementById: id => id === 'statusRegulamentos' ? status : button },
    escapar: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    abrirModulo(id) { context.lastModule = id; }
  });
  for (const name of ['montarTelaRegulamentos', 'botaoSolicitarAcessoAssociado', 'carregarRegulamentos']) {
    vm.runInContext(functionSource(html, name, '    '), context);
  }
  return { context, status, button };
}

test('menu adopts Central de Documentos without changing identifiers or access profiles', () => {
  const match = source.match(/\{\s*id: 'regulamentos',[\s\S]*?\n  \}/);
  assert.ok(match);
  const module = vm.runInNewContext('(' + match[0] + ')');
  assert.equal(module.nome, 'Central de Documentos');
  assert.equal(module.descricao, 'Consulte os documentos oficiais da AEUV e das competições.');
  assert.equal(module.id, 'regulamentos');
  assert.equal(module.tipo, 'regulamentos');
  assert.deepEqual(Array.from(module.perfis), ['admin', 'diretoria', 'arbitragem', 'associado']);
});

test('all authorized profiles can list regulations, dispute formats, schedules and statutes as PDFs', () => {
  for (const profile of ['admin', 'diretoria', 'arbitragem', 'associado']) {
    const { context } = backend(profile);
    const result = context.listarRegulamentos();
    assert.equal(result.total, 4);
    assert.equal(result.pastaUrl, 'https://drive.example/original-folder');
    assert.deepEqual(Array.from(result.registros, item => item.titulo),
      ['Estatuto Aeuv', 'Tabela De Jogos', 'Forma De Disputa', 'Regulamento 2026']);
    assert.ok(result.registros.every(item => item.url && item.downloadUrl.includes('export=download')));
  }
});

test('unauthorized or disallowed users cannot read the document folder', () => {
  for (const options of [['associado', false, true], ['associado', true, false]]) {
    const { context, getFolderReads } = backend(...options);
    assert.throws(() => context.listarRegulamentos(), /Central de Documentos/);
    assert.equal(getFolderReads(), 0);
  }
});

test('empty screen refers to documents and describes the broader public scope', () => {
  const { context, status } = frontend();
  context.montarTelaRegulamentos();
  assert.ok(status.outerHTML.includes('Nenhum documento publicado'));
  assert.ok(!status.outerHTML.includes('Nenhum regulamento'));
  for (const text of ['formas de disputa', 'tabelas de jogos', 'estatuto da associação']) {
    assert.ok(status.outerHTML.includes(text));
  }
});

test('document cards keep open, download, folder and refresh actions with generic counts', () => {
  const records = backend().context.listarRegulamentos().registros;
  const { context, status, button } = frontend(records);
  context.montarTelaRegulamentos();
  assert.ok(status.outerHTML.includes('4 documentos'));
  assert.ok(status.outerHTML.includes('Abrir PDF'));
  assert.ok(status.outerHTML.includes('Baixar'));
  assert.ok(status.outerHTML.includes('original-folder'));
  button.handler();
  assert.equal(context.lastModule, 'regulamentos');
  context.regulamentos.registros = [{ ...records[0], titulo: '<script>test</script>' }];
  context.montarTelaRegulamentos();
  assert.ok(status.outerHTML.includes('1 documento</span>'));
  assert.ok(status.outerHTML.includes('&lt;script>test&lt;/script>'));
});

test('Drive access request keeps working for the renamed module and only for associated users', () => {
  const { context, status } = frontend();
  let failure;
  const run = {
    withSuccessHandler() { return this; },
    withFailureHandler(handler) { failure = handler; return this; },
    listarRegulamentos() {}
  };
  context.google = { script: { run } };
  context.carregarRegulamentos();
  failure({ message: 'Não foi possível abrir a pasta "Regulamentos" no Drive.' });
  assert.ok(status.outerHTML.includes('Solicitar acesso como Leitor no Drive'));
  assert.ok(status.outerHTML.includes('original-folder'));
  context.CONFIG.usuario.perfil = 'diretoria';
  assert.equal(context.botaoSolicitarAcessoAssociado('regulamentos'), '');
});

