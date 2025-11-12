import { z } from "zod";
import { Game } from "../models/Game.js";

export const MessageCheckResultSchema = z.object({
  type: z.enum(["answer", "taboo", "invalid", "similar"]),
  correct: z.boolean(),
  taboo: z.boolean(),
  word: z.string().optional(),
  game: z.instanceof(Game),
  similarWord: z
    .object({
      similarWord: z.string(),
      similarity: z.float32(),
      type: z.enum(["soundalike", "spelling", "associated", "adjective"]),
    })
    .optional(),
});
