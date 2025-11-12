import { Router } from "express";
import {
  createRoom,
  getRoomByCode,
  getRooms,
  joinRoom,
  leaveRoom,
  startGame,
  updateRoomStatus,
} from "../controllers/room.controller.js";
import { extractTokens, getSession } from "../middlewares/http/authHandler.js";
import { gameLimiterMiddleware } from "../middlewares/http/limiters/rateLimiters.js";

const router = Router();

router.use(gameLimiterMiddleware);

router.post("/", extractTokens, getSession, createRoom);
router.post("/:code/join", extractTokens, getSession, joinRoom);
router.post("/:code/start", extractTokens, getSession, startGame);
router.delete("/:code/leave", extractTokens, getSession, leaveRoom);
router.patch("/:code/status", extractTokens, getSession, updateRoomStatus);
router.get("/:code", getRoomByCode);
router.get("/", getRooms);

export default router;
