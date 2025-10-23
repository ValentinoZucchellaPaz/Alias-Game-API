// src/sockets/registerRoomSocket.js
export default function registerRoomSocket(io, roomManager) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", async ({ code, userId }) => {
      socket.join(code);
      await roomManager.joinRoom({ roomId: code, userId, socketId: socket.id });
    });

    socket.on("leave-room", async ({ code, userId }) => {
      await roomManager.leaveRoom({ roomId: code, userId });
      socket.leave(code);
    });

    socket.on("chat:message", ({ code, user, text }) => {
      roomManager.sendMessage({ roomCode: code, user, text, socket });
    });

    socket.on("disconnect", async () => {
      // opcional: limpiar user de rooms
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
