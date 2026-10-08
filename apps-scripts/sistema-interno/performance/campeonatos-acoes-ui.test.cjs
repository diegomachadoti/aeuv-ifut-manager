const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');

function fixture(modulo = 'times-campeonato') {
  const elements = new Map(), requests = [], renders = [], reloads = [], modals = [];
  let c;
  class Element {
    constructor(id, tag = 'div', parent = null) {
      this.id = id; this.tagName = tag; this.parent = parent; this.children = [];
      this.disabled = false; this.hidden = false; this.isConnected = true;
      this.textContent = ''; this.value = ''; this.className = ''; this.attributes = {};
      this.handlers = {}; this._html = '';
      if (id) elements.set(id, this);
      if (parent) parent.children.push(this);
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    click() { if (this.handlers.click) this.handlers.click.call(this); }
    focus() { c.document.activeElement = this; }
    scrollIntoView(options) { this.scrolled = options; }
    remove() {
      this.children.slice().forEach(child => child.remove());
      this.isConnected = false;
      if (elements.get(this.id) === this) elements.delete(this.id);
      if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
    }
    get innerHTML() { return this._html; }
    set innerHTML(value) {
      this.children.slice().forEach(child => child.remove());
      this._html = String(value); this.parse(value);
    }
    insertAdjacentHTML(position, value) {
      this._html = position === 'afterbegin' ? value + this._html : this._html + value;
      this.parse(value);
    }
    parse(value) {
      for (const match of String(value).matchAll(/<([a-z][\w]*)\b([^>]*)>([^<>]*)/gi)) {
        const id = /\bid="([^"]+)"/.exec(match[2]);
        const classes = /\bclass="([^"]+)"/.exec(match[2]);
        if (!id && !(classes && /carregando|erro/.test(classes[1]))) continue;
        const element = new Element(id ? id[1] : '', match[1], this);
        element.className = classes ? classes[1] : '';
        element.textContent = match[3];
        element.disabled = /\bdisabled(?:\s|=|$)/.test(match[2]);
        element.hidden = /\bhidden(?:\s|=|$)/.test(match[2]);
      }
    }
    descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
    querySelectorAll(selector) {
      return this.descendants().filter(child => selector === 'button,select'
        ? ['button', 'select'].includes(child.tagName) : false);
    }
    querySelector(selector) {
      return this.descendants().find(child => child.className.split(' ').includes(selector.slice(1))) || null;
    }
  }
  const area = new Element('areaTimesCampeonato');
  const vincular = new Element('epVincular', 'button', area);
  vincular.textContent = 'Vincular equipe existente';
  const recalcular = new Element('epRecalcular', 'button', area);
  recalcular.textContent = 'Recalcular agora';
  new Element('epCampeonato', 'select', area);
  const bloqueado = new Element('controleBloqueado', 'button', area);
  bloqueado.disabled = true;
  new Element('timesFormArea', 'div', area);
  const areaCampeonatos = new Element('areaCampeonatos');
  areaCampeonatos.innerHTML = '<div>Lista de campeonatos</div>';
  c = vm.createContext({
    CONFIG: { usuario: { perfil: 'admin' } }, moduloAtual: modulo,
    elencoAtual: null, confirmacaoElencoAtual: null,
    participantesRequisicao: 0, campeonatoParticipantesAtual: 'c1',
    timesCampeonato: { podeEditar: true, registros: [{ campeonatoId: 'c1', times: [], timesDetalhados: [] }],
      equipesGlobais: [{ id: 'e1', nome: 'Equipe Teste' }] },
    campeonatos: { podeExcluir: true, registros: [{ id: 'c1', nome: 'Campeonato Teste' }] },
    escapar: String,
    blocoCarregando: id => '<div class="carregando"' + (id ? ' id="' + id + '"' : '') + '>Carregando</div>',
    window: { matchMedia: () => ({ matches: false }), confirm: () => { throw Error('Nao usar confirm do navegador'); } },
    document: { getElementById: id => elements.get(id) || null, activeElement: vincular },
    carregarTimesCampeonato: () => { reloads.push(true); area.innerHTML = '<div>Nova consulta</div>'; },
    montarEquipesParticipantes: recado => {
      renders.push(recado);
      vincular.disabled = false; recalcular.disabled = false;
      const form = elements.get('timesFormArea');
      if (form) form.remove();
      new Element('timesFormArea', 'div', area);
    },
    montarTelaCampeonatos: recado => { renders.push(recado); areaCampeonatos.innerHTML = '<div>Lista atualizada</div>'; },
    confirmarDescarteElenco_: options => new Promise(resolve => {
      c.confirmacaoElencoAtual = {};
      modals.push({ options, finish(value) { c.confirmacaoElencoAtual = null; resolve(value); } });
    }),
    google: { script: { get run() {
      const request = {};
      const runner = new Proxy({
        withSuccessHandler(handler) { request.success = handler; return runner; },
        withFailureHandler(handler) { request.failure = handler; return runner; }
      }, { get(target, name) {
        return target[name] || ((...args) => { request.method = name; request.args = args; requests.push(request); });
      } });
      return runner;
    } } }
  });
  vm.runInContext(html.slice(html.indexOf('    function focarAvisoOuFormulario_('),
    html.indexOf('    function acompanharFocoCarregamento(')), c);
  vm.runInContext(html.slice(html.indexOf('    let campeonatoRemovendo_ ='),
    html.indexOf('    let timesCampeonato =')), c);
  vm.runInContext(html.slice(html.indexOf('    let participantesRecalculando_ ='),
    html.indexOf('    function montarTelaTimesCampeonato(')), c);
  vm.runInContext(html.slice(html.indexOf('    function abrirVinculoEquipeParticipante('),
    html.indexOf('    function abrirElenco(')), c);
  return { c, elements, requests, renders, reloads, modals, area, areaCampeonatos, vincular, recalcular, bloqueado };
}

