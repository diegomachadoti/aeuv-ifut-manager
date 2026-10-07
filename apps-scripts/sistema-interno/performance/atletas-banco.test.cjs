const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { harness, person, historyFile, rosterFile } = require('./save-fixture.cjs');
const backend = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const frontend = html.slice(html.indexOf('    let atletasBd ='), html.indexOf('    let sumulas ='));
const plain = value => JSON.parse(JSON.stringify(value));
const summary = b => [...b.elements.resumoAtletas.innerHTML.matchAll(/class="numero">(\d+)</g)].map(m => Number(m[1]));

function browser() {
  const elements = {};
  const requests = [], opened = [];
  let busca = '';
  function element(id) {
    return elements[id] = {
      value: id === 'porPaginaAtletas' ? '25' : '', textContent: '', disabled: false, events: {},
      addEventListener(type, fn) { this.events[type] = fn; },
      fire(type, event) { this.events[type].call(this, event); },
      focus() { this.focused = true; },
      set innerHTML(value) {
        this.markup = value;
        for (const match of value.matchAll(/\bid="([^"]+)"/g)) element(match[1]);
      },
      get innerHTML() { return this.markup || ''; },
      set outerHTML(value) { this.innerHTML = value; }
    };
  }
  element('statusAtletas');
  const c = vm.createContext({
    moduloAtual: 'atletas', document: { getElementById: id => elements[id] || null },
    escapar: value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    simplificar: value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    celula: (label, value) => '<td>' + value + '</td>',
    formatarCpf: value => value || '', moduloDisponivel: () => true,
    consumirBusca: () => { const termo = busca; busca = ''; return termo; },
    abrirModulo: (...args) => { opened.push(args); if (args[0] === 'atletas') c.carregarAtletas(); },
    google: { script: { get run() {
      const request = {};
      return {
        withSuccessHandler(fn) { request.success = fn; return this; },
        withFailureHandler(fn) { request.failure = fn; return this; },
        listarAtletas() { request.method = 'listarAtletas'; requests.push(request); },
        recalcularBancoAtletas() { request.method = 'recalcularBancoAtletas'; requests.push(request); }
      };
    } } }
  });
  vm.runInContext(frontend, c);
  const state = () => vm.runInContext('atletasBd', c);
  const indices = () => [...elements.linhasAtletas.innerHTML.matchAll(/data-atleta-indice="(\d+)"/g)].map(m => Number(m[1]));
  const load = (records, termo = '', snapshot = {}) => {
    busca = termo;
    c.carregarAtletas();
    requests.at(-1).success({ registros: records, ...snapshot });
  };
  return { c, elements, requests, opened, state, indices, load };
}

function records(count) {
  return Array.from({ length: count }, (_, i) => {
    const vinculos = i % 3 === 2 ? [] : [{
      nome: 'Atleta ' + i, apelido: 'Apelido ' + i, cpf: String(10000000000 + i),
      equipeNome: 'Equipe ' + i % 2, campeonatoNome: 'Copa ' + i % 2, atual: i % 3 === 0
    }];
    return {
      chave: 'atleta-' + i, nome: 'Atleta ' + i, cpf: String(10000000000 + i), vinculos,
      vinculosAtuais: i % 3 === 0 ? 1 : 0, totalVinculos: vinculos.length,
      situacaoDisciplina: i % 5 === 0 ? 'Suspenso' : 'Regular',
      equipesHistorico: ['Equipe ' + i % 2], competicoesHistorico: ['Copa ' + i % 2]
    };
  });
}

