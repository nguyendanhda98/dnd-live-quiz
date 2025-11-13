# ✅ ĐÃ HOÀN THÀNH: DND Live Quiz Permalinks Settings

## 🎯 Tính năng mới

Giờ đây bạn có thể tùy chỉnh URL base cho Host Room giống như các plugin chuyên nghiệp khác (WooCommerce, LearnDash...)

## 🚀 Cách sử dụng

### Bước 1: Setup (chọn 1 trong 3 cách)

**Cách 1: Qua trang test (ĐỀ XUẤT)**
```
Truy cập: https://yourdomain.com/wp-content/plugins/dnd-live-quiz/test-permalink.php
```
→ Trang này sẽ:
- ✅ Kiểm tra option đã tồn tại chưa
- ✅ Tạo option nếu chưa có
- ✅ Flush rewrite rules
- ✅ Hiển thị configuration hiện tại
- ✅ Test rewrite rules có hoạt động không

**Cách 2: Qua WordPress Admin**
```
1. Vào: Settings > Permalinks
2. Kéo xuống phần "DND Live Quiz Permalinks"
3. Nhập base slug (mặc định: "play")
4. Click "Save Changes"
```

**Cách 3: Deactivate & Reactivate plugin**
```
1. Plugins > Installed Plugins
2. Deactivate "DND Live Quiz"
3. Activate lại
4. Option sẽ được tạo tự động
```

### Bước 2: Kiểm tra Settings

Vào **Settings > Permalinks**, bạn sẽ thấy:

```
┌─────────────────────────────────────────┐
│ DND Live Quiz Permalinks                │
├─────────────────────────────────────────┤
│ Cài đặt cấu trúc URL cho Live Quiz.     │
│                                          │
│ Host Room Base                          │
│ ┌──────────────┐                        │
│ │ play         │                        │
│ └──────────────┘                        │
│ URL để host truy cập phòng.             │
│ Mặc định: https://domain.com/play/123   │
│ Ví dụ: nếu bạn nhập "room",             │
│ URL sẽ là /room/123                     │
└─────────────────────────────────────────┘
```

### Bước 3: Test hoạt động

1. **Tạo phòng mới:**
   - Vào trang có shortcode `[live_quiz_create_room]`
   - Chọn quiz và tạo phòng
   - Sẽ tự động redirect đến `/play/{session_id}`

2. **Kiểm tra URL:**
   - Với base `play`: `https://yourdomain.com/play/123`
   - Với base `room`: `https://yourdomain.com/room/123`
   - Với base `host`: `https://yourdomain.com/host/123`

## 🎨 Tùy chỉnh URL Base

Bạn có thể đổi từ `play` sang bất kỳ slug nào:

| Base | URL Result | Use Case |
|------|-----------|----------|
| `play` | `/play/123` | Mặc định, ngắn gọn |
| `room` | `/room/123` | Dễ hiểu hơn |
| `host` | `/host/123` | Phân biệt rõ với player |
| `quiz-host` | `/quiz-host/123` | SEO friendly |
| `live` | `/live/123` | Ngắn gọn |
| `session` | `/session/123` | Kỹ thuật hơn |

**Lưu ý:** Sau khi thay đổi, nhấn "Save Changes" để WordPress tự động flush rewrite rules.

## 📁 File đã thay đổi

### Core Files

#### `includes/class-post-types.php`
```php
✅ add_permalink_settings()        - Đăng ký settings
✅ permalink_settings_section()     - Hiển thị section header
✅ play_base_field()                - Render input field
✅ sanitize_play_base()             - Validate & sanitize
✅ get_play_base()                  - Lấy giá trị base
✅ flush_rewrite_rules_on_change()  - Auto flush khi thay đổi
✅ add_rewrite_rules()              - Cập nhật sử dụng base động
```

#### `includes/class-rest-api.php`
```php
✅ create_session() - Sử dụng base động cho host_url
```

#### `live-quiz.php`
```php
✅ register_activation_hook() - Tạo option 'live_quiz_play_base'
```

### Utility Files
- ✅ `test-permalink.php` - Trang test và setup
- ✅ `setup-permalinks.php` - Script CLI setup
- ✅ `PERMALINK_SETUP.md` - Hướng dẫn chi tiết

## 🔍 Troubleshooting

### Vẫn bị 404 sau khi setup

**Giải pháp 1: Flush thủ công**
```
Vào: Settings > Permalinks > Save Changes
```

**Giải pháp 2: Chạy test page**
```
https://yourdomain.com/wp-content/plugins/dnd-live-quiz/test-permalink.php
```

**Giải pháp 3: Kiểm tra .htaccess**
```bash
# File phải có quyền ghi
chmod 644 /home/wordpress-da/html/.htaccess

# Nội dung cơ bản:
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
```

### Không thấy section trong Permalinks page

**Check 1: Plugin đã activate?**
```
Plugins > Installed Plugins > DND Live Quiz (Active)
```

**Check 2: Clear cache**
```
# Nếu dùng cache plugin
- Clear WordPress cache
- Clear browser cache
- Refresh trang Settings > Permalinks
```

**Check 3: Check logs**
```php
// Add vào wp-config.php để debug
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

### URL không hoạt động với base mới

**Nguyên nhân:** Rewrite rules chưa được flush

**Giải pháp:**
```
1. Vào Settings > Permalinks
2. Click "Save Changes" (không cần đổi gì)
3. Test lại URL
```

## 🎯 Workflow hoàn chỉnh

```
1. Setup (1 lần duy nhất)
   ↓
2. Vào Settings > Permalinks > Đổi base (optional)
   ↓
3. Tạo quiz room từ frontend
   ↓
4. Auto redirect đến /{base}/{session_id}
   ↓
5. Host quản lý phòng
   ↓
6. Players join bằng PIN code
```

## ✨ Ưu điểm

✅ **Chuẩn WordPress:** Giống WooCommerce, LearnDash, WPML...
✅ **User-friendly:** Admin có thể tùy chỉnh dễ dàng
✅ **Auto flush:** Tự động flush rewrite rules
✅ **Validation:** Tự động sanitize input
✅ **SEO friendly:** URL có thể tùy chỉnh
✅ **Documented:** Có mô tả, ví dụ rõ ràng

## 📸 Screenshot

Vị trí trong WordPress Admin:

```
Dashboard
├── Settings
    └── Permalinks
        ├── Common Settings
        ├── Optional
        │   ├── Category base
        │   └── Tag base
        ├── Product permalinks (WooCommerce)
        ├── LearnDash Permalinks
        └── DND Live Quiz Permalinks ✨ NEW
            └── Host Room Base: [play]
```

## 🎉 Hoàn thành!

Bây giờ bạn có thể:
- ✅ Tùy chỉnh URL base qua Settings > Permalinks
- ✅ Tạo phòng và auto redirect đến URL đẹp
- ✅ Players join bằng PIN 6 số
- ✅ Host quản lý phòng với giao diện chuyên nghiệp

---

**Test ngay:** Truy cập `https://yourdomain.com/wp-content/plugins/dnd-live-quiz/test-permalink.php`
