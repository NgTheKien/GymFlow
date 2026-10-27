# DESIGN.md – GymFlow

Quy chuẩn giao diện cho người (và AI) chỉnh sửa frontend. Mã nguồn tham chiếu: `frontend/src/styles.css`.

## 1. Hai bề mặt, hai giọng

| | Trang công khai (`/`, `/register`, `/login`, `/policies`) | Khu ứng dụng (sau đăng nhập) |
|---|---|---|
| Mục tiêu | Bán hàng: thuyết phục đăng ký hội viên | Làm việc: tra cứu, nhập liệu nhanh |
| Chữ | Hiển thị **IN HOA, cỡ rất lớn** (`.display`, `.display-sm`), tracking âm | Inter 600/800 chữ thường, cỡ 13–28px |
| Màu | Đơn sắc đen–trắng + **một** màu hành động `#00b24b` | Như bên trái + xanh dương/tím/vàng cho trạng thái |
| Mật độ | Thoáng, mỗi section một ý | Dày thông tin, bảng, thẻ số liệu |
| Chuyển động | Vào trang kiểu lò xo (`--ease-spring`), ticker, thẻ nổi | Tối thiểu, chỉ phản hồi thao tác |

Không dùng `.display` trong khu ứng dụng; không dùng bảng/thẻ số liệu dày đặc trên trang công khai.

## 2. Token

- Nền `--canvas #141415` · bề mặt `--surface-2 #202125` · đường kẻ `--hairline #2d2f33`
- Chữ `--ink #f0f2f5` · phụ `--muted #9aa1b1` · mờ `--faint #5f636c`
- Hành động `--primary #00b24b` / `--primary-bright #00d95b` – chỉ cho CTA chính, số liệu tốt, điểm nhấn
- Bo góc `--r-sm 10` · `--r-md 16` · `--r-lg 20` · góc nghiêng motif `--slant -12deg`

## 3. Motif

- **Vạch nghiêng tốc độ**: khối `skewX(var(--slant))` màu primary, độ mờ 0.05–0.22. Dùng ở hero, auth, kicker, số thứ tự bước.
- **Chữ viền khổng lồ** (`-webkit-text-stroke`, alpha ≤ 0.07) làm nền: `GYMFLOW` ở hero, `MOVE` ở auth. Luôn `aria-hidden`.
- **Ticker** nền xanh liệt kê bộ môn – một dải duy nhất mỗi trang.
- Không dùng ảnh chưa rõ bản quyền. Khi có ảnh thật của phòng tập: full-bleed, đen trắng hoặc tương phản cao, chữ đè trực tiếp.

## 4. Chuyển động

- Vào trang: `riseIn` 0.8s `--ease-spring`, so le 60ms giữa các phần tử.
- Hover thẻ: `translateY(-3..-4px)` với `--ease-spring`; không phóng to quá 1.02.
- Mọi animation bị vô hiệu bởi `prefers-reduced-motion` (khối cuối `styles.css`). Thành phần mới không được tự đặt `animation` bằng `!important`.

## 5. Khả năng truy cập

- Focus luôn thấy được: `:focus-visible` viền 2px; nút/link công khai dùng màu `--primary-bright`, offset 3px.
- Tương phản chữ ≥ 4.5:1 trên nền tối (`--muted` trên `--canvas` đạt ~7:1). Không đặt chữ `--faint` cho nội dung quan trọng.
- Vùng chạm ≥ 44px trên mobile (menu mobile, nút CTA).
- Form: nhãn rõ ràng, lỗi đặt ngay dưới trường, focus vào trường lỗi đầu tiên, `aria-invalid`.

## 6. Breakpoint đã kiểm tra

| Độ rộng | Hành vi |
|---|---|
| ≥ 1181px (1440, 1280) | Hero 2 cột, lưới 4/3 cột, footer 4 cột |
| 901–1180px | Lưới 4 → 2 cột, footer 2 cột |
| ≤ 900px (768) | Menu hamburger, hero 1 cột, lưới 3 → 1 cột, auth ẩn cột minh hoạ |
| ≤ 560px (390) | Ẩn thẻ nổi hero, CTA full-width, footer 1 cột |

## 7. Nội dung

- Giọng văn: ngắn, chủ động, nói với hội viên ("bạn"). Tiêu đề hiển thị ≤ 6 từ.
- Thông tin liên hệ lấy từ `frontend/src/site.ts`; trường rỗng sẽ tự ẩn – không điền số/địa chỉ giả.
- Không đưa nội dung học thuật (nhóm, lớp, giảng viên, môn học) lên giao diện công khai; thông tin đó chỉ nằm trong README.
- Tài khoản demo chỉ hiện khi backend bật `DEMO_QUICK_LOGIN` và tài khoản thật sự tồn tại, luôn ghi rõ "Môi trường demo".

## 8. Chế độ sáng / tối

- Ba lựa chọn: Sáng · Tối · Theo hệ thống (mặc định). Nút ở header trang công khai, góc form đăng nhập/đăng ký và topbar ứng dụng (`src/theme/ThemeToggle.tsx`).
- Lưu ở `localStorage['gf.theme']`; đổi ở một tab thì các tab khác đổi theo. Không gửi lên server nên không ảnh hưởng đăng nhập.
- Script nhỏ đầu `index.html` đặt `data-theme` trên `<html>` trước khi trang vẽ → không nháy nền tối khi tải lại ở chế độ sáng.
- Chỉ đổi **token** trong `:root[data-theme='light']` (`styles.css`). Thành phần mới phải dùng `var(--…)`, không viết mã màu cứng. Màu nhấn của biểu đồ, nhóm cơ, trạng thái giữ nguyên ở cả hai chế độ để người dùng nhận ra.
- Ở chế độ sáng, màu xanh hành động đậm hơn (`#008a3a`) để chữ xanh trên nền trắng vẫn đủ tương phản.
