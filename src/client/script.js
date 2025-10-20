const joinRoomButton = document.getElementById("room-button");
const messageInput = document.getElementById("message-input");
const roomInput = document.getElementById("room-input");
const form = document.getElementById("form");
const joinRedButton = document.getElementById("join-red-button");
const joinBlueButton = document.getElementById("join-blue-button");
const leaveRoomButton = document.getElementById('leave-room');

//CONNECTION TO MULTIPLE NAMESPACES
const socket = io("http://localhost:4000");
//---

// on connection of a socket
socket.on("connect", () => {
  displayMessage(`You've connected with id: ${socket.id}`);
});

//receive message
socket.on("receive-message", (message) => {
  displayMessage(message);
});

//join red team
joinRedButton.addEventListener("click", () => {
  const room = roomInput.value;
  socket.emit("join-team", { room, team: "red" }, (response) => {
    displayMessage(response);
  });
});

//join blue team
joinBlueButton.addEventListener("click", () => {
  const room = roomInput.value;
  socket.emit("join-team", { room, team: "blue" }, (response) => {
    displayMessage(response);
  });
});

//send message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value;
  const room = roomInput.value;

  if (message === "") return;

  displayMessage(message);
  socket.emit("send-message", message, room);

  messageInput.value = "";
});

//join room
joinRoomButton.addEventListener("click", (e) => {
  const room = roomInput.value;
  console.log('trying to join', room)
  socket.emit("join-room", room, (message) => {
    displayMessage(message);
    document.getElementById('room-name').textContent= room;
  });
});

//leave room
leaveRoomButton.addEventListener('click', () => {
  const room = roomInput.value;
  if (!room) return;
  socket.emit('leave-room', room, ()=>{
    //clean interface
    document.getElementById('room-name').textContent = 'None';
    document.getElementById('message-container').innerHTML='';
    document.getElementById('red-team-list').innerHTML='';
    document.getElementById('blue-team-list').innerHTML='';
    displayMessage(`You have left room ${room}`);
  });
});

//host assignation
socket.on('host-assigned', ({room})=>{
  displayMessage(`You are now the host of room ${room}`);
})


//update teams' information
socket.on("team-state", ({ red, blue }) => {
  updateTeamList("red", red);
  updateTeamList("blue", blue);
});

//info display method
function displayMessage(message) {
  const div = document.createElement("div");
  div.textContent = message;
  document.getElementById("message-container").append(div);
}

function updateTeamList(team, players) {
  const container = document.getElementById(`${team}-team-list`);
  container.innerHTML = ""; // limpiar
  players.forEach((id) => {
    const div = document.createElement("div");
    div.textContent = id;
    container.appendChild(div);
  });
}


