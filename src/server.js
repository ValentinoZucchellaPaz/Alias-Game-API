
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
import {Server} from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const socketApp= express();
const SVPORT = process.env.SVPORT || 4000;

//Serve static files from /public
socketApp.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(socketApp);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log(socket.id);
});

server.listen(SVPORT, () => {
  console.log("WebSocket server on http://localhost:"+SVPORT);
});


