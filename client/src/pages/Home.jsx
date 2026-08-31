import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Home = () => {
  const navigate = useNavigate();

  const [meetingId, setMeetingId] = useState("");
  const [createdMeeting, setCreatedMeeting] = useState(null);

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("mulaqat_token");
    navigate("/login");
  };

  const handleCreateMeeting = async () => {
    setError("");
    setSuccess("");
    setLoadingCreate(true);

    try {
      const response = await api.post("/meetings");

      const meeting = response.data.meeting;

      setCreatedMeeting(meeting);
      setSuccess("Meeting created successfully.");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to create meeting. Please try again."
      );
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleJoinMeeting = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedMeetingId = meetingId.trim();

    if (!trimmedMeetingId) {
      setError("Please enter a meeting ID.");
      return;
    }

    setLoadingJoin(true);

    try {
      const response = await api.post("/meetings/join", {
        meetingId: trimmedMeetingId,
      });

      setSuccess(response.data.message);
      setMeetingId("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to join meeting. Please try again."
      );
    } finally {
      setLoadingJoin(false);
    }
  };

  return (
    <div>
      <h1>Mulaqat</h1>

      <p>Welcome to Mulaqat.</p>

      <button onClick={handleLogout}>Logout</button>

      <hr />

      <section>
        <h2>Create a Meeting</h2>

        <p>Start a new video meeting and share the meeting ID.</p>

        <button
          onClick={handleCreateMeeting}
          disabled={loadingCreate}
        >
          {loadingCreate ? "Creating..." : "Create Meeting"}
        </button>

        {createdMeeting && (
          <div>
            <h3>Meeting Created</h3>

            <p>
              Meeting ID: <strong>{createdMeeting.meetingId}</strong>
            </p>

            <p>Status: {createdMeeting.status}</p>

            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  createdMeeting.meetingId
                )
              }
            >
              Copy Meeting ID
            </button>
          </div>
        )}
      </section>

      <hr />

      <section>
        <h2>Join a Meeting</h2>

        <p>Enter a meeting ID to join an existing meeting.</p>

        <form onSubmit={handleJoinMeeting}>
          <input
            type="text"
            value={meetingId}
            onChange={(event) =>
              setMeetingId(event.target.value)
            }
            placeholder="e.g. MUL-774D71ED"
          />

          <button type="submit" disabled={loadingJoin}>
            {loadingJoin ? "Joining..." : "Join Meeting"}
          </button>
        </form>
      </section>

      {success && <p>{success}</p>}

      {error && <p>{error}</p>}
    </div>
  );
};

export default Home;