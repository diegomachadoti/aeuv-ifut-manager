const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const root = process.cwd();
const source = fs.readFileSync(root + '\\apps-scripts\\sistema-interno\\WebApp.gs', 'utf8');
const html = fs.readFileSync(root + '\\apps-scripts\\sistema-interno\\Index.html', 'utf8');
new vm.Script(source);
for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '{}'));

// ---------- backend harness ----------
let serial = 0, locked = false, writes = 0, reads = 0, profile = 'admin', lockCalls = 0, legacyCalls = 0;
const files = new Map(), props = new Map();
function blob(value, mime, name) { return { value, name, getDataAsString: () => String(value), getContentType: () => mime }; }
function fileOf(name, text) {
  return { text, getBlob() { reads++; return blob(this.text, 'application/json', name); },
    setContent(t) { assert(locked, 'write under lock'); this.text = t; writes++; },
    setTrashed(v) { assert(locked); if (v) files.delete(name); } };
}
const folder = {
  getFilesByName(name) { const f = files.has(name) ? [files.get(name)] : []; return { hasNext: () => !!f.length, next: () => f.shift() }; },
  createFile(b) { assert(locked, 'create under lock'); files.set(b.name, fileOf(b.name, b.value)); writes++; return files.get(b.name); }
};
const ctx = vm.createContext({
  console, Date, Buffer,
  Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
  Utilities: { getUuid: () => 'uuid-' + (++serial), newBlob: (v, m, n) => blob(v, m, n), formatDate: () => '04/10/2026' },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.has(k) ? props.get(k) : null,
    setProperty: (k, v) => props.set(k, v), deleteProperty: k => props.delete(k) }) },
  LockService: { getScriptLock: () => ({ waitLock() { assert(!locked, 'no nested lock'); locked = true; lockCalls++; },
    releaseLock() { assert(locked); locked = false; } }) }
});
vm.runInContext(source, ctx);
const c = ctx;
let associadas = ['Águia', 'Beta'];
c.identificarUsuario_ = () => profile === 'anonymous' ? { autorizado: false } : ({ autorizado: true, usuario: { perfil: profile, equipe: 'Águia' } });
c.pastaRaizProjeto_ = () => folder;
c.obterEquipes_ = () => associadas.slice();
let legacy = { solicitacoes: { registros: [], total: 0 }, punicoes: { registros: [] }, sumulas: { registros: [], total: 0 } };
c.listarSolicitacoes = () => { legacyCalls++; assert(!locked, 'legacy read outside lock'); return JSON.parse(JSON.stringify(legacy.solicitacoes)); };
c.listarPunicoes = () => { legacyCalls++; assert(!locked); return JSON.parse(JSON.stringify(legacy.punicoes)); };
c.listarSumulas = () => { legacyCalls++; assert(!locked); return JSON.parse(JSON.stringify(legacy.sumulas)); };
const copy = x => JSON.parse(JSON.stringify(x));
function cpf(base) {
  const d = String(base).padStart(9, '0').split('').map(Number);
  for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += d[i] * (n + 1 - i); const r = (s * 10) % 11; d.push(r === 10 ? 0 : r); }
  return d.join('');
}
const CPF = { joao: cpf(123456789), carlosA: cpf(234567891), carlosB: cpf(345678912), tecnico: cpf(456789123),
  pedro: cpf(567891234), semTime: cpf(678912345), ana: cpf(789123456) };
