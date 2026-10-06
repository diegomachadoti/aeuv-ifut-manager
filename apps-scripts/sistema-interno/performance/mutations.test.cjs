const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { harness, person, participation, historyFile, rosterFile } = require('./save-fixture.cjs');
const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const operations = ['atletas', 'comissao', 'transfer'];
const tipoOf = op => op === 'comissao' ? op : 'atletas';
function seeded(op, code = source, options = {}) {
  const h = harness(code, options);
  const tipo = tipoOf(op);
  h.seed('c1', tipo, [person(tipo)]);
  h.seed('c2', 'atletas', [person('atletas', { id: 'old', cpf: '123', foto: 'old-photo' })]);
  return h;
}
const invoke = (h, op, extra = {}) => (op === 'transfer'
  ? h.c.transferirAtletaElenco : h.c.removerCadastroElenco)({
  ...h.payload(tipoOf(op), true), equipeDestinoId: 'e2', ...extra
});
const entries = (h, op) => h.history().inscricoes.filter(item =>
  item.campeonatoId === 'c1' && item.tipo === tipoOf(op) && item.registroId === person(tipoOf(op)).id);
const assertOriginal = (h, op) => {
  const original = entries(h, op).find(item => item.equipeId === 'e1');
  assert(original);
  assert.equal(original.dados.timeVinculado, 'Equipe A');
  assert.equal(original.dados.foto, 'photo');
  assert.equal(original.dados.cpf, person(tipoOf(op)).cpf);
  assert(!('participouCompeticao' in original.dados));
  return original;
};

for (const op of operations) test(`${op}: leitura unica, snapshot previo e contrato UI sob um lock`, () => {
  const h = seeded(op);
  const observed = [];
  h.state.onRoster = () => {
    assert(h.locked());
    assertOriginal(h, op);
    observed.push(h.writes.slice());
  };
  const montar = h.c.montarRespostaElenco_;
  h.c.montarRespostaElenco_ = (contexto, listas, recursos) => {
    assert(h.locked());
    assert.equal(contexto, recursos.contexto);
    assert.equal(JSON.stringify(listas[tipoOf(op)]), JSON.stringify(h.roster('c1', tipoOf(op))));
    return montar(contexto, listas, recursos);
  };
  const result = invoke(h, op, { timeVinculado: 'Injected Team', atletaId: 'old', id: 'old',
    contexto: { sessao: { usuario: { perfil: 'admin' } } } });
  // Baseline before this change: rosters 8/8/7, lookups 12/12/11,
  // championships 6/5/6, teams 5/5/6, times 7/7/9 (athlete/staff/transfer).
  assert.equal(h.counts.rosters, 4);
  assert.equal(h.io.filter(item => item.operacao === 'lookup').length, 5);
  for (const key of ['campeonatos', 'equipes', 'bloqueios', 'locks']) assert.equal(h.counts[key], 1, key);
  assert.equal(h.counts.sessoes, 2);
  assert.equal(h.counts.times, 2);
  assert.equal(h.counts.tables, op === 'comissao' ? 0 : 1);
  assert.deepEqual(h.reads.filter(item => !item.locked).map(item => item.recurso), ['autorizacao']);
  assert.equal(observed.length, 1);
  assert.deepEqual(h.writes, [historyFile, rosterFile('c1', tipoOf(op)), historyFile]);
  assert.equal(assertOriginal(h, op).presente, false);
  assert(h.history().inscricoes.some(item => item.campeonatoId === 'c2' && item.dados.foto === 'old-photo'));
  assert.equal(entries(h, op).length, op === 'transfer' ? 2 : 1);
  if (op === 'transfer') {
    const target = entries(h, op).find(item => item.equipeId === 'e2');
    assert.equal(target.presente, true);
    assert.equal(target.dados.timeVinculado, 'Equipe B');
    assert.equal(h.roster('c1', 'atletas')[0].cpf, person('atletas').cpf);
  }
  for (const field of ['equipe', 'campeonatos', 'times', 'posicoes', 'cargos', 'registros',
    'bloqueado', 'podeEditar', 'podeBloquear', 'podeTransferir', 'equipesDestinoTransferencia', 'linkInscricao', 'recado']) {
    assert(field in result, field);
  }
  assert.equal(result.registros[0][tipoOf(op)].length, 0);
  assert.equal(result.equipe.id, 'e1');
  assert.equal(result.podeTransferir, true);
  assert.equal(result.equipesDestinoTransferencia[0].id, 'e2');
  assert(!h.locked());
  for (const phase of ['espera_lock', 'lock_autorizacao', 'lock_vinculo', 'lock_bloqueio',
    'lock_elenco_leitura', 'preparacao_historico', 'gravacao_elenco', 'gravacao_historico', 'resposta',
    op === 'transfer' ? 'transferencia_total' : `remocao_${op}_total`]) {
    assert(h.logs.some(log => log.fase === phase), phase);
  }
});

