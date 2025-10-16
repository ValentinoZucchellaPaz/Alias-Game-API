import userRepository from "../repositories/user.repository.js";
import bcrypt from "bcrypt";
import { UserRegisterResponse } from "../schemas/user.schema.js";
import { ConflictError, AuthError } from "../utils/errors.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";

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

  console.error(user);
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new AuthError("Invalid credentials");

  const accessToken = generateAccessToken(user.id, user.name, user.role);
  const refreshToken = generateRefreshToken(user.id, user.name, user.role);

  return { accessToken, refreshToken };
}

async function getUserByEmail(email) {
  const user = await userRepository.findByEmail(email);
  return user ? user.email : null;
}

async function revokeRefreshToken() {}

async function validateAndRotateToken(token) {
  return { accessToken: generateAccessToken(), refreshToken: generateRefreshToken() };
}

export default { register, login, revokeRefreshToken, validateAndRotateToken, getUserByEmail };
