const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const inicio = html.indexOf('    function informativoNotas()');
const fim = html.indexOf('    function carregarNotas()', inicio);
assert(inicio >= 0 && fim > inicio);
const contexto = vm.createContext({});
vm.runInContext(html.slice(inicio, fim), contexto);

test('notas têm informativo nativo fechado inicialmente com o estilo das demais telas', () => {
  const bloco = contexto.informativoNotas();
  assert.match(bloco, /^<details class="info-punicoes"><summary>/);
  assert.match(bloco, /<div class="info-punicoes-corpo">/);
  assert.match(bloco, /<\/div><\/details>$/);
  assert.doesNotMatch(bloco, /<details[^>]*\bopen\b/);
});

test('informativo explica origem, comandos, revisão e limites da consulta', () => {
  const bloco = contexto.informativoNotas();
  for (const texto of [
    'Súmula Digital',
    'não de uma solicitação de inscrição, remoção ou portabilidade',
    'python main.py --analisar-sumulas',
    'python main.py --analisar-sumulas --process-local-only',
    'python main.py --analisar-sumulas --ia',
    '[A DEFINIR PELA COMISSÃO]',
    'python main.py --gerar-pdf-nota 8',
    'python main.py --publicar-drive',
    'Rascunhos com pendências não são publicados',
    'Controle de punições',
    'apenas recarrega a consulta'
  ]) assert(bloco.includes(texto), texto);
});

test('informativo fica fora do status substituído em sucesso, vazio ou erro', () => {
  const inicioModulo = html.indexOf("      if (modulo.tipo === 'notas') {");
  const fimModulo = html.indexOf("      if (modulo.tipo === 'regulamentos')", inicioModulo);
  assert(inicioModulo >= 0 && fimModulo > inicioModulo);
  assert.match(html.slice(inicioModulo, fimModulo),
    /conteudo\.innerHTML = cabecalho \+ informativoNotas\(\) \+ blocoCarregando\('statusNotas'\);/);
  assert.doesNotMatch(contexto.informativoNotas(), /id="statusNotas"/);
});
