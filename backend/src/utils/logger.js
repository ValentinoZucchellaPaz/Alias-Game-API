import dotenv from "dotenv";
dotenv.config({ quiet: true });

const isDev = process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "development";

export const logger = {
  log: (...args) => {
    if (isDev) console.log("[LOG]", ...args);
  },
  warn: (...args) => {
    if (isDev) console.warn("[WARN]", ...args);
  },
  error: (...args) => {
    // always show error logs, even in prod
    console.error("[ERROR]", ...args);
  },
  info: (...args) => {
    if (isDev) console.info("[INFO]", ...args);
  },
};
