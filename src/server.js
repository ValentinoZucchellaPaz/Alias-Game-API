import express from "express";
import app from "./app.js";
import { syncDB } from "./models/sequelize/index.js";
import { Server } from "socket.io";
import { RedisClientSingleton } from "./config/redis.js";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import registerRoomSocket from "./sockets/registerRoomSocket.js";

// servir client
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "client"))); //Serve static files from /client

const PORT = 4000; // problemas con docker en el mismo puerto

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

registerRoomSocket(io);

server.listen(PORT, async () => {
  await syncDB();
  await RedisClientSingleton.getInstance(); // inicializa singleton
  console.log(`Server running on port http://localhost:${PORT}`);
});
