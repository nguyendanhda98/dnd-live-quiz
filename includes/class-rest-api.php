<?php
/**
 * REST API Endpoints
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_REST_API {
    
    /**
     * Namespace
     */
    const NAMESPACE = 'live-quiz/v1';
    
    /**
     * Initialize
     */
    public static function init() {
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
    }
    
    /**
     * Register REST routes
     */
    public static function register_routes() {
        // Sessions
        register_rest_route(self::NAMESPACE, '/sessions', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'create_session'),
            'permission_callback' => array(__CLASS__, 'check_admin_permission'),
        ));
        
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/start', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'start_session'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/next', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'next_question'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/end', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'end_session'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/replay', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'replay_session'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        // TEST endpoint to verify answer deletion
        register_rest_route(self::NAMESPACE, '/test-delete-answers/(?P<id>\d+)', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'test_delete_answers'),
            'permission_callback' => '__return_true', // Public for testing
        ));
        
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_session'),
            'permission_callback' => '__return_true',
        ));
        
        // Join session
        register_rest_route(self::NAMESPACE, '/join', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'join_session'),
            'permission_callback' => '__return_true',
        ));
        
        // Submit answer
        register_rest_route(self::NAMESPACE, '/answer', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'submit_answer'),
            'permission_callback' => '__return_true',
        ));
        
        // Leave session
        register_rest_route(self::NAMESPACE, '/leave', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'leave_session'),
            'permission_callback' => '__return_true',
        ));
        
        // Get leaderboard
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/leaderboard', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_leaderboard'),
            'permission_callback' => '__return_true',
        ));
        
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/state', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_session_state_snapshot'),
            'permission_callback' => 'is_user_logged_in',
        ));
        
        // Get players list (for host)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/players', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_players'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        // Get player count (for players)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/player-count', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_player_count'),
            'permission_callback' => '__return_true',
        ));
        
        // Get players list (for players)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/players-list', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_players_list'),
            'permission_callback' => '__return_true',
        ));
        
        // Get current user's active session
        register_rest_route(self::NAMESPACE, '/user/active-session', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_user_active_session'),
            'permission_callback' => 'is_user_logged_in',
        ));
        
        // Clear current user's active session
        register_rest_route(self::NAMESPACE, '/user/clear-session', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'clear_user_active_session'),
            'permission_callback' => 'is_user_logged_in',
        ));
        
        // Get question stats (for host)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/question-stats', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_question_stats'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        // End current question (for host)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/end-question', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'end_current_question'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        // Kick player (for host)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/kick-player', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'kick_player'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        // Ban player from session (for host)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/ban-from-session', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'ban_from_session'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        // Ban player permanently (for host)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/ban-permanently', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'ban_permanently'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        // Phase 2: Test connection
        register_rest_route(self::NAMESPACE, '/settings/test-phase2', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'test_phase2_connection'),
            'permission_callback' => array(__CLASS__, 'check_admin_permission'),
        ));
        
        // Questions CRUD
        register_rest_route(self::NAMESPACE, '/questions', array(
            array(
                'methods' => 'GET',
                'callback' => array(__CLASS__, 'get_questions'),
                'permission_callback' => array(__CLASS__, 'check_admin_permission'),
            ),
            array(
                'methods' => 'POST',
                'callback' => array(__CLASS__, 'create_question'),
                'permission_callback' => array(__CLASS__, 'check_admin_permission'),
            ),
        ));
        
        register_rest_route(self::NAMESPACE, '/questions/(?P<id>\d+)', array(
            array(
                'methods' => 'GET',
                'callback' => array(__CLASS__, 'get_question'),
                'permission_callback' => array(__CLASS__, 'check_admin_permission'),
            ),
            array(
                'methods' => 'PUT',
                'callback' => array(__CLASS__, 'update_question'),
                'permission_callback' => array(__CLASS__, 'check_admin_permission'),
            ),
            array(
                'methods' => 'DELETE',
                'callback' => array(__CLASS__, 'delete_question'),
                'permission_callback' => array(__CLASS__, 'check_admin_permission'),
            ),
        ));
        
        // Frontend: Search quizzes (public - anyone can search)
        register_rest_route(self::NAMESPACE, '/quizzes/search', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'search_quizzes'),
            'permission_callback' => '__return_true',
        ));
        
        // Frontend: List quizzes with pagination (public)
        register_rest_route(self::NAMESPACE, '/quizzes', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'list_quizzes'),
            'permission_callback' => '__return_true',
        ));
        
        // Frontend: Get single quiz with questions for preview (public)
        register_rest_route(self::NAMESPACE, '/quizzes/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_quiz_preview'),
            'permission_callback' => '__return_true',
        ));
        
        // Frontend: Create session from frontend (requires authentication)
        register_rest_route(self::NAMESPACE, '/sessions/create-frontend', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'create_session_frontend'),
            'permission_callback' => array(__CLASS__, 'check_teacher_permission_with_cookie'),
        ));
        
        // Frontend: Quick create empty session (requires authentication)
        register_rest_route(self::NAMESPACE, '/sessions/create-quick', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'create_session_quick'),
            'permission_callback' => array(__CLASS__, 'check_teacher_permission_with_cookie'),
        ));
        
        // Update session settings before start (requires host permission)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/settings', array(
            'methods' => 'PUT',
            'callback' => array(__CLASS__, 'update_session_settings'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
        
        // Get session summary (for host - all questions with answer stats)
        register_rest_route(self::NAMESPACE, '/sessions/(?P<id>\d+)/summary', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_session_summary'),
            'permission_callback' => array(__CLASS__, 'check_session_host_permission'),
        ));
    }
    
    /**
     * Check admin permission
     */
    public static function check_admin_permission() {
        return current_user_can('manage_options');
    }
    
    /**
     * Check session host permission
     */
    public static function check_session_host_permission($request) {
        $session_id = $request->get_param('id');
        $can_control = Live_Quiz_Session_Manager::can_control_session($session_id);
        
        // Debug logging for replay permission
        if (strpos($_SERVER['REQUEST_URI'], 'replay') !== false) {
            error_log("[REPLAY PERMISSION] Session: {$session_id}, Can control: " . ($can_control ? 'YES' : 'NO'));
            file_put_contents('/tmp/replay-debug.log', "Permission check: " . ($can_control ? 'YES' : 'NO') . "\n", FILE_APPEND);
        }
        
        return $can_control;
    }
    
    /**
     * Check if user is logged in (with proper nonce verification)
     */
    public static function check_user_logged_in($request) {
        // For cookie-based authentication, verify nonce
        $nonce = $request->get_header('X-WP-Nonce');
        if ($nonce && !wp_verify_nonce($nonce, 'wp_rest')) {
            return false;
        }
        
        return is_user_logged_in();
    }
    
    /**
     * Create session
     */
    public static function create_session($request) {
        $quiz_id = $request->get_param('quiz_id');
        
        if (!$quiz_id) {
            return new WP_Error('missing_quiz_id', __('Thiếu ID quiz', 'live-quiz'), array('status' => 400));
        }
        
        // Create session post
        $session_id = wp_insert_post(array(
            'post_type' => 'live_quiz_session',
            'post_title' => sprintf(__('Phiên Quiz %s', 'live-quiz'), date('Y-m-d H:i')),
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        ));
        
        if (is_wp_error($session_id)) {
            return $session_id;
        }
        
        update_post_meta($session_id, '_session_quiz_id', $quiz_id);
        
        // Generate room code (PIN 6 số)
        $room_code = self::generate_room_code();
        update_post_meta($session_id, '_session_room_code', $room_code);
        update_post_meta($session_id, '_session_status', 'lobby');
        
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        
        return rest_ensure_response(array(
            'success' => true,
            'session_id' => $session_id,
            'room_code' => $room_code,
            'pin_code' => $room_code, // Alias for clarity
            'session' => $session,
        ));
    }
    
    /**
     * Start session
     */
    public static function start_session($request) {
        $session_id = $request->get_param('id');
        
        $result = Live_Quiz_Session_Manager::start_session($session_id);
        
        if (!$result) {
            return new WP_Error('cannot_start', __('Không thể bắt đầu phiên', 'live-quiz'), array('status' => 400));
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'session' => Live_Quiz_Session_Manager::get_session($session_id),
        ));
    }
    
    /**
     * Next question
     */
    public static function next_question($request) {
        $session_id = $request->get_param('id');
        
        // End current question first
        Live_Quiz_Session_Manager::end_question($session_id);
        
        // Wait a bit for players to see results
        sleep(1);
        
        // Move to next
        $result = Live_Quiz_Session_Manager::next_question($session_id);
        
        if (!$result) {
            return new WP_Error('cannot_next', __('Không thể chuyển câu hỏi', 'live-quiz'), array('status' => 400));
        }
        
        // Check if session ended (result is true but session status is 'ended')
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        if ($session && $session['status'] === 'ended') {
            return rest_ensure_response(array(
                'success' => true,
                'session_ended' => true,
                'message' => __('Quiz đã kết thúc', 'live-quiz'),
            ));
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'session' => $session,
        ));
    }
    
    /**
     * End session - Kick all players out of the room
     */
    public static function end_session($request) {
        $session_id = $request->get_param('id');
        
        error_log("\n=== END ROOM REQUEST (MANUAL) ===");
        error_log("Session ID: {$session_id}");
        error_log("Timestamp: " . date('Y-m-d H:i:s'));
        
        // Step 1: Update session status in database directly (don't call end_session which sends WebSocket events)
        update_post_meta($session_id, '_session_status', 'ended');
        update_post_meta($session_id, '_session_ended_at', time());
        
        // Clear session cache
        Live_Quiz_Session_Manager::clear_session_cache($session_id);
        
        error_log("✓ Session status updated to 'ended' in database");
        
        // Step 2: Call WebSocket server to kick all players
        error_log("Calling WebSocket server to kick all players...");
        $websocket_url = get_option('live_quiz_websocket_url', '');
        
        if (empty($websocket_url)) {
            error_log("ERROR: WebSocket URL not configured!");
            // Continue anyway, session is marked as ended in database
        } else {
            $endpoint = trailingslashit($websocket_url) . 'api/sessions/' . $session_id . '/end';
            error_log("WebSocket endpoint: {$endpoint}");
            
            // Get WebSocket secret for authentication
            $websocket_secret = get_option('live_quiz_websocket_secret', '');
            error_log("Using WebSocket secret: " . (empty($websocket_secret) ? 'EMPTY' : 'SET'));
            
            $response = wp_remote_post($endpoint, array(
                'timeout' => 10,
                'headers' => array(
                    'Content-Type' => 'application/json',
                    'X-WordPress-Secret' => $websocket_secret,
                ),
                'body' => json_encode(array(
                    'session_id' => $session_id,
                    'reason' => 'manual' // Host manually ended the room
                ))
            ));
            
            if (is_wp_error($response)) {
                error_log("ERROR: WebSocket request failed: " . $response->get_error_message());
            } else {
                $response_code = wp_remote_retrieve_response_code($response);
                $response_body = wp_remote_retrieve_body($response);
                error_log("✓ WebSocket server response code: {$response_code}");
                error_log("✓ WebSocket server response: {$response_body}");
            }
        }
        
        error_log("=== END ROOM COMPLETED ===\n");
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Room ended and all players kicked',
            'session_id' => $session_id
        ));
    }
    
    /**
     * Replay session - reset to lobby state
     */
    public static function replay_session($request) {
        // IMMEDIATE LOGGING - before anything else
        $log_msg = "\n\n========================================\n";
        $log_msg .= "REPLAY FUNCTION ENTRY\n";
        $log_msg .= "Time: " . date('Y-m-d H:i:s') . "\n";
        $log_msg .= "Request params: " . print_r($request->get_params(), true) . "\n";
        $log_msg .= "========================================\n\n";
        
        file_put_contents('/tmp/replay-debug.log', $log_msg, FILE_APPEND);
        error_log($log_msg);
        
        $session_id = $request->get_param('id');
        
        error_log("\n=== REPLAY SESSION REQUEST ===");
        error_log("Session ID: {$session_id}");
        error_log("Timestamp: " . date('Y-m-d H:i:s'));
        
        // Get previous quiz IDs before resetting (to return them for pre-selection)
        $previous_quiz_ids = get_post_meta($session_id, '_session_quiz_ids', true);
        if (!is_array($previous_quiz_ids)) {
            $previous_quiz_ids = array();
        }
        
        // Get quiz details for pre-selection
        $previous_quizzes = array();
        foreach ($previous_quiz_ids as $quiz_id) {
            $quiz = get_post($quiz_id);
            if ($quiz && $quiz->post_type === 'live_quiz') {
                $questions = get_post_meta($quiz_id, '_live_quiz_questions', true);
                if (is_string($questions)) {
                    $questions = json_decode($questions, true);
                }
                $question_count = is_array($questions) ? count($questions) : 0;
                
                $previous_quizzes[] = array(
                    'id' => (int)$quiz_id,
                    'title' => $quiz->post_title,
                    'question_count' => $question_count
                );
            }
        }
        
        error_log("✓ Found " . count($previous_quizzes) . " previous quizzes to pre-select");
        
        // Step 1: Reset session status to lobby in database
        update_post_meta($session_id, '_session_status', 'lobby');
        update_post_meta($session_id, '_current_question', 0);
        update_post_meta($session_id, '_session_started_at', null);
        
        error_log("✓ Session status updated to 'lobby' in database");
        
        // Step 2: Clear ALL _answer_* post meta directly from database
        global $wpdb;
        $deleted_count = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key LIKE '_answer_%%'",
                $session_id
            )
        );
        error_log("✓ Deleted {$deleted_count} _answer_* post meta entries");
        
        // Step 3: Clear participant answers and scores in _participants meta
        $participants = get_post_meta($session_id, '_participants', true);
        if (is_array($participants)) {
            error_log("Found " . count($participants) . " participants to reset");
            foreach ($participants as $user_id => &$participant) {
                $participant['answers'] = array();
                $participant['score'] = 0;
            }
            update_post_meta($session_id, '_participants', $participants);
            error_log("✓ All participant scores reset in _participants meta");
        } else {
            error_log("! No participants found or invalid format");
        }
        
        // Clear session cache
        Live_Quiz_Session_Manager::clear_session_cache($session_id);
        error_log("✓ Session cache cleared");
        
        // Step 4: Clear ALL answer count transients for this session
        // These store the "X/Y answered" counts and must be reset
        global $wpdb;
        $transient_pattern = '_transient_live_quiz_answer_count_' . $session_id . '_%';
        $deleted_transients = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
                $transient_pattern,
                '_transient_timeout_live_quiz_answer_count_' . $session_id . '_%'
            )
        );
        error_log("✓ Deleted {$deleted_transients} answer count transients");
        
        // Step 5: Call WebSocket server to broadcast replay event
        error_log("Calling WebSocket server to broadcast replay event...");
        $websocket_url = get_option('live_quiz_websocket_url', '');
        
        if (empty($websocket_url)) {
            error_log("ERROR: WebSocket URL not configured!");
        } else {
            $endpoint = trailingslashit($websocket_url) . 'api/sessions/' . $session_id . '/replay';
            error_log("WebSocket endpoint: {$endpoint}");
            
            // Get WebSocket secret for authentication
            $websocket_secret = get_option('live_quiz_websocket_secret', '');
            
            $response = wp_remote_post($endpoint, array(
                'timeout' => 10,
                'headers' => array(
                    'Content-Type' => 'application/json',
                    'X-WordPress-Secret' => $websocket_secret,
                ),
                'body' => json_encode(array(
                    'session_id' => $session_id
                ))
            ));
            
            if (is_wp_error($response)) {
                error_log("ERROR: WebSocket request failed: " . $response->get_error_message());
            } else {
                $response_code = wp_remote_retrieve_response_code($response);
                $response_body = wp_remote_retrieve_body($response);
                error_log("✓ WebSocket server response code: {$response_code}");
                error_log("✓ WebSocket server response: {$response_body}");
            }
        }
        
        error_log("=== REPLAY SESSION COMPLETED ===\n");
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Session replayed successfully',
            'session_id' => $session_id,
            'previous_quizzes' => $previous_quizzes // Return previous quizzes for pre-selection
        ));
    }
    
    /**
     * TEST ONLY: Delete all answers for a session
     */
    public static function test_delete_answers($request) {
        $session_id = $request->get_param('id');
        
        file_put_contents('/tmp/test-delete.log', date('Y-m-d H:i:s') . " - TEST DELETE CALLED for session $session_id\n", FILE_APPEND);
        
        global $wpdb;
        $deleted_count = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key LIKE '_answer_%%'",
                $session_id
            )
        );
        
        error_log("[TEST DELETE] Session: {$session_id}, Deleted: {$deleted_count} _answer_* entries");
        file_put_contents('/tmp/test-delete.log', "Deleted: {$deleted_count} entries\n", FILE_APPEND);
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Deleted answers',
            'session_id' => $session_id,
            'deleted_count' => $deleted_count
        ));
    }
    
    /**
     * Get session
     */
    public static function get_session($request) {
        $session_id = $request->get_param('id');
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        
        if (!$session) {
            return new WP_Error('not_found', __('Không tìm thấy phiên', 'live-quiz'), array('status' => 404));
        }
        
        // Add configuration status
        $configured = get_post_meta($session_id, '_session_configured', true);
        $session['configured'] = $configured ? true : false;
        
        // Don't expose all questions if not admin
        if (!current_user_can('manage_options')) {
            unset($session['questions']);
        }
        
        return rest_ensure_response($session);
    }
    
    /**
     * Join session
     */
    public static function join_session($request) {
        $room_code = $request->get_param('room_code');
        $display_name = $request->get_param('display_name');
        $connection_id = $request->get_param('connection_id');
        
        if (!$room_code || !$display_name) {
            return new WP_Error('missing_params', __('Thiếu thông tin', 'live-quiz'), array('status' => 400));
        }
        
        // Sanitize
        $room_code = Live_Quiz_Security::sanitize_room_code($room_code);
        $display_name = Live_Quiz_Security::sanitize_display_name($display_name);
        $connection_id = sanitize_text_field($connection_id);
        
        if (empty($display_name)) {
            return new WP_Error('invalid_name', __('Tên không hợp lệ', 'live-quiz'), array('status' => 400));
        }
        
        // Find session
        $session_id = Live_Quiz_Session_Manager::find_session_by_code($room_code);
        
        if (!$session_id) {
            return new WP_Error('session_not_found', __('Không tìm thấy phòng', 'live-quiz'), array('status' => 404));
        }
        
        // Get session and check bans
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        $current_user = wp_get_current_user();
        if ($current_user->ID) {
            // CHECK BAN STATUS
            // 1. Check if banned from this session
            if (Live_Quiz_Session_Manager::is_banned_from_session($session_id, $current_user->ID)) {
                error_log('[LiveQuiz] User ' . $current_user->ID . ' is banned from session ' . $session_id);
                return new WP_Error('banned_from_session', __('Bạn đã bị ban khỏi phòng này', 'live-quiz'), array('status' => 403));
            }
            
            // 2. Check if permanently banned by host
            $host_id = $session['host_id'];
            if (Live_Quiz_Session_Manager::is_permanently_banned($host_id, $current_user->ID)) {
                error_log('[LiveQuiz] User ' . $current_user->ID . ' is permanently banned by host ' . $host_id);
                return new WP_Error('permanently_banned', __('Bạn đã bị ban vĩnh viễn bởi host này', 'live-quiz'), array('status' => 403));
            }
            
            $participants = Live_Quiz_Session_Manager::get_participants($session_id);
            
            // Check if display name already exists
            $name_exists = false;
            foreach ($participants as $participant) {
                if (isset($participant['display_name']) && $participant['display_name'] === $display_name) {
                    $name_exists = true;
                    break;
                }
            }
            
            // If name exists, add username to differentiate
            if ($name_exists) {
                $display_name = $display_name . ' (@' . $current_user->user_login . ')';
            }
        }
        
        // Check rate limit
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $rate_check = Live_Quiz_Security::check_rate_limit('join', $ip, 5);
        if (is_wp_error($rate_check)) {
            return $rate_check;
        }
        
        // Check duplicate participants
        $duplicate_check = Live_Quiz_Security::check_duplicate_participants($session_id, $ip, 3);
        if (is_wp_error($duplicate_check)) {
            return $duplicate_check;
        }
        
        // Add participant (or get existing if already joined)
        $participant = Live_Quiz_Session_Manager::add_participant($session_id, $display_name);
        
        if (is_wp_error($participant)) {
            return $participant;
        }
        
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        
        // Get WordPress user ID for multi-device enforcement
        $wp_user_id = get_current_user_id();
        
        // MULTI-DEVICE ENFORCEMENT: Check old connection BEFORE generating new token
        if ($wp_user_id) {
            $old_session = get_user_meta($wp_user_id, '_live_quiz_active_session', true);
            if ($old_session && is_array($old_session)) {
                $old_connection_id = isset($old_session['connectionId']) ? $old_session['connectionId'] : null;
                
                // If there's a different connection, emit event to kick it via WebSocket
                if ($old_connection_id && $old_connection_id !== $connection_id) {
                    error_log("[Live Quiz] Multi-device detected! User {$wp_user_id} joining from new device.");
                    error_log("  Old connection: {$old_connection_id}");
                    error_log("  New connection: {$connection_id}");
                    error_log("  Sending kick event to old connection...");
                    
                    // Notify old connection via WebSocket
                    self::send_websocket_event('session_kicked', array(
                        'message' => 'Bạn đã tham gia phòng này từ tab/thiết bị khác.',
                        'new_connection_id' => $connection_id,
                        'timestamp' => time() * 1000,
                    ), $old_connection_id);
                }
            }
        }
        
        // Generate JWT token for WebSocket authentication
        $jwt_token = '';
        if (class_exists('Live_Quiz_JWT_Helper')) {
            $jwt_token = Live_Quiz_JWT_Helper::generate_token(
                $participant['user_id'],
                $session_id,
                $participant['display_name']
            );
        }
        
        // Build response
        $response = array(
            'success' => true,
            'session_id' => $session_id,
            'user_id' => $participant['user_id'],
            'display_name' => $participant['display_name'],
            'websocket_token' => $jwt_token,
            'session' => array(
                'id' => $session['id'],
                'status' => $session['status'],
                'current_question_index' => $session['current_question_index'],
                'total_questions' => count($session['questions']),
            ),
        );
        
        // Add WebSocket connection info if available (Phase 2)
        if (isset($participant['websocket'])) {
            $response['websocket'] = $participant['websocket'];
        }
        
        // Save active session to user meta (for session restore on other devices)
        if ($wp_user_id) {
            update_user_meta($wp_user_id, '_live_quiz_active_session', array(
                'sessionId' => $session_id,
                'userId' => $participant['user_id'],
                'displayName' => $participant['display_name'],
                'roomCode' => $room_code,
                'websocketToken' => $jwt_token,
                'connectionId' => $connection_id,
                'timestamp' => time() * 1000, // milliseconds
            ));
            
            error_log("[Live Quiz] Saved active session to user meta for user {$wp_user_id}");
            error_log("  Session ID: {$session_id}");
            error_log("  Connection ID: {$connection_id}");
        }
        
        return rest_ensure_response($response);
    }
    
    /**
     * Leave session
     */
    public static function leave_session($request) {
        $session_id = $request->get_param('session_id');
        
        if (!$session_id) {
            return new WP_Error('missing_params', __('Thiếu thông tin', 'live-quiz'), array('status' => 400));
        }
        
        // Get WordPress user ID
        $user_id = get_current_user_id();
        if (!$user_id) {
            return new WP_Error('not_logged_in', __('Bạn cần đăng nhập', 'live-quiz'), array('status' => 401));
        }
        
        // Sanitize
        $session_id = absint($session_id);
        
        // Remove participant from session
        $result = Live_Quiz_Session_Manager::remove_participant($session_id, $user_id);
        
        if (is_wp_error($result)) {
            // Even if there's an error, return success to allow client to clean up
            // This prevents stuck states
            error_log('Leave session error: ' . $result->get_error_message());
        }
        
        // Clear user meta if user is logged in
        $wp_user_id = get_current_user_id();
        if ($wp_user_id) {
            delete_user_meta($wp_user_id, '_live_quiz_active_session');
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Đã rời khỏi phòng', 'live-quiz'),
        ));
    }
    
    /**
     * Submit answer
     */
    public static function submit_answer($request) {
        error_log('=== SUBMIT ANSWER START ===');
        
        try {
            $session_id = $request->get_param('session_id');
            $choice_id = $request->get_param('choice_id');
            $submit_time = $request->get_param('submit_time'); // Client's synchronized server time
            
            error_log("Session ID: $session_id, Choice ID: $choice_id");
            if ($submit_time) {
                error_log("Submit time (from client sync): $submit_time");
            }
            
            if (!$session_id || !is_numeric($choice_id)) {
                error_log('ERROR: Missing params');
                return new WP_Error('missing_params', __('Thiếu thông tin', 'live-quiz'), array('status' => 400));
            }
            
            // Get WordPress user ID
            $user_id = get_current_user_id();
            error_log("User ID: $user_id");
            
            if (!$user_id) {
                error_log('ERROR: Not logged in');
                return new WP_Error('not_logged_in', __('Bạn cần đăng nhập', 'live-quiz'), array('status' => 401));
            }
            
            // Validate session access
            $access_check = Live_Quiz_Security::validate_session_access($session_id, $user_id);
            if (is_wp_error($access_check)) {
                error_log('ERROR: Access check failed: ' . $access_check->get_error_message());
                return $access_check;
            }
            
            // Check rate limit
            $rate_check = Live_Quiz_Security::check_rate_limit('answer', $user_id, 10);
            if (is_wp_error($rate_check)) {
                error_log('ERROR: Rate limit failed: ' . $rate_check->get_error_message());
                return $rate_check;
            }
            
            error_log('About to call Session_Manager::submit_answer');
            
            // Submit answer (pass submit_time if available)
            $result = Live_Quiz_Session_Manager::submit_answer($session_id, $user_id, (int)$choice_id, $submit_time);
            
            error_log('Session_Manager::submit_answer returned: ' . print_r($result, true));
            
            if (is_wp_error($result)) {
                error_log('ERROR: Result is WP_Error: ' . $result->get_error_message());
                return $result;
            }
            
            error_log('=== SUBMIT ANSWER SUCCESS ===');
            return rest_ensure_response($result);
            
        } catch (Exception $e) {
            error_log('=== SUBMIT ANSWER EXCEPTION ===');
            error_log('Exception: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            return new WP_Error('exception', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Get leaderboard
     */
    public static function get_leaderboard($request) {
        $session_id = $request->get_param('id');
        $limit = $request->get_param('limit') ?: 10;
        
        $leaderboard = Live_Quiz_Scoring::get_leaderboard($session_id, (int)$limit);
        
        return rest_ensure_response(array(
            'success' => true,
            'leaderboard' => $leaderboard,
        ));
    }
    
    /**
     * Get current session state snapshot for reconnecting players
     */
    public static function get_session_state_snapshot($request) {
        $session_id = absint($request->get_param('id'));
        
        if (!$session_id) {
            return new WP_Error('invalid_session', __('Phiên không hợp lệ', 'live-quiz'), array('status' => 400));
        }
        
        $user_id = get_current_user_id();
        if (!$user_id) {
            return new WP_Error('not_logged_in', __('Bạn cần đăng nhập', 'live-quiz'), array('status' => 401));
        }
        
        // Validate that user belongs to this session (player) or is host
        $access_check = Live_Quiz_Security::validate_session_access($session_id, $user_id);
        if (is_wp_error($access_check)) {
            if (!Live_Quiz_Session_Manager::can_control_session($session_id, $user_id)) {
                return $access_check;
            }
        }
        
        if (!class_exists('Live_Quiz_WebSocket_Helper')) {
            return new WP_Error('ws_helper_missing', __('WebSocket helper không khả dụng', 'live-quiz'), array('status' => 500));
        }
        
        $state = Live_Quiz_WebSocket_Helper::get_session_state($session_id);
        if (!$state || empty($state['success'])) {
            return new WP_Error('state_unavailable', __('Không lấy được trạng thái phiên', 'live-quiz'), array('status' => 500));
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'state' => $state,
        ));
    }
    
    /**
     * Get players list (for host)
     */
    /**
     * Get players (for host)
     * Returns only ACTIVE/CONNECTED players from WebSocket server
     */
    public static function get_players($request) {
        $session_id = $request->get_param('id');
        
        // Try to get active players from WebSocket server
        $websocket_url = get_option('live_quiz_websocket_url', '');
        
        if ($websocket_url) {
            $api_url = rtrim($websocket_url, '/') . '/api/sessions/' . $session_id . '/active-players';
            
            $response = wp_remote_get($api_url, array(
                'timeout' => 5,
                'sslverify' => false,
            ));
            
            if (!is_wp_error($response)) {
                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);
                
                if (isset($data['success']) && $data['success'] && isset($data['players'])) {
                    return rest_ensure_response(array(
                        'success' => true,
                        'players' => $data['players'],
                        'source' => 'websocket'
                    ));
                }
            }
        }
        
        // Fallback: Get from database
        $players = Live_Quiz_Session_Manager::get_participants($session_id);
        $players = array_values($players);
        
        return rest_ensure_response(array(
            'success' => true,
            'players' => $players,
            'source' => 'database'
        ));
    }
    
    /**
     * Get player count (for players - public endpoint)
     * Returns count of ACTIVE/CONNECTED players from WebSocket server
     */
    public static function get_player_count($request) {
        $session_id = $request->get_param('id');
        
        // Get session to verify it exists
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        if (!$session) {
            return new WP_Error('not_found', __('Không tìm thấy phiên', 'live-quiz'), array('status' => 404));
        }
        
        // Try to get active players count from WebSocket server
        $websocket_url = get_option('live_quiz_websocket_url', '');
        
        if ($websocket_url) {
            $api_url = rtrim($websocket_url, '/') . '/api/sessions/' . $session_id . '/active-players';
            
            $response = wp_remote_get($api_url, array(
                'timeout' => 5,
                'sslverify' => false,
            ));
            
            if (!is_wp_error($response)) {
                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);
                
                if (isset($data['success']) && $data['success'] && isset($data['count'])) {
                    return rest_ensure_response(array(
                        'success' => true,
                        'count' => $data['count'],
                        'source' => 'websocket'
                    ));
                }
            }
        }
        
        // Fallback: Get from database
        $players = Live_Quiz_Session_Manager::get_participants($session_id);
        
        return rest_ensure_response(array(
            'success' => true,
            'count' => count($players),
            'source' => 'database'
        ));
    }
    
    /**
     * Get players list (for players - public endpoint)
     * Returns only ACTIVE/CONNECTED players from WebSocket server
     */
    public static function get_players_list($request) {
        $session_id = $request->get_param('id');
        
        // Get session to verify it exists
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        if (!$session) {
            return new WP_Error('not_found', __('Không tìm thấy phiên', 'live-quiz'), array('status' => 404));
        }
        
        // Try to get active players from WebSocket server
        $websocket_url = get_option('live_quiz_websocket_url', '');
        
        if ($websocket_url) {
            // Call WebSocket server API to get active players
            $api_url = rtrim($websocket_url, '/') . '/api/sessions/' . $session_id . '/active-players';
            
            error_log('[LiveQuiz] Attempting to fetch active players from WebSocket: ' . $api_url);
            
            $response = wp_remote_get($api_url, array(
                'timeout' => 5,
                'sslverify' => false,
            ));
            
            if (is_wp_error($response)) {
                error_log('[LiveQuiz] WebSocket API error: ' . $response->get_error_message());
            } else {
                $response_code = wp_remote_retrieve_response_code($response);
                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);
                
                error_log('[LiveQuiz] WebSocket API response code: ' . $response_code);
                error_log('[LiveQuiz] WebSocket API response body: ' . substr($body, 0, 500));
                
                if (isset($data['success']) && $data['success'] && isset($data['players'])) {
                    error_log('[LiveQuiz] ✓ Got ' . count($data['players']) . ' active players from WebSocket server for session ' . $session_id);
                    
                    return rest_ensure_response(array(
                        'success' => true,
                        'players' => $data['players'],
                        'source' => 'websocket'
                    ));
                } else {
                    error_log('[LiveQuiz] ✗ WebSocket response invalid or missing players data');
                }
            }
            
            // If WebSocket call fails, log error
            error_log('[LiveQuiz] ⚠️ Falling back to database for session ' . $session_id);
        } else {
            error_log('[LiveQuiz] ⚠️ WebSocket URL not configured, using database');
        }
        
        // Fallback: Get from database (may include disconnected players)
        $players = Live_Quiz_Session_Manager::get_participants($session_id);
        
        // Re-index array to ensure sequential keys
        $players = array_values($players);
        
        // Only return necessary fields for display
        $players_list = array_map(function($player) {
            return array(
                'display_name' => isset($player['display_name']) ? $player['display_name'] : 'Unknown',
                'user_id' => $player['user_id'],
            );
        }, $players);
        
        return rest_ensure_response(array(
            'success' => true,
            'players' => $players_list,
            'source' => 'database'
        ));
    }
    
    /**
     * Get question stats (for host)
     */
    public static function get_question_stats($request) {
        $session_id = $request->get_param('id');
        $question_index = $request->get_param('question_index');
        
        if ($question_index === null) {
            $session = Live_Quiz_Session_Manager::get_session($session_id);
            $question_index = $session['current_question_index'];
        }
        
        $stats = Live_Quiz_Scoring::get_question_stats($session_id, (int)$question_index);
        
        return rest_ensure_response(array(
            'success' => true,
            'stats' => $stats,
        ));
    }
    
    /**
     * End current question (for host)
     */
    public static function end_current_question($request) {
        $session_id = $request->get_param('id');
        
        $result = Live_Quiz_Session_Manager::end_question($session_id);
        
        if (!$result) {
            return new WP_Error('cannot_end', __('Không thể kết thúc câu hỏi', 'live-quiz'), array('status' => 400));
        }
        
        return rest_ensure_response(array(
            'success' => true,
        ));
    }
    
    /**
     * Kick player from session
     */
    public static function kick_player($request) {
        $session_id = $request->get_param('id');
        $user_id = $request->get_param('user_id');
        
        // Debug log to file
        $log_file = LIVE_QUIZ_PLUGIN_DIR . 'kick-debug.log';
        $log_msg = sprintf("[%s] KICK REQUEST - Session: %s, User: %s\n", 
            date('Y-m-d H:i:s'), $session_id, $user_id);
        file_put_contents($log_file, $log_msg, FILE_APPEND);
        
        error_log('[LiveQuiz] === KICK PLAYER REQUEST ===');
        error_log('[LiveQuiz] Session ID: ' . $session_id);
        error_log('[LiveQuiz] User ID: ' . $user_id);
        
        if (!$user_id) {
            error_log('[LiveQuiz] !!! ERROR: Missing user_id');
            return new WP_Error('missing_user_id', __('Thiếu ID người chơi', 'live-quiz'), array('status' => 400));
        }
        
        // Get session data
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        if (!$session) {
            error_log('[LiveQuiz] !!! ERROR: Session not found');
            return new WP_Error('session_not_found', __('Không tìm thấy phiên', 'live-quiz'), array('status' => 404));
        }
        
        // Use Session Manager to kick player
        error_log('[LiveQuiz] Calling Session Manager kick_player()');
        $result = Live_Quiz_Session_Manager::kick_player($session_id, $user_id);
        
        if (!$result['success']) {
            error_log('[LiveQuiz] !!! Session Manager kick failed: ' . $result['message']);
            return new WP_Error('cannot_kick', $result['message'], array('status' => 400));
        }
        
        error_log('[LiveQuiz] Session Manager kick SUCCESS');
        
        // Notify WebSocket server to disconnect the player
        if (class_exists('Live_Quiz_WebSocket_Helper')) {
            error_log('[LiveQuiz] Calling WebSocket Helper to kick player...');
            $ws_result = Live_Quiz_WebSocket_Helper::kick_player(
                $session_id, 
                $user_id,
                'Bạn đã bị kick khỏi phòng bởi host.',
                'kicked'
            );
            if ($ws_result) {
                error_log('[LiveQuiz] WebSocket kick SUCCESS');
            } else {
                error_log('[LiveQuiz] !!! WebSocket kick FAILED (but continuing...)');
            }
        } else {
            error_log('[LiveQuiz] !!! WebSocket Helper class not found');
        }
        
        error_log('[LiveQuiz] === KICK PLAYER COMPLETE ===');
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Đã kick người chơi thành công', 'live-quiz'),
        ));
    }
    
    /**
     * Ban player from session
     */
    public static function ban_from_session($request) {
        $session_id = $request->get_param('id');
        $user_id = $request->get_param('user_id');
        
        error_log('[LiveQuiz] === BAN FROM SESSION REQUEST ===');
        error_log('[LiveQuiz] Session ID: ' . $session_id);
        error_log('[LiveQuiz] User ID: ' . $user_id);
        
        if (!$user_id) {
            error_log('[LiveQuiz] !!! ERROR: Missing user_id');
            return new WP_Error('missing_user_id', __('Thiếu ID người chơi', 'live-quiz'), array('status' => 400));
        }
        
        // Ban the player from this session
        $result = Live_Quiz_Session_Manager::ban_from_session($session_id, $user_id);
        
        if (!$result['success']) {
            error_log('[LiveQuiz] !!! Ban from session failed: ' . $result['message']);
            return new WP_Error('cannot_ban', $result['message'], array('status' => 400));
        }
        
        error_log('[LiveQuiz] Ban from session SUCCESS');
        
        // Notify WebSocket to kick player
        if (class_exists('Live_Quiz_WebSocket_Helper')) {
            error_log('[LiveQuiz] Calling WebSocket Helper to kick player...');
            $ws_result = Live_Quiz_WebSocket_Helper::kick_player(
                $session_id, 
                $user_id,
                'Bạn đã bị ban khỏi phòng này bởi host. Bạn không thể tham gia lại phòng này.',
                'banned_session'
            );
            if ($ws_result) {
                error_log('[LiveQuiz] WebSocket kick SUCCESS');
            } else {
                error_log('[LiveQuiz] !!! WebSocket kick FAILED (but continuing...)');
            }
        }
        
        error_log('[LiveQuiz] === BAN FROM SESSION COMPLETE ===');
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => $result['message'],
        ));
    }
    
    /**
     * Ban player permanently from all host's sessions
     */
    public static function ban_permanently($request) {
        $session_id = $request->get_param('id');
        $user_id = $request->get_param('user_id');
        
        error_log('[LiveQuiz] === BAN PERMANENTLY REQUEST ===');
        error_log('[LiveQuiz] Session ID: ' . $session_id);
        error_log('[LiveQuiz] User ID: ' . $user_id);
        
        if (!$user_id) {
            error_log('[LiveQuiz] !!! ERROR: Missing user_id');
            return new WP_Error('missing_user_id', __('Thiếu ID người chơi', 'live-quiz'), array('status' => 400));
        }
        
        // Get session to find host ID
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        if (!$session) {
            error_log('[LiveQuiz] !!! ERROR: Session not found');
            return new WP_Error('session_not_found', __('Không tìm thấy phiên', 'live-quiz'), array('status' => 404));
        }
        
        $host_id = $session['host_id'];
        error_log('[LiveQuiz] Host ID: ' . $host_id);
        
        // Ban the player permanently
        $result = Live_Quiz_Session_Manager::ban_permanently($host_id, $user_id);
        
        if (!$result['success']) {
            error_log('[LiveQuiz] !!! Ban permanently failed: ' . $result['message']);
            return new WP_Error('cannot_ban', $result['message'], array('status' => 400));
        }
        
        error_log('[LiveQuiz] Ban permanently SUCCESS');
        
        // CRITICAL: Kick player from session (removes from Redis and clears user meta)
        error_log('[LiveQuiz] Calling Session Manager kick_player to remove from Redis...');
        $kick_result = Live_Quiz_Session_Manager::kick_player($session_id, $user_id);
        if ($kick_result['success']) {
            error_log('[LiveQuiz] Session Manager kick SUCCESS - user removed from Redis');
        } else {
            error_log('[LiveQuiz] !!! Session Manager kick FAILED: ' . $kick_result['message']);
        }
        
        // Notify WebSocket to kick player from current session
        if (class_exists('Live_Quiz_WebSocket_Helper')) {
            error_log('[LiveQuiz] Calling WebSocket Helper to kick player...');
            $ws_result = Live_Quiz_WebSocket_Helper::kick_player(
                $session_id, 
                $user_id,
                'Bạn đã bị ban vĩnh viễn bởi host này. Bạn không thể tham gia bất kỳ phòng nào của host này.',
                'banned_permanently'
            );
            if ($ws_result) {
                error_log('[LiveQuiz] WebSocket kick SUCCESS');
            } else {
                error_log('[LiveQuiz] !!! WebSocket kick FAILED (but continuing...)');
            }
        }
        
        error_log('[LiveQuiz] === BAN PERMANENTLY COMPLETE ===');
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => $result['message'],
        ));
    }
    
    /**
     * Get questions
     */
    public static function get_questions($request) {
        $posts = get_posts(array(
            'post_type' => 'live_quiz',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
        ));
        
        $questions = array();
        foreach ($posts as $post) {
            $questions[] = array(
                'id' => $post->ID,
                'title' => $post->post_title,
                'questions' => get_post_meta($post->ID, '_live_quiz_questions', true),
                'alpha' => get_post_meta($post->ID, '_live_quiz_alpha', true),
                'max_players' => get_post_meta($post->ID, '_live_quiz_max_players', true),
            );
        }
        
        return rest_ensure_response($questions);
    }
    
    /**
     * Get single question
     */
    public static function get_question($request) {
        $id = $request->get_param('id');
        $post = get_post($id);
        
        if (!$post || $post->post_type !== 'live_quiz') {
            return new WP_Error('not_found', __('Không tìm thấy', 'live-quiz'), array('status' => 404));
        }
        
        return rest_ensure_response(array(
            'id' => $post->ID,
            'title' => $post->post_title,
            'questions' => get_post_meta($post->ID, '_live_quiz_questions', true),
            'alpha' => get_post_meta($post->ID, '_live_quiz_alpha', true),
            'max_players' => get_post_meta($post->ID, '_live_quiz_max_players', true),
        ));
    }
    
    /**
     * Create question
     */
    public static function create_question($request) {
        $title = $request->get_param('title');
        
        $post_id = wp_insert_post(array(
            'post_type' => 'live_quiz',
            'post_title' => sanitize_text_field($title),
            'post_status' => 'publish',
        ));
        
        if (is_wp_error($post_id)) {
            return $post_id;
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'id' => $post_id,
        ));
    }
    
    /**
     * Update question
     */
    public static function update_question($request) {
        $id = $request->get_param('id');
        
        $post_id = wp_update_post(array(
            'ID' => $id,
            'post_title' => $request->get_param('title'),
        ));
        
        if (is_wp_error($post_id)) {
            return $post_id;
        }
        
        return rest_ensure_response(array('success' => true));
    }
    
    /**
     * Delete question
     */
    public static function delete_question($request) {
        $id = $request->get_param('id');
        
        $result = wp_delete_post($id, true);
        
        if (!$result) {
            return new WP_Error('cannot_delete', __('Không thể xóa', 'live-quiz'), array('status' => 500));
        }
        
        return rest_ensure_response(array('success' => true));
    }
    
    /**
     * Generate unique room code (PIN 6 số)
     */
    private static function generate_room_code() {
        do {
            // Tạo PIN 6 số từ 100000 đến 999999
            $code = (string) random_int(100000, 999999);
            
            $existing = Live_Quiz_Session_Manager::find_session_by_code($code);
        } while ($existing);
        
        return $code;
    }
    
    /**
     * Test Phase 2 connection (WebSocket + Redis)
     */
    public static function test_phase2_connection($request) {
        $result = array(
            'websocket' => false,
            'redis' => false,
            'websocket_latency' => 0,
            'errors' => array(),
        );
        
        // Test WebSocket
        $ws_url = $request->get_param('websocket_url');
        $ws_secret = $request->get_param('websocket_secret');
        
        if ($ws_url) {
            // Basic URL validation and ping test
            $parsed = parse_url($ws_url);
            if (!$parsed || !isset($parsed['host'])) {
                $result['errors'][] = 'WebSocket URL không hợp lệ';
            } else {
                // Try to ping the host
                $start = microtime(true);
                $host = $parsed['host'];
                $port = isset($parsed['port']) ? $parsed['port'] : (strpos($ws_url, 'wss://') === 0 ? 443 : 80);
                
                // Use wp_remote_get to test HTTP/HTTPS endpoint
                $test_url = str_replace(array('ws://', 'wss://'), array('http://', 'https://'), $ws_url);
                $test_url = rtrim($test_url, '/') . '/health';
                
                $response = wp_remote_get($test_url, array(
                    'timeout' => 5,
                    'sslverify' => false,
                    'headers' => array(
                        'X-Secret' => $ws_secret,
                    ),
                ));
                
                $latency = round((microtime(true) - $start) * 1000);
                
                if (!is_wp_error($response)) {
                    $code = wp_remote_retrieve_response_code($response);
                    if ($code >= 200 && $code < 300) {
                        $result['websocket'] = true;
                        $result['websocket_latency'] = $latency;
                    } else {
                        $result['errors'][] = "WebSocket server trả về mã lỗi: $code";
                    }
                } else {
                    $result['errors'][] = 'Không thể kết nối đến WebSocket server: ' . $response->get_error_message();
                }
            }
        } else {
            $result['errors'][] = 'Chưa cấu hình WebSocket URL';
        }
        
        // Test Redis
        $redis_host = $request->get_param('redis_host');
        $redis_port = $request->get_param('redis_port') ?: 6379;
        $redis_password = $request->get_param('redis_password');
        
        if ($redis_host) {
            if (class_exists('Redis')) {
                try {
                    $redis = new Redis();
                    $connected = @$redis->connect($redis_host, $redis_port, 5);
                    
                    if ($connected) {
                        if ($redis_password) {
                            if (!@$redis->auth($redis_password)) {
                                $result['errors'][] = 'Redis: Sai mật khẩu';
                                $redis->close();
                            } else {
                                $result['redis'] = true;
                                $redis->close();
                            }
                        } else {
                            $result['redis'] = true;
                            $redis->close();
                        }
                    } else {
                        $result['errors'][] = "Không thể kết nối đến Redis tại $redis_host:$redis_port";
                    }
                } catch (Exception $e) {
                    $result['errors'][] = 'Redis error: ' . $e->getMessage();
                }
            } else {
                $result['errors'][] = 'PHP Redis extension chưa được cài đặt';
            }
        } else {
            $result['errors'][] = 'Chưa cấu hình Redis Host';
        }
        
        if ($result['websocket'] || $result['redis']) {
            return rest_ensure_response(array(
                'success' => true,
                'data' => $result,
            ));
        } else {
            $error_msg = !empty($result['errors']) 
                ? implode('. ', $result['errors']) 
                : __('Không thể kết nối. Kiểm tra lại cấu hình.', 'live-quiz');
            
            return rest_ensure_response(array(
                'success' => false,
                'data' => array(
                    'message' => $error_msg,
                    'errors' => $result['errors'],
                ),
            ));
        }
    }
    
    /**
     * Check teacher permission (must be logged in and have edit_posts capability)
     */
    public static function check_teacher_permission() {
        return is_user_logged_in() && current_user_can('edit_posts');
    }
    
    /**
     * Check teacher permission with cookie authentication for REST API
     */
    public static function check_teacher_permission_with_cookie($request) {
        // Check if user is logged in - all logged in users can create quiz rooms
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_forbidden',
                __('Bạn cần đăng nhập để tạo phòng quiz.', 'live-quiz'),
                array('status' => 401)
            );
        }
        
        // All logged in users have permission to create quiz rooms
        return true;
    }
    
    /**
     * Search quizzes (for dropdown search)
     */
    public static function search_quizzes($request) {
        $search = $request->get_param('s');
        
        if (empty($search)) {
            return new WP_Error('missing_search', __('Cần nhập từ khóa tìm kiếm', 'live-quiz'), array('status' => 400));
        }
        
        $args = array(
            'post_type' => 'live_quiz',
            'post_status' => 'publish',
            's' => $search,
            'posts_per_page' => 20,
            'orderby' => 'relevance',
        );
        
        $query = new WP_Query($args);
        $quizzes = array();
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $questions = get_post_meta($post_id, '_live_quiz_questions', true);
                
                // Handle both JSON string and array
                if (is_string($questions)) {
                    $questions = json_decode($questions, true);
                }
                $questions = $questions ? $questions : array();
                
                $quizzes[] = array(
                    'id' => $post_id,
                    'title' => get_the_title(),
                    'question_count' => count($questions),
                );
            }
            wp_reset_postdata();
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'data' => $quizzes,
        ));
    }
    
    /**
     * List quizzes with pagination, filters, and sorting
     */
    public static function list_quizzes($request) {
        $page = $request->get_param('page') ?: 1;
        $per_page = $request->get_param('per_page') ?: 10;
        $search = $request->get_param('search');
        $min_questions = $request->get_param('min_questions');
        $max_questions = $request->get_param('max_questions');
        $sort_by = $request->get_param('sort_by') ?: 'date_desc';
        
        $args = array(
            'post_type' => 'live_quiz',
            'post_status' => 'publish',
            'posts_per_page' => $per_page,
            'paged' => $page,
        );
        
        // Search
        if (!empty($search)) {
            $args['s'] = $search;
        }
        
        // Sorting
        switch ($sort_by) {
            case 'date_desc':
                $args['orderby'] = 'date';
                $args['order'] = 'DESC';
                break;
            case 'date_asc':
                $args['orderby'] = 'date';
                $args['order'] = 'ASC';
                break;
            case 'title_asc':
                $args['orderby'] = 'title';
                $args['order'] = 'ASC';
                break;
            case 'title_desc':
                $args['orderby'] = 'title';
                $args['order'] = 'DESC';
                break;
            default:
                $args['orderby'] = 'date';
                $args['order'] = 'DESC';
        }
        
        // First, get all quizzes without pagination limit to apply filters
        $args['posts_per_page'] = -1; // Get all to filter properly
        $args['paged'] = 1; // Reset paged
        
        $query = new WP_Query($args);
        $all_quizzes = array();
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $questions = get_post_meta($post_id, '_live_quiz_questions', true);
                
                // Handle both JSON string and array
                if (is_string($questions)) {
                    $questions = json_decode($questions, true);
                }
                $questions = $questions ? $questions : array();
                
                $question_count = count($questions);
                
                // Filter by question count
                if ($min_questions !== null && $question_count < intval($min_questions)) {
                    continue;
                }
                if ($max_questions !== null && $question_count > intval($max_questions)) {
                    continue;
                }
                
                $all_quizzes[] = array(
                    'id' => $post_id,
                    'title' => get_the_title(),
                    'description' => get_post_meta($post_id, '_live_quiz_description', true),
                    'question_count' => $question_count,
                    'created_date' => get_the_date('Y-m-d H:i:s'),
                );
            }
            wp_reset_postdata();
        }
        
        // Sort by question count if needed (after filtering)
        if ($sort_by === 'questions_desc' || $sort_by === 'questions_asc') {
            usort($all_quizzes, function($a, $b) use ($sort_by) {
                if ($sort_by === 'questions_desc') {
                    return $b['question_count'] - $a['question_count'];
                } else {
                    return $a['question_count'] - $b['question_count'];
                }
            });
        }
        
        // Calculate pagination
        $total_quizzes = count($all_quizzes);
        $total_pages = $total_quizzes > 0 ? ceil($total_quizzes / $per_page) : 1;
        
        // Apply pagination to results
        $offset = ($page - 1) * $per_page;
        $paginated_quizzes = array_slice($all_quizzes, $offset, $per_page);
        
        return rest_ensure_response(array(
            'success' => true,
            'quizzes' => $paginated_quizzes,
            'total' => $total_quizzes,
            'pages' => $total_pages,
            'current_page' => intval($page),
        ));
    }
    
    /**
     * Get single quiz with questions for preview
     */
    public static function get_quiz_preview($request) {
        $quiz_id = $request->get_param('id');
        
        if (!$quiz_id) {
            return new WP_Error('missing_quiz_id', __('Thiếu ID quiz', 'live-quiz'), array('status' => 400));
        }
        
        $quiz = get_post($quiz_id);
        
        if (!$quiz || $quiz->post_type !== 'live_quiz' || $quiz->post_status !== 'publish') {
            return new WP_Error('quiz_not_found', __('Không tìm thấy quiz', 'live-quiz'), array('status' => 404));
        }
        
        $questions = get_post_meta($quiz_id, '_live_quiz_questions', true);
        
        // Handle both JSON string and array
        if (is_string($questions)) {
            $questions = json_decode($questions, true);
        }
        $questions = $questions ? $questions : array();
        
        // Get additional metadata
        $description = get_post_meta($quiz_id, '_live_quiz_description', true);
        $alpha = get_post_meta($quiz_id, '_live_quiz_alpha', true);
        $max_players = get_post_meta($quiz_id, '_live_quiz_max_players', true);
        
        return rest_ensure_response(array(
            'success' => true,
            'quiz' => array(
                'id' => $quiz_id,
                'title' => get_the_title($quiz_id),
                'description' => $description,
                'question_count' => count($questions),
                'questions' => $questions,
                'alpha' => $alpha,
                'max_players' => $max_players,
                'created_date' => get_the_date('Y-m-d H:i:s', $quiz_id),
            ),
        ));
    }
    
    /**
     * Create session from frontend
     */
    public static function create_session_frontend($request) {
        $quiz_ids = $request->get_param('quiz_ids');
        $quiz_type = $request->get_param('quiz_type'); // 'all' or 'random'
        $question_count = $request->get_param('question_count'); // Only for random mode
        $question_order = $request->get_param('question_order'); // 'sequential' or 'random'
        $session_name = $request->get_param('session_name'); // Optional custom name
        
        if (empty($quiz_ids) || !is_array($quiz_ids)) {
            return new WP_Error('missing_quiz_ids', __('Phải chọn ít nhất một bộ câu hỏi', 'live-quiz'), array('status' => 400));
        }
        
        // Collect all questions from selected quizzes
        $all_questions = array();
        $quiz_titles = array();
        
        foreach ($quiz_ids as $quiz_id) {
            $quiz = get_post($quiz_id);
            if (!$quiz || $quiz->post_type !== 'live_quiz') {
                continue;
            }
            
            $quiz_titles[] = $quiz->post_title;
            $questions = get_post_meta($quiz_id, '_live_quiz_questions', true);
            
            // Handle both JSON string and array
            if (is_string($questions)) {
                $questions = json_decode($questions, true);
            }
            $questions = $questions ? $questions : array();
            
            if (!empty($questions)) {
                $all_questions = array_merge($all_questions, $questions);
            }
        }
        
        if (empty($all_questions)) {
            return new WP_Error('no_questions', __('Các bộ câu hỏi đã chọn không có câu hỏi nào', 'live-quiz'), array('status' => 400));
        }
        
        // Handle question mode
        if ($quiz_type === 'random' && $question_count > 0) {
            if ($question_count < count($all_questions)) {
                shuffle($all_questions);
                $all_questions = array_slice($all_questions, 0, $question_count);
            }
        }
        
        // Handle question order - shuffle if random order is selected
        if ($question_order === 'random') {
            shuffle($all_questions);
        }
        
        // Create session title
        if (!empty($session_name)) {
            $session_title = $session_name;
        } else {
            $session_title = sprintf(
                __('Phiên: %s - %s', 'live-quiz'),
                implode(', ', array_slice($quiz_titles, 0, 2)) . (count($quiz_titles) > 2 ? '...' : ''),
                date('Y-m-d H:i')
            );
        }
        
        $session_id = wp_insert_post(array(
            'post_type' => 'live_quiz_session',
            'post_title' => $session_title,
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        ));
        
        if (is_wp_error($session_id)) {
            return $session_id;
        }
        
        // Save first quiz_id for compatibility (use first selected quiz)
        update_post_meta($session_id, '_session_quiz_id', $quiz_ids[0]);
        
        // Save all quiz IDs and merged questions
        update_post_meta($session_id, '_session_quiz_ids', $quiz_ids);
        update_post_meta($session_id, '_session_question_order', $question_order);
        
        // Generate room code
        $room_code = self::generate_room_code();
        update_post_meta($session_id, '_session_room_code', $room_code);
        update_post_meta($session_id, '_session_status', 'lobby');
        update_post_meta($session_id, '_session_current_question', 0);
        
        // Save the merged questions to the session's quiz (create a temporary quiz post or save directly)
        // For simplicity, we'll create a temporary merged quiz
        $merged_quiz_id = wp_insert_post(array(
            'post_type' => 'live_quiz',
            'post_title' => $session_title . ' (Merged)',
            'post_status' => 'private',
            'post_author' => get_current_user_id(),
        ));
        
        if (!is_wp_error($merged_quiz_id)) {
            update_post_meta($merged_quiz_id, '_live_quiz_questions', $all_questions);
            update_post_meta($session_id, '_session_quiz_id', $merged_quiz_id);
            update_post_meta($session_id, '_session_is_merged', true);
            update_post_meta($merged_quiz_id, '_live_quiz_auto_generated', 'yes');
            update_post_meta($merged_quiz_id, '_live_quiz_parent_session', $session_id);
        }
        
        // Clear cache
        Live_Quiz_Session_Manager::clear_session_cache($session_id);
        
        return rest_ensure_response(array(
            'success' => true,
            'data' => array(
                'session_id' => $session_id,
                'room_code' => $room_code,
                'question_count' => count($all_questions),
            ),
        ));
    }
    
    /**
     * Quick create empty session (no quiz selected yet)
     */
    public static function create_session_quick($request) {
        $session_title = sprintf(
            __('Phòng Quiz - %s', 'live-quiz'),
            date('d/m/Y H:i')
        );
        
        $session_id = wp_insert_post(array(
            'post_type' => 'live_quiz_session',
            'post_title' => $session_title,
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        ));
        
        if (is_wp_error($session_id)) {
            return $session_id;
        }
        
        // Generate room code
        $room_code = self::generate_room_code();
        update_post_meta($session_id, '_session_room_code', $room_code);
        update_post_meta($session_id, '_session_status', 'lobby');
        update_post_meta($session_id, '_session_current_question', 0);
        update_post_meta($session_id, '_session_configured', false); // Mark as not configured yet
        
        // Clear cache
        Live_Quiz_Session_Manager::clear_session_cache($session_id);
        
        return rest_ensure_response(array(
            'success' => true,
            'data' => array(
                'session_id' => $session_id,
                'room_code' => $room_code,
            ),
        ));
    }
    
    /**
     * Update session settings (quiz selection, question mode, etc.)
     */
    public static function update_session_settings($request) {
        $session_id = $request->get_param('id');
        $quiz_ids = $request->get_param('quiz_ids');
        $quiz_type = $request->get_param('quiz_type'); // 'all' or 'random'
        $question_count = $request->get_param('question_count');
        $question_order = $request->get_param('question_order'); // 'sequential' or 'random'
        $hide_leaderboard = $request->get_param('hide_leaderboard'); // true/false
        $joining_open = $request->get_param('joining_open'); // true/false
        $show_pin = $request->get_param('show_pin'); // true/false
        $session_name = $request->get_param('session_name');
        
        if (empty($quiz_ids) || !is_array($quiz_ids)) {
            return new WP_Error('missing_quiz_ids', __('Phải chọn ít nhất một bộ câu hỏi', 'live-quiz'), array('status' => 400));
        }
        
        // Collect all questions from selected quizzes
        $all_questions = array();
        $quiz_titles = array();
        
        foreach ($quiz_ids as $quiz_id) {
            $quiz = get_post($quiz_id);
            if (!$quiz || $quiz->post_type !== 'live_quiz') {
                continue;
            }
            
            $quiz_titles[] = $quiz->post_title;
            $questions = get_post_meta($quiz_id, '_live_quiz_questions', true);
            
            if (is_string($questions)) {
                $questions = json_decode($questions, true);
            }
            $questions = $questions ? $questions : array();
            
            if (!empty($questions)) {
                $all_questions = array_merge($all_questions, $questions);
            }
        }
        
        if (empty($all_questions)) {
            return new WP_Error('no_questions', __('Các bộ câu hỏi đã chọn không có câu hỏi nào', 'live-quiz'), array('status' => 400));
        }
        
        // Handle question mode (select random subset)
        if ($quiz_type === 'random' && $question_count > 0) {
            if ($question_count < count($all_questions)) {
                shuffle($all_questions);
                $all_questions = array_slice($all_questions, 0, $question_count);
            }
        }
        
        // Handle question order - shuffle if random order is selected
        if ($question_order === 'random') {
            shuffle($all_questions);
        }
        
        // Update session title if provided
        if (!empty($session_name)) {
            $session_title = $session_name;
        } else {
            $session_title = sprintf(
                __('Phiên: %s - %s', 'live-quiz'),
                implode(', ', array_slice($quiz_titles, 0, 2)) . (count($quiz_titles) > 2 ? '...' : ''),
                date('Y-m-d H:i')
            );
        }
        
        wp_update_post(array(
            'ID' => $session_id,
            'post_title' => $session_title,
        ));
        
        // Create or update merged quiz
        $merged_quiz_id = get_post_meta($session_id, '_session_quiz_id', true);
        
        if (!$merged_quiz_id || !get_post($merged_quiz_id)) {
            // Create new merged quiz
            $merged_quiz_id = wp_insert_post(array(
                'post_type' => 'live_quiz',
                'post_title' => $session_title . ' (Merged)',
                'post_status' => 'private',
                'post_author' => get_current_user_id(),
            ));
        }
        
        if (!is_wp_error($merged_quiz_id)) {
            update_post_meta($merged_quiz_id, '_live_quiz_questions', $all_questions);
            update_post_meta($session_id, '_session_quiz_id', $merged_quiz_id);
            update_post_meta($session_id, '_session_is_merged', true);
            update_post_meta($merged_quiz_id, '_live_quiz_auto_generated', 'yes');
            update_post_meta($merged_quiz_id, '_live_quiz_parent_session', $session_id);
        }
        
        // Save settings metadata
        update_post_meta($session_id, '_session_quiz_ids', $quiz_ids);
        update_post_meta($session_id, '_session_question_order', $question_order);
        update_post_meta($session_id, '_session_hide_leaderboard', $hide_leaderboard ? true : false);
        update_post_meta($session_id, '_session_joining_open', $joining_open ? true : false);
        update_post_meta($session_id, '_session_show_pin', $show_pin ? true : false);
        update_post_meta($session_id, '_session_configured', true); // Mark as configured
        
        // Clear cache
        Live_Quiz_Session_Manager::clear_session_cache($session_id);
        
        return rest_ensure_response(array(
            'success' => true,
            'data' => array(
                'session_id' => $session_id,
                'question_count' => count($all_questions),
            ),
        ));
    }
    
    /**
     * Get user's active session
     */
    public static function get_user_active_session($request) {
        $user_id = get_current_user_id();
        
        error_log("=== GET USER ACTIVE SESSION for user_id: {$user_id} ===");
        
        if (!$user_id) {
            return new WP_Error('not_logged_in', __('Bạn cần đăng nhập', 'live-quiz'), array('status' => 401));
        }
        
        // Get active session from user meta
        $active_session = get_user_meta($user_id, '_live_quiz_active_session', true);
        
        error_log("Active session from user meta: " . json_encode($active_session));
        
        if (!$active_session || !is_array($active_session)) {
            error_log("No active session found");
            return rest_ensure_response(array(
                'success' => true,
                'has_session' => false,
            ));
        }
        
        // Check if session still exists and is active
        // Support both camelCase (new) and snake_case (old) for backward compatibility
        $session_id = isset($active_session['sessionId']) ? $active_session['sessionId'] : 
                     (isset($active_session['session_id']) ? $active_session['session_id'] : 0);
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        
        error_log("Session data: " . json_encode($session ? ['id' => $session_id, 'status' => $session['status']] : null));
        
        if (!$session) {
            // Session doesn't exist - clean up
            error_log("Session not found, cleaning up user meta");
            delete_user_meta($user_id, '_live_quiz_active_session');
            return rest_ensure_response(array(
                'success' => true,
                'has_session' => false,
            ));
        }
        
        // IMPORTANT: Even if session status is 'ended', we still return it
        // This allows users to see the final leaderboard after quiz naturally ends
        // User meta is only cleared when host explicitly ends the session (via WebSocket kick)
        // So if user meta still exists, user should still be able to see final results
        
        // Check if session is not too old (30 minutes)
        $MAX_AGE = 30 * 60 * 1000; // 30 minutes in milliseconds
        $timestamp = isset($active_session['timestamp']) ? $active_session['timestamp'] : 0;
        if ($timestamp && (time() * 1000 - $timestamp) > $MAX_AGE) {
            delete_user_meta($user_id, '_live_quiz_active_session');
            return rest_ensure_response(array(
                'success' => true,
                'has_session' => false,
            ));
        }
        
        // Add session status to response so client can determine which screen to show
        $active_session['sessionStatus'] = $session['status'];
        
        // Return active session data
        return rest_ensure_response(array(
            'success' => true,
            'has_session' => true,
            'session' => $active_session,
        ));
    }
    
    /**
     * Clear current user's active session
     */
    public static function clear_user_active_session($request) {
        $user_id = get_current_user_id();
        
        error_log("[LiveQuiz] Clearing active session for user: {$user_id}");
        
        if (!$user_id) {
            return new WP_Error('not_logged_in', __('Bạn cần đăng nhập', 'live-quiz'), array('status' => 401));
        }
        
        // Delete user meta
        delete_user_meta($user_id, '_live_quiz_active_session');
        
        error_log("[LiveQuiz] User session cleared successfully");
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => __('Đã xóa session thành công', 'live-quiz'),
        ));
    }
    
    /**
     * Get session summary - all questions with answer statistics
     */
    public static function get_session_summary($request) {
        $session_id = $request->get_param('id');
        
        // Get session data
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        if (!$session) {
            return new WP_Error('not_found', __('Không tìm thấy phiên', 'live-quiz'), array('status' => 404));
        }
        
        $questions = $session['questions'];
        if (empty($questions)) {
            return rest_ensure_response(array(
                'success' => true,
                'questions' => array(),
                'total_participants' => 0,
            ));
        }
        
        // Get all participants to count total
        $participants = Live_Quiz_Session_Manager::get_participants($session_id);
        $total_participants = count($participants);
        
        // Build summary for each question
        $summary = array();
        foreach ($questions as $index => $question) {
            // Find correct answer index from choices (choices have is_correct field)
            $correct_answer = 0;
            $correct_answer_text = '';
            if (isset($question['choices']) && is_array($question['choices'])) {
                foreach ($question['choices'] as $choice_index => $choice) {
                    if (isset($choice['is_correct']) && $choice['is_correct']) {
                        $correct_answer = $choice_index;
                        $correct_answer_text = $choice['text'];
                        break; // Found the correct answer
                    }
                }
            }
            
            // Initialize choice statistics
            $choice_stats = array();
            if (isset($question['choices']) && is_array($question['choices'])) {
                foreach ($question['choices'] as $choice_index => $choice) {
                    $choice_stats[$choice_index] = array(
                        'text' => $choice['text'],
                        'is_correct' => isset($choice['is_correct']) && $choice['is_correct'],
                        'count' => 0,
                        'percentage' => 0,
                    );
                }
            }
            
            // Count answers for this question
            $correct_count = 0;
            $total_answered = 0;
            
            foreach ($participants as $participant) {
                $user_id = $participant['user_id'];
                
                // Get all answers for this user (stored as array)
                $all_answers = get_post_meta($session_id, '_answer_' . $user_id, true);
                
                if ($all_answers && is_array($all_answers) && isset($all_answers[$index])) {
                    $answer_data = $all_answers[$index];
                    
                    if (is_array($answer_data)) {
                        $total_answered++;
                        $user_choice = isset($answer_data['choice_id']) ? (int)$answer_data['choice_id'] : -1;
                        
                        // Count this choice
                        if (isset($choice_stats[$user_choice])) {
                            $choice_stats[$user_choice]['count']++;
                        }
                        
                        // Check if correct
                        if ($user_choice === $correct_answer) {
                            $correct_count++;
                        }
                    }
                }
            }
            
            // Calculate percentages for each choice
            foreach ($choice_stats as $choice_index => $stats) {
                $choice_stats[$choice_index]['percentage'] = $total_participants > 0 
                    ? round(($stats['count'] / $total_participants) * 100, 1) 
                    : 0;
            }
            
            // Convert to indexed array for JSON
            $choice_stats = array_values($choice_stats);
            
            $summary[] = array(
                'index' => $index,
                'question' => $question['text'],
                'choices' => $choice_stats,
                'correct_answer' => $correct_answer,
                'correct_answer_text' => $correct_answer_text,
                'correct_count' => $correct_count,
                'total_answered' => $total_answered,
                'total_participants' => $total_participants,
                'correct_percentage' => $total_participants > 0 ? round(($correct_count / $total_participants) * 100, 1) : 0,
            );
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'questions' => $summary,
            'total_participants' => $total_participants,
        ));
    }
    
    /**
     * Send event to WebSocket server
     * 
     * @param string $event Event name
     * @param array $data Event data
     * @param string $target_connection_id Optional connection ID to target specific client
     * @return bool Success status
     */
    private static function send_websocket_event($event, $data, $target_connection_id = null) {
        $websocket_url = get_option('live_quiz_websocket_url', 'http://localhost:3033');
        
        if (empty($websocket_url)) {
            return false;
        }
        
        // WebSocket server exposes /api/emit endpoint for emitting events
        $emit_url = trailingslashit($websocket_url) . 'api/emit';
        
        $payload = array(
            'event' => $event,
            'data' => $data,
        );
        
        if ($target_connection_id) {
            $payload['connectionId'] = $target_connection_id;
        }
        
        $response = wp_remote_post($emit_url, array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode($payload),
            'timeout' => 5,
        ));
        
        if (is_wp_error($response)) {
            error_log('[Live Quiz] Failed to send WebSocket event: ' . $response->get_error_message());
            return false;
        }
        
        return true;
    }
}
