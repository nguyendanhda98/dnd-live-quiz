<?php
/**
 * Template for create room form
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="live-quiz-create-room" data-theme="<?php echo esc_attr($atts['theme']); ?>">
    <!-- Form tạo phòng -->
    <div class="create-room-container" id="create-room-form-container">
        <h2><?php _e('Tạo phòng Quiz mới', 'live-quiz'); ?></h2>
        
        <form id="live-quiz-create-room-form">
            <!-- Quiz Selection -->
            <div class="form-group">
                <label for="quiz-search">
                    <?php _e('Chọn bộ câu hỏi', 'live-quiz'); ?> <span class="required">*</span>
                </label>
                <div class="quiz-search-container">
                    <input 
                        type="text" 
                        id="quiz-search" 
                        class="quiz-search-input"
                        placeholder="<?php esc_attr_e('Nhập ít nhất 1 ký tự để tìm kiếm...', 'live-quiz'); ?>"
                        autocomplete="off"
                    />
                    <div class="quiz-search-dropdown" style="display: none;">
                        <div class="quiz-search-loading" style="display: none;">
                            <span class="spinner"></span>
                            <?php _e('Đang tìm kiếm...', 'live-quiz'); ?>
                        </div>
                        <div class="quiz-search-results"></div>
                        <div class="quiz-search-no-results" style="display: none;">
                            <?php _e('Không tìm thấy bộ câu hỏi nào', 'live-quiz'); ?>
                        </div>
                    </div>
                </div>
                
                <!-- Selected Quizzes -->
                <div class="selected-quizzes" id="selected-quizzes">
                    <!-- Selected quizzes will be added here dynamically -->
                </div>
            </div>
            
            <!-- Question Mode -->
            <div class="form-group">
                <label><?php _e('Chế độ câu hỏi', 'live-quiz'); ?> <span class="required">*</span></label>
                <div class="radio-group">
                    <label class="radio-option">
                        <input 
                            type="radio" 
                            name="question_mode" 
                            value="all" 
                            checked
                        />
                        <span><?php _e('Sử dụng toàn bộ câu hỏi', 'live-quiz'); ?></span>
                    </label>
                    <label class="radio-option">
                        <input 
                            type="radio" 
                            name="question_mode" 
                            value="random"
                        />
                        <span><?php _e('Chọn ngẫu nhiên X câu hỏi', 'live-quiz'); ?></span>
                    </label>
                </div>
            </div>
            
            <!-- Random Question Count -->
            <div class="form-group" id="random-question-count-group" style="display: none;">
                <label for="question-count">
                    <?php _e('Số câu hỏi', 'live-quiz'); ?> <span class="required">*</span>
                </label>
                <input 
                    type="number" 
                    id="question-count" 
                    name="question_count"
                    min="1"
                    value="1"
                    placeholder="<?php esc_attr_e('Nhập số câu hỏi...', 'live-quiz'); ?>"
                />
                <small class="form-help">
                    <?php _e('Số câu hỏi sẽ được chọn ngẫu nhiên từ tổng số câu hỏi trong các bộ đã chọn', 'live-quiz'); ?>
                </small>
            </div>
            
            <!-- Submit Button -->
            <div class="form-group">
                <button type="submit" class="btn-create-room" id="btn-create-room">
                    <span class="btn-text"><?php _e('Tạo phòng', 'live-quiz'); ?></span>
                    <span class="btn-loading" style="display: none;">
                        <span class="spinner"></span>
                        <?php _e('Đang tạo...', 'live-quiz'); ?>
                    </span>
                </button>
            </div>
            
            <!-- Messages -->
            <div class="form-messages">
                <div class="form-error" style="display: none;"></div>
                <div class="form-success" style="display: none;"></div>
            </div>
        </form>
        
        <!-- Created Room Modal -->
        <div class="room-created-modal" id="room-created-modal" style="display: none;">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3><?php _e('Phòng đã được tạo thành công!', 'live-quiz'); ?></h3>
                </div>
                <div class="modal-body">
                    <div class="room-info">
                        <div class="room-code-display">
                            <label><?php _e('Mã phòng:', 'live-quiz'); ?></label>
                            <div class="room-code" id="created-room-code">------</div>
                            <button type="button" class="btn-copy-code" id="btn-copy-code">
                                <?php _e('Sao chép', 'live-quiz'); ?>
                            </button>
                        </div>
                        <div class="room-stats">
                            <div class="stat-item">
                                <span class="stat-label"><?php _e('Số câu hỏi:', 'live-quiz'); ?></span>
                                <span class="stat-value" id="created-question-count">0</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <a href="#" class="btn-manage-room" id="btn-manage-room" target="_blank">
                        <?php _e('Quản lý phòng', 'live-quiz'); ?>
                    </a>
                    <button type="button" class="btn-close-modal" id="btn-close-modal">
                        <?php _e('Đóng', 'live-quiz'); ?>
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Host Interface Container (sẽ hiển thị sau khi tạo phòng) -->
    <div class="host-interface-container" id="host-interface-container" style="display: none;">
        <!-- Host interface sẽ được load động vào đây -->
    </div>
</div>
