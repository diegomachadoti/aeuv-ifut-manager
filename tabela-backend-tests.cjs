const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const sourcePath = path.resolve('apps-scripts\\sistema-interno\\WebApp.gs');
const source = fs.readFileSync(sourcePath, 'utf8');
new vm.Script(source);
let serial = 0, locked = false, writes = 0, profile = 'admin', pdfHtml = '';
const files = new Map(), props = new Map();
function blob(value, mime, name) {
  return {
    value, getDataAsString: () => String(value), getContentType: () => mime || 'image/png',
    getBytes: () => Buffer.from(String(value)), setName(next) { name = next; return this; },
    getAs(next) { pdfHtml = String(value); return blob('%PDF-1.4 mock', next, name); }
  };
}
const root = {
  getFilesByName(name) {
    const found = files.has(name) ? [files.get(name)] : [];
    return { hasNext: () => !!found.length, next: () => found.shift() };
  },
  createFile(b) {
    assert(locked, 'all table storage writes use shared lock');
    const name = b.name;
    const f = {
      text: b.value, getBlob() { return blob(this.text, 'application/json', name); },
      setContent(text) { assert(locked); this.text = text; writes++; },
      setTrashed(value) { assert(locked); if (value) files.delete(name); }
    };
    files.set(name, f); writes++;
    return f;
  }
};
const context = vm.createContext({
  console, Buffer, Date,
  Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
  Utilities: {
    getUuid: () => 'uuid-' + (++serial),
    newBlob(value, mime, name) { return Object.assign(blob(value, mime, name), { name }); },
    base64Encode: bytes => Buffer.from(bytes).toString('base64'),
    formatDate: () => '04/10/2026 10:37:50',
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    computeDigest: (algo, material) => {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(material).digest();
      return Array.from(hash);
    }
  },
  PropertiesService: { getScriptProperties: () => ({
    getProperty: key => props.has(key) ? props.get(key) : null,
    setProperty: (key, value) => props.set(key, value),
    deleteProperty: key => props.delete(key)
  }) },
  DriveApp: { getFileById: () => ({ getBlob: () => blob('AEUV LOGO', 'image/png') }) },
  LockService: { getScriptLock: () => ({
    waitLock() { assert(!locked, 'no nested shared lock'); locked = true; },
    releaseLock() { assert(locked); locked = false; }
  }) }
});
vm.runInContext(source, context);
const c = context;
const teams = [{ id: 'a', nome: 'Águia', escudo: '' }, { id: 'b', nome: 'Beta', escudo: '' },
  { id: 'c', nome: 'Cobra', escudo: '' }, { id: 'd', nome: 'Delta', escudo: '' }];
const links = new Map([['cup', teams.map(t => t.nome)], ['other', teams.map(t => t.nome)]]);
c.identificarUsuario_ = () => ({ autorizado: true, email: 'admin@test', usuario: { perfil: profile } });
c.pastaRaizProjeto_ = () => root;
c.equipesRegistro_ = () => teams;
c.lerRegistroEquipes_ = () => teams;
c.obterEquipes_ = () => teams.map(t => t.nome);
c.timesCampeonato_ = id => links.get(id) || [];
c.prepararHistoricoElenco_ = () => {};
c.formatarDataHora_ = () => '2026-10-04 09:00';
c.atletasCampeonato_ = () => [{ id: 'ath-a', nome: 'Atleta ativo', numero: 7, ativo: true, timeVinculado: 'Águia', cpf: 'SECRETCPF' },
  { id: 'ath-legacy', nome: 'Atleta legado', numero: 8, timeVinculado: 'Águia' },
  { id: 'ath-inactive', nome: 'Atleta inativo', ativo: false, timeVinculado: 'Águia' },
  { id: 'ath-other', nome: 'Outra equipe', ativo: true, timeVinculado: 'Cobra' }];
