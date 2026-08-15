import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import socket from "./services/socket";
import Room from "./pages/Room";

function App() {
  useEffect(() => {
  socket.on("connect", () => {
    console.log("Connected to Socket.io:", socket.id);
  });

  return () => {
    socket.off("connect");
  };
}, []);
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
  path="/room/:roomId"
  element={
    <ProtectedRoute>
      <Room />
    </ProtectedRoute>
  }
/>

      </Routes>
    </BrowserRouter>
  );
}

export default App;