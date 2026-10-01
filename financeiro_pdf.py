"""Gerador do PDF de Relatorio Financeiro e Prestacao de Contas no padrao visual AEUV.

Suporta 3 modelos de relatorio:
1. GERAL: Prestacao de contas geral para assembleia e associados (visão completa com saldo consolidado).
2. EMENDA: Prestacao de contas formal para Emendas Impositivas e orgaos publicos (com termo de fomento,
   CNPJs/CPFs dos favorecidos, numero de notas fiscais/recibos, discriminacao analitica e links de comprovantes).
3. COMPETICAO: Prestacao de contas focada em uma competicao especifica (equilibrio financeiro: taxas vs custos).

Todos os relatorios incluem:
- Cabecalho institucional oficial (Logo, CNPJ, Razao Social, Titulo e Periodo)
- Data e hora de geracao
- Tabela de lancamentos estilizada (Entradas em verde, Saidas em vermelho, comprovantes clicaveis)
- Resumo consolidado (Total Entradas, Total Saidas, Saldo do Periodo)
- Rodape oficial com numeracao de pagina e bloco com assinatura digitalizada do Presidente.
"""

from __future__ import annotations

import argparse
import configparser
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, date
from pathlib import Path
from xml.sax.saxutils import escape

from nota_pdf import (
    AZUL,
    AZUL_CLARO,
    CINZA,
    VERMELHO,
    DEFAULT_CONFIG_PATH,
    LOGGER,
    ConfigPdf,
    LayoutPdf,
)

PASTA_RELATORIOS = Path("downloads") / "financeiro"


def parse_data_flexivel(data_str: str) -> date | None:
    """Converte strings de datas em formatos variados para date."""
    if not data_str:
        return None
    val = data_str.strip().split(" ")[0].split("T")[0]
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            continue
    return None


@dataclass
class LancamentoFinanceiro:
    id_lancamento: str
    data_movimentacao: str
    tipo: str  # "Entrada" ou "Saída"
    origem: str  # Nome da competicao ou "Geral / Administrativo"
    categoria: str
    descricao: str
    valor: float
    favorecido_pagador: str = ""
    documento: str = ""  # NF, Recibo, Chave PIX, etc.
    id_transacao_bancaria: str = ""  # Conciliacao com extrato da conta
    emenda: str = ""  # Nº da emenda ou termo de fomento
    comprovante_url: str = ""
    responsavel: str = ""

    @property
    def eh_entrada(self) -> bool:
        return self.tipo.strip().lower() in ("entrada", "receita", "credito")

    @property
    def valor_formatado(self) -> str:
        sinal = "+" if self.eh_entrada else "-"
        return f"{sinal} R$ {abs(self.valor):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


@dataclass
class FiltroRelatorio:
    tipo_relatorio: str  # "geral", "emenda", "competicao"
    titulo: str = ""
    subtitulo: str = ""
    periodo_inicio: str = ""
    periodo_fim: str = ""
    competicao: str = ""
    numero_emenda: str = ""
    orgao_concedente: str = ""
    responsavel_emissao: str = ""


