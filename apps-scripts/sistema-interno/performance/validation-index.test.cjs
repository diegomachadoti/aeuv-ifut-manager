const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { harness, person, participation, rosterFile, historyFile } = require('./save-fixture.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const md5 = text => crypto.createHash('md5').update(text, 'utf8').digest('hex');
const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');

function fixture(active = false) {
  const h = harness(active ? source.replace('const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = false;',
    'const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = true;') : undefined, { cache: true });
  const versions = new Map(), triggers = [];
  let sequence = 0;
  h.state.email = h.state.effective = 'admin@example.invalid';
  const identify = h.c.identificarUsuario_;
  h.c.identificarUsuario_ = () => ({ ...identify(), email: h.state.email });
  h.c.Session = { getEffectiveUser: () => ({ getEmail: () => h.state.effective }) };
  const set = h.files.set.bind(h.files);
  h.files.set = (name, value) => {
    versions.set(name, (versions.get(name) || 0) + 1);
    return set(name, value);
  };
  h.c.Utilities.DigestAlgorithm.MD5 = 'MD5';
  h.c.Utilities.computeDigest = (algo, text) => [...crypto.createHash(algo === 'MD5' ? 'md5' : 'sha256')
    .update(text, 'utf8').digest()];
  h.counts.metadata = 0;
  h.counts.indexChunkWrites = 0;
  h.state.metadataVersion = key => versions.get(key) || 1;
  const list = h.c.Drive.Files.list;
  h.c.Drive = { Files: { list(options) {
    h.counts.metadata++;
    return list(options);
  }, get(id, options) {
    h.counts.metadata++;
    h.counts.metadataGet++;
    assert.equal(options.fields, 'id,name,trashed,parents,version,md5Checksum');
    if (h.state.failMetadata) throw Error('sensitive metadata error 52998224725');
    const meta = h.meta.get(id);
    if (h.state.onMetadata) h.state.onMetadata(meta.name);
    const key = meta.key || meta.name;
    return { id, name: meta.name, trashed: meta.trashed,
      parents: [meta.parent === 'root' ? h.rootId() : meta.parent],
      version: String(versions.get(key) || 1), md5Checksum: md5(h.files.get(key)) };
  } } };
  const props = h.c.PropertiesService.getScriptProperties();
  h.c.PropertiesService.getScriptProperties = () => ({
    ...props,
    getProperties: () => Object.fromEntries(h.properties),
    getProperty(key) {
      if (h.state.failIndexRead && key.includes('INDICE_VALIDACAO') && !key.endsWith('meta')) throw Error('index read');
      return props.getProperty(key);
    },
    setProperty(key, value) {
      if (key.includes('INDICE_VALIDACAO_V1_c_')) {
        const phase = key.endsWith('meta') ? (JSON.parse(value).dirty ? 'dirty' : 'publish') : 'chunk';
        if (h.state.failIndexWrite === phase) throw Error('index write 52998224725');
        if (phase === 'chunk') {
          h.counts.indexChunkWrites++;
          if (h.state.onIndexChunkWrite) h.state.onIndexChunkWrite();
        }
        if (phase === 'dirty') assert(h.locked(), 'dirty before source is under the existing lock');
        if (phase === 'publish' && h.state.onPublish) h.state.onPublish();
      }
      return props.setProperty(key, value);
    }
  });
  const lock = h.c.LockService.getScriptLock();
  h.c.LockService.getScriptLock = () => ({
    ...lock,
    tryLock(ms) {
      assert.equal(ms, 1, 'reconciliation never waits behind mutation/other triggers');
      if (h.state.busy) return false;
      lock.waitLock();
      return true;
    }
  });
  const tableName = id => h.c.arquivoTabelaCampeonato_(id);
  const table = id => ({
    schema: 'aeuv.tabela', versao: 1, revisao: 'table-' + ++sequence, campeonatoId: id,
    jogos: [], grupos: [], criterios: clone(h.c.criteriosPadraoTabela_()), desempatesOrganizacao: []
  });
  h.c.lerTabelaCampeonato_ = id => {
    h.counts.tables++;
    return h.files.has(tableName(id)) ? JSON.parse(h.files.get(tableName(id)))[0] : table(id);
  };
  h.c.estruturaCampeonato_ = () => ({ formato: 'Liga', faseNome: 'Classificação', rodadas: 3 });
  h.c.lerCamposTabela_ = () => ({ revisao: 'campos-1', campos: [{ id: 'campo', nome: 'Campo', endereco: '', ativo: true }] });
  const games = (jogos, id = 'c1') => {
    const doc = table(id);
    doc.jogos = clone(jogos);
    h.files.set(tableName(id), JSON.stringify([doc]));
  };
  const game = (pessoa = person('atletas'), team = 'e1') => ({
    ...participation(pessoa, team), faseId: 'fase-classificacao', grupoId: '', rodada: 1,
    campoId: 'campo', data: '2026-10-06', hora: '12:00', golsMandante: 0, golsVisitante: 0
  });
  const trigger = (owner, handler, event = 'CLOCK') => {
    const t = { owner, handler, event, id: 'trigger-' + ++sequence, deleted: false };
    Object.assign(t, { getUniqueId: () => t.id, getHandlerFunction: () => handler, getEventType: () => event });
    triggers.push(t);
    return t;
  };
  h.c.ScriptApp = {
    getService: () => ({ getUrl: () => 'fixture' }), EventType: { CLOCK: 'CLOCK' },
    getProjectTriggers: () => triggers.filter(t => !t.deleted && t.owner === h.state.effective),
    deleteTrigger(t) { assert.equal(t.owner, h.state.effective); t.deleted = true; },
    newTrigger: handler => ({
      timeBased() { return this; },
      everyMinutes(minutes) { assert.equal(minutes, 5); return this; },
      create() { return trigger(h.state.effective, handler); }
    })
  };
  const build = id => h.c.reconciliarIndiceValidacao_(id || 'c1');
  const meta = id => clone(h.c.lerMetaIndiceValidacao_(id || 'c1'));
  const index = id => clone(h.c.consultarIndiceValidacao_(id || 'c1'));
  const withLock = fn => {
    lock.waitLock();
    try { return fn(); } finally { lock.releaseLock(); }
  };
  return { ...h, games, game, build, meta, index, withLock, triggers, trigger };
}

const activeSeed = (h, tipo, registros, id = 'c1') => h.withLock(() => h.c.gravarParticoesElenco_(id,
  h.c.prepararParticoesElencoPorNome_(registros).map(group => ({ ...group, tipo }))));

test('active checkpoint resolves each published source once regardless of category repeats', () => {
  const h = fixture(true);
  activeSeed(h, 'atletas', [person('atletas')]);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.build();
  h.withLock(() => {
    h.io.length = 0;
    const before = h.counts.metadata;
    const checkpoint = h.c.checkpointElencoParticionado_('c1');
    const initial = h.c.versoesFontesIndiceValidacao_('c1', null, [0, 1], checkpoint);
    for (let i = 0; i < 12; i++) {
      assert.deepEqual(clone(h.c.versoesFontesIndiceValidacao_('c1', null, [0, 1], checkpoint)), clone(initial));
      assert(h.c.consultarIndiceValidacao_('c1', null, 'atletas', checkpoint));
      assert(h.c.consultarIndiceValidacao_('c1', null, 'comissao', checkpoint));
    }
    assert.equal(h.counts.metadata - before, 1, 'one list for both partitions + manifest, not per category/call');
    assert.equal(h.io.filter(item => item.operacao === 'lookup').length, 1);
    h.c.iniciarMutacaoIndiceParticionado_('c1', null, checkpoint);
    assert.equal(h.c.consultarIndiceValidacao_('c1', null, 'atletas', checkpoint), null,
      'marking the index dirty discards verified checkpoint state');
  });
  h.build();
  const target = activePath(h, 'atletas');
  h.files.set(target, JSON.stringify([person('atletas', { cpf: '12345678909' })]));
  assert.equal(h.index(), null, 'the next boundary never trusts a previous verified bundle');
});

for (const partitions of [2, 4]) test(`active warm edit bounds Drive calls with ${partitions} published partitions`, () => {
  const h = fixture(true);
  for (const tipo of ['atletas', 'comissao']) {
    const records = [person(tipo)];
    if (partitions === 4) records.push(person(tipo, {
      id: tipo + '-other', nome: 'Other ' + tipo, timeVinculado: 'Equipe B', cpf: '24681357928'
    }));
    activeSeed(h, tipo, records);
  }
  h.build();
  h.io.length = 0;
  const before = h.counts.metadata;
  const beforeGet = h.counts.metadataGet, beforeList = h.counts.metadataList;
  h.c.salvarCadastroElenco({ ...h.payload('atletas', true), foto: 'updated' });
  assert.equal(h.meta().dirty, false);
  // Before batching: 5 * partitions + 6 gets, 5 * partitions + 16 name lookups.
  // Five independent source boundaries, not fixture wall-clock estimates.
  assert(h.counts.metadata - before <= 6, 'metadata calls: ' + (h.counts.metadata - before));
  assert.equal(h.counts.metadataList - beforeList, 5, 'five fresh checkpoint lists');
  assert.equal(h.counts.metadataGet - beforeGet, 1, 'one-off new partition metadata for the journal');
  const lookups = h.io.filter(item => item.operacao === 'lookup').length;
  assert.equal(lookups, 16);
  assert.equal(h.io.filter(item => item.operacao === 'read').length, 13);
  const phases = new Set(h.logs.filter(item => item.metrica === 'cadastro_elenco').map(item => item.fase));
  for (const phase of ['elenco_metadados_preparacao', 'elenco_indice_base', 'elenco_preparacao_particoes',
    'elenco_ids_publicacao', 'elenco_snapshot', 'elenco_particoes', 'elenco_journal',
    'elenco_precommit', 'elenco_commit', 'elenco_poscommit', 'elenco_indice_incremental',
    'elenco_indice_baseline', 'elenco_indice_delta', 'elenco_indice_publicacao',
    'elenco_indice_confirmacao_fontes']) {
    assert(phases.has(phase), phase);
  }
});

test('active selected team link never builds the discarded aggregate response or scans another championship', () => {
  const h = fixture(true);
  h.state.times = { c1: ['Equipe A'], c2: ['Equipe A'] };
  const times = h.c.timesCampeonato_;
  h.c.timesCampeonato_ = id => {
    const persisted = h.properties.get(h.c.chaveTimesCampeonato_(id));
    return persisted ? JSON.parse(persisted) : times(id);
  };
  const aggregate = h.c.listarTimesCampeonato;
  h.c.listarTimesCampeonato = () => { throw Error('discarded aggregate response'); };
  const response = h.c.vincularEquipeParticipante({ campeonatoId: 'c1', equipeId: 'e2' });
  h.c.listarTimesCampeonato = aggregate;
  assert.equal(response.registros.length, 1);
  assert.equal(response.registros[0].campeonatoId, 'c1');
  assert.equal(response.registros[0].times.length, 2);
  assert(!h.io.some(item => String(item.name || '').includes(h.c.nomePastaElencosParticionados_('c2'))));
  assert(!h.io.some(item => item.name === historyFile));
  assert.equal([...h.files.keys()].filter(name => name.includes('\\pendencia - ')).length, 1);
});

test('active warm transfer bounds metadata/name calls while publishing both teams atomically', () => {
  const h = fixture(true);
  activeSeed(h, 'atletas', [person('atletas')]);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.build();
  h.io.length = 0;
  const before = h.counts.metadata;
  const beforeGet = h.counts.metadataGet, beforeList = h.counts.metadataList;
  h.c.transferirAtletaElenco({
    campeonatoId: 'c1', equipeId: 'e1', registroId: 'athlete', equipeDestinoId: 'e2'
  });
  assert(h.counts.metadata - before <= 7);
  assert.equal(h.counts.metadataList - beforeList, 5);
  assert.equal(h.counts.metadataGet - beforeGet, 2, 'both newly published partitions');
  assert.equal(h.io.filter(item => item.operacao === 'lookup').length, 18);
  assert.equal(h.io.filter(item => item.operacao === 'read').length, 14);
  const published = clone(h.c.lerElencoParticionado_('c1', 'atletas'));
  assert.equal(published.length, 1);
  assert.equal(published[0].timeVinculado, 'Equipe B');
  assert.equal(h.meta().dirty, false);
});

const activePath = (h, tipo = 'comissao', equipeId) => {
  const folder = h.c.nomePastaElencosParticionados_('c1');
  const manifest = JSON.parse(h.files.get(folder + '\\manifesto.json'));
  return folder + '\\' + manifest.particoes.find(item => item.tipo === tipo
    && (!equipeId || item.equipeId === equipeId)).arquivo;
};

for (const race of ['partition', 'manifest']) {
  test(`active final index validation rejects ${race} changes during the metadata list itself`, () => {
    const h = fixture(true);
    activeSeed(h, 'atletas', [person('atletas')]);
    activeSeed(h, 'comissao', [person('comissao')]);
    h.build();
    const target = activePath(h), manifest = h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json';
    let raced = false;
    h.state.onIndexChunkWrite = () => {
      h.state.onMetadata = name => {
        if (name !== (race === 'manifest' ? 'manifesto.json' : target.split('\\').pop())) return;
        h.state.onMetadata = null;
        raced = true;
        if (race === 'partition') h.files.set(target, JSON.stringify([person('comissao', { foto: 'external' })]));
        else {
          const doc = JSON.parse(h.files.get(manifest));
          doc.revisao = 'external-during-list';
          h.files.set(manifest, JSON.stringify(doc));
        }
      };
    };
    h.c.salvarCadastroElenco({ ...h.payload('atletas', true), cpf: '12345678909', foto: 'committed' });
    assert(raced, 'onMetadata must run inside listing, not only get mocks');
    assert.equal(h.meta().dirty, true);
    assert.equal(JSON.parse(h.files.get(activePath(h, 'atletas')))[0].foto, 'committed',
      'index failure does not roll back the committed roster');
  });
}

for (const operation of ['add', 'remove', 'listing', 'link']) {
  test(`active ${operation} keeps measured remote-call bounds with a warm two-partition base`, () => {
    const h = fixture(true);
    activeSeed(h, 'atletas', [person('atletas')]);
    activeSeed(h, 'comissao', [person('comissao')]);
    h.build();
    h.io.length = 0;
    const before = h.counts.metadata;
    const beforeGet = h.counts.metadataGet, beforeList = h.counts.metadataList;
    if (operation === 'add') h.c.salvarCadastroElenco({
      ...h.payload('atletas'), nome: 'Outra Pessoa', cpf: '12345678909'
    });
    if (operation === 'remove') h.c.removerCadastroElenco(h.payload('atletas', true));
    if (operation === 'listing') h.c.listarElenco('c1', 'e1');
    if (operation === 'link') {
      h.state.times = { c1: ['Equipe A'], c2: ['Equipe A'] };
      h.c.vincularEquipeParticipante({ campeonatoId: 'c1', equipeId: 'e2' });
    }
    const bounds = { add: [6, 16, 13], remove: [6, 16, 13],
      listing: [2, 5, 4], link: [3, 8, 7] }[operation];
    assert(h.counts.metadata - before <= bounds[0], 'metadata calls');
    assert.equal(h.counts.metadataList - beforeList, { add: 5, remove: 5, listing: 2, link: 3 }[operation]);
    assert.equal(h.counts.metadataGet - beforeGet, ['add', 'remove'].includes(operation) ? 1 : 0);
    assert.equal(h.io.filter(item => item.operacao === 'lookup').length, bounds[1], 'name lookups');
    assert.equal(h.io.filter(item => item.operacao === 'read').length, bounds[2], 'blob reads');
  });
}

test('active commission add/edit/remove use the same five fresh batch checkpoints as athletes', () => {
  for (const operation of ['add', 'edit', 'remove']) {
    const h = fixture(true);
    activeSeed(h, 'atletas', [person('atletas')]);
    activeSeed(h, 'comissao', [person('comissao')]);
    h.build();
    h.io.length = 0;
    const beforeGet = h.counts.metadataGet, beforeList = h.counts.metadataList;
    if (operation === 'add') h.c.salvarCadastroElenco({
      ...h.payload('comissao'), nome: 'Outra Pessoa', cpf: '12345678909'
    });
    if (operation === 'edit') h.c.salvarCadastroElenco({ ...h.payload('comissao', true), foto: 'updated' });
    if (operation === 'remove') h.c.removerCadastroElenco(h.payload('comissao', true));
    assert.equal(h.counts.metadataList - beforeList, 5);
    assert.equal(h.counts.metadataGet - beforeGet, 1);
    assert.equal(h.io.filter(item => item.operacao === 'lookup').length, 16);
    assert.equal(h.meta().dirty, false);
  }
});

test('history response preparation reuses the validated target baseline but the writer rechecks it', () => {
  const h = fixture(true);
  activeSeed(h, 'atletas', [person('atletas')]);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.build();
  const prepare = h.c.prepararHistoricoElenco_;
  const manifestPath = h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json';
  const manifestBefore = h.files.get(manifestPath), target = activePath(h, 'atletas');
  h.c.prepararHistoricoElenco_ = (cache, resources, ...args) => {
    const baseline = resources.particoesElencos[JSON.stringify(['atletas', 'e1'])];
    const reads = h.io.filter(item => item.operacao === 'read' && item.name === target).length;
    const result = prepare(cache, resources, ...args);
    assert.equal(cache.c1.atletas, baseline, 'stored baseline is reused, not reread');
    assert.equal(h.io.filter(item => item.operacao === 'read' && item.name === target).length, reads);
    h.files.set(target, JSON.stringify([person('atletas', { foto: 'external-validation-edit' })]));
    return result;
  };
  assert.throws(() => h.c.salvarCadastroElenco({
    ...h.payload('atletas', true), foto: 'requested-photo'
  }), /fonte.*mudou/i);
  assert.equal(h.files.get(manifestPath), manifestBefore);
  assert.equal(JSON.parse(h.files.get(target))[0].foto, 'external-validation-edit');
});

for (const boundary of ['postcommit', 'chunks']) {
  for (const change of ['partition-edit', 'partition-delete', 'partition-rename', 'manifest-edit',
    'registry-name', 'championship-name', 'links', 'active-team', 'table-edit', 'table-create']) {
    test(`active clean index rejects ${change} after ${boundary}, retaining the committed roster`, () => {
      const h = fixture(true);
      h.useRealContextFiles();
      activeSeed(h, 'atletas', [person('atletas'), person('atletas', {
        id: 'other', nome: 'Pessoa da Equipe B', timeVinculado: 'Equipe B', cpf: '12345678909'
      })]);
      activeSeed(h, 'comissao', [person('comissao')]);
      if (change !== 'table-create') h.games([]);
      h.build();
      const unrelated = activePath(h, 'atletas', 'e2');
      const manifestPath = h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json';
      let changed = false, committedTarget;
      const tamper = () => {
        if (changed) return;
        changed = true;
        committedTarget = activePath(h, 'atletas', 'e1');
        if (change === 'partition-edit') h.files.set(unrelated, JSON.stringify([person('atletas', {
          id: 'other', nome: 'Externo', timeVinculado: 'Equipe B', cpf: '24681357928'
        })]));
        if (change === 'partition-delete') h.drive.trash(unrelated);
        if (change === 'partition-rename') h.drive.rename(unrelated, unrelated + '.renamed');
        if (change === 'manifest-edit') {
          const doc = JSON.parse(h.files.get(manifestPath)); doc.revisao = 'external';
          h.files.set(manifestPath, JSON.stringify(doc));
        }
        if (change === 'registry-name') {
          const teams = JSON.parse(h.files.get(h.registryFile)); teams[1].nome = 'Equipe Renomeada';
          h.files.set(h.registryFile, JSON.stringify(teams));
        }
        if (change === 'championship-name') {
          const championships = JSON.parse(h.files.get('AEUV - Campeonatos.json'));
          championships[0].nome = 'Campeonato Renomeado';
          h.files.set('AEUV - Campeonatos.json', JSON.stringify(championships));
        }
        if (change === 'links') h.state.times = { ...h.state.times, c1: ['Equipe A'] };
        if (change === 'active-team') h.state.equipesAtivas = ['Equipe B'];
        if (change === 'table-edit' || change === 'table-create') h.games([h.game()]);
      };
      if (boundary === 'chunks') h.state.onIndexChunkWrite = tamper;
      else {
        const conclude = h.c.concluirMutacaoIndiceParticionado_;
        h.c.concluirMutacaoIndiceParticionado_ = (...args) => { tamper(); return conclude(...args); };
      }
      h.c.salvarCadastroElenco({ ...h.payload('atletas', true), foto: 'committed-photo' });
      assert(changed, 'race injection executed');
      assert.equal(JSON.parse(h.files.get(committedTarget))[0].foto, 'committed-photo');
      assert(h.meta().dirty, 'no clean publication of an untrusted delta');
      assert.equal(h.index(), null);
      assert([...h.files.keys()].some(name => name.includes('\\snapshot - ')));
      assert([...h.files.keys()].some(name => name.includes('\\pendencia - ')));
    });
  }
}

test('active no-op edit retains a clean index without publishing a new roster revision', () => {
  const h = fixture(true);
  activeSeed(h, 'atletas', [person('atletas')]);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.build();
  h.c.salvarCadastroElenco(h.payload('atletas', true));
  const path = h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json';
  const before = h.files.get(path), chunks = h.counts.indexChunkWrites;
  h.c.salvarCadastroElenco(h.payload('atletas', true));
  assert.equal(h.files.get(path), before);
  assert.equal(h.counts.indexChunkWrites, chunks);
  assert.equal(h.meta().dirty, false);
  assert(h.index());
});

test('active no-op edit rejects external source changes before clean index publication', () => {
  const h = fixture(true);
  activeSeed(h, 'atletas', [person('atletas')]);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.build();
  h.c.salvarCadastroElenco(h.payload('atletas', true));
  const publish = h.c.publicarIndiceValidacao_;
  let changed = false;
  h.c.publicarIndiceValidacao_ = (...args) => {
    changed = true;
    h.files.set(activePath(h, 'comissao'), JSON.stringify([
      person('comissao', { cpf: '12345678909' })
    ]));
    return publish(...args);
  };
  h.c.salvarCadastroElenco(h.payload('atletas', true));
  assert(changed);
  assert(h.meta().dirty);
  assert.equal(h.index(), null);
});

test('active unchanged compact generation still freshly validates sources before reusing its chunks', () => {
  const h = fixture(true);
  activeSeed(h, 'atletas', [person('atletas')]);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.build();
  const chunks = h.counts.indexChunkWrites, publish = h.c.publicarIndiceValidacao_;
  let changed = false;
  h.c.publicarIndiceValidacao_ = (...args) => {
    changed = true;
    h.files.set(activePath(h, 'comissao'), JSON.stringify([
      person('comissao', { cpf: '12345678909' })
    ]));
    return publish(...args);
  };
  h.c.salvarCadastroElenco({ ...h.payload('atletas', true), foto: 'committed-photo' });
  assert(changed);
  assert.equal(h.counts.indexChunkWrites, chunks, 'unchanged compact payload takes the reuse branch');
  assert(h.meta().dirty);
  assert.equal(h.index(), null);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '12345678909', 'atleta', ''), /comissão técnica/);
});

