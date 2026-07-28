import Image from "next/image";
import { ISAPRE_LOGOS } from "@/constants/isapres";

type LogoItemProps = {
  src: string;
  alt: string;
  hidden?: boolean;
};

function LogoItem({ src, alt, hidden = false }: LogoItemProps) {
  return (
    <div
      className="flex h-14 w-40 shrink-0 items-center justify-center sm:h-16 sm:w-44 md:h-[72px] md:w-48"
      aria-hidden={hidden || undefined}
    >
      <Image
        src={src}
        alt={hidden ? "" : alt}
        width={192}
        height={72}
        className="h-12 w-auto max-h-[72px] max-w-[192px] object-contain sm:h-14 md:h-16"
        draggable={false}
      />
    </div>
  );
}

export function IsapresMarquee() {
  const logos = [...ISAPRE_LOGOS, ...ISAPRE_LOGOS];

  return (
    <section
      className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10"
      aria-label="Isapres con las que trabajamos"
    >
      <div className="mx-auto max-w-6xl rounded-3xl bg-zinc-100 px-6 py-12 sm:px-10 sm:py-14 md:py-16">
        <p className="mx-auto max-w-3xl text-center text-lg font-bold leading-snug text-brand-teal-dark sm:text-xl md:text-2xl">
          Tenemos todos los planes de todas las isapres y tenemos a los mejores
          analistas que encuentran el mejor para ti.
        </p>

        <div className="marquee group mt-10 overflow-hidden sm:mt-12 md:mt-14">
          <div className="marquee-track flex w-max items-center gap-14 sm:gap-16 md:gap-20">
            {logos.map((logo, index) => (
              <LogoItem
                key={`${logo.name}-${index}`}
                src={logo.src}
                alt={logo.alt}
                hidden={index >= ISAPRE_LOGOS.length}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
