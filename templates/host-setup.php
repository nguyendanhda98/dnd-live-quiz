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
            <h1><?php _e('🎯 Tạo phòng Quiz', 'live-quiz'); ?></h1>
            <p class="subtitle"><?php _e('Chọn bộ câu hỏi và thiết lập phòng học', 'live-quiz'); ?></p>
        </div>

        <!-- New Session Setup -->
        <div class="setup-card">
            <form id="host-setup-form">
                
                <!-- Quiz Selection -->
                <div class="form-section">
                    <h3><?php _e('1. Chọn bộ câu hỏi', 'live-quiz'); ?></h3>
                    <p class="form-help"><?php _e('Chọn một hoặc nhiều bộ câu hỏi để tạo phòng', 'live-quiz'); ?></p>
                    
                    <div class="quiz-search-container">
                        <div class="search-input-wrapper">
                            <input 
                                type="text" 
                                id="quiz-search-input" 
                                class="search-input"
                                placeholder="<?php esc_attr_e('Tìm kiếm bộ câu hỏi... (nhập ít nhất 1 ký tự)', 'live-quiz'); ?>"
                                autocomplete="off">
                            <span class="search-icon">🔍</span>
                        </div>
                        <div id="quiz-search-results" class="quiz-search-results" style="display: none;">
                            <!-- Search results will be displayed here -->
                        </div>
                    </div>
                    
                    <div id="selected-quizzes" class="selected-quizzes">
                        <p class="no-selection"><?php _e('Chưa chọn bộ câu hỏi nào', 'live-quiz'); ?></p>
                    </div>
                </div>

                <!-- Quiz Type Selection -->
                <div class="form-section">
                    <h3><?php _e('2. Loại kiểm tra', 'live-quiz'); ?></h3>
                    
                    <div class="quiz-type-options">
                        <label class="radio-card">
                            <input type="radio" name="quiz_type" value="all" checked>
                            <div class="radio-content">
                                <div class="radio-icon">📚</div>
                                <div class="radio-label"><?php _e('Toàn bộ câu hỏi', 'live-quiz'); ?></div>
                                <div class="radio-description"><?php _e('Sử dụng tất cả câu hỏi từ bộ đã chọn', 'live-quiz'); ?></div>
                            </div>
                        </label>
                        
                        <label class="radio-card">
                            <input type="radio" name="quiz_type" value="random">
                            <div class="radio-content">
                                <div class="radio-icon">🎲</div>
                                <div class="radio-label"><?php _e('Chọn ngẫu nhiên', 'live-quiz'); ?></div>
                                <div class="radio-description"><?php _e('Chọn số lượng câu hỏi ngẫu nhiên', 'live-quiz'); ?></div>
                            </div>
                        </label>
                    </div>
                    
                    <div id="random-count-container" class="random-count-container" style="display: none;">
                        <label for="question-count"><?php _e('Số câu hỏi:', 'live-quiz'); ?></label>
                        <input 
                            type="number" 
                            id="question-count" 
                            name="question_count"
                            min="1"
                            max="100"
                            value="10"
                            class="number-input">
                        <span class="input-help" id="total-questions-hint"></span>
                    </div>
                </div>

                <!-- Session Name (Optional) -->
                <div class="form-section">
                    <h3><?php _e('3. Tên phòng (tùy chọn)', 'live-quiz'); ?></h3>
                    <input 
                        type="text" 
                        id="session-name" 
                        name="session_name"
                        class="text-input"
                        placeholder="<?php esc_attr_e('Ví dụ: Kiểm tra Unit 1 - Lớp 10A', 'live-quiz'); ?>">
                </div>

                <!-- Create Button -->
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-large" id="create-room-btn" disabled>
                        <?php _e('🚀 Tạo phòng', 'live-quiz'); ?>
                    </button>
                    <div id="form-error" class="error-message" style="display: none;"></div>
                </div>
                
            </form>
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
