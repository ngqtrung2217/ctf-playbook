# Design references

Ảnh chụp màn hình các site/repo dùng để tham khảo thiết kế playbook Web + Pwn.
Mở bằng `xdg-open refs/<file>.png`.

| File | Nguồn | Cái đáng lấy |
|---|---|---|
| `pentest-deck.png` | https://raytayy.github.io/pentest-deck/ | **Mẫu sát nhất**: top bar điền biến target một lần, search, filter theo phase, card lệnh + copy, callout "How to think", single-file offline. |
| `gtfobins.png` | https://gtfobins.github.io/ | Filter theo function/context, badge trên từng item, bảng danh sách gọn. |
| `revshells.png` | https://www.revshells.com/ | Nhập IP/port ở đầu, tabs biến thể, preview payload, nút Raw/Copy. |
| `hacker-recipes.png` | https://www.thehacker.recipes/ | Layout docs 2 cột: sidebar category + content, search Ctrl+K, nội dung ngắn có ví dụ. |
| `payloads-all-the-things.png` | https://swisskyrepo.github.io/PayloadsAllTheThings/ | Sidebar category lớn, search là bắt buộc, copy icon cạnh code. |
| `portswigger.png` | https://portswigger.net/web-security | Card learning path + số lab, dashboard tiến độ (sau khi login). |
| `pwn-college.png` | https://pwn.college/ | Dark terminal aesthetic, cảm giác progression/belt, tối giản. |
| `ironstone.png` | https://ir0nstone.gitbook.io/notes | GitBook sạch: sidebar, search, copy dropdown, nội dung dài dễ đọc. |

## Kết luận thiết kế

- **Sticky top bar** với biến `TARGET`, `HOST`, `LHOST`, `LPORT`, `BINARY`, `LIBC`, `PORT` + search + theme.
- **Phase tabs** (Recon → Auth → Injection → ...) và **filter chips** theo tag.
- **Technique card**: Signals → How to think → Checklist → Payloads/Commands (copy) → Gotchas → Links.
- **Copy-safety**: placeholder chưa điền thì tô đỏ/dim; copy sẽ thay biến thật.
- **Offline single-file**, không CDN, không backend.
- **Progress + checklist** lưu `localStorage`; có nút reset.
- **Dark, monospace, mật độ cao**; tránh landing page/marketing và sidebar quá sâu.

## Nguồn khác đáng xem

- CyberPath VN — https://github.com/5kym4rk/cyberpath-vn (dashboard học tập, progress, notes, export/import)
- Slothkrew CTF playbook — https://github.com/Slothkrew/ctf-playbook (checklist methodology)
- yaCTFpl — https://github.com/evilcel3ri/yaCTFpl (workflow Enumerate → Exploit → Post-Exploit)
- CTF-playbook UUT — https://github.com/ehsankhani/CTF-playbook (TL;DR + command + PoC tối giản)
- Obsidian CTF template — https://github.com/dwightdoran/ctf-note-template
- Obsidian hackpuntes theme — https://github.com/JavierOlmedo/obsidian-hackpuntes-theme
