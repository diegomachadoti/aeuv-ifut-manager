const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { harness, person, participation, historyFile, rosterFile } = require('./save-fixture.cjs');
const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const gate = 'const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = false;';
assert.equal(source.split(gate).length, 2, 'production gate remains false, with one explicit literal');
const active = source.replace(gate, 'const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = true;');
const clone = value => JSON.parse(JSON.stringify(value));
const lock = (h, fn) => {
  const current = h.c.LockService.getScriptLock();
  current.waitLock();
  try { return fn(); } finally { current.releaseLock(); }
};
const fixture = () => {
  const h = harness(active, { cache: true });
  h.c.Utilities.base64Encode = bytes => Buffer.from(bytes).toString('base64');
  return h;
};
const seed = (h, tipo, records, id = 'c1') => lock(h, () => h.c.gravarParticoesElenco_(id,
  h.c.prepararParticoesElencoPorNome_(records).map(group => ({ ...group, tipo }))));
const read = (h, tipo = 'atletas', id = 'c1') => clone(h.c.lerElencoBrutoOperacao_(id, tipo));
const folder = h => h.c.nomePastaElencosParticionados_('c1');
const manifestPath = h => folder(h) + '\\manifesto.json';
const manifest = h => JSON.parse(h.files.get(manifestPath(h)));
const currentPath = (h, tipo = 'atletas', equipe = 'e1') =>
  folder(h) + '\\' + manifest(h).particoes.find(p => p.tipo === tipo && p.equipeId === equipe).arquivo;
const historyEntries = (h, tipo, id) => h.history().inscricoes.filter(entry =>
  entry.campeonatoId === 'c1' && entry.tipo === tipo && entry.registroId === id);
const assertNoLegacyWrites = (h, before) => {
  for (const [name, content] of before) assert.equal(h.files.get(name), content, name);
  assert(!h.io.some(entry => entry.operacao === 'trash'));
};

test('active startup is empty through RPCs and aggregates, ignoring legacy JSON and properties', () => {
  const h = fixture();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.seed('c1', 'comissao', [person('comissao')]);
  h.properties.set(h.c.chaveAtletasCampeonato_('c1'), '[{"nome":"old"}]');
  h.properties.set(h.c.chaveComissaoTecnicaCampeonato_('c1'), '[{"nome":"old"}]');
  assert.deepEqual(read(h), []);
  assert.deepEqual(clone(h.c.listarElenco('c1', 'e1').registros[0].atletas), []);
  const aggregated = h.c.listarCadastroPessoasCampeonato().registros[0];
  assert.deepEqual(clone(aggregated.atletas), []);
  assert.deepEqual(clone(aggregated.comissao), []);
  assert.deepEqual(clone(h.c.comissaoCampeonato_('c1')), []);
  assert(!h.io.some(entry => / - (Atletas|Comissao Tecnica)\.json$/.test(entry.name || '')));
  assert.equal(h.folders.size, 0);
  assert.equal(h.writes.length, 0);
});

