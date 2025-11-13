<?php
/**
 * Security and Rate Limiting
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_Security {
    
    /**
     * Rate limit settings
     */
    const RATE_LIMIT_ANSWER = 10; // Max 10 answers per minute
    const RATE_LIMIT_JOIN = 5; // Max 5 joins per minute
    const RATE_LIMIT_WINDOW = 60; // 60 seconds window
    
    /**
     * Initialize
     */
    public static function init() {
        // Add security headers
        add_action('send_headers', array(__CLASS__, 'add_security_headers'));
        
        // Clean up old rate limit data
        add_action('live_quiz_cleanup', array(__CLASS__, 'cleanup_rate_limits'));
        
        if (!wp_next_scheduled('live_quiz_cleanup')) {
            wp_schedule_event(time(), 'hourly', 'live_quiz_cleanup');
        }
    }
    
    /**
     * Add security headers
     */
    public static function add_security_headers() {
        if (!is_admin()) {
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: SAMEORIGIN');
            header('X-XSS-Protection: 1; mode=block');
        }
    }
    
    /**
     * Verify nonce for REST requests
     * 
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    public static function verify_nonce($request) {
        $nonce = $request->get_header('X-WP-Nonce');
        
        if (!$nonce) {
            $nonce = $request->get_param('_wpnonce');
        }
        
        if (!wp_verify_nonce($nonce, 'wp_rest')) {
            return new WP_Error(
                'invalid_nonce',
                __('Nonce không hợp lệ', 'live-quiz'),
                array('status' => 403)
            );
        }
        
        return true;
    }
    
    /**
     * Check rate limit
     * 
     * @param string $action Action name (e.g., 'answer', 'join')
     * @param string $identifier Unique identifier (user_id or IP)
     * @param int $limit Max actions per window
     * @return bool|WP_Error True if within limit, WP_Error if exceeded
     */
    public static function check_rate_limit($action, $identifier, $limit = null) {
        if ($limit === null) {
            $limit = $action === 'answer' ? self::RATE_LIMIT_ANSWER : self::RATE_LIMIT_JOIN;
        }
        
        $key = "live_quiz_rate_{$action}_{$identifier}";
        $count = (int)get_transient($key);
        
        if ($count >= $limit) {
            return new WP_Error(
                'rate_limit_exceeded',
                sprintf(
                    __('Vượt quá giới hạn. Vui lòng thử lại sau %d giây.', 'live-quiz'),
                    self::RATE_LIMIT_WINDOW
                ),
                array('status' => 429)
            );
        }
        
        // Increment counter
        set_transient($key, $count + 1, self::RATE_LIMIT_WINDOW);
        
        return true;
    }
    
    /**
     * Sanitize room code (PIN 6 số)
     * 
     * @param string $code Room code
     * @return string Sanitized code
     */
    public static function sanitize_room_code($code) {
        // Only allow numbers (PIN code is 6 digits)
        return preg_replace('/[^0-9]/', '', $code);
    }
    
    /**
     * Sanitize display name
     * 
     * @param string $name Display name
     * @return string Sanitized name
     */
    public static function sanitize_display_name($name) {
        $name = sanitize_text_field($name);
        $name = trim($name);
        
        // Limit length
        if (mb_strlen($name) > 50) {
            $name = mb_substr($name, 0, 50);
        }
        
        // Remove multiple spaces
        $name = preg_replace('/\s+/', ' ', $name);
        
        return $name;
    }
    
    /**
     * Validate session access
     * 
     * @param int $session_id Session ID
     * @param string $user_id User ID (for participants)
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    public static function validate_session_access($session_id, $user_id = null) {
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        
        if (!$session) {
            return new WP_Error(
                'invalid_session',
                __('Phiên không tồn tại', 'live-quiz'),
                array('status' => 404)
            );
        }
        
        // If user_id provided, check if participant exists
        if ($user_id) {
            $participants = Live_Quiz_Session_Manager::get_participants($session_id);
            $found = false;
            
            foreach ($participants as $participant) {
                if ($participant['user_id'] === $user_id) {
                    $found = true;
                    break;
                }
            }
            
            if (!$found) {
                return new WP_Error(
                    'not_participant',
                    __('Bạn không phải thành viên của phiên này', 'live-quiz'),
                    array('status' => 403)
                );
            }
        }
        
        return true;
    }
    
    /**
     * Check for duplicate participants (same IP joining multiple times)
     * 
     * @param int $session_id Session ID
     * @param string $ip IP address
     * @param int $max_duplicates Max allowed duplicates
     * @return bool|WP_Error True if OK, WP_Error if too many duplicates
     */
    public static function check_duplicate_participants($session_id, $ip, $max_duplicates = 3) {
        $participants = Live_Quiz_Session_Manager::get_participants($session_id);
        
        $count = 0;
        foreach ($participants as $participant) {
            if (isset($participant['ip_address']) && $participant['ip_address'] === $ip) {
                $count++;
            }
        }
        
        if ($count >= $max_duplicates) {
            return new WP_Error(
                'too_many_participants',
                __('Quá nhiều người chơi từ cùng một địa chỉ IP', 'live-quiz'),
                array('status' => 403)
            );
        }
        
        return true;
    }
    
    /**
     * Validate choice ID
     * 
     * @param int $choice_id Choice ID
     * @param array $question Question data
     * @return bool|WP_Error True if valid, WP_Error if invalid
     */
    public static function validate_choice($choice_id, $question) {
        if (!is_numeric($choice_id) || $choice_id < 0) {
            return new WP_Error(
                'invalid_choice',
                __('Lựa chọn không hợp lệ', 'live-quiz'),
                array('status' => 400)
            );
        }
        
        if (!isset($question['choices'][$choice_id])) {
            return new WP_Error(
                'choice_not_found',
                __('Lựa chọn không tồn tại', 'live-quiz'),
                array('status' => 404)
            );
        }
        
        return true;
    }
    
    /**
     * Cleanup old rate limit data
     */
    public static function cleanup_rate_limits() {
        global $wpdb;
        
        // Delete expired transients
        $wpdb->query(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_live_quiz_rate_%' 
             OR option_name LIKE '_transient_timeout_live_quiz_rate_%'"
        );
    }
    
    /**
     * Log suspicious activity
     * 
     * @param string $activity Activity description
     * @param array $context Context data
     */
    public static function log_suspicious_activity($activity, $context = array()) {
        if (!defined('WP_DEBUG_LOG') || !WP_DEBUG_LOG) {
            return;
        }
        
        $log_entry = array(
            'timestamp' => current_time('mysql'),
            'activity' => $activity,
            'context' => $context,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        );
        
        error_log('[Live Quiz Security] ' . wp_json_encode($log_entry));
    }
    
    /**
     * Escape output for SSE
     * 
     * @param mixed $data Data to escape
     * @return string JSON-encoded and escaped data
     */
    public static function escape_sse_data($data) {
        return str_replace("\n", '', wp_json_encode($data, JSON_UNESCAPED_UNICODE));
    }
}
