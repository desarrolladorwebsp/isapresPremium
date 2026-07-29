import { Facebook, Instagram, Linkedin } from "lucide-react";

const socialIconMap = {
  Facebook,
  Instagram,
  LinkedIn: Linkedin,
} as const;

type SocialLinkLabel = keyof typeof socialIconMap;

type SocialIconsProps = {
  links: readonly { label: SocialLinkLabel | string; href: string }[];
  className?: string;
  iconClassName?: string;
  linkClassName?: string;
};

export function SocialIcons({
  links,
  className = "flex items-center gap-1",
  iconClassName = "h-[18px] w-[18px]",
  linkClassName = "hover:bg-black/5",
}: SocialIconsProps) {
  return (
    <div className={className}>
      {links.map(({ label, href }) => {
        const Icon =
          label in socialIconMap
            ? socialIconMap[label as SocialLinkLabel]
            : null;

        if (!Icon) return null;

        return (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-current transition-colors ${linkClassName}`}
          >
            <Icon className={iconClassName} />
          </a>
        );
      })}
    </div>
  );
}