test('participacao por ID OU CPF normalizado bloqueia remover e transferir em todos os perfis', () => {
  for (const op of ['atletas', 'transfer']) for (const perfil of ['admin', 'diretoria', 'associado']) {
    for (const participante of [
      person('atletas', { cpf: '11144477735' }),
      person('atletas', { id: 'another', cpf: '529.982.247-25' })
    ]) {
      const h = seeded(op);
      h.state.perfil = perfil;
      h.state.jogos = [participation(participante, 'e2')];
      const games = JSON.stringify(h.state.jogos);
      assert.throws(() => invoke(h, op), perfil === 'associado' && op === 'transfer'
        ? /Somente admin/ : /não pode ser (removido|transferido)/);
      assert.equal(h.writes.length, 0);
      assert.equal(JSON.stringify(h.state.jogos), games);
      assert.equal(h.roster('c1', 'atletas')[0].timeVinculado, 'Equipe A');
      assert(!h.locked());
    }
  }
});

test('participacao e resultado invalido surgidos na espera sao verificados antes do historico', () => {
  for (const op of ['atletas', 'transfer']) for (const invalid of [false, true]) {
    const h = seeded(op);
    h.state.onLock = () => {
      const jogo = participation();
      if (invalid) jogo.resultado.equipes = [];
      h.state.jogos = [jogo];
    };
    assert.throws(() => invoke(h, op), invalid ? /inválido/ : /já participou/);
    assert.equal(h.writes.length, 0);
  }
});

test('guardas baratas recusam acesso e IDs malformados sem ler contexto ou adquirir lock', () => {
  for (const op of operations) {
    for (const extra of [{ campeonatoId: '' }, { campeonatoId: [] }, { equipeId: null },
      { equipeId: 1 }, { registroId: '' }, { registroId: {} },
      ...(op === 'transfer' ? [{ equipeDestinoId: [] }, { equipeDestinoId: '' }] : [{ tipo: 'invalid' }])]) {
      const h = seeded(op);
      assert.throws(() => invoke(h, op, extra));
      assert.equal(h.counts.locks, 0);
      assert.deepEqual(h.reads.map(item => item.recurso), ['autorizacao']);
      assert.equal(h.writes.length, 0);
    }
    for (const state of [{ autorizado: false }, { perfil: 'visitante' },
      ...(op === 'transfer' ? [{ perfil: 'associado' }] : [])]) {
      const h = seeded(op);
      Object.assign(h.state, state);
      assert.throws(() => invoke(h, op));
      assert.equal(h.counts.locks, 0);
      assert.equal(h.writes.length, 0);
    }
  }
});