test('abrir vinculo mostra loading, move foco e bloqueia duplo clique/recalculo', () => {
  const h = fixture();
  h.c.abrirVinculoEquipeParticipante();
  h.c.abrirVinculoEquipeParticipante();
  h.c.recalcularParticipantesAgora_();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].method, 'carregarEquipesParticipantesAtual');
  assert(h.elements.has('epVinculoLoading'));
  assert.equal(h.c.document.activeElement.id, 'epVinculoTitulo');
  assert.equal(h.elements.get('epVinculoTitulo').scrolled.behavior, 'smooth');
  assert.equal(h.vincular.textContent, 'Carregando equipes...');
  assert(h.area.querySelectorAll('button,select').every(element => element.disabled));
  h.requests[0].success(h.c.timesCampeonato);
  assert(!h.elements.has('epVinculoLoading'));
  assert(h.elements.has('epEquipe'));
  assert.equal(h.c.document.activeElement.id, 'epVinculoTitulo');
});

test('erro ao carregar equipes limpa loading e restaura controles para tentar de novo', () => {
  const h = fixture();
  h.c.abrirVinculoEquipeParticipante();
  h.requests[0].failure(Error('Falha de consulta'));
  assert(!h.elements.has('epVinculoLoading'));
  assert.equal(h.vincular.disabled, false);
  assert.equal(h.bloqueado.disabled, true);
  assert.equal(h.vincular.textContent, 'Vincular equipe existente');
  assert.equal(h.c.document.activeElement.id, 'timesFormArea');
  h.c.abrirVinculoEquipeParticipante();
  assert.equal(h.requests.length, 2);
});

test('carregamento tardio nao abre formulario apos trocar campeonato ou modulo', () => {
  for (const field of ['campeonatoParticipantesAtual', 'moduloAtual']) {
    const h = fixture();
    h.c.abrirVinculoEquipeParticipante();
    h.c[field] = 'outro';
    h.requests[0].success(h.c.timesCampeonato);
    assert.equal(h.renders.length, 0);
    assert(!h.elements.has('epEquipe'));
  }
});

test('cancelar formulario de vinculo devolve foco ao botao de origem', () => {
  const h = fixture();
  h.c.abrirVinculoEquipeParticipante(true);
  h.elements.get('epCancelar').click();
  assert.equal(h.elements.get('timesFormArea').innerHTML, '');
  assert.equal(h.c.document.activeElement, h.vincular);
});

