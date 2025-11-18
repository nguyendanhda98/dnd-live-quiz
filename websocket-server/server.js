/**
 * DND Live Quiz - WebSocket Server
 * 
 * Node.js WebSocket server with Socket.io for real-time quiz functionality
 * Supports 2000+ concurrent users with Redis backend
 * 
 * @version 2.0.0
 */

// Load .env file automatically
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('redis');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Configuration from environment variables
const config = {
    port: process.env.PORT || 3033,
    redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || '',
        database: parseInt(process.env.REDIS_DATABASE) || 0,
    },
    wordpress: {
        url: process.env.WORDPRESS_URL || 'http://wordpress',
        secret: process.env.WORDPRESS_SECRET || 'change-this-secret',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'change-this-jwt-secret',
        expiresIn: '24h',
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    },
    logLevel: process.env.LOG_LEVEL || 'info',
};

// Logger setup
const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Express app setup
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Redis clients
let redisClient;
let redisPub;
let redisSub;

// Initialize Redis connections
async function initRedis() {
    try {
        // Main Redis client
        redisClient = Redis.createClient({
            socket: {
                host: config.redis.host,
                port: config.redis.port,
            },
            password: config.redis.password || undefined,
            database: config.redis.database,
        });

        // Pub/Sub clients (separate connections required)
        redisPub = redisClient.duplicate();
        redisSub = redisClient.duplicate();

        await redisClient.connect();
        await redisPub.connect();
        await redisSub.connect();

        logger.info('Redis connected successfully', {
            host: config.redis.host,
            port: config.redis.port,
            database: config.redis.database,
        });

        // Redis error handlers
        redisClient.on('error', (err) => logger.error('Redis Client Error', err));
        redisPub.on('error', (err) => logger.error('Redis Pub Error', err));
        redisSub.on('error', (err) => logger.error('Redis Sub Error', err));

    } catch (error) {
        logger.error('Failed to connect to Redis', error);
        process.exit(1);
    }
}

// Socket.io setup
const io = new Server(server, {
    cors: config.cors,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Statistics
const stats = {
    connections: 0,
    totalConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    startTime: Date.now(),
};

// Store active connections: { connectionId: socket }
const activeConnections = new Map();

// JWT Authentication middleware for Socket.io
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            logger.warn('Connection attempt without token', {
                socketId: socket.id,
                address: socket.handshake.address,
            });
            return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // Attach user data to socket
        socket.userId = decoded.user_id;
        socket.sessionId = decoded.session_id;
        socket.displayName = decoded.display_name;

        logger.debug('User authenticated', {
            userId: socket.userId,
            sessionId: socket.sessionId,
            displayName: socket.displayName,
        });

        next();
    } catch (error) {
        logger.error('Authentication failed', {
            error: error.message,
            socketId: socket.id,
        });
        next(new Error('Invalid authentication token'));
    }
});