test('permissao, propriedade, atividade e vinculo da origem sao revalidados sob lock', () => {
  for (const op of operations) for (const change of [
    h => { h.state.autorizado = false; },
    h => { h.state.perfil = 'visitante'; },
    h => { h.state.perfil = 'associado'; h.state.bloqueado = true; },
    h => { h.state.perfil = 'associado'; h.state.equipeUsuario = 'Equipe B'; },
    h => { h.state.equipesAtivas = ['Equipe B']; },
    h => { h.state.times = { c1: ['Equipe B'] }; },
    h => { h.state.equipes = [{ id: 'e2', nome: 'Equipe B' }]; },
    h => { h.state.campeonatos = h.state.campeonatos.filter(item => item.id !== 'c1'); }
  ]) {
    const h = seeded(op);
    h.state.onLock = () => change(h);
    assert.throws(() => invoke(h, op));
    assert.equal(h.writes.length, 0);
    assert(!h.locked());
  }
  const h = seeded('transfer');
  h.state.onLock = () => { h.state.perfil = 'associado'; };
  assert.throws(() => invoke(h, 'transfer'), /Somente admin/);
  assert.equal(h.writes.length, 0);
});

test('alvo removido ou movido durante a espera e ID desconhecido nao alteram historico', () => {
  for (const op of operations) for (const records of [[], [person(tipoOf(op), { timeVinculado: 'Equipe B' })]]) {
    const h = seeded(op);
    h.state.onLock = () => h.seed('c1', tipoOf(op), records);
    assert.throws(() => invoke(h, op), /não pertence/);
    assert.equal(h.writes.length, 0);
    assert(!h.locked());
  }
  for (const op of operations) for (const extra of [
    { campeonatoId: 'missing' }, { equipeId: 'missing' }, { registroId: 'missing' }
  ]) {
    const h = seeded(op);
    assert.throws(() => invoke(h, op, extra));
    assert.equal(h.writes.length, 0);
  }
});

test('transferencia rejeita destino igual, desconhecido, excluido, inativo ou nao vinculado', () => {
  for (const change of [
    h => { h.state.equipesAtivas = ['Equipe A']; },
    h => { h.state.times = { c1: ['Equipe A'] }; },
    h => { h.state.equipes = [{ id: 'e1', nome: 'Equipe A' }]; }
  ]) {
    const h = seeded('transfer');
    h.state.onLock = () => change(h);
    assert.throws(() => invoke(h, 'transfer'), /destino/);
    assert.equal(h.writes.length, 0);
  }
  for (const equipeDestinoId of ['e1', 'missing']) {
    const h = seeded('transfer');
    assert.throws(() => invoke(h, 'transfer', { equipeDestinoId }));
    assert.equal(h.writes.length, 0);
  }
});

test('bloqueios preservam excecao admin/diretoria; associado so remove no proprio elenco desbloqueado', () => {
  for (const op of operations) for (const perfil of ['admin', 'diretoria']) {
    const h = seeded(op);
    h.state.perfil = perfil;
    h.c.lerBloqueiosElenco_ = () => {
      assert(h.locked());
      return ['e1', 'e2'].map(equipeId => ({ campeonatoId: 'c1', equipeId, bloqueado: true }));
    };
    const result = invoke(h, op);
    assert.equal(result.bloqueado, true);
    assert.equal(result.podeEditar, true);
  }
  for (const tipo of ['atletas', 'comissao']) {
    const h = seeded(tipo);
    h.state.perfil = 'associado';
    const result = invoke(h, tipo);
    assert.equal(result.podeBloquear, false);
    assert.equal(result.podeTransferir, false);
    assert.equal(result.linkInscricao, '');
    assert.equal(result.equipesDestinoTransferencia.length, 0);
  }
});

test('falha da leitura, reconciliacao ou persistencia previa impede escrita destrutiva', () => {
  for (const op of operations) for (const setup of [
    h => { h.files.set(historyFile, '{bad'); },
    h => { h.state.failCreate = historyFile; },
    h => { h.state.failHistory = true; h.files.set(historyFile,
      JSON.stringify({ versao: 1, sequencia: 0, participacoes: [], inscricoes: [] })); },
    h => { h.state.failRead = rosterFile('c2', 'atletas'); },
    h => { h.c.reconciliarHistoricoCampeonato_ = () => { throw Error('reconciliation failure'); }; }
  ]) {
    const h = seeded(op);
    setup(h);
    const before = JSON.stringify(h.roster('c1', tipoOf(op)));
    assert.throws(() => invoke(h, op));
    assert.equal(JSON.stringify(h.roster('c1', tipoOf(op))), before);
    assert(!h.writes.includes(rosterFile('c1', tipoOf(op))));
    assert(!h.locked());
  }
});

