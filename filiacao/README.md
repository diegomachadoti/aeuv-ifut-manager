# Documentos de filiação de equipes — AEUV

Quatro documentos reutilizáveis, baseados na ata de 07/10/2026 sobre o Plano de
Associado. Todos usam o padrão dos PDFs AEUV: logo, cabeçalho, seções azuis,
rodapé numerado e assinatura quando aplicável. Não há modo de rascunho ou validação de
aprovação/pagamento; o conteúdo é livre e editável.

## Arquivos para editar

| Documento | TXT editável | Assinatura |
| --- | --- | --- |
| Ficha de filiação + termo de responsabilidade | `filiacao/ficha-filiacao.txt` | Manual, pelo presidente / representante legal da equipe |
| Certificado de filiação | `filiacao/certificado-filiacao.txt` | Imagem do Presidente da AEUV configurada em `[pdf]` |
| Recibo da taxa anual | `filiacao/recibo-filiacao.txt` | Imagem do Presidente da AEUV configurada em `[pdf]` |
| Plano de Associado para divulgação | `filiacao/plano-associado.txt` | Sem assinatura pessoal; apresentação pública institucional |

Os modelos originais ficam em `filiacao/modelos/`. As primeiras cópias editáveis
e seus PDFs foram gerados em `filiacao/`. Edite as cópias, preservando os originais
para próximos cadastros.

Os modelos atuais da ficha e do plano têm duas páginas; certificado e recibo
têm uma página cada. Textos maiores podem acrescentar páginas automaticamente.

## Regenerar PDFs após editar

Na raiz do projeto, em PowerShell:

```powershell
# Os quatro documentos
python main.py --gerar-pdf-filiacao todos

# Apenas um documento
python main.py --gerar-pdf-filiacao ficha
python main.py --gerar-pdf-filiacao certificado
python main.py --gerar-pdf-filiacao recibo
python main.py --gerar-pdf-filiacao plano
```

Cada PDF é salvo ao lado do TXT, com o mesmo nome, e atualizado a cada geração.
O fluxo é local: não publica CPF/RG no Drive, não realiza pagamento e não cadastra
ou aprova uma filiação no sistema interno.

## Criar um conjunto para outra equipe

```powershell
python main.py --criar-modelos-filiacao "filiacao/equipe-nova"
```

Esse comando cria os quatro TXTs nessa pasta, **sem sobrescrever arquivos existentes**.
Depois de preenchê-los:

```powershell
python main.py --gerar-pdf-documento "filiacao/equipe-nova/ficha-filiacao.txt" "filiacao/equipe-nova/certificado-filiacao.txt" "filiacao/equipe-nova/recibo-filiacao.txt"
```

Para criar as cópias padrão em uma instalação nova:

```powershell
python main.py --criar-modelos-filiacao
```

Não execute esse comando para regenerar PDFs: as cópias padrão já existem e
serão preservadas. Use `--gerar-pdf-filiacao`.

## Plano de Associado para divulgar

O arquivo `plano-associado.pdf` apresenta o plano às equipes interessadas:
benefícios, taxa anual inicial/renovação, pré-requisitos, vínculo exclusivo,
documentação, desligamento apenas quando aplicável, etapas de filiação e canais
de contato. Não contém dados pessoais de dirigentes nem comprova uma filiação.
Recursos e emendas são apresentados como perspectivas, sem garantia de repasse.

Edite `filiacao/plano-associado.txt`: em `[dados]` ficam `taxa_inicial`,
`taxa_renovacao`, `email`, `site` e `instagram`; após `---`, todo o texto é livre.
As variáveis reutilizam esses valores na apresentação. Depois, regenere:

```powershell
python main.py --gerar-pdf-filiacao plano
```

O modelo original está em `filiacao/modelos/plano-associado.txt`. O plano foi
configurado com `tipo = nenhuma` em `[assinatura]`, adequado para divulgação,
sem divulgar a imagem da assinatura pessoal do Presidente. Esse campo também
pode ser alterado, se desejado.

## Como editar o TXT

Antes da linha `---`, o arquivo tem seções:

