# ==========================================================
# INVENTÁRIO CORPORATIVO - FRONTEND DOCKERFILE
# Multi-stage build: Node.js 20 (Compilação) + Nginx Alpine
# ==========================================================

# Estágio 1: Build da aplicação Vite / TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Instalação de dependências aproveitando cache de camadas
COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Copia código-fonte e executa compilação (tsc -b && vite build)
COPY . .
RUN npm run build

# Estágio 2: Nginx para servir arquivos estáticos e proxy SPA
FROM nginx:1.27-alpine

# Remove configuração padrão
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copia artefatos compilados e configuração Nginx do frontend
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
