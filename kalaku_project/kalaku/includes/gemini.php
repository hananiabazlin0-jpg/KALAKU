<?php
declare(strict_types=1);

/* Pemanggil Gemini: dipakai oleh api/ai-process.php dan api/ai-test.php. */

/* Kirim HTTP POST JSON; kembalikan [status, body, errno, error]. */
function kala_http_post(string $url, array $headers, string $json, bool $verify = true): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 35,
            CURLOPT_FRESH_CONNECT  => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_POSTFIELDS     => $json,
            CURLOPT_SSL_VERIFYPEER => $verify,
            CURLOPT_SSL_VERIFYHOST => $verify ? 2 : 0,
        ]);
        $raw = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($raw === false) {
            return [0, '', $errno, $error];
        }
        return [$status, (string)$raw, 0, ''];
    }

    $ctx = stream_context_create([
        'http' => ['method' => 'POST', 'header' => implode("\r\n", $headers), 'content' => $json, 'timeout' => 30, 'ignore_errors' => true],
        'ssl'  => ['verify_peer' => $verify, 'verify_peer_name' => $verify],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) {
        return [0, '', 1, 'Koneksi gagal'];
    }
    $status = 0;
    if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', (string)$http_response_header[0], $m)) {
        $status = (int)$m[1];
    }
    return [$status, (string)$raw, 0, ''];
}

