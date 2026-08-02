import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { IsapresMarquee } from "@/components/sections/IsapresMarquee";
import { JsonLd } from "@/components/seo/JsonLd";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { getHomeJsonLd } from "@/constants/seo";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLd data={getHomeJsonLd()} />
      <Navbar />
      {children}
      <IsapresMarquee />
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
