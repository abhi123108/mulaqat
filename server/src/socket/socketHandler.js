const jwt = require("jsonwebtoken");

const socketHandler = (io) => {
  /*
   * ---------------------------------------------------------
   * SOCKET AUTHENTICATION
   * ---------------------------------------------------------
   */

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token;

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
        new Error(
          "Invalid or expired token"
        )
      );
    }
  });

  /*
   * ---------------------------------------------------------
   * CONNECTION
   * ---------------------------------------------------------
   */

  io.on("connection", (socket) => {
    console.log(
      `Socket connected: ${socket.id}, User: ${socket.userId}`
    );

    /*
     * -------------------------------------------------------
     * JOIN ROOM
     * -------------------------------------------------------
     */

    socket.on(
      "join-room",
      ({ meetingId }) => {
        if (!meetingId) {
          return;
        }

        const roomId =
          meetingId.trim().toUpperCase();

        /*
         * Save room on socket.
         */
        socket.meetingRoom = roomId;

        /*
         * Get existing users BEFORE joining.
         */
        const existingRoom =
          io.sockets.adapter.rooms.get(
            roomId
          );

        const existingUsers =
          existingRoom
            ? [...existingRoom]
                .map((socketId) => {
                  const existingSocket =
                    io.sockets.sockets.get(
                      socketId
                    );

                  if (
                    !existingSocket
                  ) {
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

        /*
         * Join actual Socket.IO room.
         */
        socket.join(roomId);

        console.log(
          `User ${socket.userId} joined room ${roomId}`
        );

        /*
         * Tell NEW user about all existing users.
         */
        socket.emit(
          "room-users",
          existingUsers
        );

        /*
         * Tell EXISTING users about new user.
         */
        socket
          .to(roomId)
          .emit(
            "user-joined",
            {
              socketId:
                socket.id,
              userId:
                socket.userId,
            }
          );

        console.log(
          `Room ${roomId} now has ${
            existingUsers.length + 1
          } socket(s)`
        );
      }
    );

    /*
     * ---------------------------------------------------------
     * OFFER
     * ---------------------------------------------------------
     */

    socket.on(
      "offer",
      ({ target, offer }) => {
        if (!target || !offer) {
          return;
        }

        const targetSocket =
          io.sockets.sockets.get(
            target
          );

        if (!targetSocket) {
          console.warn(
            "Offer target not found:",
            target
          );

          return;
        }

        /*
         * Security:
         * Only allow signaling inside same meeting.
         */
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
            userId:
              socket.userId,
            offer,
          }
        );

        console.log(
          `Offer: ${socket.id} -> ${target}`
        );
      }
    );

    /*
     * ---------------------------------------------------------
     * ANSWER
     * ---------------------------------------------------------
     */

    socket.on(
      "answer",
      ({ target, answer }) => {
        if (!target || !answer) {
          return;
        }

        const targetSocket =
          io.sockets.sockets.get(
            target
          );

        if (!targetSocket) {
          console.warn(
            "Answer target not found:",
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
            userId:
              socket.userId,
            answer,
          }
        );

        console.log(
          `Answer: ${socket.id} -> ${target}`
        );
      }
    );

    /*
     * ---------------------------------------------------------
     * ICE CANDIDATE
     * ---------------------------------------------------------
     */

    socket.on(
      "ice-candidate",
      ({ target, candidate }) => {
        if (!target || !candidate) {
          return;
        }

        const targetSocket =
          io.sockets.sockets.get(
            target
          );

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
            userId:
              socket.userId,
            candidate,
          }
        );
      }
    );

    /*
     * ---------------------------------------------------------
     * DISCONNECT
     * ---------------------------------------------------------
     */

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

        /*
         * Notify everyone else in room.
         */
        socket
          .to(roomId)
          .emit(
            "user-left",
            {
              socketId:
                socket.id,
              userId:
                socket.userId,
            }
          );

        console.log(
          `User ${socket.userId} left room ${roomId}`
        );

        socket.meetingRoom = null;
      }
    );
  });
};

module.exports = socketHandler;