test('active transfer final index validation checks the destination after both partitions committed', () => {
  const h = fixture(true);
  activeSeed(h, 'atletas', [person('atletas')]);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.build();
  h.state.onIndexChunkWrite = () => { h.state.equipesAtivas = ['Equipe A']; };
  h.c.transferirAtletaElenco({
    campeonatoId: 'c1', equipeId: 'e1', registroId: 'athlete', equipeDestinoId: 'e2'
  });
  assert(h.meta().dirty);
  assert.equal(h.index(), null);
  assert.equal(h.c.lerParticaoElenco_('c1', 'e1', 'atletas').length, 0);
  assert.equal(h.c.lerParticaoElenco_('c1', 'e2', 'atletas')[0].id, 'athlete');
});

test('active V2 index reconciles both partition categories and retains Drive version checks for games', () => {
  const h = fixture(true);
  activeSeed(h, 'atletas', [person('atletas')]);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.seed('c1', 'comissao', [person('comissao', { cpf: '12345678909' })]);
  h.games([h.game(person('atletas', { id: 'old-game-id', cpf: '529.982.247-25' }), 'e2')]);
  assert.equal(h.build(), 'reconciliado');
  assert.equal(h.meta().versao, 2);
  assert.equal(h.index().versao, 2);
  assert.deepEqual(h.meta().fontes.slice(0, 2).map(item => item.slice(0, 2)), [
    ['aeuv.elencos.particoes.v2', 'atletas'], ['aeuv.elencos.particoes.v2', 'comissao']
  ]);
  assert.equal(h.meta().fontes[2][2], md5(h.files.get(h.c.arquivoTabelaCampeonato_('c1'))));
  assert(h.index().cadastros.comissao['11144477735']);
  assert(!h.index().cadastros.comissao['12345678909']);
  assert.equal(h.build(), 'atual');
  assert.throws(() => h.c.removerCadastroElenco(h.payload('atletas', true)), /já participou/);
  h.games([]);
  assert.equal(h.c.consultarIndiceValidacao_('c1', null, 'tabela'), null);
  assert.equal(h.build(), 'reconciliado');
  assert.deepEqual(h.index().participacao, {});
});

