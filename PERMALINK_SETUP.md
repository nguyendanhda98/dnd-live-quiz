# Hướng dẫn cài đặt DND Live Quiz Permalinks

## Đã hoàn thành

✅ **Thêm phần settings "DND Live Quiz Permalinks" trong Settings > Permalinks**

Giống như các plugin khác (LearnDash, WooCommerce...), bạn sẽ thấy một section mới để cấu hình URL base cho Live Quiz.

## Cách cài đặt

### Bước 1: Chạy script setup (chỉ làm 1 lần)

**Cách 1: Qua trình duyệt (Đơn giản nhất)**
```
https://yourdomain.com/wp-content/plugins/dnd-live-quiz/setup-permalinks.php
```

**Cách 2: Qua WordPress Admin**
1. Vào **Settings > Permalinks**
2. Kéo xuống phần **"DND Live Quiz Permalinks"**
3. Nhập base URL (mặc định là `play`)
4. Nhấn **Save Changes**

### Bước 2: Kiểm tra cài đặt

1. Vào **WordPress Admin > Settings > Permalinks**
2. Kéo xuống, bạn sẽ thấy section:

```
┌─────────────────────────────────────────┐
│ DND Live Quiz Permalinks                │
├─────────────────────────────────────────┤
│ Cài đặt cấu trúc URL cho Live Quiz.     │
│                                          │
│ Host Room Base                          │
│ [play                ]                  │
│ URL để host truy cập phòng.             │
│ Mặc định: https://domain.com/play/123   │
│ Ví dụ: nếu bạn nhập "room",             │
│ URL sẽ là /room/123                     │
└─────────────────────────────────────────┘
```

### Bước 3: Tùy chỉnh (Optional)

Bạn có thể thay đổi base từ `play` sang bất kỳ giá trị nào:

- `room` → `/room/123`
- `host` → `/host/123`
- `quiz-host` → `/quiz-host/123`
- `live` → `/live/123`

**Lưu ý**: Sau khi thay đổi, nhấn **Save Changes** để WordPress tự động flush rewrite rules.

## Kiểm tra hoạt động

1. **Tạo phòng mới**:
   - Vào trang có shortcode `[live_quiz_create_room]`
   - Chọn quiz và tạo phòng
   - Sẽ tự động redirect đến `/{base}/{session_id}`

2. **Truy cập trực tiếp**:
   - Nếu base là `play`: `https://yourdomain.com/play/123`
   - Nếu base là `room`: `https://yourdomain.com/room/123`

3. **Kiểm tra quyền**:
   - ✅ Host (người tạo) và Admin: Truy cập được
   - ❌ User khác: Hiển thị lỗi "Bạn không có quyền truy cập"

## File đã thay đổi

### `includes/class-post-types.php`
- ✅ Thêm `add_permalink_settings()` - Đăng ký settings trong Permalinks page
- ✅ Thêm `permalink_settings_section()` - Section header
- ✅ Thêm `play_base_field()` - Input field
- ✅ Thêm `sanitize_play_base()` - Validate input
- ✅ Thêm `get_play_base()` - Lấy giá trị base
- ✅ Thêm `flush_rewrite_rules_on_change()` - Auto flush khi thay đổi
- ✅ Cập nhật `add_rewrite_rules()` - Sử dụng base động

### `includes/class-rest-api.php`
- ✅ Cập nhật `create_session()` - Sử dụng base động cho host_url

## Troubleshooting

### Vẫn bị 404 sau khi save
```bash
# Thử flush rewrite lần nữa qua URL:
https://yourdomain.com/wp-content/plugins/dnd-live-quiz/setup-permalinks.php
```

### Không thấy section "DND Live Quiz Permalinks"
- Kiểm tra plugin đã activate chưa
- Clear cache (nếu dùng cache plugin)
- Refresh trang Settings > Permalinks

### URL không đúng format
- Kiểm tra option: `wp option get live_quiz_play_base`
- Nếu bị lỗi, reset: `wp option delete live_quiz_play_base`
- Chạy lại setup script

## Ưu điểm của cách này

✅ **Chuẩn WordPress**: Giống các plugin lớn như WooCommerce, LearnDash
✅ **Dễ tùy chỉnh**: Admin có thể thay đổi base URL qua Settings
✅ **Auto flush**: Tự động flush rewrite rules khi thay đổi
✅ **Validation**: Tự động sanitize và validate input
✅ **User-friendly**: Có mô tả, ví dụ rõ ràng

## Screenshots của Settings

Sau khi setup, bạn sẽ thấy trong **Settings > Permalinks**:

```
Product permalinks (WooCommerce)
LearnDash Permalinks
DND Live Quiz Permalinks  ← MỚI THÊM
  ├─ Host Room Base: [play]
  └─ Description & Examples
```

---

**Tạo phòng ngay**: Vào trang có `[live_quiz_create_room]` để test!
