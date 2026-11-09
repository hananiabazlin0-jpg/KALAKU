/* KALAKU — halaman pengingat. */
(function () {
  'use strict';
  var K = window.Kalaku, C = window.KalakuCycle;
  var listEl = document.getElementById('remList');
  var rems = [], filter = 'semua', cyc = null;
  var CAT = { siklus: 'Siklus', ibadah: 'Ibadah', kesehatan: 'Kesehatan', lainnya: 'Lainnya' };

  function sortFn(a, b) { var x = a.date + ' ' + (a.time || '99:99'), y = b.date + ' ' + (b.time || '99:99'); return x < y ? -1 : (x > y ? 1 : 0); }

  function item(r, today) {
    var late = !r.done && r.date < today;
    return '<div class="rem' + (r.done ? ' done' : '') + '" data-id="' + r.id + '">' +
      '<button type="button" class="check" data-toggle="' + r.id + '" aria-label="' + (r.done ? 'Tandai belum selesai' : 'Tandai selesai') + '" aria-pressed="' + (r.done ? 'true' : 'false') + '">' + K.icon('check') + '</button>' +
      '<div class="rem-body"><div class="rem-title">' + K.esc(r.title) + '</div><div class="rem-sub"><span class="cat-dot cat-' + r.category + '"></span>' + CAT[r.category] +
      '<span>·</span><span style="' + (late ? 'color:var(--pink-deep);font-weight:600' : '') + '">' + K.esc(K.rel(r.date, today)) + ' (' + K.esc(K.fmt.short(r.date)) + ')</span>' + (r.time ? '<span>· ' + K.esc(r.time) + '</span>' : '') + '</div></div>' +
      '<div class="rem-actions"><button type="button" class="icon-btn icon-btn-sm" data-edit="' + r.id + '" aria-label="Ubah">' + K.icon('edit') + '</button>' +
      '<button type="button" class="icon-btn icon-btn-sm danger" data-del="' + r.id + '" aria-label="Hapus">' + K.icon('trash') + '</button></div></div>';
  }

  function group(title, arr, cls, today) {
    if (!arr.length) return '';
    return '<div class="rem-group ' + (cls || '') + '"><h3>' + title + ' <span class="count">' + arr.length + '</span></h3><div class="rem-items">' + arr.map(function (r) { return item(r, today); }).join('') + '</div></div>';
  }

  function render() {
    var today = K.today();
    var all = rems.filter(function (r) { return filter === 'semua' || r.category === filter; });
    var active = all.filter(function (r) { return !r.done; }).sort(sortFn);
    var done = all.filter(function (r) { return r.done; }).sort(sortFn).reverse().slice(0, 10);
    var late = active.filter(function (r) { return r.date < today; });
    var td = active.filter(function (r) { return r.date === today; });
    var up = active.filter(function (r) { return r.date > today; });
    var html = group('Terlambat', late, 'late', today) + group('Hari ini', td, '', today) + group('Mendatang', up, '', today) + group('Selesai', done, '', today);
    if (!html) {
      html = '<div class="card empty" style="padding:36px 16px">' + K.icon('bell') + '<p style="margin:10px 0 14px"><b>' + (rems.length ? 'Tidak ada pengingat di kategori ini.' : 'Belum ada pengingat.') + '</b><br>Buat satu agar tidak terlewat.</p><button type="button" class="btn btn-primary btn-sm" id="emptyAdd">' + K.icon('plus') + 'Pengingat baru</button></div>';
    }
    listEl.innerHTML = html;
    var ea = document.getElementById('emptyAdd'); if (ea) ea.addEventListener('click', function () { K.reminderModal({}); });
  }

  function find(id) { return rems.filter(function (r) { return r.id === id; })[0]; }

  listEl.addEventListener('click', function (e) {
    var t = e.target.closest('[data-toggle]'), ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
    if (t) {
      var id = parseInt(t.dataset.toggle, 10), r = find(id); if (!r) return;
      t.disabled = true;
      K.api('api/reminders.php', { body: { action: 'toggle', id: id, done: !r.done } }).then(function (d) {
        rems = d.reminders; render(); K.refreshBell(); K.toast('ok', d.message, { timeout: 2200 });
      }).catch(function (er) { t.disabled = false; K.toast('error', er.message); });
    } else if (ed) {
      var r2 = find(parseInt(ed.dataset.edit, 10)); if (r2) K.reminderModal({ reminder: r2 });
    } else if (dl) {
      var r3 = find(parseInt(dl.dataset.del, 10)); if (!r3) return;
      K.api('api/reminders.php', { body: { action: 'delete', id: r3.id } }).then(function (d) {
        rems = d.reminders; render(); K.refreshBell();
        K.toast('ok', 'Pengingat dihapus.', { timeout: 6500, action: { label: 'Urungkan', onClick: function () {
          K.api('api/reminders.php', { body: { action: 'add', title: r3.title, date: r3.date, time: r3.time, category: r3.category } }).then(function (d2) { rems = d2.reminders; render(); K.refreshBell(); K.toast('ok', 'Pengingat dikembalikan.'); }).catch(function (er) { K.toast('error', er.message); });
        } } });
      }).catch(function (er) { K.toast('error', er.message); });
    }
  });

  document.getElementById('remAdd').addEventListener('click', function () { K.reminderModal({}); });
  K.$$('#remFilters .chip').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.dataset.filter;
      K.$$('#remFilters .chip').forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
      render();
    });
  });
  document.addEventListener('kalaku:reminders', function (e) { rems = e.detail.reminders; render(); });

  /* ---------- Tambah cepat ---------- */
  function nextDow(from, targets) {
    for (var i = 1; i <= 7; i++) {
      var d = C.addDays(from, i), w = (new Date(C.dn(d) * 86400000)).getUTCDay();
      if (targets.indexOf(w) !== -1) return d;
    }
    return C.addDays(from, 1);
  }

  K.$$('#presets .preset').forEach(function (b) {
    b.addEventListener('click', function () {
      var today = K.today(), m = cyc && cyc.model, p = b.dataset.preset;
      if (p === 'next-period') {
        if (!m || m.status !== 'current') { K.toast('info', m && m.status === 'awaiting' ? 'Perkiraan haid sudah lewat. Catat tanggal haid yang sebenarnya dulu di Kalender.' : 'Catat haid dulu di Kalender agar perkiraannya bisa dihitung.'); return; }
        var d = C.addDays(m.nextStart, -2); if (d < today) d = today;
        K.reminderModal({ title: 'Haid diperkirakan segera. Siapkan perlengkapan', date: d, time: '08:00', category: 'siklus' });
      } else if (p === 'qadha') {
        K.reminderModal({ title: 'Qadha puasa', date: C.addDays(today, 1), time: '03:30', category: 'ibadah' });
      } else if (p === 'senin-kamis') {
        K.reminderModal({ title: 'Puasa sunnah Senin/Kamis', date: nextDow(today, [1, 4]), time: '03:30', category: 'ibadah' });
      } else if (p === 'ovulasi') {
        if (!m || !m.hasData || m.status !== 'current') { K.toast('info', 'Catat haid dulu di Kalender agar perkiraan ovulasi tersedia.'); return; }
        if (m.ovulationDate < today) { K.toast('info', 'Perkiraan ovulasi siklus ini sudah lewat.'); return; }
        K.reminderModal({ title: 'Perkiraan hari ovulasi', date: m.ovulationDate, time: '08:00', category: 'kesehatan' });
      } else if (p === 'air') {
        var h = new Date().getHours();
        K.reminderModal({ title: 'Minum air putih', date: h >= 16 ? C.addDays(today, 1) : today, time: '16:00', category: 'kesehatan' });
      }
    });
  });

  /* ---------- Kartu notifikasi ---------- */
  function renderNotif() {
    var el = document.getElementById('notifCard'), perm = K.notif.permission(), on = K.boot.user && K.boot.user.notify;
    var html = '<h3>Notifikasi</h3>';
    if (perm === 'unsupported') html += '<p>Browser ini tidak mendukung notifikasi. Pengingat tetap tampil sebagai pesan di dalam KALAKU.</p>';
    else if (perm === 'granted') html += '<p>' + (on ? 'Notifikasi browser aktif. Kamu akan diingatkan saat KALAKU terbuka di tab.' : 'Izin browser sudah diberikan, tapi notifikasi dimatikan di Pengaturan.') + '</p><a class="btn btn-ghost btn-sm" href="pengaturan.php">Buka pengaturan</a>';
    else if (perm === 'denied') html += '<p>Notifikasi diblokir di browser. Ubah izin situs lewat ikon gembok di address bar.</p>';
    else html += '<p>Aktifkan agar pengingat muncul sebagai notifikasi saat waktunya tiba.</p><button type="button" class="btn btn-primary btn-sm" id="notifOn">' + K.icon('bell') + 'Izinkan notifikasi</button>';
    el.innerHTML = html;
    var b = document.getElementById('notifOn');
    if (b) b.addEventListener('click', function () { K.notif.request().then(function (r) { if (r === 'granted') K.toast('ok', 'Notifikasi diaktifkan.'); renderNotif(); }); });
  }

  Promise.all([K.api('api/reminders.php?action=list'), K.loadCycle().catch(function () { return null; })]).then(function (r) {
    rems = r[0].reminders; cyc = r[1]; render();
  }).catch(function (e) { listEl.innerHTML = '<div class="alert alert-error">' + K.icon('alert') + '<span>' + K.esc(e.message) + '</span></div>'; });
  renderNotif();
})();
