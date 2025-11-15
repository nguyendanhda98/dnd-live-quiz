/**
 * Host Interface JavaScript
 * 
 * @package LiveQuiz
 */

(function($) {
    'use strict';

    // Host Controller
    const HostController = {
        sessionId: null,
        roomCode: null,
        socket: null,
        currentQuestionIndex: 0,
        players: {},
        
        init: function() {
            // Get session data from window
            if (typeof window.liveQuizHostData === 'undefined') {
                console.error('Host data not found');
                return;
            }
            
            this.sessionId = window.liveQuizHostData.sessionId;
            this.roomCode = window.liveQuizHostData.roomCode;
            
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
            $('#end-session-btn').on('click', function() {
                if (confirm('Bạn có chắc chắn muốn kết thúc phiên?')) {
                    self.endSession();
                }
            });
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
                    connection_id: null // Host doesn't need connection_id tracking
                });
                
                // Load participants immediately
                self.fetchPlayers();
            });
            
            this.socket.on('disconnect', function() {
                console.log('WebSocket disconnected');
                self.showConnectionStatus('Mất kết nối', false);
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
            
            $.ajax({
                url: liveQuizPlayer.apiUrl + '/sessions/' + this.sessionId + '/players',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': liveQuizPlayer.nonce
                },
                success: function(response) {
                    console.log('Fetched players:', response);
                    if (response.success && response.players) {
                        // Merge players into this.players to maintain WebSocket updates
                        response.players.forEach(function(player) {
                            const playerId = player.user_id || player.player_id;
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
            // Support both player_id and user_id
            const playerId = data.player_id || data.user_id;
            const hostId = window.liveQuizHostData.hostUserId;
            
            console.log('Comparing playerId:', playerId, 'with hostId:', hostId, 'types:', typeof playerId, typeof hostId);
            
            // Don't add host to players list (convert to string for comparison)
            if (playerId && String(playerId) !== String(hostId)) {
                this.players[playerId] = data;
                // Also store the ID in the data object for consistency
                this.players[playerId].player_id = playerId;
                this.players[playerId].user_id = playerId;
                this.updatePlayersList(Object.values(this.players));
            } else if (String(playerId) === String(hostId)) {
                console.log('Ignoring host join event for hostId:', hostId);
            } else {
                console.error('Player joined event missing player_id/user_id:', data);
            }
        },
        
        handlePlayerLeft: function(data) {
            console.log('Player left:', data);
            const playerId = data.player_id || data.user_id;
            if (playerId) {
                delete this.players[playerId];
                this.updatePlayersList(Object.values(this.players));
            }
        },
        
        updatePlayersList: function(players) {
            const self = this;
            const $list = $('#players-list');
            const $count = $('#player-count');
            
            // Filter out host from players list (double-check in case API doesn't filter)
            const hostId = window.liveQuizHostData.hostUserId;
            if (hostId) {
                players = players.filter(function(player) {
                    const playerId = player.user_id || player.player_id;
                    return String(playerId) !== String(hostId);
                });
            }
            
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
                // Support both user_id and player_id for backward compatibility
                const playerId = player.user_id || player.player_id;
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
            
            $.ajax({
                url: liveQuizPlayer.apiUrl + '/sessions/' + this.sessionId + '/start',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': liveQuizPlayer.nonce
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
                    alert('Có lỗi khi bắt đầu quiz: ' + xhr.responseJSON.message);
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
        
        updateAnswerStats: function() {
            const self = this;
            
            $.ajax({
                url: liveQuizPlayer.apiUrl + '/sessions/' + this.sessionId + '/question-stats',
                method: 'GET',
                data: {
                    question_index: this.currentQuestionIndex
                },
                headers: {
                    'X-WP-Nonce': liveQuizPlayer.nonce
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
        
        endQuestion: function() {
            const self = this;
            
            $.ajax({
                url: liveQuizPlayer.apiUrl + '/sessions/' + this.sessionId + '/end-question',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': liveQuizPlayer.nonce
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
            
            $.ajax({
                url: liveQuizPlayer.apiUrl + '/sessions/' + this.sessionId + '/next',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': liveQuizPlayer.nonce
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
            const self = this;
            
            $.ajax({
                url: liveQuizPlayer.apiUrl + '/sessions/' + this.sessionId + '/end',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': liveQuizPlayer.nonce
                },
                success: function(response) {
                    console.log('Session ended');
                    // Reload page to show setup form
                    window.location.reload();
                },
                error: function(xhr, status, error) {
                    console.error('Failed to end session:', error);
                    alert('Không thể kết thúc phiên. Vui lòng thử lại.');
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
        HostController.init();
    });
    
})(jQuery);
