# Revisão do design — relatórios financeiros no Drive

## Achados

1. **MEDIUM — O contrato de construção de `PublicadorDrive` não foi atualizado para receber a nova raiz, embora a classe atual seja acoplada à pasta de súmulas.** Em **Configuração e pasta** e **Autenticação e publicação Python**, o design diz que a publicação lerá `[drive] root_folder_id`, mas só especifica que `PublicadorDrive.carregar(...)` ganhará `permitir_reautorizacao`. No código real, `PublicadorDrive.__init__(credenciais, folder_embed_url, oauth=False, logger=None)` exige `[sumulas] folder_embed_url`, grava `pasta_sumulas_id` e deriva a raiz por `raiz_id()`. Sem uma assinatura e uma regra de compatibilidade concretas, há várias implementações possíveis: continuar carregando súmulas desnecessariamente, trocar a raiz global e quebrar notas/regulamentos, ou criar um segundo caminho de construção parcialmente duplicado. **Correção concreta:** definir as assinaturas e a origem de cada campo, preservando os chamadores legados, por exemplo:
   ```python
   @classmethod
   def carregar(cls, config_path: Path, logger=None, *, permitir_reautorizacao=True):
       # lê uma vez config.ini + config.local.ini
       # mantém folder_embed_url para notas/regulamentos
       # passa root_folder_id opcional para o construtor

   def __init__(self, credenciais, folder_embed_url: str, *, root_folder_id: str | None = None,
                oauth: bool = False, logger=None): ...
   ```
   e declarar que `publicar_relatorio_financeiro()` exige `root_folder_id` explícito, enquanto `raiz_id()` inferido continua apenas nos fluxos legados. Incluir teste de regressão provando que notas/regulamentos ainda usam a raiz inferida atual.

2. **MEDIUM — A fronteira entre arquivo local inválido e falha operacional remota não possui exceções nem mapeamento de saída definidos.** Em **Autenticação e publicação Python**, a validação de caminho/tamanho/assinatura/nome ocorre dentro do helper “estrito”; em **Orquestração CLI**, todo `ErroPublicacaoRelatorio` vira parcial `2`; porém o critério 5 exige que entrada inválida de `--publicar-relatorio-financeiro` termine em `1`. Também não está definido o que acontece se uma geração bem-sucedida retornar um caminho que falhe nessas validações. A expressão “erro do ReportLab” tampouco identifica uma exceção capturável. **Correção concreta:** separar os tipos e o mapeamento:
   ```python
   class ErroArquivoRelatorio(ValueError): pass       # caminho, tamanho, assinatura, regex -> exit 1
   class ErroPublicacaoRelatorio(RuntimeError): ...   # credencial/config/rede/API após local válido -> exit 2
   ```
   `publicar_relatorio_financeiro()` deve validar e lançar `ErroArquivoRelatorio` antes de autenticar. O orquestrador deve mapear explicitamente `ErroArquivoRelatorio`, `ValueError` e `OSError` para `1`, e somente `ErroPublicacaoRelatorio` para `2`; exceções inesperadas propagam. Para ReportLab, definir que qualquer exceção escapada por `gerar_pdf_financeiro` é falha local `1` (com `logger.exception`) ou enumerar os tipos reais a capturar.

3. **MEDIUM — A exclusividade do novo modo CLI cobre apenas geração financeira e filtros, não os demais modos já independentes do parser.** Em **Orquestração CLI e falha parcial**, as duas validações propostas ainda permitem, por exemplo, `--publicar-relatorio-financeiro arquivo.pdf --publicar-drive`, `--gerar-pdf-nota ...` ou `--atualizar-controle-punicoes`. O `main.py` real resolve ações por uma sequência de `if`, portanto uma dessas operações será ignorada silenciosamente conforme a posição do novo branch. **Correção concreta:** colocar todas as ações de topo em um único `argparse` mutually exclusive group, ou definir uma função `validar_modo_exclusivo_(args)` que conte os modos (`publicar_relatorio_financeiro`, `gerar_pdf_financeiro`, `publicar_drive`, gerações de outros documentos etc.) e chame `parser.error` quando houver mais de um. Manter a validação separada que proíbe filtros financeiros no retry e adicionar ao menos um teste de combinação com um modo não financeiro.

