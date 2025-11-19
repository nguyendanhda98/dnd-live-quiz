<?php
/**
 * Test script to manually delete all _answer_* post meta
 * This verifies that our SQL query works correctly
 */

// Find the latest session
global $wpdb;

// Get latest quiz session
$latest_session = $wpdb->get_var("
    SELECT ID FROM {$wpdb->posts} 
    WHERE post_type = 'live_quiz_session' 
    ORDER BY ID DESC 
    LIMIT 1
");

if (!$latest_session) {
    return 'No session found';
}

// Delete all _answer_* post meta for this session
$deleted = $wpdb->query(
    $wpdb->prepare(
        "DELETE FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key LIKE '_answer_%%'",
        $latest_session
    )
);

error_log("[TEST DELETE ANSWERS] Session: {$latest_session}, Deleted: {$deleted} _answer_* entries");

return "Session: {$latest_session}, Deleted: {$deleted} _answer_* entries";

