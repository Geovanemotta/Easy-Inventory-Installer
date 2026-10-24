#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
CERT_FILE="${CERT_DIR}/server.crt"
KEY_FILE="${CERT_DIR}/server.key"

# Se o Docker acidentalmente criou server.crt ou server.key como pasta (bind-mount fantasma), remove
if [ -d "$CERT_FILE" ]; then
    echo "[!] Detectado diretório fantasma em $CERT_FILE. Removendo pasta..."
    rm -rf "$CERT_FILE"
fi

if [ -d "$KEY_FILE" ]; then
    echo "[!] Detectado diretório fantasma em $KEY_FILE. Removendo pasta..."
    rm -rf "$KEY_FILE"
fi

# Se o certificado ou a chave não existirem, gera um certificado auto-assinado com SAN (IP / DNS)
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    HOST="${SERVER_HOST:-localhost}"
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
        -subj "/C=BR/O=ZenithMap/OU=TI/CN=${HOST}" \
        -addext "subjectAltName = ${SAN}"

    chmod 644 "$CERT_FILE" 2>/dev/null || true
    chmod 600 "$KEY_FILE" 2>/dev/null || true

    echo "[+] Certificado gerado com sucesso para $HOST (SAN: $SAN)!"
    echo "[i] Para instalar o certificado oficial da empresa:"
    echo "    1. Coloque os arquivos 'server.crt' e 'server.key' na pasta './nginx/certs/'"
    echo "    2. Execute: docker exec zenithmap-nginx nginx -s reload"
    echo "=========================================================="
else
    echo "[+] Certificado SSL detectado em $CERT_FILE."
fi

exec "$@"
