const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const admin = 'deejaydiego@gmail.com';

function ambiente() {
  let email = admin, n = 0, reads = 0, locked = false;
  const props = {}, recursos = new Map();
  const user = mail => ({getEmail: () => mail});
  const iterator = items => { let i = 0; return {hasNext: () => i < items.length, next: () => items[i++]}; };
  const blob = texto => ({getBytes: () => Array.from(Buffer.from(texto)), getDataAsString: () => texto});
  function recurso(pasta, texto, parent) {
    const r = {id: 'r' + ++n, texto, parent, sharing: 'PRIVATE', viewers: [], editors: [], trashed: false,
      getId() {return this.id;}, getOwner: () => user(admin), getSharingAccess() {return this.sharing;},
      getEditors() {return this.editors;}, getViewers() {return this.viewers;}, isTrashed() {return this.trashed;},
      getUrl() {return 'https://drive.google.com/' + this.id;}, getParents() {return iterator(this.parent ? [this.parent] : []);},
      getSize() {return Buffer.byteLength(this.texto || '');}, getBlob() {return blob(this.texto);}, setTrashed(v) {this.trashed = v;}};
    if (pasta) r.createFile = (nome, txt) => recurso(false, txt, r);
    recursos.set(r.id, r); return r;
  }
  const pastaExistente = recurso(true);
  recursos.delete(pastaExistente.id);
  pastaExistente.id = '1EcpSh4SOtasiFl4FW_HdG0zGm1D7sbXl';
  recursos.set(pastaExistente.id, pastaExistente);
  const ctx = vm.createContext({console, Date, Set, PropertiesService: {getScriptProperties: () => ({
    getProperty: k => props[k] || null, setProperty: (k, v) => {props[k] = v;}})},
    Session: {getActiveUser: () => user(email), getEffectiveUser: () => user(admin)},
    LockService: {getScriptLock: () => ({waitLock: () => {assert.equal(locked, false); locked = true;}, releaseLock: () => {locked = false;}})},
    DriveApp: {Access: {PRIVATE: 'PRIVATE'}, createFolder: () => recurso(true),
      getFolderById: id => {reads++; return recursos.get(id);}, getFileById: id => {reads++; return recursos.get(id);}},
    MimeType: {PLAIN_TEXT: 'text/plain', GOOGLE_SHEETS: 'google-sheet'},
    Utilities: {getUuid: () => 'uuid-' + ++n, newBlob: blob, formatDate: d => d.toISOString().slice(0, 10),
      DigestAlgorithm: {SHA_256: 'sha256'}, Charset: {UTF_8: 'utf8'},
      computeDigest: (_, text) => Array.from(crypto.createHash('sha256').update(text).digest())}
  });
  ['WebApp.gs','Importacao.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, {filename:f}));
  ctx.hoje_ = () => '2026-11-14';
  return {ctx, props, recursos, setEmail: e => {email = e;}, reads: () => reads};
}
function preparado() {const a = ambiente(); a.ctx.prepararSistema(); return a;}
function mutar(a, p) {return a.ctx.alterarSistema({revisao:a.ctx.ler_().revisao, ...p});}
function lote(ids, extra = {}) {
  return {acao:'pagarTodos',ids,escopo:'diego',visao:'mensal',ano:2026,mes:'2026-11',data:'2026-11-14',...extra};
}
function lancamento(a, extra = {}) {
  mutar(a, {acao:'salvar', colecao:'lancamentos', registro:{nome:'Teste', escopo:'diego', tipo:'saida',
    competencia:'2026-11', valor:1000, meta:0, ...extra}});
  return a.ctx.ler_().lancamentos.at(-1);
}
function sheet(nome, rows) {
  return {getName: () => nome, getLastRow: () => rows.length,
    getRange: (row, col, count, width) => ({getValues: () => Array.from({length:count}, (_, i) =>
      Array.from({length:width}, (_, j) => (rows[row - 1 + i] || [])[col - 1 + j] ?? ''))})};
}

test('IPTV migra base antiga em memória, preserva financeiro e snapshot anterior', () => {
  const a=preparado();lancamento(a,{pagamento:'2026-11-10'});
  const ref=a.props.CP_ESTADO, f=a.recursos.get(JSON.parse(ref).atual), antigo=JSON.parse(f.texto);
  antigo.schema=1;delete antigo.iptv;delete antigo.simulacoes;f.texto=JSON.stringify(antigo);
  const textoAntigo=f.texto, arquivos=a.recursos.size;
  const resposta=a.ctx.consultarSistema(2026);
  assert.equal(resposta.db.schema,3);assert.equal(resposta.db.iptv.length,0);assert.equal(resposta.db.simulacoes.length,0);
  assert.equal(f.texto,textoAntigo);assert.equal(a.props.CP_ESTADO,ref);assert.equal(a.recursos.size,arquivos);
  mutar(a,{acao:'salvar',colecao:'iptv',registro:{nome:'Cliente',telefone:'11999999999',plano:'Mensal',valor:2990,vencimento:'2026-12-14',status:'ativo'}});
  assert.equal(f.texto,textoAntigo);assert.equal(JSON.parse(a.props.CP_ESTADO).anterior,f.id);
  const db=a.ctx.ler_();assert.equal(db.schema,3);assert.equal(db.iptv.length,1);
  assert.equal(JSON.stringify(db.lancamentos),JSON.stringify(antigo.lancamentos));
  assert.equal(JSON.stringify(a.ctx.consultarSistema(2026).resumo),JSON.stringify(resposta.resumo));
});

test('IPTV cadastro, edição, renovação e exclusão preservam dados de outros módulos', () => {
  const a=preparado();lancamento(a);
  const financeiro=JSON.stringify(a.ctx.ler_().lancamentos);
  mutar(a,{acao:'salvar',colecao:'iptv',registro:{nome:' Cliente ',telefone:'11999',plano:'Mensal',valor:2990,vencimento:'2026-11-14',status:'ativo',obs:'Teste',senha:'não persistir'}});
  let cliente=a.ctx.ler_().iptv[0];assert.equal(cliente.nome,'Cliente');assert.equal(cliente.valor,2990);assert.equal(cliente.senha,undefined);
  const anterior=a.props.CP_ESTADO, rev=a.ctx.ler_().revisao;
  mutar(a,{acao:'renovarIPTV',id:cliente.id,data:'2026-12-14'});
  cliente=a.ctx.ler_().iptv[0];assert.equal(cliente.vencimento,'2026-12-14');assert.equal(a.ctx.ler_().revisao,rev+1);
  assert.equal(JSON.parse(a.props.CP_ESTADO).anterior,JSON.parse(anterior).atual);
  assert.equal(a.ctx.ler_().historico.at(-1).acao,'renovarIPTV');
  mutar(a,{acao:'salvar',colecao:'iptv',registro:{...cliente,status:'inativo'}});
  assert.equal(a.ctx.ler_().iptv[0].status,'inativo');
  mutar(a,{acao:'excluir',colecao:'iptv',id:cliente.id});assert.equal(a.ctx.ler_().iptv.length,0);
  assert.equal(JSON.stringify(a.ctx.ler_().lancamentos),financeiro);
});

test('IPTV datas inexistentes, valores e status inválidos não publicam alterações', () => {
  const a=preparado(), registro={nome:'Cliente',telefone:'',plano:'',valor:2990,vencimento:'2026-11-14',status:'ativo'};
  const antes=a.props.CP_ESTADO;
  for (const extra of [{vencimento:''},{vencimento:'2026-02-30'},{vencimento:'14/11/2026'},
    {valor:-1},{valor:29.9},{status:'pendente'},{nome:''},{telefone:'x'.repeat(151)}]) {
    assert.throws(()=>mutar(a,{acao:'salvar',colecao:'iptv',registro:{...registro,...extra}}));
    assert.equal(a.props.CP_ESTADO,antes);
  }
  mutar(a,{acao:'salvar',colecao:'iptv',registro});const cliente=a.ctx.ler_().iptv[0], ref=a.props.CP_ESTADO;
  for (const data of ['', '2026-11-14', '2026-11-13', '2026-02-30']) {
    assert.throws(()=>mutar(a,{acao:'renovarIPTV',id:cliente.id,data}));assert.equal(a.props.CP_ESTADO,ref);
  }
  assert.throws(()=>mutar(a,{acao:'renovarIPTV',id:'ausente',data:'2026-12-14'}),/não encontrado/);
  assert.throws(()=>a.ctx.alterarSistema({acao:'renovarIPTV',id:cliente.id,data:'2026-12-14',revisao:0}),/outra aba/);
  mutar(a,{acao:'salvar',colecao:'iptv',registro:{...cliente,status:'inativo'}});
  assert.throws(()=>mutar(a,{acao:'renovarIPTV',id:cliente.id,data:'2026-12-14'}),/Ative o cliente/);
});

test('IPTV schema novo ausente ou corrompido não é recriado silenciosamente', () => {
  const a=preparado(), f=a.recursos.get(JSON.parse(a.props.CP_ESTADO).atual), texto=f.texto;
  for (const valor of [undefined,null,{},'']) {
    const db=JSON.parse(texto);if(valor===undefined)delete db.iptv;else db.iptv=valor;
    f.texto=JSON.stringify(db);assert.throws(()=>a.ctx.consultarSistema(2026),/Coleção inválida/);
  }
  const db=JSON.parse(texto);db.schema=1;db.iptv=null;f.texto=JSON.stringify(db);
  assert.throws(()=>a.ctx.consultarSistema(2026),/Coleção inválida/);
  f.texto=texto;
});

test('simulações migram schema2 sem escrever e preservam contas legadas', () => {
  const a=preparado();mutar(a,{acao:'salvar',colecao:'contas',registro:{nome:'Energia',servico:'Energia',dia:10}});
  const ref=a.props.CP_ESTADO, f=a.recursos.get(JSON.parse(ref).atual), db=JSON.parse(f.texto);
  db.schema=2;delete db.simulacoes;f.texto=JSON.stringify(db);const texto=f.texto;
  assert.equal(a.ctx.consultarSistema(2026).db.simulacoes.length,0);
  assert.equal(a.props.CP_ESTADO,ref);assert.equal(f.texto,texto);
  mutar(a,{acao:'salvar',colecao:'simulacoes',registro:{nome:'Pintura',materiais:100,maoObra:200,outros:0,reserva:30}});
  assert.equal(f.texto,texto);assert.equal(a.ctx.ler_().contas[0].nome,'Energia');
  const atual=a.recursos.get(JSON.parse(a.props.CP_ESTADO).atual), novo=JSON.parse(atual.texto);delete novo.simulacoes;
  atual.texto=JSON.stringify(novo);assert.throws(()=>a.ctx.ler_(),/Coleção inválida/);
});

test('simulações usam apenas caixa real do condomínio e salvam sem criar despesas', () => {
  const a=preparado(), config=a.ctx.ler_().config;config.saldos.condominio={data:'2026-11-01',valor:100000};
  mutar(a,{acao:'config',config});
  lancamento(a,{escopo:'condominio',tipo:'entrada',valor:20000,pagamento:'2026-11-14'});
  lancamento(a,{escopo:'condominio',tipo:'saida',valor:10000,pagamento:'2026-11-10'});
  lancamento(a,{escopo:'condominio',tipo:'entrada',valor:99999});
  lancamento(a,{escopo:'condominio',valor:8000,pagamento:'2026-10-31'});
  lancamento(a,{escopo:'diego',tipo:'entrada',valor:99999,pagamento:'2026-11-14'});
  const antes=JSON.stringify(a.ctx.ler_().lancamentos), resumo=JSON.stringify(a.ctx.consultarSistema(2026).resumo);
  const registro={nome:'Reforma',materiais:50000,maoObra:40000,outros:10000,reserva:20000,saldoBase:999999,data:'2200-01-01'};
  mutar(a,{acao:'salvar',colecao:'simulacoes',registro});let salvo=a.ctx.ler_().simulacoes[0];
  assert.equal(salvo.saldoBase,110000);assert.equal(salvo.data,'2026-11-14');
  assert.equal(salvo.saldoBase-salvo.materiais-salvo.maoObra-salvo.outros-salvo.reserva,-10000);
  assert.equal(JSON.stringify(a.ctx.ler_().lancamentos),antes);assert.equal(JSON.stringify(a.ctx.consultarSistema(2026).resumo),resumo);
  lancamento(a,{escopo:'condominio',tipo:'entrada',valor:5000,pagamento:'2026-11-14'});
  assert.equal(a.ctx.ler_().simulacoes[0].saldoBase,110000);
  mutar(a,{acao:'salvar',colecao:'simulacoes',registro:{...salvo,nome:'Reforma recalculada'}});
  salvo=a.ctx.ler_().simulacoes[0];assert.equal(salvo.saldoBase,115000);
  mutar(a,{acao:'excluir',colecao:'simulacoes',id:salvo.id});assert.equal(a.ctx.ler_().simulacoes.length,0);
});

test('simulações rejeitam custos inválidos e saldo sem referência atual', () => {
  const a=preparado(), registro={nome:'Teste',materiais:100,maoObra:0,outros:0,reserva:0};
  const ref=a.props.CP_ESTADO;
  for(const valor of [-1,1.5,null,'',100000000001]) {
    assert.throws(()=>mutar(a,{acao:'salvar',colecao:'simulacoes',registro:{...registro,materiais:valor}}));
    assert.equal(a.props.CP_ESTADO,ref);
  }
  const config=a.ctx.ler_().config;config.saldos.condominio.data='2027-01-01';mutar(a,{acao:'config',config});
  assert.equal(a.ctx.saldoAtualCondominio_(a.ctx.ler_(),'2026-11-14'),null);
  assert.throws(()=>mutar(a,{acao:'salvar',colecao:'simulacoes',registro}),/indisponível/);
});

test('páginas autorizada e restrita usam favicon próprio sem ler dados do Drive', () => {
  const a = ambiente();
  let scopes = 0;
  function output() {
    return {setTitle(v) {this.title = v; return this;},
      setFaviconUrl(v) {this.favicon = v; return this;},
      addMetaTag() {return this;}};
  }
  a.ctx.HtmlService = {createHtmlOutput: () => output(),
    createTemplateFromFile: nome => {assert.equal(nome, 'Index'); return {evaluate: output};}};
  a.ctx.ScriptApp = {AuthMode: {FULL: 'FULL'}, requireAllScopes: modo => {
    assert.equal(modo, 'FULL'); scopes++;
  }};
  const autorizado = a.ctx.doGet();
  assert.equal(autorizado.favicon, 'https://portal.aeuv.org/assets/meu-controle/icon-192.png');
  assert.equal(autorizado.title, 'Diego Machado — Controle pessoal');
  a.setEmail('outra@example.com');
  const restrito = a.ctx.doGet();
  assert.equal(restrito.favicon, autorizado.favicon);
  assert.equal(restrito.title, 'Acesso restrito');
  assert.equal(scopes, 1);
  assert.equal(a.reads(), 0);
});

test('baixa em lote publica uma versão e preserva baixas anteriores e outras pessoas', () => {
  const a = preparado();
  const saida=lancamento(a), entrada=lancamento(a,{tipo:'entrada',valor:3000});
  const pago=lancamento(a,{pagamento:'2026-11-01'}), iris=lancamento(a,{escopo:'iris'});
  const rev=a.ctx.ler_().revisao;
  mutar(a,lote([saida.id,entrada.id]));
  const db=a.ctx.ler_();
  assert.equal(db.revisao,rev+1);
  assert.equal(db.lancamentos.find(l=>l.id===saida.id).pagamento,'2026-11-14');
  assert.equal(db.lancamentos.find(l=>l.id===entrada.id).pagamento,'2026-11-14');
  assert.equal(db.lancamentos.find(l=>l.id===pago.id).pagamento,'2026-11-01');
  assert.equal(db.lancamentos.find(l=>l.id===iris.id).pagamento,'');
  assert.equal(a.ctx.consultarSistema(2026).resumo.diego[10].caixaEntrada,3000);
});

test('baixa em lote inválida não grava nenhuma alteração', () => {
  const a=preparado(), l=lancamento(a), iris=lancamento(a,{escopo:'iris'}),
    fora=lancamento(a,{competencia:'2026-10'}), pago=lancamento(a,{pagamento:'2026-11-01'});
  const antes=JSON.stringify(a.ctx.ler_());
  for (const pedido of [lote([]),lote([l.id,l.id]),lote([l.id,'ausente']),lote([l.id,iris.id]),
    lote([l.id,fora.id]),lote([l.id,pago.id]),lote([l.id],{data:''}),lote([l.id],{data:'2026-11-15'}),
    lote([l.id],{data:'2026-02-30'}),lote([l.id],{ano:2025})]) {
    assert.throws(()=>mutar(a,pedido));
    assert.equal(JSON.stringify(a.ctx.ler_()),antes);
  }
});

test('baixa anual aceita vários meses apenas do ano informado e rejeita revisão antiga', () => {
  const a=preparado(), jan=lancamento(a,{competencia:'2026-01'}), nov=lancamento(a);
  const rev=a.ctx.ler_().revisao;
  mutar(a,lote([jan.id,nov.id],{visao:'anual'}));
  assert.ok(a.ctx.ler_().lancamentos.every(l=>l.pagamento==='2026-11-14'));
  assert.throws(()=>a.ctx.alterarSistema({...lote([jan.id]),revisao:rev}),/outra aba/);
});

test('manifesto e scripts têm sintaxe válida; execução usa usuário Google', () => {
  ambiente();
  const cliente = fs.readFileSync(path.join(root,'Cliente.html'),'utf8').replace(/^<script>\s*/, '').replace(/<\/script>\s*$/, '');
  new vm.Script(cliente, {filename:'Cliente.html'});
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'appsscript.json'),'utf8'));
  assert.equal(manifest.webapp.executeAs,'USER_ACCESSING');
  assert.equal(manifest.webapp.access,'ANYONE');
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/userinfo.email'));
});

