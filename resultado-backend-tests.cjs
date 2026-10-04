const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
const scaffold = fs.readFileSync(path.join(__dirname, 'tabela-backend-tests.cjs'), 'utf8');
const outer = vm.createContext({ require, console, Buffer, process });
vm.runInContext(scaffold.slice(0, scaffold.indexOf('const structure =')), outer);
const h = vm.runInContext(`({
  c, files, teams, writes: () => writes, locked: () => locked,
  lock: value => locked = value, profile: value => profile = value
})`, outer);
const c = h.c;
const copy = value => JSON.parse(JSON.stringify(value));
let checks = 0;
const ok = (value, message) => { assert(value, message); checks++; };
function rejects(fn, regex = /./) {
  const before = h.writes();
  assert.throws(fn, regex);
  assert.equal(h.writes(), before, 'failed calls never persist');
  assert(!h.locked(), 'locks released on failure'); checks++;
}
function seedRoster(type, list) {
  h.lock(true);
  try {
    c.gravarListaCadastroDrive_(c.arquivoCadastroPessoasCampeonato_('cup',
      type === 'atletas' ? 'Atletas' : 'Comissao Tecnica'),
      type === 'atletas' ? c.chaveAtletasCampeonato_('cup') : c.chaveComissaoTecnicaCampeonato_('cup'), list);
  } finally { h.lock(false); }
}
// Restore the production athlete reader (the shared scaffold overrides it for its PDF assertions).
vm.runInContext(fs.readFileSync('apps-scripts\\sistema-interno\\WebApp.gs', 'utf8')
  .match(/ function atletasCampeonato_\([\s\S]*?(?=\n  function gravarAtletasCampeonato_)/)[0], c);
let athletes = [
  { id: 'a1', nome: 'Atleta A', numero: 9, dataNascimento: '2000-01-01', timeVinculado: 'Águia', cpf: 'PRIVATE', foto: 'PRIVATE' },
  { id: 'a2', nome: 'Reserva A', numero: 10, timeVinculado: 'Águia' },
  { id: 'b1', nome: 'Atleta B', numero: 11, timeVinculado: 'Beta' },
  { id: 'inactive', nome: 'Inativo', ativo: false, timeVinculado: 'Águia' }
];
let coaches = [
  { id: 'ca', nome: 'Técnico A', cargo: 'Técnico', timeVinculado: 'Águia', cpf: 'PRIVATE', foto: 'PRIVATE' },
  { id: 'cb', nome: 'Técnico B', cargo: 'Técnico', timeVinculado: 'Beta' },
  { nome: 'Comissão inativa legada', ativo: false, timeVinculado: 'Águia' }
];
h.lock(true);
c.gravarCampeonatos_([{ id: 'cup', nome: 'Copa', temporada: '2026', modalidade: 'Futsal', status: 'ativo',
  visibilidade: 'Interno', revisao: 'champ', estrutura: { faseNome: 'Liga', formato: 'Pontos corridos',
    grupos: 1, vagasPorGrupo: 4, rodadas: 3, idaVolta: false, fasesEliminatorias: [] } }]);
h.lock(false);
seedRoster('atletas', athletes);
seedRoster('comissao', coaches);
let table = c.listarTabelaCampeonato('cup');
const mutate = (fn, extra) => table = c[fn]({ campeonatoId: 'cup', revisao: table.revisao, ...extra });
mutate('salvarCampoCampeonato', { nome: 'Arena', endereco: '', ativo: true });
const fixture = { faseId: 'fase-classificacao', grupoId: '', rodada: 1, mandanteId: 'a', visitanteId: 'b',
  campoId: table.campos[0].id, data: '2026-10-04', hora: '10:00', status: 'agendado' };
rejects(() => mutate('salvarJogoCampeonato', { ...fixture, status: 'encerrado', golsMandante: 1, golsVisitante: 0 }));
rejects(() => mutate('salvarJogoCampeonato', { ...fixture, golsMandante: 1 }));
rejects(() => mutate('salvarJogoCampeonato', { ...fixture, resultado: {} }));
mutate('salvarJogoCampeonato', fixture);
const id = table.jogos[0].id;
const read = () => c.listarResultadoJogoCampeonato({ campeonatoId: 'cup', id });
const build = () => {
  const screen = read();
  return { campeonatoId: 'cup', id, revisao: screen.revisao, revisaoElencos: screen.revisaoElencos,
    golsMandante: 4, golsVisitante: 2, resultado: copy(screen.resultado), equipes: copy(screen.equipes) };
};
let result = read();
ok(result.equipes.every(e => e.atletas.every(a => a.numeroJogo === '')), 'match number starts blank independent of registered numbers');
ok(result.equipes.length === 2 && result.equipes[0].atletas.length === 2 && result.equipes[1].atletas.length === 1,
  'both active rosters only');
ok(result.equipes[0].atletas[0].cpf === 'PRIVATE' && result.equipes[0].comissao[0].cpf === 'PRIVATE'
  && !Object.hasOwn(result.equipes[0].atletas[0], 'foto')
  && !result.equipes[0].comissao.some(p => p.nome.includes('inativa')), 'authorized CPF identification without photos/inactive members');
ok(result.equipes.every(e => e.comissao.every(p => p.participou === false)), 'fresh commission participation defaults false');
ok(result.equipes.every(e => e.atletas.every(a => !a.participou && a.gols === 0 && a.golsContra === 0
  && !Object.hasOwn(a, 'assistencias'))), 'fresh goals and own-goal defaults without visible assist events');
coaches = c.lerListaCadastroDrive_(c.arquivoCadastroPessoasCampeonato_('cup', 'Comissao Tecnica'), c.chaveComissaoTecnicaCampeonato_('cup'));
ok(coaches[2].id && coaches[2].ativo === false, 'legacy ID migration preserves inactive commission');
const invalidCases = [
  p => p.equipes[0].atletas[0].numeroJogo = -1,
  p => p.equipes[0].atletas[0].numeroJogo = 1.5,
  p => p.equipes[0].atletas[0].numeroJogo = '12',
  p => p.golsMandante = -1, p => p.golsVisitante = 1000, p => p.golsMandante = 1.5,
  p => p.golsMandante = '1', p => p.equipes[0].atletas[0].gols = 1000,
  p => p.equipes[0].atletas[0].golsContra = -1, p => p.equipes[0].atletas[0].golsContra = 1000,
  p => p.equipes[0].atletas[0].golsContra = 1.5, p => delete p.equipes[0].atletas[0].golsContra,
  p => p.equipes[0].atletas[0].amarelos = 3,
  p => p.equipes[0].atletas[0].vermelho = 1, p => p.equipes[0].atletas[0].participou = 'true',
  p => p.equipes[0].comissao[0].amarelos = -1, p => p.resultado.wo = 1,
  p => p.equipes[0].comissao[0].participou = 'true',
  p => delete p.equipes[0].comissao[0].participou,
  p => { p.resultado.wo = true; p.resultado.woEquipeId = 'c'; },
  p => p.resultado.observacoes = 'x'.repeat(2001),
  p => p.equipes[0].atletas[0].id = 'b1', p => p.equipes[0].atletas[0].id = 'ca',
  p => p.equipes[0].comissao[0].id = 'a1', p => p.equipes[0].atletas[0].id = 'inactive',
  p => p.equipes[0].atletas.push(copy(p.equipes[0].atletas[0])),
  p => p.equipes[0].atletas[1].id = 'a1', p => p.equipes.pop(),
  p => p.equipes[1].id = 'a', p => p.equipes[0].atletas.pop()
];
for (const change of invalidCases) { const p = build(); change(p); rejects(() => c.salvarResultadoJogoCampeonato(p)); }
let p = build();
athletes[0].cpf = 'UPDATED';
seedRoster('atletas', athletes);
rejects(() => c.salvarResultadoJogoCampeonato(p), /elencos/);
athletes[0].cpf = 'PRIVATE';
seedRoster('atletas', athletes);
p = build();
p.equipes[0].atletas[0] = { ...p.equipes[0].atletas[0], nome: 'FORGED', numero: 88, dataNascimento: 'FORGED',
  numeroJogo: 27, participou: false, gols: 1, golsContra: 1, assistencias: 3, amarelos: 2, vermelho: false };
p.equipes[0].comissao[0] = { ...p.equipes[0].comissao[0], participou: true, cpf: 'FORGED', amarelos: 2, vermelho: true, nome: 'FORGED' };
p.equipes[1].atletas[0] = { ...p.equipes[1].atletas[0], participou: true, gols: 2, golsContra: 1, assistencias: 1, amarelos: 1, vermelho: true };
p.resultado = { wo: true, woEquipeId: 'b', prorrogacao: true, penaltis: true,
  golsPenaltisMandante: 5, golsPenaltisVisitante: 5, observacoes: 'Manual' };
table = c.salvarResultadoJogoCampeonato(p);
ok(table.avisos.length === 2 && table.recado && table.jogos[0].status === 'encerrado',
  'own goals are credited to opponents while manual-score mismatches only warn');
result = read();
ok(result.equipes[0].atletas[0].numeroJogo === 27 && result.equipes[0].atletas[1].numeroJogo === ''
  && c.atletasCampeonato_('cup').find(a => a.id === 'a1').numero === 9, 'optional match number persists without changing registry');
ok(result.equipes[0].atletas[0].nome === 'Atleta A' && result.equipes[0].atletas[0].numero === 9
  && result.equipes[0].atletas[0].dataNascimento === '2000-01-01', 'trusted snapshot identity');
ok(!result.equipes[0].atletas[0].participou && result.equipes[0].atletas[0].gols === 1
  && result.equipes[0].atletas[0].golsContra === 1
  && !Object.hasOwn(result.equipes[0].atletas[0], 'assistencias')
  && result.equipes[0].atletas[0].amarelos === 2 && !result.equipes[0].atletas[0].vermelho,
  'bench stats and yellow cards independent of participation/red');
ok(result.equipes[0].comissao[0].participou && result.equipes[0].comissao[0].cpf === 'PRIVATE'
  && result.equipes[0].comissao[0].amarelos === 2 && result.equipes[0].comissao[0].vermelho, 'commission participation and trusted CPF retained');
ok(table.classificacao.geral.find(r => r.equipeId === 'a').golsPro === 4
  && table.classificacao.geral.find(r => r.equipeId === 'a').pontos === 3, 'WO/penalties informational only');
rejects(() => c.salvarResultadoJogoCampeonato(p), /Recarregue/);
const before = JSON.stringify(table.jogos[0].resultado);
mutate('salvarJogoCampeonato', { id, hora: '11:00' });
ok(table.jogos[0].golsMandante === 4 && table.jogos[0].status === 'encerrado'
  && JSON.stringify(table.jogos[0].resultado) === before, 'normal metadata edit preserves result');
for (const change of [{ status: 'adiado' }, { golsMandante: 5 }, { resultado: null }, { mandanteId: 'b' },
  { visitanteId: 'c' }, { faseId: 'fase-final' }, { grupoId: 'bad' }]) {
  rejects(() => mutate('salvarJogoCampeonato', { id, ...change }));
}
p = build();
athletes[0].nome = 'Renomeado atual';
seedRoster('atletas', athletes);
rejects(() => c.salvarResultadoJogoCampeonato(p), /elencos/);
ok(read().equipes[0].atletas[0].nome === 'Atleta A', 'saved name independent of rename');
p = build();
athletes.push({ nome: 'Novo legado', numero: 14, timeVinculado: 'Beta' });
seedRoster('atletas', athletes);
rejects(() => c.salvarResultadoJogoCampeonato(p), /elencos/);
const migrated = read();
ok(migrated.equipes[1].atletas.some(a => a.nome === 'Novo legado' && a.id), 'read migrates new legacy athlete under lock');
athletes = c.lerListaCadastroDrive_(c.arquivoCadastroPessoasCampeonato_('cup', 'Atletas'), c.chaveAtletasCampeonato_('cup'));
p = build();
athletes = athletes.filter(a => a.id !== 'a1');
athletes.find(a => a.id === 'a2').ativo = false;
coaches.find(a => a.id === 'ca').ativo = false;
seedRoster('atletas', athletes);
seedRoster('comissao', coaches);
rejects(() => c.salvarResultadoJogoCampeonato(p), /elencos/);
result = read();
ok(result.equipes[0].atletas.length === 2 && result.equipes[0].atletas.every(a => !a.disponivel)
  && !result.equipes[0].comissao[0].disponivel, 'removed/inactive saved participants stay editable');
ok(result.equipes[0].atletas[0].cpf === 'PRIVATE' && result.equipes[0].comissao[0].cpf === 'PRIVATE', 'historical CPF survives removal and inactivity');
p = build(); p.equipes[0].atletas[0].gols = 4;
p.equipes.forEach(equipe => equipe.atletas.forEach(atleta => { atleta.golsContra = 0; }));
p.resultado.wo = false; p.resultado.woEquipeId = 'b';
p.resultado.penaltis = false; p.resultado.golsPenaltisMandante = 99; p.resultado.golsPenaltisVisitante = 99;
p.equipes[0].comissao[0].participou = false;
table = c.salvarResultadoJogoCampeonato(p);
ok(read().equipes[0].comissao[0].participou === false && read().equipes[0].comissao[0].vermelho,
  'commission participation correction to false preserves independent cards');
ok(!table.avisos.length && table.jogos[0].resultado.golsPenaltisMandante === null
  && table.jogos[0].resultado.woEquipeId === '', 'historic correction and inactive flags normalize');
const legacySnapshot = c.lerTabelaCampeonato_('cup');
delete legacySnapshot.jogos[0].resultado.equipes[0].atletas[0].numeroJogo;
delete legacySnapshot.jogos[0].resultado.equipes[0].comissao[0].participou;
delete legacySnapshot.jogos[0].resultado.equipes[0].comissao[0].cpf;
delete legacySnapshot.jogos[0].resultado.equipes[0].atletas[0].cpf;
delete legacySnapshot.jogos[0].resultado.equipes[0].atletas[0].golsContra;
legacySnapshot.jogos[0].resultado.equipes[0].atletas[0].assistencias = 6;
h.lock(true);
c.gravarListaCadastroDrive_(c.arquivoTabelaCampeonato_('cup'), c.chaveTabelaCampeonato_('cup'), [legacySnapshot]);
h.lock(false);
result = read();
ok(result.equipes[0].atletas[0].numeroJogo === '', 'legacy snapshot registered number never prefills match number');
ok(result.equipes[0].comissao[0].participou === false && result.equipes[0].comissao[0].cpf === 'PRIVATE',
  'legacy commission defaults absent participation and recovers CPF from inactive same-team registry');
ok(result.equipes[0].atletas[0].cpf === '', 'removed legacy participant without CPF never guesses identity');
ok(result.equipes[0].atletas[0].golsContra === 0 && result.equipes[0].atletas[0].assistencias === 6
  && !Object.hasOwn(legacySnapshot.jogos[0].resultado.equipes[0].atletas[0], 'golsContra'),
  'legacy snapshot without own-goal counter defaults to zero and retains assistance');
// Unrelated operations never consult the registry for validating saved identities.
const originalRoster = c.atletasCampeonato_;
c.atletasCampeonato_ = () => { throw new Error('must not read roster'); };
mutate('salvarJogoCampeonato', { id, hora: '12:00' });
ok(table.jogos[0].resultado.equipes[0].atletas[0].nome === 'Atleta A'
  && table.jogos[0].resultado.equipes[0].atletas[0].assistencias === 6
  && !Object.hasOwn(table.jogos[0].resultado.equipes[0].atletas[0], 'golsContra'),
  'unrelated edit preserves legacy snapshot events independently');
c.atletasCampeonato_ = originalRoster;
// Old finalized games without details remain valid and unchanged by metadata edits.
mutate('salvarJogoCampeonato', { ...fixture, rodada: 2 });
const legacyId = table.jogos[1].id;
h.lock(true);
const doc = c.lerTabelaCampeonato_('cup');
Object.assign(doc.jogos[1], { status: 'encerrado', golsMandante: 7, golsVisitante: 3 });
c.gravarListaCadastroDrive_(c.arquivoTabelaCampeonato_('cup'), c.chaveTabelaCampeonato_('cup'), [doc]);
h.lock(false);
table = c.listarTabelaCampeonato('cup');
mutate('salvarJogoCampeonato', { id: legacyId, hora: '13:00' });
ok(table.jogos[1].golsMandante === 7 && !Object.hasOwn(table.jogos[1], 'resultado'), 'legacy final preserved');
const legacyRead = c.listarResultadoJogoCampeonato({ campeonatoId: 'cup', id: legacyId });
ok(legacyRead.jogo.golsMandante === 7 && legacyRead.equipes[0].atletas.length === 0, 'legacy result opening preserves score/current eligibility');
const tableFile = h.files.get(c.arquivoTabelaCampeonato_('cup'));
const stored = tableFile.text;
for (const corrupt of [
  d => d[0].jogos[0].resultado.equipes[0].atletas[0].amarelos = 3,
  d => d[0].jogos[0].resultado.equipes[0].atletas[0].participou = 'yes',
  d => d[0].jogos[0].resultado = null
]) {
  const d = JSON.parse(stored); corrupt(d); tableFile.text = JSON.stringify(d);
  rejects(() => c.listarTabelaCampeonato('cup'));
}
tableFile.text = stored;
for (const profile of ['associado', 'other']) {
  h.profile(profile);
  rejects(read, /permissão/);
  rejects(() => c.salvarResultadoJogoCampeonato({}), /permissão/);
}
h.profile('admin');
ok(!h.locked(), 'all calls release lock');
console.log(`PASS: ${checks} detailed result backend checks`);
