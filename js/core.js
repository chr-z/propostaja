// PropostaJá — motor puro (sem DOM). Testável via node --test.
'use strict';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatBRL(n) {
  return BRL.format(Number(n) || 0);
}

/** Totais da proposta: subtotal, desconto (%) e total. */
function computeTotals(items, discountPct) {
  const list = Array.isArray(items) ? items : [];
  const valid = list.filter(
    (it) => it && Number(it.qty) > 0 && Number.isFinite(Number(it.price))
  );
  const subtotal = valid.reduce((acc, it) => acc + Number(it.qty) * Number(it.price), 0);
  const pct = Math.min(Math.max(Number(discountPct) || 0, 0), 100);
  const discount = (subtotal * pct) / 100;
  const total = Math.max(subtotal - discount, 0);
  return { subtotal, discount, total };
}

/** Normaliza texto para URL/slug. */
function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  let t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  const bin = atob(t);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Serializa o estado da proposta para caber num link (?p=...). */
function encodeProposal(state) {
  const compact = {
    c: state.company || {},
    k: state.client || {},
    i: (state.items || []).map((it) => [
      String(it.desc || '').slice(0, 300),
      Number(it.qty) || 1,
      Number(it.price) || 0,
    ]),
    d: Number(state.discountPct) || 0,
    n: String(state.notes || '').slice(0, 2000),
    m: state.meta || {},
  };
  return b64urlEncode(JSON.stringify(compact));
}

/** Reconstrói o estado a partir do parâmetro de link. Retorna null se inválido. */
function decodeProposal(param) {
  try {
    const o = JSON.parse(b64urlDecode(param));
    if (!o || typeof o !== 'object') return null;
    return {
      company: o.c || {},
      client: o.k || {},
      items: (o.i || []).map((r) => ({ desc: r[0], qty: r[1], price: r[2] })),
      discountPct: o.d || 0,
      notes: o.n || '',
      meta: o.m || {},
    };
  } catch {
    return null;
  }
}

/** Próximo número de proposta: PJ-2026-0001. */
function nextProposalNumber(prev) {
  const year = new Date().getFullYear();
  const m = /^PJ-(\d{4})-(\d+)$/.exec(String(prev || ''));
  const seq = m && m[1] === String(year) ? Number(m[2]) + 1 : 1;
  return `PJ-${year}-${String(seq).padStart(4, '0')}`;
}

/** Validações leves para feedback no formulário. */
function i18nT() {
  return typeof window !== 'undefined' && window.PJI18N ? window.PJI18N.t : (k) => k;
}

function validateItem(it) {
  const msg = i18nT();
  if (!it || !String(it.desc || '').trim()) return msg('core.err.descRequired');
  if (!(Number(it.qty) > 0)) return msg('core.err.qtyPositive');
  if (!Number.isFinite(Number(it.price)) || Number(it.price) < 0) return msg('core.err.badPrice');
  return null;
}

function validateProposal(state) {
  const t = i18nT();
  const errs = [];
  if (!String((state.client && state.client.name) || '').trim())
    errs.push(t('core.err.clientRequired'));
  if (!Array.isArray(state.items) || state.items.length === 0)
    errs.push(t('core.err.itemsRequired'));
  else {
    const bad = state.items.map(validateItem).find(Boolean);
    if (bad) errs.push(t('core.err.invalidItem', { item: bad }));
  }
  return errs;
}

/** Data de validade a partir de hoje + N dias (pt-BR). */
function validityDate(days) {
  const d = new Date(Date.now() + (Number(days) || 0) * 86400000);
  return d.toLocaleDateString('pt-BR');
}

const PJCore = {
  formatBRL,
  computeTotals,
  slugify,
  encodeProposal,
  decodeProposal,
  nextProposalNumber,
  validateItem,
  validateProposal,
  validityDate,
};
if (typeof module !== 'undefined' && module.exports) module.exports = PJCore;
if (typeof globalThis !== 'undefined') globalThis.PJCore = PJCore;
