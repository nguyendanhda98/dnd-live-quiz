/**
 * Live Quiz UI - Shared UI functions for both Host and Player
 * 
 * This module provides UI functionality used by both host and player interfaces:
 * - Question display
 * - Leaderboard animations
 * - Top 3 podium display
 * - Answer statistics
 * - Player lists
 * 
 * @package LiveQuiz
 * @version 2.0.0
 */

(function(window) {
    'use strict';
    
    const QuizUI = {
        /**
         * Display question (common for both host and player)
         * @param {Object} data - Question data
         * @param {Object} elements - DOM elements {questionNumber, questionText, choicesContainer}
         * @param {boolean} isHost - Whether this is host view
         * @param {Function} onAnswerSelect - Callback when answer is selected (player only)
         */
        displayQuestion: function(data, elements, isHost, onAnswerSelect) {
            const questionNumber = data.question_index + 1;
            const totalQuestions = data.total_questions || 0;
            
            // Update question number with total questions
            if (elements.questionNumber) {
                if (totalQuestions > 0) {
                    elements.questionNumber.textContent = 'Câu ' + questionNumber + ' / ' + totalQuestions;
                } else {
                    elements.questionNumber.textContent = 'Câu ' + questionNumber;
                }
            }
            
            // Display question text immediately
            if (elements.questionText) {
                elements.questionText.textContent = data.question.text;
            }
            
            // Clear and hide choices container
            if (elements.choicesContainer) {
                elements.choicesContainer.innerHTML = '';
                elements.choicesContainer.style.display = 'none';
            }
            
            console.log('[QuizUI] Question displayed, waiting 3 seconds before showing choices...');
            
            // Wait 3 seconds before showing choices
            const DISPLAY_DELAY = 3000;
            const self = this;
            
            setTimeout(function() {
                console.log('[QuizUI] Displaying choices...');
                self.displayChoices(data.question.choices, elements.choicesContainer, isHost, onAnswerSelect);
                
                if (elements.choicesContainer) {
                    elements.choicesContainer.style.display = '';
                }
            }, DISPLAY_DELAY);
        },
        
        /**
         * Display choices
         * @param {Array} choices - Array of choice objects
         * @param {HTMLElement} container - Container element
         * @param {boolean} isHost - Whether this is host view
         * @param {Function} onAnswerSelect - Callback when answer is selected
         */
        displayChoices: function(choices, container, isHost, onAnswerSelect) {
            if (!container) return;
            
            container.innerHTML = '';
            
            choices.forEach(function(choice, index) {
                const button = document.createElement('button');
                // Use same class for both host and player (shared CSS)
                button.className = 'choice-button';
                button.dataset.choiceId = index;
                button.textContent = choice.text;
                
                // Only player can click choices
                if (!isHost && onAnswerSelect) {
                    button.addEventListener('click', function() {
                        onAnswerSelect(index);
                    });
                } else {
                    // Host cannot select - disable button
                    button.disabled = true;
                    button.style.cursor = 'default'; // Override cursor for disabled host buttons
                }
                
                container.appendChild(button);
            });
        },
        
        /**
         * Show correct answer and mark selected
         * @param {number} correctAnswer - Index of correct answer
         * @param {HTMLElement} container - Choices container
         */
        showCorrectAnswer: function(correctAnswer, container) {
            if (!container) return;
            
            const buttons = container.querySelectorAll('button');
            buttons.forEach(function(button, index) {
                const isCorrect = (correctAnswer !== undefined && index === correctAnswer);
                const isSelected = button.classList.contains('selected');
                
                if (isCorrect) {
                    button.classList.add('correct-answer');
                    button.style.borderColor = '#2ecc71';
                    button.style.borderWidth = '5px';
                    button.style.backgroundColor = '#2ecc71';
                    button.style.color = 'white';
                    button.style.fontWeight = 'bold';
                    
                    const originalText = button.textContent;
                    button.innerHTML = '✓ ' + originalText;
                } else if (isSelected) {
                    button.classList.add('incorrect');
                    button.style.borderColor = '#e74c3c';
                    button.style.borderWidth = '5px';
                    button.style.backgroundColor = '#e74c3c';
                    button.style.color = 'white';
                    button.style.fontWeight = 'bold';
                    
                    const originalText = button.textContent;
                    button.innerHTML = '✗ ' + originalText;
                }
            });
        },
        
        /**
         * Display Top 3 podium and Top 10 list
         * @param {Array} leaderboard - Full leaderboard data
         * @param {Object} elements - {podium, list}
         * @param {number} currentUserId - Current user ID (for highlighting)
         */
        displayTop10WithPodium: function(leaderboard, elements, currentUserId) {
            const top10 = leaderboard.slice(0, 10);
            const top3 = leaderboard.slice(0, 3);
            
            // Display podium for top 3
            if (elements.podium && top3.length > 0) {
                elements.podium.innerHTML = '';
                
                const medals = ['🥇', '🥈', '🥉'];
                const places = ['first', 'second', 'third'];
                
                top3.forEach(function(player, index) {
                    const placeDiv = document.createElement('div');
                    placeDiv.className = 'podium-place ' + places[index];
                    
                    if (player.user_id === currentUserId) {
                        placeDiv.classList.add('current-user');
                    }
                    
                    const displayName = player.display_name || player.name || 'Player';
                    const parsed = QuizCore.parseDisplayName(displayName);
                    
                    placeDiv.innerHTML = `
                        <div class="podium-medal">${medals[index]}</div>
                        <div class="podium-name">
                            <div>${QuizCore.escapeHtml(parsed.nameText)}</div>
                            ${parsed.usernameText ? `<div style="font-size: 0.8em; color: #888;">${QuizCore.escapeHtml(parsed.usernameText)}</div>` : ''}
                        </div>
                        <div class="podium-score">${Math.round(player.total_score || player.score || 0)} pts</div>
                        <div class="podium-stand">#${index + 1}</div>
                    `;
                    
                    elements.podium.appendChild(placeDiv);
                });
            }
            
            // Display ranks 4-10 below podium
            if (elements.list) {
                elements.list.innerHTML = '';
                
                if (top10.length > 3) {
                    const remaining = top10.slice(3);
                    remaining.forEach(function(player, index) {
                        const actualRank = index + 4;
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'top10-item';
                        
                        if (player.user_id === currentUserId) {
                            itemDiv.classList.add('current-user');
                        }
                        
                        const displayName = player.display_name || player.name || 'Player';
                        const parsed = QuizCore.parseDisplayName(displayName);
                        
                        itemDiv.innerHTML = `
                            <div class="top10-rank">#${actualRank}</div>
                            <div class="top10-name">
                                <div>${QuizCore.escapeHtml(parsed.nameText)}</div>
                                ${parsed.usernameText ? `<div style="font-size: 0.85em; color: #888;">${QuizCore.escapeHtml(parsed.usernameText)}</div>` : ''}
                            </div>
                            <div class="top10-score">${Math.round(player.total_score || player.score || 0)}</div>
                        `;
                        
                        elements.list.appendChild(itemDiv);
                    });
                }
            }
        },
        
        /**
         * Show leaderboard animation (after question ends)
         * @param {Object} data - Question end data with leaderboard
         * @param {HTMLElement} overlay - Overlay element
         * @param {HTMLElement} container - Leaderboard container
         * @param {number} currentUserId - Current user ID
         */
        showLeaderboardAnimation: function(data, overlay, container, currentUserId) {
            console.log('[QuizUI] Starting leaderboard animation');
            
            const leaderboard = data.leaderboard || [];
            if (leaderboard.length === 0) {
                console.error('[QuizUI] Leaderboard is empty!');
                if (overlay) overlay.style.display = 'none';
                return;
            }
            
            // Prepare leaderboard with old/new scores
            const oldLeaderboard = leaderboard.map(function(entry) {
                if (entry.old_score !== undefined && entry.score_gain !== undefined) {
                    return {
                        ...entry,
                        old_score: entry.old_score,
                        new_score: entry.new_score || entry.total_score,
                        score_gain: entry.score_gain
                    };
                }
                
                return {
                    ...entry,
                    old_score: entry.total_score - (entry.score_gain || 0),
                    new_score: entry.total_score,
                    score_gain: entry.score_gain || 0
                };
            });
            
            console.log('[QuizUI] Leaderboard prepared:', oldLeaderboard);
            
            // Show overlay
            if (overlay) {
                overlay.classList.remove('leaderboard-overlay-hidden');
                overlay.style.opacity = '0';
                setTimeout(function() {
                    overlay.style.opacity = '1';
                }, 10);
            }
            
            const self = this;
            
            // Step 1: Show OLD scores (1 second)
            console.log('[QuizUI] STEP 1: Rendering OLD scores...');
            this.renderLeaderboard(oldLeaderboard, false, container, currentUserId);
            
            setTimeout(function() {
                // Step 2: Show score gains (1 second)
                console.log('[QuizUI] STEP 2: Showing score gains...');
                self.showScoreGains(oldLeaderboard, container);
                
                setTimeout(function() {
                    // Step 3: Animate score addition (1 second)
                    console.log('[QuizUI] STEP 3: Animating score addition...');
                    self.animateScoreAddition(oldLeaderboard, container);
                    
                    // Step 4: Reorder leaderboard
                    setTimeout(function() {
                        console.log('[QuizUI] STEP 4: Reordering leaderboard...');
                        self.reorderLeaderboard(oldLeaderboard, container);
                        
                        // Step 5: Hide overlay
                        setTimeout(function() {
                            console.log('[QuizUI] STEP 5: Hiding overlay...');
                            if (overlay) {
                                overlay.style.opacity = '0';
                                setTimeout(function() {
                                    overlay.classList.add('leaderboard-overlay-hidden');
                                    console.log('[QuizUI] Leaderboard animation complete');
                                }, 300);
                            }
                        }, 3000);
                    }, 1500);
                }, 1000);
            }, 1000);
        },
        
        /**
         * Render leaderboard
         */
        renderLeaderboard: function(leaderboard, showNewScores, container, currentUserId) {
            if (!container) return;
            
            container.innerHTML = '';
            
            if (!leaderboard || leaderboard.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #999;">Chưa có dữ liệu xếp hạng</p>';
                return;
            }
            
            const displayData = showNewScores ? 
                [...leaderboard].sort(function(a, b) { return b.new_score - a.new_score; }) :
                [...leaderboard].sort(function(a, b) { return b.old_score - a.old_score; });
            
            displayData.slice(0, 10).forEach(function(entry, index) {
                const score = showNewScores ? entry.new_score : entry.old_score;
                const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                const isCurrentUser = entry.user_id === currentUserId;
                const userClass = isCurrentUser ? 'current-user' : '';
                
                const displayName = entry.display_name || 'Player';
                const parsed = QuizCore.parseDisplayName(displayName);
                
                const html = `
                    <div class="leaderboard-item ${rankClass} ${userClass}" data-user-id="${entry.user_id}">
                        <div class="rank">#${index + 1}</div>
                        <div class="player-name">
                            <span class="name-text">${QuizCore.escapeHtml(parsed.nameText)}</span>
                            ${parsed.usernameText ? `<span class="username-text">${QuizCore.escapeHtml(parsed.usernameText)}</span>` : ''}
                        </div>
                        <div class="score-container">
                            <span class="current-score">${score}</span>
                            <span class="score-gain" style="display: none;">+${entry.score_gain}</span>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });
        },
        
        /**
         * Show score gains
         */
        showScoreGains: function(leaderboard, container) {
            leaderboard.forEach(function(entry) {
                if (entry.score_gain > 0) {
                    const item = container.querySelector('.leaderboard-item[data-user-id="' + entry.user_id + '"]');
                    if (item) {
                        const scoreGain = item.querySelector('.score-gain');
                        if (scoreGain) {
                            scoreGain.style.display = 'inline';
                            scoreGain.style.opacity = '0';
                            setTimeout(function() {
                                scoreGain.style.transition = 'opacity 0.3s';
                                scoreGain.style.opacity = '1';
                            }, 10);
                        }
                    }
                }
            });
        },
        
        /**
         * Animate score addition
         */
        animateScoreAddition: function(leaderboard, container) {
            leaderboard.forEach(function(entry) {
                if (entry.score_gain > 0) {
                    const item = container.querySelector('.leaderboard-item[data-user-id="' + entry.user_id + '"]');
                    if (!item) return;
                    
                    const scoreGain = item.querySelector('.score-gain');
                    const currentScore = item.querySelector('.current-score');
                    
                    // Fade out +score
                    if (scoreGain) {
                        scoreGain.style.transition = 'opacity 0.5s';
                        scoreGain.style.opacity = '0';
                    }
                    
                    // Animate score increase
                    if (currentScore) {
                        const start = entry.old_score;
                        const end = entry.new_score;
                        const duration = 1000;
                        const startTime = Date.now();
                        
                        const animate = function() {
                            const elapsed = Date.now() - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const current = Math.round(start + (end - start) * progress);
                            currentScore.textContent = current;
                            
                            if (progress < 1) {
                                requestAnimationFrame(animate);
                            }
                        };
                        
                        animate();
                    }
                }
            });
        },
        
        /**
         * Reorder leaderboard after score update
         */
        reorderLeaderboard: function(leaderboard, container) {
            if (!container) return;
            
            const sorted = [...leaderboard].sort(function(a, b) { return b.new_score - a.new_score; });
            
            const positions = [];
            sorted.slice(0, 10).forEach(function(entry, newIndex) {
                const item = container.querySelector('.leaderboard-item[data-user-id="' + entry.user_id + '"]');
                if (!item) return;
                
                const currentIndex = Array.from(container.children).indexOf(item);
                positions.push({ item: item, currentIndex: currentIndex, newIndex: newIndex, entry: entry });
            });
            
            positions.forEach(function(pos) {
                if (pos.currentIndex !== pos.newIndex) {
                    const currentTop = pos.item.offsetTop;
                    
                    if (pos.newIndex === 0) {
                        container.insertBefore(pos.item, container.firstChild);
                    } else {
                        const refNode = container.children[pos.newIndex];
                        if (refNode && refNode !== pos.item) {
                            container.insertBefore(pos.item, refNode);
                        }
                    }
                    
                    const newTop = pos.item.offsetTop;
                    const distance = currentTop - newTop;
                    
                    pos.item.style.transform = 'translateY(' + distance + 'px)';
                    pos.item.style.transition = 'none';
                    pos.item.offsetHeight;
                    
                    pos.item.style.transition = 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)';
                    pos.item.style.transform = 'translateY(0)';
                }
                
                const rankEl = pos.item.querySelector('.rank');
                if (rankEl) {
                    rankEl.textContent = '#' + (pos.newIndex + 1);
                }
                
                pos.item.classList.remove('rank-1', 'rank-2', 'rank-3');
                if (pos.newIndex === 0) pos.item.classList.add('rank-1');
                else if (pos.newIndex === 1) pos.item.classList.add('rank-2');
                else if (pos.newIndex === 2) pos.item.classList.add('rank-3');
            });
        },
        
        /**
         * Display answered player in list
         */
        displayAnsweredPlayer: function(player, score, listElement) {
            if (!listElement) return;
            
            const displayName = player.display_name || 'Player';
            const initial = displayName.charAt(0).toUpperCase();
            const parsed = QuizCore.parseDisplayName(displayName);
            
            const playerItem = document.createElement('div');
            playerItem.className = 'answered-player-item';
            playerItem.setAttribute('data-player-id', player.user_id);
            playerItem.setAttribute('data-score', score);
            
            playerItem.innerHTML = `
                <div class="answered-player-avatar">${QuizCore.escapeHtml(initial)}</div>
                <div class="answered-player-name">
                    <span class="name-text">${QuizCore.escapeHtml(parsed.nameText)}</span>
                    ${parsed.usernameText ? `<span class="username-text">${QuizCore.escapeHtml(parsed.usernameText)}</span>` : ''}
                </div>
            `;
            
            listElement.appendChild(playerItem);
            
            // Animate in
            playerItem.style.opacity = '0';
            setTimeout(function() {
                playerItem.style.transition = 'opacity 0.3s';
                playerItem.style.opacity = '1';
            }, 10);
        },
        
        /**
         * Update answer count display
         */
        updateAnswerCount: function(answeredCount, totalPlayers, displayElement, textElement) {
            if (displayElement && textElement) {
                textElement.textContent = answeredCount + '/' + totalPlayers + ' đã trả lời';
                displayElement.style.display = 'block';
            }
        },
        
        /**
         * Update players list in waiting room
         * @param {Array} players - Array of player objects
         * @param {HTMLElement} container - Container element
         * @param {string} currentUserName - Current user's display name (for highlighting)
         * @param {boolean} isHost - Whether this is host view (enables click interaction)
         */
        updatePlayersList: function(players, container, currentUserName, isHost) {
            if (!container) return;
            
            if (players.length === 0) {
                container.innerHTML = '<p class="no-players">Chưa có người chơi nào tham gia</p>';
                return;
            }
            
            let html = '';
            players.forEach(function(player) {
                const displayName = player.display_name || 'Unknown';
                const initial = displayName.charAt(0).toUpperCase();
                const isCurrentUser = player.display_name === currentUserName;
                
                const parsed = QuizCore.parseDisplayName(displayName);
                
                // Add data attributes for host to use
                const dataAttrs = isHost ? `data-player-id="${player.user_id}" data-player-name="${QuizCore.escapeHtml(displayName)}"` : '';
                const clickableClass = isHost ? ' clickable' : '';
                
                html += `
                    <div class="player-waiting-item${isCurrentUser ? ' current-user' : ''}${clickableClass}" ${dataAttrs}>
                        <div class="player-waiting-avatar">${QuizCore.escapeHtml(initial)}</div>
                        <div class="player-waiting-name">
                            <span class="name-text">${QuizCore.escapeHtml(parsed.nameText)}</span>
                            ${parsed.usernameText ? `<span class="username-text">${QuizCore.escapeHtml(parsed.usernameText)}</span>` : ''}
                        </div>
                        ${isHost ? '<div class="player-waiting-indicator">⋮</div>' : ''}
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
    };
    
    /**
     * QuizPlayers - Shared players management for both Host and Player
     * Handles player join/leave events and list updates
     */
    const QuizPlayers = {
        /**
         * Handle player joined event
         * @param {Object} data - Player data from WebSocket
         * @param {HTMLElement} container - Container element for players list
         * @param {string} currentUserName - Current user's display name
         * @param {boolean} isHost - Whether this is host view
         */
        handlePlayerJoined: function(data, container, currentUserName, isHost) {
            console.log('[QuizPlayers] Player joined:', data);
            const playerId = data.user_id;
            
            if (playerId) {
                QuizCore.state.players[playerId] = data;
                this.updatePlayersList(Object.values(QuizCore.state.players), container, currentUserName, isHost);
            }
        },
        
        /**
         * Handle player left event
         * @param {Object} data - Player data from WebSocket
         * @param {HTMLElement} container - Container element for players list
         * @param {string} currentUserName - Current user's display name
         * @param {boolean} isHost - Whether this is host view
         */
        handlePlayerLeft: function(data, container, currentUserName, isHost) {
            console.log('[QuizPlayers] Player left:', data);
            const playerId = data.user_id;
            
            if (playerId) {
                delete QuizCore.state.players[playerId];
                this.updatePlayersList(Object.values(QuizCore.state.players), container, currentUserName, isHost);
            }
        },
        
        /**
         * Fetch players list from API
         * @param {string} apiUrl - API base URL
         * @param {string} sessionId - Session ID
         * @param {string} endpoint - Endpoint path ('/players' for host, '/players-list' for player)
         * @param {string} nonce - WordPress nonce (optional, for host)
         * @param {HTMLElement} container - Container element for players list
         * @param {string} currentUserName - Current user's display name
         * @param {boolean} isHost - Whether this is host view
         * @param {Function} onUpdateCount - Callback to update participant count (optional)
         */
        fetchPlayersList: async function(apiUrl, sessionId, endpoint, nonce, container, currentUserName, isHost, onUpdateCount) {
            if (!sessionId) {
                return;
            }
            
            try {
                const url = apiUrl + '/sessions/' + sessionId + endpoint;
                const options = {
                    method: 'GET'
                };
                
                // Add nonce header for host
                if (nonce) {
                    options.headers = {
                        'X-WP-Nonce': nonce
                    };
                }
                
                const response = await fetch(url, options);
                const data = await response.json();
                
                if (data.success && data.players) {
                    // Replace players (same as host)
                    QuizCore.state.players = {};
                    data.players.forEach(function(player) {
                        if (player.user_id) {
                            QuizCore.state.players[player.user_id] = player;
                        }
                    });
                    
                    // Update count if callback provided
                    if (onUpdateCount) {
                        onUpdateCount(Object.keys(QuizCore.state.players).length);
                    }
                    
                    // Update UI
                    this.updatePlayersList(Object.values(QuizCore.state.players), container, currentUserName, isHost);
                }
            } catch (error) {
                console.error('[QuizPlayers] Failed to fetch players list:', error);
            }
        },
        
        /**
         * Update players list UI
         * @param {Array} players - Array of player objects
         * @param {HTMLElement} container - Container element
         * @param {string} currentUserName - Current user's display name
         * @param {boolean} isHost - Whether this is host view
         */
        updatePlayersList: function(players, container, currentUserName, isHost) {
            // Use QuizUI.updatePlayersList for rendering
            QuizUI.updatePlayersList(players, container, currentUserName, isHost);
        }
    };
    
    /**
     * Show countdown screen (shared for both host and player)
     * @param {HTMLElement|jQuery} countdownElement - Element to display countdown number
     * @param {string} screenId - Screen ID to show ('host-countdown' or 'quiz-countdown')
     * @param {Function} showScreenFunc - Function to show screen
     * @param {number} startCount - Starting count (default: 3)
     * @param {Function} onComplete - Callback when countdown completes
     */
    QuizUI.showCountdown = function(countdownElement, screenId, showScreenFunc, startCount, onComplete) {
        const count = startCount || 3;
        
        // Show countdown screen
        if (showScreenFunc) {
            showScreenFunc(screenId);
        }
        
        // Update countdown number
        if (countdownElement) {
            if (typeof countdownElement.text === 'function') {
                // jQuery element
                countdownElement.text(count);
            } else {
                // DOM element
                countdownElement.textContent = count;
            }
        }
        
        let currentCount = count;
        const countdownInterval = setInterval(function() {
            currentCount--;
            if (currentCount > 0) {
                // Update countdown number
                if (countdownElement) {
                    if (typeof countdownElement.text === 'function') {
                        countdownElement.text(currentCount);
                    } else {
                        countdownElement.textContent = currentCount;
                    }
                }
            } else {
                clearInterval(countdownInterval);
                if (onComplete) {
                    onComplete();
                }
            }
        }, 1000);
        
        return countdownInterval; // Return interval ID in case need to clear
    };
    
    // Export to window
    window.QuizUI = QuizUI;
    window.QuizPlayers = QuizPlayers;
    
})(window);

