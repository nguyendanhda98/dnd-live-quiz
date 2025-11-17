<?php
/**
 * Test Start Question
 * 
 * Test if WebSocket Helper is loaded and start_question works
 */

// Load WordPress
require_once('../../../wp-load.php');

echo "=== TEST START QUESTION ===\n\n";

// Check if class exists
echo "1. Checking if Live_Quiz_WebSocket_Helper class exists...\n";
if (class_exists('Live_Quiz_WebSocket_Helper')) {
    echo "   ✓ Class exists\n\n";
} else {
    echo "   ✗ Class does NOT exist\n";
    echo "   Available classes:\n";
    foreach (get_declared_classes() as $class) {
        if (stripos($class, 'websocket') !== false || stripos($class, 'live_quiz') !== false) {
            echo "   - $class\n";
        }
    }
    exit;
}

// Check WebSocket URL
echo "2. Checking WebSocket URL configuration...\n";
$ws_url = get_option('live_quiz_websocket_url', '');
echo "   URL: " . ($ws_url ?: '(not set)') . "\n\n";

// Check WebSocket Secret
echo "3. Checking WebSocket Secret...\n";
$ws_secret = get_option('live_quiz_websocket_secret', '');
echo "   Secret: " . ($ws_secret ? 'SET' : '(not set)') . "\n\n";

// Get latest session
echo "4. Finding latest session...\n";
$sessions = get_posts(array(
    'post_type' => 'live_quiz_session',
    'posts_per_page' => 1,
    'orderby' => 'date',
    'order' => 'DESC',
));

if (empty($sessions)) {
    echo "   ✗ No sessions found\n";
    exit;
}

$session_id = $sessions[0]->ID;
echo "   ✓ Found session ID: $session_id\n";

// Get session data
$session = Live_Quiz_Session_Manager::get_session($session_id);
echo "   Status: " . $session['status'] . "\n";
echo "   Questions: " . count($session['questions']) . "\n\n";

// Test start_question
if (!empty($session['questions'])) {
    echo "5. Testing start_question...\n";
    
    $question_index = 0;
    $question_data = array(
        'text' => $session['questions'][0]['text'],
        'choices' => array_map(function($choice) {
            return array('text' => $choice['text']);
        }, $session['questions'][0]['choices']),
        'time_limit' => $session['questions'][0]['time_limit'],
        'start_time' => microtime(true),
    );
    
    echo "   Question: " . $question_data['text'] . "\n";
    echo "   Calling Live_Quiz_WebSocket_Helper::start_question()...\n";
    
    $result = Live_Quiz_WebSocket_Helper::start_question($session_id, $question_index, $question_data);
    
    if ($result) {
        echo "   ✓ SUCCESS\n";
        echo "   Result: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "   ✗ FAILED\n";
    }
}

echo "\n=== TEST COMPLETED ===\n";
