const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
function functionSource(text, name, indentation = '') {
  const start = text.indexOf(indentation + 'function ' + name + '(');
  assert.notEqual(start, -1, name + ' must exist');
  const end = text.indexOf('\n' + indentation + '}', start);
  assert.notEqual(end, -1);
  return text.slice(start, end + indentation.length + 2);
}

function setup(profile = 'admin', team = '') {
  const values = {};
  const properties = {
    getProperty: key => values[key] ?? null,
    setProperty(key, value) {
      assert.ok(Buffer.byteLength(value, 'utf8') < 9000, 'property size limit');
      values[key] = value;
      return this;
    },
    setProperties(items) { Object.entries(items).forEach(([key, value]) => this.setProperty(key, value)); },
    deleteProperty: key => { delete values[key]; },
    getProperties: () => ({ ...values })
  };
  let uuid = 0;
  const state = { rows: [], uploads: [], released: 0, sheetReads: 0, deletedRows: [], locks: 0,
    maxRows: 100, cellFormats: {} };
  const sheet = {
    getDataRange() { state.sheetReads++; return { getValues: () => [['headers'], ...state.rows] }; },
    getMaxRows: () => state.maxRows,
    insertRowsAfter(after, count) { assert.equal(after, state.maxRows); state.maxRows += count; },
    getRange(row, column, height, width) {
      if (height === undefined) return {
        setNumberFormat(format) {
          assert.ok(row >= 2 && row <= state.maxRows);
          assert.ok(column === 4 || column === 15, 'only birth and CPF cells');
          state.cellFormats[row + ':' + column] = format;
        }
      };
      assert.equal(column, 1);
      assert.equal(height, 1);
      return { setValues: lines => { assert.equal(lines[0].length, width); state.rows[row - 2] = lines[0]; } };
    },
    appendRow: row => state.rows.push(row),
    deleteRow(row) {
      assert.ok(row >= 2, 'never delete the header');
      if (state.deleteError) throw new Error('sheet deletion failed');
      state.deletedRows.push(row);
      state.rows.splice(row - 2, 1);
    }
  };
  const context = vm.createContext({
    CONFIG: { associados: { prefixoConsulta: 'associado:', aba: 'Associados', maxArquivoBytes: 5 * 1024 * 1024 } },
    PropertiesService: { getScriptProperties: () => properties },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    Utilities: {
      getUuid: () => 'version-' + (++uuid),
      formatDate(date, zone, format) {
        assert.equal(zone, 'America/Sao_Paulo');
        assert.equal(format, 'dd/MM/yyyy');
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric'
        }).formatToParts(date);
        const part = type => parts.find(item => item.type === type).value;
        return `${part('day')}/${part('month')}/${part('year')}`;
      }
    },
    LockService: { getScriptLock: () => ({ waitLock(ms) { assert.equal(ms, 30000); state.locks++; }, releaseLock() { state.released++; } }) },
    identificarUsuario_: () => ({ autorizado: true, usuario: { perfil: profile, equipe: team }, email: 'admin@example.test' }),
    moduloLiberado_: () => true,
    perfilDaEquipe_: value => value === 'associado',
    obterEquipes_: () => ['Equipe A', 'Equipe B'],
    Logger: { log() {} },
    formatarDataHora_: () => '08/10/2026 12:00'
  });
  for (const name of ['ASSOCIADOS_PERFIS_EDICAO', 'ASSOCIADOS_STATUS', 'ASSOCIADOS_DOCUMENTOS', 'ASSOCIADOS_COLUNAS', 'ASSOCIADOS_TIPOS_ARQUIVO']) {
    const match = source.match(new RegExp('const ' + name + ' = [\\s\\S]*?;'));
    assert.ok(match, name);
    vm.runInContext(match[0], context);
  }
  for (const name of ['limparCampo_', 'exigirCampo_', 'somenteDigitos_', 'chaveEquipe_',
    'chaveConsultaAssociado_', 'publicarConsultaAssociado_', 'removerPartesConsultaAssociado_',
    'lerConsultaAssociado_', 'publicarCadastrosAssociados', 'documentoObrigatorioAssociado_',
    'completarAssociado_', 'linhaParaAssociado_', 'validarVinculoAssociado_',
    'validarCamposFiliacao_', 'cnpjAssociadoValido_', 'cpfValido_', 'validarNascimento_',
    'validarAssociado_', 'sessaoAssociados_', 'podeEditarAssociados_', 'listarAssociados',
    'salvarAssociado', 'excluirAssociado', 'abaAssociados_', 'salvarDocumento_', 'contatoResponsavelEquipeConflito_']) {
    vm.runInContext(functionSource(source, name), context);
  }
  context.abaAssociados_ = () => sheet;
  context.planilhaAssociados_ = () => ({ getUrl: () => 'private-sheet' });
  context.salvarDocumento_ = (file, teamName, document) => {
    state.uploads.push(document.id);
    return 'https://drive.example/' + document.id + '/new';
  };
  const columns = Array.from(vm.runInContext('ASSOCIADOS_COLUNAS', context), column => column.id);
  const row = record => columns.map(id => record[id] || '');
  return { context, state, values, properties, columns, row };
}