const structure = (changes = {}) => ({
  faseNome: 'Primeira fase', formato: 'Grupos + mata-mata', grupos: 2, vagasPorGrupo: 4,
  rodadas: 3, idaVolta: false, fasesEliminatorias: ['quartas', 'final'], ...changes
});
function seedChampionships(list) {
  locked = true;
  c.gravarCampeonatos_(list.map((item, i) => ({
    id: item.id, nome: item.id, temporada: '2026', modalidade: 'Futsal', status: 'ativo',
    visibilidade: 'Interno', revisao: 'champ-' + i, estrutura: item.estrutura
  })));
  locked = false;
}
const read = (id = 'cup') => c.listarTabelaCampeonato(id);
const payload = (screen, extra = {}) => ({ campeonatoId: screen.campeonatoId, revisao: screen.revisao, ...extra });
let checks = 0;
function ok(value, message) { assert(value, message); checks++; }
function rejects(fn, regex = /./) {
  const before = writes;
  assert.throws(fn, regex); assert.strictEqual(writes, before, 'rejected mutation does not write');
  assert(!locked, 'rejected mutation releases lock'); checks++;
}
ok(c.listarTabelaCampeonato().campeonato === null, 'empty tournament screen');
rejects(() => read('invalid'), /não encontrado/);
seedChampionships([{ id: 'cup', estrutura: structure() }, { id: 'other', estrutura: structure({ formato: 'Pontos corridos', fasesEliminatorias: [] }) }]);
let screen = read();
ok(screen.grupos.length === 2 && screen.fases.map(f => f.id).join(',') === 'fase-classificacao,fase-quartas,fase-final', 'explicit ordered phases');
ok(screen.classificacao.geral.length === 4 && screen.classificacao.geral.every(r => r.posicao === 1), 'unassigned zero rows and residual ties');
const firstRevision = screen.revisao;
const tableRevisionBeforeVenue = c.lerTabelaCampeonato_('cup').revisao;
const writesBeforeVenue = writes;
screen = c.salvarCampoCampeonato(payload(screen, { nome: 'Campo A', endereco: '<local>', ativo: true }));
ok(c.lerTabelaCampeonato_('cup').revisao === tableRevisionBeforeVenue
  && screen.revisao !== firstRevision && writes === writesBeforeVenue + 1,
  'venue mutation persists only global document and invalidates current composite revision');
