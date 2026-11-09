/* KALAKU — tur panduan pengguna baru (tanpa library).
   Dipanggil otomatis di Beranda untuk pengguna yang belum pernah melihatnya,
   atau manual lewat Pengaturan > Panduan (dashboard.php?tour=1). */
(function () {
  'use strict';
  var K = window.Kalaku;
  if (!K) return;
  var BOOT = K.boot || {};
  var AI = BOOT.ai || 'KALA AI';
  var uid = (BOOT.user && BOOT.user.id) || 0;
  var KEY = 'kalaku_tour_v1_' + uid;
  var MKEY = 'kalaku_tour_modal_v1_' + uid;
  var NAV = '#sidebar .nav-link[href="';

  var STEPS = [
    { sel: null, title: 'Selamat datang di ' + (BOOT.app || 'KALAKU') + '!',
      text: 'Yuk kenalan singkat dengan fitur-fiturnya, kira-kira satu menit. Kamu bisa menutupnya kapan saja.' },
    { sel: '#heroCard', title: 'Ringkasan siklusmu',
      text: 'Lingkaran ini menunjukkan hari ke berapa kamu di siklus, fase saat ini, dan perkiraan haid berikutnya. Isinya muncul setelah kamu mencatat hari pertama haid.' },
    { sel: '#focusCard', title: 'Fokus hari ini',
      text: 'Saran singkat yang menyesuaikan dengan fase siklusmu hari ini.' },
    { sel: '#weekCard', title: '7 hari ke depan',
      text: 'Gambaran seminggu ke depan: perkiraan haid, masa subur, dan hari biasa. Tekan "Buka kalender" untuk melihat sebulan penuh.' },
    { sel: '.quick-card', title: 'Aksi cepat',
      text: 'Catat haid yang baru mulai, tambah pengingat, atau langsung bertanya ke ' + AI + ' hanya dengan satu ketukan.' },
    { sel: NAV + 'kalender.php"]', title: 'Kalender',
      text: 'Lihat siklus per bulan dengan kode warna: haid, perkiraan haid, ovulasi, dan masa subur. Ketuk sebuah tanggal untuk melihat detail atau mencatat haid. Riwayat hari pertama haid juga ada di sini.' },
    { sel: NAV + 'ai-chat.php"]', title: AI,
      text: 'Asisten untuk bertanya seputar siklus dan kesehatan haid. Jawabannya bersifat edukatif, bukan diagnosis medis.' },
    { sel: NAV + 'pengingat.php"]', title: 'Pengingat',
      text: 'Atur pengingat siklus, ibadah, dan kesehatan. Kamu bisa menyaringnya per kategori.' },
    { sel: NAV + 'pengaturan.php"]', title: 'Profil & Pengaturan',
      text: 'Ubah data diri di Profil. Di Pengaturan ada notifikasi, mode privasi, ganti kata sandi, dan ekspor data. Panduan ini juga bisa diputar ulang dari Pengaturan.' }
  ];

  /* Mini-tur untuk form "Haid mulai" (K.periodModal) */
  var MODAL_STEPS = [
    { sel: '#pmStart', box: '.field', title: 'Hari pertama haid',
      text: 'Isi tanggal saat darah pertama kali keluar, bukan hari terakhir. Dari tanggal inilah KALAKU menghitung fase siklus dan perkiraan haid berikutnya.' },
    { sel: '#pmEnd', box: '.field', title: 'Hari terakhir haid',
      text: 'Opsional. Isi kalau haidmu sudah selesai. Kalau belum, kosongkan saja; nanti bisa diisi lewat Kalender atau tombol "Haid selesai hari ini".' },
    { sel: '#pmLen', box: '.field', title: 'Panjang siklus',
      text: 'Opsional. Jarak dari hari pertama haid sampai hari pertama haid berikutnya (21 sampai 45 hari). Kosongkan agar dihitung otomatis dari riwayatmu.' },
    { sel: '.modal-foot .btn-pink', title: 'Simpan',
      text: 'Tekan Simpan untuk mencatat. Hasilnya langsung muncul di Beranda dan Kalender. Salah isi? Catatan bisa diubah atau dihapus dari riwayat di Kalender.' }
  ];

  var steps = [], i = 0, ui = null, target = null, timers = [], curKey = KEY, inModal = false, mo = null;

  function el(tag, cls, html) { return K.el(tag, cls, html); }
  function isMobile() { return window.matchMedia('(max-width: 960px)').matches; }

  function sidebarOpen(open) {
    var sb = document.getElementById('sidebar'), bd = document.getElementById('sidebarBackdrop'),
        btn = document.getElementById('menuBtn');
    if (!sb || !isMobile()) return false;
    if (sb.classList.contains('is-open') === open) return false;
    sb.classList.toggle('is-open', open);
    if (bd) bd.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    return true;
  }

  function build() {
    ui = {
      overlay: el('div', 'kt-overlay'),
      spot: el('div', 'kt-spot'),
      card: el('div', 'kt-card')
    };
    ui.card.setAttribute('role', 'dialog');
    ui.card.setAttribute('aria-label', 'Panduan penggunaan');
    ui.card.innerHTML =
      '<div class="kt-head"><strong>Panduan</strong><button type="button" class="kt-x" aria-label="Tutup panduan">&times;</button></div>' +
      '<div class="kt-who"><span class="kt-ava">' + K.icon('drop') + '</span><div><div class="kt-name">' +
      K.esc(BOOT.app || 'KALAKU') + '</div><div class="kt-role">Panduan untuk pengguna baru</div></div></div>' +
      '<div class="kt-body" aria-live="polite"></div>' +
      '<div class="kt-foot"><span class="kt-count"></span><div class="kt-btns">' +
      '<button type="button" class="kt-btn" data-prev>Kembali</button>' +
      '<button type="button" class="kt-btn is-primary" data-next>Lanjut</button></div></div>';
    document.body.appendChild(ui.overlay);
    document.body.appendChild(ui.spot);
    document.body.appendChild(ui.card);
    ui.card.querySelector('.kt-x').addEventListener('click', end);
    ui.card.querySelector('[data-prev]').addEventListener('click', function () { go(i - 1); });
    ui.card.querySelector('[data-next]').addEventListener('click', function () {
      if (i >= steps.length - 1) end(); else go(i + 1);
    });
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    if (!inModal) document.addEventListener('keydown', onKey, true);
  }

  function onKey(e) {
    if (!ui) return;
    if (e.key === 'Escape') { e.stopPropagation(); end(); }
    else if (e.key === 'ArrowRight') ui.card.querySelector('[data-next]').click();
    else if (e.key === 'ArrowLeft' && i > 0) go(i - 1);
  }

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function go(n) {
    i = Math.max(0, Math.min(steps.length - 1, n));
    var s = steps[i];
    target = s.sel ? document.querySelector(s.sel) : null;
    if (target && s.box && target.closest(s.box)) target = target.closest(s.box);
    var inSidebar = !!(target && target.closest('#sidebar'));
    var toggled = sidebarOpen(inSidebar);
    if (target && !inSidebar && target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    ui.card.querySelector('.kt-body').innerHTML = '<b>' + K.esc(s.title) + '</b>' + K.esc(s.text);
    ui.card.querySelector('.kt-count').textContent = (i + 1) + ' of ' + steps.length;
    ui.card.querySelector('[data-prev]').disabled = i === 0;
    ui.card.querySelector('[data-next]').textContent = i === steps.length - 1 ? 'Selesai' : 'Lanjut';
    place();
    later(place, toggled ? 320 : 60);
    later(place, 650);
    if (!inModal) ui.card.querySelector('[data-next]').focus({ preventScroll: true });
  }

  function place() {
    if (!ui) return;
    var vw = window.innerWidth, vh = window.innerHeight, pad = 6, gap = 14;
    var cw = ui.card.offsetWidth, ch = ui.card.offsetHeight, top, left;
    if (target) {
      var r = target.getBoundingClientRect();
      ui.spot.classList.remove('is-center');
      ui.spot.style.top = (r.top - pad) + 'px';
      ui.spot.style.left = (r.left - pad) + 'px';
      ui.spot.style.width = (r.width + pad * 2) + 'px';
      ui.spot.style.height = (r.height + pad * 2) + 'px';
      if (r.right + gap + cw <= vw - 12 && target.closest('#sidebar')) {
        left = r.right + gap + pad;
        top = Math.min(Math.max(12, r.top + r.height / 2 - ch / 2), vh - ch - 12);
      } else if (r.bottom + gap + ch <= vh - 12) {
        top = r.bottom + gap + pad;
        left = Math.min(Math.max(12, r.left), vw - cw - 12);
      } else if (r.top - gap - ch >= 12) {
        top = r.top - gap - ch - pad;
        left = Math.min(Math.max(12, r.left), vw - cw - 12);
      } else {
        top = vh - ch - 12;
        left = Math.max(12, (vw - cw) / 2);
      }
    } else {
      ui.spot.classList.add('is-center');
      ui.spot.style.top = '50%'; ui.spot.style.left = '50%';
      ui.spot.style.width = '0'; ui.spot.style.height = '0';
      top = Math.max(12, (vh - ch) / 2);
      left = Math.max(12, (vw - cw) / 2);
    }
    ui.card.style.top = top + 'px';
    ui.card.style.left = left + 'px';
  }

  function end() {
    K.store.set(curKey, '1');
    timers.forEach(clearTimeout); timers = [];
    if (mo) { mo.disconnect(); mo = null; }
    if (!inModal) sidebarOpen(false);
    inModal = false; curKey = KEY;
    if (ui) { ui.overlay.remove(); ui.spot.remove(); ui.card.remove(); ui = null; }
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey, true);
  }

  function start() {
    if (ui) return;
    inModal = false; curKey = KEY;
    steps = STEPS.filter(function (s) { return !s.sel || document.querySelector(s.sel); });
    if (steps.length < 2) return;
    window.scrollTo(0, 0);
    build();
    go(0);
  }

  function startModal() {
    if (ui || !document.querySelector('.modal-backdrop')) return;
    inModal = true; curKey = MKEY;
    steps = MODAL_STEPS.filter(function (s) { return document.querySelector(s.sel); });
    if (!steps.length) { inModal = false; curKey = KEY; return; }
    build();
    go(0);
    // modal ditutup (Batal, Esc, atau Simpan) -> tur ikut selesai
    mo = new MutationObserver(function () {
      if (!document.querySelector('.modal-backdrop')) end();
    });
    mo.observe(document.body, { childList: true });
  }

  /* Bungkus K.periodModal: tampilkan tombol bantuan, dan mini-tur otomatis saat pertama dibuka */
  var origPeriodModal = K.periodModal;
  if (typeof origPeriodModal === 'function') {
    K.periodModal = function () {
      var p = origPeriodModal.apply(this, arguments);
      var ms = document.querySelectorAll('.modal'), m = ms.length ? ms[ms.length - 1] : null;
      var head = m && m.querySelector('.modal-head');
      var x = head && head.querySelector('[data-x]');
      if (head && x && !head.querySelector('[data-help]')) {
        var h = el('button', 'icon-btn icon-btn-sm', K.icon('info'));
        h.type = 'button';
        h.setAttribute('data-help', '');
        h.setAttribute('aria-label', 'Penjelasan form ini');
        h.title = 'Penjelasan form ini';
        h.addEventListener('click', function () { startModal(); });
        head.insertBefore(h, x);
        h.style.marginLeft = 'auto';
        head.style.gap = '8px';
      }
      if (!K.store.get(MKEY)) setTimeout(startModal, 450);
      return p;
    };
  }

  K.tour = { start: start, startModal: startModal, reset: function () { try { localStorage.removeItem(KEY); localStorage.removeItem(MKEY); } catch (e) {} } };

  function init() {
    var forced = /(?:^|[?&])tour=1(?:&|$)/.test(location.search);
    if (forced && window.history && history.replaceState) {
      history.replaceState(null, '', location.pathname);
    }
    var onDashboard = !!document.getElementById('heroCard');
    if (!onDashboard) return;
    if (forced || !K.store.get(KEY)) setTimeout(start, 700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
