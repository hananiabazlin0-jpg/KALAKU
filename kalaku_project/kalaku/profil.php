<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';
require_login();

$user = current_user($pdo);
$pageTitle = 'Profil';
$shell = true;
$activeNav = 'profil';
require __DIR__ . '/includes/header.php';
?>
<div class="two-col">
    <section class="card profile-summary">
        <div class="avatar avatar-xl" id="profAvatar"><?= e(user_initials((string)$user['name'])) ?></div>
        <h2 class="prof-name" id="profName"><?= e($user['name']) ?></h2>
        <p class="prof-email" id="profEmail"><?= e($user['email']) ?></p>
        <p class="prof-since">Bergabung sejak <?= e(tanggal_panjang(substr((string)$user['created_at'], 0, 10))) ?></p>
        <dl class="stat-list" id="profStats">
            <div><dt>Haid tercatat</dt><dd id="statCount">—</dd></div>
            <div><dt>Rata-rata siklus</dt><dd id="statCycle">—</dd></div>
            <div><dt>Rata-rata lama haid</dt><dd id="statPeriod">—</dd></div>
        </dl>
    </section>

    <section class="card">
        <div class="card-head"><h3>Data diri</h3></div>
        <form class="form" id="profileForm" novalidate>
            <div class="field">
                <label for="pName">Nama</label>
                <input type="text" id="pName" name="name" value="<?= e($user['name']) ?>" maxlength="100" required>
            </div>
            <div class="field">
                <label for="pEmail">Email</label>
                <input type="email" id="pEmail" name="email" value="<?= e($user['email']) ?>" maxlength="190" required>
            </div>
            <div class="field">
                <label for="pBirth">Tanggal lahir <span class="opt">(opsional)</span></label>
                <input type="date" id="pBirth" name="birth_date" value="<?= e((string)$user['birth_date']) ?>" max="<?= e(today_str()) ?>">
            </div>
            <div class="field-row">
                <div class="field">
                    <label for="pCycle">Panjang siklus awal (hari)</label>
                    <input type="number" id="pCycle" name="cycle_length" min="21" max="45" value="<?= (int)$user['cycle_length'] ?>" required>
                    <p class="field-hint">Dipakai sampai ada cukup riwayat.</p>
                </div>
                <div class="field">
                    <label for="pPeriod">Lama haid (hari)</label>
                    <input type="number" id="pPeriod" name="period_length" min="2" max="10" value="<?= (int)$user['period_length'] ?>" required>
                    <p class="field-hint">Rata-rata biasanya 3–7 hari.</p>
                </div>
            </div>
            <div class="form-actions"><button type="submit" class="btn btn-primary" data-loading-text="Menyimpan…">Simpan perubahan</button></div>
        </form>
    </section>
</div>
<?php
$needCycle = true;
$pageScripts = ['profil.js'];
require __DIR__ . '/includes/footer.php';
