const joinRoomButton = document.getElementById("room-button");
const messageInput = document.getElementById("message-input");
const roomInput = document.getElementById("room-input");
const form = document.getElementById("form");

const socket = io("http://localhost:4000");

// const adminSocket = io("http://localhost:4000/admin"); //will throw error
const adminSocket = io("http://localhost:4000/admin", { auth: { token: "test" } }); //will not throw

socket.on("connect", () => {
  displayMessage(`You've connected with id: ${socket.id}`);
});

socket.on("receive-message", (message) => {
  displayMessage(message);
});
adminSocket.on("connect_error", (error) => {
  displayMessage(error);
});
//actions taken when submitting form
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
