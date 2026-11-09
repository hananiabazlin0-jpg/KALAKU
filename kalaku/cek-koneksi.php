<?php
declare(strict_types=1);
/*
 * Halaman diagnosis koneksi KALA AI. Buka: http://localhost/kalaku_project/kalaku/cek-koneksi.php
 * Hanya bisa dibuka dari komputer sendiri (localhost). Hapus file ini setelah KALA AI berfungsi.
 */
$remote = $_SERVER['REMOTE_ADDR'] ?? '';
if (!in_array($remote, ['127.0.0.1', '::1'], true)) {
    http_response_code(403);
    exit('Hanya untuk localhost.');
}
@set_time_limit(180);
header('Content-Type: text/html; charset=utf-8');

$cfg = require __DIR__ . '/config/ai.php';
$key = $cfg['api_key'];
$mask = $key === '' ? '(KOSONG)' : substr($key, 0, 3) . '…' . substr($key, -3) . ' (' . strlen($key) . ' karakter)';

function row(string $label, string $val, ?bool $ok = null): void
{
    $c = $ok === null ? '#333' : ($ok ? '#0a7a2f' : '#b3261e');
    echo '<tr><td style="padding:4px 12px 4px 0;vertical-align:top"><b>' . htmlspecialchars($label) . '</b></td><td style="color:' . $c . ';white-space:pre-wrap">' . htmlspecialchars($val) . '</td></tr>';
}
function h(string $t): void
{
    echo '<h3 style="margin:22px 0 6px">' . htmlspecialchars($t) . '</h3><table>';
}

function probe(string $url, array $headers, ?string $body, bool $verify): array
{
    $ch = curl_init($url);
    $opt = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_SSL_VERIFYPEER => $verify,
        CURLOPT_SSL_VERIFYHOST => $verify ? 2 : 0,
    ];
    if ($body !== null) {
        $opt[CURLOPT_POST] = true;
        $opt[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $opt);
    $raw = curl_exec($ch);
    $r = [
        'raw'    => $raw === false ? '' : (string)$raw,
        'errno'  => curl_errno($ch),
        'error'  => curl_error($ch),
        'status' => (int)curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'dns'    => round((float)curl_getinfo($ch, CURLINFO_NAMELOOKUP_TIME), 2),
        'tcp'    => round((float)curl_getinfo($ch, CURLINFO_CONNECT_TIME), 2),
        'tls'    => round((float)curl_getinfo($ch, CURLINFO_APPCONNECT_TIME), 2),
        'first'  => round((float)curl_getinfo($ch, CURLINFO_STARTTRANSFER_TIME), 2),
        'total'  => round((float)curl_getinfo($ch, CURLINFO_TOTAL_TIME), 2),
        'ip'     => (string)curl_getinfo($ch, CURLINFO_PRIMARY_IP),
    ];
    curl_close($ch);
    return $r;
}
function show(array $r): string
{
    return 'HTTP ' . $r['status'] . ' | errno ' . $r['errno'] . ($r['error'] ? ' (' . $r['error'] . ')' : '')
        . "\nIP " . $r['ip'] . ' | dns ' . $r['dns'] . 's, tcp ' . $r['tcp'] . 's, tls ' . $r['tls'] . 's, byte-pertama ' . $r['first'] . 's, total ' . $r['total'] . 's'
        . ($r['raw'] !== '' ? "\n" . substr((string)preg_replace('/\s+/', ' ', $r['raw']), 0, 500) : '');
}

echo '<!doctype html><meta charset="utf-8"><title>Cek koneksi KALA AI</title><body style="font:14px/1.5 system-ui,Segoe UI,sans-serif;max-width:900px;margin:24px auto;padding:0 16px">';
echo '<h2>Cek koneksi KALA AI</h2>';

h('1. Lingkungan PHP');
row('PHP', PHP_VERSION);
row('cURL', function_exists('curl_init') ? 'aktif, versi ' . (curl_version()['version'] ?? '?') . ', SSL: ' . (curl_version()['ssl_version'] ?? '?') : 'TIDAK AKTIF (aktifkan extension=curl di php.ini)', function_exists('curl_init'));
row('max_execution_time', (string)ini_get('max_execution_time') . ' detik');
row('curl.cainfo', (string)(ini_get('curl.cainfo') ?: '(kosong)'));
row('API key terbaca', $mask, $key !== '');
row('Model', implode(', ', $cfg['models']));
if (!function_exists('curl_init')) {
    exit('</table><p style="color:#b3261e">Berhenti: cURL tidak aktif.</p>');
}

echo '</table>';
h('2. DNS dan koneksi dasar (IPv4)');
foreach (['generativelanguage.googleapis.com', 'aiplatform.googleapis.com'] as $host) {
    $ip = gethostbyname($host);
    row($host, $ip === $host ? 'DNS GAGAL (tidak bisa menemukan alamat)' : 'DNS -> ' . $ip, $ip !== $host);
    $t = microtime(true);
    $errno = 0; $errstr = '';
    $fp = @fsockopen($ip === $host ? $host : $ip, 443, $errno, $errstr, 8);
    $dt = round(microtime(true) - $t, 2);
    row('  port 443', $fp ? "terhubung dalam {$dt}s" : "GAGAL ({$errno}) {$errstr} setelah {$dt}s", (bool)$fp);
    if ($fp) {
        fclose($fp);
    }
}
echo '</table>';

