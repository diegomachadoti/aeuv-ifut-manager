/* Session-only integration: reuse service/DOM scaffolds, never their test bodies. */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
const artifacts = __dirname;
const backendSource = fs.readFileSync('apps-scripts\\sistema-interno\\WebApp.gs', 'utf8');
const frontendSource = fs.readFileSync('apps-scripts\\sistema-interno\\Index.html', 'utf8');
const requiredEndpoints = ['listarResultadoJogoCampeonato', 'salvarResultadoJogoCampeonato'];
const missing = requiredEndpoints.filter(name => !new RegExp('function\\s+' + name + '\\s*\\(').test(backendSource));
if (missing.length || !frontendSource.includes('listarResultadoJogoCampeonato')) {
  console.log('PENDING: implementation hooks missing: ' + (missing.join(', ') || 'frontend result reader'));
  process.exitCode = 2;
} else {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}

function scaffold(filename, boundary) {
  const text = fs.readFileSync(path.join(artifacts, filename), 'utf8');
  assert(text.includes(boundary), 'existing scaffold boundary must remain present');
  const outer = vm.createContext({ require, console, Buffer, Blob, atob, process, __dirname: artifacts });
  vm.runInContext(text.slice(0, text.indexOf(boundary)), outer, { filename });
  return outer;
}

function backendHarness() {
  const outer = scaffold('tabela-backend-tests.cjs', 'const structure =');
  const harness = vm.runInContext('({ c, files, props, teams, links, setLocked: value => locked = value, writes: () => writes })', outer);
  const c = harness.c;
  c.atletasCampeonato_ = () => harness.teams.slice(0, 2).flatMap((team, index) => [
    { id: 'athlete-' + team.id, nome: 'Atleta ' + team.nome, numero: index + 7, ativo: true, timeVinculado: team.nome },
    { id: 'reserve-' + team.id, nome: 'Reserva ' + team.nome, numero: index + 17, ativo: true, timeVinculado: team.nome }
  ]);
  harness.setLocked(true);
  try {
    c.gravarCampeonatos_([{
      id: 'cup', nome: 'Copa contrato', temporada: '2026', modalidade: 'Futsal', status: 'ativo',
      visibilidade: 'Interno', revisao: 'champ-contract',
      estrutura: {
        faseNome: 'Primeira fase', formato: 'Grupos + mata-mata', grupos: 2, vagasPorGrupo: 4,
        rodadas: 3, idaVolta: false, fasesEliminatorias: ['final']
      }
    }]);
    c.gravarListaCadastroDrive_(c.arquivoCadastroPessoasCampeonato_('cup', 'Comissao Tecnica'),
      c.chaveComissaoTecnicaCampeonato_('cup'),
      harness.teams.slice(0, 2).map(team => ({
        id: 'coach-' + team.id, nome: 'Técnico ' + team.nome, cargo: 'Técnico', ativo: true, timeVinculado: team.nome
      })));
  } finally { harness.setLocked(false); }
  let table = c.listarTabelaCampeonato('cup');
  const mutate = (name, payload) => {
    table = c[name]({ campeonatoId: 'cup', revisao: table.revisao, ...payload });
    return table;
  };
  mutate('salvarCampoCampeonato', { nome: 'Arena contrato', endereco: 'Rua 1', ativo: true });
  mutate('salvarGruposTabelaCampeonato', {
    grupos: [{ id: 'grupo-1', equipeIds: ['a', 'b'] }, { id: 'grupo-2', equipeIds: ['c', 'd'] }]
  });
  mutate('salvarJogoCampeonato', {
    id: '', faseId: 'fase-classificacao', grupoId: 'grupo-1', rodada: 1,
    mandanteId: 'a', visitanteId: 'b', campoId: table.campos[0].id,
    data: '2026-10-10', hora: '10:30', status: 'agendado', golsMandante: null, golsVisitante: null
  });
  return { ...harness, c, table };
}

