const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const server = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
function func(name, source = server) {
  const start = source.indexOf('function ' + name + '(');
  const end = source.indexOf('\n}', start);
  assert(start >= 0 && end > start, name);
  return source.slice(start, end + 2);
}
function iterator(items) {
  let i = 0;
  return { hasNext: () => i < items.length, next: () => items[i++] };
}

function fixture(total = 3) {
  const props = new Map(), files = new Map(), folders = new Map();
  const reads = { txt: 0, snapshot: 0 };
  let serial = 0;
  const user = { autorizado: true, email: 'admin@example.test', usuario: { perfil: 'admin' } };
  const folder = (id, children = []) => {
    const f = { id, children, files: [], getId: () => id, getUrl: () => 'https://drive.google.com/drive/folders/' + id,
      getFoldersByName: name => iterator(f.children.filter(c => c.id === name)),
      getFiles: () => iterator(f.files),
      createFile: blob => {
        const file = makeFile('snapshot-' + (++serial), blob.name, blob.text, id);
        file.mimeType = 'application/json';
        f.files.push(file);
        return file;
      } };
    folders.set(id, f);
    return f;
  };
  const makeFile = (id, name, text, parent) => {
    const f = { id, name, text, parents: [parent], modified: 1000, created: 1000, trashed: false,
      mimeType: 'text/plain', getId: () => id, getName: () => f.name,
      getUrl: () => 'https://drive.google.com/file/d/' + id,
      getSize: () => Buffer.byteLength(f.text), getLastUpdated: () => new Date(f.modified),
      getDateCreated: () => new Date(f.created), getParents: () => iterator(f.parents.map(id => folders.get(id))),
      setTrashed: value => { f.trashed = value; },
      getBlob: () => { reads[f.mimeType === 'application/json' ? 'snapshot' : 'txt']++;
        return { getDataAsString: () => { if (f.onRead) f.onRead(); return f.text; } }; } };
    files.set(id, f);
    return f;
  };
  const entrada = folder('Entrada'), processados = folder('Processados'), falhas = folder('Falhas');
  const raiz = folder('source', [entrada, processados, falhas]);
  folder('snapshot-folder');
  for (let i = 0; i < total; i++) {
    const file = makeFile('sumula-' + i, 'SUMULA_' + i + '.txt',
      'PROTOCOLO: SUM-' + i + '\nÁRBITRO: Árbitro\nPARTIDA\nA x B\nDATA: 01/10/2026\nDOS FATOS\nRelato ' + i + '\nENVOLVIDOS\n', 'Processados');
    file.created += i;
    processados.files.push(file);
  }
  const config = { sumulas: { pastaRaizId: 'source', snapshotPastaId: 'snapshot-folder',
    snapshotOwnerEmail: user.email, maxLeitura: 200 }, solicitacoes: { snapshotPastaId: 'other-folder' } };
  const c = vm.createContext({ CONFIG: config, console, Set, Map,
    Session: { getEffectiveUser: () => ({ getEmail: () => user.email }) },
    identificarUsuario_: () => user, moduloLiberado_: (_, perfil) => ['admin', 'diretoria'].includes(perfil),
    exigirAdministracao_: () => { if (!user.autorizado || user.usuario.perfil !== 'admin') throw new Error('admin'); return user; },
    normalizarEmail_: email => String(email || '').toLowerCase(),
    pastaSumulas_: () => { if (c.semFonte) throw new Error('sem acesso à fonte'); return raiz; },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => props.get(key) || null,
      setProperty: (key, value) => props.set(key, value) }) },
    Utilities: { getUuid: () => 'token-' + (++serial), newBlob: (text, mime, name) => ({ text, mime, name }) },
    Drive: { Files: { get: id => {
      if (folders.has(id)) return { id, mimeType: 'application/vnd.google-apps.folder', trashed: false };
      const f = files.get(id);
      if (!f || c.semSnapshot) throw new Error('sem acesso');
      return { id, name: f.name, mimeType: f.mimeType, trashed: f.trashed,
        size: String(Buffer.byteLength(f.text)), parents: f.parents.slice(),
        modifiedTime: new Date(f.modified).toISOString(), createdTime: new Date(f.created).toISOString() };
    } } },
    DriveApp: { getFolderById: id => folders.get(id), getFileById: id => files.get(id) },
    comLockSnapshotSolicitacoes_: action => action(), lerEstadoBancoAtletas_: () => ({}), BANCO_ATLETAS_AGENDA: 'agenda',
    SOLICITACOES_SNAPSHOT_LEASE_MS: 6 * 60 * 1000, SOLICITACOES_TXT_MAX_BYTES: 256 * 1024,
    criarMetricasFonteAtleta_: () => null, medirFonteAtleta_: (_, fase, action) => action(),
    registrarMetricasFonteAtleta_: () => {}, lerTextoFonteAtleta_: file => file.getBlob().getDataAsString('UTF-8'),
    indiceNotas_: () => c.notas || {}, indiceAnalisesManuais_: () => c.analises || {}, chaveProtocolo_: p => p,
    equipesDasSumulas_: registros => [...new Set(registros.flatMap(r => r.equipes))],
    aparar_: linhas => { const r = linhas.slice(); while (r.length && !r[0].trim()) r.shift();
      while (r.length && !r[r.length - 1].trim()) r.pop(); return r; }
  });
  const helpers = ['bytesUtf8Solicitacoes_', 'objetoSolicitacoes_', 'stringLimitadaSolicitacoes_',
    'dataIsoSolicitacoes_', 'numeroDriveSolicitacoes_', 'interpretarSumula_', 'separarConfronto_'];
  vm.runInContext(helpers.map(name => func(name)).join('\n') + '\n' +
    server.slice(server.indexOf('const SUMULAS_PASTAS ='), server.indexOf('const SUMULAS_PASTA_EXCLUIDOS =')), c);
  return { c, user, config, props, files, reads, raiz, entrada, processados, falhas, makeFile,
    reset: () => { reads.txt = 0; reads.snapshot = 0; },
    estado: () => JSON.parse(props.get('AEUV_SUMULAS_SNAPSHOT_V1') || '{}') };
}

