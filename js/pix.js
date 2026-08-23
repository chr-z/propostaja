// PropostaJá — gerador Pix "copia e cola" (padrão EMV BR Code, Banco Central).
// Puro e testável. Chave Pix do vendedor é configurada pelo próprio usuário.
'use strict';

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function emv(id, value) {
  return id + String(value.length).padStart(2, '0') + value;
}

/** Remove acentos e caracteres fora do charset do BR Code; limita tamanho. */
function sanitize(text, maxLen, opts = {}) {
  const clean = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]+/g, opts.keepPunct ? (c) => c : ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen || 99);
  return opts.upper ? clean.toUpperCase() : clean;
}

/**
 * Monta o payload Pix copia-e-cola.
 * @param opts { keyPix, merchantName, merchantCity, amount, txid }
 */
function buildPixPayload(opts) {
  // Chave vai verbatim (e-mail/telefone/EVP são case-sensitive); nome/cidade normalizados.
  const key = sanitize(opts.keyPix, 77, { keepPunct: true });
  const name = sanitize(opts.merchantName, 25, { upper: true });
  const city = sanitize(opts.merchantCity, 15, { upper: true });
  const txid = sanitize(opts.txid || '***', 25).replace(/ /g, '') || '***';
  const amount = Number(opts.amount);

  if (!key) throw new Error('Chave Pix ausente');
  if (!name) throw new Error('Nome do recebedor ausente');
  if (!city) throw new Error('Cidade ausente');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Valor inválido');

  const mai = emv('00', 'BR.GOV.BCB.PIX') + emv('01', key);
  let payload =
    emv('00', '01') +
    emv('26', mai) +
    emv('52', '0000') +
    emv('53', '986') +
    emv('54', amount.toFixed(2)) +
    emv('58', 'BR') +
    emv('59', name) +
    emv('60', city) +
    emv('62', emv('05', txid));

  payload += '6304';
  return payload + crc16(payload);
}

const PJPix = { buildPixPayload, crc16, sanitize };
if (typeof module !== 'undefined' && module.exports) module.exports = PJPix;
if (typeof globalThis !== 'undefined') globalThis.PJPix = PJPix;