test('active RPC mutations publish V2 only after the manifest and update CPF/team entries incrementally', () => {
  const h = fixture(true);
  h.build();
  const manifestName = h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json';
  let dirtyAtManifest = false;
  h.state.onWrite = name => {
    if (name === manifestName) {
      dirtyAtManifest = h.meta().dirty === true;
    }
  };
  h.c.salvarCadastroElenco(h.payload('comissao'));
  h.state.onWrite = null;
  assert(dirtyAtManifest, 'the index remains dirty at the manifest publication point');
  assert.equal(h.meta().dirty, false);
  assert(h.index().cadastros.comissao['11144477735']);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '11144477735', 'atleta', ''), /comissão técnica/);
  const staff = h.c.lerElencoBrutoOperacao_('c1', 'comissao')[0];
  h.c.salvarCadastroElenco({ ...h.payload('comissao'), registroId: staff.id, cpf: '12345678909' });
  assert.equal(h.meta().dirty, false);
  assert(!h.index().cadastros.comissao['11144477735']);
  assert(h.index().cadastros.comissao['12345678909']);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '12345678909', 'atleta', ''), /comissão técnica/);
  h.c.removerCadastroElenco({ campeonatoId: 'c1', equipeId: 'e1', tipo: 'comissao', registroId: staff.id });
  assert.equal(h.meta().dirty, false);
  assert.deepEqual(h.index().cadastros.comissao, {});
  h.c.salvarCadastroElenco(h.payload('atletas'));
  const athlete = h.c.lerElencoBrutoOperacao_('c1', 'atletas')[0];
  h.c.transferirAtletaElenco({
    campeonatoId: 'c1', equipeId: 'e1', registroId: athlete.id, equipeDestinoId: 'e2'
  });
  assert.equal(h.meta().dirty, false);
  assert.equal(h.index().cadastros.atletas[athlete.cpf][0][1], h.c.chaveEquipe_('Equipe B'));
});

