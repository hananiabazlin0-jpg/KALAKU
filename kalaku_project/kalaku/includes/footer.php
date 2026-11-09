<?php
declare(strict_types=1);
/*
 * Variabel opsional:
 *   $pageScripts (array)  daftar file JS halaman, misal ['kalender.js']
 *   $needCycle   (bool)   true = muat cycle.js (mesin siklus)
 */
$shell       = $shell ?? false;
$pageScripts = $pageScripts ?? [];
$needCycle   = $needCycle ?? false;

$kalakuBoot = ['app' => APP_NAME, 'ai' => AI_NAME, 'loggedIn' => is_logged_in()];
if (is_logged_in() && isset($pdo)) {
    $bootUser = current_user($pdo);
    $kalakuBoot['user'] = [
        'id'      => (int)$bootUser['id'],
        'name'    => (string)$bootUser['name'],
        'cycle'   => (int)$bootUser['cycle_length'],
        'period'  => (int)$bootUser['period_length'],
        'notify'  => (int)$bootUser['notification_enabled'] === 1,
        'privacy' => (int)$bootUser['privacy_mode'] === 1,
    ];
}
$kalakuFlash = flash_get();
if ($kalakuFlash) {
    $kalakuBoot['flash'] = $kalakuFlash;
}
?>
<?php if ($shell): ?>
        </main>
    </div>
</div>
<?php endif; ?>
<script>window.KALAKU = <?= json_encode($kalakuBoot, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<?php if ($needCycle): ?><script src="assets/js/cycle.js?v=6"></script><?php endif; ?>
<script src="assets/js/main.js?v=7"></script>
<?php if ($shell): ?><script src="assets/js/tour.js?v=2"></script><?php endif; ?>
<?php foreach ($pageScripts as $js): ?>
<script src="assets/js/<?= e($js) ?>?v=6"></script>
<?php endforeach; ?>
</body>
</html>
