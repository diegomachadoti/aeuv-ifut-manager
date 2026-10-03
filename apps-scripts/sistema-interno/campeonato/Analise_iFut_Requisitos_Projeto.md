# Análise funcional do iFut e especificação para um projeto pessoal

Data da análise: 03/10/2026.

## 1. Escopo e qualidade da evidência

Foram consultados o site institucional, a página do site personalizado, os termos, a política de privacidade, a descrição oficial do aplicativo e o portal público. No portal, foram abertas páginas da 7° Taça ACP de Futsal: tabela, estatísticas, suspensões, rankings, informações, calendário, times e elenco de uma equipe. O painel administrativo exibiu uma tela de login; não houve acesso autenticado, criação de conta ou teste de recursos pagos.

Este documento usa três níveis:

- **Observado:** interface pública aberta durante a análise. Confirma a existência do recurso e sua apresentação, mas não valida todo o processamento interno.
- **Anunciado:** recurso descrito pela empresa; funcionamento interno não testado.
- **Proposto:** requisitos, campos, algoritmos e critérios sugeridos para seu projeto. Não são afirmações sobre a implementação do iFut.

Não foi extraído código-fonte, esquema de banco, API privada ou algoritmo proprietário. A proposta abaixo é uma especificação própria baseada no comportamento público e nas funções anunciadas.

## 2. Avaliação do produto

O produto combina três necessidades: administrar uma competição, permitir que equipes cuidem de seus cadastros e divulgar resultados aos participantes. Sua proposta mais útil para um projeto pessoal é manter essas áreas usando os mesmos registros, evitando publicar tabela, elenco e cartões separadamente.

Pontos fortes observados: navegação do campeonato organizada por assunto; troca de categoria; agrupamento de jogos por data; indicadores esportivos; consulta disciplinar; acesso ao elenco e registro de quando os atletas se inscreveram.

Limites da avaliação: não foram testados cadastro, aprovação de inscrições, geração de jogos, correção de resultados, fechamento de súmula ou qualidade dos automatismos. A presença de uma tela de estatística não prova que todos os campeonatos preencham seus dados. Assistências e outras métricas apareciam com zero no exemplo consultado.

O ponto mais importante para seu projeto é a confiabilidade das regras: um placar corrigido precisa refletir na classificação; um cartão corrigido precisa refletir na suspensão; uma mudança de elenco não deve apagar a identificação de quem disputou uma partida anterior.

## 3. Inventário funcional e evidências

| Área | Recursos identificados | Evidência |
|---|---|---|
| Descoberta | Busca, filtros por estado e cidade, cartões de competições, paginação | Observado no portal |
| Campeonato | Categorias, fases, grupos e visão de classificação | Observado |
| Organização | Sorteio de grupos e jogos, inscrições por link | Anunciado na página principal |
| Equipes | Painel com credenciais para responsáveis | Anunciado |
| Cadastro | Campos de inscrição definidos pelo organizador, documentos | Descrito na política e anunciado |
| Jogos | Rodadas, resultados, agenda por data, partidas sem data e vagas a definir | Observado |
| Classificação | Pontos, jogos, vitórias, empates, derrotas, gols pró/contra, diferença e aproveitamento | Observado |
| Elenco | Atletas, data/hora de inscrição, abas de comissão, jogos e estatísticas | Elenco observado; demais abas identificadas |
| Desempenho | Gols, assistências, cartões, defesa difícil, jogador destaque, totais e médias | Observado |
| Ranking | Filtros por nome, time, categoria, pontuação e rodada | Observado |
| Disciplina | Suspensos, pendurados, jogos de suspensão; automatização e aplicação manual | Consulta observada; automatização anunciada |
| Operação | Árbitros, campos, impressão de súmula e anexo pós-jogo | Anunciado |
| Comunicação | Notícias, parceiros, artes, link de transmissão, seleção da rodada | Anunciado; entradas de navegação públicas observadas |
| Histórico | Base reutilizável de equipes/atletas e relatórios | Anunciado |
| Identificação | Carteirinha de atleta | Anunciado no plano personalizado |
| Distribuição | Site de competição, app Android/iOS, site personalizado | Anunciado; site público observado |
| Aplicativo | Histórico e estatísticas de times/atletas, favoritos e troca de categoria | Descrição e histórico oficial de versões; app não instalado |

