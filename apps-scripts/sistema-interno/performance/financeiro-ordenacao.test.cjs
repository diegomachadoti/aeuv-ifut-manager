const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');

function harness(rows) {
  const state = { rows, autorizado: true };
  const context = vm.createContext({
    identificarUsuario_: () => ({ autorizado: state.autorizado, usuario: { perfil: 'admin' } }),
    moduloLiberado_: () => true,
    abaFinanceiro_: () => ({ getDataRange: () => ({ getValues: () => [['cabecalho'], ...state.rows] }) }),
    planilhaFinanceiro_: () => ({ getUrl: () => 'https://example.org/planilha' }),
    FINANCEIRO_CATEGORIAS_ENTRADA: [], FINANCEIRO_CATEGORIAS_SAIDA: [], FINANCEIRO_COMPETICOES_ORIGEM: [],
    Utilities: { formatDate: value => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(value) }
  });
  vm.runInContext(source.slice(source.indexOf('function normalizarDataFinanceiro_('),
    source.indexOf('function salvarLancamentoFinanceiro(')), context);
  return { state, context, ids: () => Array.from(context.listarFinanceiro().lancamentos, item => item.idLancamento) };
}

const row = (id, date, origem = 'Liga A', tipo = 'Entrada', valor = 50) =>
  [id, date, tipo, origem, 'Categoria', id, valor, '', '', '', '', '', '10/10/2026 09:00', 'teste'];

test('lista por data da movimentacao, nao pela linha ou data de criacao', () => {
  const rows = [row('FIN-20261008-100000', '06/10/2026'), row('FIN-20261008-100100', '05/10/2026'),
    row('FIN-20261008-100200', '08/10/2026'), row('FIN-20261008-100300', '01/09/2026')];
  const h = harness(rows);
  assert.deepEqual(h.ids(), ['FIN-20261008-100200', 'FIN-20261008-100000', 'FIN-20261008-100100', 'FIN-20261008-100300']);
  assert.deepEqual(rows.map(r => r[0]), ['FIN-20261008-100000', 'FIN-20261008-100100', 'FIN-20261008-100200', 'FIN-20261008-100300']);
});

test('lancamento retroativo novo vai para posicao cronologica e editar data reordena', () => {
  const h = harness([row('FIN-001', '06/10/2026'), row('FIN-002', '08/10/2026')]);
  h.state.rows.push(row('FIN-003', '05/10/2026'));
  assert.deepEqual(h.ids(), ['FIN-002', 'FIN-001', 'FIN-003']);
  h.state.rows[0][1] = '09/10/2026';
  assert.deepEqual(h.ids(), ['FIN-001', 'FIN-002', 'FIN-003']);
  h.state.rows[0][1] = '01/09/2026';
  assert.deepEqual(h.ids(), ['FIN-002', 'FIN-003', 'FIN-001']);
});

test('formatos de data e viradas de mes/ano usam cronologia real', () => {
  const h = harness([row('a', '31/12/2025'), row('b', '2026-01-01'), row('c', '30-09-2026'),
    row('d', '2026/10/01'), row('e', new Date('2026-10-08T03:00:00Z')), row('f', '2026-10-09T15:00:00Z')]);
  assert.deepEqual(h.ids(), ['f', 'e', 'd', 'c', 'b', 'a']);
});

test('empate de data usa protocolo decrescente, inclusive apos reorganizar a planilha', () => {
  const h = harness([row('FIN-20261008-120000', '08/10/2026'), row('FIN-20261008-090000', '2026-10-08')]);
  assert.deepEqual(h.ids(), ['FIN-20261008-120000', 'FIN-20261008-090000']);
  h.state.rows.reverse();
  assert.deepEqual(h.ids(), ['FIN-20261008-120000', 'FIN-20261008-090000']);
});

test('datas ausentes/invalidas vao ao final; totais e autorizacao permanecem', () => {
  const h = harness([row('a', '', 'Liga A', 'Saída', 20), row('b', '31/02/2026'),
    row('c', '29/02/2024'), row('d', 'invalida'), row('e', '2026-13-01')]);
  assert.equal(h.ids()[0], 'c');
  assert.equal(h.context.listarFinanceiro().totalEntradas, 200);
  assert.equal(h.context.listarFinanceiro().totalSaidas, 20);
  assert.equal(h.context.listarFinanceiro().saldoAtual, 180);
  h.state.autorizado = false;
  assert.throws(() => h.context.listarFinanceiro(), /permissão/);
});

test('renderizacao com filtros preserva ordem cronologica retornada pelo backend', () => {
  const h = harness([row('ANTIGO_A', '05/10/2026'), row('NOVO_B', '09/10/2026', 'Liga B'),
    row('NOVO_A', '08/10/2026'), row('RETROATIVO_A', '01/09/2026')]);
  const tbody = { innerHTML: '', querySelectorAll: () => [] };
  Object.assign(h.context, {
    financeiroDados: h.context.listarFinanceiro(),
    financeiroFiltros: { origem: 'Liga A' },
    document: { getElementById: id => id === 'linhasFinanceiro' ? tbody : null },
    escapar: String, formatarDataBr: String, formatarMoedaJs: String
  });
  vm.runInContext(index.slice(index.indexOf('    function renderizarLinhasFinanceiro()'),
    index.indexOf('    function abrirModalNovoLancamento(')), h.context);
  h.context.renderizarLinhasFinanceiro();
  assert(tbody.innerHTML.indexOf('NOVO_A') < tbody.innerHTML.indexOf('ANTIGO_A'));
  assert(tbody.innerHTML.indexOf('ANTIGO_A') < tbody.innerHTML.indexOf('RETROATIVO_A'));
  assert(!tbody.innerHTML.includes('NOVO_B'));
  assert(index.includes('.salvarLancamentoFinanceiro(payload)'));
  assert.match(index, /withSuccessHandler\(function \(res\) \{\s*modal\.remove\(\);\s*carregarFinanceiro\(\);/);
});
