<?php
/**
 * Admin Interface
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_Admin {
    
    /**
     * Initialize
     */
    public static function init() {
        add_action('admin_menu', array(__CLASS__, 'add_admin_menu'), 20);
        add_action('admin_init', array(__CLASS__, 'register_settings'));
    }
    
    /**
     * Add admin menu
     */
    public static function add_admin_menu() {
        add_submenu_page(
            'edit.php?post_type=live_quiz',
            __('Phiên Quiz', 'live-quiz'),
            __('Phiên Quiz', 'live-quiz'),
            'manage_options',
            'live-quiz-sessions',
            array(__CLASS__, 'render_sessions_page')
        );
        
        add_submenu_page(
            'edit.php?post_type=live_quiz',
            __('Cài đặt', 'live-quiz'),
            __('Cài đặt', 'live-quiz'),
            'manage_options',
            'live-quiz-settings',
            array(__CLASS__, 'render_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public static function register_settings() {
        // Phase 1 settings
        register_setting('live_quiz_settings', 'live_quiz_alpha');
        register_setting('live_quiz_settings', 'live_quiz_base_points');
        register_setting('live_quiz_settings', 'live_quiz_time_limit');
        register_setting('live_quiz_settings', 'live_quiz_max_players');
        
        // AI settings
        register_setting('live_quiz_settings', 'live_quiz_gemini_api_key');
        register_setting('live_quiz_settings', 'live_quiz_gemini_model');
        register_setting('live_quiz_settings', 'live_quiz_gemini_max_tokens');
        register_setting('live_quiz_settings', 'live_quiz_gemini_timeout');
        register_setting('live_quiz_settings', 'live_quiz_ai_prompt_single_choice');
        register_setting('live_quiz_settings', 'live_quiz_ai_prompt_multiple_choice');
        register_setting('live_quiz_settings', 'live_quiz_ai_prompt_free_choice');
        register_setting('live_quiz_settings', 'live_quiz_ai_prompt_sorting_choice');
        register_setting('live_quiz_settings', 'live_quiz_ai_prompt_matrix_sorting');
        register_setting('live_quiz_settings', 'live_quiz_ai_prompt_fill_blank');
        register_setting('live_quiz_settings', 'live_quiz_ai_prompt_assessment');
        register_setting('live_quiz_settings', 'live_quiz_ai_prompt_essay');
        
        // Phase 2 settings
        register_setting('live_quiz_settings', 'live_quiz_websocket_enabled');
        register_setting('live_quiz_settings', 'live_quiz_websocket_url');
        register_setting('live_quiz_settings', 'live_quiz_websocket_secret');
        register_setting('live_quiz_settings', 'live_quiz_websocket_jwt_secret');
        register_setting('live_quiz_settings', 'live_quiz_redis_enabled');
        register_setting('live_quiz_settings', 'live_quiz_redis_host');
        register_setting('live_quiz_settings', 'live_quiz_redis_port');
        register_setting('live_quiz_settings', 'live_quiz_redis_password');
        register_setting('live_quiz_settings', 'live_quiz_redis_database');
    }
    
    /**
     * Render sessions page
     */
    public static function render_sessions_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Handle session creation
        if (isset($_POST['create_session']) && check_admin_referer('create_live_quiz_session')) {
            $quiz_id = (int)$_POST['quiz_id'];
            
            $session_id = wp_insert_post(array(
                'post_type' => 'live_quiz_session',
                'post_title' => sprintf(__('Phiên Quiz %s', 'live-quiz'), date('Y-m-d H:i')),
                'post_status' => 'publish',
                'post_author' => get_current_user_id(),
            ));
            
            if (!is_wp_error($session_id)) {
                update_post_meta($session_id, '_session_quiz_id', $quiz_id);
                
                // Generate room code
                $room_code = self::generate_room_code();
                update_post_meta($session_id, '_session_room_code', $room_code);
                update_post_meta($session_id, '_session_status', 'lobby');
                
                echo '<div class="notice notice-success"><p>' . __('Đã tạo phiên mới!', 'live-quiz') . '</p></div>';
            }
        }
        
        // Get all sessions
        $sessions = get_posts(array(
            'post_type' => 'live_quiz_session',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
        ));
        
        // Get all quizzes
        $quizzes = get_posts(array(
            'post_type' => 'live_quiz',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
        ));
        
        include LIVE_QUIZ_PLUGIN_DIR . 'templates/admin-sessions.php';
    }
    
    /**
     * Render settings page
     */
    public static function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        if (isset($_POST['submit']) && check_admin_referer('live_quiz_settings')) {
            // Phase 1 settings
            update_option('live_quiz_alpha', floatval($_POST['live_quiz_alpha']));
            update_option('live_quiz_base_points', intval($_POST['live_quiz_base_points']));
            update_option('live_quiz_time_limit', intval($_POST['live_quiz_time_limit']));
            update_option('live_quiz_max_players', intval($_POST['live_quiz_max_players']));
            
            // AI settings
            if (isset($_POST['live_quiz_gemini_api_key'])) {
                $new_key = sanitize_text_field($_POST['live_quiz_gemini_api_key']);
                // Chỉ update nếu có key mới được nhập (không rỗng)
                if (!empty($new_key)) {
                    update_option('live_quiz_gemini_api_key', $new_key);
                }
                // Nếu rỗng và không có key cũ, không làm gì
                // Nếu rỗng và có key cũ, giữ nguyên key cũ
            }
            if (isset($_POST['live_quiz_gemini_model'])) {
                update_option('live_quiz_gemini_model', sanitize_text_field($_POST['live_quiz_gemini_model']));
            }
            if (isset($_POST['live_quiz_gemini_max_tokens'])) {
                $max_tokens = max(1024, min(65536, intval($_POST['live_quiz_gemini_max_tokens'])));
                update_option('live_quiz_gemini_max_tokens', $max_tokens);
            }
            if (isset($_POST['live_quiz_gemini_timeout'])) {
                $timeout = max(10, min(300, intval($_POST['live_quiz_gemini_timeout'])));
                update_option('live_quiz_gemini_timeout', $timeout);
            }
            if (isset($_POST['live_quiz_ai_prompt_single_choice'])) {
                update_option('live_quiz_ai_prompt_single_choice', wp_kses_post($_POST['live_quiz_ai_prompt_single_choice']));
            }
            if (isset($_POST['live_quiz_ai_prompt_multiple_choice'])) {
                update_option('live_quiz_ai_prompt_multiple_choice', wp_kses_post($_POST['live_quiz_ai_prompt_multiple_choice']));
            }
            
            // Phase 2 settings
            update_option('live_quiz_websocket_enabled', !empty($_POST['live_quiz_websocket_enabled']));
            update_option('live_quiz_websocket_url', sanitize_text_field($_POST['live_quiz_websocket_url']));
            update_option('live_quiz_websocket_secret', sanitize_text_field($_POST['live_quiz_websocket_secret']));
            update_option('live_quiz_websocket_jwt_secret', sanitize_text_field($_POST['live_quiz_websocket_jwt_secret']));
            update_option('live_quiz_redis_enabled', !empty($_POST['live_quiz_redis_enabled']));
            update_option('live_quiz_redis_host', sanitize_text_field($_POST['live_quiz_redis_host']));
            update_option('live_quiz_redis_port', intval($_POST['live_quiz_redis_port']));
            update_option('live_quiz_redis_password', sanitize_text_field($_POST['live_quiz_redis_password']));
            update_option('live_quiz_redis_database', intval($_POST['live_quiz_redis_database']));
            
            echo '<div class="notice notice-success"><p>' . __('Đã lưu cài đặt!', 'live-quiz') . '</p></div>';
        }
        
        include LIVE_QUIZ_PLUGIN_DIR . 'templates/admin-settings.php';
    }
    
    /**
     * Generate unique room code (PIN 6 số)
     */
    private static function generate_room_code() {
        do {
            // Tạo PIN 6 số từ 100000 đến 999999
            $code = (string) random_int(100000, 999999);
            
            $existing = get_posts(array(
                'post_type' => 'live_quiz_session',
                'meta_key' => '_session_room_code',
                'meta_value' => $code,
                'posts_per_page' => 1,
            ));
        } while (!empty($existing));
        
        return $code;
    }
}
