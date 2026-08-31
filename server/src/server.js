const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const passport = require("./config/passport");
const connectDatabase = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");

const app = express();

app.use(cors());
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

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`Mulaqat server running on port ${PORT}`);
  });
};

startServer();