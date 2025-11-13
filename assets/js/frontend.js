/**
 * Frontend JavaScript for Live Quiz
 * Handles create room form and quiz list
 */

(function($) {
    'use strict';
    
    // ============================================
    // CREATE ROOM FORM
    // ============================================
    
    const CreateRoomForm = {
        selectedQuizzes: [],
        searchTimeout: null,
        
        init: function() {
            if (!$('.live-quiz-create-room').length) {
                return;
            }
            
            this.bindEvents();
        },
        
        bindEvents: function() {
            const self = this;
            
            // Quiz search input
            $('#quiz-search').on('input', function() {
                const query = $(this).val().trim();
                
                clearTimeout(self.searchTimeout);
                
                if (query.length > 0) {
                    $('.quiz-search-dropdown').show();
                    $('.quiz-search-loading').show();
                    $('.quiz-search-results').empty();
                    $('.quiz-search-no-results').hide();
                    
                    self.searchTimeout = setTimeout(function() {
                        self.searchQuizzes(query);
                    }, 300);
                } else {
                    $('.quiz-search-dropdown').hide();
                }
            });
            
            // Click outside to close dropdown
            $(document).on('click', function(e) {
                if (!$(e.target).closest('.quiz-search-container').length) {
                    $('.quiz-search-dropdown').hide();
                }
            });
            
            // Question mode radio change
            $('input[name="question_mode"]').on('change', function() {
                if ($(this).val() === 'random') {
                    $('#random-question-count-group').show();
                    $('#question-count').prop('required', true);
                } else {
                    $('#random-question-count-group').hide();
                    $('#question-count').prop('required', false);
                }
            });
            
            // Form submit
            $('#live-quiz-create-room-form').on('submit', function(e) {
                e.preventDefault();
                self.submitForm();
            });
            
            // Copy room code
            $('#btn-copy-code').on('click', function() {
                const roomCode = $('#created-room-code').text();
                navigator.clipboard.writeText(roomCode).then(function() {
                    const $btn = $('#btn-copy-code');
                    const originalText = $btn.text();
                    $btn.text(liveQuizFrontend.i18n.copied);
                    setTimeout(function() {
                        $btn.text(originalText);
                    }, 2000);
                });
            });
            
            // Close modal
            $('#btn-close-modal, .modal-overlay').on('click', function() {
                $('#room-created-modal').hide();
                self.resetForm();
            });
        },
        
        searchQuizzes: function(query) {
            const self = this;
            
            $.ajax({
                url: liveQuizFrontend.apiUrl + '/quizzes/search',
                method: 'GET',
                data: { s: query },
                headers: {
                    'X-WP-Nonce': liveQuizFrontend.nonce
                },
                success: function(response) {
                    $('.quiz-search-loading').hide();
                    
                    if (response.success && response.quizzes.length > 0) {
                        self.renderSearchResults(response.quizzes);
                    } else {
                        $('.quiz-search-no-results').show();
                    }
                },
                error: function(xhr) {
                    $('.quiz-search-loading').hide();
                    console.error('Search error:', xhr);
                }
            });
        },
        
        renderSearchResults: function(quizzes) {
            const self = this;
            const $results = $('.quiz-search-results').empty();
            
            quizzes.forEach(function(quiz) {
                // Check if already selected
                const isSelected = self.selectedQuizzes.some(q => q.id === quiz.id);
                if (isSelected) {
                    return;
                }
                
                const $item = $('<div class="quiz-search-item"></div>');
                $item.html(`
                    <div class="quiz-search-title">${quiz.title}</div>
                    <div class="quiz-search-meta">${quiz.question_count} câu hỏi</div>
                `);
                
                $item.on('click', function() {
                    self.selectQuiz(quiz);
                    $('#quiz-search').val('');
                    $('.quiz-search-dropdown').hide();
                });
                
                $results.append($item);
            });
        },
        
        selectQuiz: function(quiz) {
            this.selectedQuizzes.push(quiz);
            this.renderSelectedQuizzes();
        },
        
        removeQuiz: function(quizId) {
            this.selectedQuizzes = this.selectedQuizzes.filter(q => q.id !== quizId);
            this.renderSelectedQuizzes();
        },
        
        renderSelectedQuizzes: function() {
            const self = this;
            const $container = $('#selected-quizzes').empty();
            
            if (this.selectedQuizzes.length === 0) {
                return;
            }
            
            this.selectedQuizzes.forEach(function(quiz) {
                const $item = $('<div class="selected-quiz-item"></div>');
                $item.html(`
                    <div class="selected-quiz-info">
                        <div class="selected-quiz-title">${quiz.title}</div>
                        <div class="selected-quiz-meta">${quiz.question_count} câu hỏi</div>
                    </div>
                    <button type="button" class="btn-remove-quiz" data-quiz-id="${quiz.id}">
                        <span>×</span>
                    </button>
                `);
                
                $item.find('.btn-remove-quiz').on('click', function() {
                    self.removeQuiz(quiz.id);
                });
                
                $container.append($item);
            });
        },
        
        submitForm: function() {
            const self = this;
            
            // Validate
            if (this.selectedQuizzes.length === 0) {
                this.showError(liveQuizFrontend.i18n.selectQuizError);
                return;
            }
            
            const questionMode = $('input[name="question_mode"]:checked').val();
            let questionCount = null;
            
            if (questionMode === 'random') {
                questionCount = parseInt($('#question-count').val());
                if (!questionCount || questionCount < 1) {
                    this.showError(liveQuizFrontend.i18n.questionCountError);
                    return;
                }
            }
            
            // Show loading
            this.showLoading(true);
            this.hideMessages();
            
            // Prepare data
            const data = {
                quiz_ids: this.selectedQuizzes.map(q => q.id),
                question_mode: questionMode,
                question_count: questionCount
            };
            
            // Submit
            $.ajax({
                url: liveQuizFrontend.apiUrl + '/sessions/create-frontend',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                headers: {
                    'X-WP-Nonce': liveQuizFrontend.nonce
                },
                success: function(response) {
                    self.showLoading(false);
                    
                    if (response.success) {
                        self.showSuccess(response);
                    } else {
                        self.showError(response.message || liveQuizFrontend.i18n.createError);
                    }
                },
                error: function(xhr) {
                    self.showLoading(false);
                    const message = xhr.responseJSON?.message || liveQuizFrontend.i18n.createError;
                    self.showError(message);
                }
            });
        },
        
        showSuccess: function(response) {
            // Update URL without reload using History API
            if (response.room_code) {
                const hostUrl = '/host/' + response.room_code;
                window.history.pushState({ 
                    sessionId: response.session_id, 
                    roomCode: response.room_code 
                }, '', hostUrl);
            }
            
            // Hide form container
            $('#create-room-form-container').hide();
            
            // Show host interface container với iframe
            const $hostContainer = $('#host-interface-container');
            const hostPageUrl = response.host_url || (window.location.origin + '/host/' + response.room_code);
            
            $hostContainer.html(`
                <div class="host-iframe-wrapper">
                    <div class="host-iframe-header">
                        <h3>Quản lý phòng: ${response.room_code}</h3>
                        <div class="host-iframe-actions">
                            <button class="btn-open-new-tab" id="btn-open-host-new-tab">
                                Mở trong tab mới
                            </button>
                            <button class="btn-close-host" id="btn-close-host">
                                Đóng
                            </button>
                        </div>
                    </div>
                    <iframe 
                        src="${hostPageUrl}" 
                        class="host-iframe"
                        frameborder="0"
                        width="100%"
                        height="800px"
                    ></iframe>
                </div>
            `);
            
            $hostContainer.show();
            
            // Bind events
            $('#btn-open-host-new-tab').on('click', function() {
                window.open(hostPageUrl, '_blank');
            });
            
            $('#btn-close-host').on('click', function() {
                if (confirm('Bạn có chắc muốn đóng? Phòng vẫn đang hoạt động.')) {
                    $hostContainer.hide();
                    $('#create-room-form-container').show();
                    self.resetForm();
                    // Restore original URL
                    window.history.pushState({}, '', window.location.pathname);
                }
            });
        },
        
        showError: function(message) {
            $('.form-error').text(message).show();
        },
        
        hideMessages: function() {
            $('.form-error, .form-success').hide();
        },
        
        showLoading: function(show) {
            if (show) {
                $('#btn-create-room').prop('disabled', true);
                $('#btn-create-room .btn-text').hide();
                $('#btn-create-room .btn-loading').show();
            } else {
                $('#btn-create-room').prop('disabled', false);
                $('#btn-create-room .btn-text').show();
                $('#btn-create-room .btn-loading').hide();
            }
        },
        
        resetForm: function() {
            this.selectedQuizzes = [];
            this.renderSelectedQuizzes();
            $('#quiz-search').val('');
            $('input[name="question_mode"][value="all"]').prop('checked', true);
            $('#random-question-count-group').hide();
            $('#question-count').val('');
            this.hideMessages();
        }
    };
    
    // ============================================
    // QUIZ LIST
    // ============================================
    
    const QuizList = {
        currentPage: 1,
        totalPages: 1,
        perPage: 10,
        
        init: function() {
            if (!$('.live-quiz-list-container').length) {
                return;
            }
            
            this.perPage = parseInt($('.live-quiz-list-container').data('per-page')) || 10;
            this.bindEvents();
            this.loadQuizzes();
        },
        
        bindEvents: function() {
            const self = this;
            
            // Per page change
            $('#quiz-per-page').on('change', function() {
                self.perPage = parseInt($(this).val());
                self.currentPage = 1;
                self.loadQuizzes();
            });
            
            // Pagination buttons
            $('#btn-first-page').on('click', function() {
                self.goToPage(1);
            });
            
            $('#btn-prev-page').on('click', function() {
                if (self.currentPage > 1) {
                    self.goToPage(self.currentPage - 1);
                }
            });
            
            $('#btn-next-page').on('click', function() {
                if (self.currentPage < self.totalPages) {
                    self.goToPage(self.currentPage + 1);
                }
            });
            
            $('#btn-last-page').on('click', function() {
                self.goToPage(self.totalPages);
            });
            
            // Current page input
            $('#current-page-input').on('change', function() {
                const page = parseInt($(this).val());
                if (page >= 1 && page <= self.totalPages) {
                    self.goToPage(page);
                } else {
                    $(this).val(self.currentPage);
                }
            });
        },
        
        loadQuizzes: function() {
            const self = this;
            
            $('.quiz-list-loading').show();
            $('.quiz-items').hide();
            $('.quiz-list-empty').hide();
            $('#quiz-list-pagination').hide();
            
            $.ajax({
                url: liveQuizFrontend.apiUrl + '/quizzes',
                method: 'GET',
                data: {
                    page: this.currentPage,
                    per_page: this.perPage
                },
                headers: {
                    'X-WP-Nonce': liveQuizFrontend.nonce
                },
                success: function(response) {
                    $('.quiz-list-loading').hide();
                    
                    if (response.success && response.quizzes.length > 0) {
                        self.renderQuizzes(response.quizzes);
                        self.updatePagination(response);
                    } else {
                        $('.quiz-list-empty').show();
                    }
                },
                error: function(xhr) {
                    $('.quiz-list-loading').hide();
                    console.error('Load quizzes error:', xhr);
                }
            });
        },
        
        renderQuizzes: function(quizzes) {
            const $container = $('.quiz-items').empty();
            
            quizzes.forEach(function(quiz) {
                const $item = $('<div class="quiz-item"></div>');
                
                const description = quiz.description || '';
                const descriptionHtml = description ? `<p class="quiz-description">${description}</p>` : '';
                
                $item.html(`
                    <div class="quiz-item-header">
                        <h3 class="quiz-title">${quiz.title}</h3>
                        <span class="quiz-date">${self.formatDate(quiz.created_date)}</span>
                    </div>
                    ${descriptionHtml}
                    <div class="quiz-item-meta">
                        <span class="quiz-question-count">
                            <span class="dashicons dashicons-editor-help"></span>
                            ${quiz.question_count} câu hỏi
                        </span>
                    </div>
                `);
                
                $container.append($item);
            });
            
            $container.show();
        },
        
        updatePagination: function(response) {
            this.currentPage = response.current_page;
            this.totalPages = response.pages;
            
            const from = (this.currentPage - 1) * this.perPage + 1;
            const to = Math.min(this.currentPage * this.perPage, response.total);
            
            $('.pagination-from').text(from);
            $('.pagination-to').text(to);
            $('.pagination-total').text(response.total);
            $('.total-pages').text(this.totalPages);
            $('#current-page-input').val(this.currentPage).attr('max', this.totalPages);
            
            // Update button states
            $('#btn-first-page, #btn-prev-page').prop('disabled', this.currentPage === 1);
            $('#btn-next-page, #btn-last-page').prop('disabled', this.currentPage === this.totalPages);
            
            $('#quiz-list-pagination').show();
        },
        
        goToPage: function(page) {
            this.currentPage = page;
            this.loadQuizzes();
            
            // Scroll to top
            $('html, body').animate({
                scrollTop: $('.live-quiz-list-container').offset().top - 100
            }, 300);
        },
        
        formatDate: function(dateString) {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
    };
    
    // ============================================
    // INITIALIZE
    // ============================================
    
    $(document).ready(function() {
        CreateRoomForm.init();
        QuizList.init();
    });
    
})(jQuery);
