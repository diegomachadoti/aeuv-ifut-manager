# Ofício / requerimento de autorização à Futel

Gerador local em `oficio_pdf.py`, integrado ao `main.py`. Usa logo, fontes,
cores, rodapé e assinatura do Presidente do mesmo `LayoutPdf` dos regulamentos.
Não faz upload, não altera compartilhamento e não protocola o pedido.

## Criar, editar e gerar novamente

Na raiz do projeto, em PowerShell:

```powershell
python main.py --criar-modelo-oficio "oficio-requerimento/oficio-futel-001-2026.txt"
python main.py --gerar-pdf-oficio "oficio-requerimento/oficio-futel-001-2026.txt"
```

O primeiro comando **não sobrescreve** um TXT existente. Edite o TXT em formato
INI (`[seção]`, `campo = valor`), preservando os nomes dos campos. Para continuar
um texto na linha seguinte, inicie a continuação com espaços. Comentários
começam com `#`. Os valores podem conter acentos, `%` e URLs.

O segundo comando cria/atualiza, ao lado do TXT:

- `oficio-futel-001-2026.pdf`;
- `oficio-futel-001-2026.pendencias.txt`, com resumo de dados/anexos pendentes,
  prazo, documentação posterior e verificações antes do protocolo.

O PDF é sempre gerado como **versão final, sem marca d'água ou aviso de rascunho,
com a assinatura do Presidente ao final**, mesmo com campos ou anexos pendentes.
As pendências continuam no arquivo `.pendencias.txt` e no log para revisão antes
do protocolo. Logo e assinatura configuradas em `[pdf]` precisam estar disponíveis;
se faltarem, o gerador avisa em vez de emitir sem timbre ou assinatura. Datas e
formato inválidos continuam sendo recusados.

Os anexos são apresentados em tabelas **Documento / Acesso**, com alinhamento à
esquerda e linhas alternadas. Links reais usam rótulos curtos clicáveis “Abrir
documento” ou “Abrir pasta”; a URL completa fica no TXT e no destino do link.
Links provisórios aparecem como “A disponibilizar” sem um hyperlink inválido.
Substitua os IDs no TXT e execute o mesmo comando para atualizar o PDF.

As opções `--oficio-final` (main.py) e `--final` (oficio_pdf.py) continuam aceitas
por compatibilidade, mas não mudam a emissão: ela já é sempre final e assinada.
Essa imagem não equivale a assinatura eletrônica certificada; conferir o formato
de assinatura aceito pela Futel.

Alternativa sem carregar as dependências do fluxo iFut:

```powershell
python oficio_pdf.py --criar-modelo "oficio-requerimento/novo-oficio.txt"
python oficio_pdf.py --gerar-pdf "oficio-requerimento/novo-oficio.txt" --config config.ini
```

## Dados iniciais confirmados

- Ofício nº **001/2026**, emissão **09/10/2026**, conforme informado pelo solicitante.
- CNPJ AEUV: **67.645.389/0001-01**.
- **7ª Super Liga União 2026**, futebol de campo, 20 equipes, 4 grupos de 5,
  5 rodadas na primeira fase e fases eliminatórias conforme a forma de disputa V3.
- Competição começa em **25/10/2026**; uso solicitado dos poliesportivos começa
  em **01/11/2026**, com término previsto em **20/12/2026**.
- Locais definidos semanalmente pela própria Futel. Na V3, as partidas em
  poliesportivos começam às 15h; 3º lugar/final estão previstos às 8h/10h em
  locais a confirmar. Isso não é declaração de reserva desses campos.
- Até 1.000 pessoas distribuídas entre os jogos; entrada gratuita.
- Sem montagem/desmontagem de equipamentos extras.
- Sem execução musical e sem venda de alimentos: ECAD e alvará sanitário são
  omitidos do PDF, mas as condições ficam editáveis no TXT.
- Telefone e e-mail foram obtidos em `https://www.aeuv.org/`; revisar antes do protocolo.
- Nome e cargo do Presidente seguem a configuração existente do projeto.

Finalidade baseada nos objetivos públicos da AEUV: esporte, bem-estar,
desenvolvimento de atletas/equipes, integração e inclusão social. Características
e cronograma foram conferidos na forma de disputa V3. O modelo é uma base
editável, não reimporta mudanças futuras do regulamento ou da tabela: revisar
também o TXT do ofício quando essas fontes mudarem.

## Exigências mapeadas do documento Word

Fonte: `Futel.EspaçoPublico.doc`, art. 3º do Decreto Municipal nº 11.768/2009.

| Fase | Documentos / informações |
| --- | --- |
| Requerimento — item 1 | Papel timbrado com CNPJ, endereço e telefone; denominação, finalidade, modalidade, características, público, montagem/desmontagem, representante legal e ingresso; regulamento, reportagens e folders para evento esportivo |
| Associação — item 2.2 | CNPJ; estatuto registrado e alterações + ata de eleição atual; RG/documento com foto, CPF e comprovante de endereço do Presidente; certidões federal, estadual, municipais da entidade e do dirigente; CRF/FGTS; CNDT; procuração, se houver |
| Esportivos — itens 2.3.1 e 2.3.2 | Inscrições de equipes/atletas, tabela de jogos, súmulas, pontuação/classificação, resultados finais e reportagens. O subitem 2.3.3.1 permite apresentá-los após o evento |
| Após assinatura do termo — item 3 | Alvará municipal de eventos; ECAD se houver música; alvará da Infância/Juventude se houver entrada de crianças/adolescentes; alvará sanitário se houver venda de alimentos |

Para associação, usa-se o item **2.2.3** (estatuto + ata de eleição), sem exigir
contrato social de empresa ou documentos de pessoa física requerente. Os documentos
posteriores continuam no checklist como obrigações da fase correspondente. A definição da
entrada de menores deve ser respondida no TXT para selecionar o anexo aplicável.

## Pendências e cuidados

1. **Endereço completo da associação** e **nome do contato responsável**.
2. **Entrada de crianças/adolescentes**: responder `sim` ou `nao` em `[condicoes]`.
3. Substituir os IDs provisórios dos anexos em `[anexos]` após o upload. Se não
   houver reportagens ou algum outro documento, confirmar com a Futel como
   tratar a exigência, sem presumir dispensa.
4. O documento exige antecedência mínima de **40 dias**. De 09/10 a 01/11 são
   **23 dias**. O alinhamento em reunião foi registrado, mas não declara dispensa
   formal: confirmar seu tratamento no protocolo.
5. Confirmar o formato de entrega: os links são um mapa de acesso e **não
   substituem automaticamente cópias/anexos** exigidos pela Futel.
6. O gerador valida preenchimento e estrutura HTTPS, **não acessa nem verifica
   autenticidade, conteúdo, validade ou permissões** dos documentos remotos.
7. Documentos pessoais do Presidente devem ter acesso restrito aos destinatários
   autorizados. Nunca torná-los públicos para facilitar o link do PDF.

## Testes

```powershell
python -m unittest discover -s tests -p "test_oficio_pdf.py" -v
```
