<?php
declare(strict_types=1);

/*
 * Koneksi database KALAKU.
 * - Database & semua tabel DIBUAT OTOMATIS saat pertama kali dibuka (tidak perlu import manual).
 * - Default XAMPP: host 127.0.0.1, user root, password kosong, database "kalaku".
 * - Mau ubah? Salin config/database.local.example.php menjadi config/database.local.php,
 *   atau pakai environment variable DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS.
 */
$kalakuDb = [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: '3306',
    'name' => getenv('DB_NAME') ?: 'kalaku',
    'user' => getenv('DB_USER') ?: 'root',
    'pass' => getenv('DB_PASS') !== false ? (string)getenv('DB_PASS') : '',
];

$kalakuDbLocal = __DIR__ . '/database.local.php';
if (is_file($kalakuDbLocal)) {
    $override = require $kalakuDbLocal;
    if (is_array($override)) {
        $kalakuDb = array_merge($kalakuDb, $override);
    }
}

function kalaku_db_fail(Throwable $e): void
{
    $isApi = defined('KALAKU_API');
    if ($isApi) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode(['ok' => false, 'code' => 'db', 'message' => 'Database tidak bisa dihubungi. Pastikan MySQL di XAMPP sudah Start.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: text/html; charset=utf-8');
    }
    $msg = htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Database belum siap</title>'
        . '<style>body{font-family:system-ui,sans-serif;background:#f6f3e8;color:#12302a;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px}'
        . '.b{max-width:520px;background:#fff;border:1px solid #e3e0d1;border-radius:18px;padding:32px}h1{margin:0 0 8px;font-size:22px}'
        . 'code{background:#eef2e4;padding:2px 6px;border-radius:6px;font-size:13px;word-break:break-word}li{margin:6px 0}</style></head><body><div class="b">'
        . '<h1>Database belum siap</h1><p>KALAKU belum bisa terhubung ke MySQL.</p><ol>'
        . '<li>Buka XAMPP Control Panel lalu klik <b>Start</b> pada <b>MySQL</b>.</li>'
        . '<li>Muat ulang halaman ini.</li>'
        . '<li>Bila user/password MySQL-mu berbeda, salin <code>config/database.local.example.php</code> menjadi <code>config/database.local.php</code> lalu isi.</li></ol>'
        . '<p style="font-size:13px;color:#5e6f68">Detail: <code>' . $msg . '</code></p></div></body></html>';
    exit;
}

function kalaku_install_schema(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        birth_date DATE NULL,
        cycle_length TINYINT UNSIGNED NOT NULL DEFAULT 28,
        period_length TINYINT UNSIGNED NOT NULL DEFAULT 5,
        notification_enabled TINYINT(1) NOT NULL DEFAULT 1,
        privacy_mode TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS cycle_records (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NULL,
        cycle_length TINYINT UNSIGNED NULL,
        notes VARCHAR(500) NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_cycle_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_cycle_user_start (user_id, period_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS reminders (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        title VARCHAR(150) NOT NULL,
        reminder_date DATE NOT NULL,
        reminder_time TIME NULL,
        category ENUM('siklus','ibadah','kesehatan','lainnya') NOT NULL DEFAULT 'siklus',
        is_done TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_reminder_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_reminder_user_date (user_id, reminder_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_messages (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        role ENUM('user','model') NOT NULL,
        content LONGTEXT NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_ai_user_id (user_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

try {
    $dbName = preg_replace('/[^A-Za-z0-9_]/', '', (string)$kalakuDb['name']);
    if ($dbName === '') {
        $dbName = 'kalaku';
    }
    $dsnBase = 'mysql:host=' . $kalakuDb['host'] . ';port=' . $kalakuDb['port'] . ';charset=utf8mb4';
    $pdoOptions = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsnBase . ';dbname=' . $dbName, (string)$kalakuDb['user'], (string)$kalakuDb['pass'], $pdoOptions);
    } catch (PDOException $first) {
        $unknownDb = ((int)($first->errorInfo[1] ?? 0) === 1049) || strpos($first->getMessage(), '1049') !== false;
        if (!$unknownDb) {
            throw $first;
        }
        $boot = new PDO($dsnBase, (string)$kalakuDb['user'], (string)$kalakuDb['pass'], $pdoOptions);
        $boot->exec('CREATE DATABASE IF NOT EXISTS `' . $dbName . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $pdo = new PDO($dsnBase . ';dbname=' . $dbName, (string)$kalakuDb['user'], (string)$kalakuDb['pass'], $pdoOptions);
    }

    $pdo->exec("SET time_zone = '+07:00'");

    if (empty($_SESSION['kalaku_schema_v1'])) {
        kalaku_install_schema($pdo);
        $_SESSION['kalaku_schema_v1'] = 1;
    }
} catch (Throwable $e) {
    kalaku_db_fail($e);
}
