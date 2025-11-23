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
