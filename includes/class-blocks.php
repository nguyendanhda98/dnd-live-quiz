<?php
/**
 * Gutenberg Blocks for Live Quiz
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_Blocks {
    
    /**
     * Initialize
     */
    public static function init() {
        add_action('init', array(__CLASS__, 'register_blocks'));
        add_action('enqueue_block_editor_assets', array(__CLASS__, 'enqueue_block_editor_assets'));
    }
    
    /**
     * Register blocks
     */
    public static function register_blocks() {
        // Register Create Room block
        register_block_type('live-quiz/create-room', array(
            'render_callback' => array(__CLASS__, 'render_create_room_block'),
            'attributes' => array(
                'buttonText' => array(
                    'type' => 'string',
                    'default' => 'Tạo phòng Quiz'
                ),
                'buttonAlign' => array(
                    'type' => 'string',
                    'default' => 'center'
                )
            )
        ));
        
        // Register Join Room block
        register_block_type('live-quiz/join-room', array(
            'render_callback' => array(__CLASS__, 'render_join_room_block'),
            'attributes' => array(
                'title' => array(
                    'type' => 'string',
                    'default' => 'Tham gia Live Quiz'
                ),
                'showTitle' => array(
                    'type' => 'boolean',
                    'default' => true
                )
            )
        ));
    }
    
    /**
     * Enqueue block editor assets
     */
    public static function enqueue_block_editor_assets() {
        wp_enqueue_script(
            'live-quiz-blocks',
            LIVE_QUIZ_PLUGIN_URL . 'assets/js/blocks.js',
            array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components'),
            LIVE_QUIZ_VERSION,
            true
        );
        
        wp_enqueue_style(
            'live-quiz-blocks-editor',
            LIVE_QUIZ_PLUGIN_URL . 'assets/css/blocks-editor.css',
            array('wp-edit-blocks'),
            LIVE_QUIZ_VERSION
        );
    }
    
    /**
     * Render Create Room block
     */
    public static function render_create_room_block($attributes) {
        // Check if user is logged in and has permission
        if (!is_user_logged_in() || !current_user_can('edit_posts')) {
            return '<div class="live-quiz-error">' . __('Bạn cần đăng nhập với tài khoản giáo viên để tạo phòng.', 'live-quiz') . '</div>';
        }
        
        $button_text = isset($attributes['buttonText']) ? $attributes['buttonText'] : 'Tạo phòng Quiz';
        $button_align = isset($attributes['buttonAlign']) ? $attributes['buttonAlign'] : 'center';
        
        ob_start();
        include LIVE_QUIZ_PLUGIN_DIR . 'templates/create-room.php';
        return ob_get_clean();
    }
    
    /**
     * Render Join Room block
     */
    public static function render_join_room_block($attributes) {
        $title = isset($attributes['title']) ? $attributes['title'] : 'Tham gia Live Quiz';
        $show_title = isset($attributes['showTitle']) ? $attributes['showTitle'] : true;
        
        ob_start();
        include LIVE_QUIZ_PLUGIN_DIR . 'templates/player.php';
        return ob_get_clean();
    }
}
