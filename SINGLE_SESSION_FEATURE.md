# Single Session Enforcement Feature

## Tổng quan

Tính năng này đảm bảo mỗi user chỉ có thể tham gia phòng quiz từ 1 tab/thiết bị tại một thời điểm. Khi user mở tab mới hoặc tham gia từ thiết bị khác, tab/thiết bị cũ sẽ tự động bị đăng xuất và chuyển về trang chủ.

## Cách hoạt động

### 1. Connection ID Generation
- Mỗi khi user tham gia phòng, client tạo một `connectionId` duy nhất
- ConnectionId được tạo từ: `timestamp-randomString` (ví dụ: `1234567890-abc123def`)
- ConnectionId này được lưu trong state và gửi lên server

### 2. Server-side Tracking
- Khi user gửi request `join_session`, server nhận cả `connection_id`
- Server kiểm tra user_meta để xem user có session đang active không
- Nếu có session cũ với `connectionId` khác nhau:
  - Server gọi WebSocket server qua HTTP API `/api/emit`
  - WebSocket server emit event `session_kicked` tới connection cũ
  - Server lưu session mới với connectionId mới vào user_meta

### 3. Client-side Handling
- Client (tab cũ) nhận event `session_kicked` từ WebSocket
- Client thực hiện:
  - Disconnect socket
  - Xóa localStorage
  - Gọi API leave_session để cleanup
  - Hiển thị alert thông báo
  - Redirect về trang chủ

### 4. WebSocket Server Role
- WebSocket server duy trì Map: `connectionId => socket`
- Khi nhận POST `/api/emit` với `connectionId`:
  - Tìm socket tương ứng
  - Emit event trực tiếp tới socket đó
  - Return success/error response

## Luồng hoạt động chi tiết

```
User A đang join phòng ở Tab 1 (connectionId: "123-abc")
↓
User A mở Tab 2 và join cùng phòng đó
↓
Tab 2 tạo connectionId mới: "456-def"
↓
Tab 2 gửi join_session với connectionId: "456-def"
↓
Server nhận request, kiểm tra user_meta của User A
↓
Server thấy có session cũ với connectionId: "123-abc"
↓
Server gọi POST /api/emit {
  event: "session_kicked",
  data: { message: "..." },
  connectionId: "123-abc"
}
↓
WebSocket server nhận request, tìm socket của "123-abc"
↓
WebSocket emit "session_kicked" tới Tab 1
↓
Tab 1 nhận event, disconnect, xóa data, redirect
↓
Server lưu session mới với connectionId: "456-def"
↓
Tab 2 tiếp tục join thành công
```

## File Changes

### Frontend (`player.js`)

1. **Thêm connectionId vào state:**
```javascript
const state = {
    connectionId: null,
    // ... existing fields
};
```

2. **Thêm function tạo connectionId:**
```javascript
function generateConnectionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
}
```

3. **Tạo connectionId khi join:**
```javascript
function handleJoin() {
    state.connectionId = generateConnectionId();
    // Send to server
}
```

4. **Gửi connectionId lên server:**
```javascript
socket.emit('join_session', {
    session_id: state.sessionId,
    user_id: state.userId,
    display_name: state.displayName,
    connection_id: state.connectionId
});
```

5. **Thêm event listener cho session_kicked:**
```javascript
socket.on('session_kicked', async (data) => {
    // Disconnect, cleanup, redirect
});
```

### Backend (`class-rest-api.php`)

1. **Nhận connectionId trong join_session:**
```php
$connection_id = $request->get_param('connection_id');
```

2. **Kiểm tra session cũ:**
```php
$old_session = get_user_meta($wp_user_id, '_live_quiz_active_session', true);
if ($old_session && is_array($old_session)) {
    $old_connection_id = isset($old_session['connectionId']) ? $old_session['connectionId'] : null;
    
    if ($old_connection_id && $old_connection_id !== $connection_id) {
        self::send_websocket_event('session_kicked', array(
            'message' => 'Bạn đã tham gia phòng này từ tab/thiết bị khác.',
        ), $old_connection_id);
    }
}
```

