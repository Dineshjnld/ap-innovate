import { io, Socket } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type Callback = (...args: unknown[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(userId?: string) {
    if (this.socket?.connected) {
      if (userId && userId !== this.userId) {
        this.authenticate(userId);
      }
      return;
    }

    this.socket = io(API_BASE_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      if (this.userId) {
        this.socket?.emit("authenticate", this.userId);
      }
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    if (userId) {
      this.authenticate(userId);
    }
  }

  authenticate(userId: string) {
    this.userId = userId;
    this.socket?.emit("authenticate", userId);
  }

  getSocket() {
    if (!this.socket) {
      this.connect();
    }
    return this.socket;
  }

  joinProject(projectId: string) {
    this.socket?.emit("join-project", projectId);
  }

  leaveProject(projectId: string) {
    this.socket?.emit("leave-project", projectId);
  }

  sendTyping(toUserId: string) {
    this.socket?.emit("typing", { to: toUserId });
  }

  sendStopTyping(toUserId: string) {
    this.socket?.emit("stop-typing", { to: toUserId });
  }

  on(event: string, callback: Callback) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback: Callback) {
    this.socket?.off(event, callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }
}

export const socketService = new SocketService();
