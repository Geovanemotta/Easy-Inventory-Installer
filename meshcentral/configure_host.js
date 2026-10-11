#!/usr/bin/env node
/**
 * Configura dinamicamente o IP/Host e portas nos arquivos de configuracao do MeshCentral
 * e scripts de agentes com base no ambiente do servidor atual.
 */
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const serverHost = process.argv[2] || process.env.SERVER_HOST || '127.0.0.1';
const serverPort = parseInt(process.argv[3] || process.env.PORT_MESHCENTRAL || '4443', 10);

function updateMeshConfig() {
  const cfgPath = path.join(baseDir, 'meshcentral', 'config.json');
  if (!fs.existsSync(cfgPath)) return;

  try {
    const data = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (!data.settings) data.settings = {};

    const cleanCerts = [serverHost];
    for (const c of ['localhost', '127.0.0.1']) {
      if (!cleanCerts.includes(c)) cleanCerts.push(c);
    }
    data.settings.cert = cleanCerts.join(',');
    data.settings.aliasPort = serverPort;
    data.settings.ignoreAgentHashCheck = true;

    if (!data.domains) data.domains = {};
    if (data.domains['']) {
      data.domains[''].certUrl = `https://${serverHost}:${serverPort}/`;
      data.domains[''].ignoreAgentHashCheck = true;
      if (!data.domains[''].auth) {
        data.domains[''].newAccounts = true;
      }
    }
    if (data.domains.local) {
      data.domains.local.certUrl = `https://${serverHost}:${serverPort}/local`;
      data.domains.local.newAccounts = true;
    }

    fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`[✓] meshcentral/config.json atualizado para host '${serverHost}' na porta ${serverPort}.`);
  } catch (err) {
    console.error('[!] Erro ao atualizar meshcentral/config.json:', err.message);
  }
}

function updateAgentScripts() {
  const shPath = path.join(baseDir, 'scripts_agents', 'install-meshagent.sh');
  if (fs.existsSync(shPath)) {
    try {
      let content = fs.readFileSync(shPath, 'utf8');
      content = content.replace(/SERVER_HOST="\$\{SERVER_HOST:-[^}]+\}"/, `SERVER_HOST="\${SERVER_HOST:-${serverHost}}"`);
      content = content.replace(/SERVER_PORT="\$\{SERVER_PORT:-[^}]+\}"/, `SERVER_PORT="\${SERVER_PORT:-${serverPort}}"`);
      fs.writeFileSync(shPath, content, 'utf8');
      console.log(`[✓] scripts_agents/install-meshagent.sh atualizado com host '${serverHost}:${serverPort}'.`);
    } catch (err) {
      console.error('[!] Erro ao atualizar install-meshagent.sh:', err.message);
    }
  }

  const ps1Path = path.join(baseDir, 'scripts_agents', 'install-meshagent.ps1');
  if (fs.existsSync(ps1Path)) {
    try {
      let content = fs.readFileSync(ps1Path, 'utf8');
      content = content.replace(/\[string\]\$ServerHost\s*=\s*"[^"]*"/, `[string]$ServerHost = "${serverHost}"`);
      content = content.replace(/\[int\]\$ServerPort\s*=\s*\d+/, `[int]$ServerPort = ${serverPort}`);
      fs.writeFileSync(ps1Path, content, 'utf8');
      console.log(`[✓] scripts_agents/install-meshagent.ps1 atualizado com host '${serverHost}:${serverPort}'.`);
    } catch (err) {
      console.error('[!] Erro ao atualizar install-meshagent.ps1:', err.message);
    }
  }
}

updateMeshConfig();
updateAgentScripts();
