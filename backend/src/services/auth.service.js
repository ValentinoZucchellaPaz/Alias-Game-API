import userRepository from "../repositories/user.repository.js";
import bcrypt from "bcrypt";
import { UserRegisterResponse } from "../schemas/user.schema.js";
import { ConflictError, AuthError } from "../utils/errors.js";
import jwt from "../utils/jwt.js";
import refreshRepository from "../repositories/refresh.repository.js";

async function register({ email, name, password }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) throw new ConflictError("Email already in use");

  const existingName = await userRepository.findByName(name);
  if (existingName) throw new ConflictError("Name already in use");

  const hash = await bcrypt.hash(password, 10);

  const newUser = await userRepository.create({ email, name, password: hash });

  const parsedUser = UserRegisterResponse.parse({
    id: newUser.id,
    name,
    email,
    role: newUser.role,
  });

  return parsedUser;
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new AuthError("Invalid credentials");

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new AuthError("Invalid credentials");

  const accessToken = jwt.generateAccessToken(user.id, user.name, user.role);
  const refreshToken = jwt.generateRefreshToken(user.id, user.name, user.role);

  await refreshRepository.save(user.id, refreshToken);

  return { accessToken, refreshToken };
}

async function getUserByEmail(email) {
  const user = await userRepository.findByEmail(email);
  return user ? user.email : null;
}

async function logout(userId) {
  await refreshRepository.revoke(userId);
}

async function validateAndRotateToken(token) {
  const payload = jwt.verifyRefreshToken({ token });
  if (!payload) throw new AuthError("Invalid or expired refresh token");

  const exists = await refreshRepository.exists(payload.id, token);
  if (!exists) throw new AuthError("Invalid refresh token");

  const accessToken = jwt.generateAccessToken(payload.id, payload.name, payload.role);
  const refreshToken = jwt.generateRefreshToken(payload.id, payload.name, payload.role);

  await refreshRepository.save(payload.id, refreshToken);

  return { accessToken, refreshToken };
}

export default { register, login, logout, validateAndRotateToken, getUserByEmail };