function frontendHarness() {
  const outer = scaffold('resultado-frontend-tests.cjs', 'const fixture =');
  const harness = vm.runInContext('({ context, elements, pending, evaluate, Element })', outer);
  const { elements, Element } = harness;
  const originalAll = Element.prototype.querySelectorAll;
  function matches(element, selector) {
    if (selector.startsWith('#')) return element.id === selector.slice(1);
    const attribute = selector.match(/^\[([-\w]+)(?:="([^"]*)")?\](?::checked)?$/);
    if (attribute) {
      const name = attribute[1], value = name.startsWith('data-')
        ? element.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())]
        : element[name];
      return value !== undefined && (!attribute[2] || String(value) === attribute[2])
        && (!selector.endsWith(':checked') || element.checked);
    }
    return element.tagName === selector;
  }
  Element.prototype.querySelectorAll = function (selector) {
    const simple = selector.split(',').map(part => part.trim());
    const found = (this.children || []).filter(element => simple.some(part => matches(element, part)));
    return found.length ? found : originalAll.call(this, selector);
  };
  Element.prototype.querySelector = function (selector) {
    return selector.startsWith('#') ? elements.get(selector.slice(1)) || null : this.querySelectorAll(selector)[0] || null;
  };
  Element.prototype.dispatchEvent = function (event) {
    const normalized = typeof event === 'string' ? { type: event } : event;
    normalized.target = this; normalized.currentTarget = this;
    normalized.preventDefault = normalized.preventDefault || (() => {});
    if (this.listeners[normalized.type]) this.listeners[normalized.type](normalized);
    if (this['on' + normalized.type]) this['on' + normalized.type](normalized);
  };
  Element.prototype.click = function () { this.dispatchEvent('click'); };
  harness.context.document.querySelectorAll = selector =>
    [...elements.values()].filter(element => selector.split(',').some(part => matches(element, part.trim())));
  return harness;
}

async function main() {
  const backend = backendHarness();
  const frontend = frontendHarness();
  await runContract(backend, frontend);
  console.log('PASS: real read → result tabs/events → intercepted real save → success; revisions, manual scores, both rosters, standings and scheduling preserved.');
}

