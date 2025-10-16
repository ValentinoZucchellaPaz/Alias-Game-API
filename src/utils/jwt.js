import jwt from "jsonwebtoken";

export const generateAccessToken = (id, name, role) => {
  return jwt.sign({ id: id, name: name, role: role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXP,
  });
};

export const generateRefreshToken = (id, name, role) => {
  return jwt.sign({ id: id, name: name, role: role }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXP,
  });
};
