<?php
/**
 * Register Custom Post Types
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_Post_Types {
    
    /**
     * Initialize
     */
    public static function init() {
        add_action('init', array(__CLASS__, 'register'), 5);
        add_action('add_meta_boxes', array(__CLASS__, 'add_meta_boxes'));
        add_action('save_post', array(__CLASS__, 'save_meta_boxes'), 10, 2);
        add_filter('set-screen-option', array(__CLASS__, 'set_screen_option'), 10, 3);
    }
    
    /**
     * Register custom post types
     */
    public static function register() {
        // Register Quiz (Question Set) CPT
        register_post_type('live_quiz', array(
            'labels' => array(
                'name' => __('Quizzes', 'live-quiz'),
                'singular_name' => __('Quiz', 'live-quiz'),
                'add_new' => __('Thêm Quiz', 'live-quiz'),
                'add_new_item' => __('Thêm Quiz mới', 'live-quiz'),
                'edit_item' => __('Chỉnh sửa Quiz', 'live-quiz'),
                'new_item' => __('Quiz mới', 'live-quiz'),
                'view_item' => __('Xem Quiz', 'live-quiz'),
                'search_items' => __('Tìm Quiz', 'live-quiz'),
                'not_found' => __('Không tìm thấy Quiz', 'live-quiz'),
                'all_items' => __('Tất cả Quizzes', 'live-quiz'),
            ),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'menu_icon' => 'dashicons-welcome-learn-more',
            'menu_position' => 25,
            'capability_type' => 'post',
            'capabilities' => array(
                'edit_post' => 'manage_options',
                'delete_post' => 'manage_options',
                'edit_posts' => 'manage_options',
                'edit_others_posts' => 'manage_options',
                'publish_posts' => 'manage_options',
                'read_private_posts' => 'manage_options',
            ),
            'supports' => array('title'),
            'has_archive' => false,
            'rewrite' => false,
        ));
        
        // Register Session CPT
        register_post_type('live_quiz_session', array(
            'labels' => array(
                'name' => __('Quiz Sessions', 'live-quiz'),
                'singular_name' => __('Session', 'live-quiz'),
                'add_new' => __('Tạo phiên', 'live-quiz'),
                'add_new_item' => __('Tạo phiên mới', 'live-quiz'),
                'edit_item' => __('Quản lý phiên', 'live-quiz'),
            ),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'edit.php?post_type=live_quiz',
            'capability_type' => 'post',
            'capabilities' => array(
                'create_posts' => 'manage_options',
                'edit_post' => 'manage_options',
                'delete_post' => 'manage_options',
                'edit_posts' => 'manage_options',
            ),
            'supports' => array('title'),
            'has_archive' => false,
            'rewrite' => false,
        ));
    }
    
    /**
     * Add meta boxes
     */
    public static function add_meta_boxes() {
        // Quiz info meta box (description, tags)
        add_meta_box(
            'live_quiz_info',
            __('Thông tin Quiz', 'live-quiz'),
            array(__CLASS__, 'render_info_meta_box'),
            'live_quiz',
            'normal',
            'high'
        );
        
        // Questions meta box (chứa câu hỏi trong quiz)
        add_meta_box(
            'live_quiz_questions',
            __('Câu hỏi Quiz', 'live-quiz'),
            array(__CLASS__, 'render_questions_meta_box'),
            'live_quiz',
            'normal',
            'high'
        );
        
        // Quiz settings meta box
        add_meta_box(
            'live_quiz_settings',
            __('Cài đặt Quiz', 'live-quiz'),
            array(__CLASS__, 'render_settings_meta_box'),
            'live_quiz',
            'side',
            'default'
        );
        
        // Session meta box
        add_meta_box(
            'live_quiz_session_info',
            __('Thông tin phiên', 'live-quiz'),
            array(__CLASS__, 'render_session_meta_box'),
            'live_quiz_session',
            'normal',
            'high'
        );
        
        // Add screen options for questions per page
        $screen = get_current_screen();
        if ($screen && $screen->post_type === 'live_quiz' && $screen->base === 'post') {
            add_screen_option('per_page', array(
                'label' => __('Số câu hỏi mỗi trang:', 'live-quiz'),
                'default' => 10,
                'option' => 'live_quiz_questions_per_page',
            ));
        }
    }
    
    /**
     * Render info meta box (description, tags)
     */
    public static function render_info_meta_box($post) {
        wp_nonce_field('live_quiz_save_info', 'live_quiz_info_nonce');
        
        $description = get_post_meta($post->ID, '_live_quiz_description', true);
        $tags = get_post_meta($post->ID, '_live_quiz_tags', true);
        ?>
        <p>
            <label>
                <strong><?php _e('Mô tả Quiz:', 'live-quiz'); ?></strong><br>
                <textarea name="live_quiz_description" 
                          class="widefat" 
                          rows="4"
                          placeholder="<?php esc_attr_e('Nhập mô tả chi tiết về quiz này...', 'live-quiz'); ?>"><?php echo esc_textarea($description); ?></textarea>
            </label>
        </p>
        
        <p>
            <label>
                <strong><?php _e('Tags (phân cách bằng dấu phẩy):', 'live-quiz'); ?></strong><br>
                <input type="text" 
                       name="live_quiz_tags" 
                       class="widefat"
                       value="<?php echo esc_attr($tags); ?>"
                       placeholder="<?php esc_attr_e('Ví dụ: tiếng anh, ngữ pháp, level 2', 'live-quiz'); ?>">
            </label>
            <span class="description">
                <?php _e('Nhập các tags để phân loại quiz, phân cách bằng dấu phẩy.', 'live-quiz'); ?>
            </span>
        </p>
        <?php
    }
    
    /**
     * Save screen option
     */
    public static function set_screen_option($status, $option, $value) {
        if ('live_quiz_questions_per_page' === $option) {
            return $value;
        }
        return $status;
    }
    
    /**
     * Render questions meta box
     */
    public static function render_questions_meta_box($post) {
        wp_nonce_field('live_quiz_save_questions', 'live_quiz_questions_nonce');
        
        $questions = get_post_meta($post->ID, '_live_quiz_questions', true);
        if (!is_array($questions)) {
            $questions = array();
        }
        
        // Get per page setting from user meta
        $user_id = get_current_user_id();
        $per_page = get_user_meta($user_id, 'live_quiz_questions_per_page', true);
        if (empty($per_page) || $per_page < 1) {
            $per_page = 10; // Default
        }
        ?>
        <div id="live-quiz-questions-container">
            <div class="question-creation-mode">
                <div class="creation-buttons">
                    <button type="button" class="button button-primary" id="add-question-manual">
                        <span class="dashicons dashicons-edit"></span>
                        <?php _e('Tạo câu hỏi', 'live-quiz'); ?>
                    </button>
                    <button type="button" class="button button-secondary" id="add-question-ai">
                        <span class="dashicons dashicons-admin-generic"></span>
                        <?php _e('Tạo câu hỏi bằng AI', 'live-quiz'); ?>
                    </button>
                    <button type="button" class="button" id="bulk-delete-questions" style="margin-left: 10px; color: #a00;" disabled>
                        <span class="dashicons dashicons-trash"></span>
                        <?php _e('Xóa đã chọn', 'live-quiz'); ?>
                    </button>
                </div>
                
                <div class="questions-toolbar">
                    <label class="select-all-questions">
                        <input type="checkbox" id="select-all-questions">
                        <?php _e('Chọn tất cả', 'live-quiz'); ?>
                    </label>
                    <span class="questions-info">
                        <?php printf(__('Tổng: <strong>%d</strong> câu hỏi', 'live-quiz'), count($questions)); ?>
                    </span>
                </div>
            </div>
            
            <!-- AI Generation Modal -->
            <div id="ai-generation-modal" style="display: none;">
                <div class="ai-modal-content">
                    <h3><?php _e('Tạo câu hỏi bằng AI', 'live-quiz'); ?></h3>
                    
                    <label>
                        <strong><?php _e('Loại câu hỏi:', 'live-quiz'); ?></strong>
                        <select id="ai-question-type">
                            <option value="single_choice"><?php _e('Single Choice (1 đáp án đúng)', 'live-quiz'); ?></option>
                            <option value="multiple_choice"><?php _e('Multiple Choice (nhiều đáp án đúng)', 'live-quiz'); ?></option>
                        </select>
                    </label>
                    
                    <label>
                        <strong><?php _e('Số lượng câu hỏi:', 'live-quiz'); ?></strong>
                        <input type="number" id="ai-question-count" value="1" min="1">
                    </label>
                    
                    <label>
                        <strong><?php _e('Số câu trả lời mỗi câu hỏi:', 'live-quiz'); ?></strong>
                        <input type="number" id="ai-choices-count" value="4" min="2">
                        <span class="description"><?php _e('Số lượng đáp án cho mỗi câu hỏi', 'live-quiz'); ?></span>
                    </label>
                    
                    <label>
                        <strong><?php _e('Nội dung/Topic:', 'live-quiz'); ?></strong>
                        <textarea id="ai-question-content" rows="10" placeholder="Nhập nội dung bài học, topic, hoặc đoạn text để AI tạo câu hỏi..."></textarea>
                    </label>
                    
                    <div class="ai-modal-buttons">
                        <button type="button" class="button button-primary" id="generate-ai-questions">
                            <span class="dashicons dashicons-admin-generic"></span>
                            <?php _e('Tạo câu hỏi', 'live-quiz'); ?>
                        </button>
                        <button type="button" class="button" id="cancel-ai-generation">
                            <?php _e('Hủy', 'live-quiz'); ?>
                        </button>
                    </div>
                    
                    <div id="ai-generation-progress" style="display: none;">
                        <p><?php _e('Đang tạo câu hỏi...', 'live-quiz'); ?></p>
                        <div class="progress-bar">
                            <div class="progress-bar-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="questions-list" data-per-page="<?php echo esc_attr($per_page); ?>">
                <?php foreach ($questions as $index => $question): ?>
                    <?php self::render_question_item($index, $question); ?>
                <?php endforeach; ?>
            </div>
            
            <div class="questions-pagination" style="display: none;">
                <div class="pagination-info">
                    <span class="displaying-num"></span>
                </div>
                <div class="pagination-links">
                    <button type="button" class="button first-page" id="first-page" disabled title="<?php esc_attr_e('Trang đầu', 'live-quiz'); ?>">
                        <span aria-hidden="true">«</span>
                    </button>
                    <button type="button" class="button prev-page" id="prev-page" disabled title="<?php esc_attr_e('Trang trước', 'live-quiz'); ?>">
                        <span aria-hidden="true">‹</span>
                    </button>
                    <span class="paging-input">
                        <input type="number" 
                               id="current-page-input" 
                               class="current-page" 
                               value="1" 
                               min="1"
                               size="4"
                               aria-describedby="table-paging">
                        <span class="tablenav-paging-text"> <?php _e('of', 'live-quiz'); ?> <span class="total-pages">1</span></span>
                    </span>
                    <button type="button" class="button next-page" id="next-page" title="<?php esc_attr_e('Trang sau', 'live-quiz'); ?>">
                        <span aria-hidden="true">›</span>
                    </button>
                    <button type="button" class="button last-page" id="last-page" title="<?php esc_attr_e('Trang cuối', 'live-quiz'); ?>">
                        <span aria-hidden="true">»</span>
                    </button>
                </div>
            </div>
        </div>
        
        <script type="text/template" id="question-template">
            <?php self::render_question_item('{{INDEX}}', array()); ?>
        </script>
        <?php
    }
    
    /**
     * Render single question item
     */
    private static function render_question_item($index, $question = array()) {
        $question = wp_parse_args($question, array(
            'type' => 'single_choice',
            'text' => '',
            'choices' => array(
                array('text' => '', 'is_correct' => false),
                array('text' => '', 'is_correct' => false),
            ),
            'time_limit' => 20,
            'base_points' => 1000,
        ));
        
        $is_multiple = $question['type'] === 'multiple_choice';
        $is_template = ($index === '{{INDEX}}');
        $display_index = $is_template ? '{{INDEX_PLUS_1}}' : ($index + 1);
        ?>
        <div class="question-item" data-index="<?php echo esc_attr($index); ?>">
            <div class="question-header">
                <div class="question-header-left">
                    <input type="checkbox" class="question-select-checkbox" data-index="<?php echo esc_attr($index); ?>">
                    <h3><?php printf(__('Câu hỏi #%s', 'live-quiz'), '<span class="question-number">' . $display_index . '</span>'); ?></h3>
                    <select name="live_quiz_questions[<?php echo esc_attr($index); ?>][type]" class="question-type-selector">
                        <option value="single_choice" <?php selected($question['type'], 'single_choice'); ?>><?php _e('Single Choice', 'live-quiz'); ?></option>
                        <option value="multiple_choice" <?php selected($question['type'], 'multiple_choice'); ?>><?php _e('Multiple Choice', 'live-quiz'); ?></option>
                    </select>
                </div>
                <span class="remove-question dashicons dashicons-trash"></span>
            </div>
            
            <input type="text" 
                   name="live_quiz_questions[<?php echo esc_attr($index); ?>][text]" 
                   class="question-text widefat"
                   placeholder="<?php esc_attr_e('Nhập nội dung câu hỏi...', 'live-quiz'); ?>"
                   value="<?php echo esc_attr($question['text']); ?>"
                   required>
            
            <div class="choices-container">
                <div class="choices-header">
                    <strong><?php echo $is_multiple ? __('Đáp án (có thể chọn nhiều):', 'live-quiz') : __('Đáp án:', 'live-quiz'); ?></strong>
                    <button type="button" class="button button-small add-choice" data-question-index="<?php echo esc_attr($index); ?>">
                        <span class="dashicons dashicons-plus-alt2"></span> <?php _e('Thêm đáp án', 'live-quiz'); ?>
                    </button>
                </div>
                <div class="choices-list">
                    <?php foreach ($question['choices'] as $choice_index => $choice): ?>
                        <div class="choice-item" data-choice-index="<?php echo esc_attr($choice_index); ?>">
                            <div class="choice-controls">
                                <?php if ($is_multiple): ?>
                                    <input type="checkbox" 
                                           name="live_quiz_questions[<?php echo esc_attr($index); ?>][correct][]"
                                           value="<?php echo esc_attr($choice_index); ?>"
                                           <?php checked(!empty($choice['is_correct'])); ?>>
                                <?php else: ?>
                                    <input type="radio" 
                                           name="live_quiz_questions[<?php echo esc_attr($index); ?>][correct]"
                                           value="<?php echo esc_attr($choice_index); ?>"
                                           <?php checked(!empty($choice['is_correct'])); ?>>
                                <?php endif; ?>
                                <span class="choice-label"><?php echo sprintf(__('Đáp án %d', 'live-quiz'), $choice_index + 1); ?></span>
                            </div>
                            <input type="text"
                                   name="live_quiz_questions[<?php echo esc_attr($index); ?>][choices][<?php echo esc_attr($choice_index); ?>]"
                                   placeholder="<?php echo esc_attr(sprintf(__('Nhập đáp án %d', 'live-quiz'), $choice_index + 1)); ?>"
                                   value="<?php echo esc_attr($choice['text'] ?? ''); ?>"
                                   class="choice-text"
                                   required>
                            <button type="button" class="button button-small remove-choice" title="<?php esc_attr_e('Xóa đáp án', 'live-quiz'); ?>">
                                <span class="dashicons dashicons-trash"></span>
                            </button>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <div class="question-settings">
                <label>
                    <?php _e('Thời gian (giây):', 'live-quiz'); ?>
                    <input type="number" 
                           name="live_quiz_questions[<?php echo esc_attr($index); ?>][time_limit]"
                           value="<?php echo esc_attr($question['time_limit']); ?>"
                           min="5" max="120" step="1" required>
                </label>
                
                <label>
                    <?php _e('Điểm cơ bản:', 'live-quiz'); ?>
                    <input type="number" 
                           name="live_quiz_questions[<?php echo esc_attr($index); ?>][base_points]"
                           value="<?php echo esc_attr($question['base_points']); ?>"
                           min="100" max="10000" step="100" required>
                </label>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render settings meta box
     */
    public static function render_settings_meta_box($post) {
        wp_nonce_field('live_quiz_save_settings', 'live_quiz_settings_nonce');
        
        $alpha = get_post_meta($post->ID, '_live_quiz_alpha', true) ?: 0.3;
        $max_players = get_post_meta($post->ID, '_live_quiz_max_players', true) ?: 500;
        ?>
        <p>
            <label>
                <strong><?php _e('Hệ số Alpha (α):', 'live-quiz'); ?></strong><br>
                <input type="number" 
                       name="live_quiz_alpha" 
                       value="<?php echo esc_attr($alpha); ?>"
                       min="0" max="1" step="0.1" 
                       style="width: 100%;">
                <small><?php _e('Điểm tối thiểu khi trả lời đúng (0-1)', 'live-quiz'); ?></small>
            </label>
        </p>
        
        <p>
            <label>
                <strong><?php _e('Số người tối đa:', 'live-quiz'); ?></strong><br>
                <input type="number" 
                       name="live_quiz_max_players" 
                       value="<?php echo esc_attr($max_players); ?>"
                       min="1" max="1000" 
                       style="width: 100%;">
            </label>
        </p>
        <?php
    }
    
    /**
     * Render session meta box
     */
    public static function render_session_meta_box($post) {
        $quiz_id = get_post_meta($post->ID, '_session_quiz_id', true);
        $room_code = get_post_meta($post->ID, '_session_room_code', true);
        $status = get_post_meta($post->ID, '_session_status', true) ?: 'lobby';
        
        ?>
        <p>
            <label>
                <strong><?php _e('Chọn Quiz:', 'live-quiz'); ?></strong><br>
                <?php
                wp_dropdown_pages(array(
                    'post_type' => 'live_quiz',
                    'selected' => $quiz_id,
                    'name' => 'session_quiz_id',
                    'show_option_none' => __('-- Chọn Quiz --', 'live-quiz'),
                ));
                ?>
            </label>
        </p>
        
        <p>
            <strong><?php _e('Mã phòng:', 'live-quiz'); ?></strong>
            <code style="font-size: 20px; display: block; padding: 10px; background: #f0f0f0;">
                <?php echo esc_html($room_code ?: __('Tự động tạo', 'live-quiz')); ?>
            </code>
        </p>
        
        <p>
            <strong><?php _e('Trạng thái:', 'live-quiz'); ?></strong>
            <span class="status-badge status-<?php echo esc_attr($status); ?>">
                <?php echo esc_html(ucfirst($status)); ?>
            </span>
        </p>
        <?php
    }
    
    /**
     * Save meta boxes
     */
    public static function save_meta_boxes($post_id, $post) {
        // Check autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Save quiz info (description, tags)
        if ($post->post_type === 'live_quiz') {
            if (isset($_POST['live_quiz_info_nonce']) && 
                wp_verify_nonce($_POST['live_quiz_info_nonce'], 'live_quiz_save_info')) {
                
                if (isset($_POST['live_quiz_description'])) {
                    update_post_meta($post_id, '_live_quiz_description', sanitize_textarea_field($_POST['live_quiz_description']));
                }
                
                if (isset($_POST['live_quiz_tags'])) {
                    update_post_meta($post_id, '_live_quiz_tags', sanitize_text_field($_POST['live_quiz_tags']));
                }
            }
        }
        
        // Save quiz selected questions (NEW)
        if ($post->post_type === 'live_quiz') {
            if (isset($_POST['live_quiz_selected_questions_nonce']) && 
                wp_verify_nonce($_POST['live_quiz_selected_questions_nonce'], 'live_quiz_save_selected_questions')) {
                
                $selected_questions = array();
                if (isset($_POST['live_quiz_selected_questions']) && is_array($_POST['live_quiz_selected_questions'])) {
                    $selected_questions = array_map('intval', $_POST['live_quiz_selected_questions']);
                }
                
                update_post_meta($post_id, '_live_quiz_selected_questions', $selected_questions);
            }
        }
        
        // Save question content (NEW)
        if ($post->post_type === 'live_question') {
            if (isset($_POST['live_question_nonce']) && 
                wp_verify_nonce($_POST['live_question_nonce'], 'live_question_save')) {
                
                $question_type = isset($_POST['question_type']) ? sanitize_text_field($_POST['question_type']) : 'single_choice';
                $is_multiple = $question_type === 'multiple_choice';
                
                $choices = array();
                if (isset($_POST['question_choices']) && is_array($_POST['question_choices'])) {
                    $correct_answers = array();
                    
                    if ($is_multiple && isset($_POST['question_correct']) && is_array($_POST['question_correct'])) {
                        $correct_answers = array_map('intval', $_POST['question_correct']);
                    } elseif (!$is_multiple && isset($_POST['question_correct'])) {
                        $correct_answers = array((int)$_POST['question_correct']);
                    }
                    
                    foreach ($_POST['question_choices'] as $index => $choice_text) {
                        if (empty($choice_text)) continue;
                        $choices[] = array(
                            'text' => sanitize_text_field($choice_text),
                            'is_correct' => in_array((int)$index, $correct_answers),
                        );
                    }
                }
                
                $question_data = array(
                    'type' => $question_type,
                    'text' => isset($_POST['question_text']) ? sanitize_textarea_field($_POST['question_text']) : '',
                    'choices' => $choices,
                    'time_limit' => isset($_POST['question_time_limit']) ? max(5, min(120, (int)$_POST['question_time_limit'])) : 20,
                    'base_points' => isset($_POST['question_base_points']) ? max(100, min(10000, (int)$_POST['question_base_points'])) : 1000,
                );
                
                update_post_meta($post_id, '_question_data', $question_data);
            }
        }
        
        // Save questions (OLD - backward compatibility)
        if ($post->post_type === 'live_quiz') {
            if (isset($_POST['live_quiz_questions_nonce']) && 
                wp_verify_nonce($_POST['live_quiz_questions_nonce'], 'live_quiz_save_questions')) {
                
                $questions = array();
                if (isset($_POST['live_quiz_questions']) && is_array($_POST['live_quiz_questions'])) {
                    foreach ($_POST['live_quiz_questions'] as $q) {
                        if (empty($q['text'])) continue;
                        
                        $question_type = isset($q['type']) ? sanitize_text_field($q['type']) : 'single_choice';
                        $is_multiple = $question_type === 'multiple_choice';
                        
                        $choices = array();
                        if (isset($q['choices']) && is_array($q['choices'])) {
                            $correct_answers = array();
                            
                            // Handle multiple choice (array of correct answers)
                            if ($is_multiple && isset($q['correct']) && is_array($q['correct'])) {
                                $correct_answers = array_map('intval', $q['correct']);
                            }
                            // Handle single choice (single correct answer)
                            elseif (!$is_multiple && isset($q['correct'])) {
                                $correct_answers = array((int)$q['correct']);
                            }
                            
                            foreach ($q['choices'] as $choice_index => $choice_text) {
                                if (empty($choice_text)) continue;
                                $choices[] = array(
                                    'text' => sanitize_text_field($choice_text),
                                    'is_correct' => in_array((int)$choice_index, $correct_answers),
                                );
                            }
                        }
                        
                        if (count($choices) < 2) continue; // Need at least 2 choices
                        
                        $questions[] = array(
                            'type' => $question_type,
                            'text' => sanitize_textarea_field($q['text']),
                            'choices' => $choices,
                            'time_limit' => max(5, min(120, (int)($q['time_limit'] ?? 20))),
                            'base_points' => max(100, min(10000, (int)($q['base_points'] ?? 1000))),
                        );
                    }
                }
                
                update_post_meta($post_id, '_live_quiz_questions', $questions);
            }
            
            // Save settings
            if (isset($_POST['live_quiz_settings_nonce']) && 
                wp_verify_nonce($_POST['live_quiz_settings_nonce'], 'live_quiz_save_settings')) {
                
                if (isset($_POST['live_quiz_alpha'])) {
                    update_post_meta($post_id, '_live_quiz_alpha', floatval($_POST['live_quiz_alpha']));
                }
                
                if (isset($_POST['live_quiz_max_players'])) {
                    update_post_meta($post_id, '_live_quiz_max_players', intval($_POST['live_quiz_max_players']));
                }
            }
        }
        
        // Save session info
        if ($post->post_type === 'live_quiz_session') {
            if (isset($_POST['session_quiz_id'])) {
                update_post_meta($post_id, '_session_quiz_id', intval($_POST['session_quiz_id']));
            }
            
            // Generate room code if new
            if (!get_post_meta($post_id, '_session_room_code', true)) {
                update_post_meta($post_id, '_session_room_code', self::generate_room_code());
                update_post_meta($post_id, '_session_status', 'lobby');
            }
        }
    }
    
    /**
     * Generate unique room code (PIN 6 số)
     */
    private static function generate_room_code() {
        do {
            // Tạo PIN 6 số từ 100000 đến 999999
            $code = (string) random_int(100000, 999999);
            
            // Check if code exists
            $existing = get_posts(array(
                'post_type' => 'live_quiz_session',
                'meta_key' => '_session_room_code',
                'meta_value' => $code,
                'posts_per_page' => 1,
            ));
        } while (!empty($existing));
        
        return $code;
    }
    

}
