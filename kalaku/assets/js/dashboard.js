/* KALAKU — beranda. */
(function () {
  'use strict';
  var K = window.Kalaku, C = window.KalakuCycle;
  var privacy = !!(K.boot.user && K.boot.user.privacy);
  var cyc = null, rems = [];
  document.body.dataset.cycleListener = '1';

  function blur(html) {
    return privacy ? '<span class="blur-sensitive" tabindex="0" role="button" title="Ketuk untuk menampilkan">' + html + '</span>' : html;
  }

  function renderHero() {
    var m = cyc.model, ring = document.getElementById('heroRing'), info = document.getElementById('heroInfo');
    var sub = document.getElementById('helloSub');
    if (m.status === 'no_data') {
      K.ring(ring, { length: m.length, period: m.period, day: null, dark: true, center: '–', caption: 'belum ada data', label: 'Belum ada data siklus' });
      info.innerHTML = '<h3>Mulai catat siklusmu</h3><p class="lead">Masukkan hari pertama haid terakhirmu. KALAKU akan menghitung fase, masa subur, dan perkiraan haid berikutnya.</p><button type="button" class="btn btn-light" id="heroAdd">Catat haid pertama</button>';
      sub.textContent = 'Belum ada catatan haid. Yuk mulai dari satu tanggal.';
      document.getElementById('heroAdd').addEventListener('click', function () { K.periodModal({ title: 'Catat haid pertama' }); });
      return;
    }
    if (m.status === 'awaiting') {
      K.ring(ring, { length: m.length, period: m.latestPeriod, day: null, dark: true, center: privacy ? '•' : '?', caption: 'menunggu haid', label: 'Menunggu haid berikutnya' });
      info.innerHTML = '<h3>Menunggu haid berikutnya</h3><p class="lead">' + blur('Perkiraan ' + K.fmt.date(m.nextStart) + ' sudah lewat ' + m.overdueDays + ' hari.') + ' Catat hari pertama haid begitu datang agar siklus baru terhitung tepat.</p><div class="hero-meta"><span class="pill pill-pink">' + K.icon('clock') + 'Menunggu konfirmasi</span></div><button type="button" class="btn btn-light" id="heroAdd">Haid sudah mulai</button>';
      sub.textContent = 'Siklus terakhir dimulai ' + K.fmt.date(m.latest.start) + '.';
      if (privacy) sub.textContent = 'Mode privasi aktif.';
      document.getElementById('heroAdd').addEventListener('click', function () { K.periodModal({ title: 'Haid mulai' }); });
      return;
    }
    var key = m.phase, label = C.LABEL[key];
    K.ring(ring, { length: m.length, period: m.latestPeriod, day: m.day, dark: true, center: privacy ? '•' : String(m.day), caption: 'hari siklus', label: 'Hari ke-' + m.day + ' dari ' + m.length });
    var pills = '<span class="pill">' + K.icon('calendar') + blur('Hari ke-' + m.day + ' dari ' + m.length) + '</span>';
    pills += '<span class="pill pill-pink">' + K.icon('drop') + blur('Haid berikutnya ' + K.fmt.short(m.nextStart) + ' · ' + K.rel(m.nextStart, m.today).toLowerCase()) + '</span>';
    if (m.today >= m.fertileStart && m.today <= m.fertileEnd) pills += '<span class="pill pill-amber">' + K.icon('heart') + blur('Masa subur') + '</span>';
    else if (m.ovulationDate > m.today) pills += '<span class="pill">' + K.icon('heart') + blur('Ovulasi ± ' + K.fmt.short(m.ovulationDate)) + '</span>';
    var lead = {
      period: 'Hari-hari haid. Pelan-pelan saja hari ini.',
      follicular: 'Tubuhmu bersiap untuk ovulasi.',
      ovulation: 'Perkiraan hari ovulasi.',
      luteal: 'Menuju haid berikutnya.'
    }[key];
    info.innerHTML = '<h3>' + blur(key === 'period' ? 'Sedang haid' : 'Fase ' + label.toLowerCase()) + '</h3><p class="lead">' + lead + '</p><div class="hero-meta">' + pills + '</div>' +
      (privacy ? '<p class="note" style="color:rgba(245,241,228,.65)">Mode privasi aktif — ketuk bagian buram untuk menampilkan.</p>' : '');
    sub.textContent = K.fmt.long(m.today);
  }

  function renderFocus() {
    var m = cyc.model, list = document.getElementById('focusList'), note = document.getElementById('focusNote');
    if (m.status !== 'current') {
      list.innerHTML = '<li>' + K.icon('info') + '<span>' + (m.status === 'no_data' ? 'Setelah kamu mencatat haid, saran harian sesuai fasemu akan muncul di sini.' : 'Saran harian muncul lagi setelah haid baru dicatat.') + '</span></li>';
      note.hidden = true;
      return;
    }
    list.innerHTML = C.FOCUS[m.phase].map(function (t) { return '<li>' + K.icon('leaf') + '<span>' + K.esc(t) + '</span></li>'; }).join('');
    if (m.phase === 'period') {
      note.hidden = false;
      note.textContent = 'Catatan ibadah: selama haid, shalat dan puasa ditinggalkan. Puasa Ramadan diqadha setelah suci. Ini penjelasan umum, bukan fatwa.';
    } else note.hidden = true;
  }

  function renderWeek() {
    var m = cyc.model, el = document.getElementById('weekStrip'), out = '';
    for (var i = 0; i < 7; i++) {
      var d = C.addDays(m.today, i), inf = C.dayInfo(m, d), cls = '', lab = '';
      if (inf.type === 'period') { cls = inf.kind === 'actual' ? 't-period' : 't-predicted'; lab = 'Haid'; }
      else if (inf.type === 'awaiting') { cls = 't-awaiting'; lab = 'Tunggu'; }
      else if (inf.type !== 'none') { cls = 't-' + inf.type; lab = inf.type === 'ovulation' ? 'Ovulasi' : (inf.type === 'follicular' ? 'Folikular' : 'Luteal'); }
      if (privacy) lab = '';
      out += '<a class="wk ' + cls + (i === 0 ? ' is-today' : '') + '" href="kalender.php" style="text-decoration:none;color:inherit"><span>' + K.fmt.dayShort(d) + '</span><b>' + parseInt(d.slice(8), 10) + '</b><small>' + lab + '</small></a>';
    }
    el.innerHTML = out;
  }

  function renderReminders() {
    var el = document.getElementById('miniReminders'), today = K.today();
    var list = rems.filter(function (r) { return !r.done; }).sort(function (a, b) { return (a.date + (a.time || '99')) < (b.date + (b.time || '99')) ? -1 : 1; }).slice(0, 4);
    if (!list.length) {
      el.innerHTML = '<li class="empty">Belum ada pengingat aktif.<br><button type="button" class="btn btn-ghost btn-sm" id="miniAdd" style="margin-top:10px">' + K.icon('plus') + 'Tambah pengingat</button></li>';
      document.getElementById('miniAdd').addEventListener('click', function () { K.reminderModal({}); });
      return;
    }
    el.innerHTML = list.map(function (r) {
      var late = r.date < today;
      return '<li class="mini-rem"><span class="cat-dot cat-' + r.category + '"></span><div class="grow"><div class="ttl">' + K.esc(r.title) + '</div><div class="when" style="' + (late ? 'color:var(--pink-deep)' : '') + '">' + K.rel(r.date, today) + (r.time ? ' · ' + K.esc(r.time) : '') + '</div></div><button type="button" class="check" data-done="' + r.id + '" aria-label="Tandai selesai">' + K.icon('check') + '</button></li>';
    }).join('');
    K.$$('[data-done]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        b.classList.add('is-loading');
        K.api('api/reminders.php', { body: { action: 'toggle', id: parseInt(b.dataset.done, 10), done: true } }).then(function (d) {
          rems = d.reminders; renderReminders(); K.refreshBell(); K.toast('ok', 'Selesai.');
        }).catch(function (e) { b.classList.remove('is-loading'); K.toast('error', e.message); });
      });
    });
  }

  function renderQuickEnd() {
    var m = cyc.model, btn = document.getElementById('quickEnd');
    var show = m.hasData && m.latest && !m.latest.end && C.diff(m.latest.start, m.today) <= 14;
    btn.hidden = !show;
  }

  function renderAll() { renderHero(); renderFocus(); renderWeek(); renderQuickEnd(); }

  function load() {
    return Promise.all([K.loadCycle(), K.api('api/reminders.php?action=list')]).then(function (r) {
      cyc = r[0]; rems = r[1].reminders;
      renderAll(); renderReminders();
    }).catch(function (e) {
      document.getElementById('helloSub').textContent = e.message;
      K.toast('error', e.message);
    });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.blur-sensitive');
    if (b) b.classList.toggle('is-revealed');
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('blur-sensitive')) { e.preventDefault(); e.target.classList.toggle('is-revealed'); }
  });

  document.getElementById('quickReminder').addEventListener('click', function () { K.reminderModal({}); });
  document.getElementById('quickEnd').addEventListener('click', function () {
    var m = cyc.model;
    K.confirm({ title: 'Haid selesai?', message: 'Tandai hari ini (' + K.fmt.date(m.today) + ') sebagai hari terakhir haid.', confirmText: 'Ya, selesai' }).then(function (ok) {
      if (!ok) return;
      K.api('api/cycle.php', { body: { action: 'update', id: m.latest.id, period_end: m.today } }).then(function () { K.toast('ok', 'Haid selesai dicatat.'); load(); }).catch(function (e) { K.toast('error', e.message); });
    });
  });
  document.addEventListener('kalaku:cycle', load);
  document.addEventListener('kalaku:reminders', function (e) { rems = e.detail.reminders; renderReminders(); });
  load();
})();
