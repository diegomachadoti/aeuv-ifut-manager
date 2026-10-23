"""Testes da lógica de reincidência disciplinar (controle de punições + dosimetria)."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import controle_punicoes
from controle_punicoes import (
    Punicao,
    chave_pessoa_reincidencia,
    contexto_reincidencia,
    gravar_controle,
    historico_punicoes_pessoa,
)


def punicao(nota, punido, equipe, artigo="ART. 23, §1º", tipo="Atleta", partidas="2"):
    return Punicao(
        nota=nota, data_nota="01/01/2026", competicao="Teste", data_jogo="01/01/2026",
        partida="A x B", equipe=equipe, punido=punido, tipo=tipo, camisa="10",
        artigo=artigo, partidas=partidas, tempo="-", decisao="suspensão",
        cartao_vermelho="Não", status="DEFINIDA", situacao="A CUMPRIR",
        sumula="SUM-1", modo="Regras fixas",
    )


class ReincidenciaControleTests(unittest.TestCase):
    def test_chave_normaliza_nome_e_equipe(self):
        a = chave_pessoa_reincidencia("João Matheus de Oliveira", "CRUZMALTINO")
        b = chave_pessoa_reincidencia("joao matheus DE oliveira", "cruzmaltino")
        self.assertEqual(a, b)

    def test_historico_conta_qualquer_artigo_disciplinar_individual(self):
        registros = [
            punicao("001/2026", "Fulano", "Equipe A", artigo="ART. 23, §1º"),
            punicao("002/2026", "Fulano", "Equipe A", artigo="ART. 22, §2º, inciso I"),
            # Equipe não conta
            punicao("003/2026", "Equipe Equipe A", "Equipe A", artigo="ART. 13, §1º", tipo="Equipe"),
            # Sem artigo não conta
            punicao("004/2026", "Fulano", "Equipe A", artigo="-"),
            # Outra pessoa
            punicao("005/2026", "Beltrano", "Equipe B", artigo="ART. 23, §1º"),
        ]
        hist = historico_punicoes_pessoa(registros, "Fulano", "Equipe A")
        self.assertEqual(len(hist), 2)

        ctx = contexto_reincidencia_from(registros)
        self.assertEqual(ctx[chave_pessoa_reincidencia("Fulano", "Equipe A")], 2)
        self.assertEqual(ctx[chave_pessoa_reincidencia("Beltrano", "Equipe B")], 1)
        # Equipe e sem-artigo não entram
        self.assertNotIn(chave_pessoa_reincidencia("Equipe Equipe A", "Equipe A"), ctx)

    def test_contexto_le_do_arquivo(self):
        with tempfile.TemporaryDirectory() as tmp:
            caminho = Path(tmp) / "controle.txt"
            # grava sem gerar PDF/publicar (evita dependências externas)
            registros = [
                punicao("001/2026", "Fulano", "Equipe A"),
                punicao("002/2026", "Fulano", "Equipe A"),
            ]
            _gravar_apenas_txt(caminho, registros)
            ctx = contexto_reincidencia(caminho)
            self.assertEqual(ctx[chave_pessoa_reincidencia("Fulano", "Equipe A")], 2)


def contexto_reincidencia_from(registros):
    """Replica contexto_reincidencia a partir de uma lista em memória."""
    from main import normalize_text
    contagem = {}
    for p in registros:
        if normalize_text(p.tipo) in controle_punicoes.TIPOS_DISCIPLINA_EQUIPE:
            continue
        if not (p.artigo or "").strip() or (p.artigo or "").strip() == "-":
            continue
        chave = chave_pessoa_reincidencia(p.punido, p.equipe)
        contagem[chave] = contagem.get(chave, 0) + 1
    return contagem


def _gravar_apenas_txt(caminho, registros):
    """Grava o controle no formato pipe sem acionar PDF/Drive."""
    from controle_punicoes import COLUNAS
    from dataclasses import asdict
    linhas = [list(COLUNAS.values())] + [
        [str(v).replace("|", "/") for v in asdict(r).values()] for r in registros
    ]
    larguras = [max(len(l[i]) for l in linhas) for i in range(len(COLUNAS))]
    def fmt(cel):
        return " | ".join(c.ljust(larguras[i]) for i, c in enumerate(cel)).rstrip()
    saida = ["CONTROLE", "Atualizado em 01/01/2026 · 2 registro(s)", "", "", "", "",
             fmt(linhas[0]), "-+-".join("-" * n for n in larguras),
             *(fmt(l) for l in linhas[1:]), ""]
    caminho.write_text("\n".join(saida), encoding="utf-8-sig")


class DosimetriaReincidenciaTests(unittest.TestCase):
    def _ocorrencia(self, regra_id, pena, nome="Fulano", equipe="Equipe A"):
        from sumula_disciplinar import Envolvido, Ocorrencia, Regra
        regra = next((r for r in _regras() if r.id == regra_id), None)
        self.assertIsNotNone(regra, f"regra {regra_id} não encontrada")
        env = Envolvido(equipe=equipe, tipo="Atleta", nome=nome, camisa="10")
        return Ocorrencia(regra, "trecho", pena, env)

    def test_reincidente_em_agressao_vai_para_dois_anos(self):
        from sumula_disciplinar import dosimetria
        o = self._ocorrencia("art10_agressor", "suspensão de 9 (nove) a 20 (vinte) partidas")
        dose = dosimetria(o, [o], _sumula_fake(), {"Fulano": 1})
        self.assertIsNone(dose.partidas)
        self.assertIn("2 (dois) anos", dose.decisao)
        self.assertTrue(any("reincid" in c.lower() for c in dose.circunstancias))

    def test_reincidente_em_artigo_com_faixa_agrava_dentro_do_maximo(self):
        from sumula_disciplinar import dosimetria
        # ART 23 §1º: 1 a 4 partidas. Reincidência soma 1 circunstância.
        o = self._ocorrencia("art11", "suspensão de 1 (uma) a 4 (quatro) partidas")
        dose_sem = dosimetria(o, [o], _sumula_fake(), {})
        dose_com = dosimetria(o, [o], _sumula_fake(), {"Fulano": 2})
        self.assertGreater(dose_com.partidas, dose_sem.partidas)
        self.assertLessEqual(dose_com.partidas, 4)
        self.assertTrue(any("reincid" in c.lower() for c in dose_com.circunstancias))

    def test_nao_reincidente_mantem_pena_base(self):
        from sumula_disciplinar import dosimetria
        o = self._ocorrencia("art11", "suspensão de 1 (uma) a 4 (quatro) partidas")
        dose = dosimetria(o, [o], _sumula_fake(), {})
        self.assertEqual(dose.partidas, 1)  # mínimo, sem circunstâncias


def _regras():
    from sumula_disciplinar import REGRAS
    return REGRAS


def _sumula_fake():
    from sumula_disciplinar import Sumula
    return Sumula(
        arquivo=Path("x"), protocolo="SUM-1", arbitro="A", time1="Equipe A", time2="Equipe B",
        data_jogo="01/01/2026", hora_jogo="10:00", fatos="relato", envolvidos=[],
    )


if __name__ == "__main__":
    unittest.main()
