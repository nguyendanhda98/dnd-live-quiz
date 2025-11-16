# Hướng dẫn sửa lỗi Kick Player

## Vấn đề
Khi host kick player, host thấy thông báo thành công nhưng player vẫn ở trong phòng.

## Nguyên nhân
WebSocket URL chưa được cấu hình trong WordPress, nên request kick không gửi được đến WebSocket server.

## Cách sửa

### Cách 1: Sử dụng Script Setup (Khuyến nghị)

1. Mở trình duyệt và truy cập:
   ```
   http://your-domain.com/wp-content/plugins/dnd-live-quiz/setup-websocket.php
   ```

2. Trang sẽ hiển thị:
   - Trạng thái WebSocket URL hiện tại
   - Form để update URL
   - URL mặc định là: `ws://localhost:3033`

3. Click nút **"Update WebSocket URL"**

4. Kiểm tra xem có thông báo "✓ WebSocket URL updated successfully!"

5. **XÓA FILE SAU KHI SỬ DỤNG** (bảo mật):
   ```bash
   rm /home/wordpress-da/html/wp-content/plugins/dnd-live-quiz/setup-websocket.php
   ```

### Cách 2: Qua WordPress Admin

1. Vào **WordPress Admin** → **Settings** → **Live Quiz Settings**

2. Tìm mục **"WebSocket Configuration"** hoặc **"Phase 2 Settings"**

3. Nhập WebSocket URL:
   ```
   ws://localhost:3033
   ```

4. Click **"Save Changes"**

### Cách 3: Sử dụng PHP script (nếu có quyền SSH)

1. Chạy lệnh:
   ```bash
   php -r "define('WP_USE_THEMES', false); require('/home/wordpress-da/html/wp-load.php'); update_option('live_quiz_websocket_url', 'ws://localhost:3033'); echo 'Done\n';"
   ```

## Kiểm tra sau khi sửa

### 1. Kiểm tra WebSocket URL đã được set
```bash
php -r "define('WP_USE_THEMES', false); require('/home/wordpress-da/html/wp-load.php'); echo get_option('live_quiz_websocket_url');"
```

Kết quả mong đợi: `ws://localhost:3033`

### 2. Kiểm tra WebSocket server đang chạy
```bash
pm2 list
```

Phải thấy `dnd-quiz-ws` với status **online**

### 3. Test kick player

1. **Host** tạo phòng mới
2. **Player** join phòng
3. **Host** click nút kick (✕) bên cạnh tên player
4. **Kiểm tra logs** trong browser console:
   - Host sẽ thấy: `[LiveQuiz] WebSocket kick SUCCESS`
   - Player sẽ thấy: `[PLAYER] === KICKED BY HOST ===`

5. **Kiểm tra server logs**:
   ```bash
   pm2 logs dnd-quiz-ws --lines 50
   ```
   
   Sẽ thấy:
   ```
   === KICK PLAYER REQUEST ===
   ✓ Sent kick event to player
   ✓ Player kicked successfully
   ```

## Debug nếu vẫn không hoạt động

### 1. Xem PHP error logs
```bash
tail -f /home/wordpress-da/html/wp-content/debug.log
```

Hoặc trong WordPress, enable debug:
```php
// wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

### 2. Kiểm tra WebSocket connection
Trong browser console (F12), khi vào trang host hoặc player:
```javascript
// Kiểm tra có connect WebSocket không
console.log(liveQuizPlayer.wsUrl); // Should show: ws://localhost:3033
```

### 3. Test WebSocket API trực tiếp
```bash
curl -X POST http://localhost:3033/api/sessions/123/kick-player \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user"}'
```

## Các file đã thêm/sửa

### Files đã sửa:
- `/includes/class-websocket-helper.php` - Thêm logging chi tiết
- `/includes/class-rest-api.php` - Thêm logging cho kick_player endpoint
- `/live-quiz.php` - Load WebSocket Helper class

### Files mới:
- `/setup-websocket.php` - Tool setup WebSocket URL (xóa sau khi dùng)
- `/KICK_FEATURE.md` - Tài liệu tính năng kick
- `/KICK_TROUBLESHOOTING.md` - File này

## Ghi chú

- WebSocket URL mặc định: `ws://localhost:3033`
- Có thể đổi port trong file `.env` của websocket-server
- Sau khi đổi port, restart WebSocket server: `pm2 restart dnd-quiz-ws`
- Đảm bảo firewall không block port 3033
