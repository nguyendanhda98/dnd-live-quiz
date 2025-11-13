# Gutenberg Blocks cho Live Quiz

## 📌 Tổng quan

Plugin Live Quiz hiện đã hỗ trợ đầy đủ Gutenberg Blocks để thay thế các shortcodes cũ. Blocks cung cấp trải nghiệm biên tập tốt hơn với giao diện trực quan và nhiều tùy chọn tùy chỉnh.

## 🎯 Danh sách Blocks

### 1. Live Quiz - Tạo phòng
**Mô tả:** Block dành cho giáo viên để tạo phòng quiz mới.

**Tên block:** `live-quiz/create-room`

**Thay thế shortcode:** `[live_quiz_create_room]`

**Cài đặt:**
- **Text nút:** Tùy chỉnh text hiển thị trên nút tạo phòng
- **Căn chỉnh:** Chọn căn trái, giữa, hoặc phải

**Cách sử dụng:**
1. Trong trình soạn thảo Gutenberg, nhấn nút "+" để thêm block
2. Tìm kiếm "Live Quiz - Tạo phòng"
3. Chọn block và tùy chỉnh cài đặt ở thanh bên phải
4. Publish/Update trang

**Lưu ý:** Chỉ người dùng có quyền `edit_posts` mới có thể xem và sử dụng block này.

---

### 2. Live Quiz - Tham gia
**Mô tả:** Block dành cho học viên để tham gia phòng quiz bằng PIN code.

**Tên block:** `live-quiz/join-room`

**Thay thế shortcode:** `[live_quiz]`

**Cài đặt:**
- **Hiển thị tiêu đề:** Bật/tắt tiêu đề phía trên form
- **Tiêu đề:** Tùy chỉnh nội dung tiêu đề (mặc định: "Tham gia Live Quiz")

**Cách sử dụng:**
1. Trong trình soạn thảo Gutenberg, nhấn nút "+" để thêm block
2. Tìm kiếm "Live Quiz - Tham gia"
3. Chọn block và tùy chỉnh cài đặt ở thanh bên phải
4. Publish/Update trang

**Giao diện bao gồm:**
- Form nhập tên hiển thị
- Form nhập PIN code (6 số)
- Nút "Tham gia"

---

### 3. Live Quiz - Danh sách
**Mô tả:** Block hiển thị danh sách các quiz có sẵn với phân trang.

**Tên block:** `live-quiz/quiz-list`

**Thay thế shortcode:** `[live_quiz_list per_page="10"]`

**Cài đặt:**
- **Hiển thị tiêu đề:** Bật/tắt tiêu đề phía trên danh sách
- **Tiêu đề:** Tùy chỉnh nội dung tiêu đề (mặc định: "Danh sách Quiz")
- **Số quiz mỗi trang:** Số lượng quiz hiển thị trên mỗi trang (1-50)
- **Sắp xếp theo:** 
  - Ngày tạo
  - Tiêu đề
  - Ngẫu nhiên
- **Thứ tự:** Tăng dần hoặc giảm dần

**Cách sử dụng:**
1. Trong trình soạn thảo Gutenberg, nhấn nút "+" để thêm block
2. Tìm kiếm "Live Quiz - Danh sách"
3. Chọn block và tùy chỉnh cài đặt ở thanh bên phải
4. Publish/Update trang

**Hiển thị:**
- Danh sách các quiz với thông tin: tiêu đề, mô tả, số câu hỏi, thời gian, số học viên
- Phân trang tự động

---

## 🔄 Migration từ Shortcodes sang Blocks

### Tại sao nên chuyển sang Blocks?

1. **Trải nghiệm biên tập tốt hơn:** Xem trước trực quan trong editor
2. **Nhiều tùy chọn hơn:** Cài đặt linh hoạt qua UI thay vì parameters
3. **Dễ sử dụng:** Không cần nhớ cú pháp shortcode
4. **Hiện đại:** Tương thích tốt với WordPress mới
5. **Bảo trì tốt hơn:** Blocks được WordPress khuyến nghị

### Bảng đối chiếu

| Shortcode cũ | Gutenberg Block mới |
|-------------|-------------------|
| `[live_quiz_create_room]` | Live Quiz - Tạo phòng |
| `[live_quiz]` | Live Quiz - Tham gia |
| `[live_quiz_list per_page="10"]` | Live Quiz - Danh sách |

### Hướng dẫn chuyển đổi

