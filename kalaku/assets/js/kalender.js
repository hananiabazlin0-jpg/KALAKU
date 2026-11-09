/* KALAKU — kalender siklus interaktif. */
(function () {
  'use strict';
  var K = window.Kalaku, C = window.KalakuCycle;
  var grid = document.getElementById('calGrid');
  var now = K.today().split('-');
  var year = +now[0], month0 = +now[1] - 1;
  var selected = K.today();
  var cyc = null, rems = [];
  document.body.dataset.cycleListener = '1';

  function remMap() {
    var map = {};
    rems.forEach(function (r) { if (!r.done) (map[r.date] = map[r.date] || []).push(r); });
    return map;
  }

  function cellLabel(inf) {
    if (inf.type === 'period') return inf.kind === 'actual' ? 'Haid H' + inf.day : 'Haid';
    if (inf.type === 'ovulation') return 'Ovulasi';
    if (inf.type === 'awaiting') return 'Menunggu';
    return '';
  }

  function renderGrid(dir) {
    var m = cyc.model, cells = C.monthGrid(year, month0), map = remMap(), today = K.today(), out = '';
    document.getElementById('calMonth').textContent = K.fmt.month(year, month0);
    cells.forEach(function (c) {
      var inf = C.dayInfo(m, c.date);
      var cls = 'day';
      if (!c.inMonth) cls += ' out';
      if (inf.type !== 'none') cls += ' t-' + inf.type + ' k-' + inf.kind;
      if (inf.fertile) cls += ' fertile';
      if (map[c.date]) cls += ' has-rem';
      if (c.date === today) cls += ' is-today';
      if (c.date === selected) cls += ' is-selected';
      var lab = c.inMonth ? cellLabel(inf) : '';
      var aria = K.fmt.long(c.date) + (inf.label ? ', ' + inf.label : '') + (inf.fertile ? ', masa subur' : '') + (map[c.date] ? ', ada pengingat' : '');
      out += '<button type="button" class="' + cls + '" data-date="' + c.date + '" aria-label="' + K.esc(aria) + '"' + (c.date === selected ? ' aria-pressed="true"' : '') + ' tabindex="' + (c.date === selected ? 0 : -1) + '">' +
        '<span class="n">' + parseInt(c.date.slice(8), 10) + '</span><span class="s">' + K.esc(lab) + '</span></button>';
    });
    grid.className = 'cal-grid' + (dir ? ' ' + dir : '');
    grid.innerHTML = out;
    void grid.offsetWidth;
  }

  function renderStatus() {
    var m = cyc.model, el = document.getElementById('calStatus');
    if (m.status === 'no_data') {
      el.innerHTML = '<div class="status-bar">' + K.icon('info') + '<span>Belum ada catatan. Catat hari pertama haid terakhirmu untuk mulai.</span></div>';
    } else if (m.status === 'awaiting') {
      el.innerHTML = '<div class="status-bar warn">' + K.icon('clock') + '<span>Perkiraan haid (' + K.fmt.short(m.nextStart) + ') terlewat ' + m.overdueDays + ' hari. Menunggu konfirmasi.</span><button type="button" class="btn btn-pink btn-sm" id="stAdd">Haid sudah mulai</button></div>';
      document.getElementById('stAdd').addEventListener('click', function () { K.periodModal({ title: 'Haid mulai' }); });
    } else {
      el.innerHTML = '<div class="status-bar">' + K.icon('calendar') + '<span>Hari ke-' + m.day + ' · fase ' + C.LABEL[m.phase].toLowerCase() + ' · haid berikutnya ' + K.fmt.short(m.nextStart) + ' (' + K.rel(m.nextStart, m.today).toLowerCase() + ')</span></div>';
    }
  }

  function recordCovering(date) {
    var m = cyc.model, found = null;
    m.records.forEach(function (r) { if (r.start <= date) found = r; });
    return found;
  }

  function renderDay() {
    var m = cyc.model, inf = C.dayInfo(m, selected), el = document.getElementById('dayCard'), today = K.today();
    var badges = '', text = '';
    if (inf.type === 'period') {
      badges += '<span class="badge badge-period">' + K.icon('drop') + 'Menstruasi</span>';
      text = inf.kind === 'actual' ? 'Hari ke-' + inf.day + ' haid (tercatat).' : (inf.kind === 'projection' ? 'Proyeksi haid di siklus mendatang. Makin jauh, makin kurang pasti.' : 'Perkiraan haid. Bisa maju atau mundur beberapa hari.');
    } else if (inf.type === 'awaiting') {
      badges += '<span class="badge badge-awaiting">' + K.icon('clock') + 'Menunggu konfirmasi</span>';
      text = 'Ini perkiraan tanggal haid, tapi belum ada catatan bahwa haid sudah dimulai. Catat tanggal sebenarnya begitu haid datang.';
    } else if (inf.type !== 'none') {
      badges += '<span class="badge badge-' + inf.type + '">' + C.LABEL[inf.type] + '</span>';
      text = 'Hari ke-' + inf.day + ' dari siklus ' + inf.cycleLength + ' hari. Fase ini adalah estimasi.';
    } else {
      text = m.hasData ? 'Di luar rentang perkiraan. KALAKU memproyeksikan maksimal 3 siklus ke depan dan tidak menebak lagi bila haid sudah terlewat.' : 'Belum ada data siklus untuk tanggal ini.';
    }
    if (inf.fertile) badges += '<span class="badge badge-fertile">' + K.icon('heart') + 'Masa subur (estimasi)</span>';
    if (inf.kind === 'projection' || inf.kind === 'predicted' || inf.kind === 'estimate') badges += '<span class="badge badge-est">Estimasi</span>';

    var html = '<h3>' + K.esc(K.fmt.long(selected)) + '</h3><p class="sub">' + K.esc(K.rel(selected, today)) + '</p>';
    html += (badges ? '<div class="day-badges">' + badges + '</div>' : '<div style="height:12px"></div>') + '<p class="day-text">' + K.esc(text) + '</p>';

    if (inf.type === 'period') {
      html += '<div class="day-block"><h4>Catatan ibadah</h4><p class="day-text">Selama haid, shalat dan puasa ditinggalkan. Puasa Ramadan diqadha setelah suci, shalat tidak diqadha. Penjelasan umum, bukan fatwa.</p></div>';
    }

    var list = (remMap()[selected] || []);
    if (list.length) {
      html += '<div class="day-block"><h4>Pengingat</h4><ul class="mini-list">' + list.map(function (r) {
        return '<li><span class="cat-dot cat-' + r.category + '"></span>' + K.esc(r.title) + (r.time ? ' <small style="color:var(--muted)">' + K.esc(r.time) + '</small>' : '') + '</li>';
      }).join('') + '</ul></div>';
    }

    var acts = '';
    var isStart = m.records.some(function (r) { return r.start === selected; });
    if (selected <= today && !isStart) acts += '<button type="button" class="btn btn-pink btn-sm" id="dcStart">' + K.icon('drop') + 'Haid mulai di sini</button>';
    var rec = recordCovering(selected);
    if (rec && !rec.end && selected >= rec.start && selected <= today && C.diff(rec.start, selected) <= 14) {
      acts += '<button type="button" class="btn btn-ghost btn-sm" id="dcEnd">' + K.icon('check') + 'Haid selesai di sini</button>';
    }
    acts += '<button type="button" class="btn btn-ghost btn-sm" id="dcRem">' + K.icon('bell') + 'Tambah pengingat</button>';
    html += '<div class="day-actions">' + acts + '</div>';
    el.innerHTML = html;

    var s = document.getElementById('dcStart');
    if (s) s.addEventListener('click', function () { K.periodModal({ date: selected, title: 'Haid mulai' }); });
    var e = document.getElementById('dcEnd');
    if (e) e.addEventListener('click', function () {
      K.api('api/cycle.php', { body: { action: 'update', id: rec.id, period_end: selected } }).then(function (d) {
        K.toast('ok', d.message); document.dispatchEvent(new CustomEvent('kalaku:cycle', { detail: d }));
      }).catch(function (er) { K.toast('error', er.message); });
    });
    document.getElementById('dcRem').addEventListener('click', function () { K.reminderModal({ date: selected }); });
  }

  function renderHistory() {
    var m = cyc.model, el = document.getElementById('history');
    var all = cyc.records.slice().sort(function (a, b) { return a.period_start < b.period_start ? 1 : -1; });
    if (!all.length) { el.innerHTML = '<li class="empty">Belum ada riwayat. Catat hari pertama haid terakhirmu.</li>'; return; }
    el.innerHTML = all.map(function (r, i) {
      var older = all[i + 1], sub = '';
      if (r.period_end) sub += C.diff(r.period_start, r.period_end) + 1 + ' hari haid';
      else sub += 'Tanggal selesai belum diisi';
      if (older) sub += ' · siklus ' + C.diff(older.period_start, r.period_start) + ' hari';
      return '<li class="hist-item"><div class="grow"><b>' + K.esc(K.fmt.date(r.period_start)) + (r.period_end ? ' – ' + K.esc(K.fmt.short(r.period_end)) : '') + '</b><small>' + K.esc(sub) + '</small></div>' +
        '<button type="button" class="icon-btn icon-btn-sm" data-edit="' + r.id + '" aria-label="Ubah tanggal selesai">' + K.icon('edit') + '</button>' +
        '<button type="button" class="icon-btn icon-btn-sm danger" data-del="' + r.id + '" aria-label="Hapus catatan">' + K.icon('trash') + '</button></li>';
    }).join('');
    K.$$('[data-edit]', el).forEach(function (b) { b.addEventListener('click', function () { editEnd(parseInt(b.dataset.edit, 10)); }); });
    K.$$('[data-del]', el).forEach(function (b) { b.addEventListener('click', function () { delRecord(parseInt(b.dataset.del, 10)); }); });
  }

  function findRec(id) { return cyc.records.filter(function (r) { return r.id === id; })[0]; }

  function editEnd(id) {
    var r = findRec(id); if (!r) return;
    K.modal({
      title: 'Hari terakhir haid',
      html: '<p class="field-hint" style="margin-bottom:12px">Haid mulai ' + K.esc(K.fmt.date(r.period_start)) + '. Kosongkan untuk menghapus tanggal selesai.</p><div class="field"><label for="eeEnd">Tanggal selesai</label><input type="date" id="eeEnd" min="' + r.period_start + '" max="' + K.today() + '" value="' + K.esc(r.period_end || '') + '"></div>',
      actions: [
        { label: 'Batal', kind: 'ghost', value: null },
        { label: 'Simpan', kind: 'primary', onClick: function (m) {
          return K.api('api/cycle.php', { body: { action: 'update', id: id, period_end: K.$('#eeEnd', m).value || null } }).then(function (d) {
            K.toast('ok', d.message); document.dispatchEvent(new CustomEvent('kalaku:cycle', { detail: d })); return d;
          });
        } }
      ]
    });
  }

  function delRecord(id) {
    var r = findRec(id); if (!r) return;
    K.confirm({ title: 'Hapus catatan ini?', message: 'Catatan haid mulai ' + K.fmt.date(r.period_start) + ' akan dihapus dan perhitungan siklus ikut berubah.', confirmText: 'Hapus', danger: true }).then(function (ok) {
      if (!ok) return;
      K.api('api/cycle.php', { body: { action: 'delete', id: id } }).then(function (d) {
        document.dispatchEvent(new CustomEvent('kalaku:cycle', { detail: d }));
        K.toast('ok', 'Catatan dihapus.', { timeout: 7000, action: { label: 'Urungkan', onClick: function () {
          K.api('api/cycle.php', { body: { action: 'add', period_start: r.period_start, period_end: r.period_end, cycle_length: r.cycle_length, notes: r.notes } }).then(function (d2) {
            document.dispatchEvent(new CustomEvent('kalaku:cycle', { detail: d2 })); K.toast('ok', 'Catatan dikembalikan.');
          }).catch(function (e) { K.toast('error', e.message); });
        } } });
      }).catch(function (e) { K.toast('error', e.message); });
    });
  }

  function applyCycle(d) {
    cyc = { records: d.records, defaults: d.defaults, model: C.build(d.records, d.defaults, K.today()) };
    K.cycle = cyc;
    renderStatus(); renderGrid(); renderDay(); renderHistory();
  }

  function go(delta) {
    month0 += delta;
    while (month0 < 0) { month0 += 12; year--; }
    while (month0 > 11) { month0 -= 12; year++; }
    renderGrid(delta > 0 ? 'slide-next' : 'slide-prev');
  }

  function select(date, focus) {
    selected = date;
    var p = date.split('-'), y = +p[0], m0 = +p[1] - 1;
    if (y !== year || m0 !== month0) { var d = (y * 12 + m0) - (year * 12 + month0); year = y; month0 = m0; renderGrid(d > 0 ? 'slide-next' : 'slide-prev'); }
    else {
      K.$$('.day', grid).forEach(function (b) {
        var on = b.dataset.date === date;
        b.classList.toggle('is-selected', on); b.tabIndex = on ? 0 : -1;
        if (on) b.setAttribute('aria-pressed', 'true'); else b.removeAttribute('aria-pressed');
      });
    }
    renderDay();
    if (focus) { var n = K.$('.day[data-date="' + date + '"]', grid); if (n) n.focus(); }
  }

  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.day'); if (b) select(b.dataset.date, false);
  });
  grid.addEventListener('keydown', function (e) {
    var b = e.target.closest('.day'); if (!b) return;
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    select(C.addDays(b.dataset.date, step), true);
  });
  document.getElementById('calPrev').addEventListener('click', function () { go(-1); });
  document.getElementById('calNext').addEventListener('click', function () { go(1); });
  document.getElementById('calToday').addEventListener('click', function () { select(K.today(), false); });
  document.getElementById('calAdd').addEventListener('click', function () { K.periodModal({}); });

  document.addEventListener('kalaku:cycle', function (e) { applyCycle(e.detail); });
  document.addEventListener('kalaku:reminders', function (e) { rems = e.detail.reminders; renderGrid(); renderDay(); });

  Promise.all([K.api('api/cycle.php?action=list'), K.api('api/reminders.php?action=list')]).then(function (r) {
    rems = r[1].reminders;
    applyCycle(r[0]);
  }).catch(function (e) {
    document.getElementById('calStatus').innerHTML = '<div class="status-bar warn">' + K.icon('alert') + '<span>' + K.esc(e.message) + '</span></div>';
    K.toast('error', e.message);
  });
})();