def formatar_moeda(valor: float) -> str:
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def carregar_dados_exemplo() -> list[LancamentoFinanceiro]:
    """Retorna lista representativa de lancamentos para testes e demonstracao."""
    return [
        LancamentoFinanceiro(
            id_lancamento="FIN-2026-001",
            data_movimentacao="15/01/2026",
            tipo="Entrada",
            origem="Geral / Administrativo",
            categoria="Repasse Público / Emenda Impositiva",
            descricao="Repasse Emenda Impositiva 042/2026 - Apoio ao Futebol Varzeano",
            valor=25000.00,
            favorecido_pagador="Secretaria Municipal de Esportes e Lazer",
            documento="Termo de Fomento 008/2026",
            id_transacao_bancaria="TED 001.99283-1",
            emenda="Emenda 042/2026",
            comprovante_url="https://drive.google.com/open?id=exemplo_termo_fomento",
            responsavel="diretoria@aeuv.org",
        ),
        LancamentoFinanceiro(
            id_lancamento="FIN-2026-002",
            data_movimentacao="05/02/2026",
            tipo="Entrada",
            origem="SUPER LIGA UNIÃO",
            categoria="Taxa de Inscrição / Participação",
            descricao="Taxa de inscrição 20 equipes participantes",
            valor=6000.00,
            favorecido_pagador="Equipes Participantes Super Liga",
            documento="Comprovantes PIX Diversos",
            id_transacao_bancaria="Lote PIX 2026-02-05",
            emenda="",
            comprovante_url="https://drive.google.com/open?id=exemplo_pix_equipes",
            responsavel="financeiro@aeuv.org",
        ),
        LancamentoFinanceiro(
            id_lancamento="FIN-2026-003",
            data_movimentacao="10/02/2026",
            tipo="Saída",
            origem="SUPER LIGA UNIÃO",
            categoria="Material Esportivo e Bolas",
            descricao="Aquisição de 30 bolas Penalty oficiais e redes de campo",
            valor=4850.00,
            favorecido_pagador="Esporte Total Artigos Esportivos LTDA (CNPJ 12.345.678/0001-90)",
            documento="NF-e 004.821",
            id_transacao_bancaria="PIX E1234567820260210001",
            emenda="Emenda 042/2026",
            comprovante_url="https://drive.google.com/open?id=exemplo_nf_bolas",
            responsavel="compras@aeuv.org",
        ),
        LancamentoFinanceiro(
            id_lancamento="FIN-2026-004",
            data_movimentacao="22/02/2026",
            tipo="Saída",
            origem="SUPER LIGA UNIÃO",
            categoria="Arbitragem e Mesários",
            descricao="Pagamento da escala de arbitragem da 1ª Rodada (10 partidas)",
            valor=2200.00,
            favorecido_pagador="Associação dos Árbitros de Uberlândia (CNPJ 98.765.432/0001-11)",
            documento="Recibo de Arbitragem 2026-R1",
            id_transacao_bancaria="TRANSF 9821-4",
            emenda="Emenda 042/2026",
            comprovante_url="https://drive.google.com/open?id=exemplo_recibo_arbitragem",
            responsavel="arbitragem@aeuv.org",
        ),
        LancamentoFinanceiro(
            id_lancamento="FIN-2026-005",
            data_movimentacao="28/02/2026",
            tipo="Saída",
            origem="SUPER LIGA UNIÃO",
            categoria="Premiação e Troféus",
            descricao="Fabricação de troféus e medalhas personalizadas da competição",
            valor=3150.00,
            favorecido_pagador="Troféus Uberlândia EIRELI (CNPJ 33.222.111/0001-44)",
            documento="NF-e 001.294",
            id_transacao_bancaria="PIX E3322211120260228001",
            emenda="Emenda 042/2026",
            comprovante_url="https://drive.google.com/open?id=exemplo_nf_trofeus",
            responsavel="diretoria@aeuv.org",
        ),
        LancamentoFinanceiro(
            id_lancamento="FIN-2026-006",
            data_movimentacao="05/03/2026",
            tipo="Entrada",
            origem="COPA AMERICA",
            categoria="Taxas de Portabilidade / Transferência",
            descricao="Taxas de transferência de atletas fora do prazo",
            valor=450.00,
            favorecido_pagador="Atletas Solicitantes",
            documento="Comprovantes PIX Individuais",
            emenda="",
            comprovante_url="https://drive.google.com/open?id=exemplo_pix_portabilidades",
            responsavel="secretaria@aeuv.org",
        ),
    ]