const fieldId = screen.campos[0].id;
rejects(() => c.salvarCampoCampeonato({ campeonatoId: 'cup', revisao: firstRevision, nome: 'duplicate', endereco: '', ativo: true }), /Recarregue/);
const assignments = [{ id: 'grupo-1', equipeIds: ['a', 'b'] }, { id: 'grupo-2', equipeIds: ['c', 'd'] }];
screen = c.salvarGruposTabelaCampeonato(payload(screen, { grupos: assignments }));
rejects(() => c.salvarGruposTabelaCampeonato(payload(screen, { grupos: [{ id: 'grupo-1', equipeIds: ['a'] }, { id: 'grupo-2', equipeIds: ['a'] }] })), /não podem repetir/);
const game = (extra = {}) => ({
  id: '', faseId: 'fase-classificacao', grupoId: 'grupo-1', rodada: 1, mandanteId: 'a', visitanteId: 'b',
  campoId: fieldId, data: '2026-10-04', hora: '10:30', status: 'agendado', golsMandante: null, golsVisitante: null, ...extra
});
for (const bad of [
  { data: '2026-02-29' }, { hora: '24:00' }, { data: '' }, { campoId: '' }, { rodada: 1.5 }, { rodada: 4 },
  { mandanteId: 'b' }, { visitanteId: 'c' }, { faseId: 'fase-semifinal' }, { status: 'final' },
  { status: 'encerrado', golsMandante: '' }, { status: 'encerrado', golsMandante: true, golsVisitante: 0 },
  { status: 'encerrado', golsMandante: -1, golsVisitante: 0 }, { status: 'encerrado', golsMandante: 1000, golsVisitante: 0 },
  { status: 'encerrado', golsMandante: 2.3, golsVisitante: 0 }
]) rejects(() => c.salvarJogoCampeonato(payload(screen, game(bad))));
rejects(() => c.salvarJogoCampeonato(payload(screen, game({ golsMandante: 10, golsVisitante: 2 }))), /resultado/);
screen = c.salvarJogoCampeonato(payload(screen, game()));
const gameId = screen.jogos[0].id;
ok(screen.jogos[0].golsMandante === null && screen.classificacao.geral.every(r => r.jogos === 0), 'fresh schedule has no scores');
rejects(() => c.salvarJogoCampeonato(payload(screen, game())), /já existe/);
rejects(() => c.salvarGruposTabelaCampeonato(payload(screen, { grupos: [
  { id: 'grupo-1', equipeIds: [] }, { id: 'grupo-2', equipeIds: ['a', 'b', 'c', 'd'] }
] })), /grupo escolhido/);
function resultPayload(id, golsMandante, golsVisitante) {
  const current = c.listarResultadoJogoCampeonato({ campeonatoId: 'cup', id });
  return { campeonatoId: 'cup', id, revisao: current.revisao, revisaoElencos: current.revisaoElencos,
    golsMandante, golsVisitante, resultado: current.resultado, equipes: current.equipes };
}
screen = c.salvarResultadoJogoCampeonato(resultPayload(gameId, 3, 1));
let row = screen.classificacao.geral.find(r => r.equipeId === 'a');
ok(row.pontos === 3 && row.vitorias === 1 && row.golsPro === 3 && row.golsContra === 1 && row.saldoGols === 2 && row.aproveitamento === 100, 'final score standings');
ok(screen.classificacao.grupos[0].linhas[0].pontos === 3, 'group standings');
screen = c.salvarJogoCampeonato(payload(screen, game({ id: '', faseId: 'fase-quartas', grupoId: '' })));
screen = c.salvarResultadoJogoCampeonato(resultPayload(screen.jogos[1].id, 99, 0));
ok(screen.classificacao.geral.find(r => r.equipeId === 'a').golsPro === 3, 'knockout never counts');
screen = c.salvarJogoCampeonato(payload(screen, game({ id: '', rodada: 2, status: 'adiado' })));
screen = c.salvarJogoCampeonato(payload(screen, game({ id: '', rodada: 3, status: 'cancelado' })));
ok(screen.classificacao.geral.find(r => r.equipeId === 'a').jogos === 1, 'postponed and cancelled excluded');
screen = c.salvarCriteriosTabelaCampeonato(payload(screen, { criterios: { pontosVitoria: 5, pontosEmpate: 2, pontosDerrota: 1, desempates: ['golsPro', 'vitorias'] } }));
ok(screen.classificacao.geral.find(r => r.equipeId === 'a').pontos === 5 && screen.classificacao.geral.find(r => r.equipeId === 'b').pontos === 1, 'per-tournament custom points');
rejects(() => c.salvarCriteriosTabelaCampeonato(payload(screen, { criterios: { pontosVitoria: 3, pontosEmpate: 1, pontosDerrota: 0, desempates: ['golsPro', 'golsPro'] } })));
rejects(() => c.removerCampoCampeonato(payload(screen, { id: fieldId })), /em uso/);
const otherOld = read('other');
screen = c.salvarCampoCampeonato(payload(screen, { id: fieldId, nome: 'Campo A', endereco: '', ativo: false }));
rejects(() => c.salvarCampoCampeonato(payload(otherOld, { nome: 'Field B', endereco: '', ativo: true })), /Recarregue/);
screen = c.salvarResultadoJogoCampeonato(resultPayload(gameId, 4, 2));
ok(screen.jogos[0].golsMandante === 4, 'existing inactive historical field allowed');
rejects(() => c.salvarJogoCampeonato(payload(read('other'), game({ grupoId: '' }))), /campo ativo/);
rejects(() => c.salvarCampeonatoValidado_({ idOriginal: 'cup', estrutura: structure({ rodadas: 1 }) }, c.identificarUsuario_(), true), /Rodada/);
rejects(() => c.salvarCampeonatoValidado_({ idOriginal: 'cup', estrutura: structure({ fasesEliminatorias: ['final'] }) }, c.identificarUsuario_(), true), /fase configurada/);
rejects(() => c.salvarCampeonatoValidado_({ idOriginal: 'cup', estrutura: structure({ grupos: 1 }) }, c.identificarUsuario_(), true), /grupos com equipes/);
rejects(() => c.removerTimeCampeonato('cup', 'Águia'), /em uso na tabela/);
locked = true;
assert.throws(() => c.impedirRemocaoEquipeTabela_('', c.chaveEquipe_('Águia')), /em uso na tabela/);
locked = false; checks++;
const staleBeforeStructureChange = screen.revisao;
c.salvarCampeonatoValidado_({ idOriginal: 'cup', estrutura: structure({ faseNome: 'Nova primeira fase', fasesEliminatorias: undefined }) }, c.identificarUsuario_(), true);
screen = read();
ok(screen.fases.some(f => f.id === 'fase-quartas'), 'omitted knockout selections preserved on same-format save');
rejects(() => c.removerJogoCampeonato({ campeonatoId: 'cup', revisao: staleBeforeStructureChange, id: gameId }), /Recarregue/);
const commissionFile = c.arquivoCadastroPessoasCampeonato_('cup', 'Comissao Tecnica');
locked = true;
c.gravarListaCadastroDrive_(commissionFile, c.chaveComissaoTecnicaCampeonato_('cup'), [
  { id: 'coach-active', nome: 'Técnico ativo', cargo: 'Técnico', timeVinculado: 'Águia', cpf: 'SECRETCPF' },
  { id: 'coach-inactive', nome: 'Técnico inativo', cargo: 'Técnico', timeVinculado: 'Águia', ativo: false }
]);
locked = false;
// Keep the production authorization, parser and suspension matcher in the PDF path.
c.arquivoPunicoes_ = () => ({
  getBlob: () => blob('Atualizado em 04/10/2026 10:00\n'
    + ['1', '', 'cup', '', '', 'Águia', 'Atleta ativo', 'Atleta', '',
      '', '', '', '', '', 'DEFINIDA', 'A CUMPRIR', '', ''].join('|')),
  getUrl: () => 'https://drive.google.com/control'
});
const pdf = c.gerarSumulaJogoCampeonato({ campeonatoId: 'cup', id: gameId });
ok(pdf.mimeType === 'application/pdf' && Buffer.from(pdf.base64, 'base64').toString().startsWith('%PDF'), 'PDF download contract');
ok(pdfHtml.includes('Atleta ativo') && pdfHtml.includes('Atleta legado') && pdfHtml.includes('Técnico ativo')
  && !pdfHtml.includes('Atleta inativo') && !pdfHtml.includes('Técnico inativo') && !pdfHtml.includes('SECRETCPF')
  && !pdfHtml.includes('Outra equipe') && pdfHtml.includes('data:image/png;base64,'), 'current active roster, logo, no CPF');
