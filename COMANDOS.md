# Comandos do Projeto AEUV — Guia Rápido

Execute na raiz do projeto. Substitua os nomes/caminhos entre aspas pelos seus.

- **Windows:** use o Python da `.venv` ativada ou troque `python` por `.\.venv\Scripts\python.exe`.
- **Linux:** troque `python` por `./.venv/bin/python`.
- PDFs são atualizados ao regenerar.
- Criação de modelos **NÃO** sobrescreve TXTs existentes.

## 1. Preparação e ajuda

```bash
python -m pip install -r requirements.txt
```

Instala as dependências no ambiente Python atual.

```bash
python main.py --help
```

Lista opções do comando principal; `-h` também funciona.

```bash
python SCRIPT.py --help
```

Mostra a ajuda de cada script com CLI listado na seção 9.

## 2. Inscrições / remoções / portabilidade no iFut

```bash
python main.py
```

Fluxo completo: baixa TXT, processa no iFut, move arquivos e publica resultados.

```bash
python main.py --sync-drive-only
```

Somente baixa os TXT de entrada do Drive; não processa no iFut.

```bash
python main.py --process-local-only
```

Processa os TXT já baixados, sem novo download; pode mover/publicar no Drive.

```bash
python main.py --login-only
```

Sincroniza o Drive, faz login no iFut e encerra.

```bash
python main.py --login-only --process-local-only
```

Testa somente o login no iFut, sem sincronizar o Drive.

```bash
python main.py --update-all-team-counts
```

Atualiza a contagem de atletas dos times na planilha; sincroniza entrada antes.

```bash
python main.py --update-all-team-counts --process-local-only
```

Atualiza a mesma contagem sem o download inicial dos TXT.

## 3. Súmulas / notas oficiais / punições

```bash
python main.py --analisar-sumulas
```

Baixa e analisa súmulas por regras; gera notas TXT/PDF e atualiza punições.

```bash
python main.py --analisar-sumulas --process-local-only
```

Analisa súmulas já baixadas; ainda pode mover arquivos/publicar controle no Drive.

```bash
python main.py --analisar-sumulas --ia
```

Analisa com IA; envia regulamento/relato ao provedor configurado.

```bash
python main.py --analisar-sumulas --process-local-only --ia
```

Usa IA nas súmulas locais, sem novo download.

```bash
python main.py --gerar-pdf-nota 5
```

Regera nota pelo número, atualiza punições e publica a nota se finalizada.

```bash
python main.py --gerar-pdf-nota "SUM-PROTOCOLO"
```

Regera a nota correspondente ao protocolo da súmula.

```bash
python main.py --gerar-pdf-nota "caminho/NOTA OFICIAL.txt"
```

Regera pelo TXT editado; notas pendentes permanecem rascunhos sem assinatura.

```bash
python main.py --atualizar-controle-punicoes
```

Reconstrói TXT/PDF de punições pelas notas e publica o controle no Drive.

## 4. Regulamento / forma de disputa / publicação

```bash
python main.py --gerar-pdf-regulamento "regulamento/regulamento-7-super-liga-união-2026"
```

Gera o PDF assinado do regulamento e publica no Drive.

```bash
python main.py --gerar-pdf-forma-disputa "formadisputa/forma-disputa-7-super-liga-união-2026-5-rodadasV3"
```

Gera o PDF assinado da forma de disputa/tabela e publica no Drive.

```bash
python main.py --publicar-drive
```

Publica regulamentos, formas de disputa e notas finalizadas (não ofícios/filiação).

## 5. Ofício / requerimento à FUTEL

```bash
python main.py --criar-modelo-oficio "oficio-requerimento/novo-oficio.txt"
```

Cria uma cópia editável do modelo de ofício, sem sobrescrever.

```bash
python main.py --gerar-pdf-oficio "oficio-requerimento/oficio-futel-001-2026.txt"
```

Gera PDF final assinado e checklist `.pendencias.txt`; não envia ao Drive.

```text
--oficio-final
```

Opção antiga com `--gerar-pdf-oficio`; aceita, mas o PDF já é sempre final.

## 6. Filiação / plano de associado / documentos livres

```bash
python main.py --criar-modelos-filiacao
```

