// src/controllers/roomController.js
let roomManager;

export const setRoomManager = (manager) => {
  roomManager = manager;
};

export const createRoom = async (req, res) => {
  const room = await roomManager.createRoom({ hostId: req.user.id });
  res.status(201).json(room);
};

export const joinRoom = async (req, res) => {
  const { code } = req.params;
  const room = await roomManager.joinRoom({
    roomId: code,
    userId: req.user.id,
    socketId: req.socketId,
  });
  res.json(room);
};

export const leaveRoom = async (req, res) => {
  const { code } = req.params;
  const room = await roomManager.leaveRoom({ roomId: code, userId: req.user.id });
  res.sendStatus(204);
};

export const updateRoomStatus = async (req, res) => {
  const { code } = req.params;
  const { status } = req.body;
  const room = await roomManager.updateRoomStatus({ roomId: code, status });
  res.json(room);
};

// import Room from "../models/Room.js";

// const rooms = new Map(); // 🔧 en el futuro se reemplaza por Redis

// export const createRoom = (req, res) => {
//   const { id: hostId } = req.user.id; // middleware de auth
//   const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // cambiar por random uuid

//   const newRoom = new Room({ code, hostId });
//   rooms.set(code, newRoom);

//   // falta unir a usuario cuando se crea room

//   res.status(201).json({ code, hostId });
// };

// export const joinRoom = (req, res) => {
//   const { code } = req.params;
//   const { id, name } = req.user;

//   const room = rooms.get(code);
//   if (!room) return res.status(404).json({ error: "Room not found" });

//   room.addUser({ id, name });
//   const io = req.app.get("io");
//   io.to(code).emit("join-room", room, name);

//   res.json(room);
// };

// export const updateRoomStatus = (req, res) => {
//   const { code } = req.params;
//   const { status } = req.body;

//   const room = rooms.get(code);
//   if (!room) return res.status(404).json({ error: "Room not found" });

//   room.status = status;
//   const io = req.app.get("io");
//   io.to(code).emit("room:update", room);

//   res.json(room);
// };
