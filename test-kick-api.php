<!DOCTYPE html>
<html>
<head>
    <title>Test Kick Player API</title>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body>
    <h1>Test Kick Player API</h1>
    
    <form id="testForm">
        <p>
            <label>Session ID:</label>
            <input type="number" id="sessionId" value="2908" required>
        </p>
        <p>
            <label>User ID:</label>
            <input type="text" id="userId" value="31" required>
        </p>
        <p>
            <label>Nonce:</label>
            <input type="text" id="nonce" value="<?php echo wp_create_nonce('wp_rest'); ?>" required style="width: 300px;">
        </p>
        <p>
            <button type="submit">Test Kick Player</button>
        </p>
    </form>
    
    <h3>Result:</h3>
    <pre id="result" style="background: #f5f5f5; padding: 15px; border: 1px solid #ddd;"></pre>
    
    <script>
    <?php
    // Load WordPress
    require_once(dirname(__FILE__) . '/../../../wp-load.php');
    
    // Get API URL
    $api_url = rest_url('live-quiz/v1');
    ?>
    
    const API_URL = '<?php echo $api_url; ?>';
    
    $('#testForm').on('submit', function(e) {
        e.preventDefault();
        
        const sessionId = $('#sessionId').val();
        const userId = $('#userId').val();
        const nonce = $('#nonce').val();
        
        $('#result').text('Sending request...');
        
        $.ajax({
            url: API_URL + '/sessions/' + sessionId + '/kick-player',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                user_id: userId
            }),
            headers: {
                'X-WP-Nonce': nonce
            },
            success: function(response) {
                $('#result').text(JSON.stringify(response, null, 2));
            },
            error: function(xhr, status, error) {
                $('#result').text('ERROR:\n' + JSON.stringify({
                    status: xhr.status,
                    statusText: xhr.statusText,
                    response: xhr.responseJSON || xhr.responseText
                }, null, 2));
            }
        });
    });
    </script>
</body>
</html>