for (const count of [141, 1001]) {
  test(`${count} atletas: DOM limitado, totais globais e navegação sem RPC ou refiltragem`, () => {
    const b = browser();
    b.load(records(count));
    assert.equal(b.indices().length, 25);
    assert.equal(b.elements.contagemAtletas.textContent, count + ' atleta(s)');
    assert.match(b.elements.resumoAtletas.innerHTML, new RegExp('>' + count + '</div>'));
    assert.deepEqual(summary(b), [count, Math.ceil(count / 3), Math.floor((count + 1) / 3), Math.ceil(count / 5), 2, 2]);
    assert.match(b.elements.paginaAtletas.textContent, /1–25/);
    assert(b.elements.anteriorAtletas.disabled);
    // A mudança de página e a expansão só desenham a cópia filtrada já pronta.
    b.c.atletaBdPassa_ = () => { throw Error('Não refiltrar ao paginar'); };
    b.c.desenharResumoAtletas = () => { throw Error('Não recalcular totais ao paginar'); };
    const totalPages = Math.ceil(count / 25);
    for (let page = 1; page < totalPages; page++) {
      b.elements.proximaAtletas.fire('click');
      assert.equal(b.indices()[0], page * 25);
      assert(b.indices().length <= 25);
    }
    assert(b.elements.proximaAtletas.disabled);
    assert.equal(b.indices().at(-1), count - 1);
    b.elements.proximaAtletas.fire('click');
    assert.equal(b.state().pagina, totalPages - 1);
    b.elements.porPaginaAtletas.value = '50';
    b.elements.porPaginaAtletas.fire('change');
    assert.equal(b.state().pagina, 0);
    assert.equal(b.indices().length, 50);
    b.elements.proximaAtletas.fire('click');
    b.c.alternarAtletaBd(53);
    assert.equal(b.state().pagina, 1);
    assert.match(b.elements.linhasAtletas.innerHTML, /id="atletaBdDetalhe53"/);
    assert.match(b.elements.linhasAtletas.innerHTML, /aria-expanded="true"/);
    assert(b.elements.atletaBdBotao53.focused);
    b.elements.anteriorAtletas.fire('click');
    assert.doesNotMatch(b.elements.linhasAtletas.innerHTML, /class="detalhe"/);
    b.elements.proximaAtletas.fire('click');
    assert.match(b.elements.linhasAtletas.innerHTML, /id="atletaBdDetalhe53"/);
    assert.equal(b.requests.length, 1);
  });
}

test('filtros globais por nome/apelido/CPF/equipe/competição/vínculo reiniciam página, preservando identidade', () => {
  const b = browser();
  const data = records(1001);
  b.load(data);
  for (const [field, value] of [
    ['buscaAtletas', 'Atleta 997'], ['buscaAtletas', 'Apelido 997'], ['buscaAtletas', '10000000997'],
    ['filtroEquipeAtletas', 'Equipe 1'], ['filtroCompeticaoAtletas', 'Copa 1'],
    ['filtroVinculoAtletas', 'historico'], ['filtroVinculoAtletas', 'atual'], ['filtroVinculoAtletas', 'sem']
  ]) {
    for (const id of ['buscaAtletas', 'filtroEquipeAtletas', 'filtroCompeticaoAtletas', 'filtroVinculoAtletas']) b.elements[id].value = '';
    b.c.filtrarAtletas();
    b.elements.proximaAtletas.fire('click');
    if (!b.state().abertos['atleta-25']) b.c.alternarAtletaBd(25);
    b.elements[field].value = value;
    b.elements[field].fire(field === 'buscaAtletas' ? 'input' : 'change');
    assert.equal(b.state().pagina, 0);
    assert.equal(b.state().abertos['atleta-25'], true);
    const expected = data.filter(r => b.c.atletaBdPassa_(r, b.c.filtrosAtletasBd_())).length;
    assert.equal(b.state().filtrados.length, expected);
    assert.equal(b.indices().length, Math.min(25, expected));
    assert.equal(b.elements.contagemAtletas.textContent, expected + ' de 1001 atleta(s)');
    const matches = b.state().filtrados.map(item => item.registro);
    assert.deepEqual(summary(b).slice(0, 4), [
      expected, matches.filter(r => r.vinculosAtuais > 0).length,
      matches.filter(r => !r.vinculosAtuais && r.totalVinculos > 0).length,
      matches.filter(r => r.situacaoDisciplina === 'Suspenso').length
    ]);
    if (field === 'buscaAtletas') assert.deepEqual(b.indices(), [997]);
  }
  b.elements.filtroVinculoAtletas.value = '';
  b.elements.buscaAtletas.value = 'ninguém corresponde';
  b.elements.buscaAtletas.fire('input');
  assert.deepEqual(b.indices(), []);
  assert.doesNotMatch(b.elements.linhasAtletas.innerHTML, /class="detalhe"/);
  assert.match(b.elements.linhasAtletas.innerHTML, /Nenhum atleta encontrado/);
  assert.equal(b.elements.contagemAtletas.textContent, '0 de 1001 atleta(s)');
  assert.match(b.elements.paginaAtletas.textContent, /Página 1 de 1 · 0–0 de 0/);
  assert(b.elements.anteriorAtletas.disabled && b.elements.proximaAtletas.disabled);
  assert.equal(b.requests.length, 1);
});

