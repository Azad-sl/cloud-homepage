import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "云端个人主页 | Cloud Home",
  description:
    "一个空灵的云端个人主页：流动的云、可定制的头像与签名、可编辑的链接与页脚。一键部署到 Vercel + Upstash Redis。",
  keywords: ["cloud", "homepage", "personal", "next.js", "vercel", "upstash"],
  authors: [{ name: "Cloud Home" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="antialiased"
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #1e4877 0%, #4584b4 100%)",
          backgroundAttachment: "fixed",
          color: "#fff",
          fontFamily:
            "'LXGW WenKai', 'LXGW WenKai Screen', 'Noto Serif SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
