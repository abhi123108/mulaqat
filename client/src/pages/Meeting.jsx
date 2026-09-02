import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import {
  connectSocket,
  disconnectSocket,
} from "../services/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const getDisplayName = (userId, socketId) => {
  if (userId) {
    return `Participant ${userId.slice(-6)}`;
  }

  return `Participant ${socketId?.slice(-6) || "User"}`;
};

const VideoCard = ({
  stream,
  label,
  muted = false,
  status = "",
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!stream) {
      video.srcObject = null;
      return;
    }

    video.srcObject = stream;

    const play = async () => {
      try {
        await video.play();
      } catch (error) {
        console.warn("Video autoplay blocked:", error);
      }
    };

    play();

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="mulaqat-video-card">
      <div className="mulaqat-video-wrapper">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
          />
        ) : (
          <div className="mulaqat-video-placeholder">
            <div className="mulaqat-avatar">
              {label?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <span>{status || "Connecting..."}</span>
          </div>
        )}

        <div className="mulaqat-video-overlay" />

        <div className="mulaqat-name-badge">
          <span className="mulaqat-live-dot" />
          {label}
        </div>
      </div>
    </div>
  );
};

const Meeting = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // remoteSocketId -> RTCPeerConnection
  const peerConnectionsRef = useRef(new Map());

  // remoteSocketId -> ICE candidates[]
  const pendingIceCandidatesRef = useRef(new Map());

  // remoteSocketId -> MediaStream
  const remoteStreamsRef = useRef(new Map());

  // Prevent duplicate offers.
  const negotiatingPeersRef = useRef(new Set());

  // Prevent initialization more than once.
  const initializedRef = useRef(false);

  const mountedRef = useRef(false);

  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [connected, setConnected] = useState(false);

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const [error, setError] = useState("");

  /*
   * ---------------------------------------------------------
   * PARTICIPANT STATE
   * ---------------------------------------------------------
   */

  const upsertParticipant = useCallback(
    (socketId, userId = null, stream = null) => {
      if (!socketId) {
        return;
      }

      setParticipants((current) => {
        const existing = current.find(
          (participant) =>
            participant.socketId === socketId
        );

        if (existing) {
          return current.map((participant) =>
            participant.socketId === socketId
              ? {
                  ...participant,
                  userId:
                    userId || participant.userId,
                  stream:
                    stream || participant.stream || null,
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

  const removeParticipant = useCallback(
    (socketId) => {
      setParticipants((current) =>
        current.filter(
          (participant) =>
            participant.socketId !== socketId
        )
      );
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * PEER CONNECTION
   * ---------------------------------------------------------
   */

  const createPeerConnection = useCallback(
    (remoteSocketId, remoteUserId = null) => {
      if (!remoteSocketId) {
        return null;
      }

      const existing =
        peerConnectionsRef.current.get(
          remoteSocketId
        );

      if (existing) {
        return existing;
      }

      const peerConnection =
        new RTCPeerConnection(ICE_SERVERS);

      /*
       * Add local audio/video tracks.
       */
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

      /*
       * Remote stream received.
       */
      peerConnection.ontrack = (event) => {
        const remoteStream =
          event.streams?.[0];

        if (!remoteStream) {
          return;
        }

        console.log(
          "Remote stream received:",
          remoteSocketId
        );

        remoteStreamsRef.current.set(
          remoteSocketId,
          remoteStream
        );

        upsertParticipant(
          remoteSocketId,
          remoteUserId,
          remoteStream
        );
      };

      /*
       * ICE candidates.
       */
      peerConnection.onicecandidate = (
        event
      ) => {
        if (
          !event.candidate ||
          !socketRef.current
        ) {
          return;
        }

        socketRef.current.emit(
          "ice-candidate",
          {
            target: remoteSocketId,
            candidate: event.candidate,
          }
        );
      };

      /*
       * Connection state.
       */
      peerConnection.onconnectionstatechange =
        () => {
          const state =
            peerConnection.connectionState;

          console.log(
            `Peer ${remoteSocketId}:`,
            state
          );

          if (state === "connected") {
            upsertParticipant(
              remoteSocketId,
              remoteUserId,
              remoteStreamsRef.current.get(
                remoteSocketId
              ) || null
            );
          }

          if (
            state === "failed" ||
            state === "closed"
          ) {
            peerConnection.close();

            peerConnectionsRef.current.delete(
              remoteSocketId
            );

            pendingIceCandidatesRef.current.delete(
              remoteSocketId
            );

            negotiatingPeersRef.current.delete(
              remoteSocketId
            );

            remoteStreamsRef.current.delete(
              remoteSocketId
            );

            removeParticipant(
              remoteSocketId
            );
          }
        };

      /*
       * Store connection.
       */
      peerConnectionsRef.current.set(
        remoteSocketId,
        peerConnection
      );

      /*
       * Add temporary participant card.
       */
      upsertParticipant(
        remoteSocketId,
        remoteUserId,
        remoteStreamsRef.current.get(
          remoteSocketId
        ) || null
      );

      return peerConnection;
    },
    [
      removeParticipant,
      upsertParticipant,
    ]
  );

  /*
   * ---------------------------------------------------------
   * ICE QUEUE
   * ---------------------------------------------------------
   */

  const queueIceCandidate = useCallback(
    (socketId, candidate) => {
      const queue =
        pendingIceCandidatesRef.current.get(
          socketId
        ) || [];

      queue.push(candidate);

      pendingIceCandidatesRef.current.set(
        socketId,
        queue
      );
    },
    []
  );

  const flushPendingIceCandidates =
    useCallback(async (socketId, peerConnection) => {
      const queue =
        pendingIceCandidatesRef.current.get(
          socketId
        );

      if (!queue?.length) {
        return;
      }

      console.log(
        `Flushing ${queue.length} ICE candidates for ${socketId}`
      );

      for (const candidate of queue) {
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.warn(
            "Queued ICE candidate failed:",
            error
          );
        }
      }

      pendingIceCandidatesRef.current.delete(
        socketId
      );
    }, []);

  /*
   * ---------------------------------------------------------
   * DETERMINISTIC INITIATOR
   * ---------------------------------------------------------
   *
   * Only the socket with the smaller ID creates
   * the offer for a pair.
   *
   * This avoids offer glare.
   */

  const shouldInitiate = useCallback(
    (remoteSocketId) => {
      const localSocketId =
        socketRef.current?.id;

      if (
        !localSocketId ||
        !remoteSocketId
      ) {
        return false;
      }

      return (
        localSocketId < remoteSocketId
      );
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * CREATE OFFER
   * ---------------------------------------------------------
   */

  const createOffer = useCallback(
    async (
      remoteSocketId,
      remoteUserId = null
    ) => {
      if (!socketRef.current) {
        return;
      }

      if (
        !shouldInitiate(remoteSocketId)
      ) {
        console.log(
          "Not initiator:",
          socketRef.current.id,
          "->",
          remoteSocketId
        );

        return;
      }

      if (
        negotiatingPeersRef.current.has(
          remoteSocketId
        )
      ) {
        console.log(
          "Already negotiating:",
          remoteSocketId
        );

        return;
      }

      negotiatingPeersRef.current.add(
        remoteSocketId
      );

      try {
        const peerConnection =
          createPeerConnection(
            remoteSocketId,
            remoteUserId
          );

        if (!peerConnection) {
          return;
        }

        /*
         * Don't create another offer if already
         * negotiating / connected.
         */
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

        socketRef.current.emit("offer", {
          target: remoteSocketId,
          offer: peerConnection.localDescription,
        });

        console.log(
          "Offer sent:",
          remoteSocketId
        );
      } catch (error) {
        console.error(
          "Offer creation failed:",
          remoteSocketId,
          error
        );
      } finally {
        negotiatingPeersRef.current.delete(
          remoteSocketId
        );
      }
    },
    [
      createPeerConnection,
      shouldInitiate,
    ]
  );

  /*
   * ---------------------------------------------------------
   * HANDLE OFFER
   * ---------------------------------------------------------
   */

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

        /*
         * If we're not stable, don't overwrite an
         * active negotiation.
         */
        if (
          peerConnection.signalingState !==
          "stable"
        ) {
          console.warn(
            "Ignoring offer because signaling state is:",
            peerConnection.signalingState
          );

          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
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

        socketRef.current?.emit(
          "answer",
          {
            target: sender,
            answer:
              peerConnection.localDescription,
          }
        );

        console.log(
          "Answer sent:",
          sender
        );
      } catch (error) {
        console.error(
          "Offer handling failed:",
          sender,
          error
        );
      }
    },
    [
      createPeerConnection,
      flushPendingIceCandidates,
    ]
  );

  /*
   * ---------------------------------------------------------
   * HANDLE ANSWER
   * ---------------------------------------------------------
   */

  const handleAnswer = useCallback(
    async ({ sender, answer }) => {
      try {
        const peerConnection =
          peerConnectionsRef.current.get(
            sender
          );

        if (!peerConnection) {
          console.warn(
            "No peer connection for answer:",
            sender
          );

          return;
        }

        if (
          peerConnection.signalingState !==
          "have-local-offer"
        ) {
          console.warn(
            "Ignoring answer. State:",
            peerConnection.signalingState
          );

          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        await flushPendingIceCandidates(
          sender,
          peerConnection
        );

        console.log(
          "Answer accepted:",
          sender
        );
      } catch (error) {
        console.error(
          "Answer handling failed:",
          sender,
          error
        );
      }
    },
    [flushPendingIceCandidates]
  );

  /*
   * ---------------------------------------------------------
   * HANDLE ICE
   * ---------------------------------------------------------
   */

  const handleIceCandidate =
    useCallback(
      async ({
        sender,
        userId,
        candidate,
      }) => {
        try {
          if (!candidate) {
            return;
          }

          let peerConnection =
            peerConnectionsRef.current.get(
              sender
            );

          if (!peerConnection) {
            peerConnection =
              createPeerConnection(
                sender,
                userId
              );
          }

          if (!peerConnection) {
            return;
          }

          if (
            peerConnection.remoteDescription
          ) {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } else {
            queueIceCandidate(
              sender,
              candidate
            );
          }
        } catch (error) {
          console.warn(
            "ICE candidate handling failed:",
            sender,
            error
          );
        }
      },
      [
        createPeerConnection,
        queueIceCandidate,
      ]
    );

  /*
   * ---------------------------------------------------------
   * LOCAL MEDIA
   * ---------------------------------------------------------
   */

  const startLocalMedia =
    useCallback(async () => {
      try {
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

        if (localVideoRef.current) {
          localVideoRef.current.srcObject =
            stream;

          localVideoRef.current.muted =
            true;

          try {
            await localVideoRef.current.play();
          } catch (error) {
            console.warn(
              "Local video play failed:",
              error
            );
          }
        }

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
        }

        throw new Error(message);
      }
    }, []);

  /*
   * ---------------------------------------------------------
   * PEER CLEANUP
   * ---------------------------------------------------------
   */

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

      negotiatingPeersRef.current.delete(
        socketId
      );
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * COMPLETE CLEANUP
   * ---------------------------------------------------------
   */

  const cleanup = useCallback(() => {
    console.log("Cleaning meeting...");

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
    negotiatingPeersRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) =>
          track.stop()
        );

      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        null;
    }

    setParticipants([]);
    setCameraReady(false);
    setConnected(false);
  }, []);

  /*
   * ---------------------------------------------------------
   * INITIALIZE MEETING
   * ---------------------------------------------------------
   */

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;
    let socket = null;

    const initializeMeeting =
      async () => {
        try {
          setLoading(true);
          setError("");

          const token =
            localStorage.getItem(
              "mulaqat_token"
            );

          if (!token) {
            navigate("/login");
            return;
          }

          /*
           * Prevent duplicate initialization.
           */
          if (initializedRef.current) {
            return;
          }

          initializedRef.current = true;

          /*
           * Get meeting.
           */
          const response =
            await api.get(
              `/meetings/${meetingId}`
            );

          if (cancelled) {
            return;
          }

          setMeeting(
            response.data.meeting
          );

          /*
           * Camera first.
           */
          await startLocalMedia();

          if (cancelled) {
            return;
          }

          /*
           * Socket.
           */
          socket = connectSocket();

          socketRef.current = socket;

          /*
           * -----------------------------
           * SOCKET EVENTS
           * -----------------------------
           */

          const handleConnect = () => {
            if (cancelled) {
              return;
            }

            console.log(
              "Socket connected:",
              socket.id
            );

            setConnected(true);

            socket.emit("join-room", {
              meetingId,
            });
          };

          const handleDisconnect = () => {
            console.log(
              "Socket disconnected"
            );

            if (!cancelled) {
              setConnected(false);
            }
          };

          const handleConnectError = (
            socketError
          ) => {
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

          /*
           * Existing users.
           *
           * Only deterministic initiator
           * creates the offer.
           */
          const handleRoomUsers = (
            users
          ) => {
            console.log(
              "Room users:",
              users
            );

            users.forEach((user) => {
              upsertParticipant(
                user.socketId,
                user.userId,
                remoteStreamsRef.current.get(
                  user.socketId
                ) || null
              );

              if (
                shouldInitiate(
                  user.socketId
                )
              ) {
                createOffer(
                  user.socketId,
                  user.userId
                );
              }
            });
          };

          /*
           * A new user joined.
           *
           * Existing user checks deterministic
           * initiator rule.
           */
          const handleUserJoined = (
            user
          ) => {
            console.log(
              "User joined:",
              user
            );

            upsertParticipant(
              user.socketId,
              user.userId,
              null
            );

            if (
              shouldInitiate(
                user.socketId
              )
            ) {
              createOffer(
                user.socketId,
                user.userId
              );
            }
          };

          const handleUserLeft = ({
            socketId,
            userId,
          }) => {
            console.log(
              "User left:",
              socketId,
              userId
            );

            cleanupPeer(socketId);
            removeParticipant(socketId);
          };

          /*
           * Register listeners BEFORE connecting.
           */
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

          /*
           * Socket may already be connected.
           */
          if (socket.connected) {
            handleConnect();
          }
        } catch (error) {
          console.error(
            "Meeting initialization failed:",
            error
          );

          initializedRef.current =
            false;

          if (!cancelled) {
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
            mountedRef.current
          ) {
            setLoading(false);
          }
        }
      };

    initializeMeeting();

    /*
     * IMPORTANT:
     * Cleanup is synchronous and does not depend
     * on an async function returning cleanup.
     */
    return () => {
      cancelled = true;
      mountedRef.current = false;

      if (socket) {
        socket.removeAllListeners(
          "connect"
        );
        socket.removeAllListeners(
          "disconnect"
        );
        socket.removeAllListeners(
          "connect_error"
        );
        socket.removeAllListeners(
          "room-users"
        );
        socket.removeAllListeners(
          "user-joined"
        );
        socket.removeAllListeners(
          "offer"
        );
        socket.removeAllListeners(
          "answer"
        );
        socket.removeAllListeners(
          "ice-candidate"
        );
        socket.removeAllListeners(
          "user-left"
        );
      }

      cleanup();

      socketRef.current = null;

      initializedRef.current = false;

      /*
       * Meeting owns the socket.
       */
      disconnectSocket();
    };
  }, [
    meetingId,
    navigate,
    startLocalMedia,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    shouldInitiate,
    cleanupPeer,
    removeParticipant,
    upsertParticipant,
    cleanup,
  ]);

  /*
   * ---------------------------------------------------------
   * CONTROLS
   * ---------------------------------------------------------
   */

  const toggleMicrophone = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const tracks =
      stream.getAudioTracks();

    const nextState = !micEnabled;

    tracks.forEach((track) => {
      track.enabled = nextState;
    });

    setMicEnabled(nextState);
  };

  const toggleCamera = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const tracks =
      stream.getVideoTracks();

    const nextState =
      !cameraEnabled;

    tracks.forEach((track) => {
      track.enabled = nextState;
    });

    setCameraEnabled(nextState);
  };

  const handleEndCall = () => {
    cleanup();
    disconnectSocket();
    navigate("/");
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>

        <div className="mulaqat-page mulaqat-center">
          <div className="mulaqat-loading-card">
            <div className="mulaqat-spinner" />

            <h2>Joining meeting</h2>

            <p>
              Preparing your camera and
              microphone...
            </p>
          </div>
        </div>
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR
   * ---------------------------------------------------------
   */

  if (error) {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>

        <div className="mulaqat-page mulaqat-center">
          <div className="mulaqat-error-card">
            <div className="mulaqat-error-icon">
              !
            </div>

            <h2>
              Unable to join meeting
            </h2>

            <p>{error}</p>

            <button
              className="mulaqat-primary-btn"
              onClick={() =>
                navigate("/")
              }
            >
              Back to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  const totalParticipants =
    participants.length + 1;

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div className="mulaqat-page">
        {/* HEADER */}
        <header className="mulaqat-header">
          <div className="mulaqat-brand">
            <div className="mulaqat-logo">
              M
            </div>

            <div>
              <h1>Mulaqat</h1>

              <div className="mulaqat-meeting-id">
                Meeting ID:{" "}
                <strong>
                  {meetingId}
                </strong>
              </div>
            </div>
          </div>

          <div className="mulaqat-header-right">
            <div className="mulaqat-status">
              <span
                className={
                  connected
                    ? "status-dot online"
                    : "status-dot"
                }
              />

              {connected
                ? "Connected"
                : "Connecting..."}
            </div>

            <div className="mulaqat-count">
              👥 {totalParticipants}
            </div>

            <button
              className="mulaqat-leave-btn"
              onClick={handleEndCall}
            >
              Leave
            </button>
          </div>
        </header>

        {/* VIDEO GRID */}
        <main className="mulaqat-meeting-content">
          <div
            className={`mulaqat-video-grid count-${Math.min(
              totalParticipants,
              9
            )}`}
          >
            {/* LOCAL */}
            <VideoCard
              stream={
                localStreamRef.current
              }
              label="You"
              muted
              status={
                cameraReady
                  ? ""
                  : "Starting camera..."
              }
            />

            {/* REMOTES */}
            {participants.map(
              (participant) => (
                <VideoCard
                  key={
                    participant.socketId
                  }
                  stream={
                    participant.stream
                  }
                  label={getDisplayName(
                    participant.userId,
                    participant.socketId
                  )}
                  status="Connecting..."
                />
              )
            )}
          </div>
        </main>

        {/* CONTROLS */}
        <div className="mulaqat-controls">
          <button
            className={`mulaqat-control-btn ${
              !micEnabled
                ? "disabled"
                : ""
            }`}
            onClick={
              toggleMicrophone
            }
            title={
              micEnabled
                ? "Mute microphone"
                : "Unmute microphone"
            }
          >
            <span>
              {micEnabled
                ? "🎤"
                : "🔇"}
            </span>

            <small>
              {micEnabled
                ? "Mute"
                : "Unmute"}
            </small>
          </button>

          <button
            className={`mulaqat-control-btn ${
              !cameraEnabled
                ? "disabled"
                : ""
            }`}
            onClick={
              toggleCamera
            }
            title={
              cameraEnabled
                ? "Turn camera off"
                : "Turn camera on"
            }
          >
            <span>
              {cameraEnabled
                ? "📷"
                : "🚫"}
            </span>

            <small>
              {cameraEnabled
                ? "Camera"
                : "Camera Off"}
            </small>
          </button>

          <button
            className="mulaqat-control-btn end"
            onClick={handleEndCall}
          >
            <span>📞</span>
            <small>Leave</small>
          </button>
        </div>
      </div>
    </>
  );
};

const GLOBAL_STYLES = `
  * {
    box-sizing: border-box;
  }

  .mulaqat-page {
    min-height: 100vh;
    background:
      radial-gradient(
        circle at top,
        #20252f 0%,
        #101319 42%,
        #090b0f 100%
      );
    color: #ffffff;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    padding-bottom: 110px;
  }

  .mulaqat-header {
    height: 76px;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(10,12,16,0.82);
    backdrop-filter: blur(16px);
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .mulaqat-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mulaqat-logo {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: linear-gradient(
      135deg,
      #6d5dfc,
      #8b7cff
    );
    font-size: 20px;
    font-weight: 800;
    box-shadow:
      0 8px 30px rgba(109,93,252,0.35);
  }

  .mulaqat-brand h1 {
    margin: 0;
    font-size: 19px;
    font-weight: 750;
  }

  .mulaqat-meeting-id {
    margin-top: 2px;
    color: #8f98a8;
    font-size: 12px;
  }

  .mulaqat-meeting-id strong {
    color: #cbd2df;
    letter-spacing: 0.4px;
  }

  .mulaqat-header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mulaqat-status,
  .mulaqat-count {
    height: 38px;
    padding: 0 13px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: #c6cbd5;
    font-size: 13px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #777;
  }

  .status-dot.online {
    background: #37d67a;
    box-shadow: 0 0 12px rgba(55,214,122,0.7);
  }

  .mulaqat-leave-btn {
    height: 38px;
    padding: 0 16px;
    border: none;
    border-radius: 10px;
    background: #e5484d;
    color: white;
    font-weight: 650;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .mulaqat-leave-btn:hover {
    background: #f05a5f;
    transform: translateY(-1px);
  }

  .mulaqat-meeting-content {
    width: min(1600px, 100%);
    margin: 0 auto;
    padding: 22px;
  }

  .mulaqat-video-grid {
    width: 100%;
    display: grid;
    gap: 14px;
    grid-template-columns:
      repeat(
        auto-fit,
        minmax(300px, 1fr)
      );
    align-items: stretch;
  }

  .mulaqat-video-card {
    min-width: 0;
    border-radius: 16px;
    overflow: hidden;
    background: #11151b;
    border: 1px solid rgba(255,255,255,0.09);
    box-shadow:
      0 12px 35px rgba(0,0,0,0.24);
  }

  .mulaqat-video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: #080a0e;
  }

  .mulaqat-video-wrapper video {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    background: #080a0e;
  }

  .mulaqat-video-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #9099a9;
    font-size: 13px;
  }

  .mulaqat-avatar {
    width: 64px;
    height: 64px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      #343b49,
      #1d222b
    );
    border: 1px solid rgba(255,255,255,0.12);
    color: white;
    font-size: 25px;
    font-weight: 700;
  }

  .mulaqat-video-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        to bottom,
        rgba(0,0,0,0.05),
        transparent 55%,
        rgba(0,0,0,0.65)
      );
  }

  .mulaqat-name-badge {
    position: absolute;
    left: 12px;
    bottom: 11px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    border-radius: 9px;
    background: rgba(0,0,0,0.58);
    backdrop-filter: blur(8px);
    color: white;
    font-size: 12px;
    font-weight: 600;
  }

  .mulaqat-live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #42dc82;
    box-shadow: 0 0 7px rgba(66,220,130,0.7);
  }

  .mulaqat-controls {
    position: fixed;
    left: 50%;
    bottom: 22px;
    transform: translateX(-50%);
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 18px;
    background: rgba(20,23,29,0.92);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow:
      0 18px 50px rgba(0,0,0,0.45);
    backdrop-filter: blur(18px);
  }

  .mulaqat-control-btn {
    min-width: 76px;
    height: 58px;
    padding: 7px 12px;
    border: none;
    border-radius: 12px;
    background: rgba(255,255,255,0.07);
    color: white;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    transition: 0.2s ease;
  }

  .mulaqat-control-btn:hover {
    background: rgba(255,255,255,0.13);
    transform: translateY(-2px);
  }

  .mulaqat-control-btn span {
    font-size: 19px;
  }

  .mulaqat-control-btn small {
    font-size: 10px;
    color: #b7becb;
  }

  .mulaqat-control-btn.disabled {
    background: #373b43;
  }

  .mulaqat-control-btn.end {
    background: #d94348;
  }

  .mulaqat-control-btn.end:hover {
    background: #ed555a;
  }

  .mulaqat-center {
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .mulaqat-loading-card,
  .mulaqat-error-card {
    width: min(420px, 100%);
    padding: 34px;
    text-align: center;
    border-radius: 18px;
    background: rgba(24,28,35,0.9);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  }

  .mulaqat-loading-card h2,
  .mulaqat-error-card h2 {
    margin: 15px 0 8px;
  }

  .mulaqat-loading-card p,
  .mulaqat-error-card p {
    color: #9ba4b3;
    line-height: 1.5;
  }

  .mulaqat-spinner {
    width: 42px;
    height: 42px;
    margin: 0 auto;
    border: 3px solid rgba(255,255,255,0.12);
    border-top-color: #7b6cff;
    border-radius: 50%;
    animation: mulaqat-spin 0.8s linear infinite;
  }

  @keyframes mulaqat-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .mulaqat-error-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(229,72,77,0.15);
    color: #ff777b;
    font-size: 24px;
    font-weight: 800;
  }

  .mulaqat-primary-btn {
    margin-top: 15px;
    padding: 11px 18px;
    border: none;
    border-radius: 10px;
    background: #6d5dfc;
    color: white;
    font-weight: 650;
    cursor: pointer;
  }

  @media (max-width: 800px) {
    .mulaqat-header {
      height: auto;
      padding: 14px;
      align-items: flex-start;
      flex-direction: column;
    }

    .mulaqat-header-right {
      width: 100%;
    }

    .mulaqat-status,
    .mulaqat-count {
      flex: 1;
      justify-content: center;
    }

    .mulaqat-leave-btn {
      flex: 1;
    }

    .mulaqat-meeting-content {
      padding: 12px;
    }

    .mulaqat-video-grid {
      grid-template-columns:
        repeat(
          auto-fit,
          minmax(220px, 1fr)
        );
      gap: 10px;
    }

    .mulaqat-controls {
      bottom: 10px;
      width: calc(100% - 20px);
      justify-content: center;
    }

    .mulaqat-control-btn {
      min-width: 70px;
    }
  }

  @media (max-width: 520px) {
    .mulaqat-video-grid {
      grid-template-columns: 1fr;
    }

    .mulaqat-control-btn {
      min-width: 62px;
      height: 54px;
      padding: 5px;
    }

    .mulaqat-control-btn small {
      font-size: 9px;
    }
  }
`;

export default Meeting;