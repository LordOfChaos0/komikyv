import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Коми кыв — интерактивная платформа изучения коми языка",
  description:
    "Изучайте коми язык с интерактивными уроками, диалоговым тренажёром на базе ИИ, произношением и геймификацией. Сохраняем язык народа коми.",
  keywords: [
    "коми язык",
    "коми кыв",
    "изучение коми",
    "финно-угорские языки",
    "Республика Коми",
    "онлайн обучение",
  ],
  authors: [{ name: "Коми кыв" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
