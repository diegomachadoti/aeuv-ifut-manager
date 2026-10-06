const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const backend = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
const png = 'data:image/png;base64,';

function harness() {
  let locked = false, allowed = true;
  const backups = [], writes = [];
  const teams = [{ id: 'a', nome: 'Equipe A', escudo: png + 'A'.repeat(2000) },
    { id: 'b', nome: 'Equipe B', escudo: png + 'B'.repeat(2000) }];
  const c = vm.createContext({
    console, Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_algo, text) => crypto.createHash('sha256').update(text).digest(),
      base64Encode: data => Buffer.from(data).toString('base64'),
      getUuid: () => 'backup-id', newBlob: (text, mime, name) => ({ text, mime, name })
    },
    LockService: { getScriptLock: () => ({
      waitLock: () => { assert(!locked); locked = true; },
      releaseLock: () => { assert(locked); locked = false; }
    }) }
  });
  vm.runInContext(backend, c);
  c.exigirEdicaoEquipes_ = () => { if (!allowed) throw new Error('sem permissao'); };
  c.identificarUsuario_ = () => ({ autorizado: allowed, usuario: { perfil: allowed ? 'admin' : 'diretoria' } });
  c.equipesRegistro_ = () => teams;
  c.pastaRaizProjeto_ = () => ({ createFile: blob => { assert(locked); backups.push(blob); } });
  c.gravarRegistroEquipes_ = records => { assert(locked); writes.push(JSON.stringify(records)); };
  const entry = team => ({ id: team.id, assinatura: c.assinaturaEscudoEquipe_(team.escudo), escudo: png + 'A'.repeat(100) });
  return { c, teams, backups, writes, entry, locked: () => locked, deny: () => { allowed = false; } };
}

test('otimizacao atomica preserva originais, IDs e nomes', () => {
  const h = harness();
  const before = JSON.stringify(h.teams);
  const result = h.c.otimizarEscudosEquipes({ escudos: h.teams.map(h.entry) });
  assert.equal(result.total, 2);
  assert.equal(h.backups.length, 1);
  assert.equal(h.backups[0].text, before);
  assert.equal(h.writes.length, 1);
  assert.equal(h.teams[0].id, 'a');
  assert.equal(h.teams[0].nome, 'Equipe A');
  assert(h.teams.every(team => team.escudo.length < 200));
  assert(!h.locked());
});

test('conflito, permissao, tamanho e duplicata nunca gravam parcialmente', () => {
  for (const modify of [
    entries => { entries[1].assinatura = 'stale'; },
    entries => { entries[1].id = 'a'; },
    entries => { entries[1].escudo = 'https://example.org/image'; },
    entries => { entries[1].escudo = ''; },
    entries => { entries[1].escudo = png + 'A'.repeat(3000); }
  ]) {
    const h = harness(), before = JSON.stringify(h.teams);
    const entries = h.teams.map(h.entry);
    modify(entries);
    assert.throws(() => h.c.otimizarEscudosEquipes({ escudos: entries }));
    assert.equal(JSON.stringify(h.teams), before);
    assert.equal(h.backups.length, 0);
    assert.equal(h.writes.length, 0);
    assert(!h.locked());
  }
  const h = harness();
  h.deny();
  assert.throws(() => h.c.otimizarEscudosEquipes({ escudos: h.teams.map(h.entry) }), /administrador/);
});

test('falha de backup impede substituicao; falha de gravacao e propagada', () => {
  const h = harness(), before = JSON.stringify(h.teams);
  h.c.pastaRaizProjeto_ = () => ({ createFile() { throw new Error('backup falhou'); } });
  assert.throws(() => h.c.otimizarEscudosEquipes({ escudos: h.teams.map(h.entry) }), /backup falhou/);
  assert.equal(JSON.stringify(h.teams), before);
  assert(!h.locked());
  const other = harness();
  other.c.gravarRegistroEquipes_ = () => { throw new Error('Drive falhou'); };
  assert.throws(() => other.c.otimizarEscudosEquipes({ escudos: other.teams.map(other.entry) }), /Drive falhou/);
  assert.equal(other.backups.length, 1);
  assert(!other.locked());
});

