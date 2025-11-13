<?php
/**
 * Set JWT Secret
 * Run this file once to set the JWT secret
 */

// Load WordPress
require_once('../../../wp-load.php');

// Check if user is admin
if (!current_user_can('manage_options')) {
    die('You must be an administrator to run this script.');
}

// Set JWT secret
$jwt_secret = 'ae996777b77d44f056a302891b67f4c79ca4f25346aebe2c4d5f5e08a219bf48';
update_option('live_quiz_websocket_jwt_secret', $jwt_secret);

echo "JWT Secret has been set!\n\n";
echo "JWT Secret: " . get_option('live_quiz_websocket_jwt_secret') . "\n\n";

// Test token generation
if (class_exists('Live_Quiz_JWT_Helper')) {
    $token = Live_Quiz_JWT_Helper::generate_token('user_test', 123, 'Test User');
    echo "Test Token Generated:\n";
    echo $token . "\n\n";
    echo "Token length: " . strlen($token) . "\n";
} else {
    echo "ERROR: JWT Helper class not found!\n";
}
