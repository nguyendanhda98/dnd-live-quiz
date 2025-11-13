<?php
/**
 * Basic Unit Tests for Live Quiz
 * 
 * Run with: vendor/bin/phpunit tests/test-scoring.php
 * 
 * @package LiveQuiz
 */

class Test_Live_Quiz_Scoring extends WP_UnitTestCase {
    
    /**
     * Test basic score calculation
     */
    public function test_calculate_score_basic() {
        // base_points = 1000, alpha = 0.3, time_total = 20
        
        // Answer immediately (time_taken = 0)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, 0, 0.3);
        $this->assertEquals(1000, $score, 'Max score when answered immediately');
        
        // Answer at half time (time_taken = 10)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, 10, 0.3);
        $expected = 1000 * (0.3 + 0.7 * (10/20)); // = 650
        $this->assertEquals(round($expected), $score, 'Score at half time');
        
        // Answer at last second (time_taken = 19)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, 19, 0.3);
        $expected = 1000 * (0.3 + 0.7 * (1/20)); // = 335
        $this->assertEquals(round($expected), $score, 'Score at last second');
        
        // Answer too late (time_taken > time_total)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, 25, 0.3);
        $this->assertEquals(0, $score, 'Zero score when too late');
    }
    
    /**
     * Test alpha coefficient
     */
    public function test_alpha_coefficient() {
        // With alpha = 0 (no minimum)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, 20, 0);
        $this->assertEquals(0, $score, 'Zero score with alpha=0 and no time remaining');
        
        // With alpha = 1 (always full points)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, 20, 1);
        $this->assertEquals(1000, $score, 'Full score with alpha=1 regardless of time');
        
        // With alpha = 0.5 (50% minimum)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, 20, 0.5);
        $this->assertEquals(500, $score, '50% score with alpha=0.5 and no time remaining');
    }
    
    /**
     * Test edge cases
     */
    public function test_edge_cases() {
        // Negative time (should be treated as 0)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, -5, 0.3);
        $this->assertEquals(1000, $score, 'Negative time treated as immediate answer');
        
        // Zero base points
        $score = Live_Quiz_Scoring::calculate_score(0, 20, 10, 0.3);
        $this->assertEquals(0, $score, 'Zero points with zero base');
        
        // Very small time limit
        $score = Live_Quiz_Scoring::calculate_score(1000, 0.1, 0.05, 0.3);
        $this->assertGreaterThan(0, $score, 'Score calculated with very small time');
    }
    
    /**
     * Test time calculation
     */
    public function test_calculate_time_taken() {
        $start_time = microtime(true);
        usleep(100000); // Sleep 0.1 second
        $time_taken = Live_Quiz_Scoring::calculate_time_taken($start_time);
        
        $this->assertGreaterThanOrEqual(0.1, $time_taken, 'Time calculated correctly');
        $this->assertLessThan(0.2, $time_taken, 'Time is reasonable');
    }
    
    /**
     * Test answer validation
     */
    public function test_validate_answer() {
        $question = array(
            'choices' => array(
                array('text' => 'A', 'is_correct' => true),
                array('text' => 'B', 'is_correct' => false),
            ),
            'time_limit' => 20,
        );
        
        // Valid answer
        $result = Live_Quiz_Scoring::validate_answer(array(
            'question_id' => 0,
            'choice_id' => 0,
            'server_time_taken' => 5,
        ), $question);
        $this->assertTrue($result['valid'], 'Valid answer accepted');
        
        // Invalid choice
        $result = Live_Quiz_Scoring::validate_answer(array(
            'question_id' => 0,
            'choice_id' => 99,
            'server_time_taken' => 5,
        ), $question);
        $this->assertFalse($result['valid'], 'Invalid choice rejected');
        
        // Too fast (bot-like)
        $result = Live_Quiz_Scoring::validate_answer(array(
            'question_id' => 0,
            'choice_id' => 0,
            'server_time_taken' => 0.05,
        ), $question);
        $this->assertFalse($result['valid'], 'Too fast answer rejected');
        
        // Too late
        $result = Live_Quiz_Scoring::validate_answer(array(
            'question_id' => 0,
            'choice_id' => 0,
            'server_time_taken' => 25,
        ), $question);
        $this->assertFalse($result['valid'], 'Too late answer rejected');
    }
    
