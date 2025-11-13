<?php
/**
 * Scoring Logic
 *
 * @package LiveQuiz
 */

if (!defined('ABSPATH')) {
    exit;
}

class Live_Quiz_Scoring {
    
    /**
     * Redis manager instance
     */
    private static $redis = null;
    
    /**
     * Check if Redis is enabled
     */
    private static function is_redis_enabled() {
        if (self::$redis === null) {
            if (class_exists('Live_Quiz_Redis_Manager')) {
                self::$redis = Live_Quiz_Redis_Manager::get_instance();
            }
        }
        return self::$redis && self::$redis->is_enabled();
    }
    
    /**
     * Calculate score based on answer speed
     * 
     * Formula: score = base_points × (α + (1 - α) × (T_remain / T_total))
     * 
     * @param int $base_points Base points for the question
     * @param float $time_total Total time allowed (seconds)
     * @param float $time_taken Time taken to answer (seconds)
     * @param float $alpha Minimum score coefficient (0-1), default 0.3
     * @return int Calculated score
     */
    public static function calculate_score($base_points, $time_total, $time_taken, $alpha = 0.3) {
        // Validate inputs
        $base_points = max(0, (int)$base_points);
        $time_total = max(0.1, (float)$time_total);
        $time_taken = max(0, (float)$time_taken);
        $alpha = max(0, min(1, (float)$alpha));
        
        // If answered after time limit, time_remain is negative -> 0 points
        if ($time_taken > $time_total) {
            return 0;
        }
        
        // Calculate remaining time
        $time_remain = $time_total - $time_taken;
        
        // Calculate score ratio
        $ratio = $time_remain / $time_total;
        
        // Apply formula
        $score = $base_points * ($alpha + (1 - $alpha) * $ratio);
        
        // Round to nearest integer
        return (int)round($score);
    }
    
    /**
     * Calculate time taken from timestamps
     * Uses server timestamp to prevent client manipulation
     * 
     * @param float $question_start_time Timestamp when question started (server time)
     * @param float $answer_time Timestamp when answer was submitted (server time)
     * @return float Time taken in seconds
     */
    public static function calculate_time_taken($question_start_time, $answer_time = null) {
        if ($answer_time === null) {
            $answer_time = microtime(true);
        }
        
        $time_taken = $answer_time - $question_start_time;
        
        // Ensure non-negative
        return max(0, $time_taken);
    }
    
    /**
     * Validate answer submission
     * Checks for timing anomalies and potential cheating
     * 
     * @param array $answer Answer data
     * @param array $question Question data
     * @return array ['valid' => bool, 'reason' => string]
     */
    public static function validate_answer($answer, $question) {
        $result = array('valid' => true, 'reason' => '');
        
        // Check required fields
        if (empty($answer['choice_id']) || empty($answer['question_id'])) {
            return array('valid' => false, 'reason' => 'Missing required fields');
        }
        
        // Check if choice exists
        $choice_id = (int)$answer['choice_id'];
        if (!isset($question['choices'][$choice_id])) {
            return array('valid' => false, 'reason' => 'Invalid choice');
        }
        
        // Check timing (server-side)
        if (isset($answer['server_time_taken'])) {
            $time_taken = (float)$answer['server_time_taken'];
            $time_limit = (float)$question['time_limit'];
            
            // Too fast (< 0.1 second) - likely bot
            if ($time_taken < 0.1) {
                return array('valid' => false, 'reason' => 'Answer too fast');
            }
            
            // Too slow (> time_limit + grace period)
            $grace_period = 2.0; // 2 seconds grace for network latency
            if ($time_taken > ($time_limit + $grace_period)) {
                return array('valid' => false, 'reason' => 'Answer too late');
            }
        }
        
        return $result;
    }
    
    /**
     * Check if answer is correct
     * 
     * @param int $choice_id Choice ID selected
     * @param array $question Question data
     * @return bool True if correct
     */
    public static function is_correct($choice_id, $question) {
        if (!isset($question['choices'][$choice_id])) {
            return false;
        }
        
        return !empty($question['choices'][$choice_id]['is_correct']);
    }
    
