/**
 * Live Quiz Player JavaScript - Phase 2
 * 
 * Supports WebSocket (Socket.io) with automatic fallback to SSE
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
        currentQuestion: null,
        questionStartTime: null,
        timerInterval: null,
        
        // Connection state
        connectionType: null, // 'websocket' or 'sse'
        socket: null, // Socket.io instance
        sseConnection: null, // SSE EventSource
        
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        isConnected: false,
    };
    
    // Config from WordPress
    const config = window.liveQuizConfig || {};
    
    // BroadcastChannel for multi-tab communication
    let roomChannel = null;
    const STORAGE_KEY = 'live_quiz_session';
    
    // Initialize
    document.addEventListener('DOMContentLoaded', init);
    
    function init() {
        setupEventListeners();
        detectSocketIOLibrary();
        
        // Try to restore session from localStorage
        restoreSession();
        
        // Setup multi-tab communication
        setupBroadcastChannel();
    }
    
    /**
     * Detect if Socket.io library is loaded
     */
    function detectSocketIOLibrary() {
        if (typeof io !== 'undefined') {
            console.log('[Live Quiz] Socket.io library detected');
        } else if (config.websocket && config.websocket.enabled) {
            console.warn('[Live Quiz] Socket.io library not loaded, will use SSE fallback');
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
        const leaveButtons = document.querySelectorAll('.leave-room-btn');
        leaveButtons.forEach(btn => {
            btn.addEventListener('click', handleLeaveRoom);
        });
    }
    
    /**
     * Setup BroadcastChannel for multi-tab communication
     */
    function setupBroadcastChannel() {
        if (typeof BroadcastChannel === 'undefined') {
            console.warn('[Live Quiz] BroadcastChannel not supported');
            return;
        }
        
        // Create unique channel per room (or general if no room)
        const channelName = state.roomCode ? `live_quiz_${state.roomCode}` : 'live_quiz_general';
        roomChannel = new BroadcastChannel(channelName);
        
        // Listen for messages from other tabs
        roomChannel.onmessage = (event) => {
            const { type, roomCode, timestamp } = event.data;
            
            if (type === 'tab_opened' && roomCode === state.roomCode && state.sessionId) {
                // Another tab opened the same room
                // This is the old tab, redirect to home
                console.log('[Live Quiz] Another tab opened, redirecting to home...');
                
                // Clear session
                clearSession();
                
                // Redirect to home
                const homeUrl = window.location.origin;
                window.location.href = homeUrl;
            }
        };
        
        // Broadcast that this tab has opened
        if (state.roomCode && state.sessionId) {
            roomChannel.postMessage({
                type: 'tab_opened',
                roomCode: state.roomCode,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Save session to localStorage
     */
    function saveSession() {
        if (!state.sessionId || !state.userId) return;
        
        const session = {
            sessionId: state.sessionId,
            userId: state.userId,
            displayName: state.displayName,
            roomCode: state.roomCode,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } catch (error) {
            console.error('[Live Quiz] Failed to save session:', error);
        }
    }
    
    /**
     * Restore session from localStorage
     */
    function restoreSession() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;
            
            const session = JSON.parse(stored);
            
            // Check if session is not too old (30 minutes)
            const MAX_AGE = 30 * 60 * 1000;
            if (Date.now() - session.timestamp > MAX_AGE) {
                console.log('[Live Quiz] Session expired');
                clearSession();
                return;
            }
            
            // Restore state
            state.sessionId = session.sessionId;
            state.userId = session.userId;
            state.displayName = session.displayName;
            state.roomCode = session.roomCode;
            
            console.log('[Live Quiz] Session restored:', state.roomCode);
            
            // Show waiting screen
            showScreen('quiz-waiting');
            document.getElementById('waiting-player-name').textContent = state.displayName;
            document.getElementById('waiting-room-code').textContent = state.roomCode;
            
            // Verify session with server and reconnect
            verifyAndReconnect();
            
            // Broadcast to other tabs
            if (roomChannel) {
                roomChannel.postMessage({
                    type: 'tab_opened',
                    roomCode: state.roomCode,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('[Live Quiz] Failed to restore session:', error);
            clearSession();
        }
    }
    
    /**
     * Verify session with server and reconnect
     */
    async function verifyAndReconnect() {
        try {
            // Connect to SSE first - server will validate session
            connectSSE();
            
            showConnectionStatus('Đang khôi phục kết nối...', 'info');
            
        } catch (error) {
            console.error('[Live Quiz] Failed to verify session:', error);
            clearSession();
            showScreen('quiz-lobby');
            showError('join-error', 'Không thể khôi phục phiên. Vui lòng tham gia lại.');
        }
    }
    
    /**
     * Clear session from localStorage
     */
    function clearSession() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('[Live Quiz] Failed to clear session:', error);
        }
        
        // Clear state
        state.sessionId = null;
        state.userId = null;
        state.displayName = null;
        state.roomCode = null;
    }
    
    /**
     * Handle leave room
     */
    async function handleLeaveRoom(e) {
        e.preventDefault();
        
        if (!confirm('Bạn có chắc muốn rời khỏi phòng?')) {
            return;
        }
        
        try {
            // Close SSE connection
            if (state.sseConnection) {
                state.sseConnection.close();
            }
            
            // Clear timer
            clearInterval(state.timerInterval);
            
            // Call leave API
            if (state.sessionId && state.userId) {
                await fetch(config.restUrl + '/leave', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        session_id: state.sessionId,
                        user_id: state.userId,
                    }),
                });
            }
            
            // Clear session
            clearSession();
            
            // Close broadcast channel
            if (roomChannel) {
                roomChannel.close();
            }
            
            // Reload page to show join form
            location.reload();
            
        } catch (error) {
            console.error('[Live Quiz] Leave error:', error);
            // Still clear and reload on error
            clearSession();
            location.reload();
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
                
                // Save session to localStorage
                saveSession();
                
                // Setup broadcast channel for this room
                if (roomChannel) {
                    roomChannel.close();
                }
                setupBroadcastChannel();
                
                // Show waiting screen
                showScreen('quiz-waiting');
                document.getElementById('waiting-player-name').textContent = displayName;
                document.getElementById('waiting-room-code').textContent = roomCode;
                
                // Connect to SSE
                connectSSE();
            }
        } catch (error) {
            console.error('Join error:', error);
            showError('join-error', error.message || config.i18n.error);
        }
    }
    
    function connectSSE() {
        if (state.sseConnection) {
            state.sseConnection.close();
        }
        
        const sseUrl = config.sseUrl + '&session_id=' + state.sessionId + '&user_id=' + state.userId + '&last_event_time=' + (state.lastEventTime || 0);
        
        state.sseConnection = new EventSource(sseUrl);
        
        state.sseConnection.addEventListener('connected', (e) => {
            console.log('SSE connected');
            state.reconnectAttempts = 0;
            state.isConnected = true;
            hideConnectionStatus();
        });
        
        state.sseConnection.addEventListener('session_state', (e) => {
            const data = JSON.parse(e.data);
            handleSessionState(data);
        });
        
        state.sseConnection.addEventListener('question_start', (e) => {
            const data = JSON.parse(e.data);
            handleQuestionStart(data);
        });
        
        state.sseConnection.addEventListener('question_end', (e) => {
            const data = JSON.parse(e.data);
            handleQuestionEnd(data);
        });
        
        state.sseConnection.addEventListener('session_end', (e) => {
            const data = JSON.parse(e.data);
            handleSessionEnd(data);
        });
        
        state.sseConnection.addEventListener('participant_join', (e) => {
            const data = JSON.parse(e.data);
            updateParticipantCount(data.total_participants);
        });
        
        state.sseConnection.addEventListener('heartbeat', (e) => {
            // Keep connection alive
        });
        
        state.sseConnection.onerror = (error) => {
            console.error('SSE error:', error);
            state.sseConnection.close();
            
            // Attempt reconnection
            if (state.reconnectAttempts < state.maxReconnectAttempts) {
                showConnectionStatus(config.i18n.connection_lost, 'warning');
                state.reconnectAttempts++;
                setTimeout(() => {
                    connectSSE();
                }, 2000 * state.reconnectAttempts);
            } else {
                showConnectionStatus('Mất kết nối. Vui lòng tải lại trang.', 'error');
            }
        };
    }
    
    function handleSessionState(data) {
        console.log('Session state:', data);
        
        if (data.status === 'lobby') {
            showScreen('quiz-waiting');
        } else if (data.status === 'question') {
            // Question already started, will receive question_start event
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
    
    // Cleanup on page unload (but keep session in localStorage for restore)
    window.addEventListener('beforeunload', () => {
        if (state.sseConnection) {
            state.sseConnection.close();
        }
        clearInterval(state.timerInterval);
        
        // Don't clear session - allow restore on page reload
        // Session will be cleared only on explicit leave or expiry
    });
    
    // Close broadcast channel when page is hidden/closed
    window.addEventListener('pagehide', () => {
        if (roomChannel) {
            roomChannel.close();
        }
    });
    
})();
