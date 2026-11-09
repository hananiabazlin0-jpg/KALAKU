/* KALAKU — fungsi global: API, toast, modal, ring siklus, modal bersama, notifikasi. */
(function () {
  'use strict';

  var K = window.Kalaku = window.Kalaku || {};
  var BOOT = K.boot = window.KALAKU || {};
  var CY = window.KalakuCycle || null;

  /* ---------- Util DOM ---------- */
  K.$ = function (sel, root) { return (root || document).querySelector(sel); };
  K.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  K.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  K.icon = function (name, cls) {
    return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  };
  K.el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  K.store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
  };
  K.debounce = function (fn, ms) {
    var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
  };

  /* ---------- Tanggal ---------- */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var MONL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var DAYL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function parts(s) { var p = String(s).split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function dow(s) { var p = parts(s); return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); }
  K.today = function () {
    var d = new Date();
    var z = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  };
  K.fmt = {
    short: function (s) { var p = parts(s); return p.d + ' ' + MON[p.m - 1]; },
    date: function (s) { var p = parts(s); return p.d + ' ' + MON[p.m - 1] + ' ' + p.y; },
    long: function (s) { var p = parts(s); return DAYL[dow(s)] + ', ' + p.d + ' ' + MONL[p.m - 1] + ' ' + p.y; },
    month: function (y, m0) { return MONL[m0] + ' ' + y; },
    dayName: function (s) { return DAYL[dow(s)]; },
    dayShort: function (s) { return DAYL[dow(s)].slice(0, 3); },
    time: function (t) { return t ? t.slice(0, 5) : ''; }
  };
  K.rel = function (s, today) {
    today = today || K.today();
    var d = CY ? CY.diff(today, s) : 0;
    if (d === 0) return 'Hari ini';
    if (d === 1) return 'Besok';
    if (d === -1) return 'Kemarin';
    if (d > 1) return d + ' hari lagi';
    return Math.abs(d) + ' hari lalu';
  };

  /* ---------- API ---------- */
  K.csrf = function () { var m = document.querySelector('meta[name="csrf-token"]'); return m ? m.content : ''; };

  K.api = function (url, opts) {
    opts = opts || {};
    var method = opts.method || (opts.body ? 'POST' : 'GET');
    var headers = { 'Accept': 'application/json' };
    var init = { method: method, headers: headers, credentials: 'same-origin' };
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
      headers['X-CSRF-Token'] = K.csrf();
      init.body = JSON.stringify(opts.body || {});
    }
    return fetch(url, init).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = JSON.parse(txt); } catch (e) { data = null; }
        if (!data) {
          var bad = new Error('Server memberi respons tak terduga. Pastikan Apache dan MySQL di XAMPP sedang berjalan.');
          bad.status = res.status;
          throw bad;
        }
        if (res.status === 401 || data.code === 'auth') {
          window.location.href = 'login.php';
          var au = new Error(data.message || 'Sesi berakhir.');
          au.status = 401;
          throw au;
        }
        if (!res.ok || data.ok === false) {
          var er = new Error(data.message || 'Terjadi kesalahan. Coba lagi.');
          er.status = res.status;
          er.data = data;
          throw er;
        }
        return data;
      });
    }, function () {
      var ne = new Error('Tidak bisa terhubung ke server. Periksa koneksi, atau pastikan Apache berjalan.');
      ne.network = true;
      throw ne;
    });
  };

  K.loadCycle = function () {
    return K.api('api/cycle.php?action=list').then(function (d) {
      var defaults = d.defaults || { cycle_length: 28, period_length: 5 };
      K.cycle = { records: d.records, defaults: defaults, model: CY ? CY.build(d.records, defaults, K.today()) : null };
      return K.cycle;
    });
  };

  /* ---------- Toast ---------- */
  K.toast = function (type, message, opts) {
    opts = opts || {};
    var host = document.getElementById('toasts');
    if (!host) return { close: function () {} };
    var icon = type === 'error' ? 'alert' : (type === 'info' ? 'info' : 'check');
    var t = K.el('div', 'toast toast-' + type);
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    t.innerHTML = K.icon(icon) + '<span class="toast-msg">' + K.esc(message) + '</span>';
    var timer;
    function close() {
      clearTimeout(timer);
      if (!t.parentNode) return;
      t.classList.add('is-out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 200);
    }
    if (opts.action) {
      var ab = K.el('button', 'toast-action');
      ab.type = 'button';
      ab.textContent = opts.action.label;
      ab.addEventListener('click', function () { close(); if (opts.action.onClick) opts.action.onClick(); });
      t.appendChild(ab);
    }
    var cb = K.el('button', 'toast-close', K.icon('x'));
    cb.type = 'button';
    cb.setAttribute('aria-label', 'Tutup');
    cb.addEventListener('click', close);
    t.appendChild(cb);
    host.appendChild(t);
    while (host.children.length > 4) host.removeChild(host.firstChild);
    timer = setTimeout(close, opts.timeout || (type === 'error' ? 6500 : 4200));
    return { close: close };
  };

  /* ---------- Modal ---------- */
  K.modal = function (o) {
    return new Promise(function (resolve) {
      var prev = document.activeElement;
      var id = 'm' + Math.random().toString(36).slice(2, 8);
      var bd = K.el('div', 'modal-backdrop');
      var m = K.el('div', 'modal');
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      m.setAttribute('aria-labelledby', id + 't');
      m.innerHTML = '<div class="modal-head"><h3 id="' + id + 't">' + K.esc(o.title || '') + '</h3>' +
        '<button type="button" class="icon-btn icon-btn-sm" data-x aria-label="Tutup">' + K.icon('x') + '</button></div>' +
        '<div class="modal-body">' + (o.html || '') + '</div><div class="modal-foot"></div>';
      bd.appendChild(m);
      var foot = K.$('.modal-foot', m);
      var primary = null;
      (o.actions || []).forEach(function (a) {
        var b = K.el('button', 'btn ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : a.kind === 'pink' ? 'btn-pink' : 'btn-ghost'));
        b.type = 'button';
        b.textContent = a.label;
        if (a.kind === 'primary' || a.kind === 'danger' || a.kind === 'pink') primary = primary || b;
        b.addEventListener('click', function () {
          var res = a.onClick ? a.onClick(m) : undefined;
          if (res === false) return;
          if (res && typeof res.then === 'function') {
            b.classList.add('is-loading');
            res.then(function (v) {
              close(a.value !== undefined ? a.value : (v === undefined ? true : v));
            }, function (err) {
              b.classList.remove('is-loading');
              if (err && err.message) K.toast('error', err.message);
            });
            return;
          }
          close(a.value !== undefined ? a.value : true);
        });
        foot.appendChild(b);
      });
      if (!foot.children.length) foot.hidden = true;

      function onKey(ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); close(null); return; }
        if (ev.key === 'Enter' && primary && ev.target && ev.target.tagName === 'INPUT') { ev.preventDefault(); primary.click(); return; }
        if (ev.key !== 'Tab') return;
        var f = K.$$('button:not([disabled]), input:not([disabled]), select, textarea, a[href]', m).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
      function close(val) {
        document.removeEventListener('keydown', onKey, true);
        if (bd.parentNode) bd.parentNode.removeChild(bd);
        document.body.style.overflow = '';
        if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* abaikan */ } }
        resolve(val === undefined ? null : val);
      }
      K.$('[data-x]', m).addEventListener('click', function () { close(null); });
      bd.addEventListener('mousedown', function (ev) { if (ev.target === bd) close(null); });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(bd);
      document.body.style.overflow = 'hidden';
      var firstField = K.$('input:not([type=hidden]), select, textarea', m);
      setTimeout(function () { (firstField || primary || K.$('[data-x]', m)).focus(); }, 30);
      if (o.onOpen) o.onOpen(m);
    });
  };

  K.confirm = function (o) {
    return K.modal({
      title: o.title || 'Yakin?',
      html: '<p>' + K.esc(o.message || '') + '</p>',
      actions: [
        { label: o.cancelText || 'Batal', kind: 'ghost', value: false },
        { label: o.confirmText || 'Ya', kind: o.danger ? 'danger' : 'primary', value: true }
      ]
    }).then(function (v) { return v === true; });
  };

  /* ---------- Loading tombol ---------- */
  K.setLoading = function (btn, on, text) {
    if (!btn) return;
    if (on) {
      btn.dataset.orig = btn.innerHTML;
      btn.classList.add('is-loading');
      if (text) btn.textContent = text;
    } else {
      btn.classList.remove('is-loading');
      if (btn.dataset.orig != null) { btn.innerHTML = btn.dataset.orig; delete btn.dataset.orig; }
    }
  };

  /* ---------- Ring siklus ---------- */
  K.ring = function (el, o) {
    if (!el || !CY) return;
    var L = CY.clamp(parseInt(o.length, 10) || 28, 21, 45);
    var P = Math.max(1, parseInt(o.period, 10) || 5);
    var segs = CY.segments(L, P);
    var cx = 100, cy = 100, r = 82;
    function pt(deg) { var a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function arc(f, t) {
      var gap = 2.4;
      var a0 = (f - 1) / L * 360 + gap, a1 = t / L * 360 - gap;
      if (a1 - a0 < 3) { a0 = (f - 1) / L * 360 + 1; a1 = t / L * 360 - 1; }
      var p0 = pt(a0), p1 = pt(a1);
      return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + ((a1 - a0) > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
    }
    var svg = '<svg class="ring' + (o.dark ? ' ring-dark' : '') + '" viewBox="0 0 200 200" role="img" aria-label="' + K.esc(o.label || 'Lingkaran siklus') + '">';
    svg += '<circle class="track" cx="100" cy="100" r="82"/>';
    segs.forEach(function (s) { svg += '<path class="seg seg-' + s.key + '" d="' + arc(s.from, s.to) + '"/>'; });
    var day = o.day;
    if (day && day >= 1) {
      var pp = pt((Math.min(day, L) - 0.5) / L * 360);
      svg += '<g class="pin-g"><circle class="pin-halo" cx="' + pp[0].toFixed(2) + '" cy="' + pp[1].toFixed(2) + '" r="11"/><circle class="pin" cx="' + pp[0].toFixed(2) + '" cy="' + pp[1].toFixed(2) + '" r="5.5"/></g>';
    }
    var center = o.center != null ? o.center : (day ? String(day) : '–');
    svg += '<text class="ring-num" x="100" y="108">' + K.esc(center) + '</text>';
    svg += '<text class="ring-cap" x="100" y="128">' + K.esc(o.caption != null ? o.caption : (day ? 'hari siklus' : '')) + '</text>';
    svg += '</svg>';
    el.innerHTML = svg;
  };

  function initStaticRings() {
    K.$$('[data-ring]').forEach(function (n) {
      K.ring(n, { length: n.dataset.length, period: n.dataset.period, day: parseInt(n.dataset.day, 10) || null, dark: !!n.closest('.auth-art') });
    });
  }

  /* ---------- Kata sandi: tampilkan & kekuatan ---------- */
  function initPasswordTools() {
    K.$$('[data-toggle-password]').forEach(function (b) {
      b.addEventListener('click', function () {
        var inp = document.getElementById(b.dataset.togglePassword);
        if (!inp) return;
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        b.innerHTML = K.icon(show ? 'eyeoff' : 'eye');
        b.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      });
    });
    var meter = document.getElementById('strength');
    var inp = document.getElementById('password') || document.getElementById('pwNew');
    var txt = document.getElementById('strengthText');
    if (meter && inp) {
      var labels = ['', 'Terlalu lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
      inp.addEventListener('input', function () {
        var v = inp.value, lvl = 0;
        if (v.length) {
          var score = 0;
          if (v.length >= 8) score++;
          if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
          if (/\d/.test(v)) score++;
          if (/[^A-Za-z0-9]/.test(v)) score++;
          lvl = v.length < 8 ? 1 : Math.max(1, score);
        }
        meter.dataset.level = lvl;
        if (txt) txt.textContent = lvl ? labels[lvl] + (v.length < 8 ? ' (minimal 8 karakter)' : '') : 'Minimal 8 karakter, huruf dan angka.';
      });
    }
  }

  /* ---------- Menu samping (mobile) ---------- */
  function initSidebar() {
    var btn = document.getElementById('menuBtn');
    var sb = document.getElementById('sidebar');
    var bd = document.getElementById('sidebarBackdrop');
    if (!btn || !sb || !bd) return;
    function set(open) {
      sb.classList.toggle('is-open', open);
      bd.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { set(!sb.classList.contains('is-open')); });
    bd.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    K.$$('.nav-link', sb).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  }

  /* ---------- Modal bersama: catat haid ---------- */
  K.periodModal = function (opts) {
    opts = opts || {};
    var today = K.today();
    var date = opts.date || today;
    var defCycle = (K.cycle && K.cycle.defaults && K.cycle.defaults.cycle_length) || (BOOT.user && BOOT.user.cycle) || 28;
    var html =
      '<form class="form" id="pmForm" novalidate>' +
      '<p class="field-hint" style="margin-top:-4px">Catat <b>hari pertama</b> keluarnya darah, bukan hari terakhir.</p>' +
      '<div class="field"><label for="pmStart">Hari pertama haid</label><input type="date" id="pmStart" value="' + K.esc(date) + '" max="' + K.esc(today) + '" required></div>' +
      '<div class="field"><label for="pmEnd">Hari terakhir haid <span class="opt">(opsional, isi bila sudah selesai)</span></label><input type="date" id="pmEnd" max="' + K.esc(today) + '"></div>' +
      '<div class="field"><label for="pmLen">Panjang siklus <span class="opt">(opsional)</span></label><input type="number" id="pmLen" min="21" max="45" placeholder="Biasanya ' + defCycle + ' hari"><p class="field-hint">Kosongkan agar dihitung otomatis dari riwayatmu.</p></div>' +
      '</form>';
    return K.modal({
      title: opts.title || 'Catat haid',
      html: html,
      actions: [
        { label: 'Batal', kind: 'ghost', value: null },
        {
          label: 'Simpan', kind: 'pink',
          onClick: function (m) {
            var start = K.$('#pmStart', m).value;
            var end = K.$('#pmEnd', m).value;
            var len = K.$('#pmLen', m).value;
            if (!start) { K.toast('error', 'Isi tanggal hari pertama haid.'); return false; }
            if (end && end < start) { K.toast('error', 'Tanggal selesai tidak boleh sebelum tanggal mulai.'); return false; }
            return K.api('api/cycle.php', { body: { action: 'add', period_start: start, period_end: end || null, cycle_length: len ? parseInt(len, 10) : null } }).then(function (d) {
              K.toast('ok', d.message || 'Tersimpan.');
              document.dispatchEvent(new CustomEvent('kalaku:cycle', { detail: d }));
              return d;
            });
          }
        }
      ]
    });
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-action="quick-period"]') : null;
    if (!t) return;
    e.preventDefault();
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('is-open');
    var bd = document.getElementById('sidebarBackdrop');
    if (bd) bd.hidden = true;
    K.periodModal({ title: 'Haid mulai' }).then(function (d) {
      if (d && !document.body.dataset.cycleListener) {
        K.toast('info', 'Lihat hasilnya di kalender.', { action: { label: 'Buka', onClick: function () { window.location.href = 'kalender.php'; } } });
      }
    });
  });

  /* ---------- Modal bersama: pengingat ---------- */
  K.reminderModal = function (opts) {
    opts = opts || {};
    var r = opts.reminder || {};
    var today = K.today();
    var cats = [['siklus', 'Siklus'], ['ibadah', 'Ibadah'], ['kesehatan', 'Kesehatan'], ['lainnya', 'Lainnya']];
    var cat = r.category || opts.category || 'siklus';
    var opt = cats.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === cat ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('');
    var html =
      '<form class="form" novalidate>' +
      '<div class="field"><label for="rmTitle">Judul</label><input type="text" id="rmTitle" maxlength="150" value="' + K.esc(r.title || opts.title || '') + '" placeholder="Contoh: Siapkan pembalut" required></div>' +
      '<div class="field-row"><div class="field"><label for="rmDate">Tanggal</label><input type="date" id="rmDate" value="' + K.esc(r.date || opts.date || today) + '" required></div>' +
      '<div class="field"><label for="rmTime">Jam <span class="opt">(opsional)</span></label><input type="time" id="rmTime" value="' + K.esc(r.time || opts.time || '') + '"></div></div>' +
      '<div class="field"><label for="rmCat">Kategori</label><select id="rmCat">' + opt + '</select></div>' +
      '</form>';
    return K.modal({
      title: r.id ? 'Ubah pengingat' : 'Pengingat baru',
      html: html,
      actions: [
        { label: 'Batal', kind: 'ghost', value: null },
        {
          label: r.id ? 'Simpan' : 'Tambah', kind: 'primary',
          onClick: function (m) {
            var title = K.$('#rmTitle', m).value.trim();
            var date = K.$('#rmDate', m).value;
            if (!title) { K.toast('error', 'Judul pengingat wajib diisi.'); K.$('#rmTitle', m).focus(); return false; }
            if (!date) { K.toast('error', 'Pilih tanggal pengingat.'); return false; }
            var body = { action: r.id ? 'update' : 'add', title: title, date: date, time: K.$('#rmTime', m).value || null, category: K.$('#rmCat', m).value };
            if (r.id) body.id = r.id;
            return K.api('api/reminders.php', { body: body }).then(function (d) {
              K.toast('ok', d.message || 'Tersimpan.');
              document.dispatchEvent(new CustomEvent('kalaku:reminders', { detail: d }));
              K.refreshBell();
              return d;
            });
          }
        }
      ]
    });
  };

  /* ---------- Notifikasi & lonceng ---------- */
  K.notif = {
    supported: function () { return 'Notification' in window; },
    permission: function () { return K.notif.supported() ? Notification.permission : 'unsupported'; },
    request: function () {
      if (!K.notif.supported()) return Promise.resolve('unsupported');
      try {
        var r = Notification.requestPermission();
        return r && r.then ? r : Promise.resolve(Notification.permission);
      } catch (e) { return Promise.resolve(Notification.permission); }
    },
    show: function (title, body) {
      if (K.notif.permission() !== 'granted') return false;
      try { new Notification(title, { body: body || '', tag: 'kalaku-' + title }); return true; } catch (e) { return false; }
    }
  };

  /* ---------- Pop-up pengingat jatuh tempo ---------- */
  var popOpen = false;
  var SNOOZE_MS = 10 * 60 * 1000;
  function popKey(r) { return 'kalaku_p_' + r.id + '_' + r.date + '_' + (r.time || ''); }
  function popEligible(r) {
    var v = K.store.get(popKey(r));
    if (v === null) return true;
    if (v.indexOf('snooze:') === 0) return Date.now() >= (parseInt(v.slice(7), 10) || 0);
    return false;
  }

  K.dueModal = function (items) {
    if (popOpen || !items.length) return Promise.resolve(null);
    popOpen = true;
    var doneIds = {};
    items.forEach(function (r) { K.store.set(popKey(r), '1'); });
    var CAT = { siklus: 'Siklus', ibadah: 'Ibadah', kesehatan: 'Kesehatan', lainnya: 'Lainnya' };
    var rows = items.map(function (r) {
      return '<li class="rem-pop-item" data-pop="' + r.id + '">' +
        '<span class="cat-dot cat-' + K.esc(r.category) + '"></span>' +
        '<div class="rem-pop-body"><div class="rem-title">' + K.esc(r.title) + '</div>' +
        '<div class="rem-sub">' + K.esc(CAT[r.category] || 'Lainnya') + (r.time ? '<span>·</span><span>' + K.esc(r.time) + '</span>' : '<span>·</span><span>Hari ini</span>') + '</div></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-pop-done="' + r.id + '">' + K.icon('check') + '<span>Selesai</span></button></li>';
    }).join('');
    var html = '<div class="rem-pop-head">' + K.icon('bell') + '<p>' + (items.length > 1 ? 'Ada ' + items.length + ' pengingat yang sudah waktunya.' : 'Ada pengingat yang sudah waktunya.') + '</p></div>' +
      '<ul class="rem-pop">' + rows + '</ul>';
    return K.modal({
      title: 'Pengingat',
      html: html,
      actions: [
        { label: 'Tunda 10 menit', kind: 'ghost', value: 'snooze' },
        { label: 'Tutup', kind: 'primary', value: 'close' }
      ],
      onOpen: function (m) {
        K.$$('[data-pop-done]', m).forEach(function (b) {
          b.addEventListener('click', function () {
            var id = parseInt(b.dataset.popDone, 10);
            b.disabled = true;
            K.api('api/reminders.php', { body: { action: 'toggle', id: id, done: true } }).then(function (d) {
              doneIds[id] = true;
              var li = K.$('[data-pop="' + id + '"]', m);
              if (li) li.classList.add('is-done');
              document.dispatchEvent(new CustomEvent('kalaku:reminders', { detail: d }));
              K.refreshBell();
              if (items.every(function (x) { return doneIds[x.id]; })) {
                setTimeout(function () { var x = K.$('[data-x]', m); if (x) x.click(); }, 500);
              }
            }).catch(function (er) { b.disabled = false; K.toast('error', er.message); });
          });
        });
      }
    }).then(function (val) {
      popOpen = false;
      if (val === 'snooze') {
        var until = Date.now() + SNOOZE_MS;
        items.forEach(function (r) { if (!doneIds[r.id]) K.store.set(popKey(r), 'snooze:' + until); });
        K.toast('info', 'Diingatkan lagi 10 menit lagi.', { timeout: 3000 });
      }
      return val;
    });
  };

  K.refreshBell = function () {
    if (!BOOT.user) return Promise.resolve();
    var now = new Date();
    var z = function (n) { return n < 10 ? '0' + n : '' + n; };
    var q = 'api/reminders.php?action=due&date=' + K.today() + '&time=' + z(now.getHours()) + ':' + z(now.getMinutes());
    return K.api(q).then(function (d) {
      var badge = document.getElementById('bellBadge');
      if (badge) {
        badge.hidden = !d.pending;
        badge.textContent = d.pending > 9 ? '9+' : String(d.pending);
      }
      if (BOOT.user.notify && d.due && d.due.length) {
        /* Notifikasi browser: sekali per pengingat, juga saat tab di latar belakang. */
        d.due.forEach(function (r) {
          var key = 'kalaku_n_' + r.id + '_' + r.date + '_' + (r.time || '');
          if (K.store.get(key)) return;
          K.store.set(key, '1');
          K.notif.show('KALAKU · Pengingat', r.title);
        });
        /* Pop-up di dalam KALAKU: hanya saat tab terlihat dan tidak ada jendela lain yang terbuka. */
        if (!document.hidden && !popOpen && !document.querySelector('.modal-backdrop')) {
          var fresh = d.due.filter(popEligible);
          if (fresh.length) K.dueModal(fresh);
        }
      }
    }).catch(function () { /* diam: lonceng bukan fitur kritis */ });
  };

  function initBell() {
    if (!BOOT.user || !document.getElementById('bellBtn')) return;
    setTimeout(K.refreshBell, 1200);
    setInterval(K.refreshBell, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) K.refreshBell(); });
  }

  /* ---------- Mulai ---------- */
  function init() {
    initStaticRings();
    initPasswordTools();
    initSidebar();
    initBell();
    if (BOOT.flash && BOOT.flash.length === 2) {
      K.toast(BOOT.flash[0] === 'error' ? 'error' : 'ok', BOOT.flash[1]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
