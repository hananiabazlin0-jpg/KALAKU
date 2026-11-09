<?php
declare(strict_types=1);
$navItems = [
    ['dashboard', 'dashboard.php', 'Beranda', 'home'],
    ['kalender', 'kalender.php', 'Kalender', 'calendar'],
    ['ai-chat', 'ai-chat.php', AI_NAME, 'sparkle'],
    ['pengingat', 'pengingat.php', 'Pengingat', 'bell'],
    ['profil', 'profil.php', 'Profil', 'user'],
    ['pengaturan', 'pengaturan.php', 'Pengaturan', 'settings'],
];
?>
<aside class="sidebar" id="sidebar" aria-label="Menu utama">
    <a class="brand" href="dashboard.php">
        <span class="brand-mark"><?= icon('drop') ?></span>
        <span class="brand-name"><?= e(APP_NAME) ?></span>
    </a>
    <nav class="nav">
        <?php foreach ($navItems as $it): ?>
            <a class="nav-link<?= $activeNav === $it[0] ? ' is-active' : '' ?>" href="<?= e($it[1]) ?>"<?= $activeNav === $it[0] ? ' aria-current="page"' : '' ?>>
                <?= icon($it[3]) ?><span><?= e($it[2]) ?></span>
            </a>
        <?php endforeach; ?>
    </nav>
    <div class="sidebar-foot">
        <button type="button" class="btn-quick" data-action="quick-period">
            <?= icon('drop') ?><span>Haid mulai hari ini</span>
        </button>
        <a class="nav-link nav-logout" href="logout.php"><?= icon('logout') ?><span>Keluar</span></a>
    </div>
</aside>
<div class="sidebar-backdrop" id="sidebarBackdrop" hidden></div>
