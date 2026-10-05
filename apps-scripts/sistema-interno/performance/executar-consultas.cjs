'use strict';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

function configurar(config) {
  const url = new URL(config.callbackUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com'
      || url.port || url.username || url.password
      || !/^\/macros\/s\/[^/]+\/callback$/.test(url.pathname) || !url.searchParams.get('token')) {
    throw new Error('callbackUrl deve ser o callback HTTPS do Apps Script com token.');
  }
  const referer = new URL(config.referer);
  if (referer.origin !== url.origin || referer.pathname !== url.pathname.replace(/callback$/, 'exec')) {
    throw new Error('Referer deve corresponder a mesma implantacao.');
  }
  if (![config.campeonatoId, config.equipeId].every(id => typeof id === 'string' && id.trim())) {
    throw new Error('Informe campeonatoId e equipeId.');
  }
  const repeticoes = config.repeticoes === undefined ? 3 : config.repeticoes;
  if (!Number.isInteger(repeticoes) || repeticoes < 1 || repeticoes > 10) throw new Error('Use de 1 a 10 repeticoes.');
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(config.etiqueta || '')) throw new Error('Etiqueta invalida.');
  if (config.cookie !== undefined && typeof config.cookie !== 'string') throw new Error('Cookie invalido.');
  citar(config.cookie || '');
  citar(config.userAgent || '');
  return { ...config, repeticoes, url, referer };
}

function citar(valor) {
  if (/[\r\n\0]/.test(String(valor))) throw new Error('Configuracao contem caracteres de controle.');
  return '"' + String(valor).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function entradaCurl(config, metodo, argumentos, sequencia) {
  const url = new URL(config.url);
  url.searchParams.set('nocache_id', String(Date.now()) + '-' + sequencia);
  const request = JSON.stringify([metodo, JSON.stringify(argumentos), null, [0], null, null, 1, 0]);
  const linhas = [
    'url = ' + citar(url.href), 'request = "POST"', 'silent', 'show-error',
    'connect-timeout = 20', 'max-time = 180', 'compressed',
    'header = "X-Same-Domain: 1"',
    'header = "Content-Type: application/x-www-form-urlencoded;charset=UTF-8"',
    'header = ' + citar('Referer: ' + config.referer.href),
    'data = ' + citar(new URLSearchParams({ request }).toString()),
    'write-out = "\\nAEUV_METRICS:%{json}"'
  ];
  if (config.cookie) linhas.push('header = ' + citar('Cookie: ' + config.cookie));
  if (config.userAgent) linhas.push('user-agent = ' + citar(config.userAgent));
  return linhas.join('\n') + '\n';
}

function decodificar(saida) {
  const marker = '\nAEUV_METRICS:';
  const index = saida.lastIndexOf(marker);
  if (index < 0) throw new Error('Metricas curl ausentes.');
  const metrics = JSON.parse(saida.slice(index + marker.length));
  if (![metrics.http_code, metrics.time_total, metrics.time_starttransfer, metrics.size_download]
    .every(value => Number.isFinite(value) && value >= 0)) {
    throw new Error('Metricas curl invalidas.');
  }
  const body = saida.slice(0, index);
  const html = /^\s*(?:<!doctype|<html)/i.test(body);
  return {
    http: metrics.http_code,
    duracaoMs: metrics.time_total * 1000,
    primeiroByteMs: metrics.time_starttransfer * 1000,
    bytesTransferidos: metrics.size_download,
    bytesResposta: Buffer.byteLength(body),
    estado: metrics.http_code >= 200 && metrics.http_code < 300 && !html
      ? 'http-ok-nao-validado' : html ? 'pagina-html-nao-e-rpc' : 'erro-http'
  };
}

function executar(config, transportar = entrada => execFileSync(
  process.platform === 'win32' ? 'curl.exe' : 'curl',
  ['--config', '-'], { input: entrada, encoding: 'utf8', timeout: 190000,
    maxBuffer: 100 * 1024 * 1024, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
)) {
  const validada = configurar(config);
  const registros = [];
  let interrompido = false;
  const cenarios = [
    ['listarEquipesParticipantes', [validada.campeonatoId]],
    ['listarElenco', [validada.campeonatoId, validada.equipeId]],
    ['listarTabelaCampeonato', [validada.campeonatoId]]
  ];
  rodada: for (let rodada = 1; rodada <= validada.repeticoes; rodada++) {
    for (const [metodo, argumentos] of cenarios) {
      const sequencia = registros.length + 1;
      let dados;
      try {
        dados = decodificar(transportar(entradaCurl(validada, metodo, argumentos, sequencia)));
      } catch (erro) {
        // stderr, mensagens e corpo podem conter credenciais/dados pessoais.
        dados = { estado: 'erro-curl-ou-resposta', http: null, duracaoMs: null,
          primeiroByteMs: null, bytesTransferidos: null, bytesResposta: null };
      }
      registros.push({ metodo, rodada, sequencia, ...dados });
      if (dados.estado !== 'http-ok-nao-validado') {
        interrompido = true;
        break rodada;
      }
    }
  }
  const resumo = cenarios.map(([metodo]) => {
    const itens = registros.filter(item => item.metodo === metodo && item.estado === 'http-ok-nao-validado');
    const tempos = itens.map(item => item.duracaoMs).sort((a, b) => a - b);
    const meio = Math.floor(tempos.length / 2);
    return { metodo, amostrasHttpOkNaoValidadas: itens.length,
      medianaMs: !tempos.length ? null : tempos.length % 2
        ? tempos[meio] : (tempos[meio - 1] + tempos[meio]) / 2,
      p95Ms: tempos.length ? tempos[Math.ceil(tempos.length * 0.95) - 1] : null,
      mediaBytes: itens.length ? itens.reduce((total, item) => total + item.bytesResposta, 0) / itens.length : null };
  });
  return { schema: 'aeuv.performance.curl', versao: 1, etiqueta: validada.etiqueta,
    registradoEm: new Date().toISOString(), interrompido, registros, resumo };
}

module.exports = { configurar, entradaCurl, decodificar, executar };
if (require.main === module) {
  const [arquivo] = process.argv.slice(2);
  if (!arquivo) {
    console.error('Uso: node executar-consultas.cjs config.local.json > metricas.json');
    process.exitCode = 1;
  } else {
    try {
      const relatorio = executar(JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, '')));
      console.log(JSON.stringify(relatorio, null, 2));
      if (relatorio.interrompido) {
        console.error('Coleta interrompida. Confira status no relatorio, autenticacao, curl e conectividade.');
        process.exitCode = 1;
      }
    } catch (erro) {
      console.error('Configuracao invalida ou ilegivel. Confira o exemplo; dados privados nao foram exibidos.');
      process.exitCode = 1;
    }
  }
}
