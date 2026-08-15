const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const authRoutes = require("./routes/authRoutes");
const verifyToken = require("./middleware/authMiddleware");

require("dotenv").config();

const app = express();

// =========================================================
// HTTP SERVER
// =========================================================

const server = http.createServer(app);

// =========================================================
// CORS
// =========================================================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// =========================================================
// AUTH ROUTES
// =========================================================

app.use("/api/auth", authRoutes);

// =========================================================
// MONGODB
// =========================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });

// =========================================================
// BASIC ROUTE
// =========================================================

app.get("/", (req, res) => {
  res.send("Server is running");
});

// =========================================================
// PROTECTED PROFILE
// =========================================================

app.get("/api/profile", verifyToken, (req, res) => {
  res.json({
    message: "Welcome to your profile",
    user: req.user,
  });
});

// =========================================================
// SOCKET.IO
// =========================================================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// =========================================================
// SOCKET AUTHENTICATION MIDDLEWARE
// =========================================================

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log(
        "❌ Socket connection rejected: No token"
      );

      return next(
        new Error("Authentication required")
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.user = decoded;

    console.log(
      "✅ Socket authenticated:",
      socket.id
    );

    next();
  } catch (error) {
    console.log(
      "❌ Socket authentication failed"
    );

    next(
      new Error("Invalid or expired token")
    );
  }
});

// =========================================================
// SOCKET CONNECTION
// =========================================================

io.on("connection", (socket) => {
  console.log(
    "🔌 Authenticated user connected:",
    socket.id
  );

  // =======================================================
  // JOIN ROOM
  // =======================================================

  socket.on("join-room", (roomId) => {
    if (!roomId) {
      return;
    }

    socket.join(roomId);

    console.log(
      `🚪 ${socket.id} joined room: ${roomId}`
    );

    // Tell existing user that someone joined
    socket.to(roomId).emit(
      "user-joined",
      {
        userId: socket.id,
      }
    );

    // Get current users
    const room =
      io.sockets.adapter.rooms.get(roomId);

    const users = room
      ? Array.from(room)
      : [];

    // Send users to current user
    socket.emit(
      "room-users",
      users
    );

    console.log(
      `👥 Users in room ${roomId}:`,
      users
    );
  });

  // =======================================================
  // WEBRTC OFFER
  // =======================================================

  socket.on(
    "offer",
    ({ offer, roomId }) => {
      console.log(
        "📤 Offer received from:",
        socket.id
      );

      socket.to(roomId).emit(
        "offer",
        offer
      );
    }
  );

  // =======================================================
  // WEBRTC ANSWER
  // =======================================================

  socket.on(
    "answer",
    ({ answer, roomId }) => {
      console.log(
        "📥 Answer received from:",
        socket.id
      );

      socket.to(roomId).emit(
        "answer",
        answer
      );
    }
  );

  // =======================================================
  // ICE CANDIDATE
  // =======================================================

  socket.on(
    "ice-candidate",
    ({ candidate, roomId }) => {
      socket.to(roomId).emit(
        "ice-candidate",
        candidate
      );
    }
  );

  // =======================================================
  // CHAT MESSAGE
  // =======================================================

  socket.on(
    "chat-message",
    ({ roomId, message }) => {
      if (!message?.trim()) {
        return;
      }

      console.log(
        `💬 Message from ${socket.id}:`,
        message
      );

      io.to(roomId).emit(
        "chat-message",
        {
          senderId: socket.id,
          message: message.trim(),
          timestamp: new Date(),
        }
      );
    }
  );

  // =======================================================
  // FILE SHARING
  // =======================================================

  socket.on(
    "file-share",
    ({ roomId, file }) => {
      if (!file) {
        return;
      }

      console.log(
        `📁 File shared by ${socket.id}:`,
        file.name
      );

      socket.to(roomId).emit(
        "file-share",
        {
          senderId: socket.id,
          file,
        }
      );
    }
  );

  // =======================================================
  // WHITEBOARD DRAW
  // =======================================================

  socket.on(
    "whiteboard-draw",
    ({ roomId, drawing }) => {
      if (!drawing) {
        return;
      }

      socket.to(roomId).emit(
        "whiteboard-draw",
        drawing
      );
    }
  );

  // =======================================================
  // WHITEBOARD CLEAR
  // =======================================================

  socket.on(
    "whiteboard-clear",
    (roomId) => {
      socket.to(roomId).emit(
        "whiteboard-clear"
      );
    }
  );

  // =======================================================
  // LEAVE ROOM
  // =======================================================

  socket.on(
    "leave-room",
    (roomId) => {
      socket.leave(roomId);

      console.log(
        `👋 ${socket.id} left room: ${roomId}`
      );

      socket.to(roomId).emit(
        "user-left",
        {
          userId: socket.id,
        }
      );
    }
  );

  // =======================================================
  // DISCONNECT
  // =======================================================

  socket.on("disconnect", () => {
    console.log(
      "❌ User disconnected:",
      socket.id
    );
  });
});

// =========================================================
// START SERVER
// =========================================================

const PORT =
  process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});