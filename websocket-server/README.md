# DND Quiz WebSocket Server

Real-time WebSocket server for DND Live Quiz plugin using Socket.io and Redis.

## Features

- **Real-time Communication**: Socket.io for bidirectional event-based communication
- **High Performance**: Supports 2000+ concurrent users with <50ms latency
- **Redis Backend**: O(log N) leaderboard queries using Redis Sorted Sets
- **JWT Authentication**: Secure token-based authentication
- **Cluster Mode**: PM2 clustering for multi-core CPU utilization
- **Rate Limiting**: 100 requests/minute per IP
- **Security**: Helmet.js, CORS, input validation
- **Monitoring**: Winston logging, health checks, metrics endpoint

## Prerequisites

- Node.js 18+ 
- npm 9+
- Redis 7+
- Docker & Docker Compose (for containerized deployment)

## Installation

### Option 1: Docker (Recommended)

```bash
# Build Docker image
docker-compose build websocket

# Start server
docker-compose up -d websocket

# View logs
docker-compose logs -f websocket
```

### Option 2: Local Development

```bash
# Navigate to websocket-server directory
cd websocket-server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Development mode (with auto-reload)
npm run dev

# Production mode (with PM2 clustering)
npm run prod
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DATABASE=0

# WordPress Integration
WORDPRESS_URL=http://wordpress
WORDPRESS_SECRET=your-secret-from-wordpress-settings

# JWT
JWT_SECRET=your-jwt-secret-from-wordpress-settings

# CORS
CORS_ORIGIN=http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

**Important**: The `WORDPRESS_SECRET` and `JWT_SECRET` must match the values configured in WordPress admin settings.

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and Redis connection.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "connections": 125,
  "redis": "connected",
  "memory": {...}
}
```

### Metrics
```
GET /metrics
```
Returns server statistics.

**Response:**
```json
{
  "connections": 125,
  "total_connections": 1500,
  "messages_received": 50000,
  "messages_sent": 48000,
  "errors": 10,
  "uptime": 3600,
  "memory": {...}
}
```

### Admin API (Requires WordPress Secret)

All admin endpoints require `X-WordPress-Secret` header.

#### Start Question
```
POST /api/sessions/:id/start-question
Content-Type: application/json
X-WordPress-Secret: your-secret

{
  "question_index": 0,
  "question_data": {...},
  "start_time": 1234567890
}
```

#### End Question
```
POST /api/sessions/:id/end-question
X-WordPress-Secret: your-secret
```

#### End Session
```
POST /api/sessions/:id/end
X-WordPress-Secret: your-secret
```

## Socket.io Events

### Client → Server

#### `submit_answer`
Submit an answer for the current question.

```javascript
socket.emit('submit_answer', {
  question_index: 0,
  choice_id: 2,
  client_time: Date.now()
});
```

#### `get_leaderboard`
Request current leaderboard.

```javascript
socket.emit('get_leaderboard', { limit: 10 });
```

#### `ping`
Heartbeat to check connection.

```javascript
socket.emit('ping');
```

### Server → Client

#### `question_start`
New question started.

```javascript
socket.on('question_start', (data) => {
  // data: { question_index, question, start_time }
});
```

#### `question_end`
Question ended, results available.

```javascript
socket.on('question_end', (data) => {
  // data: { leaderboard }
});
```

#### `session_end`
Session ended, final results.

```javascript
socket.on('session_end', (data) => {
  // data: { leaderboard }
});
```

#### `answer_received`
Answer processed successfully.

```javascript
socket.on('answer_received', (data) => {
  // data: { success, is_correct, score, time_taken }
});
```

#### `leaderboard_update`
Leaderboard data.

```javascript
socket.on('leaderboard_update', (data) => {
  // data: { leaderboard }
});
```

#### `participant_joined`
New participant joined session.

```javascript
socket.on('participant_joined', (data) => {
  // data: { user_id, display_name, total_participants }
});
```

#### `participant_left`
Participant left session.

