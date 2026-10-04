const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
const artifacts = 'C:\\Users\\diego\\.copilot\\session-state\\dea07af7-e90a-4e1d-b83e-4e819fcec551\\files';
const copy = x => JSON.parse(JSON.stringify(x));
function scaffold(file, boundary) {
  const text = fs.readFileSync(path.join(artifacts, file), 'utf8');
  const outer = vm.createContext({ require, console, Buffer, Blob, atob, process, __dirname: artifacts });
  vm.runInContext(text.slice(0, text.indexOf(boundary)), outer);
  return outer;
}
async function main() {
  const back = scaffold('resultado-backend-tests.cjs', 'const invalidCases =');
  const { h, c, build, seedRoster, athletes } = vm.runInContext('({h,c,build,seedRoster,athletes})', back);
  const payload = build();
  payload.equipes[0].atletas[0].numeroJogo = 42;
  payload.equipes[0].atletas[0].participou = true;
  payload.equipes[0].atletas[0].gols = 3;
  payload.equipes[0].atletas[0].golsContra = 1;
  payload.equipes[0].comissao[0].participou = true;
  payload.equipes[0].comissao[0].amarelos = 2;
  c.salvarResultadoJogoCampeonato(payload);
  const original = copy(c.lerTabelaCampeonato_('cup'));
  const champs = copy(c.campeonatos_());
  champs.push({ ...copy(champs[0]), id: 'other', nome: 'Outra <Copa>' });
  champs.push({ ...copy(champs[0]), id: 'empty', nome: 'Sem jogos' });
  const table = copy(original);
  for (const [index, status] of ['agendado','adiado','cancelado'].entries()) {
    const game = { ...copy(original.jogos[0]), id: 'skip-' + status, status,
      rodada: index % 2 + 2, mandanteId: index === 2 ? 'b' : 'a', visitanteId: index === 2 ? 'a' : 'b',
      golsMandante: null, golsVisitante: null };
    delete game.resultado;
    table.jogos.push(game);
  }
  const legacy = { ...copy(original.jogos[0]), id: 'legacy', mandanteId: 'b', visitanteId: 'a' };
  delete legacy.resultado;
  table.jogos.push(legacy);
  const other = copy(original);
  other.campeonatoId = 'other'; other.jogos[0].id = 'other-game';
  other.jogos[0].data = '2026-10-05'; other.jogos[0].rodada = 2;
  h.lock(true);
  try {
    c.gravarCampeonatos_(champs);
    for (const [id, doc] of [['cup', table], ['other', other]]) {
      c.gravarListaCadastroDrive_(c.arquivoTabelaCampeonato_(id), c.chaveTabelaCampeonato_(id), [doc]);
    }
  } finally { h.lock(false); }
  let writes = h.writes();
  const list = copy(c.listarSumulasCampeonato());
  assert.equal(h.writes(), writes, 'list is strictly read only');
  assert.equal(list.campeonatos.length, 3, 'includes championships without games');
  assert.equal(list.jogos.length, 2, 'all detailed finalized games from both championships only');
  assert.deepEqual(list.jogos.map(j => j.campeonatoId), ['other','cup'], 'newest first');
  assert(!JSON.stringify(list).includes('PRIVATE'), 'no CPF in list');
  assert(list.jogos.every(j => !Object.hasOwn(j, 'resultado') && !Object.hasOwn(j, 'equipes')), 'compact list');
  for (const profile of ['associado','arbitro','anonymous']) {
    h.profile(profile);
    assert.throws(() => c.listarSumulasCampeonato(), /permissão/);
    assert.throws(() => c.consultarSumulaCampeonato({ campeonatoId:'cup', id:original.jogos[0].id }), /permissão/);
  }
  h.profile('diretoria');
  assert.equal(c.listarSumulasCampeonato().jogos.length, 2);
  h.profile('admin');
  const newRoster = copy(athletes);
  newRoster[0].nome = 'Nome atual alterado';
  newRoster.push({ id:'new-player', nome:'Novo inscrito', numero:55, timeVinculado:'Águia' });
  seedRoster('atletas', newRoster);
  writes = h.writes();
  const consult = copy(c.consultarSumulaCampeonato({ campeonatoId:'cup', id:original.jogos[0].id }));
  assert.equal(h.writes(), writes, 'consultation never migrates roster');
  assert.equal(consult.podeEditar, false);
  assert.equal(consult.equipes[0].atletas[0].nome, 'Atleta A', 'saved identity not current registry');
  assert(!consult.equipes[0].atletas.some(p => p.id === 'new-player'), 'no current roster additions');
  assert.equal(consult.equipes[0].atletas[0].numeroJogo, 42);
  assert.equal(consult.equipes[0].atletas[0].golsContra, 1);
  assert.equal(consult.equipes[0].comissao[0].participou, true);
  assert.equal(consult.equipes[0].comissao[0].amarelos, 2);
  assert.throws(() => c.consultarSumulaCampeonato({ campeonatoId:'cup', id:'legacy' }), /finalizada/);
  const filename = c.arquivoTabelaCampeonato_('other');
  const stored = h.files.get(filename), previous = stored.text;
  stored.text = '{';
  assert.throws(() => c.listarSumulasCampeonato(), /inválid|JSON/);
  stored.text = previous;
  const broken = copy(other);
  broken.jogos[0].resultado.equipes[0].atletas[0].amarelos = 99;
  stored.text = JSON.stringify([broken]);
  assert.throws(() => c.listarSumulasCampeonato(), /amarelos|cartões|inteiro/i);
  stored.text = previous;

  const front = scaffold('resultado-frontend-tests.cjs', 'const fixture =');
  const { context, elements, pending, evaluate, Element } = vm.runInContext('({context,elements,pending,evaluate,Element})', front);
  context.list = list; context.consult = consult;
  context.table = copy(c.listarTabelaCampeonato('cup'));
  context.edit = copy(c.listarResultadoJogoCampeonato({ campeonatoId:'cup', id:original.jogos[0].id }));
  const realAll = Element.prototype.querySelectorAll;
  Element.prototype.querySelectorAll = function(selector) {
    if (selector === '[data-sumula-id]') return (this.children || []).filter(e => e.dataset.sumulaId !== undefined);
    return realAll.call(this, selector);
  };
  evaluate(`moduloAtual = 'sumula-campeonato'; sumulasEstado.dados = list; montarSumulasCampeonato_();`);
  const area = elements.get('areaTabelaCampeonato');
  assert(area.innerHTML.includes('2 súmula(s)'));
  assert(area.innerHTML.includes('Outra &lt;Copa&gt;'));
  assert(!area.innerHTML.includes('Súmula PDF'));
  assert(!area.innerHTML.includes('PRIVATE'));
  function change(field, value) {
    const input = elements.get('sumulas' + field);
    input.value = value; input.onchange({ target:input });
  }
  change('Equipe','b');
  assert.equal(evaluate('sumulasJogosFiltrados_(false).length'), 2, 'away team included');
  change('Campeonato','cup');
  assert.equal(evaluate('sumulasJogosFiltrados_(false).length'), 1);
  change('Data','2026-10-05');
  assert(area.innerHTML.includes('Nenhuma súmula finalizada'));
  change('Campeonato','other');
  change('Rodada','2');
  assert.equal(evaluate('sumulasJogosFiltrados_(false).length'), 1, 'combined filters');
  change('Data','2026-10-04');
  assert.equal(evaluate('sumulasEstado.rodada'), '', 'invalid dependent round is reset');
  elements.get('sumulasLimpar').onclick();
  assert.equal(evaluate('sumulasJogosFiltrados_(false).length'), 2);
  change('Campeonato','empty');
  assert.equal(evaluate('sumulasJogosFiltrados_(false).length'), 0, 'empty competition remains selected');
  assert.equal(evaluate('sumulasEstado.campeonato'), 'empty');
  elements.get('sumulasLimpar').onclick();
  change('Campeonato','cup'); change('Data','2026-10-04'); change('Rodada','1'); change('Equipe','a');
  const expectedFilters = evaluate('JSON.stringify([sumulasEstado.campeonato,sumulasEstado.rodada,sumulasEstado.equipe,sumulasEstado.data])');
  function action(consulta) {
    return area.children.find(e => e.dataset.sumulaConsulta === consulta);
  }
  action('sim').onclick();
  let request = pending.shift();
  assert.equal(request.name, 'consultarSumulaCampeonato');
  assert.equal(evaluate('tabelaEstado.ocupado'), true);
  request.success(consult);
  assert.equal(evaluate('tabelaEstado.resultado.podeEditar'), false);
  assert(!elements.get('tabelaResultadoArea').innerHTML.includes('type="submit"'));
  assert(elements.get('tabelaResultadoArea').innerHTML.includes('Consultar súmula'));
  assert.equal(elements.get('tr-0-atletas-0-numeroJogo').value, '42');
  assert.equal(elements.get('tr-0-atletas-0-numeroJogo').disabled, true);
  elements.get('trRecarregar').onclick();
  request = pending.shift(); assert.equal(request.name,'consultarSumulaCampeonato'); request.success(consult);
  elements.get('trVoltar').onclick();
  assert.equal(evaluate('JSON.stringify([sumulasEstado.campeonato,sumulasEstado.rodada,sumulasEstado.equipe,sumulasEstado.data])'), expectedFilters);

  action('nao').onclick();
  request = pending.shift(); assert.equal(request.name, 'listarTabelaCampeonato');
  request.success(context.table);
  request = pending.shift(); assert.equal(request.name, 'listarResultadoJogoCampeonato');
  request.success(context.edit);
  assert.equal(evaluate('tabelaEstado.resultado.podeEditar'), true);
  assert(elements.get('tabelaResultadoArea').innerHTML.includes('type="submit"'));
  evaluate('tabelaEstado.sujo = true');
  vm.runInContext('confirmResult = false', front);
  elements.get('trVoltar').onclick(); await Promise.resolve(); await Promise.resolve();
  assert.equal(evaluate('tabelaEstado.sujo'), true, 'cancel discard stays in editor');
  vm.runInContext('confirmResult = true', front);
  elements.get('trVoltar').onclick(); await Promise.resolve(); await Promise.resolve();
  assert.equal(evaluate('tabelaEstado.sujo'), false);
  assert.equal(evaluate('JSON.stringify([sumulasEstado.campeonato,sumulasEstado.rodada,sumulasEstado.equipe,sumulasEstado.data])'), expectedFilters);
  action('nao').onclick(); pending.shift().success(context.table); pending.shift().success(context.edit);
  const form = elements.get('tabelaResultadoFormulario');
  form.onsubmit({ preventDefault() {} });
  request = pending.shift(); assert.equal(request.name,'salvarResultadoJogoCampeonato');
  assert.equal(request.payload.campeonatoId,'cup');
  assert.equal(request.payload.revisao, context.edit.revisao);
  const outstanding = request;
  elements.get('trVoltar').onclick();
  assert.equal(evaluate('tabelaEstado.ocupado'), true, 'busy return blocked');
  request.failure(new Error('conflito de revisão'));
  assert.equal(evaluate('tabelaEstado.resultado.podeEditar'), true, 'failed save keeps draft');
  assert(elements.get('tabelaMensagem').innerHTML.includes('conflito de revisão'));
  form.onsubmit({ preventDefault() {} });
  request = pending.shift();
  request.payload.golsMandante = 5;
  request.success(copy(c.salvarResultadoJogoCampeonato(request.payload)));
  request = pending.shift(); assert.equal(request.name,'listarSumulasCampeonato');
  const refreshed = copy(c.listarSumulasCampeonato());
  request.success(refreshed);
  assert.equal(refreshed.jogos.find(j => j.campeonatoId === 'cup').golsMandante,5,'actual summary editor payload persists then refreshes');
  assert.equal(evaluate('JSON.stringify([sumulasEstado.campeonato,sumulasEstado.rodada,sumulasEstado.equipe,sumulasEstado.data])'), expectedFilters);
  assert.equal(evaluate('tabelaEstado.ocupado'), false);
  outstanding.success(context.table);
  assert.equal(pending.length, 0, 'stale save ignored');
  elements.get('sumulasAtualizar').onclick();
  request = pending.shift();
  evaluate('++tabelaEstado.requisicao');
  request.success({ jogos:[], equipes:[], campeonatos:[] });
  assert.equal(evaluate('sumulasEstado.dados.jogos.length'),2, 'stale refresh ignored');
  evaluate(`tabelaEstado.ocupado=false; carregarSumulasCampeonato_();`);
  request = pending.shift();
  evaluate(`moduloAtual='jogos-campeonato'`);
  request.failure(new Error('stale'));
  assert(!elements.get('tabelaMensagem').innerHTML.includes('stale'), 'cross-module callback ignored');
  evaluate(`tabelaEstado.ocupado=false; moduloAtual='sumula-campeonato'; sumulasEstado.tabelaAnterior={campeonatoId:'original',dados:{marker:1},fase:'fase',grupo:'grupo',rodada:'3'}; sumulasRestaurarTabela_();`);
  assert.equal(evaluate('tabelaEstado.campeonatoId'),'original');
  assert.equal(evaluate('tabelaEstado.dados.marker'),1);
  assert.equal(evaluate('tabelaEstado.rodada'),'3', 'normal table selection preserved');
  const html = fs.readFileSync('apps-scripts\\sistema-interno\\Index.html','utf8');
  vm.runInContext(html.slice(html.indexOf('    function abrirModulo('),html.indexOf('    function renderizarModulo(')),context);
  context.MODULOS.push({id:'sumula-campeonato'});
  evaluate(`moduloAtual='sumula-campeonato'; tabelaEstado.ocupado=true; window.location.hash='#campeonatos'; abrirModulo('campeonatos');`);
  assert.equal(context.moduloAtual,'sumula-campeonato','global navigation busy guard covers summary');
  assert.equal(context.window.location.hash,'sumula-campeonato');
  evaluate(`tabelaEstado.ocupado=false; tabelaEstado.sujo=true;`);
  vm.runInContext('confirmResult=false',front);
  evaluate(`abrirModulo('campeonatos')`);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(context.moduloAtual,'sumula-campeonato','global navigation canceled discard stays');
  vm.runInContext('confirmResult=true',front);
  evaluate(`abrirModulo('campeonatos')`);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(context.moduloAtual,'campeonatos','confirmed global navigation exits');
  console.log('PASS: finalized all-championship listing, statuses/legacy, permissions, corruption, compact payload, immutable saved consultation; renderer filters/clear/empty/escaping; consult/edit/save/back/discard/busy/stale context and original table isolation.');
}
main().catch(error => { console.error(error); process.exitCode=1; });
