import Link from "next/link";
import { COTIZADOR_HOME } from "@/lib/app-routes";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
        Error 404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-primary-dark sm:text-3xl">
        Página no encontrada
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        La ruta que buscas no existe o ya no está disponible.
      </p>
      <Link
        href={COTIZADOR_HOME}
        className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-bold text-white shadow-[var(--shadow-cta)] transition hover:brightness-105"
      >
        Ir al cotizador
      </Link>
    </main>
  );
}
