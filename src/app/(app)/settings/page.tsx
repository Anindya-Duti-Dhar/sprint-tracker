import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <SettingsClient user={user} />;
}
