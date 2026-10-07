const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const backend = fs.readFileSync(path.join(__dirname, '..', 'WebApp.gs'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const historyFile = 'AEUV - Historico de Inscricoes.json';
const rosterFile = (id, tipo) => `AEUV - Campeonato - ${id} - ${tipo === 'atletas' ? 'Atletas' : 'Comissao Tecnica'}.json`;
const person = (tipo, overrides = {}) => ({
  id: tipo === 'atletas' ? 'athlete' : 'staff', nome: tipo === 'atletas' ? 'Carlos Silva' : 'Mariana Costa',
  cpf: tipo === 'atletas' ? '52998224725' : '11144477735', foto: 'photo', rg: 'rg',
  dataNascimento: '2000-01-01', timeVinculado: 'Equipe A', ativo: true,
  apelido: '', numero: 10, posicao: 'Goleiro', cargo: 'Treinador', telefone: 'phone', email: 'email',
  ...overrides
});

// opcoes.cache habilita um CacheService.getUserCache realista (por usuário, só strings, TTL máximo).
function harness(source = backend, opcoes = {}) {
  let locked = false, uuid = 0, nextId = 0, rootId = null;
  let triggerId = 0;
  const counts = {
    campeonatos: 0, equipes: 0, rosters: 0, history: 0, tables: 0, locks: 0,
    sessoes: 0, bloqueios: 0, times: 0, registro: 0
  };
  const writes = [], logs = [], reads = [], io = [], files = new Map(), properties = new Map();
  // Metadados Drive simulados: nome -> ID atual na pasta raiz e ID -> {nome, lixeira, pasta}.
  const ids = new Map(), meta = new Map(), caches = new Map(), cacheOps = [], folders = new Map();
  const novoId = (name, parent) => {
    if (parent === undefined) {
      const separator = name.lastIndexOf('\\');
      if (separator === -1) parent = 'root';
      else {
        const location = [...folders].find(([, item]) => item.path === name.slice(0, separator));
        assert(location, 'nested file parent not found');
        parent = location[0];
      }
    }
    const id = 'drive' + String(++nextId).padStart(12, '0');
    ids.set(name, id);
    meta.set(id, { name: name.split('\\').pop(), trashed: false, parent,
      ...(parent === 'root' ? {} : { key: name }) });
    return id;
  };
  const idOf = name => ids.get(name) || novoId(name);
  const read = recurso => reads.push({ recurso, locked });
  const state = {
    perfil: 'admin', autorizado: true, equipeUsuario: 'Equipe A', bloqueado: false,
    equipesAtivas: null, times: null, failHistory: false, failRoster: false,
    onLock: null, onRoster: null,
    effectiveUser: 'admin@example.invalid',
    campeonatos: [{ id: 'c1', nome: 'Atual' }, { id: 'c2', nome: 'Anterior', status: 'encerrado' }],
    equipes: [{ id: 'e1', nome: 'Equipe A' }, { id: 'e2', nome: 'Equipe B' }],
    jogos: [], cacheUser: 'usuario-1'
  };
  for (const id of ['c1', 'c2']) {
    for (const tipo of ['atletas', 'comissao']) files.set(rosterFile(id, tipo), '[]');
  }
  const file = name => ({
    getId: () => { io.push({ operacao: 'getId', name }); return idOf(name); },
    getName: () => name.split('\\').pop(),
    setTrashed: value => {
      io.push({ operacao: 'trash', name });
      assert.equal(value, true);
      meta.get(idOf(name)).trashed = true;
      ids.delete(name);
      files.delete(name);
    },
    getBlob: () => ({ getDataAsString: () => {
      io.push({ operacao: 'read', name });
      if (state.failRead === name) throw new Error('read failure');
      if (name === historyFile) counts.history++;
      if (name.startsWith('AEUV - Campeonato -')) counts.rosters++;
      return files.get(name);
    } }),
    setContent: text => {
      io.push({ operacao: 'setContent', name });
      assert(locked, 'write outside lock');
      if (state.failWrite === name) throw new Error('write failure');
      if (name === historyFile && state.failHistory) throw new Error('history failure');
      if (name.startsWith('AEUV - Campeonato -') && state.failRoster) throw new Error('roster failure');
      files.set(name, text);
      writes.push(name);
      if (name.startsWith('AEUV - Campeonato -') && state.onRoster) state.onRoster();
      if (state.onWrite) state.onWrite(name);
    }
  });
  const triggers = [];
  const c = vm.createContext({
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : ['2026-10-05T12:00:00.000Z'])); }
    },
    console: { log: value => logs.push(JSON.parse(value)) },
    Utilities: {
      getUuid: () => `uuid-${++uuid}`, newBlob: (text, mime, name) => ({ text, name }),
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_algo, text) => [...crypto.createHash('sha256').update(text, 'utf8').digest()],
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
    },
    DriveApp: { getFileById: id => {
      io.push({ operacao: 'getFileById' });
      if (state.failGetById) throw new Error(state.failGetById);
      if (!meta.has(id)) {
        throw new Error('No item with the given ID could be found. Possibly because you have not edited '
          + 'this item or you do not have permission to access it.');
      }
      const atual = () => meta.get(id);
      return {
        getId: () => { io.push({ operacao: 'getId', name: atual().name }); return id; },
        getName: () => { io.push({ operacao: 'getName' }); return atual().name; },
        isTrashed: () => { io.push({ operacao: 'isTrashed' }); return atual().trashed; },
        getParents: () => {
          io.push({ operacao: 'getParents' });
          const pais = [atual().parent];
          return {
            hasNext: () => { io.push({ operacao: 'parentHasNext' }); return pais.length > 0; },
            next: () => {
              const pai = pais.shift();
              return { getId: () => { io.push({ operacao: 'parentGetId' }); return pai === 'root' ? rootId : pai; } };
            }
          };
        },
        getBlob: () => file(atual().key || atual().name).getBlob(),
        setContent: text => file(atual().key || atual().name).setContent(text)
      };
    } },
    ScriptApp: {
      EventType: { CLOCK: 'CLOCK' },
      getService: () => ({ getUrl: () => 'fixture' }),
      getProjectTriggers: () => triggers.filter(trigger => !trigger.deleted && trigger.owner === state.effectiveUser),
      deleteTrigger: trigger => { trigger.deleted = true; },
      newTrigger: handler => ({
        timeBased() { return this; },
        everyMinutes(minutes) {
          const esperado = handler === 'atualizarTabelaAgendada'
            || handler === 'reconciliarIndicesValidacaoAgendado' ? 5 : 15;
          assert.equal(minutes, esperado);
          this.interval = minutes;
          return this;
        },
        create() {
          const trigger = { id: 'trigger-' + ++triggerId, owner: state.effectiveUser, handler,
            interval: this.interval, event: 'CLOCK', deleted: false };
          trigger.getUniqueId = () => trigger.id;
          trigger.getHandlerFunction = () => trigger.handler;
          trigger.getEventType = () => trigger.event;
          triggers.push(trigger);
          return trigger;
        }
      })
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => state.effectiveUser }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => properties.has(key) ? properties.get(key) : null,
      getProperties: () => Object.fromEntries(properties),
      setProperty: (key, value) => properties.set(key, value),
      deleteProperty: key => properties.delete(key)
    }) },
    LockService: { getScriptLock: () => ({
      waitLock: () => { assert(!locked, 'nested lock'); locked = true; counts.locks++; if (state.onLock) state.onLock(); },
      hasLock: () => locked,
      releaseLock: () => { assert(locked); locked = false; }
    }) },
    ...(opcoes.cache ? { CacheService: { getUserCache: () => {
      if (state.failCacheService) throw new Error('cache service failure');
      if (!caches.has(state.cacheUser)) caches.set(state.cacheUser, new Map());
      const store = caches.get(state.cacheUser);
      return {
        get: key => {
          cacheOps.push({ operacao: 'get', usuario: state.cacheUser });
          if (state.failCacheGet) throw new Error('cache get failure');
          return store.has(key) ? store.get(key) : null;
        },
        put: (key, value, ttl) => {
          cacheOps.push({ operacao: 'put', usuario: state.cacheUser });
          assert.equal(typeof value, 'string');
          assert(key.length <= 250 && value.length <= 100 * 1024 && ttl > 0 && ttl <= 21600);
          if (state.failCachePut) throw new Error('cache put failure');
          store.set(key, value);
        },
        remove: key => {
          cacheOps.push({ operacao: 'remove', usuario: state.cacheUser });
          if (state.failCacheRemove) throw new Error('cache remove failure');
          store.delete(key);
        }
      };
    } } } : {})
  });
  vm.runInContext(source, c);
  rootId = vm.runInContext('CONFIG.pastaRaizId', c);
  const equipesRegistroReal = c.equipesRegistro_, lerRegistroEquipesReal = c.lerRegistroEquipes_;
  const campeonatosReal = c.campeonatos_, lerBloqueiosReal = c.lerBloqueiosElenco_;
  const registryFile = vm.runInContext('CONFIG.equipes.arquivoRegistro', c);
  const iterator = values => {
    const remaining = values.slice();
    return { hasNext: () => remaining.length > 0, next: () => {
      assert(remaining.length, 'iterator exhausted');
      return remaining.shift();
    } };
  };
  const folder = id => {
    const info = folders.get(id);
    assert(info, 'folder not found');
    const keyOf = name => info.path + '\\' + name;
    return {
      getId: () => id,
      getName: () => info.name,
      getFoldersByName: name => iterator([...folders].filter(([, item]) =>
        item.parent === id && item.name === name).map(([child]) => folder(child))),
      createFolder: name => createFolder(id, name),
      getFilesByName: name => {
        const key = keyOf(name);
        io.push({ operacao: 'lookup', name: key });
        if (state.failLookup === key) throw new Error('lookup failure');
        read('drive');
        let consumed = false;
        return {
          hasNext: () => {
            io.push({ operacao: 'hasNext', name: key });
            if (state.failIterator === key) throw new Error('iterator failure');
            return !consumed && files.has(key);
          },
          next: () => {
            assert(!consumed && files.has(key));
            consumed = true;
            io.push({ operacao: 'next', name: key });
            return file(key);
          }
        };
      },
      createFile: blob => {
        const key = keyOf(blob.name);
        io.push({ operacao: 'create', name: key });
        assert(locked, 'create outside lock');
        if (state.failCreate === key || (state.failCreateWhen && state.failCreateWhen(key))) {
          throw new Error('create failure');
        }
        assert(!files.has(key), 'duplicate file in fixture');
        novoId(key, id);
        file(key).setContent(blob.text);
        return file(key);
      }
    };
  };
  const createFolder = (parent, name) => {
    assert(locked, 'create folder outside lock');
    if (state.failCreateFolder === name) throw new Error('folder create failure');
    const id = 'folder' + String(++nextId).padStart(12, '0');
    const parentPath = parent === 'root' ? '' : folders.get(parent).path + '\\';
    folders.set(id, { name, parent, path: parentPath + name });
    io.push({ operacao: 'createFolder', name: parentPath + name });
    return folder(id);
  };
  c.pastaRaizProjeto_ = () => ({
    getId: () => rootId,
    getFoldersByName: name => iterator([...folders].filter(([, item]) =>
      item.parent === 'root' && item.name === name).map(([id]) => folder(id))),
    createFolder: name => createFolder('root', name),
    getFilesByName: name => {
      io.push({ operacao: 'lookup', name });
      if (state.failLookup === name) throw new Error('lookup failure');
      read('drive');
      return {
        hasNext: () => {
          io.push({ operacao: 'hasNext', name });
          if (state.failIterator === name) throw new Error('iterator failure');
          return files.has(name);
        },
        next: () => { io.push({ operacao: 'next', name }); return file(name); }
      };
    },
    createFile: blob => {
      io.push({ operacao: 'create', name: blob.name });
      if (state.failCreate === blob.name) throw new Error('create failure');
      novoId(blob.name);
      file(blob.name).setContent(blob.text);
      return file(blob.name);
    }
  });
  c.identificarUsuario_ = () => {
    read('autorizacao');
    counts.sessoes++;
    return { autorizado: state.autorizado, usuario: { perfil: state.perfil, equipe: state.equipeUsuario } };
  };
  c.campeonatos_ = () => { read('campeonatos'); counts.campeonatos++; return clone(state.campeonatos); };
  c.equipesRegistro_ = underLock => {
    if (underLock) assert(locked);
    read('equipes');
    counts.equipes++;
    return clone(state.equipes);
  };
  c.lerRegistroEquipes_ = () => { read('registro'); counts.registro++; return clone(state.equipes); };
  c.obterEquipes_ = () => {
    read('ativas');
    return state.equipesAtivas || state.equipes.map(item => item.nome);
  };
  c.timesCampeonato_ = id => {
    read('times'); counts.times++;
    return state.times ? (state.times[id] || []).slice() : state.equipes.map(item => item.nome);
  };
  c.lerBloqueiosElenco_ = () => {
    read('bloqueios');
    counts.bloqueios++;
    return state.bloqueado ? [{ campeonatoId: 'c1', equipeId: 'e1', bloqueado: true }] : [];
  };
  c.lerTabelaCampeonato_ = () => { read('jogos'); counts.tables++; return { jogos: clone(state.jogos) }; };
  const seed = (id, tipo, records) => files.set(rosterFile(id, tipo), JSON.stringify(records));
  const roster = (id, tipo) => JSON.parse(files.get(rosterFile(id, tipo)));
  const history = () => files.has(historyFile) ? JSON.parse(files.get(historyFile)) : null;
  const payload = (tipo, edit = false) => ({
    ...person(tipo), campeonatoId: 'c1', equipeId: 'e1', tipo,
    registroId: edit ? person(tipo).id : '', nome: edit ? person(tipo).nome : 'Nova Pessoa'
  });
  const useRealRegistry = () => {
    files.set(registryFile, JSON.stringify(state.equipes));
    c.equipesRegistro_ = equipesRegistroReal;
    c.lerRegistroEquipes_ = lerRegistroEquipesReal;
  };
  const useRealContextFiles = () => {
    useRealRegistry();
    files.set('AEUV - Campeonatos.json', JSON.stringify(state.campeonatos));
    files.set('AEUV - Bloqueios de Elenco.json', '[]');
    c.campeonatos_ = campeonatosReal;
    c.lerBloqueiosElenco_ = lerBloqueiosReal;
  };
  // Alterações externas no Drive, fora dos caminhos do repositório.
  const drive = {
    trash: name => { meta.get(idOf(name)).trashed = true; ids.delete(name); files.delete(name); },
    rename: (name, novo) => {
      const id = idOf(name);
      meta.get(id).name = novo.split('\\').pop();
      if (meta.get(id).parent !== 'root') meta.get(id).key = novo;
      ids.delete(name);
      ids.set(novo, id);
      files.set(novo, files.get(name));
      files.delete(name);
    },
    move: name => { meta.get(idOf(name)).parent = 'outra-pasta'; ids.delete(name); files.delete(name); },
    purge: name => { meta.delete(idOf(name)); ids.delete(name); files.delete(name); },
    replace: (name, text) => { drive.trash(name); files.set(name, text); return novoId(name); }
  };
  return { c, state, counts, writes, logs, reads, io, files, seed, roster, history, payload,
    useRealRegistry, useRealContextFiles, registryFile, properties, ids, meta, caches, cacheOps, drive, idOf,
    rootId: () => rootId, locked: () => locked, triggers, folders };
}

function participation(pessoa = person('atletas'), equipeId = 'e1') {
  return {
    id: 'game', status: 'encerrado', mandanteId: 'e1', visitanteId: 'e2',
    resultado: {
      wo: false, woEquipeId: '', prorrogacao: false, penaltis: false,
      golsPenaltisMandante: null, golsPenaltisVisitante: null, observacoes: '',
      equipes: ['e1', 'e2'].map(id => ({
        id, atletas: id === equipeId ? [{ ...pessoa, participou: true, gols: 0, golsContra: 0,
          amarelos: 0, vermelho: false, vermelhoTipo: '', numeroJogo: '' }] : [], comissao: []
      }))
    }
  };
}
module.exports = { harness, person, participation, historyFile, rosterFile };