async function runContract(backend, frontend) {
  const { c } = backend;
  const { context: ui, elements, pending, evaluate } = frontend;
  const gameId = backend.table.jogos[0].id;
  const request = name => {
    assert.equal(pending.length, 1, 'exactly one RPC pending');
    const call = pending.shift();
    assert.equal(call.name, name);
    return call;
  };
  ui.carregarTabelaCampeonato_('cup');
  const initial = request('listarTabelaCampeonato');
  initial.success(c.listarTabelaCampeonato(initial.payload));
  ui.abrirTabelaResultado_(gameId);
  const readCall = request('listarResultadoJogoCampeonato');
  assert.equal(readCall.payload.campeonatoId, 'cup');
  assert.equal(readCall.payload.id, gameId);
  const read = c.listarResultadoJogoCampeonato(readCall.payload);
  assert.equal(read.equipes.length, 2);
  assert.equal(read.jogo.id, gameId);
  assert.equal(typeof read.revisao, 'string');
  assert(read.revisao.length > 0, 'opaque revision from actual backend read');
  assert(read.revisaoElencos, 'roster revision from actual backend read');
  for (const team of read.equipes) {
    assert(team.atletas.length >= 2, 'actual active roster returned');
    assert(team.comissao.length >= 1, 'actual active commission returned');
    for (const person of [...team.atletas, ...team.comissao]) assert(person.id && person.nome);
  }
  readCall.success(read);
  assert.equal(pending.length, 0);
  await editResultThroughEvents(frontend, read);
  // The editor must use its own read context, not a mutable cached table revision.
  evaluate("tabelaEstado.dados.revisao = 'stale-cached-table-context'");
  const expectedPayload = JSON.parse(JSON.stringify(ui.tabelaResultadoPayload_()));
  const form = elements.get('tabelaResultadoFormulario');
  form.onsubmit({ preventDefault() {} });
  assert.equal(elements.get('tabelaFormErro').innerHTML, '', 'no frontend validation errors');
  const saveCall = request('salvarResultadoJogoCampeonato');
  const payload = JSON.parse(JSON.stringify(saveCall.payload));
  assert.deepEqual(payload, expectedPayload, 'submit forwards the real result payload builder');
  assert.equal(payload.revisao, read.revisao, 'opaque read revision forwarded unchanged');
  assert.deepEqual(payload.revisaoElencos, JSON.parse(JSON.stringify(read.revisaoElencos)));
  assert.equal(payload.golsMandante, 4);
  assert.equal(payload.golsVisitante, 3);
  assert.equal(payload.resultado.wo, true);
  assert.equal(payload.resultado.woEquipeId, read.equipes[1].id);
  assert.equal(payload.resultado.prorrogacao, true);
  assert.equal(payload.resultado.penaltis, true);
  assert.equal(payload.resultado.golsPenaltisMandante, 5);
  assert.equal(payload.resultado.golsPenaltisVisitante, 4);
  assert.equal(payload.resultado.observacoes, 'Contrato: placar manual 4:3 <preservado>');
  assert.equal(payload.equipes.length, 2, 'both edited tabs submitted');
  payload.equipes.forEach((team, index) => {
    const athlete = team.atletas.find(person => person.id === read.equipes[index].atletas[0].id);
    const coach = team.comissao.find(person => person.id === read.equipes[index].comissao[0].id);
    assert(athlete && coach);
    assert.equal(athlete.participou, true);
    assert.equal(athlete.gols, 1);
    assert.equal(athlete.golsContra, 1);
    assert.equal(Object.hasOwn(athlete, 'assistencias'), false);
    assert.equal(athlete.amarelos, 1);
    assert.equal(athlete.vermelho, index === 1);
    assert.equal(coach.amarelos, 1);
    assert.equal(coach.vermelho, index === 1);
  });
  const scheduleBefore = scheduling(read.jogo);
  const saved = c.salvarResultadoJogoCampeonato(payload);
  assert(Array.isArray(saved.jogos) && saved.classificacao, 'save returns full table contract');
  assert.deepEqual(scheduling(saved.jogos.find(game => game.id === gameId)), scheduleBefore);
  const home = saved.classificacao.geral.find(row => row.equipeId === read.equipes[0].id);
  const away = saved.classificacao.geral.find(row => row.equipeId === read.equipes[1].id);
  assert.equal(home.golsPro, 4, 'standings use principal manual score, not athlete or penalty totals');
  assert.equal(home.golsContra, 3);
  assert.equal(away.golsPro, 3);
  assert.equal(away.golsContra, 4);
  assert.equal(home.pontos, 3);
  assert.equal(home.jogos, 1);
  assert.equal(away.pontos, 0);
  assert.equal(saved.jogos.find(game => game.id === gameId).status, 'encerrado');
  saveCall.success(saved);
  assert.equal(evaluate('tabelaEstado.sujo'), false);
  assert.equal(evaluate('tabelaEstado.ocupado'), false);
  assert.equal(evaluate('tabelaEstado.dados.revisao'), saved.revisao);
  assert.equal(evaluate('tabelaEstado.resultado'), null, 'successful result returns to table screen');
  assert(elements.get('tabelaPainel'), 'frontend renders table after real save success');
  const persisted = c.listarResultadoJogoCampeonato({ campeonatoId: 'cup', id: gameId });
  assert.deepEqual(JSON.parse(JSON.stringify(persisted.resultado)), payload.resultado);
  assertPersistedPeople(persisted, payload);
  ui.abrirTabelaJogo_(gameId);
  elements.get('tjData').value = '2026-10-11';
  elements.get('tabelaFormulario').oninput();
  elements.get('tabelaFormulario').onsubmit({ preventDefault() {} });
  const scheduleCall = request('salvarJogoCampeonato');
  for (const field of ['golsMandante', 'golsVisitante', 'resultado', 'equipes']) {
    assert.equal(scheduleCall.payload[field], undefined, 'schedule editor omits result field ' + field);
  }
  const rescheduled = c.salvarJogoCampeonato(JSON.parse(JSON.stringify(scheduleCall.payload)));
  scheduleCall.success(rescheduled);
  const afterSchedule = c.listarResultadoJogoCampeonato({ campeonatoId: 'cup', id: gameId });
  assert.equal(afterSchedule.jogo.data, '2026-10-11');
  assert.equal(afterSchedule.jogo.status, 'encerrado');
  assert.equal(afterSchedule.jogo.golsMandante, 4);
  assert.equal(afterSchedule.jogo.golsVisitante, 3);
  assertPersistedPeople(afterSchedule, payload);
  assert.deepEqual(JSON.parse(JSON.stringify(afterSchedule.resultado)), JSON.parse(JSON.stringify(persisted.resultado)),
    'schedule-only edit preserves detailed flags and observations');
}