## 4. Perfis e permissões — proposta

| Perfil | Pode fazer | Limite |
|---|---|---|
| Administrador do projeto | Criar organizações e atribuir acesso | Sem necessidade de planos comerciais no projeto pessoal |
| Organizador | Configurar campeonato, aprovar cadastros, publicar resultados e decisões | Apenas campeonatos sob sua gestão |
| Responsável pela equipe | Inscrever equipe, cadastrar elenco, anexar documentos, consultar pendências | Apenas equipes autorizadas |

IMPORTANTE: Aqui o perfil do sistema-interno Adm e Diretoria teria acesso Full e o associado teria acesso Responsável pela equipe somente sua equipe liberado acesso como ja tem hoje.

Um usuário pode ter mais de um papel. Autorizar pela combinação de usuário, organização, campeonato e equipe, verificando o acesso no servidor. Um árbitro cadastrado não precisa necessariamente ter conta: registro de pessoa e permissão de operação são coisas diferentes.

## 5. Especificação dos módulos

Todos os campos, fluxos e critérios de aceite desta seção são **propostas para implementar**, inclusive quando a função correspondente existe no iFut.

### F01 — Campeonato e identidade

**Finalidade:** centralizar cada edição de uma competição.

**Campos:** nome, edição/temporada, modalidade, cidade/estado, descrição, escudo, capa, organizador, datas, fuso horário, endereço público e visibilidade.

**Fluxo:** criar rascunho → configurar categorias e regulamento → abrir inscrições → organizar tabela → publicar → encerrar/arquivar.

**Regras:** usar identificador estável e endereço amigável; impedir nomes de endereço repetidos no mesmo contexto; não excluir histórico ao arquivar. Guardar datas de jogos com fuso e apresentar horário local consistente.

**Aceite:** criar e publicar uma edição sem misturar seus dados com outra; rascunhos não devem aparecer na busca pública.

### F02 — Categorias e regulamento

**Campos:** nome da categoria, critérios de elegibilidade, limite de equipes, mínimo/máximo de atletas, abertura/fechamento da inscrição, regulamento e versão das regras.

**Fluxo:** definir categoria → configurar regras → associar inscrições → consultar conteúdo filtrado por categoria.

**Regras:** idade deve ser calculada numa data de referência definida, não apenas na data atual. Versionar pontuação, desempates, suspensão e inscrição; mudanças após início exigem justificativa e registro.

**Aceite:** trocar categoria atualiza tabela, agenda, rankings e equipes; nenhuma estatística de outra categoria aparece por engano.

### F03 — Inscrição da equipe por link

**Campos:** equipe, responsável, contatos, categoria desejada e anexos definidos pelo organizador.

**Estados sugeridos:** rascunho, enviada, pendente, aprovada, rejeitada, cancelada.

**Fluxo:** abrir link → identificar responsável → preencher → enviar → receber pendências → corrigir → obter decisão.

**Regras:** impedir envio fora do prazo; detectar candidatura duplicada; equipe enviada não entra automaticamente na tabela se houver aprovação obrigatória.

**Aceite:** responsável acompanha a própria candidatura e o motivo de pendência; organizador dispõe de fila para revisão.

### F04 — Cadastro permanente da equipe e comissão

**Campos:** nome completo, nome curto, sigla, escudo, cidade, cores e responsáveis. Comissão: nome, função e vínculo com categoria/edição.

**Regras:** separar equipe permanente da participação numa edição. Alterar o escudo atual não precisa reescrever todas as artes ou súmulas já emitidas.

**Aceite:** reutilizar equipe em novo campeonato sem copiar manualmente todo o cadastro; manter o histórico de participações.

### F05 — Cadastro de atleta e inscrição no elenco

**Campos públicos sugeridos:** nome de exibição, apelido, foto opcional, posição e camisa. **Campos privados condicionais:** contato, nascimento, identificadores necessários e anexos.

**Fluxo:** localizar pessoa existente → revisar identidade → vincular à equipe e categoria → validar regras → submeter à organização.

**Regras:** a pessoa e sua inscrição são registros distintos. Validar vagas, prazo e elegibilidade. Se houver exclusividade por categoria, verificar outras inscrições ativas. Não usar telefone como chave permanente da pessoa; ele pode mudar.

