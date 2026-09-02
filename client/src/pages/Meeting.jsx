import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  connectSocket,
  disconnectSocket,
} from "../services/socket";

const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },
  ],
};

// ======================================================
// REMOTE VIDEO
// ======================================================

const RemoteVideo = ({ participant }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !participant.stream) {
      return;
    }

    video.srcObject = participant.stream;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.warn(
          "Remote video autoplay blocked:",
          error
        );
      }
    };

    playVideo();

    return () => {
      if (video.srcObject === participant.stream) {
        video.srcObject = null;
      }
    };
  }, [participant.stream]);

  return (
    <div className="video-card">
      <video
        ref={videoRef}
        autoPlay
        playsInline
      />

      <div className="video-label">
        User{" "}
        {participant.userId?.slice(-6) ||
          participant.socketId?.slice(-6)}
      </div>
    </div>
  );
};

// ======================================================
// MEETING
// ======================================================

const Meeting = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  // ====================================================
  // REFS
  // ====================================================

  const localVideoRef = useRef(null);

  const socketRef = useRef(null);

  const localStreamRef = useRef(null);

  // socketId -> RTCPeerConnection
  const peerConnectionsRef = useRef(
    new Map()
  );

  // socketId -> queued ICE candidates
  const pendingIceCandidatesRef = useRef(
    new Map()
  );

  // socketId -> MediaStream
  const remoteStreamsRef = useRef(
    new Map()
  );

  // Prevent stale async initialization
  const initializationIdRef = useRef(0);

  // Chat scroll
  const chatMessagesRef = useRef(null);

  // IMPORTANT:
  // Avoid stale chatOpen value inside socket listener.
  const chatOpenRef = useRef(false);

  // ====================================================
  // STATE
  // ====================================================

  const [meeting, setMeeting] = useState(null);

  const [participants, setParticipants] = useState(
    []
  );

  const [loading, setLoading] = useState(true);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [connected, setConnected] =
    useState(false);

  const [micEnabled, setMicEnabled] =
    useState(true);

  const [cameraEnabled, setCameraEnabled] =
    useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // ====================================================
  // CHAT STATE
  // ====================================================

  const [chatOpen, setChatOpen] =
    useState(false);

  const [messages, setMessages] =
    useState([]);

  const [messageInput, setMessageInput] =
    useState("");

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [chatError, setChatError] =
    useState("");

  // Keep ref synchronized
  useEffect(() => {
    chatOpenRef.current = chatOpen;

    if (chatOpen) {
      setUnreadCount(0);
    }
  }, [chatOpen]);

  // ====================================================
  // LOCAL VIDEO ATTACH
  // ====================================================
  //
  // IMPORTANT FIX:
  //
  // getUserMedia() loading screen ke time complete ho
  // sakta hai, jab localVideoRef.current null hota hai.
  //
  // Ye effect stream ko actual <video> element mount
  // hone ke baad attach karta hai.
  // ====================================================

  useEffect(() => {
    const video = localVideoRef.current;
    const stream = localStreamRef.current;

    if (!video || !stream) {
      return;
    }

    video.srcObject = stream;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    const playLocalVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.warn(
          "Local video autoplay blocked:",
          error
        );
      }
    };

    playLocalVideo();

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [cameraReady]);

  // ====================================================
  // UPDATE PARTICIPANT STREAM
  // ====================================================

  const updateParticipantStream =
    useCallback(
      (socketId, userId, stream) => {
        // Don't render empty MediaStreams
        if (
          !stream ||
          stream.getTracks().length === 0
        ) {
          return;
        }

        setParticipants((current) => {
          const existing = current.find(
            (participant) =>
              participant.socketId === socketId
          );

          if (existing) {
            return current.map(
              (participant) =>
                participant.socketId === socketId
                  ? {
                      ...participant,
                      userId:
                        userId ||
                        participant.userId,
                      stream,
                    }
                  : participant
            );
          }

          return [
            ...current,
            {
              socketId,
              userId,
              stream,
            },
          ];
        });
      },
      []
    );

  // ====================================================
  // REMOVE PARTICIPANT
  // ====================================================

  const removeParticipant =
    useCallback((socketId) => {
      setParticipants((current) =>
        current.filter(
          (participant) =>
            participant.socketId !== socketId
        )
      );
    }, []);

  // ====================================================
  // CREATE PEER CONNECTION
  // ====================================================

  const createPeerConnection =
    useCallback(
      (
        targetSocketId,
        targetUserId = null
      ) => {
        if (!socketRef.current) {
          return null;
        }

        // Existing peer
        const existing =
          peerConnectionsRef.current.get(
            targetSocketId
          );

        if (existing) {
          return existing;
        }

        const peerConnection =
          new RTCPeerConnection(
            ICE_SERVERS
          );

        // ==============================================
        // ADD LOCAL TRACKS
        // ==============================================

        const localStream =
          localStreamRef.current;

        if (localStream) {
          localStream
            .getTracks()
            .forEach((track) => {
              peerConnection.addTrack(
                track,
                localStream
              );
            });
        }

        // ==============================================
        // REMOTE TRACK
        // ==============================================

        peerConnection.ontrack = (
          event
        ) => {
          const remoteStream =
            event.streams?.[0];

          if (!remoteStream) {
            return;
          }

          if (
            remoteStream.getTracks()
              .length === 0
          ) {
            return;
          }

          remoteStreamsRef.current.set(
            targetSocketId,
            remoteStream
          );

          updateParticipantStream(
            targetSocketId,
            targetUserId,
            remoteStream
          );
        };

        // ==============================================
        // ICE
        // ==============================================

        peerConnection.onicecandidate =
          (event) => {
            if (!event.candidate) {
              return;
            }

            if (
              !socketRef.current?.connected
            ) {
              return;
            }

            socketRef.current.emit(
              "ice-candidate",
              {
                target: targetSocketId,
                candidate:
                  event.candidate,
              }
            );
          };

        // ==============================================
        // CONNECTION STATE
        // ==============================================

        peerConnection.onconnectionstatechange =
          () => {
            const state =
              peerConnection.connectionState;

            console.log(
              `Peer ${targetSocketId} connection state:`,
              state
            );

            if (state === "connected") {
              setConnected(true);
            }

            if (
              state === "failed" ||
              state === "closed"
            ) {
              cleanupPeer(
                targetSocketId
              );
            }
          };

        peerConnectionsRef.current.set(
          targetSocketId,
          peerConnection
        );

        return peerConnection;
      },
      [
        updateParticipantStream,
      ]
    );

  // ====================================================
  // FLUSH ICE
  // ====================================================

  const flushPendingIceCandidates =
    useCallback(
      async (
        socketId,
        peerConnection
      ) => {
        const candidates =
          pendingIceCandidatesRef.current.get(
            socketId
          );

        if (!candidates?.length) {
          return;
        }

        for (const candidate of candidates) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );
          } catch (error) {
            console.warn(
              "Failed to add queued ICE candidate:",
              error
            );
          }
        }

        pendingIceCandidatesRef.current.delete(
          socketId
        );
      },
      []
    );

  // ====================================================
  // CREATE OFFER
  // ====================================================

  const createOffer = useCallback(
    async (
      targetSocketId,
      targetUserId = null
    ) => {
      try {
        const peerConnection =
          createPeerConnection(
            targetSocketId,
            targetUserId
          );

        if (!peerConnection) {
          return;
        }

        // Avoid creating duplicate offer
        if (
          peerConnection.signalingState !==
          "stable"
        ) {
          return;
        }

        const offer =
          await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
          offer
        );

        if (
          !socketRef.current?.connected
        ) {
          return;
        }

        socketRef.current.emit(
          "offer",
          {
            target: targetSocketId,
            offer,
          }
        );

        console.log(
          "Offer sent to:",
          targetSocketId
        );
      } catch (error) {
        console.error(
          `Offer creation failed for ${targetSocketId}:`,
          error
        );
      }
    },
    [createPeerConnection]
  );

  // ====================================================
  // HANDLE OFFER
  // ====================================================

  const handleOffer = useCallback(
    async ({
      sender,
      userId,
      offer,
    }) => {
      try {
        const peerConnection =
          createPeerConnection(
            sender,
            userId
          );

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            offer
          )
        );

        await flushPendingIceCandidates(
          sender,
          peerConnection
        );

        const answer =
          await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(
          answer
        );

        if (
          !socketRef.current?.connected
        ) {
          return;
        }

        socketRef.current.emit(
          "answer",
          {
            target: sender,
            answer,
          }
        );

        console.log(
          "Answer sent to:",
          sender
        );
      } catch (error) {
        console.error(
          `Offer handling failed for ${sender}:`,
          error
        );
      }
    },
    [
      createPeerConnection,
      flushPendingIceCandidates,
    ]
  );

  // ====================================================
  // HANDLE ANSWER
  // ====================================================

  const handleAnswer = useCallback(
    async ({
      sender,
      answer,
    }) => {
      try {
        const peerConnection =
          peerConnectionsRef.current.get(
            sender
          );

        if (!peerConnection) {
          console.warn(
            "Peer connection not found:",
            sender
          );
          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            answer
          )
        );

        await flushPendingIceCandidates(
          sender,
          peerConnection
        );
      } catch (error) {
        console.error(
          `Answer handling failed for ${sender}:`,
          error
        );
      }
    },
    [flushPendingIceCandidates]
  );

  // ====================================================
  // HANDLE ICE
  // ====================================================

  const handleIceCandidate =
    useCallback(
      async ({
        sender,
        candidate,
      }) => {
        try {
          let peerConnection =
            peerConnectionsRef.current.get(
              sender
            );

          if (!peerConnection) {
            peerConnection =
              createPeerConnection(
                sender
              );
          }

          if (!peerConnection) {
            return;
          }

          if (
            peerConnection.remoteDescription
          ) {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );
          } else {
            const queue =
              pendingIceCandidatesRef.current.get(
                sender
              ) || [];

            queue.push(candidate);

            pendingIceCandidatesRef.current.set(
              sender,
              queue
            );
          }
        } catch (error) {
          console.warn(
            `ICE candidate handling failed for ${sender}:`,
            error
          );
        }
      },
      [createPeerConnection]
    );

  // ====================================================
  // START LOCAL MEDIA
  // ====================================================

  const startLocalMedia =
    useCallback(async () => {
      try {
        // Don't request camera twice
        if (localStreamRef.current) {
          return localStreamRef.current;
        }

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                width: {
                  ideal: 1280,
                },
                height: {
                  ideal: 720,
                },
                facingMode: "user",
              },
              audio: true,
            }
          );

        localStreamRef.current =
          stream;

        setCameraReady(true);
        setMicEnabled(true);
        setCameraEnabled(true);

        return stream;
      } catch (error) {
        console.error(
          "getUserMedia error:",
          error
        );

        let message =
          "Unable to access camera and microphone.";

        if (
          error.name ===
          "NotAllowedError"
        ) {
          message =
            "Camera/microphone permission was denied. Please allow access.";
        } else if (
          error.name ===
          "NotFoundError"
        ) {
          message =
            "Camera or microphone was not found.";
        } else if (
          error.name ===
          "NotReadableError"
        ) {
          message =
            "Camera or microphone is already being used by another application.";
        } else if (
          error.name ===
          "SecurityError"
        ) {
          message =
            "Camera/microphone access is blocked by browser security settings.";
        }

        throw new Error(message);
      }
    }, []);

  // ====================================================
  // CLEANUP PEER
  // ====================================================

  const cleanupPeer = useCallback(
    (socketId) => {
      const peerConnection =
        peerConnectionsRef.current.get(
          socketId
        );

      if (peerConnection) {
        peerConnection.ontrack = null;

        peerConnection.onicecandidate =
          null;

        peerConnection.onconnectionstatechange =
          null;

        peerConnection.close();
      }

      peerConnectionsRef.current.delete(
        socketId
      );

      pendingIceCandidatesRef.current.delete(
        socketId
      );

      remoteStreamsRef.current.delete(
        socketId
      );

      removeParticipant(socketId);
    },
    [removeParticipant]
  );

  // ====================================================
  // CLEANUP EVERYTHING
  // ====================================================

  const cleanup = useCallback(() => {
    // Close all peer connections
    peerConnectionsRef.current.forEach(
      (peerConnection) => {
        peerConnection.ontrack = null;
        peerConnection.onicecandidate =
          null;
        peerConnection.onconnectionstatechange =
          null;

        peerConnection.close();
      }
    );

    peerConnectionsRef.current.clear();

    pendingIceCandidatesRef.current.clear();

    remoteStreamsRef.current.clear();

    // Stop local camera/mic
    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        null;
    }

    setParticipants([]);

    setMessages([]);

    setCameraReady(false);

    setConnected(false);

    setChatOpen(false);

    setUnreadCount(0);

    setMessageInput("");

    setChatError("");
  }, []);

  // ====================================================
  // INITIALIZE MEETING
  // ====================================================

  useEffect(() => {
    const initializationId =
      ++initializationIdRef.current;

    let cancelled = false;

    let activeSocket = null;

    let listenersAttached = false;

    const initializeMeeting =
      async () => {
        try {
          setLoading(true);
          setError("");

          // ============================================
          // AUTH
          // ============================================

          const token =
            localStorage.getItem(
              "mulaqat_token"
            );

          if (!token) {
            navigate("/login");
            return;
          }

          // ============================================
          // GET MEETING
          // ============================================

          const response =
            await api.get(
              `/meetings/${meetingId}`
            );

          if (
            cancelled ||
            initializationId !==
              initializationIdRef.current
          ) {
            return;
          }

          const meetingData =
            response.data.meeting;

          setMeeting(meetingData);

          // ============================================
          // CAMERA
          // ============================================

          const stream =
            await startLocalMedia();

          // React StrictMode / stale initialization
          // protection
          if (
            cancelled ||
            initializationId !==
              initializationIdRef.current
          ) {
            if (stream) {
              stream
                .getTracks()
                .forEach((track) =>
                  track.stop()
                );
            }

            if (
              localStreamRef.current ===
              stream
            ) {
              localStreamRef.current =
                null;
            }

            return;
          }

          // ============================================
          // SOCKET
          // ============================================

          const socket =
            connectSocket();

          activeSocket = socket;

          socketRef.current = socket;

          // ============================================
          // CONNECT
          // ============================================

          const handleConnect =
            () => {
              if (
                cancelled ||
                initializationId !==
                  initializationIdRef.current
              ) {
                return;
              }

              console.log(
                "Socket connected:",
                socket.id
              );

              setConnected(true);

              socket.emit(
                "join-room",
                {
                  meetingId,
                }
              );
            };

          // ============================================
          // DISCONNECT
          // ============================================

          const handleDisconnect =
            (reason) => {
              console.log(
                "Socket disconnected:",
                reason
              );

              if (!cancelled) {
                setConnected(false);
              }
            };

          // ============================================
          // CONNECT ERROR
          // ============================================

          const handleConnectError =
            (socketError) => {
              console.error(
                "Socket connection error:",
                socketError
              );

              if (!cancelled) {
                setError(
                  socketError.message ||
                    "Unable to connect to meeting server."
                );
              }
            };

          // ============================================
          // EXISTING ROOM USERS
          // ============================================

          const handleRoomUsers =
            (users) => {
              if (cancelled) {
                return;
              }

              console.log(
                "Existing room users:",
                users
              );

              // Remove duplicate socket IDs
              const uniqueUsers = [
                ...new Map(
                  users.map((user) => [
                    user.socketId,
                    user,
                  ])
                ).values(),
              ];

              uniqueUsers.forEach(
                (user) => {
                  if (
                    user.socketId ===
                    socket.id
                  ) {
                    return;
                  }

                  createOffer(
                    user.socketId,
                    user.userId
                  );
                }
              );
            };

          // ============================================
          // USER JOINED
          // ============================================

          const handleUserJoined =
            (user) => {
              console.log(
                "New user joined:",
                user
              );
            };

          // ============================================
          // USER LEFT
          // ============================================

          const handleUserLeft =
            ({
              socketId,
              userId,
            }) => {
              console.log(
                "User left:",
                socketId,
                userId
              );

              cleanupPeer(socketId);
            };

          // ============================================
          // CHAT MESSAGE
          // ============================================

          const handleChatMessage =
            (chatMessage) => {
              if (cancelled) {
                return;
              }

              console.log(
                "Chat message received:",
                chatMessage
              );

              setMessages((current) => {
                // Prevent duplicate message
                if (
                  current.some(
                    (message) =>
                      message.messageId ===
                      chatMessage.messageId
                  )
                ) {
                  return current;
                }

                return [
                  ...current,
                  chatMessage,
                ];
              });

              // Only unread when chat is closed
              if (!chatOpenRef.current) {
                setUnreadCount(
                  (current) =>
                    current + 1
                );
              }
            };

          // ============================================
          // CHAT ERROR
          // ============================================

          const handleChatError =
            (data) => {
              if (cancelled) {
                return;
              }

              setChatError(
                data?.message ||
                  "Unable to send message."
              );

              setTimeout(() => {
                if (!cancelled) {
                  setChatError("");
                }
              }, 3000);
            };

          // ============================================
          // ATTACH LISTENERS
          // ============================================

          socket.on(
            "connect",
            handleConnect
          );

          socket.on(
            "disconnect",
            handleDisconnect
          );

          socket.on(
            "connect_error",
            handleConnectError
          );

          socket.on(
            "room-users",
            handleRoomUsers
          );

          socket.on(
            "user-joined",
            handleUserJoined
          );

          socket.on(
            "offer",
            handleOffer
          );

          socket.on(
            "answer",
            handleAnswer
          );

          socket.on(
            "ice-candidate",
            handleIceCandidate
          );

          socket.on(
            "user-left",
            handleUserLeft
          );

          socket.on(
            "chat-message",
            handleChatMessage
          );

          socket.on(
            "chat-error",
            handleChatError
          );

          listenersAttached = true;

          // Already connected?
          if (socket.connected) {
            handleConnect();
          }
        } catch (error) {
          console.error(
            "Meeting initialization failed:",
            error
          );

          if (
            !cancelled &&
            initializationId ===
              initializationIdRef.current
          ) {
            setError(
              error.response?.data
                ?.message ||
                error.message ||
                "Failed to initialize meeting."
            );
          }
        } finally {
          if (
            !cancelled &&
            initializationId ===
              initializationIdRef.current
          ) {
            setLoading(false);
          }
        }
      };

    initializeMeeting();

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      cancelled = true;

      // Remove listeners
      if (
        activeSocket &&
        listenersAttached
      ) {
        activeSocket.off(
          "connect"
        );

        activeSocket.off(
          "disconnect"
        );

        activeSocket.off(
          "connect_error"
        );

        activeSocket.off(
          "room-users"
        );

        activeSocket.off(
          "user-joined"
        );

        activeSocket.off(
          "offer"
        );

        activeSocket.off(
          "answer"
        );

        activeSocket.off(
          "ice-candidate"
        );

        activeSocket.off(
          "user-left"
        );

        activeSocket.off(
          "chat-message"
        );

        activeSocket.off(
          "chat-error"
        );
      }

      cleanup();

      // Only disconnect the socket that belongs
      // to this initialization.
      if (
        activeSocket &&
        socketRef.current ===
          activeSocket
      ) {
        disconnectSocket();
        socketRef.current = null;
      }
    };
  }, [
    meetingId,
    navigate,
    startLocalMedia,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    cleanupPeer,
    cleanup,
  ]);

  // ====================================================
  // AUTO SCROLL CHAT
  // ====================================================

  useEffect(() => {
    if (!chatMessagesRef.current) {
      return;
    }

    chatMessagesRef.current.scrollTop =
      chatMessagesRef.current.scrollHeight;
  }, [messages]);

  // ====================================================
  // CHAT TOGGLE
  // ====================================================

  const toggleChat = () => {
    setChatOpen((current) => {
      const nextState = !current;

      if (nextState) {
        setUnreadCount(0);
      }

      return nextState;
    });
  };

  // ====================================================
  // SEND CHAT MESSAGE
  // ====================================================

  const sendChatMessage = () => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setChatError(
        "Not connected to meeting server."
      );
      return;
    }

    const trimmedMessage =
      messageInput.trim();

    if (!trimmedMessage) {
      return;
    }

    if (trimmedMessage.length > 1000) {
      setChatError(
        "Message cannot exceed 1000 characters."
      );
      return;
    }

    socket.emit("send-message", {
      message: trimmedMessage,
    });

    setMessageInput("");
    setChatError("");
  };

  // ====================================================
  // CHAT KEY
  // ====================================================

  const handleChatKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendChatMessage();
    }
  };

  // ====================================================
  // MICROPHONE
  // ====================================================

  const toggleMicrophone = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const audioTracks =
      stream.getAudioTracks();

    if (!audioTracks.length) {
      return;
    }

    const nextState =
      !micEnabled;

    audioTracks.forEach(
      (track) => {
        track.enabled =
          nextState;
      }
    );

    setMicEnabled(nextState);
  };

  // ====================================================
  // CAMERA
  // ====================================================

  const toggleCamera = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const videoTracks =
      stream.getVideoTracks();

    if (!videoTracks.length) {
      return;
    }

    const nextState =
      !cameraEnabled;

    videoTracks.forEach(
      (track) => {
        track.enabled =
          nextState;
      }
    );

    setCameraEnabled(
      nextState
    );
  };

  // ====================================================
  // END CALL
  // ====================================================

  const handleEndCall = () => {
    cleanup();

    disconnectSocket();

    socketRef.current = null;

    navigate("/");
  };

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="meeting-state">
        <div>
          <h2>
            Joining meeting...
          </h2>

          <p>
            Please allow camera and
            microphone access.
          </p>
        </div>
      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (error) {
    return (
      <div className="meeting-state">
        <div>
          <h2>
            Unable to join meeting
          </h2>

          <p>{error}</p>

          <button
            onClick={() =>
              navigate("/")
            }
            className="primary-button"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #0b0f19;
          color: #f8fafc;
          font-family: Inter, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button,
        textarea {
          font: inherit;
        }

        .meeting-page {
          min-height: 100vh;
          background: #0b0f19;
          padding: 18px;
        }

        .meeting-layout {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 36px);
        }

        .meeting-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 14px 16px;
          margin-bottom: 16px;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 16px;
        }

        .brand-title {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
        }

        .meeting-info {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .meeting-status {
          color: #86efac;
          font-size: 13px;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .chat-toggle,
        .leave-button,
        .control-button {
          border: 1px solid #334155;
          background: #1e293b;
          color: #f8fafc;
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .chat-toggle:hover,
        .control-button:hover {
          background: #334155;
        }

        .leave-button {
          background: #dc2626;
          border-color: #dc2626;
        }

        .leave-button:hover {
          background: #b91c1c;
        }

        .meeting-content {
          display: flex;
          flex: 1;
          min-height: 0;
          gap: 16px;
        }

        .video-area {
          flex: 1;
          min-width: 0;
        }

        .video-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
          width: 100%;
        }

        .video-card {
          position: relative;
          overflow: hidden;
          min-height: 210px;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 14px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
        }

        .video-card video {
          display: block;
          width: 100%;
          height: 100%;
          min-height: 210px;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          background: #020617;
        }

        .video-label {
          position: absolute;
          left: 10px;
          bottom: 10px;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.65);
          color: white;
          font-size: 12px;
          font-weight: 600;
          backdrop-filter: blur(6px);
        }

        .controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
          padding: 14px;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 16px;
        }

        .control-button.active {
          background: #2563eb;
          border-color: #2563eb;
        }

        .control-button.off {
          background: #7f1d1d;
          border-color: #991b1b;
        }

        .chat-panel {
          width: 340px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 16px;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #1f2937;
        }

        .chat-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        .chat-subtitle {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .chat-close {
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
        }

        .chat-messages {
          flex: 1;
          min-height: 300px;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .chat-empty {
          margin: auto;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          padding: 20px;
        }

        .message-row {
          display: flex;
          flex-direction: column;
          max-width: 85%;
          gap: 3px;
        }

        .message-row.mine {
          align-self: flex-end;
          align-items: flex-end;
        }

        .message-row.theirs {
          align-self: flex-start;
          align-items: flex-start;
        }

        .message-sender {
          color: #94a3b8;
          font-size: 10px;
          padding: 0 4px;
        }

        .message-bubble {
          padding: 9px 12px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .mine .message-bubble {
          background: #2563eb;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .theirs .message-bubble {
          background: #1e293b;
          color: #e2e8f0;
          border-bottom-left-radius: 4px;
        }

        .message-time {
          color: #64748b;
          font-size: 9px;
          padding: 0 4px;
        }

        .chat-compose {
          padding: 12px;
          border-top: 1px solid #1f2937;
        }

        .chat-input-row {
          display: flex;
          gap: 8px;
        }

        .chat-input {
          flex: 1;
          resize: none;
          min-height: 42px;
          max-height: 110px;
          padding: 10px 12px;
          background: #0f172a;
          color: #f8fafc;
          border: 1px solid #334155;
          border-radius: 10px;
          outline: none;
        }

        .chat-input:focus {
          border-color: #2563eb;
        }

        .send-button {
          align-self: flex-end;
          border: none;
          background: #2563eb;
          color: white;
          border-radius: 10px;
          padding: 11px 14px;
          cursor: pointer;
          font-weight: 600;
        }

        .send-button:hover {
          background: #1d4ed8;
        }

        .chat-error {
          margin: 6px 2px 0;
          color: #fca5a5;
          font-size: 11px;
        }

        .unread-badge {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          min-width: 19px;
          height: 19px;
          padding: 0 5px;
          margin-left: 5px;
          border-radius: 999px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
        }

        .meeting-state {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 30px;
          background: #0b0f19;
          color: #f8fafc;
        }

        .primary-button {
          border: none;
          background: #2563eb;
          color: white;
          padding: 10px 16px;
          border-radius: 9px;
          cursor: pointer;
        }

        .success-message {
          color: #86efac;
          font-size: 12px;
          margin-bottom: 10px;
        }

        @media (max-width: 900px) {
          .meeting-content {
            flex-direction: column;
          }

          .chat-panel {
            width: 100%;
            height: 420px;
          }
        }

        @media (max-width: 600px) {
          .meeting-page {
            padding: 10px;
          }

          .meeting-header {
            padding: 12px;
            border-radius: 12px;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-end;
            flex-wrap: wrap;
          }

          .video-grid {
            grid-template-columns: 1fr;
          }

          .video-card,
          .video-card video {
            min-height: 200px;
          }

          .chat-panel {
            height: 380px;
          }

          .chat-toggle,
          .leave-button {
            padding: 9px 11px;
            font-size: 12px;
          }
        }
      `}</style>

      <div className="meeting-page">
        <div className="meeting-layout">

          {/* ==========================================
              HEADER
          ========================================== */}

          <div className="meeting-header">
            <div>
              <h1 className="brand-title">
                Mulaqat
              </h1>

              <p className="meeting-info">
                Meeting ID:{" "}
                <strong>
                  {meetingId}
                </strong>
              </p>

              <p className="meeting-status">
                {connected
                  ? `● Connected • ${
                      participants.length +
                      1
                    } participants`
                  : "● Connecting..."}
              </p>
            </div>

            <div className="header-actions">
              <button
                className="chat-toggle"
                onClick={toggleChat}
              >
                💬 Chat

                {unreadCount > 0 && (
                  <span className="unread-badge">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
              </button>

              <button
                className="leave-button"
                onClick={handleEndCall}
              >
                Leave
              </button>
            </div>
          </div>

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          {/* ==========================================
              CONTENT
          ========================================== */}

          <div className="meeting-content">

            {/* ========================================
                VIDEO AREA
            ======================================== */}

            <div className="video-area">
              <div className="video-grid">

                {/* ======================================
                    LOCAL USER
                ====================================== */}

                <div className="video-card">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                  />

                  <div className="video-label">
                    You
                  </div>
                </div>

                {/* ======================================
                    REMOTE USERS
                ====================================== */}

                {participants.map(
                  (participant) => (
                    <RemoteVideo
                      key={
                        participant.socketId
                      }
                      participant={
                        participant
                      }
                    />
                  )
                )}
              </div>

              {!cameraReady && (
                <p className="meeting-info">
                  Starting camera and
                  microphone...
                </p>
              )}

              {/* ========================================
                  CONTROLS
              ======================================== */}

              <div className="controls">

                <button
                  onClick={
                    toggleMicrophone
                  }
                  className={`control-button ${
                    micEnabled
                      ? "active"
                      : "off"
                  }`}
                >
                  {micEnabled
                    ? "🎤 Mute"
                    : "🔇 Unmute"}
                </button>

                <button
                  onClick={
                    toggleCamera
                  }
                  className={`control-button ${
                    cameraEnabled
                      ? "active"
                      : "off"
                  }`}
                >
                  {cameraEnabled
                    ? "📷 Camera Off"
                    : "📷 Camera On"}
                </button>

                {/* Only ONE Chat button */}
                <button
                  onClick={toggleChat}
                  className="control-button"
                >
                  💬 Chat

                  {unreadCount > 0 && (
                    <span className="unread-badge">
                      {unreadCount}
                    </span>
                  )}
                </button>

              </div>
            </div>

            {/* ========================================
                CHAT PANEL
            ======================================== */}

            {chatOpen && (
              <aside className="chat-panel">

                <div className="chat-header">
                  <div>
                    <h2 className="chat-title">
                      Meeting Chat
                    </h2>

                    <p className="chat-subtitle">
                      Messages are temporary
                    </p>
                  </div>

                  <button
                    className="chat-close"
                    onClick={() =>
                      setChatOpen(
                        false
                      )
                    }
                  >
                    ×
                  </button>
                </div>

                <div
                  ref={
                    chatMessagesRef
                  }
                  className="chat-messages"
                >
                  {messages.length ===
                  0 ? (
                    <div className="chat-empty">
                      No messages yet.
                      <br />
                      Start the conversation.
                    </div>
                  ) : (
                    messages.map(
                      (chatMessage) => {
                        const isMine =
                          chatMessage.socketId ===
                          socketRef.current?.id;

                        const senderName =
                          isMine
                            ? "You"
                            : `User ${
                                chatMessage.userId?.slice(
                                  -6
                                ) ||
                                chatMessage.socketId?.slice(
                                  -6
                                ) ||
                                "Unknown"
                              }`;

                        const messageTime =
                          chatMessage.timestamp
                            ? new Date(
                                chatMessage.timestamp
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                }
                              )
                            : "";

                        return (
                          <div
                            key={
                              chatMessage.messageId
                            }
                            className={`message-row ${
                              isMine
                                ? "mine"
                                : "theirs"
                            }`}
                          >
                            <span className="message-sender">
                              {
                                senderName
                              }
                            </span>

                            <div className="message-bubble">
                              {
                                chatMessage.message
                              }
                            </div>

                            <span className="message-time">
                              {
                                messageTime
                              }
                            </span>
                          </div>
                        );
                      }
                    )
                  )}
                </div>

                <div className="chat-compose">
                  <div className="chat-input-row">
                    <textarea
                      className="chat-input"
                      value={
                        messageInput
                      }
                      onChange={(
                        event
                      ) =>
                        setMessageInput(
                          event.target
                            .value
                        )
                      }
                      onKeyDown={
                        handleChatKeyDown
                      }
                      placeholder="Type a message..."
                      maxLength={1000}
                      rows={1}
                    />

                    <button
                      className="send-button"
                      onClick={
                        sendChatMessage
                      }
                    >
                      Send
                    </button>
                  </div>

                  {chatError && (
                    <p className="chat-error">
                      {chatError}
                    </p>
                  )}

                  <p className="chat-subtitle">
                    Enter to send •
                    Shift + Enter for
                    new line
                  </p>
                </div>
              </aside>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default Meeting;