test('falha do elenco e falha pos-historico preservam original e recuperacao global sem duplicatas', () => {
  for (const op of operations) for (const post of [false, true]) {
    const h = seeded(op);
    if (post) h.state.onRoster = () => { h.state.failHistory = true; };
    else h.state.failRoster = true;
    assert.throws(() => invoke(h, op), post ? /elenco foi salvo.*histórico não foi atualizado/
      : /Não foi possível confirmar a gravação/);
    const original = assertOriginal(h, op);
    assert.equal(original.presente, true);
    assert(!h.locked());
    h.state.failHistory = h.state.failRoster = false;
    h.state.onRoster = null;
    const lock = h.c.LockService.getScriptLock();
    lock.waitLock();
    try {
      h.c.prepararHistoricoElenco_({});
      const recovered = assertOriginal(h, op);
      assert.equal(recovered.presente, !post);
      assert.equal(recovered.inscritoEm, original.inscritoEm);
      assert.equal(JSON.stringify(recovered.dados), JSON.stringify(original.dados));
      assert.equal(entries(h, op).length, post && op === 'transfer' ? 2 : 1);
      const before = JSON.stringify(h.history());
      h.c.prepararHistoricoElenco_({});
      assert.equal(JSON.stringify(h.history()), before);
    } finally { lock.releaseLock(); }
  }
});

test('historico preexistente e inscricoes ausentes nao duplicam nem perdem snapshot original', () => {
  for (const op of operations) {
    const h = seeded(op);
    const lock = h.c.LockService.getScriptLock();
    lock.waitLock();
    h.c.prepararHistoricoElenco_({});
    lock.releaseLock();
    const old = assertOriginal(h, op);
    const hist = h.history();
    hist.inscricoes.push({ ...old, id: 'absent', registroId: 'absent', campeonatoId: 'removed',
      presente: true, dados: { ...old.dados, foto: 'absent-photo' } });
    h.files.set(historyFile, JSON.stringify(hist));
    invoke(h, op);
    assert.equal(entries(h, op).length, op === 'transfer' ? 2 : 1);
    const current = assertOriginal(h, op);
    assert.equal(current.inscritoEm, old.inscritoEm);
    assert.equal(current.sequencia, old.sequencia);
    const absent = h.history().inscricoes.find(item => item.id === 'absent');
    assert.equal(absent.presente, false);
    assert.equal(absent.dados.foto, 'absent-photo');
  }
});

test('recursos e jogos sao locais; alteracao externa e falha de resposta nao viram sucesso', () => {
  for (const op of operations) {
    const h = seeded(op);
    invoke(h, op);
    h.seed('c1', tipoOf(op), [person(tipoOf(op))]);
    h.state.perfil = 'associado';
    h.state.bloqueado = true;
    const writes = h.writes.length;
    assert.throws(() => invoke(h, op));
    assert.equal(h.writes.length, writes);
    assert(!h.locked());
    const failed = seeded(op);
    failed.c.montarRespostaElenco_ = () => { throw Error('response failure'); };
    assert.throws(() => invoke(failed, op), /response failure/);
    assert.equal(assertOriginal(failed, op).presente, false);
    assert(!failed.locked());
  }
});

test('cache ID quente reutiliza handles sem guardar conteudo ou pular validacao', () => {
  for (const op of operations) {
    const h = seeded(op, source, { cache: true });
    h.useRealContextFiles();
    invoke(h, op);
    h.seed('c1', tipoOf(op), [person(tipoOf(op))]);
    h.io.length = h.logs.length = 0;
    invoke(h, op);
    assert.equal(h.io.filter(item => item.operacao === 'lookup').length, 0);
    for (const name of [rosterFile('c1', tipoOf(op)), historyFile]) {
      assert.equal(h.io.filter(item => item.operacao === 'read' && item.name === name).length, 1);
    }
    assert(h.logs.some(log => log.resultado === 'acerto'));
    for (const cache of h.caches.values()) for (const value of cache.values()) assert.match(value, /^drive\d+$/);
    h.seed('c1', tipoOf(op), [person(tipoOf(op))]);
    h.state.perfil = 'associado';
    h.files.set('AEUV - Bloqueios de Elenco.json', JSON.stringify([
      { campeonatoId: 'c1', equipeId: 'e1', bloqueado: true }
    ]));
    const before = h.writes.length;
    assert.throws(() => invoke(h, op));
    assert.equal(h.writes.length, before);
  }
});

