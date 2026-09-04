import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Home = () => {
  const navigate = useNavigate();

  const [meetingCode, setMeetingCode] = useState("");
  const [meetingCreated, setMeetingCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [meetings, setMeetings] = useState([]);
  const [userName, setUserName] = useState("Mulaqat User");
  const [userAvatar, setUserAvatar] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // =====================================================
  // LOAD USER + MEETING HISTORY
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      // Load meeting history
      try {
        const response = await api.get("/meetings/history");

        setMeetings(
          response.data?.meetings ||
            response.data?.data ||
            []
        );
      } catch (err) {
        console.error(
          "Failed to load meeting history:",
          err
        );
      }

      // Load user name from JWT
      try {
        const token =
          localStorage.getItem("mulaqat_token");

        if (token) {
          const payload = JSON.parse(
            atob(token.split(".")[1])
          );

          setUserName(
            payload.name ||
              payload.username ||
              payload.email?.split("@")[0] ||
              "Mulaqat User"
          );
        }
      } catch (err) {
        console.error(
          "Failed to read user information:",
          err
        );
      }

      // Load latest profile data so the real name and profile photo stay in sync.
      try {
        const response = await api.get("/auth/me");
        const user = response.data?.user;

        if (user) {
          setUserName(
            user.name ||
              user.email?.split("@")[0] ||
              "Mulaqat User"
          );
          setUserAvatar(user.avatar || "");
          setAvatarError(false);
          localStorage.setItem("mulaqat_user", JSON.stringify(user));
        }
      } catch (err) {
        console.error(
          "Failed to fetch current user profile:",
          err
        );

        // Fall back to the cached user if /auth/me is unavailable.
        try {
          const storedUser = localStorage.getItem("mulaqat_user");
          if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserName(
              user.name ||
                user.email?.split("@")[0] ||
                "Mulaqat User"
            );
            setUserAvatar(user.avatar || "");
          }
        } catch (storageError) {
          console.error("Failed to read cached user:", storageError);
        }
      }
    };

    loadData();
  }, []);

  // =====================================================
  // CREATE MEETING
  // =====================================================

  const handleCreateMeeting = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await api.post("/meetings");

      const meetingId =
        response.data?.meeting?.meetingId ||
        response.data?.meetingId ||
        response.data?.data?.meetingId;

      if (!meetingId) {
        throw new Error(
          "Meeting ID was not returned by server."
        );
      }

      setMeetingCode(meetingId);
      setMeetingCreated(true);
      setSuccess(`Meeting created successfully. Meeting ID: ${meetingId}`);
    } catch (err) {
      console.error(
        "Create meeting error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to create meeting. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // COPY CREATED MEETING ID
  // =====================================================

  const handleCopyMeeting = async () => {
    if (!meetingCode) return;

    try {
      await navigator.clipboard.writeText(meetingCode);
      setError("");
      setSuccess("Meeting ID copied.");
    } catch (err) {
      console.error("Copy meeting error:", err);
      setError("Unable to copy meeting ID. Please copy it manually.");
    }
  };

  // =====================================================
  // JOIN MEETING
  // =====================================================

  const handleJoinMeeting = async (event) => {
    event?.preventDefault();

    const normalizedCode =
      meetingCode.trim().toUpperCase();

    if (!normalizedCode) {
      setError("Please enter a meeting ID.");
      return;
    }

    try {
      setJoinLoading(true);
      setError("");
      setSuccess("");

      await api.post("/meetings/join", {
        meetingId: normalizedCode,
      });

      setSuccess("Meeting joined successfully.");

      setTimeout(() => {
        navigate(`/meeting/${normalizedCode}`);
      }, 350);
    } catch (err) {
      console.error(
        "Join meeting error:",
        err
      );

      const message =
        err.response?.data?.message ||
        "Unable to join meeting. Please check the meeting ID.";

      if (
        message
          .toLowerCase()
          .includes("already joined")
      ) {
        navigate(`/meeting/${normalizedCode}`);
        return;
      }

      setError(message);
    } finally {
      setJoinLoading(false);
    }
  };

  // =====================================================
  // JOIN AGAIN
  // =====================================================

  const handleJoinAgain = async (meetingId) => {
    if (!meetingId) return;

    setMeetingCode(meetingId);
    setError("");
    setSuccess("");

    try {
      await api.post("/meetings/join", {
        meetingId,
      });
    } catch (err) {
      const message =
        err.response?.data?.message || "";

      if (
        !message
          .toLowerCase()
          .includes("already joined")
      ) {
        setError(
          message || "Unable to join meeting."
        );
        return;
      }
    }

    navigate(`/meeting/${meetingId}`);
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("mulaqat_token");
    localStorage.removeItem("mulaqat_user");

    navigate("/login");
  };

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "Recently";

    try {
      return new Date(date).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );
    } catch {
      return "Recently";
    }
  };

  const formatTime = (date) => {
    if (!date) return "";

    try {
      return new Date(date).toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "";
    }
  };

  const avatarLetter =
    userName?.charAt(0)?.toUpperCase() || "M";

  const avatarUrl = userAvatar
    ? (userAvatar.startsWith("http") || userAvatar.startsWith("data:image/"))
      ? userAvatar
      : `http://localhost:5000${userAvatar}`
    : "";

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="mulaqat-home">
      <style>{`

        /* =====================================================
           RESET
        ===================================================== */

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #030817;
          color: #f8fafc;

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        /* =====================================================
           MAIN PAGE
        ===================================================== */

        .mulaqat-home {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;

          background:
            radial-gradient(
              circle at 78% 20%,
              rgba(72, 67, 255, 0.13),
              transparent 30%
            ),
            radial-gradient(
              circle at 18% 35%,
              rgba(0, 185, 255, 0.075),
              transparent 27%
            ),
            linear-gradient(
              135deg,
              #020617 0%,
              #061024 50%,
              #020617 100%
            );
        }

        .mulaqat-home::before {
          content: "";

          position: fixed;
          inset: 0;

          pointer-events: none;

          opacity: 0.14;

          background-image:
            linear-gradient(
              rgba(255,255,255,0.018) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.018) 1px,
              transparent 1px
            );

          background-size: 48px 48px;

          mask-image:
            linear-gradient(
              to bottom,
              black,
              transparent 85%
            );
        }

        .home-shell {
          position: relative;
          z-index: 1;

          width:
            min(1440px, calc(100% - 32px));

          min-height:
            calc(100vh - 32px);

          margin: 16px auto;

          overflow: visible;

          border:
            1px solid rgba(148,163,184,0.16);

          border-radius: 18px;

          background:
            rgba(3, 10, 27, 0.76);

          box-shadow:
            0 30px 100px rgba(0,0,0,0.45);

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        /* =====================================================
           NAVBAR
        ===================================================== */

        .navbar {
          position: relative;
          z-index: 1000;

          height: 82px;

          padding: 0 42px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-bottom:
            1px solid rgba(148,163,184,0.13);

          border-radius: 18px 18px 0 0;

          background:
            rgba(9,16,35,0.82);

          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        /* =====================================================
           BRAND
        ===================================================== */

        .brand {
          width: 190px;
          height: 70px;

          padding: 0;

          display: flex;
          align-items: center;

          border: 0 !important;
          outline: none;

          background:
            transparent !important;

          appearance: none;
          -webkit-appearance: none;
        }

        .brand img {
          width: 175px;
          height: 67px;

          display: block;

          object-fit: contain;
          object-position: left center;
        }

        .brand:hover,
        .brand:focus,
        .brand:active {
          background:
            transparent !important;

          border: 0 !important;
          outline: none;
        }

        /* =====================================================
           NAVIGATION
        ===================================================== */

        .nav-center {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .nav-link {
          height: 46px;

          padding: 0 18px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 9px;

          color: #94a3b8;

          border:
            1px solid transparent !important;

          outline: none;

          border-radius: 11px;

          background:
            transparent !important;

          appearance: none;
          -webkit-appearance: none;

          font-size: 14px;
          font-weight: 600;

          transition:
            color 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .nav-link:hover {
          color: #ffffff;

          background:
            rgba(255,255,255,0.05) !important;

          border-color:
            rgba(148,163,184,0.14) !important;
        }

        .nav-link:focus,
        .nav-link:active {
          outline: none;

          background:
            transparent !important;
        }

        .nav-link.active {
          color: #55c8ff;

          border:
            1px solid rgba(57,130,255,0.42) !important;

          background:
            rgba(21,50,116,0.24) !important;

          box-shadow:
            inset 0 0 20px
            rgba(41,107,255,0.08);
        }

        /* =====================================================
           USER AREA
        ===================================================== */

        .nav-right {
          position: relative;
          z-index: 5000;

          display: flex;
          align-items: center;

          gap: 14px;
        }

        .user-button {
          height: 52px;

          padding: 3px 5px;

          display: flex;
          align-items: center;

          gap: 10px;

          color: white;

          border: 0 !important;
          outline: none;

          background:
            transparent !important;

          appearance: none;
          -webkit-appearance: none;

          border-radius: 12px;

          transition:
            background 0.2s ease;
        }

        .user-button:hover {
          background:
            rgba(255,255,255,0.05) !important;
        }

        .user-button:focus,
        .user-button:active {
          outline: none;
          background:
            rgba(255,255,255,0.05) !important;
        }

        .avatar {
          width: 45px;
          height: 45px;

          position: relative;

          display: grid;
          place-items: center;

          flex-shrink: 0;

          border-radius: 50%;

          color: white;

          font-size: 17px;
          font-weight: 750;

          background:
            linear-gradient(
              145deg,
              #5268ff,
              #744bff
            );

          box-shadow:
            0 0 22px
            rgba(75,92,255,0.30);
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          border-radius: 50%;
        }

        .avatar::after {
          content: "";

          position: absolute;

          width: 9px;
          height: 9px;

          right: 0;
          bottom: 1px;

          border-radius: 50%;

          background: #12d88b;

          border:
            2px solid #101a36;
        }

        .user-name {
          max-width: 130px;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          font-size: 14px;
          font-weight: 650;

          color: #f1f5f9;
        }

        .user-chevron {
          color: #9aa8bd;
          font-size: 14px;

          transition:
            transform 0.2s ease;
        }

        .user-chevron.open {
          transform:
            rotate(180deg);
        }

        /* =====================================================
           DROPDOWN
        ===================================================== */

        .dropdown {
          position: absolute;

          top: calc(100% + 10px);
          right: 0;

          z-index: 99999;

          width: 205px;

          padding: 8px;

          border:
            1px solid rgba(148,163,184,0.20);

          border-radius: 14px;

          background:
            rgba(10,18,38,0.98);

          box-shadow:
            0 24px 60px
            rgba(0,0,0,0.60),
            0 0 0 1px
            rgba(255,255,255,0.015);

          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);

          animation:
            dropdownIn
            0.16s ease-out;
        }

        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform:
              translateY(-5px)
              scale(0.98);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        .dropdown-user {
          padding: 11px 12px 13px;

          border-bottom:
            1px solid
            rgba(148,163,184,0.11);

          margin-bottom: 6px;
        }

        .dropdown-user-name {
          color: #f8fafc;
          font-size: 13px;
          font-weight: 700;
        }

        .dropdown-user-status {
          margin-top: 4px;

          display: flex;
          align-items: center;
          gap: 6px;

          color: #64748b;

          font-size: 11px;
        }

        .dropdown-user-status::before {
          content: "";

          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #19d99a;
        }

        .dropdown button {
          width: 100%;

          height: 42px;

          padding: 0 12px;

          display: flex;
          align-items: center;

          border: 0 !important;
          outline: none;

          border-radius: 9px;

          background:
            transparent !important;

          color: #cbd5e1;

          text-align: left;

          font-size: 13px;

          transition:
            background 0.2s ease,
            color 0.2s ease;
        }

        .dropdown button:hover {
          color: white;

          background:
            rgba(255,255,255,0.06) !important;
        }

        .dropdown .logout {
          color: #fb7185;
        }

        .dropdown .logout:hover {
          color: #fecdd3;

          background:
            rgba(244,63,94,0.09) !important;
        }
        /* =====================================================
           MAIN
        ===================================================== */

        .main {
          position: relative;
          z-index: 1;

          padding:
            48px 62px 34px;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .hero {
          display: grid;

          grid-template-columns:
            minmax(0,1.12fr)
            minmax(440px,0.88fr);

          gap: 70px;

          align-items: center;

          min-height: 470px;
        }

        .hero-left {
          position: relative;
        }

        .glow-orb {
          position: absolute;

          width: 430px;
          height: 430px;

          top: -70px;
          left: 150px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(45,102,255,0.16),
              transparent 68%
            );

          filter: blur(8px);

          pointer-events: none;
        }

        /* =====================================================
           EYEBROW
        ===================================================== */

        .eyebrow {
          position: relative;

          width: fit-content;

          display: flex;
          align-items: center;

          gap: 9px;

          padding:
            10px 17px;

          border-radius: 30px;

          color: #8cb4ff;

          border:
            1px solid
            rgba(108,97,255,0.55);

          background:
            rgba(36,28,98,0.20);

          font-size: 14px;
          font-weight: 650;
        }

        .online-dot {
          width: 7px;
          height: 7px;

          flex-shrink: 0;

          border-radius: 50%;

          background: #25dca1;

          box-shadow:
            0 0 10px
            rgba(37,220,161,0.8);
        }

        /* =====================================================
           HERO TITLE
        ===================================================== */

        .hero-title {
          position: relative;

          margin:
            34px 0 18px;

          max-width: 720px;

          font-size:
            clamp(48px,5vw,74px);

          line-height: 0.98;

          letter-spacing: -3px;

          font-weight: 800;
        }

        .gradient-text {
          background:
            linear-gradient(
              90deg,
              #8c73ff 0%,
              #617eff 50%,
              #35d9ff 100%
            );

          -webkit-background-clip: text;
          background-clip: text;

          color: transparent;
        }

        .hero-description {
          position: relative;

          max-width: 680px;

          margin: 0;

          color: #aab6ca;

          font-size: 18px;

          line-height: 1.75;
        }

        /* =====================================================
           BENEFITS
        ===================================================== */

        .benefits {
          margin-top: 34px;

          display: grid;

          grid-template-columns:
            repeat(4,minmax(0,1fr));

          max-width: 760px;

          border:
            1px solid
            rgba(148,163,184,0.11);

          border-radius: 13px;

          overflow: hidden;

          background:
            rgba(10,22,47,0.46);
        }

        .benefit {
          min-height: 83px;

          padding: 15px;

          display: flex;
          align-items: center;

          gap: 11px;

          border-right:
            1px solid
            rgba(148,163,184,0.10);
        }

        .benefit:last-child {
          border-right: 0;
        }

        .benefit-icon {
          width: 42px;
          height: 42px;

          flex-shrink: 0;

          display: grid;
          place-items: center;

          border-radius: 10px;

          color: #64b5ff;

          border:
            1px solid
            rgba(56,124,255,0.30);

          background:
            rgba(24,64,143,0.24);

          font-size: 12px;
          font-weight: 700;
        }

        .benefit strong {
          display: block;

          margin-bottom: 4px;

          font-size: 13px;
        }

        .benefit span {
          display: block;

          color: #7f8da5;

          font-size: 11px;

          line-height: 1.3;
        }

        /* =====================================================
           SESSION CARD
        ===================================================== */

        .session-card {
          position: relative;
          z-index: 2;

          padding: 30px;

          border-radius: 20px;

          border:
            1px solid
            rgba(148,163,184,0.18);

          background:
            linear-gradient(
              145deg,
              rgba(20,29,49,0.91),
              rgba(8,17,35,0.84)
            );

          box-shadow:
            0 24px 70px
            rgba(0,0,0,0.25);
        }

        .session-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;

          margin-bottom: 24px;
        }

        .session-label {
          color: #9ba8bc;

          font-size: 13px;
          font-weight: 700;

          letter-spacing: 0.8px;
        }

        .session-title {
          margin-top: 8px;

          font-size: 29px;

          letter-spacing: -1px;

          color: #f8fafc;
        }

        .online-badge {
          display: flex;
          align-items: center;

          gap: 7px;

          padding:
            8px 12px;

          border-radius: 30px;

          border:
            1px solid
            rgba(17,185,128,0.35);

          color: #4ee6b1;

          background:
            rgba(9,99,75,0.13);

          font-size: 12px;
          font-weight: 700;
        }

        .online-badge span {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #20d99b;

          box-shadow:
            0 0 8px
            rgba(32,217,155,0.65);
        }

        /* =====================================================
           CREATE BUTTON
        ===================================================== */

        .create-button {
          width: 100%;

          min-height: 92px;

          padding: 18px;

          border: 0 !important;
          outline: none;

          border-radius: 13px;

          display: flex;
          align-items: center;

          gap: 15px;

          color: white;

          text-align: left;

          background:
            linear-gradient(
              110deg,
              #6944ed,
              #324bdf
            );

          box-shadow:
            0 13px 30px
            rgba(70,70,230,0.28);

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            filter 0.2s ease;
        }

        .create-button:hover {
          transform: translateY(-2px);

          box-shadow:
            0 17px 38px
            rgba(70,70,230,0.40);

          filter: brightness(1.05);
        }

        .create-button:focus {
          outline: none;
        }

        .create-button:disabled {
          opacity: 0.65;

          cursor: not-allowed;

          transform: none;

          filter: none;
        }

        .create-icon {
          width: 51px;
          height: 51px;

          flex-shrink: 0;

          display: grid;
          place-items: center;

          border-radius: 11px;

          background:
            rgba(255,255,255,0.14);

          font-size: 31px;
          font-weight: 300;
        }

        .create-copy {
          flex: 1;
        }

        .create-copy strong {
          display: block;

          margin-bottom: 5px;

          font-size: 17px;
        }

        .create-copy span {
          color: #c5c8f4;

          font-size: 13px;
        }

        .arrow {
          font-size: 28px;
          font-weight: 300;
        }

        /* =====================================================
           OR DIVIDER
        ===================================================== */

        .or-divider {
          display: flex;
          align-items: center;

          gap: 15px;

          margin: 24px 0;

          color: #66748d;

          font-size: 12px;
        }

        .or-divider::before,
        .or-divider::after {
          content: "";

          height: 1px;

          flex: 1;

          background:
            rgba(148,163,184,0.14);
        }

        /* =====================================================
           JOIN BOX
        ===================================================== */

        .join-box {
          padding: 22px;

          border-radius: 14px;

          border:
            1px solid
            rgba(148,163,184,0.16);

          background:
            rgba(7,15,31,0.44);
        }

        .join-heading {
          display: flex;
          align-items: center;

          gap: 13px;

          margin-bottom: 17px;
        }

        .join-icon {
          width: 43px;
          height: 43px;

          flex-shrink: 0;

          display: grid;
          place-items: center;

          border-radius: 10px;

          color: #ae8cff;

          background:
            rgba(91,59,181,0.20);

          border:
            1px solid
            rgba(130,92,255,0.20);

          font-size: 23px;
        }

        .join-heading strong {
          display: block;

          font-size: 16px;
        }

        .join-heading span {
          display: block;

          margin-top: 3px;

          color: #76839a;

          font-size: 12px;
        }

        .join-form {
          display: flex;

          gap: 10px;
        }

        .meeting-input {
          min-width: 0;

          flex: 1;

          height: 52px;

          padding: 0 15px;

          color: white;

          outline: none;

          border:
            1px solid
            rgba(148,163,184,0.17);

          border-radius: 9px;

          background:
            rgba(5,12,27,0.78);

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .meeting-input::placeholder {
          color: #66738b;
        }

        .meeting-input:hover {
          border-color:
            rgba(148,163,184,0.28);
        }

        .meeting-input:focus {
          border-color:
            rgba(81,115,255,0.72);

          box-shadow:
            0 0 0 3px
            rgba(66,90,255,0.10);
        }

        .join-button {
          width: 90px;

          border: 0 !important;
          outline: none;

          border-radius: 9px;

          color: white;

          font-weight: 700;

          background:
            linear-gradient(
              135deg,
              #6245e9,
              #382bd0
            );

          transition:
            filter 0.2s ease,
            transform 0.2s ease;
        }

        .join-button:hover {
          filter: brightness(1.12);

          transform: translateY(-1px);
        }

        .join-button:focus {
          outline: none;
        }

        .join-button:disabled {
          opacity: 0.55;

          cursor: not-allowed;

          transform: none;
        }

        .privacy-note {
          display: flex;
          align-items: center;

          gap: 8px;

          margin-top: 22px;

          color: #8995a9;

          font-size: 12px;
        }

        .privacy-icon {
          color: #748198;
        }

        /* =====================================================
           ALERT
        ===================================================== */

        .alert {
          margin:
            0 0 18px;

          padding:
            12px 15px;

          border-radius: 10px;

          font-size: 13px;
        }

        .alert.error {
          color: #fecdd3;

          border:
            1px solid
            rgba(244,63,94,0.25);

          background:
            rgba(127,29,29,0.22);
        }

        .alert.success {
          color: #a7f3d0;

          border:
            1px solid
            rgba(16,185,129,0.25);

          background:
            rgba(6,95,70,0.18);
        }

        /* =====================================================
           RECENT MEETINGS
        ===================================================== */

        .recent-section {
          margin-top: 28px;

          padding: 23px;

          border:
            1px solid
            rgba(148,163,184,0.14);

          border-radius: 17px;

          background:
            rgba(8,17,35,0.56);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-bottom: 18px;
        }

        .section-title {
          display: flex;
          align-items: center;

          gap: 10px;

          font-size: 17px;
          font-weight: 650;
        }

        .section-title-icon {
          color: #67b8ff;
        }

        .history-link {
          border: 0 !important;
          outline: none;

          background:
            transparent !important;

          color: #43b8ff;

          font-size: 13px;
          font-weight: 600;
        }

        .history-link:hover {
          color: white;
        }

        .history-link:focus,
        .history-link:active {
          outline: none;

          background:
            transparent !important;
        }

        .recent-grid {
          display: grid;

          grid-template-columns:
            repeat(3,minmax(0,1fr));

          gap: 15px;
        }

        .meeting-card {
          padding: 17px;

          border-radius: 12px;

          border:
            1px solid
            rgba(148,163,184,0.12);

          background:
            linear-gradient(
              145deg,
              rgba(19,30,54,0.74),
              rgba(9,17,34,0.74)
            );

          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .meeting-card:hover {
          transform: translateY(-2px);

          border-color:
            rgba(87,124,255,0.30);
        }

        .meeting-card-top {
          display: flex;
          align-items: center;

          gap: 12px;
        }

        .meeting-card-icon {
          width: 43px;
          height: 43px;

          flex-shrink: 0;

          display: grid;
          place-items: center;

          border-radius: 11px;

          color: #7bc7ff;

          background:
            rgba(28,87,164,0.30);

          border:
            1px solid
            rgba(73,139,255,0.20);

          font-size: 10px;
          letter-spacing: 2px;
        }

        .meeting-card h4 {
          margin: 0 0 4px;

          font-size: 14px;
        }

        .meeting-id {
          margin: 0;

          color: #72819a;

          font-size: 11px;
        }

        .meeting-meta {
          margin: 15px 0;

          color: #8996ab;

          font-size: 11px;
        }

        .meeting-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 8px;
        }

        .meeting-role {
          padding:
            5px 8px;

          border-radius: 5px;

          color: #57e7bd;

          background:
            rgba(12,135,100,0.12);

          font-size: 10px;
          font-weight: 700;
        }

        .join-again {
          padding:
            7px 10px;

          border-radius: 7px;

          border:
            1px solid
            rgba(42,122,255,0.45);

          background:
            rgba(22,55,120,0.16);

          color: #55b8ff;

          font-size: 11px;
          font-weight: 700;

          transition:
            background 0.2s ease,
            color 0.2s ease;
        }

        .join-again:hover {
          color: white;

          background:
            rgba(42,122,255,0.20);
        }

        .empty-history {
          padding: 25px;

          text-align: center;

          color: #64748b;

          font-size: 13px;
        }

        /* =====================================================
           FEATURES
        ===================================================== */

        .features {
          display: grid;

          grid-template-columns:
            repeat(4,minmax(0,1fr));

          gap: 15px;

          margin-top: 17px;
        }

        .feature {
          min-height: 145px;

          padding: 19px;

          border-radius: 13px;

          border:
            1px solid
            rgba(148,163,184,0.12);

          background:
            rgba(11,22,43,0.62);

          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .feature:hover {
          transform: translateY(-2px);

          border-color:
            rgba(94,133,255,0.22);

          background:
            rgba(13,25,49,0.76);
        }

        .feature-icon {
          width: 42px;
          height: 42px;

          display: grid;
          place-items: center;

          border-radius: 10px;

          margin-bottom: 13px;

          font-size: 19px;
        }

        .feature:nth-child(1)
        .feature-icon {
          color: #59bfff;

          background:
            rgba(20,92,174,0.25);
        }

        .feature:nth-child(2)
        .feature-icon {
          color: #5de0ec;

          background:
            rgba(16,126,144,0.23);
        }

        .feature:nth-child(3)
        .feature-icon {
          color: #c493ff;

          background:
            rgba(104,53,164,0.25);
        }

        .feature:nth-child(4)
        .feature-icon {
          color: #63e9aa;

          background:
            rgba(29,127,82,0.23);
        }

        .feature h3 {
          margin:
            0 0 7px;

          font-size: 14px;
        }

        .feature p {
          margin: 0;

          color: #8793a8;

          font-size: 12px;

          line-height: 1.6;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .footer {
          position: relative;
          z-index: 1;

          min-height: 78px;

          padding:
            18px 42px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-top:
            1px solid
            rgba(148,163,184,0.11);

          border-radius:
            0 0 18px 18px;

          color: #68758c;

          font-size: 12px;
        }

        .footer-brand {
          display: flex;
          align-items: center;

          gap: 15px;
        }

        .footer-logo {
          width: 120px;
          height: 48px;

          object-fit: contain;
        }

        .footer-divider {
          width: 1px;
          height: 22px;

          background:
            rgba(148,163,184,0.18);
        }

        .footer-right {
          color: #7d899c;
        }

        /* =====================================================
           RESPONSIVE - TABLET
        ===================================================== */

        @media (max-width: 1150px) {

          .hero {
            grid-template-columns: 1fr;

            gap: 35px;
          }

          .session-card {
            width: 100%;
            max-width: 680px;

            margin: 0 auto;
          }

          .recent-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

        }

        /* =====================================================
           RESPONSIVE - SMALL TABLET
        ===================================================== */

        @media (max-width: 850px) {

          .navbar {
            padding:
              0 20px;
          }

          .nav-center {
            display: none;
          }

          .main {
            padding:
              32px 22px;
          }

          .benefits {
            grid-template-columns:
              repeat(2,1fr);
          }

          .benefit:nth-child(2) {
            border-right: 0;
          }

          .benefit:nth-child(-n+2) {
            border-bottom:
              1px solid
              rgba(148,163,184,0.10);
          }

          .features {
            grid-template-columns:
              repeat(2,1fr);
          }

          .footer {
            padding:
              18px 22px;
          }

        }

        /* =====================================================
           RESPONSIVE - MOBILE
        ===================================================== */

        @media (max-width: 600px) {

          .home-shell {
            width:
              calc(100% - 12px);

            margin: 6px auto;

            min-height:
              calc(100vh - 12px);

            border-radius: 13px;
          }

          .navbar {
            height: 70px;

            border-radius:
              13px 13px 0 0;
          }

          .brand {
            width: 150px;
          }

          .brand img {
            width: 145px;
            height: 60px;
          }

          .user-name,
          .user-chevron {
            display: none;
          }

          .main {
            padding:
              28px 15px;
          }

          .hero-title {
            font-size: 43px;

            letter-spacing: -2px;
          }

          .hero-description {
            font-size: 15px;
          }

          .benefits {
            grid-template-columns: 1fr;
          }

          .benefit,
          .benefit:nth-child(2) {
            border-right: 0;

            border-bottom:
              1px solid
              rgba(148,163,184,0.10);
          }

          .benefit:last-child {
            border-bottom: 0;
          }

          .session-card {
            padding: 20px;
          }

          .session-title {
            font-size: 24px;
          }

          .online-badge {
            padding:
              7px 9px;

            font-size: 10px;
          }

          .join-form {
            flex-direction: column;
          }

          .join-button {
            width: 100%;
            height: 50px;
          }

          .recent-grid,
          .features {
            grid-template-columns: 1fr;
          }

          .footer {
            flex-direction: column;

            gap: 12px;

            align-items: flex-start;

            border-radius:
              0 0 13px 13px;
          }

          .footer-right {
            display: none;
          }

        }

      `}</style>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="navbar">

        {/* BRAND */}

        <button
          className="brand"
          onClick={() => navigate("/")}
          aria-label="Mulaqat home"
        >
          <img
            src="/mulaqat-logo-horizontal.png"
            alt="Mulaqat"
          />
        </button>

        {/* NAVIGATION */}

        <nav className="nav-center">

          <button
            type="button"
            className="nav-link active"
            onClick={() => navigate("/")}
          >
            <span>⌂</span>
            <span>Home</span>
          </button>

          <button
            type="button"
            className="nav-link"
            onClick={() => navigate("/history")}
          >
            <span>◷</span>
            <span>History</span>
          </button>

          <button
            type="button"
            className="nav-link"
            onClick={() => {
              window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth",
              });
            }}
          >
            <span>ⓘ</span>
            <span>About</span>
          </button>

        </nav>

        {/* USER */}

        <div className="nav-right">

          <button
            type="button"
            className="user-button"
            onClick={() =>
              setMenuOpen((value) => !value)
            }
            aria-expanded={menuOpen}
          >

            <div className="avatar">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="avatar-image"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                avatarLetter
              )}
            </div>

            <span className="user-name">
              {userName}
            </span>

            <span
              className={`user-chevron ${
                menuOpen ? "open" : ""
              }`}
            >
              ⌄
            </span>

          </button>

          {menuOpen && (
            <div className="dropdown">

              <div className="dropdown-user">

                <div className="dropdown-user-name">
                  {userName}
                </div>

                <div className="dropdown-user-status">
                  Online
                </div>

              </div>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/history");
                }}
              >
                ◷ &nbsp; Meeting history
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings");
                }}
              >
                ⚙ &nbsp; Settings
              </button>

              <button
                type="button"
                className="logout"
                onClick={handleLogout}
              >
                ↪ &nbsp; Log out
              </button>

            </div>
          )}

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="main">

        {/* ALERT */}

        {(error || success) && (
          <div
            className={`alert ${
              error ? "error" : "success"
            }`}
          >
            {error || success}
          </div>
        )}

        {/* =================================================
            HERO
        ================================================= */}

        <section className="hero">

          {/* LEFT */}

          <div className="hero-left">

            <div className="glow-orb" />

            <div className="eyebrow">
              <span className="online-dot" />

              Secure. Simple. Seamless.
            </div>

            <h1 className="hero-title">

              Meet face-to-face,

              <br />

              <span className="gradient-text">
                from anywhere.
              </span>

            </h1>

            <p className="hero-description">
              Connect with your team, friends, and
              family through secure, high-quality
              video meetings built for effortless
              conversations.
            </p>

            {/* BENEFITS */}

            <div className="benefits">

              <div className="benefit">

                <div className="benefit-icon">
                  ◈
                </div>

                <div>
                  <strong>
                    Secure
                  </strong>

                  <span>
                    Protected meetings
                  </span>
                </div>

              </div>

              <div className="benefit">

                <div className="benefit-icon">
                  ⚡
                </div>

                <div>
                  <strong>
                    Instant
                  </strong>

                  <span>
                    No downloads
                  </span>
                </div>

              </div>

              <div className="benefit">

                <div className="benefit-icon">
                  HD
                </div>

                <div>
                  <strong>
                    HD Quality
                  </strong>

                  <span>
                    Clear video & audio
                  </span>
                </div>

              </div>

              <div className="benefit">

                <div className="benefit-icon">
                  ••
                </div>

                <div>
                  <strong>
                    Collaborate
                  </strong>

                  <span>
                    Work together
                  </span>
                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              SESSION CARD
          ================================================= */}

          <div className="session-card">

            <div className="session-top">

              <div>

                <div className="session-label">
                  START A SESSION
                </div>

                <div className="session-title">
                  Ready when you are.
                </div>

              </div>

              <div className="online-badge">
                <span />
                Online
              </div>

            </div>

            {meetingCreated ? (

              <div className="join-box">

                <div className="join-heading">

                  <div className="join-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Meeting Created
                    </strong>

                    <span>
                      {meetingCode}
                    </span>

                  </div>

                </div>

                <div className="join-form">

                  <button
                    type="button"
                    className="join-button"
                    onClick={handleCopyMeeting}
                  >
                    Copy Meeting
                  </button>

                  <button
                    type="button"
                    className="join-button"
                    onClick={() => handleJoinMeeting()}
                    disabled={joinLoading}
                  >
                    {joinLoading ? "..." : "Join Meeting"}
                  </button>

                </div>

              </div>

            ) : (

              <>

                {/* CREATE */}

                <button
                  type="button"
                  className="create-button"
                  onClick={handleCreateMeeting}
                  disabled={loading}
                >

                  <div className="create-icon">
                    +
                  </div>

                  <div className="create-copy">

                    <strong>
                      {loading
                        ? "Creating..."
                        : "Create New Meeting"}
                    </strong>

                    <span>
                      Start an instant video call
                    </span>

                  </div>

                  <div className="arrow">
                    →
                  </div>

                </button>

                {/* OR */}

                <div className="or-divider">
                  OR
                </div>

                {/* JOIN */}

                <div className="join-box">

                  <div className="join-heading">

                    <div className="join-icon">
                      ↗
                    </div>

                    <div>

                      <strong>
                        Join a Meeting
                      </strong>

                      <span>
                        Enter meeting ID to join
                      </span>

                    </div>

                  </div>

                  <form
                    className="join-form"
                    onSubmit={handleJoinMeeting}
                  >

                    <input
                      className="meeting-input"
                      value={meetingCode}
                      onChange={(event) =>
                        setMeetingCode(
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="MUL-XXXXXXXX"
                      maxLength={20}
                      autoComplete="off"
                      spellCheck="false"
                    />

                    <button
                      type="submit"
                      className="join-button"
                      disabled={
                        joinLoading ||
                        !meetingCode.trim()
                      }
                    >
                      {joinLoading
                        ? "..."
                        : "Join"}
                    </button>

                  </form>

                </div>

              </>

            )}

            {/* PRIVACY */}

            <div className="privacy-note">

              <span className="privacy-icon">
                ♙
              </span>

              Your meetings are private and secured
              with authentication.

            </div>

          </div>

        </section>

        {/* =================================================
            RECENT MEETINGS
        ================================================= */}

        <section className="recent-section">

          <div className="section-header">

            <div className="section-title">

              <span className="section-title-icon">
                ◷
              </span>

              Recent Meetings

            </div>

            <button
              type="button"
              className="history-link"
              onClick={() => navigate("/history")}
            >
              View all history →
            </button>

          </div>

          {meetings.length === 0 ? (

            <div className="empty-history">
              Your recent meetings will appear here.
            </div>

          ) : (

            <div className="recent-grid">

              {meetings
                .slice(0, 3)
                .map((meeting) => (

                  <div
                    className="meeting-card"
                    key={
                      meeting._id ||
                      meeting.meetingId
                    }
                  >

                    <div className="meeting-card-top">

                      <div className="meeting-card-icon">
                        •••
                      </div>

                      <div>

                        <h4>
                          {meeting.title ||
                            "Video Meeting"}
                        </h4>

                        <p className="meeting-id">
                          Meeting ID:{" "}
                          {meeting.meetingId}
                        </p>

                      </div>

                    </div>

                    <div className="meeting-meta">
                      {formatDate(
                        meeting.createdAt
                      )}

                      {" · "}

                      {formatTime(
                        meeting.createdAt
                      )}
                    </div>

                    <div className="meeting-card-bottom">

                      <span className="meeting-role">
                        {meeting.host
                          ? "Meeting"
                          : "Joined"}
                      </span>

                      <button
                        type="button"
                        className="join-again"
                        onClick={() =>
                          handleJoinAgain(
                            meeting.meetingId
                          )
                        }
                      >
                        Join Again
                      </button>

                    </div>

                  </div>

                ))}

            </div>

          )}

        </section>

        {/* =================================================
            FEATURES
        ================================================= */}

        <section className="features">

          <div className="feature">

            <div className="feature-icon">
              ▣
            </div>

            <h3>
              Crystal-clear Video
            </h3>

            <p>
              HD video and audio for natural,
              focused conversations.
            </p>

          </div>

          <div className="feature">

            <div className="feature-icon">
              ●
            </div>

            <h3>
              Real-time Chat
            </h3>

            <p>
              Share messages and important
              details without leaving your call.
            </p>

          </div>

          <div className="feature">

            <div className="feature-icon">
              ▣
            </div>

            <h3>
              Screen Sharing
            </h3>

            <p>
              Present your work, ideas, or
              anything on your screen instantly.
            </p>

          </div>

          <div className="feature">

            <div className="feature-icon">
              ◈
            </div>

            <h3>
              Private & Secure
            </h3>

            <p>
              Authenticated meetings keep
              your conversations protected.
            </p>

          </div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="footer">

        <div className="footer-brand">

          <img
            className="footer-logo"
            src="/mulaqat-logo-horizontal.png"
            alt="Mulaqat"
          />

          <div className="footer-divider" />

          <span>
            © 2026 Mulaqat. All rights reserved.
          </span>

        </div>

        <div className="footer-right">
          Simple. Secure. Together.
        </div>

      </footer>

    </div>
  );
};

export default Home;