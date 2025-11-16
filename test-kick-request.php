<?php
/**
 * Test kick request with authentication
 */

// Load WordPress
require_once('/home/wordpress-da/html/wp-load.php');

echo "=== Testing Kick Request ===\n\n";

$session_id = 2910;
$user_id = 31;

// Get secrets
$ws_secret = get_option('live_quiz_websocket_secret', '');
$ws_url = get_option('live_quiz_websocket_url', '');

echo "WebSocket URL: $ws_url\n";
echo "WordPress Secret: " . substr($ws_secret, 0, 20) . "...\n\n";

// Parse URL to get API URL
$parsed = parse_url($ws_url);
if ($parsed['scheme'] === 'ws') {
    $protocol = 'http://';
} elseif ($parsed['scheme'] === 'wss' || $parsed['scheme'] === 'https') {
    $protocol = 'https://';
} else {
    $protocol = 'http://';
}

$host = $parsed['host'];
$port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
$path = isset($parsed['path']) ? $parsed['path'] : '';

$api_url = $protocol . $host . $port . rtrim($path, '/') . '/api';
$kick_url = $api_url . '/sessions/' . $session_id . '/kick-player';

echo "API URL: $api_url\n";
echo "Kick URL: $kick_url\n\n";

// Send request
$args = array(
    'method' => 'POST',
    'timeout' => 10,
    'headers' => array(
        'Content-Type' => 'application/json',
        'X-WordPress-Secret' => $ws_secret,
    ),
    'body' => json_encode(array('user_id' => $user_id)),
    'sslverify' => false,
);

echo "Sending kick request...\n";
echo "Headers: " . json_encode($args['headers'], JSON_PRETTY_PRINT) . "\n";
echo "Body: " . $args['body'] . "\n\n";

$response = wp_remote_request($kick_url, $args);

if (is_wp_error($response)) {
    echo "ERROR: " . $response->get_error_message() . "\n";
} else {
    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    echo "Response Code: $response_code\n";
    echo "Response Body: $response_body\n";
}
