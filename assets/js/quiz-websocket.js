/**
 * Live Quiz WebSocket - Shared WebSocket functionality
 * 
 * This module provides WebSocket connection and event handling
 * used by both host and player interfaces.
 * 
 * @package LiveQuiz
 * @version 2.0.0
 */

(function(window) {
    'use strict';
    
    const QuizWebSocket = {
        /**
         * Connect to WebSocket server
         * @param {Object} config - Configuration {url, token, sessionId, userId, displayName, isHost}
         * @param {Object} callbacks - Event callbacks
         * @returns {Object} Socket instance
         */
        connect: function(config, callbacks) {
            if (!config.url) {
                console.error('[QuizWebSocket] WebSocket URL not configured');
                return null;
            }
            
            if (typeof io === 'undefined') {
                console.error('[QuizWebSocket] Socket.io library not available');
                return null;
            }
            
            console.log('[QuizWebSocket] Connecting to:', config.url);
            console.log('[QuizWebSocket] Token length:', config.token ? config.token.length : 0);
            
            if (!config.token) {
                console.error('[QuizWebSocket] No WebSocket token available!');
                return null;
            }
            
            const socket = io(config.url, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
                auth: {
                    token: config.token
                }
            });
            
            // Connection events
            socket.on('connect', function() {
                console.log('[QuizWebSocket] Connected');
                QuizCore.state.isConnected = true;
                QuizCore.state.reconnectAttempts = 0;
                
                if (callbacks.onConnect) {
                    callbacks.onConnect();
                }
                
                // Start ping measurement
                QuizCore.startPingMeasurement(socket, callbacks.pingElement);
                
                // Start clock sync
                QuizCore.startClockSync(socket);
                
                // Join session room
                socket.emit('join_session', {
                    session_id: config.sessionId,
                    user_id: config.userId,
                    display_name: config.displayName,
                    connection_id: QuizCore.state.connectionId,
                    is_host: config.isHost || false
                });
            });
            
            socket.on('disconnect', function(reason) {
                console.log('[QuizWebSocket] Disconnected:', reason);
                QuizCore.state.isConnected = false;
                QuizCore.stopPingMeasurement(callbacks.pingElement);
                
                if (callbacks.onDisconnect) {
                    callbacks.onDisconnect(reason);
                }
            });
            
            socket.on('connect_error', function(error) {
                console.error('[QuizWebSocket] Connection error:', error);
                QuizCore.state.reconnectAttempts++;
                
                if (callbacks.onError) {
                    callbacks.onError(error);
                }
            });
            
            socket.on('reconnect', function(attemptNumber) {
                console.log('[QuizWebSocket] Reconnected after', attemptNumber, 'attempts');
                if (callbacks.onReconnect) {
                    callbacks.onReconnect(attemptNumber);
                }
            });
            
            // Clock sync response
            socket.on('clock_sync_response', function(data) {
                QuizCore.handleClockSyncResponse(data, socket);
            });
            
            // Ping response
            socket.on('pong_measure', function(data) {
                QuizCore.updatePingDisplay(data, callbacks.pingElement);
            });
            
            // Quiz events - delegate to callbacks
            socket.on('session_state', function(data) {
                if (callbacks.onSessionState) callbacks.onSessionState(data);
            });
            
            socket.on('quiz_countdown', function(data) {
                if (callbacks.onQuizCountdown) callbacks.onQuizCountdown(data);
            });
            
            socket.on('question_start', function(data) {
                if (callbacks.onQuestionStart) callbacks.onQuestionStart(data);
            });
            
            socket.on('question_end', function(data) {
                if (callbacks.onQuestionEnd) callbacks.onQuestionEnd(data);
            });
            
            socket.on('show_top3', function(data) {
                if (callbacks.onShowTop3) callbacks.onShowTop3(data);
            });
            
            socket.on('session_end', function(data) {
                if (callbacks.onSessionEnd) callbacks.onSessionEnd(data);
            });
            
            socket.on('session:replay', function(data) {
                if (callbacks.onSessionReplay) callbacks.onSessionReplay(data);
            });
            
            socket.on('participant_joined', function(data) {
                if (callbacks.onParticipantJoined) callbacks.onParticipantJoined(data);
            });
            
            socket.on('participant_left', function(data) {
                if (callbacks.onParticipantLeft) callbacks.onParticipantLeft(data);
            });
            
            socket.on('answer_submitted', function(data) {
                if (callbacks.onAnswerSubmitted) callbacks.onAnswerSubmitted(data);
            });
            
            // Kick events
            socket.on('session_kicked', function(data) {
                if (callbacks.onSessionKicked) callbacks.onSessionKicked(data);
            });
            
            socket.on('kicked', function(data) {
                if (callbacks.onKicked) callbacks.onKicked(data);
            });
            
            socket.on('kicked_from_session', function(data) {
                if (callbacks.onKickedFromSession) callbacks.onKickedFromSession(data);
            });
            
            socket.on('session_ended_kicked', function(data) {
                if (callbacks.onSessionEndedKicked) callbacks.onSessionEndedKicked(data);
            });
            
            socket.on('force_disconnect', function(data) {
                if (callbacks.onForceDisconnect) callbacks.onForceDisconnect(data);
            });
            
            QuizCore.state.socket = socket;
            return socket;
        },
        
        /**
         * Disconnect from WebSocket
         */
        disconnect: function() {
            if (QuizCore.state.socket) {
                QuizCore.state.socket.disconnect();
                QuizCore.state.socket = null;
                QuizCore.state.isConnected = false;
            }
        }
    };
    
    // Export to window
    window.QuizWebSocket = QuizWebSocket;
    
})(window);

