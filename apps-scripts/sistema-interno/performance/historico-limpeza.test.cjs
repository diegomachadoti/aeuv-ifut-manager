const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { harness, person, historyFile } = require('./save-fixture.cjs');
const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const active = source.replace('const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = false;',
  'const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = true;');
const plain = value => JSON.parse(JSON.stringify(value));
const underLock = (h, fn) => {
  const lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  try { return fn(); } finally { lock.releaseLock(); }
};
const fixture = (consolidated = false) => {
  const h = harness(active);
  underLock(h, () => h.c.gravarParticoesElenco_('c1', [{
    equipeId: 'e1', tipo: 'atletas', registros: [person('atletas')]
  }]));
  if (consolidated) h.c.processarHistoricoElencoAgora();
  h.state.campeonatos = [];
  h.files.set(historyFile, JSON.stringify({
    versao: 1, sequencia: 1, participacoes: [{ id: 'test-participation' }],
    inscricoes: [{ id: 'test-record', cpf: person('atletas').cpf }]
  }));
  h.files.set('solicitacao-preservada.txt', 'Inscricao e remocao reais');
  h.files.set('punicoes-preservadas.json', '[{"nota":"real"}]');
  h.files.set('sumulas-preservadas.json', '[{"jogo":"real"}]');
  h.properties.set(vm.runInContext('BANCO_ATLETAS_ESTADO', h.c),
    JSON.stringify({ currentId: 'old-copy', previousId: 'old-previous' }));
  return h;
};

test('cleanup simulation reads both models without changing files or properties', () => {
  const h = fixture(true), files = [...h.files], props = [...h.properties];
  const result = h.c.simularLimpezaHistoricoElencosTeste();
  assert.equal(result.simulacao, true);
  assert.equal(result.inscricoesRemovidas, 2);
  assert.equal(result.campeonatosHistoricos, 1);
  assert.deepEqual([...h.files], files);
  assert.deepEqual([...h.properties], props);
});

for (const consolidated of [true, false]) {
  test(`cleanup clears both models and prevents ${consolidated ? 'consolidated' : 'pending'} tests from reappearing`, () => {
    const h = fixture(consolidated), before = new Map(h.files), props = [...h.properties];
    const result = h.c.executarLimpezaHistoricoElencosTeste();
    assert.equal(result.simulacao, false);
    assert(result.backupId);
    const backupName = [...h.files.keys()].find(name => name.startsWith('AEUV - Backup limpeza historico - '));
    const backup = JSON.parse(h.files.get(backupName));
    assert.equal(backup.arquivos.find(item => item.nome === historyFile).texto, before.get(historyFile));
    for (const [key, value] of Object.entries(backup.propriedades)) {
      assert.equal(value, new Map(props).get(key) ?? null);
    }
    assert.deepEqual(JSON.parse(h.files.get(historyFile)).inscricoes, []);
    assert.deepEqual(plain(h.c.lerHistoricoParticionado_(true)).inscricoes, []);
    assert.deepEqual(plain(h.c.lerHistoricoParticionado_(true)).participacoes, []);
    for (const [name, text] of before) {
      if (name === historyFile || name.includes('\\historico - ')) continue;
      assert.equal(h.files.get(name), text, 'non-history source preserved: ' + name);
    }
    assert.equal(h.c.obterStatusFilaHistoricoElenco().pendencias, 0);
    const snapshot = JSON.parse(h.properties.get(vm.runInContext('BANCO_ATLETAS_ESTADO', h.c)));
    assert.equal(snapshot.currentId, '');
    assert.equal(snapshot.previousId, '');
    h.c.marcarHistoricoElencoPendente_('c1');
    underLock(h, () => h.properties.set(h.c.chaveRemocaoElencosParticionados_('c1'),
      JSON.stringify({ versao: 1, campeonatoId: 'c1' })));
    h.c.processarHistoricoElencoAgora();
    assert.equal(h.c.lerHistoricoParticionado_(true).inscricoes.length, 0);
    h.c.executarLimpezaHistoricoElencosTeste();
    assert.equal(h.c.lerHistoricoParticionado_(true).inscricoes.length, 0, 'retry stays empty');
  });
}

