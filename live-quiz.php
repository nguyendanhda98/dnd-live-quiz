<?php
/**
 * Plugin Name: DND Live Quiz
 * Plugin URI: https://example.com/live-quiz
 * Description: Tổ chức phiên quiz thời gian thực với chấm điểm theo tốc độ trả lời, giống Kahoot/Quizizz. Phase 2: WebSocket + Redis cho 2000+ người chơi
 * Version: 2.0.4
 * Author: DND English Group
 * Author URI: https://example.com
 * Text Domain: live-quiz
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('LIVE_QUIZ_VERSION', '2.0.0');
define('LIVE_QUIZ_PLUGIN_FILE', __FILE__);
define('LIVE_QUIZ_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('LIVE_QUIZ_PLUGIN_URL', plugin_dir_url(__FILE__));
define('LIVE_QUIZ_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Main plugin class
 */
final class Live_Quiz {
    
    /**
     * Single instance
     */
    private static $instance = null;
    
    /**
     * Get instance
     */
    public static function instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->includes();
        $this->init_hooks();
    }
    
    /**
     * Include required files
     */
    private function includes() {
        require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-post-types.php';
        require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-rest-api.php';
        require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-scoring.php';
        require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-session-manager.php';
        require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-shortcodes.php';
        require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-admin.php';
        require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-security.php';
        require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-ai-generator.php';
        
        // Phase 2: WebSocket + Redis support
        if (file_exists(LIVE_QUIZ_PLUGIN_DIR . 'includes/class-redis-manager.php')) {
            require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-redis-manager.php';
        }
        if (file_exists(LIVE_QUIZ_PLUGIN_DIR . 'includes/class-websocket-adapter.php')) {
            require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-websocket-adapter.php';
        }
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Localization
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        
        // Initialize components
        add_action('init', array($this, 'init'), 0);
        
        // Enqueue assets
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
    }
    
    /**
     * Load plugin textdomain
     */
    public function load_textdomain() {
        load_plugin_textdomain(
            'live-quiz',
            false,
            dirname(LIVE_QUIZ_PLUGIN_BASENAME) . '/languages'
        );
    }
    
    /**
     * Initialize plugin components
     */
    public function init() {
        // Register post types
        Live_Quiz_Post_Types::init();
        
        // Initialize REST API
        Live_Quiz_REST_API::init();
        
        // Register shortcodes
        Live_Quiz_Shortcodes::init();
        
        // Initialize admin
        if (is_admin()) {
            Live_Quiz_Admin::init();
        }
        
        // Security
        Live_Quiz_Security::init();
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        global $post;
        
        // Check if we're on the host page (/play/{session_id})
        if (get_query_var('live_quiz_play')) {
            $this->enqueue_host_scripts();
            return;
        }
        
        // Check for any live quiz shortcode
        $has_player = is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'live_quiz');
        $has_create_room = is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'live_quiz_create_room');
        $has_quiz_list = is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'live_quiz_list');
        
        // Load frontend assets for create room and quiz list
        if ($has_create_room || $has_quiz_list) {
            wp_enqueue_style(
                'live-quiz-frontend',
                LIVE_QUIZ_PLUGIN_URL . 'assets/css/frontend.css',
                array(),
                LIVE_QUIZ_VERSION
            );
            
            wp_enqueue_script(
                'live-quiz-frontend',
                LIVE_QUIZ_PLUGIN_URL . 'assets/js/frontend.js',
                array('jquery'),
                LIVE_QUIZ_VERSION,
                true
            );
            
            $frontend_config = array(
                'apiUrl' => rest_url('live-quiz/v1'),
                'adminUrl' => admin_url(),
                'nonce' => wp_create_nonce('wp_rest'),
                'i18n' => array(
                    'selectQuizError' => __('Vui lòng chọn ít nhất một bộ câu hỏi', 'live-quiz'),
                    'questionCountError' => __('Vui lòng nhập số câu hỏi hợp lệ', 'live-quiz'),
                    'createError' => __('Có lỗi xảy ra khi tạo phòng', 'live-quiz'),
                    'copied' => __('Đã sao chép!', 'live-quiz'),
                ),
            );
            
            wp_localize_script('live-quiz-frontend', 'liveQuizFrontend', $frontend_config);
        }
        
        // Load player assets
        if (!$has_player) {
            return;
        }
        
        // Styles
        wp_enqueue_style(
            'live-quiz-player',
            LIVE_QUIZ_PLUGIN_URL . 'assets/css/player.css',
            array(),
            LIVE_QUIZ_VERSION
        );
        
        // WebSocket only - always load Socket.io and player-v2.js
        wp_enqueue_script(
            'socketio',
            'https://cdn.socket.io/4.7.2/socket.io.min.js',
            array(),
            '4.7.2',
            true
        );
        
        wp_enqueue_script(
            'live-quiz-player',
            LIVE_QUIZ_PLUGIN_URL . 'assets/js/player-v2.js',
            array('socketio'),
            LIVE_QUIZ_VERSION,
            true
        );
        
        // WebSocket configuration
        $websocket_url = get_option('live_quiz_websocket_url', 'http://localhost:3000');
        
        $config = array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => rest_url('live-quiz/v1'),
            'nonce' => wp_create_nonce('live_quiz_nonce'),
            'websocket' => array(
                'enabled' => true,
                'url' => $websocket_url,
            ),
            'i18n' => array(
                'enterName' => __('Nhập tên hiển thị', 'live-quiz'),
                'enterCode' => __('Nhập mã phòng', 'live-quiz'),
                'join' => __('Tham gia', 'live-quiz'),
                'waiting' => __('Đang chờ bắt đầu...', 'live-quiz'),
                'question' => __('Câu hỏi', 'live-quiz'),
                'timeRemaining' => __('Thời gian còn lại', 'live-quiz'),
                'leaderboard' => __('Bảng xếp hạng', 'live-quiz'),
                'yourScore' => __('Điểm của bạn', 'live-quiz'),
                'correct' => __('Chính xác!', 'live-quiz'),
                'incorrect' => __('Sai rồi!', 'live-quiz'),
                'waiting_next' => __('Chờ câu tiếp theo...', 'live-quiz'),
                'quiz_ended' => __('Quiz đã kết thúc', 'live-quiz'),
                'final_results' => __('Kết quả cuối cùng', 'live-quiz'),
                'connection_lost' => __('Mất kết nối... Đang kết nối lại', 'live-quiz'),
                'connection_restored' => __('Đã kết nối lại', 'live-quiz'),
            )
        );
        
        wp_localize_script('live-quiz-player', 'liveQuizConfig', $config);
    }
    
    /**
     * Enqueue host scripts and styles
     */
    public function enqueue_host_scripts() {
        // Enqueue host CSS
        wp_enqueue_style(
            'live-quiz-host',
            LIVE_QUIZ_PLUGIN_URL . 'assets/css/host.css',
            array(),
            LIVE_QUIZ_VERSION
        );
        
        // WebSocket - load Socket.io
        wp_enqueue_script(
            'socketio',
            'https://cdn.socket.io/4.7.2/socket.io.min.js',
            array(),
            '4.7.2',
            true
        );
        
        // Enqueue host JS
        wp_enqueue_script(
            'live-quiz-host',
            LIVE_QUIZ_PLUGIN_URL . 'assets/js/host.js',
            array('jquery', 'socketio'),
            LIVE_QUIZ_VERSION,
            true
        );
        
        // Configuration
        $websocket_url = get_option('live_quiz_websocket_url', 'http://localhost:3000');
        $websocket_secret = get_option('live_quiz_websocket_secret', '');
        
        $config = array(
            'apiUrl' => rest_url('live-quiz/v1'),
            'nonce' => wp_create_nonce('wp_rest'),
            'wsUrl' => $websocket_url,
            'wsSecret' => $websocket_secret,
        );
        
        wp_localize_script('live-quiz-host', 'liveQuizPlayer', $config);
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function admin_enqueue_scripts($hook) {
        global $post_type, $post;
        
        // Detect current post type
        $current_post_type = $post_type;
        if (!$current_post_type && isset($_GET['post'])) {
            $current_post_type = get_post_type($_GET['post']);
        }
        if (!$current_post_type && isset($post->post_type)) {
            $current_post_type = $post->post_type;
        }
        
        // Load on quiz admin pages and quiz edit pages
        $quiz_pages = array('toplevel_page_live-quiz', 'live-quiz_page_live-quiz-sessions', 'live-quiz_page_live-quiz-settings', 'live_quiz_page_live-quiz-sessions', 'live_quiz_page_live-quiz-settings');
        $is_quiz_edit = (in_array($hook, array('post.php', 'post-new.php')) && $current_post_type === 'live_quiz');
        
        // Debug: Log the hook to see what it actually is
        error_log('Live Quiz Admin Hook: ' . $hook);
        
        if (!in_array($hook, $quiz_pages) && !$is_quiz_edit) {
            return;
        }
        
        // Styles
        wp_enqueue_style(
            'live-quiz-admin',
            LIVE_QUIZ_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            LIVE_QUIZ_VERSION
        );
        
        // Scripts
        wp_enqueue_script(
            'live-quiz-admin',
            LIVE_QUIZ_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            LIVE_QUIZ_VERSION . '-' . time(), // Add timestamp to bust cache
            true
        );
        
        // Localize script
        wp_localize_script('live-quiz-admin', 'liveQuizAdmin', array(
            'restUrl' => rest_url('live-quiz/v1'),
            'nonce' => wp_create_nonce('wp_rest'),
            'sseUrl' => add_query_arg('live_quiz_sse', '1', home_url('/')),
            'hook' => $hook,
            'postType' => $current_post_type,
            'debug' => true,
            'i18n' => array(
                'confirm_delete' => __('Bạn có chắc muốn xóa?', 'live-quiz'),
                'confirm_end' => __('Kết thúc phiên quiz?', 'live-quiz'),
                'error' => __('Có lỗi xảy ra', 'live-quiz'),
                'saved' => __('Đã lưu', 'live-quiz'),
            )
        ));
    }
}