h('3. HTTPS ke server Google (tanpa API key)');
foreach (['https://generativelanguage.googleapis.com/', 'https://aiplatform.googleapis.com/'] as $u) {
    $r = probe($u, [], null, true);
    $okv = $r['status'] > 0;
    if (!$okv && in_array($r['errno'], [35, 51, 58, 60, 77], true)) {
        $r2 = probe($u, [], null, false);
        row($u . ' (verifikasi SSL)', show($r), false);
        row($u . ' (tanpa verifikasi)', show($r2), $r2['status'] > 0);
    } else {
        row($u, show($r), $okv);
    }
}
echo '</table>';

if ($key === '') {
    exit('<p style="color:#b3261e">API key kosong, tes Gemini dilewati.</p>');
}

$payload = json_encode([
    'contents'         => [['role' => 'user', 'parts' => [['text' => 'Balas satu kata: siap']]]],
    'generationConfig' => ['maxOutputTokens' => 1024, 'temperature' => 0],
]);

h('4. Panggilan Gemini sungguhan');
$model = (string)$cfg['models'][0];
$tests = [
    ['AI Studio, kunci di header', 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent', ['Content-Type: application/json', 'x-goog-api-key: ' . $key]],
    ['AI Studio, kunci di URL', 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode($key), ['Content-Type: application/json']],
    ['Vertex AI, kunci di URL', 'https://aiplatform.googleapis.com/v1/publishers/google/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode($key), ['Content-Type: application/json']],
];
$anyOk = false;
foreach ($tests as [$name, $url, $hdr]) {
    $r = probe($url, $hdr, (string)$payload, true);
    if ($r['status'] === 0 && in_array($r['errno'], [35, 51, 58, 60, 77], true)) {
        $r = probe($url, $hdr, (string)$payload, false);
        $name .= ' [tanpa verifikasi SSL]';
    }
    $good = $r['status'] >= 200 && $r['status'] < 300;
    $anyOk = $anyOk || $good;
    row($name, show($r), $good);
}
echo '</table>';

h('5. Tes permintaan BESAR (seperti permintaan chat sungguhan)');
$bigText = str_repeat('Kamu adalah KALA AI, pendamping edukasi kesehatan perempuan yang hangat dan ringkas. ', 30);
$big = json_encode([
    'systemInstruction' => ['parts' => [['text' => $bigText]]],
    'contents'          => [['role' => 'user', 'parts' => [['text' => 'Balas satu kata: siap']]]],
    'generationConfig'  => ['maxOutputTokens' => 1024, 'temperature' => 0],
]);
row('Ukuran permintaan', strlen((string)$big) . ' byte (permintaan chat biasanya 1.5-3 KB)');
$bigUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';
$variants = [
    ['Besar, TANPA header Expect (cara lama)', ['Content-Type: application/json', 'x-goog-api-key: ' . $key]],
    ['Besar, DENGAN "Expect:" dimatikan (cara baru)', ['Content-Type: application/json', 'Expect:', 'x-goog-api-key: ' . $key]],
];
$bigOk = [];
foreach ($variants as $i => [$name, $hdr]) {
    $r = probe($bigUrl, $hdr, (string)$big, true);
    $good = $r['status'] >= 200 && $r['status'] < 300;
    $bigOk[$i] = $good;
    row($name, show($r), $good);
}
echo '</table>';
echo '<p>';
if ($bigOk[1] ?? false) {
    echo '<b style="color:#0a7a2f">Permintaan besar berhasil dengan cara baru. KALA AI chat seharusnya sudah jalan.</b>';
} elseif (!($bigOk[0] ?? false) && !($bigOk[1] ?? false)) {
    echo '<b style="color:#b3261e">Permintaan kecil berhasil tapi yang besar macet (timeout).</b> Ini ciri masalah jaringan/MTU. Coba: pindah ke hotspot HP, atau buka CMD sebagai Administrator lalu jalankan <code>netsh interface ipv4 show subinterfaces</code> dan <code>netsh interface ipv4 set subinterface "Wi-Fi" mtu=1400 store=persistent</code> (ganti "Wi-Fi" sesuai nama koneksimu).';
}
echo '</p>';

h('Cara membaca hasil');
echo '<div style="line-height:1.6">';
echo '<p>' . ($anyOk ? '<b style="color:#0a7a2f">Ada jalur yang berhasil.</b> KALA AI akan memakai jalur itu otomatis.' : '<b style="color:#b3261e">Belum ada jalur yang berhasil.</b>') . '</p>';
echo '<ul><li><b>DNS gagal / port 443 gagal / errno 28:</b> masalah jaringan di komputer atau ISP kamu (bukan kode). Coba hotspot HP, ganti DNS ke 8.8.8.8, matikan VPN/antivirus web-shield.</li>';
echo '<li><b>HTTP 403 "has not been used in project … or it is disabled":</b> buka tautan di pesan itu, klik <b>Enable</b>, tunggu 2-5 menit, jalankan ulang halaman ini.</li>';
echo '<li><b>HTTP 400/401/403 "API key not valid":</b> key salah atau sudah dicabut. Buat key baru di aistudio.google.com/apikey.</li>';
echo '<li><b>HTTP 404 model not found:</b> ganti <code>model</code> di config/ai.local.php ke <code>gemini-2.5-flash</code>.</li>';
echo '<li><b>HTTP 429:</b> kuota habis, tunggu atau pakai key lain.</li></ul></div>';
echo '</body>';
