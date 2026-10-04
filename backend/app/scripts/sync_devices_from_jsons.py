import json
import re
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import engine
from app.models.device import Device
from app.models.site import Site
from app.models.site_identifier import SiteIdentifier

INVENTORY_DIR = Path("/app/import-data")
COMPANY_ID = 1


def converter_percentual(valor):
    if valor is None:
        return None
    valor = str(valor).strip().replace("%", "")
    try:
        return int(float(valor))
    except (ValueError, TypeError):
        return None


def converter_data_coleta(valor):
    if not valor:
        return None
    valor = str(valor).strip()
    try:
        return datetime.strptime(valor, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            return datetime.fromisoformat(valor)
        except Exception:
            return None


def normalizar_mac(m):
    if not m:
        return None
    bruto = str(m).strip().lower()
    hex_chars = re.sub(r"[^0-9a-f]", "", bruto)
    if len(hex_chars) == 12:
        return ":".join(hex_chars[i : i + 2] for i in range(0, 12, 2))
    return bruto.replace("-", ":")


def identificar_site(hostname: str, db: Session):
    hostname = (hostname or "").upper().strip()
    match = re.match(r"^(LJ?\d+|CB?\d+|AC)(?:-|$)", hostname)
    if match:
        identificador = match.group(1)
        res = db.execute(
            select(Site)
            .join(SiteIdentifier, SiteIdentifier.site_id == Site.id)
            .where(
                SiteIdentifier.company_id == COMPANY_ID,
                SiteIdentifier.identifier == identificador,
                SiteIdentifier.active.is_(True),
                Site.active.is_(True),
            )
        ).scalar()
        if res:
            return res

    # Fallback por prefixo
    if hostname.startswith("AC-") or hostname == "MATRIZ":
        code = "MATRIZ"
    elif re.match(r"^(?:CB|C)(\d+)-", hostname):
        m = re.match(r"^(?:CB|C)(\d+)-", hostname)
        code = f"COMBO-{int(m.group(1)):02d}"
    elif re.match(r"^(?:LJ|L)(\d+)-", hostname):
        m = re.match(r"^(?:LJ|L)(\d+)-", hostname)
        code = f"LOJA-{int(m.group(1)):02d}"
    else:
        code = "OUTROS"

    res = db.scalar(
        select(Site).where(
            Site.company_id == COMPANY_ID,
            Site.code == code,
            Site.active.is_(True),
        )
    )
    return res


def sync_all():
    print("=" * 60)
    print("SINCRONIZANDO DADOS COMPLETOS DOS JSONS PARA O POSTGRESQL")
    print("=" * 60)

    if not INVENTORY_DIR.exists():
        print(f"Diretório não encontrado: {INVENTORY_DIR}")
        return

    jsons = sorted(INVENTORY_DIR.rglob("*.json"))
    validos = [j for j in jsons if j.name not in {"test.json", "inventory.last.json"}]
    print(f"Total de JSONs encontrados: {len(validos)}")

    with Session(engine) as db:
        # Carrega devices existentes no banco
        existing_devices = db.scalars(
            select(Device).where(Device.company_id == COMPANY_ID)
        ).all()
        by_hostname = {d.hostname.upper().strip(): d for d in existing_devices}
        by_mac = {d.mac.lower(): d for d in existing_devices if d.mac}
        by_ip = {d.ip: d for d in existing_devices if d.ip}

        atualizados = 0
        inseridos = 0

        for arq in validos:
            try:
                with open(arq, "r", encoding="utf-8") as f:
                    dados = json.load(f)
            except Exception as e:
                print(f"Erro ao ler {arq.name}: {e}")
                continue

            hostname = str(dados.get("hostname", "")).strip()
            if not hostname:
                continue

            mac = normalizar_mac(dados.get("mac"))
            ip = str(dados.get("ip", "")).strip() or None

            # Localiza o device
            dev = by_hostname.get(hostname.upper())
            if not dev and mac:
                dev = by_mac.get(mac.lower())
            if not dev and ip:
                dev = by_ip.get(ip)

            site = identificar_site(hostname, db)

            extra_software = {}
            for cat in ("aplicativos", "agentes", "runtimes", "ferramentas"):
                if isinstance(dados.get(cat), list):
                    extra_software[cat] = dados[cat]

            if dev:
                # Atualiza campos
                dev.site_id = site.id if site else dev.site_id
                dev.ip = ip or dev.ip
                dev.mac = mac or dev.mac
                dev.loja = str(dados.get("loja", "")).strip() or dev.loja
                dev.sistema = str(dados.get("sistema", "")).strip() or dev.sistema
                dev.versao = str(dados.get("versao", "")).strip() or dev.versao
                dev.status = str(dados.get("status", "")).strip() or dev.status
                dev.processador = str(dados.get("processador", "")).strip() or dev.processador
                dev.ram_total = str(dados.get("ram_total", "")).strip() or dev.ram_total
                dev.disco_total = str(dados.get("disco_total", "")).strip() or dev.disco_total
                dev.disco_usado = str(dados.get("disco_usado", "")).strip() or dev.disco_usado
                dev.disco_livre = str(dados.get("disco_livre", "")).strip() or dev.disco_livre
                pct = converter_percentual(dados.get("disco_percentual") or dados.get("porcentagem_disco"))
                if pct is not None:
                    dev.disco_percentual = pct
                dev.rustdesk_id = str(dados.get("rustdesk_id", "")).strip() or dev.rustdesk_id
                
                # Novos campos
                dev.fabricante = str(dados.get("fabricante", "")).strip() or dev.fabricante
                dev.modelo = str(dados.get("modelo", "")).strip() or dev.modelo
                dev.serial = str(dados.get("serial", "")).strip() or dev.serial
                dev.dominio = str(dados.get("dominio", "")).strip() or dev.dominio
                dev.usuario = str(dados.get("usuario", "")).strip() or dev.usuario
                dev.build = str(dados.get("build", "")).strip() or dev.build
                dev.ip_secundario = str(dados.get("ip_secundario") or dados.get("ip2") or "").strip() or dev.ip_secundario
                
                if dados.get("analise_disco"):
                    dev.analise_disco = dados["analise_disco"]
                if extra_software:
                    dev.extra_data = extra_software

                dt = converter_data_coleta(dados.get("data_coleta"))
                if dt:
                    dev.data_coleta = dt
                dev.active = True
                atualizados += 1
            else:
                # Cria novo
                pct = converter_percentual(dados.get("disco_percentual") or dados.get("porcentagem_disco"))
                dt = converter_data_coleta(dados.get("data_coleta")) or datetime.utcnow()
                novo = Device(
                    company_id=COMPANY_ID,
                    site_id=site.id if site else None,
                    hostname=hostname,
                    loja=str(dados.get("loja", "")).strip() or None,
                    ip=ip,
                    mac=mac,
                    sistema=str(dados.get("sistema", "")).strip() or None,
                    versao=str(dados.get("versao", "")).strip() or None,
                    status=str(dados.get("status", "")).strip() or None,
                    processador=str(dados.get("processador", "")).strip() or None,
                    ram_total=str(dados.get("ram_total", "")).strip() or None,
                    disco_total=str(dados.get("disco_total", "")).strip() or None,
                    disco_usado=str(dados.get("disco_usado", "")).strip() or None,
                    disco_livre=str(dados.get("disco_livre", "")).strip() or None,
                    disco_percentual=pct,
                    rustdesk_id=str(dados.get("rustdesk_id", "")).strip() or None,
                    fabricante=str(dados.get("fabricante", "")).strip() or None,
                    modelo=str(dados.get("modelo", "")).strip() or None,
                    serial=str(dados.get("serial", "")).strip() or None,
                    dominio=str(dados.get("dominio", "")).strip() or None,
                    usuario=str(dados.get("usuario", "")).strip() or None,
                    build=str(dados.get("build", "")).strip() or None,
                    ip_secundario=str(dados.get("ip_secundario") or dados.get("ip2") or "").strip() or None,
                    analise_disco=dados.get("analise_disco"),
                    extra_data=extra_software if extra_software else None,
                    data_coleta=dt,
                    active=True,
                )
                db.add(novo)
                by_hostname[hostname.upper()] = novo
                inseridos += 1

        db.commit()
        print(f"Sincronização concluída com sucesso!")
        print(f"Atualizados no banco: {atualizados}")
        print(f"Novos inseridos: {inseridos}")
        print(f"Total de dispositivos: {len(by_hostname)}")


if __name__ == "__main__":
    sync_all()
