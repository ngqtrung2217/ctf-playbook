const C = (...lines) => lines.join("\n");

const pwn = [
  {
    id: "pattern-stack-variable",
    group: "Pwn patterns",
    title: "Stack variable overwrite",
    category: "Pwn",
    summary: "Không cần đè return address: buffer overflow đè biến điều kiện/thắng ngay trên stack.",
    tags: ["stack", "bof", "variable", "bof1"],
    priority: "high",
    steps: [
      "Đọc source/disasm: biến win nằm cạnh buffer?",
      "Tìm offset bằng cyclic hoặc đọc layout stack.",
      "Ghi giá trị win vào biến bằng p32/p64.",
      "Không cần ROP nếu điều kiện chỉ là biến."
    ],
    payloads: [
      {
        title: "Template",
        code: C(
          "payload = b'A'*offset + p32(win_value)",
          "# offset/win_value lấy từ disasm/cyclic"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Offset phụ thuộc compiler; verify bằng disasm/cyclic.",
      "p32 vs p64 theo kiến trúc.",
      "Có thể chỉ cần sendline, không cần interactive."
    ],
    links: [
      { title: "pwn.college", url: "https://pwn.college/" }
    ]
  },
  {
    id: "pattern-rop-args",
    group: "Pwn patterns",
    title: "ROP / ret2win với arguments",
    category: "Pwn",
    summary: "NX bật, không có shell: set register bằng gadget rồi gọi win/system.",
    tags: ["rop", "ret2win", "arguments", "rp-rp-rp"],
    priority: "high",
    steps: [
      "Checksec: PIE/canary/RELRO/NX.",
      "Tìm offset tới saved RIP; tìm pop rdi/rsi/rdx.",
      "Kiểm tra win cần tham số gì.",
      "Thêm ret để align stack; gọi win/system."
    ],
    payloads: [
      {
        title: "ROP template",
        code: C(
          "payload = b'A'*offset",
          "payload += p64(pop_rdi) + p64(arg1)",
          "payload += p64(pop_rsi) + p64(arg2)",
          "payload += p64(win)"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Stack alignment: thêm ret trước call nếu crash.",
      "win có thể cần endbr64/win+5.",
      "Gadget/offset đổi theo binary."
    ],
    links: [
      { title: "ROP Emporium", url: "https://ropemporium.com/" }
    ]
  },
  {
    id: "pattern-prng",
    group: "Pwn patterns",
    title: "Predictable PRNG",
    category: "Pwn",
    summary: "srand(time)/seed nhỏ: đoán hoặc brute seed, rồi tính rand() tiếp theo.",
    tags: ["prng", "rand", "seed", "bad-seed"],
    priority: "high",
    steps: [
      "Disasm tìm srand/rand, nguồn seed (time/urandom).",
      "Nếu seed time: brute ± vài giây; nếu seed 2 byte: brute 65536.",
      "Dùng libc ctypes để tính đúng công thức rand().",
      "Nếu chương trình in target, dùng target để lọc seed."
    ],
    payloads: [
      {
        title: "Seed time",
        code: C(
          "import ctypes, time",
          "libc=ctypes.CDLL('libc.so.6')",
          "libc.srand(int(time.time()))",
          "guess=libc.rand()%10000+20230000"
        )
      },
      {
        title: "Seed 16-bit",
        code: C(
          "for seed in range(65536):",
          "    libc.srand(seed)",
          "    if libc.rand()%10000+20240000 == target:",
          "        nxt=libc.rand()%10000+20240000; break"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Không cần memory corruption nếu chỉ đoán số.",
      "Kiểm tra offset thời gian server.",
      "Đọc kỹ công thức modulo trong disasm."
    ],
    links: [
      { title: "pwn.college", url: "https://pwn.college/" }
    ]
  },
  {
    id: "pattern-int-overflow",
    group: "Pwn patterns",
    title: "Signed integer overflow",
    category: "Pwn",
    summary: "Dương + dương = âm trong int32; điều kiện win thường là tổng <0.",
    tags: ["integer", "overflow", "int32", "int-1"],
    priority: "high",
    steps: [
      "Đọc kiểu biến: int32/signed.",
      "Tìm điều kiện win (tổng <0, so sánh sai).",
      "Dùng INT_MAX + 1.",
      "Gửi input đúng format."
    ],
    payloads: [
      {
        title: "Input",
        code: "2147483647 1"
      }
    ],
    commands: [],
    gotchas: [
      "Không dùng 2147483648 nếu parser chặn.",
      "Kiểu unsigned sẽ khác.",
      "Không cần canary/PIE."
    ],
    links: [
      { title: "pwn.college", url: "https://pwn.college/" }
    ]
  },
  {
    id: "pattern-negative-logic",
    group: "Pwn patterns",
    title: "Negative quantity / business logic",
    category: "Pwn",
    summary: "Giá * quantity không check lower bound: quantity âm làm tăng balance, mở đường shell/flag.",
    tags: ["logic", "negative", "quantity", "index-1"],
    priority: "high",
    steps: [
      "Đọc menu/giá/điều kiện mua.",
      "Thử quantity âm hoặc rất lớn.",
      "Kiểm tra balance sau giao dịch.",
      "Chọn item đắt/shell khi đủ tiền."
    ],
    payloads: [
      {
        title: "Flow",
        code: C(
          "chọn item rẻ",
          "quantity âm (ví dụ -1000)",
          "chọn item shell/flag"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Đây là logic flaw, không phải OOB.",
      "Có thể cần quantity âm lớn hơn.",
      "Đọc kỹ menu để chọn item đúng."
    ],
    links: [
      { title: "pwn.college", url: "https://pwn.college/" }
    ]
  },
  {
    id: "pattern-heap-fptr",
    group: "Pwn patterns",
    title: "Heap overflow / tcache → fptr",
    category: "Pwn",
    summary: "Overflow buffer đè con trỏ hàm, hoặc UAF/tcache poisoning để ghi hook rồi gọi win.",
    tags: ["heap", "overflow", "function-pointer", "tcache", "uaf", "baby-heap"],
    priority: "high",
    steps: [
      "Disasm: malloc buffer, malloc pointer, gets/strcpy, call pointer.",
      "Tìm khoảng cách buffer → pointer (thường chunk size).",
      "Ghi địa chỉ win vào pointer.",
      "Nếu win random/luck, retry connection; đừng sửa payload."
    ],
    payloads: [
      {
        title: "Template",
        code: C(
          "payload = b'A'*offset + p64(win_addr)",
          "p.sendlineafter(b': ', payload)"
        )
      }
    ],
    commands: [],
    gotchas: [
      "Không phải tcache/UAF nếu chỉ có fptr; đọc main trước.",
      "Static/No PIE có thể cho địa chỉ win cố định.",
      "Luck-based win: retry, đừng đổi offset."
    ],
    links: [
      { title: "how2heap", url: "https://github.com/shellphish/how2heap" }
    ]
  }
];

export default pwn;