test('canvas limita dimensoes, preserva proporcao e mantem imagem menor', async () => {
  const canvases = [], revoked = [];
  const c = vm.createContext({
    Image: class {
      naturalWidth = 1024; naturalHeight = 512;
      set src(value) { this.onload(); }
    },
    URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: value => revoked.push(value) },
    document: { createElement: () => {
      const canvas = { getContext: () => ({ drawImage() {} }),
        toDataURL: type => type === 'image/png' ? png + 'A'.repeat(500) : 'data:image/webp;base64,' + 'B'.repeat(100) };
      canvases.push(canvas); return canvas;
    } }
  });
  vm.runInContext(html.slice(html.indexOf('    function otimizarImagemEscudo_('),
    html.indexOf('    let administracaoOcupada_')), c);
  const optimized = await c.otimizarImagemEscudo_({});
  assert(optimized.startsWith('data:image/webp'));
  assert.equal(canvases[0].width, 256);
  assert.equal(canvases[0].height, 128);
  assert.deepEqual(revoked, ['blob:mock']);
  assert.equal(await c.otimizarImagemEscudo_(png + 'AAAA'), png + 'AAAA');
});

test('frontend e backend mantem sintaxe valida', () => {
  new vm.Script(backend);
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1].replace(/<\?[\s\S]*?\?>/g, '{}'));
  }
});

function imageHarness({ width = 2400, height = 3200, webpSize = 1000,
  pngSize = 2000, failed = false, context = true } = {}) {
  const canvases = [], revoked = [];
  const c = vm.createContext({
    Image: class {
      naturalWidth = width; naturalHeight = height;
      set src(value) { if (failed) this.onerror(); else this.onload(); }
    },
    URL: { createObjectURL: () => 'blob:photo', revokeObjectURL: value => revoked.push(value) },
    document: { createElement: () => {
      const canvas = {
        getContext: () => context ? { drawImage() {} } : null,
        toDataURL: (type, quality) => {
          if (type === 'image/webp') assert.equal(quality, 0.85);
          return 'data:' + type + ';base64,' + 'A'.repeat(type === 'image/webp' ? webpSize : pngSize);
        }
      };
      canvases.push(canvas);
      return canvas;
    } }
  });
  vm.runInContext(html.slice(html.indexOf('    function otimizarImagemEscudo_('),
    html.indexOf('    let administracaoOcupada_')), c);
  return { c, canvases, revoked };
}

test('fotos usam 512 pixels sem corte ou ampliacao e escolhem o menor formato', async () => {
  const h = imageHarness();
  assert((await h.c.otimizarFotoPessoa_({})).startsWith('data:image/webp'));
  assert.equal(h.canvases[0].width, 384);
  assert.equal(h.canvases[0].height, 512);
  assert.deepEqual(h.revoked, ['blob:photo']);
  const small = imageHarness({ width: 80, height: 120, pngSize: 100 });
  assert((await small.c.otimizarFotoPessoa_({})).startsWith('data:image/png'));
  assert.equal(small.canvases[0].width, 80);
  assert.equal(small.canvases[0].height, 120);
});

test('fotos invalidas ou acima do limite falham explicitamente e liberam a URL', async () => {
  for (const options of [
    { failed: true }, { width: 0 }, { context: false },
    { webpSize: 210 * 1024, pngSize: 220 * 1024 }
  ]) {
    const h = imageHarness(options);
    await assert.rejects(h.c.otimizarFotoPessoa_({}));
    assert.deepEqual(h.revoked, ['blob:photo']);
  }
});

