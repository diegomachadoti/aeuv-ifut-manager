const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const c = vm.createContext({});
vm.runInContext(html.slice(html.indexOf('    const ICONES_SISTEMA ='),
  html.indexOf('    (function configurarAlternanciaTema()')) + '\n globalThis.mapa = ICONES_MODULOS;', c);
vm.runInContext(server.slice(server.indexOf('const GRUPOS ='),
  server.indexOf('const PERFIS_MODULOS_CHAVE')) + '\n globalThis.itens = MODULOS.concat(GRUPOS);', c);

test('todos os módulos e grupos usam SVG local com cor herdada e traço uniforme', () => {
  for (const item of c.itens) {
    assert(Object.hasOwn(c.mapa, item.id), item.id);
    const svg = c.iconeSistema_(item.id);
    assert.match(svg, /^<svg/);
    assert.match(svg, /stroke="currentColor"/);
    assert.match(svg, /stroke-width="1.8"/);
    assert.match(svg, /aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(svg, /<script|onload|href=/);
  }
});

test('ícone desconhecido não injeta HTML e utiliza fallback', () => {
  assert.equal(c.iconeSistema_('<script>'), c.iconeSistema_('file'));
  assert.equal(c.iconeSistema_('__proto__'), c.iconeSistema_('file'));
});

test('menu, títulos, cards e tema usam o renderizador compartilhado', () => {
  assert.doesNotMatch(html, /escapar\(modulo\.icone\)/);
  assert.match(html, /iconeSistema_\(bloco\.grupo\)/);
  assert.match(html, /iconeSistema_\(escuro \? 'sun' : 'moon'\)/);
  assert.match(html, /\.menu \.icone \{ font-size: 20px/);
});

test('JavaScript da interface compila após substituir o template Apps Script', () => {
  for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    new vm.Script(script.replace(/<\?[\s\S]*?\?>/g, '{}'));
  }
});
