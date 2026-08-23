// PropostaJá — lógica da interface. Depende de PJCore, PJPix, PJLicense (globais).
'use strict';

/* ==================== estado ==================== */

const LS = {
  state: 'pj_state_v1',
  license: 'pj_license_v1',
  pixcfg: 'pj_pixcfg_v1',
};

const defaultState = () => ({
  company: { name: '', doc: '', contact: '' },
  client: { name: '', contact: '', doc: '' },
  title: '',
  items: [{ desc: '', qty: 1, price: 0 }],
  discountPct: 0,
  notes: '',
  validityDays: 15,
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(LS.state);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return Object.assign(defaultState(), s);
  } catch {
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(LS.state, JSON.stringify(state));
  } catch { /* storage cheio/bloqueado — segue sem persistir */ }
}

/* ==================== chaves públicas / config ==================== */

// Substituída no deploy pela chave pública Ed25519 real (JWK).
const LICENSE_PUBLIC_JWK = window.PJ_LICENSE_PUBLIC_JWK || null;

// Pix do vendedor da licença Pro — substituído no deploy.
const SELLER_PIX = window.PJ_SELLER_PIX || null;

const PRO_PRICE_BRL = 47;
const FREE_LIMIT_ITEMS = 5;

let proPlan = null; // 'pro' | 'pro-lifetime' | null

async function restoreLicense() {
  const saved = localStorage.getItem(LS.license);
  if (!saved || !LICENSE_PUBLIC_JWK) return;
  const res = await PJLicense.verifyLicense(saved, LICENSE_PUBLIC_JWK);
  if (res.valid) {
    proPlan = res.plan;
    document.getElementById('pro-badge').classList.remove('hidden');
    document.getElementById('btn-license').textContent = `Pro · ${res.email}`;
  }
}

/* ==================== helpers DOM ==================== */

const $ = (sel) => document.querySelector(sel);
const el = (id) => document.getElementById(id);

function showError(msg) {
  const box = el('form-error');
  if (!msg) {
    box.classList.add('hidden');
    return;
  }
  box.textContent = msg;
  box.classList.remove('hidden');
}

function readForm() {
  return {
    company: {
      name: el('company-name').value.trim(),
      doc: el('company-doc').value.trim(),
      contact: el('company-contact').value.trim(),
    },
    client: {
      name: el('client-name').value.trim(),
      contact: el('client-contact').value.trim(),
      doc: el('client-doc').value.trim(),
    },
    title: el('proposal-title').value.trim(),
    items: collectItems(),
    discountPct: Number(el('discount').value) || 0,
    notes: el('notes').value,
    validityDays: Number(el('validity-days').value) || 15,
  };
}

function collectItems() {
  return [...document.querySelectorAll('#items-tbody tr')].map((tr) => ({
    desc: tr.querySelector('.it-desc').value,
    qty: parseFloat(tr.querySelector('.it-qty').value.replace(',', '.')) || 0,
    price: parseFloat(tr.querySelector('.it-price').value.replace(',', '.')) || 0,
  }));
}

/* ==================== itens ==================== */

