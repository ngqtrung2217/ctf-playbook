# CTF Playbook

Lab workspace cho Web + Pwn, xây bằng **Next.js 16**. Mỗi tab là một lab; mỗi lab là một trang gồm nhiều **block/cell**; mỗi block có thể nhập một template checklist (CSP, upload, ret2libc, Easy CSP...) và có payload copy được.

## Chạy

```bash
npm install
npm run dev          # http://localhost:3000
```

Build static export:

```bash
npm run build        # tạo out/
npm run preview      # http://localhost:4173
```

## Mô hình dùng

1. `＋ New lab` tạo tab lab. Sidebar luôn hiện toàn bộ lab dạng **cell lớn**; bấm bút chì ✎ hoặc double-click tên lab để đổi tên. Lab đang mở có thêm mục **Blocks** để bấm thẳng tới từng block. Header và footer `New lab` / `Lab board` cố định, chỉ danh sách bên trong scroll; rail phải cũng có scroll riêng khi màn thấp.
2. Trong lab, thêm pattern bằng một trong hai cách:
   - bấm chip ở hàng **Quick add** (CSP, XSS+WAF, JWT, SQLi, ROP...);
   - hoặc `＋ Add checklist block` rồi nhập template.
3. **Ctrl+K** mở palette tìm nhanh pattern/payload/command/lab:
   - gõ `csp`, `jwt`, `base64`, `rop`, `upload`...
   - Enter để thêm block, copy payload, hoặc mở lab;
   - chưa mở lab thì Enter tạo lab mới từ pattern.
4. Ô đầu tiên của block là **template cell**:
   - gõ `csp`, `upload`, `jwt`, `ssti`, `easy csp`, `ret2libc`, `bof3`, `int1`...
   - Enter chọn kết quả đầu tiên; hoặc click.
   - Template search tự lọc theo category: lab **Web** chỉ hiện template Web, lab **Pwn** chỉ hiện template Pwn.
5. Block được nhập checklist + payloads/commands từ template.
6. Tick từng bước; thêm bước; xoá bước; thêm block khác nếu lab có nhiều hướng.
7. Note block dùng cho ghi chú tự do.
8. Khi xong, tick **Solved** trong rail. Không có form review; board có stats solved + filter status/category.
9. **Encode/Decode** ở rail phải: URL, HTML entity, Base64, Base64URL, Hex; output copy được và dùng lại làm input.
10. **Ctrl+B** ẩn/hiện sidebar. Layout fluid: màn hẹp sidebar thành drawer, rail tự co; chia đôi màn hình vẫn dùng được.
11. **Scale** ở góc phải topbar: `− 100% +`, chọn 75–150%. Scale lưu vào `localStorage`; scale cao tự đóng sidebar, scale rất cao đưa rail xuống dưới để nội dung không bị bóp.
12. Mọi thứ lưu trong `localStorage` của trình duyệt.

## Cấu trúc

```
app/
  layout.js
  page.js
  globals.css
components/
  Playbook.js       # state, lab tabs, blocks, palette, quick add, encode rail
lib/
  templates.json    # 15 template nền
  presets.js        # gộp web + pwn + payload bổ sung
  presets-web.js    # 10 pattern card web gốc
  presets-pwn.js    # 6 pattern card pwn gốc
  presets-extra-web.js  # payload bổ sung + command injection/SSRF/XXE
  presets-extra-pwn.js  # payload bổ sung + format string
  templates.js      # gộp + search ranking
  storage.js        # localStorage, uid, normalize
legacy/
  index.html        # bản single-file cũ
  build/            # source của bản cũ
refs/               # ảnh tham khảo thiết kế
```

## Pattern cards

Không viết solution từng lab. Mỗi card là một **dạng hay gặp**: dấu hiệu → checklist → payload mẫu → gotcha. Tên lab chỉ là tag để search.

- **Web (14):** multi-flag recon, CSP bypass, XSS+WAF+bot, LFI+upload+phar, JWT/JWKS/mass assignment, PHP serialized cookie, SQLi login/sort, SSTI WAF bypass, logic/type juggling, dev server/middleware/version CVE, OS command injection, SSRF, XXE, auth/IDOR/header bypass.
- **Pwn (8):** pwn recon/setup, stack variable overwrite, ROP/ret2libc/ORW, format string/GOT overwrite, PRNG dự đoán, integer overflow, negative quantity/business logic, heap overflow/tcache function pointer.
- **15 template nền:** recon, XSS, upload, JWT, injection, SSTI, deser, IDOR, source review, logic, LFI, ret2libc, format string...
- **Payload hiện có:** 151 payload + 32 command trong toàn bộ template/pattern.

Các pattern được rút ra từ 23 web + 9 pwn của BKSEC Training, nhưng nội dung đã generic hóa để dùng lại. Phần bổ sung tập trung vào biến thể bypass và các dạng hay gặp khi TTV khó hơn training.

## Ghi chú

- `localStorage` key hiện tại: `ctf-playbook:labs:v4`; tab đang mở ở `open-labs:v4`, lab active ở `active-lab:v4`, scale ở `ui-scale:v1`.
- Palette dùng chung nguồn `TEMPLATES`, nên search cả title, steps, payload code, command code và gotchas.
- Static export cần serve bằng HTTP (không mở `out/index.html` trực tiếp bằng `file://`).
- Bản single-file cũ vẫn nằm trong `legacy/` để tham khảo.
