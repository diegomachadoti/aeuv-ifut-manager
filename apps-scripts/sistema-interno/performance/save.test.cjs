const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, person, participation, historyFile, rosterFile } = require('./save-fixture.cjs');
const fs = require('node:fs');
const path = require('node:path');

test('desligar metricas elimina logs e calculo de tamanho sem mudar persistencia ou erros', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
  assert(source.includes('const CADASTRO_METRICAS_ATIVAS = true;'));
  const disabled = source.replace('const CADASTRO_METRICAS_ATIVAS = true;',
    'const CADASTRO_METRICAS_ATIVAS = false;');
  for (const tipo of ['atletas', 'comissao']) {
    for (const edit of [false, true]) {
      const h = harness(disabled);
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      h.c.bytesUtf8Cadastro_ = () => { throw new Error('Tamanho nao deve ser calculado'); };
      const result = h.c.salvarCadastroElenco(h.payload(tipo, edit));
      assert.equal(h.logs.length, 0);
      assert.equal(result.registros[0][tipo].length, h.roster('c1', tipo).length);
      assert.equal(h.counts.rosters, 2);
      h.c.processarHistoricoElencoAgora();
      assert(h.history().inscricoes.some(item => item.tipo === tipo));
      assert(!h.locked());
    }
  }
  const h = harness(disabled);
  assert.throws(() => h.c.medirFaseCadastro_('teste', () => { throw Error('falha'); }), /falha/);
  assert.throws(() => h.c.medirEtapaCadastro_({}, 'atletas', 'teste',
    () => { throw Error('falha'); }), /falha/);
  assert.equal(h.logs.length, 0);
});

test('totais ponta a ponta medem abrir elenco, salvar e remover pela flag comum', () => {
  const h = harness();
  h.c.listarElenco('c1', 'e1');
  for (const phase of ['listar_elenco_total', 'listar_elenco_espera_lock', 'listar_elenco_montar_resposta']) {
    assert(h.logs.some(log => log.fase === phase), phase);
  }
  const criado = h.c.salvarCadastroElenco(h.payload('atletas'));
  assert(h.logs.some(log => log.fase === 'adicionar_atleta_total'));
  const idAtleta = criado.registros[0].atletas[0].id;
  const payloadEdicao = h.payload('atletas', true);
  payloadEdicao.registroId = idAtleta;
  payloadEdicao.atletaId = idAtleta;
  h.c.salvarCadastroElenco(payloadEdicao);
  assert(h.logs.some(log => log.fase === 'editar_atleta_total'));
  h.c.removerCadastroElenco({
    campeonatoId: 'c1', equipeId: 'e1', tipo: 'atletas', registroId: criado.registros[0].atletas[0].id
  });
  assert(h.logs.some(log => log.fase === 'remover_elenco_total'));
  for (const log of h.logs.filter(item => [
    'listar_elenco_total', 'adicionar_atleta_total', 'editar_atleta_total', 'remover_elenco_total'
  ].includes(item.fase))) {
    assert.deepEqual(Object.keys(log).sort(), ['duracaoMs', 'fase', 'metrica']);
    assert.equal(log.metrica, 'cadastro_elenco');
    assert(Number.isFinite(log.duracaoMs) && log.duracaoMs >= 0);
    assert(!JSON.stringify(log).includes('Equipe A'));
  }
});

for (const tipo of ['atletas', 'comissao']) {
  for (const edit of [false, true]) {
    test(`${tipo} ${edit ? 'edicao' : 'criacao'} reduz leituras e responde com dados persistidos`, () => {
      const h = harness();
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      h.seed('c2', 'atletas', [person('atletas', { id: 'legacy', cpf: '123', foto: 'old-photo' })]);
      const result = h.c.salvarCadastroElenco(h.payload(tipo, edit));
      // The target championship's rosters are reused by validation and its history snapshot.
      assert.equal(h.counts.rosters, 2);
      assert.equal(h.counts.equipes, 1); // Previously 2: pre-lock + under-lock.
      assert.equal(h.counts.campeonatos, 1); // Only the fresh under-lock context.
      assert.equal(h.counts.sessoes, 2); // Authorization: pre-lock + under lock, never reused.
      assert.equal(h.counts.bloqueios, 1); // Previously validation + response.
      assert.equal(h.counts.times, 1); // Only the current championship membership is needed.
      assert.equal(h.counts.tables, tipo === 'atletas' ? 1 : 0); // Athlete creation previously 2.
      assert.equal(h.counts.locks, 1); // Previously save + response locks.
      assert.equal(h.counts.history, 0); // No read when the global history file does not exist yet.
      assert.equal(JSON.stringify(result.registros[0][tipo].map(({ participouCompeticao, podeRemover,
        motivoRemocao, motivoTransferencia, ...item }) => item)),
      JSON.stringify(h.roster('c1', tipo)));
      assert(!h.history().inscricoes.some(item => item.campeonatoId === 'c2'));
      assert(!h.history().inscricoes.some(item => 'participouCompeticao' in item.dados));
      assert(!h.locked());
      const phases = ['espera_lock', 'validacao_leitura', 'preparacao_historico',
        'gravacao_elenco', 'gravacao_historico', 'resposta', 'pre_lock_autorizacao',
        'lock_autorizacao', 'lock_vinculo', 'lock_bloqueio', 'lock_elenco_leitura', 'lock_cpf_categorias',
        'resposta_destinos', 'lock_equipes_registro', 'lock_equipes_ativas', 'lock_equipe_acesso',
        'lock_campeonatos', 'lock_campeonato_alvo', 'lock_times', 'lock_vinculo_validacao',
        'lock_bloqueio_leitura', 'lock_bloqueio_consulta',
        'lock_autorizacao_identificar', 'lock_autorizacao_perfil'];
      if (tipo === 'atletas') phases.push(edit ? 'resposta_participacao' : 'lock_participacao');
      for (const phase of phases) assert(h.logs.some(log => log.fase === phase), phase);
      assert(!h.logs.some(log => log.fase === 'pre_lock_vinculo'));
      assert.deepEqual(h.reads.filter(read => !read.locked).map(read => read.recurso), ['autorizacao']);
      for (const recurso of ['autorizacao', 'equipes', 'ativas', 'campeonatos', 'times', 'bloqueios', 'drive']) {
        assert(h.reads.some(read => read.locked && read.recurso === recurso), recurso);
      }
      for (const log of h.logs.filter(item => item.metrica === 'cadastro_elenco')) {
        const fields = log.fase === 'tamanho_json'
          ? ['metrica', 'fase', 'categoria', 'direcao', 'origem', 'bytesJson',
            ...(log.categoria === 'historico' ? ['participacoes', 'inscricoes'] : ['registros'])]
          : ['duracaoMs', 'fase', 'metrica', ...(log.categoria ? ['categoria'] : [])];
        assert.deepEqual(Object.keys(log).sort(), fields.sort());
        assert.equal(log.metrica, 'cadastro_elenco');
        if (log.fase !== 'tamanho_json') assert(Number.isFinite(log.duracaoMs) && log.duracaoMs >= 0);
      }
    });
  }
}