// Redis Helper Functions
const RedisHelper = {
    // Get session data
    async getSession(sessionId) {
        try {
            const data = await redisClient.hGetAll(`session:${sessionId}`);
            if (Object.keys(data).length === 0) return null;
            
            // Parse JSON fields
            if (data.questions) data.questions = JSON.parse(data.questions);
            if (data.current_question_index) data.current_question_index = parseInt(data.current_question_index);
            
            return data;
        } catch (error) {
            logger.error('Error getting session', { sessionId, error });
            return null;
        }
    },

    // Set session data
    async setSession(sessionId, data) {
        try {
            const flatData = { ...data };
            if (flatData.questions) flatData.questions = JSON.stringify(flatData.questions);
            
            await redisClient.hSet(`session:${sessionId}`, flatData);
            await redisClient.expire(`session:${sessionId}`, 7200); // 2 hours
            return true;
        } catch (error) {
            logger.error('Error setting session', { sessionId, error });
            return false;
        }
    },

    // Add participant to session
    async addParticipant(sessionId, userId, displayName) {
        try {
            const key = `session:${sessionId}:participants`;
            await redisClient.hSet(key, userId, JSON.stringify({
                user_id: userId,
                display_name: displayName,
                joined_at: Date.now(),
            }));
            await redisClient.expire(key, 7200);
            return true;
        } catch (error) {
            logger.error('Error adding participant', { sessionId, userId, error });
            return false;
        }
    },

    // Get leaderboard (Redis Sorted Set - O(log N))
    async getLeaderboard(sessionId, limit = 100) {
        try {
            const key = `session:${sessionId}:leaderboard`;
            const results = await redisClient.zRevRangeWithScores(key, 0, limit - 1);
            
            const leaderboard = [];
            for (let i = 0; i < results.length; i++) {
                const item = results[i];
                const participantData = await redisClient.hGet(
                    `session:${sessionId}:participants`,
                    item.value
                );
                
                let displayName = item.value;
                if (participantData) {
                    const parsed = JSON.parse(participantData);
                    displayName = parsed.display_name;
                }
                
                leaderboard.push({
                    user_id: item.value,
                    display_name: displayName,
                    total_score: Math.round(item.score),
                    rank: i + 1,
                });
            }
            
            return leaderboard;
        } catch (error) {
            logger.error('Error getting leaderboard', { sessionId, error });
            return [];
        }
    },

    // Update score (Redis Sorted Set - O(log N))
    async updateScore(sessionId, userId, scoreToAdd) {
        try {
            const key = `session:${sessionId}:leaderboard`;
            await redisClient.zIncrBy(key, scoreToAdd, userId);
            await redisClient.expire(key, 7200);
            return true;
        } catch (error) {
            logger.error('Error updating score', { sessionId, userId, error });
            return false;
        }
    },

    // Save answer
    async saveAnswer(sessionId, userId, questionIndex, answerData) {
        try {
            const key = `session:${sessionId}:answer:${userId}:${questionIndex}`;
            await redisClient.set(key, JSON.stringify(answerData));
            await redisClient.expire(key, 7200);
            return true;
        } catch (error) {
            logger.error('Error saving answer', { sessionId, userId, questionIndex, error });
            return false;
        }
    },

    // Store active connection for multi-device enforcement
    async setActiveConnection(userId, sessionId, socketId, connectionId, role = 'player') {
        try {
            const key = `active_connection:user:${userId}:session:${sessionId}:role:${role}`;
            const data = {
                socket_id: socketId,
                connection_id: connectionId,
                joined_at: Date.now()
            };
            await redisClient.set(key, JSON.stringify(data));
            await redisClient.expire(key, 7200); // 2 hours
            return true;
        } catch (error) {
            logger.error('Error setting active connection', { userId, sessionId, error });
            return false;
        }
    },

    // Get active connection for user in session
    async getActiveConnection(userId, sessionId, role = 'player') {
        try {
            const key = `active_connection:user:${userId}:session:${sessionId}:role:${role}`;
            const data = await redisClient.get(key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (error) {
            logger.error('Error getting active connection', { userId, sessionId, error });
            return null;
        }
    },

    // Remove active connection
    async removeActiveConnection(userId, sessionId, role = 'player') {
        try {
            const key = `active_connection:user:${userId}:session:${sessionId}:role:${role}`;
            await redisClient.del(key);
            return true;
        } catch (error) {
            logger.error('Error removing active connection', { userId, sessionId, error });
            return false;
        }
    },
    
    // Add user to session ban list (Redis Set with TTL)
    async addSessionBan(sessionId, userId) {
        try {
            const key = `session:${sessionId}:banned`;
            await redisClient.sAdd(key, userId.toString());
            // Set TTL to 24 hours - auto delete after session ends
            await redisClient.expire(key, 86400);
            logger.info('Added user to session ban list', { sessionId, userId });
            return true;
        } catch (error) {
            logger.error('Error adding session ban', { sessionId, userId, error });
            return false;
        }
    },
    
    // Check if user is banned from session (Redis Set - O(1))
    async isSessionBanned(sessionId, userId) {
        try {
            const key = `session:${sessionId}:banned`;
            const isBanned = await redisClient.sIsMember(key, userId.toString());
            return isBanned;
        } catch (error) {
            logger.error('Error checking session ban', { sessionId, userId, error });
            return false;
        }
    },
    
    // Get all banned users for a session
    async getSessionBannedUsers(sessionId) {
        try {
            const key = `session:${sessionId}:banned`;
            const bannedUsers = await redisClient.sMembers(key);
            return bannedUsers.map(id => parseInt(id));
        } catch (error) {
            logger.error('Error getting session banned users', { sessionId, error });
            return [];
        }
    },
};

// Socket.io connection handler
io.on('connection', async (socket) => {
    stats.connections++;
    stats.totalConnections++;

    logger.info('Client connected', {
        socketId: socket.id,
        userId: socket.userId,
        sessionId: socket.sessionId,
        displayName: socket.displayName,
        totalConnections: stats.connections,
    });

    // Handle join_session event from client
    socket.on('join_session', async (data) => {
        const { session_id, user_id, display_name, connection_id, is_host } = data;
        
        logger.info('User joining session', {
            session_id,
            user_id,
            display_name,
            connection_id,
            is_host
        });
        
        // Determine role for Redis key separation
        const role = is_host ? 'host' : 'player';
        
        // SINGLE DEVICE ENFORCEMENT (Redis-based): Only allow ONE device/tab at a time per user
        // Step 1: Check Redis for existing active connection
        const existingConnection = await RedisHelper.getActiveConnection(user_id, session_id, role);
        
        if (existingConnection && existingConnection.socket_id !== socket.id) {
            logger.info('🔄 Multi-device detection (Redis) - Found existing connection', {
                user_id,
                display_name,
                old_socket_id: existingConnection.socket_id,
                old_connection_id: existingConnection.connection_id,
                new_socket_id: socket.id,
                new_connection_id: connection_id,
                action: 'force_disconnect_old_device'
            });
            
            // Step 2: Try to find the old socket in current server instance
            const oldSocket = io.sockets.sockets.get(existingConnection.socket_id);
            
            if (oldSocket) {
                logger.info('  ✗ Kicking old socket from this server instance', {
                    user_id,
                    old_socket_id: existingConnection.socket_id,
                    old_connection_id: existingConnection.connection_id
                });
                
                // Send force_disconnect event before disconnecting
                oldSocket.emit('force_disconnect', {
                    reason: 'new_device_connection',
                    message: 'Bạn đã mở phiên này từ thiết bị/tab khác. Phiên này sẽ bị đóng.',
                    new_connection_id: connection_id,
                    timestamp: Date.now()
                });
                
                // Disconnect the old socket
                oldSocket.disconnect(true);
                
                // Remove from active connections map
                if (oldSocket.connectionId) {
                    activeConnections.delete(oldSocket.connectionId);
                }
            } else {
                // Old socket not in this server (maybe different server instance or already disconnected)
                logger.info('  ℹ Old socket not found in this server (may be on different instance or disconnected)', {
                    old_socket_id: existingConnection.socket_id
                });
            }
        }
        
        // Step 3: Also check in-memory sockets (fallback for same server)
        const existingSockets = Array.from(io.sockets.sockets.values()).filter(s => 
            s.userId === user_id && s.sessionId === session_id && s.id !== socket.id
        );
        
        if (existingSockets.length > 0) {
            logger.info('  ⚠ Found additional sockets in memory (fallback check)', {
                count: existingSockets.length
            });
            
            existingSockets.forEach((oldSocket, index) => {
                logger.info(`  ✗ Kicking memory socket #${index + 1}`, {
                    old_socket_id: oldSocket.id
                });
                
                oldSocket.emit('force_disconnect', {
                    reason: 'new_device_connection',
                    message: 'Bạn đã mở phiên này từ thiết bị/tab khác. Phiên này sẽ bị đóng.',
                    new_connection_id: connection_id,
                    timestamp: Date.now()
                });
                
                oldSocket.disconnect(true);
                
                if (oldSocket.connectionId) {
                    activeConnections.delete(oldSocket.connectionId);
                }
            });
        }
        
        // Store connection ID mapping for single-session enforcement
        if (connection_id) {
            activeConnections.set(connection_id, socket);
            socket.connectionId = connection_id;
        }
        
        // Store session info on socket
        socket.sessionId = session_id;
        socket.userId = user_id;
        socket.displayName = display_name;
        socket.isHost = is_host || false; // Mark if this is a host connection
        
        // Join the session room
        socket.join(`session:${session_id}`);
        
        // Only add participant and broadcast if NOT a host connection
        // Host joining WebSocket is just for monitoring, not playing
        if (!is_host) {
            // Add participant to Redis
            await RedisHelper.addParticipant(session_id, user_id, display_name);
            
            // Notify ALL participants in room (including this user)
            io.to(`session:${session_id}`).emit('participant_joined', {
                user_id,
                display_name,
                session_id,
                total_participants: io.sockets.adapter.rooms.get(`session:${session_id}`)?.size || 0
            });
        }
        
        // IMPORTANT: Store active connection in Redis for multi-device enforcement
        await RedisHelper.setActiveConnection(user_id, session_id, socket.id, connection_id, role);
        
        logger.info('✓ Stored active connection in Redis', {
            user_id,
            role,
            session_id,
            socket_id: socket.id,
            connection_id,
            added_as_participant: !is_host
        });
        
        logger.info('User joined session successfully', {
            session_id,
            user_id,
            room_size: io.sockets.adapter.rooms.get(`session:${session_id}`)?.size || 0
        });
        
        // Send current session state to the newly joined user
        // This ensures they sync with ongoing question if quiz is in progress
        const session = await redisClient.hGetAll(`session:${session_id}`);
        if (session && session.status === 'question') {
            // Session is currently in a question - send question_start to sync
            const questionIndex = parseInt(session.current_question_index || 0);
            const startTime = parseFloat(session.question_start_time || 0);
            
            // Retrieve question data from session questions list
            const questionsJson = session.questions || '[]';
            const questions = JSON.parse(questionsJson);
            const currentQuestion = questions[questionIndex];
            
            if (currentQuestion && startTime) {
                logger.info('Sending current question state to newly joined user', {
                    user_id,
                    session_id,
                    questionIndex,
                    startTime
                });
                
                // Calculate total questions
                const totalQuestions = questions.length;
                
                // Send to this specific socket only
                socket.emit('question_start', {
                    question_index: questionIndex,
                    question: currentQuestion,
                    start_time: startTime,
                    total_questions: totalQuestions,
                });
            }
        }
    });
    
    // Handle leave_session event
    socket.on('leave_session', async () => {
        if (socket.sessionId) {
            logger.info('User leaving session', {
                session_id: socket.sessionId,
                user_id: socket.userId,
                is_host: socket.isHost
            });
            
            // Leave the room
            socket.leave(`session:${socket.sessionId}`);
            
            // Only remove from participants and notify if NOT host
            if (!socket.isHost) {
                // Notify other participants
                socket.to(`session:${socket.sessionId}`).emit('participant_left', {
                    user_id: socket.userId,
                    display_name: socket.displayName
                });
            }
            
            // Remove active connection from Redis (use role from socket)
            const role = socket.isHost ? 'host' : 'player';
            await RedisHelper.removeActiveConnection(socket.userId, socket.sessionId, role);
        }
        
        // Remove from active connections
        if (socket.connectionId) {
            activeConnections.delete(socket.connectionId);
        }
    });

    // Handle ping (heartbeat)
    socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
    });
    
    // Handle countdown broadcast from host
    socket.on('broadcast_countdown', (data) => {
        if (socket.sessionId && socket.isHost) {
            logger.info('Broadcasting countdown', { sessionId: socket.sessionId, count: data.count });
            io.to(`session:${socket.sessionId}`).emit('quiz_countdown', data);
        }
    });
    
    // Handle top 3 broadcast from host
    socket.on('broadcast_top3', (data) => {
        if (socket.sessionId && socket.isHost) {
            logger.info('Broadcasting top 3', { sessionId: socket.sessionId, top3Count: data.top3?.length });
            io.to(`session:${socket.sessionId}`).emit('show_top3', data);
        }
    });

    // Handle answer submission
    socket.on('submit_answer', async (data) => {
        try {
            stats.messagesReceived++;

            const { question_index, choice_id, client_time } = data;
            const answer_time = Date.now();

            logger.debug('Answer submitted', {
                userId: socket.userId,
                sessionId: socket.sessionId,
                questionIndex: question_index,
                choiceId: choice_id,
            });

            // Get session data
            const session = await RedisHelper.getSession(socket.sessionId);
            if (!session || session.status !== 'question') {
                socket.emit('error', { message: 'Not accepting answers at this time' });
                return;
            }

            const currentQuestion = session.current_question_index;
            if (currentQuestion !== question_index) {
                socket.emit('error', { message: 'Invalid question index' });
                return;
            }

            // Get question data
            const questions = JSON.parse(session.questions || '[]');
            const question = questions[question_index];
            
            if (!question) {
                socket.emit('error', { message: 'Question not found' });
                return;
            }

            // Calculate time taken (server-side)
            const questionStartTime = parseFloat(session.question_start_time || 0);
            const timeTaken = (answer_time - questionStartTime) / 1000; // Convert to seconds

            // Validate timing
            if (timeTaken < 0.1) {
                socket.emit('error', { message: 'Answer too fast' });
                return;
            }

            if (timeTaken > (parseFloat(question.time_limit) + 2)) {
                socket.emit('error', { message: 'Answer too late' });
                return;
            }

            // Check if correct
            const choices = question.choices || [];
            const selectedChoice = choices[choice_id];
            const isCorrect = selectedChoice && selectedChoice.is_correct === true;

            // Calculate score
            let score = 0;
            if (isCorrect) {
                const basePoints = parseFloat(question.base_points) || 1000;
                const timeLimit = parseFloat(question.time_limit) || 20;
                const alpha = parseFloat(session.alpha) || 0.3;
                const timeRemain = Math.max(0, timeLimit - timeTaken);
                const ratio = timeRemain / timeLimit;
                score = Math.round(basePoints * (alpha + (1 - alpha) * ratio));
            }

            // Save answer to Redis
            const answerData = {
                question_index,
                choice_id,
                is_correct: isCorrect,
                time_taken: timeTaken,
                score,
                timestamp: answer_time,
            };

            await RedisHelper.saveAnswer(socket.sessionId, socket.userId, question_index, answerData);

            // Update leaderboard score
            if (score > 0) {
                await RedisHelper.updateScore(socket.sessionId, socket.userId, score);
            }

            // Send response to user
            socket.emit('answer_received', {
                success: true,
                is_correct: isCorrect,
                score,
                time_taken: timeTaken,
            });

            stats.messagesSent++;

            logger.info('Answer processed', {
                userId: socket.userId,
                questionIndex: question_index,
                isCorrect,
                score,
                timeTaken: timeTaken.toFixed(2),
            });

        } catch (error) {
            stats.errors++;
            logger.error('Error processing answer', {
                error: error.message,
                stack: error.stack,
                userId: socket.userId,
            });
            socket.emit('error', { message: 'Failed to process answer' });
        }
    });

    // Handle get leaderboard request
    socket.on('get_leaderboard', async (data) => {
        try {
            const limit = data?.limit || 100;
            const leaderboard = await RedisHelper.getLeaderboard(socket.sessionId, limit);
            
            socket.emit('leaderboard_update', { leaderboard });
            stats.messagesSent++;
        } catch (error) {
            logger.error('Error getting leaderboard', { error, sessionId: socket.sessionId });
            socket.emit('error', { message: 'Failed to get leaderboard' });
        }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
        stats.connections--;

        logger.info('Client disconnected', {
            socketId: socket.id,
            userId: socket.userId,
            sessionId: socket.sessionId,
            reason,
            totalConnections: stats.connections,
        });

        // Notify room
        if (socket.sessionId) {
            // Only broadcast participant_left if NOT host
            if (!socket.isHost) {
                io.to(`session:${socket.sessionId}`).emit('participant_left', {
                    user_id: socket.userId,
                    display_name: socket.displayName,
                    total_participants: stats.connections,
                });
            }
            
            // Remove active connection from Redis
            if (socket.userId) {
                const role = socket.isHost ? 'host' : 'player';
                await RedisHelper.removeActiveConnection(socket.userId, socket.sessionId, role);
                logger.info('✓ Removed active connection from Redis on disconnect', {
                    user_id: socket.userId,
                    session_id: socket.sessionId,
                    role,
                    was_host: socket.isHost
                });
            }
        }
        
        // Remove from active connections
        if (socket.connectionId) {
            activeConnections.delete(socket.connectionId);
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        stats.errors++;
        logger.error('Socket error', {
            error: error.message,
            socketId: socket.id,
            userId: socket.userId,
        });
    });
});

// HTTP API for WordPress backend to trigger events (for single-session enforcement)
app.post('/api/emit', (req, res) => {
    const { event, data, connectionId } = req.body;
    
    if (!event || !data) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing event or data' 
        });
    }
    
    logger.info('Emit event request', { event, connectionId });
    
    try {
        if (connectionId) {
            // Emit to specific connection
            const targetSocket = activeConnections.get(connectionId);
            
            if (targetSocket) {
                targetSocket.emit(event, data);
                logger.info(`Event '${event}' sent to connection ${connectionId}`);
                return res.json({ 
                    success: true, 
                    message: 'Event sent to specific connection' 
                });
            } else {
                logger.warn(`Connection ${connectionId} not found`);
                return res.json({ 
                    success: false, 
                    error: 'Connection not found' 
                });
            }
        } else {
            // Broadcast to all clients
            io.emit(event, data);
            logger.info(`Event '${event}' broadcasted to all clients`);
            return res.json({ 
                success: true, 
                message: 'Event broadcasted' 
            });
        }
    } catch (error) {
        logger.error('Error emitting event', { error: error.message });
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Admin API endpoints (protected by WordPress secret)
app.use('/api', (req, res, next) => {
    const secret = req.headers['x-wordpress-secret'];
    if (secret !== config.wordpress.secret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// Start question
app.post('/api/sessions/:id/start-question', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { question_index, question_data, start_time } = req.body;

        logger.info('Starting question', { sessionId, questionIndex: question_index });

        // Update session in Redis
        await redisClient.hSet(`session:${sessionId}`, {
            current_question_index: question_index,
            question_start_time: start_time,
            status: 'question',
        });

        // Broadcast to all participants in session
        io.to(`session:${sessionId}`).emit('question_start', {
            question_index,
            question: question_data,
            start_time,
            total_questions: question_data.total_questions || 0,
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Error starting question', { error, sessionId: req.params.id });
        res.status(500).json({ error: 'Failed to start question' });
    }
});

// End question
app.post('/api/sessions/:id/end-question', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { correct_answer, leaderboard: phpLeaderboard } = req.body;

        logger.info('Ending question', { sessionId, correct_answer, leaderboardFromPHP: phpLeaderboard ? phpLeaderboard.length : 0 });

        // Update session status
        await redisClient.hSet(`session:${sessionId}`, 'status', 'results');

        // Use leaderboard from PHP if provided, otherwise get from Redis
        let leaderboard = phpLeaderboard;
        if (!leaderboard || leaderboard.length === 0) {
            logger.info('Getting leaderboard from Redis');
            leaderboard = await RedisHelper.getLeaderboard(sessionId, 10);
        } else {
            logger.info('Using leaderboard from PHP', { count: leaderboard.length });
        }

        // Broadcast results with correct answer
        io.to(`session:${sessionId}`).emit('question_end', {
            correct_answer,
            leaderboard,
        });

        res.json({ success: true, leaderboard, correct_answer });
    } catch (error) {
        logger.error('Error ending question', { error, sessionId: req.params.id });
        res.status(500).json({ error: 'Failed to end question' });
    }
});

// Answer submitted notification
app.post('/api/sessions/:id/answer-submitted', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { user_id, answered_count, total_players, score } = req.body;

        logger.info('Answer submitted', { sessionId, user_id, answered_count, total_players, score });

        // Broadcast answer submission event
        io.to(`session:${sessionId}`).emit('answer_submitted', {
            user_id,
            answered_count,
            total_players,
            score,
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Error broadcasting answer submission', { error, sessionId: req.params.id });
        res.status(500).json({ error: 'Failed to broadcast answer submission' });
    }
});

// Kick player from session
app.post('/api/sessions/:id/kick-player', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { user_id, message, reason } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'Missing user_id' });
        }

        // Use custom message or default
        const kickMessage = message || 'Bạn đã bị kick khỏi phòng bởi host.';
        const kickReason = reason || 'kicked';

        logger.info('=== KICK PLAYER REQUEST ===', { 
            sessionId, 
            userId: user_id, 
            userIdType: typeof user_id,
            reason: kickReason,
            message: kickMessage,
            timestamp: new Date().toISOString() 
        });

        // Find the player's socket
        const room = io.sockets.adapter.rooms.get(`session:${sessionId}`);
        let kicked = false;
        
        if (room) {
            logger.info('Room found, checking sockets...', { roomSize: room.size });
            room.forEach(socketId => {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    logger.info('Checking socket', {
                        socketId: socket.id,
                        socketUserId: socket.userId,
                        socketUserIdType: typeof socket.userId,
                        targetUserId: user_id,
                        targetUserIdType: typeof user_id,
                        isHost: socket.isHost,
                        matches: String(socket.userId) === String(user_id)
                    });
                }
                // Compare as strings to handle both number and string types
                if (socket && String(socket.userId) === String(user_id) && !socket.isHost) {
                    // Send kick event to the player with custom message
                    socket.emit('kicked_from_session', {
                        message: kickMessage,
                        reason: kickReason,
                        session_id: sessionId,
                        timestamp: Date.now()
                    });
                    
                    logger.info('✓ Sent kick event to player', {
                        userId: socket.userId,
                        displayName: socket.displayName,
                        socketId: socket.id
                    });
                    
                    // Disconnect the socket after a brief delay
                    setTimeout(() => {
                        socket.disconnect(true);
                    }, 100);
                    
                    kicked = true;
                }
            });
        }

        if (kicked) {
            // Notify other players
            io.to(`session:${sessionId}`).emit('participant_left', {
                user_id: user_id,
                reason: 'kicked'
            });
            
            logger.info('✓ Player kicked successfully', { sessionId, userId: user_id });
            res.json({ 
                success: true, 
                message: 'Player kicked successfully',
                user_id: user_id
            });
        } else {
            logger.warn('Player not found in session', { sessionId, userId: user_id });
            res.status(404).json({ error: 'Player not found in session' });
        }
    } catch (error) {
        logger.error('Error kicking player', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to kick player' });
    }
});