test('conta diferente ou sessão vazia não lê Drive nem usa proprietário como fallback', () => {
  const a = ambiente();
  for (const email of ['', 'outra@example.com', 'deejaydiego@gmail.com.evil']) {
    a.setEmail(email);
    for (const fn of [() => a.ctx.consultarSistema(2026), () => a.ctx.prepararSistema(),
      () => a.ctx.preverImportacao({}), () => a.ctx.alterarSistema({})]) assert.throws(fn,/Acesso restrito/);
  }
  assert.equal(a.reads(),0);
});

test('preparação é idempotente; snapshots e ponteiro preservam versão anterior', () => {
  const a = preparado(), first = JSON.parse(a.props.CP_ESTADO);
  a.ctx.prepararSistema(); assert.equal(a.recursos.size,2);
  lancamento(a);
  const second = JSON.parse(a.props.CP_ESTADO);
  assert.equal(second.anterior,first.atual);
  assert.equal(JSON.parse(a.recursos.get(first.atual).texto).lancamentos.length,0);
  assert.equal(a.ctx.ler_().lancamentos.length,1);
});

test('pasta compartilhada impede leitura e escrita', () => {
  const a = preparado(); a.recursos.get(a.props.CP_PASTA_ID).sharing = 'ANYONE';
  assert.throws(() => a.ctx.consultarSistema(2026),/compartilhado/);
});

