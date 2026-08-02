import { redirect } from "next/navigation";
import { staffSectionHref } from "@/lib/staff/staff-sections";

export default function LegacyAdminHomePage() {
  redirect(staffSectionHref("prospectos"));
}
