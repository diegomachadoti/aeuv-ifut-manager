const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, person, historyFile, rosterFile, participation } = require('./save-fixture.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const withLock = (h, fn) => {
  const lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  try { return fn(); } finally { lock.releaseLock(); }
};
const folderName = (h, id = 'c1') => h.c.nomePastaElencosParticionados_(id);
const manifestPath = (h, id = 'c1') => folderName(h, id) + '\\manifesto.json';
const write = (h, changes, id = 'c1') => withLock(h, () => h.c.gravarParticoesElenco_(id, changes));
const partition = (equipeId, tipo, registros) => ({ equipeId, tipo, registros });
const read = (h, id = 'c1', tipo = 'atletas') => clone(h.c.lerElencoParticionado_(id, tipo));
const manifest = (h, id = 'c1') => JSON.parse(h.files.get(manifestPath(h, id)));
const teamRead = (h, team, tipo = 'atletas') => clone(h.c.lerParticaoElenco_('c1', team, tipo));
const transfer = h => withLock(h, () =>
  h.c.transferirRegistroParticionado_('c1', 'atletas', 'athlete', 'e1', 'e2', 'Equipe B'));
const seedTransfer = h => write(h, [
  partition('e1', 'atletas', [person('atletas')]),
  partition('e2', 'atletas', [person('atletas', { id: 'other', cpf: '12345678909', timeVinculado: 'Equipe B' })]),
  partition('e1', 'comissao', [person('comissao')])
]);
const assertAtomicTransfer = (h, committed) => {
  const origin = teamRead(h, 'e1'), target = teamRead(h, 'e2');
  assert.equal(origin.filter(item => item.id === 'athlete').length, committed ? 0 : 1);
  assert.equal(target.filter(item => item.id === 'athlete').length, committed ? 1 : 0);
  assert.equal(read(h).filter(item => item.id === 'athlete').length, 1);
  assert.equal(target.find(item => item.id === 'other').cpf, '12345678909');
  assert.equal(read(h, 'c1', 'comissao')[0].id, 'staff');
};

test('inactive vertical slice: new reads start empty and ignore legacy JSON/properties without creating anything', () => {
  const h = harness();
  assert.equal(h.c.elencosParticionadosCutoverAtivo_(), false);
  h.seed('c1', 'atletas', [person('atletas')]);
  h.seed('c1', 'comissao', [person('comissao')]);
  h.properties.set(h.c.chaveAtletasCampeonato_('c1'), '[{"nome":"Legado"}]');
  const before = [...h.files], properties = [...h.properties];
  assert.deepEqual(read(h), []);
  assert.deepEqual(read(h, 'c1', 'comissao'), []);
  assert.deepEqual(teamRead(h, 'e1'), []);
  assert.equal(h.folders.size, 0);
  assert.equal(h.writes.length, 0);
  assert.deepEqual([...h.files], before);
  assert.deepEqual([...h.properties], properties);
  assert(!h.io.some(item => item.name === rosterFile('c1', 'atletas')));
  // Cutover is NOT activated: current RPC consumers still read legacy data.
  assert.equal(h.c.atletasCampeonato_('c1', false)[0].id, 'athlete');
});