for (const tipo of ['atletas', 'comissao']) test(`active ${tipo}: add/edit/remove, RPC/listing, pre/post history and durable queue`, () => {
  const h = fixture();
  const legacy = new Map(h.files), teams = clone(h.state.equipes);
  h.state.jogos = [participation(person('atletas', { id: 'unrelated', cpf: '12345678909' }))];
  const games = clone(h.state.jogos);
  const commits = [];
  h.state.onWrite = name => {
    if (name === manifestPath(h)) {
      assert(h.locked());
      assert(h.properties.has(h.c.chaveFilaHistoricoElenco_('c1')));
      assert.equal(h.c.lerMetaIndiceValidacao_('c1').dirty, true);
      assert(h.files.has(historyFile));
      commits.push(name);
    }
  };
  const added = h.c.salvarCadastroElenco(h.payload(tipo));
  const record = read(h, tipo)[0];
  assert.equal(added.registros[0][tipo][0].id, record.id);
  assert.equal(historyEntries(h, tipo, record.id).length, 0, 'snapshot before addition is empty');
  assert.equal(h.c.obterStatusFilaHistoricoElenco().pendencias, 1);
  h.c.processarHistoricoElencoAgora();
  assert.equal(historyEntries(h, tipo, record.id)[0].presente, true);
  assert.equal(h.c.obterStatusFilaHistoricoElenco().pendencias, 0);
  h.c.salvarCadastroElenco({ ...h.payload(tipo), registroId: record.id, foto: 'edited-photo' });
  assert.equal(read(h, tipo)[0].id, record.id);
  assert.equal(read(h, tipo)[0].foto, 'edited-photo');
  assert.equal(historyEntries(h, tipo, record.id)[0].dados.foto, 'photo', 'synchronous old snapshot');
  h.c.processarHistoricoElencoAgora();
  assert.equal(historyEntries(h, tipo, record.id)[0].dados.foto, 'edited-photo');
  const listed = h.c.listarElenco('c1', 'e1').registros[0][tipo];
  assert.equal(listed[0].id, record.id);
  assert.equal(h.c.listarCadastroPessoasCampeonato().registros[0][tipo][0].id, record.id);
  h.c.removerCadastroElenco({ campeonatoId: 'c1', equipeId: 'e1', tipo, registroId: record.id });
  assert.deepEqual(read(h, tipo), []);
  assert.equal(historyEntries(h, tipo, record.id)[0].presente, true);
  h.c.processarHistoricoElencoAgora();
  assert.equal(historyEntries(h, tipo, record.id)[0].presente, false);
  assert.equal(historyEntries(h, tipo, record.id).length, 1);
  assert.equal(commits.length, 3, 'one manifest revision per mutation');
  assert.deepEqual(h.state.equipes, teams);
  assert.deepEqual(h.state.jogos, games);
  assertNoLegacyWrites(h, legacy);
});

test('active transfer publishes origin and destination atomically, retains versions and enrollment IDs', () => {
  const h = fixture();
  seed(h, 'atletas', [person('atletas'),
    person('atletas', { id: 'other', nome: 'Outra Pessoa', cpf: '12345678909', timeVinculado: 'Equipe B' })]);
  seed(h, 'comissao', [person('comissao')]);
  const before = new Map(h.files), staffRef = manifest(h).particoes.find(p => p.tipo === 'comissao');
  let commits = 0;
  h.state.onWrite = name => { if (name === manifestPath(h)) commits++; };
  const result = h.c.transferirAtletaElenco({
    campeonatoId: 'c1', equipeId: 'e1', registroId: 'athlete', equipeDestinoId: 'e2'
  });
  assert.equal(result.registros[0].atletas.length, 0);
  assert.equal(read(h).filter(item => item.id === 'athlete').length, 1);
  assert.equal(read(h).find(item => item.id === 'athlete').timeVinculado, 'Equipe B');
  assert.equal(commits, 1);
  assert.deepEqual(manifest(h).particoes.find(p => p.tipo === 'comissao'), staffRef);
  h.c.processarHistoricoElencoAgora();
  const entries = historyEntries(h, 'atletas', 'athlete');
  assert.equal(entries.length, 2);
  assert(entries.some(entry => entry.equipeId === 'e1' && !entry.presente));
  assert(entries.some(entry => entry.equipeId === 'e2' && entry.presente));
  for (const [name, content] of before) {
    if (name !== manifestPath(h)) assert.equal(h.files.get(name), content, 'retained ' + name);
  }
});

