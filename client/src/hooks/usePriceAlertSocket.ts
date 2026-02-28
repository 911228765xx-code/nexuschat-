/**
 * usePriceAlertSocket
 *
 * Connects a Socket.IO client for the authenticated user and listens for
 * "price_alert" events emitted by the server when a price alert is triggered.
 * Shows a toast notification immediately — no polling required.
 */
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface PriceAlertPayload {
  alertId: number;
  tokenSymbol: string;
  condition: "above" | "below";
  targetPrice: number;
  currentPrice: number;
  content: string;
}

let _alertSocket: Socket | null = null;

function getAlertSocket(): Socket {
  if (!_alertSocket) {
    _alertSocket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return _alertSocket;
}

export function usePriceAlertSocket() {
  const { user, isAuthenticated } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getAlertSocket();

    const onConnect = () => {
      if (!registeredRef.current) {
        socket.emit("register_user", user.id);
        registeredRef.current = true;
      }
    };

    const onPriceAlert = (data: PriceAlertPayload) => {
      const directionEmoji = data.condition === "above" ? "📈" : "📉";
      toast(`${directionEmoji} Price Alert: ${data.tokenSymbol}`, {
        description: `Now $${data.currentPrice.toLocaleString()} — target $${data.targetPrice.toLocaleString()} reached!`,
        duration: 8000,
        action: {
          label: "View",
          onClick: () => {
            window.location.href = "/app/trading";
          },
        },
      });
    };

    socket.on("connect", onConnect);
    socket.on("price_alert", onPriceAlert);

    if (!socket.connected) {
      socket.connect();
    } else if (!registeredRef.current) {
      socket.emit("register_user", user.id);
      registeredRef.current = true;
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("price_alert", onPriceAlert);
      registeredRef.current = false;
    };
  }, [isAuthenticated, user]);
}