test('cadastro envia foto otimizada uma vez e preserva foto atual sem novo arquivo', async () => {
  for (const tipo of ['atletas', 'comissao']) {
    for (const mode of ['upload', 'unchanged', 'failed']) {
      const sent = [], errors = [];
      const fields = {
        cpTipo: { value: tipo }, cpCampeonato: { value: 'champ' },
        cpNome: { value: 'Pessoa' }, cpCpf: { value: '123.456.789-00' },
        cpRg: { value: '' }, cpTime: { value: 'team' },
        cpFotoAtual: { value: 'original-photo' },
        cpFoto: { files: mode === 'unchanged' ? [] : [{}] },
        cpApelido: { value: '' }, cpNumero: { value: '10' },
        cpPosicao: { value: 'Goleiro' }, cpCargo: { value: 'Tecnico' },
        gravarCadastroPessoa: {}, voltarCadastroPessoa: {}, avisoCadastroPessoa: {}
      };
      let resolvePhoto, rejectPhoto;
      const c = vm.createContext({
        document: { getElementById: id => fields[id] }, elencoAtual: {},
        permitirEdicaoElenco_: () => true, validarCamposDataHora_: () => true,
        lerDataFormulario_: () => '2000-01-01', marcarElencoPendente_() {},
        mostrarLoadingCadastroPessoa_() {},
        otimizarFotoPessoa_: () => new Promise((resolve, reject) => { resolvePhoto = resolve; rejectPhoto = reject; }),
        enviarCadastroPessoa: (...args) => sent.push(args),
        exibirErroCadastroPessoa: error => errors.push(error)
      });
      vm.runInContext(html.slice(html.indexOf('     function gravarCadastroPessoa('),
        html.indexOf('     function mostrarLoadingCadastroPessoa_(')), c);
      c.gravarCadastroPessoa('person-id');
      if (mode !== 'unchanged') {
        assert.equal(sent.length, 0);
        assert.equal(fields.gravarCadastroPessoa.disabled, true);
        assert.match(fields.avisoCadastroPessoa.textContent, /Otimizando/);
        if (mode === 'failed') rejectPhoto(new Error('invalid-photo'));
        else resolvePhoto('optimized-photo');
        await new Promise(resolve => setImmediate(resolve));
      }
      if (mode === 'failed') {
        assert.equal(sent.length, 0);
        assert.equal(errors.length, 1);
      } else {
        assert.equal(sent.length, 1);
        assert.equal(sent[0][2].foto, mode === 'unchanged' ? 'original-photo' : 'optimized-photo');
        assert.equal(sent[0][2][tipo === 'atletas' ? 'atletaId' : 'membroId'], 'person-id');
      }
    }
  }
});

function migrationHarness() {
  const h = harness(), documents = {}, saved = [];
  documents.championships = [{ id: 'champ', nome: 'Campeonato', escudo: png + 'C'.repeat(2000),
    revisao: 'unchanged', estrutura: { grupos: [] } }];
  const roster = Array.from({ length: 7 }, (_, i) => ({
    id: 'person-' + i, nome: 'Pessoa', cpf: '123', timeVinculado: 'Equipe A',
    foto: png + 'D'.repeat(2000)
  }));
  const athletes = h.c.arquivoCadastroPessoasCampeonato_('champ', 'Atletas');
  const staff = h.c.arquivoCadastroPessoasCampeonato_('champ', 'Comissao Tecnica');
  documents[athletes] = roster;
  documents[staff] = [{ id: 'staff', nome: 'Comissao', foto: png + 'E'.repeat(2000) }];
  h.c.lerRegistroEquipes_ = () => h.teams;
  // Top-level consts are lexical bindings, not properties on the VM context.
  const championshipFile = vm.runInContext('CAMPEONATOS_ARQUIVO', h.c);
  h.c.lerListaCadastroDrive_ = name => JSON.parse(JSON.stringify(
    name === championshipFile ? documents.championships : documents[name] || []));
  h.c.gravarCampeonatos_ = list => { documents.championships = list; saved.push('championships'); };
  h.c.gravarListaCadastroDrive_ = (name, _key, list) => { documents[name] = list; saved.push(name); };
  h.c.pastaRaizProjeto_ = () => ({ createFile: blob => {
    assert(h.locked()); h.backups.push(blob); return { getId: () => 'backup' };
  } });
  return { ...h, documents, saved, athletes, staff };
}