test('build contém só analisadas, sem dados de decisões congelados; resposta é provisória sem ações', () => {
  const h = fixture();
  h.entrada.files.push(h.makeFile('ativa', 'SUMULA_ativa.txt', 'PROTOCOLO: ATIVA', 'Entrada'));
  assert.equal(h.c.recalcularSnapshotSumulas().disponivel, true);
  const resposta = clone(h.c.listarSnapshotSumulasAnalisadas());
  assert.equal(resposta.total, 3);
  assert.equal(resposta.provisorio, true);
  assert.equal(resposta.podeExcluir, false);
  assert.equal(resposta.podeAnalisar, false);
  assert(resposta.registros.every(r => r.situacao === 'Analisada' && !('notas' in r)));
});

test('80 analisadas + 2 ativas: consulta final reduz leituras de 82 TXT para 2 TXT + 1 JSON', () => {
  const h = fixture(80);
  for (const pasta of [h.entrada, h.falhas]) {
    pasta.files.push(h.makeFile(pasta.id, 'SUMULA_' + pasta.id + '.txt', 'PROTOCOLO: ' + pasta.id, pasta.id));
  }
  h.c.listarSumulas();
  assert.equal(h.reads.txt, 82);
  h.c.recalcularSnapshotSumulas();
  h.reset();
  const resposta = h.c.listarSumulas();
  assert.equal(resposta.total, 82);
  assert.equal(resposta.preCargaHits, 80);
  assert.deepEqual(h.reads, { txt: 2, snapshot: 1 });
  assert.equal(resposta.provisorio, false);
});

