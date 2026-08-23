// Ferramenta LOCAL (não vai ao site): gera par Ed25519 e emite licenças Pro.
// Uso:
//   node tools/license-cli.js gen                     → cria keys/*.json
//   node tools/license-cli.js issue <email> [plano]   → imprime chave de licença
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const KEYS_DIR = path.join(__dirname, '..', 'keys');

function ensureKeys() {
  const pubPath = path.join(KEYS_DIR, 'license-public.json');
  const privPath = path.join(KEYS_DIR, 'license-private.json');
  if (fs.existsSync(pubPath) && fs.existsSync(privPath)) {
    return {
      pub: JSON.parse(fs.readFileSync(pubPath, 'utf8')),
      priv: JSON.parse(fs.readFileSync(privPath, 'utf8')),
    };
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pub = publicKey.export({ format: 'jwk' });
  const priv = privateKey.export({ format: 'jwk' });
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  fs.writeFileSync(pubPath, JSON.stringify(pub, null, 2));
  fs.writeFileSync(privPath, JSON.stringify(priv, null, 2));
  console.error(`[keys] novo par salvo em ${KEYS_DIR}`);
  return { pub, priv };
}

function main() {
  const [, , cmd, ...args] = process.argv;
  if (cmd === 'gen') {
    ensureKeys();
    const { pub } = ensureKeys();
    console.log('Pública (cole em js/config.js como window.PJ_LICENSE_PUBLIC_JWK):');
    console.log(JSON.stringify(pub));
    return;
  }
  if (cmd === 'issue') {
    const [email, plan = 'pro-lifetime'] = args;
    if (!email || !email.includes('@')) {
      console.error('uso: node tools/license-cli.js issue <email> [pro|pro-lifetime]');
      process.exit(1);
    }
    const { priv } = ensureKeys();
    const { issueLicense } = require('../js/license.js');
    const key = issueLicense({ email, plan, privateJwk: priv });
    console.log(key);
    return;
  }
  console.error('comandos: gen | issue <email> [plano]');
  process.exit(1);
}

main();
