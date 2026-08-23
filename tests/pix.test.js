// Testes do gerador Pix EMV — node --test tests/pix.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildPixPayload, crc16, sanitize } = require('../js/pix.js');

test('crc16 conhecido (12345678 → A12B, conferido com binascii.crc_hqx)', () => {
  assert.strictEqual(crc16('12345678'), 'A12B');
});

test('payload tem CRC-16-CCITT válido no final', () => {
  const payload = buildPixPayload({
    keyPix: 'chr-z@users.noreply.github.com',
    merchantName: 'CHRISTIAN DEV',
    merchantCity: 'SAO PAULO',
    amount: 47,
    txid: 'PJ20260001',
  });
  const body = payload.slice(0, -4);
  assert.strictEqual(payload.slice(-4), crc16(body));
});

test('payload contém campos obrigatórios EMV', () => {
  const p = buildPixPayload({
    keyPix: 'chave@pix.com',
    merchantName: 'LOJA TESTE LTDA',
    merchantCity: 'CAMPINAS',
    amount: 123.45,
    txid: 'TX123',
  });
  assert.ok(p.startsWith('000201')); // versão
  assert.ok(p.includes('BR.GOV.BCB.PIX')); // MAI
  assert.ok(p.includes('chave@pix.com')); // chave verbatim no MAI
  assert.ok(p.includes('5303986')); // moeda BRL
  assert.match(p, /5406123\.45/); // valor
  assert.ok(p.includes('5802BR')); // país
  assert.ok(p.includes('LOJA')); // nome sanitizado
  assert.match(p, /6304[A-F0-9]{4}$/); // CRC final
});

test('sanitize remove acentos e limita tamanho', () => {
  assert.strictEqual(sanitize('José da Conceição Ação', 25), 'Jose da Conceicao Acao');
  const upper = sanitize('José Ação', 25, { upper: true });
  assert.strictEqual(upper, 'JOSE ACAO');
  assert.strictEqual(sanitize('Ab@c#d$e', 10).length <= 10, true);
});

test('rejeita payload sem chave ou com valor inválido', () => {
  assert.throws(() => buildPixPayload({ keyPix: '', merchantName: 'A', merchantCity: 'B', amount: 10 }));
  assert.throws(() => buildPixPayload({ keyPix: 'k', merchantName: 'A', merchantCity: 'B', amount: -1 }));
});

test('tamanho total permanece múltiplo do padrão e parseável por campo', () => {
  const p = buildPixPayload({
    keyPix: 'a@b.com',
    merchantName: 'X Y',
    merchantCity: 'RIO',
    amount: 1,
  });
  // valida estrutura: cada campo ID(2)+LEN(2)+VAL até o tag CRC (6304)
  let i = 0;
  while (i < p.length - 4) {
    if (p.slice(i, i + 4) === '6304') break;
    const len = Number(p.slice(i + 2, i + 4));
    assert.ok(len > 0);
    i += 4 + len;
  }
  // ao parar, resta exatamente o bloco CRC: '6304' + 4 hex
  assert.strictEqual(p.slice(i, i + 4), '6304');
  assert.strictEqual(p.length - i, 8);
});
