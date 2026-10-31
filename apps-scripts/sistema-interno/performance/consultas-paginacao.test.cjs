const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const inicio = html.indexOf('    function normalizarTamanhoPagina_(');
const fim = html.indexOf('    function carregarPunicoes(', inicio);

function fixture(id) {
  const nodes = {};
  for (const prefix of ['porPagina', 'pagina', 'anterior', 'proxima']) {
    nodes[prefix + id] = { addEventListener(event, fn) { this[event] = fn; } };
  }
  const c = vm.createContext({ document: { getElementById: name => nodes[name] } });
  vm.runInContext(html.slice(inicio, fim), c);
  return { c, nodes };
}

for (const id of ['Sumulas', 'Punicoes']) {
  test(id + ': navegação 10 em 10, última página e troca para 25/50', () => {
    const h = fixture(id);
    const estado = { pagina: 0, porPagina: 10, registros: Array.from({ length: 53 }, (_, i) => i) };
    let linhas;
    const desenhar = r => { linhas = Array.from(r); };
    h.c.conectarPaginacaoConsulta_(id, estado, desenhar, 'registros');
    h.c.desenharPaginaConsulta_(id, estado, desenhar, 'registros');
    assert.equal(linhas.length, 10);
    assert.equal(h.nodes['anterior' + id].disabled, true);
    h.nodes['proxima' + id].click();
    assert.equal(linhas[0], 10);
    estado.pagina = 99;
    h.c.desenharPaginaConsulta_(id, estado, desenhar, 'registros');
    assert.deepEqual(linhas, [50, 51, 52]);
    assert.equal(h.nodes['proxima' + id].disabled, true);
    for (const tamanho of [25, 50, 10]) {
      h.nodes['porPagina' + id].value = String(tamanho);
      h.nodes['porPagina' + id].change();
      assert.equal(estado.pagina, 0);
      assert.equal(linhas.length, tamanho);
    }
    estado.registros = [];
    h.c.desenharPaginaConsulta_(id, estado, desenhar, 'registros');
    assert.equal(linhas.length, 0);
    assert.match(h.nodes['pagina' + id].textContent, /0–0 de 0/);
    assert.equal(h.nodes['anterior' + id].disabled, true);
    assert.equal(h.nodes['proxima' + id].disabled, true);
  });
}

test('HTML oferece 10/25/50 e navegação acessível', () => {
  const h = fixture('Sumulas');
  const bloco = h.c.controlesPaginacaoConsulta_('Sumulas', 'Súmulas');
  for (const valor of [10, 25, 50]) assert(bloco.includes('value="' + valor + '"'));
  assert.match(bloco, /aria-controls="linhasSumulas"/);
  assert.match(bloco, /aria-live="polite"/);
  assert.match(html, /id="porPaginaSolicitacoes"><option value="10">/);
});