3. **Lưu connectionId vào user_meta:**
```php
update_user_meta($wp_user_id, '_live_quiz_active_session', array(
    'sessionId' => $session_id,
    'userId' => $participant['user_id'],
    'displayName' => $participant['display_name'],
    'roomCode' => $room_code,
    'websocketToken' => $jwt_token,
    'connectionId' => $connection_id,
    'timestamp' => time() * 1000,
));
```

4. **Thêm helper function gửi WebSocket event:**
```php
private static function send_websocket_event($event, $data, $target_connection_id = null) {
    $websocket_url = get_option('live_quiz_websocket_url', 'http://localhost:3033');
    $emit_url = trailingslashit($websocket_url) . 'api/emit';
    
    $payload = array(
        'event' => $event,
        'data' => $data,
    );
    
    if ($target_connection_id) {
        $payload['connectionId'] = $target_connection_id;
    }
    
    wp_remote_post($emit_url, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body' => json_encode($payload),
        'timeout' => 5,
    ));
}
```

### WebSocket Server (`websocket-server.js`)

1. **Lưu connection mapping:**
```javascript
const activeConnections = new Map();

socket.on('join_session', (data) => {
    const { connection_id } = data;
    if (connection_id) {
        activeConnections.set(connection_id, socket);
        socket.connectionId = connection_id;
    }
});
```

2. **API endpoint để emit events:**
```javascript
app.post('/api/emit', (req, res) => {
    const { event, data, connectionId } = req.body;
    
    if (connectionId) {
        const targetSocket = activeConnections.get(connectionId);
        if (targetSocket) {
            targetSocket.emit(event, data);
            return res.json({ success: true });
        }
    }
    
    return res.json({ success: false, error: 'Connection not found' });
});
```

3. **Cleanup khi disconnect:**
```javascript
socket.on('disconnect', () => {
    if (socket.connectionId) {
        activeConnections.delete(socket.connectionId);
    }
});
```

## Setup Requirements

### 1. WebSocket Server
```bash
cd /wp-content/plugins/dnd-live-quiz
npm install
cp .env.example .env
# Edit .env with correct settings
npm start
```

### 2. WordPress Settings
- Go to: Live Quiz → Settings
- Set "WebSocket Server URL": `http://localhost:3033`
- Make sure JWT Secret matches .env file

### 3. Test
1. Login as user
2. Open `/play` page
3. Join a room (Tab A)
4. Open new tab, go to `/play`
5. Join same room (Tab B)
6. Tab A should be kicked and redirected

## Benefits

✅ **Data Integrity**: Prevents multiple submissions from same user
✅ **Clear State**: Only one active session per user at any time
✅ **Better UX**: Users know which tab is active
✅ **Security**: Reduces potential for cheating or data corruption
✅ **Resource Management**: Prevents unnecessary WebSocket connections

## Troubleshooting

### Tab không bị kick
- Kiểm tra WebSocket server có chạy không: `curl http://localhost:3033/health`
- Kiểm tra PHP có reach được WebSocket server không
- Xem browser console có lỗi WebSocket không
- Kiểm tra connectionId có được gửi đúng không

### Alert không hiện
- Kiểm tra event listener `session_kicked` có được add không
- Xem WebSocket server logs: `pm2 logs live-quiz-ws`
- Test API endpoint: `curl -X POST http://localhost:3033/api/emit -H "Content-Type: application/json" -d '{"event":"test","data":{}}'`

### Redirect về URL sai
- Kiểm tra `config.homeUrl` trong player.js
- Kiểm tra WordPress home_url() setting
- Có thể hardcode URL nếu cần

## Future Enhancements

- [ ] Grace period (5s) trước khi kick để tránh kick nhầm do network lag
- [ ] Notification thay vì alert
- [ ] Option cho phép multiple sessions (admin setting)
- [ ] Session transfer (cho phép switch device mà không mất state)
- [ ] Connection quality indicator
