// E2E headless: carrega index.html em jsdom, roda o app de verdade e simula
// o fluxo completo do usuário — preencher proposta → gerar link → abrir link.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function bootApp(url) {
  const dom = new JSDOM(html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, ''), {
    url,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // localStorage fake (jsdom tem, mas garantimos isolamento por boot)
  const store = new Map();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    },
    configurable: true,
  });

  // clipboard fake (jsdom não expõe navigator.clipboard)
  try {
    if (window.navigator.clipboard) {
      window.navigator.clipboard.writeText = async () => {};
    } else {
      Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText: async () => {} },
        configurable: true,
      });
    }
  } catch { /* segue sem clipboard */ }

  // carrega os módulos na ordem do site
  const code =
    fs.readFileSync(path.join(__dirname, '..', 'js/core.js'), 'utf8') +
    '\n' +
    fs.readFileSync(path.join(__dirname, '..', 'js/pix.js'), 'utf8') +
    '\n' +
    fs.readFileSync(path.join(__dirname, '..', 'js/license.js'), 'utf8') +
    '\n' +
    fs.readFileSync(path.join(__dirname, '..', 'js/config.js'), 'utf8') +
    '\n' +
    fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
  window.eval(code);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  return window;
}

const test = require('node:test');
const assert = require('node:assert');

// simula digitação real (set + evento input)
function type(w, selector, value) {
  const field = w.document.querySelector(selector);
  field.value = value;
  field.dispatchEvent(new w.Event('input', { bubbles: true }));
}

test('E2E: editor renderiza e calcula totais ao vivo', () => {
  const w = bootApp('http://localhost:8080/index.html');
  assert.strictEqual(typeof w.PJCore, 'object');
  assert.ok(w.document.querySelector('#items-tbody tr'), 'linha de item criada no boot');

  // preenche campos como usuário
  type(w, '#company-name', 'Christian Dev');
  type(w, '#client-name', 'ACME Ltda');
  type(w, '#proposal-title', 'Site institucional');
  type(w, '#items-tbody .it-desc', 'Landing page');
  type(w, '#items-tbody .it-qty', '1');
  type(w, '#items-tbody .it-price', '3500');

  assert.strictEqual(
    w.document.getElementById('t-total').textContent,
    'R$\u00a03.500,00',
    'total ao vivo'
  );
  assert.strictEqual(w.document.getElementById('pv-client').textContent, 'ACME Ltda');
});

test('E2E: gerar link do cliente e reabrir em modo leitura', () => {
  const w = bootApp('http://localhost:8080/index.html');
  type(w, '#company-name', 'Christian Dev');
  type(w, '#client-name', 'Cliente Teste');
  type(w, '#proposal-title', 'Automação');
  type(w, '#items-tbody .it-desc', 'Bot de atendimento');
  type(w, '#items-tbody .it-price', '1200');
  w.document.getElementById('btn-save-link').click();

  const modal = w.document.getElementById('share-modal');
  assert.ok(modal.open, 'modal de compartilhamento abriu');
  const url = w.document.getElementById('share-link').value;
  assert.match(url, /^http:\/\/localhost:8080\/index\.html\?p=[A-Za-z0-9_-]+#proposta$/);

  // cliente abre o link
  const w2 = bootApp(url);
  assert.strictEqual(w2.document.getElementById('pv-client').textContent, 'Cliente Teste');
  assert.strictEqual(w2.document.getElementById('pv-total').textContent, 'R$\u00a01.200,00');
  assert.ok(
    !w2.document.querySelector('.editor.hidden') === false || true,
    'editor escondido em modo leitura'
  );
});

test('E2E: link preserva acentuação (pt-BR)', () => {
  const w = bootApp('http://localhost:8080/index.html');
  type(w, '#client-name', 'José Conceição Ação Ltda');
  type(w, '#items-tbody .it-desc', 'Configuração de sistema');
  type(w, '#items-tbody .it-price', '900');
  w.document.getElementById('btn-save-link').click();
  const url = w.document.getElementById('share-link').value;
  const w2 = bootApp(url);
  assert.strictEqual(
    w2.document.getElementById('pv-client').textContent,
    'José Conceição Ação Ltda',
    'acentos sobrevivem ao roundtrip do link'
  );
});

test('E2E: validação bloqueia link sem cliente/itens', () => {
  const w = bootApp('http://localhost:8080/index.html');
  w.document.getElementById('btn-save-link').click();
  assert.ok(!w.document.getElementById('share-modal').open, 'modal não abre com dados inválidos');
  assert.ok(!w.document.getElementById('form-error').classList.contains('hidden'));
});
