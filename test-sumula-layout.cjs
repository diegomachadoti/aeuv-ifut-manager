const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync('apps-scripts\\sistema-interno\\WebApp.gs', 'utf8');
new vm.Script(source);
let html = '', locked = false, conversions = 0, profile = 'admin', authorized = true;
let clockCalls = 0, logoError = false, controlError = null;
const blob = (value, mime = 'text/plain') => ({
  getDataAsString: () => value,
  getContentType: () => mime,
  getBytes: () => Buffer.from(value),
  getAs(type) {
    assert.strictEqual(type, 'application/pdf');
    assert(!locked);
    html = value;
    conversions++;
    return { setName() { return this; }, getBytes: () => Buffer.from('%PDF mock') };
  }
});
const c = vm.createContext({
  console, Date,
  Utilities: {
    formatDate(date, zone, format) {
      assert(date instanceof Date);
      assert.strictEqual(zone, 'America/Sao_Paulo');
      assert.strictEqual(format, 'dd/MM/yyyy HH:mm:ss');
      clockCalls++;
      return '04/10/2026 10:37:50';
    },
    newBlob: (value, mime) => blob(value, mime),
    base64Encode: bytes => Buffer.from(bytes).toString('base64')
  },
  Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
  DriveApp: { getFileById() {
    if (logoError) throw new Error('Logo privado sem acesso');
    return { getBlob: () => blob('private-logo', 'image/png') };
  } },
  LockService: { getScriptLock: () => ({
    waitLock() { assert(!locked); locked = true; },
    releaseLock() { assert(locked); locked = false; }
  }) }
});
vm.runInContext(source, c);
c.identificarUsuario_ = () => ({ autorizado: authorized, usuario: { perfil: profile } });
c.equipesRegistro_ = () => {};
const championship = { id: 'edition-id', nome: 'Copa Várzea 2026', temporada: '2026' };
const teams = [
  { id: 'a', nome: 'Águias', escudo: 'data:image/png;base64,TEAM_A' },
  { id: 'b', nome: 'Beta', escudo: 'data:image/png;base64,TEAM_B' }
];
const game = {
  id: 'game-id', mandanteId: 'a', visitanteId: 'b', campoId: 'field', faseId: 'fase',
  grupoId: 'grupo', rodada: 2, data: '2026-10-04', hora: '23:45',
  status: 'encerrado', golsMandante: 99, golsVisitante: 88
};
c.campeonatos_ = () => [championship];
c.contextoTabela_ = () => ({
  campeonato: championship, equipes: teams, jogos: [game],
  campos: [{ id: 'field', nome: 'Estádio <Local>', endereco: 'Rua A & B' }],
  fases: [{ id: 'fase', nome: 'Primeira fase' }], grupos: [{ id: 'grupo', nome: 'Grupo A' }]
});
let athletes = [
  { nome: 'Atleta Suspenso', cpf: '123.456.789-01', timeVinculado: 'Águias', numero: 7 },
  { nome: 'Pendente', cpf: '98765432100', timeVinculado: 'Águias', numero: 8 },
  { nome: 'Rascunho', cpf: 'SECRETCPF', timeVinculado: 'Águias' },
  { nome: 'Cumprida', timeVinculado: 'Águias' },
  { nome: 'Outra competição', timeVinculado: 'Águias' },
  { nome: 'Outra equipe', timeVinculado: 'Águias' },
  { nome: 'Tipo diferente', timeVinculado: 'Águias' },
  { nome: 'Sem nome', timeVinculado: 'Águias', suspenso: true },
  { nome: '<script>alert("x")</script> & José', cpf: '11122233344', timeVinculado: 'Beta' },
  { nome: 'Inativo', ativo: false, cpf: '00011122233', timeVinculado: 'Águias' },
  { nome: 'Time fora', timeVinculado: 'Cobra' }
];
let commission = [
  { nome: 'Técnica Suspensa', cargo: 'Técnica', cpf: '112.233.445-56', timeVinculado: 'Águias' },
  { nome: 'Técnico Pendente', cpf: '45678901234', timeVinculado: 'Beta' },
  { nome: 'Técnico Inativo', ativo: false, timeVinculado: 'Águias' },
  { nome: '', timeVinculado: 'Águias' }
];
c.atletasCampeonato_ = () => athletes;
c.lerListaCadastroDrive_ = () => commission;
function penalty(punido, changes = {}) {
  return {
    nota: '1', competicao: 'Copa Várzea 2026', equipe: 'Águias', punido,
    tipo: 'Atleta', status: 'DEFINIDA', situacao: 'A CUMPRIR', ...changes
  };
}
let penalties = [
  penalty('atleta   suspenso', { equipe: '  aguias ', competicao: 'copa varzea 2026', situacao: 'A CUMPRIR (2 partidas)' }),
  penalty('Técnica Suspensa', { tipo: 'Comissão técnica' }),
  penalty('Pendente', { status: 'PENDENTE' }),
  penalty('Rascunho', { status: 'RASCUNHO' }),
  penalty('Cumprida', { situacao: 'CUMPRIDA' }),
  penalty('Outra competição', { competicao: 'Copa Várzea 2025' }),
  penalty('Outra equipe', { equipe: 'Beta' }),
  penalty('Tipo diferente', { tipo: 'Comissão técnica' }),
  penalty('', { tipo: 'Equipe' }),
  penalty('Sem nome', { competicao: '' }),
  penalty('Técnico Pendente', { status: 'PENDENTE', equipe: 'Beta', tipo: 'Comissão técnica' })
];
// Mock only the file boundary; execute production listarPunicoes/interpretarPunicoes/matcher.
c.arquivoPunicoes_ = () => {
  if (controlError) throw controlError;
  const columns = vm.runInContext('PUNICOES_COLUNAS', c);
  const content = 'Atualizado em 04/10/2026 10:00\n'
    + penalties.map(p => columns.map(key => p[key] || '').join('|')).join('\n');
  return { getBlob: () => blob(content), getUrl: () => 'https://drive.google.com/control' };
};
const generate = () => c.gerarSumulaJogoCampeonato({ campeonatoId: championship.id, id: game.id });
function verifyTables(markup) {
  const stack = [];
  let count = 0;
  for (const match of markup.matchAll(/<\/?(?:table|tr|td|th)\b[^>]*>/g)) {
    const tag = match[0], closing = tag.startsWith('</'), name = tag.match(/^<\/?(\w+)/)[1];
    if (name === 'table') {
      if (closing) {
        const table = stack.pop();
        assert(table.rows.length);
        const width = table.rows[0].reduce((n, cell) => n + cell.colspan, 0);
        let carried = new Array(width).fill(0);
        for (const row of table.rows) {
          const next = carried.map(n => Math.max(0, n - 1));
          let col = 0;
          for (const cell of row) {
            while (carried[col]) col++;
            for (let offset = 0; offset < cell.colspan; offset++) {
              assert(col + offset < width, 'no excess table columns');
              assert(!carried[col + offset], 'no overlapping rowspan');
              next[col + offset] = cell.rowspan - 1;
            }
            col += cell.colspan;
          }
          while (carried[col]) col++;
          assert.strictEqual(col, width, 'all table rows fill their column grid');
          carried = next;
        }
        count++;
      } else stack.push({ rows: [] });
    } else if (!closing && name === 'tr') stack[stack.length - 1].rows.push([]);
    else if (!closing && (name === 'td' || name === 'th')) {
      const table = stack[stack.length - 1];
      table.rows[table.rows.length - 1].push({
        colspan: Number((tag.match(/colspan="(\d+)"/) || [0, 1])[1]),
        rowspan: Number((tag.match(/rowspan="(\d+)"/) || [0, 1])[1])
      });
    }
  }
  assert.strictEqual(stack.length, 0);
  return count;
}
const first = generate();
assert.strictEqual(first.nome, 'Sumula-game-id.pdf');
assert.strictEqual(first.mimeType, 'application/pdf');
assert(Buffer.from(first.base64, 'base64').toString().startsWith('%PDF'));
assert.strictEqual(clockCalls, 1);
assert(html.includes('@page{size:A4 landscape'));
assert(!/display:(?:flex|grid)/.test(html));
assert(html.includes('AEUV (Associação Esportiva Uberlandense Varzeana)'));
assert(html.includes('data:image/png;base64,cHJpdmF0ZS1sb2dv'));
assert(html.includes('TEAM_A') && html.includes('TEAM_B'));
assert(html.includes('Gerada em: 04/10/2026 10:37:50'));
assert(html.includes('Fuso: America/Sao_Paulo'));
assert(html.includes('Data: 04/10/2026 — Horário: 23:45'));
assert(html.includes('Estádio &lt;Local&gt;') && html.includes('Rua A &amp; B'));
assert(html.includes('Folha 1/1'));
assert(html.includes('atualizado em 04/10/2026 10:00'));
assert(!html.includes('123.456.789-01') && !html.includes('12345678901'));
assert(!html.includes('98765432100') && !html.includes('112.233.445-56'));
assert(!html.includes('45678901234') && !html.includes('11122233344'));
assert(!html.includes('SECRETCPF') && !html.includes('00011122233'));
assert(html.includes('***4567****') && html.includes('***2334****'));
assert(html.includes('***6543****') && html.includes('>—</td>'));
assert(!html.includes('Inativo') && !html.includes('Time fora'));
assert(!html.includes('<script>') && html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; José'));
const rows = [...html.matchAll(/<tr class="suspenso">([\s\S]*?)<\/tr>/g)].map(m => m[1]);
assert.strictEqual(rows.length, 2);
assert(rows.some(row => row.includes('Atleta Suspenso <strong>SUSPENSO</strong>')));
assert(rows.some(row => row.includes('Técnica Suspensa <strong>SUSPENSO</strong>')));
assert(html.includes('.suspenso td{color:#b00020;background:#ffe6e6}'));
for (const label of ['COMISSÃO TÉCNICA', 'ATLETAS', 'Entrada', 'Saída', 'Pedido de tempo',
  'Gols contra', 'ARBITRAGEM', 'Documento', 'Assinatura', 'RELATÓRIO', 'Início', 'Fim', 'Prorrogação']) assert(html.includes(label));
assert(!/faltas acumuladas|defesa dif[ií]cil|assist[eê]ncias/i.test(html));
assert(html.includes('PLACAR: <span class="caixa">&nbsp;</span> × <span class="caixa">&nbsp;</span>'));
assert(!html.includes('>99<') && !html.includes('>88<'));
assert(html.indexOf('COMISSÃO TÉCNICA') < html.indexOf('ATLETAS'));
assert.strictEqual((html.match(/class="linha"/g) || []).length, (22 * 2 - 9) + (4 * 2 - 2));
assert.strictEqual(verifyTables(html), 14);

athletes = Array.from({ length: 58 }, (_, i) => ({
  nome: `Registro atleta ${i}`, numero: i, timeVinculado: i < 53 ? 'Águias' : 'Beta', cpf: '12345678901'
}));
commission = Array.from({ length: 11 }, (_, i) => ({
  nome: `Registro comissão ${i}`, cargo: 'Técnico', timeVinculado: 'Águias'
}));
generate();
assert.strictEqual(clockCalls, 2, 'one captured time per generation, not per page');
assert.strictEqual((html.match(/class="folha/g) || []).length, 3);
assert(html.includes('Folha 3/3'));
for (const item of [...athletes, ...commission]) {
  assert.strictEqual(html.split('>' + item.nome + (item.cargo ? ' —' : '</td>')).length - 1, 1, item.nome + ' included once');
}
assert.strictEqual((html.match(/Gerada em: 04\/10\/2026 10:37:50/g) || []).length, 3);
verifyTables(html);
athletes = [];
commission = Array.from({ length: 17 }, (_, i) => ({ nome: `Comissão extra ${i}`, timeVinculado: 'Beta' }));
teams[0].escudo = '';
teams[1].escudo = '';
generate();
assert(html.includes('Folha 5/5'), 'commission alone drives continuation pages');
assert(!html.includes('alt="Escudo da equipe"'), 'no broken missing crest placeholder');
verifyTables(html);

athletes = [{ nome: 'Atleta Suspenso', timeVinculado: 'Águias' }];
commission = [];
penalties = [];
generate();
assert.strictEqual((html.match(/class="suspenso"/g) || []).length, 0);
for (const changes of [
  { competicao: 'Copa Várzea' }, { competicao: 'Copa Várzea 2026 extra' },
  { competicao: 'edition-id' }, { equipe: '' }, { punido: '' },
  { tipo: 'Equipe' }, { tipo: '' }, { status: '' }, { situacao: 'A CUMPRIRX' }
]) {
  penalties = [penalty('Atleta Suspenso', changes)];
  generate();
  assert(!html.includes('class="suspenso"'), JSON.stringify(changes));
}
const denied = (change, error) => {
  const before = conversions;
  change();
  assert.throws(generate, error);
  assert.strictEqual(conversions, before, 'failure does not return unverified PDF');
  assert(!locked, 'failure releases lock');
};
denied(() => { controlError = new Error('Arquivo de punições ausente'); }, /ausente/);
denied(() => { controlError = new Error('Sem acesso ao controle'); }, /Sem acesso/);
controlError = null;
denied(() => { logoError = true; }, /Logo privado/);
logoError = false;
denied(() => { profile = 'associado'; }, /permissão/);
denied(() => { profile = 'arbitragem'; }, /permissão/);
denied(() => { profile = 'diretoria'; authorized = false; }, /permissão/);
authorized = true;
generate();
assert(!locked);
const allowedModules = c.moduloLiberado_;
c.moduloLiberado_ = () => false;
denied(() => {}, /consultar o controle de punições/);
c.moduloLiberado_ = allowedModules;
console.log(`PASS: PDF layout, table grids, CPF privacy, typed current suspensions, pagination, strict reads/permissions (${conversions} generations). Google PDF visual rendering not tested.`);
