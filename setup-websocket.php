<!DOCTYPE html>
<html>
<head>
    <title>Set WebSocket URL</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
        button {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover { background: #45a049; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Set WebSocket URL for Live Quiz</h1>
        
        <?php
        // Load WordPress
        require_once(dirname(__FILE__) . '/../../../wp-load.php');
        
        // Security: Require admin login
        if (!current_user_can('manage_options')) {
            wp_die('⚠️ Access denied. You must be logged in as an administrator.', 'Access Denied', array('response' => 403));
        }

        // Check if user wants to update
        if (isset($_POST['update_url'])) {
            $new_url = sanitize_text_field($_POST['websocket_url']);
            $result = update_option('live_quiz_websocket_url', $new_url);
            
            if ($result || get_option('live_quiz_websocket_url') === $new_url) {
                echo '<p class="success">✓ WebSocket URL updated successfully!</p>';
            } else {
                echo '<p class="error">✗ Failed to update WebSocket URL</p>';
            }
        }

        // Get current value
        $current_url = get_option('live_quiz_websocket_url', '');
        $is_set = !empty($current_url);
        ?>

        <div class="info">
            <h3>Current Status:</h3>
            <p><strong>WebSocket URL:</strong> 
                <?php if ($is_set): ?>
                    <span class="success">✓ Set</span> - <code><?php echo esc_html($current_url); ?></code>
                <?php else: ?>
                    <span class="error">✗ Not set</span>
                <?php endif; ?>
            </p>
        </div>

        <h3>Update WebSocket URL:</h3>
        <form method="POST">
            <p>
                <input type="text" name="websocket_url" value="ws://localhost:3033" 
                       style="width: 100%; padding: 10px; font-size: 16px; margin: 10px 0;" 
                       placeholder="ws://localhost:3033">
            </p>
            <p>
                <button type="submit" name="update_url">Update WebSocket URL</button>
            </p>
        </form>

        <div class="info">
            <h3>ℹ️ Instructions:</h3>
            <ol>
                <li>Make sure WebSocket server is running: <code>pm2 list</code></li>
                <li>Check the port in <code>.env</code> file (default: 3033)</li>
                <li>Use format: <code>ws://localhost:PORT</code></li>
                <li>After updating, delete this file for security</li>
            </ol>
        </div>

        <h3>🔍 Verification:</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
<?php
// Show all websocket-related options
global $wpdb;
$options = $wpdb->get_results("SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE '%websocket%' OR option_name LIKE '%ws_%'");
foreach ($options as $option) {
    echo esc_html($option->option_name) . ": " . esc_html($option->option_value) . "\n";
}
?>
        </pre>
    </div>
</body>
</html>
