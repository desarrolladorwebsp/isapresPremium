import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