for (const fn of ['listarTabelaCampeonato', 'salvarJogoCampeonato', 'removerJogoCampeonato', 'salvarGruposTabelaCampeonato',
  'salvarCriteriosTabelaCampeonato', 'salvarCampoCampeonato', 'removerCampoCampeonato', 'gerarSumulaJogoCampeonato',
  'listarResultadoJogoCampeonato', 'salvarResultadoJogoCampeonato']) {
  profile = 'associado';
  rejects(() => c[fn](fn === 'listarTabelaCampeonato' ? 'cup' : payload(screen, { id: gameId })), /permissão/);
}
profile = 'admin';
const beforeRead = writes;
read(); read(); ok(writes === beforeRead, 'table reads never write');
const tieRows = c.calcularClassificacaoTabela_(teams.slice(0, 3), [], c.criteriosPadraoTabela_());
ok(tieRows.every(r => r.posicao === 1), 'alphabetical display never breaks residual sporting ties');
const mixedGames = [
  game({ status: 'encerrado', golsMandante: 0, golsVisitante: 0 }),
  game({ status: 'encerrado', faseId: 'fase-final', golsMandante: 10, golsVisitante: 0 })
];
const drawnRows = c.calcularClassificacaoTabela_(teams.slice(0, 2), mixedGames, c.criteriosPadraoTabela_());
ok(drawnRows.every(r => r.empates === 1 && r.pontos === 1 && r.posicao === 1), 'draw points and residual ties');
const zeroVictoryRows = c.calcularClassificacaoTabela_(teams.slice(0, 2), mixedGames,
  { pontosVitoria: 0, pontosEmpate: 2, pontosDerrota: 1, desempates: [] });
ok(zeroVictoryRows.every(r => r.pontos === 2 && r.aproveitamento === 0), 'zero victory points produces defined zero percentage');
const unusualPointsRows = c.calcularClassificacaoTabela_(teams.slice(0, 2), mixedGames,
  { pontosVitoria: 1, pontosEmpate: 2, pontosDerrota: 0, desempates: [] });
