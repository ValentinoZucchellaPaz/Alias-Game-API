//FOR API REST
import app from "./app.js";
import { syncDB } from "./models/sequelize/index.js";
import http from "http";
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { setupNamespaces } from "./sockets/index.js";

const PORT = process.env.PORT || 3000;
const SVPORT = process.env.SVPORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

//for REST API
(async () => {
  await syncDB();

  app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
})();

//FOR WEB SOCKETS
const socketApp = express();
socketApp.use(express.static(path.join(__dirname, "client"))); //Serve static files from /client

const server = http.createServer(socketApp);
server.listen(SVPORT, () => {
  console.log("WebSocket server on http://localhost:" + SVPORT);
});
const io = new Server(server);
setupNamespaces(io);