4. **MEDIUM — O modelo de permissão declarado para o Apps Script é incompatível com a revalidação obrigatória do pai da pasta.** Em **Premissas explícitas**, o design exige de cada usuário apenas leitura da pasta de relatórios. Em **Descoberta e contrato no Apps Script**, até o ID em cache só é aceito após confirmar que `CONFIG.pastaRaizId` é pai; se isso exigir enumerar/abrir o pai, um usuário com compartilhamento direto apenas na subpasta não consegue revalidar e o fallback `pastaRaizProjeto_()` também falha. O comportamento real de `pastaRegulamentos_()` evita justamente depender da raiz quando existe ID cacheado, por causa de usuários com acesso somente à subpasta. **Correção concreta:** escolher um modelo. A opção simples é alterar a premissa e o README para exigir acesso de Leitor à raiz `AEUV - Automação` (herdado pela subpasta), com erro explícito quando só a subpasta está compartilhada. Se acesso direto à subpasta deve funcionar, não dependa de um Script Property global descoberto por outro usuário: configure um ID canônico da pasta e valide pelo próprio ID/nome/lixeira, documentando como o vínculo à raiz é verificado por administrador fora da requisição de leitura.

5. **MEDIUM — O algoritmo de idempotência é `list` seguido de `create` e não sustenta a promessa não qualificada de que retry não cria duplicata.** Em **Nome, identidade e duplicatas**, duas execuções concorrentes do mesmo arquivo/UUID podem ambas observar zero itens e criar dois arquivos; `appProperties` não impõe unicidade no Drive. O design exclui colisão aleatória de UUID entre máquinas, mas não exclui concorrência do mesmo retry e afirma que identidade duplicada bloqueia escrita. **Correção concreta:** explicitar que publicação concorrente da mesma identidade não é suportada e serializar localmente com lock documentado quando todas as execuções compartilham host, ou adicionar uma estratégia de reconciliação pós-criação: reconsultar por `aeuvEmissionId`, manter deterministicamente um item apenas se a política permitir excluir o recém-criado e retornar erro operacional quando houver mais de um. Se exclusão automática permanece fora de escopo, então a garantia deve ser reduzida para retries sequenciais e o critério 7 deve dizer isso expressamente; o teste deve cobrir essa fronteira.

6. **MEDIUM — “Reutilizado” pode ser retornado para bytes locais diferentes sob a mesma identidade, sem detectar a colisão inconsistente prometida.** Em **Nome, identidade e duplicatas**, um item remoto com o mesmo UUID e nome é aceito como retry concluído sem enviar ou comparar bytes. Como o arquivo local pode ter sido substituído mantendo o nome, o comando pode reportar sucesso e URL de um PDF remoto diferente daquele solicitado. A consulta/criação especificada nem solicita `md5Checksum`. **Correção concreta:** vincular identidade ao conteúdo: calcular SHA-256 local antes da rede, gravá-lo em uma propriedade (`aeuvSha256`) na criação e exigir igualdade no retry; para legados, comparar `md5Checksum` remoto com MD5 local quando disponível. Divergência deve lançar `ErroPublicacaoRelatorio(categoria='duplicidade', ...)` sem update. Alternativamente, declarar explicitamente que o nome é a única identidade e que conteúdo alterado sob o mesmo nome é responsabilidade do operador, removendo a alegação de detectar toda inconsistência e ajustando os critérios 3 e 7 — opção menos segura.

## Verified Assumptions

