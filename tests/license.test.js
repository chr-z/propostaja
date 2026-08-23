// Testes de licenciamento Ed25519 — node --test tests/license.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { issueLicense, verifyLicense } = require('../js/license.js');

// par de chaves gerado na hora para os testes
function makeKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    pub: publicKey.export({ format: 'jwk' }),
    priv: privateKey.export({ format: 'jwk' }),
  };
}

test('licença vitalícia emitida e verificada com sucesso', async () => {
  const kp = makeKeyPair();
  const lic = issueLicense({
    email: 'ze@exemplo.com',
    plan: 'pro-lifetime',
    privateJwk: kp.priv,
  });
  const res = await verifyLicense(lic, kp.pub);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.plan, 'pro-lifetime');
  assert.strictEqual(res.email, 'ze@exemplo.com');
  assert.ok(res.expired === undefined);
});

test('licença com prazo expira', async () => {
  const kp = makeKeyPair();
  // dias negativos => x no passado
  const body = { e: 'a@b.c', p: 'pro', x: Math.floor(Date.now() / 1000) - 3600 };
  const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.sign(null, Buffer.from(payload), crypto.createPrivateKey({ key: kp.priv, format: 'jwk' }));
  const lic = `${payload}.${sig.toString('base64url')}`;
  const res = await verifyLicense(lic, kp.pub);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.expired, true);
});

test('assinatura inválida é rejeitada', async () => {
  const kp = makeKeyPair();
  const other = makeKeyPair();
  const lic = issueLicense({ email: 'x@y.z', plan: 'pro', privateJwk: other.priv });
  const res = await verifyLicense(lic, kp.pub);
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.reason, 'assinatura inválida');
});

test('payload adulterado quebra verificação', async () => {
  const kp = makeKeyPair();
  const lic = issueLicense({ email: 'x@y.z', plan: 'pro-lifetime', privateJwk: kp.priv });
  const [payload] = lic.split('.');
  // troca plano no payload sem re-assinar
  const forged = Buffer.from(JSON.stringify({ e: 'attacker@evil.com', p: 'pro-lifetime' })).toString('base64url');
  const res = await verifyLicense(`${forged}.${lic.split('.')[1]}`, kp.pub);
  assert.strictEqual(res.valid, false);
});

test('formato lixo não explode', async () => {
  const kp = makeKeyPair();
  const res = await verifyLicense('qualquer-coisa', kp.pub);
  assert.strictEqual(res.valid, false);
});