test('arquivo corrompido ou fora da pasta não é substituído por base vazia', () => {
  const a = preparado(), f = a.recursos.get(JSON.parse(a.props.CP_ESTADO).atual);
  const text = f.texto; f.texto = '{}';
  assert.throws(() => a.ctx.consultarSistema(2026),/Estado inválido/);
  f.texto = text; f.parent = null;
  assert.throws(() => a.ctx.consultarSistema(2026),/fora da pasta/);
});

test('campos financeiros corrompidos são rejeitados', () => {
  const a = preparado(); lancamento(a);
  const f = a.recursos.get(JSON.parse(a.props.CP_ESTADO).atual), db = JSON.parse(f.texto);
  db.lancamentos[0].valor = 'não é dinheiro'; f.texto = JSON.stringify(db);
  assert.throws(() => a.ctx.consultarSistema(2026),/Número inteiro/);
});

test('revisão antiga impede repetir operação ou sobrescrever outra aba', () => {
  const a = preparado(), rev = a.ctx.ler_().revisao; lancamento(a);
  assert.throws(() => a.ctx.alterarSistema({revisao:rev,acao:'pagar'}),/outra aba/);
  assert.equal(a.ctx.ler_().lancamentos.length,1);
});

test('datas inexistentes, valores negativos e pagamentos futuros são rejeitados', () => {
  const a = preparado();
  assert.throws(() => a.ctx.data_('2026-02-30'),/inexistente/);
  assert.equal(a.ctx.diaNoMes_('2024-02',31),'2024-02-29');
  for (const extra of [{valor:-1},{valor:0.5},{pagamento:'2026-11-15'},{escopo:'todos'}]) assert.throws(() => lancamento(a,extra));
  assert.equal(a.ctx.ler_().lancamentos.length,0);
});

