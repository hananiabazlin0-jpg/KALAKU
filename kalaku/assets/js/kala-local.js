/* KALA AI — mesin jawaban cadangan (offline).
 * Dipakai otomatis bila Gemini API belum dikonfigurasi atau sedang tidak bisa dihubungi,
 * sehingga fitur chat tetap berfungsi. Jawaban bersifat informasi umum, bukan diagnosis. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KalaLocal = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DISCLAIMER = '\n\n_Informasi umum, bukan diagnosis. Kalau keluhan terasa berat atau mengkhawatirkan, periksakan ke tenaga kesehatan._';

  function has(t, re) { return re.test(t); }

  function ctxLine(c) {
    if (!c || !c.hasData) return '';
    if (c.status === 'awaiting') {
      return 'Menurut catatanmu, perkiraan haid berikutnya sudah lewat ' + c.overdueDays + ' hari dan menunggu konfirmasi. ';
    }
    if (c.phaseLabel && c.day) {
      return 'Saat ini kamu ada di hari ke-' + c.day + ' siklus (fase ' + c.phaseLabel.toLowerCase() + '). ';
    }
    return '';
  }

  var RULES = [
    {
      name: 'darurat',
      re: /(pingsan|sesak|darah.*(deras|tidak berhenti|tak berhenti|gumpalan besar)|banjir|ganti pembalut.*(jam|sejam)|pembalut penuh|nyeri (hebat|parah|tak tertahan)|demam tinggi|hamil.*(nyeri|darah)|tidak sadar)/,
      fn: function () {
        return '**Ini perlu perhatian medis segera.** Gejala seperti perdarahan sangat deras (pembalut penuh dalam 1–2 jam), pingsan, sesak, demam tinggi, atau nyeri yang tidak tertahankan sebaiknya diperiksa langsung.\n\n- Datang ke IGD atau fasilitas kesehatan terdekat\n- Jangan menunggu sendirian, minta tolong orang terdekat\n- Bawa catatan tanggal haid terakhirmu';
      }
    },
    {
      name: 'nyeri',
      re: /(nyeri|kram|sakit perut|dismenore|perut (melilit|sakit)|pegal)/,
      fn: function () {
        return '**Kram saat haid** umumnya terjadi karena rahim berkontraksi. Beberapa hal yang sering membantu:\n\n- Kompres hangat di perut bawah atau punggung selama 15–20 menit\n- Minum air hangat dan cukup istirahat\n- Peregangan ringan atau jalan santai\n- Kurangi kafein dan makanan terlalu asin saat nyeri\n\nPeriksakan ke dokter bila nyeri mengganggu aktivitas harian, makin parah dari bulan ke bulan, atau tidak membaik. Untuk obat pereda nyeri, tanyakan dosis yang tepat ke apoteker atau dokter.';
      }
    },
    {
      name: 'telat',
      re: /(telat|terlambat|belum (haid|datang bulan|menstruasi)|tidak haid|haid.*(belum|tidak) (datang|muncul)|lewat.*(jadwal|tanggal))/,
      fn: function (c) {
        return ctxLine(c) + 'Haid bisa terlambat karena banyak hal: stres, perubahan berat badan, kurang tidur, olahraga berlebihan, perjalanan jauh, gangguan hormon (misalnya PCOS), atau kehamilan.\n\n- Kalau ada kemungkinan hamil, tes kehamilan paling akurat dilakukan setelah haid terlambat sekitar 1 minggu\n- Catat tanggal pastinya di Kalender KALAKU begitu haid datang\n- Terlambat lebih dari 3 bulan berturut-turut sebaiknya diperiksakan ke dokter kandungan' + DISCLAIMER;
      }
    },
    {
      name: 'ovulasi',
      re: /(ovulasi|masa subur|subur|fertil)/,
      fn: function (c) {
        var extra = '';
        if (c && c.hasData && c.ovulationDate) {
          extra = '\n\nBerdasarkan catatanmu, perkiraan ovulasi jatuh pada **' + c.ovulationDateLabel + '** dan masa subur sekitar **' + c.fertileRangeLabel + '**. Ini estimasi kalender, ya.';
        }
        return '**Ovulasi** adalah pelepasan sel telur, biasanya sekitar 14 hari sebelum haid berikutnya. Masa subur umumnya mencakup sekitar 5 hari sebelum ovulasi sampai 1 hari sesudahnya.\n\nTanda yang sering muncul: lendir serviks bening dan elastis seperti putih telur, nyeri ringan satu sisi perut, atau libido meningkat. Perhitungan kalender hanya perkiraan, karena ovulasi bisa bergeser tiap bulan.' + extra;
      }
    },
    {
      name: 'pms',
      re: /(pms|pra.?haid|sebelum haid|mood|suasana hati|emosi|baper|mudah marah|sensitif|cemas|sedih)/,
      fn: function (c) {
        return ctxLine(c) + '**PMS** (gejala sebelum haid) biasanya muncul 1–2 minggu sebelum haid karena perubahan hormon. Yang sering terjadi: mudah tersinggung, lelah, payudara nyeri, kembung, dan keinginan makan manis.\n\n- Tidur cukup dan usahakan jam tidur teratur\n- Olahraga ringan seperti jalan kaki atau yoga\n- Kurangi kafein, gula berlebih, dan garam\n- Beri dirimu ruang untuk istirahat, perasaanmu valid\n\nBila perubahan suasana hati sangat berat dan mengganggu hubungan atau pekerjaan, bicarakan dengan tenaga kesehatan.' + DISCLAIMER;
      }
    },
    {
      name: 'ibadah',
      re: /(shalat|sholat|salat|puasa|qadha|qada|mandi (wajib|besar|junub)|suci|ibadah|quran|al-quran|masjid|ramadan|ramadhan|sunnah|thawaf|tawaf|haji|umrah|fikih|fiqih)/,
      fn: function () {
        return 'Secara umum dalam fikih yang banyak dipegang, perempuan yang sedang haid **tidak melaksanakan shalat dan puasa**. Setelah suci:\n\n- **Puasa Ramadan** yang tertinggal diganti (qadha) di hari lain\n- **Shalat** yang tertinggal tidak perlu diqadha\n- Dianjurkan **mandi besar** setelah darah berhenti dan dipastikan suci\n- Dzikir, doa, dan kegiatan baik lainnya tetap bisa dilakukan\n\nTips di KALAKU: buat pengingat **qadha puasa** lewat menu Pengingat agar tidak terlewat.\n\n_Ini penjelasan umum, bukan fatwa. Untuk kasus khusus (misalnya darah tidak teratur), tanyakan kepada ustazah atau ulama tepercaya._';
      }
    },
    {
      name: 'tidakteratur',
      re: /(tidak teratur|nggak teratur|gak teratur|berantakan|maju mundur|siklus (pendek|panjang)|pcos|ireguler)/,
      fn: function (c) {
        var len = c && c.hasData ? 'Siklusmu saat ini diperkirakan **' + c.length + ' hari**. ' : '';
        return len + 'Siklus dianggap normal bila panjangnya sekitar 21–35 hari, dan tiap bulan boleh bergeser beberapa hari. Siklus bisa tidak teratur karena stres, perubahan berat badan, olahraga berat, pola tidur, atau kondisi seperti PCOS dan gangguan tiroid.\n\n- Catat **hari pertama haid** setiap bulan di KALAKU agar rata-rata siklusmu makin akurat\n- Perhatikan pola: kapan telat, kapan lebih cepat\n- Periksakan ke dokter bila siklus sering di bawah 21 atau di atas 35 hari, atau haid hilang lebih dari 3 bulan' + DISCLAIMER;
      }
    },
    {
      name: 'darah',
      re: /(darah|flek|bercak|spotting|gumpalan|lama haid|durasi haid)/,
      fn: function () {
        return 'Beberapa gambaran umum tentang haid:\n\n- Lama haid biasanya **2–7 hari**\n- Warna darah bisa merah terang, merah gelap, atau kecokelatan, terutama di awal dan akhir\n- Gumpalan kecil sesekali biasanya wajar\n- Flek ringan di luar jadwal bisa terjadi saat ovulasi atau perubahan hormon\n\nSegera periksakan bila: pembalut penuh tiap 1–2 jam, gumpalan besar, haid lebih dari 7–10 hari, atau flek berulang setelah berhubungan.' + DISCLAIMER;
      }
    },
    {
      name: 'hamil',
      re: /(hamil|kehamilan|testpack|test pack|tes kehamilan|kontrasepsi|kb |promil)/,
      fn: function () {
        return 'Beberapa hal tentang kehamilan dan siklus:\n\n- Tanda awal bisa berupa haid terlambat, mual, payudara nyeri, dan mudah lelah\n- **Testpack** paling akurat bila dipakai sekitar 1 minggu setelah haid terlambat, dengan urine pagi\n- Hasil negatif tapi haid belum datang? Ulangi tes setelah 3–5 hari\n- Aplikasi kalender **tidak bisa dipakai sebagai alat kontrasepsi**, karena ovulasi bisa bergeser\n\nUntuk program hamil atau pilihan KB, konsultasikan dengan dokter kandungan.' + DISCLAIMER;
      }
    },
    {
      name: 'makan',
      re: /(makan|makanan|minum|diet|olahraga|vitamin|zat besi|herbal|jamu|kunyit|yoga|senam|tidur)/,
      fn: function (c) {
        return ctxLine(c) + 'Beberapa kebiasaan yang umumnya membantu selama siklus:\n\n- **Saat haid:** makanan kaya zat besi (daging tanpa lemak, bayam, kacang-kacangan) plus vitamin C agar penyerapannya baik; minum air hangat\n- **Setelah haid:** olahraga sedang biasanya terasa nyaman\n- **Menjelang haid:** kurangi garam dan kafein bila perut terasa kembung\n- **Sepanjang bulan:** tidur 7–8 jam, cukup air putih, dan aktif bergerak\n\nBila ingin memakai suplemen atau ramuan herbal, konsultasikan dulu ke tenaga kesehatan.' + DISCLAIMER;
      }
    },
    {
      name: 'fase',
      re: /(fase|hari ke|posisi siklus|siklus (ku|saya|aku)|lagi di fase|sedang di fase)/,
      fn: function (c) {
        if (!c || !c.hasData) return 'Aku belum punya catatan haid darimu. Buka menu **Kalender**, lalu catat hari pertama haid terakhirmu. Setelah itu aku bisa memberi tahu fase dan perkiraan siklusmu.';
        if (c.status === 'awaiting') return ctxLine(c) + 'Begitu haid benar-benar datang, catat **hari pertamanya** di Kalender supaya siklus baru terhitung dengan tepat.';
        var tip = (c.focus && c.focus[0]) ? '\n\nFokus untuk fase ini: ' + c.focus[0] : '';
        return ctxLine(c) + 'Perkiraan haid berikutnya **' + c.nextStartLabel + '** (' + c.daysUntil + ' hari lagi).' + tip + DISCLAIMER;
      }
    },
    {
      name: 'prediksi',
      re: /(kapan.*(haid|mens|datang bulan)|haid (berikutnya|selanjutnya|lagi)|prediksi|perkiraan)/,
      fn: function (c) {
        if (!c || !c.hasData) return 'Aku belum bisa memperkirakan karena belum ada catatan haid. Catat **hari pertama haid** terakhirmu di menu Kalender, lalu tanyakan lagi.';
        if (c.status === 'awaiting') return ctxLine(c) + 'Karena perkiraannya sudah lewat, KALAKU tidak menebak tanggal baru. Catat tanggal pertama haid begitu datang, ya.';
        return 'Perkiraan haid berikutnya jatuh pada **' + c.nextStartLabel + '**, sekitar **' + c.daysUntil + ' hari lagi**. Perhitungan memakai siklus rata-rata **' + c.length + ' hari**. Ini estimasi, bisa maju atau mundur beberapa hari.' + DISCLAIMER;
      }
    },
    {
      name: 'salam',
      re: /^(hai|halo|hello|hi|hey|assalamu|assalamualaikum|selamat (pagi|siang|sore|malam)|permisi)\b/,
      fn: function (c) {
        var n = c && c.name ? ' ' + c.name : '';
        return 'Halo' + n + '! Aku KALA AI, teman ngobrol soal siklus dan kesehatan perempuan. Kamu bisa tanya tentang nyeri haid, PMS, masa subur, haid tidak teratur, atau ibadah saat haid. Mau mulai dari mana?';
      }
    },
    {
      name: 'terimakasih',
      re: /(terima ?kasih|makasih|thanks|thank you|trims)/,
      fn: function () { return 'Sama-sama! Jaga dirimu baik-baik, ya. Kalau ada pertanyaan lain, aku di sini.'; }
    }
  ];

  function reply(text, ctx) {
    var t = String(text || '').toLowerCase().trim();
    if (!t) return 'Tulis pertanyaanmu dulu, ya.';
    for (var i = 0; i < RULES.length; i++) {
      if (has(t, RULES[i].re)) return RULES[i].fn(ctx || {});
    }
    return 'Aku bisa membantu soal siklus dan kesehatan perempuan. Coba tanyakan, misalnya:\n\n- "Kenapa perutku kram saat haid?"\n- "Kapan masa suburku?"\n- "Bagaimana cara mengqadha puasa?"\n- "Kenapa haidku telat?"\n\nSemakin spesifik pertanyaannya, semakin tepat jawabanku.';
  }

  return { reply: reply };
});