test('active guards retain CPF, access, championship binding, participation by ID OR CPF and shared IDs', () => {
  for (const evidence of [
    person('atletas', { cpf: '11144477735' }),
    person('atletas', { id: 'old-id', cpf: '529.982.247-25' })
  ]) {
    const h = fixture();
    seed(h, 'atletas', [person('atletas')]);
    h.state.jogos = [participation(evidence)];
    const before = [...h.files], games = clone(h.state.jogos);
    assert.throws(() => h.c.removerCadastroElenco({
      campeonatoId: 'c1', equipeId: 'e1', tipo: 'atletas', registroId: 'athlete'
    }), /não pode ser removido/);
    assert.throws(() => h.c.transferirAtletaElenco({
      campeonatoId: 'c1', equipeId: 'e1', registroId: 'athlete', equipeDestinoId: 'e2'
    }), /não pode ser transferido/);
    assert.deepEqual([...h.files], before);
    assert.deepEqual(h.state.jogos, games);
  }
  for (const scenario of ['cpf', 'access', 'binding']) {
    const h = fixture();
    seed(h, 'comissao', [person('comissao')]);
    if (scenario === 'access') h.state.autorizado = false;
    if (scenario === 'binding') h.state.times = { c1: ['Equipe B'] };
    const before = [...h.files];
    assert.throws(() => h.c.salvarCadastroElenco({
      ...h.payload('atletas'), cpf: scenario === 'cpf' ? person('comissao').cpf : person('atletas').cpf
    }));
    assert.deepEqual([...h.files], before);
  }
});

test('active operation cache is resource-local, discarded on commit and rejects external concurrent changes', () => {
  const h = fixture();
  seed(h, 'atletas', [person('atletas')]);
  const resources = {};
  const first = h.c.lerElencoBrutoOperacao_('c1', 'atletas', resources);
  assert.equal(h.c.lerElencoBrutoOperacao_('c1', 'atletas', resources), first);
  assert.notEqual(h.c.lerElencoBrutoOperacao_('c1', 'atletas', {}), first);
  h.files.set(currentPath(h), JSON.stringify([person('atletas', { foto: 'external' })]));
  assert.throws(() => lock(h, () =>
    h.c.gravarElencoComHistorico_('c1', 'atletas', first, null, null, resources)), /mudou/);
  assert.equal(read(h)[0].foto, 'external');
  const fresh = {};
  const list = h.c.lerElencoBrutoOperacao_('c1', 'atletas', fresh);
  lock(h, () => h.c.gravarElencoComHistorico_('c1', 'atletas',
    list.map(item => ({ ...item, foto: 'saved' })), null, null, fresh));
  assert.equal(h.c.lerElencoBrutoOperacao_('c1', 'atletas', fresh)[0].foto, 'saved');
});

test('active operation snapshot reads each published partition once and shares both categories under lock', () => {
  const h = fixture();
  seed(h, 'atletas', [
    person('atletas'), person('atletas', { id: 'athlete-b', timeVinculado: 'Equipe B' })
  ]);
  seed(h, 'comissao', [
    person('comissao'), person('comissao', { id: 'staff-b', timeVinculado: 'Equipe B' })
  ]);
  h.io.length = 0;
  const resources = {};
  lock(h, () => {
    assert.deepEqual(clone(h.c.lerElencoBrutoOperacao_('c1', 'atletas', resources)
      .map(item => item.id)), ['athlete', 'athlete-b']);
    assert.deepEqual(clone(h.c.lerElencoBrutoOperacao_('c1', 'comissao', resources)
      .map(item => item.id)), ['staff', 'staff-b']);
  });
  const published = [...manifest(h).particoes.map(item => folder(h) + '\\' + item.arquivo),
    manifestPath(h)];
  for (const name of published) {
    assert.equal(h.io.filter(item => item.operacao === 'read' && item.name === name).length, 1, name);
  }
  assert.equal(h.c.lerElencoBrutoOperacao_('c1', 'atletas', resources)[0].id, 'athlete');
  assert.equal(h.io.filter(item => item.operacao === 'read' && published.includes(item.name)).length, 5);
});

