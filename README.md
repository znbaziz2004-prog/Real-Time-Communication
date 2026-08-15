# 🎥 ConnectHub

ConnectHub is a real-time communication and collaboration web application that allows users to create and join online video meetings.

Users can communicate through video and audio, share their screens, chat in real time, exchange files, and collaborate using a real-time whiteboard.

---

🚀 Features

🎥 Video & Audio Meetings
- Create a new meeting room
- Join an existing meeting using a meeting link or room ID
- Real-time video and audio communication
- WebRTC-based peer-to-peer communication

🎤 Meeting Controls
- Turn microphone on/off
- Turn camera on/off
- Start and stop screen sharing
- Leave meeting

 👥 Participants
- View users currently present in the meeting
- Real-time participant updates

 💬 Real-Time Chat
- Send messages during meetings
- Messages are synchronized between participants
- Displays sender information

 📁 File Sharing
- Share files with meeting participants
- Display shared file information
- Download shared files

 🎨 Real-Time Whiteboard
- Draw collaboratively with participants
- Select brush color
- Select brush size
- Clear the whiteboard
- Real-time drawing synchronization

 🔗 Meeting Links
- Copy the current meeting link
- Share the link with other participants
- Join meetings directly using the shared URL

 🔐 Authentication
- User authentication
- Protected meeting rooms
- Authentication token verification

---

🛠️ Technologies Used

Frontend
- React.js
- React Router
- Tailwind CSS
- JavaScript

 Real-Time Communication
- WebRTC
- Socket.IO

Backend
- Node.js
- Express.js
- Socket.IO

 Other Technologies
- HTML5
- CSS3
- Browser Media APIs
- WebRTC APIs

---

 📂 Project Structure

```text
ConnectHub/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── middleware/
│   └── ...
│
├── .gitignore
└── README.md
