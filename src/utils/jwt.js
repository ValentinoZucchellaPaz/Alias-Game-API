import jwt from "jsonwebtoken";

const generateAccessToken = (id, name, role) => {
  return jwt.sign({ id: id, name: name, role: role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXP,
  });
};

const generateRefreshToken = (id, name, role) => {
  return jwt.sign({ id: id, name: name, role: role }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXP,
  });
};

const verifyAccessToken = ({ token }) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (_error) {
    return null;
  }
};

const verifyRefreshToken = ({ token }) => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (_error) {
    return null;
  }
};

export default { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