test('permissao, vinculo e bloqueio sao revalidados depois da espera do lock', () => {
  for (const tipo of ['atletas', 'comissao']) {
    for (const edit of [false, true]) for (const revoke of [
      h => { h.state.autorizado = false; },
      h => { h.state.perfil = 'visitante'; },
      h => { h.state.perfil = 'associado'; h.state.bloqueado = true; },
      h => { h.state.perfil = 'associado'; h.state.equipeUsuario = 'Equipe B'; },
      h => { h.state.equipesAtivas = ['Equipe B']; },
      h => { h.state.times = { c1: ['Equipe B'] }; },
      h => { h.state.equipes = [{ id: 'e2', nome: 'Equipe B' }]; },
      h => { h.state.campeonatos = h.state.campeonatos.filter(item => item.id !== 'c1'); }
    ]) {
      const h = harness();
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      h.state.onLock = () => revoke(h);
      assert.throws(() => h.c.salvarCadastroElenco(h.payload(tipo, edit)));
      assert.equal(h.writes.length, 0);
      assert(!h.locked());
    }
    const h = harness();
    h.seed('c1', tipo, [person(tipo, { timeVinculado: 'Equipe B' })]);
    assert.throws(() => h.c.salvarCadastroElenco(h.payload(tipo, true)), /não pertence/);
    assert.equal(h.writes.length, 0);
  }
});

test('IDs malformados e guardas baratas falham antes do lock sem consultar vinculo', () => {
  for (const tipo of ['atletas', 'comissao']) {
    for (const edit of [false, true]) for (const change of [
      { campeonatoId: '' }, { campeonatoId: [] }, { campeonatoId: { id: 'c1' } },
      { equipeId: null }, { equipeId: 1 }, { equipeId: ['e1'] },
      { registroId: {} }, { registroId: 123 }, { tipo: 'invalido' },
      { nome: '' }, { cpf: '123' }, { dataNascimento: 'bad-date' },
      ...(tipo === 'atletas' ? [{ posicao: 'bad-position' }, { numero: 100 }] : []),
      ...(!edit ? [{ foto: '' }, ...(tipo === 'comissao' ? [{ cargo: 'bad-role' }] : [])] : [])
    ]) {
      const h = harness();
      assert.throws(() => h.c.salvarCadastroElenco({ ...h.payload(tipo, edit), ...change }));
      assert.equal(h.counts.locks, 0);
      assert.equal(h.writes.length, 0);
      assert.deepEqual(h.reads.map(read => read.recurso), ['autorizacao']);
    }
    for (const state of [{ autorizado: false }, { perfil: 'visitante' }]) {
      const h = harness();
      Object.assign(h.state, state);
      assert.throws(() => h.c.salvarCadastroElenco(h.payload(tipo)), /permissão/);
      assert.equal(h.counts.locks, 0);
      assert.deepEqual(h.reads.map(read => read.recurso), ['autorizacao']);
    }
  }
});

test('IDs inexistentes e cadastro removido ou transferido durante espera nao permitem escrita', () => {
  for (const tipo of ['atletas', 'comissao']) {
    for (const edit of [false, true]) for (const change of [
      { campeonatoId: 'missing' }, { equipeId: 'missing' },
      ...(edit ? [{ registroId: 'missing' }] : [])
    ]) {
      const h = harness();
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      assert.throws(() => h.c.salvarCadastroElenco({ ...h.payload(tipo, edit), ...change }));
      assert.equal(h.counts.locks, 1);
      assert.equal(h.writes.length, 0);
      assert(!h.locked());
      assert.deepEqual(h.reads.filter(read => !read.locked).map(read => read.recurso), ['autorizacao']);
    }
    for (const records of [[], [person(tipo, { timeVinculado: 'Equipe B' })]]) {
      const h = harness();
      h.seed('c1', tipo, [person(tipo)]);
      h.state.onLock = () => h.seed('c1', tipo, records);
      assert.throws(() => h.c.salvarCadastroElenco(h.payload(tipo, true)), /não pertence/);
      assert.equal(h.writes.length, 0);
      assert(!h.locked());
    }
  }
});

test('time e IDs de escrita vem apenas do alvo autorizado, nunca de campos injetados', () => {
  for (const tipo of ['atletas', 'comissao']) for (const edit of [false, true]) {
    for (const perfil of ['admin', 'associado']) {
      const h = harness();
      h.state.perfil = perfil;
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      const payload = { ...h.payload(tipo, edit), campeonatoId: ' c1 ', equipeId: ' e1 ',
        timeVinculado: 'Equipe B', id: 'injected', atletaId: 'injected', membroId: 'injected',
        contexto: { campeonato: { id: 'c2' }, equipe: { nome: 'Equipe B' } },
        solicitacaoElenco: { campeonatoId: 'c2', equipeId: 'e2' } };
      h.c.salvarCadastroElenco(payload);
      const saved = h.roster('c1', tipo)[0];
      assert.equal(saved.timeVinculado, 'Equipe A');
      assert.equal(saved.id, edit ? person(tipo).id : 'uuid-1');
      assert.equal(h.roster('c2', tipo).length, 0);
      assert.equal(payload.timeVinculado, 'Equipe B'); // Do not mutate the caller's payload.
    }
    const denied = harness();
    denied.state.perfil = 'associado';
    assert.throws(() => denied.c.salvarCadastroElenco({
      ...denied.payload(tipo, edit), equipeId: 'e2', timeVinculado: 'Equipe A'
    }), /seu acesso/);
    assert.equal(denied.writes.length, 0);
  }
});

test('despacho leva so IDs nao confiaveis; historico e resposta recebem contexto autorizado sob lock', () => {
  for (const tipo of ['atletas', 'comissao']) for (const edit of [false, true]) {
    const h = harness();
    if (edit) h.seed('c1', tipo, [person(tipo)]);
    const endpoint = tipo === 'atletas'
      ? (edit ? 'atualizarAtletaCampeonatoInterno_' : 'salvarAtletaCampeonatoInterno_')
      : (edit ? 'atualizarMembroComissaoInterno_' : 'salvarMembroComissaoInterno_');
    const dispatch = h.c[endpoint], history = h.c.prepararHistoricoElenco_, response = h.c.montarRespostaElenco_;
    let dispatched = false, prepared = false, responded = false;
    h.c[endpoint] = (dados, contexto, solicitacao) => {
      dispatched = true;
      assert.equal(contexto, null);
      assert.deepEqual(Object.keys(solicitacao).sort(), ['campeonatoId', 'equipeId']);
      assert.equal(solicitacao.campeonatoId, 'c1');
      assert.equal(solicitacao.equipeId, 'e1');
      assert(!('timeVinculado' in dados));
      assert.equal(h.writes.length, 0);
      assert(!h.locked());
      return dispatch(dados, contexto, solicitacao);
    };
    h.state.onLock = () => {
      assert.deepEqual(h.reads.map(read => read.recurso), ['autorizacao']);
      h.state.perfil = 'associado';
    };
    h.c.prepararHistoricoElenco_ = (cache, recursos) => {
      prepared = true;
      assert(h.locked());
      assert.equal(h.writes.length, 0);
      assert.equal(recursos.contexto.sessao.usuario.perfil, 'associado');
      assert.equal(recursos.contexto.equipe.nome, 'Equipe A');
      assert.equal(recursos.contexto.campeonato.id, 'c1');
      assert(h.logs.some(log => log.fase === 'lock_cpf_categorias'));
      assert(h.logs.some(log => log.fase === 'lock_bloqueio'));
      return history(cache, recursos);
    };
    h.c.montarRespostaElenco_ = (contexto, listas, recursos) => {
      responded = true;
      assert(h.locked());
      assert.equal(contexto, recursos.contexto);
      assert.equal(contexto.sessao.usuario.perfil, 'associado');
      return response(contexto, listas, recursos);
    };
    const result = h.c.salvarCadastroElenco(h.payload(tipo, edit));
    assert(dispatched && prepared && responded);
    assert.equal(result.podeTransferir, false);
    assert.equal(result.podeEditar, true);
  }
});

