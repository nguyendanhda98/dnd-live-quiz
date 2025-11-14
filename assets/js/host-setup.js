/**
 * Host Setup JavaScript
 * 
 * @package LiveQuiz
 */

(function($) {
    'use strict';

    const HostSetup = {
        selectedQuizzes: [],
        searchTimeout: null,
        
        init: function() {
            this.bindEvents();
            this.updateCreateButton();
        },
        
        bindEvents: function() {
            const self = this;
            
            // Quiz search
            $('#quiz-search-input').on('input', function() {
                clearTimeout(self.searchTimeout);
                const searchTerm = $(this).val().trim();
                
                if (searchTerm.length >= 1) {
                    self.searchTimeout = setTimeout(function() {
                        self.searchQuizzes(searchTerm);
                    }, 300);
                } else {
                    $('#quiz-search-results').hide();
                }
            });
            
            // Close search results when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest('.quiz-search-container').length) {
                    $('#quiz-search-results').hide();
                }
            });
            
            // Quiz type change
            $('input[name="quiz_type"]').on('change', function() {
                if ($(this).val() === 'random') {
                    $('#random-count-container').slideDown();
                    self.updateQuestionCountHint();
                } else {
                    $('#random-count-container').slideUp();
                }
            });
            
            // Question count change
            $('#question-count').on('input', function() {
                self.updateQuestionCountHint();
            });
            
            // Form submit
            $('#host-setup-form').on('submit', function(e) {
                e.preventDefault();
                self.createSession();
            });
        },
        
        searchQuizzes: function(searchTerm) {
            const self = this;
            const $results = $('#quiz-search-results');
            
            $results.html('<div class="search-loading">Đang tìm kiếm...</div>').show();
            
            $.ajax({
                url: window.liveQuizSetup.restUrl + '/quizzes/search',
                method: 'GET',
                data: {
                    s: searchTerm
                },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', window.liveQuizSetup.nonce);
                },
                success: function(response) {
                    if (response.success && response.data.length > 0) {
                        self.renderSearchResults(response.data);
                    } else {
                        $results.html('<div class="no-results">Không tìm thấy bộ câu hỏi nào</div>');
                    }
                },
                error: function() {
                    $results.html('<div class="search-error">Lỗi tìm kiếm. Vui lòng thử lại.</div>');
                }
            });
        },
        
        renderSearchResults: function(quizzes) {
            const self = this;
            const $results = $('#quiz-search-results');
            
            let html = '<div class="search-results-list">';
            
            quizzes.forEach(function(quiz) {
                const isSelected = self.selectedQuizzes.some(q => q.id === quiz.id);
                const selectedClass = isSelected ? 'selected' : '';
                const checkmark = isSelected ? '✓ ' : '';
                
                html += `
                    <div class="search-result-item ${selectedClass}" data-quiz-id="${quiz.id}">
                        <div class="quiz-info">
                            <h4>${checkmark}${quiz.title}</h4>
                            <p>${quiz.question_count} câu hỏi</p>
                        </div>
                        <button type="button" class="btn-select-quiz" data-quiz-id="${quiz.id}" data-quiz-title="${quiz.title}" data-question-count="${quiz.question_count}">
                            ${isSelected ? 'Bỏ chọn' : 'Chọn'}
                        </button>
                    </div>
                `;
            });
            
            html += '</div>';
            
            $results.html(html);
            
            // Bind click events
            $('.btn-select-quiz').on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const quizId = parseInt($(this).data('quiz-id'));
                const quizTitle = $(this).data('quiz-title');
                const questionCount = parseInt($(this).data('question-count'));
                
                self.toggleQuizSelection(quizId, quizTitle, questionCount);
            });
        },
        
        toggleQuizSelection: function(quizId, quizTitle, questionCount) {
            const index = this.selectedQuizzes.findIndex(q => q.id === quizId);
            
            if (index > -1) {
                // Remove from selection
                this.selectedQuizzes.splice(index, 1);
            } else {
                // Add to selection
                this.selectedQuizzes.push({
                    id: quizId,
                    title: quizTitle,
                    question_count: questionCount
                });
            }
            
            this.updateSelectedQuizzes();
            this.updateCreateButton();
            this.updateQuestionCountHint();
            
            // Update the search results to show checkmarks
            const $searchInput = $('#quiz-search-input');
            if ($searchInput.val().trim().length >= 1) {
                this.searchQuizzes($searchInput.val().trim());
            }
        },
        
        updateSelectedQuizzes: function() {
            const $container = $('#selected-quizzes');
            
            if (this.selectedQuizzes.length === 0) {
                $container.html('<p class="no-selection">Chưa chọn bộ câu hỏi nào</p>');
                return;
            }
            
            const self = this;
            let html = '<div class="selected-quiz-chips">';
            
            this.selectedQuizzes.forEach(function(quiz) {
                html += `
                    <div class="quiz-chip">
                        <span class="quiz-chip-title">${quiz.title}</span>
                        <span class="quiz-chip-count">(${quiz.question_count} câu)</span>
                        <button type="button" class="quiz-chip-remove" data-quiz-id="${quiz.id}">×</button>
                    </div>
                `;
            });
            
            html += '</div>';
            
            $container.html(html);
            
            // Bind remove events
            $('.quiz-chip-remove').on('click', function() {
                const quizId = parseInt($(this).data('quiz-id'));
                const quiz = self.selectedQuizzes.find(q => q.id === quizId);
                if (quiz) {
                    self.toggleQuizSelection(quizId, quiz.title, quiz.question_count);
                }
            });
        },
        
        updateQuestionCountHint: function() {
            const totalQuestions = this.selectedQuizzes.reduce((sum, quiz) => sum + quiz.question_count, 0);
            const $hint = $('#total-questions-hint');
            const questionCount = parseInt($('#question-count').val()) || 10;
            
            if (totalQuestions > 0) {
                $hint.text(`(Tổng số: ${totalQuestions} câu có sẵn)`);
                
                // Update max for input
                $('#question-count').attr('max', totalQuestions);
                
                // Adjust value if it exceeds total
                if (questionCount > totalQuestions) {
                    $('#question-count').val(totalQuestions);
                }
            } else {
                $hint.text('');
            }
        },
        
        updateCreateButton: function() {
            const $btn = $('#create-room-btn');
            
            if (this.selectedQuizzes.length > 0) {
                $btn.prop('disabled', false);
            } else {
                $btn.prop('disabled', true);
            }
        },
        
        createSession: function() {
            const self = this;
            const $btn = $('#create-room-btn');
            const $error = $('#form-error');
            
            // Validate
            if (this.selectedQuizzes.length === 0) {
                $error.text('Vui lòng chọn ít nhất một bộ câu hỏi').show();
                return;
            }
            
            const quizType = $('input[name="quiz_type"]:checked').val();
            const questionCount = quizType === 'random' ? parseInt($('#question-count').val()) : null;
            const sessionName = $('#session-name').val().trim();
            
            // Prepare quiz IDs
            const quizIds = this.selectedQuizzes.map(q => q.id);
            
            // Disable button and show loading
            $btn.prop('disabled', true).html('⏳ Đang tạo phòng...');
            $error.hide();
            
            // Create session via API
            $.ajax({
                url: window.liveQuizSetup.restUrl + '/sessions/create-frontend',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    quiz_ids: quizIds,
                    quiz_type: quizType,
                    question_count: questionCount,
                    session_name: sessionName
                }),
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', window.liveQuizSetup.nonce);
                },
                success: function(response) {
                    if (response.success) {
                        // Redirect to host page with session_id parameter
                        const sessionId = response.data ? response.data.session_id : response.session_id;
                        const currentUrl = window.location.href.split('?')[0];
                        window.location.href = currentUrl + '?session_id=' + sessionId;
                    } else {
                        $error.text(response.message || 'Lỗi tạo phòng').show();
                        $btn.prop('disabled', false).html('🚀 Tạo phòng');
                    }
                },
                error: function(xhr) {
                    let errorMsg = 'Lỗi tạo phòng. Vui lòng thử lại.';
                    
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    }
                    
                    $error.text(errorMsg).show();
                    $btn.prop('disabled', false).html('🚀 Tạo phòng');
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
