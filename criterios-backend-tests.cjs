const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

const context = {};
vm.runInNewContext(fs.readFileSync('apps-scripts/sistema-interno/WebApp.gs', 'utf8'), context);
context.Utilities = {
  DigestAlgorithm: { SHA_256: 'sha256' },
  computeDigest: function (algorithm, input) {
    return Array.from(crypto.createHash(algorithm).update(input).digest())
      .map(function (byte) { return byte > 127 ? byte - 256 : byte; });
  }
};

const teams = function (ids) {
  return ids.map(function (id, index) {
    return { id: id, nome: String.fromCharCode(65 + index), escudo: '' };
  });
};
const game = function (id, home, away, goalsHome, goalsAway, extra) {
  return Object.assign({
    id: id, faseId: 'fase-classificacao', grupoId: 'g', status: 'encerrado',
    mandanteId: home, visitanteId: away, golsMandante: goalsHome, golsVisitante: goalsAway
  }, extra || {});
};
const criteria = function (keys, points) {
  const scores = points || [3, 1, 0];
  return {
    pontosVitoria: scores[0], pontosEmpate: scores[1], pontosDerrota: scores[2],
    desempates: keys
  };
};
const scope = function (ids) {
  return { id: 'geral', nome: 'Classificação geral', equipeIds: ids };
};
const rank = function (list, games, rules, decisionList, rankingScope) {
  return context.resultadoClassificacaoTabela_(
    list, games, rules, rankingScope || scope(list.map(function (team) { return team.id; })),
    decisionList || []
  );
};
const plain = function (value) { return JSON.parse(JSON.stringify(value)); };

assert.deepEqual(plain(context.criteriosPadraoTabela_().desempates), ['vitorias', 'saldoGols', 'golsPro']);
assert.deepEqual(plain(context.validarCriteriosTabela_({
  pontosVitoria: 3, pontosEmpate: 1, pontosDerrota: 0,
  desempates: ['golsContra', 'confrontoDireto', 'amarelos', 'vermelhos']
})).desempates, ['golsContra', 'confrontoDireto', 'amarelos', 'vermelhos']);
assert.equal(context.validarCriteriosTabela_(criteria([])).desempates.length, 0);
assert.throws(function () { context.validarCriteriosTabela_(criteria(['vitorias', 'vitorias'])); });
assert.throws(function () { context.validarCriteriosTabela_(criteria(['not-a-criterion'])); });

let list = teams(['a', 'b', 'c']);
let games = [game('ab', 'a', 'b', 1, 0), game('bc', 'b', 'c', 1, 0), game('ca', 'c', 'a', 1, 0)];
let result = rank(list, games, criteria(['confrontoDireto']));
assert.equal(result.empates.length, 1, 'skip head-to-head for an unresolved three-team bucket');
assert.equal(new Set(plain(result.linhas.map(function (row) { return row.posicao; }))).size, 1);

games = [game('ab', 'a', 'b', 2, 0), game('ca', 'c', 'a', 1, 0), game('bc', 'b', 'c', 1, 0)];
result = rank(list, games, criteria(['golsContra', 'confrontoDireto']));
assert.deepEqual(plain(result.linhas.map(function (row) { return row.equipeId; })), ['c', 'a', 'b'],
  'allow head-to-head after an earlier criterion partitions a bucket to two');

games = [
  game('ab1', 'a', 'b', 1, 0),
  game('ab2', 'b', 'a', 0, 0, { resultado: { penaltis: true, golsPenaltisMandante: 9, golsPenaltisVisitante: 0 } }),
  game('bc', 'b', 'c', 1, 0), game('ca', 'c', 'a', 1, 0)
];
result = rank(list, games, criteria(['confrontoDireto']));
assert.deepEqual(plain(result.linhas.slice(0, 2).map(function (row) { return row.equipeId; })), ['a', 'b'],
  'aggregate points over direct encounters and ignore penalties');
