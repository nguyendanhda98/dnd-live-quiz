# Debug: Nút "Kết thúc phiên" không hoạt động

## Các thay đổi đã thực hiện:

1. ✅ Thêm helper function `getApiConfig()` để lấy API config an toàn
2. ✅ Cập nhật tất cả AJAX calls để sử dụng helper thay vì truy cập trực tiếp
3. ✅ Thêm cache busting (timestamp) cho host.js và host-setup.js
4. ✅ Thêm logging chi tiết cho debug
5. ✅ Cải thiện error handling và messages

## Cách kiểm tra:

### Bước 1: Hard refresh browser
- Chrome/Edge: `Ctrl + Shift + R` (Windows) hoặc `Cmd + Shift + R` (Mac)
- Firefox: `Ctrl + F5`

### Bước 2: Xóa cache browser
- Chrome: Settings → Privacy → Clear browsing data → Cached images and files
- Firefox: Settings → Privacy → Clear Data → Cached Web Content

### Bước 3: Mở Console (F12)
Khi bạn vào trang host, bạn sẽ thấy:
```
[HOST] ==========================================
[HOST] Document ready - Initializing HostController
[HOST] ==========================================
[HOST] liveQuizHostData exists: true
[HOST] live-quiz-host element exists: 1
[HOST] Initializing HostController...
[HOST] Checking end session button on init...
[HOST] #end-session-btn exists: 1
```

### Bước 4: Click nút "Kết thúc phiên"
Bạn sẽ thấy logs:
```
[HOST] ===========================================
[HOST] End session button CLICK EVENT TRIGGERED
[HOST] ===========================================
[HOST] ==========================================
[HOST] END SESSION BUTTON CLICKED
[HOST] ==========================================
[HOST] Getting API config...
[HOST] API Config: {apiUrl: "...", hasNonce: true, sessionId: "..."}
```

### Bước 5: Nếu gặp lỗi
Check console để xem lỗi cụ thể:
- Status 0: Không kết nối được server
- Status 403: Không có quyền (cần login lại)
- Status 404: Phòng không tồn tại
- Other: Xem message cụ thể

## Nếu vẫn không hoạt động:

### Test 1: Kiểm tra button có tồn tại không
Mở Console và gõ:
```javascript
$('#end-session-btn').length
```
Kết quả phải là `1`

### Test 2: Kiểm tra API config
```javascript
window.liveQuizPlayer
```
Phải trả về object với `apiUrl` và `nonce`

### Test 3: Test trực tiếp API
```javascript
$.ajax({
    url: window.liveQuizPlayer.apiUrl + '/sessions/YOUR_SESSION_ID/end',
    method: 'POST',
    headers: { 'X-WP-Nonce': window.liveQuizPlayer.nonce }
}).done(r => console.log('Success:', r)).fail(e => console.log('Error:', e));
```

### Test 4: Bind event thủ công
```javascript
$('#end-session-btn').off('click').on('click', function() {
    alert('Button clicked!');
});
```
Nếu alert hiện ra → Event binding OK
Nếu không → Button không tồn tại hoặc ID sai

## Nguyên nhân có thể:

1. ❌ Browser cache chưa clear
2. ❌ JavaScript version cũ được load
3. ❌ Button không có ID đúng (`end-session-btn`)
4. ❌ HostController không được init
5. ❌ API config không được load
6. ❌ WebSocket URL sai hoặc server không chạy
7. ❌ Session không tồn tại trong DB

## Liên hệ support:
Gửi kèm:
1. Screenshot console logs
2. Session ID
3. Browser và version
