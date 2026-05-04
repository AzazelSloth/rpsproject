import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laroche 360",
  description: "Plateforme de gestion des risques psychosociaux",
  icons: {
    icon: "/window.svg",
  },
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
