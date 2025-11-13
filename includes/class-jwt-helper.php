<?php
/**
 * JWT Helper for WebSocket Authentication
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_JWT_Helper {
    
    /**
     * Generate JWT token for WebSocket authentication
     * 
     * @param string $user_id User ID
     * @param int $session_id Session ID
     * @param string $display_name Display name
     * @return string JWT token
     */
    public static function generate_token($user_id, $session_id, $display_name) {
        $jwt_secret = get_option('live_quiz_websocket_jwt_secret', '');
        
        if (empty($jwt_secret)) {
            error_log('Live Quiz: JWT secret not configured');
            return '';
        }
        
        // Token payload
        $payload = array(
            'user_id' => $user_id,
            'session_id' => (int)$session_id,
            'display_name' => $display_name,
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60), // 24 hours
        );
        
        return self::encode($payload, $jwt_secret);
    }
    
    /**
     * Simple JWT encode (HS256)
     * 
     * @param array $payload Payload data
     * @param string $secret Secret key
     * @return string JWT token
     */
    private static function encode($payload, $secret) {
        // Header
        $header = array(
            'typ' => 'JWT',
            'alg' => 'HS256'
        );
        
        // Encode Header
        $header_encoded = self::base64url_encode(json_encode($header));
        
        // Encode Payload
        $payload_encoded = self::base64url_encode(json_encode($payload));
        
        // Create Signature
        $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", $secret, true);
        $signature_encoded = self::base64url_encode($signature);
        
        // Create JWT
        return "$header_encoded.$payload_encoded.$signature_encoded";
    }
    
    /**
     * Base64 URL encode
     * 
     * @param string $data Data to encode
     * @return string Encoded data
     */
    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    /**
     * Verify JWT token
     * 
     * @param string $token JWT token
     * @return array|false Decoded payload or false
     */
    public static function verify($token) {
        $jwt_secret = get_option('live_quiz_websocket_jwt_secret', '');
        
        if (empty($jwt_secret) || empty($token)) {
            return false;
        }
        
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }
        
        list($header_encoded, $payload_encoded, $signature_encoded) = $parts;
        
        // Verify signature
        $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", $jwt_secret, true);
        $signature_check = self::base64url_encode($signature);
        
        if ($signature_encoded !== $signature_check) {
            return false;
        }
        
        // Decode payload
        $payload = json_decode(self::base64url_decode($payload_encoded), true);
        
        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }
        
        return $payload;
    }
    
    /**
     * Base64 URL decode
     * 
     * @param string $data Data to decode
     * @return string Decoded data
     */
    private static function base64url_decode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
