<!DOCTYPE html>
<html>
<head>
    <title>DND Live Quiz - URL Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 1000px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-bottom: 20px; }
        h2 { color: #667eea; margin-top: 30px; }
        .status {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            font-size: 14px;
        }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        .code {
            background: #f8f9fa;
            padding: 15px;
            border-left: 3px solid #667eea;
            margin: 10px 0;
            font-family: monospace;
            font-size: 13px;
        }
        .url-list {
            list-style: none;
            padding: 0;
        }
        .url-list li {
            padding: 10px;
            margin: 5px 0;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .url-list a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        .url-list a:hover {
            text-decoration: underline;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #667eea;
            color: white;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 DND Live Quiz - URL Configuration</h1>
        
        <?php
        require_once('../../../../../wp-load.php');
        
        if (!current_user_can('manage_options')) {
            echo '<div class="status error">❌ You need administrator permission</div>';
            exit;
        }
        
        // Setup options
        if (!get_option('live_quiz_host_base')) {
            add_option('live_quiz_host_base', 'host');
        }
        if (!get_option('live_quiz_play_base')) {
            add_option('live_quiz_play_base', 'play');
        }
        
        flush_rewrite_rules();
        
        $host_base = get_option('live_quiz_host_base', 'host');
        $play_base = get_option('live_quiz_play_base', 'play');
        
        echo '<div class="status success">✅ Options created and rewrite rules flushed!</div>';
        ?>
        
        <h2>📋 Current Configuration</h2>
        <table>
            <tr>
                <th>Setting</th>
                <th>Value</th>
                <th>URL Example</th>
            </tr>
            <tr>
                <td><strong>Host Base</strong></td>
                <td><code><?php echo esc_html($host_base); ?></code></td>
                <td><code><?php echo home_url('/' . $host_base); ?></code></td>
            </tr>
            <tr>
                <td><strong>Player Base</strong></td>
                <td><code><?php echo esc_html($play_base); ?></code></td>
                <td><code><?php echo home_url('/' . $play_base); ?></code></td>
            </tr>
        </table>
        
        <h2>🔗 URL Structure</h2>
        <div class="code">
            <strong>For Host (Teachers):</strong><br>
            • Create Room: <a href="<?php echo home_url('/' . $host_base); ?>" target="_blank"><?php echo home_url('/' . $host_base); ?></a><br>
            • Manage Room: <?php echo home_url('/' . $host_base . '/123456'); ?> (with 6-digit code)<br><br>
            
            <strong>For Players (Students):</strong><br>
            • Join Page: <a href="<?php echo home_url('/' . $play_base); ?>" target="_blank"><?php echo home_url('/' . $play_base); ?></a><br>
            • Direct Join: <?php echo home_url('/' . $play_base . '/123456'); ?> (with 6-digit code)
        </div>
        
        <h2>✨ Features</h2>
        <ul>
            <li>✅ <strong>Host URLs</strong> - Giáo viên tạo và quản lý phòng qua <code>/<?php echo $host_base; ?></code></li>
            <li>✅ <strong>Player URLs</strong> - Học viên join qua <code>/<?php echo $play_base; ?></code></li>
            <li>✅ <strong>6-digit PIN</strong> - Mã phòng 6 số thay vì ký tự</li>
            <li>✅ <strong>Direct Join</strong> - Join trực tiếp qua URL <code>/<?php echo $play_base; ?>/123456</code></li>
            <li>✅ <strong>Customizable</strong> - Có thể đổi base trong Settings > Permalinks</li>
        </ul>
        
        <h2>🧪 Test URLs</h2>
        <ul class="url-list">
            <li><a href="<?php echo home_url('/' . $host_base); ?>" target="_blank">Test Host Create Room Page</a></li>
            <li><a href="<?php echo home_url('/' . $play_base); ?>" target="_blank">Test Player Join Page</a></li>
            <li><a href="<?php echo admin_url('options-permalink.php'); ?>" target="_blank">Go to Permalink Settings</a></li>
        </ul>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
            <strong>Next Steps:</strong><br>
            1. Go to Settings > Permalinks to customize base URLs<br>
            2. Test creating a room at <code>/<?php echo $host_base; ?></code><br>
            3. Share the PIN code with players to join
        </p>
    </div>
</body>
</html>