    /**
     * Test is_correct
     */
    public function test_is_correct() {
        $question = array(
            'choices' => array(
                array('text' => 'A', 'is_correct' => true),
                array('text' => 'B', 'is_correct' => false),
                array('text' => 'C', 'is_correct' => false),
            ),
        );
        
        $this->assertTrue(
            Live_Quiz_Scoring::is_correct(0, $question),
            'Correct answer identified'
        );
        
        $this->assertFalse(
            Live_Quiz_Scoring::is_correct(1, $question),
            'Incorrect answer identified'
        );
        
        $this->assertFalse(
            Live_Quiz_Scoring::is_correct(99, $question),
            'Invalid choice returns false'
        );
    }
    
    /**
     * Test scoring formula matches requirements
     */
    public function test_formula_requirements() {
        // Example from requirements:
        // base_points = 1000, α = 0.3, T_total = 20s
        
        // Answer after 2s (T_remain = 18s)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, 2, 0.3);
        $expected = 1000 * (0.3 + 0.7 * (18/20)); // = 930
        $this->assertEquals(round($expected), $score, 'Formula matches requirement example 1');
        
        // Answer after 18s (T_remain = 2s)
        $score = Live_Quiz_Scoring::calculate_score(1000, 20, 18, 0.3);
        $expected = 1000 * (0.3 + 0.7 * (2/20)); // = 370
        $this->assertEquals(round($expected), $score, 'Formula matches requirement example 2');
    }
}

/**
 * Integration test for session flow
 */
class Test_Live_Quiz_Session extends WP_UnitTestCase {
    
    private $session_id;
    private $quiz_id;
    
    public function setUp() {
        parent::setUp();
        
        // Create a test quiz
        $this->quiz_id = wp_insert_post(array(
            'post_type' => 'live_quiz',
            'post_title' => 'Test Quiz',
            'post_status' => 'publish',
        ));
        
        $questions = array(
            array(
                'text' => 'Test question?',
                'choices' => array(
                    array('text' => 'A', 'is_correct' => true),
                    array('text' => 'B', 'is_correct' => false),
                ),
                'time_limit' => 10,
                'base_points' => 1000,
            ),
        );
        
        update_post_meta($this->quiz_id, '_live_quiz_questions', $questions);
        update_post_meta($this->quiz_id, '_live_quiz_alpha', 0.3);
        
        // Create a test session
        $this->session_id = wp_insert_post(array(
            'post_type' => 'live_quiz_session',
            'post_title' => 'Test Session',
            'post_status' => 'publish',
        ));
        
        update_post_meta($this->session_id, '_session_quiz_id', $this->quiz_id);
        update_post_meta($this->session_id, '_session_room_code', 'TEST01');
        update_post_meta($this->session_id, '_session_status', 'lobby');
    }
    
    public function test_session_lifecycle() {
        // Get session
        $session = Live_Quiz_Session_Manager::get_session($this->session_id);
        $this->assertNotNull($session, 'Session retrieved');
        $this->assertEquals('lobby', $session['status'], 'Initial status is lobby');
        
        // Add participant
        $participant = Live_Quiz_Session_Manager::add_participant($this->session_id, 'Test Player');
        $this->assertFalse(is_wp_error($participant), 'Participant added');
        
        // Start session
        $result = Live_Quiz_Session_Manager::start_session($this->session_id);
        $this->assertTrue($result, 'Session started');
        
        $session = Live_Quiz_Session_Manager::get_session($this->session_id);
        $this->assertEquals('question', $session['status'], 'Status changed to question');
        
        // Submit answer
        $result = Live_Quiz_Session_Manager::submit_answer(
            $this->session_id,
            $participant['user_id'],
            0 // Correct answer
        );
        $this->assertFalse(is_wp_error($result), 'Answer submitted');
        $this->assertTrue($result['is_correct'], 'Answer is correct');
        $this->assertGreaterThan(0, $result['score'], 'Score calculated');
        
        // End session
        $result = Live_Quiz_Session_Manager::end_session($this->session_id);
        $this->assertTrue($result, 'Session ended');
        
        $session = Live_Quiz_Session_Manager::get_session($this->session_id);
        $this->assertEquals('ended', $session['status'], 'Status changed to ended');
    }
}

echo "Run these tests with PHPUnit:\n";
echo "vendor/bin/phpunit tests/test-scoring.php\n";
