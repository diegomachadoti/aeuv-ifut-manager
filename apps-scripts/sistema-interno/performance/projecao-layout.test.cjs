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

function persistencia() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
  let documento = '{}';
  const b = vm.createContext({
    identificarUsuario_: () => ({ autorizado: true, email: 'admin@test.local', usuario: { perfil: 'admin' } }),
    moduloLiberado_: () => true,
    calcularSaldoFinanceiro_: () => ({ saldoAtual: 1000, totalEntradas: 1000, totalSaidas: 0 }),
    formatarDataHora_: () => '31/10/2026',
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }
  });
  vm.runInContext(source.slice(source.indexOf('const PROJECAO_GASTOS_ITENS_FIXOS ='),
    source.indexOf('function gerarPdfProjecaoGastos(')) + '\nglobalThis.modelo = PROJECAO_GASTOS_ITENS_FIXOS;', b);
  b.arquivoProjecaoGastos_ = () => ({
    getBlob: () => ({ getDataAsString: () => documento }),
    setContent: texto => { documento = texto; }
  });
  return { b, documento: () => JSON.parse(documento) };
}

test('terceiro lugar salvo é reconhecido mesmo com espaços no modelo antigo', () => {
  const linhas = c.restaurarItensProjecao_([{ descricao: 'Premiação 3 | Terceiro', valor: 2000 }],
    ['Premiação 3 | Terceiro ']);
  assert.equal(linhas[0].fixo, true);
  assert.equal(c.grupoItemProjecao_(linhas[0]), 'premiacoes');
  assert.equal(linhas[0].valor, 2000);
});

test('todos os itens do modelo mantêm valor e grupo ao salvar e recarregar; remoção persiste', () => {
  const h = persistencia();
  const todos = Array.from(h.b.modelo, (descricao, i) => ({ descricao, valor: (i + 1) * 12.5 }));
  todos.push({ descricao: 'Serviço personalizado', valor: 123.45 });
  const esperado = c.restaurarItensProjecao_(todos, h.b.modelo);
  h.b.salvarProjecaoGastos({ usarSaldoCaixa: false, saldoInicial: 5000, itens: todos });
  const recarregados = c.restaurarItensProjecao_(h.b.listarProjecaoGastos().itens, h.b.modelo);
  assert.equal(recarregados.length, todos.length);
  esperado.forEach((item, i) => {
    assert.equal(recarregados[i].valor, item.valor);
    assert.equal(recarregados[i].descricao, item.descricao);
    assert.equal(c.grupoItemProjecao_(recarregados[i]), c.grupoItemProjecao_(item));
  });
  // Remove cada item por vez, como faz o botão da tabela (índice do array original).
  todos.forEach((alvo, indice) => {
    const restantes = todos.slice();
    restantes.splice(indice, 1);
    h.b.salvarProjecaoGastos({ usarSaldoCaixa: true, itens: restantes });
    const salvo = h.b.listarProjecaoGastos();
    assert.equal(salvo.itens.length, todos.length - 1);
    assert(!salvo.itens.some(item => item.descricao === alvo.descricao));
    assert.equal(h.documento().itens.length, restantes.length);
  });
  h.b.salvarProjecaoGastos({ usarSaldoCaixa: true, itens: [] });
  assert.equal(h.b.listarProjecaoGastos().itens.length, 0);
});

test('preencher modelo após recarga não duplica nomes com espaços e mantém valores', () => {
  const inicio = html.indexOf('    function preencherModeloProjecao_()');
  const fim = html.indexOf('    function salvarProjecaoGastosDaTela_()', inicio);
  const h = vm.createContext({
    projecaoGastos: { itensFixos: ['Premiação 3 | Terceiro ', 'App iFut', 'App iFut '] },
    projGastosLinhas: [{ descricao: 'Premiação 3 | Terceiro', valor: 2000, fixo: true }],
    desenharLinhasProjecao_: () => {}, recalcularProjecao_: () => {},
    chaveItemProjecao_: c.chaveItemProjecao_
  });
  vm.runInContext(html.slice(inicio, fim), h);
  h.preencherModeloProjecao_();
  h.preencherModeloProjecao_();
  assert.equal(h.projGastosLinhas.length, 2);
  assert.equal(h.projGastosLinhas[0].valor, 2000);
});
