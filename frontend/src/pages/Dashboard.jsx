import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const [meetingInput, setMeetingInput] = useState("");
  const [showJoinBox, setShowJoinBox] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [copied, setCopied] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  };

  // =========================================================
  // CREATE NEW MEETING
  // =========================================================

  const startMeeting = () => {
    const roomId = Math.random()
      .toString(36)
      .substring(2, 8);

    const link = `${window.location.origin}/room/${roomId}`;

    setMeetingLink(link);

    navigate(`/room/${roomId}`);
  };

  // =========================================================
  // COPY MEETING LINK
  // =========================================================

  const copyMeetingLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  // =========================================================
  // JOIN EXISTING MEETING
  // =========================================================

  const joinMeeting = () => {
    setJoinError("");

    const input = meetingInput.trim();

    if (!input) {
      setJoinError("Please paste a meeting link.");
      return;
    }

    try {
      const url = new URL(input);

      const parts = url.pathname.split("/");

      const roomIndex = parts.indexOf("room");

      if (
        roomIndex !== -1 &&
        parts[roomIndex + 1]
      ) {
        const roomId = parts[roomIndex + 1];

        navigate(`/room/${roomId}`);
        return;
      }

      setJoinError("Invalid meeting link.");
    } catch (error) {
      setJoinError(
        "Please paste a valid meeting link."
      );
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-gray-100">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">

        <h1 className="text-2xl font-bold text-blue-600">
          ConnectHub
        </h1>

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>

      </nav>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* WELCOME */}

        <div className="mb-10">

          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome, {user?.name}! 👋
          </h2>

          <p className="text-gray-500">
            Start a new meeting or join an existing one.
          </p>

        </div>

        {/* ===================================================
            MEETING CARD
        =================================================== */}

        <div className="bg-white rounded-2xl shadow-md p-8 max-w-3xl">

          <div className="flex items-start gap-5">

            <div className="text-5xl">
              🎥
            </div>

            <div className="flex-1">

              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Video Meeting
              </h3>

              <p className="text-gray-500 mb-6">
                Connect with others using video, audio,
                screen sharing, live chat and whiteboard.
              </p>

              {/* BUTTONS */}

              <div className="flex flex-wrap gap-3">

                <button
                  onClick={startMeeting}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  🎥 Start Meeting
                </button>

                <button
                  onClick={() => {
                    setShowJoinBox(!showJoinBox);
                    setJoinError("");
                  }}
                  className="bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
                >
                  🔗 Join Meeting
                </button>

              </div>

            </div>

          </div>

          {/* =================================================
              MEETING LINK
          ================================================= */}

          {meetingLink && (

            <div className="mt-8 pt-6 border-t border-gray-200">

              <h4 className="text-lg font-bold text-gray-800 mb-2">
                Meeting Link
              </h4>

              <p className="text-sm text-gray-500 mb-3">
                Share this link with other participants:
              </p>

              <div className="flex gap-2">

                <input
                  type="text"
                  value={meetingLink}
                  readOnly
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-600"
                />

                <button
                  onClick={copyMeetingLink}
                  className="bg-blue-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  {copied ? "✓ Copied" : "📋 Copy Link"}
                </button>

              </div>

            </div>

          )}

          {/* =================================================
              JOIN MEETING BOX
          ================================================= */}

          {showJoinBox && (

            <div className="mt-8 pt-6 border-t border-gray-200">

              <h4 className="text-lg font-bold text-gray-800 mb-2">
                Join an Existing Meeting
              </h4>

              <p className="text-sm text-gray-500 mb-4">
                Paste the meeting link shared with you.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">

                <input
                  type="text"
                  value={meetingInput}
                  onChange={(e) => {
                    setMeetingInput(e.target.value);
                    setJoinError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      joinMeeting();
                    }
                  }}
                  placeholder="Paste meeting link here"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  onClick={joinMeeting}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition"
                >
                  Join Meeting
                </button>

              </div>

              {joinError && (
                <p className="text-red-500 text-sm mt-3">
                  {joinError}
                </p>
              )}

            </div>

          )}

        </div>

        {/* ===================================================
            FEATURES
        =================================================== */}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-2xl mb-2">🎤</div>

            <h4 className="font-semibold text-gray-800">
              Audio & Video
            </h4>

            <p className="text-sm text-gray-500 mt-1">
              Real-time communication
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-2xl mb-2">🖥️</div>

            <h4 className="font-semibold text-gray-800">
              Screen Sharing
            </h4>

            <p className="text-sm text-gray-500 mt-1">
              Share your screen
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-2xl mb-2">💬</div>

            <h4 className="font-semibold text-gray-800">
              Live Chat
            </h4>

            <p className="text-sm text-gray-500 mt-1">
              Chat during meetings
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-2xl mb-2">🎨</div>

            <h4 className="font-semibold text-gray-800">
              Whiteboard
            </h4>

            <p className="text-sm text-gray-500 mt-1">
              Collaborate together
            </p>
          </div>

        </div>

      </main>

    </div>
  );
}

export default Dashboard;