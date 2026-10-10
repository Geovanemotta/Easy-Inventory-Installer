#!/usr/bin/env bash
# ==============================================================================
# Instalador Silencioso do Agente MeshCentral para Linux (Grupo Giassi)
# ==============================================================================

set -e

SERVER_HOST="${SERVER_HOST:-192.168.0.4}"
SERVER_PORT="${SERVER_PORT:-4443}"

echo "=========================================================="
echo "   INSTALADOR DO AGENTE MESHCENTRAL - GRUPO GIASSI TI    "
echo "=========================================================="

if [[ $EUID -ne 0 ]]; then
   echo "[ERRO] Este script deve ser executado como root (sudo)." 
   exit 1
fi

if systemctl is-active --quiet meshagent 2>/dev/null; then
    echo "[OK] O serviço 'meshagent' já está instalado e ativo no sistema."
    exit 0
fi

WORKDIR="/usr/local/meshagent"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

# Verifica se o executável já existe no diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/meshagent" ]]; then
    echo "[+] Copiando executável local..."
    cp -f "$SCRIPT_DIR/meshagent" "$WORKDIR/meshagent"
else
    DOWNLOAD_URL="https://${SERVER_HOST}:${SERVER_PORT}/meshagents?id=6"
    echo "[+] Baixando agente do servidor: $DOWNLOAD_URL..."
    curl -k -s -S -L -m 30 "$DOWNLOAD_URL" -o "$WORKDIR/meshagent" || {
        echo "[AVISO] Falha ao baixar diretamente via curl."
        echo "Baixe o binário 'meshagent' para Linux pelo painel do MeshCentral e coloque na pasta deste script."
        exit 1
    }
fi

chmod 755 "$WORKDIR/meshagent"
echo "[+] Registrando serviço systemd..."
"$WORKDIR/meshagent" -install

sleep 2
if systemctl is-active --quiet meshagent 2>/dev/null; then
    echo "[SUCESSO] MeshAgent instalado e rodando em background via systemd!"
else
    echo "[AVISO] Instalador executado. Verifique o status com: systemctl status meshagent"
fi
