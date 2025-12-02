import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { Toaster } from "@/components/ui/Toaster";
import { RetroBackground } from "@/components/retro/RetroBackground";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Game Website",
  description: "Multiplayer Game Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <RetroBackground>
            <div className="relative flex min-h-screen flex-col font-retro-body">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </RetroBackground>
        </Providers>
      </body>
    </html>
  );
}
