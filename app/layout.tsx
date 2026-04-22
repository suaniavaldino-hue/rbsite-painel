import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Sora } from "next/font/google";

import { AppProviders } from "./providers";
import "./globals.css";

const displayFont = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const sansFont = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "RB Site Social Automation",
    template: "%s | RB Site Social Automation",
  },
  description:
    "Painel premium da RB Site para planejamento, geracao, organizacao e automacao de conteudos para Instagram e Facebook.",
  applicationName: "RB Site Social Automation",
  icons: {
    icon: [
      { url: "/brand/rbsite-favicon.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/rbsite-favicon.png", type: "image/png" }],
  },
  keywords: [
    "RB Site",
    "social media automation",
    "instagram",
    "facebook",
    "saas",
    "content planning",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
