const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { harness, person } = require('./save-fixture.cjs');
const backend = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));

function fixture(active = false) {
  const h = harness(active ? backend.replace('const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = false;',
    'const ELENCOS_PARTICIONADOS_CUTOVER_ATIVO = true;') : undefined);
  let now = Date.parse('2026-10-06T19:00:00Z'), sequence = 0;
  const snapshots = new Map(), triggers = [];
  Object.assign(h.state, { email: 'admin@example.invalid', effective: 'admin@example.invalid', builds: 0 });
  h.c.console = { log: value => {
    try { h.logs.push(JSON.parse(value)); } catch { h.logs.push(value); }
  } };
  h.c.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  const identify = h.c.identificarUsuario_;
  h.c.identificarUsuario_ = () => ({ ...identify(), email: h.state.email });
  h.c.Session = { getEffectiveUser: () => ({ getEmail: () => h.state.effective }) };
  const root = h.c.pastaRaizProjeto_();
  h.c.pastaRaizProjeto_ = () => ({
    ...root,
    createFile(blob) {
      if (!blob.name.startsWith('AEUV - Copia ')) return root.createFile(blob);
      assert(!h.locked(), 'Drive publication outside builder lock');
      if (h.state.failCreate) throw h.state.failCreate;
      const id = 'snapshot-' + ++sequence;
      const data = { id, text: h.state.corrupt ? '{bad' : blob.text, trashed: false, parent: h.rootId() };
      const file = {
        getId: () => id, isTrashed: () => data.trashed,
        getParents: () => {
          let read = false;
          return { hasNext: () => !read, next: () => { read = true; return { getId: () => data.parent }; } };
        },
        getBlob: () => ({ getDataAsString: () => {
          if (h.state.failRead) throw h.state.failRead;
          return data.text;
        } }),
        setTrashed: value => { assert(h.locked()); data.trashed = value; },
        setContent: () => { throw Error('Published snapshots are immutable'); }
      };
      data.file = file;
      snapshots.set(id, data);
      if (h.state.onCreate) h.state.onCreate();
      return file;
    }
  });
  const getFile = h.c.DriveApp.getFileById;
  h.c.DriveApp.getFileById = id => {
    if (snapshots.has(id)) {
      if (h.state.onReadSnapshot) h.state.onReadSnapshot();
      return snapshots.get(id).file;
    }
    return getFile(id);
  };
  const properties = h.c.PropertiesService.getScriptProperties();
  h.c.PropertiesService.getScriptProperties = () => ({
    ...properties,
    setProperty(key, value) {
      if (h.state.failPublish && key.includes('_campeonato_')) {
        const after = JSON.parse(value), before = JSON.parse(h.properties.get(key) || '{}');
        if (after.currentId !== before.currentId) throw h.state.failPublish;
      }
      return properties.setProperty(key, value);
    }
  });
  const trigger = (owner, handler, event = 'CLOCK') => {
    const t = { id: 'trigger-' + ++sequence, owner, handler, event, deleted: false };
    Object.assign(t, { getUniqueId: () => t.id, getHandlerFunction: () => handler, getEventType: () => event });
    triggers.push(t);
    return t;
  };
  h.c.ScriptApp = {
    getService: () => ({ getUrl: () => 'fixture' }),
    EventType: { CLOCK: 'CLOCK' },
    getProjectTriggers: () => triggers.filter(t => !t.deleted && t.owner === h.state.effective),
    deleteTrigger: t => { assert.equal(t.owner, h.state.effective); t.deleted = true; },
    newTrigger: handler => ({
      timeBased() { return this; },
      everyMinutes(minutes) {
        assert.equal(minutes, handler === 'atualizarTabelaAgendada' ? 5 : 15);
        return this;
      },
      create() { return trigger(h.state.effective, handler); }
    })
  };
  h.c.estruturaCampeonato_ = () => ({ formato: 'Liga', faseNome: 'Classificação', rodadas: 3 });
  h.c.lerCamposTabela_ = () => ({ revisao: 'campos-1', campos: [{ id: 'campo', nome: 'Campo', endereco: '', ativo: true }] });
  h.c.lerTabelaCampeonato_ = id => {
    const name = h.c.arquivoTabelaCampeonato_(id);
    return h.files.has(name) ? JSON.parse(h.files.get(name))[0] : {
      schema: 'aeuv.tabela', versao: 1, revisao: 'inicial', campeonatoId: id,
      jogos: [], grupos: [], criterios: clone(h.c.criteriosPadraoTabela_()), desempatesOrganizacao: []
    };
  };
  for (const method of ['carregarTabelaCampeonatoAtual', 'carregarEquipesParticipantesAtual']) {
    const build = h.c[method];
    h.c[method] = id => {
      assert(!h.locked(), 'Lease must not hold the builder lock');
      h.state.builds++;
      if (h.state.onBuild) h.state.onBuild(id);
      if (h.state.failBuild) throw h.state.failBuild;
      return build(id);
    };
  }
  const state = (tipo, id = 'c1') => JSON.parse(h.properties.get(h.c.chaveSnapshotEsportivo_(tipo, id)) || '{}');
  const schedule = tipo => JSON.parse(h.properties.get(h.c.chaveMetaSnapshotEsportivo_(tipo, 'agenda')) || '{}');
  return { ...h, snapshots, triggers, trigger, snapshotState: state, schedule, advance: ms => { now += ms; } };
}

