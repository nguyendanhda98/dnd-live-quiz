<?php
/**
 * Shortcodes
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_Shortcodes {
    
    /**
     * Initialize
     */
    public static function init() {
        add_shortcode('live_quiz', array(__CLASS__, 'render_live_quiz'));
        add_shortcode('live_quiz_create_room', array(__CLASS__, 'render_create_room'));
        add_shortcode('live_quiz_list', array(__CLASS__, 'render_quiz_list'));
    }
    
    /**
     * Render live quiz player interface
     * 
     * Usage: [live_quiz]
     * @deprecated Sử dụng Gutenberg Block "Live Quiz - Tham gia" thay thế
     */
    public static function render_live_quiz($atts) {
        // Show deprecation notice for admin users
        if (current_user_can('manage_options')) {
            $notice = '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 15px;">';
            $notice .= '<strong>⚠️ Thông báo:</strong> Shortcode <code>[live_quiz]</code> đang lỗi thời. ';
            $notice .= 'Vui lòng sử dụng Gutenberg Block <strong>"Live Quiz - Tham gia"</strong> thay thế.';
            $notice .= '</div>';
        } else {
            $notice = '';
        }
        
        $atts = shortcode_atts(array(
            'theme' => 'default',
        ), $atts);
        
        ob_start();
        echo $notice;
        include LIVE_QUIZ_PLUGIN_DIR . 'templates/player.php';
        return ob_get_clean();
    }
    
    /**
     * Render create room form
     * 
     * Usage: [live_quiz_create_room]
     * @deprecated Sử dụng Gutenberg Block "Live Quiz - Tạo phòng" thay thế
     */
    public static function render_create_room($atts) {
        // Check if user is logged in and has permission
        if (!is_user_logged_in() || !current_user_can('edit_posts')) {
            return '<div class="live-quiz-error">' . __('Bạn cần đăng nhập với tài khoản giáo viên để tạo phòng.', 'live-quiz') . '</div>';
        }
        
        // Show deprecation notice for admin users
        $notice = '';
        if (current_user_can('manage_options')) {
            $notice = '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 15px;">';
            $notice .= '<strong>⚠️ Thông báo:</strong> Shortcode <code>[live_quiz_create_room]</code> đang lỗi thời. ';
            $notice .= 'Vui lòng sử dụng Gutenberg Block <strong>"Live Quiz - Tạo phòng"</strong> thay thế.';
            $notice .= '</div>';
        }
        
        $atts = shortcode_atts(array(
            'theme' => 'default',
        ), $atts);
        
        ob_start();
        echo $notice;
        include LIVE_QUIZ_PLUGIN_DIR . 'templates/create-room.php';
        return ob_get_clean();
    }
    
    /**
     * Render quiz list with pagination
     * 
     * Usage: [live_quiz_list per_page="10"]
     * @deprecated Sử dụng Gutenberg Block "Live Quiz - Danh sách" thay thế
     */
    public static function render_quiz_list($atts) {
        // Show deprecation notice for admin users
        $notice = '';
        if (current_user_can('manage_options')) {
            $notice = '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 15px;">';
            $notice .= '<strong>⚠️ Thông báo:</strong> Shortcode <code>[live_quiz_list]</code> đang lỗi thời. ';
            $notice .= 'Vui lòng sử dụng Gutenberg Block <strong>"Live Quiz - Danh sách"</strong> thay thế.';
            $notice .= '</div>';
        }
        
        $atts = shortcode_atts(array(
            'per_page' => 10,
        ), $atts);
        
        ob_start();
        echo $notice;
        include LIVE_QUIZ_PLUGIN_DIR . 'templates/quiz-list.php';
        return ob_get_clean();
    }
}
