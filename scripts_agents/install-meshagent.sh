#!/usr/bin/env bash
# ==============================================================================
# Instalador Silencioso do Agente MeshCentral para Linux (Grupo Giassi)
# ==============================================================================

set -e

SERVER_HOST="${SERVER_HOST:-127.0.0.1}"
SERVER_PORT="${SERVER_PORT:-4443}"
MESH_ID="${MESH_ID:-@oLaTf\$n@RpilBaLgcYNw@0pLz2dR\$TQotm4DXxNwG7Di9sbsSW6hWN6KS9mwvZ4}"

echo "=========================================================="
echo "   INSTALADOR DO AGENTE MESHCENTRAL - GRUPO GIASSI TI    "
echo "=========================================================="

if [[ $EUID -ne 0 ]]; then
   echo "[ERRO] Este script deve ser executado como root (sudo)." 
   exit 1
fi

SERVER_URL="https://${SERVER_HOST}:${SERVER_PORT}"

echo "[+] Servidor de destino: $SERVER_URL"
echo "[+] Grupo de Dispositivos: $MESH_ID"

# Se o serviço antigo já estiver rodando, para e remove a instalação antiga para renovar o vínculo
if systemctl is-active --quiet meshagent 2>/dev/null; then
    echo "[!] Detectado serviço 'meshagent' anterior em execução."
    echo "[+] Parando e atualizando serviço..."
    systemctl stop meshagent 2>/dev/null || true
    if [[ -f "/usr/local/meshagent/meshagent" ]]; then
        /usr/local/meshagent/meshagent -fulluninstall 2>/dev/null || true
    fi
fi

# Executa o script oficial do MeshCentral passando o servidor e o MeshID do grupo corporativo
echo "[+] Baixando instalador do grupo e registrando agente no MeshCentral..."
curl -k -s -S -L -m 30 "${SERVER_URL}/meshagents?script=1" | bash -s -- "${SERVER_URL}" "${MESH_ID}"

sleep 3

if systemctl is-active --quiet meshagent 2>/dev/null; then
    echo "=========================================================="
    echo " [SUCESSO] MeshAgent instalado e conectado com sucesso!"
    echo " A máquina já deve aparecer no grupo 'Maquinas Giassi'."
    echo "=========================================================="
else
    echo "[AVISO] Verifique o status com: sudo systemctl status meshagent"
fi