**Aceite:** a mesma pessoa pode participar de edições diferentes sem perder histórico; inscrição fora da regra gera mensagem compreensível.

### F06 — Documentos e validação

**Campos:** tipo, arquivo, titular/inscrição, data de envio, situação, revisor e motivo de recusa.

**Fluxo:** enviar → analisar → aprovar ou pedir substituição → guardar versão.

**Regras:** definir formatos e tamanho; validar arquivo no servidor; restringir leitura aos responsáveis autorizados. Publicar uma foto esportiva não implica publicar um documento.

**Aceite:** visitante não consegue obter documento pela URL; rejeição mostra o motivo ao responsável.

### F07 — Grupos e sorteio

**Campos:** participantes aprovados, quantidade de grupos, vagas, cabeças de chave e restrições opcionais.

**Fluxo:** selecionar participantes → visualizar distribuição → sortear → revisar → confirmar/publicar.

**Regras:** cada inscrição entra exatamente uma vez; registrar participantes, resultado e data do sorteio. Reexecutar após publicação exige uma versão nova, não uma substituição silenciosa.

**Aceite:** nenhum time fica duplicado ou esquecido; grupos respeitam os limites configurados.

### F08 — Geração de confrontos e fases

**Formatos propostos:** pontos corridos, grupos, mata-mata e combinação de grupos com eliminatórias. O inventário público não determina todos os formatos suportados internamente pelo iFut.

**Implementação:** para todos contra todos, usar algoritmo circular; para número ímpar, incluir folga. Gerar mandos de ida/volta quando aplicável. Em eliminatórias, representar vagas como referências à classificação ou ao vencedor de outro jogo.

**Regras:** separar geração de confrontos de agendamento. Não regenerar automaticamente jogos que já tenham resultados. Tratar vagas livres e definição de cruzamentos.

**Aceite:** quatro equipes produzem seis confrontos num turno; cinco produzem dez, com folgas; final recebe os vencedores corretos.

### F09 — Agenda, locais e arbitragem

**Campos da partida:** categoria, fase, grupo/rodada, mandante, visitante, horário, local, arbitragem e estado.

**Fluxo:** distribuir jogos em horários → detectar conflitos → revisar → publicar → reagendar com justificativa.

**Regras:** impedir sobreposição da mesma equipe, local ou árbitro; usar duração prevista e intervalo. Deixar horário/local ainda indefinidos é um estado válido.

**Aceite:** filtrar agenda por equipe/categoria; mostrar partidas sem data; alteração preserva confronto e histórico.

### F10 — Partida, resultado e eventos

**Estados propostos:** agendada, em andamento, interrompida, adiada, encerrada, homologada, cancelada e W.O.

**Eventos:** gol, gol contra, assistência, amarelo, expulsão, defesa difícil e destaque; outros podem ser extensões configuráveis.

**Campos do evento:** partida, equipe, inscrição do atleta, tipo, período/minuto, valor, autor do lançamento e revisão.

**Regras:** validar participação do atleta; separar gols de pênaltis de desempate do placar esportivo. Distinguir vermelho direto de expulsão após segundo amarelo. Permitir placar sem todos os autores dos gols, marcando estatística incompleta; não inventar eventos para fechar a conta.

**Aceite:** placar 2×1 homologado atualiza classificação; correção para 1×1 recalcula os dois times sem duplicar jogos.

### F11 — Classificação e avanço

**Colunas:** posição, equipe, pontos, jogos, vitórias, empates, derrotas, gols pró, contra, saldo e aproveitamento.

**Cálculo proposto:** pontos = vitórias × valor da vitória + empates × valor do empate + derrotas × valor da derrota + ajustes disciplinares. Saldo = gols pró − gols contra. Aproveitamento = pontos esportivos ÷ pontos máximos possíveis × 100; definir se punições devem afetar esse indicador.

**Regras:** ordem configurável de desempates; confronto direto precisa de definição para empates entre três ou mais equipes. Definir quais estados contam, como W.O. afeta gols e se há classificação geral entre grupos. Grupo com tamanhos diferentes pode exigir comparação proporcional.

**Aceite:** tabela reproduz um conjunto conhecido de resultados e critérios; ajustes de pontos têm motivo e autoria; avanço só acontece após resultados homologados.

### F12 — Cartões, suspensões e pendurados

