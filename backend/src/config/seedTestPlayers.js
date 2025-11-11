import User from "../models/sequelize/User.js";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger.js";

export default async function seedTestPlayers() {
  if (!(process.env.NODE_ENV == "dev" || process.env.NODE_ENV == "development")) return;

  const userExist = await User.findOne({ where: { email: "user1@gmail.com" } });
  if (!userExist) {
    const hashedPassword = await bcrypt.hash("123456", 10);
    for (let i = 1; i < 5; i++) {
      await User.create({
        name: `user${i}`,
        email: `user${i}@gmail.com`,
        password: hashedPassword,
        role: "player",
      });
    }
    logger.info("✅ Test players added.");
  }
}