test('registro real nao migra equipes antes das guardas; sucesso preserva migracao global sob lock', () => {
  for (const tipo of ['atletas', 'comissao']) for (const edit of [false, true]) {
    for (const failure of ['team', 'championship', 'block', 'ownership', 'duplicate', 'cross-category', 'participation']) {
      if (!edit && failure === 'ownership') continue;
      if (tipo === 'comissao' && failure === 'participation') continue;
      const h = harness(), payload = h.payload(tipo, edit);
      h.useRealRegistry();
      // An unrelated active team needs registry migration, but refused requests must not write it.
      h.state.equipesAtivas = ['Equipe A', 'Equipe B', 'Equipe Nova'];
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      if (failure === 'team') payload.equipeId = 'missing';
      if (failure === 'championship') payload.campeonatoId = 'missing';
      if (failure === 'block') { h.state.perfil = 'associado'; h.state.bloqueado = true; }
      if (failure === 'ownership') h.seed('c1', tipo, [person(tipo, { timeVinculado: 'Equipe B' })]);
      if (failure === 'duplicate') h.seed('c1', tipo, [
        ...(edit ? [person(tipo)] : []), person(tipo, { id: 'duplicate' })
      ]);
      if (failure === 'cross-category') h.seed('c1', tipo === 'atletas' ? 'comissao' : 'atletas', [
        person(tipo, { id: 'cross-category' })
      ]);
      if (failure === 'participation') {
        h.state.jogos = [participation(person('atletas', edit ? { cpf: '39053344705' } : {}), 'e2')];
        if (edit) payload.cpf = '39053344705';
      }
      assert.throws(() => h.c.salvarCadastroElenco(payload));
      assert.equal(h.writes.length, 0, `${tipo}/${edit}/${failure}`);
      assert.equal(JSON.parse(h.files.get(h.registryFile)).length, 2);
      assert(!h.locked());
    }
    const h = harness();
    h.useRealRegistry();
    h.state.equipesAtivas = ['Equipe A', 'Equipe B', 'Equipe Nova'];
    if (edit) h.seed('c1', tipo, [person(tipo)]);
    const writeRegistry = h.c.gravarRegistroEquipes_;
    h.c.gravarRegistroEquipes_ = registros => {
      assert(h.locked());
      assert.equal(h.writes.length, 0);
      for (const fase of ['lock_autorizacao', 'lock_vinculo', 'lock_bloqueio', 'lock_elenco_leitura', 'lock_cpf_categorias']) {
        assert(h.logs.some(log => log.fase === fase), fase);
      }
      writeRegistry(registros);
    };
    h.c.salvarCadastroElenco(h.payload(tipo, edit));
    const nova = JSON.parse(h.files.get(h.registryFile)).find(item => item.nome === 'Equipe Nova');
    assert(nova && nova.id);
    assert.equal(h.roster('c1', tipo)[0].timeVinculado, 'Equipe A');
    assert.deepEqual(h.reads.filter(read => !read.locked).map(read => read.recurso), ['autorizacao']);
    h.c.processarHistoricoElencoAgora();
    assert(h.history().inscricoes.some(item => item.campeonatoId === 'c1' && item.tipo === tipo && item.presente));
    assert(!h.locked());
  }
});

test('criacao usa nome de equipe fresco sob lock e edicao rejeita propriedade desatualizada', () => {
  for (const tipo of ['atletas', 'comissao']) for (const edit of [false, true]) {
    const h = harness();
    h.state.perfil = 'associado';
    if (edit) h.seed('c1', tipo, [person(tipo)]);
    h.state.onLock = () => {
      h.state.equipes[0].nome = 'Equipe Renomeada';
      h.state.equipeUsuario = 'Equipe Renomeada';
    };
    if (edit) {
      assert.throws(() => h.c.salvarCadastroElenco(h.payload(tipo, true)), /não pertence/);
      assert.equal(h.writes.length, 0);
    } else {
      const response = h.c.salvarCadastroElenco(h.payload(tipo));
      assert.equal(h.roster('c1', tipo)[0].timeVinculado, 'Equipe Renomeada');
      assert.equal(response.registros[0][tipo][0].timeVinculado, 'Equipe Renomeada');
    }
    assert(!h.locked());
  }
});

test('CPF de atleta em outra equipe continua protegido para associado com lista fresca sob lock', () => {
  for (const edit of [false, true]) {
    const h = harness();
    h.state.perfil = 'associado';
    if (edit) h.seed('c1', 'atletas', [person('atletas', { cpf: '39053344705' })]);
    h.state.onLock = () => h.seed('c1', 'atletas', [
      ...h.roster('c1', 'atletas'),
      person('atletas', { id: 'other-team', timeVinculado: 'Equipe B' })
    ]);
    assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas', edit)), /cadastrado na equipe Equipe B/);
    assert.equal(h.writes.length, 0);
    assert(!h.locked());
  }
});

test('endpoints legados preservam permissao admin/diretoria e time solicitado', () => {
  for (const tipo of ['atletas', 'comissao']) for (const edit of [false, true]) {
    const endpoint = tipo === 'atletas'
      ? (edit ? 'atualizarAtletaCampeonato' : 'salvarAtletaCampeonato')
      : (edit ? 'atualizarMembroComissao' : 'salvarMembroComissao');
    for (const perfil of ['admin', 'diretoria', 'associado']) {
      const h = harness();
      h.state.perfil = perfil;
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      h.c.listarCadastroPessoasCampeonato = () => {
        h.c.sessaoCampeonato_();
        return { legacy: true };
      };
      const payload = { ...h.payload(tipo, edit), timeVinculado: 'Equipe B',
        atletaId: 'athlete', membroId: 'staff' };
      if (perfil === 'associado') {
        assert.throws(() => h.c[endpoint](payload), /permissão/);
        assert.equal(h.writes.length, 0);
        assert.equal(h.counts.locks, 0);
      } else {
        assert.equal(h.c[endpoint](payload).legacy, true);
        assert.equal(h.roster('c1', tipo)[0].timeVinculado, 'Equipe B');
        assert(h.reads.some(read => !read.locked && read.recurso === 'times'));
      }
    }
  }
});