test('active-gate sporting workers rebuild only from partitions, keeping games and earlier copies intact', () => {
  const h = fixture(true);
  h.seed('c1', 'atletas', [person('atletas', { id: 'legacy-ignored' })]);
  h.seed('c1', 'comissao', [person('comissao', { id: 'legacy-staff-ignored' })]);
  h.c.recalcularEquipesParticipantes('c1');
  h.c.recalcularTabelaCampeonato('c1');
  const old = h.snapshotState('participantes').currentId, original = h.snapshots.get(old).text;
  assert.equal(h.c.listarEquipesParticipantes('c1').registros[0].timesDetalhados[0].totalAtletas, 0);
  h.c.salvarCadastroElenco(h.payload('atletas'));
  h.c.salvarCadastroElenco(h.payload('comissao'));
  assert.equal(h.c.listarEquipesParticipantes('c1').snapshotStatus.pendente, true);
  h.c.configurarAgendamentoParticipantes();
  h.c.configurarAgendamentoTabela();
  h.c.atualizarParticipantesAgendado({ triggerUid: h.schedule('participantes').triggerId });
  h.c.atualizarTabelaAgendada({ triggerUid: h.schedule('tabela').triggerId });
  const current = h.c.listarEquipesParticipantes('c1');
  assert.equal(current.registros[0].timesDetalhados[0].totalAtletas, 1);
  assert.equal(current.registros[0].timesDetalhados[0].totalComissao, 1);
  assert.equal(current.snapshotStatus.pendente, false);
  assert.equal(h.snapshots.get(old).text, original);
  assert.equal(h.snapshots.get(old).trashed, false);
  assert.equal(h.roster('c1', 'atletas')[0].id, 'legacy-ignored');
});

