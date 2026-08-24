// Teste de integração: app.js deve carregar em ambiente tipo-navegador sem quebrar.
// Valida sintaxe + presença dos pontos de integração com o DOM.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('app.js é JavaScript sintaticamente válido', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  new Function(src); // lança SyntaxError se inválido
  assert.ok(true);
});

test('index.html referencia todos os scripts e IDs usados pelo app.js', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const f of ['core.js', 'pix.js', 'license.js', 'app.js']) {
    assert.ok(html.includes(`js/${f}`), `falta script ${f}`);
  }
  const ids = [
    'company-name', 'client-name', 'items-tbody', 'add-item', 'discount',
    'notes', 'validity-days', 'btn-save-link', 'btn-print', 'share-modal',
    'license-modal', 'btn-activate', 'pro-badge', 'pv-total', 'pv-pix-code',
    'btn-viewer-print-slot', // slot removido dinamicamente; garante que ninguém dependa dele
  ];
  // btn-viewer-print é criado dinamicamente, não pode estar no HTML:
  assert.ok(!html.includes('id="btn-viewer-print"'));
  for (const id of ids) {
    if (id === 'btn-viewer-print-slot') continue;
    assert.ok(html.includes(`id="${id}"`), `falta #${id} no index.html`);
  }
});

test('nenhuma chave privada vai para o repositório', () => {
  for (const f of ['js/core.js', 'js/pix.js', 'js/license.js', 'js/app.js', 'index.html']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/d\s*:\s*[A-Za-z0-9_-]{40,}/.test(src), `possível JWK privado em ${f}`);
    assert.ok(!src.includes('PRIVATE KEY'), `marcador de chave privada em ${f}`);
  }
});

test('marca no documento: gate por plano presente no app.js e rodapé id=doc-foot', () => {
  const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(app.includes('shouldShowBrand(proPlan)'), 'gate de marca ausente no render');
  assert.ok(app.includes('viewBrandless'), 'flag brandless do viewer ausente');
  assert.ok(html.includes('id="doc-foot"'), 'rodapé do documento sem id doc-foot');
  // flag b não pode vazar pro state persistido
  assert.ok(!app.includes('brandless: o.b'), 'brandless não deve entrar no state');
});
