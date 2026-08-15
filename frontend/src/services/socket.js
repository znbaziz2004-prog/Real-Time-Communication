import { io } from "socket.io-client";

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken")
  );
};

const socket = io(
  "http://localhost:5000",
  {
    autoConnect: false,

    auth: {
      token: getToken(),
    },

    transports: ["websocket"],
  }
);

// =========================================================
// SOCKET CONNECT
// =========================================================

socket.on("connect", () => {
  console.log(
    "🔌 Socket connected:",
    socket.id
  );
});

// =========================================================
// SOCKET CONNECT ERROR
// =========================================================

socket.on(
  "connect_error",
  (error) => {
    console.error(
      "❌ Socket connection error:",
      error.message
    );
  }
);

// =========================================================
// SOCKET DISCONNECT
// =========================================================

socket.on(
  "disconnect",
  (reason) => {
    console.log(
      "🔌 Socket disconnected:",
      reason
    );
  }
);

export default socket;