const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const STATE = 'BANCO_ATLETAS_SNAPSHOT_V1', SCHEDULE = 'BANCO_ATLETAS_AGENDA_V1';
const HANDLER = 'atualizarBancoAtletasAgendado';

function fixture(script = source) {
  let now = Date.parse('2026-10-06T19:00:00.000Z'), locked = false, sequence = 0;
  const properties = new Map(), files = new Map(), triggers = [], logs = [], operations = [];
  const state = {
    active: 'admin@example.invalid', effective: 'admin@example.invalid', builds: 0,
    users: [{ email: 'admin@example.invalid', perfil: 'admin' }, { email: 'board@example.invalid', perfil: 'diretoria' },
      { email: 'second@example.invalid', perfil: 'admin' }, { email: 'team@example.invalid', perfil: 'associado' }]
  };
  const file = (id, text) => {
    const data = { id, text, trashed: false, parent: '' };
    const handle = {
      getId: () => id, isTrashed: () => data.trashed,
      getParents: () => {
        let read = false;
        return { hasNext: () => !read, next: () => { read = true; return { getId: () => data.parent }; } };
      },
      getBlob: () => ({ getDataAsString: () => {
        operations.push('snapshot-read');
        if (state.failRead) throw state.failRead;
        return data.text;
      } }),
      setTrashed: value => {
        assert(locked);
        if (state.failTrash) throw state.failTrash;
        data.trashed = value;
      },
      setContent: () => { throw Error('Immutable snapshot must never be overwritten'); }
    };
    data.handle = handle;
    files.set(id, data);
    return handle;
  };
  const trigger = (owner, handler = HANDLER, event = 'CLOCK') => {
    const data = { id: 'trigger-' + ++sequence, owner, handler, event, deleted: false };
    Object.assign(data, { getUniqueId: () => data.id, getHandlerFunction: () => data.handler, getEventType: () => data.event });
    triggers.push(data);
    return data;
  };
  const lock = {
    waitLock() { assert(!locked, 'Nested script lock / history deadlock'); locked = true; operations.push('lock'); },
    releaseLock() { assert(locked); locked = false; }
  };
  const c = vm.createContext({
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    },
    console: { log: message => logs.push(message) },
    Session: { getActiveUser: () => ({ getEmail: () => state.active }), getEffectiveUser: () => ({ getEmail: () => state.effective }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => { operations.push('property-read'); return properties.get(key) || null; },
      setProperty: (key, value) => {
        assert(locked);
        const parsed = JSON.parse(value);
        if (state.failPublish && key === STATE && parsed.currentId !== JSON.parse(properties.get(STATE) || '{}').currentId) {
          throw state.failPublish;
        }
        properties.set(key, value);
      },
      deleteProperty: key => { assert(locked); properties.delete(key); }
    }) },
    LockService: { getScriptLock: () => lock },
    CacheService: { getUserCache: () => { throw Error('No cross-request business cache'); },
      getScriptCache: () => { throw Error('No cross-user business cache'); } },
    Utilities: { getUuid: () => 'uuid-' + ++sequence, newBlob: (text, mime, name) => ({ text, mime, name }) },
    DriveApp: { getFileById: id => {
      operations.push('snapshot-id');
      if (!files.has(id)) throw Error('file unavailable');
      return files.get(id).handle;
    } },
    ScriptApp: {
      EventType: { CLOCK: 'CLOCK' },
      getProjectTriggers: () => triggers.filter(t => !t.deleted && t.owner === state.effective),
      deleteTrigger: t => { assert.equal(t.owner, state.effective); t.deleted = true; },
      newTrigger: handler => ({
        timeBased() { return this; },
        everyMinutes(value) { assert.equal(value, 15); return this; },
        create() { return trigger(state.effective, handler); }
      })
    }
  });
  vm.runInContext(script, c);
  const root = vm.runInContext('CONFIG.pastaRaizId', c);
  c.obterUsuarios_ = () => state.users;
  c.pastaRaizProjeto_ = () => ({
    createFile: blob => {
      assert(!locked, 'Snapshot write must not hold legacy history lock');
      assert.equal(blob.mime, 'application/json');
      if (state.failCreate) throw state.failCreate;
      const handle = file('snapshot-' + ++sequence, state.corruptCreated ? '{bad' : blob.text);
      files.get(handle.getId()).parent = root;
      return handle;
    }
  });
  const live = () => c.consolidarAtletasBanco_(
    { grupos: [], campeonatos: 0, atuais: 0, anteriores: 0 },
    { total: 1, registros: [{ equipe: 'Equipe', competicao: 'Copa', pessoas: [{ nome: 'Atleta', cpf: '52998224725', tipo: 'Atleta' }] }] },
    { registros: [] }, { total: 0, registros: [] });
  c.construirBancoAtletas_ = () => {
    assert(!locked);
    state.builds++;
    // Same lock discipline as permanent global history reconciliation.
    lock.waitLock();
    lock.releaseLock();
    if (state.onBuild) state.onBuild();
    if (state.failBuild) throw state.failBuild;
    return live();
  };
  const getState = () => JSON.parse(properties.get(STATE) || '{}');
  const user = email => { state.active = email; state.effective = email; };
  return { c, state, properties, files, triggers, logs, operations, live, getState, user, trigger,
    advance: ms => { now += ms; }, locked: () => locked };
}

