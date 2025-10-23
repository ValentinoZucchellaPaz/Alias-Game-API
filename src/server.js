import express from "express";
import app from "./app.js";
import { syncDB } from "./models/sequelize/index.js";
import { Server } from "socket.io";
import { roomCache, tokenCache } from "./config/redis.js";
import { createServer } from "http";
import path from "path";
import { Room } from "./models/sequelize/index.js";
import { fileURLToPath } from "url";
// import registerRoomSocket from "./sockets/default.js";
import registerRoomSocket from "./sockets/registerRoomSocket.js";
import RoomManager from "./sockets/RoomManager.js";
import * as roomController from "./controllers/room.controller.js";

// servir client
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "client"))); //Serve static files from /client

const PORT = 4000; // problemas con docker en el mismo puerto

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Inicializar RoomManager, RoomController y sockets
const roomManager = new RoomManager({ redisClient: roomCache, model: Room, io });
registerRoomSocket(io, roomManager);
roomController.setRoomManager(roomManager);

server.listen(PORT, async () => {
  await syncDB();
  await tokenCache.connectRedis();
  await roomCache.connectRedis();
  console.log(`Server running on port http://localhost:${PORT}`);
});