test('inactive cutover: current consumers, history, import and mutations use legacy contracts, never a mixed source', () => {
  const h = harness();
  h.useRealContextFiles();
  const athlete = person('atletas'), staff = person('comissao');
  h.seed('c1', 'atletas', [athlete]);
  h.seed('c1', 'comissao', [staff, person('comissao', { id: 'inactive-staff', ativo: false })]);
  h.seed('c2', 'atletas', [person('atletas', {
    id: 'previous-athlete', nome: 'Anterior Importavel', cpf: '12345678909'
  })]);
  write(h, [
    partition('e1', 'atletas', [person('atletas', { id: 'partition-athlete', cpf: '12345678909' })]),
    partition('e1', 'comissao', [person('comissao', { id: 'partition-staff', cpf: '98765432100' })])
  ]);
  const newFiles = [...h.files].filter(([name]) => name.startsWith(folderName(h)));
  // Fail immediately if even one consumer is prematurely routed to the new store.
  for (const helper of ['lerParticaoElenco_', 'lerElencoParticionado_', 'gravarParticoesElenco_',
    'transferirRegistroParticionado_', 'assinaturaFontesElencoParticionado_']) {
    h.c[helper] = () => { throw Error('RPC cutover must remain entirely inactive'); };
  }
  for (const tipo of ['atletas', 'comissao']) {
    const normal = tipo === 'atletas' ? h.c.atletasCampeonato_('c1', false) : h.c.comissaoTecnicaCampeonato_('c1', false);
    const response = h.c.listarElenco('c1', 'e1').registros[0][tipo];
    assert.deepEqual(clone(response).map(({ participouCompeticao, podeRemover, motivoRemocao,
      motivoTransferencia, ...record }) => record), clone(normal));
    assert.deepEqual(clone(h.c.lerElencoBrutoOperacao_('c1', tipo)), h.roster('c1', tipo));
    assert.deepEqual(clone(h.c.fonteOtimizacaoImagens_({ campeonatoId: 'c1', tipo }).lista), h.roster('c1', tipo));
  }
  const aggregated = h.c.listarCadastroPessoasCampeonato().registros.find(item => item.campeonatoId === 'c1');
  assert.equal(aggregated.atletas[0].id, 'athlete');
  assert.deepEqual(clone(aggregated.comissao).map(item => item.id), ['staff', 'inactive-staff']);
  assert.equal(h.c.comissaoCampeonato_('c1').find(item => item.id === 'inactive-staff').ativo, false);
  const game = h.c.elencosResultadoTabela_({ campeonato: { id: 'c1' }, equipes: clone(h.state.equipes) },
    { mandanteId: 'e1', visitanteId: 'e2' }, false);
  assert.equal(game[0].atletas[0].id, 'athlete');
  assert.deepEqual(clone(game[0].comissao).map(item => item.id), ['staff']);
  assert.throws(() => h.c.validarCpfUnicoEntreCadastros_('c1', staff.cpf, 'atleta', ''), /comissão técnica/);
  const candidates = h.c.listarImportacaoElenco({
    campeonatoId: 'c1', equipeId: 'e1', tipo: 'atletas', origemId: 'c2'
  });
  const candidate = candidates.candidatos[0];
  assert.equal(h.history().inscricoes.find(item => item.id === candidate.id).registroId, 'previous-athlete');
  assert.equal(candidate.motivo, '');
  assert(h.history().inscricoes.some(item => item.registroId === 'athlete' && item.presente));
  assert(!h.history().inscricoes.some(item => item.registroId.startsWith('partition-')));
  h.c.salvarCadastroElenco({ ...h.payload('atletas', true), foto: 'legacy-updated-photo' });
  assert.equal(h.roster('c1', 'atletas')[0].foto, 'legacy-updated-photo');
  const imported = h.c.importarCadastrosElenco({
    campeonatoId: 'c1', equipeId: 'e1', tipo: 'atletas', origemId: 'c2', inscricaoIds: [candidate.id]
  });
  assert.equal(imported.quantidade, 1);
  assert.equal(h.roster('c1', 'atletas').find(item => item.cpf === candidate.cpf).nome, candidate.nome);
  h.c.processarHistoricoElencoAgora();
  assert(!h.history().inscricoes.some(item => item.registroId.startsWith('partition-')));
  assert.deepEqual([...h.files].filter(([name]) => name.startsWith(folderName(h))), newFiles);
});

test('permanent IDs, lazy folders and multi-team/category aggregation, never championship/team names', () => {
  const h = harness();
  const athlete = person('atletas'), staff = person('comissao');
  write(h, [
    partition('e1', 'atletas', [athlete]), partition('e2', 'atletas', [{ ...athlete, id: 'athlete2' }]),
    partition('e1', 'comissao', [staff]), partition('e2', 'comissao', [{ ...staff, id: 'staff2' }])
  ]);
  write(h, [partition('e1', 'atletas', [{ ...athlete, id: 'previous' }])], 'c2');
  assert.deepEqual(read(h).map(item => item.id), ['athlete', 'athlete2']);
  assert.deepEqual(read(h, 'c1', 'comissao').map(item => item.id), ['staff', 'staff2']);
  assert.deepEqual(read(h, 'c2').map(item => item.id), ['previous']);
  assert.deepEqual(teamRead(h, 'e3'), []);
  assert.equal(h.folders.size, 2);
  h.state.campeonatos[0].nome = 'Campeonato renomeado';
  h.state.equipes[0].nome = 'Equipe renomeada';
  assert.equal(teamRead(h, 'e1')[0].id, athlete.id);
  const paths = [...h.files.keys()].filter(name => name.startsWith('AEUV - Elencos -'));
  assert(paths.every(name => !name.includes('Equipe') && !name.includes('Atual')));
  assert.equal(manifest(h).campeonatoId, 'c1');
  assert.equal(manifest(h).particoes.length, 4);
  const count = h.writes.length;
  write(h, [partition('e1', 'atletas', [athlete])]);
  assert.equal(h.writes.length, count, 'identical partition has no write or manifest publication');
});

