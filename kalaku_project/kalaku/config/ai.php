<?php
declare(strict_types=1);

/*
 * KALA AI memakai Google Gemini API (kunci hanya dipakai di server, tidak pernah dikirim ke browser).
 * Cara mengisi kunci (pilih salah satu):
 *   1. Salin config/ai.local.example.php menjadi config/ai.local.php lalu isi api_key.
 *   2. Atau set environment variable GEMINI_API_KEY.
 * Tanpa kunci, KALA AI tetap bisa menjawab memakai mesin cadangan bawaan.
 *
 * Dua endpoint dicoba berurutan: Google AI Studio (generativelanguage.googleapis.com), lalu
 * Vertex AI (aiplatform.googleapis.com) sebagai cadangan.
 */
$apiKey = getenv('GEMINI_API_KEY') ?: '';
$model  = getenv('GEMINI_MODEL') ?: 'gemini-3.8-flash';

$aiLocal = __DIR__ . '/ai.local.php';
if (is_file($aiLocal)) {
    $localConfig = require $aiLocal;
    if (is_array($localConfig)) {
        if ($apiKey === '' && !empty($localConfig['api_key'])) {
            $apiKey = (string)$localConfig['api_key'];
        }
        if (!empty($localConfig['model'])) {
            $model = (string)$localConfig['model'];
        }
    }
}

$apiKey = trim($apiKey);
if ($apiKey === 'PASTE_GEMINI_API_KEY_HERE') {
    $apiKey = '';
}

/* Model dicoba berurutan; yang pertama berhasil dipakai. */
$models = array_values(array_unique(array_filter([trim($model), 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'])));

$studio = ['name' => 'studio', 'auth' => 'header', 'endpoint' => 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent'];
$vertex = ['name' => 'vertex', 'auth' => 'query',  'endpoint' => 'https://aiplatform.googleapis.com/v1/publishers/google/models/%s:generateContent'];
/*
 * Urutan endpoint: Google AI Studio dulu (gratis untuk key dari AI Studio), Vertex AI cadangan.
 * Vertex AI meminta billing aktif, jadi hanya dipakai bila AI Studio gagal.
 * Awalan key ('AIza...' atau 'AQ....') tidak dipakai untuk memilih endpoint.
 */
$keyType   = strpos($apiKey, 'AIza') === 0 ? 'studio' : (strpos($apiKey, 'AQ.') === 0 ? 'aq' : 'unknown');
$providers = [$studio, $vertex];

return [
    'api_key'   => $apiKey,
    'key_type'  => $keyType,
    'models'    => $models,
    'providers' => $providers,
];
