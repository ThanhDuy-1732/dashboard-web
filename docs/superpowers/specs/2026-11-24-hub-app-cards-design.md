# Hub — card ứng dụng có ảnh và mô tả (thiết kế ngắn)

- **Ngày:** 2026-11-24
- **Trạng thái:** đã duyệt và triển khai (2026-11-24)
- **Phạm vi:** trang chủ công khai (`/`), form admin ứng dụng

## 1. Vấn đề

Người xem mở hub và chỉ thấy 6 cái tên: *Secret Story, Dashboard Games, Money App, English Study, QR App, Smart Social Shopping*. Không biết app nào làm gì, và 6 card giống hệt nhau nên không có gì dẫn mắt.

Nguyên nhân đã kiểm chứng:

- `apps.description` tồn tại trong schema, form admin có ô "Mô tả ngắn", `AppCard` đã render mô tả — nhưng cả 6 hàng trong DB đều `description = null`.
- `apps.icon_url` cũng `null` toàn bộ → mọi card rơi vào fallback chữ cái đầu, cùng một màu moss.
- Chữ cái đầu không nói lên app làm gì.

## 2. Mục tiêu / không làm

**Mục tiêu**

- Mỗi card trả lời được ba câu: app tên gì, làm gì, trông thế nào.
- Ảnh xem trước có sẵn cho cả 6 app hiện tại ngay khi deploy, không cần thao tác tay từng app.
- Trang vẫn nhẹ: ảnh lazy-load, tỉ lệ cố định (không nhảy layout), không JS mới.

**Không làm**

- Không thêm `category`/nhóm app, không sắp xếp lại thứ tự hiển thị (hướng B để sau).
- Không hiện trạng thái health trên card công khai.
- Không upload ảnh qua admin (chỉ dán URL).

**Ràng buộc kế thừa từ thiết kế cũ**

- Anti-goal: *"Không phụ thuộc vào một dịch vụ ngoài cho trang hub công khai."* → ảnh xem trước phải là file tĩnh trong repo, **không hotlink dịch vụ screenshot lúc chạy**.

## 3. Cách làm

### 3.1 Ảnh xem trước: chụp một lần, phục vụ tĩnh

1. Script `scripts/fetch-previews.mjs` gọi thum.io (`https://image.thum.io/get/width/1200/crop/750/noanimate/<url>`) cho từng app, ghi ra `public/previews/<slug>.png`.
2. Script in ra câu `update apps set preview_url = '/previews/<slug>.png' where slug = '<slug>';` để chạy qua `psql`, hoặc tự chạy nếu có `DATABASE_URL`.
3. Public page chỉ đọc `preview_url` từ DB và render `<img src>` trỏ vào file trong `public/`.
4. Admin thêm app mới: dán URL ảnh (tự chụp rồi host ở đâu cũng được), hoặc chạy lại script.

Thum.io chỉ được gọi **lúc dev/backfill**, không bao giờ lúc người dùng tải trang.

### 3.2 Dữ liệu

Migration `db/migrations/006_app_preview.sql`:

```sql
alter table apps add column if not exists preview_url text;
```

- `PublicApp` thêm `preview_url`.
- `listVisibleApps` / `getVisibleAppBySlug` select thêm cột.
- `AppWriteInput`, `appInputSchema` (`previewUrl: trimmedOptionalUrl()`), `parseAppForm`, `createApp`, `updateApp`, form admin thêm ô "URL ảnh xem trước" (dưới ô URL icon).

### 3.3 Card

Card dọc, cả card là một link:

```
┌──────────────────────────┐
│  [ ảnh xem trước 16:10 ] │  object-cover, lazy
├──────────────────────────┤
│ Tên ứng dụng             │  Bricolage 18px semibold
│ Mô tả một dòng, tối đa   │  DM Sans 14px, ink/60, clamp 2
│ hai dòng.                │
└──────────────────────────┘
```

