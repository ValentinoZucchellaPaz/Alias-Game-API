import { Router } from "express";
import { createRoom, joinRoom, updateRoomStatus } from "../controllers/room.controller.js";
import { extractTokens, getSession } from "../middlewares/authHandler.js";

const router = Router();

// Middlewares de auth ya están hechos
router.post("/", extractTokens, getSession, createRoom);
router.post("/:code/join", extractTokens, getSession, joinRoom);
router.patch("/:code/status", updateRoomStatus);

export default router;
