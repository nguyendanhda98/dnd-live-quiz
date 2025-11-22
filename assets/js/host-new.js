/**
 * Live Quiz Host JavaScript - Refactored Version using Shared Modules
 * 
 * Uses shared modules:
 * - QuizCore: Core functionality (state, timers, clock sync)
 * - QuizUI: UI rendering (questions, leaderboards, animations)
 * - QuizWebSocket: WebSocket connection and events
 * 
 * Host-specific functionality:
 * - Quiz selection and configuration
 * - Player management (kick, ban)
 * - Session controls (start, next, end, replay)
 * - Summary/statistics
 * 
 * @package LiveQuiz
 * @version 2.0.0
 */

(function($) {
    'use strict';
    
    // Host Controller
    const HostController = {
        // Host-specific state
        selectedQuizzes: [],
        searchTimeout: null,
        isConfigured: false,
        autoNextTimeout: null,
        
        // API config
        apiConfig: null,
        
        /**
         * Initialize host
         */
        init: function() {
            // Get session data from window
            if (typeof window.liveQuizHostData === 'undefined') {
                console.error('[HOST] Host data not found');
                return;
            }
            
            // Initialize QuizCore
            QuizCore.init('host', {
                sessionId: window.liveQuizHostData.sessionId,
                roomCode: window.liveQuizHostData.roomCode,
                userId: window.liveQuizHostData.hostUserId,
                displayName: window.liveQuizHostData.hostName || 'Host',
                websocketToken: window.liveQuizHostData.hostToken
            });
            
            console.log('[HOST] Initialized with session:', QuizCore.state.sessionId);
            
            // Get API config
            this.apiConfig = this.getApiConfig();
            
            // Ensure session_id is in URL
            this.ensureSessionIdInUrl();
            
            // Check if session is ended - show final leaderboard if so
            const session = window.liveQuizHostData.session;
            if (session && session.status === 'ended') {
                console.log('[HOST] Session is ended, showing final leaderboard');
                setTimeout(() => {
                    this.showFinalScreen();
                }, 100);
            }
            
            // Bind events
            this.bindEvents();
            
            // Connect WebSocket
            this.connectWebSocket();
        },
        
        /**
         * Get API config safely
         */
        getApiConfig: function() {
            if (typeof window.liveQuizPlayer !== 'undefined') {
                return window.liveQuizPlayer;
            }
            if (typeof liveQuizPlayer !== 'undefined') {
                return liveQuizPlayer;
            }
            console.error('[HOST] API config not found!');
            return null;
        },
        
        /**
         * Ensure session_id is in URL for refresh persistence
         */
        ensureSessionIdInUrl: function() {
            if (!QuizCore.state.sessionId || typeof window.history?.replaceState !== 'function') {
                return;
            }
            
            try {
                const currentUrl = new URL(window.location.href);
                const currentParam = currentUrl.searchParams.get('session_id');
                
                if (currentParam === String(QuizCore.state.sessionId)) {
                    return; // Already set
                }
                
                currentUrl.searchParams.set('session_id', QuizCore.state.sessionId);
                const newUrl = currentUrl.origin + currentUrl.pathname +
                    (currentUrl.searchParams.toString() ? '?' + currentUrl.searchParams.toString() : '') +
                    currentUrl.hash;
                
                window.history.replaceState(
                    { sessionId: QuizCore.state.sessionId },
                    '',
                    newUrl
                );
                
                console.log('[HOST] Added session_id to URL');
            } catch (error) {
                console.error('[HOST] Failed to update URL:', error);
            }
        },
        
        /**
         * Show final screen
         */
        showFinalScreen: function() {
            const self = this;
            
            if (!this.apiConfig) {
                console.error('[HOST] Cannot show final screen - API config not available');
                return;
            }
            
            console.log('[HOST] Fetching final leaderboard...');
            
            $.ajax({
                url: this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/leaderboard',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    if (response.success && response.leaderboard && response.leaderboard.length > 0) {
                        console.log('[HOST] Final leaderboard fetched');
                        self.showTop10WithPodium(response.leaderboard);
                    } else {
                        self.showScreen('host-final');
                    }
                },
                error: function(xhr) {
                    console.error('[HOST] Failed to fetch final leaderboard:', xhr);
                    self.showScreen('host-final');
                }
            });
        },
        
        /**
         * Bind event listeners
         */
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
            
            // End Session buttons
            $('#end-session-btn, #end-session-btn-top3').on('click', function(e) {
                e.preventDefault();
                console.log('[HOST] End session button clicked');
                self.endSession();
            });
            
            // Replay Session buttons
            $('#replay-session-btn, #replay-session-btn-top3').on('click', function(e) {
                e.preventDefault();
                console.log('[HOST] Replay session button clicked');
                self.replaySession();
            });
            
            // Summary button
            $('#summary-btn').on('click', function(e) {
                e.preventDefault();
                self.showSummary();
            });
            
            // Summary modal close
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
            
            // Enable start button when conditions are met
            $(document).on('change', '#lobby-selected-quizzes', function() {
                self.updateStartButton();
            });
        },
        
        /**
         * Connect to WebSocket
         */
        connectWebSocket: function() {
            const self = this;
            
            if (!this.apiConfig || !this.apiConfig.wsUrl) {
                console.log('[HOST] WebSocket not configured, using polling fallback');
                this.startPolling();
                return;
            }
            
            console.log('[HOST] Connecting to WebSocket...');
            
            QuizWebSocket.connect({
                url: this.apiConfig.wsUrl,
                token: QuizCore.state.websocketToken,
                sessionId: QuizCore.state.sessionId,
                userId: QuizCore.state.userId,
                displayName: QuizCore.state.displayName,
                isHost: true
            }, {
                pingElement: document.getElementById('host-ping-indicator'),
                
                onConnect: function() {
                    console.log('[HOST] WebSocket connected');
                    self.showConnectionStatus('Đã kết nối', true);
                    
                    // Load participants immediately
                    self.fetchPlayers();
                },
                
                onDisconnect: function() {
                    console.log('[HOST] WebSocket disconnected');
                    self.showConnectionStatus('Mất kết nối', false);
                },
                
                onForceDisconnect: function(data) {
                    console.log('[HOST] Force disconnected:', data);
                    if (QuizCore.state.socket) {
                        QuizCore.state.socket.disconnect();
                    }
                    window.location.href = window.liveQuizHostData.homeUrl || '/';
                },
                
                onParticipantJoined: function(data) {
                    console.log('[HOST] Participant joined:', data);
                    self.handlePlayerJoined(data);
                },
                
                onParticipantLeft: function(data) {
                    console.log('[HOST] Participant left:', data);
                    self.handlePlayerLeft(data);
                },
                
                onAnswerSubmitted: function(data) {
                    self.handleAnswerSubmitted(data);
                },
                
                onQuestionStart: function(data) {
                    self.handleQuestionStart(data);
                },
                
                onQuestionEnd: function(data) {
                    self.handleQuestionEnd(data);
                },
                
                onSessionEnd: function(data) {
                    self.handleSessionEnded(data);
                }
            });
        },
        
        // ========================================
        // WebSocket Event Handlers (using QuizUI)
        // ========================================
        
        /**
         * Handle question start (using QuizUI)
         */
        handleQuestionStart: function(data) {
            console.log('[HOST] Question started:', data);
            
            QuizCore.state.currentQuestion = data;
            QuizCore.state.questionStartTime = data.start_time;
            QuizCore.state.serverStartTime = data.start_time;
            QuizCore.state.timerAccelerated = false;
            
            // Hide leaderboard overlay
            $('#leaderboard-overlay').fadeOut(300);
            
            // Reset answered players
            QuizCore.resetForNewQuestion();
            $('#answered-players-list').empty();
            
            // Show question screen
            this.showScreen('host-question');
            
            // Reset stats and buttons
            $('#answer-stats').hide();
            $('#next-question-btn').hide();
            $('.answer-count-display').hide();
            $('.answer-count-text').text('0/0 đã trả lời');
            
            // Display question using QuizUI (host view - choices disabled)
            QuizUI.displayQuestion(data, {
                questionNumber: $('.question-number')[0],
                questionText: $('.question-text')[0],
                choicesContainer: $('#choices-preview')[0]
            }, true, null); // isHost=true, no onAnswerSelect
            
            // Start timer after 3 seconds (when choices appear)
            const self = this;
            setTimeout(function() {
                const DISPLAY_DELAY = 3;
                QuizCore.state.serverStartTime = data.start_time + DISPLAY_DELAY;
                
                QuizCore.startTimer(
                    data.question.time_limit,
                    {
                        fill: $('.timer-fill')[0],
                        text: $('.timer-text')[0]
                    },
                    null,
                    function() {
                        // Timer completed - auto end question
                        console.log('[HOST] Timer ended, auto-ending question');
                        self.autoEndQuestion();
                    }
                );
            }, 3000);
        },
        
        /**
         * Handle question end (using QuizUI)
         */
        handleQuestionEnd: function(data) {
            console.log('[HOST] Question end:', data);
            
            // Clear timer
            if (QuizCore.state.timerInterval) {
                clearInterval(QuizCore.state.timerInterval);
            }
            
            // Wait 1 second before showing correct answer
            const self = this;
            setTimeout(function() {
                // Show correct answer using QuizUI
                QuizUI.showCorrectAnswer(data.correct_answer, $('#choices-preview')[0]);
                
                console.log('[HOST] Correct answer shown');
                
                // After 2 seconds, show leaderboard animation
                setTimeout(function() {
                    QuizUI.showLeaderboardAnimation(
                        data,
                        $('#leaderboard-overlay')[0],
                        $('#animated-leaderboard')[0],
                        QuizCore.state.userId
                    );
                    
                    // Show next question button after animation
                    setTimeout(function() {
                        $('#next-question-btn').fadeIn();
                    }, 5000);
                }, 2000);
            }, 1000);
        },
        
        /**
         * Handle answer submitted
         */
        handleAnswerSubmitted: function(data) {
            console.log('[HOST] Answer submitted:', data);
            
            // Add player to answered list
            if (data.user_id && !QuizCore.state.answeredPlayers.includes(data.user_id)) {
                QuizCore.state.answeredPlayers.push(data.user_id);
                
                // Find player info
                const player = QuizCore.state.players[data.user_id];
                if (player) {
                    QuizUI.displayAnsweredPlayer(player, data.score || 0, $('#answered-players-list')[0]);
                }
            }
            
            // Update answer count
            if (data.answered_count !== undefined && data.total_players !== undefined) {
                QuizUI.updateAnswerCount(
                    data.answered_count,
                    data.total_players,
                    $('.answer-count-display')[0],
                    $('.answer-count-text')[0]
                );
                
                // If all players answered, accelerate timer
                if (data.answered_count >= data.total_players && data.total_players > 0) {
                    console.log('[HOST] All players answered - accelerating timer');
                    QuizCore.accelerateTimerToZero({
                        fill: $('.timer-fill')[0],
                        text: $('.timer-text')[0]
                    });
                    
                    // Auto end question after timer reaches 0
                    const self = this;
                    setTimeout(function() {
                        self.autoEndQuestion();
                    }, 1500); // 1.5s for animation
                }
            }
        },
        
        /**
         * Handle session ended
         */
        handleSessionEnded: function(data) {
            console.log('[HOST] Session ended:', data);
            
            if (data.leaderboard && data.leaderboard.length > 0) {
                this.showTop10WithPodium(data.leaderboard);
            } else {
                this.showScreen('host-final');
            }
        },
        
        /**
         * Show top 10 with podium (using QuizUI)
         */
        showTop10WithPodium: function(leaderboard) {
            this.showScreen('host-top3');
            
            QuizUI.displayTop10WithPodium(leaderboard, {
                podium: $('#host-top3-podium')[0],
                list: $('#host-top10-list')[0]
            }, QuizCore.state.userId);
        },
        
        // ========================================
        // Host-Specific Functions
        // ========================================
        
        /**
         * Start quiz
         */
        startQuiz: function() {
            const self = this;
            
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
            
            // Update settings
            $.ajax({
                url: this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/settings',
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
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    if (response.success) {
                        console.log('[HOST] Settings saved, starting countdown...');
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
        
        /**
         * Show countdown and start quiz
         */
        showCountdownAndStartQuiz: function() {
            const self = this;
            
            // Show countdown screen
            this.showScreen('host-countdown');
            
            let count = 3;
            $('#host-countdown-number').text(count);
            
            const countdownInterval = setInterval(function() {
                count--;
                if (count > 0) {
                    $('#host-countdown-number').text(count);
                } else {
                    clearInterval(countdownInterval);
                    // Start quiz via API
                    self.sendStartQuizCommand();
                }
            }, 1000);
        },
        
        /**
         * Send start quiz command
         */
        sendStartQuizCommand: function() {
            $.ajax({
                url: this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/start',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    console.log('[HOST] Quiz started:', response);
                },
                error: function(xhr) {
                    alert('Lỗi bắt đầu quiz: ' + (xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error'));
                }
            });
        },
        
        /**
         * Next question
         */
        nextQuestion: function() {
            $.ajax({
                url: this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/next',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    console.log('[HOST] Next question:', response);
                },
                error: function(xhr) {
                    alert('Lỗi chuyển câu hỏi: ' + (xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error'));
                }
            });
        },
        
        /**
         * Auto end question
         */
        autoEndQuestion: function() {
            $.ajax({
                url: this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/end-question',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    console.log('[HOST] Question ended:', response);
                },
                error: function(xhr) {
                    console.error('[HOST] Error ending question:', xhr);
                }
            });
        },
        
        /**
         * End session
         */
        endSession: function() {
            const self = this;
            
            if (!confirm('Bạn có chắc muốn kết thúc phiên này? Tất cả người chơi sẽ bị ngắt kết nối.')) {
                return;
            }
            
            console.log('[HOST] Ending session...');
            
            $.ajax({
                url: this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/end',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    console.log('[HOST] Session ended successfully:', response);
                    
                    // Redirect to quiz list
                    setTimeout(function() {
                        window.location.href = window.liveQuizHostData.homeUrl || '/';
                    }, 1000);
                },
                error: function(xhr) {
                    console.error('[HOST] Error ending session:', xhr);
                    alert('Lỗi kết thúc phiên: ' + (xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error'));
                }
            });
        },
        
        /**
         * Replay session
         */
        replaySession: function() {
            const self = this;
            
            if (!confirm('Bạn có muốn chơi lại? Điểm số sẽ được reset về 0.')) {
                return;
            }
            
            console.log('[HOST] Replaying session...');
            
            $.ajax({
                url: this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/replay',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    console.log('[HOST] Session replay initiated:', response);
                    // Return to lobby
                    self.showScreen('host-lobby');
                },
                error: function(xhr) {
                    console.error('[HOST] Error replaying session:', xhr);
                    alert('Lỗi chơi lại: ' + (xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error'));
                }
            });
        },
        
        /**
         * Show summary
         */
        showSummary: function() {
            // TODO: Implement summary modal
            console.log('[HOST] Show summary - not yet implemented');
        },
        
        /**
         * Close summary
         */
        closeSummary: function() {
            $('#summary-modal').fadeOut();
        },
        
        // ========================================
        // Player Management
        // ========================================
        
        /**
         * Fetch players
         */
        fetchPlayers: function() {
            const self = this;
            
            $.ajax({
                url: this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/players',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    if (response.success && response.players) {
                        // Replace players
                        QuizCore.state.players = {};
                        response.players.forEach(function(player) {
                            QuizCore.state.players[player.user_id] = player;
                        });
                        self.updatePlayersList(Object.values(QuizCore.state.players));
                    }
                },
                error: function(xhr) {
                    console.error('[HOST] Error fetching players:', xhr);
                }
            });
        },
        
        /**
         * Handle player joined
         */
        handlePlayerJoined: function(data) {
            console.log('[HOST] Player joined:', data);
            const playerId = data.user_id;
            
            if (playerId) {
                QuizCore.state.players[playerId] = data;
                this.updatePlayersList(Object.values(QuizCore.state.players));
            }
        },
        
        /**
         * Handle player left
         */
        handlePlayerLeft: function(data) {
            console.log('[HOST] Player left:', data);
            const playerId = data.user_id;
            
            if (playerId) {
                delete QuizCore.state.players[playerId];
                this.updatePlayersList(Object.values(QuizCore.state.players));
            }
        },
        
        /**
         * Update players list (using QuizUI)
         */
        updatePlayersList: function(players) {
            const $list = $('#players-list');
            const $count = $('#player-count');
            
            // Update count
            $count.text(players.length);
            
            // Update start button
            this.updateStartButton();
            
            // Update list using QuizUI
            QuizUI.updatePlayersList(players, $list[0], QuizCore.state.displayName);
            
            // Bind click events for player actions (host-specific)
            const self = this;
            $('.player-waiting-item').on('click', function() {
                // Get player from element
                const displayName = $(this).find('.name-text').text();
                const player = players.find(p => p.display_name.includes(displayName));
                if (player) {
                    self.showPlayerActionMenu(player.user_id, player.display_name, this);
                }
            });
        },
        
        /**
         * Show player action menu (host-specific)
         */
        showPlayerActionMenu: function(playerId, playerName, playerElement) {
            // TODO: Implement player action menu
            console.log('[HOST] Show player action menu:', playerId, playerName);
        },
        
        // ========================================
        // Quiz Selection
        // ========================================
        
        /**
         * Search quizzes
         */
        searchQuizzes: function(term) {
            const self = this;
            const $results = $('#lobby-quiz-results');
            
            $results.html('<div class="search-loading">Đang tìm...</div>').show();
            
            $.ajax({
                url: this.apiConfig.apiUrl + '/quizzes/search',
                method: 'GET',
                data: { s: term },
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
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
        
        /**
         * Render quiz results
         */
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
        
        /**
         * Toggle quiz selection
         */
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
        
        /**
         * Update selected quizzes display
         */
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
        
        /**
         * Update start button state
         */
        updateStartButton: function() {
            const hasQuizzes = this.selectedQuizzes.length > 0;
            const hasPlayers = Object.keys(QuizCore.state.players).length > 0;
            
            if (hasQuizzes && hasPlayers) {
                $('#start-quiz-btn').prop('disabled', false);
            } else {
                $('#start-quiz-btn').prop('disabled', true);
            }
        },
        
        // ========================================
        // Helper Functions
        // ========================================
        
        /**
         * Show screen
         */
        showScreen: function(screenId) {
            $('.host-screen').removeClass('active');
            $('#' + screenId).addClass('active');
        },
        
        /**
         * Show connection status
         */
        showConnectionStatus: function(message, success) {
            console.log('[HOST] Connection status:', message, success);
        },
        
        /**
         * Start polling (fallback)
         */
        startPolling: function() {
            const self = this;
            
            // Fetch players immediately
            self.fetchPlayers();
            
            // Poll every 2 seconds
            setInterval(function() {
                self.fetchPlayers();
            }, 2000);
        },
        
        /**
         * Sort summary
         */
        sortSummary: function(sortBy) {
            // TODO: Implement sort summary
            console.log('[HOST] Sort summary:', sortBy);
        },
        
        /**
         * Escape HTML
         */
        escapeHtml: function(text) {
            return QuizCore.escapeHtml(text);
        }
    };
    
    // Initialize on document ready
    $(document).ready(function() {
        HostController.init();
    });
    
})(jQuery);

