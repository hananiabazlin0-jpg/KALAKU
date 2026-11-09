<?php
declare(strict_types=1);
define('KALAKU_API', true);
require __DIR__ . '/../includes/bootstrap.php';
$in = api_boot();
$uid = user_id();

const REM_CATEGORIES = ['siklus', 'ibadah', 'kesehatan', 'lainnya'];

function rem_row(array $r): array
{
    return [
        'id'       => (int)$r['id'],
        'title'    => (string)$r['title'],
        'date'     => (string)$r['reminder_date'],
        'time'     => $r['reminder_time'] !== null ? substr((string)$r['reminder_time'], 0, 5) : null,
        'category' => (string)$r['category'],
        'done'     => (int)$r['is_done'] === 1,
    ];
}

function rem_all(PDO $pdo, int $uid): array
{
    $st = $pdo->prepare('SELECT id, title, reminder_date, reminder_time, category, is_done FROM reminders WHERE user_id = ? ORDER BY reminder_date ASC, (reminder_time IS NULL) ASC, reminder_time ASC, id ASC LIMIT 1000');
    $st->execute([$uid]);
    return array_map('rem_row', $st->fetchAll());
}

function rem_reply(PDO $pdo, int $uid, string $message): void
{
    json_out(['ok' => true, 'message' => $message, 'reminders' => rem_all($pdo, $uid)]);
}

function rem_fail(string $message, int $status = 422): void
{
    json_out(['ok' => false, 'message' => $message], $status);
}

/* Validasi input tambah/ubah. Mengembalikan [title, date, time|null, category]. */
function rem_input(array $in): array
{
    $title = trim((string)($in['title'] ?? ''));
    if ($title === '') {
        rem_fail('Judul pengingat wajib diisi.');
    }
    if (str_len($title) > 150) {
        rem_fail('Judul maksimal 150 karakter.');
    }
    $date = (string)($in['date'] ?? '');
    if (!valid_date($date)) {
        rem_fail('Tanggal pengingat tidak valid.');
    }
    $time = null;
    if (isset($in['time']) && $in['time'] !== '' && $in['time'] !== null) {
        if (!valid_time((string)$in['time'])) {
            rem_fail('Jam pengingat tidak valid.');
        }
        $time = substr((string)$in['time'], 0, 5) . ':00';
    }
    $cat = (string)($in['category'] ?? 'siklus');
    if (!in_array($cat, REM_CATEGORIES, true)) {
        $cat = 'lainnya';
    }
    return [$title, $date, $time, $cat];
}

$action = (string)($in['action'] ?? 'list');

try {
    if ($action === 'list') {
        json_out(['ok' => true, 'reminders' => rem_all($pdo, $uid)]);
    }

    if ($action === 'due') {
        $date = (string)($in['date'] ?? '');
        $time = (string)($in['time'] ?? '');
        if (!valid_date($date)) {
            $date = today_str();
        }
        if (!valid_time($time)) {
            $time = date('H:i');
        }
        $time = substr($time, 0, 5) . ':59';
        $st = $pdo->prepare("SELECT id, title, reminder_date, reminder_time, category, is_done FROM reminders WHERE user_id = ? AND is_done = 0 AND reminder_date = ? AND COALESCE(reminder_time, '08:00:00') <= ? ORDER BY reminder_time ASC LIMIT 20");
        $st->execute([$uid, $date, $time]);
        $due = array_map('rem_row', $st->fetchAll());
        $cnt = $pdo->prepare('SELECT COUNT(*) FROM reminders WHERE user_id = ? AND is_done = 0 AND reminder_date <= ?');
        $cnt->execute([$uid, $date]);
        json_out(['ok' => true, 'due' => $due, 'pending' => (int)$cnt->fetchColumn()]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        rem_fail('Metode tidak diizinkan.', 405);
    }

    if ($action === 'add') {
        [$title, $date, $time, $cat] = rem_input($in);
        $c = $pdo->prepare('SELECT COUNT(*) FROM reminders WHERE user_id = ?');
        $c->execute([$uid]);
        if ((int)$c->fetchColumn() >= 1000) {
            rem_fail('Jumlah pengingat sudah mencapai batas. Hapus yang lama dulu.');
        }
        $st = $pdo->prepare('INSERT INTO reminders (user_id, title, reminder_date, reminder_time, category) VALUES (?, ?, ?, ?, ?)');
        $st->execute([$uid, $title, $date, $time, $cat]);
        rem_reply($pdo, $uid, 'Pengingat ditambahkan.');
    }

    if ($action === 'update') {
        $id = (int)($in['id'] ?? 0);
        [$title, $date, $time, $cat] = rem_input($in);
        $st = $pdo->prepare('UPDATE reminders SET title = ?, reminder_date = ?, reminder_time = ?, category = ? WHERE id = ? AND user_id = ?');
        $st->execute([$title, $date, $time, $cat, $id, $uid]);
        rem_reply($pdo, $uid, 'Pengingat diperbarui.');
    }

    if ($action === 'toggle') {
        $id = (int)($in['id'] ?? 0);
        $done = !empty($in['done']) ? 1 : 0;
        $st = $pdo->prepare('UPDATE reminders SET is_done = ? WHERE id = ? AND user_id = ?');
        $st->execute([$done, $id, $uid]);
        rem_reply($pdo, $uid, $done ? 'Ditandai selesai.' : 'Dikembalikan ke daftar aktif.');
    }

    if ($action === 'delete') {
        $id = (int)($in['id'] ?? 0);
        $st = $pdo->prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?');
        $st->execute([$id, $uid]);
        rem_reply($pdo, $uid, 'Pengingat dihapus.');
    }

    rem_fail('Aksi tidak dikenal.', 400);
} catch (Throwable $e) {
    json_out(['ok' => false, 'message' => 'Terjadi kesalahan di server. Coba lagi sebentar.'], 500);
}
