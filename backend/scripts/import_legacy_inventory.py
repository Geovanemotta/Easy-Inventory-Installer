import argparse
import json
import re
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import engine
from app.models import (
    Company,
    Device,
    DeviceHistory,
    DeviceSoftware,
    Site,
    SiteIdentifier,
    Software,
    SoftwarePackage,
)


COMPANY_SLUG = "giassi"


SOFTWARE_GROUPS = (
    "aplicativos",
    "agentes",
    "runtimes",
    "ferramentas",
)


DEVICE_FIELDS = (
    "hostname",
    "loja",
    "ip",
    "mac",
    "sistema",
    "versao",
    "status",
    "processador",
    "ram_total",
    "disco_total",
    "disco_usado",
    "disco_livre",
    "rustdesk_id",
    "fabricante",
    "modelo",
    "serial",
    "dominio",
    "usuario",
    "build",
    "ip_secundario",
    "ram_tipo",
    "windows_release",
    "alerta_hardware",
    "analise_disco",
    "extra_data",
    "perifericos",
    "patrimonio",
    "firewall_status",
    "firewall_solicitado_por",
    "firewall_solicitado_em",
    "firewall_confirmado_por",
    "firewall_confirmado_em",
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Importador do inventário JSON legado do Giassi"
    )

    parser.add_argument(
        "path",
        help="Arquivo JSON ou diretório contendo os inventários",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Somente analisa; não altera o banco",
    )

    return parser.parse_args()


def empty_to_none(value):
    if value is None:
        return None

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return None

    return value


def parse_percentage(value):
    value = empty_to_none(value)

    if value is None:
        return None

    if isinstance(value, int):
        return value

    match = re.search(r"\d+", str(value))

    if not match:
        return None

    return int(match.group())


def parse_datetime(value):
    value = empty_to_none(value)

    if value is None:
        return None

    value = str(value)

    formats = (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    )

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    raise ValueError(f"Data inválida: {value}")


def normalize_identifier(value):
    value = empty_to_none(value)

    if value is None:
        return None

    return str(value).upper()


def find_json_files(path):
    path = Path(path)

    if path.is_file():
        if path.suffix.lower() != ".json":
            raise ValueError(f"Arquivo não é JSON: {path}")

        return [path]

    if path.is_dir():
        return sorted(path.rglob("*.json"))

    raise FileNotFoundError(f"Caminho não encontrado: {path}")


def find_site(session, company_id, data, json_path):
    identifiers = []

    loja = normalize_identifier(data.get("loja"))

    if loja:
        identifiers.append(loja)

    folder = normalize_identifier(json_path.parent.name)

    if folder:
        identifiers.append(folder)

    for identifier in identifiers:
        result = session.execute(
            select(SiteIdentifier)
            .where(
                SiteIdentifier.company_id == company_id,
                SiteIdentifier.identifier == identifier,
                SiteIdentifier.active.is_(True),
            )
        ).scalar_one_or_none()

        if result:
            site = session.get(Site, result.site_id)

            return site, identifier

    return None, None


def collect_software(data):
    result = []

    for group in SOFTWARE_GROUPS:
        items = data.get(group, [])

        if not isinstance(items, list):
            continue

        for item in items:
            if not isinstance(item, dict):
                continue

            identifier = empty_to_none(item.get("id"))
            nome = empty_to_none(item.get("nome"))

            if not identifier or not nome:
                continue

            tipo = empty_to_none(item.get("tipo"))

            if not tipo:
                tipo = group.rstrip("s")

            origem = empty_to_none(item.get("origem"))

            packages = item.get("pacotes", [])

            if not isinstance(packages, list):
                packages = []

            result.append(
                {
                    "identifier": identifier,
                    "nome": nome,
                    "tipo": tipo,
                    "origem": origem,
                    "packages": packages,
                }
            )

    return result


def device_value(data, field):
    value = data.get(field)

    if field == "disco_percentual":
        return parse_percentage(value)

    if field in {
        "analise_disco",
        "perifericos",
        "extra_data",
    }:
        return value

    return empty_to_none(value)