const representative = {
  equipe: 'Equipe A', status: 'pendente', nome: 'Pessoa Exemplo', nascimento: '1990-10-08',
  email: 'pessoa@example.test', telefone: '34999999999', cpf: '52998224725', rg: '123456',
  cep: '38400000', logradouro: 'Rua Exemplo', numero: '1', complemento: '',
  bairro: 'Centro', cidade: 'Uberlandia', uf: 'MG'
};

test('backend and frontend JavaScript parse', () => {
  new vm.Script(source);
  const scripts = Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g));
  assert.ok(scripts.length);
  scripts.forEach(match => new vm.Script(match[1].replace(/<\?[\s\S]*?\?>/g, '{}')));
});

test('birth date required and validates calendar and adult age', () => {
  const { context } = setup();
  assert.throws(() => context.validarNascimento_(''), /data de nascimento/);
  assert.throws(() => context.validarNascimento_('   '), /data de nascimento/);
  assert.equal(context.validarNascimento_('1990-10-08'), '08/10/1990');
  for (const date of ['1990-02-31', 'not-a-date', '2020-01-01', '1800-01-01']) {
    assert.throws(() => context.validarNascimento_(date));
  }
  assert.equal(context.validarAssociado_(representative).nascimento, '08/10/1990');
  assert.throws(() => context.validarAssociado_({ ...representative, nascimento: '' }), /data de nascimento/);
});

test('new optional fields validate CNPJ, exercise, choices and people', () => {
  const { context } = setup();
  const data = context.validarCamposFiliacao_({
    cnpjEquipe: '11.222.333/0001-81', exercicioFiliacao: '2026', tipoFiliacao: 'inicial',
    diretoriaComissao: [{ nome: 'Pessoa Exemplo', cargo: 'Presidente', cpf: '529.982.247-25', rg: '123' }]
  });
  assert.equal(data.cnpjEquipe, '11222333000181');
  assert.equal(JSON.parse(data.diretoriaComissao)[0].cpf, '52998224725');
  assert.equal(context.validarCamposFiliacao_({ cnpjEquipe: '' }).cnpjEquipe, '');
  for (const invalid of [
    { cnpjEquipe: '11222333000182' }, { cnpjEquipe: '00000000000000' },
    { exercicioFiliacao: '26' }, { tipoFiliacao: 'automatica' }, { elegibilidadeConferida: 'aprovada' },
    { diretoriaComissao: {} }, { diretoriaComissao: Array(101).fill({}) },
    { diretoriaComissao: [{ nome: 'Pessoa Exemplo', cargo: 'Presidente', cpf: '11111111111', rg: '1' }] }
  ]) assert.throws(() => context.validarCamposFiliacao_(invalid));
  assert.throws(() => context.validarVinculoAssociado_({ vinculoAnterior: 'sim', associacaoAnterior: '' }));
});

