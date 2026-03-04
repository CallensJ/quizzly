import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Quizzly",
  description: "Application de quiz éducatif pour les 6–11 ans",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