test('add/edit/delete write only changed partitions; retained versions and other championships remain untouched', () => {
  const h = harness();
  seedTransfer(h);
  write(h, [partition('e1', 'atletas', [person('atletas', { id: 'c2-athlete' })])], 'c2');
  const before = new Map(h.files), previous = manifest(h);
  for (const records of [
    [person('atletas'), person('atletas', { id: 'new' })],
    [person('atletas', { nome: 'Editado' })],
    []
  ]) {
    h.writes.length = 0;
    write(h, [partition('e1', 'atletas', records)]);
    assert.equal(h.writes.length, 4, 'recovery snapshot, one new version, durable pending journal, one publication');
    assert(h.writes[0].startsWith(folderName(h) + '\\snapshot - '));
    assert(h.writes[1].startsWith(folderName(h) + '\\Atletas - e1 - '));
    assert(h.writes[2].startsWith(folderName(h) + '\\pendencia - '));
    assert.equal(h.writes[3], manifestPath(h));
    assert.deepEqual(teamRead(h, 'e1'), records);
    for (const ref of previous.particoes.filter(item => item.equipeId !== 'e1' || item.tipo !== 'atletas')) {
      assert.deepEqual(manifest(h).particoes.find(item => item.arquivo === ref.arquivo), ref);
    }
  }
  for (const [name, text] of before) {
    if (name !== manifestPath(h)) assert.equal(h.files.get(name), text, name);
  }
  assert.equal(read(h, 'c2')[0].id, 'c2-athlete');
  assert(!h.io.some(item => item.operacao === 'trash'));
});

test('empty writes do not create storage; identity escaping prevents cross-folder paths', () => {
  const h = harness();
  write(h, [partition('e1', 'atletas', [])]);
  assert.equal(h.folders.size, 0);
  assert.equal(h.writes.length, 0);
  const id = 'c/1\\teste', team = 'e/1\\teste';
  h.state.equipes.push({ id: team, nome: 'Equipe A / teste' });
  write(h, [partition(team, 'atletas', [person('atletas')])], id);
  assert.equal(h.folders.size, 1);
  assert.equal(read(h, id)[0].id, 'athlete');
  assert.equal(manifest(h, id).particoes[0].equipeId, team);
  assert(h.files.has(folderName(h, id) + '\\' + manifest(h, id).particoes[0].arquivo));
  assert.throws(() => h.c.lerElencoParticionado_('', 'atletas'), /identidade/);
  assert.throws(() => h.c.lerElencoParticionado_('c1', 'outro'), /Categoria/);
  assert.throws(() => h.c.gravarParticoesElenco_('c1', []), /ScriptLock/);
});

test('transfer publication is atomic; readers never observe staged source/destination versions', () => {
  const h = harness();
  seedTransfer(h);
  h.writes.length = 0;
  const observations = [];
  h.state.onWrite = name => {
    if (name.startsWith(folderName(h))) {
      const committed = name === manifestPath(h);
      assertAtomicTransfer(h, committed);
      observations.push(committed);
    }
  };
  transfer(h);
  assert.deepEqual(observations, [false, false, false, false, true]);
  assert.equal(h.writes.length, 5);
  assert.equal(h.writes.filter(name => name.includes('\\Atletas - e1 -')).length, 1);
  assert.equal(h.writes.filter(name => name.includes('\\Atletas - e2 -')).length, 1);
  assert.equal(teamRead(h, 'e2').find(item => item.id === 'athlete').timeVinculado, 'Equipe B');
});

for (const failure of ['first-partition', 'second-partition', 'manifest-before', 'manifest-after', 'confirmation']) {
  test(`transfer failure ${failure}: no loss/duplication, reload exposes one complete state`, () => {
    const h = harness();
    seedTransfer(h);
    const before = new Map(h.files), oldManifest = h.files.get(manifestPath(h));
    const committed = ['manifest-after', 'confirmation'].includes(failure);
    if (failure.endsWith('partition')) {
      const team = failure === 'first-partition' ? 'e1' : 'e2';
      h.state.failCreateWhen = name => name.startsWith(folderName(h) + '\\Atletas - ' + team + ' - ');
    }
    if (failure === 'manifest-before') h.state.failWrite = manifestPath(h);
    if (failure === 'manifest-after') h.state.onWrite = name => {
      if (name === manifestPath(h)) throw Error('publication response lost');
    };
    if (failure === 'confirmation') h.state.onWrite = name => {
      if (name === manifestPath(h)) h.state.failRead = name;
    };
    assert.throws(() => transfer(h), error => {
      if (failure.endsWith('partition')) return /create failure/.test(error.message);
      assert.match(error.message, /recarregue.*Nenhum rollback/);
      assert.match(error.cause.message, /failure|response lost/);
      return true;
    });
    h.state.failCreateWhen = h.state.failWrite = h.state.onWrite = h.state.failRead = null;
    assertAtomicTransfer(h, committed);
    assert.equal(h.files.get(manifestPath(h)) === oldManifest, !committed);
    for (const [name, text] of before) {
      if (name !== manifestPath(h)) assert.equal(h.files.get(name), text, 'old versions are never overwritten');
    }
    if (!committed) {
      transfer(h);
      assertAtomicTransfer(h, true);
    } else {
      assert.throws(() => transfer(h), /ausente ou duplicado/);
      assertAtomicTransfer(h, true);
    }
  });
}

