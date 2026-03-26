import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPS Platform",
  description: "Psychosocial Risk Management SaaS UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
