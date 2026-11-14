const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');

function fixture() {
  let resolve, options, calls = 0;
  const form = {};
  const context = vm.createContext({
    moduloAtual: 'atas',
    document: { getElementById: () => form },
    confirmarDialogo_: value => {
      options = value;
      calls++;
      return new Promise(r => { resolve = r; });
    }
  });
  const start = html.indexOf('    let atasDados = null;');
  const end = html.indexOf("    window.addEventListener('beforeunload'", start);
  assert(start >= 0 && end > start);
  vm.runInContext(html.slice(start, end), context);
  return {
    context, run: source => vm.runInContext(source, context),
    get options() { return options; }, get calls() { return calls; },
    answer: async value => { resolve(value); await Promise.resolve(); }
  };
}

test('documento limpo sai diretamente; operação ocupada não abre diálogo', () => {
  const f = fixture();
  assert.equal(f.run('podeSairDaAta()'), true);
  f.run('ataOcupada = true; ataAlterada = true;');
  assert.equal(f.run('podeSairDaAta()'), false);
  assert.equal(f.calls, 0);
});

test('cancelar preserva as alterações; cliques repetidos não duplicam o pop-up', async () => {
  const f = fixture();
  let navigated = 0;
  f.context.navigate = () => navigated++;
  f.run('ataAlterada = true;');
  assert.equal(f.run('podeSairDaAta(navigate)'), false);
  assert.equal(f.run('podeSairDaAta(navigate)'), false);
  assert.equal(f.calls, 1);
  assert.equal(f.options.confirmar, 'Descartar e sair');
  assert.equal(f.options.cancelar, 'Continuar editando');
  await f.answer(false);
  assert.equal(navigated, 0);
  assert.equal(f.run('ataAlterada'), true);
  assert.equal(f.run('ataConfirmacaoSaida'), false);
});

test('confirmar limpa o estado sujo e continua a ação solicitada uma vez', async () => {
  const f = fixture();
  let navigated = 0;
  f.context.navigate = () => navigated++;
  f.run('ataAlterada = true; podeSairDaAta(navigate);');
  await f.answer(true);
  assert.equal(navigated, 1);
  assert.equal(f.run('ataAlterada'), false);
});

test('resposta obsoleta não descarta outro documento ou navega durante salvamento', async () => {
  for (const change of ['ataEmEdicao = {};', 'ataOcupada = true;', "moduloAtual = 'inicio';"] ) {
    const f = fixture();
    let navigated = 0;
    f.context.navigate = () => navigated++;
    f.run('ataAlterada = true; podeSairDaAta(navigate);');
    f.run(change);
    await f.answer(true);
    assert.equal(navigated, 0);
    assert.equal(f.run('ataAlterada'), true);
  }
});

test('voltar, menu e editor retomam a navegação; beforeunload mantém aviso nativo', () => {
  assert(html.includes('podeSairDaAta(montarListaAtas)'));
  assert(html.includes('podeSairDaAta(function () { abrirModulo(id, busca, aprovacaoDescarte); })'));
  assert(html.includes('podeSairDaAta(function () { abrirEditorAta(id, visualizar); })'));
  const start = html.indexOf('    function podeSairDaAta(');
  const end = html.indexOf('    function carregarAtas()', start);
  assert.doesNotMatch(html.slice(start, end), /window\.confirm/);
  assert.match(html.slice(start, end), /beforeunload/);
  assert.match(html.slice(start, end), /evento\.preventDefault\(\)/);
});
