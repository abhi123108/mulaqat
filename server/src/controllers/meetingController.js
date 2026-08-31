const crypto = require("crypto");
const Meeting = require("../models/Meeting");

// ==============================
// GENERATE MEETING ID
// ==============================
const generateMeetingId = () => {
  return `MUL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

// ==============================
// CREATE MEETING
// ==============================
const createMeeting = async (req, res) => {
  try {
    const userId = req.userId;

    let meetingId;
    let existingMeeting;

    // Ensure meeting ID is unique
    do {
      meetingId = generateMeetingId();

      existingMeeting = await Meeting.findOne({
        meetingId,
      });
    } while (existingMeeting);

    const meeting = await Meeting.create({
      meetingId,
      host: userId,
      participants: [userId],
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      meeting: {
        id: meeting._id,
        meetingId: meeting.meetingId,
        host: meeting.host,
        participants: meeting.participants,
        status: meeting.status,
        createdAt: meeting.createdAt,
      },
    });
  } catch (error) {
    console.error("Create meeting error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating meeting",
    });
  }
};

// ==============================
// JOIN MEETING
// ==============================
const joinMeeting = async (req, res) => {
  try {
    const userId = req.userId;
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: "Meeting ID is required",
      });
    }

    const normalizedMeetingId = meetingId.trim().toUpperCase();

    const meeting = await Meeting.findOne({
      meetingId: normalizedMeetingId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "This meeting has ended",
      });
    }

    // Don't add the same user twice
    const alreadyJoined = meeting.participants.some(
      (participant) => participant.toString() === userId.toString()
    );

    if (!alreadyJoined) {
      meeting.participants.push(userId);
      await meeting.save();
    }

    return res.status(200).json({
      success: true,
      message: alreadyJoined
        ? "Already joined this meeting"
        : "Meeting joined successfully",
      meeting: {
        id: meeting._id,
        meetingId: meeting.meetingId,
        host: meeting.host,
        participants: meeting.participants,
        status: meeting.status,
      },
    });
  } catch (error) {
    console.error("Join meeting error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while joining meeting",
    });
  }
};

// ==============================
// GET MEETING
// ==============================
const getMeeting = async (req, res) => {
  try {
    const userId = req.userId;
    const { meetingId } = req.params;

    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: "Meeting ID is required",
      });
    }

    const normalizedMeetingId = meetingId.trim().toUpperCase();

    const meeting = await Meeting.findOne({
      meetingId: normalizedMeetingId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const isParticipant = meeting.participants.some(
      (participant) => participant.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant of this meeting",
      });
    }

    return res.status(200).json({
      success: true,
      meeting: {
        id: meeting._id,
        meetingId: meeting.meetingId,
        host: meeting.host,
        participants: meeting.participants,
        status: meeting.status,
        createdAt: meeting.createdAt,
        endedAt: meeting.endedAt,
      },
    });
  } catch (error) {
    console.error("Get meeting error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching meeting",
    });
  }
};

module.exports = {
  createMeeting,
  joinMeeting,
  getMeeting,
};