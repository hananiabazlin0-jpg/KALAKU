<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';

$loggedIn = is_logged_in();
$pageTitle = 'Kenali siklusmu';
$shell = false;
$bodyClass = 'page-landing';
require __DIR__ . '/includes/header.php';
?>
<header class="lp-nav">
    <a class="brand brand-dark" href="index.php"><span class="brand-mark"><?= icon('drop') ?></span><span class="brand-name">KALAKU <em>AI</em></span></a>
    <nav class="lp-nav-links" aria-label="Navigasi utama">
        <a href="#fitur">Fitur</a>
        <a href="#cara-kerja">Cara kerja</a>
        <?php if ($loggedIn): ?>
            <a class="btn btn-primary btn-sm" href="dashboard.php">Buka beranda</a>
        <?php else: ?>
            <a class="nav-login" href="login.php">Masuk</a>
            <a class="btn btn-primary btn-sm" href="register.php">Daftar</a>
        <?php endif; ?>
    </nav>
</header>

<main>
<section class="lp-hero">
    <div class="lp-hero-text">
        <p class="lp-eyebrow"><span></span> YOUR CYCLE, YOUR RHYTHM</p>
        <h1 class="lp-title">Empowering<br>Your Cycle.<br><span>AI-Driven</span><br>Prediction.</h1>
        <p class="lp-lead">Kenali pola tubuhmu dengan lebih dekat. Catat siklus, pahami setiap fase, dan temukan insight personal bersama KALA AI.</p>
        <div class="lp-cta">
            <?php if ($loggedIn): ?>
                <a class="btn btn-primary btn-lg" href="dashboard.php">Lanjut ke beranda <span aria-hidden="true">↗</span></a>
            <?php else: ?>
                <a class="btn btn-primary btn-lg" href="register.php">Mulai perjalananmu <span aria-hidden="true">↗</span></a>
                <a class="btn btn-ghost btn-lg" href="login.php">Saya sudah punya akun</a>
            <?php endif; ?>
        </div>
        <ul class="lp-points">
            <li><?= icon('shield') ?> Data siklus tersimpan secara personal</li>
            <li><?= icon('sparkle') ?> Insight dan estimasi yang mudah dipahami</li>
        </ul>
    </div>

    <div class="lp-visual" id="demo">
        <div class="lp-aura lp-aura-one"></div>
        <div class="lp-aura lp-aura-two"></div>
        <div class="lp-bloom" aria-hidden="true">
            <span class="bloom-petal petal-a"></span><span class="bloom-petal petal-b"></span>
            <span class="bloom-petal petal-c"></span><span class="bloom-petal petal-d"></span>
            <span class="bloom-petal petal-e"></span><span class="bloom-core"></span>
        </div>
        <div class="lp-glass-card lp-mini-card lp-logging">
            <div class="glass-card-top"><span class="glass-icon"><?= icon('calendar') ?></span><span class="glass-kicker">PERSONAL TRACKING</span></div>
            <h3>Smart Logging</h3>
            <p>Catat hari pertama haidmu dengan mudah.</p>
            <div class="logging-dots"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <span class="glass-caption">Your data, your rhythm</span>
        </div>
        <div class="lp-glass-card lp-main-card">
            <div class="glass-card-top"><div><span class="glass-kicker">KALAKU OVERVIEW</span><h2>AI Cycle Insights</h2></div><span class="phase-chip"><i></i> Personal cycle</span></div>
            <div class="cycle-summary">
                <div class="cycle-orbit"><div class="orbit-inner"><span>DAY</span><strong id="demoDayNum">9</strong><small>of 28</small></div></div>
                <div class="cycle-copy"><span class="glass-kicker">CURRENT PHASE</span><h3 class="demo-phase" id="demoPhase">Folikular</h3><p class="demo-desc" id="demoDesc">Energi biasanya mulai naik.</p></div>
            </div>
            <div class="cycle-slider"><label class="demo-slider-label" for="demoDay">Explore your cycle <strong>Day <span id="demoDayLabel">9</span></strong></label><input type="range" id="demoDay" min="1" max="28" value="9"></div>
            <div class="cycle-legend"><span><i class="legend-pink"></i> Menstruasi</span><span><i class="legend-green"></i> Folikular</span><span><i class="legend-gold"></i> Ovulasi</span><span><i class="legend-lilac"></i> Luteal</span></div>
        </div>
        <div class="lp-glass-card lp-mini-card lp-insight-card">
            <span class="glass-icon glass-icon-green"><?= icon('sparkle') ?></span>
            <span class="glass-kicker">KALA AI</span>
            <h3>Insights &amp; Guidance</h3>
            <p>Temukan pemahaman baru tentang siklus dan tubuhmu.</p>
            <a href="<?= $loggedIn ? 'ai-chat.php' : 'register.php' ?>">Explore Kala <span>↗</span></a>
        </div>
        <div class="lp-visual-caption"><span></span> A more mindful way to understand your cycle</div>
    </div>
