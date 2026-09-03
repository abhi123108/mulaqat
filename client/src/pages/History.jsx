import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const History = () => {
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingMeetingId, setDeletingMeetingId] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/meetings/history");

      setMeetings(response.data.meetings || []);
    } catch (error) {
      console.error("Meeting history error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load meeting history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (date) => {
    if (!date) return "Unknown";

    return new Date(date).toLocaleString();
  };

  const getStatusLabel = (status) => {
    if (status === "ended") {
      return "Ended";
    }

    return "Active";
  };

  const handleDeleteMeeting = async (meetingId) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${meetingId} from your history?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingMeetingId(meetingId);
      setError("");

      await api.delete(`/meetings/${meetingId}`);

      setMeetings((prevMeetings) =>
        prevMeetings.filter(
          (meeting) => meeting.meetingId !== meetingId
        )
      );
    } catch (error) {
      console.error("Delete meeting history error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to delete meeting history."
      );
    } finally {
      setDeletingMeetingId("");
    }
  };

  return (
    <div>
      <h1>Meeting History</h1>

      <button onClick={() => navigate("/")}>
        ← Back to Home
      </button>

      <hr />

      {loading && <p>Loading meeting history...</p>}

      {error && (
        <div>
          <p>{error}</p>

          <button onClick={fetchHistory}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && meetings.length === 0 && (
        <div>
          <h2>No meetings yet</h2>

          <p>
            Your created and joined meetings will
            appear here.
          </p>

          <button onClick={() => navigate("/")}>
            Create a Meeting
          </button>
        </div>
      )}

      {!loading && meetings.length > 0 && (
        <section>
          <h2>Your Meetings</h2>

          <p>
            Total meetings:{" "}
            <strong>{meetings.length}</strong>
          </p>

          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              style={{
                border: "1px solid #ccc",
                padding: "16px",
                marginBottom: "12px",
                borderRadius: "8px",
              }}
            >
              <h3>{meeting.meetingId}</h3>

              <p>
                <strong>Status:</strong>{" "}
                {getStatusLabel(meeting.status)}
              </p>

              <p>
                <strong>Participants:</strong>{" "}
                {meeting.participantCount}
              </p>

              <p>
                <strong>Created:</strong>{" "}
                {formatDate(meeting.createdAt)}
              </p>

              {meeting.endedAt && (
                <p>
                  <strong>Ended:</strong>{" "}
                  {formatDate(meeting.endedAt)}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "12px",
                }}
              >
                <button
                  onClick={() =>
                    navigate(
                      `/meeting/${meeting.meetingId}`
                    )
                  }
                >
                  Join Again
                </button>

                <button
                  onClick={() =>
                    handleDeleteMeeting(
                      meeting.meetingId
                    )
                  }
                  disabled={
                    deletingMeetingId ===
                    meeting.meetingId
                  }
                  style={{
                    border: "1px solid #ef4444",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    background: "transparent",
                    color: "#ef4444",
                    cursor:
                      deletingMeetingId ===
                      meeting.meetingId
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {deletingMeetingId ===
                  meeting.meetingId
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default History;