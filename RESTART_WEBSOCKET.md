# Hướng dẫn Restart WebSocket Server

## Vấn đề đã fix

Đã sửa lỗi: **Player B vẫn thấy Player A trong danh sách mặc dù Player A đã đóng tab**

### Thay đổi:

1. **WebSocket Server** (`websocket-server/server.js`):
   - Thêm API endpoint mới: `GET /api/sessions/:sessionId/active-players`
   - Endpoint này trả về danh sách players **đang thực sự connected** (lấy từ Socket.io rooms)

2. **PHP REST API** (`includes/class-rest-api.php`):
   - Cập nhật `get_players()` - cho host
   - Cập nhật `get_players_list()` - cho players
   - Cập nhật `get_player_count()` - đếm số players
   - Tất cả đều ưu tiên lấy từ WebSocket server, fallback về database nếu WebSocket không available

## Cách Restart WebSocket Server

### Option 1: Restart thủ công

```bash
# 1. Tìm process đang chạy
ps aux | grep "node.*server.js"

# 2. Kill process cũ
pkill -f "node.*server.js"
# hoặc
kill <PID>

# 3. Start lại
cd /home/wordpress-da/html/wp-content/plugins/dnd-live-quiz/websocket-server
nohup node server.js > websocket.log 2>&1 &

# 4. Kiểm tra
tail -f websocket.log
```

### Option 2: Sử dụng PM2 (Recommended)

```bash
# Install PM2 nếu chưa có
npm install -g pm2

# Start với PM2
cd /home/wordpress-da/html/wp-content/plugins/dnd-live-quiz/websocket-server
pm2 start server.js --name "live-quiz-ws"

# Restart khi có update code
pm2 restart live-quiz-ws

# Xem logs
pm2 logs live-quiz-ws

# Xem status
pm2 status

# Auto start khi reboot server
pm2 startup
pm2 save
```

### Option 3: Sử dụng systemd service

```bash
# Tạo service file
sudo nano /etc/systemd/system/live-quiz-websocket.service

# Paste nội dung:
[Unit]
Description=Live Quiz WebSocket Server
After=network.target

[Service]
Type=simple
User=wordpress-da
WorkingDirectory=/home/wordpress-da/html/wp-content/plugins/dnd-live-quiz/websocket-server
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=live-quiz-ws

[Install]
WantedBy=multi-user.target

# Enable và start service
sudo systemctl daemon-reload
sudo systemctl enable live-quiz-websocket
sudo systemctl start live-quiz-websocket

# Restart khi cần
sudo systemctl restart live-quiz-websocket

# Xem status
sudo systemctl status live-quiz-websocket

# Xem logs
sudo journalctl -u live-quiz-websocket -f
```

## Kiểm tra hoạt động

### 1. Test API endpoint mới

```bash
# Kiểm tra endpoint active-players
curl http://localhost:3000/api/sessions/123/active-players

# Response mong đợi:
{
  "success": true,
  "session_id": "123",
  "players": [
    {
      "user_id": "31",
      "display_name": "Đa (@Danguyen)",
      "socket_id": "abc123",
      "connected_at": 1234567890
    }
  ],
  "count": 1
}
```

### 2. Test flow

1. **Player A join** → Host thấy Player A
2. **Player B join** → Cả Host và Player A thấy Player B
3. **Player A đóng tab** → Host và Player B **không thấy Player A nữa** ✅
4. **Player B F5** → Player B **không thấy Player A** ✅
5. **Player A mở lại tab** → Cả Host và Player B thấy Player A lại

## Troubleshooting

### WebSocket server không start

```bash
# Kiểm tra port 3000 có bị chiếm không
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000

# Kill process đang chiếm port
sudo kill -9 <PID>
```

### API endpoint không hoạt động

```bash
# Kiểm tra WebSocket server có chạy không
curl http://localhost:3000/health

# Kiểm tra logs
tail -f /home/wordpress-da/html/wp-content/plugins/dnd-live-quiz/websocket-server/websocket.log
```

### Players vẫn không cập nhật

1. Hard refresh browser (Ctrl + Shift + R)
2. Kiểm tra console logs:
   - `[PLAYER] Participant left:` - phải có log này khi player disconnect
   - `[LiveQuiz] Got X active players from WebSocket server` - API phải gọi đến WebSocket
3. Kiểm tra Network tab: `/players-list` response phải có `"source": "websocket"`

## Lưu ý

- Sau khi restart WebSocket server, tất cả connected clients sẽ bị disconnect và reconnect tự động
- Nếu đang có quiz đang chơi, nên chờ quiz kết thúc rồi mới restart
- Hoặc thông báo cho users refresh lại trang sau khi restart

