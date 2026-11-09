<?php
declare(strict_types=1);
$topUser = current_user($pdo);
?>
<header class="topbar">
    <button type="button" class="icon-btn menu-btn" id="menuBtn" aria-label="Buka menu" aria-controls="sidebar" aria-expanded="false"><?= icon('menu') ?></button>
    <div class="topbar-title">
        <h1 class="page-title"><?= e($pageTitle) ?></h1>
        <p class="page-date"><?= e(tanggal_panjang(today_str())) ?></p>
    </div>
    <div class="topbar-actions">
        <a class="icon-btn bell" href="pengingat.php" aria-label="Pengingat hari ini" id="bellBtn">
            <?= icon('bell') ?><span class="bell-badge" id="bellBadge" hidden>0</span>
        </a>
        <a class="avatar" href="profil.php" aria-label="Profil: <?= e($topUser['name']) ?>"><?= e(user_initials((string)$topUser['name'])) ?></a>
    </div>
</header>
