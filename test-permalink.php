<!DOCTYPE html>
<html>
<head>
    <title>DND Live Quiz - Permalink Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 800px;
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
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .status {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            font-size: 14px;
        }
        .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
        }
        .code {
            background: #f8f9fa;
            padding: 10px;
            border-left: 3px solid #667eea;
            margin: 10px 0;
            font-family: monospace;
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
        .btn:hover {
            background: #5568d3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 DND Live Quiz - Permalink Setup & Test</h1>
        
        <?php
        // Load WordPress
        require_once('../../../../../wp-load.php');
        
        if (!current_user_can('manage_options')) {
            echo '<div class="status error">❌ You need administrator permission to access this page.</div>';
            exit;
        }
        
        echo '<div class="status info">✅ You are logged in as administrator</div>';
        
        // Check and setup option
        $play_base = get_option('live_quiz_play_base');
        if ($play_base === false) {
            add_option('live_quiz_play_base', 'play');
            $play_base = 'play';
            echo '<div class="status success">✅ Created option "live_quiz_play_base" with value "play"</div>';
        } else {
            echo '<div class="status success">✅ Option "live_quiz_play_base" exists with value: <strong>' . esc_html($play_base) . '</strong></div>';
        }
        
        // Flush rewrite rules
        flush_rewrite_rules();
        echo '<div class="status success">✅ Rewrite rules have been flushed</div>';
        
        // Show configuration
        $example_url = home_url('/' . $play_base . '/123');
        ?>
        
        <h2>📋 Current Configuration</h2>
        <div class="code">
            <strong>Base Slug:</strong> <?php echo esc_html($play_base); ?><br>
            <strong>Example Host URL:</strong> <a href="<?php echo esc_url($example_url); ?>" target="_blank"><?php echo esc_html($example_url); ?></a><br>
            <strong>Home URL:</strong> <?php echo esc_html(home_url('/')); ?>
        </div>
        
        <h2>🔧 Next Steps</h2>
        <ol>
            <li>Go to <strong>Settings > Permalinks</strong> in WordPress Admin</li>
            <li>Scroll down to find <strong>"DND Live Quiz Permalinks"</strong> section</li>
            <li>You can change the base slug there (default: "play")</li>
            <li>Create a quiz room to test the URL</li>
        </ol>
        
        <h2>🔗 Quick Links</h2>
        <a href="<?php echo admin_url('options-permalink.php'); ?>" class="btn">Open Permalink Settings</a>
        <a href="<?php echo admin_url('edit.php?post_type=live_quiz'); ?>" class="btn">Go to Live Quiz</a>
        
        <h2>🧪 Test Rewrite Rules</h2>
        <?php
        global $wp_rewrite;
        $wp_rewrite->flush_rules(false);
        $rules = get_option('rewrite_rules');
        
        // Check if our rule exists
        $our_rule = '^' . $play_base . '/([0-9]+)/?$';
        $rule_exists = false;
        
        if (is_array($rules)) {
            foreach ($rules as $pattern => $rewrite) {
                if ($pattern === $our_rule) {
                    $rule_exists = true;
                    echo '<div class="status success">✅ Rewrite rule found in database:<br><code>' . esc_html($pattern) . ' => ' . esc_html($rewrite) . '</code></div>';
                    break;
                }
            }
        }
        
        if (!$rule_exists) {
            echo '<div class="status error">❌ Rewrite rule NOT found! Try refreshing this page.</div>';
        }
        ?>
        
        <h2>📝 All DND Quiz Rewrite Rules</h2>
        <div class="code" style="max-height: 200px; overflow-y: auto;">
            <?php
            if (is_array($rules)) {
                $found_any = false;
                foreach ($rules as $pattern => $rewrite) {
                    if (strpos($pattern, $play_base) === 0 || strpos($rewrite, 'live_quiz') !== false) {
                        echo esc_html($pattern) . ' => ' . esc_html($rewrite) . '<br>';
                        $found_any = true;
                    }
                }
                if (!$found_any) {
                    echo 'No DND Quiz rules found';
                }
            }
            ?>
        </div>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
            <strong>Troubleshooting:</strong> If you still get 404 errors, try:<br>
            1. Deactivate and reactivate the plugin<br>
            2. Go to Settings > Permalinks and click "Save Changes"<br>
            3. Check if your .htaccess file is writable
        </p>
    </div>
</body>
</html>
