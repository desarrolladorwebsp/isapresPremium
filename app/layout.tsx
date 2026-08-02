import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { EMBED_DOCUMENT_HEADER } from "@/lib/embed/is-embed-request";
import { createRootMetadata } from "@/constants/seo";
import "./globals.css";
import "@/styles/cotizador-engine.css";

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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a6b5e" },
    { media: "(prefers-color-scheme: dark)", color: "#064e45" },
  ],
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const isEmbedDocument = headerList.get(EMBED_DOCUMENT_HEADER) === "1";

  return (
    <html
      lang="es-CL"
      data-cotizador-embed={isEmbedDocument ? "true" : undefined}
      className={`${inter.variable} ${plusJakartaSans.variable} ${isEmbedDocument ? "" : "h-full"} overflow-x-clip overscroll-none antialiased`}
    >
      <body
        className={
          isEmbedDocument
            ? "block max-w-full overflow-x-clip overscroll-none bg-background font-sans text-foreground"
            : "flex min-h-full max-w-full flex-col overflow-x-clip overscroll-none bg-background font-sans text-foreground"
        }
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
