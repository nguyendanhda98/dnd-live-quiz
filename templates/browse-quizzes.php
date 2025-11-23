<?php
/**
 * Browse Quizzes Template
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

$per_page = get_query_var('per_page', 12);
$show_search = get_query_var('show_search', true);
$show_filters = get_query_var('show_filters', true);
?>

<div class="live-quiz-browse-wrapper">
    <div class="live-quiz-browse-header">
        <h2 class="live-quiz-browse-title"><?php _e('Danh sách Bộ câu hỏi', 'live-quiz'); ?></h2>
        
        <?php if ($show_search || $show_filters): ?>
        <div class="live-quiz-browse-controls">
            <?php if ($show_search): ?>
            <div class="live-quiz-search-box">
                <input type="text" 
                       id="live-quiz-search-input" 
                       class="live-quiz-search-input" 
                       placeholder="<?php esc_attr_e('Tìm kiếm bộ câu hỏi...', 'live-quiz'); ?>"
                       autocomplete="off">
                <button type="button" class="live-quiz-search-clear" id="live-quiz-search-clear" style="display: none;">
                    <span class="dashicons dashicons-no-alt"></span>
                </button>
            </div>
            <?php endif; ?>
            
            <?php if ($show_filters): ?>
            <div class="live-quiz-filters">
                <div class="live-quiz-filter-group">
                    <label for="live-quiz-sort"><?php _e('Sắp xếp theo:', 'live-quiz'); ?></label>
                    <select id="live-quiz-sort" class="live-quiz-sort-select">
                        <option value="date_desc"><?php _e('Mới nhất', 'live-quiz'); ?></option>
                        <option value="date_asc"><?php _e('Cũ nhất', 'live-quiz'); ?></option>
                        <option value="title_asc"><?php _e('Tên A-Z', 'live-quiz'); ?></option>
                        <option value="title_desc"><?php _e('Tên Z-A', 'live-quiz'); ?></option>
                        <option value="questions_desc"><?php _e('Nhiều câu hỏi nhất', 'live-quiz'); ?></option>
                        <option value="questions_asc"><?php _e('Ít câu hỏi nhất', 'live-quiz'); ?></option>
                    </select>
                </div>
                
                <div class="live-quiz-filter-group">
                    <label for="live-quiz-min-questions"><?php _e('Số câu hỏi:', 'live-quiz'); ?></label>
                    <div class="live-quiz-question-range">
                        <input type="number" 
                               id="live-quiz-min-questions" 
                               class="live-quiz-question-input" 
                               placeholder="<?php esc_attr_e('Tối thiểu', 'live-quiz'); ?>"
                               min="0">
                        <span class="live-quiz-range-separator">-</span>
                        <input type="number" 
                               id="live-quiz-max-questions" 
                               class="live-quiz-question-input" 
                               placeholder="<?php esc_attr_e('Tối đa', 'live-quiz'); ?>"
                               min="0">
                    </div>
                </div>
            </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    </div>
    
    <div class="live-quiz-browse-content">
        <div id="live-quiz-loading" class="live-quiz-loading" style="display: none;">
            <div class="live-quiz-spinner"></div>
            <p><?php _e('Đang tải...', 'live-quiz'); ?></p>
        </div>
        
        <div id="live-quiz-quizzes-grid" class="live-quiz-quizzes-grid" data-per-page="<?php echo esc_attr($per_page); ?>">
            <!-- Quizzes will be loaded here via JavaScript -->
        </div>
        
        <div id="live-quiz-pagination" class="live-quiz-pagination">
            <!-- Pagination will be loaded here via JavaScript -->
        </div>
        
        <div id="live-quiz-no-results" class="live-quiz-no-results" style="display: none;">
            <p><?php _e('Không tìm thấy bộ câu hỏi nào', 'live-quiz'); ?></p>
        </div>
    </div>
</div>

<!-- Preview Modal -->
<div id="live-quiz-preview-modal" class="live-quiz-preview-modal" style="display: none;">
    <div class="live-quiz-preview-modal-overlay"></div>
    <div class="live-quiz-preview-modal-content">
        <div class="live-quiz-preview-modal-header">
            <h3 id="live-quiz-preview-title" class="live-quiz-preview-title"></h3>
            <button type="button" class="live-quiz-preview-close" id="live-quiz-preview-close">
                <span class="dashicons dashicons-no-alt"></span>
            </button>
        </div>
        <div class="live-quiz-preview-modal-body">
            <div class="live-quiz-preview-info live-quiz-preview-info-sticky">
                <span id="live-quiz-preview-question-count" class="live-quiz-preview-meta"></span>
                <button type="button" id="live-quiz-toggle-answers" class="live-quiz-toggle-answers">
                    <?php _e('Hiện đáp án', 'live-quiz'); ?>
                </button>
            </div>
            <div id="live-quiz-preview-questions" class="live-quiz-preview-questions">
                <!-- Questions will be loaded here -->
            </div>
            <!-- Floating toggle button for easy access when scrolling -->
            <button type="button" id="live-quiz-toggle-answers-floating" class="live-quiz-toggle-answers-floating" title="<?php esc_attr_e('Hiện/Ẩn đáp án', 'live-quiz'); ?>">
                <span class="dashicons dashicons-visibility"></span>
            </button>
        </div>
    </div>
</div>