test('cleanup also clears legacy history with the gate disabled', () => {
  const h = harness();
  h.state.campeonatos = [];
  h.files.set(historyFile, JSON.stringify({
    versao: 1, sequencia: 1, participacoes: [], inscricoes: [{ id: 'legacy-test' }]
  }));
  h.c.executarLimpezaHistoricoElencosTeste();
  assert.equal(h.c.lerHistoricoElenco_().inscricoes.length, 0);
});

for (const guard of ['admin', 'championship', 'lease', 'backup']) {
  test(`cleanup ${guard} failure makes no changes to original files or properties`, () => {
    const h = fixture(true);
    if (guard === 'admin') h.state.perfil = 'diretoria';
    if (guard === 'championship') h.state.campeonatos = [{ id: 'live' }];
    if (guard === 'lease') {
      const key = vm.runInContext('BANCO_ATLETAS_ESTADO', h.c);
      h.properties.set(key, JSON.stringify({ lease: { expiresAt: Date.now() + 86400000000 } }));
    }
    const files = [...h.files], props = [...h.properties];
    if (guard === 'backup') {
      const create = h.c.pastaRaizProjeto_;
      h.c.pastaRaizProjeto_ = () => {
        const folder = create();
        return { ...folder, createFile(blob) {
          if (blob.name.startsWith('AEUV - Backup limpeza historico - ')) throw Error('backup failure');
          return folder.createFile(blob);
        } };
      };
    }
    assert.throws(() => h.c.executarLimpezaHistoricoElencosTeste());
    assert.deepEqual([...h.files], files);
    assert.deepEqual([...h.properties], props);
  });
}

test('unconfirmed backup prevents any reset of the original sources', () => {
  const h = fixture(true), before = new Map(h.files), props = [...h.properties];
  const original = h.c.pastaRaizProjeto_;
  h.c.pastaRaizProjeto_ = () => {
    const folder = original();
    return { ...folder, createFile(blob) {
      const file = folder.createFile(blob);
      return blob.name.startsWith('AEUV - Backup limpeza historico - ')
        ? { ...file, getBlob: () => ({ getDataAsString: () => 'incomplete-backup' }) } : file;
    } };
  };
  assert.throws(() => h.c.executarLimpezaHistoricoElencosTeste(), /Backup nao confirmado/);
  for (const [name, text] of before) assert.equal(h.files.get(name), text);
  assert.deepEqual([...h.properties], props);
});

test('partial write failure keeps checkpoints and queue until retry completes', () => {
  const h = fixture(true);
  h.c.marcarHistoricoElencoPendente_('c1');
  const before = [...h.properties];
  const target = [...h.files.keys()].find(name => name.includes('\\historico - '));
  h.state.failWrite = target;
  assert.throws(() => h.c.executarLimpezaHistoricoElencosTeste(), /write failure/);
  assert.deepEqual([...h.properties], before);
  assert([...h.files.keys()].some(name => name.startsWith('AEUV - Backup limpeza historico - ')));
  h.state.failWrite = null;
  h.c.executarLimpezaHistoricoElencosTeste();
  assert.equal(h.c.lerHistoricoParticionado_(true).inscricoes.length, 0);
  assert.equal(h.c.obterStatusFilaHistoricoElenco().pendencias, 0);
});

test('real solicitation movements remain after cleanup even for a CPF formerly in test history', () => {
  const h = fixture(true);
  h.c.executarLimpezaHistoricoElencosTeste();
  const result = h.c.consolidarAtletasBanco_(h.c.vinculosAtletasElenco_(), {
    registros: [{
      equipe: 'Equipe A', competicao: 'Real', protocolo: 'real-request', situacao: 'Processado',
      pessoas: [
        { nome: 'Carlos Silva', cpf: person('atletas').cpf, tipo: 'Atleta', acao: 'Inscricao' },
        { nome: 'Carlos Silva', cpf: person('atletas').cpf, tipo: 'Atleta', acao: 'Remocao' }
      ]
    }]
  }, { registros: [] }, { registros: [] });
  assert.equal(result.registros.length, 1);
  assert.equal(result.registros[0].movimentacoes.length, 2);
  assert.equal(result.registros[0].vinculos.length, 0);
});