/**
 * Initialize plugin
 */
function live_quiz() {
    return Live_Quiz::instance();
}

// Start the plugin
live_quiz();

/**
 * Activation hook
 */
register_activation_hook(__FILE__, function() {
    // Register post types and rewrite rules
    Live_Quiz_Post_Types::register();
    
    // Set default options - Phase 1
    add_option('live_quiz_alpha', 0.3);
    add_option('live_quiz_base_points', 1000);
    add_option('live_quiz_time_limit', 20);
    add_option('live_quiz_max_players', 500);
    
    // Phase 2 options
    add_option('live_quiz_websocket_enabled', false);
    add_option('live_quiz_websocket_url', 'http://localhost:3000');
    add_option('live_quiz_websocket_secret', '');
    add_option('live_quiz_jwt_secret', '');
    add_option('live_quiz_redis_enabled', false);
    add_option('live_quiz_redis_host', '127.0.0.1');
    add_option('live_quiz_redis_port', 6379);
    add_option('live_quiz_redis_password', '');
    add_option('live_quiz_redis_database', 0);
    
    // Permalink settings
    add_option('live_quiz_play_base', 'play');
    
    // Flush rewrite rules
    flush_rewrite_rules();
});

/**
 * Deactivation hook
 */
register_deactivation_hook(__FILE__, function() {
    // Flush rewrite rules
    flush_rewrite_rules();
    
    // Clean up transients
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_live_quiz_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_live_quiz_%'");
});
