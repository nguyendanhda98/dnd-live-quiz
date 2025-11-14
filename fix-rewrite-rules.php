<?php
/**
 * Debug và xóa rewrite rules cũ
 * Truy cập qua browser: http://yourdomain.com/wp-content/plugins/dnd-live-quiz/fix-rewrite-rules.php
 */

// Basic security check
if (!isset($_GET['action']) || $_GET['action'] !== 'fix_now') {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Fix Rewrite Rules - Live Quiz</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #333; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #0073aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 3px; margin-top: 20px; }
            .button:hover { background: #005177; }
            .info { background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>🔧 Fix Rewrite Rules - DND Live Quiz</h1>
        
        <div class="warning">
            <strong>⚠️ Vấn đề:</strong> Trang /host bị redirect về trang chủ vì còn rewrite rules cũ trong database.
        </div>
        
        <div class="info">
            <strong>📝 Giải pháp:</strong> Tool này sẽ:
            <ol>
                <li>Xóa toàn bộ rewrite rules cũ</li>
                <li>Regenerate rules mới từ WordPress và các plugins</li>
                <li>Đảm bảo trang /host của bạn hoạt động bình thường</li>
            </ol>
        </div>
        
        <a href="?action=fix_now" class="button">🚀 Fix Ngay</a>
        
        <hr style="margin: 40px 0;">
        
        <h3>Hoặc làm thủ công:</h3>
        <ol>
            <li>Vào WordPress Admin</li>
            <li>Vào <strong>Settings > Permalinks</strong></li>
            <li>Nhấn nút <strong>"Save Changes"</strong> (không cần thay đổi gì)</li>
            <li>Thử truy cập lại /host</li>
        </ol>
    </body>
    </html>
    <?php
    exit;
}

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

// Check permission
if (!current_user_can('manage_options')) {
    wp_die('Bạn không có quyền thực hiện hành động này.');
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Fixing Rewrite Rules...</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .step { background: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; }
        .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
        .error { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        .button { display: inline-block; background: #0073aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 3px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>🔧 Đang Fix Rewrite Rules...</h1>
    
    <?php
    // Step 1: Check for old rules
    echo '<div class="step">';
    echo '<strong>Bước 1:</strong> Kiểm tra rewrite rules cũ...<br>';
    
    $rules = get_option('rewrite_rules');
    $found_old_rules = false;
    $old_rules_list = array();
    
    if ($rules) {
        foreach ($rules as $pattern => $replacement) {
            if (strpos($replacement, 'live_quiz_page') !== false) {
                $found_old_rules = true;
                $old_rules_list[] = $pattern;
            }
        }
    }
    
    if ($found_old_rules) {
        echo '❌ Tìm thấy ' . count($old_rules_list) . ' rules cũ:<br>';
        foreach ($old_rules_list as $rule) {
            echo '&nbsp;&nbsp;&nbsp;- <code>' . esc_html($rule) . '</code><br>';
        }
    } else {
        echo '✅ Không tìm thấy rules cũ.';
    }
    echo '</div>';
    
    // Step 2: Delete and regenerate
    echo '<div class="step">';
    echo '<strong>Bước 2:</strong> Xóa và regenerate rewrite rules...<br>';
    
    delete_option('rewrite_rules');
    flush_rewrite_rules(true);
    
    echo '✅ Đã xóa và regenerate!';
    echo '</div>';
    
    // Step 3: Verify
    echo '<div class="step">';
    echo '<strong>Bước 3:</strong> Kiểm tra lại...<br>';
    
    $rules = get_option('rewrite_rules');
    $still_has_old = false;
    
    if ($rules) {
        foreach ($rules as $pattern => $replacement) {
            if (strpos($replacement, 'live_quiz_page') !== false) {
                $still_has_old = true;
                break;
            }
        }
    }
    
    if ($still_has_old) {
        echo '❌ Vẫn còn rules cũ. Có thể cần deactivate và activate lại plugin.';
    } else {
        echo '✅ Sạch! Không còn rules cũ.';
    }
    echo '</div>';
    
    // Step 4: Check page
    echo '<div class="step">';
    echo '<strong>Bước 4:</strong> Kiểm tra trang /host...<br>';
    
    $host_page = get_page_by_path('host');
    if ($host_page && $host_page->post_status === 'publish') {
        $url = get_permalink($host_page->ID);
        echo '✅ Trang "host" tồn tại và đã publish<br>';
        echo '&nbsp;&nbsp;&nbsp;URL: <a href="' . esc_url($url) . '" target="_blank">' . esc_html($url) . '</a>';
    } else {
        echo '❌ Không tìm thấy trang "host" hoặc chưa publish.';
    }
    echo '</div>';
    ?>
    
    <div class="success">
        <strong>✅ Hoàn tất!</strong><br><br>
        
        <?php if ($host_page && $host_page->post_status === 'publish'): ?>
            <a href="<?php echo esc_url(get_permalink($host_page->ID)); ?>" target="_blank" class="button">
                🚀 Thử truy cập /host
            </a>
        <?php else: ?>
            <p>Bạn cần tạo trang "host" trước:</p>
            <ol>
                <li>Vào <strong>Pages > Add New</strong></li>
                <li>Đặt tên: "Host" hoặc tùy ý</li>
                <li>Slug: <code>host</code></li>
                <li>Nội dung: <code>[live_quiz_host]</code></li>
                <li>Publish</li>
            </ol>
            <a href="<?php echo admin_url('post-new.php?post_type=page'); ?>" class="button">
                ➕ Tạo trang mới
            </a>
        <?php endif; ?>
    </div>
    
    <hr style="margin: 40px 0;">
    
    <p><a href="<?php echo admin_url(); ?>">← Về Dashboard</a></p>
</body>
</html>
