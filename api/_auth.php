<?php
// Shared guard for privacy4all admin endpoints. Uses the same PHP session as
// soniapolis.com's /admin/login.php ($_SESSION['admin']), so one login covers both.
ini_set('display_errors', '0');
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store');

function p4a_fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

if (empty($_SESSION['admin'])) {
    p4a_fail('Unauthorized', 401);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    p4a_fail('Method not allowed', 405);
}
// Reject cross-site form posts: a browser only sends a foreign Origin here
// from another site, and same-origin fetch() always sends ours.
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    $host = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    if ($host !== ($_SERVER['HTTP_HOST'] ?? '') && $host !== parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) {
        p4a_fail('Bad origin', 403);
    }
}

define('P4A_DATA', dirname(__DIR__) . '/data');
