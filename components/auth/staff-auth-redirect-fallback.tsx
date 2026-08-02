import Link from "next/link";

interface StaffAuthRedirectFallbackProps {
  title?: string;
  message?: string;
  href: string;
  linkLabel?: string;
}

export function StaffAuthRedirectFallback({
  title = "Redirigiendo al acceso…",
  message = "Necesitas iniciar sesión para continuar.",
  href,
  linkLabel = "Ir al inicio de sesión",
}: StaffAuthRedirectFallbackProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
        aria-hidden
      />
      <div>
        <p className="text-sm font-semibold text-primary-dark">{title}</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
      <Link
        href={href}
        className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white shadow-[var(--shadow-cta)] transition hover:brightness-105"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