test('contratos completos por campeonato: builders existentes, cópia imutável e Atualizar sem recálculo', () => {
  const h = fixture();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.seed('c1', 'comissao', [person('comissao')]);
  for (const [tipo, list, recalc, live] of [
    ['tabela', 'listarTabelaCampeonato', 'recalcularTabelaCampeonato', 'carregarTabelaCampeonatoAtual'],
    ['participantes', 'listarEquipesParticipantes', 'recalcularEquipesParticipantes', 'carregarEquipesParticipantesAtual']
  ]) {
    assert.throws(() => h.c[list]('c1'), /ainda não possui cópia/);
    const expected = clone(h.c[live]('c1'));
    delete expected.contextoAtual;
    delete expected.consultadoEm;
    h.c[recalc]('c1');
    const builds = h.state.builds;
    const actual = clone(h.c[list]('c1'));
    delete actual.snapshotStatus;
    assert.deepEqual(actual, expected);
    assert.equal(h.state.builds, builds);
    assert.throws(() => h.c[list]('c2'), /ainda não possui cópia/);
    h.c[recalc]('c2');
    assert.notEqual(h.snapshotState(tipo, 'c1').currentId, h.snapshotState(tipo, 'c2').currentId);
    const stored = JSON.parse(h.snapshots.get(h.snapshotState(tipo).currentId).text);
    assert(!('podeEditar' in stored.dados));
    assert(!('equipesGlobais' in stored.dados));
    assert.equal(h.c[list]('c1').snapshotStatus.generatedAt, '2026-10-06T19:00:00.000Z');
    assert(!h.locked());
  }
  h.state.failBuild = Error('No live roster/table on list');
  h.c.listarTabelaCampeonato('c1');
  assert.equal(h.c.listarEquipesParticipantes('c1').registros[0].timesDetalhados[0].totalAtletas, 1);
});

test('associado: autorização/vínculos/identidade/bloqueios atuais; nunca dados nem autorização de outra equipe', () => {
  const h = fixture();
  h.c.recalcularEquipesParticipantes('c1');
  h.state.perfil = 'associado';
  let response = clone(h.c.listarEquipesParticipantes('c1'));
  assert.equal(response.podeEditar, false);
  assert.deepEqual(response.equipesGlobais, []);
  assert.equal(response.registros[0].timesDetalhados.length, 1);
  assert.equal(response.registros[0].timesDetalhados[0].id, 'e1');
  assert.throws(() => h.c.recalcularEquipesParticipantes('c1'), /permissão/);
  assert.throws(() => h.c.carregarEquipesParticipantesAtual('c1'), /permissão/);
  assert.throws(() => h.c.listarTabelaCampeonato('c1'), /permissão/);
  h.state.bloqueado = true;
  assert(h.c.listarEquipesParticipantes('c1').registros[0].timesDetalhados[0].bloqueado);
  h.state.equipeUsuario = 'Equipe B';
  assert.equal(h.c.listarEquipesParticipantes('c1').registros[0].timesDetalhados[0].id, 'e2');
  h.state.equipes[1].id = 'identidade-nova';
  assert.equal(h.c.listarEquipesParticipantes('c1').registros[0].timesDetalhados.length, 0);
  h.state.times = { c1: ['Equipe A'], c2: [] };
  response = clone(h.c.listarEquipesParticipantes('c1'));
  assert.deepEqual(response.campeonatos, []);
  assert.deepEqual(response.registros, []);
  h.state.autorizado = false;
  assert.throws(() => h.c.listarEquipesParticipantes('c1'), /permissão/);
  h.state.autorizado = true;
  h.state.perfil = 'admin';
  h.state.campeonatos = h.state.campeonatos.filter(c => c.id !== 'c1');
  assert.throws(() => h.c.listarTabelaCampeonato('c1'), /Campeonato não encontrado/);
});

test('falhas de fonte/criação/readback/publicação preservam ponteiro, arquivo, timestamp e exceção original', () => {
  for (const tipo of ['tabela', 'participantes']) {
    for (const failure of ['failBuild', 'failCreate', 'failRead', 'failPublish']) {
      const h = fixture(), recalc = tipo === 'tabela' ? 'recalcularTabelaCampeonato' : 'recalcularEquipesParticipantes';
      h.c[recalc]('c1');
      const before = h.snapshotState(tipo), text = h.snapshots.get(before.currentId).text;
      h.advance(60000);
      const error = Error('original failure with private detail');
      h.state[failure] = error;
      assert.throws(() => h.c[recalc]('c1'), caught => caught === error);
      const after = h.snapshotState(tipo);
      assert.equal(after.currentId, before.currentId);
      assert.equal(after.generatedAt, before.generatedAt);
      assert.equal(h.snapshots.get(before.currentId).text, text);
      assert(!h.snapshots.get(before.currentId).trashed);
      assert.match(after.lastError, /falhou.*anterior.*preservada/);
      assert(!JSON.stringify(after).includes('private detail'));
      assert(!h.locked());
    }
  }
});

