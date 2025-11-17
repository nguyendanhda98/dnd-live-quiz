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
        answeredPlayers: [], // Track players who answered current question
        timerInterval: null, // Track timer interval for stopping
        
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
            
            // Hide search results when clicking outside
            $(document).on('click', function(e) {
                const $searchContainer = $('.quiz-search-container');
                if (!$searchContainer.is(e.target) && $searchContainer.has(e.target).length === 0) {
                    $('#lobby-quiz-results').hide();
                }
            });
            
            // Show search results when focusing on input
            $('#lobby-quiz-search').on('focus', function() {
                const term = $(this).val().trim();
                if (term.length >= 1) {
                    // Re-trigger search to show results
                    self.searchQuizzes(term);
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
            
            // Listen for answer submitted (WebSocket uses underscore, not colon)
            this.socket.on('answer_submitted', function(data) {
                console.log('[HOST] Received answer_submitted event:', data);
                self.handleAnswerSubmitted(data);
            });
            
            // Listen for question start (WebSocket uses underscore, not colon)
            this.socket.on('question_start', function(data) {
                console.log('[HOST] Received question_start event:', data);
                self.handleQuestionStart(data);
            });
            
            // Listen for question end
            this.socket.on('question_end', function(data) {
                console.log('[HOST] Received question_end event:', data);
                self.handleQuestionEnd(data);
            });
            
            // Listen for session end
            this.socket.on('session_end', function(data) {
                console.log('[HOST] Received session_end event:', data);
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
                        // REPLACE players (not merge) to ensure kicked players are removed
                        self.players = {};
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
                    <div class="player-item" data-player-id="${playerId}" data-player-name="${self.escapeHtml(player.display_name)}">
                        <div class="player-avatar">${initial}</div>
                        <div class="player-name">${self.escapeHtml(player.display_name)}</div>
                    </div>
                `;
            });
            
            $list.html(html);
            
            // Bind click event to show action menu
            $('.player-item').on('click', function(e) {
                e.preventDefault();
                const playerId = $(this).data('player-id');
                const playerName = $(this).data('player-name');
                self.showPlayerActionMenu(playerId, playerName, this);
            });
        },
        
        showPlayerActionMenu: function(playerId, playerName, playerElement) {
            const self = this;
            
            // Remove any existing modal
            $('.player-action-modal').remove();
            
            // Get player avatar initial
            const initial = playerName ? playerName.charAt(0).toUpperCase() : '?';
            
            // Create modal popup
            const modal = $(`
                <div class="player-action-modal">
                    <div class="modal-overlay"></div>
                    <div class="modal-content">
                        <button class="modal-close">&times;</button>
                        <div class="modal-player-info">
                            <div class="modal-player-avatar">${initial}</div>
                            <h3 class="modal-player-name">${self.escapeHtml(playerName)}</h3>
                        </div>
                        <div class="modal-actions">
                            <button class="modal-action-btn btn-kick" data-action="kick">
                                <span class="action-icon">✕</span>
                                <span class="action-text">Đá khỏi phòng</span>
                                <span class="action-desc">Loại người chơi ra khỏi phòng hiện tại</span>
                            </button>
                            <button class="modal-action-btn btn-ban-session" data-action="ban-session">
                                <span class="action-icon">🚫</span>
                                <span class="action-text">Cấm vào phòng</span>
                                <span class="action-desc">Không cho vào lại phòng này</span>
                            </button>
                            <button class="modal-action-btn btn-ban-permanent" data-action="ban-permanent">
                                <span class="action-icon">⛔</span>
                                <span class="action-text">Cấm vĩnh viễn</span>
                                <span class="action-desc">Không cho tham gia bất kỳ phòng nào</span>
                            </button>
                        </div>
                    </div>
                </div>
            `);
            
            // Add to body
            $('body').append(modal);
            
            // Animate in
            setTimeout(function() {
                modal.addClass('active');
            }, 10);
            
            // Bind action button clicks
            modal.find('.modal-action-btn').on('click', function(e) {
                e.preventDefault();
                const action = $(this).data('action');
                
                // Close modal
                modal.removeClass('active');
                setTimeout(function() {
                    modal.remove();
                }, 300);
                
                // Execute action
                switch(action) {
                    case 'kick':
                        self.kickPlayer(playerId, playerName);
                        break;
                    case 'ban-session':
                        self.banFromSession(playerId, playerName);
                        break;
                    case 'ban-permanent':
                        self.banPermanently(playerId, playerName);
                        break;
                }
            });
            
            // Close modal when clicking overlay or close button
            modal.find('.modal-overlay, .modal-close').on('click', function(e) {
                e.preventDefault();
                modal.removeClass('active');
                setTimeout(function() {
                    modal.remove();
                }, 300);
            });
            
            // Close on ESC key
            $(document).on('keydown.player-modal', function(e) {
                if (e.key === 'Escape') {
                    modal.removeClass('active');
                    setTimeout(function() {
                        modal.remove();
                        $(document).off('keydown.player-modal');
                    }, 300);
                }
            });
        },
        
        kickPlayer: function(playerId, playerName) {
            const self = this;
            
            // Confirm before kicking
            if (!confirm('Bạn có chắc muốn kick "' + playerName + '" khỏi phòng?')) {
                return;
            }
            
            const api = this.getApiConfig();
            if (!api) {
                alert('Không thể kick người chơi: API không khả dụng');
                return;
            }
            
            const kickUrl = api.apiUrl + '/sessions/' + this.sessionId + '/kick-player';
            console.log('[HOST] === KICKING PLAYER ===');
            console.log('[HOST] URL:', kickUrl);
            console.log('[HOST] Session ID:', this.sessionId);
            console.log('[HOST] Player ID:', playerId);
            console.log('[HOST] Player Name:', playerName);
            console.log('[HOST] API Config:', api);
            
            // Disable the kick button
            $('.btn-kick-player[data-player-id="' + playerId + '"]').prop('disabled', true);
            
            // Send kick request
            $.ajax({
                url: kickUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    user_id: playerId
                }),
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    console.log('[HOST] ✓ Player kicked successfully:', response);
                    
                    // Remove player from local list
                    delete self.players[playerId];
                    self.updatePlayersList(Object.values(self.players));
                    
                    // Show notification
                    self.showNotification('Đã kick "' + playerName + '" khỏi phòng', 'success');
                },
                error: function(xhr, status, error) {
                    console.error('[HOST] ✗ Error kicking player:', {
                        status: status,
                        error: error,
                        statusCode: xhr.status,
                        statusText: xhr.statusText,
                        response: xhr.responseJSON,
                        responseText: xhr.responseText
                    });
                    alert('Không thể kick người chơi: ' + (xhr.responseJSON?.message || error));
                    
                    // Re-enable button
                    $('.btn-kick-player[data-player-id="' + playerId + '"]').prop('disabled', false);
                }
            });
        },
        
        banFromSession: function(playerId, playerName) {
            const self = this;
            
            // Confirm before banning
            if (!confirm('Bạn có chắc muốn ban "' + playerName + '" khỏi phòng này?\n\nNgười chơi sẽ không thể tham gia lại phòng này.')) {
                return;
            }
            
            const api = this.getApiConfig();
            if (!api) {
                alert('Không thể ban người chơi: API không khả dụng');
                return;
            }
            
            const banUrl = api.apiUrl + '/sessions/' + this.sessionId + '/ban-from-session';
            console.log('[HOST] === BANNING FROM SESSION ===');
            console.log('[HOST] URL:', banUrl);
            console.log('[HOST] Player ID:', playerId);
            console.log('[HOST] Player Name:', playerName);
            
            // Send ban request
            $.ajax({
                url: banUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    user_id: playerId
                }),
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    console.log('[HOST] ✓ Player banned from session:', response);
                    
                    // Remove player from local list
                    delete self.players[playerId];
                    self.updatePlayersList(Object.values(self.players));
                    
                    // Show notification
                    self.showNotification('Đã ban "' + playerName + '" khỏi phòng này', 'success');
                },
                error: function(xhr, status, error) {
                    console.error('[HOST] ✗ Error banning player:', xhr);
                    alert('Không thể ban người chơi: ' + (xhr.responseJSON?.message || error));
                }
            });
        },
        
        banPermanently: function(playerId, playerName) {
            const self = this;
            
            // Confirm before permanent ban
            if (!confirm('⚠️ BAN VĨNH VIỄN\n\nBạn có chắc muốn ban vĩnh viễn "' + playerName + '"?\n\nNgười chơi này sẽ KHÔNG THỂ tham gia BẤT KỲ phòng nào do bạn tạo ra.')) {
                return;
            }
            
            const api = this.getApiConfig();
            if (!api) {
                alert('Không thể ban người chơi: API không khả dụng');
                return;
            }
            
            const banUrl = api.apiUrl + '/sessions/' + this.sessionId + '/ban-permanently';
            console.log('[HOST] === BANNING PERMANENTLY ===');
            console.log('[HOST] URL:', banUrl);
            console.log('[HOST] Player ID:', playerId);
            console.log('[HOST] Player Name:', playerName);
            
            // Send ban request
            $.ajax({
                url: banUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    user_id: playerId
                }),
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    console.log('[HOST] ✓ Player banned permanently:', response);
                    
                    // Remove player from local list
                    delete self.players[playerId];
                    self.updatePlayersList(Object.values(self.players));
                    
                    // Show notification
                    self.showNotification('⛔ Đã ban vĩnh viễn "' + playerName + '"', 'warning');
                },
                error: function(xhr, status, error) {
                    console.error('[HOST] ✗ Error banning player permanently:', xhr);
                    alert('Không thể ban người chơi: ' + (xhr.responseJSON?.message || error));
                }
            });
        },
        
        showNotification: function(message, type) {
            // Create notification element
            const $notification = $('<div class="host-notification ' + type + '">' + message + '</div>');
            $('body').append($notification);
            
            // Show and auto-hide
            setTimeout(function() {
                $notification.addClass('show');
            }, 10);
            
            setTimeout(function() {
                $notification.removeClass('show');
                setTimeout(function() {
                    $notification.remove();
                }, 300);
            }, 3000);
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
            
            // Reset answered players list
            this.answeredPlayers = [];
            $('#answered-players-list').empty();
            
            // Show question screen first
            this.showScreen('host-question');
            
            // Reset stats
            $('#answer-stats').hide();
            $('#next-question-btn').hide();
            
            // Reset answer count display
            $('.answer-count-display').hide();
            $('.answer-count-text').text('0/0 đã trả lời');
            
            // Update question display
            $('.question-number').text('Câu ' + (data.question_index + 1));
            
            // Clear choices container
            $('#choices-preview').html('');
            
            // Typewriter effect for question text
            const self = this;
            const questionElement = $('.question-text')[0];
            
            if (questionElement) {
                console.log('Starting typewriter effect for:', data.question.text);
                this.typewriterEffect(questionElement, data.question.text, 50, () => {
                    console.log('Typewriter complete, displaying choices');
                    // Display choices after question is fully displayed
                    self.displayChoices(data.question.choices);
                    
                    // Wait 1 second after choices are displayed, then start timer
                    setTimeout(() => {
                        self.startTimer(data.question.time_limit);
                    }, 1000);
                });
            } else {
                console.error('Question element not found!');
                // Fallback: display immediately
                $('.question-text').text(data.question.text);
                this.displayChoices(data.question.choices);
                setTimeout(() => {
                    self.startTimer(data.question.time_limit);
                }, 1000);
            }
        },
        
        /**
         * Typewriter effect - display text character by character
         * @param {HTMLElement} element - Element to display text in
         * @param {string} text - Text to display
         * @param {number} speed - Speed in milliseconds per character
         * @param {function} callback - Callback function when complete
         */
        typewriterEffect: function(element, text, speed, callback) {
            let index = 0;
            element.textContent = '';
            
            function typeNextCharacter() {
                if (index < text.length) {
                    element.textContent += text.charAt(index);
                    index++;
                    setTimeout(typeNextCharacter, speed);
                } else if (callback) {
                    callback();
                }
            }
            
            typeNextCharacter();
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
            
            const maxPoints = 1000;
            const pointsPerSecond = 50;
            const startTime = Date.now();
            const endTime = startTime + (seconds * 1000);
            
            $fill.css('width', '100%');
            
            // Clear any existing timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            this.timerInterval = setInterval(function() {
                const now = Date.now();
                const remaining = Math.max(0, (endTime - now) / 1000);
                
                if (remaining <= 0) {
                    clearInterval(self.timerInterval);
                    self.timerInterval = null;
                    $fill.css('width', '0%');
                    $text.text('0 pts');
                    
                    // Auto end question and show correct answer
                    console.log('[HOST] Timer ended, auto-ending question');
                    self.autoEndQuestion();
                    return;
                }
                
                const percent = (remaining / seconds) * 100;
                $fill.css('width', percent + '%');
                
                // Calculate points (1000 - 50 per second)
                const elapsedSeconds = seconds - remaining;
                const currentPoints = Math.max(0, maxPoints - Math.floor(elapsedSeconds * pointsPerSecond));
                $text.text(currentPoints + ' pts');
                
                // Change color based on points
                if (currentPoints < 200) {
                    $text.css('color', '#dc3545');
                } else if (currentPoints < 500) {
                    $text.css('color', '#ffc107');
                } else {
                    $text.css('color', '#28a745');
                }
            }, 100);
        },
        
        handleAnswerSubmitted: function(data) {
            console.log('Answer submitted:', data);
            
            // Add player to answered list if not already there
            if (data.user_id && !this.answeredPlayers.includes(data.user_id)) {
                this.answeredPlayers.push(data.user_id);
                
                // Find player info and display
                const player = this.players[data.user_id];
                if (player) {
                    this.displayAnsweredPlayer(player);
                }
            }
            
            // Update answer count display
            if (data.answered_count !== undefined && data.total_players !== undefined) {
                const $answerCount = $('.answer-count-display');
                const $answerText = $('.answer-count-text');
                
                $answerText.text(data.answered_count + '/' + data.total_players + ' đã trả lời');
                $answerCount.fadeIn();
                
                // If all players answered, animate timer to 0 then end question
                if (data.answered_count >= data.total_players && data.total_players > 0) {
                    console.log('All players answered! Animating timer to 0...');
                    
                    // Stop the current timer
                    if (this.timerInterval) {
                        clearInterval(this.timerInterval);
                        this.timerInterval = null;
                    }
                    
                    // Animate timer bar to 0 in 1 second
                    this.animateTimerToZero(1000, () => {
                        console.log('Timer reached 0, ending question...');
                        this.autoEndQuestion();
                    });
                }
            }
            
            // Update stats in real-time if needed
            this.updateAnswerStats();
        },
        
        animateTimerToZero: function(duration, callback) {
            const $fill = $('.timer-fill');
            const $text = $('.timer-text');
            
            // Get current width
            const currentWidth = parseFloat($fill.css('width')) || 0;
            const totalWidth = parseFloat($fill.parent().css('width')) || 1;
            const currentPercent = (currentWidth / totalWidth) * 100;
            
            console.log('[HOST] Animating timer from', currentPercent + '%', 'to 0% in', duration + 'ms');
            
            const startTime = Date.now();
            const startPercent = currentPercent;
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease out animation
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentPercent = startPercent * (1 - easeProgress);
                
                $fill.css('width', currentPercent + '%');
                
                // Update points text proportionally
                const currentPoints = Math.floor(currentPercent * 10);
                $text.text(currentPoints + ' pts');
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Ensure it's exactly 0
                    $fill.css('width', '0%');
                    $text.text('0 pts');
                    if (callback) callback();
                }
            };
            
            requestAnimationFrame(animate);
        },
        
        displayAnsweredPlayer: function(player) {
            const initial = player.display_name ? player.display_name.charAt(0).toUpperCase() : '?';
            const $list = $('#answered-players-list');
            
            const playerHtml = `
                <div class="answered-player-item" data-player-id="${player.user_id}">
                    <div class="answered-player-avatar">${initial}</div>
                    <div class="answered-player-name">${this.escapeHtml(player.display_name)}</div>
                </div>
            `;
            
            $list.append(playerHtml);
            
            // Animate in
            const $newItem = $list.find('.answered-player-item').last();
            $newItem.css('opacity', '0').animate({ opacity: 1 }, 300);
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
        
        autoEndQuestion: function() {
            const self = this;
            const api = this.getApiConfig();
            if (!api) return;
            
            console.log('[HOST] Auto-ending question...');
            
            // Call API to end question
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/end-question',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    console.log('[HOST] Question ended');
                    // handleQuestionEnd will show correct answer after 1 second
                    // Then we wait 5 more seconds before next question (total 6 seconds)
                    setTimeout(function() {
                        console.log('[HOST] 6 seconds passed (1s wait + 5s display), auto next question now...');
                        self.autoNextQuestion();
                    }, 6000); // 1 second wait + 5 seconds display
                },
                error: function(xhr) {
                    console.error('[HOST] Error ending question:', xhr);
                }
            });
        },
        
        autoNextQuestion: function() {
            const self = this;
            const api = this.getApiConfig();
            if (!api) return;
            
            console.log('[HOST] Auto next question...');
            
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/next',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    console.log('[HOST] Next question called');
                },
                error: function(xhr) {
                    console.log('[HOST] No more questions or session ended');
                    // If no more questions, session might have ended
                }
            });
        },
        
        handleQuestionEnd: function(data) {
            console.log('Question end event:', data);
            console.log('Correct answer index:', data.correct_answer);
            
            // Wait 1 second before showing correct answer
            setTimeout(() => {
                // Highlight correct answer in current screen
                const $correctChoice = $('.choice-preview-item').eq(data.correct_answer);
                $correctChoice.addClass('correct');
                $correctChoice.css({
                    'background': '#2ecc71',
                    'color': 'white',
                    'border-color': '#2ecc71',
                    'border-width': '5px',
                    'font-weight': 'bold'
                });
                
                // Add checkmark
                const originalText = $correctChoice.text();
                $correctChoice.html('✓ ' + originalText);
                
                console.log('[HOST] Correct answer shown, will auto-next in ~4 seconds...');
            }, 1000);
            
            // Note: After 5 seconds total (1s + 4s in autoEndQuestion) server will call next question
            // which will trigger handleQuestionStart again
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
