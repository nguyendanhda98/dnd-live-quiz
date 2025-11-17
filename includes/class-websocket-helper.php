<?php
/**
 * WebSocket Helper
 * Helper class to communicate with WebSocket server
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_WebSocket_Helper {
    
    /**
     * Get WebSocket server URL
     */
    private static function get_ws_api_url() {
        $ws_url = get_option('live_quiz_websocket_url', '');
        
        if (empty($ws_url)) {
            error_log('[LiveQuiz WebSocket] WebSocket URL not configured (option: live_quiz_websocket_url)');
            return null;
        }
        
        // Parse URL to get protocol and domain
        $parsed = parse_url($ws_url);
        if (!$parsed) {
            error_log('[LiveQuiz WebSocket] Invalid WebSocket URL: ' . $ws_url);
            return null;
        }
        
        // Convert ws:// or wss:// to http:// or https://
        // Also support https:// directly
        if (isset($parsed['scheme'])) {
            if ($parsed['scheme'] === 'ws') {
                $protocol = 'http://';
            } elseif ($parsed['scheme'] === 'wss' || $parsed['scheme'] === 'https') {
                $protocol = 'https://';
            } elseif ($parsed['scheme'] === 'http') {
                $protocol = 'http://';
            } else {
                $protocol = 'http://'; // Default
            }
        } else {
            $protocol = 'http://';
        }
        
        // Build URL
        $host = $parsed['host'];
        $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
        $path = isset($parsed['path']) ? $parsed['path'] : '';
        
        $api_url = $protocol . $host . $port . rtrim($path, '/') . '/api';
        error_log('[LiveQuiz WebSocket] Using API URL: ' . $api_url . ' (from: ' . $ws_url . ')');
        
        return $api_url;
    }
    
    /**
     * Send HTTP request to WebSocket server
     */
    private static function send_request($endpoint, $data = array(), $method = 'POST') {
        $api_url = self::get_ws_api_url();
        
        if (!$api_url) {
            error_log('[LiveQuiz WebSocket] API URL not configured. Please set live_quiz_ws_url option.');
            return false;
        }
        
        $url = $api_url . $endpoint;
        
        // Get WordPress secret for authentication
        $ws_secret = get_option('live_quiz_websocket_secret', '');
        
        $args = array(
            'method' => $method,
            'timeout' => 10,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-WordPress-Secret' => $ws_secret,
            ),
            'sslverify' => false, // Allow local SSL
        );
        
        if (!empty($data)) {
            $args['body'] = json_encode($data);
        }
        
        error_log('[LiveQuiz WebSocket] >>> REQUEST: ' . $method . ' ' . $url);
        error_log('[LiveQuiz WebSocket] >>> DATA: ' . json_encode($data));
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            error_log('[LiveQuiz WebSocket] !!! REQUEST FAILED: ' . $response->get_error_message());
            return false;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        
        error_log('[LiveQuiz WebSocket] <<< RESPONSE CODE: ' . $response_code);
        error_log('[LiveQuiz WebSocket] <<< RESPONSE BODY: ' . $response_body);
        
        if ($response_code >= 200 && $response_code < 300) {
            $result = json_decode($response_body, true);
            error_log('[LiveQuiz WebSocket] === SUCCESS');
            return $result;
        }
        
        error_log('[LiveQuiz WebSocket] !!! RESPONSE ERROR: HTTP ' . $response_code);
        return false;
    }
    
    /**
     * Kick player from session
     * 
     * @param int $session_id Session ID
     * @param string $user_id User ID to kick
     * @param string $message Optional custom message
     * @param string $reason Optional reason (kicked, banned_session, banned_permanently)
     * @return bool Success
     */
    public static function kick_player($session_id, $user_id, $message = null, $reason = 'kicked') {
        error_log('[LiveQuiz WebSocket Helper] kick_player() called');
        error_log('[LiveQuiz WebSocket Helper] Session: ' . $session_id . ', User: ' . $user_id . ', Reason: ' . $reason);
        
        $data = array('user_id' => $user_id);
        if ($message) {
            $data['message'] = $message;
        }
        if ($reason) {
            $data['reason'] = $reason;
        }
        
        $result = self::send_request(
            '/sessions/' . $session_id . '/kick-player',
            $data,
            'POST'
        );
        
        error_log('[LiveQuiz WebSocket Helper] kick_player() result: ' . ($result ? 'SUCCESS' : 'FAILED'));
        return $result;
    }
    
    /**
     * Notify session ended (kick all players)
     * 
     * @param int $session_id Session ID
     * @return bool Success
     */
    public static function end_session($session_id) {
        return self::send_request(
            '/sessions/' . $session_id . '/end',
            array(),
            'POST'
        );
    }
    
    /**
     * Start question
     * 
     * @param int $session_id Session ID
     * @param int $question_index Question index
     * @param array $question_data Question data
     * @return bool Success
     */
    public static function start_question($session_id, $question_index, $question_data) {
        error_log('[WebSocket Helper] start_question() called');
        error_log('[WebSocket Helper] Session: ' . $session_id);
        error_log('[WebSocket Helper] Question Index: ' . $question_index);
        error_log('[WebSocket Helper] Question Data: ' . json_encode($question_data));
        
        // Extract start_time from question_data
        $start_time = isset($question_data['start_time']) ? $question_data['start_time'] : microtime(true);
        
        $result = self::send_request(
            '/sessions/' . $session_id . '/start-question',
            array(
                'question_index' => $question_index,
                'question_data' => $question_data,
                'start_time' => $start_time,
            ),
            'POST'
        );
        
        error_log('[WebSocket Helper] Result: ' . ($result ? 'SUCCESS' : 'FAILED'));
        return $result;
    }
    
    /**
     * End question
     * 
     * @param int $session_id Session ID
     * @return bool Success
     */
    public static function end_question($session_id) {
        return self::send_request(
            '/sessions/' . $session_id . '/end-question',
            array(),
            'POST'
        );
    }
    
    /**
     * Ban user from session (stores in Redis with 24h TTL)
     * 
     * @param int $session_id Session ID
     * @param int $user_id User ID to ban
     * @return bool Success
     */
    public static function ban_from_session($session_id, $user_id) {
        error_log('[LiveQuiz WebSocket Helper] ban_from_session() - Session: ' . $session_id . ', User: ' . $user_id);
        
        $result = self::send_request(
            '/sessions/' . $session_id . '/ban-session',
            array('user_id' => (string)$user_id),
            'POST'
        );
        
        return $result !== false;
    }
    
    /**
     * Check if user is banned from session (checks Redis)
     * 
     * @param int $session_id Session ID
     * @param int $user_id User ID to check
     * @return bool|null Is banned, or null if check failed
     */
    public static function is_session_banned($session_id, $user_id) {
        error_log('[LiveQuiz WebSocket Helper] is_session_banned() - Session: ' . $session_id . ', User: ' . $user_id);
        
        $result = self::send_request(
            '/sessions/' . $session_id . '/is-banned?user_id=' . $user_id,
            array(),
            'GET'
        );
        
        if ($result === false) {
            return null; // Check failed
        }
        
        return isset($result['is_banned']) ? (bool)$result['is_banned'] : false;
    }
}
