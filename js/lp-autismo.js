(function () {
    var root = document.getElementById('lpn');
    if (!root) return;
    /* Configuração vem do HTML da página (atributos data- na div #lpn) */
    var CFG = {
        rdToken: root.getAttribute('data-rd-token') || '',
        rdId: root.getAttribute('data-rd-id') || 'lp-neurobalance-ebook',
        storeId: root.getAttribute('data-store-id') || '',
        blogFeed: root.getAttribute('data-blog-feed') || 'https://blog.volcanicstore.com/feed/',
        blogUrl: root.getAttribute('data-blog-url') || 'https://blog.volcanicstore.com/',
        newsQuery: 'autismo OR "espectro autista" OR TEA autismo',
        newsMax: 6
    };

    /* ---------- Medição (GA4/GTM e Meta Pixel) ---------- */
    function track(name, extra) {
        try {
            window.dataLayer = window.dataLayer || [];
            var ev = { event: 'lp_neurobalance', lp_action: name };
            for (var k in (extra || {})) ev[k] = extra[k];
            window.dataLayer.push(ev);
            if (typeof window.gtag === 'function') window.gtag('event', name, extra || {});
        } catch (e) {}
    }
    root.addEventListener('click', function (e) {
        var el = e.target.closest('[data-lpn-track]');
        if (el) track(el.getAttribute('data-lpn-track'));
    });

    /* ---------- UTMs (guardadas para irem junto com o lead) ---------- */
    var utm = {};
    try {
        var qs = new URLSearchParams(location.search);
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(function (k) {
            if (qs.get(k)) utm[k] = qs.get(k);
        });
        if (Object.keys(utm).length) sessionStorage.setItem('lpn_utm', JSON.stringify(utm));
        else utm = JSON.parse(sessionStorage.getItem('lpn_utm') || '{}');
    } catch (e) {}

    /* ---------- Formulário de leads ---------- */
    var form = document.getElementById('lpn-lead-form');
    var success = document.getElementById('lpn-success');
    var phone = document.getElementById('lpn-whats');

    phone.addEventListener('input', function () {
        var d = phone.value.replace(/\D/g, '').slice(0, 11);
        var out = d;
        if (d.length > 2) out = '(' + d.slice(0, 2) + ') ' + d.slice(2);
        if (d.length > 7) out = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
        phone.value = out;
    });

    function setError(input, on) {
        var f = input.closest('.lpn-field');
        if (f) f.classList.toggle('has-error', on);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = form.querySelector('.lpn-form-msg');
        var nome = form.name.value.trim();
        var email = form.email.value.trim();
        var tel = phone.value.replace(/\D/g, '');
        var perfil = form.cf_perfil.value;
        var ok = true;

        setError(form.name, !nome); if (!nome) ok = false;
        var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
        setError(form.email, !emailOk); if (!emailOk) ok = false;
        setError(phone, tel.length < 10); if (tel.length < 10) ok = false;
        setError(form.cf_perfil, !perfil); if (!perfil) ok = false;

        if (!ok) { msg.textContent = 'Confira os campos destacados.'; return; }
        if (!document.getElementById('lpn-lgpd').checked) { msg.textContent = 'Marque a autorização para receber os materiais.'; return; }
        msg.textContent = '';

        var btn = form.querySelector('button[type=submit]');
        btn.disabled = true; btn.style.opacity = .7;

        var jobs = [];

        /* 1) Newsletter da Tray (garante o e-mail na base da loja) */
        try {
            var fd = new FormData();
            fd.append('loja', CFG.storeId);
            fd.append('email', email);
            jobs.push(fetch('/mvc/store/newsletter/', { method: 'POST', body: fd, credentials: 'same-origin' }).catch(function () {}));
        } catch (err) {}

        /* 2) RD Station Marketing (conversão com token público) */
        if (CFG.rdToken) {
            var payload = {
                event_type: 'CONVERSION',
                event_family: 'CDP',
                payload: Object.assign({
                    conversion_identifier: CFG.rdId,
                    name: nome,
                    email: email,
                    mobile_phone: '+55' + tel,
                    cf_perfil: perfil,
                    legal_bases: [{ category: 'communications', type: 'consent', status: 'granted' }],
                    traffic_source: utm.utm_source || document.referrer || 'direct'
                }, utm.utm_medium ? { traffic_medium: utm.utm_medium } : {}, utm.utm_campaign ? { traffic_campaign: utm.utm_campaign } : {}, utm.utm_term ? { traffic_value: utm.utm_term } : {})
            };
            jobs.push(fetch('https://api.rd.services/platform/conversions?api_key=' + encodeURIComponent(CFG.rdToken), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(function () {}));
        }

        Promise.all(jobs).then(function () {
            track('generate_lead', { lead_source: 'ebook_neurobalance', perfil: perfil });
            try { if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_name: 'E-book NeuroBalance ASD' }); } catch (err) {}
            form.style.display = 'none';
            success.classList.add('is-visible');
            try { localStorage.setItem('lpn_ebook_ok', '1'); } catch (err) {}
        });
    });

    /* ---------- Vídeos do Instagram: o player oficial (capa + vídeo) entra quando o card chega perto da tela ---------- */
    function mountIg(fr) {
        if (fr.querySelector('iframe')) return;
        var f = document.createElement('iframe');
        f.src = fr.getAttribute('data-src');
        f.title = 'Vídeo: ' + (fr.getAttribute('data-title') || 'Instagram');
        f.setAttribute('scrolling', 'no');
        f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; clipboard-write');
        f.setAttribute('allowfullscreen', '');
        f.loading = 'lazy';
        fr.appendChild(f);
        var fb = fr.querySelector('.lpn-ig-fallback'); if (fb) fb.style.display = 'none';
    }
    var igFrames = root.querySelectorAll('[data-lpn-igframe]');
    if ('IntersectionObserver' in window) {
        var igo = new IntersectionObserver(function (en) {
            en.forEach(function (x) { if (x.isIntersecting) { mountIg(x.target); igo.unobserve(x.target); } });
        }, { rootMargin: '300px 600px' });
        igFrames.forEach(function (fr) { igo.observe(fr); });
    } else { igFrames.forEach(mountIg); }
    /* O clique vai para dentro do player; quando a página perde o foco para o iframe, escondemos o título para o vídeo ficar limpo */
    window.addEventListener('blur', function () {
        setTimeout(function () {
            var a = document.activeElement;
            if (a && a.tagName === 'IFRAME' && a.parentNode && a.parentNode.hasAttribute('data-lpn-igframe')) {
                a.parentNode.classList.add('is-playing');
                track('video_play', { video_title: a.parentNode.getAttribute('data-title') });
            }
        }, 0);
    });

    /* ---------- Quem já se cadastrou volta direto para a leitura ---------- */
    try {
        if (localStorage.getItem('lpn_ebook_ok') === '1') {
            form.style.display = 'none';
            success.classList.add('is-visible');
        }
    } catch (e) {}

    /* ---------- Leitor do e-book ---------- */
    var reader = document.getElementById('lpn-reader');
    var rPages = document.getElementById('lpn-reader-pages');
    var rCount = document.getElementById('lpn-reader-count');
    var rRange = document.getElementById('lpn-reader-range');
    var rTotal = parseInt(reader.getAttribute('data-total'), 10) || 1;
    var rBase = reader.getAttribute('data-pasta');
    var rPage = 1;
    var lastFocus = null;
    function pageSrc(n) { return rBase + 'p' + (n < 10 ? '0' + n : n) + '.jpg'; }
    function isSpread() { return window.innerWidth >= 1100 && window.innerHeight >= 600; }
    function renderReader() {
        var spread = isSpread() && rPage > 1;
        var nums = spread ? [rPage, rPage + 1].filter(function (n) { return n <= rTotal; }) : [rPage];
        rPages.classList.toggle('single', nums.length === 1);
        rPages.innerHTML = nums.map(function (n) {
            return '<img src="' + pageSrc(n) + '" alt="Página ' + n + ' do e-book" width="992" height="1404" decoding="async">';
        }).join('');
        var shown = nums.length > 1 ? nums[0] + '–' + nums[1] : nums[0];
        rCount.textContent = shown + ' / ' + rTotal;
        rRange.value = rPage;
        var last = nums[nums.length - 1];
        reader.querySelectorAll('[data-lpn-prev]').forEach(function (b) { b.disabled = rPage <= 1; });
        reader.querySelectorAll('[data-lpn-next]').forEach(function (b) { b.disabled = last >= rTotal; });
        [last + 1, last + 2].forEach(function (n) { if (n <= rTotal) { var i = new Image(); i.src = pageSrc(n); } });
    }
    function step(dir) {
        var spread = isSpread();
        if (dir > 0) rPage = rPage === 1 || !spread ? rPage + 1 : rPage + 2;
        else rPage = !spread || rPage <= 2 ? rPage - 1 : rPage - 2;
        rPage = Math.max(1, Math.min(rTotal, rPage));
        renderReader();
        if (rPage === rTotal || rPage + 1 === rTotal) track('ebook_fim');
    }
    function openReader() {
        lastFocus = document.activeElement;
        reader.classList.add('is-open');
        document.documentElement.style.overflow = 'hidden';
        renderReader();
        reader.querySelector('[data-lpn-close-reader]').focus();
    }
    function closeReader() {
        reader.classList.remove('is-open');
        document.documentElement.style.overflow = '';
        track('ebook_fechar', { ebook_pagina: rPage });
        if (lastFocus) lastFocus.focus();
    }
    root.querySelectorAll('[data-lpn-open-reader]').forEach(function (b) { b.addEventListener('click', openReader); });
    reader.querySelector('[data-lpn-close-reader]').addEventListener('click', closeReader);
    reader.querySelectorAll('[data-lpn-prev]').forEach(function (b) { b.addEventListener('click', function () { step(-1); }); });
    reader.querySelectorAll('[data-lpn-next]').forEach(function (b) { b.addEventListener('click', function () { step(1); }); });
    rRange.addEventListener('input', function () { rPage = parseInt(rRange.value, 10); if (isSpread() && rPage > 1 && rPage % 2 === 1) rPage -= 1; renderReader(); });
    document.addEventListener('keydown', function (e) {
        if (!reader.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeReader();
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'ArrowLeft') step(-1);
    });
    var tx = null;
    rPages.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    rPages.addEventListener('touchend', function (e) {
        if (tx === null) return;
        var dx = e.changedTouches[0].clientX - tx;
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        tx = null;
    }, { passive: true });
    window.addEventListener('resize', function () { if (reader.classList.contains('is-open')) renderReader(); });

    /* ---------- Navegação: item ativo + barra fixa no celular ---------- */
    var links = root.querySelectorAll('.lpn-nav a[href^="#"]');
    var sticky = document.getElementById('lpn-sticky');
    var hero = root.querySelector('.lpn-hero');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });

        new IntersectionObserver(function (entries) {
            sticky.classList.toggle('is-visible', !entries[0].isIntersecting);
        }).observe(hero);
    }

    /* ---------- Notícias em tempo real + artigos do blog ---------- */
    var box = document.getElementById('lpn-news');
    var status = document.getElementById('lpn-news-status');
    var cache = {};

    function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function fmtDate(s) {
        var d = new Date((s || '').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'));
        if (isNaN(d)) return '';
        var diff = (Date.now() - d.getTime()) / 36e5;
        if (diff < 1) return 'agora há pouco';
        if (diff < 24) return 'há ' + Math.round(diff) + 'h';
        if (diff < 48) return 'ontem';
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    /* Busca o RSS por mais de um serviço: se um falhar, tenta o próximo */
    function comTempo(p, ms) { return new Promise(function (ok, erro) { var t = setTimeout(function () { erro(new Error('tempo')); }, ms); p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); erro(e); }); }); }
    function lerXml(txt) {
        var doc = new DOMParser().parseFromString(txt, 'text/xml');
        var itens = Array.prototype.map.call(doc.querySelectorAll('item'), function (n) {
            function v(tag) { var e = n.getElementsByTagName(tag)[0]; return e ? e.textContent : ''; }
            return { title: v('title'), link: v('link'), pubDate: v('pubDate'), author: v('source') || v('dc:creator') };
        });
        if (!itens.length) throw new Error('feed');
        return itens;
    }
    function viaJson(rss) {
        var u = encodeURIComponent(rss);
        var tentativas = [
            function () { return fetch('https://api.rss2json.com/v1/api.json?rss_url=' + u).then(function (r) { return r.json(); }).then(function (j) { if (j.status !== 'ok' || !(j.items || []).length) throw new Error('feed'); return j.items; }); },
            function () { return fetch('https://api.allorigins.win/get?url=' + u).then(function (r) { return r.json(); }).then(function (j) { return lerXml(j.contents || ''); }); },
            function () { return fetch('https://corsproxy.io/?url=' + u).then(function (r) { return r.text(); }).then(lerXml); }
        ];
        var i = 0;
        function proxima() {
            if (i >= tentativas.length) return Promise.reject(new Error('feed'));
            var f = tentativas[i++];
            return comTempo(f(), 8000).catch(proxima);
        }
        return proxima();
    }
    function render(items, kind) {
        if (!items.length) { renderFallback(kind); return; }
        box.innerHTML = items.slice(0, CFG.newsMax).map(function (it) {
            var title = it.title || '';
            var src = kind === 'blog' ? 'Blog Volcanic' : (it.author || '');
            var m = title.match(/\s[-–]\s([^-–]+)$/);
            if (kind === 'news' && m) { src = m[1]; title = title.replace(m[0], ''); }
            return '<a class="lpn-news-item" href="' + esc(it.link) + '" target="_blank" rel="noopener nofollow">' +
                '<span class="src">' + esc(src || 'Notícia') + '</span>' +
                '<h4>' + esc(title) + '</h4>' +
                '<time>' + esc(fmtDate(it.pubDate)) + '</time></a>';
        }).join('');
    }
    function renderFallback(kind) {
        var links = kind === 'blog'
            ? [[CFG.blogUrl, 'Blog Volcanic', 'Conteúdos sobre saúde, sono, cognição e autismo']]
            : [
                ['https://agenciadenoticias.ibge.gov.br/', 'IBGE', 'Dados do Censo sobre autismo no Brasil'],
                ['https://www.cdc.gov/autism/', 'CDC', 'Informações e dados sobre o espectro autista'],
                ['https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/t/tea', 'Ministério Da Saúde', 'TEA: direitos, diagnóstico e cuidado no SUS']
            ];
        box.innerHTML = links.map(function (l) {
            return '<a class="lpn-news-item" href="' + l[0] + '" target="_blank" rel="noopener"><span class="src">' + l[1] + '</span><h4>' + l[2] + '</h4><time>Acessar</time></a>';
        }).join('');
        status.textContent = 'Fontes oficiais recomendadas';
    }
    function load(kind) {
        if (cache[kind]) { render(cache[kind], kind); return; }
        box.innerHTML = new Array(7).join('<div class="lpn-skel"></div>');
        var url = kind === 'blog'
            ? CFG.blogFeed
            : 'https://news.google.com/rss/search?q=' + encodeURIComponent(CFG.newsQuery + ' when:30d') + '&hl=pt-BR&gl=BR&ceid=BR:pt-419';
        viaJson(url).then(function (items) {
            if (kind === 'news') items.sort(function (a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
            cache[kind] = items;
            render(items, kind);
            status.textContent = kind === 'blog' ? 'Artigos mais recentes do nosso blog' : 'Atualizado em ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }).catch(function () { renderFallback(kind); });
    }

    root.querySelectorAll('[data-lpn-tab]').forEach(function (b) {
        b.addEventListener('click', function () {
            root.querySelectorAll('[data-lpn-tab]').forEach(function (x) { x.classList.toggle('is-active', x === b); });
            load(b.getAttribute('data-lpn-tab'));
        });
    });

    /* Só busca as notícias quando a seção estiver perto de aparecer */
    var newsSec = document.getElementById('noticias');
    if ('IntersectionObserver' in window) {
        var nio = new IntersectionObserver(function (en) {
            if (en[0].isIntersecting) { load('news'); nio.disconnect(); }
        }, { rootMargin: '400px' });
        nio.observe(newsSec);
    } else { load('news'); }
})();
