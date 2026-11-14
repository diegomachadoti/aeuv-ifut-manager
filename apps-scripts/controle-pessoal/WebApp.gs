const CP = Object.freeze({
  admin: 'deejaydiego@gmail.com',
  nome: 'Diego Machado — Controle pessoal',
  faviconUrl: 'https://portal.aeuv.org/assets/meu-controle/icon-192.png',
  pasta: 'Diego Machado - Controle Pessoal e Edificio Lisboa',
  pastaExistenteId: '1EcpSh4SOtasiFl4FW_HdG0zGm1D7sbXl',
  escopos: ['diego', 'iris', 'condominio'],
  colecoes: ['lancamentos', 'servicos', 'contatos', 'contas', 'checklist', 'iptv', 'simulacoes'],
  maxBytes: 4 * 1024 * 1024
});
function autorizar_() {
  // Nunca usar EffectiveUser como fallback para a identidade do visitante.
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (email !== CP.admin) throw new Error('Acesso restrito ao administrador. Entre com a Conta Google autorizada.');
  return email;
}
function doGet() {
  try { autorizar_(); } catch (e) {
    return HtmlService.createHtmlOutput('<!doctype html><html lang="pt-BR"><body><h1>Acesso restrito</h1><p>Use a Conta Google do administrador. Nenhum dado foi carregado.</p></body></html>')
      .setTitle('Acesso restrito').setFaviconUrl(CP.faviconUrl)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle(CP.nome)
    .setFaviconUrl(CP.faviconUrl)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function incluir_(nome) { return HtmlService.createHtmlOutputFromFile(nome).getContent(); }
function privado_(recurso) {
  const owner = recurso.getOwner();
  if (!owner || owner.getEmail().toLowerCase() !== CP.admin || recurso.getSharingAccess() !== DriveApp.Access.PRIVATE ||
      recurso.getEditors().concat(recurso.getViewers()).some(u => u.getEmail().toLowerCase() !== CP.admin)) {
    throw new Error('Recurso fora da conta administradora ou compartilhado. Revise as permissões no Drive.');
  }
  if (recurso.isTrashed()) throw new Error('Recurso do sistema está na lixeira. Restaure-o antes de continuar.');
  return recurso;
}
function pasta_() {
  const id = PropertiesService.getScriptProperties().getProperty('CP_PASTA_ID');
  if (!id) throw new Error('Sistema não preparado. Use Preparar sistema.');
  return privado_(DriveApp.getFolderById(id));
}
function vazio_() {
  const saldos = {};
  CP.escopos.forEach(e => { saldos[e] = {data: '2026-01-01', valor: 0}; });
  return {schema: 3, revisao: 0, atualizadoEm: '', config: {cartao: 'Cartão Nubank Dany', saldos},
    lancamentos: [], servicos: [], contatos: [], contas: [], checklist: [], iptv: [], simulacoes: [], importacoes: [], historico: []};
}
function ler_() {
  const pasta = pasta_();
  const ref = JSON.parse(PropertiesService.getScriptProperties().getProperty('CP_ESTADO') || 'null');
  if (!ref) throw new Error('Preparação incompleta. Execute Preparar sistema novamente.');
  const arquivo = privado_(DriveApp.getFileById(ref.atual));
  const pais = arquivo.getParents();
  let pertence = false;
  while (pais.hasNext()) if (pais.next().getId() === pasta.getId()) pertence = true;
  if (!pertence || arquivo.getSize() > CP.maxBytes) throw new Error('Arquivo de dados fora da pasta ou acima do limite.');
  const db = JSON.parse(arquivo.getBlob().getDataAsString('UTF-8'));
  // Migração aditiva em memória. O snapshot anterior nunca é sobrescrito.
  if (db && db.schema === 1) {
    if (!Object.prototype.hasOwnProperty.call(db, 'iptv')) db.iptv = [];
    db.schema = 2;
  }
  if (db && db.schema === 2) {
    if (!Object.prototype.hasOwnProperty.call(db, 'simulacoes')) db.simulacoes = [];
    db.schema = 3;
  }
  validarEstado_(db);
  if (db.revisao !== ref.revisao) throw new Error('Revisão do arquivo diverge do ponteiro. Preserve os backups.');
  return db;
}
function validarEstado_(db) {
  if (!db || db.schema !== 3 || !Number.isSafeInteger(db.revisao) || !db.config || !db.config.saldos ||
      !Array.isArray(db.historico) || !Array.isArray(db.importacoes)) throw new Error('Estado inválido; restaure uma versão íntegra.');
  texto_(db.config.cartao, 150, true);
  CP.escopos.forEach(e => {
    const saldo = db.config.saldos[e];
    if (!saldo) throw new Error('Saldo inicial ausente.');
    data_(saldo.data); inteiro_(saldo.valor, -100000000000, 100000000000);
  });
  CP.colecoes.forEach(c => {
    if (!Array.isArray(db[c]) || db[c].length > 12000) throw new Error('Coleção inválida ou limite de 12.000 registros atingido.');
    const ids = new Set();
    db[c].forEach(r => {
      if (!r || !r.id || ids.has(r.id)) throw new Error('Registro sem identidade ou duplicado.');
      ids.add(r.id);
      const normal = normalizar_(c, r, Object.assign({}, db, {lancamentos: []}));
      Object.keys(normal).forEach(k => {
        if (r[k] !== normal[k]) throw new Error('Campo persistido inválido: ' + k + '. Preserve as versões anteriores.');
      });
      if (c === 'lancamentos' && r.origem === 'servicos') {
        if (!Array.isArray(r.itens) || !r.chave || r.itens.reduce((s, i) => s + inteiro_(i.valor, 0, 100000000000), 0) !== r.valor) {
          throw new Error('Subtotal de serviços divergente.');
        }
      }
    });
  });
}
function gravar_(db, acao) {
  validarEstado_(db);
  db.revisao++;
  db.atualizadoEm = new Date().toISOString();
  db.historico.push({acao, em: db.atualizadoEm, usuario: CP.admin, revisao: db.revisao});
  db.historico = db.historico.slice(-1000);
  const texto = JSON.stringify(db);
  if (Utilities.newBlob(texto).getBytes().length > CP.maxBytes) throw new Error('Limite de 4 MB atingido. Arquive os dados antes de continuar.');
  const props = PropertiesService.getScriptProperties();
  const anterior = JSON.parse(props.getProperty('CP_ESTADO') || 'null');
  const f = pasta_().createFile('Dados - ' + db.revisao + ' - ' + Utilities.getUuid() + '.json', texto, MimeType.PLAIN_TEXT);
  const confirmado = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
  validarEstado_(confirmado);
  if (JSON.stringify(confirmado) !== texto) throw new Error('Falha ao conferir gravação; versão anterior preservada.');
  // Único ponto de publicação. Arquivos anteriores são imutáveis.
  props.setProperty('CP_ESTADO', JSON.stringify({atual: f.getId(), anterior: anterior ? anterior.atual : '', revisao: db.revisao}));
}
function comLock_(fn) {
  autorizar_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { autorizar_(); return fn(); } finally { lock.releaseLock(); }
}
function prepararSistema() {
  return comLock_(() => {
    const props = PropertiesService.getScriptProperties();
    if (!props.getProperty('CP_PASTA_ID')) {
      const pasta = CP.pastaExistenteId ? privado_(DriveApp.getFolderById(CP.pastaExistenteId)) : DriveApp.createFolder(CP.pasta);
      props.setProperty('CP_PASTA_ID', pasta.getId());
    }
    pasta_();
    if (!props.getProperty('CP_ESTADO')) gravar_(vazio_(), 'Preparação');
    return {pastaUrl: pasta_().getUrl(), revisao: ler_().revisao};
  });
}
function texto_(v, max, obrigatorio) {
  const s = String(v == null ? '' : v).trim();
  if ((obrigatorio && !s) || s.length > max) throw new Error('Campo obrigatório vazio ou texto acima do limite (' + max + ').');
  return s;
}
function opcao_(v, opcoes) {
  if (!opcoes.includes(v)) throw new Error('Opção inválida: ' + String(v));
  return v;
}
function inteiro_(v, min, max) {
  if (v === '' || v == null || typeof v === 'boolean') throw new Error('Número obrigatório.');
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error('Número inteiro fora dos limites.');
  return n;
}
function data_(v, opcional) {
  if (!v && opcional) return '';
  const s = String(v || '');
  if (!new RegExp('^\\d{4}-\\d{2}-\\d{2}$').test(s)) throw new Error('Data inválida.');
  const d = new Date(s + 'T12:00:00Z');
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s || s < '1900-01-01' || s > '2200-12-31') throw new Error('Data inexistente ou fora do intervalo.');
  return s;
}
function mes_(v) {
  const s = String(v || '');
  if (!new RegExp('^\\d{4}-\\d{2}$').test(s)) throw new Error('Competência inválida.');
  data_(s + '-01'); return s;
}
function hoje_() { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd'); }
function url_(v) {
  const s = texto_(v, 1000, false);
  if (s && !new RegExp('^https://[^\\s]+$', 'i').test(s)) throw new Error('Use somente links HTTPS.');
  return s;
}
function normalizar_(colecao, p, db) {
  const base = {id: texto_(p.id, 150, false) || Utilities.getUuid(), nome: texto_(p.nome, 200, true), obs: texto_(p.obs, 2000, false)};
  if (colecao === 'lancamentos') {
    Object.assign(base, {
      escopo: opcao_(p.escopo, CP.escopos), tipo: opcao_(p.tipo, ['entrada', 'saida']),
      competencia: mes_(p.competencia), vencimento: data_(p.vencimento, true), pagamento: data_(p.pagamento, true),
      valor: inteiro_(p.valor, 0, 100000000000), meta: inteiro_(p.meta == null ? 0 : p.meta, 0, 100000000000),
      categoria: texto_(p.categoria, 100, false), conta: texto_(p.conta, 150, false),
      unidade: texto_(p.unidade, 100, false), comprovante: url_(p.comprovante)
    });
    if (base.pagamento > hoje_()) throw new Error('Pagamento não pode ter data futura.');
    if (p.id && db.lancamentos.some(l => l.id === p.id && l.origem === 'servicos')) throw new Error('Use a ação de pagamento; totais de serviços são imutáveis.');
  } else if (colecao === 'servicos') {
    Object.assign(base, {escopo: opcao_(p.escopo, ['diego', 'iris']), valor: inteiro_(p.valor, 0, 100000000000),
      cartao: texto_(p.cartao, 150, false) || db.config.cartao, inicio: mes_(p.inicio), fim: p.fim ? mes_(p.fim) : '',
      ciclo: opcao_(p.ciclo, ['mensal', 'anual']), dia: inteiro_(p.dia, 1, 31),
      login: texto_(p.login, 200, false), url: url_(p.url)});
    if (base.fim && base.fim < base.inicio) throw new Error('Fim anterior ao início.');
    if (base.login.includes('/')) throw new Error('Guarde apenas usuário/e-mail, nunca senhas.');
  } else if (colecao === 'contatos') {
    Object.assign(base, {tipo: texto_(p.tipo, 150, true), telefone: texto_(p.telefone, 150, false), email: texto_(p.email, 200, false)});
  } else if (colecao === 'contas') {
    Object.assign(base, {servico: texto_(p.servico, 150, true), titular: texto_(p.titular, 150, false),
      identificador: texto_(p.identificador, 150, false), dia: inteiro_(p.dia, 1, 31), url: url_(p.url),
      contatoId: texto_(p.contatoId, 150, false)});
    if (base.contatoId && !db.contatos.some(c => c.id === base.contatoId)) throw new Error('Contato não encontrado.');
  } else if (colecao === 'checklist') {
    Object.assign(base, {ultima: data_(p.ultima, true), proxima: data_(p.proxima, true),
      intervalo: inteiro_(p.intervalo, 0, 3650), responsavel: texto_(p.responsavel, 150, false),
      status: opcao_(p.status, ['pendente', 'andamento', 'ok']), prioridade: opcao_(p.prioridade, ['baixa', 'media', 'alta'])});
  } else if (colecao === 'iptv') {
    Object.assign(base, {telefone: texto_(p.telefone, 150, false), plano: texto_(p.plano, 150, false),
      valor: inteiro_(p.valor, 0, 100000000000), vencimento: data_(p.vencimento),
      status: opcao_(p.status, ['ativo', 'inativo'])});
  } else if (colecao === 'simulacoes') {
    ['materiais','maoObra','outros','reserva'].forEach(k=>{base[k]=inteiro_(p[k],0,100000000000);});
    base.data = data_(p.data);
    base.saldoBase = inteiro_(p.saldoBase,-1000000000000000,1000000000000000);
    if (base.data > hoje_()) throw new Error('Data de referência da simulação não pode ser futura.');
  } else throw new Error('Coleção inválida.');
  return base;
}
function saldoAtualCondominio_(db, data) {
  const inicio = db.config.saldos.condominio;
  if (data < inicio.data) return null;
  const saldo = db.lancamentos.filter(l=>l.escopo==='condominio' && l.pagamento && l.pagamento>=inicio.data && l.pagamento<=data)
    .reduce((total,l)=>total+(l.tipo==='entrada'?l.valor:-l.valor),inicio.valor);
  return inteiro_(saldo,-1000000000000000,1000000000000000);
}
function consultarSistema(ano) {
  autorizar_();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CP_ESTADO')) return {preparado: false, usuario: CP.admin};
  const db = ler_();
  const a = inteiro_(ano, 1900, 2200);
  return {preparado: true, usuario: CP.admin, db, resumo: resumir_(db, a), pastaUrl: pasta_().getUrl()};
}
function alterarSistema(pedido) {
  return comLock_(() => {
    if (!pedido || typeof pedido !== 'object') throw new Error('Pedido inválido.');
    const db = ler_();
    if (pedido.revisao !== db.revisao) throw new Error('Dados alterados em outra aba ou operação já concluída. Atualize e confira antes de repetir.');
    const acao = pedido.acao;
    if (acao === 'salvar') {
      const c = opcao_(pedido.colecao, CP.colecoes);
      let p = pedido.registro || {};
      const i = db[c].findIndex(r => r.id === p.id);
      if (p.id && i < 0) throw new Error('Registro não encontrado.');
      if (c === 'simulacoes') {
        const data = hoje_(), saldoBase = saldoAtualCondominio_(db,data);
        if (saldoBase === null) throw new Error('Saldo atual indisponível. Confira a data de referência nas configurações.');
        // Nunca confiar no saldo enviado pelo navegador. Editar/salvar atualiza a referência.
        p = Object.assign({},p,{data,saldoBase});
      }
      const r = normalizar_(c, p, db);
      if (i < 0) db[c].push(r); else db[c][i] = Object.assign({}, db[c][i], r);
    } else if (acao === 'excluir') {
      const c = opcao_(pedido.colecao, CP.colecoes);
      const i = db[c].findIndex(r => r.id === pedido.id);
      if (i < 0) throw new Error('Registro não encontrado.');
      if (c === 'contatos' && db.contas.some(r => r.contatoId === pedido.id)) throw new Error('Contato vinculado a uma conta de serviço.');
      if (c === 'lancamentos' && db[c][i].origem === 'servicos') throw new Error('Total de serviços já gerado não pode ser excluído.');
      db[c].splice(i, 1);
    } else if (acao === 'pagar') {
      const l = db.lancamentos.find(r => r.id === pedido.id);
      if (!l) throw new Error('Lançamento não encontrado.');
      l.pagamento = data_(pedido.data, true);
      if (l.pagamento > hoje_()) throw new Error('Pagamento não pode ter data futura.');
    } else if (acao === 'pagarTodos') {
      const data = data_(pedido.data);
      if (data > hoje_()) throw new Error('Pagamento não pode ter data futura.');
      const escopo = opcao_(pedido.escopo, CP.escopos);
      const visao = opcao_(pedido.visao, ['mensal', 'anual']);
      const ano = inteiro_(pedido.ano, 1900, 2200);
      const mes = mes_(pedido.mes);
      if (Number(mes.slice(0, 4)) !== ano) throw new Error('Ano e mês divergentes.');
      const ids = pedido.ids;
      if (!Array.isArray(ids) || !ids.length || ids.length > 12000 || new Set(ids).size !== ids.length ||
          ids.some(id => typeof id !== 'string' || !id)) throw new Error('Seleção de baixa inválida.');
      const porId = new Map(db.lancamentos.map(l => [l.id, l]));
      const alvos = ids.map(id => {
        const l = porId.get(id);
        if (!l || l.escopo !== escopo || (visao === 'mensal' ? l.competencia !== mes : l.competencia.slice(0, 4) !== String(ano))) {
          throw new Error('Registro fora da pessoa/entidade ou período selecionado.');
        }
        if (l.pagamento) throw new Error('Há registro já baixado. Atualize e confira a seleção.');
        return l;
      });
      // Validar todo o lote antes de modificar; publicar todas as baixas numa versão.
      alvos.forEach(l => { l.pagamento = data; });
    } else if (acao === 'renovarIPTV') {
      const cliente = db.iptv.find(r => r.id === pedido.id);
      if (!cliente) throw new Error('Cliente IPTV não encontrado.');
      if (cliente.status !== 'ativo') throw new Error('Ative o cliente no cadastro antes de renovar.');
      const vencimento = data_(pedido.data);
      if (vencimento <= cliente.vencimento || vencimento < hoje_()) {
        throw new Error('A nova data deve ser posterior ao vencimento atual e não pode estar no passado.');
      }
      cliente.vencimento = vencimento;
    } else if (acao === 'verificar') {
      const item = db.checklist.find(r => r.id === pedido.id);
      if (!item) throw new Error('Item não encontrado.');
      item.ultima = data_(pedido.data);
      if (item.ultima > hoje_()) throw new Error('Verificação não pode ter data futura.');
      item.status = 'ok';
      const d = new Date(item.ultima + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + item.intervalo);
      item.proxima = item.intervalo ? data_(d.toISOString().slice(0, 10)) : '';
    } else if (acao === 'servicos') {
      gerarServicos_(db, mes_(pedido.mes));
    } else if (acao === 'copiar') {
      const origem = mes_(pedido.origem), destino = mes_(pedido.destino);
      const escopo = opcao_(pedido.escopo, CP.escopos);
      if (origem === destino) throw new Error('Selecione outro mês de destino.');
      db.lancamentos.filter(l => l.escopo === escopo && l.competencia === origem && l.origem !== 'servicos').forEach(l => {
        const chave = 'copia:' + l.id + ':' + destino;
        if (db.lancamentos.some(x => x.chave === chave)) return;
        const copia = Object.assign({}, l, {id: Utilities.getUuid(), competencia: destino, pagamento: '', chave, origem: 'copia'});
        copia.vencimento = l.vencimento ? diaNoMes_(destino, Number(l.vencimento.slice(-2))) : '';
        db.lancamentos.push(copia);
      });
    } else if (acao === 'config') {
      const c = pedido.config || {};
      const saldos = {};
      CP.escopos.forEach(e => {
        const s = (c.saldos || {})[e] || {};
        saldos[e] = {data: data_(s.data), valor: inteiro_(s.valor, -100000000000, 100000000000)};
      });
      db.config = {cartao: texto_(c.cartao, 150, true), saldos};
    } else if (acao === 'importar') {
      aplicarImportacao_(db, pedido);
    } else throw new Error('Ação inválida.');
    gravar_(db, acao);
    return {revisao: db.revisao};
  });
}
function diaNoMes_(mes, dia) {
  const fim = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate();
  return mes + '-' + String(Math.min(dia, fim)).padStart(2, '0');
}
function servicosNoMes_(db, mes) {
  return db.servicos.filter(s => s.inicio <= mes && (!s.fim || s.fim >= mes) && (s.ciclo === 'mensal' || s.inicio.slice(5) === mes.slice(5)));
}
function gerarServicos_(db, mes) {
  const grupos = {};
  servicosNoMes_(db, mes).forEach(s => {
    const chave = JSON.stringify([s.escopo, s.cartao]);
    if (!grupos[chave]) grupos[chave] = {escopo: s.escopo, cartao: s.cartao, valor: 0, dia: s.dia, itens: []};
    grupos[chave].valor += s.valor;
    grupos[chave].dia = Math.min(grupos[chave].dia, s.dia);
    grupos[chave].itens.push({id: s.id, nome: s.nome, valor: s.valor});
  });
  Object.keys(grupos).forEach(k => {
    const g = grupos[k], chave = 'servicos:' + mes + ':' + k;
    if (db.lancamentos.some(l => l.chave === chave)) return;
    const l = normalizar_('lancamentos', {nome: 'Serviços digitais — ' + g.cartao, escopo: g.escopo, tipo: 'saida',
      competencia: mes, valor: g.valor, vencimento: diaNoMes_(mes, g.dia), conta: g.cartao,
      categoria: 'Serviços digitais', obs: 'Subtotal separado da fatura. Lance somente o restante da fatura para evitar duplicidade.'}, db);
    Object.assign(l, {origem: 'servicos', chave, itens: g.itens});
    db.lancamentos.push(l);
  });
}
function resumir_(db, ano) {
  const resultado = {};
  CP.escopos.forEach(escopo => {
    const ls = db.lancamentos.filter(l => l.escopo === escopo);
    const inicial = db.config.saldos[escopo];
    const meses = [];
    for (let i = 1; i <= 12; i++) {
      const mes = ano + '-' + String(i).padStart(2, '0');
      const inicio = mes + '-01', fim = diaNoMes_(mes, 31);
      const r = {mes, entradas: 0, saidas: 0, recebido: 0, pago: 0, receber: 0, pagar: 0, atrasados: 0,
        caixaEntrada: 0, caixaSaida: 0, saldoInicial: inicial.data <= fim ? inicial.valor : null, saldoFinal: null,
        inicioCaixa: inicial.data > inicio ? inicial.data : inicio};
      ls.forEach(l => {
        const sinal = l.tipo === 'entrada' ? 1 : -1;
        if (l.competencia === mes) {
          r[l.tipo === 'entrada' ? 'entradas' : 'saidas'] += l.valor;
          r[l.pagamento ? (sinal > 0 ? 'recebido' : 'pago') : (sinal > 0 ? 'receber' : 'pagar')] += l.valor;
          if (!l.pagamento && l.vencimento && l.vencimento < hoje_()) r.atrasados += l.valor;
        }
        if (l.pagamento && l.pagamento >= inicial.data) {
          if (r.saldoInicial !== null && l.pagamento < inicio) r.saldoInicial += sinal * l.valor;
          if (l.pagamento >= inicio && l.pagamento <= fim) r[sinal > 0 ? 'caixaEntrada' : 'caixaSaida'] += l.valor;
        }
      });
      r.saldoFinal = r.saldoInicial === null ? null : r.saldoInicial + r.caixaEntrada - r.caixaSaida;
      r.resultado = r.entradas - r.saidas;
      meses.push(r);
    }
    resultado[escopo] = meses;
  });
  return resultado;
}
