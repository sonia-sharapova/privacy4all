<?php
// POST multipart "image" → saves to images/uploads/, returns { path } (site-root-relative).
require __DIR__ . '/_auth.php';

$file = $_FILES['image'] ?? null;
if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
    p4a_fail('No file uploaded' . ($file ? ' (error ' . $file['error'] . ')' : ''));
}
if ($file['size'] > 20 * 1024 * 1024) {
    p4a_fail('File too large (max 20MB)');
}
$types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp', 'image/avif' => 'avif'];
$mime = mime_content_type($file['tmp_name']);
if (!isset($types[$mime])) {
    p4a_fail('Only JPEG, PNG, GIF, WEBP or AVIF images are allowed');
}

$slug = preg_replace('/[^a-z0-9-]+/', '-', strtolower(pathinfo($file['name'], PATHINFO_FILENAME)));
$slug = trim($slug, '-') ?: 'image';
$name = substr($slug, 0, 50) . '_' . time() . '.' . $types[$mime];
$dir = dirname(__DIR__) . '/images/uploads';
if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
    p4a_fail('Could not create images/uploads/ — check permissions', 500);
}
if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
    p4a_fail('Could not save the file — check that images/uploads/ is writable', 500);
}
echo json_encode(['success' => true, 'path' => 'images/uploads/' . $name]);
