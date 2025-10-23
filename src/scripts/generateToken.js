//ARCHIVO UTILITARIO PARA GENERAR UN TOKEN VALIDO

import jwt from "../utils/jwt.js"; // ajustá el path si tu módulo está en otro lado
import dotenv from "dotenv";
dotenv.config();

const token = jwt.generateAccessToken(
  "4fbb734f-1c24-443b-9998-1509eded7321", // userId
  "mondongo00",                          // name
  "player"                               // role
);

console.log("✅ Token generado:\n", token);