test('busca carregada, índices originais/click/atalhos, refresh e callbacks obsoletos', () => {
  const b = browser();
  b.load(records(141), 'Apelido 139');
  assert.deepEqual(b.indices(), [139]);
  const line = { dataset: { atletaIndice: '139' } };
  b.c.cliqueLinhasAtletas_({ target: { closest: selector => selector === '[data-atleta-indice]' ? line : null } });
  assert.match(b.elements.linhasAtletas.innerHTML, /id="atletaBdDetalhe139"/);
  const shortcut = { dataset: { atletaAtalho: 'sumulas', atletaBusca: 'protocolo' } };
  b.c.cliqueLinhasAtletas_({ target: { closest: () => shortcut } });
  assert.deepEqual(b.opened.at(-1), ['sumulas', 'protocolo']);
  b.elements.buscaAtletas.value = '';
  b.c.filtrarAtletas();
  b.elements.proximaAtletas.fire('click');
  b.elements.recarregarAtletas.fire('click');
  b.c.carregarAtletas();
  const stale = b.requests.at(-2), latest = b.requests.at(-1);
  stale.success({ registros: records(1) });
  stale.failure(Error('obsoleto'));
  assert.equal(b.state().dados.registros.length, 141);
  latest.success({ registros: records(141) });
  assert.equal(b.state().pagina, 0);
  assert.equal(b.state().porPagina, 25);
  assert.equal(Object.keys(b.state().abertos).length, 0);
  b.c.moduloAtual = 'equipes';
  latest.success({ registros: records(1) });
  latest.failure(Error('outro módulo'));
  assert.equal(b.state().dados.registros.length, 141);
});

test('snapshot pronto mostra timestamp/erro; recálculo manual único seguido de releitura reinicia paginação', () => {
  const b = browser();
  const generatedAt = '2026-10-06T19:00:00.000Z';
  b.load(records(141), '', { generatedAt, snapshotStatus: {
    generatedAt, agendado: true, responsavel: 'admin@example.invalid', ultimoErro: 'Último recálculo falhou.'
  } });
  assert.match(b.elements.statusAtletas.innerHTML, /Última atualização:/);
  assert(b.elements.statusAtletas.innerHTML.includes(b.c.dataSnapshot_(generatedAt)));
  assert.match(b.elements.statusAtletas.innerHTML, /Último recálculo falhou/);
  b.elements.proximaAtletas.fire('click');
  b.elements.porPaginaAtletas.value = '50';
  b.elements.porPaginaAtletas.fire('change');
  b.c.alternarAtletaBd(1);
  const previous = b.state();
  b.elements.recalcularAtletas.fire('click');
  const pending = b.requests.at(-1);
  assert.equal(pending.method, 'recalcularBancoAtletas');
  assert(b.elements.recalcularAtletas.disabled && b.elements.recarregarAtletas.disabled);
  assert.match(b.elements.atletasSnapshotAcao.textContent, /vários minutos/);
  b.elements.recalcularAtletas.fire('click');
  b.elements.recarregarAtletas.fire('click');
  assert.equal(b.requests.at(-1), pending);
  assert.equal(b.state(), previous);
  pending.success({ generatedAt: '2026-10-06T19:15:00.000Z' });
  assert.equal(b.requests.at(-1).method, 'listarAtletas');
  b.requests.at(-1).success({ registros: records(142), generatedAt: '2026-10-06T19:15:00.000Z' });
  assert.equal(b.state().dados.registros.length, 142);
  assert.equal(b.state().pagina, 0);
  assert.equal(b.state().porPagina, 25);
  assert.deepEqual(Object.keys(b.state().abertos), []);
  assert(b.elements.statusAtletas.innerHTML.includes(b.c.dataSnapshot_('2026-10-06T19:15:00.000Z')));
});

test('sem snapshot/cópia vazia há geração manual; erro não anuncia sucesso, mantém timestamp anterior e permite nova tentativa', () => {
  const b = browser();
  b.c.carregarAtletas();
  b.requests.at(-1).failure(Error('Ainda não possui snapshot. Use Recalcular agora.'));
  assert.match(b.elements.statusAtletas.innerHTML, /Ainda não possui snapshot/);
  assert(b.elements.recalcularAtletas);
  b.elements.recalcularAtletas.fire('click');
  b.requests.at(-1).failure(Error('fonte indisponível'));
  assert.match(b.elements.atletasSnapshotAcao.textContent, /fonte indisponível.*não foi confirmado/);
  assert(!b.elements.recalcularAtletas.disabled);
  b.load([], '', { generatedAt: '2026-10-06T19:00:00.000Z' });
  assert.match(b.elements.statusAtletas.innerHTML, /Nenhum atleta encontrado/);
  assert.match(b.elements.statusAtletas.innerHTML, /Última atualização/);
  b.load(records(30), '', { generatedAt: '2026-10-06T19:00:00.000Z' });
  const previous = b.state(), timestamp = b.elements.statusAtletas.innerHTML;
  b.elements.recalcularAtletas.fire('click');
  b.requests.at(-1).failure(Error('fonte indisponível'));
  assert.equal(b.state(), previous);
  assert.equal(b.elements.statusAtletas.innerHTML, timestamp);
  assert.match(html, /administracaoOcupada_ \|\| administracaoSnapshotOcupada_ \|\| atletasBdOcupado_/);
});

