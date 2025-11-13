<?php
/**
 * Host Template - Giao diện cho người tạo phòng
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get session data
$session_id = get_query_var('session_id');
$session = Live_Quiz_Session_Manager::get_session($session_id);
$room_code = get_post_meta($session_id, '_session_room_code', true);
$quiz_id = get_post_meta($session_id, '_session_quiz_id', true);
$quiz_title = get_the_title($quiz_id);

// Get quiz questions
$questions = get_post_meta($quiz_id, '_live_quiz_questions', true);
$total_questions = is_array($questions) ? count($questions) : 0;

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo esc_html($quiz_title); ?> - Host</title>
    <?php wp_head(); ?>
</head>
<body class="live-quiz-host-body">
    <div id="live-quiz-host" class="live-quiz-host-container">
        <!-- Header -->
        <div class="host-header">
            <div class="quiz-info">
                <h1><?php echo esc_html($quiz_title); ?></h1>
                <p class="question-count"><?php printf(__('%d câu hỏi', 'live-quiz'), $total_questions); ?></p>
            </div>
            <div class="host-controls">
                <button id="end-session-btn" class="btn btn-danger" style="display:none;">
                    <?php _e('Kết thúc', 'live-quiz'); ?>
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
        // Pass session data to JavaScript
        window.liveQuizHostData = {
            sessionId: <?php echo json_encode($session_id); ?>,
            roomCode: <?php echo json_encode($room_code); ?>,
            quizTitle: <?php echo json_encode($quiz_title); ?>,
            totalQuestions: <?php echo json_encode($total_questions); ?>,
            session: <?php echo json_encode($session); ?>
        };
    </script>
    
    <?php wp_footer(); ?>
</body>
</html>
