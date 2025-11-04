import roomService from "../services/room.service.js";

export const createRoom = async (req, res) => {
  const room = await roomService.createRoom({ hostId: req.user.id, hostName: req.user.name });
  res.status(201).json(room);
};

export const joinRoom = async (req, res) => {
  const { code } = req.params;
  const room = await roomService.joinRoom({
    roomCode: code,
    userId: req.user.id,
    userName: req.user.name,
  });
  res.json(room);
};

export const leaveRoom = async (req, res) => {
  const { code } = req.params;
  const room = await roomService.leaveRoom({
    roomCode: code,
    userId: req.user.id,
    userName: req.user.name,
  });
  res.json(room);
};

export const updateRoomStatus = async (req, res) => {
  const { code } = req.params;
  const { status } = req.body;
  const room = await roomService.updateRoomStatus({ roomCode: code, status });
  res.json(room);
};

export const getRoomByCode = async (req, res) => {
  const { code } = req.params;
  const room = await roomService.getRoom(code);
  res.json(room);
};
