const CP_FONTES = Object.freeze({
  pessoal: '1CGsjl3iWO3SB6pNfo93weuRApywXPpsI',
  condominio: '1EQlgPxWLxPpUcXiXlzSkYpxTiACEPylT'
});
const CP_MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function chaveTexto_(s) {
  return String(s || '').normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toUpperCase().replace(new RegExp('[^A-Z0-9]', 'g'), '');
}
function aba_(livro, nomes) {
  return livro.getSheets().find(s => nomes.some(n => chaveTexto_(n) === chaveTexto_(s.getName())));
}
function comFonte_(id, fn) {
  // Excel pode estar no Drive sem ser Google Sheets. Converter apenas uma cópia.
  const arquivo = DriveApp.getFileById(id);
  if (arquivo.getMimeType() === MimeType.GOOGLE_SHEETS) return fn(SpreadsheetApp.openById(id));
  if (!new RegExp('spreadsheetml|ms-excel').test(arquivo.getMimeType())) throw new Error('Fonte não é uma planilha Google ou Excel.');
  const copia = Drive.Files.create({name: 'Temporario - Importacao - ' + Utilities.getUuid(),
    mimeType: 'application/vnd.google-apps.spreadsheet', parents: [pasta_().getId()]}, arquivo.getBlob(), {fields: 'id'});
  try { return fn(SpreadsheetApp.openById(copia.id)); }
  finally { DriveApp.getFileById(copia.id).setTrashed(true); }
}

function centavosFonte_(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null;
}
function dataFonte_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return Utilities.formatDate(v, 'America/Sao_Paulo', 'yyyy-MM-dd');
  const m = String(v || '').match(new RegExp('(\\d{2})/(\\d{2})/(\\d{4})'));
  if (m) { try { return data_(m[3] + '-' + m[2] + '-' + m[1]); } catch (e) { return ''; } }
  return '';
}

