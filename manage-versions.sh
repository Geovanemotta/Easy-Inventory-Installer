#!/usr/bin/env bash
# ==============================================================================
#  SISTEMA DE INVENTÁRIO - GERENCIADOR DE VERSÕES DE IMAGENS E TECNOLOGIAS
#  Permite auditar, atualizar e reverter com total segurança as versões base
#  (Nginx, Node, Python, PostgreSQL) antes de subir alterações para produção.
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKUP_ROOT="${SCRIPT_DIR}/backups"
LATEST_LINK="${BACKUP_ROOT}/latest_version_backup"

# Arquivos gerenciados
FILE_NGINX_DOCKERFILE="nginx/Dockerfile"
FILE_FRONTEND_DOCKERFILE="frontend/Dockerfile"
FILE_BACKEND_DOCKERFILE="backend/Dockerfile"
FILE_DOCKER_COMPOSE="docker-compose.yml"
FILE_README="README.md"
FILE_DOC="DOCUMENTACAO_TECNICA.md"

# ------------------------------------------------------------------------------
# Helpers para leitura de versões atuais
# ------------------------------------------------------------------------------
get_current_nginx_version() {
    if [ -f "$FILE_NGINX_DOCKERFILE" ]; then
        grep -E '^FROM nginx:' "$FILE_NGINX_DOCKERFILE" | head -n 1 | sed -E 's/FROM nginx:([a-zA-Z0-9.-]+).*/\1/'
    else
        echo "desconhecido"
    fi
}

get_current_node_version() {
    if [ -f "$FILE_FRONTEND_DOCKERFILE" ]; then
        grep -E '^FROM node:' "$FILE_FRONTEND_DOCKERFILE" | head -n 1 | sed -E 's/FROM node:([a-zA-Z0-9.-]+).*/\1/'
    else
        echo "desconhecido"
    fi
}

get_current_python_version() {
    if [ -f "$FILE_BACKEND_DOCKERFILE" ]; then
        grep -E '^FROM python:' "$FILE_BACKEND_DOCKERFILE" | head -n 1 | sed -E 's/FROM python:([a-zA-Z0-9.-]+).*/\1/'
    else
        echo "desconhecido"
    fi
}

get_current_postgres_version() {
    if [ -f "$FILE_DOCKER_COMPOSE" ]; then
        grep -E 'image: postgres:' "$FILE_DOCKER_COMPOSE" | head -n 1 | sed -E 's/.*image: postgres:([a-zA-Z0-9.-]+).*/\1/'
    else
        echo "desconhecido"
    fi
}

# ------------------------------------------------------------------------------
# Exibe status atual das versões
# ------------------------------------------------------------------------------
show_status() {
    echo ""
    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${BOLD}${CYAN}   VERSÕES ATUAIS DAS IMAGENS E TECNOLOGIAS BASE${NC}"
    echo -e "${CYAN}==================================================================${NC}"
    echo ""
    printf "  %-16s %-24s %-32s\n" "COMPONENTE" "VERSÃO ATIVA" "ARQUIVO PRINCIPAL"
    echo "  ------------------------------------------------------------------"
    printf "  ${BOLD}%-16s${NC} ${GREEN}%-24s${NC} %-32s\n" "Nginx (Proxy)" "$(get_current_nginx_version)" "$FILE_NGINX_DOCKERFILE"
    printf "  ${BOLD}%-16s${NC} ${GREEN}%-24s${NC} %-32s\n" "Node.js (Front)" "$(get_current_node_version)" "$FILE_FRONTEND_DOCKERFILE"
    printf "  ${BOLD}%-16s${NC} ${GREEN}%-24s${NC} %-32s\n" "Python (Back)" "$(get_current_python_version)" "$FILE_BACKEND_DOCKERFILE"
    printf "  ${BOLD}%-16s${NC} ${GREEN}%-24s${NC} %-32s\n" "PostgreSQL (DB)" "$(get_current_postgres_version)" "$FILE_DOCKER_COMPOSE"
    echo "  ------------------------------------------------------------------"
    echo ""

    if [ -L "$LATEST_LINK" ] && [ -d "$LATEST_LINK" ]; then
        echo -e " Último backup para rollback: ${YELLOW}$(readlink -f "$LATEST_LINK")${NC}"
    else
        echo -e " Nenhum backup de versão anterior registrado ainda."
    fi
    echo ""
}

