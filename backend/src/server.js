import app from "./app.js";
import { syncDB } from "./models/sequelize/index.js";
import { Server } from "socket.io";
import { RedisClientSingleton } from "./config/redis.js";
import { createServer } from "http";
import registerRoomSocket from "./sockets/registerRoomSocket.js";
import { SocketEventEmitter } from "./sockets/SocketEventEmmiter.js";

const PORT = 4000;

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

registerRoomSocket(io);
SocketEventEmitter.init(io);

server.listen(PORT, async () => {
  await syncDB();
  await RedisClientSingleton.getInstance(); // inicializa singleton
  console.log(`Server running on port http://localhost:${PORT}`);
});