test('CPF invalido, duplicata, nome similar e CPF entre categorias impedem escrita', () => {
  for (const tipo of ['atletas', 'comissao']) {
    for (const mode of ['cpf', 'same-category', 'name', 'cross-category']) {
      const h = harness(), payload = h.payload(tipo);
      if (mode === 'cpf') payload.cpf = '123';
      else if (mode === 'cross-category') {
        h.seed('c1', tipo === 'atletas' ? 'comissao' : 'atletas', [person(tipo)]);
      } else {
        h.seed('c1', tipo, [person(tipo, mode === 'name' ? { nome: payload.nome, cpf: '123' } : {})]);
      }
      assert.throws(() => h.c.salvarCadastroElenco(payload), /CPF|similar/);
      assert.equal(h.writes.length, 0);
      assert(!h.locked());
    }
  }
});

test('edicao sem foto preserva original e campos opcionais da comissao', () => {
  for (const tipo of ['atletas', 'comissao']) {
    const h = harness();
    h.seed('c1', tipo, [person(tipo)]);
    const payload = h.payload(tipo, true);
    payload.foto = '';
    if (tipo === 'comissao') for (const key of ['rg', 'telefone', 'email']) delete payload[key];
    h.c.salvarCadastroElenco(payload);
    assert.equal(h.roster('c1', tipo)[0].foto, 'photo');
    if (tipo === 'comissao') {
      assert.equal(h.roster('c1', tipo)[0].telefone, 'phone');
      assert.equal(h.roster('c1', tipo)[0].email, 'email');
      assert.equal(h.roster('c1', tipo)[0].rg, 'rg');
    }
  }
});

test('participacao bloqueia CPF/equipe, transferencia e remocao sem alterar snapshots', () => {
  for (const mode of ['cpf', 'team', 'transfer', 'remove']) {
    const h = harness();
    h.seed('c1', 'atletas', [person('atletas')]);
    h.state.jogos = [participation()];
    const before = JSON.stringify(h.state.jogos);
    assert.throws(() => {
      if (mode === 'transfer') return h.c.transferirAtletaElenco({
        campeonatoId: 'c1', equipeId: 'e1', registroId: 'athlete', equipeDestinoId: 'e2'
      });
      if (mode === 'remove') return h.c.removerCadastroElenco({
        campeonatoId: 'c1', equipeId: 'e1', registroId: 'athlete', tipo: 'atletas'
      });
      const payload = h.payload('atletas', true);
      if (mode === 'cpf') payload.cpf = '11144477735';
      else payload.timeVinculado = 'Equipe B';
      // Team is intentionally assigned by salvarCadastroElenco; use the legacy admin endpoint for a team edit.
      return mode === 'team'
        ? h.c.atualizarAtletaCampeonatoInterno_({ ...payload, atletaId: 'athlete' })
        : h.c.salvarCadastroElenco(payload);
    }, /já participou/);
    assert.equal(h.writes.length, 0);
    assert.equal(JSON.stringify(h.state.jogos), before);
    assert(!h.locked());
  }
});

test('novo vinculo por CPF participante em outra equipe e resultado invalido sao recusados', () => {
  for (const invalid of [false, true]) {
    const h = harness();
    h.state.jogos = [participation(person('atletas'), 'e2')];
    if (invalid) h.state.jogos[0].resultado.equipes = [];
    assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), invalid ? /inválido/ : /outra equipe/);
    assert.equal(h.writes.length, 0);
  }
});

test('edicao comum de participante mantem guardas e snapshot na resposta', () => {
  const h = harness();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.state.jogos = [participation()];
  const before = JSON.stringify(h.state.jogos);
  const response = h.c.salvarCadastroElenco({ ...h.payload('atletas', true), numero: 20 });
  assert.equal(response.registros[0].atletas[0].podeRemover, false);
  assert.equal(response.registros[0].atletas[0].participouCompeticao, true);
  assert.equal(JSON.stringify(h.state.jogos), before);
  assert(!('podeRemover' in h.roster('c1', 'atletas')[0]));
});

test('falhas de escrita propagam erro, liberam lock e recuperacao reconcilia todos os campeonatos', () => {
  for (const fail of ['failRoster', 'failHistory']) {
    const h = harness();
    h.seed('c2', 'comissao', [person('comissao', { id: 'other-staff' })]);
    // Bootstrap history so failHistory fails specifically after the successful roster write.
    const lock = h.c.LockService.getScriptLock();
    lock.waitLock();
    h.c.prepararHistoricoElenco_();
    lock.releaseLock();
    h.state.onRoster = () => { if (fail === 'failHistory') h.state.failHistory = true; };
    if (fail === 'failRoster') h.state.failRoster = true;
    if (fail === 'failRoster') {
      assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), /confirmar a gravação/);
    } else {
      h.c.salvarCadastroElenco(h.payload('atletas'));
      assert.throws(() => h.c.processarHistoricoElencoAgora(), /pendências foram preservadas/);
    }
    assert(!h.locked());
    h.state.failRoster = h.state.failHistory = false;
    h.state.onRoster = null;
    h.c.processarHistoricoElencoAgora();
    assert(h.history().inscricoes.some(item => item.campeonatoId === 'c2' && item.presente));
    assert.equal(h.history().inscricoes.some(item => item.campeonatoId === 'c1' && item.presente),
      fail === 'failHistory');
    assert.equal(h.logs.some(log => log.fase === 'resposta'), fail === 'failHistory');
  }
});

test('historico invalido impede escrita e migracao global de IDs permanece ativa', () => {
  const bad = harness();
  bad.files.set(historyFile, '{bad');
  assert.throws(() => bad.c.salvarCadastroElenco(bad.payload('atletas')), /Histórico/);
  assert.equal(bad.writes.length, 0);
  assert(!bad.locked());
  const h = harness();
  h.seed('c2', 'atletas', [person('atletas', { id: '', foto: 'legacy-photo', custom: 'legacy-field' })]);
  h.c.salvarCadastroElenco(h.payload('comissao'));
  assert.equal(h.roster('c2', 'atletas')[0].id, '',
    'routine save no longer migrates unrelated championships');
  const lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  h.c.prepararHistoricoElenco_();
  lock.releaseLock();
  assert(h.roster('c2', 'atletas')[0].id);
  assert.equal(h.roster('c2', 'atletas')[0].custom, 'legacy-field');
  assert(h.history().inscricoes.some(item => item.campeonatoId === 'c2' && item.dados.foto === 'legacy-photo'));
});

test('recursos nao sobrevivem a requisicoes e resposta ainda valida participacao atual', () => {
  const h = harness();
  h.c.salvarCadastroElenco(h.payload('atletas'));
  const saved = h.roster('c1', 'atletas')[0];
  h.seed('c1', 'atletas', [{ ...saved, foto: 'changed-after-request' }]);
  h.state.jogos = [participation(saved)];
  const response = h.c.salvarCadastroElenco({
    ...h.payload('atletas', true), registroId: saved.id, foto: ''
  });
  assert.equal(response.registros[0].atletas[0].foto, 'changed-after-request');
  assert.equal(response.registros[0].atletas[0].podeRemover, false);
  assert.equal(h.counts.locks, 2);
});