test('warm active CRUD reads only the selected team and uses compact cross-team CPF/name indexes', () => {
  const h = fixture(true);
  h.state.equipes.push({ id: 'e3', nome: 'Equipe C' });
  activeSeed(h, 'atletas', [
    person('atletas'),
    person('atletas', { id: 'athlete-b', nome: 'Bruno Lima', cpf: '12345678909', timeVinculado: 'Equipe B' }),
    person('atletas', { id: 'athlete-c', nome: 'Carla Lima', cpf: '98765432290', timeVinculado: 'Equipe C' })
  ]);
  activeSeed(h, 'comissao', [
    person('comissao'),
    person('comissao', { id: 'staff-b', nome: 'Equipe B staff', cpf: '11111111111', timeVinculado: 'Equipe B' }),
    person('comissao', { id: 'staff-c', nome: 'Equipe C staff', cpf: '22222222222', timeVinculado: 'Equipe C' })
  ]);
  assert.equal(h.build(), 'reconciliado');
  const refs = JSON.parse(h.files.get(h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json')).particoes;
  const unrelated = refs.filter(item => item.equipeId !== 'e1')
    .map(item => h.c.nomePastaElencosParticionados_('c1') + '\\' + item.arquivo);
  h.io.length = 0;
  const response = h.c.listarElenco('c1', 'e1');
  assert.equal(response.registros[0].atletas.length, 1);
  const listingReads = h.io.filter(item => item.operacao === 'read').map(item => item.name);
  assert(unrelated.every(name => !listingReads.includes(name)),
    'team RPC listing reads only the selected team roster blobs');
  const metadataBefore = h.counts.metadata;
  h.io.length = 0;
  h.c.salvarCadastroElenco({ ...h.payload('comissao'), cpf: '24681357928' });
  const reads = h.io.filter(item => item.operacao === 'read').map(item => item.name);
  assert(reads.some(name => name === activePath(h, 'comissao', 'e1')));
  assert(unrelated.every(name => !reads.includes(name)), 'untouched team partition blobs are not downloaded');
  assert(h.counts.metadata > metadataBefore, 'live source metadata is still checked');

  const before = h.c.lerElencoParticionado_('c1', 'atletas');
  h.io.length = 0;
  assert.throws(() => h.c.salvarCadastroElenco({
    ...h.payload('atletas'), cpf: '12345678909', nome: 'Novo Jogador'
  }), /CPF j[aá] cadastrado/);
  const readsDuplicate = h.io.filter(item => item.operacao === 'read').map(item => item.name);
  assert(unrelated.some(name => readsDuplicate.includes(name)) === false,
    'a valid index rejects cross-team CPF duplicates without roster downloads');
  assert.deepEqual(h.c.lerElencoParticionado_('c1', 'atletas'), before);
  h.io.length = 0;
  assert.throws(() => h.c.salvarCadastroElenco({
    ...h.payload('atletas'), cpf: '31415926590', nome: 'Bruno'
  }), /Nome similar j[aá] cadastrado/);
  assert(!h.io.some(item => item.operacao === 'read' && unrelated.includes(item.name)),
    'the normalized-name index enforces cross-team similar-name rules');
});

test('warm active transfer reads only origin and destination team data and updates their index delta', () => {
  const h = fixture(true);
  h.state.equipes.push({ id: 'e3', nome: 'Equipe C' });
  activeSeed(h, 'atletas', [
    person('atletas'),
    person('atletas', { id: 'athlete-b', nome: 'Bruno Lima', cpf: '12345678909', timeVinculado: 'Equipe B' }),
    person('atletas', { id: 'athlete-c', nome: 'Carla Lima', cpf: '98765432290', timeVinculado: 'Equipe C' })
  ]);
  activeSeed(h, 'comissao', [
    person('comissao'),
    person('comissao', { id: 'staff-b', timeVinculado: 'Equipe B' }),
    person('comissao', { id: 'staff-c', timeVinculado: 'Equipe C' })
  ]);
  h.build();
  const refs = JSON.parse(h.files.get(h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json')).particoes;
  const thirdTeam = refs.filter(item => item.equipeId === 'e3')
    .map(item => h.c.nomePastaElencosParticionados_('c1') + '\\' + item.arquivo);
  h.io.length = 0;
  h.c.transferirAtletaElenco({
    campeonatoId: 'c1', equipeId: 'e1', registroId: 'athlete', equipeDestinoId: 'e2'
  });
  const reads = h.io.filter(item => item.operacao === 'read').map(item => item.name);
  assert(thirdTeam.every(name => !reads.includes(name)));
  assert.equal(h.c.lerElencoParticionado_('c1', 'atletas').find(item => item.id === 'athlete').timeVinculado, 'Equipe B');
  assert.equal(h.index().cadastros.atletas['52998224725'][0][1], h.c.chaveEquipe_('Equipe B'));
});

test('missing compact base scans live sources and rejects duplicate writes while leaving the index dirty', () => {
  const h = fixture(true);
  h.state.equipes.push({ id: 'e3', nome: 'Equipe C' });
  activeSeed(h, 'comissao', [
    person('comissao'),
    person('comissao', { id: 'staff-b', nome: 'Outro membro', timeVinculado: 'Equipe B' })
  ]);
  h.build();
  h.withLock(() => h.c.invalidarIndiceValidacao_('c1'));
  const revision = JSON.parse(h.files.get(h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json')).revisao;
  h.io.length = 0;
  assert.throws(() => h.c.salvarCadastroElenco({
    ...h.payload('comissao'), cpf: '11144477735', nome: 'Outra pessoa'
  }), /CPF j[aá] cadastrado/);
  assert(h.meta().dirty);
  assert.equal(h.c.consultarIndiceValidacao_('c1'), null, 'dirty base cannot authorize use');
  assert.equal(JSON.parse(h.files.get(h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json')).revisao, revision);
  const rosterReads = h.io.filter(item => item.operacao === 'read' && item.name.includes('\\Comissao Tecnica -'))
    .map(item => item.name);
  assert(rosterReads.length > 0, 'fallback reads current roster partitions instead of trusting dirty properties');
});

for (const tipo of ['atletas', 'comissao']) {
  test(`dirty active index rejects ${tipo} CPF from another category on another team`, () => {
    const h = fixture(true);
    const outroTipo = tipo === 'atletas' ? 'comissao' : 'atletas';
    activeSeed(h, outroTipo, [person(outroTipo, { timeVinculado: 'Equipe B' })]);
    h.build();
    h.withLock(() => h.c.invalidarIndiceValidacao_('c1'));
    const path = h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json';
    const before = h.files.get(path);
    assert.throws(() => h.c.salvarCadastroElenco({
      ...h.payload(tipo), cpf: person(outroTipo).cpf
    }), /Este CPF já está cadastrado/);
    assert.equal(h.files.get(path), before);
    assert.equal(h.c.lerElencoParticionado_('c1', tipo).length, 0);
  });

  for (const trusted of [true, false]) {
    test(`active ${tipo} import rejects similar names within batch with ${trusted ? 'trusted' : 'dirty'} index`, () => {
      const h = fixture(true);
      activeSeed(h, tipo, [
        person(tipo, { id: 'previous-1', nome: 'Ana Souza', cpf: '52998224725' }),
        person(tipo, { id: 'previous-2', nome: 'Ana Souza Silva', cpf: '11144477735' })
      ], 'c2');
      h.build();
      if (!trusted) h.withLock(() => h.c.invalidarIndiceValidacao_('c1'));
      const listed = h.c.listarImportacaoElenco({
        campeonatoId: 'c1', equipeId: 'e1', tipo, origemId: 'c2'
      });
      assert.equal(listed.candidatos.length, 2);
      assert(listed.candidatos.every(item => !item.motivo));
      const before = [...h.files];
      assert.throws(() => h.c.importarCadastrosElenco({
        campeonatoId: 'c1', equipeId: 'e1', tipo, origemId: 'c2',
        inscricaoIds: listed.candidatos.map(item => item.id)
      }), /Nome similar já cadastrado/);
      assert.deepEqual([...h.files], before, 'entire batch fails before any persistent write');
      assert.equal(h.c.lerElencoParticionado_('c1', tipo).length, 0);
    });
  }
}

test('external edit to an unrelated partition during staging blocks the manifest commit', () => {
  const h = fixture(true);
  activeSeed(h, 'comissao', [
    person('comissao'),
    person('comissao', { id: 'staff-b', nome: 'Equipe B staff', cpf: '12345678909', timeVinculado: 'Equipe B' })
  ]);
  h.build();
  const manifestName = h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json';
  const previousManifest = h.files.get(manifestName);
  const unrelated = activePath(h, 'comissao', 'e2');
  const original = h.files.get(unrelated);
  let tampered = false;
  h.state.onWrite = name => {
    if (!tampered && name.includes('\\Comissao Tecnica - e1 -')) {
      tampered = true;
      h.files.set(unrelated, JSON.stringify([person('comissao', {
        id: 'staff-b', nome: 'External edit', cpf: '12345678909', timeVinculado: 'Equipe B'
      })]));
    }
  };
  assert.throws(() => h.c.salvarCadastroElenco({ ...h.payload('comissao'), cpf: '24681357928' }));
  h.state.onWrite = null;
  assert(tampered);
  assert.equal(h.files.get(manifestName), previousManifest);
  assert(h.meta().dirty);
  assert.equal(JSON.parse(h.files.get(unrelated))[0].nome, 'External edit');
  h.files.set(unrelated, original);
});

test('unavailable Drive metadata prevents an active scoped mutation rather than authorizing stale sources', () => {
  const h = fixture(true);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.build();
  const manifestName = h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json';
  const previousManifest = h.files.get(manifestName);
  h.state.failMetadata = true;
  assert.throws(() => h.c.salvarCadastroElenco({ ...h.payload('comissao'), cpf: '24681357928' }));
  assert.equal(h.files.get(manifestName), previousManifest);
  assert.equal(h.c.lerElencoParticionado_('c1', 'comissao').length, 1);
});

for (const failure of ['chunk', 'publish']) test(`active V2 incremental ${failure} failure stays dirty and falls back live`, () => {
  const h = fixture(true);
  h.build();
  h.state.failIndexWrite = failure;
  h.c.salvarCadastroElenco(h.payload('comissao'));
  assert.equal(h.c.lerElencoParticionado_('c1', 'comissao').length, 1);
  assert(h.meta().dirty);
  assert.equal(h.index(), null);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '11144477735', 'atleta', ''), /comissão técnica/);
  h.state.failIndexWrite = null;
  assert.equal(h.build(), 'reconciliado');
  assert(h.index().cadastros.comissao['11144477735']);
});

test('active V2 rechecks all fingerprints immediately before clean publication', () => {
  const h = fixture(true);
  activeSeed(h, 'atletas', [person('atletas')]);
  h.build();
  let changed = false;
  h.state.onIndexChunkWrite = () => {
    if (changed) return;
    changed = true;
    h.files.set(activePath(h, 'atletas'), JSON.stringify([person('atletas', {
      id: 'athlete', cpf: '12345678909', foto: 'external-change'
    })]));
  };
  h.c.salvarCadastroElenco(h.payload('comissao'));
  h.state.onIndexChunkWrite = null;
  assert(changed);
  assert(h.meta().dirty);
  assert.equal(h.index(), null);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '12345678909', 'comissao', ''), /lista de atletas/);
  assert.equal(h.build(), 'reconciliado');
  assert(h.index().cadastros.atletas['12345678909']);
});

test('active gate rejects an otherwise valid old V1 payload automatically and rebuilds from partitions', () => {
  const h = fixture(true);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.build();
  const meta = h.meta(), index = h.index(), prefix = h.c.chaveIndiceValidacao_('c1');
  index.versao = meta.versao = 1;
  const text = JSON.stringify(index);
  meta.digest = h.c.digestIndiceValidacao_(text);
  h.properties.set(prefix + meta.token + '_0', text);
  h.properties.set(prefix + 'meta', JSON.stringify(meta));
  assert.equal(h.index(), null);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '11144477735', 'atleta', ''), /comissão técnica/);
  assert.equal(h.build(), 'reconciliado');
  assert.equal(h.meta().versao, 2);
});

for (const change of ['edit', 'remove', 'corrupt', 'manifest-edit', 'manifest-remove', 'folder-remove', 'team-name']) {
  test(`active live fingerprint detects ${change}, never relying on legacy metadata or a cached index`, () => {
    const h = fixture(true);
    activeSeed(h, 'comissao', [person('comissao')]);
    h.build();
    const resources = {};
    h.withLock(() => {
      assert(h.c.consultarIndiceValidacao_('c1', resources, 'comissao'));
      const file = activePath(h), manifest = h.c.nomePastaElencosParticionados_('c1') + '\\manifesto.json';
      if (change === 'edit') h.files.set(file, JSON.stringify([person('comissao', { cpf: '12345678909' })]));
      if (change === 'remove') h.files.delete(file);
      if (change === 'corrupt') h.files.set(file, '{broken');
      if (change === 'manifest-edit') {
        const doc = JSON.parse(h.files.get(manifest)); doc.revisao = 'external';
        h.files.set(manifest, JSON.stringify(doc));
      }
      if (change === 'manifest-remove') h.files.delete(manifest);
      if (change === 'folder-remove') h.folders.clear();
      if (change === 'team-name') h.state.equipes[0].nome = 'Renamed Team';
      assert.equal(h.c.consultarIndiceValidacao_('c1', resources, 'comissao'), null);
    });
    assert.equal(h.index(), null);
    if (['remove', 'corrupt'].includes(change)) {
      assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '11144477735', 'atleta', ''));
      assert.throws(() => h.build());
    } else {
      if (change === 'edit') assert.throws(() =>
        h.c.validarCpfUnicoEntreCadastros_('c1', '12345678909', 'atleta', ''), /comissão técnica/);
      assert.equal(h.build(), 'reconciliado');
      assert(h.index());
    }
  });
}

test('active index scheduled reconciler and races use new sources without publishing a stale build', () => {
  const h = fixture(true);
  activeSeed(h, 'comissao', [person('comissao')]);
  h.c.configurarAgendamentoIndicesValidacao();
  const trigger = h.triggers.find(t => t.handler === 'reconciliarIndicesValidacaoAgendado');
  const result = h.c.reconciliarIndicesValidacaoAgendado({ triggerUid: trigger.id });
  assert.equal(result.resultados.reconciliado, 2);
  assert(h.index().cadastros.comissao['11144477735']);
  const read = h.c.lerElencoBrutoOperacao_;
  let changed = false;
  h.withLock(() => h.c.invalidarIndiceValidacao_('c1'));
  h.c.lerElencoBrutoOperacao_ = (...args) => {
    const list = read(...args);
    assert(!h.locked());
    if (!changed) {
      changed = true;
      h.files.set(activePath(h), JSON.stringify([person('comissao', { cpf: '12345678909' })]));
    }
    return list;
  };
  assert.equal(h.build(), 'concorrente');
  assert.equal(h.index(), null);
  h.c.lerElencoBrutoOperacao_ = read;
  assert.equal(h.build(), 'reconciliado');
  assert(h.index().cadastros.comissao['12345678909']);
});

test('compact private index: complete ID OR normalized CPF/team evidence; source checks, not TTL', () => {
  const h = fixture();
  const current = person('atletas');
  h.seed('c1', 'atletas', [current]);
  h.seed('c1', 'comissao', [person('comissao')]);
  h.games([h.game(person('atletas', { id: 'old-id', cpf: '529.982.247-25' }), 'e2'),
    { ...h.game(current), id: 'second' }]);
  assert.equal(h.build(), 'reconciliado');
  const before = { ...h.counts };
  const jogos = h.c.jogosParticipacaoOperacao_('c1');
  assert.deepEqual(clone(h.c.equipesParticipacaoAtleta_(jogos, current)), ['e2', 'e1']);
  assert.deepEqual(clone(h.c.equipesParticipacaoAtleta_(jogos, current)),
    clone(h.c.equipesParticipacaoAtleta_(h.c.jogosParticipacaoCampeonato_('c1'), current)));
  assert.deepEqual(clone(h.c.equipesParticipacaoAtleta_(jogos, { id: 'old-id', cpf: 'different' })), ['e2']);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '11144477735', 'atleta', ''), /comissão técnica/);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', current.cpf, 'comissao', ''), /lista de atletas/);
  assert.equal(h.counts.rosters, before.rosters);
  assert.equal(h.counts.tables, before.tables + 1, 'only the explicit live equivalence read above');
  const entries = JSON.stringify([...h.properties].filter(([key]) => key.startsWith('INDICE_VALIDACAO')));
  for (const value of ['photo', 'Carlos Silva', 'Mariana Costa', '2000-01-01', '"rg"']) assert(!entries.includes(value));
  assert.equal(h.meta().dirty, false);
  assert.equal(h.build(), 'atual');
  assert.equal(h.counts.locks, 1, 'up-to-date scheduled reconciliation acquires no lock');
});

