const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, person, historyFile, rosterFile } = require('./save-fixture.cjs');

const count = (h, operacao, name) => h.io.filter(item => item.operacao === operacao
  && (name === undefined || item.name === name)).length;
const tally = h => h.io.reduce((total, item) => ({ ...total, [item.operacao]: (total[item.operacao] || 0) + 1 }), {});
const store = (h, user = 'usuario-1') => h.caches.get(user) || new Map();
const cached = (h, ...args) => harnessReady(harness(undefined, { cache: true }), ...args);
function harnessReady(h) {
  h.useRealContextFiles();
  return h;
}
const allFiles = h => ['AEUV - Equipes - Cadastro.json', 'AEUV - Campeonatos.json', 'AEUV - Bloqueios de Elenco.json',
  historyFile, ...['c1', 'c2'].flatMap(id => ['atletas', 'comissao'].map(tipo => rosterFile(id, tipo)))];
const saveTwice = h => {
  h.c.salvarCadastroElenco(h.payload('atletas'));
  const saved = h.roster('c1', 'atletas')[0];
  h.io.length = h.writes.length = h.logs.length = 0;
  h.c.salvarCadastroElenco({ ...h.payload('atletas', true), registroId: saved.id });
};
const withLock = (h, fn) => {
  const lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  try { return fn(); } finally { lock.releaseLock(); }
};

test('ID memorizado elimina busca/iteracao por nome entre chamadas com os mesmos dados e regras', () => {
  const optimized = cached(), baseline = harnessReady(harness());
  for (const h of [optimized, baseline]) saveTwice(h);
  assert.equal(count(optimized, 'lookup'), 0);
  assert.equal(count(optimized, 'hasNext'), 0);
  assert.equal(count(baseline, 'lookup'), 6);
  assert.deepEqual(optimized.writes, baseline.writes);
  assert.deepEqual([...optimized.files], [...baseline.files]);
  assert.deepEqual(optimized.counts, baseline.counts);
  // Contagem medida na fixture (por salvamento quente, 6 arquivos): o caminho por nome faz
  // 6 getFolderById (pastaRaizProjeto_, simulada aqui sem IO) + 6 buscas + 6 hasNext + 6 next = 24;
  // o caminho por ID faz 6 getFileById + 6 x (getName, isTrashed, getParents, hasNext, getId) = 36.
  // Leituras de conteúdo e gravações não mudam. Ganho real depende da latência no Apps Script.
  assert.deepEqual(tally(optimized), { getFileById: 6, getName: 6, isTrashed: 6, getParents: 6,
    parentHasNext: 6, parentGetId: 6, read: 6, setContent: 2 });
  assert.deepEqual(tally(baseline), { lookup: 6, hasNext: 6, next: 6, read: 6, setContent: 2 });
  assert.deepEqual(optimized.logs.filter(log => log.fase === 'drive_id').map(log => log.resultado),
    Array(6).fill('acerto'));
});

test('primeira chamada memoriza IDs sem cache negativo e com um getId por arquivo encontrado', () => {
  const h = cached();
  h.c.salvarCadastroElenco(h.payload('atletas'));
  assert.equal(count(h, 'lookup'), 6);
  assert.equal(count(h, 'getId'), 6); // 5 encontrados + historico criado.
  assert.equal(store(h).size, 6);
  assert.deepEqual([...store(h).values()].sort(),
    allFiles(h).map(name => h.ids.get(name)).filter(Boolean).sort());
});

test('conteudo e autorizacao sempre atuais: bloqueio externo e lido pelo ID e impede gravacao', () => {
  const h = cached();
  saveTwice(h);
  h.files.set('AEUV - Bloqueios de Elenco.json', JSON.stringify([{ campeonatoId: 'c1', equipeId: 'e1', bloqueado: true }]));
  h.state.perfil = 'associado';
  h.io.length = h.writes.length = 0;
  assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), /Elenco bloqueado/);
  assert.equal(count(h, 'lookup'), 0);
  assert.equal(h.writes.length, 0);
  assert(!h.locked());
  h.state.autorizado = false;
  h.state.perfil = 'admin';
  assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')));
  assert.equal(h.writes.length, 0);
});

test('cache por usuario: outro usuario busca pelo nome e nao herda IDs', () => {
  const h = cached();
  h.c.salvarCadastroElenco(h.payload('atletas'));
  h.state.cacheUser = 'usuario-2';
  h.io.length = 0;
  h.c.campeonatos_();
  assert.equal(count(h, 'lookup', 'AEUV - Campeonatos.json'), 1);
  assert.equal(count(h, 'getFileById'), 0);
  assert.equal(store(h, 'usuario-2').size, 1);
  assert.equal(store(h, 'usuario-1').size, 6);
  h.io.length = 0;
  h.c.campeonatos_();
  assert.equal(count(h, 'lookup'), 0);
  assert.equal(count(h, 'getFileById'), 1);
});