const baseline = backend.replace(
  'historico = prepararHistoricoElenco_(cache, recursos);\n    campeonatos = recursos.campeonatos;\n    equipes = recursos.equipes;',
  'historico = prepararHistoricoElenco_(cache);\n    campeonatos = campeonatos_();\n    equipes = equipesRegistro_(true);'
);
assert.notEqual(baseline, backend);

function banco(source = backend) {
  const h = harness(source);
  const legacyCalls = [];
  h.c.listarSolicitacoes = () => {
    assert(!h.locked()); legacyCalls.push('solicitacoes');
    return { total: 200, registros: [{ equipe: 'Equipe A', competicao: 'Atual', protocolo: 'protocolo',
      situacao: 'Processada', pessoas: [{ nome: 'Carlos Silva', cpf: '52998224725', tipo: 'Atleta' }] }] };
  };
  h.c.listarPunicoes = () => {
    assert(!h.locked()); legacyCalls.push('punicoes');
    return { registros: [{ punido: 'Carlos Silva', equipe: 'Equipe A', competicao: 'Atual',
      status: 'DEFINIDA', situacao: 'A CUMPRIR', nota: 'nota' }] };
  };
  h.c.listarSumulas = () => {
    assert(!h.locked()); legacyCalls.push('sumulas');
    return { total: 300, registros: [{ protocolo: 'sumula',
      envolvidos: [{ nome: 'Carlos Silva', equipe: 'Equipe A', tipo: 'Atleta' }] }] };
  };
  h.c.lerSolicitacoes_ = () => h.c.listarSolicitacoes();
  h.c.lerSumulas_ = () => h.c.listarSumulas();
  h.seed('c1', 'atletas', [
    person('atletas'), person('atletas', { id: 'sem-equipe', nome: 'Sem equipe', cpf: '123', timeVinculado: '' }),
    person('atletas', { id: 'sem-id', nome: 'Legado', cpf: '123', ativo: false })
  ]);
  h.seed('c2', 'atletas', [
    person('atletas', { id: 'outra-inscricao', ativo: false, timeVinculado: 'Equipe B' }),
    person('atletas', { id: 'homonimo', cpf: '11144477735' })
  ]);
  h.seed('c1', 'comissao', [person('comissao')]);
  return { ...h, legacyCalls };
}

test('reuso local: campeonatos/equipes 2→1, elencos globais 4, resultado e histórico equivalentes', () => {
  const old = banco(baseline), current = banco();
  const resources = [];
  const reconcile = current.c.prepararHistoricoElenco_;
  current.c.prepararHistoricoElenco_ = (cache, local) => {
    assert(current.locked());
    assert.deepEqual(Object.keys(local), []);
    resources.push(local);
    const result = reconcile(cache, local);
    assert.equal(local.listas, cache);
    assert.equal(local.contexto, undefined);
    assert.equal(local.arquivosDrive, undefined);
    return result;
  };
  const before = plain(old.c.construirBancoAtletas_()), after = plain(current.c.construirBancoAtletas_());
  assert.deepEqual(after, before);
  current.c.validarSnapshotBancoAtletas_({ ...after, schema: 1, generatedAt: '2026-10-06T19:00:00.000Z' });
  assert.deepEqual(current.history(), old.history());
  for (const key of ['campeonatos', 'equipes']) {
    assert.equal(old.counts[key], 2);
    assert.equal(current.counts[key], 1);
  }
  assert.equal(current.counts.rosters, 4);
  assert.equal(current.counts.locks, 1);
  assert.deepEqual(current.legacyCalls, ['solicitacoes', 'punicoes', 'sumulas']);
  assert(current.reads.filter(r => ['campeonatos', 'equipes', 'drive'].includes(r.recurso)).every(r => r.locked));
  assert(!current.locked());
  assert(current.history().inscricoes.some(i => i.dados.foto === 'photo' && i.dados.rg === 'rg'));
  assert(!JSON.stringify(after).includes('"foto"'));
  assert(!JSON.stringify(after).includes('"rg"'));
  assert(!after.registros.some(r => r.nome === 'Mariana Costa'));
  assert.equal(after.fontes.solicitacoesTotal, 200);
  assert.equal(after.fontes.sumulasTotal, 300);
  // Segunda operação sempre relê o Drive e reconcilia exclusões/transferências/renomeações.
  for (const h of [old, current]) {
    h.seed('c1', 'atletas', []);
    h.state.campeonatos = [{ id: 'c1', nome: 'Renomeado' }];
    h.state.equipes[0].nome = 'Equipe Renomeada';
  }
  const recovered = plain(current.c.construirBancoAtletas_());
  assert.deepEqual(recovered, plain(old.c.construirBancoAtletas_()));
  assert.deepEqual(current.history(), old.history());
  assert(recovered.registros.some(r => r.vinculos.some(v => v.campeonatoExcluido)));
  assert(recovered.registros.some(r => r.vinculos.some(v => !v.atual)));
  assert.equal(current.counts.campeonatos, 2);
  assert.equal(resources.length, 2);
  assert.notEqual(resources[0], resources[1]);
});

