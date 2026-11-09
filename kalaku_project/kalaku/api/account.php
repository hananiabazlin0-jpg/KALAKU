<?php
declare(strict_types=1);
define('KALAKU_API', true);
require __DIR__ . '/../includes/bootstrap.php';
$in = api_boot();
$uid = user_id();
$action = (string)($in['action'] ?? '');

function acc_fail(string $message, int $status = 422, array $extra = []): void
{
    json_out(array_merge(['ok' => false, 'message' => $message], $extra), $status);
}

function acc_password_problem(string $pw): ?string
{
    if (strlen($pw) < 8) {
        return 'Kata sandi minimal 8 karakter.';
    }
    if (strlen($pw) > 72) {
        return 'Kata sandi maksimal 72 karakter.';
    }
    if (!preg_match('/[A-Za-z]/', $pw) || !preg_match('/\d/', $pw)) {
        return 'Kata sandi harus mengandung huruf dan angka.';
    }
    return null;
}

try {
    $user = current_user($pdo);

    if ($action === 'export' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $c = $pdo->prepare('SELECT period_start, period_end, cycle_length, notes FROM cycle_records WHERE user_id = ? ORDER BY period_start ASC');
        $c->execute([$uid]);
        $r = $pdo->prepare('SELECT title, reminder_date, reminder_time, category, is_done FROM reminders WHERE user_id = ? ORDER BY reminder_date ASC');
        $r->execute([$uid]);
        $data = [
            'aplikasi'     => APP_NAME,
            'diekspor_pada' => date('c'),
            'profil'       => [
                'nama'          => $user['name'],
                'email'         => $user['email'],
                'tanggal_lahir' => $user['birth_date'],
                'panjang_siklus_default' => (int)$user['cycle_length'],
                'lama_haid_default'      => (int)$user['period_length'],
            ],
            'riwayat_haid' => $c->fetchAll(),
            'pengingat'    => $r->fetchAll(),
        ];
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="kalaku-data-' . date('Ymd') . '.json"');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        acc_fail('Metode tidak diizinkan.', 405);
    }

    if ($action === 'update_profile') {
        $name = trim((string)($in['name'] ?? ''));
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $birth = trim((string)($in['birth_date'] ?? ''));
        $cycle = (int)($in['cycle_length'] ?? 28);
        $period = (int)($in['period_length'] ?? 5);

        if (str_len($name) < 2 || str_len($name) > 100) {
            acc_fail('Nama harus 2–100 karakter.');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
            acc_fail('Format email tidak valid.');
        }
        if ($birth !== '') {
            if (!valid_date($birth) || $birth > today_str() || $birth < '1920-01-01') {
                acc_fail('Tanggal lahir tidak valid.');
            }
        }
        if ($cycle < 21 || $cycle > 45) {
            acc_fail('Panjang siklus harus antara 21 dan 45 hari.');
        }
        if ($period < 2 || $period > 10) {
            acc_fail('Lama haid harus antara 2 dan 10 hari.');
        }
        $dup = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
        $dup->execute([$email, $uid]);
        if ($dup->fetch()) {
            acc_fail('Email sudah dipakai akun lain.');
        }
        $st = $pdo->prepare('UPDATE users SET name = ?, email = ?, birth_date = ?, cycle_length = ?, period_length = ? WHERE id = ?');
        $st->execute([$name, $email, $birth !== '' ? $birth : null, $cycle, $period, $uid]);
        json_out(['ok' => true, 'message' => 'Profil disimpan.', 'user' => ['name' => $name, 'email' => $email, 'initials' => user_initials($name), 'cycle' => $cycle, 'period' => $period]]);
    }

    if ($action === 'change_password') {
        $cur = (string)($in['current'] ?? '');
        $new = (string)($in['new'] ?? '');
        $conf = (string)($in['confirm'] ?? '');
        if (!password_verify($cur, (string)$user['password_hash'])) {
            acc_fail('Kata sandi saat ini salah.');
        }
        $problem = acc_password_problem($new);
        if ($problem !== null) {
            acc_fail($problem);
        }
        if ($new !== $conf) {
            acc_fail('Konfirmasi kata sandi tidak sama.');
        }
        if (hash_equals($cur, $new)) {
            acc_fail('Kata sandi baru harus berbeda dari yang lama.');
        }
        $st = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $st->execute([password_hash($new, PASSWORD_DEFAULT), $uid]);
        session_regenerate_id(true);
        json_out(['ok' => true, 'message' => 'Kata sandi berhasil diganti.']);
    }

    if ($action === 'update_prefs') {
        $sets = [];
        $vals = [];
        if (array_key_exists('notification_enabled', $in)) {
            $sets[] = 'notification_enabled = ?';
            $vals[] = !empty($in['notification_enabled']) ? 1 : 0;
        }
        if (array_key_exists('privacy_mode', $in)) {
            $sets[] = 'privacy_mode = ?';
            $vals[] = !empty($in['privacy_mode']) ? 1 : 0;
        }
        if (!$sets) {
            acc_fail('Tidak ada yang diubah.', 400);
        }
        $vals[] = $uid;
        $st = $pdo->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $st->execute($vals);
        json_out(['ok' => true, 'message' => 'Pengaturan disimpan.']);
    }

    if ($action === 'delete_account') {
        $pw = (string)($in['password'] ?? '');
        $confirm = trim((string)($in['confirm_text'] ?? ''));
        if (strtoupper($confirm) !== 'HAPUS') {
            acc_fail('Ketik HAPUS untuk mengonfirmasi.');
        }
        if (!password_verify($pw, (string)$user['password_hash'])) {
            acc_fail('Kata sandi salah.');
        }
        $st = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $st->execute([$uid]);
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'], (bool)$p['secure'], (bool)$p['httponly']);
        }
        session_destroy();
        json_out(['ok' => true, 'message' => 'Akun dihapus.', 'redirect' => 'index.php']);
    }

    acc_fail('Aksi tidak dikenal.', 400);
} catch (Throwable $e) {
    json_out(['ok' => false, 'message' => 'Terjadi kesalahan di server. Coba lagi sebentar.'], 500);
}