test('first publication failure and orphan files are ignored; retry does not scan/merge them', () => {
  const h = harness();
  h.state.failCreateWhen = name => name === manifestPath(h);
  assert.throws(() => write(h, [partition('e1', 'atletas', [person('atletas')])]), error => {
    assert.match(error.message, /recarregue/);
    assert.match(error.cause.message, /create failure/);
    return true;
  });
  assert.equal(h.folders.size, 1);
  const orphan = [...h.files.keys()].find(name => name.startsWith(folderName(h)));
  assert(orphan);
  assert.deepEqual(read(h), []);
  const signature = h.c.assinaturaFontesElencoParticionado_('c1');
  h.files.set(orphan, '{invalid');
  assert.equal(h.c.assinaturaFontesElencoParticionado_('c1'), signature);
  h.state.failCreateWhen = null;
  write(h, [partition('e1', 'atletas', [person('atletas', { id: 'retry' })])]);
  assert.deepEqual(read(h).map(item => item.id), ['retry']);
  assert.equal(h.files.get(orphan), '{invalid');
});

test('failed multi-category staging publishes neither category', () => {
  const h = harness();
  seedTransfer(h);
  h.state.failCreateWhen = name => name.includes('\\Comissao Tecnica - e1 -');
  assert.throws(() => write(h, [
    partition('e1', 'atletas', []), partition('e1', 'comissao', [])
  ]), /create failure/);
  assert.equal(teamRead(h, 'e1').length, 1);
  assert.equal(teamRead(h, 'e1', 'comissao').length, 1);
});

test('live source fingerprint detects new partitions, edits, transfer and external changes; legacy metadata cannot mask them', () => {
  const h = harness();
  const before = h.c.assinaturaFontesElencoParticionado_('c1');
  seedTransfer(h);
  const populated = h.c.assinaturaFontesElencoParticionado_('c1');
  assert.notEqual(populated, before);
  h.files.set(rosterFile('c1', 'atletas'), '[{"nome":"Legado alterado"}]');
  h.properties.set(h.c.chaveIndiceValidacao_('c1') + 'meta', JSON.stringify({ versao: 1, dirty: false }));
  assert.equal(h.c.assinaturaFontesElencoParticionado_('c1'), populated);
  const ref = manifest(h).particoes.find(item => item.tipo === 'atletas' && item.equipeId === 'e1');
  const name = folderName(h) + '\\' + ref.arquivo;
  const text = h.files.get(name);
  h.files.set(name, JSON.stringify([person('atletas', { cpf: '12345678909' })]));
  assert.notEqual(h.c.assinaturaFontesElencoParticionado_('c1'), populated);
  h.files.set(name, '{bad');
  assert.throws(() => h.c.assinaturaFontesElencoParticionado_('c1'), /JSON invalido/);
  h.files.set(name, text);
  assert.equal(h.c.assinaturaFontesElencoParticionado_('c1'), populated);
  transfer(h);
  assert.notEqual(h.c.assinaturaFontesElencoParticionado_('c1'), populated);
});

test('invalid/missing published sources fail explicitly, never fall back to old data or empty success', () => {
  const h = harness();
  seedTransfer(h);
  const saved = h.files.get(manifestPath(h));
  for (const corrupt of ['{}', '{bad',
    JSON.stringify({ ...manifest(h), campeonatoId: 'c2' }),
    JSON.stringify({ ...manifest(h), particoes: [...manifest(h).particoes, manifest(h).particoes[0]] }),
    JSON.stringify({ ...manifest(h), particoes: [{ ...manifest(h).particoes[0], arquivo: '..\\fora.json' }] })
  ]) {
    h.files.set(manifestPath(h), corrupt);
    assert.throws(() => read(h), /invalido|invalida|repetida/);
    h.files.set(manifestPath(h), saved);
  }
  const name = folderName(h) + '\\' + manifest(h).particoes[0].arquivo;
  const text = h.files.get(name);
  h.files.delete(name); // External disappearance in the fake, not a cleanup action.
  assert.throws(() => read(h), /nao encontrada/);
  h.files.set(name, '{}');
  assert.throws(() => read(h), /lista/);
  h.files.set(name, text);
  assert.equal(read(h).length, 2);
});

