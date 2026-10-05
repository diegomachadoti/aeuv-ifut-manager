const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'benchmark.js'), 'utf8');

function harness() {
  let clock = 0;
  const pending = [], downloads = [], messages = [];
  class XMLHttpRequest {
    constructor() { this.listeners = new Map(); this.responseType = ''; this.status = 0; this.responseText = ''; }
    open(method, url) { this.method = method; this.url = url; }
    send(body) { this.body = body; if (this.throwSend) throw new Error('send failed'); }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    removeEventListener(name, callback) { if (this.listeners.get(name) === callback) this.listeners.delete(name); }
    finish(status, response) {
      this.status = status;
      this.responseText = response;
      const callback = this.listeners.get('loadend');
      this.listeners.delete('loadend');
      if (callback) callback();
    }
  }
  const originalOpen = XMLHttpRequest.prototype.open, originalSend = XMLHttpRequest.prototype.send;
  const runner = new Proxy({}, {
    get(_target, name) {
      if (name === 'withSuccessHandler') return success => {
        return { withFailureHandler: failure => new Proxy({}, {
          get(_builder, method) { return (...args) => pending.push({ method, args, success, failure }); }
        }) };
      };
    }
  });
  const window = {
    XMLHttpRequest, google: { script: { run: runner } },
    location: { href: 'https://script.google.com/macros/s/mock/exec' },
    document: {
      body: { appendChild() {} },
      createElement: () => ({ click() { downloads.push(this.download); }, remove() {} })
    },
    setTimeout(fn) { fn(); }
  };
  const context = vm.createContext({
    window, console: { info: (...args) => messages.push(args), warn: (...args) => messages.push(args), table() {} },
    URL, URLSearchParams, TextEncoder, Blob, performance: { now: () => clock }, Date
  });
  vm.runInContext(source, context);
  return { window, context, pending, downloads, messages, api: window.aeuvPerformance,
    tick(ms) { clock += ms; }, originalOpen, originalSend };
}
const config = { campeonatoId: 'private-championship', equipeId: 'private-team', etiqueta: 'v1', repeticoes: 1 };
const response = method => method === 'listarEquipesParticipantes'
  ? { campeonatos: [], registros: [] }
  : method === 'listarElenco' ? { equipe: { nome: 'Equipe' }, registros: [] }
    : { jogos: [], equipes: [] };
const report = h => JSON.parse(JSON.stringify(h.api.exportar()));

test('consultas sequenciais, contratos e metricas sem dados privados', async () => {
  const h = harness();
  const task = h.api.executarConsultas(config);
  for (const method of ['listarEquipesParticipantes', 'listarElenco', 'listarTabelaCampeonato']) {
    assert.equal(h.pending.length, 1);
    const call = h.pending.shift();
    assert.equal(call.method, method);
    h.tick(1500);
    call.success({ ...response(method), foto: 'PRIVATE-PHOTO', cpf: 'PRIVATE-CPF' });
    await Promise.resolve();
  }
  await task;
  const data = report(h);
  assert.equal(data.registros.length, 3);
  assert(data.registros.every(item => item.estado === 'sucesso' && item.duracaoMs === 1500));
  const serialized = JSON.stringify(data);
  for (const privateValue of ['PRIVATE-PHOTO', 'PRIVATE-CPF', config.campeonatoId, config.equipeId]) {
    assert(!serialized.includes(privateValue));
  }
  assert.equal(data.resumo[0].medianaMs, 1500);
  assert.equal(h.downloads.length, 1);
});

test('falhas de aplicacao e contratos invalidos interrompem sem medir sucesso', async () => {
  for (const failure of [true, false]) {
    const h = harness();
    const task = h.api.executarConsultas(config);
    const call = h.pending.shift();
    if (failure) call.failure({ message: 'PRIVATE-CPF TOKEN' });
    else call.success({ errado: true });
    await assert.rejects(task, failure ? /consulta falhou/ : /Contrato/);
    const data = report(h);
    assert.equal(h.pending.length, 0);
    assert.equal(data.registros[0].estado, failure ? 'erro-aplicacao' : 'contrato-invalido');
    assert(!JSON.stringify(data).includes('PRIVATE-CPF'));
  }
});