# ------------------------------------------------------------------------------
# Cria backup com timestamp antes de qualquer alteração
# ------------------------------------------------------------------------------
create_backup() {
    local TIMESTAMP
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    local TARGET_DIR="${BACKUP_ROOT}/versions_${TIMESTAMP}"

    mkdir -p "$TARGET_DIR"

    [ -f "$FILE_NGINX_DOCKERFILE" ] && cp "$FILE_NGINX_DOCKERFILE" "$TARGET_DIR/nginx_Dockerfile"
    [ -f "$FILE_FRONTEND_DOCKERFILE" ] && cp "$FILE_FRONTEND_DOCKERFILE" "$TARGET_DIR/frontend_Dockerfile"
    [ -f "$FILE_BACKEND_DOCKERFILE" ] && cp "$FILE_BACKEND_DOCKERFILE" "$TARGET_DIR/backend_Dockerfile"
    [ -f "$FILE_DOCKER_COMPOSE" ] && cp "$FILE_DOCKER_COMPOSE" "$TARGET_DIR/docker-compose.yml"
    [ -f "$FILE_README" ] && cp "$FILE_README" "$TARGET_DIR/README.md"
    [ -f "$FILE_DOC" ] && cp "$FILE_DOC" "$TARGET_DIR/DOCUMENTACAO_TECNICA.md"

    # Salva manifesto com metadados do backup
    cat << EOF > "$TARGET_DIR/manifest.txt"
Data: $(date)
Nginx: $(get_current_nginx_version)
Node: $(get_current_node_version)
Python: $(get_current_python_version)
Postgres: $(get_current_postgres_version)
EOF

    # Atualiza symlink para último backup
    rm -f "$LATEST_LINK"
    ln -s "$TARGET_DIR" "$LATEST_LINK"

    echo -e "${GREEN}[✓] Backup de segurança criado em:${NC} $TARGET_DIR"
    echo -e "    ${YELLOW}Dica:${NC} Para reverter a qualquer momento, execute: ${BOLD}./manage-versions.sh --rollback${NC}"
}

# ------------------------------------------------------------------------------
# Lista backups existentes
# ------------------------------------------------------------------------------
list_backups() {
    echo ""
    echo -e "${CYAN}==================================================================${NC}"
    echo -e "${BOLD}${CYAN}   BACKUPS DISPONÍVEIS PARA ROLLBACK${NC}"
    echo -e "${CYAN}==================================================================${NC}"
    echo ""
    if [ ! -d "$BACKUP_ROOT" ] || [ -z "$(ls -A "$BACKUP_ROOT" 2>/dev/null)" ]; then
        echo " Nenhum backup encontrado na pasta $BACKUP_ROOT."
        echo ""
        return 0
    fi

    for dir in "$BACKUP_ROOT"/versions_*; do
        if [ -d "$dir" ]; then
            local bname
            bname=$(basename "$dir")
            local is_latest=""
            if [ -L "$LATEST_LINK" ] && [ "$(readlink -f "$LATEST_LINK")" = "$(readlink -f "$dir")" ]; then
                is_latest=" ${GREEN}(MAIS RECENTE)${NC}"
            fi
            echo -e "  * ${BOLD}${bname}${NC}${is_latest}"
            if [ -f "$dir/manifest.txt" ]; then
                sed 's/^/      /' "$dir/manifest.txt"
            fi
            echo ""
        fi
    done
}