test('primeira geração explícita, contrato completo e leituras apenas do snapshot, sem reconciliação/cache', () => {
  const h = fixture();
  assert.throws(() => h.c.listarAtletas(), /ainda não possui snapshot.*primeira geração/);
  assert.equal(h.state.builds, 0);
  h.c.recalcularBancoAtletas();
  const expected = h.live();
  h.state.failBuild = Error('Live sources must not be consulted');
  const data = clone(h.c.listarAtletas());
  assert.deepEqual({ registros: data.registros, fontes: data.fontes, total: data.total }, clone(expected));
  assert.equal(data.schema, 1);
  assert.equal(data.generatedAt, '2026-10-06T19:00:00.000Z');
  assert.equal(data.snapshotStatus.agendado, false);
  assert.equal(h.state.builds, 1);
  h.user('board@example.invalid');
  assert.deepEqual(clone(h.c.listarAtletas()), data);
  assert.equal(h.state.builds, 1);
  assert(h.operations.includes('snapshot-id'));
  assert(h.operations.includes('snapshot-read'));
  assert(!h.locked());
});

test('permissão atual antes de ler, recalcular, status e configurar; mutações nunca referenciam snapshot', () => {
  const h = fixture();
  h.c.recalcularBancoAtletas();
  for (const email of ['team@example.invalid', 'unknown@example.invalid', '']) {
    h.user(email);
    const before = h.operations.filter(o => o === 'snapshot-id').length;
    for (const method of ['listarAtletas', 'recalcularBancoAtletas', 'obterStatusBancoAtletas']) {
      assert.throws(() => h.c[method](), /permissão/);
    }
    for (const method of ['configurarAgendamentoBancoAtletas', 'desativarAgendamentoBancoAtletas']) {
      assert.throws(() => h.c[method](), /administrador/);
    }
    assert.equal(h.operations.filter(o => o === 'snapshot-id').length, before);
  }
  h.user('board@example.invalid');
  h.c.recalcularBancoAtletas();
  assert.throws(() => h.c.configurarAgendamentoBancoAtletas(), /administrador/);
  for (const name of ['salvarCadastroElenco', 'removerCadastroElenco', 'transferirAtletaElencoInterno_']) {
    const mutationStart = source.indexOf('function ' + name + '(');
    assert(mutationStart >= 0);
    assert.doesNotMatch(source.slice(mutationStart, source.indexOf('\nfunction ', mutationStart + 1)), /listarAtletas|SnapshotBancoAtletas/);
  }
});