- A função geradora real é `financeiro_pdf.gerar_pdf_financeiro(filtro, lancamentos, config, saida=None, logger=None) -> Path`. O sucesso local ocorre somente depois de `SimpleDocTemplate.build(...)` retornar, seguido do log de sucesso e de `return saida`.
- No `main.py` atual, os ramos planilha e JSON guardam esse retorno em `pdf_path`; o modo `exemplo` faz três chamadas e ignora os três retornos. A integração imediatamente após cada retorno é o ponto correto.
- O nome legado atualmente produzido é `relatorio-financeiro-<tipo>-<AAAAMMDD-HHMMSS>.pdf`; a regex proposta o aceita.
- `PublicadorDrive.carregar()` já centraliza a obtenção de credenciais em `drive_auth.credenciais_drive(...)`; `drive_auth.py` usa OAuth quando o arquivo cliente existe e conta de serviço como fallback. O modo não interativo proposto requer alteração desse helper, mas não exige novo cliente, escopo ou credencial.
- `publicacao_drive.py` atualmente infere a raiz pelo pai de `[sumulas] folder_embed_url`, cria subpastas apenas com OAuth e faz upsert mutável por nome com `pageSize=1`. O caminho financeiro imutável precisa ser separado sem alterar essa semântica legada.
- A seção `[drive]` existe no `config.ini`, mas ainda não possui `root_folder_id` nem `financial_reports_folder_name`. O ID proposto, `1uDUmgEjeISQ1W3Uc5hcUc25pgXDvVhs3`, coincide com `CONFIG.pastaRaizId` no `WebApp.gs`.
- `requirements.txt` confirma `google-api-python-client==2.171.0`, `google-auth==2.40.3` e ReportLab; `appsscript.json` confirma V8, Advanced Drive Service v3, escopo Drive e execução como `USER_ACCESSING`.
- O módulo financeiro real está liberado somente para `admin` e `diretoria`; `moduloLiberado_('financeiro', perfil)` é adequado para autorização do novo RPC.
- O olho já existente em `Index.html` usa `sessionStorage`, `[data-valor-financeiro]`, `[data-campo-valor-financeiro]`, `aria-label`, `aria-pressed`, ícones e sincronização depois das renderizações. Como a seção proposta mostra apenas metadados e links, ela não deve receber `data-valor-financeiro`; preservar e testar os pontos atuais atende ao requisito sem mascarar nomes/datas de relatórios.
- A escolha de UX — último relatório destacado e até 19 anteriores em lista recolhível inline — é coerente com os metadados realmente disponíveis (`name`, `modifiedTime`, tipo derivado do nome e ID para URL). Usar “publicado” em vez de “gerado” é correto para uploads de legados.

## Unverified/Wrong Assumptions

- **Não especificada:** a classe atual não recebe `root_folder_id`; o design ainda não define como a nova raiz entra em `PublicadorDrive` sem afetar os fluxos existentes.
- **Errada sem limitação adicional:** consulta seguida de criação não impede duplicata em retries concorrentes; UUID e `appProperties` não fornecem restrição única no Drive.
- **Errada:** igualdade de UUID e nome não demonstra igualdade de conteúdo; sem hash, um local alterado pode ser reportado como já publicado.
- **Não verificada:** que usuários com acesso somente à subpasta consigam consultar/revalidar o pai via `DriveApp`. O padrão real de Regulamentos evita essa dependência, e o design deve escolher explicitamente o modelo de compartilhamento.
- **Não verificável pelo repositório:** existência atual e unicidade de `AEUV - Automação/Relatorios Financeiros`, permissões/cota da identidade Python e compartilhamento efetivo com todos os usuários. Essas condições precisam de smoke test autenticado.
- **Não definida:** a regra sintática de “formato inválido” para `root_folder_id` citada no critério 8. No mínimo, a implementação deve exigir valor não vazio após `strip()` e caracteres de ID do Drive (`^[A-Za-z0-9_-]+$`), sem impor comprimento fixo não documentado pela API.

## Veredito mecânico

Há 0 achados HIGH, 6 MEDIUM e 0 NIT. Portanto, o veredito é `CHANGES_REQUESTED`.
