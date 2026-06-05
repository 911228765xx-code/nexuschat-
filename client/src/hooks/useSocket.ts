/**
 * useSocket — Socket.IO 实时聊天 Hook
 * 管理连接、加入/离开群组、发送/接收消息、打字状态
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface SocketMessage {
  id: number;
  groupId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string | null;
  senderRole?: "owner" | "admin" | "member";
  content: string;
  messageType: "text" | "image" | "file";
  mediaUrl?: string;
  createdAt: Date;
}

interface UseSocketOptions {
  userId?: number;
  userName?: string;
}

export function useSocket({ userId, userName }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const socket = io(window.location.origin, {
      path: "/api/socket.io",
      // Server derives identity from the session cookie; send it on the handshake.
      withCredentials: true,
      auth: { userId: String(userId), userName: userName || "User" },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setConnected(true);
      // connected
    });

    socket.on("disconnect", () => {
      setConnected(false);
      // disconnected
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, userName]);

  const joinGroup = useCallback((groupId: number) => {
    socketRef.current?.emit("join_group", groupId);
  }, []);

  const leaveGroup = useCallback((groupId: number) => {
    socketRef.current?.emit("leave_group", groupId);
  }, []);

  const sendMessage = useCallback(
    (data: {
      groupId: number;
      content: string;
      messageType?: "text" | "image" | "file" | "video" | "redpacket" | "transfer";
      mediaUrl?: string;
      redPacketAmount?: string;
      redPacketToken?: string;
      redPacketNote?: string;
      transferAmount?: string;
      transferToken?: string;
      transferNote?: string;
    }) => {
      socketRef.current?.emit("send_message", {
        groupId: data.groupId,
        content: data.content,
        messageType: data.messageType || "text",
        mediaUrl: data.mediaUrl,
        redPacketAmount: data.redPacketAmount,
        redPacketToken: data.redPacketToken,
        redPacketNote: data.redPacketNote,
        transferAmount: data.transferAmount,
        transferToken: data.transferToken,
        transferNote: data.transferNote,
      });
    },
    []
  );

  const sendTyping = useCallback((groupId: number, isTyping: boolean) => {
    socketRef.current?.emit("typing", { groupId, isTyping });
  }, []);

  const onMessage = useCallback((handler: (msg: SocketMessage) => void) => {
    socketRef.current?.on("new_message", handler);
    return () => {
      socketRef.current?.off("new_message", handler);
    };
  }, []);

  const onTyping = useCallback(
    (handler: (data: { userId: string; userName: string; isTyping: boolean }) => void) => {
      socketRef.current?.on("user_typing", handler);
      return () => {
        socketRef.current?.off("user_typing", handler);
      };
    },
    []
  );

  const onCustomEvent = useCallback((event: string, handler: (data: unknown) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return { connected, joinGroup, leaveGroup, sendMessage, sendTyping, onMessage, onTyping, onCustomEvent };
}
