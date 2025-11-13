<?php
/**
 * Admin Sessions Page Template
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap live-quiz-admin">
    <h1><?php _e('Quản lý Phiên Quiz', 'live-quiz'); ?></h1>
    
    <!-- Create New Session -->
    <div class="card" style="max-width: none;">
        <h2><?php _e('Tạo phiên mới', 'live-quiz'); ?></h2>
        
        <form method="post" action="">
            <?php wp_nonce_field('create_live_quiz_session'); ?>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="quiz_id"><?php _e('Chọn Quiz', 'live-quiz'); ?></label>
                    </th>
                    <td>
                        <select name="quiz_id" id="quiz_id" required>
                            <option value=""><?php _e('-- Chọn Quiz --', 'live-quiz'); ?></option>
                            <?php foreach ($quizzes as $quiz): ?>
                                <option value="<?php echo esc_attr($quiz->ID); ?>">
                                    <?php echo esc_html($quiz->post_title); ?>
                                    (<?php echo count(get_post_meta($quiz->ID, '_live_quiz_questions', true) ?: array()); ?> câu hỏi)
                                </option>
                            <?php endforeach; ?>
                        </select>
                        
                        <?php if (empty($quizzes)): ?>
                            <p class="description">
                                <?php _e('Chưa có quiz nào.', 'live-quiz'); ?>
                                <a href="<?php echo admin_url('post-new.php?post_type=live_quiz'); ?>">
                                    <?php _e('Tạo quiz mới', 'live-quiz'); ?>
                                </a>
                            </p>
                        <?php endif; ?>
                    </td>
                </tr>
            </table>
            
            <p class="submit">
                <input type="submit" 
                       name="create_session" 
                       class="button button-primary" 
                       value="<?php esc_attr_e('Tạo phiên', 'live-quiz'); ?>">
            </p>
        </form>
    </div>
    
    <!-- Active Sessions -->
    <h2><?php _e('Các phiên hiện có', 'live-quiz'); ?></h2>
    
    <table class="wp-list-table widefat fixed striped">
        <thead>
            <tr>
                <th><?php _e('Mã phòng', 'live-quiz'); ?></th>
                <th><?php _e('Quiz', 'live-quiz'); ?></th>
                <th><?php _e('Trạng thái', 'live-quiz'); ?></th>
                <th><?php _e('Người chơi', 'live-quiz'); ?></th>
                <th><?php _e('Thời gian', 'live-quiz'); ?></th>
                <th><?php _e('Thao tác', 'live-quiz'); ?></th>
            </tr>
        </thead>
        <tbody>
            <?php if (empty($sessions)): ?>
                <tr>
                    <td colspan="6" style="text-align: center;">
                        <?php _e('Chưa có phiên nào.', 'live-quiz'); ?>
                    </td>
                </tr>
            <?php else: ?>
                <?php foreach ($sessions as $session): 
                    $session_id = $session->ID;
                    $room_code = get_post_meta($session_id, '_session_room_code', true);
                    $quiz_id = get_post_meta($session_id, '_session_quiz_id', true);
                    $status = get_post_meta($session_id, '_session_status', true) ?: 'lobby';
                    $participants = get_post_meta($session_id, '_session_participants', true) ?: array();
                    $quiz = get_post($quiz_id);
                ?>
                    <tr data-session-id="<?php echo esc_attr($session_id); ?>">
                        <td>
                            <strong class="room-code"><?php echo esc_html($room_code); ?></strong>
                        </td>
                        <td>
                            <?php echo $quiz ? esc_html($quiz->post_title) : __('(Đã xóa)', 'live-quiz'); ?>
                        </td>
                        <td>
                            <span class="status-badge status-<?php echo esc_attr($status); ?>">
                                <?php 
                                switch ($status) {
                                    case 'lobby':
                                        _e('Chờ bắt đầu', 'live-quiz');
                                        break;
                                    case 'playing':
                                    case 'question':
                                        _e('Đang chơi', 'live-quiz');
                                        break;
                                    case 'results':
                                        _e('Xem kết quả', 'live-quiz');
                                        break;
                                    case 'ended':
                                        _e('Đã kết thúc', 'live-quiz');
                                        break;
                                    default:
                                        echo esc_html(ucfirst($status));
                                }
                                ?>
                            </span>
                        </td>
                        <td>
                            <span class="participant-count"><?php echo count($participants); ?></span> người
                        </td>
                        <td>
                            <?php echo get_the_date('Y-m-d H:i', $session); ?>
                        </td>
                        <td>
                            <?php if ($status === 'lobby'): ?>
                                <button class="button button-primary btn-start" 
                                        data-session-id="<?php echo esc_attr($session_id); ?>">
                                    <?php _e('Bắt đầu', 'live-quiz'); ?>
                                </button>
                            <?php elseif ($status === 'question'): ?>
                                <button class="button btn-next" 
                                        data-session-id="<?php echo esc_attr($session_id); ?>">
                                    <?php _e('Câu tiếp theo', 'live-quiz'); ?>
                                </button>
                            <?php elseif ($status === 'results'): ?>
                                <button class="button btn-next" 
                                        data-session-id="<?php echo esc_attr($session_id); ?>">
                                    <?php _e('Tiếp tục', 'live-quiz'); ?>
                                </button>
                            <?php endif; ?>
                            
                            <?php if ($status !== 'ended'): ?>
                                <button class="button btn-end" 
                                        data-session-id="<?php echo esc_attr($session_id); ?>">
                                    <?php _e('Kết thúc', 'live-quiz'); ?>
                                </button>
                            <?php endif; ?>
                            
                            <a href="<?php echo admin_url('post.php?post=' . $session_id . '&action=edit'); ?>" 
                               class="button">
                                <?php _e('Chi tiết', 'live-quiz'); ?>
                            </a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php endif; ?>
        </tbody>
    </table>
    
    <style>
        .room-code {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            color: #0073aa;
            letter-spacing: 2px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-lobby {
            background: #f0f0f1;
            color: #50575e;
        }
        
        .status-playing,
        .status-question,
        .status-results {
            background: #00a32a;
            color: #ffffff;
        }
        
        .status-ended {
            background: #dba617;
            color: #ffffff;
        }
        
        .participant-count {
            font-weight: 600;
            color: #0073aa;
        }
    </style>
</div>
