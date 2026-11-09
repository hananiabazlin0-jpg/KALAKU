<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';
require_login();

$pageTitle = 'Pengingat';
$shell = true;
$activeNav = 'pengingat';
require __DIR__ . '/includes/header.php';
?>
<div class="rem-layout">
    <section class="rem-main">
        <div class="rem-toolbar">
            <div class="chips" id="remFilters" role="tablist" aria-label="Filter kategori">
                <button type="button" class="chip is-active" data-filter="semua" role="tab" aria-selected="true">Semua</button>
                <button type="button" class="chip" data-filter="siklus" role="tab" aria-selected="false">Siklus</button>
                <button type="button" class="chip" data-filter="ibadah" role="tab" aria-selected="false">Ibadah</button>
                <button type="button" class="chip" data-filter="kesehatan" role="tab" aria-selected="false">Kesehatan</button>
                <button type="button" class="chip" data-filter="lainnya" role="tab" aria-selected="false">Lainnya</button>
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="remAdd"><?= icon('plus') ?><span>Pengingat baru</span></button>
        </div>
        <div id="remList" class="rem-list" aria-live="polite">
            <div class="skeleton sk-block"></div>
        </div>
    </section>

    <aside class="rem-side">
        <section class="card">
            <div class="card-head"><h3>Tambah cepat</h3></div>
            <div class="preset-list" id="presets">
                <button type="button" class="preset" data-preset="next-period"><?= icon('drop') ?><span><strong>Haid berikutnya</strong><em>2 hari sebelum perkiraan</em></span></button>
                <button type="button" class="preset" data-preset="qadha"><?= icon('pray') ?><span><strong>Qadha puasa</strong><em>Besok pagi</em></span></button>
                <button type="button" class="preset" data-preset="senin-kamis"><?= icon('leaf') ?><span><strong>Puasa Senin/Kamis</strong><em>Hari berikutnya</em></span></button>
                <button type="button" class="preset" data-preset="ovulasi"><?= icon('heart') ?><span><strong>Perkiraan ovulasi</strong><em>Pada hari ovulasi</em></span></button>
                <button type="button" class="preset" data-preset="air"><?= icon('clock') ?><span><strong>Minum air</strong><em>Hari ini, sore</em></span></button>
            </div>
        </section>
        <section class="card notif-card" id="notifCard"></section>
    </aside>
</div>
<?php
$needCycle = true;
$pageScripts = ['pengingat.js'];
require __DIR__ . '/includes/footer.php';
