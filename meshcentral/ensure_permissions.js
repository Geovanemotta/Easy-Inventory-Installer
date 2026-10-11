/**
 * Garante a criação do grupo de usuários 'Operadores Matriz' (ugrp//operadores_matriz)
 * e vincula todos os grupos de dispositivos (mesh) com permissão restrita de apenas
 * controle remoto (rights: 8), impedindo adição de nós, criação ou edição de grupos.
 */
const fs = require('fs');
const dbPath = '/opt/meshcentral/meshcentral-data/meshcentral.db';

if (!fs.existsSync(dbPath)) {
  console.log('[MeshCentral] meshcentral.db ainda não foi inicializado.');
  process.exit(0);
}

try {
  const lines = fs.readFileSync(dbPath, 'utf8').split('\n');
  const ugrpId = 'ugrp//operadores_matriz';
  let ugrpFound = false;
  let updated = false;

  const outputLines = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      if (o.type === 'ugrp' && o._id === ugrpId) {
        ugrpFound = true;
        outputLines.push(line);
        continue;
      }
      if (o.type === 'mesh') {
        if (!o.links) o.links = {};
        if (!o.links[ugrpId] || o.links[ugrpId].rights !== 8) {
          o.links[ugrpId] = { name: 'Operadores Matriz', rights: 8 };
          updated = true;
        }
        outputLines.push(JSON.stringify(o));
        continue;
      }
      outputLines.push(line);
    } catch (e) {
      outputLines.push(line);
    }
  }

  if (!ugrpFound) {
    const ugrpObj = {
      type: 'ugrp',
      _id: ugrpId,
      name: 'Operadores Matriz',
      desc: 'Operadores autorizados com permissão exclusiva de controle remoto',
      domain: '',
      links: {}
    };
    outputLines.push(JSON.stringify(ugrpObj));
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(dbPath, outputLines.join('\n'));
    console.log('[MeshCentral] Permissões do grupo Operadores Matriz (rights: 8) sincronizadas com sucesso.');
  } else {
    console.log('[MeshCentral] Permissões do grupo Operadores Matriz já estão em conformidade.');
  }
} catch (err) {
  console.error('[MeshCentral] Erro ao sincronizar permissões:', err);
}
