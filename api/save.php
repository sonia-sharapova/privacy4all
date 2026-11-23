<?php
// POST { "file": "site", "data": {...} }  or  { "file": "page", "id": "<page-id>", "data": {...} }
// Backs up the current file into data/backups/ before overwriting it.
require __DIR__ . '/_auth.php';

if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    p4a_fail('Expected JSON');
}
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input) || !isset($input['data']) || !is_array($input['data'])) {
    p4a_fail('Invalid data');
}

$file = $input['file'] ?? '';
if ($file === 'site') {
    $data = $input['data'];
    if (!isset($data['pages']) || !is_array($data['pages']) || !isset($data['sections']) || !is_array($data['sections'])) {
        p4a_fail('site.json must have pages and sections');
    }
    $rel = 'site.json';
    $backupName = 'site';
} elseif ($file === 'page') {
    $id = $input['id'] ?? '';
    if (!preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $id)) {
        p4a_fail('Invalid page id');
    }
    $rel = 'pages/' . $id . '.json';
    $backupName = 'page-' . $id;
} else {
    p4a_fail('Unknown file');
}

$path = P4A_DATA . '/' . $rel;
$dir = dirname($path);
$backupDir = P4A_DATA . '/backups';
foreach ([$dir, $backupDir] as $d) {
    if (!is_dir($d) && !@mkdir($d, 0775, true) && !is_dir($d)) {
        p4a_fail('Could not create ' . basename($d) . '/ — make privacy4all/data writable by the web server user', 500);
    }
}

$json = json_encode($input['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false) {
    p4a_fail('Could not encode data');
}

if (file_exists($path)) {
    $stamp = date('Y-m-d_H-i-s');
    if (!@copy($path, $backupDir . '/' . $backupName . '_' . $stamp . '.json')) {
        p4a_fail('Could not write backup — refusing to overwrite', 500);
    }
}

$tmp = $path . '.tmp' . getmypid();
if (@file_put_contents($tmp, $json) === false || !@rename($tmp, $path)) {
    @unlink($tmp);
    p4a_fail('Could not write ' . $rel . ' — check that privacy4all/data is writable by the web server user', 500);
}

echo json_encode(['success' => true]);
