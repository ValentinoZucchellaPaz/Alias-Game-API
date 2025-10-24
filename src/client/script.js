const form = document.getElementById("form");
const messageInput = document.getElementById("message-input");
const roomInput = document.getElementById("room-input");
const joinRoomButton = document.getElementById("room-button");
const joinRedButton = document.getElementById("join-red-button");
const joinBlueButton = document.getElementById("join-blue-button");
const leaveRoomButton = document.getElementById("leave-room");

let socket = null;
let currentRoom = null;

//join red team event triggering
// joinRedButton.addEventListener("click", () => {
//   if (!currentRoom) return;
//   socket.emit("join-team", { room: currentRoom, team: "red" }, (response) => {
//     displayMessage(response);
//   });
// });

//join blue team event triggering
// joinBlueButton.addEventListener("click", () => {
//   if (!currentRoom) return;
//   socket.emit("join-team", { room: currentRoom, team: "blue" }, (response) => {
//     displayMessage(response);
//   });
// });

// login button (hardcoded)
let authToken = null;
let payload = null;
const loginButton1 = document.getElementById("login-button-1");
const loginButton2 = document.getElementById("login-button-2");

loginButton1.addEventListener("click", (e) => {
  handleLogin(e, 1);
});
loginButton2.addEventListener("click", (e) => {
  handleLogin(e, 2);
});

const handleLogin = (e, userNumber) => {
  e.preventDefault();
  displayMessage("Performing hardcoded login...");

  (async () => {
    displayMessage("Performing login...");

    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `user${userNumber}@email.com`,
          password: "123456",
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        displayMessage(`Login failed: ${res.status} ${errText}`);
        return;
      }

      const data = await res.json();
      authToken = data.accessToken || null;

      if (!authToken) {
        displayMessage("Login succeeded but no token returned by server");
        return;
      }

      // hide login button and show username in the UI
      if (loginButton1) loginButton1.style.display = "none";
      if (loginButton2) loginButton2.style.display = "none";

      try {
        payload = getUserPayloadFromToken(authToken);
        const name = payload.name || "Unknown";
        const userDisplay = document.getElementById("user-display");
        userDisplay.style.display = "inline";
        if (userDisplay) userDisplay.textContent = name;
        displayMessage("successfull login");
      } catch (err) {
        console.warn("Failed to decode token for user display", err);
      }
    } catch (err) {
      console.log(err);
      displayMessage(`Login error: ${err.message}`);
    }
  })();
};

//join room button handling -- CONNECT TO SOCKET
joinRoomButton.addEventListener("click", async (e) => {
  e.preventDefault();
  const room = roomInput.value?.trim();
  if (!room) return;

  if (!authToken) {
    displayMessage("login needed");
    return;
  }

  if (currentRoom === room) {
    displayMessage(`You already are in room ${room}`);
    return;
  }

  try {
    const res = await fetch(`http://localhost:4000/api/rooms/${encodeURIComponent(room)}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      // body: JSON.stringify({ userId: payload?.id }),
    });

    if (!res.ok) {
      const text = await res.text();
      displayMessage(`Join room failed: ${res.status} ${text}`);
      return;
    }

    // connect to socket server (replace URL if needed)
    if (socket && socket.connected) socket.disconnect();
    socket = io("http://localhost:4000", { auth: { token: authToken } });

    socket.on("connect", () => {
      displayMessage(`You've connected with id: ${socket.id}`);
      socket.emit("join-room", { code: room, userId: payload?.id });
      currentRoom = room;
    });

    socket.on("connect_error", (err) => {
      displayMessage(`Socket connection error: ${err?.message || err}`);
    });
    // TODOS LOS EVENTOS DEL SOCKET

    socket.on("chat:message", ({ user, text, timestamp }) => {
      console.log("me llego un msje");
      displayMessage(`${user.name} (${timestamp}): ${text}`);
    });

    // on connection feedback
    // socket.on("connect", () => {
    //   displayMessage(`You've connected with id: ${socket.id}`);
    // });

    //player joining feedback
    socket.on("player:joined", ({ user, players, code }) => {
      displayMessage(`Player ${user.name} joined the room ${code}`);
    });

    socket.on("player:reconnected", ({ userId }) => {
      displayMessage(`Player ${userId} reconnected to the room`);
      document.getElementById("room-name").textContent = code;
    });

    //receive message feedback
    socket.on("chat:message", ({ user, text, timestamp }) => {
      console.log("me llego un msje");
      displayMessage(`${user.name} (${timestamp}): ${text}`);
    });

    //leave room feedback
    socket.on("player:left", ({ userId }) => {
      displayMessage(`Player ${userId} left the room`);
    });

    //host assignation
    socket.on("room:create", ({ code, hostId, players, teams }) => {
      displayMessage(`You are now the host of room ${code}`);
      updateTeamList("red", teams.red);
      updateTeamList("blue", teams.blue);
      document.getElementById("start-game-button").style.display = "inline-block";
    });
  } catch (err) {
    displayMessage(`Error joining room: ${err?.message || err}`);
  }
});

//send message button handling
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value;
  const room = roomInput.value;

  if (message === "") return;

  if (!currentRoom) return;
  // socket.emit("send-message", { message, room, sender: socket.id });
  socket.emit("chat:message", {
    code: room,
    user: payload, // recuperar de session
    text: message,
  });
  displayMessage(`You: ${message}`);

  messageInput.value = "";
});

//leave room button handling
leaveRoomButton.addEventListener("click", () => {
  const code = roomInput.value;
  if (!code) return;
  socket.emit("leave-room", { code, userId: payload?.id });
});

// ==========================================
// sockets

// //update teams' information
// socket.on("team-state", ({ red, blue, unassigned }) => {
//   updateTeamList("red", red);
//   updateTeamList("blue", blue);
//   updateTeamList("no-team", unassigned);

//   const startButton = document.getElementById("start-game-button");
//   const isHost = startButton.style.display !== "none";
//   const canStart = red.length >= 2 && blue.length >= 2;

//   if (isHost) {
//     startButton.disabled = !canStart;
//   }
// });

// socket.on("game-started", () => {
//   displayMessage("Game has started!");
// });

// socket.on("room-closed", () => {
//   displayMessage(`Room was closed by the host.`);
//   resetRoomUI();
// });

//info display method
function displayMessage(message) {
  const div = document.createElement("div");
  div.textContent = message;
  document.getElementById("message-container").append(div);
}

//update the interface with the list of players in teams (or without team)
function updateTeamList(team, players) {
  const container =
    team === "no-team"
      ? document.querySelector(".no-team-list")
      : document.getElementById(`${team}-team-list`);

  if (!container || !Array.isArray(players)) {
    console.warn(`Invalid team list for '${team}'`);
    return;
  }

  //fill container with players
  container.innerHTML = "";
  players.forEach((id) => {
    const div = document.createElement("div");
    div.textContent = id;
    container.appendChild(div);
  });
}

//get the fields empty
function resetRoomUI() {
  document.getElementById("room-name").textContent = "None";
  document.getElementById("message-container").innerHTML = "";
  document.getElementById("red-team-list").innerHTML = "";
  document.getElementById("blue-team-list").innerHTML = "";
  document.querySelector(".no-team-list").innerHTML = "";
  document.getElementById("start-game-button").style.display = "none";
}

// document.getElementById("start-game-button").addEventListener("click", () => {
//   if (!currentRoom) return;
//   socket.emit("start-game", { room: currentRoom });
// });

function getUserPayloadFromToken(token) {
  const payload = token.split(".")[1];
  const decoded = atob(payload);
  return JSON.parse(decoded);
}
