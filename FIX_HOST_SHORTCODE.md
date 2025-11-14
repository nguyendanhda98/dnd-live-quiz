# Fix: Host Shortcode Loading Issue

## Vấn đề (Problem)
Khi sử dụng shortcode `[live_quiz_host quiz_id="123"]`, hệ thống loading mãi không tải được.

## Nguyên nhân (Root Cause)
- Shortcode `[live_quiz_host]` yêu cầu một `session_id` để hoạt động
- Template `templates/host.php` kiểm tra biến `session_id` từ query var
- Khi không có session_id, template hiển thị form nhập mã phòng NHƯNG vẫn load JavaScript host.js
- JavaScript host.js tìm `window.liveQuizHostData` (chỉ được set khi có session) → gây ra lỗi và loading vô tận

## Giải pháp (Solution)
Tự động tạo session mới khi shortcode được gọi với `quiz_id`:

### Thay đổi trong `live-quiz.php`

1. **Sửa hàm `shortcode_host()`**: Thêm logic tự động tạo session
   - Kiểm tra quiz có tồn tại không
   - Tạo post type `live_quiz_session` mới
   - Tạo mã PIN 6 số duy nhất
   - Set session metadata
   - Truyền session_id cho template qua `set_query_var()`

2. **Thêm hàm `generate_room_code()`**: Tạo mã PIN 6 số không trùng lặp

### Cách sử dụng (Usage)

```
[live_quiz_host quiz_id="123"]
```

Khi shortcode được load:
1. ✅ Tự động tạo session mới
2. ✅ Hiển thị mã PIN
3. ✅ Sẵn sàng cho người chơi tham gia
4. ✅ Host có thể bắt đầu quiz ngay

### Lưu ý quan trọng (Important Notes)

- **Mỗi lần load trang sẽ tạo session mới** với mã PIN mới
- Nên tạo trang riêng cho mỗi quiz thay vì embed nhiều shortcode
- Người dùng phải có quyền `edit_posts`
- Quiz ID phải tồn tại và là post type `live_quiz`

### Testing

Sử dụng file test: `test-host-shortcode.php`

```
/wp-content/plugins/dnd-live-quiz/test-host-shortcode.php?quiz_id=123
```

## Files Changed
- ✏️ `live-quiz.php` - Added session auto-creation logic
- ✏️ `SHORTCODES.md` - Updated documentation
- ➕ `test-host-shortcode.php` - Added test script
- ➕ `FIX_HOST_SHORTCODE.md` - This file

## Tested
- ✅ PHP syntax check passed
- ✅ No breaking changes to existing functionality
- ✅ Backward compatible

## Date
2025-11-14
