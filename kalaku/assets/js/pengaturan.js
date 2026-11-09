/* KALAKU — pengaturan. */
(function () {
  'use strict';
  var K = window.Kalaku;

  function savePref(body, okMsg) {
    body.action = 'update_prefs';
    return K.api('api/account.php', { body: body }).then(function (d) { K.toast('ok', okMsg || d.message, { timeout: 2200 }); return d; });
  }

  /* ----- Notifikasi ----- */
  var notify = document.getElementById('setNotify');
  var permText = document.getElementById('notifPermText');
  function permLabel() {
    var p = K.notif.permission();
    permText.textContent = p === 'unsupported' ? 'Browser ini tidak mendukung notifikasi.' :
      p === 'granted' ? 'Izin browser: diberikan.' : p === 'denied' ? 'Izin browser: diblokir. Ubah lewat ikon gembok di address bar.' : 'Izin browser: belum diminta.';
  }
  permLabel();
  notify.addEventListener('change', function () {
    var on = notify.checked;
    savePref({ notification_enabled: on }, on ? 'Notifikasi diaktifkan.' : 'Notifikasi dimatikan.').then(function () {
      if (K.boot.user) K.boot.user.notify = on;
      if (on && K.notif.permission() === 'default') K.notif.request().then(permLabel);
    }).catch(function (e) { notify.checked = !on; K.toast('error', e.message); });
  });
  document.getElementById('notifAllow').addEventListener('click', function () {
    if (K.notif.permission() === 'unsupported') { K.toast('error', 'Browser ini tidak mendukung notifikasi.'); return; }
    K.notif.request().then(function (r) {
      permLabel();
      K.toast(r === 'granted' ? 'ok' : 'error', r === 'granted' ? 'Izin diberikan.' : 'Izin tidak diberikan.');
    });
  });
  document.getElementById('notifTest').addEventListener('click', function () {
    K.toast('info', 'Ini contoh pengingat dari KALAKU.');
    if (!K.notif.show('KALAKU · Tes', 'Notifikasi browser berfungsi.') && K.notif.permission() !== 'granted') {
      K.toast('info', 'Izinkan notifikasi browser dulu agar tes juga muncul di luar halaman.');
    }
  });

  /* ----- Privasi ----- */
  var privacy = document.getElementById('setPrivacy');
  privacy.addEventListener('change', function () {
    var on = privacy.checked;
    savePref({ privacy_mode: on }, on ? 'Mode privasi aktif.' : 'Mode privasi dimatikan.').then(function () {
      if (K.boot.user) K.boot.user.privacy = on;
    }).catch(function (e) { privacy.checked = !on; K.toast('error', e.message); });
  });

  /* ----- Ganti kata sandi ----- */
  var pf = document.getElementById('passForm');
  pf.addEventListener('submit', function (e) {
    e.preventDefault();
    var cur = document.getElementById('pwCur').value, nw = document.getElementById('pwNew').value, cf = document.getElementById('pwConf').value;
    if (!cur) { K.toast('error', 'Isi kata sandi saat ini.'); return; }
    if (nw.length < 8 || !/[A-Za-z]/.test(nw) || !/\d/.test(nw)) { K.toast('error', 'Kata sandi baru minimal 8 karakter, berisi huruf dan angka.'); return; }
    if (nw !== cf) { K.toast('error', 'Konfirmasi kata sandi tidak sama.'); return; }
    var btn = pf.querySelector('button[type=submit]');
    K.setLoading(btn, true, 'Menyimpan…');
    K.api('api/account.php', { body: { action: 'change_password', current: cur, new: nw, confirm: cf } }).then(function (d) {
      K.setLoading(btn, false); pf.reset();
      var m = document.getElementById('strength'); if (m) m.dataset.level = 0;
      K.toast('ok', d.message);
    }).catch(function (er) { K.setLoading(btn, false); K.toast('error', er.message); });
  });

  /* ----- Data ----- */
  document.getElementById('clearChat').addEventListener('click', function () {
    K.confirm({ title: 'Hapus riwayat ' + (K.boot.ai || 'KALA AI') + '?', message: 'Seluruh percakapan yang tersimpan akan dihapus.', confirmText: 'Hapus', danger: true }).then(function (ok) {
      if (!ok) return;
      K.api('api/ai-history.php', { body: { action: 'clear' } }).then(function (d) { K.toast('ok', d.message); }).catch(function (e) { K.toast('error', e.message); });
    });
  });

  document.getElementById('deleteAccount').addEventListener('click', function () {
    K.modal({
      title: 'Hapus akun permanen?',
      html: '<p>Semua data siklus, pengingat, dan riwayat percakapan akan terhapus dan <b>tidak bisa dipulihkan</b>. Pertimbangkan mengekspor data dulu.</p>' +
        '<form class="form" style="margin-top:14px" novalidate><div class="field"><label for="daPw">Kata sandi</label><input type="password" id="daPw" autocomplete="current-password"></div>' +
        '<div class="field"><label for="daTxt">Ketik <b>HAPUS</b> untuk mengonfirmasi</label><input type="text" id="daTxt" autocomplete="off"></div></form>',
      actions: [
        { label: 'Batal', kind: 'ghost', value: null },
        { label: 'Hapus akun', kind: 'danger', onClick: function (m) {
          var pw = K.$('#daPw', m).value, tx = K.$('#daTxt', m).value;
          if (!pw) { K.toast('error', 'Isi kata sandimu.'); return false; }
          if (tx.trim().toUpperCase() !== 'HAPUS') { K.toast('error', 'Ketik HAPUS untuk mengonfirmasi.'); return false; }
          return K.api('api/account.php', { body: { action: 'delete_account', password: pw, confirm_text: tx } }).then(function (d) {
            window.location.href = d.redirect || 'index.php'; return d;
          });
        } }
      ]
    });
  });

  var aiTest = document.getElementById('aiTest');
  if (aiTest) aiTest.addEventListener('click', function () {
    K.setLoading(aiTest, true, 'Menguji…');
    K.api('api/ai-test.php').then(function (d) {
      K.setLoading(aiTest, false);
      K.toast('ok', d.message + (d.used ? ' (' + d.used + ')' : ''), { timeout: 6000 });
    }).catch(function (e) {
      K.setLoading(aiTest, false);
      var d = e.data || {};
      K.toast('error', d.hint ? e.message : e.message + (d.detail ? ' — ' + d.detail : ''), { timeout: 20000 });
    });
  });
})();
