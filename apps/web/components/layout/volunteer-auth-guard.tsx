"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthStore, type VolunteerUser } from "@/stores/authStore";

type VolunteerAuthGuardProps = {
  children: ReactNode;
};

export function VolunteerAuthGuard({ children }: VolunteerAuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { volunteerToken, volunteer, loading, setVolunteerAuth, logoutVolunteer, setLoading } = useAuthStore();

  useEffect(() => {
    if (!volunteerToken) {
      setLoading(false);
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (volunteer) {
      setLoading(false);
      return;
    }

    apiClient
      .get<VolunteerUser>("/auth/volunteer/me")
      .then((data) => setVolunteerAuth(volunteerToken, data))
      .catch(() => {
        logoutVolunteer();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      });
  }, [volunteerToken, volunteer, pathname, router, setVolunteerAuth, logoutVolunteer, setLoading]);

  if (loading || !volunteer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-semibold text-text-subtle">Đang kiểm tra tài khoản tình nguyện viên...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
