# Módulo de Acesso Remoto - MeshCentral

Este módulo provê controle remoto gráfico em tempo real (desktop cooperativo com teclado e mouse) diretamente no navegador, substituindo a dependência de aplicativos externos desktop (como RustDesk/AnyDesk).

---

## 🚀 Arquitetura e Vantagens

1. **Sessão Interativa Real (Helpdesk):** O operador enxerga exatamente a mesma tela em que o funcionário está trabalhando, permitindo prestar suporte conjunto sem desconectar a sessão do usuário.
2. **Suporte Nativo ao UAC / Senha de Administrador:** O agente roda como serviço do Windows (`NT AUTHORITY\SYSTEM`), permitindo interagir com telas de elevação de privilégio do Windows (Secure Desktop) sem tela preta.
3. **Zero Limite de Licenças Simultâneas:** 100% código aberto sob licença Apache 2.0. Conexões simultâneas ilimitadas entre a equipe técnica e estações.
4. **Isolamento de Segurança e Zero Vazamento de ID:** Não há exibição de IDs numéricos para os usuários das lojas repassarem para fora. O agente conecta exclusivamente ao servidor autenticado da empresa via certificado TLS mútuo.
5. **Funciona em Redes com NAT / Fora da Empresa:** O agente estabelece conexão de saída (*outbound*) para o servidor. Não é necessário abrir portas nos roteadores ou firewalls das lojas ou filiais.

---

## 🛠️ Como Iniciar o Servidor MeshCentral

O serviço do MeshCentral está configurado no `docker-compose.yml` principal do projeto:

```bash
# Subir os containers (incluindo o MeshCentral)
docker compose up -d meshcentral
```

O serviço responderá através do Nginx na porta HTTPS `4443` (ou porta configurada em `PORT_MESHCENTRAL`).

---

## 👤 Primeiro Acesso e Configuração de Administrador

1. Abra no navegador: `https://<IP_DO_SERVIDOR>:4443` (aceite o certificado se for autoassinado).
2. Na primeira vez, crie a conta de administrador inicial (ex.: `admin`).
   - *Nota:* A primeira conta criada no MeshCentral torna-se automaticamente a administradora do servidor.
3. Crie um **Grupo de Dispositivos** (Device Group), por exemplo: `Estações Giassi`.
4. Clique em **"Add Agent"** para obter o executável ou o comando de instalação para Windows e Linux.

---

## 💻 Instalação do Agente nos Computadores

### Windows (Instalação 100% Silenciosa):
Você pode utilizar o script pronto em `scripts_agents/install-meshagent.ps1` ou executar diretamente via prompt de comando / PowerShell elevado:

```powershell
# Execução silenciosa como Serviço do Windows:
.\MeshAgent.exe -install
```

### Linux (Ubuntu / Debian / RHEL):
```bash
# Execução do instalador nativo como serviço do systemd:
sudo ./meshagent -install
```

---

## 📁 Estrutura de Arquivos

* `meshcentral/config.json`: Configurações principais do servidor MeshCentral.
* `meshcentral/data/`: Diretório persistido em volume Docker contendo certificados de nós e banco de dados.
* `meshcentral/files/`: Diretório de arquivos temporários e transferências.
