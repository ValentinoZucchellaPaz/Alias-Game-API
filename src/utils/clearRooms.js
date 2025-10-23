import { Room } from "../models/sequelize/index.js";

try {
  await Room.destroy({ where: {}, truncate: true });
  console.log("✅ Tabla Rooms vaciada.");
} catch (err) {
  console.error("❌ Error al vaciar Rooms:", err.message);
}