**Campos da regra:** limite de amarelos, punição por expulsão, política de segundo amarelo, escopo, zeragem por fase e condições de cumprimento.

**Campos da suspensão:** inscrição, origem, motivo, quantidade de jogos, início, situação e partidas em que foi cumprida.

**Fluxo:** homologar cartão → verificar gatilho → registrar suspensão → verificar elegibilidade → cumprir jogos válidos → liberar.

**Regras:** folga não equivale a cumprir suspensão. Definir tratamento de adiamento, cancelamento e W.O. Usar ordem efetiva das partidas para atrasados. Contadores e suspensão não devem depender exclusivamente do número da rodada.

**Aceite:** sob uma regra de três amarelos, segundo gera pendurado e terceiro gera punição; a duração e o destino dependem da configuração. Corrigir um cartão recalcula penalidades e sinaliza eventual efeito em partida já disputada.

### F13 — Súmula antes e depois do jogo

**Pré-jogo:** gerar documento com identificação, equipes, atletas elegíveis, comissão, arbitragem e espaços de assinatura/ocorrências.

**Pós-jogo:** preencher resultado/eventos/ocorrências e anexar documento digitalizado; revisar e homologar.

**Regras:** conservar a versão de elenco usada naquele jogo. Anexo não substitui automaticamente lançamento estruturado. Revisões posteriores devem ter número, data e responsável.

**Aceite:** documento legível para impressão; atleta irregular é sinalizado; edição atual não apaga versão homologada anterior.

### F14 — Estatísticas e rankings

**Visões:** totais da competição, por categoria, por time e por atleta; médias por jogo; ranking geral e por rodada.

**Fluxo:** calcular com dados homologados → filtrar categoria/time/nome/período → abrir detalhe.

**Regras:** diferenciar zero confirmado de dado não coletado. Separar ranking de uma métrica, como gols, de nota composta de desempenho.

**Nota composta proposta:** soma de quantidade de eventos × pesos configurados, com fórmula divulgada e versionada. Não se conhece a fórmula proprietária do iFut.

**Aceite:** ranking de gols soma os eventos corretos; filtro por rodada respeita o agrupamento escolhido; correção de evento altera total e posição.

### F15 — Perfis e histórico

**Equipe:** identidade, elenco da edição, comissão, jogos e indicadores. **Atleta:** identificação esportiva, participações, estatísticas e jogos.

**Regras:** histórico por inscrição e por pessoa, preservando equipe/categoria de origem. Atleta transferido não leva seus gols antigos para a nova equipe.

**Aceite:** total pessoal considera participações autorizadas; perfil da equipe mostra somente seus respectivos eventos.

### F16 — Portal público e busca

**Telas:** diretório de competições e página do campeonato com tabela, calendário, estatísticas, times, rankings, campos, notícias e informações.

**Busca:** nome, estado e cidade; paginação. Categoria deve ser contexto persistente durante a navegação.

**Regras:** respeitar visibilidade no servidor; retornar somente campos públicos; usar estados vazios para calendário, notícias e anexos ainda não preenchidos.

**Aceite:** visitante encontra competição publicada, consulta resultados no celular e não acessa conteúdo reservado.

### F17 — Notícias, regulamento, parceiros e transmissão

**Notícia:** título, resumo, conteúdo, imagem, publicação e autoria. **Parceiro:** nome, logo, link, período e ordem de exibição. **Transmissão:** URL vinculada à partida.

**Regras:** validar URLs; oferecer rascunho e publicação; mostrar versão/data do regulamento. Link de transmissão não significa hospedagem ou transmissão de vídeo própria.

**Aceite:** notícia publicada aparece no campeonato; parceiro vencido pode ser ocultado; jogo com link permite assistir na plataforma externa.

### F18 — Artes e seleção da rodada

**Artes propostas:** confronto, placar e tabela; modelo alimentado com dados oficiais, escudos e patrocinadores.

**Seleção:** escolher atletas elegíveis para cada posição e rodada, com modo editorial ou fórmula explicitada. O método de escolha do iFut não foi verificado.

**Regras:** permitir formatos quadrado e vertical; não gerar seleção definitiva antes da conclusão dos jogos considerados.

**Aceite:** arte mostra data, local e equipes corretas; edição do resultado exige regenerar ou marcar arte anterior como desatualizada.

### F19 — Carteirinha

