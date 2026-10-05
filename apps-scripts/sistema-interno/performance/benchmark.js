/* Cole no Console do iframe autenticado do Apps Script. Nao publicar no WebApp. */
(function instalarBenchmark(global) {
  'use strict';
  if (global.aeuvPerformance) {
    throw new Error('Benchmark ja instalado. Use aeuvPerformance.desinstalar() antes de reinstalar.');
  }
  if (!global.google || !global.google.script || !global.google.script.run) {
    throw new Error('Selecione no Console o iframe do sistema que possui google.script.run.');
  }

  const consultas = {
    listarEquipesParticipantes: dados => Array.isArray(dados.campeonatos) && Array.isArray(dados.registros),
    listarElenco: dados => Boolean(dados.equipe) && Array.isArray(dados.registros),
    listarTabelaCampeonato: dados => Array.isArray(dados.jogos) && Array.isArray(dados.equipes)
  };
  const metodos = new Set([
    ...Object.keys(consultas), 'transferirAtletaElenco', 'removerCadastroElenco',
    'salvarCadastroElenco', 'removerJogoCampeonato', 'salvarJogoCampeonato',
    'salvarCriteriosTabelaCampeonato'
  ]);
  const registros = [];
  let etiqueta = 'sem-etiqueta', executando = false, instalado = true;
  const aberturas = new WeakMap();
  const xhrPrototype = global.XMLHttpRequest.prototype;
  const originalOpen = xhrPrototype.open;
  const originalSend = xhrPrototype.send;
  const bytes = texto => new TextEncoder().encode(texto).byteLength;

  function validarEtiqueta(valor) {
    if (typeof valor !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(valor)) {
      throw new Error('Use uma etiqueta de 1 a 80 caracteres: letras, numeros, ponto, _ ou -.');
    }
    return valor;
  }

  function registrar(dados) {
    registros.push({ etiqueta, registradoEm: new Date().toISOString(), ...dados });
    console.info('[AEUV performance]', dados.metodo, dados.tipo, dados.estado,
      (dados.duracaoMs / 1000).toFixed(2) + ' s', dados.bytesResposta + ' bytes');
  }

  function metodoRequisicao(corpo) {
    if (typeof corpo !== 'string' && !(corpo instanceof URLSearchParams)) return '';
    const request = new URLSearchParams(corpo).get('request');
    if (!request) return '';
    let envelope;
    try {
      envelope = JSON.parse(request);
    } catch (erro) {
      if (!(erro instanceof SyntaxError)) throw erro;
      console.warn('[AEUV performance] Envelope RPC nao reconhecido; requisicao nao medida.');
      return '';
    }
    return Array.isArray(envelope) && metodos.has(envelope[0]) ? envelope[0] : '';
  }

  function tamanhoResposta(xhr) {
    if (xhr.responseType === 'arraybuffer') return xhr.response ? xhr.response.byteLength : 0;
    if (xhr.responseType === 'blob') return xhr.response ? xhr.response.size : 0;
    if (xhr.responseType === 'json') return bytes(JSON.stringify(xhr.response));
    if (xhr.responseType === '' || xhr.responseType === 'text') return bytes(xhr.responseText || '');
    return null;
  }

  function open(metodo, url, ...resto) {
    const destino = new URL(String(url), global.location.href);
    aberturas.set(this, destino.hostname === 'script.google.com' && destino.pathname.endsWith('/callback'));
    return originalOpen.call(this, metodo, url, ...resto);
  }

  function send(corpo) {
    const metodo = aberturas.get(this) ? metodoRequisicao(corpo) : '';
    if (!metodo) return originalSend.call(this, corpo);
    const inicio = performance.now();
    const etiquetaInicio = etiqueta;
    const modo = executando ? 'consulta-automatica' : 'acao-manual';
    const finalizar = () => {
      registrar({
        etiqueta: etiquetaInicio, tipo: 'transporte', modo, metodo,
        duracaoMs: performance.now() - inicio,
        bytesResposta: tamanhoResposta(this), http: this.status,
        estado: this.status >= 200 && this.status < 300 ? 'http-ok-nao-validado' : 'erro-http-ou-rede'
      });
    };
    this.addEventListener('loadend', finalizar, { once: true });
    try {
      return originalSend.call(this, corpo);
    } catch (erro) {
      this.removeEventListener('loadend', finalizar);
      throw erro;
    }
  }

  function chamadaConsulta(metodo, argumentos) {
    const inicio = performance.now(), etiquetaInicio = etiqueta;
    return new Promise((resolve, reject) => {
      global.google.script.run.withSuccessHandler(dados => {
        const duracaoMs = performance.now() - inicio;
        const valido = dados && consultas[metodo](dados);
        registrar({
          etiqueta: etiquetaInicio, tipo: 'rpc', modo: 'consulta-automatica', metodo,
          duracaoMs, bytesResposta: bytes(JSON.stringify(dados)),
          estado: valido ? 'sucesso' : 'contrato-invalido'
        });
        if (!valido) return reject(new Error('Contrato de resposta invalido: ' + metodo));
        resolve();
      }).withFailureHandler(() => {
        registrar({
          etiqueta: etiquetaInicio, tipo: 'rpc', modo: 'consulta-automatica', metodo,
          duracaoMs: performance.now() - inicio, bytesResposta: 0, estado: 'erro-aplicacao'
        });
        // Mensagens do servidor podem conter dados pessoais; nao entram no relatorio.
        reject(new Error('A consulta falhou: ' + metodo + '. Verifique sessao e permissoes.'));
      })[metodo](...argumentos);
    });
  }

  function resumo() {
    const grupos = new Map();
    registros.forEach(item => {
      const chave = [item.etiqueta, item.tipo, item.modo, item.metodo, item.estado].join('|');
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(item);
    });
    return [...grupos.values()].map(itens => {
      const tempos = itens.map(item => item.duracaoMs).sort((a, b) => a - b);
      const meio = Math.floor(tempos.length / 2);
      const mediana = tempos.length % 2 ? tempos[meio] : (tempos[meio - 1] + tempos[meio]) / 2;
      return {
        etiqueta: itens[0].etiqueta, tipo: itens[0].tipo, modo: itens[0].modo,
        metodo: itens[0].metodo, estado: itens[0].estado, amostras: itens.length,
        primeiraMs: itens[0].duracaoMs, minMs: tempos[0], medianaMs: mediana,
        p95Ms: tempos[Math.ceil(tempos.length * 0.95) - 1], maxMs: tempos[tempos.length - 1],
        mediaBytes: itens.every(item => item.bytesResposta !== null)
          ? itens.reduce((soma, item) => soma + item.bytesResposta, 0) / itens.length : null
      };
    });
  }

  xhrPrototype.open = open;
  xhrPrototype.send = send;
  global.aeuvPerformance = {
    marcar(valor) { etiqueta = validarEtiqueta(valor); },
    async executarConsultas(opcoes) {
      if (!instalado || executando) throw new Error('Benchmark desinstalado ou consulta em andamento.');
      const config = opcoes || {};
      if (!config.campeonatoId || !config.equipeId) {
        throw new Error('Informe campeonatoId e equipeId da base que deseja medir.');
      }
      const repeticoes = config.repeticoes === undefined ? 3 : config.repeticoes;
      if (!Number.isInteger(repeticoes) || repeticoes < 1 || repeticoes > 10) {
        throw new Error('Use de 1 a 10 repeticoes sequenciais.');
      }
      etiqueta = validarEtiqueta(config.etiqueta || etiqueta);
      executando = true;
      try {
        for (let i = 0; i < repeticoes; i++) {
          await chamadaConsulta('listarEquipesParticipantes', [config.campeonatoId]);
          await chamadaConsulta('listarElenco', [config.campeonatoId, config.equipeId]);
          await chamadaConsulta('listarTabelaCampeonato', [config.campeonatoId]);
        }
        console.table(resumo());
        return resumo();
      } finally {
        executando = false;
      }
    },
    resumo() { const dados = resumo(); console.table(dados); return dados; },
    exportar() {
      const relatorio = {
        schema: 'aeuv.performance', versao: 1, exportadoEm: new Date().toISOString(),
        registros: registros.map(item => ({ ...item })), resumo: resumo()
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(relatorio, null, 2)], { type: 'application/json' }));
      const link = global.document.createElement('a');
      link.href = url;
      link.download = 'aeuv-performance-' + Date.now() + '.json';
      global.document.body.appendChild(link);
      link.click();
      link.remove();
      global.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return relatorio;
    },
    limpar() {
      if (executando) throw new Error('Aguarde as consultas terminarem antes de limpar.');
      registros.length = 0;
    },
    desinstalar() {
      if (executando) throw new Error('Aguarde as consultas terminarem antes de desinstalar.');
      if (xhrPrototype.open !== open || xhrPrototype.send !== send) {
        throw new Error('Outro monitor alterou XMLHttpRequest. Recarregue a pagina para remover com seguranca.');
      }
      xhrPrototype.open = originalOpen;
      xhrPrototype.send = originalSend;
      instalado = false;
      delete global.aeuvPerformance;
    }
  };
  console.info('[AEUV performance] Instalado. Acoes manuais serao medidas sem repeticao ou alteracao de payload.');
})(window);
