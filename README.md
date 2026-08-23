# ⚡ PropostaJá

**Propostas comerciais profissionais para freelancers — em 2 minutos, sem cadastro.**

Crie propostas/orçamentos com numeração automática, desconto, validade, link exclusivo
para o cliente e PDF em um clique. Opcionalmente inclua **Pix copia-e-cola** com o valor
exato da proposta.

🔗 **Demo/produção:** https://chr-z.github.io/propostaja/

## Como funciona

1. Preencha seus dados, os do cliente e os itens do serviço.
2. **Gerar link do cliente** → cria uma URL com a proposta inteira codificada nela
   (`?p=...`). Nada é enviado a servidores.
3. O cliente abre o link, vê um documento limpo e clica em **Salvar em PDF**
   (via impressão do navegador).
4. Se você ativou o **Pro**, a proposta sai com Pix copia-e-cola do valor total,
   pronto pro cliente pagar.

Os rascunhos ficam salvos no `localStorage` do seu navegador.

## Planos

| | Free | Pro vitalícia |
|---|---|---|
| Propostas ilimitadas | ✅ | ✅ |
| Link para o cliente | ✅ | ✅ |
| PDF via impressão | ✅ | ✅ |
| Itens por proposta | até 5 | ilimitados |
| Pix copia-e-cola na proposta | — | ✅ |
| Preço | R$ 0 | R$ 47 (uma vez) |

## Para o dono da instância (vendedor)

O app é 100% estático e gratuito de rodar (GitHub Pages). Para vender licenças Pro:

### 1. Chaves de licença (Ed25519)

```bash
node tools/license-cli.js gen                    # gera keys/*.json (privada NUNCA vai ao git)
node tools/license-cli.js issue cliente@email.com pro-lifetime   # imprime a chave
```

A chave pública já está embutida em `js/config.js`; a privada fica só na sua máquina
(pasta `keys/`, gitignored) e assina cada licença offline. A verificação no navegador
usa WebCrypto — não há servidor para bater nem assinatura forjável.

### 2. Receber pagamentos

Em `js/config.js`, preencha `window.PJ_SELLER_PIX` com sua chave Pix e WhatsApp.
O botão "Quero a Pro" passa a gerar o Pix copia-e-cola do plano e enviar você mesmo
a conferência do comprovante. Emitiu a chave, entregou por e-mail, fim.

## Desenvolvimento

```bash
npm test          # 27 testes: motor de cálculo, Pix EMV/CRC16, licenças Ed25519, E2E jsdom
npm run serve     # servidor local http://localhost:8080
```

- Sem dependências de runtime; `jsdom` é apenas devDependency dos testes E2E.
- CI roda a suíte a cada push; o deploy publica só depois dos testes passarem.

## Estrutura

```
index.html        UI (editor + documento + planos)
js/core.js        motor puro: totais, encode/decode de links, validações
js/pix.js         BR Code EMV + CRC16-CCITT (padrão Banco Central)
js/license.js     Ed25519 issue/verify (Node crypto + WebCrypto)
js/app.js         lógica de interface
tools/            CLI local de licenças + verificador
tests/            unit + integração + E2E headless
```

## Licença

MIT
