# Testing Single Session Enforcement

## Điều kiện tiên quyết

1. ✅ WebSocket server đang chạy (`npm start`)
2. ✅ WordPress Live Quiz plugin được kích hoạt
3. ✅ WebSocket URL được cấu hình trong Settings
4. ✅ User đã đăng nhập

## Test Case 1: Kick tab cũ khi mở tab mới

### Các bước:

1. **Mở Tab A:**
   - Login vào WordPress
   - Truy cập `/play` hoặc trang có shortcode `[live_quiz_player]`
   - Nhập room code và join phòng
   - Xác nhận đã join thành công (thấy màn hình waiting)

2. **Mở Tab B (cùng browser):**
   - Duplicate tab hoặc mở tab mới
   - Truy cập cùng URL `/play`
   - Nhập cùng room code và join
   
3. **Kết quả mong đợi:**
   - Tab B join thành công
   - Tab A hiện alert: "Bạn đã tham gia phòng này từ tab/thiết bị khác..."
   - Tab A tự động redirect về trang chủ
   - Chỉ Tab B còn active trong phòng

## Test Case 2: Kick thiết bị cũ khi join từ thiết bị mới

### Các bước:

1. **Trên Computer:**
   - Login với user A
   - Join phòng X
   - Để mở màn hình waiting

2. **Trên Phone (hoặc browser khác):**
   - Login với cùng user A
   - Join phòng X

3. **Kết quả mong đợi:**
   - Phone join thành công
   - Computer hiện alert và redirect
   - Chỉ Phone còn active trong phòng

## Test Case 3: Session persistence sau khi bị kick

### Các bước:

1. Join phòng ở Tab A
2. Mở Tab B và join cùng phòng → Tab A bị kick
3. Tab B đóng browser
4. Mở browser lại và vào `/play`

**Kết quả mong đợi:**
- Tab B mới tự động restore session và vào lại phòng
- Không cần nhập room code lại

## Test Case 4: Multiple users không bị ảnh hưởng

### Các bước:

1. User A join phòng ở Tab A
2. User B join cùng phòng ở Tab B
3. User A mở Tab A2 và join

**Kết quả mong đợi:**
- User A: Tab A bị kick, Tab A2 active
- User B: Tab B vẫn active, không bị ảnh hưởng
- Host thấy 2 players (User A và User B)

## Debugging

### Kiểm tra WebSocket Server

```bash
# Check server running
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","connections":1,"timestamp":"..."}
```

### Kiểm tra Browser Console

Tab A (sắp bị kick):
```
[Live Quiz] Session kicked: {message: "..."}
[Live Quiz] Error leaving session: (nếu có)
```

Tab B (tab mới):
```
[Live Quiz] User joining session: {...}
[Live Quiz] User joined session successfully
```

### Kiểm tra Server Logs

```bash
# PM2
pm2 logs live-quiz-ws

# Expected logs khi kick:
# [HTTP API] Emit event request: { event: 'session_kicked', connectionId: '...' }
# [HTTP API] Event 'session_kicked' sent to connection ...
```

### Kiểm tra WordPress Debug Log

```bash
tail -f /wp-content/debug.log

# Expected log khi join:
# [Live Quiz] User {ID} joined from new device. Kicking old connection: {old_id}
```

## Common Issues

### Issue: Tab A không bị kick

**Possible causes:**
- WebSocket server không chạy
- Connection ID không được gửi đúng
- PHP không reach được WebSocket server

**Debug:**
```bash
# Test WebSocket server
curl http://localhost:3033/health

# Test emit endpoint
curl -X POST http://localhost:3033/api/emit \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{"msg":"hello"},"connectionId":"test-123"}'
```

### Issue: Alert không hiện

**Check:**
- Browser console có lỗi không
- Event listener `session_kicked` có được add không
- WebSocket connection có active không

### Issue: Redirect về URL sai

**Fix:**
- Kiểm tra `config.homeUrl` trong player.js
- Cập nhật WordPress home URL setting
- Có thể hardcode URL trong `handleSessionKicked`

## Success Criteria

✅ Tab cũ bị kick ngay lập tức khi tab mới join
✅ Alert message hiển thị rõ ràng
✅ Redirect về trang chủ sau khi kick
✅ localStorage được clear
✅ Server-side session được update
✅ Multiple users không bị ảnh hưởng lẫn nhau
✅ Session có thể restore trên tab mới

## Performance

- ⏱️ Kick time: < 1 second
- 🔌 WebSocket emit: < 100ms
- 📡 HTTP API call: < 500ms
- 🔄 Redirect: Immediate after alert
