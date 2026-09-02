import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let socket = null;

export const connectSocket = () => {
  const token = localStorage.getItem("mulaqat_token");

  if (!token) {
    throw new Error("Authentication required");
  }

  // IMPORTANT:
  // Agar socket already create ho chuka hai,
  // same socket return karo.
  if (socket) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    autoConnect: true,
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};