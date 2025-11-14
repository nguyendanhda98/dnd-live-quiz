# Migration Guide: Xóa bỏ Routes /host và /play

## 🎯 Thay đổi

Plugin đã xóa bỏ các routes tự động `/host` và `/play`. Bạn giờ đây có toàn quyền tạo các trang này theo ý muốn.

## ✅ Các bước thực hiện

### 1. Flush Permalinks

**Quan trọng:** Vào **Settings > Permalinks** trong WordPress Admin và nhấn **"Save Changes"** để làm mới rewrite rules.

### 2. Tạo trang Player (cho học sinh)

1. Vào **Pages > Add New**
2. Đặt tên trang: "Tham gia Quiz" (hoặc tùy ý)
3. Chọn slug: `player`, `join`, hoặc bất kỳ slug nào bạn muốn
4. Thêm shortcode vào nội dung:
   ```
   [live_quiz_player]
   ```
5. **Publish**

Trang của bạn sẽ có URL: `https://yourdomain.com/player/` (hoặc slug bạn chọn)

### 3. Tạo trang Host (cho giáo viên)

1. Vào **Pages > Add New**
2. Đặt tên trang: "Quản lý Quiz" (hoặc tùy ý)
3. Chọn slug: `host`, `manage`, hoặc bất kỳ slug nào bạn muốn
4. Thêm shortcode vào nội dung:
   ```
   [live_quiz_host]
   ```
5. (Tùy chọn) Thêm danh sách sessions:
   ```
   [live_quiz_sessions per_page="15"]
   ```
6. **Publish**

Trang của bạn sẽ có URL: `https://yourdomain.com/host/` (hoặc slug bạn chọn)

### 4. Cập nhật Links

Nếu bạn có các links cũ trỏ đến `/host` hoặc `/play`, hãy cập nhật chúng để trỏ đến các trang mới.

## 🎨 Lợi ích

### Trước đây:
- ❌ Routes cố định `/host` và `/play`
- ❌ Không thể tùy chỉnh slug
- ❌ Không thể thêm nội dung khác vào trang
- ❌ Khó tích hợp với theme

### Bây giờ:
- ✅ Tự do chọn bất kỳ slug nào
- ✅ Tùy chỉnh layout và design theo theme
- ✅ Thêm nội dung, sidebar, header/footer tùy ý
- ✅ Dễ dàng tích hợp với page builders (Elementor, Divi, etc.)
- ✅ Có thể tạo nhiều trang với cùng shortcode
- ✅ Quản lý qua WordPress Pages như trang bình thường

## 📝 Ví dụ

### Trang Player đơn giản

```
[live_quiz_player title="Join the Game!" show_title="yes"]
```

### Trang Host với nhiều nội dung

```
<h1>Quiz Management Dashboard</h1>

<p>Welcome to the quiz hosting center. Create and manage your quiz sessions below.</p>

[live_quiz_host]

<hr>

<h2>Recent Sessions</h2>
[live_quiz_sessions per_page="10"]
```

### Trang Player với instructions

```
<div class="quiz-instructions">
  <h2>How to Join</h2>
  <ol>
    <li>Enter your name</li>
    <li>Enter the 6-digit PIN code from your teacher</li>
    <li>Click "Join"</li>
  </ol>
</div>

[live_quiz_player]
```

## 🔧 Technical Notes

- Shortcodes tự động load CSS/JS cần thiết
- Scripts chỉ load khi shortcode được sử dụng trên trang
- Template từ theme sẽ được áp dụng
- Tương thích với mọi page builder
- Có thể dùng PHP để render shortcode: `<?php echo do_shortcode('[live_quiz_player]'); ?>`

## ❓ FAQ

**Q: Tôi có thể tạo nhiều trang player không?**  
A: Có, bạn có thể tạo bao nhiêu trang tùy thích với shortcode `[live_quiz_player]`.

**Q: Tôi có thể đặt trang player làm homepage không?**  
A: Có, vào Settings > Reading và chọn trang player làm homepage.

**Q: Làm sao để ẩn sidebar trên trang quiz?**  
A: Chọn template "Full Width" hoặc "No Sidebar" khi tạo/sửa trang.

**Q: Routes cũ `/host` và `/play` có còn hoạt động không?**  
A: Không, chúng đã bị xóa hoàn toàn. Bạn cần tạo trang mới như hướng dẫn trên.

## 📚 Xem thêm

- [SHORTCODES.md](SHORTCODES.md) - Chi tiết về tất cả shortcodes
- WordPress Codex: [Pages](https://wordpress.org/support/article/pages/)
- WordPress Codex: [Shortcodes](https://wordpress.org/support/article/shortcode/)
