<?php
/**
 * Debug JWT Helper
 */

// Load WordPress
require_once('../../../wp-load.php');

header('Content-Type: application/json');

$debug = array();

// Check if JWT Helper class exists
$debug['jwt_helper_exists'] = class_exists('Live_Quiz_JWT_Helper');

// Check JWT secret
$jwt_secret = get_option('live_quiz_websocket_jwt_secret', '');
$debug['jwt_secret_set'] = !empty($jwt_secret);
$debug['jwt_secret_length'] = strlen($jwt_secret);

// Try to generate token
if ($debug['jwt_helper_exists'] && $debug['jwt_secret_set']) {
    try {
        $token = Live_Quiz_JWT_Helper::generate_token('user_test123', 999, 'Test User');
        $debug['token_generated'] = !empty($token);
        $debug['token_length'] = strlen($token);
        $debug['token_sample'] = substr($token, 0, 50) . '...';
        
        // Try to verify
        $verified = Live_Quiz_JWT_Helper::verify($token);
        $debug['token_verified'] = !empty($verified);
        $debug['decoded_payload'] = $verified;
    } catch (Exception $e) {
        $debug['error'] = $e->getMessage();
    }
} else {
    $debug['error'] = 'JWT Helper not available or secret not set';
}

// Check all related options
$debug['options'] = array(
    'websocket_url' => get_option('live_quiz_websocket_url', ''),
    'websocket_secret' => substr(get_option('live_quiz_websocket_secret', ''), 0, 10) . '...',
    'websocket_jwt_secret' => substr($jwt_secret, 0, 10) . '...',
);

echo json_encode($debug, JSON_PRETTY_PRINT);
