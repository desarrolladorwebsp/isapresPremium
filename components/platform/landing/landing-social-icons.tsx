export function LandingFacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M14 8h2.5V5.5H14c-2.2 0-3.5 1.3-3.5 3.6V11H8v2.7h2.5V21h3.1v-7.3H16l.5-2.7h-2.4V9.2c0-.8.2-1.2 1.2-1.2z" />
    </svg>
  );
}

export function LandingInstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LandingLinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6.5 8.5h3v10h-3v-10zm1.5-4.8a1.7 1.7 0 110 3.4 1.7 1.7 0 010-3.4zM10 8.5h2.9v1.4h.1c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.7v5.5h-3v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v4.9H10V8.5z" />
    </svg>
  );
}

export function LandingWhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a9.8 9.8 0 00-8.4 14.8L2 22l5.4-1.4A9.8 9.8 0 1012 2zm0 1.8a8 8 0 018 8.2c0 4.4-3.6 8-8 8a7.9 7.9 0 01-4-.9l-.3-.2-3.2.8.9-3.1-.2-.3A8 8 0 0112 3.8zm-2.3 4.5c-.1 0-.3.1-.4.3-.2.2-.7.7-.7 1.6 0 .9.7 1.9 1 2.1.1.1 1.2 1.9 3 2.6 1.5.6 1.8.5 2.1.5.3 0 1-.4 1.1-.8.1-.4.1-.8.1-.8s0-.1-.1-.2-.2-.1-.3-.1-.8-.3-1-.4-.2-.1-.3-.1-.1.2-.3.4-.5.5-.6.5s-.3 0-.6-.2c-.3-.2-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.1-.3 0-.4.1-.6.1-.1.1-.2.2-.3.1-.1.1-.2.1-.3 0-.1 0-.2-.1-.3l-.4-.9c-.1-.2-.2-.3-.3-.3z" />
    </svg>
  );
}

export function LandingSocialNetworkIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  switch (id) {
    case "facebook":
      return <LandingFacebookIcon className={className} />;
    case "instagram":
      return <LandingInstagramIcon className={className} />;
    case "linkedin":
      return <LandingLinkedInIcon className={className} />;
    case "whatsapp":
      return <LandingWhatsAppIcon className={className} />;
    default:
      return null;
  }
}
