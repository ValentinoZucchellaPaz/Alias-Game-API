import { Room, User } from "../models/sequelize/index.js";

// src/sockets/registerRoomSocket.js
export default function registerRoomSocket(io, roomManager) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", async ({ code, userId }) => {
      console.log(`📥 Evento join-room recibido: userId=${userId}, code=${code}`);
      // traer info de room, validar que usuario está (se hizo http antes)
      // hacer funcion que devuelva info de room parceada
      const room = await roomManager.getRoom(code);
      console.log("🚸:", room);
      if (!room || !room.players.includes(userId)) {
        io.emit("room:error", { message: "falta http request antes" });
        return;
      }
      const user = await User.findOne({ where: { id: userId } });
      if (!user) {
        io.emit("room:error", { message: "usuario no encontrado" });
        return;
      }
      console.log(user);
      socket.join(code);
      io.to(code).emit("player:joined", {
        // avisa a otros jugadores que se unio
        user: { id: user.id, name: user.name },
        players: room.players,
        code,
      });
      // try {
      //   // 🔁 Limpiar salas previas antes de unir
      //   socket.rooms.forEach((room) => {
      //     if (room !== socket.id) {
      //       socket.leave(room);
      //       console.log(`🧹 Socket ${socket.id} removido de sala previa ${room}`);
      //     }
      //   });

      //   const isInRoom = io.sockets.adapter.rooms.get(code)?.has(socket.id);
      //   if (isInRoom) {
      //     socket.emit("room:error", { message: `You already are in room ${code}` });
      //     return;
      //   }

      //   const room = await roomManager.model.findOne({ where: { code, deletedAt: null } });
      //   if (!room) {
      //     socket.emit("room:error", { message: `Room ${code} not found` });
      //     return;
      //   }

      //   const isCreator = room.hostId === userId;

      //   await roomManager.joinRoom({
      //     roomId: room.id,
      //     userId,
      //     socketId: socket.id,
      //     isCreator,
      //   });
      // } catch (error) {
      //   console.error("X join-room error:", error.message);
      //   socket.emit("room:error", { message: error.message });
      // }
    });

    socket.on("leave-room", async ({ code, userId }) => {
      await roomManager.leaveRoom({ roomId: code, userId });
      socket.leave(code);
    });

    socket.on("chat:message", ({ code, user, text }) => {
      console.log("chat msg incoming", code, user, text);
      roomManager.sendMessage({ roomCode: code, user, text, socket });
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
          console.log(`🧹 Socket ${socket.id} removido de sala ${room}`);
        }
      });
    });
  });
}
