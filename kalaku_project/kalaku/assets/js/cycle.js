/* KALAKU — mesin perhitungan siklus (dipakai browser & diuji dengan Node).
 * Semua tanggal berupa string "YYYY-MM-DD". Hitungan memakai hari UTC agar bebas masalah zona waktu/DST.
 * Fase & ovulasi = ESTIMASI kalender, bukan diagnosis medis. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KalakuCycle = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MS = 86400000;
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dn(s) { var p = String(s).split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / MS); }
  function str(n) { var d = new Date(n * MS); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function addDays(s, n) { return str(dn(s) + n); }
  function diff(a, b) { return dn(b) - dn(a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function localToday() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  var LABEL = { period: 'Menstruasi', follicular: 'Folikular', ovulation: 'Ovulasi', luteal: 'Luteal', awaiting: 'Menunggu konfirmasi', none: '' };

  var FOCUS = {
    period: ['Istirahat cukup dan minum air hangat.', 'Kompres hangat di perut bawah bisa membantu meredakan kram.', 'Pilih aktivitas ringan seperti jalan santai atau peregangan.'],
    follicular: ['Energi biasanya mulai naik, waktu yang pas untuk aktivitas baru.', 'Perbanyak makanan kaya zat besi untuk memulihkan tubuh.', 'Olahraga sedang biasanya terasa lebih nyaman.'],
    ovulation: ['Ini perkiraan masa paling subur dalam siklusmu.', 'Jaga asupan air putih, suhu tubuh bisa sedikit naik.', 'Sebagian orang merasakan nyeri ringan di satu sisi perut.'],
    luteal: ['Gejala PMS bisa muncul: mudah lelah, suasana hati berubah, payudara terasa nyeri.', 'Tidur teratur dan kurangi kafein bila terasa gelisah.', 'Siapkan perlengkapan haid untuk perkiraan tanggal berikutnya.']
  };

  function ovDay(L, P) {
    L = clamp(L, 21, 45);
    var ov = Math.max(P + 1, L - 14);
    if (ov >= L) ov = Math.max(P + 1, L - 1);
    return ov;
  }

  function phaseFor(day, L, P) {
    L = clamp(L, 21, 45);
    P = Math.max(1, P);
    var ov = ovDay(L, P);
    if (day <= P) return 'period';
    if (day === ov) return 'ovulation';
    if (day < ov) return 'follicular';
    return 'luteal';
  }

  function avg(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return arr.length ? s / arr.length : null; }

  function build(records, defaults, today) {
    defaults = defaults || {};
    today = today || localToday();
    var dc = clamp(parseInt(defaults.cycle_length, 10) || 28, 21, 45);
    var dp = clamp(parseInt(defaults.period_length, 10) || 5, 2, 10);

    var recs = (records || []).filter(function (r) { return r && r.period_start && r.period_start <= today; }).map(function (r) {
      return { id: r.id, start: r.period_start, end: r.period_end || null, cycle_length: r.cycle_length ? +r.cycle_length : null, notes: r.notes || '' };
    }).sort(function (a, b) { return a.start < b.start ? -1 : (a.start > b.start ? 1 : 0); });

    var m = { today: today, records: recs, hasData: recs.length > 0, length: dc, period: dp, defaults: { cycle: dc, period: dp } };
    if (!recs.length) { m.status = 'no_data'; return m; }

    var latest = recs[recs.length - 1];
    var intervals = [];
    for (var i = 1; i < recs.length; i++) {
      var d = diff(recs[i - 1].start, recs[i].start);
      if (d >= 21 && d <= 45) intervals.push(d);
    }
    var recent = intervals.slice(-3);
    var a = avg(recent);
    if (a !== null) { m.length = clamp(Math.round(a), 21, 45); m.source = 'history'; }
    else if (latest.cycle_length) { m.length = clamp(latest.cycle_length, 21, 45); m.source = 'input'; }
    else { m.length = dc; m.source = 'default'; }
    m.intervals = recent;

    var plens = [];
    recs.forEach(function (r) {
      if (r.end) { var p = diff(r.start, r.end) + 1; if (p >= 1 && p <= 14) plens.push(p); }
    });
    var pa = avg(plens.slice(-3));
    m.period = pa !== null ? clamp(Math.round(pa), 2, 10) : dp;

    m.latest = latest;
    m.latestPeriod = latest.end ? Math.max(1, diff(latest.start, latest.end) + 1) : m.period;
    m.nextStart = addDays(latest.start, m.length);
    m.daysUntil = diff(today, m.nextStart);
    m.overdueDays = Math.max(0, -m.daysUntil);
    m.status = today < m.nextStart ? 'current' : 'awaiting';

    var ov = ovDay(m.length, m.latestPeriod);
    m.ovDay = ov;
    m.ovulationDate = addDays(latest.start, ov - 1);
    m.fertileStart = addDays(latest.start, Math.max(m.latestPeriod + 1, ov - 5) - 1);
    m.fertileEnd = addDays(latest.start, ov);

    if (m.status === 'current') {
      m.day = diff(latest.start, today) + 1;
      m.phase = phaseFor(m.day, m.length, m.latestPeriod);
      m.phaseLabel = LABEL[m.phase];
    } else {
      m.day = null; m.phase = null; m.phaseLabel = LABEL.awaiting;
    }
    return m;
  }

  function make(ds, type, kind, day, L, P) {
    var ov = ovDay(L, P);
    var fertile = type !== 'period' && day >= Math.max(P + 1, ov - 5) && day <= ov + 1;
    return { date: ds, type: type, kind: kind, day: day, label: LABEL[type], cycleLength: L, periodLength: P, fertile: fertile, ovulation: type === 'ovulation' };
  }

  function dayInfo(m, ds) {
    var none = { date: ds, type: 'none', kind: 'none', day: null, label: '', fertile: false };
    if (!m || !m.hasData) return none;
    var recs = m.records, idx = -1;
    for (var i = recs.length - 1; i >= 0; i--) { if (recs[i].start <= ds) { idx = i; break; } }
    if (idx < 0) return none;

    var r = recs[idx], next = recs[idx + 1];
    var pos = diff(r.start, ds);
    var day, L, P;

    if (next) {
      L = clamp(diff(r.start, next.start), 21, 45);
      P = r.end ? Math.max(1, diff(r.start, r.end) + 1) : m.period;
      day = pos + 1;
      if (day <= P) return make(ds, 'period', 'actual', day, L, P);
      return make(ds, phaseFor(day, L, P), 'estimate', day, L, P);
    }

    L = m.length;
    P = r.end ? Math.max(1, diff(r.start, r.end) + 1) : m.period;
    var cyc = Math.floor(pos / L);

    if (cyc === 0) {
      day = pos + 1;
      if (day <= P) {
        var actual = r.end ? true : ds <= m.today;
        return make(ds, 'period', actual ? 'actual' : 'estimate', day, L, P);
      }
      return make(ds, phaseFor(day, L, P), 'estimate', day, L, P);
    }

    day = (pos % L) + 1;
    if (m.today >= m.nextStart) {
      if (cyc === 1 && day <= m.period) {
        return { date: ds, type: 'awaiting', kind: 'awaiting', day: null, label: LABEL.awaiting, fertile: false };
      }
      return none;
    }
    if (cyc > 3) return none;
    var kindNext = cyc === 1 ? 'predicted' : 'projection';
    if (day <= m.period) return make(ds, 'period', kindNext, day, L, m.period);
    return make(ds, phaseFor(day, L, m.period), cyc === 1 ? 'estimate' : 'projection', day, L, m.period);
  }

  function monthGrid(y, m0) {
    var first = Math.round(Date.UTC(y, m0, 1) / MS);
    var dow = (new Date(first * MS).getUTCDay() + 6) % 7;
    var days = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
    var cells = [];
    for (var i = 0; i < 42; i++) {
      cells.push({ date: str(first - dow + i), inMonth: i >= dow && i < dow + days });
    }
    return cells;
  }

  function segments(L, P) {
    L = clamp(L, 21, 45);
    P = Math.max(1, P);
    var ov = ovDay(L, P);
    var segs = [{ key: 'period', from: 1, to: P }];
    if (ov - 1 >= P + 1) segs.push({ key: 'follicular', from: P + 1, to: ov - 1 });
    segs.push({ key: 'ovulation', from: ov, to: ov });
    if (ov + 1 <= L) segs.push({ key: 'luteal', from: ov + 1, to: L });
    return segs;
  }

  return {
    LABEL: LABEL, FOCUS: FOCUS,
    build: build, dayInfo: dayInfo, phaseFor: phaseFor, ovDay: ovDay, segments: segments, monthGrid: monthGrid,
    dn: dn, str: str, addDays: addDays, diff: diff, clamp: clamp, localToday: localToday
  };
});
