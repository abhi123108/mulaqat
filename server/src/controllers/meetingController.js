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

    const alreadyJoined = meeting.participants.some(
      (participant) =>
        participant.toString() === userId.toString()
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
      (participant) =>
        participant.toString() === userId.toString()
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

// ==============================
// END MEETING
// ==============================
const endMeeting = async (req, res) => {
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

    // Only host can end the meeting
    if (meeting.host.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the meeting host can end this meeting",
      });
    }

    // Meeting already ended
    if (meeting.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "This meeting has already ended",
        meeting: {
          meetingId: meeting.meetingId,
          status: meeting.status,
          endedAt: meeting.endedAt,
        },
      });
    }

    meeting.status = "ended";
    meeting.endedAt = new Date();

    await meeting.save();

    return res.status(200).json({
      success: true,
      message: "Meeting ended successfully",
      meeting: {
        id: meeting._id,
        meetingId: meeting.meetingId,
        status: meeting.status,
        endedAt: meeting.endedAt,
      },
    });
  } catch (error) {
    console.error("End meeting error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while ending meeting",
    });
  }
};

const deleteMeeting = async (req, res) => {
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

    // Only the meeting host can delete it from history
    if (meeting.host.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the meeting host can delete this history",
      });
    }

    await Meeting.deleteOne({
      _id: meeting._id,
    });

    return res.status(200).json({
      success: true,
      message: "Meeting history deleted successfully",
    });
  } catch (error) {
    console.error("Delete meeting history error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting meeting history",
    });
  }
};

// ==============================
// GET MEETING HISTORY
// ==============================
const getMeetingHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const meetings = await Meeting.find({
      $or: [
        { host: userId },
        { participants: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .select(
        "meetingId host participants status createdAt updatedAt endedAt"
      )
      .lean();

    const history = meetings.map((meeting) => ({
      id: meeting._id,
      meetingId: meeting.meetingId,
      host: meeting.host,
      participantCount: meeting.participants?.length || 0,
      status: meeting.status,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
      endedAt: meeting.endedAt || null,
    }));

    return res.status(200).json({
      success: true,
      count: history.length,
      meetings: history,
    });
  } catch (error) {
    console.error("Get meeting history error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching meeting history",
    });
  }
};

module.exports = {
  createMeeting,
  joinMeeting,
  getMeeting,
  endMeeting,
  getMeetingHistory,
  deleteMeeting,
};