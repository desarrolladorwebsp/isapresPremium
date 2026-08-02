import { redirect } from "next/navigation";
import { STAFF_LOGIN_PATH } from "@/lib/auth/constants";

export default async function AdminLoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ? `?next=${encodeURIComponent(params.next)}` : "";
  redirect(`${STAFF_LOGIN_PATH}${next}`);
}
