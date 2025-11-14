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
define('LIVE_QUIZ_VERSION', '2.1.0');
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
        
        // JWT Helper for WebSocket authentication
        require_once LIVE_QUIZ_PLUGIN_DIR . 'includes/class-jwt-helper.php';
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
        
        // Admin notices
        add_action('admin_notices', array($this, 'admin_notices'));
        
        // AJAX handler for dismissing notice
        add_action('wp_ajax_live_quiz_dismiss_notice', array($this, 'dismiss_notice'));
    }
    
    /**
     * Show admin notices
     */
    public function admin_notices() {
        // Check if need to show permalink flush notice
        $dismissed = get_option('live_quiz_dismissed_flush_notice', false);
        if (!$dismissed) {
            ?>
            <div class="notice notice-warning is-dismissible" data-dismissible="live-quiz-flush-notice">
                <p>
                    <strong><?php _e('DND Live Quiz:', 'live-quiz'); ?></strong> 
                    <?php _e('Các routes /host và /play đã được xóa. Vui lòng vào ', 'live-quiz'); ?>
                    <a href="<?php echo admin_url('options-permalink.php'); ?>">
                        <?php _e('Settings > Permalinks', 'live-quiz'); ?>
                    </a>
                    <?php _e(' và nhấn "Save Changes" để làm mới rewrite rules. Sau đó bạn có thể tự tạo các trang player và host bằng shortcodes.', 'live-quiz'); ?>
                </p>
            </div>
            <script>
            jQuery(document).ready(function($) {
                $(document).on('click', '.notice[data-dismissible="live-quiz-flush-notice"] .notice-dismiss', function() {
                    $.post(ajaxurl, {
                        action: 'live_quiz_dismiss_notice'
                    });
                });
            });
            </script>
            <?php
        }
    }
    
    /**
     * Dismiss admin notice
     */
    public function dismiss_notice() {
        update_option('live_quiz_dismissed_flush_notice', true);
        wp_die();
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
        
        // Initialize admin
        if (is_admin()) {
            Live_Quiz_Admin::init();
        }
        
        // Security
        Live_Quiz_Security::init();
        
        // Register shortcodes
        $this->register_shortcodes();
    }
    
    /**
     * Register shortcodes
     */
    private function register_shortcodes() {
        add_shortcode('live_quiz_player', array($this, 'shortcode_player'));
        add_shortcode('live_quiz_host', array($this, 'shortcode_host'));
        add_shortcode('live_quiz_sessions', array($this, 'shortcode_sessions'));
        
        // Backward compatibility
        add_shortcode('live_quiz', array($this, 'shortcode_player'));
    }
    
    /**
     * Player shortcode
     */
    public function shortcode_player($atts) {
        $atts = shortcode_atts(array(
            'title' => __('Tham gia Live Quiz', 'live-quiz'),
            'show_title' => 'yes',
        ), $atts, 'live_quiz_player');
        
        ob_start();
        
        // Set query vars for template
        set_query_var('player_title', $atts['title']);
        set_query_var('show_title', $atts['show_title']);
        
        include LIVE_QUIZ_PLUGIN_DIR . 'templates/player.php';
        
        return ob_get_clean();
    }
    
    /**
     * Host shortcode
     */
    public function shortcode_host($atts) {
        // Check permission - anyone logged in can host
        if (!is_user_logged_in()) {
            return '<p>' . __('Bạn cần đăng nhập để sử dụng tính năng này.', 'live-quiz') . '</p>';
        }
        
        $atts = shortcode_atts(array(
            'session_id' => 0,
        ), $atts, 'live_quiz_host');
        
        $session_id = intval($atts['session_id']);
        
        // If session_id is provided, show the host interface directly
        if ($session_id > 0) {
            // Verify session exists and user has permission
            $session_post = get_post($session_id);
            if (!$session_post || $session_post->post_type !== 'live_quiz_session') {
                return '<p>' . __('Phòng không tồn tại.', 'live-quiz') . '</p>';
            }
            
            // Check if user is the host
            if ($session_post->post_author != get_current_user_id() && !current_user_can('manage_options')) {
                return '<p>' . __('Bạn không có quyền truy cập phòng này.', 'live-quiz') . '</p>';
            }
            
            // Set the session_id as query var for the template
            set_query_var('session_id', $session_id);
            
            ob_start();
            include LIVE_QUIZ_PLUGIN_DIR . 'templates/host.php';
            return ob_get_clean();
        }
        
        // Check if user has any active session (auto-open the room)
        $user_id = get_current_user_id();
        
        // Always query directly - simple and fast enough
        global $wpdb;
        $session_id = $wpdb->get_var($wpdb->prepare(
            "SELECT p.ID FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
            WHERE p.post_type = 'live_quiz_session'
            AND p.post_author = %d
            AND p.post_status = 'publish'
            AND pm.meta_key = '_session_status'
            AND pm.meta_value IN ('lobby', 'playing', 'question', 'results')
            ORDER BY p.post_date DESC
            LIMIT 1",
            $user_id
        ));
        
        // If user has an active session, open it automatically
        if ($session_id) {
            set_query_var('session_id', $session_id);
            
            ob_start();
            include LIVE_QUIZ_PLUGIN_DIR . 'templates/host.php';
            return ob_get_clean();
        }
        
        // Otherwise, show the setup form
        ob_start();
        include LIVE_QUIZ_PLUGIN_DIR . 'templates/host-setup.php';
        return ob_get_clean();
    }
    
    /**
     * Generate unique room code
     */
    private function generate_room_code() {
        global $wpdb;
        
        do {
            $code = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
            
            // Check if code exists
            $exists = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->postmeta} 
                WHERE meta_key = '_session_room_code' 
                AND meta_value = %s",
                $code
            ));
        } while ($exists > 0);
        
        return $code;
    }
    
    /**
     * Sessions shortcode
     */
    public function shortcode_sessions($atts) {
        // Check permission
        if (!current_user_can('edit_posts')) {
            return '<p>' . __('Bạn không có quyền truy cập tính năng này.', 'live-quiz') . '</p>';
        }
        
        $atts = shortcode_atts(array(
            'per_page' => 10,
        ), $atts, 'live_quiz_sessions');
        
        ob_start();
        ?>
        <div class="live-quiz-sessions-wrapper">
            <h2><?php _e('Phiên Quiz', 'live-quiz'); ?></h2>
            <div id="live-quiz-sessions-list">
                <?php
                // Query sessions
                $args = array(
                    'post_type' => 'live_session',
                    'posts_per_page' => intval($atts['per_page']),
                    'post_status' => array('publish', 'draft'),
                    'orderby' => 'date',
                    'order' => 'DESC',
                );
                
                $sessions = get_posts($args);
                
                if ($sessions) {
                    echo '<table class="live-quiz-sessions-table">';
                    echo '<thead><tr>';
                    echo '<th>' . __('Mã PIN', 'live-quiz') . '</th>';
                    echo '<th>' . __('Quiz', 'live-quiz') . '</th>';
                    echo '<th>' . __('Trạng thái', 'live-quiz') . '</th>';
                    echo '<th>' . __('Người chơi', 'live-quiz') . '</th>';
                    echo '<th>' . __('Ngày tạo', 'live-quiz') . '</th>';
                    echo '<th>' . __('Hành động', 'live-quiz') . '</th>';
                    echo '</tr></thead>';
                    echo '<tbody>';
                    
                    foreach ($sessions as $session) {
                        $pin = get_post_meta($session->ID, '_pin_code', true);
                        $quiz_id = get_post_meta($session->ID, '_quiz_id', true);
                        $quiz = get_post($quiz_id);
                        $status = get_post_meta($session->ID, '_status', true);
                        $player_count = get_post_meta($session->ID, '_player_count', true);
                        
                        echo '<tr>';
                        echo '<td><strong>' . esc_html($pin) . '</strong></td>';
                        echo '<td>' . ($quiz ? esc_html($quiz->post_title) : '-') . '</td>';
                        echo '<td>' . esc_html($status) . '</td>';
                        echo '<td>' . intval($player_count) . '</td>';
                        echo '<td>' . get_the_date('', $session) . '</td>';
                        echo '<td><a href="' . get_permalink($session) . '">' . __('Xem', 'live-quiz') . '</a></td>';
                        echo '</tr>';
                    }
                    
                    echo '</tbody>';
                    echo '</table>';
                } else {
                    echo '<p>' . __('Chưa có phiên nào.', 'live-quiz') . '</p>';
                }
                ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        global $post;
        
        // Check if shortcodes are being used on current page
        if (!is_singular() || !isset($post->post_content)) {
            return;
        }
        
        // Check for player shortcode
        if (has_shortcode($post->post_content, 'live_quiz_player') || has_shortcode($post->post_content, 'live_quiz')) {
            $this->enqueue_player_scripts();
        }
        
        // Check for host shortcode
        if (has_shortcode($post->post_content, 'live_quiz_host')) {
            $this->enqueue_host_scripts();
        }
    }
    
    /**
     * Enqueue player scripts
     */
    private function enqueue_player_scripts() {
        // Player CSS
        wp_enqueue_style(
            'live-quiz-player',
            LIVE_QUIZ_PLUGIN_URL . 'assets/css/player.css',
            array(),
            LIVE_QUIZ_VERSION
        );
        
        // Socket.io library
        wp_enqueue_script(
            'socketio',
            'https://cdn.socket.io/4.7.2/socket.io.min.js',
            array(),
            '4.7.2',
            true
        );
        
        // Player JS
        wp_enqueue_script(
            'live-quiz-player',
            LIVE_QUIZ_PLUGIN_URL . 'assets/js/player.js',
            array('socketio'),
            LIVE_QUIZ_VERSION,
            true
        );
        
        // Configuration
        $websocket_url = get_option('live_quiz_websocket_url', 'http://localhost:3000');
        $websocket_secret = get_option('live_quiz_websocket_secret', '');
        
        $config = array(
            'restUrl' => rest_url('live-quiz/v1'),
            'nonce' => wp_create_nonce('live_quiz_nonce'),
            'websocket' => array(
                'enabled' => true,
                'url' => $websocket_url,
                'secret' => $websocket_secret,
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
                'error' => __('Có lỗi xảy ra', 'live-quiz'),
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
        
        // Enqueue host setup CSS
        wp_enqueue_style(
            'live-quiz-host-setup',
            LIVE_QUIZ_PLUGIN_URL . 'assets/css/host-setup.css',
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
        
        // Enqueue host setup JS
        wp_enqueue_script(
            'live-quiz-host-setup',
            LIVE_QUIZ_PLUGIN_URL . 'assets/js/host-setup.js',
            array('jquery'),
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
    // Register post types
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
    add_option('live_quiz_websocket_jwt_secret', '');
    add_option('live_quiz_redis_enabled', false);
    add_option('live_quiz_redis_host', '127.0.0.1');
    add_option('live_quiz_redis_port', 6379);
    add_option('live_quiz_redis_password', '');
    add_option('live_quiz_redis_database', 0);
});

/**
 * Deactivation hook
 */
register_deactivation_hook(__FILE__, function() {
    // Clean up transients
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_live_quiz_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_live_quiz_%'");
});
