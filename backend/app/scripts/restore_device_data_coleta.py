"""
Script para restaurar a data_coleta original das estações de trabalho
após a sobregravação acidental por testes de ping ICMP.
"""
import json
import os
import subprocess
from pathlib import Path

def main():
    base = Path(os.path.expanduser("~/projetos/giassi-inventory/import-data"))
    data_map = {}
    if base.exists():
        for f in base.rglob("*.json"):
            try:
                with open(f, "r", encoding="utf-8", errors="ignore") as fp:
                    d = json.load(fp)
                    h = d.get("hostname")
                    dc = d.get("data_coleta")
                    if h and dc:
                        data_map[h.upper().strip()] = str(dc).strip()
            except Exception:
                pass

    print(f"[+] Lidos {len(data_map)} inventários JSON em {base}")

    # Consulta dispositivos atuais do banco
    res = subprocess.check_output([
        "sudo", "docker", "exec", "giassi-postgres", "psql", "-U", "giassi_app", "-d", "giassi_inventory", "-t", "-A", "-c",
        "SELECT d.id, upper(trim(d.hostname)), max(ds.last_seen_at), d.created_at FROM devices d LEFT JOIN device_software ds ON ds.device_id = d.id GROUP BY d.id, d.hostname, d.created_at;"
    ]).decode("utf-8")

    sql_lines = ["BEGIN;"]
    counts = {"json": 0, "software": 0, "created": 0}

    for line in res.strip().split("\n"):
        if not line:
            continue
        parts = line.split("|")
        dev_id = int(parts[0])
        host = parts[1]
        ds_date = parts[2] if len(parts) > 2 and parts[2] else None
        created_at = parts[3] if len(parts) > 3 and parts[3] else None

        target_dt = None
        if host in data_map:
            target_dt = data_map[host]
            counts["json"] += 1
        elif ds_date:
            target_dt = ds_date
            counts["software"] += 1
        elif created_at:
            target_dt = created_at
            counts["created"] += 1

        if target_dt:
            # Escape de apóstrofos caso necessário
            safe_dt = target_dt.replace("'", "''")
            sql_lines.append(f"UPDATE devices SET data_coleta = '{safe_dt}' WHERE id = {dev_id};")

    sql_lines.append("COMMIT;")
    sql_script = "\n".join(sql_lines)

    sql_file = Path("/tmp/restore_data_coleta.sql")
    sql_file.write_text(sql_script, encoding="utf-8")
    print(f"[+] Gerado script SQL com {len(sql_lines) - 2} comandos UPDATE em {sql_file}")
    print(f"[+] Fontes utilizadas: JSON={counts['json']}, DeviceSoftware={counts['software']}, CreatedAt={counts['created']}")

    # Executa no Postgres
    print("[*] Executando no banco PostgreSQL...")
    proc = subprocess.run([
        "sudo", "docker", "exec", "-i", "giassi-postgres", "psql", "-U", "giassi_app", "-d", "giassi_inventory"
    ], input=sql_script.encode("utf-8"), capture_output=True)

    if proc.returncode == 0:
        print("[✓] Atualização concluída com sucesso no PostgreSQL!")
    else:
        print(f"[X] Erro ao executar SQL: {proc.stderr.decode('utf-8')}")

if __name__ == "__main__":
    main()
