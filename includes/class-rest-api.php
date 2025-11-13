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
        
        // Generate URLs
        $host_base = Live_Quiz_Post_Types::get_host_base();
        $play_base = Live_Quiz_Post_Types::get_play_base();
        $host_url = home_url('/' . $host_base . '/' . $room_code);
        $player_url = home_url('/' . $play_base . '/' . $room_code);
        
        return rest_ensure_response(array(
            'success' => true,
            'session_id' => $session_id,
            'room_code' => $room_code,
            'pin_code' => $room_code, // Alias for clarity
            'host_url' => $host_url,
            'player_url' => $player_url,
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
     * End session
     */
    public static function end_session($request) {
        $session_id = $request->get_param('id');
        
        $result = Live_Quiz_Session_Manager::end_session($session_id);
        
        if (!$result) {
            return new WP_Error('cannot_end', __('Không thể kết thúc phiên', 'live-quiz'), array('status' => 400));
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'session' => Live_Quiz_Session_Manager::get_session($session_id),
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
        
        if (!$room_code || !$display_name) {
            return new WP_Error('missing_params', __('Thiếu thông tin', 'live-quiz'), array('status' => 400));
        }
        
        // Sanitize
        $room_code = Live_Quiz_Security::sanitize_room_code($room_code);
        $display_name = Live_Quiz_Security::sanitize_display_name($display_name);
        
        if (empty($display_name)) {
            return new WP_Error('invalid_name', __('Tên không hợp lệ', 'live-quiz'), array('status' => 400));
        }
        
        // Find session
        $session_id = Live_Quiz_Session_Manager::find_session_by_code($room_code);
        
        if (!$session_id) {
            return new WP_Error('session_not_found', __('Không tìm thấy phòng', 'live-quiz'), array('status' => 404));
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
        
        return rest_ensure_response($response);
    }
    
    /**
     * Leave session
     */
    public static function leave_session($request) {
        $session_id = $request->get_param('session_id');
        $user_id = $request->get_param('user_id');
        
        if (!$session_id || !$user_id) {
            return new WP_Error('missing_params', __('Thiếu thông tin', 'live-quiz'), array('status' => 400));
        }
        
        // Sanitize
        $session_id = absint($session_id);
        $user_id = sanitize_text_field($user_id);
        
        // Remove participant from session
        $result = Live_Quiz_Session_Manager::remove_participant($session_id, $user_id);
        
        if (is_wp_error($result)) {
            // Even if there's an error, return success to allow client to clean up
            // This prevents stuck states
            error_log('Leave session error: ' . $result->get_error_message());
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
        $user_id = $request->get_param('user_id');
        $choice_id = $request->get_param('choice_id');
        
        if (!$session_id || !$user_id || !is_numeric($choice_id)) {
            return new WP_Error('missing_params', __('Thiếu thông tin', 'live-quiz'), array('status' => 400));
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
        
        $players = Live_Quiz_Session_Manager::get_participants($session_id);
        
        return rest_ensure_response(array(
            'success' => true,
            'players' => $players,
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
            'quizzes' => $quizzes,
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
        $question_mode = $request->get_param('question_mode'); // 'all' or 'random'
        $question_count = $request->get_param('question_count'); // Only for random mode
        
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
        if ($question_mode === 'random' && $question_count > 0) {
            if ($question_count < count($all_questions)) {
                shuffle($all_questions);
                $all_questions = array_slice($all_questions, 0, $question_count);
            }
        }
        
        // Create session post
        $session_title = sprintf(
            __('Phiên: %s - %s', 'live-quiz'),
            implode(', ', $quiz_titles),
            date('Y-m-d H:i')
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
        
        // Save session meta
        update_post_meta($session_id, '_session_quiz_ids', $quiz_ids);
        update_post_meta($session_id, '_session_questions', json_encode($all_questions));
        
        // Generate room code
        $room_code = self::generate_room_code();
        update_post_meta($session_id, '_session_room_code', $room_code);
        update_post_meta($session_id, '_session_status', 'lobby');
        
        $session = Live_Quiz_Session_Manager::get_session($session_id);
        
        // Generate URLs
        $host_base = Live_Quiz_Post_Types::get_host_base();
        $play_base = Live_Quiz_Post_Types::get_play_base();
        $host_url = home_url('/' . $host_base . '/' . $room_code);
        $player_url = home_url('/' . $play_base . '/' . $room_code);
        
        return rest_ensure_response(array(
            'success' => true,
            'session_id' => $session_id,
            'room_code' => $room_code,
            'pin_code' => $room_code,
            'host_url' => $host_url,
            'player_url' => $player_url,
            'question_count' => count($all_questions),
            'session' => $session,
        ));
    }
}