Cria os quatro TXTs padrão em `filiacao/`; recusa se já existirem.

```bash
python main.py --criar-modelos-filiacao "filiacao/equipe-nova"
```

Cria ficha, certificado, recibo e plano editáveis na pasta indicada.

```bash
python main.py --gerar-pdf-filiacao
```

Gera os quatro PDFs padrão; equivale a `--gerar-pdf-filiacao todos`.

```bash
python main.py --gerar-pdf-filiacao todos
```

Regera ficha, certificado, recibo e Plano de Associado em `filiacao/`.

```bash
python main.py --gerar-pdf-filiacao ficha
```

Regera ficha + termo, com espaço para assinatura do representante da equipe.

```bash
python main.py --gerar-pdf-filiacao certificado
```

Regera certificado com assinatura do Presidente da AEUV.

```bash
python main.py --gerar-pdf-filiacao recibo
```

Regera recibo com assinatura do Presidente da AEUV.

```bash
python main.py --gerar-pdf-filiacao plano
```

Regera o Plano de Associado público, sem assinatura pessoal.

```bash
python main.py --gerar-pdf-filiacao "filiacao/equipe-nova/recibo-filiacao.txt"
```

Regera um documento de filiação por caminho do TXT.

```bash
python main.py --gerar-pdf-documento "caminho/documento.txt"
```

Gera qualquer documento livre no padrão AEUV; cabeçalho INI + texto após `---`.

```bash
python main.py --gerar-pdf-documento "caminho/doc1.txt" "caminho/doc2.txt"
```

Gera vários documentos livres numa execução.

Todos os comandos desta seção são locais, sem rascunho ou validação de pagamento.

## 7. Relatórios financeiros

```bash
python main.py --gerar-pdf-financeiro
```

Gera relatório geral lendo a planilha financeira do Drive.

```bash
python main.py --gerar-pdf-financeiro geral
```

Mesmo relatório geral, com tipo explícito.

```bash
python main.py --gerar-pdf-financeiro competicao --origem "SUPER LIGA UNIÃO"
```

Gera relatório da competição/origem informada.

```bash
python main.py --gerar-pdf-financeiro emenda --emenda "Emenda 042/2026"
```

Gera relatório da emenda/termo informado.

```bash
python main.py --gerar-pdf-financeiro exemplo
```

Gera três relatórios demonstrativos com dados fictícios locais.

```bash
python main.py --gerar-pdf-financeiro "caminho/lancamentos.json"
```

Gera relatório com os dados do JSON, sem ler a planilha.

```bash
python main.py --publicar-relatorio-financeiro "downloads/financeiro/relatorio-financeiro-geral-AAAAMMDD-HHMMSS-microssegundos-uuid32.pdf"
```

Repete somente o upload de um PDF já gerado, sem alterar ou apagar o arquivo local. Retorna `0` em sucesso/reutilização, `1` em falha local e `2` em falha remota parcial.

```text
--periodo 3m
```

Filtro opcional de período: `hoje`, `mes`, `3m`, `6m` ou `anual`.

Aliases: `today`; `mes_atual`/`mes-atual`; `3meses`/`trimestre`; `6meses`/`semestre`; `ano`/`12m`/`1ano`.

```text
--data-inicio 01/01/2026 --data-fim 31/12/2026
```

Filtros opcionais por datas, em DD/MM/AAAA ou AAAA-MM-DD; evite misturar com `--periodo`.

```text
--origem "NOME" / --emenda "NUMERO"
```

Selecionam competição ou emenda; também definem o tipo se omitido/geral.

Não combine filtros ou qualquer outro modo com `--publicar-relatorio-financeiro`. Cada geração concluída mantém o PDF em `downloads/financeiro` e tenta publicá-lo em `AEUV - Automação/Relatorios Financeiros`; falha remota preserva o local.

## 8. Configuração opcional

```text
--config "config.ini"
```

Seleciona configuração; disponível em todas as CLIs Python deste guia.

```text
--selectors "selectors.ini"
```

Seleciona os seletores Selenium; somente `main.py`.

Adicione essas opções ao final do comando escolhido; não existe flag `--dry-run`.

## 9. Alternativas diretas dos scripts Python

```bash
python regulamento_pdf.py "ARQUIVO" --titulo "SUBTÍTULO"
```

