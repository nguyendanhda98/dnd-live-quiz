/**
 * Live Quiz Core - Shared functionality for both Host and Player
 * 
 * This module provides core functionality used by both host and player interfaces:
 * - State management
 * - Clock synchronization
 * - Ping measurement
 * - Timer management
 * - Utility functions
 * 
 * @package LiveQuiz
 * @version 2.0.0
 */

(function(window) {
    'use strict';
    
    /**
     * Generate unique connection ID for this tab/device
     */
    function generateConnectionId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * QuizCore - Core functionality shared between host and player
     */
    const QuizCore = {
        // State
        state: {
            sessionId: null,
            userId: null,
            displayName: null,
            roomCode: null,
            websocketToken: null,
            currentQuestion: null,
            questionStartTime: null,
            serverStartTime: null,
            displayStartTime: null,
            displayDelay: 3,
            timerInterval: null,
            timerAccelerated: false,
            connectionId: null,
            
            // WebSocket connection
            socket: null,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5,
            isConnected: false,
            
            // Ping measurement
            pingInterval: null,
            lastPing: null,
            currentPing: null,
            
            // Clock synchronization
            clockOffset: 0,
            syncAttempts: 0,
            maxSyncAttempts: 5,
            
            // Players tracking
            players: {},
            answeredPlayers: [],
            
            // Mode: 'player' or 'host'
            mode: null,
            isHost: false
        },
        
        /**
         * Initialize core with mode (player or host)
         */
        init: function(mode, initialData) {
            console.log('[QuizCore] Initializing in mode:', mode);
            this.state.mode = mode;
            this.state.isHost = (mode === 'host');
            this.state.connectionId = generateConnectionId();
            
            if (initialData) {
                Object.assign(this.state, initialData);
            }
            
            console.log('[QuizCore] Core initialized', {
                mode: this.state.mode,
                isHost: this.state.isHost,
                connectionId: this.state.connectionId
            });
        },
        
        /**
         * Get synchronized server time
         */
        getServerTime: function() {
            return Date.now() + this.state.clockOffset;
        },
        
        /**
         * Start clock synchronization
         */
        startClockSync: function(socket) {
            if (!socket || !socket.connected) {
                console.warn('[QuizCore] Cannot start clock sync - socket not connected');
                return;
            }
            
            console.log('[QuizCore] Starting clock synchronization...');
            this.state.syncAttempts = 0;
            this.syncClock(socket);
        },
        
        /**
         * Sync clock with server
         */
        syncClock: function(socket) {
            if (this.state.syncAttempts >= this.state.maxSyncAttempts) {
                console.log('[QuizCore] Clock sync complete after', this.state.syncAttempts, 'attempts');
                console.log('[QuizCore] Final clock offset:', this.state.clockOffset, 'ms');
                return;
            }
            
            const clientTime = Date.now();
            this.state.syncAttempts++;
            
            console.log('[QuizCore] Clock sync attempt', this.state.syncAttempts, '- client_time:', clientTime);
            socket.emit('clock_sync_request', { client_time: clientTime });
        },
        
        /**
         * Handle clock sync response
         */
        handleClockSyncResponse: function(data, socket) {
            const clientTimeNow = Date.now();
            const clientTimeSent = data.client_time;
            const serverTime = data.server_time;
            
            const rtt = clientTimeNow - clientTimeSent;
            const oneWayLatency = rtt / 2;
            const estimatedServerTimeNow = serverTime + oneWayLatency;
            const offset = estimatedServerTimeNow - clientTimeNow;
            
            console.log('[QuizCore] Clock sync response:');
            console.log('  RTT:', rtt, 'ms');
            console.log('  Calculated offset:', offset, 'ms');
            
            if (this.state.syncAttempts === 1) {
                this.state.clockOffset = offset;
            } else {
                this.state.clockOffset = (this.state.clockOffset * 0.7) + (offset * 0.3);
            }
            
            console.log('[QuizCore] Clock offset updated to:', this.state.clockOffset, 'ms');
            
            // Continue syncing
            const self = this;
            setTimeout(function() {
                self.syncClock(socket);
            }, 200);
        },
        
        /**
         * Start ping measurement
         */
        startPingMeasurement: function(socket, displayElement) {
            if (!socket || !socket.connected) {
                return;
            }
            
            if (this.state.pingInterval) {
                clearInterval(this.state.pingInterval);
            }
            
            const self = this;
            this.state.pingInterval = setInterval(function() {
                if (socket && socket.connected) {
                    self.state.lastPing = Date.now();
                    socket.emit('ping_measure', { timestamp: self.state.lastPing });
                }
            }, 2000);
            
            if (displayElement) {
                displayElement.style.display = 'flex';
            }
        },
        
        /**
         * Stop ping measurement
         */
        stopPingMeasurement: function(displayElement) {
            if (this.state.pingInterval) {
                clearInterval(this.state.pingInterval);
                this.state.pingInterval = null;
            }
            
            if (displayElement) {
                displayElement.style.display = 'none';
            }
        },
        
        /**
         * Update ping display
         */
        updatePingDisplay: function(data, displayElement) {
            if (this.state.lastPing && data.timestamp === this.state.lastPing) {
                const ping = Date.now() - this.state.lastPing;
                this.state.currentPing = ping;
                
                if (displayElement) {
                    const valueElement = displayElement.querySelector('.ping-value');
                    if (valueElement) {
                        valueElement.textContent = ping;
                    }
                }
            }
        },
        
        /**
         * Start timer for question
         */
        startTimer: function(seconds, timerElements, onUpdate, onComplete) {
            clearInterval(this.state.timerInterval);
            
            const maxPoints = 1000;
            const minPoints = 0;
            const freezePeriod = 1;
            
            const startTimestamp = this.state.serverStartTime;
            const self = this;
            
            console.log('[QuizCore] Starting Timer');
            console.log('[QuizCore] Time limit:', seconds, 'seconds');
            console.log('[QuizCore] Server start time:', startTimestamp);
            console.log('[QuizCore] Current server time:', this.getServerTime() / 1000);
            
            const updateTimer = function() {
                const nowSeconds = self.getServerTime() / 1000;
                const elapsed = Math.max(0, nowSeconds - startTimestamp);
                const remaining = Math.max(0, seconds - elapsed);
                
                if (remaining <= 0) {
                    clearInterval(self.state.timerInterval);
                    
                    if (timerElements.fill) {
                        timerElements.fill.style.width = '0%';
                    }
                    if (timerElements.text) {
                        timerElements.text.textContent = minPoints + ' pts';
                    }
                    
                    if (onComplete) {
                        onComplete();
                    }
                    return;
                }
                
                const percentage = (remaining / seconds) * 100;
                if (timerElements.fill) {
                    timerElements.fill.style.width = percentage + '%';
                }
                
                // Calculate points
                let currentPoints;
                if (elapsed < freezePeriod) {
                    currentPoints = maxPoints;
                } else {
                    const decreaseTime = seconds - freezePeriod;
                    const elapsedAfterFreeze = elapsed - freezePeriod;
                    const pointsPerSecond = maxPoints / decreaseTime;
                    currentPoints = Math.max(minPoints, Math.min(maxPoints, Math.floor(maxPoints - (elapsedAfterFreeze * pointsPerSecond))));
                }
                
                if (timerElements.text) {
                    timerElements.text.textContent = currentPoints + ' pts';
                }
                
                // Update colors
                const pointsPercentage = (currentPoints / maxPoints) * 100;
                let color;
                if (pointsPercentage < 40) {
                    color = '#e74c3c';
                } else if (pointsPercentage < 70) {
                    color = '#f39c12';
                } else {
                    color = '#2ecc71';
                }
                
                if (timerElements.fill) {
                    timerElements.fill.style.backgroundColor = color;
                }
                if (timerElements.text) {
                    timerElements.text.style.color = color;
                }
                
                if (onUpdate) {
                    onUpdate(currentPoints, remaining, elapsed);
                }
            };
            
            updateTimer();
            this.state.timerInterval = setInterval(updateTimer, 100);
        },
        
        /**
         * Accelerate timer to zero (when all players answered)
         */
        accelerateTimerToZero: function(timerElements) {
            if (this.state.timerAccelerated) {
                console.log('[QuizCore] Timer already accelerated');
                return;
            }
            
            this.state.timerAccelerated = true;
            
            if (this.state.timerInterval) {
                clearInterval(this.state.timerInterval);
                this.state.timerInterval = null;
            }
            
            if (!timerElements.fill || !timerElements.text) {
                return;
            }
            
            const currentWidth = parseFloat(timerElements.fill.style.width) || 0;
            const currentPointsText = timerElements.text.textContent;
            const currentPoints = parseInt(currentPointsText.replace(' pts', '')) || 0;
            
            console.log('[QuizCore] Accelerating timer from:', currentPoints, 'pts,', currentWidth, '%');
            
            const animationDuration = 1000;
            const startTime = Date.now();
            
            const animate = function() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / animationDuration, 1);
                
                const newWidth = currentWidth * (1 - progress);
                const newPoints = Math.floor(currentPoints * (1 - progress));
                
                timerElements.fill.style.width = newWidth + '%';
                timerElements.text.textContent = newPoints + ' pts';
                
                const pointsPercentage = (newPoints / 1000) * 100;
                let color;
                if (pointsPercentage < 40) {
                    color = '#e74c3c';
                } else if (pointsPercentage < 70) {
                    color = '#f39c12';
                } else {
                    color = '#2ecc71';
                }
                timerElements.fill.style.backgroundColor = color;
                timerElements.text.style.color = color;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    timerElements.fill.style.width = '0%';
                    timerElements.text.textContent = '0 pts';
                    console.log('[QuizCore] Timer acceleration complete');
                }
            };
            
            requestAnimationFrame(animate);
        },
        
        /**
         * Utility: Escape HTML
         */
        escapeHtml: function(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
        },
        
        /**
         * Utility: Parse display name into name and username
         */
        parseDisplayName: function(displayName) {
            let nameText = displayName;
            let usernameText = '';
            const parenIndex = displayName.indexOf(' (@');
            if (parenIndex > 0) {
                nameText = displayName.substring(0, parenIndex);
                usernameText = displayName.substring(parenIndex + 3, displayName.length - 1);
            }
            return { nameText: nameText, usernameText: usernameText };
        },
        
        /**
         * Reset state for new question
         */
        resetForNewQuestion: function() {
            this.state.answeredPlayers = [];
            this.state.timerAccelerated = false;
            this.state.currentQuestion = null;
        },
        
        /**
         * Clean up resources
         */
        cleanup: function() {
            if (this.state.timerInterval) {
                clearInterval(this.state.timerInterval);
            }
            if (this.state.pingInterval) {
                clearInterval(this.state.pingInterval);
            }
            if (this.state.socket) {
                this.state.socket.disconnect();
            }
        }
    };
    
    // Export to window
    window.QuizCore = QuizCore;
    
})(window);

