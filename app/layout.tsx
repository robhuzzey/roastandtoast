import type { Metadata } from "next";
import { Darumadrop_One } from "next/font/google";
import "./globals.css";

const font = Darumadrop_One({
  variable: "--font-daruma-drop-one",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Roast and Toast",
  description: "Exciting new cafe based in Golden Valley, Folkestone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${font.variable} antialiased`}>{children}</body>
    </html>
  );
}
