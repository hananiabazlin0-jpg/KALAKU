/* KALAKU — demo interaktif di halaman utama. */
(function () {
  'use strict';
  var K = window.Kalaku, C = window.KalakuCycle;
  var slider = document.getElementById('demoDay');
  if (!slider || !C) return;
  var L = 28, P = 5;
  var DESC = {
    period: 'Rahim meluruhkan lapisannya. Istirahat dan kompres hangat sering membantu.',
    follicular: 'Energi biasanya mulai naik dan suasana hati lebih ringan.',
    ovulation: 'Perkiraan masa paling subur dalam satu siklus.',
    luteal: 'Gejala PMS bisa muncul menjelang haid berikutnya.'
  };
  function render() {
    var day = parseInt(slider.value, 10);
    var key = C.phaseFor(day, L, P);
    K.ring(document.getElementById('demoRing'), { length: L, period: P, day: day, dark: true, label: 'Hari ke-' + day + ' dari ' + L });
    document.getElementById('demoPhase').textContent = C.LABEL[key];
    document.getElementById('demoDesc').textContent = DESC[key];
    document.getElementById('demoDayNum').textContent = day;
    var label = document.getElementById('demoDayLabel');
    if (label) label.textContent = day;
  }
  slider.addEventListener('input', render);
  render();
})();
