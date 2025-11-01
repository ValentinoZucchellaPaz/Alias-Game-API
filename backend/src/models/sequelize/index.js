import sequelize from "../../config/db.js";
import seedAdmin from "../../config/seedAdmin.js";
import User from "./User.js";
import Room from "./Room.js";
import seedWords from "../../config/seedWords.js";

export const syncDB = async () => {
  try {
    const config = process.env.NODE_ENV == "production" ? {} : { alter: true, force: true }; // borra todo cada vez que arranca el server
    await sequelize.sync(config);
    // console.log("All tables synced");

    await seedAdmin(); // Inserta usuario semilla si no existe
    await seedWords();

    console.log("✅ DB ready");
  } catch (err) {
    console.error("❌ Failed to sync DB:", err);
  }
};

export { User, Room };
