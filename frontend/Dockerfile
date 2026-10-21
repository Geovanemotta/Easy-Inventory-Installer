# ==========================================================
# INVENTÁRIO CORPORATIVO - FRONTEND DOCKERFILE
# Multi-stage build: Node.js 20 (Dev & Compilação) + Nginx Alpine
# ==========================================================

# Estágio 1: Ambiente de desenvolvimento com Vite HMR
FROM node:20-bookworm-slim AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# Estágio 2: Build da aplicação Vite / TypeScript (Produção)
FROM dev AS builder
RUN npm run build

# Estágio 3: Nginx para servir arquivos estáticos e proxy SPA (Standalone)
FROM nginx:1.27-alpine AS prod

# Remove configuração padrão
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copia artefatos compilados e configuração Nginx do frontend
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
