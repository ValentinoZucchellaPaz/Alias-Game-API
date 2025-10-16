const joinRoomButton = document.getElementById("room-button");
const messageInput = document.getElementById("message-input");
const roomInput = document.getElementById("room-input");
const form = document.getElementById("form");

const socket = io('http://localhost:4000');
socket.on('connect', ()=>{
    displayMessage(`You've connected with id: ${socket.id}`);
});

//----new
socket.on('receive-message', (message)=>{
    displayMessage(message);
});
//----

form.addEventListener("submit",(e) => {
    e.preventDefault();
    const message = messageInput.value;
    const room = roomInput.value;

    if (message === "") return;

    displayMessage(message);
    socket.emit('send-message', message);//new

    messageInput.value="";
});

joinRoomButton.addEventListener("click" ,(e)=> {
    const room =  roomInput.value;
});

function displayMessage (message){
    const div = document.createElement('div');
    div.textContent = message;
    document.getElementById("message-container").append(div);
    
}