/* VOLCANIC | Mascara da finalizacao para pedidos 100% cupom (total R$ 0,00, sem pagamento)
   Carregado via GTM (tag HTML personalizado com <script src>), porque o checkout da Tray bloqueia script inline. */
(function () {
  if (!/checkout/i.test(location.href)) return;
  if (window.__vlcMascara) return; window.__vlcMascara = true;

  var TITULO = 'Recebemos o seu pedido! Pagamento confirmado: seu pedido foi 100% coberto pelo cupom de desconto.';
  var DICA   = 'Não há nenhum valor a pagar. Você receberá por e-mail as atualizações de separação e envio do seu pedido.';
  var RE_DICA = /entre\s+em\s+contato\s+com\s+nossa\s+equipe\s+para\s+finalizar\s+seu\s+pagamento/i;
  var RE_TIT  = /s[oó]\s+falta\s+concluir\s+o\s+pagamento/i;

  function norm(s) { return (s || '').replace(/[\s ]+/g, ' ').trim(); }

  function maisInterno(re) {
    var a = null, els = document.body.getElementsByTagName('*');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName)) continue;
      if (re.test(norm(e.textContent))) a = e;
    }
    return a;
  }

  function aplicar() {
    var dica = maisInterno(RE_DICA);
    if (!dica) return false;
    var tit = maisInterno(RE_TIT);
    if (tit) { tit.textContent = TITULO; tit.style.color = '#1a7f37'; }
    dica.textContent = DICA;
    var rot = maisInterno(/^dicas$/i);
    if (rot) rot.textContent = 'Tudo Certo';
    var card = dica;
    while (card.parentElement && card.parentElement !== document.body) {
      var ir = card.parentElement.children, vazio = false;
      for (var j = 0; j < ir.length; j++) {
        if (ir[j] !== card && norm(ir[j].textContent) === '' && ir[j].offsetHeight > 30) { ir[j].style.display = 'none'; vazio = true; }
      }
      if (vazio) { card.style.width = '100%'; card.style.maxWidth = '100%'; card.style.flex = '1 1 100%'; break; }
      card = card.parentElement;
      if (/obrigado por sua compra/i.test(norm(card.textContent))) break;
    }
    console.log('[Volcanic] mascara aplicada (titulo encontrado: ' + !!tit + ')');
    return true;
  }

  console.log('[Volcanic] script iniciado');
  var n = 0, t = setInterval(function () {
    n++;
    if (aplicar()) { clearInterval(t); return; }
    if (n === 240) { clearInterval(t); console.log('[Volcanic] texto da dica NAO encontrado apos 60s'); }
  }, 250);
})();
