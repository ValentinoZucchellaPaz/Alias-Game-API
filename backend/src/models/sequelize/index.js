import sequelize from "../../config/db.js";
import seedAdmin from "../../config/seedAdmin.js";
import User from "./User.js";
import Room from "./Room.js";
import seedWords from "../../config/seedWords.js";
import { logger } from "../../utils/logger.js";
import seedTestPlayers from "../../config/seedTestPlayers.js";

export const syncDB = async () => {
  try {
    // const config = process.env.NODE_ENV == "production" ? {} : { alter: true, force: true }; // in dev clears dev on init
    // await sequelize.sync(config);
    await sequelize.sync({});

    // insert words and admin user if there's not any
    await seedAdmin();
    await seedWords();
    await seedTestPlayers();

    logger.info("✅ DB ready");
  } catch (err) {
    logger.error("❌ Failed to sync DB:", err);
  }
};

export { User, Room };
