# Publicação imutável e histórico inline de relatórios financeiros

A mudança mantém o PDF financeiro em `downloads/financeiro` e acrescenta publicação imediata e imutável no Drive, com retry independente pela CLI. A implementação separa falha local de falha remota parcial, usa UUID e hashes para reconciliar retries e expõe no sistema interno somente os metadados dos 20 relatórios mais recentes. A tela destaca o último relatório, recolhe os anteriores e conserva o controle de ocultação de valores. Os dois bloqueios da passagem anterior — homônimo divergente não detectado e token vazio aceito — foram corrigidos.

**Watch for:** **confirmed** — o smoke visual em navegador real (desktop, mobile, tema escuro e foco) continua pendente para a implantação autorizada; é acompanhamento não bloqueante, pois a regressão automatizada do olho e os smokes DOM/VM foram registrados como aprovados.

**Verdict**: APPROVED

## High-level view

`main.py` só publica depois de receber o caminho do PDF, retorna `1` para erro local e `2` quando o arquivo ficou salvo mas o Drive falhou. No modo `exemplo`, cada publicação ocorre antes da geração seguinte.

A escrita financeira não usa o upsert mutável de notas e regulamentos. UUID, SHA-256, MD5 para legados, lock local e reconciliação antes/depois da criação impedem que retries sequenciais sobrescrevam conteúdo ou escolham duplicatas silenciosamente.

O Apps Script abre diretamente `FINANCEIRO_RELATORIOS_PASTA_ID`, depois da autorização e sem consultar a raiz. O RPC pagina metadados mínimos, invalida buscas incompletas e tokens inválidos e devolve no máximo 20 links construídos no servidor.

A lista tem loading, vazio e erro independentes dos lançamentos e ignora respostas obsoletas. O olho continua mascarando cartões, tabela, campos e modal por `sessionStorage`, sem mascarar metadados dos relatórios.

<details>
<summary>Issues (1)</summary>

1. **Smoke visual de implantação pendente — confirmed** — validar em navegador real o layout desktop/mobile, tema escuro, foco e a interação do olho após o deploy autorizado; este acompanhamento não bloqueia a entrega validada localmente.

</details>

<details>
<summary>Details</summary>

## Códigos de saída e exclusividade cobrem geração e retry

A validação em `main.py` inclui `--publicar-relatorio-financeiro` no conjunto de modos de topo. Filtros financeiros sem geração também são rejeitados antes dos branches, portanto retry, geração, filtros e outras ações não podem ser combinados silenciosamente.

`ErroPublicacaoRelatorio` é o único erro convertido em falha parcial `2`; arquivo inválido, configuração local inválida e falha de geração retornam `1`. No modo `exemplo`, falhas remotas são acumuladas sem impedir as emissões restantes, enquanto falha local interrompe o lote.

## Identidade, hashes e reconciliação mantêm o relatório imutável

A validação de existência, tamanho, assinatura e nome, junto do cálculo de SHA-256/MD5, ocorre antes da autenticação. Relatórios novos recebem UUID no nome e `aeuvArtifact`, `aeuvEmissionId` e `aeuvSha256` no Drive.

A correção desta passagem cruza a busca por identidade com a busca por nome tanto no retry quanto depois da criação. Qualquer homônimo além do item esperado falha como `duplicidade`; SHA-256 divergente também falha, e legados só são reutilizados quando `md5Checksum` prova igualdade. Nenhum desses caminhos atualiza, remove ou sobrescreve bytes.

O lock atômico ao lado do PDF serializa o mesmo caminho no host com espera limitada. A documentação explicita que hosts distintos dependem da reconciliação remota.

## Raiz explícita sem regressão dos publicadores legados

`PublicadorDrive.__init__` preserva os quatro parâmetros posicionais e recebe raiz/nome financeiro como opções keyword-only. Somente relatórios exigem a raiz explícita; regulamentos continuam usando `raiz_id()`, e notas continuam na pasta de súmulas pelo envio legado.

A autenticação não interativa é opt-in. O financeiro usa `permitir_reautorizacao=False`, convertendo token ausente, ilegível, sem refresh ou inválido em erro de credencial sem abrir navegador; os fluxos antigos mantêm o default interativo.

## Subpasta canônica e contrato autorizado do Apps Script

`pastaRelatoriosFinanceiros_()` exige a Script Property administrativa, abre diretamente esse ID e valida acesso, nome e lixeira sem usar `CONFIG.pastaRaizId`, descobrir pasta por nome ou gravar propriedade durante requisição de usuário. Assim, acesso de Leitor pode ser concedido somente à subpasta.

`listarRelatoriosFinanceiros()` autoriza antes de Drive I/O e devolve apenas `{nome, tipo, publicadoEm, url}`, `limite` e `temMais`. A correção anterior agora diferencia ausência de `nextPageToken`, que encerra a consulta, de campo presente vazio, não textual ou repetido, que invalida toda a resposta; `incompleteSearch === true` também impede retorno parcial.

## Histórico inline preserva o olho financeiro

A seção fica abaixo da barra de ações e antes dos filtros, com `role="status"` e `aria-live="polite"`; o último item é destacado e os itens 2–20 ficam em `<details>`. Dados são escapados e links usam `target="_blank" rel="noopener"`.

O contador próprio evita callbacks obsoletos. Retry afeta apenas relatórios, e “Atualizar” faz uma consulta de relatórios e uma de lançamentos sem duplicar a RPC na remontagem.

IDs, SVGs, ARIA, chave de `sessionStorage`, seletores monetários e sincronizações do olho permanecem presentes em cartões, linhas, campo e modal. A lista não recebe marcadores de valor. **confirmed:** falta apenas o smoke em navegador real de desktop/mobile, tema escuro e foco após implantação autorizada.

## Evidência registrada e preservação do trabalho local

A nota registra compilação Python, sintaxe do Apps Script, 431 testes Node, smokes Python/VM para CLI, autenticação, hashes, duplicatas, paginação, UI e olho, e `git diff --check`. A suíte Python e `main.py --help` ficaram bloqueados pela ausência de `PIL` e `requests` no Python 3.14 disponível; conforme solicitado, não foram repetidos. Smokes posteriores cobriram especificamente os dois reparos da revisão anterior.

As alterações não commitadas anteriores continuam no worktree, `.agents` permanece não rastreado e `controle_punicoes.py` segue sem diff.

</details>

<details>
<summary>File map</summary>

- `main.py` — geração, upload, retry, exclusividade e códigos `0/1/2`.
- `financeiro_pdf.py` — tipos válidos e nomes com microssegundos/UUID.
- `drive_auth.py` — autenticação não interativa opt-in.
- `publicacao_drive.py` — validação, hashes, lock e reconciliação.
- `apps-scripts/sistema-interno/WebApp.gs` — subpasta canônica e RPC autorizado.
- `apps-scripts/sistema-interno/Index.html` — último/histórico e olho financeiro.
- `config.ini` e `config.example.ini` — raiz, pasta e exemplo sanitizado.
- `README.md`, `apps-scripts/README.md` e `COMANDOS.md` — operação, permissões, retry e falha parcial.
- `controle_punicoes.py` — sem alteração no diff.
- `.agents/tasks/plan.md` e `.agents/tasks/design.md` — contrato e evidência.

Full diff: `git diff -- main.py controle_punicoes.py financeiro_pdf.py drive_auth.py publicacao_drive.py apps-scripts/sistema-interno/WebApp.gs apps-scripts/sistema-interno/Index.html config.ini config.example.ini README.md apps-scripts/README.md COMANDOS.md`

</details>
