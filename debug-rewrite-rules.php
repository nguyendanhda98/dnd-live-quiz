<?php
/**
 * Debug và xóa rewrite rules cũ
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

echo "=== Kiểm tra Rewrite Rules ===\n\n";

// Get current rewrite rules
global $wp_rewrite;
$rules = get_option('rewrite_rules');

echo "Các rules liên quan đến live-quiz:\n";
$found_old_rules = false;

if ($rules) {
    foreach ($rules as $pattern => $replacement) {
        if (strpos($pattern, 'host') !== false || strpos($pattern, 'play') !== false) {
            if (strpos($replacement, 'live_quiz_page') !== false) {
                echo "  ❌ RULE CŨ: $pattern => $replacement\n";
                $found_old_rules = true;
            }
        }
    }
}

if ($found_old_rules) {
    echo "\n⚠️  Tìm thấy rules cũ! Đang xóa...\n";
    
    // Delete old rules
    delete_option('rewrite_rules');
    
    // Force WordPress to regenerate
    flush_rewrite_rules(true);
    
    echo "✅ Đã xóa và regenerate rewrite rules!\n";
    echo "\n";
    
    // Check again
    $rules = get_option('rewrite_rules');
    echo "Kiểm tra lại:\n";
    $still_has_old = false;
    if ($rules) {
        foreach ($rules as $pattern => $replacement) {
            if (strpos($pattern, 'host') !== false || strpos($pattern, 'play') !== false) {
                if (strpos($replacement, 'live_quiz_page') !== false) {
                    echo "  ❌ VẪN CÒN: $pattern => $replacement\n";
                    $still_has_old = true;
                }
            }
        }
    }
    
    if (!$still_has_old) {
        echo "✅ Sạch rồi! Không còn rules cũ.\n";
    }
} else {
    echo "✅ Không tìm thấy rules cũ của live-quiz.\n";
}

echo "\n=== Kiểm tra trang /host ===\n";

// Check if page exists
$host_page = get_page_by_path('host');
if ($host_page) {
    echo "✅ Trang 'host' tồn tại:\n";
    echo "   ID: " . $host_page->ID . "\n";
    echo "   Title: " . $host_page->post_title . "\n";
    echo "   Status: " . $host_page->post_status . "\n";
    echo "   URL: " . get_permalink($host_page->ID) . "\n";
} else {
    echo "❌ Không tìm thấy trang 'host'!\n";
}

echo "\n=== Hành động ===\n";
echo "1. Vào WordPress Admin > Settings > Permalinks\n";
echo "2. Nhấn 'Save Changes' (không cần thay đổi gì)\n";
echo "3. Thử truy cập lại /host\n";
