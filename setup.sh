#!/usr/bin/env bash
# ==============================================================================
#  SISTEMA DE INVENTÁRIO - INSTALADOR TURNKEY (LINUX)
#  Prepara e inicializa todo o ecossistema Docker do zero em um servidor limpo.
# ==============================================================================

set -e

# Cores para o terminal
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # Sem Cor

echo ""
echo -e "${CYAN}==================================================================${NC}"
echo -e "${BOLD}${CYAN}   SISTEMA DE INVENTÁRIO CORPORATIVO - INSTALADOR TURNKEY${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo -e " Este assistente irá configurar o servidor e inicializar todos"
echo -e " os serviços em containers Docker de forma 100% automatizada."
echo ""

# ------------------------------------------------------------------------------
# 1. Checagem de Pré-requisitos
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/6] Verificando pré-requisitos do sistema...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}[X] Docker não foi encontrado neste servidor!${NC}"
    echo "    Para instalar o Docker no Linux, execute:"
    echo "    curl -fsSL https://get.docker.com | sh"
    echo "    sudo usermod -aG docker \$USER"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}[X] O serviço do Docker não está rodando ou seu usuário não tem permissão.${NC}"
    echo "    Tente rodar com: sudo ./setup.sh"
    exit 1
fi

# Suporte tanto para 'docker compose' (v2) quanto 'docker-compose' (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}[X] Plugin 'docker compose' não encontrado!${NC}"
    echo "    Instale via: sudo apt-get install docker-compose-plugin (ou equivalente)."
    exit 1
fi

echo -e "${GREEN}[✓] Docker e Docker Compose operacionais.${NC}"
echo ""

# ------------------------------------------------------------------------------
# 2. Perguntas Interativas de Configuração
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/6] Coleta de parâmetros da instalação:${NC}"
echo "------------------------------------------------------------------"

# Detecta IP primário da máquina
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$HOST_IP" ]; then
    HOST_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
fi
if [ -z "$HOST_IP" ]; then
    HOST_IP="127.0.0.1"
fi

# Nome da Empresa
read -p " Nome da empresa [Giassi Supermercados]: " INPUT_COMPANY_NAME
COMPANY_NAME=${INPUT_COMPANY_NAME:-"Giassi Supermercados"}