test('competência e caixa são separados; saldos acumulam sem misturar pessoas', () => {
  const a = preparado();
  const cfg = a.ctx.ler_().config; cfg.saldos.diego.valor = 5000;
  mutar(a,{acao:'config',config:cfg});
  lancamento(a,{tipo:'entrada',valor:10000,pagamento:'2026-10-30'});
  lancamento(a,{valor:3000,pagamento:'2026-11-10'});
  lancamento(a,{valor:2000,vencimento:'2026-11-01'});
  lancamento(a,{escopo:'iris',valor:8000});
  const m = a.ctx.consultarSistema(2026).resumo.diego[10];
  assert.equal(m.entradas,10000); assert.equal(m.saidas,5000); assert.equal(m.saldoInicial,15000);
  assert.equal(m.saldoFinal,12000); assert.equal(m.caixaEntrada,0); assert.equal(m.caixaSaida,3000);
  assert.equal(m.pagar,2000); assert.equal(m.atrasados,2000);
  assert.equal(a.ctx.consultarSistema(2026).resumo.iris[10].saidas,8000);
});

test('saldo com referência no meio do mês exclui pagamentos anteriores', () => {
  const a = preparado(), cfg = a.ctx.ler_().config;
  cfg.saldos.diego = {data:'2026-11-05',valor:10000}; mutar(a,{acao:'config',config:cfg});
  lancamento(a,{valor:3000,pagamento:'2026-11-01'}); lancamento(a,{valor:2000,pagamento:'2026-11-06'});
  const meses = a.ctx.consultarSistema(2026).resumo.diego;
  assert.equal(meses[9].saldoFinal,null); assert.equal(meses[10].saldoInicial,10000); assert.equal(meses[10].saldoFinal,8000);
});

