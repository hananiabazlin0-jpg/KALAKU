<?php
declare(strict_types=1);
/*
 * Variabel yang dibaca dari halaman pemanggil:
 *   $pageTitle  (string)  judul tab
 *   $shell      (bool)    true = tampilkan sidebar+topbar (halaman setelah login)
 *   $activeNav  (string)  dashboard|kalender|ai-chat|pengingat|profil|pengaturan
 *   $bodyClass  (string)  kelas tambahan pada <body>
 */
$pageTitle = $pageTitle ?? APP_NAME;
$shell     = $shell ?? false;
$bodyClass = $bodyClass ?? '';
$activeNav = $activeNav ?? '';
?>
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f5f1e8">
<meta name="csrf-token" content="<?= e(csrf_token()) ?>">
<title><?= e($pageTitle) ?> · <?= e(APP_NAME) ?></title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%2312302a'/%3E%3Cpath d='M32 14c7 8 12 13 12 20a12 12 0 0 1-24 0c0-7 5-12 12-20z' fill='%23e9739b'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=7">
<link rel="stylesheet" href="assets/css/responsive.css?v=6">
<link rel="stylesheet" href="assets/css/theme.css?v=1">
<?php if ($shell): ?><link rel="stylesheet" href="assets/css/tour.css?v=2"><?php endif; ?>
</head>
<body class="<?= e($bodyClass) ?><?= $shell ? ' has-shell' : '' ?>">
<?= icon_sprite() ?>
<a class="skip-link" href="#main">Lewati ke konten</a>
<div id="toasts" class="toasts" aria-live="polite" aria-atomic="false"></div>
<?php if ($shell): ?>
<div class="shell">
    <?php require __DIR__ . '/sidebar.php'; ?>
    <div class="shell-main">
        <?php require __DIR__ . '/topbar.php'; ?>
        <main class="content" id="main">
<?php endif; ?>
