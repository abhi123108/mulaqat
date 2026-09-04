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

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (status) => {
    return status === "ended" ? "Ended" : "Active";
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
    <div style={styles.page}>
      <div style={styles.backgroundGlowOne}></div>
      <div style={styles.backgroundGlowTwo}></div>

      <header style={styles.header}>
        <div style={styles.brandSection}>
          <img
            src="/mulaqat-logo-horizontal.png"
            alt="Mulaqat"
            style={styles.logo}
          />
        </div>

        <button
          onClick={() => navigate("/")}
          style={styles.backButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#1b2433";
            e.currentTarget.style.borderColor = "#344154";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#111827";
            e.currentTarget.style.borderColor = "#273244";
          }}
        >
          <span style={styles.backIcon}>←</span>
          Back to Home
        </button>
      </header>

      <main style={styles.container}>
        <section style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>
              <span style={styles.eyebrowDot}></span>
              MEETING ACTIVITY
            </div>

            <h1 style={styles.title}>Meeting History</h1>

            <p style={styles.subtitle}>
              View your previous meetings, reconnect with a session,
              or manage your meeting history.
            </p>
          </div>

          {!loading && !error && meetings.length > 0 && (
            <div style={styles.totalCard}>
              <span style={styles.totalLabel}>TOTAL MEETINGS</span>
              <strong style={styles.totalNumber}>
                {meetings.length}
              </strong>
            </div>
          )}
        </section>

        {loading && (
          <div style={styles.stateCard}>
            <div style={styles.spinner}></div>

            <h2 style={styles.stateTitle}>
              Loading your meetings
            </h2>

            <p style={styles.stateText}>
              Please wait while we fetch your meeting history.
            </p>
          </div>
        )}

        {error && (
          <div style={styles.errorCard}>
            <div style={styles.errorIcon}>!</div>

            <div style={styles.errorContent}>
              <h3 style={styles.errorTitle}>
                Something went wrong
              </h3>

              <p style={styles.errorText}>{error}</p>
            </div>

            <button
              onClick={fetchHistory}
              style={styles.retryButton}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && meetings.length === 0 && (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                />
                <path d="M8 10h8M8 14h5" />
              </svg>
            </div>

            <h2 style={styles.emptyTitle}>
              No meetings yet
            </h2>

            <p style={styles.emptyText}>
              Your created and joined meetings will appear here.
              Start your first meeting to build your history.
            </p>

            <button
              onClick={() => navigate("/")}
              style={styles.primaryButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 10px 30px rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Create a Meeting
              <span>→</span>
            </button>
          </div>
        )}

        {!loading && meetings.length > 0 && (
          <section>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Your Meetings
                </h2>

                <p style={styles.sectionSubtitle}>
                  Recently created and joined sessions
                </p>
              </div>
            </div>

            <div style={styles.meetingList}>
              {meetings.map((meeting) => {
                const isDeleting =
                  deletingMeetingId === meeting.meetingId;

                return (
                  <article
                    key={meeting.id}
                    style={styles.meetingCard}
                  >
                    <div style={styles.meetingTop}>
                      <div style={styles.meetingIdentity}>
                        <div style={styles.meetingIcon}>
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                          >
                            <rect
                              x="3"
                              y="5"
                              width="18"
                              height="14"
                              rx="2"
                            />
                            <path d="M8 9h8M8 13h5" />
                          </svg>
                        </div>

                        <div>
                          <div style={styles.meetingLabel}>
                            MEETING ID
                          </div>

                          <h3 style={styles.meetingId}>
                            {meeting.meetingId}
                          </h3>
                        </div>
                      </div>

                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(meeting.status === "ended"
                            ? styles.endedBadge
                            : styles.activeBadge),
                        }}
                      >
                        <span
                          style={{
                            ...styles.statusDot,
                            ...(meeting.status === "ended"
                              ? styles.endedDot
                              : styles.activeDot),
                          }}
                        ></span>

                        {getStatusLabel(meeting.status)}
                      </span>
                    </div>

                    <div style={styles.divider}></div>

                    <div style={styles.metaGrid}>
                      <div style={styles.metaItem}>
                        <span style={styles.metaLabel}>
                          PARTICIPANTS
                        </span>

                        <span style={styles.metaValue}>
                          <span style={styles.peopleIcon}>◉</span>
                          {meeting.participantCount}
                        </span>
                      </div>

                      <div style={styles.metaItem}>
                        <span style={styles.metaLabel}>
                          CREATED
                        </span>

                        <span style={styles.metaValue}>
                          {formatDate(meeting.createdAt)}
                        </span>
                      </div>

                      {meeting.endedAt && (
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>
                            ENDED
                          </span>

                          <span style={styles.metaValue}>
                            {formatDate(meeting.endedAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={styles.actions}>
                      <button
                        onClick={() =>
                          navigate(
                            `/meeting/${meeting.meetingId}`
                          )
                        }
                        style={styles.joinButton}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform =
                            "translateY(-1px)";
                          e.currentTarget.style.boxShadow =
                            "0 8px 24px rgba(255,255,255,0.07)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform =
                            "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "none";
                        }}
                      >
                        Join Again
                        <span>→</span>
                      </button>

                      <button
                        onClick={() =>
                          handleDeleteMeeting(
                            meeting.meetingId
                          )
                        }
                        disabled={isDeleting}
                        style={{
                          ...styles.deleteButton,
                          ...(isDeleting
                            ? styles.deleteDisabled
                            : {}),
                        }}
                        onMouseEnter={(e) => {
                          if (!isDeleting) {
                            e.currentTarget.style.background =
                              "rgba(239,68,68,0.1)";
                            e.currentTarget.style.borderColor =
                              "rgba(239,68,68,0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDeleting) {
                            e.currentTarget.style.background =
                              "transparent";
                            e.currentTarget.style.borderColor =
                              "#3a2730";
                          }
                        }}
                      >
                        {isDeleting ? (
                          <>
                            <span
                              style={styles.smallSpinner}
                            ></span>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <span>⌫</span>
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.45;
          }
          50% {
            opacity: 1;
          }
        }

        * {
          box-sizing: border-box;
        }

        button {
          font-family: inherit;
        }

        @media (max-width: 700px) {
          .history-container {
            padding: 0 18px 50px !important;
          }

          .history-header {
            padding: 18px !important;
          }

          .history-hero {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .history-total {
            align-self: flex-start !important;
          }

          .history-meta {
            grid-template-columns: 1fr !important;
          }

          .history-actions {
            flex-direction: column !important;
          }

          .history-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 0%, rgba(63,81,104,0.16), transparent 30%), #080b11",
    color: "#f8fafc",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  backgroundGlowOne: {
    position: "fixed",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background: "rgba(59,130,246,0.035)",
    filter: "blur(100px)",
    top: "-180px",
    right: "-100px",
    pointerEvents: "none",
  },

  backgroundGlowTwo: {
    position: "fixed",
    width: "380px",
    height: "380px",
    borderRadius: "50%",
    background: "rgba(139,92,246,0.025)",
    filter: "blur(110px)",
    bottom: "-180px",
    left: "-100px",
    pointerEvents: "none",
  },

  header: {
    height: "76px",
    padding: "0 42px",
    borderBottom: "1px solid #151c28",
    background: "rgba(8,11,17,0.86)",
    backdropFilter: "blur(14px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    zIndex: 2,
  },

  brandSection: {
    display: "flex",
    alignItems: "center",
  },

  logo: {
    width: "142px",
    height: "auto",
    display: "block",
  },

  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 14px",
    background: "#111827",
    border: "1px solid #273244",
    borderRadius: "9px",
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  backIcon: {
    fontSize: "17px",
    lineHeight: 1,
  },

  container: {
    maxWidth: "1080px",
    margin: "0 auto",
    padding: "62px 28px 80px",
    position: "relative",
    zIndex: 1,
  },

  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "30px",
    marginBottom: "42px",
  },

  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    marginBottom: "13px",
  },

  eyebrowDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#94a3b8",
  },

  title: {
    margin: 0,
    fontSize: "38px",
    lineHeight: 1.1,
    letterSpacing: "-1.2px",
    fontWeight: "700",
    color: "#f8fafc",
  },

  subtitle: {
    margin: "12px 0 0",
    maxWidth: "610px",
    color: "#7f8da3",
    fontSize: "15px",
    lineHeight: 1.65,
  },

  totalCard: {
    minWidth: "130px",
    padding: "17px 20px",
    background: "#0e141e",
    border: "1px solid #202a39",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  totalLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "1.3px",
  },

  totalNumber: {
    fontSize: "25px",
    lineHeight: 1,
    color: "#f1f5f9",
  },

  stateCard: {
    minHeight: "300px",
    background: "#0c1119",
    border: "1px solid #1b2533",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px",
  },

  spinner: {
    width: "34px",
    height: "34px",
    border: "3px solid #263244",
    borderTopColor: "#e2e8f0",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginBottom: "22px",
  },

  stateTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
    color: "#e2e8f0",
  },

  stateText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  errorCard: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "18px",
    background: "rgba(127,29,29,0.13)",
    border: "1px solid #45232b",
    borderRadius: "12px",
  },

  errorIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "rgba(239,68,68,0.12)",
    color: "#f87171",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    flexShrink: 0,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    margin: 0,
    color: "#fca5a5",
    fontSize: "14px",
    fontWeight: "600",
  },

  errorText: {
    margin: "4px 0 0",
    color: "#9f7b82",
    fontSize: "12px",
  },

  retryButton: {
    padding: "9px 14px",
    background: "#171d28",
    border: "1px solid #303b4c",
    borderRadius: "8px",
    color: "#dbe4ef",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },

  emptyCard: {
    minHeight: "360px",
    background: "#0c1119",
    border: "1px solid #1b2533",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "50px 25px",
  },

  emptyIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "18px",
    background: "#111925",
    border: "1px solid #243044",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "22px",
  },

  emptyTitle: {
    margin: 0,
    color: "#e2e8f0",
    fontSize: "21px",
    fontWeight: "650",
  },

  emptyText: {
    maxWidth: "470px",
    margin: "10px auto 24px",
    color: "#68778d",
    fontSize: "13px",
    lineHeight: 1.7,
  },

  primaryButton: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "11px 17px",
    background: "#f1f5f9",
    border: "1px solid #f1f5f9",
    borderRadius: "9px",
    color: "#080b11",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "17px",
  },

  sectionTitle: {
    margin: 0,
    color: "#e2e8f0",
    fontSize: "18px",
    fontWeight: "650",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#5f6e83",
    fontSize: "12px",
  },

  meetingList: {
    display: "flex",
    flexDirection: "column",
    gap: "13px",
  },

  meetingCard: {
    background:
      "linear-gradient(145deg, rgba(17,24,34,0.96), rgba(11,16,24,0.96))",
    border: "1px solid #202b3a",
    borderRadius: "14px",
    padding: "21px",
    transition: "border-color 0.2s ease",
  },

  meetingTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  meetingIdentity: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0,
  },

  meetingIcon: {
    width: "43px",
    height: "43px",
    borderRadius: "10px",
    background: "#151e2b",
    border: "1px solid #273447",
    color: "#8da0b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  meetingLabel: {
    color: "#56667b",
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "1.2px",
    marginBottom: "4px",
  },

  meetingId: {
    margin: 0,
    color: "#e5eaf1",
    fontSize: "15px",
    fontWeight: "650",
    letterSpacing: "0.3px",
    wordBreak: "break-all",
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  activeBadge: {
    background: "rgba(34,197,94,0.08)",
    color: "#86efac",
    border: "1px solid rgba(34,197,94,0.18)",
  },

  endedBadge: {
    background: "rgba(100,116,139,0.09)",
    color: "#94a3b8",
    border: "1px solid rgba(100,116,139,0.18)",
  },

  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },

  activeDot: {
    background: "#4ade80",
  },

  endedDot: {
    background: "#64748b",
  },

  divider: {
    height: "1px",
    background: "#1b2532",
    margin: "18px 0",
  },

  metaGrid: {
    display: "grid",
    gridTemplateColumns: "0.8fr 1.2fr 1.2fr",
    gap: "20px",
  },

  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    minWidth: 0,
  },

  metaLabel: {
    color: "#526176",
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "1.1px",
  },

  metaValue: {
    color: "#aab6c7",
    fontSize: "12px",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },

  peopleIcon: {
    color: "#71829a",
    marginRight: "6px",
  },

  actions: {
    display: "flex",
    gap: "9px",
    marginTop: "19px",
  },

  joinButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    padding: "9px 15px",
    background: "#e8edf3",
    border: "1px solid #e8edf3",
    borderRadius: "8px",
    color: "#0a0e14",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  deleteButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "9px 15px",
    background: "transparent",
    border: "1px solid #3a2730",
    borderRadius: "8px",
    color: "#f87171",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  deleteDisabled: {
    cursor: "not-allowed",
    opacity: 0.65,
  },

  smallSpinner: {
    width: "12px",
    height: "12px",
    border: "2px solid #53343b",
    borderTopColor: "#f87171",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};

export default History;