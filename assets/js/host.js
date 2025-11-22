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
        currentQuestionData: null, // Store current question data
        players: {},
        connectionId: null, // Track connection for multi-device enforcement
        selectedQuizzes: [],
        searchTimeout: null,
        isConfigured: false,
        answeredPlayers: [], // Track players who answered current question
        timerInterval: null, // Track timer interval for stopping
        serverStartTime: null, // Server timestamp when question started
        displayStartTime: null, // Local timestamp when we start displaying
        autoNextTimeout: null, // Track auto next question timeout
        
        // Ping measurement
        pingInterval: null,
        lastPing: null,
        currentPing: null,
        
        // Clock synchronization
        clockOffset: 0, // Difference between server time and client time
        syncAttempts: 0,
        maxSyncAttempts: 5,
        
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

            // Ensure session_id is present in URL so refresh stays in this room
            this.ensureSessionIdInUrl();
            
            // Check if session is ended - show final leaderboard if so
            const session = window.liveQuizHostData.session;
            if (session && session.status === 'ended') {
                console.log('[HOST] Session is ended, showing final leaderboard');
                // Use setTimeout to ensure DOM is ready
                setTimeout(() => {
                    this.showFinalScreen();
                }, 100);
            }
            
            this.bindEvents();
            this.connectWebSocket();
        },

        ensureSessionIdInUrl: function() {
            if (!this.sessionId || typeof window.history?.replaceState !== 'function') {
                return;
            }

            try {
                const currentUrl = new URL(window.location.href);
                const currentParam = currentUrl.searchParams.get('session_id');

                if (currentParam === String(this.sessionId)) {
                    return; // Already set correctly
                }

                currentUrl.searchParams.set('session_id', this.sessionId);
                const newUrl = currentUrl.origin + currentUrl.pathname +
                    (currentUrl.searchParams.toString() ? '?' + currentUrl.searchParams.toString() : '') +
                    currentUrl.hash;

                window.history.replaceState(
                    { sessionId: this.sessionId },
                    '',
                    newUrl
                );

                console.log('[HOST] Added session_id to URL for refresh persistence');
            } catch (error) {
                console.error('[HOST] Failed to update URL with session_id:', error);
            }
        },
        
        showFinalScreen: function() {
            const self = this;
            const api = this.getApiConfig();
            if (!api) {
                console.error('[HOST] Cannot show final screen - API config not available');
                return;
            }
            
            console.log('[HOST] Fetching final leaderboard for ended session...');
            
            // Fetch leaderboard
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/leaderboard',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    if (response.success && response.leaderboard && response.leaderboard.length > 0) {
                        console.log('[HOST] Final leaderboard fetched, showing top 10 with podium');
                        self.showTop10WithPodium(response.leaderboard);
                    } else {
                        console.log('[HOST] No leaderboard data, showing empty final screen');
                        self.showScreen('host-final');
                    }
                },
                error: function(xhr) {
                    console.error('[HOST] Failed to fetch final leaderboard:', xhr);
                    self.showScreen('host-final');
                }
            });
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
            
            // Replay Session button
            $('#replay-session-btn').on('click', function(e) {
                e.preventDefault();
                console.log('[HOST] ===========================================');
                console.log('[HOST] Replay session button CLICK EVENT TRIGGERED');
                console.log('[HOST] ===========================================');
                self.replaySession();
            });
            
            // Replay Session button (on top3 screen)
            $('#replay-session-btn-top3').on('click', function(e) {
                e.preventDefault();
                console.log('[HOST] Replay session button (top3) clicked');
                self.replaySession();
            });
            
            // End Session button (on top3 screen)
            $('#end-session-btn-top3').on('click', function(e) {
                e.preventDefault();
                console.log('[HOST] End session button (top3) clicked');
                self.endSession();
            });
            
            // Summary button
            $('#summary-btn').on('click', function(e) {
                e.preventDefault();
                console.log('[HOST] Summary button clicked');
                self.showSummary();
            });
            
            // Summary modal close button
            $('.summary-modal-close').on('click', function(e) {
                e.preventDefault();
                self.closeSummary();
            });
            
            // Close modal when clicking backdrop
            $(document).on('click', '#summary-modal', function(e) {
                if (e.target.id === 'summary-modal') {
                    self.closeSummary();
                }
            });
            
            // Summary sort select
            $('#summary-sort').on('change', function(e) {
                self.sortSummary($(this).val());
            });
            
            // Debug: Check if buttons exist on load
            console.log('[HOST] Checking buttons on init...');
            console.log('[HOST] #end-session-btn exists:', $('#end-session-btn').length);
            console.log('[HOST] #end-session-btn element:', $('#end-session-btn')[0]);
            console.log('[HOST] #replay-session-btn exists:', $('#replay-session-btn').length);
            console.log('[HOST] #replay-session-btn-top3 exists:', $('#replay-session-btn-top3').length);
            console.log('[HOST] #end-session-btn-top3 exists:', $('#end-session-btn-top3').length);
            
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
            const hasQuizzes = this.selectedQuizzes.length > 0;
            const hasPlayers = Object.keys(this.players).length > 0;
            
            // Chỉ enable khi có cả người chơi và bộ câu hỏi
            if (hasQuizzes && hasPlayers) {
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
                
                // Start ping measurement
                self.startPingMeasurement();
                
                // Start clock synchronization
                self.startClockSync();
                
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
                self.stopPingMeasurement();
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
            
            // Listen for pong response to measure ping
            this.socket.on('pong_measure', function(data) {
                if (self.lastPing && data.timestamp === self.lastPing) {
                    const ping = Date.now() - self.lastPing;
                    self.updatePingDisplay(ping);
                }
            });
            
            // Listen for clock sync response
            this.socket.on('clock_sync_response', function(data) {
                self.handleClockSyncResponse(data);
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
            
            // Update start button based on both players and selected quizzes
            this.updateStartButton();
            
            // Update list
            if (players.length === 0) {
                $list.html('<p class="no-players">Chưa có người chơi nào tham gia</p>');
                return;
            }
            
            let html = '';
            players.forEach(function(player) {
                const playerId = player.user_id;
                const displayName = player.display_name || 'Player';
                const initial = displayName.charAt(0).toUpperCase();
                
                // Tách tên và username
                let nameText = displayName;
                let usernameText = '';
                const parenIndex = displayName.indexOf(' (@');
                if (parenIndex > 0) {
                    nameText = displayName.substring(0, parenIndex);
                    usernameText = displayName.substring(parenIndex + 3, displayName.length - 1); // Bỏ " (@" (3 ký tự) và ")"
                }
                
                html += `
                    <div class="player-item" data-player-id="${playerId}" data-player-name="${self.escapeHtml(displayName)}">
                        <div class="player-avatar">${initial}</div>
                        <div class="player-name">
                            <span class="name-text">${self.escapeHtml(nameText)}</span>
                            ${usernameText ? `<span class="username-text">@${self.escapeHtml(usernameText)}</span>` : ''}
                        </div>
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
            
            // Nút đã được disable nếu không đủ điều kiện, không cần validate thêm
            if (this.selectedQuizzes.length === 0) {
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
                        console.log('Settings saved, starting countdown...');
                        // Show countdown FIRST, then start quiz
                        self.showCountdownAndStartQuiz();
                        $('#end-session-btn').show();
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
            this.currentQuestionData = data; // Store full question data
            this.serverStartTime = data.start_time; // Store server timestamp
            this.displayStartTime = Date.now() / 1000; // Record when we start displaying
            
            // Hide leaderboard overlay if visible
            $('#leaderboard-overlay').fadeOut(300);
            
            // Show question immediately
            this.displayQuestionContent(data);
        },
        
        displayQuestionContent: function(data) {
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
            
            // Clear and hide choices container
            $('#choices-preview').html('').hide();
            
            // Display question immediately
            const self = this;
            $('.question-text').text(data.question.text);
            
            // After 3 seconds: show choices and start timer immediately
            setTimeout(() => {
                // Display choices
                self.displayChoices(data.question.choices);
                $('#choices-preview').show();
                
                // Start timer immediately when choices appear
                self.startTimer(data.question.time_limit);
            }, 3000);
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
            const minPoints = 0;
            const freezePeriod = 1; // 1 second freeze at max points
            
            // Timer should start from serverStartTime + 3 seconds (display delay)
            const startTimestamp = this.serverStartTime + 3;
            
            console.log('[HOST] ========================================');
            console.log('[HOST] Starting Timer');
            console.log('[HOST] Max points:', maxPoints);
            console.log('[HOST] Time limit:', seconds, 'seconds');
            console.log('[HOST] Server start time:', startTimestamp);
            console.log('[HOST] Current server time (sync):', this.getServerTime() / 1000);
            console.log('[HOST] Clock offset:', this.clockOffset, 'ms');
            console.log('[HOST] ========================================');
            
            $fill.css('width', '100%');
            
            // Clear any existing timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            this.timerInterval = setInterval(function() {
                // Use synchronized server time instead of local client time
                const nowSeconds = self.getServerTime() / 1000;
                const elapsed = Math.max(0, nowSeconds - startTimestamp);
                const remaining = Math.max(0, seconds - elapsed);
                
                if (remaining <= 0) {
                    clearInterval(self.timerInterval);
                    self.timerInterval = null;
                    $fill.css('width', '0%');
                    $text.text(minPoints + ' pts');
                    
                    // Auto end question and show correct answer
                    console.log('[HOST] Timer ended, auto-ending question');
                    self.autoEndQuestion();
                    return;
                }
                
                const percent = (remaining / seconds) * 100;
                $fill.css('width', percent + '%');
                
                // Freeze period: 1 second at max points, then linear decrease for remaining time
                const freezePeriod = 1; // 1 second freeze at max points
                let currentPoints;
                
                if (elapsed < freezePeriod) {
                    // During freeze period, stay at max points
                    currentPoints = maxPoints;
                } else {
                    // After freeze period, decrease linearly from maxPoints to 0 over remaining time
                    const decreaseTime = seconds - freezePeriod; // Time for decrease (e.g., 19 seconds)
                    const elapsedAfterFreeze = elapsed - freezePeriod;
                    const pointsPerSecond = maxPoints / decreaseTime;
                    currentPoints = Math.max(minPoints, Math.min(maxPoints, Math.floor(maxPoints - (elapsedAfterFreeze * pointsPerSecond))));
                }
                
                $text.text(currentPoints + ' pts');
                
                // Change color based on percentage of max points (works for both 1000 and 2000)
                const pointsPercentage = (currentPoints / maxPoints) * 100;
                if (pointsPercentage < 40) {
                    $text.css('color', '#dc3545');
                } else if (pointsPercentage < 70) {
                    $text.css('color', '#ffc107');
                } else {
                    $text.css('color', '#28a745');
                }
            }, 100);
        },
        
        handleAnswerSubmitted: function(data) {
            console.log('[HOST] ==========================================');
            console.log('[HOST] ANSWER SUBMITTED EVENT');
            console.log('[HOST] ==========================================');
            console.log('[HOST] User ID:', data.user_id);
            console.log('[HOST] Score:', data.score);
            console.log('[HOST] answered_count:', data.answered_count);
            console.log('[HOST] total_players:', data.total_players);
            console.log('[HOST] Ratio:', data.answered_count + '/' + data.total_players);
            console.log('[HOST] Full data:', data);
            console.log('[HOST] ==========================================');
            
            // Add player to answered list if not already there
            if (data.user_id && !this.answeredPlayers.includes(data.user_id)) {
                this.answeredPlayers.push(data.user_id);
                
                // Find player info and display with score
                const player = this.players[data.user_id];
                if (player) {
                    const score = data.score !== undefined ? data.score : 0;
                    console.log('[HOST] Displaying player with score:', score);
                    this.displayAnsweredPlayer(player, score);
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
        
        displayAnsweredPlayer: function(player, score) {
            const displayName = player.display_name || 'Player';
            const initial = displayName.charAt(0).toUpperCase();
            const $list = $('#answered-players-list');
            
            // Tách tên và username
            let nameText = displayName;
            let usernameText = '';
            const parenIndex = displayName.indexOf(' (@');
            if (parenIndex > 0) {
                nameText = displayName.substring(0, parenIndex);
                usernameText = displayName.substring(parenIndex + 3, displayName.length - 1);
            }
            
            const playerHtml = `
                <div class="answered-player-item" data-player-id="${player.user_id}" data-score="${score}">
                    <div class="answered-player-avatar">${initial}</div>
                    <div class="answered-player-name">
                        <span class="name-text">${this.escapeHtml(nameText)}</span>
                        ${usernameText ? `<span class="username-text">${this.escapeHtml(usernameText)}</span>` : ''}
                    </div>
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
                    // handleQuestionEnd will show leaderboard animation
                    // and auto trigger next question after animation
                    // No timeout needed here
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
            
            const self = this;
            
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
                
                console.log('[HOST] Correct answer shown');
                
                // After showing correct answer for 2 seconds, show leaderboard animation
                setTimeout(() => {
                    self.showLeaderboardAnimation(data);
                }, 2000);
            }, 1000);
        },
        
        showLeaderboardAnimation: function(data) {
            const self = this;
            console.log('[HOST] Starting leaderboard animation');
            console.log('[HOST] Data received:', data);
            
            // Cancel any pending auto next timeout
            if (this.autoNextTimeout) {
                clearTimeout(this.autoNextTimeout);
                this.autoNextTimeout = null;
                console.log('[HOST] Cancelled old auto next timeout');
            }
            
            // Get current leaderboard (before adding new scores)
            const leaderboard = data.leaderboard || [];
            console.log('[HOST] Leaderboard data:', leaderboard);
            console.log('[HOST] Leaderboard length:', leaderboard.length);
            
            if (leaderboard.length === 0) {
                console.error('[HOST] Leaderboard is empty!');
                // Hide overlay and continue
                $('#leaderboard-overlay').fadeOut(300);
                return;
            }
            
            // Get answered players with scores from this question
            const questionScores = {};
            $('.answered-player-item').each(function() {
                const userId = $(this).data('player-id');
                const score = parseInt($(this).data('score')) || 0;
                questionScores[userId] = score;
            });
            
            console.log('[HOST] Question scores:', questionScores);
            
            // Create leaderboard with old scores (subtract current question scores)
            const oldLeaderboard = leaderboard.map(entry => ({
                ...entry,
                old_score: entry.total_score - (questionScores[entry.user_id] || 0),
                new_score: entry.total_score,
                score_gain: questionScores[entry.user_id] || 0
            }));
            
            console.log('[HOST] Old leaderboard prepared:', oldLeaderboard);
            
            // Show overlay
            $('#leaderboard-overlay').fadeIn(300);
            
            // Step 1: Show current leaderboard (3 seconds)
            this.renderLeaderboard(oldLeaderboard, false);
            
            setTimeout(() => {
                // Step 2: Show +score for correct answers (1 second)
                this.showScoreGains(oldLeaderboard);
                
                setTimeout(() => {
                    // Step 3: Animate score addition and re-sort
                    this.animateScoreAddition(oldLeaderboard);
                }, 1000);
            }, 1000);
        },
        
        renderLeaderboard: function(leaderboard, showNewScores) {
            console.log('[HOST] renderLeaderboard called');
            console.log('[HOST] Leaderboard:', leaderboard);
            console.log('[HOST] showNewScores:', showNewScores);
            
            const $container = $('#animated-leaderboard');
            console.log('[HOST] Container found:', $container.length);
            
            $container.empty();
            
            if (!leaderboard || leaderboard.length === 0) {
                console.error('[HOST] No leaderboard data to render');
                $container.html('<p style="text-align: center; color: #999;">Chưa có dữ liệu xếp hạng</p>');
                return;
            }
            
            const displayData = showNewScores ? 
                [...leaderboard].sort((a, b) => b.new_score - a.new_score) :
                [...leaderboard].sort((a, b) => b.old_score - a.old_score);
            
            console.log('[HOST] Display data:', displayData);
            
            displayData.slice(0, 10).forEach((entry, index) => {
                const score = showNewScores ? entry.new_score : entry.old_score;
                const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                
                const displayName = entry.display_name || 'Player';
                // Tách tên và username
                let nameText = displayName;
                let usernameText = '';
                const parenIndex = displayName.indexOf(' (@');
                if (parenIndex > 0) {
                    nameText = displayName.substring(0, parenIndex);
                    usernameText = displayName.substring(parenIndex + 3, displayName.length - 1);
                }
                
                const html = `
                    <div class="leaderboard-item ${rankClass}" data-user-id="${entry.user_id}">
                        <div class="rank">#${index + 1}</div>
                        <div class="player-name">
                            <span class="name-text">${this.escapeHtml(nameText)}</span>
                            ${usernameText ? `<span class="username-text">${this.escapeHtml(usernameText)}</span>` : ''}
                        </div>
                        <div class="score-container">
                            <span class="current-score">${score}</span>
                            <span class="score-gain" style="display: none;">+${entry.score_gain}</span>
                        </div>
                    </div>
                `;
                $container.append(html);
                console.log('[HOST] Added item:', displayName, score);
            });
            
            console.log('[HOST] Render complete, items:', $container.children().length);
        },
        
        showScoreGains: function(leaderboard) {
            leaderboard.forEach(entry => {
                if (entry.score_gain > 0) {
                    const $item = $(`.leaderboard-item[data-user-id="${entry.user_id}"]`);
                    $item.find('.score-gain').fadeIn(300);
                }
            });
        },
        
        animateScoreAddition: function(leaderboard) {
            const self = this;
            
            // Fade out score gains and animate score increase
            leaderboard.forEach(entry => {
                if (entry.score_gain > 0) {
                    const $item = $(`.leaderboard-item[data-user-id="${entry.user_id}"]`);
                    const $scoreGain = $item.find('.score-gain');
                    const $currentScore = $item.find('.current-score');
                    
                    // Fade out +score
                    $scoreGain.fadeOut(500);
                    
                    // Animate score increase
                    $({ score: entry.old_score }).animate({ score: entry.new_score }, {
                        duration: 1000,
                        step: function(now) {
                            $currentScore.text(Math.round(now));
                        }
                    });
                }
            });
            
            // After animation, re-sort
            setTimeout(() => {
                self.reorderLeaderboard(leaderboard);
                
                // Hide overlay and start next question after 3 seconds
                setTimeout(() => {
                    $('#leaderboard-overlay').fadeOut(300, () => {
                        // Auto trigger next question
                        console.log('[HOST] Leaderboard animation complete, triggering next question...');
                        self.autoNextQuestion();
                    });
                }, 3000);
            }, 1500);
        },
        
        reorderLeaderboard: function(leaderboard) {
            const $container = $('#animated-leaderboard');
            
            // Sort by new scores
            const sorted = [...leaderboard].sort((a, b) => b.new_score - a.new_score);
            
            // Store current positions
            const positions = [];
            sorted.slice(0, 10).forEach((entry, newIndex) => {
                const $item = $(`.leaderboard-item[data-user-id="${entry.user_id}"]`);
                const currentIndex = $item.index();
                positions.push({ $item, currentIndex, newIndex, entry });
            });
            
            // Calculate movements and reorder
            positions.forEach(({ $item, currentIndex, newIndex, entry }) => {
                if (currentIndex !== newIndex) {
                    // Get current position
                    const currentTop = $item.position().top;
                    
                    // Move in DOM
                    if (newIndex === 0) {
                        $container.prepend($item);
                    } else {
                        $container.children().eq(newIndex - 1).after($item);
                    }
                    
                    // Get new position
                    const newTop = $item.position().top;
                    const distance = currentTop - newTop;
                    
                    // Animate from old position to new position
                    $item.css({
                        'transform': `translateY(${distance}px)`,
                        'transition': 'none'
                    });
                    
                    // Trigger reflow
                    $item[0].offsetHeight;
                    
                    // Animate to new position
                    $item.css({
                        'transform': 'translateY(0)',
                        'transition': 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)'
                    });
                }
                
                // Update rank and styling
                $item.find('.rank').text('#' + (newIndex + 1));
                $item.removeClass('rank-1 rank-2 rank-3');
                if (newIndex === 0) $item.addClass('rank-1');
                else if (newIndex === 1) $item.addClass('rank-2');
                else if (newIndex === 2) $item.addClass('rank-3');
            });
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
        
        showCountdownAndStartQuiz: function() {
            const self = this;
            
            this.showScreen('host-countdown');
            
            // Emit countdown to all players
            if (this.socket && this.socket.connected) {
                console.log('[HOST] Emitting countdown 3 to all players');
                this.socket.emit('broadcast_countdown', { count: 3 });
            } else {
                console.warn('[HOST] WebSocket not connected, cannot broadcast countdown');
            }
            
            let count = 3;
            const countdownEl = document.getElementById('host-countdown-number');
            
            const interval = setInterval(() => {
                count--;
                if (countdownEl) {
                    countdownEl.textContent = count;
                }
                
                // Emit each countdown to players
                if (self.socket && self.socket.connected && count > 0) {
                    console.log('[HOST] Emitting countdown', count, 'to all players');
                    self.socket.emit('broadcast_countdown', { count: count });
                }
                
                if (count === 0) {
                    clearInterval(interval);
                    // After countdown, NOW start the quiz
                    console.log('[HOST] Countdown finished, starting quiz...');
                    self.startQuizAfterCountdown();
                }
            }, 1000);
        },
        
        startQuizAfterCountdown: function() {
            const self = this;
            const api = this.getApiConfig();
            if (!api) return;
            
            console.log('[HOST] Calling /start API...');
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/start',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    if (response.success) {
                        console.log('[HOST] Quiz started successfully');
                        // Question will be shown via WebSocket event
                    }
                },
                error: function(xhr) {
                    console.error('[HOST] Error starting quiz:', xhr);
                    alert('Có lỗi khi bắt đầu quiz: ' + (xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error'));
                }
            });
        },
        
        showFinalQuestionAnnouncement: function() {
            const self = this;
            this.showScreen('host-final-announcement');
            
            // Emit to all players
            if (this.socket) {
                this.socket.emit('broadcast_final_announcement', {});
            }
            
            // Show for 3 seconds then continue
            setTimeout(() => {
                // The question will be shown via WebSocket event
            }, 3000);
        },
        
        showTop10WithPodium: function(leaderboard) {
            const self = this;
            this.showScreen('host-top3');
            
            // Get top 10 from leaderboard
            const top10 = leaderboard.slice(0, 10);
            const top3 = leaderboard.slice(0, 3);
            
            // Emit to all players
            if (this.socket) {
                this.socket.emit('broadcast_top3', { top3: top10 });
            }
            
            // Display podium for top 3 on host screen
            const podiumEl = document.getElementById('host-top3-podium');
            if (podiumEl && top3.length > 0) {
                podiumEl.innerHTML = '';
                
                const medals = ['🥇', '🥈', '🥉'];
                const places = ['first', 'second', 'third'];
                
                top3.forEach((player, index) => {
                    const placeDiv = document.createElement('div');
                    placeDiv.className = `podium-place ${places[index]}`;
                    
                    const displayName = player.display_name || player.name || 'Player';
                    // Tách tên và username
                    let nameText = displayName;
                    let usernameText = '';
                    const parenIndex = displayName.indexOf(' (@');
                    if (parenIndex > 0) {
                        nameText = displayName.substring(0, parenIndex);
                        usernameText = displayName.substring(parenIndex + 3, displayName.length - 1);
                    }
                    
                    placeDiv.innerHTML = `
                        <div class="podium-medal">${medals[index]}</div>
                        <div class="podium-name">
                            <div>${this.escapeHtml(nameText)}</div>
                            ${usernameText ? `<div style="font-size: 0.8em; color: #888;">${this.escapeHtml(usernameText)}</div>` : ''}
                        </div>
                        <div class="podium-score">${Math.round(player.total_score || player.score || 0)} pts</div>
                        <div class="podium-stand">#${index + 1}</div>
                    `;
                    
                    podiumEl.appendChild(placeDiv);
                });
            }
            
            // Display ranks 4-10 below podium (top 3 already shown in podium)
            const listEl = document.getElementById('host-top10-list');
            if (listEl) {
                listEl.innerHTML = '';
                
                // Start from index 3 (rank 4) to show remaining players
                const remaining = top10.slice(3);
                remaining.forEach((player, index) => {
                    const actualRank = index + 4; // Ranks 4-10
                    const itemDiv = document.createElement('div');
                    itemDiv.className = `top10-item`;
                    
                    const displayName = player.display_name || player.name || 'Player';
                    // Tách tên và username
                    let nameText = displayName;
                    let usernameText = '';
                    const parenIndex = displayName.indexOf(' (@');
                    if (parenIndex > 0) {
                        nameText = displayName.substring(0, parenIndex);
                        usernameText = displayName.substring(parenIndex + 3, displayName.length - 1);
                    }
                    
                    itemDiv.innerHTML = `
                        <div class="top10-rank">#${actualRank}</div>
                        <div class="top10-name">
                            <div>${this.escapeHtml(nameText)}</div>
                            ${usernameText ? `<div style="font-size: 0.85em; color: #888;">${this.escapeHtml(usernameText)}</div>` : ''}
                        </div>
                        <div class="top10-score">${Math.round(player.total_score || player.score || 0)}</div>
                    `;
                    
                    listEl.appendChild(itemDiv);
                });
            }
            
            // Keep this screen permanently - no auto transition to host-final
            console.log('[HOST] Top 10 with podium displayed - staying on this screen');
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
            console.log('Leaderboard received:', data.leaderboard);
            
            // Cancel any pending auto next question
            if (this.autoNextTimeout) {
                clearTimeout(this.autoNextTimeout);
                this.autoNextTimeout = null;
                console.log('[HOST] Cancelled auto next question - session ended');
            }
            
            // Update final leaderboard
            this.updateLeaderboard(data.leaderboard, '#final-leaderboard');
            
            // Show top 10 with podium for top 3
            if (data.leaderboard && data.leaderboard.length > 0) {
                this.showTop10WithPodium(data.leaderboard);
            } else {
                this.showScreen('host-final');
            }
        },
        
        showSummary: function() {
            const self = this;
            const api = this.getApiConfig();
            
            if (!api || !this.sessionId) {
                console.error('[HOST] Cannot show summary - missing API config or session ID');
                return;
            }
            
            console.log('[HOST] Fetching session summary...');
            
            // Show modal
            const modal = document.getElementById('summary-modal');
            console.log('[HOST] Modal element:', modal);
            if (modal) {
                modal.style.display = 'flex';
                console.log('[HOST] Modal display set to flex');
            } else {
                console.error('[HOST] Modal element not found!');
                return;
            }
            
            // Fetch summary data
            $.ajax({
                url: api.apiUrl + '/sessions/' + this.sessionId + '/summary',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                success: function(response) {
                    if (response.success && response.questions) {
                        console.log('[HOST] Summary data fetched:', response);
                        self.summaryData = response.questions;
                        self.totalParticipants = response.total_participants;
                        self.displaySummary(response.questions, response.total_participants);
                    } else {
                        console.error('[HOST] Failed to fetch summary:', response);
                        self.displaySummaryError();
                    }
                },
                error: function(xhr) {
                    console.error('[HOST] Error fetching summary:', xhr);
                    self.displaySummaryError();
                }
            });
        },
        
        closeSummary: function() {
            const modal = document.getElementById('summary-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        },
        
        displaySummary: function(questions, totalParticipants) {
            console.log('[HOST] displaySummary called with', questions.length, 'questions');
            const $list = $('#summary-questions-list');
            console.log('[HOST] List element found:', $list.length);
            $list.empty();
            
            if (questions.length === 0) {
                $list.html('<div class="summary-empty"><p>Chưa có dữ liệu câu hỏi</p></div>');
                return;
            }
            
            questions.forEach(function(q, idx) {
                const percentage = q.correct_percentage || 0;
                const correctCount = q.correct_count || 0;
                const total = totalParticipants || 0;
                
                // Determine color based on percentage
                let colorClass = 'low';
                if (percentage >= 70) {
                    colorClass = 'high';
                } else if (percentage >= 40) {
                    colorClass = 'medium';
                }
                
                // Build choices HTML
                let choicesHtml = '';
                if (q.choices && q.choices.length > 0) {
                    choicesHtml = '<div class="summary-choices">';
                    q.choices.forEach(function(choice, choiceIdx) {
                        const isCorrect = choice.is_correct;
                        const choiceClass = isCorrect ? 'summary-choice-correct' : 'summary-choice';
                        const icon = isCorrect ? '✓' : '';
                        const choicePercentage = choice.percentage || 0;
                        
                        choicesHtml += `
                            <div class="${choiceClass}">
                                <div class="summary-choice-header">
                                    <span class="summary-choice-icon">${icon}</span>
                                    <span class="summary-choice-text">${this.escapeHtml(choice.text)}</span>
                                </div>
                                <div class="summary-choice-stats">
                                    <div class="summary-choice-bar">
                                        <div class="summary-choice-fill ${isCorrect ? 'correct' : 'incorrect'}" 
                                             style="width: ${choicePercentage}%"></div>
                                    </div>
                                    <span class="summary-choice-count">${choice.count}/${total} (${choicePercentage}%)</span>
                                </div>
                            </div>
                        `;
                    }.bind(this));
                    choicesHtml += '</div>';
                }
                
                const html = `
                    <div class="summary-question-item" data-index="${idx}">
                        <div class="summary-question-header">
                            <div class="summary-question-number">Câu ${q.index + 1}</div>
                            <div class="summary-question-text">${this.escapeHtml(q.question)}</div>
                        </div>
                        
                        ${choicesHtml}
                        
                        <div class="summary-question-stats">
                            <div class="summary-stats-bar">
                                <div class="summary-stats-fill ${colorClass}" style="width: ${percentage}%"></div>
                            </div>
                            <div class="summary-stats-text">
                                <span class="summary-correct-count">${correctCount}/${total} trả lời đúng</span>
                                <span class="summary-percentage ${colorClass}">${percentage}%</span>
                            </div>
                        </div>
                    </div>
                `;
                
                $list.append(html);
            }.bind(this));
        },
        
        displaySummaryError: function() {
            const $list = $('#summary-questions-list');
            $list.html('<div class="summary-error"><p>⚠️ Không thể tải dữ liệu. Vui lòng thử lại.</p></div>');
        },
        
        sortSummary: function(sortType) {
            if (!this.summaryData) {
                return;
            }
            
            let sorted = [...this.summaryData];
            
            switch(sortType) {
                case 'correct_asc':
                    // Sort by correct percentage (lowest first)
                    sorted.sort((a, b) => a.correct_percentage - b.correct_percentage);
                    break;
                case 'correct_desc':
                    // Sort by correct percentage (highest first)
                    sorted.sort((a, b) => b.correct_percentage - a.correct_percentage);
                    break;
                case 'order':
                default:
                    // Sort by question index (original order)
                    sorted.sort((a, b) => a.index - b.index);
                    break;
            }
            
            this.displaySummary(sorted, this.totalParticipants);
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
            
            // Disconnect socket immediately to prevent receiving any WebSocket events
            if (self.socket) {
                console.log('[HOST] Disconnecting WebSocket to prevent receiving events...');
                self.socket.disconnect();
            }
            
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
                    
                    // Redirect immediately (no need to wait)
                    console.log('[HOST] Redirecting to host page...');
                    const hostPageUrl = api.hostPageUrl || api.homeUrl || '/';
                    window.location.href = hostPageUrl;
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
        
        replaySession: function() {
            console.log('[HOST] ==========================================');
            console.log('[HOST] REPLAY SESSION BUTTON CLICKED');
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
            
            if (!confirm('Bạn có chắc chắn muốn chơi lại? Tất cả điểm số sẽ được reset và quay về phần setup phòng.')) {
                console.log('[HOST] User cancelled replay session');
                return;
            }
            
            const replayUrl = api.apiUrl + '/sessions/' + this.sessionId + '/replay';
            console.log('[HOST] Replaying session...', {
                sessionId: this.sessionId,
                url: replayUrl,
                method: 'POST'
            });
            
            // Disable the button to prevent multiple clicks
            $('#replay-session-btn').prop('disabled', true).text('Đang reset...');
            $('#replay-session-btn-top3').prop('disabled', true).text('Đang reset...');
            
            $.ajax({
                url: replayUrl,
                method: 'POST',
                headers: {
                    'X-WP-Nonce': api.nonce
                },
                timeout: 10000, // 10 second timeout
                success: function(response) {
                    console.log('[HOST] ==========================================');
                    console.log('[HOST] ✓ SESSION REPLAYED SUCCESSFULLY');
                    console.log('[HOST] ==========================================');
                    console.log('[HOST] Response:', response);
                    console.log('[HOST] Response status:', response.success);
                    console.log('[HOST] Response message:', response.message);
                    
                    // DO NOT reload immediately - wait a bit for WebSocket event to broadcast
                    console.log('[HOST] Waiting 500ms for event to broadcast...');
                    setTimeout(function() {
                        console.log('[HOST] Now reloading page to return to setup...');
                        location.reload();
                    }, 500);
                },
                error: function(xhr, status, error) {
                    console.error('[HOST] ==========================================');
                    console.error('[HOST] ✗ FAILED TO REPLAY SESSION');
                    console.error('[HOST] ==========================================');
                    console.error('[HOST] XHR Status:', xhr.status);
                    console.error('[HOST] Status Text:', xhr.statusText);
                    console.error('[HOST] Error:', error);
                    console.error('[HOST] Response Text:', xhr.responseText);
                    console.error('[HOST] Full XHR:', xhr);
                    
                    let errorMsg = 'Không thể chơi lại. ';
                    if (xhr.status === 0) {
                        errorMsg += 'Không thể kết nối đến server.';
                    } else if (xhr.status === 403) {
                        errorMsg += 'Không có quyền. Vui lòng đăng nhập lại.';
                    } else if (xhr.status === 404) {
                        errorMsg += 'Phòng không tồn tại.';
                    } else {
                        errorMsg += 'Lỗi: ' + (xhr.responseJSON?.message || xhr.statusText);
                    }
                    
                    $('#replay-session-btn').prop('disabled', false).text('🔄 Chơi lại');
                    $('#replay-session-btn-top3').prop('disabled', false).text('🔄 Chơi lại');
                    alert(errorMsg);
                }
            });
        },
        
        updateLeaderboard: function(players, selector) {
            const self = this;
            const $leaderboard = $(selector);
            let html = '';
            
            if (!players || players.length === 0) {
                html = '<p style="text-align: center; color: #999;">Chưa có dữ liệu</p>';
            } else {
                // Show top 10
                const top10 = players.slice(0, 10);
                top10.forEach(function(player, index) {
                    const topClass = index === 0 ? 'top-1' : (index === 1 ? 'top-2' : (index === 2 ? 'top-3' : ''));
                    const score = player.total_score || player.score || 0;
                    const displayName = player.display_name || player.name || 'Player';
                    
                    // Tách tên và username
                    let nameText = displayName;
                    let usernameText = '';
                    const parenIndex = displayName.indexOf(' (@');
                    if (parenIndex > 0) {
                        nameText = displayName.substring(0, parenIndex);
                        usernameText = displayName.substring(parenIndex + 3, displayName.length - 1);
                    }
                    
                    html += `
                        <div class="leaderboard-item ${topClass}">
                            <div class="leaderboard-rank">${index + 1}</div>
                            <div class="leaderboard-name">
                                <span class="name-text">${self.escapeHtml(nameText)}</span>
                                ${usernameText ? `<span class="username-text">${self.escapeHtml(usernameText)}</span>` : ''}
                            </div>
                            <div class="leaderboard-score">${Math.round(score)}</div>
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
        
        /**
         * Start ping measurement
         */
        startPingMeasurement: function() {
            const self = this;
            
            if (!this.socket) {
                return;
            }
            
            // Clear existing interval
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
            }
            
            // Measure ping every 2 seconds
            this.pingInterval = setInterval(function() {
                if (self.socket && self.socket.connected) {
                    self.lastPing = Date.now();
                    self.socket.emit('ping_measure', { timestamp: self.lastPing });
                }
            }, 2000);
            
            // Show ping indicator
            $('#host-ping-indicator').show();
        },
        
        /**
         * Stop ping measurement
         */
        stopPingMeasurement: function() {
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }
            
            // Hide ping indicator
            $('#host-ping-indicator').hide();
        },
        
        /**
         * Update ping display
         */
        updatePingDisplay: function(ping) {
            this.currentPing = ping;
            
            const $pingEl = $('#host-ping-indicator');
            if ($pingEl.length === 0) return;
            
            const $pingValue = $pingEl.find('.ping-value');
            $pingValue.text(ping);
        },
        
        /**
         * Start clock synchronization with server
         */
        startClockSync: function() {
            if (!this.socket || !this.socket.connected) {
                return;
            }
            
            console.log('[HOST] Starting clock synchronization...');
            this.syncAttempts = 0;
            this.syncClock();
        },
        
        /**
         * Sync clock with server (send request)
         */
        syncClock: function() {
            const self = this;
            
            if (this.syncAttempts >= this.maxSyncAttempts) {
                console.log('[HOST] Clock sync complete after', this.syncAttempts, 'attempts');
                console.log('[HOST] Final clock offset:', this.clockOffset, 'ms');
                return;
            }
            
            const clientTime = Date.now();
            this.syncAttempts++;
            
            console.log('[HOST] Clock sync attempt', this.syncAttempts, '- sending client_time:', clientTime);
            this.socket.emit('clock_sync_request', { client_time: clientTime });
        },
        
        /**
         * Handle clock sync response from server
         */
        handleClockSyncResponse: function(data) {
            const self = this;
            const clientTimeNow = Date.now();
            const clientTimeSent = data.client_time;
            const serverTime = data.server_time;
            
            // Calculate round-trip time
            const rtt = clientTimeNow - clientTimeSent;
            
            // Estimate one-way latency (half of RTT)
            const oneWayLatency = rtt / 2;
            
            // Calculate clock offset
            const estimatedServerTimeNow = serverTime + oneWayLatency;
            const offset = estimatedServerTimeNow - clientTimeNow;
            
            console.log('[HOST] Clock sync response:');
            console.log('  Client time sent:', clientTimeSent);
            console.log('  Server time:', serverTime);
            console.log('  Client time now:', clientTimeNow);
            console.log('  RTT:', rtt, 'ms');
            console.log('  One-way latency:', oneWayLatency, 'ms');
            console.log('  Calculated offset:', offset, 'ms');
            
            // Average the offset over multiple attempts
            if (this.syncAttempts === 1) {
                this.clockOffset = offset;
            } else {
                // Weighted average (give more weight to recent measurements)
                this.clockOffset = (this.clockOffset * 0.7) + (offset * 0.3);
            }
            
            console.log('[HOST] Clock offset updated to:', this.clockOffset, 'ms');
            
            // Continue syncing
            setTimeout(function() {
                self.syncClock();
            }, 200);
        },
        
        /**
         * Get synchronized server time
         * @returns {number} Estimated server time in milliseconds
         */
        getServerTime: function() {
            return Date.now() + this.clockOffset;
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
