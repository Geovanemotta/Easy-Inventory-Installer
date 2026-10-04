import json
import re
from datetime import datetime
from pathlib import Path

from sqlalchemy import select

from sqlalchemy.orm import sessionmaker

from app.database import engine
from app.models.device import Device
from app.models.site import Site
from app.models.site_identifier import SiteIdentifier


INVENTORY_DIR = Path("/app/import-data")
COMPANY_ID = 1
DRY_RUN = False
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

def identificar_site(hostname: str, db):
    """
    Identifica o site pelo prefixo do hostname.

    Exemplos:
        L10-XXXX       -> L10
        LJ10-XXXX      -> LJ10
        C03-XXXX       -> C03
        CB03-XXXX      -> CB03
        AC-XXXX        -> AC
    """

    hostname = hostname.upper().strip()

    match = re.match(r"^(LJ?\d+|CB?\d+|AC)(?:-|$)", hostname)

    if not match:
        return None, None

    identificador = match.group(1)

    result = db.execute(
        select(SiteIdentifier, Site)
        .join(Site, Site.id == SiteIdentifier.site_id)
        .where(
            SiteIdentifier.company_id == COMPANY_ID,
            SiteIdentifier.identifier == identificador,
            SiteIdentifier.active.is_(True),
            Site.active.is_(True),
        )
    ).first()

    if not result:
        return identificador, None

    site_identifier, site = result

    return identificador, site


def carregar_jsons():
    """
    Procura JSONs tanto na raiz quanto dentro das subpastas.
    """

    arquivos = []

    for arquivo in INVENTORY_DIR.rglob("*.json"):
        if arquivo.name in {"test.json", "inventory.last.json"}:
            continue

        arquivos.append(arquivo)

    return sorted(arquivos)

def converter_percentual(valor):
    """
    Converte valores como:
        "32%" -> 32
        32 -> 32
        "" -> None
    """
    if valor is None:
        return None

    valor = str(valor).strip()

    if not valor:
        return None

    valor = valor.replace("%", "").strip()

    try:
        return int(valor)
    except ValueError:
        return None


