import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";

// dotenv.config();
const app = express();

// middlewares
dotenv.config({ quiet: true });
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/api", (req, res) => {
  res.send("Welcome to the Alias Game API");
});

// error handler middleware
app.use(errorHandler);

export default app;
