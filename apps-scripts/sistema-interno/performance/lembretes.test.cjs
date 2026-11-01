const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const inicio = source.indexOf('function exigirLembretes_()');
const fim = source.indexOf('\nfunction ', source.indexOf('  } finally { lock.releaseLock(); }', inicio));

function fixture() {
  let texto = null, hoje = '2027-08-01', serial = 0, perfil = 'admin', duplicado = false;
  const arquivo = { getBlob: () => ({ getDataAsString: () => texto }), setContent: t => { texto = t; } };
  const c = vm.createContext({
    identificarUsuario_: () => ({ autorizado: true, email: 'admin@test', usuario: { perfil } }),
    Utilities: { formatDate: () => hoje, getUuid: () => 'id-' + (++serial), newBlob: t => t },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    pastaRaizProjeto_: () => ({
      getFilesByName: () => { let n = texto ? (duplicado ? 2 : 1) : 0;
        return { hasNext: () => n > 0, next: () => { n--; return arquivo; } }; },
      createFile: t => { texto = t; return arquivo; }
    })
  });
  vm.runInContext(source.slice(inicio, fim), c);
  return { c, hoje: d => { hoje = d; }, perfil: p => { perfil = p; }, duplicado: () => { duplicado = true; }, texto: () => texto };
}
function item(extra = {}) {
  return { titulo: 'Contador', data: '2027-08-10', recorrencia: 'mensal', antecedencia: 7, link: '', linkExtra: '', ...extra };
}

test('defaults: domínio anual com links e contador sem data inventada', () => {
  const h = fixture(), r = h.c.listarLembretes();
  assert.equal(r.totalAvisos, 1);
  assert.equal(r.itens.find(r => r.id === 'dominio-aeuv').data, '2027-08-06');
  assert.equal(r.itens.find(r => r.id === 'contador-mensal').status, 'sem-data');
  assert.equal(h.texto(), null, 'consulta não grava');
});

test('salvar contador, concluir mensal, excluir e recarregar persistem', () => {
  const h = fixture();
  let r = h.c.alterarLembretes({ versao: 0, acao: 'salvar', id: 'contador-mensal', item: item() });
  assert.equal(r.versao, 1);
  h.hoje('2027-08-11');
  assert.equal(h.c.listarLembretes().itens.find(r => r.id === 'contador-mensal').status, 'atrasado');
  r = h.c.alterarLembretes({ versao: 1, acao: 'concluir', id: 'contador-mensal' });
  assert.equal(r.itens.find(r => r.id === 'contador-mensal').data, '2027-09-10');
  h.c.alterarLembretes({ versao: 2, acao: 'excluir', id: 'contador-mensal' });
  assert.equal(h.c.listarLembretes().itens.length, 1);
});

test('mensal dia 31 retoma dia original após fevereiro; anual bissexto e atrasos', () => {
  const h = fixture();
  const r = { data: '2027-01-31', ancora: '2027-01-31', recorrencia: 'mensal' };
  assert.equal(h.c.proximaDataLembrete_(r, '2027-01-31'), '2027-02-28');
  r.data = '2027-02-28';
  assert.equal(h.c.proximaDataLembrete_(r, '2027-02-28'), '2027-03-31');
  assert.equal(h.c.proximaDataLembrete_(r, '2028-02-15'), '2028-02-29');
  assert.equal(h.c.proximaDataLembrete_({ data: '2024-02-29', ancora: '2024-02-29', recorrencia: 'anual' }, '2027-10-31'), '2028-02-29');
});

test('permissões são verificadas em todos os endpoints', () => {
  const h = fixture();
  for (const p of ['associado', 'arbitragem']) {
    h.perfil(p);
    assert.throws(() => h.c.listarLembretes(), /diretoria/);
    assert.throws(() => h.c.alterarLembretes({}), /diretoria/);
  }
  h.perfil('diretoria');
  assert.equal(h.c.listarLembretes().itens.length, 2);
});