result = rank(teams(['x', 'y']), [], criteria(['confrontoDireto']));
assert.equal(result.linhas[0].posicao, result.linhas[1].posicao, 'skip direct criterion when the teams never met');

const snapshotTeam = function (id, athletes, commission) {
  return { id: id, atletas: athletes || [], comissao: commission || [] };
};
games = [game('cards', 'x', 'y', 0, 0, { resultado: { equipes: [
  snapshotTeam('x', [{ id: 'ax', amarelos: 1, vermelho: false }]),
  snapshotTeam('y', [], [{ id: 'cy', amarelos: 0, vermelho: true }])
] } })];
result = rank(teams(['x', 'y']), games, criteria(['amarelos', 'vermelhos']));
assert.equal(result.linhas[0].equipeId, 'y', 'count commission cards and sort cards ascending');
assert.equal(result.linhas[0].vermelhos, 1);
assert.equal(result.linhas[1].amarelos, 1);
games = [game('legacy', 'x', 'y', 0, 0), Object.assign(game('knockout', 'x', 'y', 9, 0), {
  faseId: 'fase-final'
})];
result = rank(teams(['x', 'y']), games, criteria(['amarelos']));
assert.equal(result.linhas[0].jogos, 1, 'do not count knockout results in the first phase');
assert.equal(result.linhas[0].amarelos, 0, 'missing legacy event snapshots count as zero');

list = teams(['m', 'n', 'z']);
result = rank(list, [], criteria([]));
const tie = result.empates[0];
const decision = {
  escopo: 'geral', assinaturaEmpate: tie.assinaturaEmpate, equipeIds: ['z', 'm', 'n'],
  motivo: 'Decisão registrada', registradoEm: '2026-01-01T00:00:00.000Z', registradoPor: 'Diretoria'
};
result = rank(list, [], criteria([]), [decision]);
assert.deepEqual(plain(result.linhas.map(function (row) { return row.equipeId; })), ['z', 'm', 'n']);
assert.deepEqual(plain(result.linhas.map(function (row) { return row.posicao; })), [1, 2, 3]);

const signature = function (matches, members, keys) {
  return context.assinaturaEmpateTabela_(
    { id: 'geral', equipeIds: members || ['m', 'n', 'z'] }, ['m', 'n', 'z'],
    matches || [], criteria(keys || [])
  );
};
assert.match(signature(), /^sha256:[a-f0-9]{64}$/);
assert.notEqual(signature([game('score', 'm', 'n', 1, 0)]), signature(), 'fingerprint includes scores');
assert.notEqual(signature([game('cards', 'm', 'n', 0, 0, { resultado: { equipes: [
  snapshotTeam('m', [{ id: 'athlete', amarelos: 1, vermelho: false }]), snapshotTeam('n')
] } })]), signature(), 'fingerprint includes cards');
assert.notEqual(signature([], ['m', 'n']), signature(), 'fingerprint includes membership');
assert.notEqual(signature([], undefined, ['amarelos']), signature(), 'fingerprint includes criteria');
assert.equal(signature(), signature(), 'fingerprint does not depend on stored manual decisions or document revision');

const oldDocument = {
  schema: 'aeuv.tabela', versao: 1, revisao: 'old-revision', campeonatoId: 'cup',
  grupos: [], jogos: [], criterios: criteria(['vitorias'])
};
context.lerDocumentoTabela_ = function () { return oldDocument; };
assert.deepEqual(plain(context.lerTabelaCampeonato_('cup').desempatesOrganizacao), []);
oldDocument.desempatesOrganizacao = [{
  escopo: 'geral', assinaturaEmpate: 'stale-signature', equipeIds: ['removed-team'],
  motivo: 'Decisão antiga', registradoEm: '2026-01-01T00:00:00.000Z', registradoPor: 'Admin'
}];
assert.equal(context.lerTabelaCampeonato_('cup').desempatesOrganizacao.length, 1,
  'stale stored decisions do not invalidate old team references');

console.log('criterios-backend-tests.cjs: ranking, signatures and legacy cases passed');
