"""Smoke test local em Chrome, sem OAuth/Drive real; usa Selenium já presente no projeto."""
from pathlib import Path
import tempfile
import unittest
import re

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

ROOT = Path(__file__).resolve().parents[1]
MOCK = r"""
<script>
['alert','confirm','prompt'].forEach(nome=>window[nome]=()=>{throw new Error('Diálogo nativo proibido: '+nome);});
window.mockDB = {schema:3,revisao:1,atualizadoEm:new Date().toISOString(),
 config:{cartao:'Cartão de teste',saldos:{}},lancamentos:[],servicos:[],contatos:[],contas:[],checklist:[],iptv:[],simulacoes:[],importacoes:[],historico:[]};
['diego','iris','condominio'].forEach(e=>mockDB.config.saldos[e]={data:'2026-01-01',valor:0});
function resposta(ano) {
 const resumo={}; ['diego','iris','condominio'].forEach(es=>resumo[es]=Array.from({length:12},(_,i)=>({
  mes:ano+'-'+String(i+1).padStart(2,'0'),entradas:0,saidas:0,recebido:0,pago:0,receber:0,pagar:0,atrasados:0,
  caixaEntrada:0,caixaSaida:0,saldoInicial:0,saldoFinal:0,resultado:0})));
 return {preparado:true,usuario:'Administrador de teste',db:structuredClone(mockDB),resumo,pastaUrl:'https://example.invalid/drive'};
}
function runner(ok,fail) {
 return {withSuccessHandler(fn){return runner(fn,fail);},withFailureHandler(fn){return runner(ok,fn);},
  consultarSistema(ano){setTimeout(()=>{
   if(window.mockErroConsulta){window.mockErroConsulta=false;fail(new Error('Falha simulada de consulta'));}
   else ok(resposta(ano));
  },window.mockDelay||5);},
 alterarSistema(p){setTimeout(()=>{
  window.ultimoPedido=p;
  if(p.acao==='salvar') {const r={...p.registro,id:p.registro.id||'teste-'+mockDB.revisao};
   if(p.colecao==='simulacoes'){r.data=hoje();r.saldoBase=saldoSimulacao();}
   const i=mockDB[p.colecao].findIndex(x=>x.id===r.id);if(i<0)mockDB[p.colecao].push(r);else mockDB[p.colecao][i]=r;}
  if(p.acao==='config')mockDB.config=p.config;
  if(p.acao==='pagar')mockDB.lancamentos.find(l=>l.id===p.id).pagamento=p.data;
  if(p.acao==='pagarTodos')mockDB.lancamentos.filter(l=>p.ids.includes(l.id)).forEach(l=>l.pagamento=p.data);
  if(p.acao==='renovarIPTV')mockDB.iptv.find(r=>r.id===p.id).vencimento=p.data;
  if(p.acao==='excluir')mockDB[p.colecao]=mockDB[p.colecao].filter(r=>r.id!==p.id);
  mockDB.revisao++;ok({revisao:mockDB.revisao});
 },window.mockDelay||5);},
 preverImportacao(opcoes){setTimeout(()=>ok({revisao:mockDB.revisao,digest:'digest-teste',dados:{avisos:['Prévia fictícia'],
  registros:[{colecao:'lancamentos',chave:'demo',registro:{nome:'Importação fictícia',valor:100,escopo:'diego',obs:''},jaImportado:false}]}}),5);}
 };
}
window.google={script:{run:runner(()=>{},()=>{})}};
</script>
"""


class BrowserSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="controle-pessoal-ui-")
        html = (ROOT / "Index.html").read_text(encoding="utf-8")
        html = html.replace("<?!= incluir_('Estilos'); ?>", (ROOT / "Estilos.html").read_text(encoding="utf-8"))
        html = html.replace("<?!= incluir_('Relatorios'); ?>", (ROOT / "Relatorios.html").read_text(encoding="utf-8"))
        html = html.replace("<?!= incluir_('Cliente'); ?>", MOCK + (ROOT / "Cliente.html").read_text(encoding="utf-8"))
        arquivo = Path(cls.temp.name) / "index.html"
        arquivo.write_text(html, encoding="utf-8")
        antigo = re.sub(r'  <dialog id="popup"[\s\S]*?</dialog>\s*', '', html, count=1)
        seed = '<script>mockDB.lancamentos.push({id:"importado",nome:"Energia já importada",escopo:"diego",tipo:"saida",valor:29482,competencia:"2026-11",pagamento:""});</script>'
        antigo = antigo.replace("<script>\n  'use strict';", seed + "<script>\n  'use strict';")
        cls.antigo = Path(cls.temp.name) / "index-antigo.html"
        cls.antigo.write_text(antigo, encoding="utf-8")
        options = webdriver.ChromeOptions()
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1000")
        options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
        cls.driver = webdriver.Chrome(options=options)
        cls.driver.get(arquivo.as_uri())
        cls.wait = WebDriverWait(cls.driver, 15)
        cls.wait.until(EC.text_to_be_present_in_element((By.ID, "identidade"), "Administrador de teste"))

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        cls.temp.cleanup()

    def aguardar(self):
        self.wait.until(lambda d: not d.find_element(By.ID, "carregando").is_displayed())

    def pagina(self, nome):
        self.aguardar()
        botao = self.driver.find_element(By.CSS_SELECTOR, f'[data-pagina="{nome}"]')
        self.driver.execute_script("const grupo=arguments[0].closest('details');if(grupo)grupo.open=true;", botao)
        botao.click()

    def abrir_popup(self, acao):
        self.aguardar()
        self.driver.find_element(By.CSS_SELECTOR, f'[data-acao="{acao}"]').click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "popup")))

    def confirmar_popup(self):
        self.driver.find_element(By.ID, "popup-confirmar").click()
        self.wait.until(lambda d: not d.find_element(By.ID, "popup").is_displayed())
        self.aguardar()

    def valor_popup(self, valor):
        self.driver.execute_script("const el=document.getElementById('popup-valor');el.value=arguments[0];el.dispatchEvent(new Event('input',{bubbles:true}));", valor)

    def test_datas_brasileiras_ordenacao_todos_financeiros(self):
        self.aguardar()
        try:
            self.driver.execute_script("""
              const mes=periodo();
              mockDB.lancamentos=[];
              ['diego','iris','condominio'].forEach(escopo=>{
                [
                  ['sem-data','',mes+'-01'],
                  ['ultimo',mes+'-28',''],
                  ['primeiro',mes+'-02',''],
                  ['empate',mes+'-02',''],
                  ['sem-data-2',null,'']
                ].forEach(([id,vencimento,pagamento])=>mockDB.lancamentos.push({
                  id:escopo+'-'+id,nome:id,escopo,tipo:'saida',valor:100,
                  competencia:mes,vencimento,pagamento
                }));
                mockDB.lancamentos.push({id:escopo+'-anterior',nome:'anterior',escopo,
                  tipo:'saida',valor:100,competencia:mes.slice(0,4)+'-01',vencimento:'',pagamento:''});
              });
              carregar();
            """)
            self.aguardar()
            for escopo in ('diego', 'iris', 'condominio'):
                self.pagina('condominio' if escopo == 'condominio' else 'pessoal')
                if escopo != 'condominio':
                    Select(self.driver.find_element(By.ID, 'pessoa')).select_by_value(escopo)
                for visao in ('mensal', 'anual'):
                    Select(self.driver.find_element(By.ID, 'visao')).select_by_value(visao)
                    ids = self.driver.execute_script("return [...document.querySelectorAll('[data-baixa-id]')].map(el=>el.dataset.baixaId)")
                    self.assertEqual(ids[:5], [escopo+'-'+id for id in (
                        'primeiro', 'empate', 'ultimo', 'sem-data', 'sem-data-2')])
                    if visao == 'anual':
                        self.assertEqual(ids[-1], escopo+'-anterior')
                    self.assertEqual(self.driver.execute_script('return exportacao.map(l=>l.Descricao)'),
                                     [id.removeprefix(escopo+'-') for id in ids])
            self.pagina('pessoal')
            Select(self.driver.find_element(By.ID, 'pessoa')).select_by_value('diego')
            self.driver.find_element(By.CSS_SELECTOR, '[data-acao="editar"][data-id="diego-primeiro"]').click()
            vencimento = self.driver.find_element(By.NAME, 'vencimento')
            self.assertRegex(vencimento.get_attribute('value'), r'^02/\d{2}/\d{4}$')
            self.assertEqual(vencimento.get_attribute('placeholder'), 'DD/MM/AAAA')
            vencimento.clear()
            vencimento.send_keys('31/02/2026')
            self.driver.find_element(By.CSS_SELECTOR, '#formulario button[type="submit"]').click()
            self.assertIn('data válida', self.driver.find_element(By.ID, 'erro-editor').text)
            self.assertIsNone(self.driver.execute_script('return window.ultimoPedido || null'))
            vencimento.clear()
            vencimento.send_keys('29/02/2024')
            pagamento = self.driver.find_element(By.NAME, 'pagamento')
            pagamento.send_keys('14/01/2026')
            self.driver.find_element(By.CSS_SELECTOR, '#formulario button[type="submit"]').click()
            self.wait.until(lambda d: not d.find_element(By.ID, 'editor').is_displayed())
            self.aguardar()
            self.assertEqual(self.driver.execute_script('return ultimoPedido.registro.vencimento'), '2024-02-29')
            self.assertEqual(self.driver.execute_script('return ultimoPedido.registro.pagamento'), '2026-01-14')
            self.driver.find_element(By.CSS_SELECTOR, '[data-acao="editar"][data-id="diego-primeiro"]').click()
            self.assertEqual(self.driver.find_element(By.NAME, 'vencimento').get_attribute('value'), '29/02/2024')
            self.assertEqual(self.driver.find_element(By.NAME, 'pagamento').get_attribute('value'), '14/01/2026')
            self.driver.find_element(By.NAME, 'vencimento').clear()
            self.driver.find_element(By.NAME, 'pagamento').clear()
            self.driver.find_element(By.CSS_SELECTOR, '#formulario button[type="submit"]').click()
            self.wait.until(lambda d: not d.find_element(By.ID, 'editor').is_displayed())
            self.aguardar()
            self.assertEqual(self.driver.execute_script('return ultimoPedido.registro.vencimento'), '')
            self.assertEqual(self.driver.execute_script('return ultimoPedido.registro.pagamento'), '')
            self.abrir_popup('pagamento')
            self.assertEqual(self.driver.find_element(By.ID, 'popup-valor').get_attribute('value'),
                             self.driver.execute_script('return dataBR(hoje())'))
            for invalida in ('31/02/2026', '2026-01-01', '01/01/1899'):
                self.valor_popup(invalida)
                self.driver.find_element(By.ID, 'popup-confirmar').click()
                self.assertIn('data válida', self.driver.find_element(By.ID, 'popup-erro').text)
            self.driver.find_element(By.ID, 'popup-cancelar').click()
        finally:
            self.driver.refresh()
            self.wait.until(EC.text_to_be_present_in_element((By.ID, 'identidade'), 'Administrador de teste'))
            self.aguardar()

    def test_loading_consulta_erro_mobile_movimento_reduzido(self):
        self.aguardar()
        try:
            self.driver.set_window_size(390, 844)
            self.driver.execute_cdp_cmd('Emulation.setEmulatedMedia', {
                'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})
            self.driver.execute_script('window.mockDelay=1200;window.mockErroConsulta=true;carregar();')
            loading = self.driver.find_element(By.ID, 'carregando')
            self.assertTrue(loading.is_displayed())
            self.assertEqual(loading.get_attribute('role'), 'status')
            self.assertIn('Carregando seus dados', loading.text)
            self.assertEqual(self.driver.find_element(By.ID, 'conteudo').get_attribute('aria-busy'), 'true')
            self.assertFalse(self.driver.find_element(By.ID, 'atualizar').is_enabled())
            self.assertEqual(self.driver.execute_script(
                "return getComputedStyle(document.querySelector('.loading-anel')).animationName"), 'none')
            self.assertTrue(self.driver.execute_script('''
                const r=document.querySelector('.loading-cartao').getBoundingClientRect();
                return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight;
            '''))
            self.aguardar()
            self.assertIn('Falha simulada', self.driver.find_element(By.ID, 'mensagem').text)
            self.assertTrue(self.driver.find_element(By.ID, 'atualizar').is_enabled())
            self.assertEqual(self.driver.find_element(By.ID, 'conteudo').get_attribute('aria-busy'), 'false')
            self.assertFalse(self.driver.execute_script("return document.getElementById('carregando').matches(':popover-open')"))
        finally:
            self.driver.execute_script('window.mockDelay=0;window.mockErroConsulta=false;')
            self.aguardar()
            self.driver.set_window_size(1440, 1000)
            self.driver.execute_cdp_cmd('Emulation.setEmulatedMedia', {'features': []})
            self.driver.execute_script('carregar();')
            self.aguardar()

    def test_loading_salvamento_acima_editor(self):
        self.driver.execute_cdp_cmd('Emulation.setEmulatedMedia', {
            'features': [{'name': 'prefers-reduced-motion', 'value': 'no-preference'}]})
        self.pagina('pessoal')
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="novo"]').click()
        self.driver.find_element(By.NAME, 'nome').send_keys('Teste loading')
        valor = self.driver.find_element(By.NAME, 'valor')
        valor.clear()
        valor.send_keys('1,00')
        try:
            self.driver.execute_script('window.mockDelay=1200;document.getElementById("formulario").requestSubmit();')
            loading = self.driver.find_element(By.ID, 'carregando')
            self.assertTrue(loading.is_displayed())
            self.assertIn('Salvando alterações', loading.text)
            self.assertTrue(self.driver.execute_script("return document.getElementById('editor').open"))
            self.assertTrue(self.driver.execute_script('''
                const logo=document.querySelector('.loading-logo').getBoundingClientRect();
                return document.getElementById('carregando').contains(
                    document.elementFromPoint(logo.x+logo.width/2,logo.y+logo.height/2));
            '''))
            self.assertFalse(self.driver.find_element(By.ID, 'cancelar').is_enabled())
            self.assertEqual(self.driver.execute_script(
                "return getComputedStyle(document.querySelector('.loading-anel')).animationName"), 'controle-girar')
            self.aguardar()
            self.assertFalse(self.driver.execute_script("return document.getElementById('editor').open"))
            self.assertTrue(self.driver.find_element(By.ID, 'atualizar').is_enabled())
        finally:
            self.driver.execute_script('window.mockDelay=0;')
            self.aguardar()
            self.driver.execute_cdp_cmd('Emulation.setEmulatedMedia', {'features': []})

    def test_logo_propria_desktop_mobile(self):
        logo = self.driver.find_element(By.CSS_SELECTOR, '.marca svg.simbolo')
        self.assertEqual(logo.get_attribute('role'), 'img')
        self.assertEqual(logo.get_dom_attribute('viewBox'), '0 0 64 64')
        self.assertEqual(logo.accessible_name, 'Logo Meu controle')
        self.assertEqual(len(logo.find_elements(By.CSS_SELECTOR, 'rect')), 4)
        self.assertEqual(len(logo.find_elements(By.CSS_SELECTOR, 'polyline')), 2)
        self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '.marca img')), 0)
        try:
            for largura in (1440, 390):
                self.driver.set_window_size(largura, 1000)
                medidas = self.driver.execute_script('''
                    const logo=document.querySelector('.marca .simbolo').getBoundingClientRect();
                    const marca=document.querySelector('.marca').getBoundingClientRect();
                    return [logo.width,logo.height,logo.left>=marca.left,logo.right<=marca.right];
                ''')
                self.assertEqual(medidas, [48, 48, True, True])
        finally:
            self.driver.set_window_size(1440, 1000)

    def test_fluxo_formularios_menu_importacao_mobile(self):
        self.pagina("pessoal")
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="novo"]').click()
        self.driver.execute_cdp_cmd("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-color-scheme", "value": "dark"}]})
        self.assertEqual(self.driver.execute_script("return getComputedStyle(document.getElementById('editor')).backgroundColor"), "rgb(255, 255, 255)")
        self.assertEqual(self.driver.execute_script("return getComputedStyle(document.querySelector('#editor label')).color"), "rgb(28, 43, 64)")
        self.driver.find_element(By.NAME, "nome").send_keys("Despesa fictícia <script>não executar</script>")
        valor = self.driver.find_element(By.NAME, "valor")
        valor.clear()
        valor.send_keys("19,90")
        self.driver.find_element(By.CSS_SELECTOR, '#formulario button[type="submit"]').click()
        self.wait.until(lambda d: not d.find_element(By.ID, "editor").is_displayed())
        self.aguardar()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.registro.valor"), 1990)
        self.assertIn("não executar", self.driver.find_element(By.ID, "conteudo").text)
        self.assertEqual(self.driver.execute_script("return document.querySelectorAll('#conteudo script').length"), 0)
        self.abrir_popup("excluir")
        self.assertEqual(self.driver.execute_script("return getComputedStyle(document.getElementById('popup')).backgroundColor"), "rgb(255, 255, 255)")
        self.assertEqual(self.driver.execute_script("return document.activeElement.id"), "popup-cancelar")
        self.assertIn("não executar", self.driver.find_element(By.ID, "popup-descricao").text)
        self.assertEqual(self.driver.execute_script("return document.querySelectorAll('#popup script').length"), 0)
        self.driver.execute_script("document.querySelector('[data-pagina=simulacoes]').click()")
        self.assertEqual(self.driver.find_element(By.ID, "titulo").text, "Financeiro pessoal")
        self.driver.find_element(By.ID, "popup-cancelar").click()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.acao"), "salvar")
        self.abrir_popup("copiar")
        self.assertEqual(self.driver.find_element(By.ID, "popup-valor").get_attribute("type"), "month")
        self.assertEqual(self.driver.execute_script("return document.activeElement.id"), "popup-valor")
        origem = self.driver.execute_script("return periodo()")
        self.valor_popup(origem)
        self.driver.find_element(By.ID, "popup-confirmar").click()
        self.assertIn("diferente", self.driver.find_element(By.ID, "popup-erro").text)
        self.assertEqual(self.driver.execute_script("return ultimoPedido.acao"), "salvar")
        self.valor_popup("2027-02")
        self.confirmar_popup()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.destino"), "2027-02")
        self.assertEqual(self.driver.execute_script("return ultimoPedido.origem"), origem)
        self.abrir_popup("pagamento")
        self.assertEqual(self.driver.find_element(By.ID, "popup-valor").get_attribute("type"), "text")
        self.assertEqual(self.driver.find_element(By.ID, "popup-valor").get_attribute("placeholder"), "DD/MM/AAAA")
        self.valor_popup("01/01/2099")
        self.driver.find_element(By.ID, "popup-confirmar").click()
        self.assertIn("futura", self.driver.find_element(By.ID, "popup-erro").text)
        self.valor_popup("")
        self.driver.find_element(By.ID, "popup-confirmar").click()
        self.assertIn("válida", self.driver.find_element(By.ID, "popup-erro").text)
        self.valor_popup("01/01/2026")
        self.confirmar_popup()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.data"), "2026-01-01")
        self.abrir_popup("pagamento")
        self.assertIn("Estornar", self.driver.find_element(By.ID, "popup-titulo").text)
        self.confirmar_popup()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.data"), "")
        self.abrir_popup("gerar")
        self.driver.find_element(By.ID, "popup-cancelar").send_keys(Keys.ESCAPE)
        self.wait.until(lambda d: not d.find_element(By.ID, "popup").is_displayed())
        self.assertEqual(self.driver.execute_script("return ultimoPedido.acao"), "pagar")
        self.assertEqual(self.driver.execute_script("return document.activeElement.dataset.acao"), "gerar")
        self.abrir_popup("gerar")
        self.confirmar_popup()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.acao"), "servicos")
        self.driver.execute_script("mockDB.checklist.push({id:'check-teste',nome:'Extintor',status:'pendente',prioridade:'alta',intervalo:30});")
        self.driver.find_element(By.ID, "atualizar").click()
        self.aguardar()
        self.pagina("checklist")
        self.abrir_popup("verificar")
        self.assertIn("Extintor", self.driver.find_element(By.ID, "popup-descricao").text)
        self.confirmar_popup()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.acao"), "verificar")
        for nome in ["servicos", "condominio", "contatos", "simulacoes", "checklist", "config", "inicio"]:
            self.pagina(nome)
            self.assertTrue(self.driver.find_element(By.ID, "conteudo").text.strip())
        self.pagina("importacao")
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="prever"]').click()
        self.wait.until(EC.presence_of_element_located((By.ID, "confirma-importacao")))
        self.aguardar()
        self.assertIn("Importação fictícia", self.driver.find_element(By.ID, "conteudo").text)
        self.driver.find_element(By.ID, "confirma-importacao").click()
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="importar"]').click()
        self.wait.until(EC.visibility_of_element_located((By.ID, "popup")))
        self.assertIn("1 registro", self.driver.find_element(By.ID, "popup-descricao").text)
        self.confirmar_popup()
        self.wait.until(lambda d: d.execute_script("return window.ultimoPedido && ultimoPedido.acao==='importar'"))
        self.aguardar()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.chaves"), ["demo"])
        self.driver.set_window_size(390, 844)
        self.pagina("pessoal")
        self.abrir_popup("copiar")
        self.assertLessEqual(self.driver.find_element(By.ID, "popup").rect["width"], self.driver.execute_script("return window.innerWidth"))
        self.driver.find_element(By.ID, "popup-fechar").click()
        self.pagina("simulacoes")
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="novo"]').click()
        self.assertTrue(self.driver.find_element(By.ID, "editor").is_displayed())
        self.driver.find_element(By.ID, "cancelar").click()
        self.assertLessEqual(self.driver.execute_script("return document.body.scrollWidth"), self.driver.execute_script("return window.innerWidth"))
        erros = [r["message"] for r in self.driver.get_log("browser") if r["level"] == "SEVERE"]
        self.assertEqual(erros, [])

    def test_index_antigo_preserva_consulta_dados(self):
        original = self.driver.current_url
        try:
            self.driver.get(self.antigo.as_uri())
            self.wait.until(EC.text_to_be_present_in_element((By.ID, "identidade"), "Administrador de teste"))
            self.aguardar()
            self.assertTrue(self.driver.find_element(By.ID, "ano").get_attribute("value"))
            self.assertEqual(len(Select(self.driver.find_element(By.ID, "mes")).options), 12)
            self.driver.find_element(By.ID, "ano").clear()
            self.driver.find_element(By.ID, "ano").send_keys("2026", Keys.TAB)
            self.aguardar()
            Select(self.driver.find_element(By.ID, "mes")).select_by_value("11")
            self.pagina("pessoal")
            self.assertIn("Energia já importada", self.driver.find_element(By.ID, "conteudo").text)
            self.assertEqual(len(self.driver.find_elements(By.ID, "popup")), 1)
            self.abrir_popup("pagamento")
            self.driver.find_element(By.ID, "popup-cancelar").click()
            self.assertIsNone(self.driver.execute_script("return window.ultimoPedido || null"))
            self.assertEqual(self.driver.execute_script("return mockDB.lancamentos[0].pagamento"), "")
            self.assertEqual([r for r in self.driver.get_log("browser") if r["level"] == "SEVERE"], [])
        finally:
            self.driver.get(original)
            self.wait.until(EC.text_to_be_present_in_element((By.ID, "identidade"), "Administrador de teste"))

    def test_selecao_baixa_parcial(self):
        self.driver.set_window_size(1440, 1000)
        self.driver.refresh()
        self.wait.until(EC.text_to_be_present_in_element((By.ID, "identidade"), "Administrador de teste"))
        self.aguardar()
        self.driver.execute_script("""
          const mes=periodo();
          mockDB.lancamentos=[
            {id:'a',nome:'Energia',escopo:'diego',tipo:'saida',valor:3000,competencia:mes,pagamento:''},
            {id:'b',nome:'Serviços digitais',escopo:'diego',tipo:'saida',origem:'servicos',valor:1000,competencia:mes,pagamento:''},
            {id:'c',nome:'Já pago',escopo:'diego',tipo:'entrada',valor:9000,competencia:mes,pagamento:'2026-01-01'}];
        """)
        self.driver.find_element(By.ID, "atualizar").click()
        self.aguardar()
        self.pagina("pessoal")
        self.assertFalse(self.driver.find_element(By.ID, "baixar-selecionados").is_enabled())
        self.assertFalse(self.driver.find_element(By.CSS_SELECTOR, '[data-baixa-id="c"]').is_enabled())
        self.driver.find_element(By.CSS_SELECTOR, '[data-baixa-id="a"]').click()
        self.assertIn("(1)", self.driver.find_element(By.ID, "baixar-selecionados").text)
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="selecionar-baixas"]').click()
        self.assertIn("(2)", self.driver.find_element(By.ID, "baixar-selecionados").text)
        self.driver.find_element(By.ID, "limpar-baixas").click()
        self.assertFalse(self.driver.find_element(By.ID, "baixar-selecionados").is_enabled())
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="selecionar-baixas"]').click()
        self.driver.find_element(By.ID, "busca").send_keys("Energia")
        self.assertIn("(1)", self.driver.find_element(By.ID, "baixar-selecionados").text)
        self.driver.execute_script("const el=document.getElementById('busca');el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));")
        self.assertFalse(self.driver.find_element(By.CSS_SELECTOR, '[data-baixa-id="b"]').is_selected())
        self.abrir_popup("pagamento-selecionados")
        self.assertIn("1 lançamento", self.driver.find_element(By.ID, "popup-descricao").text)
        self.driver.find_element(By.ID, "popup-cancelar").click()
        self.assertTrue(self.driver.find_element(By.CSS_SELECTOR, '[data-baixa-id="a"]').is_selected())
        self.assertIsNone(self.driver.execute_script("return window.ultimoPedido || null"))
        self.abrir_popup("pagamento-selecionados")
        self.valor_popup("01/01/2026")
        self.confirmar_popup()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.ids"), ["a"])
        self.assertEqual(self.driver.execute_script("return mockDB.lancamentos.find(l=>l.id==='b').pagamento"), "")
        self.assertFalse(self.driver.find_element(By.ID, "baixar-selecionados").is_enabled())
        self.driver.find_element(By.CSS_SELECTOR, '[data-baixa-id="b"]').click()
        Select(self.driver.find_element(By.ID, "pessoa")).select_by_value("iris")
        Select(self.driver.find_element(By.ID, "pessoa")).select_by_value("diego")
        self.assertFalse(self.driver.find_element(By.CSS_SELECTOR, '[data-baixa-id="b"]').is_selected())

    def test_z_baixa_lote_filtros_cores(self):
        self.driver.set_window_size(1440, 1000)
        self.driver.refresh()
        self.wait.until(EC.text_to_be_present_in_element((By.ID, "identidade"), "Administrador de teste"))
        self.aguardar()
        self.driver.execute_script("""
          const mes=periodo();
          mockDB.lancamentos=[
            {id:'entrada',nome:'Lote salário',escopo:'diego',tipo:'entrada',valor:10000,competencia:mes,pagamento:''},
            {id:'saida',nome:'Lote energia',escopo:'diego',tipo:'saida',valor:3000,competencia:mes,pagamento:''},
            {id:'pago',nome:'Lote pago',escopo:'diego',tipo:'saida',valor:1000,competencia:mes,pagamento:'2026-01-01'},
            {id:'outro',nome:'Fora da busca',escopo:'diego',tipo:'saida',valor:1000,competencia:mes,pagamento:''},
            {id:'iris',nome:'Lote Iris',escopo:'iris',tipo:'saida',valor:1000,competencia:mes,pagamento:''}];
        """)
        self.driver.find_element(By.ID, "atualizar").click()
        self.aguardar()
        self.pagina("pessoal")
        self.assertEqual(self.driver.execute_script("return getComputedStyle(document.querySelector('.tipo-movimento.entrada')).color"), "rgb(18, 112, 75)")
        self.assertEqual(self.driver.execute_script("return getComputedStyle(document.querySelector('.tipo-movimento.saida')).color"), "rgb(176, 44, 53)")
        self.driver.find_element(By.ID, "busca").send_keys("Lote")
        self.abrir_popup("pagamento-todos")
        descricao=self.driver.find_element(By.ID, "popup-descricao").text
        self.assertIn("2 lançamento", descricao)
        self.assertIn("Entradas: 1", descricao)
        self.assertIn("Saídas: 1", descricao)
        self.driver.find_element(By.ID, "popup-cancelar").click()
        self.assertIsNone(self.driver.execute_script("return window.ultimoPedido || null"))
        self.abrir_popup("pagamento-todos")
        self.valor_popup("01/01/2026")
        self.confirmar_popup()
        self.assertCountEqual(self.driver.execute_script("return ultimoPedido.ids"), ["entrada", "saida"])
        self.assertEqual(self.driver.execute_script("return ultimoPedido.escopo"), "diego")
        self.assertEqual(self.driver.execute_script("return mockDB.lancamentos.find(l=>l.id==='outro').pagamento"), "")
        self.assertEqual(self.driver.execute_script("return mockDB.lancamentos.find(l=>l.id==='iris').pagamento"), "")
        self.assertFalse(self.driver.find_element(By.CSS_SELECTOR, '[data-acao="pagamento-todos"]').is_enabled())
        Select(self.driver.find_element(By.ID, "status-filtro")).select_by_value("ok")
        self.assertFalse(self.driver.find_element(By.CSS_SELECTOR, '[data-acao="pagamento-todos"]').is_enabled())
        self.pagina("config")
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="configurar"]').click()
        self.assertEqual(self.driver.execute_script("return getComputedStyle(document.getElementById('editor')).backgroundColor"), "rgb(255, 255, 255)")
        self.driver.find_element(By.ID, "cancelar").click()


if __name__ == "__main__":
    unittest.main()
