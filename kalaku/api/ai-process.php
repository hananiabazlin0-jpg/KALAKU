<?php
declare(strict_types=1);
define('KALAKU_API', true);
require __DIR__ . '/../includes/bootstrap.php';
$in = api_boot();
$uid = user_id();

/* Bila ada error PHP/database, kirim alasan aslinya supaya mudah dilacak (tampil di notifikasi chat). */
set_exception_handler(function (Throwable $e) {
    error_log('KALA AI: ' . $e->getMessage());
    json_out(['ok' => false, 'fallback' => true, 'code' => 'server', 'detail' => str_cut($e->getMessage(), 200), 'message' => 'Terjadi kesalahan di server.']);
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['ok' => false, 'message' => 'Metode tidak diizinkan.'], 405);
}

/* Batas kecepatan sederhana: maks 12 pesan per menit per sesi. */
$now = time();
$hits = array_filter((array)($_SESSION['ai_hits'] ?? []), function ($t) use ($now) {
    return is_int($t) && $t > $now - 60;
});
if (count($hits) >= 12) {
    json_out(['ok' => false, 'message' => 'Terlalu cepat. Tunggu sebentar lalu kirim lagi.'], 429);
}
$hits[] = $now;
$_SESSION['ai_hits'] = array_values($hits);

$message = trim((string)($in['message'] ?? ''));
if ($message === '') {
    json_out(['ok' => false, 'message' => 'Pertanyaan masih kosong.'], 400);
}
if (str_len($message) > 2000) {
    json_out(['ok' => false, 'message' => 'Pertanyaan terlalu panjang (maksimal 2000 karakter).'], 400);
}

function kala_clean_ctx($ctx): array
{
    $out = [];
    if (!is_array($ctx)) {
        return $out;
    }
    if (!empty($ctx['hasData'])) {
        $out['sudah_ada_data_haid'] = true;
        if (isset($ctx['day']) && is_numeric($ctx['day'])) {
            $out['hari_siklus_saat_ini'] = (int)$ctx['day'];
        }
        if (isset($ctx['phaseLabel']) && is_string($ctx['phaseLabel'])) {
            $out['fase_saat_ini'] = str_cut($ctx['phaseLabel'], 40);
        }
        if (isset($ctx['length']) && is_numeric($ctx['length'])) {
            $out['panjang_siklus_hari'] = max(21, min(45, (int)$ctx['length']));
        }
        if (isset($ctx['nextStart']) && is_string($ctx['nextStart']) && valid_date($ctx['nextStart'])) {
            $out['perkiraan_haid_berikutnya'] = $ctx['nextStart'];
        }
        if (isset($ctx['overdueDays']) && is_numeric($ctx['overdueDays']) && (int)$ctx['overdueDays'] > 0) {
            $out['perkiraan_haid_terlewat_hari'] = (int)$ctx['overdueDays'];
        }
    }
    return $out;
}

$user = current_user($pdo);
require __DIR__ . '/../includes/gemini.php';
$cfg = require __DIR__ . '/../config/ai.php';

if ($cfg['api_key'] === '') {
    json_out(['ok' => false, 'fallback' => true, 'code' => 'no_key', 'message' => 'API key belum diisi.']);
}

$context = [];
if ((int)$user['privacy_mode'] !== 1) {
    $context = kala_clean_ctx($in['context'] ?? null);
    $context['nama_panggilan'] = (string)explode(' ', trim((string)$user['name']))[0];
}

$system = "Kamu adalah KALA AI, pendamping edukasi kesehatan perempuan di aplikasi KALAKU (pencatat siklus menstruasi). "
    . "Jawab dalam bahasa Indonesia yang hangat, natural, dan ringkas namun informatif (umumnya 80-220 kata). "
    . "Gunakan **tebal** untuk poin penting dan daftar dengan tanda '- ' bila membantu. "
    . "Data siklus dan fase hanyalah ESTIMASI kalender; jangan mengklaim diagnosis atau kepastian medis. "
    . "Untuk gejala berat (perdarahan sangat deras, pingsan, sesak, nyeri hebat, demam tinggi, dugaan hamil dengan nyeri/perdarahan) arahkan segera ke tenaga kesehatan atau IGD. "
    . "Untuk obat atau dosis, jangan memberi instruksi pribadi; sarankan bertanya ke dokter atau apoteker. "
    . "Untuk pertanyaan ibadah saat haid, jelaskan secara umum dan netral, tegaskan itu bukan fatwa, dan arahkan ke ustaz/ustazah atau ulama tepercaya untuk kasus khusus. "
    . "Hanya bahas topik yang berkaitan dengan siklus, kesehatan reproduksi, dan kesejahteraan perempuan; tolak topik lain dengan sopan. "
    . "Jangan menyebut data pengguna yang tidak relevan dengan pertanyaan.";
if ($context) {
    $system .= "\n\nKONTEKS PENGGUNA (gunakan hanya bila relevan):\n" . json_encode($context, JSON_UNESCAPED_UNICODE);
}

$hs = $pdo->prepare('SELECT role, content FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT 12');
$hs->execute([$uid]);
$history = array_reverse($hs->fetchAll());
while ($history && $history[0]['role'] !== 'user') {
    array_shift($history);
}
$contents = [];
$push = function (string $role, string $text) use (&$contents) {
    $n = count($contents);
    if ($n > 0 && $contents[$n - 1]['role'] === $role) {
        $contents[$n - 1]['parts'][0]['text'] .= "\n\n" . $text; /* Gemini minta giliran user/model bergantian */
        return;
    }
    $contents[] = ['role' => $role, 'parts' => [['text' => $text]]];
};
foreach ($history as $h) {
    $push($h['role'] === 'model' ? 'model' : 'user', (string)$h['content']);
}
$push('user', $message);

$payload = json_encode([
    'systemInstruction' => ['parts' => [['text' => $system]]],
    'contents'          => $contents,
    'generationConfig'  => ['maxOutputTokens' => 4096, 'temperature' => 0.7],
], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

[$answer, $code, $detail] = kala_gemini_generate($cfg, (string)$payload);

if ($answer === '') {
    json_out(['ok' => false, 'fallback' => true, 'code' => $code, 'detail' => $detail, 'hint' => kala_hint($code, $detail, (string)$cfg['key_type']), 'message' => 'KALA AI online sedang tidak tersedia.']);
}

$ins = $pdo->prepare('INSERT INTO ai_messages (user_id, role, content) VALUES (?, ?, ?)');
$ins->execute([$uid, 'user', $message]);
$ins->execute([$uid, 'model', $answer]);

$pdo->prepare('DELETE FROM ai_messages WHERE user_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT 40) AS keep_rows)')->execute([$uid, $uid]);

json_out(['ok' => true, 'source' => 'gemini', 'message' => $answer]);