function addItemRow(item) {
  const tbody = el('items-tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="it-desc" placeholder="Ex.: Landing page" /></td>
    <td class="num"><input class="it-qty" inputmode="decimal" value="1" /></td>
    <td class="num"><input class="it-price" inputmode="decimal" placeholder="0,00" /></td>
    <td class="num it-sub">R$ 0,00</td>
    <td><button class="rm" type="button" title="Remover item">×</button></td>`;
  tr.querySelector('.it-desc').value = item.desc || '';
  tr.querySelector('.it-qty').value = String(item.qty ?? 1).replace('.', ',');
  tr.querySelector('.it-price').value = item.price ? String(item.price).replace('.', ',') : '';
  tbody.appendChild(tr);
}

function removeItemRow(btn) {
  const rows = document.querySelectorAll('#items-tbody tr');
  if (rows.length <= 1) return; // sempre mantém uma linha
  btn.closest('tr').remove();
  render();
}

/* ==================== render ==================== */

function render() {
  state = readForm();
  saveState();
  const totals = PJCore.computeTotals(state.items, state.discountPct);

  // totais do editor
  el('t-total').textContent = PJCore.formatBRL(totals.total);

  // subtotais por linha
  let i = 0;
  for (const tr of document.querySelectorAll('#items-tbody tr')) {
    const it = state.items[i++];
    const t = PJCore.computeTotals([it], 0);
    tr.querySelector('.it-sub').textContent = PJCore.formatBRL(t.subtotal);
  }

  // preview
  el('pv-company').textContent = state.company.name || 'Sua Empresa';
  el('pv-company-meta').textContent =
    [state.company.doc, state.company.contact].filter(Boolean).join(' · ');
  el('pv-client').textContent = state.client.name || '—';
  el('pv-client-meta').textContent =
    [state.client.doc, state.client.contact].filter(Boolean).join(' · ');
  el('pv-title').textContent = state.title || 'Proposta';
  el('pv-number').textContent = nextNumberForPreview();
  el('pv-date').textContent =
    `Emitida em ${new Date().toLocaleDateString('pt-BR')} · válida até ${PJCore.validityDate(state.validityDays)}`;
  el('pv-validity').textContent = `${state.validityDays} dias`;

  const pvItems = el('pv-items');
  pvItems.innerHTML = '';
  state.items
    .filter((it) => it.desc.trim() || it.qty > 0)
    .forEach((it, idx) => {
      const sub = PJCore.computeTotals([it], 0).subtotal;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx + 1}</td><td></td><td class="num"></td><td class="num"></td><td class="num"></td>`;
      tr.children[1].textContent = it.desc || '—';
      tr.children[2].textContent = String(it.qty).replace('.', ',');
      tr.children[3].textContent = PJCore.formatBRL(it.price);
      tr.children[4].textContent = PJCore.formatBRL(sub);
      pvItems.appendChild(tr);
    });

  el('pv-subtotal').textContent = PJCore.formatBRL(totals.subtotal);
  el('pv-discount-row').classList.toggle('hidden', !(totals.discount > 0));
  el('pv-discount').textContent = `- ${PJCore.formatBRL(totals.discount)} (${state.discountPct}%)`;
  el('pv-total').textContent = PJCore.formatBRL(totals.total);

  const nb = el('pv-notes-block');
  nb.classList.toggle('hidden', !state.notes.trim());
  el('pv-notes').textContent = state.notes;

  renderPix(totals.total);
}

function nextNumberForPreview() {
  const prev = localStorage.getItem('pj_last_number') || null;
  return PJCore.nextProposalNumber(prev);
}

function renderPix(total) {
  const cfg = JSON.parse(localStorage.getItem(LS.pixcfg) || 'null') ||
    { key: '', name: '', city: '' };
  const block = el('pv-pix-block');

  // Free: mostra teaser do recurso Pro
  if (!proPlan) {
    block.classList.add('hidden');
    return;
  }
  const key = cfg.key || el('pix-key').value.trim();
  if (!key || !(total > 0)) {
    block.classList.add('hidden');
    return;
  }
  try {
    const payload = PJPix.buildPixPayload({
      keyPix: key,
      merchantName: cfg.name || state.company.name || 'Recebedor',
      merchantCity: cfg.city || 'SAO PAULO',
      amount: total,
      txid: nextNumberForPreview().replace(/-/g, ''),
    });
    el('pv-pix-code').textContent = payload;
    block.classList.remove('hidden');
  } catch {
    block.classList.add('hidden');
  }
}

/* ==================== ações ==================== */

function buildShareUrl() {
  const compact = {
    c: state.company,
    k: state.client,
    t: state.title,
    i: state.items.map((it) => [it.desc, it.qty, it.price]),
    d: state.discountPct,
    n: state.notes,
    v: state.validityDays,
    m: { num: nextNumberForPreview(), date: new Date().toISOString().slice(0, 10) },
  };
  // reusa encode/decode via meta genérica: montamos na mão para incluir título/validade
  const b64 = (() => {
    const bytes = new TextEncoder().encode(JSON.stringify(compact));
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  })();
  return `${location.origin}${location.pathname}?p=${b64}#proposta`;
}

function openModal(dlg) {
  if (typeof dlg.showModal === 'function') {
    dlg.showModal();
  } else {
    // fallback p/ ambientes sem <dialog> (jsdom, navegadores antigos)
    dlg.setAttribute('open', '');
  }
}

function openShareModal(url) {
  el('share-link').value = url;
  openModal(el('share-modal'));
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback legado
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  if (btn) {
    const old = btn.textContent;
    btn.textContent = 'Copiado ✓';
    setTimeout(() => (btn.textContent = old), 1600);
  }
}

function onSaveLink() {
  const errs = PJCore.validateProposal({ client: state.client, items: state.items });
  if (errs.length) {
    showError(errs.join(' '));
    return;
  }
  showError('');
  localStorage.setItem('pj_last_number', nextNumberForPreview());
  openShareModal(buildShareUrl());
  render();
}