test('metricas desligadas e cache indisponivel nao mudam dados, IO ou regras', () => {
  const disabled = source.replace('const CADASTRO_METRICAS_ATIVAS = true;',
    'const CADASTRO_METRICAS_ATIVAS = false;');
  for (const op of operations) {
    const enabled = seeded(op), off = seeded(op, disabled);
    off.c.bytesUtf8Cadastro_ = () => { throw Error('size calculation forbidden'); };
    assert.equal(JSON.stringify(invoke(enabled, op)), JSON.stringify(invoke(off, op)));
    assert.equal(JSON.stringify(enabled.history()), JSON.stringify(off.history()));
    assert.deepEqual(enabled.io, off.io);
    assert.equal(off.logs.length, 0);
    for (const key of ['failCacheService', 'failCacheGet', 'failCachePut']) {
      const h = seeded(op, source, { cache: true });
      h.state[key] = true;
      invoke(h, op);
      assert.equal(JSON.stringify(h.history()), JSON.stringify(off.history()));
    }
    for (const log of enabled.logs) {
      for (const key of Object.keys(log)) assert(['metrica', 'fase', 'categoria', 'duracaoMs',
        'direcao', 'origem', 'bytesJson', 'registros', 'participacoes', 'inscricoes', 'resultado'].includes(key), key);
      const text = JSON.stringify(log);
      for (const secret of ['Carlos', 'Mariana', '52998224725', '11144477735', 'Equipe A',
        'Equipe B', 'old-photo', 'uuid-', 'drive000']) assert(!text.includes(secret), secret);
    }
  }
});

test('endpoints legados mantem agregado, restricao admin/diretoria e participante protegido', () => {
  for (const tipo of ['atletas', 'comissao']) {
    const run = h => (tipo === 'atletas' ? h.c.removerAtletaCampeonato : h.c.removerMembroComissao)(
      'c1', person(tipo).id);
    for (const perfil of ['admin', 'diretoria']) {
      const h = seeded(tipo);
      h.state.perfil = perfil;
      const result = run(h);
      assert.equal(result.registros.length, 2);
      assert.equal(result.registros.find(item => item.campeonatoId === 'c1')[tipo].length, 0);
      assert.equal(assertOriginal(h, tipo).presente, false);
    }
    const denied = seeded(tipo);
    denied.state.perfil = 'associado';
    assert.throws(() => run(denied), /permissão/);
    assert.equal(denied.counts.locks, 0);
    const revoked = seeded(tipo);
    revoked.state.onLock = () => { revoked.state.perfil = 'associado'; };
    assert.throws(() => run(revoked), /permissão/);
    assert.equal(revoked.writes.length, 0);
    if (tipo === 'atletas') {
      const h = seeded(tipo);
      h.state.jogos = [participation(person(tipo, { id: 'another' }))];
      assert.throws(() => run(h), /não pode ser removido/);
      assert.equal(h.writes.length, 0);
    }
  }
});

test('mutacoes preservam CPF e nao introduzem novas regras de saneamento de duplicatas legadas', () => {
  // Transfer/removal never accepted a replacement CPF and never validated cross-category uniqueness.
  // Save's duplicate rules remain covered by save.test.cjs.
  for (const op of operations) {
    const h = seeded(op);
    const tipo = tipoOf(op), other = tipo === 'atletas' ? 'comissao' : 'atletas';
    h.seed('c1', other, [person(other, { cpf: person(tipo).cpf, timeVinculado: 'Equipe B' })]);
    invoke(h, op, { cpf: '111.111.111-11', campeonatoId: ' c1 ', equipeId: ' e1 ',
      registroId: ` ${person(tipo).id} `, equipeDestinoId: ' e2 ' });
    assert.equal(assertOriginal(h, op).dados.cpf, person(tipo).cpf);
    assert.equal(h.roster('c1', other)[0].cpf, person(tipo).cpf);
  }
});