test('migracao cobre equipes, campeonatos, atletas e comissao preservando outros campos', () => {
  const h = migrationHarness();
  const fontes = h.c.listarFontesOtimizacaoImagens();
  assert.deepEqual(Array.from(fontes, f => f.tipo), ['equipes', 'campeonatos', 'atletas', 'comissao']);
  for (const fonte of fontes) {
    const lote = h.c.listarLoteOtimizacaoImagens({ fonte, inicio: 0 });
    const result = h.c.salvarLoteOtimizacaoImagens({ fonte, assinatura: lote.assinatura,
      imagens: lote.imagens.map(item => ({ indice: item.indice, imagem: png + 'X'.repeat(100) })) });
    assert.equal(result.total, lote.imagens.length);
    assert.equal(result.backupId, 'backup');
  }
  assert.equal(h.backups.length, 4);
  const originalRoster = JSON.parse(h.backups[2].text).registros;
  assert(originalRoster[0].foto.length > 2000);
  assert.equal(h.documents[h.athletes][0].foto.length, png.length + 100);
  assert.equal(h.documents[h.athletes][0].cpf, originalRoster[0].cpf);
  assert.equal(h.documents[h.athletes][0].timeVinculado, originalRoster[0].timeVinculado);
  assert.equal(h.documents.championships[0].revisao, 'unchanged');
  assert(!h.locked());
});

test('lotes paginam cinco imagens sem expor outros dados pessoais', () => {
  const h = migrationHarness(), fonte = { tipo: 'atletas', campeonatoId: 'champ' };
  const first = h.c.listarLoteOtimizacaoImagens({ fonte, inicio: 0 });
  assert.equal(first.imagens.length, 5);
  assert.equal(first.proximo, 5);
  assert.equal(first.fim, false);
  assert.deepEqual(Object.keys(first.imagens[0]), ['indice', 'imagem']);
  const last = h.c.listarLoteOtimizacaoImagens({ fonte, inicio: first.proximo });
  assert.equal(last.imagens.length, 2);
  assert.equal(last.fim, true);
  h.documents[h.athletes].forEach(item => { item.foto = ''; });
  assert.equal(h.c.listarLoteOtimizacaoImagens({ fonte, inicio: 0 }).fim, true);
});

test('conflitos e entradas invalidas impedem backup e gravacao do lote inteiro', () => {
  for (const modify of [
    payload => { payload.assinatura = 'stale'; },
    payload => { payload.imagens[1].indice = payload.imagens[0].indice; },
    payload => { payload.imagens[1].imagem = 'https://invalid'; },
    payload => { payload.imagens[1].imagem = png + 'A'.repeat(210 * 1024); },
    payload => { payload.fonte.campeonatoId = 'other'; }
  ]) {
    const h = migrationHarness(), fonte = { tipo: 'atletas', campeonatoId: 'champ' };
    const lote = h.c.listarLoteOtimizacaoImagens({ fonte, inicio: 0 });
    const payload = { fonte, assinatura: lote.assinatura,
      imagens: lote.imagens.map(item => ({ indice: item.indice, imagem: png + 'X'.repeat(100) })) };
    const before = JSON.stringify(h.documents);
    modify(payload);
    assert.throws(() => h.c.salvarLoteOtimizacaoImagens(payload));
    assert.equal(JSON.stringify(h.documents), before);
    assert.equal(h.backups.length, 0);
    assert.equal(h.saved.length, 0);
    assert(!h.locked());
  }
});

test('migracao exige permissao e propaga falhas de backup e de gravacao', () => {
  const h = migrationHarness(), fonte = { tipo: 'comissao', campeonatoId: 'champ' };
  const lote = h.c.listarLoteOtimizacaoImagens({ fonte, inicio: 0 });
  const payload = { fonte, assinatura: lote.assinatura, imagens: [{ indice: 0, imagem: png + 'X'.repeat(100) }] };
  h.c.pastaRaizProjeto_ = () => ({ createFile() { throw new Error('backup failed'); } });
  assert.throws(() => h.c.salvarLoteOtimizacaoImagens(payload), /backup failed/);
  assert.equal(h.saved.length, 0);
  h.c.pastaRaizProjeto_ = () => ({ createFile: blob => {
    h.backups.push(blob); return { getId: () => 'backup' };
  } });
  h.c.gravarListaCadastroDrive_ = () => { throw new Error('write failed'); };
  assert.throws(() => h.c.salvarLoteOtimizacaoImagens(payload), /write failed/);
  assert.equal(h.backups.length, 1);
  assert(!h.locked());
  h.deny();
  assert.throws(() => h.c.listarFontesOtimizacaoImagens(), /administrador/);
  assert.throws(() => h.c.listarLoteOtimizacaoImagens({ fonte, inicio: 0 }), /administrador/);
  assert.throws(() => h.c.salvarLoteOtimizacaoImagens(payload), /administrador/);
});

