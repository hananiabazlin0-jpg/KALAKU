# KALAKU — Kalender Siklus + KALA AI

Website pencatat siklus menstruasi (PHP + MySQL + JavaScript). Fitur: akun, kalender siklus, KALA AI, pengingat (siklus & ibadah), profil, pengaturan.

## Cara menjalankan (XAMPP)
1. Salin folder `kalaku` ke `C:\xampp\htdocs\kalaku`.
2. Buka XAMPP Control Panel, **Start** Apache dan MySQL.
3. Buka `http://localhost/kalaku/`. Database `kalaku` dan semua tabel **dibuat otomatis**; tidak perlu import SQL.
4. Daftar akun, lalu klik **Catat haid**.

Syarat: PHP 8.0+ (ekstensi PDO MySQL, mbstring; cURL disarankan).

## Mengaktifkan KALA AI (Gemini)
1. Buat API key di https://aistudio.google.com/apikey (klik **Create API key**; awalannya `AIza...`).
2. Buka `config/ai.local.php`, tempel key ke `api_key`, simpan. (File ini tidak ikut ke GitHub; jangan dibagikan.)
3. Login ke KALAKU, buka **Pengaturan > Tes koneksi KALA AI**. Harus muncul "KALA AI terhubung ke Gemini".

Endpoint dipilih otomatis dari awalan key:
- `AIza...` = key Google AI Studio -> memakai AI Studio (Vertex AI jadi cadangan).
- `AQ....` = key Vertex AI (Google Cloud) -> memakai Vertex AI. Syaratnya: **Vertex AI API sudah di-Enable** di project Google Cloud key itu (tautan Enable ikut muncul di pesan error). Bila ragu, pakai key `AIza...` saja.

Model default `gemini-3.8-flash`. Bila model ditolak, KALAKU mencoba `gemini-flash-latest` dan `gemini-2.5-flash`, lalu mencari model flash yang masih aktif (khusus AI Studio).
Bila ada masalah, buka `http://localhost/kalaku_project/kalaku/cek-koneksi.php` untuk diagnosis lengkap.
Tanpa kunci atau bila Google tidak bisa dihubungi, KALA AI tetap menjawab memakai mesin bawaan (label "Mode offline").
Bila muncul error sertifikat SSL di XAMPP Windows, KALAKU otomatis mencoba ulang (hanya di localhost).

## Mengubah koneksi database
Salin `config/database.local.example.php` menjadi `config/database.local.php`. Ingin memakai data lama dari proyek sebelumnya? Isi `'name' => 'cyclecare'` (struktur tabel kompatibel).

## Struktur
- `api/` endpoint JSON (cycle, reminders, ai-process, ai-history, account)
- `assets/js/cycle.js` mesin hitung siklus (diuji dengan Node), `kala-local.js` mesin jawaban cadangan
- `includes/` header, sidebar, topbar, footer, helper

## Catatan perhitungan
- Yang dicatat hanya **hari pertama haid** tiap siklus.
- Panjang siklus = rata-rata maksimal 3 interval terakhir (21–45 hari); bila belum ada, memakai input/profil.
- Perkiraan berikutnya selalu dari catatan haid NYATA terakhir. Bila tanggal perkiraan terlewat, KALAKU menampilkan "menunggu konfirmasi", tidak menebak bulan-bulan berikutnya.
- Fase, ovulasi, dan masa subur adalah estimasi edukatif, bukan diagnosis.
