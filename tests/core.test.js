// Testes do motor puro — node --test tests/core.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  formatBRL,
  computeTotals,
  slugify,
  encodeProposal,
  decodeProposal,
  nextProposalNumber,
  validateProposal,
  validityDate,
} = require('../js/core.js');

test('computeTotals soma itens corretamente', () => {
  const t = computeTotals(
    [
      { desc: 'A', qty: 2, price: 100 },
      { desc: 'B', qty: 1, price: 250.5 },
    ],
    0
  );
  assert.strictEqual(t.subtotal, 450.5);
  assert.strictEqual(t.discount, 0);
  assert.strictEqual(t.total, 450.5);
});

test('computeTotals aplica desconto percentual', () => {
  const t = computeTotals([{ desc: 'A', qty: 1, price: 200 }], 10);
  assert.strictEqual(t.subtotal, 200);
  assert.strictEqual(t.discount, 20);
  assert.strictEqual(t.total, 180);
});

test('computeTotals ignora itens inválidos e clampa desconto', () => {
  const t = computeTotals(
    [{ desc: 'ok', qty: 1, price: 100 }, null, { desc: 'x', qty: -1, price: 50 }],
    150
  );
  // desconto clampado a 100% → zera o total (piso de segurança)
  assert.strictEqual(t.total, 0);
});

test('formatBRL usa pt-BR', () => {
  assert.strictEqual(formatBRL(1234.5).replace(/\u00a0/g, ' '), 'R$ 1.234,50');
});

test('slugify remove acentos e símbolos', () => {
  assert.strictEqual(slugify('  Site Institucional & Landing! '), 'site-institucional-landing');
});

test('encode/decode roundtrip preserva dados', () => {
  const state = {
    company: { name: 'ACME' },
    client: { name: 'Cliente X' },
    items: [{ desc: 'Site', qty: 2, price: 1500 }],
    discountPct: 5,
    notes: 'Prazo 10 dias',
    meta: {},
  };
  const enc = encodeProposal(state);
  const dec = decodeProposal(enc);
  assert.deepStrictEqual(dec.items[0], { desc: 'Site', qty: 2, price: 1500 });
  assert.strictEqual(dec.client.name, 'Cliente X');
  assert.strictEqual(dec.discountPct, 5);
});

test('decodeProposal retorna null em lixo', () => {
  assert.strictEqual(decodeProposal('lixo!!!'), null);
});

test('nextProposalNumber incrementa no ano e reseta em ano novo', () => {
  assert.strictEqual(nextProposalNumber('PJ-2026-0007'), 'PJ-2026-0008');
  assert.strictEqual(nextProposalNumber('PJ-2025-0099'), 'PJ-2026-0001');
  assert.strictEqual(nextProposalNumber(null), 'PJ-2026-0001');
});

test('validateProposal exige cliente e itens', () => {
  const errs = validateProposal({ client: {}, items: [] });
  assert.ok(errs.length >= 2);
  assert.deepStrictEqual(
    validateProposal({ client: { name: 'X' }, items: [{ desc: 'a', qty: 1, price: 10 }] }),
    []
  );
});

test('validityDate retorna data futura formatada pt-BR', () => {
  const d = validityDate(15);
  assert.match(d, /^\d{2}\/\d{2}\/\d{4}$/);
});
