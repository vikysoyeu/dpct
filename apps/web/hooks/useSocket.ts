"use client";

import { useEffect } from "react";
import { socketClient } from "@/lib/socket";
import { useNotificationStore } from "@/stores/notificationStore";

export function useSocket(token?: string | null) {
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    if (!token) {
      socketClient.disconnect();
      return;
    }

    const socket = socketClient.connect(token, addNotification);
    return () => {
      socket.off("notification:new", addNotification);
    };
  }, [addNotification, token]);
}