for (const tipo of ['atletas', 'comissao']) test(`${tipo}: synchronous incremental add/edit/delete, no extra lock or full rebuild`, () => {
  const h = fixture();
  h.build();
  const old = h.meta().token;
  const added = h.c.salvarCadastroElenco(h.payload(tipo));
  const item = h.roster('c1', tipo)[0];
  assert.notEqual(h.meta().token, old);
  assert(h.index().cadastros[tipo][item.cpf]);
  assert.equal(h.counts.locks, 2);
  assert(added.registros[0][tipo].length);
  h.c.salvarCadastroElenco({ ...h.payload(tipo), registroId: item.id, cpf: '12345678909' });
  assert(!h.index().cadastros[tipo][item.cpf]);
  assert(h.index().cadastros[tipo]['12345678909']);
  h.c.removerCadastroElenco({ campeonatoId: 'c1', equipeId: 'e1', tipo, registroId: item.id });
  assert.deepEqual(h.index().cadastros[tipo], {});
  assert.equal(h.counts.locks, 4);
  assert.equal(h.counts.tables, 1, 'only initial build reads full table');
  for (const [key, value] of h.properties) {
    assert(Buffer.byteLength(value) <= 9000, key);
    if (key.startsWith(h.c.chaveIndiceValidacao_('c1')) && !key.endsWith('meta')) {
      assert(key.includes(h.meta().token), 'superseded chunks cleaned');
    }
  }
});