test('legacy sheet dates and numeric CPFs reopen with birth date and leading zero intact', () => {
  const { context, row } = setup();
  const client = vm.createContext({});
  for (const name of ['paraDataInput', 'formatarCpf']) {
    vm.runInContext(functionSource(html, name, '    '), client);
  }
  for (const cpf of ['02036861520', '01234567890', '00123456789']) {
    const loaded = context.linhaParaAssociado_(row({
      ...representative, nascimento: new Date('1990-10-08T01:00:00Z'), cpf: Number(cpf)
    }));
    assert.equal(loaded.nascimento, '07/10/1990', 'use script timezone, not UTC');
    assert.equal(loaded.cpf, cpf);
    assert.equal(client.paraDataInput(loaded.nascimento), '1990-10-07');
    assert.equal(client.formatarCpf(loaded.cpf).replace(/\D/g, ''), cpf);
  }
  const empty = context.linhaParaAssociado_(row({ nascimento: '', cpf: '' }));
  assert.equal(empty.nascimento, '');
  assert.equal(empty.cpf, '');
});

test('inclusion and editing retain representative birth and CPF after sheet coercion', () => {
  const { context, state, columns } = setup();
  state.maxRows = 1; // A sheet containing only the header needs a new row.
  const payload = { ...representative, cpf: '020.368.615-20' };
  context.salvarAssociado(payload);
  assert.equal(state.maxRows, 2);
  assert.deepEqual(state.cellFormats, { '2:4': '@', '2:15': '@' });
  assert.equal(state.rows[0][columns.indexOf('nascimento')], '08/10/1990');
  assert.equal(state.rows[0][columns.indexOf('cpf')], '02036861520');
  state.rows[0][columns.indexOf('nascimento')] = new Date('1990-10-08T03:00:00Z');
  state.rows[0][columns.indexOf('cpf')] = 2036861520;
  let loaded = context.listarAssociados().registros[0];
  assert.equal(loaded.nascimento, '08/10/1990');
  assert.equal(loaded.cpf, '02036861520');
  assert.throws(() => context.salvarAssociado({ ...payload, equipe: 'Equipe B' }), /já está cadastrado/);
  context.salvarAssociado({ ...payload, equipeOriginal: 'Equipe A', nascimento: '1991-11-09' });
  loaded = context.listarAssociados().registros[0];
  assert.equal(state.rows.length, 1);
  assert.equal(loaded.nascimento, '09/11/1991');
  assert.equal(loaded.cpf, '02036861520');
  const published = context.lerConsultaAssociado_('Equipe A');
  assert.equal(published.nascimento, loaded.nascimento);
  assert.equal(published.cpf, loaded.cpf);
});

test('saving one associate does not reformat or rewrite other legacy rows', () => {
  const { context, state, row } = setup();
  const legacy = row({ ...representative, equipe: 'Equipe B',
    nascimento: new Date('1990-10-08T03:00:00Z'), cpf: 2036861520 });
  state.rows.push(legacy);
  context.salvarAssociado(representative);
  assert.equal(state.rows[0], legacy);
  assert.deepEqual(state.cellFormats, { '3:4': '@', '3:15': '@' });
  const loaded = context.listarAssociados().registros.find(record => record.equipe === 'Equipe B');
  assert.equal(loaded.nascimento, '08/10/1990');
  assert.equal(loaded.cpf, '02036861520');
});

test('all documents optional regardless of status and prior affiliation', () => {
  const { context } = setup();
  const record = { status: 'pendente', vinculoAnterior: 'nao', tipoFiliacao: 'inicial' };
  assert.equal(context.completarAssociado_(record).pendencias, 0);
  assert.equal(record.taxaAnual, 150);
  record.vinculoAnterior = 'sim';
  assert.equal(context.completarAssociado_(record).pendencias, 0);
  record.status = 'ativo';
  record.tipoFiliacao = 'renovacao';
  assert.equal(context.completarAssociado_(record).pendencias, 0);
  assert.equal(record.taxaAnual, 100);
});

test('editing preserves old fields and all attachments not selected', () => {
  const { context, state, row } = setup();
  const old = { ...representative, criadoEm: 'old-date', estatuto: 'old-statute', ata: 'old-minutes',
    termoAssociacao: 'old-term', fichaCadastro: 'old-form', cnpjEquipe: '11222333000181',
    diretoriaComissao: '[{"nome":"Pessoa Exemplo"}]', razaoSocial: 'Original' };
  state.rows.push(row(old));
  context.salvarAssociado({ ...representative, equipeOriginal: 'Equipe A', arquivos: { termoAssociacao: { base64: 'new' } } });
  const saved = context.linhaParaAssociado_(state.rows[0]);
  assert.equal(saved.estatuto, old.estatuto);
  assert.equal(saved.ata, old.ata);
  assert.equal(saved.fichaCadastro, old.fichaCadastro);
  assert.equal(saved.termoAssociacao, 'https://drive.example/termoAssociacao/new');
  assert.equal(saved.criadoEm, 'old-date');
  assert.equal(saved.razaoSocial, 'Original');
  assert.equal(saved.diretoriaComissao, old.diretoriaComissao);
  assert.deepEqual(state.uploads, ['termoAssociacao']);
  assert.equal(state.released, 1);
});

