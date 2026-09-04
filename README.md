\# Mulaqat



Mulaqat is a full-stack real-time video conferencing platform designed for secure and interactive online meetings.



It provides user authentication, meeting creation and joining, multi-user video communication, real-time chat, screen sharing, meeting history, and account management in a single web application.



\---



\## Features



\### Authentication

\- User registration and login

\- JWT-based authentication

\- Google OAuth authentication

\- Forgot password flow

\- Password reset through email

\- Protected routes and API endpoints

\- Secure logout



\### Meetings

\- Create a new meeting

\- Join an existing meeting using Meeting ID

\- Unique Meeting IDs

\- Host and participant management

\- Host can end the meeting for everyone

\- Participants can leave independently

\- Meeting-ended state handling



\### Real-Time Video Calling

\- Multi-user video conferencing

\- WebRTC-based peer-to-peer media communication

\- Socket.IO-based signaling

\- Camera and microphone access

\- Dynamic participant handling

\- ICE candidate exchange

\- Offer/answer negotiation



\### Real-Time Chat

\- In-meeting messaging

\- Real-time message delivery using Socket.IO

\- Message validation

\- Message length protection



\### Screen Sharing

\- Start and stop screen sharing

\- WebRTC track replacement

\- Camera track restoration after screen sharing

\- Real-time screen sharing inside meetings



\### Meeting History

\- View previous meetings

\- Display meeting information and status

\- Delete meeting history

\- Host authorization for meeting deletion



\### Account Settings

\- Update profile name

\- Update profile photo

\- Use Google profile photo

\- Change email with OTP verification

\- Change password with current-password verification

\- Delete account



\---



\## Tech Stack



\### Frontend

\- React

\- Vite

\- Axios

\- Socket.IO Client

\- WebRTC

\- React Router



\### Backend

\- Node.js

\- Express.js

\- Socket.IO

\- Passport.js

\- JWT



\### Database

\- MongoDB

\- Mongoose



\### Authentication \& Email

\- JSON Web Tokens

\- Google OAuth 2.0

\- Passport Google OAuth 2.0

\- Nodemailer

\- Password hashing



\### File Handling

\- Multer

\- Local avatar storage



\---



\## Architecture



Mulaqat follows a client-server architecture with WebRTC used for real-time media communication.



```text

&#x20;                   ┌─────────────────────┐

&#x20;                   │       Browser       │

&#x20;                   │   React + Vite      │

&#x20;                   └──────────┬──────────┘

&#x20;                              │

&#x20;                   HTTP / REST API

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌─────────────────────┐

&#x20;                   │   Node.js / Express │

&#x20;                   │      Backend        │

&#x20;                   └───────┬─────┬───────┘

&#x20;                           │     │

&#x20;                 MongoDB   │     │ Socket.IO

&#x20;                           │     │

&#x20;                           ▼     ▼

&#x20;                   ┌──────────┐  ┌──────────────┐

&#x20;                   │ MongoDB  │  │ Signaling    │

&#x20;                   │ Database │  │ Server       │

&#x20;                   └──────────┘  └──────┬───────┘

&#x20;                                        │

&#x20;                                 WebRTC Signaling

&#x20;                                        │

&#x20;                          ┌─────────────┴─────────────┐

&#x20;                          ▼                           ▼

&#x20;                   ┌─────────────┐             ┌─────────────┐

&#x20;                   │ Participant │◄── WebRTC ─►│ Participant │

&#x20;                   │   Browser   │   Media      │   Browser   │

&#x20;                   └─────────────┘             └─────────────┘

