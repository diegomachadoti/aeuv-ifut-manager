const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');

function runFunction(source, startMarker, endMarker, context) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `function range not found: ${startMarker}`);
  const c = vm.createContext(context);
  vm.runInContext(html.slice(start, end), c);
  return c;
}

function googleRunner(onCall) {
  const request = {};
  const runner = {
    withSuccessHandler(fn) { request.success = fn; return this; },
    withFailureHandler(fn) { request.failure = fn; return this; },
    listarCampeonatos() { onCall(request); }
  };
  return { script: { get run() { return runner; } } };
}

test('missing table snapshot keeps requested championship selected and exposes recalculation', () => {
  let rendered = null;
  const message = { innerHTML: '' };
  const c = runFunction(html, '    function carregarTabelaSemCopia_(',
    '    function tabelaOcupada_(', {
      tabelaEstado: {
        requisicao: 4,
        campeonatoId: 'old',
        dados: { campeonatos: [{ id: 'old', nome: 'Anterior' }, { id: 'new', nome: 'Teste' }] },
        sujo: true,
        formulario: 'jogo',
        resultado: { id: 'result' }
      },
      moduloAtual: 'jogos-campeonato',
      tabelaModuloAtivo_: () => true,
      tabelaVoltarLista_: () => { rendered = c.tabelaEstado.dados; },
      document: { getElementById: id => id === 'tabelaMensagem' ? message : null },
      escapar: String,
      google: { script: { get run() { throw new Error('Should reuse known championship list'); } } }
    });

  c.carregarTabelaSemCopia_('new', Error('Tabela ainda não possui cópia'), 4, 'jogos-campeonato');
  assert.equal(c.tabelaEstado.campeonatoId, 'new');
  assert.equal(rendered.campeonatos[1].id, 'new');
  assert.equal(rendered.snapshotIndisponivel, true);
  assert.equal(rendered.snapshotStatus.pendente, true);
  assert.equal(c.tabelaEstado.sujo, false);
  assert.equal(c.tabelaEstado.formulario, '');
  assert.equal(c.tabelaEstado.resultado, null);
  assert.match(message.innerHTML, /Recalcular agora/);
});

test('first table load without a snapshot fetches the championship list for the selector', () => {
  let request, rendered = null;
  const c = runFunction(html, '    function carregarTabelaSemCopia_(',
    '    function tabelaOcupada_(', {
      tabelaEstado: { requisicao: 2, campeonatoId: '', dados: null, sujo: false },
      moduloAtual: 'jogos-campeonato',
      tabelaModuloAtivo_: () => true,
      tabelaVoltarLista_: () => { rendered = c.tabelaEstado.dados; },
      document: { getElementById: () => null },
      escapar: String,
      google: googleRunner(req => { request = req; })
    });

  c.carregarTabelaSemCopia_('new', Error('Tabela ainda não possui cópia'), 2, 'jogos-campeonato');
  request.success({ registros: [{ id: 'new', nome: 'Campeonato teste', temporada: '2026' }] });
  assert.equal(c.tabelaEstado.campeonatoId, 'new');
  assert.equal(rendered.campeonatos[0].id, 'new');
  assert.equal(rendered.snapshotIndisponivel, true);
});

test('missing participants snapshot loads championship choices and keeps requested one selected', () => {
  let rendered = null, request;
  const c = runFunction(html, '    function carregarParticipantesSemCopia_(',
    '    let participantesRecalculando_ =', {
      participantesRequisicao: 7,
      moduloAtual: 'times-campeonato',
      elencoAtual: null,
      campeonatoParticipantesAtual: 'old',
      timesCampeonato: { campeonatos: [], registros: [] },
      CONFIG: { usuario: { perfil: 'admin' } },
      google: googleRunner(req => { request = req; }),
      montarEquipesParticipantes: () => { rendered = c.timesCampeonato; }
    });

  c.carregarParticipantesSemCopia_('new', Error('Equipes Participantes ainda não possui cópia'), 7);
  request.success({ registros: [
    { id: 'old', nome: 'Anterior' },
    { id: 'new', nome: 'Teste', temporada: '2026' }
  ] });
  assert.equal(c.campeonatoParticipantesAtual, 'new');
  assert.equal(rendered.campeonatos[1].id, 'new');
  assert.equal(rendered.podeEditar, true);
  assert.match(rendered.snapshotIndisponivel, /não possui cópia/);
  assert.equal(rendered.snapshotStatus.pendente, true);
});