ok(unusualPointsRows.every(r => r.aproveitamento === 200), 'percentage is relative to configured victory points');
rejects(() => c.validarEstruturaCampeonato_(structure({ fasesEliminatorias: ['inventada'] }), 'cup'));
rejects(() => c.validarEstruturaCampeonato_(structure({ formato: 'Grupos corridos' }), 'cup'), /não admite/);
ok(c.esqueletoTabela_(c.validarEstruturaCampeonato_(structure({ formato: 'Mata-mata' }), 'cup')).grupos.length === 0, 'knockout has no groups');
ok(c.esqueletoTabela_(c.validarEstruturaCampeonato_(structure({ formato: 'Mata-mata' }), 'cup')).fases.every(f => f.tipo === 'eliminatoria'), 'knockout has no standings phase');
ok(c.esqueletoTabela_(c.validarEstruturaCampeonato_(structure({ formato: 'Mata-mata', idaVolta: true }), 'cup')).fases.every(f => f.rodadas === 2), 'explicit home-away knockout rounds');
ok(c.esqueletoTabela_(c.validarEstruturaCampeonato_(structure({ formato: 'Pontos corridos', fasesEliminatorias: [] }), 'cup')).grupos.length === 0, 'league has no groups');
const legacy = structure({ fasesEliminatorias: undefined });
ok(c.validarEstruturaCampeonato_(legacy, 'cup').fasesEliminatorias.length === 0, 'legacy absent knockout selections never inferred');
const brokenFile = files.get(c.arquivoTabelaCampeonato_('cup'));
const savedText = brokenFile.text;
for (const corruption of ['{', '[]', '{}', JSON.stringify([{ schema: 'aeuv.tabela', versao: 99, revisao: 'r' }])]) {
  brokenFile.text = corruption;
  rejects(() => read());
}
brokenFile.text = savedText;
const duplicateDocument = JSON.parse(savedText);
duplicateDocument[0].jogos.push(duplicateDocument[0].jogos[0]);
brokenFile.text = JSON.stringify(duplicateDocument);
rejects(() => read(), /identificadores/);
brokenFile.text = savedText;
screen = read();
rejects(() => c.salvarJogoCampeonato(payload(screen, game({ id: gameId, status: 'adiado', golsMandante: 4, golsVisitante: 2 }))), /encerrado/);
ok(screen.jogos.find(j => j.id === gameId).golsMandante === 4, 'normal edit cannot reopen final game');
const freshAfterReopen = screen.revisao;
const duplicateSubmission = resultPayload(gameId, 0, 1);
screen = c.salvarResultadoJogoCampeonato(duplicateSubmission);
ok(screen.revisao !== freshAfterReopen && screen.classificacao.geral.find(r => r.equipeId === 'a').derrotas === 1, 'zero-score final game and losses');
rejects(() => c.salvarResultadoJogoCampeonato(duplicateSubmission), /Recarregue/);
for (const match of [...screen.jogos]) screen = c.removerJogoCampeonato(payload(screen, { id: match.id }));
ok(screen.classificacao.geral.every(r => r.jogos === 0 && r.pontos === 0), 'deletion recalculates results');
let other = read('other');
other = c.salvarCampoCampeonato(payload(other, { id: fieldId, nome: 'Campo A', endereco: '', ativo: true }));
other = c.salvarJogoCampeonato(payload(other, game({ grupoId: '' })));
const otherMatchId = other.jogos[0].id;
const updatedChampionships = c.campeonatos_();
updatedChampionships.find(item => item.id === 'other').status = 'encerrado';
locked = true;
c.gravarCampeonatos_(updatedChampionships);
locked = false;
screen = read();
rejects(() => c.removerCampoCampeonato(payload(screen, { id: fieldId })), /em uso/);
other = read('other');
other = c.removerJogoCampeonato(payload(other, { id: otherMatchId }));
screen = c.removerCampoCampeonato(payload(screen, { id: fieldId }));
ok(screen.campos.length === 0, 'unused venue deletion');
locked = true;
c.gravarListaCadastroDrive_(c.arquivoTabelaCampeonato_('other'), c.chaveTabelaCampeonato_('other'), [c.lerTabelaCampeonato_('other')]);
locked = false;
profile = 'diretoria';
rejects(() => c.removerCampeonato('cup'), /Somente o Administrador/);
profile = 'admin';
c.removerCampeonato('cup');
ok(!files.has(c.arquivoTabelaCampeonato_('cup')), 'championship cleanup removes its table file only');
ok(files.has(c.arquivoTabelaCampeonato_('other')) && files.has('AEUV - Campos.json'), 'championship cleanup preserves other tournaments and global fields');
ok(!locked, 'lock released at completion');
console.log('PASS: syntax + ' + checks + ' critical backend scenario assertions');