def build_device_values(data, company_id, site_id):
    values = {}

    for field in DEVICE_FIELDS:
        values[field] = device_value(data, field)

    values["company_id"] = company_id
    values["site_id"] = site_id
    values["disco_percentual"] = parse_percentage(
        data.get("disco_percentual")
    )
    values["data_coleta"] = parse_datetime(
        data.get("data_coleta")
    )

    return values


def add_history(
    session,
    device,
    campo,
    valor_anterior,
    valor_novo,
    data_alteracao,
):
    if valor_anterior == valor_novo:
        return

    session.add(
        DeviceHistory(
            device_id=device.id,
            campo=campo,
            valor_anterior=(
                None
                if valor_anterior is None
                else str(valor_anterior)
            ),
            valor_novo=(
                None
                if valor_novo is None
                else str(valor_novo)
            ),
            data_alteracao=data_alteracao or datetime.utcnow(),
        )
    )


def import_device(
    session,
    company,
    data,
    json_path,
    dry_run=False,
):
    hostname = empty_to_none(data.get("hostname"))

    if not hostname:
        raise ValueError("JSON sem hostname")

    site, site_identifier = find_site(
        session,
        company.id,
        data,
        json_path,
    )

    site_id = site.id if site else None

    values = build_device_values(
        data,
        company.id,
        site_id,
    )

    existing_device = session.execute(
        select(Device)
        .where(
            Device.company_id == company.id,
            Device.hostname == hostname,
        )
    ).scalar_one_or_none()

    software_items = collect_software(data)

    package_count = sum(
        len(item["packages"])
        for item in software_items
    )

    if dry_run:
        print()
        print("=" * 70)
        print(f"Arquivo: {json_path}")
        print("=" * 70)

        print(f"Empresa:        {company.name} (ID {company.id})")
        print(f"Hostname:       {hostname}")
        print(f"IP:              {values['ip']}")
        print(f"MAC:             {values['mac']}")
        print(f"Sistema:         {values['sistema']}")
        print(f"Versão:          {values['versao']}")
        print(f"Status:          {values['status']}")

        if site:
            print(
                f"Site:            {site.name} "
                f"(ID {site.id})"
            )
            print(
                f"Identificador:   {site_identifier}"
            )
        else:
            print("Site:            NÃO ENCONTRADO")

        if existing_device:
            print(
                f"Device:          EXISTENTE "
                f"(ID {existing_device.id})"
            )
            print("Ação:            ATUALIZAÇÃO")
        else:
            print("Device:          NOVO")
            print("Ação:            INSERÇÃO")

        print()
        print(f"Software:        {len(software_items)}")
        print(f"Pacotes:         {package_count}")

        print()

        return {
            "action": "update" if existing_device else "insert",
            "software_count": len(software_items),
            "package_count": package_count,
        }

    data_coleta = values.get("data_coleta")

    if existing_device is None:
        device = Device(**values)

        session.add(device)
        session.flush()

        print(
            f"[NOVO] Device criado: "
            f"{hostname} (ID {device.id})"
        )

    else:
        device = existing_device

        for field, new_value in values.items():
            if field in {"company_id", "data_coleta"}:
                continue

            # Inventários antigos não devem apagar informações
            # existentes quando o campo estiver ausente ou vazio.
            if new_value is None:
                continue

            old_value = getattr(device, field)

            if old_value != new_value:
                add_history(
                    session,
                    device,
                    field,
                    old_value,
                    new_value,
                    data_coleta,
                )

                setattr(device, field, new_value)

        # Só atualiza a data se o JSON trouxer uma data válida.
        if data_coleta is not None:
            device.data_coleta = data_coleta
        print(
            f"[UPDATE] Device atualizado: "
            f"{hostname} (ID {device.id})"
        )

    software_count = 0
    package_count = 0

    for item in software_items:
        identifier = item["identifier"]

        software = session.execute(
            select(Software)
            .where(
                Software.company_id == company.id,
                Software.identifier == identifier,
            )
        ).scalar_one_or_none()

        if software is None:
            software = Software(
                company_id=company.id,
                identifier=identifier,
                nome=item["nome"],
                tipo=item["tipo"],
                origem=item["origem"],
            )

            session.add(software)
            session.flush()

            print(
                f"  [NOVO SOFTWARE] "
                f"{item['nome']} [{identifier}]"
            )

        else:
            changed = False

            if software.nome != item["nome"]:
                software.nome = item["nome"]
                changed = True

            if software.tipo != item["tipo"]:
                software.tipo = item["tipo"]
                changed = True

            if software.origem != item["origem"]:
                software.origem = item["origem"]
                changed = True

            if changed:
                print(
                    f"  [UPDATE SOFTWARE] "
                    f"{item['nome']} [{identifier}]"
                )

        device_software = session.execute(
            select(DeviceSoftware)
            .where(
                DeviceSoftware.device_id == device.id,
                DeviceSoftware.software_id == software.id,
            )
        ).scalar_one_or_none()

        if device_software is None:
            device_software = DeviceSoftware(
                device_id=device.id,
                software_id=software.id,
                installed=True,
                first_seen_at=data_coleta or datetime.utcnow(),
                last_seen_at=data_coleta or datetime.utcnow(),
            )

            session.add(device_software)
            session.flush()

        else:
            device_software.installed = True
            device_software.last_seen_at = (
                data_coleta or datetime.utcnow()
            )

        software_count += 1

        existing_packages = {
            package.pacote: package
            for package in device_software.packages
        }

        current_packages = set()

        for package_data in item["packages"]:
            if not isinstance(package_data, dict):
                continue

            pacote = empty_to_none(
                package_data.get("pacote")
            )

            versao = empty_to_none(
                package_data.get("versao")
            )

            if not pacote or not versao:
                continue

            current_packages.add(pacote)

            package = existing_packages.get(pacote)

            if package is None:
                package = SoftwarePackage(
                    device_software_id=device_software.id,
                    pacote=pacote,
                    versao=versao,
                    first_seen_at=data_coleta or datetime.utcnow(),
                    last_seen_at=data_coleta or datetime.utcnow(),
                )

                session.add(package)

            else:
                package.versao = versao
                package.last_seen_at = (
                    data_coleta or datetime.utcnow()
                )

            package_count += 1

    session.commit()

    print(
        f"  Software processado: {software_count}"
    )

    print(
        f"  Pacotes processados: {package_count}"
    )

    return {
        "action": "update" if existing_device else "insert",
        "software_count": software_count,
        "package_count": package_count,
    }


