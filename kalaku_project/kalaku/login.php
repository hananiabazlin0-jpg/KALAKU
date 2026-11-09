<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';

if (is_logged_in()) {
    redirect('dashboard.php');
}

$error = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $error = 'Halaman sudah kedaluwarsa. Muat ulang lalu coba lagi.';
    } else {
        $email = strtolower(trim((string)($_POST['email'] ?? '')));
        $password = (string)($_POST['password'] ?? '');
        $now = time();
        $fails = array_values(array_filter((array)($_SESSION['login_fails'] ?? []), function ($t) use ($now) {
            return is_int($t) && $t > $now - 300;
        }));

        if (count($fails) >= 5) {
            $error = 'Terlalu banyak percobaan masuk. Tunggu beberapa menit lalu coba lagi.';
        } elseif ($email === '' || $password === '') {
            $error = 'Isi email dan kata sandi.';
        } else {
            $st = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ? LIMIT 1');
            $st->execute([$email]);
            $row = $st->fetch();
            if ($row && password_verify($password, (string)$row['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['user_id'] = (int)$row['id'];
                $_SESSION['login_fails'] = [];
                if (password_needs_rehash((string)$row['password_hash'], PASSWORD_DEFAULT)) {
                    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), (int)$row['id']]);
                }
                redirect('dashboard.php');
            }
            $fails[] = $now;
            $_SESSION['login_fails'] = $fails;
            $error = 'Email atau kata sandi salah.';
        }
    }
}

$pageTitle = 'Masuk';
$shell = false;
$bodyClass = 'page-auth';
require __DIR__ . '/includes/header.php';
?>
<div class="auth">
    <aside class="auth-art" aria-hidden="true">
        <a class="brand brand-light" href="index.php"><span class="brand-mark"><?= icon('drop') ?></span><span class="brand-name"><?= e(APP_NAME) ?></span></a>
        <div class="auth-ring" data-ring data-length="28" data-period="5" data-day="12"></div>
        <p class="auth-quote">Siklusmu punya ritme. KALAKU membantu kamu mengenalinya.</p>
    </aside>
    <section class="auth-panel">
        <div class="auth-card">
            <a class="brand brand-dark auth-brand-mobile" href="index.php"><span class="brand-mark"><?= icon('drop') ?></span><span class="brand-name"><?= e(APP_NAME) ?></span></a>
            <h1 class="auth-title">Selamat datang kembali</h1>
            <p class="auth-sub">Masuk untuk melihat kalender dan pengingatmu.</p>

            <?php if ($error !== ''): ?>
                <div class="alert alert-error" role="alert"><?= icon('alert') ?><span><?= e($error) ?></span></div>
            <?php endif; ?>

            <form method="post" action="login.php" class="form" id="loginForm" novalidate>
                <?= csrf_field() ?>
                <div class="field">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" value="<?= e($email) ?>" autocomplete="email" placeholder="nama@email.com" required autofocus>
                </div>
                <div class="field">
                    <label for="password">Kata sandi</label>
                    <div class="input-group">
                        <input type="password" id="password" name="password" autocomplete="current-password" placeholder="Kata sandimu" required>
                        <button type="button" class="input-addon" data-toggle-password="password" aria-label="Tampilkan kata sandi"><?= icon('eye') ?></button>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary btn-block" data-loading-text="Masuk…">Masuk</button>
            </form>
            <p class="auth-switch">Belum punya akun? <a href="register.php">Daftar gratis</a></p>
        </div>
    </section>
</div>
<?php
$needCycle = true;
$pageScripts = ['auth.js'];
require __DIR__ . '/includes/footer.php';
