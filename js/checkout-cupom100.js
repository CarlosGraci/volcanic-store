/* VOLCANIC | Mascara da finalizacao para pedidos 100% cupom (total R$ 0,00, sem pagamento)
   Carregado via GTM (modelo personalizado com injectScript), porque o checkout da Tray bloqueia script inline.
   v3: esconde o quadro vazio em toda volta; v2: troca todas as copias dos textos e reaplica por 60s se a Tray redesenhar a tela. */
(function () {
  if (!/checkout/i.test(location.href)) return;
  if (window.__vlcMascara) return; window.__vlcMascara = true;

  var TITULO = 'Recebemos o seu pedido! Pagamento confirmado: seu pedido foi 100% coberto pelo cupom de desconto.';
  var DICA   = 'Não há nenhum valor a pagar. Você receberá por e-mail as atualizações de separação e envio do seu pedido.';
  var RE_DICA = /entre\s+em\s+contato\s+com\s+nossa\s+equipe\s+para\s+finalizar\s+seu\s+pagamento/i;
  var RE_TIT  = /s[oó]\s+falta\s+concluir\s+o\s+pagamento/i;
  var RE_ROT  = /^dicas$/i;

  function norm(s) { return (s || '').replace(/[\s ]+/g, ' ').trim(); }

  /* todos os elementos que contem o texto, sem nenhum filho que tambem contenha (o nivel mais interno) */
  function internos(re) {
    var out = [], els = document.body.getElementsByTagName('*');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName)) continue;
      if (!re.test(norm(e.textContent))) continue;
      var filhoTem = false, f = e.children;
      for (var j = 0; j < f.length; j++) if (re.test(norm(f[j].textContent))) { filhoTem = true; break; }
      if (!filhoTem) out.push(e);
    }
    return out;
  }

  var ativo = false, cards = [];

  function esconderVazio(dica) {
    var card = dica;
    while (card.parentElement && card.parentElement !== document.body) {
      var ir = card.parentElement.children, vazio = false;
      for (var j = 0; j < ir.length; j++) {
        if (ir[j] !== card && norm(ir[j].textContent) === '' && !ir[j].querySelector('img,iframe,canvas,svg,input,button') && ir[j].offsetHeight > 10) {
          ir[j].style.setProperty('display', 'none', 'important'); vazio = true;
        }
      }
      if (vazio || card.style.flex) {
        card.style.setProperty('width', '100%', 'important');
        card.style.setProperty('max-width', '100%', 'important');
        card.style.setProperty('flex', '1 1 100%', 'important');
        return;
      }
      card = card.parentElement;
      if (/obrigado por sua compra/i.test(norm(card.textContent))) return;
    }
  }

  function aplicar() {
    var dicas = internos(RE_DICA);
    if (dicas.length) ativo = true;
    if (!ativo) return 0;

    var feitos = 0, i;
    var tits = internos(RE_TIT);
    for (i = 0; i < tits.length; i++) { tits[i].textContent = TITULO; tits[i].style.color = '#1a7f37'; feitos++; }

    for (i = 0; i < dicas.length; i++) {
      dicas[i].textContent = DICA; feitos++;
      if (cards.indexOf(dicas[i]) < 0) cards.push(dicas[i]);
    }

    /* esconde o quadro vazio ao lado das dicas (repete a cada volta, porque a Tray pode desenhar ele depois) */
    for (i = 0; i < cards.length; i++) esconderVazio(cards[i]);

    var rots = internos(RE_ROT);
    for (i = 0; i < rots.length; i++) { rots[i].textContent = 'Tudo Certo'; feitos++; }

    if (feitos) console.log('[Volcanic] mascara aplicada: titulos ' + tits.length + ', dicas ' + dicas.length);
    return feitos;
  }

  console.log('[Volcanic] script iniciado v3');
  var n = 0, t = setInterval(function () {
    n++;
    aplicar();
    if (n >= 240) { clearInterval(t); if (!ativo) console.log('[Volcanic] texto da dica NAO encontrado apos 60s'); }
  }, 250);
})();
