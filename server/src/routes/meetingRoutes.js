const express = require("express");

const {
  createMeeting,
  joinMeeting,
  getMeeting,
  endMeeting,
  getMeetingHistory,
  deleteMeeting,
} = require("../controllers/meetingController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE
router.post("/", protect, createMeeting);

// JOIN
router.post("/join", protect, joinMeeting);

// HISTORY
router.get("/history", protect, getMeetingHistory);

// END MEETING - HOST ONLY
router.post("/:meetingId/end", protect, endMeeting);

router.delete("/:meetingId", protect, deleteMeeting);

// GET MEETING
router.get("/:meetingId", protect, getMeeting);

module.exports = router;