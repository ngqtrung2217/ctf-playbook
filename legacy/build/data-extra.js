DATA.find(s => s.id === "ttv").items.push(
  {
    id: "ttv-patterns",
    title: "TTV patterns 2025–2026",
    summary: "Các dạng đã thấy ở TTV và BKSEC Training. Dùng để ưu tiên ôn, không phải đề dự đoán chính thức.",
    tags: ["ttv", "patterns", "training"],
    priority: "high",
    signals: [
      "Web: CSP injection + CSRF token leak + admin bot",
      "Web: upload/phar/disable_functions",
      "Web: JWT/API endpoint leak",
      "Pwn: heap UAF/overflow; training có fmt/ret2libc"
    ],
    checklist: [
      "Feedbin (TTV 2026): CSP injection qua cat_filter, script-src-elem, CSRF token, đổi password admin.",
      "ezy pzy (TTV 2026): JWT/API endpoint leak; đọc JS/utils để tìm credential.",
      "ba bước lên mây + revenge (TTV 2026): LFI/upload/phar; revenge bypass disable_functions.",
      "Training web medium: Medium CSP, BKSecPad, Three Steps to Heaven, Double or Nothing, Gambling Coin 2.",
      "Pwn TTV 2025: note app heap overflow + UAF, leak heap/libc/stack, RCE.",
      "Training pwn: bof1–4 (canary/PIE), fmt1–2, integer, ret2libc, shellcode, Baby Heap.",
      "Nếu gặp challenge lạ: quay lại decision tree, đừng đoán payload."
    ],
    links: [
      { title: "kyrux29/CTF_WRITEUPS (TTV web)", url: "https://github.com/kyrux29/CTF_WRITEUPS" },
      { title: "NgoBaoDuyAnh/My-CTF-Journey (TTV web)", url: "https://github.com/NgoBaoDuyAnh/My-CTF-Journey" },
      { title: "HackMD — BKSEC-TTV 2025 pwn", url: "https://hackmd.io/eW6x3UCuQWOD9vT5s5V_Vg" },
      { title: "BKSEC Training", url: "https://training.bksec.vn" }
    ]
  }
);

DATA.find(s => s.id === "arsenal").items.push(
  {
    id: "arsenal",
    title: "Arsenal & commands",
    summary: "Lệnh và tool copy được ngay. Đây là bản tối giản; thêm dần sau TTV.",
    tags: ["tools", "commands", "arsenal"],
    priority: "medium",
    commands: [
      {
        title: "Pwn",
        code: C(
          "checksec --file=chall",
          "ROPgadget --binary chall | grep 'pop rdi'",
          "one_gadget libc.so.6",
          "seccomp-tools dump ./chall",
          "pwninit",
          "patchelf --set-interpreter ./ld-linux-x86-64.so.2 --set-rpath . ./chall"
        )
      },
      {
        title: "Web",
        code: C(
          "ffuf -u http://TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -mc all -fs 0",
          "feroxbuster -u http://TARGET",
          "jwt_tool TOKEN -T",
          "phpggc Laravel/RCE1 system id -b",
          "interactsh-client",
          "python3 -m http.server 8000"
        )
      },
      {
        title: "Pwntools skeleton",
        code: C(
          "from pwn import *",
          "",
          "context.binary = elf = ELF('./chall')",
          "libc = ELF('./libc.so.6')",
          "context.log_level = 'info'",
          "",
          "def start():",
          "    if args.REMOTE:",
          "        return remote('HOST', 1337)",
          "    return process(elf.path)",
          "",
          "p = start()",
          "# gdb.attach(p, 'b *main')",
          "p.interactive()"
        )
      }
    ],
    links: [
      { title: "libc.rip", url: "https://libc.rip/" },
      { title: "how2heap", url: "https://github.com/shellphish/how2heap" },
      { title: "SecLists", url: "https://github.com/danielmiessler/SecLists" },
      { title: "CyberChef", url: "https://gchq.github.io/CyberChef/" }
    ]
  }
);