test('links inseguros, datas inválidas e conflito não alteram cadastro', () => {
  const h = fixture();
  for (const extra of [{ link: 'javascript:alert(1)' }, { data: '2027-02-30' }, { antecedencia: -1 }, { recorrencia: 'semanal' }]) {
    assert.throws(() => h.c.alterarLembretes({ versao: 0, acao: 'salvar', item: item(extra) }));
    assert.equal(h.texto(), null);
  }
  h.c.alterarLembretes({ versao: 0, acao: 'salvar', item: item() });
  const salvo = h.texto();
  assert.throws(() => h.c.alterarLembretes({ versao: 0, acao: 'excluir', id: 'dominio-aeuv' }), /outra pessoa/);
  assert.equal(h.texto(), salvo);
  h.duplicado();
  assert.throws(() => h.c.listarLembretes(), /duplicados/);
});

test('única concluída sai do badge e sem data não pode concluir', () => {
  const h = fixture();
  assert.throws(() => h.c.alterarLembretes({ versao: 0, acao: 'concluir', id: 'contador-mensal' }), /Defina a data/);
  let r = h.c.alterarLembretes({ versao: 0, acao: 'salvar', item: item({ data: '2027-08-01', recorrencia: 'unica' }) });
  const novo = r.itens.find(r => r.id === 'id-1');
  r = h.c.alterarLembretes({ versao: 1, acao: 'concluir', id: novo.id });
  assert.equal(r.itens.find(r => r.id === novo.id).status, 'concluido');
  assert.equal(r.totalAvisos, 1);
});

test('diálogo responsivo, sino acessível e JS completo compila', () => {
  const componente = fs.readFileSync(path.join(__dirname, '..', 'Lembretes.html'), 'utf8');
  assert(html.includes('aria-label="Abrir lembretes internos" aria-haspopup="dialog"'));
  assert(componente.includes('dialog.showModal()'));
  assert(componente.includes('dialog.appendChild(overlay)'));
  assert(html.includes("include_('Lembretes')"));
  for (const [, s] of (html + componente).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(s.replace(/<\?[\s\S]*?\?>/g, '{}'));
  new vm.Script(source);
});

test('editar 11/10 para 10/11 grava novembro, atualiza status e recarrega a mesma data', () => {
  const h = fixture();
  h.hoje('2026-10-31');
  const c = vm.createContext({ document: { getElementById: () => ({ value: '10/11/2026' }) } });
  const inicio = html.indexOf('    function dataBrParaIso_(');
  vm.runInContext(html.slice(inicio, html.indexOf('    function horario24h_(', inicio)), c);
  const ler = html.indexOf('    function lerDataFormulario_(');
  vm.runInContext(html.slice(ler, html.indexOf('    function lerHorarioFormulario_(', ler)), c);
  h.c.alterarLembretes({ versao: 0, acao: 'salvar', id: 'contador-mensal', item: item({ data: '2026-10-11' }) });
  const data = c.lerDataFormulario_('lem-data');
  assert.equal(data, '2026-11-10');
  const resposta = h.c.alterarLembretes({ versao: 1, acao: 'salvar', id: 'contador-mensal', item: item({ data }) });
  const salvo = resposta.itens.find(r => r.id === 'contador-mensal');
  assert.equal(salvo.data, '2026-11-10');
  assert.equal(salvo.ancora, '2026-11-10');
  assert.equal(salvo.status, 'programado');
  assert.equal(salvo.dias, 10);
  assert.equal(h.c.listarLembretes().itens.find(r => r.id === salvo.id).data, data);
  const componente = fs.readFileSync(path.join(__dirname, '..', 'Lembretes.html'), 'utf8');
  assert(componente.includes("atributosDataHora_('date', r[c])"));
  assert(componente.includes("item.data = lerDataFormulario_('lem-data')"));
});

