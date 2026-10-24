// Regra: o NOME do atleta no Banco de Atletas vem do registro MAIS RECENTE,
// de qualquer fonte (inscrição/portabilidade/cadastro via campeonato). Em
// empate de data, a fonte oficial (solicitação) desempata. Isso evita que um
// rótulo/registro de teste no histórico de elenco (ex.: "Nova Base de Atletas")
// prevaleça sobre o nome oficial digitado numa inscrição mais nova.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8').replace(/\r\n/g, '\n');

function contexto() {
  const c = vm.createContext({ console: { log() {} } });
  vm.runInContext(source, c);
  return c;
}

// Monta um grupo de elenco no formato que consolidarAtletasBanco_ espera.
function grupoElenco(chave, vinculos) {
  return { chave: chave, vinculos: vinculos };
}

function vinculo(nome, cpf, registradoEm, extra) {
  return Object.assign({
    id: 'v-' + nome, registroId: 'r-' + nome, atual: false, ativo: true,
    situacao: 'Competição excluída', noHistorico: true,
    campeonatoId: '', campeonatoNome: 'COPA TESTE', equipeId: '', equipeNome: 'ALL DAY',
    nome: nome, apelido: '', posicao: '', cpf: cpf, dataNascimento: '',
    registradoEm: registradoEm || '', atualizadoEm: registradoEm || '', sequencia: 1
  }, extra || {});
}

const CPF_DIEGO = '02036861520'; // 11 dígitos; chave CPF: válida.

function consolidar(c, elencoGrupos, solicitacoes) {
  return c.consolidarAtletasBanco_(
    { grupos: elencoGrupos, campeonatos: 0, atuais: 0, anteriores: 0 },
    { total: solicitacoes.length, registros: solicitacoes },
    { registros: [] },
    { total: 0, registros: [] }
  );
}

test('solicitação mais recente vence o nome de teste no histórico de elenco', () => {
  const c = contexto();
  // Elenco (antigo): nome lixo "Nova Base de Atletas".
  const elenco = [grupoElenco('CPF:' + CPF_DIEGO, [
    vinculo('Nova Base de Atletas', CPF_DIEGO, '2026-10-06T19:00:00.000Z'),
    vinculo('Nova Base de Atletas', CPF_DIEGO, '2026-10-07T19:00:00.000Z')
  ])];
  // Solicitação (mais recente, 14/10): nome correto, mesmo CPF.
  const ordem14out = Date.parse('2026-10-14T18:03:00.000Z');
  const solicitacoes = [{
    equipe: 'ALL DAY', competicao: 'SUPER LIGA UNIÃO', ordem: ordem14out,
    dataHora: '14/10/2026 15:17', protocolo: '20261014-BF568EA3', situacao: 'Processada',
    pessoas: [{ nome: 'Diego Paiva Machado', cpf: CPF_DIEGO, nascimento: '06/05/1985', tipo: 'Atleta', acao: 'Inclusao' }]
  }];

  const resultado = consolidar(c, elenco, solicitacoes);
  const diego = resultado.registros.filter(r => r.cpf === CPF_DIEGO);

  assert.equal(diego.length, 1, 'mesmo CPF deve consolidar num único registro');
  assert.equal(diego[0].nome, 'Diego Paiva Machado', 'o nome da inscrição mais recente deve prevalecer');
});

test('cadastro via campeonato MAIS RECENTE vence uma inscrição antiga', () => {
  const c = contexto();
  // Solicitação antiga (01/09) com nome desatualizado.
  const solicitacoes = [{
    equipe: 'ALL DAY', competicao: 'COPA ANTIGA', ordem: Date.parse('2026-09-01T12:00:00.000Z'),
    dataHora: '01/09/2026 09:00', protocolo: 'p1', situacao: 'Processada',
    pessoas: [{ nome: 'Joao Antigo', cpf: CPF_DIEGO, nascimento: '', tipo: 'Atleta', acao: 'Inclusao' }]
  }];
  // Elenco mais recente (20/10) com nome atualizado.
  const elenco = [grupoElenco('CPF:' + CPF_DIEGO, [
    vinculo('Joao Atualizado Silva', CPF_DIEGO, '2026-10-20T19:00:00.000Z')
  ])];

  const resultado = consolidar(c, elenco, solicitacoes);
  const atleta = resultado.registros.filter(r => r.cpf === CPF_DIEGO);

  assert.equal(atleta.length, 1);
  assert.equal(atleta[0].nome, 'Joao Atualizado Silva', 'o cadastro via campeonato mais recente deve prevalecer');
});

test('empate sem data: inscrição oficial desempata sobre o elenco', () => {
  const c = contexto();
  // Elenco sem data (registradoEm vazio → recência 0).
  const elenco = [grupoElenco('CPF:' + CPF_DIEGO, [
    vinculo('Nome Do Elenco', CPF_DIEGO, '')
  ])];
  // Solicitação também sem ordem (recência 0) → desempata por prioridade de fonte.
  const solicitacoes = [{
    equipe: 'ALL DAY', competicao: 'COPA', ordem: 0, dataHora: '', protocolo: 'p', situacao: 'Processada',
    pessoas: [{ nome: 'Nome Oficial', cpf: CPF_DIEGO, nascimento: '', tipo: 'Atleta', acao: 'Inclusao' }]
  }];

  const resultado = consolidar(c, elenco, solicitacoes);
  const atleta = resultado.registros.filter(r => r.cpf === CPF_DIEGO);

  assert.equal(atleta.length, 1);
  assert.equal(atleta[0].nome, 'Nome Oficial', 'em empate de data, a fonte oficial (solicitação) vence');
});
