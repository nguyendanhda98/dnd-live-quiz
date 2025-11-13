<?php<?php

/**/**

 * Setup DND Live Quiz Permalinks * Setup DND Live Quiz Permalinks

 * Run this once to setup permalink settings * Run this once to setup permalink settings

 */ */



// Load WordPress// Load WordPress

require_once('../../../../../wp-load.php');require_once('../../../../../wp-load.php');



if (!current_user_can('manage_options')) {if (!current_user_can('manage_options')) {

    die('Permission denied');    die('Permission denied');

}}



echo "=== DND Live Quiz Permalink Setup ===\n\n";echo "=== DND Live Quiz Permalink Setup ===\n\n";



// Set default option if not exists// Set default option if not exists

if (!get_option('live_quiz_play_base')) {if (!get_option('live_quiz_play_base')) {

    add_option('live_quiz_play_base', 'play');    add_option('live_quiz_play_base', 'play');

    echo "✓ Created option 'live_quiz_play_base' with value 'play'\n";    echo "✓ Created option 'live_quiz_play_base' with value 'play'\n";

} else {} else {

    $current = get_option('live_quiz_play_base');    $current = get_option('live_quiz_play_base');

    echo "✓ Option already exists with value: '$current'\n";    echo "✓ Option already exists with value: '$current'\n";

}}



// Flush rewrite rules// Flush rewrite rules

flush_rewrite_rules();flush_rewrite_rules();

echo "✓ Rewrite rules flushed successfully!\n\n";echo "✓ Rewrite rules flushed successfully!\n\n";



// Show current configuration// Show current configuration

$play_base = get_option('live_quiz_play_base', 'play');$play_base = get_option('live_quiz_play_base', 'play');

$example_url = home_url('/' . $play_base . '/123');$example_url = home_url('/' . $play_base . '/123');



echo "Current Configuration:\n";echo "Current Configuration:\n";

echo "  Base: $play_base\n";echo "  Base: $play_base\n";

echo "  Example URL: $example_url\n\n";echo "  Example URL: $example_url\n\n";



echo "You can change the base in:\n";echo "You can change the base in:\n";

echo "  WordPress Admin > Settings > Permalinks > DND Live Quiz Permalinks\n\n";echo "  WordPress Admin > Settings > Permalinks > DND Live Quiz Permalinks\n\n";



echo "✓ Setup completed!\n";echo "✓ Setup completed!\n";

