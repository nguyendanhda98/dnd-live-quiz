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
        connectionId: null, // Unique ID for this tab/device
        
        // WebSocket connection
        socket: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        isConnected: false,
    };
    
    /**
     * Generate unique connection ID for this tab/device
     */
    function generateConnectionId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Generate unique connection ID for this tab/device
     */
    function generateConnectionId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    // Config from WordPress
    const config = window.liveQuizConfig || {};
    
    // Initialize
    document.addEventListener('DOMContentLoaded', init);
    
    async function init() {
        setupEventListeners();
        checkSocketIOLibrary();
        
        const urlRoomCode = extractRoomCodeFromUrl();
        console.log('[Live Quiz] Init - URL room code:', urlRoomCode);
        
        // Try to restore session from server first (user meta)
        const serverSession = await fetchUserActiveSession();
        
        if (serverSession) {
            console.log('[Live Quiz] Found server session, restoring...');
            const restored = restoreSessionFromData(serverSession, urlRoomCode);
            if (restored) {
                return;
            }
        }
        
        // Fallback to localStorage
        console.log('[Live Quiz] No server session, checking localStorage...');
        console.log('[Live Quiz] Init - Stored session:', localStorage.getItem('live_quiz_session'));
        
        const restored = restoreSession(urlRoomCode);
        console.log('[Live Quiz] Init - Session restored:', restored);
        
        // If session was not restored and we have URL room code, pre-fill it
        if (!restored && urlRoomCode) {
            const roomCodeInput = document.getElementById('room-code');
            if (roomCodeInput) {
                roomCodeInput.value = urlRoomCode;
            }
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
            console.error('[Live Quiz] Failed to fetch user session:', error);
            return null;
        }
    }
    
    /**
     * Restore session from data object
     */
    function restoreSessionFromData(session, urlRoomCode) {
        try {
            console.log('[Live Quiz] Restoring session from data:', session);
            
            // If URL has code that doesn't match, don't restore
            if (urlRoomCode && session.roomCode !== urlRoomCode) {
                console.log('[Live Quiz] URL code mismatch, not restoring');
                return false;
            }
            
            // Restore state
            state.sessionId = session.sessionId;
            state.userId = session.userId;
            state.displayName = session.displayName;
            state.roomCode = session.roomCode;
            state.websocketToken = session.websocketToken;
            state.connectionId = session.connectionId || generateConnectionId();
            
            console.log('[Live Quiz] Session restored from server:', state.roomCode);
            
            // Update URL if needed
            if (!urlRoomCode) {
                const playUrl = '/play/' + state.roomCode;
                window.history.replaceState({ roomCode: state.roomCode }, '', playUrl);
                console.log('[Live Quiz] Redirected to', playUrl);
            }
            
            // Show waiting screen
            showScreen('quiz-waiting');
            document.getElementById('waiting-player-name').textContent = state.displayName;
            document.getElementById('waiting-room-code').textContent = state.roomCode;
            
            // Fetch players list
            fetchPlayersList();
            
            // Connect to WebSocket
            connectWebSocket();
            
            // Also sync to localStorage
            localStorage.setItem('live_quiz_session', JSON.stringify({
                sessionId: state.sessionId,
                userId: state.userId,
                displayName: state.displayName,
                roomCode: state.roomCode,
                websocketToken: state.websocketToken,
                connectionId: state.connectionId,
                timestamp: session.timestamp || Date.now()
            }));
            
            return true;
        } catch (error) {
            console.error('[Live Quiz] Failed to restore session from data:', error);
            return false;
        }
    }
    
    /**
     * Restore session from sessionStorage
     * @returns {boolean} true if session was restored, false otherwise
     */
    function restoreSession(urlRoomCode) {
        try {
            const stored = localStorage.getItem('live_quiz_session');
            console.log('[Live Quiz] restoreSession - urlRoomCode:', urlRoomCode, 'stored:', !!stored);
            
            // Case 1: URL has code but no stored session
            // Just pre-fill the code in form (user needs to enter name)
            if (urlRoomCode && !stored) {
                console.log('[Live Quiz] URL has code but no session - will pre-fill form');
                return false;
            }
            
            // Case 2: No stored session at all
            if (!stored) {
                console.log('[Live Quiz] No stored session found');
                return false;
            }
            
            const session = JSON.parse(stored);
            
            // Check if session is not too old (30 minutes)
            const MAX_AGE = 30 * 60 * 1000;
            if (Date.now() - session.timestamp > MAX_AGE) {
                console.log('[Live Quiz] Session expired');
                localStorage.removeItem('live_quiz_session');
                return false;
            }
            
            // Case 3: URL has code that doesn't match stored session
            // Clear stored session and let user join the URL code
            if (urlRoomCode && session.roomCode !== urlRoomCode) {
                console.log('[Live Quiz] Room code mismatch - URL:', urlRoomCode, 'Stored:', session.roomCode);
                console.log('[Live Quiz] Will clear stored session and prompt for name');
                localStorage.removeItem('live_quiz_session');
                return false;
            }
            
            // Case 4: Has stored session
            // If URL has no code, redirect to /play/{code}
            // If URL matches stored code, restore session
            
            // Restore state
            state.sessionId = session.sessionId;
            state.userId = session.userId;
            state.displayName = session.displayName;
            state.roomCode = session.roomCode;
            state.websocketToken = session.websocketToken;
            
            console.log('[Live Quiz] Session restored:', state.roomCode);
            
            // Update URL if needed (when user opens /play but has active session)
            if (!urlRoomCode) {
                const playUrl = '/play/' + state.roomCode;
                window.history.replaceState({ roomCode: state.roomCode }, '', playUrl);
                console.log('[Live Quiz] Redirected to', playUrl);
            }
            
            // Show waiting screen
            showScreen('quiz-waiting');
            document.getElementById('waiting-player-name').textContent = state.displayName;
            document.getElementById('waiting-room-code').textContent = state.roomCode;
            
            // Fetch players list
            fetchPlayersList();
            
            // Connect to WebSocket
            connectWebSocket();
            
            return true;
            
        } catch (error) {
            console.error('[Live Quiz] Failed to restore session:', error);
            localStorage.removeItem('live_quiz_session');
            return false;
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
        
        // Leave room buttons
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('leave-room-btn') || e.target.classList.contains('leave-room-icon')) {
                handleLeaveRoom();
            }
        });
    }
    
    async function handleLeaveRoom() {
        if (confirm('Bạn có chắc chắn muốn rời khỏi phòng?')) {
            // Call API to leave session (will clear user meta on server)
            const sessionId = state.sessionId;
            const userId = state.userId;
            
            if (sessionId && userId) {
                try {
                    await fetch(config.restUrl + '/leave', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-WP-Nonce': config.nonce
                        },
                        body: JSON.stringify({
                            session_id: sessionId,
                            user_id: userId
                        })
                    });
                } catch (error) {
                    console.error('[Live Quiz] Error leaving session:', error);
                }
            }
            
            // Disconnect WebSocket
            if (state.socket) {
                state.socket.disconnect();
            }
            
            // Clear local storage
            localStorage.removeItem('live_quiz_session');
            
            // Reset state
            state.sessionId = null;
            state.userId = null;
            state.displayName = null;
            state.roomCode = null;
            state.websocketToken = null;
            state.currentQuestion = null;
            state.questionStartTime = null;
            
            // Clear timer
            if (state.timerInterval) {
                clearInterval(state.timerInterval);
            }
            
            // Return to lobby
            showScreen('quiz-lobby');
            
            // Reset URL
            window.history.replaceState({}, '', window.location.pathname);
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
            // Generate connection ID for this session
            const connectionId = generateConnectionId();
            state.connectionId = connectionId;
            
            const response = await fetch(config.restUrl + '/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    display_name: displayName,
                    room_code: roomCode,
                    connection_id: connectionId,
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
                
                // Save to localStorage for restore after closing tab
                const sessionData = {
                    sessionId: state.sessionId,
                    userId: state.userId,
                    displayName: state.displayName,
                    roomCode: state.roomCode,
                    websocketToken: state.websocketToken,
                    connectionId: state.connectionId,
                    timestamp: Date.now()
                };
                console.log('[Live Quiz] Saving session to storage:', sessionData);
                localStorage.setItem('live_quiz_session', JSON.stringify(sessionData));
                console.log('[Live Quiz] Session saved, verify:', localStorage.getItem('live_quiz_session'));
                
                // Update URL without reload using History API
                const playUrl = '/play/' + roomCode;
                window.history.pushState({ roomCode: roomCode }, '', playUrl);
                
                // Show waiting screen (không redirect, chỉ thay đổi UI trong block)
                showScreen('quiz-waiting');
                document.getElementById('waiting-player-name').textContent = displayName;
                document.getElementById('waiting-room-code').textContent = roomCode;
                
                // Fetch and update players list
                fetchPlayersList();
                
                // Connect to WebSocket
                connectWebSocket();
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
            
            // Join the session room with connection ID
            state.socket.emit('join_session', {
                session_id: state.sessionId,
                user_id: state.userId,
                display_name: state.displayName,
                connection_id: state.connectionId
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
            // Don't use data.total_participants as it may include host
            // Fetch actual list from API
            console.log('[Live Quiz] Participant joined event:', data);
            fetchPlayersList();
        });
        
        state.socket.on('participant_left', (data) => {
            console.log('[Live Quiz] Participant left event:', data);
            fetchPlayersList();
        });
        
        // Listen for session kicked (when same user joins from another device)
        state.socket.on('session_kicked', (data) => {
            console.log('[Live Quiz] Session kicked - another device joined:', data);
            handleSessionKicked(data);
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
    
    async function handleSessionKicked(data) {
        console.log('[Live Quiz] Session kicked:', data);
        
        // Disconnect socket
        if (state.socket) {
            state.socket.disconnect();
        }
        
        // Clear local storage
        localStorage.removeItem('liveQuizSession');
        
        // Leave session via API to clean up server-side
        if (state.sessionId && state.userId) {
            try {
                await fetch(`${config.restUrl}sessions/${state.sessionId}/leave`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': config.nonce
                    },
                    body: JSON.stringify({
                        user_id: state.userId
                    })
                });
            } catch (error) {
                console.error('[Live Quiz] Error leaving session:', error);
            }
        }
        
        // Show message and redirect
        alert(data.message || 'Bạn đã tham gia phòng này từ tab/thiết bị khác. Tab này sẽ được chuyển về trang chủ.');
        window.location.href = config.homeUrl || '/';
    }
    
    function handleSessionEnd(data) {
        console.log('Session end:', data);
        
        // Clear session storage as quiz has ended
        localStorage.removeItem('live_quiz_session');
        
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
    
    async function fetchParticipantCount() {
        if (!state.sessionId) return;
        
        try {
            // Public endpoint - no nonce needed
            const response = await fetch(config.restUrl + '/sessions/' + state.sessionId + '/player-count', {
                method: 'GET'
            });
            
            const data = await response.json();
            if (data.success && typeof data.count !== 'undefined') {
                updateParticipantCount(data.count);
            }
        } catch (error) {
            console.error('[Live Quiz] Failed to fetch participant count:', error);
        }
    }
    
    async function fetchPlayersList() {
        if (!state.sessionId) return;
        
        try {
            // Public endpoint - no nonce needed
            const response = await fetch(config.restUrl + '/sessions/' + state.sessionId + '/players-list', {
                method: 'GET'
            });
            
            const data = await response.json();
            if (data.success && data.players) {
                updateParticipantCount(data.players.length);
                updatePlayersList(data.players);
            }
        } catch (error) {
            console.error('[Live Quiz] Failed to fetch players list:', error);
        }
    }
    
    function updateParticipantCount(count) {
        const elem = document.getElementById('participant-count');
        if (elem) {
            elem.textContent = count + ' người chơi đang chờ';
        }
    }
    
    function updatePlayersList(players) {
        const container = document.getElementById('players-waiting-list');
        if (!container) return;
        
        if (players.length === 0) {
            container.innerHTML = '<p class="no-players">Chưa có người chơi nào tham gia</p>';
            return;
        }
        
        let html = '';
        players.forEach(function(player) {
            const displayName = player.display_name || 'Unknown';
            const initial = displayName.charAt(0).toUpperCase();
            
            html += `
                <div class="player-waiting-item">
                    <div class="player-waiting-avatar">${escapeHtml(initial)}</div>
                    <div class="player-waiting-name">${escapeHtml(displayName)}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
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