Gera apenas o PDF local do regulamento; **NÃO** publica no Drive como `main.py`.

```bash
python forma_disputa_pdf.py "ARQUIVO" --titulo "SUBTÍTULO"
```

Gera apenas o PDF local da forma de disputa; `--titulo` é opcional nos dois scripts.

```bash
python nota_pdf.py "ALVO"
```

Regera a nota por número, protocolo ou TXT; atualiza punições/publica a final.

```bash
python resultado_pdf.py
```

Regera o PDF local do resultado de inscrição mais recente.

```bash
python resultado_pdf.py "ALVO"
```

Regera resultado por caminho, nome/trecho ou protocolo do arquivo.

```bash
python resultado_pdf.py --todos
```

Regera PDFs de todos os resultados locais existentes.

```bash
python sumula_disciplinar.py
```

Executa a mesma análise disciplinar de `--analisar-sumulas`.

```bash
python sumula_disciplinar.py --process-local-only --ia
```

Analisa súmulas locais com IA; ambas as opções podem ser usadas separadamente.

```bash
python oficio_pdf.py --criar-modelo "oficio-requerimento/novo-oficio.txt"
```

Cria o TXT de ofício local.

```bash
python oficio_pdf.py --gerar-pdf "oficio-requerimento/oficio-futel-001-2026.txt"
```

Gera ofício assinado e checklist local; `--final` é apenas compatibilidade antiga.

```bash
python documento_pdf.py --criar-modelos-filiacao "filiacao/equipe-nova"
```

Cria os quatro modelos; a pasta é opcional, padrão `filiacao/`.

```bash
python documento_pdf.py --gerar-pdf-filiacao plano
```

Gera por tipo ou TXT; sem tipo, gera todos; aceita ficha/certificado/recibo/plano/todos.

```bash
python documento_pdf.py --gerar-pdf-documento "doc1.txt" "doc2.txt"
```

Gera um ou mais documentos livres locais.

## 10. Testes e diagnósticos

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

Executa os testes Python locais.

```bash
python -m unittest discover -s tests -p "test_documento_pdf.py" -v
```

Testa documentos livres, filiação e Plano de Associado.

```bash
python -m unittest discover -s tests -p "test_oficio_pdf.py" -v
```

Testa ofício Futel, anexos, assinatura e edição.

```bash
node --test "apps-scripts/sistema-interno/performance/*.test.cjs"
```

Executa os testes locais do sistema interno; requer Node.js.

```bash
node --test "apps-scripts/sistema-interno/performance/atas-pdf.test.cjs"
```

Testa o layout e os marcadores do PDF das atas.

```bash
node apps-scripts/sistema-interno/performance/analisar-har.cjs "captura.har" "ETIQUETA" > metricas.json
```

Analisa localmente uma captura HAR; não faz chamadas ao Google.

```bash
node apps-scripts/sistema-interno/performance/executar-consultas.cjs "apps-scripts/sistema-interno/performance/config.local.json" > metricas.json
```

Mede consultas **REAIS** ao Apps Script; requer configuração privada, Node.js e curl.

Mais detalhes: [`apps-scripts/sistema-interno/performance/README.md`](apps-scripts/sistema-interno/performance/README.md).

## Atenção

- `--process-local-only` evita download inicial, mas **NÃO** garante ausência de escrita remota.
- `dry_run` é configurado no INI; não impede remoções, publicação/movimentação no Drive ou planilha.
- `--ia` envia dados ao provedor configurado e pode gerar cobrança conforme o serviço.
- Certificados/recibos livres não comprovam aprovação/pagamento automaticamente; conferir antes de emitir.
- Não compartilhar credenciais, tokens, `config.local.ini/json`, HAR ou documentos pessoais.
- Atas e outros aplicativos web são usados pela interface; não há CLI Python para exportar suas atas.
- `benchmark.js` é usado no console do navegador, conforme seu README; não é um comando Node de terminal.
- Módulos auxiliares sem CLI: `financeiro_pdf.py`, `financeiro_planilha.py`, `controle_punicoes.py`, `publicacao_drive.py`, `drive_auth.py` e `sumula_ia.py`. Use os comandos de `main.py` acima.
