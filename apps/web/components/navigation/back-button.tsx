"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type BackButtonProps = {
  children: ReactNode;
  className?: string;
  fallbackHref?: string;
};

export function BackButton({ children, className, fallbackHref = "/" }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref, { scroll: false });
  }

  return (
    <button type="button" onClick={handleBack} className={className}>
      {children}
    </button>
  );
}