- `[documento]`: título, subtítulo, cabeçalho, rodapé e assunto do PDF.
- `[assinatura]`: `tipo = presidente`, `manual` ou `nenhuma`; linha de data e,
  para assinatura manual, nome e cargo do signatário.
- `[dados]`: informações da equipe, representante, exercício, datas e valores.

Depois de `---`, fica o **texto livre**. É possível alterar, excluir ou acrescentar
parágrafos. Campos como `{{equipe}}` recebem o valor de `equipe` em `[dados]`,
evitando repetir a alteração em todo o documento. Se acrescentar uma variável,
adicione também seu valor em `[dados]`. Campos com sublinhados são espaços de
preenchimento; não impedem a geração e não criam marca de rascunho.

Formatação disponível no texto livre:

| Marcador | Resultado |
| --- | --- |
| `* TÍTULO` no início da linha | Faixa azul-escura com texto branco |
| `> Subtítulo` no início da linha | Caixa azul-clara com texto azul |
| `- Item` no início da linha | Tópico com marcador |
| `**trecho**` | Negrito azul, ou branco dentro de faixa escura |
| Tabela Markdown com linhas `\| ... \|` | Tabela formatada, com cabeçalho repetido nas páginas |
| `=== PAGINA ===` | Quebra de página manual |
| `# Comentário` | Comentário editorial, não impresso |

Metadados e campos usam formato INI: para continuar um valor em outra linha,
inicie a continuação com espaços. O corpo após `---` não precisa de indentação.
Não são aceitas instruções HTML arbitrárias; o texto é escapado pelo gerador.

## Taxas e condições da ata

- Taxa **anual por equipe**: **R$ 150,00 no primeiro ano** e **R$ 100,00 nas
  renovações anuais seguintes**.
- A equipe não pode manter vínculo simultâneo com outra associação varzeana.
- Dirigentes e representantes legais de outra associação varzeana não são
  admitidos como atletas ou comissão nas equipes associadas, conforme a ata.
- Comprovação autenticada ou emitida/assinada digitalmente do desligamento
  **somente se a equipe tiver vínculo anterior**; não é requisito para todas.
- Ficha cadastral, relação da diretoria/comissão com nome, cargo, CPF e RG,
  termo de responsabilidade, documento pessoal e comprovante de endereço do
  presidente da equipe.
- Análise administrativa/jurídica → aprovação/cobrança → pagamento confirmado
  → certificado e recibo.
- Visibilidade, organização, transparência e busca de recursos/emendas futuras;
  não há promessa de repasse financeiro garantido.

O período de vigência e o exercício ficam em branco para preencher conforme a
filiação aprovada; a ata não define se a validade coincide com o ano civil ou
com 12 meses a partir da filiação. Não foi criada regra automática para isso.

### Recibo de renovação

Em `[dados]` de `recibo-filiacao.txt`, altere:

```ini
tipo_filiacao = Renovação anual
valor = 100,00
valor_extenso = cem reais
```

Preencha também equipe, pagador, exercício, número do recibo, datas, forma de
pagamento e referência do comprovante. Emita recibos apenas de pagamentos
efetivamente recebidos e certificados apenas de filiações aprovadas: **o gerador
não consulta nem valida essas informações**. Certificado/recibo em branco são
modelos, não comprovam filiação ou recebimento de uma equipe específica.

## Outros documentos livres

É possível copiar um TXT, alterar seu título e corpo e gerar outro documento:

```powershell
python main.py --gerar-pdf-documento "caminho/documento-livre.txt"
```

Alternativa sem carregar o fluxo iFut:

```powershell
python documento_pdf.py --gerar-pdf-filiacao todos
python documento_pdf.py --gerar-pdf-documento "caminho/documento-livre.txt" --config config.ini
```

Não há novas dependências; usa ReportLab e Pillow já presentes no projeto.
Logo e assinatura seguem `[pdf]` de `config.ini` / `config.local.ini`.

## Testes

```powershell
python -m unittest discover -s tests -p "test_documento_pdf.py" -v
```
