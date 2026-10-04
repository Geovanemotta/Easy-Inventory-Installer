import json
from collections import Counter
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.database import engine
from app.models.device import Device
from app.models.software import Software
from app.models.device_software import DeviceSoftware
from app.models.software_package import SoftwarePackage


INVENTORY_DIR = Path("/app/import-data")
COMPANY_ID = 1


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


CATEGORIAS = (
    "aplicativos",
    "agentes",
    "runtimes",
    "ferramentas",
)


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


def encontrar_device(dados, db):
    mac = str(dados.get("mac", "")).strip().lower()
    ip = str(dados.get("ip", "")).strip()
    hostname = str(dados.get("hostname", "")).strip()

    if mac:
        device = db.scalar(
            select(Device).where(
                Device.company_id == COMPANY_ID,
                Device.mac == mac,
            )
        )

        if device:
            return device

    if ip:
        device = db.scalar(
            select(Device).where(
                Device.company_id == COMPANY_ID,
                Device.ip == ip,
            )
        )

        if device:
            return device

    if hostname:
        device = db.scalar(
            select(Device).where(
                Device.company_id == COMPANY_ID,
                Device.hostname == hostname,
            )
        )

        if device:
            return device

    return None


def normalizar_pacotes(pacotes):
    if not isinstance(pacotes, list):
        return []

    resultado = []

    for pacote in pacotes:
        if not isinstance(pacote, dict):
            continue

        nome = str(
            pacote.get("pacote", "")
        ).strip()

        versao = str(
            pacote.get("versao", "")
        ).strip()

        if not nome:
            continue

        resultado.append(
            {
                "pacote": nome,
                "versao": versao,
            }
        )

    return resultado


def obter_data_coleta(dados):
    valor = dados.get("data_coleta")

    if not valor:
        return datetime.utcnow()

    try:
        return datetime.strptime(
            str(valor).strip(),
            "%Y-%m-%d %H:%M:%S",
        )
    except ValueError:
        return datetime.utcnow()


