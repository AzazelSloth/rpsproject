import { Suspense } from "react";
import { AppShell } from "@/components/rps/app-shell";
import { requireServerSessionUser } from "@/lib/backend/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireServerSessionUser();

  return <Suspense fallback={<div className="min-h-screen bg-page" />}>
    <AppShell initialUser={user}>{children}</AppShell>
  </Suspense>;
}
