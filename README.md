<div align="center">

<!-- hero -->
<img src="https://img.shields.io/badge/proposals-2%20minutes-f5b301?style=for-the-badge&labelColor=0e1116" alt="Proposals in 2 minutes" />
<img src="https://img.shields.io/badge/privacy-100%25%20local-37d67a?style=for-the-badge&labelColor=0e1116" alt="100% local" />

# ⚡ Propostly

**Professional business proposals in minutes — free, private, installable.**
**Propostas comerciais profissionais em minutos — grátis, privadas e instaláveis.**

[![CI](https://github.com/chr-z/propostaja/actions/workflows/ci.yml/badge.svg)](https://github.com/chr-z/propostaja/actions/workflows/ci.yml)
[![Deploy](https://github.com/chr-z/propostaja/actions/workflows/pages.yml/badge.svg)](https://github.com/chr-z/propostaja/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-f5b301.svg)](LICENSE)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20PT--BR-blueviolet)](#internationalization--internacionaliza%C3%A7%C3%A3o)

🔗 **Live demo → [chr-z.github.io/propostaja](https://chr-z.github.io/propostaja/)**

</div>

---

Propostly turns a simple form into a **client-ready proposal document**: automatic numbering,
itemized pricing, discounts, validity dates and a **shareable read-only link** your client opens
in any browser — then saves as PDF with one click. Optionally embed a **Pix copy-and-pay code**
with the exact amount so you get paid faster.

Nothing is uploaded anywhere: every proposal is encoded into the link itself
(base64url) and drafts live in your browser's `localStorage`. No account, no server, no telemetry.

> 🇧🇷 Propostly é a nova marca do PropostaJá — mesmo app que você já conhece, agora global:
> interface em inglês ou português, pronta para clientes em qualquer lugar.

## ✨ Features

| | |
|---|---|
| 🔗 **Shareable client link** | The whole proposal is encoded in the URL — the client sees a clean read-only page, no editing, no backend |
| 🖨️ **Print-perfect PDF** | Dedicated print stylesheet; "Save as PDF" produces a clean, branded document |
| #️⃣ **Automatic numbering** | `PJ-2026-0001` style numbering that persists between sessions |
| 💸 **Discounts & totals** | Percentage discount, per-item subtotals, live grand total |
| ⏳ **Validity control** | Set validity in days; expiry date computed automatically on the document |
| ⚡ **Pix copy-and-pay (Pro)** | EMV BR Code with CRC16 generated locally — paste-ready for Brazilian instant payments |
| 🔐 **Offline Pro licensing** | Ed25519-signed license keys verified in-browser via WebCrypto — nothing to phone home |
| 🌎 **EN / PT-BR interface** | One-click language switch, persisted; dictionaries are plain JSON |
| 📲 **Installable PWA** | Web app manifest + service worker: works offline, installs on desktop & mobile |
| 🛡️ **Private by design** | Zero runtime dependencies, zero network calls, zero cookies |

## 🖼️ Screenshots

| Editor | Client view | Pricing |
|---|---|---|
| *Two-pane editor: form on the left, live proposal preview on the right.* | *Read-only client page with itemized table and Save-as-PDF button.* | *Free vs Lifetime Pro comparison cards.* |

> Screenshots coming soon — meanwhile, try the [live demo](https://chr-z.github.io/propostaja/) (no signup needed).

## 🚀 Quick start

1. Open the [demo](https://chr-z.github.io/propostaja/)
2. Fill in your details, the client's and the service items
3. Click **Generate client link** → send it via WhatsApp/e-mail
4. Your client opens it, reviews, clicks **Save as PDF** — done ✅

Drafts autosave locally; switching to English is one click in the header.

## 💰 Pricing

### English

| | Free | Lifetime Pro |
|---|---|---|
| Unlimited proposals | ✅ | ✅ |
| Shareable client links | ✅ | ✅ |
| Print-to-PDF documents | ✅ | ✅ |
| Items per proposal | up to 5 | unlimited |
| Pix copy-and-pay code on proposals | — | ✅ |
| Automatic `PJ-YYYY-NNNN` numbering | ✅ | ✅ |
| Price | **$0 forever** | **one-time payment** |

### Português

| | Free | Pro vitalícia |
|---|---|---|
| Propostas ilimitadas | ✅ | ✅ |
| Links exclusivos para o cliente | ✅ | ✅ |
| Documentos em PDF via impressão | ✅ | ✅ |
| Itens por proposta | até 5 | ilimitados |
| Pix copia-e-cola na proposta | — | ✅ |
| Numeração automática PJ-AAAA-NNNN | ✅ | ✅ |
| Preço | **R$ 0 sempre** | **R$ 47 uma vez** |

The Pro upgrade is delivered as an Ed25519-signed key tied to your e-mail, activated offline in
two clicks. Instance owners can issue licenses with the bundled CLI:

```bash
node tools/license-cli.js gen                     # generate keypair (private key stays local)
node tools/license-cli.js issue client@email.com pro-lifetime   # print a signed key
```

Set `window.PJ_SELLER_PIX` in `js/config.js` to enable the self-serve purchase flow.

## 🌎 Internationalization / Internacionalização

- Dictionaries live in [`locales/en.json`](locales/en.json) and [`locales/pt-BR.json`](locales/pt-BR.json)
- Static UI uses `data-i18n` attributes; dynamic strings go through the `PJI18N.t()` helper
- Language auto-detects from the browser and persists in `localStorage`
- CI enforces **key parity** between locales — no missing translations can slip in

## 🧱 Tech notes

```
index.html        UI (editor + document + plans + hero)
css/styles.css    dark theme, responsive, dedicated print stylesheet
js/core.js        pure engine: totals, link encode/decode, validations
js/pix.js         Pix BR Code (EMV) + CRC16-CCITT (Banco Central spec)
js/license.js     Ed25519 issue/verify (Node crypto + WebCrypto)
js/i18n.js        minimal i18n runtime (EN/PT-BR)
js/app.js         UI logic
sw.js             service worker (offline-first PWA)
manifest.json     PWA manifest
tests/            33 tests: unit + integration + jsdom E2E + i18n parity
tools/            license CLI + production E2E check
```

```bash
npm test          # 33 tests (engine, Pix EMV/CRC16, licenses, E2E, i18n)
npm run serve     # local server at http://localhost:8080
```

No runtime dependencies — `jsdom` is a devDependency used only by the E2E tests.
CI runs the suite on every push; Pages deploys only after tests pass.

## 🗺️ Roadmap

- [x] v1 — editor, client link, PDF via print, Pix code, Pro licensing *(as PropostaJá)*
- [x] v1.1 — UTF-8 safe client links
- [x] **v2 — rebrand to Propostly, EN/PT-BR i18n, installable PWA**
- [ ] Currency selector beyond BRL formatting (USD/EUR display)
- [ ] Proposal templates library
- [ ] Optional dark/light theme toggle
- [ ] Multi-proposal dashboard with local history search

## 🤝 Contributing

Issues and PRs welcome — keep it dependency-free and test-covered.
Run `npm test` before submitting.

## 📄 License

MIT © Christian (@chr-z)

<div align="center">

**Built by [@chr-z](https://github.com/chr-z)** · [more projects](https://github.com/chr-z?tab=repositories)

</div>
