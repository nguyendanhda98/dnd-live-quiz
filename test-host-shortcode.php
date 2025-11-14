<?php
/**
 * Test script for host shortcode
 * 
 * Usage: Navigate to /wp-content/plugins/dnd-live-quiz/test-host-shortcode.php
 */

// Load WordPress
require_once('../../../wp-load.php');

// Check if user is logged in
if (!is_user_logged_in()) {
    wp_die('Please login first. <a href="' . wp_login_url($_SERVER['REQUEST_URI']) . '">Login</a>');
}

// Check permission
if (!current_user_can('edit_posts')) {
    wp_die('You do not have permission to access this page.');
}

// Get quiz_id from URL parameter
$quiz_id = isset($_GET['quiz_id']) ? intval($_GET['quiz_id']) : 0;

?>
<!DOCTYPE html>
<html>
<head>
    <title>Test Host Shortcode</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
        }
        .test-info {
            background: #f0f0f0;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        .quiz-list {
            background: #fff;
            padding: 20px;
            border: 1px solid #ddd;
            margin-bottom: 20px;
        }
        .quiz-item {
            padding: 10px;
            margin: 5px 0;
            border: 1px solid #ccc;
            border-radius: 3px;
        }
        .quiz-item a {
            display: inline-block;
            margin-left: 10px;
            padding: 5px 10px;
            background: #0073aa;
            color: white;
            text-decoration: none;
            border-radius: 3px;
        }
        .shortcode-output {
            border: 2px solid #0073aa;
            padding: 20px;
            background: white;
        }
    </style>
    <?php wp_head(); ?>
</head>
<body>
    <div class="test-info">
        <h1>🧪 Test Host Shortcode</h1>
        <p>This page tests the <code>[live_quiz_host quiz_id="X"]</code> shortcode.</p>
        
        <?php if ($quiz_id > 0): ?>
            <p><strong>Testing with Quiz ID:</strong> <?php echo $quiz_id; ?></p>
            <p><a href="?">← Back to quiz selection</a></p>
        <?php else: ?>
            <p><strong>Select a quiz to test:</strong></p>
        <?php endif; ?>
    </div>

    <?php if ($quiz_id === 0): ?>
        <div class="quiz-list">
            <h2>Available Quizzes</h2>
            <?php
            $quizzes = get_posts(array(
                'post_type' => 'live_quiz',
                'posts_per_page' => -1,
                'post_status' => 'publish',
            ));
            
            if (empty($quizzes)) {
                echo '<p>No quizzes found. Please create a quiz first.</p>';
                echo '<p><a href="' . admin_url('post-new.php?post_type=live_quiz') . '">Create New Quiz</a></p>';
            } else {
                foreach ($quizzes as $quiz) {
                    $questions = get_post_meta($quiz->ID, '_live_quiz_questions', true);
                    $question_count = is_array($questions) ? count($questions) : 0;
                    
                    echo '<div class="quiz-item">';
                    echo '<strong>' . esc_html($quiz->post_title) . '</strong> ';
                    echo '(ID: ' . $quiz->ID . ', Questions: ' . $question_count . ')';
                    echo ' <a href="?quiz_id=' . $quiz->ID . '">Test This Quiz</a>';
                    echo '</div>';
                }
            }
            ?>
        </div>
    <?php else: ?>
        <div class="shortcode-output">
            <h2>Shortcode Output:</h2>
            <?php
            // Execute the shortcode
            $shortcode = '[live_quiz_host quiz_id="' . $quiz_id . '"]';
            echo '<p><strong>Executing:</strong> <code>' . esc_html($shortcode) . '</code></p>';
            echo '<hr>';
            echo do_shortcode($shortcode);
            ?>
        </div>
    <?php endif; ?>
    
    <?php wp_footer(); ?>
</body>
</html>
