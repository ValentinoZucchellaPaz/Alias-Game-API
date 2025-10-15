import { UserLoginRequest, UserRegisterRequest } from "../schemas/user.schema.js";
import authService from "../services/auth.service.js";
import { AuthError, ConflictError } from "../utils/errors.js";

// =================================================================================================
// ====================================    METHODS    ==============================================
// =================================================================================================

export async function registerUser(req, res, next) {
  const { name, email, password, role } = UserRegisterRequest.parse(req.body);

  try {
    // Create user in DB
    const newUser = await authService.register({ name, email, password, role });
    res.status(201).json({ status: "success", user: newUser });
  } catch (error) {
    if (error instanceof ConflictError) {
      return res.status(409).json({ status: "error", message: error.message });
    }
    console.log("Error in registerUser:", error);
  }
  next();
}

export const login = async (req, res) => {
  const { email, password } = UserLoginRequest.parse(req.body);

  try {
    const { accessToken, refreshToken } = await authService.login({ email, password });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ status: "success", accessToken });
  } catch (error) {
    res.status(401).json({ status: "error", message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new AuthError("No refresh token provided");
  // if (!token) return res.status(401).json({ message: "No refresh token provided" });

  // validate refresh and get new tokens
  const tokens = await authService.validateAndRotateToken(token);
  if (!tokens) throw new AuthError("Invalid or expired refresh token");
  // if (!tokens) return res.status(401).json({ message: "Invalid or expired refresh token" });

  // return access token (body) y cookie w refresh
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