test('limites e exclusao de execucao simultanea', async () => {
  const h = harness();
  await assert.rejects(h.api.executarConsultas({}), /Informe/);
  await assert.rejects(h.api.executarConsultas({ ...config, repeticoes: 11 }), /repeticoes/);
  await assert.rejects(h.api.executarConsultas({ ...config, etiqueta: 'email@example.org' }), /etiqueta/);
  const task = h.api.executarConsultas(config);
  await assert.rejects(h.api.executarConsultas(config), /andamento/);
  assert.throws(() => h.api.limpar(), /Aguarde/);
  assert.throws(() => h.api.desinstalar(), /Aguarde/);
  h.pending.shift().failure({});
  await assert.rejects(task);
  h.api.limpar();
  assert.equal(report(h).registros.length, 0);
});

test('monitor manual nao reenvia gravacoes, distingue HTTP e preserva etiqueta do inicio', () => {
  const h = harness();
  h.api.marcar('antes');
  const xhr = new h.window.XMLHttpRequest();
  xhr.open('POST', 'https://script.google.com/macros/s/mock/callback?token=PRIVATE-TOKEN');
  const body = new URLSearchParams({ request: JSON.stringify([
    'transferirAtletaElenco', JSON.stringify([{ cpf: 'PRIVATE-CPF', registroId: 'PRIVATE-ID' }]), null
  ]) }).toString();
  xhr.send(body);
  h.api.marcar('depois');
  h.tick(2500);
  xhr.finish(200, '{"erro":"PRIVATE-SERVER-MESSAGE"}');
  assert.equal(xhr.body, body);
  assert.equal(h.pending.length, 0);
  const data = report(h);
  assert.equal(data.registros.length, 1);
  assert.equal(data.registros[0].estado, 'http-ok-nao-validado');
  assert.equal(data.registros[0].etiqueta, 'antes');
  assert.equal(data.registros[0].duracaoMs, 2500);
  for (const sensitive of ['PRIVATE-TOKEN', 'PRIVATE-CPF', 'PRIVATE-ID', 'PRIVATE-SERVER-MESSAGE']) {
    assert(!JSON.stringify(data).includes(sensitive));
    assert(!JSON.stringify(h.messages).includes(sensitive));
  }
});

test('ignora outras URLs e metodos; HTTP 401 nao entra no grupo de sucesso', () => {
  const h = harness();
  const send = (url, method, status) => {
    const xhr = new h.window.XMLHttpRequest();
    xhr.open('POST', url);
    xhr.send(new URLSearchParams({ request: JSON.stringify([method, '[]']) }).toString());
    xhr.finish(status, 'body');
  };
  send('https://example.org/callback', 'listarElenco', 200);
  send('https://script.google.com/exec', 'listarElenco', 200);
  send('https://script.google.com/callback', 'outroMetodo', 200);
  send('https://script.google.com/callback', 'listarElenco', 401);
  assert.equal(report(h).registros.length, 1);
  assert.equal(report(h).registros[0].estado, 'erro-http-ou-rede');
});

test('mediana e p95; instalacao e restauracao de XHR', () => {
  const h = harness();
  for (const duration of [100, 300, 200, 400]) {
    const xhr = new h.window.XMLHttpRequest();
    xhr.open('POST', '/callback');
    xhr.send(new URLSearchParams({ request: '["listarElenco","[]"]' }).toString());
    h.tick(duration);
    xhr.finish(200, 'resposta');
  }
  const summary = h.api.resumo()[0];
  assert.equal(summary.medianaMs, 250);
  assert.equal(summary.p95Ms, 400);
  assert.equal(summary.primeiraMs, 100);
  assert.equal(summary.mediaBytes, 8);
  assert.throws(() => vm.runInContext(source, h.context), /ja instalado/);
  h.api.desinstalar();
  assert.equal(h.window.XMLHttpRequest.prototype.open, h.originalOpen);
  assert.equal(h.window.XMLHttpRequest.prototype.send, h.originalSend);
  assert.equal(h.window.aeuvPerformance, undefined);
});

test('nao sobrescreve outro monitor e propaga erros de send', () => {
  const h = harness();
  const xhr = new h.window.XMLHttpRequest();
  xhr.throwSend = true;
  xhr.open('POST', '/callback');
  assert.throws(() => xhr.send('request=%5B%22listarElenco%22%2C%22%5B%5D%22%5D'), /send failed/);
  assert.equal(xhr.listeners.size, 0);
  const newerSend = () => {};
  h.window.XMLHttpRequest.prototype.send = newerSend;
  assert.throws(() => h.api.desinstalar(), /Outro monitor/);
  assert.equal(h.window.XMLHttpRequest.prototype.send, newerSend);
});

