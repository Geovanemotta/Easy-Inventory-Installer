import json
from collections import Counter, defaultdict
from pathlib import Path


INVENTORY_DIR = Path("/app/import-data")


def carregar_jsons():
    arquivos = sorted(INVENTORY_DIR.rglob("*.json"))

    for arquivo in arquivos:
        if arquivo.name in {"test.json", "inventory.last.json"}:
            continue

        try:
            with arquivo.open("r", encoding="utf-8") as f:
                dados = json.load(f)

            yield arquivo, dados

        except Exception as e:
            print(f"ERRO JSON: {arquivo}: {e}")


def main():
    total_jsons = 0
    total_itens = 0
    total_pacotes = 0

    categorias = Counter()
    origens = Counter()

    softwares = {}
    conflitos = defaultdict(list)

    itens_por_categoria = Counter()
    pacotes_por_categoria = Counter()

    for arquivo, dados in carregar_jsons():
        total_jsons += 1

        hostname = dados.get("hostname", arquivo.stem)

        for categoria in (
            "aplicativos",
            "agentes",
            "runtimes",
            "ferramentas",
        ):
            itens = dados.get(categoria, [])

            if not isinstance(itens, list):
                continue

            for item in itens:
                total_itens += 1
                itens_por_categoria[categoria] += 1

                identifier = str(item.get("id", "")).strip()
                nome = str(item.get("nome", "")).strip()
                tipo = str(item.get("tipo", "")).strip()
                origem = str(item.get("origem", "")).strip()

                pacotes = item.get("pacotes", [])

                categorias[categoria] += 1
                origens[origem] += 1
                pacotes_por_categoria[categoria] += (
                    len(pacotes) if isinstance(pacotes, list) else 0
                )

                if not identifier:
                    conflitos["SEM_IDENTIFIER"].append(
                        f"{hostname} -> {categoria} -> {nome}"
                    )
                    continue

                registro = {
                    "nome": nome,
                    "tipo": tipo,
                    "origem": origem,
                    "categoria": categoria,
                }

                if identifier not in softwares:
                    softwares[identifier] = registro
                elif softwares[identifier] != registro:
                    conflitos[identifier].append(
                        {
                            "hostname": hostname,
                            "existente": softwares[identifier],
                            "encontrado": registro,
                        }
                    )

                if isinstance(pacotes, list):
                    total_pacotes += len(pacotes)

    print()
    print("=" * 70)
    print("ANÁLISE DOS SOFTWARES")
    print("=" * 70)

    print(f"JSONs processados:       {total_jsons}")
    print(f"Itens de software:       {total_itens}")
    print(f"Softwares únicos:        {len(softwares)}")
    print(f"Pacotes encontrados:     {total_pacotes}")

    print()
    print("-" * 70)
    print("ITENS POR CATEGORIA")
    print("-" * 70)

    for categoria, quantidade in sorted(itens_por_categoria.items()):
        print(f"{categoria:<20} {quantidade}")

    print()
    print("-" * 70)
    print("PACOTES POR CATEGORIA")
    print("-" * 70)

    for categoria, quantidade in sorted(pacotes_por_categoria.items()):
        print(f"{categoria:<20} {quantidade}")

    print()
    print("-" * 70)
    print("ORIGENS")
    print("-" * 70)

    for origem, quantidade in sorted(origens.items()):
        origem_display = origem or "(vazio)"
        print(f"{origem_display:<20} {quantidade}")

    print()
    print("-" * 70)
    print("CONFLITOS")
    print("-" * 70)

    if not conflitos:
        print("Nenhum conflito encontrado.")
    else:
        for identifier, ocorrencias in conflitos.items():
            print()
            print(f"Software: {identifier}")

            for ocorrencia in ocorrencias[:10]:
                print(f"  {ocorrencia}")

            if len(ocorrencias) > 10:
                print(f"  ... mais {len(ocorrencias) - 10} ocorrência(s)")

    print()
    print("=" * 70)
    print("ANÁLISE FINALIZADA - NENHUMA ALTERAÇÃO FOI FEITA NO BANCO")
    print("=" * 70)


if __name__ == "__main__":
    main()
