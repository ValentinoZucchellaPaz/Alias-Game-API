//src/sockets/default.js

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
      socket.join(room);
      cb(`You've joined to room '${room}'`);
    });

    //join team event
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
