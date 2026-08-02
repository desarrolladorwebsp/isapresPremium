import { redirect } from "next/navigation";
import { staffSectionHref } from "@/lib/staff/staff-sections";

export default function LegacyAdminUsersPage() {
  redirect(staffSectionHref("usuarios"));
}
