import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { StaffAccessLayout } from "@/components/auth/staff-access-layout";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Recuperar contraseña",
  description: "Solicita un enlace para restablecer tu contraseña de staff.",
  path: "/cotizador/acceso/recuperar-contrasena",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <StaffAccessLayout>
      <ForgotPasswordForm />
    </StaffAccessLayout>
  );
}
