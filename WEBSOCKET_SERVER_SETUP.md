# WebSocket Server Setup Guide

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Navigate to the WebSocket server directory:
```bash
cd /home/wordpress-da/html/wp-content/plugins/dnd-live-quiz/websocket-server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
```env
PORT=3033
JWT_SECRET=your-jwt-secret-from-wordpress
WORDPRESS_URL=http://your-wordpress-domain.com
CORS_ORIGIN=http://your-wordpress-domain.com
```

**Important**: The `JWT_SECRET` must match the JWT secret set in WordPress admin panel under Live Quiz settings.

## Running the Server

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

## Running as a Service (Production)

### Using PM2:

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Start the server:
```bash
cd /home/wordpress-da/html/wp-content/plugins/dnd-live-quiz/websocket-server
pm2 start server.js --name live-quiz-ws
```

3. Save PM2 configuration:
```bash
pm2 save
```

4. Enable PM2 to start on boot:
```bash
pm2 startup
```

### Using systemd:

1. Create a service file `/etc/systemd/system/live-quiz-ws.service`:
```ini
[Unit]
Description=Live Quiz WebSocket Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/wordpress-da/html/wp-content/plugins/dnd-live-quiz/websocket-server
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

2. Enable and start the service:
```bash
sudo systemctl enable live-quiz-ws
sudo systemctl start live-quiz-ws
```

3. Check status:
```bash
sudo systemctl status live-quiz-ws
```

## Verification

Check if the server is running:
```bash
curl http://localhost:3033/health
```

Expected response:
```json
{
  "status": "ok",
  "connections": 0,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## WordPress Configuration

1. Go to WordPress Admin → Live Quiz → Settings
2. Set "WebSocket Server URL" to: `http://localhost:3033` (or your server URL)
3. Make sure the JWT Secret matches the one in your `.env` file
4. Save settings

## Features

### Single Session Enforcement
The server now supports single-session enforcement per user:
- When a user joins from a new tab/device, the old connection is automatically kicked
- The old tab receives a `session_kicked` event and redirects to homepage
- This prevents multiple active sessions per user

### API Endpoints

#### POST /api/emit
Emit events to specific connections or broadcast to all clients.

Request body:
```json
{
  "event": "event_name",
  "data": { ... },
  "connectionId": "optional-connection-id"
}
```

#### GET /health
Health check endpoint.

Response:
```json
{
  "status": "ok",
  "connections": 5,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use: `lsof -i :3000`
- Check Node.js is installed: `node --version`
- Check npm dependencies are installed: `npm list`

### Connection issues
- Verify WordPress site can reach WebSocket server
- Check CORS_ORIGIN matches your WordPress URL
- Check JWT_SECRET matches between .env and WordPress settings

### Session kicked not working
- Verify WebSocket server is running: `curl http://localhost:3033/health`
- Check WordPress can reach the server from PHP
- Check browser console for WebSocket connection errors
- Verify JWT token is being passed correctly

## Logs

View server logs:
```bash
# If using PM2
pm2 logs live-quiz-ws

# If using systemd
sudo journalctl -u live-quiz-ws -f
```
