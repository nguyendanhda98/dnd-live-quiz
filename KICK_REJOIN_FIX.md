# Kick and Rejoin Prevention Fix

## Vấn đề
Khi host kick người chơi, người chơi bị thoát khỏi phòng nhưng khi F5 lại thì tự động vào lại phòng mà không cần nhập code.

## Nguyên nhân
- Thông tin session vẫn được lưu trong user meta (`_live_quiz_active_session`)
- Khi F5, `fetchUserActiveSession()` lấy được thông tin và tự động restore session

## Giải pháp đã implement

### 1. Server-side (class-rest-api.php)
✅ Thêm endpoint mới `/user/clear-session`:
```php
register_rest_route(self::NAMESPACE, '/user/clear-session', array(
    'methods' => 'POST',
    'callback' => array(__CLASS__, 'clear_user_active_session'),
    'permission_callback' => 'is_user_logged_in',
));

public static function clear_user_active_session($request) {
    $user_id = get_current_user_id();
    delete_user_meta($user_id, '_live_quiz_active_session');
    return rest_ensure_response(array('success' => true));
}
```

### 2. Client-side (player.js)

#### Khi bị kick bởi host (`handleKickedByHost`):
✅ Gọi API `/user/clear-session` để xóa user meta ngay lập tức
✅ Thay đổi button từ `location.reload()` sang redirect về trang chủ thực sự
✅ Thêm message cho user biết phải nhập lại code nếu muốn vào lại

```javascript
// Call server to ensure session is cleared
fetch(config.restUrl + '/user/clear-session', {
    method: 'POST',
    headers: {
        'X-WP-Nonce': config.nonce,
        'Content-Type': 'application/json'
    }
}).catch(err => console.error('[PLAYER] Failed to clear session:', err));

// Redirect to home page (not reload)
window.location.href = config.homeUrl || '/';
```

#### Khi session bị kết thúc (`handleSessionEndedKicked`):
✅ Gọi API `/user/clear-session` để xóa user meta
✅ Redirect về trang chủ thực sự (không phải `/play`)

### 3. Session Manager (class-session-manager.php)
✅ Đã có sẵn: `kick_player()` xóa user meta
✅ Đã có sẵn: Remove participant khỏi Redis
✅ Đã có sẵn: Broadcast kick event

## Flow hoàn chỉnh

### Khi host kick người chơi:

1. **Host** click kick button
2. **REST API** `/sessions/{id}/kick-player` được gọi
3. **Session Manager** `kick_player()`:
   - Xóa `_live_quiz_active_session` user meta
   - Xóa participant khỏi Redis
   - Broadcast event `player_kicked`
4. **WebSocket Helper** gửi event `kicked_from_session` cho người chơi
5. **Player client** nhận event `kicked_from_session`:
   - Disconnect socket và disable reconnection
   - Gọi API `/user/clear-session` (double-check xóa user meta)
   - Reset tất cả state (sessionId, userId, roomCode, etc.)
   - Hiển thị message "Đã bị kick"
   - Redirect về trang chủ khi click button
6. **Khi người chơi F5 hoặc quay lại**:
   - `fetchUserActiveSession()` không tìm thấy user meta
   - Return `has_session: false`
   - Hiển thị form nhập code
   - Phải nhập code mới vào được phòng

## Kiểm tra ban status

Code đã có sẵn kiểm tra ban trong `join_session()`:
```php
// CHECK BAN STATUS
// 1. Check if banned from this session
if (Live_Quiz_Session_Manager::is_banned_from_session($session_id, $current_user->ID)) {
    return new WP_Error('banned_from_session', __('Bạn đã bị ban khỏi phòng này', 'live-quiz'));
}

// 2. Check if permanently banned by host
$host_id = $session['host_id'];
if (Live_Quiz_Session_Manager::is_permanently_banned($host_id, $current_user->ID)) {
    return new WP_Error('permanently_banned', __('Bạn đã bị ban vĩnh viễn bởi host này', 'live-quiz'));
}
```

## Test Cases

### Test 1: Kick và F5
1. Người chơi join phòng thành công
2. Host kick người chơi
3. Người chơi thấy message "Đã bị kick"
4. Người chơi click "Về trang chủ" → redirect về home
5. Người chơi F5 hoặc navigate lại `/play/{code}`
6. **Kết quả mong đợi**: Hiển thị form nhập code, không tự động vào phòng

### Test 2: Kick và nhập lại code
1. Người chơi join phòng thành công
2. Host kick người chơi (không ban)
3. Người chơi về trang chủ
4. Người chơi nhập lại code phòng
5. **Kết quả mong đợi**: Vào được phòng bình thường (vì không bị ban)

### Test 3: Ban from session
1. Người chơi join phòng thành công
2. Host ban người chơi từ session này
3. Người chơi bị kick ra
4. Người chơi nhập lại code
5. **Kết quả mong đợi**: Không vào được, hiển thị "Bạn đã bị ban khỏi phòng này"

### Test 4: Permanent ban
1. Người chơi join phòng của host A
2. Host A ban vĩnh viễn người chơi
3. Người chơi bị kick ra
4. Người chơi thử join bất kỳ phòng nào của host A
5. **Kết quả mong đợi**: Không vào được, hiển thị "Bạn đã bị ban vĩnh viễn bởi host này"

## Changes Summary

### Files Modified:
1. **assets/js/player.js**
   - Updated `handleKickedByHost()`: Add API call to clear session, fix redirect
   - Updated `handleSessionEndedKicked()`: Add API call to clear session, fix redirect

2. **includes/class-rest-api.php**
   - Added route: `/user/clear-session` (POST)
   - Added method: `clear_user_active_session()`

### No changes needed:
- `class-session-manager.php` - Already clears user meta on kick
- `class-websocket-helper.php` - Already sends kick events
- Ban checking logic - Already implemented

## Kết luận

Sau khi implement các thay đổi này:
- ✅ Người chơi bị kick sẽ không thể tự động rejoin khi F5
- ✅ Phải nhập lại code để vào phòng
- ✅ Không còn thông tin session nào được lưu sau khi kick
- ✅ Redirect đúng về trang chủ, không phải reload trang hiện tại
- ✅ Ban checking vẫn hoạt động bình thường
