//src/sockets/default.js

export default function setupDefaultNamespace(io) {
  io.on("connection", (socket) => {
    socket.on("send-message", (message, room) => {
      if (room === "") {
        socket.broadcast.emit("receive-message", message); //message to all users in the namespace
      } else {
        socket.to(room).emit("receive-message", message); //message to users in the specified room
      }
    });
    socket.on("join-room", (room, cb) => {
      socket.join(room);
      cb(`You've joined to room '${room}'`);
    });
  });
}
