"use client";

import { joinClasses } from "@/lib/utils";

export function getStaffInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function StaffAvatar({
  fullName,
  avatarUrl,
  className,
}: {
  fullName: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "premium-user-avatar relative flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold",
        className,
      )}
      aria-hidden
    >
      {avatarUrl ? (
        // URL puede ser Blob CDN o /api/staff/avatars/:id
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        getStaffInitials(fullName)
      )}
    </div>
  );
}
