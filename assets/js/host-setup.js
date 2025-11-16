/**
 * Host Setup JavaScript
 * 
 * @package LiveQuiz
 */

(function($) {
    'use strict';

    const HostSetup = {
        init: function() {
            this.bindEvents();
        },
        
        bindEvents: function() {
            const self = this;
            
            // Create room button
            $('#create-room-btn').on('click', function(e) {
                e.preventDefault();
                self.createSession();
            });
        },
        
        createSession: function() {
            const self = this;
            const $btn = $('#create-room-btn');
            const $error = $('#form-error');
            
            // Disable button and show loading
            $btn.prop('disabled', true).html('⏳ Đang tạo phòng...');
            $error.hide();
            
            // Create empty session via API
            $.ajax({
                url: window.liveQuizSetup.restUrl + '/sessions/create-quick',
                method: 'POST',
                contentType: 'application/json',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', window.liveQuizSetup.nonce);
                },
                success: function(response) {
                    if (response.success) {
                        // Redirect to host page with session_id parameter
                        const sessionId = response.data.session_id;
                        const currentUrl = window.location.href.split('?')[0];
                        window.location.href = currentUrl + '?session_id=' + sessionId;
                    } else {
                        $error.text(response.message || 'Lỗi tạo phòng').show();
                        $btn.prop('disabled', false).html('🎮 Tạo phòng mới');
                    }
                },
                error: function(xhr) {
                    let errorMsg = 'Lỗi tạo phòng. Vui lòng thử lại.';
                    
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    }
                    
                    $error.text(errorMsg).show();
                    $btn.prop('disabled', false).html('🎮 Tạo phòng mới');
                }
            });
        }
    };
    
    // Initialize on document ready
    $(document).ready(function() {
        if (typeof window.liveQuizSetup !== 'undefined') {
            HostSetup.init();
        }
    });
    
})(jQuery);
