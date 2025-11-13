# Live Quiz - Host Room Feature

## Cập nhật mới

### Tính năng
1. **PIN Code 6 số**: Thay vì room code gồm chữ và số, giờ đây sử dụng PIN 6 số (từ 100000 đến 999999)
2. **URL phòng host**: `/play/{session_id}` - chỉ người tạo phòng và admin mới truy cập được
3. **Giao diện host mới**: 
   - Hiển thị PIN code lớn, dễ nhìn
   - Danh sách người chơi real-time
   - Waiting for players...
   - Nút Start để bắt đầu quiz
4. **Phân quyền rõ ràng**:
   - Host: Truy cập `/play/{session_id}` để quản lý phòng
   - Players: Join bằng PIN code qua trang player

## Cài đặt

### 1. Flush Rewrite Rules
Chạy một lần duy nhất sau khi cập nhật code:

```bash
# Cách 1: Qua trình duyệt (yêu cầu đăng nhập admin)
http://yourdomain.com/wp-content/plugins/dnd-live-quiz/flush-rewrite.php

# Cách 2: Qua wp-cli
wp rewrite flush

# Cách 3: Qua WordPress Admin
# Vào Settings > Permalinks và nhấn "Save Changes"
```

### 2. Kiểm tra hoạt động

1. **Tạo phòng**:
   - Truy cập trang có shortcode `[live_quiz_create_room]`
   - Chọn quiz và tạo phòng
   - Sẽ tự động redirect đến `/play/{session_id}`

2. **Giao diện Host** (`/play/{session_id}`):
   - Hiển thị PIN code 6 số
   - Waiting for players...
   - Danh sách người chơi sẽ cập nhật real-time
   - Nút "Bắt đầu Quiz" (disabled cho đến khi có người chơi)

3. **Join phòng** (Players):
   - Truy cập trang có shortcode `[live_quiz]`
   - Nhập tên và PIN code 6 số
   - Join vào phòng

## File đã thay đổi

### Core Files
- `includes/class-post-types.php` - Thêm rewrite rules và routing
- `includes/class-rest-api.php` - Cập nhật endpoint và generate PIN 6 số
- `includes/class-admin.php` - Generate PIN 6 số
- `includes/class-security.php` - Validate PIN 6 số
- `live-quiz.php` - Load host assets

### Template Files
- `templates/host.php` - Template mới cho host
- `templates/player.php` - Cập nhật input PIN

### Assets
- `assets/css/host.css` - Styles cho giao diện host
- `assets/js/host.js` - Logic cho host (WebSocket + REST API)
- `assets/js/frontend.js` - Redirect to host URL sau khi tạo phòng

## API Endpoints mới

### For Host
- `GET /wp-json/live-quiz/v1/sessions/{id}/players` - Lấy danh sách người chơi
- `GET /wp-json/live-quiz/v1/sessions/{id}/question-stats` - Thống kê câu hỏi
- `POST /wp-json/live-quiz/v1/sessions/{id}/end-question` - Kết thúc câu hỏi hiện tại

## URL Structure

```
/play/{session_id}  -> Host Room (requires authentication)
/player/            -> Player Join Page (public, requires PIN)
```

## Security

1. **Host URL Protection**:
   - Chỉ người tạo phòng (author) hoặc admin mới truy cập được `/play/{session_id}`
   - Nếu không có quyền, hiển thị thông báo lỗi

2. **PIN Code**:
   - Chỉ chấp nhận 6 số
   - Unique cho mỗi session
   - Players sử dụng PIN để join

## Troubleshooting

### 404 Error trên /play/{session_id}
```bash
# Flush rewrite rules lại
wp rewrite flush
```

### PIN code không hợp lệ
- Kiểm tra database: `_session_room_code` meta
- Phải là 6 số (100000-999999)

### Không redirect đến host page
- Kiểm tra response từ API: `create_session` phải trả về `host_url`
- Check console browser để xem lỗi JavaScript

## Notes

- PIN code được tạo tự động khi tạo session
- Host URL có dạng: `https://yourdomain.com/play/123`
- Player join bằng PIN trên trang có shortcode `[live_quiz]`
- WebSocket hỗ trợ real-time updates (nếu được cấu hình)