def gerar_pdf_financeiro(
    filtro: FiltroRelatorio,
    lancamentos: list[LancamentoFinanceiro],
    config: ConfigPdf,
    saida: Path | None = None,
    logger: logging.Logger | None = None,
) -> Path:
    """Gera o documento PDF oficial da prestacao de contas no padrao AEUV."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        HRFlowable,
        KeepTogether,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    log = logger or LOGGER

    # Filtra lancamentos caso especificado
    itens = list(lancamentos)
    if filtro.tipo_relatorio == "competicao" and filtro.competicao:
        itens = [i for i in itens if filtro.competicao.lower() in i.origem.lower()]
    elif filtro.tipo_relatorio == "emenda" and filtro.numero_emenda:
        itens = [i for i in itens if filtro.numero_emenda.lower() in i.emenda.lower()]

    # Filtro opcional por intervalo de data (periodo_inicio e periodo_fim)
    dt_inicio = parse_data_flexivel(filtro.periodo_inicio) if filtro.periodo_inicio else None
    dt_fim = parse_data_flexivel(filtro.periodo_fim) if filtro.periodo_fim else None

    if dt_inicio or dt_fim:
        def data_no_intervalo(l: LancamentoFinanceiro) -> bool:
            d = parse_data_flexivel(l.data_movimentacao)
            if not d:
                return True
            if dt_inicio and d < dt_inicio:
                return False
            if dt_fim and d > dt_fim:
                return False
            return True

        itens = [i for i in itens if data_no_intervalo(i)]

    # Calculos totais
    total_entradas = sum(i.valor for i in itens if i.eh_entrada)
    total_saidas = sum(i.valor for i in itens if not i.eh_entrada)
    saldo_final = total_entradas - total_saidas

    # Paisagem (landscape) garante largura perfeita para tabelas analiticas de prestacao de contas
    layout = LayoutPdf.criar(config, logger=log, paisagem=True)
    tamanho_pagina = layout.tamanho_pagina
    margem = 1.5 * cm
    largura_util = tamanho_pagina[0] - (2 * margem)

    PASTA_RELATORIOS.mkdir(parents=True, exist_ok=True)
    if saida is None:
        agora_str = datetime.now().strftime("%Y%m%d-%H%M%S")
        nome_arq = f"relatorio-financeiro-{filtro.tipo_relatorio}-{agora_str}.pdf"
        saida = PASTA_RELATORIOS / nome_arq

    # Estilos de texto
    estilo_titulo = ParagraphStyle(
        "FinTitulo",
        parent=layout.base,
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor(AZUL),
        alignment=TA_CENTER,
    )
    estilo_sub = ParagraphStyle(
        "FinSub",
        parent=layout.base,
        fontSize=10,
        leading=13,
        textColor=colors.HexColor(CINZA),
        alignment=TA_CENTER,
    )
    estilo_meta = ParagraphStyle(
        "FinMeta",
        parent=layout.base,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#222222"),
    )
    estilo_cel_cab = ParagraphStyle(
        "FinCelCab",
        parent=layout.base,
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
    estilo_cel_esq = ParagraphStyle(
        "FinCelEsq",
        parent=layout.base,
        fontSize=7.5,
        leading=9.5,
        alignment=TA_LEFT,
    )
    estilo_cel_cent = ParagraphStyle(
        "FinCelCent",
        parent=layout.base,
        fontSize=7.5,
        leading=9.5,
        alignment=TA_CENTER,
    )
    estilo_cel_val_verde = ParagraphStyle(
        "FinValVerde",
        parent=layout.base,
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1E7B34"),
        alignment=TA_RIGHT,
    )
    estilo_cel_val_verm = ParagraphStyle(
        "FinValVerm",
        parent=layout.base,
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor(VERMELHO),
        alignment=TA_RIGHT,
    )

    elementos: list[object] = []

    # 1. Cabecalho do Relatorio
    titulos_map = {
        "geral": "DEMONSTRATIVO FINANCEIRO E PRESTAÇÃO DE CONTAS",
        "emenda": "PRESTAÇÃO DE CONTAS - EMENDA IMPOSITIVA / TERMO DE FOMENTO",
        "competicao": f"PRESTAÇÃO DE CONTAS - {filtro.competicao.upper() or 'COMPETIÇÃO'}",
    }
    titulo_doc = filtro.titulo or titulos_map.get(filtro.tipo_relatorio, "RELATÓRIO FINANCEIRO")
    elementos.append(Paragraph(escape(titulo_doc), estilo_titulo))
    elementos.append(Spacer(1, 4))

    sub_periodo = f"Período de Apuração: {filtro.periodo_inicio or 'Início'} a {filtro.periodo_fim or 'Atual'}"
    if filtro.subtitulo:
        sub_periodo = f"{filtro.subtitulo} | {sub_periodo}"
    elementos.append(Paragraph(escape(sub_periodo), estilo_sub))
    elementos.append(Spacer(1, 10))

    # 2. Metadados e Quadro Informativo
    meta_linhas = [
        [
            Paragraph(f"<b>Entidade:</b> {escape(config.associacao)}", estilo_meta),
            Paragraph(f"<b>Data de Emissão:</b> {datetime.now().strftime('%d/%m/%Y às %H:%M')}", estilo_meta),
        ]
    ]
    if filtro.tipo_relatorio == "emenda":
        meta_linhas.append([
            Paragraph(f"<b>Emenda / Fomento:</b> {escape(filtro.numero_emenda or 'Emenda Parlamentar Municipal')}", estilo_meta),
            Paragraph(f"<b>Órgão Concedente:</b> {escape(filtro.orgao_concedente or 'Secretaria Municipal de Esportes')}", estilo_meta),
        ])
    elif filtro.tipo_relatorio == "competicao":
        meta_linhas.append([
            Paragraph(f"<b>Competição:</b> {escape(filtro.competicao or config.competicao)}", estilo_meta),
            Paragraph("<b>Finalidade:</b> Prestação de contas aos clubes participantes", estilo_meta),
        ])

    tabela_meta = Table(meta_linhas, colWidths=[largura_util * 0.6, largura_util * 0.4])
    tabela_meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(AZUL_CLARO)),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor(AZUL)),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elementos.append(tabela_meta)
    elementos.append(Spacer(1, 10))

    # 3. Tabela de Lancamentos
    # Define colunas de acordo com o tipo de relatorio
    if filtro.tipo_relatorio == "emenda":
        # Formato analitico com documento, favorecido com CNPJ/CPF e comprovante
        cabecalhos = ["Data", "Tipo", "Categoria", "Descrição do Gasto / Receita", "Favorecido / Fornecedor", "Doc. / NF", "Comprovante", "Valor"]
        larguras = [
            largura_util * 0.08,
            largura_util * 0.07,
            largura_util * 0.16,
            largura_util * 0.25,
            largura_util * 0.20,
            largura_util * 0.08,
            largura_util * 0.08,
            largura_util * 0.08,
        ]
    elif filtro.tipo_relatorio == "competicao":
        cabecalhos = ["Data", "Tipo", "Categoria", "Histórico / Descrição", "Favorecido / Pagador", "Documento", "Comprovante", "Valor"]
        larguras = [
            largura_util * 0.08,
            largura_util * 0.07,
            largura_util * 0.18,
            largura_util * 0.27,
            largura_util * 0.18,
            largura_util * 0.08,
            largura_util * 0.06,
            largura_util * 0.08,
        ]
    else:  # Geral
        cabecalhos = ["Data", "Tipo", "Origem / Torneio", "Categoria", "Descrição do Lançamento", "Favorecido / Pagador", "Comprovante", "Valor"]
        larguras = [
            largura_util * 0.08,
            largura_util * 0.07,
            largura_util * 0.16,
            largura_util * 0.17,
            largura_util * 0.24,
            largura_util * 0.14,
            largura_util * 0.06,
            largura_util * 0.08,
        ]

    linhas_tabela = [[Paragraph(f"<b>{c}</b>", estilo_cel_cab) for c in cabecalhos]]

    for item in itens:
        estilo_val = estilo_cel_val_verde if item.eh_entrada else estilo_cel_val_verm
        comp_link = f'<link href="{item.comprovante_url}" color="#1F3A68"><u>Anexo</u></link>' if item.comprovante_url else "—"

        desc_celula = escape(item.descricao)
        if item.id_transacao_bancaria:
            desc_celula += f'<br/><font size="6.5" color="#667085"><i>Extrato/ID: {escape(item.id_transacao_bancaria)}</i></font>'

        if filtro.tipo_relatorio == "emenda":
            linha = [
                Paragraph(escape(item.data_movimentacao), estilo_cel_cent),
                Paragraph(f"<b>{escape(item.tipo)}</b>", estilo_cel_cent),
                Paragraph(escape(item.categoria), estilo_cel_esq),
                Paragraph(desc_celula, estilo_cel_esq),
                Paragraph(escape(item.favorecido_pagador or "—"), estilo_cel_esq),
                Paragraph(escape(item.documento or "—"), estilo_cel_cent),
                Paragraph(comp_link, estilo_cel_cent),
                Paragraph(escape(item.valor_formatado), estilo_val),
            ]
        elif filtro.tipo_relatorio == "competicao":
            linha = [
                Paragraph(escape(item.data_movimentacao), estilo_cel_cent),
                Paragraph(f"<b>{escape(item.tipo)}</b>", estilo_cel_cent),
                Paragraph(escape(item.categoria), estilo_cel_esq),
                Paragraph(desc_celula, estilo_cel_esq),
                Paragraph(escape(item.favorecido_pagador or "—"), estilo_cel_esq),
                Paragraph(escape(item.documento or "—"), estilo_cel_cent),
                Paragraph(comp_link, estilo_cel_cent),
                Paragraph(escape(item.valor_formatado), estilo_val),
            ]
        else:  # Geral
            linha = [
                Paragraph(escape(item.data_movimentacao), estilo_cel_cent),
                Paragraph(f"<b>{escape(item.tipo)}</b>", estilo_cel_cent),
                Paragraph(escape(item.origem), estilo_cel_esq),
                Paragraph(escape(item.categoria), estilo_cel_esq),
                Paragraph(desc_celula, estilo_cel_esq),
                Paragraph(escape(item.favorecido_pagador or "—"), estilo_cel_esq),
                Paragraph(comp_link, estilo_cel_cent),
                Paragraph(escape(item.valor_formatado), estilo_val),
            ]
        linhas_tabela.append(linha)

    tabela_mov = Table(linhas_tabela, colWidths=larguras, repeatRows=1)
    estilo_tabela = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(AZUL)),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D5DD")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]

    # Efeito zebrado
    for r in range(1, len(linhas_tabela)):
        if r % 2 == 0:
            estilo_tabela.append(("BACKGROUND", (0, r), (-1, r), colors.HexColor("#F9FAFB")))

    tabela_mov.setStyle(TableStyle(estilo_tabela))
    elementos.append(tabela_mov)
    elementos.append(Spacer(1, 10))

    # 4. Quadro Consolidado de Totais
    estilo_resumo_label = ParagraphStyle(
        "FinResLabel",
        parent=layout.base,
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        alignment=TA_RIGHT,
    )
    estilo_resumo_val_verde = ParagraphStyle(
        "FinResVerde",
        parent=layout.base,
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#1E7B34"),
        alignment=TA_RIGHT,
    )
    estilo_resumo_val_verm = ParagraphStyle(
        "FinResVerm",
        parent=layout.base,
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor(VERMELHO),
        alignment=TA_RIGHT,
    )
    estilo_resumo_val_saldo = ParagraphStyle(
        "FinResSaldo",
        parent=layout.base,
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=colors.HexColor(AZUL),
        alignment=TA_RIGHT,
    )

    linhas_totais = [
        [
            Paragraph("Total de Entradas (Receitas):", estilo_resumo_label),
            Paragraph(formatar_moeda(total_entradas), estilo_resumo_val_verde),
        ],
        [
            Paragraph("Total de Saídas (Despesas):", estilo_resumo_label),
            Paragraph(formatar_moeda(total_saidas), estilo_resumo_val_verm),
        ],
        [
            Paragraph("<b>SALDO LÍQUIDO DO PERÍODO:</b>", estilo_resumo_label),
            Paragraph(f"<b>{formatar_moeda(saldo_final)}</b>", estilo_resumo_val_saldo),
        ],
    ]

    largura_resumo = 9.5 * cm
    tabela_totais = Table(linhas_totais, colWidths=[6.0 * cm, 3.5 * cm])
    tabela_totais.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor(AZUL)),
        ("LINEBELOW", (0, 0), (-1, 0), 0.4, colors.HexColor("#D0D5DD")),
        ("LINEBELOW", (0, 1), (-1, 1), 0.4, colors.HexColor("#D0D5DD")),
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor(AZUL_CLARO)),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))

    # Posiciona resumo alinhado à direita
    bloco_fechamento = Table([[Paragraph("", estilo_meta), tabela_totais]], colWidths=[largura_util - largura_resumo, largura_resumo])
    bloco_fechamento.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elementos.append(KeepTogether(bloco_fechamento))
    elementos.append(Spacer(1, 12))

    # 5. Declaracao e Bloco Oficial de Assinatura do Presidente
    linhas_declaracao = [
        "Declaramos para os devidos fins de direito que os dados acima refletem com fidelidade as entradas "
        "e saídas ocorridas no período, com a respectiva guarda e disponibilidade dos comprovantes anexos.",
        f"{config.cidade or 'Uberlândia/MG'}, {date.today().strftime('%d de %B de %Y')}.",
    ]
    
    # Bloco institucional de assinatura oficial
    bloco_assinatura = layout.bloco_assinatura(
        linha_data=f"{config.cidade or 'Uberlândia/MG'}, {date.today().strftime('%d de %B de %Y')}",
        linhas_finais=[config.associacao, "Presidência e Diretoria Executiva"],
        assinar=True,
    )

    elementos.append(KeepTogether([
        Paragraph(escape(linhas_declaracao[0]), estilo_sub),
        Spacer(1, 4),
        bloco_assinatura,
    ]))

    doc = SimpleDocTemplate(
        str(saida),
        pagesize=tamanho_pagina,
        leftMargin=margem,
        rightMargin=margem,
        topMargin=3.2 * cm,
        bottomMargin=2.0 * cm,
    )

    rodape_texto = f"Prestação de Contas · {titulo_doc}"
    subtitulo_cabecalho = "Controle Financeiro e Prestação de Contas"
    pagina_cb = layout.moldura(rodape_texto, subtitulo=subtitulo_cabecalho)

    doc.build(elementos, onFirstPage=pagina_cb, onLaterPages=pagina_cb)
    log.info("Relatorio financeiro PDF gerado com sucesso em: %s", saida)
    return saida


def carregar_lancamentos_de_json(caminho: Path) -> tuple[FiltroRelatorio, list[LancamentoFinanceiro]]:
    with open(caminho, "r", encoding="utf-8") as f:
        dados = json.load(f)

    filtro_dict = dados.get("filtro", {})
    filtro = FiltroRelatorio(
        tipo_relatorio=filtro_dict.get("tipo_relatorio", "geral"),
        titulo=filtro_dict.get("titulo", ""),
        subtitulo=filtro_dict.get("subtitulo", ""),
        periodo_inicio=filtro_dict.get("periodo_inicio", ""),
        periodo_fim=filtro_dict.get("periodo_fim", ""),
        competicao=filtro_dict.get("competicao", ""),
        numero_emenda=filtro_dict.get("numero_emenda", ""),
        orgao_concedente=filtro_dict.get("orgao_concedente", ""),
        responsavel_emissao=filtro_dict.get("responsavel_emissao", ""),
    )

    lancamentos: list[LancamentoFinanceiro] = []
    for l in dados.get("lancamentos", []):
        lancamentos.append(LancamentoFinanceiro(
            id_lancamento=l.get("id_lancamento", ""),
            data_movimentacao=l.get("data_movimentacao", ""),
            tipo=l.get("tipo", "Entrada"),
            origem=l.get("origem", "Geral"),
            categoria=l.get("categoria", ""),
            descricao=l.get("descricao", ""),
            valor=float(l.get("valor", 0.0)),
            favorecido_pagador=l.get("favorecido_pagador", ""),
            documento=l.get("documento", ""),
            id_transacao_bancaria=l.get("id_transacao_bancaria", "") or l.get("idTransacaoBancaria", ""),
            emenda=l.get("emenda", ""),
            comprovante_url=l.get("comprovante_url", ""),
            responsavel=l.get("responsavel", ""),
        ))

    return filtro, lancamentos
