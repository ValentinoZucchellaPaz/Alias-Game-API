//src/sockets/default.js
const rooms = {};
const roomHosts = {};
const MAX_TEAM_SIZE = 5;
const MIN_TEAM_SIZE = 2;

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
      //If there is no host, the socket becomes the host
      if (!roomHosts[room]){
        roomHosts[room] = socket.id;
        socket.emit('host-assigned', {room});
      };
      cb(`You've joined to room '${room}'`);
    });

    socket.on('leave-room', (room,cb) => {
      socket.leave(room);

      //Delete team if required
      if (rooms[room] ){
        rooms[room].red.delete(socket.id);
        rooms[room].blue.delete(socket.id);
      }
      emitTeamState(io, room);
      cb(`You've left room ${room}`);
    })



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
      emitTeamState(io,room);
    });
  });
}





function emitTeamState(io, room) {
  const red = Array.from(rooms[room]?.red || []);
  const blue = Array.from(rooms[room]?.blue || []);
  io.to(room).emit("team-state", { red, blue });
}