test('eligibility and payment attachment never automatically activate a record', () => {
  const { context, state } = setup('diretoria');
  context.salvarAssociado({ ...representative, elegibilidadeConferida: 'conferida', tipoFiliacao: 'inicial',
    arquivos: { comprovantePagamento: { base64: 'proof' } } });
  const saved = context.linhaParaAssociado_(state.rows[0]);
  assert.equal(saved.status, 'pendente');
  assert.equal(saved.elegibilidadeConferida, 'conferida');
  assert.equal(saved.comprovantePagamento, 'https://drive.example/comprovantePagamento/new');
});

test('only admin and board edit; associated reads only own published team', () => {
  const { context, state } = setup('associado', 'Equipe A');
  context.publicarConsultaAssociado_({ ...representative, diretoriaComissao: 'x'.repeat(15000) });
  context.publicarConsultaAssociado_({ ...representative, equipe: 'Equipe B' });
  const result = context.listarAssociados();
  assert.deepEqual(Array.from(result.registros, record => record.equipe), ['Equipe A']);
  assert.equal(result.registros[0].diretoriaComissao.length, 15000);
  assert.equal(result.podeEditar, false);
  assert.equal(result.planilhaUrl, '');
  assert.equal(state.sheetReads, 0);
  assert.throws(() => context.salvarAssociado(representative));
  assert.equal(state.rows.length, 0);
});

test('large Unicode publications round-trip, preserve contacts and remove old parts', () => {
  const { context, values } = setup();
  const record = { ...representative, diretoriaComissao: JSON.stringify(Array(100).fill({ nome: 'Pessoa 🏆'.repeat(15) })) };
  const first = context.publicarConsultaAssociado_(record);
  assert.ok(first.length > 1);
  assert.equal(context.lerConsultaAssociado_('Equipe A').diretoriaComissao, record.diretoriaComissao);
  assert.equal(context.contatoResponsavelEquipeConflito_('Equipe A').nome, representative.nome);
  context.publicarConsultaAssociado_({ ...record, diretoriaComissao: '' });
  first.slice(1).forEach(key => assert.equal(values[key], undefined));
  assert.equal(context.lerConsultaAssociado_('Equipe A').diretoriaComissao, '');
});

test('incomplete published parts fail closed, and old publications still read', () => {
  const { context, properties } = setup();
  properties.setProperty(context.chaveConsultaAssociado_('Equipe A'), JSON.stringify(representative));
  assert.equal(context.lerConsultaAssociado_('Equipe A').nome, representative.nome);
  const keys = context.publicarConsultaAssociado_({ ...representative, diretoriaComissao: 'x'.repeat(15000) });
  properties.deleteProperty(keys[1]);
  assert.throws(() => context.lerConsultaAssociado_('Equipe A'));
});

test('republishing retains current parts and removes deleted teams', () => {
  const { context, state, values, row } = setup();
  context.publicarConsultaAssociado_({ ...representative, equipe: 'Equipe B', diretoriaComissao: 'x'.repeat(5000) });
  state.rows.push(row({ ...representative, diretoriaComissao: 'x'.repeat(15000) }));
  context.publicarCadastrosAssociados();
  assert.equal(context.lerConsultaAssociado_('Equipe A').diretoriaComissao.length, 15000);
  assert.equal(context.lerConsultaAssociado_('Equipe B'), null);
  assert.ok(Object.keys(values).every(key => key.startsWith('associado:EQUIPE A')));
});

