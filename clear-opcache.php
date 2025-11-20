<?php
/**
 * Clear OPcache to force PHP to reload files
 * Access via: https://dndenglish.com/wp-content/plugins/dnd-live-quiz/clear-opcache.php
 */

// Load WordPress
$wp_load_path = dirname(dirname(dirname(dirname(__FILE__)))) . '/wp-load.php';
if (file_exists($wp_load_path)) {
    require_once($wp_load_path);
} else {
    die('Cannot find wp-load.php');
}

// Check if user is admin
if (!current_user_can('manage_options')) {
    die('Access denied - admin only');
}

echo "<h1>Clear PHP Cache</h1>";

// Clear OPcache
if (function_exists('opcache_reset')) {
    $result = opcache_reset();
    echo "<p>✓ OPcache cleared: " . ($result ? 'SUCCESS' : 'FAILED') . "</p>";
} else {
    echo "<p>- OPcache not available</p>";
}

// Clear APCu if available
if (function_exists('apcu_clear_cache')) {
    apcu_clear_cache();
    echo "<p>✓ APCu cleared</p>";
}

// Touch files to update modification time
$files = [
    __DIR__ . '/includes/class-session-manager.php',
    __DIR__ . '/includes/class-rest-api.php',
    __DIR__ . '/live-quiz.php'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        touch($file);
        echo "<p>✓ Touched: " . basename($file) . "</p>";
    }
}

echo "<h2>✓ All caches cleared!</h2>";
echo "<p><a href='/host/'>Go to Host Page</a></p>";