test('resposta anota atletas restantes com jogos ja lidos sem persistir campos derivados', () => {
  for (const op of operations) {
    const h = seeded(op);
    const remaining = person('atletas', { id: 'remaining', cpf: '39053344705' });
    h.seed('c1', 'atletas', op === 'comissao' ? [remaining] : [person('atletas'), remaining]);
    h.state.jogos = [participation(remaining)];
    const games = JSON.stringify(h.state.jogos);
    const result = invoke(h, op);
    const atleta = result.registros[0].atletas.find(item => item.id === 'remaining');
    assert.equal(atleta.participouCompeticao, true);
    assert.equal(atleta.podeRemover, false);
    assert.match(atleta.motivoTransferencia, /não pode ser transferido/);
    assert.equal(h.counts.tables, 1);
    assert.equal(JSON.stringify(h.state.jogos), games);
    assert(h.roster('c1', 'atletas').every(item => !('podeRemover' in item)));
    assert(h.history().inscricoes.every(item => !('podeRemover' in item.dados)));
  }
});

test('frontend consome resposta completa na mesma RPC sem consulta adicional de elenco', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
  const transfer = html.slice(html.indexOf('function abrirFormularioTransferenciaAtleta_('),
    html.indexOf('function permitirEdicaoElenco_('));
  const remove = html.slice(html.indexOf('function executarRemocaoCadastroPessoa_('),
    html.indexOf('function removerMembroComissao('));
  for (const [fragment, method] of [[transfer, 'transferirAtletaElenco'], [remove, 'removerCadastroElenco']]) {
    assert.equal(fragment.split(`.${method}(`).length - 1, 1);
    assert.match(fragment, /cadastroPessoasCampeonato = dados;/);
    assert.match(fragment, /montarElenco\(dados\.recado\);/);
    assert(!fragment.includes('.listarElenco('));
    assert.match(fragment, /withFailureHandler/);
  }
});

test('cache desligado ou arquivo substituido nao reaproveita conteudo nem elimina guardas', () => {
  const noCache = source.replace('const ARQUIVO_ID_CACHE_ATIVO = true;',
    'const ARQUIVO_ID_CACHE_ATIVO = false;');
  for (const op of operations) {
    const h = seeded(op, noCache, { cache: true });
    invoke(h, op);
    assert.equal(h.cacheOps.length, 0);
    assert.equal(h.io.filter(item => item.operacao === 'lookup').length, 5);
    const warm = seeded(op, source, { cache: true });
    invoke(warm, op);
    const replacement = [person(tipoOf(op), { timeVinculado: 'Equipe B' })];
    warm.drive.replace(rosterFile('c1', tipoOf(op)), JSON.stringify(replacement));
    const writes = warm.writes.length;
    assert.throws(() => invoke(warm, op), /não pertence/);
    assert.equal(warm.writes.length, writes);
  }
});

test('guardas recusadas nao migram registro; sucesso mantem migracao global de IDs legados', () => {
  for (const op of operations) {
    const h = seeded(op);
    h.useRealRegistry();
    h.state.equipesAtivas = ['Equipe A', 'Equipe B', 'Equipe C'];
    h.seed('c2', 'comissao', [person('comissao', { id: '', timeVinculado: 'Equipe C' })]);
    assert.throws(() => invoke(h, op, { registroId: 'missing' }), /não pertence/);
    assert.equal(h.writes.length, 0);
    invoke(h, op);
    const registered = JSON.parse(h.files.get(h.registryFile));
    assert(registered.some(item => item.nome === 'Equipe C' && item.id));
    assert(h.roster('c2', 'comissao')[0].id);
    assert(h.history().inscricoes.some(item => item.campeonatoId === 'c2' && item.tipo === 'comissao'));
  }
});
