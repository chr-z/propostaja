// Verificação da licença do proprietário contra a chave pública embutida.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { verifyLicense } = require('../js/license.js');

(async () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'keys', 'OWNER-LICENSE.txt'), 'utf8');
  const lic = raw.trim();
  const pubJwk = {
    crv: 'Ed25519',
    x: 'jUn7Y4-Eb-6tlduPgxioNAJ6iKMLFCER6JgadYTmtDk',
    kty: 'OKP',
  };
  const res = await verifyLicense(lic, pubJwk);
  console.log('len:', lic.length);
  console.log('verdict:', res.valid ? 'VALID' : 'INVALID');
  console.log('plan:', res.plan || '-');
  console.log('email:', res.email || '-');
  console.log('reason:', res.reason || '-');
})();
