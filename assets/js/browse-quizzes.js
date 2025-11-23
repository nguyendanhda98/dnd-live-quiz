/**
 * Browse Quizzes JavaScript
 */

(function($) {
    'use strict';
    
    const BrowseQuizzes = {
        config: null,
        currentPage: 1,
        perPage: 12,
        searchTerm: '',
        sortBy: 'date_desc',
        minQuestions: null,
        maxQuestions: null,
        showAnswers: false,
        currentQuiz: null,
        
        init: function() {
            this.config = typeof liveQuizBrowse !== 'undefined' ? liveQuizBrowse : {};
            this.perPage = parseInt($('#live-quiz-quizzes-grid').data('per-page')) || 12;
            
            this.bindEvents();
            this.loadQuizzes();
        },
        
        bindEvents: function() {
            // Search
            $('#live-quiz-search-input').on('input', this.debounce(() => {
                this.searchTerm = $('#live-quiz-search-input').val().trim();
                this.currentPage = 1;
                this.loadQuizzes();
            }, 500));
            
            $('#live-quiz-search-clear').on('click', () => {
                $('#live-quiz-search-input').val('');
                this.searchTerm = '';
                this.currentPage = 1;
                this.loadQuizzes();
            });
            
            // Sort
            $('#live-quiz-sort').on('change', (e) => {
                this.sortBy = $(e.target).val();
                this.currentPage = 1;
                this.loadQuizzes();
            });
            
            // Question count filters
            $('#live-quiz-min-questions, #live-quiz-max-questions').on('input', this.debounce(() => {
                const min = $('#live-quiz-min-questions').val();
                const max = $('#live-quiz-max-questions').val();
                this.minQuestions = min ? parseInt(min) : null;
                this.maxQuestions = max ? parseInt(max) : null;
                this.currentPage = 1;
                this.loadQuizzes();
            }, 500));
            
            // Preview modal
            const self = this;
            $(document).on('click', '.live-quiz-quiz-card', function(e) {
                if ($(e.target).closest('.live-quiz-quiz-card-preview-btn').length) {
                    e.stopPropagation();
                    return;
                }
                const quizId = $(this).data('quiz-id');
                console.log('Card clicked, quiz ID:', quizId);
                if (quizId) {
                    self.showPreview(quizId);
                } else {
                    console.error('No quiz ID found on card');
                }
            });
            
            $(document).on('click', '.live-quiz-quiz-card-preview-btn', function(e) {
                e.stopPropagation();
                const quizId = $(this).closest('.live-quiz-quiz-card').data('quiz-id');
                console.log('Preview button clicked, quiz ID:', quizId);
                if (quizId) {
                    self.showPreview(quizId);
                } else {
                    console.error('No quiz ID found on card');
                }
            });
            
            // Close modal
            $('#live-quiz-preview-close, .live-quiz-preview-modal-overlay').on('click', () => {
                this.closePreview();
            });
            
            // Toggle answers
            $('#live-quiz-toggle-answers').on('click', () => {
                this.toggleAnswers();
            });
            
            // Pagination
            $(document).on('click', '.live-quiz-pagination button', (e) => {
                e.preventDefault();
                const page = $(e.currentTarget).data('page');
                if (page && !$(e.currentTarget).is(':disabled')) {
                    this.currentPage = parseInt(page);
                    this.loadQuizzes();
                    $('html, body').animate({ scrollTop: $('.live-quiz-browse-wrapper').offset().top - 20 }, 300);
                }
            });
            
            // Close modal on ESC key
            $(document).on('keydown', (e) => {
                if (e.key === 'Escape' && $('#live-quiz-preview-modal').is(':visible')) {
                    this.closePreview();
                }
            });
        },
        
        loadQuizzes: function() {
            const $grid = $('#live-quiz-quizzes-grid');
            const $loading = $('#live-quiz-loading');
            const $noResults = $('#live-quiz-no-results');
            const $pagination = $('#live-quiz-pagination');
            
            $grid.hide();
            $noResults.hide();
            $pagination.hide();
            $loading.show();
            
            const params = {
                page: this.currentPage,
                per_page: this.perPage,
            };
            
            if (this.searchTerm) {
                params.search = this.searchTerm;
            }
            
            if (this.sortBy) {
                params.sort_by = this.sortBy;
            }
            
            if (this.minQuestions !== null) {
                params.min_questions = this.minQuestions;
            }
            
            if (this.maxQuestions !== null) {
                params.max_questions = this.maxQuestions;
            }
            
            // Ensure proper URL formatting
            let apiUrl = this.config.restUrl;
            if (apiUrl && !apiUrl.endsWith('/')) {
                apiUrl += '/';
            }
            
            $.ajax({
                url: apiUrl + 'quizzes',
                method: 'GET',
                data: params,
                beforeSend: (xhr) => {
                    xhr.setRequestHeader('X-WP-Nonce', this.config.nonce);
                }
            })
            .done((response) => {
                if (response.success && response.quizzes && response.quizzes.length > 0) {
                    this.renderQuizzes(response.quizzes);
                    this.renderPagination(response.current_page, response.pages, response.total);
                    $grid.show();
                    $pagination.show();
                } else {
                    $noResults.show();
                }
            })
            .fail((xhr, status, error) => {
                console.error('Error loading quizzes:', error);
                console.error('URL:', apiUrl + 'quizzes');
                console.error('Status:', xhr.status);
                console.error('Response:', xhr.responseText);
                $noResults.show();
                let errorMsg = this.config.i18n.error || 'Có lỗi xảy ra';
                if (xhr.status === 404) {
                    errorMsg += ' (Endpoint không tìm thấy. Vui lòng flush permalinks trong Settings > Permalinks)';
                }
                $noResults.html('<p>' + errorMsg + '</p>');
            })
            .always(() => {
                $loading.hide();
            });
        },
        
        renderQuizzes: function(quizzes) {
            const $grid = $('#live-quiz-quizzes-grid');
            $grid.empty();
            
            quizzes.forEach((quiz) => {
                const $card = $('<div>')
                    .addClass('live-quiz-quiz-card')
                    .attr('data-quiz-id', quiz.id);
                
                const $title = $('<h3>')
                    .addClass('live-quiz-quiz-card-title')
                    .text(quiz.title);
                
                const $description = $('<p>')
                    .addClass('live-quiz-quiz-card-description')
                    .text(quiz.description || '');
                
                const $meta = $('<div>')
                    .addClass('live-quiz-quiz-card-meta');
                
                const $questionCount = $('<span>')
                    .addClass('live-quiz-quiz-card-question-count')
                    .html('<span class="dashicons dashicons-editor-help"></span>' + 
                          quiz.question_count + ' ' + (this.config.i18n.questions || 'câu hỏi'));
                
                const $previewBtn = $('<button>')
                    .addClass('live-quiz-quiz-card-preview-btn')
                    .text(this.config.i18n.preview || 'Xem trước');
                
                $meta.append($questionCount).append($previewBtn);
                $card.append($title).append($description).append($meta);
                $grid.append($card);
            });
        },
        
        renderPagination: function(currentPage, totalPages, total) {
            const $pagination = $('#live-quiz-pagination');
            $pagination.empty();
            
            if (totalPages <= 1) {
                return;
            }
            
            // Previous button
            const $prev = $('<button>')
                .text('←')
                .attr('data-page', currentPage - 1)
                .prop('disabled', currentPage === 1);
            $pagination.append($prev);
            
            // Page numbers
            const maxVisible = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
            
            if (endPage - startPage < maxVisible - 1) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }
            
            if (startPage > 1) {
                const $first = $('<button>')
                    .text('1')
                    .attr('data-page', 1);
                $pagination.append($first);
                
                if (startPage > 2) {
                    $pagination.append($('<span>').text('...'));
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const $pageBtn = $('<button>')
                    .text(i)
                    .attr('data-page', i)
                    .toggleClass('active', i === currentPage);
                $pagination.append($pageBtn);
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    $pagination.append($('<span>').text('...'));
                }
                
                const $last = $('<button>')
                    .text(totalPages)
                    .attr('data-page', totalPages);
                $pagination.append($last);
            }
            
            // Next button
            const $next = $('<button>')
                .text('→')
                .attr('data-page', currentPage + 1)
                .prop('disabled', currentPage === totalPages);
            $pagination.append($next);
        },
        
        showPreview: function(quizId) {
            console.log('showPreview called with quizId:', quizId);
            
            if (!quizId) {
                console.error('No quiz ID provided');
                return;
            }
            
            const $modal = $('#live-quiz-preview-modal');
            if (!$modal.length) {
                console.error('Preview modal not found in DOM');
                return;
            }
            
            const $body = $modal.find('.live-quiz-preview-modal-body');
            
            if (!$body.length) {
                console.error('Modal body not found');
                return;
            }
            
            // Find questions container and show loading inside it, not replace the whole body
            const $questions = $body.find('#live-quiz-preview-questions');
            if ($questions.length) {
                $questions.html('<div class="live-quiz-loading"><div class="live-quiz-spinner"></div><p>' + (this.config.i18n.loading || 'Đang tải...') + '</p></div>');
            } else {
                // Fallback: replace body content
                const $loading = $('<div>').addClass('live-quiz-loading').html('<div class="live-quiz-spinner"></div><p>' + (this.config.i18n.loading || 'Đang tải...') + '</p>');
                $body.html($loading);
            }
            
            $modal.show();
            $('body').css('overflow', 'hidden');
            
            this.showAnswers = false;
            this.currentQuiz = null;
            
            // Ensure proper URL formatting
            let apiUrl = this.config.restUrl;
            if (apiUrl && !apiUrl.endsWith('/')) {
                apiUrl += '/';
            }
            
            console.log('Fetching quiz from:', apiUrl + 'quizzes/' + quizId);
            
            $.ajax({
                url: apiUrl + 'quizzes/' + quizId,
                method: 'GET',
                beforeSend: (xhr) => {
                    xhr.setRequestHeader('X-WP-Nonce', this.config.nonce);
                }
            })
            .done((response) => {
                console.log('Quiz preview response:', response);
                if (response && response.success && response.quiz) {
                    this.currentQuiz = response.quiz;
                    // Ensure modal is visible before rendering
                    $modal.show();
                    // Small delay to ensure DOM is ready
                    setTimeout(() => {
                        this.renderPreview(response.quiz);
                    }, 50);
                } else {
                    console.error('Invalid response format:', response);
                    let errorMsg = this.config.i18n.error || 'Có lỗi xảy ra';
                    if (response && response.message) {
                        errorMsg += ': ' + response.message;
                    }
                    $body.html('<p>' + errorMsg + '</p>');
                }
            })
            .fail((xhr, status, error) => {
                console.error('Error loading quiz preview:', error);
                console.error('URL:', apiUrl + 'quizzes/' + quizId);
                console.error('Status:', xhr.status);
                console.error('Response Text:', xhr.responseText);
                
                let errorMsg = this.config.i18n.error || 'Có lỗi xảy ra';
                if (xhr.status === 404) {
                    errorMsg += ' (Không tìm thấy quiz. Vui lòng kiểm tra lại ID)';
                } else if (xhr.status === 403) {
                    errorMsg += ' (Không có quyền truy cập)';
                } else if (xhr.status === 500) {
                    errorMsg += ' (Lỗi server)';
                }
                
                // Try to parse error message from response
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    if (errorResponse && errorResponse.message) {
                        errorMsg += ': ' + errorResponse.message;
                    }
                } catch (e) {
                    // Ignore parse error
                }
                
                $body.html('<p>' + errorMsg + '</p>');
            });
        },
        
        renderPreview: function(quiz) {
            try {
                console.log('Rendering preview for quiz:', quiz);
                
                // Find elements fresh from DOM
                const $modal = $('#live-quiz-preview-modal');
                if (!$modal.length) {
                    console.error('Modal not found in DOM');
                    return;
                }
                
                // Find elements - try direct selectors first (more reliable)
                let $title = $('#live-quiz-preview-title');
                let $questionCount = $('#live-quiz-preview-question-count');
                let $questions = $('#live-quiz-preview-questions');
                let $toggleBtn = $('#live-quiz-toggle-answers');
                
                // If not found, try within modal
                if (!$title.length) {
                    $title = $modal.find('#live-quiz-preview-title');
                }
                if (!$questionCount.length) {
                    $questionCount = $modal.find('#live-quiz-preview-question-count');
                }
                if (!$questions.length) {
                    $questions = $modal.find('#live-quiz-preview-questions');
                }
                if (!$toggleBtn.length) {
                    $toggleBtn = $modal.find('#live-quiz-toggle-answers');
                }
                
                console.log('Modal check:', {
                    modal: $modal.length,
                    title: $title.length,
                    questionCount: $questionCount.length,
                    questions: $questions.length,
                    toggleBtn: $toggleBtn.length
                });
                
                if (!$title.length) {
                    console.error('Title element not found');
                }
                if (!$questionCount.length) {
                    console.error('Question count element not found');
                }
                if (!$questions.length) {
                    console.error('Questions container not found');
                    return;
                }
                
                $title.text(quiz.title || 'Không có tiêu đề');
                $questionCount.text((quiz.question_count || 0) + ' ' + (this.config.i18n.questions || 'câu hỏi'));
                $toggleBtn.text(this.config.i18n.showAnswers || 'Hiện đáp án');
                
                $questions.empty();
                
                if (!quiz.questions || quiz.questions.length === 0) {
                    console.log('No questions found in quiz');
                    $questions.html('<p>' + (this.config.i18n.noQuizzes || 'Không có câu hỏi') + '</p>');
                    return;
                }
                
                console.log('Rendering ' + quiz.questions.length + ' questions');
                
                quiz.questions.forEach((question, index) => {
                    try {
                        const $questionDiv = $('<div>').addClass('live-quiz-preview-question');
                        
                        const $header = $('<div>').addClass('live-quiz-preview-question-header');
                        const $number = $('<span>')
                            .addClass('live-quiz-preview-question-number')
                            .text((this.config.i18n.question || 'Câu hỏi') + ' ' + (index + 1) + ' ' + (this.config.i18n.of || 'của') + ' ' + quiz.questions.length);
                        const $text = $('<div>')
                            .addClass('live-quiz-preview-question-text')
                            .text(question.text || '');
                        
                        $header.append($number).append($text);
                        
                        const $choices = $('<div>').addClass('live-quiz-preview-question-choices');
                        
                        if (question.choices && question.choices.length > 0) {
                            question.choices.forEach((choice, choiceIndex) => {
                                const $choice = $('<div>')
                                    .addClass('live-quiz-preview-choice')
                                    .text(choice.text || '');
                                
                                if (this.showAnswers && choice.is_correct) {
                                    $choice.addClass('correct');
                                }
                                
                                $choices.append($choice);
                            });
                        } else {
                            $choices.html('<p style="color: #999; font-style: italic;">Không có lựa chọn</p>');
                        }
                        
                        $questionDiv.append($header).append($choices);
                        $questions.append($questionDiv);
                    } catch (e) {
                        console.error('Error rendering question ' + index + ':', e);
                    }
                });
                
                console.log('Preview rendered successfully');
            } catch (e) {
                console.error('Error in renderPreview:', e);
                const $questions = $('#live-quiz-preview-questions');
                if ($questions.length) {
                    $questions.html('<p style="color: red;">Lỗi khi hiển thị preview: ' + e.message + '</p>');
                }
            }
        },
        
        toggleAnswers: function() {
            this.showAnswers = !this.showAnswers;
            const $toggleBtn = $('#live-quiz-toggle-answers');
            
            if (this.showAnswers) {
                $toggleBtn.text(this.config.i18n.hideAnswers || 'Ẩn đáp án');
            } else {
                $toggleBtn.text(this.config.i18n.showAnswers || 'Hiện đáp án');
            }
            
            if (this.currentQuiz) {
                this.renderPreview(this.currentQuiz);
            }
        },
        
        closePreview: function() {
            $('#live-quiz-preview-modal').hide();
            $('body').css('overflow', '');
            this.showAnswers = false;
            this.currentQuiz = null;
        },
        
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };
    
    // Initialize on document ready
    $(document).ready(function() {
        BrowseQuizzes.init();
        
        // Show/hide search clear button
        function toggleSearchClear() {
            const $input = $('#live-quiz-search-input');
            const $clear = $('#live-quiz-search-clear');
            if ($input.val().length > 0) {
                $clear.show();
            } else {
                $clear.hide();
            }
        }
        
        $('#live-quiz-search-input').on('input', toggleSearchClear);
        
        // Check on page load
        toggleSearchClear();
    });
    
})(jQuery);

