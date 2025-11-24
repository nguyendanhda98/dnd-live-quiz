/**
 * Live Quiz Player JavaScript - Refactored Version using Shared Modules
 * 
 * Uses shared modules:
 * - QuizCore: Core functionality (state, timers, clock sync)
 * - QuizUI: UI rendering (questions, leaderboards, animations)
 * - QuizWebSocket: WebSocket connection and events
 * 
 * @package LiveQuiz
 * @version 2.0.0
 */

(function() {
    'use strict';
    
    // Config from WordPress
    const config = window.liveQuizConfig || {};
    
    // DOM Elements
    const elements = {
        // Screens
        lobbyScreen: null,
        waitingScreen: null,
        countdownScreen: null,
        questionScreen: null,
        resultsScreen: null,
        top3Screen: null,
        finalScreen: null,
        
        // Question elements
        questionNumber: null,
        questionText: null,
        choicesContainer: null,
        answeredPlayersList: null,
        answerCountDisplay: null,
        answerCountText: null,
        
        // Timer elements
        timerFill: null,
        timerText: null,
        
        // Leaderboard elements
        leaderboardOverlay: null,
        animatedLeaderboard: null,
        top3Podium: null,
        top3List: null,
        playerTop3Podium: null,
        playerTop10List: null,
        
        // Waiting room elements
        waitingPlayerName: null,
        waitingRoomCode: null,
        playersWaitingList: null,
        participantCount: null,
        
        // Other elements
        pingIndicator: null,
        leaveButton: null
    };
    
    // Initialize
    document.addEventListener('DOMContentLoaded', init);
    
    async function init() {
        console.log('=== [PLAYER] INIT STARTED ===');
        console.log('[PLAYER] Current URL:', window.location.href);
        
        // Initialize QuizCore
        QuizCore.init('player', {
            sessionId: null,
            userId: null,
            displayName: null,
            roomCode: null
        });
        
        // Get DOM elements
        initElements();
        
        // Setup event listeners
        setupEventListeners();
        
        // Check Socket.IO library
        checkSocketIOLibrary();
        
        // Extract room code from URL
        const urlRoomCode = extractRoomCodeFromUrl();
        console.log('[PLAYER] URL room code:', urlRoomCode);
        
        // Restore session from server (if user is logged in)
        console.log('[PLAYER] Fetching user active session from server...');
        const serverSession = await fetchUserActiveSession();
        console.log('[PLAYER] Server session response:', serverSession);
        
        if (serverSession) {
            console.log('[PLAYER] Found server session, attempting to restore...');
            const restored = await restoreSessionFromData(serverSession, urlRoomCode);
            if (restored) {
                console.log('[PLAYER] Session restored from server successfully');
                return;
            }
            console.log('[PLAYER] Failed to restore from server session');
        }
        
        console.log('[PLAYER] No active session found on server');
        
        // If URL has room code, pre-fill it
        if (urlRoomCode) {
            console.log('[PLAYER] Pre-filling room code in form');
            const roomCodeInput = document.getElementById('room-code');
            if (roomCodeInput) {
                roomCodeInput.value = urlRoomCode;
            }
        }
        
        console.log('=== [PLAYER] INIT COMPLETED ===');
    }
    
    /**
     * Initialize DOM elements
     */
    function initElements() {
        // Screens
        elements.lobbyScreen = document.getElementById('quiz-lobby');
        elements.waitingScreen = document.getElementById('quiz-waiting');
        elements.countdownScreen = document.getElementById('quiz-countdown');
        elements.questionScreen = document.getElementById('quiz-question');
        elements.resultsScreen = document.getElementById('quiz-results');
        elements.top3Screen = document.getElementById('quiz-top3');
        elements.finalScreen = document.getElementById('quiz-final');
        
        // Question elements
        elements.questionNumber = document.querySelector('.question-number');
        elements.questionText = document.querySelector('.question-text');
        elements.choicesContainer = document.getElementById('choices-container');
        elements.answeredPlayersList = document.getElementById('answered-players-list');
        elements.answerCountDisplay = document.querySelector('.answer-count-display');
        elements.answerCountText = document.querySelector('.answer-count-text');
        
        // Timer elements
        elements.timerFill = document.querySelector('.timer-fill');
        elements.timerText = document.querySelector('.timer-text');
        
        // Leaderboard elements
        elements.leaderboardOverlay = document.getElementById('player-leaderboard-overlay');
        elements.animatedLeaderboard = document.getElementById('player-animated-leaderboard');
        elements.top3Podium = document.getElementById('top3-podium');
        elements.top3List = document.getElementById('top3-list');
        elements.playerTop3Podium = document.getElementById('player-top3-podium');
        elements.playerTop10List = document.getElementById('player-top10-list');
        
        // Waiting room elements
        elements.waitingPlayerName = document.getElementById('waiting-player-name');
        elements.waitingRoomCode = document.getElementById('waiting-room-code');
        elements.playersWaitingList = document.getElementById('players-waiting-list');
        elements.participantCount = document.getElementById('participant-count');
        
        // Other elements
        elements.pingIndicator = document.getElementById('ping-indicator');
        elements.leaveButton = document.querySelector('.leave-room-floating');
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Join form
        const joinForm = document.getElementById('join-form');
        if (joinForm) {
            joinForm.addEventListener('submit', handleJoin);
        }
        
        // Room code input - auto uppercase
        const roomCodeInput = document.getElementById('room-code');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('input', function(e) {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        
        // Leave room buttons
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('leave-room-btn') || e.target.classList.contains('leave-room-icon')) {
                handleLeaveRoom();
            }
        });
    }
    
    /**
     * Check if Socket.io library is loaded
     */
    function checkSocketIOLibrary() {
        if (typeof io === 'undefined') {
            console.error('[PLAYER] Socket.io library not loaded!');
            showError('join-error', 'Socket.io library không được tải. Vui lòng tải lại trang.');
        } else {
            console.log('[PLAYER] Socket.io library ready');
        }
    }
    
    /**
     * Extract room code from URL (/play/{code})
     */
    function extractRoomCodeFromUrl() {
        const pathParts = window.location.pathname.split('/');
        const playIndex = pathParts.findIndex(part => part === 'play');
        if (playIndex !== -1 && pathParts[playIndex + 1]) {
            const code = pathParts[playIndex + 1];
            if (/^\d{6}$/.test(code)) {
                return code;
            }
        }
        return null;
    }
    
    /**
     * Fetch user's active session from server
     */
    async function fetchUserActiveSession() {
        try {
            const response = await fetch(config.restUrl + '/user/active-session', {
                method: 'GET',
                headers: {
                    'X-WP-Nonce': config.nonce
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.has_session) {
                return data.session;
            }
            
            return null;
        } catch (error) {
            console.error('[PLAYER] Failed to fetch user session:', error);
            return null;
        }
    }
    
    /**
     * Restore session from data object
     */
    async function restoreSessionFromData(session, urlRoomCode) {
        try {
            console.log('[PLAYER] Restoring session from data:', session);
            
            // If URL has code that doesn't match, don't restore
            if (urlRoomCode && session.roomCode !== urlRoomCode) {
                console.log('[PLAYER] URL code mismatch, not restoring');
                return false;
            }
            
            // Restore state to QuizCore
            QuizCore.state.sessionId = session.sessionId;
            QuizCore.state.userId = session.userId;
            QuizCore.state.displayName = session.displayName;
            QuizCore.state.roomCode = session.roomCode;
            QuizCore.state.websocketToken = session.websocketToken;
            
            console.log('[PLAYER] Session restored:', {
                sessionId: QuizCore.state.sessionId,
                roomCode: QuizCore.state.roomCode,
                status: session.sessionStatus
            });
            
            // Update URL if needed
            if (!urlRoomCode) {
                const playUrl = '/play/' + QuizCore.state.roomCode;
                window.history.replaceState({ roomCode: QuizCore.state.roomCode }, '', playUrl);
            }
            
            // Check if session is ended - show final leaderboard
            if (session.sessionStatus === 'ended') {
                console.log('[PLAYER] Session is ended, showing final leaderboard');
                showScreen('quiz-final');
                
                // Fetch and display final leaderboard
                try {
                    const response = await fetch(config.restUrl + '/sessions/' + QuizCore.state.sessionId + '/leaderboard', {
                        method: 'GET',
                        headers: {
                            'X-WP-Nonce': config.nonce
                        }
                    });
                    
                    const data = await response.json();
                    if (data.success && data.leaderboard) {
                        displayFinalResults({ leaderboard: data.leaderboard });
                    }
                } catch (error) {
                    console.error('[PLAYER] Error fetching final leaderboard:', error);
                }
                
                // Still connect to WebSocket
                connectWebSocket();
                return true;
            }
            
            // Session is active - show waiting screen
            showScreen('quiz-waiting');
            if (elements.waitingPlayerName) {
                elements.waitingPlayerName.textContent = QuizCore.state.displayName;
            }
            if (elements.waitingRoomCode) {
                elements.waitingRoomCode.textContent = QuizCore.state.roomCode;
            }
            
            // Fetch players list
            fetchPlayersList();
            syncSessionState('restore');
            
            // Connect to WebSocket
            connectWebSocket();
            
            return true;
        } catch (error) {
            console.error('[PLAYER] Failed to restore session from data:', error);
            return false;
        }
    }
    
    /**
     * Sync current session state via REST
     */
    async function syncSessionState(trigger) {
        if (!QuizCore.state.sessionId || !config.restUrl) {
            return;
        }
        
        try {
            const response = await fetch(config.restUrl + '/sessions/' + QuizCore.state.sessionId + '/state', {
                method: 'GET',
                headers: {
                    'X-WP-Nonce': config.nonce
                }
            });
            
            const data = await response.json();
            if (!response.ok || !data.success || !data.state) {
                console.warn('[PLAYER] Session state sync failed:', data);
                return;
            }
            
            const sessionState = data.state;
            console.log('[PLAYER] Session state synced:', sessionState.status, trigger);
            
            if (sessionState.status === 'question' && sessionState.current_question) {
                handleQuestionStart(sessionState.current_question);
            } else if (sessionState.status === 'results' && sessionState.latest_results) {
                handleQuestionEnd(sessionState.latest_results);
            } else if (sessionState.status === 'ended' && sessionState.latest_results) {
                handleQuestionEnd(sessionState.latest_results);
            }
        } catch (error) {
            console.error('[PLAYER] Failed to sync session state:', error);
        }
    }
    
    /**
     * Handle join form submission
     */
    async function handleJoin(e) {
        e.preventDefault();
        
        const displayName = document.getElementById('display-name').value.trim();
        const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
        
        if (!displayName || !roomCode) {
            showError('join-error', config.i18n.enterName);
            return;
        }
        
        try {
            const response = await fetch(config.restUrl + '/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': config.nonce,
                },
                body: JSON.stringify({
                    display_name: displayName,
                    room_code: roomCode,
                    connection_id: QuizCore.state.connectionId,
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to join');
            }
            
            if (data.success) {
                QuizCore.state.sessionId = data.session_id;
                QuizCore.state.userId = data.user_id;
                QuizCore.state.displayName = data.display_name;
                QuizCore.state.roomCode = roomCode;
                QuizCore.state.websocketToken = data.websocket_token || '';
                
                // Update URL
                const playUrl = '/play/' + roomCode;
                window.history.pushState({ roomCode: roomCode }, '', playUrl);
                
                // Show waiting screen
                showScreen('quiz-waiting');
                if (elements.waitingPlayerName) {
                    elements.waitingPlayerName.textContent = displayName;
                }
                if (elements.waitingRoomCode) {
                    elements.waitingRoomCode.textContent = roomCode;
                }
                
                // Fetch players list
                fetchPlayersList();
                syncSessionState('join');
                
                // Connect to WebSocket
                connectWebSocket();
            }
        } catch (error) {
            console.error('[PLAYER] Join error:', error);
            showError('join-error', error.message || config.i18n.error);
        }
    }
    
    /**
     * Handle leave room
     */
    async function handleLeaveRoom() {
        if (confirm('Bạn có chắc chắn muốn rời khỏi phòng?')) {
            const sessionId = QuizCore.state.sessionId;
            
            if (sessionId) {
                try {
                    await fetch(config.restUrl + '/leave', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-WP-Nonce': config.nonce
                        },
                        body: JSON.stringify({
                            session_id: sessionId
                        })
                    });
                } catch (error) {
                    console.error('[PLAYER] Error leaving session:', error);
                }
            }
            
            // Disconnect WebSocket
            QuizWebSocket.disconnect();
            
            // Reset state
            QuizCore.state.sessionId = null;
            QuizCore.state.userId = null;
            QuizCore.state.displayName = null;
            QuizCore.state.roomCode = null;
            QuizCore.state.websocketToken = null;
            QuizCore.state.currentQuestion = null;
            QuizCore.state.questionStartTime = null;
            
            // Clear timer
            QuizCore.cleanup();
            
            // Return to lobby
            showScreen('quiz-lobby');
            
            // Reset URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
    
    /**
     * Connect to WebSocket server
     */
    function connectWebSocket() {
        const socket = QuizWebSocket.connect({
            url: config.websocket.url,
            token: QuizCore.state.websocketToken,
            sessionId: QuizCore.state.sessionId,
            userId: QuizCore.state.userId,
            displayName: QuizCore.state.displayName,
            isHost: false
        }, {
            pingElement: elements.pingIndicator,
            
            onConnect: function() {
                console.log('[PLAYER] WebSocket connected');
                hideConnectionStatus();
            },
            
            onDisconnect: function(reason) {
                console.log('[PLAYER] WebSocket disconnected:', reason);
                showConnectionStatus(config.i18n.connection_lost, 'warning');
            },
            
            onError: function(error) {
                console.error('[PLAYER] Connection error:', error);
            },
            
            onReconnect: function(attemptNumber) {
                console.log('[PLAYER] Reconnected after', attemptNumber, 'attempts');
                showConnectionStatus(config.i18n.connection_restored, 'success');
                setTimeout(hideConnectionStatus, 2000);
            },
            
            onSessionState: handleSessionState,
            onQuizCountdown: handleQuizCountdown,
            onQuestionStart: handleQuestionStart,
            onQuestionEnd: handleQuestionEnd,
            onShowTop3: handleShowTop3,
            onSessionEnd: handleSessionEnd,
            onSessionReplay: handleSessionReplay,
            onParticipantJoined: handleParticipantJoined,
            onParticipantLeft: handleParticipantLeft,
            onAnswerSubmitted: handleAnswerSubmitted,
            onSessionKicked: handleSessionKicked,
            onKicked: handleKicked,
            onKickedFromSession: handleKickedFromSession,
            onSessionEndedKicked: handleSessionEndedKicked,
            onForceDisconnect: handleForceDisconnect
        });
    }
    
    // ========================================
    // WebSocket Event Handlers
    // ========================================
    
    function handleSessionState(data) {
        console.log('[PLAYER] Session state:', data);
        
        if (data.status === 'lobby') {
            showScreen('quiz-waiting');
        } else if (data.status === 'playing' || data.status === 'question') {
            // Quiz has started or question in progress
        } else if (data.status === 'ended') {
            showScreen('quiz-final');
        }
    }
    
    /**
     * Handle quiz countdown (using shared QuizUI module)
     */
    function handleQuizCountdown(data) {
        console.log('[PLAYER] Quiz countdown:', data);
        
        const countdownEl = document.getElementById('countdown-number');
        const count = data.count || 3;
        
        // Show countdown using shared module
        QuizUI.showCountdown(
            countdownEl,
            'quiz-countdown',
            showScreen,
            count,
            null // No callback needed for player
        );
    }
    
    function handleQuestionStart(data) {
        console.log('[PLAYER] Question start:', data);
        
        QuizCore.state.currentQuestion = data;
        QuizCore.state.questionStartTime = data.start_time;
        QuizCore.state.timerAccelerated = false;
        
        // Fixed timing: Question displays immediately, choices show after 3 seconds
        const DISPLAY_DELAY = 3;
        QuizCore.state.serverStartTime = data.start_time + DISPLAY_DELAY;
        QuizCore.state.displayDelay = DISPLAY_DELAY;
        
        console.log('[PLAYER] Server start time for timer:', QuizCore.state.serverStartTime);
        
        // Clear answered players list
        QuizCore.resetForNewQuestion();
        if (elements.answeredPlayersList) {
            elements.answeredPlayersList.innerHTML = '';
        }
        
        // Initialize answer count display with total players
        const totalPlayers = Object.keys(QuizCore.state.players || {}).length;
        if (elements.answerCountDisplay && elements.answerCountText) {
            elements.answerCountText.textContent = '0/' + totalPlayers + ' đã trả lời';
            elements.answerCountDisplay.style.display = 'block';
        }
        
        // Hide leaderboard overlay if visible
        if (elements.leaderboardOverlay && !elements.leaderboardOverlay.classList.contains('leaderboard-overlay-hidden')) {
            elements.leaderboardOverlay.style.opacity = '0';
            setTimeout(function() {
                elements.leaderboardOverlay.classList.add('leaderboard-overlay-hidden');
            }, 300);
        }
        
        showScreen('quiz-question');
        
        // Display question using QuizUI
        QuizUI.displayQuestion(data, {
            questionNumber: elements.questionNumber,
            questionText: elements.questionText,
            choicesContainer: elements.choicesContainer
        }, false, handleAnswerSelect);
        
        // Start timer after 3 seconds (when choices appear)
        setTimeout(function() {
            QuizCore.startTimer(
                data.question.time_limit,
                {
                    fill: elements.timerFill,
                    text: elements.timerText
                },
                null,
                function() {
                    // Timer completed - disable choices
                disableChoices();
                }
            );
        }, 3000);
    }
    
    function handleQuestionEnd(data) {
        console.log('[PLAYER] Question end:', data);
        
        // Clear timer
        if (QuizCore.state.timerInterval) {
            clearInterval(QuizCore.state.timerInterval);
        }
        
        // Wait 1 second before showing correct answer
        setTimeout(function() {
            // Show correct answer using QuizUI
            // Also pass answered players list to highlight correct/incorrect answers
            QuizUI.showCorrectAnswer(data.correct_answer, elements.choicesContainer, elements.answeredPlayersList);
            
            console.log('[PLAYER] Correct answer shown');
            
            // After 2 seconds, show leaderboard animation
            setTimeout(function() {
                QuizUI.showLeaderboardAnimation(
                    data,
                    elements.leaderboardOverlay,
                    elements.animatedLeaderboard,
                    QuizCore.state.userId
                );
            }, 2000);
        }, 1000);
    }
    
    function handleShowTop3(data) {
        console.log('[PLAYER] Show top 3:', data);
        showScreen('quiz-top3');
        
        const leaderboard = data.top3 || [];
        
        // Display using QuizUI
        QuizUI.displayTop10WithPodium(leaderboard, {
            podium: elements.top3Podium,
            list: elements.top3List
        }, QuizCore.state.userId);
    }
    
    function handleSessionEnd(data) {
        console.log('[PLAYER] Session end:', data);
        
        showScreen('quiz-final');
        displayFinalResults(data);
    }
    
    function handleSessionReplay(data) {
        console.log('[PLAYER] Session replay:', data);
        
        alert('🔄 ' + (data.message || 'Host đã chọn chơi lại. Vui lòng đợi host bắt đầu.'));
        
        // Reset current question state
        QuizCore.state.currentQuestion = null;
        
        // Return to waiting room
        showScreen('quiz-waiting');
        
        if (elements.waitingPlayerName) {
            elements.waitingPlayerName.textContent = QuizCore.state.displayName || 'Player';
        }
        if (elements.waitingRoomCode) {
            elements.waitingRoomCode.textContent = QuizCore.state.roomCode || '';
        }
        
        // Refresh players list
        fetchPlayersList();
    }
    
    /**
     * Handle participant joined (using shared QuizPlayers module)
     */
    function handleParticipantJoined(data) {
        QuizPlayers.handlePlayerJoined(
            data,
            elements.playersWaitingList,
            QuizCore.state.displayName,
            false // isHost
        );
        
        // Update participant count
        updateParticipantCount(Object.keys(QuizCore.state.players).length);
    }
    
    /**
     * Handle participant left (using shared QuizPlayers module)
     */
    function handleParticipantLeft(data) {
        QuizPlayers.handlePlayerLeft(
            data,
            elements.playersWaitingList,
            QuizCore.state.displayName,
            false // isHost
        );
        
        // Update participant count
        updateParticipantCount(Object.keys(QuizCore.state.players).length);
    }
    
    function handleAnswerSubmitted(data) {
        console.log('[PLAYER] Answer submitted:', data);
        
        // Add player to answered list if not already there
        if (data.user_id && !QuizCore.state.answeredPlayers.includes(data.user_id)) {
            QuizCore.state.answeredPlayers.push(data.user_id);
            
            // Find player info
            const player = QuizCore.state.players[data.user_id];
            if (player) {
                QuizUI.displayAnsweredPlayer(player, data.score || 0, elements.answeredPlayersList);
            }
        }
        
        // Update answer count
        if (data.answered_count !== undefined && data.total_players !== undefined) {
            QuizUI.updateAnswerCount(
                data.answered_count,
                data.total_players,
                elements.answerCountDisplay,
                elements.answerCountText
            );
            
            // Check if all players answered
            if (data.answered_count >= data.total_players && data.total_players > 0) {
                console.log('[PLAYER] All players answered - accelerating timer');
                QuizCore.accelerateTimerToZero({
                    fill: elements.timerFill,
                    text: elements.timerText
                });
            }
        }
    }
    
    function handleSessionKicked(data) {
        console.log('[PLAYER] Session kicked:', data);
        
        QuizWebSocket.disconnect();
        
        alert(data.message || 'Bạn đã tham gia phòng này từ tab/thiết bị khác.');
        window.location.href = config.homeUrl || '/';
    }
    
    function handleKicked(data) {
        console.log('[PLAYER] Kicked by host (end room):', data);
        handleSessionEndedKicked(data);
    }
    
    function handleKickedFromSession(data) {
        console.log('[PLAYER] Kicked by host:', data);
        
        QuizWebSocket.disconnect();
        
        // Reset state
        QuizCore.state.sessionId = null;
        QuizCore.state.userId = null;
        QuizCore.state.displayName = null;
        QuizCore.state.roomCode = null;
        QuizCore.state.websocketToken = null;
        
        // Call server to ensure session is cleared
        fetch(config.restUrl + '/user/clear-session', {
            method: 'POST',
            headers: {
                'X-WP-Nonce': config.nonce,
                'Content-Type': 'application/json'
            }
        }).catch(function(err) {
            console.error('[PLAYER] Failed to clear session:', err);
        });
        
        alert('❌ ' + (data.message || 'Bạn đã bị kick khỏi phòng.'));
        
        showScreen('quiz-lobby');
        
        // Show error message
        const errorElement = document.getElementById('join-error');
        if (errorElement) {
            errorElement.innerHTML = `
                <div class="error-box kicked" style="background: #fee; border: 2px solid #c00; padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <h3 style="color: #c00; margin: 0 0 10px 0;">❌ Đã bị kick khỏi phòng</h3>
                    <p style="margin: 0;">${data.message || 'Bạn đã bị kick khỏi phòng.'}</p>
                </div>
            `;
            errorElement.style.display = 'block';
        }
    }

    function handleSessionEndedKicked(data) {
        console.log('[PLAYER] Session ended kicked:', data);
        
        QuizWebSocket.disconnect();
        
        // Reset state
        QuizCore.state.sessionId = null;
        QuizCore.state.userId = null;
        QuizCore.state.displayName = null;
        QuizCore.state.roomCode = null;
        QuizCore.state.websocketToken = null;
        
        // Call server to ensure session is cleared
        fetch(config.restUrl + '/user/clear-session', {
            method: 'POST',
            headers: {
                'X-WP-Nonce': config.nonce,
                'Content-Type': 'application/json'
            }
        }).catch(function(err) {
            console.error('[PLAYER] Failed to clear session:', err);
        });
        
        alert((data.message || 'Host đã kết thúc phòng.') + '\n\nBạn sẽ được chuyển về trang player.');
        
        window.location.href = config.playerPageUrl || config.homeUrl || '/';
    }
    
    function handleForceDisconnect(data) {
        console.log('[PLAYER] Force disconnected:', data);
        
        QuizWebSocket.disconnect();
        
        // Reset state
        QuizCore.state.sessionId = null;
        QuizCore.state.userId = null;
        QuizCore.state.displayName = null;
        QuizCore.state.roomCode = null;
        QuizCore.state.websocketToken = null;
        QuizCore.state.connectionId = null;
        
        window.location.href = config.homeUrl || '/';
    }
    
    // ========================================
    // Helper Functions
    // ========================================
    
    /**
     * Handle answer selection
     */
    async function handleAnswerSelect(choiceId) {
        console.log('[PLAYER] Answer selected:', choiceId);
        
        // Get synchronized server time
        const submitServerTime = QuizCore.getServerTime() / 1000;
        const elapsed = submitServerTime - QuizCore.state.serverStartTime;
        
        console.log('[PLAYER] Submit time:', submitServerTime, 'elapsed:', elapsed);
        
        // Disable all choices
        disableChoices();
        
        // Highlight selected
        const buttons = elements.choicesContainer.querySelectorAll('button');
        if (buttons[choiceId]) {
            buttons[choiceId].classList.add('selected');
        }
        
        try {
            const response = await fetch(config.restUrl + '/answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': config.nonce,
                },
                body: JSON.stringify({
                    session_id: QuizCore.state.sessionId,
                    choice_id: choiceId,
                    submit_time: submitServerTime,
                }),
            });
            
            const text = await response.text();
            const data = JSON.parse(text);
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit answer');
            }
            
            console.log('[PLAYER] Answer submitted:', data);
        } catch (error) {
            console.error('[PLAYER] Answer error:', error);
            showConnectionStatus(error.message, 'error');
        }
    }
    
    /**
     * Disable all choice buttons
     */
    function disableChoices() {
        if (!elements.choicesContainer) return;
        
        const buttons = elements.choicesContainer.querySelectorAll('button');
        buttons.forEach(function(button) {
            button.disabled = true;
        });
    }
    
    /**
     * Display final results
     */
    function displayFinalResults(data) {
        const leaderboard = data.leaderboard || [];
        
        // Display using QuizUI
        QuizUI.displayTop10WithPodium(leaderboard, {
            podium: elements.playerTop3Podium,
            list: elements.playerTop10List
        }, QuizCore.state.userId);
    }
    
    /**
     * Fetch players list (same logic as host)
     */
    /**
     * Fetch players list (using shared QuizPlayers module)
     */
    async function fetchPlayersList() {
        QuizPlayers.fetchPlayersList(
            config.restUrl,
            QuizCore.state.sessionId,
            '/players-list',
            null, // no nonce for public endpoint
            elements.playersWaitingList,
            QuizCore.state.displayName,
            false, // isHost
            updateParticipantCount // callback to update count
        );
    }
    
    /**
     * Update participant count
     */
    function updateParticipantCount(count) {
        if (elements.participantCount) {
            elements.participantCount.textContent = count + ' người chơi đang chờ';
        }
    }
    
    /**
     * Show screen
     */
    function showScreen(screenId) {
        document.querySelectorAll('.quiz-screen').forEach(function(screen) {
            screen.classList.remove('active');
        });
        
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
        
        if (screenId === 'quiz-lobby') {
            setFloatingLeaveVisibility(false);
        } else if (QuizCore.state.sessionId) {
            setFloatingLeaveVisibility(true);
        }
    }
    
    /**
     * Set floating leave button visibility
     */
    function setFloatingLeaveVisibility(visible) {
        if (!elements.leaveButton) return;
        
        if (visible) {
            elements.leaveButton.classList.add('is-visible');
        } else {
            elements.leaveButton.classList.remove('is-visible');
        }
    }
    
    /**
     * Show error message
     */
    function showError(elementId, message) {
        const elem = document.getElementById(elementId);
        if (elem) {
            elem.textContent = message;
            elem.style.display = 'block';
            setTimeout(function() {
                elem.style.display = 'none';
            }, 5000);
        }
    }
    
    /**
     * Show connection status
     */
    function showConnectionStatus(message, type) {
        const statusElem = document.getElementById('connection-status');
        if (!statusElem) return;
        
        const textElem = statusElem.querySelector('.status-text');
        
        statusElem.className = 'connection-status ' + type;
        if (textElem) {
        textElem.textContent = message;
        }
        statusElem.style.display = 'block';
    }
    
    /**
     * Hide connection status
     */
    function hideConnectionStatus() {
        const statusElem = document.getElementById('connection-status');
        if (statusElem) {
        statusElem.style.display = 'none';
        }
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        QuizCore.cleanup();
    });
    
})();