test('cada falha preserva arquivo/ponteiro/timestamp anterior, sinaliza erro sanitizado e propaga exceção original', () => {
  for (const failure of ['failBuild', 'failCreate', 'failRead', 'failPublish']) {
    const h = fixture();
    h.c.recalcularBancoAtletas();
    const before = h.getState(), text = h.files.get(before.currentId).text;
    h.advance(60_000);
    const original = Error('private CPF 52998224725 ' + failure);
    h.state[failure] = original;
    assert.throws(() => h.c.recalcularBancoAtletas(), error => error === original);
    const after = h.getState();
    assert.equal(after.currentId, before.currentId);
    assert.equal(after.generatedAt, before.generatedAt);
    assert.equal(h.files.get(before.currentId).text, text);
    assert(!h.files.get(before.currentId).trashed);
    assert(!after.lease);
    assert.match(after.lastError, /falhou.*anterior.*preservada/);
    assert(!JSON.stringify(after).includes('52998224725'));
    assert(!h.logs.join('').includes('52998224725'));
    h.state[failure] = null;
    assert.equal(h.c.listarAtletas().generatedAt, before.generatedAt);
    assert.match(h.c.listarAtletas().snapshotStatus.ultimoErro, /falhou/);
    assert(!h.locked());
    h.c.recalcularBancoAtletas();
    assert.equal(h.getState().lastError, '');
  }
});

test('lease impede concorrência, leitura pronta continua disponível e expiração recupera execução interrompida', () => {
  const h = fixture();
  h.c.recalcularBancoAtletas();
  const previous = h.getState().currentId;
  h.state.onBuild = () => {
    assert.throws(() => h.c.recalcularBancoAtletas(), /já está sendo recalculado/);
    assert.equal(h.c.listarAtletas().snapshotStatus.emRecalculo, true);
    assert.equal(h.getState().currentId, previous);
  };
  h.c.recalcularBancoAtletas();
  assert.equal(h.state.builds, 2);
  h.state.onBuild = null;
  const state = h.getState();
  state.lease = { token: 'abandoned', expiresAt: Date.parse('2026-10-06T19:10:00Z') };
  h.properties.set(STATE, JSON.stringify(state));
  assert.throws(() => h.c.recalcularBancoAtletas(), /já está sendo recalculado/);
  h.advance(11 * 60_000);
  assert.match(h.c.listarAtletas().snapshotStatus.ultimoErro, /não terminou/);
  h.c.recalcularBancoAtletas();
  assert(!h.getState().lease);
  assert(!h.locked());
});

test('lease tomada por nova execução não é removida nem publica resultado da execução antiga', () => {
  const h = fixture();
  h.c.recalcularBancoAtletas();
  const id = h.getState().currentId;
  h.state.onBuild = () => {
    const state = h.getState();
    state.lease = { token: 'another-owner', expiresAt: Date.parse('2026-10-06T20:00:00Z') };
    h.properties.set(STATE, JSON.stringify(state));
  };
  assert.throws(() => h.c.recalcularBancoAtletas(), /outra execução/);
  assert.equal(h.getState().lease.token, 'another-owner');
  assert.equal(h.getState().currentId, id);
  assert.equal(h.getState().lastError, '');
  assert(!h.locked());
});

test('expirar durante consolidação rejeita publicação; snapshot incompleto/corrompido não vira sucesso parcial', () => {
  const h = fixture();
  h.c.recalcularBancoAtletas();
  const id = h.getState().currentId;
  h.state.onBuild = () => h.advance(11 * 60_000);
  assert.throws(() => h.c.recalcularBancoAtletas(), /prazo.*expirou/);
  assert.equal(h.getState().currentId, id);
  h.state.onBuild = null;
  h.state.corruptCreated = true;
  assert.throws(() => h.c.recalcularBancoAtletas());
  assert.equal(h.getState().currentId, id);
  h.state.corruptCreated = false;
  for (const corrupt of [
    () => '{invalid', d => { d.schema = 99; }, d => { d.generatedAt = 'invalid'; },
    d => { d.total++; }, d => { delete d.fontes; }, d => { d.fontes.sumulasLidas = -1; },
    d => { delete d.registros[0].vinculos; }, d => { d.registros[0].punicoes = [null]; },
    d => { d.registros[0].movimentacoes[0].equipe = {}; },
    d => { d.generatedAt = '2026'; }, d => { d.registros[0].totalMovimentacoes = 0; },
    d => { d.registros[0].cpf = 123; }, d => { d.registros[0].totalVinculos++; },
    d => { d.registros.push(d.registros[0]); d.total++; }
  ]) {
    const original = h.files.get(id).text;
    const data = JSON.parse(original), text = corrupt(data);
    h.files.get(id).text = typeof text === 'string' ? text : JSON.stringify(data);
    assert.throws(() => h.c.listarAtletas(), /snapshot|Snapshot/);
    h.files.get(id).text = original;
  }
  h.files.get(id).parent = 'other-folder';
  assert.throws(() => h.c.listarAtletas(), /indisponível/);
  assert.equal(h.state.builds, 3);
});

