'use strict';
const fs = require('node:fs');
const metodos = new Set([
  'listarEquipesParticipantes', 'listarElenco', 'listarTabelaCampeonato',
  'transferirAtletaElenco', 'removerCadastroElenco', 'salvarCadastroElenco',
  'removerJogoCampeonato', 'salvarJogoCampeonato', 'salvarCriteriosTabelaCampeonato'
]);

function analisar(har, etiqueta) {
  if (!har || !har.log || !Array.isArray(har.log.entries)) {
    throw new Error('Arquivo HAR invalido: log.entries ausente.');
  }
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(etiqueta || '')) throw new Error('Etiqueta invalida.');
  const registros = [];
  for (const entry of har.log.entries) {
    const request = entry.request;
    if (!request || !request.url) continue;
    const url = new URL(request.url);
    if (url.hostname !== 'script.google.com' || !url.pathname.endsWith('/callback')) continue;
    const post = request.postData || {};
    const raw = post.text ? new URLSearchParams(post.text).get('request')
      : (post.params || []).find(item => item.name === 'request')?.value;
    if (!raw) continue;
    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch (erro) {
      if (!(erro instanceof SyntaxError)) throw erro;
      throw new Error('Envelope de callback invalido no HAR; capture novamente.');
    }
    if (!Array.isArray(envelope) || !metodos.has(envelope[0])) continue;
    if (!Number.isFinite(entry.time) || entry.time < 0) throw new Error('Tempo invalido no HAR.');
    const response = entry.response || {};
    const validSize = value => Number.isFinite(value) && value >= 0 ? value : null;
    const timing = name => validSize((entry.timings || {})[name]);
    registros.push({
      etiqueta, sequencia: registros.length + 1, metodo: envelope[0],
      duracaoMs: entry.time, esperaMs: timing('wait'), recebimentoMs: timing('receive'),
      bytesCorpoTransferido: validSize(response.bodySize),
      bytesConteudo: validSize((response.content || {}).size),
      http: response.status || 0,
      estado: response.status >= 200 && response.status < 300 ? 'http-ok-nao-validado' : 'erro-http-ou-rede'
    });
  }
  if (!registros.length) throw new Error('Nenhum callback conhecido com payload encontrado. Exporte o HAR com dados de requisicao.');
  const grupos = new Map();
  registros.forEach(item => {
    const key = item.metodo + '|' + item.estado;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(item);
  });
  const resumo = [...grupos.values()].map(itens => {
    const tempos = itens.map(item => item.duracaoMs).sort((a, b) => a - b);
    const meio = Math.floor(tempos.length / 2);
    return {
      metodo: itens[0].metodo, estado: itens[0].estado, amostras: itens.length,
      primeiraMs: itens[0].duracaoMs,
      medianaMs: tempos.length % 2 ? tempos[meio] : (tempos[meio - 1] + tempos[meio]) / 2,
      p95Ms: tempos[Math.ceil(tempos.length * 0.95) - 1],
      mediaBytesConteudo: itens.every(item => item.bytesConteudo !== null)
        ? itens.reduce((total, item) => total + item.bytesConteudo, 0) / itens.length : null
    };
  });
  return { schema: 'aeuv.performance.har', versao: 1, etiqueta, registros, resumo };
}

module.exports = { analisar };
if (require.main === module) {
  const [arquivo, etiqueta] = process.argv.slice(2);
  if (!arquivo || !etiqueta) {
    console.error('Uso: node analisar-har.cjs CAMINHO.har ETIQUETA > metricas.json');
    process.exitCode = 1;
  } else {
    try {
      console.log(JSON.stringify(analisar(JSON.parse(fs.readFileSync(arquivo, 'utf8')), etiqueta), null, 2));
    } catch (erro) {
      // Nao imprimir mensagens de parsing que podem conter trechos privados do HAR.
      console.error('Nao foi possivel analisar o HAR. Confira formato, payloads, tempos e etiqueta.');
      process.exitCode = 1;
    }
  }
}