function scheduling(game) {
  return Object.fromEntries(['faseId', 'grupoId', 'rodada', 'mandanteId', 'visitanteId', 'campoId', 'data', 'hora']
    .map(key => [key, game[key]]));
}

function assertPersistedPeople(detail, payload) {
  for (const submittedTeam of payload.equipes) {
    const team = detail.equipes.find(item => item.id === submittedTeam.id);
    assert(team, 'saved participant team retained');
    for (const type of ['atletas', 'comissao']) {
      for (const submitted of submittedTeam[type]) {
        const actual = team[type].find(item => item.id === submitted.id);
        assert(actual, 'saved person retained on reread');
        for (const field of type === 'atletas'
          ? ['participou', 'gols', 'golsContra', 'amarelos', 'vermelho'] : ['amarelos', 'vermelho']) {
          assert.equal(actual[field], submitted[field], type + ':' + submitted.id + ':' + field);
        }
      }
    }
  }
}

async function editResultThroughEvents(frontend, detail) {
  const { elements, evaluate } = frontend;
  const form = elements.get('tabelaResultadoFormulario');
  assert(form, 'actual result editor mounted');
  function input(id, value) {
    const element = elements.get(id);
    assert(element, 'rendered result control ' + id);
    if (element.type === 'checkbox') element.checked = value;
    else element.value = String(value);
    form.oninput({ target: element });
  }
  function inputAndChange(id, value) {
    input(id, value);
    form.onchange({ target: elements.get(id) });
  }
  function tab(index) {
    const button = form.querySelectorAll('[data-tr-aba]').find(element => element.dataset.trAba === String(index));
    assert(button, 'rendered team tab ' + index);
    button.click();
    assert.equal(elements.get('trEquipe' + index).hidden, false);
    assert.equal(elements.get('trEquipe' + (1 - index)).hidden, true);
  }
  input('trGolsMandante', 2);
  input('trGolsVisitante', 1);
  input('trwo', true);
  assert.equal(elements.get('trWoEquipe').disabled, false);
  input('trWoEquipe', detail.equipes[1].id);
  input('trprorrogacao', true);
  input('trpenaltis', true);
  assert.equal(elements.get('trPenGolsMandante').disabled, false);
  input('trPenGolsMandante', 5);
  input('trPenGolsVisitante', 4);
  input('trObservacoes', 'Contrato: placar manual 4:3 <preservado>');
  for (let index = 0; index < 2; index++) {
    tab(index);
    const athlete = 'tr-' + index + '-atletas-0-';
    input(athlete + 'participou', true);
    inputAndChange(athlete + 'gols', 1);
    inputAndChange(athlete + 'golsContra', 1);
    input(athlete + 'amarelos', 1);
    input(athlete + 'vermelho', index === 1);
    input('tr-' + index + '-comissao-0-amarelos', 1);
    input('tr-' + index + '-comissao-0-vermelho', index === 1);
  }
  tab(0);
  tab(1);
  tab(0);
  for (let index = 0; index < 2; index++) {
    assert.equal(elements.get('tr-' + index + '-atletas-0-gols').value, '1');
    assert.equal(elements.get('tr-' + index + '-comissao-0-amarelos').value, '1');
    assert.equal(elements.get('tr-' + index + '-comissao-0-vermelho').checked, index === 1);
  }
  assert.equal(evaluate('tabelaEstado.sujo'), true);
  assert.equal(evaluate('tabelaEstado.resultado.jogo.golsMandante'), 4);
  assert.equal(evaluate('tabelaEstado.resultado.jogo.golsVisitante'), 3);
  assert.match(elements.get('trResumo').innerHTML, /diferem do placar \(4\)/);
  assert.match(elements.get('trResumo').innerHTML, /diferem do placar \(3\)/);
}
