import { UserLoginRequest, UserRegisterRequest } from "../schemas/user.schema.js";
import authService from "../services/auth.service.js";
import { AuthError } from "../utils/errors.js";

export async function registerUser(req, res, next) {
  const { name, email, password, role } = UserRegisterRequest.parse(req.body);

  // Create user in DB
  const newUser = await authService.register({ name, email, password, role });
  res.status(201).json({ status: "success", user: newUser });
}

export const login = async (req, res) => {
  const { email, password } = UserLoginRequest.parse(req.body);

  const { accessToken, refreshToken } = await authService.login({ email, password });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({ status: "success", accessToken });
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new AuthError("No refresh token provided");

  // validate refresh and get new tokens
  // TODO: ¿dónde se guarda el refresh?
  const tokens = await authService.validateAndRotateToken(token);
  if (!tokens) throw new AuthError("Invalid or expired refresh token");

  // return access token (body) & cookie w refresh
  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.json(tokens.accessToken);
};

export const logout = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    // delete from DB
    await authService.revokeRefreshToken(token);
  }

  // clear cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  res.json({ message: "Logged out successfully" });
};