test('acao administrativa processa lotes sequenciais e informa interrupcoes', async () => {
  for (const fail of [false, true]) {
    const calls = [], messages = [];
    const buttons = [{ disabled: false, isConnected: true }, { disabled: true, isConnected: true }];
    const notice = { classList: { add() {}, remove() {} } };
    const area = { isConnected: true, querySelectorAll: () => buttons };
    const selector = { value: '', disabled: false, isConnected: true };
    const c = vm.createContext({
      confirmacaoElencoAtual: false, moduloAtual: 'administracao', CONFIG: { usuario: { perfil: 'admin' } },
      administracaoOcupada_: false,
      administracaoFontes_: [{ tipo: 'equipes', rotulo: 'Equipes' }, { tipo: 'atletas', rotulo: 'Atletas' }],
      document: { getElementById: id => id === 'adminCampeonato' ? selector
        : id === 'avisoAdministracao' ? notice : area },
      confirmarDescarteElenco_: async () => true,
      otimizarFotoPessoa_: async value => { calls.push('photo'); return png + 'A'; },
      otimizarImagemEscudo_: async value => { calls.push('crest'); return png + 'A'; },
      google: { script: { run: {
        withSuccessHandler(callback) { this.success = callback; return this; },
        withFailureHandler(callback) { this.failure = callback; return this; },
        listarFontesOtimizacaoImagens() {
          this.success([{ tipo: 'equipes', rotulo: 'Equipes' }, { tipo: 'atletas', rotulo: 'Atletas' }]);
        },
        listarLoteOtimizacaoImagens(payload) {
          calls.push('read-' + payload.fonte.tipo);
          this.success({ imagens: [{ indice: 0, imagem: png + 'A'.repeat(100) }],
            assinatura: 'signature', proximo: 1, fim: true });
        },
        salvarLoteOtimizacaoImagens(payload) {
          assert.equal(payload.assinatura, 'signature');
          assert.equal(payload.imagens[0].imagem, png + 'A');
          calls.push('save-' + payload.fonte.tipo);
          if (fail && payload.fonte.tipo === 'atletas') this.failure(new Error('conflict'));
          else this.success({ total: 1 });
        },
        listarEquipes() { this.success({ podeEditar: true }); }
      } } }
    });
    vm.runInContext(html.slice(html.indexOf('    function selecionarFontesOtimizacao_('),
      html.indexOf('    function removerEquipeDoSistema(')), c);
    await c.otimizarImagensBase_('todas');
    assert.deepEqual(calls, ['read-equipes', 'crest', 'save-equipes', 'read-atletas', 'photo', 'save-atletas']);
    assert.equal(buttons[0].disabled, false);
    assert.equal(buttons[1].disabled, true);
    assert.equal(selector.disabled, false);
    assert.equal(c.administracaoOcupada_, false);
    if (fail) {
      assert.equal(messages.length, 0);
      assert.match(notice.textContent, /1 imagem.*conflict/);
    } else {
      assert.match(notice.textContent, /2 imagem/);
    }
  }
});

