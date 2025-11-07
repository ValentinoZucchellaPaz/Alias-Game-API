import { z } from "zod";
import { Game } from "../models/Game.js";

export const MessageCheckResultSchema = z.object({
  type: z.enum(["answer", "taboo", "invalid"]),
  correct: z.boolean(),
  taboo: z.boolean(),
  word: z.string().optional(),
  game: z.instanceof(Game),
});
