import { io } from "socket.io-client";

//src/sockets/default.js
const rooms = {};
const roomHosts = {};
const MAX_TEAM_SIZE = 5;
const MIN_TEAM_SIZE = 2;
const MAX_ROOM_SIZE = 10;

export default function setupDefaultNamespace(io) {
  io.on("connection", (socket) => {
    //message send event
    socket.on("send-message", (message, room) => {
      if (room === "") {
        //do nothing
        return;
      } else {
        socket.to(room).emit("receive-message", message); //message to users in the specified room
      }
    });

    //join room event
    socket.on("join-room", (room, cb) => {
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      if (roomSize >= MAX_ROOM_SIZE) return cb(`Room is full`);

      socket.join(room);

      if (!rooms[room]) {
        rooms[room] = { red: new Set(), blue: new Set() };
      }

      setTimeout(() => {
        emitTeamState(io, room);
      }, 50);

      //If there is no host, the socket becomes the host
      if (!roomHosts[room]) {
        roomHosts[room] = socket.id;
        socket.emit("host-assigned", { room });
      }

      cb(`You've joined to room '${room}'`);
    });

    //room leaving
    socket.on("leave-room", (room, cb) => {
      socket.leave(room);

      //Remove from team
      if (rooms[room]) {
        rooms[room].red.delete(socket.id);
        rooms[room].blue.delete(socket.id);

        const redSize = rooms[room].red.size;
        const blueSize = rooms[room].blue.size;

        if (redSize === 0 && blueSize == 0) {
          delete rooms[room];
          delete roomHosts[room];
          console.log(`Room '${room}' deleted (empty)`);
        }
      }
      emitTeamState(io, room);
      cb(`You've left room ${room}`);
    });

    //join team event
    socket.on("join-team", ({ room, team }, cb) => {
      if (!rooms[room]) {
        room[room] = { red: new Set(), blue: new Set() };
      }

      const teamSet = rooms[room][team];
      if (!teamSet) return cb("Invalid team");
      if (teamSet.size >= MAX_TEAM_SIZE) return cb("Team is full");

      //remove from opposite team
      const otherTeam = team === "red" ? "blue" : "red";
      rooms[room][otherTeam].delete(socket.id);

      //add to chosen team
      teamSet.add(socket.id);
      socket.join(room);

      cb(`You joined team ${team} in room ${room}`);
      emitTeamState(io, room);
    });

    socket.on("disconnect", () => {
      for (const room in rooms){
        rooms[room].red.delete(socket.id);
        rooms[room].blue.delete(socket.id);

        const redSize = rooms[room].red.size;
        const blueSize = rooms[room].blue.size;
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;

        //If there is no more people on the room, we delete it.
        if (redSize === 0 && blueSize === 0 && roomSize === 0) {
          delete rooms[room];
          delete roomHosts[room];
          console.log(`Room ${room} deleted (disconnected)`);
        }
        else {
          emitTeamState(io,room);
        }
      }
    })


  });
}

function emitTeamState(io, room) {
  const red = Array.from(rooms[room]?.red || []);
  const blue = Array.from(rooms[room]?.blue || []);
  const unassigned = getUnassignedPlayers(io, room) || [];

  io.to(room).emit("team-state", { red, blue, unassigned });
}

function getUnassignedPlayers(io, room) {
  const allSockets = Array.from(io.sockets.adapter.rooms.get(room) || []);
  const red = rooms[room]?.red || new Set();
  const blue = rooms[room]?.blue || new Set();
  return allSockets.filter((id) => !red.has(id) && !blue.has(id));
}