for (const phase of ['snapshot', 'partition', 'journal', 'manifest', 'after-commit', 'readback']) {
  test(`active transfer failure ${phase}: no loss/duplication, dirty checkpoint and reload/retry`, () => {
    const h = fixture();
    seed(h, 'atletas', [person('atletas')]);
    const before = manifest(h);
    if (phase === 'manifest') h.state.failWrite = manifestPath(h);
    if (['snapshot', 'partition', 'journal'].includes(phase)) {
      h.state.failCreateWhen = name => name.startsWith(folder(h) + '\\' + ({
        snapshot: 'snapshot - ', partition: 'Atletas - e2 - ', journal: 'pendencia - '
      })[phase]);
    }
    h.state.onWrite = name => {
      if (name === manifestPath(h) && phase === 'after-commit') throw Error('response lost');
      if (name === manifestPath(h) && phase === 'readback') h.state.failRead = name;
    };
    const invoke = () => h.c.transferirAtletaElenco({
      campeonatoId: 'c1', equipeId: 'e1', registroId: 'athlete', equipeDestinoId: 'e2'
    });
    assert.throws(invoke, error => {
      assert.match(error.message, /Recarregue/);
      assert(error.cause);
      return true;
    });
    h.state.failRead = null;
    const committed = phase === 'after-commit' || phase === 'readback';
    assert.equal(read(h).filter(item => item.id === 'athlete').length, 1);
    assert.equal(read(h)[0].timeVinculado, committed ? 'Equipe B' : 'Equipe A');
    assert.equal(manifest(h).revisao === before.revisao, !committed);
    assert.equal(h.c.lerMetaIndiceValidacao_('c1').dirty, true);
    assert.equal(h.c.obterStatusFilaHistoricoElenco().pendencias, 1);
    assert.equal(historyEntries(h, 'atletas', 'athlete')[0].dados.timeVinculado, 'Equipe A');
    h.c.processarHistoricoElencoAgora();
    assert.equal(historyEntries(h, 'atletas', 'athlete').length, committed ? 2 : 1);
    h.state.failWrite = null;
    h.state.failCreateWhen = null;
    h.state.onWrite = null;
    if (committed) assert.throws(invoke, /não encontrado|não pertence/);
    else invoke();
    assert.equal(read(h).filter(item => item.id === 'athlete').length, 1);
    assert.equal(read(h)[0].timeVinculado, 'Equipe B');
  });
}

for (const failure of ['history', 'queue', 'dirty']) test(`active ${failure} persistence failure prevents publication`, () => {
  const h = fixture();
  seed(h, 'atletas', [person('atletas')]);
  const before = manifest(h);
  if (failure === 'history') h.state.failHistory = true;
  else {
    const props = h.c.PropertiesService.getScriptProperties();
    h.c.PropertiesService.getScriptProperties = () => ({
      ...props, setProperty(key, value) {
        if (key === (failure === 'queue' ? h.c.chaveFilaHistoricoElenco_('c1')
          : h.c.chaveIndiceValidacao_('c1') + 'meta')) throw Error('persistence failure');
        return props.setProperty(key, value);
      }
    });
  }
  assert.throws(() => h.c.salvarCadastroElenco({ ...h.payload('atletas', true), foto: 'new' }));
  assert.deepEqual(manifest(h), before);
  assert.equal(read(h)[0].foto, 'photo');
});

for (const operation of ['add', 'edit', 'remove']) for (const committed of [false, true]) {
  test(`active ${operation} response failure ${committed ? 'after' : 'before'} commit requires reload without duplicates`, () => {
    const h = fixture();
    seed(h, 'atletas', [person('atletas')]);
    const old = manifest(h);
    const invoke = () => operation === 'remove' ? h.c.removerCadastroElenco({
      campeonatoId: 'c1', equipeId: 'e1', tipo: 'atletas', registroId: 'athlete'
    }) : h.c.salvarCadastroElenco(operation === 'add'
      ? { ...h.payload('atletas'), cpf: '12345678909' }
      : { ...h.payload('atletas', true), foto: 'new-photo' });
    if (committed) h.state.onWrite = name => {
      if (name === manifestPath(h)) throw Error('response lost');
    };
    else h.state.failWrite = manifestPath(h);
    assert.throws(invoke, /Recarregue/);
    assert.equal(manifest(h).revisao === old.revisao, !committed);
    assert.equal(h.c.lerMetaIndiceValidacao_('c1').dirty, true);
    assert.equal(h.c.obterStatusFilaHistoricoElenco().pendencias, 1);
    const expected = operation === 'add' ? (committed ? 2 : 1)
      : operation === 'remove' ? (committed ? 0 : 1) : 1;
    assert.equal(read(h).length, expected);
    assert.equal(new Set(read(h).map(item => item.id)).size, expected);
    h.state.onWrite = null;
    h.state.failWrite = null;
    h.c.processarHistoricoElencoAgora();
    if (committed && operation !== 'edit') assert.throws(invoke);
    else invoke();
    assert.equal(read(h).length, operation === 'add' ? 2 : operation === 'remove' ? 0 : 1);
  });
}