Object.values(CPF).forEach(v => assert(c.cpfValido_(v)));
function seed(fn) { locked = true; try { fn(); } finally { locked = false; } }
function roster(id, tipo, lista) {
  c.gravarListaCadastroDrive_(c.arquivoCadastroPessoasCampeonato_(id, tipo === 'atletas' ? 'Atletas' : 'Comissao Tecnica'),
    tipo === 'atletas' ? c.chaveAtletasCampeonato_(id) : c.chaveComissaoTecnicaCampeonato_(id), lista);
}
const champ = (id, nome, temporada, status) => ({ id, nome, temporada, modalidade: 'Futsal', status, visibilidade: 'Interno' });
let teams = [{ id: 't-aguia', nome: 'Águia', escudo: '' }, { id: 't-beta', nome: 'Beta', escudo: '' }];
seed(() => {
  c.gravarRegistroEquipes_(teams);
  c.gravarCampeonatos_([champ('c1', 'Copa 2025', '2025', 'encerrado'), champ('c2', 'Copa 2026', '2026', 'ativo'), champ('c3', 'Liga Extinta', '2024', 'encerrado')]);
  props.set('CAMPEONATO_TIMES_c1', JSON.stringify(['Águia', 'Beta']));
  props.set('CAMPEONATO_TIMES_c2', JSON.stringify(['Águia', 'Beta']));
  props.set('CAMPEONATO_TIMES_c3', JSON.stringify(['Águia']));
  roster('c1', 'atletas', [
    { id: 'j1', nome: 'João Pedro', cpf: CPF.joao, timeVinculado: 'Águia', numero: 9, posicao: 'Ala', foto: 'FOTO-SECRETA', rg: 'RG-SECRETO', dataNascimento: '2000-02-03' },
    { id: 'm1', nome: 'Maria Souza', cpf: '', timeVinculado: 'Beta', numero: 4 },
    { id: 'ca', nome: 'Carlos Silva', cpf: CPF.carlosA, timeVinculado: 'Águia' },
    { nome: 'Legado <img src=x onerror=alert(1)>', cpf: '', timeVinculado: 'Beta' }
  ]);
  roster('c1', 'comissao', [{ id: 'tec', nome: 'Técnico Só Comissão', cpf: CPF.tecnico, cargo: 'Treinador', timeVinculado: 'Águia' }]);
  roster('c2', 'atletas', [
    { id: 'j2', nome: 'João Pedro', cpf: CPF.joao, timeVinculado: 'Beta', numero: 10 },
    { id: 'cb', nome: 'Carlos Silva', cpf: CPF.carlosB, timeVinculado: 'Beta' },
    { id: 'p1', nome: 'Pedro Inativo', cpf: CPF.pedro, timeVinculado: 'Águia', ativo: false },
    { id: 's1', nome: 'Sem Time', cpf: CPF.semTime, timeVinculado: '' },
    { id: 'm2', nome: 'Maria Souza', cpf: '', timeVinculado: 'Beta' }
  ]);
  roster('c3', 'atletas', [{ id: 'a1', nome: 'Ana Lima', cpf: CPF.ana, timeVinculado: 'Águia' }]);
});

// Permissions: denied before any data read or lock.
for (const p of ['associado', 'arbitro', 'anonymous']) {
  profile = p; const r0 = reads, l0 = lockCalls, g0 = legacyCalls;
  assert.throws(() => c.listarAtletas(), /permissão/);
  assert.equal(reads, r0); assert.equal(lockCalls, l0); assert.equal(legacyCalls, g0);
}
profile = 'admin';

