<?php
/**
 * Test JWT Helper
 */

// Load WordPress
require_once('../../../wp-load.php');

// Set JWT secret for testing
update_option('live_quiz_websocket_jwt_secret', 'ae996777b77d44f056a302891b67f4c79ca4f25346aebe2c4d5f5e08a219bf48');

// Generate token
$token = Live_Quiz_JWT_Helper::generate_token('user_test123', 123, 'Test User');

echo "Generated JWT Token:\n";
echo $token . "\n\n";

echo "Token length: " . strlen($token) . "\n\n";

// Verify token
$decoded = Live_Quiz_JWT_Helper::verify($token);
echo "Decoded payload:\n";
print_r($decoded);

// Test with Node.js verification
echo "\n\nTo verify with Node.js, run:\n";
echo "node -e \"const jwt = require('jsonwebtoken'); const secret = 'ae996777b77d44f056a302891b67f4c79ca4f25346aebe2c4d5f5e08a219bf48'; const decoded = jwt.verify('$token', secret); console.log(JSON.stringify(decoded, null, 2));\"\n";
