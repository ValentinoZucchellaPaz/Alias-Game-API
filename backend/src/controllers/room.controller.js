import gameService from "../services/game.service.js";
import roomService from "../services/room.service.js";
import { SocketEventEmitter } from "../sockets/SocketEventEmmiter.js";

export const createRoom = async (req, res) => {
  const room = await roomService.createRoom({
    hostId: req.user.id,
    hostName: req.user.name,
  });
  res.status(201).json(room);
};

export const joinRoom = async (req, res) => {
  const { code } = req.params;
  const room = await roomService.joinRoom({
    roomCode: code,
    userId: req.user.id,
    userName: req.user.name,
  });
  res.status(200).json(room);
};

export const leaveRoom = async (req, res) => {
  const { code } = req.params;
  const room = await roomService.leaveRoom({
    roomCode: code,
    userId: req.user.id,
    userName: req.user.name,
  });
  res.status(200).json(room);
};

// es realmente necesario?
export const updateRoomStatus = async (req, res) => {
  const { code } = req.params;
  const { status } = req.body;
  const room = await roomService.updateRoomStatus({ roomCode: code, status });
  res.status(200).json(room);
};

export const getRoomByCode = async (req, res) => {
  const { code } = req.params;
  const room = await roomService.getRoom(code);
  res.status(200).json(room);
};

export const getRooms = async (req, res) => {
  const rooms = await roomService.getRooms();
  res.status(200).json(rooms);
};

export const startGame = async (req, res) => {
  const { code } = req.params;
  // const { words } = req.body;
  // antes fijarme que no haya games pendientes de esta sala, cerrarlos si es asi?
  // fijarme que usuario que manda req pertenezca a room y este activo

  const { roomCode, game } = await gameService.createGame(code);
  SocketEventEmitter.gameStarted(code, game);
  res.status(201).json(game);
};