test('retenção normal de atual+anterior e limpeza apenas de ID obsoleto, sem falhar publicação', () => {
  const h = fixture();
  const unrelated = h.trigger('other@example.invalid', 'anotherHandler');
  h.c.recalcularBancoAtletas();
  const first = h.getState().currentId;
  h.c.recalcularBancoAtletas();
  const second = h.getState().currentId;
  assert.equal(h.getState().previousId, first);
  assert(!h.files.get(first).trashed);
  h.c.recalcularBancoAtletas();
  assert(h.files.get(first).trashed);
  assert(!h.files.get(second).trashed);
  assert.equal(h.getState().previousId, second);
  h.state.failTrash = Error('private cleanup failure');
  h.c.recalcularBancoAtletas();
  assert.equal(h.getState().lastError, '');
  assert(!unrelated.deleted);
  assert.equal(h.logs.length, 1);
  assert(!h.logs[0].includes('private'));
});

test('instalação 15 minutos idempotente, dono visível, sem afetar gatilhos alheios/não relacionados', () => {
  const h = fixture();
  const foreign = h.trigger('second@example.invalid');
  const unrelated = h.trigger('admin@example.invalid', 'anotherHandler');
  const nonClock = h.trigger('admin@example.invalid', HANDLER, 'ON_EDIT');
  const first = clone(h.c.configurarAgendamentoBancoAtletas());
  assert.equal(first.agendado, true);
  assert(!('intervaloMinutos' in first));
  assert.equal(first.responsavel, 'admin@example.invalid');
  const status = h.c.obterStatusBancoAtletas();
  assert.equal(status.agendado, true);
  assert(!('intervaloMinutos' in status));
  assert(!('proximaAtualizacaoAproximada' in status));
  assert(!('atualizacaoAtrasada' in status));
  const agenda = JSON.parse(h.properties.get(SCHEDULE));
  const duplicate = h.trigger('admin@example.invalid');
  assert.deepEqual(clone(h.c.configurarAgendamentoBancoAtletas()), first);
  assert(duplicate.deleted);
  assert(!unrelated.deleted && !foreign.deleted && !nonClock.deleted);
  assert.equal(h.triggers.filter(t => t.owner === 'admin@example.invalid' && t.handler === HANDLER && t.event === 'CLOCK' && !t.deleted).length, 1);
  h.user('second@example.invalid');
  assert.throws(() => h.c.configurarAgendamentoBancoAtletas(), /outra conta/);
  assert.throws(() => h.c.desativarAgendamentoBancoAtletas(), /outra conta/);
  assert.equal(JSON.parse(h.properties.get(SCHEDULE)).triggerId, agenda.triggerId);
  h.user('admin@example.invalid');
  assert.equal(h.c.desativarAgendamentoBancoAtletas().agendado, false);
  assert(!unrelated.deleted && !foreign.deleted && !nonClock.deleted);
  assert(!h.properties.has(SCHEDULE));
});

