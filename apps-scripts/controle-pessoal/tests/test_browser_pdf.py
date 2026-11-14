"""PDFs reais em Chrome local com dados fictícios; usa Selenium e PyMuPDF do projeto."""
import re
import unittest
from urllib.request import urlopen

import pymupdf
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

import test_browser_smoke as smoke

ROOT = smoke.ROOT


class PDFExportSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        smoke.BrowserSmoke.setUpClass()
        cls.ui = smoke.BrowserSmoke()
        cls.driver = smoke.BrowserSmoke.driver
        # Carrega as versões fixadas reais, sem depender de acesso de rede do Chrome.
        try:
            urls = re.findall(r"'https://cdn\.jsdelivr\.net/[^']+'", (ROOT / 'Relatorios.html').read_text(encoding='utf-8'))
            for url in urls:
                with urlopen(url.strip("'"), timeout=30) as resposta:
                    cls.driver.execute_script(resposta.read().decode('utf-8'))
            cls.driver.execute_script('''
                baixar=(nome,conteudo,mime)=>{
                    window.pdfTeste={nome,mime,bytes:Array.from(new Uint8Array(conteudo))};
                };
                window.print=()=>{throw new Error('PDF não deve imprimir a tela');};
            ''')
        except Exception:
            smoke.BrowserSmoke.tearDownClass()
            raise

    @classmethod
    def tearDownClass(cls):
        smoke.BrowserSmoke.tearDownClass()

    def setUp(self):
        self.ui.aguardar()
        self.driver.execute_script('''
            mockDB.lancamentos=[];mockDB.servicos=[];mockDB.contatos=[];mockDB.contas=[];mockDB.checklist=[];mockDB.iptv=[];mockDB.simulacoes=[];
            mockDB.atualizadoEm='2026-11-14T12:00:00Z';
            document.getElementById('ano').value='2026';document.getElementById('mes').value='11';
            document.getElementById('visao').value='mensal';document.getElementById('pessoa').value='diego';
            busca='';statusFiltro='todos';window.pdfTeste=null;carregar();
        ''')
        self.ui.aguardar()

    def exportar(self, pagina):
        if self.driver.execute_script('return pagina !== arguments[0];', pagina):
            self.ui.pagina(pagina)
        self.driver.find_element(By.CSS_SELECTOR, '[data-acao="imprimir"]').click()
        self.ui.aguardar()
        resultado = self.driver.execute_script('return window.pdfTeste;')
        self.assertIsNotNone(resultado, self.driver.find_element(By.ID, 'mensagem').text)
        self.assertEqual(resultado['mime'], 'application/pdf')
        self.assertTrue(resultado['nome'].endswith('.pdf'))
        dados = bytes(resultado['bytes'])
        self.assertTrue(dados.startswith(b'%PDF-'))
        return pymupdf.open(stream=dados, filetype='pdf')

    def test_financeiro_paginado_observacoes_e_privacidade(self):
        self.driver.execute_script('''
            mockDB.lancamentos=Array.from({length:80},(_,i)=>({id:'l'+i,nome:'Despesa '+String(i).padStart(3,'0'),
                escopo:'diego',competencia:'2026-11',tipo:'saida',valor:123456,meta:0,vencimento:'2026-11-10',
                pagamento:'',categoria:'Casa',conta:'Conta de teste',obs:i===0?'Observação <script>literal</script> '+
                'Texto longo para verificar quebra de linha. '.repeat(40)+'FIM-OBSERVACAO':''}));
            mockDB.lancamentos.push({id:'iris',nome:'SEGREDO-OUTRA-PESSOA',escopo:'iris',competencia:'2026-11',tipo:'saida',valor:100,pagamento:''});
            carregar();
        ''')
        self.ui.aguardar()
        with self.exportar('pessoal') as pdf:
            conteudo = '\n'.join(p.get_text() for p in pdf)
            self.assertGreater(pdf.page_count, 1)
            self.assertGreater(pdf[0].rect.width, pdf[0].rect.height)
            for numero, pagina in enumerate(pdf, 1):
                self.assertIn('Meu controle', pagina.get_text())
                self.assertIn(f'Página {numero} de {pdf.page_count}', pagina.get_text())
            for trecho in ['Diego Machado', 'Novembro / 2026', 'FIM-OBSERVACAO', '<script>literal</script>', '1.234,56', 'Despesa 079']:
                self.assertIn(trecho, conteudo)
            for trecho in ['Selecionar', 'Registrar baixa', 'Novo registro', 'SEGREDO-OUTRA-PESSOA']:
                self.assertNotIn(trecho, conteudo)

    def test_filtros_e_listas_vazias(self):
        self.driver.execute_script('''
            mockDB.lancamentos=[{id:'1',nome:'Incluido-filtro',escopo:'diego',competencia:'2026-11',tipo:'entrada',valor:1000,pagamento:''},
                {id:'2',nome:'Oculto-filtro',escopo:'diego',competencia:'2026-11',tipo:'saida',valor:2000,pagamento:''}];
            carregar();
        ''')
        self.ui.aguardar()
        self.ui.pagina('pessoal')
        self.driver.execute_script("busca='Incluido';statusFiltro='pendente';renderizar();")
        with self.exportar('pessoal') as pdf:
            conteudo = '\n'.join(p.get_text() for p in pdf)
            self.assertIn('Incluido-filtro', conteudo)
            self.assertNotIn('Oculto-filtro', conteudo)
            self.assertIn('Busca: Incluido', conteudo)
            self.assertIn('Situação: Pendentes', conteudo)
            self.assertIn('período inteiro', conteudo)
        for pagina in ('servicos', 'contatos', 'simulacoes', 'checklist', 'condominio'):
            with self.exportar(pagina) as pdf:
                self.assertIn('Nenhum registro neste filtro.', '\n'.join(p.get_text() for p in pdf))

    def test_iptv_pdf_filtrado_sem_misturar_financeiros(self):
        self.driver.execute_script('''
            mockDB.iptv=[{id:'tv1',nome:'Cliente IPTV incluido',telefone:'11999',plano:'Plano mensal',valor:2990,
                vencimento:'2026-12-20',status:'ativo',obs:'Observacao do cliente'},
                {id:'tv2',nome:'Cliente IPTV oculto',telefone:'',plano:'',valor:100,vencimento:'2026-01-01',status:'inativo',obs:''}];
            document.getElementById('visao').value='anual';carregar();
        ''')
        self.ui.aguardar()
        self.ui.pagina('iptv')
        Select(self.driver.find_element(By.ID, 'status-filtro')).select_by_value('ativo')
        with self.exportar('iptv') as pdf:
            texto='\n'.join(p.get_text() for p in pdf)
            for trecho in ('Clientes IPTV', 'Cliente IPTV incluido', '29,90', '20/12/2026', 'Posição em', 'Situação: Ativos'):
                self.assertIn(trecho, texto)
            for trecho in ('Cliente IPTV oculto', 'Edifício Lisboa', 'Iris Marta', 'Saldo inicial', 'Ano 2026'):
                self.assertNotIn(trecho, texto)

    def test_visao_geral_anual(self):
        self.driver.execute_script("document.getElementById('visao').value='anual';renderizar();")
        with self.exportar('inicio') as pdf:
            conteudo = '\n'.join(p.get_text() for p in pdf)
            for trecho in ('Diego Machado', 'Iris Marta', 'Edifício Lisboa', 'Ano 2026', 'Janeiro', 'Dezembro'):
                self.assertIn(trecho, conteudo)

    def test_cadastros_servicos_e_mes_real(self):
        self.driver.execute_script('''
            mockDB.servicos=[{id:'s',nome:'Servico digital teste',escopo:'diego',valor:12990,cartao:'Cartao teste',ciclo:'anual',inicio:'2026-11',fim:'',dia:10,obs:'Observacao do servico'}];
            mockDB.contatos=[{id:'c',nome:'Fornecedor teste',tipo:'Eletricista',telefone:'123456',email:'teste@example.invalid',obs:'Observacao do contato'}];
            mockDB.contas=[{id:'a',nome:'Energia teste',servico:'Energia',titular:'Titular teste',identificador:'Cliente teste',dia:10,contatoId:'c',obs:'Observacao da conta'}];
            mockDB.checklist=[{id:'t',nome:'Manutencao teste',prioridade:'alta',responsavel:'Responsavel teste',ultima:'2026-10-01',proxima:'2026-11-01',intervalo:31,status:'pendente',obs:'Observacao do checklist'}];
            document.getElementById('visao').value='anual';carregar();
        ''')
        self.ui.aguardar()
        for pagina, trechos in {
            'servicos': ['Servico digital teste', 'Novembro / 2026', '129,90', 'Observacao do servico'],
            'contatos': ['Fornecedor teste', 'Eletricista', 'Observacao do contato'],
            'checklist': ['Manutencao teste', 'Verificação vencida', 'Observacao do checklist']
        }.items():
            with self.exportar(pagina) as pdf:
                conteudo = '\n'.join(p.get_text() for p in pdf)
                for trecho in trechos:
                    self.assertIn(trecho, conteudo)
                if pagina == 'servicos':
                    self.assertNotIn('Ano 2026', conteudo)

    def test_simulacoes_pdf_referencias_e_filtros(self):
        self.driver.execute_script('''
            mockDB.simulacoes=[{id:'s1',nome:'Reforma fachada',materiais:10000,maoObra:20000,outros:5000,reserva:5000,
                saldoBase:30000,data:'2026-11-14',obs:'Orcamento teste'},
                {id:'s2',nome:'Cenario oculto',materiais:0,maoObra:0,outros:0,reserva:0,saldoBase:10000,data:'2026-11-14',obs:''}];carregar();
        ''')
        self.ui.aguardar()
        self.ui.pagina('simulacoes')
        self.driver.find_element(By.ID,'busca').send_keys('fachada')
        with self.exportar('simulacoes') as pdf:
            texto='\n'.join(p.get_text() for p in pdf)
            for trecho in ('Simulações de gastos','Edifício Lisboa','Reforma fachada','400,00','100,00','Referência salva','Saldo projetado hoje','Orcamento teste'):
                self.assertIn(trecho,texto)
            for trecho in ('Cenario oculto','Energia teste','Iris Marta','Ano 2026'):
                self.assertNotIn(trecho,texto)

    def test_checklist_situacao_busca_e_exportacoes(self):
        self.driver.execute_script('''
            mockDB.checklist=['pendente','andamento','ok','atrasado'].map((status,i)=>({
                id:'check'+i,nome:'Item-'+status,prioridade:'media',responsavel:'Teste',
                ultima:'',proxima:status==='atrasado'?'1900-01-01':'',intervalo:0,
                status:status==='atrasado'?'ok':status,obs:''}));carregar();
        ''')
        self.ui.aguardar()
        self.ui.pagina('checklist')
        for status, rotulo in [('pendente', 'Pendente'), ('andamento', 'Em andamento'),
                               ('ok', 'OK'), ('atrasado', 'Verificação vencida')]:
            Select(self.driver.find_element(By.ID, 'status-filtro')).select_by_value(status)
            linhas = self.driver.find_elements(By.CSS_SELECTOR, '#conteudo tbody tr')
            self.assertEqual(len(linhas), 1)
            self.assertIn('Item-'+status, linhas[0].text)
            self.assertIn(rotulo, linhas[0].text)
            self.assertEqual(self.driver.execute_script('return exportacao.map(r=>r.nome);'), ['Item-'+status])
            with self.exportar('checklist') as pdf:
                conteudo = '\n'.join(p.get_text() for p in pdf)
                self.assertIn('Situação: '+rotulo, conteudo)
                self.assertIn('Item-'+status, conteudo)
                for outro in ('pendente', 'andamento', 'ok', 'atrasado'):
                    if outro != status:
                        self.assertNotIn('Item-'+outro, conteudo)
        self.driver.find_element(By.ID, 'busca').send_keys('inexistente')
        self.assertIn('Nenhum registro neste filtro.', self.driver.find_element(By.ID, 'conteudo').text)
        self.assertEqual(self.driver.execute_script('return exportacao.length;'), 0)
        self.ui.pagina('pessoal')
        self.assertEqual(Select(self.driver.find_element(By.ID, 'status-filtro')).first_selected_option.get_attribute('value'), 'todos')

    def test_abrir_pdf_nova_aba_sem_download(self):
        self.ui.pagina('inicio')
        principal = self.driver.current_window_handle
        self.driver.execute_script('''
            window.urlOriginal=URL.createObjectURL;
            URL.createObjectURL=blob=>{window.urlPDFTeste=urlOriginal(blob);return urlPDFTeste;};
        ''')
        try:
            self.driver.find_element(By.CSS_SELECTOR, '[data-acao="abrir-pdf"]').click()
            self.ui.aguardar()
            self.assertEqual(len(self.driver.window_handles), 2)
            self.assertIsNone(self.driver.execute_script('return window.pdfTeste;'))
            self.assertIn('PDF aberto em uma nova aba', self.driver.find_element(By.ID, 'mensagem').text)
            dados = self.driver.execute_async_script('''
                const done=arguments[0];fetch(urlPDFTeste).then(r=>r.arrayBuffer())
                    .then(b=>done(Array.from(new Uint8Array(b))));
            ''')
            with pymupdf.open(stream=bytes(dados), filetype='pdf') as pdf:
                self.assertIn('Meu controle', pdf[0].get_text())
        finally:
            for handle in self.driver.window_handles:
                if handle != principal:
                    self.driver.switch_to.window(handle)
                    self.driver.close()
            self.driver.switch_to.window(principal)
            self.driver.execute_script('URL.createObjectURL=window.urlOriginal;')

    def test_abrir_pdf_bloqueado_e_falha_fecha_aba(self):
        self.ui.pagina('checklist')
        self.driver.execute_script('''
            window.openOriginal=window.open;window.geradorOriginal=CPRelatorios.gerar;
            window.open=()=>null;
        ''')
        try:
            self.driver.find_element(By.CSS_SELECTOR, '[data-acao="abrir-pdf"]').click()
            self.ui.aguardar()
            self.assertIn('Permita pop-ups', self.driver.find_element(By.ID, 'mensagem').text)
            self.assertTrue(self.driver.find_element(By.ID, 'atualizar').is_enabled())
            self.driver.execute_script('''
                window.abaTeste={closed:false,document:{title:'',body:{}},close(){this.closed=true;}};
                window.open=()=>abaTeste;
                CPRelatorios.gerar=async()=>{throw new Error('Falha ao abrir PDF');};
            ''')
            self.driver.find_element(By.CSS_SELECTOR, '[data-acao="abrir-pdf"]').click()
            self.ui.aguardar()
            self.assertTrue(self.driver.execute_script('return abaTeste.closed;'))
            self.assertIn('Falha ao abrir PDF', self.driver.find_element(By.ID, 'mensagem').text)
            self.assertTrue(self.driver.find_element(By.ID, 'atualizar').is_enabled())
            self.assertIsNone(self.driver.execute_script('return window.pdfTeste;'))
        finally:
            self.driver.execute_script('window.open=window.openOriginal;CPRelatorios.gerar=window.geradorOriginal;')

    def test_falha_pdf_libera_loading_sem_alterar_dados(self):
        self.ui.pagina('pessoal')
        self.driver.execute_script('''
            window.geradorOriginal=CPRelatorios.gerar;
            CPRelatorios.gerar=async()=>{throw new Error('Falha simulada no PDF');};
            window.dbAntesPDF=JSON.stringify(mockDB);
        ''')
        try:
            self.driver.find_element(By.CSS_SELECTOR, '[data-acao="imprimir"]').click()
            self.ui.aguardar()
            self.assertIn('Falha simulada no PDF', self.driver.find_element(By.ID, 'mensagem').text)
            self.assertTrue(self.driver.find_element(By.ID, 'atualizar').is_enabled())
            self.assertTrue(self.driver.execute_script('return dbAntesPDF===JSON.stringify(mockDB);'))
            self.assertIsNone(self.driver.execute_script('return window.pdfTeste;'))
        finally:
            self.driver.execute_script('CPRelatorios.gerar=window.geradorOriginal;')


if __name__ == '__main__':
    unittest.main()