test('reconciliacao global mantem snapshots ausentes e encerra presenca de campeonatos removidos', () => {
  const h = harness();
  h.seed('c2', 'atletas', [person('atletas', { id: 'old-registration', foto: 'historic-photo' })]);
  h.c.salvarCadastroElenco(h.payload('comissao'));
  const lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  h.c.prepararHistoricoElenco_();
  lock.releaseLock();
  h.state.campeonatos = h.state.campeonatos.filter(item => item.id !== 'c2');
  h.c.salvarCadastroElenco(h.payload('atletas'));
  lock.waitLock();
  h.c.prepararHistoricoElenco_();
  lock.releaseLock();
  const retained = h.history().inscricoes.find(item => item.registroId === 'old-registration');
  assert(retained);
  assert.equal(retained.presente, false);
  assert.equal(retained.dados.foto, 'historic-photo');
});

test('falha na reconciliacao previa impede gravacao do elenco; falha na resposta nao fica oculta', () => {
  const before = harness();
  before.state.failHistory = true;
  assert.throws(() => before.c.salvarCadastroElenco(before.payload('comissao')), /history failure/);
  assert.equal(before.roster('c1', 'comissao').length, 0);
  assert(!before.locked());
  // Staff creation does not read games during validation, so the response performs the first read.
  const after = harness();
  after.seed('c1', 'atletas', [person('atletas')]);
  after.state.onRoster = () => { after.state.jogos = [{
    id: 'invalid-game', status: 'encerrado', resultado: {}
  }]; };
  assert.throws(() => after.c.salvarCadastroElenco(after.payload('comissao')), /inválido/);
  assert.equal(after.roster('c1', 'comissao').length, 1);
  after.c.processarHistoricoElencoAgora();
  assert(after.history().inscricoes.some(item => item.campeonatoId === 'c1' && item.tipo === 'comissao'
    && item.presente));
  assert(!after.locked());
  assert(after.logs.some(log => log.fase === 'resposta'));
});

test('recursos sob lock substituem leituras anteriores ao lock e chegam frescos a resposta', () => {
  const h = harness();
  h.seed('c1', 'atletas', [person('atletas', { id: 'existing', cpf: '39053344705', nome: 'Outro Atleta' })]);
  h.state.onLock = () => {
    h.state.campeonatos[0].nome = 'Renomeado';
    h.state.bloqueado = true; // Admin may still edit, but the response must report the fresh lock state.
    h.state.jogos = [participation(person('atletas', { id: 'existing', cpf: '39053344705' }))];
  };
  const response = h.c.salvarCadastroElenco(h.payload('atletas'));
  assert.equal(response.registros[0].campeonatoNome, 'Renomeado');
  assert.equal(response.bloqueado, true);
  assert.equal(response.registros[0].atletas.find(item => item.id === 'existing').podeRemover, false);
  assert.equal(h.counts.bloqueios, 1);
  assert.equal(h.counts.tables, 1);
});

test('jogo com participacao incluido antes do lock bloqueia nova inscricao por CPF', () => {
  const h = harness();
  h.state.onLock = () => { h.state.jogos = [participation(person('atletas'), 'e2')]; };
  assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), /outra equipe/);
  assert.equal(h.writes.length, 0);
  assert.equal(h.counts.registro, 0); // Team names come from the registry re-read under this lock.
});

test('edicao com troca de CPF le jogos uma vez e mantem guardas de participacao', () => {
  const h = harness();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.state.jogos = [participation(person('atletas', { id: 'x', cpf: '39053344705' }))];
  h.c.salvarCadastroElenco({ ...h.payload('atletas', true), cpf: '39053344705' });
  assert.equal(h.counts.tables, 1); // Previously validation + response.
  assert.equal(h.counts.campeonatos, 1); // Previously 2.
  assert.equal(h.counts.registro, 0); // Previously 1.
  const blocked = harness();
  blocked.seed('c1', 'atletas', [person('atletas')]);
  blocked.state.jogos = [participation(person('atletas', { id: 'x', cpf: '39053344705' }), 'e2')];
  assert.throws(() => blocked.c.salvarCadastroElenco({ ...blocked.payload('atletas', true), cpf: '39053344705' }),
    /outra equipe/);
  assert.equal(blocked.writes.length, 0);
});

test('CPF entre categorias usa a lista atual sob lock', () => {
  for (const tipo of ['atletas', 'comissao']) for (const edit of [false, true]) {
    const h = harness();
    if (edit) h.seed('c1', tipo, [person(tipo)]);
    h.state.onLock = () => h.seed('c1', tipo === 'atletas' ? 'comissao' : 'atletas', [person(tipo, { id: 'other' })]);
    assert.throws(() => h.c.salvarCadastroElenco(h.payload(tipo, edit)), /CPF/);
    assert.equal(h.writes.length, 0);
  }
});

test('resposta so reaproveita recursos do contexto validado sob lock', () => {
  const h = harness();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.state.bloqueado = true;
  h.state.jogos = [participation()];
  const lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  try {
    const contexto = h.c.sessaoElenco_('c1', 'e1', true);
    const forged = { contexto: { ...contexto }, bloqueios: [], jogos: { c1: [] }, times: { c1: [] } };
    const response = h.c.montarRespostaElenco_(contexto, null, forged);
    assert.equal(response.bloqueado, true);
    assert.equal(response.registros[0].atletas[0].podeRemover, false);
    assert.equal(response.equipesDestinoTransferencia.length, 1);
    assert.equal(h.counts.bloqueios, 1);
    assert.equal(h.counts.tables, 1);
  } finally { lock.releaseLock(); }
});

test('logs de fases e tamanhos nao contem dados privados', () => {
  const h = harness();
  h.seed('c1', 'atletas', [person('atletas')]);
  h.c.salvarCadastroElenco({ ...h.payload('atletas', true), cpf: '39053344705' });
  const text = JSON.stringify(h.logs);
  for (const secret of ['Carlos', '52998224725', '39053344705', 'photo', 'athlete', 'c1', 'e1', 'Equipe A']) {
    assert(!text.includes(secret), secret);
  }
  assert(h.logs.some(log => log.fase === 'lock_participacao'));
});