test('active import candidates and import use new live rosters plus preserved global history', () => {
  const h = fixture();
  seed(h, 'atletas', [person('atletas', { id: 'previous', foto: 'previous-photo' })], 'c2');
  h.seed('c2', 'atletas', [person('atletas', { id: 'legacy-ignored' })]);
  const listed = h.c.listarImportacaoElenco({
    campeonatoId: 'c1', equipeId: 'e1', tipo: 'atletas', origemId: 'c2'
  });
  assert.equal(listed.candidatos.length, 1);
  const candidate = listed.candidatos[0];
  assert.equal(h.history().inscricoes.find(item => item.id === candidate.id).registroId, 'previous');
  const original = clone(h.history().inscricoes[0]);
  const imported = h.c.importarCadastrosElenco({
    campeonatoId: 'c1', equipeId: 'e1', tipo: 'atletas', origemId: 'c2', inscricaoIds: [candidate.id]
  });
  assert.equal(imported.quantidade, 1);
  assert.equal(read(h)[0].foto, 'previous-photo');
  assert.notEqual(read(h)[0].id, 'previous');
  h.c.processarHistoricoElencoAgora();
  assert.deepEqual(h.history().inscricoes.find(item => item.id === original.id), original);
  assert(!h.history().inscricoes.some(item => item.registroId === 'legacy-ignored'));
});

test('active empty startup keeps old global enrollment snapshots available for deliberate import, without migration', () => {
  const legacy = harness();
  legacy.seed('c2', 'comissao', [person('comissao', { id: 'historical-staff' })]);
  lock(legacy, () => legacy.c.prepararHistoricoElenco_());
  const h = fixture(), old = legacy.history().inscricoes[0];
  h.files.set(historyFile, legacy.files.get(historyFile));
  const candidates = h.c.listarImportacaoElenco({
    campeonatoId: 'c1', equipeId: 'e1', tipo: 'comissao', origemId: 'c2'
  }).candidatos;
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, old.id);
  assert.deepEqual(read(h, 'comissao', 'c2'), []);
  assert.deepEqual(h.history().inscricoes.find(item => item.id === old.id).dados, old.dados);
  h.c.importarCadastrosElenco({
    campeonatoId: 'c1', equipeId: 'e1', tipo: 'comissao', origemId: 'c2', inscricaoIds: [old.id]
  });
  assert.equal(read(h, 'comissao')[0].cpf, old.cpf);
  assert.deepEqual(h.history().inscricoes.find(item => item.id === old.id).dados, old.dados);
});

test('admin recovery diagnostics classify committed and staged journals without changing files or properties', () => {
  const committed = fixture();
  committed.c.salvarCadastroElenco(committed.payload('atletas'));
  const committedFiles = [...committed.files], committedProperties = [...committed.properties];
  const committedReport = committed.c.diagnosticarRecuperacaoElencosParticionados('c1');
  assert.equal(committedReport.total, 1);
  assert.equal(committedReport.journals[0].estado, 'publicado');
  assert.equal(committedReport.journals[0].filaHistorico, 'presente');
  assert.deepEqual([...committed.files], committedFiles);
  assert.deepEqual([...committed.properties], committedProperties);
  assert(!committed.io.some(item => item.operacao === 'trash'));

  const staged = fixture();
  staged.state.failWrite = manifestPath(staged);
  assert.throws(() => staged.c.salvarCadastroElenco(staged.payload('atletas')), /Recarregue/);
  staged.state.failWrite = null;
  const stagedFiles = [...staged.files], stagedProperties = [...staged.properties];
  const stagedReport = staged.c.diagnosticarRecuperacaoElencosParticionados('c1');
  assert.equal(stagedReport.journals.length, 1);
  assert.equal(stagedReport.journals[0].estado, 'nao_publicado');
  assert.equal(stagedReport.journals[0].filaHistorico, 'presente');
  assert.deepEqual([...staged.files], stagedFiles);
  assert.deepEqual([...staged.properties], stagedProperties);
  assert(!staged.io.some(item => item.operacao === 'trash'));
});