- Bỏ mũi tên `→` và icon chữ cái khỏi trạng thái mặc định. Thứ dẫn mắt là ảnh thật của app, không phải trang trí.
- Hover: viền card → moss, ảnh scale 1.02, transition 200ms. Tôn trọng `prefers-reduced-motion`.
- Fallback theo thứ tự: `preview_url` → `icon_url` (khối 16:10 nền card, icon 48px giữa) → nền moss nhạt + chữ cái đầu. Không có ảnh thì card vẫn cao bằng card có ảnh.
- Alt: `Ảnh xem trước ${app.name}`; nếu là fallback icon thì `alt=""`.
- Grid: 1 cột < 640px, 2 cột từ 640px. `gap-4`.
- Giữ `loading="lazy"`, `decoding="async"`, `width`/`height` để chống layout shift.

### 3.4 Phần đầu trang

Giữ nguyên cấu trúc, sửa chữ cho có ích hơn:

- `Hệ sinh thái của tôi` → giữ (nhãn nhỏ, màu moss).
- Tiêu đề: giữ `NEXT_PUBLIC_HUB_NAME`.
- Mô tả: `6 ứng dụng tôi tự làm. Chọn một cái để mở — mỗi cái một việc.` (đổi từ "Chọn một ứng dụng để mở. Tất cả trong một chỗ, không cần nhớ link.")
- Dòng đếm `6 ứng dụng đang mở` chuyển xuống sát grid, chữ nhỏ hơn, vẫn giữ cho trạng thái loading.

### 3.5 Nội dung 6 app (lấy từ metadata thật của từng app)

| slug | Tên hiện tại | Đề xuất tên | Mô tả |
|---|---|---|---|
| secret-story | Secret Story | giữ | Kể và đọc bí mật ẩn danh |
| dashboard-games | Dashboard Games | **Nhà Chơi** | Cờ tỷ phú và cờ caro, chơi với máy hoặc bạn bè |
| money-app | Money App | giữ | Quản lý tiền và nhận điểm thưởng |
| english-sudy-web | English Study | **ThankZ English** | Tự học từ mới tiếng Anh mỗi ngày |
| qr-app | QR App | **Chấp cánh ước mơ** | Viết điều bạn ước, cùng cầu nguyện cho nó |
| smart-social-shopping-app | Smart Social Shopping | **Mình dùng** | Đọc trải nghiệm thật rồi mua món phù hợp |

Ba tên in đậm là app tự đặt tiêu đề khác với tên đang lưu trong hub (QR App thực chất **không phải** app QR). **Đã chốt:** đổi cả bốn tên theo tiêu đề thật của app.

**Kết quả triển khai:** `scripts/fetch-previews.mjs` dùng microlink (render đúng viewport, đợi animation) và tự lùi về thum.io khi microlink hết quota. Microlink giới hạn 50 request/ngày nên không nên chạy lại nhiều lần liên tiếp.

## 4. File chạm tới

- `db/migrations/006_app_preview.sql` (mới)
- `scripts/fetch-previews.mjs` (mới), `public/previews/*.png` (mới, ~80KB/ảnh)
- `src/lib/db/types.ts`, `src/lib/db/apps.ts`
- `src/lib/validation/app.ts`
- `src/components/admin/app-form.tsx`
- `src/components/app-card.tsx`, `src/components/hub-grid.tsx`, `src/app/page.tsx`
- `tests/unit/components/app-card.test.tsx` (+ case có `preview_url`), `tests/unit/components/hub-grid.test.tsx`, `tests/unit/validation/*`

## 5. Rủi ro

- **thum.io chặn/đổi format** → chỉ ảnh hưởng lúc backfill; ảnh đã lưu trong repo vẫn chạy. Có thể thay bằng chụp tay.
- **Ảnh chụp lỗi thời** khi app đổi giao diện → chạy lại script, xoá file cũ.
- **Nặng repo** nếu sau này có 30 app → chuyển sang Vercel Blob khi vượt ~5MB.
- **Tên app lệch** với tiêu đề thật → chốt ở mục 3.5.

## 6. Kiểm chứng

- `npm test` xanh (app-card, hub-grid, validation, env không đổi).
- `npm run build` sạch.
- Mở `/` ở 375px và 1440px: 6 card có ảnh, mô tả 2 dòng, không nhảy layout khi ảnh tải.
- Tắt mạng: card vẫn giữ khung, không vỡ grid.
