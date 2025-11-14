# Cập nhật Shortcode [live_quiz_host]

## Tính năng mới

Khi sử dụng `[live_quiz_host]` (không có tham số), người dùng sẽ được hiển thị giao diện setup phòng với các tính năng sau:

### 1. Chọn bộ câu hỏi
- **Tìm kiếm**: Nhập từ khóa để tìm bộ câu hỏi (tối thiểu 2 ký tự)
- **Chọn nhiều**: Có thể chọn nhiều bộ câu hỏi cùng lúc
- **Hiển thị đã chọn**: Các bộ đã chọn hiển thị dưới dạng chips với số câu hỏi
- **Bỏ chọn**: Click nút X trên chip để bỏ chọn

### 2. Loại kiểm tra
Có 2 chế độ:

#### 📚 Toàn bộ câu hỏi
- Sử dụng tất cả câu hỏi từ các bộ đã chọn
- Các câu hỏi được ghép (merge) theo thứ tự

#### 🎲 Chọn ngẫu nhiên
- Chọn số lượng câu hỏi cụ thể
- Hệ thống sẽ random từ tất cả câu hỏi có sẵn
- Hiển thị tổng số câu có sẵn để người dùng biết

### 3. Tên phòng (tùy chọn)
- Người dùng có thể đặt tên tùy chỉnh cho phòng
- Nếu không điền, hệ thống tự động tạo tên từ quiz đã chọn + timestamp

### 4. Phòng đang hoạt động
- Nếu người dùng có phòng đang mở (chưa kết thúc), hiển thị ở đầu trang
- Thông tin hiển thị:
  - Tên quiz
  - Mã PIN
  - Trạng thái (Đang chờ, Đang chơi, v.v.)
  - Số người chơi
- Nút "Mở lại phòng" để quay lại phòng đã tạo

## Cách sử dụng

### Tạo trang Host đơn giản
1. Tạo trang mới trong WordPress
2. Thêm shortcode: `[live_quiz_host]`
3. Publish trang

### Mở lại phòng cụ thể
Nếu biết session_id, có thể sử dụng:
```
[live_quiz_host session_id="123"]
```

## Quy trình làm việc

```
1. Giáo viên truy cập trang có shortcode [live_quiz_host]
   ↓
2. Xem danh sách phòng đang hoạt động (nếu có)
   ├─→ Có phòng → Click "Mở lại phòng" → Vào phòng ngay
   └─→ Không có phòng hoặc muốn tạo mới
       ↓
3. Tìm và chọn bộ câu hỏi
   ↓
4. Chọn loại kiểm tra (Toàn bộ / Random)
   ↓
5. (Tùy chọn) Đặt tên phòng
   ↓
6. Click "🚀 Tạo phòng"
   ↓
7. Hệ thống:
   - Merge câu hỏi từ các bộ đã chọn
   - Random nếu chọn chế độ random
   - Tạo quiz tạm thời (private) chứa câu hỏi đã merge
   - Tạo session mới
   - Generate PIN 6 số
   ↓
8. Chuyển sang giao diện host với mã PIN
   ↓
9. Học viên nhập PIN để tham gia
   ↓
10. Host bắt đầu quiz
```

## API Endpoints mới

### 1. Search Quizzes
```
GET /wp-json/live-quiz/v1/quizzes/search?s=keyword
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "title": "Unit 1 - Grammar",
      "question_count": 15
    }
  ]
}
```

### 2. Create Session Frontend
```
POST /wp-json/live-quiz/v1/sessions/create-frontend
```
**Body:**
```json
{
  "quiz_ids": [123, 456],
  "quiz_type": "random",
  "question_count": 20,
  "session_name": "Test Unit 1-2"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": 789,
    "room_code": "123456",
    "question_count": 20
  }
}
```

## Files thay đổi

### Mới tạo:
- `templates/host-setup.php` - Template giao diện setup
- `assets/js/host-setup.js` - JavaScript xử lý frontend
- `assets/css/host-setup.css` - Styles cho giao diện setup

### Đã sửa:
- `live-quiz.php`:
  - Sửa `shortcode_host()` để hiển thị setup form khi không có session_id
  - Thêm enqueue cho CSS và JS mới
  
- `includes/class-rest-api.php`:
  - Thêm endpoint `create_session_frontend()`
  - Sửa `search_quizzes()` để trả về đúng format

## Quyền truy cập

- **Yêu cầu**: User phải có capability `edit_posts` (giáo viên trở lên)
- **Kiểm tra**: Tự động check qua `check_teacher_permission_with_cookie()`
- **Cookie auth**: Hỗ trợ REST API authentication qua WordPress cookies

## Responsive

- ✅ Mobile friendly
- ✅ Tablet optimized
- ✅ Desktop enhanced

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Lưu ý kỹ thuật

1. **Merge Questions**: 
   - Khi chọn nhiều quiz, hệ thống tạo một quiz tạm thời (post_status = 'private')
   - Quiz này chứa tất cả câu hỏi đã merge/random
   - Session sẽ tham chiếu đến quiz tạm này

2. **Session Cleanup**:
   - Quiz tạm thời có thể cần cleanup định kỳ
   - Xem xét thêm cron job để xóa quiz tạm cũ

3. **Caching**:
   - Session cache được clear sau khi tạo
   - Search results không cache (real-time)

4. **Security**:
   - Tất cả API đều check permission
   - Nonce verification cho REST API
   - Quiz IDs được validate trước khi merge