test('recovery diagnostics identify superseded commits and do not mistake a cleared queue for a failed publication', () => {
  const h = fixture();
  seed(h, 'atletas', [person('atletas')]);
  h.c.salvarCadastroElenco({ ...h.payload('atletas', true), foto: 'first-edit' });
  const revisaoAnterior = manifest(h).revisao;
  h.c.salvarCadastroElenco({ ...h.payload('atletas', true), foto: 'second-edit' });
  const revisaoAtual = manifest(h).revisao;
  h.c.processarHistoricoElencoAgora();

  const report = h.c.diagnosticarRecuperacaoElencosParticionados('c1');
  const anteriores = report.journals.find(item => item.revisao === revisaoAnterior);
  const atual = report.journals.find(item => item.revisao === revisaoAtual);
  assert.equal(anteriores.estado, 'substituido');
  assert.equal(atual.estado, 'publicado');
  assert.equal(anteriores.filaHistorico, 'ausente');
  assert.equal(atual.filaHistorico, 'ausente');

  h.c.PropertiesService.getScriptProperties().setProperty(h.c.chaveFilaHistoricoElenco_('c1'), '{invalid');
  const filaInvalida = h.c.diagnosticarRecuperacaoElencosParticionados('c1')
    .journals.find(item => item.revisao === revisaoAtual);
  assert.equal(filaInvalida.estado, 'publicado');
  assert.equal(filaInvalida.filaHistorico, 'invalida');
});

test('recovery diagnostics report corrupt journals and enforce admin without exposing roster data', () => {
  const h = fixture();
  h.c.salvarCadastroElenco(h.payload('atletas'));
  const pending = [...h.files.keys()].find(name => name.startsWith(folder(h) + '\\pendencia -'));
  h.files.set(pending, '{invalid');
  const report = h.c.diagnosticarRecuperacaoElencosParticionados('c1');
  assert.equal(report.journals[0].estado, 'invalido');
  assert.match(report.journals[0].diagnostico, /JSON invalido/);
  assert(!JSON.stringify(report).includes('Carlos Silva'));
  h.state.perfil = 'admin';
  assert.throws(() => h.c.diagnosticarRecuperacaoElencosParticionados(''), /Selecione um campeonato/);
  h.state.perfil = 'diretoria';
  assert.throws(() => h.c.diagnosticarRecuperacaoElencosParticionados('c1'), /Somente o administrador/);
});

