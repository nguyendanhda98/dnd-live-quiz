<?php
/**
 * Test Gutenberg Blocks Registration
 * 
 * Run this file via: php test-blocks.php
 * Or access via browser: /wp-content/plugins/dnd-live-quiz/test-blocks.php
 */

// Load WordPress
require_once('../../../wp-load.php');

if (!defined('ABSPATH')) {
    die('WordPress not loaded');
}

echo "<h1>🧪 Live Quiz Blocks Test</h1>\n\n";

// Check if blocks are registered
$block_types = WP_Block_Type_Registry::get_instance()->get_all_registered();

echo "<h2>✅ Kiểm tra Block Registration</h2>\n";

$expected_blocks = [
    'live-quiz/create-room' => 'Live Quiz - Tạo phòng',
    'live-quiz/join-room' => 'Live Quiz - Tham gia',
    'live-quiz/quiz-list' => 'Live Quiz - Danh sách'
];

$all_passed = true;

foreach ($expected_blocks as $block_name => $block_title) {
    if (isset($block_types[$block_name])) {
        echo "✅ <strong>{$block_name}</strong> - Đã đăng ký thành công\n";
        $block = $block_types[$block_name];
        
        // Check attributes
        $attributes = $block->attributes;
        echo "   📋 Attributes: " . count($attributes) . " attributes\n";
        foreach ($attributes as $attr_name => $attr_config) {
            echo "      • {$attr_name} ({$attr_config['type']})\n";
        }
        
        // Check render callback
        if (is_callable($block->render_callback)) {
            echo "   ✅ Render callback: OK\n";
        } else {
            echo "   ❌ Render callback: MISSING\n";
            $all_passed = false;
        }
        
        echo "\n";
    } else {
        echo "❌ <strong>{$block_name}</strong> - CHƯA ĐĂNG KÝ\n\n";
        $all_passed = false;
    }
}

// Check shortcodes still exist
echo "<h2>✅ Kiểm tra Shortcode Compatibility</h2>\n";

$expected_shortcodes = [
    'live_quiz' => 'Live Quiz Player',
    'live_quiz_create_room' => 'Create Room',
    'live_quiz_list' => 'Quiz List'
];

global $shortcode_tags;

foreach ($expected_shortcodes as $shortcode => $description) {
    if (isset($shortcode_tags[$shortcode])) {
        echo "✅ Shortcode <code>[{$shortcode}]</code> - Còn hoạt động\n";
    } else {
        echo "❌ Shortcode <code>[{$shortcode}]</code> - KHÔNG TỒN TẠI\n";
        $all_passed = false;
    }
}

echo "\n";

// Check if JavaScript file exists
echo "<h2>✅ Kiểm tra Assets</h2>\n";

$js_file = LIVE_QUIZ_PLUGIN_DIR . 'assets/js/blocks.js';
$css_file = LIVE_QUIZ_PLUGIN_DIR . 'assets/css/blocks-editor.css';

if (file_exists($js_file)) {
    $size = filesize($js_file);
    echo "✅ blocks.js - Tồn tại (" . number_format($size) . " bytes)\n";
} else {
    echo "❌ blocks.js - KHÔNG TỒN TẠI\n";
    $all_passed = false;
}

if (file_exists($css_file)) {
    $size = filesize($css_file);
    echo "✅ blocks-editor.css - Tồn tại (" . number_format($size) . " bytes)\n";
} else {
    echo "⚠️ blocks-editor.css - Không tồn tại (optional)\n";
}

echo "\n";

// Check class files
echo "<h2>✅ Kiểm tra Class Files</h2>\n";

if (class_exists('Live_Quiz_Blocks')) {
    echo "✅ Class Live_Quiz_Blocks - Đã load\n";
    
    $methods = get_class_methods('Live_Quiz_Blocks');
    echo "   📋 Methods: " . count($methods) . " methods\n";
    
    $expected_methods = [
        'init',
        'register_blocks',
        'enqueue_block_editor_assets',
        'render_create_room_block',
        'render_join_room_block',
        'render_quiz_list_block'
    ];
    
    foreach ($expected_methods as $method) {
        if (in_array($method, $methods)) {
            echo "      ✅ {$method}()\n";
        } else {
            echo "      ❌ {$method}() - MISSING\n";
            $all_passed = false;
        }
    }
} else {
    echo "❌ Class Live_Quiz_Blocks - CHƯA LOAD\n";
    $all_passed = false;
}

echo "\n";

// Final result
echo "<h2>🎯 Kết quả</h2>\n";

if ($all_passed) {
    echo "✅ <strong style='color: green; font-size: 18px;'>TẤT CẢ TESTS PASSED!</strong>\n\n";
    echo "🎉 Gutenberg Blocks đã sẵn sàng sử dụng!\n\n";
    echo "<h3>🚀 Bước tiếp theo:</h3>\n";
    echo "1. Vào WordPress Admin > Pages/Posts\n";
    echo "2. Thêm block mới bằng cách nhấn nút '+'\n";
    echo "3. Tìm kiếm 'Live Quiz'\n";
    echo "4. Chọn block muốn sử dụng\n";
} else {
    echo "❌ <strong style='color: red; font-size: 18px;'>MỘT SỐ TESTS FAILED!</strong>\n\n";
    echo "Vui lòng kiểm tra lại các lỗi ở trên.\n";
}

echo "\n";
echo "<hr>\n";
echo "<p><small>Test completed at " . date('Y-m-d H:i:s') . "</small></p>\n";