test('tamanhos UTF-8 usam JSON bruto lido e JSON persistido, inclusive Unicode', () => {
  const h = harness();
  const pessoa = person('atletas', { nome: 'João 漢 😀', foto: 'data:image/png;base64,cHJpdmF0ZQ==' });
  const raw = ' \n' + JSON.stringify([pessoa]) + '\n ';
  h.files.set(rosterFile('c1', 'atletas'), raw);
  const historico = { versao: 1, sequencia: 0, participacoes: [], inscricoes: [] };
  const rawHistory = JSON.stringify(historico, null, 2);
  h.files.set(historyFile, rawHistory);
  h.c.salvarCadastroElenco(h.payload('comissao'));
  const sizes = h.logs.filter(log => log.fase === 'tamanho_json');
  assert(sizes.some(log => log.categoria === 'atletas' && log.direcao === 'leitura'
    && log.bytesJson === Buffer.byteLength(raw) && log.registros === 1));
  assert(sizes.some(log => log.categoria === 'historico' && log.direcao === 'leitura'
    && log.bytesJson === Buffer.byteLength(rawHistory) && log.inscricoes === 0 && log.participacoes === 0));
  const historyWrites = sizes.filter(log => log.categoria === 'historico' && log.direcao === 'gravacao');
  assert.equal(historyWrites.at(-1).bytesJson, Buffer.byteLength(h.files.get(historyFile)));
  assert.equal(historyWrites.at(-1).inscricoes, h.history().inscricoes.length);
  const rosterWrite = sizes.find(log => log.categoria === 'comissao' && log.direcao === 'gravacao');
  assert.equal(rosterWrite.bytesJson, Buffer.byteLength(h.files.get(rosterFile('c1', 'comissao'))));
  for (const texto of ['', 'ASCII', 'é漢😀', '\uD800', '\uDC00', '\uD800x', '\uD800\uD800\uDC00']) {
    assert.equal(h.c.bytesUtf8Cadastro_(texto), Buffer.byteLength(texto));
  }
  for (const phase of ['drive_localizar', 'drive_iterar', 'drive_ler', 'drive_setContent',
    'json_parse', 'json_serializar', 'json_comparacao_antes', 'json_comparacao_depois',
    'reconciliacao_memoria', 'historico_marcar_memoria', 'historico_limpar_memoria', 'tamanho_utf8']) {
    assert(h.logs.some(log => log.fase === phase), phase);
  }
  const logs = JSON.stringify(h.logs);
  for (const secret of [pessoa.nome, pessoa.cpf, pessoa.foto, pessoa.id, historyFile, 'c1', 'Equipe A']) {
    assert(!logs.includes(secret), secret);
  }
});

test('instrumentacao nao muda IO, migracao global nem snapshots em criacao e edicao', () => {
  for (const tipo of ['atletas', 'comissao']) for (const edit of [false, true]) {
    const measured = harness(), unmeasured = harness();
    unmeasured.c.medirEtapaCadastro_ = (_recursos, _categoria, _fase, operacao) => operacao();
    unmeasured.c.registrarTamanhoCadastro_ = () => {};
    for (const h of [measured, unmeasured]) {
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      h.seed('c2', 'atletas', [person('atletas', { id: '', cpf: '123', custom: 'preserved' })]);
      h.c.salvarCadastroElenco(h.payload(tipo, edit));
    }
    assert.deepEqual(measured.io, unmeasured.io);
    assert.deepEqual(measured.counts, unmeasured.counts);
    assert.deepEqual(measured.writes, unmeasured.writes);
    assert.equal(measured.counts.rosters, 2);
    assert.equal(measured.roster('c2', 'atletas')[0].custom, 'preserved');
    assert(measured.logs.some(log => log.categoria === tipo && log.direcao === 'gravacao'));
  }
});

test('reconciliacao_memoria exclui acesso Drive e tamanho nao serializa novamente', () => {
  const h = harness(), medir = h.c.medirEtapaCadastro_;
  h.c.medirEtapaCadastro_ = (recursos, categoria, fase, operacao) => {
    if (fase !== 'reconciliacao_memoria') return medir(recursos, categoria, fase, operacao);
    const before = h.io.length;
    const result = medir(recursos, categoria, fase, operacao);
    assert.equal(h.io.length, before);
    return result;
  };
  h.c.salvarCadastroElenco(h.payload('atletas'));
  h.c.JSON = { stringify: () => { throw new Error('extra serialization'); } };
  // Logger must still serialize the generic metric, never the supplied private object.
  h.c.JSON.stringify = value => {
    assert.equal(value.metrica, 'cadastro_elenco');
    return JSON.stringify(value);
  };
  h.c.registrarTamanhoCadastro_({}, 'atletas', 'leitura', 'drive', '[]', []);
});

test('falhas registram duracao da etapa sem payload, sem resposta ou IO adicional', () => {
  for (const [failure, name, phase, pattern] of [
    ['failLookup', rosterFile('c1', 'atletas'), 'drive_localizar', /lookup failure/],
    ['failRead', rosterFile('c1', 'atletas'), 'drive_ler', /read failure/],
    ['failRead', historyFile, 'drive_ler', /Histórico/],
    ['failCreate', historyFile, 'drive_criar', /create failure/],
    ['failRoster', true, 'drive_setContent', /confirmar a gravação/],
    ['failHistory', true, 'drive_criar', /history failure/]
  ]) {
    const h = harness();
    if (failure === 'failRead' && name === historyFile) {
      h.files.set(historyFile, JSON.stringify({ versao: 1, sequencia: 0, participacoes: [], inscricoes: [] }));
    }
    h.state[failure] = name;
    assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), pattern);
    assert(h.logs.some(log => log.fase === phase && Number.isFinite(log.duracaoMs)), phase);
    assert(!h.logs.some(log => log.fase === 'resposta'));
    assert(!JSON.stringify(h.logs).includes('failure'));
    assert(!h.locked());
    const baseline = harness();
    baseline.c.medirEtapaCadastro_ = (_recursos, _categoria, _fase, operacao) => operacao();
    baseline.c.registrarTamanhoCadastro_ = () => {};
    if (failure === 'failRead' && name === historyFile) {
      baseline.files.set(historyFile, JSON.stringify({ versao: 1, sequencia: 0, participacoes: [], inscricoes: [] }));
    }
    baseline.state[failure] = name;
    assert.throws(() => baseline.c.salvarCadastroElenco(baseline.payload('atletas')), pattern);
    assert.deepEqual(h.io, baseline.io);
    assert.deepEqual(h.writes, baseline.writes);
    assert.deepEqual(h.counts, baseline.counts);
  }
  for (const [name, raw, pattern] of [
    [historyFile, '{bad', /Histórico/], [rosterFile('c1', 'atletas'), '{bad', /JSON inválido/],
    [rosterFile('c1', 'atletas'), '{}', /deve ser uma lista/]
  ]) {
    const h = harness();
    h.files.set(name, raw);
    assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), pattern);
    assert(h.logs.some(log => log.fase === 'json_parse'));
    assert.equal(h.writes.length, 0);
    assert(!h.locked());
  }
});

