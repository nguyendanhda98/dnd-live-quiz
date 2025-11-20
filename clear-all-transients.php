<?php
/**
 * Emergency script to clear all answer count transients
 * Access via: https://dndenglish.com/wp-content/plugins/dnd-live-quiz/clear-all-transients.php
 */

// Load WordPress
$wp_load_path = dirname(dirname(dirname(dirname(__FILE__)))) . '/wp-load.php';
if (file_exists($wp_load_path)) {
    require_once($wp_load_path);
} else {
    die('Cannot find wp-load.php');
}

// Check if user is admin
if (!current_user_can('manage_options')) {
    die('Access denied - admin only');
}

global $wpdb;

// Delete all answer count transients
$deleted = $wpdb->query("
    DELETE FROM {$wpdb->options} 
    WHERE option_name LIKE '_transient_live_quiz_answer_count_%' 
    OR option_name LIKE '_transient_timeout_live_quiz_answer_count_%'
");

echo "<h1>Transients Cleared</h1>";
echo "<p>Deleted <strong>{$deleted}</strong> transient rows</p>";
echo "<p>Answer counts will now start from 0 in new games</p>";
echo "<p><a href='/host/'>Go to Host Page</a></p>";

