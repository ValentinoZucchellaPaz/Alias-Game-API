import express from "express";
import app from "./app.js";
import { syncDB } from "./models/sequelize/index.js";
import { Server } from "socket.io";
import { setupNamespaces } from "./sockets/index.js";
import { redisClient } from "./config/redis.js";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import registerRoomSocket from "./sockets/default.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 4000;
// const PORT = process.env.PORT || 3000;

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// setupNamespaces(io); // todos los metodos del socket

(async () => {
  await syncDB();
  await redisClient.connectRedis();

  registerRoomSocket(io);
  app.set("io", io); // Para usar io en los controladores
  app.use(express.static(path.join(__dirname, "client"))); //Serve static files from /client

  server.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
})();

//FOR WEB SOCKETS
// const socketApp = express();

// (async () => {
//   //Initializes websocket server on SVPORT
//   server.listen(SVPORT, () => {
//     console.log("WebSocket server on http://localhost:" + SVPORT);
//   });
// })();

// //creates a socket.io server instance based on 'server' server reference.
// const io = new Server(server);

// //calls namespaces router
// setupNamespaces(io);
