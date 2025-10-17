import { UserLoginRequest, UserRegisterRequest } from "../schemas/user.schema.js";
import authService from "../services/auth.service.js";

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
  const refreshToken = req.refreshToken;

  // validate refresh and get new tokens
  const tokens = await authService.validateAndRotateToken(refreshToken);

  // return access token (body) & cookie w refresh
  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.status(200).json({ status: "success", accessToken: tokens.accessToken });
};

export const logout = async (req, res) => {
  const user = req.user;

  await authService.logout(user.id);

  // clear cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  res.json({ message: "Logged out successfully" });
};
