<?php
/**
 * Utility script to flush rewrite rules
 * Access: yourdomain.com/wp-content/plugins/dnd-live-quiz/flush-rewrite.php
 */

// Load WordPress
require_once('../../../wp-load.php');

// Check if user is admin
if (!current_user_can('manage_options')) {
    wp_die('Unauthorized');
}

echo '<h1>Flush Rewrite Rules - DND Live Quiz</h1>';

// Register post types and rules first
if (class_exists('Live_Quiz_Post_Types')) {
    Live_Quiz_Post_Types::register();
    Live_Quiz_Post_Types::add_rewrite_rules();
}

// Flush rewrite rules
flush_rewrite_rules(true);

echo '<p style="color: green; font-weight: bold; font-size: 18px;">✅ Rewrite rules đã được flush thành công!</p>';

// Show current rules
global $wp_rewrite;
$rules = get_option('rewrite_rules');

echo '<h2>Current Rewrite Rules (Live Quiz):</h2>';
echo '<table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">';
echo '<tr><th>Pattern</th><th>Rewrite</th></tr>';
$found = false;
foreach ($rules as $pattern => $rewrite) {
    if (strpos($pattern, 'host') !== false || strpos($pattern, 'play') !== false) {
        echo '<tr>';
        echo '<td><code>' . htmlspecialchars($pattern) . '</code></td>';
        echo '<td><code>' . htmlspecialchars($rewrite) . '</code></td>';
        echo '</tr>';
        $found = true;
    }
}
if (!$found) {
    echo '<tr><td colspan="2" style="color: red;">Không tìm thấy rewrite rules cho Live Quiz!</td></tr>';
}
echo '</table>';

echo '<h2>Expected URL Structure:</h2>';
echo '<ul>';
echo '<li><strong>/host/123456</strong> → Quản lý phòng (chỉ host + admin)</li>';
echo '<li><strong>/play/123456</strong> → Tham gia phòng</li>';
echo '<li><strong>/host</strong> → WordPress xử lý bình thường (page/404)</li>';
echo '<li><strong>/play</strong> → WordPress xử lý bình thường (page/404)</li>';
echo '</ul>';

echo '<hr>';
echo '<p><a href="' . admin_url('options-permalink.php') . '">⚙️ Permalink Settings</a> | ';
echo '<a href="' . home_url() . '">🏠 Trang chủ</a></p>';