test('transfer updates normalized team synchronously; existing history snapshots and checks remain', () => {
  const h = fixture();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.build();
  h.c.transferirAtletaElenco({ campeonatoId: 'c1', equipeId: 'e1', registroId: 'athlete', equipeDestinoId: 'e2' });
  assert.equal(h.index().cadastros.atletas['52998224725'][0][1], h.c.chaveEquipe_('Equipe B'));
  assert.equal(h.counts.locks, 2);
  h.c.processarHistoricoElencoAgora();
  const snapshots = h.history().inscricoes.filter(item => item.registroId === 'athlete');
  assert(snapshots.some(item => item.equipeId === 'e1' && !item.presente));
  assert(snapshots.some(item => item.equipeId === 'e2' && item.presente));
  h.state.perfil = 'associado';
  assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), /já está cadastrado na equipe Equipe B/);
});

test('photo/name-only mutations reuse compact generation; validators check only their relevant source', () => {
  const h = fixture();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.build();
  const metadata = h.counts.metadata;
  h.c.validarCpfUnicoEntreCadastros_('c1', '12345678909', 'atleta', '');
  assert.equal(h.counts.metadata, metadata + 1);
  // The table does not exist: fresh absence lookup, not a Drive metadata/blob read.
  const tables = h.counts.tables;
  h.c.jogosParticipacaoOperacao_('c1');
  assert.equal(h.counts.tables, tables);
  const token = h.meta().token, chunks = h.counts.indexChunkWrites;
  h.c.salvarCadastroElenco({ ...h.payload('atletas', true), foto: 'updated-photo' });
  assert.equal(h.roster('c1', 'atletas')[0].foto, 'updated-photo');
  assert.equal(h.meta().token, token);
  assert.equal(h.counts.indexChunkWrites, chunks);
  assert.equal(h.meta().dirty, false);
  assert(h.index());
});

test('historical import updates index only after every selection passes existing live preflight', () => {
  for (const conflito of [false, true]) {
    const h = fixture();
    h.seed('c2', 'atletas', [person('atletas', { id: 'old-id' })]);
    if (conflito) h.seed('c1', 'comissao', [person('comissao', { cpf: '52998224725' })]);
    h.build();
    const list = h.c.listarImportacaoElenco({ campeonatoId: 'c1', equipeId: 'e1', tipo: 'atletas', origemId: 'c2' });
    const payload = { campeonatoId: 'c1', equipeId: 'e1', tipo: 'atletas',
      origemId: 'c2', inscricaoIds: list.candidatos.map(item => item.id) };
    if (conflito) {
      const token = h.meta().token;
      assert.throws(() => h.c.importarCadastrosElenco(payload), /comissão técnica/);
      assert.equal(h.roster('c1', 'atletas').length, 0);
      assert.equal(h.meta().token, token);
    } else {
      const result = h.c.importarCadastrosElenco(payload);
      assert.equal(result.quantidade, 1);
      const registro = h.roster('c1', 'atletas')[0];
      assert.notEqual(registro.id, 'old-id');
      assert.equal(h.index().cadastros.atletas['52998224725'][0][0], registro.id);
    }
  }
});

test('trusted participation blocks removal/transfer/CPF or team mutation, old/current identities and new links', () => {
  for (const participante of [
    person('atletas', { cpf: '11144477735' }),
    person('atletas', { id: 'obsolete', cpf: '529.982.247-25' })
  ]) {
    const h = fixture();
    h.seed('c1', 'atletas', [person('atletas')]);
    h.games([h.game(participante, 'e2')]);
    h.build();
    const writes = h.writes.length;
    for (const fn of [
      () => h.c.removerCadastroElenco(h.payload('atletas', true)),
      () => h.c.transferirAtletaElenco({ ...h.payload('atletas', true), equipeDestinoId: 'e2' }),
      () => h.c.salvarCadastroElenco({ ...h.payload('atletas', true), cpf: '12345678909' }),
      () => h.c.atualizarAtletaCampeonato({ ...person('atletas'), atletaId: 'athlete',
        campeonatoId: 'c1', timeVinculado: 'Equipe B' })
    ]) assert.throws(fn, /já participou/);
    assert.equal(h.writes.length, writes);
    assert.equal(h.counts.tables, 1);
  }
  const h = fixture();
  h.games([h.game(person('atletas', { id: 'historical' }), 'e2')]);
  h.build();
  assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), /não pode ser vinculado/);
});

