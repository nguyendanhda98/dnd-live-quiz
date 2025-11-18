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
        serverStartTime: null, // Server timestamp when question started
        displayStartTime: null, // Local timestamp when we start displaying (for offset calculation)
        timerInterval: null,
        connectionId: null, // Unique ID for this tab/device
        
        // WebSocket connection
        socket: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        isConnected: false,
        
        // Ping measurement
        pingInterval: null,
        lastPing: null,
        currentPing: null,
    };
    
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
        console.log('=== [PLAYER] INIT STARTED ===');
        console.log('[PLAYER] Current URL:', window.location.href);
        
        setupEventListeners();
        checkSocketIOLibrary();
        
        const urlRoomCode = extractRoomCodeFromUrl();
        console.log('[PLAYER] URL room code:', urlRoomCode);
        
        // ONLY restore from server (user must be logged in)
        console.log('[PLAYER] Fetching user active session from server...');
        const serverSession = await fetchUserActiveSession();
        console.log('[PLAYER] Server session response:', serverSession);
        
        if (serverSession) {
            console.log('[PLAYER] Found server session, attempting to restore...');
            const restored = restoreSessionFromData(serverSession, urlRoomCode);
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
            // ALWAYS generate NEW connectionId to trigger multi-device kick
            state.connectionId = generateConnectionId();
            
            console.log('[Live Quiz] Session restored from server with NEW connectionId:', state.connectionId);
            console.log('[Live Quiz] Room code:', state.roomCode);
            
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
            
            // Note: NO localStorage - server is source of truth
            
            return true;
        } catch (error) {
            console.error('[Live Quiz] Failed to restore session from data:', error);
            return false;
        }
    }
    
    /**
     * Restore session - REMOVED
     * No longer using localStorage - server is the source of truth
     * Users must be logged in to play
     */
    
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
                    console.error('[Live Quiz] Error leaving session:', error);
                }
            }
            
            // Disconnect WebSocket
            if (state.socket) {
                state.socket.disconnect();
            }
            
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
                    'X-WP-Nonce': config.nonce,
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
                
                // Note: NO localStorage - server handles session persistence
                
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
            
            // Start ping measurement
            startPingMeasurement();
            
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
            stopPingMeasurement();
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
        state.socket.on('quiz_countdown', handleQuizCountdown);
        state.socket.on('question_start', handleQuestionStart);
        state.socket.on('question_end', handleQuestionEnd);
        state.socket.on('show_top3', handleShowTop3);
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
        
        // Listen for kicked from session by host
        state.socket.on('kicked_from_session', (data) => {
            console.log('[PLAYER] ✗ KICKED BY HOST ✗');
            console.log('[PLAYER] Message:', data.message);
            console.log('[PLAYER] Data:', data);
            handleKickedByHost(data);
        });
        
        // Listen for session ended by host - kick all players
        state.socket.on('session_ended_kicked', (data) => {
            console.log('[PLAYER] ✗ KICKED OUT OF ROOM ✗');
            console.log('[PLAYER] Reason:', data.message);
            console.log('[PLAYER] Data:', data);
            handleSessionEndedKicked(data);
        });
        
        // Listen for force_disconnect (when user opens new tab/device)
        state.socket.on('force_disconnect', (data) => {
            console.log('[PLAYER] ✗ FORCE DISCONNECTED ✗');
            console.log('[PLAYER] Reason:', data.reason);
            console.log('[PLAYER] Message:', data.message);
            handleForceDisconnect(data);
        });
        
        // Listen for pong response to measure ping
        state.socket.on('pong_measure', (data) => {
            if (state.lastPing && data.timestamp === state.lastPing) {
                const ping = Date.now() - state.lastPing;
                updatePingDisplay(ping);
            }
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
    
    function handleQuizCountdown(data) {
        console.log('[PLAYER] Quiz countdown:', data);
        
        showScreen('quiz-countdown');
        
        let count = data.count || 3;
        const countdownEl = document.getElementById('countdown-number');
        if (countdownEl) {
            countdownEl.textContent = count;
        }
    }
    

    
    function handleShowTop3(data) {
        console.log('[PLAYER] Show top 3:', data);
        showScreen('quiz-top3');
        
        const leaderboard = data.top3 || [];
        const top10 = leaderboard.slice(0, 10);
        const top3 = leaderboard.slice(0, 3);
        
        // Display podium for top 3
        const podiumEl = document.getElementById('top3-podium');
        if (podiumEl && top3.length > 0) {
            podiumEl.innerHTML = '';
            
            const medals = ['🥇', '🥈', '🥉'];
            const places = ['first', 'second', 'third'];
            
            top3.forEach((player, index) => {
                const placeDiv = document.createElement('div');
                placeDiv.className = `podium-place ${places[index]}`;
                
                // Highlight current user
                if (player.user_id === state.userId) {
                    placeDiv.classList.add('current-user');
                }
                
                placeDiv.innerHTML = `
                    <div class="podium-medal">${medals[index]}</div>
                    <div class="podium-name">${escapeHtml(player.display_name || player.name || 'Player')}</div>
                    <div class="podium-score">${Math.round(player.total_score || player.score || 0)} pts</div>
                    <div class="podium-stand">#${index + 1}</div>
                    `;
                    
                
                podiumEl.appendChild(placeDiv);
            });
        }
        
        // Display ranks 4-10 below podium
        const listEl = document.getElementById('top3-list');
        if (listEl && top10.length > 3) {
            listEl.innerHTML = '';
            
            const remaining = top10.slice(3);
            remaining.forEach((player, index) => {
                const actualRank = index + 4;
                const itemDiv = document.createElement('div');
                itemDiv.className = `top10-item`;
                
                // Highlight current user
                if (player.user_id === state.userId) {
                    itemDiv.classList.add('current-user');
                }
                
                itemDiv.innerHTML = `
                    <div class="top10-rank">#${actualRank}</div>
                    <div class="top10-name">${escapeHtml(player.display_name || player.name || 'Player')}</div>
                    <div class="top10-score">${Math.round(player.total_score || player.score || 0)}</div>
                `;
                
                listEl.appendChild(itemDiv);
            });
        }
    }
    
    function handleQuestionStart(data) {
        console.log('Question start:', data);
        
        state.currentQuestion = data;
        state.questionStartTime = data.start_time;
        state.serverStartTime = data.start_time; // Store server timestamp
        
        showScreen('quiz-question');
        displayQuestion(data);
        // Timer will be started by displayQuestion after question is displayed
    }
    
    function displayQuestion(data) {
        const questionNumber = data.question_index + 1;
        
        document.querySelector('.question-number').textContent = 
            config.i18n.question + ' ' + questionNumber;
        
        // Display question text immediately
        const questionElement = document.querySelector('.question-text');
        questionElement.textContent = data.question.text;
        
        // Clear choices container (don't show yet)
        const container = document.getElementById('choices-container');
        container.innerHTML = '';
        container.style.display = 'none'; // Hide initially
        
        // Record when we finish displaying question (for offset calculation)
        state.displayStartTime = Date.now() / 1000;
        
        // After 3 seconds: show choices and start timer immediately
        setTimeout(() => {
            // Display all choices
            data.question.choices.forEach((choice, index) => {
                const button = document.createElement('button');
                button.className = 'choice-button';
                button.dataset.choiceId = index;
                button.textContent = choice.text;
                button.addEventListener('click', () => handleAnswerSelect(index));
                container.appendChild(button);
            });
            
            // Show choices container
            container.style.display = '';
            
            // Start timer immediately when choices appear
            startTimer(data.question.time_limit);
        }, 3000);
    }
    
    /**
     * Typewriter effect - display text character by character
     * @param {HTMLElement} element - Element to display text in
     * @param {string} text - Text to display
     * @param {number} speed - Speed in milliseconds per character
     * @param {function} callback - Optional callback when complete
     */
    function typewriterEffect(element, text, speed = 50, callback) {
        let index = 0;
        element.textContent = '';
        
        function typeNextCharacter() {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
                setTimeout(typeNextCharacter, speed);
            } else if (callback) {
                // Call callback after typewriter is complete
                callback();
            }
        }
        
        typeNextCharacter();
    }
    
    function startTimer(seconds) {
        clearInterval(state.timerInterval);
        
        const maxPoints = 1000;
        const minPoints = 0;
        
        console.log('[PLAYER] Timer start - Max points:', maxPoints);
        
        // Calculate display offset (time from server start to now)
        // This includes: network delay + display time + 3s fixed delay
        const displayOffset = state.displayStartTime ? (Date.now() / 1000) - state.displayStartTime + 3 : 3;
        console.log('[PLAYER] Display offset:', displayOffset.toFixed(2), 'seconds');
        
        // Use server timestamp if available, otherwise fallback to local time
        const serverStartTime = state.serverStartTime || (Date.now() / 1000);
        // Adjust server start time by display offset so timer starts from "now"
        const adjustedStartTime = serverStartTime + displayOffset;
        const endTime = adjustedStartTime + seconds;
        
        const timerFill = document.querySelector('.timer-fill');
        const timerText = document.querySelector('.timer-text');
        
        const updateTimer = () => {
            // Calculate elapsed time based on adjusted timestamp
            const nowSeconds = Date.now() / 1000;
            const elapsed = Math.max(0, nowSeconds - adjustedStartTime); // Never negative
            const remaining = Math.max(0, endTime - nowSeconds);
            
            if (remaining <= 0) {
                clearInterval(state.timerInterval);
                timerFill.style.width = '0%';
                timerText.textContent = minPoints + ' pts';
                disableChoices();
                // Timer ended - wait for server to show correct answer
                return;
            }
            
            const percentage = (remaining / seconds) * 100;
            timerFill.style.width = percentage + '%';
            
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
            
            timerText.textContent = currentPoints + ' pts';
            
            // Change color based on percentage of max points
            const pointsPercentage = (currentPoints / maxPoints) * 100;
            if (pointsPercentage < 40) {
                timerFill.style.backgroundColor = '#e74c3c';
                timerText.style.color = '#e74c3c';
            } else if (pointsPercentage < 70) {
                timerFill.style.backgroundColor = '#f39c12';
                timerText.style.color = '#f39c12';
            } else {
                timerFill.style.backgroundColor = '#2ecc71';
                timerText.style.color = '#2ecc71';
            }
        };
        
        updateTimer();
        state.timerInterval = setInterval(updateTimer, 100);
    }
    
    async function handleAnswerSelect(choiceId) {
        // Stop the timer immediately and freeze the points
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        
        // Get current points value to freeze it
        const timerText = document.querySelector('.timer-text');
        const currentPoints = timerText.textContent; // Keep the current display
        
        console.log('[PLAYER] Answer selected, timer stopped at:', currentPoints);
        
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
                    choice_id: choiceId,
                }),
            });
            
            // Log response details
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            // Get text first to see what we receive
            const text = await response.text();
            console.log('Response text:', text);
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('JSON parse error:', e);
                console.error('Response was not JSON:', text);
                throw new Error('Server returned invalid response');
            }
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit answer');
            }
            
            console.log('Answer submitted:', data);
            
            // Update timer text with actual score from server
            if (data.score !== undefined) {
                const timerText = document.querySelector('.timer-text');
                if (timerText) {
                    timerText.textContent = data.score + ' pts';
                    console.log('[PLAYER] Updated display with server score:', data.score);
                }
            }
            
            // Don't show correct/incorrect yet - wait for question_end
            // Just keep the 'selected' highlight
            
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
        console.log('Correct answer index:', data.correct_answer);
        
        clearInterval(state.timerInterval);
        
        // Wait 1 second before showing correct answer
        setTimeout(() => {
            // Show correct answer and mark selected answer
            const buttons = document.querySelectorAll('.choice-button');
            buttons.forEach((button, index) => {
                const isCorrect = data.correct_answer !== undefined && index === data.correct_answer;
                const isSelected = button.classList.contains('selected');
                
                if (isCorrect) {
                    // Mark correct answer
                    button.classList.add('correct-answer');
                    button.style.borderColor = '#2ecc71';
                    button.style.borderWidth = '5px';
                    button.style.backgroundColor = '#2ecc71';
                    button.style.color = 'white';
                    button.style.fontWeight = 'bold';
                    
                    // Add checkmark
                    const originalText = button.textContent;
                    button.innerHTML = '✓ ' + originalText;
                } else if (isSelected) {
                    // Mark selected wrong answer
                    button.classList.add('incorrect');
                    button.style.borderColor = '#e74c3c';
                    button.style.borderWidth = '5px';
                    button.style.backgroundColor = '#e74c3c';
                    button.style.color = 'white';
                    button.style.fontWeight = 'bold';
                    
                    // Add X mark
                    const originalText = button.textContent;
                    button.innerHTML = '✗ ' + originalText;
                }
            });
            
            console.log('[PLAYER] Correct answer shown, waiting 5 seconds...');
            
            // After 5 seconds, show results screen (or wait for next question)
            // Actually, let's keep showing the answer until next question starts
        }, 1000);
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
        
        // Note: Server has already cleared session
        
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
        
        showScreen('quiz-final');
        displayFinalResults(data);
    }
    
    /**
     * Handle when user opens new tab/device - force disconnect old tabs
     * This ensures only ONE device/tab can participate at a time
     */
    function handleForceDisconnect(data) {
        console.log('[PLAYER] ========================================')
        console.log('[PLAYER] ✗ FORCE DISCONNECTED - Multi-device detected');
        console.log('[PLAYER] ========================================')
        console.log('[PLAYER] Reason:', data.reason);
        console.log('[PLAYER] Message:', data.message);
        console.log('[PLAYER] Timestamp:', new Date(data.timestamp).toLocaleString());
        console.log('[PLAYER] Session before disconnect:', {
            sessionId: state.sessionId,
            userId: state.userId,
            displayName: state.displayName,
            roomCode: state.roomCode,
            connectionId: state.connectionId
        });
        
        // CRITICAL: Disable reconnection to prevent auto-rejoin
        if (state.socket) {
            console.log('[PLAYER] Disabling reconnection and disconnecting socket...');
            state.socket.io.opts.reconnection = false; // Disable auto-reconnect
            state.socket.off(); // Remove all event listeners
            state.socket.disconnect();
        }
        
        // Reset client state (server handles session)
        console.log('[PLAYER] Resetting client state...');
        
        // Reset state completely
        state.sessionId = null;
        state.userId = null;
        state.displayName = null;
        state.roomCode = null;
        state.websocketToken = null;
        state.isConnected = false;
        state.currentQuestion = null;
        state.connectionId = null;
        
        console.log('[PLAYER] ✓ All session data cleared');
        console.log('[PLAYER] Redirecting to home page...');
        console.log('[PLAYER] ========================================');
        
        // Show a brief notification before redirect (optional)
        // You can uncomment this if you want to show an alert
        // alert(data.message || 'Bạn đã mở phiên này từ thiết bị/tab khác.');
        
        // Redirect to home page immediately
        window.location.href = config.homeUrl || '/';
    }
    
    /**
     * Handle when player is kicked by host
     */
    function handleKickedByHost(data) {
        console.log('[PLAYER] === KICKED BY HOST ===');
        console.log('[PLAYER] Message:', data.message);
        console.log('[PLAYER] Session before kick:', {
            sessionId: state.sessionId,
            userId: state.userId,
            roomCode: state.roomCode
        });
        
        // CRITICAL: Disable reconnection to prevent auto-rejoin
        if (state.socket) {
            console.log('[PLAYER] Disabling reconnection and disconnecting socket...');
            state.socket.io.opts.reconnection = false; // Disable auto-reconnect
            state.socket.off(); // Remove all event listeners
            state.socket.disconnect();
        }
        
        // Reset state completely (server-side session already cleared by kick)
        console.log('[PLAYER] Resetting client state...');
        state.sessionId = null;
        state.userId = null;
        state.displayName = null;
        state.roomCode = null;
        state.websocketToken = null;
        state.isConnected = false;
        state.currentQuestion = null;
        
        console.log('[PLAYER] State reset complete, showing kicked message...');
        
        // Call server to ensure session is cleared
        fetch(config.restUrl + '/user/clear-session', {
            method: 'POST',
            headers: {
                'X-WP-Nonce': config.nonce,
                'Content-Type': 'application/json'
            }
        }).catch(err => console.error('[PLAYER] Failed to clear session:', err));
        
        // Show kicked message
        const kickMessage = data.message || 'Bạn đã bị kick khỏi phòng bởi host.';
        
        // Show alert first (blocking)
        alert('❌ ' + kickMessage + '\n\nNếu muốn vào lại, bạn cần nhập lại mã phòng.');
        
        // Then show lobby with error message
        showScreen('quiz-lobby');
        
        // Show error message in the form
        const errorElement = document.getElementById('join-error');
        if (errorElement) {
            errorElement.innerHTML = `
                <div class="error-box kicked" style="background: #fee; border: 2px solid #c00; padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <h3 style="color: #c00; margin: 0 0 10px 0;">❌ Đã bị kick khỏi phòng</h3>
                    <p style="margin: 0;">${kickMessage}</p>
                    <p style="margin: 10px 0 0 0; font-size: 0.9em;">Nếu muốn vào lại, vui lòng nhập lại mã phòng.</p>
                </div>
            `;
            errorElement.style.display = 'block';
        }
        
        console.log('[PLAYER] Kicked message displayed - reconnection disabled');
    }

    /**
     * Handle when host ends the room and kicks all players
     */
    function handleSessionEndedKicked(data) {
        console.log('[PLAYER] === KICKED OUT BY HOST ===');
        console.log('[PLAYER] Reason:', data.reason);
        console.log('[PLAYER] Session before kick:', {
            sessionId: state.sessionId,
            userId: state.userId,
            roomCode: state.roomCode
        });
        
        // CRITICAL: Disable reconnection to prevent auto-rejoin
        if (state.socket) {
            console.log('[PLAYER] Disabling reconnection and disconnecting socket...');
            state.socket.io.opts.reconnection = false; // Disable auto-reconnect
            state.socket.off(); // Remove all event listeners  
            state.socket.disconnect();
        }
        
        // Reset client state (server handles session)
        console.log('[PLAYER] Resetting client state...');
        
        // Reset state completely
        state.sessionId = null;
        state.userId = null;
        state.displayName = null;
        state.roomCode = null;
        state.websocketToken = null;
        state.isConnected = false;
        state.currentQuestion = null;
        
        console.log('[PLAYER] All session data cleared');
        
        // Call server to ensure session is cleared
        fetch(config.restUrl + '/user/clear-session', {
            method: 'POST',
            headers: {
                'X-WP-Nonce': config.nonce,
                'Content-Type': 'application/json'
            }
        }).catch(err => console.error('[PLAYER] Failed to clear session:', err));
        
        console.log('[PLAYER] Redirecting to home...');
        
        // Show alert with clear message
        const endMessage = data.message || 'Host đã kết thúc phòng.';
        alert('🚪 ' + endMessage + '\n\nBạn sẽ được chuyển về trang chủ.');
        
        // Redirect to home immediately after alert is dismissed
        window.location.href = config.homeUrl || '/';
    }
    
    function displayFinalResults(data) {
        const leaderboard = data.leaderboard || [];
        const top10 = leaderboard.slice(0, 10);
        const top3 = leaderboard.slice(0, 3);
        
        // Display podium for top 3
        const podiumEl = document.getElementById('player-top3-podium');
        if (podiumEl && top3.length > 0) {
            podiumEl.innerHTML = '';
            
            const medals = ['🥇', '🥈', '🥉'];
            const places = ['first', 'second', 'third'];
            
            top3.forEach((player, index) => {
                const placeDiv = document.createElement('div');
                placeDiv.className = `podium-place ${places[index]}`;
                
                // Highlight current user
                if (player.user_id === state.userId) {
                    placeDiv.classList.add('current-user');
                }
                
                placeDiv.innerHTML = `
                    <div class="podium-medal">${medals[index]}</div>
                    <div class="podium-name">${escapeHtml(player.display_name || player.name || 'Player')}</div>
                    <div class="podium-score">${Math.round(player.total_score || player.score || 0)} pts</div>
                    <div class="podium-stand">#${index + 1}</div>
                `;
                
                podiumEl.appendChild(placeDiv);
            });
        }
        
        // Display ranks 4-10 below podium
        const listEl = document.getElementById('player-top10-list');
        if (listEl) {
            listEl.innerHTML = '';
            
            const remaining = top10.slice(3);
            remaining.forEach((player, index) => {
                const actualRank = index + 4;
                const itemDiv = document.createElement('div');
                itemDiv.className = `top10-item`;
                
                // Highlight current user
                if (player.user_id === state.userId) {
                    itemDiv.classList.add('current-user');
                }
                
                itemDiv.innerHTML = `
                    <div class="top10-rank">#${actualRank}</div>
                    <div class="top10-name">${escapeHtml(player.display_name || player.name || 'Player')}</div>
                    <div class="top10-score">${Math.round(player.total_score || player.score || 0)}</div>
                `;
                
                listEl.appendChild(itemDiv);
            });
        }
    }
    
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
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
    /**
     * Start ping measurement
     */
    function startPingMeasurement() {
        if (!state.socket || !state.isConnected) {
            return;
        }
        
        // Clear existing interval
        if (state.pingInterval) {
            clearInterval(state.pingInterval);
        }
        
        // Measure ping every 2 seconds
        state.pingInterval = setInterval(() => {
            if (state.socket && state.isConnected) {
                state.lastPing = Date.now();
                state.socket.emit('ping_measure', { timestamp: state.lastPing });
            }
        }, 2000);
        
        // Show ping indicator
        const pingEl = document.getElementById('ping-indicator');
        if (pingEl) {
            pingEl.style.display = 'flex';
        }
    }
    
    /**
     * Stop ping measurement
     */
    function stopPingMeasurement() {
        if (state.pingInterval) {
            clearInterval(state.pingInterval);
            state.pingInterval = null;
        }
        
        // Hide ping indicator
        const pingEl = document.getElementById('ping-indicator');
        if (pingEl) {
            pingEl.style.display = 'none';
        }
    }
    
    /**
     * Update ping display
     */
    function updatePingDisplay(ping) {
        state.currentPing = ping;
        
        const pingEl = document.getElementById('ping-indicator');
        if (!pingEl) return;
        
        const pingValue = pingEl.querySelector('.ping-value');
        if (pingValue) {
            pingValue.textContent = ping;
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
