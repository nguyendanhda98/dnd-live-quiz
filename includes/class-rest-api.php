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
        
        // Frontend: Create session from frontend (requires authentication)
        register_rest_route(self::NAMESPACE, '/sessions/create-frontend', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'create_session_frontend'),
            'permission_callback' => array(__CLASS__, 'check_teacher_permission_with_cookie'),
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
        return Live_Quiz_Session_Manager::can_control_session($session_id);
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
        
        return rest_ensure_response(array(
            'success' => true,
            'session' => Live_Quiz_Session_Manager::get_session($session_id),
        ));
    }
    
    /**
     * End session - Kick all players out of the room
     */
    public static function end_session($request) {
        $session_id = $request->get_param('id');
        
        error_log("\n=== END ROOM REQUEST ===");
        error_log("Session ID: {$session_id}");
        error_log("Timestamp: " . date('Y-m-d H:i:s'));
        
        // Step 1: Update session status in database
        $result = Live_Quiz_Session_Manager::end_session($session_id);
        
        if (!$result) {
            error_log("ERROR: Failed to update session status in database");
            return new WP_Error('cannot_end', __('Không thể kết thúc phiên', 'live-quiz'), array('status' => 400));
        }
        
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
        
        error_log("=== END ROOM COMPLETED ===\n");
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Room ended and all players kicked',
            'session_id' => $session_id
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
        
        // Check for duplicate display names and add username if needed
        $current_user = wp_get_current_user();
        if ($current_user->ID) {
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
        
        // Add participant
        $participant = Live_Quiz_Session_Manager::add_participant($session_id, $display_name);
        
        if (is_wp_error($participant)) {
            return $participant;
        }
        
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        
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
        } elseif (class_exists('Live_Quiz_WebSocket_Adapter')) {
            $adapter = Live_Quiz_WebSocket_Adapter::get_instance();
            $connection_info = $adapter->get_connection_info($session_id, $participant['user_id'], $participant['display_name']);
            if ($connection_info) {
                $response['websocket'] = $connection_info;
            }
        }
        
        // Save active session to user meta if user is logged in
        $wp_user_id = get_current_user_id();
        if ($wp_user_id) {
            // Check if user already has an active session from another device
            $old_session = get_user_meta($wp_user_id, '_live_quiz_active_session', true);
            if ($old_session && is_array($old_session)) {
                $old_connection_id = isset($old_session['connectionId']) ? $old_session['connectionId'] : null;
                
                // If there's a different connection, emit event to kick it via WebSocket
                if ($old_connection_id && $old_connection_id !== $connection_id) {
                    // Notify old connection via WebSocket
                    self::send_websocket_event('session_kicked', array(
                        'message' => 'Bạn đã tham gia phòng này từ tab/thiết bị khác.',
                        'new_connection_id' => $connection_id,
                    ), $old_connection_id);
                    
                    error_log("[Live Quiz] User {$wp_user_id} joined from new device. Kicking old connection: {$old_connection_id}");
                }
            }
            
            // Save new session
            update_user_meta($wp_user_id, '_live_quiz_active_session', array(
                'sessionId' => $session_id,
                'userId' => $participant['user_id'],
                'displayName' => $participant['display_name'],
                'roomCode' => $room_code,
                'websocketToken' => $jwt_token,
                'connectionId' => $connection_id,
                'timestamp' => time() * 1000, // milliseconds
            ));
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
        $session_id = $request->get_param('session_id');
        $choice_id = $request->get_param('choice_id');
        
        if (!$session_id || !is_numeric($choice_id)) {
            return new WP_Error('missing_params', __('Thiếu thông tin', 'live-quiz'), array('status' => 400));
        }
        
        // Get WordPress user ID
        $user_id = get_current_user_id();
        if (!$user_id) {
            return new WP_Error('not_logged_in', __('Bạn cần đăng nhập', 'live-quiz'), array('status' => 401));
        }
        
        // Validate session access
        $access_check = Live_Quiz_Security::validate_session_access($session_id, $user_id);
        if (is_wp_error($access_check)) {
            return $access_check;
        }
        
        // Check rate limit
        $rate_check = Live_Quiz_Security::check_rate_limit('answer', $user_id, 10);
        if (is_wp_error($rate_check)) {
            return $rate_check;
        }
        
        // Submit answer
        $result = Live_Quiz_Session_Manager::submit_answer($session_id, $user_id, (int)$choice_id);
        
        if (is_wp_error($result)) {
            return $result;
        }
        
        return rest_ensure_response($result);
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
     * Get players list (for host)
     */
    public static function get_players($request) {
        $session_id = $request->get_param('id');
        
        // Get session to find host_id
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        $host_id = $session['host_id'];
        
        $players = Live_Quiz_Session_Manager::get_participants($session_id);
        
        // Filter out the host from players list
        $players = array_filter($players, function($player) use ($host_id) {
            return $player['user_id'] != $host_id;
        });
        
        // Re-index array to ensure sequential keys
        $players = array_values($players);
        
        return rest_ensure_response(array(
            'success' => true,
            'players' => $players,
        ));
    }
    
    /**
     * Get player count (for players - public endpoint)
     */
    public static function get_player_count($request) {
        $session_id = $request->get_param('id');
        
        // Get session to find host_id
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        if (!$session) {
            return new WP_Error('not_found', __('Không tìm thấy phiên', 'live-quiz'), array('status' => 404));
        }
        
        $host_id = $session['host_id'];
        $players = Live_Quiz_Session_Manager::get_participants($session_id);
        
        // Filter out the host from players list
        $players = array_filter($players, function($player) use ($host_id) {
            return $player['user_id'] != $host_id;
        });
        
        return rest_ensure_response(array(
            'success' => true,
            'count' => count($players),
        ));
    }
    
    /**
     * Get players list (for players - public endpoint)
     */
    public static function get_players_list($request) {
        $session_id = $request->get_param('id');
        
        // Get session to find host_id
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        if (!$session) {
            return new WP_Error('not_found', __('Không tìm thấy phiên', 'live-quiz'), array('status' => 404));
        }
        
        $host_id = $session['host_id'];
        $players = Live_Quiz_Session_Manager::get_participants($session_id);
        
        // Filter out the host from players list
        $players = array_filter($players, function($player) use ($host_id) {
            return $player['user_id'] != $host_id;
        });
        
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
        // Check if user is logged in
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_forbidden',
                __('Bạn cần đăng nhập với tài khoản giáo viên.', 'live-quiz'),
                array('status' => 401)
            );
        }
        
        // Check if user has edit_posts capability
        if (!current_user_can('edit_posts')) {
            return new WP_Error(
                'rest_forbidden',
                __('Bạn không có quyền tạo phòng quiz.', 'live-quiz'),
                array('status' => 403)
            );
        }
        
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
     * List quizzes with pagination
     */
    public static function list_quizzes($request) {
        $page = $request->get_param('page') ?: 1;
        $per_page = $request->get_param('per_page') ?: 10;
        
        $args = array(
            'post_type' => 'live_quiz',
            'post_status' => 'publish',
            'posts_per_page' => $per_page,
            'paged' => $page,
            'orderby' => 'date',
            'order' => 'DESC',
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
                    'description' => get_post_meta($post_id, '_live_quiz_description', true),
                    'question_count' => count($questions),
                    'created_date' => get_the_date('Y-m-d H:i:s'),
                );
            }
            wp_reset_postdata();
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'quizzes' => $quizzes,
            'total' => $query->found_posts,
            'pages' => $query->max_num_pages,
            'current_page' => $page,
        ));
    }
    
    /**
     * Create session from frontend
     */
    public static function create_session_frontend($request) {
        $quiz_ids = $request->get_param('quiz_ids');
        $quiz_type = $request->get_param('quiz_type'); // 'all' or 'random'
        $question_count = $request->get_param('question_count'); // Only for random mode
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
        $session_id = isset($active_session['session_id']) ? $active_session['session_id'] : 0;
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        
        error_log("Session data: " . json_encode($session ? ['id' => $session_id, 'status' => $session['status']] : null));
        
        if (!$session || $session['status'] === 'ended') {
            // Clean up invalid session
            error_log("Session is ended or not found, cleaning up user meta");
            delete_user_meta($user_id, '_live_quiz_active_session');
            return rest_ensure_response(array(
                'success' => true,
                'has_session' => false,
            ));
        }
        
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
        
        // Return active session data
        return rest_ensure_response(array(
            'success' => true,
            'has_session' => true,
            'session' => $active_session,
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