test('analise HAR preserva tempos e separa erros sem exportar payloads privados', () => {
  const { analisar } = require('./analisar-har.cjs');
  const entry = (time, status) => ({
    time, timings: { wait: time - 100, receive: 100 },
    request: {
      url: 'https://script.google.com/macros/s/mock/callback?token=PRIVATE-TOKEN',
      postData: { text: new URLSearchParams({
        request: JSON.stringify(['salvarCadastroElenco', '[{"cpf":"PRIVATE-CPF","foto":"PRIVATE-PHOTO"}]'])
      }).toString() }
    },
    response: { status, bodySize: 1000, content: { size: 2000, text: 'PRIVATE-RESPONSE' } }
  });
  const data = analisar({ log: { entries: [entry(1000, 200), entry(3000, 200), entry(20, 401)] } }, 'v1');
  assert.equal(data.registros.length, 3);
  assert.equal(data.resumo[0].medianaMs, 2000);
  assert.equal(data.resumo[1].estado, 'erro-http-ou-rede');
  assert.equal(data.registros[0].esperaMs, 900);
  for (const privateValue of ['PRIVATE-TOKEN', 'PRIVATE-CPF', 'PRIVATE-PHOTO', 'PRIVATE-RESPONSE']) {
    assert(!JSON.stringify(data).includes(privateValue));
  }
  const unknownSizes = entry(1000, 200);
  unknownSizes.response.bodySize = -1;
  unknownSizes.response.content.size = -1;
  assert.equal(analisar({ log: { entries: [unknownSizes] } }, 'v1').registros[0].bytesConteudo, null);
  assert.throws(() => analisar({ log: { entries: [] } }, 'v1'), /Nenhum callback/);
  assert.throws(() => analisar({}, 'v1'), /HAR invalido/);
});

test('executor curl so consulta, sem credenciais no relatorio e com corpo codificado', () => {
  const { executar } = require('./executar-consultas.cjs');
  const local = {
    callbackUrl: 'https://script.google.com/macros/s/mock/callback?token=PRIVATE-TOKEN',
    referer: 'https://script.google.com/macros/s/mock/exec',
    campeonatoId: 'PRIVATE-CHAMP', equipeId: 'PRIVATE-TEAM',
    cookie: 'PRIVATE-COOKIE', etiqueta: 'v1', repeticoes: 2
  };
  const calls = [];
  const output = (http, body = '{"private":"PRIVATE-RESPONSE"}') => body
    + '\nAEUV_METRICS:' + JSON.stringify({
      http_code: http, time_total: 1.5, time_starttransfer: 1, size_download: 42
    });
  const data = executar(local, entrada => { calls.push(entrada); return output(200); });
  assert.equal(calls.length, 6);
  assert.equal(data.resumo[0].medianaMs, 1500);
  assert.equal(data.interrompido, false);
  const body = JSON.parse(calls[1].split('\n').find(line => line.startsWith('data = ')).slice(7));
  const envelope = JSON.parse(new URLSearchParams(body).get('request'));
  assert.equal(envelope[0], 'listarElenco');
  assert.deepEqual(JSON.parse(envelope[1]), ['PRIVATE-CHAMP', 'PRIVATE-TEAM']);
  assert(calls.every(call => !call.includes('location =') && !call.includes('salvar')));
  for (const sensitive of ['PRIVATE-TOKEN', 'PRIVATE-COOKIE', 'PRIVATE-RESPONSE', 'PRIVATE-CHAMP', 'PRIVATE-TEAM']) {
    assert(!JSON.stringify(data).includes(sensitive));
  }
  let requests = 0;
  const failed = executar(local, () => { requests++; return output(401); });
  assert.equal(requests, 1);
  assert.equal(failed.interrompido, true);
  assert.equal(failed.registros[0].estado, 'erro-http');
  assert.equal(failed.resumo[0].medianaMs, null);
  assert.equal(executar(local, () => output(200, '<!DOCTYPE html><html>login</html>')).interrompido, true);
  const broken = executar(local, () => { throw new Error('PRIVATE-COOKIE'); });
  assert.equal(broken.registros[0].estado, 'erro-curl-ou-resposta');
  assert(!JSON.stringify(broken).includes('PRIVATE-COOKIE'));
  assert.throws(() => executar({ ...local, callbackUrl: 'https://example.org/callback?token=abc' }), /callback/);
  assert.throws(() => executar({ ...local, cookie: 'cookie\r\nurl = "https://example.org"' }), /controle/);
});
