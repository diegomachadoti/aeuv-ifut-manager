// Tournament smoke and dedicated match-result regression tests.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const html = fs.readFileSync('apps-scripts\\sistema-interno\\Index.html', 'utf8');
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
  new vm.Script(match[1].replace(/<\?[\s\S]*?\?>/g, '{}'));
}
const elements = new Map();
const decode = text => String(text).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
class Element {
  constructor(id, tag = 'div', attrs = '') {
    this.id = id; this.tagName = tag; this.dataset = {}; this.disabled = /\bdisabled\b/.test(attrs);
    this.name = (attrs.match(/\bname="([^"]*)"/) || [,''])[1]; this.checked = /\bchecked\b/.test(attrs);
    this.type = (attrs.match(/\btype="([^"]*)"/) || [,''])[1];
    this.hidden = false; this.value = decode((attrs.match(/value="([^"]*)"/) || [,''])[1]);
    this.parentElement = { hidden: false }; this.listeners = {}; this.attrs = {};
    for (const m of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)) this.dataset[m[1].replace(/-([a-z])/g, (_,c) => c.toUpperCase())] = decode(m[2]);
    elements.set(id, this);
  }
  set innerHTML(value) {
    this._html = value;
    this.children = [];
    for (const m of value.matchAll(/<(button|input|select|textarea|form|div|section|p|span)\b([^>]*)>/g)) {
      const attrs = m[2], id = (attrs.match(/\bid="([^"]*)"/) || [,'anon-' + elements.size])[1];
      const child = new Element(id, m[1], attrs);
      child._html = value.slice(m.index + m[0].length).split('</' + m[1] + '>')[0];
      if (m[1] === 'select') {
        const options = value.slice(m.index + m[0].length).split('</select>')[0];
        child.options = [...options.matchAll(/<option value="([^"]*)"([^>]*)>/g)].map(o => ({ value: decode(o[1]), selected: /\bselected\b/.test(o[2]) }));
        child.value = (child.options.find(o => o.selected) || child.options[0] || { value: '' }).value;
      }
      if (m[1] === 'textarea') child.value = decode(value.slice(m.index + m[0].length).split('</textarea>')[0]);
      this.children.push(child);
    }
    for (const child of this.children.filter(e => e.tagName === 'form')) child.children = this.children.filter(e => e !== child);
    if (this.tagName === 'select') {
      this.options = [...value.matchAll(/<option value="([^"]*)"([^>]*)>/g)].map(o => ({ value: decode(o[1]), selected: /\bselected\b/.test(o[2]) }));
      this.value = (this.options.find(o => o.selected) || this.options[0] || { value: '' }).value;
    }
  }
  get innerHTML() { return this._html || ''; }
  querySelectorAll(selector) {
    const all = [...new Set((this.children || []).flatMap(e => [e, ...(e.children || [])]))];
    if (selector === 'button,input,select,textarea') return all.filter(e => ['button','input','select','textarea'].includes(e.tagName));
    if (selector === 'input,select,textarea') return all.filter(e => ['input','select','textarea'].includes(e.tagName));
    if (selector.startsWith('[data-')) {
      const name = selector.slice(6, -1).replace(/-([a-z])/g, (_,c) => c.toUpperCase());
      return all.filter(e => e.dataset[name] !== undefined);
    }
    if (selector.includes('data-tabela-acao')) return all.filter(e => e.dataset.tabelaAcao);
    if (selector.includes('data-tabela-aba')) return all.filter(e => e.dataset.tabelaAba);
    if (selector.includes('data-tabela-equipe')) return all.filter(e => e.dataset.tabelaEquipe);
    return [];
  }
  querySelector(selector) {
    if (selector.startsWith('#')) return elements.get(selector.slice(1));
    return (this.children || []).find(e => selector.split(',').includes(e.tagName)) || null;
  }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  focus() {} scrollIntoView() {} reportValidity() { return true; }
}
new Element('areaTabelaCampeonato');
const pending = [];
let downloads = 0, revoked = 0, confirmResult = true;
const runner = {
  withSuccessHandler(fn) { this.success = fn; return this; },
  withFailureHandler(fn) { this.failure = fn; return this; }
};
const run = new Proxy(runner, {
  get(target, name) {
    if (name in target) return target[name];
    return payload => pending.push({ name, payload, success: target.success, failure: target.failure });
  }
});
const context = vm.createContext({
  console, Uint8Array, Blob, Set, Promise, atob,
  URL: { createObjectURL: () => 'blob:pdf', revokeObjectURL: () => revoked++ },
  google: { script: { run } },
  document: {
    getElementById: id => elements.get(id) || null,
    querySelectorAll: selector => [...elements.values()].filter(e => (selector === '[data-tabela-equipe]' && e.dataset.tabelaEquipe)
      || (selector === '[name="cFaseEliminatoria"]:checked' && e.name === 'cFaseEliminatoria' && e.checked)),
    createElement: () => ({ click() { downloads++; }, remove() {} }),
    body: { appendChild() {} }
  },
  window: { addEventListener() {}, setTimeout(fn) { fn(); }, innerWidth: 1000, location: { hash: '#jogos-campeonato' } },
  sessionStorage: { values: {}, getItem(key) { return this.values[key] || null; }, setItem(key, value) { this.values[key] = value; } },
  moduloAtual: 'jogos-campeonato', confirmacaoElencoAtual: null,
  confirmarDescarteElenco_: () => Promise.resolve(confirmResult),
  moduloDisponivel: () => true,
  abrirModulo: id => { context.moduloAtual = id; },
  MODULOS: [{ id: 'jogos-campeonato' }, { id: 'campeonatos' }],
  elencoAtual: null, destacarMenu() {}, renderizarModulo() {},
  blocoCarregando: () => '<div class="carregando">Carregando</div>',
  formatarDataBr: x => x
});
function source(start, end) { return html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start))); }
vm.runInContext(source('    function escapar(valor)', '    function imagemUpload'), context);
vm.runInContext(source('    function opcoesSelect(', '    function campoTexto('), context);
vm.runInContext(source('    function campoTexto(', '    function montarTelaCampeonatos'), context);
vm.runInContext(source('    const tabelaEstado =', '    function carregarCampeonatos()'), context);
const evaluate = code => vm.runInContext(code, context);
const fixture = {
  campeonatos: [{ id: 'c1', nome: 'Copa <AEUV>', temporada: '2026' }, { id: 'c2', nome: 'Copa 2' }],
  campeonatoId: 'c1', campeonato: { id: 'c1', nome: 'Copa' }, estrutura: {}, revisao: 'r1', podeEditar: true,
  fases: [{ id: 'fase-classificacao', nome: 'Classificação', tipo: 'classificacao', rodadas: 2 }, { id: 'fase-final', nome: 'Final', tipo: 'eliminatoria', rodadas: 1 }],
  grupos: [{ id: 'grupo-1', nome: 'Grupo A', equipeIds: ['a','b'] }, { id: 'grupo-2', nome: 'Grupo B', equipeIds: ['c'] }],
  equipes: [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }, { id: 'c', nome: 'C' }],
  campos: [{ id: 'local', nome: 'Arena', endereco: '', ativo: true }],
  jogos: [{ id: 'j1', faseId: 'fase-classificacao', grupoId: 'grupo-1', rodada: 1, mandanteId: 'a', visitanteId: 'b', campoId: 'local', data: '2026-10-10', hora: '10:00', status: 'agendado', golsMandante: null, golsVisitante: null }],
  criterios: { pontosVitoria: 3, pontosEmpate: 1, pontosDerrota: 0, desempates: ['vitorias','saldoGols','golsPro'] },
  classificacao: { geral: [{ posicao: 1, equipeNome: 'A' }, { posicao: 1, equipeNome: 'B' }], grupos: [] }
};
context.fixture = fixture;
(async () => {
  context.carregarTabelaCampeonato_('');
  assert.equal(pending.length, 1);
  context.carregarTabelaCampeonato_('c2');
  assert.equal(pending.length, 1, 'duplicate reads blocked');
  assert.equal(evaluate('tabelaEstado.ocupado'), true);
  pending.shift().success(fixture);
  assert.equal(evaluate('tabelaEstado.campeonatoId'), 'c1');
  assert.equal(elements.get('areaTabelaCampeonato').attrs['aria-busy'], 'false');
  assert.match(elements.get('areaTabelaCampeonato').innerHTML, /Copa &lt;AEUV&gt;/);
  assert.match(elements.get('tabelaPainel').innerHTML, /Final/);
  assert.match(elements.get('tabelaPainel').innerHTML, /Nenhum jogo cadastrado nesta rodada/);
  context.abrirTabelaJogo_('j1');
  ['tjCampo', 'tjData', 'tjHora'].forEach(id => assert.equal(elements.get(id).required, true, id + ' required'));
  assert.equal(elements.get('tjMandante').value, 'a');
  assert.doesNotMatch(elements.get('tabelaFormArea').innerHTML, /tjGols|tjPlacar/);
  assert.deepEqual(elements.get('tjStatus').options.map(o => o.value), ['agendado', 'adiado', 'cancelado']);
  assert.deepEqual(elements.get('tjVisitante').options.map(o => o.value), ['', 'a', 'b']);
  elements.get('tjFase').value = 'fase-final';
  elements.get('tjFase').listeners.change();
  assert.equal(elements.get('tjGrupo').disabled, true);
  assert.deepEqual(elements.get('tjVisitante').options.map(o => o.value), ['', 'a', 'b', 'c']);
  elements.get('tjStatus').value = 'adiado';
  elements.get('tabelaFormulario').oninput();
  elements.get('tabelaFormulario').onsubmit({ preventDefault() {} });
  assert.equal(pending.length, 1);
  const save = pending.shift();
  assert.equal(save.name, 'salvarJogoCampeonato');
  assert.equal(save.payload.revisao, 'r1');
  assert.equal(save.payload.grupoId, '');
  assert.equal(save.payload.golsMandante, undefined);
  assert.equal(save.payload.golsVisitante, undefined);
  assert.equal(save.payload.resultado, undefined);
  assert.equal(save.payload.status, 'adiado');
  context.tabelaExecutar_('salvarCampoCampeonato', {});
  assert.equal(pending.length, 0, 'duplicate mutations blocked');
  save.failure(new Error('Conflito de revisão'));
  assert.equal(evaluate('tabelaEstado.sujo'), true);
  assert.equal(elements.get('tjStatus').value, 'adiado');
  assert.match(elements.get('tabelaMensagem').innerHTML, /Conflito de revisão/);
  assert.equal(elements.get('tjStatus').disabled, false);
  assert.equal(elements.get('tjGrupo').disabled, true, 'dependent disabled state restored');
  confirmResult = false;
  let navigated = false;
  context.tabelaNavegar_(() => { navigated = true; });
  await Promise.resolve();
  assert.equal(navigated, false, 'cancel preserves draft');
  assert.notEqual(elements.get('tabelaFormArea').innerHTML, '', 'canceled discard retains visible form');
  confirmResult = true;
  context.tabelaNavegar_(() => { navigated = true; });
  await Promise.resolve();
  assert.equal(navigated, true);
  assert.equal(evaluate('tabelaEstado.sujo'), false);
  assert.equal(elements.get('tabelaFormArea').innerHTML, '', 'confirmed discard removes edited form before subsequent action');
  assert.equal(evaluate('tabelaEstado.formulario'), '');
  context.abrirTabelaCriterios_();
  elements.get('tcrDesempate1').value = 'vitorias';
  elements.get('tcrDesempate1').onchange({ target: elements.get('tcrDesempate1') });
  assert.equal(pending.length, 0, 'duplicate tie keys rejected');
  assert.match(elements.get('tcrAviso').textContent, /diferentes/);
  assert.equal(elements.get('tcrDesempate1').value, 'saldoGols');
  elements.get('tcrDesempate1').value = 'saldoGols';
  elements.get('tcrVitoria').value = '999';
  elements.get('tabelaFormulario').onsubmit({ preventDefault() {} });
  const criteria = pending.shift();
  assert.equal(criteria.name, 'salvarCriteriosTabelaCampeonato');
  assert.equal(criteria.payload.criterios.pontosVitoria, 999);
  criteria.success({ ...fixture, revisao: 'r2' });
  context.abrirTabelaCampo_('');
  assert.equal(elements.get('tcNome').maxLength, 120);
  elements.get('tcNome').value = 'Novo campo';
  elements.get('tcEndereco').value = 'Rua 1';
  elements.get('tabelaFormulario').onsubmit({ preventDefault() {} });
  const venue = pending.shift();
  assert.equal(venue.name, 'salvarCampoCampeonato');
  assert.equal(venue.payload.revisao, 'r2', 'mutations use latest server revision');
  assert.equal(venue.payload.ativo, true);
  venue.success({ ...fixture, revisao: 'r3' });
  context.abrirTabelaGrupos_();
  elements.get('tgEquipe2').value = 'grupo-1';
  elements.get('tabelaFormulario').onsubmit({ preventDefault() {} });
  const groups = pending.shift();
  assert.equal(groups.name, 'salvarGruposTabelaCampeonato');
  assert.equal(groups.payload.grupos[0].equipeIds.join(','), 'a,b,c');
  groups.success(fixture);
  assert.throws(() => context.tabelaInteiro_('1.5', 999));
  assert.throws(() => context.tabelaInteiro_('-1', 999));
  assert.throws(() => context.tabelaInteiro_('1000', 999));
  evaluate("tabelaEstado.fase='invalid'; tabelaEstado.grupo='invalid'; tabelaEstado.rodada='99'; tabelaNormalizarFiltros_()");
  assert.equal(evaluate('tabelaEstado.fase + tabelaEstado.grupo + tabelaEstado.rodada'), '');
  const standings = context.tabelaClassificacaoHTML_();
  assert.equal((standings.match(/<td>1<\/td>/g) || []).length, 2, 'server tie positions preserved');
  context.tabelaExecutar_('gerarSumulaJogoCampeonato', { id: 'j1' }, true);
  const pdf = pending.shift();
  assert.equal(pdf.payload.revisao, undefined);
  pdf.success({ nome: 'sumula.pdf', mimeType: 'application/pdf', base64: Buffer.from('%PDF-1.4').toString('base64') });
  assert.equal(downloads, 1);
  assert.equal(revoked, 1);
  // Result read is separate from the fixture/table revision, and resolves sides by lado.
  const resultFixture = {
    campeonatoId: 'c1', campeonato: { id: 'c1', nome: 'Copa <AEUV>', temporada: '2026' },
    jogo: { ...fixture.jogos[0], golsMandante: null, golsVisitante: null },
    fase: fixture.fases[0], revisao: 'result-new', revisaoElencos: 'roster-new', podeEditar: true,
    equipes: [
      { id:'b', lado:'visitante', nome:'B', escudo:'', atletas:[{ id:'b1', nome:'B atleta', numero:4, dataNascimento:'2000-01-01', disponivel:true, participou:false, gols:1, golsContra:0, assistencias:4, amarelos:0, vermelho:false }], comissao:[] },
      { id:'a', lado:'mandante', nome:'A <script>', escudo:'https://example.org/a.png', atletas:[
        { id:'a1', nome:'Atleta antigo <x>', numero:10, dataNascimento:'1999-01-01', disponivel:false, participou:false, gols:2, golsContra:0, assistencias:8, amarelos:2, vermelho:true },
        { id:'a2', nome:'Atleta 2', numero:0, dataNascimento:'', disponivel:true, participou:true, gols:0, golsContra:0, amarelos:0, vermelho:false }
      ], comissao:[{ id:'ca1', nome:'Treinador <x>', cpf:'98765432100', cargo:'Técnico', disponivel:false, participou:false, amarelos:1, vermelho:false }] }
    ],
    resultado:{ wo:false, woEquipeId:'', prorrogacao:false, penaltis:false, golsPenaltisMandante:null, golsPenaltisVisitante:null, observacoes:'' },
    avisos:['Aviso <servidor>']
  };
  context.abrirTabelaResultado_('j1');
  const read = pending.shift();
  assert.equal(read.name, 'listarResultadoJogoCampeonato');
  assert.equal(JSON.stringify(read.payload), JSON.stringify({campeonatoId:'c1',id:'j1'}));
  assert.equal(evaluate('tabelaEstado.ocupado'), true);
  assert.match(elements.get('tabelaLoading').innerHTML, /Carregando/);
  assert.equal(elements.get('trVoltar').disabled, true);
  context.abrirTabelaResultado_('j1');
  assert.equal(pending.length, 0, 'duplicate result reads blocked');
  read.success(resultFixture);
  assert.equal(evaluate('tabelaEstado.dados.revisao'), 'r1', 'result read does not mutate table revision');
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].id'), 'a', 'sides are resolved from lado');
  assert.doesNotMatch(elements.get('areaTabelaCampeonato').innerHTML, /id="tabelaPainel"/, 'dedicated result screen replaces list');
  assert.match(elements.get('tabelaResultadoArea').innerHTML, /Cadastro anterior/);
  assert.match(elements.get('tabelaResultadoArea').innerHTML, /Atleta antigo &lt;x&gt;/);
  assert.doesNotMatch(elements.get('tabelaResultadoArea').innerHTML, /Nasc\.|azul|defesa/i);
  assert.match(elements.get('tabelaResultadoArea').innerHTML, /CPF/);
  assert.match(elements.get('tabelaResultadoArea').innerHTML, /98765432100/);
  assert.doesNotMatch(elements.get('tabelaResultadoArea').innerHTML, /01\/01\/1999|01\/01\/2000/);
  assert.ok(elements.get('tr-0-comissao-0-participou'));
  assert.equal(elements.get('tr-0-atletas-0-numeroJogo').value, '');
  assert.ok(!elements.get('tr-0-atletas-0-numeroJogo').required);
  assert.match(elements.get('tabelaMensagem').innerHTML, /Aviso &lt;servidor&gt;/);
  assert.match(elements.get('trResumo').innerHTML, /diferem do placar \(0\)/);
  assert.doesNotMatch(elements.get('tabelaResultadoArea').innerHTML, /Assistências|assistencias/);
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[0].assistencias'), 8,
    'legacy assistance remains in the snapshot while absent from rendered controls');
  assert.equal(elements.get('trGolsMandante').value, '0', 'a null legacy score opens as editable zero');
  assert.equal(elements.get('trGolsVisitante').value, '0');
  assert.equal(elements.get('trPenGolsMandante').disabled, true);
  function input(id, value) {
    const element = elements.get(id);
    if (element.type === 'checkbox') element.checked = value; else element.value = String(value);
    elements.get('tabelaResultadoFormulario').oninput({target:element});
  }
  function inputAndChange(id, value) {
    input(id, value);
    const element = elements.get(id);
    elements.get('tabelaResultadoFormulario').onchange({target:element});
  }
  function tab(index) {
    elements.get('tabelaResultadoFormulario').querySelectorAll('[data-tr-aba]').find(e => e.dataset.trAba === String(index)).onclick();
  }
  inputAndChange('tr-0-atletas-0-gols', 3);
  assert.equal(elements.get('trGolsMandante').value, '1', 'attributed goal increments the principal score by its delta');
  inputAndChange('tr-0-atletas-0-golsContra', 1);
  assert.equal(elements.get('trGolsVisitante').value, '1', 'home own goal increments the opponent score once across input/change');
  input('tr-0-atletas-0-gols', '');
  assert.equal(elements.get('trGolsMandante').value, '1', 'blank goal entry does not change the counted total');
  input('tr-0-atletas-0-gols', 'pending');
  assert.equal(elements.get('trGolsMandante').value, '1', 'invalid pending goal entry keeps the prior counted total');
  inputAndChange('tr-0-atletas-0-gols', 2);
  assert.equal(elements.get('trGolsMandante').value, '0', 'valid recovery applies delta from the last valid goal count');
  inputAndChange('tr-0-atletas-0-golsContra', 0);
  assert.equal(elements.get('trGolsVisitante').value, '0', 'removing an own goal decrements the opponent score by its delta');
  inputAndChange('tr-0-atletas-0-golsContra', 1);
  assert.equal(elements.get('trGolsVisitante').value, '1');
  input('tr-0-atletas-0-participou', false);
  input('tr-0-atletas-0-numeroJogo', 27);
  input('tr-0-atletas-0-amarelos', 2);
  input('tr-0-comissao-0-amarelos', 2);
  input('tr-0-comissao-0-vermelho', true);
  tab(1);
  assert.equal(elements.get('trEquipe0').hidden, true);
  inputAndChange('tr-1-atletas-0-gols', 5);
  assert.equal(elements.get('trGolsVisitante').value, '5', 'visitor goal changes score by the valid delta');
  inputAndChange('tr-1-atletas-0-golsContra', 1);
  assert.equal(elements.get('trGolsMandante').value, '1', 'visitor own goal is credited to the home team');
  input('tr-1-atletas-0-vermelho', true);
  tab(0);
  assert.equal(elements.get('tr-0-atletas-0-gols').value, '2', 'team switching retains inputs');
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[0].gols'), '2');
  context.tabelaResultadoParticipacoes_(0, true);
  assert.equal(elements.get('tr-0-atletas-0-participou').checked, true);
  assert.equal(elements.get('tr-0-comissao-0-participou').checked, true);
  context.tabelaResultadoParticipacoes_(0, false);
  assert.equal(elements.get('tr-0-comissao-0-participou').checked, false);
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].comissao[0].amarelos'), '2');
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].comissao[0].vermelho'), true);
  input('tr-0-comissao-0-participou', true);
  assert.match(elements.get('trResumo').innerHTML, /1 membro\(s\) da comissão participaram/);
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[0].gols'), '2');
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[0].assistencias'), 8);
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[0].golsContra'), '1');
  assert.equal(evaluate('tabelaEstado.resultado.equipes[1].atletas[0].golsContra'), '1');
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[0].amarelos'), '2');
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[0].vermelho'), true);
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[1].participou'), false);
  input('trwo', true);
  elements.get('tabelaResultadoFormulario').onsubmit({preventDefault(){}});
  assert.equal(pending.length, 0, 'WO requires absent team');
  assert.match(elements.get('tabelaFormErro').innerHTML, /equipe ausente/);
  input('trWoEquipe', 'b');
  input('trprorrogacao', true);
  input('trpenaltis', true);
  input('trPenGolsMandante', 4);
  input('trPenGolsVisitante', 3);
  input('trGolsMandante', 10);
  input('tr-0-atletas-0-gols', 999);
  assert.equal(elements.get('tr-0-atletas-0-gols').value, '2', 'score delta above the 999 limit is rejected and rolls back the event');
  assert.match(elements.get('tabelaFormErro').innerHTML, /entre 0 e 999/);
  inputAndChange('tr-0-atletas-0-gols', 4);
  assert.equal(elements.get('trGolsMandante').value, '12', 'manual administrative score remainder survives attributed-goal deltas');
  input('trGolsMandante', 0);
  input('trGolsVisitante', 1);
  input('trObservacoes', 'Anotação <não HTML>');
  assert.equal(elements.get('trPenGolsMandante').disabled, false);
  assert.equal(elements.get('trPenGolsMandante').required, true);
  elements.get('tabelaResultadoFormulario').onsubmit({preventDefault(){}});
  const resultSave = pending.shift();
  assert.equal(resultSave.name, 'salvarResultadoJogoCampeonato');
  assert.equal(resultSave.payload.revisao, 'result-new', 'explicit result revision is never overwritten by stale table revision');
  assert.equal(resultSave.payload.revisaoElencos, 'roster-new');
  assert.equal(resultSave.payload.golsMandante, 0, 'manual zero is preserved despite mismatched athlete sum');
  assert.equal(resultSave.payload.golsVisitante, 1);
  assert.equal(resultSave.payload.resultado.golsPenaltisMandante, 4);
  assert.equal(resultSave.payload.resultado.golsPenaltisVisitante, 3);
  assert.equal(resultSave.payload.resultado.woEquipeId, 'b');
  assert.equal(resultSave.payload.resultado.prorrogacao, true);
  assert.equal(resultSave.payload.status, undefined, 'backend forces encerrado without extra status property');
  assert.deepEqual(JSON.parse(JSON.stringify(resultSave.payload.equipes)), [
    { id:'a', atletas:[{id:'a1',numeroJogo:27,participou:false,gols:4,golsContra:1,amarelos:2,vermelho:true},{id:'a2',numeroJogo:'',participou:false,gols:0,golsContra:0,amarelos:0,vermelho:false}], comissao:[{id:'ca1',participou:true,amarelos:2,vermelho:true}] },
    { id:'b', atletas:[{id:'b1',numeroJogo:'',participou:false,gols:5,golsContra:1,amarelos:0,vermelho:true}], comissao:[] }
  ], 'full both-team payload retains historical rosters and includes own-goal events without assistance fields');
  assert.equal(elements.get('tr-0-atletas-0-gols').disabled, true);
  input('trGolsMandante', 99);
  assert.equal(evaluate('tabelaEstado.resultado.jogo.golsMandante'), '0', 'busy handler ignores edits');
  elements.get('tabelaResultadoFormulario').onsubmit({preventDefault(){}});
  tab(1);
  assert.equal(pending.length, 0, 'duplicate result submit blocked');
  assert.equal(elements.get('trEquipe0').hidden, false, 'busy team navigation blocked');
  resultSave.failure(new Error('Revisão dos elencos desatualizada <x>'));
  assert.equal(evaluate('tabelaEstado.sujo'), true);
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[0].gols'), '4');
  assert.equal(elements.get('tr-0-atletas-0-gols').disabled, false);
  assert.match(elements.get('tabelaMensagem').innerHTML, /&lt;x&gt;/);
  assert.match(elements.get('tabelaMensagem').innerHTML, /Recarregar resultado/);
  confirmResult = false;
  elements.get('trRecarregar').onclick();
  await Promise.resolve();
  assert.equal(pending.length, 0, 'reload cancel preserves result draft');
  assert.equal(evaluate('tabelaEstado.resultado.resultado.observacoes'), 'Anotação <não HTML>');
  input('trGolsMandante', 0);
  input('tr-0-atletas-0-gols', '1.5');
  assert.throws(() => context.tabelaResultadoPayload_(), /número inteiro/);
  input('tr-0-atletas-0-gols', 3);
  input('tr-0-atletas-0-amarelos', 3);
  assert.throws(() => context.tabelaResultadoPayload_(), /entre 0 e 2/);
  input('tr-0-atletas-0-amarelos', 0);
  input('trObservacoes', 'a'.repeat(2001));
  assert.throws(() => context.tabelaResultadoPayload_(), /2.000/);
  input('trObservacoes', 'Corrigido');
  input('trwo', false);
  input('trpenaltis', false);
  const withoutFlags = context.tabelaResultadoPayload_();
  assert.equal(withoutFlags.resultado.woEquipeId, '');
  assert.equal(withoutFlags.resultado.golsPenaltisMandante, null);
  assert.equal(withoutFlags.resultado.golsPenaltisVisitante, null);
  input('trpenaltis', true);
  assert.equal(elements.get('trPenGolsMandante').value, '4', 'penalty flag toggle preserves draft counters');
  elements.get('tabelaResultadoFormulario').onsubmit({preventDefault(){}});
  pending.shift().success({...fixture,revisao:'after-result',recado:'Resultado salvo',avisos:['Confira <alerta>']});
  assert.equal(evaluate('tabelaEstado.dados.revisao'), 'after-result');
  assert.equal(evaluate('tabelaEstado.resultado'), null);
  assert.equal(evaluate('tabelaEstado.sujo'), false);
  assert.match(elements.get('tabelaMensagem').innerHTML, /Resultado salvo/);
  assert.match(elements.get('areaTabelaCampeonato').innerHTML, /Confira &lt;alerta&gt;/);
  assert.match(elements.get('areaTabelaCampeonato').innerHTML, /id="tabelaPainel"/);
  context.abrirTabelaResultado_('j1');
  pending.shift().success({...resultFixture,jogo:{...resultFixture.jogo,status:'encerrado'}});
  assert.match(elements.get('tabelaResultadoArea').innerHTML, /Salvar resultado/);
  input('trObservacoes', 'Rascunho que será descartado');
  confirmResult = true;
  elements.get('trRecarregar').onclick();
  await Promise.resolve();
  assert.equal(pending.length, 1, 'confirmed reload refetches result revision');
  assert.equal(evaluate('tabelaEstado.resultado'), null, 'confirmed discard resets result draft before fetching');
  pending.shift().success({...resultFixture,revisao:'reloaded-result',jogo:{...resultFixture.jogo,status:'cancelado'}});
  assert.equal(evaluate('tabelaEstado.sujo'), false);
  assert.equal(evaluate('tabelaEstado.resultado.resultado.observacoes'), '', 'reload uses fresh server draft');
  assert.match(elements.get('tabelaResultadoArea').innerHTML, /Finalizar partida/, 'canceled games may deliberately finalize');
  elements.get('trVoltar').onclick();
  assert.equal(evaluate('tabelaEstado.resultado'), null);
  context.abrirTabelaResultado_('j1');
  pending.shift().success({...resultFixture,podeEditar:false,jogo:{...resultFixture.jogo,status:'encerrado'}});
  assert.match(elements.get('tabelaResultadoArea').innerHTML, /Consulta somente/);
  assert.doesNotMatch(elements.get('tabelaResultadoArea').innerHTML, /type="submit"/);
  assert.equal(elements.get('trGolsMandante').disabled, true);
  assert.equal(elements.get('tr-0-atletas-0-gols').disabled, true);
  context.tabelaResultadoParticipacoes_(0, true);
  assert.equal(evaluate('tabelaEstado.resultado.equipes[0].atletas[0].participou'), false);
  context.tabelaExecutar_('salvarResultadoJogoCampeonato', {});
  assert.equal(pending.length, 0, 'result read-only permission blocks writes');
  tab(1);
  assert.equal(elements.get('trEquipe1').hidden, false, 'read-only result team tabs still work');
  context.tabelaNavegar_(context.montarTabelaCampeonato_);
  context.abrirTabelaResultado_('j1');
  const staleResult = pending.shift();
  evaluate('tabelaEstado.requisicao++');
  staleResult.success(resultFixture);
  assert.equal(evaluate('tabelaEstado.resultado'), null, 'stale result success ignored');
  staleResult.failure(new Error('stale error'));
  assert.doesNotMatch(elements.get('tabelaMensagem').innerHTML, /stale error/);
  evaluate('tabelaEstado.ocupado=false');
  context.abrirTabelaResultado_('j1');
  const wrongChamp = pending.shift();
  evaluate("tabelaEstado.campeonatoId='c2'");
  wrongChamp.success(resultFixture);
  assert.equal(evaluate('tabelaEstado.resultado'), null, 'result response ignores changed championship');
  evaluate("tabelaEstado.campeonatoId='c1'; tabelaEstado.ocupado=false");
  context.abrirTabelaResultado_('j1');
  const wrongModule = pending.shift();
  context.moduloAtual = 'campeonatos';
  wrongModule.success(resultFixture);
  assert.equal(evaluate('tabelaEstado.resultado'), null, 'result response ignores changed module');
  context.moduloAtual = 'jogos-campeonato';
  evaluate("tabelaEstado.ocupado=false");
  context.abrirTabelaResultado_('j1');
  pending.shift().failure(new Error('Falha de leitura'));
  assert.equal(evaluate('tabelaEstado.ocupado'), false);
  assert.match(elements.get('tabelaMensagem').innerHTML, /Falha de leitura/);
  assert.equal(elements.get('trRecarregar').disabled, false);
  context.tabelaNavegar_(context.montarTabelaCampeonato_);
  evaluate("tabelaEstado.dados={...fixture,jogos:[{...fixture.jogos[0],status:'encerrado',golsMandante:8,golsVisitante:6}]}; montarTabelaCampeonato_()");
  context.abrirTabelaJogo_('j1');
  assert.doesNotMatch(elements.get('tabelaFormArea').innerHTML, /tjGols|tjPlacar/);
  ['tjFase','tjGrupo','tjMandante','tjVisitante','tjStatus'].forEach(id => assert.equal(elements.get(id).disabled, true, 'final identity/status locked: ' + id));
  ['tjRodada','tjData','tjHora','tjCampo'].forEach(id => assert.equal(elements.get(id).disabled, false, 'final schedule editable: ' + id));
  elements.get('tabelaFormulario').onsubmit({preventDefault(){}});
  const finalSchedule = pending.shift();
  assert.equal(finalSchedule.payload.status, 'encerrado');
  assert.equal(finalSchedule.payload.golsMandante, undefined);
  assert.equal(finalSchedule.payload.golsVisitante, undefined);
  finalSchedule.success(fixture);
  confirmResult = true;
  context.carregarTabelaCampeonato_('c1');
  const stale = pending.shift();
  evaluate('tabelaEstado.requisicao++');
  stale.success({ ...fixture, campeonatoId: 'stale' });
  assert.equal(evaluate('tabelaEstado.campeonatoId'), 'c1', 'stale responses ignored');
  evaluate('tabelaEstado.ocupado=false; tabelaEstado.dados={...fixture, podeEditar:false}');
  assert.doesNotMatch(context.tabelaJogosHTML_(), /data-tabela-acao="novo-jogo"/);
  assert.doesNotMatch(context.tabelaCamposHTML_(), /data-tabela-acao="novo-campo"/);
  context.tabelaExecutar_('salvarCampoCampeonato', {});
  assert.equal(pending.length, 0, 'readonly writes blocked');
  evaluate("tabelaEstado.dados={...fixture,campeonatoId:'',campeonato:null,campeonatos:[],grupos:[],fases:[],equipes:[],campos:[],jogos:[]}; tabelaEstado.campeonatoId=''; montarTabelaCampeonato_()");
  assert.match(elements.get('areaTabelaCampeonato').innerHTML, /Nenhum campeonato cadastrado/);
  assert.match(html, /fasesEliminatorias: \/mata\/i/);
  assert.match(html, /confirmarDescarteElenco_\(\{\s*titulo: 'Descartar alterações da tabela/);
  assert.equal(JSON.parse(context.sessionStorage.values['aeuv-tabela-selecao']).aba, 'jogos');
  vm.runInContext(source('    function abrirModulo(id, busca, aprovacaoDescarte)', '    function renderizarModulo(modulo)'), context);
  evaluate("tabelaEstado.sujo=true; moduloAtual='jogos-campeonato'");
  confirmResult = false;
  context.abrirModulo('campeonatos');
  await Promise.resolve();
  assert.equal(context.moduloAtual, 'jogos-campeonato', 'module guard preserves dirty form');
  confirmResult = true;
  context.abrirModulo('campeonatos');
  await Promise.resolve();
  assert.equal(context.moduloAtual, 'campeonatos');
  evaluate("moduloAtual='jogos-campeonato'; tabelaEstado.ocupado=true");
  context.abrirModulo('campeonatos');
  assert.equal(context.moduloAtual, 'jogos-campeonato', 'module guard blocks pending write');
  new Element('campeonatoFormArea');
  context.imagemUpload = () => '<input id="cEscudo" type="file">';
  context.inicializarImagemUpload = () => {};
  context.campeonatos = { registros: [], modalidades: [{ id: 'Futsal' }], visibilidades: [{ id: 'Interno' }], status: [{ id: 'rascunho' }], formatos: [{ id: 'Grupos + mata-mata' }, { id: 'Pontos corridos' }] };
  vm.runInContext(source('    function abrirFormularioCampeonato(id)', '    function removerCampeonatoDoSistema(id)'), context);
  context.abrirFormularioCampeonato('');
  assert.equal(elements.get('cEliminatorias').hidden, false);
  const checks = [...elements.values()].filter(e => e.name === 'cFaseEliminatoria');
  assert.equal(checks.filter(e => e.checked).length, 0, 'no implicit knockout defaults');
  checks.find(e => e.value === 'final').checked = true;
  context.gravarCampeonato('');
  assert.equal(pending.shift().payload.estrutura.fasesEliminatorias.join(','), 'final');
  elements.get('cFormato').value = 'Pontos corridos';
  elements.get('cFormato').listeners.change();
  assert.equal(elements.get('cEliminatorias').hidden, true);
  context.gravarCampeonato('');
  assert.equal(pending.shift().payload.estrutura.fasesEliminatorias.length, 0);
  console.log('PASS: inline syntax, fixture/result separation, dedicated result loader, both-team draft and complete payload, goal/own-goal score deltas and event idempotency, blank/invalid recovery, manual-score remainder, team tabs, participation independence, historical rosters, cards, WO validation, separate penalty counters, result/roster revisions, escaped warnings, busy/stale/champ/module guards, failed-save drafts and discard/reload, readonly result, legacy-final schedule locks; existing table forms, PDF, ranking, navigation and championship smoke.');
})().catch(error => { console.error(error); process.exitCode = 1; });
