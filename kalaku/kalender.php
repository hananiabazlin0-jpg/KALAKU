<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';
require_login();

$pageTitle = 'Kalender';
$shell = true;
$activeNav = 'kalender';
require __DIR__ . '/includes/header.php';
?>
<div class="cal-layout">
    <section class="card cal-card" aria-label="Kalender siklus">
        <div class="cal-head">
            <div class="cal-nav">
                <button type="button" class="icon-btn" id="calPrev" aria-label="Bulan sebelumnya"><?= icon('left') ?></button>
                <h2 class="cal-month" id="calMonth" aria-live="polite">—</h2>
                <button type="button" class="icon-btn" id="calNext" aria-label="Bulan berikutnya"><?= icon('right') ?></button>
            </div>
            <div class="cal-tools">
                <button type="button" class="btn btn-ghost btn-sm" id="calToday">Hari ini</button>
                <button type="button" class="btn btn-primary btn-sm" id="calAdd"><?= icon('plus') ?><span>Catat haid</span></button>
            </div>
        </div>

        <div class="cal-status" id="calStatus" role="status"></div>

        <div class="cal-dow" aria-hidden="true">
            <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span>
        </div>
        <div class="cal-grid" id="calGrid" aria-label="Tanggal"></div>

        <ul class="legend" aria-label="Keterangan warna">
            <li><i class="lg lg-period"></i>Haid (tercatat)</li>
            <li><i class="lg lg-predicted"></i>Perkiraan haid</li>
            <li><i class="lg lg-follicular"></i>Folikular</li>
            <li><i class="lg lg-ovulation"></i>Ovulasi</li>
            <li><i class="lg lg-fertile"></i>Masa subur</li>
            <li><i class="lg lg-luteal"></i>Luteal</li>
        </ul>
        <p class="note">Fase dan ovulasi adalah estimasi kalender, bukan diagnosis atau kepastian medis.</p>
    </section>

    <aside class="cal-side">
        <section class="card day-card" id="dayCard" aria-live="polite">
            <p class="empty">Pilih tanggal di kalender untuk melihat detailnya.</p>
        </section>

        <section class="card">
            <div class="card-head"><h3>Riwayat hari pertama haid</h3></div>
            <ul class="history" id="history"><li class="skeleton sk-line"></li><li class="skeleton sk-line w80"></li></ul>
        </section>
    </aside>
</div>
<?php
$needCycle = true;
$pageScripts = ['kalender.js'];
require __DIR__ . '/includes/footer.php';
