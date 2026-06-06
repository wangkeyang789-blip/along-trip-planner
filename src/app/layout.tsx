import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "同路 Along · AI 协作旅行规划",
  description: "多人边聊边规划，AI 把讨论实时变成可执行的旅行路线。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
