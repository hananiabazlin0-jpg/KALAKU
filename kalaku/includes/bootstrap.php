<?php
declare(strict_types=1);

/* Bootstrap KALAKU: konfigurasi, sesi, database, helper. Dipanggil di awal setiap halaman. */
require_once __DIR__ . '/../config/app.php';

if (defined('KALAKU_API')) {
    ini_set('display_errors', '0'); // supaya peringatan PHP tidak merusak respons JSON
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('kalaku_sess');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_start();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/icons.php';

/* ---------- Helper dasar ---------- */
function e($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function str_len(string $s): int
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}

function str_cut(string $s, int $len): string
{
    return function_exists('mb_substr') ? mb_substr($s, 0, $len, 'UTF-8') : substr($s, 0, $len);
}

function redirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}

function today_str(): string
{
    return date('Y-m-d');
}

function valid_date($value): bool
{
    if (!is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)) {
        return false;
    }
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]) && (int)$m[1] >= 1900 && (int)$m[1] <= 2100;
}

function valid_time($value): bool
{
    return is_string($value) && preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $value) === 1;
}

function days_between(string $a, string $b): int
{
    $da = new DateTime($a);
    $db = new DateTime($b);
    return (int)$da->diff($db)->format('%r%a');
}

function add_days(string $date, int $n): string
{
    $d = new DateTime($date);
    $d->modify(($n >= 0 ? '+' : '') . $n . ' days');
    return $d->format('Y-m-d');
}

/* ---------- CSRF ---------- */
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return (string)$_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_valid(?string $token): bool
{
    return is_string($token) && $token !== '' && hash_equals((string)($_SESSION['csrf'] ?? ''), $token);
}

/* ---------- Flash ---------- */
function flash(string $type, string $message): void
{
    $_SESSION['flash'] = [$type, $message];
}

function flash_get(): ?array
{
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return is_array($f) ? $f : null;
}

/* ---------- Auth ---------- */
function user_id(): int
{
    return (int)($_SESSION['user_id'] ?? 0);
}

function is_logged_in(): bool
{
    return user_id() > 0;
}

function require_login(): void
{
    if (!is_logged_in()) {
        redirect('login.php');
    }
}

function current_user(PDO $pdo): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $st->execute([user_id()]);
    $row = $st->fetch();
    if (!$row) {
        $_SESSION = [];
        session_destroy();
        if (defined('KALAKU_API')) {
            json_out(['ok' => false, 'code' => 'auth', 'message' => 'Sesi berakhir. Silakan login lagi.'], 401);
        }
        redirect('login.php');
    }
    $cache = $row;
    return $cache;
}

function user_initials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name)) ?: [];
    $out = '';
    foreach (array_slice($parts, 0, 2) as $p) {
        $out .= function_exists('mb_substr') ? mb_strtoupper(mb_substr($p, 0, 1, 'UTF-8'), 'UTF-8') : strtoupper(substr($p, 0, 1));
    }
    return $out !== '' ? $out : 'K';
}

/* ---------- JSON / API ---------- */
function json_out(array $data, int $status = 200): void
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function read_body(): array
{
    static $body = null;
    if ($body !== null) {
        return $body;
    }
    $raw = file_get_contents('php://input');
    $data = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
    $body = is_array($data) ? $data : $_POST;
    return $body;
}

/* Wajib dipanggil di awal setiap file API. Mengembalikan body (untuk POST) atau $_GET. */
function api_boot(): array
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    if (!is_logged_in()) {
        json_out(['ok' => false, 'code' => 'auth', 'message' => 'Sesi berakhir. Silakan login lagi.'], 401);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = read_body();
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($body['csrf'] ?? '');
        if (!csrf_valid(is_string($token) ? $token : '')) {
            json_out(['ok' => false, 'code' => 'csrf', 'message' => 'Halaman sudah kedaluwarsa. Muat ulang halaman lalu coba lagi.'], 419);
        }
        return $body;
    }
    return $_GET;
}

/* ---------- Format tampilan ---------- */
function bulan_id(int $m): string
{
    $n = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return $n[$m] ?? '';
}

function hari_id(int $w): string
{
    $n = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return $n[$w] ?? '';
}

function tanggal_panjang(string $date): string
{
    $t = strtotime($date);
    if ($t === false) {
        return $date;
    }
    return hari_id((int)date('w', $t)) . ', ' . (int)date('j', $t) . ' ' . bulan_id((int)date('n', $t)) . ' ' . date('Y', $t);
}

function greeting(): string
{
    $h = (int)date('G');
    if ($h < 11) return 'Selamat pagi';
    if ($h < 15) return 'Selamat siang';
    if ($h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

function client_ip_is_local(): bool
{
    $name = $_SERVER['SERVER_NAME'] ?? '';
    $addr = $_SERVER['SERVER_ADDR'] ?? '';
    return in_array($name, ['localhost', '127.0.0.1', '::1'], true) || in_array($addr, ['127.0.0.1', '::1'], true);
}
