const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { harness, person } = require('./save-fixture.cjs');
const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8')
  .replace('const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = false;',
    'const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = true;');
const withLock = (h, fn) => {
  const lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  try { return fn(); } finally { lock.releaseLock(); }
};
const fixture = () => {
  const h = harness(source);
  withLock(h, () => h.c.gravarParticoesElenco_('c1', [
    { tipo: 'atletas', equipeId: 'e1', registros: [person('atletas')] },
    { tipo: 'comissao', equipeId: 'e1', registros: [person('comissao')] }
  ]));
  const estado = h.c.lerEstadoElencosParticionados_('c1');
  h.io.length = 0;
  h.counts.metadataGet = h.counts.metadataList = 0;
  return { ...h, estado, checkpoint: () => h.c.checkpointElencoParticionado_('c1') };
};

test('one filtered list replaces all checkpoint gets/name resolutions and excludes thousands of historical files', () => {
  const h = fixture(), parent = h.estado.pasta.getId();
  for (let i = 0; i < 3000; i++) {
    const name = `snapshot - history-${i}.json`, key = `history\\${name}`;
    h.files.set(key, '{}');
    h.meta.set('historical-' + i, { name, key, parent, trashed: false });
  }
  const checkpoint = h.checkpoint();
  assert.equal(checkpoint.fontes.length, 2);
  assert.equal(h.counts.metadataGet, 0);
  assert.equal(h.counts.metadataList, 1);
  assert.equal(h.io.filter(item => item.operacao === 'lookup').length, 1, 'only the read manifesto handle');
  const call = h.io.find(item => item.operacao === 'metadataList');
  assert.equal(call.returnedNames.length, 3);
  assert(!call.returnedNames.some(name => name.startsWith('snapshot')));
  assert(!/\bid\s*=/.test(call.q), 'Drive q does not support an id qualifier');
  const before = h.counts.metadataList;
  h.c.assinaturaEstadoElencoParticionado_(checkpoint.estado, null, null, checkpoint);
  assert.equal(h.counts.metadataList, before, 'reuse only the explicit bundle');
  h.checkpoint();
  assert.equal(h.counts.metadataList, before + 1, 'the next checkpoint resolves sources independently');
});

test('pagination consumes every filtered page and omission of the default incompleteSearch=false is accepted', () => {
  const h = fixture();
  h.state.metadataPageSize = 1;
  h.state.omitIncompleteSearch = true;
  assert.equal(h.checkpoint().fontes.length, 2);
  assert.equal(h.counts.metadataList, 3);
  assert.equal(h.counts.metadataGet, 0);
  assert.deepEqual(h.io.filter(item => item.operacao === 'metadataList').map(item => item.pageToken),
    [undefined, '1', '2']);
});

test('exact query literals escape backslashes/single quotes in parent and names', () => {
  const h = fixture(), parent = "parent\\with'quote";
  const names = ["Atletas - equipe\\'um.json", "Comissao - equipe'\\dois.json"];
  const estado = { pasta: { getId: () => parent },
    manifesto: { particoes: names.map(arquivo => ({ arquivo })) } };
  for (const [i, name] of ['manifesto.json', ...names].entries()) {
    const key = 'escaped\\' + i;
    h.files.set(key, '[]');
    h.meta.set('escaped-' + i, { name, key, parent, trashed: false });
  }
  const result = h.c.listarMetadadosCheckpointElenco_(estado);
  assert.deepEqual([...result.keys()], ['manifesto.json', ...names]);
  const call = h.io.find(item => item.operacao === 'metadataList');
  assert(call.q.startsWith("'parent\\\\with\\'quote' in parents"));
  assert(call.q.includes("name = 'Atletas - equipe\\\\\\'um.json'"));
});

test('bounded batches constrain both query length and name count; each batch paginates independently', () => {
  const h = fixture(), parent = h.estado.pasta.getId();
  const names = Array.from({ length: 205 }, (_, i) => 'Atletas - ' + i + '-' + 'x'.repeat(130) + '.json');
  for (const [i, name] of names.entries()) {
    const key = 'batch\\' + i;
    h.files.set(key, '[]');
    h.meta.set('batch-' + i, { name, key, parent, trashed: false });
  }
  const estado = { pasta: h.estado.pasta, manifesto: { particoes: names.map(arquivo => ({ arquivo })) } };
  h.state.metadataPageSize = 20;
  const result = h.c.listarMetadadosCheckpointElenco_(estado);
  assert.equal(result.size, 206);
  const calls = h.io.filter(item => item.operacao === 'metadataList');
  const batches = new Set(calls.map(item => item.q));
  assert(batches.size >= 4, 'long literals require multiple bounded queries');
  assert(calls.length <= batches.size * 3, 'O(batches + pages), not one call per reference');
  assert.equal(h.counts.metadataGet, 0);
  for (const q of batches) {
    assert(q.length <= 7000);
    assert((q.match(/name = /g) || []).length <= 100);
  }
  const short = { pasta: h.estado.pasta, manifesto: {
    particoes: Array.from({ length: 205 }, (_, i) => ({ arquivo: 'short-' + i }))
  } };
  h.state.metadataPageSize = 1000;
  const before = h.counts.metadataList;
  h.c.listarMetadadosCheckpointElenco_(short);
  assert.equal(h.counts.metadataList - before, 3, 'at most 100 exact names per query');
});

