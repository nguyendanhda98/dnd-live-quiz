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
        summaryData: null,
        totalParticipants: 0,
        hideLeaderboard: false,
        totalQuestions: 0,
        
        // API config
        apiConfig: null,
        
        // DOM Elements (shared structure with player)
        elements: {
            questionNumber: null,
            questionText: null,
            choicesContainer: null,
            answeredPlayersList: null,
            answerCountDisplay: null,
            answerCountText: null,
            timerFill: null,
            timerText: null,
            leaderboardOverlay: null,
            animatedLeaderboard: null,
            playersList: null // Players waiting list (shared with player)
        },
        
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
            
            // Store hideLeaderboard setting and total questions
            this.hideLeaderboard = window.liveQuizHostData.hideLeaderboard || false;
            this.totalQuestions = window.liveQuizHostData.totalQuestions || 0;
            console.log('[HOST] hideLeaderboard:', this.hideLeaderboard, 'totalQuestions:', this.totalQuestions);
            
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
            
            // Initialize DOM elements (shared structure with player)
            this.initElements();
            
            // Bind events
            this.bindEvents();
            
            // Connect WebSocket
            this.connectWebSocket();
        },
        
        /**
         * Initialize DOM elements (shared structure with player)
         */
        initElements: function() {
            // Question elements
            this.elements.questionNumber = document.querySelector('.question-number');
            this.elements.questionText = document.querySelector('.question-text');
            this.elements.choicesContainer = document.getElementById('choices-preview');
            this.elements.answeredPlayersList = document.getElementById('answered-players-list');
            this.elements.answerCountDisplay = document.querySelector('.answer-count-display');
            this.elements.answerCountText = document.querySelector('.answer-count-text');
            
            // Timer elements
            this.elements.timerFill = document.querySelector('.timer-fill');
            this.elements.timerText = document.querySelector('.timer-text');
            
            // Leaderboard elements (shared with player)
            this.elements.leaderboardOverlay = document.getElementById('leaderboard-overlay');
            this.elements.animatedLeaderboard = document.getElementById('animated-leaderboard');
            
            // Players list element (shared with player)
            this.elements.playersList = document.getElementById('players-list');
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
            
            // End Session button (only in header, not in final screens)
            $('#end-session-btn').on('click', function(e) {
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
                const quizType = $(this).val();
                if (quizType === 'random') {
                    $('#lobby-random-count').slideDown();
                    $('#lobby-range-input').slideUp();
                    self.updateRandomHint();
                } else if (quizType === 'range') {
                    $('#lobby-random-count').slideUp();
                    $('#lobby-range-input').slideDown();
                    self.updateRangeHint();
                } else {
                    $('#lobby-random-count').slideUp();
                    $('#lobby-range-input').slideUp();
                }
            });
            
            // Update range hint when inputs change
            $('#lobby-question-start, #lobby-question-end').on('input', function() {
                self.updateRangeHint();
            });
            
            // Update random hint when count changes
            $('#lobby-question-count').on('input', function() {
                self.updateRandomHint();
            });
            
            // Enable start button when conditions are met
            $(document).on('change', '#lobby-selected-quizzes', function() {
                self.updateStartButton();
            });
            
            // Initialize quiz type selection on page load
            const initialQuizType = $('input[name="lobby_quiz_type"]:checked').val();
            if (initialQuizType === 'random') {
                $('#lobby-random-count').show();
                self.updateRandomHint();
            } else if (initialQuizType === 'range') {
                $('#lobby-range-input').show();
                self.updateRangeHint();
            }
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
                    console.log('[HOST] Force disconnected event received:', data);
                    console.log('[HOST] Current session ID:', QuizCore.state.sessionId);
                    console.log('[HOST] Host session ID:', window.liveQuizHostData ? window.liveQuizHostData.sessionId : 'N/A');
                    
                    // IMPORTANT: Host should NEVER be force disconnected
                    // If this event is received, it's likely a bug or the host is joining as player
                    // Check if this is the host's own session - if so, ignore the disconnect
                    const isOwnSession = window.liveQuizHostData && 
                                        window.liveQuizHostData.sessionId && 
                                        QuizCore.state.sessionId &&
                                        String(window.liveQuizHostData.sessionId) === String(QuizCore.state.sessionId);
                    
                    if (isOwnSession) {
                        console.warn('[HOST] Received force_disconnect for own session - IGNORING (host can have multiple connections)');
                        console.warn('[HOST] Reason:', data.reason);
                        console.warn('[HOST] This is normal when host also joins as player');
                        // Do NOT disconnect or redirect - host should keep this connection
                        return;
                    }
                    
                    // Only redirect if it's NOT the host's own session (shouldn't happen, but safety check)
                    console.error('[HOST] Force disconnected from different session - redirecting');
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
            QuizCore.state.timerAccelerated = false;
            
            // Fixed timing: Question displays immediately, choices show after 3 seconds
            const DISPLAY_DELAY = 3;
            QuizCore.state.serverStartTime = data.start_time + DISPLAY_DELAY;
            QuizCore.state.displayDelay = DISPLAY_DELAY;
            
            console.log('[HOST] Server start time for timer:', QuizCore.state.serverStartTime);
            
            // Hide leaderboard overlay (using elements object - shared with player)
            const self = this;
            if (this.elements.leaderboardOverlay && !this.elements.leaderboardOverlay.classList.contains('leaderboard-overlay-hidden')) {
                this.elements.leaderboardOverlay.style.opacity = '0';
                setTimeout(function() {
                    self.elements.leaderboardOverlay.classList.add('leaderboard-overlay-hidden');
                }, 300);
            }
            
            // Reset answered players
            QuizCore.resetForNewQuestion();
            if (this.elements.answeredPlayersList) {
                this.elements.answeredPlayersList.innerHTML = '';
            }
            
            // Initialize answer count display with total players
            const totalPlayers = Object.keys(QuizCore.state.players || {}).length;
            if (this.elements.answerCountDisplay && this.elements.answerCountText) {
                this.elements.answerCountText.textContent = '0/' + totalPlayers + ' đã trả lời';
                this.elements.answerCountDisplay.style.display = 'block';
            }
            
            // Show question screen
            this.showScreen('host-question');
            
            // Reset stats and buttons
            const answerStats = document.getElementById('answer-stats');
            if (answerStats) {
                answerStats.style.display = 'none';
            }
            const nextQuestionBtn = document.getElementById('next-question-btn');
            if (nextQuestionBtn) {
                nextQuestionBtn.style.display = 'none';
            }
            
            // Display question using QuizUI (shared code with player)
            QuizUI.displayQuestion(data, {
                questionNumber: this.elements.questionNumber,
                questionText: this.elements.questionText,
                choicesContainer: this.elements.choicesContainer
            }, true, null); // isHost=true, no onAnswerSelect
            
            // Start timer after 3 seconds (when choices appear)
 
            setTimeout(function() {
                QuizCore.startTimer(
                    data.question.time_limit,
                    {
                        fill: self.elements.timerFill,
                        text: self.elements.timerText
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
         * Handle question end (using QuizUI - shared code with player)
         */
        handleQuestionEnd: function(data) {
            console.log('[HOST] Question end:', data);
            
            // Clear timer
            if (QuizCore.state.timerInterval) {
                clearInterval(QuizCore.state.timerInterval);
            }
            
            // Check if this is the last question
            // Get question index from currentQuestion stored in handleQuestionStart
            const currentQuestionIndex = QuizCore.state.currentQuestion ? 
                                        (QuizCore.state.currentQuestion.question_index !== undefined ? 
                                         QuizCore.state.currentQuestion.question_index : null) : null;
            const isLastQuestion = currentQuestionIndex !== null && 
                                  this.totalQuestions > 0 && 
                                  (currentQuestionIndex + 1 >= this.totalQuestions);
            
            // Check if we should hide leaderboard (only hide between questions, not on final question)
            const shouldHideLeaderboard = this.hideLeaderboard && !isLastQuestion;
            
            console.log('[HOST] Question index:', currentQuestionIndex, 'Total:', this.totalQuestions, 
                       'Is last:', isLastQuestion, 'Hide leaderboard:', shouldHideLeaderboard);
            
            // Wait 1 second before showing correct answer
            const self = this;
            setTimeout(function() {
                // Show correct answer using QuizUI (shared code with player)
                // Also pass answered players list to highlight correct/incorrect answers
                QuizUI.showCorrectAnswer(data.correct_answer, self.elements.choicesContainer, self.elements.answeredPlayersList);
                
                console.log('[HOST] Correct answer shown');
                
                // If hideLeaderboard is enabled and this is not the last question, skip leaderboard
                if (shouldHideLeaderboard) {
                    console.log('[HOST] Skipping leaderboard (hideLeaderboard enabled, not last question)');
                    // Wait a bit then advance to next question
                    setTimeout(function() {
                        console.log('[HOST] Automatically advancing to next question (leaderboard skipped)');
                        self.nextQuestion();
                    }, 2000); // Wait 2 seconds after showing correct answer
                } else {
                    // Show leaderboard animation (using shared QuizUI - same as player)
                    setTimeout(function() {
                        QuizUI.showLeaderboardAnimation(
                            data,
                            self.elements.leaderboardOverlay,
                            self.elements.animatedLeaderboard,
                            QuizCore.state.userId
                        );
                        
                        // Automatically advance to next question after animation
                        setTimeout(function() {
                            console.log('[HOST] Automatically advancing to next question');
                            self.nextQuestion();
                        }, 5000);
                    }, 2000);
                }
            }, 1000);
        },
        
        /**
         * Handle answer submitted (using shared QuizUI - same as player)
         */
        handleAnswerSubmitted: function(data) {
            console.log('[HOST] Answer submitted:', data);
            
            // Add player to answered list
            if (data.user_id && !QuizCore.state.answeredPlayers.includes(data.user_id)) {
                QuizCore.state.answeredPlayers.push(data.user_id);
                
                // Find player info
                const player = QuizCore.state.players[data.user_id];
                if (player) {
                    QuizUI.displayAnsweredPlayer(player, data.score || 0, this.elements.answeredPlayersList);
                }
            }
            
            // Update answer count (using shared QuizUI - same as player)
            if (data.answered_count !== undefined && data.total_players !== undefined) {
                QuizUI.updateAnswerCount(
                    data.answered_count,
                    data.total_players,
                    this.elements.answerCountDisplay,
                    this.elements.answerCountText
                );
                
                // If all players answered, accelerate timer
                if (data.answered_count >= data.total_players && data.total_players > 0) {
                    console.log('[HOST] All players answered - accelerating timer');
                    QuizCore.accelerateTimerToZero({
                        fill: this.elements.timerFill,
                        text: this.elements.timerText
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
            const questionStart = quizType === 'range' ? parseInt($('#lobby-question-start').val()) : null;
            const questionEnd = quizType === 'range' ? parseInt($('#lobby-question-end').val()) : null;
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
                    question_start: questionStart,
                    question_end: questionEnd,
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
                        // Update hideLeaderboard setting from checkbox
                        self.hideLeaderboard = hideLeaderboard;
                        // Update totalQuestions from API response
                        if (response.data && response.data.question_count) {
                            self.totalQuestions = response.data.question_count;
                        }
                        console.log('[HOST] Settings saved, hideLeaderboard:', self.hideLeaderboard, 'totalQuestions:', self.totalQuestions);
                        console.log('[HOST] Starting countdown...');
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
         * Show countdown and start quiz (using shared QuizUI module)
         */
        showCountdownAndStartQuiz: function() {
            const self = this;
            
            // Broadcast countdown to all players via WebSocket
            if (QuizCore.state.socket && QuizCore.state.socket.connected) {
                QuizCore.state.socket.emit('broadcast_countdown', {
                    count: 3,
                    session_id: QuizCore.state.sessionId
                });
                console.log('[HOST] Broadcasted countdown to all players');
            }
            
            // Show countdown using shared module
            QuizUI.showCountdown(
                $('#host-countdown-number'),
                'host-countdown',
                this.showScreen.bind(this),
                3,
                function() {
                    // Start quiz via API when countdown completes
                    self.sendStartQuizCommand();
                }
            );
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
                    
                    // Redirect to host page configured in settings
                    setTimeout(function() {
                        const hostPageUrl = window.liveQuizHostData.hostPageUrl || window.liveQuizHostData.homeUrl || '/';
                        window.location.href = hostPageUrl;
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
                    
                    // Reset button to initial state
                    $('#start-quiz-btn').text('▶️ Bắt đầu Quiz');
                    
                    // Pre-select previous quizzes if available
                    if (response.previous_quizzes && response.previous_quizzes.length > 0) {
                        console.log('[HOST] Pre-selecting previous quizzes:', response.previous_quizzes);
                        self.selectedQuizzes = response.previous_quizzes.map(function(quiz) {
                            return {
                                id: quiz.id,
                                title: quiz.title,
                                question_count: quiz.question_count
                            };
                        });
                        self.updateSelectedQuizzes();
                        console.log('[HOST] ✓ Previous quizzes pre-selected');
                    } else {
                        // Clear selected quizzes if no previous quizzes
                        self.selectedQuizzes = [];
                        self.updateSelectedQuizzes();
                    }
                    
                    // Update button state (enable/disable based on quizzes and players)
                    self.updateStartButton();
                    
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
            const self = this;
            
            if (!this.apiConfig || !QuizCore.state.sessionId) {
                console.error('[HOST] Cannot show summary - missing API config or session ID');
                return;
            }
            
            console.log('[HOST] Fetching session summary...');
            
            // Show modal
            const modal = document.getElementById('summary-modal');
            if (modal) {
                modal.style.display = 'flex';
            } else {
                console.error('[HOST] Modal element not found!');
                return;
            }
            
            // Show loading state
            const $list = $('#summary-questions-list');
            $list.html('<div class="summary-loading"><p>Đang tải dữ liệu...</p></div>');
            
            // Fetch summary data
            $.ajax({
                url: this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/summary',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    if (response.success && response.questions) {
                        console.log('[HOST] Summary data fetched:', response);
                        self.summaryData = response.questions;
                        self.totalParticipants = response.total_participants || 0;
                        self.displaySummary(response.questions, self.totalParticipants);
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
        
        /**
         * Close summary
         */
        closeSummary: function() {
            const modal = document.getElementById('summary-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        },
        
        /**
         * Display summary data
         */
        displaySummary: function(questions, totalParticipants) {
            console.log('[HOST] displaySummary called with', questions.length, 'questions');
            const $list = $('#summary-questions-list');
            $list.empty();
            
            if (questions.length === 0) {
                $list.html('<div class="summary-empty"><p>Chưa có dữ liệu câu hỏi</p></div>');
                return;
            }
            
            const self = this;
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
                                    <span class="summary-choice-text">${self.escapeHtml(choice.text)}</span>
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
                    });
                    choicesHtml += '</div>';
                }
                
                const html = `
                    <div class="summary-question-item" data-index="${idx}">
                        <div class="summary-question-header">
                            <div class="summary-question-number">Câu ${q.index + 1}</div>
                            <div class="summary-question-text">${self.escapeHtml(q.question)}</div>
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
            });
        },
        
        /**
         * Display summary error
         */
        displaySummaryError: function() {
            const $list = $('#summary-questions-list');
            $list.html('<div class="summary-error"><p>⚠️ Không thể tải dữ liệu. Vui lòng thử lại.</p></div>');
        },
        
        // ========================================
        // Player Management
        // ========================================
        
        /**
         * Fetch players (using shared QuizPlayers module - same as player)
         */
        fetchPlayers: function() {
            const self = this;
            
            QuizPlayers.fetchPlayersList(
                this.apiConfig.apiUrl,
                QuizCore.state.sessionId,
                '/players',
                this.apiConfig.nonce,
                this.elements.playersList,
                QuizCore.state.displayName,
                true, // isHost
                function(count) {
                    // Update count
                    $('#player-count').text(count);
                    // Update start button
                    self.updateStartButton();
                    // Bind click events for player actions (host-specific)
                    self.bindPlayerClickEvents();
                }
            );
        },
        
        /**
         * Bind click events for player actions (host-specific)
         */
        bindPlayerClickEvents: function() {
            const self = this;
            $('.player-waiting-item.clickable').off('click').on('click', function() {
                const playerId = $(this).data('player-id');
                const playerName = $(this).data('player-name');
                self.showPlayerActionMenu(playerId, playerName, this);
            });
        },
        
        /**
         * Handle player joined (using shared QuizPlayers module - same as player)
         */
        handlePlayerJoined: function(data) {
            QuizPlayers.handlePlayerJoined(
                data,
                this.elements.playersList,
                QuizCore.state.displayName,
                true // isHost
            );
            
            // Update count and start button
            const count = Object.keys(QuizCore.state.players).length;
            $('#player-count').text(count);
            this.updateStartButton();
            
            // Bind click events
            this.bindPlayerClickEvents();
        },
        
        /**
         * Handle player left (using shared QuizPlayers module - same as player)
         */
        handlePlayerLeft: function(data) {
            QuizPlayers.handlePlayerLeft(
                data,
                this.elements.playersList,
                QuizCore.state.displayName,
                true // isHost
            );
            
            // Update count and start button
            const count = Object.keys(QuizCore.state.players).length;
            $('#player-count').text(count);
            this.updateStartButton();
        },
        
        /**
         * Update players list (using shared QuizPlayers module - same as player)
         */
        updatePlayersList: function(players) {
            const $count = $('#player-count');
            
            // Update count
            $count.text(players.length);
            
            // Update start button
            this.updateStartButton();
            
            // Update list using shared module (same as player)
            QuizPlayers.updatePlayersList(players, this.elements.playersList, QuizCore.state.displayName, true);
            
            // Bind click events for player actions (host-specific)
            this.bindPlayerClickEvents();
        },
        
        /**
         * Show player action menu (host-specific)
         */
        showPlayerActionMenu: function(playerId, playerName, playerElement) {
            console.log('[HOST] Show player action menu:', playerId, playerName);
            
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
                            <h3 class="modal-player-name">${this.escapeHtml(playerName)}</h3>
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
        
        /**
         * Kick player from session
         */
        kickPlayer: function(playerId, playerName) {
            const self = this;
            
            // Confirm before kicking
            if (!confirm('Bạn có chắc muốn kick "' + playerName + '" khỏi phòng?')) {
                return;
            }
            
            if (!this.apiConfig) {
                alert('Không thể kick người chơi: API không khả dụng');
                return;
            }
            
            const kickUrl = this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/kick-player';
            console.log('[HOST] === KICKING PLAYER ===');
            console.log('[HOST] URL:', kickUrl);
            console.log('[HOST] Player ID:', playerId);
            
            // Send kick request
            $.ajax({
                url: kickUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    user_id: playerId
                }),
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    console.log('[HOST] ✓ Player kicked successfully:', response);
                    
                    // Remove player from local list
                    delete QuizCore.state.players[playerId];
                    self.updatePlayersList(Object.values(QuizCore.state.players));
                    
                    // Show notification
                    self.showNotification('Đã kick "' + playerName + '" khỏi phòng', 'success');
                },
                error: function(xhr, status, error) {
                    console.error('[HOST] ✗ Error kicking player:', xhr);
                    alert('Không thể kick người chơi: ' + (xhr.responseJSON?.message || error));
                }
            });
        },
        
        /**
         * Ban player from current session
         */
        banFromSession: function(playerId, playerName) {
            const self = this;
            
            // Confirm before banning
            if (!confirm('Bạn có chắc muốn ban "' + playerName + '" khỏi phòng này?\n\nNgười chơi sẽ không thể tham gia lại phòng này.')) {
                return;
            }
            
            if (!this.apiConfig) {
                alert('Không thể ban người chơi: API không khả dụng');
                return;
            }
            
            const banUrl = this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/ban-from-session';
            console.log('[HOST] === BANNING FROM SESSION ===');
            console.log('[HOST] Player ID:', playerId);
            
            // Send ban request
            $.ajax({
                url: banUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    user_id: playerId
                }),
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    console.log('[HOST] ✓ Player banned from session:', response);
                    
                    // Remove player from local list
                    delete QuizCore.state.players[playerId];
                    self.updatePlayersList(Object.values(QuizCore.state.players));
                    
                    // Show notification
                    self.showNotification('Đã ban "' + playerName + '" khỏi phòng này', 'success');
                },
                error: function(xhr, status, error) {
                    console.error('[HOST] ✗ Error banning player:', xhr);
                    alert('Không thể ban người chơi: ' + (xhr.responseJSON?.message || error));
                }
            });
        },
        
        /**
         * Ban player permanently
         */
        banPermanently: function(playerId, playerName) {
            const self = this;
            
            // Confirm before permanent ban
            if (!confirm('⚠️ BAN VĨNH VIỄN\n\nBạn có chắc muốn ban vĩnh viễn "' + playerName + '"?\n\nNgười chơi này sẽ KHÔNG THỂ tham gia BẤT KỲ phòng nào do bạn tạo ra.')) {
                return;
            }
            
            if (!this.apiConfig) {
                alert('Không thể ban người chơi: API không khả dụng');
                return;
            }
            
            const banUrl = this.apiConfig.apiUrl + '/sessions/' + QuizCore.state.sessionId + '/ban-permanently';
            console.log('[HOST] === BANNING PERMANENTLY ===');
            console.log('[HOST] Player ID:', playerId);
            
            // Send ban request
            $.ajax({
                url: banUrl,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    user_id: playerId
                }),
                headers: {
                    'X-WP-Nonce': this.apiConfig.nonce
                },
                success: function(response) {
                    console.log('[HOST] ✓ Player banned permanently:', response);
                    
                    // Remove player from local list
                    delete QuizCore.state.players[playerId];
                    self.updatePlayersList(Object.values(QuizCore.state.players));
                    
                    // Show notification
                    self.showNotification('⛔ Đã ban vĩnh viễn "' + playerName + '"', 'warning');
                },
                error: function(xhr, status, error) {
                    console.error('[HOST] ✗ Error banning player permanently:', xhr);
                    alert('Không thể ban người chơi: ' + (xhr.responseJSON?.message || error));
                }
            });
        },
        
        /**
         * Show notification
         */
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
                // Update hints when quizzes are cleared
                this.updateRandomHint();
                this.updateRangeHint();
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
            
            // Update hints when quizzes change
            this.updateRandomHint();
            this.updateRangeHint();
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
        
        /**
         * Get total question count from selected quizzes
         */
        getTotalQuestionCount: function() {
            return this.selectedQuizzes.reduce(function(total, quiz) {
                return total + (quiz.question_count || 0);
            }, 0);
        },
        
        /**
         * Update random hint
         */
        updateRandomHint: function() {
            const totalQuestions = this.getTotalQuestionCount();
            const selectedCount = parseInt($('#lobby-question-count').val()) || 0;
            const $hint = $('#lobby-question-hint');
            
            if (totalQuestions > 0) {
                if (selectedCount > totalQuestions) {
                    $hint.text('(Tối đa: ' + totalQuestions + ' câu)').css('color', '#d63638');
                } else {
                    $hint.text('(Tổng: ' + totalQuestions + ' câu)').css('color', '');
                }
            } else {
                $hint.text('(Chưa chọn bộ câu hỏi)').css('color', '#d63638');
            }
        },
        
        /**
         * Update range hint
         */
        updateRangeHint: function() {
            const totalQuestions = this.getTotalQuestionCount();
            const start = parseInt($('#lobby-question-start').val()) || 1;
            const end = parseInt($('#lobby-question-end').val()) || 1;
            const $hint = $('#lobby-range-hint');
            const $startInput = $('#lobby-question-start');
            const $endInput = $('#lobby-question-end');
            
            if (totalQuestions > 0) {
                // Update max values
                $startInput.attr('max', totalQuestions);
                $endInput.attr('max', totalQuestions);
                
                // Validate range
                if (start > end) {
                    $hint.text('(Cảnh báo: Câu bắt đầu phải ≤ câu kết thúc)').css('color', '#d63638');
                    $endInput.css('border-color', '#d63638');
                } else if (start < 1 || end < 1) {
                    $hint.text('(Cảnh báo: Số câu hỏi phải ≥ 1)').css('color', '#d63638');
                } else if (end > totalQuestions) {
                    $hint.text('(Cảnh báo: Vượt quá tổng số câu hỏi: ' + totalQuestions + ')').css('color', '#d63638');
                    $endInput.css('border-color', '#d63638');
                } else {
                    const count = end - start + 1;
                    $hint.text('(Tổng: ' + totalQuestions + ' câu, sẽ chọn ' + count + ' câu)').css('color', '');
                    $startInput.css('border-color', '');
                    $endInput.css('border-color', '');
                }
            } else {
                $hint.text('(Chưa chọn bộ câu hỏi)').css('color', '#d63638');
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
        sortSummary: function(sortType) {
            if (!this.summaryData) {
                return;
            }
            
            let sorted = [...this.summaryData];
            
            switch(sortType) {
                case 'correct_asc':
                    // Sort by correct percentage (lowest first)
                    sorted.sort((a, b) => (a.correct_percentage || 0) - (b.correct_percentage || 0));
                    break;
                case 'correct_desc':
                    // Sort by correct percentage (highest first)
                    sorted.sort((a, b) => (b.correct_percentage || 0) - (a.correct_percentage || 0));
                    break;
                case 'order':
                default:
                    // Sort by question index (original order)
                    sorted.sort((a, b) => (a.index || 0) - (b.index || 0));
                    break;
            }
            
            this.displaySummary(sorted, this.totalParticipants);
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

