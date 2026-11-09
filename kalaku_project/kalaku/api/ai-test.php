<?php
declare(strict_types=1);
/* Tes koneksi KALA AI (hanya untuk pengguna yang sudah login). */
define('KALAKU_API', true);
require __DIR__ . '/../includes/bootstrap.php';
api_boot();
require __DIR__ . '/../includes/gemini.php';

$cfg = require __DIR__ . '/../config/ai.php';
$payload = json_encode([
    'contents'         => [['role' => 'user', 'parts' => [['text' => 'Balas dengan satu kata saja: siap']]]],
    'generationConfig' => ['maxOutputTokens' => 1024, 'temperature' => 0],
], JSON_UNESCAPED_UNICODE);

[$answer, $code, $detail, $used] = kala_gemini_generate($cfg, (string)$payload);

json_out([
    'ok'      => $code === 'ok',
    'code'    => $code,
    'detail'  => $detail,
    'used'    => $used,
    'answer'  => $answer,
    'key'     => $cfg['api_key'] === '' ? '(kosong)' : substr($cfg['api_key'], 0, 3) . '…' . substr($cfg['api_key'], -3),
    'curl'    => function_exists('curl_init'),
    'hint'    => kala_hint($code, $detail, (string)$cfg['key_type']),
    'message' => $code === 'ok' ? 'KALA AI terhubung ke Gemini.' : 'Belum terhubung. ' . kala_hint($code, $detail, (string)$cfg['key_type']),
]);
