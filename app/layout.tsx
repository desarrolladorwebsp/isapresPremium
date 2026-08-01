import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { IsapresMarquee } from "@/components/sections/IsapresMarquee";
import { JsonLd } from "@/components/seo/JsonLd";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { createRootMetadata, getHomeJsonLd } from "@/constants/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading-sans",
});

export const metadata: Metadata = createRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CL"
      className={`${inter.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <JsonLd data={getHomeJsonLd()} />
        <Navbar />
        {children}
        <IsapresMarquee />
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