test('permissões e falhas preservadas; reconciliação recupera roster após falha de histórico', () => {
  for (const perfil of ['associado', 'visitante']) {
    const h = banco();
    h.state.perfil = perfil;
    assert.throws(() => h.c.construirBancoAtletas_(), /permissão/);
    assert.equal(h.counts.rosters, 0);
    assert.equal(h.counts.locks, 0);
    assert.deepEqual(h.legacyCalls, []);
  }
  const unauthorized = banco();
  unauthorized.state.autorizado = false;
  assert.throws(() => unauthorized.c.construirBancoAtletas_(), /permissão/);
  assert.equal(unauthorized.reads.length, 1);
  for (const name of [historyFile, rosterFile('c2', 'atletas')]) {
    const h = banco();
    h.c.construirBancoAtletas_();
    h.files.set(name, '{invalid');
    assert.throws(() => h.c.construirBancoAtletas_());
    assert(!h.locked());
  }
  const h = banco();
  h.state.failHistory = true;
  assert.throws(() => h.c.construirBancoAtletas_(), /history failure/);
  assert(!h.locked());
  h.state.failHistory = false;
  const result = h.c.construirBancoAtletas_();
  assert(result.registros.some(r => r.nome === 'Carlos Silva'));
  assert(h.history().inscricoes.length);
});

test('cinco fases não sobrepostas, métricas privadas e toggle sem alterar resultado/erros', () => {
  const enabled = banco();
  const result = plain(enabled.c.construirBancoAtletas_());
  const phases = enabled.logs.filter(l => l.metrica === 'atleta_banco');
  assert.deepEqual(phases.map(l => l.fase), ['elenco', 'solicitacoes', 'punicoes', 'sumulas', 'consolidacao']);
  for (const log of phases) {
    assert.deepEqual(Object.keys(log).sort(), ['duracaoMs', 'fase', 'metrica']);
    assert(Number.isFinite(log.duracaoMs) && log.duracaoMs >= 0);
  }
  const disabled = banco(backend.replace('const CADASTRO_METRICAS_ATIVAS = true;', 'const CADASTRO_METRICAS_ATIVAS = false;'));
  disabled.c.bytesUtf8Cadastro_ = () => { throw Error('Não medir tamanho'); };
  assert.deepEqual(plain(disabled.c.construirBancoAtletas_()), result);
  assert.equal(disabled.logs.length, 0);
  for (const h of [enabled, disabled]) {
    h.c.listarPunicoes = () => { throw Error('falha legada'); };
    assert.throws(() => h.c.construirBancoAtletas_(), /falha legada/);
    assert(!h.locked());
  }
});

// Reference path before source projection: the same complete public listings
// and their redundant name lookups, with no fixture relying on live Drive.
const legacySources = backend
  .replace('return lerSolicitacoes_(true);', 'return listarSolicitacoes();')
  .replace('return lerSumulas_(true);', 'return listarSumulas();')
  .replaceAll('achado.nome === undefined ? achado.arquivo.getName() : achado.nome', 'achado.arquivo.getName()')
  .replace('resultados[nomeBase_(achado.nome)]', 'resultados[nomeBase_(achado.arquivo.getName())]')
  .replace("nome > indice[chave][campo + 'Nome']", "arquivo.getName() > indice[chave][campo + 'Nome']")
  .replace("indice[chave][campo + 'Nome'] = nome;", "indice[chave][campo + 'Nome'] = arquivo.getName();");
assert.notEqual(legacySources, backend);

