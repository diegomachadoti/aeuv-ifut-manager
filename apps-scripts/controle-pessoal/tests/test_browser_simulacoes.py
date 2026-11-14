"""Simulações de custos sem movimentar o financeiro real."""
import unittest
from selenium.webdriver.common.by import By
import test_browser_smoke as smoke


class SimulacoesSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        smoke.BrowserSmoke.setUpClass()
        cls.ui=smoke.BrowserSmoke()
        cls.driver=smoke.BrowserSmoke.driver

    @classmethod
    def tearDownClass(cls):
        smoke.BrowserSmoke.tearDownClass()

    def setUp(self):
        self.ui.aguardar()
        self.driver.execute_script('''
            mockDB.simulacoes=[];mockDB.iptv=[];mockDB.checklist=[];mockDB.lancamentos=[];
            mockDB.config.saldos.condominio={data:'2026-01-01',valor:100000};
            mockDB.lancamentos=[{id:'pago',nome:'Recebido',escopo:'condominio',tipo:'entrada',valor:20000,competencia:'2026-11',pagamento:hoje()},
                {id:'pendente',nome:'Previsto',escopo:'condominio',tipo:'entrada',valor:99999,competencia:'2026-11',pagamento:''},
                {id:'pessoal',nome:'Outro escopo',escopo:'diego',tipo:'entrada',valor:99999,competencia:'2026-11',pagamento:hoje()}];
            document.getElementById('editor').close();pagina='inicio';busca='';carregar();
        ''')
        self.ui.aguardar()
        self.ui.pagina('simulacoes')

    def campo(self,nome,valor):
        el=self.driver.find_element(By.NAME,nome)
        el.clear();el.send_keys(valor)

    def salvar(self):
        self.driver.find_element(By.CSS_SELECTOR,'#formulario button[type="submit"]').click()
        self.ui.wait.until(lambda d:not d.find_element(By.ID,'editor').is_displayed())
        self.ui.aguardar()

    def test_previa_salvar_comparar_editar_e_excluir_sem_despesas(self):
        self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR,'[data-pagina="contas"]')),0)
        self.assertFalse(self.driver.find_element(By.CSS_SELECTOR,'section[aria-label="Período"]').is_displayed())
        self.driver.execute_script('window.financeiroAntes=JSON.stringify(mockDB.lancamentos);')
        self.driver.find_element(By.CSS_SELECTOR,'[data-acao="novo"]').click()
        self.campo('nome','Reforma fachada')
        for k,v in [('materiais','500,25'),('maoObra','700,00'),('outros','100,00'),('reserva','50,00')]:
            self.campo(k,v)
        previa=self.driver.find_element(By.ID,'simulacao-previa').text
        for trecho in ('1.200,00','1.350,25','150,25','Faltariam'):
            self.assertIn(trecho,previa)
        self.salvar()
        salvo=self.driver.execute_script('return mockDB.simulacoes[0];')
        self.assertEqual(salvo['materiais'],50025)
        self.assertEqual(salvo['saldoBase'],120000)
        self.assertTrue(self.driver.execute_script('return financeiroAntes===JSON.stringify(mockDB.lancamentos);'))
        self.driver.execute_script('mockDB.config.saldos.condominio.valor=200000;carregar();')
        self.ui.aguardar()
        self.assertEqual(self.driver.execute_script('return mockDB.simulacoes[0].saldoBase;'),120000)
        self.assertIn('849,75',self.driver.find_element(By.ID,'conteudo').text)
        self.driver.find_element(By.CSS_SELECTOR,'[data-acao="editar"]').click()
        self.salvar()
        self.assertEqual(self.driver.execute_script('return mockDB.simulacoes[0].saldoBase;'),220000)
        self.ui.abrir_popup('excluir');self.ui.confirmar_popup()
        self.assertEqual(self.driver.execute_script('return mockDB.simulacoes.length;'),0)
        self.assertTrue(self.driver.execute_script('return financeiroAntes===JSON.stringify(mockDB.lancamentos);'))

    def test_negativos_cancelamento_busca_csv_e_saldo_indisponivel(self):
        self.driver.find_element(By.CSS_SELECTOR,'[data-acao="novo"]').click()
        self.campo('nome','Pintura')
        self.campo('materiais','-1,00')
        self.driver.find_element(By.CSS_SELECTOR,'#formulario button[type="submit"]').click()
        self.assertIn('negativos',self.driver.find_element(By.ID,'erro-editor').text)
        self.driver.find_element(By.ID,'cancelar').click()
        self.assertEqual(self.driver.execute_script('return mockDB.simulacoes.length;'),0)
        self.driver.execute_script('''
            mockDB.simulacoes=['Pintura','Elevador'].map((nome,i)=>({id:'s'+i,nome,materiais:10000,maoObra:0,outros:0,reserva:0,
                data:hoje(),saldoBase:120000,obs:''}));carregar();
        ''')
        self.ui.aguardar()
        self.driver.find_element(By.ID,'busca').send_keys('Pintura')
        self.assertEqual(self.driver.execute_script('return exportacao.length;'),1)
        self.driver.execute_script('window.baixarOriginal=baixar;baixar=(nome,texto)=>{window.csvSimulacao=texto;};')
        try:
            self.driver.find_element(By.CSS_SELECTOR,'[data-acao="csv"]').click()
            csv=self.driver.execute_script('return csvSimulacao;')
            self.assertIn('Pintura',csv);self.assertNotIn('Elevador',csv)
            self.assertIn('1100.00',csv)
        finally:
            self.driver.execute_script('baixar=baixarOriginal;')
        self.driver.execute_script("mockDB.config.saldos.condominio.data='2200-01-01';carregar();")
        self.ui.aguardar()
        self.assertIn('Não disponível',self.driver.find_element(By.ID,'conteudo').text)
        self.driver.find_element(By.CSS_SELECTOR,'[data-acao="novo"]').click()
        self.assertIn('Saldo indisponível',self.driver.find_element(By.ID,'simulacao-previa').text)
        self.driver.find_element(By.ID,'cancelar').click()


if __name__=='__main__':
    unittest.main()
