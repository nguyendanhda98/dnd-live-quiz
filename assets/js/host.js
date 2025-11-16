/**
 * Host Interface JavaScript
 * 
 * @package LiveQuiz
 */

(function($) {
    'use strict';

    /**
     * Generate unique connection ID for this tab/device
     */
    function generateConnectionId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Host Controller
    const HostController = {
        sessionId: null,
        roomCode: null,
        socket: null,
        currentQuestionIndex: 0,
        players: {},
        connectionId: null, // Track connection for multi-device enforcement
        selectedQuizzes: [],
        searchTimeout: null,
        isConfigured: false,
        
        // Helper to get API config safely
        getApiConfig: function() {
            console.log('[HOST] Getting API config...');
            console.log('[HOST] window.liveQuizPlayer:', typeof window.liveQuizPlayer !== 'undefined' ? 'exists' : 'undefined');
            console.log('[HOST] liveQuizPlayer:', typeof liveQuizPlayer !== 'undefined' ? 'exists' : 'undefined');
            
            if (typeof window.liveQuizPlayer !== 'undefined') {
                console.log('[HOST] Using window.liveQuizPlayer');
                return window.liveQuizPlayer;
            }
            if (typeof liveQuizPlayer !== 'undefined') {
                console.log('[HOST] Using liveQuizPlayer');
                return liveQuizPlayer;
            }
            console.error('[HOST] API config not found!');
            console.error('[HOST] Available window properties:', Object.keys(window).filter(k => k.includes('Quiz')));
            return null;
        },
        
        init: function() {
            // Get session data from window
            if (typeof window.liveQuizHostData === 'undefined') {
                console.error('Host data not found');
                return;
            }
            
            this.sessionId = window.liveQuizHostData.sessionId;
            this.roomCode = window.liveQuizHostData.roomCode;
            
            // Generate connection ID for multi-device enforcement
            this.connectionId = generateConnectionId();
            console.log('[HOST] Generated connectionId:', this.connectionId);
            
            this.bindEvents();
            this.connectWebSocket();
        },
        
        bindEvents: function() {
            const self = this;
            
            // Start Quiz button
            $('#start-quiz-btn').on('click', function() {
                self.startQuiz();
            });
            
            // Next Question button
            $('#next-question-btn').on('click', function() {
                self.nextQuestion();
            });
            
            // Continue button (after showing results)
            $('#continue-btn').on('click', function() {
                self.nextQuestion();
            });
            
            // End Session button
            $('#end-session-btn').on('click', function(e) {
                e.preventDefault(); // Prevent any default behavior
                console.log('[HOST] ===========================================');
                console.log('[HOST] End session button CLICK EVENT TRIGGERED');
                console.log('[HOST] Button element:', this);
                console.log('[HOST] Button exists:', $('#end-session-btn').length);
                console.log('[HOST] ===========================================');
                self.endSession();
            });
            
            // Debug: Check if button exists on load
            console.log('[HOST] Checking end session button on init...');
            console.log('[HOST] #end-session-btn exists:', $('#end-session-btn').length);
            console.log('[HOST] #end-session-btn element:', $('#end-session-btn')[0]);
            
            // Settings Panel Events
            $('#lobby-quiz-search').on('input', function() {
                clearTimeout(self.searchTimeout);
                const term = $(this).val().trim();
                if (term.length >= 1) {
                    self.searchTimeout = setTimeout(function() {
                        self.searchQuizzes(term);
                    }, 300);
                } else {
                    $('#lobby-quiz-results').hide();
                }
            });
            
            $('input[name="lobby_quiz_type"]').on('change', function() {
                if ($(this).val() === 'random') {
                    $('#lobby-random-count').slideDown();
                } else {
                    $('#lobby-random-count').slideUp();
                }
            });
            
            // Enable start button when at least one quiz is selected
            $(document).on('change', '#lobby-selected-quizzes', function() {
                if (self.selectedQuizzes.length > 0) {
                    $('#start-quiz-btn').prop('disabled', false);
                } else {
                    $('#start-quiz-btn').prop('disabled', true);
                }
            });
        },
        
        searchQuizzes: function(term) {
            const self = this;
            const api = this.getApiConfig();
            if (!api) return;
            
            const $results = $('#lobby-quiz-results');
            
            $results.html('<div class="search-loading">Đang tìm...</div>').show();
            
            $.ajax({
                url: api.apiUrl + '/quizzes/search',
                method: 'GET',
                data: { s: term },
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    if (response.success && response.data.length > 0) {
                        self.renderQuizResults(response.data);
                    } else {
                        $results.html('<div class="no-results">Không tìm thấy</div>');
                    }
                },
                error: function() {
                    $results.html('<div class="error">Lỗi tìm kiếm</div>');
                }
            });
        },
        
        renderQuizResults: function(quizzes) {
            const self = this;
            const $results = $('#lobby-quiz-results');
            
            let html = '<div class="quiz-results-list">';
            quizzes.forEach(function(quiz) {
                const isSelected = self.selectedQuizzes.some(q => q.id === quiz.id);
                html += `
                    <div class="quiz-result-item ${isSelected ? 'selected' : ''}" data-quiz-id="${quiz.id}">
                        <span>${quiz.title} (${quiz.question_count} câu)</span>
                        <button class="btn-select-quiz" data-quiz-id="${quiz.id}" data-quiz-title="${quiz.title}" data-question-count="${quiz.question_count}">
                            ${isSelected ? 'Bỏ' : 'Chọn'}
                        </button>
                    </div>
                `;
            });
            html += '</div>';
            
            $results.html(html).show();
            
            $('.btn-select-quiz').on('click', function() {
                const quizId = parseInt($(this).data('quiz-id'));
                const quizTitle = $(this).data('quiz-title');
                const questionCount = parseInt($(this).data('question-count'));
                self.toggleQuizSelection(quizId, quizTitle, questionCount);
            });
        },
        
        toggleQuizSelection: function(quizId, quizTitle, questionCount) {
            const index = this.selectedQuizzes.findIndex(q => q.id === quizId);
            
            if (index > -1) {
                this.selectedQuizzes.splice(index, 1);
            } else {
                this.selectedQuizzes.push({
                    id: quizId,
                    title: quizTitle,
                    question_count: questionCount
                });
            }
            
            this.updateSelectedQuizzes();
            this.updateStartButton();
            
            // Refresh search results
            const term = $('#lobby-quiz-search').val().trim();
            if (term.length >= 1) {
                this.searchQuizzes(term);
            }
        },
        
        updateSelectedQuizzes: function() {
            const $container = $('#lobby-selected-quizzes');
            
            if (this.selectedQuizzes.length === 0) {
                $container.html('<p class="no-selection">Chưa chọn bộ câu hỏi</p>');
                return;
            }
            
            const self = this;
            let html = '<div class="selected-list">';
            this.selectedQuizzes.forEach(function(quiz) {
                html += `
                    <div class="selected-item">
                        <span>${quiz.title} (${quiz.question_count} câu)</span>
                        <button class="btn-remove" data-quiz-id="${quiz.id}">×</button>
                    </div>
                `;
            });
            html += '</div>';
            
            $container.html(html);
            
            $('.btn-remove').on('click', function() {
                const quizId = parseInt($(this).data('quiz-id'));
                const quiz = self.selectedQuizzes.find(q => q.id === quizId);
                if (quiz) {
                    self.toggleQuizSelection(quizId, quiz.title, quiz.question_count);
                }
            });
        },
        
        updateStartButton: function() {
            if (this.selectedQuizzes.length > 0) {
                $('#start-quiz-btn').prop('disabled', false);
            } else {
                $('#start-quiz-btn').prop('disabled', true);
            }
        },
        
        connectWebSocket: function() {
            const self = this;
            
            // Check if WebSocket is configured
            if (typeof liveQuizPlayer === 'undefined' || !liveQuizPlayer.wsUrl) {
                console.log('WebSocket not configured, using polling fallback');
                this.startPolling();
                return;
            }
            
            // Connect to WebSocket
            const hostToken = window.liveQuizHostData.hostToken || '';
            
            console.log('Host connecting with token:', {
                hasToken: !!hostToken,
                tokenLength: hostToken.length,
                sessionId: self.sessionId
            });
            
            this.socket = io(liveQuizPlayer.wsUrl, {
                auth: {
                    token: hostToken
                },
                transports: ['websocket', 'polling']
            });
            
            this.socket.on('connect', function() {
                console.log('Host WebSocket connected');
                self.showConnectionStatus('Đã kết nối', true);
                
                // Host must also join the session room to receive participant_joined events
                self.socket.emit('join_session', {
                    session_id: self.sessionId,
                    user_id: window.liveQuizHostData.hostUserId,
                    display_name: window.liveQuizHostData.hostName || 'Host',
                    connection_id: self.connectionId, // Track connection for multi-device enforcement
                    is_host: true // Mark this connection as host
                });
                
                console.log('[HOST] Joined session with connectionId:', self.connectionId);
                
                // Load participants immediately
                self.fetchPlayers();
            });
            
            this.socket.on('disconnect', function() {
                console.log('WebSocket disconnected');
                self.showConnectionStatus('Mất kết nối', false);
            });
            
            // Handle force_disconnect (multi-device enforcement)
            this.socket.on('force_disconnect', function(data) {
                console.log('[HOST] ========================================');
                console.log('[HOST] ✗ FORCE DISCONNECTED - Multi-device detected');
                console.log('[HOST] ========================================');
                console.log('[HOST] Reason:', data.reason);
                console.log('[HOST] Message:', data.message);
                console.log('[HOST] Timestamp:', new Date(data.timestamp).toLocaleString());
                console.log('[HOST] Session:', self.sessionId);
                console.log('[HOST] ConnectionId:', self.connectionId);
                
                // Disconnect socket
                if (self.socket) {
                    self.socket.disconnect();
                    self.socket = null;
                }
                
                console.log('[HOST] Redirecting to home page...');
                console.log('[HOST] ========================================');
                
                // Redirect to home page
                window.location.href = window.liveQuizHostData.homeUrl || '/';
            });
            
            // Listen for player join events
            this.socket.on('participant_joined', function(data) {
                console.log('Participant joined event received:', data);
                self.handlePlayerJoined(data);
            });
            
            // Listen for player leave events
            this.socket.on('participant_left', function(data) {
                console.log('Participant left event received:', data);
                self.handlePlayerLeft(data);
            });
            
            // Listen for answer submitted
            this.socket.on('answer:submitted', function(data) {
                self.handleAnswerSubmitted(data);
            });
            
            // Listen for question start
            this.socket.on('question:start', function(data) {
                self.handleQuestionStart(data);
            });
            
            // Listen for question end
            this.socket.on('question:end', function(data) {
                self.handleQuestionEnd(data);
            });
            
            // Listen for session end
            this.socket.on('session:ended', function(data) {
                self.handleSessionEnded(data);
            });
        },
        
        startPolling: function() {
            const self = this;
            
            // Fetch players immediately on load
            self.fetchPlayers();
            
            // Poll for players every 2 seconds
            setInterval(function() {
                self.fetchPlayers();
            }, 2000);
        },
        
        fetchPlayers: function() {
            const self = this;
            const api = this.getApiConfig();
            if (!api) return;
            
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/players',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    console.log('Fetched players:', response);
                    if (response.success && response.players) {
                        // Merge players into this.players to maintain WebSocket updates
                        response.players.forEach(function(player) {
                            const playerId = player.user_id;
                            self.players[playerId] = player;
                        });
                        self.updatePlayersList(Object.values(self.players));
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error fetching players:', error, xhr.responseJSON);
                }
            });
        },
        
        handlePlayerJoined: function(data) {
            console.log('Player joined:', data);
            const playerId = data.user_id;
            
            if (playerId) {
                this.players[playerId] = data;
                this.players[playerId].user_id = playerId;
                this.updatePlayersList(Object.values(this.players));
            } else {
                console.error('Player joined event missing user_id:', data);
            }
        },
        
        handlePlayerLeft: function(data) {
            console.log('Player left:', data);
            const playerId = data.user_id;
            if (playerId) {
                delete this.players[playerId];
                this.updatePlayersList(Object.values(this.players));
            }
        },
        
        updatePlayersList: function(players) {
            const self = this;
            const $list = $('#players-list');
            const $count = $('#player-count');
            
            // Update count
            $count.text(players.length);
            
            // Enable/disable start button
            if (players.length > 0) {
                $('#start-quiz-btn').prop('disabled', false);
            } else {
                $('#start-quiz-btn').prop('disabled', true);
            }
            
            // Update list
            if (players.length === 0) {
                $list.html('<p class="no-players">Chưa có người chơi nào tham gia</p>');
                return;
            }
            
            let html = '';
            players.forEach(function(player) {
                const playerId = player.user_id;
                const initial = player.display_name ? player.display_name.charAt(0).toUpperCase() : '?';
                html += `
                    <div class="player-item" data-player-id="${playerId}">
                        <div class="player-avatar">${initial}</div>
                        <div class="player-name">${self.escapeHtml(player.display_name)}</div>
                        <div class="player-status">✓ Sẵn sàng</div>
                    </div>
                `;
            });
            
            $list.html(html);
        },
        
        startQuiz: function() {
            const self = this;
            const api = this.getApiConfig();
            if (!api) return;
            
            // Validate settings
            if (this.selectedQuizzes.length === 0) {
                alert('Vui lòng chọn ít nhất một bộ câu hỏi');
                return;
            }
            
            // Collect settings
            const quizIds = this.selectedQuizzes.map(q => q.id);
            const quizType = $('input[name="lobby_quiz_type"]:checked').val();
            const questionCount = quizType === 'random' ? parseInt($('#lobby-question-count').val()) : null;
            const questionOrder = $('input[name="lobby_question_order"]:checked').val();
            const hideLeaderboard = $('#lobby-hide-leaderboard').is(':checked');
            const joiningOpen = $('#lobby-joining-open').is(':checked');
            const showPin = $('#lobby-show-pin').is(':checked');
            
            // Disable start button
            $('#start-quiz-btn').prop('disabled', true).text('⏳ Đang khởi động...');
            
            // First, update settings
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/settings',
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify({
                    quiz_ids: quizIds,
                    quiz_type: quizType,
                    question_count: questionCount,
                    question_order: questionOrder,
                    hide_leaderboard: hideLeaderboard,
                    joining_open: joiningOpen,
                    show_pin: showPin
                }),
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    if (response.success) {
                        // Then start the quiz
                        $.ajax({
                            url: api.apiUrl + '/sessions/' + self.sessionId + '/start',
                            method: 'POST',
                            headers: {
                                'X-WP-Nonce': api.nonce
                            },
                            success: function(response) {
                                if (response.success) {
                                    console.log('Quiz started');
                                    // Switch to question screen
                                    self.showScreen('host-question');
                                    $('#end-session-btn').show();
                                }
                            },
                            error: function(xhr) {
                                alert('Có lỗi khi bắt đầu quiz: ' + (xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error'));
                                $('#start-quiz-btn').prop('disabled', false).text('▶️ Bắt đầu Quiz');
                            }
                        });
                    }
                },
                error: function(xhr) {
                    alert('Lỗi lưu cấu hình: ' + (xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error'));
                    $('#start-quiz-btn').prop('disabled', false).text('▶️ Bắt đầu Quiz');
                }
            });
        },
        
        handleQuestionStart: function(data) {
            console.log('Question started:', data);
            
            this.currentQuestionIndex = data.question_index;
            
            // Update question display
            $('.question-number').text('Câu ' + (data.question_index + 1));
            $('.question-text').text(data.question.text);
            
            // Display choices
            this.displayChoices(data.question.choices);
            
            // Start timer
            this.startTimer(data.question.time_limit);
            
            // Show question screen
            this.showScreen('host-question');
            
            // Reset stats
            $('#answer-stats').hide();
            $('#next-question-btn').hide();
        },
        
        displayChoices: function(choices) {
            const $container = $('#choices-preview');
            let html = '';
            
            choices.forEach(function(choice, index) {
                html += `
                    <div class="choice-preview-item" data-choice-index="${index}">
                        ${choice.text}
                    </div>
                `;
            });
            
            $container.html(html);
        },
        
        startTimer: function(seconds) {
            const self = this;
            const $fill = $('.timer-fill');
            const $text = $('.timer-text');
            
            let remaining = seconds;
            $fill.css('width', '100%');
            $text.text(remaining + 's');
            
            const timer = setInterval(function() {
                remaining--;
                
                if (remaining <= 0) {
                    clearInterval(timer);
                    $fill.css('width', '0%');
                    $text.text('0s');
                    self.endQuestion();
                    return;
                }
                
                const percent = (remaining / seconds) * 100;
                $fill.css('width', percent + '%');
                $text.text(remaining + 's');
            }, 1000);
        },
        
        handleAnswerSubmitted: function(data) {
            console.log('Answer submitted:', data);
            // Update stats in real-time if needed
            this.updateAnswerStats();
        },
        
        fetchQuestionStats: function() {
            const self = this;
            const api = this.getApiConfig();
            if (!api) return;
            
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/question-stats',
                method: 'GET',
                data: {
                    question_index: this.currentQuestionIndex
                },
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    if (response.success && response.stats) {
                        self.displayAnswerStats(response.stats);
                    }
                }
            });
        },
        
        displayAnswerStats: function(stats) {
            const $container = $('#stats-bars');
            let html = '';
            
            stats.choices.forEach(function(choice, index) {
                const percent = stats.total > 0 ? (choice.count / stats.total * 100) : 0;
                const isCorrect = choice.is_correct ? ' correct' : '';
                
                html += `
                    <div class="stat-bar">
                        <div class="stat-label">Đáp án ${String.fromCharCode(65 + index)}</div>
                        <div class="stat-progress">
                            <div class="stat-fill${isCorrect}" style="width: ${percent}%">
                                <span class="stat-count">${choice.count}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            $container.html(html);
            $('#answer-stats').show();
        },
        
        showResults: function() {
            const self = this;
            const api = this.getApiConfig();
            if (!api) return;
            
            // End question first to calculate scores
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/end-question',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    console.log('Question ended');
                    $('#next-question-btn').show();
                }
            });
        },
        
        handleQuestionEnd: function(data) {
            console.log('Question end event:', data);
            
            // Highlight correct answer
            $('.choice-preview-item').eq(data.correct_answer).addClass('correct');
            
            // Show final stats
            this.displayAnswerStats(data.stats);
            
            // Show results screen
            this.showResultsScreen(data);
        },
        
        showResultsScreen: function(data) {
            // Update correct answer display
            const correctChoice = data.question ? data.question.choices[data.correct_answer] : null;
            if (correctChoice) {
                $('#correct-answer-text').text(correctChoice.text);
            }
            
            // Update leaderboard
            this.updateLeaderboard(data.leaderboard, '#host-leaderboard');
            
            // Show results screen
            this.showScreen('host-results');
        },
        
        nextQuestion: function() {
            const self = this;
            const api = this.getApiConfig();
            if (!api) return;
            
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/next',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    console.log('Next question');
                },
                error: function(xhr) {
                    console.log('No more questions or error:', xhr);
                }
            });
        },
        
        handleSessionEnded: function(data) {
            console.log('Session ended:', data);
            
            // Update final leaderboard
            this.updateLeaderboard(data.leaderboard, '#final-leaderboard');
            
            // Show final screen
            this.showScreen('host-final');
        },
        
        endSession: function() {
            console.log('[HOST] ==========================================');
            console.log('[HOST] END SESSION BUTTON CLICKED');
            console.log('[HOST] ==========================================');
            
            const self = this;
            const api = this.getApiConfig();
            
            if (!api) {
                console.error('[HOST] Failed to get API config!');
                alert('Không thể kết nối API. Vui lòng tải lại trang.');
                return;
            }
            
            console.log('[HOST] API Config:', {
                apiUrl: api.apiUrl,
                hasNonce: !!api.nonce,
                sessionId: this.sessionId
            });
            
            if (!confirm('Bạn có chắc chắn muốn kết thúc phòng này? Tất cả học viên sẽ bị đá ra.')) {
                console.log('[HOST] User cancelled end session');
                return;
            }
            
            const endUrl = api.apiUrl + '/sessions/' + this.sessionId + '/end';
            console.log('[HOST] Ending room and kicking all players...', {
                sessionId: this.sessionId,
                url: endUrl,
                method: 'POST'
            });
            
            // Disable the button to prevent multiple clicks
            $('#end-session-btn').prop('disabled', true).text('Đang kết thúc phòng...');
            
            $.ajax({
                url: endUrl,
                method: 'POST',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                timeout: 10000, // 10 second timeout
                success: function(response) {
                    console.log('[HOST] ✓ Room ended successfully');
                    console.log('[HOST] ✓ All players have been kicked');
                    console.log('[HOST] Response:', response);
                    
                    // Wait 1.5 seconds to ensure players receive kick event
                    setTimeout(function() {
                        console.log('[HOST] Redirecting to home...');
                        // Redirect to host setup page
                        window.location.href = '/host';
                    }, 1500);
                },
                error: function(xhr, status, error) {
                    console.error('[HOST] ==========================================');
                    console.error('[HOST] ✗ FAILED TO END ROOM');
                    console.error('[HOST] ==========================================');
                    console.error('[HOST] XHR Status:', xhr.status);
                    console.error('[HOST] Status Text:', xhr.statusText);
                    console.error('[HOST] Error:', error);
                    console.error('[HOST] Response:', xhr.responseText);
                    console.error('[HOST] Full XHR:', xhr);
                    
                    let errorMsg = 'Không thể kết thúc phòng. ';
                    if (xhr.status === 0) {
                        errorMsg += 'Không thể kết nối đến server.';
                    } else if (xhr.status === 403) {
                        errorMsg += 'Không có quyền. Vui lòng đăng nhập lại.';
                    } else if (xhr.status === 404) {
                        errorMsg += 'Phòng không tồn tại.';
                    } else {
                        errorMsg += 'Lỗi: ' + (xhr.responseJSON?.message || xhr.statusText);
                    }
                    
                    $('#end-session-btn').prop('disabled', false).text('Kết thúc phiên');
                    alert(errorMsg);
                }
            });
        },
        
        updateLeaderboard: function(players, selector) {
            const $leaderboard = $(selector);
            let html = '';
            
            if (!players || players.length === 0) {
                html = '<p style="text-align: center; color: #999;">Chưa có dữ liệu</p>';
            } else {
                players.forEach(function(player, index) {
                    const topClass = index === 0 ? 'top-1' : (index === 1 ? 'top-2' : (index === 2 ? 'top-3' : ''));
                    html += `
                        <div class="leaderboard-item ${topClass}">
                            <div class="leaderboard-rank">${index + 1}</div>
                            <div class="leaderboard-name">${player.display_name}</div>
                            <div class="leaderboard-score">${Math.round(player.score)}</div>
                        </div>
                    `;
                });
            }
            
            $leaderboard.html(html);
        },
        
        showScreen: function(screenId) {
            $('.host-screen').removeClass('active');
            $('#' + screenId).addClass('active');
        },
        
        showConnectionStatus: function(text, connected) {
            const $status = $('#connection-status');
            const $icon = $status.find('.status-icon');
            const $text = $status.find('.status-text');
            
            $text.text(text);
            
            if (connected) {
                $icon.removeClass('disconnected');
            } else {
                $icon.addClass('disconnected');
            }
            
            $status.show();
            
            // Auto hide after 3 seconds if connected
            if (connected) {
                setTimeout(function() {
                    $status.fadeOut();
                }, 3000);
            }
        },
        
        escapeHtml: function(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, function(m) { return map[m]; });
        }
    };
    
    // Initialize when document is ready
    $(document).ready(function() {
        console.log('[HOST] ==========================================');
        console.log('[HOST] Document ready - Initializing HostController');
        console.log('[HOST] ==========================================');
        console.log('[HOST] liveQuizHostData exists:', typeof window.liveQuizHostData !== 'undefined');
        console.log('[HOST] live-quiz-host element exists:', $('#live-quiz-host').length);
        
        if (typeof window.liveQuizHostData !== 'undefined' && $('#live-quiz-host').length > 0) {
            console.log('[HOST] Initializing HostController...');
            HostController.init();
        } else {
            console.log('[HOST] Skipping HostController init (not on host page)');
        }
    });
    
})(jQuery);