test('baixa e estorno atualizam caixa', () => {
  const a = preparado(), l = lancamento(a);
  mutar(a,{acao:'pagar',id:l.id,data:'2026-11-14'});
  assert.equal(a.ctx.consultarSistema(2026).resumo.diego[10].caixaSaida,1000);
  mutar(a,{acao:'pagar',id:l.id,data:''});
  assert.equal(a.ctx.consultarSistema(2026).resumo.diego[10].caixaSaida,0);
});

test('serviços somam centavos por cartão/pessoa; anual cobra só no aniversário', () => {
  const a = preparado();
  for (const r of [{nome:'A',valor:1990},{nome:'B',valor:1499},{nome:'C',valor:500,cartao:'Outro'},
    {nome:'D',valor:100,escopo:'iris'},{nome:'Anual',valor:12000,ciclo:'anual',inicio:'2026-10'}]) {
    mutar(a,{acao:'salvar',colecao:'servicos',registro:{escopo:'diego',cartao:'Nubank',inicio:'2026-11',ciclo:'mensal',dia:31,...r}});
  }
  mutar(a,{acao:'servicos',mes:'2026-11'}); mutar(a,{acao:'servicos',mes:'2026-11'});
  const ls = a.ctx.ler_().lancamentos;
  assert.equal(ls.length,3); assert.equal(ls.find(l=>l.conta==='Nubank'&&l.escopo==='diego').valor,3489);
  assert.ok(ls.every(l=>l.vencimento==='2026-11-30'));
  assert.equal(a.ctx.servicosNoMes_(a.ctx.ler_(),'2027-10').some(s=>s.nome==='Anual'),true);
  assert.equal(a.ctx.servicosNoMes_(a.ctx.ler_(),'2027-11').some(s=>s.nome==='Anual'),false);
  assert.throws(()=>mutar(a,{acao:'excluir',colecao:'lancamentos',id:ls[0].id}),/não pode ser excluído/);
  assert.throws(()=>mutar(a,{acao:'salvar',colecao:'lancamentos',registro:ls[0]}),/imutáveis/);
});

