// PropostaJá — configuração pública da instância.
// A chave privada NUNCA fica aqui: ela mora fora do repositório (pasta keys/, gitignored)
// e é usada apenas pela ferramenta local tools/license-cli.js para emitir licenças.
window.PJ_LICENSE_PUBLIC_JWK = {
  crv: 'Ed25519',
  x: 'jUn7Y4-Eb-6tlduPgxioNAJ6iKMLFCER6JgadYTmtDk',
  kty: 'OKP',
};

// Pix do vendedor (recebimento das licenças Pro). Formato:
// window.PJ_SELLER_PIX = { key: 'sua-chave-pix', name: 'NOME RECEBEDOR', city: 'CIDADE', whatsapp: '5511999999999' };
// Deixe null para ocultar o fluxo de compra até configurar.
window.PJ_SELLER_PIX = null;