/* HTTP GET sederhana; kembalikan [status, body]. */
function kala_http_get(string $url, array $headers, bool $verify = true): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_SSL_VERIFYPEER => $verify,
            CURLOPT_SSL_VERIFYHOST => $verify ? 2 : 0,
        ]);
        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        return $raw === false ? [0, ''] : [$status, (string)$raw];
    }
    $ctx = stream_context_create([
        'http' => ['method' => 'GET', 'header' => implode("\r\n", $headers), 'timeout' => 15, 'ignore_errors' => true],
        'ssl'  => ['verify_peer' => $verify, 'verify_peer_name' => $verify],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    return $raw === false ? [0, ''] : [200, (string)$raw];
}

/* Satu percobaan ke satu endpoint + model. Hasil: ['kind' => ok|bad_key|network|quota|unavailable|empty, 'text', 'detail']. */
function kala_try(array $cfg, array $prov, string $model, string $payload): array
{
    $url = sprintf($prov['endpoint'], rawurlencode($model));
    $headers = ['Content-Type: application/json', 'Expect:']; /* 'Expect:' kosong = matikan 100-continue (penyebab macet pada permintaan > 1 KB) */
    if ($prov['auth'] === 'query') {
        $url .= '?key=' . rawurlencode($cfg['api_key']);
    } else {
        $headers[] = 'x-goog-api-key: ' . $cfg['api_key'];
    }

    [$status, $raw, $errno, $error] = kala_http_post($url, $headers, $payload, true);
    if ($status === 0 && in_array($errno, [35, 51, 58, 60, 77, 1], true) && client_ip_is_local()) {
        /* XAMPP Windows sering belum punya sertifikat CA. Hanya untuk localhost: ulangi tanpa verifikasi. */
        [$status, $raw, $errno, $error] = kala_http_post($url, $headers, $payload, false);
    }
    if ($status === 0) {
        return ['kind' => 'network', 'text' => '', 'detail' => str_cut((string)$error, 200)];
    }

    $data = json_decode($raw, true);
    $msg = is_array($data) ? (string)($data['error']['message'] ?? '') : '';

    if ($status >= 200 && $status < 300 && is_array($data)) {
        $text = '';
        foreach (($data['candidates'][0]['content']['parts'] ?? []) as $part) {
            if (isset($part['text']) && is_string($part['text'])) {
                $text .= $part['text'];
            }
        }
        $text = trim($text);
        if ($text !== '') {
            return ['kind' => 'ok', 'text' => $text, 'detail' => ''];
        }
        return ['kind' => 'empty', 'text' => '', 'detail' => $model . ': respons kosong'];
    }

    $detail = $model . ': ' . ($msg !== '' ? $msg : 'HTTP ' . $status);
    if ($status === 403 && (stripos($msg, 'has not been used') !== false || stripos($msg, 'is disabled') !== false || stripos($msg, 'SERVICE_DISABLED') !== false)) {
        return ['kind' => 'api_disabled', 'text' => '', 'detail' => $detail];
    }
    if (stripos($msg, 'requires billing') !== false || stripos($msg, 'enable billing') !== false) {
        return ['kind' => 'billing', 'text' => '', 'detail' => $detail];
    }
    if ($status === 401 || $status === 403 || ($status === 400 && stripos($msg, 'api key') !== false)) {
        return ['kind' => 'bad_key', 'text' => '', 'detail' => $detail];
    }
    return ['kind' => $status === 429 ? 'quota' : 'unavailable', 'text' => '', 'detail' => $detail];
}

/* Cari model flash yang masih aktif (hanya endpoint AI Studio). */
function kala_discover_models(array $cfg): array
{
    $url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100';
    $headers = ['x-goog-api-key: ' . $cfg['api_key']];
    [$status, $raw] = kala_http_get($url, $headers, true);
    if ($status === 0 && client_ip_is_local()) {
        [$status, $raw] = kala_http_get($url, $headers, false);
    }
    $data = $status === 200 ? json_decode($raw, true) : null;
    $out = [];
    foreach (($data['models'] ?? []) as $m) {
        $name = isset($m['name']) ? preg_replace('#^models/#', '', (string)$m['name']) : '';
        $methods = $m['supportedGenerationMethods'] ?? [];
        if ($name === '' || !in_array('generateContent', (array)$methods, true)) {
            continue;
        }
        if (stripos($name, 'flash') === false || preg_match('/(image|tts|live|audio|embed|robotics|computer|vision)/i', $name)) {
            continue;
        }
        $out[] = $name;
    }
    usort($out, function ($a, $b) {
        return strnatcasecmp($b, $a); /* versi terbaru dulu */
    });
    return array_slice($out, 0, 4);
}

/*
 * Minta jawaban ke Gemini. Mencoba tiap endpoint dan model berurutan; bila semua model
 * ditolak karena tidak tersedia, daftar model aktif dicari otomatis lalu dicoba.
 * Mengembalikan [teks, kode, detail, "provider:model"].
 * kode: ok | no_key | bad_key | quota | network | empty | unavailable
 */
function kala_gemini_generate(array $cfg, string $payload): array
{
    if ($cfg['api_key'] === '') {
        return ['', 'no_key', 'API key belum diisi', ''];
    }
    @set_time_limit(180); /* XAMPP default 30 detik; cukup untuk beberapa percobaan */
    $code = 'unavailable';
    $seen = [];
    $errors = [];
    $tried = [];
    $netFails = [];

    foreach ($cfg['providers'] as $prov) {
        foreach ($cfg['models'] as $model) {
            $tried[$prov['name'] . ':' . $model] = true;
            $r = kala_try($cfg, $prov, (string)$model, $payload);
            if ($r['kind'] === 'ok') {
                return [$r['text'], 'ok', '', $prov['name'] . ':' . $model];
            }
            if ($r['kind'] === 'network') {
                $errors[] = $prov['name'] . ': ' . $r['detail'];
                $code = 'network';
                $seen['network'] = true;
                $netFails[$prov['name']] = ($netFails[$prov['name']] ?? 0) + 1;
                if ($netFails[$prov['name']] >= 2) {
                    continue 2; /* dua kali tidak merespons: pindah endpoint */
                }
                continue; /* koneksi kadang macet sesaat: ulangi dengan koneksi baru (model berikutnya) */
            }
            $errors[] = $prov['name'] . ' ' . $r['detail'];
            $code = $r['kind'];
            $seen[$r['kind']] = true;
            if (in_array($r['kind'], ['bad_key', 'api_disabled', 'billing'], true)) {
                continue 2; /* kunci ditolak endpoint ini: coba endpoint berikutnya */
            }
        }
    }

    if (in_array($code, ['unavailable', 'empty'], true)) {
        foreach ($cfg['providers'] as $prov) {
            if ($prov['auth'] !== 'header') {
                continue;
            }
            foreach (kala_discover_models($cfg) as $model) {
                if (isset($tried[$prov['name'] . ':' . $model])) {
                    continue;
                }
                $r = kala_try($cfg, $prov, $model, $payload);
                if ($r['kind'] === 'ok') {
                    return [$r['text'], 'ok', '', $prov['name'] . ':' . $model . ' (otomatis)'];
                }
                if ($r['kind'] === 'network') {
                    return ['', 'network', $r['detail'], ''];
                }
                $errors[] = $r['detail'];
                $code = $r['kind'];
            }
            break;
        }
    }

    /* Penyebab sebenarnya (key/API) lebih penting daripada 'network' dari endpoint lain. */
    foreach (['quota', 'billing', 'api_disabled', 'bad_key'] as $k) {
        if (isset($seen[$k])) {
            $code = $k;
            break;
        }
    }
    $detail = str_cut(implode(' | ', array_slice(array_values(array_unique($errors)), 0, 4)), 700);
    return ['', $code, $detail, ''];
}

/* Pesan singkat berbahasa Indonesia untuk pengguna (detail teknis tetap ada di 'detail'). */
function kala_hint(string $code, string $detail, string $keyType = 'unknown'): string
{
    switch ($code) {
        case 'ok':
            return 'KALA AI terhubung ke Gemini.';
        case 'no_key':
            return 'API key belum diisi. Isi api_key di config/ai.local.php.';
        case 'api_disabled':
            $link = 'https://console.cloud.google.com/apis/library/aiplatform.googleapis.com';
            if (preg_match('#https://console\.[a-z.]*google\.com/apis/[^\s|]+#i', $detail, $m)) {
                $link = rtrim($m[0], '.,');
            }
            return 'Key kamu valid, tapi layanan Gemini (Vertex AI) belum diaktifkan di project Google Cloud-nya. '
                . 'Buka ' . $link . ' lalu klik ENABLE, tunggu 2-5 menit, coba lagi. '
                . 'Cara lebih mudah: buat key baru (awalan AIza) di aistudio.google.com/apikey.';
        case 'billing':
            return 'Jalur Vertex AI ini meminta billing diaktifkan, jadi tidak bisa dipakai gratis. Coba jalur Google AI Studio (gratis): pindah ke hotspot HP atau jaringan lain, lalu tes lagi. Jangan aktifkan billing kalau belum perlu.';
        case 'bad_key':
            return 'API key ditolak Google (salah, dicabut, atau dibatasi). Buat key baru di aistudio.google.com/apikey lalu tempel ke config/ai.local.php.';
        case 'quota':
            return 'Kuota gratis Gemini habis (batas harian key gratis kecil, sekitar 20 permintaan per model per hari). Biasanya pulih sendiri dalam beberapa jam. Untuk pemakaian banyak pengguna, perlu paket berbayar.';
        case 'network':
            return 'Google tidak merespons dari XAMPP. Coba ganti jaringan (hotspot HP), matikan VPN/antivirus sementara, lalu buka cek-koneksi.php.';
        case 'empty':
            return 'Gemini membalas kosong. Coba lagi sebentar.';
        default:
            return 'Gemini belum bisa dipakai. Buka cek-koneksi.php untuk melihat penyebabnya.';
    }
}
