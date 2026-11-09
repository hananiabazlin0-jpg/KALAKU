/* KALA AI — antarmuka chat. Jawaban online lewat Gemini (server); bila tidak tersedia, mesin cadangan KalaLocal menjawab. */
(function () {
  'use strict';
  var K = window.Kalaku, C = window.KalakuCycle, L = window.KalaLocal;
  var thread = document.getElementById('chatThread');
  var scroller = document.getElementById('chatScroll');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatText');
  var sendBtn = document.getElementById('chatSend');
  var counter = document.getElementById('chatCount');
  var modeEl = document.getElementById('chatMode');
  var busy = false, ctx = {}, count = 0, offlineNoticed = false;
  var privacy = !!(K.boot.user && K.boot.user.privacy);

  /* ---------- Markdown ringan (aman: di-escape dulu) ---------- */
  function inline(s) {
    s = K.esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])_(.+?)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
    return s;
  }
  function md(text) {
    var lines = String(text).replace(/\r/g, '').split('\n'), out = '', list = false, para = [];
    function flushPara() { if (para.length) { out += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; } }
    function closeList() { if (list) { out += '</ul>'; list = false; } }
    lines.forEach(function (ln) {
      var li = ln.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
      if (li) { flushPara(); if (!list) { out += '<ul>'; list = true; } out += '<li>' + inline(li[1]) + '</li>'; }
      else if (!ln.trim()) { flushPara(); closeList(); }
      else { closeList(); para.push(ln); }
    });
    flushPara(); closeList();
    return out;
  }

  /* ---------- Render pesan ---------- */
  function scrollDown() { scroller.scrollTop = scroller.scrollHeight; }

  function addMsg(role, text, opts) {
    opts = opts || {};
    var w = thread.querySelector('.chat-welcome'); if (w) w.remove();
    var row = K.el('div', 'msg ' + role);
    var av = role === 'model' ? '<span class="msg-avatar">' + K.icon('sparkle') + '</span>' : '';
    row.innerHTML = av + '<div><div class="bubble">' + md(text) + '</div></div>';
    if (role === 'model') {
      var meta = K.el('div', 'msg-meta');
      var cp = K.el('button', '', K.icon('copy') + 'Salin');
      cp.type = 'button';
      cp.addEventListener('click', function () { copyText(text).then(function () { K.toast('ok', 'Jawaban disalin.', { timeout: 1800 }); }); });
      meta.appendChild(cp);
      if (opts.offline) meta.appendChild(K.el('span', 'mode-badge', 'Mode offline'));
      row.lastChild.appendChild(meta);
    }
    thread.appendChild(row);
    scrollDown();
    return row;
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(function () { return fallbackCopy(t); });
    return fallbackCopy(t);
  }
  function fallbackCopy(t) {
    return new Promise(function (res) {
      var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* abaikan */ }
      document.body.removeChild(ta); res();
    });
  }

  function welcome() {
    var n = K.boot.user ? K.boot.user.name.split(' ')[0] : '';
    thread.innerHTML = '<div class="chat-welcome"><span class="chat-avatar">' + K.icon('sparkle') + '</span><h3>Halo' + (n ? ', ' + K.esc(n) : '') + '!</h3><p>Aku ' + K.esc(K.boot.ai || 'KALA AI') + '. Tanyakan apa saja soal siklus, PMS, masa subur, atau ibadah saat haid. Pilih saran di bawah atau tulis sendiri.</p></div>';
  }

  function typing() {
    var row = K.el('div', 'msg model');
    row.innerHTML = '<span class="msg-avatar">' + K.icon('sparkle') + '</span><div><div class="bubble"><span class="typing" aria-label="KALA AI sedang mengetik"><i></i><i></i><i></i></span></div></div>';
    thread.appendChild(row); scrollDown();
    return row;
  }

  /* ---------- Konteks siklus ---------- */
  function buildContext(model) {
    if (privacy || !model || !model.hasData) return { hasData: false, name: K.boot.user ? K.boot.user.name.split(' ')[0] : '' };
    var c = {
      hasData: true, status: model.status, length: model.length, nextStart: model.nextStart,
      daysUntil: model.daysUntil, overdueDays: model.overdueDays, day: model.day, phaseLabel: model.phaseLabel,
      name: K.boot.user ? K.boot.user.name.split(' ')[0] : '',
      nextStartLabel: K.fmt.date(model.nextStart), ovulationDate: model.ovulationDate,
      ovulationDateLabel: K.fmt.short(model.ovulationDate),
      fertileRangeLabel: K.fmt.short(model.fertileStart) + ' – ' + K.fmt.short(model.fertileEnd),
      focus: model.phase ? C.FOCUS[model.phase] : null
    };
    return c;
  }

  /* ---------- Kirim ---------- */
  function setBusy(on) { busy = on; sendBtn.disabled = on || !input.value.trim(); }

  function localAnswer(text) {
    var a = L ? L.reply(text, ctx) : 'Maaf, KALA AI sedang tidak bisa menjawab. Coba lagi nanti.';
    K.api('api/ai-history.php', { body: { action: 'append', user: text, model: a } }).catch(function () { /* simpan riwayat bersifat opsional */ });
    return a;
  }

  function showOffline(err) {
    var code = err && err.data && err.data.code, why = {
      no_key: 'API key belum diisi (config/ai.local.php).',
      bad_key: 'API key ditolak Google. Periksa kuncinya.',
      api_disabled: 'Gemini API belum diaktifkan di project Google kamu.',
      quota: 'Kuota Gemini sedang habis.',
      network: 'Tidak bisa terhubung ke Google. Periksa internet.',
      empty: 'Gemini tidak memberi jawaban.'
    }[code] || 'KALA AI online sedang tidak tersedia.';
    var dt = err && err.data && err.data.detail;
    if (dt) why += ' (' + String(dt).slice(0, 220) + ')';
    modeEl.innerHTML = 'Mode offline <span class="mode-badge">mesin bawaan</span>';
    if (err && err.data && err.data.detail && window.console) console.warn('KALA AI:', code, err.data.detail);
    if (!offlineNoticed) {
      offlineNoticed = true;
      K.toast('info', why + ' Dijawab dengan mesin bawaan.', { timeout: 9000 });
    }
  }

  function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    if (text.length > 2000) { K.toast('error', 'Pertanyaan terlalu panjang (maks. 2000 karakter).'); return; }
    addMsg('user', text); count++;
    input.value = ''; autosize(); setBusy(true);
    var t = typing();
    var started = Date.now();

    function finish(answer, offline) {
      var wait = Math.max(0, 450 - (Date.now() - started));
      setTimeout(function () { t.remove(); addMsg('model', answer, { offline: offline }); setBusy(false); input.focus(); }, wait);
    }

    K.api('api/ai-process.php', { body: { message: text, context: ctx } }).then(function (d) {
      finish(d.message, false);
    }).catch(function (err) {
      var fb = (err.data && err.data.fallback) || err.network || !err.status || err.status >= 500;
      if (fb) { showOffline(err); finish(localAnswer(text), true); return; }
      t.remove(); setBusy(false);
      K.toast('error', err.message);
      input.value = text; autosize(); sendBtn.disabled = false;
    });
  }

  /* ---------- Input ---------- */
  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    counter.textContent = input.value.length;
    sendBtn.disabled = busy || !input.value.trim();
  }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : send(input.value); }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  K.$$('#chatSuggest .chip').forEach(function (b) { b.addEventListener('click', function () { send(b.dataset.q); }); });

  document.getElementById('chatClear').addEventListener('click', function () {
    if (!count) { K.toast('info', 'Belum ada percakapan untuk dihapus.'); return; }
    K.confirm({ title: 'Hapus riwayat?', message: 'Seluruh percakapan dengan ' + (K.boot.ai || 'KALA AI') + ' akan dihapus.', confirmText: 'Hapus', danger: true }).then(function (ok) {
      if (!ok) return;
      K.api('api/ai-history.php', { body: { action: 'clear' } }).then(function () { count = 0; welcome(); K.toast('ok', 'Riwayat dihapus.'); }).catch(function (e) { K.toast('error', e.message); });
    });
  });

  /* ---------- Mulai ---------- */
  welcome(); autosize();
  Promise.all([
    K.loadCycle().then(function (c) { ctx = buildContext(c.model); }).catch(function () { ctx = buildContext(null); }),
    K.api('api/ai-history.php?action=list').then(function (d) {
      if (d.messages && d.messages.length) {
        thread.innerHTML = '';
        d.messages.forEach(function (m) { addMsg(m.role === 'model' ? 'model' : 'user', m.content); });
        count = d.messages.length;
      }
    }).catch(function () { /* riwayat gagal dimuat: tetap bisa chat */ })
  ]).then(function () { scrollDown(); });

})();
