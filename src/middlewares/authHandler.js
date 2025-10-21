import { AuthError } from "../utils/errors.js";
import jwt from "../utils/jwt.js";

export async function getSession(req, res, next) {
  try {
    const token = req.accessToken;
    if (!token) {
      throw new AuthError("No access token provided");
    }

    const payload = jwt.verifyAccessToken({ token });
    if (!payload) throw new AuthError("Invalid or expired token");

    const { _exp, _iat, ...userData } = payload;
    req.user = userData;
    next();
  } catch (error) {
    next(error);
  }
}

export const extractTokens = async (req, res, next) => {
  let accessToken = null;
  let refreshToken = null;

  if (req.cookies?.refreshToken) {
    refreshToken = req.cookies.refreshToken;
  }

  if (req.headers.authorization?.startsWith("Bearer ")) {
    accessToken = req.headers.authorization.split(" ")[1];
  }

  req.accessToken = accessToken;
  req.refreshToken = refreshToken;

  next();
};
