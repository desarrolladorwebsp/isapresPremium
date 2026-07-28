import { Facebook, Instagram } from "lucide-react";

export function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
    </svg>
  );
}

const socialIconMap = {
  Facebook,
  Instagram,
  X: XIcon,
  TikTok: TikTokIcon,
} as const;

type SocialIconsProps = {
  links: readonly { label: keyof typeof socialIconMap | string; href: string }[];
  className?: string;
  iconClassName?: string;
};

export function SocialIcons({
  links,
  className = "flex items-center gap-3",
  iconClassName = "h-[18px] w-[18px]",
}: SocialIconsProps) {
  return (
    <div className={className}>
      {links.map(({ label, href }) => {
        const Icon =
          label in socialIconMap
            ? socialIconMap[label as keyof typeof socialIconMap]
            : null;

        if (!Icon) return null;

        return (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="text-zinc-700 transition-colors hover:text-zinc-900"
          >
            <Icon className={iconClassName} />
          </a>
        );
      })}
    </div>
  );
}
