<?php
/**
 * Quick debug - Check WebSocket configuration
 */

// Load WordPress
require_once('/home/wordpress-da/html/wp-load.php');

echo "=== WEBSOCKET CONFIG DEBUG ===\n\n";

// Check option
$ws_url = get_option('live_quiz_websocket_url', '');
echo "WebSocket URL: " . ($ws_url ?: '(not set)') . "\n";

// Test API URL generation
if (class_exists('Live_Quiz_WebSocket_Helper')) {
    $reflection = new ReflectionClass('Live_Quiz_WebSocket_Helper');
    $method = $reflection->getMethod('get_ws_api_url');
    $method->setAccessible(true);
    $api_url = $method->invoke(null);
    echo "API URL: " . ($api_url ?: '(null)') . "\n";
} else {
    echo "ERROR: Live_Quiz_WebSocket_Helper class not found!\n";
}

// Test kick player function
echo "\n=== TEST KICK PLAYER (dry run) ===\n";
echo "Session ID: 2908\n";
echo "User ID: 31\n";

if (class_exists('Live_Quiz_WebSocket_Helper')) {
    $result = Live_Quiz_WebSocket_Helper::kick_player(2908, 31);
    echo "Result: " . ($result ? 'SUCCESS' : 'FAILED') . "\n";
    if ($result) {
        echo "Response: " . json_encode($result) . "\n";
    }
} else {
    echo "Cannot test - class not found\n";
}

echo "\n=== END DEBUG ===\n";
