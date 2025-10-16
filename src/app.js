import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";

import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";

// dotenv.config();
const app = express();

// middlewares
dotenv.config({ quiet: true });
app.use(express.json());
app.use(cookieParser());
// ...

// routes
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to the Alias Game API");
});

// error handler middleware
app.use(errorHandler);

export default app;