```javascript
socket.on('participant_left', (data) => {
  // data: { user_id, display_name, total_participants }
});
```

#### `pong`
Response to ping.

```javascript
socket.on('pong', (data) => {
  // data: { timestamp }
});
```

#### `error`
Error occurred.

```javascript
socket.on('error', (data) => {
  // data: { message }
});
```

## Authentication

Clients must authenticate using JWT tokens provided by WordPress:

```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'your-jwt-token-from-wordpress'
  }
});
```

JWT payload structure:
```json
{
  "user_id": "123",
  "session_id": "456",
  "display_name": "John Doe",
  "iat": 1234567890,
  "exp": 1234654290
}
```

## PM2 Commands

```bash
# Start in cluster mode
npm run prod

# Stop all processes
npm run stop

# Restart all processes
npm run restart

# View logs
npm run logs

# Monitor processes
npm run monit

# View process list
pm2 list

# View detailed info
pm2 show dnd-quiz-ws

# Flush logs
pm2 flush
```

## Performance Tuning

### Cluster Mode
By default, PM2 uses all available CPU cores. To limit:

```bash
PM2_INSTANCES=4 npm run prod
```

### Memory Limit
Configured in `ecosystem.config.js`:
```javascript
max_memory_restart: '500M'
```

### Connection Limits
Adjust in `server.js`:
```javascript
io.on('connection', async (socket) => {
  // Socket.io automatically handles connection limits
  // based on available system resources
});
```

## Monitoring

### Winston Logs
Logs are written to:
- `logs/error.log` - Error level only
- `logs/combined.log` - All levels
- Console - All levels (colorized)

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Web-based monitoring (PM2 Plus)
pm2 plus
```

### Health Checks
Docker health check runs every 30 seconds:
```bash
curl http://localhost:3000/health
```

## Troubleshooting

### Connection Issues

**Problem**: "Authentication token required"
- Ensure JWT token is passed in `auth.token`
- Verify JWT_SECRET matches WordPress settings

**Problem**: "Redis Client Error"
- Check Redis connection settings in `.env`
- Ensure Redis server is running: `redis-cli ping`

### Performance Issues

**Problem**: High latency
- Check Redis connection latency: `redis-cli --latency`
- Monitor PM2 processes: `pm2 monit`
- Check system resources: `htop`

**Problem**: Memory leaks
- PM2 auto-restarts at 500MB limit
- Check logs: `npm run logs`

### Debugging

Enable debug logging:
```env
LOG_LEVEL=debug
```

View real-time logs:
```bash
# Docker
docker-compose logs -f websocket

# PM2
npm run logs
```

## Security Best Practices

1. **Change Default Secrets**: Update `WORDPRESS_SECRET` and `JWT_SECRET`
2. **Use HTTPS**: Configure Nginx reverse proxy with SSL
3. **Restrict CORS**: Set specific origins in `CORS_ORIGIN`
4. **Rate Limiting**: Adjust limits based on your needs
5. **Firewall**: Only expose port 3000 to Nginx, not publicly
6. **Updates**: Regularly update dependencies: `npm audit fix`

## Development

### Run Tests
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Development Mode
```bash
npm run dev
```

Auto-reloads on file changes using nodemon.

## Architecture

```
┌─────────────────┐
│   WordPress     │
│   PHP Plugin    │
└────────┬────────┘
         │ REST API
         │ (JWT token)
         ▼
┌─────────────────┐      ┌──────────┐
│   WebSocket     │◄────►│  Redis   │
│   Server        │      │  Cache   │
│  (Socket.io)    │      │  Sorted  │
└────────┬────────┘      │  Sets    │
         │               └──────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│   Clients       │
│  (Browser JS)   │
└─────────────────┘
```

## License

GPL-3.0 - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [your-repo]/issues
- Documentation: See main plugin README.md
- Migration Guide: See MIGRATION-GUIDE.md

## Version

2.0.0 - Phase 2 Complete
