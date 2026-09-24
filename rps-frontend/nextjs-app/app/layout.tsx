import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const bricolage = localFont({
  src: "./fonts/BricolageGrotesque-Variable.ttf",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

const hanken = localFont({
  src: [
    { path: "./fonts/HankenGrotesk-Variable.ttf", weight: "100 900", style: "normal" },
    { path: "./fonts/HankenGrotesk-Italic-Variable.ttf", weight: "100 900", style: "italic" },
  ],
  variable: "--font-hanken",
  display: "swap",
});

const spaceMono = localFont({
  src: [
    { path: "./fonts/SpaceMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/SpaceMono-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Laroche 360",
  description: "Plateforme de gestion des risques psychosociaux",
  icons: {
    icon: "/branding/laroche360.png",
    shortcut: "/branding/laroche360.png",
    apple: "/branding/laroche360.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${hanken.variable} ${spaceMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