test('TXT editado é relido, notas e justificativas continuam vivas mesmo em hits', () => {
  const h = fixture();
  h.c.recalcularSnapshotSumulas();
  const file = h.files.get('sumula-0');
  file.text = file.text.replace('Relato 0', 'Relato corrigido');
  file.modified++;
  h.c.notas = { 'SUM-1': { notas: ['009/2026'], dataNota: 'hoje', punidos: [{ nome: 'Teste' }] } };
  h.c.analises = { 'SUMULA_1.txt': { justificativa: 'Sem infração' } };
  h.reset();
  const resposta = h.c.listarSumulas();
  assert.equal(resposta.preCargaHits, 2);
  assert.equal(h.reads.txt, 1);
  assert.equal(resposta.registros.find(r => r.protocolo === 'SUM-0').fatos, 'Relato corrigido');
  const r = resposta.registros.find(r => r.protocolo === 'SUM-1');
  assert.equal(r.notas[0], '009/2026');
  assert.equal(r.analiseManual.justificativa, 'Sem infração');
});

test('arquivo movido para Falhas não usa snapshot nem mantém situação analisada', () => {
  const h = fixture();
  h.c.recalcularSnapshotSumulas();
  const file = h.processados.files.shift();
  file.parents = ['Falhas'];
  h.falhas.files.push(file);
  h.reset();
  const resposta = h.c.listarSumulas();
  assert.equal(resposta.preCargaHits, 2);
  assert.equal(resposta.registros.find(r => r.arquivoNome === file.name).situacao, 'Falha');
  assert.equal(h.reads.txt, 1);
});

test('remoção externa e substituição por outro ID aparecem na consulta final', () => {
  const h = fixture();
  h.c.recalcularSnapshotSumulas();
  h.processados.files.shift();
  const antiga = h.processados.files.shift();
  h.processados.files.push(h.makeFile('novo-id', antiga.name, antiga.text, 'Processados'));
  h.reset();
  assert.equal(h.c.listarSumulas().total, 2);
  assert.equal(h.reads.txt, 1);
});

test('snapshot ausente/corrompido/sem acesso usa leitura normal', () => {
  const h = fixture();
  assert.equal(h.c.listarSumulas().registros.length, 3);
  h.c.recalcularSnapshotSumulas();
  h.files.get(h.estado().current.id).text = '{quebrado';
  assert.equal(h.c.listarSumulas().preCargaHits, 0);
  h.c.semSnapshot = true;
  assert.equal(h.c.listarSumulas().registros.length, 3);
});

test('cópia expirada não é apresentada; hits ainda exigem fingerprint atual', () => {
  const h = fixture();
  h.c.recalcularSnapshotSumulas();
  const estado = h.estado(), file = h.files.get(estado.current.id), dados = JSON.parse(file.text);
  dados.generatedAt = new Date(Date.now() - 48 * 3600000).toISOString();
  dados.expiresAt = new Date(Date.parse(dados.generatedAt) + 24 * 3600000).toISOString();
  Object.assign(estado.current, { generatedAt: dados.generatedAt, expiresAt: dados.expiresAt });
  file.text = JSON.stringify(dados);
  h.props.set('AEUV_SUMULAS_SNAPSHOT_V1', JSON.stringify(estado));
  assert.throws(() => h.c.listarSnapshotSumulasAnalisadas(), /indisponível/);
  assert.equal(h.c.listarSumulas().preCargaHits, 3);
});

test('invalidação local bloqueia prévia antiga e fonte diferente bloqueia todos os hits', () => {
  const h = fixture();
  h.c.recalcularSnapshotSumulas();
  h.c.invalidarSnapshotSumulas_();
  assert.throws(() => h.c.listarSnapshotSumulasAnalisadas(), /indisponível/);
  assert.equal(h.c.listarSumulas().preCargaHits, 3);
  h.config.sumulas.pastaRaizId = 'outra-fonte';
  assert.equal(h.c.listarSumulas().preCargaHits, 0);
});