test('external Drive/legacy changes invalidate immediately, before any five-minute reconciliation', () => {
  for (const change of ['staff', 'game', 'legacy', 'replacement']) {
    const h = fixture();
    h.seed('c1', 'atletas', [person('atletas')]);
    h.build();
    if (change === 'staff') h.seed('c1', 'comissao', [person('comissao', { cpf: '12345678909' })]);
    if (change === 'legacy') {
      h.drive.trash(rosterFile('c1', 'comissao'));
      h.properties.set(h.c.chaveComissaoTecnicaCampeonato_('c1'),
        JSON.stringify([person('comissao', { cpf: '12345678909' })]));
    }
    if (change === 'replacement') h.drive.replace(rosterFile('c1', 'comissao'),
      JSON.stringify([person('comissao', { cpf: '12345678909' })]));
    if (change === 'game') h.games([h.game()]);
    assert.equal(h.index(), null);
    assert.throws(() => change === 'game'
      ? h.c.removerCadastroElenco(h.payload('atletas', true))
      : h.c.salvarCadastroElenco({ ...h.payload('atletas', true), cpf: '12345678909' }),
    change === 'game' ? /já participou/ : /comissão técnica/);
    assert.equal(h.writes.length, 0);
    assert.equal(h.build(), 'reconciliado');
    assert(h.index());
  }
});

for (const failure of ['chunk', 'publish']) test(`failed ${failure}: committed source stays successful; dirty forces live validation`, () => {
  const h = fixture();
  h.build();
  h.state.failIndexWrite = failure;
  h.c.salvarCadastroElenco(h.payload('comissao'));
  assert.equal(h.roster('c1', 'comissao').length, 1);
  assert(h.meta().dirty);
  assert.equal(h.index(), null);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '11144477735', 'atleta', ''), /comissão técnica/);
  h.state.failIndexWrite = null;
  assert.equal(h.build(), 'reconciliado');
  assert(h.index().cadastros.comissao['11144477735']);
});

test('dirty marker failure prevents source write; source/history failures preserve recovery, no stale authorization', () => {
  for (const failure of ['dirty', 'source', 'history']) {
    const h = fixture();
    let originalHistorico = null;
    h.seed('c1', 'atletas', [person('atletas')]);
    h.build();
    if (failure === 'dirty') h.state.failIndexWrite = 'dirty';
    if (failure === 'source') h.state.failRoster = true;
    if (failure === 'history') {
      originalHistorico = h.c.gravarHistoricoElenco_;
      let writes = 0;
      h.c.gravarHistoricoElenco_ = (...args) => {
        if (++writes === 2) throw Error('history failure');
        return originalHistorico(...args);
      };
    }
    if (failure === 'history') {
      h.c.removerCadastroElenco(h.payload('atletas', true));
      assert.throws(() => h.c.processarHistoricoElencoAgora(), /pendências foram preservadas/);
      assert.equal(h.roster('c1', 'atletas').length, 0);
      assert.deepEqual(h.index().cadastros.atletas, {});
    } else {
      assert.throws(() => h.c.removerCadastroElenco(h.payload('atletas', true)));
      assert.equal(h.roster('c1', 'atletas').length, 1);
      assert(!h.writes.includes(rosterFile('c1', 'atletas')));
      if (failure === 'source') assert(h.meta().dirty);
    }
    assert(!h.locked());
    h.state.failIndexWrite = null;
    h.state.failRoster = false;
    if (originalHistorico) h.c.gravarHistoricoElenco_ = originalHistorico;
    h.c.processarHistoricoElencoAgora();
    assert(h.history().inscricoes.some(item => item.registroId === 'athlete'));
  }
});

test('corruption, inaccessible index/metadata and invalid sources never authorize a mutation', () => {
  for (const failure of ['chunk', 'read', 'metadata', 'invalid-result', 'invalid-roster']) {
    const h = fixture();
    h.seed('c1', 'atletas', [person('atletas')]);
    h.games([h.game()]);
    h.build();
    if (failure === 'chunk') h.properties.delete(h.c.chaveIndiceValidacao_('c1') + h.meta().token + '_0');
    if (failure === 'read') h.state.failIndexRead = true;
    if (failure === 'metadata') h.state.failMetadata = true;
    if (failure === 'invalid-result') {
      const game = h.game(); game.resultado.equipes = [];
      h.games([game]);
    }
    if (failure === 'invalid-roster') h.files.set(rosterFile('c1', 'atletas'), '{invalid');
    assert.equal(h.index(), null);
    assert.throws(() => h.c.removerCadastroElenco(h.payload('atletas', true)), /já participou|inválido/);
    assert(!h.writes.includes(rosterFile('c1', 'atletas')));
    assert(!h.locked());
  }
});

test('malformed index metadata fall back live and reconciliation repairs atomically, never as an empty authorized index', () => {
  for (const corrupted of ['null', '[]', '{invalid']) {
    const h = fixture();
    h.seed('c1', 'comissao', [person('comissao')]);
    h.build();
    h.properties.set(h.c.chaveIndiceValidacao_('c1') + 'meta', corrupted);
    assert.equal(h.index(), null);
    assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', '11144477735', 'atleta', ''), /comissão técnica/);
    assert.equal(h.build(), 'reconciliado');
    assert(h.index().cadastros.comissao['11144477735']);
  }
});

test('corrupt payload is safely rejected and rebuilt; reconciliation metadata checks stay outside ScriptLock', () => {
  const h = fixture();
  h.seed('c1', 'comissao', [person('comissao')]);
  h.build();
  const chave = h.c.chaveIndiceValidacao_('c1'), meta = h.meta();
  const texto = '{broken';
  h.properties.set(chave + meta.token + '_0', texto);
  meta.digest = h.c.digestIndiceValidacao_(texto);
  h.properties.set(chave + 'meta', JSON.stringify(meta));
  assert.equal(h.index(), null);
  h.state.onMetadata = () => assert(!h.locked(), 'Drive metadata checks cannot hold the shared mutation lock');
  assert.equal(h.build(), 'reconciliado');
  assert(h.index().cadastros.comissao['11144477735']);
});

test('result edits/remove game recompute all participation, including removed old evidence and participou=false', () => {
  const h = fixture();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.games([h.game(person('atletas', { id: 'legacy-id' }))]);
  h.build();
  const original = h.index().participacao;
  assert(original['["id","legacy-id"]']);
  const screen = h.c.carregarTabelaCampeonatoAtual('c1');
  const resultado = h.c.listarResultadoJogoCampeonato({ campeonatoId: 'c1', id: 'game' });
  const entrada = clone(resultado.equipes);
  for (const equipe of entrada) for (const pessoa of equipe.atletas) pessoa.participou = false;
  const updated = h.c.salvarResultadoJogoCampeonato({
    campeonatoId: 'c1', id: 'game', revisao: screen.revisao, revisaoElencos: resultado.revisaoElencos,
    resultado: resultado.resultado, equipes: entrada, golsMandante: 0, golsVisitante: 0
  });
  assert.deepEqual(h.index().participacao, {});
  assert.equal(h.meta().dirty, false);
  h.c.removerJogoCampeonato({ campeonatoId: 'c1', id: 'game', revisao: updated.revisao });
  assert.deepEqual(h.index().participacao, {});
  h.c.removerCadastroElenco(h.payload('atletas', true));
  assert.equal(h.roster('c1', 'atletas').length, 0);
});

test('only closed detailed results with participou===true count; schema failures cannot publish a partial rebuild', () => {
  const h = fixture();
  const inactive = h.game(); inactive.resultado.equipes[0].atletas[0].participou = false;
  h.games([inactive, { ...h.game(), id: 'score-only', resultado: undefined }]);
  h.build();
  assert.deepEqual(h.index().participacao, {});
  const invalid = h.game(); invalid.resultado.equipes = [];
  h.games([invalid]);
  const token = h.meta().token;
  assert.throws(() => h.build(), /inválido/);
  assert.equal(h.meta().token, token);
  assert.equal(h.index(), null);
});

test('concurrent mutations/external changes/deletion during out-of-lock build cannot publish stale data', () => {
  for (const change of ['external', 'system', 'deleted']) {
    const h = fixture();
    let changed = false;
    const read = h.c.lerElencoBrutoOperacao_;
    h.c.lerElencoBrutoOperacao_ = (...args) => {
      assert(!h.locked(), 'reconciliation full source read outside ScriptLock');
      const value = read(...args);
      if (!changed) {
        changed = true;
        if (change === 'external') h.seed('c1', 'atletas', [person('atletas')]);
        if (change === 'system') h.withLock(() => h.c.invalidarIndiceValidacao_('c1'));
        if (change === 'deleted') h.state.campeonatos = h.state.campeonatos.filter(c => c.id !== 'c1');
      }
      return value;
    };
    assert.equal(h.build(), 'concorrente');
    assert.equal(h.meta().dirty, change === 'system' ? true : undefined);
    assert.equal(h.index(), null);
  }
  const h = fixture();
  h.state.busy = true;
  assert.equal(h.build(), 'concorrente');
  assert.equal(h.counts.locks, 0);
  assert.equal(h.index(), null);
});