for (const mudanca of ['rename', 'move', 'trash']) {
  test(`ID ${mudanca} externamente e descartado e a busca por nome preserva ausencia/legado`, () => {
    const h = cached(), nome = rosterFile('c1', 'atletas');
    h.seed('c1', 'atletas', [person('atletas')]);
    assert.equal(h.c.lerListaCadastroDrive_(nome, 'legacy').length, 1);
    const antigo = h.ids.get(nome);
    if (mudanca === 'rename') h.drive.rename(nome, 'Outro.json');
    else h.drive[mudanca](nome);
    h.properties.set('legacy', JSON.stringify([{ id: 'legado', nome: 'Legado' }]));
    h.io.length = h.logs.length = 0;
    const lista = h.c.lerListaCadastroDrive_(nome, 'legacy', {}, 'atletas');
    assert.deepEqual([...lista.map(item => item.id)], ['legado']);
    assert.equal(count(h, 'read'), 0); // O arquivo antigo nunca é lido.
    assert.equal(count(h, 'getFileById'), 1);
    assert.equal(count(h, 'lookup', nome), 1);
    assert.deepEqual(h.logs.filter(log => log.fase === 'drive_id').map(log => log.resultado), ['divergente']);
    assert.equal([...store(h).values()].includes(antigo), false);
    assert.equal(store(h).size, 0); // Ausência não é memorizada.
  });
}

test('substituicao externa (lixeira + novo arquivo homonimo) recupera e memoriza o novo ID', () => {
  const h = cached();
  h.c.campeonatos_();
  const novo = h.drive.replace('AEUV - Campeonatos.json', JSON.stringify([{ id: 'c9', nome: 'Novo' }]));
  h.io.length = 0;
  assert.deepEqual([...h.c.campeonatos_().map(item => item.id)], ['c9']);
  assert.equal(count(h, 'lookup'), 1);
  assert.deepEqual([...store(h).values()], [novo]);
  h.io.length = 0;
  h.c.campeonatos_();
  assert.equal(count(h, 'lookup'), 0);
});

for (const [caso, preparar] of [
  ['removido definitivamente', h => h.drive.purge(historyFile)],
  ['sem permissao', h => { h.state.failGetById = 'Access denied: DriveApp.'; }]
]) {
  test(`falha de getFileById (${caso}) propaga erro claro, invalida e nao busca pelo nome na mesma chamada`, () => {
    const h = cached();
    saveTwice(h);
    const antes = JSON.stringify(h.roster('c1', 'atletas'));
    preparar(h);
    h.io.length = h.writes.length = h.logs.length = 0;
    let erro;
    assert.throws(() => h.c.salvarCadastroElenco(h.payload('comissao')), e => (erro = e, true));
    assert.match(erro.message, /referência memorizada.*descartada; tente novamente/);
    assert(erro.cause instanceof Error);
    assert.equal(count(h, 'lookup'), 0);
    assert.equal(h.writes.length, 0);
    assert.equal(JSON.stringify(h.roster('c1', 'atletas')), antes);
    assert(!h.locked());
    assert(h.logs.some(log => log.fase === 'drive_id' && log.resultado === 'falha'));
    assert(!h.logs.some(log => log.fase === 'resposta'));
    assert.equal(store(h).size, 5);
    h.state.failGetById = null;
    h.io.length = 0;
    h.c.salvarCadastroElenco(h.payload('comissao'));
    assert.equal(count(h, 'lookup'), 1); // Só a referência descartada volta a ser buscada pelo nome.
    if (caso === 'removido definitivamente') assert.equal(count(h, 'lookup', historyFile), 1);
    assert.equal(store(h).size, 6);
  });
}

test('falhas da verificacao de metadados tambem propagam e invalidam', () => {
  const h = cached();
  h.c.campeonatos_();
  const id = h.ids.get('AEUV - Campeonatos.json');
  const original = h.c.DriveApp.getFileById;
  h.c.DriveApp.getFileById = value => ({ ...original(value), getParents: () => { throw new Error('parents failure'); } });
  h.io.length = 0;
  assert.throws(() => h.c.campeonatos_(), /referência memorizada/);
  assert.equal(count(h, 'lookup'), 0);
  assert.equal([...store(h).values()].includes(id), false);
  h.c.DriveApp.getFileById = original;
  assert.equal(h.c.campeonatos_().length, 2);
  assert.equal(count(h, 'lookup'), 1);
});