test('administracao e endpoints de manutencao sao exclusivos do admin', () => {
  const h = migrationHarness();
  for (const perfil of ['diretoria', 'associado', 'arbitragem']) {
    h.c.identificarUsuario_ = () => ({ autorizado: true, usuario: { perfil } });
    assert.throws(() => h.c.listarFontesOtimizacaoImagens(), /administrador/);
    assert.throws(() => h.c.listarLoteOtimizacaoImagens({}), /administrador/);
    assert.throws(() => h.c.salvarLoteOtimizacaoImagens({}), /administrador/);
    assert.throws(() => h.c.otimizarEscudosEquipes({}), /administrador/);
    assert(!h.c.modulosPermitidos_(perfil).some(item => item.id === 'administracao'));
  }
  assert(h.c.modulosPermitidos_('admin').some(item => item.id === 'administracao'));
  const c = vm.createContext({});
  vm.runInContext(html.slice(html.indexOf('    function selecionarFontesOtimizacao_('),
    html.indexOf('    async function otimizarImagensBase_(')), c);
  const fontes = [{ tipo: 'equipes' }, { tipo: 'campeonatos' },
    { tipo: 'atletas', campeonatoId: 'a' }, { tipo: 'atletas', campeonatoId: 'b' },
    { tipo: 'comissao', campeonatoId: 'a' }];
  assert.equal(c.selecionarFontesOtimizacao_(fontes, 'atletas', 'a').length, 1);
  assert.equal(c.selecionarFontesOtimizacao_(fontes, 'atletas', '').length, 2);
  assert.equal(c.selecionarFontesOtimizacao_(fontes, 'comissao', 'b').length, 0);
  assert.equal(c.selecionarFontesOtimizacao_(fontes, 'campeonatos', 'a').length, 1);
  assert.equal(c.selecionarFontesOtimizacao_(fontes, 'todas', 'a').length, 5);
});

function logoHarness() {
  const h = harness(), properties = {}, created = [];
  const original = png + 'A'.repeat(2000);
  h.c.PropertiesService = { getScriptProperties: () => ({
    getProperty: key => properties[key] || null,
    setProperty: (key, value) => { properties[key] = value; }
  }) };
  h.c.lerImagemLogo_ = id => id === 'optimized' ? png + 'A'.repeat(100) : original;
  h.c.Utilities.base64Decode = text => Buffer.from(text, 'base64');
  h.c.pastaRaizProjeto_ = () => ({ createFile: blob => {
    assert(h.locked()); created.push(blob); return { getId: () => 'optimized' };
  } });
  return { ...h, properties, created, original };
}

test('logo leve usa arquivo separado e abertura deixa de ler o original', () => {
  const h = logoHarness();
  assert.equal(h.c.obterLogo_(), h.original);
  const dados = h.c.lerLogoParaOtimizacao();
  const result = h.c.salvarLogoOtimizado({ imagem: png + 'A'.repeat(100), assinatura: dados.assinatura });
  assert.equal(result.bytesAntes, h.original.length);
  assert.equal(result.bytesDepois, png.length + 100);
  assert.equal(h.created.length, 1);
  assert.equal(h.created[0].mime, 'image/png');
  assert.equal(h.c.obterLogo_(), png + 'A'.repeat(100));
  assert(!h.locked());
  assert(!html.includes('src="<?!= config.logoUrl ?>"'));
  assert(html.includes("document.getElementById('logoSistema').src = CONFIG.logoUrl;"));
});

test('logo protege permissao, concorrencia, tamanho e falhas de persistencia', () => {
  for (const change of [
    (h, payload) => { payload.assinatura = 'stale'; },
    (h, payload) => { payload.imagem = png + 'A'.repeat(110 * 1024); },
    (h, payload) => { payload.imagem = 'not-image'; },
    (h, payload) => { h.c.pastaRaizProjeto_ = () => ({ createFile() { throw Error('Drive failed'); } }); }
  ]) {
    const h = logoHarness(), dados = h.c.lerLogoParaOtimizacao();
    const payload = { imagem: png + 'A'.repeat(100), assinatura: dados.assinatura };
    change(h, payload);
    assert.throws(() => h.c.salvarLogoOtimizado(payload));
    assert.equal(Object.keys(h.properties).length, 0);
    assert.equal(h.created.length, 0);
    assert(!h.locked());
  }
  const h = logoHarness(), dados = h.c.lerLogoParaOtimizacao();
  h.c.salvarLogoOtimizado({ imagem: png + 'A'.repeat(100), assinatura: dados.assinatura });
  assert.throws(() => h.c.salvarLogoOtimizado({ imagem: png + 'A', assinatura: dados.assinatura }), /alterado/);
  h.deny();
  assert.throws(() => h.c.lerLogoParaOtimizacao(), /administrador/);
  assert.throws(() => h.c.salvarLogoOtimizado({}), /administrador/);
});
