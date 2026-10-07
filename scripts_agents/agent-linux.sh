#!/bin/bash
# ==========================================================
# Compatível com Ubuntu 20.04/22.04/24.04, Zorin OS, Debian
# ==========================================================

set -e

# ----------------------------------------------------------
# Configuração e Parâmetros
# ----------------------------------------------------------
# Permite definir a URL via:
# 1) Argumento de linha de comando: ./agent-linux.sh http://ip:8000/api/v1/inventory/receive
# 2) Variável de ambiente: export GIASSI_SERVER_URL="http://ip:8000/api/v1/inventory/receive"
# 3) Fallback padrão
URL_SERVIDOR="${GIASSI_SERVER_URL:-"http://localhost:8000/api/v1/inventory/receive"}"
FORCAR_ENVIO=false

for arg in "$@"; do
    case "$arg" in
        --force|-f)
            FORCAR_ENVIO=true
            ;;
        http://*|https://*)
            URL_SERVIDOR="$arg"
            ;;
    esac
done

DIRETORIO="/var/lib/giassi-inventory"
ARQUIVO_ATUAL="$DIRETORIO/inventory.json"
ARQUIVO_ULTIMO="$DIRETORIO/inventory.last.json"

mkdir -p "$DIRETORIO"

# ----------------------------------------------------------
# Dependências essenciais
# ----------------------------------------------------------
if ! command -v jq >/dev/null 2>&1; then
    echo "[!] Dependência 'jq' não encontrada. Tentando instalar via apt..."
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update -qq && apt-get install -y -qq jq >/dev/null 2>&1 || true
    fi
    if ! command -v jq >/dev/null 2>&1; then
        echo "[-] ERRO: 'jq' não está instalado e é necessário para gerar o inventário."
        exit 1
    fi
fi

if ! command -v curl >/dev/null 2>&1; then
    echo "[!] Dependência 'curl' não encontrada. Tentando instalar via apt..."
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update -qq && apt-get install -y -qq curl >/dev/null 2>&1 || true
    fi
    if ! command -v curl >/dev/null 2>&1; then
        echo "[-] ERRO: 'curl' não está instalado e é necessário para enviar o inventário."
        exit 1
    fi
fi

# ----------------------------------------------------------
# Identificação básica: Hostname e Loja
# ----------------------------------------------------------
HOSTNAME=$(hostname)

# Identificação da Loja/Site:
# Ex: LJ01-ADM -> 01, L06-CAIXA -> 06, CB02-TI -> 02, AC-ADM -> MATRIZ
LOJA=""
if [[ "$HOSTNAME" =~ ^(LJ|L)([0-9]+) ]]; then
    LOJA="${BASH_REMATCH[2]}"
elif [[ "$HOSTNAME" =~ ^(CB|C)([0-9]+) ]]; then
    LOJA="${BASH_REMATCH[2]}"
elif [[ "$HOSTNAME" =~ ^AC- ]] || [[ "$HOSTNAME" == "MATRIZ" ]]; then
    LOJA="MATRIZ"
fi

# ----------------------------------------------------------
# Rede: Interface, IP Principal, IPs Secundários e MAC
# ----------------------------------------------------------
IFACE=$(ip -4 route get 8.8.8.8 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "dev") {print $(i+1); exit}}')
IP=$(ip -4 route get 8.8.8.8 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "src") {print $(i+1); exit}}')

if [[ -z "$IP" ]]; then
    IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

MAC=""
if [[ -n "$IFACE" && -f "/sys/class/net/$IFACE/address" ]]; then
    MAC=$(cat "/sys/class/net/$IFACE/address" 2>/dev/null)
else
    MAC=$(ip link 2>/dev/null | awk '/ether/ {print $2; exit}')
fi

# Demais IPs IPv4 válidos da máquina
IP_SECUNDARIO=$(ip -4 addr show 2>/dev/null | awk '/inet / {print $2}' | cut -d'/' -f1 | grep -v '^127\.' | grep -v "^${IP}$" | paste -sd ', ' - || true)

# ----------------------------------------------------------
# Hardware: Fabricante, Modelo e Número de Série (DMI / BIOS)
# ----------------------------------------------------------
FABRICANTE=""
MODELO=""
SERIAL=""

GENERIC_REGEX="^(System Product Name|All Series|To be filled.*|Default string|None|Unknown|Generic|Standard PC.*)$"

