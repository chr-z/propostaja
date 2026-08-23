// Propostly — i18n mínimo (EN/PT-BR). Fonte canônica: /locales/*.json,
// carregados de forma síncrona antes do app; fallback silencioso para a chave.
'use strict';

(function () {
  const LANGS = [
    ['pt-BR', 'Português (BR)'],
    ['en', 'English'],
  ];
  const DICTS = {};

  let current = 'pt-BR';
  try {
    const saved = localStorage.getItem('pj_lang');
    if (saved && LANGS.some(([code]) => code === saved)) current = saved;
    else if ((navigator.language || '').toLowerCase().startsWith('en')) current = 'en';
  } catch { /* segue com pt-BR */ }

  function loadDicts() {
    for (const [code] of LANGS) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', new URL('locales/' + code + '.json', document.baseURI).href, false);
        xhr.send(null);
        if (xhr.status === 200 || xhr.status === 0) {
          DICTS[code] = JSON.parse(xhr.responseText);
        }
      } catch { /* dicionário ausente → chaves cruas */ }
    }
  }

  function t(key, params) {
    const dict = DICTS[current] || {};
    let s = typeof dict[key] === 'string' ? dict[key] : key;
    if (params) {
      for (const k of Object.keys(params)) {
        s = s.split('{' + k + '}').join(String(params[k]));
      }
    }
    return s;
  }

  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach((elm) => {
      elm.textContent = t(elm.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((elm) => {
      elm.setAttribute('placeholder', t(elm.getAttribute('data-i18n-ph')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((elm) => {
      elm.setAttribute('title', t(elm.getAttribute('data-i18n-title')));
    });
    document.documentElement.lang = current === 'en' ? 'en' : 'pt-BR';
  }

  function wireSelector() {
    const sel = document.getElementById('lang-select');
    if (!sel) return;
    sel.innerHTML = '';
    for (const [code, name] of LANGS) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      sel.appendChild(opt);
    }
    sel.value = current;
    sel.addEventListener('change', () => setLang(sel.value));
  }

  function setLang(lang) {
    if (!DICTS[lang]) return;
    current = lang;
    try { localStorage.setItem('pj_lang', lang); } catch { /* ignora */ }
    applyStatic();
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    document.dispatchEvent(new CustomEvent('propostly:langchange'));
  }

  function boot() {
    loadDicts();
    wireSelector();
    applyStatic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.PJI18N = { t, setLang, applyStatic, get lang() { return current; } };
})();