test('lock, stale revision, duplicate partition and duplicate folder prevent publication', () => {
  const h = harness();
  seedTransfer(h);
  const before = h.writes.length, revision = manifest(h).revisao;
  assert.throws(() => withLock(h, () => h.c.gravarParticoesElenco_('c1', [
    partition('e1', 'atletas', []), partition('e1', 'atletas', [])
  ])), /repetida/);
  assert.throws(() => withLock(h, () => h.c.gravarParticoesElenco_('c1', [
    partition('e1', 'atletas', [])
  ], 'stale')), /mudou/);
  assert.equal(h.writes.length, before);
  assert.equal(manifest(h).revisao, revision);
  withLock(h, () => h.c.pastaRaizProjeto_().createFolder(folderName(h)));
  assert.throws(() => read(h), /duplicada/);
  assert.throws(() => write(h, [partition('e1', 'atletas', [])]), /duplicada/);
  assert.equal(h.writes.length, before);
});

test('manifest changed while staging is rejected without overwriting the competing publication', () => {
  const h = harness();
  seedTransfer(h);
  const competing = { ...manifest(h), revisao: 'external-revision' };
  h.state.onWrite = name => {
    if (name.includes('\\Atletas - e1 -')) {
      h.files.set(manifestPath(h), JSON.stringify(competing));
    }
  };
  assert.throws(() => transfer(h), /manifesto ou uma particao mudou/);
  assert.deepEqual(manifest(h), competing);
  assertAtomicTransfer(h, false);
});

test('storage staging preserves global team IDs, games, history/presence, queues, indexes and snapshots byte-for-byte', () => {
  const h = harness();
  h.useRealContextFiles();
  const tableName = h.c.arquivoTabelaCampeonato_('c1');
  h.files.set(tableName, JSON.stringify([{ jogos: [participation()] }]));
  h.files.set(historyFile, JSON.stringify({ versao: 1, sequencia: 1, participacoes: [],
    inscricoes: [{ campeonatoId: 'c1', equipeId: 'e1', presente: true, dados: person('atletas') }] }));
  h.files.set('snapshot-sentinel.json', '{"previous":"unchanged"}');
  h.properties.set('HISTORICO_QUEUE_SENTINEL', 'preserved');
  h.properties.set(h.c.chaveIndiceValidacao_('c1') + 'meta', '{"dirty":false,"legacy":"unchanged"}');
  const before = new Map(h.files), properties = [...h.properties], teams = clone(h.state.equipes);
  seedTransfer(h);
  transfer(h);
  for (const [name, text] of before) assert.equal(h.files.get(name), text, name);
  assert.deepEqual([...h.properties], properties);
  assert.deepEqual(h.state.equipes, teams);
  assert.equal(JSON.parse(h.files.get(historyFile)).inscricoes[0].presente, true);
  assert(!h.io.some(item => item.operacao === 'trash'));
  // History/index/queue wiring is intentionally not claimed by this storage-only stage.
});

test('canonical team identity survives renames and retains every field and unassociated championship roster', () => {
  const h = harness();
  const extra = person('atletas', { id: 'unassociated', cpf: '12345678909',
    timeVinculado: 'stale name', ativo: false, metadados: { credencial: 'local-test-only' } });
  h.state.equipes.push({ id: 'e3', nome: 'Equipe C' });
  write(h, [partition('e1', 'atletas', [person('atletas')]), partition('e3', 'atletas', [extra])]);
  h.state.times = { c1: ['Equipe A'] };
  h.state.equipesAtivas = ['Equipe A'];
  const before = new Map(h.files), fingerprint = h.c.assinaturaFontesElencoParticionado_('c1');
  assert.deepEqual(read(h), [person('atletas'), { ...extra, timeVinculado: 'Equipe C' }]);
  h.state.equipes[0].nome = 'Equipe A renomeada';
  h.state.equipes[2].nome = 'Equipe C renomeada';
  assert.deepEqual(read(h), [person('atletas', { timeVinculado: 'Equipe A renomeada' }),
    { ...extra, timeVinculado: 'Equipe C renomeada' }]);
  assert.notEqual(h.c.assinaturaFontesElencoParticionado_('c1'), fingerprint);
  assert.deepEqual([...h.files], [...before], 'canonical reads never rewrite older names or prune unassociated teams');
  assert.equal(h.c.equipePorNomeElencoParticionado_(' equipe a renomeada ').id, 'e1');
  assert.throws(() => h.c.equipePorNomeElencoParticionado_('desconhecida'), /ausente ou ambiguo/);
  h.state.equipes.push({ id: 'another', nome: 'Equipe A renomeada' });
  assert.throws(() => h.c.equipePorNomeElencoParticionado_('Equipe A renomeada'), /ausente ou ambiguo/);
});

