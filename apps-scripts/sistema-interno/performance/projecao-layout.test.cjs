const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const subtotais = {};
const c = vm.createContext({
  simplificar: texto => String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
  escapar: texto => String(texto).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
  formatarMoedaJs: n => 'R$ ' + n.toFixed(2), iconeSistema_: () => '<svg aria-hidden="true"></svg>',
  document: { querySelector: seletor => subtotais[seletor] || null }
});
vm.runInContext(html.slice(html.indexOf('    var projGastosLinhas = []'),
  html.indexOf('    function desenharLinhasProjecao_()')) + '\n globalThis.grupos = PROJ_GRUPOS;', c);
const inicio = html.indexOf('    function atualizarSubtotaisProjecao_()');
vm.runInContext(html.slice(inicio, html.indexOf('    function abrirSeletorItemFixoProjecao_(', inicio)), c);

test('agrupamento distingue premiações, operação e despesas livres sem mudar dados', () => {
  assert.equal(c.grupoItemProjecao_({ descricao: 'Premiação Troféus', fixo: true }), 'premiacoes');
  for (const descricao of ['Artilheiro', 'Técnico Campeão', 'Craque da Final', 'App iFut']) {
    assert.equal(c.grupoItemProjecao_({ descricao, fixo: true }), 'operacao');
  }
  assert.equal(c.grupoItemProjecao_({ descricao: 'Segurança', fixo: true }), 'outros');
  assert.equal(c.grupoItemProjecao_({ descricao: 'Premiação personalizada', fixo: false }), 'outros');
});

test('tabelas preservam os índices originais e escapam campos editáveis', () => {
  c.projGastosLinhas = [
    { descricao: 'Segurança', fixo: true, valor: 20 },
    { descricao: 'Premiação 1', fixo: true, valor: 100 },
    { descricao: '<script>"', fixo: false, valor: 10 }
  ];
  const premios = c.tabelaGrupoProjecao_(c.grupos[0], true);
  assert.match(premios, /data-proj-valor="1"/);
  assert.match(premios, /data-proj-remover="1"/);
  assert.doesNotMatch(premios, /Segurança/);
  const outros = c.tabelaGrupoProjecao_(c.grupos[2], true);
  assert.match(outros, /data-proj-desc="2"/);
  assert.match(outros, /&lt;script>&quot;/);
  assert.doesNotMatch(outros, /<script>/);
});

test('modo consulta não oferece adicionar/remover e desabilita os valores', () => {
  const tabela = c.tabelaGrupoProjecao_(c.grupos[2], false);
  assert.doesNotMatch(tabela, /data-proj-remover|data-proj-adicionar/);
  assert.match(tabela, / disabled/);
});

test('subtotais refletem os mesmos valores da projeção, incluindo grupos vazios', () => {
  for (const g of c.grupos) subtotais['[data-proj-subtotal="' + g.id + '"]'] = {};
  c.atualizarSubtotaisProjecao_();
  assert.equal(subtotais['[data-proj-subtotal="premiacoes"]'].textContent, 'R$ 100.00');
  assert.equal(subtotais['[data-proj-subtotal="operacao"]'].textContent, 'R$ 0.00');
  assert.equal(subtotais['[data-proj-subtotal="outros"]'].textContent, 'R$ 30.00');
});

test('CSS adapta tabela para mobile com alvos de toque e tema escuro', () => {
  assert.match(html, /\.proj-tabela tbody tr \{ display: grid; grid-template-columns: minmax\(0, 1fr\) 52px/);
  assert.match(html, /\.proj-tabela input, \.proj-tabela \.proj-linha-remover \{ min-height: 44px/);
  assert.match(html, /body\.tema-escuro \.proj-grupo/);
});
