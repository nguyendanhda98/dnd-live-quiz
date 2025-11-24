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
        selectedCategories: [],
        allCategories: [],
        currentQuiz: null,
        showAnswers: false,
        selectedAnswers: {},
        hasSubmitted: false,
        score: null,
        
        init: function() {
            this.config = typeof liveQuizBrowse !== 'undefined' ? liveQuizBrowse : {};
            const defaultPerPage = parseInt($('#live-quiz-quizzes-grid').data('per-page')) || 12;
            this.perPage = defaultPerPage;
            
            // Set initial per-page value in select
            const $perPageSelect = $('#live-quiz-per-page');
            if ($perPageSelect.length) {
                $perPageSelect.val(this.perPage);
            }
            
            this.bindEvents();
            this.loadCategories();
            this.loadQuizzes();
        },
        
        loadCategories: function() {
            const self = this;
            let apiUrl = this.config.restUrl;
            if (apiUrl && !apiUrl.endsWith('/')) {
                apiUrl += '/';
            }
            
            $.ajax({
                url: apiUrl + 'categories',
                method: 'GET',
                beforeSend: (xhr) => {
                    xhr.setRequestHeader('X-WP-Nonce', this.config.nonce);
                }
            })
            .done((response) => {
                if (response.success && response.categories) {
                    self.allCategories = response.categories;
                    self.renderCategoryFilters();
                }
            })
            .fail((xhr, status, error) => {
                console.error('Error loading categories:', error);
            });
        },
        
        renderCategoryFilters: function() {
            const self = this;
            const $container = $('.live-quiz-filters');
            if ($container.length === 0 || this.allCategories.length === 0) {
                return;
            }
            
            // Check if category filter already exists
            if ($('#live-quiz-category-filter').length > 0) {
                return;
            }
            
            let html = '<div class="live-quiz-filter-group live-quiz-category-filter-wrapper" id="live-quiz-category-filter">';
            html += '<label>Lọc theo thẻ:</label>';
            html += '<select id="live-quiz-category-select" class="live-quiz-category-select" style="width: 100%;">';
            html += '<option value="">-- Chọn thẻ --</option>';
            this.allCategories.forEach((category) => {
                html += '<option value="' + this.escapeHtml(category) + '">' + this.escapeHtml(category) + '</option>';
            });
            html += '</select>';
            html += '<div id="live-quiz-selected-categories-display" class="live-quiz-selected-categories-display">';
            html += '<p class="no-categories-selected">Chưa chọn thẻ nào</p>';
            html += '</div>';
            html += '</div>';
            
            // Insert before per-page selector
            const $perPageGroup = $container.find('.live-quiz-filter-group:has(#live-quiz-per-page)');
            if ($perPageGroup.length > 0) {
                $perPageGroup.before(html);
            } else {
                $container.append(html);
            }
            
            // Initialize Select2
            $('#live-quiz-category-select').select2({
                placeholder: '-- Chọn thẻ --',
                allowClear: false,
                width: '100%',
                language: {
                    noResults: function() {
                        return 'Không tìm thấy thẻ nào';
                    },
                    searching: function() {
                        return 'Đang tìm...';
                    }
                }
            });
            
            // When a category is selected
            $('#live-quiz-category-select').on('select2:select', function(e) {
                const category = e.params.data.id;
                
                if (!category || self.selectedCategories.includes(category)) {
                    // Reset select
                    $('#live-quiz-category-select').val('').trigger('change');
                    return;
                }
                
                // Add to selected categories
                self.selectedCategories.push(category);
                
                // Update display
                const $display = $('#live-quiz-selected-categories-display');
                if ($display.find('.no-categories-selected').length > 0) {
                    $display.find('.no-categories-selected').remove();
                }
                
                const $tag = $('<span>')
                    .addClass('live-quiz-selected-category-tag')
                    .attr('data-category', category)
                    .html(self.escapeHtml(category) + 
                          '<button type="button" class="remove-category-btn" data-category="' + self.escapeHtml(category) + '" title="Xóa thẻ">×</button>');
                $display.append($tag);
                
                // Reset select
                $('#live-quiz-category-select').val('').trigger('change');
                
                // Reload quizzes
                self.currentPage = 1;
                self.loadQuizzes();
            });
            
            // Remove category
            $(document).on('click', '.remove-category-btn', function(e) {
                e.stopPropagation();
                const category = $(this).data('category');
                
                const index = self.selectedCategories.indexOf(category);
                if (index > -1) {
                    self.selectedCategories.splice(index, 1);
                }
                
                // Remove from display
                $('#live-quiz-selected-categories-display').find('[data-category="' + self.escapeHtml(category) + '"]').remove();
                
                // Show "no categories" message if empty
                if (self.selectedCategories.length === 0) {
                    $('#live-quiz-selected-categories-display').html('<p class="no-categories-selected">Chưa chọn thẻ nào</p>');
                }
                
                // Reload quizzes
                self.currentPage = 1;
                self.loadQuizzes();
            });
        },
        
        escapeHtml: function(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, (m) => map[m]);
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
            
            // Per page selector
            $('#live-quiz-per-page').on('change', (e) => {
                this.perPage = parseInt($(e.target).val()) || 12;
                this.currentPage = 1;
                this.loadQuizzes();
                // Scroll to top of grid
                $('html, body').animate({ scrollTop: $('.live-quiz-browse-wrapper').offset().top - 20 }, 300);
            });
            
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
            
            // Selecting answers inside preview
            $(document).on('click', '.live-quiz-preview-choice', function() {
                const questionIndex = parseInt($(this).data('question-index'), 10);
                const choiceIndex = parseInt($(this).data('choice-index'), 10);
                
                if (!isNaN(questionIndex) && !isNaN(choiceIndex)) {
                    self.selectAnswer(questionIndex, choiceIndex);
                }
            });
            
            // Submit quiz answers
            $('#live-quiz-submit-quiz').on('click', () => {
                self.submitQuiz();
            });
            
            // Toggle answers
            $('#live-quiz-toggle-answers').on('click', () => {
                self.toggleAnswers();
            });
            
            // Retake quiz
            $('#live-quiz-retake-quiz').on('click', () => {
                self.resetQuizProgress();
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
            
            if (this.selectedCategories.length > 0) {
                params.categories = this.selectedCategories.join(',');
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
                console.log('Quizzes response:', response);
                if (response.success && response.quizzes && response.quizzes.length > 0) {
                    this.renderQuizzes(response.quizzes);
                    const total = response.total || response.quizzes.length;
                    const pages = response.pages || Math.ceil(total / this.perPage);
                    const currentPage = response.current_page || this.currentPage;
                    console.log('Pagination data:', { currentPage, pages, total, perPage: this.perPage, quizzesCount: response.quizzes.length });
                    this.renderPagination(currentPage, pages, total);
                    $grid.show();
                    $pagination.show();
                } else {
                    $noResults.show();
                    $pagination.hide();
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
                
                // Categories
                if (quiz.categories && quiz.categories.length > 0) {
                    const $categories = $('<div>')
                        .addClass('live-quiz-quiz-card-categories');
                    quiz.categories.forEach((category) => {
                        const $tag = $('<span>')
                            .addClass('live-quiz-category-tag')
                            .text(category);
                        $categories.append($tag);
                    });
                    $card.append($categories);
                }
                
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
            
            console.log('renderPagination called:', { currentPage, totalPages, total, perPage: this.perPage });
            
            // Show pagination info (always show, even if only 1 page)
            const startItem = total > 0 ? (currentPage - 1) * this.perPage + 1 : 0;
            const endItem = Math.min(currentPage * this.perPage, total);
            const $info = $('<div>')
                .addClass('live-quiz-pagination-info')
                .text(`Hiển thị ${startItem}-${endItem} của ${total} bộ câu hỏi`);
            $pagination.append($info);
            
            // Only show pagination buttons if more than 1 page
            if (totalPages <= 1) {
                console.log('Only 1 page, not showing pagination buttons');
                return;
            }
            
            // Create button container
            const $buttonContainer = $('<div>').addClass('live-quiz-pagination-buttons');
            
            // Previous button
            const $prev = $('<button>')
                .text('←')
                .attr('data-page', currentPage - 1)
                .prop('disabled', currentPage === 1);
            $buttonContainer.append($prev);
            
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
                $buttonContainer.append($first);
                
                if (startPage > 2) {
                    $buttonContainer.append($('<span>').text('...'));
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const $pageBtn = $('<button>')
                    .text(i)
                    .attr('data-page', i)
                    .toggleClass('active', i === currentPage);
                $buttonContainer.append($pageBtn);
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    $buttonContainer.append($('<span>').text('...'));
                }
                
                const $last = $('<button>')
                    .text(totalPages)
                    .attr('data-page', totalPages);
                $buttonContainer.append($last);
            }
            
            // Next button
            const $next = $('<button>')
                .text('→')
                .attr('data-page', currentPage + 1)
                .prop('disabled', currentPage === totalPages);
            $buttonContainer.append($next);
            
            $pagination.append($buttonContainer);
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
            
            this.currentQuiz = null;
            this.showAnswers = false;
            this.selectedAnswers = {};
            this.hasSubmitted = false;
            this.score = null;
            $('#live-quiz-retake-quiz').hide();
            $('#live-quiz-submit-quiz').prop('disabled', false).removeClass('disabled');
            $('#live-quiz-toggle-answers').prop('disabled', false).text(this.config.i18n.showAnswers || 'Hiện đáp án');
            this.showResultMessage(null);
            this.updateProgressIndicator();
            
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
                
                const $modal = $('#live-quiz-preview-modal');
                if (!$modal.length) {
                    console.error('Modal not found in DOM');
                    return;
                }
                
                let $title = $('#live-quiz-preview-title');
                let $questionCount = $('#live-quiz-preview-question-count');
                let $questions = $('#live-quiz-preview-questions');
                let $toggleBtn = $('#live-quiz-toggle-answers');
                
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
                
                if (!$title.length || !$questionCount.length || !$questions.length) {
                    console.error('Missing preview elements', {
                        title: $title.length,
                        questionCount: $questionCount.length,
                        questions: $questions.length,
                        toggleBtn: $toggleBtn.length
                    });
                    return;
                }
                
                const totalQuestions = quiz.questions ? quiz.questions.length : 0;
                $title.text(quiz.title || 'Không có tiêu đề');
                $questionCount.text(totalQuestions + ' ' + (this.config.i18n.questions || 'câu hỏi'));
                
                if ($toggleBtn.length) {
                    const toggleLabel = this.showAnswers ? (this.config.i18n.hideAnswers || 'Ẩn đáp án') : (this.config.i18n.showAnswers || 'Hiện đáp án');
                    $toggleBtn
                        .text(toggleLabel)
                        .prop('disabled', this.hasSubmitted);
                }
                
                $questions.empty();
                
                if (!totalQuestions) {
                    console.log('No questions found in quiz');
                    $questions.html('<p>' + (this.config.i18n.noQuizzes || 'Không có câu hỏi') + '</p>');
                    this.updateProgressIndicator();
                    return;
                }
                
                quiz.questions.forEach((question, index) => {
                    try {
                        const $questionDiv = $('<div>')
                            .addClass('live-quiz-preview-question')
                            .attr('data-question-index', index);
                        
                        const $header = $('<div>').addClass('live-quiz-preview-question-header');
                        const $number = $('<span>')
                            .addClass('live-quiz-preview-question-number')
                            .text((this.config.i18n.question || 'Câu hỏi') + ' ' + (index + 1) + (this.config.i18n.of || '/') + totalQuestions);
                        const $text = $('<div>')
                            .addClass('live-quiz-preview-question-text')
                            .text(question.text || '');
                        
                        $header.append($number).append($text);
                        
                        const $choices = $('<div>').addClass('live-quiz-preview-question-choices');
                        
                        if (question.choices && question.choices.length > 0) {
                            question.choices.forEach((choice, choiceIndex) => {
                                const $choice = $('<div>')
                                    .addClass('live-quiz-preview-choice')
                                    .attr('data-question-index', index)
                                    .attr('data-choice-index', choiceIndex)
                                    .text(choice.text || '');
                                
                                const isSelected = this.selectedAnswers[index] === choiceIndex;
                                if (isSelected) {
                                    $choice.addClass('selected');
                                }
                                
                                const shouldShowCorrect = this.showAnswers || this.hasSubmitted;
                                if (shouldShowCorrect && choice.is_correct) {
                                    $choice.addClass('correct');
                                }
                                
                                if (this.hasSubmitted && !choice.is_correct && isSelected) {
                                    $choice.addClass('incorrect');
                                }
                                
                                if (this.hasSubmitted) {
                                    $choice.addClass('disabled');
                                }
                                
                                $choices.append($choice);
                            });
                        } else {
                            $choices.html('<p style="color: #999; font-style: italic;">Không có lựa chọn</p>');
                        }
                        
                        $questionDiv.append($header).append($choices);
                        $questions.append($questionDiv);
                    } catch (err) {
                        console.error('Error rendering question ' + index + ':', err);
                    }
                });
                
                this.updateProgressIndicator();
                console.log('Preview rendered successfully');
            } catch (e) {
                console.error('Error in renderPreview:', e);
                const $questions = $('#live-quiz-preview-questions');
                if ($questions.length) {
                    $questions.html('<p style="color: red;">Lỗi khi hiển thị preview: ' + e.message + '</p>');
                }
            }
        },
        
        closePreview: function() {
            $('#live-quiz-preview-modal').hide();
            $('body').css('overflow', '');
            this.currentQuiz = null;
            this.showAnswers = false;
            this.selectedAnswers = {};
            this.hasSubmitted = false;
            this.score = null;
            $('#live-quiz-retake-quiz').hide();
            $('#live-quiz-submit-quiz').prop('disabled', false).removeClass('disabled');
            $('#live-quiz-toggle-answers')
                .prop('disabled', false)
                .text(this.config.i18n.showAnswers || 'Hiện đáp án');
            $('#live-quiz-preview-progress').text('');
            this.showResultMessage(null);
        },
        
        selectAnswer: function(questionIndex, choiceIndex) {
            if (!this.currentQuiz || this.hasSubmitted) {
                return;
            }
            
            this.selectedAnswers[questionIndex] = choiceIndex;
            
            const $question = $('.live-quiz-preview-question[data-question-index="' + questionIndex + '"]');
            if ($question.length) {
                $question.find('.live-quiz-preview-choice').removeClass('selected');
                $question.find('.live-quiz-preview-choice[data-choice-index="' + choiceIndex + '"]').addClass('selected');
            }
            
            this.updateProgressIndicator();
        },
        
        submitQuiz: function() {
            if (!this.currentQuiz || this.hasSubmitted) {
                return;
            }
            
            const totalQuestions = this.currentQuiz.questions.length;
            
            let correctAnswers = 0;
            this.currentQuiz.questions.forEach((question, index) => {
                const selected = this.selectedAnswers[index];
                if (typeof selected === 'undefined') {
                    return;
                }
                
                const choice = question.choices && question.choices[selected];
                if (choice && choice.is_correct) {
                    correctAnswers++;
                }
            });
            
            this.hasSubmitted = true;
            this.score = correctAnswers;
            this.renderPreview(this.currentQuiz);
            
            const scoreTemplate = this.config.i18n.score || 'Bạn trả lời đúng %correct%/%total% câu';
            const message = scoreTemplate
                .replace('%correct%', correctAnswers)
                .replace('%total%', totalQuestions);
            
            this.showResultMessage(message, 'success');
            $('#live-quiz-retake-quiz').show();
            $('#live-quiz-submit-quiz').prop('disabled', true).addClass('disabled');
            $('#live-quiz-toggle-answers').prop('disabled', true);
        },
        
        toggleAnswers: function() {
            if (!this.currentQuiz || this.hasSubmitted) {
                return;
            }
            
            this.showAnswers = !this.showAnswers;
            this.renderPreview(this.currentQuiz);
        },
        
        resetQuizProgress: function() {
            if (!this.currentQuiz) {
                return;
            }
            
            this.selectedAnswers = {};
            this.hasSubmitted = false;
            this.score = null;
            this.showAnswers = false;
            this.showResultMessage(null);
            $('#live-quiz-retake-quiz').hide();
            $('#live-quiz-submit-quiz').prop('disabled', false).removeClass('disabled');
            $('#live-quiz-toggle-answers').prop('disabled', false);
            this.renderPreview(this.currentQuiz);
        },
        
        updateProgressIndicator: function() {
            const $progress = $('#live-quiz-preview-progress');
            
            if (!$progress.length || !this.currentQuiz) {
                if ($progress.length) {
                    $progress.text('');
                }
                return;
            }
            
            const totalQuestions = this.currentQuiz.questions ? this.currentQuiz.questions.length : 0;
            if (!totalQuestions) {
                $progress.text('');
                return;
            }
            
            const answered = Object.keys(this.selectedAnswers).length;
            const template = this.config.i18n.progress || 'Đã chọn %answered%/%total% câu';
            const progressText = template
                .replace('%answered%', answered)
                .replace('%total%', totalQuestions);
            
            $progress.text(progressText);
        },
        
        showResultMessage: function(message, type = '') {
            const $result = $('#live-quiz-preview-result');
            
            if (!$result.length) {
                return;
            }
            
            $result.removeClass('is-success is-warning');
            
            if (!message) {
                $result.hide().text('');
                return;
            }
            
            if (type === 'success') {
                $result.addClass('is-success');
            } else if (type === 'warning') {
                $result.addClass('is-warning');
            }
            
            $result.text(message).show();
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

