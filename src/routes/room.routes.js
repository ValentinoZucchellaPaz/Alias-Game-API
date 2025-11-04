import { Router } from "express";
import {
  createRoom,
  getRoomByCode,
  joinRoom,
  leaveRoom,
  updateRoomStatus,
} from "../controllers/room.controller.js";
import { extractTokens, getSession } from "../middlewares/authHandler.js";

const router = Router();

// Middlewares de auth ya están hechos
router.post("/", extractTokens, getSession, createRoom);
router.post("/:code/join", extractTokens, getSession, joinRoom);
router.delete("/:code/leave", extractTokens, getSession, leaveRoom);
router.patch("/:code/status", extractTokens, getSession, updateRoomStatus);
router.get("/:code", getRoomByCode);

export default router;
