import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { globalLimiterMiddleware } from "./middlewares/http/limiters/rateLimiters.js";

import { errorHandler } from "./middlewares/http/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";

// dotenv.config();
const app = express();

// docs (swagger)
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../../docs-site/swagger.json" with { type: "json" };
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
app.use(globalLimiterMiddleware);

// routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/api", (req, res) => {
  res.send("Welcome to the Alias Game API");
});

// error handler middleware
app.use(errorHandler);

export default app;