test('renaming a team removes its old publication and keeps documents', () => {
  const { context, state, row, values } = setup();
  const old = { ...representative, estatuto: 'old-document', diretoriaComissao: 'x'.repeat(15000) };
  state.rows.push(row(old));
  context.publicarConsultaAssociado_(old);
  context.salvarAssociado({ ...representative, equipe: 'Equipe B', equipeOriginal: 'Equipe A' });
  assert.equal(context.lerConsultaAssociado_('Equipe A'), null);
  assert.equal(context.lerConsultaAssociado_('Equipe B').estatuto, 'old-document');
  assert.ok(Object.keys(values).every(key => !key.startsWith('associado:EQUIPE A')));
  assert.equal(state.rows.length, 1);
});

test('saving large validated board data publishes every person without property overflow', () => {
  const { context, state } = setup();
  const people = Array.from({ length: 100 }, (_, i) => ({
    nome: 'Pessoa Exemplo ' + i + ' 🏆'.repeat(30), cargo: 'Diretoria', cpf: '52998224725', rg: '123'
  }));
  context.salvarAssociado({ ...representative, diretoriaComissao: people });
  assert.equal(state.rows.length, 1);
  const published = context.lerConsultaAssociado_('Equipe A');
  assert.equal(JSON.parse(published.diretoriaComissao).length, 100);
  assert.equal(published.status, 'pendente');
});

test('client required date validation rejects empty birth and malformed dates', () => {
  const field = { value: '', required: true, dataset: { formato: 'data-br' }, setCustomValidity(message) { this.error = message; } };
  const context = vm.createContext({ document: { getElementById: () => field } });
  for (const name of ['dataBrParaIso_', 'lerDataFormulario_', 'validarCampoDataHora_']) {
    vm.runInContext(functionSource(html, name, '    '), context);
  }
  assert.notEqual(context.validarCampoDataHora_(field), '');
  assert.equal(context.lerDataFormulario_('fNascimento'), '');
  field.value = '31/02/1990';
  assert.notEqual(context.validarCampoDataHora_(field), '');
  assert.throws(() => context.lerDataFormulario_('fNascimento'));
});

test('schema adds columns after the 24 original columns without rewriting data', () => {
  const { context, columns } = setup();
  assert.deepEqual(columns.slice(0, 24), ['equipe', 'status', 'nome', 'nascimento', 'email', 'telefone',
    'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'rg', 'cpf',
    'estatuto', 'ata', 'documentoResponsavel', 'comprovanteEndereco', 'termoAssociacao',
    'regulamento', 'criadoEm', 'atualizadoEm', 'atualizadoPor']);
  let width = 26;
  let headerWritten = false;
  const sheet = {
    getMaxColumns: () => width,
    insertColumnsAfter(after, count) { assert.equal(after, 26); width += count; },
    getRange(row, column, height, count) {
      assert.equal(row, 1); assert.equal(column, 1); assert.equal(height, 1);
      assert.ok(width >= count);
      return { getValues: () => [[]], setValues() { headerWritten = true; return this; }, setFontWeight() {} };
    },
    setFrozenRows() {}
  };
  context.planilhaAssociados_ = () => ({ getSheetByName: () => sheet });
  vm.runInContext(functionSource(source, 'abaAssociados_'), context);
  context.abaAssociados_();
  assert.equal(width, columns.length);
  assert.equal(headerWritten, true);
});

test('upload validation rejects bad MIME and oversized files before Drive writes', () => {
  const { context } = setup();
  vm.runInContext(functionSource(source, 'salvarDocumento_'), context);
  assert.throws(() => context.salvarDocumento_({ tipo: 'text/html', base64: 'x' }, 'Equipe A', { nome: 'Ficha' }));
  context.Utilities.base64Decode = () => ({ length: 6 * 1024 * 1024 });
  assert.throws(() => context.salvarDocumento_({ tipo: 'application/pdf', base64: 'x' }, 'Equipe A', { nome: 'Ficha' }));
});

