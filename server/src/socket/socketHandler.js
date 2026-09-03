const jwt = require("jsonwebtoken");
const Meeting = require("../models/Meeting");

const socketHandler = (io) => {
  // ======================================================
  // SOCKET AUTHENTICATION
  // ======================================================

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error("Authentication required")
        );
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      socket.userId = decoded.userId;

      next();
    } catch (error) {
      next(
        new Error("Invalid or expired token")
      );
    }
  });

  // ======================================================
  // CONNECTION
  // ======================================================

  io.on("connection", (socket) => {
    console.log(
      `Socket connected: ${socket.id}, User: ${socket.userId}`
    );

    // ====================================================
    // JOIN ROOM
    // ====================================================

    socket.on("join-room", ({ meetingId }) => {
      if (!meetingId) {
        return;
      }

      const roomId =
        meetingId.trim().toUpperCase();

      socket.meetingRoom = roomId;

      const existingRoom =
        io.sockets.adapter.rooms.get(roomId);

      const existingUsers = existingRoom
        ? [...existingRoom]
            .map((socketId) => {
              const existingSocket =
                io.sockets.sockets.get(socketId);

              if (!existingSocket) {
                return null;
              }

              return {
                socketId,
                userId:
                  existingSocket.userId,
              };
            })
            .filter(Boolean)
        : [];

      socket.join(roomId);

      console.log(
        `User ${socket.userId} joined room ${roomId}`
      );

      socket.emit(
        "room-users",
        existingUsers
      );

      socket.to(roomId).emit(
        "user-joined",
        {
          socketId: socket.id,
          userId: socket.userId,
        }
      );

      console.log(
        `Room ${roomId} now has ${
          existingUsers.length + 1
        } socket(s)`
      );
    });

    // ====================================================
    // LEAVE ROOM
    // ====================================================

    socket.on(
      "leave-room",
      ({ meetingId } = {}) => {
        const roomId =
          socket.meetingRoom ||
          meetingId?.trim().toUpperCase();

        if (!roomId) {
          return;
        }

        socket.leave(roomId);

        socket.to(roomId).emit(
          "user-left",
          {
            socketId: socket.id,
            userId: socket.userId,
          }
        );

        console.log(
          `User ${socket.userId} left room ${roomId}`
        );

        socket.meetingRoom = null;
      }
    );

    // ====================================================
    // END MEETING
    // ====================================================

    socket.on(
      "end-meeting",
      async ({ meetingId } = {}) => {
        try {
          if (!meetingId) {
            socket.emit(
              "meeting-end-error",
              {
                message:
                  "Meeting ID is required.",
              }
            );

            return;
          }

          const roomId =
            meetingId.trim().toUpperCase();

          // Host must be inside this meeting room
          if (
            socket.meetingRoom !== roomId
          ) {
            socket.emit(
              "meeting-end-error",
              {
                message:
                  "You are not connected to this meeting.",
              }
            );

            return;
          }

          const meeting =
            await Meeting.findOne({
              meetingId: roomId,
            });

          if (!meeting) {
            socket.emit(
              "meeting-end-error",
              {
                message:
                  "Meeting not found.",
              }
            );

            return;
          }

          // Verify host
          if (
            meeting.host.toString() !==
            socket.userId.toString()
          ) {
            socket.emit(
              "meeting-end-error",
              {
                message:
                  "Only the meeting host can end this meeting.",
              }
            );

            return;
          }

          /*
           * IMPORTANT:
           * REST API has already changed the DB status
           * to "ended".
           *
           * Therefore DON'T reject an already-ended
           * meeting here.
           */

          io.to(roomId).emit(
            "meeting-ended",
            {
              meetingId: roomId,
              endedBy: socket.userId,
            }
          );

          console.log(
            `Meeting ${roomId} ended by host ${socket.userId}`
          );
        } catch (error) {
          console.error(
            "Socket end meeting error:",
            error
          );

          socket.emit(
            "meeting-end-error",
            {
              message:
                "Failed to end meeting.",
            }
          );
        }
      }
    );

    // ====================================================
    // OFFER
    // ====================================================

    socket.on(
      "offer",
      ({ target, offer }) => {
        if (!target || !offer) {
          return;
        }

        const targetSocket =
          io.sockets.sockets.get(target);

        if (!targetSocket) {
          console.warn(
            "Offer target not found:",
            target
          );

          return;
        }

        if (
          socket.meetingRoom &&
          targetSocket.meetingRoom !==
            socket.meetingRoom
        ) {
          console.warn(
            "Blocked cross-room offer:",
            socket.id,
            target
          );

          return;
        }

        targetSocket.emit(
          "offer",
          {
            sender: socket.id,
            userId: socket.userId,
            offer,
          }
        );
      }
    );

    // ====================================================
    // ANSWER
    // ====================================================

    socket.on(
      "answer",
      ({ target, answer }) => {
        if (!target || !answer) {
          return;
        }

        const targetSocket =
          io.sockets.sockets.get(target);

        if (!targetSocket) {
          return;
        }

        if (
          socket.meetingRoom &&
          targetSocket.meetingRoom !==
            socket.meetingRoom
        ) {
          console.warn(
            "Blocked cross-room answer:",
            socket.id,
            target
          );

          return;
        }

        targetSocket.emit(
          "answer",
          {
            sender: socket.id,
            userId: socket.userId,
            answer,
          }
        );
      }
    );

    // ====================================================
    // ICE CANDIDATE
    // ====================================================

    socket.on(
      "ice-candidate",
      ({ target, candidate }) => {
        if (!target || !candidate) {
          return;
        }

        const targetSocket =
          io.sockets.sockets.get(target);

        if (!targetSocket) {
          return;
        }

        if (
          socket.meetingRoom &&
          targetSocket.meetingRoom !==
            socket.meetingRoom
        ) {
          console.warn(
            "Blocked cross-room ICE:",
            socket.id,
            target
          );

          return;
        }

        targetSocket.emit(
          "ice-candidate",
          {
            sender: socket.id,
            userId: socket.userId,
            candidate,
          }
        );
      }
    );

    // ====================================================
    // CHAT
    // ====================================================

    socket.on(
      "send-message",
      ({ message }) => {
        if (!socket.meetingRoom) {
          return;
        }

        if (
          typeof message !== "string"
        ) {
          return;
        }

        const trimmedMessage =
          message.trim();

        if (!trimmedMessage) {
          return;
        }

        if (
          trimmedMessage.length > 1000
        ) {
          socket.emit(
            "chat-error",
            {
              message:
                "Message cannot exceed 1000 characters.",
            }
          );

          return;
        }

        const chatMessage = {
          messageId: `${Date.now()}-${socket.id}`,
          socketId: socket.id,
          userId: socket.userId,
          message: trimmedMessage,
          timestamp:
            new Date().toISOString(),
        };

        io.to(socket.meetingRoom).emit(
          "chat-message",
          chatMessage
        );
      }
    );

    // ====================================================
    // DISCONNECT
    // ====================================================

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          `Socket disconnected: ${socket.id}, User: ${socket.userId}, Reason: ${reason}`
        );

        const roomId =
          socket.meetingRoom;

        if (!roomId) {
          return;
        }

        socket.to(roomId).emit(
          "user-left",
          {
            socketId: socket.id,
            userId: socket.userId,
          }
        );

        socket.meetingRoom = null;
      }
    );
  });
};

module.exports = socketHandler;