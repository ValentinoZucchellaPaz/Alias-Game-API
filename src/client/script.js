const form = document.getElementById("form");
const messageInput = document.getElementById("message-input");
const roomInput = document.getElementById("room-input");
const joinRoomButton = document.getElementById("room-button");
const joinRedButton = document.getElementById("join-red-button");
const joinBlueButton = document.getElementById("join-blue-button");
const leaveRoomButton = document.getElementById("leave-room");

//CONNECTION TO MULTIPLE NAMESPACES
const socket = io("http://localhost:4000", {
  auth: {
    // al pedo esto por ahora
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjRmYmI3MzRmLTFjMjQtNDQzYi05OTk4LTE1MDllZGVkNzMyMSIsIm5hbWUiOiJtb25kb25nbzAwIiwicm9sZSI6InBsYXllciIsImlhdCI6MTc2MTA3OTg2NSwiZXhwIjoxNzYxMDgwNzY1fQ.1qqCFf_pVZj0j5alZ_6lpHDVEx0FVZ9BpIdensvom7c",
  },
});

let currentRoom = null;

// on connection feedback
socket.on("connect", () => {
  displayMessage(`You've connected with id: ${socket.id}`);
});

//player joining feedback
socket.on("player:joined", ({code,userId}) => {
  displayMessage(`Player ${userId} joined the room ${code}`)
})

//receive message feedback
socket.on("chat:message", ({ user, text, timestamp }) => {
  displayMessage(`${user.name} (${timestamp}): ${text}`);
});

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
    user: { id: 1, name: "mondongo" },
    text: message,
  });
  displayMessage(`You: ${message}`);

  messageInput.value = "";
});

//join room button handling
joinRoomButton.addEventListener("click", (e) => {
  const room = roomInput.value;
  if (!room || room.trim() === "") return;
  socket.emit("join-room", { code: room, userId: 2 });
  //    (message) => {
  //   displayMessage(message);
  //   document.getElementById("room-name").textContent = room; //display room name
  currentRoom = room;
  // });
});

//leave room button handling
leaveRoomButton.addEventListener("click", () => {
  const code = roomInput.value;
  if (!code) return;
  socket.emit("leave-room", {code,userId});
});

//leave room feedback
socket.on("player:left", ({userId})=> {
  displayMessage(`Player ${userId} left the room`);
});

// //host assignation
// socket.on("host-assigned", ({ room }) => {
//   displayMessage(`You are now the host of room ${room}`);
//   document.getElementById("start-game-button").style.display = "inline-block";
// });

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
