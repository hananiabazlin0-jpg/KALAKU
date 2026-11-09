<?php
declare(strict_types=1);

/* Pengaturan umum KALAKU */
if (!defined('APP_NAME'))  define('APP_NAME', 'KALAKU');
if (!defined('AI_NAME'))   define('AI_NAME', 'KALA AI');
if (!defined('APP_TZ'))    define('APP_TZ', 'Asia/Jakarta');

date_default_timezone_set(APP_TZ);
if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding('UTF-8');
}