test('active staff retains ativo through history, edits, result selection and actual sumula generation', () => {
  const h = fixture();
  seed(h, 'comissao', [person('comissao', { nome: 'Active Staff' }),
    person('comissao', { id: 'inactive', nome: 'Hidden Staff', cpf: '12345678909', ativo: false })]);
  h.c.salvarCadastroElenco({ ...h.payload('comissao'), registroId: 'inactive',
    nome: 'Hidden Staff', cpf: '12345678909', foto: 'edited' });
  assert.equal(read(h, 'comissao').find(item => item.id === 'inactive').ativo, false);
  h.c.processarHistoricoElencoAgora();
  assert.equal(historyEntries(h, 'comissao', 'inactive')[0].dados.ativo, false);
  const game = { id: 'game', mandanteId: 'e1', visitanteId: 'e2', faseId: 'fase', campoId: 'campo',
    rodada: 1, data: '2026-10-07', hora: '12:00', status: 'agendado' };
  const context = { campeonato: h.state.campeonatos[0], equipes: h.state.equipes, jogos: [game],
    campos: [{ id: 'campo', nome: 'Campo' }], fases: [{ id: 'fase', nome: 'Fase' }], grupos: [] };
  assert.deepEqual(clone(h.c.elencosResultadoTabela_(context, game, false)[0].comissao).map(p => p.id), ['staff']);
  assert.equal(h.c.comissaoCampeonato_('c1').find(p => p.id === 'inactive').ativo, false);
  h.c.contextoTabela_ = () => context;
  h.c.listarPunicoes = () => ({ registros: [] });
  h.c.Session.getScriptTimeZone = () => 'America/Sao_Paulo';
  h.c.Utilities.formatDate = () => '07/10/2026';
  h.c.Utilities.base64Encode = bytes => Buffer.from(bytes).toString('base64');
  h.c.DriveApp.getFileById = () => ({
    getBlob: () => ({ getContentType: () => 'image/png', getBytes: () => [1, 2] })
  });
  let rendered;
  h.c.Utilities.newBlob = text => {
    rendered = text;
    return { getAs: () => ({ setName: () => ({ getBytes: () => [3, 4] }) }) };
  };
  assert.equal(h.c.gerarSumulaJogoCampeonato({ campeonatoId: 'c1', id: 'game' }).mimeType, 'application/pdf');
  assert(rendered.includes('Active Staff'));
  assert(!rendered.includes('Hidden Staff'));
});

for (const tipo of ['atletas', 'comissao']) test(`active ${tipo} image batches retain backups/signatures and only publish affected teams`, () => {
  const h = fixture();
  h.useRealContextFiles();
  const image = 'data:image/png;base64,' + 'A'.repeat(400);
  seed(h, tipo, [person(tipo, { foto: image }),
    person(tipo, { id: 'other', nome: 'Other', cpf: '12345678909', timeVinculado: 'Equipe B', foto: image })]);
  const old = manifest(h), original = new Map(h.files);
  const fonte = { campeonatoId: 'c1', tipo, equipeId: 'e1' };
  const batch = h.c.listarLoteOtimizacaoImagens({ fonte, inicio: 0 });
  assert.equal(batch.imagens.length, 1);
  const optimized = 'data:image/webp;base64,AAAA';
  const payload = { fonte, assinatura: batch.assinatura, imagens: [{ indice: 0, imagem: optimized }] };
  const saved = h.c.salvarLoteOtimizacaoImagens(payload);
  assert.equal(saved.total, 1);
  assert(saved.backupId);
  const backup = JSON.parse([...h.files].find(([name]) => name.startsWith('AEUV - Backup Imagens - '))[1]);
  assert.equal(backup.registros[0].foto, image);
  assert.equal(backup.fonte.equipeId, 'e1');
  assert.equal(read(h, tipo).find(item => item.timeVinculado === 'Equipe A').foto, optimized);
  assert.equal(read(h, tipo).find(item => item.timeVinculado === 'Equipe B').foto, image);
  assert.deepEqual(manifest(h).particoes.find(p => p.equipeId === 'e2'), old.particoes.find(p => p.equipeId === 'e2'));
  assert.throws(() => h.c.salvarLoteOtimizacaoImagens(payload), /mudou/);
  for (const [name, text] of original) if (name !== manifestPath(h) && name !== historyFile) {
    assert.equal(h.files.get(name), text);
  }
  assert.equal(historyEntries(h, tipo, person(tipo).id)[0].dados.foto, image);
  h.c.processarHistoricoElencoAgora();
  assert.equal(historyEntries(h, tipo, person(tipo).id)[0].dados.foto, optimized);
});