function sources(source = backend, { empty = false, limit = 3 } = {}) {
  const h = harness(source);
  const io = [];
  const iterator = values => {
    let index = 0;
    return { hasNext: () => index < values.length, next: () => values[index++] };
  };
  const file = (category, name, text, order = 1) => ({
    getName() { io.push({ category, call: 'name' }); return name; },
    getDateCreated() { io.push({ category, call: 'created' }); return new Date(order); },
    getUrl() { io.push({ category, call: 'url' }); return 'url:' + name; },
    getBlob() {
      io.push({ category, call: 'blob' });
      if (h.state.failSource === category) throw Error('source read failure');
      return { getDataAsString(charset) {
        assert.equal(charset, 'UTF-8');
        io.push({ category, call: 'text', bytes: Buffer.byteLength(text, 'utf8') });
        return text;
      } };
    }
  });
  const folder = (category, files = [], children = {}) => ({
    getFiles() { io.push({ category, call: 'files' }); return iterator(files); },
    getFoldersByName(name) {
      io.push({ category, call: 'folders' });
      return iterator(children[name] ? [children[name]] : []);
    },
    getUrl() { io.push({ category, call: 'folderUrl' }); return 'folder:' + category; }
  });
  const request = (name, header, people) => file('solicitacoes', name,
    'PROTOCOLO: ' + name + '\nDATA/HORA: 01/01/2026 12:00\n' + header +
    '\nRESPONSAVEL: Responsável\nTELEFONE/WHATSAPP: privado\nCOMPROVANTE PIX: anexo\n' +
    people.map((p, i) => '\nREGISTRO ' + i + '\n' + p).join(''));
  const personText = (name, cpf, action, type = 'Atleta') =>
    'NOME COMPLETO: ' + name + '\nCPF: ' + cpf + '\nACAO: ' + action + '\nTIPO: ' + type +
    '\nDATA DE NASCIMENTO: NAO NECESSARIO\nCOMPETICAO ANTERIOR: Antiga';
  const r1 = request('A-1000000000004.txt', 'EQUIPE: Equipe A\nCOMPETICAO: Atual', [
    personText('Carlos Silva', '52998224725', 'Remocao'),
    personText('Comissão', 'NAO NECESSARIO', 'Inclusao', 'Comissao Tecnica')
  ]);
  const r2 = request('B-1000000000003.txt', 'EQUIPE: Equipe B\nCOMPETICAO: Anterior', [
    personText('Carlos Silva', '11144477735', 'Portabilidade'), personText('', '', 'Inclusao')
  ]);
  const r3 = request('C-1000000000002.txt', 'Linha inválida\nEQUIPE: Equipe A', [
    personText('Carlos Silva', '52998224725', 'Inclusao')
  ]);
  const r4 = request('D-1000000000001.txt', 'EQUIPE: Equipe C', [personText('Antigo', '', 'Inclusao')]);
  const results = [];
  for (const name of ['A-1000000000004', 'B-1000000000003', 'C-1000000000002', 'D-1000000000001', 'alheio']) {
    for (const ext of ['txt', 'pdf']) {
      results.push(file('resultados', name + '-resultado-20260101-120000.' + ext, 'not read'));
    }
  }
  results.push(file('resultados', 'A-1000000000004-resultado-20260102-120000.pdf', 'not read'));
  const rootRequests = folder('solicitacoes', empty ? [] : [r1, r3, file('solicitacoes', 'anexo.pdf', 'not read')], empty ? {} : {
    Entrada: folder('solicitacoes', [r1]),
    Processados: folder('solicitacoes', [r2, r4]),
    Falhas: folder('solicitacoes', [r4]), // Legacy duplicates across subfolders are retained.
    Resultados: folder('resultados', results)
  });
  const match = (name, order, people, extra = '') => file('sumulas', name,
    'PROTOCOLO: partida\nDATA ENVIO: 02/01/2026\nÁRBITRO: privado\nDOCUMENTO: privado\n' +
    'PARTIDA\nEquipe A x Equipe B\nDATA: 01/01/2026\nHORA: 12:00\nDOS FATOS\n' +
    'Relato: preservado\n\n' + extra + '\nENVOLVIDOS\n' +
    people.map((p, i) => 'REGISTRO ' + i + '\n' + p).join('\n') +
    '\nSÚMULA OFICIAL (PDF)\nhttps://example.invalid/sumula.pdf', order);
  const s1 = match('SUMULA_nova.txt', 40, [
    'NOME: Carlos Silva\nEQUIPE: Equipe A\nTIPO: Atleta\nCAMISA: 10',
    'NOME: Avulso\nEQUIPE: Equipe C\nTIPO: Dirigente\nCAMISA: 0'
  ]);
  const s2 = match('SUMULA_malformada.txt', 30, ['NOME: \nEQUIPE: Equipe B'], 'PROTOCOLO: não é campo');
  const s3 = match('SUMULA_raiz.txt', 20, ['NOME: Carlos Silva\nEQUIPE: Equipe B\nTIPO: Atleta']);
  const s4 = match('SUMULA_antiga.txt', 10, ['NOME: Ignorado\nEQUIPE: Equipe C']);
  const rootMatches = folder('sumulas', empty ? [] : [s1, s3], empty ? {} : {
    Entrada: folder('sumulas', [s1, file('sumulas', 'foto.png', 'not read')]),
    Processados: folder('sumulas', [s2, s4]),
    Falhas: folder('sumulas', [s4])
  });
  h.c.pastaSolicitacoes_ = () => rootRequests;
  h.c.pastaSumulas_ = () => rootMatches;
  const punishment = file('punicoes', 'controle.txt',
    'NOTA|DATA NOTA|COMPETICAO|DATA JOGO|PARTIDA|EQUIPE|PUNIDO|TIPO|CAMISA|ARTIGO|PARTIDAS|TEMPO|DECISAO|CARTAO VERMELHO|STATUS|SITUACAO|SUMULA|MODO\n' +
    'nota|03/01/2026|Atual|01/01/2026|A x B|Equipe A|Carlos Silva|Atleta|10|1|2||decisão||DEFINIDA|A CUMPRIR|partida|');
  h.c.arquivoPunicoes_ = () => punishment;
  vm.runInContext(`CONFIG.solicitacoes.maxLeitura = ${limit}; CONFIG.sumulas.maxLeitura = ${limit};`, h.c);
  h.seed('c1', 'atletas', [person('atletas'), person('atletas', { id: 'homonimo', cpf: '11144477735', timeVinculado: 'Equipe B' })]);
  h.seed('c2', 'atletas', [person('atletas', { id: 'historico', ativo: false })]);
  return { ...h, sourceIO: io, callCount: (category, call) => io.filter(e => e.category === category && e.call === call).length };
}

