#!/usr/bin/env bash
# ==============================================================================
#  SISTEMA DE INVENTÁRIO - AUDITORIA DE REQUISITOS DE FIREWALL / REDE
#  Verifica e diagnostica conectividade com os domínios necessários para
#  executar o setup.sh e o update.sh, ou captura requisições em tempo real.
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

REPORT_FILE="firewall_report.txt"
CAPTURED_FILE="firewall_captured_domains.log"

# Lista de domínios essenciais com porta e justificativa
# Formato: DOMINIO|PORTA|CATEGORIA|DESCRICAO
TARGETS=(
    "github.com|443|Git / Código Fonte|Repositório do projeto (git fetch, git pull, git clone)"
    "api.github.com|443|Git / Código Fonte|API do GitHub para metadados e autenticação"
    "objects.githubusercontent.com|443|Git / Código Fonte|CDN de objetos, releases e downloads do GitHub"
    "registry-1.docker.io|443|Docker Hub|Registro primário de imagens Docker (python, postgres, nginx, node)"
    "auth.docker.io|443|Docker Hub|Serviço de autenticação e tokens do Docker Hub"
    "production.cloudflare.docker.com|443|Docker Hub|CDN de download dos blobs/camadas das imagens Docker"
    "hub.docker.com|443|Docker Hub|Catálogo e API do Docker Hub"
    "pypi.org|443|Backend Python (PyPI)|Índice de pacotes Python para dependências do backend"
    "files.pythonhosted.org|443|Backend Python (PyPI)|CDN de download dos pacotes .whl e tar.gz do Python"
    "deb.debian.org|80|Containers Debian|Repositório de pacotes Debian (iputils-ping no backend)"
    "security.debian.org|80|Containers Debian|Atualizações de segurança Debian"
    "dl-cdn.alpinelinux.org|443|Containers Alpine|Repositório Alpine Linux (openssl, curl no nginx)"
    "registry.npmjs.org|443|Frontend Node.js|Registro NPM para compilação do painel frontend"
    "fonts.googleapis.com|443|Web / Painel|Google Fonts (Inter, JetBrains Mono para o painel)"
    "fonts.gstatic.com|443|Web / Painel|CDN de fontes estáticas Google"
)

usage() {
    echo ""
    echo -e "${BOLD}Uso:${NC} $0 [opções]"
    echo ""
    echo -e "  ${CYAN}--test, -t${NC}                Testa a conectividade com todos os domínios necessários (Padrão)"
    echo -e "  ${CYAN}--monitor <cmd>, -m <cmd>${NC} Executa um comando (ex: ./update.sh) gravando todas as requisições"
    echo -e "                            DNS em tempo real para capturar os domínios exatos acessados."
    echo -e "  ${CYAN}--help, -h${NC}                Exibe esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0"
    echo "  $0 --test"
    echo "  sudo $0 --monitor ./update.sh"
    echo "  sudo $0 --monitor ./setup.sh"
    echo ""
}

test_single_target() {
    local host="$1"
    local port="$2"

    # Usa python se disponível para teste preciso de socket TCP
    if command -v python3 &>/dev/null; then
        python3 -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2.5)
try:
    s.connect(('$host', int('$port')))
    s.close()
    sys.exit(0)
except socket.gaierror:
    sys.exit(2) # Erro de DNS
except Exception:
    sys.exit(1) # Bloqueio / Timeout
" 2>/dev/null
        return $?
    fi

    # Fallback para curl
    if command -v curl &>/dev/null; then
        if curl -s --connect-timeout 3 "http://$host:$port" &>/dev/null || [ $? -eq 52 ] || [ $? -eq 56 ]; then
            return 0
        fi
    fi

    # Fallback para nc
    if command -v nc &>/dev/null; then
        if nc -z -w 3 "$host" "$port" &>/dev/null; then
            return 0
        fi
    fi

    return 1
}

