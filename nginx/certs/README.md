# 🔐 Gerenciamento de Certificados SSL/TLS e Manutenção sem Downtime

Esta pasta (`./nginx/certs/`) gerencia os certificados SSL/TLS que protegem o Giassi Inventário na porta **443 (HTTPS)**.

---

## 🚀 1. Como Funciona o Fallback Automático

Se você subir o sistema sem ter colocado nenhum certificado aqui, o Nginx **não quebra**:
- O `entrypoint.sh` detecta a ausência dos arquivos e gera automaticamente um certificado auto-assinado temporário válido por 365 dias.
- O sistema fica imediatamente acessível em `https://<ip_ou_dominio>/`.

---

## 🏢 2. Como Importar o Certificado Oficial da Empresa

O Nginx espera dois arquivos com estes nomes exatos nesta pasta:
1. `giassi.crt` : Certificado SSL corporativo público (incluindo as cadeias intermediárias da Autoridade Certificadora / CA).
2. `giassi.key` : Chave privada correspondente (sem senha / desprotegida).

---

### Opção A: A empresa já forneceu `.crt` / `.pem` e `.key`
Basta copiar os arquivos para esta pasta com os nomes esperados:
- Copie o certificado para: `nginx/certs/giassi.crt`
- Copie a chave privada para: `nginx/certs/giassi.key`

---

### Opção B: A empresa forneceu um arquivo `.pfx` ou `.p12` (Padrão Windows / Active Directory)
Geralmente no Windows Server / Active Directory Certificate Services, o certificado é exportado como arquivo `.pfx` (contendo chave e certificado juntos sob uma senha).

Você pode extrair facilmente usando os scripts auxiliares inclusos nesta pasta:

#### No Windows (PowerShell):
```powershell
.\nginx\certs\import_pfx.ps1 -PfxPath "C:\caminho\seu_certificado.pfx"
```

#### No Linux (Bash):
```bash
./nginx/certs/import_pfx.sh /caminho/seu_certificado.pfx
```

#### Ou manualmente via comando OpenSSL:
```bash
# 1. Extrair a chave privada
openssl pkcs12 -in seu_certificado.pfx -nocerts -out nginx/certs/giassi.key -nodes

# 2. Extrair o certificado e as cadeias
openssl pkcs12 -in seu_certificado.pfx -clcerts -nokeys -out nginx/certs/giassi.crt
```

---

## ⚡ 3. Aplicar Novo Certificado com ZERO DOWNTIME (Sem Parar o Sistema)

Sempre que você trocar ou renovar um certificado, **NÃO é necessário reiniciar o Docker nem derrubar os usuários**.

Execute:
```bash
# 1. Valida a sintaxe e os certificados
docker exec giassi-nginx nginx -t

# 2. Recarrega as configurações em milissegundos
docker exec giassi-nginx nginx -s reload
```
O Nginx continuará atendendo as conexões atuais e abrirá novos processos com o novo certificado instantaneamente.

---

## 🛡️ 4. Tratamento Rápido de Vulnerabilidades (CVEs)

Assim como em arquiteturas corporativas (ex: Apache Guacamole com Tomcat atrás de Proxy Reverso), separar o Nginx na frente traz grandes vantagens:

1. **Atualização do Web Server sem tocar na aplicação:**
   Se sair uma correção de vulnerabilidade para o Nginx ou OpenSSL, você atualiza a imagem em segundos:
   ```bash
   docker compose pull nginx
   docker compose up -d nginx
   ```
   *Tempo de parada: ~1 a 2 segundos apenas no proxy.* O banco de dados e o backend FastAPI continuam ativos e intocados.

2. **Isolamento de Segurança:**
   - O backend Python e o PostgreSQL não precisam de portas expostas diretamente para a rede pública.
   - O Nginx filtra ataques comuns, limita tamanho de payload malicioso (`client_max_body_size 50M`), oculta versões (`server_tokens off;`) e impõe cabeçalhos de proteção (HSTS, X-Frame-Options, X-Content-Type-Options).
