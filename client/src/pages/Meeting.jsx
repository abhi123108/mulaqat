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

const RemoteVideo = ({ participant, isHost = false }) => {
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
        {isHost ? "Host" : "User"}{" "}
        {!isHost &&
          (participant.userId?.slice(-6) ||
            participant.socketId?.slice(-6))}
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

  // Camera + microphone stream
  const localStreamRef = useRef(null);

  // Screen share stream
  const screenStreamRef = useRef(null);

  // Screen sharing state ref
  const screenSharingRef = useRef(false);

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

  // Avoid stale chatOpen inside socket listener
  const chatOpenRef = useRef(false);

  // ====================================================
  // STATE
  // ====================================================

  const [meeting, setMeeting] = useState(null);

  const [participants, setParticipants] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [connected, setConnected] =
    useState(false);

  const [connectionStatus, setConnectionStatus] =
    useState("connecting");

  const [micEnabled, setMicEnabled] =
    useState(true);

  const [cameraEnabled, setCameraEnabled] =
    useState(true);

  const [screenSharing, setScreenSharing] =
    useState(false);

  const [meetingEnded, setMeetingEnded] =
    useState(false);

  const [endingMeeting, setEndingMeeting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

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
  // CURRENT USER / HOST DETECTION
  // ====================================================

  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem("mulaqat_token");

      if (!token) {
        return null;
      }

      const payload = JSON.parse(
        atob(token.split(".")[1])
      );

      return payload.userId || null;
    } catch (error) {
      console.error("Failed to decode user token:", error);
      return null;
    }
  };

  const currentUserId = getCurrentUserId();

  const isHost =
    meeting?.host?.toString() ===
    currentUserId?.toString();

  // ====================================================
  // LOCAL VIDEO ATTACH
  // ====================================================
  //
  // Camera normally shows here.
  // During screen sharing, screen stream shows here.
  // ====================================================

  useEffect(() => {
    const video = localVideoRef.current;

    const stream = screenSharing
      ? screenStreamRef.current
      : localStreamRef.current;

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
  }, [cameraReady, screenSharing]);

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
        // ADD LOCAL CAMERA + MICROPHONE TRACKS
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
        // IF SCREEN SHARING IS ALREADY ACTIVE
        // ==============================================

        if (screenStreamRef.current) {
          const screenTrack =
            screenStreamRef.current.getVideoTracks()[0];

          if (screenTrack) {
            const videoSender =
              peerConnection
                .getSenders()
                .find(
                  (sender) =>
                    sender.track?.kind ===
                    "video"
                );

            if (videoSender) {
              videoSender
                .replaceTrack(screenTrack)
                .catch((error) => {
                  console.error(
                    "Failed to attach screen track:",
                    error
                  );
                });
            }
          }
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
        cleanupPeer,
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

        // Avoid duplicate offer
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
  // SCREEN SHARING
  // ====================================================

  const stopScreenShare = useCallback(() => {
    const cameraStream =
      localStreamRef.current;

    const cameraTrack =
      cameraStream?.getVideoTracks()[0];

    // Restore camera track for every peer
    peerConnectionsRef.current.forEach(
      (peerConnection, socketId) => {
        const videoSender =
          peerConnection
            .getSenders()
            .find(
              (sender) =>
                sender.track?.kind ===
                "video"
            );

        if (
          !videoSender ||
          !cameraTrack
        ) {
          return;
        }

        videoSender
          .replaceTrack(cameraTrack)
          .then(() => {
            console.log(
              `Camera restored for ${socketId}`
            );
          })
          .catch((error) => {
            console.error(
              `Failed to restore camera for ${socketId}:`,
              error
            );
          });
      }
    );

    // Stop screen capture tracks
    if (screenStreamRef.current) {
      screenStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.onended = null;
          track.stop();
        });

      screenStreamRef.current = null;
    }

    screenSharingRef.current = false;
    setScreenSharing(false);

    // Restore camera enabled state
    if (cameraTrack) {
      cameraTrack.enabled =
        cameraEnabled;
    }

    setSuccess(
      "Screen sharing stopped."
    );
  }, [cameraEnabled]);

  const toggleScreenShare =
    useCallback(async () => {
      if (screenSharingRef.current) {
        stopScreenShare();
        return;
      }

      try {
        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices
            .getDisplayMedia
        ) {
          setError(
            "Screen sharing is not supported by this browser."
          );
          return;
        }

        const screenStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: {
                cursor: "always",
              },
              audio: false,
            }
          );

        const screenTrack =
          screenStream.getVideoTracks()[0];

        if (!screenTrack) {
          screenStream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          setError(
            "Unable to capture your screen."
          );
          return;
        }

        screenStreamRef.current =
          screenStream;

        screenSharingRef.current =
          true;

        // Replace camera video track
        // with screen video track
        peerConnectionsRef.current.forEach(
          (
            peerConnection,
            socketId
          ) => {
            const videoSender =
              peerConnection
                .getSenders()
                .find(
                  (sender) =>
                    sender.track?.kind ===
                    "video"
                );

            if (!videoSender) {
              console.warn(
                "Video sender not found for:",
                socketId
              );
              return;
            }

            videoSender
              .replaceTrack(screenTrack)
              .then(() => {
                console.log(
                  `Screen track attached to ${socketId}`
                );
              })
              .catch((error) => {
                console.error(
                  `Failed to replace video track for ${socketId}:`,
                  error
                );
              });
          }
        );

        setScreenSharing(true);
        setSuccess(
          "Screen sharing started."
        );

        // Browser native
        // "Stop sharing" button
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (error) {
        console.error(
          "Screen sharing failed:",
          error
        );

        if (
          error.name ===
          "NotAllowedError"
        ) {
          setError(
            "Screen sharing was cancelled."
          );
        } else {
          setError(
            "Unable to start screen sharing."
          );
        }
      }
    }, [stopScreenShare]);

  // ====================================================
  // CLEANUP EVERYTHING
  // ====================================================

  const cleanup = useCallback(() => {
    // Stop screen sharing first
    if (screenStreamRef.current) {
      screenStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.onended = null;
          track.stop();
        });

      screenStreamRef.current = null;
    }

    screenSharingRef.current = false;

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

    setScreenSharing(false);

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

          // Do not allow users to enter an ended meeting.
          if (meetingData.status === "ended") {
            setMeetingEnded(true);
            return;
          }

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
              setConnectionStatus("connected");

              setError("");

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
                setConnectionStatus("reconnecting");
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
                setConnected(false);
                setConnectionStatus("reconnecting");
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
          // MEETING ENDED
          // ============================================

          const handleMeetingEnded = (data) => {
            if (cancelled) {
              return;
            }

            console.log("Meeting ended:", data);

            setMeetingEnded(true);
            setEndingMeeting(false);
            setSuccess("This meeting has ended.");

            cleanup();

            if (socketRef.current === socket) {
              socketRef.current = null;
            }

            disconnectSocket();
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
              if (
                !chatOpenRef.current
              ) {
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
            "meeting-ended",
            handleMeetingEnded
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
          "meeting-ended"
        );

        activeSocket.off(
          "chat-message"
        );

        activeSocket.off(
          "chat-error"
        );
      }

      cleanup();

      // Only disconnect the socket
      // that belongs to this initialization.
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
  // LEAVE MEETING (NON-HOST)
  // ====================================================

  const handleLeaveMeeting = () => {
    const socket = socketRef.current;

    if (socket?.connected) {
      socket.emit("leave-room", { meetingId });
    }

    cleanup();
    disconnectSocket();
    socketRef.current = null;
    navigate("/");
  };

  // ====================================================
  // END MEETING (HOST ONLY)
  // ====================================================

  const handleEndMeeting = async () => {
    if (endingMeeting || meetingEnded) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to end this meeting for everyone?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setEndingMeeting(true);
      setError("");
      setSuccess("Ending meeting...");

      await api.post(`/meetings/${meetingId}/end`);

      const socket = socketRef.current;

      if (socket?.connected) {
        // Server broadcasts meeting-ended to every participant.
        socket.emit("end-meeting", { meetingId });
      } else {
        // Fallback if socket has already disconnected.
        setMeetingEnded(true);
        cleanup();
        disconnectSocket();
        socketRef.current = null;
      }
    } catch (error) {
      console.error("End meeting error:", error);

      setEndingMeeting(false);
      setSuccess("");
      setError(
        error.response?.data?.message ||
          "Failed to end meeting."
      );
    }
  };

  // ====================================================
  // MEETING ENDED
  // ====================================================

  if (meetingEnded) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at top left, #172554 0%, #0b1020 38%, #050811 100%)",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(79,70,229,0.18), transparent 68%)",
          top: "-180px",
          left: "-120px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(14,165,233,0.12), transparent 68%)",
          bottom: "-160px",
          right: "-100px",
          pointerEvents: "none",
        }}
      />

      {/* Main Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "rgba(15, 23, 42, 0.88)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          borderRadius: "24px",
          padding: "48px 42px",
          textAlign: "center",
          boxShadow:
            "0 25px 80px rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(18px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "32px",
          }}
        >
          <img
            src="/mulaqat-logo-horizontal.png"
            alt="Mulaqat"
            style={{
              width: "150px",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Success Icon */}
        <div
          style={{
            width: "82px",
            height: "82px",
            borderRadius: "50%",
            margin: "0 auto 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(145deg, rgba(34,197,94,0.16), rgba(16,185,129,0.05))",
            border: "1px solid rgba(34,197,94,0.28)",
            boxShadow:
              "0 0 40px rgba(34,197,94,0.10)",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #22c55e, #10b981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "27px",
              fontWeight: "800",
              boxShadow:
                "0 8px 24px rgba(34,197,94,0.25)",
            }}
          >
            ✓
          </div>
        </div>

        {/* Eyebrow */}
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#60a5fa",
            marginBottom: "12px",
          }}
        >
          SESSION COMPLETE
        </div>

        {/* Heading */}
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: "32px",
            lineHeight: "1.2",
            fontWeight: "750",
            letterSpacing: "-0.025em",
            color: "#f8fafc",
          }}
        >
          Meeting Ended
        </h1>

        {/* Description */}
        <p
          style={{
            margin: "0 auto",
            maxWidth: "410px",
            fontSize: "15px",
            lineHeight: "1.7",
            color: "#94a3b8",
          }}
        >
          {isHost
            ? "You ended this meeting for everyone. All participants have been disconnected."
            : "The host has ended this meeting. The meeting room is no longer available."}
        </p>

        {/* Meeting ID */}
        <div
          style={{
            marginTop: "28px",
            padding: "15px 18px",
            borderRadius: "14px",
            background: "rgba(30, 41, 59, 0.65)",
            border: "1px solid rgba(148, 163, 184, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            textAlign: "left",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "5px",
              }}
            >
              Meeting ID
            </div>

            <div
              style={{
                fontSize: "14px",
                fontWeight: "650",
                color: "#cbd5e1",
                letterSpacing: "0.04em",
              }}
            >
              {meetingId}
            </div>
          </div>

          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#60a5fa",
              fontSize: "16px",
            }}
          >
            #
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(148,163,184,0.15), transparent)",
            margin: "30px 0",
          }}
        />

        {/* Action */}
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "13px",
            padding: "14px 20px",
            background:
              "linear-gradient(135deg, #4f46e5, #2563eb)",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow:
              "0 10px 28px rgba(37,99,235,0.24)",
            transition:
              "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform =
              "translateY(-1px)";
            e.currentTarget.style.boxShadow =
              "0 14px 34px rgba(37,99,235,0.32)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform =
              "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 10px 28px rgba(37,99,235,0.24)";
          }}
        >
          ← Back to Home
        </button>

        {/* Footer */}
        <div
          style={{
            marginTop: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            color: "#64748b",
            fontSize: "12px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          Your meeting session has been securely closed
        </div>
      </div>
    </div>
  );
}

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at 15% 10%, rgba(37, 99, 235, 0.16), transparent 32%), radial-gradient(circle at 85% 90%, rgba(79, 70, 229, 0.14), transparent 30%), #050811",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.10), transparent 68%)",
          top: "-260px",
          left: "-180px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.10), transparent 68%)",
          bottom: "-230px",
          right: "-150px",
          pointerEvents: "none",
        }}
      />

      {/* Loading Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "46px 40px",
          borderRadius: "24px",
          background: "rgba(15, 23, 42, 0.88)",
          border: "1px solid rgba(148, 163, 184, 0.14)",
          boxShadow:
            "0 30px 90px rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(18px)",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "34px",
          }}
        >
          <img
            src="/mulaqat-logo-horizontal.png"
            alt="Mulaqat"
            style={{
              width: "145px",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Spinner */}
        <div
          style={{
            width: "72px",
            height: "72px",
            margin: "0 auto 26px",
            borderRadius: "50%",
            border: "3px solid rgba(96, 165, 250, 0.12)",
            borderTopColor: "#60a5fa",
            borderRightColor: "#6366f1",
            animation: "mulaqatSpin 1s linear infinite",
            boxShadow:
              "0 0 35px rgba(59,130,246,0.12)",
          }}
        />

        {/* Status */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "7px 13px",
            borderRadius: "999px",
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.18)",
            color: "#60a5fa",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "15px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#60a5fa",
              boxShadow:
                "0 0 10px rgba(96,165,250,0.8)",
            }}
          />
          Secure Connection
        </div>

        {/* Heading */}
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: "30px",
            lineHeight: "1.2",
            fontWeight: "750",
            letterSpacing: "-0.025em",
            color: "#f8fafc",
          }}
        >
          Joining meeting…
        </h1>

        {/* Description */}
        <p
          style={{
            margin: "0 auto",
            maxWidth: "350px",
            color: "#94a3b8",
            fontSize: "14px",
            lineHeight: "1.7",
          }}
        >
          Please allow camera and microphone access
          when your browser asks for permission.
        </p>

        {/* Meeting ID */}
        <div
          style={{
            marginTop: "28px",
            padding: "14px 16px",
            borderRadius: "13px",
            background: "rgba(30, 41, 59, 0.58)",
            border:
              "1px solid rgba(148, 163, 184, 0.10)",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: "700",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: "6px",
            }}
          >
            Meeting ID
          </div>

          <div
            style={{
              fontSize: "14px",
              fontWeight: "650",
              color: "#cbd5e1",
              letterSpacing: "0.04em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {meetingId}
          </div>
        </div>

        {/* Connection steps */}
        <div
          style={{
            marginTop: "26px",
            display: "flex",
            flexDirection: "column",
            gap: "11px",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              color: "#cbd5e1",
              fontSize: "12px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow:
                  "0 0 10px rgba(34,197,94,0.45)",
              }}
            />
            Connecting securely
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                border:
                  "1px solid rgba(148,163,184,0.35)",
              }}
            />
            Initializing camera & microphone
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                border:
                  "1px solid rgba(148,163,184,0.35)",
                borderRadius: "50%",
              }}
            />
            Preparing your meeting room
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "28px",
            paddingTop: "20px",
            borderTop:
              "1px solid rgba(148,163,184,0.09)",
            color: "#475569",
            fontSize: "11px",
          }}
        >
          🔒 Your connection is private and encrypted
        </div>
      </div>

      <style>
        {`
          @keyframes mulaqatSpin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
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
          font-size: 13px;
          font-weight: 600;
        }

        .meeting-status.connected {
          color: #86efac;
        }

        .meeting-status.connecting,
        .meeting-status.reconnecting {
          color: #facc15;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

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

        .screen-share-active {
          background: #166534 !important;
          border-color: #16a34a !important;
        }

        .chat-panel {
          width: 340px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          height: 100%;
          max-height: 100%;
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
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overscroll-behavior: contain;
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
          flex: 0 0 auto;
          padding: 12px;
          border-top: 1px solid #1f2937;
          background: #111827;
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          min-width: 0;
        }

        .chat-input {
          flex: 1 1 auto;
          min-width: 0;
          resize: none;
          min-height: 42px;
          max-height: 110px;
          padding: 10px 12px;
          background: #0f172a;
          color: #f8fafc;
          border: 1px solid #334155;
          border-radius: 10px;
          outline: none;
          font-size: 16px;
          line-height: 1.35;
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
            height: min(60vh, 520px);
            min-height: 320px;
            max-height: 520px;
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
            width: 100%;
            height: min(62vh, 500px);
            min-height: 320px;
            max-height: 500px;
            border-radius: 14px;
          }

          .chat-header {
            flex: 0 0 auto;
            padding: 13px;
          }

          .chat-messages {
            flex: 1 1 auto;
            min-height: 0;
            padding: 12px;
          }

          .chat-compose {
            flex: 0 0 auto;
            padding: 10px;
          }

          .chat-input-row {
            gap: 6px;
          }

          .chat-input {
            min-width: 0;
            min-height: 42px;
            max-height: 96px;
            font-size: 16px;
          }

          .send-button {
            flex: 0 0 auto;
            padding: 11px 13px;
            min-height: 42px;
          }

          .chat-toggle,
          .leave-button,
          .control-button {
            padding: 9px 11px;
            font-size: 12px;
          }

          .controls {
            gap: 8px;
            padding: 12px;
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

              <p
                className={`meeting-status ${
                  connectionStatus
                }`}
              >
                {connectionStatus ===
                  "connected" &&
                  `● Connected • ${
                    participants.length +
                    1
                  } participants`}

                {connectionStatus ===
                  "connecting" &&
                  "● Connecting..."}

                {connectionStatus ===
                  "reconnecting" &&
                  "● Connection lost • Reconnecting..."}
              </p>
            </div>

            <div className="header-actions">
              {isHost ? (
                <button
                  className="leave-button"
                  onClick={handleEndMeeting}
                  disabled={endingMeeting}
                >
                  {endingMeeting
                    ? "Ending..."
                    : "End Meeting"}
                </button>
              ) : (
                <button
                  className="leave-button"
                  onClick={handleLeaveMeeting}
                >
                  Leave Meeting
                </button>
              )}
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
                    {screenSharing
                      ? isHost
                        ? "You • Host • Screen"
                        : "You • Screen"
                      : isHost
                        ? "You • Host"
                        : "You"}
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
                      isHost={
                        meeting?.host?.toString() ===
                        participant.userId?.toString()
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

                {/* SCREEN SHARE */}

                <button
                  onClick={
                    toggleScreenShare
                  }
                  className={`control-button ${
                    screenSharing
                      ? "screen-share-active"
                      : "active"
                  }`}
                >
                  {screenSharing
                    ? "🛑 Stop Sharing"
                    : "🖥️ Share Screen"}
                </button>

                {/* ONLY ONE CHAT BUTTON */}

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