// Ban player from session (stores in Redis with TTL)
app.post('/api/sessions/:id/ban-session', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'Missing user_id' });
        }

        logger.info('Ban player from session', { sessionId, userId: user_id });

        // Add to Redis ban list with 24h TTL
        await RedisHelper.addSessionBan(sessionId, user_id);

        // Also kick if currently connected
        const room = io.sockets.adapter.rooms.get(`session:${sessionId}`);
        if (room) {
            room.forEach(socketId => {
                const socket = io.sockets.sockets.get(socketId);
                if (socket && String(socket.userId) === String(user_id) && !socket.isHost) {
                    socket.emit('kicked_from_session', {
                        message: 'Bạn đã bị ban khỏi phòng này.',
                        reason: 'banned_from_session',
                        session_id: sessionId,
                        timestamp: Date.now()
                    });
                    setTimeout(() => socket.disconnect(true), 100);
                }
            });
        }

        res.json({ success: true, message: 'Player banned from session' });
    } catch (error) {
        logger.error('Error banning player', { error: error.message });
        res.status(500).json({ error: 'Failed to ban player' });
    }
});

// Check if user is banned from session
app.get('/api/sessions/:id/is-banned', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ error: 'Missing user_id' });
        }

        const isBanned = await RedisHelper.isSessionBanned(sessionId, userId);

        res.json({ is_banned: isBanned });
    } catch (error) {
        logger.error('Error checking ban status', { error: error.message });
        res.status(500).json({ error: 'Failed to check ban status' });
    }
});

