"""Clientes IPTV e menu Administração com dados locais fictícios."""
import unittest

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

import test_browser_smoke as smoke


class IPTVSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        smoke.BrowserSmoke.setUpClass()
        cls.ui = smoke.BrowserSmoke()
        cls.driver = smoke.BrowserSmoke.driver

    @classmethod
    def tearDownClass(cls):
        smoke.BrowserSmoke.tearDownClass()

    def setUp(self):
        self.ui.aguardar()
        self.driver.execute_script('''
            mockDB.iptv=[];mockDB.lancamentos=[];mockDB.checklist=[];
            document.getElementById('avisos').close();document.getElementById('editor').close();
            pagina='inicio';busca='';statusFiltro='todos';carregar();
            window.dataIPTV=d=>new Date(Date.parse(hoje()+'T12:00:00Z')+d*86400000).toISOString().slice(0,10);
        ''')
        self.ui.aguardar()

    def dados(self):
        self.driver.execute_script('''
            mockDB.iptv=[-1,0,1,2,3].map(d=>({id:'iptv-'+d,nome:'Cliente prazo '+d,
                telefone:'11999',plano:'Mensal',valor:2990,vencimento:dataIPTV(d),status:'ativo',obs:''}));
            mockDB.iptv.push({id:'inativo',nome:'Cliente inativo',telefone:'',plano:'',valor:100,
                vencimento:dataIPTV(-1),status:'inativo',obs:''});carregar();
        ''')
        self.ui.aguardar()
        self.ui.pagina('iptv')

    def campo(self, nome, valor):
        el = self.driver.find_element(By.NAME, nome)
        el.clear()
        el.send_keys(valor)

    def test_administracao_reune_importacao_config_e_iptv_separado(self):
        self.driver.execute_script("document.getElementById('menu-admin').open=false;")
        self.assertFalse(self.driver.find_element(By.CSS_SELECTOR, '[data-pagina="config"]').is_displayed())
        self.assertTrue(self.driver.find_element(By.CSS_SELECTOR, '[data-pagina="iptv"]').is_displayed())
        self.driver.find_element(By.CSS_SELECTOR, '#menu-admin summary').click()
        for pagina in ('importacao', 'config'):
            self.ui.pagina(pagina)
            self.assertIn('Administração', self.driver.find_element(By.ID, 'titulo').text)
            self.assertTrue(self.driver.execute_script("return document.getElementById('menu-admin').open;"))

    def test_cadastro_edicao_exclusao_datas_centavos_sem_receita(self):
        self.ui.pagina('iptv')
        self.assertFalse(self.driver.find_element(By.CSS_SELECTOR, 'section[aria-label="Período"]').is_displayed())
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="novo"]').click()
        self.assertIn('Cliente IPTV', self.driver.find_element(By.ID, 'editor-titulo').text)
        self.campo('nome', 'Cliente <script>literal</script>')
        self.campo('telefone', '(11) 99999-9999')
        self.campo('plano', 'Mensal')
        self.campo('valor', '29,90')
        self.campo('vencimento', '31/02/2026')
        self.driver.find_element(By.CSS_SELECTOR, '#formulario button[type="submit"]').click()
        self.assertIn('data válida', self.driver.find_element(By.ID, 'erro-editor').text)
        self.assertEqual(self.driver.execute_script('return mockDB.iptv.length;'), 0)
        self.campo('vencimento', '20/12/2026')
        self.driver.find_element(By.CSS_SELECTOR, '#formulario button[type="submit"]').click()
        self.ui.wait.until(lambda d: not d.find_element(By.ID, 'editor').is_displayed())
        self.ui.aguardar()
        registro = self.driver.execute_script('return mockDB.iptv[0];')
        self.assertEqual(registro['valor'], 2990)
        self.assertEqual(registro['vencimento'], '2026-12-20')
        self.assertIn('29,90', self.driver.find_element(By.ID, 'conteudo').text)
        self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '#conteudo script')), 0)
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="editar"]').click()
        self.assertEqual(self.driver.find_element(By.NAME, 'vencimento').get_attribute('value'), '20/12/2026')
        Select(self.driver.find_element(By.NAME, 'status')).select_by_value('inativo')
        self.driver.find_element(By.CSS_SELECTOR, '#formulario button[type="submit"]').click()
        self.ui.wait.until(lambda d: not d.find_element(By.ID, 'editor').is_displayed())
        self.ui.aguardar()
        self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '[data-acao="renovar-iptv"]')), 0)
        self.ui.abrir_popup('excluir')
        self.ui.confirmar_popup()
        self.assertEqual(self.driver.execute_script('return mockDB.iptv.length;'), 0)
        self.assertEqual(self.driver.execute_script('return mockDB.lancamentos.length;'), 0)
        self.ui.pagina('pessoal')
        self.assertTrue(self.driver.find_element(By.CSS_SELECTOR, 'section[aria-label="Período"]').is_displayed())

    def test_filtros_csv_avisos_e_navegacao(self):
        self.dados()
        for valor, quantidade in [('todos',6),('ativo',5),('inativo',1),('atrasado',1),('hoje',1),('proximo',2)]:
            Select(self.driver.find_element(By.ID, 'status-filtro')).select_by_value(valor)
            self.assertEqual(self.driver.execute_script('return exportacao.length;'), quantidade)
        self.driver.find_element(By.ID, 'busca').send_keys('prazo 2')
        self.assertEqual(self.driver.execute_script('return exportacao.map(r=>r.Cliente);'), ['Cliente prazo 2'])
        self.driver.execute_script('''
            window.baixarOriginal=baixar;
            baixar=(nome,texto,mime)=>{window.csvIPTV={nome,texto,mime};};
        ''')
        try:
            self.driver.find_element(By.CSS_SELECTOR, '[data-acao="csv"]').click()
            texto = self.driver.execute_script('return csvIPTV.texto;')
            self.assertIn('Cliente prazo 2', texto)
            self.assertNotIn('Cliente inativo', texto)
            self.assertIn('29.90', texto)
        finally:
            self.driver.execute_script('baixar=baixarOriginal;')
        self.assertEqual(self.driver.find_element(By.ID, 'sino-contador').text, '4')
        self.driver.find_element(By.ID, 'sino').click()
        self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '#avisos [data-colecao="iptv"]')), 4)
        self.assertNotIn('Cliente inativo', self.driver.find_element(By.ID, 'avisos-lista').text)
        self.assertIn('IPTV · Renovação de cliente', self.driver.find_element(By.ID, 'avisos-lista').text)
        self.driver.find_element(By.CSS_SELECTOR, '#avisos [data-id="iptv--1"]').click()
        self.ui.aguardar()
        self.assertEqual(self.driver.switch_to.active_element.get_attribute('data-id'), 'iptv--1')
        self.assertEqual(self.driver.execute_script('return exportacao.length;'), 6)
        self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '#conteudo .linha-vencida')), 1)

    def test_renovacao_explicita_futura_cancelamento_e_alerta(self):
        self.dados()
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="renovar-iptv"][data-id="iptv--1"]').click()
        self.driver.find_element(By.ID, 'popup-cancelar').click()
        self.assertEqual(self.driver.find_element(By.ID, 'sino-contador').text, '4')
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="renovar-iptv"][data-id="iptv--1"]').click()
        self.ui.valor_popup(self.driver.execute_script('return dataBR(dataIPTV(-1));'))
        self.driver.find_element(By.ID, 'popup-confirmar').click()
        self.assertTrue(self.driver.find_element(By.ID, 'popup-erro').is_displayed())
        self.ui.valor_popup(self.driver.execute_script('return dataBR(dataIPTV(30));'))
        self.ui.confirmar_popup()
        self.assertEqual(self.driver.execute_script("return ultimoPedido.acao;"), 'renovarIPTV')
        self.assertEqual(self.driver.execute_script("return mockDB.iptv.find(r=>r.id==='iptv--1').vencimento;"),
                         self.driver.execute_script('return dataIPTV(30);'))
        self.assertEqual(self.driver.find_element(By.ID, 'sino-contador').text, '3')
        self.assertEqual(self.driver.execute_script('return mockDB.lancamentos.length;'), 0)


if __name__ == '__main__':
    unittest.main()