test('lease serializa categoria; leitura pronta continua, expiração/lease tomada rejeitam publicação', () => {
  const h = fixture();
  h.c.recalcularTabelaCampeonato('c1');
  const before = h.snapshotState('tabela');
  h.state.onBuild = () => {
    assert(h.c.listarTabelaCampeonato('c1').snapshotStatus.emRecalculo);
    assert.throws(() => h.c.recalcularTabelaCampeonato('c2'), /já está sendo recalculada/);
  };
  h.c.recalcularTabelaCampeonato('c1');
  h.state.onBuild = () => h.advance(600001);
  const current = h.snapshotState('tabela').currentId;
  assert.throws(() => h.c.recalcularTabelaCampeonato('c1'), /prazo.*expirou/);
  assert.equal(h.snapshotState('tabela').currentId, current);
  h.state.onBuild = () => {
    h.properties.set(h.c.chaveMetaSnapshotEsportivo_('tabela', 'execucao'),
      JSON.stringify({ lease: { token: 'other', expiresAt: Date.now() + 999999999 } }));
  };
  assert.throws(() => h.c.recalcularTabelaCampeonato('c1'), /prazo.*expirou/);
  assert.equal(h.snapshotState('tabela').currentId, current);
  assert.equal(JSON.parse(h.properties.get(h.c.chaveMetaSnapshotEsportivo_('tabela', 'execucao'))).lease.token, 'other');
  assert(!h.snapshots.get(before.currentId).trashed);
});

test('dirty writes durante geração não se perdem; ambas categorias e campeonatos regeneram sempre', () => {
  const h = fixture();
  h.c.recalcularTabelaCampeonato('c1');
  h.c.recalcularEquipesParticipantes('c1');
  const status = h.c.statusSnapshotEsportivo_('tabela', 'c1');
  assert(!status.pendente);
  assert(!('intervaloMinutos' in status));
  assert(!('proximaAtualizacaoAproximada' in status));
  assert(!('atualizacaoAtrasada' in status));
  h.state.onCreate = () => h.c.marcarSnapshotsEsportivosPendentes_();
  h.c.recalcularTabelaCampeonato('c1');
  assert(h.c.statusSnapshotEsportivo_('tabela', 'c1').pendente);
  assert(h.c.statusSnapshotEsportivo_('participantes', 'c1').pendente);
  h.state.onCreate = null;
  h.c.recalcularTabelaCampeonato('c1');
  assert(!h.c.statusSnapshotEsportivo_('tabela', 'c1').pendente);
  assert(h.c.statusSnapshotEsportivo_('participantes', 'c1').pendente);
  h.c.recalcularEquipesParticipantes('c1');
  assert(!h.c.statusSnapshotEsportivo_('participantes', 'c1').pendente);
});

test('retenção targeted atual+anterior e corrupção/pasta/lixeira nunca aceitam publicação parcial', () => {
  const h = fixture();
  const ids = [];
  for (let i = 0; i < 3; i++) {
    h.c.recalcularTabelaCampeonato('c1');
    ids.push(h.snapshotState('tabela').currentId);
  }
  assert(h.snapshots.get(ids[0]).trashed);
  assert(!h.snapshots.get(ids[1]).trashed);
  assert(!h.snapshots.get(ids[2]).trashed);
  h.state.corrupt = true;
  assert.throws(() => h.c.recalcularTabelaCampeonato('c1'));
  assert.equal(h.snapshotState('tabela').currentId, ids[2]);
  h.state.corrupt = false;
  h.snapshots.get(ids[2]).parent = 'other';
  assert.throws(() => h.c.listarTabelaCampeonato('c1'), /Não foi possível ler/);
  h.snapshots.get(ids[2]).parent = h.rootId();
  h.snapshots.get(ids[2]).trashed = true;
  assert.throws(() => h.c.listarTabelaCampeonato('c1'), /Não foi possível ler/);
  assert.notEqual(h.c.chaveSnapshotEsportivo_('tabela', 'agenda'), h.c.chaveMetaSnapshotEsportivo_('tabela', 'agenda'));
});

