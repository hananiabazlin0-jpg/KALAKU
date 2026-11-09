<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';
require_login();

$pageTitle = AI_NAME;
$shell = true;
$activeNav = 'ai-chat';
$bodyClass = 'page-chat';
require __DIR__ . '/includes/header.php';
?>
<div class="chat">
    <div class="chat-head">
        <div class="chat-id">
            <span class="chat-avatar"><?= icon('sparkle') ?></span>
            <div>
                <h2><?= e(AI_NAME) ?></h2>
                <p id="chatMode">Teman ngobrol soal siklus dan kesehatan perempuan</p>
            </div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="chatClear"><?= icon('trash') ?><span>Hapus riwayat</span></button>
    </div>

    <div class="chat-scroll" id="chatScroll" role="log" aria-live="polite" aria-label="Percakapan">
        <div class="chat-thread" id="chatThread"></div>
    </div>

    <div class="chat-suggest" id="chatSuggest">
        <button type="button" class="chip" data-q="Kenapa perutku kram saat haid?">Kenapa perutku kram saat haid?</button>
        <button type="button" class="chip" data-q="Aku sedang di fase apa dan apa artinya?">Aku di fase apa sekarang?</button>
        <button type="button" class="chip" data-q="Kapan masa suburku?">Kapan masa suburku?</button>
        <button type="button" class="chip" data-q="Bagaimana cara mengqadha puasa setelah haid?">Cara qadha puasa</button>
        <button type="button" class="chip" data-q="Haidku telat, apa penyebabnya?">Haidku telat</button>
    </div>

    <form class="chat-input" id="chatForm" autocomplete="off">
        <label for="chatText" class="sr-only">Pesan untuk <?= e(AI_NAME) ?></label>
        <textarea id="chatText" rows="1" maxlength="2000" placeholder="Tulis pertanyaanmu…"></textarea>
        <button type="submit" class="send-btn" id="chatSend" aria-label="Kirim"><?= icon('send') ?></button>
    </form>
    <p class="chat-foot"><span id="chatCount">0</span>/2000 · <?= e(AI_NAME) ?> memberi informasi umum, bukan diagnosis. Untuk keluhan berat, hubungi tenaga kesehatan.</p>
</div>
<?php
$needCycle = true;
$pageScripts = ['kala-local.js', 'ai-chat.js'];
require __DIR__ . '/includes/footer.php';
