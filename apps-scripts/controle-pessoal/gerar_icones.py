"""Gera os ícones da marca a partir de logo.svg; requer Pillow, não usa serviços externos."""

from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw


ASSETS = Path(__file__).resolve().parents[2] / "docs" / "assets" / "meu-controle"


def renderizar_logo():
    """Renderiza os retângulos e polilinhas da marca com antialiasing."""
    escala = 32
    imagem = Image.new("RGBA", (64 * escala, 64 * escala), (0, 0, 0, 0))
    desenho = ImageDraw.Draw(imagem)
    for elemento in ET.parse(ASSETS / "logo.svg").getroot():
        tipo = elemento.tag.rsplit("}", 1)[-1]
        if tipo in ("title", "desc"):
            continue
        if tipo == "rect":
            x, y, largura, altura = (
                float(elemento.attrib[chave]) * escala
                for chave in ("x", "y", "width", "height")
            )
            desenho.rounded_rectangle(
                (x, y, x + largura, y + altura),
                radius=float(elemento.get("rx", "0")) * escala,
                fill=elemento.attrib["fill"],
            )
        elif tipo == "polyline":
            pontos = [
                tuple(float(valor) * escala for valor in ponto.split(","))
                for ponto in elemento.attrib["points"].split()
            ]
            largura = round(float(elemento.attrib["stroke-width"]) * escala)
            cor = elemento.attrib["stroke"]
            desenho.line(pontos, fill=cor, width=largura, joint="curve")
            # A marca usa terminações e junções arredondadas.
            raio = largura / 2
            for x, y in pontos:
                desenho.ellipse((x - raio, y - raio, x + raio, y + raio), fill=cor)
        else:
            raise ValueError(f"Elemento SVG não suportado pelo gerador: {tipo}")
    return imagem


def main():
    imagem = renderizar_logo()
    for tamanho in (32, 192, 512):
        destino = ASSETS / f"icon-{tamanho}.png"
        imagem.resize((tamanho, tamanho), Image.Resampling.LANCZOS).save(destino)
        print(destino)
    destino = ASSETS / "favicon.ico"
    imagem.resize((256, 256), Image.Resampling.LANCZOS).save(
        destino, sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)]
    )
    print(destino)


if __name__ == "__main__":
    main()
