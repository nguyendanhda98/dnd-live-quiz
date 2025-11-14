# DND Live Quiz Plugin

Plugin WordPress tổ chức quiz thời gian thực với chấm điểm theo tốc độ trả lời, giống Kahoot/Quizizz.

## 📋 Tổng quan

DND Live Quiz cho phép giáo viên tạo và host các quiz tương tác realtime với học sinh. Plugin hỗ trợ WebSocket để đồng bộ trạng thái giữa host và players.

## ✨ Tính năng

- ✅ **Tạo Quiz**: Tạo quiz với nhiều câu hỏi trắc nghiệm
- ✅ **Host Realtime**: Điều khiển quiz realtime, xem players tham gia
- ✅ **Player Interface**: Giao diện đơn giản cho học sinh tham gia
- ✅ **Chấm điểm tự động**: Tính điểm dựa trên độ chính xác và tốc độ
- ✅ **Bảng xếp hạng**: Hiển thị leaderboard realtime
- ✅ **PIN Code**: Mã 6 số để học sinh tham gia phòng
- ✅ **WebSocket**: Hỗ trợ WebSocket cho >2000 người chơi đồng thời
- ✅ **AI Generator**: Tạo câu hỏi tự động bằng AI (OpenAI)
- ✅ **Shortcodes**: Dễ dàng tích hợp vào bất kỳ trang nào

## 🚀 Cài đặt

1. Upload folder `dnd-live-quiz` vào `/wp-content/plugins/`
2. Activate plugin trong WordPress Admin
3. Vào **Settings > Permalinks** và nhấn **"Save Changes"**
4. Tạo các trang cần thiết (xem hướng dẫn dưới)

## 📖 Sử dụng

### Tạo Quiz

1. Vào **Live Quiz > Add New** trong Admin
2. Nhập tên quiz và thêm câu hỏi
3. Publish quiz

### Tạo trang Player (cho học sinh)

1. Vào **Pages > Add New**
2. Đặt tên: "Tham gia Quiz"
3. Thêm shortcode:
   ```
   [live_quiz_player]
   ```
4. Publish

### Tạo trang Host (cho giáo viên)

1. Vào **Pages > Add New**
2. Đặt tên: "Quản lý Quiz"
3. Thêm shortcode:
   ```
   [live_quiz_host]
   [live_quiz_sessions]
   ```
4. Publish

### Host Quiz Session

1. Vào trang host bạn vừa tạo
2. Chọn quiz và nhấn "Tạo phòng"
3. Chia sẻ mã PIN với học sinh
4. Bắt đầu quiz khi đủ người

### Join Quiz (Học sinh)

1. Vào trang player
2. Nhập tên hiển thị
3. Nhập mã PIN từ giáo viên
4. Trả lời câu hỏi khi quiz bắt đầu

## 🎯 Shortcodes

### Player Shortcode
```
[live_quiz_player title="Tham gia Game" show_title="yes"]
```

### Host Shortcode
```
[live_quiz_host]
```

### Sessions List
```
[live_quiz_sessions per_page="10"]
```

Xem chi tiết: [SHORTCODES.md](SHORTCODES.md)

## ⚙️ Cấu hình

### WebSocket (Tùy chọn - cho 2000+ players)

1. Cài đặt Node.js server (xem docs riêng)
2. Vào **Live Quiz > Settings**
3. Bật WebSocket và nhập URL server
4. Nhập JWT secret

### Scoring Settings

- **Alpha (α)**: Hệ số decay tốc độ (0-1, mặc định 0.3)
- **Base Points**: Điểm tối đa mỗi câu (mặc định 1000)
- **Time Limit**: Giới hạn thời gian mỗi câu (giây)

Công thức: `score = base_points × e^(-α × time)`

## 📁 Cấu trúc Files

```
dnd-live-quiz/
├── live-quiz.php           # Main plugin file
├── SHORTCODES.md           # Shortcode documentation
├── MIGRATION_ROUTES.md     # Migration guide
├── includes/               # PHP classes
│   ├── class-admin.php
│   ├── class-post-types.php
│   ├── class-rest-api.php
│   ├── class-session-manager.php
│   ├── class-scoring.php
│   ├── class-security.php
│   ├── class-ai-generator.php
│   └── class-jwt-helper.php
├── assets/                 # CSS/JS
│   ├── css/
│   │   ├── admin.css
│   │   ├── host.css
│   │   └── player.css
│   └── js/
│       ├── admin.js
│       ├── host.js
│       └── player.js
├── templates/              # PHP templates
│   ├── host.php
│   ├── player.php
│   └── admin-*.php
└── languages/              # i18n files
```

## 🔧 Requirements

- WordPress 5.8+
- PHP 7.4+
- MySQL 5.6+
- (Optional) Node.js + Socket.io server cho WebSocket

## 📚 Documentation

- [SHORTCODES.md](SHORTCODES.md) - Chi tiết về shortcodes
- [MIGRATION_ROUTES.md](MIGRATION_ROUTES.md) - Migration guide từ routes cũ

## 🐛 Debug

Enable debug mode trong `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Logs được lưu trong `/wp-content/debug.log`

## 📝 Changelog

### Version 2.1.0
- ✅ Chuyển từ Gutenberg blocks sang shortcodes
- ✅ Xóa bỏ routes tự động `/host` và `/play`
- ✅ Cho phép user tự tạo trang với shortcodes
- ✅ Cải thiện tích hợp với themes và page builders

### Version 2.0.4
- WebSocket support
- Redis caching
- AI question generation

## 💡 Tips

1. **Responsive**: Plugin tự động responsive trên mobile
2. **Theme Integration**: Shortcodes kế thừa style từ theme
3. **Page Builders**: Tương thích với Elementor, Divi, Beaver Builder
4. **Multiple Pages**: Có thể tạo nhiều trang với cùng shortcode
5. **Custom Slugs**: Tự do chọn bất kỳ slug nào cho trang

## 🆘 Support

Nếu gặp vấn đề:
1. Kiểm tra permalinks đã flush chưa
2. Kiểm tra JavaScript console
3. Kiểm tra debug.log
4. Xem tài liệu trong folder plugin

## 📄 License

GPL v2 or later

## 👥 Author

DND English Group
