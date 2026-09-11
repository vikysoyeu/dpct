import { VolunteerAuthGuard } from "@/components/layout/volunteer-auth-guard";
import { VolunteerShell } from "@/components/layout/volunteer-shell";
import type { ReactNode } from "react";

export default function VolunteerLayout({ children }: { children: ReactNode }) {
  return (
    <VolunteerAuthGuard>
      <VolunteerShell>{children}</VolunteerShell>
    </VolunteerAuthGuard>
  );
}