    /**
     * Calculate final score for a session participant
     * 
     * @param int $session_id Session ID
     * @param string $user_id User/participant ID
     * @return int Total score
     */
    public static function calculate_total_score($session_id, $user_id) {
        // Try Redis first (Phase 2) - O(1) lookup
        if (self::is_redis_enabled()) {
            $score = self::$redis->get_user_score($session_id, $user_id);
            if ($score !== false) {
                return (int)$score;
            }
        }
        
        // Fallback to calculating from answers (Phase 1)
        $answers = self::get_participant_answers($session_id, $user_id);
        
        $total_score = 0;
        foreach ($answers as $answer) {
            if (!empty($answer['score'])) {
                $total_score += (int)$answer['score'];
            }
        }
        
        return $total_score;
    }
    
    /**
     * Get participant answers for a session
     * 
     * @param int $session_id Session ID
     * @param string $user_id User/participant ID
     * @return array Answers
     */
    private static function get_participant_answers($session_id, $user_id) {
        $cache_key = "live_quiz_answers_{$session_id}_{$user_id}";
        $answers = get_transient($cache_key);
        
        if ($answers === false) {
            $answers = get_post_meta($session_id, "_answer_{$user_id}", true);
            if (!is_array($answers)) {
                $answers = array();
            }
            set_transient($cache_key, $answers, 300); // Cache 5 minutes
        }
        
        return $answers;
    }
    
    /**
     * Save participant answer
     * 
     * @param int $session_id Session ID
     * @param string $user_id User/participant ID
     * @param int $question_index Question index
     * @param array $answer_data Answer data
     * @return bool Success
     */
    public static function save_answer($session_id, $user_id, $question_index, $answer_data) {
        $answer = array(
            'question_id' => $answer_data['question_id'] ?? null,
            'choice_id' => $answer_data['choice_id'] ?? null,
            'is_correct' => $answer_data['is_correct'] ?? false,
            'time_taken' => $answer_data['time_taken'] ?? 0,
            'score' => $answer_data['score'] ?? 0,
            'timestamp' => time(),
        );
        
        // Save to Redis if enabled (Phase 2)
        if (self::is_redis_enabled()) {
            // Update leaderboard with cumulative score
            $current_total = self::$redis->get_user_score($session_id, $user_id);
            $new_total = ($current_total !== false ? $current_total : 0) + $answer['score'];
            self::$redis->update_score($session_id, $user_id, $new_total);
            
            // Save answer details
            self::$redis->save_answer($session_id, $user_id, $question_index, $answer);
        }
        
        // Save to database (Phase 1 fallback)
        $answers = self::get_participant_answers($session_id, $user_id);
        $answers[$question_index] = $answer;
        $result = update_post_meta($session_id, "_answer_{$user_id}", $answers);
        
        // Update cache
        $cache_key = "live_quiz_answers_{$session_id}_{$user_id}";
        delete_transient($cache_key);
        
        return $result;
    }
    
    /**
     * Get leaderboard for a session
     * 
     * @param int $session_id Session ID
     * @param int $limit Number of top players to return, 0 for all
     * @return array Leaderboard data
     */
    public static function get_leaderboard($session_id, $limit = 10) {
        // Try Redis first (Phase 2) - O(log N) performance
        if (self::is_redis_enabled()) {
            $leaderboard = self::$redis->get_leaderboard($session_id, $limit);
            if ($leaderboard !== false && is_array($leaderboard)) {
                // Redis returns sorted data, just add ranks
                foreach ($leaderboard as $index => &$entry) {
                    $entry['rank'] = $index + 1;
                }
                return $leaderboard;
            }
        }
        
        // Fallback to transients (Phase 1) - O(N) performance
        $cache_key = "live_quiz_leaderboard_{$session_id}";
        $leaderboard = get_transient($cache_key);
        
        if ($leaderboard === false) {
            $participants = Live_Quiz_Session_Manager::get_participants($session_id);
            
            $leaderboard = array();
            foreach ($participants as $participant) {
                $user_id = $participant['user_id'];
                $total_score = self::calculate_total_score($session_id, $user_id);
                
                $leaderboard[] = array(
                    'user_id' => $user_id,
                    'display_name' => $participant['display_name'],
                    'total_score' => $total_score,
                    'rank' => 0, // Will be calculated below
                );
            }
            
            // Sort by score descending
            usort($leaderboard, function($a, $b) {
                return $b['total_score'] - $a['total_score'];
            });
            
            // Assign ranks
            foreach ($leaderboard as $index => &$entry) {
                $entry['rank'] = $index + 1;
            }
            
            // Cache for 30 seconds
            set_transient($cache_key, $leaderboard, 30);
        }
        
        // Apply limit
        if ($limit > 0) {
            $leaderboard = array_slice($leaderboard, 0, $limit);
        }
        
        return $leaderboard;
    }
    
