<?php
/**
 * Flush rewrite rules - Run this once to activate new URL structure
 */

// Load WordPress
require_once('../../../../../wp-load.php');

if (!current_user_can('manage_options')) {
    die('Permission denied');
}

// Flush rewrite rules
flush_rewrite_rules();

echo "✓ Rewrite rules flushed successfully!\n";
echo "✓ URL /play/{session_id} is now active.\n";
