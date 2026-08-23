// Diagnóstico rápido do fluxo share-modal sob jsdom.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function boot(url) {
  const dom = new JSDOM(html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, ''), {
    url, runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  const store = new Map();
  Object.defineProperty(w, 'localStorage', {
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    }, configurable: true,
  });
  const code =
    fs.readFileSync(path.join(__dirname, '..', 'js/core.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(__dirname, '..', 'js/pix.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(__dirname, '..', 'js/license.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(__dirname, '..', 'js/config.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
  w.eval(code);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return w;
}

const w = boot('http://localhost:8080/index.html');
console.log('dialog proto:', typeof w.HTMLDialogElement);
console.log('showModal:', typeof w.HTMLDialogElement.prototype.showModal);

function type(sel, val) {
  const f = w.document.querySelector(sel);
  f.value = val;
  f.dispatchEvent(new w.Event('input', { bubbles: true }));
}
type('#company-name', 'Christian Dev');
type('#client-name', 'Cliente Teste');
type('#items-tbody .it-desc', 'Bot');
type('#items-tbody .it-price', '1200');

try {
  w.document.getElementById('btn-save-link').click();
  console.log('click ok; modal.open =', w.document.getElementById('share-modal').open);
} catch (e) {
  console.log('THREW:', e.constructor.name, e.message);
}
console.log('form-error:', JSON.stringify(w.document.getElementById('form-error').textContent));