test('form retains existing fields and offers optional styled uploads and individual replacement', () => {
  const form = functionSource(html, 'abrirFormularioAssociado', '    ');
  for (const id of ['fNome', 'fNascimento', 'fCpf', 'fRg', 'fCep', 'fLogradouro', 'fNumero',
    'fComplemento', 'fBairro', 'fCidade', 'fUf', 'fRazaoSocial', 'fCnpjEquipe', 'fCoresOficiais',
    'fSedeCampo', 'fEnderecoEquipe', 'fTipoFiliacao', 'fExercicioFiliacao', 'fVinculoAnterior',
    'fAssociacaoAnterior', 'fElegibilidadeConferida', 'pessoasFiliacao']) assert.ok(form.includes(id), id);
  assert.ok(!form.includes('Data de nascimento (opcional)'));
  assert.ok(form.includes('Pesquisar arquivo'));
  assert.ok(form.includes('Todos os uploads são opcionais'));
  assert.ok(form.includes('Opcional'));
  assert.ok(!form.includes('Obrigatório'));
  assert.ok(form.includes('Abrir anexo atual'));
  assert.ok(form.includes('somente aquele documento'));
  assert.ok(form.includes('somenteLeitura'));
});

function clientForm() {
  const elements = {};
  const fields = [];
  const document = {
    getElementById: id => elements[id] || null,
    querySelectorAll: () => fields,
    createElement: () => ({ textContent: '' })
  };
  const context = vm.createContext({ document });
  for (const name of ['dataBrParaIso_', 'validarCampoDataHora_', 'prepararCamposAssociado_',
    'documentoNumericoAssociadoValido_', 'validarCampoAssociado_', 'validarFormularioAssociado_']) {
    vm.runInContext(functionSource(html, name, '    '), context);
  }
  function add(id, value = '', dataset = {}) {
    let star = null;
    const label = {
      querySelector: () => star,
      insertAdjacentHTML() { star = { remove() { star = null; } }; }
    };
    const attributes = {};
    const field = {
      id, value, dataset, disabled: false, parentElement: { querySelector: () => label },
      setCustomValidity(message) { this.error = message; },
      setAttribute: (key, value) => { attributes[key] = value; },
      getAttribute: key => attributes[key],
      insertAdjacentElement(position, element) { elements[element.id] = element; },
      scrollIntoView() { this.scrolled = true; },
      focus() { this.focused = true; }
    };
    elements[id] = field;
    fields.push(field);
    field.hasStar = () => !!star;
    return field;
  }
  add('fVinculoAnterior');
  return { context, fields, elements, add };
}

test('save marks every missing required field and focuses and scrolls to the first', () => {
  const { context, add, elements } = clientForm();
  const ids = ['fEquipe', 'fStatus', 'fNome', 'fNascimento', 'fCpf', 'fRg', 'fEmail',
    'fTelefone', 'fCep', 'fLogradouro', 'fNumero', 'fBairro', 'fCidade', 'fUf'];
  ids.forEach(id => add(id));
  const optional = add('fComplemento');
  const notice = {};
  assert.equal(context.validarFormularioAssociado_(notice), false);
  ids.forEach(id => {
    assert.equal(elements[id].required, true, id);
    assert.equal(elements[id].hasStar(), true, id);
    assert.equal(elements[id].getAttribute('aria-invalid'), 'true', id);
    assert.ok(elements[id + 'Erro'].textContent, id);
  });
  assert.ok(notice.textContent.includes('14'));
  assert.equal(elements.fEquipe.focused, true);
  assert.equal(elements.fEquipe.scrolled, true);
  assert.equal(optional.hasStar(), false);
  elements.fEquipe.value = 'Equipe A';
  assert.equal(context.validarCampoAssociado_(elements.fEquipe), '');
  assert.equal(elements.fEquipe.getAttribute('aria-invalid'), 'false');
  assert.equal(elements.fEquipeErro.textContent, '');
});

test('conditional association and added board people get required stars without requiring uploads', () => {
  const { context, add, elements } = clientForm();
  const association = add('fAssociacaoAnterior');
  const person = add('personNome', '', { pessoaCampo: 'nome' });
  elements.fVinculoAnterior.value = 'sim';
  context.prepararCamposAssociado_();
  assert.equal(association.required, true);
  assert.equal(association.hasStar(), true);
  assert.equal(person.required, true);
  assert.equal(person.hasStar(), true);
  assert.notEqual(context.validarCampoAssociado_(association), '');
  elements.fVinculoAnterior.value = 'nao';
  context.prepararCamposAssociado_();
  assert.equal(association.required, false);
  assert.equal(association.hasStar(), false);
  assert.equal(association.getAttribute('aria-invalid'), 'false');
});

