<?php
/**
 * Fix Escaped Prompts
 * 
 * Script để sửa các prompts đã bị escape do sử dụng wp_kses_post()
 * Chạy file này một lần để loại bỏ các backslashes thừa
 * 
 * Cách sử dụng:
 * 1. Truy cập trực tiếp file này từ trình duyệt
 * 2. Hoặc chạy: wp eval-file fix-escaped-prompts.php
 * 
 * @package LiveQuiz
 */

// Load WordPress
require_once('../../../wp-load.php');

// Check admin permission
if (!current_user_can('manage_options')) {
    die('Bạn không có quyền thực hiện thao tác này!');
}

$prompt_fields = array(
    'live_quiz_ai_prompt_single_choice',
    'live_quiz_ai_prompt_multiple_choice',
    'live_quiz_ai_prompt_free_choice',
    'live_quiz_ai_prompt_sorting_choice',
    'live_quiz_ai_prompt_matrix_sorting',
    'live_quiz_ai_prompt_fill_blank',
    'live_quiz_ai_prompt_assessment',
    'live_quiz_ai_prompt_essay',
);

echo "<h1>Fixing Escaped Prompts</h1>";
echo "<pre>";

foreach ($prompt_fields as $field) {
    $value = get_option($field, '');
    
    if (!empty($value)) {
        // Check if value has escaped quotes
        if (strpos($value, '\\"') !== false || strpos($value, "\\'") !== false) {
            // Remove the escaping by using stripslashes
            $fixed_value = stripslashes($value);
            
            // Update the option
            update_option($field, $fixed_value);
            
            echo "✓ Fixed: $field\n";
            echo "  Before: " . substr($value, 0, 100) . "...\n";
            echo "  After:  " . substr($fixed_value, 0, 100) . "...\n\n";
        } else {
            echo "○ No fix needed: $field\n\n";
        }
    } else {
        echo "- Empty or not set: $field\n\n";
    }
}

echo "</pre>";
echo "<h2>Done! Vui lòng xóa file này sau khi chạy xong.</h2>";
