import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Inter скачивается на этапе сборки и раздаётся с нашего же домена:
 * внешних запросов при загрузке нет, шрифт не подменяется на лету
 * и вёрстка не прыгает. Кириллица подключена явно.
 */
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "CRM · Честный сервис",
    template: "%s · Честный сервис",
  },
  description: "Заявки, мастера и аналитика сервиса ремонта бытовой техники",
  applicationName: "Честный сервис CRM",
  appleWebApp: {
    capable: true,
    title: "Честный сервис",
    statusBarStyle: "default",
  },
  // рабочий инструмент, в поиске ему делать нечего
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1019" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