test('client accepts complete required data without files and rejects invalid formats', () => {
  const { context, add } = clientForm();
  const ids = { equipe: 'fEquipe', status: 'fStatus', nome: 'fNome', nascimento: 'fNascimento', cpf: 'fCpf',
    rg: 'fRg', email: 'fEmail', telefone: 'fTelefone', cep: 'fCep', logradouro: 'fLogradouro',
    numero: 'fNumero', bairro: 'fBairro', cidade: 'fCidade', uf: 'fUf' };
  Object.entries(ids).forEach(([key, id]) => add(id, key === 'nascimento' ? '08/10/1990' : representative[key],
    key === 'nascimento' ? { formato: 'data-br' } : {}));
  assert.equal(context.validarFormularioAssociado_({}), true);
  for (const [id, value] of [['fNome', 'Pessoa'], ['fCpf', '11111111111'], ['fCnpjEquipe', '11222333000182'],
    ['fEmail', 'invalid'], ['fTelefone', '123'], ['fCep', '123'], ['fUf', 'MGX'],
    ['fExercicioFiliacao', '26'], ['fNascimento', '31/02/1990'], ['fNascimento', '01/01/2020']]) {
    const field = add(id, value, id === 'fNascimento' ? { formato: 'data-br' } : {});
    assert.notEqual(context.validarCampoAssociado_(field), '', id);
  }
  assert.equal(context.documentoNumericoAssociadoValido_('11.222.333/0001-81', true), true);
});

test('only admin gets delete permission; board and all other profiles cannot call delete directly', () => {
  for (const profile of ['admin', 'diretoria', 'associado', 'arbitragem', 'ADM', '']) {
    const { context, state, row } = setup(profile, 'Equipe A');
    state.rows.push(row(representative));
    context.publicarConsultaAssociado_(representative);
    assert.equal(context.listarAssociados().podeExcluir, profile === 'admin', profile);
    if (profile !== 'admin') {
      assert.throws(() => context.excluirAssociado('Equipe A'), /Somente administradores/);
      assert.equal(state.rows.length, 1);
      assert.ok(context.lerConsultaAssociado_('Equipe A'));
      assert.equal(state.locks, 0);
      assert.deepEqual(state.deletedRows, []);
    }
  }
  const { context, state } = setup();
  context.identificarUsuario_ = () => ({ autorizado: false, usuario: { perfil: 'admin' } });
  assert.throws(() => context.excluirAssociado('Equipe A'), /permissão/);
  assert.equal(state.sheetReads, 0);
});

test('admin deletes just the selected row and all its published parts, preserving other teams and files', () => {
  const { context, state, row, values, properties } = setup();
  const large = { ...representative, diretoriaComissao: '🦁'.repeat(12000), estatuto: 'keep-drive-file' };
  const other = { ...representative, equipe: 'Equipe A B', nome: 'Outra Pessoa' };
  state.rows.push(row(other), row(large));
  context.publicarConsultaAssociado_(large);
  context.publicarConsultaAssociado_(other);
  const otherKeys = { ...values };
  properties.setProperty(context.chaveConsultaAssociado_('Equipe A') + '::parte::orphan::0', 'orphan');
  properties.setProperty('unrelated', 'keep');
  const result = context.excluirAssociado('  equipe a  ');
  assert.equal(result.sucesso, true);
  assert.equal(result.equipe, 'Equipe A');
  assert.deepEqual(state.deletedRows, [3]);
  assert.deepEqual(state.rows, [row(other)]);
  assert.equal(context.lerConsultaAssociado_('Equipe A'), null);
  assert.equal(context.lerConsultaAssociado_('Equipe A B').nome, other.nome);
  assert.ok(!Object.keys(values).some(key => key === 'associado:EQUIPE A' || key.startsWith('associado:EQUIPE A::parte::')));
  assert.equal(values['associado:EQUIPE A B'], otherKeys['associado:EQUIPE A B']);
  assert.equal(values.unrelated, 'keep');
  assert.deepEqual(state.uploads, []);
  assert.equal(state.locks, 1);
  assert.equal(state.released, 1);
});

