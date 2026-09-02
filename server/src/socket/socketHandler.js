const jwt = require("jsonwebtoken");

const socketHandler = (io) => {
  // Socket authentication
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.userId;

      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}, User: ${socket.userId}`);

    // =========================
    // JOIN MEETING ROOM
    // =========================
    socket.on("join-room", ({ meetingId }) => {
      if (!meetingId) return;

      const roomId = meetingId.trim().toUpperCase();

      socket.meetingRoom = roomId;

      const existingRoom = io.sockets.adapter.rooms.get(roomId);

      const existingUsers = existingRoom
        ? [...existingRoom]
            .map((socketId) => {
              const existingSocket = io.sockets.sockets.get(socketId);

              if (!existingSocket) return null;

              return {
                socketId,
                userId: existingSocket.userId,
              };
            })
            .filter(Boolean)
        : [];

      socket.join(roomId);

      console.log(`User ${socket.userId} joined room ${roomId}`);

      // Send existing users to newly joined user
      socket.emit("room-users", existingUsers);

      // Notify existing users
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        userId: socket.userId,
      });

      console.log(
        `Room ${roomId} now has ${existingUsers.length + 1} socket(s)`
      );
    });

    // =========================
    // WEBRTC OFFER
    // =========================
    socket.on("offer", ({ target, offer }) => {
      if (!target || !offer) return;

      const targetSocket = io.sockets.sockets.get(target);

      if (!targetSocket) {
        console.warn("Offer target not found:", target);
        return;
      }

      if (
        socket.meetingRoom &&
        targetSocket.meetingRoom !== socket.meetingRoom
      ) {
        console.warn("Blocked cross-room offer:", socket.id, target);
        return;
      }

      targetSocket.emit("offer", {
        sender: socket.id,
        userId: socket.userId,
        offer,
      });

      console.log(`Offer: ${socket.id} -> ${target}`);
    });

    // =========================
    // WEBRTC ANSWER
    // =========================
    socket.on("answer", ({ target, answer }) => {
      if (!target || !answer) return;

      const targetSocket = io.sockets.sockets.get(target);

      if (!targetSocket) {
        console.warn("Answer target not found:", target);
        return;
      }

      if (
        socket.meetingRoom &&
        targetSocket.meetingRoom !== socket.meetingRoom
      ) {
        console.warn("Blocked cross-room answer:", socket.id, target);
        return;
      }

      targetSocket.emit("answer", {
        sender: socket.id,
        userId: socket.userId,
        answer,
      });

      console.log(`Answer: ${socket.id} -> ${target}`);
    });

    // =========================
    // ICE CANDIDATE
    // =========================
    socket.on("ice-candidate", ({ target, candidate }) => {
      if (!target || !candidate) return;

      const targetSocket = io.sockets.sockets.get(target);

      if (!targetSocket) return;

      if (
        socket.meetingRoom &&
        targetSocket.meetingRoom !== socket.meetingRoom
      ) {
        console.warn("Blocked cross-room ICE:", socket.id, target);
        return;
      }

      targetSocket.emit("ice-candidate", {
        sender: socket.id,
        userId: socket.userId,
        candidate,
      });
    });

    // =========================
    // CHAT MESSAGE
    // =========================
    socket.on("send-message", ({ message }) => {
      // User must be inside a meeting
      if (!socket.meetingRoom) {
        console.warn(
          `Chat message rejected: ${socket.id} is not in a meeting`
        );
        return;
      }

      // Validate message
      if (typeof message !== "string") {
        return;
      }

      const trimmedMessage = message.trim();

      // Ignore empty messages
      if (!trimmedMessage) {
        return;
      }

      // Prevent extremely large messages
      if (trimmedMessage.length > 1000) {
        socket.emit("chat-error", {
          message: "Message cannot exceed 1000 characters.",
        });
        return;
      }

      const chatMessage = {
        messageId: `${Date.now()}-${socket.id}`,
        socketId: socket.id,
        userId: socket.userId,
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
      };

      // Send message to everyone in the same meeting
      io.to(socket.meetingRoom).emit("chat-message", chatMessage);

      console.log(
        `Chat message in ${socket.meetingRoom} from ${socket.userId}: ${trimmedMessage}`
      );
    });

    // =========================
    // DISCONNECT
    // =========================
    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${socket.id}, User: ${socket.userId}, Reason: ${reason}`
      );

      const roomId = socket.meetingRoom;

      if (!roomId) return;

      socket.to(roomId).emit("user-left", {
        socketId: socket.id,
        userId: socket.userId,
      });

      console.log(`User ${socket.userId} left room ${roomId}`);

      socket.meetingRoom = null;
    });
  });
};

module.exports = socketHandler;