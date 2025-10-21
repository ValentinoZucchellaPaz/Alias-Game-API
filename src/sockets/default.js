// import { io } from "socket.io-client";

// //src/sockets/default.js
// const rooms = {};
// const roomHosts = {};
// const MAX_TEAM_SIZE = 5;
// const MIN_TEAM_SIZE = 2;
// const MAX_ROOM_SIZE = 10;

// export default function setupDefaultNamespace(io) {
//   io.on("connection", (socket) => {
//     console.log(`Socket connected: ${socket.id}`);
//     //message send event
//     socket.on("send-message", ({ message, room }, cb) => {
//       if (!room || room === "") return;

//       const isInRoom = io.sockets.adapter.rooms.get(room)?.has(socket.id);
//       if (!isInRoom) return; //no emission out of rooms

//       const payload = { message, sender: socket.id };
//       socket.to(room).emit("receive-message", payload); //message to users in the specified room
//     });

//     //join room event
//     socket.on("join-room", (room, user) => {
//       console.log("logeando a room", room, " a ", user);
//       const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
//       if (roomSize >= MAX_ROOM_SIZE) return cb(`Room is full`);

//       socket.join(room);

//       //joinging empty room
//       if (!rooms[room]) {
//         rooms[room] = { red: new Set(), blue: new Set() };
//       }

//       setTimeout(() => {
//         emitTeamState(io, room);
//       }, 50);

//       //If there is no host, the socket becomes the host
//       if (!roomHosts[room]) {
//         roomHosts[room] = socket.id;
//         socket.emit("host-assigned", { room });
//       }

//       // cb(`You've joined to room '${room}'`);
//     });

//     //room leaving
//     socket.on("leave-room", (room, cb) => {
//       if (!room) return cb(`Invalid room`);
//       const isHost = roomHosts[room] === socket.id;

//       if (isHost) {
//         io.to(room).emit("room-closed");

//         const socketsInRoom = Array.from(io.sockets.adapter.rooms.get(room) || []);
//         socketsInRoom.forEach((id) => {
//           const s = io.sockets.sockets.get(id);
//           if (s) {
//             s.leave(room);
//             rooms[room]?.red.delete(id);
//             rooms[room]?.blue.delete(id);
//           }
//         });
//         delete rooms[room];
//         delete roomHosts[room];
//         return cb(`Room ${room} closed (host left)`);
//       }

//       socket.leave(room);
//       //Remove from team
//       if (rooms[room]) {
//         rooms[room].red.delete(socket.id);
//         rooms[room].blue.delete(socket.id);

//         if (!cleanRoomIfEmpty(io, room)) {
//           emitTeamState(io, room);
//         }
//       }
//       cb(`You've left room ${room}`);
//     });

//     //join team event
//     socket.on("join-team", ({ room, team }, cb) => {
//       if (!rooms[room]) {
//         room[room] = { red: new Set(), blue: new Set() };
//       }

//       const teamSet = rooms[room][team];
//       if (!teamSet) return cb("Invalid team");
//       if (teamSet.size >= MAX_TEAM_SIZE) return cb("Team is full");

//       //remove from opposite team
//       const otherTeam = team === "red" ? "blue" : "red";
//       rooms[room][otherTeam].delete(socket.id);

//       if (teamSet.has(socket.id)) return cb(`You already are in team ${team}`);

//       //add to chosen team
//       teamSet.add(socket.id);
//       socket.join(room);

//       cb(`You joined team ${team} in room ${room}`);
//       emitTeamState(io, room);
//     });

//     socket.on("disconnect", () => {
//       for (const room in rooms) {
//         rooms[room].red.delete(socket.id);
//         rooms[room].blue.delete(socket.id);
//         if (!cleanRoomIfEmpty(io, room)) {
//           emitTeamState(io, room);
//         }
//       }
//     });

//     socket.on("start-game", ({ room }) => {
//       if (roomHosts[room] !== socket.id) return;

//       io.to(room).emit("game-started");
//     });
//   });
// }

// function emitTeamState(io, room) {
//   const red = Array.from(rooms[room]?.red || []);
//   const blue = Array.from(rooms[room]?.blue || []);
//   const unassigned = getUnassignedPlayers(io, room) || [];

//   io.to(room).emit("team-state", { red, blue, unassigned });
// }

// function getUnassignedPlayers(io, room) {
//   const allSockets = Array.from(io.sockets.adapter.rooms.get(room) || []);
//   const red = rooms[room]?.red || new Set();
//   const blue = rooms[room]?.blue || new Set();

//   return allSockets.filter((id) => {
//     const socketExists = io.sockets.sockets.has(id); // ← verifica que el socket siga conectado
//     return socketExists && !red.has(id) && !blue.has(id);
//   });
// }

// function cleanRoomIfEmpty(io, room) {
//   const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
//   if (roomSize === 0) {
//     delete rooms[room];
//     delete roomHosts[room];
//     console.log(`Room ${room} deleted (empty room)`);
//     return true;
//   }
//   return false;
// }
export default function registerRoomSocket(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", ({ code, userId }) => {
      socket.join(code);
      console.log(`User ${userId} joined room ${code}`);
    });

    socket.on("chat:message", ({ code, user, text }) => {
      console.log({ code, user, text });
      const message = {
        user,
        text,
        timestamp: new Date().toISOString(),
      };

      // Enviar a todos los usuarios en esa room (menos al que lo mando)
      // io.to(code).emit("chat:message", message);
      socket.broadcast.emit("chat:message", message);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