</section>

<section class="lp-section lp-feature-section" id="fitur">
    <div class="lp-section-heading"><p class="lp-eyebrow"><span></span> MADE AROUND YOU</p><h2 class="lp-h2">Your body has a rhythm.<br><em>Get to know it.</em></h2><p>Semua yang kamu butuhkan untuk mengenali siklus, memahami perubahan, dan mengatur pengingat personal.</p></div>
    <div class="lp-features">
        <article class="feat feat-wide"><span class="feat-icon"><?= icon('calendar') ?></span><h3>Kalender siklus personal</h3><p>Catat hari pertama haid, lalu lihat fase, perkiraan ovulasi, masa subur, dan haid berikutnya langsung di kalender. Klik tanggal mana pun untuk melihat detailnya.</p><span class="feat-index">01 / CYCLE</span></article>
        <article class="feat"><span class="feat-icon"><?= icon('sparkle') ?></span><h3><?= e(AI_NAME) ?></h3><p>Tanya soal nyeri haid, PMS, atau siklus tidak teratur. Jawabannya menyesuaikan fasemu saat ini.</p><span class="feat-index">02 / AI COMPANION</span></article>
        <article class="feat"><span class="feat-icon"><?= icon('bell') ?></span><h3>Pengingat siklus &amp; ibadah</h3><p>Dari perkiraan haid sampai qadha puasa, semuanya bisa kamu jadwalkan.</p><span class="feat-index">03 / REMINDERS</span></article>
        <article class="feat"><span class="feat-icon"><?= icon('shield') ?></span><h3>Privasi di tanganmu</h3><p>Mode privasi menyembunyikan data sensitif. Kamu juga bisa mengekspor atau menghapus seluruh datamu kapan saja.</p><span class="feat-index">04 / YOUR PRIVACY</span></article>
    </div>
</section>

<section class="lp-section lp-steps-wrap" id="cara-kerja">
    <div class="lp-section-heading"><p class="lp-eyebrow"><span></span> A SIMPLE BEGINNING</p><h2 class="lp-h2">A little step towards<br><em>knowing yourself.</em></h2></div>
    <ol class="lp-steps">
        <li><strong>Daftar</strong><span>Buat akun dengan email dan kata sandi.</span></li>
        <li><strong>Catat haid</strong><span>Isi tanggal hari pertama haid terakhirmu.</span></li>
        <li><strong>Lihat kalendermu</strong><span>Fase dan perkiraan siklus muncul otomatis.</span></li>
        <li><strong>Tanya &amp; ingatkan</strong><span>Konsultasi ke <?= e(AI_NAME) ?> dan atur pengingat.</span></li>
    </ol>
    <?php if (!$loggedIn): ?><a class="btn btn-primary btn-lg" href="register.php">Buat akun sekarang <span aria-hidden="true">↗</span></a><?php endif; ?>
</section>
</main>

<footer class="lp-footer"><p><strong><?= e(APP_NAME) ?></strong> membantu mencatat dan memahami siklus. Informasi di sini bersifat edukatif dan bukan pengganti saran dokter.</p><span>DESIGNED FOR YOUR RHYTHM · KALAKU</span></footer>
<?php
$needCycle = true;
$pageScripts = ['landing.js'];
require __DIR__ . '/includes/footer.php';
