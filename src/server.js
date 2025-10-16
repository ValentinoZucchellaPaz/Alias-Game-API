
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
import {Server} from "socket.io";

const SVPORT = process.env.SVPORT || 4000;

const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log(socket.id);
});

server.listen(SVPORT, () => {
  console.log("WebSocket server on http://localhost:"+SVPORT);
});


