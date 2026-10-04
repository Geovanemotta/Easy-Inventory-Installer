# 🚀 Guia de Implantação Turnkey (Servidor Limpo)

Este repositório está configurado para permitir a implantação completa do sistema de inventário em qualquer servidor limpo (Linux ou Windows) com **zero configuração prévia manual**.

O servidor precisa apenas ter o **Docker** instalado. O script de instalação automatizada (`setup.sh` ou `setup.ps1`) compila o frontend, configura o banco de dados, cria as chaves criptográficas, aplica as migrações e inicializa o sistema com a sua empresa e usuário administrador.

---

## 📋 Pré-requisitos no Servidor Novo

Apenas o Docker e o plugin Docker Compose são necessários:

### No Linux (Ubuntu / Debian / Rocky / AlmaLinux / CentOS)
```bash
# 1. Instalação rápida do Docker oficial (caso ainda não tenha instalado):
curl -fsSL https://get.docker.com | sh

# 2. Habilita o serviço e adiciona seu usuário ao grupo docker:
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

---

## 📦 Como Subir em um Servidor Linux Novo

### Passo 1: Transferir o projeto para o servidor

Você pode clonar via Git ou copiar os arquivos compactados (ex: `.tar.gz` ou `.zip`):

```bash
# Exemplo via Git:
git clone <URL_DO_REPOSITORIO> giassi-inventory
cd giassi-inventory

# Ou se transferiu o pacote compactado via SCP/SFTP:
tar -xzf giassi-inventory.tar.gz
cd giassi-inventory
```

---

### Passo 2: Executar o Assistente Interativo

Dê permissão de execução ao instalador e inicie-o:

```bash
chmod +x setup.sh
./setup.sh
```
*(Se seu usuário não estiver no grupo docker, execute com `sudo ./setup.sh`)*

---

### Passo 3: Responder às Perguntas do Assistente

O script fará as seguintes perguntas interativas (basta teclar `Enter` para aceitar os valores sugeridos entre colchetes):

1. **Nome da empresa:** `[Giassi Supermercados]`
2. **Slug/Identificador da empresa:** `[giassi]`
3. **IP ou DNS de acesso ao servidor:** *(detecta o IP da sua rede automaticamente, ex: `192.168.0.50`)*
4. **Porta HTTPS:** `[443]`
5. **Porta HTTP:** `[80]`
6. **Nome do banco de dados:** `[giassi_inventory]`
7. **Usuário do banco de dados:** `[giassi_app]`
8. **Senha do banco de dados:** *(sugere uma senha forte ou permite digitar uma de sua preferência)*
9. **Usuário administrador inicial:** `[admin]`
10. **Nome completo do administrador:** `[Administrador do Sistema]`
11. **E-mail do administrador:** `[admin@giassi.com.br]`
12. **Senha do administrador inicial:** *(digitada com máscara oculta e confirmação)*
13. **Criar lista padrão de filiais (Lojas 01 a 30, Combos, Matriz)?** `[S/n]`

---

### Passo 4: O Instalador Assume e Conclui Automaticamente

Nos bastidores, o script irá:
1. Gerar o arquivo `.env` com todas as credenciais e chaves JWT criptográficas de 256 bits.
2. Compilar o frontend React via container Node.js isolado (sem precisar instalar Node no servidor).
3. Construir as imagens Docker (`giassi-backend`, `giassi-nginx`, `giassi-postgres`).
4. Inicializar os containers em background.
5. Aguardar o PostgreSQL ficar online e executar as migrações estruturais do banco (`Alembic`).
6. Executar o seed turnkey cadastrando a empresa, perfis (`superadmin`, `admin`, `operator`), o seu usuário admin e a estrutura inicial de lojas.
7. Gerar o certificado SSL com extensão SAN (Subject Alternative Name) cobrindo o IP e DNS informados.

Ao final, o terminal exibirá:

```text
==================================================================
   INSTALAÇÃO CONCLUÍDA COM SUCESSO! 🚀
==================================================================
 Painel de Acesso:     https://192.168.0.50
 Usuário Admin:        admin
 Empresa:              Giassi Supermercados
------------------------------------------------------------------
 Comandos para instalar os agentes nas máquinas:

 • Windows (PowerShell como Administrador):
   irm https://192.168.0.50/api/v1/agent/windows | iex

 • Linux (Terminal / Bash como Root):
   curl -sSL https://192.168.0.50/api/v1/agent/linux | sudo bash
==================================================================
```

---

## 🪟 Instalação em Servidor Windows (Opcional)

Se preferir subir em um servidor Windows com Docker Desktop:

1. Abra o **PowerShell como Administrador**.
2. Navegue até a pasta do projeto:
   ```powershell
   cd D:\giassi-inventory
   ```
3. Execute o instalador do Windows:
   ```powershell
   .\setup.ps1
   ```

---

## 🛠️ Comandos de Manutenção do Dia a Dia

* **Ver o status dos containers:**
  ```bash
  docker compose ps
  ```
* **Visualizar logs em tempo real:**
  ```bash
  docker compose logs -f
  # Ou logs apenas do backend:
  docker compose logs -f backend
  ```
* **Parar o sistema:**
  ```bash
  docker compose stop
  ```
* **Iniciar o sistema novamente:**
  ```bash
  docker compose start
  ```
* **Reiniciar todos os serviços:**
  ```bash
  docker compose restart
  ```
* **Instalar Certificado SSL Corporativo Próprio (.crt e .key):**
  1. Copie seu certificado para: `./nginx/certs/giassi.crt`
  2. Copie sua chave privada para: `./nginx/certs/giassi.key`
  3. Recarregue o Nginx sem derrubar o sistema:
     ```bash
     docker exec giassi-nginx nginx -s reload
     ```

---

## 🔄 Atualizando o Sistema com Novas Versões (`update.sh`)

Sempre que você fizer melhorias ou correções no código e enviar para o GitHub, atualizar o servidor de produção leva apenas alguns segundos e **não perde nenhum dado do banco**:

```bash
sudo ./update.sh
```

### O que o `update.sh` faz automaticamente:
1. Puxa as novidades mais recentes do repositório (`git pull`).
2. Recompila o frontend React atualizado.
3. Atualiza os containers Docker com sub-second reload.
4. Executa quaisquer novas migrações de banco (`alembic upgrade head`) para criar novas tabelas/colunas automaticamente.
5. Limpa imagens Docker antigas para liberar espaço em disco.

---

## 🐙 Publicando este Projeto no GitHub (Primeira Vez)

Para subir o projeto para um repositório seu no GitHub (sem expor senhas ou arquivos pesados de backup, já protegidos pelo `.gitignore`):

```bash
# 1. Inicie o repositório git local:
git init

# 2. Adicione os arquivos (o .gitignore ignora automaticamente .env, chaves e dados locais):
git add .

# 3. Crie o primeiro commit:
git commit -m "feat: release inicial do sistema de inventario com instalador turnkey"

# 4. Vincule com seu repositório no GitHub:
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# 5. Envie para o GitHub:
git push -u origin main
```

