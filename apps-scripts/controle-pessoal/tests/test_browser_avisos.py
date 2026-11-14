"""Avisos locais com dados fictícios, sem OAuth, notificações externas ou Drive real."""
import unittest

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select

import test_browser_smoke as smoke


class AvisosSmoke(unittest.TestCase):
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
            window.dataTeste=(dias,base=hoje())=>new Date(Date.parse(base+'T12:00:00Z')+dias*86400000).toISOString().slice(0,10);
            mockDB.lancamentos=[];mockDB.checklist=[];
            mockDB.servicos=[];mockDB.contatos=[];mockDB.contas=[];
            ['diego','iris','condominio'].forEach(escopo=>{
                [-1,0,1,2,3].forEach(d=>mockDB.lancamentos.push({
                    id:escopo+'-'+d,nome:escopo+' prazo '+d,escopo,tipo:d===0?'entrada':'saida',valor:12345,meta:0,
                    competencia:hoje().slice(0,7),vencimento:dataTeste(d),pagamento:'',obs:''}));
                mockDB.lancamentos.push({id:escopo+'-pago',nome:'Pago',escopo,tipo:'saida',valor:100,
                    competencia:hoje().slice(0,7),vencimento:dataTeste(-1),pagamento:hoje()});
                mockDB.lancamentos.push({id:escopo+'-sem',nome:'Sem data',escopo,tipo:'saida',valor:100,
                    competencia:hoje().slice(0,7),vencimento:'',pagamento:''});
            });
            [-1,0,1,2,3].forEach(d=>mockDB.checklist.push({id:'check-'+d,nome:'Checklist prazo '+d,
                status:'ok',proxima:dataTeste(d),ultima:'',intervalo:30,prioridade:'alta',responsavel:'Teste',obs:''}));
            mockDB.checklist.push({id:'check-sem',nome:'Sem próxima',status:'pendente',proxima:'',intervalo:0});
            document.getElementById('avisos').close();document.getElementById('editor').close();
            document.getElementById('ano').value=hoje().slice(0,4);document.getElementById('mes').value=hoje().slice(5,7);
            document.getElementById('visao').value='mensal';document.getElementById('pessoa').value='diego';
            pagina='inicio';busca='';statusFiltro='todos';carregar();
        ''')
        self.ui.aguardar()

    def abrir(self):
        self.driver.find_element(By.ID, 'sino').click()
        self.ui.wait.until(lambda d: d.find_element(By.ID, 'avisos').is_displayed())

    def test_linha_vencida_apenas_sem_baixa_em_todos_financeiros(self):
        for pagina, pessoa in [('pessoal', 'diego'), ('pessoal', 'iris'), ('condominio', 'condominio')]:
            self.ui.pagina(pagina)
            if pagina == 'pessoal':
                Select(self.driver.find_element(By.ID, 'pessoa')).select_by_value(pessoa)
            for visao in ('mensal', 'anual'):
                Select(self.driver.find_element(By.ID, 'visao')).select_by_value(visao)
                linhas = self.driver.find_elements(By.CSS_SELECTOR, '#conteudo tr.linha-vencida')
                self.assertEqual(len(linhas), 1)
                self.assertIn(pessoa+' prazo -1', linhas[0].text)
                self.assertIn('Vencido · sem baixa', linhas[0].text)
                self.assertIn('⚠', linhas[0].text)
                self.assertEqual(self.driver.execute_script('return getComputedStyle(arguments[0]).backgroundColor;',
                                 linhas[0].find_element(By.CSS_SELECTOR, 'td')), 'rgb(255, 240, 241)')

    def test_sino_global_filtros_mobile_escape_e_html_seguro(self):
        self.ui.pagina('pessoal')
        self.driver.execute_script('''
            busca='oculta-todos';statusFiltro='ok';
            estado.db.lancamentos[0].nome='<img src=x onerror="window.injetado=true">';renderizar();
            window.antesAvisos=JSON.stringify(mockDB);
        ''')
        self.assertEqual(self.driver.find_element(By.ID, 'sino-contador').text, '16')
        self.assertIn('16', self.driver.find_element(By.ID, 'sino').accessible_name)
        try:
            for largura in (1440, 390):
                self.driver.set_window_size(largura, 900)
                self.abrir()
                self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '#avisos .aviso-item')), 16)
                texto = self.driver.find_element(By.ID, 'avisos-lista').text
                for parte in ('Vencidos (4)', 'Hoje (4)', 'Próximos 2 dias (8)', 'Diego Machado',
                              'Iris Marta', 'Edifício Lisboa', 'A pagar', 'A receber', 'Checklist', '<img'):
                    self.assertIn(parte, texto)
                self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '#avisos-lista img')), 0)
                self.assertIsNone(self.driver.execute_script('return window.injetado;'))
                self.assertTrue(self.driver.execute_script('''
                    const r=document.getElementById('avisos').getBoundingClientRect();
                    return r.left>=0 && r.right<=innerWidth && r.height<=innerHeight;
                '''))
                self.driver.switch_to.active_element.send_keys(Keys.ESCAPE)
                self.assertFalse(self.driver.find_element(By.ID, 'avisos').is_displayed())
                self.assertEqual(self.driver.switch_to.active_element.get_attribute('id'), 'sino')
            self.assertTrue(self.driver.execute_script('return antesAvisos===JSON.stringify(mockDB);'))
        finally:
            self.driver.execute_script("document.getElementById('avisos').close();")
            self.driver.set_window_size(1440, 1000)

    def test_aviso_navega_pessoa_condominio_checklist_e_outro_ano(self):
        self.driver.execute_script('''
            mockDB.lancamentos.find(r=>r.id==='iris--1').competencia='2025-12';carregar();
            window.antesAvisos=JSON.stringify(mockDB);
        ''')
        self.ui.aguardar()
        for colecao, id_, destino in [('lancamentos', 'iris--1', 'pessoal'),
                                      ('lancamentos', 'condominio--1', 'condominio'),
                                      ('checklist', 'check--1', 'checklist')]:
            self.abrir()
            self.driver.find_element(By.CSS_SELECTOR, f'#avisos [data-colecao="{colecao}"][data-id="{id_}"]').click()
            self.ui.aguardar()
            self.assertFalse(self.driver.find_element(By.ID, 'avisos').is_displayed())
            self.assertEqual(self.driver.execute_script('return pagina;'), destino)
            self.assertEqual(self.driver.switch_to.active_element.get_attribute('data-id'), id_)
            self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '#conteudo .linha-aviso-alvo')), 1)
            if id_ == 'iris--1':
                self.assertEqual(self.driver.find_element(By.ID, 'pessoa').get_attribute('value'), 'iris')
                self.assertEqual(self.driver.find_element(By.ID, 'ano').get_attribute('value'), '2025')
                self.assertEqual(self.driver.find_element(By.ID, 'mes').get_attribute('value'), '12')
            self.assertTrue(self.driver.execute_script('return antesAvisos===JSON.stringify(mockDB);'))

    def test_baixa_retira_alerta_estorno_retorna_e_vazio(self):
        self.ui.pagina('pessoal')
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="pagamento"][data-id="diego--1"]').click()
        self.ui.confirmar_popup()
        self.assertEqual(self.driver.find_element(By.ID, 'sino-contador').text, '15')
        self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '#conteudo .linha-vencida')), 0)
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="pagamento"][data-id="diego--1"]').click()
        self.ui.confirmar_popup()
        self.assertEqual(self.driver.find_element(By.ID, 'sino-contador').text, '16')
        self.driver.execute_script('''
            mockDB.lancamentos.forEach(r=>r.pagamento=hoje());
            mockDB.checklist.forEach(r=>r.proxima=dataTeste(3));carregar();
        ''')
        self.ui.aguardar()
        self.assertFalse(self.driver.find_element(By.ID, 'sino-contador').is_displayed())
        self.abrir()
        self.assertIn('Nenhum vencimento', self.driver.find_element(By.ID, 'avisos-lista').text)
        self.driver.find_element(By.ID, 'avisos-fechar').click()
        self.driver.execute_script('window.mockErroConsulta=true;carregar();')
        self.ui.aguardar()
        self.assertFalse(self.driver.find_element(By.ID, 'sino').is_enabled())
        self.assertEqual(len(self.driver.find_elements(By.CSS_SELECTOR, '#avisos .aviso-item')), 0)

    def test_limite_dois_dias_bissexto_e_virada_dia(self):
        for base in ('2026-12-30', '2024-02-28'):
            resultado = self.driver.execute_script('''
                const base=arguments[0];window.estadoAntesDatas=estado;
                estado={preparado:true,db:{lancamentos:[-1,0,1,2,3].map(d=>({id:String(d),nome:'Prazo',
                    escopo:'diego',vencimento:dataTeste(d,base),pagamento:''})),checklist:[]}};
                const avisos=calcularAvisos(base).map(a=>({data:a.data,dias:a.dias}));
                estado=estadoAntesDatas;return avisos;
            ''', base)
            self.assertEqual([r['dias'] for r in resultado], [-1, 0, 1, 2])
            self.assertEqual(resultado[-1]['data'], '2027-01-01' if base == '2026-12-30' else '2024-03-01')
        self.driver.execute_script('''
            window.DateOriginal=Date;window.agoraTeste=Date.parse(hoje()+'T12:00:00Z');
            window.Date=class extends DateOriginal {constructor(...args){super(...(args.length?args:[agoraTeste]));}};
            diaAvisos=hoje();agoraTeste+=86400000;atualizarDiaAvisos();
        ''')
        try:
            self.assertEqual(self.driver.execute_script('return diaAvisos;'), self.driver.execute_script('return hoje();'))
            self.assertEqual(self.driver.execute_script("return calcularAvisos().filter(a=>a.id==='diego-0')[0].dias;"), -1)
        finally:
            self.driver.execute_script('window.Date=DateOriginal;renderizar();')


if __name__ == '__main__':
    unittest.main()
