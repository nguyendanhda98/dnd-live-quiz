# Tính năng Kick Thành viên

## Mô tả
Tính năng cho phép host kick (đuổi) người chơi ra khỏi phòng quiz trong thời gian thực.

## Các thành phần đã thêm

### 1. Backend (PHP)

#### class-rest-api.php
- **Endpoint mới**: `POST /live-quiz/v1/sessions/{id}/kick-player`
- **Permission**: Chỉ host của phiên có quyền kick
- **Tham số**: `user_id` - ID của người chơi cần kick
- **Chức năng**: 
  - Xác thực quyền host
  - Gọi Session Manager để kick player
  - Gọi WebSocket Helper để thông báo qua WebSocket
  - Trả về kết quả thành công/thất bại

#### class-session-manager.php
- **Method mới**: `kick_player($session_id, $user_id)`
- **Chức năng**:
  - Xóa player khỏi Redis (nếu có)
  - Broadcast event `player_kicked` qua SSE fallback
  - Trả về status và message

#### class-websocket-helper.php (file mới)
- **Class mới**: `Live_Quiz_WebSocket_Helper`
- **Chức năng**: Helper class để giao tiếp với WebSocket server
- **Methods**:
  - `kick_player($session_id, $user_id)` - Gửi lệnh kick qua HTTP API
  - `end_session($session_id)` - Kết thúc phiên
  - `start_question()` - Bắt đầu câu hỏi
  - `end_question()` - Kết thúc câu hỏi

### 2. WebSocket Server (Node.js)

#### server.js
- **Endpoint mới**: `POST /api/sessions/:id/kick-player`
- **Chức năng**:
  - Tìm socket của player bị kick
  - Gửi event `kicked_from_session` đến player
  - Ngắt kết nối socket của player
  - Xóa player khỏi Redis
  - Thông báo cho các player khác qua event `participant_left`

### 3. Frontend Host (JavaScript)

#### assets/js/host.js
- **Method mới**: `kickPlayer(playerId, playerName)`
- **Chức năng**:
  - Hiển thị confirm dialog
  - Gửi request kick đến REST API
  - Cập nhật danh sách players
  - Hiển thị notification thành công/thất bại

- **Method mới**: `showNotification(message, type)`
- **Chức năng**: Hiển thị thông báo toast

- **Cập nhật**: `updatePlayersList()`
- Thêm nút kick (✕) cho mỗi player
- Bind event click cho nút kick

### 4. Frontend Player (JavaScript)

#### assets/js/player.js
- **Event handler mới**: `kicked_from_session`
- **Function mới**: `handleKickedByHost(data)`
- **Chức năng**:
  - Ngắt kết nối WebSocket
  - Xóa session data từ localStorage
  - Reset state
  - Hiển thị thông báo bị kick
  - Chuyển về màn hình lobby với nút quay về trang chủ

### 5. Styling (CSS)

#### assets/css/host.css
- `.btn-kick-player`: Style cho nút kick
  - Hình tròn, màu đỏ
  - Hiệu ứng hover và active
  - Disabled state
  
- `.host-notification`: Toast notification
  - Vị trí: top-right
  - Variants: success, error, warning
  - Animation: slide down

#### assets/css/player.css
- `.error-box.kicked`: Style cho thông báo bị kick
  - Border đỏ
  - Icon và message rõ ràng

## Luồng hoạt động

### Khi host kick một player:

1. **Host** click nút kick (✕) trên player item
2. **Frontend** hiển thị confirm dialog
3. Nếu confirm, gửi `POST /sessions/{id}/kick-player` với `user_id`
4. **REST API** xác thực quyền host
5. **Session Manager** xóa player khỏi Redis
6. **WebSocket Helper** gửi lệnh kick đến WebSocket server
7. **WebSocket Server** 
   - Tìm socket của player
   - Gửi event `kicked_from_session`
   - Disconnect socket
   - Thông báo cho các player khác
8. **Player bị kick**
   - Nhận event `kicked_from_session`
   - Disconnect và clear data
   - Hiển thị thông báo "Bạn đã bị kick"
9. **Host** nhận response thành công, cập nhật UI

## Bảo mật

- Chỉ host có quyền kick (kiểm tra qua `check_session_host_permission`)
- Host không thể kick chính mình
- Player bị kick sẽ bị disconnect hoàn toàn
- Session data được clear để ngăn reconnect tự động

## Testing

### Test case 1: Kick player thành công
1. Host tạo phòng
2. Player A join phòng
3. Host click nút kick trên Player A
4. Xác nhận kick
5. **Expected**: Player A bị disconnect và thấy thông báo bị kick

### Test case 2: Host không thể kick chính mình
- Host không thấy nút kick trên item của chính mình

### Test case 3: Notification
- Host thấy notification "Đã kick [tên player] khỏi phòng"

### Test case 4: Player list update
- Sau khi kick, player list tự động cập nhật
- Số lượng player giảm đi

## Cải tiến trong tương lai

- [ ] Log kick history
- [ ] Khả năng ban player (không cho vào lại)
- [ ] Kick multiple players cùng lúc
- [ ] Kick với lý do (reason message)
- [ ] Undo kick trong 5 giây
