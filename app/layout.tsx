
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const jetBrainsMono = localFont({
  src: [
    {
      path: './fonts/JetBrainsMono-Variable.ttf',
      style: 'normal',
    },
    {
      path: './fonts/JetBrainsMono-Italic-Variable.ttf',
      style: 'italic',
    },
  ],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "TVGuide",
  description: "Modern TV Guide Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${jetBrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
