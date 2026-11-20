import "./globals.css";

export const metadata = {
  title: "CTF Playbook — Web & Pwn",
  description: "Lab workspace với checklist block cho Web và Pwn."
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