test('leitura legada e criacao de lista sao medidas sem novas leituras e limpeza so apos sucesso', () => {
  for (const fail of [false, true]) {
    const h = harness(), nome = rosterFile('c1', 'atletas'), raw = '[{"nome":"É"}]';
    h.files.delete(nome);
    const legacy = 'legacy';
    let reads = 0, deletes = 0;
    h.c.PropertiesService.getScriptProperties = () => ({
      getProperty: key => {
        reads++;
        return key === legacy ? raw : h.properties.get(key) || null;
      },
      deleteProperty: key => { deletes++; h.properties.delete(key); },
      setProperty: (key, value) => h.properties.set(key, value)
    });
    const lista = h.c.lerListaCadastroDrive_(nome, 'legacy', {}, 'atletas');
    assert.equal(reads, 1);
    assert(h.logs.some(log => log.fase === 'legado_ler'));
    assert(h.logs.some(log => log.fase === 'tamanho_json' && log.origem === 'legado'
      && log.bytesJson === Buffer.byteLength(raw)));
    const lock = h.c.LockService.getScriptLock();
    lock.waitLock();
    try {
      if (fail) h.state.failCreate = nome;
      const write = () =>       h.c.gravarListaCadastroDrive_(nome, legacy, lista, {}, 'atletas');
      if (fail) assert.throws(write, /create failure/);
      else write();
      assert.equal(deletes, fail ? 0 : 1);
      assert(h.logs.some(log => log.fase === 'drive_criar'));
    } finally { lock.releaseLock(); }
  }
});

test('falha na serializacao continua propagada e registra tempo sem escrever', () => {
  const h = harness(), lock = h.c.LockService.getScriptLock();
  const dados = [];
  dados.push(dados);
  lock.waitLock();
  try {
    assert.throws(() => h.c.gravarListaCadastroDrive_(rosterFile('c1', 'atletas'), 'legacy',
      dados, {}, 'atletas'), /circular/i);
    assert(h.logs.some(log => log.fase === 'json_serializar'));
    assert(!h.logs.some(log => log.fase === 'tamanho_json'));
    assert.equal(h.writes.length, 0);
    assert(!h.io.some(item => item.operacao === 'setContent'));
  } finally { lock.releaseLock(); }
});

test('helpers sem recursos continuam silenciosos', () => {
  const h = harness(), lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  try {
    h.c.prepararHistoricoElenco_();
    h.c.lerHistoricoElenco_();
    h.c.lerListaCadastroDrive_(rosterFile('c1', 'atletas'), 'legacy');
    assert.equal(h.logs.length, 0);
  } finally { lock.releaseLock(); }
});

test('handles limitam reconciliacao e escritas ao campeonato alterado sem mudar dados ou regras', () => {
  for (const tipo of ['atletas', 'comissao']) for (const edit of [false, true]) {
    const optimized = harness(), baseline = harness();
    baseline.c.arquivosDriveOperacao_ = () => null;
    for (const h of [optimized, baseline]) {
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      // The unrelated legacy roster must remain untouched during this mutation.
      h.seed('c2', 'atletas', [person('atletas', { id: '', cpf: '123', custom: 'preserved' })]);
      h.c.salvarCadastroElenco(h.payload(tipo, edit));
    }
    const names = [historyFile, ...['c1', 'c2'].flatMap(id =>
      ['atletas', 'comissao'].map(category => rosterFile(id, category)))];
    for (const name of names) {
      for (const operacao of ['lookup', 'hasNext']) {
        const count = h => h.io.filter(item => item.name === name && item.operacao === operacao).length;
        if (name.includes(' - c2 - ')) {
          assert.equal(count(optimized), 0, `${tipo}/${edit}/${name}/${operacao}`);
          assert.equal(count(baseline), 0, `${tipo}/${edit}/${name}/${operacao}`);
        } else {
          assert.equal(count(optimized), 1, `${tipo}/${edit}/${name}/${operacao}`);
          assert.equal(count(baseline), 1 + baseline.writes.filter(item => item === name).length);
        }
      }
    }
    assert.equal(optimized.io.filter(item => item.operacao === 'lookup').length, 3);
    assert.equal(baseline.io.filter(item => item.operacao === 'lookup').length, 5);
    assert.deepEqual(optimized.writes, baseline.writes);
    assert.deepEqual([...optimized.files], [...baseline.files]);
    assert.deepEqual(optimized.counts, baseline.counts);
    assert.equal(optimized.counts.rosters, 2);
    assert.equal(optimized.roster('c2', 'atletas')[0].id, '');
  }
});

test('historico reconciliado reaproveita handles no campeonato alterado', () => {
  for (const tipo of ['atletas', 'comissao']) for (const edit of [false, true]) {
    const optimized = harness(), baseline = harness();
    baseline.c.arquivosDriveOperacao_ = () => null;
    for (const h of [optimized, baseline]) {
      if (edit) h.seed('c1', tipo, [person(tipo)]);
      const lock = h.c.LockService.getScriptLock();
      lock.waitLock();
      try { h.c.prepararHistoricoElenco_(); }
      finally { lock.releaseLock(); }
      h.io.length = h.writes.length = 0;
      h.c.salvarCadastroElenco(h.payload(tipo, edit));
    }
    assert.equal(optimized.io.filter(item => item.operacao === 'lookup').length, 3);
    assert.equal(baseline.io.filter(item => item.operacao === 'lookup').length, 4);
    assert.equal(optimized.io.filter(item => item.operacao === 'hasNext').length, 3);
    assert.equal(baseline.io.filter(item => item.operacao === 'hasNext').length, 4);
    assert.deepEqual(optimized.writes, [rosterFile('c1', tipo)]);
    assert.deepEqual(optimized.writes, baseline.writes);
    assert.deepEqual([...optimized.files], [...baseline.files]);
  }
});

test('ausencia e legado sob lock criam uma vez, retendo handle para segunda escrita', () => {
  for (const raw of [null, '[{"id":"old","nome":"É"}]']) for (const fail of [false, true]) {
    const h = harness(), nome = rosterFile('c1', 'atletas'), chave = 'legacy';
    h.files.delete(nome);
    if (raw !== null) h.properties.set(chave, raw);
    const lock = h.c.LockService.getScriptLock();
    lock.waitLock();
    try {
      const recursos = {};
      h.c.exigirEdicaoElencoPorIds_('c1', 'e1', recursos);
      const lista = h.c.lerListaCadastroDrive_(nome, chave, recursos, 'atletas');
      h.c.descartarElencoBrutoOperacao_('c1', 'atletas', recursos);
      if (fail) h.state.failCreate = nome;
      const write = () => h.c.gravarListaCadastroDrive_(nome, chave, lista, recursos, 'atletas');
      if (fail) {
        assert.throws(write, /create failure/);
        assert.equal(h.properties.has(chave), raw !== null);
        assert.equal(h.files.has(nome), false);
        h.state.failCreate = null;
      }
      write();
      write();
      assert.equal(h.properties.has(chave), false);
      assert.equal(h.io.filter(item => item.name === nome && item.operacao === 'lookup').length, 1);
      assert.equal(h.io.filter(item => item.name === nome && item.operacao === 'hasNext').length, 1);
      assert.equal(h.io.filter(item => item.name === nome && item.operacao === 'create').length, fail ? 2 : 1);
      assert.equal(h.files.get(nome), JSON.stringify(lista));
    } finally { lock.releaseLock(); }
  }
});

