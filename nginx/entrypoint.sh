#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
CERT_FILE="${CERT_DIR}/giassi.crt"
KEY_FILE="${CERT_DIR}/giassi.key"

# Se o certificado ou a chave não existirem, gera um certificado auto-assinado com SAN (IP / DNS)
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    HOST="${SERVER_HOST:-giassi-inventory}"
    echo "=========================================================="
    echo "[!] Certificado corporativo nao encontrado em $CERT_FILE ou $KEY_FILE."
    echo "[*] Gerando certificado auto-assinado com SAN para: $HOST (10 anos)..."
    echo "=========================================================="
    mkdir -p "$CERT_DIR"

    # Determina se é IP ou domínio para montar a extensão SAN
    case "$HOST" in
        *[!0-9.]*)
            SAN="DNS:${HOST},DNS:localhost,IP:127.0.0.1"
            ;;
        *)
            SAN="IP:${HOST},IP:127.0.0.1,DNS:localhost"
            ;;
    esac

    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/C=BR/O=Inventario Corporativo/OU=TI/CN=${HOST}" \
        -addext "subjectAltName = ${SAN}" \
        2>/dev/null

    echo "[+] Certificado gerado com sucesso para $HOST (SAN: $SAN)!"
    echo "[i] Para instalar o certificado oficial da empresa:"
    echo "    1. Coloque os arquivos 'giassi.crt' e 'giassi.key' na pasta './nginx/certs/'"
    echo "    2. Execute: docker exec giassi-nginx nginx -s reload"
    echo "=========================================================="
else
    echo "[+] Certificado SSL detectado em $CERT_FILE."
fi

exec "$@"