test('três agendas independentes/idempotentes, só CLOCK próprios/handler correspondente e admin atual efetivo', () => {
  const h = fixture();
  h.c.configurarAgendamentoBancoAtletas();
  h.c.configurarAgendamentoTabela();
  h.c.configurarAgendamentoParticipantes();
  const ids = h.triggers.map(t => t.id);
  h.c.configurarAgendamentoTabela();
  h.c.configurarAgendamentoParticipantes();
  assert.deepEqual(h.triggers.map(t => t.id), ids);
  const unrelated = h.trigger(h.state.effective, 'other');
  const foreign = h.trigger('other@example.invalid', 'atualizarTabelaAgendada');
  const nonClock = h.trigger(h.state.effective, 'atualizarTabelaAgendada', 'EDIT');
  const duplicate = h.trigger(h.state.effective, 'atualizarTabelaAgendada');
  h.c.configurarAgendamentoTabela();
  assert(duplicate.deleted);
  h.state.email = h.state.effective = 'second@example.invalid';
  assert.throws(() => h.c.desativarAgendamentoTabela(), /outra conta/);
  h.state.email = h.state.effective = 'admin@example.invalid';
  assert.throws(() => h.c.atualizarTabelaAgendada({ triggerUid: 'wrong' }), /não configurado/);
  h.state.perfil = 'diretoria';
  assert.throws(() => h.c.configurarAgendamentoParticipantes(), /administrador/);
  assert.throws(() => h.c.atualizarTabelaAgendada({ triggerUid: h.schedule('tabela').triggerId }), /administrador/);
  h.state.perfil = 'admin';
  h.c.desativarAgendamentoTabela();
  assert(h.triggers.find(t => t.id === ids[1]).deleted);
  assert(!h.triggers.find(t => t.id === ids[0]).deleted);
  assert(!h.triggers.find(t => t.id === ids[2]).deleted);
  assert(!unrelated.deleted && !foreign.deleted && !nonClock.deleted);
});

test('agenda esportiva continua após recriação manual do trigger e reconfiguração preserva o existente', () => {
  const h = fixture();
  h.c.configurarAgendamentoTabela();
  const oldId = h.schedule('tabela').triggerId;
  h.triggers.find(t => t.id === oldId).deleted = true;
  const recreated = h.trigger(h.state.effective, 'atualizarTabelaAgendada');
  const otherHandler = h.trigger(h.state.effective, 'anotherHandler');
  const results = h.c.atualizarTabelaAgendada({ triggerUid: recreated.id });
  assert(results.length > 0);
  assert.throws(() => h.c.atualizarTabelaAgendada({ triggerUid: otherHandler.id }), /não configurado/);
  h.c.configurarAgendamentoTabela();
  assert(!recreated.deleted, 'reconfiguration should keep the manually adjusted trigger and its interval');
  assert.equal(h.triggers.filter(t => !t.deleted && t.owner === h.state.effective
    && t.handler === 'atualizarTabelaAgendada').length, 1);
});