test('handles ficam restritos ao contexto validado e sao descartados ao sair da requisicao', () => {
  for (const fail of [false, true]) {
    const h = harness(), prepare = h.c.prepararHistoricoElenco_;
    let retained;
    h.c.prepararHistoricoElenco_ = (cache, recursos) => {
      retained = recursos;
      return prepare(cache, recursos);
    };
    h.state.failRoster = fail;
    if (fail) assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), /confirmar a gravação/);
    else h.c.salvarCadastroElenco(h.payload('atletas'));
    assert(retained && !retained.arquivosDrive);
    assert(!h.locked());
  }
  const h = harness(), recursos = {}, nome = rosterFile('c1', 'atletas');
  // Supplying an arbitrary resources object outside the lock never captures a handle.
  h.c.lerListaCadastroDrive_(nome, 'legacy', recursos, 'atletas');
  assert(!recursos.arquivosDrive);
  const lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  h.c.exigirEdicaoElencoPorIds_('c1', 'e1', recursos);
  h.c.lerListaCadastroDrive_(nome, 'legacy', recursos, 'atletas');
  const previous = recursos.arquivosDrive;
  recursos.contexto = { different: true };
  h.c.lerListaCadastroDrive_(nome, 'legacy', recursos, 'atletas');
  assert(!recursos.arquivosDrive);
  h.c.exigirEdicaoElencoPorIds_('c1', 'e1', recursos);
  assert.notEqual(recursos.arquivosDrive, previous);
  h.c.lerListaCadastroDrive_(nome, 'legacy', recursos, 'atletas');
  lock.releaseLock();
  h.c.lerListaCadastroDrive_(nome, 'legacy', recursos, 'atletas');
  assert(!recursos.arquivosDrive);
  assert.equal(h.io.filter(item => item.name === nome && item.operacao === 'lookup').length, 5);
});

test('historico ausente reutiliza handle criado e recursos de requisicoes seguintes nao o herdam', () => {
  const h = harness();
  h.c.salvarCadastroElenco(h.payload('atletas'));
  assert.equal(h.io.filter(item => item.name === historyFile && item.operacao === 'lookup').length, 1);
  assert.equal(h.io.filter(item => item.name === historyFile && item.operacao === 'create').length, 1);
  const saved = h.roster('c1', 'atletas')[0];
  // Replace the Drive handle between operations, forcing a fresh lookup next request.
  h.state.failLookup = historyFile;
  assert.throws(() => h.c.salvarCadastroElenco({
    ...h.payload('atletas', true), registroId: saved.id
  }), /lookup failure/);
  assert.equal(h.io.filter(item => item.name === historyFile && item.operacao === 'lookup').length, 2);
  assert(!h.locked());
});

test('elenco legado ausente migra no salvamento sem segunda busca e falhas preservam propriedade', () => {
  for (const tipo of ['atletas', 'comissao']) for (const fail of [false, true]) {
    const h = harness(), nome = rosterFile('c1', tipo);
    const chave = tipo === 'atletas' ? h.c.chaveAtletasCampeonato_('c1')
      : h.c.chaveComissaoTecnicaCampeonato_('c1');
    const original = JSON.stringify([person(tipo)]);
    h.files.delete(nome);
    h.properties.set(chave, original);
    if (fail) h.state.failCreate = nome;
    const save = () => h.c.salvarCadastroElenco(h.payload(tipo, true));
    if (fail) {
      assert.throws(save, /confirmar a gravação/);
      assert.equal(h.properties.get(chave), original);
      assert(!h.logs.some(log => log.fase === 'resposta'));
    } else {
      save();
      assert(!h.properties.has(chave));
      assert.equal(h.roster('c1', tipo)[0].id, person(tipo).id);
      assert(h.history().inscricoes.some(item => item.registroId === person(tipo).id));
    }
    assert.equal(h.io.filter(item => item.name === nome && item.operacao === 'lookup').length, 1);
    assert.equal(h.io.filter(item => item.name === nome && item.operacao === 'create').length, 1);
    assert(!h.locked());
  }
});

test('arquivos homonimos mantem a selecao do primeiro arquivo, sem escrita nos demais', () => {
  const h = harness(), nome = rosterFile('c1', 'atletas'), root = h.c.pastaRaizProjeto_;
  let firstReads = 0, firstWrites = 0, secondAccesses = 0;
  const first = {
    getBlob: () => ({ getDataAsString: () => { firstReads++; return '[]'; } }),
    setContent: () => { firstWrites++; }
  };
  const second = {
    getBlob: () => { secondAccesses++; throw new Error('wrong duplicate'); },
    setContent: () => { secondAccesses++; }
  };
  h.c.pastaRaizProjeto_ = () => ({
    ...root(),
    getFilesByName: name => {
      if (name !== nome) return root().getFilesByName(name);
      const files = [first, second];
      return { hasNext: () => files.length > 0, next: () => files.shift() };
    }
  });
  const lock = h.c.LockService.getScriptLock();
  lock.waitLock();
  try {
    const recursos = {};
    h.c.exigirEdicaoElencoPorIds_('c1', 'e1', recursos);
    h.c.lerListaCadastroDrive_(nome, 'legacy', recursos, 'atletas');
    h.c.gravarListaCadastroDrive_(nome, 'legacy', [], recursos, 'atletas');
    assert.equal(firstReads, 1);
    assert.equal(firstWrites, 1);
    assert.equal(secondAccesses, 0);
  } finally { lock.releaseLock(); }
});

test('instrumentacao fina usa registros reais sem IO extra, preserva silencio e privacidade', () => {
  const measured = harness(), baseline = harness();
  baseline.c.medirEtapaCadastro_ = (_recursos, _categoria, _fase, operacao) => operacao();
  baseline.c.registrarTamanhoCadastro_ = () => {};
  for (const h of [measured, baseline]) {
    h.useRealContextFiles();
    h.c.salvarCadastroElenco(h.payload('atletas'));
  }
  assert.deepEqual(measured.io, baseline.io);
  assert.deepEqual([...measured.files], [...baseline.files]);
  for (const categoria of ['equipes', 'campeonatos', 'bloqueios']) {
    for (const fase of ['drive_localizar', 'drive_iterar', 'drive_ler', 'json_parse']) {
      assert(measured.logs.some(log => log.categoria === categoria && log.fase === fase), `${categoria}/${fase}`);
    }
  }
  const text = JSON.stringify(measured.logs);
  for (const secret of ['Atual', 'Anterior', 'Equipe A', 'e1', 'c1', measured.registryFile, historyFile, '52998224725']) {
    assert(!text.includes(secret), secret);
  }
  measured.logs.length = 0;
  measured.c.lerRegistroEquipes_();
  measured.c.campeonatos_();
  measured.c.lerBloqueiosElenco_();
  assert.equal(measured.logs.length, 0);
});

test('falhas dos iteradores e do bloqueio detalhado propagam sem resposta de sucesso', () => {
  for (const name of [rosterFile('c1', 'atletas'), historyFile,
    'AEUV - Bloqueios de Elenco.json', 'AEUV - Campeonatos.json']) {
    const h = harness();
    h.useRealContextFiles();
    h.state.failIterator = name;
    assert.throws(() => h.c.salvarCadastroElenco(h.payload('atletas')), /iterator failure/);
    assert(h.logs.some(log => log.fase === 'drive_iterar'));
    assert(!h.logs.some(log => log.fase === 'resposta'));
    assert.equal(h.writes.length, 0);
    assert(!h.locked());
  }
});