if [[ -d /sys/class/dmi/id ]]; then
    SYS_VENDOR=$(cat /sys/class/dmi/id/sys_vendor 2>/dev/null | tr -d '\r\n' || true)
    BOARD_VENDOR=$(cat /sys/class/dmi/id/board_vendor 2>/dev/null | tr -d '\r\n' || true)
    PROD_NAME=$(cat /sys/class/dmi/id/product_name 2>/dev/null | tr -d '\r\n' || true)
    BOARD_NAME=$(cat /sys/class/dmi/id/board_name 2>/dev/null | tr -d '\r\n' || true)
    PROD_SERIAL=$(cat /sys/class/dmi/id/product_serial 2>/dev/null | tr -d '\r\n' || true)
    BOARD_SERIAL=$(cat /sys/class/dmi/id/board_serial 2>/dev/null | tr -d '\r\n' || true)

    # 1. Determina o Modelo (evita 'All Series' e 'System Product Name', prioriza board_name)
    if [[ -n "$PROD_NAME" && ! "$PROD_NAME" =~ $GENERIC_REGEX ]]; then
        MODELO="$PROD_NAME"
    elif [[ -n "$BOARD_NAME" && ! "$BOARD_NAME" =~ $GENERIC_REGEX ]]; then
        MODELO="$BOARD_NAME"
    else
        MODELO="$PROD_NAME"
        if [[ "$MODELO" =~ $GENERIC_REGEX ]]; then
            MODELO=""
        fi
    fi

    # 2. Determina o Fabricante
    if [[ -n "$SYS_VENDOR" && ! "$SYS_VENDOR" =~ ^(System manufacturer|To be filled.*|Default string|None)$ ]]; then
        FABRICANTE="$SYS_VENDOR"
    elif [[ -n "$BOARD_VENDOR" && ! "$BOARD_VENDOR" =~ ^(System manufacturer|To be filled.*|Default string|None)$ ]]; then
        FABRICANTE="$BOARD_VENDOR"
    else
        FABRICANTE="$SYS_VENDOR"
        if [[ "$FABRICANTE" =~ ^(System manufacturer|To be filled.*)$ ]]; then
            FABRICANTE=""
        fi
    fi

    # 3. Determina o Serial
    if [[ -n "$PROD_SERIAL" && ! "$PROD_SERIAL" =~ ^(None|Default\ string|To\ be\ filled.*|Unknown|0123456789|System\ Serial\ Number)$ ]]; then
        SERIAL="$PROD_SERIAL"
    elif [[ -n "$BOARD_SERIAL" && ! "$BOARD_SERIAL" =~ ^(None|Default\ string|To\ be\ filled.*|Unknown|0123456789|System\ Serial\ Number)$ ]]; then
        SERIAL="$BOARD_SERIAL"
    fi
fi

# Fallback com dmidecode se Modelo, Fabricante ou Serial ainda estiverem vazios/genéricos
if command -v dmidecode >/dev/null 2>&1; then
    if [[ -z "$MODELO" || "$MODELO" =~ $GENERIC_REGEX ]]; then
        DMI_BOARD=$(dmidecode -s baseboard-product-name 2>/dev/null | tr -d '\r\n' || true)
        if [[ -n "$DMI_BOARD" && ! "$DMI_BOARD" =~ $GENERIC_REGEX ]]; then
            MODELO="$DMI_BOARD"
        else
            DMI_SYS=$(dmidecode -s system-product-name 2>/dev/null | tr -d '\r\n' || true)
            if [[ -n "$DMI_SYS" && ! "$DMI_SYS" =~ $GENERIC_REGEX ]]; then
                MODELO="$DMI_SYS"
            fi
        fi
    fi

    if [[ -z "$FABRICANTE" || "$FABRICANTE" =~ ^(System manufacturer|To be filled.*)$ ]]; then
        DMI_BOARD_V=$(dmidecode -s baseboard-manufacturer 2>/dev/null | tr -d '\r\n' || true)
        if [[ -n "$DMI_BOARD_V" && ! "$DMI_BOARD_V" =~ ^(System manufacturer|To be filled.*)$ ]]; then
            FABRICANTE="$DMI_BOARD_V"
        fi
    fi

    if [[ -z "$SERIAL" ]]; then
        DMI_SERIAL=$(dmidecode -s system-serial-number 2>/dev/null | tr -d '\r\n' || true)
        if [[ -n "$DMI_SERIAL" && ! "$DMI_SERIAL" =~ ^(None|Default\ string|To\ be\ filled.*|Unknown|0123456789|System\ Serial\ Number)$ ]]; then
            SERIAL="$DMI_SERIAL"
        fi
    fi