test('orçamento/rodízio/checkpoint e falha isolada: nenhuma publicação parcial de campeonato', () => {
  const h = fixture();
  h.c.configurarAgendamentoTabela();
  const event = { triggerUid: h.schedule('tabela').triggerId };
  h.state.onBuild = () => h.advance(210001);
  assert.deepEqual(clone(h.c.atualizarTabelaAgendada(event)), [{ campeonatoId: 'c1', atualizado: true }]);
  assert.equal(h.schedule('tabela').cursor, 'c1');
  assert(!h.snapshotState('tabela', 'c2').currentId);
  h.c.atualizarTabelaAgendada(event);
  assert.equal(h.schedule('tabela').cursor, 'c2');
  assert(h.snapshotState('tabela', 'c2').currentId);
  const first = h.snapshotState('tabela').currentId;
  const second = h.snapshotState('tabela', 'c2').currentId;
  h.state.onBuild = id => { if (id === 'c1') throw Error('source'); };
  assert.throws(() => h.c.atualizarTabelaAgendada(event), /1 recálculo.*não concluído/);
  assert.equal(h.snapshotState('tabela').currentId, first);
  assert.notEqual(h.snapshotState('tabela', 'c2').currentId, second);
  assert.match(h.snapshotState('tabela').lastError, /falhou/);
});

test('mutações tabela retornam cálculo atual, revisão antiga recusa write, retorno não relê cópia', () => {
  const h = fixture();
  h.c.recalcularTabelaCampeonato('c1');
  const copy = h.c.listarTabelaCampeonato('c1');
  const payload = { campeonatoId: 'c1', revisao: copy.revisao,
    criterios: { pontosVitoria: 6, pontosEmpate: 2, pontosDerrota: 0, desempates: ['vitorias'] } };
  const updated = h.c.salvarCriteriosTabelaCampeonato(payload);
  assert.equal(updated.criterios.pontosVitoria, 6);
  assert.notEqual(updated.revisao, copy.revisao);
  assert.equal(h.c.listarTabelaCampeonato('c1').criterios.pontosVitoria, copy.criterios.pontosVitoria);
  assert(h.c.listarTabelaCampeonato('c1').snapshotStatus.pendente);
  const writes = h.writes.length;
  assert.throws(() => h.c.salvarCriteriosTabelaCampeonato(payload), /tabela foi alterada/);
  assert.equal(h.writes.length, writes);
  assert.equal(h.c.carregarTabelaCampeonatoAtual('c1').criterios.pontosVitoria, 6);
  for (const method of ['vincularEquipeParticipante', 'mutarTabelaCampeonato_', 'salvarResultadoJogoCampeonato']) {
    const start = backend.indexOf('function ' + method + '(');
    const end = backend.indexOf('\nfunction ', start + 1);
    assert.doesNotMatch(backend.slice(start, end < 0 ? undefined : end), /return listarEquipesParticipantes|return listarTabelaCampeonato/);
  }
});

test('placares/classificação usam o cálculo existente, cópia conserva resultados e retorno de vínculo é vivo', () => {
  const h = fixture();
  const doc = h.c.lerTabelaCampeonato_('c1');
  doc.jogos = [{
    id: 'j1', faseId: 'fase-classificacao', grupoId: '', rodada: 1,
    mandanteId: 'e1', visitanteId: 'e2', campoId: 'campo', data: '2026-10-06', hora: '12:00',
    status: 'encerrado', golsMandante: 2, golsVisitante: 0
  }];
  h.files.set(h.c.arquivoTabelaCampeonato_('c1'), JSON.stringify([doc]));
  const live = clone(h.c.carregarTabelaCampeonatoAtual('c1'));
  assert.equal(live.classificacao.geral.find(e => e.equipeId === 'e1').pontos, 3);
  h.c.recalcularTabelaCampeonato('c1');
  assert.deepEqual(clone(h.c.listarTabelaCampeonato('c1').classificacao), live.classificacao);
  h.state.times = { c1: ['Equipe A'], c2: ['Equipe A'] };
  const times = h.c.timesCampeonato_;
  h.c.timesCampeonato_ = id => {
    const value = h.properties.get(h.c.chaveTimesCampeonato_(id));
    return value ? JSON.parse(value) : times(id);
  };
  h.c.recalcularEquipesParticipantes('c1');
  assert.equal(h.c.listarEquipesParticipantes('c1').registros[0].timesDetalhados.length, 1);
  const response = h.c.vincularEquipeParticipante({ campeonatoId: 'c1', equipeId: 'e2' });
  assert.equal(response.registros[0].timesDetalhados.length, 2);
  assert.equal(h.c.listarEquipesParticipantes('c1').registros[0].timesDetalhados.length, 1);
  assert(h.c.statusSnapshotEsportivo_('participantes', 'c1').pendente);
});

