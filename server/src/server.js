const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const passport = require("./config/passport");
const connectDatabase = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const socketHandler = require("./socket/socketHandler");

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Mulaqat server is running",
  });
});

// Initialize Socket.IO handlers
socketHandler(io);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();

  server.listen(PORT, () => {
    console.log(`Mulaqat server running on port ${PORT}`);
    console.log("Socket.IO server initialized");
  });
};

startServer();