test('fim cancela serviços futuros e login com senha é recusado', () => {
  const a = preparado(), db = a.ctx.ler_();
  const base = {nome:'Teste',escopo:'diego',valor:100,inicio:'2026-10',fim:'2026-11',ciclo:'mensal',dia:1};
  const s = a.ctx.normalizar_('servicos',base,db); db.servicos.push(s);
  assert.equal(a.ctx.servicosNoMes_(db,'2026-12').length,0);
  assert.throws(()=>a.ctx.normalizar_('servicos',{...base,login:'usuario/senha-exemplo'},db),/nunca senhas/);
});

test('cópia mensal elimina baixas, ajusta fevereiro e não duplica após editar', () => {
  const a = preparado(); lancamento(a,{competencia:'2026-01',vencimento:'2026-01-31',pagamento:'2026-01-31'});
  const p={acao:'copiar',origem:'2026-01',destino:'2026-02',escopo:'diego'};
  mutar(a,p);let copia=a.ctx.ler_().lancamentos[1];
  assert.equal(copia.vencimento,'2026-02-28'); assert.equal(copia.pagamento,'');
  mutar(a,{acao:'salvar',colecao:'lancamentos',registro:{...copia,nome:'Editado'}});mutar(a,p);
  assert.equal(a.ctx.ler_().lancamentos.length,2);
});

