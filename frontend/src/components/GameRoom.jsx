import React, { useEffect, useState } from "react";
import "./css/styles.css";
import { useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import TeamSelectModal from "./TeamSelectModal";

export default function GameRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();

  console.log("Socket in GameRoom component:", socket);

  const [roomReady, setRoomReady] = React.useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  const [teams, setTeams] = useState({
    red: ["Ramon", "Mateo", "Lucio"],
    blue: ["Juana", "Martina", "Lucia", "Polina"],
  });
  const [myTeam, setMyTeam] = useState(null);
  console.log("My team at top level:", myTeam);
  const [isHost, setIsHost] = useState(false);
  const [canStart, setCanStart] = useState(false);

  console.log("GameRoom mounted with roomId:", roomId);
  // --- SOCKET SETUP ---
  useEffect(() => {
    socket.on("connect", () => {
      addMessage(`You've connected with id: ${socket.id}`);
    });

    socket.on("receive-message", ({ message, sender }) => {
      addMessage(`${sender}: ${message}`);
    });

    socket.on("player-left", ({ player }) => {
      addMessage(`Player ${player} left the game.`);
    });

    socket.on("player-left", ({ player }) => {
      addMessage(`Player ${player} left the game.`);
    });

    // socket.on("host-assigned", ({ room }) => {
    //   addMessage(`You are now the host of room ${room}`);
    //   setIsHost(true);
    // });

    // socket.on("team-state", ({ red, blue }) => {
    //   console.log("Received team state:", { red, blue });
    //   setTeams({ red, blue });
    //   const canStartNow = red.length >= 2 && blue.length >= 2;
    //   setCanStart(canStartNow);
    // });

    socket.on("team-joined", ({ team, player }) => {
      console.log(`Player ${player} joined team ${team}`);
      setMyTeam(team);
      setTeams((prev) => {
        const updatedTeam = { ...prev };
        updatedTeam[team].push(player);
        return updatedTeam;
      });
    });

    socket.on("game-started", () => addMessage("Game has started!"));

    socket.on("room-closed", () => {
      addMessage(`Room was closed by the host.`);
      resetRoom();
    });

    socket.emit("join-room", roomId);

    socket.on("room-joined", (data) => {
      console.log(`Joined room: ${data.id}`);
      setRoomReady(true);
      addMessage(`You've joined room: ${data.id}`);
    });

    return () => {
      console.log("Cleaning up socket listeners and leaving room:", roomId);
      socket.emit("leave-room", roomId);
      socket.off();
    };
  }, [roomId]);

  console.log("Current teams state:", teams);
  // --- HELPERS ---
  const addMessage = (msg) => setMessages((prev) => [...prev, msg]);

  const resetRoom = () => {
    setCurrentRoom(null);
    setMessages([]);
    // setTeams({ red: [], blue: [] });
    setIsHost(false);
    setCanStart(false);
  };

  const leaveRoom = () => {
    if (!roomId) return;
    socket.emit("leave-room", roomId);
    navigate("/");
  };

  const sendMessage = (e) => {
    e.preventDefault();

    if (!messageInput.trim()) return;
    socket.emit("send-message", {
      message: messageInput,
      room: roomId,
      sender: socket.id,
    });

    addMessage(`You: ${messageInput}`);
    setMessageInput("");
  };

  const startGame = () => {
    if (!currentRoom) return;
    socket.emit("start-game", { room: currentRoom });
  };

  console.log("Rendering GameRoom with teams:", teams);

  if (!roomReady) {
    return <div>Joining room {roomId}...</div>;
  }

  console.log("My team:", myTeam);
  if (!myTeam) {
    console.log("My team inside:", myTeam);

    return <TeamSelectModal roomName={roomId} teams={teams} />;
  }
  // --- RENDER ---
  return (
    <div className="game-room-container">
      <header>
        <p>
          Room: <span>{roomId}</span>
        </p>
      </header>

      <div className="container">
        <div id="team-status">
          <TeamMembers teamName="Red" members={teams.red} color="red" />
          <TeamMembers teamName="Blue" members={teams.blue} color="blue" />
        </div>

        {/* MESSAGES */}
        <div className="chat-container">
          <div id="message-container">
            {messages.map((msg, index) => (
              <Message key={index} msg={msg} />
            ))}
          </div>

          <form className="chat-bar" onSubmit={sendMessage}>
            <div className="form-field-container">
              <input
                id="message-input"
                value={messageInput}
                onChange={(e) => {
                  console.log("Message input changed:", e.target.value);
                  setMessageInput(e.target.value);
                }}
              />
              <button id="send-button" type="submit">
                Send
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="inputs-container">
        <button onClick={leaveRoom}>Leave room</button>
        <button onClick={() => socket.emit("show-room", roomId)}>
          Show room
        </button>

        {isHost && (
          <button onClick={startGame} disabled={!canStart}>
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}

function TeamMembers({ teamName, members, color }) {
  console.log(`Rendering ${teamName} team with members:`, members);

  return (
    <div className="team-members">
      <h4
        style={{
          backgroundColor: color === "red" ? "lightcoral" : "lightblue",
          margin: 0,
          height: "40px",
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {teamName} Team
      </h4>
      {members.map((p) => (
        <div className={`team-item ${color}-item`} key={p}>
          {p}
        </div>
      ))}
    </div>
  );
}

function Message({ msg }) {
  return <div id="message">{msg}</div>;
}