function montarImportacao_(opcoes) {
  const fonte = opcao_(opcoes.fonte, ['pessoal', 'condominio']);
  const mes = mes_(opcoes.mes);
  const ano = Number(mes.slice(0, 4)), nmes = Number(mes.slice(5)) - 1;
  const id = texto_(opcoes.fonteId, 150, false) || CP_FONTES[fonte];
  if (!new RegExp('^[A-Za-z0-9_-]+$').test(id)) throw new Error('ID da planilha inválido.');
  const resultado = {fonte, fonteId: id, mes, registros: [], avisos: [
    'Datas reais de pagamento não são deduzidas: todos os valores financeiros entram pendentes.',
    'Senha, número de cartão e dados de acesso não são importados. Confira categorias e vencimentos.'
  ]};
  function adicionar(colecao, registro, linha) {
    resultado.registros.push({colecao, registro, chave: [id, fonte, colecao, linha].join(':')});
  }
  function lancamento(nome, valor, escopo, tipo, linha, obs, dia, meta) {
    if (!nome || valor === null) return;
    adicionar('lancamentos', {nome: String(nome).trim(), valor, escopo, tipo, competencia: mes,
      vencimento: dia ? diaNoMes_(mes, dia) : '', pagamento: '', categoria: 'Importado', conta: '',
      unidade: escopo === 'condominio' && tipo === 'entrada' ? String(nome).trim() : '',
      meta: meta || 0, obs: String(obs || '').slice(0, 2000)}, mes + ':' + linha);
  }
  comFonte_(id, livro => {
    const nomeMes = CP_MESES[nmes];
    const variantes = [nomeMes, nomeMes.replace('MARCO', 'MARO')];
    const s = aba_(livro, fonte === 'pessoal' ? variantes.map(n => n + ' ' + ano) : variantes);
    if (!s) throw new Error('Aba mensal não encontrada. Selecione um mês existente na fonte.');
    if (fonte === 'pessoal') {
      const linhas = s.getRange(1, 1, Math.min(s.getLastRow(), 35), 11).getValues();
      linhas.slice(1, 25).forEach((r, i) => {
        const dia = String(r[3] || r[2] || '').match(new RegExp('dia\\s+(\\d{1,2})', 'i'));
        const d = dia && Number(dia[1]) >= 1 && Number(dia[1]) <= 31 ? Number(dia[1]) : 0;
        if (r[0] && typeof r[0] === 'string') lancamento(r[0], centavosFonte_(r[1]), 'diego', 'saida', 'A' + (i + 2),
          [r[2], r[3]].filter(Boolean).join(' | '), d, centavosFonte_(r[5]));
      });
      // Bloco mãe: H=descrição, I=status, J=valor. Não importar reservas/saldos como gastos.
      linhas.slice(16, 25).forEach((r, i) => {
        if (r[7] && !['RESERVA', 'SALARIO', 'SALD'].some(k => chaveTexto_(r[7]).startsWith(k))) {
          const dia = String(r[7]).match(new RegExp('dia\\s+(\\d{1,2})', 'i'));
          lancamento(r[7], centavosFonte_(r[9]), 'iris', 'saida', 'H' + (i + 17), r[8], dia ? Number(dia[1]) : 0);
        }
      });
      linhas.forEach((r, i) => {
        if (chaveTexto_(r[7]) === 'SALARIO' && typeof r[8] === 'number') {
          lancamento('Salário — Iris Marta', centavosFonte_(r[8]), 'iris', 'entrada', 'salario-mae-' + i, '', 0);
        }
        if (chaveTexto_(r[7]) === 'SALARIOLIQUIDO' && linhas[i + 1]) {
          ['Salário líquido', 'Ajuda de custo'].forEach((nome, c) => {
            lancamento(nome, centavosFonte_(linhas[i + 1][7 + c]), 'diego', 'entrada', 'renda-' + c, '', 0);
          });
        }
      });
      const digitais = livro.getSheets().find(a => new RegExp('^SERV.*DIGITAIS$').test(chaveTexto_(a.getName())));
      if (digitais) {
        // Somente A:E até TOTAL. A coluna de login/senha e blocos laterais não são lidos.
        const dados = digitais.getRange(1, 1, Math.min(digitais.getLastRow(), 100), 5).getValues();
        for (let i = 1; i < dados.length; i++) {
          const r = dados[i];
          if (chaveTexto_(r[0]) === 'TOTAL') break;
          const valor = centavosFonte_(r[1]);
          if (!r[0] || valor === null) continue;
          adicionar('servicos', {nome: String(r[0]), valor, escopo: 'diego', inicio: mes, fim: '', ciclo: 'mensal', dia: 2,
            cartao: chaveTexto_(r[2]).includes('DIEGO') ? 'Cartão Nubank Diego' : 'Cartão Nubank Dany',
            obs: String(r[4] || ''), login: '', url: ''}, 'digital-' + (i + 1));
        }
      }
      resultado.avisos.push('O layout pessoal foi mapeado a partir de NOVEMBRO 2026. Meses antigos podem exigir ajustes manuais.',
        'Há serviços com o mesmo nome na fonte. São preservados para conferência, não fundidos por suposição.',
        'Serviços importados começam no mês selecionado; não recriam automaticamente preços históricos.',
        'Faturas completas podem já incluir os serviços. Antes de gerar os subtotais, desconte-os da fatura ou mantenha apenas uma forma de controle.');
    } else {
      resultado.avisos.push('Abas do condomínio não indicam ano no nome. O ano selecionado deve ser confirmado por você.');
      const linhas = s.getRange(2, 1, 15, 6).getValues();
      let entradas = 0, saidas = 0;
      linhas.forEach((r, i) => {
        const entrada = centavosFonte_(r[0]), saida = centavosFonte_(r[2]);
        const dia = String(r[3] || '').match(new RegExp('dia\\s+(\\d{1,2})', 'i'));
        if (r[1] && entrada !== null) { lancamento(r[1], entrada, 'condominio', 'entrada', 'entrada-' + (i + 2), r[5], 0); entradas += entrada; }
        if (typeof r[3] === 'string' && r[3].trim() && saida !== null) {
          lancamento(r[3], saida, 'condominio', 'saida', 'saida-' + (i + 2), r[5], dia ? Number(dia[1]) : 0); saidas += saida;
        } else if (saida !== null && saida > 0) resultado.avisos.push('Saída da linha ' + (i + 2) + ' sem descrição textual: não importada.');
      });
      const saldo = aba_(livro, ['SALDO CONDOMINIO']);
      if (saldo) {
        const valores = saldo.getRange(2, 1, 12, 2).getValues();
        const linha = valores.find(r => variantes.some(n => chaveTexto_(n) === chaveTexto_(r[0])));
        if (linha && typeof linha[1] === 'number') {
          const registrado = Math.round(linha[1] * 100);
          resultado.avisos.push('Resultado mensal calculado: R$ ' + ((entradas - saidas) / 100).toFixed(2) +
            '; aba SALDO CONDOMINIO: R$ ' + (registrado / 100).toFixed(2) +
            (registrado !== entradas - saidas ? '. DIVERGÊNCIA: conferir antes de usar o saldo.' : '. Valores coincidem.'));
        }
      }
      const contatos = aba_(livro, ['CONTATOS']);
      if (contatos && contatos.getLastRow() > 1) contatos.getRange(2, 1, contatos.getLastRow() - 1, 3).getValues().forEach((r, i) => {
        if (r[0] && r[1]) adicionar('contatos', {nome: String(r[1]), tipo: String(r[0]), telefone: String(r[2] || ''), obs: ''}, 'contato-' + (i + 2));
      });
      const checklist = aba_(livro, ['CHECK-LIST', 'CHACK-LIST']);
      if (checklist && checklist.getLastRow() > 1) checklist.getRange(2, 1, checklist.getLastRow() - 1, 6).getValues().forEach((r, i) => {
        if (r[0]) adicionar('checklist', {nome: String(r[0]), ultima: dataFonte_(r[1]), proxima: dataFonte_(r[3]), intervalo: 0,
          obs: [r[2], r[3]].filter(Boolean).join(' | '), status: new RegExp('ANDAMENTO', 'i').test(String(r[3])) ? 'andamento' : new RegExp('^OK', 'i').test(String(r[3])) ? 'ok' : 'pendente',
          prioridade: 'media', responsavel: 'Diego Machado'}, 'check-' + (i + 2));
        if (r[5] && !new RegExp('^https:', 'i').test(String(r[5]))) adicionar('checklist', {nome: 'Pendência — ' + String(r[5]).slice(0, 180), ultima: '', proxima: '', intervalo: 0,
          obs: String(r[5]), status: 'pendente', prioridade: 'media', responsavel: 'Diego Machado'}, 'pendencia-' + (i + 2));
      });
      resultado.avisos.push('Saldo inicial não foi alterado. Configure o valor anterior à primeira movimentação com base no extrato bancário.',
        'Periodicidades do checklist não são deduzidas do texto: revise a próxima data e o intervalo em dias.');
    }
  });
  if (resultado.registros.length > 500) throw new Error('Importação acima de 500 registros. Importe por mês.');
  return resultado;
}