test('falha durante build preserva current; previous válido cobre current corrompido', () => {
  const h = fixture();
  h.c.recalcularSnapshotSumulas();
  const primeiro = h.estado().current.id;
  h.files.get('sumula-0').onRead = () => { throw new Error('falha'); };
  assert.throws(() => h.c.recalcularSnapshotSumulas(), /Não foi possível/);
  assert.equal(h.estado().current.id, primeiro);
  assert.equal(h.estado().lease, undefined);
  delete h.files.get('sumula-0').onRead;
  h.c.recalcularSnapshotSumulas();
  h.files.get(h.estado().current.id).text = '{}';
  assert.equal(h.c.listarSnapshotSumulasAnalisadas().registros.length, 3);
  h.c.recalcularSnapshotSumulas();
  assert.equal(h.estado().previous.id, primeiro);
});

test('build rejeita edição durante leitura e TXT acima do limite', () => {
  const h = fixture();
  const file = h.files.get('sumula-0');
  file.onRead = () => { file.modified++; };
  assert.throws(() => h.c.recalcularSnapshotSumulas(), /Não foi possível/);
  assert.equal(h.estado().current, undefined);
  delete file.onRead;
  file.text = 'x'.repeat(256 * 1024 + 1);
  assert.throws(() => h.c.recalcularSnapshotSumulas(), /Não foi possível/);
});

test('autorização atual, proprietário e pasta dedicada são exigidos', () => {
  const h = fixture();
  h.c.recalcularSnapshotSumulas();
  h.user.usuario.perfil = 'associado';
  assert.throws(() => h.c.listarSnapshotSumulasAnalisadas(), /permissão/);
  h.user.usuario.perfil = 'diretoria';
  assert.throws(() => h.c.recalcularSnapshotSumulas(), /admin/);
  h.user.usuario.perfil = 'admin';
  h.c.semFonte = true;
  assert.throws(() => h.c.listarSnapshotSumulasAnalisadas(), /fonte/);
  h.c.semFonte = false;
  h.config.sumulas.snapshotOwnerEmail = 'outro@example.test';
  assert.throws(() => h.c.recalcularSnapshotSumulas(), /proprietário/);
  h.config.sumulas.snapshotOwnerEmail = h.user.email;
  h.config.sumulas.snapshotPastaId = h.config.solicitacoes.snapshotPastaId;
  assert.throws(() => h.c.recalcularSnapshotSumulas(), /dedicada/);
});

test('banco de atletas mantém caminho vivo, sem pré-carga do relato', () => {
  const h = fixture();
  h.c.recalcularSnapshotSumulas();
  h.reset();
  h.c.lerSumulas_(true);
  assert.deepEqual(h.reads, { txt: 3, snapshot: 0 });
});

function uiFixture() {
  const calls = [], renders = [];
  const nodes = { statusSumulas: { innerHTML: '' }, buscaSumulas: { value: '' }, filtroEquipeSumulas: { value: '' } };
  const filtros = [{ dataset: { filtro: 'situacao' }, value: '' }];
  const c = vm.createContext({ moduloAtual: 'sumulas',
    document: { getElementById: id => nodes[id] || null }, conteudo: { querySelectorAll: () => filtros },
    consumirBusca: () => '', removerOverlayPunicoes_: () => {}, blocoErro_: erro => 'ERRO: ' + erro,
    abrirModulo: () => {},
    google: { script: { get run() {
      let success, failure;
      const rpc = { withSuccessHandler(fn) { success = fn; return rpc; },
        withFailureHandler(fn) { failure = fn; return rpc; } };
      for (const method of ['listarSumulas', 'listarSnapshotSumulasAnalisadas', 'recalcularSnapshotSumulas']) {
        rpc[method] = () => calls.push({ method, success, failure });
      }
      return rpc;
    } } }
  });
  const start = html.indexOf('    let sumulas =');
  const end = html.indexOf('    function montarTelaSumulas(', start);
  vm.runInContext(html.slice(start, end), c);
  c.montarTelaSumulas = (visual, aviso) => {
    renders.push({ dados: clone(vm.runInContext('sumulas', c)), visual: clone(visual), aviso });
  };
  return { c, calls, renders, nodes, filtros };
}
const previa = { registros: [{ arquivoNome: 'SUMULA_1.txt' }], provisorio: true };
const atual = { registros: [{ arquivoNome: 'SUMULA_1.txt' }, { arquivoNome: 'SUMULA_2.txt' }], provisorio: false };

