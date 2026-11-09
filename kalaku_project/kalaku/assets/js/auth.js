/* KALAKU — validasi form masuk & daftar di sisi browser (server tetap memvalidasi ulang). */
(function () {
  'use strict';
  var K = window.Kalaku;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setErr(input, msg) {
    var f = input.closest('.field');
    if (!f) return;
    f.classList.toggle('has-error', !!msg);
    var p = f.querySelector('.field-error');
    if (!p && msg) { p = document.createElement('p'); p.className = 'field-error'; f.appendChild(p); }
    if (p) p.textContent = msg || '';
  }

  function wire(form, rules) {
    if (!form) return;
    Object.keys(rules).forEach(function (id) {
      var inp = document.getElementById(id);
      if (inp) inp.addEventListener('input', function () { setErr(inp, ''); });
    });
    form.addEventListener('submit', function (e) {
      var ok = true, firstBad = null;
      Object.keys(rules).forEach(function (id) {
        var inp = document.getElementById(id);
        if (!inp) return;
        var msg = rules[id](inp.value, form);
        setErr(inp, msg);
        if (msg) { ok = false; if (!firstBad) firstBad = inp; }
      });
      if (!ok) { e.preventDefault(); if (firstBad) firstBad.focus(); return; }
      var btn = form.querySelector('button[type=submit]');
      K.setLoading(btn, true, btn && btn.dataset.loadingText);
    });
  }

  wire(document.getElementById('loginForm'), {
    email: function (v) { return EMAIL.test(v.trim()) ? '' : 'Masukkan email yang valid.'; },
    password: function (v) { return v ? '' : 'Isi kata sandi.'; }
  });

  wire(document.getElementById('registerForm'), {
    name: function (v) { v = v.trim(); return v.length >= 2 && v.length <= 100 ? '' : 'Nama harus 2–100 karakter.'; },
    email: function (v) { return EMAIL.test(v.trim()) ? '' : 'Masukkan email yang valid.'; },
    password: function (v) {
      if (v.length < 8) return 'Kata sandi minimal 8 karakter.';
      if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Harus mengandung huruf dan angka.';
      return '';
    },
    confirm: function (v, form) { return v === form.querySelector('#password').value ? '' : 'Konfirmasi kata sandi tidak sama.'; }
  });
})();
