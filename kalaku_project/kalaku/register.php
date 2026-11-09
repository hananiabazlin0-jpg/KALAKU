<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';

if (is_logged_in()) {
    redirect('dashboard.php');
}

$errors = [];
$old = ['name' => '', 'email' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $errors['form'] = 'Halaman sudah kedaluwarsa. Muat ulang lalu coba lagi.';
    } else {
        $name = trim((string)($_POST['name'] ?? ''));
        $email = strtolower(trim((string)($_POST['email'] ?? '')));
        $password = (string)($_POST['password'] ?? '');
        $confirm = (string)($_POST['confirm'] ?? '');
        $old = ['name' => $name, 'email' => $email];

        if (str_len($name) < 2 || str_len($name) > 100) {
            $errors['name'] = 'Nama harus 2–100 karakter.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
            $errors['email'] = 'Format email tidak valid.';
        }
        if (strlen($password) < 8) {
            $errors['password'] = 'Kata sandi minimal 8 karakter.';
        } elseif (strlen($password) > 72) {
            $errors['password'] = 'Kata sandi maksimal 72 karakter.';
        } elseif (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
            $errors['password'] = 'Kata sandi harus mengandung huruf dan angka.';
        }
        if ($password !== $confirm) {
            $errors['confirm'] = 'Konfirmasi kata sandi tidak sama.';
        }

        if (!$errors) {
            $dup = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
            $dup->execute([$email]);
            if ($dup->fetch()) {
                $errors['email'] = 'Email ini sudah terdaftar. Coba masuk.';
            }
        }

        if (!$errors) {
            $ins = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
            $ins->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int)$pdo->lastInsertId();
            flash('ok', 'Akun berhasil dibuat. Selamat datang di ' . APP_NAME . '!');
            redirect('dashboard.php');
        }
    }
}

$pageTitle = 'Daftar';
$shell = false;
$bodyClass = 'page-auth';
require __DIR__ . '/includes/header.php';
?>
<div class="auth">
    <aside class="auth-art" aria-hidden="true">
        <a class="brand brand-light" href="index.php"><span class="brand-mark"><?= icon('drop') ?></span><span class="brand-name"><?= e(APP_NAME) ?></span></a>
        <div class="auth-ring" data-ring data-length="30" data-period="6" data-day="20"></div>
        <p class="auth-quote">Catat sekali, kenali polanya. Datamu hanya milikmu.</p>
    </aside>
    <section class="auth-panel">
        <div class="auth-card">
            <a class="brand brand-dark auth-brand-mobile" href="index.php"><span class="brand-mark"><?= icon('drop') ?></span><span class="brand-name"><?= e(APP_NAME) ?></span></a>
            <h1 class="auth-title">Buat akun KALAKU</h1>
            <p class="auth-sub">Gratis, dan butuh kurang dari satu menit.</p>

            <?php if (isset($errors['form'])): ?>
                <div class="alert alert-error" role="alert"><?= icon('alert') ?><span><?= e($errors['form']) ?></span></div>
            <?php endif; ?>

            <form method="post" action="register.php" class="form" id="registerForm" novalidate>
                <?= csrf_field() ?>
                <div class="field<?= isset($errors['name']) ? ' has-error' : '' ?>">
                    <label for="name">Nama</label>
                    <input type="text" id="name" name="name" value="<?= e($old['name']) ?>" autocomplete="name" placeholder="Nama panggilanmu" maxlength="100" required autofocus>
                    <p class="field-error"><?= isset($errors['name']) ? e($errors['name']) : '' ?></p>
                </div>
                <div class="field<?= isset($errors['email']) ? ' has-error' : '' ?>">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" value="<?= e($old['email']) ?>" autocomplete="email" placeholder="nama@email.com" maxlength="190" required>
                    <p class="field-error"><?= isset($errors['email']) ? e($errors['email']) : '' ?></p>
                </div>
                <div class="field<?= isset($errors['password']) ? ' has-error' : '' ?>">
                    <label for="password">Kata sandi</label>
                    <div class="input-group">
                        <input type="password" id="password" name="password" autocomplete="new-password" placeholder="Minimal 8 karakter, huruf dan angka" maxlength="72" required>
                        <button type="button" class="input-addon" data-toggle-password="password" aria-label="Tampilkan kata sandi"><?= icon('eye') ?></button>
                    </div>
                    <div class="strength" id="strength" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
                    <p class="field-hint" id="strengthText">Gunakan kombinasi huruf, angka, dan simbol.</p>
                    <p class="field-error"><?= isset($errors['password']) ? e($errors['password']) : '' ?></p>
                </div>
                <div class="field<?= isset($errors['confirm']) ? ' has-error' : '' ?>">
                    <label for="confirm">Ulangi kata sandi</label>
                    <input type="password" id="confirm" name="confirm" autocomplete="new-password" placeholder="Ketik ulang kata sandi" maxlength="72" required>
                    <p class="field-error"><?= isset($errors['confirm']) ? e($errors['confirm']) : '' ?></p>
                </div>
                <button type="submit" class="btn btn-primary btn-block" data-loading-text="Membuat akun…">Buat akun</button>
                <p class="field-hint center">KALAKU memberi estimasi, bukan diagnosis medis.</p>
            </form>
            <p class="auth-switch">Sudah punya akun? <a href="login.php">Masuk</a></p>
        </div>
    </section>
</div>
<?php
$needCycle = true;
$pageScripts = ['auth.js'];
require __DIR__ . '/includes/footer.php';