test('ID-keyed read and write-preparation adapters preserve records and reject unresolved team names', () => {
  const h = harness();
  const first = person('atletas', { timeVinculado: 'Equipe A' });
  const second = person('atletas', { id: 'athlete-2', timeVinculado: ' equipe b ' });
  const untouched = [...h.files];
  const prepared = h.c.prepararParticoesElencoPorNome_([first, second]);
  assert.deepEqual(clone(prepared), [
    { equipeId: 'e1', registros: [first] },
    { equipeId: 'e2', registros: [{ ...second, timeVinculado: 'Equipe B' }] }
  ]);
  assert.deepEqual([...h.files], untouched, 'preparation never writes to Drive');
  assert.equal(h.writes.length, 0);
  assert.deepEqual(clone(h.c.lerElencoParticionadoPorEquipe_('c1', 'atletas')), []);

  write(h, prepared.map(item => partition(item.equipeId, 'atletas', item.registros)));
  assert.deepEqual(clone(h.c.lerElencoParticionadoPorEquipe_('c1', 'atletas')), clone(prepared));
  assert.deepEqual(read(h), [first, { ...second, timeVinculado: 'Equipe B' }]);
  const secondRef = manifest(h).particoes.find(item => item.equipeId === 'e2' && item.tipo === 'atletas');
  const secondPath = folderName(h) + '\\' + secondRef.arquivo, secondText = h.files.get(secondPath);
  h.files.set(secondPath, JSON.stringify([{ ...second, id: first.id, timeVinculado: 'Equipe B' }]));
  assert.throws(() => h.c.lerElencoParticionadoPorEquipe_('c1', 'atletas'), /Identificador repetido/);
  h.files.set(secondPath, secondText);

  assert.throws(() => h.c.prepararParticoesElencoPorNome_([
    person('atletas', { timeVinculado: '' })
  ]), /sem timeVinculado/);
  assert.throws(() => h.c.prepararParticoesElencoPorNome_([
    person('atletas', { timeVinculado: 'Equipe inexistente' })
  ]), /ausente ou ambiguo/);
  h.state.equipes.push({ id: 'e3', nome: 'Equipe A' });
  assert.throws(() => h.c.prepararParticoesElencoPorNome_([first]), /ausente ou ambiguo/);
  assert.throws(() => h.c.lerElencoParticionadoPorEquipe_('c1', 'atletas'), /ausente ou ambiguo/);
});

test('unknown/ambiguous permanent IDs and malformed/duplicated records fail without creating storage', () => {
  for (const records of [[null], [42], [person('atletas', { id: '' })],
    [person('atletas', { id: ' padded ' })], [person('atletas', { nome: '' })],
    [person('atletas'), person('atletas')]]) {
    const h = harness();
    assert.throws(() => write(h, [partition('e1', 'atletas', records)]), /invalido|repetido/);
    assert.equal(h.writes.length, 0);
    assert.equal(h.folders.size, 0);
  }
  for (const ambiguous of [false, true]) {
    const h = harness();
    if (ambiguous) h.state.equipes.push({ id: 'e1', nome: 'Duplicada' });
    else h.state.equipes = h.state.equipes.filter(item => item.id !== 'e1');
    assert.throws(() => write(h, [partition('e1', 'atletas', [person('atletas')])]), /ausente ou ambiguo/);
    assert.equal(h.writes.length, 0);
    assert.equal(h.folders.size, 0);
  }
  const h = harness();
  assert.throws(() => write(h, [
    partition('e1', 'atletas', [person('atletas')]), partition('e2', 'atletas', [person('atletas')])
  ]), /repetido entre particoes/);
  assert.equal(h.writes.length, 0);
  seedTransfer(h);
  const before = h.writes.length;
  assert.throws(() => write(h, [partition('e2', 'atletas', [person('atletas')])]), /repetido entre particoes/);
  assert.equal(h.writes.length, before);
});

