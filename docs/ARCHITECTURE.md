# Mulaqat — System Architecture

## 1. Overview

Mulaqat is a full-stack real-time video conferencing application built using React, Node.js, Express, MongoDB, Socket.IO, and WebRTC.

The application follows a client-server architecture where:

- React handles the user interface and client-side application logic.
- Express provides REST APIs.
- MongoDB stores users and meeting information.
- Socket.IO provides real-time signaling and communication.
- WebRTC handles real-time audio/video communication between participants.

The backend is responsible for authentication, authorization, meeting management, signaling, and persistent data.

The browser-to-browser WebRTC connection is responsible for transmitting real-time media.

---

## 2. High-Level Architecture

```text
                         MULAQAT
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
        React Frontend              Node.js Backend
        Vite Application             Express + Socket.IO
              │                           │
       ┌──────┴──────┐             ┌──────┴──────┐
       │             │             │             │
       ▼             ▼             ▼             ▼
    REST API      WebRTC       REST APIs    Socket.IO
    Requests      Media        Controllers   Signaling
       │             │             │             │
       │             │             ▼             │
       │             │          MongoDB          │
       │             │             │             │
       └─────────────┴─────────────┴─────────────┘
                            │
                            ▼
                    WebRTC Peer Connections