<?php
// Ends the admin session (shared with soniapolis.com) and returns to the page.
session_start();
$_SESSION = [];
session_destroy();
$to = $_GET['redirect'] ?? '';
if (!preg_match('#^/[A-Za-z0-9/_.\-?=&%]*$#', $to) || strpos($to, '//') === 0) {
    $to = '../index.html';
}
header('Location: ' . $to);
exit;