#### Bước 1: Tìm các trang/bài viết sử dụng shortcodes
Sử dụng tính năng tìm kiếm trong WordPress admin:
- Tìm kiếm `[live_quiz_create_room]`
- Tìm kiếm `[live_quiz]`
- Tìm kiếm `[live_quiz_list]`

#### Bước 2: Mở trang trong Gutenberg Editor
Mở mỗi trang/bài viết cần chuyển đổi

#### Bước 3: Xóa shortcode cũ và thêm block mới
1. Xóa shortcode cũ
2. Nhấn "+" để thêm block
3. Tìm block Live Quiz tương ứng
4. Cấu hình theo nhu cầu

#### Bước 4: Lưu và kiểm tra
Publish/Update và kiểm tra frontend

---

## ⚠️ Deprecation Notices

Các shortcodes cũ vẫn hoạt động để đảm bảo tương thích ngược (backward compatibility), nhưng sẽ hiển thị thông báo cảnh báo cho admin users:

> ⚠️ **Thông báo:** Shortcode `[live_quiz]` đang lỗi thời. Vui lòng sử dụng Gutenberg Block **"Live Quiz - Tham gia"** thay thế.

**Lưu ý:** Chỉ admin (users có quyền `manage_options`) mới thấy thông báo này. Người dùng thông thường không bị ảnh hưởng.

---

## 🛠️ Developer Guide

### Đăng ký Block mới

Blocks được đăng ký trong file `includes/class-blocks.php`:

```php
register_block_type('live-quiz/ten-block', array(
    'render_callback' => array(__CLASS__, 'render_ten_block'),
    'attributes' => array(
        'attribute1' => array(
            'type' => 'string',
            'default' => 'giá trị mặc định'
        )
    )
));
```

### Tạo Block UI trong JavaScript

Block UI được định nghĩa trong `assets/js/blocks.js`:

```javascript
registerBlockType('live-quiz/ten-block', {
    title: __('Tiêu đề Block', 'live-quiz'),
    description: __('Mô tả block', 'live-quiz'),
    icon: 'icon-name',
    category: 'widgets',
    attributes: {
        // định nghĩa attributes
    },
    edit: function(props) {
        // UI trong editor
    },
    save: function() {
        return null; // Server-side rendering
    }
});
```

### Server-side Rendering

Tất cả blocks sử dụng server-side rendering, được xử lý trong các phương thức `render_*_block()` của class `Live_Quiz_Blocks`.

---

## 📝 Changelog

### Version 1.0.0
- ✅ Thêm block "Live Quiz - Tạo phòng"
- ✅ Thêm block "Live Quiz - Tham gia"
- ✅ Thêm block "Live Quiz - Danh sách"
- ✅ Thêm deprecation notices cho shortcodes
- ✅ Đảm bảo backward compatibility

---

## 🔗 Tài liệu liên quan

- [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Hướng dẫn cài đặt plugin
- [PERMALINK_SETUP.md](PERMALINK_SETUP.md) - Cấu hình permalink
- [WordPress Block Editor Handbook](https://developer.wordpress.org/block-editor/)

---

## 💡 Tips & Best Practices

1. **Luôn sử dụng Blocks cho nội dung mới** thay vì shortcodes
2. **Di chuyển dần** các trang cũ sang blocks khi có thời gian
3. **Test kỹ** sau khi chuyển đổi để đảm bảo hiển thị đúng
4. **Backup trước khi thay đổi** nhiều trang cùng lúc
5. **Sử dụng Preview** trong editor để xem trước giao diện

---

## ❓ FAQ

**Q: Shortcodes cũ có còn hoạt động không?**  
A: Có, shortcodes vẫn hoạt động bình thường để đảm bảo tương thích ngược.

**Q: Tôi có bắt buộc phải chuyển sang Blocks không?**  
A: Không bắt buộc ngay lập tức, nhưng nên chuyển dần để hưởng lợi từ các tính năng mới.

**Q: Blocks có tương thích với Classic Editor không?**  
A: Blocks hoạt động tốt nhất với Gutenberg Editor. Nếu sử dụng Classic Editor, nên tiếp tục dùng shortcodes.

**Q: Làm sao để tìm tất cả trang sử dụng shortcodes?**  
A: Sử dụng plugin "Better Search Replace" hoặc tìm kiếm trong WordPress admin dashboard.

**Q: Có công cụ tự động chuyển đổi không?**  
A: Hiện tại chưa có, cần chuyển đổi thủ công. Điều này giúp kiểm soát tốt hơn quá trình migration.
