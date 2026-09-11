import { io, Socket } from "socket.io-client";
import type { NotificationItem } from "@/stores/notificationStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let socket: Socket | null = null;
let currentToken: string | null = null;

export const socketClient = {
  connect(token: string, onNotification: (notification: NotificationItem) => void) {
    if (socket?.connected && currentToken === token) return socket;

    socket?.disconnect();
    currentToken = token;
    socket = io(API_BASE, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("notification:new", onNotification);
    return socket;
  },

  disconnect() {
    socket?.disconnect();
    socket = null;
    currentToken = null;
  },
};