run_diagnostics() {
    echo ""
    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${BOLD}${CYAN}   SISTEMA DE INVENTÁRIO - AUDITORIA DE REGRAS DE FIREWALL${NC}"
    echo -e "${CYAN}==================================================================${NC}"
    echo -e " Testando conectividade com domínios necessários para setup e update..."
    echo ""

    local total=${#TARGETS[@]}
    local ok_count=0
    local fail_count=0
    local dns_fail_count=0

    # Inicializa cabeçalho do relatório em arquivo
    {
        echo "=================================================================="
        echo "   RELATÓRIO DE CONECTIVIDADE E REGRAS DE FIREWALL"
        echo "   Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "   Servidor:  $(hostname) ($(hostname -I 2>/dev/null | awk '{print $1}'))"
        echo "=================================================================="
        echo ""
        printf "%-35s %-8s %-12s %-25s %s\n" "DOMÍNIO (FQDN)" "PORTA" "STATUS" "CATEGORIA" "FINALIDADE"
        echo "----------------------------------------------------------------------------------------------------------------"
    } > "$REPORT_FILE"

    local current_cat=""

    for item in "${TARGETS[@]}"; do
        IFS="|" read -r host port cat desc <<< "$item"

        if [ "$cat" != "$current_cat" ]; then
            echo -e "${BOLD}--- [ $cat ] ---${NC}"
            current_cat="$cat"
        fi

        test_single_target "$host" "$port"
        local res=$?

        if [ $res -eq 0 ]; then
            echo -e "  [${GREEN}LIBERADO${NC}]   ${BOLD}$host${NC}:$port - $desc"
            printf "%-35s %-8s %-12s %-25s %s\n" "$host" "$port" "LIBERADO" "$cat" "$desc" >> "$REPORT_FILE"
            ok_count=$((ok_count + 1))
        elif [ $res -eq 2 ]; then
            echo -e "  [${YELLOW}DNS FALHOU${NC}] $host:$port - Falha na resolução de nomes (DNS bloqueado?)"
            printf "%-35s %-8s %-12s %-25s %s\n" "$host" "$port" "FALHA DNS" "$cat" "$desc" >> "$REPORT_FILE"
            dns_fail_count=$((dns_fail_count + 1))
        else
            echo -e "  [${RED}BLOQUEADO${NC}]  ${BOLD}$host${NC}:$port - $desc"
            printf "%-35s %-8s %-12s %-25s %s\n" "$host" "$port" "BLOQUEADO" "$cat" "$desc" >> "$REPORT_FILE"
            fail_count=$((fail_count + 1))
        fi
    done

    {
        echo "----------------------------------------------------------------------------------------------------------------"
        echo ""
        echo "RESUMO GERAL:"
        echo "  Total de destinos verificados: $total"
        echo "  Liberados:                     $ok_count"
        echo "  Bloqueados / Sem resposta:     $fail_count"
        echo "  Falha na resolução de DNS:     $dns_fail_count"
        echo ""
        echo "RECOMENDAÇÃO PARA O TIME DE FIREWALL:"
        echo "  Para permitir a instalação e atualização contínua deste servidor,"
        echo "  libere conexões TCP de saída (Egress) para os domínios listados acima nas portas indicadas."
    } >> "$REPORT_FILE"

    echo ""
    echo -e "${CYAN}==================================================================${NC}"
    echo -e " ${BOLD}Resumo:${NC} ${GREEN}$ok_count liberados${NC} | ${RED}$fail_count bloqueados${NC} | ${YELLOW}$dns_fail_count erros de DNS${NC}"
    echo -e " Relatório salvo com sucesso em: ${BOLD}${GREEN}$REPORT_FILE${NC}"
    echo -e "${CYAN}==================================================================${NC}"
    echo ""
}

run_monitor() {
    local cmd="$*"
    if [ -z "$cmd" ]; then
        echo -e "${RED}[X] Erro: Informe o comando a ser executado e monitorado.${NC}"
        echo "    Exemplo: sudo $0 --monitor ./update.sh"
        exit 1
    fi

    if ! command -v tcpdump &>/dev/null; then
        echo -e "${RED}[X] 'tcpdump' não está instalado no servidor.${NC}"
        echo "    Instale via: sudo apt-get install tcpdump (ou equivalente)."
        exit 1
    fi

    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}[!] O monitoramento via tcpdump requer privilégios de root (sudo).${NC}"
        echo "    Execute novamente com: sudo $0 --monitor $cmd"
        exit 1
    fi

    echo ""
    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${BOLD}${CYAN}   MONITORAMENTO DE REQUISIÇÕES DE REDE EM TEMPO REAL${NC}"
    echo -e "${CYAN}==================================================================${NC}"
    echo " [*] Iniciando captura de tráfego DNS (port 53 UDP) em background..."
    echo " [*] Executando comando: $cmd"
    echo ""

    local raw_dump="/tmp/inventory_firewall_raw_$$.log"
    rm -f "$raw_dump"

    # Inicia tcpdump em background capturando queries DNS
    tcpdump -i any -n -l "udp port 53" > "$raw_dump" 2>/dev/null &
    local dump_pid=$!
    sleep 1

    # Executa o comando desejado pelo usuário
    set +e
    eval "$cmd"
    local cmd_status=$?
    set -e

    # Para a captura
    sleep 1
    kill "$dump_pid" 2>/dev/null || true
    wait "$dump_pid" 2>/dev/null || true

    echo ""
    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${BOLD}${GREEN}   MONITORAMENTO CONCLUÍDO!${NC}"
    echo -e "${CYAN}==================================================================${NC}"

    # Extrai os domínios únicos acessados
    if [ -f "$raw_dump" ]; then
        python3 - "$raw_dump" "$CAPTURED_FILE" "$cmd" << 'EOF'
import re, sys
raw_file = sys.argv[1]
out_file = sys.argv[2]
cmd_str = sys.argv[3]
domains = set()

try:
    with open(raw_file, 'r', errors='ignore') as f:
        for line in f:
            matches = re.findall(r'(?:A\?|AAAA\?)\s+([a-zA-Z0-9.-]+)', line)
            for m in matches:
                clean = m.rstrip('.').lower()
                if not clean.endswith('in-addr.arpa') and not clean.endswith('ip6.arpa') and clean:
                    domains.add(clean)
except Exception as e:
    print('Erro processando captura:', e)

with open(out_file, 'w') as out:
    out.write('==================================================================\n')
    out.write(f'  DOMÍNIOS ACESSADOS DURANTE A EXECUÇÃO: {cmd_str}\n')
    out.write('==================================================================\n\n')
    for d in sorted(list(domains)):
        out.write(d + '\n')

print(f' [+] Foram identificados {len(domains)} domínios únicos requisitados.')
EOF
        rm -f "$raw_dump"
        echo -e " Lista de domínios capturados salva em: ${BOLD}${GREEN}$CAPTURED_FILE${NC}"
        echo ""
        echo -e "${BOLD}Domínios capturados durante a execução:${NC}"
        cat "$CAPTURED_FILE" | grep -v '^=' | grep -v '^ ' | sed '/^$/d' | sed 's/^/  • /'
    fi

    echo ""
    exit $cmd_status
}

# Tratamento de argumentos
if [ $# -eq 0 ] || [ "$1" = "--test" ] || [ "$1" = "-t" ]; then
    run_diagnostics
elif [ "$1" = "--monitor" ] || [ "$1" = "-m" ]; then
    shift
    run_monitor "$@"
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    usage
else
    echo -e "${RED}[X] Opção desconhecida: $1${NC}"
    usage
    exit 1
fi
