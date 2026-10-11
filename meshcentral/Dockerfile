FROM ghcr.io/ylianst/meshcentral:latest

USER root
WORKDIR /opt/meshcentral/meshcentral

# Copia e descompacta modulos LDAP pré-compilados de forma 100% offline
# evitando qualquer chamada de rede ao npm em tempo de execucao ou build
COPY ldap_modules.tar.gz /tmp/ldap_modules.tar.gz
RUN tar -xzf /tmp/ldap_modules.tar.gz -C /opt/meshcentral/meshcentral/node_modules \
    && rm -f /tmp/ldap_modules.tar.gz

# Copia folha de estilo customizada para a pasta pública
COPY custom.css /opt/meshcentral/meshcentral/public/styles/custom.css

WORKDIR /opt/meshcentral
