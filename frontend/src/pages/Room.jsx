import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socket from "../services/socket";


function Room() {
 
const [copied, setCopied] = useState(false);
  const { roomId } = useParams();
  const navigate = useNavigate();

  // =========================================================
  // VIDEO REFERENCES
  // =========================================================

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // =========================================================
  // WEBRTC REFERENCES
  // =========================================================

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const pendingCandidatesRef = useRef([]);

  const cameraTrackRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Prevent duplicate offers
  const makingOfferRef = useRef(false);

  // =========================================================
  // CHAT
  // =========================================================

  const chatMessagesEndRef = useRef(null);

  // =========================================================
  // FILE SHARING
  // =========================================================

  const fileInputRef = useRef(null);

  // =========================================================
  // WHITEBOARD
  // =========================================================

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  // =========================================================
  // UI STATE
  // =========================================================

  const [users, setUsers] = useState([]);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  const [sharedFiles, setSharedFiles] = useState([]);

  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);

  // =========================================================
  // CREATE PEER CONNECTION
  // =========================================================

  const createPeerConnection = () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    console.log("🔗 Creating WebRTC peer connection");

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
        {
          urls: "stun:stun1.l.google.com:19302",
        },
      ],
    });

    peerConnectionRef.current = peerConnection;

    // =======================================================
    // ADD LOCAL TRACKS
    // =======================================================

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        const alreadyAdded = peerConnection
          .getSenders()
          .some((sender) => sender.track === track);

        if (!alreadyAdded) {
          console.log("➕ Adding local track:", track.kind);

          peerConnection.addTrack(
            track,
            localStreamRef.current
          );
        }
      });
    }

    // =======================================================
    // REMOTE TRACK
    // =======================================================

    peerConnection.ontrack = (event) => {
      console.log("🎥 Remote stream received");

      const remoteStream = event.streams?.[0];

      if (!remoteStream) {
        console.warn("⚠️ No remote stream found");
        return;
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;

        // Try playing after stream is attached
        remoteVideoRef.current
          .play()
          .catch((error) => {
            console.warn(
              "⚠️ Remote video play:",
              error.message
            );
          });
      }
    };

    // =======================================================
    // ICE CANDIDATE
    // =======================================================

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate");

        socket.emit("ice-candidate", {
          candidate: event.candidate,
          roomId,
        });
      }
    };

    // =======================================================
    // CONNECTION STATE
    // =======================================================

    peerConnection.onconnectionstatechange = () => {
      console.log(
        "🌐 WebRTC connection state:",
        peerConnection.connectionState
      );

      if (peerConnection.connectionState === "connected") {
        console.log("✅ WebRTC connection established");
      }

      if (peerConnection.connectionState === "failed") {
        console.error(
          "❌ WebRTC connection failed"
        );
      }

      if (peerConnection.connectionState === "disconnected") {
        console.warn(
          "⚠️ WebRTC connection disconnected"
        );
      }
    };

    // =======================================================
    // ICE CONNECTION STATE
    // =======================================================

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "🧊 ICE connection state:",
        peerConnection.iceConnectionState
      );

      if (
        peerConnection.iceConnectionState ===
        "connected"
      ) {
        console.log("✅ ICE connected");
      }

      if (
        peerConnection.iceConnectionState ===
        "completed"
      ) {
        console.log("✅ ICE completed");
      }

      if (
        peerConnection.iceConnectionState ===
        "failed"
      ) {
        console.error(
          "❌ ICE connection failed"
        );
      }
    };

    // =======================================================
    // ICE GATHERING
    // =======================================================

    peerConnection.onicegatheringstatechange = () => {
      console.log(
        "🧊 ICE gathering state:",
        peerConnection.iceGatheringState
      );
    };

    return peerConnection;
  };

  // =========================================================
  // CREATE OFFER
  // =========================================================

  const createOffer = async () => {
    try {
      const peerConnection =
        createPeerConnection();

      if (
        makingOfferRef.current
      ) {
        console.log(
          "⚠️ Already creating offer"
        );

        return;
      }

      if (
        peerConnection.signalingState !==
        "stable"
      ) {
        console.log(
          "⚠️ Signaling state is not stable:",
          peerConnection.signalingState
        );

        return;
      }

      makingOfferRef.current = true;

      console.log("📞 Creating offer...");

      const offer =
        await peerConnection.createOffer();

      await peerConnection.setLocalDescription(
        offer
      );

      socket.emit("offer", {
        offer: peerConnection.localDescription,
        roomId,
      });

      console.log("📤 Offer sent");
    } catch (error) {
      console.error(
        "❌ Offer error:",
        error
      );
    } finally {
      makingOfferRef.current = false;
    }
  };

  // =========================================================
  // ADD PENDING ICE CANDIDATES
  // =========================================================

  const addPendingCandidates = async (
    peerConnection
  ) => {
    if (
      !peerConnection.remoteDescription
    ) {
      return;
    }

    if (
      pendingCandidatesRef.current.length ===
      0
    ) {
      return;
    }

    console.log(
      "🧊 Adding pending ICE candidates:",
      pendingCandidatesRef.current.length
    );

    for (const candidate of
      pendingCandidatesRef.current) {
      try {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error(
          "❌ Pending ICE error:",
          error
        );
      }
    }

    pendingCandidatesRef.current = [];
  };

  // =========================================================
  // SCREEN SHARING
  // =========================================================

  const startScreenSharing = async () => {
    try {
      console.log(
        "🖥️ Starting screen sharing..."
      );

      const screenStream =
        await navigator.mediaDevices.getDisplayMedia(
          {
            video: true,
            audio: false,
          }
        );

      const screenTrack =
        screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        return;
      }

      screenStreamRef.current =
        screenStream;

      if (
        localStreamRef.current &&
        !cameraTrackRef.current
      ) {
        cameraTrackRef.current =
          localStreamRef.current.getVideoTracks()[0];
      }

      const peerConnection =
        peerConnectionRef.current;

      if (peerConnection) {
        const videoSender =
          peerConnection
            .getSenders()
            .find(
              (sender) =>
                sender.track &&
                sender.track.kind === "video"
            );

        if (videoSender) {
          await videoSender.replaceTrack(
            screenTrack
          );

          console.log(
            "🔄 Video track replaced with screen"
          );
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject =
          screenStream;

        localVideoRef.current
          .play()
          .catch(() => {});
      }

      setScreenSharing(true);

      screenTrack.onended = () => {
        stopScreenSharing();
      };

      console.log(
        "🖥️ Screen sharing started"
      );
    } catch (error) {
      console.error(
        "❌ Screen sharing error:",
        error
      );
    }
  };

  // =========================================================
  // STOP SCREEN SHARING
  // =========================================================

  const stopScreenSharing = async () => {
    try {
      const cameraTrack =
        cameraTrackRef.current;

      const peerConnection =
        peerConnectionRef.current;

      if (
        peerConnection &&
        cameraTrack
      ) {
        const videoSender =
          peerConnection
            .getSenders()
            .find(
              (sender) =>
                sender.track &&
                sender.track.kind === "video"
            );

        if (videoSender) {
          await videoSender.replaceTrack(
            cameraTrack
          );

          console.log(
            "🔄 Camera track restored"
          );
        }
      }

      if (screenStreamRef.current) {
        screenStreamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        screenStreamRef.current = null;
      }

      if (
        localVideoRef.current &&
        localStreamRef.current
      ) {
        localVideoRef.current.srcObject =
          localStreamRef.current;

        localVideoRef.current
          .play()
          .catch(() => {});
      }

      setScreenSharing(false);

      console.log(
        "📹 Camera restored"
      );
    } catch (error) {
      console.error(
        "❌ Stop screen sharing error:",
        error
      );
    }
  };

  // =========================================================
  // WHITEBOARD - GET POINT
  // =========================================================

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX - rect.left) *
        (canvas.width / rect.width),

      y:
        (event.clientY - rect.top) *
        (canvas.height / rect.height),
    };
  };

  // =========================================================
  // WHITEBOARD - DRAW LINE
  // =========================================================

  const drawLine = (
    start,
    end,
    color,
    size
  ) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.beginPath();

    context.moveTo(
      start.x,
      start.y
    );

    context.lineTo(
      end.x,
      end.y
    );

    context.strokeStyle =
      color;

    context.lineWidth =
      size;

    context.lineCap =
      "round";

    context.lineJoin =
      "round";

    context.stroke();
  };

  // =========================================================
  // WHITEBOARD - START DRAWING
  // =========================================================

  const startDrawing = (event) => {
    event.preventDefault();

    const point =
      getCanvasPoint(event);

    isDrawingRef.current = true;

    lastPointRef.current =
      point;

    if (
      canvasRef.current?.setPointerCapture
    ) {
      try {
        canvasRef.current.setPointerCapture(
          event.pointerId
        );
      } catch {}
    }
  };

  // =========================================================
  // WHITEBOARD - DRAW
  // =========================================================

  const draw = (event) => {
    if (
      !isDrawingRef.current
    ) {
      return;
    }

    event.preventDefault();

    const currentPoint =
      getCanvasPoint(event);

    const previousPoint =
      lastPointRef.current;

    if (!previousPoint) {
      lastPointRef.current =
        currentPoint;

      return;
    }

    drawLine(
      previousPoint,
      currentPoint,
      brushColor,
      brushSize
    );

    socket.emit(
      "whiteboard-draw",
      {
        roomId,
        drawing: {
          start: previousPoint,
          end: currentPoint,
          color: brushColor,
          size: brushSize,
        },
      }
    );

    lastPointRef.current =
      currentPoint;
  };

  // =========================================================
  // WHITEBOARD - STOP DRAWING
  // =========================================================

  const stopDrawing = (event) => {
    if (event) {
      try {
        canvasRef.current?.releasePointerCapture(
          event.pointerId
        );
      } catch {}
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  // =========================================================
  // WHITEBOARD - CLEAR
  // =========================================================

  const clearWhiteboard = () => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext("2d");

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    socket.emit(
      "whiteboard-clear",
      roomId
    );

    console.log(
      "🧹 Whiteboard cleared"
    );
  };

  // =========================================================
  // WHITEBOARD - SETUP CANVAS
  // =========================================================

  const setupCanvas = () => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const container =
      canvas.parentElement;

    if (!container) {
      return;
    }

    const width =
      container.clientWidth;

    if (!width) {
      return;
    }

    const height = 400;

    let oldImage = null;

    if (
      canvas.width > 0 &&
      canvas.height > 0
    ) {
      oldImage =
        canvas.toDataURL();
    }

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    context.lineCap = "round";
    context.lineJoin = "round";

    if (
      oldImage &&
      oldImage !== "data:,"
    ) {
      const image = new Image();

      image.onload = () => {
        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );
      };

      image.src = oldImage;
    }
  };

  // =========================================================
  // MAIN ROOM SETUP
  // =========================================================

 useEffect(() => {
  let mounted = true;

  // =======================================================
  // CONNECT AUTHENTICATED SOCKET
  // =======================================================

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  if (!token) {
    console.error(
      "❌ No authentication token found"
    );

    navigate("/login");
    return;
  }

  // Update socket authentication token
  socket.auth = {
    token,
  };

  if (!socket.connected) {
    socket.connect();
  }
//start meeting
  const startMeeting = async () => {
      try {
        console.log(
          "🎥 Requesting camera and microphone..."
        );

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: true,
            }
          );

        if (!mounted) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          return;
        }

        localStreamRef.current =
          stream;

        cameraTrackRef.current =
          stream.getVideoTracks()[0];

        if (localVideoRef.current) {
          localVideoRef.current.srcObject =
            stream;

          localVideoRef.current
            .play()
            .catch(() => {});
        }

        console.log(
          "🎥 Camera and microphone ready"
        );

        // Make sure socket is connected
        if (!socket.connected) {
          console.log(
            "🔌 Connecting socket..."
          );

          socket.connect();
        }

        socket.emit(
          "join-room",
          roomId
        );

        console.log(
          "🚪 Joined room:",
          roomId
        );
      } catch (error) {
        console.error(
          "❌ Camera/Microphone error:",
          error
        );
      }
    };

    startMeeting();

    // =======================================================
    // ROOM USERS
    // =======================================================

    const handleRoomUsers = (
      roomUsers
    ) => {
      console.log(
        "👥 Room users:",
        roomUsers
      );

      setUsers(roomUsers);

      /*
       * IMPORTANT:
       * Server includes our own socket ID.
       * If another user already exists,
       * the new user will wait for the existing
       * user to create the offer.
       *
       * We don't create an offer here because
       * "user-joined" will trigger it on the
       * existing participant.
       */
    };

    socket.on(
      "room-users",
      handleRoomUsers
    );

    // =======================================================
    // USER JOINED
    // =======================================================

    const handleUserJoined = async ({
      userId,
    }) => {
      console.log(
        "👤 User joined:",
        userId
      );

      setUsers(
        (currentUsers) => {
          if (
            currentUsers.includes(
              userId
            )
          ) {
            return currentUsers;
          }

          return [
            ...currentUsers,
            userId,
          ];
        }
      );

      /*
       * Existing user creates offer.
       */

      await createOffer();
    };

    socket.on(
      "user-joined",
      handleUserJoined
    );

    // =======================================================
    // OFFER RECEIVED
    // =======================================================

    const handleOffer = async (
      offer
    ) => {
      try {
        console.log(
          "📥 Offer received"
        );

        const peerConnection =
          createPeerConnection();

        /*
         * If another offer arrives while
         * connection is not stable, ignore it.
         */

        if (
          peerConnection.signalingState !==
          "stable"
        ) {
          console.log(
            "⚠️ Ignoring offer because signaling state is:",
            peerConnection.signalingState
          );

          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            offer
          )
        );

        console.log(
          "✅ Remote offer description set"
        );

        await addPendingCandidates(
          peerConnection
        );

        const answer =
          await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(
          answer
        );

        socket.emit(
          "answer",
          {
            answer:
              peerConnection.localDescription,
            roomId,
          }
        );

        console.log(
          "📤 Answer sent"
        );
      } catch (error) {
        console.error(
          "❌ Offer handling error:",
          error
        );
      }
    };

    socket.on(
      "offer",
      handleOffer
    );

    // =======================================================
    // ANSWER RECEIVED
    // =======================================================

    const handleAnswer = async (
      answer
    ) => {
      try {
        console.log(
          "📥 Answer received"
        );

        const peerConnection =
          peerConnectionRef.current;

        if (!peerConnection) {
          console.warn(
            "⚠️ No peer connection for answer"
          );

          return;
        }

        if (
          peerConnection.signalingState !==
          "have-local-offer"
        ) {
          console.log(
            "⚠️ Ignoring answer. Current signaling state:",
            peerConnection.signalingState
          );

          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            answer
          )
        );

        console.log(
          "✅ Remote description set"
        );

        await addPendingCandidates(
          peerConnection
        );
      } catch (error) {
        console.error(
          "❌ Remote answer error:",
          error
        );
      }
    };

    socket.on(
      "answer",
      handleAnswer
    );

    // =======================================================
    // ICE CANDIDATE
    // =======================================================

    const handleIceCandidate =
      async (candidate) => {
        try {
          const peerConnection =
            peerConnectionRef.current;

          if (!peerConnection) {
            console.log(
              "🧊 Storing ICE candidate - no peer connection yet"
            );

            pendingCandidatesRef.current.push(
              candidate
            );

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

            console.log(
              "🧊 ICE candidate added"
            );
          } else {
            console.log(
              "🧊 Storing ICE candidate - remote description not ready"
            );

            pendingCandidatesRef.current.push(
              candidate
            );
          }
        } catch (error) {
          console.error(
            "❌ ICE candidate error:",
            error
          );
        }
      };

    socket.on(
      "ice-candidate",
      handleIceCandidate
    );

    // =======================================================
    // USER LEFT
    // =======================================================

    const handleUserLeft = ({
      userId,
    }) => {
      console.log(
        "👋 User left:",
        userId
      );

      setUsers(
        (currentUsers) =>
          currentUsers.filter(
            (id) =>
              id !== userId
          )
      );

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject =
          null;
      }

      if (
        peerConnectionRef.current
      ) {
        peerConnectionRef.current.close();

        peerConnectionRef.current =
          null;
      }

      pendingCandidatesRef.current =
        [];

      makingOfferRef.current =
        false;

      console.log(
        "🔄 Peer connection reset"
      );
    };

    socket.on(
      "user-left",
      handleUserLeft
    );

    // =======================================================
    // CHAT
    // =======================================================

    const handleChatMessage = (
      data
    ) => {
      setMessages(
        (currentMessages) => [
          ...currentMessages,
          data,
        ]
      );
    };

    socket.on(
      "chat-message",
      handleChatMessage
    );

    // =======================================================
    // FILE
    // =======================================================

    const handleFileShare = (
      data
    ) => {
      console.log(
        "📁 File received:",
        data.file.name
      );

      setSharedFiles(
        (currentFiles) => [
          ...currentFiles,
          data,
        ]
      );
    };

    socket.on(
      "file-share",
      handleFileShare
    );

    // =======================================================
    // WHITEBOARD DRAW
    // =======================================================

    const handleWhiteboardDraw = (
      drawing
    ) => {
      drawLine(
        drawing.start,
        drawing.end,
        drawing.color,
        drawing.size
      );
    };

    socket.on(
      "whiteboard-draw",
      handleWhiteboardDraw
    );

    // =======================================================
    // WHITEBOARD CLEAR
    // =======================================================

    const handleWhiteboardClear =
      () => {
        const canvas =
          canvasRef.current;

        if (!canvas) {
          return;
        }

        const context =
          canvas.getContext("2d");

        context.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
      };

    socket.on(
      "whiteboard-clear",
      handleWhiteboardClear
    );

    // =======================================================
    // WHITEBOARD STATE
    // =======================================================

    const handleWhiteboardState = (
      drawings
    ) => {
      console.log(
        "🎨 Whiteboard state received:",
        drawings.length
      );

      drawings.forEach(
        (drawing) => {
          drawLine(
            drawing.start,
            drawing.end,
            drawing.color,
            drawing.size
          );
        }
      );
    };

    socket.on(
      "whiteboard-state",
      handleWhiteboardState
    );

    // =======================================================
    // SETUP CANVAS
    // =======================================================

    const canvasTimer =
      setTimeout(() => {
        setupCanvas();
      }, 300);

    window.addEventListener(
      "resize",
      setupCanvas
    );

    // =======================================================
    // CLEANUP
    // =======================================================

    return () => {
      mounted = false;

      clearTimeout(canvasTimer);

      socket.emit(
        "leave-room",
        roomId
      );

      socket.off(
        "room-users",
        handleRoomUsers
      );

      socket.off(
        "user-joined",
        handleUserJoined
      );

      socket.off(
        "offer",
        handleOffer
      );

      socket.off(
        "answer",
        handleAnswer
      );

      socket.off(
        "ice-candidate",
        handleIceCandidate
      );

      socket.off(
        "user-left",
        handleUserLeft
      );

      socket.off(
        "chat-message",
        handleChatMessage
      );

      socket.off(
        "file-share",
        handleFileShare
      );

      socket.off(
        "whiteboard-draw",
        handleWhiteboardDraw
      );

      socket.off(
        "whiteboard-clear",
        handleWhiteboardClear
      );

      socket.off(
        "whiteboard-state",
        handleWhiteboardState
      );

      window.removeEventListener(
        "resize",
        setupCanvas
      );

      // Stop local media
      if (
        localStreamRef.current
      ) {
        localStreamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        localStreamRef.current =
          null;
      }

      // Stop screen
      if (
        screenStreamRef.current
      ) {
        screenStreamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        screenStreamRef.current =
          null;
      }

      // Close peer
      if (
        peerConnectionRef.current
      ) {
        peerConnectionRef.current.close();

        peerConnectionRef.current =
          null;
      }

      pendingCandidatesRef.current =
        [];

      makingOfferRef.current =
        false;
    };
  }, [roomId]);

  // =========================================================
  // AUTO SCROLL CHAT
  // =========================================================

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const sendMessage = (e) => {
    e.preventDefault();

    const message =
      messageInput.trim();

    if (!message) {
      return;
    }

    socket.emit(
      "chat-message",
      {
        roomId,
        message,
      }
    );

    setMessageInput("");
  };

  // =========================================================
  // SELECT FILE
  // =========================================================

  const selectFile = () => {
    fileInputRef.current?.click();
  };

  // =========================================================
  // SEND FILE
  // =========================================================

  const handleFileChange = (
    e
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    console.log(
      "📁 Selected file:",
      file.name
    );

    const reader =
      new FileReader();

    reader.onload = () => {
      const fileData = {
        name: file.name,
        type:
          file.type ||
          "application/octet-stream",
        size: file.size,
        data: reader.result,
      };

      console.log(
        "📤 Sending file:",
        file.name
      );

      socket.emit(
        "file-share",
        {
          roomId,
          file: fileData,
        }
      );

      setSharedFiles(
        (currentFiles) => [
          ...currentFiles,
          {
            senderId: socket.id,
            file: fileData,
          },
        ]
      );
    };

    reader.onerror = () => {
      console.error(
        "❌ Could not read file"
      );
    };

    reader.readAsDataURL(file);

    e.target.value = "";
  };

  // =========================================================
  // DOWNLOAD FILE
  // =========================================================

  const downloadFile = (
    file
  ) => {
    try {
      const link =
        document.createElement("a");

      link.href = file.data;
      link.download = file.name;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      console.log(
        "⬇️ Download started:",
        file.name
      );
    } catch (error) {
      console.error(
        "❌ Download error:",
        error
      );
    }
  };

  // =========================================================
  // MICROPHONE
  // =========================================================

  const toggleMic = () => {
    if (
      !localStreamRef.current
    ) {
      return;
    }

    const audioTrack =
      localStreamRef.current.getAudioTracks()[0];

    if (audioTrack) {
      audioTrack.enabled =
        !audioTrack.enabled;

      setMicOn(
        audioTrack.enabled
      );
    }
  };

  // =========================================================
  // CAMERA
  // =========================================================

  const toggleCamera = () => {
    if (
      !localStreamRef.current
    ) {
      return;
    }

    const videoTrack =
      localStreamRef.current.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.enabled =
        !videoTrack.enabled;

      setCameraOn(
        videoTrack.enabled
      );
    }
  };
