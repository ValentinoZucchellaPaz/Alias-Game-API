const joinRoomButton = document.getElementById("room-button");
const messageInput = document.getElementById("message-input");
const roomInput = document.getElementById("room-input");
const form = document.getElementById("form");
const joinRedButton = document.getElementById("join-red-button");
const joinBlueButton = document.getElementById("join-blue-button");

//CONNECTION TO MULTIPLE NAMESPACES
const socket = io("http://localhost:4000");
//---


socket.on("connect", () => {
  displayMessage(`You've connected with id: ${socket.id}`);
});

socket.on("receive-message", (message) => {
  displayMessage(message);
});

joinRedButton.addEventListener("click", () => {
  const room = roomInput.value;
  socket.emit("join-team", { room, team: "red" }, (response) => {
    displayMessage(response);
  });
});

joinBlueButton.addEventListener("click", () => {
  const room = roomInput.value;
  socket.emit("join-team", { room, team: "blue" }, (response) => {
    displayMessage(response);
  });
});

//actions taken when submitting form (message sending)
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value;
  const room = roomInput.value;

  if (message === "") return;

  displayMessage(message);
  socket.emit("send-message", message, room);

  messageInput.value = "";
});

//actions taken when clicking on 'join'
joinRoomButton.addEventListener("click", (e) => {
  const room = roomInput.value;
  socket.emit("join-room", room, (message) => {
    displayMessage(message);
  });
});

//info display method
function displayMessage(message) {
  const div = document.createElement("div");
  div.textContent = message;
  document.getElementById("message-container").append(div);
}
