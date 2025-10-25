import { User } from "../models/sequelize/index.js";
import roomService from "../services/room.service.js";
import jwt from "../utils/jwt.js";

// src/sockets/registerRoomSocket.js
export default function registerRoomSocket(io) {
  //middleware de autenticacion de tokens;
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    // console.log("token recibido:", token);
    const payload = jwt.verifyAccessToken({ token });
    // console.log("Payload decodificado:", payload);

    if (!payload) return next(new Error("Invalid token"));

    socket.userId = payload.id;
    socket.userName = payload.name;
    socket.userRole = payload.role;

    next();
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", async ({ code }) => {
      console.log(`📥 Evento join-room recibido: usuario=${socket.userName},Room Code=${code}`);
      try {
        // si socket ya esta unido a room no hago nada, evito ver db
        for (const r of socket.rooms) {
          if (r == code) throw new Error("You're already in this room");
        }

        // traer info de room, validar que usuario está (se hizo http antes)
        // hacer funcion que devuelva info de room parceada
        const room = await roomService.getRoom(code);
        if (!room) {
          throw new Error(`There's no room with code ${code}`);
        }
        const playerInRoom = room?.players.find((p) => p.id == socket.userId);
        if (!playerInRoom || !playerInRoom.active) {
          throw new Error(`Please send a http request before joining room ${code}`);
        }

        // salir de todas las rooms excepto la propia del socket y la room objetivo
        for (const r of socket.rooms) {
          if (r === socket.id || r === code) continue;
          try {
            await roomService.leaveRoom({ roomCode: r, userId: socket.userId });
            socket.leave(r);
          } catch (err) {
            console.error(`Error leaving room ${r}:`, err);
          }
        }
        socket.join(code);
        console.log(socket.rooms);
        io.to(code).emit("player:joined", {
          user: { id: socket.userId, name: socket.userName },
          players: room.players,
          code,
        });
      } catch (error) {
        console.error(error);
        io.emit("room:error", { message: error });
        return;
      }
    });

    socket.on("leave-room", async ({ code }) => {
      console.log("haciendo leave room");
      try {
        io.to(code).emit("player:left", { user: { id: socket.userId, name: socket.userName } });
        socket.leave(code);
      } catch (err) {
        io.to(socket.id).emit("room:error", { message: err });
      }
    });

    socket.on("room:terminated", ({ code }) => {
      socket.broadcast.to(code).emit("leave-room-order", { code });
    });

    socket.on("chat:message", ({ code, user, text }) => {
      socket.broadcast
        .to(code)
        .emit("chat:message", { user, text, timestamp: new Date().toISOString() });
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.emit("leave-room", { code: room, userId: socket.userId });
          // socket.leave(room);
          // console.log(`🧹 Socket ${socket.id} removido de sala ${room}`);
        }
      });
    });
  });
}
