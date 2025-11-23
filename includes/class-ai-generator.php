<?php
/**
 * AI Question Generator using Google Gemini API
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_AI_Generator {
    
    /**
     * Question types
     */
    const TYPES = array(
        'single_choice' => 'Single Choice',
        'multiple_choice' => 'Multiple Choice',
        'free_choice' => 'Free Choice',
        'sorting_choice' => 'Sorting Choice',
        'matrix_sorting' => 'Matrix Sorting',
        'fill_blank' => 'Fill in the Blank',
        'assessment' => 'Assessment',
        'essay' => 'Essay/Open Answer',
    );
    
    /**
     * Initialize
     */
    public static function init() {
        // Hook to REST API
        add_action('rest_api_init', array(__CLASS__, 'register_endpoints'));
    }
    
    /**
     * Register REST API endpoints
     */
    public static function register_endpoints() {
        register_rest_route('live-quiz/v1', '/ai/generate', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'generate_questions'),
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ));
        
        register_rest_route('live-quiz/v1', '/settings/default-prompt', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_default_prompt_endpoint'),
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ));
        
        register_rest_route('live-quiz/v1', '/ai/models', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_available_models'),
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ));
    }
    
    /**
     * Get default prompt endpoint
     */
    public static function get_default_prompt_endpoint($request) {
        $type = $request->get_param('type');
        $prompt = self::get_default_prompt($type);
        
        return rest_ensure_response(array(
            'success' => true,
            'data' => array('prompt' => $prompt),
        ));
    }
    
    /**
     * Get available models from Gemini API
     */
    public static function get_available_models($request) {
        // Get API key
        $api_key = get_option('live_quiz_gemini_api_key', '');
        if (empty($api_key)) {
            return new WP_Error('no_api_key', 'Gemini API key chưa được cấu hình', array('status' => 400));
        }
        
        // Check cache first (cache for 1 hour)
        $cache_key = 'live_quiz_gemini_models';
        $cached_models = get_transient($cache_key);
        
        if ($cached_models !== false) {
            return rest_ensure_response(array(
                'success' => true,
                'data' => $cached_models,
                'cached' => true,
            ));
        }
        
        // Fetch from Gemini API
        $url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' . $api_key;
        
        $response = wp_remote_get($url, array(
            'timeout' => 15,
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
        ));
        
        if (is_wp_error($response)) {
            return new WP_Error('api_error', 'Không thể kết nối đến Gemini API: ' . $response->get_error_message(), array('status' => 500));
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!isset($data['models']) || !is_array($data['models'])) {
            return new WP_Error('invalid_response', 'Phản hồi không hợp lệ từ Gemini API', array('status' => 500));
        }
        
        // Filter only models that support generateContent
        $models = array();
        foreach ($data['models'] as $model) {
            // Only get models that support generateContent method
            if (isset($model['supportedGenerationMethods']) && 
                is_array($model['supportedGenerationMethods']) && 
                in_array('generateContent', $model['supportedGenerationMethods'])) {
                
                $model_name = isset($model['name']) ? str_replace('models/', '', $model['name']) : '';
                $display_name = isset($model['displayName']) ? $model['displayName'] : $model_name;
                $description = isset($model['description']) ? $model['description'] : '';
                
                // Skip if not a valid model name
                if (empty($model_name)) {
                    continue;
                }
                
                $models[] = array(
                    'name' => $model_name,
                    'displayName' => $display_name,
                    'description' => $description,
                );
            }
        }
        
        // Sort models by name
        usort($models, function($a, $b) {
            return strcmp($a['name'], $b['name']);
        });
        
        // Cache for 1 hour
        set_transient($cache_key, $models, HOUR_IN_SECONDS);
        
        return rest_ensure_response(array(
            'success' => true,
            'data' => $models,
            'cached' => false,
        ));
    }
    
    /**
     * Generate questions using AI
     */
    public static function generate_questions($request) {
        $type = $request->get_param('type');
        $content = $request->get_param('content');
        $count = (int) $request->get_param('count') ?: 1;
        $choices_count = (int) $request->get_param('choices_count') ?: 4;
        
        // Validate count - max 50 questions
        $count = max(1, min(50, $count));
        
        // Validate choices_count
        $choices_count = max(2, min(6, $choices_count));
        
        if (empty($type) || empty($content)) {
            return new WP_Error('missing_params', 'Type and content are required', array('status' => 400));
        }
        
        // Get API key
        $api_key = get_option('live_quiz_gemini_api_key', '');
        if (empty($api_key)) {
            return new WP_Error('no_api_key', 'Gemini API key chưa được cấu hình', array('status' => 400));
        }
        
        // Get prompt for this type
        $prompt = self::get_prompt($type, $content, $count, $choices_count);
        
        // Call Gemini API
        $result = self::call_gemini_api($api_key, $prompt);
        
        if (is_wp_error($result)) {
            return $result;
        }
        
        // Parse and format questions - limit to requested count
        $questions = self::parse_ai_response($result, $type, $count);
        
        if (empty($questions)) {
            return new WP_Error('parse_error', 'Không thể parse kết quả từ AI. Response: ' . substr($result, 0, 200) . '...', array('status' => 500));
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'data' => array(
                'questions' => $questions,
                'count' => count($questions),
            ),
        ));
    }
    
    /**
     * Call Gemini API
     */
    private static function call_gemini_api($api_key, $prompt) {
        // Get model from settings, default to gemini-1.5-flash
        $model = get_option('live_quiz_gemini_model', 'gemini-1.5-flash');
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . $api_key;
        
        // Always use max tokens (65536 - maximum allowed by Gemini API)
        $max_tokens = 65536;
        
        $body = array(
            'contents' => array(
                array(
                    'parts' => array(
                        array('text' => $prompt)
                    )
                )
            ),
            'generationConfig' => array(
                'temperature' => 0.7,
                'maxOutputTokens' => (int)$max_tokens,
            ),
        );
        
        // Always use 300 seconds timeout
        $timeout = 300;
        
        $response = wp_remote_post($url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode($body),
            'timeout' => (int)$timeout,
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code !== 200) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            $error_message = isset($body['error']['message']) ? $body['error']['message'] : 'API request failed';
            return new WP_Error('api_error', $error_message, array('status' => $status_code));
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        // Check for finish reason
        if (isset($body['candidates'][0]['finishReason'])) {
            $finishReason = $body['candidates'][0]['finishReason'];
            if ($finishReason === 'MAX_TOKENS') {
                error_log('Gemini API: Response truncated due to MAX_TOKENS');
                return new WP_Error('max_tokens', 'Response quá dài, vượt quá giới hạn token. Thử giảm số lượng câu hỏi hoặc nội dung ngắn hơn.', array('status' => 500));
            }
            if ($finishReason === 'SAFETY') {
                return new WP_Error('safety', 'Nội dung bị từ chối bởi bộ lọc an toàn của Gemini.', array('status' => 500));
            }
        }
        
        // Get text from response
        if (isset($body['candidates'][0]['content']['parts'][0]['text'])) {
            return $body['candidates'][0]['content']['parts'][0]['text'];
        }
        
        // Log the actual structure we got for debugging
        error_log('Gemini API Response structure: ' . print_r($body, true));
        
        return new WP_Error('invalid_response', 'Invalid API response format. Check debug.log for details.', array('status' => 500));
    }
    
    /**
     * Get prompt for question type
     */
    private static function get_prompt($type, $content, $count = 1, $choices_count = 4) {
        $custom_prompt = get_option('live_quiz_ai_prompt_' . $type, '');
        
        if (empty($custom_prompt)) {
            $custom_prompt = self::get_default_prompt($type);
        }
        
        // Replace placeholders
        $prompt = str_replace(
            array('{content}', '{count}', '{choices_count}'),
            array($content, $count, $choices_count),
            $custom_prompt
        );
        
        return $prompt;
    }
    
    /**
     * Get default prompts
     */
    public static function get_default_prompt($type) {
        $prompts = array(
            'single_choice' => 'Bạn là một chuyên gia tạo câu hỏi trắc nghiệm. Hãy tạo {count} câu hỏi trắc nghiệm (single choice - chỉ có 1 đáp án đúng) dựa trên nội dung sau:

{content}

YÊU CẦU:
- Mỗi câu hỏi phải có {choices_count} đáp án
- Chỉ có 1 đáp án đúng
- Các đáp án sai phải hợp lý và có thể gây nhầm lẫn
- Câu hỏi phải rõ ràng, ngắn gọn

ĐỊNH DẠNG TRẢ VỀ (JSON):
{
  "questions": [
    {
      "text": "Câu hỏi ở đây?",
      "choices": [
        {"text": "Đáp án A", "is_correct": true},
        {"text": "Đáp án B", "is_correct": false},
        {"text": "Đáp án C", "is_correct": false},
        {"text": "Đáp án D", "is_correct": false}
      ]
    }
  ]
}

Chú ý: Số lượng đáp án phải chính xác là {choices_count} đáp án.
Chỉ trả về JSON, không thêm text nào khác.',

            'multiple_choice' => 'Bạn là một chuyên gia tạo câu hỏi trắc nghiệm. Hãy tạo {count} câu hỏi trắc nghiệm (multiple choice - có thể có nhiều đáp án đúng) dựa trên nội dung sau:

{content}

YÊU CẦU:
- Mỗi câu hỏi phải có {choices_count} đáp án
- Có thể có 2-3 đáp án đúng
- Các đáp án sai phải hợp lý
- Câu hỏi phải rõ ràng

ĐỊNH DẠNG TRẢ VỀ (JSON):
{
  "questions": [
    {
      "text": "Chọn TẤT CẢ các đáp án đúng:",
      "choices": [
        {"text": "Đáp án A", "is_correct": true},
        {"text": "Đáp án B", "is_correct": true},
        {"text": "Đáp án C", "is_correct": false},
        {"text": "Đáp án D", "is_correct": false}
      ]
    }
  ]
}

Chú ý: Số lượng đáp án phải chính xác là {choices_count} đáp án.
Chỉ trả về JSON, không thêm text nào khác.',

            'free_choice' => 'Default prompt for free choice questions...',
            'sorting_choice' => 'Default prompt for sorting choice questions...',
            'matrix_sorting' => 'Default prompt for matrix sorting questions...',
            'fill_blank' => 'Default prompt for fill in the blank questions...',
            'assessment' => 'Default prompt for assessment questions...',
            'essay' => 'Default prompt for essay questions...',
        );
        
        return isset($prompts[$type]) ? $prompts[$type] : '';
    }
    
    /**
     * Parse AI response
     */
    private static function parse_ai_response($response, $type, $max_count = null) {
        // Try to extract JSON from response
        $json_str = $response;
        
        // Remove markdown code blocks if present
        $json_str = preg_replace('/```json\s*(.*?)\s*```/s', '$1', $json_str);
        $json_str = preg_replace('/```\s*(.*?)\s*```/s', '$1', $json_str);
        
        // Trim whitespace
        $json_str = trim($json_str);
        
        // Try to fix truncated JSON by adding missing closing braces
        // Count opening and closing braces
        $open_braces = substr_count($json_str, '{');
        $close_braces = substr_count($json_str, '}');
        $open_brackets = substr_count($json_str, '[');
        $close_brackets = substr_count($json_str, ']');
        
        // Add missing closing brackets and braces
        if ($open_brackets > $close_brackets) {
            $json_str .= str_repeat(']', $open_brackets - $close_brackets);
        }
        if ($open_braces > $close_braces) {
            $json_str .= str_repeat('}', $open_braces - $close_braces);
        }
        
        // Try to decode
        $data = json_decode($json_str, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('JSON parse error: ' . json_last_error_msg());
            error_log('Response length: ' . strlen($response));
            error_log('First 500 chars: ' . substr($response, 0, 500));
            error_log('Last 500 chars: ' . substr($response, -500));
            return array();
        }
        
        if (!isset($data['questions']) || !is_array($data['questions'])) {
            return array();
        }
        
        // Validate and format questions
        $questions = array();
        $question_count = 0;
        
        foreach ($data['questions'] as $q) {
            // Stop if we've reached the maximum count requested
            if ($max_count !== null && $question_count >= $max_count) {
                error_log("AI Generator: Limiting questions to requested count: {$max_count}");
                break;
            }
            
            if (empty($q['text']) || empty($q['choices'])) {
                continue;
            }
            
            $question = array(
                'type' => $type,
                'text' => sanitize_textarea_field($q['text']),
                'choices' => array(),
                'time_limit' => isset($q['time_limit']) ? max(5, min(120, (int)$q['time_limit'])) : 20,
                'base_points' => isset($q['base_points']) ? max(100, min(10000, (int)$q['base_points'])) : 1000,
            );
            
            foreach ($q['choices'] as $choice) {
                if (empty($choice['text'])) continue;
                
                $question['choices'][] = array(
                    'text' => sanitize_text_field($choice['text']),
                    'is_correct' => !empty($choice['is_correct']),
                );
            }
            
            if (count($question['choices']) >= 2) {
                $questions[] = $question;
                $question_count++;
            }
        }
        
        return $questions;
    }
}

Live_Quiz_AI_Generator::init();