test('fontes completas vs projeção: igualdade de todo listarAtletas, histórico e limites legados', () => {
  for (const options of [{}, { empty: true }, { limit: 20 }, { limit: 1 }, { limit: 0 }]) {
    const old = sources(legacySources, options), current = sources(backend, options);
    const before = plain(old.c.construirBancoAtletas_()), after = plain(current.c.construirBancoAtletas_());
    assert.deepEqual(after, before);
    assert.deepEqual(current.history(), old.history());
    const response = JSON.stringify(after);
    for (const field of ['foto', 'rg', 'comprovanteUrl', 'fatos', 'documento', 'telefone']) {
      assert(!response.includes('"' + field + '"'));
    }
    assert.equal(current.callCount('punicoes', 'blob'), 1);
    assert.equal(old.callCount('punicoes', 'blob'), 2);
    for (const category of ['solicitacoes', 'sumulas']) {
      assert.equal(current.callCount(category, 'blob'), old.callCount(category, 'blob'));
      assert.equal(current.callCount(category, 'url'), old.callCount(category, 'url'));
      assert.equal(current.callCount(category, 'folderUrl'), old.callCount(category, 'folderUrl'));
    }
    assert.equal(current.callCount('sumulas', 'created'), old.callCount('sumulas', 'created'));
    assert.equal(current.callCount('resultados', 'blob'), 0);
    if (!options.empty && options.limit === undefined) {
      assert.equal(after.fontes.solicitacoesTotal, 5);
      assert.equal(after.fontes.sumulasTotal, 5);
      assert(after.registros.some(a => a.movimentacoes.some(m => /20260102-120000.pdf$/.test(m.resultadoPdfUrl))));
      assert(!after.registros.some(a => a.nome === 'Antigo' || a.nome === 'Ignorado'));
      assert.equal(current.callCount('solicitacoes', 'name'), 7);
      assert.equal(old.callCount('solicitacoes', 'name'), 13);
      assert.equal(current.callCount('sumulas', 'name'), 7);
      assert.equal(old.callCount('sumulas', 'name'), 10);
      assert.equal(current.callCount('resultados', 'url'), 7);
      assert.equal(old.callCount('resultados', 'url'), 11);
      assert.equal(current.callCount('resultados', 'name'), 11);
      assert.equal(old.callCount('resultados', 'name'), 23);
    }
  }
});