test('all previous records and manifest are snapshotted before staging; pending journal is confirmed before publication', () => {
  const h = harness();
  seedTransfer(h);
  const previous = manifest(h);
  const previousData = previous.particoes.map(referencia => ({ referencia,
    registros: JSON.parse(h.files.get(folderName(h) + '\\' + referencia.arquivo)) }));
  const fingerprint = h.c.assinaturaFontesElencoParticionado_('c1');
  h.writes.length = 0;
  h.state.onWrite = name => {
    if (!name.startsWith(folderName(h))) return;
    if (name.includes('\\Atletas -')) {
      const snapshot = JSON.parse(h.files.get(h.writes[0]));
      assert.equal(snapshot.schema, 'aeuv.elencos.snapshot');
      assert.equal(snapshot.assinaturaAnterior, fingerprint);
      assert.deepEqual(snapshot.manifestoAnterior, previous);
      assert.deepEqual(snapshot.particoes, previousData);
    }
    if (name === manifestPath(h)) {
      const journal = JSON.parse(h.files.get(h.writes.at(-2)));
      assert.equal(journal.schema, 'aeuv.elencos.publicacao');
      assert.equal(journal.revisaoDestino, manifest(h).revisao);
      assert.equal(journal.snapshotAnterior, h.writes[0].split('\\').pop());
      assert.deepEqual(journal.manifestoDestino, manifest(h));
      assert(h.io.some(item => item.operacao === 'read' && item.name === h.writes.at(-2)));
    }
  };
  transfer(h);
  assertAtomicTransfer(h, true);
  assert(h.files.has(h.writes[0]), 'recovery evidence retained after publication');
  assert(h.files.has(h.writes.at(-2)), 'journal retained, never success-shaped cleanup');
});

for (const document of ['snapshot', 'pendencia']) for (const failure of ['create', 'read', 'mismatch']) {
  test(`${document} ${failure} failure: entire previous state remains published and retry is safe`, () => {
    const h = harness();
    seedTransfer(h);
    const oldManifest = h.files.get(manifestPath(h)), before = new Map(h.files);
    const prefix = folderName(h) + '\\' + document + ' - ';
    if (failure === 'create') h.state.failCreateWhen = name => name.startsWith(prefix);
    else h.state.onWrite = name => {
      if (!name.startsWith(prefix)) return;
      if (failure === 'read') h.state.failRead = name;
      else h.files.set(name, '{}');
    };
    assert.throws(() => transfer(h), /failure|preparacao/);
    h.state.failCreateWhen = h.state.onWrite = h.state.failRead = null;
    assert.equal(h.files.get(manifestPath(h)), oldManifest);
    assertAtomicTransfer(h, false);
    for (const [name, text] of before) assert.equal(h.files.get(name), text, name);
    transfer(h);
    assertAtomicTransfer(h, true);
  });
}

for (const alteration of ['edit', 'missing', 'corrupt', 'rename']) {
  test(`external ${alteration} of an unaffected source during staging prevents lost updates`, () => {
    const h = harness();
    seedTransfer(h);
    const oldManifest = h.files.get(manifestPath(h));
    const ref = manifest(h).particoes.find(item => item.tipo === 'comissao');
    const name = folderName(h) + '\\' + ref.arquivo;
    const original = h.files.get(name);
    h.state.onWrite = written => {
      if (!written.includes('\\Atletas - e1 -')) return;
      if (alteration === 'edit') h.files.set(name, JSON.stringify([person('comissao', { nome: 'Edicao externa' })]));
      if (alteration === 'missing') h.files.delete(name);
      if (alteration === 'corrupt') h.files.set(name, '{bad');
      if (alteration === 'rename') h.state.equipes[1].nome = 'Equipe B renomeada';
    };
    assert.throws(() => transfer(h), /mudou|nao encontrada|JSON invalido/);
    assert.equal(h.files.get(manifestPath(h)), oldManifest);
    assert.equal(teamRead(h, 'e1')[0].id, 'athlete');
    assert.equal(teamRead(h, 'e2').some(item => item.id === 'athlete'), false);
    if (alteration === 'edit') assert.equal(JSON.parse(h.files.get(name))[0].nome, 'Edicao externa');
    h.state.onWrite = null;
    h.files.set(name, original);
    transfer(h);
    assertAtomicTransfer(h, true);
  });
}

test('transfer detects external edits between its read and save, even without a manifest revision change', () => {
  const h = harness();
  seedTransfer(h);
  const oldManifest = h.files.get(manifestPath(h));
  const ref = manifest(h).particoes.find(item => item.tipo === 'atletas' && item.equipeId === 'e1');
  const name = folderName(h) + '\\' + ref.arquivo;
  const readPartition = h.c.lerParticaoElenco_;
  h.c.lerParticaoElenco_ = (...args) => {
    const result = readPartition(...args);
    if (args[1] === 'e1') h.files.set(name, JSON.stringify([person('atletas', { foto: 'external-photo' })]));
    return result;
  };
  const before = h.writes.length;
  assert.throws(() => transfer(h), /fonte do elenco mudou/);
  assert.equal(h.writes.length, before);
  assert.equal(h.files.get(manifestPath(h)), oldManifest);
  assert.equal(read(h).find(item => item.id === 'athlete').foto, 'external-photo');
});

