import { redirect } from "next/navigation";
import { EXECUTIVE_CHANGE_PASSWORD_PATH } from "@/lib/auth/constants";

export default function LegacyAdminChangePasswordPage() {
  redirect(EXECUTIVE_CHANGE_PASSWORD_PATH);
}
