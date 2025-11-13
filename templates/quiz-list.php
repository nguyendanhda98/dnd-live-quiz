<?php
/**
 * Template for quiz list with pagination
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

$per_page = isset($atts['per_page']) ? absint($atts['per_page']) : 10;
?>

<div class="live-quiz-list-container" data-per-page="<?php echo esc_attr($per_page); ?>">
    <div class="quiz-list-header">
        <h2><?php _e('Danh sách bộ câu hỏi', 'live-quiz'); ?></h2>
        
        <!-- Per Page Selector -->
        <div class="per-page-selector">
            <label for="quiz-per-page"><?php _e('Hiển thị:', 'live-quiz'); ?></label>
            <select id="quiz-per-page" class="per-page-select">
                <option value="5" <?php selected($per_page, 5); ?>>5</option>
                <option value="10" <?php selected($per_page, 10); ?>>10</option>
                <option value="20" <?php selected($per_page, 20); ?>>20</option>
                <option value="50" <?php selected($per_page, 50); ?>>50</option>
            </select>
            <span><?php _e('bộ câu hỏi / trang', 'live-quiz'); ?></span>
        </div>
    </div>
    
    <!-- Quiz List -->
    <div class="quiz-list" id="quiz-list">
        <div class="quiz-list-loading">
            <span class="spinner"></span>
            <?php _e('Đang tải...', 'live-quiz'); ?>
        </div>
        
        <div class="quiz-items" style="display: none;">
            <!-- Quiz items will be loaded here via AJAX -->
        </div>
        
        <div class="quiz-list-empty" style="display: none;">
            <p><?php _e('Không có bộ câu hỏi nào.', 'live-quiz'); ?></p>
        </div>
    </div>
    
    <!-- Pagination -->
    <div class="quiz-list-pagination" id="quiz-list-pagination" style="display: none;">
        <div class="pagination-info">
            <span class="pagination-text">
                <?php _e('Hiển thị', 'live-quiz'); ?>
                <strong class="pagination-from">1</strong> - 
                <strong class="pagination-to">10</strong>
                <?php _e('trong tổng số', 'live-quiz'); ?>
                <strong class="pagination-total">0</strong>
                <?php _e('bộ câu hỏi', 'live-quiz'); ?>
            </span>
        </div>
        
        <div class="pagination-controls">
            <button type="button" class="btn-page btn-first" id="btn-first-page" disabled>
                <span>«</span>
            </button>
            <button type="button" class="btn-page btn-prev" id="btn-prev-page" disabled>
                <span>‹</span>
            </button>
            
            <span class="pagination-pages">
                <?php _e('Trang', 'live-quiz'); ?>
                <input 
                    type="number" 
                    id="current-page-input" 
                    class="current-page-input"
                    value="1"
                    min="1"
                />
                <?php _e('trên', 'live-quiz'); ?>
                <span class="total-pages">1</span>
            </span>
            
            <button type="button" class="btn-page btn-next" id="btn-next-page">
                <span>›</span>
            </button>
            <button type="button" class="btn-page btn-last" id="btn-last-page">
                <span>»</span>
            </button>
        </div>
    </div>
</div>