def converter_data_coleta(valor):
    """
    Converte a data_coleta do JSON para datetime.
    """
    if not valor:
        return None

    valor = str(valor).strip()

    try:
        return datetime.strptime(valor, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def criar_device(dados, site):
    """
    Monta um objeto Device a partir do JSON.
    Ainda não grava no banco.
    """

    return Device(
        company_id=COMPANY_ID,
        site_id=site.id,
        hostname=str(dados.get("hostname", "")).strip(),
        loja=str(dados.get("loja", "")).strip() or None,
        ip=str(dados.get("ip", "")).strip() or None,
        mac=str(dados.get("mac", "")).strip().lower() or None,
        sistema=str(dados.get("sistema", "")).strip() or None,
        versao=str(dados.get("versao", "")).strip() or None,
        status=str(dados.get("status", "")).strip() or None,
        processador=str(dados.get("processador", "")).strip() or None,
        ram_total=str(dados.get("ram_total", "")).strip() or None,
        disco_total=str(dados.get("disco_total", "")).strip() or None,
        disco_usado=str(dados.get("disco_usado", "")).strip() or None,
        disco_livre=str(dados.get("disco_livre", "")).strip() or None,
        disco_percentual=converter_percentual(
            dados.get("disco_percentual")
        ),
        rustdesk_id=str(dados.get("rustdesk_id", "")).strip() or None,
        data_coleta=converter_data_coleta(
            dados.get("data_coleta")
        ),
    )

def encontrar_device(dados, db):
    """
    Procura um dispositivo existente usando:
    1. MAC
    2. IP
    3. hostname
    """

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
            return device, "mac"

    if ip:
        device = db.scalar(
            select(Device).where(
                Device.company_id == COMPANY_ID,
                Device.ip == ip,
            )
        )

        if device:
            return device, "ip"

    if hostname:
        device = db.scalar(
            select(Device).where(
                Device.company_id == COMPANY_ID,
                Device.hostname == hostname,
            )
        )

        if device:
            return device, "hostname"

    return None, None

def main():
    if not INVENTORY_DIR.exists():
        print(f"ERRO: diretório não encontrado: {INVENTORY_DIR}")
        return

    db = SessionLocal()

    try:
        arquivos = carregar_jsons()

        print("=" * 70)
        print("GIASSI INVENTORY V2 - DRY RUN")
        print("=" * 70)
        print()
        print(f"Diretório : {INVENTORY_DIR}")
        print(f"JSONs     : {len(arquivos)}")
        print()

        total_validos = 0
        total_invalidos = 0
        total_sem_site = 0
        total_novos = 0
        total_existentes = 0
        total_importados = 0
        sites_encontrados = {}
        sites_nao_encontrados = {}
        erros_json = []

        for arquivo in arquivos:
            try:
                with arquivo.open("r", encoding="utf-8") as f:
                    dados = json.load(f)
            except Exception as e:
                total_invalidos += 1
                erros_json.append((arquivo, str(e)))
                continue

            hostname = str(dados.get("hostname", "")).strip()

            if not hostname:
                total_invalidos += 1
                erros_json.append((arquivo, "hostname ausente"))
                continue

            total_validos += 1

            identificador, site = identificar_site(hostname, db)

            if site:
                chave = site.code

                if chave not in sites_encontrados:
                    sites_encontrados[chave] = {
                        "nome": site.name,
                        "quantidade": 0,
                    }

                sites_encontrados[chave]["quantidade"] += 1

            else:
                if hostname == "TRANSPOR-34314":
                    chave = "OUTROS"
                else:
                    chave = "MATRIZ"

                site = db.scalar(
                    select(Site).where(
                        Site.company_id == COMPANY_ID,
                        Site.code == chave,
                        Site.active.is_(True),
                    )
                )

                if not site:
                    raise RuntimeError(
                        f"Site '{chave}' não encontrado no banco "
                        f"para o hostname '{hostname}'"
                    )

                if chave not in sites_encontrados:
                    sites_encontrados[chave] = {
                        "nome": site.name,
                        "quantidade": 0,
                    }

                sites_encontrados[chave]["quantidade"] += 1
            device, metodo = encontrar_device(dados, db)

            if device:
                total_existentes += 1
            else:
                total_novos += 1

                novo_device = criar_device(dados, site)

                if not DRY_RUN:
                    db.add(novo_device)
                    total_importados += 1

        if not DRY_RUN:
            db.commit()

        print("-" * 70)
        print("RESUMO")
        print(f"JSONs encontrados        : {len(arquivos)}")
        print(f"JSONs válidos            : {total_validos}")
        print(f"JSONs inválidos          : {total_invalidos}")
        print(f"Sem site identificado   : {total_sem_site}")
        print(f"Devices já existentes   : {total_existentes}")
        print(f"Devices novos           : {total_novos}")
        print(f"Devices importados      : {total_importados}")
        print()

        print("-" * 70)
        print("DISPOSITIVOS POR SITE")
        print("-" * 70)

        for codigo in sorted(sites_encontrados):
            dados_site = sites_encontrados[codigo]

            print(
                f"{codigo:8} "
                f"{dados_site['nome']:<25} "
                f"{dados_site['quantidade']:>5} dispositivos"
            )

        print()

        if sites_nao_encontrados:
            print("-" * 70)
            print("HOSTNAMES SEM SITE IDENTIFICADO")
            print("-" * 70)

            for identificador in sorted(sites_nao_encontrados):
                print()
                print(f"Identificador: {identificador}")

                for hostname in sorted(sites_nao_encontrados[identificador]):
                    print(f"  - {hostname}")

        else:
            print("-" * 70)
            print("TODOS OS HOSTNAMES FORAM IDENTIFICADOS")
            print("-" * 70)

        print()

        if erros_json:
            print("-" * 70)
            print("ERROS NOS JSONS")
            print("-" * 70)

            for arquivo, erro in erros_json:
                print(f"{arquivo}: {erro}")

        print()

        if DRY_RUN:
            print("=" * 70)
            print("DRY RUN FINALIZADO - NENHUMA ALTERAÇÃO FOI FEITA NO BANCO")
            print("=" * 70)
        else:
            print("=" * 70)
            print("IMPORTAÇÃO FINALIZADA COM SUCESSO")
            print("=" * 70)

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
