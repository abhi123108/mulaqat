const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDatabase = require("./config/db");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

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
