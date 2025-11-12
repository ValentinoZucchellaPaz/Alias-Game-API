import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";
dotenv.config({ quiet: true });

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: "postgres",
  port: process.env.DB_PORT,
  // logging: process.env.NODE_ENV == "production" ? false : logger.log,
  logging: false,
});

(async () => {
  try {
    await sequelize.authenticate();
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
  }
})();

export default sequelize;
