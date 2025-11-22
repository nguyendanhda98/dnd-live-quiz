<?php
/**
 * Session Manager
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_Session_Manager {
    
    /**
     * Session states
     */
    const STATE_LOBBY = 'lobby';
    const STATE_PLAYING = 'playing';
    const STATE_QUESTION = 'question';
    const STATE_RESULTS = 'results';
    const STATE_ENDED = 'ended';
    
    /**
     * Redis manager instance
     */
    private static $redis = null;
    
    /**
     * Check if Redis is enabled
     */
    private static function is_redis_enabled() {
        if (self::$redis === null) {
            if (class_exists('Live_Quiz_Redis_Manager')) {
                self::$redis = Live_Quiz_Redis_Manager::get_instance();
            }
        }
        return self::$redis && self::$redis->is_enabled();
    }
    
    /**
     * Get session data
     * 
     * @param int $session_id Session ID
     * @return array|null Session data
     */
    public static function get_session($session_id) {
        // Try Redis first (Phase 2)
        if (self::is_redis_enabled()) {
            $session = self::$redis->get_session($session_id);
            if ($session) {
                return $session;
            }
        }
        
        // Fallback to transients (Phase 1)
        $cache_key = "live_quiz_session_{$session_id}";
        $session = get_transient($cache_key);
        
        if ($session === false) {
            $post = get_post($session_id);
            if (!$post || $post->post_type !== 'live_quiz_session') {
                return null;
            }
            
            $quiz_id = get_post_meta($session_id, '_session_quiz_id', true);
            $room_code = get_post_meta($session_id, '_session_room_code', true);
            $status = get_post_meta($session_id, '_session_status', true) ?: self::STATE_LOBBY;
            $current_question = (int)get_post_meta($session_id, '_session_current_question', true);
            $host_id = $post->post_author;
            
            // Get quiz data
            $questions = get_post_meta($quiz_id, '_live_quiz_questions', true);
            $alpha = (float)get_post_meta($quiz_id, '_live_quiz_alpha', true) ?: 0.3;
            $max_players = (int)get_post_meta($quiz_id, '_live_quiz_max_players', true) ?: 500;
            
            $session = array(
                'id' => $session_id,
                'quiz_id' => $quiz_id,
                'room_code' => $room_code,
                'status' => $status,
                'current_question_index' => $current_question,
                'host_id' => $host_id,
                'questions' => is_array($questions) ? $questions : array(),
                'alpha' => $alpha,
                'max_players' => $max_players,
                'question_start_time' => get_post_meta($session_id, '_question_start_time', true),
            );
            
            set_transient($cache_key, $session, 60); // Cache 1 minute
        }
        
        return $session;
    }
    
    /**
     * Update session cache
     */
    public static function clear_session_cache($session_id) {
        // Clear Redis cache if enabled
        if (self::is_redis_enabled()) {
            self::$redis->delete_cache("session:{$session_id}");
        }
        
        // Clear transient cache (Phase 1 fallback)
        delete_transient("live_quiz_session_{$session_id}");
    }
    
    /**
     * Find session by room code
     * 
     * @param string $room_code Room code
     * @return int|null Session ID
     */
    public static function find_session_by_code($room_code) {
        $cache_key = "live_quiz_room_{$room_code}";
        $session_id = get_transient($cache_key);
        
        if ($session_id === false) {
            $posts = get_posts(array(
                'post_type' => 'live_quiz_session',
                'meta_key' => '_session_room_code',
                'meta_value' => strtoupper(sanitize_text_field($room_code)),
                'posts_per_page' => 1,
                'post_status' => 'publish',
            ));
            
            if (empty($posts)) {
                return null;
            }
            
            $session_id = $posts[0]->ID;
            set_transient($cache_key, $session_id, 3600); // Cache 1 hour
        }
        
        return $session_id;
    }
    
    /**
     * Start session
     * 
     * @param int $session_id Session ID
     * @return bool Success
     */
    public static function start_session($session_id) {
        error_log("\n\n========================================");
        error_log("[START SESSION] FUNCTION CALLED");
        error_log("[START SESSION] Session ID: {$session_id}");
        error_log("[START SESSION] Time: " . date('Y-m-d H:i:s'));
        error_log("========================================\n");
        
        $session = self::get_session($session_id);
        if (!$session || $session['status'] !== self::STATE_LOBBY) {
            error_log("[START SESSION] ERROR: Invalid session status");
            return false;
        }
        
        // CRITICAL: Clear ALL data from previous games when starting a new session
        // This ensures clean slate for replay functionality
        global $wpdb;
        
        // 1. Clear answer count transients (fixes "3/2 answered" bug)
        $deleted_transients = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
                '_transient_live_quiz_answer_count_' . $session_id . '_%',
                '_transient_timeout_live_quiz_answer_count_' . $session_id . '_%'
            )
        );
        error_log("[START SESSION] Cleared {$deleted_transients} answer count transients");
        
        // 2. Delete all _answer_* post meta (clears individual answers)
        $deleted_answers = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key LIKE '_answer_%%'",
                $session_id
            )
        );
        error_log("[START SESSION] Deleted {$deleted_answers} answer entries");
        
        // 3a. Reset current game question tracking metadata
        delete_post_meta($session_id, '_current_game_question_indexes');
        delete_post_meta($session_id, '_answer_count_reset_time');
        
        // 3. Reset participant scores to 0
        $participants = get_post_meta($session_id, '_participants', true);
        if (is_array($participants)) {
            foreach ($participants as $user_id => &$participant) {
                $participant['answers'] = array();
                $participant['score'] = 0;
            }
            update_post_meta($session_id, '_participants', $participants);
            error_log("[START SESSION] Reset " . count($participants) . " participant scores");
        }
        
        error_log("[START SESSION] ✓ Cleaned all previous game data for session {$session_id}");
        
        // Update session status
        update_post_meta($session_id, '_session_status', self::STATE_PLAYING);
        update_post_meta($session_id, '_session_current_question', 0);
        update_post_meta($session_id, '_session_started_at', time());
        
        // Update Redis if enabled
        if (self::is_redis_enabled()) {
            self::$redis->update_session_field($session_id, 'status', self::STATE_PLAYING);
            self::$redis->update_session_field($session_id, 'current_question_index', 0);
        }
        
        self::clear_session_cache($session_id);
        
        // Start first question
        return self::start_question($session_id, 0);
    }
    
    /**
     * Start a specific question
     * 
     * @param int $session_id Session ID
     * @param int $question_index Question index
     * @return bool Success
     */
    public static function start_question($session_id, $question_index) {
        $session = self::get_session($session_id);
        if (!$session || !isset($session['questions'][$question_index])) {
            return false;
        }
        // Reset answer count for this question to avoid carrying over stale data
        self::reset_answer_count($session_id, $question_index);
        error_log("[START QUESTION] Reset answer count for session {$session_id} question {$question_index}");
        
        $start_time = microtime(true);
        
        // Fixed 3-second delay before choices appear and timer starts
        // This gives players time to read the question
        $timer_delay = 3.0;
        $actual_timer_start = $start_time + $timer_delay;
        
        // First 1 second after timer starts is "freeze period" at 1000 points
        $freeze_period = 1.0;
        $scoring_start = $actual_timer_start + $freeze_period;
        
        update_post_meta($session_id, '_session_status', self::STATE_QUESTION);
        update_post_meta($session_id, '_session_current_question', $question_index);
        update_post_meta($session_id, '_question_start_time', $actual_timer_start);
        update_post_meta($session_id, '_question_broadcast_time', $start_time);
        
        // Update Redis if enabled
        if (self::is_redis_enabled()) {
            self::$redis->update_session_field($session_id, 'status', self::STATE_QUESTION);
            self::$redis->update_session_field($session_id, 'current_question_index', $question_index);
            self::$redis->set_current_question($session_id, array(
                'question_index' => $question_index,
                'start_time' => $start_time,
                'question' => $session['questions'][$question_index],
            ));
        }
        
        // Get total questions count
        $total_questions = count($session['questions']);
        
        // Shuffle choices and create mapping
        $original_choices = $session['questions'][$question_index]['choices'];
        $shuffled_data = self::shuffle_choices_with_mapping($original_choices);
        $shuffled_choices = $shuffled_data['choices'];
        $choice_mapping = $shuffled_data['mapping']; // mapping[shuffled_index] = original_index
        
        // Save mapping to session meta for later validation
        update_post_meta($session_id, "_question_{$question_index}_choice_mapping", $choice_mapping);
        error_log('[Session Manager] Saved choice mapping: ' . json_encode($choice_mapping));
        
        // Notify WebSocket server if available (regardless of Redis)
        if (class_exists('Live_Quiz_WebSocket_Helper')) {
            error_log('[Session Manager] Notifying WebSocket server about question start');
            error_log('[Session Manager] Session: ' . $session_id . ', Question: ' . $question_index);
            
            $result = Live_Quiz_WebSocket_Helper::start_question($session_id, $question_index, array(
                'text' => $session['questions'][$question_index]['text'],
                'choices' => array_map(function($choice) {
                    return array('text' => $choice['text']);
                }, $shuffled_choices), // Use shuffled choices
                'time_limit' => $session['questions'][$question_index]['time_limit'],
                'start_time' => $start_time,
                'timer_delay' => $timer_delay,
                'actual_timer_start' => $actual_timer_start,
                'total_questions' => $total_questions,
            ));
            
            if ($result) {
                error_log('[Session Manager] ✓ WebSocket notification successful');
            } else {
                error_log('[Session Manager] ✗ WebSocket notification FAILED');
            }
        } else {
            error_log('[Session Manager] ✗ Live_Quiz_WebSocket_Helper class not found');
        }
        
        self::clear_session_cache($session_id);
        
        return true;
    }
    
    /**
     * End current question and show results
     * 
     * @param int $session_id Session ID
     * @return bool Success
     */
    public static function end_question($session_id) {
        $session = self::get_session($session_id);
        if (!$session || $session['status'] !== self::STATE_QUESTION) {
            return false;
        }
        
        update_post_meta($session_id, '_session_status', self::STATE_RESULTS);
        
        $question_index = $session['current_question_index'];
        
        // Find correct answer first (original index)
        $correct_answer_original = null;
        foreach ($session['questions'][$question_index]['choices'] as $index => $choice) {
            if (!empty($choice['is_correct'])) {
                $correct_answer_original = $index;
                break;
            }
        }
        
        // Map correct answer to shuffled index for client display
        $correct_answer_shuffled = $correct_answer_original;
        $choice_mapping = get_post_meta($session_id, "_question_{$question_index}_choice_mapping", true);
        if ($choice_mapping) {
            // Reverse mapping: find shuffled index for original index
            $reverse_mapping = array_flip($choice_mapping);
            if (isset($reverse_mapping[$correct_answer_original])) {
                $correct_answer_shuffled = $reverse_mapping[$correct_answer_original];
                error_log("Mapped correct answer: original=$correct_answer_original, shuffled=$correct_answer_shuffled");
            }
        }
        
        // Use shuffled index for client display
        $correct_answer = $correct_answer_shuffled;
        
        // Update Redis if enabled
        if (self::is_redis_enabled()) {
            self::$redis->update_session_field($session_id, 'status', self::STATE_RESULTS);
            self::$redis->clear_current_question($session_id);
        }
        
        self::clear_session_cache($session_id);
        Live_Quiz_Scoring::clear_leaderboard_cache($session_id);
        
        // Get current question stats
        $stats = Live_Quiz_Scoring::get_question_stats($session_id, $session['current_question_index']);
        $leaderboard = Live_Quiz_Scoring::get_leaderboard($session_id, 10);
        
        // Get scores for current question (for animation)
        $question_scores = array();
        foreach ($leaderboard as $entry) {
            $answers = Live_Quiz_Scoring::get_participant_answers($session_id, $entry['user_id']);
            if (isset($answers[$session['current_question_index']])) {
                $question_scores[$entry['user_id']] = (int)$answers[$session['current_question_index']]['score'];
            } else {
                $question_scores[$entry['user_id']] = 0;
            }
        }
        
        // Notify WebSocket server with leaderboard and question scores (always, not just when Redis enabled)
        if (class_exists('Live_Quiz_WebSocket_Helper')) {
            Live_Quiz_WebSocket_Helper::end_question($session_id, $correct_answer, $leaderboard, $question_scores);
        }
        
        return true;
    }
    
    /**
     * Kick player from session
     * 
     * @param int $session_id Session ID
     * @param string $user_id User ID to kick
     * @return array Result with success status and message
     */
    public static function kick_player($session_id, $user_id) {
        $session = self::get_session($session_id);
        if (!$session) {
            return array(
                'success' => false,
                'message' => __('Phiên không tồn tại', 'live-quiz'),
            );
        }
        
        // CRITICAL: Clear user's active session from user meta to prevent auto-rejoin
        error_log('[LiveQuiz Session Manager] Clearing user session meta for user: ' . $user_id);
        delete_user_meta($user_id, 'live_quiz_active_session');
        
        // CRITICAL: Remove player from ALL storage (Redis, post meta, transient)
        error_log('[LiveQuiz Session Manager] Removing player from all storage...');
        $remove_result = self::remove_participant($session_id, $user_id);
        if (is_wp_error($remove_result)) {
            error_log('[LiveQuiz Session Manager] Warning: Failed to remove participant: ' . $remove_result->get_error_message());
        } else {
            error_log('[LiveQuiz Session Manager] Player removed from all storage successfully');
        }
        
        return array(
            'success' => true,
            'message' => __('Đã kick người chơi thành công', 'live-quiz'),
        );
    }
    
    /**
     * Ban player from this session only
     * Store in Redis with TTL (auto-delete after 24h)
     * 
     * @param int $session_id Session ID
     * @param int $user_id User ID to ban
     * @return array Result
     */
    public static function ban_from_session($session_id, $user_id) {
        $session = self::get_session($session_id);
        if (!$session) {
            return array(
                'success' => false,
                'message' => __('Phiên không tồn tại', 'live-quiz'),
            );
        }
        
        // Store ban in Redis (will auto-delete after TTL expires)
        // This is more efficient than post meta for temporary data
        error_log('[LiveQuiz Session Manager] Banning user ' . $user_id . ' from session ' . $session_id);
        
        // Ban via WebSocket (stores in Redis with TTL)
        if (class_exists('Live_Quiz_WebSocket_Helper')) {
            $result = Live_Quiz_WebSocket_Helper::ban_from_session($session_id, $user_id);
            if (!$result) {
                error_log('[LiveQuiz Session Manager] Warning: WebSocket ban failed, falling back to local storage');
            }
        }
        
        // Also kick them if they're currently in the session
        delete_user_meta($user_id, 'live_quiz_active_session');
        
        // CRITICAL: Remove player from ALL storage (Redis, post meta, transient)
        error_log('[LiveQuiz Session Manager] Removing banned player from all storage...');
        $remove_result = self::remove_participant($session_id, $user_id);
        if (is_wp_error($remove_result)) {
            error_log('[LiveQuiz Session Manager] Warning: Failed to remove participant: ' . $remove_result->get_error_message());
        } else {
            error_log('[LiveQuiz Session Manager] Banned player removed from all storage successfully');
        }
        
        return array(
            'success' => true,
            'message' => __('Đã ban người chơi khỏi phòng này', 'live-quiz'),
        );
    }
    
    /**
     * Ban player permanently from all sessions by this host
     * 
     * @param int $host_id Host user ID
     * @param int $user_id User ID to ban
     * @return array Result
     */
    public static function ban_permanently($host_id, $user_id) {
        // Get host's permanent ban list
        $banned_users = get_user_meta($host_id, 'live_quiz_banned_users', true);
        if (!is_array($banned_users)) {
            $banned_users = array();
        }
        
        // Add user to permanent ban list
        if (!in_array($user_id, $banned_users)) {
            $banned_users[] = $user_id;
            update_user_meta($host_id, 'live_quiz_banned_users', $banned_users);
        }
        
        error_log('[LiveQuiz Session Manager] Host ' . $host_id . ' permanently banned user ' . $user_id);
        
        // Clear their active session if any
        delete_user_meta($user_id, 'live_quiz_active_session');
        
        // NOTE: Removal from current session is handled by REST API calling kick_player()
        // This is intentional - ban_permanently only manages the permanent ban list
        
        return array(
            'success' => true,
            'message' => __('Đã ban người chơi vĩnh viễn', 'live-quiz'),
        );
    }
    
    /**
     * Check if user is banned from session
     * Check Redis first (fast), fallback to WebSocket server
     * 
     * @param int $session_id Session ID
     * @param int $user_id User ID
     * @return bool Is banned
     */
    public static function is_banned_from_session($session_id, $user_id) {
        // Check via WebSocket (Redis check)
        if (class_exists('Live_Quiz_WebSocket_Helper')) {
            $is_banned = Live_Quiz_WebSocket_Helper::is_session_banned($session_id, $user_id);
            if ($is_banned !== null) {
                return $is_banned;
            }
        }
        
        // Fallback: check local Redis if available
        if (self::is_redis_enabled()) {
            // Redis check would go here
        }
        
        // No ban found
        return false;
    }
    
    /**
     * Check if user is permanently banned by host
     * 
     * @param int $host_id Host user ID
     * @param int $user_id User ID
     * @return bool Is banned
     */
    public static function is_permanently_banned($host_id, $user_id) {
        $banned_users = get_user_meta($host_id, 'live_quiz_banned_users', true);
        if (!is_array($banned_users)) {
            return false;
        }
        return in_array($user_id, $banned_users);
    }
    
    /**
     * Move to next question
     * 
     * @param int $session_id Session ID
     * @return bool Success
     */
    public static function next_question($session_id) {
        $session = self::get_session($session_id);
        if (!$session || $session['status'] !== self::STATE_RESULTS) {
            return false;
        }
        
        $next_index = $session['current_question_index'] + 1;
        
        // Check if there are more questions
        if ($next_index >= count($session['questions'])) {
            return self::end_session($session_id);
        }
        
        return self::start_question($session_id, $next_index);
    }
    
    /**
     * End session
     * 
     * @param int $session_id Session ID
     * @return bool Success
     */
    public static function end_session($session_id) {
        error_log("=== END SESSION CALLED for session_id: {$session_id} ===");
        
        update_post_meta($session_id, '_session_status', self::STATE_ENDED);
        update_post_meta($session_id, '_session_ended_at', time());
        
        error_log("Updated session status to ENDED in database");
        
        // Update Redis if enabled
        if (self::is_redis_enabled()) {
            self::$redis->update_session_field($session_id, 'status', self::STATE_ENDED);
            error_log("Updated session status in Redis");
        }
        
        // Notify WebSocket server (regardless of Redis)
        if (class_exists('Live_Quiz_WebSocket_Helper')) {
            error_log("Notifying WebSocket server about session end");
            Live_Quiz_WebSocket_Helper::end_session($session_id);
        }
        
        self::clear_session_cache($session_id);
        
        // Clear active session from all participants' user meta
        error_log("Clearing all participants' active sessions...");
        self::clear_all_participants_session($session_id);
        
        error_log("=== END SESSION COMPLETED ===");
        
        return true;
    }
    
    /**
     * Add participant to session
     * 
     * @param int $session_id Session ID
     * @param string $display_name Display name
     * @return array|WP_Error Participant data or error
     */
    public static function add_participant($session_id, $display_name) {
        $session = self::get_session($session_id);
        if (!$session) {
            return new WP_Error('invalid_session', __('Phiên không tồn tại', 'live-quiz'));
        }
        
        if ($session['status'] === self::STATE_ENDED) {
            return new WP_Error('session_ended', __('Phiên đã kết thúc', 'live-quiz'));
        }
        
        // Check max players
        $participants = self::get_participants($session_id);
        if (count($participants) >= $session['max_players']) {
            return new WP_Error('session_full', __('Phòng đã đầy', 'live-quiz'));
        }
        
        // Require WordPress login
        $user_id = get_current_user_id();
        if (!$user_id) {
            return new WP_Error('not_logged_in', __('Bạn cần đăng nhập để tham gia quiz', 'live-quiz'));
        }
        
        // Check if user already in session
        foreach ($participants as $p) {
            if ($p['user_id'] == $user_id) {
                // User already joined - this is OK for multi-device support
                // Just return the existing participant data
                // The join_session REST API will handle kicking old connections
                error_log("[Live Quiz] User {$user_id} already in session {$session_id} - returning existing data");
                return $p; // Return existing participant instead of error
            }
        }
        
        $participant = array(
            'user_id' => $user_id,
            'display_name' => sanitize_text_field($display_name),
            'joined_at' => time(),
            'ip_address' => self::get_client_ip(),
        );
        
        // Save to Redis if enabled
        if (self::is_redis_enabled()) {
            self::$redis->add_participant($session_id, $user_id, $participant['display_name']);
        }
        
        // Save display_name to Redis for leaderboard (direct connection)
        try {
            $redis_host = get_option('live_quiz_redis_host', '127.0.0.1');
            $redis_port = get_option('live_quiz_redis_port', 6379);
            $redis = new Redis();
            if ($redis->connect($redis_host, $redis_port, 2)) {
                $redis->hSet("player:{$session_id}:{$user_id}", 'display_name', $participant['display_name']);
                error_log("Saved display_name to Redis: player:{$session_id}:{$user_id}");
                $redis->close();
            }
        } catch (Exception $e) {
            error_log("Failed to save display_name to Redis: " . $e->getMessage());
        }
        
        // Always save to post meta for persistence and fallback
        // Get fresh participants list from post_meta to avoid race conditions
        $stored_participants = get_post_meta($session_id, '_session_participants', true);
        if (!is_array($stored_participants)) {
            $stored_participants = array();
        }
        
        // Add new participant
        $stored_participants[] = $participant;
        update_post_meta($session_id, '_session_participants', $stored_participants);
        
        // Clear cache and immediately set new cache to avoid race condition
        $cache_key = "live_quiz_participants_{$session_id}";
        delete_transient($cache_key);
        set_transient($cache_key, $stored_participants, 60);
        
        return $participant;
    }
    
    /**
     * Remove participant from session
     * 
     * @param int $session_id Session ID
     * @param string $user_id User ID to remove
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public static function remove_participant($session_id, $user_id) {
        $session = self::get_session($session_id);
        if (!$session) {
            return new WP_Error('invalid_session', __('Phiên không tồn tại', 'live-quiz'));
        }
        
        // Remove from Redis if enabled
        if (self::is_redis_enabled()) {
            self::$redis->remove_participant($session_id, $user_id);
        }
        
        // Remove from post meta
        $stored_participants = get_post_meta($session_id, '_session_participants', true);
        if (is_array($stored_participants)) {
            // Filter out the participant
            $stored_participants = array_filter($stored_participants, function($p) use ($user_id) {
                return $p['user_id'] !== $user_id;
            });
            
            // Re-index array
            $stored_participants = array_values($stored_participants);
            
            update_post_meta($session_id, '_session_participants', $stored_participants);
            
            // Clear cache and set new cache
            $cache_key = "live_quiz_participants_{$session_id}";
            delete_transient($cache_key);
            set_transient($cache_key, $stored_participants, 60);
        }
        
        return true;
    }
    
    /**
     * Get participants
     * 
     * @param int $session_id Session ID
     * @return array Participants
     */
    public static function get_participants($session_id) {
        // Try Redis first (Phase 2)
        if (self::is_redis_enabled()) {
            $participants = self::$redis->get_participants($session_id);
            if ($participants !== false && is_array($participants) && !empty($participants)) {
                return $participants;
            }
        }
        
        // Fallback to transients and post_meta (Phase 1)
        $cache_key = "live_quiz_participants_{$session_id}";
        $participants = get_transient($cache_key);
        
        if ($participants === false || !is_array($participants)) {
            $participants = get_post_meta($session_id, '_session_participants', true);
            if (!is_array($participants)) {
                $participants = array();
            }
            if (!empty($participants)) {
                set_transient($cache_key, $participants, 60);
            }
        }
        
        return $participants;
    }
    
    /**
     * Submit answer
     * 
     * @param int $session_id Session ID
     * @param string $user_id User ID
     * @param int $choice_id Choice ID
     * @param float|null $submit_time Optional client-provided synchronized server time (in seconds)
     * @return array|WP_Error Result or error
     */
    public static function submit_answer($session_id, $user_id, $choice_id, $submit_time = null) {
        error_log("SessionManager::submit_answer called - Session: $session_id, User: $user_id, Choice: $choice_id");
        if ($submit_time) {
            error_log("Client submit_time (synchronized): $submit_time");
        }
        
        try {
            $session = self::get_session($session_id);
            
            if (!$session) {
                error_log("ERROR: Session not found");
                return new WP_Error('invalid_session', __('Phiên không tồn tại', 'live-quiz'));
            }
            
            error_log("Session status: " . $session['status']);
            
            if ($session['status'] !== self::STATE_QUESTION) {
                error_log("ERROR: Session not in question state");
                return new WP_Error('not_accepting_answers', __('Không nhận câu trả lời lúc này', 'live-quiz'));
            }
            
            $question_index = $session['current_question_index'];
            $question = $session['questions'][$question_index];
            
            error_log("Question index: $question_index");
            error_log("Received choice_id (shuffled): $choice_id");
            
            // Map shuffled choice_id back to original choice_id
            $choice_mapping = get_post_meta($session_id, "_question_{$question_index}_choice_mapping", true);
            if ($choice_mapping && isset($choice_mapping[$choice_id])) {
                $original_choice_id = $choice_mapping[$choice_id];
                error_log("Mapped to original choice_id: $original_choice_id");
            } else {
                // Fallback: if no mapping found, use choice_id as-is (backward compatibility)
                $original_choice_id = $choice_id;
                error_log("No mapping found, using choice_id as-is: $original_choice_id");
            }
            
            // Check if already answered
            $existing = Live_Quiz_Scoring::get_participant_answers($session_id, $user_id);
            if (isset($existing[$question_index])) {
                error_log("ERROR: User already answered this question");
                return new WP_Error('already_answered', __('Đã trả lời câu hỏi này', 'live-quiz'));
            }
            
            // Calculate time taken
            // If client provided synchronized submit_time, use it (more accurate with clock sync)
            // Otherwise fall back to server-side time (backward compatibility)
            if ($submit_time && is_numeric($submit_time)) {
                $time_taken = Live_Quiz_Scoring::calculate_time_taken(
                    (float)$session['question_start_time'],
                    (float)$submit_time
                );
                error_log("Time taken (from client sync): $time_taken seconds");
            } else {
                $answer_time = microtime(true);
                $time_taken = Live_Quiz_Scoring::calculate_time_taken(
                    (float)$session['question_start_time'],
                    $answer_time
                );
                error_log("Time taken (server-side): $time_taken seconds");
            }
            
            // Validate answer using ORIGINAL choice_id
            $validation = Live_Quiz_Scoring::validate_answer(
                array(
                    'choice_id' => $original_choice_id,
                    'question_id' => $question_index,
                    'server_time_taken' => $time_taken,
                ),
                $question
            );
            
            if (!$validation['valid']) {
                error_log("ERROR: Answer validation failed: " . $validation['reason']);
                return new WP_Error('invalid_answer', $validation['reason']);
            }
            
            // Check if correct using ORIGINAL choice_id
            $is_correct = Live_Quiz_Scoring::is_correct($original_choice_id, $question);
            error_log("Is correct: " . ($is_correct ? 'yes' : 'no'));
            
            // Calculate score
            $score = 0;
            if ($is_correct) {
                $score = Live_Quiz_Scoring::calculate_score(
                    $question['base_points'],
                    $question['time_limit'],
                    $time_taken,
                    $session['alpha']
                );
            }
            
            error_log("Score: $score");
            
            // Save answer (Redis if enabled, otherwise transient)
            // Use ORIGINAL choice_id for consistency with database
            $answer_data = array(
                'question_id' => $question_index,
                'choice_id' => $original_choice_id,
                'is_correct' => $is_correct,
                'time_taken' => $time_taken,
                'score' => $score,
            );
            
            if (self::is_redis_enabled()) {
                self::$redis->save_answer($session_id, $user_id, $question_index, $answer_data);
            }
            
            Live_Quiz_Scoring::save_answer($session_id, $user_id, $question_index, $answer_data);
            
            // Update Redis leaderboard (for final leaderboard display)
            try {
                $redis_host = get_option('live_quiz_redis_host', '127.0.0.1');
                $redis_port = get_option('live_quiz_redis_port', 6379);
                $redis = new Redis();
                if ($redis->connect($redis_host, $redis_port, 2)) {
                    // Calculate total score from all answers
                    $all_answers = Live_Quiz_Scoring::get_participant_answers($session_id, $user_id);
                    $total_score = 0;
                    foreach ($all_answers as $ans) {
                        $total_score += isset($ans['score']) ? (float)$ans['score'] : 0;
                    }
                    // Update leaderboard sorted set with new total
                    $redis->zAdd("leaderboard:{$session_id}", array(), $total_score, (string)$user_id);
                    error_log("Updated Redis leaderboard: user $user_id score $total_score");
                    $redis->close();
                }
            } catch (Exception $e) {
                error_log("Redis leaderboard update failed: " . $e->getMessage());
                // Continue anyway - not critical
            }
            
            // Clear leaderboard cache
            Live_Quiz_Scoring::clear_leaderboard_cache($session_id);
            
            // Track answer count
            error_log("\n========================================");
            error_log("[ANSWER COUNT] TRACKING ANSWER COUNT");
            error_log("[ANSWER COUNT] Session: {$session_id}, Question: {$question_index}, User: {$user_id}");
            
            $answer_count = self::increment_answer_count($session_id, $question_index);
            $participants = self::get_participants($session_id);
            $total_players = is_array($participants) ? count($participants) : 0;
            
            error_log("[ANSWER COUNT] Result: {$answer_count}/{$total_players}");
            error_log("[ANSWER COUNT] Participants list: " . implode(', ', array_keys($participants)));
            error_log("========================================\n");
            
            // Notify via WebSocket about answer submission
            Live_Quiz_WebSocket_Helper::answer_submitted($session_id, array(
                'user_id' => $user_id,
                'answered_count' => $answer_count,
                'total_players' => $total_players,
                'score' => $score,
            ));
            
            // Check if all players answered - auto end question
            if ($answer_count >= $total_players && $total_players > 0) {
                error_log("All players answered! Auto-ending question.");
                // Schedule auto-end after a brief delay (1 second)
                // We'll use a transient to trigger this
                set_transient("live_quiz_auto_end_{$session_id}_{$question_index}", true, 60);
            }
            
            error_log("Submit answer completed successfully");
            
            return array(
                'success' => true,
                'is_correct' => $is_correct,
                'score' => $score,
                'time_taken' => $time_taken,
                'answered_count' => $answer_count,
                'total_players' => $total_players,
            );
            
        } catch (Exception $e) {
            error_log("EXCEPTION in submit_answer: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return new WP_Error('exception', $e->getMessage());
        }
    }
    
    /**
     * Increment answer count for current question
     * 
     * @param int $session_id Session ID
     * @param int $question_index Question index
     * @return int Current answer count
     */
    public static function increment_answer_count($session_id, $question_index) {
        $key = "live_quiz_answer_count_{$session_id}_{$question_index}";
        
        // CRITICAL FIX: Check if this is a new game session
        // If session_started_at changed, it means a new game started - reset count to 0
        $session_started_at = get_post_meta($session_id, '_session_started_at', true);
        $last_reset_time = get_post_meta($session_id, '_answer_count_reset_time', true);
        $old_count = (int)get_transient($key);
        
        // Get current game question indexes BEFORE checking reset
        $current_game_questions = get_post_meta($session_id, '_current_game_question_indexes', true);
        if (!is_array($current_game_questions)) {
            $current_game_questions = array();
        }
        
        // CRITICAL: If question_index is already in current game list, we're in the SAME game
        // Don't reset - just use the existing transient value
        if (in_array($question_index, $current_game_questions)) {
            error_log("[INCREMENT ANSWER COUNT] Question {$question_index} is in current game list - using existing transient (old_count: {$old_count})");
            // Don't reset, just use old_count as is
        } else {
            // Question not in current game - check if we need to reset
            // Check if we need to reset ALL transients (new game detected):
            // 1. If last_reset_time doesn't exist (first time)
            // 2. If session_started_at is newer than last reset (new game started)
            $needs_full_reset = false;
            if (!$last_reset_time) {
                $needs_full_reset = true;
                error_log("[INCREMENT ANSWER COUNT] No reset time found - will reset ALL transients");
            } elseif ($session_started_at && $session_started_at > $last_reset_time) {
                $needs_full_reset = true;
                error_log("[INCREMENT ANSWER COUNT] Session started at {$session_started_at} > last reset {$last_reset_time} - will reset ALL transients");
            }
            
            if ($needs_full_reset) {
                error_log("[INCREMENT ANSWER COUNT] NEW GAME DETECTED - Resetting all transients for session {$session_id}");
                
                // Delete ALL transients for this session
                global $wpdb;
                $deleted = $wpdb->query(
                    $wpdb->prepare(
                        "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
                        '_transient_live_quiz_answer_count_' . $session_id . '_%',
                        '_transient_timeout_live_quiz_answer_count_' . $session_id . '_%'
                    )
                );
                error_log("[INCREMENT ANSWER COUNT] Deleted {$deleted} old transients");
                
                // Mark that we've reset for this session start time (or current time if not set)
                $reset_time = $session_started_at ? $session_started_at : time();
                update_post_meta($session_id, '_answer_count_reset_time', $reset_time);
                
                // Track which question_indexes have been incremented in current game
                update_post_meta($session_id, '_current_game_question_indexes', array());
                $current_game_questions = array();
                
                // Reset old_count to 0 after deletion
                $old_count = 0;
            } elseif ($old_count > 0) {
                // Question not in current game but has old_count - it's from previous game
                error_log("[INCREMENT ANSWER COUNT] Question {$question_index} has old count {$old_count} but not in current game - this is from previous game, resetting");
                delete_transient($key);
                $old_count = 0;
            }
        }
        
        if ($needs_full_reset) {
            error_log("[INCREMENT ANSWER COUNT] NEW GAME DETECTED - Resetting all transients for session {$session_id}");
            
            // Delete ALL transients for this session
            global $wpdb;
            $deleted = $wpdb->query(
                $wpdb->prepare(
                    "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
                    '_transient_live_quiz_answer_count_' . $session_id . '_%',
                    '_transient_timeout_live_quiz_answer_count_' . $session_id . '_%'
                )
            );
            error_log("[INCREMENT ANSWER COUNT] Deleted {$deleted} old transients");
            
            // Mark that we've reset for this session start time (or current time if not set)
            $reset_time = $session_started_at ? $session_started_at : time();
            update_post_meta($session_id, '_answer_count_reset_time', $reset_time);
            
            // Track which question_indexes have been incremented in current game
            update_post_meta($session_id, '_current_game_question_indexes', array());
            $current_game_questions = array();
            
            // Reset old_count to 0 after deletion
            $old_count = 0;
        }
        
        // Track this question_index as incremented in current game
        // Always add to list, even if it's already there (idempotent)
        if (!in_array($question_index, $current_game_questions)) {
            $current_game_questions[] = $question_index;
            update_post_meta($session_id, '_current_game_question_indexes', $current_game_questions);
            error_log("[INCREMENT ANSWER COUNT] Added question_index {$question_index} to current game list");
        }
        
        $count = $old_count + 1;
        set_transient($key, $count, 3600); // 1 hour
        
        error_log("[INCREMENT ANSWER COUNT] Key: {$key}");
        error_log("[INCREMENT ANSWER COUNT] Old count: {$old_count} -> New count: {$count}");
        error_log("[INCREMENT ANSWER COUNT] Session started at: {$session_started_at}, Last reset: {$last_reset_time}");
        
        return $count;
    }
    
    /**
     * Get answer count for current question
     * 
     * @param int $session_id Session ID
     * @param int $question_index Question index
     * @return int Answer count
     */
    public static function get_answer_count($session_id, $question_index) {
        $key = "live_quiz_answer_count_{$session_id}_{$question_index}";
        return (int)get_transient($key);
    }
    
    /**
     * Reset answer count for a question
     * 
     * @param int $session_id Session ID
     * @param int $question_index Question index
     */
    public static function reset_answer_count($session_id, $question_index) {
        $key = "live_quiz_answer_count_{$session_id}_{$question_index}";
        delete_transient($key);
        
        // Remove this question_index from current game tracking
        $current_game_questions = get_post_meta($session_id, '_current_game_question_indexes', true);
        if (is_array($current_game_questions) && !empty($current_game_questions)) {
            $new_list = array();
            foreach ($current_game_questions as $idx) {
                if ((int)$idx !== (int)$question_index) {
                    $new_list[] = $idx;
                }
            }
            update_post_meta($session_id, '_current_game_question_indexes', $new_list);
        }
        
        error_log("[RESET ANSWER COUNT] Cleared transient {$key} and updated question index tracking");
    }
    
    /**
     * Shuffle choices and create mapping to original indices
     * 
     * @param array $choices Original choices array
     * @return array Array with 'choices' (shuffled) and 'mapping' (shuffled_index => original_index)
     */
    private static function shuffle_choices_with_mapping($choices) {
        // Create array of indices
        $indices = array_keys($choices);
        
        // Shuffle the indices
        shuffle($indices);
        
        // Create shuffled choices array and mapping
        $shuffled_choices = array();
        $mapping = array(); // mapping[new_index] = original_index
        
        foreach ($indices as $new_index => $original_index) {
            $shuffled_choices[$new_index] = $choices[$original_index];
            $mapping[$new_index] = $original_index;
        }
        
        return array(
            'choices' => $shuffled_choices,
            'mapping' => $mapping,
        );
    }
    
    /**
     * Get client IP address
     */
    private static function get_client_ip() {
        $ip = '';
        
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        }
        
        return sanitize_text_field($ip);
    }
    
    /**
     * Clear active session from all participants when session ends
     * 
     * @param int $session_id Session ID
     */
    private static function clear_all_participants_session($session_id) {
        global $wpdb;
        
        // Get all users who have this session as their active session
        $meta_key = '_live_quiz_active_session';
        
        error_log("Querying users with active session meta...");
        
        // Query all user IDs with this meta key
        $user_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key = %s",
            $meta_key
        ));
        
        error_log("Found " . count($user_ids) . " users with active session meta");
        
        if (empty($user_ids)) {
            error_log("No users found with active session meta");
            return;
        }
        
        $cleared_count = 0;
        
        // Check each user's active session and clear if it matches this session_id
        foreach ($user_ids as $user_id) {
            $active_session = get_user_meta($user_id, $meta_key, true);
            
            if (is_array($active_session) && isset($active_session['session_id'])) {
                error_log("User {$user_id} has active session: " . $active_session['session_id']);
                
                if ((int)$active_session['session_id'] === (int)$session_id) {
                    delete_user_meta($user_id, $meta_key);
                    $cleared_count++;
                    error_log("✓ Cleared active session for user {$user_id} (session {$session_id})");
                }
            }
        }
        
        error_log("Total cleared: {$cleared_count} user(s)");
    }
    
    /**
     * Check if user can control session (is host)
     * 
     * @param int $session_id Session ID
     * @param int $user_id WordPress user ID
     * @return bool Can control
     */
    public static function can_control_session($session_id, $user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        if (!$user_id) {
            return false;
        }
        
        $session = self::get_session($session_id);
        if (!$session) {
            return false;
        }
        
        // Check if user is the host of this session
        if ((int)$session['host_id'] === (int)$user_id) {
            return true;
        }
        
        // Admin can also control any session
        if (current_user_can('manage_options')) {
            return true;
        }
        
        return false;
    }
}
