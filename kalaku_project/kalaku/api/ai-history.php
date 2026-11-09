<?php
declare(strict_types=1);
define('KALAKU_API', true);
require __DIR__ . '/../includes/bootstrap.php';
$in = api_boot();
$uid = user_id();
$action = (string)($in['action'] ?? 'list');

try {
    if ($action === 'list') {
        $st = $pdo->prepare('SELECT role, content, created_at FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT 40');
        $st->execute([$uid]);
        $rows = array_reverse($st->fetchAll());
        $out = [];
        foreach ($rows as $r) {
            $out[] = ['role' => (string)$r['role'], 'content' => (string)$r['content'], 'at' => (string)$r['created_at']];
        }
        json_out(['ok' => true, 'messages' => $out]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_out(['ok' => false, 'message' => 'Metode tidak diizinkan.'], 405);
    }

    if ($action === 'append') {
        $u = trim((string)($in['user'] ?? ''));
        $m = trim((string)($in['model'] ?? ''));
        if ($u === '' || $m === '' || str_len($u) > 2000 || str_len($m) > 8000) {
            json_out(['ok' => false, 'message' => 'Data percakapan tidak valid.'], 400);
        }
        $ins = $pdo->prepare('INSERT INTO ai_messages (user_id, role, content) VALUES (?, ?, ?)');
        $ins->execute([$uid, 'user', $u]);
        $ins->execute([$uid, 'model', $m]);
        $pdo->prepare('DELETE FROM ai_messages WHERE user_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT 40) AS keep_rows)')->execute([$uid, $uid]);
        json_out(['ok' => true]);
    }

    if ($action === 'clear') {
        $pdo->prepare('DELETE FROM ai_messages WHERE user_id = ?')->execute([$uid]);
        json_out(['ok' => true, 'message' => 'Riwayat percakapan dihapus.']);
    }

    json_out(['ok' => false, 'message' => 'Aksi tidak dikenal.'], 400);
} catch (Throwable $e) {
    json_out(['ok' => false, 'message' => 'Terjadi kesalahan di server. Coba lagi sebentar.'], 500);
}