test('missing, blank or duplicated deletion targets never delete another record', () => {
  const { context, state, row } = setup();
  state.rows.push(row(representative));
  assert.throws(() => context.excluirAssociado(''), /Informe a equipe/);
  assert.throws(() => context.excluirAssociado('Equipe B'), /não encontrado/);
  state.rows.push(row(representative));
  assert.throws(() => context.excluirAssociado('Equipe A'), /duplicados/);
  assert.equal(state.rows.length, 2);
  assert.deepEqual(state.deletedRows, []);
  assert.equal(state.released, 2);
});

test('failed sheet deletion restores the published record and releases the lock', () => {
  const { context, state, row, values } = setup();
  const record = { ...representative, diretoriaComissao: 'x'.repeat(15000) };
  state.rows.push(row(record));
  context.publicarConsultaAssociado_(record);
  const before = { ...values };
  state.deleteError = true;
  assert.throws(() => context.excluirAssociado('Equipe A'), /sheet deletion failed/);
  assert.deepEqual(values, before);
  assert.equal(state.rows.length, 1);
  assert.equal(context.lerConsultaAssociado_('Equipe A').diretoriaComissao, record.diretoriaComissao);
  assert.equal(state.released, 1);
});

test('publication revocation failure prevents deleting the sheet row', () => {
  const { context, state, row, properties } = setup();
  state.rows.push(row(representative));
  context.publicarConsultaAssociado_(representative);
  properties.deleteProperty = () => { throw new Error('publication deletion failed'); };
  assert.throws(() => context.excluirAssociado('Equipe A'), /publication deletion failed/);
  assert.equal(state.rows.length, 1);
  assert.ok(context.lerConsultaAssociado_('Equipe A'));
  assert.equal(state.released, 1);
});

test('client delete button appears only with admin permission and an existing record', () => {
  const context = vm.createContext({ associados: { podeExcluir: false } });
  vm.runInContext(functionSource(html, 'botaoExcluirAssociado_', '    '), context);
  assert.equal(context.botaoExcluirAssociado_(representative), '');
  context.associados.podeExcluir = true;
  assert.equal(context.botaoExcluirAssociado_(null), '');
  assert.ok(context.botaoExcluirAssociado_(representative).includes('Excluir associado'));
});

test('client confirms deletion, sends original team and restores buttons on failure', () => {
  const button = { disabled: false };
  const save = { disabled: true }; // Invalid legacy data must not prevent deleting it.
  const notice = {};
  let confirmed = false, calls = 0, confirmations = 0, failure, success, loads = 0;
  const area = { insertAdjacentHTML(position, value) { this.message = value; } };
  const run = {
    withSuccessHandler(handler) { success = handler; return this; },
    withFailureHandler(handler) { failure = handler; return this; },
    excluirAssociado(team) { calls++; assert.equal(team, 'Equipe A'); }
  };
  const context = vm.createContext({
    associados: { podeExcluir: false }, moduloAtual: 'associados',
    window: { confirm(message) { confirmations++; assert.ok(message.includes('Equipe A')); return confirmed; } },
    document: {
      getElementById: id => ({ excluirAssociado: button, avisoAssociado: notice, areaAssociados: area })[id] || null,
      querySelectorAll: () => [button, save]
    },
    google: { script: { run } }, escapar: value => value,
    carregarAssociados() { loads++; }, setTimeout() {}
  });
  vm.runInContext(functionSource(html, 'excluirAssociadoDaTela_', '    '), context);
  context.excluirAssociadoDaTela_(representative);
  assert.equal(confirmations, 0);
  context.associados.podeExcluir = true;
  context.excluirAssociadoDaTela_(representative);
  assert.equal(calls, 0);
  confirmed = true;
  context.excluirAssociadoDaTela_(representative);
  assert.equal(calls, 1);
  assert.equal(button.disabled, true);
  context.excluirAssociadoDaTela_(representative);
  assert.equal(calls, 1);
  failure({ message: 'Não foi possível excluir' });
  assert.equal(button.disabled, false);
  assert.equal(save.disabled, true);
  assert.ok(notice.innerHTML.includes('Não foi possível excluir'));
  context.excluirAssociadoDaTela_(representative);
  success({ equipe: 'Equipe A' });
  assert.equal(loads, 1);
  assert.ok(area.message.includes('excluído com sucesso'));
});

