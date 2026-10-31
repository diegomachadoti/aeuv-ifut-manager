const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const inicio = html.indexOf('    function gerarPreCargaSumulasDaTela_()');
const fim = html.indexOf('    function montarTelaSumulas(', inicio);
assert(inicio >= 0 && fim > inicio);

function fixture() {
  const nodes = {
    gerarPreCargaSumulas: { disabled: false, textContent: 'Gerar pré-carga' },
    estadoCargaSumulas: { textContent: '' }
  };
  const calls = [];
  let removidos = 0;
  const c = vm.createContext({
    document: { getElementById: id => nodes[id] || null },
    sumulasCarga: { token: 1 }, sumulas: { provisorio: true, generatedAt: '2026-10-31' },
    moduloAtual: 'sumulas', overlayGlobalAtual: null,
    cargaSumulasAtual_: token => c.moduloAtual === 'sumulas' && c.sumulasCarga.token === token,
    mostrarOverlayGlobal_: texto => { c.overlayGlobalAtual = { texto }; },
    removerOverlayGlobal_: () => { removidos++; c.overlayGlobalAtual = null; },
    escapar: texto => String(texto).replaceAll('<', '&lt;'), dataSnapshot_: data => data,
    google: { script: { get run() {
      let success, failure;
      const rpc = {
        withSuccessHandler(fn) { success = fn; return rpc; },
        withFailureHandler(fn) { failure = fn; return rpc; },
        recalcularSnapshotSumulas() { calls.push({ success, failure }); }
      };
      return rpc;
    } } }
  });
  vm.runInContext(html.slice(inicio, fim), c);
  return { c, nodes, calls, removidos: () => removidos };
}

test('aviso provisório usa destaque das solicitações e confirmação usa apoio', () => {
  const h = fixture();
  const aviso = h.c.estadoCargaSumulas_('Conferindo <dados>');
  assert.match(aviso, /class="aviso"/);
  assert.match(aviso, /role="status" aria-live="polite"/);
  assert.match(aviso, /Conferindo &lt;dados>/);
  assert.match(aviso, /Cópia gerada em 2026-10-31/);
  h.c.sumulas.provisorio = false;
  assert.match(h.c.estadoCargaSumulas_(''), /class="apoio"/);
  assert.match(h.c.estadoCargaSumulas_(''), /Dados atuais conferidos/);
});

test('geração mostra loading padrão, bloqueia clique duplicado e fecha no sucesso', () => {
  const h = fixture();
  h.c.gerarPreCargaSumulasDaTela_();
  assert.match(h.c.overlayGlobalAtual.texto, /Gerando pré-carga/);
  assert.equal(h.nodes.gerarPreCargaSumulas.disabled, true);
  h.c.gerarPreCargaSumulasDaTela_();
  assert.equal(h.calls.length, 1);
  h.calls[0].success({ disponivel: true });
  assert.equal(h.removidos(), 1);
  assert.equal(h.nodes.gerarPreCargaSumulas.disabled, false);
  assert.match(h.nodes.estadoCargaSumulas.textContent, /Pré-carga gerada/);
});

test('falha remove loading e permite tentar novamente', () => {
  const h = fixture();
  h.c.gerarPreCargaSumulasDaTela_();
  h.calls[0].failure(new Error('Sem permissão'));
  assert.equal(h.c.overlayGlobalAtual, null);
  assert.equal(h.nodes.gerarPreCargaSumulas.disabled, false);
  assert.equal(h.nodes.gerarPreCargaSumulas.textContent, 'Gerar pré-carga');
  assert.equal(h.nodes.estadoCargaSumulas.textContent, 'Sem permissão');
});

test('callback antigo limpa seu loading sem alterar outra tela ou overlay', () => {
  const h = fixture();
  h.c.gerarPreCargaSumulasDaTela_();
  h.c.moduloAtual = 'notas';
  h.calls[0].success({ disponivel: true });
  assert.equal(h.removidos(), 1);
  assert.equal(h.nodes.estadoCargaSumulas.textContent, '');
  h.c.moduloAtual = 'sumulas';
  h.c.gerarPreCargaSumulasDaTela_();
  const outro = { texto: 'Outra operação' };
  h.c.overlayGlobalAtual = outro;
  h.c.sumulasCarga.token++;
  h.calls[1].failure(new Error('erro antigo'));
  assert.equal(h.c.overlayGlobalAtual, outro);
  assert.equal(h.removidos(), 1);
  assert.equal(h.nodes.estadoCargaSumulas.textContent, '');
});
