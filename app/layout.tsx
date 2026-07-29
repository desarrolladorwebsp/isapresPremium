import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
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

export const metadata: Metadata = {
  title: {
    default: "Isapres Premium",
    template: "%s | Isapres Premium",
  },
  description: "Asesoría especializada en planes de salud Isapres en Chile.",
  metadataBase: new URL("https://isaprespremium.cl"),
  openGraph: {
    title: "Isapres Premium",
    description: "Asesoría especializada en planes de salud Isapres en Chile.",
    url: "https://isaprespremium.cl",
    siteName: "Isapres Premium",
    locale: "es_CL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Navbar />
        {children}
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