fi

# ----------------------------------------------------------
# Sistema Operacional e Status
# ----------------------------------------------------------
OS_ID="linux"
OS_VERSION=""
OS_BUILD=""

if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS_ID="$ID"
    OS_VERSION="$VERSION_ID"
    OS_BUILD="$VERSION_CODENAME"
fi

STATUS="OUTRO"
if [[ "$OS_ID" == "ubuntu" && "$OS_VERSION" == "22.04" ]]; then
    STATUS="UPGRADE_REQUIRED"
elif [[ "$OS_ID" == "ubuntu" && "$OS_VERSION" == "24.04" ]]; then
    STATUS="OK"
elif [[ "$OS_ID" == "zorin" && "$OS_VERSION" == "18" ]]; then
    STATUS="OK"
elif [[ "$OS_ID" == "zorin" || "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
    STATUS="OK"
fi

# ----------------------------------------------------------
# Processador e Memória
# ----------------------------------------------------------
PROCESSADOR=$(grep -m1 'model name' /proc/cpuinfo 2>/dev/null | cut -d ':' -f2- | sed 's/^ *//')
if command -v free >/dev/null 2>&1; then
    RAM_TOTAL=$(free -h 2>/dev/null | awk '/^Mem[.:]/ {print $2}' || true)
fi
if [[ -z "$RAM_TOTAL" && -f /proc/meminfo ]]; then
    RAM_TOTAL=$(awk '/MemTotal/ {printf "%.1f GB", $2/1048576}' /proc/meminfo 2>/dev/null || true)
fi

# Detecção do tipo e frequência da memória RAM (DDR3, DDR4, DDR5...)
RAM_TIPO=""
if command -v dmidecode >/dev/null 2>&1; then
    DMI_TYPES=$(dmidecode -t 17 2>/dev/null | awk -F': ' '/Type:/ {print $2}' | grep -iE '^(DDR|LPDDR)' | sort -u | tr '\n' '/' | sed 's/\/$//')
    DMI_SPEED=$(dmidecode -t 17 2>/dev/null | awk -F': ' '/Speed:/ {print $2}' | grep -v -iE '(Unknown|Configured)' | grep -E '[0-9]' | head -n1 | tr -d '\r\n')
    if [[ -n "$DMI_TYPES" ]]; then
        if [[ -n "$DMI_SPEED" ]]; then
            RAM_TIPO="${DMI_TYPES} (${DMI_SPEED})"
        else
            RAM_TIPO="${DMI_TYPES}"
        fi
    fi
fi

if [[ -z "$RAM_TIPO" ]] && command -v lshw >/dev/null 2>&1; then
    LSHW_TYPE=$(lshw -C memory 2>/dev/null | grep -iE 'description:.*(DDR[0-9]|LPDDR[0-9])' | head -n1 | grep -o -iE '(DDR[0-9]|LPDDR[0-9])' | tr '[:lower:]' '[:upper:]')
    LSHW_CLOCK=$(lshw -C memory 2>/dev/null | grep -iE 'clock:.*[0-9]' | head -n1 | grep -o -E '[0-9]+[A-Za-z]+' | head -n1)
    if [[ -n "$LSHW_TYPE" ]]; then
        if [[ -n "$LSHW_CLOCK" ]]; then
            RAM_TIPO="${LSHW_TYPE} (${LSHW_CLOCK})"
        else
            RAM_TIPO="${LSHW_TYPE}"
        fi
    fi
fi

# ----------------------------------------------------------
# Disco do sistema e detalhamento de partições
# ----------------------------------------------------------
DISCO_TOTAL=$(df -h / 2>/dev/null | awk 'NR==2 {print $2}')
DISCO_USADO=$(df -h / 2>/dev/null | awk 'NR==2 {print $3}')
DISCO_LIVRE=$(df -h / 2>/dev/null | awk 'NR==2 {print $4}')
DISCO_PERCENTUAL=$(df -h / 2>/dev/null | awk 'NR==2 {print $5}')

# Análise de múltiplos discos/pontos de montagem
ANALISE_DISCO='[]'
if command -v df >/dev/null 2>&1; then
    PARTICOES_JSON=$(df -h -P -x tmpfs -x devtmpfs -x squashfs 2>/dev/null | awk 'NR>1 {printf "{\"ponto_montagem\":\"%s\",\"total\":\"%s\",\"usado\":\"%s\",\"livre\":\"%s\",\"percentual\":\"%s\"},", $6, $2, $3, $4, $5}' | sed 's/,$//')
    if [[ -n "$PARTICOES_JSON" ]]; then
        ANALISE_DISCO="[${PARTICOES_JSON}]"
        if ! jq -e . <<< "$ANALISE_DISCO" >/dev/null 2>&1; then
            ANALISE_DISCO='[]'
        fi
    fi
fi

# ----------------------------------------------------------
# Domínio e Usuário
# ----------------------------------------------------------
DOMINIO=""
if command -v realm >/dev/null 2>&1; then
    DOMINIO=$(realm list 2>/dev/null | awk '/domain-name:/ {print $2; exit}' || true)
fi
if [[ -z "$DOMINIO" ]] && command -v domainname >/dev/null 2>&1; then
    DOMINIO=$(domainname 2>/dev/null || true)
    [[ "$DOMINIO" == "(none)" ]] && DOMINIO=""
fi

USUARIO=$(who 2>/dev/null | awk '{print $1}' | sort -u | paste -sd ', ' - || true)
if [[ -z "$USUARIO" ]]; then
    USUARIO=$(logname 2>/dev/null || echo "$USER" || true)
fi

# ----------------------------------------------------------
# RustDesk ID (Acesso Remoto)
# ----------------------------------------------------------
RUSTDESK_ID=""
if command -v rustdesk-giassi-cliente-li >/dev/null 2>&1; then
    RUSTDESK_ID=$(rustdesk-giassi-cliente-li --get-id 2>/dev/null | tail -n 1 || true)
elif command -v rustdesk >/dev/null 2>&1; then
    RUSTDESK_ID=$(rustdesk --get-id 2>/dev/null | tail -n 1 || true)
fi

if [[ -z "$RUSTDESK_ID" ]]; then
    for toml in /root/.config/rustdesk/RustDesk.toml /etc/rustdesk/RustDesk.toml /home/*/.config/rustdesk/RustDesk.toml; do
        if [[ -f "$toml" ]]; then
            RUSTDESK_ID=$(grep -E '^\s*id\s*=' "$toml" 2>/dev/null | head -n1 | grep -o '[0-9]\+' || true)
            [[ -n "$RUSTDESK_ID" ]] && break
        fi
    done
fi

DATA_COLETA=$(date '+%Y-%m-%d %H:%M:%S')

# ----------------------------------------------------------
# PERIFÉRICOS E DISPOSITIVOS CONECTADOS
# ----------------------------------------------------------
PERIFERICOS="[]"

# 1. Monitores conectados via DRM / Sysfs
for status_file in /sys/class/drm/*/status; do
    [[ -f "$status_file" ]] || continue
    if grep -q "^connected" "$status_file" 2>/dev/null; then
        port_dir=$(dirname "$status_file")
        port_name=$(basename "$port_dir" | sed 's/^[^-]*-//')
        edid_file="$port_dir/edid"
        nome_mon="$port_name"
        mfg_mon=""
        serial_mon=""

        if [[ -f "$edid_file" ]] && command -v strings >/dev/null 2>&1; then
            edid_lines=()
            while IFS= read -r line; do
                line_clean=$(echo "$line" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
                case "$line_clean" in
                    *[@+%,*]*) continue ;;
                esac
                if [[ ${#line_clean} -ge 3 ]]; then
                    edid_lines+=("$line_clean")
                fi
            done < <(strings "$edid_file" 2>/dev/null || true)

            if [[ ${#edid_lines[@]} -ge 1 ]]; then
                nome_mon="${edid_lines[0]}"
                mfg_mon=$(echo "$nome_mon" | awk '{print $1}')
            fi
            if [[ ${#edid_lines[@]} -ge 2 ]]; then
                serial_mon="${edid_lines[1]}"
            fi
        fi

        PERIFERICOS=$(jq -c \
            --arg tipo "monitor" \
            --arg nome "$nome_mon" \
            --arg mfg "$mfg_mon" \
            --arg serial "$serial_mon" \
            --arg conexao "$port_name" \
            '. += [{tipo: $tipo, nome: $nome, fabricante: $mfg, serial: $serial, conexao: $conexao}]' \
            <<< "$PERIFERICOS")
    fi
done

# 2. Periféricos USB (Teclado, Mouse, Smartphone, Webcams, etc.)
for dev in /sys/bus/usb/devices/*; do
    [[ -f "$dev/product" ]] || continue
    prod=$(cat "$dev/product" 2>/dev/null | tr -d '\r\n')
    [[ -z "$prod" ]] && continue
    mfg=$(cat "$dev/manufacturer" 2>/dev/null | tr -d '\r\n' || true)
    serial=$(cat "$dev/serial" 2>/dev/null | tr -d '\r\n' || true)

    prod_lower=$(echo "$prod $mfg" | tr '[:upper:]' '[:lower:]')
    if [[ "$prod_lower" =~ root[[:space:]]hub || "$prod_lower" =~ host[[:space:]]controller ]]; then
        continue
    fi

    tipo="outro"
    if [[ "$prod_lower" =~ keyboard|teclado ]]; then
        tipo="teclado"
    elif [[ "$prod_lower" =~ mouse|optical|trackball|touchpad ]]; then
        tipo="mouse"
    elif [[ "$prod_lower" =~ galaxy|android|iphone|xiaomi|motorola|huawei|pixel|phone|celular|mtp ]]; then
        tipo="smartphone"
    elif [[ "$prod_lower" =~ storage|flash|cruzer|datatraveler|ultra ]]; then
        tipo="armazenamento_usb"
    elif [[ "$prod_lower" =~ printer|impressora|deskjet|laserjet|epson ]]; then
        tipo="impressora"
    elif [[ "$prod_lower" =~ camera|webcam ]]; then
        tipo="webcam"
    elif [[ "$prod_lower" =~ headset|audio|sound|fone ]]; then
        tipo="audio"
    fi

    PERIFERICOS=$(jq -c \
        --arg tipo "$tipo" \
        --arg nome "$prod" \
        --arg mfg "$mfg" \
        --arg serial "$serial" \
        --arg conexao "USB" \
        '. += [{tipo: $tipo, nome: $nome, fabricante: $mfg, serial: $serial, conexao: $conexao}]' \
        <<< "$PERIFERICOS")
done

# 3. Discos USB via lsblk
if command -v lsblk >/dev/null 2>&1; then
    while read -r name tran size model; do
        if [[ "$tran" == "usb" && -n "$name" ]]; then
            model_clean="${model:-"Dispositivo USB"}"
            ja_tem=$(jq -r --arg n "$model_clean" '.[] | select(.nome == $n) | .nome' <<< "$PERIFERICOS" 2>/dev/null || true)
            if [[ -z "$ja_tem" ]]; then
                PERIFERICOS=$(jq -c \
                    --arg tipo "armazenamento_usb" \
                    --arg nome "$model_clean" \
                    --arg mfg "" \
                    --arg serial "" \
                    --arg conexao "USB ($size)" \
                    '. += [{tipo: $tipo, nome: $nome, fabricante: $mfg, serial: $serial, conexao: $conexao}]' \
                    <<< "$PERIFERICOS")
            fi
        fi
    done < <(lsblk -d -n -o NAME,TRAN,SIZE,MODEL 2>/dev/null || true)
fi

# ==========================================================
# APLICATIVOS / AGENTES / RUNTIMES / FERRAMENTAS
# ==========================================================

APLICATIVOS='[]'
AGENTES='[]'
RUNTIMES='[]'
FERRAMENTAS='[]'

# ----------------------------------------------------------
# Função para adicionar pacote novo
# ----------------------------------------------------------
adicionar_pacote() {
    local destino="$1"
    local id="$2"
    local nome="$3"
    local pacote="$4"
    local tipo="$5"

    local versao
    versao=$(dpkg-query -W -f='${Version}' "$pacote" 2>/dev/null || true)
    [[ -z "$versao" ]] && return

    local item
    item=$(jq -n \
        --arg id "$id" \
        --arg nome "$nome" \
        --arg pacote "$pacote" \
        --arg versao "$versao" \
        --arg tipo "$tipo" \
        '{
            id: $id,
            nome: $nome,
            pacotes: [
                {
                    pacote: $pacote,
                    versao: $versao
                }
            ],
            tipo: $tipo,
            origem: "apt"
        }')

    case "$destino" in
        aplicativos)
            APLICATIVOS=$(jq --argjson item "$item" '. + [$item]' <<< "$APLICATIVOS")
            ;;
        agentes)
            AGENTES=$(jq --argjson item "$item" '. + [$item]' <<< "$AGENTES")
            ;;
        runtimes)
            RUNTIMES=$(jq --argjson item "$item" '. + [$item]' <<< "$RUNTIMES")
            ;;
        ferramentas)
            FERRAMENTAS=$(jq --argjson item "$item" '. + [$item]' <<< "$FERRAMENTAS")
            ;;
    esac
}

# ----------------------------------------------------------
# Função para adicionar pacote dentro de item já existente
# ----------------------------------------------------------
adicionar_pacote_existente() {
    local destino="$1"
    local id="$2"
    local pacote="$3"

    local versao
    versao=$(dpkg-query -W -f='${Version}' "$pacote" 2>/dev/null || true)
    [[ -z "$versao" ]] && return

    case "$destino" in
        aplicativos)
            APLICATIVOS=$(jq \
                --arg id "$id" \
                --arg pacote "$pacote" \
                --arg versao "$versao" \
                'map(if .id == $id then .pacotes += [{pacote: $pacote, versao: $versao}] else . end)' <<< "$APLICATIVOS")
            ;;
        agentes)
            AGENTES=$(jq \
                --arg id "$id" \
                --arg pacote "$pacote" \
                --arg versao "$versao" \
                'map(if .id == $id then .pacotes += [{pacote: $pacote, versao: $versao}] else . end)' <<< "$AGENTES")
            ;;
        runtimes)
            RUNTIMES=$(jq \
                --arg id "$id" \
                --arg pacote "$pacote" \
                --arg versao "$versao" \
                'map(if .id == $id then .pacotes += [{pacote: $pacote, versao: $versao}] else . end)' <<< "$RUNTIMES")
            ;;
        ferramentas)
            FERRAMENTAS=$(jq \
                --arg id "$id" \
                --arg pacote "$pacote" \
                --arg versao "$versao" \
                'map(if .id == $id then .pacotes += [{pacote: $pacote, versao: $versao}] else . end)' <<< "$FERRAMENTAS")
            ;;
    esac
}

# ----------------------------------------------------------
# Pacotes excluídos (bibliotecas internas e libs de sistema)
# ----------------------------------------------------------
eh_excluido() {
    local pacote="$1"
    case "$pacote" in
        lib*|fonts-*|language-pack-*|hunspell-*|hyphen-*|mythes-*) return 0 ;;
        wamerican|wbrazilian|wbritish|wportuguese) return 0 ;;
        libreoffice-help-*|libreoffice-l10n-*|gnome-user-docs-*) return 0 ;;
        zorin-os-*|grub-*|linux-generic*|shim-*) return 0 ;;
        apt-transport-https|brave-keyring|distro-info-data|efibootmgr|mokutil) return 0 ;;
        software-properties-common|poppler-data|python3-typing-extensions|python3-pkg-resources) return 0 ;;
        libglib2.0-dev-bin|xserver-xorg|kdialog|system-config-printer|dbus-x11|dialog|exfat-fuse|expect|default-jre) return 0 ;;
    esac
    return 1
}

# ----------------------------------------------------------
# Descoberta Dinâmica de Pacotes Instalados Manualmente
# ----------------------------------------------------------
if command -v apt-mark >/dev/null 2>&1; then
    while read -r pacote; do
        [[ -z "$pacote" ]] && continue

        STATUS_PACOTE=$(dpkg-query -W -f='${Status}' "$pacote" 2>/dev/null || true)
        [[ "$STATUS_PACOTE" != "install ok installed" ]] && continue

        PRIORIDADE=$(apt-cache show "$pacote" 2>/dev/null | awk -F': ' '/^Priority:/ {print $2; exit}' || true)
        case "$PRIORIDADE" in
            optional|extra) ;;
            *) continue ;;
        esac

        if eh_excluido "$pacote"; then
            continue
        fi

        # Mapeamentos específicos
        if [[ "$pacote" == "cid-gtk" ]]; then
            if ! jq -e '.[] | select(.id == "cid")' <<< "$APLICATIVOS" >/dev/null 2>&1; then
                adicionar_pacote "aplicativos" "cid" "CID" "cid-gtk" "aplicativo"
            fi
            continue
        fi

        if [[ "$pacote" == "cid" ]]; then
            if jq -e '.[] | select(.id == "cid")' <<< "$APLICATIVOS" >/dev/null 2>&1; then
                adicionar_pacote_existente "aplicativos" "cid" "cid"
            else
                adicionar_pacote "aplicativos" "cid" "CID" "cid" "aplicativo"
            fi
            continue
        fi

        if [[ "$pacote" == "zabbix-agent2" ]]; then
            adicionar_pacote "agentes" "zabbix-agent2" "Zabbix Agent 2" "zabbix-agent2" "agente"
            continue
        fi

        if [[ "$pacote" == "zabbix-agent2-plugin-postgresql" ]]; then
            if jq -e '.[] | select(.id == "zabbix-agent2")' <<< "$AGENTES" >/dev/null 2>&1; then
                adicionar_pacote_existente "agentes" "zabbix-agent2" "zabbix-agent2-plugin-postgresql"
            fi
            continue
        fi

        if [[ "$pacote" == "wazuh-agent" ]]; then
            adicionar_pacote "agentes" "wazuh-agent" "Wazuh Agent" "wazuh-agent" "agente"
            continue
        fi

        if [[ "$pacote" == "openjdk-8-jre" ]]; then
            adicionar_pacote "runtimes" "java-8" "OpenJDK Java 8 Runtime" "openjdk-8-jre" "runtime"
            continue
        fi

        case "$pacote" in
            google-chrome-stable)
                adicionar_pacote "aplicativos" "google-chrome" "Google Chrome" "$pacote" "aplicativo"
                continue
                ;;
            firefox)
                adicionar_pacote "aplicativos" "firefox" "Firefox" "$pacote" "aplicativo"
                continue
                ;;
            rustdesk-giassi-cliente-li)
                adicionar_pacote "aplicativos" "rustdesk-giassi" "RustDesk Giassi Cliente" "$pacote" "aplicativo"
                continue
                ;;
            hplip-gui)
                adicionar_pacote "ferramentas" "hplip" "HPLIP" "$pacote" "ferramenta"
                continue
                ;;
        esac

        # Verificação se possui arquivo .desktop de lançador gráfico
        POSSUI_DESKTOP=false
        if dpkg -L "$pacote" 2>/dev/null | grep -qE '^/usr/share/applications/[^/]+\.desktop$'; then
            POSSUI_DESKTOP=true
        fi

        if [[ "$POSSUI_DESKTOP" == true ]]; then
            DESKTOP=$(dpkg -L "$pacote" 2>/dev/null | grep -E '^/usr/share/applications/[^/]+\.desktop$' | head -n 1)
            NOME=$(grep -m1 '^Name=' "$DESKTOP" 2>/dev/null | cut -d '=' -f2- || true)
            [[ -z "$NOME" ]] && NOME="$pacote"
            ID=$(echo "$pacote" | sed 's/:.*//' | tr '_' '-' | tr '[:upper:]' '[:lower:]')
            adicionar_pacote "aplicativos" "$ID" "$NOME" "$pacote" "aplicativo"
        else
            case "$pacote" in
                chrony) NOME="Chrony" ;;
                gcc) NOME="GNU Compiler Collection" ;;
                gnupg) NOME="GnuPG" ;;
                locate) NOME="Locate" ;;
                net-tools) NOME="Net-tools" ;;
                ntpdate) NOME="NTPDate" ;;
                python3-pip) NOME="Python PIP" ;;
                rdesktop) NOME="rdesktop" ;;
                screen) NOME="GNU Screen" ;;
                smartmontools) NOME="Smartmontools" ;;
                snmp) NOME="SNMP" ;;
                ssh) NOME="OpenSSH" ;;
                unrar) NOME="UnRAR" ;;
                vim) NOME="Vim" ;;
                wpasupplicant) NOME="wpa_supplicant" ;;
                *) NOME="$pacote" ;;
            esac
            ID=$(echo "$pacote" | sed 's/:.*//' | tr '_' '-' | tr '[:upper:]' '[:lower:]')
            adicionar_pacote "ferramentas" "$ID" "$NOME" "$pacote" "ferramenta"
        fi

    done < <(apt-mark showmanual 2>/dev/null || true)
