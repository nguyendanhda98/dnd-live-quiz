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
        <!-- Ping Indicator -->
        <div id="host-ping-indicator" class="ping-indicator" style="display: none;">
            Ping:&nbsp;<span class="ping-value">--</span>
        </div>
        
        <!-- Header -->
        <div class="host-header">
            <div class="quiz-info">
                <h1><?php echo esc_html($quiz_title); ?></h1>
            </div>
            <div class="host-controls">
                <button id="end-session-btn" class="btn btn-danger">
                    <?php _e('Kết thúc phiên', 'live-quiz'); ?>
                </button>
            </div>
        </div>

        <!-- Lobby Screen -->
        <div id="host-lobby" class="host-screen active">
            <div class="lobby-layout">
                <!-- Left: Settings Panel -->
                <div class="lobby-settings-panel">
                    <h3><?php _e('⚙️ Cấu hình phòng', 'live-quiz'); ?></h3>
                    
                    <!-- Quiz Selection -->
                    <div class="settings-section">
                        <h4><?php _e('1. Chọn bộ câu hỏi', 'live-quiz'); ?></h4>
                        <div class="quiz-search-container">
                            <input 
                                type="text" 
                                id="lobby-quiz-search" 
                                class="search-input"
                                placeholder="<?php esc_attr_e('Tìm kiếm...', 'live-quiz'); ?>">
                            <div id="lobby-quiz-results" class="quiz-search-results"></div>
                        </div>
                        <div id="lobby-selected-quizzes" class="selected-quizzes-list">
                            <p class="no-selection"><?php _e('Chưa chọn bộ câu hỏi', 'live-quiz'); ?></p>
                        </div>
                    </div>
                    
                    <!-- Question Mode -->
                    <div class="settings-section">
                        <h4><?php _e('2. Số lượng câu hỏi', 'live-quiz'); ?></h4>
                        <label class="radio-option">
                            <input type="radio" name="lobby_quiz_type" value="all" checked>
                            <span><?php _e('Toàn bộ câu hỏi', 'live-quiz'); ?></span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="lobby_quiz_type" value="random">
                            <span><?php _e('Ngẫu nhiên', 'live-quiz'); ?></span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="lobby_quiz_type" value="range">
                            <span><?php _e('Từ câu x đến câu y', 'live-quiz'); ?></span>
                        </label>
                        <div id="lobby-random-count" class="random-count-input" style="display:none;">
                            <input type="number" id="lobby-question-count" min="1" value="10" class="number-input">
                            <span class="hint" id="lobby-question-hint"></span>
                        </div>
                        <div id="lobby-range-input" class="range-input" style="display:none;">
                            <div class="range-input-group">
                                <label><?php _e('Từ câu:', 'live-quiz'); ?></label>
                                <input type="number" id="lobby-question-start" min="1" value="1" class="number-input">
                            </div>
                            <div class="range-input-group">
                                <label><?php _e('Đến câu:', 'live-quiz'); ?></label>
                                <input type="number" id="lobby-question-end" min="1" value="10" class="number-input">
                            </div>
                            <span class="hint" id="lobby-range-hint"></span>
                        </div>
                    </div>
                    
                    <!-- Question Order -->
                    <div class="settings-section">
                        <h4><?php _e('3. Thứ tự câu hỏi', 'live-quiz'); ?></h4>
                        <label class="radio-option">
                            <input type="radio" name="lobby_question_order" value="sequential" checked>
                            <span><?php _e('Tuần tự', 'live-quiz'); ?></span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="lobby_question_order" value="random">
                            <span><?php _e('Ngẫu nhiên', 'live-quiz'); ?></span>
                        </label>
                    </div>
                    
                    <!-- Hide Leaderboard -->
                    <div class="settings-section">
                        <h4><?php _e('4. Tùy chọn khác', 'live-quiz'); ?></h4>
                        <label class="checkbox-option">
                            <input type="checkbox" id="lobby-hide-leaderboard">
                            <span><?php _e('Ẩn bảng xếp hạng trong game', 'live-quiz'); ?></span>
                        </label>
                        <label class="checkbox-option">
                            <input type="checkbox" id="lobby-joining-open" checked>
                            <span><?php _e('Cho phép người chơi tham gia', 'live-quiz'); ?></span>
                        </label>
                        <label class="checkbox-option">
                            <input type="checkbox" id="lobby-show-pin" checked>
                            <span><?php _e('Hiển thị mã PIN', 'live-quiz'); ?></span>
                        </label>
                    </div>
                    
                    <div class="settings-info">
                        <span class="info-icon">ℹ️</span>
                        <span class="info-text"><?php _e('Cấu hình sẽ được áp dụng khi bắt đầu game', 'live-quiz'); ?></span>
                    </div>
                </div>
                
                <!-- Right: Lobby Info -->
                <div class="lobby-info-panel">
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

                    <button id="start-quiz-btn" class="btn btn-primary btn-large btn-block" disabled>
                        <?php _e('▶️ Bắt đầu Quiz', 'live-quiz'); ?>
                    </button>
                </div>
            </div>
        </div>

        <!-- Countdown Screen -->
        <div id="host-countdown" class="host-screen">
            <div class="quiz-card text-center">
                <h1 class="countdown-title"><?php _e('Quiz bắt đầu sau', 'live-quiz'); ?></h1>
                <div class="countdown-number" id="host-countdown-number">3</div>
            </div>
        </div>
        
        <!-- Final Question Announcement -->
        <div id="host-final-announcement" class="host-screen">
            <div class="quiz-card text-center">
                <h1 class="final-announcement-title"><?php _e('🏆 Câu hỏi cuối cùng! 🏆', 'live-quiz'); ?></h1>
                <p class="final-announcement-text"><?php _e('Điểm số gấp đôi!', 'live-quiz'); ?></p>
                <div class="final-announcement-points">2000 pts</div>
            </div>
        </div>
        
        <!-- Top 10 Screen with Podium for Top 3 -->
        <div id="host-top3" class="host-screen">
            <div class="top10-container">
                <h1 class="top10-title"><?php _e('🏆 Bảng Xếp Hạng Cuối Cùng 🏆', 'live-quiz'); ?></h1>
                
                <!-- Podium for Top 3 -->
                <div id="host-top3-podium" class="top3-podium">
                    <!-- Top 3 podium will be inserted here -->
                </div>
                
                <!-- Full Top 10 List -->
                <div id="host-top10-list" class="top10-list">
                    <!-- Top 10 list will be inserted here -->
                </div>
                
                <!-- Action Buttons -->
                <div class="final-actions" style="margin-top: 30px;">
                    <button id="summary-btn" class="btn btn-primary">
                        <?php _e('📊 Tổng kết', 'live-quiz'); ?>
                    </button>
                    <button id="replay-session-btn-top3" class="btn btn-success">
                        <?php _e('🔄 Chơi lại', 'live-quiz'); ?>
                    </button>
                </div>
            </div>
        </div>

        <!-- Question Control Screen -->
        <div id="host-question" class="host-screen">
            <div class="question-control-card">
                <div class="question-header">
                    <div class="question-info">
                        <span class="question-number"></span>
                    </div>
                    <div class="timer-container">
                        <div class="timer-bar">
                            <div class="timer-fill"></div>
                        </div>
                        <div class="timer-text"></div>
                    </div>
                </div>

                <div class="question-content">
                    <h2 class="question-text"></h2>
                    
                    <div class="choices-preview" id="choices-preview">
                        <!-- Choices will be displayed here -->
                    </div>
                </div>

                <div class="answered-players-section">
                    <h4><?php _e('Người chơi đã trả lời', 'live-quiz'); ?></h4>
                    <div class="answer-count-display" style="display: none;">
                        <span class="answer-count-text">0/0 đã trả lời</span>
                    </div>
                    <div id="answered-players-list" class="answered-players-list">
                        <!-- Answered players will be displayed here -->
                    </div>
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
            
            <!-- Leaderboard Overlay (shared structure with player) -->
            <div id="leaderboard-overlay" class="leaderboard-overlay leaderboard-overlay-hidden">
                <div class="leaderboard-container">
                    <h2><?php _e('Bảng xếp hạng', 'live-quiz'); ?></h2>
                    <div id="animated-leaderboard" class="animated-leaderboard">
                        <!-- Leaderboard items will be inserted here -->
                    </div>
                </div>
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
                    <button id="replay-session-btn" class="btn btn-success">
                        <?php _e('🔄 Chơi lại', 'live-quiz'); ?>
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
        
        // Get host page URL from settings
        <?php
        $host_page_id = get_option('live_quiz_host_page', 0);
        $host_page_url = $host_page_id ? get_permalink($host_page_id) : home_url('/');
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
            hostName: <?php echo json_encode($host_display_name); ?>,
            hostPageUrl: <?php echo json_encode($host_page_url); ?>
        };
        
        // Also set liveQuizPlayer for API calls compatibility
        window.liveQuizPlayer = {
            apiUrl: <?php echo json_encode(rest_url('live-quiz/v1')); ?>,
            nonce: <?php echo json_encode(wp_create_nonce('wp_rest')); ?>,
            wsUrl: <?php echo json_encode(get_option('live_quiz_websocket_url', '')); ?>
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

<!-- Summary Modal (outside container to avoid z-index issues) -->
<?php if ($has_session): ?>
<div id="summary-modal" class="summary-modal" style="display: none;">
    <div class="summary-modal-content">
        <div class="summary-modal-header">
            <h2><?php _e('📊 Tổng kết câu hỏi', 'live-quiz'); ?></h2>
            <button class="summary-modal-close">&times;</button>
        </div>
        
        <div class="summary-modal-body">
            <div class="summary-filter">
                <label for="summary-sort">
                    <?php _e('Sắp xếp theo:', 'live-quiz'); ?>
                </label>
                <select id="summary-sort" class="summary-sort-select">
                    <option value="order"><?php _e('Thứ tự câu hỏi', 'live-quiz'); ?></option>
                    <option value="correct_asc"><?php _e('Ít người đúng nhất', 'live-quiz'); ?></option>
                    <option value="correct_desc"><?php _e('Nhiều người đúng nhất', 'live-quiz'); ?></option>
                </select>
            </div>
            
            <div id="summary-questions-list" class="summary-questions-list">
                <!-- Questions will be loaded here -->
                <div class="summary-loading">
                    <p><?php _e('Đang tải...', 'live-quiz'); ?></p>
                </div>
            </div>
        </div>
    </div>
</div>
<?php endif; ?>