test('salvar vinculo mostra loading e erro libera tentativa sem dupla requisicao', () => {
  const h = fixture();
  h.c.abrirVinculoEquipeParticipante(true);
  const equipe = h.elements.get('epEquipe'), salvar = h.elements.get('epSalvar');
  equipe.value = 'e1'; equipe.handlers.change.call(equipe);
  salvar.click(); salvar.click();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].method, 'vincularEquipeParticipante');
  assert.equal(salvar.textContent, 'Vinculando...');
  assert.equal(h.elements.get('epLoading').hidden, false);
  h.requests[0].failure(Error('Falha ao vincular'));
  assert.equal(salvar.disabled, false);
  assert.equal(salvar.textContent, 'Vincular');
  assert.equal(equipe.disabled, false);
  assert.equal(h.bloqueado.disabled, true);
  assert.equal(h.elements.get('epLoading').hidden, true);
  salvar.click();
  h.requests[1].success(h.c.timesCampeonato);
  assert.equal(h.renders.at(-1), 'Equipe vinculada.');
});

test('recalcular mostra loading e preserva estados anteriores apos erro', () => {
  const h = fixture();
  h.c.recalcularParticipantesAgora_(); h.c.recalcularParticipantesAgora_();
  assert.equal(h.requests.length, 1);
  assert.equal(h.recalcular.textContent, 'Recalculando...');
  assert.equal(h.area.attributes['aria-busy'], 'true');
  assert.equal(h.c.document.activeElement.id, 'epRecalculoLoading');
  h.requests[0].failure(Error('Falha de recalculo'));
  assert(!h.elements.has('epRecalculoLoading'));
  assert.equal(h.area.attributes['aria-busy'], undefined);
  assert.equal(h.recalcular.textContent, 'Recalcular agora');
  assert.equal(h.recalcular.disabled, false);
  assert.equal(h.bloqueado.disabled, true);
  h.c.recalcularParticipantesAgora_();
  h.requests[1].success();
  assert.equal(h.reloads.length, 1);
});

test('remover campeonato pede modal customizado e cancelar nao envia RPC', async () => {
  const h = fixture('campeonatos');
  const promise = h.c.removerCampeonatoDoSistema('c1');
  h.c.removerCampeonatoDoSistema('c1');
  assert.equal(h.modals.length, 1);
  assert.equal(h.requests.length, 0);
  assert.equal(h.modals[0].options.confirmar, 'Remover campeonato');
  assert(h.modals[0].options.mensagem.includes('Campeonato Teste'));
  h.modals[0].finish(false);
  await promise;
  assert.equal(h.requests.length, 0);
});

test('confirmar exclusao mostra loading e erro retorna a lista', async () => {
  const h = fixture('campeonatos');
  const promise = h.c.removerCampeonatoDoSistema('c1');
  h.modals[0].finish(true); await promise;
  assert.equal(h.requests[0].method, 'removerCampeonato');
  assert.equal(h.c.document.activeElement.id, 'statusCampeonatos');
  h.c.removerCampeonatoDoSistema('c1');
  assert.equal(h.requests.length, 1);
  h.requests[0].failure(Error('Nao permitido'));
  assert.equal(h.renders.length, 1);
  assert(h.areaCampeonatos.innerHTML.includes('Nao permitido'));
  assert.equal(h.c.document.activeElement.className, 'erro');
});

test('confirmacao/callback de exclusao nao age em contexto abandonado e respeita permissao', async () => {
  const h = fixture('campeonatos');
  h.c.campeonatos.podeExcluir = false;
  h.c.removerCampeonatoDoSistema('c1');
  assert.equal(h.modals.length, 0);
  h.c.campeonatos.podeExcluir = true;
  const promise = h.c.removerCampeonatoDoSistema('c1');
  h.c.moduloAtual = 'times-campeonato';
  h.modals[0].finish(true); await promise;
  assert.equal(h.requests.length, 0);
  h.c.moduloAtual = 'campeonatos';
  const second = h.c.removerCampeonatoDoSistema('c1');
  h.modals[1].finish(true); await second;
  h.c.moduloAtual = 'financeiro';
  h.requests[0].success({ registros: [] });
  assert.equal(h.renders.length, 0);
});