test('checklist verificado calcula próxima data; contato vinculado não é excluído', () => {
  const a = preparado();
  mutar(a,{acao:'salvar',colecao:'checklist',registro:{nome:'Extintor',intervalo:30,status:'pendente',prioridade:'alta'}});
  const id=a.ctx.ler_().checklist[0].id;mutar(a,{acao:'verificar',id,data:'2026-11-14'});
  assert.equal(a.ctx.ler_().checklist[0].proxima,'2026-12-14');
  mutar(a,{acao:'salvar',colecao:'contatos',registro:{nome:'Fornecedor',tipo:'Seguro'}});
  const contatoId=a.ctx.ler_().contatos[0].id;
  mutar(a,{acao:'salvar',colecao:'contas',registro:{nome:'Seguro',servico:'Seguro predial',dia:1,contatoId}});
  assert.throws(()=>mutar(a,{acao:'excluir',colecao:'contatos',id:contatoId}),/vinculado/);
});

test('importação exclui credenciais/totais e mantém mãe, salário e serviços separados', () => {
  const a = preparado(), rows = Array.from({length:35},()=>Array(11).fill(''));
  rows[1][0]='Energia';rows[1][1]=101.41;rows[1][3]='Dia 6';
  rows[16][7]='Energia mãe';rows[16][9]=294.82;
  rows[25][7]='SALARIO';rows[25][8]=2939.25;
  rows[27][7]='SALÁRIO LIQUIDO';rows[28][7]=6287.53;rows[28][8]=2700;
  const digitais=sheet('Serviços Digitais',[
    ['Serviço','Valor','Fonte','Cartão','Status','Usuário'],['Netflix',55.9,'Nu Dany','1234','Plano','credencial-proibida'],
    ['TOTAL',55.9],['Bloco lateral ignorado',1000]]);
  a.ctx.comFonte_ = (_,fn)=>fn({getSheets:()=>[sheet('NOVEMBRO 2026',rows),digitais]});
  const p=a.ctx.preverImportacao({fonte:'pessoal',mes:'2026-11'});
  assert.equal(p.dados.registros.length,6);
  assert.ok(!JSON.stringify(p).includes('credencial-proibida'));
  assert.ok(p.dados.registros.every(r=>r.registro.nome!=='TOTAL'));
  const chaves=p.dados.registros.map(r=>r.chave);
  const pedido={acao:'importar',opcoes:{fonte:'pessoal',mes:'2026-11'},digest:p.digest,chaves,confirmado:true};
  mutar(a,pedido);mutar(a,pedido);
  assert.equal(a.ctx.ler_().lancamentos.length,5); assert.equal(a.ctx.ler_().servicos.length,1);
  assert.ok(a.ctx.ler_().lancamentos.every(l=>l.pagamento===''));
  rows[1][1]=200;
  assert.throws(()=>mutar(a,pedido),/Fonte mudou/);
});

test('condomínio compara SALDO e exclui totais como movimentos', () => {
  const a = preparado(), rows=Array.from({length:20},()=>Array(6).fill(''));
  rows[1]=[140,'Morador',50,'Energia dia 05','',''];rows[16]=[140,'',50,'','',''];
  a.ctx.comFonte_=(_,fn)=>fn({getSheets:()=>[sheet('NOVEMBRO',rows),sheet('SALDO CONDOMINIO',[['Mês','Valor'],['NOVEMBRO',85]])]});
  const p=a.ctx.preverImportacao({fonte:'condominio',mes:'2026-11'});
  assert.equal(p.dados.registros.length,2);
  assert.ok(p.dados.avisos.some(a=>a.includes('DIVERGÊNCIA')));
});
