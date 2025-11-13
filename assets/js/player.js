/**
 * Live Quiz Player JavaScript - Phase 2 (WebSocket Only)
 * 
 * Uses WebSocket (Socket.io) for real-time communication
 * 
 * @package LiveQuiz
 * @version 2.0.0
 */

(function() {
    'use strict';
    
    // State
    let state = {
        sessionId: null,
        userId: null,
        displayName: null,
        roomCode: null,
        websocketToken: null,
        currentQuestion: null,
        questionStartTime: null,
        timerInterval: null,
        
        // WebSocket connection
        socket: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        isConnected: false,
    };
    
    // Config from WordPress
    const config = window.liveQuizConfig || {};
    
    // Initialize
    document.addEventListener('DOMContentLoaded', init);
    
    function init() {
        setupEventListeners();
        checkSocketIOLibrary();
        
        // Check if URL has room code and try to restore session
        const urlRoomCode = extractRoomCodeFromUrl();
        if (urlRoomCode) {
            restoreSession(urlRoomCode);
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
            // Validate 6-digit code
            if (/^\d{6}$/.test(code)) {
                return code;
            }
        }
        return null;
    }
    
    /**
     * Restore session from sessionStorage
     */
    function restoreSession(urlRoomCode) {
        try {
            const stored = sessionStorage.getItem('live_quiz_session');
            if (!stored) {
                // No session, pre-fill room code if in URL
                const roomCodeInput = document.getElementById('room-code');
                if (roomCodeInput && urlRoomCode) {
                    roomCodeInput.value = urlRoomCode;
                }
                return;
            }
            
            const session = JSON.parse(stored);
            
            // Check if session is not too old (30 minutes)
            const MAX_AGE = 30 * 60 * 1000;
            if (Date.now() - session.timestamp > MAX_AGE) {
                console.log('[Live Quiz] Session expired');
                sessionStorage.removeItem('live_quiz_session');
                return;
            }
            
            // Check if room code matches URL
            if (session.roomCode !== urlRoomCode) {
                console.log('[Live Quiz] Room code mismatch');
                sessionStorage.removeItem('live_quiz_session');
                // Pre-fill with URL code
                const roomCodeInput = document.getElementById('room-code');
                if (roomCodeInput && urlRoomCode) {
                    roomCodeInput.value = urlRoomCode;
                }
                return;
            }
            
            // Restore state
            state.sessionId = session.sessionId;
            state.userId = session.userId;
            state.displayName = session.displayName;
            state.roomCode = session.roomCode;
            state.websocketToken = session.websocketToken;
            
            console.log('[Live Quiz] Session restored:', state.roomCode);
            
            // Show waiting screen
            showScreen('quiz-waiting');
            document.getElementById('waiting-player-name').textContent = state.displayName;
            document.getElementById('waiting-room-code').textContent = state.roomCode;
            
            // Connect to WebSocket
            connectWebSocket();
            
        } catch (error) {
            console.error('[Live Quiz] Failed to restore session:', error);
            sessionStorage.removeItem('live_quiz_session');
        }
    }
    
    /**
     * Check if Socket.io library is loaded
     */
    function checkSocketIOLibrary() {
        if (typeof io === 'undefined') {
            console.error('[Live Quiz] Socket.io library not loaded!');
            showError('join-error', 'Socket.io library không được tải. Vui lòng tải lại trang.');
        } else {
            console.log('[Live Quiz] Socket.io library ready');
        }
    }
    
    function setupEventListeners() {
        // Join form
        const joinForm = document.getElementById('join-form');
        if (joinForm) {
            joinForm.addEventListener('submit', handleJoin);
        }
        
        // Room code input - auto uppercase
        const roomCodeInput = document.getElementById('room-code');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    }
    
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
                },
                body: JSON.stringify({
                    display_name: displayName,
                    room_code: roomCode,
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to join');
            }
            
            if (data.success) {
                state.sessionId = data.session_id;
                state.userId = data.user_id;
                state.displayName = data.display_name;
                state.roomCode = roomCode;
                state.websocketToken = data.websocket_token || '';
                
                // Save to sessionStorage for restore after redirect
                sessionStorage.setItem('live_quiz_session', JSON.stringify({
                    sessionId: state.sessionId,
                    userId: state.userId,
                    displayName: state.displayName,
                    roomCode: state.roomCode,
                    websocketToken: state.websocketToken,
                    timestamp: Date.now()
                }));
                
                // Redirect to /play/{code}
                const playUrl = window.location.origin + '/play/' + roomCode;
                window.location.href = playUrl;
            }
        } catch (error) {
            console.error('Join error:', error);
            showError('join-error', error.message || config.i18n.error);
        }
    }
    
    /**
     * Connect to WebSocket server
     */
    function connectWebSocket() {
        if (!config.websocket || !config.websocket.url) {
            console.error('[Live Quiz] WebSocket URL not configured');
            showError('join-error', 'WebSocket chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
            return;
        }
        
        if (typeof io === 'undefined') {
            console.error('[Live Quiz] Socket.io library not available');
            showError('join-error', 'Socket.io không khả dụng. Vui lòng tải lại trang.');
            return;
        }
        
        console.log('[Live Quiz] Connecting to WebSocket:', config.websocket.url);
        console.log('[Live Quiz] WebSocket token:', {
            hasToken: !!state.websocketToken,
            tokenLength: state.websocketToken ? state.websocketToken.length : 0,
            userId: state.userId,
            sessionId: state.sessionId
        });
        
        if (!state.websocketToken) {
            console.error('[Live Quiz] No WebSocket token available!');
            showError('join-error', 'Không thể kết nối WebSocket. Vui lòng thử lại.');
            return;
        }
        
        // Initialize Socket.io connection with JWT token
        state.socket = io(config.websocket.url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: state.maxReconnectAttempts,
            auth: {
                token: state.websocketToken
            }
        });
        
        // Connection events
        state.socket.on('connect', () => {
            console.log('[Live Quiz] WebSocket connected');
            state.isConnected = true;
            state.reconnectAttempts = 0;
            hideConnectionStatus();
            
            // Join the session room
            state.socket.emit('join_session', {
                session_id: state.sessionId,
                user_id: state.userId,
                display_name: state.displayName
            });
        });
        
        state.socket.on('disconnect', (reason) => {
            console.log('[Live Quiz] WebSocket disconnected:', reason);
            state.isConnected = false;
            showConnectionStatus(config.i18n.connection_lost, 'warning');
        });
        
        state.socket.on('connect_error', (error) => {
            console.error('[Live Quiz] Connection error:', error);
            state.reconnectAttempts++;
            
            if (state.reconnectAttempts >= state.maxReconnectAttempts) {
                showConnectionStatus('Không thể kết nối. Vui lòng tải lại trang.', 'error');
            }
        });
        
        state.socket.on('reconnect', (attemptNumber) => {
            console.log('[Live Quiz] Reconnected after', attemptNumber, 'attempts');
            showConnectionStatus(config.i18n.connection_restored, 'success');
            setTimeout(() => hideConnectionStatus(), 2000);
        });
        
        // Quiz events
        state.socket.on('session_state', handleSessionState);
        state.socket.on('question_start', handleQuestionStart);
        state.socket.on('question_end', handleQuestionEnd);
        state.socket.on('session_end', handleSessionEnd);
        state.socket.on('participant_joined', (data) => {
            updateParticipantCount(data.total_participants);
        });
    }
    
    function handleSessionState(data) {
        console.log('[Live Quiz] Session state:', data);
        
        if (data.status === 'lobby') {
            showScreen('quiz-waiting');
        } else if (data.status === 'playing' || data.status === 'question') {
            // Quiz has started or question in progress
        } else if (data.status === 'ended') {
            showScreen('quiz-final');
        }
    }
    
    function handleQuestionStart(data) {
        console.log('Question start:', data);
        
        state.currentQuestion = data;
        state.questionStartTime = data.start_time;
        
        showScreen('quiz-question');
        displayQuestion(data);
        startTimer(data.question.time_limit);
    }
    
    function displayQuestion(data) {
        const questionNumber = data.question_index + 1;
        
        document.querySelector('.question-number').textContent = 
            config.i18n.question + ' ' + questionNumber;
        document.querySelector('.question-text').textContent = data.question.text;
        
        // Display choices
        const container = document.getElementById('choices-container');
        container.innerHTML = '';
        
        data.question.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.dataset.choiceId = index;
            button.textContent = choice.text;
            button.addEventListener('click', () => handleAnswerSelect(index));
            container.appendChild(button);
        });
    }
    
    function startTimer(seconds) {
        clearInterval(state.timerInterval);
        
        let remaining = seconds;
        const timerFill = document.querySelector('.timer-fill');
        const timerText = document.querySelector('.timer-text');
        
        const updateTimer = () => {
            remaining -= 0.1;
            
            if (remaining <= 0) {
                remaining = 0;
                clearInterval(state.timerInterval);
                disableChoices();
            }
            
            const percentage = (remaining / seconds) * 100;
            timerFill.style.width = percentage + '%';
            timerText.textContent = Math.ceil(remaining) + 's';
            
            // Change color when time is running out
            if (percentage < 20) {
                timerFill.style.backgroundColor = '#e74c3c';
            } else if (percentage < 50) {
                timerFill.style.backgroundColor = '#f39c12';
            }
        };
        
        updateTimer();
        state.timerInterval = setInterval(updateTimer, 100);
    }
    
    async function handleAnswerSelect(choiceId) {
        // Disable all choices
        disableChoices();
        
        // Highlight selected
        const buttons = document.querySelectorAll('.choice-button');
        buttons[choiceId].classList.add('selected');
        
        try {
            const response = await fetch(config.restUrl + '/answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': config.nonce,
                },
                body: JSON.stringify({
                    session_id: state.sessionId,
                    user_id: state.userId,
                    choice_id: choiceId,
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit answer');
            }
            
            console.log('Answer submitted:', data);
            
            // Show feedback
            if (data.is_correct) {
                buttons[choiceId].classList.add('correct');
            } else {
                buttons[choiceId].classList.add('incorrect');
            }
            
        } catch (error) {
            console.error('Answer error:', error);
            showConnectionStatus(error.message, 'error');
        }
    }
    
    function disableChoices() {
        const buttons = document.querySelectorAll('.choice-button');
        buttons.forEach(button => {
            button.disabled = true;
        });
    }
    
    function handleQuestionEnd(data) {
        console.log('Question end:', data);
        
        clearInterval(state.timerInterval);
        
        showScreen('quiz-results');
        displayResults(data);
    }
    
    function displayResults(data) {
        // Show correct answer in previous screen
        const buttons = document.querySelectorAll('.choice-button');
        buttons.forEach((button, index) => {
            if (index === data.correct_answer) {
                button.classList.add('correct-answer');
            }
        });
        
        // Display leaderboard
        displayLeaderboard(data.leaderboard, 'leaderboard');
        
        // Show user rank
        const userRank = data.leaderboard.find(entry => entry.user_id === state.userId);
        if (userRank) {
            document.getElementById('your-rank').textContent = userRank.rank;
            document.getElementById('your-score').textContent = userRank.total_score;
        }
        
        // Show feedback
        const feedbackIcon = document.querySelector('.feedback-icon');
        const feedbackText = document.querySelector('.feedback-text');
        
        // Check if user answered correctly (look in buttons)
        const selectedButton = document.querySelector('.choice-button.selected');
        if (selectedButton) {
            const isCorrect = parseInt(selectedButton.dataset.choiceId) === data.correct_answer;
            if (isCorrect) {
                feedbackIcon.textContent = '✓';
                feedbackIcon.className = 'feedback-icon correct';
                feedbackText.textContent = config.i18n.correct;
            } else {
                feedbackIcon.textContent = '✗';
                feedbackIcon.className = 'feedback-icon incorrect';
                feedbackText.textContent = config.i18n.incorrect;
            }
        }
    }
    
    function handleSessionEnd(data) {
        console.log('Session end:', data);
        
        showScreen('quiz-final');
        displayFinalResults(data);
    }
    
    function displayFinalResults(data) {
        displayLeaderboard(data.leaderboard, 'final-leaderboard');
        
        const userEntry = data.leaderboard.find(entry => entry.user_id === state.userId);
        if (userEntry) {
            document.getElementById('final-rank').textContent = userEntry.rank;
            document.getElementById('final-score').textContent = userEntry.total_score;
        }
    }
    
    function displayLeaderboard(entries, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        entries.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            if (entry.user_id === state.userId) {
                item.classList.add('current-user');
            }
            
            const rankBadge = document.createElement('span');
            rankBadge.className = 'rank-badge';
            if (entry.rank === 1) rankBadge.classList.add('gold');
            else if (entry.rank === 2) rankBadge.classList.add('silver');
            else if (entry.rank === 3) rankBadge.classList.add('bronze');
            rankBadge.textContent = entry.rank;
            
            const name = document.createElement('span');
            name.className = 'player-name';
            name.textContent = entry.display_name;
            
            const score = document.createElement('span');
            score.className = 'player-score';
            score.textContent = entry.total_score;
            
            item.appendChild(rankBadge);
            item.appendChild(name);
            item.appendChild(score);
            container.appendChild(item);
        });
    }
    
    function updateParticipantCount(count) {
        const elem = document.getElementById('participant-count');
        if (elem) {
            elem.textContent = count + ' người chơi đang chờ';
        }
    }
    
    function showScreen(screenId) {
        document.querySelectorAll('.quiz-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    }
    
    function showError(elementId, message) {
        const elem = document.getElementById(elementId);
        if (elem) {
            elem.textContent = message;
            elem.style.display = 'block';
            setTimeout(() => {
                elem.style.display = 'none';
            }, 5000);
        }
    }
    
    function showConnectionStatus(message, type) {
        const statusElem = document.getElementById('connection-status');
        const textElem = statusElem.querySelector('.status-text');
        
        statusElem.className = 'connection-status ' + type;
        textElem.textContent = message;
        statusElem.style.display = 'block';
    }
    
    function hideConnectionStatus() {
        const statusElem = document.getElementById('connection-status');
        statusElem.style.display = 'none';
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (state.socket && state.socket.connected) {
            state.socket.disconnect();
        }
        clearInterval(state.timerInterval);
    });
    
})();
