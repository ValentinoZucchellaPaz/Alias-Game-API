const form = document.getElementById("form");
const messageInput = document.getElementById("message-input");
const roomInput = document.getElementById("room-input");
const joinRoomButton = document.getElementById("room-button");
const joinRedButton = document.getElementById("join-red-button");
const joinBlueButton = document.getElementById("join-blue-button");
const leaveRoomButton = document.getElementById("leave-room");

//CONNECTION TO MULTIPLE NAMESPACES
const socket = io("http://localhost:4000");
//---

let currentRoom = null;

// on connection of a socket
socket.on("connect", () => {
  displayMessage(`You've connected with id: ${socket.id}`);
});

//receive message
socket.on("receive-message", ({message,sender}) => {
  displayMessage(`${sender}: ${message}`);
});

//join red team event triggering
joinRedButton.addEventListener("click", () => {
  if (!currentRoom) return;
  socket.emit("join-team", { room: currentRoom, team: "red" }, (response) => {
    displayMessage(response);
  });
});

//join blue team event triggering
joinBlueButton.addEventListener("click", () => {
  if (!currentRoom) return;
  socket.emit("join-team", { room: currentRoom, team: "blue" }, (response) => {
    displayMessage(response);
  });
});

//send message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value;
  const room = roomInput.value;

  if (message === "") return;

  if (!currentRoom ) return;
  socket.emit("send-message", {message, room, sender:socket.id});
  displayMessage(`You: ${message}`);

  messageInput.value = "";
});

//join room
joinRoomButton.addEventListener("click", (e) => {
  const room = roomInput.value;
  // if !room || room.trim === "" return
  socket.emit("join-room", room, (message) => {
    displayMessage(message);
    document.getElementById("room-name").textContent = room; //display room name
    currentRoom = room;
  });
});

//leave room
leaveRoomButton.addEventListener("click", () => {
  const room = roomInput.value;
  if (!room) return;
  socket.emit("leave-room", room, () => {
    //clean interface
    resetRoomUI();
    displayMessage(`You have left room ${room}`);
    currentRoom = null;
  });
});

//host assignation
socket.on("host-assigned", ({ room }) => {
  displayMessage(`You are now the host of room ${room}`);
  document.getElementById("start-game-button").style.display = 'inline-block';
});

//update teams' information
socket.on("team-state", ({ red, blue, unassigned }) => {
  updateTeamList("red", red);
  updateTeamList("blue", blue);
  updateTeamList("no-team", unassigned);
});

socket.on('game-started', () => {
  displayMessage('Game has started!');
});

//info display method
function displayMessage(message) {
  const div = document.createElement("div");
  div.textContent = message;
  document.getElementById("message-container").append(div);
}

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

function resetRoomUI(){
  document.getElementById('room-name').textContent = "None";
  document.getElementById('message-container').innerHTML="";
  document.getElementById('red-team-list').innerHTML = "";
  document.getElementById('blue-team-list').innerHTML="";
  document.querySelector('.no-team-list').innerHTML='';
  document.getElementById('start-game-button').style.display='none';
}


document.getElementById('start-game-button').addEventListener('click', () => {
  if (!currentRoom) return;
  socket.emit('start-game', {room:currentRoom});
})