#!/usr/bin/env python3
"""
Configura dinamicamente o IP/Host e portas nos arquivos de configuracao do MeshCentral
e scripts de agentes com base no ambiente do servidor atual.
"""
import json
import os
import re
import sys
from pathlib import Path


def get_base_dir() -> Path:
    return Path(__file__).resolve().parent.parent


def update_meshcentral_config(base_dir: Path, server_host: str, port: int):
    cfg_file = base_dir / "meshcentral" / "config.json"
    if not cfg_file.exists():
        print(f"[!] Arquivo {cfg_file} nao encontrado.")
        return

    try:
        with open(cfg_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        settings = data.setdefault("settings", {})

        is_loopback = server_host in ("127.0.0.1", "localhost", "::1", "")

        if is_loopback:
            # Em modo localhost/dinâmico, 'localhost' não tem ponto (.).
            # O MeshCentral detecta isso e utiliza dinamicamente window.location.hostname
            # do navegador do usuário que abrir a interface web para os comandos dos agentes.
            settings["cert"] = "localhost"
        else:
            clean_certs = [server_host]
            for c in ["localhost", "127.0.0.1"]:
                if c not in clean_certs:
                    clean_certs.append(c)
            settings["cert"] = ",".join(clean_certs)

        settings["aliasPort"] = port
        settings["ignoreAgentHashCheck"] = True

        # Atualiza domains
        domains = data.setdefault("domains", {})
        if "" in domains:
            domains[""]["ignoreAgentHashCheck"] = True
            domains[""].pop("certUrl", None)
            if not is_loopback:
                domains[""]["dns"] = server_host
            else:
                domains[""].pop("dns", None)

            # Garante que criacao de contas locais esteja ativa caso nao haja LDAP
            if "auth" not in domains[""]:
                domains[""]["newAccounts"] = True

        if "local" in domains:
            domains["local"].pop("certUrl", None)
            if not is_loopback:
                domains["local"]["dns"] = server_host
            else:
                domains["local"].pop("dns", None)
            domains["local"]["newAccounts"] = True

        with open(cfg_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")

        print(f"[✓] meshcentral/config.json ajustado para host '{server_host}' na porta {port}.")
    except Exception as e:
        print(f"[!] Erro ao atualizar meshcentral/config.json: {e}")


def update_agent_scripts(base_dir: Path, server_host: str, port: int):
    # Atualiza scripts_agents/install-meshagent.sh
    sh_file = base_dir / "scripts_agents" / "install-meshagent.sh"
    if sh_file.exists():
        try:
            content = sh_file.read_text(encoding="utf-8")
            content = re.sub(
                r'SERVER_HOST="\$\{SERVER_HOST:-[^}]+\}"',
                f'SERVER_HOST="${{SERVER_HOST:-{server_host}}}"',
                content,
            )
            content = re.sub(
                r'SERVER_PORT="\$\{SERVER_PORT:-[^}]+\}"',
                f'SERVER_PORT="${{SERVER_PORT:-{port}}}"',
                content,
            )
            sh_file.write_text(content, encoding="utf-8")
            print(f"[✓] scripts_agents/install-meshagent.sh atualizado com host '{server_host}:{port}'.")
        except Exception as e:
            print(f"[!] Erro ao atualizar install-meshagent.sh: {e}")

    # Atualiza scripts_agents/install-meshagent.ps1
    ps1_file = base_dir / "scripts_agents" / "install-meshagent.ps1"
    if ps1_file.exists():
        try:
            content = ps1_file.read_text(encoding="utf-8")
            content = re.sub(
                r'\[string\]\$ServerHost\s*=\s*"[^"]*"',
                f'[string]$ServerHost = "{server_host}"',
                content,
            )
            content = re.sub(
                r'\[int\]\$ServerPort\s*=\s*\d+',
                f'[int]$ServerPort = {port}',
                content,
            )
            ps1_file.write_text(content, encoding="utf-8")
            print(f"[✓] scripts_agents/install-meshagent.ps1 atualizado com host '{server_host}:{port}'.")
        except Exception as e:
            print(f"[!] Erro ao atualizar install-meshagent.ps1: {e}")


def main():
    base_dir = get_base_dir()
    server_host = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].strip() else os.getenv("SERVER_HOST", "").strip()
    if not server_host:
        server_host = "127.0.0.1"

    port_str = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].strip() else os.getenv("PORT_MESHCENTRAL", "4443").strip()
    try:
        port = int(port_str)
    except ValueError:
        port = 4443

    update_meshcentral_config(base_dir, server_host, port)
    update_agent_scripts(base_dir, server_host, port)


if __name__ == "__main__":
    main()