test('same revision with stale expected fingerprint never authorizes a multi-partition save', () => {
  const h = harness();
  seedTransfer(h);
  const signature = h.c.assinaturaFontesElencoParticionado_('c1'), revision = manifest(h).revisao;
  const ref = manifest(h).particoes.find(item => item.tipo === 'comissao');
  const name = folderName(h) + '\\' + ref.arquivo;
  h.files.set(name, JSON.stringify([person('comissao', { cpf: '12345678909' })]));
  const before = h.writes.length;
  assert.throws(() => withLock(h, () => h.c.gravarParticoesElenco_('c1', [
    partition('e1', 'atletas', []), partition('e2', 'atletas', [person('atletas')])
  ], revision, signature)), /fonte do elenco mudou/);
  assert.equal(h.writes.length, before);
  assertAtomicTransfer(h, false);
  assert.equal(read(h, 'c1', 'comissao')[0].cpf, '12345678909');
});

test('invalid record or missing/ambiguous global mapping in published data cannot be masked by a legacy index', () => {
  const h = harness();
  seedTransfer(h);
  h.properties.set(h.c.chaveIndiceValidacao_('c1') + 'meta', '{"versao":1,"dirty":false}');
  const ref = manifest(h).particoes[0], name = folderName(h) + '\\' + ref.arquivo;
  const saved = h.files.get(name), before = h.writes.length;
  for (const content of [[null], [person('atletas'), person('atletas')], [{ id: 'athlete' }]]) {
    h.files.set(name, JSON.stringify(content));
    assert.throws(() => read(h), /invalido|repetido/);
    assert.throws(() => h.c.assinaturaFontesElencoParticionado_('c1'), /invalido|repetido/);
    assert.throws(() => write(h, [partition('e1', 'atletas', [])]), /invalido|repetido/);
  }
  h.files.set(name, saved);
  h.state.equipes.push({ id: 'e1', nome: 'Duplicada' });
  assert.throws(() => read(h), /ausente ou ambiguo/);
  assert.throws(() => transfer(h), /ausente ou ambiguo/);
  h.state.equipes = h.state.equipes.filter(item => item.id !== 'e1');
  assert.throws(() => read(h), /ausente ou ambiguo/);
  assert.throws(() => h.c.assinaturaFontesElencoParticionado_('c1'), /ausente ou ambiguo/);
  assert.equal(h.writes.length, before);
});

test('divergent post-publication readback reports reload with cause and never rolls back related partitions', () => {
  const h = harness();
  seedTransfer(h);
  h.state.onWrite = name => {
    if (name === manifestPath(h)) h.files.set(name, JSON.stringify({ ...manifest(h), revisao: 'external-after-commit' }));
  };
  assert.throws(() => transfer(h), error => {
    assert.match(error.message, /recarregue.*Nenhum rollback/);
    assert.match(error.cause.message, /divergente/);
    return true;
  });
  h.state.onWrite = null;
  assertAtomicTransfer(h, true);
  assert.equal(manifest(h).revisao, 'external-after-commit');
});

test('nested fixture preserves parent IDs and same-name files in separate folders without changing flat root behavior', () => {
  const h = harness();
  withLock(h, () => {
    const root = h.c.pastaRaizProjeto_();
    const a = root.createFolder('a'), b = root.createFolder('b');
    const sub = a.createFolder('sub');
    for (const target of [a, b, sub]) target.createFile(h.c.Utilities.newBlob('[]', 'application/json', 'same.json'));
    const id = sub.getFilesByName('same.json').next().getId();
    const file = h.c.DriveApp.getFileById(id);
    assert.equal(file.getName(), 'same.json');
    assert.equal(file.getParents().next().getId(), sub.getId());
    file.setContent('[1]');
    assert.equal(h.files.get('a\\sub\\same.json'), '[1]');
    assert.equal(h.files.get('b\\same.json'), '[]');
    assert.equal(root.getFilesByName('same.json').hasNext(), false);
    const replacement = h.drive.replace('a\\sub\\same.json', '[2]');
    assert.equal(h.c.DriveApp.getFileById(replacement).getParents().next().getId(), sub.getId());
    h.drive.rename('a\\sub\\same.json', 'a\\sub\\renamed.json');
    assert.equal(h.c.DriveApp.getFileById(replacement).getName(), 'renamed.json');
    assert.equal(h.c.DriveApp.getFileById(replacement).getBlob().getDataAsString(), '[2]');
  });
  assert.equal(h.c.lerListaCadastroDrive_(rosterFile('c1', 'atletas'), 'legacy').length, 0);
});