test('listas públicas mantêm todos os campos/anexos/notas e parsers toleram documentos malformados', () => {
  const old = sources(legacySources), current = sources();
  for (const method of ['listarSolicitacoes', 'listarSumulas']) {
    assert.deepEqual(plain(current.c[method]()), plain(old.c[method]()));
  }
  assert.equal(current.logs.length, 0);
  const request = current.c.listarSolicitacoes().registros[0];
  assert.equal(request.telefone, 'privado');
  assert.equal(request.comprovanteUrl, 'anexo');
  assert.equal(request.quantidade, 2);
  assert.deepEqual(plain(request.resumo), { Inclusao: 1, Remocao: 1, Portabilidade: 0 });
  assert.equal(request.pessoas[0].nascimento, '');
  assert.equal(request.pessoas[1].cpf, '');
  const match = current.c.listarSumulas().registros[0];
  assert.equal(match.arbitro, 'privado');
  assert.equal(match.documento, 'privado');
  assert.equal(match.fatos, 'Relato: preservado');
  assert.deepEqual(plain(match.equipes), ['Equipe A', 'Equipe B', 'Equipe C']);
  assert.equal(match.pdfUrl, 'https://example.invalid/sumula.pdf');
  assert.equal(match.notas.length, 1);
  assert.equal(match.punidos.length, 1);
  const achado = { arquivo: { getName: () => 'malformado', getUrl: () => 'url' }, ordem: 1, situacao: 'Falha' };
  for (const text of ['', 'sem campos', 'REGISTRO 1\nCPF: NAO NECESSARIO', 'PROTOCOLO: estranho\nENVOLVIDOS\nREGISTRO 1\nNOME: Nome\nPARTIDA\nDATA: x']) {
    for (const parser of ['interpretarSolicitacao_', 'interpretarSumula_']) {
      const full = current.c[parser](text, achado);
      const projection = current.c[parser](text, achado, true);
      for (const key of Object.keys(projection)) assert.deepEqual(plain(projection[key]), plain(full[key]));
    }
  }
});

test('fontes: permissão em cada escopo, erros de leitura e ausência de cache entre consultas', () => {
  for (const module of ['solicitacoes', 'sumulas']) {
    for (const publicMethod of [false, true]) {
      const h = sources();
      const authorize = h.c.moduloLiberado_;
      h.c.moduloLiberado_ = (name, perfil) => name !== module && authorize(name, perfil);
      assert.throws(() => publicMethod
        ? h.c[module === 'solicitacoes' ? 'listarSolicitacoes' : 'listarSumulas']()
        : h.c.construirBancoAtletas_(), /permissão/);
      assert.equal(h.callCount(module, 'blob'), 0);
      assert.equal(h.callCount(module, 'folders'), 0);
    }
    for (const source of [legacySources, backend]) {
      const h = sources(source);
      h.state.failSource = module;
      assert.throws(() => h.c.construirBancoAtletas_(), /source read failure/);
      assert(!h.locked());
    }
  }
  const h = sources();
  h.c.construirBancoAtletas_();
  const first = h.sourceIO.length;
  h.c.construirBancoAtletas_();
  assert.equal(h.sourceIO.length, first * 2);
  const missingNotes = sources();
  missingNotes.state.failSource = 'punicoes';
  assert(missingNotes.c.listarSumulas().registros.every(r => r.notas.length === 0));
  assert.throws(() => missingNotes.c.construirBancoAtletas_(), /source read failure/);
});

test('subfases agregadas/privadas aninhadas, métricas desligadas preservam IO e erros sem medir bytes', () => {
  const enabled = sources();
  const disabled = sources(backend.replace('const CADASTRO_METRICAS_ATIVAS = true;', 'const CADASTRO_METRICAS_ATIVAS = false;'));
  disabled.c.bytesUtf8Cadastro_ = () => { throw Error('Não medir tamanho'); };
  assert.deepEqual(plain(enabled.c.construirBancoAtletas_()), plain(disabled.c.construirBancoAtletas_()));
  assert.deepEqual(enabled.sourceIO, disabled.sourceIO);
  assert.equal(disabled.logs.length, 0);
  const logs = enabled.logs.filter(l => l.metrica === 'atleta_banco' && l.categoria);
  for (const category of ['solicitacoes', 'sumulas']) {
    const phases = logs.filter(l => l.categoria === category);
    assert.equal(phases.length, category === 'solicitacoes' ? 9 : 8);
    assert.equal(phases.filter(l => l.fase === 'drive_ler').length, 1);
    const size = phases.find(l => l.fase === 'leitura');
    assert.equal(size.arquivosLidos, 3);
    assert.equal(size.total, 5);
    assert.equal(size.selecionados, 3);
    assert.equal(size.bytesLidos, enabled.sourceIO.filter(e => e.category === category && e.call === 'text')
      .reduce((total, e) => total + e.bytes, 0));
  }
  for (const log of logs) {
    assert.deepEqual(Object.keys(log).sort(), ['arquivosLidos', 'bytesLidos', 'categoria', 'duracaoMs', 'fase', 'metrica', 'selecionados', 'total']);
    assert(Number.isFinite(log.duracaoMs) && log.duracaoMs >= 0);
  }
  for (const h of [enabled, disabled]) {
    h.state.failSource = 'sumulas';
    assert.throws(() => h.c.construirBancoAtletas_(), /source read failure/);
  }
  assert.equal(disabled.logs.length, 0);
  assert.deepEqual(enabled.sourceIO, disabled.sourceIO);
});