test('persistências relevantes marcam pendente, inclusive falha parcial e sem cache de autorização', () => {
  const h = fixture();
  h.c.recalcularTabelaCampeonato('c1');
  h.c.recalcularEquipesParticipantes('c1');
  const before = h.c.revisaoSnapshotsEsportivos_();
  h.c.salvarCadastroElenco(h.payload('atletas'));
  assert.notEqual(h.c.revisaoSnapshotsEsportivos_(), before);
  assert(h.c.statusSnapshotEsportivo_('participantes', 'c1').pendente);
  h.c.recalcularEquipesParticipantes('c1');
  h.c.definirBloqueioElenco({ campeonatoId: 'c1', equipeId: 'e1', bloqueado: true });
  assert(h.c.statusSnapshotEsportivo_('participantes', 'c1').pendente);
  h.c.recalcularEquipesParticipantes('c1');
  h.state.failRoster = true;
  assert.throws(() => h.c.salvarCadastroElenco(h.payload('comissao')));
  assert(h.c.statusSnapshotEsportivo_('participantes', 'c1').pendente);
  for (const method of ['gravarTimesCampeonato_', 'gravarEquipes_', 'gravarRegistroEquipes_', 'gravarListaCadastroDrive_']) {
    const start = backend.indexOf('function ' + method + '(');
    assert.match(backend.slice(start, start + 240), /marcarSnapshotsEsportivosPendentes_/);
  }
});

test('frontend: scripts válidos, revalidação em cada editor, recálculo/releitura separados e guardas de navegação', () => {
  assert.doesNotMatch(html, /a cada (?:5|15) minutos|Configurar a cada \d+ minutos/i);
  assert.match(html, /Apps Script &gt; Acionadores/);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  for (const script of scripts) new vm.Script(script.replace(/<\?[\s\S]*?\?>/g, 'null'));
  for (const method of ['abrirTabelaJogo_', 'abrirTabelaCampo_', 'abrirTabelaGrupos_', 'abrirTabelaCriterios_', 'abrirTabelaDesempateOrganizacao_']) {
    const start = html.indexOf('function ' + method + '(');
    assert.match(html.slice(start, start + 230), /tabelaContextoAtual_/);
  }
  assert.match(html, /revisao === dados\.revisao\) continuar/);
  assert.match(html, /carregarTabelaCampeonatoAtual' : 'listarTabelaCampeonato'/);
  assert.match(html, /atual === true \? 'carregarEquipesParticipantesAtual' : 'listarEquipesParticipantes'/);
  assert.match(html, /recalcularEquipesParticipantes\(id\)/);
  assert.match(html, /requisicao !== participantesRequisicao.*moduloAtual !== 'times-campeonato'.*elencoAtual/);
  assert.match(html, /carregarTimesCampeonato\(true\)/);
});

function frontendFixture(script, extra) {
  const requests = [];
  const c = vm.createContext({
    CONFIG: { usuario: { perfil: 'admin' } }, confirmacaoElencoAtual: null,
    google: { script: { get run() {
      const req = {};
      const runner = new Proxy({
        withSuccessHandler(fn) { req.success = fn; return runner; },
        withFailureHandler(fn) { req.failure = fn; return runner; }
      }, {
        get(target, name) {
          return target[name] || ((...args) => { req.method = name; req.args = args; requests.push(req); });
        }
      });
      return runner;
    } } },
    ...extra
  });
  vm.runInContext(script, c);
  return { c, requests };
}