fi

# ----------------------------------------------------------
# Ordenação de Softwares
# ----------------------------------------------------------
APLICATIVOS=$(jq 'sort_by(.nome)' <<< "$APLICATIVOS")
AGENTES=$(jq 'sort_by(.nome)' <<< "$AGENTES")
RUNTIMES=$(jq 'sort_by(.nome)' <<< "$RUNTIMES")
FERRAMENTAS=$(jq 'sort_by(.nome)' <<< "$FERRAMENTAS")

# ==========================================================
# GERAÇÃO DO PAYLOAD DE INVENTÁRIO
# ==========================================================
jq -n \
    --arg hostname "$HOSTNAME" \
    --arg loja "$LOJA" \
    --arg ip "$IP" \
    --arg ip_secundario "$IP_SECUNDARIO" \
    --arg mac "$MAC" \
    --arg sistema "$OS_ID" \
    --arg versao "$OS_VERSION" \
    --arg build "$OS_BUILD" \
    --arg status "$STATUS" \
    --arg processador "$PROCESSADOR" \
    --arg ram_total "$RAM_TOTAL" \
    --arg ram_tipo "$RAM_TIPO" \
    --arg disco_total "$DISCO_TOTAL" \
    --arg disco_usado "$DISCO_USADO" \
    --arg disco_livre "$DISCO_LIVRE" \
    --arg disco_percentual "$DISCO_PERCENTUAL" \
    --arg rustdesk_id "$RUSTDESK_ID" \
    --arg fabricante "$FABRICANTE" \
    --arg modelo "$MODELO" \
    --arg serial "$SERIAL" \
    --arg dominio "$DOMINIO" \
    --arg usuario "$USUARIO" \
    --arg data_coleta "$DATA_COLETA" \
    --argjson analise_disco "$ANALISE_DISCO" \
    --argjson perifericos "$PERIFERICOS" \
    --argjson aplicativos "$APLICATIVOS" \
    --argjson agentes "$AGENTES" \
    --argjson runtimes "$RUNTIMES" \
    --argjson ferramentas "$FERRAMENTAS" \