function digestImportacao_(resultado) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(resultado), Utilities.Charset.UTF_8)
    .map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}
function preverImportacao(opcoes) {
  autorizar_(); pasta_();
  const resultado = montarImportacao_(opcoes || {});
  const db = ler_();
  resultado.registros.forEach(r => { r.jaImportado = db.importacoes.includes(r.chave); });
  const copia = JSON.parse(JSON.stringify(resultado));
  copia.registros.forEach(r => { delete r.jaImportado; });
  return {dados: resultado, digest: digestImportacao_(copia), revisao: db.revisao};
}
function aplicarImportacao_(db, pedido) {
  if (pedido.confirmado !== true) throw new Error('Confirme a conferência da prévia.');
  const resultado = montarImportacao_(pedido.opcoes || {});
  if (!pedido.digest || pedido.digest !== digestImportacao_(resultado)) throw new Error('Fonte mudou desde a prévia. Gere uma nova prévia.');
  const selecionadas = pedido.chaves;
  if (!Array.isArray(selecionadas) || !selecionadas.length || selecionadas.length > 500 ||
      selecionadas.some(k => !resultado.registros.some(r => r.chave === k))) throw new Error('Seleção de importação inválida.');
  resultado.registros.forEach(item => {
    if (!selecionadas.includes(item.chave) || db.importacoes.includes(item.chave)) return;
    const r = normalizar_(item.colecao, item.registro, db);
    r.origem = 'importacao'; r.chave = item.chave;
    db[item.colecao].push(r); db.importacoes.push(item.chave);
  });
}
