import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <Image
        src="/logo-isapres-premium.png"
        alt="Isapres Premium"
        width={280}
        height={120}
        priority
        className="h-auto w-auto max-w-[280px]"
      />
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Isapres Premium
      </h1>
      <p className="max-w-md text-center text-sm text-zinc-600">
        Sitio en construcción. Próximamente más contenido.
      </p>
    </main>
  );
}
