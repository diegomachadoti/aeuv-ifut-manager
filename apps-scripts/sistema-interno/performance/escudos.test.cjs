const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const backend = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const png = 'data:image/png;base64,';

function harness() {
  let locked = false, allowed = true;
  const backups = [], writes = [];
  const teams = [{ id: 'a', nome: 'Equipe A', escudo: png + 'A'.repeat(2000) },
    { id: 'b', nome: 'Equipe B', escudo: png + 'B'.repeat(2000) }];
  const c = vm.createContext({
    console, Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_algo, text) => crypto.createHash('sha256').update(text).digest(),
      base64Encode: data => Buffer.from(data).toString('base64'),
      getUuid: () => 'backup-id', newBlob: (text, mime, name) => ({ text, mime, name })
    },
    LockService: { getScriptLock: () => ({
      waitLock: () => { assert(!locked); locked = true; },
      releaseLock: () => { assert(locked); locked = false; }
    }) }
  });
  vm.runInContext(backend, c);
  c.exigirEdicaoEquipes_ = () => { if (!allowed) throw new Error('sem permissao'); };
  c.equipesRegistro_ = () => teams;
  c.pastaRaizProjeto_ = () => ({ createFile: blob => { assert(locked); backups.push(blob); } });
  c.gravarRegistroEquipes_ = records => { assert(locked); writes.push(JSON.stringify(records)); };
  const entry = team => ({ id: team.id, assinatura: c.assinaturaEscudoEquipe_(team.escudo), escudo: png + 'A'.repeat(100) });
  return { c, teams, backups, writes, entry, locked: () => locked, deny: () => { allowed = false; } };
}

test('otimizacao atomica preserva originais, IDs e nomes', () => {
  const h = harness();
  const before = JSON.stringify(h.teams);
  const result = h.c.otimizarEscudosEquipes({ escudos: h.teams.map(h.entry) });
  assert.equal(result.total, 2);
  assert.equal(h.backups.length, 1);
  assert.equal(h.backups[0].text, before);
  assert.equal(h.writes.length, 1);
  assert.equal(h.teams[0].id, 'a');
  assert.equal(h.teams[0].nome, 'Equipe A');
  assert(h.teams.every(team => team.escudo.length < 200));
  assert(!h.locked());
});

test('conflito, permissao, tamanho e duplicata nunca gravam parcialmente', () => {
  for (const modify of [
    entries => { entries[1].assinatura = 'stale'; },
    entries => { entries[1].id = 'a'; },
    entries => { entries[1].escudo = 'https://example.org/image'; },
    entries => { entries[1].escudo = ''; },
    entries => { entries[1].escudo = png + 'A'.repeat(3000); }
  ]) {
    const h = harness(), before = JSON.stringify(h.teams);
    const entries = h.teams.map(h.entry);
    modify(entries);
    assert.throws(() => h.c.otimizarEscudosEquipes({ escudos: entries }));
    assert.equal(JSON.stringify(h.teams), before);
    assert.equal(h.backups.length, 0);
    assert.equal(h.writes.length, 0);
    assert(!h.locked());
  }
  const h = harness();
  h.deny();
  assert.throws(() => h.c.otimizarEscudosEquipes({ escudos: h.teams.map(h.entry) }), /permissao/);
});

test('falha de backup impede substituicao; falha de gravacao e propagada', () => {
  const h = harness(), before = JSON.stringify(h.teams);
  h.c.pastaRaizProjeto_ = () => ({ createFile() { throw new Error('backup falhou'); } });
  assert.throws(() => h.c.otimizarEscudosEquipes({ escudos: h.teams.map(h.entry) }), /backup falhou/);
  assert.equal(JSON.stringify(h.teams), before);
  assert(!h.locked());
  const other = harness();
  other.c.gravarRegistroEquipes_ = () => { throw new Error('Drive falhou'); };
  assert.throws(() => other.c.otimizarEscudosEquipes({ escudos: other.teams.map(other.entry) }), /Drive falhou/);
  assert.equal(other.backups.length, 1);
  assert(!other.locked());
});

test('canvas limita dimensoes, preserva proporcao e mantem imagem menor', async () => {
  const canvases = [], revoked = [];
  const c = vm.createContext({
    Image: class {
      naturalWidth = 1024; naturalHeight = 512;
      set src(value) { this.onload(); }
    },
    URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: value => revoked.push(value) },
    document: { createElement: () => {
      const canvas = { getContext: () => ({ drawImage() {} }),
        toDataURL: type => type === 'image/png' ? png + 'A'.repeat(500) : 'data:image/webp;base64,' + 'B'.repeat(100) };
      canvases.push(canvas); return canvas;
    } }
  });
  vm.runInContext(html.slice(html.indexOf('    function otimizarImagemEscudo_('),
    html.indexOf('    async function otimizarEscudosExistentes_(')), c);
  const optimized = await c.otimizarImagemEscudo_({});
  assert(optimized.startsWith('data:image/webp'));
  assert.equal(canvases[0].width, 256);
  assert.equal(canvases[0].height, 128);
  assert.deepEqual(revoked, ['blob:mock']);
  assert.equal(await c.otimizarImagemEscudo_(png + 'AAAA'), png + 'AAAA');
});

test('frontend e backend mantem sintaxe valida', () => {
  new vm.Script(backend);
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1].replace(/<\?[\s\S]*?\?>/g, '{}'));
  }
});
