import { Suspense } from "react";
import { AppShell } from "@/components/rps/app-shell";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Suspense fallback={<div className="min-h-screen bg-[#f7f3eb]" />}>
    <AppShell>{children}</AppShell>
  </Suspense>;
}