# ------------------------------------------------------------------------------
# Executa rollback a partir de um backup
# ------------------------------------------------------------------------------
do_rollback() {
    local TARGET_DIR="$1"

    if [ -z "$TARGET_DIR" ]; then
        if [ -L "$LATEST_LINK" ] && [ -d "$LATEST_LINK" ]; then
            TARGET_DIR=$(readlink -f "$LATEST_LINK")
        else
            echo -e "${RED}[X] Nenhum backup recente encontrado para rollback.${NC}"
            echo "    Use ./manage-versions.sh --list-backups para ver opções disponíveis."
            exit 1
        fi
    fi

    if [ ! -d "$TARGET_DIR" ] && [ -d "${BACKUP_ROOT}/${TARGET_DIR}" ]; then
        TARGET_DIR="${BACKUP_ROOT}/${TARGET_DIR}"
    fi

    if [ ! -d "$TARGET_DIR" ]; then
        echo -e "${RED}[X] Diretório de backup não encontrado: $TARGET_DIR${NC}"
        exit 1
    fi

    echo ""
    echo -e "${YELLOW}[*] Executando ROLLBACK a partir de: $TARGET_DIR...${NC}"

    [ -f "$TARGET_DIR/nginx_Dockerfile" ] && cp "$TARGET_DIR/nginx_Dockerfile" "$FILE_NGINX_DOCKERFILE"
    [ -f "$TARGET_DIR/frontend_Dockerfile" ] && cp "$TARGET_DIR/frontend_Dockerfile" "$FILE_FRONTEND_DOCKERFILE"
    [ -f "$TARGET_DIR/backend_Dockerfile" ] && cp "$TARGET_DIR/backend_Dockerfile" "$FILE_BACKEND_DOCKERFILE"
    [ -f "$TARGET_DIR/docker-compose.yml" ] && cp "$TARGET_DIR/docker-compose.yml" "$FILE_DOCKER_COMPOSE"
    [ -f "$TARGET_DIR/README.md" ] && cp "$TARGET_DIR/README.md" "$FILE_README"
    [ -f "$TARGET_DIR/DOCUMENTACAO_TECNICA.md" ] && cp "$TARGET_DIR/DOCUMENTACAO_TECNICA.md" "$FILE_DOC"

    echo -e "${GREEN}[✓] Arquivos restaurados para as versões anteriores com sucesso!${NC}"
    show_status

    echo -e "${YELLOW}[?] Deseja recompilar e reiniciar os containers Docker agora com a versão restaurada? (s/N)${NC}"
    read -r resp
    if [[ "$resp" =~ ^[sSyY]$ ]]; then
        echo " [*] Reconstruindo containers..."
        docker compose up -d --build
        echo -e "${GREEN}[✓] Containers restabelecidos com as versões do backup!${NC}"
    else
        echo " [*] Rollback dos arquivos concluído. Para aplicar no Docker depois, execute:"
        echo "     docker compose up -d --build"
    fi
}