def main():
    args = parse_args()

    files = find_json_files(args.path)

    if not files:
        print("Nenhum arquivo JSON encontrado.")
        return 1

    print(f"Arquivos encontrados: {len(files)}")
    print(
        f"Modo: "
        f"{'DRY-RUN' if args.dry_run else 'IMPORTAÇÃO REAL'}"
    )

    with Session(engine) as session:
        company = session.execute(
            select(Company)
            .where(Company.slug == COMPANY_SLUG)
        ).scalar_one_or_none()

        if not company:
            raise RuntimeError(
                f"Empresa '{COMPANY_SLUG}' não encontrada."
            )

        print(
            f"Empresa: {company.name} "
            f"(ID {company.id})"
        )

        total_insert = 0
        total_update = 0
        total_software = 0
        total_packages = 0
        errors = 0

        for json_path in files:
            try:
                with json_path.open(
                    "r",
                    encoding="utf-8",
                ) as file:
                    data = json.load(file)

                result = import_device(
                    session=session,
                    company=company,
                    data=data,
                    json_path=json_path,
                    dry_run=args.dry_run,
                )

                if result["action"] == "insert":
                    total_insert += 1
                else:
                    total_update += 1

                total_software += result["software_count"]
                total_packages += result["package_count"]

            except Exception as exc:
                errors += 1

                session.rollback()

                print()
                print(
                    f"[ERRO] {json_path}: {exc}"
                )
                print()

        print()
        print("=" * 70)
        print("RESUMO")
        print("=" * 70)
        print(f"Arquivos:       {len(files)}")
        print(f"Novos devices:  {total_insert}")
        print(f"Atualizações:   {total_update}")
        print(f"Software:       {total_software}")
        print(f"Pacotes:        {total_packages}")
        print(f"Erros:          {errors}")

        if args.dry_run:
            print()
            print("DRY-RUN: nenhuma alteração foi feita no banco.")

        return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
