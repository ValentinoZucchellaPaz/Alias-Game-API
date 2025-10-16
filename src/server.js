//FOR API REST
import app from "./app.js";
import { syncDB } from "./models/sequelize/index.js";
const PORT = process.env.PORT || 3000;

(async () => {
  await syncDB();

  app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
})();

//FOR WEB SOCKETS
import http from "http";
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const SVPORT = process.env.SVPORT || 4000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const socketApp = express();
//Serve static files from /client
socketApp.use(express.static(path.join(__dirname, "client")));

const server = http.createServer(socketApp);
server.listen(SVPORT, () => {
  console.log("WebSocket server on http://localhost:" + SVPORT);
});
const io = new Server(server);
const adminIo = io.of("/admin");

adminIo.on("connection", (socket) => {
  console.log(`socket ${socket} has conected to /admin namespace`);
});

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
