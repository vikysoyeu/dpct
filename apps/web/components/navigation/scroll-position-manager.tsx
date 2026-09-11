"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ScrollSnapshot = {
  x: number;
  y: number;
  pathname: string;
  search: string;
  expiresAt: number;
};

const PRESERVE_MS = 350;

function isSameDocumentControl(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  const control = target.closest("button, input[type='button'], input[type='reset'], select, [data-preserve-scroll]");
  if (!control) return false;

  const anchor = target.closest("a[href]");
  return !anchor;
}

export function ScrollPositionManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const snapshotRef = useRef<ScrollSnapshot | null>(null);
  const restoreFrameRef = useRef<number | null>(null);

  function stopRestoreLoop() {
    if (restoreFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
  }

  function startRestoreLoop() {
    stopRestoreLoop();

    function restore() {
      const snapshot = snapshotRef.current;
      if (!snapshot || Date.now() > snapshot.expiresAt) {
        snapshotRef.current = null;
        restoreFrameRef.current = null;
        return;
      }

      const stillSamePage = snapshot.pathname === window.location.pathname && snapshot.search === window.location.search;
      if (!stillSamePage) {
        restoreFrameRef.current = null;
        return;
      }

      window.scrollTo(snapshot.x, snapshot.y);
      restoreFrameRef.current = window.requestAnimationFrame(restore);
    }

    restoreFrameRef.current = window.requestAnimationFrame(restore);
  }

  useEffect(() => {
    function releaseUserScroll() {
      snapshotRef.current = null;
      stopRestoreLoop();
    }

    function remember() {
      snapshotRef.current = {
        x: window.scrollX,
        y: window.scrollY,
        pathname: window.location.pathname,
        search: window.location.search,
        expiresAt: Date.now() + PRESERVE_MS,
      };
      startRestoreLoop();
    }

    function onClick(event: MouseEvent) {
      if (isSameDocumentControl(event.target)) {
        remember();
      }
    }

    function onChange(event: Event) {
      if (event.target instanceof Element && event.target.closest("select")) {
        remember();
      }
    }

    function onSubmit() {
      remember();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("wheel", releaseUserScroll, { passive: true });
    window.addEventListener("touchmove", releaseUserScroll, { passive: true });
    window.addEventListener("keydown", releaseUserScroll, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("wheel", releaseUserScroll);
      window.removeEventListener("touchmove", releaseUserScroll);
      window.removeEventListener("keydown", releaseUserScroll, true);
      stopRestoreLoop();
    };
  }, []);

  useEffect(() => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;

    const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const stillSamePage = snapshot.pathname === pathname && snapshot.search === currentSearch;
    if (!stillSamePage || Date.now() > snapshot.expiresAt) {
      snapshotRef.current = null;
      return;
    }

    startRestoreLoop();
  }, [pathname, searchParams]);

  return null;
}
