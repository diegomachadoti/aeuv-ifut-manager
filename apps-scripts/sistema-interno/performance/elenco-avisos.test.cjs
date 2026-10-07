const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const helpers = html.slice(html.indexOf('    function permitirEdicaoElenco_('),
  html.indexOf('    function marcarElencoPendente_('));

function fixture() {
  const nodes = new Map();
  let markup = '', reload;
  const area = {
    insertAdjacentHTML(position, text) {
      markup = text;
      nodes.set('elencoAviso', { remove() { nodes.delete('elencoAviso'); } });
      if (text.includes('id="elencoReler"')) nodes.set('elencoReler', {});
    }
  };
  nodes.set('areaTimesCampeonato', area);
  const c = vm.createContext({
    document: { getElementById: id => nodes.get(id) || null },
    elencoAtual: { campeonatoId: 'c1', equipeId: 'e1', salvando: false },
    moduloAtual: 'times-campeonato',
    cadastroPessoasCampeonato: { podeEditar: true },
    escapar: value => String(value).replaceAll('<', '&lt;'),
    focarAvisoOuFormulario_: () => {},
    abrirElenco: (...args) => { reload = args; }
  });

  test('foco explícito acompanha formulário, carregamento e avisos, respeitando movimento reduzido', () => {
    const script = html.slice(html.indexOf('    function focarAvisoOuFormulario_('),
      html.indexOf('    function acompanharFocoCarregamento('));
    for (const reduced of [false, true]) {
      const calls = [];
      const element = {
        setAttribute: (...args) => calls.push(['attribute', ...args]),
        focus: options => calls.push(['focus', options]),
        scrollIntoView: options => calls.push(['scroll', options])
      };
      const c = vm.createContext({ window: { matchMedia: () => ({ matches: reduced }) } });
      vm.runInContext(script, c);
      c.focarAvisoOuFormulario_(null);
      c.focarAvisoOuFormulario_(element);
      assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
        ['attribute', 'tabindex', '-1'],
        ['focus', { preventScroll: true }],
        ['scroll', { block: 'center', behavior: reduced ? 'auto' : 'smooth' }]
      ]);
    }
    assert.match(html, /focarAvisoOuFormulario_\(document\.getElementById\('elencoFormTitulo'\)\)/);
    assert.match(html, /focarAvisoOuFormulario_\(document\.getElementById\('cadastroPessoaLoading'\)\.querySelector/);
    assert.match(html, /if \(recado\) focarAvisoOuFormulario_\(document\.getElementById\('elencoRecado'\)\)/);
  });
  vm.runInContext(helpers, c);
  return { c, nodes, markup: () => markup, reload: () => reload };
}

test('falha incerta impede nova mutação e oferece releitura atual do mesmo elenco', () => {
  const h = fixture();
  assert.equal(h.c.permitirEdicaoElenco_(), true);
  assert.equal(h.c.exigirReleituraAposFalhaElenco_({
    message: 'Não foi possível confirmar a gravação do elenco. Acesso negado: DriveApp.'
  }), true);
  assert.equal(h.c.elencoAtual.requerReleitura, true);
  assert.equal(h.c.permitirEdicaoElenco_(), false);
  assert.match(h.markup(), /Recarregar elenco/);
  h.nodes.get('elencoReler').onclick();
  assert.deepEqual(h.reload(), ['c1', 'e1']);
});

test('falha de histórico exige releitura; erros de validação não bloqueiam correção', () => {
  const h = fixture();
  assert.equal(h.c.exigirReleituraAposFalhaElenco_({ message: 'Informe CPF válido.' }), false);
  assert.equal(h.c.permitirEdicaoElenco_(), true);
  assert.equal(h.c.exigirReleituraAposFalhaElenco_({
    message: 'O elenco foi salvo, mas o histórico não foi atualizado.'
  }), true);
  assert.equal(h.c.permitirEdicaoElenco_(), false);
});

test('avisos anteriores são substituídos e releitura obsoleta não navega', () => {
  const h = fixture();
  for (const id of ['elencoRecado', 'avisoRemocaoBloqueada']) {
    h.nodes.set(id, { remove() { h.nodes.delete(id); } });
  }
  h.c.mostrarAvisoElenco_('Erro <anterior>');
  assert(!h.nodes.has('elencoRecado'));
  assert(!h.nodes.has('avisoRemocaoBloqueada'));
  assert.match(h.markup(), /&lt;anterior>/);
  h.c.exigirReleituraAposFalhaElenco_({ message: 'Acesso negado: DriveApp.' });
  const reler = h.nodes.get('elencoReler');
  h.c.elencoAtual = { campeonatoId: 'outro', equipeId: 'outra' };
  reler.onclick();
  assert.equal(h.reload(), undefined);
  assert.match(html, /if \(elencoAtual\) limparAvisosElenco_\(\)/);
  assert.match(html, /if \(!exigirReleituraAposFalhaElenco_\(erro\)\) mostrarAvisoElenco_/);
});
