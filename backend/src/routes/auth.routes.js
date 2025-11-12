import { Router } from "express";
import { login, logout, refreshToken, registerUser } from "../controllers/auth.controller.js";
import { extractTokens, getSession } from "../middlewares/http/authHandler.js";
import {
  registerLimiterMiddleware,
  loginLimiterMiddleware,
} from "../middlewares/http/limiters/rateLimiters.js";

const router = Router();

router.post("/register", registerLimiterMiddleware, registerUser);
router.post("/login", loginLimiterMiddleware, login);
router.post("/refresh-token", extractTokens, refreshToken);
router.post("/logout", extractTokens, getSession, logout);

export default router;
