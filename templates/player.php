<?php
/**
 * Player Template
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

$player_title = get_query_var('player_title', __('Tham gia Live Quiz', 'live-quiz'));
$show_title = get_query_var('show_title', 'yes');
?>

<div class="live-quiz-player-wrapper">
    <button class="leave-room-btn leave-room-floating" title="<?php esc_attr_e('Rời khỏi phòng', 'live-quiz'); ?>">
        <?php _e('Rời khỏi phòng', 'live-quiz'); ?>
    </button>
    <!-- Ping Indicator -->
    <div id="ping-indicator" class="ping-indicator" style="display: none;">
        Ping:&nbsp;<span class="ping-value">--</span>
    </div>
    
    <?php if ($show_title === 'yes') : ?>
        <div class="player-header">
            <h1><?php echo esc_html($player_title); ?></h1>
        </div>
    <?php endif; ?>
    
    <div id="live-quiz-player" class="live-quiz-container">
        <!-- Lobby Screen -->
        <div id="quiz-lobby" class="quiz-screen active">
            <div class="quiz-card">
                <h2><?php _e('Tham gia phòng', 'live-quiz'); ?></h2>
                
                <?php 
                $current_user = wp_get_current_user();
                $display_name = $current_user->display_name;
                ?>
                
                <div class="user-welcome">
                    <p class="welcome-text">
                        <?php printf(__('Xin chào, <strong>%s</strong>!', 'live-quiz'), esc_html($display_name)); ?>
                    </p>
                </div>
            
            <form id="join-form" class="quiz-form">
                <!-- Hidden input for display name -->
                <input type="hidden" id="display-name" name="display_name" value="<?php echo esc_attr($display_name); ?>">
                
                <div class="form-group">
                    <label for="room-code"><?php _e('PIN Code', 'live-quiz'); ?></label>
                    <input 
                        type="text" 
                        id="room-code" 
                        name="room_code"
                        value=""
                        placeholder="<?php esc_attr_e('Nhập PIN 6 số...', 'live-quiz'); ?>"
                        required
                        maxlength="6"
                        pattern="[0-9]{6}"
                        inputmode="numeric"
                        autocomplete="off"
                        autofocus>
                </div>
                
                <button type="submit" class="btn btn-primary btn-large">
                    <?php _e('Tham gia', 'live-quiz'); ?>
                </button>
                
                <div id="join-error" class="error-message" style="display: none;"></div>
            </form>
        </div>
    </div>
    
    <!-- Countdown Screen -->
    <div id="quiz-countdown" class="quiz-screen">
        <div class="quiz-card text-center">
            <h1 class="countdown-title"><?php _e('Quiz bắt đầu sau', 'live-quiz'); ?></h1>
            <div class="countdown-number" id="countdown-number">3</div>
        </div>
    </div>
    
    <!-- Final Question Announcement -->
    <div id="quiz-final-announcement" class="quiz-screen">
        <div class="quiz-card text-center">
            <h1 class="final-announcement-title"><?php _e('🏆 Câu hỏi cuối cùng! 🏆', 'live-quiz'); ?></h1>
            <p class="final-announcement-text"><?php _e('Điểm số gấp đôi!', 'live-quiz'); ?></p>
            <div class="final-announcement-points">2000 pts</div>
        </div>
    </div>
    
    <!-- Waiting Screen -->
    <div id="quiz-waiting" class="quiz-screen">
        <div class="quiz-card text-center">
            <div class="spinner"></div>
            <h2><?php _e('Đang chờ bắt đầu...', 'live-quiz'); ?></h2>
            <p class="waiting-info">
                <span id="waiting-player-name"></span><br>
                <strong><?php _e('Mã phòng:', 'live-quiz'); ?></strong> <span id="waiting-room-code" class="room-code clickable-room-code"></span>
            </p>
            <p id="participant-count" class="participant-count"></p>
            
            <div class="players-waiting-section">
                <h3 class="players-waiting-title"><?php _e('Người chơi đang chờ', 'live-quiz'); ?></h3>
                <div id="players-waiting-list" class="players-waiting-list">
                    <p class="no-players"><?php _e('Đang tải...', 'live-quiz'); ?></p>
                </div>
            </div>
            
            <button class="btn btn-secondary leave-room-btn" style="margin-top: 20px;">
                <?php _e('Rời khỏi phòng', 'live-quiz'); ?>
            </button>
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
            <button class="leave-room-btn leave-room-icon" title="<?php esc_attr_e('Rời khỏi phòng', 'live-quiz'); ?>">
                ✕
            </button>
        </div>
        
        <div class="quiz-card">
            <h2 class="question-text"></h2>
            
            <div class="choices-container" id="choices-container">
                <!-- Choices will be inserted here -->
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
            
            <button class="btn btn-secondary leave-room-btn" style="margin-top: 20px;">
                <?php _e('Rời khỏi phòng', 'live-quiz'); ?>
            </button>
        </div>
    </div>
    
    <!-- Top 3 Screen -->
    <div id="quiz-top3" class="quiz-screen">
        <div class="top10-container">
            <h1 class="top10-title"><?php _e('🏆 Bảng Xếp Hạng Cuối Cùng 🏆', 'live-quiz'); ?></h1>
            
            <!-- Podium for Top 3 -->
            <div id="top3-podium" class="top3-podium">
                <!-- Top 3 will be inserted here -->
            </div>
            
            <!-- Full Top 10 List (ranks 4-10) -->
            <div id="top3-list" class="top10-list">
                <!-- Ranks 4-10 will be inserted here -->
            </div>
        </div>
    </div>
    
    <!-- Final Results Screen -->
    <div id="quiz-final" class="quiz-screen">
        <div class="top10-container">
            <h1 class="top10-title"><?php _e('🏆 Bảng Xếp Hạng Cuối Cùng 🏆', 'live-quiz'); ?></h1>
            
            <!-- Podium for Top 3 -->
            <div id="player-top3-podium" class="top3-podium">
                <!-- Top 3 podium will be inserted here -->
            </div>
            
            <!-- Full Top 10 List (ranks 4-10) -->
            <div id="player-top10-list" class="top10-list">
                <!-- Ranks 4-10 will be inserted here -->
            </div>
        </div>
    </div>
    
    <!-- Leaderboard Overlay (Global - outside screens) -->
    <div id="player-leaderboard-overlay" class="leaderboard-overlay leaderboard-overlay-hidden">
        <div class="leaderboard-container">
            <h2><?php _e('Bảng xếp hạng', 'live-quiz'); ?></h2>
            <div id="player-animated-leaderboard" class="animated-leaderboard">
                <!-- Leaderboard items will be inserted here -->
            </div>
        </div>
    </div>
    
    <!-- Connection Status -->
    <div id="connection-status" class="connection-status" style="display: none;">
        <span class="status-icon"></span>
        <span class="status-text"></span>
    </div>
    </div>
</div>
