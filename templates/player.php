<?php
/**
 * Player Template
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div id="live-quiz-player" class="live-quiz-container">
    <!-- Lobby Screen -->
    <div id="quiz-lobby" class="quiz-screen active">
        <div class="quiz-card">
            <h1><?php _e('Tham gia Live Quiz', 'live-quiz'); ?></h1>
            
            <form id="join-form" class="quiz-form">
                <div class="form-group">
                    <label for="display-name"><?php _e('Tên hiển thị', 'live-quiz'); ?></label>
                    <input 
                        type="text" 
                        id="display-name" 
                        name="display_name"
                        placeholder="<?php esc_attr_e('Nhập tên của bạn...', 'live-quiz'); ?>"
                        required
                        maxlength="50"
                        autocomplete="off">
                </div>
                
                <div class="form-group">
                    <label for="room-code"><?php _e('PIN Code', 'live-quiz'); ?></label>
                    <input 
                        type="text" 
                        id="room-code" 
                        name="room_code"
                        placeholder="<?php esc_attr_e('Nhập PIN 6 số...', 'live-quiz'); ?>"
                        required
                        maxlength="6"
                        pattern="[0-9]{6}"
                        inputmode="numeric"
                        autocomplete="off">
                </div>
                
                <button type="submit" class="btn btn-primary btn-large">
                    <?php _e('Tham gia', 'live-quiz'); ?>
                </button>
                
                <div id="join-error" class="error-message" style="display: none;"></div>
            </form>
        </div>
    </div>
    
    <!-- Waiting Screen -->
    <div id="quiz-waiting" class="quiz-screen">
        <div class="quiz-card text-center">
            <div class="spinner"></div>
            <h2><?php _e('Đang chờ bắt đầu...', 'live-quiz'); ?></h2>
            <p class="waiting-info">
                <span id="waiting-player-name"></span><br>
                <strong><?php _e('Mã phòng:', 'live-quiz'); ?></strong> <span id="waiting-room-code" class="room-code"></span>
            </p>
            <p id="participant-count" class="participant-count"></p>
        </div>
    </div>
    
    <!-- Question Screen -->
    <div id="quiz-question" class="quiz-screen">
        <div class="quiz-header">
            <div class="question-info">
                <span class="question-number"></span>
                <span class="question-score"></span>
            </div>
            <div class="timer-container">
                <div class="timer-bar">
                    <div class="timer-fill"></div>
                </div>
                <div class="timer-text"></div>
            </div>
        </div>
        
        <div class="quiz-card">
            <h2 class="question-text"></h2>
            
            <div class="choices-container" id="choices-container">
                <!-- Choices will be inserted here -->
            </div>
        </div>
    </div>
    
    <!-- Results Screen -->
    <div id="quiz-results" class="quiz-screen">
        <div class="quiz-card">
            <div class="result-feedback">
                <div class="feedback-icon"></div>
                <h2 class="feedback-text"></h2>
                <p class="feedback-score"></p>
            </div>
            
            <div class="leaderboard-container">
                <h3><?php _e('Bảng xếp hạng', 'live-quiz'); ?></h3>
                <div id="leaderboard" class="leaderboard">
                    <!-- Leaderboard will be inserted here -->
                </div>
            </div>
            
            <div class="your-rank">
                <p><?php _e('Thứ hạng của bạn:', 'live-quiz'); ?> <strong id="your-rank"></strong></p>
                <p><?php _e('Điểm của bạn:', 'live-quiz'); ?> <strong id="your-score"></strong></p>
            </div>
        </div>
    </div>
    
    <!-- Final Results Screen -->
    <div id="quiz-final" class="quiz-screen">
        <div class="quiz-card">
            <h1><?php _e('🎉 Quiz đã kết thúc!', 'live-quiz'); ?></h1>
            
            <div class="final-stats">
                <h2><?php _e('Kết quả cuối cùng', 'live-quiz'); ?></h2>
                <div class="your-final-rank">
                    <div class="rank-display">
                        <span class="rank-number" id="final-rank"></span>
                        <span class="rank-label"><?php _e('Thứ hạng', 'live-quiz'); ?></span>
                    </div>
                    <div class="score-display">
                        <span class="score-number" id="final-score"></span>
                        <span class="score-label"><?php _e('Điểm', 'live-quiz'); ?></span>
                    </div>
                </div>
            </div>
            
            <div class="leaderboard-container">
                <h3><?php _e('Top 10', 'live-quiz'); ?></h3>
                <div id="final-leaderboard" class="leaderboard">
                    <!-- Final leaderboard will be inserted here -->
                </div>
            </div>
            
            <button onclick="location.reload()" class="btn btn-primary">
                <?php _e('Tham gia phiên mới', 'live-quiz'); ?>
            </button>
        </div>
    </div>
    
    <!-- Connection Status -->
    <div id="connection-status" class="connection-status" style="display: none;">
        <span class="status-icon"></span>
        <span class="status-text"></span>
    </div>
</div>
