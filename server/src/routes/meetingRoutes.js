const express = require("express");

const {
  createMeeting,
  joinMeeting,
  getMeeting,
} = require("../controllers/meetingController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==============================
// CREATE MEETING
// ==============================
router.post("/", protect, createMeeting);

// ==============================
// JOIN MEETING
// ==============================
router.post("/join", protect, joinMeeting);

// ==============================
// GET MEETING
// ==============================
router.get("/:meetingId", protect, getMeeting);

module.exports = router;