# Slug da Empresa
DEFAULT_SLUG=$(echo "$COMPANY_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]')
[ -z "$DEFAULT_SLUG" ] && DEFAULT_SLUG="giassi"
read -p " Identificador curto / slug da empresa [$DEFAULT_SLUG]: " INPUT_COMPANY_SLUG
COMPANY_SLUG=${INPUT_COMPANY_SLUG:-"$DEFAULT_SLUG"}

# IP ou DNS do Servidor
read -p " IP ou DNS de acesso ao servidor [$HOST_IP]: " INPUT_SERVER_HOST
SERVER_HOST=${INPUT_SERVER_HOST:-"$HOST_IP"}

# Portas Web
read -p " Porta HTTPS [443]: " INPUT_PORT_HTTPS
PORT_HTTPS=${INPUT_PORT_HTTPS:-443}

read -p " Porta HTTP [80]: " INPUT_PORT_HTTP
PORT_HTTP=${INPUT_PORT_HTTP:-80}

# Banco de Dados
read -p " Nome do banco de dados [${COMPANY_SLUG}_inventory]: " INPUT_POSTGRES_DB
POSTGRES_DB=${INPUT_POSTGRES_DB:-"${COMPANY_SLUG}_inventory"}

read -p " Usuário do banco de dados [${COMPANY_SLUG}_app]: " INPUT_POSTGRES_USER
POSTGRES_USER=${INPUT_POSTGRES_USER:-"${COMPANY_SLUG}_app"}

# Senha do Banco
SUGGESTED_DB_PASS=$(openssl rand -hex 8 2>/dev/null || date +%s | sha256sum | head -c 16)
read -p " Senha do banco de dados [$SUGGESTED_DB_PASS]: " INPUT_POSTGRES_PASS
POSTGRES_PASSWORD=${INPUT_POSTGRES_PASS:-"$SUGGESTED_DB_PASS"}

# Usuário Admin
read -p " Usuário administrador do sistema [admin]: " INPUT_ADMIN_USER
ADMIN_USER=${INPUT_ADMIN_USER:-"admin"}

read -p " Nome completo do administrador [Administrador do Sistema]: " INPUT_ADMIN_FULLNAME
ADMIN_FULLNAME=${INPUT_ADMIN_FULLNAME:-"Administrador do Sistema"}

read -p " E-mail do administrador [admin@${COMPANY_SLUG}.com.br]: " INPUT_ADMIN_EMAIL
ADMIN_EMAIL=${INPUT_ADMIN_EMAIL:-"admin@${COMPANY_SLUG}.com.br"}

# Senha do Admin (com máscara)
while true; do
    echo -n " Digite a senha do usuário admin inicial: "
    read -s ADMIN_PASSWORD
    echo ""
    if [ ${#ADMIN_PASSWORD} -lt 6 ]; then
        echo -e "${RED} [!] A senha deve conter pelo menos 6 caracteres.${NC}"
        continue
    fi
    echo -n " Confirme a senha do admin: "
    read -s ADMIN_PASSWORD_CONFIRM
    echo ""
    if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
        echo -e "${RED} [!] As senhas não coincidem. Tente novamente.${NC}"
    else
        break
    fi
done

# Filiais padrão
read -p " Criar lista padrão de filiais (Lojas 01 a 30, Combos, Matriz)? [S/n]: " INPUT_DEFAULT_SITES
INPUT_DEFAULT_SITES=${INPUT_DEFAULT_SITES:-"S"}
if [[ "$INPUT_DEFAULT_SITES" =~ ^[Nn] ]]; then
    CREATE_SITES_FLAG="--no-default-sites"
else
    CREATE_SITES_FLAG=""
fi

echo ""
# ------------------------------------------------------------------------------
# 3. Geração do Arquivo .env e Configurações de Segurança
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/6] Gerando variáveis de ambiente (.env) e chaves JWT...${NC}"

# Chave secreta de 256 bits criptográfica
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || date +%s%N | sha256sum | head -c 64)

cat <<EOF > .env
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_PORT=5432
JWT_SECRET_KEY=${JWT_SECRET}
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
SERVER_HOST=${SERVER_HOST}
PORT_HTTP=${PORT_HTTP}
PORT_HTTPS=${PORT_HTTPS}
EOF

echo -e "${GREEN}[✓] Arquivo .env gerado com sucesso.${NC}"

# ------------------------------------------------------------------------------
# 4. Compilação do Frontend (Via container Node isolado)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/6] Verificando compilação do painel frontend...${NC}"

if [ ! -f "./frontend/dist/index.html" ]; then
    echo " [*] Compilando arquivos do frontend via container Node.js (não requer Node no servidor)..."
    docker run --rm \
        -v "$(pwd)/frontend:/app" \
        -w /app \
        node:20-alpine \
        sh -c "npm install && npm run build"
    echo -e "${GREEN}[✓] Frontend compilado em ./frontend/dist!${NC}"
else
    echo -e "${GREEN}[✓] Frontend já compilado anteriormente.${NC}"
fi

# ------------------------------------------------------------------------------
# 5. Inicialização dos Containers e Migrações
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[5/6] Construindo e iniciando containers Docker...${NC}"

# Detecta se existe volume antigo de banco de dados
if docker volume ls -q 2>/dev/null | grep -E "postgres_data" &>/dev/null; then
    echo -e "${YELLOW} [!] Foi detectado um volume de banco de dados pré-existente.${NC}"
    echo "     Para garantir que as novas credenciais sejam aplicadas com sucesso:"
    read -p "     Deseja recriar o banco de dados do zero? [S/n]: " RESET_DB
    RESET_DB=${RESET_DB:-"S"}
    if [[ ! "$RESET_DB" =~ ^[Nn] ]]; then
        echo " [*] Resetando banco para instalação limpa..."
        $DOCKER_COMPOSE down -v --remove-orphans 2>/dev/null || true
    else
        $DOCKER_COMPOSE down --remove-orphans 2>/dev/null || true
    fi
else
    $DOCKER_COMPOSE down --remove-orphans 2>/dev/null || true
fi

$DOCKER_COMPOSE up -d --build

echo " [*] Aguardando o banco de dados PostgreSQL ficar pronto para conexões..."
MAX_ATTEMPTS=30
ATTEMPT=0
until $DOCKER_COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" &>/dev/null; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}[X] Tempo limite esgotado esperando o PostgreSQL.${NC}"
        $DOCKER_COMPOSE logs postgres
        exit 1
    fi
    sleep 1
done
echo -e "${GREEN}[✓] Banco de dados PostgreSQL online.${NC}"

echo " [*] Executando migrações estruturais do banco (Alembic)..."
$DOCKER_COMPOSE exec -T backend alembic upgrade head

echo " [*] Criando empresa, perfis e usuário administrador inicial..."
$DOCKER_COMPOSE exec -T backend python -m app.seeds.seed_turnkey \
    --company-name "$COMPANY_NAME" \
    --company-slug "$COMPANY_SLUG" \
    --admin-username "$ADMIN_USER" \
    --admin-fullname "$ADMIN_FULLNAME" \
    --admin-email "$ADMIN_EMAIL" \
    --admin-password "$ADMIN_PASSWORD" \
    $CREATE_SITES_FLAG

# ------------------------------------------------------------------------------
# 6. Conclusão e Resumo da Instalação
# ------------------------------------------------------------------------------
echo ""
echo -e "${CYAN}==================================================================${NC}"
echo -e "${BOLD}${GREEN}   INSTALAÇÃO CONCLUÍDA COM SUCESSO! 🚀${NC}"
echo -e "${CYAN}==================================================================${NC}"
if [ "$PORT_HTTPS" -eq 443 ]; then
    URL_PAINEL="https://${SERVER_HOST}"
else
    URL_PAINEL="https://${SERVER_HOST}:${PORT_HTTPS}"
fi

echo -e " ${BOLD}Painel de Acesso:${NC}     ${GREEN}${URL_PAINEL}${NC}"
echo -e " ${BOLD}Usuário Admin:${NC}        ${YELLOW}${ADMIN_USER}${NC}"
echo -e " ${BOLD}Empresa:${NC}              ${CYAN}${COMPANY_NAME}${NC}"
echo -e "------------------------------------------------------------------"
echo -e " ${BOLD}Comandos para instalar os agentes nas máquinas:${NC}"
echo ""
echo -e " ${BOLD}• Windows (PowerShell como Administrador):${NC}"
echo -e "   ${CYAN}irm ${URL_PAINEL}/api/v1/agent/windows | iex${NC}"
echo ""
echo -e " ${BOLD}• Linux (Terminal / Bash como Root):${NC}"
echo -e "   ${CYAN}curl -sSL ${URL_PAINEL}/api/v1/agent/linux | sudo bash${NC}"
echo -e "------------------------------------------------------------------"
echo -e " ${YELLOW}[i] Dica de Certificado SSL:${NC}"
echo -e "     Um certificado auto-assinado válido por 10 anos foi gerado."
echo -e "     Caso deseje usar o certificado oficial da sua empresa, basta"
echo -e "     substituir os arquivos em: ${BOLD}./nginx/certs/giassi.crt${NC} e ${BOLD}.key${NC}"
echo -e "     e rodar: ${BOLD}docker exec giassi-nginx nginx -s reload${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo ""
