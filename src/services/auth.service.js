import userRepository from "../repositories/user.repository.js";
import bcrypt from "bcrypt";
import { UserRegisterResponse } from "../schemas/user.schema.js";
import { AuthError, ConflictError } from "../utils/errors.js";

async function register({ email, name, password }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) throw new ConflictError("Email already in use");

  // if (existingUser) return res.status(400).json({ status: "error", message: "Email already in use" });
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
  // if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) throw new AuthError("Invalid credentials");

  // TODO: Manage JWT tokens.
  const { accessToken, refreshToken } = await createNewTokens(user.id, user.role);

  return { accessToken, refreshToken };
}

async function getUserByEmail(email) {
  const user = await userRepository.findByEmail(email);
  return user ? user.email : null;
}

async function createNewTokens(id, role) {
  return { accessToken: role, refreshToken: role };
}

async function revokeRefreshToken() {}

async function validateAndRotateToken(token) {
  return { accessToken: token, refreshToken: token };
}

export default { register, login, revokeRefreshToken, validateAndRotateToken, getUserByEmail };
