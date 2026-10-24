#!/bin/bash
# ==========================================================
# IMPORTADOR AUTOMÁTICO DE CERTIFICADO PFX (LINUX)
# Converte .pfx para server.crt e server.key e recarrega o Nginx
# ==========================================================

set -e

PFX_PATH="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_OUT="$SCRIPT_DIR/server.key"
CRT_OUT="$SCRIPT_DIR/server.crt"

if [ -z "$PFX_PATH" ] || [ ! -f "$PFX_PATH" ]; then
    echo "Uso: $0 /caminho/para/certificado.pfx [senha]"
    exit 1
fi

PASSWORD="$2"
PASS_ARG=""
if [ -n "$PASSWORD" ]; then
    PASS_ARG="-passin pass:$PASSWORD"
fi

echo "=========================================="
echo " IMPORTAÇÃO DE CERTIFICADO CORPORATIVO "
echo "=========================================="
echo "[*] Origem: $PFX_PATH"
echo "[*] Destino da Chave: $KEY_OUT"
echo "[*] Destino do Certificado: $CRT_OUT"

echo "[1/3] Extraindo chave privada..."
openssl pkcs12 -in "$PFX_PATH" -nocerts -out "$KEY_OUT" -nodes $PASS_ARG

echo "[2/3] Extraindo certificado e cadeias..."
openssl pkcs12 -in "$PFX_PATH" -clcerts -nokeys -out "$CRT_OUT" $PASS_ARG

echo "[3/3] Validando e recarregando Nginx..."
if docker ps --format '{{.Names}}' | grep -q "zenithmap-nginx"; then
    docker exec zenithmap-nginx nginx -t
    docker exec zenithmap-nginx nginx -s reload
    echo "[+] SUCESSO: Certificado aplicado no Nginx!"
    if docker ps --format '{{.Names}}' | grep -q "zenithmap-meshcentral"; then
        echo "[*] Reiniciando MeshCentral para carregar o novo certificado..."
        docker restart zenithmap-meshcentral
        echo "[+] SUCESSO: MeshCentral atualizado com o novo certificado!"
    fi
else
    echo "[i] Container zenithmap-nginx não está rodando. O certificado será usado no próximo start."
fi