legacy.solicitacoes = { total: 5, registros: [{ ordem: 2, protocolo: 'P-1', dataHora: '01/09/2026 10:00', situacao: 'Processada',
  equipe: 'Águia iFut', competicao: 'iFut <Liga>', pessoas: [{ nome: 'João Pedro', cpf: CPF.joao.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'), tipo: 'Atleta', acao: 'Inclusao' }] }] };
legacy.punicoes = { registros: [
  { punido: 'Maria Souza', equipe: 'Beta', nota: 'N-1', competicao: 'Copa 2025', status: 'DEFINIDA', situacao: 'CUMPRIDA' },
  { punido: 'Carlos Silva', equipe: '', nota: 'N-2', status: 'DEFINIDA', situacao: 'CUMPRIDA' }
] };
legacy.sumulas = { total: 1, registros: [{ ordem: 1, protocolo: 'S-1', envolvidos: [{ nome: 'Carlos Silva', equipe: 'Beta', tipo: 'Atleta' }] }] };

let first = copy(c.listarAtletas());
assert(!locked, 'lock released');
const hist1 = JSON.parse(files.get('AEUV - Historico de Inscricoes.json').text);
assert(hist1.inscricoes.length > 0, 'history reconciled');

// Mutations after backfill: Carlos A removed from c1, c3 deleted, team renamed, c2 renamed.
seed(() => {
  roster('c1', 'atletas', c.lerListaCadastroDrive_(c.arquivoCadastroPessoasCampeonato_('c1', 'Atletas'), c.chaveAtletasCampeonato_('c1')).filter(p => p.id !== 'ca'));
  c.gravarCampeonatos_([champ('c1', 'Copa 2025', '2025', 'encerrado'), champ('c2', 'Copa 2026 Oficial', '2026', 'ativo')]);
  c.removerCadastroPessoasCampeonato_('c3');
  teams = [{ id: 't-aguia', nome: 'Águia Dourada', escudo: '' }, { id: 't-beta', nome: 'Beta', escudo: '' }];
  c.gravarRegistroEquipes_(teams);
});
associadas = ['Águia Dourada', 'Beta'];
const result = copy(c.listarAtletas());
assert(!locked);
const all = result.registros;
const byCpf = v => all.filter(r => r.cpf === v);
const text = JSON.stringify(result);
assert(!text.includes('FOTO-SECRETA') && !text.includes('RG-SECRETO'), 'no photos/RG');

// legacy fields untouched
const legacyKeys = ['chave','nome','cpf','nascimento','tipo','equipeAtual','competicaoAtual','situacaoAtual','situacaoCadastro','situacaoDisciplina',
  'totalMovimentacoes','pendenciasCadastro','aguardandoCadastro','falhasCadastro','totalPunicoes','punicoesACumprir','punicoesPendentes','totalSumulas',
  'ultimaMovimentacao','ultimaAcao','ultimaSolicitacaoSituacao','ultimaSolicitacaoProtocolo','ultimaSumulaData','equipesHistorico','competicoesHistorico',
  'movimentacoes','punicoes','sumulas'];
all.forEach(r => legacyKeys.forEach(k => assert(Object.hasOwn(r, k), 'legacy key ' + k)));
['solicitacoesLidas','solicitacoesTotal','solicitacoesPastaUrl','punicoesTotal','punicoesArquivoUrl','punicoesAtualizadoEm','sumulasLidas','sumulasTotal','sumulasPastaUrl']
  .forEach(k => assert(Object.hasOwn(result.fontes, k)));
assert.equal(result.total, all.length);

// same CPF: one person, links across teams/championships, legacy solicitation merged.
const joao = byCpf(CPF.joao);
assert.equal(joao.length, 1, 'same CPF merged');
assert.equal(joao[0].vinculos.length, 2);
assert.equal(joao[0].vinculosAtuais, 2);
assert.equal(joao[0].totalMovimentacoes, 1, 'solicitation merged by CPF');
assert.equal(joao[0].equipeAtual, 'Águia iFut', 'legacy processed solicitation keeps equipeAtual');
assert.equal(joao[0].nascimento, '03/02/2000');
const j1 = joao[0].vinculos.find(v => v.registroId === 'j1');
assert.equal(j1.equipeNome, 'Águia Dourada', 'renamed team displays current registry name');
assert.equal(j1.equipeNomeRegistrado, 'Águia', 'registered name preserved');
assert.equal(j1.equipeId, 't-aguia');
assert.equal(j1.equipeAssociada, true);
assert.equal(j1.numero, 9); assert.equal(j1.posicao, 'Ala');
assert.equal(j1.temporada, '2025'); assert.equal(j1.campeonatoStatus, 'encerrado');
const j2 = joao[0].vinculos.find(v => v.registroId === 'j2');
assert.equal(j2.campeonatoNome, 'Copa 2026 Oficial');
assert.equal(j2.campeonatoNomeOriginal, 'Copa 2026', 'original competition name kept');
assert(joao[0].competicoesAtuais.includes('Copa 2026 Oficial'));
// registradoEm stable between calls (not refabricated)
const j1First = first.registros.find(r => r.cpf === CPF.joao).vinculos.find(v => v.registroId === 'j1');
assert.equal(j1.registradoEm, j1First.registradoEm, 'registration date stable');
assert(j1.noHistorico);

// different CPF, same name: separate; removed one historical.
const carlosA = byCpf(CPF.carlosA)[0], carlosB = byCpf(CPF.carlosB)[0];
assert(carlosA && carlosB && carlosA !== carlosB);
assert.equal(carlosA.vinculos.length, 1);
assert.equal(carlosA.vinculos[0].atual, false);
assert.equal(carlosA.vinculos[0].situacao, 'Vínculo anterior');
assert.equal(carlosA.situacaoElenco, 'Somente histórico');
assert.equal(carlosA.situacaoAtual, 'Fora dos elencos atuais');
assert.equal(carlosB.situacaoElenco, 'Inscrito');
assert.equal(carlosB.totalSumulas, 1, 'súmula attached by name+team to the right Carlos');
assert.equal(carlosA.totalSumulas, 0);
assert.equal(carlosA.totalPunicoes + carlosB.totalPunicoes, 0, 'ambiguous punishment not conflated');
assert(all.some(r => r.chave.startsWith('AVULSO:') && r.nome === 'Carlos Silva' && r.totalPunicoes === 1));

// missing CPF: stable per record, never merged by name
const marias = all.filter(r => r.nome === 'Maria Souza' && !r.chave.startsWith('AVULSO:'));
assert(all.some(r => r.chave.startsWith('AVULSO:') && r.nome === 'Maria Souza' && r.totalPunicoes === 1), 'ambiguous same-team no-CPF punishment stays separate');
assert.equal(marias.length, 2, 'no-CPF records with same name stay separate');
assert(marias.every(r => r.chave.startsWith('REGISTRO:')));
assert.deepEqual(marias.map(r => r.chave).sort(), ['REGISTRO:c1:m1', 'REGISTRO:c2:m2']);
assert.equal(marias.reduce((t, r) => t + r.totalPunicoes, 0), 0, 'punishment not guessed between two same-name no-CPF athletes');

// deleted championship
const ana = byCpf(CPF.ana)[0];
assert.equal(ana.vinculos[0].situacao, 'Competição excluída');
assert.equal(ana.vinculos[0].campeonatoNome, 'Liga Extinta');
assert.equal(ana.vinculos[0].campeonatoExcluido, true);
assert.equal(ana.vinculosAtuais, 0);

// inactive flag preserved
const pedro = byCpf(CPF.pedro)[0];
assert.equal(pedro.vinculos[0].ativo, false);
assert.equal(pedro.vinculos[0].situacao, 'Inscrição atual (inativo)');
assert.equal(pedro.situacaoElenco, 'Inscrito (inativo)');
assert.equal(pedro.situacaoAtual, 'Inscrito no elenco');

// blank team row still listed, not in history
const semTime = byCpf(CPF.semTime)[0];
assert(semTime, 'roster row without team visible');
assert.equal(semTime.vinculos[0].noHistorico, false);
assert.equal(semTime.vinculos[0].atual, true);
assert.equal(semTime.vinculos[0].registradoEm, '', 'no fabricated date');

// commission not an athlete
assert(!all.some(r => r.cpf === CPF.tecnico), 'commission excluded');
assert(!all.some(r => (r.vinculos || []).some(v => v.nome.includes('Técnico'))));

// legacy migrated row (no id) visible with stable id
const legado = all.find(r => r.nome.startsWith('Legado'));
assert(legado && legado.vinculos[0].registroId, 'legacy row gets persisted id');
const legadoFirst = first.registros.find(r => r.nome.startsWith('Legado'));
assert.equal(legado.chave, legadoFirst.chave, 'stable key across calls');

assert.equal(result.fontes.elencoCampeonatos, 2);
assert(result.fontes.elencoInscricoesAnteriores >= 2);

// lock released on failure; legacy APIs not called after a history failure
const histFile = files.get('AEUV - Historico de Inscricoes.json'); const saved = histFile.text;
histFile.text = '{bad'; const g0 = legacyCalls;
assert.throws(() => c.listarAtletas(), /Histórico de inscrições inválido/);
assert(!locked, 'lock released after failure'); assert.equal(legacyCalls, g0);
histFile.text = saved;
// legacy failure propagates (no silent catch)
const orig = c.listarPunicoes; c.listarPunicoes = () => { throw new Error('planilha indisponível'); };
assert.throws(() => c.listarAtletas(), /planilha indisponível/); assert(!locked);
c.listarPunicoes = orig;
console.log('PASS backend: registry-only, CPF merge, same-name split, no-CPF stable, removed/deleted history, inactive, rename, blank team, commission excluded, no photos, permissions, lock failure, legacy fields.');

// ---------- frontend ----------
const els = new Map();
class El {
  constructor(id, attrs = '') { this.id = id; this.value = ''; this.listeners = {}; this.dataset = {}; this.focused = false;
    for (const m of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)) this.dataset[m[1].replace(/-([a-z])/g, (_, x) => x.toUpperCase())] = m[2];
    els.set(id, this); }
  set innerHTML(v) { this._html = v; for (const m of v.matchAll(/<\w+\b([^>]*\bid="([^"]+)"[^>]*)>/g)) new El(m[2], m[1]); }
  get innerHTML() { return this._html || ''; }
  set outerHTML(v) { this.innerHTML = v; this._outer = v; }
  addEventListener(n, f) { this.listeners[n] = f; }
  focus() { focusedId = this.id; }
  set textContent(v) { this._text = v; } get textContent() { return this._text; }
}
let focusedId = '';
const pending = [], opened = [];
const runner = { withSuccessHandler(f) { this.s = f; return this; }, withFailureHandler(f) { this.f = f; return this; } };
const run = new Proxy(runner, { get(t, n) { if (n in t) return t[n]; return p => pending.push({ name: n, success: t.s, failure: t.f }); } });
const fctx = vm.createContext({ console, Date, isNaN, google: { script: { run } },
  document: { getElementById: id => els.get(id) || null },
  MODULOS: [{ id: 'atletas' }, { id: 'punicoes' }, { id: 'sumulas' }], abrirModulo: (id, busca) => opened.push([id, busca]) });
function src(start, end) { const i = html.indexOf(start); assert(i >= 0, start); return html.slice(i, html.indexOf(end, i)); }
vm.runInContext(src('    function escapar(valor)', '    function imagemUpload'), fctx);
vm.runInContext(src('    let buscaPendente', '    function abrirModulo('), fctx);
vm.runInContext(src('    function simplificar(', '    function filtrarPunicoes('), fctx);
vm.runInContext(src('    function celula(', '    /**'), fctx);
vm.runInContext(src('    function formatarCpf(', '    function formatarTelefone('), fctx);
vm.runInContext(src('    /********* BANCO DE DADOS DE ATLETAS', '    /**\n     * Estado da tela de sumulas'.replace('\n', '\r\n')), fctx);
const ev = code => vm.runInContext(code, fctx);
assert(html.includes("if (modulo.tipo === 'atletas') {") && /modulo\.tipo === 'atletas'[\s\S]{0,200}carregarAtletas\(\)/.test(html), 'module dispatch');

ev(`moduloAtual = 'atletas'`);
new El('statusAtletas');
ev('carregarAtletas()'); ev('carregarAtletas()');
assert.equal(pending.length, 2);
pending[1].success(result);
const status = els.get('statusAtletas');
pending[0].success({ registros: [] });
assert(status._outer.includes('linhasAtletas'), 'stale first response ignored');
const body = els.get('linhasAtletas');
assert.equal(els.get('contagemAtletas').textContent, all.length + ' atleta(s)');
assert(!body.innerHTML.includes('<img'), 'names escaped');
assert(body.innerHTML.includes('Legado &lt;img'));
assert(!body.innerHTML.includes(CPF.joao), 'row shows masked CPF only');
assert(els.get('resumoAtletas').innerHTML.includes('Com inscrição atual'));
assert(status._outer.includes('solicitações: 1 mais recentes de 5'), 'legacy cap warning kept');
// filters
function setv(id, v) { els.get(id).value = v; (els.get(id).listeners.change || els.get(id).listeners.input)(); }
setv('filtroEquipeAtletas', 'Águia Dourada');
let shown = ev('filtrarAtletas()').map(x => x.registro.nome);
assert(shown.includes('João Pedro') && shown.includes('Pedro Inativo') && shown.includes('Ana Lima'));
assert(!shown.includes('Maria Souza'));
setv('filtroVinculoAtletas', 'atual');
shown = ev('filtrarAtletas()').map(x => x.registro.nome);
assert(shown.includes('João Pedro') && shown.includes('Pedro Inativo') && !shown.includes('Ana Lima'), 'current at team');
setv('filtroVinculoAtletas', 'historico'); setv('filtroEquipeAtletas', '');
shown = ev('filtrarAtletas()').map(x => x.registro.chave);
assert(shown.includes('CPF:' + CPF.ana) && shown.includes('CPF:' + CPF.carlosA) && !shown.includes('CPF:' + CPF.carlosB));
setv('filtroVinculoAtletas', 'sem');
assert(ev('filtrarAtletas()').every(x => !x.registro.vinculos.length), 'legacy-only filter');
setv('filtroVinculoAtletas', ''); setv('filtroCompeticaoAtletas', 'Liga Extinta');
assert.deepEqual(copy(ev('filtrarAtletas()').map(x => x.registro.nome)), ['Ana Lima']);
setv('filtroCompeticaoAtletas', '');
els.get('buscaAtletas').value = CPF.joao.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); els.get('buscaAtletas').listeners.input();
assert.deepEqual(copy(ev('filtrarAtletas()').map(x => x.registro.cpf)), [CPF.joao], 'CPF search');
els.get('buscaAtletas').value = 'joao pedro'; els.get('buscaAtletas').listeners.input();
assert.equal(ev('filtrarAtletas()').length, 1, 'accent-insensitive name search');
assert(els.get('contagemAtletas').textContent.startsWith('1 de '));
// expand / collapse
const idx = all.findIndex(r => r.cpf === CPF.joao);
const click = target => body.listeners.click({ target });
const fakeTarget = sel => ({ closest: s => s === '[data-atleta-indice]' && sel === 'row' ? { dataset: { atletaIndice: String(idx) } } : null });
assert(body.innerHTML.includes('aria-expanded="false"'));
click(fakeTarget('row'));
assert(body.innerHTML.includes('aria-expanded="true"') && body.innerHTML.includes('id="atletaBdDetalhe' + idx + '"'));
assert(body.innerHTML.includes('Histórico de vínculos') && body.innerHTML.includes('Copa 2026 Oficial') && body.innerHTML.includes('Nome original: Copa 2026'));
assert(body.innerHTML.includes('Registrada como Águia') && body.innerHTML.includes('iFut &lt;Liga&gt;'));
assert(body.innerHTML.includes('não a data real'), 'date caveat');
assert.equal(focusedId, 'atletaBdBotao' + idx, 'focus returns to toggle');
click({ closest: s => s === 'a' ? {} : null });
assert(body.innerHTML.includes('aria-expanded="true"'), 'link click does not toggle');
click(fakeTarget('row'));
assert(!body.innerHTML.includes('id="atletaBdDetalhe') && body.innerHTML.includes('aria-expanded="false"'), 'collapsed');
// deleted/inactive/no-history labels + shortcut
els.get('buscaAtletas').value = ''; els.get('buscaAtletas').listeners.input();
for (const key of [...all.filter(r => r.totalPunicoes).map(r => r.chave), 'CPF:' + CPF.ana, 'CPF:' + CPF.pedro, 'CPF:' + CPF.semTime, 'REGISTRO:c1:m1']) ev(`atletasBd.abertos[${JSON.stringify(key)}] = true`);
ev('filtrarAtletas()');
assert(body.innerHTML.includes('Competição excluída') && body.innerHTML.includes('Inscrição atual (inativo)'));
assert(body.innerHTML.includes('Ainda sem registro no histórico') && body.innerHTML.includes('Sem equipe vinculada'));
assert(body.innerHTML.includes('data-atleta-atalho="punicoes" data-atleta-busca="N-1"'));
click({ closest: s => s === '[data-atleta-atalho]' ? { dataset: { atletaAtalho: 'punicoes', atletaBusca: 'N-1' } } : null });
assert.deepEqual(opened.pop(), ['punicoes', 'N-1']);
// failure escaped, wrong module ignored
new El('statusAtletas'); ev('carregarAtletas()'); pending.pop().failure(new Error('<b>erro</b>'));
assert(els.get('statusAtletas')._outer.includes('&lt;b&gt;erro'));
new El('statusAtletas'); ev('carregarAtletas()'); ev(`moduloAtual = 'punicoes'`); pending.pop().success(result);
assert(!els.get('statusAtletas')._outer, 'other module ignored');
ev(`moduloAtual = 'atletas'`); new El('statusAtletas'); ev('carregarAtletas()'); pending.pop().success({ registros: [] });
assert(els.get('statusAtletas')._outer.includes('Nenhum atleta'));
console.log('PASS frontend: dispatch, stale/failed/empty, escaping, masked CPF, caps, filters, CPF/name search, expand/collapse aria + focus, labels, shortcuts.');
