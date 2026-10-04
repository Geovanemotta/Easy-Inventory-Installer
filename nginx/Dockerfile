FROM nginx:1.27-alpine

# Instalação do OpenSSL para geração de certificados fallback e utilitários de manutenção
RUN apk add --no-cache openssl bash curl

# Copia script de inicialização e garante quebras de linha Unix
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
