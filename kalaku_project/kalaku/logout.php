<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'], (bool)$p['secure'], (bool)$p['httponly']);
}
session_destroy();
session_start();
flash('ok', 'Kamu sudah keluar. Sampai jumpa!');
redirect('login.php');
