import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config({ quiet: true });
console.log("DB_PASSWORD:", process.env.DB_PASSWORD, process.env.DB_USER);
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: "postgres",
  port: process.env.DB_PORT,
  logging: process.env.NODE_ENV == "production" ? false : console.log,
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

export default sequelize;