test('UI exibe prévia, preserva filtros/busca/detalhes e troca pela consulta atual', () => {
  const h = uiFixture();
  h.c.carregarSumulas();
  h.calls[0].success(previa);
  assert.equal(h.renders[0].dados.provisorio, true);
  assert.match(h.renders[0].aviso, /Aguardando e Falha/);
  h.nodes.buscaSumulas.value = 'árbitro';
  h.filtros[0].value = 'Analisada';
  vm.runInContext('sumulasAbertas["SUMULA_1.txt"] = true', h.c);
  h.calls[1].success(atual);
  assert.equal(h.renders[1].dados.provisorio, false);
  assert.equal(h.renders[1].visual.busca, 'árbitro');
  assert.equal(h.renders[1].visual.filtros.situacao, 'Analisada');
  assert.equal(h.renders[1].visual.abertas['SUMULA_1.txt'], true);
});

test('UI ignora prévia tardia após final e callbacks de cargas/navegação antigas', () => {
  const h = uiFixture();
  h.c.carregarSumulas();
  h.calls[1].success(atual);
  h.calls[0].success(previa);
  assert.equal(h.renders.length, 1);
  h.c.carregarSumulas();
  h.calls[1].success(previa);
  assert.equal(h.renders.length, 1);
  h.c.moduloAtual = 'notas';
  h.calls[3].success(atual);
  assert.equal(h.renders.length, 1);
});

test('UI usa final se prévia falha, sinaliza erro completo e mantém histórico se final falha', () => {
  const h = uiFixture();
  h.c.carregarSumulas();
  h.calls[0].failure(new Error('sem snapshot'));
  h.calls[1].success(atual);
  assert.equal(h.renders.length, 1);
  h.c.carregarSumulas();
  h.calls[3].failure(new Error('Drive indisponível'));
  h.calls[2].failure(new Error('sem snapshot'));
  assert.match(h.nodes.statusSumulas.innerHTML, /ERRO: Drive indisponível/);
  h.c.carregarSumulas();
  h.calls[4].success(previa);
  h.calls[5].failure(new Error('Drive indisponível'));
  assert.match(h.renders.at(-1).aviso, /tente Atualizar/);
});

test('UI final vazio não deixa histórico antigo visível; explicação não afirma ausência de punições na prévia', () => {
  const h = uiFixture();
  h.c.carregarSumulas();
  h.calls[0].success(previa);
  h.calls[1].success({ registros: [], provisorio: false });
  assert.equal(h.renders.at(-1).dados.registros.length, 0);
  const start = html.indexOf('    function blocoNota(');
  assert.match(html.slice(start, start + 350), /if \(sumulas\.provisorio\)/);
  assert.match(server, /function moverParaAnalisadas\(arquivo\) \{\s+invalidarSnapshotSumulas_\(\)/);
  assert.match(server, /resultados\.sumulas = gerarSnapshotSumulasAnalisadas_\(\)/);
});

test('JavaScript completo compila sem executar APIs; template Apps Script é substituído só no teste', () => {
  new vm.Script(server);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert(scripts.length);
  for (const [, script] of scripts) new vm.Script(script.replace(/<\?[\s\S]*?\?>/g, '{}'));
});
