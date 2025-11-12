import User from "../models/sequelize/User.js";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger.js";

export default async function seedAdmin() {
  const adminExists = await User.findOne({ where: { name: "admin" } });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await User.create({
      name: "admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
    });
    logger.info("🧑‍💼 Admin user created.");
  }
}
