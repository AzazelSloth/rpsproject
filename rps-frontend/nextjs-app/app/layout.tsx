import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laroche 360",
  description: "Plateforme de gestion des risques psychosociaux",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23f0c15a' stroke='%23e1a63b' stroke-width='8'/></svg>",
        type: "image/svg+xml",
      },
    ],
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