test('gatilho usa administrador efetivo autorizado sem sessão ativa, rejeita revogação/UID/dono e mantém erros automáticos', () => {
  const h = fixture();
  h.c.configurarAgendamentoBancoAtletas();
  const agenda = JSON.parse(h.properties.get(SCHEDULE));
  const originalTrigger = h.triggers.find(t => t.id === agenda.triggerId);
  originalTrigger.deleted = true;
  const recreated = h.trigger('admin@example.invalid', HANDLER);
  const event = { triggerUid: recreated.id };
  h.state.active = '';
  h.c.atualizarBancoAtletasAgendado(event);
  assert.equal(h.state.builds, 1);
  h.state.active = 'admin@example.invalid';
  h.c.configurarAgendamentoBancoAtletas();
  assert(!recreated.deleted, 'reconfiguration should keep the manually adjusted trigger and its interval');
  assert.equal(h.triggers.filter(t => !t.deleted && t.owner === 'admin@example.invalid'
    && t.handler === HANDLER).length, 1);
  assert.throws(() => h.c.atualizarBancoAtletasAgendado({ triggerUid: 'wrong' }), /não configurado/);
  assert.throws(() => h.c.atualizarBancoAtletasAgendado(), /não configurado/);
  h.state.users[0].perfil = 'diretoria';
  assert.throws(() => h.c.atualizarBancoAtletasAgendado(event), /administrador/);
  h.state.users[0].perfil = 'admin';
  h.state.effective = 'second@example.invalid';
  assert.throws(() => h.c.atualizarBancoAtletasAgendado(event), /outra conta/);
  h.state.effective = 'admin@example.invalid';
  const original = Error('automatic source failure');
  h.state.failBuild = original;
  assert.throws(() => h.c.atualizarBancoAtletasAgendado(event), error => error === original);
  assert.match(h.getState().lastError, /falhou/);
  h.state.active = 'board@example.invalid';
  assert.throws(() => h.c.configurarAgendamentoBancoAtletas(), /administrador/);
  h.state.active = 'second@example.invalid';
  assert.throws(() => h.c.configurarAgendamentoBancoAtletas(), /outra conta/);
});

test('métricas da leitura prontas privadas e flag desligada, sem efeito em resultado', () => {
  const h = fixture();
  h.c.recalcularBancoAtletas();
  const data = clone(h.c.listarAtletas());
  const metric = JSON.parse(h.logs.at(-1));
  assert.deepEqual(Object.keys(metric).sort(), ['duracaoMs', 'fase', 'metrica']);
  assert.equal(metric.fase, 'snapshot');
  assert(!JSON.stringify(metric).includes('52998224725'));
  const disabled = fixture(source.replace('const CADASTRO_METRICAS_ATIVAS = true;', 'const CADASTRO_METRICAS_ATIVAS = false;'));
  disabled.c.recalcularBancoAtletas();
  assert.deepEqual(clone(disabled.c.listarAtletas()), data);
  assert.equal(disabled.logs.length, 0);
});