function onPrint() {
  const viewingShared = new URLSearchParams(location.search).has('p');
  if (viewingShared) {
    window.print();
    return;
  }
  // modo editor: imprime só o documento
  document.body.classList.add('print-mode-doc');
  const cleanup = () => {
    document.body.classList.remove('print-mode-doc');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}

async function onBuy(plan) {
  if (!SELLER_PIX) {
    alert('Pagamentos ainda não configurados nesta instância. Fale com o vendedor.');
    return;
  }
  const email = prompt('Informe seu e-mail (a chave Pro será vinculada a ele):');
  if (!email) return;

  // 1) gera Pix copia-e-cola do valor do plano
  let payload;
  try {
    payload = PJPix.buildPixPayload({
      keyPix: SELLER_PIX.key,
      merchantName: SELLER_PIX.name,
      merchantCity: SELLER_PIX.city,
      amount: PRO_PRICE_BRL,
      txid: 'PROPOSTAJA' + Date.now().toString(36).toUpperCase().slice(-8),
    });
  } catch (e) {
    alert('Não foi possível gerar o Pix: ' + e.message);
    return;
  }

  await copyText(payload);
  const ok = confirm(
    `Pix copia e cola copiado (${PJCore.formatBRL(PRO_PRICE_BRL)})!\n\n` +
      `Cole no app do banco e pague.\n\nDepois de pagar, clique em OK e informe o código da transação (aparece no comprovante).`
  );
  if (!ok) return;

  const proof = prompt('Cole aqui o ID/Código da transação do comprovante Pix:');
  if (!proof) return;

  // 2) envia comprovante por WhatsApp do vendedor (se configurado)
  const wa = SELLER_PIX.whatsapp ? SELLER_PIX.whatsapp.replace(/\D/g, '') : null;
  const msg = encodeURIComponent(
    `Paguei PropostaJá Pro (${PJCore.formatBRL(PRO_PRICE_BRL)}).\n` +
      `E-mail: ${email}\nComprovante/txid: ${proof}`
  );
  if (wa) {
    window.open(`https://wa.me/${wa}?text=${msg}`, '_blank');
    alert(
      'Pedido enviado! Assim que o pagamento for conferido, você recebe sua chave por e-mail. ' +
        'Ela já pode ser ativada em "Tenho uma chave".'
    );
  } else {
    alert(
      `Guarde este pedido e envie ao vendedor:\n\n${decodeURIComponent(msg)}`
    );
  }
}

async function onActivate() {
  const errBox = el('license-error');
  errBox.classList.add('hidden');
  const key = el('license-key').value.trim();
  const email = el('license-email').value.trim().toLowerCase();
  if (!key || !LICENSE_PUBLIC_JWK) {
    errBox.textContent = 'Chave inválida ou verificação indisponível.';
    errBox.classList.remove('hidden');
    return;
  }
  const res = await PJLicense.verifyLicense(key, LICENSE_PUBLIC_JWK);
  if (!res.valid) {
    errBox.textContent = `Licença ${res.reason}. Confira se copiou completa.`;
    errBox.classList.remove('hidden');
    return;
  }
  if (email && res.email && email !== res.email) {
    errBox.textContent = 'Este e-mail não é o da compra.';
    errBox.classList.remove('hidden');
    return;
  }
  localStorage.setItem(LS.license, key);
  proPlan = res.plan;
  el('license-modal').close();
  el('btn-license').textContent = `Pro · ${res.email}`;
  el('pro-badge').classList.remove('hidden');
  render();
}

/* ==================== modo "cliente" (?p=...) ==================== */

function isViewMode() {
  return new URLSearchParams(location.search).has('p');
}

function enterViewMode() {
  const p = new URLSearchParams(location.search).get('p');
  const data = decodeViewParam(p);
  if (!data) {
    location.replace(location.pathname); // link corrompido → editor
    return;
  }
  Object.assign(state, data);
  fillFormFromState();
  render();

  // esconde edição; deixa só leitura + PDF
  document.body.classList.add('view-mode');
  el('app').querySelector('.editor').classList.add('hidden');
  el('preview').style.maxWidth = '820px';
  el('preview').style.margin = '26px auto';
  el('btn-print').classList.add('hidden'); // dentro do editor
  document.getElementById('btn-viewer-print')?.remove();
  const vp = document.createElement('button');
  vp.id = 'btn-viewer-print';
  vp.className = 'btn primary';
  vp.type = 'button';
  vp.style.marginTop = '14px';
  vp.textContent = 'Salvar em PDF 🖨️';
  vp.addEventListener('click', () => window.print());
  el('preview').appendChild(vp);
}

function decodeViewParam(p) {
  try {
    let t = String(p).replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    const o = JSON.parse(atob(t));
    return {
      company: o.c || {},
      client: o.k || {},
      title: o.t || '',
      items: (o.i || []).map((r) => ({ desc: r[0], qty: r[1], price: r[2] })),
      discountPct: o.d || 0,
      notes: o.n || '',
      validityDays: o.v || 15,
    };
  } catch {
    return null;
  }
}

function fillFormFromState() {
  el('company-name').value = state.company.name || '';
  el('company-doc').value = state.company.doc || '';
  el('company-contact').value = state.company.contact || '';
  el('pix-key').value = (JSON.parse(localStorage.getItem(LS.pixcfg) || 'null') || {}).key || '';
  el('client-name').value = state.client.name || '';
  el('client-contact').value = state.client.contact || '';
  el('client-doc').value = state.client.doc || '';
  el('proposal-title').value = state.title || '';
  el('items-tbody').innerHTML = '';
  (state.items.length ? state.items : [{ desc: '', qty: 1, price: 0 }]).forEach(addItemRow);
  el('discount').value = state.discountPct || 0;
  el('notes').value = state.notes || '';
  el('validity-days').value = state.validityDays || 15;
}

/* ==================== init ==================== */

function init() {
  // preenche form com estado salvo
  el('company-name').value = state.company.name || '';
  el('company-doc').value = state.company.doc || '';
  el('company-contact').value = state.company.contact || '';
  el('client-name').value = state.client.name || '';
  el('client-contact').value = state.client.contact || '';
  el('client-doc').value = state.client.doc || '';
  el('proposal-title').value = state.title || '';
  (state.items.length ? state.items : [defaultState().items[0]]).forEach(addItemRow);
  el('discount').value = state.discountPct || 0;
  el('notes').value = state.notes || '';
  el('validity-days').value = state.validityDays || 15;

  // listeners do formulário
  ['company-name', 'company-doc', 'company-contact', 'pix-key', 'client-name',
    'client-contact', 'client-doc', 'proposal-title', 'discount', 'notes', 'validity-days']
    .forEach((id) => el(id).addEventListener('input', render));
  el('items-tbody').addEventListener('input', render);
  el('add-item').addEventListener('click', () => {
    const items = collectItems();
    if (!proPlan && items.filter((it) => it.desc.trim()).length >= FREE_LIMIT_ITEMS) {
      showError(`No plano Free vão até ${FREE_LIMIT_ITEMS} itens por proposta. A Pro libera ilimitados.`);
      document.querySelector('#planos').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    addItemRow({ desc: '', qty: 1, price: '' });
    render();
    document.querySelector('#items-tbody tr:last-child .it-desc').focus();
  });
  el('items-tbody').addEventListener('click', (ev) => {
    if (ev.target.classList.contains('rm')) removeItemRow(ev.target);
  });

  // topo
  el('btn-new').addEventListener('click', () => {
    if (!confirm('Começar uma proposta nova? O rascunho atual será apagado.')) return;
    localStorage.removeItem(LS.state);
    localStorage.removeItem('pj_last_number');
    state = defaultState();
    fillFormFromState();
    render();
  });
  el('btn-license').addEventListener('click', () => el('license-modal').showModal());
  document.querySelectorAll('.js-close').forEach((b) =>
    b.addEventListener('click', (e) => e.target.closest('dialog').close()));

  // ações principais
  el('btn-save-link').addEventListener('click', onSaveLink);
  el('btn-copy-link').addEventListener('click', (e) =>
    copyText(el('share-link').value, e.target));
  el('btn-open-link').addEventListener('click', () =>
    window.open(el('share-link').value, '_blank'));
  el('btn-print').addEventListener('click', onPrint);
  el('btn-copy-pix').addEventListener('click', (e) =>
    copyText(el('pv-pix-code').textContent, e.target));
  el('btn-activate').addEventListener('click', onActivate);
  document.querySelectorAll('.js-buy').forEach((b) =>
    b.addEventListener('click', () => onBuy(b.dataset.plan)));

  // salva config Pix junto com o estado
  el('pix-key').addEventListener('change', () => {
    const cfg = JSON.parse(localStorage.getItem(LS.pixcfg) || '{}');
    cfg.key = el('pix-key').value.trim();
    if (!cfg.name) cfg.name = el('company-name').value.trim() || 'Recebedor';
    if (!cfg.city) cfg.city = 'SAO PAULO';
    localStorage.setItem(LS.pixcfg, JSON.stringify(cfg));
    render();
  });

  restoreLicense().finally(render);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  if (isViewMode()) enterViewMode();
});
