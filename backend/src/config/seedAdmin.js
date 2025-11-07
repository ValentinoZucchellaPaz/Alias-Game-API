import User from "../models/sequelize/User.js";
import bcrypt from "bcrypt";

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
    console.log("🧑‍💼 Admin user created.");
  }
}
