/* KALAKU — profil. */
(function () {
  'use strict';
  var K = window.Kalaku, C = window.KalakuCycle;
  var form = document.getElementById('profileForm');

  function stats(records) {
    document.getElementById('statCount').textContent = records.length ? records.length + ' kali' : '—';
    var iv = [], pl = [];
    for (var i = 1; i < records.length; i++) { var d = C.diff(records[i - 1].period_start, records[i].period_start); if (d >= 21 && d <= 45) iv.push(d); }
    records.forEach(function (r) { if (r.period_end) { var p = C.diff(r.period_start, r.period_end) + 1; if (p >= 1 && p <= 14) pl.push(p); } });
    function avg(a) { return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length) : null; }
    var ac = avg(iv), ap = avg(pl);
    document.getElementById('statCycle').textContent = ac ? ac + ' hari' : '—';
    document.getElementById('statPeriod').textContent = ap ? ap + ' hari' : '—';
  }

  K.api('api/cycle.php?action=list').then(function (d) { stats(d.records); }).catch(function () { /* statistik opsional */ });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('button[type=submit]');
    var body = {
      action: 'update_profile',
      name: document.getElementById('pName').value.trim(),
      email: document.getElementById('pEmail').value.trim(),
      birth_date: document.getElementById('pBirth').value,
      cycle_length: parseInt(document.getElementById('pCycle').value, 10),
      period_length: parseInt(document.getElementById('pPeriod').value, 10)
    };
    if (body.name.length < 2) { K.toast('error', 'Nama minimal 2 karakter.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) { K.toast('error', 'Format email tidak valid.'); return; }
    if (!(body.cycle_length >= 21 && body.cycle_length <= 45)) { K.toast('error', 'Panjang siklus harus 21–45 hari.'); return; }
    if (!(body.period_length >= 2 && body.period_length <= 10)) { K.toast('error', 'Lama haid harus 2–10 hari.'); return; }
    K.setLoading(btn, true, 'Menyimpan…');
    K.api('api/account.php', { body: body }).then(function (d) {
      K.setLoading(btn, false);
      document.getElementById('profName').textContent = d.user.name;
      document.getElementById('profEmail').textContent = d.user.email;
      document.getElementById('profAvatar').textContent = d.user.initials;
      var av = document.querySelector('.topbar .avatar'); if (av) av.textContent = d.user.initials;
      K.toast('ok', d.message);
    }).catch(function (er) { K.setLoading(btn, false); K.toast('error', er.message); });
  });
})();