test('Administração isola configuração de imagens, serializa ações e ignora status/carregamentos obsoletos', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
  const admin = html.slice(html.indexOf('    let administracaoOcupada_ ='), html.indexOf('    function selecionarFontesOtimizacao_'));
  const elements = {}, requests = [];
  const element = id => {
    const node = {
      id, textContent: '', disabled: false, isConnected: true, addEventListener() {},
      querySelectorAll: () => Object.values(elements).filter(e => /Admin$/.test(e.id)),
      set innerHTML(value) {
        this.markup = value;
        for (const match of value.matchAll(/\bid="([^"]+)"/g)) element(match[1]);
      },
      get innerHTML() { return this.markup || ''; }
    };
    elements[id] = node;
    return node;
  };
  element('areaAdministracao');
  const c = vm.createContext({
    CONFIG: { usuario: { perfil: 'admin' } }, moduloAtual: 'administracao', escapar: String,
    otimizarLogoSistema_() {}, otimizarImagensBase_() {}, textoStatusSnapshot_: value => JSON.stringify(value),
    document: {
      getElementById: id => elements[id],
      querySelector: selector => selector.indexOf('reconciliarCampeonatoHistoricoElencoAgora') >= 0
        ? element('botaoReconciliarHistorico') : null,
      querySelectorAll: () => []
    },
    google: { script: { get run() {
      const req = {};
      const runner = {
        withSuccessHandler(fn) { req.success = fn; return this; },
        withFailureHandler(fn) { req.failure = fn; return this; }
      };
      for (const method of ['obterStatusBancoAtletas', 'listarFontesOtimizacaoImagens',
        'obterStatusSnapshotsEsportivos', 'obterStatusIndicesValidacao', 'obterStatusFilaHistoricoElenco',
        'listarCampeonatosFilaHistoricoElenco',
        'configurarAgendamentoBancoAtletas', 'desativarAgendamentoBancoAtletas']) {
        runner[method] = () => { req.method = method; requests.push(req); };
      }
      return runner;
    } } }
  });
  vm.runInContext(admin, c);
  c.carregarAdministracao_();
  const status = requests.find(req => req.method === 'obterStatusBancoAtletas');
  const images = requests.find(req => req.method === 'listarFontesOtimizacaoImagens');
  const campeonatosFila = requests.find(req => req.method === 'listarCampeonatosFilaHistoricoElenco');
  assert.match(elements.areaAdministracao.innerHTML, /atualização programada/);
  assert.match(elements.areaAdministracao.innerHTML, /Configurar agendamento/);
  assert.match(elements.areaAdministracao.innerHTML, /Apps Script &gt; Acionadores/);
  assert.doesNotMatch(elements.areaAdministracao.innerHTML, /a cada (?:5|15) minutos/i);
  assert.match(elements.areaAdministracao.innerHTML, /data-fila-historico="configurarAgendamentoHistoricoElenco"/);
  assert.match(elements.areaAdministracao.innerHTML, /data-fila-historico="processarHistoricoElencoAgora"/);
  assert.match(elements.areaAdministracao.innerHTML, /data-fila-historico="reconciliarCampeonatoHistoricoElencoAgora"/);
  assert.match(elements.areaAdministracao.innerHTML, /reconciliarHistoricoCampeonato/);
  campeonatosFila.success([{ id: 'c1', nome: 'Atual' }]);
  assert.match(elements.reconciliarHistoricoCampeonato.innerHTML, /Atual/);
  elements.configurarSnapshotAdmin.onclick();
  const action = requests.at(-1);
  assert.equal(action.method, 'configurarAgendamentoBancoAtletas');
  assert.equal(vm.runInContext('administracaoSnapshotOcupada_', c), true);
  assert.equal(vm.runInContext('administracaoOcupada_', c), false);
  assert(elements.configurarSnapshotAdmin.disabled);
  elements.desativarSnapshotAdmin.onclick();
  assert.equal(requests.at(-1), action);
  action.success({ agendado: true, responsavel: 'owner' });
  assert.equal(elements.statusSnapshotAdmin.textContent, '{"agendado":true,"responsavel":"owner"}');
  assert(!elements.configurarSnapshotAdmin.disabled);
  status.success({ agendado: false }); // Slow initial status must not undo successful setup.
  assert.match(elements.statusSnapshotAdmin.textContent, /owner/);
  images.failure(Error('images unavailable'));
  assert.match(elements.adminImagens.innerHTML, /images unavailable/);
  assert.match(elements.areaAdministracao.innerHTML, /configurarSnapshotAdmin/);
  vm.runInContext('administracaoOcupada_ = true;', c);
  elements.configurarSnapshotAdmin.onclick();
  assert.equal(requests.at(-1), action);
  vm.runInContext('administracaoOcupada_ = false;', c);
  elements.desativarSnapshotAdmin.onclick();
  requests.at(-1).failure(Error('only owner'));
  assert.equal(elements.statusSnapshotAdmin.textContent, 'only owner');
  assert.equal(vm.runInContext('administracaoSnapshotOcupada_', c), false);
  c.carregarAdministracao_();
  c.moduloAtual = 'equipes';
  const markup = elements.areaAdministracao.innerHTML;
  requests.at(-1).success([]);
  requests.findLast(req => req.method === 'obterStatusBancoAtletas').success({ agendado: true });
  assert.equal(elements.areaAdministracao.innerHTML, markup);
  c.moduloAtual = 'administracao';
  c.CONFIG.usuario.perfil = 'diretoria';
  const count = requests.length;
  c.carregarAdministracao_();
  assert.equal(requests.length, count);
  assert.match(elements.areaAdministracao.textContent, /exclusivo/);
});
