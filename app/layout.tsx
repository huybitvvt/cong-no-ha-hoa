import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quản lý công nợ | NPP Hà Hoà",
  description: "Hệ thống quản lý công nợ khách hàng Nhà phân phối Hà Hoà",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
