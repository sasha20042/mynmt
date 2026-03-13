import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "НМТ — Пробне тестування",
  description: "Національний мультипредметний тест. Пробне тестування.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased min-h-screen`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