test('an oversized individual name fails explicitly before issuing a Drive request', () => {
  const h = fixture();
  assert.throws(() => h.c.listarMetadadosCheckpointElenco_({
    pasta: h.estado.pasta, manifesto: { particoes: [{ arquivo: 'x'.repeat(7000) }] }
  }), /limite seguro/);
  assert.equal(h.counts.metadataList, 0);
});

for (const change of ['duplicate-partition', 'duplicate-manifest', 'missing', 'move', 'rename', 'trash']) {
  test(`filtered checkpoint rejects ${change}, including duplicate names on a later page`, () => {
    const h = fixture();
    const name = change === 'duplicate-manifest' ? 'manifesto.json' : h.estado.manifesto.particoes[0].arquivo;
    const [id, meta] = [...h.meta].find(([, item]) => item.parent === h.estado.pasta.getId() && item.name === name);
    if (change.startsWith('duplicate')) {
      h.state.metadataPageSize = 1;
      const key = 'duplicate\\' + name;
      h.files.set(key, h.files.get(meta.key));
      h.meta.set(id + '-duplicate', { ...meta, key });
    }
    if (change === 'missing') h.files.delete(meta.key);
    if (change === 'move') meta.parent = 'another-folder';
    if (change === 'rename') meta.name = 'renamed.json';
    if (change === 'trash') meta.trashed = true;
    assert.throws(h.checkpoint, /duplicada|nao encontrada|ausente|mudou/);
    assert.equal(h.counts.metadataGet, 0, 'no quiet per-file fallback');
  });
}

for (const invalid of [true, null, 'false']) {
  test(`incompleteSearch=${JSON.stringify(invalid)} fails closed rather than authorizing partial metadata`, () => {
    const h = fixture();
    h.state.transformMetadataList = result => { result.incompleteSearch = invalid; };
    assert.throws(h.checkpoint, /incompleta/);
  });
}

for (const field of ['id', 'name', 'parents', 'version', 'md5Checksum']) {
  test(`list result missing ${field} cannot authorize a checkpoint`, () => {
    const h = fixture();
    h.state.transformMetadataList = result => { delete result.files[0][field]; };
    assert.throws(h.checkpoint, /ausente|inesperada/);
  });
}

test('malformed/repeating pagination tokens are rejected, not treated as a complete result', () => {
  for (const token of [null, 123, 'repeated']) {
    const h = fixture();
    h.state.transformMetadataList = (result, options) => {
      result.nextPageToken = token;
      if (options.pageToken) result.files = [];
    };
    assert.throws(h.checkpoint, /Paginacao/);
    assert(h.counts.metadataList <= 2);
  }
});

test('missing Files.list and failed listing block active checks without falling back to gets', () => {
  for (const unavailable of [true, false]) {
    const h = fixture();
    if (unavailable) delete h.c.Drive.Files.list;
    else h.state.failMetadataList = true;
    assert.throws(h.checkpoint, /Files.list|list failure/);
    assert.equal(h.counts.metadataGet, 0);
  }
});

test('manifest bytes must match listing metadata, preventing an old parsed manifest/new fingerprint split view', () => {
  const h = fixture(), key = h.estado.arquivo.getId();
  h.state.onMetadata = name => {
    if (name !== 'manifesto.json') return;
    h.state.onMetadata = null;
    const meta = h.meta.get(key), doc = JSON.parse(h.files.get(meta.key));
    doc.revisao = 'external-new-revision';
    doc.particoes = [];
    h.files.set(meta.key, JSON.stringify(doc));
  };
  assert.throws(h.checkpoint, /Manifesto.*mudou/);
});

test('manifest appearance after an absence read and replacement by another ID are rejected', () => {
  const h = fixture();
  const original = h.estado.arquivo;
  h.estado.arquivo = null;
  h.estado.texto = null;
  h.estado.manifesto = { campeonatoId: 'c1', revisao: '', particoes: [] };
  assert.throws(() => h.c.checkpointElencoParticionado_('c1', null, h.estado), /Manifesto.*mudou/);
  const state = h.c.lerEstadoElencosParticionados_('c1');
  const id = original.getId(), meta = h.meta.get(id);
  h.meta.delete(id);
  h.meta.set('replacement-manifest', { ...meta });
  assert.throws(() => h.c.checkpointElencoParticionado_('c1', null, state), /ausente/);
});

test('version-only and MD5-only changes remain part of the fingerprint', () => {
  const h = fixture();
  const before = h.checkpoint().assinatura;
  h.state.metadataVersion = () => 2;
  assert.notEqual(h.checkpoint().assinatura, before);
  h.state.metadataVersion = null;
  const part = h.estado.manifesto.particoes[0];
  const [, meta] = [...h.meta].find(([, item]) => item.name === part.arquivo);
  h.files.set(meta.key, h.files.get(meta.key) + ' ');
  assert.notEqual(h.checkpoint().assinatura, before);
});
