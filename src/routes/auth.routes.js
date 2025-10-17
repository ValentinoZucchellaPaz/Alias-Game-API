import { Router } from "express";
import { login, logout, refreshToken, registerUser } from "../controllers/auth.controller.js";
import { extractTokens, getSession } from "../middlewares/authHandler.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", login);
router.post("/refresh-token", extractTokens, refreshToken);
router.post("/logout", extractTokens, getSession, logout);

export default router;