# ------------------------------------------------------------------------------
# Atualiza versão de um componente
# ------------------------------------------------------------------------------
update_version() {
    local COMPONENT="$1"
    local NEW_VERSION="$2"
    local DO_BUILD="$3"

    if [ -z "$COMPONENT" ] || [ -z "$NEW_VERSION" ]; then
        echo -e "${RED}[X] Parâmetros inválidos para --set.${NC}"
        echo "    Uso: ./manage-versions.sh --set <nginx|node|python|postgres> <versao> [--build]"
        exit 1
    fi

    create_backup

    case "$COMPONENT" in
        nginx)
            echo " [*] Atualizando Nginx para a versão 'nginx:${NEW_VERSION}'..."
            sed -i -E "s|^FROM nginx:[a-zA-Z0-9.-]+|FROM nginx:${NEW_VERSION}|g" "$FILE_NGINX_DOCKERFILE"
            sed -i -E "s|FROM nginx:[a-zA-Z0-9.-]+ AS prod|FROM nginx:${NEW_VERSION} AS prod|g" "$FILE_FRONTEND_DOCKERFILE"

            # Atualiza documentação
            local CLEAN_VER="${NEW_VERSION%%-*}"
            sed -i -E "s|Nginx [0-9.]+ Alpine|Nginx ${NEW_VERSION} Alpine|g" "$FILE_README" || true
            sed -i -E "s|Nginx \| [0-9.]+ Alpine|Nginx \| ${NEW_VERSION} Alpine|g" "$FILE_DOC" || true
            echo -e "${GREEN}[✓] Nginx atualizado para nginx:${NEW_VERSION}${NC}"
            ;;
        node)
            echo " [*] Atualizando Node.js no frontend para 'node:${NEW_VERSION}'..."
            sed -i -E "s|^FROM node:[a-zA-Z0-9.-]+ AS dev|FROM node:${NEW_VERSION} AS dev|g" "$FILE_FRONTEND_DOCKERFILE"
            echo -e "${GREEN}[✓] Node.js atualizado para node:${NEW_VERSION}${NC}"
            ;;
        python)
            echo " [*] Atualizando Python no backend para 'python:${NEW_VERSION}'..."
            sed -i -E "s|^FROM python:[a-zA-Z0-9.-]+|FROM python:${NEW_VERSION}|g" "$FILE_BACKEND_DOCKERFILE"
            echo -e "${GREEN}[✓] Python atualizado para python:${NEW_VERSION}${NC}"
            ;;
        postgres)
            echo " [*] Atualizando PostgreSQL no docker-compose.yml para 'postgres:${NEW_VERSION}'..."
            sed -i -E "s|image: postgres:[a-zA-Z0-9.-]+|image: postgres:${NEW_VERSION}|g" "$FILE_DOCKER_COMPOSE"
            echo -e "${GREEN}[✓] PostgreSQL atualizado para postgres:${NEW_VERSION}${NC}"
            ;;
        *)
            echo -e "${RED}[X] Componente desconhecido: '$COMPONENT'. Opções: nginx, node, python, postgres.${NC}"
            exit 1
            ;;
    esac

    show_status

    if [ "$DO_BUILD" = true ]; then
        echo " [*] Executando build de teste para validar a nova versão..."
        if [ "$COMPONENT" = "nginx" ]; then
            docker compose build nginx
            if docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro" "nginx:${NEW_VERSION}" nginx -t 2>/dev/null; then
                echo -e "${GREEN}[✓] Validação de sintaxe Nginx foi bem-sucedida!${NC}"
            fi
        elif [ "$COMPONENT" = "node" ]; then
            docker compose build frontend
        elif [ "$COMPONENT" = "python" ]; then
            docker compose build backend
        elif [ "$COMPONENT" = "postgres" ]; then
            docker compose pull postgres
        fi
        echo -e "${GREEN}[✓] Teste concluído com sucesso.${NC}"
    fi

    echo ""
    echo -e " ${BOLD}Para reverter caso algo não se comporte como o esperado:${NC}"
    echo -e "   ${CYAN}./manage-versions.sh --rollback${NC}"
    echo ""
}

# ------------------------------------------------------------------------------
# Menu Principal / Argumentos
# ------------------------------------------------------------------------------
case "$1" in
    --set)
        update_version "$2" "$3" "${4:-false}"
        ;;
    --rollback)
        do_rollback "$2"
        ;;
    --list-backups)
        list_backups
        ;;
    --status|"")
        show_status
        ;;
    --help|-h)
        echo ""
        echo -e "${BOLD}Uso:${NC} $0 [comando] [opções]"
        echo ""
        echo -e "  ${CYAN}--status${NC}                                   Exibe as versões atuais das tecnologias base (padrão)"
        echo -e "  ${CYAN}--set <componente> <versao> [--build]${NC}      Atualiza a versão base com backup automático e teste"
        echo -e "                                             Componentes: ${BOLD}nginx${NC}, ${BOLD}node${NC}, ${BOLD}python${NC}, ${BOLD}postgres${NC}"
        echo -e "                                             Exemplo: ./manage-versions.sh --set nginx 1.30.6-alpine --build"
        echo -e "  ${CYAN}--rollback [diretorio]${NC}                     Restaura a versão anterior salva antes da alteração"
        echo -e "  ${CYAN}--list-backups${NC}                             Lista os snapshots de backup disponíveis"
        echo -e "  ${CYAN}--help, -h${NC}                                 Exibe esta ajuda"
        echo ""
        ;;
    *)
        echo -e "${RED}[X] Opção desconhecida: $1${NC}"
        echo "    Execute: ./manage-versions.sh --help"
        exit 1
        ;;
esac
