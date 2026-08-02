import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { EXECUTIVE_HOME_PATH } from "@/lib/auth/constants";

export default function ExecutiveChangePasswordPage() {
  return (
    <ChangePasswordForm
      realm="executive"
      title="Actualiza tu contraseña"
      subtitle="Por seguridad debes reemplazar la clave temporal antes de continuar."
      redirectTo={EXECUTIVE_HOME_PATH}
    />
  );
}
