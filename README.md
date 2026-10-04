# 🖥️ Sistema de Inventário Corporativo de TI

> Plataforma centralizada de alta performance para **gestão, governança, rastreamento de hardware drift e auditoria de ativos de TI** em redes corporativas com suporte a matriz e filiais.

---

## ⚡ Destaques da Plataforma

* **Multiplataforma:** Coleta completa em sistemas operacionais **Windows** (10, 11 e Server) e **Linux** (Ubuntu, Debian, Zorin, etc.).
* **Zero-Touch Deploy:** Instalação dos agentes via script em linha única no terminal ou PowerShell, ou agendamento diário via Cron / GPO.
* **Auditoria de Hardware Drift:** Histórico automático de alterações de hardware com alertas imediatos para trocas de peças (RAM, CPU, Placa-mãe).
* **Gestão de Armazenamento:** Monitoramento de uso de discos com alerta de > 75% e análise detalhada das pastas de usuários locais.
* **Catálogo de Softwares:** Relação consolidada de aplicativos, agentes, runtimes e ferramentas instaladas, com busca reversa de máquinas por aplicativo.
* **Active Directory Integrado:** Autenticação LDAP/LDAPS unificada com provisionamento Just-in-Time e mapeamento dinâmico de grupos do AD.
* **Arquitetura 100% em Containers:** Roda com Docker e Docker Compose, com instalador interativo Turnkey e scripts de atualização contínua sem perda de dados.

---

## 🚀 Instalação Rápida em Servidor Limpo

Apenas o **Docker** precisa estar instalado no servidor:

```bash
# Clone ou descompacte o projeto:
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git inventory-app
cd inventory-app

# Execute o instalador interativo:
chmod +x setup.sh
sudo ./setup.sh
```

Responda às perguntas simples do assistente no terminal (Nome da empresa, IP/DNS, credenciais desejadas) e o instalador configurará o banco, compilará o frontend e inicializará tudo automaticamente.

Para atualizar versões futuras com novidades do Git:
```bash
sudo ./update.sh
```

---

## 📚 Documentação Completa

* 📘 **[Documentação Técnica e Arquitetura Completa](DOCUMENTACAO_TECNICA.md):** Detalhamento das tecnologias utilizadas, responsabilidade dos módulos, camadas de segurança, otimizações de desempenho e roadmap de evolução.
* 🚀 **[Guia de Implantação e Manutenção](DEPLOY.md):** Manual passo a passo para servidores Linux e Windows, comandos de diagnóstico, logs e substituição de certificados SSL.

---

## 🛠️ Stack Tecnológica

* **Frontend:** React 19, TypeScript, Vite, Vanilla CSS Modular (Design System exclusivo).
* **Backend:** Python 3.13, FastAPI, Pydantic v2, Uvicorn.
* **Banco de Dados:** PostgreSQL 18, SQLAlchemy 2.0, Psycopg 3, Alembic.
* **Proxy Reverso:** Nginx 1.27 Alpine com terminação SSL/TLS (HTTPS) e geração automática de certificados SAN.
* **Infraestrutura:** Docker e Docker Compose.