def main():
    db = SessionLocal()

    total_jsons = 0
    total_devices_encontrados = 0
    total_devices_nao_encontrados = 0

    total_itens = 0
    total_pacotes = 0

    softwares_criados = 0
    softwares_existentes = 0

    device_softwares_criados = 0
    device_softwares_existentes = 0

    packages_criados = 0
    packages_existentes = 0

    categorias = Counter()

    devices_nao_encontrados = []

    # Cache para evitar consultas repetidas
    software_cache = {}
    device_software_cache = {}

    try:
        print()
        print("=" * 70)
        print("IMPORTAÇÃO DE SOFTWARE")
        print("=" * 70)
        print()

        # ---------------------------------------------------------
        # Carrega softwares já existentes da empresa
        # ---------------------------------------------------------

        softwares_existentes_db = db.scalars(
            select(Software).where(
                Software.company_id == COMPANY_ID
            )
        ).all()

        for software in softwares_existentes_db:
            software_cache[
                software.identifier
            ] = software

        print(
            f"Softwares já existentes no banco: "
            f"{len(software_cache)}"
        )

        print()

        # ---------------------------------------------------------
        # Processamento dos JSONs
        # ---------------------------------------------------------

        for arquivo, dados in carregar_jsons():
            total_jsons += 1

            hostname = str(
                dados.get(
                    "hostname",
                    arquivo.stem,
                )
            ).strip()

            device = encontrar_device(
                dados,
                db,
            )

            if not device:
                total_devices_nao_encontrados += 1

                devices_nao_encontrados.append(
                    hostname
                )

                continue

            total_devices_encontrados += 1

            data_coleta = obter_data_coleta(
                dados
            )

            # -----------------------------------------------------
            # Categorias
            # -----------------------------------------------------

            for categoria in CATEGORIAS:
                itens = dados.get(
                    categoria,
                    [],
                )

                if not isinstance(itens, list):
                    continue

                for item in itens:
                    if not isinstance(item, dict):
                        continue

                    identifier = str(
                        item.get("id", "")
                    ).strip()

                    if not identifier:
                        continue

                    nome = str(
                        item.get("nome", "")
                    ).strip()

                    tipo = str(
                        item.get("tipo", "")
                    ).strip()

                    origem = str(
                        item.get("origem", "")
                    ).strip()

                    pacotes = normalizar_pacotes(
                        item.get("pacotes", [])
                    )

                    total_itens += 1
                    categorias[categoria] += 1

                    # -------------------------------------------------
                    # SOFTWARE
                    # -------------------------------------------------

                    software = software_cache.get(
                        identifier
                    )

                    if software is None:
                        software = Software(
                            company_id=COMPANY_ID,
                            identifier=identifier,
                            nome=nome or identifier,
                            tipo=tipo or categoria,
                            origem=origem or None,
                            active=True,
                            created_at=data_coleta,
                            updated_at=data_coleta,
                        )

                        db.add(software)
                        db.flush()

                        software_cache[
                            identifier
                        ] = software

                        softwares_criados += 1

                    else:
                        softwares_existentes += 1

                    # -------------------------------------------------
                    # DEVICE SOFTWARE
                    # -------------------------------------------------

                    chave_ds = (
                        device.id,
                        software.id,
                    )

                    device_software = (
                        device_software_cache.get(
                            chave_ds
                        )
                    )

                    if device_software is None:
                        device_software = db.scalar(
                            select(DeviceSoftware).where(
                                DeviceSoftware.device_id
                                == device.id,
                                DeviceSoftware.software_id
                                == software.id,
                            )
                        )

                        if device_software:
                            device_software_cache[
                                chave_ds
                            ] = device_software

                    if device_software is None:
                        device_software = DeviceSoftware(
                            device_id=device.id,
                            software_id=software.id,
                            installed=True,
                            first_seen_at=data_coleta,
                            last_seen_at=data_coleta,
                        )

                        db.add(device_software)
                        db.flush()

                        device_software_cache[
                            chave_ds
                        ] = device_software

                        device_softwares_criados += 1

                    else:
                        device_software.installed = True

                        if (
                            not device_software.last_seen_at
                            or data_coleta
                            > device_software.last_seen_at
                        ):
                            device_software.last_seen_at = (
                                data_coleta
                            )

                        device_softwares_existentes += 1

                    # -------------------------------------------------
                    # SOFTWARE PACKAGE
                    # -------------------------------------------------

                    # Evita duplicação do mesmo pacote dentro
                    # do mesmo item do JSON.
                    pacotes_processados = set()

                    for pacote in pacotes:
                        nome_pacote = pacote[
                            "pacote"
                        ]

                        versao = pacote[
                            "versao"
                        ]

                        chave_pacote = (
                            device_software.id,
                            nome_pacote,
                        )

                        if chave_pacote in pacotes_processados:
                            continue

                        pacotes_processados.add(
                            chave_pacote
                        )

                        total_pacotes += 1

                        software_package = db.scalar(
                            select(
                                SoftwarePackage
                            ).where(
                                SoftwarePackage.device_software_id
                                == device_software.id,
                                SoftwarePackage.pacote
                                == nome_pacote,
                            )
                        )

                        if software_package is None:
                            software_package = SoftwarePackage(
                                device_software_id=(
                                    device_software.id
                                ),
                                pacote=nome_pacote,
                                versao=versao,
                                first_seen_at=data_coleta,
                                last_seen_at=data_coleta,
                            )

                            db.add(
                                software_package
                            )

                            packages_criados += 1

                        else:
                            software_package.versao = (
                                versao
                            )

                            if (
                                not software_package.last_seen_at
                                or data_coleta
                                > software_package.last_seen_at
                            ):
                                software_package.last_seen_at = (
                                    data_coleta
                                )

                            packages_existentes += 1

            # ---------------------------------------------------------
            # Commit periódico
            # ---------------------------------------------------------

            if total_jsons % 100 == 0:
                db.commit()

                print(
                    f"Processados: {total_jsons} JSONs | "
                    f"Software: {softwares_criados} novos | "
                    f"DeviceSoftware: "
                    f"{device_softwares_criados} novos | "
                    f"Packages: {packages_criados} novos"
                )

        # ---------------------------------------------------------
        # Commit final
        # ---------------------------------------------------------

        db.commit()

        print()
        print("=" * 70)
        print("IMPORTAÇÃO FINALIZADA")
        print("=" * 70)

        print()
        print(f"JSONs processados:             {total_jsons}")
        print(f"Devices encontrados:           {total_devices_encontrados}")
        print(
            f"Devices não encontrados:       "
            f"{total_devices_nao_encontrados}"
        )

        print()
        print(f"Itens de software:             {total_itens}")
        print(f"Pacotes processados:           {total_pacotes}")

        print()
        print("-" * 70)
        print("SOFTWARE")
        print("-" * 70)

        print(
            f"Novos:                         "
            f"{softwares_criados}"
        )

        print(
            f"Existentes:                    "
            f"{softwares_existentes}"
        )

        print()
        print("-" * 70)
        print("DEVICE SOFTWARE")
        print("-" * 70)

        print(
            f"Novos:                         "
            f"{device_softwares_criados}"
        )

        print(
            f"Existentes:                    "
            f"{device_softwares_existentes}"
        )

        print()
        print("-" * 70)
        print("SOFTWARE PACKAGES")
        print("-" * 70)

        print(
            f"Novos:                         "
            f"{packages_criados}"
        )

        print(
            f"Existentes:                    "
            f"{packages_existentes}"
        )

        print()
        print("-" * 70)
        print("ITENS POR CATEGORIA")
        print("-" * 70)

        for categoria, quantidade in sorted(
            categorias.items()
        ):
            print(
                f"{categoria:<25} "
                f"{quantidade}"
            )

        if devices_nao_encontrados:
            print()
            print("-" * 70)
            print("DEVICES NÃO ENCONTRADOS")
            print("-" * 70)

            for hostname in devices_nao_encontrados[
                :30
            ]:
                print(hostname)

            if len(devices_nao_encontrados) > 30:
                print(
                    f"... mais "
                    f"{len(devices_nao_encontrados) - 30}"
                )

        print()
        print(
            "SoftwareHistory: "
            "0 registros criados "
            "(importação inicial)"
        )

        print()
        print("=" * 70)

    except Exception:
        db.rollback()
        print()
        print("=" * 70)
        print("ERRO - ROLLBACK EXECUTADO")
        print("=" * 70)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
