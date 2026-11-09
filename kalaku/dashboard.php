<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';
require_login();

$user = current_user($pdo);
$firstName = (string)explode(' ', trim((string)$user['name']))[0];

$pageTitle = 'Beranda';
$shell = true;
$activeNav = 'dashboard';
require __DIR__ . '/includes/header.php';
?>
<section class="hello">
    <h2 class="hello-title"><?= e(greeting()) ?>, <?= e($firstName) ?></h2>
    <p class="hello-sub" id="helloSub">Memuat ringkasan siklusmu…</p>
</section>

<div class="dash-grid">
    <section class="card hero-card" id="heroCard" aria-live="polite">
        <div class="hero-ring" id="heroRing" aria-hidden="true"></div>
        <div class="hero-info" id="heroInfo">
            <div class="skeleton sk-line w60"></div>
            <div class="skeleton sk-line w80"></div>
            <div class="skeleton sk-line w40"></div>
        </div>
    </section>

    <section class="card" id="focusCard">
        <div class="card-head"><h3>Fokus hari ini</h3></div>
        <ul class="focus-list" id="focusList"><li class="skeleton sk-line"></li><li class="skeleton sk-line w80"></li></ul>
        <p class="note" id="focusNote" hidden></p>
    </section>

    <section class="card" id="weekCard">
        <div class="card-head"><h3>7 hari ke depan</h3><a class="link-sm" href="kalender.php">Buka kalender</a></div>
        <div class="week-strip" id="weekStrip"><div class="skeleton sk-block"></div></div>
    </section>

    <section class="card" id="upcomingCard">
        <div class="card-head"><h3>Pengingat terdekat</h3><a class="link-sm" href="pengingat.php">Semua</a></div>
        <ul class="mini-reminders" id="miniReminders"><li class="skeleton sk-line"></li><li class="skeleton sk-line w80"></li></ul>
    </section>

    <section class="card quick-card">
        <div class="card-head"><h3>Aksi cepat</h3></div>
        <div class="quick-grid">
            <button type="button" class="quick" data-action="quick-period"><?= icon('drop') ?><span>Haid mulai hari ini</span></button>
            <button type="button" class="quick" id="quickEnd" hidden><?= icon('check') ?><span>Haid selesai hari ini</span></button>
            <a class="quick" href="ai-chat.php"><?= icon('sparkle') ?><span>Tanya <?= e(AI_NAME) ?></span></a>
            <button type="button" class="quick" id="quickReminder"><?= icon('bell') ?><span>Tambah pengingat</span></button>
        </div>
    </section>
</div>
<?php
$needCycle = true;
$pageScripts = ['dashboard.js'];
require __DIR__ . '/includes/footer.php';