    /**
     * Clear leaderboard cache
     * 
     * @param int $session_id Session ID
     */
    public static function clear_leaderboard_cache($session_id) {
        // Clear Redis cache if enabled
        if (self::is_redis_enabled()) {
            // Redis Sorted Set is auto-updated, no need to clear
            // But clear any cached data
            self::$redis->delete_cache("leaderboard:{$session_id}");
        }
        
        // Clear transient cache (Phase 1)
        $cache_key = "live_quiz_leaderboard_{$session_id}";
        delete_transient($cache_key);
    }
    
    /**
     * Get participant rank and score
     * 
     * @param int $session_id Session ID
     * @param string $user_id User/participant ID
     * @return array ['rank' => int, 'score' => int, 'total_participants' => int]
     */
    public static function get_participant_rank($session_id, $user_id) {
        // Try Redis first (Phase 2) - O(log N) performance
        if (self::is_redis_enabled()) {
            $rank = self::$redis->get_user_rank($session_id, $user_id);
            $score = self::$redis->get_user_score($session_id, $user_id);
            $total = self::$redis->get_participant_count($session_id);
            
            if ($rank !== false) {
                return array(
                    'rank' => $rank,
                    'score' => $score !== false ? (int)$score : 0,
                    'total_participants' => $total !== false ? $total : 0,
                );
            }
        }
        
        // Fallback to full leaderboard (Phase 1)
        $leaderboard = self::get_leaderboard($session_id, 0); // Get all
        
        $rank = 0;
        $score = 0;
        foreach ($leaderboard as $entry) {
            if ($entry['user_id'] === $user_id) {
                $rank = $entry['rank'];
                $score = $entry['total_score'];
                break;
            }
        }
        
        return array(
            'rank' => $rank,
            'score' => $score,
            'total_participants' => count($leaderboard),
        );
    }
    
    /**
     * Calculate statistics for a question
     * 
     * @param int $session_id Session ID
     * @param int $question_index Question index
     * @return array Statistics
     */
    public static function get_question_stats($session_id, $question_index) {
        $participants = Live_Quiz_Session_Manager::get_participants($session_id);
        
        $stats = array(
            'total_answers' => 0,
            'correct_answers' => 0,
            'average_time' => 0,
            'choice_distribution' => array(),
        );
        
        $total_time = 0;
        
        foreach ($participants as $participant) {
            $answers = self::get_participant_answers($session_id, $participant['user_id']);
            
            if (isset($answers[$question_index])) {
                $answer = $answers[$question_index];
                $stats['total_answers']++;
                
                if (!empty($answer['is_correct'])) {
                    $stats['correct_answers']++;
                }
                
                if (!empty($answer['time_taken'])) {
                    $total_time += $answer['time_taken'];
                }
                
                if (!empty($answer['choice_id'])) {
                    $choice_id = $answer['choice_id'];
                    if (!isset($stats['choice_distribution'][$choice_id])) {
                        $stats['choice_distribution'][$choice_id] = 0;
                    }
                    $stats['choice_distribution'][$choice_id]++;
                }
            }
        }
        
        if ($stats['total_answers'] > 0) {
            $stats['average_time'] = $total_time / $stats['total_answers'];
            $stats['correct_percentage'] = ($stats['correct_answers'] / $stats['total_answers']) * 100;
        } else {
            $stats['correct_percentage'] = 0;
        }
        
        return $stats;
    }
}
