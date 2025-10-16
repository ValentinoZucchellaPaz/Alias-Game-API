// src/sockets/user.js

const rooms = {};
const MAX_TEAM_SIZE = 5;
const MIN_TEAM_SIZE = 2;

export default function setupUserNamespace(io) {
  const userIo = io.of("/user");

  userIo.on("connection", (socket) => {
    socket.on("join-team", ({ room, team }, cb) => {
      if (!rooms[room]) {
        rooms[room] = { red: new Set(), blue: new Set() };
      }

      const teamSet = rooms[room][team];
      if (!teamSet) return cb("Invalid team");
      if (teamSet.size >= MAX_TEAM_SIZE) return cb("Team is full");

      teamSet.add(socket.id);
      socket.join(room);
      cb(`You joined the ${team} team in room '${room}'`);
    });
  });
}