test('source changed after setContent cannot falsely publish the in-memory delta', () => {
  const h = fixture();
  h.build();
  h.state.onRoster = () => h.seed('c1', 'atletas', [person('atletas', { cpf: '12345678909' })]);
  h.c.salvarCadastroElenco(h.payload('atletas'));
  assert(h.meta().dirty);
  assert.equal(h.index(), null);
  h.state.onRoster = null;
  h.build();
  assert(h.index().cadastros.atletas['12345678909']);
});

test('bounded UTF-8 chunks and quota overflow fall back without failing committed save', () => {
  const h = fixture();
  h.build();
  h.properties.set('unrelated-large-fixture', 'x'.repeat(449000));
  h.c.salvarCadastroElenco(h.payload('comissao'));
  assert(h.meta().dirty);
  assert.equal(h.roster('c1', 'comissao').length, 1);
  h.properties.delete('unrelated-large-fixture');
  h.seed('c1', 'atletas', Array.from({ length: 240 }, (_, i) => person('atletas', {
    id: 'p' + i, cpf: String(10000000000 + i), timeVinculado: 'Equipe á'.repeat(8)
  })));
  h.build();
  assert(h.meta().chunks > 1);
  for (const [key, value] of h.properties) if (key.startsWith('INDICE_VALIDACAO')) {
    assert(Buffer.byteLength(value) <= 9000);
  }
  assert.equal(Object.keys(h.index().cadastros.atletas).length, 240);
});

test('championship key isolation and deletion never reuse another championship or its old chunks', () => {
  const h = fixture();
  h.state.campeonatos.push({ id: 'c1_suffix', nome: 'Outro' });
  h.seed('c1_suffix', 'atletas', [person('atletas')]);
  h.seed('c1_suffix', 'comissao', []);
  h.build('c1_suffix');
  h.build('c1');
  assert(h.index('c1_suffix').cadastros.atletas['52998224725']);
  h.withLock(() => h.c.removerCadastroPessoasCampeonato_('c1'));
  assert.equal(h.index('c1'), null);
  assert(h.index('c1_suffix'));
});

test('live team/championship guards survive trusted index and successful championship removal cleans only its namespace', () => {
  const h = fixture();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.build('c1');
  h.build('c2');
  assert.throws(() => h.c.removerTimeCampeonato('c1', 'Equipe A'), /possui.*atleta/);
  assert.throws(() => h.c.removerEquipe('Equipe A'), /ainda tem/);
  h.state.times = { c1: ['Equipe B'], c2: ['Equipe A', 'Equipe B'] };
  assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas', true)), /não está vinculada/);
  h.state.times = null;
  h.c.removerCampeonato('c1');
  assert.equal([...h.properties.keys()].filter(key => key.startsWith(h.c.chaveIndiceValidacao_('c1'))).length, 0);
  assert(h.index('c2'));
  assert(h.history().inscricoes.some(item => item.campeonatoId === 'c1'));
});

test('admin-only index trigger validates live owned handler and adopts recreated UID; untouched schedules', () => {
  const h = fixture();
  const unrelated = h.trigger(h.state.email, 'atualizarTabelaAgendada');
  const otherOwner = h.trigger('other@example.invalid', 'reconciliarIndicesValidacaoAgendado');
  h.c.configurarAgendamentoIndicesValidacao();
  h.c.configurarAgendamentoIndicesValidacao();
  const own = h.triggers.filter(t => !t.deleted && t.handler === 'reconciliarIndicesValidacaoAgendado'
    && t.owner === h.state.email);
  assert.equal(own.length, 1);
  assert.throws(() => h.c.reconciliarIndicesValidacaoAgendado({ triggerUid: unrelated.id }), /Gatilho/);
  const recreated = h.trigger(h.state.email, 'reconciliarIndicesValidacaoAgendado');
  own[0].deleted = true;
  const result = h.c.reconciliarIndicesValidacaoAgendado({ triggerUid: recreated.id });
  assert.equal(result.resultados.reconciliado, 2);
  h.c.configurarAgendamentoIndicesValidacao();
  assert(!recreated.deleted);
  assert.equal(h.triggers.filter(t => !t.deleted && t.owner === h.state.email
    && t.handler === 'reconciliarIndicesValidacaoAgendado').length, 1);
  const status = h.c.obterStatusIndicesValidacao();
  assert.equal(status.agendado, true);
  assert(!('intervaloMinutos' in status));
  const locks = h.counts.locks;
  h.c.reconciliarIndicesValidacaoAgendado({ triggerUid: recreated.id });
  assert.equal(h.counts.locks, locks, 'up-to-date trigger has zero lock contention');
  h.state.effective = 'other@example.invalid';
  assert.throws(() => h.c.desativarAgendamentoIndicesValidacao(), /outra conta/);
  h.state.effective = h.state.email;
  h.c.desativarAgendamentoIndicesValidacao();
  assert(!unrelated.deleted && !otherOwner.deleted);
  assert(own[0].deleted);
  assert(recreated.deleted);
  assert.equal(h.c.obterStatusIndicesValidacao().agendado, false);
  h.state.perfil = 'associado';
  for (const method of ['obterStatusIndicesValidacao', 'configurarAgendamentoIndicesValidacao',
    'desativarAgendamentoIndicesValidacao', 'reconciliarIndicesValidacaoAgora']) {
    assert.throws(() => h.c[method](), /administrador/);
  }
});

test('scheduled isolated errors/status and no PII in logs or associated responses', () => {
  const h = fixture();
  h.games([]);
  h.state.failMetadata = true;
  const failed = h.c.reconciliarIndicesValidacaoAgora();
  assert.equal(failed.resultados.falhas, 2);
  assert.match(failed.erro, /Falha ao reconciliar/);
  assert(!JSON.stringify(failed).includes('52998224725'));
  h.state.failMetadata = false;
  h.c.reconciliarIndicesValidacaoAgora();
  h.state.perfil = 'associado';
  const response = h.c.listarElenco('c1', 'e1');
  assert(!('indicesValidacao' in response));
  assert(!('cadastros' in response));
  assert(!('indiceParticipacao' in response));
  const logs = JSON.stringify(h.logs);
  assert(!logs.includes('52998224725') && !logs.includes('sensitive metadata'));
  assert(!logs.includes('photo') && !logs.includes('admin@example.invalid'));
});

test('scheduled failures signal execution error independently; top-level source failures persist sanitized status', () => {
  const h = fixture();
  h.games([]);
  h.c.configurarAgendamentoIndicesValidacao();
  const trigger = h.triggers.find(t => !t.deleted);
  h.state.failMetadata = true;
  assert.throws(() => h.c.reconciliarIndicesValidacaoAgendado({ triggerUid: trigger.id }), /Falha ao reconciliar/);
  assert(h.c.obterStatusIndicesValidacao().erro);
  h.state.failMetadata = false;
  const campeonatos = h.c.campeonatos_;
  h.c.campeonatos_ = () => { throw Error('source error 52998224725'); };
  assert.throws(() => h.c.reconciliarIndicesValidacaoAgora(), /Nao foi possivel concluir/);
  h.c.campeonatos_ = campeonatos;
  const estado = h.c.obterStatusIndicesValidacao();
  assert.match(estado.erro, /Nao foi possivel concluir/);
  assert(!JSON.stringify(estado).includes('52998224725'));
});

test('frontend parses and uses dedicated guarded admin controls; manifest retains USER_ACCESSING', () => {
  assert.doesNotMatch(html, /a cada (?:5|15) minutos|Configurar a cada \d+ minutos/i);
  assert.match(html, /Apps Script &gt; Acionadores/);
  for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    new vm.Script(script.replace(/<\?[\s\S]*?\?>/g, 'null'));
  }
  assert.match(html, /data-indice-validacao="reconciliarIndicesValidacaoAgora"/);
  assert.match(html, /data-indice-validacao="desativarAgendamentoIndicesValidacao"/);
  assert.match(html, /versao === consulta/);
  assert.match(source, /if \(!lock\.tryLock\(1\)\) return false/);
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'appsscript.json'), 'utf8'));
  assert.equal(manifest.webapp.executeAs, 'USER_ACCESSING');
  assert(manifest.dependencies.enabledAdvancedServices.some(service => service.serviceId === 'drive' && service.version === 'v3'));
});