for (const phase of ['backup', 'publication', 'external-change']) test(`active image ${phase} failure never silently overwrites originals`, () => {
  const h = fixture();
  h.useRealContextFiles();
  const image = 'data:image/png;base64,' + 'A'.repeat(400);
  seed(h, 'atletas', [person('atletas', { foto: image })]);
  const original = manifest(h);
  const fonte = { campeonatoId: 'c1', tipo: 'atletas' };
  const batch = h.c.listarLoteOtimizacaoImagens({ fonte, inicio: 0 });
  if (phase === 'backup') {
    const root = h.c.pastaRaizProjeto_();
    h.c.pastaRaizProjeto_ = () => ({
      ...root, createFile(blob) {
        if (blob.name.startsWith('AEUV - Backup Imagens - ')) throw Error('backup failure');
        return root.createFile(blob);
      }
    });
  }
  if (phase === 'publication') h.state.failWrite = manifestPath(h);
  if (phase === 'external-change') h.state.onWrite = name => {
    if (name.startsWith('AEUV - Backup Imagens - ')) {
      h.files.set(currentPath(h), JSON.stringify([person('atletas', { foto: image, nome: 'External Name' })]));
    }
  };
  assert.throws(() => h.c.salvarLoteOtimizacaoImagens({
    fonte, assinatura: batch.assinatura, imagens: [{ indice: 0, imagem: 'data:image/webp;base64,AAAA' }]
  }));
  assert.deepEqual(manifest(h), original);
  assert.equal(read(h)[0].foto, image);
  if (phase === 'external-change') assert.equal(read(h)[0].nome, 'External Name');
  assert.equal([...h.files.keys()].filter(name => name.startsWith('AEUV - Backup Imagens - ')).length,
    phase === 'backup' ? 0 : 1);
});

test('active logical championship removal preserves games, folders, legacy data, versions and old snapshots', () => {
  const h = fixture();
  h.useRealContextFiles();
  seed(h, 'atletas', [person('atletas')]);
  h.files.set(h.c.arquivoTabelaCampeonato_('c1'), JSON.stringify([{ jogos: [participation()] }]));
  const before = new Map(h.files), teams = h.files.get(h.registryFile);
  h.c.removerCampeonato('c1');
  assert(!h.c.campeonatos_().some(item => item.id === 'c1'));
  assert(h.properties.has(h.c.chaveRemocaoElencosParticionados_('c1')));
  h.c.processarHistoricoElencoAgora();
  assert.equal(historyEntries(h, 'atletas', 'athlete')[0].presente, false);
  assert.equal(historyEntries(h, 'atletas', 'athlete')[0].dados.foto, 'photo');
  for (const [name, text] of before) if (name !== 'AEUV - Campeonatos.json') {
    assert.equal(h.files.get(name), text, name);
  }
  assert.equal(h.files.get(h.registryFile), teams);
  assert(!h.io.some(entry => entry.operacao === 'trash'));
  assert.equal(h.folders.size, 1);
});

for (const committed of [false, true]) test(`active logical removal ${committed ? 'after' : 'before'} registry commit preserves recoverable tombstone and queue`, () => {
  const h = fixture();
  h.useRealContextFiles();
  seed(h, 'atletas', [person('atletas')]);
  const before = new Map(h.files);
  if (committed) h.state.onWrite = name => {
    if (name === 'AEUV - Campeonatos.json') throw Error('response lost');
  };
  else h.state.failWrite = 'AEUV - Campeonatos.json';
  assert.throws(() => h.c.removerCampeonato('c1'), error => {
    assert.match(error.message, /Recarregue/);
    assert(error.cause);
    return true;
  });
  assert.equal(h.c.campeonatos_().some(item => item.id === 'c1'), !committed);
  assert(h.properties.has(h.c.chaveRemocaoElencosParticionados_('c1')));
  assert.equal(h.c.obterStatusFilaHistoricoElenco().pendencias, 1);
  h.state.failWrite = null;
  h.state.onWrite = null;
  h.c.processarHistoricoElencoAgora();
  assert.equal(historyEntries(h, 'atletas', 'athlete')[0].presente, !committed);
  for (const [name, text] of before) if (name !== 'AEUV - Campeonatos.json') {
    assert.equal(h.files.get(name), text);
  }
  assert(!h.io.some(entry => entry.operacao === 'trash'));
});
