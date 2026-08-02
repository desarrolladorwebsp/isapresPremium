import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { StaffAccessLayout } from "@/components/auth/staff-access-layout";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Restablecer contraseña",
  description: "Define una nueva contraseña para tu cuenta staff.",
  path: "/cotizador/acceso/restablecer-contrasena",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <StaffAccessLayout>
      <ResetPasswordForm />
    </StaffAccessLayout>
  );
}
