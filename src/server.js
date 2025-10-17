//FOR API REST
import app from "./app.js";
import { syncDB } from "./models/sequelize/index.js";
import http from "http";
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { setupNamespaces } from "./sockets/index.js";
import { redisClient } from "./config/redis.js";

const PORT = process.env.PORT || 3000;
const SVPORT = process.env.SVPORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

//for REST API
(async () => {
  await syncDB();
  await redisClient.connectRedis();

  app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
})();

//FOR WEB SOCKETS
const socketApp = express(); //serves frontend
socketApp.use(express.static(path.join(__dirname, "client"))); //Serve static files from /client

const server = http.createServer(socketApp); //creates http server from socketApp express app

(async () => {
  //Initializes websocket server on SVPORT
  server.listen(SVPORT, () => {
    console.log("WebSocket server on http://localhost:" + SVPORT);
  });
})();

//creates a socket.io server instance based on 'server' server reference.
const io = new Server(server);

//calls namespaces router
setupNamespaces(io);
