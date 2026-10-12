/**
 * Remove credenciais de 2FA (TOTP/FIDO2) de um usuário específico no MeshCentral
 * Uso: node reset_2fa.js <username>
 */
const fs = require('fs');
const username = process.argv[2];

if (!username) {
  console.log('Nome de usuário não informado.');
  process.exit(1);
}

const dbPath = '/opt/meshcentral/meshcentral-data/meshcentral.db';
if (!fs.existsSync(dbPath)) {
  console.log('meshcentral.db não encontrado.');
  process.exit(0);
}

try {
  const lines = fs.readFileSync(dbPath, 'utf8').split('\n');
  const targetLower = username.toLowerCase().trim();
  const targetId1 = `user//${targetLower}`;
  const targetId2 = `user/local/${targetLower}`;
  const outputLines = [];
  let found = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      if (o.type === 'user' && (o._id === targetId1 || o._id === targetId2 || o.name?.toLowerCase() === targetLower)) {
        delete o.otpekey;
        delete o.otpsecret;
        delete o.otpkeys;
        delete o.otphkeys;
        delete o.otpdev;
        delete o.otpsms;
        delete o.otpmsg;
        delete o.otpduo;
        delete o.msghandle;
        delete o.fido2;
        found = true;
        outputLines.push(JSON.stringify(o));
        continue;
      }
      outputLines.push(line);
    } catch (e) {
      outputLines.push(line);
    }
  }

  if (found) {
    fs.writeFileSync(dbPath, outputLines.join('\n'));
    console.log(`[MeshCentral] 2FA resetado com sucesso para ${username}`);
  } else {
    console.log(`[MeshCentral] Usuário ${username} não encontrado no banco do MeshCentral.`);
  }
} catch (err) {
  console.error(`[MeshCentral] Erro ao resetar 2FA: ${err.message}`);
}
