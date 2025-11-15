<?php
/**
 * Host Template - Giao diện cho người tạo phòng
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get session data if room code exists
$session_id = get_query_var('session_id');
$has_session = !empty($session_id);

// If has session, get session data
if ($has_session) {
    $session = Live_Quiz_Session_Manager::get_session($session_id);
    
    if (!$session) {
        echo '<div class="live-quiz-error"><p>' . __('Phòng không tồn tại hoặc đã kết thúc.', 'live-quiz') . '</p></div>';
        return;
    }
    
    $room_code = get_post_meta($session_id, '_session_room_code', true);
    $quiz_id = get_post_meta($session_id, '_session_quiz_id', true);
    $quiz_title = get_the_title($quiz_id);
    
    // Get quiz questions
    $questions = get_post_meta($quiz_id, '_live_quiz_questions', true);
    $total_questions = is_array($questions) ? count($questions) : 0;
}

?>
<div class="live-quiz-host-wrapper">
<?php if ($has_session): ?>
    <!-- Host Interface với session -->
    <div id="live-quiz-host" class="live-quiz-host-container">
        <!-- Header -->
        <div class="host-header">
            <div class="quiz-info">
                <h1><?php echo esc_html($quiz_title); ?></h1>
                <p class="question-count"><?php printf(__('%d câu hỏi', 'live-quiz'), $total_questions); ?></p>
            </div>
            <div class="host-controls">
                <button id="end-session-btn" class="btn btn-danger">
                    <?php _e('Kết thúc phiên', 'live-quiz'); ?>
                </button>
            </div>
        </div>

        <!-- Lobby Screen -->
        <div id="host-lobby" class="host-screen active">
            <div class="lobby-card">
                <div class="pin-display">
                    <h2><?php _e('PIN Code', 'live-quiz'); ?></h2>
                    <div class="pin-code"><?php echo esc_html($room_code); ?></div>
                    <p class="pin-instruction">
                        <?php _e('Học viên nhập PIN này để tham gia', 'live-quiz'); ?>
                    </p>
                </div>

                <div class="waiting-status">
                    <div class="spinner"></div>
                    <h3><?php _e('Waiting for players...', 'live-quiz'); ?></h3>
                    <p class="player-count">
                        <span id="player-count">0</span> <?php _e('người chơi', 'live-quiz'); ?>
                    </p>
                </div>

                <div class="players-list-container">
                    <h4><?php _e('Danh sách người chơi', 'live-quiz'); ?></h4>
                    <div id="players-list" class="players-list">
                        <p class="no-players"><?php _e('Chưa có người chơi nào tham gia', 'live-quiz'); ?></p>
                    </div>
                </div>

                <button id="start-quiz-btn" class="btn btn-primary btn-large" disabled>
                    <?php _e('Bắt đầu Quiz', 'live-quiz'); ?>
                </button>
            </div>
        </div>

        <!-- Question Control Screen -->
        <div id="host-question" class="host-screen">
            <div class="question-control-card">
                <div class="question-header">
                    <div class="question-info">
                        <span class="question-number"></span>
                        <h2 class="question-text"></h2>
                    </div>
                    <div class="timer-container">
                        <div class="timer-bar">
                            <div class="timer-fill"></div>
                        </div>
                        <div class="timer-text"></div>
                    </div>
                </div>

                <div class="choices-preview" id="choices-preview">
                    <!-- Choices will be displayed here -->
                </div>

                <div class="answer-stats" id="answer-stats">
                    <h4><?php _e('Thống kê trả lời', 'live-quiz'); ?></h4>
                    <div class="stats-bars" id="stats-bars">
                        <!-- Stats will be displayed here -->
                    </div>
                </div>

                <button id="next-question-btn" class="btn btn-primary btn-large" style="display:none;">
                    <?php _e('Câu hỏi tiếp theo', 'live-quiz'); ?>
                </button>
            </div>
        </div>

        <!-- Results Screen -->
        <div id="host-results" class="host-screen">
            <div class="results-card">
                <h2><?php _e('Kết quả câu hỏi', 'live-quiz'); ?></h2>
                
                <div class="correct-answer-display">
                    <h3><?php _e('Đáp án đúng:', 'live-quiz'); ?></h3>
                    <div id="correct-answer-text" class="correct-answer"></div>
                </div>

                <div class="leaderboard-container">
                    <h3><?php _e('Bảng xếp hạng', 'live-quiz'); ?></h3>
                    <div id="host-leaderboard" class="leaderboard">
                        <!-- Leaderboard will be inserted here -->
                    </div>
                </div>

                <button id="continue-btn" class="btn btn-primary btn-large">
                    <?php _e('Tiếp tục', 'live-quiz'); ?>
                </button>
            </div>
        </div>

        <!-- Final Results Screen -->
        <div id="host-final" class="host-screen">
            <div class="final-card">
                <h1><?php _e('🎉 Quiz đã kết thúc!', 'live-quiz'); ?></h1>
                
                <div class="final-leaderboard-container">
                    <h2><?php _e('Bảng xếp hạng cuối cùng', 'live-quiz'); ?></h2>
                    <div id="final-leaderboard" class="leaderboard">
                        <!-- Final leaderboard will be inserted here -->
                    </div>
                </div>

                <div class="final-actions">
                    <a href="<?php echo admin_url('edit.php?post_type=live_quiz'); ?>" class="btn btn-secondary">
                        <?php _e('Quay về danh sách Quiz', 'live-quiz'); ?>
                    </a>
                    <button onclick="location.reload()" class="btn btn-primary">
                        <?php _e('Tạo phòng mới', 'live-quiz'); ?>
                    </button>
                </div>
            </div>
        </div>

        <!-- Connection Status -->
        <div id="connection-status" class="connection-status" style="display: none;">
            <span class="status-icon"></span>
            <span class="status-text"></span>
        </div>
    </div>

    <script>
        // Generate JWT token for host
        <?php
        $current_user = wp_get_current_user();
        $host_user_id = get_current_user_id(); // Use actual user ID for filtering
        $host_display_name = 'Host - ' . $current_user->display_name;
        $host_token = '';
        if (class_exists('Live_Quiz_JWT_Helper')) {
            $host_token = Live_Quiz_JWT_Helper::generate_token(
                $host_user_id,
                $session_id,
                $host_display_name
            );
        }
        ?>
        
        // Pass session data to JavaScript
        window.liveQuizHostData = {
            sessionId: <?php echo json_encode($session_id); ?>,
            roomCode: <?php echo json_encode($room_code); ?>,
            quizTitle: <?php echo json_encode($quiz_title); ?>,
            totalQuestions: <?php echo json_encode($total_questions); ?>,
            session: <?php echo json_encode($session); ?>,
            hostToken: <?php echo json_encode($host_token); ?>,
            hostUserId: <?php echo json_encode($host_user_id); ?>,
            hostName: <?php echo json_encode($host_display_name); ?>
        };
    </script>
    
<?php else: ?>
    <!-- Form nhập mã phòng để quản lý -->
    <div class="live-quiz-host-login">
        <div class="host-login-card">
            <h1><?php _e('Quản lý phòng Quiz', 'live-quiz'); ?></h1>
            <p class="subtitle"><?php _e('Nhập mã phòng để quản lý', 'live-quiz'); ?></p>
            
            <form id="host-login-form" class="host-form">
                <div class="form-group">
                    <label for="host-room-code"><?php _e('Mã phòng (PIN 6 số)', 'live-quiz'); ?></label>
                    <input 
                        type="text" 
                        id="host-room-code" 
                        name="room_code"
                        placeholder="<?php esc_attr_e('Nhập mã phòng...', 'live-quiz'); ?>"
                        required
                        maxlength="6"
                        pattern="[0-9]{6}"
                        inputmode="numeric"
                        autocomplete="off"
                        class="room-code-input">
                </div>
                
                <button type="submit" class="btn btn-primary btn-large">
                    <?php _e('Vào phòng', 'live-quiz'); ?>
                </button>
                
                <div id="host-login-error" class="error-message" style="display: none;"></div>
            </form>
            
            <div class="host-info">
                <p><?php _e('💡 Mã phòng được tạo khi bạn tạo phòng quiz trong admin.', 'live-quiz'); ?></p>
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('host-login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const roomCode = document.getElementById('host-room-code').value.trim();
            if (roomCode && /^[0-9]{6}$/.test(roomCode)) {
                window.location.href = '/host/' + roomCode;
            } else {
                const errorEl = document.getElementById('host-login-error');
                errorEl.textContent = '<?php esc_js(_e('Vui lòng nhập mã phòng hợp lệ (6 số)', 'live-quiz')); ?>';
                errorEl.style.display = 'block';
            }
        });
        
        // Auto uppercase
        document.getElementById('host-room-code').addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
    </script>
    
<?php endif; ?>
</div>