// =========================================================
// COPY MEETING LINK
// =========================================================

const copyMeetingLink = async () => {
  try {
    const meetingLink = window.location.href;

    await navigator.clipboard.writeText(meetingLink);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  } catch (error) {
    console.error("❌ Failed to copy meeting link:", error);
  }
};
  // =========================================================
  // LEAVE MEETING
  // =========================================================

  const leaveMeeting = () => {
    socket.emit(
      "leave-room",
      roomId
    );

    if (
      localStreamRef.current
    ) {
      localStreamRef.current
        .getTracks()
        .forEach((track) =>
          track.stop()
        );
    }

    if (
      screenStreamRef.current
    ) {
      screenStreamRef.current
        .getTracks()
        .forEach((track) =>
          track.stop()
        );
    }

    if (
      peerConnectionRef.current
    ) {
      peerConnectionRef.current.close();

      peerConnectionRef.current =
        null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject =
        null;
    }

    navigate("/dashboard");
  };

    // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-[#f4fafa] text-[#315966]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-50 bg-white border-b border-[#d4e8e9] shadow-sm">

        <div className="flex items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#164653]">
              ConnectHub
            </h1>

            <p className="text-sm text-[#6b8790]">
              Meeting Room:{" "}
              <span className="font-semibold text-[#176d7a]">
                {roomId}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">

  <button
    onClick={copyMeetingLink}
    className="
      bg-[#176d7a]
      hover:bg-[#125966]
      text-white
      px-5
      py-2.5
      rounded-xl
      font-semibold
      transition
      shadow-sm
    "
  >
    {copied ? "✓ Copied" : "📋 Copy Link"}
  </button>

  <button
    onClick={leaveMeeting}
    className="
      bg-[#d9535f]
      hover:bg-[#c84450]
      text-white
      px-5
      py-2.5
      rounded-xl
      font-semibold
      transition
      shadow-sm
    "
  >
    Leave Meeting
  </button>

</div>

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="p-4 md:p-6">

        <div className="grid lg:grid-cols-3 gap-6 max-w-[1500px] mx-auto">

          {/* =================================================
              LEFT / VIDEO + WHITEBOARD
          ================================================= */}

          <div className="lg:col-span-2">

            {/* =================================================
                VIDEO AREA
            ================================================= */}

            <div className="bg-white border border-[#d4e8e9] rounded-2xl p-4 shadow-sm">

              <div className="grid md:grid-cols-2 gap-4">

                {/* LOCAL VIDEO */}

                <div className="relative bg-[#164653] rounded-xl overflow-hidden aspect-video shadow-sm">

                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute bottom-3 left-3 bg-[#164653]/85 text-white px-3 py-1.5 rounded-lg text-sm backdrop-blur-sm">

                    {screenSharing
                      ? "🖥️ Your Screen"
                      : "You"}

                  </div>

                </div>

                {/* REMOTE VIDEO */}

                <div className="relative bg-[#e7f1f6] rounded-xl overflow-hidden aspect-video shadow-sm">

                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute bottom-3 left-3 bg-[#176d7a]/90 text-white px-3 py-1.5 rounded-lg text-sm backdrop-blur-sm">

                    Remote User

                  </div>

                </div>

              </div>

            </div>

            {/* =================================================
                CONTROLS
            ================================================= */}

            <div className="bg-white border border-[#d4e8e9] rounded-2xl p-4 mt-4 shadow-sm">

              <div className="flex justify-center gap-3 flex-wrap">

                {/* MIC */}

                <button
                  onClick={toggleMic}
                  className={`
                    px-5 py-3
                    rounded-xl
                    font-semibold
                    transition
                    border
                    ${
                      micOn
                        ? "bg-[#ddf5f4] text-[#176d7a] border-[#b7d5d8] hover:bg-[#c9eeee]"
                        : "bg-[#fff0f1] text-[#d9535f] border-[#f2c4c8] hover:bg-[#ffe5e7]"
                    }
                  `}
                >

                  {micOn
                    ? "🎤 Mic On"
                    : "🔇 Mic Off"}

                </button>

                {/* CAMERA */}

                <button
                  onClick={toggleCamera}
                  className={`
                    px-5 py-3
                    rounded-xl
                    font-semibold
                    transition
                    border
                    ${
                      cameraOn
                        ? "bg-[#e7f1f6] text-[#4383a8] border-[#c5dce6] hover:bg-[#dcecf3]"
                        : "bg-[#fff0f1] text-[#d9535f] border-[#f2c4c8] hover:bg-[#ffe5e7]"
                    }
                  `}
                >

                  {cameraOn
                    ? "📹 Camera On"
                    : "📷 Camera Off"}

                </button>

                {/* SCREEN SHARE */}

                {!screenSharing ? (

                  <button
                    onClick={startScreenSharing}
                    className="
                      bg-[#176d7a]
                      hover:bg-[#125966]
                      text-white
                      px-5
                      py-3
                      rounded-xl
                      font-semibold
                      transition
                      shadow-sm
                    "
                  >
                    🖥️ Share Screen
                  </button>

                ) : (

                  <button
                    onClick={stopScreenSharing}
                    className="
                      bg-[#e6a23c]
                      hover:bg-[#d18f2e]
                      text-white
                      px-5
                      py-3
                      rounded-xl
                      font-semibold
                      transition
                    "
                  >
                    🛑 Stop Sharing
                  </button>

                )}

              </div>

            </div>

            {/* =================================================
                PARTICIPANTS
            ================================================= */}

            <div className="bg-white border border-[#d4e8e9] rounded-2xl p-5 mt-4 shadow-sm">

              <div className="flex items-center justify-between mb-4">

                <div>

                  <h2 className="text-lg font-bold text-[#164653]">
                    Participants
                  </h2>

                  <p className="text-sm text-[#6b8790]">
                    People currently in this meeting
                  </p>

                </div>

                <div className="bg-[#ddf5f4] text-[#176d7a] px-3 py-1 rounded-full text-sm font-semibold">
                  {users.length}{" "}
                  {users.length === 1
                    ? "User"
                    : "Users"}
                </div>

              </div>

              <div className="flex gap-3 flex-wrap">

                {users.map(
                  (userId) => (

                    <div
                      key={userId}
                      className="
                        bg-[#f4fafa]
                        border
                        border-[#d4e8e9]
                        px-4
                        py-2.5
                        rounded-xl
                        text-[#315966]
                        font-medium
                      "
                    >

                      <span className="mr-2">
                        👤
                      </span>

                      {userId.slice(0, 8)}

                    </div>

                  )
                )}

              </div>

            </div>

            {/* =================================================
                WHITEBOARD
            ================================================= */}

            <div className="mt-4 bg-white rounded-2xl overflow-hidden border border-[#d4e8e9] shadow-sm">

              {/* WHITEBOARD HEADER */}

              <div className="bg-[#164653] px-5 py-4">

                <div className="flex flex-wrap items-center justify-between gap-4">

                  <div>

                    <h2 className="text-lg font-bold text-white">
                      🎨 Real-Time Whiteboard
                    </h2>

                    <p className="text-xs text-[#b7d5d8]">
                      Draw together with other participants
                    </p>

                  </div>

                  <div className="flex items-center gap-3 flex-wrap">

                    {/* COLOR */}

                    <div className="flex items-center gap-2">

                      <label
                        htmlFor="brushColor"
                        className="text-sm text-white"
                      >
                        Color
                      </label>

                      <input
                        id="brushColor"
                        type="color"
                        value={brushColor}
                        onChange={(e) =>
                          setBrushColor(
                            e.target.value
                          )
                        }
                        className="
                          w-9
                          h-9
                          cursor-pointer
                          rounded-lg
                          border-2
                          border-white
                        "
                      />

                    </div>

                    {/* BRUSH SIZE */}

                    <div className="flex items-center gap-2">

                      <label
                        htmlFor="brushSize"
                        className="text-sm text-white"
                      >
                        Size
                      </label>

                      <select
                        id="brushSize"
                        value={brushSize}
                        onChange={(e) =>
                          setBrushSize(
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="
                          bg-white
                          text-[#315966]
                          border
                          border-[#b7d5d8]
                          rounded-lg
                          px-3
                          py-2
                          outline-none
                        "
                      >

                        <option value="2">
                          2
                        </option>

                        <option value="3">
                          3
                        </option>

                        <option value="5">
                          5
                        </option>

                        <option value="8">
                          8
                        </option>

                        <option value="12">
                          12
                        </option>

                      </select>

                    </div>

                    {/* CLEAR */}

                    <button
                      onClick={clearWhiteboard}
                      className="
                        bg-[#d9535f]
                        hover:bg-[#c84450]
                        text-white
                        px-4
                        py-2
                        rounded-lg
                        font-medium
                        transition
                      "
                    >
                      🧹 Clear
                    </button>

                  </div>

                </div>

              </div>

              {/* CANVAS */}

              <div className="w-full bg-white">

                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  className="
                    block
                    w-full
                    h-[400px]
                    cursor-crosshair
                    touch-none
                  "
                />

              </div>

            </div>

          </div>

          {/* =================================================
              RIGHT SIDEBAR
          ================================================= */}

          <div className="flex flex-col gap-4">

            {/* =================================================
                CHAT
            ================================================= */}

            <div className="bg-white border border-[#d4e8e9] rounded-2xl flex flex-col h-[500px] shadow-sm">

              {/* CHAT HEADER */}

              <div className="px-5 py-4 border-b border-[#d4e8e9]">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-xl bg-[#ddf5f4] flex items-center justify-center text-xl">
                    💬
                  </div>

                  <div>

                    <h2 className="text-lg font-bold text-[#164653]">
                      Meeting Chat
                    </h2>

                    <p className="text-xs text-[#6b8790]">
                      Messages are visible to everyone
                    </p>

                  </div>

                </div>

              </div>

              {/* MESSAGES */}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {messages.length === 0 ? (

                  <div className="text-center text-[#9ab0b5] mt-10">

                    <div className="text-3xl mb-2">
                      💬
                    </div>

                    No messages yet.
                    <br />

                    Start the conversation!

                  </div>

                ) : (

                  messages.map(
                    (msg, index) => {

                      const isMe =
                        msg.senderId ===
                        socket.id;

                      return (

                        <div
                          key={`${msg.timestamp}-${index}`}
                          className={`flex ${
                            isMe
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >

                          <div
                            className={`
                              max-w-[80%]
                              px-4
                              py-2.5
                              rounded-2xl
                              ${
                                isMe
                                  ? "bg-[#176d7a] text-white rounded-br-none"
                                  : "bg-[#e7f1f6] text-[#315966] rounded-bl-none"
                              }
                            `}
                          >

                            <p className="text-xs opacity-70 mb-1">

                              {isMe
                                ? "You"
                                : "Remote User"}

                            </p>

                            <p className="break-words">
                              {msg.message}
                            </p>

                          </div>

                        </div>

                      );
                    }
                  )

                )}

                <div
                  ref={chatMessagesEndRef}
                />

              </div>

              {/* MESSAGE INPUT */}

              <form
                onSubmit={sendMessage}
                className="p-4 border-t border-[#d4e8e9] flex gap-2"
              >

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) =>
                    setMessageInput(
                      e.target.value
                    )
                  }
                  placeholder="Type a message..."
                  className="
                    flex-1
                    bg-[#f4fafa]
                    border
                    border-[#d4e8e9]
                    text-[#315966]
                    rounded-xl
                    px-4
                    py-3
                    outline-none
                    focus:border-[#45c4c4]
                    focus:ring-2
                    focus:ring-[#45c4c4]/20
                  "
                />

                <button
                  type="submit"
                  className="
                    bg-[#176d7a]
                    hover:bg-[#125966]
                    text-white
                    px-5
                    py-3
                    rounded-xl
                    font-semibold
                    transition
                  "
                >
                  Send
                </button>

              </form>

            </div>

            {/* =================================================
                FILE SHARING
            ================================================= */}

            <div className="bg-white border border-[#d4e8e9] rounded-2xl p-5 shadow-sm">

              <div className="flex items-center justify-between mb-4">

                <div>

                  <h2 className="text-lg font-bold text-[#164653]">
                    📁 File Sharing
                  </h2>

                  <p className="text-xs text-[#6b8790]">
                    Share files with participants
                  </p>

                </div>

                <button
                  onClick={selectFile}
                  className="
                    bg-[#269b7a]
                    hover:bg-[#208866]
                    text-white
                    px-4
                    py-2
                    rounded-lg
                    font-semibold
                    transition
                  "
                >
                  + File
                </button>

              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="space-y-3">

                {sharedFiles.length === 0 ? (

                  <div className="text-center text-[#9ab0b5] py-6">

                    <div className="text-3xl mb-2">
                      📁
                    </div>

                    No files shared yet.

                  </div>

                ) : (

                  sharedFiles.map(
                    (item, index) => {

                      const isMe =
                        item.senderId ===
                        socket.id;

                      return (

                        <div
                          key={`${item.file.name}-${index}`}
                          className="
                            bg-[#f4fafa]
                            border
                            border-[#d4e8e9]
                            rounded-xl
                            p-3
                          "
                        >

                          <div className="flex items-center justify-between gap-3">

                            <div className="min-w-0">

                              <p className="font-medium text-[#315966] truncate">

                                📄{" "}
                                {item.file.name}

                              </p>

                              <p className="text-xs text-[#6b8790]">

                                {isMe
                                  ? "You"
                                  : "Remote User"}

                                {" • "}

                                {(
                                  item.file.size /
                                  1024
                                ).toFixed(1)}{" "}
                                KB

                              </p>

                            </div>

                            <button
                              onClick={() =>
                                downloadFile(
                                  item.file
                                )
                              }
                              className="
                                bg-[#4383a8]
                                hover:bg-[#356f91]
                                text-white
                                px-3
                                py-2
                                rounded-lg
                                text-sm
                                transition
                              "
                            >
                              ⬇️
                            </button>

                          </div>

                        </div>

                      );

                    }
                  )

                )}

              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Room;