// End session - Kick all players out of room
app.post('/api/sessions/:id/end', async (req, res) => {
    try {
        const sessionId = req.params.id;

        logger.info('=== END ROOM REQUEST ===' , { sessionId, timestamp: new Date().toISOString() });

        // Update session status in Redis
        await redisClient.hSet(`session:${sessionId}`, 'status', 'ended');
        logger.info('✓ Session status updated to ended in Redis');

        // Get final leaderboard from WordPress API (since PHP doesn't have Redis extension)
        let leaderboard = [];
        try {
            const axios = require('axios');
            const response = await axios.get(`https://dndenglish.com/wp-json/live-quiz/v1/sessions/${sessionId}/leaderboard`, {
                timeout: 5000,
                httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
            });
            
            if (response.data && response.data.leaderboard) {
                leaderboard = response.data.leaderboard.map((entry, index) => ({
                    rank: index + 1,
                    user_id: entry.user_id,
                    total_score: entry.score || entry.total_score || 0,
                    display_name: entry.display_name || entry.name || `Player ${entry.user_id}`
                }));
                logger.info('✓ Final leaderboard retrieved from WordPress', { playerCount: leaderboard.length });
            } else {
                logger.warn('Empty leaderboard from WordPress API');
            }
        } catch (error) {
            logger.error('Error retrieving leaderboard from WordPress', { error: error.message, sessionId });
            // Continue anyway with empty leaderboard
        }

        // Broadcast session_end event to all participants (including host)
        io.to(`session:${sessionId}`).emit('session_end', {
            leaderboard: leaderboard,
            message: 'Quiz đã kết thúc'
        });
        
        logger.info('✓ Broadcasted session_end event to all participants');
        logger.info('=== END SESSION COMPLETED (natural end, players not kicked) ===');

        res.json({ 
            success: true, 
            message: 'Session ended successfully',
            session_id: sessionId
        });
    } catch (error) {
        logger.error('Error ending session', { error: error.message, stack: error.stack, sessionId: req.params.id });
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check Redis connection
        await redisClient.ping();
        
        res.json({
            status: 'ok',
            uptime: Math.floor((Date.now() - stats.startTime) / 1000),
            connections: stats.connections,
            redis: 'connected',
            memory: process.memoryUsage(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            redis: 'disconnected',
            error: error.message,
        });
    }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        connections: stats.connections,
        total_connections: stats.totalConnections,
        messages_received: stats.messagesReceived,
        messages_sent: stats.messagesSent,
        errors: stats.errors,
        uptime: Math.floor((Date.now() - stats.startTime) / 1000),
        memory: process.memoryUsage(),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Express error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
async function shutdown(signal) {
    logger.info(`${signal} received, shutting down gracefully...`);
    
    // Close Socket.io connections
    io.close(() => {
        logger.info('Socket.io connections closed');
    });

    // Close Redis connections
    try {
        await redisClient.quit();
        await redisPub.quit();
        await redisSub.quit();
        logger.info('Redis connections closed');
    } catch (error) {
        logger.error('Error closing Redis', error);
    }

    // Close HTTP server
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function start() {
    try {
        // Initialize Redis
        await initRedis();

        // Create logs directory
        const fs = require('fs');
        if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs');
        }

        // Start HTTP server
        server.listen(config.port, '0.0.0.0', () => {
            logger.info('WebSocket server started', {
                port: config.port,
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || 'development',
            });
        });

    } catch (error) {
        logger.error('Failed to start server', error);
        process.exit(1);
    }
}

// Start the server
start();
