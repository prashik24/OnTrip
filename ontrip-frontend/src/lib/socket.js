import { io } from "socket.io-client";
import { API_URL, getToken } from "./api";

let socket = null;

export function getSocket() {
  if (socket) return socket;

  const token = getToken();

  socket = io(API_URL, {
    transports: ["websocket"],
    auth: {
      token,
    },
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}