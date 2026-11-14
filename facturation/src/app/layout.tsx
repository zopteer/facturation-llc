import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

// --font-archivo : police d'interface (corps de texte)
const spaceGrotesk = Space_Grotesk({
  variable: "--font-archivo",
  subsets: ["latin"],
});

// --font-fraunces : police d'affichage (titres, HUD)
const chakraPetch = Chakra_Petch({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// --font-plex-mono : afficheurs numériques (montants, numéros, dates)
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Facturation",
  description: "Factures et devis",
};

export const viewport: Viewport = {
  themeColor: "#070a14",
  viewportFit: "cover", // utilise toute la dalle de l'iPhone (encoche incluse)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${spaceGrotesk.variable} ${chakraPetch.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