test('legado ausente nao gera cache negativo; criacao memoriza ID e limpa legado apos sucesso', () => {
  const h = cached(), nome = rosterFile('c1', 'comissao'), chave = 'legacy';
  h.files.delete(nome);
  h.properties.set(chave, JSON.stringify([person('comissao')]));
  const lista = h.c.lerListaCadastroDrive_(nome, chave);
  assert.equal(store(h).size, 0);
  h.state.failCreate = nome;
  assert.throws(() => withLock(h, () => h.c.gravarListaCadastroDrive_(nome, chave, lista)), /create failure/);
  assert.equal(store(h).size, 0);
  assert(h.properties.has(chave));
  h.state.failCreate = null;
  withLock(h, () => h.c.gravarListaCadastroDrive_(nome, chave, lista));
  assert(!h.properties.has(chave));
  assert.deepEqual([...store(h).values()], [h.ids.get(nome)]);
  h.io.length = 0;
  withLock(h, () => h.c.gravarListaCadastroDrive_(nome, chave, [...lista, person('comissao', { id: 'novo' })]));
  assert.equal(count(h, 'lookup'), 0);
  assert.equal(count(h, 'create'), 0);
  assert.equal(h.c.lerListaCadastroDrive_(nome, chave).length, 2);
});

test('registro de equipes e bloqueios gravam pelo ID memorizado ou criam e memorizam', () => {
  const h = cached();
  h.files.delete('AEUV - Bloqueios de Elenco.json');
  h.c.lerBloqueiosElenco_();
  assert.equal(store(h).size, 0);
  h.c.definirBloqueioElenco({ campeonatoId: 'c1', equipeId: 'e1', bloqueado: true });
  assert.equal(count(h, 'create', 'AEUV - Bloqueios de Elenco.json'), 1);
  assert(h.c.lerBloqueiosElenco_()[0].bloqueado);
  h.c.lerRegistroEquipes_();
  h.io.length = 0;
  withLock(h, () => h.c.gravarRegistroEquipes_([{ id: 'e1', nome: 'Equipe A' }]));
  h.c.definirBloqueioElenco({ campeonatoId: 'c1', equipeId: 'e1', bloqueado: false });
  assert.equal(count(h, 'lookup', h.registryFile), 0);
  assert.equal(count(h, 'lookup', 'AEUV - Bloqueios de Elenco.json'), 0);
  assert.equal(count(h, 'create'), 0);
  // A gravação pelo ID removeu e2; a regra de semente recriou Equipe B com novo ID.
  const idsAtuais = [...h.c.lerRegistroEquipes_().map(item => item.id)];
  assert.equal(idsAtuais[0], 'e1');
  assert.match(idsAtuais[1], /^uuid-\d+$/);
  assert.equal(new Set(idsAtuais).size, 2);
  assert.equal(h.c.lerBloqueiosElenco_()[0].bloqueado, false);
});

test('historico novo criado no salvamento, reutilizado por ID e consolidado pela fila', () => {
  const h = cached();
  h.c.salvarCadastroElenco(h.payload('atletas'));
  assert.equal(count(h, 'create', historyFile), 1);
  h.io.length = 0;
  h.c.salvarCadastroElenco(h.payload('comissao'));
  assert.equal(count(h, 'lookup', historyFile), 0);
  assert.equal(count(h, 'create', historyFile), 0);
  h.c.processarHistoricoElencoAgora();
  assert(h.history().inscricoes.some(item => item.tipo === 'comissao' || item.dados.cargo));
});

test('homonimos: memoriza o primeiro da busca, continua nele e so troca se ele deixar de valer', () => {
  const h = cached(), nome = rosterFile('c1', 'atletas'), root = h.c.pastaRaizProjeto_;
  const primeiro = h.idOf(nome), segundo = 'drive999999999999';
  h.files.set(nome, JSON.stringify([{ id: 'primeiro' }]));
  h.meta.set(segundo, { name: nome, trashed: false, parent: 'root' });
  let ordem = [primeiro, segundo];
  const handle = id => ({ getId: () => id, getBlob: () => ({ getDataAsString: () =>
    id === segundo ? JSON.stringify([{ id: 'segundo' }]) : h.files.get(nome) }) });
  h.c.pastaRaizProjeto_ = () => ({ ...root(), getFilesByName: name => {
    if (name !== nome) return root().getFilesByName(name);
    h.io.push({ operacao: 'lookup', name });
    const lista = ordem.filter(id => !h.meta.get(id).trashed);
    return { hasNext: () => lista.length > 0, next: () => handle(lista.shift()) };
  } });
  assert.equal(h.c.lerListaCadastroDrive_(nome, 'legacy')[0].id, 'primeiro');
  ordem = [segundo, primeiro]; // Ordem do Drive não é garantida; o ID memorizado fixa a seleção.
  assert.equal(h.c.lerListaCadastroDrive_(nome, 'legacy')[0].id, 'primeiro');
  h.meta.get(primeiro).trashed = true;
  assert.equal(h.c.lerListaCadastroDrive_(nome, 'legacy')[0].id, 'segundo');
  assert.deepEqual([...store(h).values()], [segundo]);
});

