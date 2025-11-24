<?php
/**
 * Manual cleanup tool for auto-generated quizzes.
 *
 * Usage: visit /wp-content/plugins/dnd-live-quiz/cleanup-auto-quizzes.php while logged in as an admin.
 */

require_once dirname(__FILE__, 4) . '/wp-load.php';

if (!function_exists('is_user_logged_in') || !function_exists('current_user_can')) {
    wp_die(__('WordPress core is not loaded correctly.', 'live-quiz'));
}

if (!is_user_logged_in()) {
    wp_safe_redirect(wp_login_url($_SERVER['REQUEST_URI']));
    exit;
}

if (!current_user_can('manage_options')) {
    wp_die(__('Bạn không có quyền thực hiện hành động này.', 'live-quiz'));
}

$deleted = array();
$skipped = array();
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['cleanup_auto_quizzes_nonce'])) {
    if (!wp_verify_nonce($_POST['cleanup_auto_quizzes_nonce'], 'cleanup_auto_quizzes_action')) {
        $error = __('Không thể xác thực yêu cầu. Hãy thử lại.', 'live-quiz');
    } else {
        $auto_quizzes = get_posts(array(
            'post_type'      => 'live_quiz',
            'post_status'    => array('private', 'draft', 'pending', 'trash'),
            'posts_per_page' => -1,
            'fields'         => 'ids',
            'meta_key'       => '_live_quiz_auto_generated',
            'meta_value'     => 'yes',
        ));

        foreach ($auto_quizzes as $quiz_id) {
            $status = get_post_status($quiz_id);

            // Safety net: skip anything that somehow is published
            if ($status === 'publish') {
                $skipped[] = $quiz_id;
                continue;
            }

            $result = wp_delete_post($quiz_id, true); // Force delete
            if ($result) {
                $deleted[] = $quiz_id;
            } else {
                $skipped[] = $quiz_id;
            }
        }
    }
}

$auto_quiz_count = new WP_Query(array(
    'post_type'      => 'live_quiz',
    'post_status'    => array('private', 'draft', 'pending', 'trash'),
    'posts_per_page' => 1,
    'fields'         => 'ids',
    'meta_key'       => '_live_quiz_auto_generated',
    'meta_value'     => 'yes',
));

?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <title>Cleanup Auto-Generated Quizzes</title>
    <style>
        body {
            font-family: "Segoe UI", Roboto, sans-serif;
            background: #f5f5f5;
            margin: 0;
            padding: 40px;
        }
        .container {
            max-width: 720px;
            margin: 0 auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            padding: 32px;
        }
        h1 {
            margin-top: 0;
        }
        .status {
            margin: 20px 0;
            padding: 16px;
            border-radius: 6px;
        }
        .status.info {
            background: #f0f6ff;
            border: 1px solid #c7defc;
            color: #093b74;
        }
        .status.success {
            background: #effaf1;
            border: 1px solid #b8eac2;
            color: #1b5e20;
        }
        .status.error {
            background: #fff0f0;
            border: 1px solid #f5c2c7;
            color: #842029;
        }
        button {
            background: #c62828;
            border: none;
            color: #fff;
            padding: 12px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .meta {
            margin-top: 30px;
            font-size: 14px;
            color: #555;
        }
        ul {
            margin: 10px 0 0 20px;
        }
        .back-link {
            display: inline-block;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Xoá quiz ghép tự động</h1>
        <p>Công cụ này sẽ xoá vĩnh viễn tất cả các bài <code>live_quiz</code> có meta <strong>_live_quiz_auto_generated = yes</strong> và không ở trạng thái <em>Published</em>.</p>
        <p>Hãy chắc chắn bạn đã sao lưu trước khi thực hiện.</p>

        <?php if ($error): ?>
            <div class="status error"><?php echo esc_html($error); ?></div>
        <?php elseif ($_SERVER['REQUEST_METHOD'] === 'POST'): ?>
            <div class="status success">
                <strong>Hoàn tất!</strong><br>
                Đã xoá: <?php echo count($deleted); ?> quiz.<br>
                Bỏ qua: <?php echo count($skipped); ?> quiz.
                <?php if (!empty($skipped)): ?>
                    <ul>
                        <?php foreach ($skipped as $id): ?>
                            <li>Quiz ID <?php echo (int) $id; ?> (status: <?php echo esc_html(get_post_status($id)); ?>)</li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <div class="status info">
            <strong>Quiz auto-generated còn lại:</strong> <?php echo (int) $auto_quiz_count->found_posts; ?>
        </div>

        <form method="post" onsubmit="return confirm('Bạn chắc chắn muốn xoá tất cả quiz auto-generated? Hành động này không thể hoàn tác.');">
            <?php wp_nonce_field('cleanup_auto_quizzes_action', 'cleanup_auto_quizzes_nonce'); ?>
            <button type="submit">Xoá ngay</button>
        </form>

        <a class="back-link" href="<?php echo esc_url(admin_url('edit.php?post_type=live_quiz')); ?>">← Quay lại danh sách Quizzes</a>

        <div class="meta">
            File: <code><?php echo esc_html(basename(__FILE__)); ?></code>
        </div>
    </div>
</body>
</html>

