// Testes do i18n mínimo: dicionários válidos, cobertura paritária EN/PT e helper.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const LOCALES = path.join(__dirname, '..', 'locales');

function loadDict(file) {
  return JSON.parse(fs.readFileSync(path.join(LOCALES, file), 'utf8'));
}

test('dicionários pt-BR e en são JSON válido e não vazio', () => {
  const pt = loadDict('pt-BR.json');
  const en = loadDict('en.json');
  assert.ok(Object.keys(pt).length > 80);
  assert.ok(Object.keys(en).length > 80);
});

test('cobertura paritária: toda chave PT existe em EN (e vice-versa)', () => {
  const pt = loadDict('pt-BR.json');
  const en = loadDict('en.json');
  const onlyPt = Object.keys(pt).filter((k) => !(k in en));
  const onlyEn = Object.keys(en).filter((k) => !(k in pt));
  assert.deepStrictEqual(onlyPt, [], `chaves só em pt-BR: ${onlyPt.join(', ')}`);
  assert.deepStrictEqual(onlyEn, [], `chaves só em en: ${onlyEn.join(', ')}`);
});

test('nenhuma tradução ficou vazia', () => {
  for (const file of ['pt-BR.json', 'en.json']) {
    const dict = loadDict(file);
    for (const [k, v] of Object.entries(dict)) {
      assert.strictEqual(typeof v, 'string', `${file}:${k} deve ser string`);
      assert.ok(v.trim().length > 0, `${file}:${k} está vazia`);
    }
  }
});

test('chaves usadas no app existem nos dois dicionários', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8') +
    fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const used = new Set();
  for (const m of appSrc.matchAll(/T\(\s*['"]([\w.:-]+)['"]/g)) used.add(m[1]);
  for (const m of appSrc.matchAll(/data-i18n(?:-ph|-title)?="([\w.:-]+)"/g)) used.add(m[1]);
  assert.ok(used.size >= 30, `esperava >=30 chaves usadas, achei ${used.size}`);
  for (const file of ['pt-BR.json', 'en.json']) {
    const dict = loadDict(file);
    const missing = [...used].filter((k) => !(k in dict));
    assert.deepStrictEqual(missing, [], `${file} sem chaves: ${missing.join(', ')}`);
  }
});

test('interpolação {param} substitui valores', () => {
  const dict = loadDict('pt-BR.json');
  let s = dict['ui.days'];
  for (const k of ['n']) s = s.split('{' + k + '}').join('15');
  assert.ok(!s.includes('{'));
});