test('handles da operacao continuam unicos por arquivo sob lock com cache quente', () => {
  const h = cached();
  saveTwice(h);
  h.io.length = 0;
  h.c.salvarCadastroElenco(h.payload('comissao'));
  assert.equal(count(h, 'getFileById'), 6);
  assert.equal(count(h, 'lookup'), 0);
  for (const name of [historyFile, rosterFile('c1', 'comissao')]) {
    assert.equal(count(h, 'setContent', name), 1);
  }
});

test('cache guarda apenas IDs com chave hash; logs nao expõem nomes, IDs ou dados', () => {
  const h = cached();
  saveTwice(h);
  for (const [key, value] of store(h)) {
    assert.match(key, /^aeuv\.arquivoId\.v1\.[A-Za-z0-9_=-]+$/);
    assert.match(value, /^drive\d{12}$/);
    for (const secret of [h.rootId(), 'AEUV', 'c1', 'Equipe']) assert(!key.includes(secret));
  }
  const text = JSON.stringify(h.logs);
  for (const secret of [...store(h).values(), h.rootId(), historyFile, h.registryFile, 'Carlos', '52998224725']) {
    assert(!text.includes(secret), secret);
  }
  for (const log of h.logs.filter(item => item.fase === 'drive_id')) {
    assert.deepEqual(Object.keys(log).sort(), ['categoria', 'fase', 'metrica', 'resultado']);
  }
  h.logs.length = 0;
  h.c.campeonatos_();
  h.c.lerHistoricoElenco_();
  assert.equal(h.logs.length, 0);
});

test('valor adulterado no cache e descartado e o arquivo e localizado pelo nome', () => {
  const h = cached();
  h.c.campeonatos_();
  const [key] = store(h).keys();
  store(h).set(key, '{"lista":[1]}');
  h.io.length = 0;
  assert.equal(h.c.campeonatos_({}, 'campeonatos').length, 2);
  assert.equal(count(h, 'getFileById'), 0);
  assert.equal(count(h, 'lookup'), 1);
  assert.match(store(h).get(key), /^drive\d{12}$/);
});

for (const falha of ['failCacheService', 'failCacheGet', 'failCachePut', 'failCacheRemove']) {
  test(`CacheService indisponivel (${falha}) equivale a nao memorizado, sem mudar dados`, () => {
    const h = cached(), baseline = harnessReady(harness());
    h.state[falha] = true;
    for (const item of [h, baseline]) saveTwice(item);
    assert.deepEqual([...h.files], [...baseline.files]);
    assert.deepEqual(h.writes, baseline.writes);
    if (falha === 'failCacheRemove') {
      h.drive.trash(rosterFile('c2', 'comissao'));
      assert.equal(h.c.lerListaCadastroDrive_(rosterFile('c2', 'comissao'), 'legacy').length, 0);
      assert.equal(h.c.lerListaCadastroDrive_(rosterFile('c2', 'comissao'), 'legacy').length, 0);
    }
  });
}

test('remocao de campeonato pelo repositorio invalida IDs das listas; tabelas nao usam cache', () => {
  const h = cached();
  for (const tipo of ['atletas', 'comissao']) h.c.lerListaCadastroDrive_(rosterFile('c1', tipo), 'legacy');
  assert.equal(store(h).size, 2);
  h.c.removerCadastroPessoasCampeonato_('c1');
  assert.equal(store(h).size, 0);
  assert.equal(count(h, 'trash'), 2);
  h.io.length = 0;
  assert.equal(h.c.lerListaCadastroDrive_(rosterFile('c1', 'atletas'), 'legacy').length, 0);
  assert.equal(count(h, 'getFileById'), 0);
  const ops = h.cacheOps.length;
  h.files.set(h.c.arquivoTabelaCampeonato_('c1'), '[]');
  h.c.lerListaCadastroDrive_(h.c.arquivoTabelaCampeonato_('c1'), 'tabela');
  assert.equal(h.cacheOps.length, ops);
});