test('frontend executado: recálculo tabela único, callback obsoleto não navega, editor recebe revisão atual', () => {
  let loads = 0, renders = 0, continued = 0;
  const script = html.slice(html.indexOf('    function recalcularTabelaAgora_('), html.indexOf('    function tabelaExecutar_('));
  const { c, requests } = frontendFixture(script, {
    moduloAtual: 'jogos-campeonato',
    tabelaEstado: { ocupado: false, campeonatoId: 'c1', requisicao: 0, dados: { revisao: 'old' } },
    tabelaModuloAtivo_: () => c.moduloAtual === 'jogos-campeonato',
    tabelaNavegar_: fn => fn(),
    tabelaOcupada_: ativo => { c.tabelaEstado.ocupado = ativo; },
    carregarTabelaCampeonato_: () => { loads++; },
    montarTabelaCampeonato_: () => { renders++; },
    tabelaErro_: error => { c.error = error; }
  });
  c.recalcularTabelaAgora_();
  c.recalcularTabelaAgora_();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'recalcularTabelaCampeonato');
  requests[0].success();
  assert.equal(loads, 1);
  c.recalcularTabelaAgora_();
  c.tabelaEstado.requisicao++;
  requests[1].success();
  assert.equal(loads, 1);
  c.tabelaEstado.ocupado = false;
  c.tabelaContextoAtual_(() => { continued++; });
  requests[2].success({ revisao: 'new' });
  assert.equal(c.tabelaEstado.dados.revisao, 'new');
  assert.equal(continued, 0, 'Changed revision requires reviewing refreshed data, not editing stale row/index');
  assert.equal(renders, 1);
  c.tabelaContextoAtual_(() => { continued++; });
  requests[3].success({ revisao: 'new' });
  assert.equal(continued, 1);
  c.tabelaContextoAtual_(() => { continued++; });
  c.moduloAtual = 'equipes';
  requests[4].success({ revisao: 'new' });
  assert.equal(continued, 1);
});

test('frontend executado: participantes recálculo exclusivo, permissões/UI restauradas e resposta tardia ignorada', () => {
  let loads = 0, errors = 0;
  const controls = [{ disabled: false, isConnected: true }, { disabled: true, isConnected: true }];
  const loading = { isConnected: true, remove() { this.isConnected = false; } };
  const area = {
    querySelectorAll: () => controls, setAttribute: () => {}, removeAttribute: () => {},
    insertAdjacentHTML: (position, html) => {
      if (html.includes('class="erro"')) errors++;
      else loading.isConnected = true;
    }
  };
  const script = html.slice(html.indexOf('    let participantesRecalculando_ ='), html.indexOf('    function montarTelaTimesCampeonato('));
  const { c, requests } = frontendFixture(script, {
    moduloAtual: 'times-campeonato', elencoAtual: null, participantesRequisicao: 0,
    campeonatoParticipantesAtual: 'c1', escapar: String,
    document: { getElementById: id => id === 'areaTimesCampeonato' ? area
      : id === 'epRecalculoLoading' ? loading : controls[0] },
    blocoCarregando: () => '<div class="carregando"></div>', focarAvisoOuFormulario_: () => {},
    carregarTimesCampeonato: () => { loads++; }
  });
  c.CONFIG.usuario.perfil = 'associado';
  c.recalcularParticipantesAgora_();
  assert.equal(requests.length, 0);
  c.CONFIG.usuario.perfil = 'admin';
  c.recalcularParticipantesAgora_();
  c.recalcularParticipantesAgora_();
  assert.equal(requests.length, 1);
  assert(controls.every(item => item.disabled));
  requests[0].failure(Error('failed'));
  assert.equal(errors, 1);
  assert.equal(controls[0].disabled, false);
  assert.equal(controls[1].disabled, true);
  c.recalcularParticipantesAgora_();
  requests[1].success();
  assert.equal(loads, 1);
  c.recalcularParticipantesAgora_();
  c.participantesRequisicao++;
  requests[2].success();
  assert.equal(loads, 1);
  c.recalcularParticipantesAgora_();
  c.elencoAtual = { campeonatoId: 'c1' };
  requests[3].success();
  assert.equal(loads, 1);
});
