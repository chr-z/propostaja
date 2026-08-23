// PropostaJá — licenciamento Pro com Ed25519 (chave privada offline, verificação
// pela pública embutida no site). Funciona no Node e no navegador.
'use strict';

let nodeCrypto = null;
try {
  // eslint-disable-next-line no-eval
  nodeCrypto = require('node:crypto');
} catch {
  nodeCrypto = null;
}
const webCrypto =
  typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle ? globalThis.crypto : null;

function b64url(bytes) {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s) {
  let t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  const bin = atob(t);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

/**
 * Assina um payload com JWK privado Ed25519. Apenas Node/ferramenta local.
 */
function signPayload(payload, privateJwk) {
  if (!nodeCrypto) throw new Error('assinatura requer Node (ferramenta local)');
  const key = nodeCrypto.createPrivateKey({ key: privateJwk, format: 'jwk' });
  const sig = nodeCrypto.sign(null, Buffer.from(payload, 'utf8'), key);
  return b64url(new Uint8Array(sig));
}

/**
 * Gera licença: <dados-b64url>.<assinatura-b64url>
 * @param opts { email, plan:'pro'|'pro-lifetime', days?, privateJwk }
 */
function issueLicense(opts) {
  const body = { e: String(opts.email || '').trim().toLowerCase(), p: opts.plan };
  if (opts.days) body.x = Math.floor(Date.now() / 1000) + Number(opts.days) * 86400;
  const payload = b64url(new TextEncoder().encode(JSON.stringify(body)));
  const sig = signPayload(payload, opts.privateJwk);
  return `${payload}.${sig}`;
}

/**
 * Valida licença contra a chave pública. Offline. Retorna {valid, plan, email, expired?, reason?}.
 */
async function verifyLicense(license, publicJwk) {
  try {
    if (!webCrypto) return { valid: false, reason: 'navegador sem WebCrypto' };
    const parts = String(license || '').trim().split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return { valid: false, reason: 'formato' };
    const [payload, sig] = parts;

    const key = await webCrypto.subtle.importKey(
      'jwk',
      publicJwk,
      { name: 'Ed25519' },
      false,
      ['verify']
    );
    const ok = await webCrypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      b64urlToBytes(sig),
      new TextEncoder().encode(payload)
    );
    if (!ok) return { valid: false, reason: 'assinatura inválida' };

    const body = b64urlToJson(payload);
    const out = { valid: true, plan: body.p, email: body.e };
    if (body.x && Date.now() / 1000 > body.x) {
      out.valid = false;
      out.expired = true;
      out.reason = 'expirada';
    }
    return out;
  } catch {
    return { valid: false, reason: 'inválida' };
  }
}

const PJLicense = { issueLicense, verifyLicense };
if (typeof module !== 'undefined' && module.exports) module.exports = PJLicense;
if (typeof globalThis !== 'undefined') globalThis.PJLicense = PJLicense;