**Campos propostos:** foto, nome de exibição, equipe, categoria, edição, identificador e validade. QR code pode apontar para verificação de elegibilidade.

**Regras:** QR não deve expor documentos privados; carteirinha emitida não substitui verificação atual de suspensão.

**Aceite:** impressão legível; consulta valida situação atual e informa expiração.

### F20 — Relatórios e exportação

**Relatórios propostos:** inscritos, documentos pendentes, jogos, cartões, suspensões, atletas e resultados. Exportar CSV para dados tabulares e PDF para documentos.

**Regras:** aplicar filtros e permissões também na exportação; identificadores pessoais só entram quando necessários ao operador autorizado.

**Aceite:** relatório e tela usam os mesmos critérios; exportação indica categoria, período e horário de geração.

### F21 — Experiência móvel e favoritos

**Proposta inicial:** site responsivo, com possibilidade posterior de PWA; separar criação de campeonato de acompanhamento do atleta.

**Recursos:** favoritos, atalhos de equipe, histórico e troca de categoria. Notificações de mudança de jogo e resultado são extensões propostas, não confirmadas nesta análise.

**Aceite:** tabela e calendário funcionam em tela estreita; favorito persiste entre sessões do mesmo usuário. PWA e app nativo não são equivalentes em todas as capacidades.

### F22 — Personalização e limites comerciais

**Proposta:** identidade por organizador, página reunindo suas competições e domínio próprio opcional. Se houver intenção comercial, controlar limites e acesso a módulos por organização.

**Regras:** não espalhar verificações de plano em cada tela; centralizar permissões de recurso no servidor. Pagamento do plano da plataforma e cobrança de inscrição das equipes são processos distintos.

**Aceite:** mudança de plano preserva dados e informa quais ações ficam disponíveis. Para uso pessoal, começar sem assinatura, cobrança ou app próprio.

## 6. Modelo de dados — proposta independente

| Entidade | Conteúdo e relação |
|---|---|
| Organização | Liga/organizador e identidade visual |
| Usuário / permissão | Identidade de acesso e papéis com escopo |
| Campeonato | Edição vinculada à organização |
| Categoria / regra versionada | Divisão da edição e seus parâmetros |
| Equipe / responsável | Cadastro reutilizável e acesso à equipe |
| Participação da equipe | Relação equipe–categoria com situação de inscrição |
| Atleta | Pessoa, independente da equipe atual |
| Inscrição do atleta | Relação pessoa–participação, número, posição, situação e datas |
| Comissão | Pessoas e funções vinculadas à participação |
| Documento | Arquivo privado, inscrição, versão e revisão |
| Fase / grupo / rodada | Organização esportiva da categoria |
| Partida / vaga de confronto | Jogo e referências a participantes ainda indefinidos |
| Local / árbitro / escala | Cadastros operacionais e atribuições por partida |
| Evento de partida | Gol, cartão e outros fatos vinculados à inscrição |
| Súmula / revisão | Registro oficial e anexos por versão |
| Suspensão / cumprimento | Penalidade e partidas que descontam seu saldo |
| Ajuste de classificação | Decisão de pontos com motivo |
| Notícia / parceiro / arte | Conteúdo editorial e divulgação |
| Auditoria | Quem alterou o quê, quando e por quê |

Separações essenciais: pessoa ≠ inscrição; equipe ≠ participação; confronto ≠ agendamento; placar ≠ eventos; pontos ≠ nota de desempenho; documento anexado ≠ súmula estruturada.

## 7. Consistência e processamento

Ao homologar uma súmula, validar estado, atletas e eventos; salvar alteração e auditoria em transação; atualizar classificação, estatísticas e disciplina; publicar o resultado. Se houver tarefas assíncronas, usar uma fila transacional para não perder atualizações.

Operações precisam ser idempotentes: clicar duas vezes em homologar não registra dois gols ou duas punições. Uma revisão deve substituir a contribuição anterior, não acrescentar tudo novamente. Conservar registros de origem para recalcular projeções.

Na fase inicial, é viável recalcular classificação e totais a partir das partidas válidas. Quando houver escala maior, usar projeções e invalidação de cache, mantendo capacidade de reconstrução.

Não automatizar avanço irreversível enquanto jogos de origem estiverem pendentes. Correção em fase já avançada deve gerar conflito a resolver, preservando partidas posteriores.

## 8. Menu sugerido

