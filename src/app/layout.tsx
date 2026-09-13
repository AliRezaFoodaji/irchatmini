import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export const metadata: Metadata = {
  title: "هم‌صحبت | چت ویدیویی تصادفی",
  description:
    "چت ویدیویی تصادفی با غریبه‌ها — دوربین و میکروفون را روشن کن و گفت‌وگو را شروع کن.",
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="flex min-h-svh flex-col">{children}</body>
    </html>
  );
}