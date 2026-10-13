#!/usr/bin/env bash
# ==============================================================================
# Instalador Silencioso do Agente MeshCentral para Linux (Grupo Giassi)
# ==============================================================================

set -e

SERVER_HOST="${SERVER_HOST:-inventario.giassi.com.br}"
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

# Ajuste de compatibilidade para controle de Desktop (Zorin OS / Ubuntu / Debian)
# O MeshAgent necessita de Xorg para captura de tela e mouse/teclado.
# Desabilita Wayland no GDM para habilitar controle remoto não-assistido.
if [ -f "/etc/gdm3/custom.conf" ]; then
    if grep -q "WaylandEnable=false" /etc/gdm3/custom.conf; then
        sed -i 's/#\s*WaylandEnable=false/WaylandEnable=false/' /etc/gdm3/custom.conf
    elif grep -q "\[daemon\]" /etc/gdm3/custom.conf; then
        sed -i '/\[daemon\]/a WaylandEnable=false' /etc/gdm3/custom.conf
    else
        printf "\n[daemon]\nWaylandEnable=false\n" >> /etc/gdm3/custom.conf
    fi
    echo "[+] Compatibilidade de Desktop (Xorg) ativada em /etc/gdm3/custom.conf."
elif [ -f "/etc/gdm/custom.conf" ]; then
    sed -i 's/#\s*WaylandEnable=false/WaylandEnable=false/' /etc/gdm/custom.conf 2>/dev/null || true
fi

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
