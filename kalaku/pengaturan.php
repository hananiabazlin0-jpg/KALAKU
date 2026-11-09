<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';
require_login();

$user = current_user($pdo);
$pageTitle = 'Pengaturan';
$shell = true;
$activeNav = 'pengaturan';
require __DIR__ . '/includes/header.php';
?>
<div class="settings">
    <section class="card">
        <div class="card-head"><h3>Notifikasi</h3></div>
        <div class="setting-row">
            <div>
                <strong>Pengingat di browser</strong>
                <p>Tampilkan pemberitahuan saat waktu pengingat tiba. Berfungsi selama KALAKU terbuka di tab browser.</p>
                <p class="field-hint" id="notifPermText"></p>
            </div>
            <label class="switch"><input type="checkbox" id="setNotify" <?= (int)$user['notification_enabled'] === 1 ? 'checked' : '' ?>><span class="switch-ui"></span><span class="sr-only">Aktifkan notifikasi</span></label>
        </div>
        <div class="setting-actions">
            <button type="button" class="btn btn-ghost btn-sm" id="notifAllow"><?= icon('bell') ?><span>Izinkan notifikasi browser</span></button>
            <button type="button" class="btn btn-ghost btn-sm" id="notifTest">Kirim tes</button>
        </div>
    </section>

    <section class="card">
        <div class="card-head"><h3>Privasi</h3></div>
        <div class="setting-row">
            <div>
                <strong>Mode privasi</strong>
                <p>Menyembunyikan fase dan tanggal sensitif di beranda sampai kamu mengetuknya, dan tidak mengirim data siklus ke <?= e(AI_NAME) ?>.</p>
            </div>
            <label class="switch"><input type="checkbox" id="setPrivacy" <?= (int)$user['privacy_mode'] === 1 ? 'checked' : '' ?>><span class="switch-ui"></span><span class="sr-only">Aktifkan mode privasi</span></label>
        </div>
    </section>

    <section class="card">
        <div class="card-head"><h3>Ganti kata sandi</h3></div>
        <form class="form" id="passForm" novalidate>
            <div class="field">
                <label for="pwCur">Kata sandi saat ini</label>
                <div class="input-group"><input type="password" id="pwCur" autocomplete="current-password" required><button type="button" class="input-addon" data-toggle-password="pwCur" aria-label="Tampilkan kata sandi"><?= icon('eye') ?></button></div>
            </div>
            <div class="field">
                <label for="pwNew">Kata sandi baru</label>
                <div class="input-group"><input type="password" id="pwNew" autocomplete="new-password" maxlength="72" required><button type="button" class="input-addon" data-toggle-password="pwNew" aria-label="Tampilkan kata sandi"><?= icon('eye') ?></button></div>
                <div class="strength" id="strength" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
                <p class="field-hint" id="strengthText">Minimal 8 karakter, huruf dan angka.</p>
            </div>
            <div class="field">
                <label for="pwConf">Ulangi kata sandi baru</label>
                <input type="password" id="pwConf" autocomplete="new-password" maxlength="72" required>
            </div>
            <div class="form-actions"><button type="submit" class="btn btn-primary" data-loading-text="Menyimpan…">Ganti kata sandi</button></div>
        </form>
    </section>

    <section class="card">
        <div class="card-head"><h3>Panduan</h3></div>
        <div class="setting-row">
            <div><strong>Panduan penggunaan</strong><p>Putar ulang pengenalan singkat tentang fitur-fitur <?= e(APP_NAME) ?>.</p></div>
            <a class="btn btn-ghost btn-sm" href="dashboard.php?tour=1"><?= icon('info') ?><span>Mulai</span></a>
        </div>
    </section>

    <section class="card">
        <div class="card-head"><h3>Data kamu</h3></div>
        <div class="setting-row">
            <div><strong>Ekspor data</strong><p>Unduh profil, riwayat haid, dan pengingat dalam satu file JSON.</p></div>
            <a class="btn btn-ghost btn-sm" href="api/account.php?action=export" download><?= icon('download') ?><span>Unduh</span></a>
        </div>
        <div class="setting-row">
            <div><strong>Tes koneksi <?= e(AI_NAME) ?></strong><p>Memeriksa apakah API key Gemini sudah terhubung.</p></div>
            <button type="button" class="btn btn-ghost btn-sm" id="aiTest"><?= icon('sparkle') ?><span>Tes</span></button>
        </div>
        <div class="setting-row">
            <div><strong>Hapus riwayat <?= e(AI_NAME) ?></strong><p>Menghapus seluruh percakapan yang tersimpan.</p></div>
            <button type="button" class="btn btn-ghost btn-sm" id="clearChat"><?= icon('trash') ?><span>Hapus</span></button>
        </div>
        <div class="setting-row danger-zone">
            <div><strong>Hapus akun</strong><p>Akun beserta seluruh data siklus dan pengingat dihapus permanen dan tidak bisa dipulihkan.</p></div>
            <button type="button" class="btn btn-danger btn-sm" id="deleteAccount">Hapus akun</button>
        </div>
    </section>
</div>
<?php
$pageScripts = ['pengaturan.js'];
require __DIR__ . '/includes/footer.php';
