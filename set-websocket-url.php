<?php
/**
 * Set WebSocket URL option
 */

// Load WordPress
require_once('/home/wordpress-da/html/wp-load.php');

// Update option
$result = update_option('live_quiz_websocket_url', 'ws://localhost:3033');

if ($result) {
    echo "✓ WebSocket URL updated successfully: ws://localhost:3033\n";
} else {
    // Check if it already exists with same value
    $current = get_option('live_quiz_websocket_url');
    if ($current === 'ws://localhost:3033') {
        echo "✓ WebSocket URL already set to: ws://localhost:3033\n";
    } else {
        echo "✗ Failed to update WebSocket URL\n";
        echo "Current value: " . ($current ?: '(empty)') . "\n";
    }
}

// Verify
$verify = get_option('live_quiz_websocket_url');
echo "\nVerification - Current WebSocket URL: " . ($verify ?: '(not set)') . "\n";
