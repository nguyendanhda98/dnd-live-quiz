<?php
/**
 * Sample Quiz Data Generator
 * 
 * Usage: Run this file once to generate sample quiz data
 * wp eval-file sample-data.php
 * 
 * @package LiveQuiz
 */

// Sample Vietnamese quiz data
$sample_quizzes = array(
    array(
        'title' => 'Quiz Tiếng Anh Cơ Bản',
        'alpha' => 0.3,
        'max_players' => 100,
        'questions' => array(
            array(
                'text' => 'Thủ đô của Việt Nam là gì?',
                'choices' => array(
                    array('text' => 'Hà Nội', 'is_correct' => true),
                    array('text' => 'TP. Hồ Chí Minh', 'is_correct' => false),
                    array('text' => 'Đà Nẵng', 'is_correct' => false),
                    array('text' => 'Huế', 'is_correct' => false),
                ),
                'time_limit' => 15,
                'base_points' => 1000,
            ),
            array(
                'text' => 'How do you say "Xin chào" in English?',
                'choices' => array(
                    array('text' => 'Hello', 'is_correct' => true),
                    array('text' => 'Goodbye', 'is_correct' => false),
                    array('text' => 'Thank you', 'is_correct' => false),
                    array('text' => 'Sorry', 'is_correct' => false),
                ),
                'time_limit' => 10,
                'base_points' => 800,
            ),
            array(
                'text' => 'What is 2 + 2?',
                'choices' => array(
                    array('text' => '4', 'is_correct' => true),
                    array('text' => '3', 'is_correct' => false),
                    array('text' => '5', 'is_correct' => false),
                    array('text' => '22', 'is_correct' => false),
                ),
                'time_limit' => 8,
                'base_points' => 600,
            ),
            array(
                'text' => 'Which color is the sky?',
                'choices' => array(
                    array('text' => 'Blue', 'is_correct' => true),
                    array('text' => 'Red', 'is_correct' => false),
                    array('text' => 'Green', 'is_correct' => false),
                    array('text' => 'Yellow', 'is_correct' => false),
                ),
                'time_limit' => 12,
                'base_points' => 900,
            ),
            array(
                'text' => 'How many days are there in a week?',
                'choices' => array(
                    array('text' => '7', 'is_correct' => true),
                    array('text' => '5', 'is_correct' => false),
                    array('text' => '6', 'is_correct' => false),
                    array('text' => '8', 'is_correct' => false),
                ),
                'time_limit' => 10,
                'base_points' => 700,
            ),
        ),
    ),
    array(
        'title' => 'Quiz Toán Học Nhanh',
        'alpha' => 0.2,
        'max_players' => 200,
        'questions' => array(
            array(
                'text' => '10 × 5 = ?',
                'choices' => array(
                    array('text' => '50', 'is_correct' => true),
                    array('text' => '40', 'is_correct' => false),
                    array('text' => '60', 'is_correct' => false),
                    array('text' => '55', 'is_correct' => false),
                ),
                'time_limit' => 10,
                'base_points' => 1000,
            ),
            array(
                'text' => '100 ÷ 4 = ?',
                'choices' => array(
                    array('text' => '25', 'is_correct' => true),
                    array('text' => '20', 'is_correct' => false),
                    array('text' => '30', 'is_correct' => false),
                    array('text' => '24', 'is_correct' => false),
                ),
                'time_limit' => 12,
                'base_points' => 1200,
            ),
            array(
                'text' => '15 + 27 = ?',
                'choices' => array(
                    array('text' => '42', 'is_correct' => true),
                    array('text' => '40', 'is_correct' => false),
                    array('text' => '43', 'is_correct' => false),
                    array('text' => '41', 'is_correct' => false),
                ),
                'time_limit' => 15,
                'base_points' => 1500,
            ),
        ),
    ),
    array(
        'title' => 'Quiz Kiến Thức Tổng Hợp',
        'alpha' => 0.3,
        'max_players' => 500,
        'questions' => array(
            array(
                'text' => 'Ai là tổng thống đầu tiên của Hoa Kỳ?',
                'choices' => array(
                    array('text' => 'George Washington', 'is_correct' => true),
                    array('text' => 'Abraham Lincoln', 'is_correct' => false),
                    array('text' => 'Thomas Jefferson', 'is_correct' => false),
                    array('text' => 'John Adams', 'is_correct' => false),
                ),
                'time_limit' => 20,
                'base_points' => 1500,
            ),
            array(
                'text' => 'Hành tinh nào gần Mặt Trời nhất?',
                'choices' => array(
                    array('text' => 'Sao Thủy (Mercury)', 'is_correct' => true),
                    array('text' => 'Sao Kim (Venus)', 'is_correct' => false),
                    array('text' => 'Trái Đất (Earth)', 'is_correct' => false),
                    array('text' => 'Sao Hỏa (Mars)', 'is_correct' => false),
                ),
                'time_limit' => 18,
                'base_points' => 1300,
            ),
            array(
                'text' => 'H2O là công thức hóa học của chất gì?',
                'choices' => array(
                    array('text' => 'Nước', 'is_correct' => true),
                    array('text' => 'Muối', 'is_correct' => false),
                    array('text' => 'Đường', 'is_correct' => false),
                    array('text' => 'Dầu', 'is_correct' => false),
                ),
                'time_limit' => 15,
                'base_points' => 1000,
            ),
            array(
                'text' => 'Quốc gia nào có diện tích lớn nhất thế giới?',
                'choices' => array(
                    array('text' => 'Nga', 'is_correct' => true),
                    array('text' => 'Canada', 'is_correct' => false),
                    array('text' => 'Trung Quốc', 'is_correct' => false),
                    array('text' => 'Hoa Kỳ', 'is_correct' => false),
                ),
                'time_limit' => 20,
                'base_points' => 1400,
            ),
            array(
                'text' => 'Đơn vị tiền tệ của Nhật Bản là gì?',
                'choices' => array(
                    array('text' => 'Yên (Yen)', 'is_correct' => true),
                    array('text' => 'Nhân dân tệ (Yuan)', 'is_correct' => false),
                    array('text' => 'Won', 'is_correct' => false),
                    array('text' => 'Baht', 'is_correct' => false),
                ),
                'time_limit' => 15,
                'base_points' => 1100,
            ),
        ),
    ),
);

// Generate quizzes
foreach ($sample_quizzes as $quiz_data) {
    $post_id = wp_insert_post(array(
        'post_type' => 'live_quiz',
        'post_title' => $quiz_data['title'],
        'post_status' => 'publish',
    ));
    
    if (!is_wp_error($post_id)) {
        update_post_meta($post_id, '_live_quiz_questions', $quiz_data['questions']);
        update_post_meta($post_id, '_live_quiz_alpha', $quiz_data['alpha']);
        update_post_meta($post_id, '_live_quiz_max_players', $quiz_data['max_players']);
        
        echo "✓ Created quiz: {$quiz_data['title']} (ID: {$post_id})\n";
    } else {
        echo "✗ Failed to create quiz: {$quiz_data['title']}\n";
    }
}

echo "\n✓ Sample data generation complete!\n";
echo "Go to WordPress Admin → Quiz Questions to see the quizzes.\n";
