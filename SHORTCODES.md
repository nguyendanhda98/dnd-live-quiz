# Hướng dẫn sử dụng Shortcodes

Plugin DND Live Quiz cung cấp các shortcodes để hiển thị các tính năng quiz trên website.

## ⚠️ Thay đổi quan trọng

**Các routes `/host` và `/play` đã bị xóa bỏ!**

Plugin không còn tự động tạo các trang `/host` và `/play` nữa. Bạn cần tự tạo các trang này trong WordPress và sử dụng shortcodes.

### Cách tạo trang Player và Host:

1. Vào **Pages > Add New** trong WordPress Admin
2. Tạo trang với slug tùy ý (ví dụ: `player`, `join-quiz`, `host-quiz`, v.v.)
3. Thêm shortcode vào trang
4. Publish trang

**Sau khi xóa các routes cũ, vui lòng vào Settings > Permalinks và nhấn "Save Changes" để làm mới rewrite rules.**

## 📌 Danh sách Shortcodes

### 1. Tham gia Quiz (Player)

```
[live_quiz_player]
```

**Tham số:**
- `title`: Tiêu đề hiển thị (mặc định: "Tham gia Live Quiz")
- `show_title`: Hiển thị tiêu đề hay không (yes/no, mặc định: yes)

**Ví dụ:**
```
[live_quiz_player title="Join the Game" show_title="yes"]
```

**Chức năng:**
- Form nhập tên hiển thị
- Form nhập mã PIN (6 số)
- Tham gia phòng quiz
- Giao diện chơi quiz realtime

**Shortcode cũ (vẫn hoạt động):**
```
[live_quiz]
```

---

### 2. Host Quiz

```
[live_quiz_host quiz_id="123"]
```

**Tham số:**
- `quiz_id`: ID của quiz muốn host (bắt buộc)

**Ví dụ:**
```
[live_quiz_host quiz_id="456"]
```

**Chức năng:**
- Tự động tạo phòng quiz mới khi load trang
- Hiển thị mã PIN để học viên tham gia
- Quản lý phiên quiz realtime
- Hiển thị danh sách người chơi
- Điều khiển câu hỏi
- Xem bảng xếp hạng

**Yêu cầu:** Người dùng phải có quyền `edit_posts`

**Lưu ý:** Shortcode này sẽ tự động tạo một phiên quiz mới mỗi khi trang được load. Mỗi lần load trang sẽ tạo một mã PIN mới.

---

### 3. Danh sách Phiên Quiz

```
[live_quiz_sessions]
```

**Tham số:**
- `per_page`: Số phiên hiển thị mỗi trang (mặc định: 10)

**Ví dụ:**
```
[live_quiz_sessions per_page="20"]
```

**Chức năng:**
- Hiển thị danh sách các phiên quiz đã tạo
- Thông tin: Mã PIN, Quiz, Trạng thái, Số người chơi, Ngày tạo
- Link xem chi tiết phiên

**Yêu cầu:** Người dùng phải có quyền `edit_posts`

---

## 🎯 Cách sử dụng

### Trong WordPress Editor (Gutenberg)

1. Tạo/Sửa trang hoặc bài viết
2. Thêm block "Shortcode"
3. Nhập shortcode vào block
4. Publish/Update

### Trong Classic Editor

1. Tạo/Sửa trang hoặc bài viết
2. Nhập trực tiếp shortcode vào nội dung
3. Publish/Update

### Trong Template PHP

```php
<?php echo do_shortcode('[live_quiz_player]'); ?>
```

---

## 📝 Ví dụ thực tế

### Trang tham gia quiz cho học sinh

```
[live_quiz_player title="Tham gia Trò chơi Học Tập" show_title="yes"]
```

### Trang host cho giáo viên

```
<h1>Quản lý Quiz</h1>
[live_quiz_host quiz_id="123"]

<h2>Lịch sử Phiên</h2>
[live_quiz_sessions per_page="15"]
```

---

## 🔧 Lưu ý kỹ thuật

- Shortcodes tự động load CSS/JS cần thiết
- Chỉ load scripts khi shortcode được sử dụng trên trang
- Tương thích với WordPress 5.8+
- Hỗ trợ WebSocket cho realtime experience
- Responsive trên mobile

---

## 🆘 Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Plugin đã được kích hoạt chưa
2. Permalink đã được cấu hình đúng chưa (vào Settings > Permalinks và Save)
3. User có đủ quyền không (với host/sessions shortcode)
