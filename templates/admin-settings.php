<?php
/**
 * Admin Settings Page Template
 * 
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap">
    <h1><?php _e('Cài đặt Live Quiz', 'live-quiz'); ?></h1>
    
    <!-- Tab Navigation -->
    <nav class="nav-tab-wrapper live-quiz-settings-tabs">
        <a href="#tab-general" class="nav-tab nav-tab-active" data-tab="general">
            <?php _e('Cài đặt chung', 'live-quiz'); ?>
        </a>
        <a href="#tab-ai" class="nav-tab" data-tab="ai">
            <?php _e('Cài đặt AI', 'live-quiz'); ?>
        </a>
        <a href="#tab-pages" class="nav-tab" data-tab="pages">
            <?php _e('Cài đặt trang', 'live-quiz'); ?>
        </a>
        <a href="#tab-websocket" class="nav-tab" data-tab="websocket">
            <?php _e('WebSocket & Redis', 'live-quiz'); ?>
        </a>
        <a href="#tab-prompts" class="nav-tab" data-tab="prompts">
            <?php _e('AI Prompts', 'live-quiz'); ?>
        </a>
        <a href="#tab-categories" class="nav-tab" data-tab="categories">
            <?php _e('Thẻ Quiz', 'live-quiz'); ?>
        </a>
        <a href="#tab-info" class="nav-tab" data-tab="info">
            <?php _e('Thông tin', 'live-quiz'); ?>
        </a>
    </nav>
    
    <form method="post" action="">
        <?php wp_nonce_field('live_quiz_settings'); ?>
        
        <!-- Tab: General Settings -->
        <div id="tab-general" class="live-quiz-tab-content active">
            <h2><?php _e('Cài đặt chung', 'live-quiz'); ?></h2>
            <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="live_quiz_alpha"><?php _e('Hệ số Alpha (α)', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="number" 
                           name="live_quiz_alpha" 
                           id="live_quiz_alpha" 
                           value="<?php echo esc_attr(get_option('live_quiz_alpha', 0.3)); ?>"
                           min="0" 
                           max="1" 
                           step="0.1"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Hệ số điểm tối thiểu khi trả lời đúng (0-1). Ví dụ: 0.3 = ít nhất 30% điểm khi trả lời đúng cuối giờ.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_base_points"><?php _e('Điểm cơ bản mặc định', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="number" 
                           name="live_quiz_base_points" 
                           id="live_quiz_base_points" 
                           value="<?php echo esc_attr(get_option('live_quiz_base_points', 1000)); ?>"
                           min="100" 
                           max="10000" 
                           step="100"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Điểm cơ bản cho mỗi câu hỏi mới.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_time_limit"><?php _e('Thời gian mặc định (giây)', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="number" 
                           name="live_quiz_time_limit" 
                           id="live_quiz_time_limit" 
                           value="<?php echo esc_attr(get_option('live_quiz_time_limit', 20)); ?>"
                           min="5" 
                           max="120"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Thời gian mặc định cho mỗi câu hỏi mới.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_max_players"><?php _e('Số người chơi tối đa', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="number" 
                           name="live_quiz_max_players" 
                           id="live_quiz_max_players" 
                           value="<?php echo esc_attr(get_option('live_quiz_max_players', 500)); ?>"
                           min="1" 
                           max="1000"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Số lượng người chơi tối đa trong một phiên.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            </table>
        </div>
        
        <!-- Tab: AI Settings -->
        <div id="tab-ai" class="live-quiz-tab-content">
            <h2><?php _e('Cài đặt AI', 'live-quiz'); ?></h2>
            <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="live_quiz_gemini_api_key"><?php _e('Gemini API Key', 'live-quiz'); ?></label>
                </th>
                <td>
                    <?php 
                    $api_key = get_option('live_quiz_gemini_api_key', '');
                    $display_key = '';
                    $input_value = ''; // Không hiển thị key trong input khi đã lưu
                    
                    if (!empty($api_key)) {
                        // Hiển thị dạng ...xyz (4 ký tự cuối)
                        $display_key = '...' . substr($api_key, -4);
                    }
                    ?>
                    <input type="text" 
                           name="live_quiz_gemini_api_key" 
                           id="live_quiz_gemini_api_key" 
                           value="<?php echo esc_attr($input_value); ?>"
                           placeholder="<?php echo esc_attr($display_key ?: 'Nhập API Key mới...'); ?>"
                           class="regular-text">
                    <?php if (!empty($api_key)): ?>
                        <span class="description" style="color: #46b450;">
                            ✓ Key hiện tại: <code><?php echo esc_html($display_key); ?></code>
                        </span>
                        <input type="hidden" name="live_quiz_gemini_api_key_existing" value="1">
                    <?php endif; ?>
                    <p class="description">
                        <?php _e('API Key từ Google AI Studio để sử dụng tính năng tạo câu hỏi bằng AI.', 'live-quiz'); ?>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank"><?php _e('Lấy API Key', 'live-quiz'); ?></a>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_gemini_model"><?php _e('Gemini Model', 'live-quiz'); ?></label>
                </th>
                <td>
                    <?php $current_model = get_option('live_quiz_gemini_model', 'gemini-1.5-flash'); ?>
                    <select name="live_quiz_gemini_model" id="live_quiz_gemini_model" class="regular-text">
                        <option value=""><?php _e('Đang tải models...', 'live-quiz'); ?></option>
                    </select>
                    <button type="button" id="reload-models" class="button" style="margin-left: 10px;">
                        <span class="dashicons dashicons-update"></span>
                        <?php _e('Tải lại', 'live-quiz'); ?>
                    </button>
                    <p class="description">
                        <?php _e('Chọn model Gemini để tạo câu hỏi. Models sẽ được tải tự động từ API.', 'live-quiz'); ?>
                        <a href="https://ai.google.dev/gemini-api/docs/models/gemini" target="_blank"><?php _e('Xem chi tiết models', 'live-quiz'); ?></a>
                    </p>
                    <div id="model-loading" style="display: none; margin-top: 10px;">
                        <span class="spinner is-active" style="float: none; margin: 0 10px 0 0;"></span>
                        <?php _e('Đang tải danh sách models...', 'live-quiz'); ?>
                    </div>
                    <div id="model-error" style="display: none; margin-top: 10px; color: #dc3232;"></div>
                    
                    <script>
                    jQuery(document).ready(function($) {
                        const currentModel = <?php echo json_encode($current_model); ?>;
                        
                        function loadModels() {
                            $('#model-loading').show();
                            $('#model-error').hide();
                            $('#reload-models').prop('disabled', true);
                            
                            $.ajax({
                                url: '<?php echo rest_url('live-quiz/v1/ai/models'); ?>',
                                method: 'GET',
                                beforeSend: function(xhr) {
                                    xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                },
                                success: function(response) {
                                    if (response.success && response.data) {
                                        const $select = $('#live_quiz_gemini_model');
                                        $select.empty();
                                        
                                        if (response.data.length === 0) {
                                            $select.append('<option value=""><?php _e('Không tìm thấy models', 'live-quiz'); ?></option>');
                                        } else {
                                            response.data.forEach(function(model) {
                                                const selected = model.name === currentModel ? 'selected' : '';
                                                const displayText = model.displayName + (model.description ? ' - ' + model.description.substring(0, 60) : '');
                                                $select.append('<option value="' + model.name + '" ' + selected + '>' + displayText + '</option>');
                                            });
                                        }
                                        
                                        if (response.cached) {
                                            $('#model-error').html('<?php _e('✓ Đã tải từ cache', 'live-quiz'); ?>').css('color', '#46b450').show();
                                        }
                                    }
                                },
                                error: function(xhr) {
                                    let errorMsg = '<?php _e('Không thể tải models. Vui lòng kiểm tra API key.', 'live-quiz'); ?>';
                                    if (xhr.responseJSON && xhr.responseJSON.message) {
                                        errorMsg = xhr.responseJSON.message;
                                    }
                                    $('#model-error').text(errorMsg).show();
                                    
                                    // Show default options as fallback
                                    const $select = $('#live_quiz_gemini_model');
                                    $select.empty();
                                    $select.append('<option value="gemini-1.5-flash">Gemini 1.5 Flash</option>');
                                    $select.append('<option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</option>');
                                    $select.append('<option value="gemini-1.5-pro">Gemini 1.5 Pro</option>');
                                    $select.val(currentModel);
                                },
                                complete: function() {
                                    $('#model-loading').hide();
                                    $('#reload-models').prop('disabled', false);
                                }
                            });
                        }
                        
                        // Load models on page load
                        loadModels();
                        
                        // Reload button
                        $('#reload-models').on('click', function() {
                            // Clear cache by adding timestamp
                            $.ajax({
                                url: '<?php echo rest_url('live-quiz/v1/ai/models'); ?>?_=' + Date.now(),
                                method: 'GET',
                                beforeSend: function(xhr) {
                                    xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                },
                                success: function() {
                                    loadModels();
                                }
                            });
                        });
                    });
                    </script>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_gemini_max_tokens"><?php _e('Max Output Tokens', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="number" 
                           name="live_quiz_gemini_max_tokens" 
                           id="live_quiz_gemini_max_tokens" 
                           value="<?php echo esc_attr(get_option('live_quiz_gemini_max_tokens', 8192)); ?>"
                           min="1024" 
                           max="65536" 
                           step="512"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Số lượng tokens tối đa cho response từ AI. Giá trị cao hơn cho phép tạo nhiều câu hỏi hơn nhưng tốn token hơn.', 'live-quiz'); ?><br>
                        <?php _e('Khuyến nghị: 2048-4096 cho 1-5 câu hỏi, 8192 cho 5-10 câu hỏi, 16384+ cho 10+ câu hỏi. Max 65536.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_gemini_timeout"><?php _e('API Timeout (giây)', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="number" 
                           name="live_quiz_gemini_timeout" 
                           id="live_quiz_gemini_timeout" 
                           value="<?php echo esc_attr(get_option('live_quiz_gemini_timeout', 60)); ?>"
                           min="10" 
                           max="300" 
                           step="10"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Thời gian chờ tối đa cho API request. Tăng timeout nếu tạo nhiều câu hỏi phức tạp.', 'live-quiz'); ?><br>
                        <?php _e('Khuyến nghị: 30-60 giây cho 1-5 câu hỏi, 60-120 giây cho 5-10 câu hỏi, 120+ cho nhiều hơn.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            </table>
        </div>
        
        <!-- Tab: Pages Settings -->
        <div id="tab-pages" class="live-quiz-tab-content">
            <h2><?php _e('Cài đặt trang', 'live-quiz'); ?></h2>
            <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="live_quiz_host_page"><?php _e('Trang Host', 'live-quiz'); ?></label>
                </th>
                <td>
                    <?php
                    $host_page_id = get_option('live_quiz_host_page', 0);
                    $host_page = $host_page_id ? get_post($host_page_id) : null;
                    ?>
                    <select name="live_quiz_host_page" id="live_quiz_host_page" class="regular-text live-quiz-page-select" style="width: 400px;">
                        <option value="0"><?php _e('-- Chọn trang --', 'live-quiz'); ?></option>
                        <?php if ($host_page): ?>
                            <option value="<?php echo esc_attr($host_page_id); ?>" selected>
                                <?php echo esc_html($host_page->post_title); ?>
                            </option>
                        <?php endif; ?>
                    </select>
                    <p class="description">
                        <?php _e('Chọn trang dùng để host quiz (trang có shortcode [live_quiz_host]). Có thể tìm kiếm theo tên trang.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_player_page"><?php _e('Trang Player', 'live-quiz'); ?></label>
                </th>
                <td>
                    <?php
                    $player_page_id = get_option('live_quiz_player_page', 0);
                    $player_page = $player_page_id ? get_post($player_page_id) : null;
                    ?>
                    <select name="live_quiz_player_page" id="live_quiz_player_page" class="regular-text live-quiz-page-select" style="width: 400px;">
                        <option value="0"><?php _e('-- Chọn trang --', 'live-quiz'); ?></option>
                        <?php if ($player_page): ?>
                            <option value="<?php echo esc_attr($player_page_id); ?>" selected>
                                <?php echo esc_html($player_page->post_title); ?>
                            </option>
                        <?php endif; ?>
                    </select>
                    <p class="description">
                        <?php _e('Chọn trang dùng để người chơi tham gia quiz (trang có shortcode [live_quiz_player]). Có thể tìm kiếm theo tên trang.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
        </table>
        
        <script>
        jQuery(document).ready(function($) {
            // Initialize Select2 for page selection with AJAX search
            $('.live-quiz-page-select').select2({
                ajax: {
                    url: ajaxurl,
                    dataType: 'json',
                    delay: 250,
                    data: function(params) {
                        return {
                            action: 'live_quiz_search_pages',
                            search: params.term,
                            _wpnonce: '<?php echo wp_create_nonce('live_quiz_search_pages'); ?>'
                        };
                    },
                    processResults: function(data) {
                        return {
                            results: data.data || []
                        };
                    },
                    cache: true
                },
                minimumInputLength: 0,
                placeholder: '<?php _e('-- Chọn trang --', 'live-quiz'); ?>',
                allowClear: true,
                language: {
                    inputTooShort: function() {
                        return '<?php _e('Nhập để tìm kiếm...', 'live-quiz'); ?>';
                    },
                    searching: function() {
                        return '<?php _e('Đang tìm...', 'live-quiz'); ?>';
                    },
                    noResults: function() {
                        return '<?php _e('Không tìm thấy trang nào', 'live-quiz'); ?>';
                    }
                }
            });
        });
        </script>
        </div>
        
        <!-- Tab: WebSocket & Redis -->
        <div id="tab-websocket" class="live-quiz-tab-content">
            <h2><?php _e('WebSocket & Redis (Mở rộng)', 'live-quiz'); ?></h2>
            <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="live_quiz_websocket_url"><?php _e('WebSocket Server URL', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="text" 
                           name="live_quiz_websocket_url" 
                           id="live_quiz_websocket_url" 
                           value="<?php echo esc_attr(get_option('live_quiz_websocket_url', 'http://localhost:3000')); ?>"
                           class="regular-text">
                    <p class="description">
                        <?php _e('URL của Node.js WebSocket server. Ví dụ: http://localhost:3000 hoặc https://ws.example.com', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_websocket_secret"><?php _e('WordPress Secret', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="text" 
                           name="live_quiz_websocket_secret" 
                           id="live_quiz_websocket_secret" 
                           value="<?php echo esc_attr(get_option('live_quiz_websocket_secret', '')); ?>"
                           class="regular-text">
                    <button type="button" class="button" id="generate_ws_secret"><?php _e('Tạo Secret', 'live-quiz'); ?></button>
                    <p class="description">
                        <?php _e('Secret dùng để xác thực giữa WordPress và WebSocket server. Phải giống với WORDPRESS_SECRET trong file .env', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_websocket_jwt_secret"><?php _e('JWT Secret', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="text" 
                           name="live_quiz_websocket_jwt_secret" 
                           id="live_quiz_websocket_jwt_secret" 
                           value="<?php echo esc_attr(get_option('live_quiz_websocket_jwt_secret', '')); ?>"
                           class="regular-text">
                    <button type="button" class="button" id="generate_jwt_secret"><?php _e('Tạo Secret', 'live-quiz'); ?></button>
                    <p class="description">
                        <?php _e('Secret dùng để tạo JWT token cho người chơi. Phải giống với JWT_SECRET trong file .env của WebSocket server', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_redis_host"><?php _e('Redis Host', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="text" 
                           name="live_quiz_redis_host" 
                           id="live_quiz_redis_host" 
                           value="<?php echo esc_attr(get_option('live_quiz_redis_host', '127.0.0.1')); ?>"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Địa chỉ Redis server. Mặc định: 127.0.0.1 (localhost)', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_redis_port"><?php _e('Redis Port', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="number" 
                           name="live_quiz_redis_port" 
                           id="live_quiz_redis_port" 
                           value="<?php echo esc_attr(get_option('live_quiz_redis_port', 6379)); ?>"
                           min="1" 
                           max="65536"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Port của Redis server. Mặc định: 6379', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_redis_password"><?php _e('Redis Password', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="password" 
                           name="live_quiz_redis_password" 
                           id="live_quiz_redis_password" 
                           value="<?php echo esc_attr(get_option('live_quiz_redis_password', '')); ?>"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Mật khẩu Redis (nếu có). Để trống nếu không cần auth.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_redis_database"><?php _e('Redis Database', 'live-quiz'); ?></label>
                </th>
                <td>
                    <input type="number" 
                           name="live_quiz_redis_database" 
                           id="live_quiz_redis_database" 
                           value="<?php echo esc_attr(get_option('live_quiz_redis_database', 0)); ?>"
                           min="0" 
                           max="15"
                           class="regular-text">
                    <p class="description">
                        <?php _e('Redis database number (0-15). Mặc định: 0', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <?php _e('Kiểm tra kết nối', 'live-quiz'); ?>
                </th>
                <td>
                    <button type="button" class="button" id="test_phase2_connection"><?php _e('Test Connection', 'live-quiz'); ?></button>
                    <span id="connection_status" style="margin-left: 10px;"></span>
                    <p class="description">
                        <?php _e('Kiểm tra kết nối WebSocket và Redis.', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            </table>
            
            <script>
            jQuery(document).ready(function($) {
                // Configuration object (fallback if liveQuizAdmin not defined)
                const config = window.liveQuizAdmin || {
                    restUrl: '<?php echo rest_url('live-quiz/v1'); ?>',
                    nonce: '<?php echo wp_create_nonce('wp_rest'); ?>'
                };
                
                // Generate WebSocket Secret
                $('#generate_ws_secret').on('click', function() {
                    const secret = generateSecret();
                    $('#live_quiz_websocket_secret').val(secret);
                });
                
                // Generate JWT Secret
                $('#generate_jwt_secret').on('click', function() {
                    const secret = generateSecret();
                    $('#live_quiz_websocket_jwt_secret').val(secret);
                });
                
                // Test Phase 2 Connection
                $('#test_phase2_connection').on('click', function() {
                    const $btn = $(this);
                    const $status = $('#connection_status');
                    
                    $btn.prop('disabled', true);
                    $status.html('<span style="color: #999;">⏳ Đang kiểm tra...</span>');
                    
                    console.log('Testing Phase 2 connection...');
                    console.log('Config:', config);
                    
                    $.ajax({
                        url: config.restUrl + '/settings/test-phase2',
                        method: 'POST',
                        beforeSend: function(xhr) {
                            xhr.setRequestHeader('X-WP-Nonce', config.nonce);
                        },
                        data: {
                            websocket_url: $('#live_quiz_websocket_url').val(),
                            websocket_secret: $('#live_quiz_websocket_secret').val(),
                            redis_host: $('#live_quiz_redis_host').val(),
                            redis_port: $('#live_quiz_redis_port').val(),
                            redis_password: $('#live_quiz_redis_password').val(),
                            redis_database: $('#live_quiz_redis_database').val(),
                        },
                        success: function(response) {
                            console.log('Test response:', response);
                            if (response.success) {
                                let html = '<span style="color: #46b450;">✓</span> ';
                                let details = [];
                                
                                if (response.data.websocket) {
                                    details.push('WebSocket: OK (' + response.data.websocket_latency + 'ms)');
                                } else if (response.data.errors && response.data.errors.length > 0) {
                                    details.push('WebSocket: FAIL');
                                }
                                
                                if (response.data.redis) {
                                    details.push('Redis: OK');
                                } else if (response.data.errors && response.data.errors.length > 0) {
                                    details.push('Redis: FAIL');
                                }
                                
                                html += details.join(' | ');
                                $status.html(html);
                            } else {
                                let errorMsg = response.data && response.data.message 
                                    ? response.data.message 
                                    : 'Lỗi không xác định';
                                $status.html('<span style="color: #dc3232;">✗ ' + errorMsg + '</span>');
                            }
                        },
                        error: function(xhr, status, error) {
                            console.error('AJAX error:', status, error, xhr);
                            let errorMsg = 'Lỗi kết nối đến REST API';
                            if (xhr.responseJSON && xhr.responseJSON.message) {
                                errorMsg += ': ' + xhr.responseJSON.message;
                            } else if (xhr.status === 403) {
                                errorMsg = 'Không có quyền truy cập (403)';
                            } else if (xhr.status === 404) {
                                errorMsg = 'Không tìm thấy endpoint (404)';
                            }
                            $status.html('<span style="color: #dc3232;">✗ ' + errorMsg + '</span>');
                        },
                        complete: function() {
                            $btn.prop('disabled', false);
                        }
                    });
                });
                
                function generateSecret() {
                    const array = new Uint8Array(32);
                    crypto.getRandomValues(array);
                    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
                }
            });
            </script>
        </div>
        
        <!-- Tab: AI Prompts -->
        <div id="tab-prompts" class="live-quiz-tab-content">
            <h2><?php _e('AI Prompts cho từng loại câu hỏi', 'live-quiz'); ?></h2>
            <p class="description"><?php _e('Cấu hình prompts mà AI sẽ sử dụng để tạo câu hỏi. Có thể reset về mặc định.', 'live-quiz'); ?></p>
            
            <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="live_quiz_ai_prompt_single_choice"><?php _e('Single Choice Prompt', 'live-quiz'); ?></label>
                </th>
                <td>
                    <textarea name="live_quiz_ai_prompt_single_choice" 
                              id="live_quiz_ai_prompt_single_choice" 
                              rows="6" 
                              class="large-text code"><?php echo esc_textarea(get_option('live_quiz_ai_prompt_single_choice', Live_Quiz_AI_Generator::get_default_prompt('single_choice'))); ?></textarea>
                    <button type="button" class="button reset-prompt" data-type="single_choice"><?php _e('Reset mặc định', 'live-quiz'); ?></button>
                    <p class="description">
                        <?php _e('Prompt để tạo câu hỏi single choice (chọn 1 đáp án đúng).', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="live_quiz_ai_prompt_multiple_choice"><?php _e('Multiple Choice Prompt', 'live-quiz'); ?></label>
                </th>
                <td>
                    <textarea name="live_quiz_ai_prompt_multiple_choice" 
                              id="live_quiz_ai_prompt_multiple_choice" 
                              rows="6" 
                              class="large-text code"><?php echo esc_textarea(get_option('live_quiz_ai_prompt_multiple_choice', Live_Quiz_AI_Generator::get_default_prompt('multiple_choice'))); ?></textarea>
                    <button type="button" class="button reset-prompt" data-type="multiple_choice"><?php _e('Reset mặc định', 'live-quiz'); ?></button>
                    <p class="description">
                        <?php _e('Prompt để tạo câu hỏi multiple choice (chọn nhiều đáp án đúng).', 'live-quiz'); ?>
                    </p>
                </td>
            </tr>
            </table>
            
            <script>
            jQuery(document).ready(function($) {
                // Configuration object (fallback if liveQuizAdmin not defined)
                const config = window.liveQuizAdmin || {
                    restUrl: '<?php echo rest_url('live-quiz/v1'); ?>',
                    nonce: '<?php echo wp_create_nonce('wp_rest'); ?>'
                };
                
                // Reset prompts to default
                $('.reset-prompt').on('click', function() {
                    const type = $(this).data('type');
                    const $textarea = $('#live_quiz_ai_prompt_' + type);
                    
                    $.ajax({
                        url: config.restUrl + '/settings/default-prompt',
                        method: 'GET',
                        beforeSend: function(xhr) {
                            xhr.setRequestHeader('X-WP-Nonce', config.nonce);
                        },
                        data: { type: type },
                        success: function(response) {
                            if (response.success) {
                                $textarea.val(response.data.prompt);
                                alert('Đã reset về prompt mặc định!');
                            }
                        }
                    });
                });
            });
            </script>
        </div>
        
        <!-- Tab: Quiz Categories/Tags -->
        <div id="tab-categories" class="live-quiz-tab-content">
            <h2><?php _e('Quản lý Thẻ Quiz', 'live-quiz'); ?></h2>
            <p class="description">
                <?php _e('Thêm, xóa các thẻ để phân loại quiz. Ví dụ: IELTS, TOEIC, Giao tiếp, Từ vựng, Ngữ pháp, ...', 'live-quiz'); ?>
            </p>
            
            <div class="live-quiz-categories-manager">
                <div class="live-quiz-add-category">
                    <h3><?php _e('Thêm thẻ mới', 'live-quiz'); ?></h3>
                    <div class="live-quiz-add-category-form">
                        <input type="text" 
                               id="live-quiz-new-category" 
                               class="regular-text" 
                               placeholder="<?php esc_attr_e('Nhập tên thẻ mới (ví dụ: IELTS)', 'live-quiz'); ?>">
                        <button type="button" class="button button-primary" id="live-quiz-add-category-btn">
                            <?php _e('Thêm thẻ', 'live-quiz'); ?>
                        </button>
                    </div>
                    <div id="live-quiz-category-message" style="margin-top: 10px;"></div>
                </div>
                
                <div class="live-quiz-categories-list">
                    <h3><?php _e('Danh sách thẻ', 'live-quiz'); ?></h3>
                    <?php
                    $categories = get_option('live_quiz_categories', '');
                    $categories_array = !empty($categories) ? explode(',', $categories) : array();
                    $categories_array = array_map('trim', $categories_array);
                    $categories_array = array_filter($categories_array);
                    ?>
                    <div id="live-quiz-categories-container">
                        <?php if (empty($categories_array)): ?>
                            <p class="description"><?php _e('Chưa có thẻ nào. Hãy thêm thẻ đầu tiên!', 'live-quiz'); ?></p>
                        <?php else: ?>
                            <ul class="live-quiz-categories-ul">
                                <?php foreach ($categories_array as $category): ?>
                                    <li class="live-quiz-category-item" data-category="<?php echo esc_attr($category); ?>">
                                        <span class="category-name"><?php echo esc_html($category); ?></span>
                                        <button type="button" class="button button-small delete-category-btn" data-category="<?php echo esc_attr($category); ?>">
                                            <span class="dashicons dashicons-trash"></span> <?php _e('Xóa', 'live-quiz'); ?>
                                        </button>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
            <style>
            .live-quiz-categories-manager {
                max-width: 800px;
            }
            .live-quiz-add-category-form {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
            .live-quiz-add-category-form input {
                flex: 1;
            }
            .live-quiz-categories-ul {
                list-style: none;
                padding: 0;
                margin: 15px 0;
            }
            .live-quiz-category-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                margin-bottom: 8px;
                background: #f9f9f9;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            .live-quiz-category-item .category-name {
                font-weight: 500;
                font-size: 14px;
            }
            .live-quiz-category-item .delete-category-btn {
                color: #a00;
            }
            .live-quiz-category-item .delete-category-btn:hover {
                color: #dc3232;
            }
            #live-quiz-category-message {
                min-height: 20px;
            }
            #live-quiz-category-message .notice {
                margin: 0;
                padding: 8px 12px;
            }
            </style>
            
            <script>
            jQuery(document).ready(function($) {
                const nonce = '<?php echo wp_create_nonce('live_quiz_manage_categories'); ?>';
                
                // Add category
                $('#live-quiz-add-category-btn').on('click', function() {
                    const category = $('#live-quiz-new-category').val().trim();
                    const $message = $('#live-quiz-category-message');
                    
                    if (!category) {
                        $message.html('<div class="notice notice-error"><p><?php esc_js(_e('Vui lòng nhập tên thẻ', 'live-quiz')); ?></p></div>');
                        return;
                    }
                    
                    $.ajax({
                        url: ajaxurl,
                        method: 'POST',
                        data: {
                            action: 'live_quiz_add_category',
                            category: category,
                            _wpnonce: nonce
                        },
                        success: function(response) {
                            if (response.success) {
                                $message.html('<div class="notice notice-success"><p>' + response.data.message + '</p></div>');
                                $('#live-quiz-new-category').val('');
                                updateCategoriesList(response.data.categories);
                            } else {
                                $message.html('<div class="notice notice-error"><p>' + (response.data.message || '<?php esc_js(_e('Có lỗi xảy ra', 'live-quiz')); ?>') + '</p></div>');
                            }
                        },
                        error: function() {
                            $message.html('<div class="notice notice-error"><p><?php esc_js(_e('Có lỗi xảy ra khi thêm thẻ', 'live-quiz')); ?></p></div>');
                        }
                    });
                });
                
                // Delete category
                $(document).on('click', '.delete-category-btn', function() {
                    if (!confirm('<?php esc_js(_e('Bạn có chắc muốn xóa thẻ này?', 'live-quiz')); ?>')) {
                        return;
                    }
                    
                    const category = $(this).data('category');
                    const $item = $(this).closest('.live-quiz-category-item');
                    const $message = $('#live-quiz-category-message');
                    
                    $.ajax({
                        url: ajaxurl,
                        method: 'POST',
                        data: {
                            action: 'live_quiz_delete_category',
                            category: category,
                            _wpnonce: nonce
                        },
                        success: function(response) {
                            if (response.success) {
                                $message.html('<div class="notice notice-success"><p>' + response.data.message + '</p></div>');
                                updateCategoriesList(response.data.categories);
                            } else {
                                $message.html('<div class="notice notice-error"><p>' + (response.data.message || '<?php esc_js(_e('Có lỗi xảy ra', 'live-quiz')); ?>') + '</p></div>');
                            }
                        },
                        error: function() {
                            $message.html('<div class="notice notice-error"><p><?php esc_js(_e('Có lỗi xảy ra khi xóa thẻ', 'live-quiz')); ?></p></div>');
                        }
                    });
                });
                
                // Update categories list
                function updateCategoriesList(categories) {
                    const $container = $('#live-quiz-categories-container');
                    
                    if (!categories || categories.length === 0) {
                        $container.html('<p class="description"><?php esc_js(_e('Chưa có thẻ nào. Hãy thêm thẻ đầu tiên!', 'live-quiz')); ?></p>');
                        return;
                    }
                    
                    let html = '<ul class="live-quiz-categories-ul">';
                    categories.forEach(function(category) {
                        html += '<li class="live-quiz-category-item" data-category="' + escapeHtml(category) + '">';
                        html += '<span class="category-name">' + escapeHtml(category) + '</span>';
                        html += '<button type="button" class="button button-small delete-category-btn" data-category="' + escapeHtml(category) + '">';
                        html += '<span class="dashicons dashicons-trash"></span> <?php esc_js(_e('Xóa', 'live-quiz')); ?>';
                        html += '</button>';
                        html += '</li>';
                    });
                    html += '</ul>';
                    
                    $container.html(html);
                }
                
                function escapeHtml(text) {
                    const map = {
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#039;'
                    };
                    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
                }
                
                // Allow Enter key to add category
                $('#live-quiz-new-category').on('keypress', function(e) {
                    if (e.which === 13) {
                        e.preventDefault();
                        $('#live-quiz-add-category-btn').click();
                    }
                });
            });
            </script>
        </div>
        
        <!-- Tab: Info -->
        <div id="tab-info" class="live-quiz-tab-content">
            <h2><?php _e('Thông tin công thức tính điểm', 'live-quiz'); ?></h2>
            <div class="card">
                <p><strong><?php _e('Công thức:', 'live-quiz'); ?></strong></p>
                <pre>score = base_points × (α + (1 - α) × (T_remain / T_total))</pre>
                
                <p><strong><?php _e('Giải thích:', 'live-quiz'); ?></strong></p>
                <ul>
                    <li><code>base_points</code>: <?php _e('Điểm cơ bản của câu hỏi', 'live-quiz'); ?></li>
                    <li><code>α (alpha)</code>: <?php _e('Hệ số điểm tối thiểu', 'live-quiz'); ?></li>
                    <li><code>T_remain</code>: <?php _e('Thời gian còn lại khi trả lời', 'live-quiz'); ?></li>
                    <li><code>T_total</code>: <?php _e('Tổng thời gian cho câu hỏi', 'live-quiz'); ?></li>
                </ul>
                
                <p><strong><?php _e('Ví dụ:', 'live-quiz'); ?></strong></p>
                <ul>
                    <li><?php _e('base_points = 1000, α = 0.3, T_total = 20s', 'live-quiz'); ?></li>
                    <li><?php _e('Trả lời đúng sau 2s (T_remain = 18s): score = 1000 × (0.3 + 0.7 × 18/20) = 930 điểm', 'live-quiz'); ?></li>
                    <li><?php _e('Trả lời đúng sau 18s (T_remain = 2s): score = 1000 × (0.3 + 0.7 × 2/20) = 370 điểm', 'live-quiz'); ?></li>
                    <li><?php _e('Trả lời sai: 0 điểm', 'live-quiz'); ?></li>
                </ul>
            </div>
            
            <h2><?php _e('Shortcodes', 'live-quiz'); ?></h2>
            <div class="card">
                <p><?php _e('Danh sách tất cả các shortcodes có sẵn trong plugin:', 'live-quiz'); ?></p>
                
                <h3><?php _e('1. [live_quiz_player] hoặc [live_quiz]', 'live-quiz'); ?></h3>
                <p><strong><?php _e('Mục đích:', 'live-quiz'); ?></strong> <?php _e('Hiển thị giao diện cho người chơi tham gia quiz. Người chơi nhập tên và mã phòng (PIN) để tham gia.', 'live-quiz'); ?></p>
                <p><strong><?php _e('Yêu cầu:', 'live-quiz'); ?></strong> <?php _e('Người dùng phải đăng nhập.', 'live-quiz'); ?></p>
                <p><strong><?php _e('Tham số:', 'live-quiz'); ?></strong></p>
                <ul>
                    <li><code>title</code>: <?php _e('Tiêu đề hiển thị (mặc định: "Tham gia Live Quiz")', 'live-quiz'); ?></li>
                    <li><code>show_title</code>: <?php _e('Hiển thị tiêu đề (yes/no, mặc định: yes)', 'live-quiz'); ?></li>
                </ul>
                <p><strong><?php _e('Ví dụ:', 'live-quiz'); ?></strong></p>
                <pre><code>[live_quiz_player]
[live_quiz_player title="Tham gia Quiz" show_title="yes"]
[live_quiz]</code></pre>
                
                <h3><?php _e('2. [live_quiz_host]', 'live-quiz'); ?></h3>
                <p><strong><?php _e('Mục đích:', 'live-quiz'); ?></strong> <?php _e('Hiển thị giao diện cho người tạo/quản lý phòng quiz. Cho phép tạo phòng mới, quản lý người chơi, điều khiển quiz (bắt đầu, chuyển câu hỏi, kết thúc).', 'live-quiz'); ?></p>
                <p><strong><?php _e('Yêu cầu:', 'live-quiz'); ?></strong> <?php _e('Người dùng phải đăng nhập.', 'live-quiz'); ?></p>
                <p><strong><?php _e('Tham số:', 'live-quiz'); ?></strong></p>
                <ul>
                    <li><code>session_id</code>: <?php _e('ID của phiên quiz cụ thể (tùy chọn). Nếu không có, sẽ tự động mở phiên đang hoạt động hoặc hiển thị form tạo phòng mới.', 'live-quiz'); ?></li>
                </ul>
                <p><strong><?php _e('Ví dụ:', 'live-quiz'); ?></strong></p>
                <pre><code>[live_quiz_host]
[live_quiz_host session_id="123"]</code></pre>
                
                <h3><?php _e('3. [live_quiz_sessions]', 'live-quiz'); ?></h3>
                <p><strong><?php _e('Mục đích:', 'live-quiz'); ?></strong> <?php _e('Hiển thị danh sách các phiên quiz đã tạo. Cho phép xem, quản lý và truy cập các phiên quiz.', 'live-quiz'); ?></p>
                <p><strong><?php _e('Yêu cầu:', 'live-quiz'); ?></strong> <?php _e('Người dùng phải có quyền edit_posts (tác giả trở lên).', 'live-quiz'); ?></p>
                <p><strong><?php _e('Tham số:', 'live-quiz'); ?></strong></p>
                <ul>
                    <li><code>per_page</code>: <?php _e('Số lượng phiên hiển thị mỗi trang (mặc định: 10)', 'live-quiz'); ?></li>
                </ul>
                <p><strong><?php _e('Ví dụ:', 'live-quiz'); ?></strong></p>
                <pre><code>[live_quiz_sessions]
[live_quiz_sessions per_page="20"]</code></pre>
                
                <h3><?php _e('4. [live_quiz_browse]', 'live-quiz'); ?></h3>
                <p><strong><?php _e('Mục đích:', 'live-quiz'); ?></strong> <?php _e('Hiển thị danh sách các bộ câu hỏi (quiz) có sẵn. Cho phép duyệt, tìm kiếm và lọc các quiz. Người dùng có thể xem chi tiết quiz trước khi tạo phiên.', 'live-quiz'); ?></p>
                <p><strong><?php _e('Yêu cầu:', 'live-quiz'); ?></strong> <?php _e('Không yêu cầu đăng nhập (có thể xem công khai).', 'live-quiz'); ?></p>
                <p><strong><?php _e('Tham số:', 'live-quiz'); ?></strong></p>
                <ul>
                    <li><code>per_page</code>: <?php _e('Số lượng quiz hiển thị mỗi trang (mặc định: 12)', 'live-quiz'); ?></li>
                    <li><code>show_search</code>: <?php _e('Hiển thị ô tìm kiếm (yes/no, mặc định: yes)', 'live-quiz'); ?></li>
                    <li><code>show_filters</code>: <?php _e('Hiển thị bộ lọc (yes/no, mặc định: yes)', 'live-quiz'); ?></li>
                </ul>
                <p><strong><?php _e('Ví dụ:', 'live-quiz'); ?></strong></p>
                <pre><code>[live_quiz_browse]
[live_quiz_browse per_page="24" show_search="yes" show_filters="yes"]</code></pre>
            </div>
        </div>
        
        <?php submit_button(__('Lưu cài đặt', 'live-quiz')); ?>
    </form>
</div>

<script>
jQuery(document).ready(function($) {
    // Tab switching functionality
    $('.live-quiz-settings-tabs .nav-tab').on('click', function(e) {
        e.preventDefault();
        
        const tabId = $(this).data('tab');
        
        // Remove active class from all tabs and content
        $('.live-quiz-settings-tabs .nav-tab').removeClass('nav-tab-active');
        $('.live-quiz-tab-content').removeClass('active');
        
        // Add active class to clicked tab and corresponding content
        $(this).addClass('nav-tab-active');
        $('#tab-' + tabId).addClass('active');
        
        // Save active tab to localStorage
        localStorage.setItem('live_quiz_active_tab', tabId);
    });
    
    // Restore active tab from localStorage
    const savedTab = localStorage.getItem('live_quiz_active_tab');
    if (savedTab) {
        $('.live-quiz-settings-tabs .nav-tab').removeClass('nav-tab-active');
        $('.live-quiz-tab-content').removeClass('active');
        $('.live-quiz-settings-tabs .nav-tab[data-tab="' + savedTab + '"]').addClass('nav-tab-active');
        $('#tab-' + savedTab).addClass('active');
    }
});
</script>