**Organizador:** visão geral; campeonatos; categorias/regras; inscrições; equipes/atletas; documentos; grupos/fases; jogos; locais/arbitragem; súmulas; disciplina; estatísticas; conteúdo; relatórios; acesso/auditoria.

**Responsável pela equipe:** minhas equipes; campeonatos; inscrições; elenco; comissão; documentos/pendências; jogos; disciplina.

**Público:** encontrar campeonato; tabela; calendário; times; estatísticas; ranking; locais; notícias; regulamento/informações.

## 9. Ordem de implementação

| Entrega | Escopo | Por que vem nessa ordem |
|---|---|---|
| 1 — Base utilizável | Acesso, campeonato, categoria, regras, equipes, inscrições de atletas | Define identidade e elegibilidade |
| 2 — Operação esportiva | Grupos/confrontos, agenda, resultado, classificação e portal público | Permite realizar e acompanhar competição |
| 3 — Controle | Eventos, cartões, suspensão, súmula, documentos e auditoria de decisões | Dá confiabilidade à operação |
| 4 — Participação das equipes | Painel de times, envio por link, revisão e relatórios | Reduz trabalho manual do organizador |
| 5 — Divulgação | Notícias, parceiros, artes, seleção e carteirinha | Amplia apresentação e engajamento |
| 6 — Evolução opcional | Favoritos, PWA/app, notificações, personalização e comercialização | Depende do uso real do projeto |

No MVP, cadastros podem ser feitos pelo organizador, mas a auditoria mínima e as restrições de acesso devem existir desde o primeiro dia. Ao introduzir lançamento de cartões, entregar a regra disciplinar correspondente no mesmo ciclo.

## 10. Verificações de aceite prioritárias

1. Isolar campeonatos, categorias e equipes nas permissões.
2. Impedir inscrição duplicada quando a regra exigir exclusividade.
3. Gerar confrontos com número par e ímpar sem repetições indevidas.
4. Detectar choque de time/local/árbitro na agenda.
5. Aplicar e desfazer contribuição de um resultado corrigido.
6. Tratar gol contra e disputa por pênaltis sem inflar artilharia.
7. Distinguir vermelho direto e segundo amarelo conforme regulamento.
8. Cumprir suspensão pelo jogo válido definido, inclusive com partida adiada.
9. Guardar versão de elenco e súmula anterior à transferência do atleta.
10. Impedir publicação e exportação de documentos privados.
11. Repetir homologação sem duplicar dados.
12. Exibir dados ausentes de forma diferente de estatística zero confirmada.

## 11. Recursos não confirmados e decisões abertas

Não foram confirmados: Pix de inscrição, gestão de caixa, pagamentos de arbitragem, chat interno, emissão fiscal, biometria, integração com federações, sincronização offline ou transmissão de vídeo própria. Podem ser módulos futuros, mas não devem ser apresentados como funcionalidades extraídas do iFut.

Ainda precisam ser definidos para seu projeto: modalidades iniciais; quantidade de organizadores; regras esportivas; política de inscrição e transferências; modo de homologação; necessidade de documentos; público-alvo; tecnologias já usadas; necessidade de funcionamento offline.

Não há evidência pública suficiente para reproduzir exatamente: fórmula de ranking, escolha da seleção da rodada, algoritmo de sorteio, todos os critérios de desempate ou regras de zeragem de cartões. Implemente essas regras explicitamente e torne-as configuráveis.

## 12. Fontes

- Site institucional e lista de recursos: https://www.ifut.com.br/
- Site personalizado e recursos adicionais: https://www.ifut.com.br/plano-site-personalizado
- Definição de campos, aplicações e visibilidade: https://www.ifut.com.br/privacidade
- Configuração e responsabilidade por automatismos: https://www.ifut.com.br/termos
- Descrição e histórico oficial do aplicativo: https://apps.apple.com/br/app/ifut/id1389984816
- Portal consultado: https://campeonato.ifut.com.br/
- Torneio consultado na navegação: https://campeonato.ifut.com.br/c/7-taca-acp-de-futsal
- Entrada do painel administrativo: https://admin.ifut.com.br/

As fontes confirmam o inventário e os limites indicados. Os campos, fluxos, modelo de dados, critérios de aceite e ordem de desenvolvimento são uma proposta original para o projeto pessoal.
