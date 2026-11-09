<?php
declare(strict_types=1);
define('KALAKU_API', true);
require __DIR__ . '/../includes/bootstrap.php';
$in = api_boot();
$uid = user_id();

function cycle_fetch(PDO $pdo, int $uid): array
{
    $st = $pdo->prepare('SELECT id, period_start, period_end, cycle_length, notes FROM cycle_records WHERE user_id = ? ORDER BY period_start ASC, id ASC');
    $st->execute([$uid]);
    $out = [];
    foreach ($st->fetchAll() as $r) {
        $out[] = [
            'id'           => (int)$r['id'],
            'period_start' => (string)$r['period_start'],
            'period_end'   => $r['period_end'] !== null ? (string)$r['period_end'] : null,
            'cycle_length' => $r['cycle_length'] !== null ? (int)$r['cycle_length'] : null,
            'notes'        => (string)($r['notes'] ?? ''),
        ];
    }
    return $out;
}

function cycle_reply(PDO $pdo, int $uid, string $message, int $status = 200): void
{
    $u = current_user($pdo);
    json_out([
        'ok'       => true,
        'message'  => $message,
        'records'  => cycle_fetch($pdo, $uid),
        'defaults' => ['cycle_length' => (int)$u['cycle_length'], 'period_length' => (int)$u['period_length']],
    ], $status);
}

function cycle_fail(string $message, int $status = 422): void
{
    json_out(['ok' => false, 'message' => $message], $status);
}

function cycle_check_end(string $start, $end): ?string
{
    if ($end === null || $end === '') {
        return null;
    }
    if (!valid_date($end)) {
        cycle_fail('Tanggal selesai haid tidak valid.');
    }
    if ($end < $start) {
        cycle_fail('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    }
    if (days_between($start, (string)$end) > 14) {
        cycle_fail('Haid yang berlangsung lebih dari 15 hari sebaiknya diperiksakan ke dokter. Cek lagi tanggal selesainya.');
    }
    if ($end > add_days(today_str(), 1)) {
        cycle_fail('Tanggal selesai belum terjadi. Isi saat haidmu sudah benar-benar selesai.');
    }
    return (string)$end;
}

$action = (string)($in['action'] ?? 'list');

try {
    if ($action === 'list') {
        cycle_reply($pdo, $uid, '');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        cycle_fail('Metode tidak diizinkan.', 405);
    }

    if ($action === 'add') {
        $start = (string)($in['period_start'] ?? '');
        if (!valid_date($start)) {
            cycle_fail('Tanggal mulai haid tidak valid.');
        }
        if ($start > add_days(today_str(), 1)) {
            cycle_fail('Catat hari pertama haid yang sudah terjadi. Tanggal di masa depan tidak bisa disimpan.');
        }
        if ($start < '2000-01-01') {
            cycle_fail('Tanggal terlalu lama.');
        }
        $end = cycle_check_end($start, $in['period_end'] ?? null);

        $len = null;
        if (isset($in['cycle_length']) && $in['cycle_length'] !== '' && $in['cycle_length'] !== null) {
            $len = (int)$in['cycle_length'];
            if ($len < 21 || $len > 45) {
                cycle_fail('Panjang siklus harus antara 21 dan 45 hari.');
            }
        }
        $notes = trim((string)($in['notes'] ?? ''));
        $notes = str_cut($notes, 500);

        $existing = cycle_fetch($pdo, $uid);
        foreach ($existing as $r) {
            $gap = abs(days_between($r['period_start'], $start));
            if ($gap === 0) {
                cycle_fail('Tanggal ' . tanggal_panjang($start) . ' sudah ada di riwayatmu.');
            }
            if ($gap < 10) {
                cycle_fail('Tanggal ini terlalu dekat dengan catatan haid ' . tanggal_panjang($r['period_start']) . '. Yang dicatat hanya hari PERTAMA tiap haid.');
            }
        }
        if (count($existing) >= 240) {
            cycle_fail('Riwayat sudah mencapai batas 240 catatan. Hapus catatan lama terlebih dahulu.');
        }

        $st = $pdo->prepare('INSERT INTO cycle_records (user_id, period_start, period_end, cycle_length, notes) VALUES (?, ?, ?, ?, ?)');
        $st->execute([$uid, $start, $end, $len, $notes !== '' ? $notes : null]);
        cycle_reply($pdo, $uid, 'Haid mulai ' . tanggal_panjang($start) . ' tersimpan.');
    }

    if ($action === 'update') {
        $id = (int)($in['id'] ?? 0);
        $st = $pdo->prepare('SELECT * FROM cycle_records WHERE id = ? AND user_id = ? LIMIT 1');
        $st->execute([$id, $uid]);
        $rec = $st->fetch();
        if (!$rec) {
            cycle_fail('Catatan tidak ditemukan.', 404);
        }
        $end = cycle_check_end((string)$rec['period_start'], $in['period_end'] ?? null);
        $notes = array_key_exists('notes', $in) ? str_cut(trim((string)$in['notes']), 500) : (string)($rec['notes'] ?? '');
        $up = $pdo->prepare('UPDATE cycle_records SET period_end = ?, notes = ? WHERE id = ? AND user_id = ?');
        $up->execute([$end, $notes !== '' ? $notes : null, $id, $uid]);
        cycle_reply($pdo, $uid, $end === null ? 'Tanggal selesai dihapus.' : 'Haid selesai ' . tanggal_panjang($end) . ' tersimpan.');
    }

    if ($action === 'delete') {
        $id = (int)($in['id'] ?? 0);
        $st = $pdo->prepare('DELETE FROM cycle_records WHERE id = ? AND user_id = ?');
        $st->execute([$id, $uid]);
        if ($st->rowCount() < 1) {
            cycle_fail('Catatan tidak ditemukan.', 404);
        }
        cycle_reply($pdo, $uid, 'Catatan dihapus.');
    }

    cycle_fail('Aksi tidak dikenal.', 400);
} catch (Throwable $e) {
    json_out(['ok' => false, 'message' => 'Terjadi kesalahan di server. Coba lagi sebentar.'], 500);
}