'{
    hostname: $hostname,
    loja: $loja,
    ip: $ip,
    ip_secundario: $ip_secundario,
    mac: $mac,
    sistema: $sistema,
    versao: $versao,
    build: $build,
    status: $status,
    processador: $processador,
    ram_total: $ram_total,
    ram_tipo: $ram_tipo,
    disco_total: $disco_total,
    disco_usado: $disco_usado,
    disco_livre: $disco_livre,
    disco_percentual: $disco_percentual,
    analise_disco: $analise_disco,
    perifericos: $perifericos,
    rustdesk_id: $rustdesk_id,
    fabricante: $fabricante,
    modelo: $modelo,
    serial: $serial,
    dominio: $dominio,
    usuario: $usuario,
    aplicativos: $aplicativos,
    agentes: $agentes,
    runtimes: $runtimes,
    ferramentas: $ferramentas,
    data_coleta: $data_coleta
}' > "$ARQUIVO_ATUAL"

# ==========================================================
# ENVIO COM DETECÇÃO DE ALTERAÇÕES
# ==========================================================
DEVE_ENVIAR=true

if [[ "$FORCAR_ENVIO" != true && -f "$ARQUIVO_ULTIMO" ]]; then
    ATUAL_HASH=$(jq -S 'del(.data_coleta)' "$ARQUIVO_ATUAL" | md5sum | awk '{print $1}')
    ULTIMO_HASH=$(jq -S 'del(.data_coleta)' "$ARQUIVO_ULTIMO" | md5sum | awk '{print $1}')

    if [[ "$ATUAL_HASH" == "$ULTIMO_HASH" ]]; then
        DEVE_ENVIAR=false
    fi
fi

if [[ "$DEVE_ENVIAR" == true ]]; then
    echo "[*] Enviando inventário para: $URL_SERVIDOR"
    RESPOSTA=$(curl -sS -k \
        --connect-timeout 10 \
        --max-time 30 \
        -H "Content-Type: application/json; charset=utf-8" \
        --data @"$ARQUIVO_ATUAL" \
        "$URL_SERVIDOR" || echo "ERRO_CONEXAO")

    # Suporta tanto "OK" textual quanto resposta JSON {"status":"ok"...}
    if [[ "$RESPOSTA" == *"OK"* || "$RESPOSTA" == *"ok"* || "$RESPOSTA" == *"device_id"* ]]; then
        cp "$ARQUIVO_ATUAL" "$ARQUIVO_ULTIMO"
        echo "[+] Inventário enviado e atualizado com sucesso!"
    else
        echo "[-] Falha ao enviar inventário."
        echo "[-] Resposta do servidor: $RESPOSTA"
        exit 1
    fi
else
    echo "[i] Nenhuma alteração detectada no hardware ou softwares. Envio ignorado (use --force para forçar)."
fi
