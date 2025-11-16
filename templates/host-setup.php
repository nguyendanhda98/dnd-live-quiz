<?php
/**
 * Host Setup Template - Form chọn quiz và thiết lập phòng
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

$user_id = get_current_user_id();

?>
<div class="live-quiz-host-setup-wrapper">
    <div class="live-quiz-host-setup-container">
        <div class="setup-header">
            <h1><?php _e('🎯 Tạo phòng Quiz mới', 'live-quiz'); ?></h1>
            <p class="subtitle"><?php _e('Tạo phòng ngay, cấu hình chi tiết sau trong phòng chờ', 'live-quiz'); ?></p>
        </div>

        <!-- Simple Create Room Card -->
        <div class="setup-card simple-create">
            <div class="create-room-info">
                <div class="info-icon">🚀</div>
                <h3><?php _e('Bắt đầu nhanh', 'live-quiz'); ?></h3>
                <p><?php _e('Click để tạo phòng mới. Bạn sẽ cấu hình chi tiết (chọn bộ câu hỏi, số lượng câu, thứ tự...) trong phòng chờ trước khi bắt đầu.', 'live-quiz'); ?></p>
            </div>
            
            <button id="create-room-btn" class="btn btn-primary btn-large btn-create-room">
                <?php _e('🎮 Tạo phòng mới', 'live-quiz'); ?>
            </button>
            
            <div id="form-error" class="error-message" style="display: none;"></div>
        </div>

        <!-- Recent Sessions (Optional) -->
        <?php
        $recent_sessions = get_posts(array(
            'post_type' => 'live_quiz_session',
            'posts_per_page' => 5,
            'author' => $user_id,
            'orderby' => 'date',
            'order' => 'DESC',
        ));
        
        if (!empty($recent_sessions)): ?>
        <div class="recent-sessions">
            <h3><?php _e('Phòng gần đây', 'live-quiz'); ?></h3>
            <div class="sessions-list">
                <?php foreach ($recent_sessions as $session_post): 
                    $session_id = $session_post->ID;
                    $room_code = get_post_meta($session_id, '_session_room_code', true);
                    $session_status = get_post_meta($session_id, '_session_status', true);
                    $created_date = get_the_date('d/m/Y H:i', $session_post);
                ?>
                <div class="session-item">
                    <div class="session-info">
                        <h4><?php echo esc_html($session_post->post_title); ?></h4>
                        <span class="session-meta">PIN: <strong><?php echo esc_html($room_code); ?></strong> | <?php echo esc_html($created_date); ?></span>
                        <span class="session-status status-<?php echo esc_attr($session_status); ?>"><?php echo esc_html($session_status); ?></span>
                    </div>
                    <a href="?session_id=<?php echo $session_id; ?>" class="btn btn-small btn-secondary">
                        <?php _e('Mở phòng', 'live-quiz'); ?>
                    </a>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <script>
        // Pass data to JavaScript
        window.liveQuizSetup = {
            restUrl: '<?php echo esc_js(rest_url('live-quiz/v1')); ?>',
            nonce: '<?php echo wp_create_nonce('wp_rest'); ?>',
            userId: <?php echo json_encode($user_id); ?>
        };
    </script>
</div>
